/**
 * Bank Soal Lokal: Logika Informatika
 * Total butir tervalidasi: 32
 */
window.LenteraContentBanks = window.LenteraContentBanks || {};
window.LenteraContentBanks["logika"] = {
  "id": "logika",
  "name": "Logika Informatika",
  "note": "Logika proposisional, tabel kebenaran, ekuivalensi, dan aturan inferensi.",
  "items": [
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Jika P Benar dan Q Salah, nilai kebenaran dari P \u2227 Q (AND) adalah...",
      "options": [
        "Benar",
        "Salah",
        "Tautologi",
        "Tidak terdefinisi"
      ],
      "answer": 1,
      "explanation": "Konjungsi (AND) bernilai Benar hanya jika kedua proposisi bernilai Benar."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Jika P Benar dan Q Salah, nilai kebenaran dari P \u2228 Q (OR) adalah...",
      "options": [
        "Benar",
        "Salah",
        "Kontradiksi",
        "Nol"
      ],
      "answer": 0,
      "explanation": "Disjungsi (OR) bernilai Benar apabila minimal satu proposisi bernilai Benar."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Proposisi majemuk yang selalu bernilai Benar pada semua baris tabel kebenaran disebut...",
      "options": [
        "Tautologi",
        "Kontradiksi",
        "Kontingensi",
        "Negasi"
      ],
      "answer": 0,
      "explanation": "Tautologi selalu bernilai True (T) untuk seluruh kombinasi nilai variabelnya."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Menurut Hukum De Morgan, negasi dari (P \u2228 Q) ekuivalen dengan...",
      "options": [
        "(\u00ac P) \u2227 (\u00ac Q)",
        "(\u00ac P) \u2228 (\u00ac Q)",
        "P \u2227 (\u00ac Q)",
        "\u00ac (P \u2227 Q)"
      ],
      "answer": 0,
      "explanation": "Hukum De Morgan: \u00ac(P \u2228 Q) \u2261 \u00ac P \u2227 \u00ac Q."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Aturan inferensi: dari P \u2192 Q dan P, disimpulkan Q, disebut...",
      "options": [
        "Modus Ponens",
        "Modus Tollens",
        "Silogisme Hipotetis",
        "Simplifikasi"
      ],
      "answer": 0,
      "explanation": "Modus Ponens menarik konsekuen Q jika implikasi dan antesedennya benar."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Aturan inferensi: dari P \u2192 Q dan \u00ac Q, disimpulkan \u00ac P, disebut...",
      "options": [
        "Modus Ponens",
        "Modus Tollens",
        "Adisi",
        "Konjungsi"
      ],
      "answer": 1,
      "explanation": "Modus Tollens menegasi anteseden saat konsekuen bernilai salah."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Banyaknya baris pada tabel kebenaran yang memiliki 4 variabel proposisi adalah...",
      "options": [
        "8",
        "12",
        "16",
        "32"
      ],
      "answer": 2,
      "explanation": "Untuk n variabel, jumlah baris tabel kebenaran adalah 2\u207f = 2\u2074 = 16."
    },
    {
      "type": "mcq",
      "difficulty": "sulit",
      "prompt": "Kontraposisi dari implikasi P \u2192 Q adalah...",
      "options": [
        "Q \u2192 P",
        "\u00ac P \u2192 \u00ac Q",
        "\u00ac Q \u2192 \u00ac P",
        "P \u2227 \u00ac Q"
      ],
      "answer": 2,
      "explanation": "Kontraposisi \u00ac Q \u2192 \u00ac P selalu ekuivalen secara logis dengan P \u2192 Q."
    },
    {
      "type": "mcq",
      "difficulty": "sulit",
      "prompt": "Gerbang logika XOR menghasilkan output 1 apabila kedua inputnya...",
      "options": [
        "Sama-sama 1",
        "Sama-sama 0",
        "Berbeda nilai (satu 1 dan satu 0)",
        "Selalu menghasilkan 1"
      ],
      "answer": 2,
      "explanation": "Exclusive OR (XOR) bernilai benar hanya jika tepat satu input bernilai benar."
    },
    {
      "type": "mcq",
      "difficulty": "sulit",
      "prompt": "Implikasi P \u2192 Q secara logis ekuivalen dengan...",
      "options": [
        "\u00ac P \u2228 Q",
        "P \u2228 \u00ac Q",
        "P \u2227 Q",
        "\u00ac P \u2227 Q"
      ],
      "answer": 0,
      "explanation": "P \u2192 Q \u2261 \u00ac P \u2228 Q adalah kesetaraan fundamental logika proposisi."
    },
    {
      "type": "tf",
      "difficulty": "mudah",
      "prompt": "Implikasi P \u2192 Q bernilai Salah hanya ketika P Benar dan Q Salah.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 0,
      "explanation": "Jika anteseden salah, implikasi tetap bernilai benar (vacuously true)."
    },
    {
      "type": "tf",
      "difficulty": "mudah",
      "prompt": "Biimplikasi P \u2194 Q bernilai Benar jika P dan Q memiliki nilai kebenaran yang sama.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 0,
      "explanation": "P \u2194 Q bernilai T saat keduanya T atau keduanya F."
    },
    {
      "type": "tf",
      "difficulty": "sedang",
      "prompt": "Proposisi P \u2227 \u00ac P merupakan contoh tautologi.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 1,
      "explanation": "P \u2227 \u00ac P selalu bernilai Salah sehingga merupakan kontradiksi."
    },
    {
      "type": "chain",
      "difficulty": "mudah",
      "prompt": "Sambung istilah logika (huruf akhir 'I'): 'PREMIS' \u2192 'SILOGISME' \u2192 (huruf akhir 'E') ...",
      "options": [
        "Ekuivalensi",
        "Konjungsi",
        "Negasi",
        "Implikasi"
      ],
      "answer": 0,
      "explanation": "'Ekuivalensi' diawali huruf 'E' dan berarti kesetaraan nilai kebenaran."
    },
    {
      "type": "arrange",
      "difficulty": "sedang",
      "prompt": "Urutkan langkah memeriksa validitas argumen dengan tabel kebenaran:",
      "steps": [
        "Daftar semua variabel atomik",
        "Buat 2^n baris kombinasi nilai",
        "Hitung nilai setiap premis dan kesimpulan",
        "Cek apakah kesimpulan selalu Benar saat semua premis Benar"
      ],
      "explanation": "Argumen valid bila tidak ada baris dengan semua premis Benar tetapi kesimpulan Salah."
    },
    {
      "type": "arrange",
      "difficulty": "sedang",
      "prompt": "Urutkan alur penarikan kesimpulan Modus Tollens:",
      "steps": [
        "Premis 1: P \u2192 Q",
        "Premis 2: NOT Q",
        "Bentuk kontraposisi: NOT Q \u2192 NOT P",
        "Kesimpulan: NOT P"
      ],
      "explanation": "Kontraposisi menjembatani penarikan kesimpulan NOT P."
    },
    {
      "type": "guess",
      "difficulty": "mudah",
      "prompt": "Proposisi yang selalu bernilai Salah pada setiap baris disebut...",
      "answerText": "kontradiksi",
      "hint": "11 huruf, diawali \"K\" dan diakhiri \"I\"",
      "explanation": "Kontradiksi selalu bernilai False pada setiap kombinasi input."
    },
    {
      "type": "guess",
      "difficulty": "mudah",
      "prompt": "Operator logika yang membalik nilai Benar menjadi Salah disebut...",
      "answerText": "negasi",
      "hint": "6 huruf, diawali \"N\" dan diakhiri \"I\"",
      "explanation": "Negasi (NOT) membalik nilai kebenaran suatu proposisi."
    },
    {
      "type": "diagram",
      "difficulty": "mudah",
      "diagramId": "logic-and",
      "prompt": "Perhatikan simbol gerbang logika di atas. Gerbang berbentuk huruf D tersebut adalah gerbang...",
      "options": [
        "AND",
        "OR",
        "NOT",
        "XOR"
      ],
      "answer": 0,
      "explanation": "Gerbang AND memiliki sisi kiri datar dan sisi kanan melengkung menyerupai huruf D."
    },
    {
      "type": "diagram",
      "difficulty": "sedang",
      "diagramId": "logic-not",
      "prompt": "Perhatikan simbol segitiga dengan lingkaran kecil di ujung pada gambar di atas. Gerbang ini disebut...",
      "options": [
        "NOT (Inverter)",
        "AND",
        "OR",
        "Buffer"
      ],
      "answer": 0,
      "explanation": "Lingkaran kecil (bubble) pada ujung segitiga menandakan operasi inversi (NOT)."
    },
    {
      "type": "match",
      "difficulty": "mudah",
      "prompt": "Pasangkan simbol logika dengan namanya:",
      "pairs": [
        [
          "P \u2227 Q",
          "Konjungsi"
        ],
        [
          "P \u2228 Q",
          "Disjungsi"
        ],
        [
          "\u00ac P",
          "Negasi"
        ]
      ],
      "explanation": "Simbol standar logika proposisional."
    },
    {
      "type": "match",
      "difficulty": "sedang",
      "prompt": "Pasangkan sifat proposisi dengan cirinya:",
      "pairs": [
        [
          "Tautologi",
          "Selalu Benar"
        ],
        [
          "Kontradiksi",
          "Selalu Salah"
        ],
        [
          "Kontingensi",
          "Bisa Benar atau Salah"
        ]
      ],
      "explanation": "Tiga klasifikasi nilai kebenaran proposisi majemuk."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Jika P bernilai Salah, maka negasi \u00ac P bernilai...",
      "options": [
        "Benar",
        "Salah",
        "Tak tentu",
        "Kontradiksi"
      ],
      "answer": 0,
      "explanation": "Negasi selalu membalik nilai kebenaran suatu proposisi."
    },
    {
      "type": "mcq",
      "difficulty": "mudah",
      "prompt": "Banyaknya baris pada tabel kebenaran dengan 3 variabel proposisi adalah...",
      "options": [
        "8",
        "6",
        "9",
        "12"
      ],
      "answer": 0,
      "explanation": "Jumlah baris adalah 2\u00b3 = 8."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Menurut Hukum De Morgan, \u00ac(P \u2227 Q) ekuivalen dengan...",
      "options": [
        "(\u00ac P) \u2228 (\u00ac Q)",
        "(\u00ac P) \u2227 (\u00ac Q)",
        "P \u2228 Q",
        "P \u2227 \u00ac Q"
      ],
      "answer": 0,
      "explanation": "Negasi konjungsi menjadi disjungsi dari masing-masing negasinya."
    },
    {
      "type": "mcq",
      "difficulty": "sedang",
      "prompt": "Konvers dari implikasi P \u2192 Q adalah...",
      "options": [
        "Q \u2192 P",
        "\u00ac P \u2192 \u00ac Q",
        "\u00ac Q \u2192 \u00ac P",
        "P \u2227 Q"
      ],
      "answer": 0,
      "explanation": "Konvers menukar posisi anteseden dan konsekuen menjadi Q \u2192 P."
    },
    {
      "type": "mcq",
      "difficulty": "sulit",
      "prompt": "Invers dari implikasi P \u2192 Q adalah...",
      "options": [
        "\u00ac P \u2192 \u00ac Q",
        "Q \u2192 P",
        "\u00ac Q \u2192 \u00ac P",
        "P \u2228 Q"
      ],
      "answer": 0,
      "explanation": "Invers menegasi kedua sisi implikasi tanpa menukar posisinya."
    },
    {
      "type": "tf",
      "difficulty": "mudah",
      "prompt": "Proposisi P \u2228 \u00ac P selalu bernilai Benar sehingga merupakan tautologi.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 0,
      "explanation": "Ini dikenal sebagai Hukum Penyisihan Jalan Tengah."
    },
    {
      "type": "tf",
      "difficulty": "sedang",
      "prompt": "Operasi konjungsi bersifat komutatif sehingga P \u2227 Q \u2261 Q \u2227 P.",
      "options": [
        "Benar",
        "Salah"
      ],
      "answer": 0,
      "explanation": "Urutan operand pada AND tidak mengubah nilai kebenaran."
    },
    {
      "type": "chain",
      "difficulty": "mudah",
      "prompt": "Sambung istilah logika berawalan huruf akhir 'S': 'MODUS' \u2192 ...",
      "options": [
        "Silogisme",
        "Tautologi",
        "Premis",
        "Negasi"
      ],
      "answer": 0,
      "explanation": "'Silogisme' diawali huruf 'S' dan merupakan bentuk penalaran deduktif."
    },
    {
      "type": "guess",
      "difficulty": "mudah",
      "prompt": "Proposisi majemuk yang selalu bernilai Benar disebut:",
      "answerText": "tautologi",
      "hint": "9 huruf, diawali T",
      "explanation": "Tautologi bernilai benar pada seluruh baris tabel kebenaran."
    },
    {
      "type": "match",
      "difficulty": "sedang",
      "prompt": "Pasangkan nama gerbang logika dengan operasinya:",
      "pairs": [
        [
          "AND",
          "Benar bila semua input 1"
        ],
        [
          "OR",
          "Benar bila minimal satu input 1"
        ],
        [
          "NOT",
          "Membalik nilai input"
        ]
      ],
      "explanation": "Tiga gerbang dasar dalam logika digital."
    }
  ]
};
