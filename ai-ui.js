(() => {
  if (window.__deskinAiUi119) return;
  window.__deskinAiUi119 = true;

  const STORE = "deskin_state_v112";
  const $ = (selector, root = document) => root.querySelector(selector);

  const style = document.createElement("style");
  style.textContent = [
    ".ai-answer{display:grid;gap:10px;line-height:1.65;white-space:normal}",
    ".ai-answer p{margin:0}",
    ".ai-answer strong{display:block;margin-top:2px;color:var(--text)}",
    ".ai-answer ul,.ai-answer ol{margin:0;padding-left:22px;display:grid;gap:6px}",
    ".ai-thinking{display:inline-flex;align-items:center;gap:8px;color:var(--muted);font-weight:600}",
    ".ai-thinking::after{content:\"\";width:24px;height:8px;border-radius:999px;background:currentColor;opacity:.45;animation:deskinThink 1s infinite}",
    "@keyframes deskinThink{0%,100%{transform:scaleX(.45);opacity:.3}50%{transform:scaleX(1);opacity:.9}}"
  ].join("");
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

    const userTime = timeNow();
    persistMessage({ me: true, text, at: userTime });
    addMessage(chatBox, escapeHtml(text), true, userTime, true);

    const thinking = addMessage(chatBox, '<span class="ai-thinking">DeSkin AI sedang berpikir</span>', false, timeNow(), true);

    try {
      const answer = await callAI(text, "SKINTalk");
      if (thinking) thinking.remove();
      const cleaned = cleanText(answer);
      const aiTime = timeNow();
      persistMessage({ me: false, text: cleaned, at: aiTime });
      addMessage(chatBox, formatAI(cleaned), false, aiTime, true);
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
      if (body) body.innerHTML = '<h2 id="modalTitle">DeSkin AI</h2><div class="ai-answer">' + formatAI(cleanText(answer)) + '</div>';
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

  function cleanText(value) {
    return String(value || "")
      .replace(/\r/g, "")
      .replace(/```[a-z]*\n?/gi, "")
      .replace(/```/g, "")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s+(?=\d+[.)]\s+)/g, "\n")
      .trim();
  }

  function formatAI(text) {
    const blocks = cleanText(text).split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
    if (!blocks.length) return "<p>Belum ada jawaban.</p>";

    return blocks.map((block) => {
      const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
      const numbered = lines.length > 1 && lines.every((line) => /^\d+[.)]\s+/.test(line));
      const bullets = lines.length > 1 && lines.every((line) => /^[-•]\s+/.test(line));

      if (numbered) {
        return "<ol>" + lines.map((line) => "<li>" + escapeHtml(line.replace(/^\d+[.)]\s+/, "")) + "</li>").join("") + "</ol>";
      }
      if (bullets) {
        return "<ul>" + lines.map((line) => "<li>" + escapeHtml(line.replace(/^[-•]\s+/, "")) + "</li>").join("") + "</ul>";
      }
      if (lines.length === 1 && /^[^.!?]{3,48}:$/.test(lines[0])) {
        return "<strong>" + escapeHtml(lines[0].replace(/:$/, "")) + "</strong>";
      }
      return "<p>" + lines.map(escapeHtml).join("<br>") + "</p>";
    }).join("");
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
