const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

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

function readGeminiKey() {
  return String(process.env.GEMINI_API_KEY || "")
    .trim()
    .replace(/^['\"]|['\"]$/g, "");
}

function modelList() {
  return [...new Set([GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean))];
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

function normalizeGeminiError(message) {
  const text = String(message || "");
  const lower = text.toLowerCase();

  if (lower.includes("high demand") || lower.includes("overloaded") || lower.includes("unavailable")) {
    return "AI sedang ramai. Coba ulang beberapa saat lagi.";
  }

  if (lower.includes("not found") || lower.includes("not supported") || lower.includes("listmodels") || lower.includes("generatecontent")) {
    return "Model AI belum cocok. Kosongkan GEMINI_MODEL di Vercel agar memakai gemini-2.0-flash, lalu redeploy.";
  }

  if (lower.includes("quota") || lower.includes("rate limit")) {
    return "Kuota atau batas pemakaian AI sedang tercapai. Coba lagi nanti atau cek pengaturan API key.";
  }

  if (lower.includes("api key") || lower.includes("permission") || lower.includes("unauthorized") || lower.includes("forbidden")) {
    return "GEMINI_API_KEY belum valid atau belum terbaca oleh runtime Vercel. Pastikan variabel tersedia untuk Production/Preview, lalu redeploy.";
  }

  return text || "AI belum tersedia.";
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(apiKey, model, prompt, maxOutputTokens = 4096) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.42,
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
    error.model = model;
    throw error;
  }

  const candidate = payload?.candidates?.[0] || {};
  const text = candidate?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim() || "";

  return { text, model, finishReason: candidate.finishReason || "UNKNOWN" };
}

async function generateWithFallback(apiKey, prompt, maxOutputTokens) {
  let lastError;

  for (const model of modelList()) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await callGemini(apiKey, model, prompt, maxOutputTokens);
      } catch (error) {
        lastError = error;
        const retryable = [429, 500, 502, 503, 504].includes(Number(error.status));
        if (!retryable) break;
        await wait(350 + attempt * 450);
      }
    }
  }

  const finalError = new Error(normalizeGeminiError(lastError?.message));
  finalError.status = lastError?.status || 503;
  throw finalError;
}

function looksCut(text) {
  const clean = String(text || "").trim();
  if (!clean) return true;
  if (clean.length < 120) return false;
  return !/[.!?)]$/.test(clean) && !clean.endsWith("```");
}

async function runHealthCheck(apiKey) {
  const result = await generateWithFallback(apiKey, "Jawab tepat satu kata: OK", 32);
  return {
    ok: true,
    model: result.model,
    answer: result.text
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", "GET, POST, OPTIONS");
      return sendJson(res, 200, { ok: true });
    }

    const apiKey = readGeminiKey();

    if (req.method === "GET") {
      const test = String(req.query?.test || "") === "1";
      if (test && apiKey) {
        const health = await runHealthCheck(apiKey);
        return sendJson(res, 200, {
          ok: true,
          envReady: true,
          envName: "GEMINI_API_KEY",
          test: health,
          models: modelList(),
          version: "2.4.0"
        });
      }

      return sendJson(res, 200, {
        ok: true,
        message: "Nipah Lestari AI API aktif.",
        envReady: Boolean(apiKey),
        envName: apiKey ? "GEMINI_API_KEY" : null,
        testUrl: "/api/ai?test=1",
        models: modelList(),
        version: "2.4.0"
      });
    }

    if (req.method !== "POST") {
      return sendJson(res, 405, { ok: false, error: "Method tidak didukung." });
    }

    if (!apiKey) {
      return sendJson(res, 500, {
        ok: false,
        code: "AI_KEY_MISSING",
        error: "GEMINI_API_KEY tidak terbaca oleh runtime Vercel. Pastikan variabel tersedia untuk Production/Preview dan lakukan redeploy."
      });
    }

    const body = parseBody(req);
    const message = String(body.message || "").trim();
    const feature = String(body.feature || "Nipah Lestari").trim();

    if (!message) {
      return sendJson(res, 400, { ok: false, error: "Pesan kosong." });
    }

    const prompt = buildPrompt(feature, message);
    const first = await generateWithFallback(apiKey, prompt, 4096);
    let answer = first.text;
    let model = first.model;
    let finishReason = first.finishReason;

    if (finishReason === "MAX_TOKENS" || looksCut(answer)) {
      const continuationPrompt = `
Lanjutkan jawaban berikut sampai tuntas. Jangan ulangi bagian yang sudah ada.

Permintaan awal:
${prompt}

Jawaban yang sudah ada:
${answer}
`;
      const continuation = await generateWithFallback(apiKey, continuationPrompt, 2048);
      if (continuation.text) {
        answer = `${answer}\n\n${continuation.text}`.trim();
        model = continuation.model;
        finishReason = continuation.finishReason;
      }
    }

    return sendJson(res, 200, {
      ok: true,
      model,
      finishReason,
      answer: answer || "AI belum memberi jawaban."
    });
  } catch (error) {
    return sendJson(res, error.status || 500, {
      ok: false,
      error: normalizeGeminiError(error?.message)
    });
  }
}
