const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `
Kamu adalah AI assistant untuk aplikasi DeSkin.
Tugasmu membantu pengguna memahami kondisi kulit secara edukatif,
memberi rekomendasi rutinitas skincare umum, menjelaskan bahan aktif,
dan menjawab pertanyaan seputar fitur DeSkin.

Aturan penting:
- Jangan mengklaim diagnosis medis.
- Jangan menyuruh pengguna memakai obat keras atau resep dokter.
- Jika gejala berat, luka, infeksi, nyeri, alergi parah, atau masalah menetap, sarankan konsultasi dokter kulit.
- Jawab dalam bahasa Indonesia.
- Gunakan gaya jelas, ramah, praktis, dan lengkap.
`;

const SCAN_JSON_PROMPT = `
Analisis foto kulit/wajah secara hati-hati untuk kebutuhan edukasi skincare.
Jangan membuat diagnosis medis.
Balas hanya JSON valid tanpa markdown, dengan bentuk:
{
  "isSkinImage": true,
  "confidence": 0-100,
  "moisture": 0-100,
  "sebum": 0-100,
  "texture": 0-100,
  "acne": 0-100,
  "sensitivity": 0-100,
  "skinType": "oily" | "dry" | "normal" | "combination" | "sensitive" | "unknown",
  "concerns": ["acne", "oil", "dry", "texture", "pores", "redness"],
  "summary": "ringkasan singkat bahasa Indonesia",
  "safetyNote": "catatan keamanan singkat"
}
Jika gambar bukan wajah/kulit yang jelas, gunakan isSkinImage false, confidence rendah, skinType unknown, dan jelaskan di summary.
`;

function sendJson(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.json(data);
}

function cleanBase64(value) {
  return String(value || "").replace(/^data:[^;]+;base64,/, "").trim();
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced ? fenced[1] : raw;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(source.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeScan(scan) {
  if (!scan || typeof scan !== "object") return null;
  const number = (value, fallback = 50) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(100, Math.round(n)));
  };
  const allowedSkinTypes = ["oily", "dry", "normal", "combination", "sensitive", "unknown"];
  const allowedConcerns = ["acne", "oil", "dry", "texture", "pores", "redness"];
  return {
    isSkinImage: Boolean(scan.isSkinImage),
    confidence: number(scan.confidence, 0),
    moisture: number(scan.moisture, 50),
    sebum: number(scan.sebum, 50),
    texture: number(scan.texture, 50),
    acne: number(scan.acne, 50),
    sensitivity: number(scan.sensitivity, 50),
    skinType: allowedSkinTypes.includes(scan.skinType) ? scan.skinType : "unknown",
    concerns: Array.isArray(scan.concerns)
      ? scan.concerns.filter((item) => allowedConcerns.includes(item)).slice(0, 6)
      : [],
    summary: String(scan.summary || "Hasil scan belum memiliki ringkasan.").slice(0, 700),
    safetyNote: String(scan.safetyNote || "Hasil ini adalah estimasi visual edukatif, bukan diagnosis medis.").slice(0, 700),
  };
}

function buildTextPrompt(feature, message) {
  return `
${SYSTEM_PROMPT}

Konteks fitur: ${feature || "general"}

Pertanyaan atau data pengguna:
${message}

Berikan jawaban lengkap dan jangan berhenti di tengah kalimat.
Gunakan format rapi dan mudah dibaca:
1. Ringkasan
2. Langkah praktis
3. Catatan keamanan
4. Kapan perlu konsultasi
`;
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", "GET, POST, OPTIONS");
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        message: "DeSkin AI API aktif.",
        model: GEMINI_MODEL,
        version: "1.1.7",
      });
    }

    if (req.method !== "POST") {
      return sendJson(res, 405, { ok: false, error: "Method tidak didukung." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return sendJson(res, 500, {
        ok: false,
        error: "GEMINI_API_KEY belum diatur di Vercel Environment Variables.",
      });
    }

    const body = parseBody(req);
    const message = String(body.message || "").trim();
    const feature = String(body.feature || "general").trim();
    const imageData = cleanBase64(body.imageData);
    const mimeType = String(body.mimeType || "image/jpeg").trim();
    const isVisionScan = feature === "SKINAnalyzerVision";

    if (!message && !imageData) {
      return sendJson(res, 400, { ok: false, error: "Pesan kosong." });
    }

    const textPrompt = isVisionScan
      ? `${SCAN_JSON_PROMPT}\n\nCatatan pengguna:\n${message || "Scan gambar dari kamera/upload."}`
      : buildTextPrompt(feature, message);

    const parts = [{ text: textPrompt }];
    if (imageData) {
      parts.push({
        inline_data: {
          mime_type: mimeType || "image/jpeg",
          data: imageData,
        },
      });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: isVisionScan ? 0.2 : 0.55,
            topP: 0.9,
            maxOutputTokens: isVisionScan ? 900 : 4096,
          },
        }),
      }
    );

    const data = await geminiResponse.json().catch(() => ({}));
    if (!geminiResponse.ok) {
      return sendJson(res, geminiResponse.status, {
        ok: false,
        error: data?.error?.message || "Gagal menghubungi Gemini API. Cek API key atau kuota.",
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "AI belum memberi jawaban.";

    if (isVisionScan) {
      const scan = normalizeScan(extractJson(text));
      if (!scan) {
        return sendJson(res, 502, {
          ok: false,
          error: "AI belum mengembalikan format scan yang valid. Coba ulangi dengan foto yang lebih jelas.",
          raw: text,
        });
      }
      return sendJson(res, 200, {
        ok: true,
        model: GEMINI_MODEL,
        answer: scan.summary,
        scan,
      });
    }

    return sendJson(res, 200, {
      ok: true,
      model: GEMINI_MODEL,
      answer: text,
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || "Terjadi kesalahan server.",
    });
  }
}
