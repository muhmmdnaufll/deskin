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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function cleanBase64(value) {
  return String(value || "").replace(/^data:[^;]+;base64,/, "").trim();
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
    safetyNote: String(
      scan.safetyNote ||
        "Hasil ini adalah estimasi visual edukatif, bukan diagnosis medis."
    ).slice(0, 700),
  };
}

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return json(
        {
          ok: false,
          error: "GEMINI_API_KEY belum diatur di Vercel Environment Variables.",
        },
        500
      );
    }

    const body = await request.json().catch(() => ({}));
    const message = String(body.message || "").trim();
    const feature = String(body.feature || "general").trim();
    const imageData = cleanBase64(body.imageData);
    const mimeType = String(body.mimeType || "image/jpeg").trim();
    const isVisionScan = feature === "SKINAnalyzerVision";

    if (!message && !imageData) {
      return json(
        {
          ok: false,
          error: "Pesan kosong.",
        },
        400
      );
    }

    const textPrompt = isVisionScan
      ? `
Kamu adalah modul visual DeSkin untuk estimasi edukatif kondisi kulit dari gambar.
Tugas: lihat gambar yang dikirim dan tentukan apakah gambar tersebut benar-benar wajah manusia atau area kulit manusia yang cukup jelas.

Jika gambar BUKAN wajah/kulit manusia yang jelas (misalnya tembok, meja, benda, langit, sangat blur, terlalu gelap, atau wajah tidak tampak), wajib kembalikan:
{
  "isSkinImage": false,
  "confidence": 0-40,
  "moisture": 50,
  "sebum": 50,
  "texture": 50,
  "acne": 50,
  "sensitivity": 50,
  "skinType": "unknown",
  "concerns": [],
  "summary": "Gambar tidak cukup valid untuk scan kulit. Arahkan kamera ke wajah/area kulit yang jelas.",
  "safetyNote": "Hasil scan tidak dibuat karena gambar bukan kulit/wajah yang jelas."
}

Jika gambar adalah wajah/kulit manusia yang cukup jelas, estimasikan parameter 0-100:
- moisture: makin tinggi berarti kulit terlihat lebih terhidrasi
- sebum: makin tinggi berarti terlihat lebih berminyak
- texture: makin tinggi berarti tekstur terlihat lebih rata/halus
- acne: makin tinggi berarti tanda jerawat/kemerahan/komedo aktif lebih terlihat
- sensitivity: makin tinggi berarti tanda kemerahan/iritasi lebih terlihat

Kembalikan JSON SAJA tanpa markdown, tanpa teks tambahan:
{
  "isSkinImage": true,
  "confidence": 0-100,
  "moisture": 0-100,
  "sebum": 0-100,
  "texture": 0-100,
  "acne": 0-100,
  "sensitivity": 0-100,
  "skinType": "oily" | "dry" | "normal" | "combination" | "sensitive" | "unknown",
  "concerns": ["acne" | "oil" | "dry" | "texture" | "pores" | "redness"],
  "summary": "ringkasan singkat hasil visual",
  "safetyNote": "hasil adalah estimasi visual edukatif, bukan diagnosis medis"
}

Catatan pengguna:
${message || "Scan gambar dari kamera/upload."}
`
      : `
${SYSTEM_PROMPT}

Konteks fitur: ${feature}

Pertanyaan atau data pengguna:
${message}

Berikan jawaban lengkap dan jangan berhenti di tengah kalimat.
Gunakan format rapi:
1. Ringkasan kondisi/kebutuhan
2. Langkah praktis
3. Catatan keamanan
4. Kapan perlu konsultasi
`;

    const parts = [{ text: textPrompt }];
    if (imageData) {
      parts.push({
        inline_data: {
          mime_type: mimeType || "image/jpeg",
          data: imageData,
        },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts,
            },
          ],
          generationConfig: {
            temperature: isVisionScan ? 0.2 : 0.5,
            topP: 0.9,
            maxOutputTokens: isVisionScan ? 900 : 4096,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return json(
        {
          ok: false,
          error:
            data?.error?.message ||
            "Gagal menghubungi Gemini API. Cek API key atau kuota.",
        },
        response.status
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "AI belum memberi jawaban.";

    if (isVisionScan) {
      const scan = normalizeScan(extractJson(text));
      if (!scan) {
        return json(
          {
            ok: false,
            error: "AI belum mengembalikan format scan yang valid. Coba ulangi dengan foto yang lebih jelas.",
            raw: text,
          },
          502
        );
      }

      return json({
        ok: true,
        model: GEMINI_MODEL,
        answer: scan.summary,
        scan,
      });
    }

    return json({
      ok: true,
      model: GEMINI_MODEL,
      answer: text,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error?.message || "Terjadi kesalahan server.",
      },
      500
    );
  }
}

export async function GET() {
  return json({
    ok: true,
    message: "DeSkin AI API aktif dengan dukungan teks dan vision scan.",
    model: GEMINI_MODEL,
  });
}
