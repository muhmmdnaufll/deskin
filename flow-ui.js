(() => {
  "use strict";

  const APP_VERSION = "2.0.0";
  const STORAGE_KEY = "nipah_lestari_state_v2";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const app = $("#app");
  const navRoot = $("#mainNav");
  const pageTitle = $("#pageTitle");
  const toastBox = $("#toast");

  const navItems = [
    { path: "/", label: "Beranda" },
    { path: "/aksi", label: "Aksi Lapangan" },
    { path: "/nipah", label: "Kenali Nipah" },
    { path: "/solusi", label: "Biostimulan" },
    { path: "/dampak", label: "Dampak" },
    { path: "/edukasi", label: "Edukasi" },
    { path: "/kolaborasi", label: "Kolaborasi" },
    { path: "/tentang", label: "Tentang" }
  ];

  const defaultLocations = [
    { name: "Kawasan Pesisir Lae Singkil", x: 38, y: 48, status: "Observasi awal" },
    { name: "Muara Estuari", x: 58, y: 35, status: "Perlu validasi" },
    { name: "Calon Titik Kolaborasi Desa", x: 68, y: 66, status: "Rencana" }
  ];

  const articles = [
    {
      title: "Mengapa Nipah Penting untuk Pesisir?",
      category: "Lingkungan",
      minutes: 4,
      body: "Nipah membantu menjaga kawasan estuari, memberi ruang hidup bagi biota pesisir, dan bisa menjadi sumber ekonomi tanpa harus merusak tegakan hidupnya."
    },
    {
      title: "Nira Cepat Rusak, Kenapa Perlu Hilirisasi?",
      category: "Ekonomi Lokal",
      minutes: 5,
      body: "Nira nipah mudah berubah kualitas setelah disadap. Karena itu, pencatatan waktu, wadah higienis, dan pengolahan awal menjadi penting."
    },
    {
      title: "Apa Itu Biostimulan Cair Nipah?",
      category: "Pertanian",
      minutes: 5,
      body: "Biostimulan Cair Nipah adalah gagasan pengolahan nira nipah melalui fermentasi terkendali untuk mendukung pertumbuhan tanaman. Tahap awalnya tetap prototipe uji terbatas."
    },
    {
      title: "Energi Baik dalam Aksi Lingkungan",
      category: "Sobat Bumi",
      minutes: 3,
      body: "Energi baik bisa berbentuk pengetahuan, kolaborasi, kepedulian, dan keberanian memulai aksi. Di sini, energi baik disebarkan lewat observasi, edukasi digital, dan ajakan menjaga pesisir."
    }
  ];

  const impacts = [
    { title: "Lingkungan", value: "Tegakan dijaga", text: "Pemanfaatan diarahkan tanpa menebang nipah, sehingga nilai ekonomi ikut mendukung konservasi." },
    { title: "Sosial", value: "Kolaborasi lokal", text: "Penyadap, BUMDes, petani, mahasiswa, dan dinas bisa terhubung dalam satu gerakan awal." },
    { title: "Ekonomi", value: "Nilai tambah", text: "Nira tidak berhenti sebagai bahan mentah, tetapi diarahkan menjadi produk bernilai guna." },
    { title: "Edukasi", value: "Aksi digital", text: "Website menjadi ruang belajar dan dokumentasi agar gagasan mudah dipahami publik." }
  ];

  const defaultState = {
    theme: "light",
    locations: defaultLocations,
    fieldNotes: [],
    supporters: [],
    photos: []
  };

  let state = loadState();

  init();

  function init() {
    document.documentElement.dataset.theme = state.theme;
    renderNav();
    bindShell();
    window.addEventListener("popstate", renderRoute);
    document.addEventListener("click", routeClick);
    renderRoute();
    navigator.serviceWorker?.register("/service-worker.js").catch(() => {});
  }

  function loadState() {
    try {
      return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
      return { ...defaultState };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function bindShell() {
    $("#menuBtn").addEventListener("click", () => document.body.classList.toggle("menu-open"));
    $("#themeBtn").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = state.theme;
      saveState();
      toast(`Tema ${state.theme === "dark" ? "gelap" : "terang"} aktif.`);
    });
  }

  function renderNav() {
    navRoot.innerHTML = navItems.map((navItem, index) => `
      <a href="${navItem.path}" data-link>
        <span class="nav-number">${String(index + 1).padStart(2, "0")}</span>
        <span>${navItem.label}</span>
      </a>
    `).join("");
  }

  function routeClick(event) {
    const anchor = event.target.closest("a[data-link]");
    if (!anchor) return;

    const nextUrl = new URL(anchor.href);
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
      "/": renderHome,
      "/aksi": renderAksi,
      "/nipah": renderNipah,
      "/solusi": renderSolusi,
      "/dampak": renderDampak,
      "/edukasi": renderEdukasi,
      "/kolaborasi": renderKolaborasi,
      "/tentang": renderTentang
    };

    (pages[path] || renderHome)();
    app.focus({ preventScroll: true });
  }

  function setPage(title) {
    pageTitle.textContent = title;
    document.title = `${title} - Nipah Lestari`;
  }

  function renderHome() {
    setPage("Energi Baik Pesisir");
    app.innerHTML = `
      <section class="container stack">
        <div class="hero">
          <div>
            <p class="eyebrow">Prototype Aksi Nyata</p>
            <h2>Mengubah potensi nipah menjadi energi baik untuk pesisir.</h2>
            <p>Nipah Lestari adalah website edukasi, dokumentasi, dan kolaborasi untuk memperkenalkan potensi nipah Aceh Singkil serta gagasan hilirisasi nira nipah menjadi Biostimulan Cair Nipah.</p>
            <div class="hero-actions">
              <a class="primary-btn" href="/aksi" data-link>Lihat aksi lapangan</a>
              <a class="secondary-btn" href="/kolaborasi" data-link>Dukung kolaborasi</a>
            </div>
          </div>
          <div class="leaf-card">
            <div class="between"><strong>Nipah Lestari</strong><span class="pill success">Sobat Bumi 2026</span></div>
            <div class="leaf-visual" aria-hidden="true"></div>
            <p>Dari observasi pesisir, gagasan biostimulan, hingga kampanye digital yang bisa dibuka dan dikembangkan.</p>
          </div>
        </div>

        <div class="grid four">
          ${statCard("768,08 ha", "Potensi nipah", "Basis estuari Lae Singkil yang menjadi fokus gagasan.")}
          ${statCard(state.photos.length, "Foto aksi", "Dokumentasi lapangan tersimpan di browser.")}
          ${statCard(state.supporters.length, "Dukungan", "Calon kolaborator yang mengisi form minat.")}
          ${statCard(APP_VERSION, "Versi prototype", "Dibangun dari project DeSkin yang dialihkan ke isu lingkungan.")}
        </div>

        <section class="grid three">
          ${featureCard("🌿", "Edukasi", "Menjelaskan nipah, pesisir, ekonomi biru, dan pertanian ramah lingkungan dengan bahasa sederhana.")}
          ${featureCard("📍", "Dokumentasi", "Merekam observasi lokasi, foto, dan catatan lapangan agar aksi awal lebih terlihat nyata.")}
          ${featureCard("🤝", "Kolaborasi", "Membuka ruang dukungan dari mahasiswa, petani, BUMDes, penyadap, dan mitra daerah.")}
        </section>
      </section>
    `;
  }

  function renderAksi() {
    setPage("Aksi Lapangan");
    app.innerHTML = `
      <section class="container stack">
        <div class="between">
          <div>
            <p class="eyebrow">Dari lokasi ke aksi digital</p>
            <h2>Observasi kawasan nipah pesisir Aceh Singkil</h2>
            <p class="muted">Halaman ini menjadi tempat dokumentasi aksi awal: foto, catatan lapangan, dan titik potensi nipah yang mulai dipetakan.</p>
          </div>
          <button class="primary-btn" id="addNoteBtn" type="button">Tambah catatan</button>
        </div>

        <div class="grid two">
          <section class="card stack">
            <div class="between"><h2>Peta sederhana</h2><span class="tag">Demo koordinat visual</span></div>
            ${mapMarkup()}
          </section>
          <section class="card stack">
            <h2>Catatan observasi</h2>
            <div class="stack">${fieldNotesMarkup()}</div>
          </section>
        </div>

        <section class="card stack">
          <div class="between">
            <div><h2>Dokumentasi foto</h2><p class="muted">Upload foto asli dari lokasi nipah untuk memperkuat bukti aksi nyata.</p></div>
            <label class="secondary-btn" style="cursor:pointer">Upload foto<input id="photoInput" type="file" accept="image/*" hidden></label>
          </div>
          <div class="photo-grid">${photosMarkup()}</div>
        </section>
      </section>
    `;

    $("#addNoteBtn").addEventListener("click", openFieldNoteModal);
    $("#photoInput").addEventListener("change", savePhoto);
  }

  function renderNipah() {
    setPage("Kenali Nipah");
    app.innerHTML = `
      <section class="container stack">
        <div class="hero">
          <div>
            <p class="eyebrow">Potensi lokal</p>
            <h2>Nipah bukan sekadar tanaman pesisir.</h2>
            <p>Nipah dapat menjadi pintu masuk untuk konservasi pesisir, pemberdayaan masyarakat, dan pengembangan produk berbasis sumber daya lokal.</p>
          </div>
          <div class="card stack">
            <span class="pill success">Fokus Aceh Singkil</span>
            <h2>768,08 ha</h2>
            <p class="muted">Potensi sebaran nipah di kawasan estuari Lae Singkil menjadi dasar awal gagasan hilirisasi.</p>
          </div>
        </div>

        <section class="grid three">
          ${featureCard("🌊", "Menjaga pesisir", "Tegakan nipah berperan dalam ekosistem estuari dan membantu menjaga kawasan pesisir tetap produktif.")}
          ${featureCard("🧃", "Menghasilkan nira", "Nira nipah punya potensi sebagai bahan baku olahan, tetapi cepat berubah kualitas jika tidak segera ditangani.")}
          ${featureCard("🏡", "Menguatkan desa", "Jika diolah dengan baik, nipah bisa mendukung penyadap, BUMDes, petani, dan ekonomi lokal.")}
        </section>

        <section class="card stack">
          <h2>Masalah yang ditemukan</h2>
          <div class="timeline">
            ${timelineStep(1, "Nilai tambah masih rendah", "Pemanfaatan nipah belum banyak bergerak ke produk hilir yang punya nilai lebih tinggi.")}
            ${timelineStep(2, "Nira cepat rusak", "Waktu dari penyadapan ke pengolahan perlu dicatat dan dikendalikan agar mutu tidak turun.")}
            ${timelineStep(3, "Aksi konservasi perlu insentif", "Masyarakat lebih terdorong menjaga tegakan bila ada manfaat ekonomi yang adil dan berkelanjutan.")}
          </div>
        </section>
      </section>
    `;
  }

  function renderSolusi() {
    setPage("Biostimulan Nipah");
    app.innerHTML = `
      <section class="container stack">
        <div class="hero">
          <div>
            <p class="eyebrow">Solusi yang diusulkan</p>
            <h2>Dari nira nipah menjadi Biostimulan Cair Nipah.</h2>
            <p>Gagasan ini mengolah nira nipah melalui proses sederhana dan terukur untuk mendukung pertanian ramah lingkungan. Pada tahap awal, posisinya sebagai prototype uji terbatas dan bahan edukasi demplot.</p>
            <div class="hero-actions">
              <button class="primary-btn" data-ai="Jelaskan gagasan Biostimulan Cair Nipah dengan bahasa singkat untuk calon mitra.">Minta ringkasan AI</button>
            </div>
          </div>
          <div class="card stack">
            <span class="pill warn">Prototype</span>
            <h2>BCN</h2>
            <p class="muted">Biostimulan Cair Nipah: hilirisasi nira, kendali mutu sederhana, dan demplot hortikultura lokal.</p>
          </div>
        </div>

        <section class="card stack">
          <h2>Alur aksi</h2>
          <div class="timeline">
            ${timelineStep(1, "Penyadapan higienis", "Nira dikumpulkan dengan wadah bersih dan prinsip non-destruktif agar tegakan tetap terjaga.")}
            ${timelineStep(2, "Pencatatan awal", "Waktu sadap, volume, warna, aroma, pH, dan Brix dicatat sebagai kendali mutu dasar.")}
            ${timelineStep(3, "Fermentasi terkendali", "Formula diuji bertahap bersama pendamping akademik/laboratorium sebelum masuk ke demplot.")}
            ${timelineStep(4, "Demplot petani", "Produk diuji terbatas pada tanaman lokal untuk melihat respons awal dan mendapatkan umpan balik.")}
          </div>
        </section>
      </section>
    `;
    bindAiButtons();
  }

  function renderDampak() {
    setPage("Dampak Lestari");
    app.innerHTML = `
      <section class="container stack">
        <div>
          <p class="eyebrow">Nilai energi baik</p>
          <h2>Dampak yang ingin dibangun</h2>
          <p class="muted">Indikator ini memisahkan aksi awal yang sudah dilakukan dengan target pengembangan berikutnya, supaya narasinya tetap jujur dan terukur.</p>
        </div>
        <div class="grid four">${impacts.map(impactCard).join("")}</div>
        <section class="card stack">
          <h2>Target 12 bulan</h2>
          <div class="timeline">
            ${timelineStep(1, "Validasi lapangan", "Melengkapi foto, titik lokasi, dan catatan wawancara awal dengan masyarakat/mitra.")}
            ${timelineStep(2, "Prototype BCN", "Menyusun SOP sederhana, uji bahan baku, dan rancangan formula bersama pendamping.")}
            ${timelineStep(3, "Demplot awal", "Menguji produk secara terbatas pada komoditas hortikultura lokal.")}
            ${timelineStep(4, "Replikasi", "Menyusun cerita dampak, modul edukasi, dan peluang kolaborasi BUMDes/komunitas.")}
          </div>
        </section>
      </section>
    `;
  }

  function renderEdukasi() {
    setPage("Edukasi Pesisir");
    app.innerHTML = `
      <section class="container stack">
        <div class="between">
          <div>
            <p class="eyebrow">Ruang belajar</p>
            <h2>Materi singkat Nipah Lestari</h2>
            <p class="muted">Konten dibuat pendek agar mudah dibaca calon mitra, mahasiswa, dan masyarakat umum.</p>
          </div>
          <button class="secondary-btn" data-ai="Buat ide konten edukasi Instagram untuk kampanye Jaga Nipah Jaga Pesisir.">Ide konten AI</button>
        </div>
        <div class="grid two">${articles.map(articleCard).join("")}</div>
      </section>
    `;
    bindArticleCards();
    bindAiButtons();
  }

  function renderKolaborasi() {
    setPage("Kolaborasi");
    app.innerHTML = `
      <section class="container stack">
        <div class="hero">
          <div>
            <p class="eyebrow">Ikut dukung aksi</p>
            <h2>Gerakan ini butuh banyak peran.</h2>
            <p>Prototype ini membuka ruang minat kolaborasi dari mahasiswa, komunitas, penyadap, petani, BUMDes, akademisi, dan pemerintah daerah.</p>
          </div>
          <div class="card stack">
            <h2>${state.supporters.length} dukungan tercatat</h2>
            <p class="muted">Data tersimpan lokal di browser untuk kebutuhan demo prototype.</p>
          </div>
        </div>

        <div class="grid two">
          <form id="supportForm" class="card form-grid">
            <h2>Form dukungan</h2>
            <label>Nama<input name="name" required placeholder="Nama lengkap"></label>
            <label>Asal/instansi<input name="origin" placeholder="Kampus, komunitas, desa, dinas..."></label>
            <label>Peran
              <select name="role">
                <option>Mahasiswa</option>
                <option>Petani</option>
                <option>Penyadap nipah</option>
                <option>BUMDes/Koperasi</option>
                <option>Akademisi</option>
                <option>Pemerintah daerah</option>
                <option>Umum</option>
              </select>
            </label>
            <label>Minat kolaborasi<textarea name="interest" placeholder="Contoh: edukasi, demplot, riset, dokumentasi, pendampingan..."></textarea></label>
            <button class="primary-btn" type="submit">Simpan dukungan</button>
          </form>

          <section class="card stack">
            <h2>Dukungan terbaru</h2>
            <div class="stack">${supportersMarkup()}</div>
          </section>
        </div>
      </section>
    `;
    $("#supportForm").addEventListener("submit", saveSupporter);
  }

  function renderTentang() {
    setPage("Tentang Aksi");
    app.innerHTML = `
      <section class="container stack">
        <div class="hero">
          <div>
            <p class="eyebrow">Muhammad Naufal</p>
            <h2>Nipah Lestari dikembangkan sebagai lanjutan aksi lapangan.</h2>
            <p>Project ini mengubah fondasi DeSkin menjadi website lingkungan yang lebih relevan dengan gagasan karya tulis: pemberdayaan masyarakat pesisir Aceh Singkil melalui hilirisasi nira nipah.</p>
          </div>
          <div class="card stack">
            <h2>Catatan teknis</h2>
            <p class="muted">Aplikasi dibuat sebagai static PWA sederhana: tanpa framework, data demo di localStorage, dan siap deploy di Vercel.</p>
          </div>
        </div>
        <section class="card stack">
          <h2>Narasi untuk naskah</h2>
          <p>Status aksi nyata penulis tidak berhenti pada observasi lapangan di kawasan nipah pesisir Aceh Singkil, tetapi ditingkatkan melalui pengembangan prototype website <strong>Nipah Lestari</strong>. Website ini menjadi media edukasi, dokumentasi, kampanye, dan kolaborasi digital untuk memperkenalkan potensi nipah, gagasan hilirisasi nira menjadi Biostimulan Cair Nipah, serta ajakan menjaga pesisir secara berkelanjutan.</p>
        </section>
      </section>
    `;
  }

  function statCard(value, label, text) {
    return `<article class="card stat"><span class="tag">${esc(label)}</span><strong>${esc(String(value))}</strong><small class="muted">${esc(text)}</small></article>`;
  }

  function featureCard(icon, title, text) {
    return `<article class="feature-card"><div class="feature-icon">${icon}</div><h3>${esc(title)}</h3><p class="muted">${esc(text)}</p></article>`;
  }

  function timelineStep(number, title, text) {
    return `<div class="timeline-step"><span>${number}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></div>`;
  }

  function impactCard(impact) {
    return `<article class="impact-card"><span class="tag">${esc(impact.title)}</span><h3>${esc(impact.value)}</h3><p class="muted">${esc(impact.text)}</p></article>`;
  }

  function articleCard(article, index) {
    return `<article class="article-card" data-article="${index}"><span class="tag">${esc(article.category)} · ${article.minutes} menit</span><h3>${esc(article.title)}</h3><p class="muted">${esc(article.body.slice(0, 130))}...</p></article>`;
  }

  function mapMarkup() {
    return `<div class="map-box"><div class="map-river"></div>${state.locations.map((locationPoint) => `
      <div class="map-pin" style="--x:${locationPoint.x};--y:${locationPoint.y}" title="${esc(locationPoint.name)}">
        <i></i><small>${esc(locationPoint.status)}</small>
      </div>
    `).join("")}</div>`;
  }

  function fieldNotesMarkup() {
    if (!state.fieldNotes.length) {
      return `<div class="panel"><strong>Belum ada catatan tambahan.</strong><p class="muted">Mulai dari observasi lokasi, kondisi nipah, akses, dan rencana tindak lanjut.</p></div>`;
    }

    return state.fieldNotes.map((fieldNote) => `
      <article class="note-card">
        <span class="tag">${esc(fieldNote.date)}</span>
        <h3>${esc(fieldNote.title)}</h3>
        <p class="muted">${esc(fieldNote.note)}</p>
      </article>
    `).join("");
  }

  function photosMarkup() {
    if (!state.photos.length) {
      return `<div class="panel"><strong>Belum ada foto.</strong><p class="muted">Tambahkan foto asli dari lokasi untuk dimasukkan ke dokumentasi karya tulis.</p></div>`;
    }

    return state.photos.map((photo) => `
      <article class="photo-card">
        <img src="${photo.src}" alt="${esc(photo.caption)}">
        <p>${esc(photo.caption)}</p>
      </article>
    `).join("");
  }

  function supportersMarkup() {
    if (!state.supporters.length) {
      return `<div class="panel"><strong>Belum ada dukungan.</strong><p class="muted">Gunakan form ini untuk demo ruang kolaborasi.</p></div>`;
    }

    return state.supporters.slice(0, 6).map((supporter) => `
      <article class="note-card">
        <span class="tag">${esc(supporter.role)}</span>
        <h3>${esc(supporter.name)}</h3>
        <p class="muted">${esc(supporter.origin || "Tanpa asal")} · ${esc(supporter.interest || "Belum mengisi minat")}</p>
      </article>
    `).join("");
  }

  function openFieldNoteModal() {
    openModal(`
      <h2>Tambah catatan lapangan</h2>
      <form id="fieldNoteForm" class="form-grid">
        <label>Judul catatan<input name="title" required placeholder="Contoh: Observasi kawasan nipah"></label>
        <label>Isi catatan<textarea name="note" required placeholder="Apa yang kamu lihat, masalah apa yang muncul, dan peluang tindak lanjutnya?"></textarea></label>
        <button class="primary-btn" type="submit">Simpan catatan</button>
      </form>
    `);

    $("#fieldNoteForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const fieldForm = new FormData(event.currentTarget);
      state.fieldNotes.unshift({
        title: String(fieldForm.get("title") || "Catatan lapangan"),
        note: String(fieldForm.get("note") || ""),
        date: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
      });
      saveState();
      closeModal();
      renderAksi();
      toast("Catatan lapangan tersimpan.");
    });
  }

  function savePhoto(event) {
    const imageFile = event.target.files?.[0];
    if (!imageFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      const caption = prompt("Caption foto:", "Dokumentasi observasi kawasan nipah") || "Dokumentasi observasi kawasan nipah";
      state.photos.unshift({ src: String(reader.result), caption });
      saveState();
      renderAksi();
      toast("Foto dokumentasi tersimpan.");
    };
    reader.readAsDataURL(imageFile);
  }

  function saveSupporter(event) {
    event.preventDefault();
    const supportForm = new FormData(event.currentTarget);
    state.supporters.unshift({
      name: String(supportForm.get("name") || "Pendukung"),
      origin: String(supportForm.get("origin") || ""),
      role: String(supportForm.get("role") || "Umum"),
      interest: String(supportForm.get("interest") || "")
    });
    saveState();
    renderKolaborasi();
    toast("Dukungan tersimpan di prototype.");
  }

  function bindArticleCards() {
    $$("[data-article]").forEach((articleNode) => {
      articleNode.addEventListener("click", () => {
        const article = articles[Number(articleNode.dataset.article)];
        openModal(`<span class="tag">${esc(article.category)}</span><h2>${esc(article.title)}</h2><p>${esc(article.body)}</p>`);
      });
    });
  }

  function bindAiButtons() {
    $$('[data-ai]').forEach((button) => {
      button.addEventListener("click", () => askAi(button.dataset.ai));
    });
  }

  async function askAi(promptText) {
    openModal(`<h2>Nipah Lestari AI</h2><p class="muted">Menyiapkan jawaban...</p>`);
    try {
      const aiResponse = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature: "Nipah Lestari", message: promptText })
      });
      const aiPayload = await aiResponse.json();
      if (!aiResponse.ok || !aiPayload.ok) throw new Error(aiPayload.error || "AI belum tersedia.");
      $(".modal-body").innerHTML = `<h2>Nipah Lestari AI</h2><p>${esc(aiPayload.answer).replace(/\n/g, "<br>")}</p>`;
    } catch (error) {
      $(".modal-body").innerHTML = `<h2>Nipah Lestari AI</h2><p class="muted">${esc(error.message || "AI sedang tidak tersedia.")}</p>`;
    }
  }

  function openModal(html) {
    closeModal();
    const modal = $("#modalTemplate").content.cloneNode(true);
    $(".modal-body", modal).innerHTML = html;
    $(".modal-close", modal).addEventListener("click", closeModal);
    document.body.appendChild(modal);
  }

  function closeModal() {
    $(".modal-backdrop")?.remove();
  }

  function toast(message) {
    toastBox.textContent = message;
    toastBox.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toastBox.classList.remove("show"), 2600);
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  }
})();
