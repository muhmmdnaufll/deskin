(() => {
  "use strict";

  const STORE = "deskin_state_v4";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

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
    if ($("#realScanPanel")) return;

    const form = $("#analysisForm");
    if (form) form.remove();

    const grid = $(".container .grid.two");
    if (!grid) return;

    const panel = document.createElement("section");
    panel.id = "realScanPanel";
    panel.className = "card stack";
    panel.innerHTML = `
      <div>
        <p class="eyebrow">Local scan</p>
        <h2>Hasil scan wajah lokal</h2>
        <p class="muted">Scan berjalan langsung di browser tanpa kirim foto ke API, jadi tidak memakai limit Gemini. Gambar tembok/benda akan ditolak dengan deteksi lokal.</p>
      </div>
      <div id="scanResultBody" class="stack">
        <div class="panel">
          <strong>Belum ada hasil scan lokal.</strong>
          <p class="muted">Tekan Capture setelah kamera aktif atau upload foto wajah. Hasil baru bisa disimpan setelah gambar lolos validasi wajah/kulit.</p>
        </div>
      </div>
      <button id="saveRealScan" class="primary-btn" type="button" disabled>Simpan hasil scan lokal</button>
    `;

    grid.appendChild(panel);
  }

  function handleClick(event) {
    const capture = event.target.closest("#capturePhoto");
    if (capture) {
      setTimeout(() => {
        const image = imageFromCameraBox();
        if (image) runLocalScan(image.data, image.mimeType, "Camera Local Scan");
      }, 350);
      return;
    }

    const connect = event.target.closest("#connectDevice");
    if (connect) {
      setTimeout(() => renderNoImageDetector(), 250);
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
      setTimeout(() => runLocalScan(dataUrl, lastMimeType, "Photo Upload Local Scan"), 250);
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
      const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
      lastImageData = dataUrl;
      lastMimeType = "image/jpeg";
      return { data: dataUrl, mimeType: "image/jpeg" };
    }

    if (lastImageData) return { data: lastImageData, mimeType: lastMimeType };
    return null;
  }

  async function runLocalScan(dataUrl, mimeType, source) {
    if ($("#pageTitle")?.textContent?.trim() !== "SKINAnalyzer") return;

    const body = $("#scanResultBody");
    const save = $("#saveRealScan");
    if (body) {
      body.innerHTML = `
        <div class="panel">
          <strong>DeSkin sedang membaca gambar secara lokal...</strong>
          <p class="muted">Foto tidak dikirim ke server. Analisis memakai deteksi wajah lokal bila tersedia dan fallback pixel analysis.</p>
        </div>
      `;
    }
    if (save) save.disabled = true;

    try {
      const local = await analyzeImageLocally(dataUrl, mimeType);
      if (!local.isSkinImage || local.confidence < 45) {
        pendingScan = null;
        renderRejectedScan(local);
        return;
      }

      pendingScan = {
        id: uid(),
        date: new Date().toISOString(),
        moisture: local.moisture,
        sebum: local.sebum,
        texture: local.texture,
        acne: local.acne,
        sensitivity: local.sensitivity,
        source,
        notes: `${source}: ${local.summary} ${local.safetyNote}`,
        ai: {
          model: "local-browser-scan-v1",
          confidence: local.confidence,
          skinType: local.skinType,
          concerns: local.concerns,
          summary: local.summary,
          safetyNote: local.safetyNote,
          method: local.method
        }
      };

      renderPendingScan(local);
    } catch (error) {
      pendingScan = null;
      if (body) {
        body.innerHTML = `
          <div class="panel">
            <strong>Scan lokal gagal.</strong>
            <p class="muted">${escapeHtml(error.message || "Coba ulangi dengan foto wajah yang lebih jelas.")}</p>
          </div>
        `;
      }
      if (save) save.disabled = true;
    }
  }

  async function analyzeImageLocally(dataUrl, mimeType) {
    const image = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    const size = 192;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const fit = coverFit(image.width, image.height, size, size);
    ctx.drawImage(image, fit.sx, fit.sy, fit.sw, fit.sh, 0, 0, size, size);

    let detectorBox = null;
    if ("FaceDetector" in window) {
      try {
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(canvas);
        if (faces && faces[0]?.boundingBox) detectorBox = faces[0].boundingBox;
      } catch {
        detectorBox = null;
      }
    }

    const imageData = ctx.getImageData(0, 0, size, size);
    const pixels = imageData.data;
    const stats = collectStats(pixels, size, detectorBox);
    const validation = validateFaceLikeImage(stats, detectorBox);

    if (!validation.ok) {
      return {
        isSkinImage: false,
        confidence: validation.confidence,
        moisture: 50,
        sebum: 50,
        texture: 50,
        acne: 50,
        sensitivity: 50,
        skinType: "unknown",
        concerns: [],
        summary: validation.reason,
        safetyNote: "Hasil scan tidak dibuat karena gambar tidak lolos validasi wajah/kulit lokal.",
        method: detectorBox ? "native-face-detector" : "local-pixel-validation"
      };
    }

    const result = estimateSkinMetrics(stats, detectorBox);
    return {
      isSkinImage: true,
      confidence: validation.confidence,
      ...result,
      method: detectorBox ? "native-face-detector + pixel-analysis" : "local-pixel-analysis",
      safetyNote: "Hasil adalah estimasi visual lokal untuk edukasi, bukan diagnosis medis. Akurasi dipengaruhi cahaya, fokus, dan posisi wajah."
    };
  }

  function collectStats(pixels, size, faceBox) {
    const skin = [];
    let skinCount = 0;
    let redCount = 0;
    let shineCount = 0;
    let darkCount = 0;
    let totalBrightness = 0;
    let totalSaturation = 0;
    let rSum = 0, gSum = 0, bSum = 0;
    let rSq = 0, gSq = 0, bSq = 0;
    let minX = size, minY = size, maxX = 0, maxY = 0;
    let edgeSum = 0;
    let edgeN = 0;

    const region = faceBox ? expandBox(faceBox, size, 0.18) : { x: 0, y: 0, w: size, h: size };

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (x < region.x || y < region.y || x > region.x + region.w || y > region.y + region.h) continue;
        const i = (y * size + x) * 4;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const hsv = rgbToHsv(r, g, b);
        const ycbcr = rgbToYcbcr(r, g, b);
        const bright = (r + g + b) / 3;
        const isSkin = skinLike(r, g, b, hsv, ycbcr);
        const next = ((y * size + x + 1) * 4);
        const down = (((y + 1) * size + x) * 4);
        const grad = Math.abs(r - pixels[next]) + Math.abs(g - pixels[next + 1]) + Math.abs(b - pixels[next + 2]) + Math.abs(r - pixels[down]) + Math.abs(g - pixels[down + 1]) + Math.abs(b - pixels[down + 2]);
        edgeSum += grad / 6;
        edgeN++;

        if (!isSkin) continue;
        skinCount++;
        skin.push({ r, g, b, h: hsv.h, s: hsv.s, v: hsv.v, bright, grad: grad / 6, x, y });
        totalBrightness += bright;
        totalSaturation += hsv.s;
        rSum += r; gSum += g; bSum += b;
        rSq += r * r; gSq += g * g; bSq += b * b;
        if (r > g * 1.09 && r > b * 1.18 && hsv.s > 0.22 && bright > 70) redCount++;
        if (bright > 188 && hsv.s < 0.34) shineCount++;
        if (bright < 72) darkCount++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    const regionArea = Math.max(1, region.w * region.h);
    const skinRatio = skinCount / regionArea;
    const bboxW = Math.max(0, maxX - minX + 1);
    const bboxH = Math.max(0, maxY - minY + 1);
    const bboxAreaRatio = (bboxW * bboxH) / (size * size);
    const cx = skinCount ? (minX + bboxW / 2) / size : 0.5;
    const cy = skinCount ? (minY + bboxH / 2) / size : 0.5;
    const centerDistance = Math.hypot(cx - 0.5, cy - 0.5);
    const n = Math.max(1, skinCount);
    const avgR = rSum / n, avgG = gSum / n, avgB = bSum / n;
    const std = Math.sqrt((rSq / n - avgR * avgR + gSq / n - avgG * avgG + bSq / n - avgB * avgB) / 3);

    return {
      size,
      region,
      skin,
      skinCount,
      skinRatio,
      bboxW,
      bboxH,
      bboxAreaRatio,
      centerDistance,
      avgBrightness: totalBrightness / n,
      avgSaturation: totalSaturation / n,
      avgR,
      avgG,
      avgB,
      colorStd: Number.isFinite(std) ? std : 0,
      edgeDensity: edgeN ? edgeSum / edgeN : 0,
      redRatio: redCount / n,
      shineRatio: shineCount / n,
      darkRatio: darkCount / n
    };
  }

  function validateFaceLikeImage(stats, faceBox) {
    if (faceBox) {
      const area = (faceBox.width * faceBox.height) / (stats.size * stats.size);
      const confidence = clamp(70 + Math.round(area * 50) + Math.round(stats.skinRatio * 20), 70, 96);
      return { ok: true, confidence, reason: "Wajah terdeteksi oleh browser." };
    }

    if (stats.skinRatio < 0.07) {
      return { ok: false, confidence: 18, reason: "Gambar tidak terlihat seperti wajah/kulit manusia. Arahkan kamera ke wajah dengan pencahayaan cukup." };
    }

    if (stats.skinRatio > 0.82 && stats.colorStd < 16 && stats.edgeDensity < 7) {
      return { ok: false, confidence: 24, reason: "Gambar terlalu seragam seperti tembok/benda polos, bukan wajah yang jelas." };
    }

    if (stats.bboxAreaRatio < 0.10 || stats.bboxAreaRatio > 0.92) {
      return { ok: false, confidence: 32, reason: "Area kulit tidak membentuk komposisi wajah yang cukup jelas. Posisikan wajah di tengah kamera." };
    }

    if (stats.centerDistance > 0.34) {
      return { ok: false, confidence: 35, reason: "Area kulit tidak berada di tengah frame. Posisikan wajah lebih tengah." };
    }

    if (stats.colorStd < 10 && stats.edgeDensity < 5.5) {
      return { ok: false, confidence: 30, reason: "Gambar terlalu polos/kurang detail untuk scan wajah. Gunakan foto wajah yang lebih jelas." };
    }

    const confidence = clamp(
      42 +
      Math.round(stats.skinRatio * 35) +
      Math.round(Math.min(18, stats.colorStd)) +
      Math.round(Math.min(15, stats.edgeDensity)) -
      Math.round(stats.centerDistance * 30),
      45,
      86
    );
    return { ok: true, confidence, reason: "Gambar lolos validasi kulit/wajah lokal." };
  }

  function estimateSkinMetrics(stats, faceBox) {
    const textureNoise = clamp(stats.skin.reduce((sum, p) => sum + p.grad, 0) / Math.max(1, stats.skin.length), 0, 60);
    const uneven = clamp(stats.colorStd * 2.2, 0, 100);
    const redness = clamp(stats.redRatio * 280, 0, 100);
    const shine = clamp(stats.shineRatio * 260, 0, 100);
    const dull = clamp((120 - stats.avgBrightness) * 0.8 + stats.darkRatio * 35, 0, 100);

    const moisture = clamp(68 - dull * 0.45 - textureNoise * 0.18 + (stats.avgBrightness > 145 ? 5 : 0), 18, 92);
    const sebum = clamp(34 + shine * 0.65 + Math.max(0, stats.avgBrightness - 155) * 0.18, 10, 94);
    const texture = clamp(82 - textureNoise * 0.85 - uneven * 0.18, 18, 96);
    const acne = clamp(18 + redness * 0.62 + Math.max(0, uneven - 28) * 0.28 + Math.max(0, textureNoise - 16) * 0.35, 5, 92);
    const sensitivity = clamp(16 + redness * 0.55 + Math.max(0, uneven - 25) * 0.18, 5, 88);

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
        <div class="between"><strong>Gambar tidak valid untuk scan kulit</strong><span class="pill warn">Ditolak</span></div>
        <p class="muted">${escapeHtml(scan.summary || "Gambar bukan wajah/kulit yang jelas.")}</p>
        <p class="muted">Confidence lokal: ${escapeHtml(scan.confidence)}%</p>
      </div>
    `;
    button.disabled = true;
  }

  function renderNoImageDetector() {
    const body = $("#scanResultBody");
    const button = $("#saveRealScan");
    pendingScan = null;
    if (body) {
      body.innerHTML = `
        <div class="panel">
          <strong>Detector simulasi tidak memakai kamera.</strong>
          <p class="muted">Untuk scan lokal gratis tanpa limit, gunakan Buka kamera + Capture atau Upload foto wajah.</p>
        </div>
      `;
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
        <div class="between"><strong>${escapeHtml(pendingScan.source)}</strong><span class="pill success">Valid</span></div>
        <p class="muted">${escapeHtml(scan.summary || insight.summary)}</p>
        <p class="muted">Confidence lokal: ${escapeHtml(scan.confidence)}% · Metode: ${escapeHtml(scan.method || "local")}</p>
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
    return {
      sx: (srcW - sw) / 2,
      sy: (srcH - sh) / 2,
      sw,
      sh
    };
  }

  function expandBox(box, size, pad) {
    const x = Math.max(0, box.x - box.width * pad);
    const y = Math.max(0, box.y - box.height * pad);
    const w = Math.min(size - x, box.width * (1 + pad * 2));
    const h = Math.min(size - y, box.height * (1 + pad * 2));
    return { x, y, w, h };
  }

  function skinLike(r, g, b, hsv, ycbcr) {
    const rgbRule = r > 50 && g > 35 && b > 20 && r > b && r >= g * 0.82 && Math.max(r, g, b) - Math.min(r, g, b) > 12;
    const hsvRule = hsv.h >= 0 && hsv.h <= 55 && hsv.s >= 0.12 && hsv.s <= 0.72 && hsv.v >= 0.22;
    const ycbcrRule = ycbcr.cb >= 77 && ycbcr.cb <= 135 && ycbcr.cr >= 130 && ycbcr.cr <= 180;
    return (rgbRule && hsvRule) || (ycbcrRule && hsv.v > 0.28);
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
    return {
      y: 0.299 * r + 0.587 * g + 0.114 * b,
      cb: 128 - 0.168736 * r - 0.331264 * g + 0.5 * b,
      cr: 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
    };
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "{}");
    } catch {
      return {};
    }
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
      summary: ai.summary || (concerns.length
        ? `Scan lokal terakhir menunjukkan fokus utama: ${concerns.map(labelConcern).join(", ")}.`
        : "Scan lokal terakhir terlihat cukup stabil."),
      updatedAt: new Date().toISOString(),
      confidence: ai.confidence || null
    };
  }

  function meter(label, value) {
    return `
      <div class="meter">
        <div class="between"><strong>${escapeHtml(label)}</strong><span>${value}/100</span></div>
        <div class="meter-bar"><span style="--value:${value}"></span></div>
      </div>
    `;
  }

  function labelConcern(value) {
    return ({
      acne: "Berjerawat",
      oil: "Sebum tinggi",
      dry: "Kelembapan rendah",
      texture: "Tekstur tidak merata",
      pores: "Pori-pori",
      redness: "Sensitif/kemerahan"
    })[value] || value;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Math.round(Number(value))));
  }

  function unique(items) {
    return Array.from(new Set(items.filter(Boolean)));
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char]));
  }
})();
