const COOKIE = "deskin_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function json(res, status, data, headers = {}) {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
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

function cookie(value, maxAge = MAX_AGE) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${encodeURIComponent(value || "")}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function env() {
  return {
    url: String(process.env.SUPABASE_URL || "").replace(/\/$/, ""),
    key: String(process.env.SUPABASE_ANON_KEY || ""),
  };
}

function authReady() {
  const e = env();
  return Boolean(e.url && e.key);
}

async function supabase(path, options = {}) {
  const e = env();
  const response = await fetch(`${e.url}${path}`, {
    ...options,
    headers: {
      apikey: e.key,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error_description || data?.msg || data?.message || "Permintaan auth gagal.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function getUser(accessToken) {
  if (!accessToken) return null;
  return supabase("/auth/v1/user", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") return json(res, 200, { ok: true });

    if (!authReady()) {
      return json(res, 503, {
        ok: false,
        code: "AUTH_NOT_CONFIGURED",
        error: "Login aman belum aktif. Tambahkan SUPABASE_URL dan SUPABASE_ANON_KEY di Vercel Environment Variables.",
      });
    }

    if (req.method === "GET") {
      const token = parseCookies(req.headers.cookie || "")[COOKIE];
      if (!token) return json(res, 200, { ok: true, authenticated: false });
      const user = await getUser(token).catch(() => null);
      if (!user) return json(res, 200, { ok: true, authenticated: false }, { "Set-Cookie": cookie("", 0) });
      return json(res, 200, {
        ok: true,
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split("@")[0] || "Pengguna",
        },
      });
    }

    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method tidak didukung." });

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const action = String(body.action || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (action === "logout") {
      return json(res, 200, { ok: true }, { "Set-Cookie": cookie("", 0) });
    }

    if (!email || !password) return json(res, 400, { ok: false, error: "Email dan password wajib diisi." });
    if (password.length < 8) return json(res, 400, { ok: false, error: "Password minimal 8 karakter." });

    let data;
    if (action === "register") {
      data = await supabase("/auth/v1/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, data: { name } }),
      });
    } else if (action === "login") {
      data = await supabase("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    } else {
      return json(res, 400, { ok: false, error: "Aksi auth tidak valid." });
    }

    const accessToken = data.access_token;
    const user = data.user || (accessToken ? await getUser(accessToken).catch(() => null) : null);
    if (!accessToken && action === "register") {
      return json(res, 200, {
        ok: true,
        needsEmailConfirmation: true,
        message: "Daftar berhasil. Cek email untuk konfirmasi sebelum login.",
      });
    }
    if (!accessToken) return json(res, 401, { ok: false, error: "Login belum berhasil." });

    return json(res, 200, {
      ok: true,
      authenticated: true,
      user: {
        id: user?.id,
        email: user?.email || email,
        name: user?.user_metadata?.name || name || email.split("@")[0],
      },
    }, { "Set-Cookie": cookie(accessToken) });
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message || "Auth gagal." });
  }
}
