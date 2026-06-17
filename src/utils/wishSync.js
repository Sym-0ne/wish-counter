/**
 * Logique d'auto-sync avec l'API historique de vœux HoYoverse.
 *
 * L'API retourne les vœux du plus récent au plus ancien par pages de 20.
 * On pagine jusqu'à trouver un ID déjà connu ou atteindre la fin.
 *
 * Les vœux importés ont featured: null (inconnu depuis l'API).
 * pityRules.processHistory traite null comme "skip 50/50 update".
 */

/**
 * Normalise une URL authkey : accepte aussi bien l'URL de la page web de
 * l'historique (webstatic / gs.hoyoverse.com) que l'URL API directe.
 * Le log Genshin écrit l'URL de la page, pas l'URL API.
 */
export function normalizeAuthkeyUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    // Déjà une URL API HoYoverse → retour immédiat
    if (u.hostname.startsWith('public-operation-hk4e')) return rawUrl;
    // URL de page web → extraire les params et construire l'URL API
    const region = u.searchParams.get('region') || '';
    const isCN = region.startsWith('cn_');
    const apiHost = isCN
      ? 'public-operation-hk4e.hoyoverse.com'
      : 'public-operation-hk4e-sg.hoyoverse.com';
    return `https://${apiHost}/gacha_info/api/getGachaLog?${u.searchParams.toString()}`;
  } catch {
    return rawUrl;
  }
}

// gacha_type API → bannerKey app
const GACHA_TYPE_MAP = {
  '200': 'standard',
  '301': 'character',
  '302': 'weapon',
  '400': 'character',  // Deuxième bannière personnage = même clé
  '500': 'chronicled',
};

// Bannières à synchroniser (dans l'ordre)
const SYNC_TYPES = [
  { gachaType: '301', label: 'Personnage (1)' },
  { gachaType: '400', label: 'Personnage (2)' },
  { gachaType: '302', label: 'Arme' },
  { gachaType: '200', label: 'Standard' },
  { gachaType: '500', label: 'Chroniques' },
];

// item_type strings for weapons across all game languages (default to 'character' if not in set)
const WEAPON_ITEM_TYPES = new Set([
  'Weapon',    // en
  'Arme',      // fr
  '武器',       // zh-cn, ja
  'Waffe',     // de
  'Arma',      // es, pt, it
  'Оружие',    // ru
  'อาวุธ',     // th
  'Vũ khí',    // vi
  'Senjata',   // id
  '무기',       // ko
]);

function parseApiWish(apiWish, bannerKey) {
  // "2026-05-15 14:23:45" → timestamp ms (UTC+8 — serveur Genshin Impact)
  const ts = new Date(apiWish.time.replace(' ', 'T') + '+08:00').getTime();
  return {
    id: apiWish.id,
    timestamp: isNaN(ts) ? Date.now() : ts,
    version: 'sync',
    bannerKey,
    rank: parseInt(apiWish.rank_type, 10),
    name: apiWish.name,
    itemType: WEAPON_ITEM_TYPES.has(apiWish.item_type) ? 'weapon' : 'character',
    featured: null,   // Inconnu via API — pityRules le gère proprement
    source: 'api',
  };
}

async function fetchPage(workerUrl, baseUrl, gachaType, endId) {
  const apiUrl = new URL(baseUrl);
  apiUrl.searchParams.set('gacha_type', gachaType);
  apiUrl.searchParams.set('page', '1');
  apiUrl.searchParams.set('size', '20');
  apiUrl.searchParams.set('end_id', endId);

  const proxyUrl = `${workerUrl.replace(/\/$/, '')}?url=${encodeURIComponent(apiUrl.toString())}`;

  const resp = await fetch(proxyUrl, {
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Worker HTTP ${resp.status}${body ? ': ' + body : ''}`);
  }

  const json = await resp.json();
  if (json.retcode !== 0) {
    throw new Error(`API HoYoverse: ${json.message} (code ${json.retcode})`);
  }

  return json.data?.list ?? [];
}

/**
 * Synchronise toutes les bannières via le Cloudflare Worker.
 *
 * @param {string} workerUrl  URL du worker (ex: https://xxx.workers.dev)
 * @param {string} authkeyUrl URL complète avec authkey copiée depuis le jeu
 * @param {object} existingBanners  state.banners actuel
 * @param {function} onProgress  callback(message: string)
 * @returns {{ character: Wish[], weapon: Wish[], standard: Wish[], chronicled: Wish[] }}
 */
export async function syncAllBanners(workerUrl, authkeyUrl, existingBanners, onProgress) {
  const baseUrl = normalizeAuthkeyUrl(authkeyUrl);
  const results = { character: [], weapon: [], standard: [], chronicled: [] };

  for (const { gachaType, label } of SYNC_TYPES) {
    const bannerKey = GACHA_TYPE_MAP[gachaType];
    onProgress?.(`Récupération : ${label}…`);

    const existingIds = new Set(
      (existingBanners[bannerKey]?.history ?? []).map(w => w.id)
    );

    let endId = '0';
    let stop = false;

    while (!stop) {
      const page = await fetchPage(workerUrl, baseUrl, gachaType, endId);

      if (!page.length) break;

      for (const raw of page) {
        if (existingIds.has(raw.id)) {
          stop = true;
          break;
        }
        results[bannerKey].push(parseApiWish(raw, bannerKey));
      }

      if (!stop && page.length === 20) {
        endId = page[page.length - 1].id;
        await new Promise(r => setTimeout(r, 350)); // Évite le rate-limit HoYoverse
      } else {
        break;
      }
    }

    onProgress?.(`${label} : ${results[bannerKey].length} nouveau(x) vœu(x)`);
  }

  return results;
}

export function countNewWishes(groups) {
  return Object.values(groups).reduce((s, arr) => s + arr.length, 0);
}
