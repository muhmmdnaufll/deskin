const COOKIE = "deskin_session";
const TABLE = "deskin_user_data";

function json(res, status, data) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(data);
}

function parseCookies(header = "") {
  return Object.fromEntries(
    String(header)
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((pair) => pair.length === 2)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );
}

function normalizeSupabaseUrl(raw) {
  const value = String(raw || "").trim().replace(/\/$/, "");
  if (!value) return "";
  try {
    const url = new URL(value);
    const project = url.pathname.match(/\/project\/([a-z0-9]{10,})/i)?.[1];
    if (url.hostname === "supabase.com" && project) return `https://${project}.supabase.co`;
    if (url.hostname.endsWith(".supabase.co")) return url.origin;
    return value;
  } catch {
    return value;
  }
}

function env() {
  return {
    url: normalizeSupabaseUrl(process.env.SUPABASE_URL),
    anon: String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim(),
    service: String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
  };
}

function ready() {
  const e = env();
  return Boolean(e.url && e.anon && e.service && e.url.includes(".supabase.co"));
}

async function supabase(path, options = {}, service = false) {
  const e = env();
  const key = service ? e.service : e.anon;
  const response = await fetch(`${e.url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const err = new Error(data?.message || data?.msg || "Data gagal diproses.");
    err.status = response.status;
    throw err;
  }
  return data;
}

async function currentUser(req) {
  const token = parseCookies(req.headers.cookie || "")[COOKIE];
  if (!token) return null;
  try {
    const e = env();
    const response = await fetch(`${e.url}/auth/v1/user`, {
      headers: {
        apikey: e.anon,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

function safePayload(value) {
  const payload = value && typeof value === "object" ? value : {};
  return {
    profile: payload.profile || {},
    skinType: payload.skinType || "normal",
    concerns: Array.isArray(payload.concerns) ? payload.concerns.slice(0, 12) : [],
    routine: Array.isArray(payload.routine) ? payload.routine.slice(0, 40) : [],
    notes: Array.isArray(payload.notes) ? payload.notes.slice(0, 100) : [],
    analyses: Array.isArray(payload.analyses) ? payload.analyses.slice(0, 100) : [],
    saved: Array.isArray(payload.saved) ? payload.saved.slice(0, 100) : [],
    messages: Array.isArray(payload.messages) ? payload.messages.slice(-100) : [],
    updatedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") return json(res, 200, { ok: true });
    if (!ready()) {
      return json(res, 503, {
        ok: false,
        code: "DATA_NOT_CONFIGURED",
        error: "Penyimpanan aman belum aktif. Pastikan SUPABASE_URL berbentuk https://PROJECT-REF.supabase.co dan key Supabase sudah diisi di Vercel.",
      });
    }

    const user = await currentUser(req);
    if (!user?.id) return json(res, 401, { ok: false, error: "Login diperlukan." });

    if (req.method === "GET") {
      const rows = await supabase(`/rest/v1/${TABLE}?user_id=eq.${encodeURIComponent(user.id)}&select=payload,updated_at&limit=1`, { method: "GET" }, true);
      return json(res, 200, { ok: true, payload: rows?.[0]?.payload || null, updatedAt: rows?.[0]?.updated_at || null });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const payload = safePayload(body.payload);
      const row = { user_id: user.id, payload, updated_at: new Date().toISOString() };
      const rows = await supabase(`/rest/v1/${TABLE}?on_conflict=user_id`, {
        method: "POST",
        body: JSON.stringify(row),
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      }, true);
      return json(res, 200, { ok: true, payload: rows?.[0]?.payload || payload });
    }

    return json(res, 405, { ok: false, error: "Method tidak didukung." });
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message || "Data API gagal." });
  }
}
