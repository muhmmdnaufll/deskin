(() => {
  "use strict";

  const VERSION = "1.0.6";
  const STORE = "deskin_state_prod_v1";
  const OLD_STORES = ["deskin_state_v1", "deskin_state_v4"];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $("#app");
  const titleEl = $("#pageTitle");
  const navEl = $("#mainNav");
  const toastEl = $("#toast");
  let stream = null;
  let pendingScan = null;

  const nav = [
    ["#/dashboard", "Dashboard", "01"],
    ["#/daily", "SKINDaily", "02"],
    ["#/market", "Rekomendasi Produk", "03"],
    ["#/edu", "SKINEdu", "04"],
    ["#/analyzer", "SKINAnalyzer", "05"],
    ["#/analysis", "SKINAnalysis", "06"],
    ["#/talk", "SKINTalk", "07"],
    ["#/profile", "Profil", "08"]
  ];

  const products = [
    { id:"p1", name:"Cleanser low pH lembut", cat:"Cleanser", range:[45000,120000], type:["oily","sensitive","combination","normal"], issue:["acne","oil","pores","redness"], tags:["low pH","fragrance free","gentle"] },
    { id:"p2", name:"Moisturizer ceramide barrier", cat:"Moisturizer", range:[65000,180000], type:["dry","sensitive","normal","combination"], issue:["dry","redness","texture"], tags:["ceramide","barrier repair","non-comedogenic"] },
    { id:"p3", name:"Sunscreen SPF 50 ringan", cat:"Sunscreen", range:[55000,170000], type:["oily","combination","normal","sensitive"], issue:["uv","oil","redness"], tags:["spf50","broad spectrum","ringan"] },
    { id:"p4", name:"Serum niacinamide", cat:"Serum", range:[55000,160000], type:["oily","combination","normal"], issue:["oil","pores","acne"], tags:["niacinamide","sebum control","pori"] },
    { id:"p5", name:"Hydrating toner / essence", cat:"Toner", range:[45000,145000], type:["dry","normal","sensitive","combination"], issue:["dry","texture","redness"], tags:["hydrating","alcohol free","humektan"] },
    { id:"p6", name:"Eksfoliasi BHA ringan", cat:"Treatment", range:[75000,210000], type:["oily","combination"], issue:["acne","pores","texture","oil"], tags:["BHA","2-3x/minggu","komedo"] },
    { id:"p7", name:"Calming cream centella", cat:"Moisturizer", range:[60000,165000], type:["sensitive","dry","normal"], issue:["redness","dry"], tags:["centella","calming","fragrance free"] },
    { id:"p8", name:"Spot treatment jerawat", cat:"Treatment", range:[35000,120000], type:["oily","combination","normal"], issue:["acne"], tags:["spot care","gunakan malam","targeted"] }
  ];

  const articles = [
    { id:"a1", cat:"Dasar", min:4, title:"Rutinitas pagi yang aman", text:"Fokus pada pembersihan lembut, hidrasi, dan perlindungan UV. Rutinitas yang konsisten lebih penting daripada terlalu banyak produk." },
    { id:"a2", cat:"Masalah Kulit", min:6, title:"Kulit berminyak dan dehidrasi", text:"Kulit dapat memproduksi sebum tinggi tetapi tetap kekurangan air. Gunakan hidrasi ringan dan hindari cleanser yang membuat kulit terasa tertarik." },
    { id:"a3", cat:"Keamanan", min:7, title:"Memakai bahan aktif bertahap", text:"BHA, AHA, retinoid, dan bahan aktif lain sebaiknya dikenalkan perlahan. Hentikan penggunaan bila muncul perih kuat atau iritasi berkepanjangan." },
    { id:"a4", cat:"Lifestyle", min:3, title:"Tidur, stres, dan jerawat", text:"Kurang tidur dan stres dapat memperburuk inflamasi. Catatan harian membantu menemukan pola pemicu pribadi." },
    { id:"a5", cat:"Sunscreen", min:4, title:"Perlindungan UV harian", text:"Gunakan sunscreen setiap pagi dan ulangi bila banyak berkeringat atau terpapar matahari lama. Ini membantu menjaga barrier dan mencegah noda menggelap." },
    { id:"a6", cat:"Pria", min:5, title:"Skincare sederhana untuk pria", text:"Mulai dari face wash lembut, moisturizer, dan sunscreen. Tambahkan treatment hanya bila masalah kulit memang membutuhkan." }
  ];

  const specialists = [
    { id:"s1", title:"Dermatologist", focus:"jerawat, iritasi, kemerahan, kondisi menetap", fee:[120000,300000] },
    { id:"s2", title:"Skincare Consultant", focus:"review rutinitas, pemilihan produk, budget skincare", fee:[50000,150000] },
    { id:"s3", title:"Aesthetic Clinic", focus:"facial, laser, bekas jerawat, tekstur", fee:[150000,600000] }
  ];

  const defaultRoutine = [
    { id:"r1", time:"Pagi", title:"Cleanser lembut", done:false },
    { id:"r2", time:"Pagi", title:"Moisturizer sesuai tipe kulit", done:false },
    { id:"r3", time:"Pagi", title:"Sunscreen SPF 30+", done:false },
    { id:"r4", time:"Malam", title:"Cleanser", done:false },
    { id:"r5", time:"Malam", title:"Treatment sesuai kebutuhan", done:false },
    { id:"r6", time:"Malam", title:"Moisturizer", done:false }
  ];

  const defaultState = {
    version: VERSION,
    authed: false,
    theme: "light",
    profile: { name:"Pengguna", email:"", age:22, gender:"Pria", skinType:"normal", concerns:[], budget:"medium", plan:"Basic" },
    analyses: [],
    routine: defaultRoutine,
    routineHistory: {},
    notes: [],
    savedProducts: [],
    bookmarks: [],
    eduDone: [],
    messages: [],
    appointments: [],
    scanInsight: null
  };

  let state = loadState();
  init();

  function init() {
    OLD_STORES.forEach(key => localStorage.removeItem(key));
    document.documentElement.dataset.theme = state.theme || "light";
    renderNav();
    bindGlobal();
    if (!location.hash) location.hash = state.authed ? "#/dashboard" : "#/welcome";
    window.addEventListener("hashchange", route);
    route();
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
      return { ...structuredClone(defaultState), ...saved, profile:{ ...defaultState.profile, ...(saved.profile || {}) } };
    } catch { return structuredClone(defaultState); }
  }

  function saveState() {
    state.version = VERSION;
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function renderNav() {
    navEl.innerHTML = nav.map(([path,label,icon]) => `<a href="${path}" data-path="${path}"><span class="ico">${icon}</span><span>${label}</span></a>`).join("");
  }

  function bindGlobal() {
    $("#menuBtn")?.addEventListener("click", () => document.body.classList.toggle("menu-open"));
    $("#themeBtn")?.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = state.theme;
      saveState();
    });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }

  function route() {
    stopCamera();
    document.body.classList.remove("menu-open");
    const current = location.hash || "#/welcome";
    $$(".nav a").forEach(a => a.classList.toggle("active", a.dataset.path === current));
    if (!state.authed && !["#/welcome", "#/auth"].includes(current)) { location.hash = "#/welcome"; return; }
    const routes = { "#/welcome":welcome, "#/auth":auth, "#/dashboard":dashboard, "#/daily":daily, "#/market":market, "#/edu":edu, "#/analyzer":analyzer, "#/analysis":analysis, "#/talk":talk, "#/profile":profile };
    (routes[current] || notFound)();
    copyright();
  }

  function setTitle(text) { titleEl.textContent = text; }

  function welcome() {
    setTitle("Selamat datang");
    app.innerHTML = `<section class="container hero"><div><p class="eyebrow">DeSkin Inc.</p><h2>Digital skin assistant untuk rutinitas kulit yang lebih terukur.</h2><p>DeSkin membantu memantau kondisi kulit, menyusun rutinitas, membaca progres, memberi edukasi, dan menyediakan konsultasi berbasis AI dalam satu aplikasi ringan.</p><div class="hero-actions"><a class="primary-btn" href="#/auth">Masuk atau daftar</a><button class="secondary-btn" id="tryApp" type="button">Coba aplikasi tanpa login</button></div></div><div class="device-card"><div class="between"><strong>DeSkin Assisted Detector</strong><span class="pill">Local scan</span></div><div class="device"><span class="device-dot"></span></div><p>Analisis visual lokal untuk membantu memantau kelembapan, sebum, tekstur, sensitivitas, dan progres rutinitas.</p></div></section><p class="footer-note">Versi ${VERSION}. Data pengguna tersimpan lokal di perangkat.</p>`;
    $("#tryApp").onclick = () => { state.authed = true; saveState(); location.hash = "#/dashboard"; };
  }

  function auth() {
    setTitle("Masuk / Daftar");
    app.innerHTML = `<section class="container auth-shell"><div class="card auth-card"><div class="auth-side"><p class="eyebrow">Personalized skincare</p><h2>Bangun rutinitas kulit berdasarkan data kamu.</h2><p>Profil dipakai untuk menyesuaikan rekomendasi, rutinitas, edukasi, dan konsultasi AI.</p></div><form id="authForm" class="auth-form form-grid"><h2>Buat profil</h2><label>Nama<input name="name" required value="${esc(state.profile.name)}" autocomplete="name"></label><label>Email<input name="email" type="email" value="${esc(state.profile.email)}" autocomplete="email"></label><div class="grid two"><label>Usia<input name="age" type="number" min="13" max="80" value="${state.profile.age}"></label><label>Gender<select name="gender">${options(["Pria","Wanita","Lainnya"], state.profile.gender)}</select></label></div><label>Tipe kulit<select name="skinType">${options([["oily","Berminyak"],["dry","Kering"],["normal","Normal"],["combination","Kombinasi"],["sensitive","Sensitif"]], state.profile.skinType)}</select></label><button class="primary-btn" type="submit">Simpan dan masuk</button><button class="ghost-btn" type="button" id="continueNoLogin">Coba aplikasi tanpa login</button></form></div></section>`;
    $("#authForm").onsubmit = e => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); state.profile = { ...state.profile, ...data, age:Number(data.age || 22) }; state.authed = true; saveState(); location.hash = "#/dashboard"; };
    $("#continueNoLogin").onclick = () => { state.authed = true; saveState(); location.hash = "#/dashboard"; };
  }

  function dashboard() {
    setTitle("Dashboard");
    const a = latest(); const s = score(a); const done = completion(); const recs = recommendProducts().slice(0,3);
    app.innerHTML = `<section class="container stack"><div class="hero"><div><p class="eyebrow">Halo, ${esc(firstName(state.profile.name))}</p><h2>${a ? `Skor kulit terakhir ${s}/100.` : "Mulai dengan scan wajah pertama."}</h2><p>${a ? summary(a) : "Scan lokal membantu menyesuaikan rekomendasi rutinitas, produk, edukasi, dan konsultasi AI."}</p><div class="hero-actions"><a class="primary-btn" href="#/analyzer">Scan wajah</a><a class="secondary-btn" href="#/daily">Rutinitas harian</a>${aiBtn("Insight AI","Dashboard","Buat insight singkat berdasarkan profil, rutinitas, dan hasil scan terakhir. Beri 3 prioritas tindakan.")}</div></div><div class="card stack"><div class="between"><div><p class="eyebrow">Skin Health</p><h3 style="margin:0">Ringkasan</h3></div><div class="progress-ring" style="--value:${s}"><strong>${s}</strong></div></div>${meters(a)}</div></div><div class="grid four"><div class="card stat"><span class="tag">Rutinitas hari ini</span><strong>${done}%</strong><small>Konsistensi harian</small></div><div class="card stat"><span class="tag">Analisis</span><strong>${state.analyses.length}</strong><small>Riwayat tersimpan</small></div><div class="card stat"><span class="tag">Produk tersimpan</span><strong>${state.savedProducts.length}</strong><small>Daftar rekomendasi</small></div><div class="card stat"><span class="tag">Tipe kulit</span><strong>${skinLabel(state.profile.skinType)}</strong><small>${concernLabels(state.profile.concerns).join(", ") || "Belum ada fokus"}</small></div></div><div class="grid two"><section class="card stack"><div class="between"><h2>Rutinitas terdekat</h2><a class="ghost-btn" href="#/daily">Kelola</a></div><div class="list">${state.routine.slice(0,4).map(routineHtml).join("")}</div></section><section class="card stack"><div class="between"><h2>Produk prioritas</h2><a class="ghost-btn" href="#/market">Lihat semua</a></div><div class="grid three">${recs.map(productHtml).join("")}</div></section></div></section>`;
    bindAI(); bindProductButtons();
  }

  function daily() {
    setTitle("SKINDaily");
    const done = completion();
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINDaily</p><h2>Progress rutinitas dan catatan kulit</h2><p class="muted">Pantau konsistensi, pemicu, dan perubahan kondisi kulit dari hari ke hari.</p></div><div class="row"><button class="primary-btn" id="saveRoutine">Simpan progres hari ini</button>${aiBtn("Rutinitas AI","SKINDaily","Susun rutinitas pagi dan malam selama 14 hari berdasarkan hasil scan terakhir dan produk yang direkomendasikan.")}</div></div><div class="grid three"><div class="card stack"><p class="eyebrow">Completion</p><div class="progress-ring" style="--value:${done}"><strong>${done}%</strong></div><p class="muted">Target realistis: konsisten, tidak berlebihan.</p></div><div class="card stack"><p class="eyebrow">Reminder</p><label>Pagi<input id="morningReminder" type="time" value="07:00"></label><label>Malam<input id="nightReminder" type="time" value="21:00"></label><button class="secondary-btn" id="enableReminder">Aktifkan notifikasi</button></div><div class="card stack"><p class="eyebrow">Catatan harian</p><textarea id="dailyNote" placeholder="Contoh: kurang tidur, olahraga, produk baru, breakout..."></textarea><button class="secondary-btn" id="addNote">Simpan catatan</button></div></div><div class="grid two"><section class="card stack"><div class="between"><h2>Checklist hari ini</h2><button id="addRoutine" class="ghost-btn">Tambah step</button></div><div id="routineList" class="list">${state.routine.map(routineHtml).join("")}</div></section><section class="card stack"><h2>Catatan terakhir</h2><div class="list">${notesHtml()}</div></section></div></section>`;
    bindAI();
    $("#routineList").onchange = e => { if (!e.target.matches("input[type=checkbox]")) return; state.routine = state.routine.map(item => item.id === e.target.value ? { ...item, done:e.target.checked } : item); saveState(); daily(); };
    $("#addRoutine").onclick = () => promptModal("Tambah step rutinitas", [{name:"time",label:"Waktu",value:"Pagi"},{name:"title",label:"Nama step"}], data => { if (!data.title) return; state.routine.push({ id:id(), time:data.time || "Custom", title:data.title, done:false }); saveState(); daily(); });
    $("#saveRoutine").onclick = () => { const key = dateKey(new Date()); state.routineHistory[key] = { completion:completion(), routine:state.routine, savedAt:new Date().toISOString() }; state.routine = state.routine.map(item => ({ ...item, done:false })); saveState(); daily(); toast("Progress tersimpan."); };
    $("#addNote").onclick = () => { const text = $("#dailyNote").value.trim(); if (!text) return toast("Catatan masih kosong."); state.notes.unshift({ id:id(), text, at:new Date().toISOString() }); saveState(); daily(); };
    $("#enableReminder").onclick = async () => { if (!("Notification" in window)) return toast("Browser belum mendukung notifikasi."); const p = await Notification.requestPermission(); toast(p === "granted" ? "Notifikasi aktif." : "Notifikasi belum diizinkan."); };
  }

  function market() {
    setTitle("Rekomendasi Produk");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINMarket</p><h2>Rekomendasi produk dan estimasi harga pasar</h2><p class="muted">Urutan produk disesuaikan dengan profil, masalah utama, dan hasil scan terakhir. Harga adalah estimasi rentang pasar Indonesia dan dapat berubah.</p></div><div class="row"><button class="primary-btn" id="priceAi">Validasi dengan AI</button>${aiBtn("Strategi produk AI","SKINMarket","Dari daftar rekomendasi produk dan hasil scan terakhir, pilih urutan pembelian paling hemat dan aman.")}</div></div><div class="card row"><input id="productSearch" placeholder="Cari cleanser, sunscreen, serum..."><select id="productIssue"><option value="all">Semua masalah</option><option value="acne">Jerawat</option><option value="oil">Minyak</option><option value="dry">Kering</option><option value="pores">Pori</option><option value="redness">Kemerahan</option><option value="texture">Tekstur</option></select><select id="productBudget"><option value="all">Semua harga</option><option value="low">Hemat</option><option value="medium">Menengah</option><option value="high">Premium</option></select></div><div id="productGrid" class="grid four"></div><section class="card stack"><h2>Produk tersimpan</h2><div class="list">${savedProductsHtml()}</div></section></section>`;
    const render = () => { const q = $("#productSearch").value.toLowerCase(); const issue = $("#productIssue").value; const budget = $("#productBudget").value; const list = recommendProducts().filter(p => (p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q) || p.tags.join(" ").toLowerCase().includes(q)) && (issue === "all" || p.issue.includes(issue)) && budgetMatch(p,budget)); $("#productGrid").innerHTML = list.map(productHtml).join("") || `<p class="muted">Produk tidak ditemukan.</p>`; bindProductButtons(); };
    $("#productSearch").oninput = render; $("#productIssue").onchange = render; $("#productBudget").onchange = render;
    $("#priceAi").onclick = () => askProductPriceAI();
    render(); bindAI();
  }

  function edu() {
    setTitle("SKINEdu");
    const cats = ["Semua", ...Array.from(new Set(articles.map(a => a.cat)))];
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINEdu</p><h2>Edukasi skincare yang mudah dipahami</h2><p class="muted">Materi singkat untuk membantu memilih rutinitas secara aman dan konsisten.</p></div><div class="row"><button class="primary-btn" id="startQuiz">Mulai quiz</button>${aiBtn("Materi AI","SKINEdu","Buat materi edukasi paling relevan dengan hasil scan terakhir dan masalah utama pengguna.")}</div></div><div class="tabs" id="eduTabs">${cats.map((c,i)=>`<button class="tab-btn ${i===0?"active":""}" data-cat="${c}">${c}</button>`).join("")}</div><div id="articleGrid" class="grid three"></div></section>`;
    const render = (cat="Semua") => { const list = cat === "Semua" ? articles : articles.filter(a => a.cat === cat); $("#articleGrid").innerHTML = list.map(articleHtml).join(""); $$('[data-read]').forEach(btn => btn.onclick = () => readArticle(btn.dataset.read)); };
    $("#eduTabs").onclick = e => { const btn = e.target.closest("button[data-cat]"); if (!btn) return; $$("#eduTabs .tab-btn").forEach(b => b.classList.remove("active")); btn.classList.add("active"); render(btn.dataset.cat); };
    $("#startQuiz").onclick = showQuiz; render(); bindAI();
  }

  function analyzer() {
    setTitle("SKINAnalyzer");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINAnalyzer</p><h2>Scan wajah dan simpan hasil analisis</h2><p class="muted">Foto diproses secara lokal di browser. Hasil scan dipakai untuk menyesuaikan rekomendasi fitur lain.</p></div>${aiBtn("Tips scan AI","SKINAnalyzer","Berikan instruksi ringkas agar hasil scan wajah lebih stabil dan mudah diterima.")}</div><div class="grid two"><section class="card stack"><div id="cameraBox" class="camera-box"><div class="stack" style="text-align:center;padding:22px"><h3>Preview kamera</h3><p class="muted">Gunakan cahaya depan, wajah di tengah, dan jarak tidak terlalu dekat.</p></div><span class="capture-overlay"></span></div><div class="row"><button id="startCamera" class="primary-btn">Buka kamera</button><button id="capturePhoto" class="secondary-btn">Capture</button><label class="ghost-btn" style="cursor:pointer">Upload foto<input id="photoUpload" type="file" accept="image/*" hidden></label></div></section><section class="card stack"><div><p class="eyebrow">Hasil scan</p><h2>Analisis lokal</h2><p class="muted">Hasil baru dapat disimpan setelah gambar lolos validasi wajah/kulit.</p></div><div id="scanResultBody" class="stack">${emptyScanHtml()}</div><button id="saveScan" class="primary-btn" disabled>Simpan hasil scan</button></section></div></section>`;
    bindAI(); $("#startCamera").onclick = startCamera; $("#capturePhoto").onclick = capturePhoto; $("#photoUpload").onchange = previewUpload; $("#saveScan").onclick = saveScan;
  }

  function analysis() {
    setTitle("SKINAnalysis");
    const a = latest();
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINAnalysis</p><h2>Hasil analisis personal</h2><p class="muted">Parameter kulit, ringkasan kondisi, dan rekomendasi berbasis hasil scan.</p></div><div class="row"><a class="primary-btn" href="#/analyzer">Scan baru</a>${aiBtn("Analisis AI","SKINAnalysis","Jelaskan hasil parameter kulit terakhir, risiko utama, langkah 14 hari, dan kapan harus konsultasi ahli. Jangan diagnosis medis.")}</div></div>${a ? `<div class="grid three"><div class="card stack"><p class="eyebrow">Skin score</p><div class="progress-ring" style="--value:${score(a)}"><strong>${score(a)}</strong></div><p class="muted">${summary(a)}</p></div><div class="card stack"><p class="eyebrow">Scan terakhir</p><h2>${dateFmt(a.date)}</h2><p class="muted">${esc(a.notes || "Hasil tersimpan.")}</p></div><div class="card stack"><p class="eyebrow">Fokus</p><h2>${concernLabels(state.profile.concerns).join(", ") || "Stabil"}</h2><p class="muted">Tipe kulit: ${skinLabel(state.profile.skinType)}</p></div></div><div class="grid two"><section class="card stack"><h2>Parameter</h2>${meters(a)}</section><section class="card stack"><h2>Rekomendasi rutinitas</h2>${routineRec(a)}<h3>Produk prioritas</h3><div class="grid two">${recommendProducts().slice(0,4).map(productHtml).join("")}</div></section></div>` : `<section class="card stack"><h2>Belum ada hasil scan</h2><p class="muted">Mulai dari SKINAnalyzer untuk membuat rekomendasi lebih personal.</p><a class="primary-btn" href="#/analyzer">Mulai scan</a></section>`}<section class="card stack"><h2>Riwayat analisis</h2><div class="list">${state.analyses.length ? state.analyses.slice().reverse().map(analysisRow).join("") : `<p class="muted">Belum ada riwayat.</p>`}</div></section></section>`;
    bindAI(); bindProductButtons();
  }

  function talk() {
    setTitle("SKINTalk");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINTalk</p><h2>Konsultasi dan diskusi</h2><p class="muted">Gunakan chat AI untuk arahan awal dan jadwalkan konsultasi bila membutuhkan bantuan ahli.</p></div><button id="clearChat" class="ghost-btn">Bersihkan chat</button></div><div class="grid three">${specialists.map(specialistHtml).join("")}</div><div class="grid two"><section class="card stack"><div class="between"><h2>Chat konsultasi AI</h2><span class="pill success">Online</span></div><div id="chatBox" class="chat-box">${state.messages.length ? state.messages.map(messageHtml).join("") : `<p class="muted">Mulai percakapan dengan menjelaskan kondisi kulit atau rutinitas yang sedang digunakan.</p>`}</div><form id="chatForm" class="row"><input name="text" placeholder="Tulis pertanyaan..." required><button class="primary-btn" type="submit">Kirim</button></form></section><section class="card stack"><h2>Jadwal konsultasi</h2><div class="list">${state.appointments.length ? state.appointments.map(appointmentHtml).join("") : `<p class="muted">Belum ada jadwal konsultasi.</p>`}</div></section></div></section>`;
    bindTalk();
  }

  function profile() {
    setTitle("Profil");
    app.innerHTML = `<section class="container stack"><div><p class="eyebrow">Profil dan pengaturan</p><h2>Preferensi pengguna</h2><p class="muted">Data profil dipakai untuk personalisasi rekomendasi dan dapat diperbarui kapan saja.</p></div><div class="grid two"><form id="profileForm" class="card form-grid"><h2>Data pribadi</h2><label>Nama<input name="name" value="${esc(state.profile.name)}" required></label><label>Email<input name="email" type="email" value="${esc(state.profile.email)}"></label><div class="grid two"><label>Usia<input name="age" type="number" value="${state.profile.age}"></label><label>Gender<select name="gender">${options(["Pria","Wanita","Lainnya"], state.profile.gender)}</select></label></div><label>Tipe kulit<select name="skinType">${options([["oily","Berminyak"],["dry","Kering"],["normal","Normal"],["combination","Kombinasi"],["sensitive","Sensitif"]], state.profile.skinType)}</select></label><label>Budget produk<select name="budget">${options([["low","Hemat"],["medium","Menengah"],["high","Premium"]], state.profile.budget)}</select></label><fieldset class="card" style="box-shadow:none"><legend>Fokus kulit</legend><div class="grid two">${["acne","oil","dry","pores","redness","texture","uv"].map(issue=>`<label class="checkbox"><input type="checkbox" name="concerns" value="${issue}" ${state.profile.concerns.includes(issue)?"checked":""}> ${concernLabel(issue)}</label>`).join("")}</div></fieldset><button class="primary-btn">Simpan profil</button></form><section class="stack"><div class="card stack"><h2>Akun</h2><p class="muted">Data tersimpan lokal di perangkat. Gunakan export browser atau sinkronisasi server bila aplikasi dikembangkan lebih lanjut.</p><div class="row"><button id="resetData" class="danger-btn">Reset data</button><button id="logout" class="ghost-btn">Keluar</button>${aiBtn("Evaluasi profil AI","Profil","Evaluasi profil dan saran data yang perlu ditambahkan berdasarkan hasil scan terakhir.")}</div></div><div class="card stack"><h2>Ringkasan</h2>${aSummaryHtml()}</div></section></div></section>`;
    bindAI(); $("#profileForm").onsubmit = e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const data = Object.fromEntries(fd); state.profile = { ...state.profile, ...data, age:Number(data.age || state.profile.age), concerns:fd.getAll("concerns") }; saveState(); toast("Profil diperbarui."); profile(); };
    $("#resetData").onclick = () => { if (!confirm("Reset seluruh data aplikasi?")) return; localStorage.removeItem(STORE); state = structuredClone(defaultState); state.authed = true; saveState(); profile(); };
    $("#logout").onclick = () => { state.authed = false; saveState(); location.hash = "#/welcome"; };
  }

  function notFound() { setTitle("Tidak ditemukan"); app.innerHTML = `<section class="container card"><h2>Halaman tidak ditemukan</h2><a class="primary-btn" href="#/dashboard">Dashboard</a></section>`; }

  async function analyzeImage(dataUrl) {
    const img = await loadImage(dataUrl); const size = 224; const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size; const ctx = canvas.getContext("2d", { willReadFrequently:true }); const fit = coverFit(img.width,img.height,size,size); ctx.drawImage(img,fit.sx,fit.sy,fit.sw,fit.sh,0,0,size,size); const data = ctx.getImageData(0,0,size,size).data; let skin=0, red=0, shine=0, dark=0, sum=0, edge=0, edgeN=0, rsum=0, gsum=0, bsum=0, r2=0, g2=0, b2=0, minX=size,minY=size,maxX=0,maxY=0;
    for (let y=1;y<size-1;y++) for (let x=1;x<size-1;x++) { const i=(y*size+x)*4; const r=data[i], g=data[i+1], b=data[i+2]; const hsv=rgbToHsv(r,g,b), yc=rgbToYcbcr(r,g,b); const bright=(r+g+b)/3; const next=(y*size+x+1)*4, down=((y+1)*size+x)*4; const grad=(Math.abs(r-data[next])+Math.abs(g-data[next+1])+Math.abs(b-data[next+2])+Math.abs(r-data[down])+Math.abs(g-data[down+1])+Math.abs(b-data[down+2]))/6; edge+=grad; edgeN++; if (!skinLike(r,g,b,hsv,yc)) continue; skin++; sum+=bright; rsum+=r; gsum+=g; bsum+=b; r2+=r*r; g2+=g*g; b2+=b*b; if (r>g*1.1 && r>b*1.18 && hsv.s>.22 && bright>68) red++; if (bright>190 && hsv.s<.34) shine++; if (bright<76) dark++; minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y); }
    const total=(size-2)*(size-2), n=Math.max(1,skin), ratio=skin/total, avg=sum/n, edgeD=edge/Math.max(1,edgeN), ar=((maxX-minX+1)*(maxY-minY+1))/(size*size); const avR=rsum/n,avG=gsum/n,avB=bsum/n; const std=Math.sqrt(Math.max(0,(r2/n-avR*avR+g2/n-avG*avG+b2/n-avB*avB)/3)); const plain=ratio>.82 && std<14 && edgeD<6.5; const ok=ratio>.08 && ar>.10 && edgeD>3.2 && avg>42 && avg<240 && !plain; const confidence=clamp(42+ratio*26+Math.min(22,ar*24)+Math.min(18,std)+Math.min(18,edgeD),0,94);
    if (!ok || confidence<50) return { ok:false, confidence:Math.round(confidence), reason: plain ? "Gambar terlalu polos untuk dianalisis." : "Wajah atau area kulit belum cukup jelas." };
    const textureNoise=clamp(edgeD,0,65), uneven=clamp(std*2,0,100), redness=clamp(red/n*300,0,100), oil=clamp(shine/n*270,0,100), dull=clamp((124-avg)*.82+dark/n*36,0,100); const res={ moisture:clamp(70-dull*.44-textureNoise*.14+(avg>145?4:0),18,92), sebum:clamp(32+oil*.66+Math.max(0,avg-155)*.16,10,94), texture:clamp(84-textureNoise*.78-uneven*.16,18,96), acne:clamp(16+redness*.64+Math.max(0,uneven-28)*.24+Math.max(0,textureNoise-16)*.30,5,92), sensitivity:clamp(15+redness*.57+Math.max(0,uneven-25)*.16,5,88) };
    return { ok:true, confidence:Math.round(confidence), ...Object.fromEntries(Object.entries(res).map(([k,v])=>[k,Math.round(v)])) };
  }

  function renderScanResult(scan) {
    pendingScan = scan;
    const insight = deriveInsight(scan);
    $("#scanResultBody").innerHTML = `<div class="panel"><div class="between"><strong>Scan diterima</strong><span class="pill success">${scan.confidence}%</span></div><p class="muted">${esc(insight.summary)}</p><div class="row">${insight.concerns.map(c=>`<span class="tag">${concernLabel(c)}</span>`).join("") || `<span class="tag">Stabil</span>`}</div></div>${meters(scan)}<p class="muted">Hasil adalah estimasi visual edukatif, bukan diagnosis medis.</p>`;
    $("#saveScan").disabled = false;
  }

  function rejectScan(message, confidence) {
    pendingScan = null; $("#scanResultBody").innerHTML = `<div class="panel"><strong>Scan belum dapat diproses</strong><p class="muted">${esc(message)} ${confidence ? `Confidence ${confidence}%.` : ""}</p></div>`; $("#saveScan").disabled = true;
  }

  async function startCamera() { try { stopCamera(); stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"user" }, audio:false }); $("#cameraBox").innerHTML = `<video id="videoPreview" autoplay playsinline muted></video><span class="capture-overlay"></span>`; $("#videoPreview").srcObject = stream; } catch { toast("Kamera tidak dapat dibuka."); } }
  async function capturePhoto() { const video = $("#videoPreview"); if (!video) return toast("Buka kamera lebih dulu."); const canvas = document.createElement("canvas"); canvas.width=video.videoWidth||720; canvas.height=video.videoHeight||720; const ctx=canvas.getContext("2d"); ctx.translate(canvas.width,0); ctx.scale(-1,1); ctx.drawImage(video,0,0,canvas.width,canvas.height); const dataUrl=canvas.toDataURL("image/jpeg",.84); $("#cameraBox").innerHTML = `<img src="${dataUrl}" alt="Foto scan wajah"><span class="capture-overlay"></span>`; stopCamera(); const scan = await analyzeImage(dataUrl); scan.ok ? renderScanResult(scan) : rejectScan(scan.reason, scan.confidence); }
  function previewUpload(e) { const file=e.target.files && e.target.files[0]; if (!file) return; const reader=new FileReader(); reader.onload=async()=>{ const dataUrl=String(reader.result); $("#cameraBox").innerHTML = `<img src="${dataUrl}" alt="Foto scan wajah"><span class="capture-overlay"></span>`; const scan=await analyzeImage(dataUrl); scan.ok ? renderScanResult(scan) : rejectScan(scan.reason, scan.confidence); }; reader.readAsDataURL(file); }
  function saveScan() { if (!pendingScan) return; const insight = deriveInsight(pendingScan); const row = { id:id(), date:new Date().toISOString(), ...pendingScan, source:"Local scan", notes:insight.summary }; delete row.ok; state.analyses.push(row); state.scanInsight = { ...insight, updatedAt:new Date().toISOString(), confidence:pendingScan.confidence }; state.profile.concerns = unique([...insight.concerns, ...state.profile.concerns]).slice(0,7); state.profile.skinType = insight.skinType; saveState(); pendingScan=null; location.hash = "#/analysis"; }
  function stopCamera() { if (stream) { stream.getTracks().forEach(t=>t.stop()); stream=null; } }

  function bindTalk() { $$('[data-book]').forEach(btn => btn.onclick = () => bookConsult(btn.dataset.book)); $("#clearChat").onclick = () => { state.messages=[]; saveState(); talk(); }; $("#chatForm").onsubmit = async e => { e.preventDefault(); const input=e.currentTarget.querySelector('input[name="text"]'); const button=e.currentTarget.querySelector('button'); const text=input.value.trim(); if (!text) return; input.value=""; button.disabled=true; button.textContent="Menjawab..."; state.messages.push({ from:"me", text, at:timeNow() }); const loading={ id:id(), from:"consultant", text:"DeSkin AI sedang menyusun jawaban...", at:timeNow() }; state.messages.push(loading); saveState(); talk(); try { const answer = await askAI(contextPrompt(text), "SKINTalk"); state.messages = state.messages.filter(m=>m.id!==loading.id); state.messages.push({ from:"consultant", text:answer, at:timeNow() }); } catch (err) { state.messages = state.messages.filter(m=>m.id!==loading.id); state.messages.push({ from:"consultant", text:"AI sedang tidak dapat diakses. Periksa koneksi dan konfigurasi API.", at:timeNow() }); } saveState(); talk(); }; const box=$("#chatBox"); if (box) box.scrollTop=box.scrollHeight; }
  function bindAI() { $$('[data-ai]').forEach(btn => btn.onclick = async () => { openModal(`<h2 id="modalTitle">${esc(btn.textContent)}</h2><div class="ai-output"><p>DeSkin AI sedang menyusun jawaban...</p></div>`); try { const answer = await askAI(contextPrompt(btn.dataset.prompt || "Berikan insight personal."), btn.dataset.feature || "general"); $(".modal-body .ai-output").innerHTML = `<p>${formatText(answer)}</p><button class="secondary-btn copy-ai-answer">Salin jawaban</button>`; $(".copy-ai-answer").onclick = () => navigator.clipboard?.writeText(answer); } catch (err) { $(".modal-body .ai-output").innerHTML = `<p>${esc(err.message || "AI belum tersedia.")}</p>`; } }); }
  function bindProductButtons() { $$('[data-save-product]').forEach(btn => btn.onclick = () => { const idp=btn.dataset.saveProduct; if (!state.savedProducts.includes(idp)) state.savedProducts.push(idp); saveState(); toast("Produk tersimpan."); if (location.hash === "#/market") market(); }); }

  async function askAI(message, feature="general") { const res=await fetch("/api/ai", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ message, feature }) }); const data=await res.json().catch(()=>({})); if (!res.ok || !data.ok) throw new Error(data.error || "AI belum memberi jawaban."); return data.answer || "AI belum memberi jawaban."; }
  async function askProductPriceAI() { const payload = recommendProducts().slice(0,8).map(p => ({ name:p.name, category:p.cat, estimate:`${idr(p.range[0])}-${idr(p.range[1])}`, tags:p.tags })); openModal(`<h2 id="modalTitle">Validasi rekomendasi produk</h2><div class="ai-output"><p>AI sedang meninjau kategori produk dan estimasi harga...</p></div>`); try { const answer = await askAI(`Tinjau rekomendasi produk berikut. Jangan mengarang toko atau harga pasti. Beri validasi apakah rentang harga masuk akal untuk pasar skincare Indonesia, lalu urutan prioritas pembelian yang aman. Data: ${JSON.stringify(payload)}`, "SKINMarket"); $(".modal-body .ai-output").innerHTML = `<p>${formatText(answer)}</p>`; } catch (err) { $(".modal-body .ai-output").innerHTML = `<p>${esc(err.message || "AI belum tersedia.")}</p>`; } }
  function contextPrompt(task) { return `Profil: ${JSON.stringify(state.profile)}\nHasil scan terakhir: ${JSON.stringify(latest())}\nFokus scan: ${JSON.stringify(state.scanInsight)}\nProduk rekomendasi: ${JSON.stringify(recommendProducts().slice(0,5))}\nTugas: ${task}`; }

  function productHtml(p) { const match=productScore(p); return `<article class="product-card"><div class="product-img">${esc(p.cat.slice(0,2).toUpperCase())}</div><div><h3>${esc(p.name)}</h3><p class="muted">${esc(p.cat)} · estimasi ${idr(p.range[0])} - ${idr(p.range[1])}</p></div><div class="row">${p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div><div class="between"><span class="price">${match} match</span><span class="pill ${match>=4?"success":""}">${budgetLabel(p)}</span></div><button class="primary-btn" data-save-product="${p.id}">Simpan rekomendasi</button></article>`; }
  function articleHtml(a) { return `<article class="article-card"><div class="article-img">${esc(a.cat.slice(0,2).toUpperCase())}</div><div class="between"><span class="tag">${esc(a.cat)}</span><span class="tag">${a.min} menit</span></div><h3>${esc(a.title)}</h3><p class="muted">${esc(a.text)}</p><button class="primary-btn" data-read="${a.id}">Baca</button></article>`; }
  function specialistHtml(s) { return `<article class="doctor-card"><div class="between"><div class="avatar">${esc(s.title[0])}</div><span class="pill success">Tersedia</span></div><h3>${esc(s.title)}</h3><p class="muted">Fokus: ${esc(s.focus)}.</p><div class="between"><strong class="price">${idr(s.fee[0])}-${idr(s.fee[1])}</strong><button class="primary-btn" data-book="${s.id}">Jadwalkan</button></div></article>`; }
  function routineHtml(r) { return `<label class="checkbox"><input type="checkbox" value="${r.id}" ${r.done?"checked":""}> <span><strong>${esc(r.time)}</strong> - ${esc(r.title)}</span></label>`; }
  function messageHtml(m) { return `<div class="message ${m.from === "me" ? "me" : ""}">${formatText(m.text)}<small>${esc(m.at)}</small></div>`; }
  function analysisRow(a) { return `<div class="list-item"><div class="avatar">${score(a)}</div><div><strong>${dateFmt(a.date)} - ${esc(a.source)}</strong><p class="muted">Moisture ${a.moisture}, Sebum ${a.sebum}, Acne ${a.acne}. ${esc(a.notes || "")}</p></div><span class="tag">${summaryLabel(a)}</span></div>`; }
  function appointmentHtml(row) { return `<div class="list-item"><div class="avatar">${esc(row.type[0])}</div><div><strong>${esc(row.type)}</strong><p class="muted">${dateFmt(row.date)} ${esc(row.time)} - ${esc(row.note)}</p></div><span class="pill warn">${esc(row.status)}</span></div>`; }

  function readArticle(idv) { const a=articles.find(x=>x.id===idv); if (!a) return; openModal(`<p class="eyebrow">${esc(a.cat)} - ${a.min} menit</p><h2 id="modalTitle">${esc(a.title)}</h2><p>${esc(a.text)}</p><button id="finishArticle" class="primary-btn">Tandai selesai</button>`); $("#finishArticle").onclick = () => { if (!state.eduDone.includes(idv)) state.eduDone.push(idv); saveState(); closeModal(); }; }
  function showQuiz() { openModal(`<h2 id="modalTitle">Quiz SKINEdu</h2><form id="quizForm" class="form-grid"><label>Tahap wajib pagi hari<select name="q1"><option>Serum mahal</option><option>Sunscreen</option><option>Scrub keras</option></select></label><label>Saat kulit terasa terbakar setelah produk aktif<select name="q2"><option>Lanjutkan lebih sering</option><option>Hentikan dan evaluasi</option><option>Campur semua aktif</option></select></label><button class="primary-btn">Lihat skor</button></form>`); $("#quizForm").onsubmit=e=>{ e.preventDefault(); const d=Object.fromEntries(new FormData(e.currentTarget)); const sc=(d.q1==="Sunscreen")+(d.q2==="Hentikan dan evaluasi"); closeModal(); toast(`Skor quiz: ${sc}/2`); }; }
  function bookConsult(idv) { const s=specialists.find(x=>x.id===idv); if (!s) return; promptModal(`Jadwalkan ${s.title}`, [{name:"date",label:"Tanggal",type:"date",value:dateKey(new Date(Date.now()+86400000))},{name:"time",label:"Jam",value:"19:00"},{name:"note",label:"Keluhan singkat"}], data => { state.appointments.push({ id:id(), type:s.title, date:data.date, time:data.time, note:data.note, status:"Menunggu konfirmasi" }); saveState(); talk(); }); }
  function promptModal(title, fields, onSubmit) { openModal(`<h2 id="modalTitle">${esc(title)}</h2><form id="promptForm" class="form-grid">${fields.map(f=>`<label>${esc(f.label)}<input name="${esc(f.name)}" type="${f.type || "text"}" value="${esc(f.value || "")}" ${f.name==="title"||f.name==="note"?"required":""}></label>`).join("")}<button class="primary-btn">Simpan</button></form>`); $("#promptForm").onsubmit=e=>{ e.preventDefault(); const data=Object.fromEntries(new FormData(e.currentTarget)); closeModal(); onSubmit(data); }; }

  function emptyScanHtml(){ return `<div class="panel"><strong>Belum ada hasil scan.</strong><p class="muted">Ambil foto wajah atau upload gambar wajah yang jelas.</p></div>`; }
  function latest(){ return state.analyses[state.analyses.length-1] || null; }
  function meters(a){ const safe=a || {moisture:0,sebum:0,texture:0,acne:0,sensitivity:0}; return [["Kelembapan",safe.moisture,"lebih tinggi lebih baik"],["Sebum",safe.sebum,"target seimbang"],["Tekstur",safe.texture,"lebih tinggi lebih rata"],["Acne risk",safe.acne,"lebih rendah lebih baik"],["Sensitivitas",safe.sensitivity,"lebih rendah lebih baik"]].map(([l,v,h])=>`<div class="meter"><div class="between"><strong>${l}</strong><span>${v}/100</span></div><div class="meter-bar"><span style="--value:${v}"></span></div><small class="muted">${h}</small></div>`).join(""); }
  function score(a){ if (!a) return 0; const sebum=100-Math.abs(55-a.sebum)*1.25; return clamp((a.moisture*.24)+(sebum*.18)+(a.texture*.22)+((100-a.acne)*.22)+((100-a.sensitivity)*.14),0,100); }
  function summary(a){ if (!a) return "Belum ada hasil scan."; if (a.acne>60) return "Risiko jerawat terlihat meningkat; prioritaskan rutinitas lembut dan hindari menumpuk bahan aktif."; if (a.sebum>68) return "Sebum relatif tinggi; pilih tekstur ringan dan produk oil-control yang tetap menjaga barrier."; if (a.moisture<45) return "Kelembapan rendah; fokus pada hidrasi dan perbaikan barrier."; if (score(a)>75) return "Kondisi terlihat stabil; pertahankan rutinitas dan perlindungan UV."; return "Kondisi cukup stabil; tracking berkala membantu rekomendasi lebih akurat."; }
  function summaryLabel(a){ const s=score(a); return s>=80?"Stabil":s>=65?"Baik":s>=50?"Perlu perhatian":"Butuh konsultasi"; }
  function completion(){ return state.routine.length ? Math.round(state.routine.filter(r=>r.done).length/state.routine.length*100) : 0; }
  function deriveInsight(a){ const concerns=[]; if(a.acne>=50) concerns.push("acne"); if(a.sebum>=62) concerns.push("oil"); if(a.moisture<=48) concerns.push("dry"); if(a.texture<=58) concerns.push("texture"); if(a.sebum>=62&&a.texture<=64) concerns.push("pores"); if(a.sensitivity>=42) concerns.push("redness"); let skinType="normal"; if(a.sensitivity>=55) skinType="sensitive"; else if(a.sebum>=65&&a.moisture<=52) skinType="combination"; else if(a.sebum>=60) skinType="oily"; else if(a.moisture<=45) skinType="dry"; return { concerns:unique(concerns), skinType, summary:concerns.length?`Fokus utama: ${concerns.map(concernLabel).join(", ")}.`:"Kondisi terlihat cukup stabil." }; }
  function routineRec(a){ if(!a) return `<p class="muted">Scan wajah untuk rekomendasi yang lebih personal.</p>`; const r=[]; if(a.sebum>60) r.push("Gunakan cleanser low pH dan moisturizer ringan. Pertimbangkan niacinamide untuk kontrol sebum."); if(a.moisture<50) r.push("Tambahkan hidrasi ringan dan moisturizer barrier repair."); if(a.acne>50) r.push("Hindari scrub keras. Gunakan treatment jerawat bertahap dan evaluasi iritasi."); if(a.sensitivity>45) r.push("Pilih produk fragrance free dan lakukan patch test."); if(!r.length) r.push("Pertahankan rutinitas dasar: cleanser, moisturizer, sunscreen, dan tracking mingguan."); return `<div class="list">${r.map(x=>`<div class="panel">${esc(x)}</div>`).join("")}</div>`; }
  function productScore(p){ let s=0; if(p.type.includes(state.profile.skinType)) s+=3; for(const issue of state.profile.concerns||[]) if(p.issue.includes(issue)) s+=1; const a=latest(); if(a){ if(a.sebum>60&&p.issue.includes("oil"))s+=1; if(a.acne>50&&p.issue.includes("acne"))s+=1; if(a.moisture<50&&p.issue.includes("dry"))s+=1; if(a.sensitivity>45&&p.issue.includes("redness"))s+=1; } return s; }
  function recommendProducts(){ return [...products].sort((a,b)=>productScore(b)-productScore(a)); }
  function budgetMatch(p,b){ if(b==="all") return true; const avg=(p.range[0]+p.range[1])/2; return b==="low"?avg<=90000:b==="medium"?avg<=160000:avg>130000; }
  function budgetLabel(p){ const avg=(p.range[0]+p.range[1])/2; return avg<=90000?"Hemat":avg<=160000?"Menengah":"Premium"; }
  function savedProductsHtml(){ const list=state.savedProducts.map(idp=>products.find(p=>p.id===idp)).filter(Boolean); return list.length?list.map(p=>`<div class="list-item"><div class="avatar">${p.cat[0]}</div><div><strong>${esc(p.name)}</strong><p class="muted">${idr(p.range[0])} - ${idr(p.range[1])}</p></div><button class="ghost-btn" data-remove-saved="${p.id}">Hapus</button></div>`).join(""):"<p class='muted'>Belum ada produk tersimpan.</p>"; }
  function notesHtml(){ return state.notes.length?state.notes.slice(0,5).map(n=>`<div class="panel"><strong>${dateFmt(n.at)}</strong><p class="muted">${esc(n.text)}</p></div>`).join(""):"<p class='muted'>Belum ada catatan.</p>"; }
  function aSummaryHtml(){ const a=latest(); return `<p class="muted">${a?summary(a):"Belum ada scan tersimpan."}</p><div class="row"><span class="tag">${skinLabel(state.profile.skinType)}</span>${(state.profile.concerns||[]).map(c=>`<span class="tag">${concernLabel(c)}</span>`).join("")}</div>`; }

  function loadImage(src){ return new Promise((res,rej)=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=()=>rej(new Error("Gambar tidak dapat dibaca.")); img.src=src; }); }
  function coverFit(sw,sh,dw,dh){ const scale=Math.max(dw/sw,dh/sh); const w=dw/scale,h=dh/scale; return { sx:(sw-w)/2, sy:(sh-h)/2, sw:w, sh:h }; }
  function skinLike(r,g,b,h,y){ const rgb=r>42&&g>30&&b>18&&r>b&&r>=g*.72&&Math.max(r,g,b)-Math.min(r,g,b)>8; const hsv=h.h>=0&&h.h<=62&&h.s>=.08&&h.s<=.78&&h.v>=.18; const yc=y.cb>=72&&y.cb<=142&&y.cr>=124&&y.cr<=188; return (rgb&&hsv)||(yc&&h.v>.23); }
  function rgbToHsv(r,g,b){ r/=255;g/=255;b/=255; const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min; let h=0; if(d){ h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4; h*=60; if(h<0) h+=360; } return { h, s:max===0?0:d/max, v:max }; }
  function rgbToYcbcr(r,g,b){ return { y:.299*r+.587*g+.114*b, cb:128-.168736*r-.331264*g+.5*b, cr:128+.5*r-.418688*g-.081312*b }; }
  function openModal(html){ closeModal(); const tpl=$("#modalTemplate").content.cloneNode(true); $(".modal-body",tpl).innerHTML=html; $(".modal-close",tpl).onclick=closeModal; const back=$(".modal-backdrop",tpl); back.onclick=e=>{ if(e.target===back) closeModal(); }; document.body.appendChild(tpl); }
  function closeModal(){ $(".modal-backdrop")?.remove(); }
  function aiBtn(label, feature, prompt){ return `<button class="secondary-btn deskin-ai-btn" data-ai="1" data-feature="${esc(feature)}" data-prompt="${esc(prompt)}" type="button">${esc(label)}</button>`; }
  function options(items, selected){ return items.map(item=>{ const value=Array.isArray(item)?item[0]:item, label=Array.isArray(item)?item[1]:item; return `<option value="${esc(value)}" ${String(value)===String(selected)?"selected":""}>${esc(label)}</option>`; }).join(""); }
  function id(){ return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4); }
  function dateKey(date){ return new Date(date).toISOString().slice(0,10); }
  function dateFmt(date){ return new Date(date).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}); }
  function timeNow(){ return new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}); }
  function idr(v){ return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v); }
  function firstName(name){ return (name||"Pengguna").split(" ")[0]; }
  function clamp(v,min,max){ return Math.min(max,Math.max(min,Math.round(Number(v)||0))); }
  function unique(arr){ return Array.from(new Set((arr||[]).filter(Boolean))); }
  function skinLabel(v){ return ({oily:"Berminyak",dry:"Kering",normal:"Normal",combination:"Kombinasi",sensitive:"Sensitif"})[v] || "Normal"; }
  function concernLabel(v){ return ({acne:"Jerawat",oil:"Minyak",dry:"Kering",pores:"Pori",redness:"Kemerahan",texture:"Tekstur",uv:"UV"})[v] || v; }
  function concernLabels(list){ return (list||[]).map(concernLabel); }
  function esc(v){ return String(v ?? "").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }
  function formatText(v){ return esc(v).replace(/\n+/g,"<br>"); }
  function toast(msg){ toastEl.textContent=msg; toastEl.classList.add("show"); clearTimeout(toastEl._timer); toastEl._timer=setTimeout(()=>toastEl.classList.remove("show"),3200); }
  function copyright(){ if($("#deskinCopyright")) return; const p=document.createElement("p"); p.id="deskinCopyright"; p.textContent="© 2026 Muhammad Naufal. All rights reserved."; document.body.appendChild(p); }
})();
