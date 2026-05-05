const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `
Kamu adalah assistant untuk website Nipah Lestari.
Tugasmu membantu menjelaskan potensi nipah Aceh Singkil, aksi edukasi pesisir,
hilirisasi nira nipah menjadi Biostimulan Cair Nipah, dan ide kolaborasi masyarakat.

Aturan:
- Jawab dalam bahasa Indonesia.
- Jangan membuat klaim hasil uji yang belum dilakukan.
- Bedakan data observasi awal, rencana, dan target pengembangan.
- Gunakan gaya praktis, hangat, dan mudah dipahami.
- Jika membahas produk pertanian, tekankan bahwa tahap awal adalah prototipe/uji terbatas.
`;

function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.json(payload);
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

function buildPrompt(feature, message) {
  return `
${SYSTEM_PROMPT}

Konteks fitur: ${feature || "Nipah Lestari"}

Permintaan pengguna:
${message}

Susun jawaban dengan format:
1. Ringkasan
2. Langkah praktis
3. Catatan kehati-hatian
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
        message: "Nipah Lestari AI API aktif.",
        model: GEMINI_MODEL,
        version: "2.0.0"
      });
    }

    if (req.method !== "POST") {
      return sendJson(res, 405, { ok: false, error: "Method tidak didukung." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return sendJson(res, 500, {
        ok: false,
        error: "GEMINI_API_KEY belum diatur di Vercel Environment Variables."
      });
    }

    const body = parseBody(req);
    const message = String(body.message || "").trim();
    const feature = String(body.feature || "Nipah Lestari").trim();

    if (!message) {
      return sendJson(res, 400, { ok: false, error: "Pesan kosong." });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPrompt(feature, message) }] }],
          generationConfig: {
            temperature: 0.5,
            topP: 0.9,
            maxOutputTokens: 1400
          }
        })
      }
    );

    const geminiPayload = await geminiResponse.json().catch(() => ({}));
    if (!geminiResponse.ok) {
      return sendJson(res, geminiResponse.status, {
        ok: false,
        error: geminiPayload?.error?.message || "Gagal menghubungi Gemini API."
      });
    }

    const answer = geminiPayload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "AI belum memberi jawaban.";

    return sendJson(res, 200, { ok: true, model: GEMINI_MODEL, answer });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || "Terjadi kesalahan server."
    });
  }
}
