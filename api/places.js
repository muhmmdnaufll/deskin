function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=120, s-maxage=240",
    },
  });
}

const MAX_RADIUS = 50000;
const DEFAULT_RADIUS = 6000;
const SEARCH_QUERIES = [
  "klinik kulit",
  "dokter kulit",
  "klinik kecantikan",
  "aesthetic clinic",
  "skin clinic",
  "beauty clinic",
  "skincare clinic",
  "dermatology clinic",
];

function distanceKm(lat1, lon1, lat2, lon2) {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function radiusSteps(requestedRadius) {
  const base = Math.min(MAX_RADIUS, Math.max(1000, Number(requestedRadius) || DEFAULT_RADIUS));
  return Array.from(new Set([base, 10000, 25000, MAX_RADIUS].filter((value) => value >= base))).sort((a, b) => a - b);
}

function classifyByText(text = "") {
  const lower = text.toLowerCase();
  if (/dermat|dokter kulit|skin clinic|klinik kulit|sp\.kk|spkk/.test(lower)) return "Klinik kulit";
  if (/aesthetic|estetik|kecantikan|beauty|facial|skincare|laser/.test(lower)) return "Klinik kecantikan";
  if (/pharmacy|apotek/.test(lower)) return "Apotek";
  if (/doctor|dokter/.test(lower)) return "Dokter";
  if (/clinic|klinik/.test(lower)) return "Klinik";
  return "Layanan kesehatan";
}

function hasSkinOrBeautySignal(text = "") {
  return /dermat|skin|kulit|estetik|aesthetic|beauty|facial|laser|skincare|kecantikan|dokter kulit|sp\.kk|spkk/.test(String(text).toLowerCase());
}

function placeScore(place, userLat, userLon) {
  const text = `${place.name} ${place.type} ${place.address} ${(place.rawTypes || []).join(" ")}`.toLowerCase();
  let score = 0;
  if (/dermat|dokter kulit|sp\.kk|spkk/.test(text)) score += 70;
  if (/skin|kulit/.test(text)) score += 45;
  if (/aesthetic|estetik|kecantikan|beauty|facial|laser|skincare/.test(text)) score += 34;
  if (/clinic|klinik/.test(text)) score += 16;
  if (/doctor|dokter/.test(text)) score += 12;
  if (place.rating) score += Math.min(12, Number(place.rating) * 2);
  if (place.userRatingCount) score += Math.min(10, Math.log10(Number(place.userRatingCount) + 1) * 3);
  if (place.phone || place.website || place.mapsUri) score += 5;
  score += Math.max(0, 22 - distanceKm(userLat, userLon, place.lat, place.lon) * 1.15);
  return score;
}

function normalizeFoursquarePlace(place, userLat, userLon) {
  const lat = place.geocodes?.main?.latitude || place.latitude;
  const lon = place.geocodes?.main?.longitude || place.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const categories = Array.isArray(place.categories) ? place.categories.map((cat) => cat.name).filter(Boolean) : [];
  const address = place.location?.formatted_address || [
    place.location?.address,
    place.location?.locality,
    place.location?.region,
  ].filter(Boolean).join(", ");
  const text = `${place.name || ""} ${address} ${categories.join(" ")}`;
  const type = classifyByText(text);
  const hoursText = Array.isArray(place.hours?.regular)
    ? "Jam operasional tersedia"
    : place.hours?.display || "";
  const fsqId = place.fsq_id || place.id || `${lat},${lon}`;

  const normalized = {
    id: fsqId,
    name: place.name || "Lokasi tanpa nama",
    type,
    distanceKm: Number(distanceKm(userLat, userLon, lat, lon).toFixed(2)),
    lat,
    lon,
    address,
    phone: place.tel || "",
    website: place.website || "",
    openingHours: hoursText,
    openNow: typeof place.hours?.open_now === "boolean" ? place.hours.open_now : null,
    rating: place.rating || null,
    userRatingCount: place.stats?.total_ratings || null,
    mapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`,
    googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`,
    isHighlyRelevant: hasSkinOrBeautySignal(text),
    source: "Foursquare Places",
    rawTypes: categories,
  };
  normalized.score = placeScore(normalized, userLat, userLon);
  return normalized;
}

async function searchFoursquareOnce(apiKey, lat, lon, radius, query) {
  const fields = [
    "fsq_id",
    "name",
    "geocodes",
    "location",
    "categories",
    "distance",
    "tel",
    "website",
    "hours",
    "rating",
    "stats",
  ].join(",");

  const params = new URLSearchParams({
    ll: `${lat},${lon}`,
    radius: String(radius),
    query,
    limit: "30",
    sort: "RELEVANCE",
    locale: "id",
    fields,
  });

  const response = await fetch(`https://api.foursquare.com/v3/places/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      Authorization: apiKey,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || "Foursquare Places API gagal mengambil data.");
  return Array.isArray(data.results) ? data.results : [];
}

function normalizeAndSort(results, lat, lon, normalizer) {
  const seen = new Set();
  return results
    .map((place) => normalizer(place, lat, lon))
    .filter(Boolean)
    .filter((place) => {
      const key = place.id || `${place.name.toLowerCase()}-${place.lat.toFixed(5)}-${place.lon.toFixed(5)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm)
    .slice(0, 30);
}

async function searchFoursquareAtRadius(lat, lon, radius) {
  const apiKey = process.env.FOURSQUARE_API_KEY || process.env.FSQ_API_KEY;
  if (!apiKey) return null;

  const results = [];
  for (const query of SEARCH_QUERIES) {
    try {
      const found = await searchFoursquareOnce(apiKey, lat, lon, radius, query);
      results.push(...found);
    } catch (error) {
      if (!results.length) throw error;
    }
  }

  const places = normalizeAndSort(results, lat, lon, normalizeFoursquarePlace);
  return { places, searchedRadius: radius };
}

async function searchFoursquareExpanded(lat, lon, requestedRadius) {
  const apiKey = process.env.FOURSQUARE_API_KEY || process.env.FSQ_API_KEY;
  if (!apiKey) return null;

  let lastPlaces = [];
  let lastRadius = requestedRadius;
  for (const radius of radiusSteps(requestedRadius)) {
    const result = await searchFoursquareAtRadius(lat, lon, radius);
    lastPlaces = result?.places || [];
    lastRadius = radius;
    if (lastPlaces.length > 0) break;
  }

  return {
    ok: true,
    source: "Foursquare Places API",
    radius: lastRadius,
    requestedRadius,
    expanded: lastRadius !== requestedRadius,
    count: lastPlaces.length,
    center: { lat, lon },
    places: lastPlaces,
  };
}

function getTag(tags, keys, fallback = "") {
  for (const key of keys) if (tags && tags[key]) return String(tags[key]);
  return fallback;
}

function classifyOsmPlace(tags = {}) {
  const text = Object.values(tags).join(" ").toLowerCase();
  if (/dermat|skin|kulit|estetik|aesthetic|beauty|facial|laser|skincare|kecantikan|klinik kecantikan/.test(text)) {
    if (/dermat|skin|kulit/.test(text)) return "Klinik kulit";
    return "Klinik kecantikan";
  }
  if (tags.amenity === "clinic" || tags.healthcare === "clinic") return "Klinik";
  if (tags.amenity === "doctors" || tags.healthcare === "doctor") return "Dokter";
  if (tags.shop === "beauty") return "Beauty care";
  if (tags.amenity === "pharmacy") return "Apotek";
  return "Layanan kesehatan";
}

function normalizeOsmElement(element, userLat, userLon) {
  const tags = element.tags || {};
  const lat = element.lat || element.center?.lat;
  const lon = element.lon || element.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const name = getTag(tags, ["name", "brand", "operator"], "Lokasi tanpa nama");
  const type = classifyOsmPlace(tags);
  const address = [tags["addr:street"], tags["addr:suburb"], tags["addr:city"]].filter(Boolean).join(", ");
  const phone = getTag(tags, ["phone", "contact:phone"]);
  const website = getTag(tags, ["website", "contact:website"]);
  const text = Object.values(tags).join(" ");

  const normalized = {
    id: `${element.type}-${element.id}`,
    name,
    type,
    distanceKm: Number(distanceKm(userLat, userLon, lat, lon).toFixed(2)),
    lat,
    lon,
    address,
    phone,
    website,
    openingHours: tags.opening_hours || "",
    openNow: null,
    rating: null,
    userRatingCount: null,
    mapsUri: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`,
    googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`,
    isHighlyRelevant: hasSkinOrBeautySignal(text),
    source: "OpenStreetMap",
    rawTypes: [tags.amenity, tags.healthcare, tags.shop].filter(Boolean),
  };
  normalized.score = placeScore(normalized, userLat, userLon);
  return normalized;
}

async function searchOsmAtRadius(lat, lon, radius) {
  const query = `
    [out:json][timeout:20];
    (
      node(around:${radius},${lat},${lon})["healthcare"="clinic"];
      way(around:${radius},${lat},${lon})["healthcare"="clinic"];
      relation(around:${radius},${lat},${lon})["healthcare"="clinic"];
      node(around:${radius},${lat},${lon})["amenity"="clinic"];
      way(around:${radius},${lat},${lon})["amenity"="clinic"];
      relation(around:${radius},${lat},${lon})["amenity"="clinic"];
      node(around:${radius},${lat},${lon})["healthcare"="doctor"];
      way(around:${radius},${lat},${lon})["healthcare"="doctor"];
      node(around:${radius},${lat},${lon})["amenity"="doctors"];
      way(around:${radius},${lat},${lon})["amenity"="doctors"];
      node(around:${radius},${lat},${lon})["shop"="beauty"];
      way(around:${radius},${lat},${lon})["shop"="beauty"];
      node(around:${radius},${lat},${lon})["amenity"="pharmacy"];
      way(around:${radius},${lat},${lon})["amenity"="pharmacy"];
      node(around:${radius},${lat},${lon})["name"~"dermat|skin|kulit|estetik|aesthetic|beauty|facial|skincare|kecantikan",i];
      way(around:${radius},${lat},${lon})["name"~"dermat|skin|kulit|estetik|aesthetic|beauty|facial|skincare|kecantikan",i];
    );
    out center tags 100;
  `;

  const upstream = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8", "User-Agent": "DeSkin-SKINMap/1.0.6" },
    body: new URLSearchParams({ data: query }),
  });

  if (!upstream.ok) throw new Error("Layanan peta gratis sedang sibuk. Coba lagi beberapa saat.");
  const data = await upstream.json();
  return normalizeAndSort(data.elements || [], lat, lon, normalizeOsmElement);
}

