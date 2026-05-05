(() => {
  "use strict";

  const STORE_KEY = "nipah_lestari_ops_v2";
  const $ = (query, root = document) => root.querySelector(query);
  const $$ = (query, root = document) => [...root.querySelectorAll(query)];

  const appRoot = $("#app");
  const navRoot = $("#mainNav");
  const titleRoot = $("#pageTitle");
  const toastRoot = $("#toast");

  const menu = [
    ["/", "Pusat Kerja"],
    ["/lokasi", "Lokasi"],
    ["/catatan", "Catatan"],
    ["/batch", "Batch Nira"],
    ["/mitra", "Mitra"],
    ["/akun", "Akun"]
  ];

  const starterState = {
    theme: "light",
    user: null,
    authReady: true,
    syncState: "lokal",
    locations: [
      { name: "Pesisir Lae Singkil", area: "Estuari", condition: "Tegakan rapat, dekat jalur perahu warga.", status: "Terverifikasi awal", x: 34, y: 55 },
      { name: "Koridor Muara", area: "Aliran sungai", condition: "Perlu kunjungan ulang untuk cek akses penyadapan.", status: "Perlu cek", x: 58, y: 37 },
      { name: "Titik Rumah Produksi", area: "Dekat desa", condition: "Calon simpul penerimaan nira dan koordinasi BUMDes.", status: "Rencana", x: 72, y: 68 }
    ],
    notes: [],
    photos: [],
    batches: [
      { code: "NIR-001", source: "Pesisir Lae Singkil", volume: "2 L", ph: "4.8", brix: "13", status: "QC awal" }
    ],
    partners: []
  };

  let state = loadLocalState();
  let authMode = "login";
  let cloudTimer = null;

  startApp();

  async function startApp() {
    document.documentElement.dataset.theme = state.theme;
    renderMenu();
    bindShell();
    await readSession();
    window.addEventListener("popstate", renderRoute);
    document.addEventListener("click", visitLocalLink);
    renderRoute();
  }

  function loadLocalState() {
    try {
      return { ...starterState, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
    } catch {
      return { ...starterState };
    }
  }

  function saveLocalState() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function persistState() {
    saveLocalState();
    if (!state.user) return;
    clearTimeout(cloudTimer);
    state.syncState = "menunggu sinkron";
    cloudTimer = setTimeout(saveCloudState, 700);
  }

  async function readSession() {
    try {
      const sessionResponse = await fetch("/api/auth", { cache: "no-store" });
      const sessionPayload = await sessionResponse.json();
      state.authReady = sessionPayload.code !== "AUTH_NOT_CONFIGURED";
      if (sessionPayload.ok && sessionPayload.authenticated) {
        state.user = sessionPayload.user;
        await loadCloudState();
      }
    } catch {
      state.authReady = false;
    }
    saveLocalState();
  }

  async function loadCloudState() {
    try {
      const cloudResponse = await fetch("/api/data", { cache: "no-store" });
      const cloudPayload = await cloudResponse.json();
      const savedNipahState = cloudPayload?.payload?.profile?.nipah;
      if (cloudPayload.ok && savedNipahState) {
        state = { ...state, ...savedNipahState, user: state.user, authReady: state.authReady, syncState: "tersinkron" };
      }
    } catch {
      state.syncState = "lokal";
    }
  }

  async function saveCloudState() {
    const nipahState = {
      locations: state.locations,
      notes: state.notes,
      photos: state.photos.slice(0, 20),
      batches: state.batches,
      partners: state.partners,
      savedAt: new Date().toISOString()
    };

    try {
      const cloudResponse = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: { profile: { nipah: nipahState }, notes: state.notes } })
      });
      const cloudPayload = await cloudResponse.json();
      state.syncState = cloudResponse.ok && cloudPayload.ok ? "tersinkron" : "gagal sinkron";
    } catch {
      state.syncState = "gagal sinkron";
    }
    saveLocalState();
    updateSyncBadge();
  }

  function renderMenu() {
    navRoot.innerHTML = menu.map(([path, label], index) => `
      <a href="${path}" data-link>
        <span class="nav-number">${String(index + 1).padStart(2, "0")}</span>
        <span>${label}</span>
      </a>
    `).join("");
  }

  function bindShell() {
    $("#menuBtn").onclick = () => document.body.classList.toggle("menu-open");
    $("#themeBtn").onclick = () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = state.theme;
      persistState();
    };
  }

  function visitLocalLink(event) {
    const link = event.target.closest("a[data-link]");
    if (!link) return;
    const nextUrl = new URL(link.href);
    if (nextUrl.origin !== location.origin) return;
    event.preventDefault();
    history.pushState({}, "", nextUrl.pathname);
    renderRoute();
  }

  function renderRoute() {
    const path = location.pathname.replace(/\/$/, "") || "/";
    document.body.classList.remove("menu-open");
    $$(".nav a").forEach((link) => {
      const linkPath = new URL(link.href).pathname.replace(/\/$/, "") || "/";
      link.classList.toggle("active", linkPath === path);
    });

    const pages = {
      "/": renderDashboard,
      "/lokasi": renderLocations,
      "/catatan": renderNotes,
      "/batch": renderBatches,
      "/mitra": renderPartners,
      "/akun": renderAccount
    };

    (pages[path] || renderDashboard)();
    appRoot.focus({ preventScroll: true });
  }

  function setPage(title) {
    titleRoot.textContent = title;
    document.title = `${title} - Nipah Lestari`;
  }

  function renderDashboard() {
    setPage("Pusat Kerja");
    appRoot.innerHTML = `
      <section class="ops-layout">
        <section class="ops-hero-panel">
          <div class="ops-hero-copy">
            <p class="eyebrow">Portal operasional nipah</p>
            <h2>Data lapangan nipah yang siap dipakai banyak pihak.</h2>
            <p>Nipah Lestari membantu pendamping, BUMDes, penyadap, petani, dan komunitas mencatat lokasi, dokumentasi, mutu nira, batch BCN, serta mitra program.</p>
            <div class="hero-actions">
              <a class="primary-btn" href="/lokasi" data-link>Input titik nipah</a>
              <button class="secondary-btn" type="button" data-ai="summary">Ringkas kondisi lapangan</button>
            </div>
          </div>
          <div class="ops-workflow">
            <strong>alur kerja</strong>
            <span>01 Petakan tegakan</span>
            <span>02 Dokumentasi lapangan</span>
            <span>03 QC nira</span>
            <span>04 Koordinasi mitra</span>
          </div>
        </section>

        <section class="ops-metrics">
          ${metric(state.locations.length, "Titik nipah", "inventaris")}
          ${metric(state.photos.length, "Foto", "lapangan")}
          ${metric(state.batches.length, "Batch", "nira/BCN")}
          ${metric(state.partners.length, "Mitra", "aktif")}
        </section>

        <section class="ops-grid">
          <article class="ops-map-card">
            <div class="between"><h2>Peta kerja</h2><a class="ghost-btn" href="/lokasi" data-link>Kelola</a></div>
            ${mapMarkup()}
          </article>
          <article class="ops-panel">
            <div class="between"><h2>Rekomendasi AI</h2><span id="syncBadge" class="tag">${syncText()}</span></div>
            <p class="muted">AI memakai data lokasi, catatan, batch, dan mitra yang sudah tercatat di aplikasi.</p>
            <div class="quick-actions">
              <button class="secondary-btn" type="button" data-ai="next">Susun tindak lanjut</button>
              <button class="secondary-btn" type="button" data-ai="risk">Cek risiko program</button>
              <button class="secondary-btn" type="button" data-ai="report">Buat laporan singkat</button>
            </div>
          </article>
        </section>
      </section>
    `;
    bindAiButtons();
  }

  function renderLocations() {
    setPage("Lokasi");
    appRoot.innerHTML = `
      <section class="container stack">
        ${sectionHead("Inventaris nipah", "Titik lokasi dan kondisi tegakan", "Data dipakai untuk menentukan jalur pengumpulan nira, titik edukasi, dan calon rumah produksi.", "Tambah lokasi", "addLocation")}
        <div class="ops-grid map-first">
          <article class="ops-map-card">${mapMarkup()}</article>
          <section class="stack">${state.locations.map(locationCard).join("")}</section>
        </div>
      </section>
    `;
    $("#addLocation").onclick = openLocationForm;
  }

  function renderNotes() {
    setPage("Catatan");
    appRoot.innerHTML = `
      <section class="container stack">
        ${sectionHead("Dokumentasi", "Catatan dan foto lapangan", "Simpan hasil kunjungan, diskusi warga, dokumentasi penyadapan, bahan baku, dan demplot.", "Tambah catatan", "addNote")}
        <label class="secondary-btn upload-button">Upload foto<input id="photoInput" type="file" accept="image/*" hidden></label>
        <div class="ops-grid">
          <article class="ops-panel"><h2>Catatan</h2>${noteList()}</article>
          <article class="ops-panel"><h2>Galeri</h2><div class="photo-grid">${photoList()}</div></article>
        </div>
      </section>
    `;
    $("#addNote").onclick = openNoteForm;
    $("#photoInput").onchange = savePhoto;
  }

  function renderBatches() {
    setPage("Batch Nira");
    appRoot.innerHTML = `
      <section class="container stack">
        ${sectionHead("Biostimulan Cair Nipah", "Kendali mutu bahan baku", "Catat asal nira, volume, pH, Brix, dan status batch sebelum uji formulasi atau demplot.", "Tambah batch", "addBatch")}
        <div class="batch-toolbar"><button class="secondary-btn" type="button" data-ai="bcn">Analisis batch dengan AI</button></div>
        <div class="batch-board">${state.batches.map(batchCard).join("")}</div>
        <article class="ops-panel">
          <h2>Alur batch</h2>
          <div class="process-line">
            ${processStep("01", "Nira masuk", "Sumber dan volume dicatat.")}
            ${processStep("02", "QC awal", "pH, Brix, warna, dan aroma diperiksa.")}
            ${processStep("03", "Fermentasi", "Batch diberi kode dan dipantau.")}
            ${processStep("04", "Demplot", "Aplikasi diuji terbatas bersama petani.")}
          </div>
        </article>
      </section>
    `;
    $("#addBatch").onclick = openBatchForm;
    bindAiButtons();
  }

  function renderPartners() {
    setPage("Mitra");
    appRoot.innerHTML = `
      <section class="container stack">
        ${sectionHead("Jejaring kerja", "Mitra program nipah", "Catat penyedia bahan baku, lokasi demplot, pendamping teknis, pengelola produksi, dan komunitas pendukung.")}
        <div class="batch-toolbar"><button class="secondary-btn" type="button" data-ai="partner">Buat draft ajakan mitra</button></div>
        <div class="ops-grid">
          <form id="partnerForm" class="ops-panel form-grid">
            <h2>Tambah mitra</h2>
            <label>Nama/instansi<input name="name" required placeholder="BUMDes, kelompok tani, komunitas"></label>
            <label>Peran<select name="role"><option>Penyadap nipah</option><option>BUMDes/Koperasi</option><option>Kelompok tani</option><option>Pendamping akademik</option><option>Komunitas lingkungan</option><option>Pemerintah desa/daerah</option></select></label>
            <label>Catatan<textarea name="note" placeholder="Potensi kontribusi atau tindak lanjut"></textarea></label>
            <button class="primary-btn" type="submit">Simpan mitra</button>
          </form>
          <section class="stack">${partnerList()}</section>
        </div>
      </section>
    `;
    $("#partnerForm").onsubmit = savePartner;
    bindAiButtons();
  }

  function renderAccount() {
    setPage("Akun");
    appRoot.innerHTML = `
      <section class="container stack">
        ${sectionHead("Akses pengguna", "Simpan data lintas perangkat", "Pengguna lapangan dapat masuk agar inventaris, catatan, batch, dan mitra tersimpan ke akun masing-masing.")}
        <div class="ops-grid">
          <form id="authForm" class="ops-panel form-grid">
            <div class="auth-tabs">
              <button class="secondary-btn ${authMode === "login" ? "active" : ""}" type="button" data-auth-mode="login">Login</button>
              <button class="secondary-btn ${authMode === "register" ? "active" : ""}" type="button" data-auth-mode="register">Daftar</button>
            </div>
            ${authMode === "register" ? `<label>Nama<input name="name" autocomplete="name"></label>` : ""}
            <label>Email<input name="email" type="email" autocomplete="email" required></label>
            <label>Password<input name="password" type="password" minlength="8" autocomplete="current-password" required></label>
            <button class="primary-btn" type="submit">${authMode === "login" ? "Login" : "Daftar"}</button>
            <p id="authMessage" class="muted">${state.authReady ? "" : "Login belum aktif di server."}</p>
          </form>
          <article class="ops-panel account-card">
            <span class="tag">${state.user ? "Login aktif" : "Mode lokal"}</span>
            <h2>${state.user ? escapeText(state.user.name || state.user.email) : "Belum login"}</h2>
            <p class="muted">Status penyimpanan: <strong>${syncText()}</strong></p>
            ${state.user ? `<button id="logoutBtn" class="danger-btn" type="button">Keluar</button>` : `<p class="muted">Data tetap tersimpan lokal di browser saat belum login.</p>`}
          </article>
        </div>
      </section>
    `;

    $$('[data-auth-mode]').forEach((button) => button.onclick = () => {
      authMode = button.dataset.authMode;
      renderAccount();
    });
    $("#authForm").onsubmit = submitAuth;
    $("#logoutBtn")?.addEventListener("click", logout);
  }

  function renderImpact() {
    setPage("Dampak");
    appRoot.innerHTML = `
      <section class="container stack">
        ${sectionHead("Indikator kerja", "Dampak yang dipantau", "Indikator dibuat praktis agar bisa diisi bertahap oleh tim lapangan.")}
        <div class="impact-grid">
          ${impactCard("Ekologi", "Kondisi tegakan", "Area rapat, area rawan rusak, dan pemanfaatan non-destruktif.")}
          ${impactCard("Ekonomi", "Nilai tambah nira", "Perbandingan bahan mentah, olahan, dan potensi produk turunan.")}
          ${impactCard("Sosial", "Keterlibatan warga", "Penyadap, kelompok tani, BUMDes, sekolah, dan komunitas lokal.")}
          ${impactCard("Pertanian", "Demplot BCN", "Dosis, frekuensi aplikasi, respons tanaman, dan catatan petani.")}
        </div>
      </section>
    `;
  }

  function sectionHead(kicker, heading, copy, actionLabel, actionId) {
    return `<div class="section-head"><div><p class="eyebrow">${escapeText(kicker)}</p><h2>${escapeText(heading)}</h2><p class="muted">${escapeText(copy || "")}</p></div>${actionLabel ? `<button class="primary-btn" id="${actionId}" type="button">${escapeText(actionLabel)}</button>` : ""}</div>`;
  }

  function metric(value, label, detail) {
    return `<article class="metric-card"><strong>${escapeText(value)}</strong><span>${escapeText(label)}</span><small>${escapeText(detail)}</small></article>`;
  }

  function mapMarkup() {
    return `<div class="field-map"><div class="map-river"></div>${state.locations.map((point) => `<div class="map-pin" style="--x:${point.x};--y:${point.y}" title="${escapeText(point.name)}"><i></i><small>${escapeText(point.status)}</small></div>`).join("")}</div>`;
  }

  function locationCard(point) {
    return `<article class="location-card"><span class="tag">${escapeText(point.status)}</span><h3>${escapeText(point.name)}</h3><p><strong>${escapeText(point.area)}</strong></p><p class="muted">${escapeText(point.condition)}</p></article>`;
  }

  function noteList() {
    if (!state.notes.length) return emptyState("Belum ada catatan", "Tambahkan hasil observasi, diskusi warga, atau perkembangan lokasi.");
    return state.notes.map((note) => `<article class="note-card"><span class="tag">${escapeText(note.date)}</span><h3>${escapeText(note.title)}</h3><p class="muted">${escapeText(note.text)}</p></article>`).join("");
  }

  function photoList() {
    if (!state.photos.length) return emptyState("Belum ada foto", "Upload dokumentasi lokasi, bahan baku, penyadapan, atau demplot.");
    return state.photos.map((photo) => `<article class="photo-card"><img src="${photo.src}" alt="${escapeText(photo.caption)}"><p>${escapeText(photo.caption)}</p></article>`).join("");
  }

  function batchCard(batch) {
    return `<article class="batch-card"><span class="tag">${escapeText(batch.status)}</span><h3>${escapeText(batch.code)}</h3><dl><div><dt>Sumber</dt><dd>${escapeText(batch.source)}</dd></div><div><dt>Volume</dt><dd>${escapeText(batch.volume)}</dd></div><div><dt>pH</dt><dd>${escapeText(batch.ph)}</dd></div><div><dt>Brix</dt><dd>${escapeText(batch.brix)}</dd></div></dl></article>`;
  }

  function processStep(number, heading, copy) {
    return `<article class="process-step"><span>${number}</span><h3>${escapeText(heading)}</h3><p>${escapeText(copy)}</p></article>`;
  }

  function impactCard(kicker, heading, copy) {
    return `<article class="impact-card"><span class="tag">${escapeText(kicker)}</span><h3>${escapeText(heading)}</h3><p class="muted">${escapeText(copy)}</p></article>`;
  }

  function partnerList() {
    if (!state.partners.length) return emptyState("Belum ada mitra", "Tambahkan pihak yang akan dilibatkan dalam program.");
    return state.partners.map((partner) => `<article class="partner-card"><span class="tag">${escapeText(partner.role)}</span><h3>${escapeText(partner.name)}</h3><p class="muted">${escapeText(partner.note || "Belum ada catatan tindak lanjut.")}</p></article>`).join("");
  }

  function emptyState(heading, copy) {
    return `<div class="empty-state"><strong>${escapeText(heading)}</strong><p>${escapeText(copy)}</p></div>`;
  }

  function openLocationForm() {
    openModal(`<h2>Tambah lokasi nipah</h2><form id="locationForm" class="form-grid"><label>Nama lokasi<input name="name" required></label><label>Area<input name="area"></label><label>Kondisi<textarea name="condition"></textarea></label><label>Status<select name="status"><option>Terverifikasi awal</option><option>Perlu cek</option><option>Rencana</option></select></label><button class="primary-btn">Simpan</button></form>`);
    $("#locationForm").onsubmit = (event) => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      state.locations.unshift({ name: formText(fields, "name", "Titik nipah"), area: formText(fields, "area", "Belum diisi"), condition: formText(fields, "condition", "Belum ada catatan kondisi."), status: formText(fields, "status", "Rencana"), x: 30 + Math.round(Math.random() * 42), y: 28 + Math.round(Math.random() * 42) });
      persistState(); closeModal(); renderLocations(); showToast("Lokasi tersimpan.");
    };
  }

  function openNoteForm() {
    openModal(`<h2>Tambah catatan</h2><form id="noteForm" class="form-grid"><label>Judul<input name="title" required></label><label>Catatan<textarea name="text" required></textarea></label><button class="primary-btn">Simpan</button></form>`);
    $("#noteForm").onsubmit = (event) => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      state.notes.unshift({ title: formText(fields, "title", "Catatan"), text: formText(fields, "text", ""), date: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) });
      persistState(); closeModal(); renderNotes(); showToast("Catatan tersimpan.");
    };
  }

  function savePhoto(event) {
    const imageFile = event.target.files?.[0];
    if (!imageFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      const caption = prompt("Caption foto:", "Dokumentasi lokasi nipah") || "Dokumentasi lokasi nipah";
      state.photos.unshift({ src: String(reader.result), caption });
      persistState(); renderNotes(); showToast("Foto tersimpan.");
    };
    reader.readAsDataURL(imageFile);
  }

  function openBatchForm() {
    openModal(`<h2>Tambah batch nira</h2><form id="batchForm" class="form-grid"><label>Kode batch<input name="code" required></label><label>Sumber<input name="source"></label><div class="grid two"><label>Volume<input name="volume"></label><label>pH<input name="ph"></label></div><div class="grid two"><label>Brix<input name="brix"></label><label>Status<input name="status"></label></div><button class="primary-btn">Simpan</button></form>`);
    $("#batchForm").onsubmit = (event) => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      state.batches.unshift({ code: formText(fields, "code", "NIR"), source: formText(fields, "source", "Belum diisi"), volume: formText(fields, "volume", "-"), ph: formText(fields, "ph", "-"), brix: formText(fields, "brix", "-"), status: formText(fields, "status", "Dicatat") });
      persistState(); closeModal(); renderBatches(); showToast("Batch tersimpan.");
    };
  }

  function savePartner(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    state.partners.unshift({ name: formText(fields, "name", "Mitra"), role: formText(fields, "role", "Mitra"), note: formText(fields, "note", "") });
    persistState(); renderPartners(); showToast("Mitra tersimpan.");
  }

  async function submitAuth(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const authMessage = $("#authMessage");
    authMessage.textContent = "Memproses akun...";

    try {
      const authResponse = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: authMode, name: formText(fields, "name", ""), email: formText(fields, "email", ""), password: formText(fields, "password", "") })
      });
      const authPayload = await authResponse.json();
      if (!authResponse.ok || !authPayload.ok) throw new Error(authPayload.error || "Akses akun gagal.");
      if (authPayload.needsEmailConfirmation) {
        authMessage.textContent = authPayload.message;
        return;
      }
      state.user = authPayload.user;
      await loadCloudState();
      persistState();
      renderAccount();
      showToast("Akun aktif.");
    } catch (error) {
      authMessage.textContent = error.message || "Akses akun gagal.";
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }).catch(() => {});
    state.user = null;
    state.syncState = "lokal";
    persistState();
    renderAccount();
  }

  function bindAiButtons() {
    $$('[data-ai]').forEach((button) => button.onclick = () => askGemini(button.dataset.ai));
  }

  async function askGemini(kind) {
    openModal(`<h2>Saran Operasional</h2><p class="muted">Menganalisis data yang tersedia...</p>`);
    try {
      const aiResponse = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature: "Nipah Lestari", message: buildAiPrompt(kind) })
      });
      const aiPayload = await aiResponse.json();
      if (!aiResponse.ok || !aiPayload.ok) throw new Error(aiPayload.error || "AI belum tersedia.");
      $(".modal-body").innerHTML = `<h2>Saran Operasional</h2><div class="ai-result">${escapeText(aiPayload.answer).replace(/\n/g, "<br>")}</div>`;
    } catch (error) {
      $(".modal-body").innerHTML = `<h2>Saran Operasional</h2><p class="muted">${escapeText(error.message || "AI belum tersedia.")}</p>`;
    }
  }

  function buildAiPrompt(kind) {
    const snapshot = JSON.stringify({ locations: state.locations, notes: state.notes.slice(0, 10), batches: state.batches, partners: state.partners }, null, 2);
    const prompts = {
      summary: "Ringkas kondisi lapangan nipah dalam 5 poin singkat dan praktis.",
      next: "Susun 5 prioritas tindak lanjut untuk minggu ini berdasarkan data.",
      risk: "Identifikasi risiko program dan langkah pencegahan yang realistis.",
      report: "Buat laporan singkat untuk rapat desa atau BUMDes.",
      bcn: "Tinjau catatan batch nira/BCN dan beri saran QC awal tanpa membuat klaim hasil uji.",
      partner: "Buat draft ajakan kolaborasi singkat untuk calon mitra program nipah."
    };
    return `${prompts[kind] || prompts.summary}\n\nData aplikasi:\n${snapshot}`;
  }

  function syncText() {
    if (state.user) return state.syncState || "tersinkron";
    return "mode lokal";
  }

  function updateSyncBadge() {
    const badge = $("#syncBadge");
    if (badge) badge.textContent = syncText();
  }

  function formText(fields, name, fallback) {
    return String(fields.get(name) || fallback).trim();
  }

  function openModal(markup) {
    closeModal();
    const modal = $("#modalTemplate").content.cloneNode(true);
    $(".modal-body", modal).innerHTML = markup;
    $(".modal-close", modal).onclick = closeModal;
    document.body.appendChild(modal);
  }

  function closeModal() {
    $(".modal-backdrop")?.remove();
  }

  function showToast(message) {
    toastRoot.textContent = message;
    toastRoot.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toastRoot.classList.remove("show"), 2400);
  }

  function escapeText(value) {
    return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  }
})();
