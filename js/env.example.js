/**
 * Template Konfigurasi Lingkungan Lentera ID
 * Salin berkas ini menjadi js/env.js untuk penggunaan lokal.
 * Berkas js/env.js masuk .gitignore sehingga tidak ikut terunggah ke GitHub.
 */
window.LENTERA_ENV = {
  // Alamat Cloudflare Worker setelah deploy (untuk produksi / GitHub Pages)
  ENGINE_PROXY_URL: "",

  // Khusus uji coba di localhost (diabaikan otomatis saat online di GitHub Pages)
  LOCAL_GEMINI_API_KEY: "",

  FIREBASE_CONFIG: {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
  }
};
