(() => {
  if (window.__deskinFlowUi122) return;
  window.__deskinFlowUi122 = true;

  const pairs = [
    ["Naufal Signature", ""],
    ["DeSkin Flow", ""],
    ["Ciri khas DeSkin:", ""],
    ["Ciri khas", ""],
    ["v1.2.0", "v1.2.2"],
    ["v1.2.1", "v1.2.2"],
    ["Versi 1.2.0", "Versi 1.2.2"],
    ["Versi 1.2.1", "Versi 1.2.2"],
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
