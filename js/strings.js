/**
 * Pusat Teks Antarmuka Lentera ID
 */
window.LENTERA_STRINGS = {
  appName: "Lentera ID",
  tagline: "Ruang belajar kuliah dan Arena Game",

  login: {
    title: "Masuk ke Lentera ID",
    subtitle: "Gunakan akun Google untuk berdiskusi materi kuliah, mengumpulkan koin karakter, dan bermain di Arena Game.",
    googleBtn: "Masuk dengan Google",
    rememberLabel: "Tetap masuk di perangkat ini",
    fileProtocolError: "Masuk dengan Google memerlukan alamat web HTTP atau HTTPS.",
    firebaseUnavailable: "Konfigurasi Firebase belum tersedia atau koneksi terputus.",
    success: "Berhasil masuk."
  },

  nav: {
    chat: "Obrolan Belajar",
    game: "Arena Game",
    copyright: "Hak Cipta & Tim",
    newChat: "Obrolan Baru",
    logout: "Keluar"
  },

  views: {
    chatTitle: "Lentera",
    chatSubtitle: "Asisten belajar Bahasa Indonesia dan mata kuliah lintas ilmu.",
    gameTitle: "Arena Game",
    gameSubtitle: "Pilih materi, pilih permainan, lalu mulai Solo atau bersama teman.",
    copyrightTitle: "Hak Cipta & Tim",
    copyrightSubtitle: "Universitas Muhadi Setiabudi Brebes"
  },

  chat: {
    welcomeTitle: "Mulai Diskusi Materi",
    welcomeDesc: "Pilih mata kuliah di atas, tulis pertanyaanmu, lalu uji pemahaman langsung di Arena Game.",
    placeholder: "Tulis pertanyaan materi...",
    sendBtn: "Kirim",
    playFromChatBtn: "Latihan dari materi ini",
    emptyHistory: "Belum ada riwayat obrolan.",
    quotaReached: "Batas kuota pesan per jam telah tercapai. Silakan coba lagi pada jam berikutnya.",
    blockedFallback: "Akun Anda sedang dibatasi oleh administrator.",
    serverNotConfigured: "Peladen obrolan belum terhubung. Untuk uji lokal, isi LOCAL_GEMINI_API_KEY di js/env.js, atau deploy Cloudflare Worker dan isi ENGINE_PROXY_URL.",
    needGoogle: "Masuk dengan akun Google diperlukan untuk mengirim pesan."
  },

  moderator: {
    kickedNotice: "Anda dikeluarkan dari ruang Arena Game oleh Moderator."
  }
};
