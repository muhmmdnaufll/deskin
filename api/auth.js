const ACCESS_COOKIE = "deskin_session";
const REFRESH_COOKIE = "deskin_refresh";
const ACCESS_MAX_AGE = 60 * 60 * 24 * 7;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

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

function makeCookie(name, value, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value || "")}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function sessionCookies(accessToken, refreshToken) {
  const cookies = [makeCookie(ACCESS_COOKIE, accessToken, ACCESS_MAX_AGE)];
  if (refreshToken) cookies.push(makeCookie(REFRESH_COOKIE, refreshToken, REFRESH_MAX_AGE));
  return cookies;
}

function clearCookies() {
  return [
    makeCookie(ACCESS_COOKIE, "", 0),
    makeCookie(REFRESH_COOKIE, "", 0),
  ];
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
    key: String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim(),
  };
}

function authReady() {
  const e = env();
  return Boolean(e.url && e.key && e.url.includes(".supabase.co"));
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

async function refreshSession(refreshToken) {
  if (!refreshToken) return null;
  return supabase("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

function safeUser(user, fallbackEmail = "", fallbackName = "") {
  return {
    id: user?.id,
    email: user?.email || fallbackEmail,
    name: user?.user_metadata?.name || fallbackName || user?.email?.split("@")[0] || fallbackEmail.split("@")[0] || "Pengguna",
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") return json(res, 200, { ok: true });

    if (!authReady()) {
      return json(res, 503, {
        ok: false,
        code: "AUTH_NOT_CONFIGURED",
        error: "Login belum aktif. Pastikan SUPABASE_URL berbentuk https://PROJECT-REF.supabase.co dan SUPABASE_PUBLISHABLE_KEY sudah diisi di Vercel.",
      });
    }

    if (req.method === "GET") {
      const cookies = parseCookies(req.headers.cookie || "");
      const accessToken = cookies[ACCESS_COOKIE];
      const refreshToken = cookies[REFRESH_COOKIE];

      if (accessToken) {
        const user = await getUser(accessToken).catch(() => null);
        if (user) {
          return json(res, 200, { ok: true, authenticated: true, user: safeUser(user) });
        }
      }

      const refreshed = await refreshSession(refreshToken).catch(() => null);
      if (refreshed?.access_token) {
        const user = refreshed.user || await getUser(refreshed.access_token).catch(() => null);
        return json(res, 200, {
          ok: true,
          authenticated: true,
          refreshed: true,
          user: safeUser(user),
        }, { "Set-Cookie": sessionCookies(refreshed.access_token, refreshed.refresh_token || refreshToken) });
      }

      return json(res, 200, { ok: true, authenticated: false }, { "Set-Cookie": clearCookies() });
    }

    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method tidak didukung." });

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const action = String(body.action || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (action === "logout") return json(res, 200, { ok: true }, { "Set-Cookie": clearCookies() });
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
    const refreshToken = data.refresh_token;
    const user = data.user || (accessToken ? await getUser(accessToken).catch(() => null) : null);

    if (!accessToken && action === "register") {
      return json(res, 200, { ok: true, needsEmailConfirmation: true, message: "Daftar berhasil. Cek email untuk konfirmasi sebelum login." });
    }
    if (!accessToken) return json(res, 401, { ok: false, error: "Login belum berhasil." });

    return json(res, 200, {
      ok: true,
      authenticated: true,
      user: safeUser(user, email, name),
    }, { "Set-Cookie": sessionCookies(accessToken, refreshToken) });
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message || "Auth gagal." });
  }
}
