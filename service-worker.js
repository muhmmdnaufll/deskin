const CACHE_NAME = "deskin-cache-v1-1-8";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

const AI_UI_PATCH = `<script>
(() => {
  if (window.__deskinAiUi118) return;
  window.__deskinAiUi118 = true;

  const STORE = "deskin_state_v112";
  const $ = (selector, root = document) => root.querySelector(selector);

  const style = document.createElement("style");
  style.textContent = `.ai-answer{display:grid;gap:10px;line-height:1.65}.ai-answer p{margin:0}.ai-answer strong{display:block;color:var(--text);margin-top:2px}.ai-answer ul,.ai-answer ol{margin:0;padding-left:20px;display:grid;gap:6px}.ai-thinking{display:inline-flex;align-items:center;gap:8px;color:var(--muted)}.ai-thinking:after{content:"";width:24px;height:8px;border-radius:999px;background:linear-gradient(90deg,currentColor 20%,transparent 20% 40%,currentColor 40% 60%,transparent 60% 80%,currentColor 80%);opacity:.6;animation:deskinPulse 1s infinite}@keyframes deskinPulse{0%,100%{opacity:.35}50%{opacity:.95}}`;
  document.head.appendChild(style);

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!form || form.id !== "chatForm") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const input = form.querySelector('input[name="text"]');
    const button = form.querySelector('button');
    const chatBox = $("#chatBox");
    if (!input || !chatBox) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    if (button) {
      button.disabled = true;
      button.textContent = "Menjawab...";
    }

    const userMessage = { me: true, text, at: timeNow() };
    persistMessage(userMessage);
    addMessage(chatBox, escapeHtml(text), true, userMessage.at, false);

    const thinking = addMessage(chatBox, '<span class="ai-thinking">DeSkin AI sedang berpikir</span>', false, timeNow(), true);

    try {
      const answer = await callAI(text, "SKINTalk");
      if (thinking) thinking.remove();
      const clean = plainText(answer);
      persistMessage({ me: false, text: clean, at: timeNow() });
      addMessage(chatBox, formatAI(answer), false, timeNow(), true);
    } catch (error) {
      if (thinking) thinking.remove();
      addMessage(chatBox, "AI sedang tidak dapat menjawab. Coba lagi beberapa saat.", false, timeNow(), false);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Kirim";
      }
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }, true);

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-ai]");
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const prompt = button.dataset.ai || "Berikan saran skincare singkat.";
    const modal = openModal('<h2 id="modalTitle">DeSkin AI</h2><div class="ai-answer"><p class="ai-thinking">DeSkin AI sedang berpikir</p></div>');
    try {
      const answer = await callAI(prompt, "DeSkin");
      const body = modal && modal.querySelector(".modal-body");
      if (body) body.innerHTML = '<h2 id="modalTitle">DeSkin AI</h2><div class="ai-answer">' + formatAI(answer) + '</div>';
    } catch (error) {
      const body = modal && modal.querySelector(".modal-body");
      if (body) body.innerHTML = '<h2 id="modalTitle">DeSkin AI</h2><p>AI sedang tidak tersedia. Coba lagi beberapa saat.</p>';
    }
  }, true);

  async function callAI(message, feature) {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature, message })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "AI gagal merespons.");
    return data.answer || "Belum ada jawaban.";
  }

  function addMessage(chatBox, html, isMe, at, isHtml) {
    const empty = chatBox.querySelector(".muted");
    if (empty && empty.textContent.includes("Mulai percakapan")) empty.remove();
    const item = document.createElement("div");
    item.className = "message" + (isMe ? " me" : "");
    item.innerHTML = (isHtml ? html : escapeHtml(html)) + "<small>" + escapeHtml(at) + "</small>";
    chatBox.appendChild(item);
    chatBox.scrollTop = chatBox.scrollHeight;
    return item;
  }

  function formatAI(value) {
    let text = plainText(value)
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/```[a-z]*\n?/gi, "")
      .replace(/```/g, "")
      .replace(/\s+(?=\d+\.\s+[A-ZÀ-ž])/g, "\n\n")
      .trim();

    const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
    if (!blocks.length) return "<p>Belum ada jawaban.</p>";

    return blocks.map((block) => {
      const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
      const numbered = lines.length > 1 && lines.every((line) => /^\d+[.)]\s+/.test(line));
      const bullets = lines.length > 1 && lines.every((line) => /^[-•*]\s+/.test(line));

      if (numbered) {
        return "<ol>" + lines.map((line) => "<li>" + escapeHtml(line.replace(/^\d+[.)]\s+/, "")) + "</li>").join("") + "</ol>";
      }
      if (bullets) {
        return "<ul>" + lines.map((line) => "<li>" + escapeHtml(line.replace(/^[-•*]\s+/, "")) + "</li>").join("") + "</ul>";
      }
      if (lines.length === 1 && /^[^.!?]{3,48}:$/.test(lines[0])) {
        return "<strong>" + escapeHtml(lines[0].replace(/:$/, "")) + "</strong>";
      }
      return "<p>" + lines.map(escapeHtml).join("<br>") + "</p>";
    }).join("");
  }

  function plainText(value) {
    return String(value || "")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function persistMessage(message) {
    try {
      const state = JSON.parse(localStorage.getItem(STORE) || "{}");
      state.messages = Array.isArray(state.messages) ? state.messages : [];
      state.messages.push(message);
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch {}
  }

  function openModal(html) {
    const old = document.querySelector(".modal-backdrop");
    if (old) old.remove();
    const template = document.querySelector("#modalTemplate");
    if (!template) return null;
    const node = template.content.cloneNode(true);
    const body = node.querySelector(".modal-body");
    const close = node.querySelector(".modal-close");
    const backdrop = node.querySelector(".modal-backdrop");
    if (body) body.innerHTML = html;
    if (close) close.addEventListener("click", () => backdrop && backdrop.remove());
    if (backdrop) backdrop.addEventListener("click", (event) => { if (event.target === backdrop) backdrop.remove(); });
    document.body.appendChild(node);
    return document.querySelector(".modal-backdrop");
  }

  function timeNow() {
    return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[ch]));
  }
})();
</script>`;

function patchIndex(html) {
  html = html.replace(/scan\.js\?v=1\.1\.5/g, "scan.js?v=1.1.6");
  html = html.replace(/main\.css\?v=1\.1\.\d+/g, "main.css?v=1.1.8");
  html = html.replace("const VERSION = '1.1.2';", "const VERSION = '1.1.8';");
  html = html.replace(/Versi 1\.1\.\d+/g, "Versi 1.1.8");

  if (html.indexOf("scan.js?v=1.1.6") === -1) {
    const scanTag = '<scr' + 'ipt src="/scan.js?v=1.1.6" defer></scr' + 'ipt>\n</body>';
    html = html.replace("</body>", scanTag);
  }
  if (html.indexOf("__deskinAiUi118") === -1) {
    html = html.replace("</body>", AI_UI_PATCH + "\n</body>");
  }
  return html;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (request.url.indexOf("/api/") !== -1) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => response.text().then((html) => new Response(patchIndex(html), {
          status: response.status,
          statusText: response.statusText,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
        })))
        .catch(() => caches.match("/index.html"))
    );
  }
});
