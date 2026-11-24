/**
 * Modul Ruang Mabar, Moderator Anti-Curang, Rolling Tim Otomatis, & Koleksi 9 Karakter \u2014 Lentera ID
 */
window.LenteraMabar = (function () {
  var CFG = window.LENTERA_CONFIG;
  var FB = window.FirebaseBridge;
  var AUTH_STORE = window.LenteraAuthStorage;
  var ANTICHEAT = window.LenteraAntiCheat;

  var currentUser = null;
  var roster = AUTH_STORE.getLocalRoster();
  var activeRoomCode = null;
  var activeRoomData = null;
  var activePlayers = [];
  var isHost = false;
  var unsubRoom = null;
  var hasLaunchedGame = false;
  var lastWarnSeen = "";
  var lastPenaltySeen = 0;

  var callbacks = {
    onStartSharedGame: null,
    onOpenModeratorView: null,
    onGenerateQuestions: null,
    onKicked: null,
    onPenaltyReceived: null,
    onNotify: null,
    getGameSetupParams: null
  };

  var elUsernameInput, elCoinsBadge, elCharGrid;
  var elRoomCodeInput, elBtnJoin, elLobbyActive, elRoomCodeBadge, elPlayerCountBadge;
  var elLobbyMaxWrap, elLobbyMaxInput, elBtnUpdateMax;
  var elLobbyPlayersList, elHostStartBtn, elLeaveRoomBtn, elCopyCodeBtn, elLobbyStatusText;
  var elLiveLeaderboardPanel, elLiveLeaderboardList, elResultLeaderboardWrap, elResultLeaderboardList;
  var elModTableBody, elModLiveTbody;

  function getLimitMax() { return (CFG && CFG.MAX_PLAYERS_LIMIT) || 50; }

  function getCharById(id) {
    return (CFG.CHARACTERS || []).find(function (c) { return c.id === id; }) || CFG.CHARACTERS[0];
  }

  function getCurrentCharacter() {
    var sel = AUTH_STORE.getSelectedCharacter();
    var unlocked = roster.unlockedCharacters || ["pocong"];
    if (unlocked.indexOf(sel) === -1 && getCharById(sel).price > 0) {
      sel = "pocong";
      AUTH_STORE.setSelectedCharacter("pocong");
    }
    return getCharById(sel);
  }

  function getPlayerUsername() {
    var saved = AUTH_STORE.getMabarUsername();
    if (saved) return saved.slice(0, 24);
    if (currentUser && currentUser.name) return String(currentUser.name).trim().slice(0, 24);
    return "Pemain";
  }

  function updatePlayerName(newName) {
    var clean = String(newName || "").trim().slice(0, 24);
    if (!clean) return;
    AUTH_STORE.setMabarUsername(clean);
    if (currentUser) currentUser.name = clean;
    if (activeRoomCode && currentUser) pushPlayerUpdate({ name: clean }, true);
  }

  function generateRoomCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var code = "LNT";
    for (var i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  // === Sistem Koleksi Karakter (Unlock dengan Koin Lentera) ===
  function syncRosterFromUser(user) {
    if (!user) return;
    var cloudChars = Array.isArray(user.unlockedCharacters) && user.unlockedCharacters.length
      ? user.unlockedCharacters.slice()
      : ["pocong"];
    if (cloudChars.indexOf("pocong") === -1) cloudChars.unshift("pocong");
    if (cloudChars.indexOf("evmus") === -1) cloudChars.unshift("evmus");

    roster = {
      coins: Math.max(Number(user.coins || 0), Number(roster.coins || 0)),
      unlockedCharacters: cloudChars
    };
    AUTH_STORE.saveLocalRoster(roster);
    renderCharacterGrid();
  }

  function addCoins(amount) {
    var gain = Math.max(0, Math.floor(Number(amount) || 0));
    if (!gain) return;
    roster.coins = Math.min(50000, (Number(roster.coins) || 0) + gain);
    AUTH_STORE.saveLocalRoster(roster);
    renderCharacterGrid();
    if (currentUser && currentUser.uid) {
      FB.updateUserProgress(currentUser.uid, {
        coins: roster.coins,
        unlockedCharacters: roster.unlockedCharacters
      });
    }
  }

  function openHeroSkillModal(ch) {
    var modal = document.getElementById("hero-skill-modal");
    if (!modal || !ch) return;
    var av = document.getElementById("hero-skill-avatar");
    var title = document.getElementById("hero-skill-title");
    var badge = document.getElementById("hero-skill-badge");
    var sName = document.getElementById("hero-skill-name");
    var sDesc = document.getElementById("hero-skill-desc");
    if (av) {
      av.src = ch.avatar || "";
      av.alt = ch.name || "";
      av.style.display = ch.avatar ? "block" : "none";
    }
    if (title) title.textContent = ch.name || "Karakter";
    if (badge) badge.textContent = ch.price === 0 ? "Gratis" : (ch.price + " Koin Lentera");
    if (sName) sName.textContent = ch.skillName || "-";
    if (sDesc) sDesc.textContent = ch.skillDesc || "-";
    modal.classList.remove("hidden");
  }

  function closeHeroSkillModal() {
    var modal = document.getElementById("hero-skill-modal");
    if (modal) modal.classList.add("hidden");
  }

  function renderCharacterGrid() {
    if (elCoinsBadge) elCoinsBadge.textContent = "Koin Lentera: " + (Number(roster.coins) || 0);
    if (!elCharGrid) return;

    var selectedId = getCurrentCharacter().id;
    elCharGrid.textContent = "";

    (CFG.CHARACTERS || []).forEach(function (ch) {
      var unlocked = ch.price === 0 || (roster.unlockedCharacters || []).indexOf(ch.id) !== -1;
      var active = ch.id === selectedId && unlocked;

      var tile = document.createElement("div");
      tile.className = "char-tile" + (active ? " active" : "") + (!unlocked ? " locked" : "");

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "char-tile-main";
      btn.setAttribute("aria-pressed", active ? "true" : "false");

      if (ch.avatar) {
        var thumb = document.createElement("img");
        thumb.className = "char-pixel-thumb";
        thumb.src = ch.avatar;
        thumb.alt = ch.name;
        thumb.onerror = function () { thumb.style.display = "none"; };
        btn.appendChild(thumb);
      } else {
        var sw = document.createElement("span");
        sw.className = "skin-swatch";
        sw.style.backgroundColor = ch.primary;
        sw.style.borderColor = ch.accent;
        btn.appendChild(sw);
      }

      var infoCol = document.createElement("div");
      infoCol.className = "char-tile-info";
      var nm = document.createElement("strong");
      nm.textContent = ch.name;
      var statusTag = document.createElement("span");
      statusTag.className = "char-price-tag";
      statusTag.textContent = active ? "Dipakai" : (unlocked ? "Terbuka" : (ch.price + " koin"));
      infoCol.appendChild(nm);
      infoCol.appendChild(statusTag);
      btn.appendChild(infoCol);

      var infoBtn = document.createElement("button");
      infoBtn.type = "button";
      infoBtn.className = "char-info-btn";
      infoBtn.setAttribute("aria-label", "Info skill " + ch.name);
      infoBtn.title = "Info skill " + ch.name;
      infoBtn.textContent = "?";
      infoBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        openHeroSkillModal(ch);
      });

      tile.appendChild(btn);
      tile.appendChild(infoBtn);

      btn.addEventListener("click", function () {
        if (!unlocked) {
          if (roster.coins < ch.price) {
            if (callbacks.onNotify) callbacks.onNotify("Koin belum cukup. Dibutuhkan " + ch.price + " koin untuk membuka " + ch.name + ".", "info");
            return;
          }
          roster.coins -= ch.price;
          roster.unlockedCharacters.push(ch.id);
          AUTH_STORE.saveLocalRoster(roster);
          if (currentUser && currentUser.uid) {
            FB.updateUserProgress(currentUser.uid, {
              coins: roster.coins,
              unlockedCharacters: roster.unlockedCharacters
            });
          }
          if (callbacks.onNotify) callbacks.onNotify("Karakter " + ch.name + " berhasil dibuka.", "success");
        }
        AUTH_STORE.setSelectedCharacter(ch.id);
        renderCharacterGrid();
        if (activeRoomCode && currentUser) pushPlayerUpdate({ characterId: ch.id }, true);
      });

      elCharGrid.appendChild(tile);
    });
  }

  function buildAutoTeams(playersList) {
    var eligible = (playersList || []).filter(function (p) { return !p.kicked; });
    var rng = window.LenteraContent ? window.LenteraContent.createRng(String(Date.now())) : Math.random;
    var shuffled = window.LenteraContent ? window.LenteraContent.shuffle(eligible, rng) : eligible.slice();
    var total = shuffled.length;

    if (total <= 1) {
      return shuffled.map(function (p) { return { uid: p.uid, teamId: "tim-1", teamName: "Tim 1" }; });
    }
    var teamSize = total <= 4 ? total : (total <= 8 ? 2 : (total <= 12 ? 3 : 4));
    var teamCount = Math.max(1, Math.ceil(total / teamSize));
    var assignments = [];
    for (var i = 0; i < total; i++) {
      var tIdx = i % teamCount;
      assignments.push({ uid: shuffled[i].uid, teamId: "tim-" + (tIdx + 1), teamName: "Tim " + (tIdx + 1) });
    }
    return assignments;
  }

  function sortPlayers(list) {
    return (list || []).filter(function (p) { return !p.kicked; }).slice().sort(function (a, b) {
      var sDiff = (Number(b.score) || 0) - (Number(a.score) || 0);
      if (sDiff !== 0) return sDiff;
      return (Number(b.stage) || 1) - (Number(a.stage) || 1);
    });
  }

  function renderLeaderboardInto(container, playersList, limit) {
    if (!container) return;
    var sorted = sortPlayers(playersList);
    if (limit) sorted = sorted.slice(0, limit);
    container.textContent = "";
    if (!sorted.length) {
      var empty = document.createElement("li");
      empty.className = "lb-empty";
      empty.textContent = "Belum ada pemain di ruang ini.";
      container.appendChild(empty);
      return;
    }

    sorted.forEach(function (p, idx) {
      var ch = getCharById(p.characterId);
      var isMe = currentUser && p.uid === currentUser.uid;

      var li = document.createElement("li");
      li.className = "lb-item" + (isMe ? " lb-me" : "");

      var rank = document.createElement("span");
      rank.className = "lb-rank";
      rank.textContent = String(idx + 1);

      var dot;
      if (ch.avatar) {
        dot = document.createElement("img");
        dot.className = "lb-char-thumb";
        dot.src = ch.avatar;
        dot.alt = ch.name;
        dot.title = ch.name;
      } else {
        dot = document.createElement("span");
        dot.className = "lb-skin-dot";
        dot.style.backgroundColor = ch.primary;
        dot.style.borderColor = ch.accent;
        dot.title = ch.name;
      }

      var nameEl = document.createElement("span");
      nameEl.className = "lb-name";
      var suffix = " \u2022 " + ch.name;
      if (p.teamName) suffix += " [" + p.teamName + "]";
      nameEl.textContent = (p.name || "Pemain") + (isMe ? " \u2022 Kamu" : "") + suffix;

      var scoreEl = document.createElement("strong");
      scoreEl.className = "lb-score";
      scoreEl.textContent = String(Number(p.score) || 0);

      li.appendChild(rank);
      li.appendChild(dot);
      li.appendChild(nameEl);
      li.appendChild(scoreEl);
      container.appendChild(li);
    });
  }

  function renderModeratorTableInto(tbodyEl) {
    if (!tbodyEl || !isHost) return;
    tbodyEl.textContent = "";
    var active = activePlayers.filter(function (p) { return !p.kicked; });

    if (!active.length) {
      var trE = document.createElement("tr");
      var tdE = document.createElement("td");
      tdE.colSpan = 5;
      tdE.style.textAlign = "center";
      tdE.style.color = "var(--text-secondary)";
      tdE.textContent = "Menunggu peserta masuk ruang...";
      trE.appendChild(tdE);
      tbodyEl.appendChild(trE);
      return;
    }

    active.forEach(function (p) {
      var st = ANTICHEAT.classify(p.cheatCount, p.awaySeconds);
      var ch = getCharById(p.characterId);
      var tr = document.createElement("tr");

      var tdName = document.createElement("td");
      var nm = document.createElement("strong");
      nm.textContent = p.name || "Pemain";
      tdName.appendChild(nm);
      var meta = document.createElement("div");
      meta.className = "presence-meta";
      meta.textContent = ch.name + (p.teamName ? (" \u2022 " + p.teamName) : "");
      tdName.appendChild(meta);

      var tdStage = document.createElement("td");
      tdStage.textContent = "Stage " + (p.stage || 1) + " \u2022 " + (p.score || 0) + " poin";

      var tdCheat = document.createElement("td");
      tdCheat.textContent = (p.cheatCount || 0) + "x \u2022 " + (p.awaySeconds || 0) + " dtk";

      var tdStatus = document.createElement("td");
      var badge = document.createElement("span");
      badge.className = "badge " + (st.level === "suspect" ? "badge-blocked" : (st.level === "watch" ? "badge-anomaly" : "badge-ok"));
      badge.textContent = st.label;
      tdStatus.appendChild(badge);

      var tdAct = document.createElement("td");
      var grp = document.createElement("div");
      grp.className = "action-group";

      var isSelf = currentUser && p.uid === currentUser.uid;
      if (!isSelf) {
        var bWarn = document.createElement("button");
        bWarn.type = "button";
        bWarn.className = "btn btn-outline btn-sm";
        bWarn.textContent = "Peringatkan";
        bWarn.addEventListener("click", function () {
          FB.updatePlayerDoc(activeRoomCode, p.uid, {
            warnMessage: "Harap tetap fokus di halaman permainan. [" + new Date().toLocaleTimeString("id-ID") + "]"
          }, true);
          if (callbacks.onNotify) callbacks.onNotify("Peringatan dikirim ke " + p.name + ".", "info");
        });

        var bPen = document.createElement("button");
        bPen.type = "button";
        bPen.className = "btn btn-secondary btn-sm";
        bPen.textContent = "-100 Poin";
        bPen.addEventListener("click", function () {
          var nextPen = (Number(p.penaltyPoints) || 0) + 100;
          var nextScore = Math.max(0, (Number(p.score) || 0) - 100);
          FB.updatePlayerDoc(activeRoomCode, p.uid, { penaltyPoints: nextPen, score: nextScore }, true);
          if (callbacks.onNotify) callbacks.onNotify("Poin " + p.name + " dikurangi 100.", "info");
        });

        var bKick = document.createElement("button");
        bKick.type = "button";
        bKick.className = "btn btn-danger-outline btn-sm";
        bKick.textContent = "Keluarkan";
        bKick.addEventListener("click", function () {
          FB.updatePlayerDoc(activeRoomCode, p.uid, { kicked: true }, true);
          if (callbacks.onNotify) callbacks.onNotify(p.name + " dikeluarkan dari ruang.", "info");
        });

        grp.appendChild(bWarn);
        grp.appendChild(bPen);
        grp.appendChild(bKick);
      } else {
        grp.textContent = "Host";
      }
      tdAct.appendChild(grp);

      tr.appendChild(tdName);
      tr.appendChild(tdStage);
      tr.appendChild(tdCheat);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAct);
      tbodyEl.appendChild(tr);
    });
  }

  function renderLobbyUI() {
    if (!elLobbyActive) return;
    var inRoom = Boolean(activeRoomCode);
    elLobbyActive.classList.toggle("hidden", !inRoom);

    if (!inRoom) {
      if (elLiveLeaderboardPanel) elLiveLeaderboardPanel.classList.add("hidden");
      return;
    }

    var roomMax = Number((activeRoomData && activeRoomData.maxPlayers) || 2);
    var curActive = activePlayers.filter(function (p) { return !p.kicked; });

    elRoomCodeBadge.textContent = activeRoomCode;
    elPlayerCountBadge.textContent = curActive.length + " / " + roomMax + " pemain";
    elHostStartBtn.classList.toggle("hidden", !isHost);

    var modWrap = document.getElementById("lobby-moderator-wrap");
    if (modWrap) modWrap.classList.toggle("hidden", !isHost);

    if (elLobbyMaxWrap && elLobbyMaxInput) {
      var canResize = isHost && (!activeRoomData || activeRoomData.status === "waiting");
      elLobbyMaxWrap.classList.toggle("hidden", !canResize);
      if (canResize) {
        elLobbyMaxInput.min = String(Math.max(2, curActive.length));
        elLobbyMaxInput.max = String(getLimitMax());
        if (document.activeElement !== elLobbyMaxInput) elLobbyMaxInput.value = String(roomMax);
      }
    }

    var gMeta = window.LenteraGameCore.getGameMeta(activeRoomData && activeRoomData.gameType);
    var sName = window.LenteraContent.getSubjectName(activeRoomData && activeRoomData.subject);
    var stCount = (activeRoomData && activeRoomData.stageCount) || 3;
    var hostModeLabel = (activeRoomData && activeRoomData.hostMode === "moderator") ? "Moderator Pengawas" : "Host & Pemain";

    elLobbyStatusText.textContent = isHost
      ? hostModeLabel + " \u2022 " + gMeta.name + " \u2022 " + sName + " \u2022 " + stCount + " Stage"
      : gMeta.name + " \u2022 " + sName + " \u2022 " + stCount + " Stage \u2022 Menunggu Host";

    renderLeaderboardInto(elLobbyPlayersList, curActive, roomMax);
    renderModeratorTableInto(elModTableBody);
    renderModeratorTableInto(elModLiveTbody);

    if (elLiveLeaderboardPanel) {
      elLiveLeaderboardPanel.classList.remove("hidden");
      renderLeaderboardInto(elLiveLeaderboardList, curActive, 15);
    }
    if (elResultLeaderboardWrap && !elResultLeaderboardWrap.classList.contains("hidden")) {
      renderLeaderboardInto(elResultLeaderboardList, curActive, roomMax);
    }
  }

  function handleRoomUpdate(room) {
    if (!room) {
      resetRoomState();
      if (callbacks.onNotify) callbacks.onNotify("Ruang Arena Game telah ditutup.", "info");
      return;
    }
    activeRoomData = room;
    isHost = Boolean(currentUser && room.hostUid === currentUser.uid);
    renderLobbyUI();

    if (room.status === "playing" && !hasLaunchedGame) {
      hasLaunchedGame = true;
      if (isHost && room.hostMode === "moderator") {
        if (typeof callbacks.onOpenModeratorView === "function") callbacks.onOpenModeratorView(room);
        return;
      }

      var myDoc = activePlayers.find(function (p) { return currentUser && p.uid === currentUser.uid; }) || {};
      if (typeof callbacks.onStartSharedGame === "function") {
        callbacks.onStartSharedGame({
          gameType: room.gameType || "lentera-quiz",
          subject: room.subject || "indonesia",
          difficulty: room.difficulty || "sedang",
          stageCount: Number(room.stageCount) || 3,
          questionsPerStage: Number(room.questionsPerStage) || 10,
          seed: room.seed || room.code,
          aiItems: room.missionData || [],
          character: getCurrentCharacter(),
          playerName: getPlayerUsername(),
          roomCode: activeRoomCode,
          isMabar: true,
          teamId: myDoc.teamId || "tim-1",
          teamName: myDoc.teamName || "Tim 1"
        });
      }
    }
  }

  function handlePlayersUpdate(list) {
    activePlayers = list || [];

    if (currentUser) {
      var meDoc = activePlayers.find(function (p) { return p.uid === currentUser.uid; });
      if (meDoc) {
        if (meDoc.kicked) {
          resetRoomState();
          if (callbacks.onKicked) callbacks.onKicked();
          return;
        }
        if (meDoc.warnMessage && meDoc.warnMessage !== lastWarnSeen) {
          lastWarnSeen = meDoc.warnMessage;
          if (callbacks.onNotify) callbacks.onNotify("Peringatan Moderator: " + meDoc.warnMessage, "error");
        }
        if (Number(meDoc.penaltyPoints || 0) > lastPenaltySeen) {
          var diff = Number(meDoc.penaltyPoints) - lastPenaltySeen;
          lastPenaltySeen = Number(meDoc.penaltyPoints);
          if (callbacks.onPenaltyReceived) callbacks.onPenaltyReceived(diff);
        }
      }
    }

    renderLobbyUI();
  }

  async function createMabarRoom(setupOverride) {
    if (!currentUser || !FB.isReady()) {
      if (callbacks.onNotify) callbacks.onNotify("Masuk dengan Google diperlukan untuk membuat ruang.", "error");
      return false;
    }
    var username = getPlayerUsername();
    var setup = setupOverride || (typeof callbacks.getGameSetupParams === "function" ? callbacks.getGameSetupParams() : {});
    var maxPlayers = Math.max(2, Math.min(getLimitMax(), Math.floor(Number(setup.maxPlayers) || 2)));
    var stageCount = Math.max(3, Math.min(10, Math.floor(Number(setup.stageCount) || 3)));

    var hostPlayer = {
      uid: currentUser.uid,
      name: username,
      characterId: getCurrentCharacter().id
    };

    cleanupSubscription();
    hasLaunchedGame = false;
    lastWarnSeen = "";
    lastPenaltySeen = 0;

    for (var attempt = 0; attempt < 5; attempt++) {
      var candidate = generateRoomCode();
      var roomData = {
        code: candidate,
        hostUid: currentUser.uid,
        hostName: username,
        hostMode: setup.hostMode || "play",
        gameType: setup.gameType || "lentera-quiz",
        subject: setup.subject || "indonesia",
        difficulty: setup.difficulty || "sedang",
        stageCount: stageCount,
        questionsPerStage: Number(setup.questionsPerStage) || 10,
        status: "waiting",
        maxPlayers: maxPlayers,
        seed: "",
        missionData: null
      };

      try {
        await FB.createRoom(candidate, roomData, hostPlayer);
        activeRoomCode = candidate;
        isHost = true;
        activeRoomData = roomData;
        unsubRoom = FB.subscribeRoom(candidate, handleRoomUpdate, handlePlayersUpdate);
        renderLobbyUI();
        if (callbacks.onNotify) callbacks.onNotify("Ruang Arena Game " + candidate + " dibuat.", "success");
        return true;
      } catch (e) {
        if (e && e.code === "room-exists") continue;
        var em = String((e && e.message) || ""); if (/permission/i.test(em)) em = "Izin Firestore belum aktif di proyek lentera-id. Salin isi berkas firestore.rules ke Firebase Console -> Firestore -> Rules lalu Publish."; if (callbacks.onNotify) callbacks.onNotify(em || "Gagal membuat ruang.", "error");
        return false;
      }
    }
    return false;
  }

  async function joinMabarRoom() {
    if (!currentUser || !FB.isReady()) {
      if (callbacks.onNotify) callbacks.onNotify("Masuk dengan Google diperlukan untuk bergabung ke ruang.", "error");
      return;
    }
    var username = getPlayerUsername();
    var code = (elRoomCodeInput.value || "").trim().toUpperCase();
    if (code.length < 4) {
      if (callbacks.onNotify) callbacks.onNotify("Masukkan kode ruang yang valid.", "error");
      return;
    }

    cleanupSubscription();
    isHost = false;
    hasLaunchedGame = false;
    lastWarnSeen = "";
    lastPenaltySeen = 0;

    try {
      var cloudRoom = await FB.joinRoom(code, {
        uid: currentUser.uid,
        name: username,
        characterId: getCurrentCharacter().id
      });
      activeRoomCode = code;
      isHost = cloudRoom.hostUid === currentUser.uid;
      unsubRoom = FB.subscribeRoom(code, handleRoomUpdate, handlePlayersUpdate);
      if (callbacks.onNotify) callbacks.onNotify("Berhasil bergabung ke ruang " + code + ".", "success");
    } catch (err) {
      var em2 = String((err && err.message) || ""); if (/permission/i.test(em2)) em2 = "Izin Firestore belum aktif di proyek lentera-id. Salin isi berkas firestore.rules ke Firebase Console -> Firestore -> Rules lalu Publish."; if (callbacks.onNotify) callbacks.onNotify(em2 || "Kode ruang tidak ditemukan.", "error");
    }
  }

  async function handleUpdateMaxPlayers() {
    if (!isHost || !activeRoomCode || !elLobbyMaxInput) return;
    var parsed = Number(elLobbyMaxInput.value.trim());
    var minAllowed = Math.max(2, activePlayers.length);
    var maxAllowed = getLimitMax();

    if (!Number.isInteger(parsed) || parsed < minAllowed || parsed > maxAllowed) {
      elLobbyMaxInput.value = String(Math.max(minAllowed, Math.min(maxAllowed, Math.round(parsed || minAllowed))));
      if (callbacks.onNotify) callbacks.onNotify("Batas pemain harus antara " + minAllowed + " dan " + maxAllowed + ".", "error");
      return;
    }

    try {
      await FB.updateRoomMaxPlayers(activeRoomCode, parsed);
      if (callbacks.onNotify) callbacks.onNotify("Batas pemain diubah menjadi " + parsed + ".", "success");
    } catch (err) {
      if (callbacks.onNotify) callbacks.onNotify(err.message || "Gagal mengubah batas pemain.", "error");
    }
  }

  async function hostStartMabar() {
    if (!isHost || !activeRoomCode) return;
    var activeList = activePlayers.filter(function (p) { return !p.kicked; });
    if (!activeList.length) {
      if (callbacks.onNotify) callbacks.onNotify("Minimal harus ada 1 peserta di dalam ruang.", "info");
      return;
    }

    elHostStartBtn.disabled = true;
    elHostStartBtn.textContent = "Menyiapkan permainan...";

    try {
      var setup = typeof callbacks.getGameSetupParams === "function" ? callbacks.getGameSetupParams() : {};
      var gameType = setup.gameType || (activeRoomData && activeRoomData.gameType) || "lentera-quiz";
      var sharedSeed = activeRoomCode + "-" + Date.now();
      var aiItems = [];

      if (typeof callbacks.onGenerateQuestions === "function") {
        var genRes = await callbacks.onGenerateQuestions({
          subject: setup.subject || (activeRoomData && activeRoomData.subject) || "indonesia",
          fallbackSubject: setup.fallbackSubject || "indonesia",
          difficulty: setup.difficulty || (activeRoomData && activeRoomData.difficulty) || "sedang",
          count: 8,
          chatContext: setup.chatContext || ""
        });
        aiItems = (genRes && genRes.items) || [];
      }

      if (gameType === "lentera-park") {
        var assignments = buildAutoTeams(activeList);
        await FB.assignTeamsBatch(activeRoomCode, assignments);
      }

      await FB.updateRoomState(activeRoomCode, {
        status: "playing",
        gameType: gameType,
        subject: setup.subject || (activeRoomData && activeRoomData.subject) || "indonesia",
          fallbackSubject: setup.fallbackSubject || "indonesia",
        difficulty: setup.difficulty || (activeRoomData && activeRoomData.difficulty) || "sedang",
        stageCount: Math.max(3, Math.min(10, Number(setup.stageCount || (activeRoomData && activeRoomData.stageCount) || 3))),
        questionsPerStage: Number(setup.questionsPerStage || (activeRoomData && activeRoomData.questionsPerStage) || 10),
        seed: sharedSeed,
        missionData: aiItems,
        startedAt: Date.now()
      });
    } catch (err) {
      if (callbacks.onNotify) callbacks.onNotify("Gagal memulai permainan: " + (err.message || "coba lagi."), "error");
    } finally {
      elHostStartBtn.disabled = false;
      elHostStartBtn.textContent = "Mulai Game";
    }
  }

  function pushPlayerUpdate(patch, forceImmediate) {
    if (!activeRoomCode || !currentUser) return;
    FB.updatePlayerDoc(activeRoomCode, currentUser.uid, patch, forceImmediate);
  }

  function pickNextHost() {
    var others = activePlayers
      .filter(function (p) { return currentUser && p.uid !== currentUser.uid && !p.kicked; })
      .sort(function (a, b) { return Number(a.joinedAt || 0) - Number(b.joinedAt || 0); });
    return others.length > 0 ? others[0] : null;
  }

  function resetRoomState() {
    cleanupSubscription();
    activeRoomCode = null;
    activeRoomData = null;
    activePlayers = [];
    isHost = false;
    hasLaunchedGame = false;
    renderLobbyUI();
  }

  async function leaveMabarRoom() {
    if (activeRoomCode && currentUser) {
      var nextHost = isHost ? pickNextHost() : null;
      await FB.leaveRoom(activeRoomCode, currentUser.uid, nextHost);
    }
    resetRoomState();
  }

  function cleanupSubscription() {
    if (unsubRoom) { unsubRoom(); unsubRoom = null; }
  }

  function showResultLeaderboard() {
    if (!elResultLeaderboardWrap) return;
    var active = activePlayers.filter(function (p) { return !p.kicked; });
    if (activeRoomCode && active.length > 0) {
      elResultLeaderboardWrap.classList.remove("hidden");
      renderLeaderboardInto(elResultLeaderboardList, active, active.length);
    } else {
      elResultLeaderboardWrap.classList.add("hidden");
    }
  }

  function getRivalTeams(myTeamId) {
    var map = {};
    activePlayers.forEach(function (p) {
      if (!p.teamId || p.teamId === myTeamId || p.kicked) return;
      if (!map[p.teamId]) map[p.teamId] = { teamId: p.teamId, teamName: p.teamName || p.teamId, score: 0 };
      map[p.teamId].score += Number(p.score || 0);
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.score - a.score; });
  }

  function setUser(user) {
    currentUser = user;
    syncRosterFromUser(user);
    if (elUsernameInput && !elUsernameInput.value) {
      var saved = AUTH_STORE.getMabarUsername();
      elUsernameInput.value = saved || (user && user.name ? String(user.name).split(" ")[0] : "Pemain");
    }
  }

  function init(opts) {
    callbacks = Object.assign(callbacks, opts || {});

    elUsernameInput = null;
    elCoinsBadge = document.getElementById("user-coins-badge");
    elCharGrid = document.getElementById("character-selector-grid");
    elRoomCodeInput = document.getElementById("mabar-code-input");
    elBtnJoin = document.getElementById("btn-join-room");
    elLobbyActive = document.getElementById("mabar-active-lobby");
    elRoomCodeBadge = document.getElementById("mabar-room-code");
    elPlayerCountBadge = document.getElementById("mabar-player-count");
    elLobbyMaxWrap = document.getElementById("lobby-max-players-wrap");
    elLobbyMaxInput = document.getElementById("lobby-max-players-input");
    elBtnUpdateMax = document.getElementById("btn-update-max-players");
    elLobbyPlayersList = document.getElementById("mabar-players-list");
    elHostStartBtn = document.getElementById("btn-host-start-mabar");
    elLeaveRoomBtn = document.getElementById("btn-leave-room");
    elCopyCodeBtn = document.getElementById("btn-copy-room-code");
    elLobbyStatusText = document.getElementById("mabar-status-text");
    elLiveLeaderboardPanel = document.getElementById("live-leaderboard-panel");
    elLiveLeaderboardList = document.getElementById("live-leaderboard-list");
    elResultLeaderboardWrap = document.getElementById("result-leaderboard-wrap");
    elResultLeaderboardList = document.getElementById("result-leaderboard-list");
    elModTableBody = document.getElementById("moderator-lobby-tbody");
    elModLiveTbody = document.getElementById("moderator-live-tbody");

    if (elUsernameInput) {
      elUsernameInput.value = AUTH_STORE.getMabarUsername() || "";
      elUsernameInput.addEventListener("change", function () {
        var name = getPlayerUsername();
        if (activeRoomCode && currentUser) pushPlayerUpdate({ name: name }, true);
      });
    }

    renderCharacterGrid();

    if (elBtnJoin) elBtnJoin.addEventListener("click", joinMabarRoom);
    if (elBtnUpdateMax) elBtnUpdateMax.addEventListener("click", handleUpdateMaxPlayers);
    if (elHostStartBtn) elHostStartBtn.addEventListener("click", hostStartMabar);
    if (elLeaveRoomBtn) elLeaveRoomBtn.addEventListener("click", leaveMabarRoom);
    var skillModal = document.getElementById("hero-skill-modal");
    var btnCloseSkill = document.getElementById("btn-close-hero-skill");
    var btnOkSkill = document.getElementById("btn-ok-hero-skill");
    if (btnCloseSkill) btnCloseSkill.addEventListener("click", closeHeroSkillModal);
    if (btnOkSkill) btnOkSkill.addEventListener("click", closeHeroSkillModal);
    if (skillModal) {
      skillModal.addEventListener("click", function (e) {
        if (e.target === skillModal) closeHeroSkillModal();
      });
    }

    if (elCopyCodeBtn) {
      elCopyCodeBtn.addEventListener("click", function () {
        if (!activeRoomCode) return;
        if (navigator.clipboard) navigator.clipboard.writeText(activeRoomCode).catch(function () {});
        if (callbacks.onNotify) callbacks.onNotify("Kode ruang " + activeRoomCode + " disalin.", "info");
      });
    }
  }

  return {
    init: init,
    setUser: setUser,
    addCoins: addCoins,
    createMabarRoom: createMabarRoom,
    getCurrentCharacter: getCurrentCharacter,
    getPlayerUsername: getPlayerUsername,
    updatePlayerName: updatePlayerName,
    pushPlayerUpdate: pushPlayerUpdate,
    getActivePlayers: function () { return activePlayers.slice(); },
    getRivalTeams: getRivalTeams,
    showResultLeaderboard: showResultLeaderboard,
    resetLaunchFlag: function () { hasLaunchedGame = false; },
    isInRoom: function () { return Boolean(activeRoomCode); },
    isHost: function () { return isHost; },
    leaveMabarRoom: leaveMabarRoom
  };
})();
