#!/usr/bin/env node
/**
 * Generates banners-current.json from the manually-maintained banner schedule.
 * Runs in GitHub Actions before the Vite build.
 *
 * HOW TO UPDATE (each patch, ~every 3 weeks):
 *   1. Edit BANNER_SCHEDULE below with the new patch's banner info
 *   2. Commit and push — GitHub Actions will deploy the update automatically
 *
 * Why not auto-fetch from HoYoverse?
 *   HoYoverse's announcement API only returns permanent system notices for
 *   unauthenticated requests. Banner event data requires a user authkey (expires
 *   every 24h). The app handles that via the Sync modal + Cloudflare Worker.
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '../../public/banners-current.json');

// ──────────────────────────────────────────────────────────────────────────────
// PATCH SCHEDULE — update this each patch
// Dates are in ISO format (UTC+8 → UTC), banners last 3 weeks per phase.
// ──────────────────────────────────────────────────────────────────────────────
const BANNER_SCHEDULE = [
  // Patch 5.7 — Phase 1
  {
    startDate: '2025-05-28',
    endDate:   '2025-06-17',
    character: { featured: 'Mavuika',     phase: 1, version: '5.7' },
    weapon:    { phase: 1, version: '5.7' },
  },
  // Patch 5.7 — Phase 2
  {
    startDate: '2025-06-17',
    endDate:   '2025-07-09',
    character: { featured: 'Citlali',     phase: 2, version: '5.7' },
    weapon:    { phase: 2, version: '5.7' },
  },
  // Patch 6.0 — Phase 1
  {
    startDate: '2025-07-09',
    endDate:   '2025-07-30',
    character: { featured: 'Unknown',     phase: 1, version: '6.0' },
    weapon:    { phase: 1, version: '6.0' },
  },
  // Patch 6.0 — Phase 2
  {
    startDate: '2025-07-30',
    endDate:   '2025-08-20',
    character: { featured: 'Unknown',     phase: 2, version: '6.0' },
    weapon:    { phase: 2, version: '6.0' },
  },
  // Patch 6.1 — Phase 1
  {
    startDate: '2025-08-20',
    endDate:   '2025-09-10',
    character: { featured: 'Unknown',     phase: 1, version: '6.1' },
    weapon:    { phase: 1, version: '6.1' },
  },
  // Patch 6.1 — Phase 2
  {
    startDate: '2025-09-10',
    endDate:   '2025-10-01',
    character: { featured: 'Unknown',     phase: 2, version: '6.1' },
    weapon:    { phase: 2, version: '6.1' },
  },
  // Patch 6.2 — Phase 1
  {
    startDate: '2025-10-01',
    endDate:   '2025-10-22',
    character: { featured: 'Unknown',     phase: 1, version: '6.2' },
    weapon:    { phase: 1, version: '6.2' },
  },
  // Patch 6.2 — Phase 2
  {
    startDate: '2025-10-22',
    endDate:   '2025-11-12',
    character: { featured: 'Unknown',     phase: 2, version: '6.2' },
    weapon:    { phase: 2, version: '6.2' },
  },
  // Patch 6.3 — Phase 1
  {
    startDate: '2025-11-12',
    endDate:   '2025-12-03',
    character: { featured: 'Unknown',     phase: 1, version: '6.3' },
    weapon:    { phase: 1, version: '6.3' },
  },
  // Patch 6.3 — Phase 2
  {
    startDate: '2025-12-03',
    endDate:   '2025-12-24',
    character: { featured: 'Unknown',     phase: 2, version: '6.3' },
    weapon:    { phase: 2, version: '6.3' },
  },
  // Patch 6.4 — Phase 1
  {
    startDate: '2025-12-24',
    endDate:   '2026-01-14',
    character: { featured: 'Unknown',     phase: 1, version: '6.4' },
    weapon:    { phase: 1, version: '6.4' },
  },
  // Patch 6.4 — Phase 2
  {
    startDate: '2026-01-14',
    endDate:   '2026-02-04',
    character: { featured: 'Unknown',     phase: 2, version: '6.4' },
    weapon:    { phase: 2, version: '6.4' },
  },
  // Patch 6.5 — Phase 1
  {
    startDate: '2026-02-04',
    endDate:   '2026-02-25',
    character: { featured: 'Unknown',     phase: 1, version: '6.5' },
    weapon:    { phase: 1, version: '6.5' },
  },
  // Patch 6.5 — Phase 2
  {
    startDate: '2026-02-25',
    endDate:   '2026-03-18',
    character: { featured: 'Unknown',     phase: 2, version: '6.5' },
    weapon:    { phase: 2, version: '6.5' },
  },
  // Patch 6.6 — Phase 1
  {
    startDate: '2026-03-18',
    endDate:   '2026-04-08',
    character: { featured: 'Unknown',     phase: 1, version: '6.6' },
    weapon:    { phase: 1, version: '6.6' },
  },
  // Patch 6.6 — Phase 2
  {
    startDate: '2026-04-08',
    endDate:   '2026-04-29',
    character: { featured: 'Unknown',     phase: 2, version: '6.6' },
    weapon:    { phase: 2, version: '6.6' },
  },
  // Patch 6.7 — Phase 1
  {
    startDate: '2026-04-29',
    endDate:   '2026-05-20',
    character: { featured: 'Unknown',     phase: 1, version: '6.7' },
    weapon:    { phase: 1, version: '6.7' },
  },
  // Patch 6.7 — Phase 2
  {
    startDate: '2026-05-20',
    endDate:   '2026-06-10',
    character: { featured: 'Unknown',     phase: 2, version: '6.7' },
    weapon:    { phase: 2, version: '6.7' },
  },
  // Patch 6.8 — Phase 1
  {
    startDate: '2026-06-10',
    endDate:   '2026-07-01',
    character: { featured: 'Unknown',     phase: 1, version: '6.8' },
    weapon:    { phase: 1, version: '6.8' },
  },
  // Patch 6.8 — Phase 2
  {
    startDate: '2026-07-01',
    endDate:   '2026-07-22',
    character: { featured: 'Unknown',     phase: 2, version: '6.8' },
    weapon:    { phase: 2, version: '6.8' },
  },
];

function getCurrentPhase() {
  const now = new Date();
  for (const phase of BANNER_SCHEDULE) {
    const start = new Date(phase.startDate + 'T11:00:00Z'); // 18:00 CST = 10:00 UTC
    const end   = new Date(phase.endDate   + 'T10:59:59Z');
    if (now >= start && now <= end) return phase;
  }
  // Fallback: find the next upcoming phase
  const upcoming = BANNER_SCHEDULE.filter(p => new Date(p.startDate + 'T11:00:00Z') > now);
  return upcoming.length ? upcoming[0] : null;
}

function main() {
  const phase = getCurrentPhase();

  if (!phase) {
    console.warn('No matching phase in BANNER_SCHEDULE — update the schedule!');
    writeFileSync(OUT_FILE, JSON.stringify({ fetchedAt: null, banners: {} }, null, 2), 'utf8');
    return;
  }

  const banners = {
    character: {
      featured: phase.character.featured === 'Unknown' ? null : phase.character.featured,
      endDate:  phase.endDate,
      startDate: phase.startDate,
      version:  phase.character.version,
      phase:    phase.character.phase,
    },
    weapon: {
      featuredWeapons: ['', ''],
      endDate:  phase.endDate,
      startDate: phase.startDate,
      version:  phase.weapon.version,
      phase:    phase.weapon.phase,
    },
  };

  if (banners.character.featured) {
    console.log(`Current banner: ${banners.character.featured} (v${phase.character.version} phase ${phase.character.phase}) until ${phase.endDate}`);
  } else {
    console.log(`Current phase: v${phase.character.version} phase ${phase.character.phase} until ${phase.endDate} — featured character TBD`);
  }

  writeFileSync(OUT_FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), banners }, null, 2), 'utf8');
  console.log(`Wrote ${OUT_FILE}`);
}

main();
