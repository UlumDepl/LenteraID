/**
 * Mesin Komunikasi Peladen Lentera ID (Mode Cepat + Streaming + Deteksi Model Otomatis)
 * - Produksi: seluruh permintaan diteruskan lewat Cloudflare Worker (ENGINE_PROXY_URL).
 * - Lokal: memakai LOCAL_GEMINI_API_KEY dari js/env.js dengan prioritas model tercepat
 *   (gemini-2.5-flash-lite / gemini-2.5-flash tanpa delay thinking) dan SSE streaming.
 */
window.LenteraEngine = (function () {
  var CFG = window.LENTERA_CONFIG;
  var STR = window.LENTERA_STRINGS;

  var responseCache = {};
  var cacheOrder = [];
  var MAX_CACHE_ITEMS = 40;

  var consecutiveFailures = 0;
  var circuitOpenUntil = 0;

  var activeRequests = 0;
  var MAX_CONCURRENT = 2;
  var queue = [];
  var lastQuota = null;

  var TARGET_CACHE_KEY = "lenteraid_fast_target_v5";
  var preferredLocalTarget = loadPreferredTarget();
  var discoveredModels = null;

  var DEFAULT_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3.0-flash",
    "gemini-3-flash-preview",
    "gemini-flash-latest"
  ];

  function loadPreferredTarget() {
    try {
      var raw = sessionStorage.getItem(TARGET_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.kind && parsed.model) return parsed;
    } catch (e) {}
    return null;
  }

  function savePreferredTarget(target) {
    preferredLocalTarget = target;
    try {
      if (target) sessionStorage.setItem(TARGET_CACHE_KEY, JSON.stringify(target));
      else sessionStorage.removeItem(TARGET_CACHE_KEY);
    } catch (e) {}
  }

  function isLocalDevHost() {
    var h = String(window.location.hostname || "").toLowerCase();
    if (!h) return true;
    if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "0.0.0.0") return true;
    if (/\.local$/i.test(h)) return true;
    if (/^192\.168\.\d+\.\d+$/.test(h)) return true;
    if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(h)) return true;
    return false;
  }

  function getLocalGeminiKey() {
    var env = window.LENTERA_ENV || {};
    return String(env.LOCAL_GEMINI_API_KEY || env.GEMINI_API_KEY || (CFG && CFG.LOCAL_GEMINI_API_KEY) || "").trim();
  }

  function getProxyUrl() {
    var env = window.LENTERA_ENV || {};
    return String(env.ENGINE_PROXY_URL || (CFG && CFG.ENGINE_PROXY_URL) || "").trim();
  }

  function enqueue(taskFn) {
    return new Promise(function (resolve, reject) {
      queue.push({ fn: taskFn, resolve: resolve, reject: reject });
      drainQueue();
    });
  }

  function drainQueue() {
    if (activeRequests >= MAX_CONCURRENT || queue.length === 0) return;
    var item = queue.shift();
    activeRequests += 1;
    Promise.resolve()
      .then(item.fn)
      .then(item.resolve, item.reject)
      .finally(function () {
        activeRequests -= 1;
        drainQueue();
      });
  }

  function getCached(key) {
    var entry = responseCache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > (CFG.CACHE_TTL_MS || 300000)) {
      delete responseCache[key];
      return null;
    }
    return entry.value;
  }

  function setCached(key, value) {
    if (responseCache[key]) {
      responseCache[key] = { value: value, ts: Date.now() };
      return;
    }
    responseCache[key] = { value: value, ts: Date.now() };
    cacheOrder.push(key);
    if (cacheOrder.length > MAX_CACHE_ITEMS) {
      var oldest = cacheOrder.shift();
      delete responseCache[oldest];
    }
  }

  function normalizeContents(rawContents) {
    var merged = [];
    (rawContents || []).forEach(function (item) {
      var role = item.role === "model" ? "model" : "user";
      var text = (item.parts || []).map(function (p) { return String(p.text || ""); }).join("\n").trim();
      if (!text) return;
      if (merged.length === 0 && role === "model") return;
      if (merged.length > 0 && merged[merged.length - 1].role === role) {
        merged[merged.length - 1].parts[0].text += "\n\n" + text;
      } else {
        merged.push({ role: role, parts: [{ text: text }] });
      }
    });
    return merged;
  }

  function buildFastPayload(payload, kind, model) {
    var genCfg = Object.assign({}, (payload && payload.generationConfig) || {});
    // Matikan delay thinking pada keluarga gemini-2.5 agar balasan obrolan super cepat (< 1.5 detik)
    if (/gemini-2\.5/i.test(model) && !genCfg.thinkingConfig) {
      genCfg.thinkingConfig = { thinkingBudget: 0 };
    }
    var out = {
      contents: normalizeContents(payload && payload.contents),
      generationConfig: genCfg
    };
    if (payload && payload.systemInstruction) {
      out.systemInstruction = kind === "studio"
        ? payload.systemInstruction
        : Object.assign({ role: "system" }, payload.systemInstruction);
    }
    return out;
  }

  function buildPlainPayload(payload) {
    var sysText = (payload && payload.systemInstruction && payload.systemInstruction.parts)
      ? payload.systemInstruction.parts.map(function (p) { return p.text || ""; }).join("\n")
      : "";
    var contents = normalizeContents(payload && payload.contents).map(function (c, idx) {
      var text = c.parts[0].text;
      if (idx === 0 && sysText) {
        text = "[Panduan]\n" + sysText + "\n\n[Pesan]\n" + text;
      }
      return { role: c.role, parts: [{ text: text }] };
    });
    var genCfg = Object.assign({}, (payload && payload.generationConfig) || {});
    delete genCfg.responseMimeType;
    delete genCfg.thinkingConfig;
    return { contents: contents, generationConfig: genCfg };
  }

  function buildEndpointUrl(kind, model, apiKey, streamMode) {
    var encModel = encodeURIComponent(model);
    var encKey = encodeURIComponent(apiKey);
    var action = streamMode ? ":streamGenerateContent?alt=sse&key=" : ":generateContent?key=";
    if (kind === "vertex_v1") {
      return "https://aiplatform.googleapis.com/v1/publishers/google/models/" + encModel + action + encKey;
    }
    if (kind === "vertex_v1beta1") {
      return "https://aiplatform.googleapis.com/v1beta1/publishers/google/models/" + encModel + action + encKey;
    }
    return "https://generativelanguage.googleapis.com/v1beta/models/" + encModel + action + encKey;
  }

  function getEndpointKindsForKey(apiKey) {
    if (apiKey.indexOf("AQ.") === 0) {
      return ["vertex_v1", "studio", "vertex_v1beta1"];
    }
    return ["studio", "vertex_v1"];
  }

  function extractTextFromResponse(data) {
    var cands = data && data.candidates;
    if (!Array.isArray(cands) || !cands.length) return "";
    var parts = cands[0] && cands[0].content && cands[0].content.parts;
    if (!Array.isArray(parts) || !parts.length) return "";
    var texts = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] && typeof parts[i].text === "string" && !parts[i].thought) {
        texts.push(parts[i].text);
      }
    }
    return texts.join("").trim() || String((parts[0] && parts[0].text) || "").trim();
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    if (typeof AbortController === "undefined") return fetch(url, options);
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 12000);
    try {
      return await fetch(url, Object.assign({}, options, { signal: ctrl.signal }));
    } finally {
      clearTimeout(timer);
    }
  }

  async function tryStreamTarget(kind, model, requestBody, apiKey, onChunk) {
    var url = buildEndpointUrl(kind, model, apiKey, true);
    var bodyObj = buildFastPayload(requestBody, kind, model);
    var res;
    try {
      res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj)
      }, 15000);
    } catch (netErr) {
      return { ok: false, status: 0, error: netErr.name === "AbortError" ? "Waktu tunggu habis" : (netErr.message || "Koneksi gagal") };
    }

    if (!res.ok || !res.body || typeof res.body.getReader !== "function") {
      var errData = await res.json().catch(function () { return {}; });
      return {
        ok: false,
        status: res.status || 500,
        error: (errData && errData.error && errData.error.message) || ("HTTP " + res.status)
      };
    }

    var reader = res.body.getReader();
    var decoder = new TextDecoder("utf-8");
    var buf = "";
    var fullText = "";

    try {
      while (true) {
        var step = await reader.read();
        if (step.done) break;
        buf += decoder.decode(step.value, { stream: true });
        var lines = buf.split(/\r?\n/);
        buf = lines.pop() || "";
        for (var i = 0; i < lines.length; i++) {
          var ln = lines[i].trim();
          if (!ln.startsWith("data:")) continue;
          var jsonStr = ln.slice(5).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;
          try {
            var parsed = JSON.parse(jsonStr);
            var piece = extractTextFromResponse(parsed);
            if (piece) {
              fullText += piece;
              if (typeof onChunk === "function") onChunk(cleanOutputText(fullText));
            }
          } catch (parseErr) {}
        }
      }
    } catch (readErr) {
      if (!fullText) return { ok: false, status: 502, error: readErr.message || "Stream terputus" };
    }

    if (fullText.trim()) {
      return { ok: true, text: fullText, model: model, kind: kind };
    }
    return { ok: false, status: 502, error: "Respons stream kosong" };
  }

  async function trySingleTarget(kind, model, requestBody, apiKey) {
    var url = buildEndpointUrl(kind, model, apiKey, false);
    var bodyToSend = buildFastPayload(requestBody, kind, model);

    var res;
    try {
      res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyToSend)
      }, 14000);
    } catch (netErr) {
      return { ok: false, status: 0, error: netErr.name === "AbortError" ? "Waktu tunggu habis" : (netErr.message || "Koneksi atau CORS ditolak") };
    }

    if (res.status === 400) {
      try {
        res = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPlainPayload(requestBody))
        }, 14000);
      } catch (netErr2) {
        return { ok: false, status: 0, error: netErr2.message || "Koneksi gagal" };
      }
    }

    var data = await res.json().catch(function () { return {}; });
    if (res.ok) {
      var text = extractTextFromResponse(data);
      if (text) return { ok: true, text: text, model: model, kind: kind };
      return { ok: false, status: 502, error: "Respons model kosong" };
    }

    var msg = (data && data.error && data.error.message) || ("HTTP " + res.status);
    return { ok: false, status: res.status, error: msg };
  }

  async function discoverAvailableStudioModels(apiKey) {
    if (Array.isArray(discoveredModels)) return discoveredModels;
    discoveredModels = [];
    try {
      var url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(apiKey);
      var res = await fetchWithTimeout(url, {}, 7000);
      if (!res.ok) return discoveredModels;
      var data = await res.json().catch(function () { return {}; });
      var list = Array.isArray(data.models) ? data.models : [];
      var scored = [];
      list.forEach(function (m) {
        var name = String(m.name || "").replace(/^models\//, "");
        var methods = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
        if (methods.indexOf("generateContent") === -1) return;
        if (!/^gemini-/i.test(name)) return;
        if (/embedding|imagen|veo|tts|audio|live|aqa|robotics|computer-use|2\.0/i.test(name)) return;
        var priority = 10;
        if (/flash-lite/i.test(name)) priority -= 6;
        else if (/flash/i.test(name)) priority -= 5;
        if (/2\.5/i.test(name)) priority -= 3;
        else if (/3\./i.test(name) || /3-/i.test(name)) priority -= 2;
        scored.push({ name: name, priority: priority });
      });
      scored.sort(function (a, b) { return a.priority - b.priority; });
      discoveredModels = scored.slice(0, 5).map(function (s) { return s.name; });
    } catch (e) {
      discoveredModels = [];
    }
    return discoveredModels;
  }

  async function callLocalGeminiDirect(requestBody, apiKey, onChunk) {
    var configured = (Array.isArray(CFG.ENGINE_MODELS) && CFG.ENGINE_MODELS.length)
      ? CFG.ENGINE_MODELS.slice()
      : DEFAULT_MODELS.slice();
    var models = configured.filter(function (m) { return !/gemini-2\.0/i.test(m); });
    if (!models.length) models = DEFAULT_MODELS.slice();

    var kinds = getEndpointKindsForKey(apiKey);
    var errors = [];
    var wantStream = typeof onChunk === "function";

    // 1. Jalur super cepat: langsung pakai pasangan endpoint + model yg sudah terbukti berhasil
    if (preferredLocalTarget) {
      var fastRes = wantStream
        ? await tryStreamTarget(preferredLocalTarget.kind, preferredLocalTarget.model, requestBody, apiKey, onChunk)
        : await trySingleTarget(preferredLocalTarget.kind, preferredLocalTarget.model, requestBody, apiKey);
      if (!fastRes.ok && wantStream) {
        fastRes = await trySingleTarget(preferredLocalTarget.kind, preferredLocalTarget.model, requestBody, apiKey);
      }
      if (fastRes.ok) {
        consecutiveFailures = 0;
        return { text: fastRes.text, quota: null, model: fastRes.model };
      }
      savePreferredTarget(null);
    }

    // 2. Coba daftar model cepat
    for (var i = 0; i < models.length; i++) {
      var model = models[i];
      for (var k = 0; k < kinds.length; k++) {
        var kind = kinds[k];
        var attempt = wantStream
          ? await tryStreamTarget(kind, model, requestBody, apiKey, onChunk)
          : await trySingleTarget(kind, model, requestBody, apiKey);
        if (!attempt.ok && wantStream && attempt.status !== 0 && attempt.status !== 401 && attempt.status !== 403 && attempt.status !== 404) {
          attempt = await trySingleTarget(kind, model, requestBody, apiKey);
        }
        if (attempt.ok) {
          savePreferredTarget({ kind: kind, model: model });
          consecutiveFailures = 0;
          return { text: attempt.text, quota: null, model: model };
        }
        errors.push({ kind: kind, model: model, status: attempt.status, error: attempt.error });
        if (attempt.status === 401 || /API key not valid/i.test(attempt.error)) {
          break;
        }
      }
    }

    // 3. Fallback deteksi model aktif terbaru
    var liveModels = await discoverAvailableStudioModels(apiKey);
    for (var d = 0; d < liveModels.length; d++) {
      var dm = liveModels[d];
      if (models.indexOf(dm) !== -1) continue;
      for (var dk = 0; dk < kinds.length; dk++) {
        var dAttempt = await trySingleTarget(kinds[dk], dm, requestBody, apiKey);
        if (dAttempt.ok) {
          savePreferredTarget({ kind: kinds[dk], model: dm });
          consecutiveFailures = 0;
          return { text: dAttempt.text, quota: null, model: dm };
        }
        errors.push({ kind: kinds[dk], model: dm, status: dAttempt.status, error: dAttempt.error });
      }
    }

    var meaningful = errors.find(function (e) { return e.status === 401 || e.status === 403 || e.status === 429; })
      || errors.find(function (e) { return e.status >= 400; })
      || errors[0];

    var detail = meaningful ? (meaningful.model + " [" + meaningful.kind + "]: " + meaningful.error) : "Tidak ada respons dari server Gemini.";
    var hint = apiKey.indexOf("AQ.") === 0
      ? " Catatan: kunci berawalan AQ. (Vertex AI Express) kadang dibatasi CORS dari browser localhost; pakai API key Google AI Studio (AIza...) di js/env.js atau lewat Cloudflare Worker."
      : " Periksa kembali LOCAL_GEMINI_API_KEY di js/env.js.";

    throw new Error("Uji lokal Gemini gagal (" + detail + ")." + hint);
  }

  async function callBackend(requestBody, idToken, onChunk) {
    if (Date.now() < circuitOpenUntil) {
      throw new Error("Layanan sedang memulihkan koneksi. Silakan coba beberapa detik lagi.");
    }

    var proxyUrl = getProxyUrl();
    var localKey = getLocalGeminiKey();

    if (!proxyUrl && isLocalDevHost() && localKey) {
      return await callLocalGeminiDirect(requestBody, localKey, onChunk);
    }

    if (!proxyUrl) {
      throw new Error((STR && STR.chat && STR.chat.serverNotConfigured) || "Peladen obrolan belum terhubung.");
    }

    if (!idToken) {
      throw new Error((STR && STR.chat && STR.chat.needGoogle) || "Masuk dengan akun Google diperlukan.");
    }

    var preferredModel = (Array.isArray(CFG.ENGINE_MODELS) && CFG.ENGINE_MODELS[0]) || "gemini-2.5-flash-lite";

    var res;
    try {
      res = await fetchWithTimeout(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + idToken
        },
        body: JSON.stringify({
          model: preferredModel,
          payload: buildFastPayload(requestBody, "studio", preferredModel)
        })
      }, 18000);
    } catch (netErr) {
      consecutiveFailures += 1;
      if (consecutiveFailures >= 4) circuitOpenUntil = Date.now() + 10000;
      throw new Error("Tidak dapat terhubung ke peladen Lentera ID. Periksa koneksi internet Anda.");
    }

    var data = await res.json().catch(function () { return {}; });
    if (data && data.quota) lastQuota = data.quota;

    if (!res.ok) {
      if (res.status >= 500) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= 4) circuitOpenUntil = Date.now() + 10000;
      }
      var err = new Error(data.error || ("Kendala peladen HTTP " + res.status + "."));
      err.status = res.status;
      err.quota = data.quota || null;
      throw err;
    }

    if (!data.text) {
      throw new Error("Peladen mengembalikan jawaban kosong. Silakan kirim ulang.");
    }

    consecutiveFailures = 0;
    return { text: data.text, quota: data.quota || null, model: data.model || preferredModel };
  }

  function cleanOutputText(text) {
    return String(text || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\bLentera\+?62\b/gi, "Lentera ID")
      .trim();
  }

  async function sendChat(historyMessages, idToken, subjectId, onChunk) {
    var recent = (historyMessages || []).slice(-10);
    var lastUserMsg = recent.length ? recent[recent.length - 1].text : "";
    var subjectLabel = window.LenteraContent ? window.LenteraContent.getSubjectName(subjectId || "indonesia") : "Umum";
    var cacheKey = "chat:" + subjectLabel + ":" + recent.length + ":" + String(lastUserMsg).trim().toLowerCase().slice(0, 120);

    var cached = getCached(cacheKey);
    if (cached) return { text: cached, quota: lastQuota, fromCache: true };

    var contents = normalizeContents(recent.map(function (m) {
      return {
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: String(m.text || "") }]
      };
    }));

    var systemText = CFG.SYSTEM_PROMPT + "\nKonteks mata kuliah aktif: " + subjectLabel + ".";

    var res = await enqueue(function () {
      return callBackend({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: contents,
        generationConfig: { temperature: 0.65, maxOutputTokens: 1024 }
      }, idToken, onChunk);
    });

    var cleaned = cleanOutputText(res.text);
    setCached(cacheKey, cleaned);
    return { text: cleaned, quota: res.quota, fromCache: false };
  }

  function extractJsonArray(rawText) {
    var s = String(rawText || "").trim();
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    var start = s.indexOf("[");
    var end = s.lastIndexOf("]");
    if (start !== -1 && end > start) return JSON.parse(s.slice(start, end + 1));
    var objStart = s.indexOf("{");
    var objEnd = s.lastIndexOf("}");
    if (objStart !== -1 && objEnd > objStart) {
      var parsed = JSON.parse(s.slice(objStart, objEnd + 1));
      if (Array.isArray(parsed.items)) return parsed.items;
      if (Array.isArray(parsed.questions)) return parsed.questions;
    }
    throw new Error("Format JSON soal tidak sesuai.");
  }

  async function generateQuestions(opts, idToken) {
    var subjectId = (opts && opts.subject) || "indonesia";
    var fallbackSubject = (opts && opts.fallbackSubject) || "indonesia";
    var difficulty = (opts && opts.difficulty) || "sedang";
    var count = Math.max(4, Math.min(15, Number(opts && opts.count) || 10));
    var chatContext = String((opts && opts.chatContext) || "").trim();
    var effectiveSubj = subjectId === "chat" ? fallbackSubject : subjectId;
    var subjectName = window.LenteraContent ? window.LenteraContent.getSubjectName(effectiveSubj) : "Bahasa Indonesia";

    var hasProxy = Boolean(getProxyUrl() && idToken);
    var hasLocalKey = isLocalDevHost() && Boolean(getLocalGeminiKey());
    if (!hasProxy && !hasLocalKey) {
      return { items: [], usedFallback: true };
    }

    var cacheKey = "qgen:" + subjectId + ":" + effectiveSubj + ":" + difficulty + ":" + count + ":" + chatContext.slice(-180);
    var cached = getCached(cacheKey);
    if (cached) return { items: cached.slice(), usedFallback: false };

    var langRule = effectiveSubj === "inggris"
      ? "Write all prompts, options, and explanations in clear academic English."
      : "Tulis seluruh soal, opsi, dan penjelasan dalam Bahasa Indonesia baku sesuai EYD V.";

    var extraRule = "Jangan gunakan sintaks LaTeX mentah seperti \\frac, \\land, atau \\text; tulis rumus dengan simbol matematika Unicode yang rapi dan mudah dibaca.";
    if (effectiveSubj === "pemrograman") extraRule += " Bungkus kode singkat dengan tanda backtick (`kode`).";

    var sourceBlock = chatContext
      ? (
        "WAJIB KETAT: Buat SELURUH " + count + " soal HANYA dari topik, konsep, istilah, contoh, rumus, atau penjelasan yang benar-benar ada pada transkrip percakapan berikut. " +
        "DILARANG KERAS mencampur mata kuliah lain atau materi di luar isi percakapan ini.\n" +
        "Transkrip percakapan:\n---\n" + chatContext.slice(0, 4200) + "\n---"
      )
      : ("Mata kuliah: " + subjectName + ". Tingkat kesulitan: " + difficulty + ".");

    var prompt = [
      "Buat tepat " + count + " butir soal edukatif yang akurat, relevan, dan variatif.",
      sourceBlock,
      langRule,
      extraRule,
      "Setiap soal MCQ wajib punya 4 opsi berbeda dengan tepat 1 jawaban benar (index 0..3) dan penjelasan singkat.",
      "Balas HANYA array JSON valid tanpa teks tambahan atau markdown.",
      'Skema: [{"type":"mcq"|"tf"|"arrange"|"guess","difficulty":"' + difficulty + '","topic":"Materi Percakapan","prompt":"pertanyaan","options":["A","B","C","D"],"answer":0,"steps":["langkah1","langkah2","langkah3"],"answerText":"jawaban","hint":"petunjuk","explanation":"penjelasan"}]'
    ].join("\n");

    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        var res = await enqueue(function () {
          return callBackend({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 2048, responseMimeType: "application/json" }
          }, idToken);
        });
        var rawArr = extractJsonArray(res.text);
        var valid = rawArr
          .map(function (it) {
            if (chatContext && it && typeof it === "object") it.topic = "Materi Percakapan";
            return window.LenteraContent ? window.LenteraContent.validateItem(it) : null;
          })
          .filter(Boolean);

        if (valid.length >= 2) {
          setCached(cacheKey, valid);
          return { items: valid, usedFallback: false, quota: res.quota || null };
        }
      } catch (err) {
        if (attempt === 1) return { items: [], usedFallback: true };
      }
    }

    return { items: [], usedFallback: true };
  }

  return {
    sendChat: sendChat,
    generateQuestions: generateQuestions,
    getLastQuota: function () { return lastQuota; }
  };
})();
