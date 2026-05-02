(() => {
  "use strict";

  const APP_VERSION = "1.0.2";
  const STORE_KEY = "deskin_state_v1";
  const HW_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
  const HW_CHAR_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const app = $("#app");
  const pageTitle = $("#pageTitle");
  const navRoot = $("#mainNav");
  const toastEl = $("#toast");

  const navItems = [
    { path: "#/dashboard", label: "Dashboard", icon: "01" },
    { path: "#/daily", label: "SKINDaily", icon: "02" },
    { path: "#/map", label: "SKINMap", icon: "03" },
    { path: "#/market", label: "SKINMarket", icon: "04" },
    { path: "#/edu", label: "SKINEdu", icon: "05" },
    { path: "#/analyzer", label: "SKINAnalyzer", icon: "06" },
    { path: "#/analysis", label: "SKINAnalysis", icon: "07" },
    { path: "#/talk", label: "SKINTalk", icon: "08" },
    { path: "#/profile", label: "Profil", icon: "09" }
  ];

  const productSeed = [
    { id: "p1", name: "Gentle Low pH Cleanser", category: "Cleanser", price: 69000, type: ["oily", "sensitive", "combination"], issue: ["acne", "oil", "pores"], rating: 4.8, stock: 42, tags: ["low pH", "fragrance free"] },
    { id: "p2", name: "Barrier Repair Moisturizer", category: "Moisturizer", price: 89000, type: ["dry", "sensitive", "normal"], issue: ["dry", "irritation"], rating: 4.7, stock: 35, tags: ["ceramide", "lightweight"] },
    { id: "p3", name: "Daily Matte Sunscreen SPF 50", category: "Sunscreen", price: 79000, type: ["oily", "combination", "normal"], issue: ["uv", "oil"], rating: 4.6, stock: 58, tags: ["non greasy", "spf50"] },
    { id: "p4", name: "Niacinamide Sebum Serum", category: "Serum", price: 99000, type: ["oily", "combination"], issue: ["oil", "pores", "acne"], rating: 4.9, stock: 24, tags: ["niacinamide", "sebum control"] },
    { id: "p5", name: "Hydra Gel Toner", category: "Toner", price: 59000, type: ["dry", "normal", "sensitive"], issue: ["dry", "texture"], rating: 4.5, stock: 50, tags: ["hydrating", "alcohol free"] },
    { id: "p6", name: "BHA Clarifying Pads", category: "Treatment", price: 119000, type: ["oily", "combination"], issue: ["acne", "pores", "texture"], rating: 4.6, stock: 18, tags: ["bha", "use 2x weekly"] },
    { id: "p7", name: "Calming Centella Cream", category: "Moisturizer", price: 87000, type: ["sensitive", "normal", "dry"], issue: ["redness", "irritation"], rating: 4.8, stock: 28, tags: ["centella", "calming"] },
    { id: "p8", name: "Acne Spot Gel", category: "Treatment", price: 52000, type: ["oily", "combination", "normal"], issue: ["acne"], rating: 4.4, stock: 70, tags: ["spot care", "night"] }
  ];

  const articleSeed = [
    { id: "a1", category: "Dasar", minutes: 4, title: "Urutan skincare pagi untuk pemula", summary: "Mulai dari cleanser, moisturizer, sampai sunscreen tanpa membuat rutinitas terasa berat.", body: "Rutinitas pagi ideal tidak harus banyak tahap. Fokus pada pembersihan lembut, hidrasi, dan perlindungan UV. Untuk kulit berminyak, pilih tekstur gel. Untuk kulit kering, pilih moisturizer dengan humektan dan emolien." },
    { id: "a2", category: "Pria", minutes: 5, title: "Kenapa pria sering melewatkan skincare", summary: "Stigma maskulinitas, minim edukasi, dan produk yang terasa rumit bisa diatasi dengan rutinitas sederhana.", body: "Skincare bukan soal kosmetik, tetapi perawatan kesehatan kulit. Cukup mulai dengan face wash lembut, moisturizer, dan sunscreen. Kebiasaan ini membantu menjaga barrier kulit dan mengurangi risiko iritasi." },
    { id: "a3", category: "Masalah Kulit", minutes: 6, title: "Bedakan kulit berminyak dan kulit dehidrasi", summary: "Kulit dapat terlihat berminyak tetapi tetap kekurangan air. Analisis berkala membantu menentukan produk.", body: "Kulit berminyak berhubungan dengan produksi sebum, sedangkan dehidrasi berhubungan dengan kadar air. Bila wajah cepat berminyak tetapi terasa ketarik, gunakan hidrasi ringan dan hindari cleanser yang terlalu keras." },
    { id: "a4", category: "Keamanan", minutes: 7, title: "Cara membaca bahan aktif dengan aman", summary: "Kenali BHA, AHA, niacinamide, retinoid, dan kapan sebaiknya konsultasi dengan ahli.", body: "Bahan aktif membantu target masalah, tetapi perlu dikenalkan perlahan. Hindari menumpuk banyak aktif dalam satu waktu. Hentikan bila muncul rasa terbakar parah atau iritasi berkepanjangan." },
    { id: "a5", category: "Lifestyle", minutes: 3, title: "Stres, tidur, dan jerawat", summary: "Kebiasaan harian memengaruhi skin barrier, inflamasi, dan konsistensi rutinitas.", body: "Kurang tidur dan stres dapat memperparah inflamasi. Catat pola tidur, makanan, olahraga, dan flare-up pada SKINDaily untuk menemukan pemicu pribadi." },
    { id: "a6", category: "Hardware", minutes: 5, title: "Memakai DeSkin Assisted Detector", summary: "Bersihkan sensor, tempelkan pada area wajah, sinkronkan via Bluetooth, lalu simpan analisis.", body: "Gunakan alat pada kulit bersih dan kering. Lakukan pengukuran pada area pipi atau T-zone, tunggu pembacaan stabil, lalu kirim hasil ke SKINAnalysis." }
  ];

  const doctorSeed = [
    { id: "d1", name: "dr. Aditya Pratama", title: "Dermatologist", rating: 4.9, fee: 149000, focus: ["acne", "male grooming", "oily skin"], available: ["09:00", "13:00", "19:00"] },
    { id: "d2", name: "dr. Maya Putri", title: "Dermatologist", rating: 4.8, fee: 149000, focus: ["sensitive skin", "pregnancy safe", "barrier repair"], available: ["10:00", "15:00", "20:00"] },
    { id: "d3", name: "Nadia Lestari", title: "Skincare Consultant", rating: 4.7, fee: 79000, focus: ["routine review", "budget skincare", "student plan"], available: ["08:00", "16:00", "21:00"] }
  ];

  const locationSeed = [
    { id: "l1", name: "Klinik Kulit Sehat", type: "Klinik", distance: 1.2, open: "08:00-21:00", x: 20, y: 32 },
    { id: "l2", name: "Apotek Dermacare", type: "Apotek", distance: 2.7, open: "09:00-22:00", x: 62, y: 42 },
    { id: "l3", name: "DeSkin Campus Booth", type: "Booth", distance: 0.6, open: "10:00-17:00", x: 47, y: 73 },
    { id: "l4", name: "Beauty Clinic Partner", type: "Partner", distance: 4.1, open: "10:00-20:00", x: 76, y: 18 }
  ];

  const defaultRoutine = [
    { id: "r1", time: "Pagi", title: "Cleanser lembut", done: false },
    { id: "r2", time: "Pagi", title: "Moisturizer ringan", done: false },
    { id: "r3", time: "Pagi", title: "Sunscreen SPF 30+", done: false },
    { id: "r4", time: "Malam", title: "Cleanser", done: false },
    { id: "r5", time: "Malam", title: "Treatment sesuai rekomendasi", done: false },
    { id: "r6", time: "Malam", title: "Moisturizer", done: false }
  ];

  const defaultState = {
    version: APP_VERSION,
    authed: false,
    theme: "light",
    profile: {
      name: "Pengguna DeSkin",
      email: "demo@deskin.inc",
      gender: "Pria",
      age: 22,
      skinType: "oily",
      concerns: ["acne", "oil"],
      budget: "medium",
      plan: "Free"
    },
    analyses: [
      { id: uid(), date: daysAgo(6), moisture: 48, sebum: 72, texture: 56, acne: 61, sensitivity: 34, source: "Demo", notes: "T-zone berminyak, jerawat ringan." },
      { id: uid(), date: daysAgo(3), moisture: 52, sebum: 68, texture: 61, acne: 55, sensitivity: 31, source: "Demo", notes: "Mulai membaik setelah sunscreen rutin." },
      { id: uid(), date: daysAgo(0), moisture: 57, sebum: 64, texture: 66, acne: 49, sensitivity: 29, source: "Demo", notes: "Rekomendasi: cleanser low pH + niacinamide." }
    ],
    routine: defaultRoutine,
    routineHistory: {},
    cart: [],
    bookmarks: ["a1"],
    eduDone: ["a2"],
    forum: [
      { id: uid(), author: "Rafi", topic: "Jerawat muncul setelah begadang", body: "Ada yang punya rutinitas simpel untuk mahasiswa?", replies: ["Mulai dari cleanser, moisturizer, sunscreen dulu.", "Catat pola tidur di SKINDaily agar pemicunya jelas."] },
      { id: uid(), author: "DeSkin Care", topic: "Reminder sunscreen", body: "Gunakan 2 ruas jari untuk wajah dan leher saat pagi/siang.", replies: [] }
    ],
    messages: [
      { from: "consultant", text: "Halo, saya siap bantu review rutinitas kamu.", at: "09:00" },
      { from: "me", text: "Saya punya kulit berminyak dan jerawat di dagu.", at: "09:02" }
    ],
    appointments: [],
    connectedDevice: null
  };

  let state = loadState();
  let deferredInstallPrompt = null;
  let stream = null;

  init();

  function init() {
    document.documentElement.dataset.theme = state.theme || "light";
    renderNav();
    registerPwa();
    bindGlobalEvents();
    window.addEventListener("hashchange", renderRoute);
    if (!location.hash) location.hash = state.authed ? "#/dashboard" : "#/welcome";
    renderRoute();
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return structuredClone(defaultState);
      const parsed = JSON.parse(raw);
      return deepMerge(structuredClone(defaultState), parsed);
    } catch (error) {
      console.warn(error);
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    state.version = APP_VERSION;
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function deepMerge(target, source) {
    for (const key of Object.keys(source || {})) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  function bindGlobalEvents() {
    $("#menuBtn").addEventListener("click", () => document.body.classList.toggle("menu-open"));
    $("#themeBtn").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = state.theme;
      saveState();
      toast(`Tema ${state.theme === "dark" ? "gelap" : "terang"} aktif.`);
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      $("#installBtn").classList.remove("hidden");
    });
    $("#installBtn").addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      $("#installBtn").classList.add("hidden");
    });
  }

  function registerPwa() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }
  }

  function renderNav() {
    navRoot.innerHTML = navItems.map(item => `
      <a href="${item.path}" data-path="${item.path}"><span class="ico">${item.icon}</span><span>${item.label}</span></a>
    `).join("");
  }

  function renderRoute() {
    stopCamera();
    document.body.classList.remove("menu-open");
    const route = location.hash || "#/welcome";
    $$(".nav a").forEach(a => a.classList.toggle("active", a.dataset.path === route));

    if (!state.authed && !["#/welcome", "#/auth"].includes(route)) {
      location.hash = "#/welcome";
      return;
    }

    const routes = {
      "#/welcome": renderWelcome,
      "#/auth": renderAuth,
      "#/dashboard": renderDashboard,
      "#/daily": renderDaily,
      "#/map": renderMap,
      "#/market": renderMarket,
      "#/edu": renderEdu,
      "#/analyzer": renderAnalyzer,
      "#/analysis": renderAnalysis,
      "#/talk": renderTalk,
      "#/profile": renderProfile
    };
    (routes[route] || renderNotFound)();
    app.focus({ preventScroll: true });
  }

  function setTitle(title) { pageTitle.textContent = title; }

  function renderWelcome() {
    setTitle("Selamat datang");
    app.innerHTML = `
      <section class="container hero">
        <div>
          <p class="eyebrow">DeSkin Inc.</p>
          <h2>Software digital skin assistant.</h2>
          <p>Prototype ini merangkum fitur-fitur demo DeSkin: SKINDaily, SKINMap, SKINMarket, SKINEdu, SKINAnalyzer, SKINAnalysis, dan SKINTalk. Semua berjalan di browser dengan localStorage, camera API, geolocation API, dan Web Bluetooth fallback.</p>
          <div class="hero-actions">
            <a class="primary-btn" href="#/auth">Mulai sekarang</a>
            <button class="secondary-btn" type="button" id="demoLogin">Masuk demo cepat</button>
          </div>
        </div>
        <div class="device-card" aria-label="Ilustrasi DeSkin Assisted Detector">
          <div class="between"><strong>DeSkin Assisted Detector</strong><span class="pill">BLE Ready</span></div>
          <div class="device"><span class="device-dot"></span></div>
          <p>Analisis kelembapan, sebum, tekstur, sensitivitas, dan progres rutinitas.</p>
        </div>
      </section>
      <p class="footer-note">Versi ${APP_VERSION}. Data demo dapat direset dari halaman Profil.</p>
      <p>© 2026 Muhammad Naufal. All rights reserved.</p>
    `;
    $("#demoLogin").addEventListener("click", () => {
      state.authed = true;
      saveState();
      location.hash = "#/dashboard";
      toast("Masuk sebagai pengguna demo.");
    });
  }

  function renderAuth() {
    setTitle("Masuk / Daftar");
    app.innerHTML = `
      <section class="container auth-shell">
        <div class="card auth-card">
          <div class="auth-side">
            <p class="eyebrow">Personalized skincare</p>
            <h2>Bangun rutinitas kulit yang cocok dengan data kamu.</h2>
            <p>Daftar sekali, lalu semua preferensi dan progres tersimpan lokal di perangkat.</p>
          </div>
          <form id="authForm" class="auth-form form-grid">
            <h2>Buat profil DeSkin</h2>
            <label>Nama
              <input name="name" required value="${escapeHtml(state.profile.name)}" autocomplete="name" />
            </label>
            <label>Email
              <input name="email" type="email" required value="${escapeHtml(state.profile.email)}" autocomplete="email" />
            </label>
            <div class="grid two">
              <label>Usia
                <input name="age" type="number" min="13" max="80" value="${state.profile.age}" />
              </label>
              <label>Gender
                <select name="gender">
                  ${selectOptions(["Pria", "Wanita", "Lainnya"], state.profile.gender)}
                </select>
              </label>
            </div>
            <label>Tipe kulit
              <select name="skinType">
                ${selectOptions([["oily", "Berminyak"], ["dry", "Kering"], ["normal", "Normal"], ["combination", "Kombinasi"], ["sensitive", "Sensitif"]], state.profile.skinType)}
              </select>
            </label>
            <button class="primary-btn" type="submit">Simpan dan masuk</button>
            <button class="ghost-btn" type="button" id="quickDemo">Gunakan akun demo</button>
          </form>
        </div>
      </section>
    `;
    $("#authForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      state.profile = { ...state.profile, ...data, age: Number(data.age || 22) };
      state.authed = true;
      saveState();
      location.hash = "#/dashboard";
      toast("Profil tersimpan.");
    });
    $("#quickDemo").addEventListener("click", () => {
      state.authed = true;
      saveState();
      location.hash = "#/dashboard";
    });
  }

  function renderDashboard() {
    setTitle("Dashboard");
    const latest = getLatestAnalysis();
    const score = skinScore(latest);
    const doneToday = routineCompletion();
    const recs = recommendProducts().slice(0, 3);
    app.innerHTML = `
      <section class="container stack">
        <div class="hero">
          <div>
            <p class="eyebrow">Halo, ${escapeHtml(firstName(state.profile.name))}</p>
            <h2>Kulit kamu hari ini berada di skor ${score}/100.</h2>
            <p>${summaryFor(latest)} Gunakan analisis berkala, tracking rutinitas, dan rekomendasi produk agar progres tetap terukur.</p>
            <div class="hero-actions">
              <a class="primary-btn" href="#/analyzer">Mulai scan wajah</a>
              <a class="secondary-btn" href="#/daily">Cek rutinitas</a>
            </div>
          </div>
          <div class="card stack">
            <div class="between">
              <div><p class="eyebrow">Skin Health</p><h3 style="margin:0">Ringkasan terbaru</h3></div>
              <div class="progress-ring" style="--value:${score}"><strong>${score}</strong></div>
            </div>
            ${metricMeters(latest)}
          </div>
        </div>

        <div class="grid four">
          <div class="card stat"><span class="tag">Rutinitas hari ini</span><strong>${doneToday}%</strong><small>${doneToday >= 80 ? "Konsistensi bagus." : "Selesaikan rutinitas untuk hasil maksimal."}</small></div>
          <div class="card stat"><span class="tag">Analisis tersimpan</span><strong>${state.analyses.length}</strong><small>Data historis untuk progress tracking.</small></div>
          <div class="card stat"><span class="tag">Plan aktif</span><strong>${escapeHtml(state.profile.plan)}</strong><small>Upgrade untuk konsultasi dan fitur premium.</small></div>
          <div class="card stat"><span class="tag">Keranjang</span><strong>${state.cart.reduce((a, b) => a + b.qty, 0)}</strong><small>${formatIDR(cartTotal())} total estimasi.</small></div>
        </div>

        <div class="grid two">
          <section class="card stack">
            <div class="between"><div><p class="eyebrow">SKINDaily</p><h2>Agenda rutin</h2></div><a class="ghost-btn" href="#/daily">Kelola</a></div>
            <div class="list">${state.routine.slice(0,4).map(routineItem).join("")}</div>
          </section>
          <section class="card stack">
            <div class="between"><div><p class="eyebrow">SKINMarket</p><h2>Rekomendasi cepat</h2></div><a class="ghost-btn" href="#/market">Lihat market</a></div>
            <div class="grid three">${recs.map(productCard).join("")}</div>
          </section>
        </div>
      </section>
    `;
    bindProductButtons();
  }

  function renderDaily() {
    setTitle("SKINDaily");
    const todayKey = dateKey(new Date());
    const done = routineCompletion();
    app.innerHTML = `
      <section class="container stack">
        <div class="between">
          <div><p class="eyebrow">SKINDaily</p><h2>Progress rutinitas dan perubahan kulit</h2><p class="muted">Pantau konsistensi, catat pemicu, dan lihat perubahan skor dari waktu ke waktu.</p></div>
          <button class="primary-btn" id="saveRoutineDay" type="button">Simpan progres hari ini</button>
        </div>
        <div class="grid three">
          <div class="card stack">
            <p class="eyebrow">Completion</p>
            <div class="progress-ring" style="--value:${done}"><strong>${done}%</strong></div>
            <p class="muted">Target minimal 80% untuk membangun kebiasaan.</p>
          </div>
          <div class="card stack">
            <p class="eyebrow">Reminder</p>
            <label>Jam rutinitas pagi<input id="morningReminder" type="time" value="07:00" /></label>
            <label>Jam rutinitas malam<input id="nightReminder" type="time" value="21:00" /></label>
            <button class="secondary-btn" id="enableReminder" type="button">Aktifkan notifikasi</button>
          </div>
          <div class="card stack">
            <p class="eyebrow">Catatan harian</p>
            <textarea id="dailyNote" placeholder="Contoh: begadang, olahraga, makanan pedas, breakout..."></textarea>
            <button class="secondary-btn" id="addNote" type="button">Tambah catatan</button>
          </div>
        </div>

        <div class="grid two">
          <section class="card stack">
            <div class="between"><h2>Checklist hari ini</h2><button id="addRoutine" class="ghost-btn" type="button">Tambah step</button></div>
            <div id="routineList" class="list">${state.routine.map(routineItem).join("")}</div>
          </section>
          <section class="card stack">
            <div class="between"><h2>Grafik progress</h2><span class="tag">${todayKey}</span></div>
            <div class="chart-wrap"><canvas id="progressChart" class="chart" height="260"></canvas></div>
            <div id="notesList" class="list">${dailyNotesHtml()}</div>
          </section>
        </div>
      </section>
    `;
    bindRoutine();
    drawProgressChart($("#progressChart"));
  }

  function renderMap() {
    setTitle("SKINMap");
    app.innerHTML = `
      <section class="container stack">
        <div class="between">
          <div><p class="eyebrow">SKINMap</p><h2>Peta klinik, booth, dan apotek partner</h2><p class="muted">Gunakan lokasi perangkat untuk mencari partner terdekat. Jika izin lokasi ditolak, aplikasi memakai data demo.</p></div>
          <button class="primary-btn" id="locateMe" type="button">Gunakan lokasi saya</button>
        </div>
        <div class="grid two">
          <div class="card stack">
            <div class="row">
              <input id="mapSearch" placeholder="Cari klinik, apotek, booth..." />
              <select id="mapType"><option value="all">Semua</option><option>Klinik</option><option>Apotek</option><option>Booth</option><option>Partner</option></select>
            </div>
            <div id="locationList" class="list"></div>
          </div>
          <div class="map-visual" id="mapVisual" aria-label="Peta demo lokasi DeSkin"></div>
        </div>
      </section>
    `;
    bindMap();
  }

  function renderMarket() {
    setTitle("SKINMarket");
    const recCount = recommendProducts().length;
    app.innerHTML = `
      <section class="container stack">
        <div class="between">
          <div><p class="eyebrow">SKINMarket</p><h2>Produk yang cocok dengan analisis kulit</h2><p class="muted">Filter produk berdasarkan tipe kulit, masalah, dan budget. Keranjang checkout masih mode demo.</p></div>
          <button class="primary-btn" id="openCart" type="button">Keranjang (${state.cart.reduce((a, b) => a + b.qty, 0)})</button>
        </div>
        <div class="card row">
          <input id="productSearch" placeholder="Cari cleanser, sunscreen, serum..." />
          <select id="productIssue">
            <option value="all">Semua masalah</option><option value="acne">Acne</option><option value="oil">Oil</option><option value="dry">Dry</option><option value="pores">Pores</option><option value="redness">Redness</option>
          </select>
          <select id="productType">
            <option value="all">Semua tipe kulit</option><option value="oily">Berminyak</option><option value="dry">Kering</option><option value="normal">Normal</option><option value="combination">Kombinasi</option><option value="sensitive">Sensitif</option>
          </select>
          <span class="tag">${recCount} cocok untuk profil kamu</span>
        </div>
        <div id="productGrid" class="grid four"></div>
      </section>
    `;
    bindMarket();
  }

  function renderEdu() {
    setTitle("SKINEdu");
    app.innerHTML = `
      <section class="container stack">
        <div class="between">
          <div><p class="eyebrow">SKINEdu</p><h2>Edukasi berbasis sains yang mudah dipahami</h2><p class="muted">Baca modul, simpan favorit, dan selesaikan quiz singkat untuk meningkatkan awareness.</p></div>
          <button class="primary-btn" id="startQuiz" type="button">Mulai quiz</button>
        </div>
        <div class="tabs" id="eduTabs">
          ${["Semua", "Dasar", "Pria", "Masalah Kulit", "Keamanan", "Lifestyle", "Hardware"].map((c, i) => `<button class="tab-btn ${i === 0 ? "active" : ""}" data-cat="${c}" type="button">${c}</button>`).join("")}
        </div>
        <div id="articleGrid" class="grid three"></div>
      </section>
    `;
    bindEdu();
  }

  function renderAnalyzer() {
    setTitle("SKINAnalyzer");
    app.innerHTML = `
      <section class="container stack">
        <div class="between">
          <div><p class="eyebrow">SKINAnalyzer</p><h2>Ambil data wajah atau masukkan hasil detector</h2><p class="muted">Mode demo memakai input manual dan foto lokal. Tidak ada gambar yang diunggah ke server.</p></div>
          <button class="secondary-btn" id="connectDevice" type="button">Hubungkan detector</button>
        </div>
        <div class="grid two">
          <section class="card stack">
            <div class="camera-box" id="cameraBox">
              <div class="stack" style="text-align:center;padding:22px">
                <h3>Preview kamera</h3>
                <p class="muted">Izinkan kamera untuk capture wajah, atau upload foto.</p>
              </div>
              <span class="capture-overlay"></span>
            </div>
            <div class="row">
              <button class="primary-btn" id="startCamera" type="button">Buka kamera</button>
              <button class="secondary-btn" id="capturePhoto" type="button">Capture</button>
              <label class="ghost-btn" style="cursor:pointer">Upload foto<input id="photoUpload" type="file" accept="image/*" hidden /></label>
            </div>
          </section>
          <form id="analysisForm" class="card form-grid">
            <h2>Input analisis cepat</h2>
            <div class="grid two">
              <label>Kelembapan<input name="moisture" type="range" min="0" max="100" value="55" /></label>
              <label>Sebum<input name="sebum" type="range" min="0" max="100" value="65" /></label>
              <label>Tekstur<input name="texture" type="range" min="0" max="100" value="60" /></label>
              <label>Acne risk<input name="acne" type="range" min="0" max="100" value="48" /></label>
              <label>Sensitivitas<input name="sensitivity" type="range" min="0" max="100" value="30" /></label>
              <label>Sumber data<select name="source"><option>Camera Demo</option><option>Manual</option><option>DeSkin Assisted Detector</option></select></label>
            </div>
            <label>Catatan<textarea name="notes" placeholder="Contoh: area T-zone berminyak, jerawat aktif di dagu..."></textarea></label>
            <button class="primary-btn" type="submit">Simpan ke SKINAnalysis</button>
            <p class="muted"></p>
          </form>
        </div>
      </section>
    `;
    bindAnalyzer();
  }

  function renderAnalysis() {
    setTitle("SKINAnalysis");
    const latest = getLatestAnalysis();
    const score = skinScore(latest);
    app.innerHTML = `
      <section class="container stack">
        <div class="between">
          <div><p class="eyebrow">SKINAnalysis</p><h2>Hasil analisis dan rekomendasi personal</h2><p class="muted">Fitur ini terhubung ke hardware dalam rancangan produk. Versi web menyediakan Web Bluetooth dan simulasi data.</p></div>
          <div class="row"><button class="secondary-btn" id="simulateHardware" type="button">Simulasikan hardware</button><a class="primary-btn" href="#/analyzer">Scan baru</a></div>
        </div>
        <div class="grid three">
          <div class="card stack"><p class="eyebrow">Skin score</p><div class="progress-ring" style="--value:${score}"><strong>${score}</strong></div><p class="muted">${summaryFor(latest)}</p></div>
          <div class="card stack"><p class="eyebrow">Device</p><h2>${state.connectedDevice ? escapeHtml(state.connectedDevice.name) : "Belum terhubung"}</h2><p class="muted">Service UUID: <span class="kbd">${HW_SERVICE_UUID.slice(0, 8)}</span></p></div>
          <div class="card stack"><p class="eyebrow">Analisis terakhir</p><h2>${formatDate(latest.date)}</h2><p class="muted">Sumber: ${escapeHtml(latest.source)}. ${escapeHtml(latest.notes || "Tidak ada catatan.")}</p></div>
        </div>
        <div class="grid two">
          <section class="card stack">
            <h2>Parameter kulit</h2>
            ${metricMeters(latest)}
            <div class="chart-wrap"><canvas id="analysisChart" class="chart" height="260"></canvas></div>
          </section>
          <section class="card stack">
            <h2>Rekomendasi rutinitas</h2>
            ${routineRecommendation(latest)}
            <hr />
            <h3>Produk prioritas</h3>
            <div class="grid two">${recommendProducts().slice(0,4).map(productCard).join("")}</div>
          </section>
        </div>
        <section class="card stack">
          <div class="between"><h2>Riwayat analisis</h2><button id="clearAnalysis" class="danger-btn" type="button">Hapus riwayat</button></div>
          <div class="list">${state.analyses.slice().reverse().map(analysisRow).join("")}</div>
        </section>
      </section>
    `;
    drawAnalysisChart($("#analysisChart"));
    bindAnalysis();
    bindProductButtons();
  }

  function renderTalk() {
    setTitle("SKINTalk");
    app.innerHTML = `
      <section class="container stack">
        <div class="between">
          <div><p class="eyebrow">SKINTalk</p><h2>Konsultasi ahli dan forum komunitas</h2><p class="muted">Booking konsultasi, chat demo, dan forum tanya jawab pengguna.</p></div>
          <button class="primary-btn" id="newTopic" type="button">Buat topik forum</button>
        </div>
        <div class="grid three">
          ${doctorSeed.map(doctorCard).join("")}
        </div>
        <div class="grid two">
          <section class="card stack">
            <div class="between"><h2>Chat konsultasi</h2><span class="pill success">Online</span></div>
            <div id="chatBox" class="chat-box">${state.messages.map(messageHtml).join("")}</div>
            <form id="chatForm" class="row"><input name="text" placeholder="Tulis pesan..." required /><button class="primary-btn" type="submit">Kirim</button></form>
          </section>
          <section class="card stack">
            <h2>Forum diskusi</h2>
            <div id="forumList" class="list">${state.forum.map(forumItem).join("")}</div>
          </section>
        </div>
        <section class="card stack">
          <h2>Jadwal konsultasi</h2>
          <div class="list">${state.appointments.length ? state.appointments.map(appointmentRow).join("") : `<p class="muted">Belum ada jadwal. Pilih dokter untuk booking.</p>`}</div>
        </section>
      </section>
    `;
    bindTalk();
  }

  function renderProfile() {
    setTitle("Profil");
    app.innerHTML = `
      <section class="container stack">
        <div><p class="eyebrow">Profil dan pengaturan</p><h2>Preferensi pengguna</h2><p class="muted">Data ini dipakai untuk rekomendasi SKINMarket, SKINAnalysis, dan rutinitas.</p></div>
        <div class="grid two">
          <form id="profileForm" class="card form-grid">
            <h2>Data pribadi</h2>
            <label>Nama<input name="name" value="${escapeHtml(state.profile.name)}" required /></label>
            <label>Email<input name="email" type="email" value="${escapeHtml(state.profile.email)}" required /></label>
            <div class="grid two">
              <label>Usia<input name="age" type="number" value="${state.profile.age}" /></label>
              <label>Gender<select name="gender">${selectOptions(["Pria", "Wanita", "Lainnya"], state.profile.gender)}</select></label>
            </div>
            <label>Tipe kulit<select name="skinType">${selectOptions([["oily", "Berminyak"], ["dry", "Kering"], ["normal", "Normal"], ["combination", "Kombinasi"], ["sensitive", "Sensitif"]], state.profile.skinType)}</select></label>
            <label>Budget<select name="budget">${selectOptions([["low", "Hemat"], ["medium", "Menengah"], ["high", "Premium"]], state.profile.budget)}</select></label>
            <fieldset class="card" style="box-shadow:none">
              <legend>Masalah kulit</legend>
              <div class="grid two">
                ${["acne", "oil", "dry", "pores", "redness", "texture", "uv"].map(issue => `<label class="checkbox"><input type="checkbox" name="concerns" value="${issue}" ${state.profile.concerns.includes(issue) ? "checked" : ""}/> ${issue}</label>`).join("")}
              </div>
            </fieldset>
            <button class="primary-btn" type="submit">Simpan profil</button>
          </form>
          <section class="stack">
            <div class="card stack">
              <h2>Langganan</h2>
              <div class="grid two">
                ${planCard("Free", 0, "Basic scan, edukasi, tracking lokal", state.profile.plan === "Free")}
                ${planCard("Premium", 59000, "Konsultasi prioritas, reminder, insight lebih detail", state.profile.plan === "Premium")}
              </div>
            </div>
            <div class="card stack">
              <h2>Data aplikasi</h2>
              <p class="muted">Export data untuk debugging atau hapus seluruh data demo.</p>
              <div class="row"><button id="exportData" class="secondary-btn" type="button">Export JSON</button><button id="resetData" class="danger-btn" type="button">Reset demo</button><button id="logout" class="ghost-btn" type="button">Keluar</button></div>
            </div>
          </section>
        </div>
      </section>
    `;
    bindProfile();
  }

  function renderNotFound() {
    setTitle("Tidak ditemukan");
    app.innerHTML = `<section class="container card"><h2>Halaman tidak ditemukan</h2><p class="muted">Kembali ke dashboard.</p><a class="primary-btn" href="#/dashboard">Dashboard</a></section>`;
  }

  function bindRoutine() {
    $("#routineList").addEventListener("change", (event) => {
      if (!event.target.matches("input[type='checkbox']")) return;
      const id = event.target.value;
      state.routine = state.routine.map(item => item.id === id ? { ...item, done: event.target.checked } : item);
      saveState();
      renderDaily();
    });
    $("#addRoutine").addEventListener("click", () => {
      modal(`
        <h2 id="modalTitle">Tambah step rutinitas</h2>
        <form id="addRoutineForm" class="form-grid">
          <label>Waktu<select name="time"><option>Pagi</option><option>Siang</option><option>Malam</option></select></label>
          <label>Nama step<input name="title" placeholder="Contoh: Reapply sunscreen" required /></label>
          <button class="primary-btn" type="submit">Tambah</button>
        </form>
      `);
      $("#addRoutineForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        state.routine.push({ id: uid(), time: data.time, title: data.title, done: false });
        saveState();
        closeModal();
        renderDaily();
        toast("Step rutinitas ditambahkan.");
      });
    });
    $("#saveRoutineDay").addEventListener("click", () => {
      const key = dateKey(new Date());
      state.routineHistory[key] = { completion: routineCompletion(), routine: state.routine, savedAt: new Date().toISOString() };
      state.routine = state.routine.map(item => ({ ...item, done: false }));
      saveState();
      renderDaily();
      toast("Progress hari ini tersimpan dan checklist direset.");
    });
    $("#enableReminder").addEventListener("click", async () => {
      if (!("Notification" in window)) return toast("Browser belum mendukung notifikasi.");
      const permission = await Notification.requestPermission();
      toast(permission === "granted" ? "Notifikasi diizinkan. Jadwal demo tersimpan." : "Notifikasi belum diizinkan.");
    });
    $("#addNote").addEventListener("click", () => {
      const note = $("#dailyNote").value.trim();
      if (!note) return toast("Catatan masih kosong.");
      const key = dateKey(new Date());
      const current = state.routineHistory[key] || { completion: routineCompletion(), notes: [] };
      current.notes = [...(current.notes || []), { id: uid(), text: note, at: new Date().toISOString() }];
      state.routineHistory[key] = current;
      saveState();
      renderDaily();
      toast("Catatan ditambahkan.");
    });
  }

  function bindMap() {
    const render = () => {
      const search = $("#mapSearch").value.toLowerCase();
      const type = $("#mapType").value;
      const locations = locationSeed.filter(loc => (type === "all" || loc.type === type) && loc.name.toLowerCase().includes(search));
      $("#locationList").innerHTML = locations.map(loc => `
        <article class="map-card">
          <div class="between"><h3>${escapeHtml(loc.name)}</h3><span class="pill">${loc.distance} km</span></div>
          <p class="muted">${loc.type} partner. Buka ${loc.open}.</p>
          <button class="secondary-btn" data-route="${loc.id}" type="button">Buat rute demo</button>
        </article>
      `).join("") || `<p class="muted">Lokasi tidak ditemukan.</p>`;
      const map = $("#mapVisual");
      map.innerHTML = `<span class="pin user" style="left:50%;top:55%"><span>U</span></span>` + locations.map((loc, i) => `<span class="pin" style="left:${loc.x}%;top:${loc.y}%"><span>${i + 1}</span></span>`).join("");
    };
    $("#mapSearch").addEventListener("input", render);
    $("#mapType").addEventListener("change", render);
    $("#locationList").addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-route]");
      if (btn) toast("Rute demo dibuat. Integrasikan Google Maps/Mapbox untuk produksi.");
    });
    $("#locateMe").addEventListener("click", () => {
      if (!navigator.geolocation) return toast("Geolocation tidak tersedia di browser ini.");
      navigator.geolocation.getCurrentPosition(
        (pos) => toast(`Lokasi terdeteksi: ${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}.`),
        () => toast("Izin lokasi ditolak. Menggunakan data demo.")
      );
    });
    render();
  }

  function bindMarket() {
    const render = () => {
      const search = $("#productSearch").value.toLowerCase();
      const issue = $("#productIssue").value;
      const type = $("#productType").value;
      const products = productSeed.filter(p => {
        const okSearch = p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search);
        const okIssue = issue === "all" || p.issue.includes(issue);
        const okType = type === "all" || p.type.includes(type);
        return okSearch && okIssue && okType;
      }).sort((a, b) => productScore(b) - productScore(a));
      $("#productGrid").innerHTML = products.map(productCard).join("") || `<p class="muted">Produk tidak ditemukan.</p>`;
      bindProductButtons();
    };
    $("#productSearch").addEventListener("input", render);
    $("#productIssue").addEventListener("change", render);
    $("#productType").addEventListener("change", render);
    $("#openCart").addEventListener("click", showCart);
    render();
  }

  function bindProductButtons() {
    $$("[data-add-product]").forEach(btn => {
      btn.addEventListener("click", () => addToCart(btn.dataset.addProduct));
    });
  }

  function addToCart(id) {
    const item = state.cart.find(c => c.id === id);
    if (item) item.qty += 1;
    else state.cart.push({ id, qty: 1 });
    saveState();
    toast("Produk masuk keranjang.");
  }

  function showCart() {
    const rows = state.cart.map(item => {
      const product = productSeed.find(p => p.id === item.id);
      if (!product) return "";
      return `<div class="list-item"><div class="avatar">${product.category[0]}</div><div><strong>${product.name}</strong><p class="muted">${item.qty} x ${formatIDR(product.price)}</p></div><strong>${formatIDR(product.price * item.qty)}</strong></div>`;
    }).join("") || `<p class="muted">Keranjang masih kosong.</p>`;
    modal(`
      <h2 id="modalTitle">Keranjang SKINMarket</h2>
      <div class="list">${rows}</div>
      <hr />
      <div class="between"><strong>Total</strong><strong class="price">${formatIDR(cartTotal())}</strong></div>
      <div class="row" style="margin-top:16px"><button id="checkout" class="primary-btn" type="button">Checkout demo</button><button id="clearCart" class="danger-btn" type="button">Kosongkan</button></div>
    `);
    $("#checkout").addEventListener("click", () => {
      closeModal();
      toast("Checkout demo selesai. Sambungkan payment gateway untuk produksi.");
    });
    $("#clearCart").addEventListener("click", () => {
      state.cart = [];
      saveState();
      closeModal();
      renderMarket();
      toast("Keranjang dikosongkan.");
    });
  }

  function bindEdu() {
    const render = (cat = "Semua") => {
      const articles = cat === "Semua" ? articleSeed : articleSeed.filter(a => a.category === cat);
      $("#articleGrid").innerHTML = articles.map(articleCard).join("");
      $$('[data-read-article]').forEach(btn => btn.addEventListener("click", () => readArticle(btn.dataset.readArticle)));
      $$('[data-bookmark]').forEach(btn => btn.addEventListener("click", () => toggleBookmark(btn.dataset.bookmark)));
    };
    $("#eduTabs").addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-cat]");
      if (!btn) return;
      $$("#eduTabs .tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      render(btn.dataset.cat);
    });
    $("#startQuiz").addEventListener("click", showQuiz);
    render();
  }

  function readArticle(id) {
    const article = articleSeed.find(a => a.id === id);
    if (!article) return;
    modal(`
      <p class="eyebrow">${article.category} - ${article.minutes} menit</p>
      <h2 id="modalTitle">${escapeHtml(article.title)}</h2>
      <p class="muted">${escapeHtml(article.summary)}</p>
      <p>${escapeHtml(article.body)}</p>
      <button id="finishArticle" class="primary-btn" type="button">Tandai selesai</button>
    `);
    $("#finishArticle").addEventListener("click", () => {
      if (!state.eduDone.includes(id)) state.eduDone.push(id);
      saveState();
      closeModal();
      renderEdu();
      toast("Modul ditandai selesai.");
    });
  }

  function toggleBookmark(id) {
    state.bookmarks = state.bookmarks.includes(id) ? state.bookmarks.filter(x => x !== id) : [...state.bookmarks, id];
    saveState();
    renderEdu();
  }

  function showQuiz() {
    modal(`
      <h2 id="modalTitle">Quiz SKINEdu</h2>
      <form id="quizForm" class="form-grid">
        <label>1. Tahap wajib untuk pagi hari?<select name="q1"><option>Serum mahal</option><option>Sunscreen</option><option>Scrub keras</option></select></label>
        <label>2. Jika kulit terasa terbakar setelah produk aktif?<select name="q2"><option>Lanjutkan lebih sering</option><option>Hentikan dan evaluasi</option><option>Campur semua aktif</option></select></label>
        <label>3. Data SKINDaily berguna untuk?<select name="q3"><option>Melacak pemicu dan progres</option><option>Menghapus konsultasi</option><option>Mengganti tidur</option></select></label>
        <button class="primary-btn" type="submit">Lihat skor</button>
      </form>
    `);
    $("#quizForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      let score = 0;
      if (data.q1 === "Sunscreen") score += 1;
      if (data.q2 === "Hentikan dan evaluasi") score += 1;
      if (data.q3 === "Melacak pemicu dan progres") score += 1;
      closeModal();
      toast(`Skor quiz: ${score}/3. ${score === 3 ? "Mantap!" : "Baca modul dasar lagi, ya."}`);
    });
  }

  function bindAnalyzer() {
    $("#startCamera").addEventListener("click", startCamera);
    $("#capturePhoto").addEventListener("click", capturePhoto);
    $("#photoUpload").addEventListener("change", previewUpload);
    $("#connectDevice").addEventListener("click", connectDevice);
    $$('input[type="range"]').forEach(input => {
      input.insertAdjacentHTML("afterend", `<span class="tag" data-range-value="${input.name}">${input.value}</span>`);
      input.addEventListener("input", () => $(`[data-range-value="${input.name}"]`).textContent = input.value);
    });
    $("#analysisForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const analysis = {
        id: uid(),
        date: new Date().toISOString(),
        moisture: Number(data.moisture),
        sebum: Number(data.sebum),
        texture: Number(data.texture),
        acne: Number(data.acne),
        sensitivity: Number(data.sensitivity),
        source: data.source,
        notes: data.notes || generatedNotes(data)
      };
      state.analyses.push(analysis);
      saveState();
      toast("Analisis baru tersimpan.");
      location.hash = "#/analysis";
    });
  }

  async function startCamera() {
    try {
      stopCamera();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      $("#cameraBox").innerHTML = `<video id="videoPreview" autoplay playsinline muted></video><span class="capture-overlay"></span>`;
      $("#videoPreview").srcObject = stream;
    } catch (error) {
      toast("Kamera tidak dapat dibuka. Gunakan upload foto atau input manual.");
    }
  }

  function capturePhoto() {
    const video = $("#videoPreview");
    if (!video) return toast("Buka kamera dulu atau upload foto.");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.src = canvas.toDataURL("image/jpeg", .78);
    img.onload = () => {
      $("#cameraBox").innerHTML = `<img src="${img.src}" alt="Foto wajah hasil capture" /><span class="capture-overlay"></span>`;
      stopCamera();
      fillDemoAnalysisFromImage();
      toast("Foto dicapture. Nilai demo otomatis disesuaikan.");
    };
  }

  function previewUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    $("#cameraBox").innerHTML = `<img src="${url}" alt="Foto yang diupload" /><span class="capture-overlay"></span>`;
    fillDemoAnalysisFromImage();
    toast("Foto lokal dimuat. Tidak ada upload ke server.");
  }

  function fillDemoAnalysisFromImage() {
    const latest = getLatestAnalysis();
    const values = {
      moisture: clamp(latest.moisture + rand(-5, 8), 0, 100),
      sebum: clamp(latest.sebum + rand(-8, 6), 0, 100),
      texture: clamp(latest.texture + rand(-4, 9), 0, 100),
      acne: clamp(latest.acne + rand(-10, 5), 0, 100),
      sensitivity: clamp(latest.sensitivity + rand(-6, 6), 0, 100)
    };
    Object.entries(values).forEach(([name, value]) => {
      const input = $(`[name="${name}"]`);
      if (input) {
        input.value = value;
        const label = $(`[data-range-value="${name}"]`);
        if (label) label.textContent = value;
      }
    });
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  async function connectDevice() {
    if (!navigator.bluetooth) {
      simulateDevice("Browser belum mendukung Web Bluetooth. Mode simulasi diaktifkan.");
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: "DeSkin" }], optionalServices: [HW_SERVICE_UUID] });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(HW_SERVICE_UUID);
      await service.getCharacteristic(HW_CHAR_UUID);
      state.connectedDevice = { name: device.name || "DeSkin Assisted Detector", connectedAt: new Date().toISOString() };
      saveState();
      toast("Detector terhubung. Karakteristik siap dibaca.");
    } catch (error) {
      simulateDevice("Gagal terhubung ke hardware. Mode simulasi diaktifkan.");
    }
  }

  function simulateDevice(message) {
    state.connectedDevice = { name: "DeSkin Assisted Detector (Simulated)", connectedAt: new Date().toISOString() };
    saveState();
    toast(message || "Hardware disimulasikan.");
  }

  function bindAnalysis() {
    $("#simulateHardware").addEventListener("click", () => {
      simulateDevice("Pembacaan hardware demo berhasil.");
      state.analyses.push({
        id: uid(), date: new Date().toISOString(), moisture: rand(48, 70), sebum: rand(42, 76), texture: rand(54, 76), acne: rand(25, 62), sensitivity: rand(18, 45), source: "DeSkin Assisted Detector", notes: "Data simulasi dari detector: sensor moisture, sebum, dan health index."
      });
      saveState();
      renderAnalysis();
    });
    $("#clearAnalysis").addEventListener("click", () => {
      if (!confirm("Hapus semua riwayat analisis?")) return;
      state.analyses = [];
      saveState();
      renderAnalysis();
      toast("Riwayat analisis dihapus.");
    });
  }

  function bindTalk() {
    $$('[data-book-doctor]').forEach(btn => btn.addEventListener("click", () => showBooking(btn.dataset.bookDoctor)));
    $("#chatForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const text = new FormData(event.currentTarget).get("text").trim();
      if (!text) return;
      state.messages.push({ from: "me", text, at: timeNow() });
      setTimeout(() => {
        state.messages.push({ from: "consultant", text: "Terima kasih. Saya sarankan cek SKINAnalysis terbaru dan gunakan rutinitas basic dulu selama 2 minggu.", at: timeNow() });
        saveState();
        renderTalk();
      }, 250);
      saveState();
      renderTalk();
    });
    $("#newTopic").addEventListener("click", () => {
      modal(`
        <h2 id="modalTitle">Buat topik forum</h2>
        <form id="topicForm" class="form-grid">
          <label>Judul<input name="topic" required /></label>
          <label>Isi<textarea name="body" required></textarea></label>
          <button class="primary-btn" type="submit">Publikasikan</button>
        </form>
      `);
      $("#topicForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        state.forum.unshift({ id: uid(), author: firstName(state.profile.name), topic: data.topic, body: data.body, replies: [] });
        saveState();
        closeModal();
        renderTalk();
        toast("Topik forum dipublikasikan.");
      });
    });
    $("#forumList").addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-reply]");
      if (!btn) return;
      const topic = state.forum.find(f => f.id === btn.dataset.reply);
      const reply = prompt("Tulis balasan:");
      if (!topic || !reply) return;
      topic.replies.push(reply);
      saveState();
      renderTalk();
    });
    const chat = $("#chatBox");
    if (chat) chat.scrollTop = chat.scrollHeight;
  }

  function showBooking(id) {
    const doctor = doctorSeed.find(d => d.id === id);
    if (!doctor) return;
    modal(`
      <h2 id="modalTitle">Booking ${escapeHtml(doctor.name)}</h2>
      <form id="bookingForm" class="form-grid">
        <label>Tanggal<input name="date" type="date" min="${dateKey(new Date())}" value="${dateKey(new Date(Date.now() + 86400000))}" required /></label>
        <label>Jam<select name="time">${doctor.available.map(t => `<option>${t}</option>`).join("")}</select></label>
        <label>Keluhan singkat<textarea name="note" placeholder="Contoh: acne aktif di pipi, kulit sensitif..." required></textarea></label>
        <button class="primary-btn" type="submit">Konfirmasi booking ${formatIDR(doctor.fee)}</button>
      </form>
    `);
    $("#bookingForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      state.appointments.push({ id: uid(), doctor: doctor.name, title: doctor.title, date: data.date, time: data.time, note: data.note, fee: doctor.fee, status: "Menunggu pembayaran" });
      saveState();
      closeModal();
      renderTalk();
      toast("Booking demo dibuat.");
    });
  }

  function bindProfile() {
    $("#profileForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const concerns = [...new FormData(form).getAll("concerns")];
      state.profile = { ...state.profile, ...data, concerns, age: Number(data.age || state.profile.age) };
      saveState();
      toast("Profil diperbarui.");
    });
    $$('[data-plan]').forEach(btn => btn.addEventListener("click", () => {
      state.profile.plan = btn.dataset.plan;
      saveState();
      renderProfile();
      toast(`Plan ${state.profile.plan} aktif.`);
    }));
    $("#exportData").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `deskin-data-${dateKey(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    $("#resetData").addEventListener("click", () => {
      if (!confirm("Reset seluruh data demo?")) return;
      localStorage.removeItem(STORE_KEY);
      state = structuredClone(defaultState);
      state.authed = true;
      saveState();
      renderProfile();
      toast("Data demo direset.");
    });
    $("#logout").addEventListener("click", () => {
      state.authed = false;
      saveState();
      location.hash = "#/welcome";
    });
  }

  function routineItem(item) {
    return `<label class="checkbox"><input type="checkbox" value="${item.id}" ${item.done ? "checked" : ""}/> <span><strong>${escapeHtml(item.time)}</strong> - ${escapeHtml(item.title)}</span></label>`;
  }

  function productCard(product) {
    const match = productScore(product);
    return `
      <article class="product-card">
        <div class="product-img">${product.category.slice(0,2).toUpperCase()}</div>
        <div><h3>${escapeHtml(product.name)}</h3><p class="muted">${product.category} - Rating ${product.rating}</p></div>
        <div class="row">${product.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
        <div class="between"><span class="price">${formatIDR(product.price)}</span><span class="pill ${match > 4 ? "success" : ""}">${match} match</span></div>
        <button class="primary-btn" data-add-product="${product.id}" type="button">Tambah</button>
      </article>
    `;
  }

  function articleCard(article) {
    const done = state.eduDone.includes(article.id);
    const marked = state.bookmarks.includes(article.id);
    return `
      <article class="article-card">
        <div class="article-img">${article.category.slice(0,2).toUpperCase()}</div>
        <div class="between"><span class="tag">${article.category}</span><span class="tag">${article.minutes} menit</span></div>
        <h3>${escapeHtml(article.title)}</h3>
        <p class="muted">${escapeHtml(article.summary)}</p>
        <div class="row"><button class="primary-btn" data-read-article="${article.id}" type="button">Baca</button><button class="secondary-btn" data-bookmark="${article.id}" type="button">${marked ? "Tersimpan" : "Simpan"}</button>${done ? `<span class="pill success">Selesai</span>` : ""}</div>
      </article>
    `;
  }

  function doctorCard(doctor) {
    return `
      <article class="doctor-card">
        <div class="between"><div class="avatar">${doctor.name.split(" ").map(x => x[0]).slice(0,2).join("")}</div><span class="pill success">${doctor.rating}</span></div>
        <h3>${escapeHtml(doctor.name)}</h3>
        <p class="muted">${doctor.title}. Fokus: ${doctor.focus.join(", ")}.</p>
        <div class="between"><strong class="price">${formatIDR(doctor.fee)}</strong><button class="primary-btn" data-book-doctor="${doctor.id}" type="button">Booking</button></div>
      </article>
    `;
  }

  function forumItem(item) {
    return `
      <article class="panel">
        <div class="between"><strong>${escapeHtml(item.topic)}</strong><span class="tag">${item.replies.length} balasan</span></div>
        <p class="muted">Oleh ${escapeHtml(item.author)} - ${escapeHtml(item.body)}</p>
        ${item.replies.length ? `<div class="list">${item.replies.slice(-2).map(r => `<p class="tag">${escapeHtml(r)}</p>`).join("")}</div>` : ""}
        <button class="secondary-btn" data-reply="${item.id}" type="button">Balas</button>
      </article>
    `;
  }

  function messageHtml(message) {
    return `<div class="message ${message.from === "me" ? "me" : ""}">${escapeHtml(message.text)}<small>${escapeHtml(message.at)}</small></div>`;
  }

  function appointmentRow(row) {
    return `<div class="list-item"><div class="avatar">DR</div><div><strong>${escapeHtml(row.doctor)}</strong><p class="muted">${formatDate(row.date)} ${row.time} - ${escapeHtml(row.note)}</p></div><span class="pill warn">${escapeHtml(row.status)}</span></div>`;
  }

  function analysisRow(row) {
    return `<div class="list-item"><div class="avatar">${skinScore(row)}</div><div><strong>${formatDate(row.date)} - ${escapeHtml(row.source)}</strong><p class="muted">Moisture ${row.moisture}, Sebum ${row.sebum}, Acne ${row.acne}. ${escapeHtml(row.notes || "")}</p></div><span class="tag">${summaryLabel(row)}</span></div>`;
  }

  function metricMeters(a) {
    const safe = a || { moisture: 0, sebum: 0, texture: 0, acne: 0, sensitivity: 0 };
    return [
      ["Kelembapan", safe.moisture, "lebih tinggi lebih baik"],
      ["Sebum", safe.sebum, "target sedang"],
      ["Tekstur", safe.texture, "lebih tinggi lebih halus"],
      ["Acne risk", safe.acne, "lebih rendah lebih baik"],
      ["Sensitivitas", safe.sensitivity, "lebih rendah lebih baik"]
    ].map(([label, value, hint]) => `
      <div class="meter"><div class="between"><strong>${label}</strong><span>${value}/100</span></div><div class="meter-bar"><span style="--value:${value}"></span></div><small class="muted">${hint}</small></div>
    `).join("");
  }

  function routineRecommendation(a) {
    const recs = [];
    if (a.sebum > 60) recs.push("Gunakan cleanser low pH dan moisturizer gel. Tambahkan niacinamide untuk kontrol sebum.");
    if (a.moisture < 50) recs.push("Prioritaskan hidrasi: toner/serum humektan dan moisturizer barrier repair.");
    if (a.acne > 50) recs.push("Hindari scrub keras. Gunakan treatment acne bertahap dan konsultasi bila inflamasi memburuk.");
    if (a.sensitivity > 45) recs.push("Pilih produk fragrance free, kurangi bahan aktif, dan lakukan patch test.");
    if (!recs.length) recs.push("Pertahankan rutinitas basic: cleanser, moisturizer, sunscreen, dan tracking mingguan.");
    return `<div class="list">${recs.map(r => `<div class="panel">${escapeHtml(r)}</div>`).join("")}</div>`;
  }

  function dailyNotesHtml() {
    const notes = Object.entries(state.routineHistory).flatMap(([date, data]) => (data.notes || []).map(note => ({ date, ...note }))).slice(-4).reverse();
    if (!notes.length) return `<p class="muted">Belum ada catatan. Tambahkan catatan untuk melacak pemicu.</p>`;
    return notes.map(note => `<div class="panel"><strong>${note.date}</strong><p class="muted">${escapeHtml(note.text)}</p></div>`).join("");
  }

  function planCard(name, price, desc, active) {
    return `
      <div class="plan-card ${active ? "featured" : ""}">
        <div class="between"><h3>${name}</h3>${active ? `<span class="pill success">Aktif</span>` : ""}</div>
        <div class="price">${price ? formatIDR(price) + "/bln" : "Gratis"}</div>
        <p class="muted">${desc}</p>
        <button class="${active ? "secondary-btn" : "primary-btn"}" data-plan="${name}" type="button">${active ? "Dipilih" : "Pilih plan"}</button>
      </div>
    `;
  }

  function drawProgressChart(canvas) {
    const points = state.analyses.map(a => skinScore(a));
    drawLineChart(canvas, points, "Skin score");
  }

  function drawAnalysisChart(canvas) {
    const latest = getLatestAnalysis();
    const points = [latest.moisture, latest.sebum, latest.texture, 100 - latest.acne, 100 - latest.sensitivity];
    drawLineChart(canvas, points, "Parameter");
  }

  function drawLineChart(canvas, points, label) {
    if (!canvas) return;
    const parentWidth = canvas.parentElement.clientWidth || 600;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = parentWidth * dpr;
    canvas.height = 260 * dpr;
    canvas.style.width = parentWidth + "px";
    canvas.style.height = "260px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const width = parentWidth;
    const height = 260;
    ctx.clearRect(0, 0, width, height);
    ctx.font = "13px system-ui";
    ctx.fillStyle = getCss("--muted");
    ctx.fillText(label, 18, 26);
    ctx.strokeStyle = getCss("--line");
    ctx.lineWidth = 1;
    for (let y = 60; y <= 220; y += 40) {
      ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(width - 18, y); ctx.stroke();
    }
    if (!points.length) return;
    const max = 100, min = 0;
    const xStep = (width - 52) / Math.max(1, points.length - 1);
    const toY = v => 220 - ((v - min) / (max - min)) * 160;
    ctx.strokeStyle = getCss("--primary-2");
    ctx.lineWidth = 4;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = 26 + i * xStep;
      const y = toY(p);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    points.forEach((p, i) => {
      const x = 26 + i * xStep;
      const y = toY(p);
      ctx.fillStyle = getCss("--surface");
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = getCss("--primary"); ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = getCss("--text"); ctx.fillText(String(p), x - 8, y - 12);
    });
  }

  function modal(content) {
    closeModal();
    const tpl = $("#modalTemplate").content.cloneNode(true);
    $(".modal-body", tpl).innerHTML = content;
    $(".modal-close", tpl).addEventListener("click", closeModal);
    const backdrop = $(".modal-backdrop", tpl);
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(); });
    document.body.appendChild(tpl);
  }

  function closeModal() {
    const existing = $(".modal-backdrop");
    if (existing) existing.remove();
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.classList.remove("show"), 3400);
  }

  function getLatestAnalysis() {
    return state.analyses[state.analyses.length - 1] || { date: new Date().toISOString(), moisture: 50, sebum: 50, texture: 50, acne: 50, sensitivity: 50, source: "Default", notes: "Belum ada analisis." };
  }

  function skinScore(a) {
    const moisture = a.moisture;
    const sebumBalance = 100 - Math.abs(55 - a.sebum) * 1.25;
    const texture = a.texture;
    const acne = 100 - a.acne;
    const sensitivity = 100 - a.sensitivity;
    return clamp(Math.round((moisture * .24) + (sebumBalance * .18) + (texture * .22) + (acne * .22) + (sensitivity * .14)), 0, 100);
  }

  function summaryFor(a) {
    if (!a) return "Belum ada data kulit.";
    if (a.acne > 60) return "Risiko acne sedang tinggi; jaga rutinitas lembut dan pertimbangkan konsultasi.";
    if (a.sebum > 68) return "Sebum masih tinggi, cocok dengan produk oil-control yang tetap menjaga barrier.";
    if (a.moisture < 45) return "Kelembapan rendah; fokus pada hidrasi dan perbaikan barrier.";
    if (skinScore(a) > 75) return "Progress kulit membaik; pertahankan rutinitas dan sunscreen.";
    return "Kondisi cukup stabil; tracking berkala membantu rekomendasi lebih akurat.";
  }

  function summaryLabel(a) {
    const score = skinScore(a);
    if (score >= 80) return "Sehat";
    if (score >= 65) return "Stabil";
    if (score >= 50) return "Perlu perhatian";
    return "Butuh konsultasi";
  }

  function routineCompletion() {
    if (!state.routine.length) return 0;
    return Math.round(state.routine.filter(r => r.done).length / state.routine.length * 100);
  }

  function productScore(product) {
    let score = 0;
    if (product.type.includes(state.profile.skinType)) score += 3;
    for (const issue of state.profile.concerns) if (product.issue.includes(issue)) score += 1;
    const latest = getLatestAnalysis();
    if (latest.sebum > 60 && product.issue.includes("oil")) score += 1;
    if (latest.acne > 50 && product.issue.includes("acne")) score += 1;
    if (latest.moisture < 50 && product.issue.includes("dry")) score += 1;
    return score;
  }

  function recommendProducts() {
    return [...productSeed].sort((a, b) => productScore(b) - productScore(a));
  }

  function cartTotal() {
    return state.cart.reduce((total, item) => {
      const p = productSeed.find(product => product.id === item.id);
      return total + (p ? p.price * item.qty : 0);
    }, 0);
  }

  function generatedNotes(data) {
    return `Moisture ${data.moisture}, sebum ${data.sebum}, acne risk ${data.acne}. Rekomendasi dibuat otomatis oleh rule demo.`;
  }

  function selectOptions(options, selected) {
    return options.map(item => {
      const value = Array.isArray(item) ? item[0] : item;
      const label = Array.isArray(item) ? item[1] : item;
      return `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${label}</option>`;
    }).join("");
  }

  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString(); }
  function dateKey(date) { return new Date(date).toISOString().slice(0, 10); }
  function timeNow() { return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }); }
  function formatDate(date) { return new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  function formatIDR(value) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value); }
  function firstName(name) { return (name || "Pengguna").split(" ")[0]; }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function getCss(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
  }
})();
async function askDeSkinAI(message, feature = "general") {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      feature,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "AI gagal merespons.");
  }

  return data.answer;
}
