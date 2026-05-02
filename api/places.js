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

function getTag(tags, keys, fallback = "") {
  for (const key of keys) {
    if (tags && tags[key]) return String(tags[key]);
  }
  return fallback;
}

function classifyPlace(tags = {}) {
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

function hasSkinOrBeautySignal(tags = {}) {
  const text = Object.values(tags).join(" ").toLowerCase();
  return /dermat|skin|kulit|estetik|aesthetic|beauty|facial|laser|skincare|kecantikan|klinik kecantikan|perawatan wajah|dokter kulit/.test(text);
}

function scorePlace(place, userLat, userLon) {
  let score = 0;
  const tags = place.tags || {};
  const text = Object.values(tags).join(" ").toLowerCase();

  if (/dermat|dokter kulit|skin specialist|sp\.kk/.test(text)) score += 50;
  if (/skin|kulit/.test(text)) score += 35;
  if (/aesthetic|estetik|kecantikan|beauty|facial|laser|skincare/.test(text)) score += 25;
  if (tags.healthcare === "clinic" || tags.amenity === "clinic") score += 14;
  if (tags.healthcare === "doctor" || tags.amenity === "doctors") score += 12;
  if (tags.shop === "beauty") score += 10;
  if (tags.website || tags.phone || tags["contact:phone"]) score += 4;

  const km = distanceKm(userLat, userLon, place.lat, place.lon);
  score += Math.max(0, 20 - km * 2);
  return score;
}

function normalizeElement(element, userLat, userLon) {
  const tags = element.tags || {};
  const lat = element.lat || element.center?.lat;
  const lon = element.lon || element.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const name = getTag(tags, ["name", "brand", "operator"], "Lokasi tanpa nama");
  const type = classifyPlace(tags);
  const distance = distanceKm(userLat, userLon, lat, lon);
  const addressParts = [
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
  ].filter(Boolean);
  const address = addressParts.join(", ");
  const phone = getTag(tags, ["phone", "contact:phone"]);
  const website = getTag(tags, ["website", "contact:website"]);

  return {
    id: `${element.type}-${element.id}`,
    name,
    type,
    distanceKm: Number(distance.toFixed(2)),
    lat,
    lon,
    address,
    phone,
    website,
    openingHours: tags.opening_hours || "",
    isHighlyRelevant: hasSkinOrBeautySignal(tags),
    score: scorePlace({ tags, lat, lon }, userLat, userLon),
    tags: {
      amenity: tags.amenity || "",
      healthcare: tags.healthcare || "",
      shop: tags.shop || "",
    },
  };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    const radius = Math.min(15000, Math.max(1000, Number(url.searchParams.get("radius") || 6000)));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return json({ ok: false, error: "Koordinat lokasi tidak valid." }, 400);
    }

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

    if (!upstream.ok) {
      return json(
        {
          ok: false,
          error: "Layanan peta sedang sibuk. Coba lagi beberapa saat.",
        },
        502
      );
    }

    const data = await upstream.json();
    const seen = new Set();
    const places = (data.elements || [])
      .map((element) => normalizeElement(element, lat, lon))
      .filter(Boolean)
      .filter((place) => {
        const key = `${place.name.toLowerCase()}-${place.lat.toFixed(4)}-${place.lon.toFixed(4)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm)
      .slice(0, 30);

    return json({
      ok: true,
      source: "OpenStreetMap Overpass",
      radius,
      count: places.length,
      center: { lat, lon },
      places,
    });
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
