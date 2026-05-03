const CACHE_NAME = "deskin-cache-v1-1-9b";

self.addEventListener("install", function(event) {
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(names) { return Promise.all(names.map(function(name) { return caches.delete(name); })); })
      .then(function() { return self.clients.claim(); })
  );
});

function inject(html) {
  html = html.replace(/main\.css\?v=1\.1\.\d+/g, "main.css?v=1.1.9");
  html = html.replace("const VERSION = '1.1.2';", "const VERSION = '1.1.9';");
  html = html.replace(/Versi 1\.1\.\d+/g, "Versi 1.1.9");
  if (html.indexOf("/scan.js?v=1.1.6") === -1) {
    var scan = '<scr' + 'ipt src="/scan.js?v=1.1.6" defer></scr' + 'ipt>';
    html = html.replace("</body>", scan + "\n</body>");
  }
  if (html.indexOf("/ai-ui.js?v=1.1.9") === -1) {
    var ai = '<scr' + 'ipt src="/ai-ui.js?v=1.1.9" defer></scr' + 'ipt>';
    html = html.replace("</body>", ai + "\n</body>");
  }
  return html;
}

self.addEventListener("fetch", function(event) {
  var request = event.request;
  if (request.method !== "GET") return;
  if (request.url.indexOf("/api/") !== -1) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(function(response) {
          return response.text().then(function(html) {
            return new Response(inject(html), {
              status: response.status,
              statusText: response.statusText,
              headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
            });
          });
        })
        .catch(function() { return caches.match("/index.html"); })
    );
    return;
  }
  event.respondWith(fetch(request, { cache: "no-store" }).catch(function() { return caches.match(request); }));
});
