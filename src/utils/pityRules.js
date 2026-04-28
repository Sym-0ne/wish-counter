// Règles de pity et fonctions de calcul.
// Chaque règle non-intuitive est commentée.

import { BANNER_CONFIG, HARD_PITY_4 } from './banners';

// Taux de base : 0.6% pour un 5★ avant soft pity, 5.1% pour un 4★
const BASE_5_RATE = 0.006;
const BASE_4_RATE = 0.051;

/**
 * Probabilité d'obtenir un 5★ à un pity donné.
 * Soft pity : ramp linéaire entre softPity5 et hardPity5.
 * À hardPity5 - 1 (89e pull pour char, 79e pour arme), proba ≈ 100%.
 */
export function fiveStarRate(pity, bannerKey) {
  const cfg = BANNER_CONFIG[bannerKey];
  if (!cfg) return BASE_5_RATE;
  // Le pity représente le nombre de pulls SANS 5★. Au pity courant,
  // le prochain pull est le (pity + 1)e tirage sans 5★.
  const nextPullPity = pity + 1;

  if (nextPullPity >= cfg.hardPity5) return 1;
  if (nextPullPity < cfg.softPity5) return BASE_5_RATE;

  // Ramp linéaire entre softPity et hardPity
  const progress = (nextPullPity - cfg.softPity5 + 1) / (cfg.hardPity5 - cfg.softPity5 + 1);
  return Math.min(1, BASE_5_RATE + progress * (1 - BASE_5_RATE));
}

/**
 * Probabilité d'obtenir un 4★ ou plus à un pity4 donné.
 * Hard pity à 10 (10e tirage sans 4★/5★ garantit un 4★).
 */
export function fourStarRate(pity4) {
  const nextPull = pity4 + 1;
  if (nextPull >= HARD_PITY_4) return 1;
  // Léger soft pity au 9e pull
  if (nextPull === HARD_PITY_4 - 1) return 0.51;
  return BASE_4_RATE;
}

/**
 * Couleur de la barre pity5 : passe en orange dès l'entrée en soft pity.
 */
export function pityBarColor(pity, bannerKey) {
  const cfg = BANNER_CONFIG[bannerKey];
  if (!cfg) return 'var(--gold)';
  const nextPull = pity + 1;
  if (nextPull >= cfg.softPity5) return 'var(--soft-pity)';
  return 'var(--gold)';
}

/**
 * Reconstitue les compteurs (pity4, pity5, isGuaranteed, fatePoints)
 * et tagge chaque tirage avec son `pityAt` à partir de l'historique complet.
 *
 * Règle CRITIQUE : pity4 et pity5 sont indépendants.
 *  - pity4 ne reset QUE sur un 4★ (jamais sur un 5★)
 *  - pity5 ne reset QUE sur un 5★
 *
 * Cette fonction est utilisée à chaque mutation et lors d'un undo.
 */
export function processHistory(history, bannerKey) {
  let pity4 = 0;
  let pity5 = 0;
  let isGuaranteed = false;
  let fatePoints = 0;
  const cfg = BANNER_CONFIG[bannerKey];
  const tagged = [];

  for (const wish of history) {
    pity4 += 1;
    pity5 += 1;
    let pityAt = null;

    if (wish.rank === 4) {
      pityAt = pity4;
      pity4 = 0;
      // pity5 continue de monter, n'est PAS resetté ici.
    } else if (wish.rank === 5) {
      pityAt = pity5;
      pity5 = 0;
      // pity4 continue de monter (règle indépendance).

      // Logique 50/50 (character/chronicled)
      if (cfg.has5050) {
        if (isGuaranteed) {
          // Précédente perte de 50/50 → ce 5★ est forcément featured.
          // On consomme la garantie, ça ne compte ni en win ni en loss.
          isGuaranteed = false;
        } else if (wish.featured) {
          // 50/50 gagné, garantie reste à false.
          isGuaranteed = false;
        } else {
          // 50/50 perdu, prochain 5★ garanti featured.
          isGuaranteed = true;
        }
      }

      // Logique Fate Points (weapon)
      if (cfg.hasFatePoints) {
        if (wish.featured) {
          // Arme ciblée obtenue → reset à 0
          fatePoints = 0;
        } else {
          // Arme non-ciblée (autre featured ou off-banner) → +1 FP, plafond 2
          fatePoints = Math.min(2, fatePoints + 1);
        }
      }
    }

    tagged.push({ ...wish, pityAt });
  }

  return { taggedHistory: tagged, pity4, pity5, isGuaranteed, fatePoints };
}

/**
 * Helper rapide pour ne récupérer QUE les compteurs (sans retagger l'historique).
 */
export function recomputeBannerCounters(history, bannerKey) {
  const { pity4, pity5, isGuaranteed, fatePoints } = processHistory(history, bannerKey);
  return { pity4, pity5, isGuaranteed, fatePoints };
}

/**
 * Pity à laquelle un nouveau tirage de rang `rank` serait obtenu,
 * étant donné l'état actuel du banner. Utilisé pour preview.
 */
export function previewNextPity(bannerState, rank) {
  if (rank === 4) return bannerState.pity4 + 1;
  if (rank === 5) return bannerState.pity5 + 1;
  return null;
}
