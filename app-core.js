(() => {
  "use strict";

  const VERSION = "1.2.0";
  const STORE = "deskin_state_v112";
  const GUEST_SESSION = "deskin_guest_session_v120";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const app = $("#app");
  const nav = $("#mainNav");
  const titleEl = $("#pageTitle");
  const toastEl = $("#toast");

  const pages = [
    ["/dashboard", "Dashboard"],
    ["/daily", "SKINDaily"],
    ["/recom", "DESKINRecom"],
    ["/edu", "SKINEdu"],
    ["/analyzer", "SKINAnalyzer"],
    ["/analysis", "SKINAnalysis"],
    ["/talk", "SKINTalk"],
    ["/profile", "Profil"]
  ];

  const products = [
    { id: "cleanser", name: "Cleanser low pH lembut", cat: "Cleanser", min: 45000, max: 120000, issues: ["acne", "oil"], tags: ["low pH", "lembut", "tanpa pewangi"] },
    { id: "moist", name: "Moisturizer ceramide", cat: "Moisturizer", min: 65000, max: 180000, issues: ["dry", "redness"], tags: ["ceramide", "barrier", "ringan"] },
    { id: "spf", name: "Sunscreen SPF 50", cat: "Sunscreen", min: 55000, max: 170000, issues: ["uv", "oil"], tags: ["spf50", "harian", "ringan"] },
    { id: "nia", name: "Serum niacinamide", cat: "Serum", min: 55000, max: 160000, issues: ["oil", "pores", "acne"], tags: ["niacinamide", "sebum", "pori"] },
    { id: "toner", name: "Hydrating toner", cat: "Toner", min: 45000, max: 145000, issues: ["dry", "texture"], tags: ["hidrasi", "alkohol-free", "ringan"] },
    { id: "bha", name: "Eksfoliasi BHA ringan", cat: "Treatment", min: 75000, max: 210000, issues: ["acne", "pores", "texture"], tags: ["BHA", "komedo", "bertahap"] },
    { id: "centella", name: "Calming cream centella", cat: "Moisturizer", min: 60000, max: 165000, issues: ["redness", "dry"], tags: ["centella", "calming", "barrier"] },
    { id: "spot", name: "Spot treatment jerawat", cat: "Treatment", min: 35000, max: 120000, issues: ["acne"], tags: ["spot care", "malam", "targeted"] }
  ];

  const baseRoutine = ["Cleanser lembut", "Moisturizer", "Sunscreen SPF 30+", "Cleanser malam", "Treatment sesuai kebutuhan", "Moisturizer malam"]
    .map((title, i) => ({ id: "r" + i, title, time: i < 3 ? "Pagi" : "Malam", done: false }));

  const state = loadLocal();
  let authUser = null;
  let authConfigured = true;
  let authMode = "login";
  let remoteSaveTimer = null;

  boot();

  async function boot() {
    document.documentElement.dataset.theme = state.theme || "light";
    nav.innerHTML = pages.map((item, index) => `<a href="${item[0]}" data-link data-path="${item[0]}"><span class="ico">${String(index + 1).padStart(2, "0")}</span><span>${item[1]}</span></a>`).join("");
    $("#menuBtn").onclick = () => document.body.classList.toggle("menu-open");
    $("#themeBtn").onclick = () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = state.theme;
      saveLocal();
    };
    document.addEventListener("click", handleLinks);
    addEventListener("popstate", route);
    addEventListener("hashchange", route);
    await checkAuth();
    route();
    navigator.serviceWorker?.getRegistrations?.().then((regs) => regs.forEach((reg) => reg.unregister())).catch(() => {});
  }

  function baseState() {
    return {
      version: VERSION,
      theme: "light",
      user: null,
      guest: false,
      skinType: "normal",
      concerns: [],
      routine: structuredClone(baseRoutine),
      notes: [],
      analyses: [],
      saved: [],
      messages: []
    };
  }

  function loadLocal() {
    try {
      return { ...baseState(), ...JSON.parse(localStorage.getItem(STORE) || "{}") };
    } catch {
      return baseState();
    }
  }

  function saveLocal() {
    state.version = VERSION;
    localStorage.setItem(STORE, JSON.stringify(state));
    if (authUser) scheduleRemoteSave();
  }

  async function checkAuth() {
    try {
      const response = await fetch("/api/auth", { cache: "no-store" });
      const data = await response.json();
      if (data.code === "AUTH_NOT_CONFIGURED") {
        authConfigured = false;
        return;
      }
      authConfigured = true;
      if (data.ok && data.authenticated) {
        authUser = data.user;
        state.user = data.user;
        state.guest = false;
        await loadRemoteData();
        saveLocal();
      }
    } catch {
      authConfigured = false;
    }
  }

  async function loadRemoteData() {
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      const data = await response.json();
      if (data.ok && data.payload) Object.assign(state, data.payload, { user: authUser, guest: false });
    } catch {}
  }

  function scheduleRemoteSave() {
    clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(async () => {
      try {
        await fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: state })
        });
      } catch {}
    }, 700);
  }

  function handleLinks(event) {
    const link = event.target.closest("[data-link]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http")) return;
    event.preventDefault();
    navigate(href);
  }

  function navigate(path) {
    history.pushState({}, "", path);
    route();
  }

  function currentPath() {
    if (location.hash.startsWith("#/")) return location.hash.slice(1);
    return location.pathname === "/" || location.pathname === "/app.html" || location.pathname === "/index.html" ? "/welcome" : location.pathname;
  }

  function isAllowed(path) {
    return path === "/welcome" || path === "/auth" || authUser || sessionStorage.getItem(GUEST_SESSION) === "yes";
  }

  function route() {
    document.body.classList.remove("menu-open");
    const path = currentPath();
    if (path === "/market") return navigate("/recom");
    if (!isAllowed(path)) return navigate("/welcome");
    $$(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.path === path));
    const routes = {
      "/welcome": welcome,
      "/auth": auth,
      "/dashboard": dashboard,
      "/daily": daily,
      "/recom": recom,
      "/edu": edu,
      "/analyzer": analyzer,
      "/analysis": analysis,
      "/talk": talk,
      "/profile": profile
    };
    (routes[path] || welcome)();
    titleEl.focus?.({ preventScroll: true });
    copyright();
  }

  function enterGuest() {
    authUser = null;
    state.guest = true;
    sessionStorage.setItem(GUEST_SESSION, "yes");
    saveLocal();
    navigate("/dashboard");
  }

  function setTitle(text) {
    titleEl.textContent = text;
    document.title = `${text} - DeSkin`;
  }

  function welcome() {
    setTitle("Selamat datang");
    app.innerHTML = `
      <section class="container hero naufal-hero">
        <div class="stack">
          <span class="signature-line">Naufal Signature</span>
          <h2>Skincare assistant yang terasa tenang, bersih, dan personal.</h2>
          <p>DeSkin membantu mencatat kondisi kulit, menyusun rutinitas, membaca hasil scan, menata rekomendasi produk, dan membuka ruang konsultasi AI dalam pengalaman yang sederhana.</p>
          <div class="hero-actions">
            <a class="primary-btn" href="/auth" data-link>Login atau daftar</a>
            <button class="secondary-btn" id="guestBtn" type="button">Coba tanpa login</button>
          </div>
          <p class="secure-note">Ciri khas DeSkin: tidak ramai, tidak menggurui, fokus pada keputusan kecil yang bisa dilakukan hari ini.</p>
        </div>
        <div class="device-card stack">
          <div class="between"><strong>DeSkin Health Flow</strong><span class="pill success">v${VERSION}</span></div>
          <div class="device"><span class="device-dot"></span></div>
          <p>Scan, catat, pahami, lalu pilih langkah paling aman untuk kulitmu.</p>
        </div>
      </section>
      <p class="footer-note">Versi ${VERSION}</p>
    `;
    $("#guestBtn").onclick = enterGuest;
  }

  function auth() {
    setTitle("Akses akun");
    app.innerHTML = `
      <section class="container auth-shell">
        <div class="card auth-card">
          <div class="auth-side stack">
            <span class="signature-line">Naufal Signature</span>
            <h2>Akses DeSkin dengan cara yang jelas.</h2>
            <p>Login menyimpan data lewat server yang aman. Coba tanpa login tetap tersedia untuk eksplorasi cepat.</p>
            <p class="secure-note">Status auth: ${authConfigured ? "siap digunakan" : "perlu konfigurasi Supabase di Vercel"}.</p>
          </div>
          <form id="authForm" class="auth-form form-grid">
            <div class="auth-choice">
              <button class="secondary-btn ${authMode === "login" ? "active" : ""}" data-mode="login" type="button">Login</button>
              <button class="secondary-btn ${authMode === "register" ? "active" : ""}" data-mode="register" type="button">Daftar</button>
              <button class="secondary-btn" data-mode="guest" type="button">Coba tanpa login</button>
            </div>
            <h2>${authMode === "register" ? "Daftar akun" : "Login"}</h2>
            ${authMode === "register" ? `<label>Nama<input name="name" autocomplete="name" value="${esc(state.user?.name || "")}" required></label>` : ""}
            <label>Email<input name="email" type="email" autocomplete="email" required></label>
            <label>Password<input name="password" type="password" autocomplete="${authMode === "register" ? "new-password" : "current-password"}" minlength="8" required></label>
            <button class="primary-btn" type="submit">${authMode === "register" ? "Daftar" : "Login"}</button>
            <p id="authStatus" class="muted">${authConfigured ? "" : "Login aman belum aktif sampai Supabase disambungkan."}</p>
          </form>
        </div>
      </section>
    `;
    $$("[data-mode]").forEach((button) => button.onclick = () => {
      if (button.dataset.mode === "guest") return enterGuest();
      authMode = button.dataset.mode;
      auth();
    });
    $("#authForm").onsubmit = submitAuth;
  }

  async function submitAuth(event) {
    event.preventDefault();
    const status = $("#authStatus");
    const button = event.target.querySelector("button[type='submit']");
    const data = Object.fromEntries(new FormData(event.target));
    button.disabled = true;
    button.textContent = authMode === "register" ? "Mendaftarkan..." : "Masuk...";
    status.textContent = "Memproses akun dengan aman...";
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: authMode, name: data.name, email: data.email, password: data.password })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Auth gagal.");
      if (result.needsEmailConfirmation) {
        status.textContent = result.message;
        return;
      }
      authUser = result.user;
      state.user = result.user;
      state.guest = false;
      sessionStorage.removeItem(GUEST_SESSION);
      await loadRemoteData();
      saveLocal();
      navigate("/dashboard");
    } catch (error) {
      status.textContent = error.message || "Login gagal.";
    } finally {
      button.disabled = false;
      button.textContent = authMode === "register" ? "Daftar" : "Login";
    }
  }

  function dashboard() {
    setTitle("Dashboard");
    const a = latest();
    const score = skinScore(a);
    app.innerHTML = `
      <section class="container stack">
        <div class="hero naufal-hero">
          <div class="stack">
            <span class="signature-line">Halo, ${esc(firstName())}</span>
            <h2>${a ? `Skor kulit terakhir ${score}/100.` : "Mulai dari scan wajah pertama."}</h2>
            <p>${a ? summary(a) : "DeSkin akan menyesuaikan rekomendasi setelah kamu mengisi profil atau menyimpan hasil scan."}</p>
            <div class="hero-actions"><a class="primary-btn" href="/analyzer" data-link>Scan wajah</a><a class="secondary-btn" href="/daily" data-link>Rutinitas</a><button class="secondary-btn" data-ai="Beri insight ringkas berdasarkan profil kulit saya.">Insight AI</button></div>
          </div>
          <div class="card stack"><div class="between"><div><p class="eyebrow">Skin Health</p><h3 style="margin:0">Ringkasan</h3></div><div class="progress-ring" style="--value:${score}"><strong>${score}</strong></div></div>${meters(a)}</div>
        </div>
        <div class="grid four">
          ${stat("Rutinitas", completion() + "%", "Hari ini")}
          ${stat("Analisis", state.analyses.length, "Riwayat")}
          ${stat("Produk", state.saved.length, "Tersimpan")}
          ${stat("Akun", authUser ? "Login" : "Guest", authConfigured ? "Auth aman" : "Setup dibutuhkan")}
        </div>
        <div class="grid two">
          <section class="card stack"><div class="between"><h2>Prioritas hari ini</h2><a class="ghost-btn" href="/daily" data-link>Kelola</a></div><div class="list">${state.routine.slice(0,4).map(routineItem).join("")}</div></section>
          <section class="card stack"><div class="between"><h2>DESKINRecom</h2><a class="ghost-btn" href="/recom" data-link>Lihat semua</a></div><div class="grid three">${recommend().slice(0,3).map(productCard).join("")}</div></section>
        </div>
      </section>
    `;
    bindCommon();
  }

  function daily() {
    setTitle("SKINDaily");
    app.innerHTML = `
      <section class="container stack">
        <div class="between"><div><p class="eyebrow">SKINDaily</p><h2>Rutinitas dan catatan kulit</h2><p class="muted">Pilih langkah kecil yang realistis dan konsisten.</p></div><button class="secondary-btn" data-ai="Susun rutinitas pagi dan malam yang sederhana berdasarkan fokus kulit saya.">Saran AI</button></div>
        <div class="grid two"><section class="card stack"><h2>Checklist</h2><div id="routineList" class="list">${state.routine.map(routineItem).join("")}</div><button id="resetRoutine" class="primary-btn">Simpan progres</button></section><section class="card stack"><h2>Catatan</h2><textarea id="note" placeholder="Contoh: kurang tidur, produk baru, kulit terasa kering..."></textarea><button id="saveNote" class="secondary-btn">Simpan catatan</button><div class="list">${state.notes.slice(0,4).map(noteRow).join("") || `<p class="muted">Belum ada catatan.</p>`}</div></section></div>
      </section>
    `;
    $("#routineList").onchange = (e) => {
      if (!e.target.matches("input")) return;
      state.routine = state.routine.map((r) => r.id === e.target.value ? { ...r, done: e.target.checked } : r);
      saveLocal();
      daily();
    };
    $("#resetRoutine").onclick = () => {
      state.notes.unshift({ text: `Rutinitas selesai ${completion()}%.`, at: new Date().toISOString() });
      state.routine = state.routine.map((r) => ({ ...r, done: false }));
      saveLocal();
      daily();
    };
    $("#saveNote").onclick = () => {
      const text = $("#note").value.trim();
      if (!text) return toast("Catatan masih kosong.");
      state.notes.unshift({ text, at: new Date().toISOString() });
      saveLocal();
      daily();
    };
    bindCommon();
  }

  function recom() {
    setTitle("DESKINRecom");
    app.innerHTML = `
      <section class="container stack">
        <div class="between"><div><p class="eyebrow">DESKINRecom</p><h2>Rekomendasi produk</h2><p class="muted">Urutan dibuat dari profil, fokus kulit, dan hasil scan tersimpan.</p></div><button class="primary-btn" data-ai="Tinjau rekomendasi produk saya dengan bahasa sederhana.">Tinjau AI</button></div>
        <div class="card row"><input id="searchProduct" placeholder="Cari cleanser, serum, sunscreen..."><select id="issueFilter"><option value="all">Semua fokus</option><option value="acne">Jerawat</option><option value="oil">Minyak</option><option value="dry">Kering</option><option value="pores">Pori</option><option value="redness">Kemerahan</option></select></div>
        <div id="productGrid" class="grid four"></div>
        <section class="card stack"><h2>Produk tersimpan</h2><div class="list">${savedProducts()}</div></section>
      </section>
    `;
    const render = () => {
      const q = $("#searchProduct").value.toLowerCase();
      const issue = $("#issueFilter").value;
      $("#productGrid").innerHTML = recommend().filter((p) => (p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)) && (issue === "all" || p.issues.includes(issue))).map(productCard).join("") || `<p class="muted">Produk tidak ditemukan.</p>`;
      bindCommon();
    };
    $("#searchProduct").oninput = render;
    $("#issueFilter").onchange = render;
    render();
  }

  function edu() {
    setTitle("SKINEdu");
    const topics = ["Rutinitas pagi yang aman", "Kulit berminyak dan dehidrasi", "Bahan aktif secara bertahap", "Tidur, stres, dan jerawat", "Perlindungan UV harian", "Skincare sederhana untuk pria"];
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINEdu</p><h2>Edukasi skincare</h2><p class="muted">Materi singkat, tenang, dan mudah dipraktikkan.</p></div><button class="secondary-btn" data-ai="Buat materi edukasi sesuai fokus kulit saya.">Materi AI</button></div><div class="grid three">${topics.map((topic, i) => `<article class="article-card"><div class="article-img">${i + 1}</div><h3>${topic}</h3><p class="muted">Panduan ringkas untuk keputusan perawatan yang lebih aman.</p></article>`).join("")}</div></section>`;
    bindCommon();
  }

  function analyzer() {
    setTitle("SKINAnalyzer");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINAnalyzer</p><h2>Scan wajah</h2><p class="muted">Scan hanya diproses setelah wajah terdeteksi.</p></div><button class="secondary-btn" data-ai="Beri tips foto scan wajah yang jelas.">Tips scan</button></div><div class="grid two"><section class="card stack"><div id="cameraBox" class="camera-box"><div class="stack" style="text-align:center;padding:22px"><h3>Preview kamera</h3><p class="muted">Wajah di tengah, cahaya depan, tanpa masker atau kacamata gelap.</p></div><span class="capture-overlay"></span></div><div class="row"><button id="openCamera" class="primary-btn">Buka kamera</button><button id="capturePhoto" class="secondary-btn" disabled>Capture</button><label class="ghost-btn" style="cursor:pointer">Upload foto<input id="uploadPhoto" type="file" accept="image/*" capture="user" hidden></label></div></section><section class="card stack"><h2>Hasil scan</h2><div id="scanBox"><p class="muted">Belum ada hasil scan.</p></div><button id="saveScan" class="primary-btn" disabled>Simpan hasil scan</button></section></div></section>`;
    bindCommon();
  }

  function analysis() {
    setTitle("SKINAnalysis");
    const a = latest();
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINAnalysis</p><h2>Analisis kulit</h2><p class="muted">Ringkasan hasil scan dan prioritas perawatan.</p></div><a class="primary-btn" href="/analyzer" data-link>Scan baru</a></div>${a ? `<div class="grid two"><section class="card stack"><p class="eyebrow">Skin score</p><div class="progress-ring" style="--value:${skinScore(a)}"><strong>${skinScore(a)}</strong></div><p class="muted">${summary(a)}</p></section><section class="card stack"><h2>Parameter</h2>${meters(a)}</section></div>` : `<section class="card stack"><h2>Belum ada hasil scan</h2><a class="primary-btn" href="/analyzer" data-link>Mulai scan</a></section>`}</section>`;
  }

  function talk() {
    setTitle("SKINTalk");
    app.innerHTML = `<section class="container stack"><div><p class="eyebrow">SKINTalk</p><h2>Konsultasi dan diskusi</h2><p class="muted">Jawaban AI dirapikan sebelum ditampilkan.</p></div><section class="card stack"><div class="chat-box" id="chatBox">${state.messages.map((m) => `<div class="message ${m.me ? "me" : ""}">${esc(m.text).replace(/\n/g, "<br>")}<small>${esc(m.at)}</small></div>`).join("") || `<p class="muted">Mulai percakapan.</p>`}</div><form id="chatForm" class="row"><input name="text" placeholder="Tulis pertanyaan..." required><button class="primary-btn">Kirim</button></form></section></section>`;
  }

  function profile() {
    setTitle("Profil");
    app.innerHTML = `<section class="container stack"><div><p class="eyebrow">Profil</p><h2>Preferensi kulit</h2><p class="muted">Atur profil agar rekomendasi lebih sesuai.</p></div><div class="grid two"><form id="profileForm" class="card form-grid"><label>Nama<input name="name" value="${esc(state.user?.name || "")}"></label><label>Email<input name="email" type="email" value="${esc(state.user?.email || "")}" ${authUser ? "readonly" : ""}></label><label>Tipe kulit<select name="skinType">${skinOptions(state.skinType)}</select></label><button class="primary-btn">Simpan profil</button></form><section class="card stack"><h2>Akses akun</h2><p class="muted">Status: ${authUser ? "Login aktif" : state.guest ? "Coba tanpa login" : "Belum masuk"}</p><p class="secure-note">${authUser ? "Data disinkronkan ke server Supabase melalui endpoint aman." : "Mode tanpa login menyimpan data di perangkat ini."}</p><div class="row"><a class="primary-btn" href="/auth" data-link>Login / daftar</a><button class="ghost-btn" id="logoutBtn">Keluar</button></div></section></div></section>`;
    $("#profileForm").onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      state.user = { ...(state.user || {}), name: data.name || "Pengguna", email: data.email || state.user?.email || "" };
      state.skinType = data.skinType;
      saveLocal();
      toast("Profil tersimpan.");
      profile();
    };
    $("#logoutBtn").onclick = logout;
  }

  async function logout() {
    try {
      await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    } catch {}
    authUser = null;
    state.guest = false;
    sessionStorage.removeItem(GUEST_SESSION);
    saveLocal();
    navigate("/welcome");
  }

  function bindCommon() {
    $$("[data-save]").forEach((button) => button.onclick = () => {
      if (!state.saved.includes(button.dataset.save)) state.saved.push(button.dataset.save);
      saveLocal();
      toast("Produk tersimpan.");
    });
  }

  function stat(label, value, hint) {
    return `<div class="card stat"><span class="tag">${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(hint)}</small></div>`;
  }

  function productCard(p) {
    return `<article class="product-card"><div class="product-img">${p.cat.slice(0,2).toUpperCase()}</div><h3>${esc(p.name)}</h3><p class="muted">${p.cat} · ${idr(p.min)} - ${idr(p.max)}</p><div class="row">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div><div class="between"><span class="price">${productScore(p)} match</span><span class="pill">${(p.min + p.max) / 2 <= 90000 ? "Hemat" : "Menengah"}</span></div><button class="primary-btn" data-save="${p.id}">Simpan</button></article>`;
  }

  function recommend() { return products.slice().sort((a, b) => productScore(b) - productScore(a)); }
  function productScore(p) {
    let score = 1;
    state.concerns.forEach((c) => { if (p.issues.includes(c)) score += 1; });
    if (state.skinType === "oily" && p.issues.includes("oil")) score += 2;
    if (state.skinType === "dry" && p.issues.includes("dry")) score += 2;
    if (state.skinType === "sensitive" && p.issues.includes("redness")) score += 2;
    return score;
  }

  function savedProducts() {
    return state.saved.map((id) => products.find((p) => p.id === id)).filter(Boolean).map((p) => `<div class="list-item"><strong>${esc(p.name)}</strong><p class="muted">${idr(p.min)} - ${idr(p.max)}</p></div>`).join("") || `<p class="muted">Belum ada produk tersimpan.</p>`;
  }

  function routineItem(r) { return `<label class="checkbox"><input type="checkbox" value="${r.id}" ${r.done ? "checked" : ""}><span><strong>${esc(r.time)}</strong> - ${esc(r.title)}</span></label>`; }
  function noteRow(n) { return `<div class="panel"><strong>${date(n.at)}</strong><p class="muted">${esc(n.text)}</p></div>`; }
  function completion() { return state.routine.length ? Math.round(state.routine.filter((r) => r.done).length / state.routine.length * 100) : 0; }
  function latest() { return state.analyses[state.analyses.length - 1] || null; }
  function meters(a) {
    a = a || { moisture:0, sebum:0, texture:0, acne:0, sensitivity:0 };
    return [["Kelembapan", a.moisture], ["Sebum", a.sebum], ["Tekstur", a.texture], ["Acne risk", a.acne], ["Sensitivitas", a.sensitivity]].map((x) => `<div class="meter"><div class="between"><strong>${x[0]}</strong><span>${x[1]}/100</span></div><div class="meter-bar"><span style="--value:${x[1]}"></span></div></div>`).join("");
  }
  function skinScore(a) { return a ? clamp(a.moisture*.24 + (100 - Math.abs(55-a.sebum))*.18 + a.texture*.22 + (100-a.acne)*.22 + (100-a.sensitivity)*.14) : 0; }
  function summary(a) { if (!a) return "Belum ada hasil scan."; if (a.acne > 60) return "Fokus utama: jerawat."; if (a.sebum > 68) return "Sebum terlihat tinggi."; if (a.moisture < 45) return "Kelembapan rendah."; if (a.sensitivity > 55) return "Kulit terlihat mudah reaktif."; return "Kondisi cukup seimbang."; }
  function skinOptions(v) { return ["normal", "oily", "dry", "combination", "sensitive"].map((x) => `<option value="${x}" ${x === v ? "selected" : ""}>${skinLabel(x)}</option>`).join(""); }
  function skinLabel(v) { return { normal:"Normal", oily:"Berminyak", dry:"Kering", combination:"Kombinasi", sensitive:"Sensitif" }[v] || "Normal"; }
  function concernLabel(v) { return { acne:"Jerawat", oil:"Minyak", dry:"Kering", pores:"Pori", redness:"Kemerahan", texture:"Tekstur", uv:"UV" }[v] || v; }
  function firstName() { return (state.user?.name || authUser?.name || "Pengguna").split(" ")[0]; }
  function idr(n) { return new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(n); }
  function date(d) { return new Date(d).toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" }); }
  function clamp(x, min=0, max=100) { return Math.max(min, Math.min(max, Math.round(Number(x) || 0))); }
  function esc(x) { return String(x ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c])); }
  function toast(message) { toastEl.textContent = message; toastEl.classList.add("show"); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 2800); }
  function copyright() { if ($("#deskinCopyright")) return; const p = document.createElement("p"); p.id = "deskinCopyright"; p.textContent = "© 2026 Muhammad Naufal. All rights reserved."; document.body.appendChild(p); }
})();
