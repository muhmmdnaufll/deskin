(() => {
  "use strict";

  const VERSION = "1.0.6";
  const STORE = "deskin_state_v4";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $("#app");
  const titleEl = $("#pageTitle");
  const navEl = $("#mainNav");
  const toastEl = $("#toast");
  let stream = null;

  const products = [
    { id: "p1", name: "Gentle Low pH Cleanser", cat: "Cleanser", price: 69000, type: ["oily", "sensitive", "combination"], issue: ["acne", "oil", "pores"], tags: ["low pH", "fragrance free"], rate: 4.8 },
    { id: "p2", name: "Barrier Repair Moisturizer", cat: "Moisturizer", price: 89000, type: ["dry", "sensitive", "normal"], issue: ["dry", "redness"], tags: ["ceramide", "barrier"], rate: 4.7 },
    { id: "p3", name: "Daily Matte Sunscreen SPF 50", cat: "Sunscreen", price: 79000, type: ["oily", "combination", "normal"], issue: ["uv", "oil"], tags: ["spf50", "non greasy"], rate: 4.6 },
    { id: "p4", name: "Niacinamide Sebum Serum", cat: "Serum", price: 99000, type: ["oily", "combination"], issue: ["oil", "pores", "acne"], tags: ["niacinamide", "sebum"], rate: 4.9 },
    { id: "p5", name: "Hydra Gel Toner", cat: "Toner", price: 59000, type: ["dry", "normal", "sensitive"], issue: ["dry", "texture"], tags: ["hydrating", "alcohol free"], rate: 4.5 },
    { id: "p6", name: "BHA Clarifying Pads", cat: "Treatment", price: 119000, type: ["oily", "combination"], issue: ["acne", "pores", "texture"], tags: ["bha", "2x weekly"], rate: 4.6 }
  ];

  const articles = [
    { id: "a1", cat: "Dasar", min: 4, title: "Urutan skincare pagi untuk pemula", text: "Mulai dari cleanser, moisturizer, sampai sunscreen tanpa membuat rutinitas terasa berat." },
    { id: "a2", cat: "Pria", min: 5, title: "Kenapa pria sering melewatkan skincare", text: "Skincare bukan sekadar kosmetik. Cukup mulai dari face wash lembut, moisturizer, dan sunscreen." },
    { id: "a3", cat: "Masalah Kulit", min: 6, title: "Bedakan kulit berminyak dan dehidrasi", text: "Kulit bisa berminyak namun tetap kekurangan air. Analisis berkala membantu menentukan produk." },
    { id: "a4", cat: "Keamanan", min: 7, title: "Cara membaca bahan aktif dengan aman", text: "Bahan aktif sebaiknya dikenalkan perlahan. Hindari menumpuk banyak aktif sekaligus." }
  ];

  const doctors = [
    { id: "d1", name: "dr. Aditya Pratama", role: "Dermatologist", fee: 149000, rate: 4.9, focus: "acne, oily skin" },
    { id: "d2", name: "dr. Maya Putri", role: "Dermatologist", fee: 149000, rate: 4.8, focus: "sensitive skin, barrier repair" },
    { id: "d3", name: "Nadia Lestari", role: "Skincare Consultant", fee: 79000, rate: 4.7, focus: "routine review, budget skincare" }
  ];

  const places = [
    { name: "Klinik Kulit Sehat", type: "Klinik", dist: 1.2, open: "08:00-21:00", x: 20, y: 32 },
    { name: "Apotek Dermacare", type: "Apotek", dist: 2.7, open: "09:00-22:00", x: 62, y: 42 },
    { name: "DeSkin Campus Booth", type: "Booth", dist: 0.6, open: "10:00-17:00", x: 47, y: 73 },
    { name: "Beauty Clinic Partner", type: "Partner", dist: 4.1, open: "10:00-20:00", x: 76, y: 18 }
  ];

  const nav = [
    ["#/dashboard", "Dashboard", "01"],
    ["#/daily", "SKINDaily", "02"],
    ["#/map", "SKINMap", "03"],
    ["#/market", "SKINMarket", "04"],
    ["#/edu", "SKINEdu", "05"],
    ["#/analyzer", "SKINAnalyzer", "06"],
    ["#/analysis", "SKINAnalysis", "07"],
    ["#/talk", "SKINTalk", "08"],
    ["#/profile", "Profil", "09"]
  ];

  const defaultState = {
    authed: false,
    theme: "light",
    profile: { name: "Pengguna DeSkin", email: "demo@deskin.inc", age: 22, gender: "Pria", skinType: "oily", concerns: ["acne", "oil"], plan: "Free" },
    analyses: [
      { id: id(), date: daysAgo(5), moisture: 48, sebum: 72, texture: 56, acne: 61, sensitivity: 34, source: "Demo", notes: "T-zone berminyak, jerawat ringan." },
      { id: id(), date: new Date().toISOString(), moisture: 57, sebum: 64, texture: 66, acne: 49, sensitivity: 29, source: "Demo", notes: "Rekomendasi: cleanser low pH + niacinamide." }
    ],
    routine: [
      { id: "r1", time: "Pagi", title: "Cleanser lembut", done: false },
      { id: "r2", time: "Pagi", title: "Moisturizer ringan", done: false },
      { id: "r3", time: "Pagi", title: "Sunscreen SPF 30+", done: false },
      { id: "r4", time: "Malam", title: "Cleanser", done: false },
      { id: "r5", time: "Malam", title: "Treatment sesuai rekomendasi", done: false },
      { id: "r6", time: "Malam", title: "Moisturizer", done: false }
    ],
    cart: [],
    messages: [{ from: "consultant", text: "Halo, saya siap bantu review rutinitas kamu.", at: "09:00" }],
    forum: [{ id: id(), author: "Rafi", topic: "Jerawat muncul setelah begadang", body: "Ada rutinitas simpel untuk mahasiswa?", replies: ["Mulai dari cleanser, moisturizer, sunscreen dulu."] }],
    appointments: [],
    connectedDevice: null,
    scanInsight: null
  };

  let state = load();
  init();

  function init() {
    state.messages = (state.messages || []).filter(m => m.text !== "Saya punya kulit berminyak dan jerawat di dagu.");
    syncScan();
    document.documentElement.dataset.theme = state.theme || "light";
    navEl.innerHTML = nav.map(([p, l, i]) => `<a href="${p}" data-path="${p}"><span class="ico">${i}</span><span>${l}</span></a>`).join("");
    bindGlobal();
    if (!location.hash) location.hash = state.authed ? "#/dashboard" : "#/welcome";
    window.addEventListener("hashchange", route);
    route();
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
      return { ...structuredClone(defaultState), ...saved, profile: { ...defaultState.profile, ...(saved.profile || {}) } };
    } catch {
      return structuredClone(defaultState);
    }
  }

  function save() { localStorage.setItem(STORE, JSON.stringify(state)); }

  function bindGlobal() {
    $("#menuBtn")?.addEventListener("click", () => document.body.classList.toggle("menu-open"));
    $("#themeBtn")?.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = state.theme;
      save();
    });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }

  function route() {
    stopCamera();
    document.body.classList.remove("menu-open");
    const r = location.hash || "#/welcome";
    $$(".nav a").forEach(a => a.classList.toggle("active", a.dataset.path === r));
    if (!state.authed && !["#/welcome", "#/auth"].includes(r)) { location.hash = "#/welcome"; return; }
    ({ "#/welcome": welcome, "#/auth": auth, "#/dashboard": dashboard, "#/daily": daily, "#/map": mapPage, "#/market": market, "#/edu": edu, "#/analyzer": analyzer, "#/analysis": analysis, "#/talk": talk, "#/profile": profile }[r] || notFound)();
    copyright();
  }

  function title(t) { titleEl.textContent = t; }

  function welcome() {
    title("Selamat datang");
    app.innerHTML = `<section class="container hero"><div><p class="eyebrow">DeSkin Inc.</p><h2>Software digital skin assistant.</h2><p>Prototype DeSkin: SKINDaily, SKINMap, SKINMarket, SKINEdu, SKINAnalyzer, SKINAnalysis, dan SKINTalk dengan AI Gemini.</p><div class="hero-actions"><a class="primary-btn" href="#/auth">Mulai sekarang</a><button class="secondary-btn" id="demoLogin">Masuk demo cepat</button></div></div><div class="device-card"><div class="between"><strong>DeSkin Assisted Detector</strong><span class="pill">BLE Ready</span></div><div class="device"><span class="device-dot"></span></div><p>Analisis kelembapan, sebum, tekstur, sensitivitas, dan progres rutinitas.</p></div></section><p class="footer-note">Versi ${VERSION}. Data demo dapat direset dari halaman Profil.</p>`;
    $("#demoLogin").onclick = () => { state.authed = true; save(); location.hash = "#/dashboard"; };
  }

  function auth() {
    title("Masuk / Daftar");
    app.innerHTML = `<section class="container auth-shell"><div class="card auth-card"><div class="auth-side"><p class="eyebrow">Personalized skincare</p><h2>Bangun rutinitas kulit yang cocok dengan data kamu.</h2><p>Data demo tersimpan lokal di perangkat.</p></div><form id="authForm" class="auth-form form-grid"><h2>Buat profil DeSkin</h2><label>Nama<input name="name" value="${esc(state.profile.name)}" required></label><label>Email<input name="email" type="email" value="${esc(state.profile.email)}" required></label><label>Tipe kulit<select name="skinType">${options([["oily","Berminyak"],["dry","Kering"],["normal","Normal"],["combination","Kombinasi"],["sensitive","Sensitif"]], state.profile.skinType)}</select></label><button class="primary-btn">Simpan dan masuk</button><button class="ghost-btn" type="button" id="quickDemo">Gunakan akun demo</button></form></div></section>`;
    $("#authForm").onsubmit = e => { e.preventDefault(); state.profile = { ...state.profile, ...Object.fromEntries(new FormData(e.currentTarget)) }; state.authed = true; save(); location.hash = "#/dashboard"; };
    $("#quickDemo").onclick = () => { state.authed = true; save(); location.hash = "#/dashboard"; };
  }

  function dashboard() {
    title("Dashboard");
    syncScan();
    const a = latest();
    const s = score(a);
    app.innerHTML = `<section class="container stack"><div class="hero"><div><p class="eyebrow">Halo, ${esc(firstName(state.profile.name))}</p><h2>Kulit kamu hari ini berada di skor ${s}/100.</h2><p>${summary(a)} Gunakan analisis berkala dan rekomendasi produk agar progres terukur.</p><div class="hero-actions"><a class="primary-btn" href="#/analyzer">Mulai scan wajah</a><a class="secondary-btn" href="#/daily">Cek rutinitas</a>${aiBtn("Insight AI","Dashboard","Buat insight hari ini dan 3 prioritas tindakan berdasarkan hasil scan terakhir.")}</div></div><div class="card stack"><div class="between"><div><p class="eyebrow">Skin Health</p><h3 style="margin:0">Ringkasan terbaru</h3></div><div class="progress-ring" style="--value:${s}"><strong>${s}</strong></div></div>${meters(a)}</div></div>${scanCard()}<div class="grid four"><div class="card stat"><span class="tag">Rutinitas hari ini</span><strong>${completion()}%</strong><small>Konsistensi membantu hasil.</small></div><div class="card stat"><span class="tag">Analisis tersimpan</span><strong>${state.analyses.length}</strong><small>Data historis tersedia.</small></div><div class="card stat"><span class="tag">Plan aktif</span><strong>${esc(state.profile.plan)}</strong><small>Upgrade untuk konsultasi.</small></div><div class="card stat"><span class="tag">Keranjang</span><strong>${state.cart.reduce((x,y)=>x+y.qty,0)}</strong><small>${idr(cartTotal())}</small></div></div><div class="grid two"><section class="card stack"><div class="between"><h2>Agenda rutin</h2><a class="ghost-btn" href="#/daily">Kelola</a></div><div class="list">${state.routine.slice(0,4).map(routineHtml).join("")}</div></section><section class="card stack"><div class="between"><h2>Rekomendasi cepat</h2><a class="ghost-btn" href="#/market">Market</a></div><div class="grid three">${recommend().slice(0,3).map(productHtml).join("")}</div></section></div></section>`;
    bindAI(); bindProduct();
  }

  function daily() {
    title("SKINDaily");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINDaily</p><h2>Progress rutinitas</h2><p class="muted">Pantau konsistensi dan catat pemicu.</p></div><div class="row"><button class="primary-btn" id="saveRoutine">Simpan progres hari ini</button>${aiBtn("Rutinitas AI","SKINDaily","Susun rutinitas pagi dan malam sederhana selama 2 minggu berdasarkan hasil scan terakhir.")}</div></div>${scanCard()}<div class="grid two"><section class="card stack"><h2>Checklist hari ini</h2><div id="routineList" class="list">${state.routine.map(routineHtml).join("")}</div><button class="secondary-btn" id="addRoutine">Tambah step</button></section><section class="card stack"><p class="eyebrow">Completion</p><div class="progress-ring" style="--value:${completion()}"><strong>${completion()}%</strong></div><textarea id="dailyNote" placeholder="Catatan harian..."></textarea><button class="secondary-btn" id="addNote">Tambah catatan</button></section></div></section>`;
    bindAI();
    $("#routineList").onchange = e => { if (!e.target.matches("input")) return; state.routine = state.routine.map(r => r.id === e.target.value ? { ...r, done: e.target.checked } : r); save(); daily(); };
    $("#addRoutine").onclick = () => { const t = prompt("Nama step rutinitas:"); if (t) { state.routine.push({ id: id(), time: "Custom", title: t, done: false }); save(); daily(); } };
    $("#saveRoutine").onclick = () => { state.routine = state.routine.map(r => ({ ...r, done: false })); save(); daily(); toast("Progress tersimpan dan checklist direset."); };
    $("#addNote").onclick = () => toast("Catatan tersimpan untuk mode demo.");
  }

  function mapPage() {
    title("SKINMap");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINMap</p><h2>Peta partner</h2><p class="muted">Data lokasi demo untuk klinik, apotek, dan booth.</p></div><div class="row"><button class="primary-btn" id="locateMe">Gunakan lokasi saya</button>${aiBtn("Saran AI","SKINMap","Beri saran kapan perlu ke klinik, apotek, atau cukup perawatan rumah berdasarkan hasil scan terakhir.")}</div></div><div class="grid two"><div class="card stack"><input id="mapSearch" placeholder="Cari lokasi..."><div id="locationList" class="list"></div></div><div id="mapVisual" class="map-visual"></div></div></section>`;
    bindAI();
    const render = () => { const q = $("#mapSearch").value.toLowerCase(); const list = places.filter(p => p.name.toLowerCase().includes(q)); $("#locationList").innerHTML = list.map(p => `<article class="map-card"><div class="between"><h3>${esc(p.name)}</h3><span class="pill">${p.dist} km</span></div><p class="muted">${p.type}. Buka ${p.open}.</p></article>`).join(""); $("#mapVisual").innerHTML = `<span class="pin user" style="left:50%;top:55%"><span>U</span></span>` + list.map((p,i)=>`<span class="pin" style="left:${p.x}%;top:${p.y}%"><span>${i+1}</span></span>`).join(""); };
    $("#mapSearch").oninput = render; $("#locateMe").onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => toast(`Lokasi: ${p.coords.latitude.toFixed(3)}, ${p.coords.longitude.toFixed(3)}`), () => toast("Izin lokasi ditolak.")) : toast("Geolocation tidak tersedia."); render();
  }

  function market() {
    title("SKINMarket");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINMarket</p><h2>Produk rekomendasi</h2><p class="muted">Filter produk sesuai tipe kulit dan masalah.</p></div><div class="row"><button class="primary-btn" id="openCart">Keranjang (${state.cart.reduce((a,b)=>a+b.qty,0)})</button>${aiBtn("Rekomendasi AI","SKINMarket","Pilih 3 produk prioritas dari daftar produk demo berdasarkan hasil scan terakhir dan jelaskan urutan pemakaiannya.")}</div></div>${scanCard()}<div class="card row"><input id="productSearch" placeholder="Cari produk..."><select id="productIssue"><option value="all">Semua masalah</option><option value="acne">Acne</option><option value="oil">Oil</option><option value="dry">Dry</option><option value="pores">Pores</option><option value="texture">Texture</option></select></div><div id="productGrid" class="grid four"></div></section>`;
    bindAI();
    const render = () => { const q = $("#productSearch").value.toLowerCase(); const issue = $("#productIssue").value; const list = recommend().filter(p => (p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)) && (issue === "all" || p.issue.includes(issue))); $("#productGrid").innerHTML = list.map(productHtml).join(""); bindProduct(); };
    $("#productSearch").oninput = render; $("#productIssue").onchange = render; $("#openCart").onclick = cartModal; render();
  }

  function edu() {
    title("SKINEdu");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINEdu</p><h2>Edukasi skincare</h2><p class="muted">Modul singkat berbasis sains.</p></div><div class="row"><button class="primary-btn" id="startQuiz">Mulai quiz</button>${aiBtn("Tanya AI","SKINEdu","Buat materi edukasi yang paling relevan dengan masalah utama hasil scan terakhir.")}</div></div>${scanCard()}<div class="grid three">${articles.map(articleHtml).join("")}</div></section>`;
    bindAI(); $$('[data-read]').forEach(b => b.onclick = () => readArticle(b.dataset.read)); $("#startQuiz").onclick = () => toast("Quiz demo: sunscreen adalah tahap wajib pagi hari.");
  }

  function analyzer() {
    title("SKINAnalyzer");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINAnalyzer</p><h2>Scan wajah atau input detector</h2><p class="muted">Foto hanya diproses lokal di browser.</p></div><div class="row"><button class="secondary-btn" id="connectDevice">Hubungkan detector</button>${aiBtn("Tips scan AI","SKINAnalyzer","Beri instruksi scan wajah yang benar, kondisi cahaya, posisi wajah, hal yang harus dihindari, dan cara menjaga hasil stabil.")}</div></div><div class="grid two"><section class="card stack"><div id="cameraBox" class="camera-box"><div class="stack" style="text-align:center;padding:22px"><h3>Preview kamera</h3><p class="muted">Izinkan kamera atau upload foto.</p></div><span class="capture-overlay"></span></div><div class="row"><button id="startCamera" class="primary-btn">Buka kamera</button><button id="capturePhoto" class="secondary-btn">Capture</button><label class="ghost-btn">Upload foto<input id="photoUpload" type="file" accept="image/*" hidden></label></div></section><form id="analysisForm" class="card form-grid"><h2>Input analisis cepat</h2>${range("moisture","Kelembapan",55)}${range("sebum","Sebum",65)}${range("texture","Tekstur",60)}${range("acne","Acne risk",48)}${range("sensitivity","Sensitivitas",30)}<label>Catatan<textarea name="notes"></textarea></label><button class="primary-btn" type="submit">Simpan ke SKINAnalysis</button></form></div></section>`;
    bindAI(); $("#startCamera").onclick = startCamera; $("#capturePhoto").onclick = capturePhoto; $("#photoUpload").onchange = previewUpload; $("#connectDevice").onclick = () => { state.connectedDevice = { name: "DeSkin Assisted Detector (Simulated)" }; save(); toast("Detector simulasi terhubung."); };
    $("#analysisForm").onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.currentTarget)); state.analyses.push({ id: id(), date: new Date().toISOString(), moisture:+d.moisture, sebum:+d.sebum, texture:+d.texture, acne:+d.acne, sensitivity:+d.sensitivity, source:"Manual", notes:d.notes || "Analisis manual." }); syncScan(); save(); location.hash = "#/analysis"; };
  }

  function analysis() {
    title("SKINAnalysis");
    syncScan();
    const a = latest();
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINAnalysis</p><h2>Hasil analisis personal</h2><p class="muted">Parameter kulit dan rekomendasi.</p></div><div class="row"><a class="primary-btn" href="#/analyzer">Scan baru</a>${aiBtn("Analisis AI","SKINAnalysis","Jelaskan hasil parameter, masalah utama, risiko utama, dan langkah perawatan 14 hari. Jangan diagnosis medis.")}</div></div>${scanCard()}<div class="grid three"><div class="card stack"><p class="eyebrow">Skin score</p><div class="progress-ring" style="--value:${score(a)}"><strong>${score(a)}</strong></div><p class="muted">${summary(a)}</p></div><div class="card stack"><p class="eyebrow">Device</p><h2>${state.connectedDevice ? esc(state.connectedDevice.name) : "Belum terhubung"}</h2></div><div class="card stack"><p class="eyebrow">Terakhir</p><h2>${dateFmt(a.date)}</h2><p class="muted">${esc(a.notes)}</p></div></div><div class="grid two"><section class="card stack"><h2>Parameter</h2>${meters(a)}</section><section class="card stack"><h2>Rekomendasi</h2>${routineRec(a)}<h3>Produk prioritas</h3><div class="grid two">${recommend().slice(0,4).map(productHtml).join("")}</div></section></div><section class="card stack"><h2>Riwayat</h2><div class="list">${state.analyses.slice().reverse().map(analysisRow).join("")}</div></section></section>`;
    bindAI(); bindProduct();
  }

  function talk() {
    title("SKINTalk");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINTalk</p><h2>Konsultasi ahli dan forum komunitas</h2><p class="muted">Chat AI Gemini, booking demo, dan forum.</p></div><button id="newTopic" class="primary-btn">Buat topik forum</button></div><div class="grid three">${doctors.map(doctorHtml).join("")}</div><div class="grid two"><section class="card stack"><div class="between"><h2>Chat konsultasi</h2><span class="pill success">Online</span></div><div id="chatBox" class="chat-box">${state.messages.map(messageHtml).join("")}</div><form id="chatForm" class="row"><input name="text" placeholder="Tulis pesan..." required><button class="primary-btn" type="submit">Kirim</button></form></section><section class="card stack"><h2>Forum diskusi</h2><div id="forumList" class="list">${state.forum.map(forumHtml).join("")}</div></section></div><section class="card stack"><h2>Jadwal konsultasi</h2><div class="list">${state.appointments.length ? state.appointments.map(appointmentHtml).join("") : `<p class="muted">Belum ada jadwal.</p>`}</div></section></section>`;
    bindTalk();
  }

  function profile() {
    title("Profil");
    app.innerHTML = `<section class="container stack"><div><p class="eyebrow">Profil dan pengaturan</p><h2>Preferensi pengguna</h2><p class="muted">Data dipakai untuk rekomendasi.</p></div>${scanCard()}<div class="grid two"><form id="profileForm" class="card form-grid"><h2>Data pribadi</h2><label>Nama<input name="name" value="${esc(state.profile.name)}"></label><label>Email<input name="email" value="${esc(state.profile.email)}"></label><label>Tipe kulit<select name="skinType">${options([["oily","Berminyak"],["dry","Kering"],["normal","Normal"],["combination","Kombinasi"],["sensitive","Sensitif"]], state.profile.skinType)}</select></label><button class="primary-btn">Simpan profil</button></form><section class="card stack"><h2>Data aplikasi</h2><div class="row"><button id="resetData" class="danger-btn">Reset demo</button><button id="logout" class="ghost-btn">Keluar</button>${aiBtn("Evaluasi profil AI","Profil","Evaluasi profil dan saran data yang perlu ditambahkan berdasarkan scan terakhir.")}</div></section></div></section>`;
    bindAI(); $("#profileForm").onsubmit = e => { e.preventDefault(); state.profile = { ...state.profile, ...Object.fromEntries(new FormData(e.currentTarget)) }; save(); toast("Profil diperbarui."); };
    $("#resetData").onclick = () => { localStorage.removeItem(STORE); state = structuredClone(defaultState); state.authed = true; save(); profile(); };
    $("#logout").onclick = () => { state.authed = false; save(); location.hash = "#/welcome"; };
  }

  function notFound() { title("Tidak ditemukan"); app.innerHTML = `<section class="container card"><h2>Halaman tidak ditemukan</h2><a class="primary-btn" href="#/dashboard">Dashboard</a></section>`; }

  function bindTalk() {
    $$('[data-book-doctor]').forEach(b => b.onclick = () => showBooking(b.dataset.bookDoctor));
    $("#chatForm").onsubmit = async e => {
      e.preventDefault();
      const input = e.currentTarget.querySelector('input[name="text"]');
      const button = e.currentTarget.querySelector("button");
      const text = input.value.trim();
      if (!text) return;
      input.value = ""; button.disabled = true; button.textContent = "Menjawab...";
      const loading = id(); state.messages.push({ from:"me", text, at: timeNow() }, { id: loading, from:"consultant", text:"DeSkin AI sedang menganalisis pertanyaan kamu...", at: timeNow() }); save(); talk();
      try { const answer = await askAI(promptFor(text), "SKINTalk"); state.messages = state.messages.filter(m => m.id !== loading); state.messages.push({ from:"consultant", text: answer || "AI belum memberi jawaban.", at: timeNow() }); }
      catch { state.messages = state.messages.filter(m => m.id !== loading); state.messages.push({ from:"consultant", text:"Maaf, DeSkin AI sedang tidak bisa diakses. Cek GEMINI_API_KEY dan endpoint /api/ai.", at: timeNow() }); }
      save(); talk();
    };
    $("#newTopic").onclick = () => { const t = prompt("Judul topik:"); if (!t) return; const b = prompt("Isi topik:") || ""; state.forum.unshift({ id:id(), author:firstName(state.profile.name), topic:t, body:b, replies:[] }); save(); talk(); };
    $("#forumList").onclick = e => { const btn = e.target.closest("button[data-reply]"); if (!btn) return; const item = state.forum.find(f => f.id === btn.dataset.reply); const r = prompt("Tulis balasan:"); if (item && r) { item.replies.push(r); save(); talk(); } };
    const box = $("#chatBox"); if (box) box.scrollTop = box.scrollHeight;
  }

  function bindAI() {
    $$('[data-ai-feature]').forEach(btn => btn.onclick = async () => {
      const label = btn.textContent.trim();
      openModal(`<h2 id="modalTitle">${esc(label)}</h2><p class="muted">DeSkin AI sedang menyusun jawaban...</p>`);
      try {
        const answer = await askAI(promptFor(btn.dataset.aiInstruction), btn.dataset.aiFeature);
        $(".modal-body").innerHTML = `<h2 id="modalTitle">${esc(label)}</h2><div class="ai-output">${format(answer)}</div><button class="secondary-btn copy-ai-answer" type="button">Salin jawaban lengkap</button>`;
        $(".copy-ai-answer").onclick = async () => { await navigator.clipboard?.writeText(answer).catch(() => {}); $(".copy-ai-answer").textContent = "Jawaban disalin"; };
      } catch {
        $(".modal-body").innerHTML = `<h2 id="modalTitle">${esc(label)}</h2><p class="muted">AI belum bisa diakses. Pastikan GEMINI_API_KEY benar dan /api/ai aktif.</p>`;
      }
    });
  }

  async function askAI(message, feature) {
    const res = await fetch("/api/ai", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ message, feature }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "AI gagal merespons");
    return String(data.answer || "").trim();
  }

  function promptFor(instruction) {
    syncScan();
    const a = latest();
    const insight = state.scanInsight || deriveScan(a);
    const visible = $$(".product-card h3").map(el => el.textContent.trim()).filter(Boolean).slice(0, 8);
    return [
      "Kamu adalah DeSkin AI. Jawab dalam bahasa Indonesia, jelas, praktis, lengkap, dan tidak mengklaim diagnosis medis.",
      `Profil: ${state.profile.name}, tipe kulit ${state.profile.skinType}, concern ${state.profile.concerns.join(", ")}.`,
      `Scan terakhir: moisture ${a.moisture}, sebum ${a.sebum}, texture ${a.texture}, acne ${a.acne}, sensitivity ${a.sensitivity}. Catatan: ${a.notes || "-"}.`,
      `Masalah utama dari scan: ${insight.concerns.map(labelConcern).join(", ") || "stabil"}.`,
      visible.length ? `Produk terlihat: ${visible.join(", ")}.` : "",
      instruction,
      "Jawab sampai selesai, tidak berhenti di tengah kalimat, maksimal 8 poin utama."
    ].filter(Boolean).join("\n");
  }

  function syncScan() { const ins = deriveScan(latest()); state.scanInsight = ins; state.profile.concerns = unique([...(ins.concerns || []), ...(state.profile.concerns || [])]).slice(0, 7); state.profile.skinType = ins.skinType || state.profile.skinType; save(); }
  function deriveScan(a) { const c=[]; if(a.acne>=50)c.push("acne"); if(a.sebum>=62)c.push("oil"); if(a.moisture<=48)c.push("dry"); if(a.texture<=58)c.push("texture"); if(a.sebum>=62&&a.texture<=64)c.push("pores"); if(a.sensitivity>=42)c.push("redness"); let skinType="normal"; if(a.sensitivity>=55)skinType="sensitive"; else if(a.sebum>=65&&a.moisture<=52)skinType="combination"; else if(a.sebum>=60)skinType="oily"; else if(a.moisture<=45)skinType="dry"; const summary = c.length ? `Scan terakhir menunjukkan fokus utama: ${c.map(labelConcern).join(", ")}.` : "Scan terakhir terlihat cukup stabil."; return { concerns: unique(c), skinType, summary }; }
  function scanCard() { const i = state.scanInsight || deriveScan(latest()); return `<section class="card stack"><div class="between"><div><p class="eyebrow">Scan synced</p><h2>Masalah utama dari scan terakhir</h2></div><span class="pill success">Terintegrasi</span></div><p class="muted">${esc(i.summary)}</p><div class="row">${i.concerns.map(x => `<span class="tag">${esc(labelConcern(x))}</span>`).join("") || `<span class="tag">Stabil</span>`}</div></section>`; }
  function aiBtn(label, feature, instruction) { return `<button class="secondary-btn deskin-ai-btn" type="button" data-ai-feature="${esc(feature)}" data-ai-instruction="${esc(instruction)}">${esc(label)}</button>`; }
  function copyright() { $("#deskinCopyright")?.remove(); const p = document.createElement("p"); p.id = "deskinCopyright"; p.className = "footer-note"; p.textContent = "© 2026 Muhammad Naufal. All rights reserved."; document.body.appendChild(p); }

  async function startCamera(){ try{ stopCamera(); stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"user" }, audio:false }); $("#cameraBox").innerHTML = `<video id="videoPreview" autoplay playsinline muted style="transform:scaleX(-1)"></video><span class="capture-overlay"></span>`; $("#videoPreview").srcObject = stream; } catch { toast("Kamera tidak dapat dibuka."); } }
  function capturePhoto(){ const v=$("#videoPreview"); if(!v) return toast("Buka kamera dulu."); const c=document.createElement("canvas"); c.width=v.videoWidth||720; c.height=v.videoHeight||720; const ctx=c.getContext("2d"); ctx.translate(c.width,0); ctx.scale(-1,1); ctx.drawImage(v,0,0,c.width,c.height); $("#cameraBox").innerHTML = `<img src="${c.toDataURL("image/jpeg",.78)}" alt="Foto wajah"><span class="capture-overlay"></span>`; stopCamera(); }
  function previewUpload(e){ const f=e.target.files&&e.target.files[0]; if(!f)return; $("#cameraBox").innerHTML=`<img src="${URL.createObjectURL(f)}" alt="Foto upload"><span class="capture-overlay"></span>`; }
  function stopCamera(){ if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; } }

  function showBooking(idv){ const d=doctors.find(x=>x.id===idv); if(!d)return; state.appointments.push({ id:id(), doctor:d.name, date:dateKey(new Date(Date.now()+86400000)), time:"09:00", note:"Booking demo", status:"Menunggu pembayaran" }); save(); talk(); toast("Booking demo dibuat."); }
  function readArticle(idv){ const a=articles.find(x=>x.id===idv); if(!a)return; openModal(`<h2 id="modalTitle">${esc(a.title)}</h2><p class="muted">${esc(a.text)}</p>`); }
  function openModal(html){ closeModal(); const tpl=$("#modalTemplate").content.cloneNode(true); $(".modal-body",tpl).innerHTML=html; $(".modal-close",tpl).onclick=closeModal; const back=$(".modal-backdrop",tpl); back.onclick=e=>{ if(e.target===back)closeModal(); }; document.body.appendChild(tpl); }
  function closeModal(){ $(".modal-backdrop")?.remove(); }
  function toast(t){ if(!toastEl)return; toastEl.textContent=t; toastEl.classList.add("show"); clearTimeout(toastEl._t); toastEl._t=setTimeout(()=>toastEl.classList.remove("show"),3000); }

  function productHtml(p){ return `<article class="product-card"><div class="product-img">${p.cat.slice(0,2).toUpperCase()}</div><h3>${esc(p.name)}</h3><p class="muted">${p.cat} - Rating ${p.rate}</p><div class="row">${p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div><div class="between"><span class="price">${idr(p.price)}</span><span class="pill success">${productScore(p)} match</span></div><button class="primary-btn" data-add-product="${p.id}">Tambah</button></article>`; }
  function articleHtml(a){ return `<article class="article-card"><div class="article-img">${a.cat.slice(0,2).toUpperCase()}</div><div class="between"><span class="tag">${a.cat}</span><span class="tag">${a.min} menit</span></div><h3>${esc(a.title)}</h3><p class="muted">${esc(a.text)}</p><button class="primary-btn" data-read="${a.id}">Baca</button></article>`; }
  function doctorHtml(d){ return `<article class="doctor-card"><div class="between"><div class="avatar">DR</div><span class="pill success">${d.rate}</span></div><h3>${esc(d.name)}</h3><p class="muted">${d.role}. Fokus: ${esc(d.focus)}.</p><div class="between"><strong class="price">${idr(d.fee)}</strong><button class="primary-btn" data-book-doctor="${d.id}">Booking</button></div></article>`; }
  function forumHtml(f){ return `<article class="panel"><div class="between"><strong>${esc(f.topic)}</strong><span class="tag">${f.replies.length} balasan</span></div><p class="muted">Oleh ${esc(f.author)} - ${esc(f.body)}</p>${f.replies.map(r=>`<p class="tag">${esc(r)}</p>`).join("")}<button class="secondary-btn" data-reply="${f.id}">Balas</button></article>`; }
  function messageHtml(m){ return `<div class="message ${m.from==="me"?"me":""}"><p>${format(m.text)}</p><small>${esc(m.at||"")}</small></div>`; }
  function appointmentHtml(a){ return `<div class="list-item"><div class="avatar">DR</div><div><strong>${esc(a.doctor)}</strong><p class="muted">${esc(a.date)} ${esc(a.time)} - ${esc(a.note)}</p></div><span class="pill warn">${esc(a.status)}</span></div>`; }
  function analysisRow(a){ return `<div class="list-item"><div class="avatar">${score(a)}</div><div><strong>${dateFmt(a.date)} - ${esc(a.source)}</strong><p class="muted">Moisture ${a.moisture}, Sebum ${a.sebum}, Acne ${a.acne}. ${esc(a.notes||"")}</p></div></div>`; }
  function routineHtml(r){ return `<label class="checkbox"><input type="checkbox" value="${r.id}" ${r.done?"checked":""}> <span><strong>${esc(r.time)}</strong> - ${esc(r.title)}</span></label>`; }
  function range(n,l,v){ return `<label>${l}<input name="${n}" type="range" min="0" max="100" value="${v}"></label>`; }
  function meters(a){ return [["Kelembapan",a.moisture],["Sebum",a.sebum],["Tekstur",a.texture],["Acne risk",a.acne],["Sensitivitas",a.sensitivity]].map(([l,v])=>`<div class="meter"><div class="between"><strong>${l}</strong><span>${v}/100</span></div><div class="meter-bar"><span style="--value:${v}"></span></div></div>`).join(""); }
  function routineRec(a){ const r=[]; if(a.sebum>60)r.push("Gunakan cleanser low pH dan moisturizer gel. Tambahkan niacinamide untuk kontrol sebum."); if(a.moisture<50)r.push("Prioritaskan hidrasi dan barrier repair."); if(a.acne>50)r.push("Hindari scrub keras. Gunakan treatment acne bertahap dan konsultasi bila memburuk."); if(!r.length)r.push("Pertahankan cleanser, moisturizer, sunscreen, dan tracking mingguan."); return `<div class="list">${r.map(x=>`<div class="panel">${esc(x)}</div>`).join("")}</div>`; }
  function bindProduct(){ $$('[data-add-product]').forEach(b=>b.onclick=()=>{ const p=state.cart.find(x=>x.id===b.dataset.addProduct); p?p.qty++:state.cart.push({id:b.dataset.addProduct,qty:1}); save(); toast("Produk masuk keranjang."); }); }
  function cartModal(){ openModal(`<h2 id="modalTitle">Keranjang</h2><div class="list">${state.cart.map(i=>{const p=products.find(x=>x.id===i.id);return p?`<div class="list-item"><div class="avatar">${p.cat[0]}</div><div><strong>${esc(p.name)}</strong><p class="muted">${i.qty} x ${idr(p.price)}</p></div><strong>${idr(i.qty*p.price)}</strong></div>`:"";}).join("")||`<p class="muted">Keranjang kosong.</p>`}</div><hr><div class="between"><strong>Total</strong><strong class="price">${idr(cartTotal())}</strong></div>`); }
  function recommend(){ return products.slice().sort((a,b)=>productScore(b)-productScore(a)); }
  function productScore(p){ let s=0; if(p.type.includes(state.profile.skinType))s+=3; (state.profile.concerns||[]).forEach(c=>{ if(p.issue.includes(c))s++; }); const a=latest(); if(a.sebum>60&&p.issue.includes("oil"))s++; if(a.acne>50&&p.issue.includes("acne"))s++; if(a.moisture<50&&p.issue.includes("dry"))s++; return s; }
  function cartTotal(){ return state.cart.reduce((t,i)=>{const p=products.find(x=>x.id===i.id);return t+(p?p.price*i.qty:0);},0); }
  function latest(){ return state.analyses[state.analyses.length-1] || defaultState.analyses[0]; }
  function score(a){ return clamp(Math.round(a.moisture*.24 + (100-Math.abs(55-a.sebum)*1.25)*.18 + a.texture*.22 + (100-a.acne)*.22 + (100-a.sensitivity)*.14),0,100); }
  function summary(a){ if(a.acne>60)return "Risiko acne sedang tinggi; gunakan rutinitas lembut."; if(a.sebum>68)return "Sebum masih tinggi; pilih produk oil-control yang menjaga barrier."; if(a.moisture<45)return "Kelembapan rendah; fokus hidrasi."; return "Kondisi cukup stabil; tracking berkala membantu rekomendasi."; }
  function completion(){ return state.routine.length ? Math.round(state.routine.filter(r=>r.done).length/state.routine.length*100) : 0; }
  function labelConcern(v){ return ({acne:"Berjerawat",oil:"Sebum tinggi",dry:"Kelembapan rendah",texture:"Tekstur tidak merata",pores:"Pori-pori",redness:"Sensitif/kemerahan"})[v]||v; }
  function options(arr,sel){ return arr.map(x=>{const v=Array.isArray(x)?x[0]:x;const l=Array.isArray(x)?x[1]:x;return `<option value="${v}" ${String(v)===String(sel)?"selected":""}>${l}</option>`;}).join(""); }
  function format(v){ return esc(v).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n{3,}/g,"\n\n").replaceAll("\n","<br>"); }
  function unique(a){ return Array.from(new Set(a.filter(Boolean))); }
  function id(){ return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4); }
  function daysAgo(n){ return new Date(Date.now()-n*86400000).toISOString(); }
  function dateKey(d){ return new Date(d).toISOString().slice(0,10); }
  function timeNow(){ return new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}); }
  function dateFmt(d){ return new Date(d).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}); }
  function idr(v){ return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v); }
  function firstName(n){ return (n||"Pengguna").split(" ")[0]; }
  function clamp(v,min,max){ return Math.min(max,Math.max(min,Number(v))); }
  function esc(v){ return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
})();
