/**
 * Cloudflare Worker — proxy CORS pour HoYoverse + gestion des bannières à venir.
 *
 * ── DÉPLOIEMENT ─────────────────────────────────────────────────────────────
 * 1. Workers & Pages → Create Worker → colle ce code → Deploy
 * 2. Crée un namespace KV : Workers & Pages → KV → Create namespace "UPCOMING_KV"
 * 3. Lie le KV au Worker : Worker → Settings → Bindings → KV → UPCOMING_KV
 * 4. Ajoute les variables d'environnement (Worker → Settings → Variables) :
 *      GITHUB_TOKEN  = ghp_xxxxxxx (PAT fine-grained, Contents R/W sur wish-counter)
 *      ADMIN_SECRET  = un mot de passe fort que toi seul connais
 * 5. Note l'URL du Worker dans Paramètres → Synchronisation de l'app
 *
 * ── ENDPOINTS ───────────────────────────────────────────────────────────────
 * POST /upcoming/write           { username, password, entries[] }
 * POST /upcoming/admin/users     { adminSecret, username, password, role? }
 * DELETE /upcoming/admin/users   { adminSecret, username }
 * GET  /upcoming/admin/users?adminSecret=...
 * GET  /upcoming/admin/logs?adminSecret=...
 * GET  ?url=https://hk4e-api…    (proxy HoYoverse existant)
 */

const ALLOWED_ORIGINS = [
  'https://sym-0ne.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

const ALLOWED_HOSTS = [
  'hk4e-api-os.hoyoverse.com',
  'hk4e-api.hoyoverse.com',
  'public-operation-hk4e-sg.hoyoverse.com',
  'public-operation-hk4e.hoyoverse.com',
];

const GH_API = 'https://api.github.com/repos/Sym-0ne/wish-counter/contents/public/banners-upcoming.json';

// ── Helpers ──────────────────────────────────────────────────────────────────

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function randomHex(n) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100_000 },
    key, 256
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyUser(env, username, password) {
  const raw = await env.UPCOMING_KV.get(`user:${username}`, 'json');
  if (!raw) return null;
  const hash = await hashPassword(password, raw.salt);
  if (hash !== raw.passwordHash) return null;
  return raw; // { passwordHash, salt, role, createdAt }
}

// ── GitHub API ───────────────────────────────────────────────────────────────

async function ghRead(token) {
  const r = await fetch(GH_API, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'wish-counter-worker/1.0' },
  });
  if (!r.ok) throw new Error(`GitHub read HTTP ${r.status}`);
  return r.json(); // { sha, content, ... }
}

async function ghWrite(token, entries, sha) {
  const body = JSON.stringify(entries, null, 2) + '\n';
  const content = btoa(unescape(encodeURIComponent(body)));
  const r = await fetch(GH_API, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'wish-counter-worker/1.0',
    },
    body: JSON.stringify({
      message: 'feat: update banners-upcoming.json via wish-counter',
      content,
      sha,
    }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.message || `GitHub write HTTP ${r.status}`);
  }
}

// ── Audit log ────────────────────────────────────────────────────────────────

