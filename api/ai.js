const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `
Kamu adalah asisten operasional untuk Nipah Lestari.
Nipah Lestari dipakai oleh pendamping lapangan, BUMDes, penyadap, petani,
komunitas, dan pemerintah desa untuk mengelola data lokasi nipah, catatan
lapangan, mutu nira, batch Biostimulan Cair Nipah, dampak, dan mitra.

Aturan jawaban:
- Jawab dalam bahasa Indonesia.
- Jangan membuat klaim hasil uji yang belum ada datanya.
- Bedakan data tercatat, asumsi, dan rekomendasi.
- Gunakan bahasa praktis untuk kerja lapangan.
- Jangan terlalu pendek jika pengguna meminta laporan, analisis, atau rencana.
- Akhiri jawaban dengan kalimat yang tuntas.
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

Permintaan/data pengguna:
${message}

Formatkan jawaban dengan struktur yang rapi. Jika data belum cukup, jelaskan bagian yang perlu dilengkapi tanpa mengarang.
`;
}

async function callGemini(apiKey, prompt, maxOutputTokens = 4096) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.45,
          topP: 0.9,
          maxOutputTokens
        }
      })
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || "Gagal menghubungi Gemini API.");
    error.status = response.status;
    throw error;
  }

  const candidate = payload?.candidates?.[0] || {};
  const text = candidate?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim() || "";

  return { text, finishReason: candidate.finishReason || "UNKNOWN" };
}

function looksCut(text) {
  const clean = String(text || "").trim();
  if (!clean) return true;
  if (clean.length < 120) return false;
  return !/[.!?)]$/.test(clean) && !clean.endsWith("```"));
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
        version: "2.1.0"
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

    const prompt = buildPrompt(feature, message);
    const first = await callGemini(apiKey, prompt, 4096);
    let answer = first.text;
    let finishReason = first.finishReason;

    if (finishReason === "MAX_TOKENS" || looksCut(answer)) {
      const continuationPrompt = `
Lanjutkan jawaban berikut sampai tuntas. Jangan ulangi bagian yang sudah ada.

Permintaan awal:
${prompt}

Jawaban yang sudah ada:
${answer}
`;
      const continuation = await callGemini(apiKey, continuationPrompt, 2048);
      if (continuation.text) {
        answer = `${answer}\n\n${continuation.text}`.trim();
        finishReason = continuation.finishReason;
      }
    }

    if (!answer) answer = "AI belum memberi jawaban.";

    return sendJson(res, 200, {
      ok: true,
      model: GEMINI_MODEL,
      finishReason,
      answer
    });
  } catch (error) {
    return sendJson(res, error.status || 500, {
      ok: false,
      error: error?.message || "Terjadi kesalahan server."
    });
  }
}
