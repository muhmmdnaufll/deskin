const CACHE_NAME = "deskin-cache-v1-1-5";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((name) => name !== CACHE_NAME ? caches.delete(name) : undefined)))
      .then(() => self.clients.claim())
  );
});

function patchIndex(html) {
  if (html.includes("scan.js?v=1.1.5")) return html;
  return html
    .replace(/main\.css\?v=1\.1\.\d+/g, "main.css?v=1.1.5")
    .replace(/const VERSION = '1\.1\.\d+';/g, "const VERSION = '1.1.5';")
    .replace(/<\/body>/i, '<script src="/scan.js?v=1.1.5" defer></script>\n</body>');
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.url.includes("/api/")) return;
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