async function searchOsmExpanded(lat, lon, requestedRadius) {
  let lastPlaces = [];
  let lastRadius = requestedRadius;
  for (const radius of radiusSteps(requestedRadius)) {
    lastPlaces = await searchOsmAtRadius(lat, lon, radius);
    lastRadius = radius;
    if (lastPlaces.length > 0) break;
  }

  return {
    ok: true,
    source: "OpenStreetMap Overpass",
    radius: lastRadius,
    requestedRadius,
    expanded: lastRadius !== requestedRadius,
    count: lastPlaces.length,
    center: { lat, lon },
    places: lastPlaces,
  };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    const requestedRadius = Math.min(MAX_RADIUS, Math.max(1000, Number(url.searchParams.get("radius") || DEFAULT_RADIUS)));
    const provider = String(url.searchParams.get("provider") || "auto").toLowerCase();

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return json({ ok: false, error: "Koordinat lokasi tidak valid." }, 400);
    }

    if (provider !== "osm") {
      try {
        const foursquare = await searchFoursquareExpanded(lat, lon, requestedRadius);
        if (foursquare && foursquare.places.length) return json(foursquare);
        if (provider === "foursquare") {
          const osm = await searchOsmExpanded(lat, lon, requestedRadius);
          return json({
            ...osm,
            fallback: true,
            source: osm.places.length ? "OpenStreetMap Overpass" : "Tidak ada hasil",
            note: "Foursquare tidak menemukan lokasi pada radius maksimum. Sistem mencoba sumber terbuka sebagai cadangan.",
          });
        }
      } catch (error) {
        if (provider === "foursquare") {
          const osm = await searchOsmExpanded(lat, lon, requestedRadius).catch(() => null);
          if (osm && osm.places.length) {
            return json({ ...osm, fallback: true, note: error?.message || "Foursquare tidak tersedia, memakai sumber terbuka." });
          }
          return json({ ok: false, error: error?.message || "Foursquare Places API gagal." }, 502);
        }
      }
    }

    const osm = await searchOsmExpanded(lat, lon, requestedRadius);
    return json({ ...osm, fallback: provider !== "osm" });
  } catch (error) {
    return json({ ok: false, error: error?.message || "Gagal mengambil lokasi terdekat." }, 500);
  }
}
