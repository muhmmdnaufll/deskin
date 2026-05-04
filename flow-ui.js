(() => {
  if (window.__deskinFlowUi127) return;
  window.__deskinFlowUi127 = true;

  const CURRENT_VERSION = "1.2.7";
  const pairs = [
    ["Naufal Signature", ""],
    ["DeSkin Flow", ""],
    ["Ciri khas DeSkin:", ""],
    ["Ciri khas", ""],
    ["v1.2.0", "v" + CURRENT_VERSION],
    ["v1.2.1", "v" + CURRENT_VERSION],
    ["v1.2.2", "v" + CURRENT_VERSION],
    ["v1.2.3", "v" + CURRENT_VERSION],
    ["v1.2.4", "v" + CURRENT_VERSION],
    ["v1.2.5", "v" + CURRENT_VERSION],
    ["v1.2.6", "v" + CURRENT_VERSION],
    ["Versi 1.2.0", "Versi " + CURRENT_VERSION],
    ["Versi 1.2.1", "Versi " + CURRENT_VERSION],
    ["Versi 1.2.2", "Versi " + CURRENT_VERSION],
    ["Versi 1.2.3", "Versi " + CURRENT_VERSION],
    ["Versi 1.2.4", "Versi " + CURRENT_VERSION],
    ["Versi 1.2.5", "Versi " + CURRENT_VERSION],
    ["Versi 1.2.6", "Versi " + CURRENT_VERSION],
    ["Skincare assistant yang terasa tenang, bersih, dan personal.", "Digital skin assistant untuk rutinitas kulit yang lebih terarah."],
    ["Skincare assistant yang bersih, seimbang, dan personal.", "Digital skin assistant untuk rutinitas kulit yang lebih terarah."],
    ["tidak ramai, tidak menggurui, fokus pada keputusan kecil yang bisa dilakukan hari ini.", ""],
    ["ringkas, seimbang, dan langsung ke langkah yang berguna hari ini.", ""],
    ["Tenang, bersih, ringkas, dan fokus pada langkah yang bisa dilakukan hari ini.", ""],
    ["Tenang, bersih, personal, dan berani sederhana.", ""],
    ["Bersih, seimbang, personal, dan mudah dipakai.", ""],
    ["Status auth: siap digunakan.", ""],
    ["Status auth: perlu konfigurasi Supabase di Vercel.", ""],
    ["Login aman belum aktif sampai Supabase disambungkan.", "Login belum aktif."],
    ["Setup dibutuhkan", "Guest"]
  ];

  function cleanText(node) {
    let text = node.nodeValue;
    for (const pair of pairs) text = text.split(pair[0]).join(pair[1]);
    text = text.replace(/\s{2,}/g, " ").replace(/\s+\./g, ".");
    if (text !== node.nodeValue) node.nodeValue = text;
  }

  function clean(root) {
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(cleanText);

    document.querySelectorAll(".footer-note").forEach((el) => {
      if (/Versi /i.test(el.textContent)) el.textContent = "Versi " + CURRENT_VERSION;
    });

    document.querySelectorAll(".pill").forEach((el) => {
      if (/^v?1\.2\.[0-6]$/i.test(el.textContent.trim())) el.textContent = "v" + CURRENT_VERSION;
    });

    document.querySelectorAll(".naufal-hero").forEach((el) => {
      el.classList.remove("naufal-hero");
      el.classList.add("flow-hero");
    });
    document.querySelectorAll(".signature-line").forEach((el) => {
      el.classList.remove("signature-line");
      el.classList.add("flow-line");
      if (!el.textContent.trim()) el.remove();
    });
    document.querySelectorAll(".secure-note,.flow-note").forEach((el) => {
      if (!el.textContent.trim() || el.textContent.trim() === ".") el.remove();
    });

    try {
      const key = "deskin_state_v112";
      const data = JSON.parse(localStorage.getItem(key) || "{}");
      if (data && typeof data === "object") {
        data.version = CURRENT_VERSION;
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch {}
  }

  const run = () => {
    clean(document.body);
    new MutationObserver((items) => {
      items.forEach((item) => item.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) cleanText(node);
        if (node.nodeType === Node.ELEMENT_NODE) clean(node);
      }));
    }).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
