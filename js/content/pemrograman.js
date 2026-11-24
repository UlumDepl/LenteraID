/**
 * Bank Soal Lokal: Pemrograman Dasar Informatika
 * Total butir tervalidasi: 32
 */
window.LenteraContentBanks = window.LenteraContentBanks || {};
window.LenteraContentBanks["pemrograman"] = {
  "id": "pemrograman",
  "name": "Pemrograman Dasar Informatika",
  "note": "Algoritma, struktur data dasar, kompleksitas, dan sintaks umum.",
  "items": [
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Indeks elemen pertama pada larik (array) di bahasa C, Java, JavaScript, dan Python dimulai dari...",
      "options": [
        "0",
        "1",
        "-1",
        "2"
      ],
      "answer": 0,
      "explanation": "Bahasa pemrograman modern umumnya memakai zero-based indexing."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Tipe data yang hanya menyimpan nilai `true` atau `false` adalah...",
      "options": [
        "Boolean",
        "Integer",
        "String",
        "Float"
      ],
      "answer": 0,
      "explanation": "Boolean dipakai untuk kondisi logika benar atau salah."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Struktur kontrol yang mengulang blok kode selama syarat bernilai benar adalah...",
      "options": [
        "`while`",
        "`if-else`",
        "`switch`",
        "`return`"
      ],
      "answer": 0,
      "explanation": "Perulangan `while` berjalan berulang kali selama ekspresi kondisinya benar."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Apa hasil dari operasi modulo `17 % 5`?",
      "options": [
        "2",
        "3",
        "4",
        "1"
      ],
      "answer": 0,
      "explanation": "17 dibagi 5 sama dengan 3 sisa 2, sehingga `17 % 5 = 2`."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Struktur data Stack (tumpukan) bekerja dengan prinsip...",
      "options": [
        "LIFO (Last In, First Out)",
        "FIFO (First In, First Out)",
        "Random Access",
        "Priority Only"
      ],
      "answer": 0,
      "explanation": "Elemen terakhir yang masuk ke stack adalah elemen pertama yang keluar."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Kompleksitas waktu pencarian biner (binary search) pada larik terurut berukuran n adalah...",
      "options": [
        "O(log n)",
        "O(1)",
        "O(n)",
        "O(n\u00b2)"
      ],
      "answer": 0,
      "explanation": "Binary search membelah ruang pencarian menjadi dua pada tiap iterasi."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Fungsi yang memanggil dirinya sendiri hingga mencapai kondisi dasar (base case) disebut...",
      "options": [
        "Rekursi",
        "Iterasi",
        "Polimorfisme",
        "Enkapsulasi"
      ],
      "answer": 0,
      "explanation": "Rekursi memecah masalah besar menjadi submasalah serupa sampai menyentuh base case."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Perhatikan potongan kode: `let x = 3; x += 4;`. Nilai `x` sekarang adalah...",
      "options": [
        "7",
        "12",
        "34",
        "4"
      ],
      "answer": 0,
      "explanation": "Operator `+=` menambahkan 4 ke nilai awal `x` (3 + 4 = 7)."
    },
    {
      "type": "mcq",
      "difficulty": "sulit",
      "prompt": "Jika sebuah fungsi rekursif tidak memiliki kondisi berhenti (base case), yang terjadi adalah...",
      "options": [
        "Stack overflow (infinite recursion)",
        "Program otomatis berhenti di iterasi ke-10",
        "Nilai otomatis menjadi 0",
        "Kompilator menghapus fungsi"
      ],
      "answer": 0,
      "explanation": "Pemanggilan tanpa henti menghabiskan memori call stack hingga terjadi stack overflow."
    },
    {
      "type": "mcq",
      "difficulty": "sulit",
      "prompt": "Kompleksitas waktu rata-rata untuk mengakses elemen ke-i pada larik (`arr[i]`) adalah...",
      "options": [
        "O(1)",
        "O(log n)",
        "O(n)",
        "O(n log n)"
      ],
      "answer": 0,
      "explanation": "Alamat memori elemen larik dihitung langsung dari indeksnya dalam waktu konstan O(1)."
    },
    {
      "type": "tf",
      "difficulty": "mudah",
      "prompt": "Struktur data Queue (antrean) bekerja dengan prinsip FIFO (First In, First Out).",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 0,
      "explanation": "Elemen pertama yang masuk antrean akan dilayani/keluar pertama kali."
    },
    {
      "type": "tf",
      "difficulty": "mudah",
      "prompt": "Operator `==` dan `=` memiliki fungsi yang sama persis di bahasa C dan JavaScript.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 1,
      "explanation": "`=` adalah operator penugasan (assignment), sedangkan `==` adalah operator perbandingan."
    },
    {
      "type": "tf",
      "difficulty": "sedang",
      "prompt": "Binary search dapat langsung digunakan pada larik yang belum diurutkan.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 1,
      "explanation": "Syarat mutlak binary search adalah data harus dalam keadaan terurut."
    },
    {
      "type": "chain",
      "difficulty": "mudah",
      "prompt": "Sambung istilah pemrograman (huruf akhir 'G'): 'STRING' \u2192 'GLOBAL' \u2192 (huruf akhir 'L') ...",
      "options": [
        "Loop",
        "Array",
        "Class",
        "Float"
      ],
      "answer": 0,
      "explanation": "'Loop' diawali huruf 'L' dan berarti perulangan kode."
    },
    {
      "type": "arrange",
      "difficulty": "mudah",
      "prompt": "Urutkan baris kode untuk menukar nilai variabel `a` dan `b`:",
      "steps": [
        "let temp = a;",
        "a = b;",
        "b = temp;",
        "console.log(a, b);"
      ],
      "explanation": "Variabel sementara `temp` mencegah nilai `a` hilang sebelum dipindahkan ke `b`."
    },
    {
      "type": "arrange",
      "difficulty": "sedang",
      "prompt": "Urutkan tahapan dasar membangun program yang baik:",
      "steps": [
        "Analisis masalah",
        "Rancang algoritma",
        "Tulis kode program",
        "Uji dan perbaiki bug"
      ],
      "explanation": "Merancang algoritma lebih dulu mengurangi kesalahan logika saat implementasi."
    },
    {
      "type": "guess",
      "difficulty": "mudah",
      "prompt": "Singkatan prinsip kerja struktur data antrean (Queue) dalam 4 huruf:",
      "answerText": "fifo",
      "hint": "4 huruf, diawali \"F\"",
      "explanation": "FIFO = First In, First Out."
    },
    {
      "type": "guess",
      "difficulty": "sedang",
      "prompt": "Kesalahan atau cacat pada logika kode program biasa disebut...",
      "answerText": "bug",
      "hint": "3 huruf, diawali \"B\" dan diakhiri \"G\"",
      "explanation": "Bug adalah galat yang membuat program berperilaku di luar rencana."
    },
    {
      "type": "diagram",
      "difficulty": "mudah",
      "diagramId": "prog-decision",
      "prompt": "Pada diagram alir (flowchart) di atas, simbol berbentuk belah ketupat digunakan untuk menyatakan...",
      "options": [
        "Keputusan / percabangan kondisi",
        "Proses perhitungan",
        "Input / Output data",
        "Mulai atau selesai"
      ],
      "answer": 0,
      "explanation": "Simbol belah ketupat (diamond) merepresentasikan percabangan kondisi (Ya/Tidak)."
    },
    {
      "type": "diagram",
      "difficulty": "sedang",
      "diagramId": "prog-stack",
      "prompt": "Perhatikan ilustrasi tumpukan di atas. Jika dilakukan operasi `pop()`, elemen mana yang keluar lebih dulu?",
      "options": [
        "C (paling atas)",
        "A (paling bawah)",
        "B (tengah)",
        "Semua keluar bersamaan"
      ],
      "answer": 0,
      "explanation": "Stack mengikuti prinsip LIFO sehingga elemen teratas (C) keluar pertama."
    },
    {
      "type": "match",
      "difficulty": "mudah",
      "prompt": "Pasangkan tipe data dengan contoh nilainya:",
      "pairs": [
        [
          "Integer",
          "42"
        ],
        [
          "String",
          "\"Halo\""
        ],
        [
          "Boolean",
          "true"
        ]
      ],
      "explanation": "Integer untuk bilangan bulat, String untuk teks, Boolean untuk nilai kebenaran."
    },
    {
      "type": "match",
      "difficulty": "sedang",
      "prompt": "Pasangkan konsep pemrograman dengan fungsinya:",
      "pairs": [
        [
          "`for`",
          "Perulangan terhitung"
        ],
        [
          "`if`",
          "Percabangan syarat"
        ],
        [
          "`return`",
          "Mengembalikan nilai fungsi"
        ]
      ],
      "explanation": "Tiga kata kunci inti dalam hampir semua bahasa pemrograman."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Simbol komentar satu baris pada bahasa JavaScript, C, dan Java adalah...",
      "options": [
        "`//`",
        "`##`",
        "`--`",
        "`%%`"
      ],
      "answer": 0,
      "explanation": "Tanda `//` menandai komentar satu baris hingga akhir baris."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Perintah dasar untuk menampilkan teks ke konsol di JavaScript adalah...",
      "options": [
        "`console.log()`",
        "`print.line()`",
        "`echo.out()`",
        "`show.text()`"
      ],
      "answer": 0,
      "explanation": "`console.log()` digunakan untuk mencetak keluaran ke konsol."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Pada Python, kata kunci untuk mendefinisikan fungsi adalah...",
      "options": [
        "`def`",
        "`func`",
        "`function`",
        "`define`"
      ],
      "answer": 0,
      "explanation": "Python menggunakan kata kunci `def` diikuti nama fungsi."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Apa hasil dari ekspresi boolean `true && false`?",
      "options": [
        "`false`",
        "`true`",
        "`null`",
        "`0`"
      ],
      "answer": 0,
      "explanation": "Operator logika AND menghasilkan `false` bila salah satu sisi bernilai `false`."
    },
    {
      "type": "mcq",
      "difficulty": "sulit",
      "prompt": "Kompleksitas waktu pencarian linear pada larik tak terurut berukuran n di kasus terburuk adalah...",
      "options": [
        "O(n)",
        "O(1)",
        "O(log n)",
        "O(n\u00b2)"
      ],
      "answer": 0,
      "explanation": "Pada kasus terburuk seluruh n elemen harus diperiksa satu per satu."
    },
    {
      "type": "tf",
      "difficulty": "mudah",
      "prompt": "Variabel yang dideklarasikan dengan `const` di JavaScript tidak dapat di-reassign nilainya.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 0,
      "explanation": "`const` mengikat referensi variabel agar tidak ditimpa ulang."
    },
    {
      "type": "tf",
      "difficulty": "sedang",
      "prompt": "HTML merupakan bahasa pemrograman bertipe kompilasi seperti C++.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 1,
      "explanation": "HTML adalah bahasa markah untuk menyusun struktur halaman web."
    },
    {
      "type": "chain",
      "difficulty": "mudah",
      "prompt": "Sambung istilah informatika berawalan huruf akhir 'E': 'NODE' \u2192 ...",
      "options": [
        "Error",
        "Array",
        "Stack",
        "Index"
      ],
      "answer": 0,
      "explanation": "'Error' diawali huruf 'E' dan menandakan kesalahan eksekusi atau sintaks."
    },
    {
      "type": "guess",
      "difficulty": "mudah",
      "prompt": "Singkatan prinsip kerja struktur data Stack dalam 4 huruf:",
      "answerText": "lifo",
      "hint": "4 huruf, diawali L",
      "explanation": "LIFO adalah singkatan dari Last In, First Out."
    },
    {
      "type": "match",
      "difficulty": "sedang",
      "prompt": "Pasangkan teknologi web dengan perannya:",
      "pairs": [
        [
          "HTML",
          "Struktur halaman"
        ],
        [
          "CSS",
          "Tata letak dan gaya"
        ],
        [
          "JavaScript",
          "Interaksi dan logika"
        ]
      ],
      "explanation": "Tiga teknologi inti pengembangan antarmuka web."
    }
  ]
};
