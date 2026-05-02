(() => {
  "use strict";

  const STORE = "deskin_state_v4";
  const $ = (selector, root = document) => root.querySelector(selector);

  const replacements = [
    [/\b[Pp]rototype\b/g, "Aplikasi"],
    [/\b[Dd]ata demo\b/g, "Data aplikasi"],
    [/\b[Dd]emo\b/g, ""],
    [/\bmode demo\b/gi, "mode aplikasi"],
    [/\bMasuk cepat\b/g, "Masuk"],
    [/\bMasuk\s+cepat\b/g, "Masuk"],
    [/\bMasuk\s+akun\b/g, "Masuk"],
    [/\bGunakan akun\b/g, "Masuk"],
    [/\bReset\s+\b/gi, "Reset "],
    [/\bCheckout\s+selesai\b/gi, "Checkout selesai"],
    [/\bDetector simulasi\b/gi, "Detector"],
    [/\bSimulated\b/g, "Connected"],
    [/\bData lokasi\s+untuk\b/gi, "Pencarian lokasi untuk"],
    [/\bPeta partner\b/g, "Klinik kulit dan kecantikan terdekat"],
    [/\bBooth\b/g, "Layanan"],
    [/\bPartner\b/g, "Layanan"],
    [/\bForum diskusi\b/g, "Diskusi pengguna"],
  ];

  boot();

  function boot() {
    cleanSavedState();
    applySeriousCopy();
    new MutationObserver(applySeriousCopy).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function cleanSavedState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORE) || "{}");
      if (Array.isArray(state.analyses)) {
        state.analyses = state.analyses.filter((item) => String(item.source || "").toLowerCase() !== "demo");
      }
      if (Array.isArray(state.messages)) {
        state.messages = state.messages.filter((item) => !/saya punya kulit berminyak dan jerawat di dagu/i.test(String(item.text || "")));
      }
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch {}
  }

  function applySeriousCopy() {
    const side = document.querySelector(".side-card");
    if (side) {
      side.innerHTML = `<p class="eyebrow">Privasi lokal</p><p>Data pengguna disimpan di perangkat dan dipakai untuk personalisasi fitur.</p>`;
    }

    document.querySelectorAll("button, a, p, small, span, h1, h2, h3, strong, label, option").forEach((node) => {
      if (!node.childNodes.length) return;
      if ([...node.childNodes].some((child) => child.nodeType === 1 && child.tagName !== "BR")) return;
      const original = node.textContent;
      const next = cleanText(original);
      if (next !== original) node.textContent = next;
    });

    const mapHeading = document.querySelector("#pageTitle")?.textContent === "SKINMap" ? document.querySelector(".container .between h2") : null;
    if (mapHeading) mapHeading.textContent = "Klinik kulit dan kecantikan terdekat";

    const mapDesc = document.querySelector("#pageTitle")?.textContent === "SKINMap" ? document.querySelector(".container .between .muted") : null;
    if (mapDesc) mapDesc.textContent = "Cari klinik kulit, dokter kulit, klinik kecantikan, dan layanan perawatan wajah berdasarkan lokasi perangkat.";
  }

  function cleanText(text) {
    let value = String(text || "");
    for (const [pattern, replacement] of replacements) value = value.replace(pattern, replacement);
    value = value.replace(/\s{2,}/g, " ").replace(/\s+([.,:;!?])/g, "$1").trim();
    return value;
  }
})();
