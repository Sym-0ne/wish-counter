/**
 * Accès à l'API communautaire genshin.jmp.blue (CORS-friendly, gratuite).
 * Utilisée pour : liste des personnages/armes, icônes de portraits.
 *
 * Cache module-level pour éviter de refetch à chaque render.
 */

const BASE = 'https://genshin.jmp.blue';

// Module-level cache (survive les re-renders, pas les rechargements page)
let charCache = null;   // Map<slug, { name, slug }>
let weapCache = null;   // Map<slug, { name, slug }>

function normalize(s) {
  return (s || '').toLowerCase().replace(/[\s\-'`"éèêëàâùûüîïôç]/g, (c) => {
    const map = { é: 'e', è: 'e', ê: 'e', ë: 'e', à: 'a', â: 'a', ù: 'u', û: 'u', ü: 'u', î: 'i', ï: 'i', ô: 'o', ç: 'c' };
    return map[c] ?? '';
  });
}

async function fetchList(type) {
  const resp = await fetch(`${BASE}/${type}`, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) throw new Error(`genshin.jmp.blue: HTTP ${resp.status}`);
  return resp.json(); // string[]
}

async function fetchAllData(type) {
  const resp = await fetch(`${BASE}/${type}/all`, { signal: AbortSignal.timeout(10000) });
  if (!resp.ok) throw new Error(`genshin.jmp.blue /all: HTTP ${resp.status}`);
  const data = await resp.json();
  // Returns { slug: { name, ... } }
  return Object.entries(data).map(([slug, info]) => ({
    slug,
    name: info.name || slug,
    rarity: info.rarity,
  }));
}

export async function getCharacterList() {
  if (charCache) return charCache;
  try {
    const items = await fetchAllData('characters');
    charCache = items;
    return charCache;
  } catch {
    // Fallback: juste les slugs
    try {
      const slugs = await fetchList('characters');
      charCache = slugs.map(slug => ({ slug, name: slug }));
      return charCache;
    } catch {
      return [];
    }
  }
}

export async function getWeaponList() {
  if (weapCache) return weapCache;
  try {
    const items = await fetchAllData('weapons');
    weapCache = items;
    return weapCache;
  } catch {
    try {
      const slugs = await fetchList('weapons');
      weapCache = slugs.map(slug => ({ slug, name: slug }));
      return weapCache;
    } catch {
      return [];
    }
  }
}

/**
 * Cherche le slug correspondant à un nom donné (correspondance souple).
 * Retourne null si aucun match.
 */
export function findSlug(list, name) {
  if (!name || !list.length) return null;
  const query = normalize(name);
  // Correspondance exacte d'abord
  let match = list.find(item => normalize(item.name) === query || normalize(item.slug) === query);
  if (match) return match.slug;
  // Correspondance partielle (le nom commence par la requête)
  match = list.find(item => normalize(item.name).startsWith(query) || query.startsWith(normalize(item.name)));
  return match ? match.slug : null;
}

export function characterIconUrl(slug) {
  return `${BASE}/characters/${slug}/icon-big`;
}

export function weaponIconUrl(slug) {
  return `${BASE}/weapons/${slug}/icon`;
}
