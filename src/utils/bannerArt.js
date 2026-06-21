/**
 * Résout l'illustration "hero" de la bannière personnage en cours, hébergée par
 * paimon.moe (CORS ouvert, mise à jour à chaque nouvelle bannière) :
 *   https://paimon.moe/images/home/{perso1} {perso2}.webp
 *
 * Le nommage des fichiers n'est pas 100% homogène (espace, tiret, underscore,
 * ordre des deux noms, parfois un seul nom pour les bannières solo) — on teste
 * une cascade de candidats et on garde le premier qui charge réellement.
 */

const PAIMON_HOME_BASE = 'https://paimon.moe/images/home/';

let _cache = null;    // { key, url } | { key, url: null } si rien n'a résolu
let _promise = null;

function buildCandidates(featured, featured2) {
  const a = (featured || '').toLowerCase().trim();
  const b = (featured2 || '').toLowerCase().trim();
  if (!a) return [];

  const pairs = b
    ? [`${a} ${b}`, `${b} ${a}`, `${a}-${b}`, `${b}-${a}`, `${a}_${b}`]
    : [];

  return [...pairs, a].map((name) => `${PAIMON_HOME_BASE}${encodeURIComponent(name)}.webp`);
}

function tryLoad(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Retourne l'URL de la première illustration qui charge réellement, ou null
 * si aucun candidat ne résout (fond par défaut conservé côté UI dans ce cas).
 */
export async function resolveBannerArtUrl(featured, featured2) {
  const key = `${featured || ''}__${featured2 || ''}`;
  if (_cache?.key === key) return _cache.url;
  if (_promise) return _promise;

  const candidates = buildCandidates(featured, featured2);
  if (candidates.length === 0) return null;

  _promise = (async () => {
    for (const url of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const resolved = await tryLoad(url);
      if (resolved) {
        _cache = { key, url: resolved };
        return resolved;
      }
    }
    _cache = { key, url: null };
    return null;
  })().finally(() => { _promise = null; });

  return _promise;
}
