/**
 * Inti Bersama 2 Game Utama Lentera ID (Lentera Kuis & Lentera Park)
 * - Audio WebAudio (hanya aktif setelah interaksi pertama + tombol bisu)
 * - Utilitas kanvas responsif (devicePixelRatio) & palet tema aktif
 * - Rekor pribadi per game per materi & Lemari Skin (Koin, Baju, Topi)
 */
window.LenteraGameCore = (function () {
  var GAMES = [
    {
      id: "lentera-quiz",
      name: "Lentera Kuis",
      desc: "Kuis cepat solo atau bersama teman dengan soal unik, tujuh variasi mekanik, serta fitur Serang, Perisai, dan Ulti.",
      duration: "Vertikal & PC \u2022 3-10 Stage"
    },
    {
      id: "lentera-park",
      name: "Lentera Park",
      desc: "Petualangan luas 2.5D dengan rintangan kunci, skill unik 9 karakter, dan pertarungan Bos Terakhir.",
      duration: "Layar Penuh Mendatar \u2022 3-10 Stage"
    }
  ];

  var Sound = (function () {
    var ctx = null;
    var muted = false;
    var unlocked = false;

    function unlock() {
      unlocked = true;
      try {
        if (!ctx) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (AC) ctx = new AC();
        }
        if (ctx && ctx.state === "suspended") ctx.resume();
      } catch (e) { /* abaikan */ }
    }

    function playTone(freq, dur, type, vol) {
      if (muted || !unlocked) return;
      try {
        if (!ctx) unlock();
        if (!ctx) return;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type || "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol || 0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      } catch (e) { /* abaikan */ }
    }

    return {
      unlock: unlock,
      isMuted: function () { return muted; },
      toggleMute: function () { muted = !muted; return muted; },
      jump: function () { playTone(380, 0.08, "sine", 0.05); setTimeout(function () { playTone(520, 0.07, "sine", 0.04); }, 40); },
      spring: function () { playTone(440, 0.09, "triangle", 0.06); setTimeout(function () { playTone(740, 0.12, "triangle", 0.05); }, 55); },
      select: function () { playTone(520, 0.05, "triangle", 0.04); },
      throwRock: function () { playTone(280, 0.08, "triangle", 0.05); setTimeout(function () { playTone(210, 0.09, "sine", 0.04); }, 50); },
      freeze: function () { playTone(880, 0.09, "sine", 0.05); setTimeout(function () { playTone(1174, 0.14, "sine", 0.05); }, 65); },
      shield: function () { playTone(493.88, 0.1, "sine", 0.06); setTimeout(function () { playTone(659.25, 0.14, "sine", 0.05); }, 70); },
      ulti: function () {
        [330, 440, 659.25, 880].forEach(function (f, idx) {
          setTimeout(function () { playTone(f, 0.12, "sawtooth", 0.05); }, idx * 65);
        });
      },
      correct: function () {
        playTone(587.33, 0.09, "triangle", 0.06);
        setTimeout(function () { playTone(783.99, 0.11, "triangle", 0.06); }, 80);
      },
      wrong: function () {
        playTone(230, 0.12, "sawtooth", 0.05);
        setTimeout(function () { playTone(175, 0.16, "sawtooth", 0.05); }, 95);
      },
      win: function () {
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
          setTimeout(function () { playTone(f, 0.16, "triangle", 0.06); }, i * 95);
        });
      }
    };
  })();

  function setupHiDpiCanvas(canvas, logicalW, logicalH) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(logicalW * dpr);
    canvas.height = Math.round(logicalH * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function getCanvasPalette() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fb) {
      var val = cs.getPropertyValue(name);
      return (val && val.trim()) || fb;
    }
    return {
      bg: v("--bg", "#F6F4EF"),
      surface: v("--surface", "#FBFAF7"),
      surface2: v("--surface-2", "#EFECE5"),
      border: v("--border-strong", "#CCC6B9"),
      text: v("--text", "#2B2A28"),
      muted: v("--text-secondary", "#5F5B54"),
      primary: v("--primary", "#3F6F6A"),
      primaryText: v("--primary-text", "#FBFAF7"),
      accent: v("--accent", "#9A5638"),
      success: v("--success", "#2F6B4F"),
      warning: v("--warning", "#8A5A19"),
      danger: v("--danger", "#A63D3D")
    };
  }

  var RECORDS_KEY = "lenteraid_game_records_v4";

  function loadAllRecords() {
    try { return JSON.parse(localStorage.getItem(RECORDS_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }

  function getBestScore(gameId, subjectId) {
    var rec = loadAllRecords();
    var key = String(gameId) + "::" + String(subjectId || "indonesia");
    return Number(rec[key] || 0);
  }

  function getOverallBestScore() {
    var rec = loadAllRecords();
    var max = 0;
    Object.keys(rec).forEach(function (k) {
      var n = Number(rec[k] || 0);
      if (n > max) max = n;
    });
    return max;
  }

  function saveBestScore(gameId, subjectId, score) {
    var clean = Math.max(0, Math.floor(Number(score) || 0));
    var rec = loadAllRecords();
    var key = String(gameId) + "::" + String(subjectId || "indonesia");
    var isNewRecord = clean > Number(rec[key] || 0);
    if (isNewRecord) {
      rec[key] = clean;
      try { localStorage.setItem(RECORDS_KEY, JSON.stringify(rec)); } catch (e) { /* abaikan */ }
    }
    return { bestForCombo: Math.max(clean, Number(rec[key] || 0)), overallBest: getOverallBestScore(), isNewRecord: isNewRecord };
  }

  function getGameMeta(gameId) {
    return GAMES.find(function (g) { return g.id === gameId; }) || GAMES[0];
  }

  return {
    GAMES: GAMES,
    Sound: Sound,
    setupHiDpiCanvas: setupHiDpiCanvas,
    getCanvasPalette: getCanvasPalette,
    getBestScore: getBestScore,
    getOverallBestScore: getOverallBestScore,
    saveBestScore: saveBestScore,
    getGameMeta: getGameMeta
  };
})();
