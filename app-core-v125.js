(() => {
  "use strict";

  const VERSION = "1.2.5";
  const STORE = "deskin_state_v112";
  const GUEST_SESSION = "deskin_guest_session_v125";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const app = $("#app");
  const nav = $("#mainNav");
  const titleEl = $("#pageTitle");
  const toastEl = $("#toast");

  const navItems = [
    ["/dashboard", "Dashboard"],
    ["/daily", "SKINDaily"],
    ["/recom", "DESKINRecom"],
    ["/edu", "SKINEdu"],
    ["/analyzer", "SKINAnalyzer"],
    ["/analysis", "SKINAnalysis"],
    ["/talk", "SKINTalk"],
    ["/profile", "Profil"]
  ];

  const productSeed = [
    { id: "cleanser", name: "Cleanser low pH lembut", cat: "Cleanser", min: 45000, max: 120000, skin: ["oily", "sensitive", "combination", "normal"], issues: ["acne", "oil"], tags: ["low pH", "lembut", "tanpa pewangi"] },
    { id: "moist", name: "Moisturizer ceramide", cat: "Moisturizer", min: 65000, max: 180000, skin: ["dry", "sensitive", "normal", "combination"], issues: ["dry", "redness"], tags: ["ceramide", "barrier", "ringan"] },
    { id: "spf", name: "Sunscreen SPF 50", cat: "Sunscreen", min: 55000, max: 170000, skin: ["oily", "combination", "normal", "dry"], issues: ["uv", "oil"], tags: ["spf50", "harian", "ringan"] },
    { id: "nia", name: "Serum niacinamide", cat: "Serum", min: 55000, max: 160000, skin: ["oily", "combination"], issues: ["oil", "pores", "acne"], tags: ["niacinamide", "sebum", "pori"] },
    { id: "toner", name: "Hydrating toner", cat: "Toner", min: 45000, max: 145000, skin: ["dry", "normal", "sensitive"], issues: ["dry", "texture"], tags: ["hidrasi", "alkohol-free", "ringan"] },
    { id: "bha", name: "Eksfoliasi BHA ringan", cat: "Treatment", min: 75000, max: 210000, skin: ["oily", "combination"], issues: ["acne", "pores", "texture"], tags: ["BHA", "komedo", "bertahap"] },
    { id: "centella", name: "Calming cream centella", cat: "Moisturizer", min: 60000, max: 165000, skin: ["sensitive", "dry", "normal"], issues: ["redness", "dry"], tags: ["centella", "calming", "barrier"] },
    { id: "spot", name: "Spot treatment jerawat", cat: "Treatment", min: 35000, max: 120000, skin: ["oily", "combination", "normal"], issues: ["acne"], tags: ["spot care", "malam", "targeted"] }
  ];

  const education = [
    { id: "e1", title: "Rutinitas pagi yang aman", cat: "Dasar", body: "Mulai dari cleanser lembut, moisturizer, dan sunscreen. Tambahkan serum hanya bila kulit sudah terbiasa." },
    { id: "e2", title: "Kulit berminyak dan dehidrasi", cat: "Masalah kulit", body: "Kulit dapat berminyak tetapi kekurangan air. Gunakan hidrasi ringan dan hindari pembersih yang terlalu keras." },
    { id: "e3", title: "Bahan aktif secara bertahap", cat: "Keamanan", body: "BHA, AHA, retinoid, dan niacinamide sebaiknya diperkenalkan satu per satu agar reaksi kulit mudah dipantau." },
    { id: "e4", title: "Tidur, stres, dan jerawat", cat: "Lifestyle", body: "Catatan harian membantu menemukan pola pemicu seperti kurang tidur, stres, makanan tertentu, atau produk baru." },
    { id: "e5", title: "Perlindungan UV harian", cat: "Dasar", body: "Sunscreen membantu menjaga skin barrier dan mencegah noda semakin terlihat. Reapply saat banyak aktivitas luar ruang." },
    { id: "e6", title: "Skincare sederhana untuk pria", cat: "Pria", body: "Rutinitas tidak harus rumit. Cleanser, moisturizer, dan sunscreen sudah cukup untuk memulai kebiasaan yang konsisten." }
  ];

  let state = loadState();
  let authUser = null;
  let authConfigured = true;
  let authMode = "login";
  let remoteTimer = null;

  boot().catch(() => showFatal("Aplikasi gagal dimuat. Muat ulang halaman."));

  async function boot() {
    normalizeState();
    document.documentElement.dataset.theme = state.theme;
    renderNav();
    bindShell();
    await checkAuth();
    route();
    window.addEventListener("popstate", route);
    window.addEventListener("hashchange", route);
    window.addEventListener("error", () => toast("Terjadi kendala kecil. Muat ulang bila halaman tidak merespons."));
    window.addEventListener("unhandledrejection", () => toast("Koneksi atau layanan sedang tidak stabil."));
    navigator.serviceWorker?.getRegistrations?.().then((regs) => regs.forEach((reg) => reg.unregister())).catch(() => {});
  }

  function defaults() {
    return {
      version: VERSION,
      theme: "light",
      user: null,
      guest: false,
      skinType: "normal",
      concerns: [],
      routine: [
        { id: "r1", time: "Pagi", title: "Cleanser lembut", done: false },
        { id: "r2", time: "Pagi", title: "Moisturizer", done: false },
        { id: "r3", time: "Pagi", title: "Sunscreen SPF 30+", done: false },
        { id: "r4", time: "Malam", title: "Cleanser", done: false },
        { id: "r5", time: "Malam", title: "Treatment sesuai kebutuhan", done: false },
        { id: "r6", time: "Malam", title: "Moisturizer", done: false }
      ],
      notes: [],
      analyses: [],
      saved: [],
      messages: [],
      eduDone: []
    };
  }

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORE) || "{}");
      return { ...defaults(), ...stored };
    } catch {
      return defaults();
    }
  }

  function refreshState() {
    Object.assign(state, loadState());
    normalizeState();
  }

  function normalizeState() {
    const d = defaults();
    state.version = VERSION;
    state.theme = state.theme === "dark" ? "dark" : "light";
    state.user = state.user || null;
    state.guest = Boolean(state.guest);
    state.skinType = ["normal", "oily", "dry", "combination", "sensitive"].includes(state.skinType) ? state.skinType : "normal";
    ["concerns", "routine", "notes", "analyses", "saved", "messages", "eduDone"].forEach((key) => {
      if (!Array.isArray(state[key])) state[key] = d[key];
    });
    if (!state.routine.length) state.routine = d.routine;
  }

  function saveState() {
    normalizeState();
    localStorage.setItem(STORE, JSON.stringify(state));
    if (authUser) scheduleRemoteSave();
  }

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      const data = await res.json();
      authConfigured = data.code !== "AUTH_NOT_CONFIGURED";
      if (data.ok && data.authenticated) {
        authUser = data.user;
        state.user = data.user;
        state.guest = false;
        sessionStorage.removeItem(GUEST_SESSION);
        await loadRemoteData();
        saveState();
      }
    } catch {
      authConfigured = false;
    }
  }

  async function loadRemoteData() {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && data.payload) Object.assign(state, data.payload, { user: authUser, guest: false });
      normalizeState();
    } catch {}
  }

  function scheduleRemoteSave() {
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(async () => {
      try {
        await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: state }) });
      } catch {}
    }, 800);
  }

  function renderNav() {
    nav.innerHTML = navItems.map((item, i) => `<a href="${item[0]}" data-link data-path="${item[0]}"><span class="ico">${String(i + 1).padStart(2, "0")}</span><span>${item[1]}</span></a>`).join("");
  }

  function bindShell() {
    $("#menuBtn").onclick = () => document.body.classList.toggle("menu-open");
    $("#themeBtn").onclick = () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = state.theme;
      saveState();
    };
    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-link]");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("http")) return;
      event.preventDefault();
      navigate(href);
    });
  }

  function pathNow() {
    if (location.hash.startsWith("#/")) return location.hash.slice(1);
    const path = location.pathname;
    return path === "/" || path === "/app.html" || path === "/index.html" ? "/welcome" : path;
  }

  function allowed(path) {
    return path === "/welcome" || path === "/auth" || authUser || sessionStorage.getItem(GUEST_SESSION) === "yes";
  }

  function navigate(path) {
    history.pushState({}, "", path);
    route();
  }

  function route() {
    refreshState();
    const path = pathNow() === "/market" ? "/recom" : pathNow();
    if (!allowed(path)) return navigate("/welcome");
    document.body.classList.remove("menu-open");
    $$(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.path === path));
    const pages = { "/welcome": welcome, "/auth": authPage, "/dashboard": dashboard, "/daily": daily, "/recom": recom, "/edu": edu, "/analyzer": analyzer, "/analysis": analysis, "/talk": talk, "/profile": profile };
    (pages[path] || welcome)();
    copyright();
    app.focus?.({ preventScroll: true });
  }

  function setTitle(text) {
    titleEl.textContent = text;
    document.title = `${text} - DeSkin`;
  }

  function welcome() {
    setTitle("Selamat datang");
    app.innerHTML = `
      <section class="container hero flow-hero">
        <div class="stack">
          <p class="eyebrow">DeSkin Inc.</p>
          <h2>Digital skin assistant untuk rutinitas kulit yang lebih terarah.</h2>
          <p>Scan kulit, catat kebiasaan harian, simpan rekomendasi produk, dan konsultasikan rutinitas dalam satu aplikasi.</p>
          <div class="hero-actions">
            <a class="primary-btn" href="/auth" data-link>Login atau daftar</a>
            <button class="secondary-btn" id="guestBtn" type="button">Coba tanpa login</button>
          </div>
        </div>
        <div class="device-card stack">
          <div class="between"><strong>DeSkin Assistant</strong><span class="pill success">v${VERSION}</span></div>
          <div class="device"><span class="device-dot"></span></div>
          <p>Hasil scan tersimpan ke analisis dan ikut memengaruhi rekomendasi.</p>
        </div>
      </section>
      <p class="footer-note">Versi ${VERSION}</p>`;
    $("#guestBtn").onclick = enterGuest;
  }

  function enterGuest() {
    authUser = null;
    state.guest = true;
    sessionStorage.setItem(GUEST_SESSION, "yes");
    saveState();
    navigate("/dashboard");
  }

  function authPage() {
    setTitle("Akses akun");
    app.innerHTML = `
      <section class="container auth-shell">
        <div class="card auth-card">
          <div class="auth-side stack">
            <p class="eyebrow">DeSkin Account</p>
            <h2>${authMode === "register" ? "Daftar akun" : "Login"}</h2>
            <p>${authMode === "register" ? "Buat akun untuk menyimpan data dan melanjutkan progres dari perangkat lain." : "Masuk untuk melanjutkan progres yang sudah tersimpan."}</p>
          </div>
          <form id="authForm" class="auth-form form-grid">
            <div class="auth-choice">
              <button class="secondary-btn ${authMode === "login" ? "active" : ""}" data-mode="login" type="button">Login</button>
              <button class="secondary-btn ${authMode === "register" ? "active" : ""}" data-mode="register" type="button">Daftar</button>
              <button class="secondary-btn" data-mode="guest" type="button">Coba tanpa login</button>
            </div>
            ${authMode === "register" ? `<label>Nama<input name="name" autocomplete="name" required></label>` : ""}
            <label>Email<input name="email" type="email" autocomplete="email" required></label>
            <label>Password<input name="password" type="password" minlength="8" autocomplete="${authMode === "register" ? "new-password" : "current-password"}" required></label>
            <button class="primary-btn" type="submit">${authMode === "register" ? "Daftar" : "Login"}</button>
            <p id="authStatus" class="muted">${authConfigured ? "" : "Login belum aktif. Coba tanpa login tetap bisa digunakan."}</p>
          </form>
        </div>
      </section>`;
    $$("[data-mode]").forEach((button) => button.onclick = () => {
      if (button.dataset.mode === "guest") return enterGuest();
      authMode = button.dataset.mode;
      authPage();
    });
    $("#authForm").onsubmit = submitAuth;
  }

  async function submitAuth(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type='submit']");
    const status = $("#authStatus");
    const data = Object.fromEntries(new FormData(form));
    button.disabled = true;
    button.textContent = authMode === "register" ? "Mendaftarkan..." : "Masuk...";
    status.textContent = "Memproses...";
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: authMode, name: data.name, email: data.email, password: data.password }) });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || "Akses akun gagal.");
      if (result.needsEmailConfirmation) {
        status.textContent = result.message;
        return;
      }
      authUser = result.user;
      state.user = result.user;
      state.guest = false;
      sessionStorage.removeItem(GUEST_SESSION);
      await loadRemoteData();
      saveState();
      navigate("/dashboard");
    } catch (error) {
      status.textContent = error.message || "Akses akun gagal.";
    } finally {
      button.disabled = false;
      button.textContent = authMode === "register" ? "Daftar" : "Login";
    }
  }

  function dashboard() {
    setTitle("Dashboard");
    const a = latest();
    const sc = skinScore(a);
    app.innerHTML = `
      <section class="container stack">
        <div class="hero flow-hero">
          <div class="stack">
            <p class="eyebrow">Halo, ${esc(firstName())}</p>
            <h2>${a ? `Skor kulit terakhir ${sc}/100.` : "Mulai dari scan wajah pertama."}</h2>
            <p>${a ? summary(a) : "Scan wajah membantu DeSkin menyesuaikan analisis, rutinitas, dan rekomendasi produk."}</p>
            <div class="hero-actions"><a class="primary-btn" href="/analyzer" data-link>Scan wajah</a><a class="secondary-btn" href="/daily" data-link>Rutinitas</a><button class="secondary-btn" data-ai="Berikan insight singkat berdasarkan profil dan hasil scan saya.">Insight AI</button></div>
          </div>
          <div class="card stack"><div class="between"><div><p class="eyebrow">Skin Health</p><h3 style="margin:0">Ringkasan</h3></div><div class="progress-ring" style="--value:${sc}"><strong>${sc}</strong></div></div>${meters(a)}</div>
        </div>
        <div class="grid four">
          ${stat("Rutinitas", completion() + "%", "Hari ini")}
          ${stat("Analisis", state.analyses.length, "Riwayat")}
          ${stat("Produk", state.saved.length, "Tersimpan")}
          ${stat("Akun", authUser ? "Login" : "Guest", authUser ? "Tersinkron" : "Lokal")}
        </div>
        <div class="grid two">
          <section class="card stack"><div class="between"><h2>Prioritas hari ini</h2><a class="ghost-btn" href="/daily" data-link>Kelola</a></div><div class="list">${state.routine.slice(0, 4).map(routineItem).join("")}</div></section>
          <section class="card stack"><div class="between"><h2>DESKINRecom</h2><a class="ghost-btn" href="/recom" data-link>Lihat semua</a></div><div class="grid three">${recommend().slice(0, 3).map(productCard).join("")}</div></section>
        </div>
      </section>`;
    bindCommon();
  }

  function daily() {
    setTitle("SKINDaily");
    app.innerHTML = `
      <section class="container stack">
        <div class="between"><div><p class="eyebrow">SKINDaily</p><h2>Rutinitas dan catatan kulit</h2><p class="muted">Pantau kebiasaan harian dan perubahan kulit.</p></div><button class="secondary-btn" data-ai="Susun rutinitas pagi dan malam yang sederhana berdasarkan fokus kulit saya.">Saran AI</button></div>
        <div class="grid three">
          <div class="card stat"><span class="tag">Selesai</span><strong>${completion()}%</strong><small>Checklist hari ini</small></div>
          <div class="card stat"><span class="tag">Catatan</span><strong>${state.notes.length}</strong><small>Total catatan</small></div>
          <div class="card stat"><span class="tag">Fokus</span><strong>${state.concerns.length || 0}</strong><small>${state.concerns.map(label).join(", ") || "Belum ada"}</small></div>
        </div>
        <div class="grid two"><section class="card stack"><div class="between"><h2>Checklist</h2><button id="addRoutine" class="ghost-btn" type="button">Tambah</button></div><div id="routineList" class="list">${state.routine.map(routineItem).join("")}</div><button id="resetRoutine" class="primary-btn">Simpan progres</button></section><section class="card stack"><h2>Catatan</h2><textarea id="note" placeholder="Contoh: kurang tidur, produk baru, kulit terasa kering..."></textarea><button id="saveNote" class="secondary-btn">Simpan catatan</button><div class="list">${state.notes.slice(0, 5).map(noteRow).join("") || `<p class="muted">Belum ada catatan.</p>`}</div></section></div>
      </section>`;
    $("#routineList").onchange = (e) => {
      if (!e.target.matches("input")) return;
      state.routine = state.routine.map((r) => r.id === e.target.value ? { ...r, done: e.target.checked } : r);
      saveState();
      daily();
    };
    $("#resetRoutine").onclick = () => {
      state.notes.unshift({ id: id(), text: `Rutinitas selesai ${completion()}%.`, at: new Date().toISOString() });
      state.routine = state.routine.map((r) => ({ ...r, done: false }));
      saveState();
      daily();
    };
    $("#saveNote").onclick = () => {
      const text = $("#note").value.trim();
      if (!text) return toast("Catatan masih kosong.");
      state.notes.unshift({ id: id(), text, at: new Date().toISOString() });
      saveState();
      daily();
    };
    $("#addRoutine").onclick = addRoutine;
  }

  function addRoutine() {
    openModal(`<h2 id="modalTitle">Tambah rutinitas</h2><form id="routineForm" class="form-grid"><label>Waktu<select name="time"><option>Pagi</option><option>Siang</option><option>Malam</option></select></label><label>Langkah<input name="title" required placeholder="Contoh: Reapply sunscreen"></label><button class="primary-btn">Simpan</button></form>`);
    $("#routineForm").onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget));
      state.routine.push({ id: id(), time: data.time, title: data.title, done: false });
      saveState();
      closeModal();
      daily();
    };
  }

  function recom() {
    setTitle("DESKINRecom");
    app.innerHTML = `
      <section class="container stack">
        <div class="between"><div><p class="eyebrow">DESKINRecom</p><h2>Rekomendasi produk</h2><p class="muted">Urutan menyesuaikan profil, fokus kulit, dan hasil scan tersimpan.</p></div><button class="primary-btn" data-ai="Tinjau rekomendasi produk saya dengan bahasa sederhana.">Tinjau AI</button></div>
        <div class="card row"><input id="searchProduct" placeholder="Cari cleanser, serum, sunscreen..."><select id="issueFilter"><option value="all">Semua fokus</option><option value="acne">Jerawat</option><option value="oil">Minyak</option><option value="dry">Kering</option><option value="pores">Pori</option><option value="redness">Kemerahan</option></select><select id="skinFilter">${skinOptions("all", true)}</select></div>
        <div id="productGrid" class="grid four"></div>
        <section class="card stack"><h2>Produk tersimpan</h2><div class="list">${savedProducts()}</div></section>
      </section>`;
    const render = () => {
      const q = $("#searchProduct").value.toLowerCase();
      const issue = $("#issueFilter").value;
      const skin = $("#skinFilter").value;
      $("#productGrid").innerHTML = recommend().filter((p) => (p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)) && (issue === "all" || p.issues.includes(issue)) && (skin === "all" || p.skin.includes(skin))).map(productCard).join("") || `<p class="muted">Produk tidak ditemukan.</p>`;
      bindCommon();
    };
    $("#searchProduct").oninput = render;
    $("#issueFilter").onchange = render;
    $("#skinFilter").onchange = render;
    render();
  }

  function edu() {
    setTitle("SKINEdu");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINEdu</p><h2>Edukasi skincare</h2><p class="muted">Materi singkat untuk memilih rutinitas dengan lebih aman.</p></div><button class="secondary-btn" data-ai="Buat materi edukasi sesuai fokus kulit saya.">Materi AI</button></div><div class="grid three">${education.map(articleCard).join("")}</div></section>`;
    $$("[data-read]").forEach((button) => button.onclick = () => readArticle(button.dataset.read));
  }

  function analyzer() {
    setTitle("SKINAnalyzer");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINAnalyzer</p><h2>Scan wajah</h2><p class="muted">Scan hanya diproses setelah wajah terdeteksi.</p></div><button class="secondary-btn" data-ai="Beri tips foto scan wajah yang jelas.">Tips scan</button></div><div class="grid two"><section class="card stack"><div id="cameraBox" class="camera-box"><div class="stack" style="text-align:center;padding:22px"><h3>Preview kamera</h3><p class="muted">Wajah di tengah, cahaya depan, tanpa masker atau kacamata gelap.</p></div><span class="capture-overlay"></span></div><div class="row"><button id="openCamera" class="primary-btn">Buka kamera</button><button id="capturePhoto" class="secondary-btn" disabled>Capture</button><label class="ghost-btn" style="cursor:pointer">Upload foto<input id="uploadPhoto" type="file" accept="image/*" capture="user" hidden></label></div></section><section class="card stack"><h2>Hasil scan</h2><div id="scanBox"><p class="muted">Belum ada hasil scan.</p></div><button id="saveScan" class="primary-btn" disabled>Simpan hasil scan</button></section></div></section>`;
  }

  function analysis() {
    setTitle("SKINAnalysis");
    const a = latest();
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINAnalysis</p><h2>Analisis kulit</h2><p class="muted">Ringkasan hasil scan dan prioritas perawatan.</p></div><a class="primary-btn" href="/analyzer" data-link>Scan baru</a></div>${a ? `<div class="grid two"><section class="card stack"><p class="eyebrow">Skin score</p><div class="progress-ring" style="--value:${skinScore(a)}"><strong>${skinScore(a)}</strong></div><p class="muted">${summary(a)}</p>${routineTips(a)}</section><section class="card stack"><h2>Parameter</h2>${meters(a)}</section></div><section class="card stack"><div class="between"><h2>Riwayat</h2><button id="clearAnalysis" class="danger-btn">Hapus riwayat</button></div><div class="list">${state.analyses.slice().reverse().map(analysisRow).join("")}</div></section>` : `<section class="card stack"><h2>Belum ada hasil scan</h2><a class="primary-btn" href="/analyzer" data-link>Mulai scan</a></section>`}</section>`;
    const clear = $("#clearAnalysis");
    if (clear) clear.onclick = () => { if (confirm("Hapus semua riwayat analisis?")) { state.analyses = []; saveState(); analysis(); } };
  }

  function talk() {
    setTitle("SKINTalk");
    app.innerHTML = `<section class="container stack"><div class="between"><div><p class="eyebrow">SKINTalk</p><h2>Konsultasi AI</h2><p class="muted">Tanyakan kondisi kulit atau rutinitas yang sedang digunakan.</p></div><button id="clearChat" class="ghost-btn">Bersihkan chat</button></div><section class="card stack"><div class="chat-box" id="chatBox">${state.messages.map(messageRow).join("") || `<p class="muted">Mulai percakapan.</p>`}</div><form id="chatForm" class="row"><input name="text" placeholder="Tulis pertanyaan..." required><button class="primary-btn">Kirim</button></form></section></section>`;
    $("#clearChat").onclick = () => { state.messages = []; saveState(); talk(); };
  }

  function profile() {
    setTitle("Profil");
    app.innerHTML = `<section class="container stack"><div><p class="eyebrow">Profil</p><h2>Preferensi kulit</h2><p class="muted">Atur data dasar agar rekomendasi lebih sesuai.</p></div><div class="grid two"><form id="profileForm" class="card form-grid"><label>Nama<input name="name" value="${esc(state.user?.name || "")}"></label><label>Email<input name="email" type="email" value="${esc(state.user?.email || "")}" ${authUser ? "readonly" : ""}></label><label>Tipe kulit<select name="skinType">${skinOptions(state.skinType)}</select></label><fieldset class="card" style="box-shadow:none"><legend>Fokus kulit</legend><div class="grid two">${["acne", "oil", "dry", "pores", "redness", "texture", "uv"].map((c) => `<label class="checkbox"><input type="checkbox" name="concerns" value="${c}" ${state.concerns.includes(c) ? "checked" : ""}> ${label(c)}</label>`).join("")}</div></fieldset><button class="primary-btn">Simpan profil</button></form><section class="card stack"><h2>Akses akun</h2><p class="muted">Status: ${authUser ? "Login aktif" : state.guest ? "Coba tanpa login" : "Belum masuk"}</p><div class="row"><a class="primary-btn" href="/auth" data-link>Login / daftar</a><button class="secondary-btn" id="exportData">Export data</button><button class="danger-btn" id="resetData">Reset</button><button class="ghost-btn" id="logoutBtn">Keluar</button></div></section></div></section>`;
    $("#profileForm").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = Object.fromEntries(new FormData(form));
      state.user = { ...(state.user || {}), name: data.name || "Pengguna", email: data.email || state.user?.email || "" };
      state.skinType = data.skinType;
      state.concerns = Array.from(new FormData(form).getAll("concerns"));
      saveState();
      toast("Profil tersimpan.");
      profile();
    };
    $("#logoutBtn").onclick = logout;
    $("#exportData").onclick = exportData;
    $("#resetData").onclick = resetData;
  }

  async function logout() {
    try { await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); } catch {}
    authUser = null;
    state.guest = false;
    sessionStorage.removeItem(GUEST_SESSION);
    saveState();
    navigate("/welcome");
  }

  function bindCommon() {
    $$("[data-save]").forEach((button) => button.onclick = () => {
      if (!state.saved.includes(button.dataset.save)) state.saved.push(button.dataset.save);
      saveState();
      toast("Produk tersimpan.");
      if (pathNow() === "/recom") recom();
    });
    $$("[data-unsave]").forEach((button) => button.onclick = () => {
      state.saved = state.saved.filter((id) => id !== button.dataset.unsave);
      saveState();
      recom();
    });
  }

  function productCard(p) {
    const saved = state.saved.includes(p.id);
    return `<article class="product-card"><div class="product-img">${p.cat.slice(0,2).toUpperCase()}</div><h3>${esc(p.name)}</h3><p class="muted">${p.cat} · ${idr(p.min)} - ${idr(p.max)}</p><div class="row">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div><div class="between"><span class="price">${productScore(p)} match</span><span class="pill">${priceLabel(p)}</span></div><button class="${saved ? "secondary-btn" : "primary-btn"}" ${saved ? `data-unsave="${p.id}"` : `data-save="${p.id}"`}>${saved ? "Hapus" : "Simpan"}</button></article>`;
  }

  function articleCard(a) {
    const done = state.eduDone.includes(a.id);
    return `<article class="article-card"><div class="article-img">${a.cat.slice(0,2).toUpperCase()}</div><div class="between"><span class="tag">${esc(a.cat)}</span>${done ? `<span class="pill success">Selesai</span>` : ""}</div><h3>${esc(a.title)}</h3><p class="muted">${esc(a.body.slice(0, 92))}...</p><button class="secondary-btn" data-read="${a.id}">Baca</button></article>`;
  }

  function readArticle(articleId) {
    const article = education.find((item) => item.id === articleId);
    if (!article) return;
    openModal(`<p class="eyebrow">${esc(article.cat)}</p><h2 id="modalTitle">${esc(article.title)}</h2><p>${esc(article.body)}</p><button id="doneEdu" class="primary-btn">Tandai selesai</button>`);
    $("#doneEdu").onclick = () => {
      if (!state.eduDone.includes(articleId)) state.eduDone.push(articleId);
      saveState();
      closeModal();
      edu();
    };
  }

  function recommend() { return productSeed.slice().sort((a, b) => productScore(b) - productScore(a)); }
  function productScore(p) {
    let score = p.skin.includes(state.skinType) ? 3 : 1;
    state.concerns.forEach((c) => { if (p.issues.includes(c)) score += 1; });
    const a = latest();
    if (a?.acne > 50 && p.issues.includes("acne")) score += 1;
    if (a?.sebum > 62 && p.issues.includes("oil")) score += 1;
    if (a?.moisture < 48 && p.issues.includes("dry")) score += 1;
    return score;
  }

  function savedProducts() {
    return state.saved.map((id) => productSeed.find((p) => p.id === id)).filter(Boolean).map((p) => `<div class="list-item"><strong>${esc(p.name)}</strong><p class="muted">${idr(p.min)} - ${idr(p.max)}</p><button class="ghost-btn" data-unsave="${p.id}">Hapus</button></div>`).join("") || `<p class="muted">Belum ada produk tersimpan.</p>`;
  }

  function routineTips(a) {
    const tips = [];
    if (a.acne > 55) tips.push("Prioritaskan cleanser lembut dan hindari scrub kasar.");
    if (a.sebum > 65) tips.push("Pilih tekstur ringan dan non-comedogenic.");
    if (a.moisture < 48) tips.push("Tambahkan hidrasi ringan sebelum moisturizer.");
    if (a.sensitivity > 50) tips.push("Kurangi bahan aktif dan lakukan patch test.");
    if (!tips.length) tips.push("Pertahankan rutinitas dasar dan pantau perubahan mingguan.");
    return `<div class="list">${tips.map((tip) => `<div class="panel">${esc(tip)}</div>`).join("")}</div>`;
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deskin-data-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetData() {
    if (!confirm("Reset data lokal DeSkin?")) return;
    localStorage.removeItem(STORE);
    state = defaults();
    if (authUser) state.user = authUser;
    saveState();
    profile();
  }

  function openModal(html) {
    closeModal();
    const tpl = $("#modalTemplate").content.cloneNode(true);
    $(".modal-body", tpl).innerHTML = html;
    const backdrop = $(".modal-backdrop", tpl);
    $(".modal-close", tpl).onclick = closeModal;
    backdrop.onclick = (event) => { if (event.target === backdrop) closeModal(); };
    document.body.appendChild(tpl);
  }

  function closeModal() { $(".modal-backdrop")?.remove(); }
  function showFatal(message) { app.innerHTML = `<section class="container card stack"><h2>Aplikasi belum bisa dimuat</h2><p class="muted">${esc(message)}</p><button class="primary-btn" onclick="location.reload()">Muat ulang</button></section>`; }
  function stat(labelText, value, hint) { return `<div class="card stat"><span class="tag">${esc(labelText)}</span><strong>${esc(value)}</strong><small>${esc(hint)}</small></div>`; }
  function routineItem(r) { return `<label class="checkbox"><input type="checkbox" value="${r.id}" ${r.done ? "checked" : ""}><span><strong>${esc(r.time)}</strong> - ${esc(r.title)}</span></label>`; }
  function noteRow(n) { return `<div class="panel"><div class="between"><strong>${date(n.at)}</strong><span class="tag">Catatan</span></div><p class="muted">${esc(n.text)}</p></div>`; }
  function analysisRow(a) { return `<div class="list-item"><div class="avatar">${skinScore(a)}</div><div><strong>${date(a.date)}</strong><p class="muted">Moisture ${a.moisture}, Sebum ${a.sebum}, Acne ${a.acne}</p></div><span class="tag">${summary(a)}</span></div>`; }
  function messageRow(m) { return `<div class="message ${m.me ? "me" : ""}">${esc(m.text).replace(/\n/g, "<br>")}<small>${esc(m.at)}</small></div>`; }
  function completion() { return state.routine.length ? Math.round(state.routine.filter((r) => r.done).length / state.routine.length * 100) : 0; }
  function latest() { return state.analyses[state.analyses.length - 1] || null; }
  function meters(a) { a = a || { moisture: 0, sebum: 0, texture: 0, acne: 0, sensitivity: 0 }; return [["Kelembapan", a.moisture], ["Sebum", a.sebum], ["Tekstur", a.texture], ["Acne risk", a.acne], ["Sensitivitas", a.sensitivity]].map((x) => `<div class="meter"><div class="between"><strong>${x[0]}</strong><span>${x[1]}/100</span></div><div class="meter-bar"><span style="--value:${x[1]}"></span></div></div>`).join(""); }
  function skinScore(a) { return a ? clamp(a.moisture * .24 + (100 - Math.abs(55 - a.sebum)) * .18 + a.texture * .22 + (100 - a.acne) * .22 + (100 - a.sensitivity) * .14) : 0; }
  function summary(a) { if (!a) return "Belum ada hasil scan."; if (a.acne > 60) return "Fokus utama: jerawat."; if (a.sebum > 68) return "Sebum terlihat tinggi."; if (a.moisture < 45) return "Kelembapan rendah."; if (a.sensitivity > 55) return "Kulit mudah reaktif."; return "Kondisi cukup seimbang."; }
  function skinOptions(selected, includeAll = false) { const options = includeAll ? [["all", "Semua tipe"]] : []; return options.concat([["normal", "Normal"], ["oily", "Berminyak"], ["dry", "Kering"], ["combination", "Kombinasi"], ["sensitive", "Sensitif"]]).map((o) => `<option value="${o[0]}" ${o[0] === selected ? "selected" : ""}>${o[1]}</option>`).join(""); }
  function label(v) { return { acne: "Jerawat", oil: "Minyak", dry: "Kering", pores: "Pori", redness: "Kemerahan", texture: "Tekstur", uv: "UV" }[v] || v; }
  function firstName() { return (state.user?.name || authUser?.name || "Pengguna").split(" ")[0]; }
  function priceLabel(p) { const avg = (p.min + p.max) / 2; return avg < 80000 ? "Hemat" : avg < 160000 ? "Menengah" : "Premium"; }
  function idr(n) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n); }
  function date(value) { return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  function id() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function clamp(value, min = 0, max = 100) { return Math.max(min, Math.min(max, Math.round(Number(value) || 0))); }
  function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch])); }
  function toast(message) { toastEl.textContent = message; toastEl.classList.add("show"); clearTimeout(toastEl._timer); toastEl._timer = setTimeout(() => toastEl.classList.remove("show"), 3000); }
  function copyright() { if ($("#deskinCopyright")) return; const p = document.createElement("p"); p.id = "deskinCopyright"; p.textContent = "© 2026 Muhammad Naufal. All rights reserved."; document.body.appendChild(p); }
})();
