(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  let lastPlaces = [];
  let userPosition = null;
  let activeSource = "Foursquare / OSM";

  boot();

  function boot() {
    patchMapPage();
    new MutationObserver(patchMapPage).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", handleClick, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("change", handleInput, true);
  }

  function patchMapPage() {
    if ($("#pageTitle")?.textContent?.trim() !== "SKINMap") return;
    if ($("#skinMapRealPanel")) return;

    const container = $(".container.stack") || $(".container");
    if (!container) return;

    const originalList = $("#locationList");
    if (originalList) {
      originalList.innerHTML = `<p class="muted">Tekan Gunakan lokasi saya untuk menampilkan klinik kulit/kecantikan terdekat.</p>`;
    }

    const panel = document.createElement("section");
    panel.id = "skinMapRealPanel";
    panel.className = "card stack";
    panel.innerHTML = `
      <div class="between">
        <div>
          <p class="eyebrow">Real nearby search</p>
          <h2>Klinik kulit & kecantikan terdekat</h2>
          <p class="muted">Menggunakan Foursquare Places API sebagai sumber utama. Jika API key belum terbaca atau limit, otomatis fallback ke OpenStreetMap.</p>
        </div>
        <span id="skinMapSourceBadge" class="pill success">Foursquare</span>
      </div>
      <div class="row">
        <select id="skinMapRadius" aria-label="Radius pencarian">
          <option value="3000">3 km</option>
          <option value="6000" selected>6 km</option>
          <option value="10000">10 km</option>
          <option value="15000">15 km</option>
        </select>
        <select id="skinMapFilter" aria-label="Filter lokasi">
          <option value="all">Semua</option>
          <option value="skin">Klinik kulit</option>
          <option value="beauty">Klinik kecantikan</option>
          <option value="clinic">Klinik umum</option>
          <option value="pharmacy">Apotek</option>
        </select>
        <input id="skinMapSearch" placeholder="Cari nama lokasi..." />
        <button id="skinMapRefresh" class="secondary-btn" type="button">Cari ulang</button>
      </div>
      <div id="skinMapStatus" class="panel">
        <strong>Belum mencari lokasi.</strong>
        <p class="muted">Klik tombol Gunakan lokasi saya di atas untuk mulai.</p>
      </div>
      <div id="skinMapRealList" class="list"></div>
    `;

    container.appendChild(panel);
  }

  function handleClick(event) {
    const locate = event.target.closest("#locateMe");
    if (locate) {
      event.preventDefault();
      event.stopImmediatePropagation();
      requestLocationAndSearch();
      return;
    }

    const refresh = event.target.closest("#skinMapRefresh");
    if (refresh) {
      event.preventDefault();
      if (userPosition) searchNearby(userPosition.lat, userPosition.lon);
      else requestLocationAndSearch();
      return;
    }

    const route = event.target.closest("[data-open-route]");
    if (route) {
      const lat = route.dataset.lat;
      const lon = route.dataset.lon;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat + "," + lon)}&travelmode=driving`, "_blank", "noopener,noreferrer");
      return;
    }

    const details = event.target.closest("[data-open-details]");
    if (details) {
      const lat = details.dataset.lat;
      const lon = details.dataset.lon;
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + "," + lon)}`, "_blank", "noopener,noreferrer");
    }
  }

  function handleInput(event) {
    if (["skinMapSearch", "skinMapFilter"].includes(event.target?.id)) {
      renderPlaces();
    }
    if (event.target?.id === "skinMapRadius" && userPosition) {
      searchNearby(userPosition.lat, userPosition.lon);
    }
  }

  function requestLocationAndSearch() {
    if (!navigator.geolocation) {
      setStatus("Geolocation tidak tersedia", "Browser ini belum mendukung akses lokasi.");
      return;
    }

    setStatus("Meminta izin lokasi...", "Izinkan akses lokasi agar DeSkin dapat mencari klinik terdekat.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        userPosition = { lat, lon };
        searchNearby(lat, lon);
      },
      () => {
        setStatus("Izin lokasi ditolak", "Aktifkan izin lokasi di browser, lalu tekan Cari ulang.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 }
    );
  }

  async function searchNearby(lat, lon) {
    const radius = Number($("#skinMapRadius")?.value || 6000);
    setSourceBadge("Foursquare", true);
    setStatus("Mencari lokasi terdekat...", `Mengutamakan Foursquare Places API. Radius ${Math.round(radius / 1000)} km dari posisi kamu.`);

    try {
      const response = await fetch(`/api/places?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&radius=${encodeURIComponent(radius)}&provider=foursquare&v=fsq106`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Gagal mengambil data lokasi.");

      activeSource = data.source || "Places API";
      setSourceBadge(activeSource, !data.fallback);
      lastPlaces = Array.isArray(data.places) ? data.places : [];
      setStatus(
        lastPlaces.length ? `${lastPlaces.length} lokasi ditemukan` : "Belum ada lokasi ditemukan",
        lastPlaces.length
          ? `Sumber aktif: ${activeSource}. Hasil diurutkan berdasarkan relevansi klinik kulit/kecantikan dan jarak.`
          : `Sumber aktif: ${activeSource}. Coba radius lebih besar.`
      );
      renderPlaces();
      renderMapPins();
    } catch (error) {
      lastPlaces = [];
      setSourceBadge("Foursquare gagal", false);
      setStatus("Pencarian gagal", error.message || "Layanan peta sedang sibuk. Coba lagi nanti.");
      renderPlaces();
    }
  }

  function renderPlaces() {
    const list = $("#skinMapRealList");
    if (!list) return;

    const query = String($("#skinMapSearch")?.value || "").toLowerCase();
    const filter = $("#skinMapFilter")?.value || "all";

    const places = lastPlaces.filter((place) => {
      const text = `${place.name} ${place.type} ${place.address} ${(place.rawTypes || []).join(" ")}`.toLowerCase();
      const matchQuery = !query || text.includes(query);
      const type = String(place.type || "").toLowerCase();
      const matchFilter =
        filter === "all" ||
        (filter === "skin" && /kulit|skin|dermat|sp\.kk|spkk/.test(text)) ||
        (filter === "beauty" && /kecantikan|beauty|aesthetic|estetik|facial|skincare/.test(text)) ||
        (filter === "clinic" && /klinik|clinic|dokter|doctor/.test(type + " " + text)) ||
        (filter === "pharmacy" && /apotek|pharmacy/.test(type + " " + text));
      return matchQuery && matchFilter;
    });

    list.innerHTML = places.length
      ? places.map(placeCard).join("")
      : `<div class="panel"><strong>Tidak ada hasil sesuai filter.</strong><p class="muted">Coba ganti filter, radius, atau kata pencarian. Sumber aktif: ${escapeHtml(activeSource)}.</p></div>`;
  }

  function renderMapPins() {
    const visual = $("#mapVisual");
    if (!visual || !userPosition) return;
    const places = lastPlaces.slice(0, 12);
    visual.innerHTML = `<span class="pin user" style="left:50%;top:55%"><span>U</span></span>` + places.map((place, index) => {
      const point = projectPoint(userPosition.lat, userPosition.lon, place.lat, place.lon);
      return `<span class="pin" title="${escapeHtml(place.name)}" style="left:${point.x}%;top:${point.y}%"><span>${index + 1}</span></span>`;
    }).join("");
  }

  function projectPoint(lat, lon, pLat, pLon) {
    const scale = 9000;
    const x = 50 + ((pLon - lon) * Math.cos((lat * Math.PI) / 180) * 111000 / scale) * 42;
    const y = 55 - (((pLat - lat) * 111000) / scale) * 42;
    return { x: Math.max(8, Math.min(92, x)), y: Math.max(8, Math.min(92, y)) };
  }

  function placeCard(place) {
    const relevance = place.isHighlyRelevant ? `<span class="pill success">Relevan</span>` : `<span class="tag">Umum</span>`;
    const address = place.address ? `<p class="muted">${escapeHtml(place.address)}</p>` : "";
    const open = place.openingHours ? `<p class="muted">Jam: ${escapeHtml(place.openingHours)}</p>` : "";
    const phone = place.phone ? `<p class="muted">Telp: ${escapeHtml(place.phone)}</p>` : "";
    const rating = place.rating ? `<p class="muted">Rating: ${escapeHtml(place.rating)}${place.userRatingCount ? ` · ${escapeHtml(place.userRatingCount)} ulasan` : ""}</p>` : "";
    const source = place.source ? `<span class="tag">${escapeHtml(place.source)}</span>` : "";
    const website = place.website ? `<a class="ghost-btn" href="${escapeAttr(place.website)}" target="_blank" rel="noopener noreferrer">Website</a>` : "";

    return `
      <article class="map-card">
        <div class="between">
          <div>
            <h3>${escapeHtml(place.name)}</h3>
            <p class="muted">${escapeHtml(place.type)} · ${escapeHtml(place.distanceKm)} km</p>
          </div>
          ${relevance}
        </div>
        ${address}
        ${rating}
        ${open}
        ${phone}
        <div class="row">
          <button class="primary-btn" type="button" data-open-route="1" data-lat="${escapeAttr(place.lat)}" data-lon="${escapeAttr(place.lon)}">Rute</button>
          <button class="secondary-btn" type="button" data-open-details="1" data-lat="${escapeAttr(place.lat)}" data-lon="${escapeAttr(place.lon)}">Buka Maps</button>
          ${website}
          ${source}
        </div>
      </article>
    `;
  }

  function setSourceBadge(source, isPrimary) {
    const badge = $("#skinMapSourceBadge");
    if (!badge) return;
    badge.className = isPrimary ? "pill success" : "pill warn";
    badge.textContent = source.includes("Foursquare") ? "Foursquare" : source.includes("OpenStreetMap") ? "OSM fallback" : source;
  }

  function setStatus(title, description) {
    const status = $("#skinMapStatus");
    if (!status) return;
    status.innerHTML = `<strong>${escapeHtml(title)}</strong><p class="muted">${escapeHtml(description || "")}</p>`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
})();
