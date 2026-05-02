function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=180, s-maxage=300",
    },
  });
}

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
  const text = `${place.name} ${place.type} ${place.address}`.toLowerCase();
  let score = 0;
  if (/dermat|dokter kulit|sp\.kk|spkk/.test(text)) score += 60;
  if (/skin|kulit/.test(text)) score += 42;
  if (/aesthetic|estetik|kecantikan|beauty|facial|laser|skincare/.test(text)) score += 32;
  if (/clinic|klinik/.test(text)) score += 15;
  if (/doctor|dokter/.test(text)) score += 10;
  if (place.rating) score += Math.min(12, Number(place.rating) * 2);
  if (place.userRatingCount) score += Math.min(10, Math.log10(Number(place.userRatingCount) + 1) * 3);
  if (place.phone || place.website || place.googleMapsUri) score += 5;
  score += Math.max(0, 20 - distanceKm(userLat, userLon, place.lat, place.lon) * 1.8);
  return score;
}

function normalizeGooglePlace(place, userLat, userLon) {
  const lat = place.location?.latitude;
  const lon = place.location?.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const name = place.displayName?.text || "Lokasi tanpa nama";
  const address = place.formattedAddress || "";
  const types = Array.isArray(place.types) ? place.types : [];
  const typeText = `${name} ${address} ${place.primaryTypeDisplayName?.text || ""} ${types.join(" ")}`;
  const type = classifyByText(typeText);
  const openNow = place.currentOpeningHours?.openNow;

  const normalized = {
    id: place.id || place.name || `${lat},${lon}`,
    name,
    type,
    distanceKm: Number(distanceKm(userLat, userLon, lat, lon).toFixed(2)),
    lat,
    lon,
    address,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || "",
    website: place.websiteUri || "",
    openingHours: Array.isArray(place.currentOpeningHours?.weekdayDescriptions)
      ? place.currentOpeningHours.weekdayDescriptions.join(" | ")
      : "",
    openNow: typeof openNow === "boolean" ? openNow : null,
    rating: place.rating || null,
    userRatingCount: place.userRatingCount || null,
    googleMapsUri: place.googleMapsUri || "",
    isHighlyRelevant: hasSkinOrBeautySignal(typeText),
    source: "Google Places",
    rawTypes: types,
  };

  normalized.score = placeScore(normalized, userLat, userLon);
  return normalized;
}

async function searchGooglePlaces(lat, lon, radius) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const textQuery = "klinik kulit OR dokter kulit OR klinik kecantikan OR aesthetic clinic OR skin clinic OR beauty clinic OR skincare clinic";
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.primaryType",
    "places.primaryTypeDisplayName",
    "places.types",
    "places.rating",
    "places.userRatingCount",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.googleMapsUri",
    "places.currentOpeningHours",
    "places.businessStatus",
  ].join(",");

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "id",
      regionCode: "ID",
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lon },
          radius,
        },
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "Google Places API gagal mengambil data.");
  }

  const seen = new Set();
  const places = (data.places || [])
    .map((place) => normalizeGooglePlace(place, lat, lon))
    .filter(Boolean)
    .filter((place) => {
      const key = `${place.name.toLowerCase()}-${place.lat.toFixed(5)}-${place.lon.toFixed(5)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm)
    .slice(0, 25);

  return {
    ok: true,
    source: "Google Places API",
    radius,
    count: places.length,
    center: { lat, lon },
    places,
  };
}

function getTag(tags, keys, fallback = "") {
  for (const key of keys) {
    if (tags && tags[key]) return String(tags[key]);
  }
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

function scoreOsmPlace(place, userLat, userLon) {
  let score = 0;
  const tags = place.tags || {};
  const text = Object.values(tags).join(" ").toLowerCase();
  if (/dermat|dokter kulit|skin specialist|sp\.kk|spkk/.test(text)) score += 50;
  if (/skin|kulit/.test(text)) score += 35;
  if (/aesthetic|estetik|kecantikan|beauty|facial|laser|skincare/.test(text)) score += 25;
  if (tags.healthcare === "clinic" || tags.amenity === "clinic") score += 14;
  if (tags.healthcare === "doctor" || tags.amenity === "doctors") score += 12;
  if (tags.shop === "beauty") score += 10;
  if (tags.website || tags.phone || tags["contact:phone"]) score += 4;
  score += Math.max(0, 20 - distanceKm(userLat, userLon, place.lat, place.lon) * 2);
  return score;
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
    googleMapsUri: "",
    isHighlyRelevant: hasSkinOrBeautySignal(text),
    source: "OpenStreetMap",
    tags: {
      amenity: tags.amenity || "",
      healthcare: tags.healthcare || "",
      shop: tags.shop || "",
    },
  };
  normalized.score = scoreOsmPlace({ tags, lat, lon }, userLat, userLon);
  return normalized;
}

async function searchOsm(lat, lon, radius) {
  const query = `
    [out:json][timeout:18];
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
    out center tags 80;
  `;

  const upstream = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      "User-Agent": "DeSkin-SKINMap/1.0.6",
    },
    body: new URLSearchParams({ data: query }),
  });

  if (!upstream.ok) throw new Error("Layanan peta gratis sedang sibuk. Coba lagi beberapa saat.");
  const data = await upstream.json();
  const seen = new Set();
  const places = (data.elements || [])
    .map((element) => normalizeOsmElement(element, lat, lon))
    .filter(Boolean)
    .filter((place) => {
      const key = `${place.name.toLowerCase()}-${place.lat.toFixed(4)}-${place.lon.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm)
    .slice(0, 30);

  return {
    ok: true,
    source: "OpenStreetMap Overpass",
    radius,
    count: places.length,
    center: { lat, lon },
    places,
  };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    const radius = Math.min(15000, Math.max(1000, Number(url.searchParams.get("radius") || 6000)));
    const provider = String(url.searchParams.get("provider") || "auto").toLowerCase();

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return json({ ok: false, error: "Koordinat lokasi tidak valid." }, 400);
    }

    if (provider !== "osm") {
      try {
        const google = await searchGooglePlaces(lat, lon, radius);
        if (google && google.places.length) return json(google);
        if (provider === "google") {
          return json({
            ok: false,
            error: google ? "Google Places tidak menemukan hasil di radius ini." : "GOOGLE_MAPS_API_KEY belum diatur di Vercel.",
          }, google ? 404 : 500);
        }
      } catch (error) {
        if (provider === "google") {
          return json({ ok: false, error: error?.message || "Google Places API gagal." }, 502);
        }
      }
    }

    const osm = await searchOsm(lat, lon, radius);
    return json({ ...osm, fallback: true });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error?.message || "Gagal mengambil lokasi terdekat.",
      },
      500
    );
  }
}
