/**
 * Cloudflare Worker Proxy untuk Lentera ID
 * - Menyimpan GEMINI_API_KEY secara aman sebagai Worker Secret.
 * - CORS ketat berdasarkan env.ALLOWED_ORIGIN (tanpa wildcard '*').
 * - Verifikasi JWT Firebase ID Token (RS256, aud, iss, exp, sub).
 * - Pengecekan akun diblokir di Firestore menggunakan token pengguna sendiri.
 * - Penegakan kuota pesan per jam per uid via Cloudflare KV (RATE_LIMIT_KV).
 * - Batas ukuran body, whitelist model, dan fallback model otomatis.
 */

const GOOGLE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const MAX_BODY_BYTES = 65536; // 64 KB
const MODEL_WHITELIST = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.0-flash",
  "gemini-3-flash-preview",
  "gemini-flash-latest"
];

let cachedJwks = null;
let jwksExpiresAt = 0;
const memoryQuotaFallback = new Map();

function parseAllowedOrigins(env) {
  return String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = parseAllowedOrigins(env);
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin"
  };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function base64UrlToUint8Array(b64url) {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function decodeJwtPart(b64url) {
  const bytes = base64UrlToUint8Array(b64url);
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function getGoogleJwks() {
  const now = Date.now();
  if (cachedJwks && now < jwksExpiresAt) {
    return cachedJwks;
  }
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) {
    throw new Error("Gagal mengambil kunci publik verifikasi Firebase.");
  }
  const cacheControl = res.headers.get("Cache-Control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  const data = await res.json();
  cachedJwks = data.keys || [];
  jwksExpiresAt = now + Math.max(300, maxAgeSec) * 1000;
  return cachedJwks;
}

async function verifyFirebaseIdToken(token, projectId) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw new Error("Format token autentikasi tidak valid.");
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = decodeJwtPart(headerB64);
  const payload = decodeJwtPart(payloadB64);

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Algoritma token tidak didukung.");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expectedIss = `https://securetoken.google.com/${projectId}`;

  if (payload.aud !== projectId) {
    throw new Error("Audience token tidak sesuai proyek.");
  }
  if (payload.iss !== expectedIss) {
    throw new Error("Penerbit token tidak sesuai.");
  }
  if (typeof payload.exp !== "number" || payload.exp <= nowSec) {
    throw new Error("Sesi masuk telah berakhir. Silakan muat ulang atau masuk kembali.");
  }
  if (typeof payload.iat !== "number" || payload.iat > nowSec + 120) {
    throw new Error("Waktu terbit token tidak valid.");
  }
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Identitas pengguna pada token kosong.");
  }

  const jwks = await getGoogleJwks();
  let jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) {
    cachedJwks = null;
    const freshJwks = await getGoogleJwks();
    jwk = freshJwks.find((k) => k.kid === header.kid);
  }
  if (!jwk) {
    throw new Error("Kunci tanda tangan token tidak dikenali.");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToUint8Array(sigB64);
  const isValid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, signingInput);
  if (!isValid) {
    throw new Error("Tanda tangan token autentikasi tidak sah.");
  }

  return {
    uid: payload.sub,
    email: payload.email || "",
    emailVerified: Boolean(payload.email_verified)
  };
}

async function checkUserBlockedInFirestore(projectId, uid, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  if (res.status === 404) {
    return { isBlocked: false, blockReason: "" };
  }
  if (!res.ok) {
    throw new Error("Gagal memeriksa status akun. Silakan coba beberapa saat lagi.");
  }
  const doc = await res.json();
  const fields = doc.fields || {};
  const isBlocked = Boolean(fields.isBlocked && fields.isBlocked.booleanValue === true);
  const blockReason = (fields.blockReason && fields.blockReason.stringValue) || "";
  return { isBlocked, blockReason };
}

async function enforceHourlyQuota(env, uid) {
  const limit = Math.max(1, Number(env.MAX_REQUESTS_PER_HOUR) || 40);
  const hourBucket = Math.floor(Date.now() / 3600000);
  const key = `quota:${uid}:${hourBucket}`;

  if (env.RATE_LIMIT_KV) {
    const raw = await env.RATE_LIMIT_KV.get(key);
    const used = Number(raw || 0);
    if (used >= limit) {
      return { allowed: false, used, limit, remaining: 0 };
    }
    const nextUsed = used + 1;
    await env.RATE_LIMIT_KV.put(key, String(nextUsed), { expirationTtl: 3900 });
    return { allowed: true, used: nextUsed, limit, remaining: Math.max(0, limit - nextUsed) };
  }

  const current = memoryQuotaFallback.get(key) || 0;
  if (current >= limit) {
    return { allowed: false, used: current, limit, remaining: 0 };
  }
  const next = current + 1;
  memoryQuotaFallback.set(key, next);
  return { allowed: true, used: next, limit, remaining: Math.max(0, limit - next) };
}

function buildModelCandidates(requestedModel, env) {
  const preferred = [];
  if (requestedModel && MODEL_WHITELIST.includes(requestedModel)) {
    preferred.push(requestedModel);
  }
  if (env.GEMINI_MODEL && MODEL_WHITELIST.includes(env.GEMINI_MODEL) && !preferred.includes(env.GEMINI_MODEL)) {
    preferred.push(env.GEMINI_MODEL);
  }
  for (const m of MODEL_WHITELIST) {
    if (!preferred.includes(m)) preferred.push(m);
  }
  return preferred;
}

