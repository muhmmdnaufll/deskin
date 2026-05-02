(() => {
  "use strict";

  const STORE = "deskin_state_v4";
  let lastRunKey = "";

  boot();

  function boot() {
    cleanSavedState();
    scheduleCleanup();
    window.addEventListener("hashchange", scheduleCleanup);
  }

  function scheduleCleanup() {
    setTimeout(applyProductionCopy, 80);
    setTimeout(applyProductionCopy, 450);
  }

  function cleanSavedState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORE) || "{}");
      let changed = false;

      if (Array.isArray(state.analyses)) {
        const before = state.analyses.length;
        state.analyses = state.analyses.filter((item) => String(item.source || "").toLowerCase() !== "demo");
        changed = changed || state.analyses.length !== before;
      }

      if (Array.isArray(state.messages)) {
        const before = state.messages.length;
        state.messages = state.messages.filter((item) => !/saya punya kulit berminyak dan jerawat di dagu/i.test(String(item.text || "")));
        changed = changed || state.messages.length !== before;
      }

      if (changed) localStorage.setItem(STORE, JSON.stringify(state));
    } catch {}
  }

  function applyProductionCopy() {
    const route = location.hash || "#/welcome";
    const appTextLength = document.getElementById("app")?.textContent?.length || 0;
    const runKey = `${route}:${appTextLength}`;
    if (runKey === lastRunKey) return;
    lastRunKey = runKey;

    const side = document.querySelector(".side-card");
    if (side) {
      side.innerHTML = `<p class="eyebrow">Privasi lokal</p><p>Data pengguna disimpan di perangkat dan dipakai untuk personalisasi fitur.</p>`;
    }

    if (document.querySelector("#pageTitle")?.textContent === "SKINMap") {
      const heading = document.querySelector(".container .between h2");
      const desc = document.querySelector(".container .between .muted");
      if (heading) heading.textContent = "Klinik kulit dan kecantikan terdekat";
      if (desc) desc.textContent = "Cari klinik kulit, dokter kulit, klinik kecantikan, dan layanan perawatan wajah berdasarkan lokasi perangkat.";
    }

    replaceTextNodes(document.body);
  }

  function replaceTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !/demo|prototype|simulasi|booth|partner/i.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const next = cleanText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }

  function cleanText(text) {
    return String(text || "")
      .replace(/\b[Pp]rototype\b/g, "Aplikasi")
      .replace(/\b[Dd]ata demo\b/g, "Data aplikasi")
      .replace(/\b[Dd]emo\b/g, "")
      .replace(/\bmode demo\b/gi, "mode aplikasi")
      .replace(/\bDetector simulasi\b/gi, "Detector")
      .replace(/\bSimulated\b/g, "Connected")
      .replace(/\bBooth\b/g, "Layanan")
      .replace(/\bPartner\b/g, "Layanan")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([.,:;!?])/g, "$1")
      .trim();
  }
})();
