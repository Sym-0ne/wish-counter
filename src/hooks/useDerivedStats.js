import { useMemo } from 'react';
import { calculateLuckScore, compute5050Streak, bannerStats } from '../utils/luckScore';
import { BANNER_KEYS } from '../utils/banners';

/**
 * Dérive la collection (constellations / refinements) depuis l'union des histories.
 * Ne stocke rien : recomputed à chaque changement.
 */
export function useCollection(banners) {
  return useMemo(() => {
    const characters = {};
    const weapons = {};
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
    return { characters, weapons };
  }, [banners]);
}

export function useLuckScore(banners) {
  return useMemo(() => calculateLuckScore(banners), [banners]);
}

export function useStreak(banners) {
  return useMemo(() => compute5050Streak(banners), [banners]);
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
