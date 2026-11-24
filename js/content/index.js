/**
 * Registri Bank Materi 8 Mata Kuliah, Validator Ketat, Diagram SVG Lokal, & Renderer KaTeX
 * - Bahasa Indonesia sebagai materi utama + 7 mata kuliah lintas ilmu.
 * - Setiap peserta Mabar di Lentera Kuis mendapat urutan soal & opsi yang unik (berdasarkan seed pribadi).
 */
window.LenteraContent = (function () {
  var SUBJECTS = [
    { id: "indonesia", name: "Bahasa Indonesia", group: "utama" },
    { id: "kalkulus", name: "Kalkulus", group: "lintas" },
    { id: "fisika", name: "Fisika Teknik", group: "lintas" },
    { id: "agama", name: "Agama Islam", group: "lintas" },
    { id: "logika", name: "Logika Informatika", group: "lintas" },
    { id: "pemrograman", name: "Pemrograman Dasar Informatika", group: "lintas" },
    { id: "pancasila", name: "Pancasila", group: "lintas" },
    { id: "inggris", name: "Bahasa Inggris", group: "lintas" }
  ];

  // PRNG Mulberry32 untuk pengacakan deterministik
  function hashStr(str) {
    var s = String(str || Date.now());
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function createRng(seed) {
    var a = hashStr(seed);
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    var out = (arr || []).slice();
    var r = rng || Math.random;
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /**
   * Validasi ketat 1 butir soal (baik dari model AI maupun bank lokal).
   * Wajib: penjelasan tidak kosong, opsi tidak kembar, tepat 1 jawaban benar.
   */
  function validateItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    var prompt = String(raw.prompt || "").trim();
    var explanation = String(raw.explanation || "").trim();
    if (!prompt || !explanation) return null;

    var type = String(raw.type || "mcq").toLowerCase();
    var difficulty = String(raw.difficulty || "sedang").toLowerCase();
    if (["mudah", "sedang", "sulit"].indexOf(difficulty) === -1) difficulty = "sedang";

    if (type === "mcq" || type === "tf" || type === "chain" || type === "diagram") {
      if (!Array.isArray(raw.options) || raw.options.length < 2) return null;
      var cleanedOpts = raw.options.map(function (o) { return String(o || "").trim(); }).filter(Boolean);
      if (cleanedOpts.length !== raw.options.length) return null;

      // Tolak opsi kembar
      var seen = {};
      for (var i = 0; i < cleanedOpts.length; i++) {
        var key = cleanedOpts[i].toLowerCase();
        if (seen[key]) return null;
        seen[key] = true;
      }

      var ans = Number(raw.answer);
      if (!Number.isInteger(ans) || ans < 0 || ans >= cleanedOpts.length) return null;

      return {
        type: type,
        difficulty: difficulty,
        topic: String(raw.topic || ""),
        diagramId: raw.diagramId || "",
        prompt: prompt,
        options: cleanedOpts,
        answer: ans,
        explanation: explanation
      };
    }

    if (type === "arrange") {
      if (!Array.isArray(raw.steps) || raw.steps.length < 3) return null;
      var steps = raw.steps.map(function (s) { return String(s || "").trim(); }).filter(Boolean);
      if (steps.length < 3) return null;
      return {
        type: "arrange",
        difficulty: difficulty,
        topic: String(raw.topic || ""),
        prompt: prompt,
        steps: steps,
        explanation: explanation
      };
    }

    if (type === "guess") {
      var answerText = String(raw.answerText || "").trim();
      if (!answerText) return null;
      return {
        type: "guess",
        difficulty: difficulty,
        topic: String(raw.topic || ""),
        prompt: prompt,
        answerText: answerText,
        hint: String(raw.hint || "").trim(),
        explanation: explanation
      };
    }

    if (type === "match") {
      if (!Array.isArray(raw.pairs) || raw.pairs.length < 3) return null;
      var validPairs = raw.pairs.filter(function (p) {
        return Array.isArray(p) && p.length === 2 && String(p[0] || "").trim() && String(p[1] || "").trim();
      }).map(function (p) {
        return [String(p[0]).trim(), String(p[1]).trim()];
      });
      if (validPairs.length < 3) return null;
      return {
        type: "match",
        difficulty: difficulty,
        topic: String(raw.topic || ""),
        prompt: prompt,
        pairs: validPairs.slice(0, 3),
        explanation: explanation
      };
    }

    return null;
  }

  function shuffleItemOptions(item, rng) {
    if (!item.options || item.type === "tf") return Object.assign({}, item);
    var tagged = item.options.map(function (text, idx) {
      return { text: text, isAns: idx === item.answer };
    });
    var mixed = shuffle(tagged, rng);
    var newAns = 0;
    var newOpts = mixed.map(function (entry, i) {
      if (entry.isAns) newAns = i;
      return entry.text;
    });
    return Object.assign({}, item, { options: newOpts, answer: newAns });
  }

  function getBankItems(subjectId) {
    var banks = window.LenteraContentBanks || {};
    if (subjectId === "chat") return [];
    if (subjectId === "acak") {
      var all = [];
      SUBJECTS.forEach(function (s) {
        var b = banks[s.id];
        if (b && Array.isArray(b.items)) {
          b.items.forEach(function (it) {
            var v = validateItem(Object.assign({ topic: s.name }, it));
            if (v) all.push(v);
          });
        }
      });
      return all;
    }
    var b = banks[subjectId] || banks["indonesia"];
    if (!b) return [];
    return (b.items || []).map(function (it) {
      return validateItem(Object.assign({ topic: b.name }, it));
    }).filter(Boolean);
  }

  /**
   * Membangun daftar soal unik per pemain (anti-contek).
   * - Untuk Lentera Kuis: bisa menghasilkan hingga 100 soal (10 stage x 10 soal) dengan campuran variasi.
   * - Jika jumlah soal yang diminta melebihi 1 bank materi (~22 soal), otomatis memperkaya dengan soal AI atau soal lintas ilmu terkait.
   */
  function buildPlayerQuestionSet(opts) {
    var subjectId = opts.subject || "indonesia";
    var totalNeeded = Math.max(3, Math.min(100, Number(opts.totalCount) || 30));
    var difficulty = opts.difficulty || "sedang";
    var seed = String(opts.playerSeed || (Date.now() + "-" + Math.random()));
    var rng = createRng(seed);
    var onlyMcq = Boolean(opts.onlyMcq);

    var pool = [];

    // 1. Masukkan soal dari generator AI (jika tersedia & valid)
    if (Array.isArray(opts.aiItems)) {
      opts.aiItems.forEach(function (raw) {
        var v = validateItem(raw);
        if (v) pool.push(v);
      });
    }

    // 2. Masukkan soal dari bank lokal materi terpilih
    var localItems = getBankItems(subjectId);
    if (difficulty === "mudah") {
      localItems.sort(function (a, b) {
        var r = { mudah: 0, sedang: 1, sulit: 2 };
        return (r[a.difficulty] || 1) - (r[b.difficulty] || 1);
      });
    } else if (difficulty === "sulit") {
      localItems.sort(function (a, b) {
        var r = { sulit: 0, sedang: 1, mudah: 2 };
        return (r[a.difficulty] || 1) - (r[b.difficulty] || 1);
      });
    }

    pool = pool.concat(shuffle(localItems, rng));

    if (onlyMcq) {
      pool = pool.filter(function (q) {
        return q.type === "mcq" || q.type === "tf" || q.type === "chain" || q.type === "diagram";
      });
    }

    // 3. Isolasi ketat materi percakapan: jika soal AI dari obrolan sudah tersedia,
    //    pakai HANYA soal hasil percakapan tersebut agar tidak tercampur materi lain!
    //    Fallback ke mata kuliah aktif percakapan HANYA bila generator AI gagal total (0 soal).
    if (subjectId === "chat") {
      if (pool.length > 0) {
        return shuffle(pool, rng).slice(0, Math.min(pool.length, totalNeeded)).map(function (item) {
          return shuffleItemOptions(item, rng);
        });
      }
      var chatFallbackId = (opts.fallbackSubject && opts.fallbackSubject !== "acak" && opts.fallbackSubject !== "chat")
        ? opts.fallbackSubject
        : "indonesia";
      var chatFallback = shuffle(getBankItems(chatFallbackId), rng);
      if (onlyMcq) {
        chatFallback = chatFallback.filter(function (q) {
          return q.type === "mcq" || q.type === "tf" || q.type === "chain" || q.type === "diagram";
        });
      }
      pool = chatFallback;
    }

    // Acak final dengan seed unik pemain + acak urutan opsi A/B/C/D
    var finalSet = shuffle(pool, rng).slice(0, totalNeeded).map(function (item) {
      return shuffleItemOptions(item, rng);
    });

    // Jika masih kurang karena sangat besar (misal 10 stage x 10), ulangi dengan acakan baru
    while (finalSet.length < totalNeeded && pool.length > 0) {
      var extra = shuffle(pool, rng);
      for (var i = 0; i < extra.length && finalSet.length < totalNeeded; i++) {
        finalSet.push(shuffleItemOptions(extra[i], rng));
      }
    }

    return finalSet;
  }

  function getSubjectName(subjectId) {
    if (subjectId === "acak") return "Semua Mata Kuliah";
    if (subjectId === "chat") return "Materi Percakapan";
    var s = SUBJECTS.find(function (x) { return x.id === subjectId; });
    return s ? s.name : "Bahasa Indonesia";
  }

  /**
   * Render teks berisi rumus KaTeX ($...$ / $$...$$) dan kode inline (`...`) ke elemen DOM secara aman.
   * Fallback otomatis ke teks biasa yang rapi bila KaTeX CDN belum termuat.
   */
  function formatMathReadable(expr) {
    var s = String(expr || "").trim();
    for (var k = 0; k < 3; k++) {
      s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
    }
    s = s.replace(/\\lim_\{([^{}]+)\}/g, "lim ($1)");
    s = s.replace(/\\int_\{([^{}]+)\}\^\{([^{}]+)\}/g, "\u222b[$1..$2]");
    s = s.replace(/\\text\{([^{}]+)\}/g, "$1");
    s = s.replace(/\{,\}/g, ",").replace(/\\,/g, " ");
    var map = [
      [/\\leftrightarrow/g, "\u2194"], [/\\Rightarrow/g, "\u21d2"], [/\\to/g, "\u2192"],
      [/\\equiv/g, "\u2261"], [/\\land/g, "\u2227"], [/\\lor/g, "\u2228"],
      [/\\neg/g, "\u00ac"], [/\\cdot/g, "\u00b7"], [/\\times/g, "\u00d7"],
      [/\\pm/g, "\u00b1"], [/\\infty/g, "\u221e"], [/\\Omega/g, "\u03a9"],
      [/\\Delta/g, "\u0394"], [/\\tau/g, "\u03c4"], [/\\alpha/g, "\u03b1"],
      [/\\theta/g, "\u03b8"], [/\\rho/g, "\u03c1"], [/\\int/g, "\u222b"],
      [/\\(sin|cos|tan|ln|log)/g, "$1"], [/\^\\circ/g, "\u00b0"],
      [/\^2/g, "\u00b2"], [/\^3/g, "\u00b3"], [/\^4/g, "\u2074"],
      [/_\{([^{}]+)\}/g, "_$1"], [/\^\{([^{}]+)\}/g, "^$1"]
    ];
    for (var i = 0; i < map.length; i++) s = s.replace(map[i][0], map[i][1]);
    return s.replace(/\s+/g, " ").trim();
  }

  function sanitizeQuizText(rawText) {
    return String(rawText || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\s->\s/g, " \u2192 ")
      .trim();
  }

  function renderRichText(targetEl, rawText) {
    if (!targetEl) return;
    targetEl.textContent = "";
    var text = sanitizeQuizText(rawText);
    var tokenRegex = /(\$\$[^$]+\$\$|\$[^$\n]+\$|`[^`]+`)/g;
    var lastIdx = 0;
    var match;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        targetEl.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
      }
      var tok = match[0];
      if (tok.startsWith("`") && tok.endsWith("`")) {
        var code = document.createElement("code");
        code.textContent = tok.slice(1, -1);
        targetEl.appendChild(code);
      } else {
        var isDisplay = tok.startsWith("$$");
        var expr = isDisplay ? tok.slice(2, -2).trim() : tok.slice(1, -1).trim();
        var span = document.createElement("span");
        if (window.katex && typeof window.katex.render === "function") {
          try {
            window.katex.render(expr, span, { throwOnError: false, displayMode: isDisplay });
          } catch (e) {
            span.textContent = formatMathReadable(expr);
          }
        } else {
          span.textContent = formatMathReadable(expr);
        }
        targetEl.appendChild(span);
      }
      lastIdx = tokenRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      targetEl.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
  }

  /**
   * Diagram SVG vektor lokal yang tajam untuk soal Tebak Gambar di 8 mata kuliah.
   */
  function buildDiagramSvg(diagramId) {
    var wrap = document.createElement("div");
    wrap.className = "question-diagram-box";

    var svgs = {
      "indo-paragraph":
        '<svg viewBox="0 0 280 110" width="280" height="110" role="img" aria-label="Diagram struktur paragraf">' +
        '<rect x="20" y="10" width="240" height="28" rx="6" fill="var(--primary-soft)" stroke="var(--primary)" stroke-width="2"/>' +
        '<text x="140" y="28" text-anchor="middle" fill="var(--primary)" font-size="12" font-weight="600">Kalimat Utama (Gagasan Pokok)</text>' +
        '<rect x="36" y="48" width="208" height="22" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)" stroke-width="1.5"/>' +
        '<text x="140" y="63" text-anchor="middle" fill="var(--text-secondary)" font-size="11">Kalimat Penjelas 1</text>' +
        '<rect x="36" y="78" width="208" height="22" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)" stroke-width="1.5"/>' +
        '<text x="140" y="93" text-anchor="middle" fill="var(--text-secondary)" font-size="11">Kalimat Penjelas 2</text></svg>',

      "calc-parabola":
        '<svg viewBox="0 0 240 120" width="240" height="120" role="img" aria-label="Grafik parabola f(x) = x^2">' +
        '<line x1="20" y1="98" x2="220" y2="98" stroke="var(--border-strong)" stroke-width="1.5"/>' +
        '<line x1="120" y1="12" x2="120" y2="112" stroke="var(--border-strong)" stroke-width="1.5"/>' +
        '<path d="M 55 22 Q 120 174 185 22" fill="none" stroke="var(--primary)" stroke-width="2.5"/>' +
        '<line x1="75" y1="98" x2="165" y2="98" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3"/>' +
        '<circle cx="120" cy="98" r="4.5" fill="var(--accent)"/>' +
        '<text x="132" y="92" fill="var(--text)" font-size="11">(0,0)</text></svg>',

      "calc-area":
        '<svg viewBox="0 0 240 120" width="240" height="120" role="img" aria-label="Luas di bawah kurva">' +
        '<line x1="24" y1="96" x2="220" y2="96" stroke="var(--border-strong)" stroke-width="1.5"/>' +
        '<line x1="36" y1="14" x2="36" y2="108" stroke="var(--border-strong)" stroke-width="1.5"/>' +
        '<path d="M 75 96 L 75 56 Q 125 22 175 48 L 175 96 Z" fill="var(--primary-soft)" stroke="none"/>' +
        '<path d="M 45 72 Q 125 14 205 56" fill="none" stroke="var(--primary)" stroke-width="2.4"/>' +
        '<line x1="75" y1="56" x2="75" y2="96" stroke="var(--primary)" stroke-dasharray="3 3"/>' +
        '<line x1="175" y1="48" x2="175" y2="96" stroke="var(--primary)" stroke-dasharray="3 3"/>' +
        '<text x="72" y="110" fill="var(--text)" font-size="11">a</text>' +
        '<text x="172" y="110" fill="var(--text)" font-size="11">b</text></svg>',

      "phys-series":
        '<svg viewBox="0 0 260 100" width="260" height="100" role="img" aria-label="Rangkaian dua resistor seri">' +
        '<line x1="20" y1="50" x2="55" y2="50" stroke="var(--text)" stroke-width="2"/>' +
        '<rect x="55" y="38" width="52" height="24" rx="4" fill="var(--surface)" stroke="var(--primary)" stroke-width="2"/>' +
        '<text x="81" y="54" text-anchor="middle" fill="var(--text)" font-size="11" font-weight="600">R1</text>' +
        '<line x1="107" y1="50" x2="148" y2="50" stroke="var(--text)" stroke-width="2"/>' +
        '<rect x="148" y="38" width="52" height="24" rx="4" fill="var(--surface)" stroke="var(--primary)" stroke-width="2"/>' +
        '<text x="174" y="54" text-anchor="middle" fill="var(--text)" font-size="11" font-weight="600">R2</text>' +
        '<line x1="200" y1="50" x2="240" y2="50" stroke="var(--text)" stroke-width="2"/></svg>',

      "phys-forces":
        '<svg viewBox="0 0 220 120" width="220" height="120" role="img" aria-label="Diagram gaya balok">' +
        '<line x1="30" y1="90" x2="190" y2="90" stroke="var(--border-strong)" stroke-width="2"/>' +
        '<rect x="85" y="54" width="50" height="36" rx="4" fill="var(--surface-2)" stroke="var(--text)" stroke-width="1.8"/>' +
        '<line x1="110" y1="54" x2="110" y2="16" stroke="var(--primary)" stroke-width="2.5"/>' +
        '<polygon points="110,10 104,20 116,20" fill="var(--primary)"/>' +
        '<text x="122" y="24" fill="var(--primary)" font-size="12" font-weight="700">?</text>' +
        '<line x1="110" y1="90" x2="110" y2="112" stroke="var(--accent)" stroke-width="2"/>' +
        '<text x="122" y="110" fill="var(--text-secondary)" font-size="11">W</text></svg>',

      "islam-pillars":
        '<svg viewBox="0 0 280 100" width="280" height="100" role="img" aria-label="Diagram lima rukun Islam">' +
        '<rect x="10" y="32" width="46" height="44" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)"/>' +
        '<text x="33" y="58" text-anchor="middle" fill="var(--text)" font-size="10">1. Syahadat</text>' +
        '<rect x="64" y="32" width="46" height="44" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)"/>' +
        '<text x="87" y="58" text-anchor="middle" fill="var(--text)" font-size="10">2. Salat</text>' +
        '<rect x="118" y="24" width="46" height="52" rx="5" fill="var(--primary-soft)" stroke="var(--primary)" stroke-width="2"/>' +
        '<text x="141" y="54" text-anchor="middle" fill="var(--primary)" font-size="13" font-weight="700">3. ?</text>' +
        '<rect x="172" y="32" width="46" height="44" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)"/>' +
        '<text x="195" y="58" text-anchor="middle" fill="var(--text)" font-size="10">4. Puasa</text>' +
        '<rect x="226" y="32" width="46" height="44" rx="5" fill="var(--surface-2)" stroke="var(--border-strong)"/>' +
        '<text x="249" y="58" text-anchor="middle" fill="var(--text)" font-size="10">5. Haji</text></svg>',

      "logic-and":
        '<svg viewBox="0 0 220 100" width="220" height="100" role="img" aria-label="Simbol gerbang logika AND">' +
        '<line x1="25" y1="35" x2="70" y2="35" stroke="var(--text)" stroke-width="2"/>' +
        '<line x1="25" y1="65" x2="70" y2="65" stroke="var(--text)" stroke-width="2"/>' +
        '<path d="M 70 20 L 115 20 A 30 30 0 0 1 115 80 L 70 80 Z" fill="var(--surface)" stroke="var(--primary)" stroke-width="2.4"/>' +
        '<line x1="145" y1="50" x2="195" y2="50" stroke="var(--text)" stroke-width="2"/>' +
        '<text x="12" y="39" fill="var(--text)" font-size="11">A</text><text x="12" y="69" fill="var(--text)" font-size="11">B</text></svg>',

      "logic-not":
        '<svg viewBox="0 0 220 100" width="220" height="100" role="img" aria-label="Simbol gerbang logika NOT">' +
        '<line x1="30" y1="50" x2="75" y2="50" stroke="var(--text)" stroke-width="2"/>' +
        '<polygon points="75,24 75,76 135,50" fill="var(--surface)" stroke="var(--primary)" stroke-width="2.4"/>' +
        '<circle cx="143" cy="50" r="6" fill="var(--surface)" stroke="var(--primary)" stroke-width="2.2"/>' +
        '<line x1="149" y1="50" x2="195" y2="50" stroke="var(--text)" stroke-width="2"/></svg>',

      "prog-decision":
        '<svg viewBox="0 0 220 110" width="220" height="110" role="img" aria-label="Simbol belah ketupat diagram alir">' +
        '<polygon points="110,14 176,55 110,96 44,55" fill="var(--primary-soft)" stroke="var(--primary)" stroke-width="2.2"/>' +
        '<text x="110" y="59" text-anchor="middle" fill="var(--text)" font-size="12" font-weight="600">x &gt; 0 ?</text></svg>',

      "prog-stack":
        '<svg viewBox="0 0 200 116" width="200" height="116" role="img" aria-label="Ilustrasi struktur data Stack">' +
        '<path d="M 60 12 L 60 104 L 140 104 L 140 12" fill="none" stroke="var(--border-strong)" stroke-width="2.5"/>' +
        '<rect x="68" y="76" width="64" height="22" rx="4" fill="var(--surface-2)" stroke="var(--border-strong)"/>' +
        '<text x="100" y="91" text-anchor="middle" fill="var(--text)" font-size="12" font-weight="600">A</text>' +
        '<rect x="68" y="48" width="64" height="22" rx="4" fill="var(--surface-2)" stroke="var(--border-strong)"/>' +
        '<text x="100" y="63" text-anchor="middle" fill="var(--text)" font-size="12" font-weight="600">B</text>' +
        '<rect x="68" y="20" width="64" height="22" rx="4" fill="var(--primary-soft)" stroke="var(--primary)" stroke-width="1.8"/>' +
        '<text x="100" y="35" text-anchor="middle" fill="var(--primary)" font-size="12" font-weight="700">C (Top)</text></svg>',

      "panca-star":
        '<svg viewBox="0 0 140 110" width="140" height="110" role="img" aria-label="Lambang bintang bersudut lima">' +
        '<polygon points="70,12 84,44 118,46 92,68 100,100 70,82 40,100 48,68 22,46 56,44" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.4"/></svg>',

      "panca-chain":
        '<svg viewBox="0 0 200 100" width="200" height="100" role="img" aria-label="Lambang mata rantai">' +
        '<rect x="34" y="34" width="44" height="32" rx="8" fill="none" stroke="var(--accent)" stroke-width="3"/>' +
        '<circle cx="100" cy="50" r="18" fill="none" stroke="var(--primary)" stroke-width="3"/>' +
        '<rect x="122" y="34" width="44" height="32" rx="8" fill="none" stroke="var(--accent)" stroke-width="3"/></svg>',

      "eng-tense":
        '<svg viewBox="0 0 260 90" width="260" height="90" role="img" aria-label="English tense timeline">' +
        '<line x1="20" y1="50" x2="240" y2="50" stroke="var(--border-strong)" stroke-width="2"/>' +
        '<line x1="130" y1="30" x2="130" y2="70" stroke="var(--text)" stroke-width="2"/>' +
        '<text x="130" y="84" text-anchor="middle" fill="var(--text)" font-size="11">Now</text>' +
        '<circle cx="68" cy="50" r="7" fill="var(--primary)"/>' +
        '<text x="68" y="32" text-anchor="middle" fill="var(--primary)" font-size="11" font-weight="600">Action X</text></svg>'
    };

    wrap.innerHTML = svgs[diagramId] || "";
    return wrap;
  }

  return {
    SUBJECTS: SUBJECTS,
    createRng: createRng,
    shuffle: shuffle,
    validateItem: validateItem,
    getBankItems: getBankItems,
    buildPlayerQuestionSet: buildPlayerQuestionSet,
    getSubjectName: getSubjectName,
    formatMathReadable: formatMathReadable,
    renderRichText: renderRichText,
    buildDiagramSvg: buildDiagramSvg
  };
})();
