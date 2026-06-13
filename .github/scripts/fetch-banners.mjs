#!/usr/bin/env node
/**
 * Fetches current Genshin Impact banner data from HoYoverse's announcement API.
 * Runs in GitHub Actions (server-side, no CORS) before the Vite build.
 * Writes to public/banners-current.json — the app reads this at runtime.
 *
 * Usage:
 *   node .github/scripts/fetch-banners.mjs
 */

import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '../../public/banners-current.json');

const ANN_BASE = 'https://sg-hk4e-api.hoyoverse.com/common/hk4e_global/announcement/api';

const REGIONS = ['os_usa', 'os_euro', 'os_asia'];

// Banner title keywords — broad enough to survive minor title changes
const CHAR_WISH_RE = /character\s+event\s+wish|event\s+wish.*(?:targeted|limited)/i;
const WEAPON_WISH_RE = /epitome\s+invocation/i;
const CHRON_WISH_RE = /chronicled\s+wish/i;
const STANDARD_WISH_RE = /wanderlust\s+invocation/i;

function extractCharacter(title) {
  // "Character Event Wish - Hu Tao: Targeted..."
  // "... - Navia: ..."
  const m = title.match(/[-–]\s+([A-Za-zÀ-ɏ][A-Za-zÀ-ɏ\s'`\-]{1,24}?)\s*(?::|$)/);
  return m ? m[1].trim() : null;
}

function toDate(timeStr) {
  if (!timeStr) return null;
  // "2025-06-18 17:59:59" is UTC+8
  const dt = new Date(timeStr.replace(' ', 'T') + '+08:00');
  return dt.toISOString().slice(0, 10);
}

async function fetchAnnData(region) {
  const params = new URLSearchParams({
    game: 'hk4e',
    game_biz: 'hk4e_global',
    lang: 'en-us',
    bundle_id: 'hk4e_global',
    platform: 'pc',
    region,
    channel_id: '0',
  });

  const url = `${ANN_BASE}/getAnnList?${params}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!resp.ok) return null;
  const json = await resp.json();
  if (json.retcode !== 0) return null;

  // data.list is an array of category groups, each with their own .list of items.
  // Flatten them. Also check pic_list.
  const groups = json.data?.list ?? [];
  const flatList = groups.flatMap((g) => g.list ?? []);
  const picList = json.data?.pic_list ?? [];
  const all = [...flatList, ...picList];
  return all.length ? all : null;
}

function parseBanners(announcements) {
  const result = { character: null, weapon: null, chronicled: null, standard: null };
  let char1Found = false;

  // Log all titles so we can debug matching
  console.log('  Announcement titles found:');
  for (const ann of announcements) {
    console.log(`    [${ann.type ?? '?'}] ${ann.title ?? '(no title)'}`);
  }

  for (const ann of announcements) {
    const title = ann.title ?? '';
    const endDate = toDate(ann.end_time);
    const startDate = toDate(ann.start_time);

    if (CHAR_WISH_RE.test(title)) {
      const featured = extractCharacter(title);
      if (!char1Found) {
        result.character = { featured, endDate, startDate };
        char1Found = true;
      }
    } else if (WEAPON_WISH_RE.test(title)) {
      if (!result.weapon) {
        result.weapon = { featuredWeapons: ['', ''], endDate, startDate };
      }
    } else if (CHRON_WISH_RE.test(title)) {
      if (!result.chronicled) {
        result.chronicled = { featured: extractCharacter(title), endDate, startDate };
      }
    } else if (STANDARD_WISH_RE.test(title)) {
      result.standard = { endDate, startDate };
    }
  }

  return result;
}

async function main() {
  console.log('Fetching current Genshin Impact banner data…');

  let announcements = null;

  for (const region of REGIONS) {
    try {
      console.log(`  Trying region: ${region}`);
      announcements = await fetchAnnData(region);
      if (announcements) {
        console.log(`  Got ${announcements.length} announcements from ${region}`);
        break;
      } else {
        console.log(`  ${region}: API returned empty lists`);
      }
    } catch (err) {
      console.warn(`  ${region} failed: ${err.message}`);
    }
  }

  if (!announcements) {
    console.warn('All regions returned no data — keeping existing banners-current.json.');
    if (!existsSync(OUT_FILE)) {
      writeFileSync(OUT_FILE, JSON.stringify({ fetchedAt: null, banners: {} }, null, 2), 'utf8');
    }
    return;
  }

  const banners = parseBanners(announcements);

  const anyFound = Object.values(banners).some(Boolean);
  if (!anyFound) {
    console.warn('No banner announcements matched. Raw titles logged above.');
    // Still write with current timestamp so we know the fetch ran
  } else {
    if (banners.character?.featured) console.log(`  → Character: ${banners.character.featured} (until ${banners.character.endDate})`);
    if (banners.weapon)             console.log(`  → Weapon: until ${banners.weapon.endDate}`);
    if (banners.chronicled?.featured) console.log(`  → Chronicled: ${banners.chronicled.featured} (until ${banners.chronicled.endDate})`);
  }

  writeFileSync(OUT_FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), banners }, null, 2), 'utf8');
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((err) => {
  console.error('fetch-banners.mjs error:', err);
  process.exit(0); // Don't fail the build
});
