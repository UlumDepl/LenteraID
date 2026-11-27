/**
 * Perender 9 Karakter 2.5D & Pixel Art Orisinal Lentera ID
 * Karakter: Pocong, Kuntilanak, Pikachu, Catwoman, Wonder Woman, Hulk, Godzilla, Thanos.
 * Efek status visual: shock (petir), lasso (tali emas), confuse (pusaran terbalik),
 * hop (aura mistis), snap (menyusut mini), slip (tergelincir), hit.
 */
window.LenteraSprite = (function () {
  var sheetCache = {};
  var FRAME_SIZE = 48;
  var STATE_ROWS = { idle: 0, run: 1, jump: 2, slip: 3, hit: 4, shock: 4, lasso: 4, sticky: 3 };

  function loadSpriteSheet(charId) {
    var key = charId || "pocong";
    if (sheetCache[key]) return sheetCache[key];

    var entry = { img: null, ready: false, failed: false };
    sheetCache[key] = entry;

    var img = new Image();
    img.onload = function () {
      if (img.naturalWidth >= FRAME_SIZE && img.naturalHeight >= FRAME_SIZE) {
        entry.img = img;
        entry.ready = true;
      } else {
        entry.failed = true;
      }
    };
    img.onerror = function () { entry.failed = true; };
    img.src = "assets/img/sprites/" + encodeURIComponent(key) + ".png";
    return entry;
  }

  function drawGoldenKey(ctx, cx, y) {
    var hover = Math.sin(performance.now() / 240) * 3;
    ctx.save();
    ctx.translate(cx, y + hover);
    var g = ctx.createLinearGradient(-10, -6, 12, 6);
    g.addColorStop(0, "#FFF0A6");
    g.addColorStop(0.5, "#E3AC34");
    g.addColorStop(1, "#9E6D14");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#6E4A0B";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-6, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#3A2706";
    ctx.beginPath();
    ctx.arc(-6, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = g;
    ctx.fillRect(-1, -2, 13, 4);
    ctx.fillRect(6, 2, 2.6, 4.5);
    ctx.fillRect(10, 2, 2.6, 3.2);
    ctx.restore();
  }

  function drawNameplate(ctx, cx, topY, name, charObj) {
    var label = String(name || "Pemain").slice(0, 16);
    ctx.save();
    ctx.font = "600 11px system-ui, -apple-system, sans-serif";
    var w = Math.max(46, ctx.measureText(label).width + 18);
    var h = 20;
    var bx = Math.round(cx - w / 2);
    var by = Math.round(topY - h - 10);

    ctx.fillStyle = "rgba(22, 25, 28, 0.80)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, w, h, 999);
    else ctx.rect(bx, by, w, h);
    ctx.fill();

    ctx.fillStyle = (charObj && charObj.primary) || "#3F6F6A";
    ctx.beginPath();
    ctx.arc(bx + 8.5, by + h / 2, 3.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#F8F6F2";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, bx + 15, by + h / 2 + 0.5);
    ctx.restore();
  }

  function drawEyes(ctx, x, y, isHit, color) {
    if (isHit) {
      ctx.strokeStyle = color || "#1E2125";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 2, y + 2);
      ctx.moveTo(x + 2, y - 2); ctx.lineTo(x - 2, y + 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = color || "#1E2125";
      ctx.beginPath();
      ctx.ellipse(x, y, 1.9, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(x + 0.6, y - 0.8, 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCustomCharacter(ctx, charId, isRun, isJump, isHit, phase) {
    var bob = isRun ? Math.abs(Math.sin(phase)) * -3.5 : Math.sin(phase * 0.5) * 1.6;
    var leg = isRun ? Math.sin(phase) * 9 : (isJump ? 6 : 0);
    var arm = isRun ? Math.cos(phase) * 8 : (isJump ? -9 : 0);

    // 0. ermus (Fallback Pixel Art 8-bit jika sprite sheet PNG gagal dimuat)
    if (charId === "ermus") {
      var pBob = Math.round(bob / 3) * 3;
      var pLeg = Math.round(leg / 3) * 3;
      // Kaki celana gelap & sepatu pixel
      ctx.fillStyle = "#2C303A";
      ctx.fillRect(-7 - pLeg, -15, 5, 11);
      ctx.fillRect(2 + pLeg, -15, 5, 11);
      ctx.fillStyle = "#F5F5F2";
      ctx.fillRect(-7 - pLeg, -4, 6, 4);
      ctx.fillRect(2 + pLeg, -4, 6, 4);
      // Kemeja olive + kaos dalam putih
      ctx.fillStyle = "#5C5E3E";
      ctx.fillRect(-10, -34 + pBob, 20, 19);
      ctx.fillStyle = "#3E402A";
      ctx.fillRect(-10, -34 + pBob, 4, 19);
      ctx.fillStyle = "#F5F5F2";
      ctx.fillRect(-2, -34 + pBob, 5, 7);
      // Kepala + rambut ikal hitam + kumis tipis
      ctx.fillStyle = "#C88C70";
      ctx.fillRect(-8, -50 + pBob, 16, 16);
      ctx.fillStyle = "#1C1C22";
      ctx.fillRect(-10, -56 + pBob, 20, 8);
      ctx.fillRect(-10, -50 + pBob, 4, 7);
      ctx.fillStyle = "#3E2E28";
      ctx.fillRect(1, -39 + pBob, 6, 2);
      ctx.fillStyle = "#1A1414";
      ctx.fillRect(3, -45 + pBob, 3, 3);
      return;
    }

    // 1. POCONG (kain kafan putih bertali, gerak melompat lucu)
    if (charId === "pocong") {
      var hopY = isRun ? Math.abs(Math.sin(phase * 1.1)) * -9 : bob;
      // Ikatan pucuk atas
      ctx.fillStyle = "#E8E4DA";
      ctx.beginPath();
      ctx.moveTo(-4, -52 + hopY); ctx.lineTo(-9, -62 + hopY); ctx.lineTo(0, -56 + hopY);
      ctx.lineTo(8, -62 + hopY); ctx.lineTo(4, -52 + hopY);
      ctx.closePath();
      ctx.fill();
      // Badan dibalut kain kafan 3D
      var pG = ctx.createLinearGradient(-12, -50 + hopY, 12, -2 + hopY);
      pG.addColorStop(0, "#FFFFFF");
      pG.addColorStop(0.65, "#E8E4DA");
      pG.addColorStop(1, "#C5BFB2");
      ctx.fillStyle = pG;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-11, -50 + hopY, 22, 48, [12, 12, 9, 9]);
      else ctx.rect(-11, -50 + hopY, 22, 48);
      ctx.fill();
      // Tali kafan
      ctx.fillStyle = "#8B8478";
      ctx.fillRect(-10, -51 + hopY, 20, 2.5);
      ctx.fillRect(-11, -26 + hopY, 22, 2.6);
      ctx.fillRect(-9, -9 + hopY, 18, 2.5);
      // Bukaan wajah gelap + mata
      ctx.fillStyle = "#D4CCB8";
      ctx.beginPath();
      ctx.ellipse(3, -38 + hopY, 6.2, 7.2, 0, 0, Math.PI * 2);
      ctx.fill();
      drawEyes(ctx, 4.8, -39 + hopY, isHit, "#22252A");
      return;
    }

    // 2. KUNTILANAK (gaun putih melayang, rambut panjang hitam)
    if (charId === "kuntilanak") {
      var floatY = Math.sin(performance.now() / 220) * 4 - 4;
      // Rambut panjang hitam di belakang
      ctx.fillStyle = "#181A1F";
      ctx.beginPath();
      ctx.ellipse(-2, -32 + floatY, 13, 21, 0, 0, Math.PI * 2);
      ctx.fill();
      // Gaun putih melayang 3D
      var kG = ctx.createLinearGradient(-11, -35 + floatY, 11, -2 + floatY);
      kG.addColorStop(0, "#FFFFFF");
      kG.addColorStop(1, "#CBD5DE");
      ctx.fillStyle = kG;
      ctx.beginPath();
      ctx.moveTo(-8, -34 + floatY);
      ctx.lineTo(8, -34 + floatY);
      ctx.lineTo(13, -3 + floatY);
      ctx.lineTo(5, -6 + floatY);
      ctx.lineTo(0, -2 + floatY);
      ctx.lineTo(-6, -6 + floatY);
      ctx.lineTo(-13, -3 + floatY);
      ctx.closePath();
      ctx.fill();
      // Kepala pucat + poni rambut
      ctx.fillStyle = "#EEF2F5";
      ctx.beginPath();
      ctx.arc(1, -43 + floatY, 9.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#181A1F";
      ctx.beginPath();
      ctx.arc(0, -45 + floatY, 9.6, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();
      drawEyes(ctx, 4.6, -42.5 + floatY, isHit, "#9B2C2C");
      // Lengan menjulur
      ctx.strokeStyle = "#EEF2F5";
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(4, -29 + floatY);
      ctx.lineTo(14 + Math.sin(phase) * 2, -26 + floatY);
      ctx.stroke();
      return;
    }

    // 3. PIKACHU (kuning cerah, telinga ujung hitam, pipi merah, ekor petir)
    if (charId === "pikachu") {
      // Ekor petir zig-zag di belakang
      ctx.strokeStyle = "#E6B422";
      ctx.lineWidth = 4;
      ctx.lineJoin = "miter";
      ctx.beginPath();
      ctx.moveTo(-8, -16 + bob);
      ctx.lineTo(-17, -23 + bob);
      ctx.lineTo(-13, -29 + bob);
      ctx.lineTo(-22, -37 + bob);
      ctx.stroke();
      // Kaki kecil
      ctx.fillStyle = "#D4A017";
      ctx.beginPath();
      ctx.ellipse(-4 - leg * 0.6, -3, 4.2, 2.6, 0, 0, Math.PI * 2);
      ctx.ellipse(5 + leg * 0.6, -3, 4.2, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Badan kuning bulat 3D
      var pkG = ctx.createRadialGradient(-3, -26 + bob, 2, 0, -22 + bob, 16);
      pkG.addColorStop(0, "#FFF08A");
      pkG.addColorStop(0.65, "#F4CA3A");
      pkG.addColorStop(1, "#C99614");
      ctx.fillStyle = pkG;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-11, -34 + bob, 22, 28, 11);
      else ctx.rect(-11, -34 + bob, 22, 28);
      ctx.fill();
      // Telinga panjang berujung hitam
      ctx.fillStyle = "#F4CA3A";
      ctx.beginPath();
      ctx.moveTo(-5, -45 + bob); ctx.lineTo(-12, -62 + bob); ctx.lineTo(-1, -48 + bob); ctx.closePath();
      ctx.moveTo(3, -45 + bob); ctx.lineTo(11, -61 + bob); ctx.lineTo(8, -46 + bob); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#1F2226";
      ctx.beginPath();
      ctx.moveTo(-10, -56 + bob); ctx.lineTo(-12, -62 + bob); ctx.lineTo(-6, -55 + bob); ctx.closePath();
      ctx.moveTo(8, -55 + bob); ctx.lineTo(11, -61 + bob); ctx.lineTo(9.5, -54 + bob); ctx.closePath();
      ctx.fill();
      // Kepala kuning
      ctx.fillStyle = pkG;
      ctx.beginPath();
      ctx.arc(0, -40 + bob, 10.5, 0, Math.PI * 2);
      ctx.fill();
      // Pipi merah listrik
      ctx.fillStyle = "#E04438";
      ctx.beginPath();
      ctx.arc(5.5, -36.5 + bob, 2.6, 0, Math.PI * 2);
      ctx.fill();
      drawEyes(ctx, 4.5, -41.5 + bob, isHit, "#1F2226");
      return;
    }

    // 4. CATWOMAN (kostum hitam sleek, telinga kucing, kacamata visor)
    if (charId === "catwoman") {
      // Cambuk melingkar di pinggang
      ctx.strokeStyle = "#7D5299";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(-10, -18 + bob, 6, 0, Math.PI * 1.5);
      ctx.stroke();
      // Kaki
      ctx.strokeStyle = "#1E2026";
      ctx.lineWidth = 4.4;
      ctx.beginPath();
      ctx.moveTo(-4, -16 + bob); ctx.lineTo(-4 - leg, -3);
      ctx.moveTo(4, -16 + bob); ctx.lineTo(4 + leg, -3);
      ctx.stroke();
      // Badan kostum hitam 3D
      var cwG = ctx.createLinearGradient(-10, -36 + bob, 10, -14 + bob);
      cwG.addColorStop(0, "#4A4E59");
      cwG.addColorStop(1, "#181A20");
      ctx.fillStyle = cwG;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-9, -35 + bob, 18, 21, 7);
      else ctx.rect(-9, -35 + bob, 18, 21);
      ctx.fill();
      ctx.fillStyle = "#9B6BB0";
      ctx.fillRect(-9, -22 + bob, 18, 3);
      // Telinga kucing
      ctx.fillStyle = "#1E2026";
      ctx.beginPath();
      ctx.moveTo(-8, -48 + bob); ctx.lineTo(-9, -59 + bob); ctx.lineTo(-2, -51 + bob); ctx.closePath();
      ctx.moveTo(2, -51 + bob); ctx.lineTo(9, -59 + bob); ctx.lineTo(8, -48 + bob); ctx.closePath();
      ctx.fill();
      // Kepala bertopeng
      ctx.fillStyle = cwG;
      ctx.beginPath();
      ctx.arc(0, -44 + bob, 9.6, 0, Math.PI * 2);
      ctx.fill();
      // Visor ungu mengkilap
      ctx.fillStyle = "#C084FC";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(0, -47 + bob, 8.5, 4.2, 2);
      else ctx.rect(0, -47 + bob, 8.5, 4.2);
      ctx.fill();
      // Lengan
      ctx.strokeStyle = "#2E313A";
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(4, -30 + bob); ctx.lineTo(9 + arm * 0.75, -18 + bob);
      ctx.stroke();
      return;
    }

    // 5. WONDER WOMAN (tiara emas, zirah merah-biru-emas, laso emas)
    if (charId === "wonderwoman") {
      // Rambut gelap di belakang
      ctx.fillStyle = "#231B1B";
      ctx.beginPath();
      ctx.ellipse(-4, -40 + bob, 9, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      // Kaki & sepatu bot merah
      ctx.strokeStyle = "#E6C7A8";
      ctx.lineWidth = 4.4;
      ctx.beginPath();
      ctx.moveTo(-4, -16 + bob); ctx.lineTo(-4 - leg, -3);
      ctx.moveTo(4, -16 + bob); ctx.lineTo(4 + leg, -3);
      ctx.stroke();
      ctx.strokeStyle = "#B83232";
      ctx.beginPath();
      ctx.moveTo(-4 - leg * 0.5, -9); ctx.lineTo(-4 - leg, -3);
      ctx.moveTo(4 + leg * 0.5, -9); ctx.lineTo(4 + leg, -3);
      ctx.stroke();
      // Zirah merah + rok biru + sabuk emas
      ctx.fillStyle = "#C23636";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-9.5, -35 + bob, 19, 12, [6, 6, 1, 1]);
      else ctx.rect(-9.5, -35 + bob, 19, 12);
      ctx.fill();
      ctx.fillStyle = "#2A4D8F";
      ctx.fillRect(-10, -23 + bob, 20, 8);
      ctx.fillStyle = "#E6B43C";
      ctx.fillRect(-10, -24.5 + bob, 20, 3);
      // Laso emas di pinggang
      ctx.strokeStyle = "#FFE07D";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(-9, -20 + bob, 4.5, 0, Math.PI * 2);
      ctx.stroke();
      // Kepala + tiara emas
      ctx.fillStyle = "#F0D5B8";
      ctx.beginPath();
      ctx.arc(0, -44 + bob, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#E6B43C";
      ctx.beginPath();
      ctx.moveTo(-9, -49 + bob); ctx.lineTo(0, -54 + bob); ctx.lineTo(9, -49 + bob); ctx.lineTo(9, -47 + bob); ctx.lineTo(-9, -47 + bob);
      ctx.closePath();
      ctx.fill();
      drawEyes(ctx, 4.5, -43.5 + bob, isHit, "#1F2226");
      // Lengan dengan gelang perak
      ctx.strokeStyle = "#F0D5B8";
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(4, -30 + bob); ctx.lineTo(9 + arm * 0.75, -18 + bob);
      ctx.stroke();
      ctx.fillStyle = "#CBD5E1";
      ctx.fillRect(6 + arm * 0.55, -22 + bob, 4.5, 3.5);
      return;
    }

    // 6. HULK (tubuh kekar besar hijau, celana ungu robek)
    if (charId === "hulk") {
      var hG = ctx.createLinearGradient(-14, -40 + bob, 14, -12 + bob);
      hG.addColorStop(0, "#68B85B");
      hG.addColorStop(1, "#2E6E33");
      // Kaki tebal
      ctx.strokeStyle = "#3E8742";
      ctx.lineWidth = 6.2;
      ctx.beginPath();
      ctx.moveTo(-5, -16 + bob); ctx.lineTo(-5 - leg, -3);
      ctx.moveTo(5, -16 + bob); ctx.lineTo(5 + leg, -3);
      ctx.stroke();
      // Celana ungu robek
      ctx.fillStyle = "#6E4B8C";
      ctx.fillRect(-12, -21 + bob, 24, 9);
      // Dada kekar hijau
      ctx.fillStyle = hG;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-13.5, -40 + bob, 27, 22, 8);
      else ctx.rect(-13.5, -40 + bob, 27, 22);
      ctx.fill();
      // Kepala hijau + rambut jabrik
      ctx.fillStyle = hG;
      ctx.beginPath();
      ctx.arc(0, -47 + bob, 9.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1C1E22";
      ctx.beginPath();
      ctx.moveTo(-9, -51 + bob); ctx.lineTo(-7, -59 + bob); ctx.lineTo(-2, -55 + bob);
      ctx.lineTo(2, -60 + bob); ctx.lineTo(6, -55 + bob); ctx.lineTo(9, -51 + bob);
      ctx.closePath();
      ctx.fill();
      drawEyes(ctx, 4.4, -46.5 + bob, isHit, "#1C1E22");
      // Lengan raksasa
      ctx.strokeStyle = "#48994B";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(8, -34 + bob); ctx.lineTo(13 + arm * 0.75, -18 + bob);
      ctx.stroke();
      return;
    }

    // 7. GODZILLA (kaiju hijau tua, sirip punggung biru menyala, ekor besar)
    if (charId === "godzilla") {
      // Ekor besar di belakang
      ctx.fillStyle = "#334C46";
      ctx.beginPath();
      ctx.moveTo(-8, -14 + bob);
      ctx.lineTo(-26, -9 + bob);
      ctx.lineTo(-10, -24 + bob);
      ctx.closePath();
      ctx.fill();
      // Sirip punggung biru plasma menyala
      ctx.fillStyle = "#5EC2E6";
      ctx.beginPath();
      ctx.moveTo(-10, -46 + bob); ctx.lineTo(-18, -49 + bob); ctx.lineTo(-11, -39 + bob);
      ctx.moveTo(-11, -37 + bob); ctx.lineTo(-21, -38 + bob); ctx.lineTo(-12, -29 + bob);
      ctx.moveTo(-12, -27 + bob); ctx.lineTo(-20, -25 + bob); ctx.lineTo(-11, -18 + bob);
      ctx.fill();
      // Kaki kuat
      ctx.strokeStyle = "#2A3E39";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-4, -14 + bob); ctx.lineTo(-4 - leg * 0.8, -3);
      ctx.moveTo(5, -14 + bob); ctx.lineTo(5 + leg * 0.8, -3);
      ctx.stroke();
      // Badan kaiju
      var gzG = ctx.createLinearGradient(-12, -40 + bob, 12, -10 + bob);
      gzG.addColorStop(0, "#4C6E65");
      gzG.addColorStop(1, "#263B36");
      ctx.fillStyle = gzG;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-12, -38 + bob, 24, 27, 9);
      else ctx.rect(-12, -38 + bob, 24, 27);
      ctx.fill();
      // Perut sisik terang
      ctx.fillStyle = "#6F8F85";
      ctx.beginPath();
      ctx.ellipse(4, -24 + bob, 6, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Kepala + moncong reptil
      ctx.fillStyle = gzG;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-9, -53 + bob, 23, 15, 6);
      else ctx.rect(-9, -53 + bob, 23, 15);
      ctx.fill();
      drawEyes(ctx, 5, -47 + bob, isHit, "#F2C94C");
      return;
    }

    // 8. THANOS (ungu kekar, zirah emas-biru, Infinity Gauntlet permata)
    var thG = ctx.createLinearGradient(-13, -40 + bob, 13, -12 + bob);
    thG.addColorStop(0, "#8D6BB0");
    thG.addColorStop(1, "#4E356B");
    // Kaki zirah
    ctx.strokeStyle = "#313C66";
    ctx.lineWidth = 5.6;
    ctx.beginPath();
    ctx.moveTo(-5, -16 + bob); ctx.lineTo(-5 - leg, -3);
    ctx.moveTo(5, -16 + bob); ctx.lineTo(5 + leg, -3);
    ctx.stroke();
    // Badan zirah emas & biru
    ctx.fillStyle = "#2E3A68";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-12.5, -39 + bob, 25, 24, 7);
    else ctx.rect(-12.5, -39 + bob, 25, 24);
    ctx.fill();
    ctx.fillStyle = "#E3B23C";
    ctx.fillRect(-12.5, -39 + bob, 25, 6);
    ctx.fillRect(-12.5, -21 + bob, 25, 4);
    // Kepala ungu + helm emas
    ctx.fillStyle = thG;
    ctx.beginPath();
    ctx.arc(0, -47 + bob, 9.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#E3B23C";
    ctx.beginPath();
    ctx.arc(0, -49 + bob, 10, Math.PI, 0);
    ctx.fill();
    drawEyes(ctx, 4.5, -46.5 + bob, isHit, "#1F2226");
    // Lengan kanan memakai Infinity Gauntlet emas berpermata
    ctx.strokeStyle = "#825CA8";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(8, -33 + bob); ctx.lineTo(13 + arm * 0.7, -20 + bob);
    ctx.stroke();
    ctx.fillStyle = "#F0BE3A";
    ctx.beginPath();
    ctx.arc(14 + arm * 0.7, -18 + bob, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5EC2E6"; ctx.fillRect(12 + arm * 0.7, -20 + bob, 2, 2);
    ctx.fillStyle = "#E04438"; ctx.fillRect(15 + arm * 0.7, -20 + bob, 2, 2);
    ctx.fillStyle = "#56C288"; ctx.fillRect(13.5 + arm * 0.7, -17 + bob, 2, 2);
  }

  function drawCharacter(ctx, opts) {
    var x = opts.x || 0;
    var y = opts.y || 0;
    var w = opts.w || 34;
    var h = opts.h || 50;
    var animState = opts.animState || "idle";
    var phase = opts.phase || 0;
    var facing = opts.facing === -1 ? -1 : 1;
    var charObj = opts.character || { id: "pocong", primary: "#E6E2D8", accent: "#6B7278" };
    var charId = charObj.id || "pocong";
    var hasKey = Boolean(opts.hasKey);
    var isMini = Boolean(opts.isMini);
    var statusEffect = opts.statusEffect || ""; // shock | lasso | confuse | hop | snap | slip
    var cx = x + w / 2;

    var sheet = loadSpriteSheet(charId);
    ctx.save();

    // Bayangan lantai
    var shScale = (animState === "jump" ? 0.65 : 1) * (isMini ? 0.6 : 1);
    ctx.fillStyle = "rgba(18, 22, 26, 0.24)";
    ctx.beginPath();
    ctx.ellipse(cx, y + h - 1, w * 0.5 * shScale, 4.5 * shScale, 0, 0, Math.PI * 2);
    ctx.fill();

    var shakeX = statusEffect === "shock" ? (Math.sin(performance.now() / 22) * 3) : 0;

    if (sheet.ready && sheet.img) {
      var row = STATE_ROWS[animState] || 0;
      var cols = Math.max(1, Math.floor(sheet.img.naturalWidth / FRAME_SIZE));
      var col = Math.floor(phase * 2) % cols;
      var drawW = charObj.isPixel ? Math.round(w * 1.48) : w;
      var drawH = charObj.isPixel ? Math.round(h * 1.12) : h;
      ctx.imageSmoothingEnabled = false;
      ctx.translate(cx + shakeX, y + h);
      if (statusEffect === "slip") ctx.rotate(facing * -0.22);
      ctx.scale(facing * (isMini ? 0.6 : 1), isMini ? 0.6 : 1);
      ctx.drawImage(sheet.img, col * FRAME_SIZE, row * FRAME_SIZE, FRAME_SIZE, FRAME_SIZE, -drawW / 2, -drawH, drawW, drawH);
    } else {
      if (animState === "hit" && Math.floor(performance.now() / 65) % 2 === 0) {
        ctx.globalAlpha = 0.58;
      }
      ctx.translate(cx + shakeX, y + h);
      if (statusEffect === "slip") ctx.rotate(facing * -0.28);
      var sc = isMini ? 0.6 : 1;
      ctx.scale(facing * sc, sc);
      drawCustomCharacter(ctx, charId, animState === "run", animState === "jump", animState === "hit" || statusEffect === "shock", phase);
    }
    ctx.restore();

    // Overlay Efek Status Unik Tiap Skill
    if (statusEffect === "shock") {
      ctx.save();
      ctx.strokeStyle = "#FFE047";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 6); ctx.lineTo(x + w * 0.4, y + 18); ctx.lineTo(x + 2, y + 30); ctx.lineTo(x + w + 4, y + 42);
      ctx.stroke();
      ctx.restore();
    } else if (statusEffect === "lasso") {
      ctx.save();
      ctx.strokeStyle = "#FFD859";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, y + h * 0.52, w * 0.56, 7, -0.1, 0, Math.PI * 2);
      ctx.ellipse(cx, y + h * 0.72, w * 0.52, 6, 0.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (statusEffect === "confuse") {
      ctx.save();
      var ang = performance.now() / 180;
      ctx.strokeStyle = "#C084FC";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * 9, y - 6, 4.5, 0, Math.PI * 2);
      ctx.arc(cx - Math.cos(ang) * 9, y - 6, 3.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (statusEffect === "hop") {
      ctx.save();
      ctx.strokeStyle = "rgba(235, 240, 245, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, y + h - 4, w * 0.62, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (statusEffect === "snap") {
      ctx.save();
      ctx.fillStyle = "rgba(192, 132, 252, 0.65)";
      ctx.beginPath();
      ctx.arc(cx - 10, y + 20, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 12, y + 32, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (statusEffect === "sticky") {
      ctx.save();
      var drip = (performance.now() / 160) % 6;
      ctx.fillStyle = "rgba(252, 250, 240, 0.92)";
      ctx.strokeStyle = "rgba(210, 205, 190, 0.9)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx - 8, y + 18 + drip * 0.5, 4.2, 0, Math.PI * 2);
      ctx.arc(cx + 7, y + 26 + drip * 0.4, 5, 0, Math.PI * 2);
      ctx.arc(cx - 2, y + 36 + drip * 0.6, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(248, 246, 234, 0.85)";
      ctx.beginPath();
      ctx.ellipse(cx, y + h - 2, w * 0.65, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    var topAnchor = isMini ? (y + h * 0.36) : y;
    if (hasKey) drawGoldenKey(ctx, cx, topAnchor - 36);
    if (opts.name) drawNameplate(ctx, cx, topAnchor - (hasKey ? 14 : 0), opts.name, charObj);
  }

  return {
    drawCharacter: drawCharacter,
    drawGoldenKey: drawGoldenKey,
    drawNameplate: drawNameplate
  };
})();
