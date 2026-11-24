/**
 * Pengelola Menu Arena Game (3 Langkah Minimalis) & Siklus Hidup 2 Game Utama:
 * 1. Lentera Kuis (Turnamen 1-50 pemain, 3-10 stage, soal unik, Serang/Perisai/Ulti)
 * 2. Lentera Park (Co-op gaya Pico Park 2, rolling tim 2-4 pemain, 3-10 stage, lempar batu iseng)
 */
window.LenteraGameManager = (function () {
  var CFG = window.LENTERA_CONFIG;
  var CORE = window.LenteraGameCore;
  var CONTENT = window.LenteraContent;
  var ANTICHEAT = window.LenteraAntiCheat;

  var selectedSubject = "indonesia"; // Bahasa Indonesia selalu default utama
  var selectedGame = "lentera-quiz";
  var activeInstance = null;
  var activeContextText = "";
  var activeContextPreview = "";
  var activeContextSubject = "indonesia";
  var lastLaunchOpts = null;
  var currentUid = "";

  var callbacks = {
    onScoreSaved: null,
    onBackToChat: null,
    onGenerateQuestions: null,
    onScoreProgress: null,
    onGameFinished: null,
    onCoinsEarned: null,
    onNotify: null
  };

  // DOM
  var elSetup, elStage, elModStage, elResult;
  var elSubjectChips, elGameCards;
  var elPlayerSlider, elPlayerNumber, elPlayerModeNote;
  var elStageSlider, elStageNumber, elQPerStageGroup, elQPerStage, elHostModeGroup, elHostMode;
  var elDifficulty, elBestBadge, elStartBtn, elStatusMsg;
  var elMount, elStageTitle, elHudProgress, elHudTimer, elHudScore, elHudCombo;
  var elMuteBtn, elPauseBtn, elExitBtn;
  var elResultTitle, elResultScore, elResultSummary, elResultCorrect, elResultWrong, elResultExtraLabel, elResultExtraVal;

  function getMaxPlayersLimit() { return (CFG && CFG.MAX_PLAYERS_LIMIT) || 50; }
  function getMinStages() { return (CFG && CFG.MIN_STAGES) || 3; }
  function getMaxStages() { return (CFG && CFG.MAX_STAGES) || 10; }

  function sanitizePlayerCount(rawVal, showWarn) {
    var limit = getMaxPlayersLimit();
    var str = String(rawVal === null || typeof rawVal === "undefined" ? "" : rawVal).trim();
    var num = Number(str);
    var corrected = false;
    var val;

    if (!str || !Number.isFinite(num) || !Number.isInteger(num)) {
      corrected = true;
      val = Math.round(Number.isFinite(num) ? num : 1);
    } else {
      val = num;
    }

    if (val < 1) { val = 1; corrected = true; }
    if (val > limit) { val = limit; corrected = true; }

    if (elPlayerSlider) elPlayerSlider.value = String(val);
    if (elPlayerNumber) elPlayerNumber.value = String(val);
    updateModeHints(val);

    if (corrected && showWarn && callbacks.onNotify) {
      callbacks.onNotify("Jumlah pemain harus bilangan bulat antara 1 dan " + limit + ".", "info");
    }
    return val;
  }

  function sanitizeStageCount(rawVal, showWarn) {
    var minS = getMinStages();
    var maxS = getMaxStages();
    var str = String(rawVal === null || typeof rawVal === "undefined" ? "" : rawVal).trim();
    var num = Number(str);
    var corrected = false;
    var val;

    if (!str || !Number.isFinite(num) || !Number.isInteger(num)) {
      corrected = true;
      val = Math.round(Number.isFinite(num) ? num : minS);
    } else {
      val = num;
    }

    if (val < minS) { val = minS; corrected = true; }
    if (val > maxS) { val = maxS; corrected = true; }

    if (elStageSlider) elStageSlider.value = String(val);
    if (elStageNumber) elStageNumber.value = String(val);

    if (corrected && showWarn && callbacks.onNotify) {
      callbacks.onNotify("Jumlah stage harus bilangan bulat antara " + minS + " sampai " + maxS + ".", "info");
    }
    return val;
  }

  function updateModeHints(players) {
    if (elHostModeGroup) elHostModeGroup.classList.toggle("hidden", players <= 1);
    if (elQPerStageGroup) elQPerStageGroup.classList.toggle("hidden", selectedGame !== "lentera-quiz");

    if (!elPlayerModeNote || !elStartBtn) return;
    if (players <= 1) {
      elPlayerModeNote.textContent = "Mode Solo";
      elStartBtn.textContent = "Mulai Solo";
    } else {
      var modeDesc = selectedGame === "lentera-park"
        ? ("Mode Bersama \u2022 " + players + " pemain \u2022 Tim otomatis")
        : ("Mode Bersama \u2022 " + players + " pemain \u2022 Kompetisi");
      elPlayerModeNote.textContent = modeDesc;
      elStartBtn.textContent = "Buat ruang";
    }
  }

  function refreshPersonalBestBadge() {
    if (!elBestBadge) return;
    var best = CORE.getBestScore(selectedGame, selectedSubject);
    var gMeta = CORE.getGameMeta(selectedGame);
    var sName = CONTENT.getSubjectName(selectedSubject);
    elBestBadge.textContent = "Rekor terbaik " + gMeta.name + " \u2022 " + sName + ": " + best;
  }

  function renderSubjectChips() {
    if (!elSubjectChips) return;
    elSubjectChips.textContent = "";

    var list = CONTENT.SUBJECTS.slice();
    list.push({ id: "acak", name: "Semua Mata Kuliah", group: "lintas" });
    if (activeContextText) {
      list.unshift({ id: "chat", name: "Materi Percakapan", group: "utama" });
    } else if (selectedSubject === "chat") {
      selectedSubject = "indonesia";
    }

    list.forEach(function (subj) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "subject-chip" + (subj.id === selectedSubject ? " active" : "") + (subj.id === "indonesia" ? " chip-primary-mk" : "");
      btn.setAttribute("aria-pressed", subj.id === selectedSubject ? "true" : "false");
      btn.textContent = subj.name;
      btn.addEventListener("click", function () {
        selectedSubject = subj.id;
        renderSubjectChips();
        refreshPersonalBestBadge();
      });
      elSubjectChips.appendChild(btn);
    });
  }

  function renderGameCards() {
    if (!elGameCards) return;
    elGameCards.textContent = "";

    CORE.GAMES.forEach(function (game) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "game-pick-card" + (game.id === selectedGame ? " active" : "");
      btn.setAttribute("aria-pressed", game.id === selectedGame ? "true" : "false");

      var head = document.createElement("div");
      head.className = "game-pick-head";
      var title = document.createElement("strong");
      title.textContent = game.name;
      var dur = document.createElement("span");
      dur.className = "game-pick-dur";
      dur.textContent = game.duration;
      head.appendChild(title);
      head.appendChild(dur);

      var desc = document.createElement("p");
      desc.textContent = game.desc;

      btn.appendChild(head);
      btn.appendChild(desc);
      btn.addEventListener("click", function () {
        selectedGame = game.id;
        renderGameCards();
        updateModeHints(sanitizePlayerCount(elPlayerNumber ? elPlayerNumber.value : 1, false));
        refreshPersonalBestBadge();
      });
      elGameCards.appendChild(btn);
    });
  }

  function getSetupParams() {
    var players = sanitizePlayerCount(elPlayerNumber ? elPlayerNumber.value : 1, false);
    var stages = sanitizeStageCount(elStageNumber ? elStageNumber.value : 3, false);
    return {
      gameType: selectedGame,
      subject: selectedSubject,
      maxPlayers: players,
      stageCount: stages,
      questionsPerStage: elQPerStage ? Number(elQPerStage.value) : 10,
      difficulty: elDifficulty ? elDifficulty.value : "sedang",
      hostMode: (players >= 2 && elHostMode) ? elHostMode.value : "play",
      fallbackSubject: activeContextSubject || "indonesia",
      chatContext: selectedSubject === "chat" ? activeContextText : ""
    };
  }

  function stopActiveGame() {
    ANTICHEAT.stop();
    if (activeInstance && typeof activeInstance.destroy === "function") {
      activeInstance.destroy();
    }
    activeInstance = null;
  }

  function updateHud(hud) {
    if (elHudProgress) elHudProgress.textContent = hud.progress || "";
    if (elHudScore) elHudScore.textContent = "Skor: " + (hud.score || 0);
    if (elHudCombo) {
      elHudCombo.classList.toggle("hidden", !(hud.combo > 1));
      elHudCombo.textContent = "Beruntun x" + hud.combo;
    }
    if (elHudTimer) {
      elHudTimer.classList.toggle("hidden", !hud.timer);
      elHudTimer.textContent = hud.timer || "";
    }
  }

  function launchGame(opts) {
    stopActiveGame();
    CORE.Sound.unlock();
    lastLaunchOpts = opts;

    var gameId = opts.gameType || selectedGame || "lentera-quiz";
    var subjectId = opts.subject || selectedSubject || "indonesia";
    var gameModule = window.LenteraGames && window.LenteraGames[gameId];
    if (!gameModule) {
      if (callbacks.onNotify) callbacks.onNotify("Modul permainan tidak ditemukan.", "error");
      return;
    }

    var gMeta = CORE.getGameMeta(gameId);
    elStageTitle.textContent = gMeta.name + " \u2022 " + CONTENT.getSubjectName(subjectId);

    elSetup.classList.add("hidden");
    elModStage.classList.add("hidden");
    elResult.classList.add("hidden");
    elStage.classList.remove("hidden");

    if (elPauseBtn) elPauseBtn.textContent = "Jeda";
    if (elMuteBtn) elMuteBtn.textContent = CORE.Sound.isMuted() ? "Suara: Bisu" : "Suara: Aktif";

    activeInstance = gameModule.create(elMount, {
      uid: currentUid || "solo",
      subject: subjectId,
      fallbackSubject: opts.fallbackSubject || "indonesia",
      difficulty: opts.difficulty || "sedang",
      stageCount: Math.max(3, Math.min(10, Number(opts.stageCount) || 3)),
      questionsPerStage: Number(opts.questionsPerStage) || 10,
      seed: opts.seed || String(Date.now()),
      aiItems: opts.aiItems || [],
      character: opts.character || (window.LenteraMabar ? window.LenteraMabar.getCurrentCharacter() : CFG.CHARACTERS[0]),
      playerName: opts.playerName || (window.LenteraMabar ? window.LenteraMabar.getPlayerUsername() : "Pemain"),
      roomCode: opts.roomCode || "",
      isMabar: Boolean(opts.isMabar),
      teamId: opts.teamId || "solo",
      teamName: opts.teamName || "Tim Solo",
      getOpponents: function () { return window.LenteraMabar ? window.LenteraMabar.getActivePlayers() : []; },
      getRivalTeams: function () { return window.LenteraMabar ? window.LenteraMabar.getRivalTeams(opts.teamId || "solo") : []; },
      onHudUpdate: updateHud,
      onScore: function (patch, force) {
        if (callbacks.onScoreProgress) callbacks.onScoreProgress(patch, Boolean(force));
      },
      onExit: showSetupScreen,
      onFinish: function (summary) {
        showResult(summary, gameId, subjectId);
      }
    });

    // Aktifkan Pemantau Anti-Curang selama Mabar berlangsung
    if (opts.isMabar && activeInstance) {
      ANTICHEAT.start({
        protectedContainer: activeInstance.getProtectedContainer ? activeInstance.getProtectedContainer() : elMount,
        onReport: function (rep) {
          if (callbacks.onScoreProgress) {
            callbacks.onScoreProgress({
              cheatCount: rep.cheatCount,
              awaySeconds: rep.awaySeconds
            }, true);
          }
          if (rep.event === "return" && callbacks.onNotify) {
            callbacks.onNotify("Keluar halaman selama " + rep.deltaSec + " detik tercatat di log Moderator.", "info");
          }
        }
      });
    }
  }

  function openModeratorStage(room) {
    stopActiveGame();
    elSetup.classList.add("hidden");
    elStage.classList.add("hidden");
    elResult.classList.add("hidden");
    elModStage.classList.remove("hidden");
    var titleEl = document.getElementById("mod-live-title");
    if (titleEl && room) {
      titleEl.textContent = "Moderator Ruang " + room.code + " \u2022 " + CORE.getGameMeta(room.gameType).name + " \u2022 " + room.stageCount + " Stage";
    }
  }

  function showResult(summary, gameId, subjectId) {
    stopActiveGame();
    elStage.classList.add("hidden");
    elModStage.classList.add("hidden");
    elResult.classList.remove("hidden");

    var rec = CORE.saveBestScore(gameId, subjectId, summary.score);
    if (callbacks.onScoreSaved) callbacks.onScoreSaved(rec.overallBest);
    if (callbacks.onCoinsEarned && summary.coinsEarned) callbacks.onCoinsEarned(summary.coinsEarned);
    if (callbacks.onScoreProgress) {
      callbacks.onScoreProgress({ score: summary.score, missionsDone: summary.correct, finished: true }, true);
    }

    var gMeta = CORE.getGameMeta(gameId);
    elResultTitle.textContent = summary.victory ? "Permainan selesai" : "Permainan berakhir";
    elResultScore.textContent = "Skor akhir: " + summary.score + (rec.isNewRecord ? " \u2022 Rekor baru" : "") +
      (summary.coinsEarned ? (" \u2022 +" + summary.coinsEarned + " Koin") : "");
    elResultSummary.textContent = gMeta.name + " \u2022 " + CONTENT.getSubjectName(subjectId) + " \u2022 Rekor terbaikmu: " + rec.bestForCombo;
    elResultCorrect.textContent = String(summary.correct || 0);
    elResultWrong.textContent = String(summary.wrong || 0);
    if (elResultExtraLabel) elResultExtraLabel.textContent = summary.extraLabel || "Progres";
    if (elResultExtraVal) elResultExtraVal.textContent = String(summary.extraValue || "-");

    refreshPersonalBestBadge();
    if (callbacks.onGameFinished) callbacks.onGameFinished();
  }

  function requestAndroidLandscapeIfNeeded(gameType) {
    if (gameType !== "lentera-park") return;
    var isAndroid = /Android/i.test(navigator.userAgent || "");
    if (!isAndroid) return;
    try {
      var docEl = document.documentElement;
      var fsPromise = null;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) fsPromise = docEl.requestFullscreen();
        else if (docEl.webkitRequestFullscreen) fsPromise = docEl.webkitRequestFullscreen();
      }
      var lockLand = function () {
        if (screen.orientation && typeof screen.orientation.lock === "function") {
          screen.orientation.lock("landscape").catch(function () {});
        }
      };
      if (fsPromise && typeof fsPromise.then === "function") {
        fsPromise.then(lockLand).catch(lockLand);
      } else {
        lockLand();
      }
    } catch (e) {}
  }

  async function handleStartClick() {
    var params = getSetupParams();
    elStatusMsg.classList.add("hidden");

    if (params.maxPlayers >= 2) {
      if (window.LenteraMabar) {
        elStartBtn.disabled = true;
        try {
          await window.LenteraMabar.createMabarRoom(params);
        } finally {
          elStartBtn.disabled = false;
        }
      }
      return;
    }

    requestAndroidLandscapeIfNeeded(params.gameType);
    elStartBtn.disabled = true;
    elStartBtn.textContent = "Menyiapkan...";
    try {
      var aiItems = [];
      if (typeof callbacks.onGenerateQuestions === "function") {
        var needAiCount = params.subject === "chat" ? 12 : 8;
        var genRes = await callbacks.onGenerateQuestions({
          subject: params.subject,
          fallbackSubject: params.fallbackSubject,
          difficulty: params.difficulty,
          count: needAiCount,
          chatContext: params.chatContext
        });
        aiItems = (genRes && genRes.items) || [];
      }
      if (params.subject === "chat" && aiItems.length === 0 && callbacks.onNotify) {
        callbacks.onNotify("Soal AI dari obrolan tidak tersedia saat ini, memakai bank soal " + CONTENT.getSubjectName(params.fallbackSubject) + ".", "info");
      }
      launchGame({
        gameType: params.gameType,
        subject: params.subject,
        fallbackSubject: params.fallbackSubject,
        difficulty: params.difficulty,
        stageCount: params.stageCount,
        questionsPerStage: params.questionsPerStage,
        seed: String(Date.now()),
        aiItems: aiItems,
        isMabar: false,
        character: window.LenteraMabar ? window.LenteraMabar.getCurrentCharacter() : CFG.CHARACTERS[0],
        playerName: window.LenteraMabar ? window.LenteraMabar.getPlayerUsername() : "Pemain"
      });
    } catch (err) {
      elStatusMsg.textContent = err.message || "Gagal memulai permainan.";
      elStatusMsg.classList.remove("hidden");
    } finally {
      elStartBtn.disabled = false;
      updateModeHints(params.maxPlayers);
    }
  }

  function showSetupScreen() {
    stopActiveGame();
    elStage.classList.add("hidden");
    elModStage.classList.add("hidden");
    elResult.classList.add("hidden");
    elSetup.classList.remove("hidden");
    if (window.LenteraMabar) window.LenteraMabar.resetLaunchFlag();
    refreshPersonalBestBadge();
  }

  function syncChatContext(text, preview, subjectFromChat) {
    activeContextText = String(text || "").trim();
    activeContextPreview = String(preview || "").trim();
    if (subjectFromChat && subjectFromChat !== "chat") activeContextSubject = subjectFromChat;
    if (subjectFromChat && !activeContextText) selectedSubject = subjectFromChat;
    renderSubjectChips();
    var note = document.getElementById("chat-context-note");
    if (note) {
      note.classList.toggle("hidden", !activeContextText);
      note.textContent = activeContextPreview || "Materi percakapan chat tersedia.";
    }
  }

  function startFromChatContext(text, preview, subjectFromChat) {
    syncChatContext(text, preview, subjectFromChat);
    selectedSubject = activeContextText ? "chat" : (subjectFromChat || "indonesia");
    renderSubjectChips();
    showSetupScreen();
    sanitizePlayerCount(1, false);
    refreshPersonalBestBadge();
  }

  function applyModeratorPenalty(pts) {
    if (activeInstance && typeof activeInstance.applyPenalty === "function") {
      activeInstance.applyPenalty(pts, "Moderator mengurangi " + pts + " poinmu.");
    }
  }

  function setUserUid(uid) { currentUid = uid || ""; }

  function init(opts) {
    callbacks = Object.assign(callbacks, opts || {});

    elSetup = document.getElementById("game-setup-view");
    elStage = document.getElementById("game-stage");
    elModStage = document.getElementById("moderator-live-stage");
    elResult = document.getElementById("quiz-result");
    elSubjectChips = document.getElementById("subject-chips");
    elGameCards = document.getElementById("game-cards-grid");

    elPlayerSlider = document.getElementById("player-count-slider");
    elPlayerNumber = document.getElementById("player-count-number");
    elPlayerModeNote = document.getElementById("player-mode-note");
    elStageSlider = document.getElementById("stage-count-slider");
    elStageNumber = document.getElementById("stage-count-number");
    elQPerStageGroup = document.getElementById("q-per-stage-group");
    elQPerStage = document.getElementById("q-per-stage-select");
    elHostModeGroup = document.getElementById("host-mode-group");
    elHostMode = document.getElementById("host-mode-select");
    elDifficulty = document.getElementById("quiz-difficulty");
    elBestBadge = document.getElementById("game-personal-best");
    elStartBtn = document.getElementById("btn-start-quiz");
    elStatusMsg = document.getElementById("quiz-status-msg");

    elMount = document.getElementById("game-mount");
    elStageTitle = document.getElementById("game-world-title");
    elHudProgress = document.getElementById("hud-progress");
    elHudTimer = document.getElementById("hud-timer");
    elHudCombo = document.getElementById("hud-combo");
    elHudScore = document.getElementById("hud-score");
    elMuteBtn = document.getElementById("btn-quiz-mute");
    elPauseBtn = document.getElementById("btn-game-pause");
    elExitBtn = document.getElementById("btn-game-exit");

    elResultTitle = document.getElementById("result-rank");
    elResultScore = document.getElementById("result-score-big");
    elResultSummary = document.getElementById("result-summary");
    elResultCorrect = document.getElementById("result-correct");
    elResultWrong = document.getElementById("result-wrong");
    elResultExtraLabel = document.getElementById("result-extra-label");
    elResultExtraVal = document.getElementById("result-best-streak");

    var maxP = getMaxPlayersLimit();
    if (elPlayerSlider) { elPlayerSlider.min = "1"; elPlayerSlider.max = String(maxP); elPlayerSlider.value = "1"; }
    if (elPlayerNumber) { elPlayerNumber.min = "1"; elPlayerNumber.max = String(maxP); elPlayerNumber.value = "1"; }

    var minS = getMinStages();
    var maxS = getMaxStages();
    if (elStageSlider) { elStageSlider.min = String(minS); elStageSlider.max = String(maxS); elStageSlider.value = String(minS); }
    if (elStageNumber) { elStageNumber.min = String(minS); elStageNumber.max = String(maxS); elStageNumber.value = String(minS); }

    if (elPlayerSlider) elPlayerSlider.addEventListener("input", function () { sanitizePlayerCount(elPlayerSlider.value, false); });
    if (elPlayerNumber) elPlayerNumber.addEventListener("change", function () { sanitizePlayerCount(elPlayerNumber.value, true); });
    if (elStageSlider) elStageSlider.addEventListener("input", function () { sanitizeStageCount(elStageSlider.value, false); });
    if (elStageNumber) elStageNumber.addEventListener("change", function () { sanitizeStageCount(elStageNumber.value, true); });

    if (elStartBtn) elStartBtn.addEventListener("click", handleStartClick);

    if (elMuteBtn) {
      elMuteBtn.addEventListener("click", function () {
        var muted = CORE.Sound.toggleMute();
        elMuteBtn.textContent = muted ? "Suara: Bisu" : "Suara: Aktif";
      });
    }
    if (elPauseBtn) {
      elPauseBtn.addEventListener("click", function () {
        if (!activeInstance) return;
        var paused = activeInstance.togglePause();
        elPauseBtn.textContent = paused ? "Lanjut" : "Jeda";
      });
    }
    if (elExitBtn) elExitBtn.addEventListener("click", showSetupScreen);

    var modExitBtn = document.getElementById("btn-mod-exit");
    if (modExitBtn) {
      modExitBtn.addEventListener("click", async function () {
        if (window.LenteraMabar) await window.LenteraMabar.leaveMabarRoom();
        showSetupScreen();
      });
    }

    var btnRetry = document.getElementById("btn-retry-quiz");
    if (btnRetry) {
      btnRetry.addEventListener("click", function () {
        if (lastLaunchOpts && !window.LenteraMabar.isInRoom()) {
          launchGame(Object.assign({}, lastLaunchOpts, { seed: String(Date.now()) }));
        } else {
          showSetupScreen();
        }
      });
    }

    var btnChange = document.getElementById("btn-change-game");
    if (btnChange) btnChange.addEventListener("click", showSetupScreen);

    var btnBackChat = document.getElementById("btn-back-to-chat");
    if (btnBackChat) {
      btnBackChat.addEventListener("click", function () {
        stopActiveGame();
        if (callbacks.onBackToChat) callbacks.onBackToChat();
      });
    }

    renderSubjectChips();
    renderGameCards();
    sanitizePlayerCount(1, false);
    sanitizeStageCount(minS, false);
    refreshPersonalBestBadge();
  }

  return {
    init: init,
    setUserUid: setUserUid,
    stopTimer: stopActiveGame,
    syncChatContext: syncChatContext,
    startFromChatContext: startFromChatContext,
    launchWithData: launchGame,
    openModeratorStage: openModeratorStage,
    applyModeratorPenalty: applyModeratorPenalty,
    getSetupParams: getSetupParams,
    showSetupScreen: showSetupScreen,
    sanitizePlayerCount: sanitizePlayerCount,
    sanitizeStageCount: sanitizeStageCount
  };
})();
