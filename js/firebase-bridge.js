/**
 * Bridge Firebase Lentera ID (Auth Google persisten, Firestore, & Realtime Database)
 * - Persistence LOCAL aktif otomatis sejak awal agar sesi tidak keluar sendiri.
 * - Tidak memaksa prompt select_account saat login standar sehingga Google tidak berulang kali meminta verifikasi kode Gmail.
 * - Mendukung fallback signInWithRedirect jika popup diblokir browser ponsel.
 */
window.FirebaseBridge = (function () {
  var initialized = false;
  var auth = null;
  var db = null;
  var rtdb = null;
  var initError = null;
  var lastScorePushMap = {};

  function init() {
    if (initialized) return true;
    try {
      if (typeof firebase === "undefined") {
        initError = "SDK Firebase belum termuat.";
        return false;
      }
      var fbCfg = window.LENTERA_CONFIG && window.LENTERA_CONFIG.FIREBASE_CONFIG;
      if (!fbCfg || !fbCfg.apiKey || !fbCfg.projectId) {
        initError = "Konfigurasi Firebase belum dimuat. Pastikan js/env.js atau GitHub Secrets sudah terisi.";
        return false;
      }
      if (!firebase.apps.length) {
        firebase.initializeApp(fbCfg);
      }
      auth = firebase.auth();
      db = firebase.firestore();
      // Kunci persistence LOCAL secara default sejak inisialisasi agar sesi tetap tersimpan
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {});
      // Tangani hasil redirect jika sebelumnya memakai signInWithRedirect di ponsel
      auth.getRedirectResult().catch(function () {});

      if (typeof firebase.database === "function") {
        try { rtdb = firebase.database(); } catch (e) { rtdb = null; }
      }
      initialized = true;
      return true;
    } catch (err) {
      initError = err.message || String(err);
      return false;
    }
  }

  function isReady() { return init(); }
  function isRtdbReady() { return init() && Boolean(rtdb); }
  function getInitError() { return initError; }

  function getMaxPlayersLimit() {
    return (window.LENTERA_CONFIG && window.LENTERA_CONFIG.MAX_PLAYERS_LIMIT) || 50;
  }

  function buildRoomExpiresAt() {
    var ttlMs = (window.LENTERA_CONFIG && window.LENTERA_CONFIG.ROOM_TTL_MS) || (6 * 60 * 60 * 1000);
    return firebase.firestore.Timestamp.fromDate(new Date(Date.now() + ttlMs));
  }

  async function loginWithGoogle(remember, forceAccountPicker) {
    if (!init()) throw new Error(initError || "Layanan masuk belum siap.");
    var persistence = remember === false
      ? firebase.auth.Auth.Persistence.SESSION
      : firebase.auth.Auth.Persistence.LOCAL;
    await auth.setPersistence(persistence);

    var provider = new firebase.auth.GoogleAuthProvider();
    // Hanya tampilkan pemilih akun bila diminta eksplisit (mencegah Google memicu verifikasi ulang/kode Gmail terus-menerus)
    if (forceAccountPicker) {
      provider.setCustomParameters({ prompt: "select_account" });
    }

    try {
      var result = await auth.signInWithPopup(provider);
      var user = result.user;
      await ensureUserDoc(user);
      return user;
    } catch (err) {
      if (err && (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment")) {
        await auth.signInWithRedirect(provider);
        return null;
      }
      throw err;
    }
  }

  async function logout() {
    if (!init()) return;
    await auth.signOut();
  }

  function onAuthChanged(callback) {
    if (!init()) return function () {};
    return auth.onAuthStateChanged(callback);
  }

  async function getIdToken(forceRefresh) {
    if (!init() || !auth.currentUser) return "";
    try { return await auth.currentUser.getIdToken(Boolean(forceRefresh)); }
    catch (e) { return ""; }
  }

  async function checkIsAdmin(email) {
    if (!email) return false;
    var normalized = String(email).trim().toLowerCase();
    var list = (window.LENTERA_CONFIG && Array.isArray(window.LENTERA_CONFIG.ADMIN_EMAILS))
      ? window.LENTERA_CONFIG.ADMIN_EMAILS
      : [];
    if (list.some(function (e) { return String(e || "").trim().toLowerCase() === normalized; })) {
      return true;
    }
    if (!init()) return false;
    try {
      var snap = await db.collection("admins").doc(normalized).get();
      return Boolean(snap.exists);
    } catch (err) {
      return false;
    }
  }

  async function ensureUserDoc(fbUser) {
    var now = Date.now();
    var fallback = {
      uid: fbUser.uid,
      email: fbUser.email || "",
      name: fbUser.displayName || "Pengguna",
      photoURL: fbUser.photoURL || "",
      requests: 0,
      bestQuizScore: 0,
      coins: 0,
      unlockedCharacters: ["evmus", "pocong"],
      isBlocked: false,
      blockReason: "",
      isOnline: true,
      lastActiveAt: now,
      currentActivity: "Aktif di Lentera"
    };
    try {
      var ref = db.collection("users").doc(fbUser.uid);
      var snap = await ref.get();
      if (!snap.exists) {
        await ref.set(Object.assign({}, fallback, {
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }));
        return fallback;
      }
      var existing = snap.data() || {};
      if (!existing.isBlocked) {
        await ref.update({
          name: existing.name || fbUser.displayName || "Pengguna",
          photoURL: fbUser.photoURL || existing.photoURL || "",
          isOnline: true,
          lastActiveAt: now,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      return Object.assign({}, fallback, existing, { uid: fbUser.uid, isOnline: true, lastActiveAt: now });
    } catch (err) {
      fallback._firestoreWarning = err.code || err.message;
      return fallback;
    }
  }

  async function setUserPresence(uid, isOnline, activity) {
    if (!init() || !uid) return;
    try {
      var payload = {
        isOnline: Boolean(isOnline),
        lastActiveAt: Date.now(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (activity) payload.currentActivity = activity;
      await db.collection("users").doc(uid).update(payload);
    } catch (e) {}
  }

  function subscribeUserDoc(uid, callback) {
    if (!init() || !uid) return function () {};
    try {
      return db.collection("users").doc(uid).onSnapshot(
        function (snap) {
          if (snap.exists) callback(Object.assign({ uid: uid }, snap.data()));
        },
        function () {}
      );
    } catch (e) { return function () {}; }
  }

  async function updateUserProgress(uid, patch) {
    if (!init() || !uid || !patch) return;
    var clean = {
      lastActiveAt: Date.now(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (typeof patch.bestQuizScore === "number") {
      clean.bestQuizScore = Math.max(0, Math.min(100000, Math.floor(patch.bestQuizScore)));
    }
    if (typeof patch.coins === "number") {
      clean.coins = Math.max(0, Math.min(50000, Math.floor(patch.coins)));
    }
    if (Array.isArray(patch.unlockedCharacters)) {
      clean.unlockedCharacters = patch.unlockedCharacters.slice(0, 20);
    }
    if (typeof patch.name === "string" && patch.name.trim()) {
      clean.name = patch.name.trim().slice(0, 24);
    }
    if (typeof patch.requests === "number") {
      clean.requests = Math.max(0, Math.min(40, Math.floor(patch.requests)));
    }
    if (typeof patch.quotaHourBucket === "number") {
      clean.quotaHourBucket = Math.floor(patch.quotaHourBucket);
    }
    try {
      await db.collection("users").doc(uid).update(clean);
    } catch (e) {}
  }

  // === Ruang Mabar Firestore ===
  async function createRoom(roomCode, roomData, hostPlayer) {
    if (!init()) throw new Error("Layanan awan tidak tersedia.");
    var roomRef = db.collection("mabar_rooms").doc(roomCode);
    var limitMax = getMaxPlayersLimit();
    var maxPlayers = Math.max(2, Math.min(limitMax, Math.floor(Number(roomData.maxPlayers) || 2)));
    var stageCount = Math.max(3, Math.min(10, Math.floor(Number(roomData.stageCount) || 3)));
    var hostParticipates = roomData.hostMode !== "moderator";

    await db.runTransaction(async function (tx) {
      var existing = await tx.get(roomRef);
      if (existing.exists) {
        var dupErr = new Error("ROOM_EXISTS");
        dupErr.code = "room-exists";
        throw dupErr;
      }
      tx.set(roomRef, Object.assign({}, roomData, {
        code: roomCode,
        maxPlayers: maxPlayers,
        stageCount: stageCount,
        playerCount: hostParticipates ? 1 : 0,
        status: "waiting",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        expiresAt: buildRoomExpiresAt()
      }));

      if (hostParticipates && hostPlayer) {
        var playerRef = roomRef.collection("players").doc(hostPlayer.uid);
        tx.set(playerRef, {
          uid: hostPlayer.uid,
          name: String(hostPlayer.name || "Pemain").slice(0, 20),
          characterId: String(hostPlayer.characterId || "evmus"),
          teamId: "",
          teamName: "",
          score: 0,
          stage: 1,
          missionsDone: 0,
          finished: false,
          cheatCount: 0,
          awaySeconds: 0,
          warnMessage: "",
          kicked: false,
          penaltyPoints: 0,
          joinedAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    });

    return roomCode;
  }

  async function joinRoom(roomCode, playerObj) {
    if (!init()) throw new Error("Layanan awan tidak tersedia.");
    var roomRef = db.collection("mabar_rooms").doc(roomCode);
    var playerRef = roomRef.collection("players").doc(playerObj.uid);

    return await db.runTransaction(async function (tx) {
      var roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists) throw new Error("Kode ruang tidak ditemukan.");
      var room = roomSnap.data();
      var playerSnap = await tx.get(playerRef);
      var currentCount = Number(room.playerCount || 0);
      var maxPlayers = Number(room.maxPlayers || 2);

      if (playerSnap.exists && playerSnap.data().kicked) {
        throw new Error("Anda telah dikeluarkan dari ruang ini oleh Moderator.");
      }

      if (!playerSnap.exists) {
        if (currentCount >= maxPlayers) {
          throw new Error("Ruang sudah penuh: " + currentCount + " / " + maxPlayers + " pemain.");
        }
        tx.update(roomRef, {
          playerCount: currentCount + 1,
          updatedAt: Date.now(),
          expiresAt: buildRoomExpiresAt()
        });
      }

      var prev = playerSnap.exists ? playerSnap.data() : {};
      tx.set(playerRef, {
        uid: playerObj.uid,
        name: String(playerObj.name || "Pemain").slice(0, 20),
        characterId: String(playerObj.characterId || "evmus"),
        teamId: String(prev.teamId || ""),
        teamName: String(prev.teamName || ""),
        score: Number(prev.score || 0),
        stage: Number(prev.stage || 1),
        missionsDone: Number(prev.missionsDone || 0),
        finished: Boolean(prev.finished),
        cheatCount: Number(prev.cheatCount || 0),
        awaySeconds: Number(prev.awaySeconds || 0),
        warnMessage: String(prev.warnMessage || ""),
        kicked: false,
        penaltyPoints: Number(prev.penaltyPoints || 0),
        joinedAt: Number(prev.joinedAt || Date.now()),
        updatedAt: Date.now()
      });

      return Object.assign({}, room, { playerCount: playerSnap.exists ? currentCount : currentCount + 1 });
    });
  }

  async function updateRoomMaxPlayers(roomCode, nextMax) {
    if (!init() || !roomCode) return;
    var roomRef = db.collection("mabar_rooms").doc(roomCode);
    var limitMax = getMaxPlayersLimit();
    var target = Math.floor(Number(nextMax));

    await db.runTransaction(async function (tx) {
      var snap = await tx.get(roomRef);
      if (!snap.exists) throw new Error("Ruang tidak ditemukan.");
      var room = snap.data();
      if (room.status !== "waiting") throw new Error("Batas pemain hanya bisa diubah sebelum permainan dimulai.");
      var cur = Math.max(2, Number(room.playerCount || 1));
      if (isNaN(target) || target < cur || target > limitMax) {
        throw new Error("Batas pemain harus antara " + cur + " sampai " + limitMax + ".");
      }
      tx.update(roomRef, {
        maxPlayers: target,
        updatedAt: Date.now(),
        expiresAt: buildRoomExpiresAt()
      });
    });
  }

  async function updateRoomState(roomCode, patch) {
    if (!init()) return;
    await db.collection("mabar_rooms").doc(roomCode).update(
      Object.assign({}, patch, {
        updatedAt: Date.now(),
        expiresAt: buildRoomExpiresAt()
      })
    );
  }

  async function updatePlayerDoc(roomCode, uid, patch, forceImmediate) {
    if (!init() || !roomCode || !uid) return;
    var throttleMs = (window.LENTERA_CONFIG && window.LENTERA_CONFIG.SCORE_WRITE_THROTTLE_MS) || 2500;
    var key = roomCode + ":" + uid;
    var now = Date.now();
    if (!forceImmediate && lastScorePushMap[key] && (now - lastScorePushMap[key] < throttleMs)) {
      return;
    }
    lastScorePushMap[key] = now;
    try {
      var clean = { updatedAt: now };
      if (typeof patch.score !== "undefined") clean.score = Math.max(0, Math.min(100000, Math.floor(Number(patch.score) || 0)));
      if (typeof patch.stage !== "undefined") clean.stage = Math.max(1, Math.min(10, Math.floor(Number(patch.stage) || 1)));
      if (typeof patch.missionsDone !== "undefined") clean.missionsDone = Math.max(0, Math.min(200, Math.floor(Number(patch.missionsDone) || 0)));
      if (typeof patch.finished !== "undefined") clean.finished = Boolean(patch.finished);
      if (typeof patch.name !== "undefined") clean.name = String(patch.name).slice(0, 20);
      if (typeof patch.characterId !== "undefined") clean.characterId = String(patch.characterId);
      if (typeof patch.teamId !== "undefined") clean.teamId = String(patch.teamId);
      if (typeof patch.teamName !== "undefined") clean.teamName = String(patch.teamName);
      if (typeof patch.cheatCount !== "undefined") clean.cheatCount = Math.max(0, Math.floor(Number(patch.cheatCount) || 0));
      if (typeof patch.awaySeconds !== "undefined") clean.awaySeconds = Math.max(0, Math.floor(Number(patch.awaySeconds) || 0));
      if (typeof patch.warnMessage !== "undefined") clean.warnMessage = String(patch.warnMessage).slice(0, 140);
      if (typeof patch.kicked !== "undefined") clean.kicked = Boolean(patch.kicked);
      if (typeof patch.penaltyPoints !== "undefined") clean.penaltyPoints = Math.max(0, Math.floor(Number(patch.penaltyPoints) || 0));

      await db.collection("mabar_rooms").doc(roomCode).collection("players").doc(uid).update(clean);
    } catch (e) {}
  }

  async function assignTeamsBatch(roomCode, assignments) {
    if (!init() || !roomCode || !Array.isArray(assignments)) return;
    var batch = db.batch();
    var roomRef = db.collection("mabar_rooms").doc(roomCode);
    assignments.forEach(function (a) {
      var ref = roomRef.collection("players").doc(a.uid);
      batch.update(ref, {
        teamId: a.teamId,
        teamName: a.teamName,
        score: 0,
        stage: 1,
        missionsDone: 0,
        finished: false,
        updatedAt: Date.now()
      });
    });
    await batch.commit();
  }

  async function leaveRoom(roomCode, uid, nextHost) {
    if (!init() || !roomCode || !uid) return;
    var roomRef = db.collection("mabar_rooms").doc(roomCode);
    var playerRef = roomRef.collection("players").doc(uid);
    try {
      await db.runTransaction(async function (tx) {
        var roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists) return;
        var room = roomSnap.data();
        var playerSnap = await tx.get(playerRef);
        var nextCount = playerSnap.exists ? Math.max(0, Number(room.playerCount || 1) - 1) : Number(room.playerCount || 0);
        if (playerSnap.exists) tx.delete(playerRef);

        if (nextCount === 0 && room.hostUid === uid) {
          tx.delete(roomRef);
        } else {
          var patch = {
            playerCount: nextCount,
            updatedAt: Date.now(),
            expiresAt: buildRoomExpiresAt()
          };
          if (room.hostUid === uid && nextHost && nextHost.uid) {
            patch.hostUid = nextHost.uid;
            patch.hostName = nextHost.name || "Host";
          }
          tx.update(roomRef, patch);
        }
      });
    } catch (e) {}
  }

  function subscribeRoom(roomCode, onRoom, onPlayers, onError) {
    if (!init()) return function () {};
    var roomRef = db.collection("mabar_rooms").doc(roomCode);
    var u1 = roomRef.onSnapshot(
      function (snap) {
        if (snap.exists) { if (onRoom) onRoom(snap.data()); }
        else { if (onRoom) onRoom(null); }
      },
      function (err) { if (onError) onError(err); }
    );
    var u2 = roomRef.collection("players").onSnapshot(
      function (snap) {
        var list = snap.docs.map(function (d) { return Object.assign({ uid: d.id }, d.data()); });
        if (onPlayers) onPlayers(list);
      },
      function (err) { if (onError) onError(err); }
    );
    return function () { u1(); u2(); };
  }

  // === Realtime Database (RTDB) ===
  async function sendQuizEvent(roomCode, targetUid, eventObj) {
    if (!isRtdbReady() || !roomCode || !targetUid) return false;
    try {
      var ref = rtdb.ref("quiz_events/" + roomCode + "/" + targetUid).push();
      await ref.set(Object.assign({}, eventObj, { createdAt: Date.now() }));
      return true;
    } catch (e) { return false; }
  }

  function subscribeQuizEvents(roomCode, uid, onEvent) {
    if (!isRtdbReady() || !roomCode || !uid) return function () {};
    var ref = rtdb.ref("quiz_events/" + roomCode + "/" + uid);
    var handler = function (snap) {
      var val = snap.val();
      if (val && typeof onEvent === "function") {
        onEvent(val, snap.key);
        snap.ref.remove().catch(function () {});
      }
    };
    ref.on("child_added", handler);
    return function () { ref.off("child_added", handler); };
  }

  function pushParkPlayerState(roomCode, teamId, uid, stateObj) {
    if (!isRtdbReady() || !roomCode || !teamId || !uid) return;
    try {
      rtdb.ref("park_rooms/" + roomCode + "/teams/" + teamId + "/players/" + uid).set(
        Object.assign({}, stateObj, { ts: Date.now() })
      );
    } catch (e) {}
  }

  function pushParkTeamState(roomCode, teamId, stateObj) {
    if (!isRtdbReady() || !roomCode || !teamId) return;
    try {
      rtdb.ref("park_rooms/" + roomCode + "/teams/" + teamId + "/state").update(
        Object.assign({}, stateObj, { ts: Date.now() })
      );
    } catch (e) {}
  }

  function pushParkThrow(roomCode, teamId, skillObj) {
    if (!isRtdbReady() || !roomCode || !teamId) return;
    try {
      rtdb.ref("park_rooms/" + roomCode + "/teams/" + teamId + "/throws").push(
        Object.assign({}, skillObj, { ts: Date.now() })
      );
    } catch (e) {}
  }

  function pushParkSabotage(roomCode, targetTeamId, sabObj) {
    if (!isRtdbReady() || !roomCode || !targetTeamId) return;
    try {
      rtdb.ref("park_rooms/" + roomCode + "/teams/" + targetTeamId + "/sabotage").push(
        Object.assign({}, sabObj, { ts: Date.now() })
      );
    } catch (e) {}
  }

  function subscribeParkTeam(roomCode, teamId, handlers) {
    if (!isRtdbReady() || !roomCode || !teamId) return function () {};
    var baseRef = rtdb.ref("park_rooms/" + roomCode + "/teams/" + teamId);
    var pRef = baseRef.child("players");
    var sRef = baseRef.child("state");
    var tRef = baseRef.child("throws");
    var bRef = baseRef.child("sabotage");
    var startTs = Date.now();

    var onP = function (snap) { if (handlers.onPlayers) handlers.onPlayers(snap.val() || {}); };
    var onS = function (snap) { if (handlers.onState) handlers.onState(snap.val() || {}); };
    var onT = function (snap) {
      var v = snap.val();
      if (v && Number(v.ts || 0) >= startTs - 2000 && handlers.onThrow) handlers.onThrow(v);
    };
    var onB = function (snap) {
      var v = snap.val();
      if (v && Number(v.ts || 0) >= startTs - 2000 && handlers.onSabotage) handlers.onSabotage(v);
    };

    pRef.on("value", onP);
    sRef.on("value", onS);
    tRef.on("child_added", onT);
    bRef.on("child_added", onB);

    return function () {
      pRef.off("value", onP);
      sRef.off("value", onS);
      tRef.off("child_added", onT);
      bRef.off("child_added", onB);
    };
  }

  // === Admin Helpers ===
  function subscribeAllUsers(onData, onError) {
    if (!init()) {
      if (onError) onError(new Error("Firebase belum siap."));
      return function () {};
    }
    try {
      return db.collection("users").onSnapshot(
        function (snap) {
          onData(snap.docs.map(function (d) { return Object.assign({ uid: d.id }, d.data()); }));
        },
        function (err) { if (onError) onError(err); }
      );
    } catch (err) {
      if (onError) onError(err);
      return function () {};
    }
  }

  function subscribeActiveRooms(onData, onError) {
    if (!init()) return function () {};
    try {
      return db.collection("mabar_rooms").onSnapshot(
        function (snap) {
          onData(snap.docs.map(function (d) { return Object.assign({ code: d.id }, d.data()); }));
        },
        function (err) { if (onError) onError(err); }
      );
    } catch (e) { return function () {}; }
  }

  function subscribeAdminLogs(onData, onError) {
    if (!init()) return function () {};
    try {
      return db.collection("admin_logs").orderBy("createdAt", "desc").limit(50).onSnapshot(
        function (snap) {
          onData(snap.docs.map(function (d) { return d.data(); }));
        },
        function (err) { if (onError) onError(err); }
      );
    } catch (e) { return function () {}; }
  }

  async function setUserBlock(uid, isBlocked, reason) {
    if (!init()) throw new Error("Firebase belum siap.");
    await db.collection("users").doc(uid).update({
      isBlocked: Boolean(isBlocked),
      blockReason: isBlocked ? (reason || "Diblokir oleh administrator") : "",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function resetQuota(uid) {
    if (!init()) throw new Error("Firebase belum siap.");
    await db.collection("users").doc(uid).update({
      requests: 0,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function addAdminLog(message) {
    if (!init()) return;
    try {
      await db.collection("admin_logs").add({
        message: message,
        time: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit", minute: "2-digit", second: "2-digit"
        }),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {}
  }

  return {
    isReady: isReady,
    isRtdbReady: isRtdbReady,
    getInitError: getInitError,
    loginWithGoogle: loginWithGoogle,
    logout: logout,
    onAuthChanged: onAuthChanged,
    getIdToken: getIdToken,
    checkIsAdmin: checkIsAdmin,
    ensureUserDoc: ensureUserDoc,
    setUserPresence: setUserPresence,
    subscribeUserDoc: subscribeUserDoc,
    updateUserProgress: updateUserProgress,
    createRoom: createRoom,
    joinRoom: joinRoom,
    updateRoomMaxPlayers: updateRoomMaxPlayers,
    updateRoomState: updateRoomState,
    updatePlayerDoc: updatePlayerDoc,
    assignTeamsBatch: assignTeamsBatch,
    leaveRoom: leaveRoom,
    subscribeRoom: subscribeRoom,
    sendQuizEvent: sendQuizEvent,
    subscribeQuizEvents: subscribeQuizEvents,
    pushParkPlayerState: pushParkPlayerState,
    pushParkTeamState: pushParkTeamState,
    pushParkThrow: pushParkThrow,
    pushParkSabotage: pushParkSabotage,
    subscribeParkTeam: subscribeParkTeam,
    subscribeAllUsers: subscribeAllUsers,
    subscribeActiveRooms: subscribeActiveRooms,
    subscribeAdminLogs: subscribeAdminLogs,
    setUserBlock: setUserBlock,
    resetQuota: resetQuota,
    addAdminLog: addAdminLog
  };
})();
