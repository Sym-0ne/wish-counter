/**
 * Fetches current active banner info via the HoYoverse gacha info API.
 * Uses the authkey already stored for wish sync.
 * Proxied through the user's Cloudflare Worker (same as wish sync).
 */
import { normalizeAuthkeyUrl } from './wishSync';

const GACHA_TYPE_MAP = {
  '301': 'character',
  '400': 'character',
  '302': 'weapon',
  '200': 'standard',
  '500': 'chronicled',
};

function extractCharacter(name) {
  // "Character Event Wish - Hu Tao: Targeted..." or "— Hu Tao : ..." (FR em-dash)
  const m = (name || '').match(/[-–—]\s*([A-Za-zÀ-ɏ][A-Za-zÀ-ɏ\s'`\-]{1,24}?)\s*(?::|$)/);
  return m ? m[1].trim() : null;
}

function toDate(timeStr) {
  if (!timeStr) return null;
  // HoYoverse times are UTC+8
  const dt = new Date(timeStr.replace(' ', 'T') + '+08:00');
  return dt.toISOString().slice(0, 10);
}

/**
 * Calls getGachaInfoList using the authkey from the user's wish-sync URL.
 * Returns a map of { character, weapon, standard, chronicled } → { featured, endDate, startDate }
 *
 * @param {string} workerUrl  Cloudflare Worker proxy URL
 * @param {string} authkeyUrl Full wish-history URL (with authkey params)
 */
export async function fetchBannerInfoFromAuth(workerUrl, authkeyUrl) {
  // Normalize: accepts both the wish-history page URL and the API URL directly
  const url = new URL(normalizeAuthkeyUrl(authkeyUrl));

  // Replace getGachaLog with getGachaInfoList, keep the auth params
  const infoUrl = new URL(url.toString());
  infoUrl.pathname = infoUrl.pathname.replace(/getGachaLog$/, 'getGachaInfoList');
  infoUrl.searchParams.delete('gacha_type');
  infoUrl.searchParams.delete('page');
  infoUrl.searchParams.delete('size');
  infoUrl.searchParams.delete('end_id');

  const proxyUrl = `${workerUrl.replace(/\/$/, '')}?url=${encodeURIComponent(infoUrl.toString())}`;

  const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
  if (!resp.ok) throw new Error(`Worker HTTP ${resp.status}`);

  const json = await resp.json();
  if (json.retcode !== 0) throw new Error(`API ${json.retcode}: ${json.message}`);

  const result = {};
  let charFound = false;

  for (const item of json.data?.list ?? []) {
    const bannerKey = GACHA_TYPE_MAP[item.gacha_type];
    if (!bannerKey) continue;
    if (bannerKey === 'character' && charFound) continue; // skip 2nd char banner duplicate
    if (bannerKey === 'character') charFound = true;

    const endDate = toDate(item.end_time);
    const startDate = toDate(item.begin_time);

    if (bannerKey === 'weapon') {
      result.weapon = { featuredWeapons: ['', ''], endDate, startDate };
    } else {
      result[bannerKey] = { featured: extractCharacter(item.name), endDate, startDate };
    }
  }

  return result;
}
