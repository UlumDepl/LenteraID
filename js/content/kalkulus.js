/**
 * Bank Soal Lokal: Kalkulus
 * Total butir tervalidasi: 32
 */
window.LenteraContentBanks = window.LenteraContentBanks || {};
window.LenteraContentBanks["kalkulus"] = {
  "id": "kalkulus",
  "name": "Kalkulus",
  "note": "Menggunakan notasi LaTeX untuk KaTeX.",
  "items": [
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Turunan pertama dari f(x) = 3x\u00b2 + 5x - 2 adalah...",
      "options": [
        "6x + 5",
        "3x + 5",
        "6x - 2",
        "6x\u00b2 + 5"
      ],
      "answer": 0,
      "explanation": "Dengan aturan pangkat d/dx(x\u207f) = nx^n-1, diperoleh f'(x) = 6x + 5."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Nilai dari lim (x \u2192 2) (x\u00b2 - 4)/(x - 2) adalah...",
      "options": [
        "0",
        "2",
        "4",
        "8"
      ],
      "answer": 2,
      "explanation": "Faktorkan pembilang menjadi (x-2)(x+2), coret (x-2), lalu substitusi x = 2 sehingga hasilnya 4."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Integral tak tentu dari \u222b 4x\u00b3 dx adalah...",
      "options": [
        "x\u2074 + C",
        "12x\u00b2 + C",
        "4x\u2074 + C",
        "x\u00b3 + C"
      ],
      "answer": 0,
      "explanation": "\u222b 4x\u00b3 dx = 4 \u00b7 (x\u2074)/(4) + C = x\u2074 + C."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Turunan pertama dari f(x) = sin(x) adalah...",
      "options": [
        "-cos(x)",
        "cos(x)",
        "tan(x)",
        "-sin(x)"
      ],
      "answer": 1,
      "explanation": "Turunan fungsi sinus terhadap x adalah cos(x)."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Turunan pertama dari f(x) = cos(x) adalah...",
      "options": [
        "sin(x)",
        "-sin(x)",
        "cos(x)",
        "-cos(x)"
      ],
      "answer": 1,
      "explanation": "Turunan fungsi kosinus terhadap x adalah -sin(x)."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Nilai integral tentu \u222b[0..2] 3x\u00b2 dx adalah...",
      "options": [
        "4",
        "6",
        "8",
        "12"
      ],
      "answer": 2,
      "explanation": "[x\u00b3][0..2] = 2\u00b3 - 0\u00b3 = 8."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Turunan dari f(x) = e^(2x) menggunakan aturan rantai adalah...",
      "options": [
        "e^(2x)",
        "2e^(2x)",
        "2xe^(2x)",
        "e^x"
      ],
      "answer": 1,
      "explanation": "Menurut aturan rantai, d/dx(e^(2x)) = e^(2x) \u00b7 2 = 2e^(2x)."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Turunan dari f(x) = ln(x) untuk x > 0 adalah...",
      "options": [
        "1/x",
        "ln(x)",
        "x",
        "e^x"
      ],
      "answer": 0,
      "explanation": "Turunan logaritma natural ln(x) adalah 1/x."
    },
    {
      "type": "mcq",
      "difficulty": "sulit",
      "prompt": "Jika f(x) = x\u00b3 - 3x, titik stasioner (f'(x) = 0) terjadi pada...",
      "options": [
        "x = 1 dan x = -1",
        "x = 0 dan x = 3",
        "x = 3 dan x = -3",
        "x = 0 saja"
      ],
      "answer": 0,
      "explanation": "f'(x) = 3x\u00b2 - 3 = 0 \u21d2 x\u00b2 = 1 \u21d2 x = \u00b1 1."
    },
    {
      "type": "mcq",
      "difficulty": "sulit",
      "prompt": "Nilai dari lim (x \u2192 0) (sin(x))/(x) (dengan x dalam radian) adalah...",
      "options": [
        "0",
        "1",
        "\u221e",
        "-1"
      ],
      "answer": 1,
      "explanation": "Ini merupakan limit trigonometri fundamental yang bernilai 1."
    },
    {
      "type": "tf",
      "difficulty": "mudah",
      "prompt": "Turunan dari setiap fungsi konstan f(x) = c selalu sama dengan 0.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 0,
      "explanation": "Laju perubahan suatu konstanta selalu nol."
    },
    {
      "type": "tf",
      "difficulty": "sedang",
      "prompt": "Jika suatu fungsi terdiferensialkan di x = a, maka fungsi tersebut pasti kontinu di x = a.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 0,
      "explanation": "Teorema diferensiabilitas menjamin kekontinuan di titik tersebut."
    },
    {
      "type": "tf",
      "difficulty": "sulit",
      "prompt": "Setiap fungsi yang kontinu di x = a pasti terdiferensialkan di x = a.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 1,
      "explanation": "Salah; contoh penyangkalnya adalah f(x) = |x| yang kontinu di x = 0 tetapi tidak terdiferensialkan di sana."
    },
    {
      "type": "chain",
      "difficulty": "sedang",
      "prompt": "Sambung istilah kalkulus (huruf akhir 'T'): 'LIMIT' \u2192 ...",
      "options": [
        "Turunan",
        "Integral",
        "Fungsi",
        "Kurva"
      ],
      "answer": 0,
      "explanation": "Turunan didefinisikan melalui limit hasil bagi selisih dan diawali huruf 'T'."
    },
    {
      "type": "arrange",
      "difficulty": "mudah",
      "prompt": "Urutkan langkah menghitung lim (x \u2192 3) (x\u00b2 - 9)/(x - 3):",
      "steps": [
        "Uji substitusi langsung (bentuk 0/0)",
        "Faktorkan pembilang menjadi (x-3)(x+3)",
        "Sederhanakan faktor (x-3)",
        "Substitusi x = 3 sehingga hasil = 6"
      ],
      "explanation": "Bentuk tak tentu 0/0 diatasi dengan pemfaktoran sebelum substitusi."
    },
    {
      "type": "arrange",
      "difficulty": "sedang",
      "prompt": "Urutkan langkah menentukan nilai maksimum lokal f(x):",
      "steps": [
        "Hitung turunan pertama f'(x)",
        "Cari titik kritis saat f'(x) = 0",
        "Hitung turunan kedua f''(x)",
        "Simpulkan maksimum lokal bila f''(x) < 0"
      ],
      "explanation": "Uji turunan kedua menentukan kecekungan kurva di titik stasioner."
    },
    {
      "type": "guess",
      "difficulty": "mudah",
      "prompt": "Nilai turunan pertama dari f(x) = 7x adalah angka...",
      "answerText": "7",
      "hint": "Satu angka positif",
      "explanation": "Turunan dari ax terhadap x adalah a, yakni 7."
    },
    {
      "type": "guess",
      "difficulty": "sedang",
      "prompt": "Operasi kebalikan dari diferensiasi (turunan) disebut...",
      "answerText": "integral",
      "hint": "8 huruf, diawali \"I\" dan diakhiri \"L\"",
      "explanation": "Integral (antiturunan) merupakan kebalikan dari turunan menurut Teorema Dasar Kalkulus."
    },
    {
      "type": "diagram",
      "difficulty": "mudah",
      "diagramId": "calc-parabola",
      "prompt": "Lihat grafik parabola f(x) = x\u00b2 di atas. Berapakah gradien garis singgung (f'(x)) tepat di titik puncak (0,0)?",
      "options": [
        "0",
        "1",
        "2",
        "-1"
      ],
      "answer": 0,
      "explanation": "Di titik puncak kurva, garis singgung mendatar sehingga f'(0) = 2(0) = 0."
    },
    {
      "type": "diagram",
      "difficulty": "sedang",
      "diagramId": "calc-area",
      "prompt": "Area yang diarsir di bawah kurva dari x = a sampai x = b pada diagram di atas direpresentasikan oleh...",
      "options": [
        "\u222b[a..b] f(x) dx",
        "f'(b) - f'(a)",
        "lim (x \u2192 a) f(x)",
        "(f(b))/(f(a))"
      ],
      "answer": 0,
      "explanation": "Integral tentu \u222b_a^b f(x) dx menyatakan luas bertanda di bawah kurva f(x)."
    },
    {
      "type": "match",
      "difficulty": "mudah",
      "prompt": "Pasangkan fungsi dengan turunannya:",
      "pairs": [
        [
          "x\u00b2",
          "2x"
        ],
        [
          "sin(x)",
          "cos(x)"
        ],
        [
          "e^x",
          "e^x"
        ]
      ],
      "explanation": "Ketiganya merupakan aturan dasar turunan kalkulus."
    },
    {
      "type": "match",
      "difficulty": "sedang",
      "prompt": "Pasangkan konsep kalkulus dengan maknanya:",
      "pairs": [
        [
          "Turunan",
          "Laju perubahan sesaat"
        ],
        [
          "Integral tentu",
          "Luas di bawah kurva"
        ],
        [
          "Limit",
          "Nilai pendekatan fungsi"
        ]
      ],
      "explanation": "Limit, turunan, dan integral adalah tiga pilar utama kalkulus."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Turunan pertama dari f(x) = 5x\u00b3 adalah...",
      "options": [
        "15x\u00b2",
        "5x\u00b2",
        "15x\u00b3",
        "8x\u00b2"
      ],
      "answer": 0,
      "explanation": "d/dx(5x\u00b3) = 5 \u00b7 3x\u00b2 = 15x\u00b2."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Integral tak tentu dari \u222b 2x dx adalah...",
      "options": [
        "x\u00b2 + C",
        "2x\u00b2 + C",
        "2 + C",
        "x + C"
      ],
      "answer": 0,
      "explanation": "\u222b 2x dx = 2 \u00b7 (x\u00b2)/(2) + C = x\u00b2 + C."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Nilai dari lim (x \u2192 5) (2x + 3) adalah...",
      "options": [
        "13",
        "10",
        "8",
        "15"
      ],
      "answer": 0,
      "explanation": "Fungsi polinomial kontinu di mana-mana, sehingga substitusi langsung memberi 2(5) + 3 = 13."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Jika f(x) = x\u2074, maka turunan keduanya f''(x) adalah...",
      "options": [
        "12x\u00b2",
        "4x\u00b3",
        "12x\u00b3",
        "24x"
      ],
      "answer": 0,
      "explanation": "f'(x) = 4x\u00b3, kemudian diturunkan lagi menghasilkan f''(x) = 12x\u00b2."
    },
    {
      "type": "mcq",
      "difficulty": "sulit",
      "prompt": "Integral tentu \u222b[1..3] 2x dx bernilai...",
      "options": [
        "8",
        "6",
        "9",
        "4"
      ],
      "answer": 0,
      "explanation": "[x\u00b2][1..3] = 3\u00b2 - 1\u00b2 = 9 - 1 = 8."
    },
    {
      "type": "tf",
      "difficulty": "mudah",
      "prompt": "Turunan fungsi f(x) = x terhadap x adalah 1.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 0,
      "explanation": "Dengan aturan pangkat, d/dx(x^1) = 1 \u00b7 x^0 = 1."
    },
    {
      "type": "tf",
      "difficulty": "sedang",
      "prompt": "Integral tak tentu selalu memuat konstanta integrasi C.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 0,
      "explanation": "Semua fungsi yang berselisih konstanta memiliki turunan yang sama."
    },
    {
      "type": "chain",
      "difficulty": "mudah",
      "prompt": "Sambung istilah matematika berawalan huruf akhir 'L': 'INTEGRAL' \u2192 ...",
      "options": [
        "Limit",
        "Fungsi",
        "Gradien",
        "Deret"
      ],
      "answer": 0,
      "explanation": "'Limit' diawali huruf 'L' dan menjadi fondasi definisi kalkulus."
    },
    {
      "type": "guess",
      "difficulty": "mudah",
      "prompt": "Nilai turunan pertama dari f(x) = 9x + 4 adalah angka:",
      "answerText": "9",
      "hint": "Satu digit bilangan bulat",
      "explanation": "Turunan 9x adalah 9 dan turunan konstanta 4 adalah 0."
    },
    {
      "type": "match",
      "difficulty": "sedang",
      "prompt": "Pasangkan integral dengan hasilnya:",
      "pairs": [
        [
          "\u222b 1 dx",
          "x + C"
        ],
        [
          "\u222b cos(x) dx",
          "sin(x) + C"
        ],
        [
          "\u222b e^x dx",
          "e^x + C"
        ]
      ],
      "explanation": "Ketiganya merupakan aturan dasar antiturunan."
    }
  ]
};
