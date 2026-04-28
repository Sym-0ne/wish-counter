// Calcul de probabilité d'obtenir le 5★ ciblé en N tirages.
// Approche : simulation Monte Carlo (2000 itérations).
// Plus précis qu'une formule fermée vu la combinaison soft-pity + 50/50 + Fate Points.

import { BANNER_CONFIG } from './banners';
import { fiveStarRate } from './pityRules';

const FIFTY_FIFTY_RATE = 0.55; // 50/50 effectif avec Capturing Radiance
const WEAPON_TARGETED_RATE = 0.375; // 75% featured × 50% targeted = 37.5%

export function simulateBannerPulls({
  bannerKey,
  pity5,
  isGuaranteed,
  fatePoints,
  totalPulls,
}, sims = 2000) {
  if (totalPulls <= 0) return 0;
  const cfg = BANNER_CONFIG[bannerKey];
  if (!cfg) return 0;

  let successes = 0;

  for (let s = 0; s < sims; s++) {
    let p = pity5;
    let ig = isGuaranteed;
    let fp = fatePoints;
    let got = false;

    for (let i = 0; i < totalPulls; i++) {
      const rate = fiveStarRate(p, bannerKey);
      p += 1;

      if (Math.random() < rate) {
        // 5★ obtenu
        p = 0;

        if (cfg.has5050) {
          if (ig) {
            got = true;
            break;
          }
          if (Math.random() < FIFTY_FIFTY_RATE) {
            got = true;
            break;
          }
          ig = true;
        } else if (cfg.hasFatePoints) {
          if (fp >= 2) {
            got = true;
            break;
          }
          if (Math.random() < WEAPON_TARGETED_RATE) {
            got = true;
            break;
          }
          fp = Math.min(2, fp + 1);
        } else {
          // Standard banner : on considère que tout 5★ compte comme succès
          got = true;
          break;
        }
      }
    }

    if (got) successes++;
  }

  return successes / sims;
}

/**
 * Espérance du nombre de pulls jusqu'au prochain 5★ (peu importe featured).
 * Utile pour afficher "X pulls en moyenne avant le prochain 5★".
 */
export function expectedPullsToFiveStar({ pity5, bannerKey }, sims = 2000) {
  let totalPulls = 0;
  for (let s = 0; s < sims; s++) {
    let p = pity5;
    let pulls = 0;
    while (true) {
      const rate = fiveStarRate(p, bannerKey);
      p += 1;
      pulls += 1;
      if (Math.random() < rate) break;
      if (pulls > 200) break; // safety
    }
    totalPulls += pulls;
  }
  return Math.round(totalPulls / sims);
}
