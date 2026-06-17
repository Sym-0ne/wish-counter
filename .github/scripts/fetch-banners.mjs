#!/usr/bin/env node
/**
 * Fetches current Genshin Impact banner data from paimon.moe's public GitHub data.
 * Runs in GitHub Actions before the Vite build.
 * Writes to public/banners-current.json — the app reads this at runtime.
 *
 * Data source: github.com/MadeBaruna/paimon-moe (src/data/banners.js)
 * Portrait images: enka.network (always up-to-date with game files), fallback genshin.jmp.blue
 */

import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createContext, Script } from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE  = join(__dirname, '../../public/banners-current.json');
const HIST_FILE = join(__dirname, '../../public/banners-history.json');

const BANNERS_JS_URL =
  'https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/src/data/banners.js';

// enka.network uses PascalCase internal names from game files — most up-to-date source
const ENKA_BASE = 'https://enka.network/ui';
// genshin.jmp.blue — fallback (stopped around v4.7, ~92 characters)
const JMP_BASE = 'https://genshin.jmp.blue/characters';

/** 'hu-tao' → 'HuTao', 'mavuika' → 'Mavuika' (enka.network PascalCase) */
function slugToEnkaName(slug) {
  return slug
    .replace(/[_-](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** 'hu-tao' → 'Hu Tao', 'arataki-itto' → 'Arataki Itto' */
function slugToName(slug) {
  return slug
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function checkUrl(url) {
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    return resp.ok && resp.headers.get('content-type')?.startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * Resolves a portrait URL for a character slug.
 * Tries enka.network first (always current), falls back to genshin.jmp.blue.
 */
async function resolvePortrait(slug) {
  if (!slug) return null;
  const enkaUrl = `${ENKA_BASE}/UI_AvatarIcon_${slugToEnkaName(slug)}.png`;
  if (await checkUrl(enkaUrl)) return enkaUrl;
  // Fallback for older characters (enka naming edge cases)
  const jmpUrl = `${JMP_BASE}/${slug}/portrait`;
  if (await checkUrl(jmpUrl)) return jmpUrl;
  console.warn(`  ⚠ No portrait found for ${slug} (tried enka + jmp.blue)`);
  return null;
}

function toISODate(timeStr) {
  if (!timeStr || timeStr.startsWith('2200')) return null;
  return timeStr.slice(0, 10);
}

async function fetchBannersJs() {
  const resp = await fetch(BANNERS_JS_URL, {
    headers: { 'User-Agent': 'wish-counter-banners-fetch/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching banners.js`);
  return resp.text();
}

function parseBannersJs(code) {
  const scriptCode = code.replace(/^export\s+const\s+banners\s*=\s*/m, 'var banners = ');
  const ctx = createContext({ banners: null });
  new Script(scriptCode).runInContext(ctx);
  return ctx.banners;
}

function findCurrentBanner(list) {
  if (!Array.isArray(list)) return null;
  const now = new Date();
  return list.find((b) => {
    if (!b.start || !b.end) return false;
    const start = new Date(b.start.replace(' ', 'T'));
    const end   = new Date(b.end.replace(' ', 'T'));
    return now >= start && now <= end;
  }) ?? null;
}

async function main() {
  console.log('Fetching banner data from paimon.moe GitHub…');

  let banners;
  try {
    const code = await fetchBannersJs();
    banners = parseBannersJs(code);
    console.log('  Parsed banners.js OK');
  } catch (err) {
    console.warn(`  Failed to fetch/parse banners.js: ${err.message}`);
    console.warn('  Keeping existing banners-current.json.');
    if (!existsSync(OUT_FILE)) {
      writeFileSync(OUT_FILE, JSON.stringify({ fetchedAt: null, banners: {} }, null, 2), 'utf8');
    }
    return;
  }

  // ── Character banner ──────────────────────────────────────────────────────
  const charBanner = findCurrentBanner(banners.characters);
  let characterData = null;

  if (charBanner) {
    const slugs = charBanner.featured ?? [];
    const primary   = slugs[0] ?? null;
    const secondary = slugs[1] ?? null;

    console.log(`  Resolving portraits for: ${[primary, secondary].filter(Boolean).join(', ')}…`);
    const [featuredPortrait, featured2Portrait] = await Promise.all([
      resolvePortrait(primary),
      resolvePortrait(secondary),
    ]);

    characterData = {
      featured:          primary ? slugToName(primary) : null,
      featuredSlug:      primary,
      featuredPortrait,
      featured2:         secondary ? slugToName(secondary) : null,
      featured2Slug:     secondary,
      featured2Portrait,
      bannerName:        charBanner.name ?? null,
      endDate:           toISODate(charBanner.end),
      startDate:         toISODate(charBanner.start),
      version:           charBanner.version ?? null,
    };

    console.log(`  → Character: ${characterData.featured ?? '?'}${secondary ? ` + ${characterData.featured2}` : ''} (until ${characterData.endDate})`);
    console.log(`  → Portraits: ${featuredPortrait ? '✓' : '✗'} / ${featured2Portrait ? '✓' : '✗'}`);
  } else {
    console.warn('  No active character banner found — patch schedule may be missing in paimon.moe data');
  }

  // ── Weapon banner ─────────────────────────────────────────────────────────
  const weaponBanner = findCurrentBanner(
    (banners.weapons ?? []).filter((b) => !b.end?.startsWith('2200'))
  );
  let weaponData = null;

  if (weaponBanner) {
    const slugs = weaponBanner.featured ?? [];
    weaponData = {
      featuredWeapons:     slugs.slice(0, 2).map(slugToName),
      featuredWeaponSlugs: slugs.slice(0, 2),
      endDate:   toISODate(weaponBanner.end),
      startDate: toISODate(weaponBanner.start),
      version:   weaponBanner.version ?? null,
    };
    console.log(`  → Weapon: ${weaponData.featuredWeapons.join(' + ') || '?'} (until ${weaponData.endDate})`);
  }

  // ── Chronicled banner ─────────────────────────────────────────────────────
  const chronicledBanner = findCurrentBanner(banners.chronicled ?? []);
  let chronicledData = null;

  if (chronicledBanner) {
    const slugs = chronicledBanner.featured ?? [];
    const primary = slugs[0] ?? null;
    const featuredPortrait = await resolvePortrait(primary);
    chronicledData = {
      featured:        primary ? slugToName(primary) : null,
      featuredSlug:    primary,
      featuredPortrait,
      bannerName:      chronicledBanner.name ?? null,
      endDate:         toISODate(chronicledBanner.end),
      startDate:       toISODate(chronicledBanner.start),
      version:         chronicledBanner.version ?? null,
    };
    console.log(`  → Chronicled: ${chronicledData.featured ?? '?'} (until ${chronicledData.endDate})`);
  }

  const result = {
    fetchedAt: new Date().toISOString(),
    source: 'paimon.moe',
    banners: {
      character:  characterData,
      weapon:     weaponData,
      chronicled: chronicledData,
      standard:   null,
    },
  };

  writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Wrote ${OUT_FILE}`);

  // ── History file (all phases, for BannerHistory timestamp-matching) ───────
  function processAllCharPhases(list) {
    return (list ?? [])
      .filter((b) => b.start && b.end && !b.end.startsWith('2200'))
      .map((b) => {
        const slugs = b.featured ?? [];
        const p1 = slugs[0] ?? null;
        const p2 = slugs[1] ?? null;
        return {
          startMs: new Date(b.start.replace(' ', 'T')).getTime(),
          endMs:   new Date(b.end.replace(' ', 'T')).getTime(),
          featured:          p1 ? slugToName(p1) : null,
          featuredSlug:      p1,
          featuredPortrait:  p1 ? `${ENKA_BASE}/UI_AvatarIcon_${slugToEnkaName(p1)}.png` : null,
          featured2:         p2 ? slugToName(p2) : null,
          featured2Slug:     p2,
          featured2Portrait: p2 ? `${ENKA_BASE}/UI_AvatarIcon_${slugToEnkaName(p2)}.png` : null,
          version:    b.version ?? null,
          bannerName: b.name   ?? null,
        };
      });
  }

  function processAllWeaponPhases(list) {
    return (list ?? [])
      .filter((b) => b.start && b.end && !b.end.startsWith('2200'))
      .map((b) => {
        const slugs = b.featured ?? [];
        const w1 = slugs[0] ?? null;
        const w2 = slugs[1] ?? null;
        return {
          startMs: new Date(b.start.replace(' ', 'T')).getTime(),
          endMs:   new Date(b.end.replace(' ', 'T')).getTime(),
          featured:      w1 ? slugToName(w1) : null,
          featuredSlug:  w1,
          featured2:     w2 ? slugToName(w2) : null,
          featured2Slug: w2,
          version:    b.version ?? null,
          bannerName: b.name   ?? null,
        };
      });
  }

  const history = {
    fetchedAt: new Date().toISOString(),
    character:  processAllCharPhases(banners.characters),
    weapon:     processAllWeaponPhases(banners.weapons),
    chronicled: processAllCharPhases(banners.chronicled ?? []),
  };
  writeFileSync(HIST_FILE, JSON.stringify(history, null, 2), 'utf8');
  console.log(`Wrote ${HIST_FILE} (${history.character.length} char + ${history.weapon.length} weapon + ${history.chronicled.length} chronicled phases)`);
}

main().catch((err) => {
  console.error('fetch-banners.mjs error:', err);
  process.exit(0); // Don't fail the build
});
