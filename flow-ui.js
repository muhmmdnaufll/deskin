(() => {
  if (window.__deskinFlowUi121) return;
  window.__deskinFlowUi121 = true;

  const pairs = [
    ["Naufal Signature", "DeSkin Flow"],
    ["Ciri khas DeSkin:", ""],
    ["Ciri khas", "DeSkin Flow"],
    ["v1.2.0", "v1.2.1"],
    ["Versi 1.2.0", "Versi 1.2.1"],
    ["Skincare assistant yang terasa tenang, bersih, dan personal.", "Skincare assistant yang bersih, seimbang, dan personal."],
    ["tidak ramai, tidak menggurui, fokus pada keputusan kecil yang bisa dilakukan hari ini.", "ringkas, seimbang, dan langsung ke langkah yang berguna hari ini."],
    ["Tenang, bersih, personal, dan berani sederhana.", "Bersih, seimbang, personal, dan mudah dipakai."],
    ["Ringkas, tenang, personal, dan berani sederhana.", "Bersih, seimbang, personal, dan mudah dipakai."],
    ["Status auth: siap digunakan.", "Akun tersambung dengan aman."],
    ["Status auth: perlu konfigurasi Supabase di Vercel.", "Login aman sedang disiapkan."],
    ["Login aman belum aktif sampai Supabase disambungkan.", "Login aman sedang disiapkan."],
    ["Setup dibutuhkan", "Guest"]
  ];

  function cleanText(node) {
    let text = node.nodeValue;
    for (const pair of pairs) text = text.split(pair[0]).join(pair[1]);
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
