(() => {
  "use strict";

  const STORE_KEY = "deskin_state_v2";
  const OLD_TEMPLATE_TEXT = "Saya punya kulit berminyak dan jerawat di dagu.";
  const COPYRIGHT_TEXT = "© 2026 Muhammad Naufal. All rights reserved.";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  boot();

  function boot() {
    cleanupStoredChatTemplate();
    syncDerivedScanState();
    enhanceCurrentPage();
    ensureCopyright();

    new MutationObserver(() => {
      removeTemplateChatFromDom();
      syncDerivedScanState();
      enhanceCurrentPage();
      enhanceScanPages();
      ensureCopyright();
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener("click", interceptMirrorCapture, true);
    document.addEventListener("submit", event => {
      if (event.target?.id === "analysisForm") {
        setTimeout(() => {
          syncDerivedScanState(true);
          enhanceScanPages();
        }, 250);
      }
    }, true);
  }

  function cleanupStoredChatTemplate() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.messages)) return;
      const next = data.messages.filter(message => message.text !== OLD_TEMPLATE_TEXT);
      if (next.length !== data.messages.length) {
        data.messages = next;
        localStorage.setItem(STORE_KEY, JSON.stringify(data));
      }
    } catch {}
  }

  function removeTemplateChatFromDom() {
    $$(".message").forEach(message => {
      if (message.textContent.includes(OLD_TEMPLATE_TEXT)) message.remove();
    });
  }

  function ensureCopyright() {
    $$('p, small, .footer-note').forEach(el => {
      if (el.id !== "deskinCopyright" && el.textContent.includes("All rights reserved")) el.remove();
    });

    let copyright = $("#deskinCopyright");
    if (!copyright) {
      copyright = document.createElement("p");
      copyright.id = "deskinCopyright";
      copyright.className = "footer-note";
      document.body.appendChild(copyright);
    }
    copyright.textContent = COPYRIGHT_TEXT;
  }

  function enhanceCurrentPage() {
    removeTemplateChatFromDom();
    const title = $("#pageTitle")?.textContent?.trim() || "";
    if (!title || $("[data-deskin-ai-enhanced='true']")) return;

    const map = {
      Dashboard: ["Insight AI", "Dashboard", "Buat insight hari ini dan 3 prioritas tindakan berdasarkan data scan terakhir pengguna."],
      SKINDaily: ["Rutinitas AI", "SKINDaily", "Susun rutinitas pagi dan malam yang sederhana, ringan, dan aman untuk 2 minggu berdasarkan hasil scan terakhir."],
      SKINMap: ["Saran AI", "SKINMap", "Beri saran kapan perlu ke klinik, apotek, atau cukup perawatan rumah berdasarkan hasil scan terakhir dan lokasi demo."],
      SKINMarket: ["Rekomendasi AI", "SKINMarket", "Pilih 3 produk prioritas dari daftar produk demo dan jelaskan urutan pemakaiannya berdasarkan hasil scan terakhir."],
      SKINEdu: ["Tanya AI", "SKINEdu", "Buat materi edukasi yang paling relevan dengan masalah utama dari hasil scan terakhir."],
      SKINAnalyzer: ["Tips scan AI", "SKINAnalyzer", "Beri instruksi scan wajah yang benar, kondisi cahaya, posisi wajah, hal yang harus dihindari, dan cara menjaga hasil tetap stabil."],
      SKINAnalysis: ["Analisis AI", "SKINAnalysis", "Jelaskan hasil parameter, masalah utama, risiko utama, dan langkah perawatan 14 hari. Jangan diagnosis medis."],
      Profil: ["Evaluasi profil AI", "Profil", "Evaluasi kelengkapan profil dan beri saran data apa yang perlu ditambahkan agar rekomendasi lebih akurat berdasarkan scan terakhir."]
    };

    const config = map[title];
    if (!config) return;

    const [label, feature, instruction] = config;
    const target = findActionTarget();
    if (!target) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-btn deskin-ai-btn";
    button.dataset.deskinAiEnhanced = "true";
    button.textContent = label;
    button.addEventListener("click", () => {
      syncDerivedScanState(true);
      runAIModal(label, feature, buildPrompt(instruction));
    });
    target.appendChild(button);
  }

  function enhanceScanPages() {
    const title = $("#pageTitle")?.textContent?.trim() || "";
    if (!["SKINAnalysis", "SKINAnalyzer", "Dashboard", "SKINMarket", "SKINDaily"].includes(title)) return;
    if ($("#scanSyncInfo")) return;

    const state = readState();
    const latest = getLatestAnalysis(state);
    const derived = deriveFromAnalysis(latest);
    const container = $(".container.stack") || $(".container");
    if (!container) return;

    const panel = document.createElement("section");
    panel.id = "scanSyncInfo";
    panel.className = "card stack";
    panel.innerHTML = `
      <div class="between">
        <div>
          <p class="eyebrow">Scan synced</p>
          <h2>Masalah utama dari scan terakhir</h2>
        </div>
        <span class="pill success">Terintegrasi</span>
      </div>
      <p class="muted">${escapeHtml(derived.summary)}</p>
      <div class="row">${derived.concerns.map(item => `<span class="tag">${escapeHtml(labelConcern(item))}</span>`).join("") || `<span class="tag">Stabil</span>`}</div>
    `;
    container.appendChild(panel);
  }

  function findActionTarget() {
    const preferred = $(".container > .between .row") || $(".hero-actions");
    if (preferred) return preferred;
    const between = $(".container > .between");
    if (!between) return null;
    let row = $(".row", between);
    if (!row) {
      row = document.createElement("div");
      row.className = "row";
      between.appendChild(row);
    }
    return row;
  }

  function buildPrompt(instruction) {
    const state = readState();
    const latest = getLatestAnalysis(state);
    const derived = deriveFromAnalysis(latest);
    const products = $$(".product-card h3").map(el => el.textContent.trim()).filter(Boolean).slice(0, 8);
    const page = $("#pageTitle")?.textContent?.trim() || "DeSkin";
    return [
      "Kamu adalah DeSkin AI. Jawab dalam bahasa Indonesia, jelas, praktis, lengkap, dan tidak mengklaim diagnosis medis.",
      `Halaman aktif: ${page}.`,
      `Profil: nama ${state.profile?.name || "Pengguna"}, tipe kulit ${state.profile?.skinType || "unknown"}, concern profil ${(state.profile?.concerns || []).join(", ") || "belum diisi"}.`,
      `Hasil scan terakhir: moisture ${latest.moisture}, sebum ${latest.sebum}, texture ${latest.texture}, acne ${latest.acne}, sensitivity ${latest.sensitivity}, catatan ${latest.notes || "-"}.`,
      `Masalah utama yang diturunkan dari scan: ${derived.concerns.map(labelConcern).join(", ") || "stabil"}.`,
      `Ringkasan scan: ${derived.summary}.`,
      products.length ? `Produk terlihat: ${products.join(", ")}.` : "",
      instruction,
      "Jawab sampai selesai. Jangan berhenti di tengah kalimat. Gunakan format bernomor, maksimal 8 poin utama, tetapi tiap poin boleh lengkap."
    ].filter(Boolean).join("\n");
  }

  function syncDerivedScanState(force = false) {
    try {
      const state = readState();
      const latest = getLatestAnalysis(state);
      if (!latest) return;
      const derived = deriveFromAnalysis(latest);
      state.profile = state.profile || {};
      const current = Array.isArray(state.profile.concerns) ? state.profile.concerns : [];
      const merged = unique([...derived.concerns, ...current]).slice(0, 7);
      const scanId = latest.id || latest.date || JSON.stringify(latest);
      const changed = force || state.lastScanSyncId !== scanId || JSON.stringify(current) !== JSON.stringify(merged);
      if (!changed) return;

      state.profile.concerns = merged;
      if (derived.skinType && (!state.profile.skinType || force || state.lastScanSyncId !== scanId)) {
        state.profile.skinType = derived.skinType;
      }
      state.scanInsight = {
        id: scanId,
        updatedAt: new Date().toISOString(),
        concerns: derived.concerns,
        skinType: derived.skinType,
        summary: derived.summary,
        source: latest.source || "Scan"
      };
      state.lastScanSyncId = scanId;
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {}
  }

  function deriveFromAnalysis(a) {
    const concerns = [];
    const moisture = number(a?.moisture, 50);
    const sebum = number(a?.sebum, 50);
    const texture = number(a?.texture, 50);
    const acne = number(a?.acne, 50);
    const sensitivity = number(a?.sensitivity, 50);

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
      ? `Scan terakhir menunjukkan fokus utama: ${labels.join(", ")}. Fitur AI lain akan memakai data ini sebagai konteks rekomendasi.`
      : "Scan terakhir terlihat cukup stabil. Fitur AI lain akan tetap memakai parameter terbaru sebagai konteks rekomendasi.";

    return { concerns: unique(concerns), skinType, summary };
  }

  function labelConcern(value) {
    return ({
      acne: "Berjerawat",
      oil: "Sebum tinggi",
      dry: "Kelembapan rendah",
      texture: "Tekstur tidak merata",
      pores: "Pori-pori",
      redness: "Sensitif/kemerahan",
      uv: "Perlindungan UV"
    })[value] || value;
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function getLatestAnalysis(state) {
    const analyses = Array.isArray(state.analyses) ? state.analyses : [];
    return analyses[analyses.length - 1] || { moisture: 50, sebum: 50, texture: 50, acne: 50, sensitivity: 50, notes: "Belum ada analisis." };
  }

  async function runAIModal(title, feature, prompt) {
    openModal(`<h2 id="modalTitle">${escapeHtml(title)}</h2><p class="muted">DeSkin AI sedang menyusun jawaban...</p>`);
    try {
      const answer = await askDeSkinAI(prompt, feature);
      const body = $(".modal-body");
      if (body) {
        body.innerHTML = `
          <h2 id="modalTitle">${escapeHtml(title)}</h2>
          <div class="ai-output">${formatMessage(answer)}</div>
          <button class="secondary-btn copy-ai-answer" type="button">Salin jawaban lengkap</button>
        `;
        const copyButton = $(".copy-ai-answer", body);
        if (copyButton) {
          copyButton.addEventListener("click", async () => {
            await navigator.clipboard?.writeText(answer).catch(() => {});
            copyButton.textContent = "Jawaban disalin";
          });
        }
      }
    } catch (error) {
      const body = $(".modal-body");
      if (body) body.innerHTML = `<h2 id="modalTitle">${escapeHtml(title)}</h2><p class="muted">AI belum bisa diakses. Pastikan GEMINI_API_KEY benar di Vercel dan endpoint /api/ai aktif.</p><p class="muted">${escapeHtml(error.message || "")}</p>`;
    }
  }

  async function askDeSkinAI(message, feature) {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, feature })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "AI gagal merespons.");
    return String(data.answer || "").trim();
  }

  function openModal(content) {
    closeModal();
    const template = $("#modalTemplate");
    if (!template) return;
    const fragment = template.content.cloneNode(true);
    $(".modal-body", fragment).innerHTML = content;
    $(".modal-close", fragment).addEventListener("click", closeModal);
    const backdrop = $(".modal-backdrop", fragment);
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closeModal();
    });
    document.body.appendChild(fragment);
  }

  function closeModal() {
    $(".modal-backdrop")?.remove();
  }

  function interceptMirrorCapture(event) {
    const button = event.target.closest("#capturePhoto");
    if (!button) return;
    const video = $("#videoPreview");
    if (!video) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const cameraBox = $("#cameraBox");
    if (cameraBox) {
      cameraBox.innerHTML = `<img src="${canvas.toDataURL("image/jpeg", 0.78)}" alt="Foto wajah hasil capture" /><span class="capture-overlay"></span>`;
    }
    if (video.srcObject) video.srcObject.getTracks().forEach(track => track.stop());
  }

  function formatMessage(value) {
    return escapeHtml(value)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n{3,}/g, "\n\n")
      .replaceAll("\n", "<br>");
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function number(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
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
