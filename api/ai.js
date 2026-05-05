const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

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

const KEY_NAMES = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GENAI_API_KEY",
  "API_KEY"
];

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

function readApiKey() {
  for (const name of KEY_NAMES) {
    const value = String(process.env[name] || "")
      .trim()
      .replace(/^['\"]|['\"]$/g, "");
    if (value) return { key: value, name };
  }
  return { key: "", name: "" };
}

function modelList() {
  const fromEnv = String(process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  const safeDefaults = [DEFAULT_MODEL, "gemini-2.0-flash", "gemini-1.5-flash"];
  return [...new Set([...fromEnv, ...safeDefaults])];
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
    return "Model AI belum cocok dengan API key yang aktif. Cek GEMINI_MODEL di Vercel, atau kosongkan agar memakai gemini-2.0-flash.";
  }

  if (lower.includes("quota") || lower.includes("rate limit")) {
    return "Kuota atau batas pemakaian AI sedang tercapai. Coba lagi nanti atau cek pengaturan API key.";
  }

  if (lower.includes("api key") || lower.includes("permission") || lower.includes("unauthorized") || lower.includes("forbidden")) {
    return "Kunci AI belum valid atau belum terbaca oleh server. Cek Environment Variables di Vercel, lalu redeploy.";
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

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", "GET, POST, OPTIONS");
      return sendJson(res, 200, { ok: true });
    }

    const apiKeyInfo = readApiKey();

    if (req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        message: "Nipah Lestari AI API aktif.",
        envReady: Boolean(apiKeyInfo.key),
        envName: apiKeyInfo.name || null,
        acceptedEnvNames: KEY_NAMES,
        models: modelList(),
        version: "2.3.0"
      });
    }

    if (req.method !== "POST") {
      return sendJson(res, 405, { ok: false, error: "Method tidak didukung." });
    }

    if (!apiKeyInfo.key) {
      return sendJson(res, 500, {
        ok: false,
        code: "AI_KEY_MISSING",
        error: `Kunci AI belum terbaca oleh server. Tambahkan salah satu Environment Variable di Vercel: ${KEY_NAMES.join(", ")}, lalu redeploy.`
      });
    }

    const body = parseBody(req);
    const message = String(body.message || "").trim();
    const feature = String(body.feature || "Nipah Lestari").trim();

    if (!message) {
      return sendJson(res, 400, { ok: false, error: "Pesan kosong." });
    }

    const prompt = buildPrompt(feature, message);
    const first = await generateWithFallback(apiKeyInfo.key, prompt, 4096);
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
      const continuation = await generateWithFallback(apiKeyInfo.key, continuationPrompt, 2048);
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
