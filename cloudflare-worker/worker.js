/**
 * Cloudflare Worker — proxy CORS pour l'API historique de vœux HoYoverse.
 *
 * Déploiement :
 *  1. Crée un compte sur https://dash.cloudflare.com (gratuit)
 *  2. Workers & Pages → Create Worker → colle ce code → Deploy
 *  3. Note l'URL du worker (ex: https://genshin-sync.ton-compte.workers.dev)
 *  4. Colle cette URL dans Paramètres → Synchronisation de l'app
 *
 * Sécurité : seules les origines listées dans ALLOWED_ORIGINS peuvent appeler
 * ce worker, et seuls les hôtes HoYoverse sont autorisés comme cibles.
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

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return jsonResponse({ error: 'Origin not allowed' }, 403, origin);
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return jsonResponse({ error: 'Missing ?url= parameter' }, 400, origin);
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return jsonResponse({ error: 'Invalid target URL' }, 400, origin);
    }

    if (!ALLOWED_HOSTS.some(h => targetUrl.hostname === h)) {
      return jsonResponse({ error: 'Target host not allowed' }, 403, origin);
    }

    try {
      const resp = await fetch(targetUrl.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const data = await resp.json();
      return jsonResponse(data, 200, origin);
    } catch (err) {
      return jsonResponse({ error: 'Upstream fetch failed', detail: String(err) }, 502, origin);
    }
  },
};
