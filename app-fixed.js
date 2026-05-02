(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const APP_VERSION = "1.0.5";
  const STORE_KEY = "deskin_state_v2";
  const app = $("#app");
  const pageTitle = $("#pageTitle");
  const navRoot = $("#mainNav");
  const toastEl = $("#toast");

  const products = [
    { id: "p1", name: "Gentle Low pH Cleanser", category: "Cleanser", price: 69000, type: ["oily", "sensitive", "combination"], issue: ["acne", "oil", "pores"], rating: 4.8, tags: ["low pH", "fragrance free"] },
    { id: "p2", name: "Barrier Repair Moisturizer", category: "Moisturizer", price: 89000, type: ["dry", "sensitive", "normal"], issue: ["dry", "irritation"], rating: 4.7, tags: ["ceramide", "barrier"] },
    { id: "p3", name: "Daily Matte Sunscreen SPF 50", category: "Sunscreen", price: 79000, type: ["oily", "combination", "normal"], issue: ["uv", "oil"], rating: 4.6, tags: ["non greasy", "spf50"] },
    { id: "p4", name: "Niacinamide Sebum Serum", category: "Serum", price: 99000, type: ["oily", "combination"], issue: ["oil", "pores", "acne"], rating: 4.9, tags: ["niacinamide", "sebum"] },
    { id: "p5", name: "Hydra Gel Toner", category: "Toner", price: 59000, type: ["dry", "normal", "sensitive"], issue: ["dry", "texture"], rating: 4.5, tags: ["hydrating", "alcohol free"] },
    { id: "p6", name: "BHA Clarifying Pads", category: "Treatment", price: 119000, type: ["oily", "combination"], issue: ["acne", "pores", "texture"], rating: 4.6, tags: ["bha", "2x weekly"] }
  ];

  const articles = [
    { id: "a1", category: "Dasar", minutes: 4, title: "Urutan skincare pagi untuk pemula", summary: "Mulai dari cleanser, moisturizer, sampai sunscreen tanpa membuat rutinitas terasa berat.", body: "Rutinitas pagi ideal cukup berisi pembersih lembut, pelembap, dan sunscreen. Untuk kulit berminyak, pilih tekstur gel. Untuk kulit kering, pilih pelembap yang mendukung barrier." },
    { id: "a2", category: "Pria", minutes: 5, title: "Kenapa pria sering melewatkan skincare", summary: "Stigma, minim edukasi, dan produk yang terasa rumit bisa diatasi dengan rutinitas sederhana.", body: "Skincare bukan sekadar kosmetik. Cukup mulai dari face wash lembut, moisturizer, dan sunscreen. Kebiasaan sederhana ini membantu menjaga barrier kulit." },
    { id: "a3", category: "Masalah Kulit", minutes: 6, title: "Bedakan kulit berminyak dan dehidrasi", summary: "Kulit bisa berminyak namun tetap kekurangan air. Analisis berkala membantu menentukan produk.", body: "Sebum tinggi bukan berarti kulit cukup air. Jika wajah berminyak tetapi terasa ketarik, pilih hidrasi ringan dan hindari cleanser terlalu keras." },
    { id: "a4", category: "Keamanan", minutes: 7, title: "Cara membaca bahan aktif dengan aman", summary: "Kenali BHA, AHA, niacinamide, retinoid, dan kapan harus konsultasi.", body: "Bahan aktif sebaiknya dikenalkan perlahan. Hindari menumpuk banyak aktif sekaligus. Hentikan jika terjadi iritasi berat atau rasa terbakar berkepanjangan." }
  ];

  const doctors = [
    { id: "d1", name: "dr. Aditya Pratama", title: "Dermatologist", rating: 4.9, fee: 149000, focus: "acne, oily skin", available: ["09:00", "13:00", "19:00"] },
    { id: "d2", name: "dr. Maya Putri", title: "Dermatologist", rating: 4.8, fee: 149000, focus: "sensitive skin, barrier repair", available: ["10:00", "15:00", "20:00"] },
    { id: "d3", name: "Nadia Lestari", title: "Skincare Consultant", rating: 4.7, fee: 79000, focus: "routine review, budget skincare", available: ["08:00", "16:00", "21:00"] }
  ];

  const locations = [
    { name: "Klinik Kulit Sehat", type: "Klinik", distance: 1.2, open: "08:00-21:00", x: 20, y: 32 },
    { name: "Apotek Dermacare", type: "Apotek", distance: 2.7, open: "09:00-22:00", x: 62, y: 42 },
    { name: "DeSkin Campus Booth", type: "Booth", distance: 0.6, open: "10:00-17:00", x: 47, y: 73 },
    { name: "Beauty Clinic Partner", type: "Partner", distance: 4.1, open: "10:00-20:00", x: 76, y: 18 }
  ];

  const navItems = [
    ["#/dashboard", "Dashboard", "01"], ["#/daily", "SKINDaily", "02"], ["#/map", "SKINMap", "03"],
    ["#/market", "SKINMarket", "04"], ["#/edu", "SKINEdu", "05"], ["#/analyzer", "SKINAnalyzer", "06"],
    ["#/analysis", "SKINAnalysis", "07"], ["#/talk", "SKINTalk", "08"], ["#/profile", "Profil", "09"]
  ];

  const defaultState = {
    authed: false,
    theme: "light",
    profile: { name: "Pengguna DeSkin", email: "demo@deskin.inc", age: 22, gender: "Pria", skinType: "oily", concerns: ["acne", "oil"], budget: "medium", plan: "Free" },
    analyses: [
      { id: uid(), date: daysAgo(6), moisture: 48, sebum: 72, texture: 56, acne: 61, sensitivity: 34, source: "Demo", notes: "T-zone berminyak, jerawat ringan." },
      { id: uid(), date: daysAgo(3), moisture: 52, sebum: 68, texture: 61, acne: 55, sensitivity: 31, source: "Demo", notes: "Mulai membaik setelah sunscreen rutin." },
      { id: uid(), date: daysAgo(0), moisture: 57, sebum: 64, texture: 66, acne: 49, sensitivity: 29, source: "Demo", notes: "Rekomendasi: cleanser low pH + niacinamide." }
    ],
    routine: [
      { id: "r1", time: "Pagi", title: "Cleanser lembut", done: false },
      { id: "r2", time: "Pagi", title: "Moisturizer ringan", done: false },
      { id: "r3", time: "Pagi", title: "Sunscreen SPF 30+", done: false },
      { id: "r4", time: "Malam", title: "Cleanser", done: false },
      { id: "r5", time: "Malam", title: "Treatment sesuai rekomendasi", done: false },
      { id: "r6", time: "Malam", title: "Moisturizer", done: false }
    ],
    routineHistory: {}, cart: [], bookmarks: ["a1"], eduDone: ["a2"], appointments: [],
    forum: [
      { id: uid(), author: "Rafi", topic: "Jerawat muncul setelah begadang", body: "Ada rutinitas simpel untuk mahasiswa?", replies: ["Mulai dari cleanser, moisturizer, sunscreen dulu."] },
      { id: uid(), author: "DeSkin Care", topic: "Reminder sunscreen", body: "Gunakan 2 ruas jari untuk wajah dan leher.", replies: [] }
    ],
    messages: [
      { from: "consultant", text: "Halo, saya siap bantu review rutinitas kamu.", at: "09:00" },
      { from: "me", text: "Saya punya kulit berminyak dan jerawat di dagu.", at: "09:02" }
    ],
    connectedDevice: null
  };

  let state = loadState();
  let stream = null;

  init();

  function init() {
    document.documentElement.dataset.theme = state.theme || "light";
    renderNav();
    bindGlobal();
    if (!location.hash) location.hash = state.authed ? "#/dashboard" : "#/welcome";
    window.addEventListener("hashchange", renderRoute);
    renderRoute();
  }

  function loadState() {
    try { return { ...structuredClone(defaultState), ...(JSON.parse(localStorage.getItem(STORE_KEY) || "{}")) }; }
    catch { return structuredClone(defaultState); }
  }
  function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

  function bindGlobal() {
    $("#menuBtn")?.addEventListener("click", () => document.body.classList.toggle("menu-open"));
    $("#themeBtn")?.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = state.theme;
      saveState();
    });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }

  function renderNav() {
    navRoot.innerHTML = navItems.map(([path, label, icon]) => `<a href="${path}" data-path="${path}"><span class="ico">${icon}</span><span>${label}</span></a>`).join("");
  }

  function renderRoute() {
    stopCamera();
    document.body.classList.remove("menu-open");
    const route = location.hash || "#/welcome";
    $$(".nav a").forEach(a => a.classList.toggle("active", a.dataset.path === route));
    if (!state.authed && !["#/welcome", "#/auth"].includes(route)) { location.hash = "#/welcome"; return; }
    const routes = { "#/welcome": renderWelcome, "#/auth": renderAuth, "#/dashboard": renderDashboard, "#/daily": renderDaily, "#/map": renderMap, "#/market": renderMarket, "#/edu": renderEdu, "#/analyzer": renderAnalyzer, "#/analysis": renderAnalysis, "#/talk": renderTalk, "#/profile": renderProfile };
    (routes[route] || renderNotFound)();
  }
  function setTitle(t) { pageTitle.textContent = t; }

  function renderWelcome() {
    setTitle("Selamat datang");
    app.innerHTML = `<section class="container hero"><div><p class="eyebrow">DeSkin Inc.</p><h2>Software digital skin assistant.</h2><p>Prototype DeSkin: SKINDaily, SKINMap, SKINMarket, SKINEdu, SKINAnalyzer, SKINAnalysis, dan SKINTalk dengan AI Gemini.</p><div class="hero-actions"><a class="primary-btn" href="#/auth">Mulai sekarang</a><button class="secondary-btn" id="demoLogin" type="button">Masuk demo cepat</button></div></div><div class="device-card"><div class="between"><strong>DeSkin Assisted Detector</strong><span class="pill">BLE Ready</span></div><div class="device"><span class="device-dot"></span></div><p>Analisis kelembapan, sebum, tekstur, sensitivitas, dan progres rutinitas.</p></div></section><p class="footer-note">Versi ${APP_VERSION}. Data demo dapat direset dari halaman Profil.</p><p class="footer-note">© 2026 Muhammad Naufal. All rights reserved.</p>`;
    $("#demoLogin").onclick = () => { state.authed = true; saveState(); location.hash = "#/dashboard"; };
  }

  function renderAuth() {
    setTitle("Masuk / Daftar");
    app.innerHTML = `<section class="container auth-shell"><div class="card auth-card"><div class="auth-side"><p class="eyebrow">Personalized skincare</p><h2>Bangun rutinitas kulit yang cocok dengan data kamu.</h2><p>Daftar sekali, lalu preferensi tersimpan lokal.</p></div><form id="authForm" class="auth-form form-grid"><h2>Buat profil DeSkin</h2><label>Nama<input name="name" value="${esc(state.profile.name)}" required /></label><label>Email<input name="email" type="email" value="${esc(state.profile.email)}" required /></label><div class="grid two"><label>Usia<input name="age" type="number" value="${state.profile.age}" /></label><label>Gender<select name="gender">${opts(["Pria","Wanita","Lainnya"], state.profile.gender)}</select></label></div><label>Tipe kulit<select name="skinType">${opts([["oily","Berminyak"],["dry","Kering"],["normal","Normal"],["combination","Kombinasi"],["sensitive","Sensitif"]], state.profile.skinType)}</select></label><button class="primary-btn" type="submit">Simpan dan masuk</button><button id="quickDemo" class="ghost-btn" type="button">Gunakan akun demo</button></form></div></section>`;
    $("#authForm").onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.currentTarget)); state.profile = { ...state.profile, ...d, age: Number(d.age || 22) }; state.authed = true; saveState(); location.hash = "#/dashboard"; };
    $("#quickDemo").onclick = () => { state.authed = true; saveState(); location.hash = "#/dashboard"; };
  }

  function renderDashboard() {
    setTitle("Dashboard");
    const latest = getLatestAnalysis(); const score = skinScore(latest);
    app.innerHTML = `<section class="container stack"><div class="hero"><div><p class="eyebrow">Halo, ${esc(firstName(state.profile.name))}</p><h2>Kulit kamu hari ini berada di skor ${score}/100.</h2><p>${summaryFor(latest)} Gunakan analisis berkala dan rekomendasi produk agar progres terukur.</p><div class="hero-actions"><a class="primary-btn" href="#/analyzer">Mulai scan wajah</a><a class="secondary-btn" href="#/daily">Cek rutinitas</a></div></div><div class="card stack"><div class="between"><div><p class="eyebrow">Skin Health</p><h3 style="margin:0">Ringkasan terbaru</h3></div><div class="progress-ring" style="--value:${score}"><strong>${score}</strong></div></div>${metricMeters(latest)}</div></div><div class="grid four"><div class="card stat"><span class="tag">Rutinitas hari ini</span><strong>${routineCompletion()}%</strong><small>Konsistensi membantu hasil.</small></div><div class="card stat"><span class="tag">Analisis tersimpan</span><strong>${state.analyses.length}</strong><small>Data historis tersedia.</small></div><div class="card stat"><span class="tag">Plan aktif</span><strong>${esc(state.profile.plan)}</strong><small>Upgrade untuk konsultasi.</small></div><div class="card stat"><span class="tag">Keranjang</span><strong>${state.cart.reduce((a,b)=>a+b.qty,0)}</strong><small>${idr(cartTotal())}</small></div></div><div class="grid two"><section class="card stack"><div class="between"><h2>Agenda rutin</h2><a class="ghost-btn" href="#/daily">Kelola</a></div><div class="list">${state.routine.slice(0,4).map(routineItem).join("")}</div></section><section class="card stack"><div class="between"><h2>Rekomendasi cepat</h2><a class="ghost-btn" href="#/market">Market</a></div><div class="grid three">${recommendProducts().slice(0,3).map(productCard).join("")}</div></section></div></section>`;
    bindProductButtons();
  }

  function renderDaily() {
    setTitle("SKINDaily");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINDaily</p><h2>Progress rutinitas</h2><p class="muted">Pantau konsistensi dan catat pemicu.</p></div><button id="saveRoutineDay" class="primary-btn">Simpan progres hari ini</button></div><div class="grid two"><section class="card stack"><h2>Checklist hari ini</h2><div id="routineList" class="list">${state.routine.map(routineItem).join("")}</div><button id="addRoutine" class="secondary-btn">Tambah step</button></section><section class="card stack"><p class="eyebrow">Completion</p><div class="progress-ring" style="--value:${routineCompletion()}"><strong>${routineCompletion()}%</strong></div><textarea id="dailyNote" placeholder="Catatan harian..."></textarea><button id="addNote" class="secondary-btn">Tambah catatan</button></section></div></section>`;
    $("#routineList").onchange = e => { if (!e.target.matches("input")) return; state.routine = state.routine.map(r => r.id === e.target.value ? { ...r, done: e.target.checked } : r); saveState(); renderDaily(); };
    $("#addRoutine").onclick = () => { const title = prompt("Nama step rutinitas:"); if (title) { state.routine.push({ id: uid(), time: "Custom", title, done: false }); saveState(); renderDaily(); } };
    $("#saveRoutineDay").onclick = () => { state.routineHistory[dateKey(new Date())] = { completion: routineCompletion() }; state.routine = state.routine.map(r => ({ ...r, done: false })); saveState(); renderDaily(); };
    $("#addNote").onclick = () => toast("Catatan tersimpan untuk mode demo.");
  }

  function renderMap() {
    setTitle("SKINMap");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINMap</p><h2>Peta partner</h2><p class="muted">Data lokasi demo untuk klinik, apotek, dan booth.</p></div><button id="locateMe" class="primary-btn">Gunakan lokasi saya</button></div><div class="grid two"><div class="card stack"><input id="mapSearch" placeholder="Cari lokasi..."/><div id="locationList" class="list"></div></div><div id="mapVisual" class="map-visual"></div></div></section>`;
    const render = () => { const q = $("#mapSearch").value.toLowerCase(); const list = locations.filter(l => l.name.toLowerCase().includes(q)); $("#locationList").innerHTML = list.map(l => `<article class="map-card"><div class="between"><h3>${esc(l.name)}</h3><span class="pill">${l.distance} km</span></div><p class="muted">${l.type}. Buka ${l.open}.</p></article>`).join(""); $("#mapVisual").innerHTML = `<span class="pin user" style="left:50%;top:55%"><span>U</span></span>` + list.map((l,i)=>`<span class="pin" style="left:${l.x}%;top:${l.y}%"><span>${i+1}</span></span>`).join(""); };
    $("#mapSearch").oninput = render; $("#locateMe").onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => toast(`Lokasi: ${p.coords.latitude.toFixed(3)}, ${p.coords.longitude.toFixed(3)}`), () => toast("Izin lokasi ditolak.")) : toast("Geolocation tidak tersedia."); render();
  }

  function renderMarket() {
    setTitle("SKINMarket");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINMarket</p><h2>Produk rekomendasi</h2><p class="muted">Filter produk sesuai tipe kulit dan masalah.</p></div><button id="openCart" class="primary-btn">Keranjang (${state.cart.reduce((a,b)=>a+b.qty,0)})</button></div><div class="card row"><input id="productSearch" placeholder="Cari produk..."/><select id="productIssue"><option value="all">Semua masalah</option><option value="acne">Acne</option><option value="oil">Oil</option><option value="dry">Dry</option><option value="pores">Pores</option></select></div><div id="productGrid" class="grid four"></div></section>`;
    const render = () => { const q = $("#productSearch").value.toLowerCase(); const issue = $("#productIssue").value; const list = products.filter(p => (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) && (issue === "all" || p.issue.includes(issue))).sort((a,b)=>productScore(b)-productScore(a)); $("#productGrid").innerHTML = list.map(productCard).join(""); bindProductButtons(); };
    $("#productSearch").oninput = render; $("#productIssue").onchange = render; $("#openCart").onclick = showCart; render();
  }

  function renderEdu() {
    setTitle("SKINEdu");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINEdu</p><h2>Edukasi skincare</h2><p class="muted">Modul singkat berbasis sains.</p></div><button id="startQuiz" class="primary-btn">Mulai quiz</button></div><div class="grid three">${articles.map(articleCard).join("")}</div></section>`;
    $$('[data-read]').forEach(b => b.onclick = () => readArticle(b.dataset.read));
    $("#startQuiz").onclick = () => toast("Quiz demo: sunscreen adalah tahap wajib pagi hari.");
  }

  function renderAnalyzer() {
    setTitle("SKINAnalyzer");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINAnalyzer</p><h2>Scan wajah atau input detector</h2><p class="muted">Foto hanya diproses lokal di browser.</p></div><button id="connectDevice" class="secondary-btn">Hubungkan detector</button></div><div class="grid two"><section class="card stack"><div id="cameraBox" class="camera-box"><div class="stack" style="text-align:center;padding:22px"><h3>Preview kamera</h3><p class="muted">Izinkan kamera atau upload foto.</p></div><span class="capture-overlay"></span></div><div class="row"><button id="startCamera" class="primary-btn">Buka kamera</button><button id="capturePhoto" class="secondary-btn">Capture</button><label class="ghost-btn">Upload foto<input id="photoUpload" type="file" accept="image/*" hidden /></label></div></section><form id="analysisForm" class="card form-grid"><h2>Input analisis cepat</h2>${rangeInput("moisture","Kelembapan",55)}${rangeInput("sebum","Sebum",65)}${rangeInput("texture","Tekstur",60)}${rangeInput("acne","Acne risk",48)}${rangeInput("sensitivity","Sensitivitas",30)}<label>Catatan<textarea name="notes"></textarea></label><button class="primary-btn" type="submit">Simpan ke SKINAnalysis</button></form></div></section>`;
    $("#startCamera").onclick = startCamera; $("#capturePhoto").onclick = capturePhoto; $("#photoUpload").onchange = previewUpload; $("#connectDevice").onclick = () => { state.connectedDevice = { name: "DeSkin Assisted Detector (Simulated)" }; saveState(); toast("Detector simulasi terhubung."); };
    $("#analysisForm").onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.currentTarget)); state.analyses.push({ id: uid(), date: new Date().toISOString(), moisture:+d.moisture, sebum:+d.sebum, texture:+d.texture, acne:+d.acne, sensitivity:+d.sensitivity, source:"Manual", notes:d.notes || "Analisis manual." }); saveState(); location.hash = "#/analysis"; };
  }

  function renderAnalysis() {
    setTitle("SKINAnalysis");
    const latest = getLatestAnalysis();
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINAnalysis</p><h2>Hasil analisis personal</h2><p class="muted">Parameter kulit dan rekomendasi.</p></div><a class="primary-btn" href="#/analyzer">Scan baru</a></div><div class="grid three"><div class="card stack"><p class="eyebrow">Skin score</p><div class="progress-ring" style="--value:${skinScore(latest)}"><strong>${skinScore(latest)}</strong></div><p class="muted">${summaryFor(latest)}</p></div><div class="card stack"><p class="eyebrow">Device</p><h2>${state.connectedDevice ? esc(state.connectedDevice.name) : "Belum terhubung"}</h2></div><div class="card stack"><p class="eyebrow">Terakhir</p><h2>${fmtDate(latest.date)}</h2><p class="muted">${esc(latest.notes)}</p></div></div><div class="grid two"><section class="card stack"><h2>Parameter</h2>${metricMeters(latest)}</section><section class="card stack"><h2>Rekomendasi</h2>${routineRecommendation(latest)}<h3>Produk prioritas</h3><div class="grid two">${recommendProducts().slice(0,4).map(productCard).join("")}</div></section></div><section class="card stack"><h2>Riwayat</h2><div class="list">${state.analyses.slice().reverse().map(a=>`<div class="list-item"><div class="avatar">${skinScore(a)}</div><div><strong>${fmtDate(a.date)} - ${esc(a.source)}</strong><p class="muted">Moisture ${a.moisture}, Sebum ${a.sebum}, Acne ${a.acne}. ${esc(a.notes)}</p></div></div>`).join("")}</div></section></section>`;
    bindProductButtons();
  }

  function renderTalk() {
    setTitle("SKINTalk");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINTalk</p><h2>Konsultasi ahli dan forum komunitas</h2><p class="muted">Chat AI Gemini, booking demo, dan forum.</p></div><button id="newTopic" class="primary-btn">Buat topik forum</button></div><div class="grid three">${doctors.map(doctorCard).join("")}</div><div class="grid two"><section class="card stack"><div class="between"><h2>Chat konsultasi</h2><span class="pill success">Online</span></div><div id="chatBox" class="chat-box">${state.messages.map(messageHtml).join("")}</div><form id="chatForm" class="row"><input name="text" placeholder="Tulis pesan..." required /><button class="primary-btn" type="submit">Kirim</button></form></section><section class="card stack"><h2>Forum diskusi</h2><div id="forumList" class="list">${state.forum.map(forumItem).join("")}</div></section></div><section class="card stack"><h2>Jadwal konsultasi</h2><div class="list">${state.appointments.length ? state.appointments.map(a=>`<div class="list-item"><div class="avatar">DR</div><div><strong>${esc(a.doctor)}</strong><p class="muted">${a.date} ${a.time} - ${esc(a.note)}</p></div><span class="pill warn">${esc(a.status)}</span></div>`).join("") : `<p class="muted">Belum ada jadwal.</p>`}</div></section></section>`;
    bindTalk();
  }

  function renderProfile() {
    setTitle("Profil");
    app.innerHTML = `<section class="container stack"><div><p class="eyebrow">Profil dan pengaturan</p><h2>Preferensi pengguna</h2><p class="muted">Data dipakai untuk rekomendasi.</p></div><div class="grid two"><form id="profileForm" class="card form-grid"><h2>Data pribadi</h2><label>Nama<input name="name" value="${esc(state.profile.name)}" /></label><label>Email<input name="email" value="${esc(state.profile.email)}" /></label><label>Tipe kulit<select name="skinType">${opts([["oily","Berminyak"],["dry","Kering"],["normal","Normal"],["combination","Kombinasi"],["sensitive","Sensitif"]], state.profile.skinType)}</select></label><button class="primary-btn">Simpan profil</button></form><section class="card stack"><h2>Data aplikasi</h2><div class="row"><button id="resetData" class="danger-btn">Reset demo</button><button id="logout" class="ghost-btn">Keluar</button></div></section></div></section>`;
    $("#profileForm").onsubmit = e => { e.preventDefault(); state.profile = { ...state.profile, ...Object.fromEntries(new FormData(e.currentTarget)) }; saveState(); toast("Profil diperbarui."); };
    $("#resetData").onclick = () => { localStorage.removeItem(STORE_KEY); state = structuredClone(defaultState); state.authed = true; saveState(); renderProfile(); };
    $("#logout").onclick = () => { state.authed = false; saveState(); location.hash = "#/welcome"; };
  }

  function renderNotFound() { setTitle("Tidak ditemukan"); app.innerHTML = `<section class="container card"><h2>Halaman tidak ditemukan</h2><a class="primary-btn" href="#/dashboard">Dashboard</a></section>`; }

  function bindTalk() {
    $$('[data-book-doctor]').forEach(b => b.onclick = () => showBooking(b.dataset.bookDoctor));
    $("#chatForm").onsubmit = async e => {
      e.preventDefault();
      const input = e.currentTarget.querySelector('input[name="text"]'); const button = e.currentTarget.querySelector("button"); const text = input.value.trim(); if (!text) return;
      input.value = ""; button.disabled = true; button.textContent = "Menjawab...";
      const loadingId = uid(); state.messages.push({ from:"me", text, at: timeNow() }, { id:loadingId, from:"consultant", text:"DeSkin AI sedang menganalisis pertanyaan kamu...", at: timeNow() }); saveState(); renderTalk();
      try { const answer = await askDeSkinAI(text, "SKINTalk"); state.messages = state.messages.filter(m => m.id !== loadingId); state.messages.push({ from:"consultant", text: answer || "AI belum memberi jawaban.", at: timeNow() }); }
      catch (err) { state.messages = state.messages.filter(m => m.id !== loadingId); state.messages.push({ from:"consultant", text:"Maaf, DeSkin AI sedang tidak bisa diakses. Cek GEMINI_API_KEY di Vercel dan api/ai.js.", at: timeNow() }); }
      saveState(); renderTalk();
    };
    $("#newTopic").onclick = () => { const topic = prompt("Judul topik:"); if (!topic) return; const body = prompt("Isi topik:") || ""; state.forum.unshift({ id: uid(), author: firstName(state.profile.name), topic, body, replies: [] }); saveState(); renderTalk(); };
    $("#forumList").onclick = e => { const btn = e.target.closest("button[data-reply]"); if (!btn) return; const item = state.forum.find(f => f.id === btn.dataset.reply); const reply = prompt("Tulis balasan:"); if (item && reply) { item.replies.push(reply); saveState(); renderTalk(); } };
    const chat = $("#chatBox"); if (chat) chat.scrollTop = chat.scrollHeight;
  }

  async function askDeSkinAI(message, feature) {
    const res = await fetch("/api/ai", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ message, feature }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "AI gagal merespons");
    return String(data.answer || "").trim();
  }

  function showBooking(id) { const d = doctors.find(x => x.id === id); if (!d) return; const time = d.available[0]; state.appointments.push({ id: uid(), doctor: d.name, date: dateKey(new Date(Date.now()+86400000)), time, note: "Booking demo", status: "Menunggu pembayaran" }); saveState(); renderTalk(); toast("Booking demo dibuat."); }
  function readArticle(id) { const a = articles.find(x=>x.id===id); if (!a) return; modal(`<h2 id="modalTitle">${esc(a.title)}</h2><p class="muted">${esc(a.summary)}</p><p>${esc(a.body)}</p>`); }
  function modal(content) { closeModal(); const tpl = $("#modalTemplate").content.cloneNode(true); $(".modal-body", tpl).innerHTML = content; $(".modal-close", tpl).onclick = closeModal; document.body.appendChild(tpl); }
  function closeModal() { $(".modal-backdrop")?.remove(); }
  function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(toastEl._t); toastEl._t = setTimeout(()=>toastEl.classList.remove("show"), 3200); }

  async function startCamera() { try { stopCamera(); stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"user" }, audio:false }); $("#cameraBox").innerHTML = `<video id="videoPreview" autoplay playsinline muted></video><span class="capture-overlay"></span>`; $("#videoPreview").srcObject = stream; } catch { toast("Kamera tidak dapat dibuka."); } }
  function capturePhoto() { const v = $("#videoPreview"); if (!v) return toast("Buka kamera dulu."); const c = document.createElement("canvas"); c.width = v.videoWidth || 720; c.height = v.videoHeight || 720; c.getContext("2d").drawImage(v,0,0,c.width,c.height); $("#cameraBox").innerHTML = `<img src="${c.toDataURL("image/jpeg",.78)}" alt="Foto wajah"/><span class="capture-overlay"></span>`; stopCamera(); toast("Foto dicapture."); }
  function previewUpload(e) { const f = e.target.files?.[0]; if (!f) return; $("#cameraBox").innerHTML = `<img src="${URL.createObjectURL(f)}" alt="Foto upload"/><span class="capture-overlay"></span>`; }
  function stopCamera() { if (stream) { stream.getTracks().forEach(t=>t.stop()); stream = null; } }

  function productCard(p) { return `<article class="product-card"><div class="product-img">${p.category.slice(0,2).toUpperCase()}</div><h3>${esc(p.name)}</h3><p class="muted">${p.category} - Rating ${p.rating}</p><div class="row">${p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div><div class="between"><span class="price">${idr(p.price)}</span><span class="pill success">${productScore(p)} match</span></div><button class="primary-btn" data-add-product="${p.id}">Tambah</button></article>`; }
  function articleCard(a) { return `<article class="article-card"><div class="article-img">${a.category.slice(0,2).toUpperCase()}</div><div class="between"><span class="tag">${a.category}</span><span class="tag">${a.minutes} menit</span></div><h3>${esc(a.title)}</h3><p class="muted">${esc(a.summary)}</p><button class="primary-btn" data-read="${a.id}">Baca</button></article>`; }
  function doctorCard(d) { return `<article class="doctor-card"><div class="between"><div class="avatar">DR</div><span class="pill success">${d.rating}</span></div><h3>${esc(d.name)}</h3><p class="muted">${d.title}. Fokus: ${esc(d.focus)}.</p><div class="between"><strong class="price">${idr(d.fee)}</strong><button class="primary-btn" data-book-doctor="${d.id}">Booking</button></div></article>`; }
  function forumItem(f) { return `<article class="panel"><div class="between"><strong>${esc(f.topic)}</strong><span class="tag">${f.replies.length} balasan</span></div><p class="muted">Oleh ${esc(f.author)} - ${esc(f.body)}</p>${f.replies.map(r=>`<p class="tag">${esc(r)}</p>`).join("")}<button class="secondary-btn" data-reply="${f.id}">Balas</button></article>`; }
  function messageHtml(m) { return `<div class="message ${m.from === "me" ? "me" : ""}"><p>${formatMessage(m.text)}</p><small>${esc(m.at || "")}</small></div>`; }
  function formatMessage(v) { return esc(v).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n{3,}/g,"\n\n").replaceAll("\n","<br>"); }
  function routineItem(r) { return `<label class="checkbox"><input type="checkbox" value="${r.id}" ${r.done ? "checked" : ""}/> <span><strong>${esc(r.time)}</strong> - ${esc(r.title)}</span></label>`; }
  function rangeInput(name,label,val) { return `<label>${label}<input name="${name}" type="range" min="0" max="100" value="${val}" /></label>`; }
  function metricMeters(a) { return [["Kelembapan",a.moisture],["Sebum",a.sebum],["Tekstur",a.texture],["Acne risk",a.acne],["Sensitivitas",a.sensitivity]].map(([l,v])=>`<div class="meter"><div class="between"><strong>${l}</strong><span>${v}/100</span></div><div class="meter-bar"><span style="--value:${v}"></span></div></div>`).join(""); }
  function routineRecommendation(a) { const r=[]; if(a.sebum>60)r.push("Gunakan cleanser low pH dan moisturizer gel. Tambahkan niacinamide untuk kontrol sebum."); if(a.moisture<50)r.push("Prioritaskan hidrasi dan barrier repair."); if(a.acne>50)r.push("Hindari scrub keras. Gunakan treatment acne bertahap dan konsultasi bila memburuk."); if(!r.length)r.push("Pertahankan cleanser, moisturizer, sunscreen, dan tracking mingguan."); return `<div class="list">${r.map(x=>`<div class="panel">${esc(x)}</div>`).join("")}</div>`; }
  function bindProductButtons(){ $$('[data-add-product]').forEach(b=>b.onclick=()=>{ const id=b.dataset.addProduct; const item=state.cart.find(x=>x.id===id); item?item.qty++:state.cart.push({id,qty:1}); saveState(); toast("Produk masuk keranjang."); }); }
  function showCart(){ modal(`<h2 id="modalTitle">Keranjang</h2><div class="list">${state.cart.map(i=>{ const p=products.find(x=>x.id===i.id); return p?`<div class="list-item"><div class="avatar">${p.category[0]}</div><div><strong>${esc(p.name)}</strong><p class="muted">${i.qty} x ${idr(p.price)}</p></div><strong>${idr(i.qty*p.price)}</strong></div>`:""; }).join("") || `<p class="muted">Keranjang kosong.</p>`}</div><hr/><div class="between"><strong>Total</strong><strong class="price">${idr(cartTotal())}</strong></div>`); }
  function recommendProducts(){ return [...products].sort((a,b)=>productScore(b)-productScore(a)); }
  function productScore(p){ let s=0; if(p.type.includes(state.profile.skinType)) s+=3; state.profile.concerns.forEach(c=>{ if(p.issue.includes(c)) s++; }); const a=getLatestAnalysis(); if(a.sebum>60&&p.issue.includes("oil"))s++; if(a.acne>50&&p.issue.includes("acne"))s++; return s; }
  function cartTotal(){ return state.cart.reduce((t,i)=>{ const p=products.find(x=>x.id===i.id); return t+(p?p.price*i.qty:0); },0); }
  function getLatestAnalysis(){ return state.analyses[state.analyses.length-1] || defaultState.analyses[0]; }
  function skinScore(a){ return clamp(Math.round(a.moisture*.24 + (100-Math.abs(55-a.sebum)*1.25)*.18 + a.texture*.22 + (100-a.acne)*.22 + (100-a.sensitivity)*.14),0,100); }
  function summaryFor(a){ if(a.acne>60)return "Risiko acne sedang tinggi; gunakan rutinitas lembut."; if(a.sebum>68)return "Sebum masih tinggi; pilih produk oil-control yang menjaga barrier."; if(a.moisture<45)return "Kelembapan rendah; fokus hidrasi."; return "Kondisi cukup stabil; tracking berkala membantu rekomendasi."; }
  function routineCompletion(){ return state.routine.length ? Math.round(state.routine.filter(r=>r.done).length/state.routine.length*100) : 0; }
  function opts(arr, selected){ return arr.map(x=>{ const v=Array.isArray(x)?x[0]:x; const l=Array.isArray(x)?x[1]:x; return `<option value="${v}" ${String(v)===String(selected)?"selected":""}>${l}</option>`; }).join(""); }
  function uid(){ return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4); }
  function daysAgo(n){ return new Date(Date.now()-n*86400000).toISOString(); }
  function dateKey(d){ return new Date(d).toISOString().slice(0,10); }
  function timeNow(){ return new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}); }
  function fmtDate(d){ return new Date(d).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}); }
  function idr(v){ return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v); }
  function firstName(n){ return (n||"Pengguna").split(" ")[0]; }
  function clamp(v,min,max){ return Math.min(max,Math.max(min,Number(v))); }
  function esc(v){ return String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
})();
