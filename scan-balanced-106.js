(() => {
  "use strict";

  const STORE = "deskin_state_v4";
  const $ = (selector, root = document) => root.querySelector(selector);

  let pendingScan = null;
  let lastImageData = null;
  let lastMimeType = "image/jpeg";

  boot();

  function boot() {
    patchAnalyzer();
    new MutationObserver(patchAnalyzer).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", handleClick, true);
    document.addEventListener("change", handleChange, true);
  }

  function patchAnalyzer() {
    if ($("#pageTitle")?.textContent?.trim() !== "SKINAnalyzer") return;
    if ($("#balancedScanPanel")) return;

    const oldForm = $("#analysisForm");
    if (oldForm) oldForm.remove();
    const oldStrict = $("#strictScanPanel");
    if (oldStrict) oldStrict.remove();
    const oldReal = $("#realScanPanel");
    if (oldReal) oldReal.remove();

    const grid = $(".container .grid.two");
    if (!grid) return;

    const panel = document.createElement("section");
    panel.id = "balancedScanPanel";
    panel.className = "card stack";
    panel.innerHTML = `
      <div>
        <p class="eyebrow">Balanced local scan</p>
        <h2>Hasil scan wajah lokal</h2>
        <p class="muted">Standar diperbaiki: wajah dekat tetap diterima selama gambar tidak polos seperti tembok, cukup tajam, dan area kulit berada di tengah.</p>
      </div>
      <div id="scanResultBody" class="stack">
        <div class="panel">
          <strong>Belum ada hasil scan.</strong>
          <p class="muted">Gunakan kamera atau upload foto wajah. Aplikasi akan menolak gambar yang terlalu polos, gelap, blur, atau bukan kulit/wajah.</p>
        </div>
      </div>
      <button id="saveRealScan" class="primary-btn" type="button" disabled>Simpan hasil scan</button>
    `;

    grid.appendChild(panel);
  }

  function handleClick(event) {
    const capture = event.target.closest("#capturePhoto");
    if (capture) {
      setTimeout(() => {
        const image = imageFromCameraBox();
        if (image) runBalancedScan(image.data, image.mimeType, "Camera Balanced Scan");
      }, 380);
      return;
    }

    const connect = event.target.closest("#connectDevice");
    if (connect) {
      setTimeout(renderNoImageDetector, 250);
      return;
    }

    const save = event.target.closest("#saveRealScan");
    if (save) {
      event.preventDefault();
      event.stopImmediatePropagation();
      savePendingScan();
    }
  }

  function handleChange(event) {
    if (event.target?.id !== "photoUpload") return;
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      lastImageData = dataUrl;
      lastMimeType = file.type || "image/jpeg";
      setTimeout(() => runBalancedScan(dataUrl, lastMimeType, "Photo Upload Balanced Scan"), 250);
    };
    reader.readAsDataURL(file);
  }

  function imageFromCameraBox() {
    const img = $("#cameraBox img");
    if (img?.src?.startsWith("data:image")) {
      lastImageData = img.src;
      lastMimeType = img.src.slice(5, img.src.indexOf(";")) || "image/jpeg";
      return { data: lastImageData, mimeType: lastMimeType };
    }

    const video = $("#videoPreview");
    if (video) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
      lastImageData = dataUrl;
      lastMimeType = "image/jpeg";
      return { data: dataUrl, mimeType: "image/jpeg" };
    }

    if (lastImageData) return { data: lastImageData, mimeType: lastMimeType };
    return null;
  }

  async function runBalancedScan(dataUrl, mimeType, source) {
    if ($("#pageTitle")?.textContent?.trim() !== "SKINAnalyzer") return;

    const body = $("#scanResultBody");
    const save = $("#saveRealScan");
    if (body) {
      body.innerHTML = `
        <div class="panel">
          <strong>DeSkin sedang memvalidasi wajah...</strong>
          <p class="muted">Foto diproses lokal di browser, tidak memakai limit Gemini dan tidak dikirim ke server.</p>
        </div>
      `;
    }
    if (save) save.disabled = true;

    try {
      const scan = await analyzeBalanced(dataUrl);
      if (!scan.isSkinImage || scan.confidence < 52) {
        pendingScan = null;
        renderRejectedScan(scan);
        return;
      }

      pendingScan = {
        id: uid(),
        date: new Date().toISOString(),
        moisture: scan.moisture,
        sebum: scan.sebum,
        texture: scan.texture,
        acne: scan.acne,
        sensitivity: scan.sensitivity,
        source,
        notes: `${source}: ${scan.summary} ${scan.safetyNote}`,
        ai: {
          model: "balanced-local-face-scan-v3",
          confidence: scan.confidence,
          skinType: scan.skinType,
          concerns: scan.concerns,
          summary: scan.summary,
          safetyNote: scan.safetyNote,
          method: scan.method,
          standards: scan.standards
        }
      };

      renderPendingScan(scan);
    } catch (error) {
      pendingScan = null;
      if (body) {
        body.innerHTML = `
          <div class="panel">
            <strong>Scan gagal.</strong>
            <p class="muted">${escapeHtml(error.message || "Coba ulangi dengan foto wajah yang lebih jelas.")}</p>
          </div>
        `;
      }
      if (save) save.disabled = true;
    }
  }

  async function analyzeBalanced(dataUrl) {
    const image = await loadImage(dataUrl);
    const size = 224;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const fit = coverFit(image.width, image.height, size, size);
    ctx.drawImage(image, fit.sx, fit.sy, fit.sw, fit.sh, 0, 0, size, size);

    let faceBox = null;
    if ("FaceDetector" in window) {
      try {
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(canvas);
        if (faces && faces[0]?.boundingBox) faceBox = normalizeBox(faces[0].boundingBox, size);
      } catch {
        faceBox = null;
      }
    }

    const pixels = ctx.getImageData(0, 0, size, size).data;
    const stats = collectStats(pixels, size, faceBox);
    const standards = validateBalanced(stats, faceBox);

    if (!standards.ok) {
      return {
        isSkinImage: false,
        confidence: standards.confidence,
        moisture: 50,
        sebum: 50,
        texture: 50,
        acne: 50,
        sensitivity: 50,
        skinType: "unknown",
        concerns: [],
        summary: standards.reason,
        safetyNote: "Hasil scan tidak dibuat karena gambar belum memenuhi standar validasi wajah.",
        method: faceBox ? "native-face-detector-rejected" : "balanced-local-validation-rejected",
        standards
      };
    }

    const metrics = estimateSkinMetrics(stats);
    return {
      isSkinImage: true,
      confidence: standards.confidence,
      ...metrics,
      method: faceBox ? "native-face-detector + balanced-pixel-analysis" : "balanced-local-face-heuristic + pixel-analysis",
      standards,
      safetyNote: "Hasil adalah estimasi visual lokal untuk edukasi, bukan diagnosis medis. Hasil lebih konsisten bila wajah berada di tengah dan cahaya merata."
    };
  }

  function collectStats(pixels, size, faceBox) {
    const region = faceBox ? expandBox(faceBox, size, 0.16) : { x: 0, y: 0, w: size, h: size };
    const skin = [];
    let skinCount = 0, totalCount = 0;
    let redCount = 0, shineCount = 0, darkCount = 0;
    let totalBrightness = 0, totalSaturation = 0;
    let rSum = 0, gSum = 0, bSum = 0, rSq = 0, gSq = 0, bSq = 0;
    let minX = size, minY = size, maxX = 0, maxY = 0;
    let edgeSum = 0, edgeN = 0;
    const grid = Array.from({ length: 25 }, () => ({ skin: 0, total: 0, dark: 0 }));

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (x < region.x || y < region.y || x > region.x + region.w || y > region.y + region.h) continue;
        totalCount++;
        const i = (y * size + x) * 4;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const hsv = rgbToHsv(r, g, b);
        const ycbcr = rgbToYcbcr(r, g, b);
        const bright = (r + g + b) / 3;
        const next = ((y * size + x + 1) * 4);
        const down = (((y + 1) * size + x) * 4);
        const grad = (
          Math.abs(r - pixels[next]) + Math.abs(g - pixels[next + 1]) + Math.abs(b - pixels[next + 2]) +
          Math.abs(r - pixels[down]) + Math.abs(g - pixels[down + 1]) + Math.abs(b - pixels[down + 2])
        ) / 6;
        edgeSum += grad;
        edgeN++;

        const gx = Math.min(4, Math.floor((x / size) * 5));
        const gy = Math.min(4, Math.floor((y / size) * 5));
        const cell = grid[gy * 5 + gx];
        cell.total++;
        if (bright < 90 && hsv.s > 0.10) cell.dark++;

        const isSkin = skinLike(r, g, b, hsv, ycbcr);
        if (!isSkin) continue;

        cell.skin++;
        skinCount++;
        skin.push({ r, g, b, h: hsv.h, s: hsv.s, v: hsv.v, bright, grad, x, y });
        totalBrightness += bright;
        totalSaturation += hsv.s;
        rSum += r; gSum += g; bSum += b;
        rSq += r * r; gSq += g * g; bSq += b * b;
        if (r > g * 1.10 && r > b * 1.18 && hsv.s > 0.22 && bright > 68) redCount++;
        if (bright > 190 && hsv.s < 0.34) shineCount++;
        if (bright < 76) darkCount++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    const n = Math.max(1, skinCount);
    const bboxW = Math.max(0, maxX - minX + 1);
    const bboxH = Math.max(0, maxY - minY + 1);
    const bboxAreaRatio = (bboxW * bboxH) / (size * size);
    const aspect = bboxH ? bboxW / bboxH : 0;
    const cx = skinCount ? (minX + bboxW / 2) / size : 0.5;
    const cy = skinCount ? (minY + bboxH / 2) / size : 0.5;
    const centerDistance = Math.hypot(cx - 0.5, cy - 0.5);
    const avgR = rSum / n, avgG = gSum / n, avgB = bSum / n;
    const colorStd = Math.sqrt(Math.max(0, (rSq / n - avgR * avgR + gSq / n - avgG * avgG + bSq / n - avgB * avgB) / 3));
    const gridRatios = grid.map(c => c.total ? c.skin / c.total : 0);
    const darkRatios = grid.map(c => c.total ? c.dark / c.total : 0);
    const leftSkin = avgCells(gridRatios, [0, 5, 10, 15, 20, 1, 6, 11, 16, 21]);
    const rightSkin = avgCells(gridRatios, [3, 8, 13, 18, 23, 4, 9, 14, 19, 24]);
    const centerSkin = avgCells(gridRatios, [6, 7, 8, 11, 12, 13, 16, 17, 18]);
    const upperDark = avgCells(darkRatios, [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    const lowerDark = avgCells(darkRatios, [15, 16, 17, 18, 19]);
    const skinRatio = skinCount / Math.max(1, totalCount);

    return {
      size, region, faceBox, skin, skinCount, totalCount, skinRatio,
      bboxW, bboxH, bboxAreaRatio, aspect, centerDistance,
      avgBrightness: totalBrightness / n,
      avgSaturation: totalSaturation / n,
      avgR, avgG, avgB,
      colorStd: Number.isFinite(colorStd) ? colorStd : 0,
      edgeDensity: edgeN ? edgeSum / edgeN : 0,
      redRatio: redCount / n,
      shineRatio: shineCount / n,
      darkRatio: darkCount / n,
      leftRightDiff: Math.abs(leftSkin - rightSkin),
      centerSkin,
      upperDark,
      lowerDark,
      featureScore: upperDark * 0.60 + lowerDark * 0.40,
      gridRatios
    };
  }

  function validateBalanced(stats, faceBox) {
    const failures = [];
    let confidence = 0;

    if (faceBox) {
      const area = (faceBox.w * faceBox.h) / (stats.size * stats.size);
      const aspect = faceBox.w / Math.max(1, faceBox.h);
      const center = Math.hypot((faceBox.x + faceBox.w / 2) / stats.size - 0.5, (faceBox.y + faceBox.h / 2) / stats.size - 0.5);
      if (area < 0.05) failures.push("Wajah terlalu kecil. Dekatkan kamera.");
      if (area > 0.92 && stats.edgeDensity < 6.5) failures.push("Wajah terlalu dekat atau gambar terlalu polos. Jauhkan kamera sedikit.");
      if (aspect < 0.38 || aspect > 1.65) failures.push("Sudut wajah kurang ideal. Gunakan posisi wajah lebih depan.");
      if (center > 0.38) failures.push("Wajah belum berada di tengah frame.");
      if (stats.skinRatio < 0.10) failures.push("Area kulit wajah kurang jelas atau terlalu gelap.");
      if (stats.edgeDensity < 3.4) failures.push("Foto terlalu blur atau terlalu polos.");
      confidence = clamp(76 + Math.round(area * 20) + Math.round(stats.skinRatio * 12) + Math.round(Math.min(8, stats.edgeDensity)) - Math.round(center * 32), 62, 98);
      return failures.length ? { ok: false, confidence: Math.min(51, confidence), reason: failures[0], failures } : { ok: true, confidence, reason: "Wajah lolos deteksi native.", failures: [] };
    }

    const isPlainWall = stats.skinRatio > 0.84 && stats.colorStd < 14 && stats.edgeDensity < 6.8 && stats.featureScore < 0.004;
    if (stats.skinRatio < 0.08) failures.push("Kulit/wajah tidak terdeteksi cukup jelas.");
    if (isPlainWall) failures.push("Gambar terlalu seragam seperti tembok/benda polos.");
    if (stats.bboxAreaRatio < 0.10) failures.push("Area wajah terlalu kecil atau tidak jelas.");
    if (stats.bboxAreaRatio > 0.96 && stats.colorStd < 15 && stats.edgeDensity < 7) failures.push("Area terlalu penuh dan terlalu polos, kemungkinan bukan wajah yang jelas.");
    if (stats.aspect < 0.34 || stats.aspect > 1.85) failures.push("Bentuk area kulit tidak cukup menyerupai wajah/area wajah.");
    if (stats.centerDistance > 0.40) failures.push("Area wajah/kulit tidak berada di tengah frame.");
    if (stats.centerSkin < 0.10) failures.push("Bagian tengah wajah tidak cukup terdeteksi.");
    if (stats.edgeDensity < 3.8) failures.push("Foto terlalu blur atau terlalu polos untuk dianalisis.");
    if (stats.avgBrightness < 43) failures.push("Foto terlalu gelap.");
    if (stats.avgBrightness > 238) failures.push("Foto terlalu terang/overexposed.");

    confidence = clamp(
      42 +
      Math.round(stats.skinRatio * 24) +
      Math.round(Math.min(22, stats.bboxAreaRatio * 24)) +
      Math.round(Math.min(18, stats.colorStd)) +
      Math.round(Math.min(18, stats.edgeDensity)) +
      Math.round(Math.min(12, stats.featureScore * 360)) -
      Math.round(stats.centerDistance * 26) -
      Math.round(Math.max(0, stats.leftRightDiff - 0.32) * 20),
      0,
      94
    );

    if (failures.length) confidence = Math.min(confidence, 51);
    return failures.length ? { ok: false, confidence, reason: failures[0], failures } : { ok: confidence >= 52, confidence, reason: confidence >= 52 ? "Gambar lolos standar deteksi wajah lokal seimbang." : "Confidence wajah belum cukup. Gunakan foto wajah yang lebih jelas.", failures: [] };
  }

  function estimateSkinMetrics(stats) {
    const textureNoise = clamp(stats.skin.reduce((sum, p) => sum + p.grad, 0) / Math.max(1, stats.skin.length), 0, 65);
    const uneven = clamp(stats.colorStd * 2.0, 0, 100);
    const redness = clamp(stats.redRatio * 300, 0, 100);
    const shine = clamp(stats.shineRatio * 270, 0, 100);
    const dull = clamp((124 - stats.avgBrightness) * 0.82 + stats.darkRatio * 36, 0, 100);

    const moisture = clamp(70 - dull * 0.44 - textureNoise * 0.14 + (stats.avgBrightness > 145 ? 4 : 0), 18, 92);
    const sebum = clamp(32 + shine * 0.66 + Math.max(0, stats.avgBrightness - 155) * 0.16, 10, 94);
    const texture = clamp(84 - textureNoise * 0.78 - uneven * 0.16, 18, 96);
    const acne = clamp(16 + redness * 0.64 + Math.max(0, uneven - 28) * 0.24 + Math.max(0, textureNoise - 16) * 0.30, 5, 92);
    const sensitivity = clamp(15 + redness * 0.57 + Math.max(0, uneven - 25) * 0.16, 5, 88);

    const concerns = [];
    if (acne >= 50) concerns.push("acne");
    if (sebum >= 62) concerns.push("oil");
    if (moisture <= 48) concerns.push("dry");
    if (texture <= 58) concerns.push("texture");
    if (sebum >= 62 && texture <= 64) concerns.push("pores");
    if (sensitivity >= 42) concerns.push("redness");

    let skinType = "normal";
    if (sensitivity >= 55) skinType = "sensitive";
    else if (sebum >= 65 && moisture <= 52) skinType = "combination";
    else if (sebum >= 60) skinType = "oily";
    else if (moisture <= 45) skinType = "dry";

    const labels = concerns.map(labelConcern);
    const summary = labels.length
      ? `Scan lokal menunjukkan fokus utama: ${labels.join(", ")}.`
      : "Scan lokal terlihat cukup stabil. Tetap jaga cleanser, moisturizer, dan sunscreen.";

    return {
      moisture: Math.round(moisture),
      sebum: Math.round(sebum),
      texture: Math.round(texture),
      acne: Math.round(acne),
      sensitivity: Math.round(sensitivity),
      skinType,
      concerns: unique(concerns),
      summary
    };
  }

  function renderRejectedScan(scan) {
    const body = $("#scanResultBody");
    const button = $("#saveRealScan");
    if (!body || !button) return;
    body.innerHTML = `
      <div class="panel">
        <div class="between"><strong>Gambar belum memenuhi standar scan</strong><span class="pill warn">Ditolak</span></div>
        <p class="muted">${escapeHtml(scan.summary || "Gambar bukan wajah/kulit yang cukup jelas.")}</p>
        <p class="muted">Confidence: ${escapeHtml(scan.confidence)}% · Standar minimum: 52%</p>
      </div>
    `;
    button.disabled = true;
  }

  function renderNoImageDetector() {
    const body = $("#scanResultBody");
    const button = $("#saveRealScan");
    pendingScan = null;
    if (body) {
      body.innerHTML = `<div class="panel"><strong>Detector simulasi tidak memakai kamera.</strong><p class="muted">Untuk scan lokal, gunakan Buka kamera + Capture atau Upload foto wajah.</p></div>`;
    }
    if (button) button.disabled = true;
  }

  function renderPendingScan(scan) {
    const body = $("#scanResultBody");
    const button = $("#saveRealScan");
    if (!body || !button || !pendingScan) return;
    const insight = deriveScan(pendingScan, scan);
    body.innerHTML = `
      <div class="panel">
        <div class="between"><strong>${escapeHtml(pendingScan.source)}</strong><span class="pill success">Diterima</span></div>
        <p class="muted">${escapeHtml(scan.summary || insight.summary)}</p>
        <p class="muted">Confidence: ${escapeHtml(scan.confidence)}% · Metode: ${escapeHtml(scan.method || "balanced local")}</p>
        <div class="row">${insight.concerns.map(item => `<span class="tag">${escapeHtml(labelConcern(item))}</span>`).join("") || `<span class="tag">Stabil</span>`}</div>
      </div>
      ${meter("Kelembapan", pendingScan.moisture)}
      ${meter("Sebum", pendingScan.sebum)}
      ${meter("Tekstur", pendingScan.texture)}
      ${meter("Acne risk", pendingScan.acne)}
      ${meter("Sensitivitas", pendingScan.sensitivity)}
      <p class="muted">${escapeHtml(scan.safetyNote || "Hasil adalah estimasi visual lokal untuk edukasi, bukan diagnosis medis.")}</p>
    `;
    button.disabled = false;
  }

  function savePendingScan() {
    if (!pendingScan) return;
    const state = readState();
    state.analyses = Array.isArray(state.analyses) ? state.analyses : [];
    state.profile = state.profile || {};
    state.analyses.push(pendingScan);
    const insight = deriveScan(pendingScan, pendingScan.ai);
    state.scanInsight = insight;
    state.profile.concerns = unique([...(insight.concerns || []), ...((state.profile && state.profile.concerns) || [])]).slice(0, 7);
    state.profile.skinType = insight.skinType || state.profile.skinType || "normal";
    localStorage.setItem(STORE, JSON.stringify(state));
    pendingScan = null;
    location.hash = "#/analysis";
    setTimeout(() => location.reload(), 60);
  }

  function deriveScan(a, ai = {}) {
    const concerns = Array.isArray(ai.concerns) && ai.concerns.length ? ai.concerns.slice() : [];
    if (!concerns.length) {
      if (a.acne >= 50) concerns.push("acne");
      if (a.sebum >= 62) concerns.push("oil");
      if (a.moisture <= 48) concerns.push("dry");
      if (a.texture <= 58) concerns.push("texture");
      if (a.sebum >= 62 && a.texture <= 64) concerns.push("pores");
      if (a.sensitivity >= 42) concerns.push("redness");
    }
    let skinType = ai.skinType && ai.skinType !== "unknown" ? ai.skinType : "normal";
    if (!ai.skinType || ai.skinType === "unknown") {
      if (a.sensitivity >= 55) skinType = "sensitive";
      else if (a.sebum >= 65 && a.moisture <= 52) skinType = "combination";
      else if (a.sebum >= 60) skinType = "oily";
      else if (a.moisture <= 45) skinType = "dry";
    }
    return {
      concerns: unique(concerns),
      skinType,
      summary: ai.summary || (concerns.length ? `Scan lokal terakhir menunjukkan fokus utama: ${concerns.map(labelConcern).join(", ")}.` : "Scan lokal terakhir terlihat cukup stabil."),
      updatedAt: new Date().toISOString(),
      confidence: ai.confidence || null
    };
  }

  function meter(label, value) {
    return `<div class="meter"><div class="between"><strong>${escapeHtml(label)}</strong><span>${value}/100</span></div><div class="meter-bar"><span style="--value:${value}"></span></div></div>`;
  }

  function skinLike(r, g, b, hsv, ycbcr) {
    const rgbRule = r > 42 && g > 30 && b > 18 && r > b && r >= g * 0.72 && Math.max(r, g, b) - Math.min(r, g, b) > 8;
    const hsvRule = hsv.h >= 0 && hsv.h <= 62 && hsv.s >= 0.08 && hsv.s <= 0.78 && hsv.v >= 0.18;
    const ycbcrRule = ycbcr.cb >= 72 && ycbcr.cb <= 142 && ycbcr.cr >= 124 && ycbcr.cr <= 188;
    return (rgbRule && hsvRule) || (ycbcrRule && hsv.v > 0.23);
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    return { h, s, v: max };
  }

  function rgbToYcbcr(r, g, b) {
    return { y: 0.299 * r + 0.587 * g + 0.114 * b, cb: 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, cr: 128 + 0.5 * r - 0.418688 * g - 0.081312 * b };
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Gambar tidak dapat dibaca."));
      img.src = dataUrl;
    });
  }

  function coverFit(srcW, srcH, dstW, dstH) {
    const scale = Math.max(dstW / srcW, dstH / srcH);
    const sw = dstW / scale;
    const sh = dstH / scale;
    return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh };
  }

  function normalizeBox(box, size) {
    return { x: Math.max(0, Math.min(size, box.x)), y: Math.max(0, Math.min(size, box.y)), w: Math.max(0, Math.min(size, box.width)), h: Math.max(0, Math.min(size, box.height)) };
  }

  function expandBox(box, size, pad) {
    const x = Math.max(0, box.x - box.w * pad);
    const y = Math.max(0, box.y - box.h * pad);
    const w = Math.min(size - x, box.w * (1 + pad * 2));
    const h = Math.min(size - y, box.h * (1 + pad * 2));
    return { x, y, w, h };
  }

  function avgCells(values, indexes) { return indexes.reduce((sum, i) => sum + (values[i] || 0), 0) / Math.max(1, indexes.length); }
  function labelConcern(value) { return ({ acne: "Berjerawat", oil: "Sebum tinggi", dry: "Kelembapan rendah", texture: "Tekstur tidak merata", pores: "Pori-pori", redness: "Sensitif/kemerahan" })[value] || value; }
  function readState() { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; } }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, Math.round(Number(value)))); }
  function unique(items) { return Array.from(new Set(items.filter(Boolean))); }
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
})();
