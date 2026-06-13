#!/usr/bin/env node
/**
 * Fetches current Genshin Impact banner data from HoYoverse's announcement API.
 * Runs in GitHub Actions (server-side, no CORS) before the Vite build.
 * Writes to public/banners-current.json — the app reads this at runtime.
 *
 * Usage:
 *   node .github/scripts/fetch-banners.mjs
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '../../public/banners-current.json');

// HoYoverse global announcement API
const ANN_BASE = 'https://sg-hk4e-api.hoyoverse.com/common/hk4e_global/announcement/api';

// Try multiple regions in order — stop at the first one that returns data
const REGIONS = ['os_usa', 'os_euro', 'os_asia'];

// Keywords used to identify banner announcements in titles
const CHAR_WISH_RE = /character\s+event\s+wish/i;
const WEAPON_WISH_RE = /epitome\s+invocation/i;
const CHRON_WISH_RE = /chronicled\s+wish/i;
const STANDARD_WISH_RE = /wanderlust\s+invocation/i;

// Extract the featured character name from an announcement title.
// Matches patterns like:
//   "Character Event Wish - Hu Tao: Targeted ..."
//   "Character Event Wish-2 - Navia: Targeted ..."
function extractCharacter(title) {
  // Match "- NAME:" or "- NAME" at end
  const m = title.match(/[-–]\s+([A-Za-zÀ-ɏ][A-Za-zÀ-ɏ\s'`\-]+?)\s*(?::|$)/);
  if (!m) return null;
  return m[1].trim();
}

// Convert HoYoverse time string (UTC+8) to YYYY-MM-DD
function toDate(timeStr) {
  if (!timeStr) return null;
  // "2025-06-18 17:59:59" is UTC+8
  const dt = new Date(timeStr.replace(' ', 'T') + '+08:00');
  return dt.toISOString().slice(0, 10);
}

async function fetchAnnList(region) {
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

  // The list may be in json.data.list or json.data.pic_list
  const list = json.data?.list ?? [];
  return list.length ? list : null;
}

function parseBanners(announcements) {
  const result = {
    character: null,
    weapon: null,
    chronicled: null,
    standard: null,
  };

  let char1Found = false;

  for (const ann of announcements) {
    const title = ann.title ?? '';
    const endDate = toDate(ann.end_time);
    const startDate = toDate(ann.start_time);

    if (CHAR_WISH_RE.test(title)) {
      const featured = extractCharacter(title);
      if (!char1Found) {
        // First character banner encountered
        result.character = { featured, endDate, startDate };
        char1Found = true;
      }
      // Ignore the second character banner (gacha_type 400) — app merges them
    } else if (WEAPON_WISH_RE.test(title)) {
      if (!result.weapon) {
        result.weapon = { featuredWeapons: ['', ''], endDate, startDate };
      }
    } else if (CHRON_WISH_RE.test(title)) {
      if (!result.chronicled) {
        const featured = extractCharacter(title);
        result.chronicled = { featured, endDate, startDate };
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
      announcements = await fetchAnnList(region);
      if (announcements) {
        console.log(`  Got ${announcements.length} announcements from ${region}`);
        break;
      }
    } catch (err) {
      console.warn(`  Region ${region} failed: ${err.message}`);
    }
  }

  if (!announcements) {
    console.warn('All regions returned no data. Keeping existing banners-current.json.');
    if (!existsSync(OUT_FILE)) {
      // Create an empty fallback so the app doesn't 404
      writeFileSync(OUT_FILE, JSON.stringify({ fetchedAt: null, banners: {} }, null, 2), 'utf8');
    }
    return;
  }

  const banners = parseBanners(announcements);

  // Log what we found
  if (banners.character?.featured) {
    console.log(`  Character: ${banners.character.featured} (until ${banners.character.endDate})`);
  } else {
    console.log('  Character: not found');
  }
  if (banners.weapon) {
    console.log(`  Weapon banner: until ${banners.weapon.endDate}`);
  }
  if (banners.chronicled?.featured) {
    console.log(`  Chronicled: ${banners.chronicled.featured} (until ${banners.chronicled.endDate})`);
  }

  const output = {
    fetchedAt: new Date().toISOString(),
    banners,
  };

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((err) => {
  console.error('fetch-banners.mjs error:', err);
  process.exit(0); // Don't fail the build if banner fetch fails
});
