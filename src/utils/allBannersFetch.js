/**
 * Fetches and merges all character banner phases into a single sorted timeline:
 *   - banners-history.json  — all official phases (past + present + officially upcoming)
 *   - banners-upcoming.json — manually curated leaks
 *
 * Returns an array sorted newest-first (future at top, oldest past at bottom).
 * Each entry: { startMs, endMs, featured, featuredPortrait, featured2, featured2Portrait,
 *               version, phase, bannerName, status, confidence, source }
 */

const BASE = import.meta.env.BASE_URL ?? '/wish-counter/';

let _cache    = null;
let _promise  = null;

export function bustAllBannersCache() { _cache = null; _promise = null; }

let _weapCache   = null;
let _weapPromise = null;
export function bustWeaponBannersCache() { _weapCache = null; _weapPromise = null; }

export async function getAllWeaponBanners() {
  if (_weapCache) return _weapCache;
  if (_weapPromise) return _weapPromise;

  _weapPromise = fetch(`${BASE}banners-history.json`, { signal: AbortSignal.timeout(8000) })
    .then((r) => r.ok ? r.json() : null)
    .catch(() => null)
    .then((hist) => {
      const nowMs = Date.now();
      const raw = hist?.weapon ?? [];

      // Assign phase numbers by version (same logic as character banners)
      const byVersion = {};
      for (const b of raw) {
        const v = b.version ?? 'unknown';
        (byVersion[v] ??= []).push(b);
      }
      for (const group of Object.values(byVersion)) {
        group.sort((a, b) => a.startMs - b.startMs);
        group.forEach((e, i) => { e.phase = i + 1; });
      }

      const entries = raw.map((b) => ({
        ...b,
        status: b.endMs < nowMs ? 'past' : b.startMs > nowMs ? 'upcoming' : 'current',
      }));
      entries.sort((a, b) => (b.startMs ?? 0) - (a.startMs ?? 0));
      _weapCache = entries;
      return entries;
    })
    .finally(() => { _weapPromise = null; });

  return _weapPromise;
}

export async function getAllCharBanners() {
  if (_cache) return _cache;
  if (_promise) return _promise;

  // Timestamp cache-buster uniquement sur banners-upcoming.json (édité en live).
  // banners-history.json est stable (mis à jour par GitHub Actions une fois par jour).
  const t = Date.now();

  _promise = Promise.allSettled([
    fetch(`${BASE}banners-history.json`, { signal: AbortSignal.timeout(8000) })
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null),
    fetch(`${BASE}banners-upcoming.json?t=${t}`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
      .then((r) => r.ok ? r.json() : [])
      .catch(() => []),
  ])
    .then(([histResult, leakResult]) => {
      const hist  = histResult.status  === 'fulfilled' ? histResult.value  : null;
      const leaks = leakResult.status  === 'fulfilled' ? (leakResult.value ?? []) : [];
      const nowMs = Date.now();

      const entries = [];

      // Official phases from history (past + current + future if paimon.moe has them)
      for (const b of hist?.character ?? []) {
        const status = b.endMs < nowMs ? 'past'
                     : b.startMs > nowMs ? 'upcoming'
                     : 'current';
        entries.push({ ...b, status, confidence: 'officiel', source: 'paimon.moe' });
      }

      // Manual leaks — only character banners, only if not already covered
      const officialKey = (e) =>
        `${(e.version ?? '')}__${(e.featured ?? '').toLowerCase().replace(/\s/g, '')}`;
      const officialSet = new Set(entries.map(officialKey));

      for (const b of leaks) {
        if (b.bannerKey !== 'character' && b.bannerKey !== undefined) continue;
        if (b.bannerKey === 'weapon' || b.bannerKey === 'chronicled' || b.bannerKey === 'standard') continue;
        const key = `${b.version ?? ''}__${(b.featured ?? '').toLowerCase().replace(/\s/g, '')}`;
        if (officialSet.has(key)) continue;

        const startMs = b.startDate ? new Date(b.startDate + 'T00:00:00+08:00').getTime() : null;
        const endMs   = b.endDate   ? new Date(b.endDate   + 'T00:00:00+08:00').getTime() : null;

        entries.push({
          startMs,
          endMs,
          featured:           b.featured          ?? null,
          featuredSlug:       b.featuredSlug       ?? null,
          featuredPortrait:   b.featuredPortrait   ?? null,
          featured2:          b.featured2          ?? null,
          featured2Slug:      b.featured2Slug      ?? null,
          featured2Portrait:  b.featured2Portrait  ?? null,
          version:            b.version            ?? null,
          phase:              b.phase              ?? null,
          bannerName:         null,
          status:             'leak',
          confidence:         b.confidence ?? 'leak',
          source:             b.source     ?? null,
        });
      }

      // Sort: future/leak first (by startMs desc), then past (newest first)
      entries.sort((a, b) => {
        const aMs = a.startMs ?? Infinity;
        const bMs = b.startMs ?? Infinity;
        return bMs - aMs;
      });

      _cache = entries;
      return entries;
    })
    .finally(() => { _promise = null; });

  return _promise;
}
