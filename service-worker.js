const CACHE_NAME = "deskin-cache-v1-1-3";
const APP_SHELL = ["/", "/index.html", "/main.css", "/manifest.webmanifest", "/404.html"];

const BALANCED_SCAN_PATCH = String.raw`
<script>
(() => {
  if (window.__deskinBalancedScanV113) return;
  window.__deskinBalancedScanV113 = true;
  const STORE = 'deskin_state_v112';
  const $ = (s, r = document) => r.querySelector(s);
  let stream = null;
  let pendingScan = null;

  document.addEventListener('click', async (event) => {
    const open = event.target.closest('#openCamera');
    const capture = event.target.closest('#capturePhoto');
    const save = event.target.closest('#saveScan');
    if (open) { event.preventDefault(); event.stopImmediatePropagation(); openCamera(); }
    if (capture) { event.preventDefault(); event.stopImmediatePropagation(); capturePhoto(); }
    if (save) { event.preventDefault(); event.stopImmediatePropagation(); saveScan(); }
  }, true);

  document.addEventListener('change', (event) => {
    if (event.target && event.target.id === 'uploadPhoto') {
      event.stopImmediatePropagation();
      uploadPhoto(event);
    }
  }, true);

  window.addEventListener('hashchange', patchAnalyzerCopy);
  document.addEventListener('DOMContentLoaded', patchAnalyzerCopy);
  setTimeout(patchAnalyzerCopy, 600);

  function patchAnalyzerCopy() {
    document.querySelectorAll('.footer-note').forEach((node) => { node.textContent = 'Versi 1.1.3'; });
    if (location.hash !== '#/analyzer') return;
    const btn = $('#capturePhoto');
    if (btn && !$('#videoPreview')) btn.disabled = true;
  }

  async function openCamera() {
    try {
      stopCamera();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      const box = $('#cameraBox');
      if (!box) return;
      box.innerHTML = '<video id="videoPreview" autoplay playsinline muted></video><span class="capture-overlay"></span>';
      $('#videoPreview').srcObject = stream;
      const capture = $('#capturePhoto');
      if (capture) capture.disabled = false;
      toast('Kamera aktif.');
    } catch (error) {
      toast('Kamera tidak dapat dibuka. Gunakan upload foto.');
    }
  }

  function capturePhoto() {
    const video = $('#videoPreview');
    if (!video) return toast('Buka kamera lebih dulu.');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    const box = $('#cameraBox');
    if (box) box.innerHTML = '<img src="' + dataUrl + '" alt="Foto scan wajah"><span class="capture-overlay"></span>';
    stopCamera();
    analyzeDataUrl(dataUrl);
  }

  function uploadPhoto(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const box = $('#cameraBox');
      if (box) box.innerHTML = '<img src="' + dataUrl + '" alt="Foto scan wajah"><span class="capture-overlay"></span>';
      analyzeDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function analyzeDataUrl(dataUrl) {
    const img = new Image();
    img.onload = () => {
      const result = readSkinFromImage(img);
      const scanBox = $('#scanBox');
      const saveBtn = $('#saveScan');
      if (!scanBox || !saveBtn) return;
      if (!result.ok) {
        pendingScan = null;
        scanBox.innerHTML = '<div class="panel"><strong>Foto belum cukup jelas</strong><p class="muted">' + escapeHtml(result.reason) + ' Coba cahaya depan, wajah lebih tengah, dan latar tidak terlalu mendominasi.</p></div>';
        saveBtn.disabled = true;
        toast('Scan belum dapat diproses.');
        return;
      }
      pendingScan = result.scan;
      scanBox.innerHTML = '<div class="panel"><div class="between"><strong>Scan siap disimpan</strong><span class="pill success">Kualitas ' + result.quality + '%</span></div><p class="muted">' + escapeHtml(summary(pendingScan)) + '</p></div>' + meters(pendingScan) + '<p class="muted">Hasil ini bersifat estimasi visual untuk membantu tracking perawatan.</p>';
      saveBtn.disabled = false;
      toast('Scan selesai.');
    };
    img.onerror = () => toast('Foto tidak dapat dibaca.');
    img.src = dataUrl;
  }

  function readSkinFromImage(img) {
    const size = 224;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const fit = coverFit(img.width, img.height, size, size);
    ctx.drawImage(img, fit.sx, fit.sy, fit.sw, fit.sh, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    let skinCount = 0, total = 0, sumY = 0, shine = 0, red = 0, shadow = 0;
    let sumR = 0, sumG = 0, sumB = 0, sumR2 = 0, sumG2 = 0, sumB2 = 0;
    let edge = 0, edgeCount = 0, minX = size, minY = size, maxX = 0, maxY = 0;

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const i = (y * size + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        total++;
        const ni = (y * size + x + 1) * 4;
        const di = ((y + 1) * size + x) * 4;
        edge += (Math.abs(r - data[ni]) + Math.abs(g - data[ni + 1]) + Math.abs(b - data[ni + 2]) + Math.abs(r - data[di]) + Math.abs(g - data[di + 1]) + Math.abs(b - data[di + 2])) / 6;
        edgeCount++;
        if (!isSkinPixel(r, g, b)) continue;
        const yy = (r + g + b) / 3;
        skinCount++; sumY += yy;
        sumR += r; sumG += g; sumB += b; sumR2 += r * r; sumG2 += g * g; sumB2 += b * b;
        if (yy > 188 && Math.max(r, g, b) - Math.min(r, g, b) < 78) shine++;
        if (r > g * 1.08 && r > b * 1.18 && yy > 55) red++;
        if (yy < 78) shadow++;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }

    const ratio = skinCount / Math.max(1, total);
    const boxArea = skinCount ? ((maxX - minX + 1) * (maxY - minY + 1)) / (size * size) : 0;
    const avgY = sumY / Math.max(1, skinCount);
    const avgEdge = edge / Math.max(1, edgeCount);
    const avgR = sumR / Math.max(1, skinCount), avgG = sumG / Math.max(1, skinCount), avgB = sumB / Math.max(1, skinCount);
    const colorStd = Math.sqrt(Math.max(0, (sumR2 / Math.max(1, skinCount) - avgR * avgR + sumG2 / Math.max(1, skinCount) - avgG * avgG + sumB2 / Math.max(1, skinCount) - avgB * avgB) / 3));
    const plainWall = ratio > 0.74 && colorStd < 11 && avgEdge < 4.8;
    const quality = clamp(40 + ratio * 32 + Math.min(20, boxArea * 24) + Math.min(18, colorStd * 0.9) + Math.min(16, avgEdge * 1.5), 0, 96);

    if (skinCount < total * 0.045 || boxArea < 0.06) return { ok: false, quality, reason: 'Area wajah/kulit belum cukup terlihat.' };
    if (avgY < 42) return { ok: false, quality, reason: 'Foto terlalu gelap.' };
    if (avgY > 235) return { ok: false, quality, reason: 'Foto terlalu terang.' };
    if (plainWall) return { ok: false, quality, reason: 'Gambar terlihat terlalu polos untuk dianalisis.' };
    if (quality < 50) return { ok: false, quality, reason: 'Detail wajah belum cukup terbaca.' };

    const redness = red / Math.max(1, skinCount) * 100;
    const oil = shine / Math.max(1, skinCount) * 100;
    const dull = clamp((124 - avgY) * 0.8 + (shadow / Math.max(1, skinCount)) * 32, 0, 100);
    const uneven = clamp(colorStd * 2.1, 0, 100);
    const textureNoise = clamp(avgEdge * 2.6, 0, 100);
    const scan = {
      date: new Date().toISOString(),
      moisture: clamp(74 - dull * 0.42 - textureNoise * 0.08 + (avgY > 146 ? 4 : 0), 18, 94),
      sebum: clamp(30 + oil * 0.55 + Math.max(0, avgY - 148) * 0.18, 8, 94),
      texture: clamp(86 - textureNoise * 0.55 - uneven * 0.16, 18, 96),
      acne: clamp(14 + redness * 0.62 + Math.max(0, uneven - 32) * 0.18 + Math.max(0, textureNoise - 22) * 0.18, 5, 92),
      sensitivity: clamp(14 + redness * 0.48 + Math.max(0, uneven - 28) * 0.12, 5, 88),
      quality,
      notes: 'Hasil scan tersimpan.'
    };
    return { ok: true, quality, scan };
  }

  function saveScan() {
    if (!pendingScan) return;
    const state = loadState();
    state.analyses = Array.isArray(state.analyses) ? state.analyses : [];
    state.concerns = Array.isArray(state.concerns) ? state.concerns : [];
    state.analyses.push(pendingScan);
    const next = [];
    if (pendingScan.acne > 50) next.push('acne');
    if (pendingScan.sebum > 62) next.push('oil');
    if (pendingScan.moisture < 48) next.push('dry');
    if (pendingScan.texture < 58) next.push('texture');
    if (pendingScan.sensitivity > 42) next.push('redness');
    if (pendingScan.sebum > 62 && pendingScan.texture < 65) next.push('pores');
    state.concerns = Array.from(new Set(next.concat(state.concerns))).slice(0, 7);
    if (pendingScan.sensitivity > 55) state.skinType = 'sensitive';
    else if (pendingScan.sebum > 64 && pendingScan.moisture < 54) state.skinType = 'combination';
    else if (pendingScan.sebum > 62) state.skinType = 'oily';
    else if (pendingScan.moisture < 45) state.skinType = 'dry';
    localStorage.setItem(STORE, JSON.stringify(state));
    pendingScan = null;
    location.hash = '#/analysis';
    location.reload();
  }

  function isSkinPixel(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const hsv = rgbToHsv(r, g, b);
    const ycbcr = rgbToYcbcr(r, g, b);
    const rgbRule = r > 45 && g > 28 && b > 18 && r >= g * 0.72 && r > b * 0.95 && max - min > 8;
    const hsvRule = hsv.h >= 0 && hsv.h <= 62 && hsv.s >= 0.07 && hsv.s <= 0.78 && hsv.v >= 0.18;
    const ycbcrRule = ycbcr.cb >= 72 && ycbcr.cb <= 145 && ycbcr.cr >= 122 && ycbcr.cr <= 190;
    return (rgbRule && hsvRule) || (ycbcrRule && hsv.v > 0.22);
  }
  function rgbToHsv(r, g, b) { r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min; let h = 0; if (d) { h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return { h, s: max === 0 ? 0 : d / max, v: max }; }
  function rgbToYcbcr(r, g, b) { return { cb: 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, cr: 128 + 0.5 * r - 0.418688 * g - 0.081312 * b }; }
  function coverFit(sw, sh, dw, dh) { const scale = Math.max(dw / sw, dh / sh); const w = dw / scale, h = dh / scale; return { sx: (sw - w) / 2, sy: (sh - h) / 2, sw: w, sh: h }; }
  function stopCamera() { if (stream) { stream.getTracks().forEach((track) => track.stop()); stream = null; } }
  function loadState() { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } }
  function meters(a) { return [['Kelembapan', a.moisture], ['Sebum', a.sebum], ['Tekstur', a.texture], ['Acne risk', a.acne], ['Sensitivitas', a.sensitivity]].map((x) => '<div class="meter"><div class="between"><strong>' + x[0] + '</strong><span>' + x[1] + '/100</span></div><div class="meter-bar"><span style="--value:' + x[1] + '"></span></div></div>').join(''); }
  function summary(a) { if (a.acne > 60) return 'Fokus utama: jerawat.'; if (a.sebum > 68) return 'Sebum terlihat tinggi.'; if (a.moisture < 45) return 'Kelembapan rendah.'; if (a.sensitivity > 55) return 'Kulit terlihat mudah reaktif.'; return 'Kondisi cukup seimbang.'; }
  function clamp(x, min = 0, max = 100) { return Math.max(min, Math.min(max, Math.round(Number(x) || 0))); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c])); }
  function toast(text) { const el = $('#toast'); if (!el) return; el.textContent = text; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2600); }
})();
</script>
`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((name) => name !== CACHE_NAME ? caches.delete(name) : undefined)))
      .then(() => self.clients.claim())
  );
});

function patchIndex(html) {
  if (html.includes("__deskinBalancedScanV113")) return html;
  return html
    .replace(/main\.css\?v=1\.1\.\d+/g, "main.css?v=1.1.3")
    .replace(/const VERSION = '1\.1\.\d+';/g, "const VERSION = '1.1.3';")
    .replace(/Versi 1\.1\.\d+/g, "Versi 1.1.3")
    .replace(/<\/body>/i, BALANCED_SCAN_PATCH + "\n</body>");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (request.url.includes("/api/")) return;

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
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
