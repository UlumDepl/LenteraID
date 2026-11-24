/**
 * Game 1: Lentera Kuis (Turnamen 1-50 Pemain Tanpa Tim, Mobile-First Vertikal)
 * - Custom 3 sampai 10 stage (default 3 stage x 10 soal = 30 soal).
 * - Setiap pemain memakai seed pribadi (roomCode + uid) sehingga urutan soal & opsi berbeda (anti-contek).
 * - 7 variasi mekanik: Pilihan Ganda, Benar/Salah, Sambung Kata, Susun Kata (tap), Tebak Kata, Tebak Gambar SVG, Pasangkan Cepat.
 * - Timer manusiawi per tipe soal (15 / 22 / 30 detik) + jeda baca penjelasan 2,5 detik.
 * - Mekanik Mabar tiap 3 jawaban benar beruntun: Serang (10% maks 150) / Perisai Rahasia / Simpan Ulti (3 energi -> jebol perisai, 20% maks 350).
 * - Kebal 25 detik setelah baru saja diserang agar peringkat 1 tidak dikeroyok.
 */
window.LenteraGames = window.LenteraGames || {};
window.LenteraGames["lentera-quiz"] = (function () {
  var CORE = window.LenteraGameCore;
  var CONTENT = window.LenteraContent;
  var FB = window.FirebaseBridge;

  var TYPE_LABELS = {
    mcq: "Pilihan Ganda",
    tf: "Benar atau Salah",
    chain: "Sambung Kata",
    arrange: "Susun Kata / Urutan",
    guess: "Tebak Kata",
    diagram: "Tebak Gambar",
    match: "Pasangkan Cepat"
  };

  function getTimerSeconds(type, difficulty) {
    var base = type === "tf" ? 15 : ((type === "arrange" || type === "guess" || type === "match") ? 30 : 22);
    if (difficulty === "mudah") return base + 6;
    if (difficulty === "sulit") return Math.max(12, base - 4);
    return base;
  }

  function create(mountEl, cfg) {
    var stageCount = Math.max(3, Math.min(10, Number(cfg.stageCount) || 3));
    var qPerStage = Math.max(5, Math.min(10, Number(cfg.questionsPerStage) || 10));
    var totalQuestions = stageCount * qPerStage;
    var isMabar = Boolean(cfg.isMabar && cfg.roomCode);

    // Seed unik per pemain agar soal antar peserta berbeda (anti-contek)
    var playerSeed = String(cfg.seed || Date.now()) + "::" + String(cfg.uid || "solo");
    var questions = CONTENT.buildPlayerQuestionSet({
      subject: cfg.subject || "indonesia",
      fallbackSubject: cfg.fallbackSubject || "indonesia",
      totalCount: totalQuestions,
      difficulty: cfg.difficulty || "sedang",
      playerSeed: playerSeed,
      aiItems: cfg.aiItems || []
    });
    if (cfg.subject === "chat" && questions.length > 0 && questions.length < totalQuestions) {
      totalQuestions = questions.length;
      qPerStage = questions.length;
      stageCount = 1;
    }

    var state = "playing"; // playing | feedback | powerup | stage-break | paused | ended
    var index = 0;
    var score = 0;
    var streak = 0;
    var bestStreak = 0;
    var correctCount = 0;
    var wrongCount = 0;
    var timeLeft = 22;
    var timerId = null;
    var autoNextTimer = null;

    // Status Tempur Mabar (Serang / Perisai Rahasia / Ulti)
    var hasSecretShield = false;
    var ultiCharge = 0; // 0..3
    var immuneUntil = 0;
    var unsubEvents = null;

    // Elemen DOM
    mountEl.textContent = "";
    var root = document.createElement("div");
    root.className = "lquiz-wrap";

    // Bar Status Strategi (hanya tampil saat Mabar)
    var combatBar = document.createElement("div");
    combatBar.className = "lquiz-combat-bar" + (isMabar ? "" : " hidden");
    var shieldPill = document.createElement("span");
    shieldPill.className = "hud-pill";
    var ultiPill = document.createElement("span");
    ultiPill.className = "hud-pill";
    var ultiUseBtn = document.createElement("button");
    ultiUseBtn.type = "button";
    ultiUseBtn.className = "btn btn-accent btn-sm hidden";
    ultiUseBtn.textContent = "Lepas Ulti";
    combatBar.appendChild(shieldPill);
    combatBar.appendChild(ultiPill);
    combatBar.appendChild(ultiUseBtn);

    // Banner Notif Serangan Masuk
    var alertBar = document.createElement("div");
    alertBar.className = "lquiz-alert hidden";

    // Kartu Soal Utama (dilindungi anti-copy)
    var qCard = document.createElement("div");
    qCard.className = "lquiz-card no-select";

    var metaRow = document.createElement("div");
    metaRow.className = "seq-timer-row";
    var typeBadge = document.createElement("span");
    typeBadge.className = "quiz-category-tag";
    var timerBadge = document.createElement("strong");
    timerBadge.className = "lquiz-timer-val";
    metaRow.appendChild(typeBadge);
    metaRow.appendChild(timerBadge);

    var progTrack = document.createElement("div");
    progTrack.className = "progress-track";
    progTrack.style.margin = "8px 0 14px";
    var progFill = document.createElement("div");
    progFill.className = "progress-fill";
    progTrack.appendChild(progFill);

    var diagramSlot = document.createElement("div");
    var promptEl = document.createElement("h3");
    promptEl.className = "quiz-question";
    var interactiveSlot = document.createElement("div");
    interactiveSlot.className = "lquiz-interactive";

    var fbBox = document.createElement("div");
    fbBox.className = "quiz-feedback hidden";
    var fbTitle = document.createElement("strong");
    var fbDesc = document.createElement("p");
    var fbActions = document.createElement("div");
    fbActions.className = "quiz-feedback-actions";
    var fbNextBtn = document.createElement("button");
    fbNextBtn.type = "button";
    fbNextBtn.className = "btn btn-primary btn-sm";
    fbNextBtn.textContent = "Lanjut";
    fbActions.appendChild(fbNextBtn);
    fbBox.appendChild(fbTitle);
    fbBox.appendChild(fbDesc);
    fbBox.appendChild(fbActions);

    qCard.appendChild(metaRow);
    qCard.appendChild(progTrack);
    qCard.appendChild(diagramSlot);
    qCard.appendChild(promptEl);
    qCard.appendChild(interactiveSlot);
    qCard.appendChild(fbBox);

    // Overlay Pilihan Strategi (Serang / Perisai / Simpan Ulti)
    var powerOverlay = document.createElement("div");
    powerOverlay.className = "lquiz-power-panel hidden";

    // Overlay Jeda Antar Stage
    var stageBreakBox = document.createElement("div");
    stageBreakBox.className = "lquiz-stage-break hidden";

    root.appendChild(combatBar);
    root.appendChild(alertBar);
    root.appendChild(qCard);
    root.appendChild(powerOverlay);
    root.appendChild(stageBreakBox);
    mountEl.appendChild(root);

    function currentStageNum() {
      return Math.min(stageCount, Math.floor(index / qPerStage) + 1);
    }

    function clearTimers() {
      if (timerId) { clearInterval(timerId); timerId = null; }
      if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
    }

    function showAlert(msg, isDanger) {
      alertBar.textContent = msg;
      alertBar.classList.remove("hidden", "alert-danger", "alert-ok");
      alertBar.classList.add(isDanger ? "alert-danger" : "alert-ok");
      setTimeout(function () { alertBar.classList.add("hidden"); }, 3600);
    }

    function updateCombatHud() {
      if (!isMabar) return;
      shieldPill.textContent = hasSecretShield ? "Perisai Rahasia: Aktif" : "Perisai: Kosong";
      ultiPill.textContent = "Energi Ulti: " + ultiCharge + " / 3";
      ultiUseBtn.classList.toggle("hidden", ultiCharge < 3 || state !== "playing");
    }

    function pushHud() {
      var st = currentStageNum();
      var inStageIdx = (index % qPerStage) + 1;
      if (cfg.onHudUpdate) {
        cfg.onHudUpdate({
          progress: "Stage " + st + "/" + stageCount + " \u2022 Soal " + Math.min(inStageIdx, qPerStage) + "/" + qPerStage,
          score: score,
          lives: null,
          combo: streak,
          timer: timeLeft + " dtk"
        });
      }
      timerBadge.textContent = timeLeft + " detik";
      updateCombatHud();
    }

    function syncScore(force) {
      if (cfg.onScore) {
        cfg.onScore({
          score: score,
          stage: currentStageNum(),
          missionsDone: correctCount,
          finished: state === "ended"
        }, Boolean(force));
      }
    }

    // === Menerima Serangan / Ulti dari Pemain Lain via RTDB ===
    function handleIncomingEvent(ev) {
      if (!ev || state === "ended") return;
      var now = Date.now();

      if (ev.type === "shield-blocked") {
        showAlert("Seranganmu ke " + (ev.fromName || "lawan") + " tertahan Perisai Rahasia!", true);
        return;
      }

      if (ev.type === "attack" || ev.type === "ulti") {
        var isUlti = ev.type === "ulti";
        if (now < immuneUntil) {
          showAlert("Serangan " + (ev.fromName || "lawan") + " gagal karena masa kebal aktif.", false);
          return;
        }

        if (!isUlti && hasSecretShield) {
          hasSecretShield = false;
          CORE.Sound.shield();
          showAlert("Perisai Rahasiamu menahan serangan dari " + (ev.fromName || "lawan") + "!", false);
          if (ev.fromUid) {
            FB.sendQuizEvent(cfg.roomCode, ev.fromUid, {
              type: "shield-blocked",
              fromUid: cfg.uid,
              fromName: cfg.playerName || "Pemain"
            });
          }
          updateCombatHud();
          return;
        }

        // Kena serangan atau Ulti (Ulti menembus perisai!)
        if (isUlti && hasSecretShield) hasSecretShield = false;
        var pct = isUlti ? 0.20 : 0.10;
        var cap = isUlti ? 350 : 150;
        var stolen = Math.min(cap, Math.max(0, Math.round(score * pct)));
        score = Math.max(0, score - stolen);
        immuneUntil = now + 25000; // Kebal 25 detik setelah kena serang

        CORE.Sound.wrong();
        if (isUlti) {
          root.classList.add("lquiz-ultied");
          setTimeout(function () { root.classList.remove("lquiz-ultied"); }, 2800);
          showAlert((ev.fromName || "Lawan") + " menggunakan Ulti: -" + stolen + " poin.", true);
        } else {
          showAlert((ev.fromName || "Lawan") + " menyerangmu: -" + stolen + " poin.", true);
        }

        if (ev.fromUid && stolen > 0) {
          FB.sendQuizEvent(cfg.roomCode, ev.fromUid, {
            type: "steal-reward",
            fromUid: cfg.uid,
            fromName: cfg.playerName || "Pemain",
            points: stolen,
            isUlti: isUlti
          });
        }
        pushHud();
        syncScore(true);
        return;
      }

      if (ev.type === "steal-reward") {
        var gained = Math.max(0, Math.min(350, Number(ev.points) || 0));
        score += gained;
        CORE.Sound.correct();
        showAlert((ev.isUlti ? "ULTI" : "Serangan") + " sukses ke " + (ev.fromName || "target") + "! +" + gained + " poin.", false);
        pushHud();
        syncScore(true);
      }
    }

    if (isMabar && cfg.uid) {
      unsubEvents = FB.subscribeQuizEvents(cfg.roomCode, cfg.uid, handleIncomingEvent);
    }

    // === Panel Pilih Target Serang / Ulti ===
    function openTargetPicker(isUlti, onDone) {
      var rivals = (typeof cfg.getOpponents === "function" ? cfg.getOpponents() : [])
        .filter(function (p) { return p.uid !== cfg.uid && !p.kicked; })
        .sort(function (a, b) { return (Number(b.score) || 0) - (Number(a.score) || 0); })
        .slice(0, 8);

      powerOverlay.textContent = "";
      var h = document.createElement("h4");
      h.textContent = isUlti ? "Pilih target Ulti" : "Pilih target serangan";
      powerOverlay.appendChild(h);

      if (!rivals.length) {
        var note = document.createElement("p");
        note.className = "step-note";
        note.textContent = "Belum ada lawan lain di ruang. Bonus +80 poin diberikan sebagai gantinya.";
        powerOverlay.appendChild(note);
        score += 80;
        syncScore(true);
        setTimeout(onDone, 1200);
        return;
      }

      var list = document.createElement("div");
      list.className = "lquiz-target-list";
      rivals.forEach(function (rv) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "option-btn";
        var nm = document.createElement("strong");
        nm.style.flex = "1";
        nm.textContent = rv.name || "Pemain";
        var sc = document.createElement("span");
        sc.textContent = String(rv.score || 0) + " poin";
        btn.appendChild(nm);
        btn.appendChild(sc);
        btn.addEventListener("click", function () {
          CORE.Sound.unlock();
          if (isUlti) {
            ultiCharge = 0;
            CORE.Sound.ulti();
          } else {
            CORE.Sound.throwRock();
          }
          FB.sendQuizEvent(cfg.roomCode, rv.uid, {
            type: isUlti ? "ulti" : "attack",
            fromUid: cfg.uid,
            fromName: cfg.playerName || "Pemain"
          });
          showAlert((isUlti ? "ULTI" : "Serangan") + " dikirim ke " + (rv.name || "lawan") + "!", false);
          updateCombatHud();
          onDone();
        });
        list.appendChild(btn);
      });
      powerOverlay.appendChild(list);
    }

    function openPowerChoice(onDone) {
      state = "powerup";
      clearTimers();
      qCard.classList.add("hidden");
      powerOverlay.classList.remove("hidden");
      powerOverlay.textContent = "";

      var title = document.createElement("h4");
      title.textContent = "Tiga Jawaban Benar Beruntun";
      var sub = document.createElement("p");
      sub.className = "step-note";
      sub.textContent = "Pilih langkah strategi dalam 6 detik.";

      var grid = document.createElement("div");
      grid.className = "lquiz-power-grid";

      var btnAttack = document.createElement("button");
      btnAttack.type = "button";
      btnAttack.className = "game-pick-card";
      btnAttack.innerHTML = "<strong>Serang</strong><p>Ambil 10% poin lawan hingga 150 poin. Tertahan jika lawan memiliki perisai.</p>";

      var btnShield = document.createElement("button");
      btnShield.type = "button";
      btnShield.className = "game-pick-card";
      btnShield.disabled = hasSecretShield;
      btnShield.innerHTML = "<strong>Perisai Rahasia</strong><p>" + (hasSecretShield ? "Perisai sudah aktif." : "Menahan satu serangan lawan secara tersembunyi.") + "</p>";

      var btnUlti = document.createElement("button");
      btnUlti.type = "button";
      btnUlti.className = "game-pick-card";
      btnUlti.innerHTML = "<strong>" + (ultiCharge >= 2 ? "Aktifkan Ulti" : "Simpan Energi Ulti") + "</strong><p>Energi " + ultiCharge + " dari 3. Menembus perisai lawan.</p>";

      var doneCalled = false;
      function finishPower() {
        if (doneCalled) return;
        doneCalled = true;
        clearTimers();
        powerOverlay.classList.add("hidden");
        qCard.classList.remove("hidden");
        updateCombatHud();
        onDone();
      }

      btnAttack.addEventListener("click", function () {
        clearTimers();
        openTargetPicker(false, finishPower);
      });

      btnShield.addEventListener("click", function () {
        hasSecretShield = true;
        CORE.Sound.shield();
        showAlert("Perisai Rahasia diaktifkan!", false);
        finishPower();
      });

      btnUlti.addEventListener("click", function () {
        ultiCharge = Math.min(3, ultiCharge + 1);
        CORE.Sound.select();
        if (ultiCharge >= 3) {
          clearTimers();
          openTargetPicker(true, finishPower);
        } else {
          showAlert("Energi Ulti bertambah (" + ultiCharge + "/3).", false);
          finishPower();
        }
      });

      grid.appendChild(btnAttack);
      grid.appendChild(btnShield);
      grid.appendChild(btnUlti);
      powerOverlay.appendChild(title);
      powerOverlay.appendChild(sub);
      powerOverlay.appendChild(grid);

      // Batas waktu 6 detik agar tempo tidak macet
      autoNextTimer = setTimeout(function () {
        ultiCharge = Math.min(3, ultiCharge + 1);
        finishPower();
      }, 6500);
    }

    ultiUseBtn.addEventListener("click", function () {
      if (ultiCharge < 3 || state !== "playing") return;
      state = "powerup";
      clearTimers();
      qCard.classList.add("hidden");
      powerOverlay.classList.remove("hidden");
      openTargetPicker(true, function () {
        powerOverlay.classList.add("hidden");
        qCard.classList.remove("hidden");
        state = "playing";
        startQuestionTimer();
      });
    });

    // === Render 7 Variasi Soal ===
    function renderInteractive(q) {
      interactiveSlot.textContent = "";

      // 1, 2, 3, 6: Pilihan Ganda / Benar-Salah / Sambung Kata / Tebak Gambar
      if (q.type === "mcq" || q.type === "tf" || q.type === "chain" || q.type === "diagram") {
        var optList = document.createElement("div");
        optList.className = "quiz-options";
        var letters = ["A", "B", "C", "D"];

        q.options.forEach(function (optText, idx) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "option-btn";
          var keyEl = document.createElement("span");
          keyEl.className = "option-key";
          keyEl.textContent = q.type === "tf" ? (idx === 0 ? "B" : "S") : (letters[idx] || String(idx + 1));
          var txtEl = document.createElement("span");
          CONTENT.renderRichText(txtEl, optText);

          btn.appendChild(keyEl);
          btn.appendChild(txtEl);
          btn.addEventListener("click", function () {
            if (state !== "playing") return;
            var allBtns = optList.querySelectorAll(".option-btn");
            allBtns.forEach(function (b, i) {
              b.disabled = true;
              if (i === q.answer) b.classList.add("correct");
              if (i === idx && idx !== q.answer) b.classList.add("wrong");
            });
            evaluateAnswer(idx === q.answer, false);
          });
          optList.appendChild(btn);
        });
        interactiveSlot.appendChild(optList);
        return;
      }

      // 4: Susun Kata / Urutan (Tap-to-Order super ramah HP potret!)
      if (q.type === "arrange") {
        var rng = CONTENT.createRng(playerSeed + ":arr:" + index);
        var shuffled = CONTENT.shuffle(q.steps, rng);
        if (shuffled.length > 1 && shuffled.every(function (s, i) { return s === q.steps[i]; })) {
          var tmp = shuffled[0]; shuffled[0] = shuffled[1]; shuffled[1] = tmp;
        }
        var chosen = [];

        var chosenBox = document.createElement("div");
        chosenBox.className = "arrange-slots";
        var poolBox = document.createElement("div");
        poolBox.className = "arrange-pool";
        var btnRow = document.createElement("div");
        btnRow.className = "quiz-feedback-actions";
        btnRow.style.marginTop = "12px";

        var resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.className = "btn btn-outline btn-sm";
        resetBtn.textContent = "Ulang urutan";
        var submitBtn = document.createElement("button");
        submitBtn.type = "button";
        submitBtn.className = "btn btn-primary btn-sm";
        submitBtn.textContent = "Periksa urutan";
        submitBtn.disabled = true;

        function redrawArrange() {
          chosenBox.textContent = "";
          if (!chosen.length) {
            var ph = document.createElement("span");
            ph.className = "step-note";
            ph.textContent = "Ketuk kartu di bawah ini sesuai urutan yang tepat.";
            chosenBox.appendChild(ph);
          } else {
            chosen.forEach(function (stepIdx, orderPos) {
              var chip = document.createElement("button");
              chip.type = "button";
              chip.className = "arrange-chip selected";
              CONTENT.renderRichText(chip, (orderPos + 1) + ". " + shuffled[stepIdx]);
              chip.disabled = state !== "playing";
              chip.addEventListener("click", function () {
                if (state !== "playing") return;
                chosen.splice(orderPos, 1);
                redrawArrange();
              });
              chosenBox.appendChild(chip);
            });
          }

          poolBox.textContent = "";
          shuffled.forEach(function (stepText, sIdx) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "arrange-chip";
            CONTENT.renderRichText(btn, stepText);
            var used = chosen.indexOf(sIdx) !== -1;
            btn.disabled = used || state !== "playing";
            btn.addEventListener("click", function () {
              if (state !== "playing" || used) return;
              CORE.Sound.unlock();
              CORE.Sound.select();
              chosen.push(sIdx);
              redrawArrange();
            });
            poolBox.appendChild(btn);
          });

          submitBtn.disabled = chosen.length !== q.steps.length || state !== "playing";
        }

        resetBtn.addEventListener("click", function () {
          if (state !== "playing") return;
          chosen = [];
          redrawArrange();
        });

        submitBtn.addEventListener("click", function () {
          if (state !== "playing" || chosen.length !== q.steps.length) return;
          var isCorrect = chosen.every(function (sIdx, pos) {
            return shuffled[sIdx] === q.steps[pos];
          });
          submitBtn.disabled = true;
          resetBtn.disabled = true;
          evaluateAnswer(isCorrect, false);
        });

        btnRow.appendChild(resetBtn);
        btnRow.appendChild(submitBtn);
        interactiveSlot.appendChild(chosenBox);
        interactiveSlot.appendChild(poolBox);
        interactiveSlot.appendChild(btnRow);
        redrawArrange();
        return;
      }

      // 5: Tebak Kata (Isian singkat + tombol Petunjuk)
      if (q.type === "guess") {
        var hintLine = document.createElement("p");
        hintLine.className = "step-note";
        hintLine.style.marginBottom = "10px";
        hintLine.textContent = "Petunjuk: " + (q.hint || (q.answerText.length + " karakter"));

        var form = document.createElement("form");
        form.className = "short-answer-form";
        var inp = document.createElement("input");
        inp.type = "text";
        inp.className = "text-input";
        inp.placeholder = "Ketik jawabanmu...";
        inp.autocomplete = "off";
        var btn = document.createElement("button");
        btn.type = "submit";
        btn.className = "btn btn-primary";
        btn.textContent = "Jawab";

        form.appendChild(inp);
        form.appendChild(btn);
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          if (state !== "playing") return;
          var given = inp.value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
          var target = String(q.answerText || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
          inp.disabled = true;
          btn.disabled = true;
          evaluateAnswer(Boolean(given) && given === target, false);
        });

        interactiveSlot.appendChild(hintLine);
        interactiveSlot.appendChild(form);
        setTimeout(function () { inp.focus(); }, 50);
        return;
      }

      // 7: Pasangkan Cepat (3 pasang kiri & kanan \u2014 tap kiri lalu tap kanan)
      if (q.type === "match") {
        var rngM = CONTENT.createRng(playerSeed + ":match:" + index);
        var leftItems = q.pairs.map(function (p, i) { return { id: i, text: p[0], matched: false }; });
        var rightItems = CONTENT.shuffle(q.pairs.map(function (p, i) { return { id: i, text: p[1], matched: false }; }), rngM);
        var selLeft = -1;
        var mistakes = 0;
        var matchedTotal = 0;

        var grid = document.createElement("div");
        grid.className = "match-mini-grid";
        var colL = document.createElement("div");
        colL.className = "match-col";
        var colR = document.createElement("div");
        colR.className = "match-col";
        grid.appendChild(colL);
        grid.appendChild(colR);

        function redrawMatch() {
          colL.textContent = "";
          colR.textContent = "";

          leftItems.forEach(function (it, i) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "match-btn" + (it.matched ? " correct" : (selLeft === i ? " active" : ""));
            b.disabled = it.matched || state !== "playing";
            CONTENT.renderRichText(b, it.text);
            b.addEventListener("click", function () {
              if (state !== "playing" || it.matched) return;
              CORE.Sound.unlock();
              CORE.Sound.select();
              selLeft = i;
              redrawMatch();
            });
            colL.appendChild(b);
          });

          rightItems.forEach(function (it) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "match-btn" + (it.matched ? " correct" : "");
            b.disabled = it.matched || state !== "playing" || selLeft === -1;
            CONTENT.renderRichText(b, it.text);
            b.addEventListener("click", function () {
              if (state !== "playing" || selLeft === -1 || it.matched) return;
              if (leftItems[selLeft].id === it.id) {
                leftItems[selLeft].matched = true;
                it.matched = true;
                matchedTotal += 1;
                selLeft = -1;
                CORE.Sound.correct();
                redrawMatch();
                if (matchedTotal >= leftItems.length) {
                  evaluateAnswer(mistakes <= 1, false);
                }
              } else {
                mistakes += 1;
                selLeft = -1;
                CORE.Sound.wrong();
                b.classList.add("wrong");
                setTimeout(redrawMatch, 400);
              }
            });
            colR.appendChild(b);
          });
        }

        interactiveSlot.appendChild(grid);
        redrawMatch();
      }
    }

    function startQuestionTimer() {
      clearTimers();
      timerId = setInterval(function () {
        if (state !== "playing") return;
        timeLeft -= 1;
        pushHud();
        if (timeLeft <= 0) {
          evaluateAnswer(false, true);
        }
      }, 1000);
    }

    function renderQuestion() {
      state = "playing";
      var q = questions[index];
      var stageIdx = index % qPerStage;
      progFill.style.width = Math.round((stageIdx / qPerStage) * 100) + "%";
      typeBadge.textContent = (TYPE_LABELS[q.type] || "Kuis") + (q.topic ? (" \u2022 " + q.topic) : "");
      fbBox.classList.add("hidden");

      diagramSlot.textContent = "";
      if (q.type === "diagram" && q.diagramId) {
        diagramSlot.appendChild(CONTENT.buildDiagramSvg(q.diagramId));
      }

      CONTENT.renderRichText(promptEl, q.prompt);
      renderInteractive(q);

      timeLeft = getTimerSeconds(q.type, cfg.difficulty);
      pushHud();
      startQuestionTimer();
    }

    function evaluateAnswer(isCorrect, timedOut) {
      if (state !== "playing") return;
      state = "feedback";
      clearTimers();
      CORE.Sound.unlock();

      var q = questions[index];
      var triggeredPower = false;

      if (isCorrect) {
        correctCount += 1;
        streak += 1;
        if (streak > bestStreak) bestStreak = streak;
        var gain = 100 + Math.min(60, timeLeft * 2) + Math.min(80, (streak - 1) * 15);
        score += gain;
        CORE.Sound.correct();
        fbTitle.textContent = "Benar +" + gain + " poin" + (streak >= 3 ? (" \u2022 Beruntun x" + streak) : "");
        if (isMabar && streak > 0 && streak % 3 === 0) {
          triggeredPower = true;
        }
      } else {
        wrongCount += 1;
        streak = 0;
        CORE.Sound.wrong();
        fbTitle.textContent = timedOut ? "Waktu habis" : "Belum tepat";
      }

      CONTENT.renderRichText(fbDesc, q.explanation || "");
      fbBox.classList.remove("hidden");
      pushHud();
      syncScore(true);

      var proceed = function () {
        if (state === "ended") return;
        if (triggeredPower && index + 1 < questions.length) {
          openPowerChoice(advanceIndex);
        } else {
          advanceIndex();
        }
      };

      fbNextBtn.onclick = function () {
        clearTimers();
        proceed();
      };

      // Jeda baca manusiawi 2,6 detik lalu otomatis lanjut
      autoNextTimer = setTimeout(proceed, 2600);
    }

    function advanceIndex() {
      var prevStage = currentStageNum();
      index += 1;

      if (index >= questions.length) {
        finishGame();
        return;
      }

      var nextStage = currentStageNum();
      if (nextStage > prevStage) {
        showStageIntermission(prevStage, nextStage);
      } else {
        renderQuestion();
      }
    }

    function showStageIntermission(doneStage, nextStage) {
      state = "stage-break";
      clearTimers();
      qCard.classList.add("hidden");
      stageBreakBox.classList.remove("hidden");
      stageBreakBox.textContent = "";

      var h = document.createElement("h3");
      h.textContent = "Stage " + doneStage + " selesai";
      var p = document.createElement("p");
      p.className = "quiz-desc";
      p.textContent = "Skor sementaramu: " + score + " poin. Bersiap masuk ke Stage " + nextStage + " dari " + stageCount + "...";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-primary btn-sm";
      btn.textContent = "Masuk Stage " + nextStage;
      btn.addEventListener("click", function () {
        clearTimers();
        stageBreakBox.classList.add("hidden");
        qCard.classList.remove("hidden");
        renderQuestion();
      });

      stageBreakBox.appendChild(h);
      stageBreakBox.appendChild(p);
      stageBreakBox.appendChild(btn);

      autoNextTimer = setTimeout(function () {
        stageBreakBox.classList.add("hidden");
        qCard.classList.remove("hidden");
        renderQuestion();
      }, 3600);
    }

    function finishGame() {
      if (state === "ended") return;
      state = "ended";
      clearTimers();
      if (unsubEvents) { unsubEvents(); unsubEvents = null; }
      CORE.Sound.win();
      syncScore(true);
      if (cfg.onFinish) {
        var coinsEarned = Math.max(20, Math.min(350, Math.round(score / 18)));
        cfg.onFinish({
          victory: true,
          score: score,
          coinsEarned: coinsEarned,
          correct: correctCount,
          wrong: wrongCount,
          extraLabel: "Beruntun terbaik",
          extraValue: "x" + bestStreak
        });
      }
    }

    function applyPenalty(pts, msg) {
      score = Math.max(0, score - pts);
      showAlert(msg || ("Moderator mengurangi " + pts + " poin."), true);
      pushHud();
      syncScore(true);
    }

    renderQuestion();

    return {
      getProtectedContainer: function () { return qCard; },
      applyPenalty: applyPenalty,
      togglePause: function () {
        if (state === "playing") { state = "paused"; return true; }
        if (state === "paused") { state = "playing"; return false; }
        return false;
      },
      destroy: function () {
        state = "ended";
        clearTimers();
        if (unsubEvents) { unsubEvents(); unsubEvents = null; }
      }
    };
  }

  return { create: create };
})();
