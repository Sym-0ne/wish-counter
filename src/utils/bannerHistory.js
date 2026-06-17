/**
 * Utilitaires pour identifier les bannières passées par timestamp
 * et inférer automatiquement le Win/loss des pulls synchés.
 *
 * Source : /banners-history.json généré par fetch-banners.mjs à chaque build.
 */

const BASE_PATH = import.meta.env.BASE_URL ?? '/wish-counter/';
let _cache = null;
let _promise = null;

export async function getBannerHistory() {
  if (_cache) return _cache;
  if (_promise) return _promise;
  _promise = fetch(`${BASE_PATH}banners-history.json`, {
    signal: AbortSignal.timeout(8000),
  })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((d) => { _cache = d; return d; })
    .catch(() => {
      _cache = { character: [], weapon: [], chronicled: [] };
      return _cache;
    })
    .finally(() => { _promise = null; });
  return _promise;
}

/** Normalisation pour comparaison souple (accents, espaces, tirets) */
function norm(s) {
  return (s || '').toLowerCase().replace(/[\s\-'`"éèêëàâùûüîïôç]/g, (c) => {
    const map = { é:'e', è:'e', ê:'e', ë:'e', à:'a', â:'a', ù:'u', û:'u', ü:'u', î:'i', ï:'i', ô:'o', ç:'c' };
    return map[c] ?? '';
  });
}

/**
 * Retourne la phase de bannière active au moment du pull, ou null.
 * @param {object} history  Contenu de banners-history.json
 * @param {string} bannerKey  'character' | 'weapon' | 'standard' | 'chronicled'
 * @param {number} timestamp  ms depuis epoch
 */
export function findBannerForTimestamp(history, bannerKey, timestamp) {
  if (!history || !timestamp) return null;
  const list = history[bannerKey] ?? [];
  for (const b of list) {
    if (timestamp >= b.startMs && timestamp <= b.endMs) return b;
  }
  return null;
}

/**
 * Infère si le pull est un Win (true), Loss (false), ou inconnu (null).
 * - true  : le personnage est le featured du banner
 * - false : banner connu mais personnage hors featured → loss
 * - null  : banner inconnu, impossible de déterminer
 */
export function inferFeatured(bannerInfo, wishName) {
  if (!bannerInfo || !wishName) return null;
  const name = norm(wishName);
  if (bannerInfo.featured  && norm(bannerInfo.featured)  === name) return true;
  if (bannerInfo.featured2 && norm(bannerInfo.featured2) === name) return true;
  return false;
}
