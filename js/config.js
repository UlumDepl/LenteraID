/**
 * Konfigurasi Global Lentera ID
 * Kredensial lingkungan dimuat dari js/env.js (diabaikan .gitignore & diisi GitHub Secrets saat deploy).
 */
(function () {
  var ENV = window.LENTERA_ENV || {};
  var FB_CFG = ENV.FIREBASE_CONFIG || {};

  window.LENTERA_CONFIG = {
    APP_NAME: "Lentera ID",
    APP_TAGLINE: "Ruang belajar kuliah dan Arena Game",

    MAX_REQUESTS_PER_HOUR: 40,
    ANOMALY_THRESHOLD: 25,

    MAX_PLAYERS_LIMIT: 50,
    MIN_STAGES: 3,
    MAX_STAGES: 10,
    SKILL_COOLDOWN_SEC: 15,
    ROOM_TTL_MS: 6 * 60 * 60 * 1000,
    HEARTBEAT_INTERVAL_MS: 15000,
    ONLINE_TIMEOUT_MS: 45000,
    SCORE_WRITE_THROTTLE_MS: 2500,
    CACHE_TTL_MS: 300000,
    ADMIN_SESSION_TIMEOUT_MS: 1800000,

    ENGINE_PROXY_URL: String(ENV.ENGINE_PROXY_URL || "").trim(),
    LOCAL_GEMINI_API_KEY: String(ENV.LOCAL_GEMINI_API_KEY || ENV.GEMINI_API_KEY || "").trim(),

    ADMIN_EMAILS: [
      "ultimatecoding2@gmail.com",
      "maaaziz5050@gmail.com",
      "allxzy06@gmail.com"
    ],

    ENGINE_MODELS: [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-3.0-flash",
      "gemini-3-flash-preview",
      "gemini-flash-latest"
    ],

    FIREBASE_CONFIG: {
      apiKey: FB_CFG.apiKey || "",
      authDomain: FB_CFG.authDomain || "",
      databaseURL: FB_CFG.databaseURL || "",
      projectId: FB_CFG.projectId || "",
      storageBucket: FB_CFG.storageBucket || "",
      messagingSenderId: FB_CFG.messagingSenderId || "",
      appId: FB_CFG.appId || "",
      measurementId: FB_CFG.measurementId || ""
    },

    TEAM: [
      {
        name: "Ahmad Shohibul Ulum",
        role: "Pengembang",
        initials: "AU",
        photo: "assets/img/dev-ulum.jpg",
        githubUrl: "https://github.com/USERNAME-ISI-SENDIRI"
      },
      {
        name: "Muhammad Mis'al Maulana",
        role: "UI & Ilustrasi",
        initials: "MM",
        photo: "assets/img/dev-misal.jpg",
        githubUrl: "https://github.com/USERNAME-ISI-SENDIRI"
      },
      {
        name: "Muhammad Abdul Aziz",
        role: "Penulis",
        initials: "MA",
        photo: "assets/img/dev-aziz.jpg",
        githubUrl: "https://github.com/USERNAME-ISI-SENDIRI"
      }
    ],

    // 9 Karakter dengan ikon pixel art & skill serangan unik
    CHARACTERS: [
      {
        id: "ermus", // BERUBAH DARI ermus
        name: "Ermus", // BERUBAH DARI Ermus
        primary: "#5C5E3E",
        accent: "#E6B43C",
        price: 150,
        isPixel: true,
        avatar: "assets/img/sprites/ermus-avatar.png",
        skillId: "maniburst",
        skillName: "Mani Burst",
        skillDesc: "Semburan cairan kental meluncur deras, mendorong mundur dan membuat langkah lawan lengket selama 2,5 detik."
      },
      {
        id: "pocong",
        name: "Pocong",
        primary: "#E6E2D8",
        accent: "#6B7278",
        price: 0,
        avatar: "assets/img/sprites/pocong-avatar.png",
        skillId: "hop",
        skillName: "Lompatan Mistis",
        skillDesc: "Gelombang aura kain putih menjalar di tanah membuat lawan melompat tak terkendali selama 2,5 detik."
      },
      {
        id: "kuntilanak",
        name: "Kuntilanak",
        primary: "#DCE2E6",
        accent: "#3A2C46",
        price: 0,
        avatar: "assets/img/sprites/kuntilanak-avatar.png",
        skillId: "confuse",
        skillName: "Tawa Cekikikan",
        skillDesc: "Gelombang suara tawa membalik arah kontrol kiri dan kanan lawan selama 3 detik."
      },
      {
        id: "pikachu",
        name: "Pikachu",
        primary: "#F2C94C",
        accent: "#D9483B",
        price: 200,
        avatar: "assets/img/sprites/pikachu-avatar.png",
        skillId: "shock",
        skillName: "Thunderbolt",
        skillDesc: "Sambaran petir zig-zag melumpuhkan lawan di tempat selama 2,2 detik."
      },
      {
        id: "catwoman",
        name: "Catwoman",
        primary: "#2C2E35",
        accent: "#9B6BB0",
        price: 280,
        avatar: "assets/img/sprites/catwoman-avatar.png",
        skillId: "whip",
        skillName: "Cambuk Kucing",
        skillDesc: "Lecutan cambuk menarik lawan mundur sekaligus mengambil 40 poin."
      },
      {
        id: "wonderwoman",
        name: "Wonder Woman",
        primary: "#B83B3B",
        accent: "#E3B23C",
        price: 350,
        avatar: "assets/img/sprites/wonderwoman-avatar.png",
        skillId: "lasso",
        skillName: "Lasso of Truth",
        skillDesc: "Tali emas bercahaya mengikat lawan hingga tak bisa bergerak selama 2,5 detik."
      },
      {
        id: "hulk",
        name: "Hulk",
        primary: "#438A47",
        accent: "#6E4B8C",
        price: 420,
        avatar: "assets/img/sprites/hulk-avatar.png",
        skillId: "smash",
        skillName: "Hulk Smash",
        skillDesc: "Hentakan tanah area luas mementalkan semua pemain di sekitar ke udara."
      },
      {
        id: "godzilla",
        name: "Godzilla",
        primary: "#3D5A52",
        accent: "#4EC5F1",
        price: 520,
        avatar: "assets/img/sprites/godzilla-avatar.png",
        skillId: "atomic",
        skillName: "Atomic Breath",
        skillDesc: "Semburan sinar plasma biru jarak jauh mementalkan mundur dan membuat lawan tergelincir."
      },
      {
        id: "thanos",
        name: "Thanos",
        primary: "#6E4B8C",
        accent: "#E6B43C",
        price: 650,
        avatar: "assets/img/sprites/thanos-avatar.png",
        skillId: "snap",
        skillName: "Infinity Snap",
        skillDesc: "Jentikan jari menyusutkan lawan menjadi mini dan melambat 50% selama 3,5 detik."
      }
    ],

    SYSTEM_PROMPT: [
      "Kamu adalah Lentera, asisten belajar berbasis AI di platform Lentera ID.",
      "Fokus utamamu adalah mendampingi mahasiswa mempelajari Bahasa Indonesia sesuai EYD V dan KBBI serta tujuh mata kuliah lintas ilmu: Kalkulus, Fisika Teknik, Agama Islam, Logika Informatika, Pemrograman Dasar Informatika, Pancasila, dan Bahasa Inggris.",
      "Panduan komunikasi:",
      "- Balas dalam bahasa yang digunakan pengguna. Saat memakai Bahasa Indonesia, gunakan bahasa baku yang lugas, runtut, dan natural.",
      "- Jika ditanya apakah kamu AI, jawab secara jujur bahwa kamu adalah asisten belajar berbasis AI bernama Lentera.",
      "- Jawab cepat, padat, dan langsung ke inti materi; ikuti penjelasan ringkas serta contoh atau rumus seperlunya tanpa bertele-tele.",
      "- Gunakan notasi matematika yang mudah dibaca serta blok kode untuk pemrograman.",
      "- Jangan mengarang fakta, ayat, hadis, atau rumus; sampaikan batasannya secara jujur jika tidak dapat dipastikan."
    ].join("\n")
  };
})();

