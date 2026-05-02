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

    if (!message) {
      return json(
        {
          ok: false,
          error: "Pesan kosong.",
        },
        400
      );
    }

    const prompt = `
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
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            topP: 0.9,
            maxOutputTokens: 4096,
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
    message: "DeSkin AI API aktif.",
    model: GEMINI_MODEL,
  });
}
