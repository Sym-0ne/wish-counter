#!/usr/bin/env node
/**
 * Fetches current Genshin Impact banner data from paimon.moe's public GitHub data.
 * Runs in GitHub Actions before the Vite build.
 * Writes to public/banners-current.json — the app reads this at runtime.
 *
 * Data source: github.com/MadeBaruna/paimon-moe (src/data/banners.js)
 * Updated by the paimon.moe community each patch.
 *
 * Portrait images: genshin.jmp.blue/characters/{slug}/portrait
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createContext, Script } from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '../../public/banners-current.json');

const BANNERS_JS_URL =
  'https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/src/data/banners.js';
const PORTRAIT_BASE = 'https://genshin.jmp.blue/characters';

// Convert a paimon.moe character slug to a display name
// 'hu-tao' → 'Hu Tao', 'arataki-itto' → 'Arataki Itto'
function slugToName(slug) {
  return slug
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function portraitUrl(slug) {
  return `${PORTRAIT_BASE}/${slug}/portrait`;
}

function cardUrl(slug) {
  return `${PORTRAIT_BASE}/${slug}/card`;
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
  // The file uses "export const banners = {...};" — strip the export to make it vm-runnable
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

    characterData = {
      featured:        primary ? slugToName(primary) : null,
      featuredSlug:    primary,
      featuredPortrait: primary ? portraitUrl(primary) : null,
      featuredCard:    primary ? cardUrl(primary) : null,
      featured2:       secondary ? slugToName(secondary) : null,
      featured2Slug:   secondary,
      featured2Portrait: secondary ? portraitUrl(secondary) : null,
      featured2Card:   secondary ? cardUrl(secondary) : null,
      bannerName:      charBanner.name ?? null,
      endDate:         toISODate(charBanner.end),
      startDate:       toISODate(charBanner.start),
      version:         charBanner.version ?? null,
    };

    console.log(`  → Character: ${characterData.featured ?? '?'}${secondary ? ` + ${characterData.featured2}` : ''} (until ${characterData.endDate})`);
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
      featuredWeapons: slugs.slice(0, 2).map(slugToName),
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
    chronicledData = {
      featured:        primary ? slugToName(primary) : null,
      featuredSlug:    primary,
      featuredPortrait: primary ? portraitUrl(primary) : null,
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
}

main().catch((err) => {
  console.error('fetch-banners.mjs error:', err);
  process.exit(0); // Don't fail the build
});