async function log(env, username, action, ip, extra = {}) {
  const key = `log:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
  await env.UPCOMING_KV.put(
    key,
    JSON.stringify({ timestamp: new Date().toISOString(), username, action, ip, ...extra }),
    { expirationTtl: 30 * 86400 } // 30 jours
  ).catch(() => {});
}

// ── Route handlers ───────────────────────────────────────────────────────────

async function handleWrite(req, env, origin) {
  let body;
  try { body = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400, origin); }

  const { username, password, entries } = body ?? {};
  if (!username || !password || !Array.isArray(entries)) {
    return json({ error: 'username, password et entries requis' }, 400, origin);
  }

  const user = await verifyUser(env, username, password);
  const ip   = req.headers.get('CF-Connecting-IP') ?? 'unknown';

  if (!user) {
    await log(env, username, 'auth_failed', ip);
    return json({ error: 'Identifiants incorrects' }, 401, origin);
  }

  try {
    const { sha } = await ghRead(env.GITHUB_TOKEN);
    await ghWrite(env.GITHUB_TOKEN, entries, sha);
    await log(env, username, 'write_upcoming', ip, { count: entries.length });
    return json({ ok: true }, 200, origin);
  } catch (err) {
    await log(env, username, 'write_error', ip, { error: err.message });
    return json({ error: err.message }, 502, origin);
  }
}

async function handleAddUser(req, env, origin) {
  let body;
  try { body = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400, origin); }

  if (!env.ADMIN_SECRET || body?.adminSecret !== env.ADMIN_SECRET) {
    return json({ error: 'Admin secret incorrect' }, 403, origin);
  }
  const { username, password, role = 'user' } = body;
  if (!username?.trim() || !password?.trim()) {
    return json({ error: 'username et password requis' }, 400, origin);
  }
  if (!/^[a-z0-9_-]{2,32}$/.test(username)) {
    return json({ error: 'username: 2-32 caractères a-z 0-9 _ -' }, 400, origin);
  }

  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);

  await env.UPCOMING_KV.put(
    `user:${username}`,
    JSON.stringify({ passwordHash, salt, role, createdAt: new Date().toISOString() })
  );
  return json({ ok: true, username, role }, 200, origin);
}

async function handleDeleteUser(req, env, origin) {
  let body;
  try { body = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400, origin); }

  if (!env.ADMIN_SECRET || body?.adminSecret !== env.ADMIN_SECRET) {
    return json({ error: 'Admin secret incorrect' }, 403, origin);
  }
  const { username } = body;
  if (!username) return json({ error: 'username requis' }, 400, origin);

  await env.UPCOMING_KV.delete(`user:${username}`);
  return json({ ok: true }, 200, origin);
}

async function handleListUsers(req, env, origin) {
  const url = new URL(req.url);
  if (!env.ADMIN_SECRET || url.searchParams.get('adminSecret') !== env.ADMIN_SECRET) {
    return json({ error: 'Admin secret incorrect' }, 403, origin);
  }
  const list = await env.UPCOMING_KV.list({ prefix: 'user:' });
  const users = await Promise.all(
    list.keys.map(async (k) => {
      const d = await env.UPCOMING_KV.get(k.name, 'json');
      return { username: k.name.slice(5), role: d?.role ?? 'user', createdAt: d?.createdAt };
    })
  );
  return json(users, 200, origin);
}

async function handleLogs(req, env, origin) {
  const url = new URL(req.url);
  if (!env.ADMIN_SECRET || url.searchParams.get('adminSecret') !== env.ADMIN_SECRET) {
    return json({ error: 'Admin secret incorrect' }, 403, origin);
  }
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
  const list = await env.UPCOMING_KV.list({ prefix: 'log:', limit });
  const entries = await Promise.all(list.keys.map((k) => env.UPCOMING_KV.get(k.name, 'json')));
  entries.sort((a, b) => new Date(b?.timestamp) - new Date(a?.timestamp));
  return json(entries.filter(Boolean), 200, origin);
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: 'Origin not allowed' }, 403, origin);
    }

    // ── Upcoming endpoints ────────────────────────────────────────────────
    if (path === '/upcoming/write'        && method === 'POST')   return handleWrite(request, env, origin);
    if (path === '/upcoming/admin/users'  && method === 'POST')   return handleAddUser(request, env, origin);
    if (path === '/upcoming/admin/users'  && method === 'DELETE') return handleDeleteUser(request, env, origin);
    if (path === '/upcoming/admin/users'  && method === 'GET')    return handleListUsers(request, env, origin);
    if (path === '/upcoming/admin/logs'   && method === 'GET')    return handleLogs(request, env, origin);

    // ── HoYoverse proxy (existant) ────────────────────────────────────────
    const target = url.searchParams.get('url');
    if (!target) return json({ error: 'Missing ?url= parameter' }, 400, origin);

    let targetUrl;
    try { targetUrl = new URL(target); }
    catch { return json({ error: 'Invalid target URL' }, 400, origin); }

    if (!ALLOWED_HOSTS.some((h) => targetUrl.hostname === h)) {
      return json({ error: 'Target host not allowed' }, 403, origin);
    }

    try {
      const resp = await fetch(targetUrl.toString(), { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const data = await resp.json();
      return json(data, 200, origin);
    } catch (err) {
      return json({ error: 'Upstream fetch failed', detail: String(err) }, 502, origin);
    }
  },
};
