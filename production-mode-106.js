(() => {
  "use strict";

  start();

  function start() {
    apply();
    window.addEventListener("hashchange", apply);
    document.addEventListener("click", function (event) {
      const blocked = event.target.closest('a[href="#/map"], a[data-path="#/map"]');
      if (!blocked) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      location.hash = "#/dashboard";
    }, true);
    setInterval(apply, 1500);
  }

  function apply() {
    if (location.hash === "#/map") {
      location.hash = "#/dashboard";
      return;
    }

    document.querySelectorAll('a[href="#/map"], a[data-path="#/map"]').forEach((item) => item.remove());
    document.querySelectorAll("#mainNav .ico").forEach((item, index) => {
      item.textContent = String(index + 1).padStart(2, "0");
    });

    cleanVisibleCopy();
    polishRoute();
  }

  function polishRoute() {
    const route = location.hash || "#/welcome";
    const side = document.querySelector(".side-card");
    if (side) side.innerHTML = '<p class="eyebrow">Privasi lokal</p><p>Data pengguna disimpan di perangkat dan dipakai untuk personalisasi fitur.</p>';

    if (route === "#/welcome") {
      setText(".hero h2", "Digital skin assistant untuk rutinitas kulit yang lebih terukur.");
      setText(".hero p", "DeSkin membantu memantau kondisi kulit, menyusun rutinitas, membaca progres, memberi edukasi, dan menyediakan konsultasi berbasis AI dalam satu aplikasi ringan.");
      setText("#demoLogin", "Masuk");
      setText(".footer-note", "Versi 1.0.6. Data pengguna tersimpan lokal di perangkat.");
    }

    if (route === "#/auth") {
      setText("#quickDemo", "Lanjutkan");
      setText(".auth-side p:not(.eyebrow)", "Preferensi dan progres disimpan di perangkat untuk personalisasi fitur.");
    }

    if (route === "#/analyzer") {
      const form = document.querySelector("#analysisForm");
      if (form) form.remove();
      setText(".container .between h2", "Scan wajah dan simpan hasil analisis");
      setText(".container .between .muted", "Foto diproses secara lokal di browser untuk menjaga privasi. Hasil scan dipakai oleh fitur rekomendasi lain.");
    }

    if (route === "#/talk") {
      setText(".container .between h2", "Konsultasi dan diskusi");
      setText(".container .between .muted", "Gunakan chat AI untuk arahan awal dan jadwalkan konsultasi bila membutuhkan bantuan ahli.");
    }

    if (route === "#/profile") {
      setText("#resetData", "Reset data");
    }

    if (["#/dashboard", "#/daily", "#/market", "#/edu", "#/analysis", "#/talk", "#/profile"].includes(route)) {
      addStatus(route);
    }
  }

  function addStatus(route) {
    const container = document.querySelector("#app .container.stack");
    if (!container || container.querySelector(".production-status-card")) return;
    const labels = {
      "#/dashboard": ["Dashboard aktif", "Pantau skor kulit, rutinitas, rekomendasi produk, dan insight AI dari satu halaman."],
      "#/daily": ["Rutinitas aktif", "Checklist harian membantu menjaga konsistensi dan progres perawatan."],
      "#/market": ["Rekomendasi personal", "Produk diprioritaskan berdasarkan tipe kulit, masalah utama, dan hasil analisis terakhir."],
      "#/edu": ["Edukasi terarah", "Materi edukasi dapat disesuaikan dengan kondisi kulit terbaru."],
      "#/analysis": ["Analisis tersimpan", "Hasil scan dipakai untuk rekomendasi rutinitas, produk, edukasi, dan konsultasi AI."],
      "#/talk": ["Konsultasi aktif", "Chat AI dan jadwal konsultasi membantu pengguna mengambil langkah berikutnya."],
      "#/profile": ["Profil personal", "Preferensi profil dipakai untuk menyesuaikan rekomendasi aplikasi."]
    };
    const data = labels[route];
    if (!data) return;
    const card = document.createElement("section");
    card.className = "panel production-status-card";
    card.innerHTML = '<div class="between"><strong>' + esc(data[0]) + '</strong><span class="pill success">Production ready</span></div><p class="muted">' + esc(data[1]) + '</p>';
    container.insertBefore(card, container.children[1] || null);
  }

  function cleanVisibleCopy() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(parent.tagName)) continue;
      if (/demo|prototype|simulasi|booth|partner|skinmap|peta/i.test(node.nodeValue || "")) nodes.push(node);
    }
    nodes.forEach((node) => {
      node.nodeValue = String(node.nodeValue || "")
        .replace(/\b[Pp]rototype\b/g, "Aplikasi")
        .replace(/\b[Dd]ata demo\b/g, "Data aplikasi")
        .replace(/\b[Dd]emo\b/g, "")
        .replace(/\bmode demo\b/gi, "mode aplikasi")
        .replace(/\bDetector simulasi\b/gi, "Detector")
        .replace(/\bSimulated\b/g, "Connected")
        .replace(/\bBooth\b/g, "Layanan")
        .replace(/\bPartner\b/g, "Layanan")
        .replace(/\bSKINMap\b/g, "")
        .replace(/\bPeta partner\b/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\s+([.,:;!?])/g, "$1")
        .trim();
    });
  }

  function setText(selector, text) {
    const node = document.querySelector(selector);
    if (node) node.textContent = text;
  }

  function esc(value) {
    return String(value || "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char]));
  }
})();