function buildPlainCompatiblePayload(payload) {
  const sysText = payload?.systemInstruction?.parts?.map((p) => p.text || "").join("\n") || "";
  const contents = (payload?.contents || []).map((c, idx) => {
    const parts = (c.parts || []).map((p) => ({ text: String(p.text || "") }));
    if (idx === 0 && sysText && parts.length > 0) {
      parts[0].text = `[Panduan Peran]\n${sysText}\n\n[Pesan Pengguna]\n${parts[0].text}`;
    }
    return { role: c.role || "user", parts };
  });
  const genCfg = { ...(payload?.generationConfig || {}) };
  delete genCfg.responseMimeType;
  return { contents, generationConfig: genCfg };
}

async function callGeminiWithFallback(apiKey, candidates, payload) {
  let lastStatus = 500;
  let lastMessage = "Layanan sedang sibuk. Silakan coba lagi sebentar.";

  const isVertexKey = String(apiKey || "").startsWith("AQ.");
  for (const model of candidates) {
    const endpoints = isVertexKey
      ? [
          {
            url: `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
            headers: { "Content-Type": "application/json" }
          },
          {
            url: `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
            headers: { "Content-Type": "application/json" }
          },
          {
            url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
            headers: { "Content-Type": "application/json" }
          }
        ]
      : [
          {
            url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }
          }
        ];

    for (const ep of endpoints) {
      let res = await fetch(ep.url, {
        method: "POST",
        headers: ep.headers,
        body: JSON.stringify(payload)
      });

      if (res.status === 400) {
        res = await fetch(ep.url, {
          method: "POST",
          headers: ep.headers,
          body: JSON.stringify(buildPlainCompatiblePayload(payload))
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const text = parts.filter((p) => p && typeof p.text === "string" && !p.thought).map((p) => p.text).join("\n").trim()
          || (parts[0]?.text || "");
        if (text) {
          return { ok: true, model, text };
        }
        lastStatus = 502;
        lastMessage = "Respons model kosong.";
        continue;
      }

      lastStatus = res.status;
      lastMessage = data?.error?.message || `HTTP ${res.status}`;
      if ([400, 401, 403, 404, 429, 503].includes(res.status)) {
        continue;
      }
      break;
    }
  }

  return { ok: false, status: lastStatus, error: lastMessage };
}

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(request, env);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = parseAllowedOrigins(env);

    if (request.method === "OPTIONS") {
      if (origin && !allowedOrigins.includes(origin)) {
        return new Response("Origin tidak diizinkan.", { status: 403 });
      }
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      return jsonResponse({ error: "Asal permintaan tidak diizinkan." }, 403, corsHeaders);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Metode HTTP tidak diizinkan." }, 405, corsHeaders);
    }

    if (!env.GEMINI_API_KEY) {
      return jsonResponse({ error: "Layanan belum dikonfigurasi oleh pengelola." }, 500, corsHeaders);
    }

    const projectId = env.FIREBASE_PROJECT_ID || "lentera-id";

    const authHeader = request.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Silakan masuk dengan akun Google terlebih dahulu." }, 401, corsHeaders);
    }
    const idToken = authHeader.slice(7).trim();

    let user;
    try {
      user = await verifyFirebaseIdToken(idToken, projectId);
    } catch (err) {
      return jsonResponse({ error: err.message || "Token autentikasi tidak valid." }, 401, corsHeaders);
    }

    try {
      const blockStatus = await checkUserBlockedInFirestore(projectId, user.uid, idToken);
      if (blockStatus.isBlocked) {
        return jsonResponse(
          { error: blockStatus.blockReason || "Akun Anda sedang dibatasi oleh administrator." },
          403,
          corsHeaders
        );
      }
    } catch (err) {
      return jsonResponse({ error: err.message || "Gagal memeriksa status akun." }, 503, corsHeaders);
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Ukuran pesan terlalu besar (maksimal 64 KB)." }, 413, corsHeaders);
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Ukuran pesan terlalu besar (maksimal 64 KB)." }, 413, corsHeaders);
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Format permintaan tidak valid." }, 400, corsHeaders);
    }

    if (!body || typeof body.payload !== "object" || !Array.isArray(body.payload.contents)) {
      return jsonResponse({ error: "Struktur permintaan tidak lengkap." }, 400, corsHeaders);
    }

    const quota = await enforceHourlyQuota(env, user.uid);
    if (!quota.allowed) {
      return jsonResponse(
        {
          error: "Batas kuota pesan per jam telah tercapai. Silakan coba lagi pada jam berikutnya.",
          quota
        },
        429,
        corsHeaders
      );
    }

    const candidates = buildModelCandidates(body.model, env);
    const result = await callGeminiWithFallback(env.GEMINI_API_KEY, candidates, body.payload);

    if (!result.ok) {
      const friendlyMsg =
        result.status === 429 || result.status === 503
          ? "Layanan sedang sangat padat. Silakan coba kirim ulang beberapa detik lagi."
          : "Terjadi kendala pada layanan. Silakan coba lagi sebentar.";
      const outStatus = result.status >= 400 && result.status < 600 ? result.status : 502;
      return jsonResponse({ error: friendlyMsg, quota }, outStatus, corsHeaders);
    }

    return jsonResponse({ text: result.text, model: result.model, quota }, 200, corsHeaders);
  }
};
