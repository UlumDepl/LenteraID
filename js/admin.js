/**
 * Controller Panel Admin Lentera ID
 * - Autentikasi khusus akun Google yang terdaftar pada koleksi Firestore admins/{email}.
 * - Membaca seluruh data pengguna, ruang Mabar aktif, dan log hanya dari Firestore.
 * - Otomatis keluar setelah 30 menit tidak ada aktivitas.
 */
(function () {
  var CFG = window.LENTERA_CONFIG;
  var FB = window.FirebaseBridge;

  var GAME_NAMES = {
    "lentera-quiz": "Lentera Kuis",
    "lentera-park": "Lentera Park"
  };

  var loginScreen = document.getElementById("admin-login-screen");
  var adminShell = document.getElementById("admin-shell");
  var authError = document.getElementById("admin-auth-error");
  var adminIdentity = document.getElementById("admin-identity");
  var btnAdminGoogle = document.getElementById("btn-admin-google");

  var kpiOnlineUsers = document.getElementById("kpi-online-users");
  var kpiTotalUsers = document.getElementById("kpi-total-users");
  var kpiActiveRooms = document.getElementById("kpi-active-rooms");
  var kpiAnomaly = document.getElementById("kpi-anomaly");
  var kpiBlocked = document.getElementById("kpi-blocked");

  var searchInput = document.getElementById("search-user");
  var filterSelect = document.getElementById("filter-status");
  var tbody = document.getElementById("admin-user-tbody");
  var roomsTbody = document.getElementById("admin-rooms-tbody");
  var logList = document.getElementById("admin-log-list");
  var liveClockEl = document.getElementById("live-clock-wib");

  var blockModal = document.getElementById("block-modal");
  var modalTargetUser = document.getElementById("modal-target-user");
  var blockReasonInput = document.getElementById("block-reason-input");

  var unsubUsers = null;
  var unsubRooms = null;
  var unsubLogs = null;
  var liveTickTimer = null;

  var firestoreUsers = [];
  var firestoreRooms = [];
  var firestoreLogs = [];
  var pendingTarget = null;
  var lastInteractionAt = Date.now();
  var isAdminActive = false;

  function showAuthError(msg) {
    authError.textContent = msg;
    authError.classList.remove("hidden");
  }

  function clearAuthError() {
    authError.textContent = "";
    authError.classList.add("hidden");
  }

  function touchActivity() { lastInteractionAt = Date.now(); }

  function updateLiveClock() {
    if (!liveClockEl) return;
    var now = new Date();
    var dateStr = now.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
    var timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    liveClockEl.textContent = dateStr + " \u2022 " + timeStr + " WIB";
  }

  function isUserOnline(user) {
    if (!user || !user.isOnline) return false;
    var last = Number(user.lastActiveAt || 0);
    return last > 0 && (Date.now() - last) <= CFG.ONLINE_TIMEOUT_MS;
  }

  function formatLastSeen(ts) {
    var num = Number(ts || 0);
    if (!num) return "Belum ada aktivitas";
    var diffSec = Math.max(0, Math.floor((Date.now() - num) / 1000));
    if (diffSec < 10) return "Baru saja";
    if (diffSec < 60) return diffSec + " detik lalu";
    if (diffSec < 3600) return Math.floor(diffSec / 60) + " menit lalu";
    if (diffSec < 86400) return Math.floor(diffSec / 3600) + " jam lalu";
    return Math.floor(diffSec / 86400) + " hari lalu";
  }

  function classifyAccount(user) {
    if (user.isBlocked) return "blocked";
    if ((user.requests || 0) >= CFG.ANOMALY_THRESHOLD) return "anomaly";
    return "active";
  }

  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === "string") el.textContent = text;
    return el;
  }

  function renderDashboard() {
    if (!isAdminActive) return;

    var timeoutMs = CFG.ADMIN_SESSION_TIMEOUT_MS || 1800000;
    if (Date.now() - lastInteractionAt > timeoutMs) {
      forceLogoutAdmin("Sesi berakhir karena 30 menit tidak ada aktivitas. Silakan masuk kembali.");
      return;
    }

    updateLiveClock();

    var sortedUsers = firestoreUsers.slice().sort(function (a, b) {
      var onlineDiff = Number(isUserOnline(b)) - Number(isUserOnline(a));
      if (onlineDiff !== 0) return onlineDiff;
      return Number(b.lastActiveAt || 0) - Number(a.lastActiveAt || 0);
    });

    var sortedRooms = firestoreRooms.slice().sort(function (a, b) {
      return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0);
    });

    var queryText = searchInput.value.trim().toLowerCase();
    var statusFilter = filterSelect.value;

    kpiOnlineUsers.textContent = String(sortedUsers.filter(isUserOnline).length);
    kpiTotalUsers.textContent = String(sortedUsers.length);
    kpiActiveRooms.textContent = String(sortedRooms.length);
    kpiAnomaly.textContent = String(sortedUsers.filter(function (u) { return classifyAccount(u) === "anomaly"; }).length);
    kpiBlocked.textContent = String(sortedUsers.filter(function (u) { return Boolean(u.isBlocked); }).length);

    var filtered = sortedUsers.filter(function (u) {
      var matchesText =
        String(u.name || "").toLowerCase().includes(queryText) ||
        String(u.email || "").toLowerCase().includes(queryText);
      var accStatus = classifyAccount(u);
      var online = isUserOnline(u);
      var matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "online" && online) ||
        accStatus === statusFilter;
      return matchesText && matchesStatus;
    });

    tbody.textContent = "";
    if (filtered.length === 0) {
      var emptyRow = document.createElement("tr");
      var emptyCell = createEl("td", "", "Belum ada pengguna yang cocok.");
      emptyCell.colSpan = 6;
      emptyCell.style.textAlign = "center";
      emptyCell.style.color = "var(--text-secondary)";
      emptyCell.style.padding = "24px";
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      filtered.forEach(function (user) {
        var online = isUserOnline(user);
        var accStatus = classifyAccount(user);
        var tr = document.createElement("tr");

        var tdUser = document.createElement("td");
        tdUser.appendChild(createEl("strong", "", user.name || "Pengguna"));
        tdUser.appendChild(document.createElement("br"));
        var emailSmall = createEl("small", "", user.email || "-");
        emailSmall.style.color = "var(--text-secondary)";
        tdUser.appendChild(emailSmall);
        tr.appendChild(tdUser);

        var tdPresence = document.createElement("td");
        var pCell = createEl("div", "presence-cell");
        if (online) {
          var pBadge = createEl("span", "presence-badge presence-online");
          pBadge.appendChild(createEl("span", "pulse-dot"));
          pBadge.appendChild(document.createTextNode(" Online"));
          pCell.appendChild(pBadge);
          pCell.appendChild(createEl("span", "presence-meta", user.currentActivity || "Aktif"));
        } else {
          pCell.appendChild(createEl("span", "presence-badge presence-offline", "Offline"));
          pCell.appendChild(createEl("span", "presence-meta", formatLastSeen(user.lastActiveAt)));
        }
        tdPresence.appendChild(pCell);
        tr.appendChild(tdPresence);

        var tdReq = document.createElement("td");
        tdReq.appendChild(createEl("strong", "", String(user.requests || 0)));
        tdReq.appendChild(document.createTextNode(" / " + CFG.MAX_REQUESTS_PER_HOUR));
        tr.appendChild(tdReq);

        tr.appendChild(createEl("td", "", String(user.bestQuizScore || 0)));

        var tdStatus = document.createElement("td");
        var badgeClass = accStatus === "blocked" ? "badge badge-blocked"
          : accStatus === "anomaly" ? "badge badge-anomaly" : "badge badge-ok";
        var badgeLabel = accStatus === "blocked" ? "Diblokir"
          : accStatus === "anomaly" ? "Anomali" : "Normal";
        tdStatus.appendChild(createEl("span", badgeClass, badgeLabel));
        if (user.blockReason) tdStatus.appendChild(createEl("div", "presence-meta", user.blockReason));
        tr.appendChild(tdStatus);

        var tdAct = document.createElement("td");
        var group = createEl("div", "action-group");
        var btnToggle = createEl(
          "button",
          user.isBlocked ? "btn btn-secondary btn-sm" : "btn btn-danger btn-sm",
          user.isBlocked ? "Buka blokir" : "Blokir"
        );
        btnToggle.type = "button";
        btnToggle.dataset.action = user.isBlocked ? "unblock" : "block";
        btnToggle.dataset.uid = user.uid;
        group.appendChild(btnToggle);

        var btnReset = createEl("button", "btn btn-outline btn-sm", "Reset kuota");
        btnReset.type = "button";
        btnReset.dataset.action = "reset";
        btnReset.dataset.uid = user.uid;
        group.appendChild(btnReset);

        tdAct.appendChild(group);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
    }

    roomsTbody.textContent = "";
    if (!sortedRooms.length) {
      var rEmpty = document.createElement("tr");
      var rCell = createEl("td", "", "Belum ada ruang Arena Game aktif saat ini.");
      rCell.colSpan = 6;
      rCell.style.textAlign = "center";
      rCell.style.color = "var(--text-secondary)";
      rCell.style.padding = "18px";
      rEmpty.appendChild(rCell);
      roomsTbody.appendChild(rEmpty);
    } else {
      sortedRooms.forEach(function (rm) {
        var tr = document.createElement("tr");
        var tdCode = document.createElement("td");
        tdCode.appendChild(createEl("strong", "", rm.code || "-"));
        tr.appendChild(tdCode);

        tr.appendChild(createEl("td", "", rm.hostName || "-"));
        tr.appendChild(createEl("td", "", (GAME_NAMES[rm.gameType] || rm.gameType || "-") + " \u2022 " + (rm.stageCount || 3) + " stage"));
        tr.appendChild(createEl("td", "", String(rm.playerCount || 0) + " / " + String(rm.maxPlayers || 0)));

        var tdSt = document.createElement("td");
        tdSt.appendChild(createEl(
          "span",
          rm.status === "playing" ? "badge badge-ok" : "badge badge-anomaly",
          rm.status === "playing" ? "Sedang bermain" : "Menunggu di lobby"
        ));
        tr.appendChild(tdSt);

        tr.appendChild(createEl("td", "", formatLastSeen(rm.updatedAt || rm.createdAt)));
        roomsTbody.appendChild(tr);
      });
    }
  }

  function renderLogs() {
    logList.textContent = "";
    if (!firestoreLogs.length) {
      var liEmpty = createEl("li", "", "Belum ada aktivitas admin tercatat di Firestore.");
      liEmpty.style.color = "var(--text-secondary)";
      logList.appendChild(liEmpty);
      return;
    }
    firestoreLogs.forEach(function (item) {
      var li = document.createElement("li");
      li.appendChild(createEl("span", "", item.message || ""));
      li.appendChild(createEl("span", "log-time", item.time || ""));
      logList.appendChild(li);
    });
  }

  function findUserByUid(uid) {
    return firestoreUsers.find(function (u) { return u.uid === uid; }) || null;
  }

  function openBlockModal(uid) {
    touchActivity();
    var user = findUserByUid(uid);
    if (!user) return;
    pendingTarget = user;
    modalTargetUser.textContent = (user.name || "Pengguna") + " \u2022 " + (user.email || "-");
    blockReasonInput.value = user.blockReason || "Aktivitas anomali / penggunaan berlebih";
    blockModal.classList.remove("hidden");
    blockReasonInput.focus();
  }

  function closeBlockModal() {
    pendingTarget = null;
    blockModal.classList.add("hidden");
  }

  async function confirmBlock() {
    touchActivity();
    if (!pendingTarget) return;
    var reason = blockReasonInput.value.trim() || "Diblokir oleh administrator";
    try {
      await FB.setUserBlock(pendingTarget.uid, true, reason);
      await FB.addAdminLog("Blokir: " + pendingTarget.email + " \u2014 " + reason);
      closeBlockModal();
    } catch (err) {
      showAuthError("Gagal memblokir akun: " + (err.message || err.code));
    }
  }

  async function unblockUser(uid) {
    touchActivity();
    var user = findUserByUid(uid);
    if (!user) return;
    try {
      await FB.setUserBlock(user.uid, false, "");
      await FB.addAdminLog("Buka blokir: " + user.email);
    } catch (err) {
      showAuthError("Gagal membuka blokir: " + (err.message || err.code));
    }
  }

  async function handleResetQuota(uid) {
    touchActivity();
    var user = findUserByUid(uid);
    if (!user) return;
    try {
      await FB.resetQuota(user.uid);
      await FB.addAdminLog("Reset kuota: " + user.email);
    } catch (err) {
      showAuthError("Gagal mereset kuota: " + (err.message || err.code));
    }
  }

  function stopAdminListeners() {
    if (unsubUsers) { unsubUsers(); unsubUsers = null; }
    if (unsubRooms) { unsubRooms(); unsubRooms = null; }
    if (unsubLogs) { unsubLogs(); unsubLogs = null; }
    if (liveTickTimer) { clearInterval(liveTickTimer); liveTickTimer = null; }
  }

  function startAdminListeners() {
    stopAdminListeners();
    unsubUsers = FB.subscribeAllUsers(
      function (list) { firestoreUsers = list; renderDashboard(); },
      function (err) {
        tbody.textContent = "";
        var tr = document.createElement("tr");
        var td = createEl("td", "", "Gagal memuat data Firestore: " + (err.message || err.code));
        td.colSpan = 6;
        td.style.color = "var(--danger)";
        tr.appendChild(td);
        tbody.appendChild(tr);
      }
    );
    unsubRooms = FB.subscribeActiveRooms(function (list) {
      firestoreRooms = list;
      renderDashboard();
    });
    unsubLogs = FB.subscribeAdminLogs(function (list) {
      firestoreLogs = list;
      renderLogs();
    });
    liveTickTimer = setInterval(renderDashboard, 1000);
  }

  async function forceLogoutAdmin(reasonMsg) {
    isAdminActive = false;
    stopAdminListeners();
    firestoreUsers = [];
    firestoreRooms = [];
    firestoreLogs = [];
    try { await FB.logout(); } catch (e) {}
    adminShell.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    if (reasonMsg) showAuthError(reasonMsg);
  }

  if (FB.isReady()) {
    FB.onAuthChanged(async function (fbUser) {
      if (!fbUser) {
        isAdminActive = false;
        stopAdminListeners();
        adminShell.classList.add("hidden");
        loginScreen.classList.remove("hidden");
        return;
      }

      var email = String(fbUser.email || "").trim().toLowerCase();
      var allowed = await FB.checkIsAdmin(email);
      if (!allowed) {
        isAdminActive = false;
        stopAdminListeners();
        adminShell.classList.add("hidden");
        loginScreen.classList.remove("hidden");
        showAuthError("Akun " + email + " tidak terdaftar sebagai admin. Pilih akun Google lain untuk masuk panel admin.");
        return;
      }

      clearAuthError();
      isAdminActive = true;
      touchActivity();
      adminIdentity.textContent = email;
      loginScreen.classList.add("hidden");
      adminShell.classList.remove("hidden");
      renderDashboard();
      renderLogs();
      startAdminListeners();
    });
  } else {
    showAuthError("Layanan Firebase tidak dapat dimuat. Periksa koneksi internet Anda.");
  }

  btnAdminGoogle.addEventListener("click", async function () {
    clearAuthError();
    if (window.location.protocol === "file:") {
      showAuthError("Masuk dengan Google memerlukan alamat web (HTTP atau HTTPS), seperti Live Server atau GitHub Pages.");
      return;
    }
    btnAdminGoogle.disabled = true;
    try {
      await FB.loginWithGoogle(true, true);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        showAuthError("Gagal masuk dengan Google: " + (err.message || err.code));
      }
    } finally {
      btnAdminGoogle.disabled = false;
    }
  });

  document.getElementById("btn-admin-logout").addEventListener("click", function () { forceLogoutAdmin(""); });
  searchInput.addEventListener("input", function () { touchActivity(); renderDashboard(); });
  filterSelect.addEventListener("change", function () { touchActivity(); renderDashboard(); });

  tbody.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var action = btn.dataset.action;
    var uid = btn.dataset.uid;
    if (action === "block") openBlockModal(uid);
    else if (action === "unblock") unblockUser(uid);
    else if (action === "reset") handleResetQuota(uid);
  });

  document.getElementById("btn-cancel-block").addEventListener("click", closeBlockModal);
  document.getElementById("btn-confirm-block").addEventListener("click", confirmBlock);

  ["click", "keydown", "mousemove"].forEach(function (ev) {
    document.addEventListener(ev, touchActivity, { passive: true });
  });
})();
