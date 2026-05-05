(() => {
  "use strict";

  const KEY = "nipah_lestari_lapangan_v1";
  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => [...root.querySelectorAll(q)];

  const app = $("#app");
  const nav = $("#mainNav");
  const pageTitle = $("#pageTitle");
  const toast = $("#toast");

  const menu = [
    ["/", "Ringkasan"],
    ["/inventaris", "Inventaris"],
    ["/dokumen", "Dokumentasi"],
    ["/bcn", "Batch BCN"],
    ["/dampak", "Dampak"],
    ["/mitra", "Mitra"]
  ];

  const seed = {
    theme: "light",
    locations: [
      { name: "Pesisir Lae Singkil", area: "Estuari", note: "Tegakan nipah rapat, akses perlu pendamping lokal.", status: "Terverifikasi awal", x: 36, y: 52 },
      { name: "Koridor Muara", area: "Aliran sungai", note: "Potensial untuk observasi penyadapan dan edukasi konservasi.", status: "Perlu kunjungan ulang", x: 58, y: 34 },
      { name: "Calon Rumah Produksi", area: "Dekat akses desa", note: "Simulasi simpul pengumpulan nira dan koordinasi mitra.", status: "Rencana", x: 70, y: 67 }
    ],
    notes: [],
    photos: [],
    batches: [
      { code: "BCN-01", source: "Lae Singkil", volume: "2 L", ph: "4.8", brix: "13", status: "QC awal" }
    ],
    partners: []
  };

  let state = loadState();

  init();

  function init() {
    document.documentElement.dataset.theme = state.theme;
    nav.innerHTML = menu.map(([path, label], index) => `
      <a href="${path}" data-link><span class="nav-number">${String(index + 1).padStart(2, "0")}</span><span>${label}</span></a>
    `).join("");

    $("#menuBtn").onclick = () => document.body.classList.toggle("menu-open");
    $("#themeBtn").onclick = toggleTheme;
    document.addEventListener("click", onRouteClick);
    window.addEventListener("popstate", renderRoute);
    renderRoute();
  }

  function loadState() {
    try {
      return { ...seed, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
    } catch {
      return { ...seed };
    }
  }

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function onRouteClick(event) {
    const link = event.target.closest("a[data-link]");
    if (!link) return;
    const nextUrl = new URL(link.href);
    if (nextUrl.origin !== location.origin) return;
    event.preventDefault();
    history.pushState({}, "", nextUrl.pathname);
    renderRoute();
  }

  function renderRoute() {
    document.body.classList.remove("menu-open");
    const path = location.pathname.replace(/\/$/, "") || "/";
    $$(".nav a").forEach((link) => {
      const linkPath = new URL(link.href).pathname.replace(/\/$/, "") || "/";
      link.classList.toggle("active", linkPath === path);
    });

    const pages = {
      "/": renderDashboard,
      "/inventaris": renderInventory,
      "/dokumen": renderDocs,
      "/bcn": renderBcn,
      "/dampak": renderImpact,
      "/mitra": renderPartners
    };
    (pages[path] || renderDashboard)();
    app.focus({ preventScroll: true });
  }

  function setPage(title) {
    pageTitle.textContent = title;
    document.title = `${title} - Nipah Lestari`;
  }

  function renderDashboard() {
    setPage("Ringkasan");
    app.innerHTML = `
      <section class="container stack">
        <div class="lapangan-hero">
          <section>
            <p class="eyebrow">Portal Aksi Pesisir</p>
            <h2>Pendataan nipah, nira, dan mitra kerja di satu tempat.</h2>
            <p>Dirancang untuk pendamping lapangan, BUMDes, kelompok penyadap, petani, komunitas, dan pemerintah desa yang mengelola program nipah secara bertahap.</p>
            <div class="hero-actions">
              <a class="primary-btn" href="/inventaris" data-link>Tambah titik nipah</a>
              <a class="secondary-btn" href="/bcn" data-link>Catat batch nira</a>
            </div>
          </section>
          <aside class="workflow-card">
            <span>alur kerja</span>
            <ol><li>Petakan tegakan</li><li>Dokumentasi lapangan</li><li>QC nira</li><li>Siapkan demplot</li></ol>
          </aside>
        </div>

        <div class="metrics-strip">
          ${metric(state.locations.length, "Titik nipah", "inventaris")}
          ${metric(state.photos.length, "Foto", "lapangan")}
          ${metric(state.batches.length, "Batch", "nira/BCN")}
          ${metric(state.partners.length, "Mitra", "program")}
        </div>

        <div class="grid two">
          <section class="card stack"><div class="between"><h2>Peta kerja</h2><a class="ghost-btn" href="/inventaris" data-link>Kelola</a></div>${map()}</section>
          <section class="card stack">
            <h2>Prioritas lapangan</h2>
            ${task("Validasi titik", "Lengkapi area, akses, dan kondisi tegakan nipah.")}
            ${task("Dokumentasi penyadapan", "Simpan foto proses, wadah, dan waktu pengumpulan nira.")}
            ${task("QC bahan baku", "Catat pH, Brix, volume, warna, aroma, dan status batch.")}
          </section>
        </div>
      </section>
    `;
  }

  function renderInventory() {
    setPage("Inventaris Nipah");
    app.innerHTML = `
      <section class="container stack">
        ${header("Pendataan lokasi", "Titik nipah dan kondisi lapangan", "Mencatat lokasi, kondisi tegakan, akses, dan status verifikasi.", "Tambah titik", "addLocation")}
        <div class="grid two map-layout"><section class="card stack">${map()}</section><section class="location-list">${state.locations.map(locationCard).join("")}</section></div>
      </section>
    `;
    $("#addLocation").onclick = openLocationForm;
  }

  function renderDocs() {
    setPage("Dokumentasi");
    app.innerHTML = `
      <section class="container stack">
        ${header("Bukti lapangan", "Foto dan catatan observasi", "Menyimpan dokumentasi lokasi, diskusi warga, proses penyadapan, bahan baku, dan demplot.", "Tambah catatan", "addNote")}
        <div class="row"><label class="secondary-btn" style="cursor:pointer">Upload foto<input id="photoInput" type="file" accept="image/*" hidden></label></div>
        <div class="grid two"><section class="card stack"><h2>Catatan</h2>${notes()}</section><section class="card stack"><h2>Galeri</h2><div class="photo-grid">${photos()}</div></section></div>
      </section>
    `;
    $("#addNote").onclick = openNoteForm;
    $("#photoInput").onchange = savePhoto;
  }

  function renderBcn() {
    setPage("Batch BCN");
    app.innerHTML = `
      <section class="container stack">
        ${header("Biostimulan Cair Nipah", "Catatan nira dan kendali mutu awal", "Mencatat asal nira, volume, pH, Brix, dan status pengolahan sebelum uji lanjutan.", "Tambah batch", "addBatch")}
        <div class="batch-board">${state.batches.map(batchCard).join("")}</div>
        <section class="card stack"><h2>Alur batch</h2><div class="process-line">${step("01", "Nira masuk", "Sumber dan volume dicatat.")}${step("02", "QC awal", "pH, Brix, warna, dan aroma diperiksa.")}${step("03", "Fermentasi", "Batch diberi kode dan dipantau.")}${step("04", "Demplot", "Aplikasi diuji terbatas bersama petani.")}</div></section>
      </section>
    `;
    $("#addBatch").onclick = openBatchForm;
  }

  function renderImpact() {
    setPage("Dampak");
    app.innerHTML = `
      <section class="container stack">
        ${header("Indikator kerja", "Dampak yang dipantau", "Indikator dibuat praktis agar bisa diisi oleh tim lapangan secara bertahap.")}
        <div class="impact-grid">
          ${impactItem("Ekologi", "Kondisi tegakan", "Area rapat, area rawan rusak, dan catatan pemanfaatan non-destruktif.")}
          ${impactItem("Ekonomi", "Nilai tambah nira", "Perbandingan bahan mentah, olahan, dan potensi produk turunan.")}
          ${impactItem("Sosial", "Keterlibatan warga", "Penyadap, kelompok tani, BUMDes, sekolah, dan komunitas lokal.")}
          ${impactItem("Pertanian", "Demplot BCN", "Dosis, frekuensi aplikasi, respons tanaman, dan catatan petani.")}
        </div>
      </section>
    `;
  }

  function renderPartners() {
    setPage("Mitra");
    app.innerHTML = `
      <section class="container stack">
        ${header("Jejaring kerja", "Calon mitra program", "Mencatat pihak yang terlibat sebagai penyedia bahan baku, lokasi demplot, pendamping teknis, atau pengelola produksi.")}
        <div class="grid two">
          <form id="partnerForm" class="card form-grid">
            <h2>Tambah mitra</h2>
            <label>Nama/instansi<input name="name" required placeholder="BUMDes, kelompok tani, komunitas"></label>
            <label>Peran<select name="role"><option>Penyadap nipah</option><option>BUMDes/Koperasi</option><option>Kelompok tani</option><option>Pendamping akademik</option><option>Komunitas lingkungan</option><option>Pemerintah desa/daerah</option></select></label>
            <label>Catatan<textarea name="note" placeholder="Potensi kontribusi atau tindak lanjut"></textarea></label>
            <button class="primary-btn" type="submit">Simpan mitra</button>
          </form>
          <section class="partner-list">${partnerList()}</section>
        </div>
      </section>
    `;
    $("#partnerForm").onsubmit = savePartner;
  }

  function header(kicker, heading, copy, action, id) {
    return `<div class="section-head"><div><p class="eyebrow">${escapeText(kicker)}</p><h2>${escapeText(heading)}</h2><p class="muted">${escapeText(copy || "")}</p></div>${action ? `<button class="primary-btn" id="${id}" type="button">${escapeText(action)}</button>` : ""}</div>`;
  }

  function metric(value, label, sub) {
    return `<article class="metric-card"><strong>${escapeText(value)}</strong><span>${escapeText(label)}</span><small>${escapeText(sub)}</small></article>`;
  }

  function task(heading, copy) {
    return `<article class="task-row"><span></span><div><h3>${escapeText(heading)}</h3><p>${escapeText(copy)}</p></div></article>`;
  }

  function map() {
    return `<div class="map-box field-map"><div class="map-river"></div>${state.locations.map((point) => `<div class="map-pin" style="--x:${point.x};--y:${point.y}" title="${escapeText(point.name)}"><i></i><small>${escapeText(point.status)}</small></div>`).join("")}</div>`;
  }

  function locationCard(point) {
    return `<article class="location-card"><span class="tag">${escapeText(point.status)}</span><h3>${escapeText(point.name)}</h3><p><strong>${escapeText(point.area)}</strong></p><p class="muted">${escapeText(point.note)}</p></article>`;
  }

  function notes() {
    if (!state.notes.length) return `<div class="empty-state"><strong>Belum ada catatan.</strong><p>Tambah hasil observasi, diskusi warga, atau perkembangan lokasi.</p></div>`;
    return state.notes.map((note) => `<article class="note-card"><span class="tag">${escapeText(note.date)}</span><h3>${escapeText(note.title)}</h3><p class="muted">${escapeText(note.text)}</p></article>`).join("");
  }

  function photos() {
    if (!state.photos.length) return `<div class="empty-state"><strong>Belum ada foto.</strong><p>Upload dokumentasi lokasi, bahan baku, penyadapan, atau demplot.</p></div>`;
    return state.photos.map((photo) => `<article class="photo-card"><img src="${photo.src}" alt="${escapeText(photo.caption)}"><p>${escapeText(photo.caption)}</p></article>`).join("");
  }

  function batchCard(batch) {
    return `<article class="batch-card"><span class="tag">${escapeText(batch.status)}</span><h3>${escapeText(batch.code)}</h3><dl><div><dt>Sumber</dt><dd>${escapeText(batch.source)}</dd></div><div><dt>Volume</dt><dd>${escapeText(batch.volume)}</dd></div><div><dt>pH</dt><dd>${escapeText(batch.ph)}</dd></div><div><dt>Brix</dt><dd>${escapeText(batch.brix)}</dd></div></dl></article>`;
  }

  function step(number, heading, copy) {
    return `<article class="process-step"><span>${number}</span><h3>${escapeText(heading)}</h3><p>${escapeText(copy)}</p></article>`;
  }

  function impactItem(label, heading, copy) {
    return `<article class="impact-card"><span class="tag">${escapeText(label)}</span><h3>${escapeText(heading)}</h3><p class="muted">${escapeText(copy)}</p></article>`;
  }

  function partnerList() {
    if (!state.partners.length) return `<div class="empty-state"><strong>Belum ada mitra.</strong><p>Tambahkan pihak yang akan dilibatkan dalam program.</p></div>`;
    return state.partners.map((partner) => `<article class="partner-card"><span class="tag">${escapeText(partner.role)}</span><h3>${escapeText(partner.name)}</h3><p class="muted">${escapeText(partner.note || "Belum ada catatan tindak lanjut.")}</p></article>`).join("");
  }

  function openLocationForm() {
    openModal(`<h2>Tambah titik nipah</h2><form id="locationForm" class="form-grid"><label>Nama lokasi<input name="name" required></label><label>Area<input name="area"></label><label>Catatan<textarea name="note"></textarea></label><label>Status<select name="status"><option>Terverifikasi awal</option><option>Perlu kunjungan ulang</option><option>Rencana</option></select></label><button class="primary-btn">Simpan</button></form>`);
    $("#locationForm").onsubmit = (event) => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      state.locations.unshift({ name: field(fields, "name", "Titik nipah"), area: field(fields, "area", "Belum diisi"), note: field(fields, "note", "Belum ada catatan."), status: field(fields, "status", "Rencana"), x: 30 + Math.round(Math.random() * 42), y: 28 + Math.round(Math.random() * 42) });
      persist(); closeModal(); renderInventory(); showToast("Titik tersimpan.");
    };
  }

  function openNoteForm() {
    openModal(`<h2>Tambah catatan</h2><form id="noteForm" class="form-grid"><label>Judul<input name="title" required></label><label>Catatan<textarea name="text" required></textarea></label><button class="primary-btn">Simpan</button></form>`);
    $("#noteForm").onsubmit = (event) => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      state.notes.unshift({ title: field(fields, "title", "Catatan"), text: field(fields, "text", ""), date: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) });
      persist(); closeModal(); renderDocs(); showToast("Catatan tersimpan.");
    };
  }

  function savePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const caption = prompt("Caption foto:", "Dokumentasi lokasi nipah") || "Dokumentasi lokasi nipah";
      state.photos.unshift({ src: String(reader.result), caption });
      persist(); renderDocs(); showToast("Foto tersimpan.");
    };
    reader.readAsDataURL(file);
  }

  function openBatchForm() {
    openModal(`<h2>Tambah batch nira</h2><form id="batchForm" class="form-grid"><label>Kode batch<input name="code" required></label><label>Sumber<input name="source"></label><div class="grid two"><label>Volume<input name="volume"></label><label>pH<input name="ph"></label></div><div class="grid two"><label>Brix<input name="brix"></label><label>Status<input name="status"></label></div><button class="primary-btn">Simpan</button></form>`);
    $("#batchForm").onsubmit = (event) => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      state.batches.unshift({ code: field(fields, "code", "BCN"), source: field(fields, "source", "Belum diisi"), volume: field(fields, "volume", "-"), ph: field(fields, "ph", "-"), brix: field(fields, "brix", "-"), status: field(fields, "status", "Dicatat") });
      persist(); closeModal(); renderBcn(); showToast("Batch tersimpan.");
    };
  }

  function savePartner(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    state.partners.unshift({ name: field(fields, "name", "Mitra"), role: field(fields, "role", "Mitra"), note: field(fields, "note", "") });
    persist(); renderPartners(); showToast("Mitra tersimpan.");
  }

  function field(fields, name, fallback) {
    return String(fields.get(name) || fallback);
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = state.theme;
    persist();
  }

  function openModal(html) {
    closeModal();
    const modal = $("#modalTemplate").content.cloneNode(true);
    $(".modal-body", modal).innerHTML = html;
    $(".modal-close", modal).onclick = closeModal;
    document.body.appendChild(modal);
  }

  function closeModal() {
    $(".modal-backdrop")?.remove();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function escapeText(value) {
    return String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  }
})();
