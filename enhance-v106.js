(() => {
  "use strict";

  const STORE_KEY = "deskin_state_v2";
  const OLD_TEMPLATE_TEXT = "Saya punya kulit berminyak dan jerawat di dagu.";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  boot();

  function boot() {
    cleanupStoredChatTemplate();
    enhanceCurrentPage();
    new MutationObserver(() => {
      removeTemplateChatFromDom();
      enhanceCurrentPage();
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener("click", interceptMirrorCapture, true);
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
    } catch {
      // keep app running even if localStorage is unavailable
    }
  }

  function removeTemplateChatFromDom() {
    $$(".message").forEach(message => {
      if (message.textContent.includes(OLD_TEMPLATE_TEXT)) message.remove();
    });
  }

  function enhanceCurrentPage() {
    removeTemplateChatFromDom();
    const title = $("#pageTitle")?.textContent?.trim() || "";
    if (!title || $("[data-deskin-ai-enhanced='true']")) return;

    const map = {
      Dashboard: ["Insight AI", "Dashboard", "Buat insight singkat hari ini dan 3 prioritas tindakan."],
      SKINDaily: ["Rutinitas AI", "SKINDaily", "Susun rutinitas pagi dan malam yang sederhana, ringan, dan aman untuk 2 minggu."],
      SKINMap: ["Saran AI", "SKINMap", "Beri saran kapan perlu ke klinik, apotek, atau cukup perawatan rumah berdasarkan data kulit dan lokasi demo."],
      SKINMarket: ["Rekomendasi AI", "SKINMarket", "Pilih 3 produk prioritas dari daftar produk demo dan jelaskan urutan pemakaiannya."],
      SKINEdu: ["Tanya AI", "SKINEdu", "Buat materi edukasi singkat yang paling relevan dengan profil kulit pengguna."],
      SKINAnalyzer: ["Tips scan AI", "SKINAnalyzer", "Beri instruksi scan wajah yang benar, kondisi cahaya, dan hal yang harus dihindari agar hasil stabil."],
      SKINAnalysis: ["Analisis AI", "SKINAnalysis", "Jelaskan hasil parameter, risiko utama, dan langkah perawatan 14 hari. Jangan diagnosis medis."],
      Profil: ["Evaluasi profil AI", "Profil", "Evaluasi kelengkapan profil dan beri saran data apa yang perlu ditambahkan agar rekomendasi lebih akurat."]
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
    button.addEventListener("click", () => runAIModal(label, feature, buildPrompt(instruction)));
    target.appendChild(button);
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
    const products = $$(".product-card h3").map(el => el.textContent.trim()).filter(Boolean).slice(0, 8);
    const page = $("#pageTitle")?.textContent?.trim() || "DeSkin";
    return [
      "Kamu adalah DeSkin AI. Jawab dalam bahasa Indonesia, jelas, praktis, dan tidak mengklaim diagnosis medis.",
      `Halaman aktif: ${page}.`,
      `Profil: nama ${state.profile?.name || "Pengguna"}, tipe kulit ${state.profile?.skinType || "unknown"}, concern ${(state.profile?.concerns || []).join(", ") || "belum diisi"}.`,
      `Analisis terakhir: moisture ${latest.moisture}, sebum ${latest.sebum}, texture ${latest.texture}, acne ${latest.acne}, sensitivity ${latest.sensitivity}, catatan ${latest.notes || "-"}.`,
      products.length ? `Produk terlihat: ${products.join(", ")}.` : "",
      instruction,
      "Berikan jawaban lengkap tetapi tetap ringkas. Gunakan format bernomor bila cocok."
    ].filter(Boolean).join("\n");
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
      if (body) body.innerHTML = `<h2 id="modalTitle">${escapeHtml(title)}</h2><div class="ai-output">${formatMessage(answer)}</div>`;
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