window.LenteraAuthStorage = (function () {
  var CHAR_KEY = "lenteraid_selected_char_v6";
  var USERNAME_KEY = "lenteraid_mabar_username_v6";
  var ROSTER_KEY = "lenteraid_roster_v6";
  var SESSION_CACHE_KEY = "lenteraid_cached_session_v7";

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  return {
    getSelectedCharacter: function () {
      try { return localStorage.getItem(CHAR_KEY) || "ermus"; } catch (e) { return "ermus"; }
    },
    setSelectedCharacter: function (charId) {
      try { localStorage.setItem(CHAR_KEY, charId); } catch (e) {}
    },
    getMabarUsername: function () {
      try { return localStorage.getItem(USERNAME_KEY) || ""; } catch (e) { return ""; }
    },
    setMabarUsername: function (name) {
      try { localStorage.setItem(USERNAME_KEY, String(name || "").trim().slice(0, 24)); } catch (e) {}
    },
    getLocalRoster: function () {
      return safeParse(localStorage.getItem(ROSTER_KEY), {
        coins: 0,
        unlockedCharacters: ["ermus", "pocong"]
      });
    },
    saveLocalRoster: function (data) {
      try { localStorage.setItem(ROSTER_KEY, JSON.stringify(data)); } catch (e) {}
    },
    getCachedSession: function () {
      try { return safeParse(localStorage.getItem(SESSION_CACHE_KEY), null); } catch (e) { return null; }
    },
    setCachedSession: function (userObj) {
      if (!userObj || !userObj.uid) return;
      try {
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
          uid: userObj.uid,
          email: userObj.email || "",
          name: userObj.name || "Pengguna",
          photoURL: userObj.photoURL || "",
          requests: Number(userObj.requests || 0),
          bestQuizScore: Number(userObj.bestQuizScore || 0),
          coins: Number(userObj.coins || 0),
          unlockedCharacters: Array.isArray(userObj.unlockedCharacters) ? userObj.unlockedCharacters : ["ermus", "pocong"],
          isBlocked: Boolean(userObj.isBlocked),
          blockReason: userObj.blockReason || ""
        }));
      } catch (e) {}
    },
    clearCachedSession: function () {
      try { localStorage.removeItem(SESSION_CACHE_KEY); } catch (e) {}
    },
    getLocalHourlyQuota: function (uid) {
      var bucket = Math.floor(Date.now() / 3600000);
      var key = "lenteraid_quota_" + String(uid || "anon");
      var saved = safeParse(localStorage.getItem(key), { bucket: bucket, used: 0 });
      if (saved.bucket !== bucket) return { bucket: bucket, used: 0 };
      return { bucket: bucket, used: Math.max(0, Number(saved.used) || 0) };
    },
    setLocalHourlyQuota: function (uid, used) {
      var bucket = Math.floor(Date.now() / 3600000);
      var key = "lenteraid_quota_" + String(uid || "anon");
      try {
        localStorage.setItem(key, JSON.stringify({ bucket: bucket, used: Math.max(0, Math.floor(Number(used) || 0)) }));
      } catch (e) {}
      return { bucket: bucket, used: Math.max(0, Math.floor(Number(used) || 0)) };
    }
  };
})();

window.LenteraStore = (function () {
  var CHATS_PREFIX = "lenteraid_chats_v6_";
  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  return {
    getChatSessions: function (userKey) {
      try { return safeParse(localStorage.getItem(CHATS_PREFIX + userKey), []); } catch (e) { return []; }
    },
    saveChatSessions: function (userKey, sessions) {
      try { localStorage.setItem(CHATS_PREFIX + userKey, JSON.stringify(sessions.slice(0, 30))); } catch (e) {}
    }
  };
})();
