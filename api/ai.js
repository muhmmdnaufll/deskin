const MODEL_PRIORITIES = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash"
];

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

function cleanModelName(name) {
  return String(name || "").replace(/^models\//, "").trim();
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

function errorCode(message) {
  const text = String(message || "").toLowerCase();
  if (text.includes("denied access") || text.includes("please contact support")) return "PROJECT_ACCESS_DENIED";
  if (text.includes("api key") || text.includes("permission") || text.includes("unauthorized") || text.includes("forbidden")) return "INVALID_KEY_OR_PERMISSION";
  if (text.includes("quota") || text.includes("rate limit")) return "QUOTA_OR_RATE_LIMIT";
  if (text.includes("high demand") || text.includes("overloaded") || text.includes("unavailable")) return "PROVIDER_BUSY";
  if (text.includes("not found") || text.includes("not supported") || text.includes("listmodels") || text.includes("generatecontent")) return "MODEL_NOT_SUPPORTED";
  return "AI_PROVIDER_ERROR";
}

function normalizeGeminiError(message) {
  const code = errorCode(message);
  if (code === "PROJECT_ACCESS_DENIED") {
    return "Project Google yang dipakai GEMINI_API_KEY ditolak aksesnya oleh Google. Kode sudah membaca key, tetapi project/key tersebut tidak diizinkan memakai Gemini API. Buat API key baru dari project Google AI Studio yang berbeda, pasang sebagai GEMINI_API_KEY di Vercel, lalu redeploy.";
  }
  if (code === "INVALID_KEY_OR_PERMISSION") {
    return "GEMINI_API_KEY belum valid atau permission Gemini API belum aktif. Cek kembali API key di Vercel lalu redeploy.";
  }
  if (code === "QUOTA_OR_RATE_LIMIT") {
    return "Kuota atau batas pemakaian AI sedang tercapai. Coba lagi nanti atau cek pengaturan API key.";
  }
  if (code === "PROVIDER_BUSY") {
    return "AI sedang ramai. Coba ulang beberapa saat lagi.";
  }
  if (code === "MODEL_NOT_SUPPORTED") {
    return "Tidak ada model Gemini yang cocok untuk generateContent pada API key ini.";
  }
  return String(message || "AI belum tersedia.");
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.error?.message || "Request Gemini gagal.");
    error.status = response.status;
    error.code = errorCode(error.message);
    throw error;
  }

  return payload;
}

async function listAvailableModels(apiKey) {
  const payload = await requestJson("https://generativelanguage.googleapis.com/v1beta/models", {
    headers: { "x-goog-api-key": apiKey }
  });

  const models = Array.isArray(payload.models) ? payload.models : [];
  return models
    .filter((model) => Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes("generateContent"))
    .map((model) => cleanModelName(model.name))
    .filter(Boolean);
}

function chooseModels(availableModels) {
  const lowerMap = new Map(availableModels.map((model) => [model.toLowerCase(), model]));
  const ordered = [];

  for (const preferred of MODEL_PRIORITIES) {
    const exact = lowerMap.get(preferred.toLowerCase());
    if (exact) ordered.push(exact);

    for (const model of availableModels) {
      const name = model.toLowerCase();
      if (name.includes(preferred.toLowerCase()) && !ordered.includes(model)) ordered.push(model);
    }
  }

  for (const model of availableModels) {
    const name = model.toLowerCase();
    if (name.includes("flash") && !ordered.includes(model)) ordered.push(model);
  }

  for (const model of availableModels) {
    if (!ordered.includes(model)) ordered.push(model);
  }

  return ordered;
}

async function resolveModels(apiKey) {
  const available = await listAvailableModels(apiKey);
  const selected = chooseModels(available);

  if (!selected.length) {
    const error = new Error("Tidak ada model Gemini yang mendukung generateContent pada API key ini.");
    error.status = 503;
    error.code = "MODEL_NOT_SUPPORTED";
    throw error;
  }

  return { available, selected };
}

async function callGemini(apiKey, model, prompt, maxOutputTokens = 4096) {
  const payload = await requestJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName(model)}:generateContent`,
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

  const candidate = payload?.candidates?.[0] || {};
  const text = candidate?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim() || "";

  return { text, model: cleanModelName(model), finishReason: candidate.finishReason || "UNKNOWN" };
}

async function generateWithFallback(apiKey, prompt, maxOutputTokens, resolvedModels) {
  let lastError;

  for (const model of resolvedModels.selected) {
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
  finalError.code = lastError?.code || errorCode(lastError?.message);
  throw finalError;
}

function looksCut(text) {
  const clean = String(text || "").trim();
  if (!clean) return true;
  if (clean.length < 120) return false;
  return !/[.!?)]$/.test(clean) && !clean.endsWith("```");
}

async function runHealthCheck(apiKey, resolvedModels) {
  const result = await generateWithFallback(apiKey, "Jawab tepat satu kata: OK", 32, resolvedModels);
  return {
    ok: true,
    model: result.model,
    answer: result.text
  };
}

function errorStatus(error) {
  if (error?.code === "PROJECT_ACCESS_DENIED") return 403;
  return error.status || 500;
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Allow", "GET, POST, OPTIONS");
      return sendJson(res, 200, { ok: true });
    }

    const apiKey = readGeminiKey();

    if (req.method === "GET") {
      if (!apiKey) {
        return sendJson(res, 200, {
          ok: true,
          message: "Nipah Lestari AI API aktif.",
          envReady: false,
          envName: null,
          testUrl: "/api/ai?test=1",
          version: "2.6.0"
        });
      }

      const resolvedModels = await resolveModels(apiKey);
      const test = String(req.query?.test || "") === "1";

      return sendJson(res, 200, {
        ok: true,
        message: "Nipah Lestari AI API aktif.",
        envReady: true,
        envName: "GEMINI_API_KEY",
        selectedModels: resolvedModels.selected,
        test: test ? await runHealthCheck(apiKey, resolvedModels) : null,
        testUrl: "/api/ai?test=1",
        version: "2.6.0"
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

    const resolvedModels = await resolveModels(apiKey);
    const prompt = buildPrompt(feature, message);
    const first = await generateWithFallback(apiKey, prompt, 4096, resolvedModels);
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
      const continuation = await generateWithFallback(apiKey, continuationPrompt, 2048, resolvedModels);
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
    return sendJson(res, errorStatus(error), {
      ok: false,
      code: error.code || errorCode(error?.message),
      error: normalizeGeminiError(error?.message)
    });
  }
}
