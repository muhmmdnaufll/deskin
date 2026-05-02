const CACHE_NAME = "deskin-cache-v1-1-6";

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

function patchIndex(html) {
  html = html.replace(/scan\.js\?v=1\.1\.5/g, "scan.js?v=1.1.6");
  html = html.replace(/main\.css\?v=1\.1\.2/g, "main.css?v=1.1.6");
  html = html.replace("const VERSION = '1.1.2';", "const VERSION = '1.1.6';");
  if (html.indexOf("scan.js?v=1.1.6") === -1) {
    const tag = '<scr' + 'ipt src="/scan.js?v=1.1.6" defer></scr' + 'ipt>\n</body>';
    html = html.replace("</body>", tag);
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
