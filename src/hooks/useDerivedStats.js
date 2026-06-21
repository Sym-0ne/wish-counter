import { useMemo } from 'react';
import { calculateLuckScores, compute5050Streaks, bannerStats } from '../utils/luckScore';
import { BANNER_KEYS } from '../utils/banners';

/**
 * Dérive la collection (constellations / refinements) depuis l'union des histories
 * et des entrées manuelles (manualCollection).
 * Le count manuel est additif : peut être positif (fragments event) ou négatif (correction).
 */
export function useCollection(banners, manualCollection) {
  return useMemo(() => {
    const characters = {};
    const weapons = {};

    // 1. Derive from wish history
    for (const key of BANNER_KEYS) {
      const banner = banners[key];
      if (!banner) continue;
      for (const wish of banner.history) {
        if (wish.rank < 4 || !wish.name) continue;
        const target = wish.itemType === 'weapon' ? weapons : characters;
        if (!target[wish.name]) {
          target[wish.name] = { count: 0, rank: wish.rank, firstObtained: wish.timestamp };
        }
        target[wish.name].count += 1;
      }
    }

    // 2. Merge manual entries
    const mc = manualCollection || { characters: {}, weapons: {} };
    for (const [name, data] of Object.entries(mc.characters || {})) {
      if (!characters[name]) {
        characters[name] = { count: 0, rank: data.rank, firstObtained: null, manual: true };
      }
      characters[name].count = Math.max(0, characters[name].count + data.count);
      if (data.count !== 0) characters[name].hasManualAdjust = true;
    }
    for (const [name, data] of Object.entries(mc.weapons || {})) {
      if (!weapons[name]) {
        weapons[name] = { count: 0, rank: data.rank, firstObtained: null, manual: true };
      }
      weapons[name].count = Math.max(0, weapons[name].count + data.count);
      if (data.count !== 0) weapons[name].hasManualAdjust = true;
    }

    // 3. Remove entries with count 0 (deleted)
    for (const [k, v] of Object.entries(characters)) {
      if (v.count === 0 && v.manual) delete characters[k];
    }
    for (const [k, v] of Object.entries(weapons)) {
      if (v.count === 0 && v.manual) delete weapons[k];
    }

    return { characters, weapons };
  }, [banners, manualCollection]);
}

export function useLuckScore(banners) {
  return useMemo(() => calculateLuckScores(banners), [banners]);
}

export function useStreak(banners) {
  return useMemo(() => compute5050Streaks(banners), [banners]);
}

export function useBannerStats(banner, bannerKey) {
  return useMemo(() => bannerStats(banner, bannerKey), [banner, bannerKey]);
}

/**
 * Liste de toutes les versions présentes dans les histories,
 * triées du plus récent au plus ancien.
 */
export function useVersions(banners) {
  return useMemo(() => {
    const set = new Set();
    for (const key of BANNER_KEYS) {
      for (const wish of banners[key]?.history || []) {
        if (wish.version) set.add(wish.version);
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [banners]);
}

/**
 * Liste des noms uniques déjà saisis, séparés par type (character / weapon),
 * triés par fréquence décroissante. Utilisé pour l'autocomplétion à la saisie.
 */
export function useNameSuggestions(banners) {
  return useMemo(() => {
    const charCounts = new Map();
    const weaponCounts = new Map();
    for (const key of BANNER_KEYS) {
      for (const w of banners[key]?.history || []) {
        if (w.rank < 4 || !w.name) continue;
        const map = w.itemType === 'weapon' ? weaponCounts : charCounts;
        map.set(w.name, (map.get(w.name) || 0) + 1);
      }
    }
    const sortByCount = (m) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
        .map(([name]) => name);
    return {
      character: sortByCount(charCounts),
      weapon: sortByCount(weaponCounts),
    };
  }, [banners]);
}