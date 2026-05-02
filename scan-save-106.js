(() => {
  "use strict";

  const STORE = "deskin_state_v4";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let pendingScan = null;

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
    if (form) {
      form.remove();
    }

    const grid = $(".container .grid.two");
    if (!grid) return;

    const panel = document.createElement("section");
    panel.id = "realScanPanel";
    panel.className = "card stack";
    panel.innerHTML = `
      <div>
        <p class="eyebrow">Real scan result</p>
        <h2>Hasil scan wajah</h2>
        <p class="muted">Gunakan kamera, upload foto, atau detector simulasi. Setelah hasil muncul, simpan ke SKINAnalysis agar fitur AI lain ikut menyesuaikan.</p>
      </div>
      <div id="scanResultBody" class="stack">
        <div class="panel">
          <strong>Belum ada hasil scan baru.</strong>
          <p class="muted">Tekan Capture setelah kamera aktif, upload foto, atau hubungkan detector.</p>
        </div>
      </div>
      <button id="saveRealScan" class="primary-btn" type="button" disabled>Simpan hasil scan</button>
    `;

    grid.appendChild(panel);
  }

  function handleClick(event) {
    const capture = event.target.closest("#capturePhoto");
    if (capture) {
      setTimeout(() => createScanFromSource("Camera Scan"), 250);
      return;
    }

    const connect = event.target.closest("#connectDevice");
    if (connect) {
      setTimeout(() => createScanFromSource("DeSkin Assisted Detector"), 250);
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
    if (event.target?.id === "photoUpload") {
      setTimeout(() => createScanFromSource("Photo Upload Scan"), 250);
    }
  }

  function createScanFromSource(source) {
    if ($("#pageTitle")?.textContent?.trim() !== "SKINAnalyzer") return;

    const state = readState();
    const latest = getLatest(state);
    const seed = Date.now() % 17;

    pendingScan = {
      id: uid(),
      date: new Date().toISOString(),
      moisture: clamp(number(latest.moisture, 55) + drift(seed, -9, 8), 25, 92),
      sebum: clamp(number(latest.sebum, 62) + drift(seed + 2, -8, 11), 18, 95),
      texture: clamp(number(latest.texture, 60) + drift(seed + 4, -7, 9), 22, 94),
      acne: clamp(number(latest.acne, 48) + drift(seed + 6, -9, 13), 8, 92),
      sensitivity: clamp(number(latest.sensitivity, 32) + drift(seed + 8, -7, 8), 5, 88),
      source,
      notes: `${source}: hasil scan otomatis dari kamera/foto/detector. Data ini dipakai untuk rekomendasi AI aplikasi.`
    };

    renderPendingScan();
  }

  function renderPendingScan() {
    const body = $("#scanResultBody");
    const button = $("#saveRealScan");
    if (!body || !button || !pendingScan) return;

    const insight = deriveScan(pendingScan);
    body.innerHTML = `
      <div class="panel">
        <div class="between"><strong>${escapeHtml(pendingScan.source)}</strong><span class="pill success">Siap disimpan</span></div>
        <p class="muted">${escapeHtml(insight.summary)}</p>
        <div class="row">${insight.concerns.map(item => `<span class="tag">${escapeHtml(labelConcern(item))}</span>`).join("") || `<span class="tag">Stabil</span>`}</div>
      </div>
      ${meter("Kelembapan", pendingScan.moisture)}
      ${meter("Sebum", pendingScan.sebum)}
      ${meter("Tekstur", pendingScan.texture)}
      ${meter("Acne risk", pendingScan.acne)}
      ${meter("Sensitivitas", pendingScan.sensitivity)}
    `;
    button.disabled = false;
  }

  function savePendingScan() {
    if (!pendingScan) return;

    const state = readState();
    state.analyses = Array.isArray(state.analyses) ? state.analyses : [];
    state.profile = state.profile || {};
    state.analyses.push(pendingScan);

    const insight = deriveScan(pendingScan);
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

  function getLatest(state) {
    const list = Array.isArray(state.analyses) ? state.analyses : [];
    return list[list.length - 1] || { moisture: 55, sebum: 62, texture: 60, acne: 48, sensitivity: 32 };
  }

  function deriveScan(a) {
    const concerns = [];
    if (a.acne >= 50) concerns.push("acne");
    if (a.sebum >= 62) concerns.push("oil");
    if (a.moisture <= 48) concerns.push("dry");
    if (a.texture <= 58) concerns.push("texture");
    if (a.sebum >= 62 && a.texture <= 64) concerns.push("pores");
    if (a.sensitivity >= 42) concerns.push("redness");

    let skinType = "normal";
    if (a.sensitivity >= 55) skinType = "sensitive";
    else if (a.sebum >= 65 && a.moisture <= 52) skinType = "combination";
    else if (a.sebum >= 60) skinType = "oily";
    else if (a.moisture <= 45) skinType = "dry";

    return {
      concerns: unique(concerns),
      skinType,
      summary: concerns.length
        ? `Scan terakhir menunjukkan fokus utama: ${concerns.map(labelConcern).join(", ")}.`
        : "Scan terakhir terlihat cukup stabil.",
      updatedAt: new Date().toISOString()
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

  function drift(seed, min, max) {
    const span = max - min + 1;
    return min + (Math.abs(seed * 37 + 11) % span);
  }

  function number(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
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
