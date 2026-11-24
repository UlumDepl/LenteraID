/**
 * Modul Pemantau Integritas Mabar (Anti-Curang untuk Moderator Ruang)
 * - Mencatat saat peserta berpindah tab, meminimalkan jendela, atau keluar aplikasi selama soal berlangsung.
 * - Mencegah salin teks soal (copy/contextmenu) pada elemen soal.
 * - Membagi status secara adil agar notifikasi singkat di ponsel tidak langsung dituduh curang:
 *   Aman (0 keluar) | Perlu pantauan (1-2 singkat) | Terindikasi curang (>= 3 kali atau > 6 detik).
 */
window.LenteraAntiCheat = (function () {
  var active = false;
  var leftAt = 0;
  var cheatCount = 0;
  var awaySeconds = 0;
  var onReport = null;
  var protectedEl = null;

  function classify(count, seconds) {
    var c = Number(count) || 0;
    var s = Number(seconds) || 0;
    if (c >= 3 || s > 6) return { level: "suspect", label: "Terindikasi curang" };
    if (c >= 1) return { level: "watch", label: "Perlu pantauan" };
    return { level: "safe", label: "Aman" };
  }

  function markLeave() {
    if (!active || leftAt > 0) return;
    leftAt = Date.now();
    cheatCount += 1;
    if (typeof onReport === "function") {
      onReport({ cheatCount: cheatCount, awaySeconds: awaySeconds, event: "leave" });
    }
  }

  function markReturn() {
    if (!active || leftAt <= 0) return;
    var deltaSec = Math.max(1, Math.round((Date.now() - leftAt) / 1000));
    leftAt = 0;
    awaySeconds += deltaSec;
    if (typeof onReport === "function") {
      onReport({ cheatCount: cheatCount, awaySeconds: awaySeconds, deltaSec: deltaSec, event: "return" });
    }
  }

  function onVisibilityChange() {
    if (!active) return;
    if (document.hidden) markLeave();
    else markReturn();
  }

  function onWindowBlur() {
    if (!active) return;
    markLeave();
  }

  function onWindowFocus() {
    if (!active) return;
    markReturn();
  }

  function blockCopy(e) {
    if (!active) return;
    if (protectedEl && protectedEl.contains(e.target)) {
      e.preventDefault();
    }
  }

  function start(opts) {
    stop();
    active = true;
    leftAt = 0;
    cheatCount = 0;
    awaySeconds = 0;
    onReport = (opts && opts.onReport) || null;
    protectedEl = (opts && opts.protectedContainer) || null;

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("copy", blockCopy);
    document.addEventListener("contextmenu", blockCopy);
  }

  function stop() {
    active = false;
    leftAt = 0;
    onReport = null;
    protectedEl = null;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("blur", onWindowBlur);
    window.removeEventListener("focus", onWindowFocus);
    document.removeEventListener("copy", blockCopy);
    document.removeEventListener("contextmenu", blockCopy);
  }

  function getStats() {
    return {
      cheatCount: cheatCount,
      awaySeconds: awaySeconds,
      status: classify(cheatCount, awaySeconds)
    };
  }

  return {
    start: start,
    stop: stop,
    classify: classify,
    getStats: getStats
  };
})();
