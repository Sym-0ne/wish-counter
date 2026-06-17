/**
 * Accès aux données de personnages/armes Genshin Impact.
 *
 * Sources :
 *  - gi.yatta.moe  : liste complète + à jour (tous les personnages dont v5/v6+)
 *  - genshin.jmp.blue : fallback (s'arrête à ~v4.7, ~92 personnages)
 *
 * Chaque item retourné : { slug, name, rarity, portraitUrl }
 */

const YATTA_BASE = 'https://gi.yatta.moe/api/v2';
const JMP_BASE   = 'https://genshin.jmp.blue';

// Module-level cache (survive les re-renders, pas les rechargements page)
let charCache = null;
let weapCache = null;

// ── Normalisation pour recherche souple (accents, espaces, tirets ignorés) ──

function normalize(s) {
  return (s || '').toLowerCase().replace(/[\s\-'`"éèêëàâùûüîïôç]/g, (c) => {
    const map = { é:'e', è:'e', ê:'e', ë:'e', à:'a', â:'a', ù:'u', û:'u', ü:'u', î:'i', ï:'i', ô:'o', ç:'c' };
    return map[c] ?? '';
  });
}

// ── Yatta.moe ────────────────────────────────────────────────────────────────

async function fetchYattaCharacters() {
  const resp = await fetch(`${YATTA_BASE}/en/avatar`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`yatta: HTTP ${resp.status}`);
  const { data } = await resp.json();
  return Object.values(data?.items ?? {})
    .filter((c) => c.id && c.name && c.icon && !c.name.includes('Test'))
    .map((c) => ({
      slug: c.icon.replace('UI_AvatarIcon_', ''), // e.g. "Mavuika", "Hutao"
      name: c.name,
      rarity: c.rank,
      portraitUrl: `https://enka.network/ui/${c.icon}.png`,
    }));
}

// ── genshin.jmp.blue (fallback) ───────────────────────────────────────────

async function fetchJmpCharacters() {
  const resp = await fetch(`${JMP_BASE}/characters/all`, { signal: AbortSignal.timeout(10000) });
  if (!resp.ok) throw new Error(`jmp.blue: HTTP ${resp.status}`);
  const data = await resp.json();
  return Object.entries(data).map(([slug, info]) => ({
    slug,
    name: info.name || slug,
    rarity: info.rarity,
    portraitUrl: `${JMP_BASE}/characters/${slug}/icon-big`,
  }));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getCharacterList() {
  if (charCache) return charCache;
  try {
    charCache = await fetchYattaCharacters();
  } catch {
    try {
      charCache = await fetchJmpCharacters();
    } catch {
      charCache = [];
    }
  }
  return charCache;
}

export async function getWeaponList() {
  if (weapCache) return weapCache;
  try {
    const resp = await fetch(`${JMP_BASE}/weapons/all`, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error(`jmp.blue weapons: HTTP ${resp.status}`);
    const data = await resp.json();
    weapCache = Object.entries(data).map(([slug, info]) => ({
      slug,
      name: info.name || slug,
      rarity: info.rarity,
      portraitUrl: `${JMP_BASE}/weapons/${slug}/icon`,
    }));
  } catch {
    weapCache = [];
  }
  return weapCache;
}

/**
 * Cherche le slug correspondant à un nom donné (correspondance souple).
 * Retourne null si aucun match.
 */
export function findSlug(list, name) {
  if (!name || !list.length) return null;
  const query = normalize(name);
  let match = list.find(
    (item) => normalize(item.name) === query || normalize(item.slug) === query
  );
  if (match) return match.slug;
  match = list.find(
    (item) =>
      normalize(item.name).startsWith(query) || query.startsWith(normalize(item.name))
  );
  return match ? match.slug : null;
}

/**
 * Cherche l'item complet par nom (avec portraitUrl pré-calculé).
 */
export function findItem(list, name) {
  if (!name || !list.length) return null;
  const slug = findSlug(list, name);
  return slug ? (list.find((i) => i.slug === slug) ?? null) : null;
}

// ── URL helpers (rétro-compatibilité) ────────────────────────────────────────

export function characterIconUrl(slug) {
  return `${JMP_BASE}/characters/${slug}/icon-big`;
}

export function weaponIconUrl(slug) {
  return `${JMP_BASE}/weapons/${slug}/icon`;
}

// enka.network — toujours à jour avec les fichiers du jeu
export function characterEnkaUrl(slug) {
  const enkaName = slug
    .replace(/[_-](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase());
  return `https://enka.network/ui/UI_AvatarIcon_${enkaName}.png`;
}
