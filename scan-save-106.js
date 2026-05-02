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
        <p class="eyebrow">AI vision scan</p>
        <h2>Hasil scan wajah AI</h2>
        <p class="muted">Gunakan kamera atau upload foto wajah. DeSkin AI akan menolak gambar yang bukan kulit/wajah jelas, misalnya tembok atau benda.</p>
      </div>
      <div id="scanResultBody" class="stack">
        <div class="panel">
          <strong>Belum ada hasil scan AI.</strong>
          <p class="muted">Tekan Capture setelah kamera aktif atau upload foto wajah. Hasil baru bisa disimpan setelah AI selesai menganalisis.</p>
        </div>
      </div>
      <button id="saveRealScan" class="primary-btn" type="button" disabled>Simpan hasil scan AI</button>
    `;

    grid.appendChild(panel);
  }

  function handleClick(event) {
    const capture = event.target.closest("#capturePhoto");
    if (capture) {
      setTimeout(() => {
        const image = imageFromCameraBox();
        if (image) runVisionScan(image.data, image.mimeType, "Camera AI Scan");
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
      setTimeout(() => runVisionScan(dataUrl, lastMimeType, "Photo Upload AI Scan"), 250);
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

  async function runVisionScan(dataUrl, mimeType, source) {
    if ($("#pageTitle")?.textContent?.trim() !== "SKINAnalyzer") return;

    const body = $("#scanResultBody");
    const save = $("#saveRealScan");
    if (body) {
      body.innerHTML = `
        <div class="panel">
          <strong>DeSkin AI sedang membaca gambar...</strong>
          <p class="muted">Mohon tunggu. Foto dikirim ke Gemini melalui endpoint aman /api/ai, bukan langsung dari client ke Google.</p>
        </div>
      `;
    }
    if (save) save.disabled = true;

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: "SKINAnalyzerVision",
          message: "Analisis gambar ini untuk fitur DeSkin AI vision scan. Tolak jika bukan wajah atau area kulit manusia yang jelas.",
          imageData: dataUrl,
          mimeType
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok || !result.scan) {
        throw new Error(result.error || "AI scan gagal membaca gambar.");
      }

      const scan = result.scan;
      if (!scan.isSkinImage || scan.confidence < 45) {
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
          model: result.model || "gemini-2.5-flash",
          confidence: scan.confidence,
          skinType: scan.skinType,
          concerns: scan.concerns,
          summary: scan.summary,
          safetyNote: scan.safetyNote
        }
      };

      renderPendingScan(scan);
    } catch (error) {
      pendingScan = null;
      if (body) {
        body.innerHTML = `
          <div class="panel">
            <strong>AI scan gagal.</strong>
            <p class="muted">${escapeHtml(error.message || "Coba ulangi dengan foto wajah yang lebih jelas.")}</p>
          </div>
        `;
      }
      if (save) save.disabled = true;
    }
  }

  function renderRejectedScan(scan) {
    const body = $("#scanResultBody");
    const button = $("#saveRealScan");
    if (!body || !button) return;

    body.innerHTML = `
      <div class="panel">
        <div class="between"><strong>Gambar tidak valid untuk scan kulit</strong><span class="pill warn">Ditolak</span></div>
        <p class="muted">${escapeHtml(scan.summary || "Gambar bukan wajah/kulit yang jelas.")}</p>
        <p class="muted">Confidence: ${escapeHtml(scan.confidence)}%</p>
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
          <strong>Detector simulasi tidak memakai kamera AI.</strong>
          <p class="muted">Untuk scan akurat berbasis AI, gunakan Buka kamera + Capture atau Upload foto wajah. Detector simulasi hanya menandai perangkat terhubung.</p>
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
        <div class="between"><strong>${escapeHtml(pendingScan.source)}</strong><span class="pill success">AI valid</span></div>
        <p class="muted">${escapeHtml(scan.summary || insight.summary)}</p>
        <p class="muted">Confidence AI: ${escapeHtml(scan.confidence)}%</p>
        <div class="row">${insight.concerns.map(item => `<span class="tag">${escapeHtml(labelConcern(item))}</span>`).join("") || `<span class="tag">Stabil</span>`}</div>
      </div>
      ${meter("Kelembapan", pendingScan.moisture)}
      ${meter("Sebum", pendingScan.sebum)}
      ${meter("Tekstur", pendingScan.texture)}
      ${meter("Acne risk", pendingScan.acne)}
      ${meter("Sensitivitas", pendingScan.sensitivity)}
      <p class="muted">${escapeHtml(scan.safetyNote || "Hasil adalah estimasi visual edukatif, bukan diagnosis medis.")}</p>
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
        ? `Scan AI terakhir menunjukkan fokus utama: ${concerns.map(labelConcern).join(", ")}.`
        : "Scan AI terakhir terlihat cukup stabil."),
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
