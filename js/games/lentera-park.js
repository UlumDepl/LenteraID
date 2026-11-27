/**
 * Game 2: Lentera Park \u2014 Arena Luas 2.5D, Kamera Dinamis, Fullscreen & Kontrol Overlay Bening
 * - Dunia luas 2200 x 620 piksel per stage dengan kamera mengikuti karakter + minimap.
 * - 10 stage berbeda dengan tema warna lingkungan, objek 3D (peti kunci, gerbang pintu, tombol, pegas, balok, lift, duri).
 * - Mode layar penuh otomatis baik di PC maupun ponsel, dengan tombol kontrol overlay transparan bergaya modern.
 * - Skill iseng Lempar Batu (Batu Es, Batu Licin, Batu Dorong) + Sabotase tim lawan.
 */
window.LenteraGames = window.LenteraGames || {};
window.LenteraGames["lentera-park"] = (function () {
  var CORE = window.LenteraGameCore;
  var CONTENT = window.LenteraContent;
  var SPRITE = window.LenteraSprite;
  var FB = window.FirebaseBridge;

  var VIEW_W = 1120;
  var VIEW_H = 600;
  var WORLD_W = 3400;
  var WORLD_H = 660;
  var FLOOR_Y = 566;

  var SKILL_COOLDOWN = (window.LENTERA_CONFIG && window.LENTERA_CONFIG.SKILL_COOLDOWN_SEC) || 15;
  var SKILL_STYLES = {
    maniburst: { name: "Mani Burst",      color: "#FAF8EE", rim: "#E5DFC8", kind: "spray",     range: 310, duration: 0.72 },
    hop:       { name: "Lompatan Mistis", color: "#EEF2F5", rim: "#FFFFFF", kind: "ghostwave", speed: 460, duration: 1.55 },
    confuse:   { name: "Tawa Cekikikan",  color: "#B47CE6", rim: "#F0DCFF", kind: "sonic",     speed: 370, duration: 1.65 },
    shock:     { name: "Thunderbolt",     color: "#FFE047", rim: "#FFFBE0", kind: "lightning", range: 360, duration: 0.52 },
    whip:      { name: "Cambuk Kucing",   color: "#9B6BB0", rim: "#E7CEF5", kind: "whip",      range: 265, duration: 0.48 },
    lasso:     { name: "Lasso of Truth",  color: "#F5CE53", rim: "#FFF4C2", kind: "lasso",     range: 310, duration: 0.65 },
    smash:     { name: "Hulk Smash",      color: "#56B85C", rim: "#C8F5CA", kind: "smash",     range: 290, duration: 0.68 },
    atomic:    { name: "Atomic Breath",   color: "#4EC5F1", rim: "#DCF7FF", kind: "beam",      range: 440, duration: 0.78 },
    snap:      { name: "Infinity Snap",   color: "#A855F7", rim: "#F3D6FF", kind: "snap",      range: 350, duration: 0.75 }
  };

  var BIOMES = [
    { skyTop: "#D9E8E4", skyBot: "#F6EFE4", hillFar: "#A8C3BC", hillNear: "#7EA39A", top: "#4E8A6E", side: "#7D6148" },
    { skyTop: "#DCE6F2", skyBot: "#F4EFE8", hillFar: "#A9BDD4", hillNear: "#849FBE", top: "#53867E", side: "#7A6351" },
    { skyTop: "#EDE1D1", skyBot: "#F7EFE5", hillFar: "#CBB59B", hillNear: "#AD9172", top: "#6A8A58", side: "#845E43" },
    { skyTop: "#CFE6F5", skyBot: "#EEF6FB", hillFar: "#9AC2DC", hillNear: "#76A8C8", top: "#8BD0EC", side: "#5986A8" },
    { skyTop: "#E9DFD4", skyBot: "#F5ECE2", hillFar: "#C4AE9A", hillNear: "#A48B76", top: "#5C8568", side: "#7A5B47" },
    { skyTop: "#D6E3E8", skyBot: "#EFF3F5", hillFar: "#9FB8C4", hillNear: "#7B99A8", top: "#4C7D76", side: "#6B5A4E" },
    { skyTop: "#E8DDD1", skyBot: "#F3EAE0", hillFar: "#BFA995", hillNear: "#9B826D", top: "#6E7F5E", side: "#755844" },
    { skyTop: "#E6D5CE", skyBot: "#F5EAE4", hillFar: "#C4A398", hillNear: "#A17F74", top: "#6D7C62", side: "#6F534A" },
    { skyTop: "#D9DCF0", skyBot: "#EFEFF7", hillFar: "#A4ABD1", hillNear: "#7D86B5", top: "#4E7A85", side: "#5E556B" },
    { skyTop: "#131921", skyBot: "#202A36", hillFar: "#1A232E", hillNear: "#151D26", top: "#3A645E", side: "#2C343D" }
  ];

  // 10 Blueprint Stage Luas & Panjang (3400 x 660) \u2014 Stage Akhir memicu Scene Bos Terakhir
  var STAGES = [
    {
      num: 1, name: "Gerbang Pemanasan", biome: 0,
      hint: "Lompati tangga batu bertingkat, ambil Peti Kunci, lalu capai Gerbang Akhir.",
      spawn: { x: 90, y: 496 },
      chest: { x: 1860, y: 248 },
      door: { x: 3220, y: 474 },
      platforms: [
        { x: 0, y: FLOOR_Y, w: 3400, h: 94, kind: "ground" },
        { x: 420, y: 470, w: 220, h: 26, kind: "solid" },
        { x: 740, y: 396, w: 230, h: 26, kind: "solid" },
        { x: 1080, y: 326, w: 260, h: 26, kind: "solid" },
        { x: 1460, y: 376, w: 220, h: 26, kind: "solid" },
        { x: 1760, y: 300, w: 320, h: 26, kind: "solid" },
        { x: 2240, y: 432, w: 250, h: 26, kind: "solid" },
        { x: 2640, y: 370, w: 240, h: 26, kind: "solid" }
      ],
      springs: [{ x: 1380, y: FLOOR_Y - 16, w: 48, h: 16 }],
      switches: [], boxes: [], spikes: [], lifts: []
    },
    {
      num: 2, name: "Jembatan Kompak", biome: 1,
      hint: "Injak dua tombol pijakan untuk membuka jembatan panjang menuju Peti Kunci.",
      spawn: { x: 80, y: 496 },
      chest: { x: 2140, y: 268 },
      door: { x: 3220, y: 474 },
      platforms: [
        { x: 0, y: FLOOR_Y, w: 620, h: 94, kind: "ground" },
        { x: 620, y: FLOOR_Y, w: 380, h: 28, kind: "bridge", switchId: "sw1" },
        { x: 1000, y: FLOOR_Y, w: 660, h: 94, kind: "ground" },
        { x: 1660, y: FLOOR_Y, w: 360, h: 28, kind: "bridge", switchId: "sw2" },
        { x: 2020, y: FLOOR_Y, w: 1380, h: 94, kind: "ground" },
        { x: 1220, y: 440, w: 220, h: 26, kind: "solid" },
        { x: 2060, y: 320, w: 260, h: 26, kind: "solid" },
        { x: 2560, y: 422, w: 220, h: 26, kind: "solid" }
      ],
      switches: [
        { id: "sw1", x: 400, y: FLOOR_Y - 14, w: 62, h: 14, holdTimer: 0 },
        { id: "sw2", x: 1460, y: FLOOR_Y - 14, w: 62, h: 14, holdTimer: 0 }
      ],
      springs: [
        { x: 1080, y: FLOOR_Y - 16, w: 48, h: 16 },
        { x: 2090, y: FLOOR_Y - 16, w: 48, h: 16 }
      ],
      boxes: [], spikes: [], lifts: []
    },
    {
      num: 3, name: "Balok Berat", biome: 2,
      hint: "Dorong balok kayu mendekati tebing untuk memanjat lintasan bertingkat.",
      spawn: { x: 80, y: 496 },
      chest: { x: 2260, y: 248 },
      door: { x: 3220, y: 474 },
      platforms: [
        { x: 0, y: FLOOR_Y, w: 3400, h: 94, kind: "ground" },
        { x: 840, y: 438, w: 240, h: 26, kind: "solid" },
        { x: 1180, y: 374, w: 230, h: 26, kind: "solid" },
        { x: 1520, y: 430, w: 240, h: 26, kind: "solid" },
        { x: 1880, y: 356, w: 240, h: 26, kind: "solid" },
        { x: 2180, y: 300, w: 270, h: 26, kind: "solid" },
        { x: 2660, y: 416, w: 220, h: 26, kind: "solid" }
      ],
      boxes: [
        { x: 520, y: FLOOR_Y - 56, w: 56, h: 56 },
        { x: 1700, y: FLOOR_Y - 56, w: 56, h: 56 }
      ],
      switches: [], springs: [{ x: 2480, y: FLOOR_Y - 16, w: 48, h: 16 }], spikes: [], lifts: []
    },
    {
      num: 4, name: "Lantai Es Licin", biome: 3,
      hint: "Permukaan es sangat licin. Kendalikan momentum melintasi celah panjang.",
      iceFloor: true,
      spawn: { x: 80, y: 496 },
      chest: { x: 2160, y: 232 },
      door: { x: 3220, y: 474 },
      platforms: [
        { x: 0, y: FLOOR_Y, w: 680, h: 94, kind: "ice" },
        { x: 800, y: FLOOR_Y, w: 680, h: 94, kind: "ice" },
        { x: 1620, y: FLOOR_Y, w: 640, h: 94, kind: "ice" },
        { x: 2380, y: FLOOR_Y, w: 1020, h: 94, kind: "ice" },
        { x: 580, y: 444, w: 230, h: 24, kind: "ice" },
        { x: 1020, y: 376, w: 240, h: 24, kind: "ice" },
        { x: 1420, y: 332, w: 230, h: 24, kind: "ice" },
        { x: 2080, y: 284, w: 270, h: 24, kind: "ice" },
        { x: 2620, y: 410, w: 230, h: 24, kind: "ice" }
      ],
      springs: [
        { x: 860, y: FLOOR_Y - 16, w: 48, h: 16 },
        { x: 1940, y: FLOOR_Y - 16, w: 48, h: 16 }
      ],
      switches: [], boxes: [], spikes: [], lifts: []
    },
    {
      num: 5, name: "Lampu Merah Hijau", biome: 4,
      hint: "Berhenti setiap kali lampu merah menyala di lintasan panjang ini.",
      stopAndGo: true,
      spawn: { x: 80, y: 496 },
      chest: { x: 2160, y: 272 },
      door: { x: 3220, y: 474 },
      platforms: [
        { x: 0, y: FLOOR_Y, w: 3400, h: 94, kind: "ground" },
        { x: 460, y: 468, w: 230, h: 26, kind: "solid" },
        { x: 820, y: 400, w: 240, h: 26, kind: "solid" },
        { x: 1200, y: 344, w: 240, h: 26, kind: "solid" },
        { x: 1600, y: 396, w: 240, h: 26, kind: "solid" },
        { x: 2040, y: 324, w: 290, h: 26, kind: "solid" },
        { x: 2620, y: 420, w: 240, h: 26, kind: "solid" }
      ],
      switches: [], springs: [{ x: 1890, y: FLOOR_Y - 16, w: 48, h: 16 }], boxes: [], spikes: [], lifts: []
    },
    {
      num: 6, name: "Tali Seirama", biome: 5,
      hint: "Bergerak selaras melewati gugusan pijakan udara panjang.",
      tether: true,
      spawn: { x: 80, y: 496 },
      chest: { x: 2120, y: 266 },
      door: { x: 3220, y: 474 },
      platforms: [
        { x: 0, y: FLOOR_Y, w: 500, h: 94, kind: "ground" },
        { x: 580, y: 494, w: 230, h: 26, kind: "solid" },
        { x: 890, y: 432, w: 240, h: 26, kind: "solid" },
        { x: 1220, y: 374, w: 240, h: 26, kind: "solid" },
        { x: 1560, y: 420, w: 240, h: 26, kind: "solid" },
        { x: 1960, y: 318, w: 320, h: 26, kind: "solid" },
        { x: 2380, y: FLOOR_Y, w: 1020, h: 94, kind: "ground" },
        { x: 2680, y: 422, w: 230, h: 26, kind: "solid" }
      ],
      switches: [], springs: [{ x: 1840, y: 404, w: 48, h: 16 }], boxes: [], spikes: [], lifts: []
    },
    {
      num: 7, name: "Lantai Runtuh", biome: 6,
      hint: "Pijakan kayu retak menghilang setelah diinjak. Jangan berhenti terlalu lama.",
      spawn: { x: 80, y: 496 },
      chest: { x: 2180, y: 274 },
      door: { x: 3220, y: 474 },
      platforms: [
        { x: 0, y: FLOOR_Y, w: 460, h: 94, kind: "ground" },
        { x: 540, y: 498, w: 190, h: 24, kind: "crumble", timer: 0, gone: 0 },
        { x: 810, y: 444, w: 190, h: 24, kind: "crumble", timer: 0, gone: 0 },
        { x: 1080, y: 392, w: 220, h: 26, kind: "solid" },
        { x: 1380, y: 430, w: 190, h: 24, kind: "crumble", timer: 0, gone: 0 },
        { x: 1660, y: 378, w: 190, h: 24, kind: "crumble", timer: 0, gone: 0 },
        { x: 1980, y: 326, w: 340, h: 26, kind: "solid" },
        { x: 2420, y: FLOOR_Y, w: 980, h: 94, kind: "ground" },
        { x: 2680, y: 426, w: 220, h: 26, kind: "solid" }
      ],
      switches: [], springs: [], boxes: [], spikes: [], lifts: []
    },
    {
      num: 8, name: "Taman Duri & Lift", biome: 7,
      hint: "Naiki tiga lift bergerak dan hindari deretan duri tajam di bawah.",
      spawn: { x: 80, y: 496 },
      chest: { x: 2180, y: 230 },
      door: { x: 3220, y: 474 },
      platforms: [
        { x: 0, y: FLOOR_Y, w: 3400, h: 94, kind: "ground" },
        { x: 1320, y: 356, w: 220, h: 26, kind: "solid" },
        { x: 2040, y: 282, w: 300, h: 26, kind: "solid" },
        { x: 2680, y: 416, w: 230, h: 26, kind: "solid" }
      ],
      lifts: [
        { x: 640, y: 420, w: 170, h: 22, baseY: 380, range: 115, phase: 0 },
        { x: 1000, y: 340, w: 170, h: 22, baseY: 330, range: 95, phase: 1.7 },
        { x: 1680, y: 340, w: 170, h: 22, baseY: 340, range: 105, phase: 3.1 }
      ],
      spikes: [
        { x: 460, y: FLOOR_Y - 22, w: 104, h: 22 },
        { x: 900, y: FLOOR_Y - 22, w: 112, h: 22 },
        { x: 1580, y: FLOOR_Y - 22, w: 112, h: 22 },
        { x: 2440, y: FLOOR_Y - 22, w: 96, h: 22 }
      ],
      switches: [], springs: [], boxes: []
    },
    {
      num: 9, name: "Kejar Waktu", biome: 8,
      hint: "Padukan tombol, pegas, dan lompatan cepat sebelum waktu stage habis.",
      stageTimeLimit: 95,
      spawn: { x: 80, y: 496 },
      chest: { x: 2220, y: 220 },
      door: { x: 3220, y: 474 },
      platforms: [
        { x: 0, y: FLOOR_Y, w: 560, h: 94, kind: "ground" },
        { x: 560, y: FLOOR_Y, w: 360, h: 28, kind: "bridge", switchId: "sw9" },
        { x: 920, y: FLOOR_Y, w: 2480, h: 94, kind: "ground" },
        { x: 1180, y: 380, w: 220, h: 26, kind: "solid" },
        { x: 1580, y: 322, w: 230, h: 26, kind: "solid" },
        { x: 2080, y: 272, w: 300, h: 26, kind: "solid" },
        { x: 2660, y: 416, w: 230, h: 26, kind: "solid" }
      ],
      switches: [{ id: "sw9", x: 360, y: FLOOR_Y - 14, w: 62, h: 14, holdTimer: 0 }],
      springs: [
        { x: 990, y: FLOOR_Y - 16, w: 48, h: 16 },
        { x: 1420, y: FLOOR_Y - 16, w: 48, h: 16 },
        { x: 1920, y: FLOOR_Y - 16, w: 48, h: 16 }
      ],
      spikes: [
        { x: 1740, y: FLOOR_Y - 22, w: 110, h: 22 },
        { x: 2460, y: FLOOR_Y - 22, w: 96, h: 22 }
      ],
      boxes: [], lifts: []
    },
    {
      num: 10, name: "Benteng Bayangan", biome: 9,
      hint: "Stage gelap diterangi lentera. Rebut Peti Kunci lalu hadapi Bos Terakhir di ujung arena.",
      darkMode: true,
      spawn: { x: 80, y: 496 },
      chest: { x: 2140, y: 234 },
      door: { x: 3220, y: 474 },
      platforms: [
        { x: 0, y: FLOOR_Y, w: 520, h: 94, kind: "ground" },
        { x: 520, y: FLOOR_Y, w: 340, h: 28, kind: "bridge", switchId: "sw10" },
        { x: 860, y: FLOOR_Y, w: 2540, h: 94, kind: "ground" },
        { x: 1120, y: 414, w: 190, h: 24, kind: "crumble", timer: 0, gone: 0 },
        { x: 1460, y: 356, w: 220, h: 26, kind: "solid" },
        { x: 1800, y: 310, w: 190, h: 24, kind: "crumble", timer: 0, gone: 0 },
        { x: 2040, y: 286, w: 280, h: 26, kind: "solid" },
        { x: 2640, y: 416, w: 240, h: 26, kind: "solid" }
      ],
      switches: [{ id: "sw10", x: 330, y: FLOOR_Y - 14, w: 62, h: 14, holdTimer: 0 }],
      springs: [
        { x: 960, y: FLOOR_Y - 16, w: 48, h: 16 },
        { x: 1700, y: FLOOR_Y - 16, w: 48, h: 16 }
      ],
      spikes: [{ x: 1300, y: FLOOR_Y - 22, w: 112, h: 22 }],
      boxes: [], lifts: []
    }
  ];

  function cloneStage(idx) {
    return JSON.parse(JSON.stringify(STAGES[idx % STAGES.length]));
  }

  function create(mountEl, cfg) {
    var totalStages = Math.max(3, Math.min(10, Number(cfg.stageCount) || 3));
    var isMabar = Boolean(cfg.isMabar && cfg.roomCode);
    var teamId = cfg.teamId || "solo";
    var teamName = cfg.teamName || "Solo";

    var questions = CONTENT.buildPlayerQuestionSet({
      subject: cfg.subject || "indonesia",
      fallbackSubject: cfg.fallbackSubject || "indonesia",
      totalCount: totalStages + 8,
      difficulty: cfg.difficulty || "sedang",
      playerSeed: String(cfg.seed || Date.now()) + ":park:" + teamId,
      aiItems: cfg.aiItems || [],
      onlyMcq: true
    });
    var questionCursor = 0;

    var state = "playing";
    var currentStageIdx = 0;
    var stage = cloneStage(0);
    var score = 0;
    var correctCount = 0;
    var wrongCount = 0;
    var hasKey = false;
    var keyHolderUid = "";
    var doorOpen = false;
    var teamEnergy = 0;
    var diffKey = String(cfg.difficulty || "sedang").toLowerCase();
    var maxLives = diffKey === "mudah" ? 5 : (diffKey === "sulit" ? 3 : 4);
    var lives = maxLives;
    var isEliminated = false;
    var stageTimer = 0;
    var redLight = false;
    var lightCycleTimer = 3.5;

    var cam = { x: 0, y: 0 };

    var myChar = cfg.character || { id: "ermus", name: "ermus", primary: "#5C5E3E", accent: "#E6B43C", skillId: "maniburst", skillName: "Mani Burst" };
    var me = {
      x: stage.spawn.x, y: stage.spawn.y, w: 34, h: 50,
      vx: 0, vy: 0, facing: 1, onGround: false,
      coyote: 0, jumpBuf: 0, phase: 0,
      shockTimer: 0, lassoTimer: 0, confuseTimer: 0, hopTimer: 0, snapTimer: 0, stickyTimer: 0, slipTimer: 0, hitTimer: 0,
      skillCd: 0, inDoor: false
    };

    var remotePlayers = {};
    var projectiles = [];
    var areaEffects = []; // { kind: 'aoe'|'beam', x, y, facing, range, color, rim, life, maxLife }
    var screenShake = 0;
    var particles = [];
    // State Scene Bos Terakhir (muncul di akhir stage penentu final)
    var boss = {
      active: false,
      defeated: false,
      x: 2940,
      y: FLOOR_Y - 122,
      w: 88,
      h: 112,
      vx: -115,
      hp: 100,
      maxHp: 100,
      hurtTimer: 0,
      attackCd: 2.2,
      phase: 0,
      orbReady: true,
      orbX: 2620,
      orbY: FLOOR_Y - 150,
      orbRespawn: 0
    };
    var bossShots = [];
    var bossQuizActive = false;
    var bannerText = "";
    var bannerGood = true;
    var bannerTimer = 0;
    var rafId = null;
    var lastTs = 0;
    var lastRtdbPush = 0;
    var quizTimerId = null;
    var unsubPark = null;
    var ignoreRotatePrompt = false;
    var keys = { left: false, right: false };

    // === Fullscreen Container + Floating Translucent HUD + Glassmorphism Controls ===
    mountEl.textContent = "";
    var root = document.createElement("div");
    root.className = "park-fullscreen-stage";

    var canvas = document.createElement("canvas");
    canvas.className = "park-full-canvas";
    root.appendChild(canvas);

    // HUD Melayang Bening di Atas Layar
    var floatHud = document.createElement("div");
    floatHud.className = "park-float-hud";
    floatHud.innerHTML =
      '<div class="park-hud-left">' +
      '<span class="park-glass-pill" id="park-hud-stage">Stage 1</span>' +
      '<span class="park-glass-pill" id="park-hud-status">Cari Peti Kunci</span>' +
      '<span class="park-glass-pill" id="park-hud-score">Skor 0</span>' +
      '</div>' +
      '<div class="park-hud-right">' +
      '<button type="button" class="park-glass-icon" data-hud="fullscreen" aria-label="Layar penuh" title="Layar penuh">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>' +
      '</button>' +
      '<button type="button" class="park-glass-icon" data-hud="mute" aria-label="Suara" title="Suara">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>' +
      '</button>' +
      '<button type="button" class="park-glass-icon" data-hud="pause" aria-label="Jeda" title="Jeda">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' +
      '</button>' +
      '<button type="button" class="park-glass-icon park-glass-danger" data-hud="exit" aria-label="Keluar" title="Keluar">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>' +
      '</div>';
    root.appendChild(floatHud);

    // Hint Stage Melayang Ringkas
    var floatHint = document.createElement("div");
    floatHint.className = "park-float-hint";
    root.appendChild(floatHint);

    // Overlay Kontrol Bening (Multi-Touch Android & Klik PC)
    var touchOverlay = document.createElement("div");
    touchOverlay.className = "park-overlay-controls";
    touchOverlay.innerHTML =
      '<div class="park-pad-group">' +
      '<button type="button" class="park-glass-ctrl" data-pad="left" aria-label="Kiri">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
      '</button>' +
      '<button type="button" class="park-glass-ctrl" data-pad="right" aria-label="Kanan">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
      '</button>' +
      '</div>' +
      '<div class="park-pad-group park-pad-actions">' +
      '<button type="button" class="park-glass-ctrl park-glass-skill hidden" data-pad="sabotage" aria-label="Sabotase">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' +
      '<span>Sabotase</span>' +
      '</button>' +
      '<button type="button" class="park-glass-ctrl park-glass-skill" data-pad="throw" aria-label="Skill karakter">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' +
      '<span data-throw-label>Skill</span>' +
      '</button>' +
      '<button type="button" class="park-glass-ctrl park-glass-jump" data-pad="jump" aria-label="Lompat">' +
      '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>' +
      '</button>' +
      '</div>';
    root.appendChild(touchOverlay);

    // Overlay Wajib Mendatar di Ponsel Potret
    var rotateOverlay = document.createElement("div");
    rotateOverlay.className = "park-rotate-overlay hidden";
    rotateOverlay.innerHTML =
      '<div class="park-rotate-card">' +
      '<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>' +
      '</svg>' +
      '<h4>Putar Ponsel ke Posisi Mendatar</h4>' +
      '<p>Posisi mendatar membuat lintasan luas dan tombol kontrol jauh lebih nyaman digunakan.</p>' +
      '<div class="quiz-feedback-actions" style="justify-content:center;">' +
      '<button type="button" class="btn btn-primary btn-sm" data-act="go-landscape">Layar Penuh Mendatar</button>' +
      '<button type="button" class="btn btn-outline btn-sm" data-act="skip-landscape">Lanjutkan</button>' +
      '</div></div>';
    root.appendChild(rotateOverlay);

    // Overlay Pertanyaan Peti Kunci
    var quizOverlay = document.createElement("div");
    quizOverlay.className = "park-quiz-overlay hidden no-select";
    root.appendChild(quizOverlay);

    mountEl.appendChild(root);

    var ctx = CORE.setupHiDpiCanvas(canvas, VIEW_W, VIEW_H);
    var elHudStage = floatHud.querySelector("#park-hud-stage");
    var elHudStatus = floatHud.querySelector("#park-hud-status");
    var elHudScore = floatHud.querySelector("#park-hud-score");
    var throwBtn = touchOverlay.querySelector('[data-pad="throw"]');
    var throwLabel = touchOverlay.querySelector("[data-throw-label]");
    var sabBtn = touchOverlay.querySelector('[data-pad="sabotage"]');

    function checkOrientation() {
      var isPortraitPhone = window.innerHeight > window.innerWidth && window.innerWidth < 860;
      rotateOverlay.classList.toggle("hidden", ignoreRotatePrompt || !isPortraitPhone);
    }

    var isAndroidDevice = /Android/i.test(navigator.userAgent || "");

    async function ensureAndroidLandscapeFullscreen() {
      try {
        if (!document.fullscreenElement) {
          if (root.requestFullscreen) await root.requestFullscreen();
          else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
          else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        }
        if (screen.orientation && typeof screen.orientation.lock === "function") {
          await screen.orientation.lock("landscape").catch(function () {});
        }
      } catch (e) {}
    }

    async function toggleFullscreen() {
      try {
        if (!document.fullscreenElement) {
          await ensureAndroidLandscapeFullscreen();
        } else if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (e) { /* sebagian browser membatasi fullscreen */ }
    }

    if (isAndroidDevice) {
      ensureAndroidLandscapeFullscreen();
      var autoFsOnce = function () {
        if (!document.fullscreenElement) ensureAndroidLandscapeFullscreen();
        root.removeEventListener("pointerdown", autoFsOnce);
      };
      root.addEventListener("pointerdown", autoFsOnce, { passive: true });
    }

    floatHud.querySelector('[data-hud="fullscreen"]').addEventListener("click", toggleFullscreen);
    floatHud.querySelector('[data-hud="mute"]').addEventListener("click", function () {
      var muted = CORE.Sound.toggleMute();
      showBanner(muted ? "Suara dimatikan" : "Suara diaktifkan", true);
    });
    floatHud.querySelector('[data-hud="pause"]').addEventListener("click", function () {
      if (state === "playing") state = "paused";
      else if (state === "paused") { state = "playing"; lastTs = performance.now(); }
    });
    floatHud.querySelector('[data-hud="exit"]').addEventListener("click", function () {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(function () {});
      }
      if (cfg.onExit) cfg.onExit();
    });

    rotateOverlay.querySelector('[data-act="go-landscape"]').addEventListener("click", async function () {
      await toggleFullscreen();
      ignoreRotatePrompt = true;
      rotateOverlay.classList.add("hidden");
    });
    rotateOverlay.querySelector('[data-act="skip-landscape"]').addEventListener("click", function () {
      ignoreRotatePrompt = true;
      rotateOverlay.classList.add("hidden");
    });

    function showBanner(msg, good) {
      bannerText = msg;
      bannerGood = Boolean(good);
      bannerTimer = 2.4;
    }

    function spawnParticles(x, y, color, count) {
      for (var i = 0; i < (count || 10); i++) {
        var ang = Math.random() * Math.PI * 2;
        var spd = 45 + Math.random() * 145;
        particles.push({
          x: x, y: y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 60,
          size: 3 + Math.random() * 4,
          life: 0.45 + Math.random() * 0.25,
          maxLife: 0.7,
          color: color
        });
      }
    }

    function pushHud() {
      var isFinalStageNow = currentStageIdx === totalStages - 1;
      var statusLabel = boss.active && !boss.defeated
        ? ("Bos Terakhir: HP " + Math.max(0, Math.round(boss.hp)) + "%")
        : (stage.stageTimeLimit
          ? (Math.ceil(stageTimer) + " detik")
          : (hasKey ? (isFinalStageNow && !boss.defeated ? "Hadapi Bos Terakhir" : "Menuju Gerbang") : "Cari Peti Kunci"));
      if (elHudStage) elHudStage.textContent = "Stage " + (currentStageIdx + 1) + "/" + totalStages + " \u2022 " + stage.name;
      if (elHudStatus) elHudStatus.textContent = statusLabel;
      if (elHudScore) elHudScore.textContent = "Skor " + score;
      
      if (cfg.onHudUpdate) {
      cfg.onHudUpdate({
        progress: "Stage " + (currentStageIdx + 1) + "/" + totalStages + " \u2022 " + stage.name,
        score: score,
        timer: statusLabel,
        playerCount: isMabar ? (Object.keys(remotePlayers).length + 1) : 0 // TAMBAHAN INI
      });
    }

      if (throwBtn && throwLabel) {
        var shortSkill = String(myChar.skillName || "Skill").split(" ")[0];
        throwLabel.textContent = me.skillCd > 0 ? (Math.ceil(me.skillCd) + " dtk") : shortSkill;
        throwBtn.disabled = me.skillCd > 0;
      }
      if (sabBtn) {
        sabBtn.classList.toggle("hidden", !isMabar || teamEnergy < 100);
      }
    }

    function syncScore(force) {
      if (cfg.onScore) {
        cfg.onScore({
          score: score,
          stage: currentStageIdx + 1,
          missionsDone: correctCount,
          finished: state === "ended"
        }, Boolean(force));
      }
    }

    function loadStage(idx) {
      currentStageIdx = idx;
      stage = cloneStage(idx);
      hasKey = false;
      keyHolderUid = "";
      doorOpen = false;
      projectiles = [];
      areaEffects = [];
      particles = [];
      bossShots = [];
      bossQuizActive = false;
      boss.active = false;
      boss.defeated = false;
      boss.hp = boss.maxHp;
      boss.x = 2940;
      boss.y = FLOOR_Y - boss.h - 10;
      boss.vx = -115;
      boss.hurtTimer = 0;
      boss.attackCd = 2.0;
      boss.orbReady = true;
      boss.orbRespawn = 0;
      screenShake = 0;
      redLight = false;
      lightCycleTimer = 3.5;
      stageTimer = stage.stageTimeLimit || 0;

      me.x = stage.spawn.x;
      me.y = stage.spawn.y;
      me.vx = 0; me.vy = 0;
      me.shockTimer = 0; me.lassoTimer = 0; me.confuseTimer = 0;
      me.hopTimer = 0; me.snapTimer = 0; me.stickyTimer = 0; me.slipTimer = 0; me.hitTimer = 0;
      me.inDoor = false;

      cam.x = 0;
      cam.y = 0;

      floatHint.textContent = (idx === totalStages - 1) ? (stage.hint + " Stage final: kalahkan Bos Terakhir untuk membuka gerbang kemenangan!") : stage.hint;
      pushHud();

      if (isMabar && cfg.uid) {
        FB.pushParkTeamState(cfg.roomCode, teamId, {
          stageIdx: idx,
          hasKey: false,
          keyHolderUid: "",
          doorOpen: false
        });
      }
    }

    function getCharById(id) {
      var list = (window.LENTERA_CONFIG && window.LENTERA_CONFIG.CHARACTERS) || [];
      return list.find(function (c) { return c.id === id; }) || list[0] || myChar;
    }

    function isStunned() {
      return me.shockTimer > 0 || me.lassoTimer > 0;
    }

    function applySkillHitOnMe(skillId, fromName, sourceX, facingDir) {
      if (skillId === "maniburst") {
        me.vx = (facingDir || 1) * 410;
        me.vy = -240;
        me.stickyTimer = 2.5;
        me.slipTimer = 1.4;
        me.hitTimer = 0.7;
        screenShake = 0.24;
        CORE.Sound.spring();
        spawnParticles(me.x + 17, me.y + 24, "#FAF8EE", 18);
        spawnParticles(me.x + 17, me.y + 24, "#E5DFC8", 10);
        showBanner((fromName || "Ermus") + " menyemburmu dengan Mani Burst.", false);
      } else if (skillId === "hop") {
        me.hopTimer = 2.5;
        CORE.Sound.spring();
        spawnParticles(me.x + 17, me.y + 24, "#EEF2F5", 12);
        showBanner((fromName || "Rekan") + " memakai Lompatan Mistis.", false);
      } else if (skillId === "confuse") {
        me.confuseTimer = 3.0;
        CORE.Sound.wrong();
        spawnParticles(me.x + 17, me.y + 12, "#B47CE6", 12);
        showBanner((fromName || "Rekan") + " membalik arah kontrolmu dengan Tawa Cekikikan.", false);
      } else if (skillId === "shock") {
        me.shockTimer = 2.2;
        CORE.Sound.freeze();
        spawnParticles(me.x + 17, me.y + 24, "#FFE047", 16);
        showBanner((fromName || "Rekan") + " menyetrummu dengan Thunderbolt.", false);
      } else if (skillId === "whip") {
        var pullDir = Math.sign((sourceX || me.x) - me.x) || -(facingDir || 1);
        me.vx = pullDir * 360;
        me.vy = -240;
        me.hitTimer = 1.4;
        score = Math.max(0, score - 40);
        CORE.Sound.wrong();
        spawnParticles(me.x + 17, me.y + 24, "#9B6BB0", 12);
        showBanner((fromName || "Rekan") + " menarikmu dengan Cambuk Kucing: -40 poin.", false);
        syncScore(true);
      } else if (skillId === "lasso") {
        me.lassoTimer = 2.5;
        CORE.Sound.shield();
        spawnParticles(me.x + 17, me.y + 24, "#F5CE53", 14);
        showBanner((fromName || "Rekan") + " mengikatmu dengan Lasso of Truth.", false);
      } else if (skillId === "smash") {
        var pushDir = Math.sign(me.x - (sourceX || 0)) || 1;
        me.vx = pushDir * 440;
        me.vy = -480;
        me.onGround = false;
        me.hitTimer = 0.9;
        screenShake = 0.45;
        CORE.Sound.ulti();
        spawnParticles(me.x + 17, me.y + 44, "#56B85C", 16);
        showBanner((fromName || "Rekan") + " mementalkanmu dengan Hulk Smash.", false);
      } else if (skillId === "atomic") {
        me.vx = (facingDir || 1) * 460;
        me.vy = -260;
        me.slipTimer = 2.5;
        screenShake = 0.35;
        CORE.Sound.ulti();
        spawnParticles(me.x + 17, me.y + 24, "#4EC5F1", 18);
        showBanner((fromName || "Rekan") + " menyemburmu dengan Atomic Breath.", false);
      } else if (skillId === "snap") {
        me.snapTimer = 3.5;
        CORE.Sound.freeze();
        spawnParticles(me.x + 17, me.y + 24, "#A855F7", 18);
        showBanner((fromName || "Rekan") + " menyusutkanmu dengan Infinity Snap.", false);
      }
    }

    function spawnSkillEffect(th) {
      var sId = th.skillId || "maniburst";
      var st = SKILL_STYLES[sId] || SKILL_STYLES.maniburst;
      var dur = Number(th.life || st.duration || 0.7);
      if (st.kind === "ghostwave" || st.kind === "sonic") {
        projectiles.push({
          skillId: sId,
          kind: st.kind,
          x: th.x,
          y: th.y,
          vx: (th.facing || 1) * (st.speed || 420),
          vy: 0,
          facing: th.facing || 1,
          fromUid: th.fromUid || "solo",
          fromName: th.fromName || "Rekan",
          life: dur,
          maxLife: dur
        });
      } else {
        var extraDrops = [];
        if (st.kind === "spray") {
          for (var i = 0; i < 9; i++) {
            var spread = (i - 4) * 0.14;
            var spd = 260 + (i % 3) * 75;
            extraDrops.push({
              x: th.x + (th.facing || 1) * 14,
              y: th.y,
              vx: Math.cos(spread) * spd * (th.facing || 1),
              vy: Math.sin(spread) * spd - 65,
              r: 4 + (i % 3) * 2
            });
          }
        } else if (st.kind === "smash") {
          for (var b = 0; b < 8; b++) {
            var side = b < 4 ? -1 : 1;
            extraDrops.push({
              x: th.x + side * (22 + (b % 4) * 28),
              y: th.y + 24,
              vx: side * (95 + (b % 4) * 45),
              vy: -(210 + (b % 3) * 75),
              r: 6 + (b % 3) * 3
            });
          }
        }
        areaEffects.push({
          kind: st.kind,
          skillId: sId,
          x: th.x,
          y: th.y,
          facing: th.facing || 1,
          range: th.range || st.range || 300,
          color: st.color,
          rim: st.rim,
          fromUid: th.fromUid || "solo",
          fromName: th.fromName || "Rekan",
          drops: extraDrops,
          life: dur,
          maxLife: dur
        });
      }
    }

    function triggerRockThrow() {
      CORE.Sound.unlock();
      if (state !== "playing" || me.skillCd > 0 || isStunned()) return;

      var sId = myChar.skillId || "maniburst";
      var st = SKILL_STYLES[sId] || SKILL_STYLES.maniburst;
      me.skillCd = (boss.active && !boss.defeated) ? 4 : SKILL_COOLDOWN;

      var originX = me.x + me.w / 2;
      var originY = st.kind === "ghostwave" ? (me.y + me.h - 10) : (me.y + 22);
      var payload = {
        skillId: sId,
        kind: st.kind,
        x: originX,
        y: originY,
        facing: me.facing,
        range: st.range || 0,
        fromUid: cfg.uid || "solo",
        fromName: cfg.playerName || myChar.name,
        life: st.duration || 0.7
      };

      if (sId === "smash" || sId === "atomic" || sId === "shock") screenShake = 0.38;
      if (sId === "maniburst") screenShake = 0.16;

      if (sId === "shock" || sId === "atomic" || sId === "smash" || sId === "snap") CORE.Sound.ulti();
      else if (sId === "lasso") CORE.Sound.shield();
      else if (sId === "maniburst" || sId === "hop") CORE.Sound.spring();
      else CORE.Sound.throwRock();

      spawnSkillEffect(payload);
      spawnParticles(originX + me.facing * 18, originY, st.color, 14);
      if (boss.active && !boss.defeated && st.kind !== "ghostwave" && st.kind !== "sonic") {
        var bCx = boss.x + boss.w / 2;
        var bCy = boss.y + boss.h / 2;
        var rngB = st.range || 320;
        var dxB = (bCx - originX) * me.facing;
        var hitBoss = (st.kind === "smash" || st.kind === "snap")
          ? (Math.hypot(bCx - originX, bCy - originY) <= rngB + 55)
          : (dxB >= -30 && dxB <= rngB + 55 && Math.abs(bCy - originY) <= 130);
        if (hitBoss) damageBoss(25, myChar.skillName);
      }

      if (isMabar) FB.pushParkThrow(cfg.roomCode, teamId, payload);
      showBanner(myChar.name + " menggunakan " + myChar.skillName, true);
      pushHud();
    }

    function triggerSabotage() {
      CORE.Sound.unlock();
      if (!isMabar || teamEnergy < 100 || state !== "playing") return;
      var rivals = (typeof cfg.getRivalTeams === "function" ? cfg.getRivalTeams() : [])
        .filter(function (t) { return t.teamId && t.teamId !== teamId; });
      teamEnergy = 0;
      CORE.Sound.ulti();

      if (rivals.length > 0) {
        var target = rivals[0];
        FB.pushParkSabotage(cfg.roomCode, target.teamId, {
          skillId: myChar.skillId || "shock",
          fromTeam: teamName,
          fromName: myChar.name
        });
        showBanner("Skill " + myChar.skillName + " dikirim ke " + target.teamName, true);
      } else {
        score += 100;
        showBanner("Bonus energi tim +100 poin", true);
      }
      pushHud();
    }

    function damageBoss(dmg, sourceLabel) {
      if (!boss.active || boss.defeated) return;
      boss.hp = Math.max(0, boss.hp - dmg);
      boss.hurtTimer = 0.45;
      screenShake = 0.35;
      score += dmg * 4;
      CORE.Sound.ulti();
      spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, "#F5CE53", 20);
      spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, "#E07A7A", 14);
      if (boss.hp <= 0) {
        boss.defeated = true;
        boss.active = false;
        bossShots = [];
        doorOpen = true;
        score += 500;
        CORE.Sound.win();
        spawnParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, "#FFE07D", 38);
        showBanner("BOS TERAKHIR KALAH! +500 poin. Gerbang Kemenangan terbuka!", true);
        syncScore(true);
      } else {
        showBanner((sourceLabel || "Serangan") + " mengenai Bos! (-" + dmg + "% HP)", true);
      }
      pushHud();
    }

    function openBossQuizStrike() {
      if (state !== "playing" || !boss.active || boss.defeated || bossQuizActive) return;
      bossQuizActive = true;
      boss.orbReady = false;
      boss.orbRespawn = 7.5;
      state = "quiz";
      keys.left = false; keys.right = false;
      if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; }

      var q = questions[questionCursor % questions.length];
      questionCursor += 1;
      var qTimeLeft = 20;

      quizOverlay.textContent = "";
      quizOverlay.classList.remove("hidden");

      var card = document.createElement("div");
      card.className = "park-quiz-card";

      var head = document.createElement("div");
      head.className = "seq-timer-row";
      var tag = document.createElement("span");
      tag.className = "quiz-category-tag";
      tag.textContent = "Kristal Serangan Bos Terakhir (-40% HP Bos)";
      var timerEl = document.createElement("strong");
      timerEl.textContent = qTimeLeft + " detik";
      head.appendChild(tag);
      head.appendChild(timerEl);

      var promptEl = document.createElement("h4");
      promptEl.className = "quiz-question";
      promptEl.style.margin = "8px 0 12px";
      CONTENT.renderRichText(promptEl, q.prompt);

      var optBox = document.createElement("div");
      optBox.className = "quiz-options";
      var fbEl = document.createElement("p");
      fbEl.className = "step-note hidden";
      fbEl.style.marginTop = "10px";

      var locked = false;
      function finishStrike(isRight) {
        if (locked) return;
        locked = true;
        if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; }
        if (isRight) {
          correctCount += 1;
          fbEl.textContent = "Serangan Kritis Lentera berhasil! Bos kehilangan 40% HP!";
          fbEl.classList.remove("hidden");
        } else {
          wrongCount += 1;
          CORE.Sound.wrong();
          fbEl.textContent = "Melenceng! " + (q.explanation || "Coba serang dengan skill karaktermu.");
          fbEl.classList.remove("hidden");
        }
        setTimeout(function () {
          quizOverlay.classList.add("hidden");
          bossQuizActive = false;
          state = "playing";
          lastTs = performance.now();
          if (isRight) damageBoss(40, "Kristal Lentera");
          pushHud();
        }, 1200);
      }

      var letters = ["A", "B", "C", "D"];
      (q.options || []).forEach(function (optText, idx) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "option-btn";
        var kEl = document.createElement("span");
        kEl.className = "option-key";
        kEl.textContent = letters[idx] || String(idx + 1);
        var tEl = document.createElement("span");
        CONTENT.renderRichText(tEl, optText);
        btn.appendChild(kEl);
        btn.appendChild(tEl);
        btn.addEventListener("click", function () {
          if (locked) return;
          optBox.querySelectorAll(".option-btn").forEach(function (b, i) {
            b.disabled = true;
            if (i === q.answer) b.classList.add("correct");
            if (i === idx && idx !== q.answer) b.classList.add("wrong");
          });
          finishStrike(idx === q.answer);
        });
        optBox.appendChild(btn);
      });

      card.appendChild(head);
      card.appendChild(promptEl);
      card.appendChild(optBox);
      card.appendChild(fbEl);
      quizOverlay.appendChild(card);

      quizTimerId = setInterval(function () {
        if (state !== "quiz") return;
        qTimeLeft -= 1;
        timerEl.textContent = qTimeLeft + " detik";
        if (qTimeLeft <= 0) finishStrike(false);
      }, 1000);
    }

    function openKeyChestQuiz() {
      if (state !== "playing" || hasKey) return;
      state = "quiz";
      keys.left = false; keys.right = false;
      if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; }

      var q = questions[questionCursor % questions.length];
      questionCursor += 1;
      var qTimeLeft = 25;

      quizOverlay.textContent = "";
      quizOverlay.classList.remove("hidden");

      var card = document.createElement("div");
      card.className = "park-quiz-card";

      var head = document.createElement("div");
      head.className = "seq-timer-row";
      var tag = document.createElement("span");
      tag.className = "quiz-category-tag";
      tag.textContent = "Teka-Teki Peti Kunci \u2022 Stage " + (currentStageIdx + 1);
      var timerEl = document.createElement("strong");
      timerEl.textContent = qTimeLeft + " detik";
      head.appendChild(tag);
      head.appendChild(timerEl);

      var diagSlot = document.createElement("div");
      if (q.type === "diagram" && q.diagramId) {
        diagSlot.appendChild(CONTENT.buildDiagramSvg(q.diagramId));
      }

      var promptEl = document.createElement("h4");
      promptEl.className = "quiz-question";
      promptEl.style.margin = "8px 0 12px";
      CONTENT.renderRichText(promptEl, q.prompt);

      var optBox = document.createElement("div");
      optBox.className = "quiz-options";

      var fbEl = document.createElement("p");
      fbEl.className = "step-note hidden";
      fbEl.style.marginTop = "10px";

      var locked = false;
      function resolveQuiz(isRight) {
        if (locked) return;
        locked = true;
        if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; }

        if (isRight) {
          correctCount += 1;
          hasKey = true;
          var isFinalBattleStage = currentStageIdx === totalStages - 1;
          doorOpen = !isFinalBattleStage;
          keyHolderUid = cfg.uid || "solo";
          var pts = 180 + qTimeLeft * 4;
          score += pts;
          teamEnergy = Math.min(100, teamEnergy + 50);
          CORE.Sound.correct();
          spawnParticles(stage.chest.x + 26, stage.chest.y + 10, "#F5CE53", 22);
          fbEl.textContent = isFinalBattleStage
            ? ("Tepat! +" + pts + " poin. Kunci Emas didapat \u2014 maju ke kanan untuk melawan Bos Terakhir!")
            : ("Tepat. Kunci Emas didapat +" + pts + " poin. Menuju Pintu Akhir.");
          fbEl.classList.remove("hidden");
          if (isMabar) {
            FB.pushParkTeamState(cfg.roomCode, teamId, {
              stageIdx: currentStageIdx,
              hasKey: true,
              keyHolderUid: keyHolderUid,
              doorOpen: true
            });
          }
          syncScore(true);
        } else {
          wrongCount += 1;
          CORE.Sound.wrong();
          fbEl.textContent = "Belum tepat. " + (q.explanation || "Dekati peti kembali untuk soal baru.");
          fbEl.classList.remove("hidden");
          me.x = Math.max(20, stage.chest.x - 110);
        }

        setTimeout(function () {
          quizOverlay.classList.add("hidden");
          state = "playing";
          lastTs = performance.now();
          pushHud();
        }, 1700);
      }

      var letters = ["A", "B", "C", "D"];
      (q.options || []).forEach(function (optText, idx) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "option-btn";
        var kEl = document.createElement("span");
        kEl.className = "option-key";
        kEl.textContent = letters[idx] || String(idx + 1);
        var tEl = document.createElement("span");
        CONTENT.renderRichText(tEl, optText);
        btn.appendChild(kEl);
        btn.appendChild(tEl);
        btn.addEventListener("click", function () {
          if (locked) return;
          optBox.querySelectorAll(".option-btn").forEach(function (b, i) {
            b.disabled = true;
            if (i === q.answer) b.classList.add("correct");
            if (i === idx && idx !== q.answer) b.classList.add("wrong");
          });
          resolveQuiz(idx === q.answer);
        });
        optBox.appendChild(btn);
      });

      card.appendChild(head);
      card.appendChild(diagSlot);
      card.appendChild(promptEl);
      card.appendChild(optBox);
      card.appendChild(fbEl);
      quizOverlay.appendChild(card);

      quizTimerId = setInterval(function () {
        if (state !== "quiz") return;
        qTimeLeft -= 1;
        timerEl.textContent = qTimeLeft + " detik";
        if (qTimeLeft <= 0) resolveQuiz(false);
      }, 1000);
    }

    if (isMabar && cfg.uid) {
      unsubPark = FB.subscribeParkTeam(cfg.roomCode, teamId, {
        onPlayers: function (playersMap) {
          var now = Date.now();
          remotePlayers = {};
          Object.keys(playersMap || {}).forEach(function (uid) {
            if (uid === cfg.uid) return;
            var rp = playersMap[uid];
            if (rp && (now - Number(rp.ts || 0) < 15000)) remotePlayers[uid] = rp;
          });
        },
        onState: function (st) {
          if (!st) return;
          if (typeof st.stageIdx === "number" && st.stageIdx > currentStageIdx && st.stageIdx < totalStages) {
            loadStage(st.stageIdx);
            return;
          }
          if (st.stageIdx === currentStageIdx && st.hasKey && !hasKey) {
            hasKey = true;
            doorOpen = true;
            keyHolderUid = st.keyHolderUid || "";
            if (state === "quiz") {
              if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; }
              quizOverlay.classList.add("hidden");
              state = "playing";
            }
            spawnParticles(stage.chest.x + 26, stage.chest.y + 10, "#F5CE53", 18);
            showBanner("Kunci Emas ditemukan. Ayo masuk Pintu Akhir.", true);
            pushHud();
          }
        },
        onThrow: function (th) {
          if (!th || th.fromUid === cfg.uid) return;
          var st = SKILL_STYLES[th.skillId] || SKILL_STYLES.maniburst;
          spawnSkillEffect(th);
          if (st.kind === "ghostwave" || st.kind === "sonic") return;

          var myCx = me.x + me.w / 2;
          var myCy = me.y + me.h / 2;
          var rng = th.range || st.range || 300;
          var dx = (myCx - th.x) * (th.facing || 1);
          var hit = false;
          if (st.kind === "smash" || st.kind === "snap") {
            hit = Math.hypot(myCx - th.x, myCy - th.y) <= rng;
          } else if (st.kind === "beam" || st.kind === "lightning" || st.kind === "whip" || st.kind === "lasso") {
            hit = dx >= 0 && dx <= rng && Math.abs(myCy - th.y) <= 68;
          } else if (st.kind === "spray") {
            hit = dx >= 0 && dx <= rng && Math.abs(myCy - th.y) <= (46 + dx * 0.25);
          }
          if (hit) applySkillHitOnMe(th.skillId, th.fromName, th.x, th.facing);
        },
        onSabotage: function (sab) {
          if (!sab) return;
          applySkillHitOnMe(sab.skillId || "shock", sab.fromTeam || sab.fromName || "Tim Lawan", me.x - 40, 1);
        }
      });
    }

    // === Update Fisika & Kamera ===
    function update(dt) {
      if (bannerTimer > 0) bannerTimer = Math.max(0, bannerTimer - dt);
      if (screenShake > 0) screenShake = Math.max(0, screenShake - dt);
      if (me.skillCd > 0) me.skillCd = Math.max(0, me.skillCd - dt);
      if (me.shockTimer > 0) me.shockTimer = Math.max(0, me.shockTimer - dt);
      if (me.lassoTimer > 0) me.lassoTimer = Math.max(0, me.lassoTimer - dt);
      if (me.confuseTimer > 0) me.confuseTimer = Math.max(0, me.confuseTimer - dt);
      if (me.hopTimer > 0) me.hopTimer = Math.max(0, me.hopTimer - dt);
      if (me.snapTimer > 0) me.snapTimer = Math.max(0, me.snapTimer - dt);
      if (me.stickyTimer > 0) me.stickyTimer = Math.max(0, me.stickyTimer - dt);
      if (me.slipTimer > 0) me.slipTimer = Math.max(0, me.slipTimer - dt);
      if (me.hitTimer > 0) me.hitTimer = Math.max(0, me.hitTimer - dt);

      if (stage.stageTimeLimit) {
        stageTimer -= dt;
        if (stageTimer <= 0) {
          showBanner("Waktu stage habis. Mengulang dari titik awal.", false);
          loadStage(currentStageIdx);
          return;
        }
      }

      if (stage.stopAndGo) {
        lightCycleTimer -= dt;
        if (lightCycleTimer <= 0) {
          redLight = !redLight;
          lightCycleTimer = redLight ? 2.4 : 3.5;
          if (redLight) CORE.Sound.select();
        }
      }

      (stage.lifts || []).forEach(function (lf) {
        var prevY = lf.y;
        lf.phase = (lf.phase || 0) + dt * 1.3;
        lf.y = lf.baseY + Math.sin(lf.phase) * lf.range;
        lf.dy = lf.y - prevY;
      });

      (stage.platforms || []).forEach(function (pf) {
        if (pf.kind !== "crumble") return;
        if (pf.gone > 0) {
          pf.gone = Math.max(0, pf.gone - dt);
          if (pf.gone === 0) pf.timer = 0;
        } else if (pf.timer > 0) {
          pf.timer -= dt;
          if (pf.timer <= 0) {
            pf.gone = 2.8;
            spawnParticles(pf.x + pf.w / 2, pf.y + 10, "#B88C5A", 10);
          }
        }
      });

      var activeSwitches = {};
      (stage.switches || []).forEach(function (sw) {
        var pressedByMe = me.x + me.w > sw.x && me.x < sw.x + sw.w && me.y + me.h >= sw.y - 4 && me.y + me.h <= sw.y + sw.h + 12;
        var pressedByMate = Object.keys(remotePlayers).some(function (uid) {
          var rp = remotePlayers[uid];
          return rp.x + 34 > sw.x && rp.x < sw.x + sw.w && rp.y + 50 >= sw.y - 6 && rp.y + 50 <= sw.y + sw.h + 14;
        });
        var pressedByBox = (stage.boxes || []).some(function (bx) {
          return bx.x + bx.w > sw.x && bx.x < sw.x + sw.w && bx.y + bx.h >= sw.y - 4;
        });
        if (pressedByMe || pressedByMate || pressedByBox) {
          sw.holdTimer = Object.keys(remotePlayers).length === 0 ? 7.0 : 0.7;
        } else if (sw.holdTimer > 0) {
          sw.holdTimer = Math.max(0, sw.holdTimer - dt);
        }
        activeSwitches[sw.id] = sw.holdTimer > 0;
      });

      var rawDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      var moveDir = me.confuseTimer > 0 ? -rawDir : rawDir;
      var speedMult = me.snapTimer > 0 ? 0.5 : (me.stickyTimer > 0 ? 0.72 : 1.0);

      if (isStunned()) {
        me.vx = 0;
      } else if (me.slipTimer > 0) {
        me.vx = me.facing * 360 * speedMult;
      } else if (stage.iceFloor) {
        me.vx += moveDir * 780 * dt * speedMult;
        me.vx *= Math.pow(0.87, dt * 60);
        me.vx = Math.max(-340 * speedMult, Math.min(340 * speedMult, me.vx));
      } else {
        me.vx = moveDir * 315 * speedMult;
      }

      if (moveDir !== 0 && !isStunned()) {
        me.facing = moveDir;
        me.phase += dt * 12;
        if (me.onGround && Math.random() < 0.22) {
          particles.push({ x: me.x + me.w / 2, y: me.y + me.h - 2, vx: -moveDir * 35, vy: -18, size: 3, life: 0.28, maxLife: 0.28, color: "rgba(255,255,255,0.45)" });
        }
      } else {
        me.phase += dt * 2;
      }

      if (stage.stopAndGo && redLight && !isStunned() && (Math.abs(me.vx) > 28 || !me.onGround)) {
        me.shockTimer = 2.0;
        CORE.Sound.freeze();
        spawnParticles(me.x + 17, me.y + 24, "#FFE047", 12);
        showBanner("Bergerak saat lampu merah. Terhenti 2 detik.", false);
      }

      if (me.onGround) me.coyote = 0.13;
      else me.coyote = Math.max(0, me.coyote - dt);

      // Efek Lompatan Mistis (Pocong): melompat tak terkendali saat menapak tanah
      if (me.hopTimer > 0 && me.onGround && !isStunned()) {
        me.vy = -500;
        me.onGround = false;
        CORE.Sound.jump();
      }

      if (me.jumpBuf > 0) me.jumpBuf = Math.max(0, me.jumpBuf - dt);
      if (me.jumpBuf > 0 && me.coyote > 0 && !isStunned()) {
        me.vy = me.snapTimer > 0 ? -490 : -610;
        me.onGround = false;
        me.coyote = 0;
        me.jumpBuf = 0;
        CORE.Sound.jump();
        spawnParticles(me.x + me.w / 2, me.y + me.h, "rgba(255,255,255,0.55)", 5);
      }

      me.vy = Math.min(me.vy + 1480 * dt, 980);
      me.x = Math.max(10, Math.min(WORLD_W - me.w - 10, me.x + me.vx * dt));

      if (stage.tether) {
        var mateKeys = Object.keys(remotePlayers);
        if (mateKeys.length > 0) {
          var mate = remotePlayers[mateKeys[0]];
          var dxT = mate.x - me.x;
          if (Math.abs(dxT) > 320) me.x += Math.sign(dxT) * (Math.abs(dxT) - 320) * 0.24;
        }
      }

      (stage.boxes || []).forEach(function (bx) {
        if (me.x + me.w > bx.x && me.x < bx.x + bx.w && me.y + me.h > bx.y + 8 && me.y < bx.y + bx.h) {
          if (me.vx > 0 && me.x < bx.x) {
            bx.x = Math.min(WORLD_W - bx.w - 12, bx.x + 150 * dt);
            me.x = bx.x - me.w;
          } else if (me.vx < 0 && me.x > bx.x) {
            bx.x = Math.max(12, bx.x - 150 * dt);
            me.x = bx.x + bx.w;
          }
        }
      });

      var prevBottom = me.y + me.h;
      me.y += me.vy * dt;
      me.onGround = false;

      function landOnRect(rx, ry, rw, rh, dyExtra) {
        if (me.x + me.w > rx + 3 && me.x < rx + rw - 3 && me.vy >= 0 && prevBottom <= ry + 16 && me.y + me.h >= ry) {
          me.y = ry - me.h + (dyExtra || 0);
          me.vy = 0;
          me.onGround = true;
          return true;
        }
        return false;
      }

      (stage.platforms || []).forEach(function (pf) {
        if (pf.kind === "bridge" && !activeSwitches[pf.switchId]) return;
        if (pf.kind === "crumble" && pf.gone > 0) return;
        if (landOnRect(pf.x, pf.y, pf.w, pf.h, 0) && pf.kind === "crumble" && pf.timer === 0) {
          pf.timer = 1.5;
        }
      });

      (stage.lifts || []).forEach(function (lf) { landOnRect(lf.x, lf.y, lf.w, lf.h, lf.dy || 0); });
      (stage.boxes || []).forEach(function (bx) { landOnRect(bx.x, bx.y, bx.w, bx.h, 0); });
      Object.keys(remotePlayers).forEach(function (uid) {
        var rp = remotePlayers[uid];
        landOnRect(rp.x, rp.y, 34, 50, 0);
      });

      (stage.springs || []).forEach(function (sp) {
        if (me.x + me.w > sp.x && me.x < sp.x + sp.w && me.y + me.h >= sp.y && me.y + me.h <= sp.y + sp.h + 16 && me.vy >= 0) {
          me.vy = -820;
          me.onGround = false;
          CORE.Sound.spring();
          spawnParticles(sp.x + sp.w / 2, sp.y, "#E6B43C", 10);
        }
      });

      (stage.spikes || []).forEach(function (sk) {
        if (me.hitTimer <= 0 && me.x + me.w - 4 > sk.x && me.x + 4 < sk.x + sk.w && me.y + me.h > sk.y + 4 && me.y < sk.y + sk.h) {
          me.hitTimer = 1.0;
          me.x = stage.spawn.x;
          me.y = stage.spawn.y;
          me.vx = 0; me.vy = 0;
          CORE.Sound.wrong();
          showBanner("Terkena duri. Kembali ke titik awal.", false);
        }
      });

      if (me.y > WORLD_H + 80) {
        me.x = stage.spawn.x;
        me.y = stage.spawn.y;
        me.vx = 0; me.vy = 0;
        me.hitTimer = 0.8;
        CORE.Sound.wrong();
        showBanner("Terjatuh. Kembali ke titik awal.", false);
      }

      for (var r = projectiles.length - 1; r >= 0; r--) {
        var pj = projectiles[r];
        pj.life -= dt;
        pj.x += pj.vx * dt;
        pj.y += pj.vy * dt;

        var hitRad = pj.kind === "sonic" ? 28 : 22;
        if (pj.fromUid !== (cfg.uid || "solo") &&
            pj.x + hitRad > me.x && pj.x - hitRad < me.x + me.w &&
            pj.y + hitRad > me.y && pj.y - hitRad < me.y + me.h) {
          applySkillHitOnMe(pj.skillId, pj.fromName, pj.x - pj.vx * 0.2, pj.facing || Math.sign(pj.vx || 1));
          projectiles.splice(r, 1);
          continue;
        }
        if (pj.life <= 0 || pj.x < -60 || pj.x > WORLD_W + 60 || pj.y > WORLD_H + 60) projectiles.splice(r, 1);
      }

      for (var ae = areaEffects.length - 1; ae >= 0; ae--) {
        var ef = areaEffects[ae];
        ef.life -= dt;
        if (ef.drops && ef.drops.length) {
          for (var di = 0; di < ef.drops.length; di++) {
            var drp = ef.drops[di];
            drp.x += drp.vx * dt;
            drp.y += drp.vy * dt;
            drp.vy += (ef.kind === "smash" ? 720 : 340) * dt;
          }
        }
        if (ef.life <= 0) areaEffects.splice(ae, 1);
      }

      for (var p = particles.length - 1; p >= 0; p--) {
        var pt = particles[p];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 320 * dt;
        pt.life -= dt;
        if (pt.life <= 0) particles.splice(p, 1);
      }

      if (!hasKey &&
          me.x + me.w > stage.chest.x && me.x < stage.chest.x + 54 &&
          me.y + me.h > stage.chest.y && me.y < stage.chest.y + 46) {
        openKeyChestQuiz();
        return;
      }

      // === SCENE MELAWAN BOS TERAKHIR (Akhir Stage Penentu Final) ===
      if (currentStageIdx === totalStages - 1 && hasKey && !boss.defeated) {
        if (!boss.active && me.x >= 2320) {
          boss.active = true;
          boss.hp = boss.maxHp;
          me.skillCd = Math.min(me.skillCd, 1.5);
          screenShake = 0.5;
          CORE.Sound.ulti();
          showBanner("BOS TERAKHIR MUNCUL! Serang pakai Skill (4 dtk), injak kepalanya, atau ambil Kristal Kuis!", false);
          pushHud();
        }
        if (boss.active) {
          boss.phase += dt * 3.2;
          if (boss.hurtTimer > 0) boss.hurtTimer = Math.max(0, boss.hurtTimer - dt);
          var enraged = boss.hp <= 50;
          var bossSpeed = enraged ? 180 : 120;
          boss.x += (boss.vx < 0 ? -bossSpeed : bossSpeed) * dt;
          if (boss.x < 2480) { boss.x = 2480; boss.vx = Math.abs(bossSpeed); }
          if (boss.x > 3070) { boss.x = 3070; boss.vx = -Math.abs(bossSpeed); }
          boss.y = (FLOOR_Y - boss.h - 14) + Math.sin(boss.phase) * 18;

          // Cek proyektil skill pemain mengenai Bos (Pocong / Kuntilanak)
          for (var pb = projectiles.length - 1; pb >= 0; pb--) {
            var pjb = projectiles[pb];
            if (pjb.x + 26 > boss.x && pjb.x - 26 < boss.x + boss.w &&
                pjb.y + 26 > boss.y && pjb.y - 26 < boss.y + boss.h) {
              projectiles.splice(pb, 1);
              damageBoss(25, myChar.skillName);
            }
          }

          // Cek Kristal Serangan Kuis (-40% HP Bos)
          if (!boss.orbReady) {
            boss.orbRespawn -= dt;
            if (boss.orbRespawn <= 0) boss.orbReady = true;
          } else if (me.x + me.w > boss.orbX - 20 && me.x < boss.orbX + 20 &&
                     me.y + me.h > boss.orbY - 20 && me.y < boss.orbY + 20) {
            openBossQuizStrike();
            return;
          }

          // Cek pemain menginjak kepala Bos (Stomp = -20% HP) atau tertabrak badan Bos
          if (boss.active && !boss.defeated &&
              me.x + me.w > boss.x + 8 && me.x < boss.x + boss.w - 8 &&
              me.y + me.h > boss.y && me.y < boss.y + boss.h) {
            if (me.vy > 0 && (me.y + me.h - me.vy * dt) <= boss.y + 34 && boss.hurtTimer <= 0) {
              me.vy = -640;
              me.onGround = false;
              damageBoss(20, "Injakan Kepala");
            } else if (me.hitTimer <= 0) {
              me.hitTimer = 1.1;
              me.vx = (me.x < boss.x ? -1 : 1) * 340;
              me.vy = -320;
              me.onGround = false;
              CORE.Sound.wrong();
              showBanner("Terkena hantaman Bos! Lompat atau serang dari jarak aman.", false);
            }
          }

          // Serangan Bola Bayangan dari Bos
          boss.attackCd -= dt;
          if (boss.attackCd <= 0 && boss.active && !boss.defeated) {
            boss.attackCd = enraged ? 1.65 : 2.35;
            var dirToMe = me.x < boss.x ? -1 : 1;
            bossShots.push({
              x: boss.x + boss.w / 2 + dirToMe * 32,
              y: boss.y + boss.h * 0.55,
              vx: dirToMe * (enraged ? 340 : 265),
              vy: (enraged ? -70 : 0),
              r: 13,
              life: 3.2
            });
            CORE.Sound.throwRock();
          }

          for (var bs = bossShots.length - 1; bs >= 0; bs--) {
            var shot = bossShots[bs];
            shot.life -= dt;
            shot.x += shot.vx * dt;
            shot.y += shot.vy * dt;
            if (enraged) shot.vy += 90 * dt;
            if (me.hitTimer <= 0 &&
                shot.x + shot.r > me.x && shot.x - shot.r < me.x + me.w &&
                shot.y + shot.r > me.y && shot.y - shot.r < me.y + me.h) {
              me.hitTimer = 1.0;
              me.vx = Math.sign(shot.vx || -1) * 310;
              me.vy = -260;
              CORE.Sound.wrong();
              spawnParticles(shot.x, shot.y, "#E07A7A", 12);
              bossShots.splice(bs, 1);
              showBanner("Terkena Bola Bayangan Bos!", false);
              continue;
            }
            if (shot.life <= 0 || shot.x < 2100 || shot.x > WORLD_W + 40 || shot.y > WORLD_H) {
              bossShots.splice(bs, 1);
            }
          }
        }
      }

      var dr = stage.door;
      me.inDoor = doorOpen &&
        me.x + me.w > dr.x && me.x < dr.x + 68 &&
        me.y + me.h > dr.y && me.y < dr.y + 92;

      if (me.inDoor) {
        var mates = Object.keys(remotePlayers);
        var allInDoor = mates.length === 0 || mates.every(function (uid) { return Boolean(remotePlayers[uid].inDoor); });
        if (allInDoor) {
          score += 200;
          CORE.Sound.win();
          syncScore(true);
          if (currentStageIdx + 1 >= totalStages) {
            finishPark(true);
            return;
          } else {
            showBanner("Stage " + (currentStageIdx + 1) + " selesai.", true);
            loadStage(currentStageIdx + 1);
            return;
          }
        }
      }

      // Smooth Lerp Camera mengikuti pemain lokal
      var targetCamX = Math.max(0, Math.min(WORLD_W - VIEW_W, me.x - VIEW_W * 0.42));
      var targetCamY = Math.max(0, Math.min(WORLD_H - VIEW_H, me.y - VIEW_H * 0.56));
      cam.x += (targetCamX - cam.x) * Math.min(1, dt * 8);
      cam.y += (targetCamY - cam.y) * Math.min(1, dt * 8);

      var now = performance.now();
      if (isMabar && cfg.uid && now - lastRtdbPush > 85) {
        lastRtdbPush = now;
        var myStatus = me.shockTimer > 0 ? "shock"
          : me.lassoTimer > 0 ? "lasso"
          : me.confuseTimer > 0 ? "confuse"
          : me.hopTimer > 0 ? "hop"
          : me.snapTimer > 0 ? "snap"
          : me.stickyTimer > 0 ? "sticky"
          : me.slipTimer > 0 ? "slip" : "";
        var aState = me.hitTimer > 0 ? "hit" : (!me.onGround ? "jump" : (Math.abs(me.vx) > 12 ? "run" : "idle"));
        FB.pushParkPlayerState(cfg.roomCode, teamId, cfg.uid, {
          x: Math.round(me.x), y: Math.round(me.y),
          facing: me.facing, animState: aState, statusEffect: myStatus,
          isMini: me.snapTimer > 0, phase: Number(me.phase.toFixed(1)),
          name: cfg.playerName || "Pemain",
          characterId: myChar.id,
          inDoor: me.inDoor
        });
      }

      pushHud();
    }

    // === Helper Menggambar Objek 2.5D / Pseudo-3D ===
    function drawPlatform3D(pf, biome) {
      var depth = 8;
      var topColor = pf.kind === "ice" ? "#BCE7FA" : (pf.kind === "crumble" ? "#D0A676" : biome.top);
      var sideColor = pf.kind === "ice" ? "#6AA8CA" : (pf.kind === "crumble" ? "#8E633A" : biome.side);
      var rimColor = pf.kind === "ice" ? "#E8F8FF" : "rgba(255,255,255,0.28)";

      // Bayangan bawah platform melayang
      if (pf.kind !== "ground") {
        ctx.fillStyle = "rgba(18, 22, 26, 0.16)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(pf.x + 6, pf.y + pf.h - 2, pf.w - 4, 10, 5);
        else ctx.rect(pf.x + 6, pf.y + pf.h - 2, pf.w - 4, 10);
        ctx.fill();
      }

      // Sisi depan 3D
      var sGrad = ctx.createLinearGradient(pf.x, pf.y, pf.x, pf.y + pf.h);
      sGrad.addColorStop(0, sideColor);
      sGrad.addColorStop(1, "rgba(25, 22, 20, 0.78)");
      ctx.fillStyle = sideColor;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pf.x, pf.y, pf.w, pf.h, pf.kind === "ground" ? 0 : 6);
      else ctx.rect(pf.x, pf.y, pf.w, pf.h);
      ctx.fill();

      // Tekstur blok halus pada sisi depan
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 1;
      for (var tx = pf.x + 44; tx < pf.x + pf.w - 10; tx += 44) {
        ctx.beginPath();
        ctx.moveTo(tx, pf.y + depth + 2);
        ctx.lineTo(tx, pf.y + pf.h);
        ctx.stroke();
      }

      // Permukaan atas 3D
      ctx.fillStyle = topColor;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pf.x, pf.y, pf.w, depth + 4, [6, 6, 2, 2]);
      else ctx.rect(pf.x, pf.y, pf.w, depth + 4);
      ctx.fill();

      // Highlight tepi atas
      ctx.fillStyle = rimColor;
      ctx.fillRect(pf.x + 3, pf.y + 1, pf.w - 6, 2.5);

      // Retakan pada pijakan runtuh
      if (pf.kind === "crumble") {
        ctx.strokeStyle = pf.timer > 0 ? "#B83B3B" : "rgba(50,30,15,0.45)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(pf.x + pf.w * 0.35, pf.y + 2);
        ctx.lineTo(pf.x + pf.w * 0.42, pf.y + 13);
        ctx.lineTo(pf.x + pf.w * 0.38, pf.y + pf.h - 2);
        ctx.moveTo(pf.x + pf.w * 0.68, pf.y + 2);
        ctx.lineTo(pf.x + pf.w * 0.62, pf.y + 14);
        ctx.stroke();
      }
    }

    function drawChest3D(ch) {
      var bob = Math.sin(performance.now() / 320) * 3;
      var x = ch.x;
      var y = ch.y + bob;
      var w = 54;
      var h = 42;

      // Aura cahaya hangat di belakang peti
      var aura = ctx.createRadialGradient(x + w / 2, y + h / 2, 6, x + w / 2, y + h / 2, 52);
      aura.addColorStop(0, "rgba(245, 206, 83, 0.42)");
      aura.addColorStop(1, "rgba(245, 206, 83, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 52, 0, Math.PI * 2);
      ctx.fill();

      // Bayangan peti
      ctx.fillStyle = "rgba(18, 22, 26, 0.25)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, ch.y + h + 6, 26, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Badan kayu 3D
      var bodyG = ctx.createLinearGradient(x, y + 14, x, y + h);
      bodyG.addColorStop(0, "#A96E38");
      bodyG.addColorStop(1, "#693E1B");
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y + 14, w, h - 14, [2, 2, 6, 6]);
      else ctx.rect(x, y + 14, w, h - 14);
      ctx.fill();

      // Tutup melengkung 3D
      var lidG = ctx.createLinearGradient(x, y, x, y + 18);
      lidG.addColorStop(0, "#D19152");
      lidG.addColorStop(1, "#8A5424");
      ctx.fillStyle = lidG;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - 2, y, w + 4, 18, [10, 10, 2, 2]);
      else ctx.rect(x - 2, y, w + 4, 18);
      ctx.fill();

      // Sabuk emas 3D
      var goldG = ctx.createLinearGradient(x, y, x + w, y + h);
      goldG.addColorStop(0, "#FFF0A6");
      goldG.addColorStop(0.5, "#E0A82E");
      goldG.addColorStop(1, "#9E6D14");
      ctx.fillStyle = goldG;
      ctx.fillRect(x + 8, y + 1, 6, h - 2);
      ctx.fillRect(x + w - 14, y + 1, 6, h - 2);
      ctx.fillRect(x - 2, y + 15, w + 4, 4);

      // Pelat lubang kunci di tengah
      ctx.fillStyle = goldG;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x + w / 2 - 6, y + 13, 12, 14, 3);
      else ctx.rect(x + w / 2 - 6, y + 13, 12, 14);
      ctx.fill();
      ctx.fillStyle = "#3A2208";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + 19, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + w / 2 - 1, y + 19, 2, 5);
    }

    function drawDoor3D(dr) {
      var x = dr.x;
      var y = dr.y;
      var w = 68;
      var h = 92;

      // Bingkai batu gerbang 3D
      var frameG = ctx.createLinearGradient(x, y, x + w, y + h);
      frameG.addColorStop(0, "#757A80");
      frameG.addColorStop(1, "#44484D");
      ctx.fillStyle = frameG;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - 6, y - 6, w + 12, h + 6, [34, 34, 4, 4]);
      else ctx.rect(x - 6, y - 6, w + 12, h + 6);
      ctx.fill();

      // Interior pintu (bercahaya hangat saat terbuka, kayu gelap saat terkunci)
      if (doorOpen) {
        var openG = ctx.createRadialGradient(x + w / 2, y + h * 0.55, 6, x + w / 2, y + h * 0.55, 58);
        openG.addColorStop(0, "#FFF6CC");
        openG.addColorStop(0.55, "#6BBAA7");
        openG.addColorStop(1, "#2A5750");
        ctx.fillStyle = openG;
      } else {
        var closedG = ctx.createLinearGradient(x, y, x + w, y);
        closedG.addColorStop(0, "#6E4B32");
        closedG.addColorStop(0.5, "#5A3B24");
        closedG.addColorStop(1, "#422A18");
        ctx.fillStyle = closedG;
      }
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, [28, 28, 2, 2]);
      else ctx.rect(x, y, w, h);
      ctx.fill();

      if (!doorOpen) {
        // Bilah kayu & gembok emas
        ctx.strokeStyle = "rgba(0,0,0,0.22)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + 4); ctx.lineTo(x + w / 2, y + h);
        ctx.stroke();

        ctx.fillStyle = "#E0A82E";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x + w / 2 - 8, y + h / 2 - 6, 16, 15, 3);
        else ctx.rect(x + w / 2 - 8, y + h / 2 - 6, 16, 15);
        ctx.fill();
        ctx.strokeStyle = "#E0A82E";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2 - 7, 5, Math.PI, 0);
        ctx.stroke();
      }

      // Label status rapi di atas gerbang
      ctx.fillStyle = "rgba(22, 25, 28, 0.78)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - 2, y - 32, w + 4, 20, 999);
      else ctx.rect(x - 2, y - 32, w + 4, 20);
      ctx.fill();
      ctx.fillStyle = doorOpen ? "#9CE6C2" : "#F5CE53";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(doorOpen ? "TERBUKA" : "TERKUNCI", x + w / 2, y - 22);
    }

    function drawMinimap() {
      var mw = 172;
      var mh = 42;
      var mx = VIEW_W - mw - 16;
      var my = 58;
      var sx = mw / WORLD_W;
      var sy = mh / WORLD_H;

      ctx.save();
      ctx.fillStyle = "rgba(20, 24, 28, 0.52)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(mx, my, mw, mh, 8);
      else ctx.rect(mx, my, mw, mh);
      ctx.fill();
      ctx.stroke();

      // Pintu & Peti di minimap
      if (!hasKey) {
        ctx.fillStyle = "#F5CE53";
        ctx.fillRect(mx + stage.chest.x * sx - 2, my + stage.chest.y * sy - 2, 5, 5);
      }
      ctx.fillStyle = doorOpen ? "#7AB893" : "#A6A096";
      ctx.fillRect(mx + stage.door.x * sx - 2, my + stage.door.y * sy - 2, 5, 7);

      // Rekan tim
      ctx.fillStyle = "#8BD3F7";
      Object.keys(remotePlayers).forEach(function (uid) {
        var rp = remotePlayers[uid];
        ctx.beginPath();
        ctx.arc(mx + rp.x * sx, my + rp.y * sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Pemain lokal
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(mx + me.x * sx, my + me.y * sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function render() {
      var biome = BIOMES[stage.biome % BIOMES.length];

      // 1. Langit & Parallax Pegunungan
      var skyGrad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      skyGrad.addColorStop(0, biome.skyTop);
      skyGrad.addColorStop(1, biome.skyBot);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      // Bukit jauh (parallax 0.2)
      ctx.fillStyle = biome.hillFar;
      ctx.beginPath();
      ctx.moveTo(0, VIEW_H);
      for (var hx = -100; hx <= VIEW_W + 260; hx += 220) {
        var px = hx - (cam.x * 0.2) % 220;
        ctx.quadraticCurveTo(px + 110, VIEW_H - 250, px + 220, VIEW_H - 130);
      }
      ctx.lineTo(VIEW_W, VIEW_H);
      ctx.closePath();
      ctx.fill();

      // Bukit dekat (parallax 0.42)
      ctx.fillStyle = biome.hillNear;
      ctx.beginPath();
      ctx.moveTo(0, VIEW_H);
      for (var hx2 = -120; hx2 <= VIEW_W + 280; hx2 += 260) {
        var px2 = hx2 - (cam.x * 0.42) % 260;
        ctx.quadraticCurveTo(px2 + 130, VIEW_H - 165, px2 + 260, VIEW_H - 72);
      }
      ctx.lineTo(VIEW_W, VIEW_H);
      ctx.closePath();
      ctx.fill();

      // Awan lembut (stage terang)
      if (!stage.darkMode) {
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        for (var ci = 0; ci < 5; ci++) {
          var cxCloud = ((ci * 310 - cam.x * 0.15) % (VIEW_W + 260) + (VIEW_W + 260)) % (VIEW_W + 260) - 100;
          var cyCloud = 85 + (ci % 3) * 44;
          ctx.beginPath();
          ctx.arc(cxCloud, cyCloud, 24, 0, Math.PI * 2);
          ctx.arc(cxCloud + 22, cyCloud - 8, 28, 0, Math.PI * 2);
          ctx.arc(cxCloud + 46, cyCloud, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Dunia Game (digeser kamera + screen shake untuk Hulk Smash / Atomic Breath)
      ctx.save();
      var shX = screenShake > 0 ? (Math.random() - 0.5) * 14 : 0;
      var shY = screenShake > 0 ? (Math.random() - 0.5) * 10 : 0;
      ctx.translate(-Math.round(cam.x - shX), -Math.round(cam.y - shY));

      // Platform 2.5D
      (stage.platforms || []).forEach(function (pf) {
        if (pf.kind === "bridge") {
          var sw = (stage.switches || []).find(function (s) { return s.id === pf.switchId; });
          if (!sw || sw.holdTimer <= 0) {
            ctx.strokeStyle = "rgba(63, 111, 106, 0.45)";
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.strokeRect(pf.x, pf.y, pf.w, pf.h);
            ctx.setLineDash([]);
            return;
          }
        }
        if (pf.kind === "crumble" && pf.gone > 0) return;
        drawPlatform3D(pf, biome);
      });

      // Lift 3D
      (stage.lifts || []).forEach(function (lf) {
        ctx.strokeStyle = "rgba(40,45,50,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lf.x + lf.w / 2, 0);
        ctx.lineTo(lf.x + lf.w / 2, lf.y);
        ctx.stroke();
        drawPlatform3D(Object.assign({ kind: "solid" }, lf), { top: "#538F86", side: "#2F5852" });
      });

      // Tombol Pijakan 3D
      (stage.switches || []).forEach(function (sw) {
        var active = sw.holdTimer > 0;
        ctx.fillStyle = "#3E4348";
        ctx.fillRect(sw.x - 4, sw.y + sw.h - 4, sw.w + 8, 6);
        ctx.fillStyle = active ? "#3E9B6E" : "#D46046";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(sw.x, active ? sw.y + 6 : sw.y, sw.w, active ? sw.h - 6 : sw.h, [5, 5, 0, 0]);
        else ctx.rect(sw.x, active ? sw.y + 6 : sw.y, sw.w, active ? sw.h - 6 : sw.h);
        ctx.fill();
      });

      // Pegas 3D
      (stage.springs || []).forEach(function (sp) {
        ctx.fillStyle = "#4A4E54";
        ctx.fillRect(sp.x + 6, sp.y + 6, sp.w - 12, sp.h - 6);
        var spG = ctx.createLinearGradient(sp.x, sp.y, sp.x, sp.y + 8);
        spG.addColorStop(0, "#FFE07D");
        spG.addColorStop(1, "#C98524");
        ctx.fillStyle = spG;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(sp.x, sp.y, sp.w, 8, 4);
        else ctx.rect(sp.x, sp.y, sp.w, 8);
        ctx.fill();
      });

      // Balok Kayu 3D
      (stage.boxes || []).forEach(function (bx) {
        var bG = ctx.createLinearGradient(bx.x, bx.y, bx.x + bx.w, bx.y + bx.h);
        bG.addColorStop(0, "#D6A774");
        bG.addColorStop(1, "#8C5D32");
        ctx.fillStyle = bG;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx.x, bx.y, bx.w, bx.h, 6);
        else ctx.rect(bx.x, bx.y, bx.w, bx.h);
        ctx.fill();
        ctx.strokeStyle = "#633D1B";
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx.x + 8, bx.y + 8); ctx.lineTo(bx.x + bx.w - 8, bx.y + bx.h - 8);
        ctx.moveTo(bx.x + bx.w - 8, bx.y + 8); ctx.lineTo(bx.x + 8, bx.y + bx.h - 8);
        ctx.stroke();
      });

      // Duri 3D
      (stage.spikes || []).forEach(function (sk) {
        var cnt = Math.max(3, Math.floor(sk.w / 16));
        var sw = sk.w / cnt;
        for (var i = 0; i < cnt; i++) {
          var sx = sk.x + i * sw;
          ctx.fillStyle = "#C94444";
          ctx.beginPath();
          ctx.moveTo(sx, sk.y + sk.h);
          ctx.lineTo(sx + sw / 2, sk.y);
          ctx.lineTo(sx + sw, sk.y + sk.h);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#8A2424";
          ctx.beginPath();
          ctx.moveTo(sx + sw / 2, sk.y);
          ctx.lineTo(sx + sw, sk.y + sk.h);
          ctx.lineTo(sx + sw / 2, sk.y + sk.h);
          ctx.closePath();
          ctx.fill();
        }
      });

      // Pintu 3D & Peti Kunci 3D
      drawDoor3D(stage.door);
      if (!hasKey) drawChest3D(stage.chest);

      // Tali Seirama
      if (stage.tether) {
        ctx.strokeStyle = "#D79A7B";
        ctx.lineWidth = 2.5;
        Object.keys(remotePlayers).forEach(function (uid) {
          var rp = remotePlayers[uid];
          ctx.beginPath();
          ctx.moveTo(me.x + me.w / 2, me.y + 24);
          ctx.lineTo(rp.x + 17, rp.y + 24);
          ctx.stroke();
        });
      }

      // Rekan Tim
      Object.keys(remotePlayers).forEach(function (uid) {
        var rp = remotePlayers[uid];
        SPRITE.drawCharacter(ctx, {
          x: rp.x, y: rp.y, w: 34, h: 50,
          animState: rp.animState || "idle",
          statusEffect: rp.statusEffect || "",
          isMini: Boolean(rp.isMini),
          phase: rp.phase || 0, facing: rp.facing || 1,
          character: getCharById(rp.characterId),
          hasKey: hasKey && keyHolderUid === uid,
          name: rp.name || "Rekan"
        });
      });

      // Pemain Lokal
      var curStatus = me.shockTimer > 0 ? "shock"
        : me.lassoTimer > 0 ? "lasso"
        : me.confuseTimer > 0 ? "confuse"
        : me.hopTimer > 0 ? "hop"
        : me.snapTimer > 0 ? "snap"
        : me.stickyTimer > 0 ? "sticky"
        : me.slipTimer > 0 ? "slip" : "";
      var myAnim = me.hitTimer > 0 ? "hit"
        : !me.onGround ? "jump"
        : (Math.abs(me.vx) > 12 ? "run" : "idle");

      SPRITE.drawCharacter(ctx, {
        x: me.x, y: me.y, w: me.w, h: me.h,
        animState: myAnim, statusEffect: curStatus,
        isMini: me.snapTimer > 0, phase: me.phase, facing: me.facing,
        character: myChar,
        hasKey: hasKey && keyHolderUid === (cfg.uid || "solo"),
        name: cfg.playerName || "Pemain"
      });

      // Animasi Unik 7 Skill Langsung/Area/Sinar/Cambuk/Laso/Petir/Semburan
      areaEffects.forEach(function (ef) {
        var ratio = Math.max(0, ef.life / ef.maxLife);
        var prog = 1 - ratio;
        ctx.save();

        if (ef.kind === "spray") {
          // 1. ERMUS - MANI BURST: Semburan kipas kental putih-krem bergaya pixel + cipratan deras
          var coneLen = ef.range * Math.min(1, prog * 2.1);
          var dir = ef.facing || 1;
          ctx.globalAlpha = Math.min(0.82, ratio * 1.15);
          ctx.fillStyle = "rgba(252, 250, 238, 0.45)";
          ctx.beginPath();
          ctx.moveTo(ef.x + dir * 10, ef.y);
          ctx.lineTo(ef.x + dir * coneLen, ef.y - 38 * Math.min(1, prog * 1.8));
          ctx.lineTo(ef.x + dir * coneLen, ef.y + 32 * Math.min(1, prog * 1.8));
          ctx.closePath();
          ctx.fill();
          (ef.drops || []).forEach(function (d) {
            ctx.fillStyle = "#FAF8EE";
            ctx.fillRect(Math.round(d.x - d.r), Math.round(d.y - d.r), d.r * 2, d.r * 2);
            ctx.fillStyle = "#D9D2B8";
            ctx.fillRect(Math.round(d.x - d.r), Math.round(d.y + d.r - 2), d.r * 2, 2);
          });
        } else if (ef.kind === "lightning") {
          // 4. PIKACHU - THUNDERBOLT: Sambaran petir zig-zag kuning bercabang + kilatan langit
          var dirL = ef.facing || 1;
          var endX = ef.x + dirL * ef.range;
          ctx.globalAlpha = Math.min(1, ratio * 1.4);
          ctx.strokeStyle = "#FFE047";
          ctx.lineWidth = 6;
          ctx.lineJoin = "miter";
          ctx.beginPath();
          ctx.moveTo(ef.x + dirL * 12, ef.y - 4);
          for (var seg = 1; seg <= 7; seg++) {
            var lx = ef.x + dirL * (12 + (ef.range - 12) * (seg / 7));
            var ly = ef.y + ((seg % 2 === 0 ? -1 : 1) * (14 + (seg % 3) * 8));
            ctx.lineTo(lx, ly);
          }
          ctx.stroke();
          // Inti putih menyilaukan + sambaran vertikal dari atas di ujung target
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2.4;
          ctx.stroke();
          ctx.strokeStyle = "#FFE047";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(endX - dirL * 24, ef.y - 160);
          ctx.lineTo(endX - dirL * 8, ef.y - 95);
          ctx.lineTo(endX - dirL * 28, ef.y - 40);
          ctx.lineTo(endX, ef.y + 18);
          ctx.stroke();
        } else if (ef.kind === "whip") {
          // 5. CATWOMAN - CAMBUK KUCING: Lecutan cambuk melengkung cepat lalu menarik balik
          var dirW = ef.facing || 1;
          var ext = prog < 0.5 ? (prog * 2) : ((1 - prog) * 2);
          var tipX = ef.x + dirW * (24 + ef.range * ext);
          var midX = ef.x + dirW * (12 + ef.range * ext * 0.52);
          var midY = ef.y - 34 * Math.sin(prog * Math.PI);
          ctx.strokeStyle = "#26222E";
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(ef.x + dirW * 8, ef.y + 2);
          ctx.quadraticCurveTo(midX, midY, tipX, ef.y - 4);
          ctx.stroke();
          ctx.strokeStyle = "#C084FC";
          ctx.lineWidth = 2.2;
          ctx.stroke();
          // Kilatan lecutan di ujung cambuk
          ctx.strokeStyle = "#F0DCFF";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tipX - 8, ef.y - 12); ctx.lineTo(tipX + 8, ef.y + 4);
          ctx.moveTo(tipX + 8, ef.y - 12); ctx.lineTo(tipX - 8, ef.y + 4);
          ctx.stroke();
        } else if (ef.kind === "lasso") {
          // 6. WONDER WOMAN - LASSO OF TRUTH: Tali emas bercahaya dengan gelung laso berputar di ujung
          var dirG = ef.facing || 1;
          var reach = ef.range * Math.min(1, prog * 2.2);
          var gx = ef.x + dirG * (16 + reach);
          ctx.globalAlpha = Math.min(1, ratio * 1.3);
          ctx.strokeStyle = "#F5CE53";
          ctx.lineWidth = 3.6;
          ctx.beginPath();
          ctx.moveTo(ef.x + dirG * 10, ef.y);
          ctx.quadraticCurveTo(ef.x + dirG * (10 + reach * 0.5), ef.y + Math.sin(prog * 14) * 14, gx, ef.y);
          ctx.stroke();
          ctx.strokeStyle = "#FFF4C2";
          ctx.lineWidth = 1.6;
          ctx.stroke();
          // Gelung laso emas berputar di ujung
          ctx.strokeStyle = "#FFD859";
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.ellipse(gx, ef.y, 18, 9 + Math.abs(Math.sin(prog * 18)) * 5, prog * 6, 0, Math.PI * 2);
          ctx.stroke();
        } else if (ef.kind === "smash") {
          // 7. HULK - HULK SMASH: Gelombang tanah hijau + retakan + bongkahan batu terbang
          var radS = ef.range * Math.min(1, prog * 1.45);
          ctx.globalAlpha = ratio * 0.9;
          ctx.strokeStyle = "#56B85C";
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.ellipse(ef.x, ef.y + 26, radS, Math.max(10, radS * 0.24), 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(86, 184, 92, 0.22)";
          ctx.fill();
          // Bongkahan batu terlempar ke udara
          (ef.drops || []).forEach(function (rock) {
            ctx.fillStyle = "#5C645E";
            ctx.fillRect(rock.x - rock.r, rock.y - rock.r, rock.r * 2, rock.r * 2);
            ctx.fillStyle = "#7FD685";
            ctx.fillRect(rock.x - rock.r, rock.y - rock.r, rock.r * 2, 3);
          });
        } else if (ef.kind === "beam") {
          // 8. GODZILLA - ATOMIC BREATH: Sinar plasma biru raksasa berdenyut + inti putih menyala
          var bw = ef.range * Math.min(1, prog * 3.0);
          var bx = ef.facing > 0 ? ef.x + 16 : (ef.x - 16 - bw);
          var pulse = 24 + Math.sin(performance.now() / 30) * 6;
          var bGrad = ctx.createLinearGradient(0, ef.y - pulse, 0, ef.y + pulse);
          bGrad.addColorStop(0, "rgba(78, 197, 241, 0)");
          bGrad.addColorStop(0.28, "rgba(78, 197, 241, 0.85)");
          bGrad.addColorStop(0.5, "#FFFFFF");
          bGrad.addColorStop(0.72, "rgba(78, 197, 241, 0.85)");
          bGrad.addColorStop(1, "rgba(78, 197, 241, 0)");
          ctx.globalAlpha = Math.min(1, ratio * 1.35);
          ctx.fillStyle = bGrad;
          ctx.fillRect(bx, ef.y - pulse, bw, pulse * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(bx, ef.y - 6, bw, 12);
          // Cincin plasma sepanjang sinar
          ctx.strokeStyle = "#DCF7FF";
          ctx.lineWidth = 2.4;
          for (var ri = 1; ri <= 4; ri++) {
            var rx = ef.facing > 0 ? (ef.x + 16 + bw * (ri / 4.5)) : (ef.x - 16 - bw * (ri / 4.5));
            ctx.beginPath();
            ctx.ellipse(rx, ef.y, 6, pulse * 0.72, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (ef.kind === "snap") {
          // 9. THANOS - INFINITY SNAP: Cincin 6 warna Infinity Stones meledak + kilatan emas
          var stones = ["#4EC5F1", "#FFE047", "#E85A5A", "#A855F7", "#56C288", "#F2994A"];
          var radT = ef.range * Math.min(1, prog * 1.35);
          ctx.globalAlpha = ratio * 0.92;
          ctx.fillStyle = "rgba(255, 244, 194, " + (ratio * 0.35) + ")";
          ctx.beginPath();
          ctx.arc(ef.x, ef.y, radT * 0.7, 0, Math.PI * 2);
          ctx.fill();
          stones.forEach(function (col, idx) {
            var rRing = Math.max(8, radT - idx * 14);
            ctx.strokeStyle = col;
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.arc(ef.x, ef.y, rRing, 0, Math.PI * 2);
            ctx.stroke();
            var ang = prog * 5 + idx * (Math.PI / 3);
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(ef.x + Math.cos(ang) * rRing, ef.y + Math.sin(ang) * rRing, 5.5, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        ctx.restore();
      });

      // Animasi Unik 2 Skill Gelombang Bergerak (Pocong & Kuntilanak)
      projectiles.forEach(function (pj) {
        var progP = 1 - Math.max(0, pj.life / (pj.maxLife || 1.5));
        ctx.save();
        if (pj.kind === "ghostwave") {
          // 2. POCONG - LOMPATAN MISTIS: Gelombang aura kain kafan putih berombak di tanah
          var dirP = pj.facing || 1;
          var waveH = 26 + Math.sin(performance.now() / 75) * 6;
          ctx.fillStyle = "rgba(244, 240, 232, 0.78)";
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(pj.x - dirP * 26, pj.y + 10);
          ctx.quadraticCurveTo(pj.x, pj.y - waveH, pj.x + dirP * 18, pj.y + 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Pita ikatan mistis melayang
          ctx.strokeStyle = "#8B8478";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pj.x - dirP * 22, pj.y - 4);
          ctx.quadraticCurveTo(pj.x - dirP * 8, pj.y - 14, pj.x + dirP * 8, pj.y - 2);
          ctx.stroke();
        } else if (pj.kind === "sonic") {
          // 3. KUNTILANAK - TAWA CEKIKIKAN: 3 busur gelombang suara ungu membesar + teks "HIHIHI..."
          var dirK = pj.facing || 1;
          var baseR = 14 + progP * 22;
          ctx.strokeStyle = "#C084FC";
          ctx.lineWidth = 3;
          for (var w = 0; w < 3; w++) {
            ctx.globalAlpha = Math.max(0.25, 1 - w * 0.25);
            ctx.beginPath();
            var startA = dirK > 0 ? -0.95 : (Math.PI - 0.95);
            var endA = dirK > 0 ? 0.95 : (Math.PI + 0.95);
            ctx.arc(pj.x - dirK * w * 10, pj.y, baseR - w * 4, startA, endA);
            ctx.stroke();
          }
          ctx.globalAlpha = 0.92;
          ctx.fillStyle = "#F0DCFF";
          ctx.font = "700 11px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("HIHIHI...", pj.x, pj.y - baseR - 6);
        }
        ctx.restore();
      });

      // Render Bos Terakhir (Raja Bayangan Lentera) + Kristal Kuis + Bola Serangan Bos
      if (currentStageIdx === totalStages - 1 && boss.active && !boss.defeated) {
        var bx = boss.x;
        var by = boss.y;
        var bw = boss.w;
        var bh = boss.h;
        var enragedDraw = boss.hp <= 50;

        // Aura arena bos
        ctx.save();
        var auraB = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 12, bx + bw / 2, by + bh / 2, 96);
        auraB.addColorStop(0, enragedDraw ? "rgba(216, 82, 82, 0.42)" : "rgba(148, 108, 198, 0.36)");
        auraB.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = auraB;
        ctx.beginPath();
        ctx.arc(bx + bw / 2, by + bh / 2, 96, 0, Math.PI * 2);
        ctx.fill();

        // Bayangan lantai bos
        ctx.fillStyle = "rgba(10, 14, 18, 0.38)";
        ctx.beginPath();
        ctx.ellipse(bx + bw / 2, FLOOR_Y - 2, bw * 0.56, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        if (boss.hurtTimer > 0 && Math.floor(performance.now() / 55) % 2 === 0) {
          ctx.globalAlpha = 0.6;
        }

        // Jubah gelap bertanduk 2.5D
        var bodyGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
        bodyGrad.addColorStop(0, enragedDraw ? "#5E232B" : "#342947");
        bodyGrad.addColorStop(1, "#16181F");
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx + 8, by + 22, bw - 16, bh - 22, [24, 24, 10, 10]);
        else ctx.rect(bx + 8, by + 22, bw - 16, bh - 22);
        ctx.fill();

        // Tanduk & Mahkota Emas
        ctx.fillStyle = enragedDraw ? "#E06D6D" : "#E6B43C";
        ctx.beginPath();
        ctx.moveTo(bx + 18, by + 28); ctx.lineTo(bx + 4, by - 4); ctx.lineTo(bx + 32, by + 22); ctx.closePath();
        ctx.moveTo(bx + bw - 18, by + 28); ctx.lineTo(bx + bw - 4, by - 4); ctx.lineTo(bx + bw - 32, by + 22); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#F5CE53";
        ctx.beginPath();
        ctx.moveTo(bx + 28, by + 22); ctx.lineTo(bx + bw / 2, by + 4); ctx.lineTo(bx + bw - 28, by + 22); ctx.closePath();
        ctx.fill();

        // Mata menyala
        ctx.fillStyle = enragedDraw ? "#FF6B6B" : "#FFE066";
        ctx.beginPath();
        ctx.ellipse(bx + 31, by + 50, 7, 4.5, 0.2, 0, Math.PI * 2);
        ctx.ellipse(bx + bw - 31, by + 50, 7, 4.5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Label kecil atas bos
        ctx.fillStyle = "rgba(18, 22, 26, 0.84)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx - 16, by - 30, bw + 32, 20, 999);
        else ctx.rect(bx - 16, by - 30, bw + 32, 20);
        ctx.fill();
        ctx.fillStyle = enragedDraw ? "#FF9C9C" : "#F5CE53";
        ctx.font = "700 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(enragedDraw ? "RAJA BAYANGAN (MARAH)" : "BOS TERAKHIR", bx + bw / 2, by - 20);
        ctx.restore();

        // Kristal Serangan Kuis melayang
        if (boss.orbReady) {
          var oy = boss.orbY + Math.sin(performance.now() / 220) * 7;
          ctx.save();
          var orbG = ctx.createRadialGradient(boss.orbX, oy, 3, boss.orbX, oy, 26);
          orbG.addColorStop(0, "#FFF9D6");
          orbG.addColorStop(0.55, "#F2C94C");
          orbG.addColorStop(1, "rgba(242, 201, 76, 0)");
          ctx.fillStyle = orbG;
          ctx.beginPath();
          ctx.arc(boss.orbX, oy, 26, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#FFF4B8";
          ctx.strokeStyle = "#C78E1E";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(boss.orbX, oy - 16);
          ctx.lineTo(boss.orbX + 13, oy);
          ctx.lineTo(boss.orbX, oy + 16);
          ctx.lineTo(boss.orbX - 13, oy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "700 10px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("KRISTAL KUIS", boss.orbX, oy - 22);
          ctx.restore();
        }

        // Bola Serangan Bos
        bossShots.forEach(function (s) {
          ctx.save();
          var sg = ctx.createRadialGradient(s.x - 3, s.y - 3, 2, s.x, s.y, s.r + 4);
          sg.addColorStop(0, "#FFD6D6");
          sg.addColorStop(0.55, "#D85A5A");
          sg.addColorStop(1, "rgba(90, 20, 40, 0)");
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r + 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // Partikel
      particles.forEach(function (pt) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      ctx.restore();

      // 3. Efek Cahaya Lentera di Stage 10 (koordinat layar)
      if (stage.darkMode) {
        var sxMe = me.x + me.w / 2 - cam.x;
        var syMe = me.y + me.h / 2 - cam.y;
        var grad = ctx.createRadialGradient(sxMe, syMe, 48, sxMe, syMe, 280);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(0.68, "rgba(12,16,20,0.75)");
        grad.addColorStop(1, "rgba(12,16,20,0.93)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }

      // 4. Lampu Merah Hijau di atas layar (Stage 5)
      if (stage.stopAndGo) {
        ctx.fillStyle = "rgba(20, 24, 28, 0.72)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(VIEW_W / 2 - 96, 56, 192, 34, 999);
        else ctx.rect(VIEW_W / 2 - 96, 56, 192, 34);
        ctx.fill();
        ctx.fillStyle = redLight ? "#E85A5A" : "#56C288";
        ctx.beginPath();
        ctx.arc(VIEW_W / 2 - 72, 73, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#F8F6F2";
        ctx.font = "600 12px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(redLight ? "MERAH: BERHENTI" : "HIJAU: BERGERAK", VIEW_W / 2 - 56, 73);
      }

      // 5. Minimap & Bar HP Bos Terakhir
      drawMinimap();
      if (boss.active && !boss.defeated) {
        var hpW = 340;
        var hpX = Math.round((VIEW_W - hpW) / 2);
        var hpY = 58;
        ctx.save();
        ctx.fillStyle = "rgba(18, 22, 26, 0.80)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(hpX - 10, hpY - 6, hpW + 20, 38, 10);
        else ctx.rect(hpX - 10, hpY - 6, hpW + 20, 38);
        ctx.fill();
        ctx.fillStyle = "#F5CE53";
        ctx.font = "700 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("BOS TERAKHIR: RAJA BAYANGAN (" + Math.round(boss.hp) + "%)", VIEW_W / 2, hpY + 6);
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        ctx.fillRect(hpX, hpY + 14, hpW, 10);
        ctx.fillStyle = boss.hp <= 50 ? "#E06D6D" : "#D49B4B";
        ctx.fillRect(hpX, hpY + 14, Math.round(hpW * (boss.hp / boss.maxHp)), 10);
        ctx.restore();
      }

      // 6. Banner Notif Ringkas
      if (bannerTimer > 0 && bannerText) {
        ctx.fillStyle = "rgba(20, 24, 28, 0.8)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(VIEW_W / 2 - 210, 100, 420, 32, 999);
        else ctx.rect(VIEW_W / 2 - 210, 100, 420, 32);
        ctx.fill();
        ctx.fillStyle = bannerGood ? "#9CE6C2" : "#F2A0A0";
        ctx.font = "600 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(bannerText, VIEW_W / 2, 116);
      }

      if (state === "paused") {
        ctx.fillStyle = "rgba(18, 22, 26, 0.62)";
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.fillStyle = "#F8F6F2";
        ctx.font = "600 22px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Permainan Dijeda", VIEW_W / 2, VIEW_H / 2);
      }
    }

    function finishPark(victory) {
      if (state === "ended") return;
      state = "ended";
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; }
      if (unsubPark) { unsubPark(); unsubPark = null; }
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(function () {});
      }
      if (victory) CORE.Sound.win();
      syncScore(true);

      if (cfg.onFinish) {
        var coinsEarned = Math.max(30, Math.min(400, Math.round(score / 12)));
        cfg.onFinish({
          victory: victory,
          score: score,
          coinsEarned: coinsEarned,
          correct: correctCount,
          wrong: wrongCount,
          extraLabel: "Stage selesai",
          extraValue: (victory ? totalStages : currentStageIdx) + " / " + totalStages
        });
      }
    }

    function loop(ts) {
      var dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      if (state === "playing") update(dt);
      render();
      if (state !== "ended") rafId = requestAnimationFrame(loop);
    }

    function onKeyDown(e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (state !== "playing") return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") { CORE.Sound.unlock(); keys.left = true; }
      if (e.code === "ArrowRight" || e.code === "KeyD") { CORE.Sound.unlock(); keys.right = true; }
      if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") {
        e.preventDefault();
        CORE.Sound.unlock();
        me.jumpBuf = 0.14;
      }
      if (e.code === "KeyF" || e.code === "KeyE" || e.code === "ShiftLeft") triggerRockThrow();
      if (e.code === "KeyQ") triggerSabotage();
    }

    function onKeyUp(e) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
    }

    function onVisibility() {
      if (document.hidden && state === "playing") state = "paused";
    }

    var padCleanups = [];
    function bindPad(sel, onDown, onUp) {
      var el = touchOverlay.querySelector(sel);
      if (!el) return;
      var d = function (e) { e.preventDefault(); CORE.Sound.unlock(); onDown(); };
      var u = function (e) { e.preventDefault(); if (onUp) onUp(); };
      el.addEventListener("pointerdown", d);
      el.addEventListener("pointerup", u);
      el.addEventListener("pointerleave", u);
      el.addEventListener("pointercancel", u);
      padCleanups.push(function () {
        el.removeEventListener("pointerdown", d);
        el.removeEventListener("pointerup", u);
        el.removeEventListener("pointerleave", u);
        el.removeEventListener("pointercancel", u);
      });
    }

    bindPad('[data-pad="left"]', function () { keys.left = true; }, function () { keys.left = false; });
    bindPad('[data-pad="right"]', function () { keys.right = true; }, function () { keys.right = false; });
    bindPad('[data-pad="jump"]', function () { if (state === "playing") me.jumpBuf = 0.14; }, null);
    bindPad('[data-pad="throw"]', triggerRockThrow, null);
    bindPad('[data-pad="sabotage"]', triggerSabotage, null);

    window.addEventListener("resize", checkOrientation);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibility);

    loadStage(0);
    checkOrientation();
    lastTs = performance.now();
    rafId = requestAnimationFrame(loop);

    return {
      getProtectedContainer: function () { return quizOverlay; },
      applyPenalty: function (pts, msg) {
        score = Math.max(0, score - pts);
        showBanner(msg || ("Moderator mengurangi " + pts + " poin."), false);
        syncScore(true);
      },
      togglePause: function () {
        if (state === "playing") { state = "paused"; return true; }
        if (state === "paused") { state = "playing"; lastTs = performance.now(); return false; }
        return false;
      },
      destroy: function () {
        state = "ended";
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        if (quizTimerId) { clearInterval(quizTimerId); quizTimerId = null; }
        if (unsubPark) { unsubPark(); unsubPark = null; }
        padCleanups.forEach(function (fn) { fn(); });
        window.removeEventListener("resize", checkOrientation);
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }

  return { create: create, STAGES: STAGES };
})();
