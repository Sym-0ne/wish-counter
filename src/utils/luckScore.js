// Score de luck par bannière et streaks de 50/50.

import { fiveStarRate } from './pityRules';

/**
 * Probabilité qu'une tentative aléatoire ait besoin de PLUS de `pity` tirages que toi
 * pour obtenir un 5★ — c'est-à-dire le percentile de chance de ce tirage précis.
 * Calculée comme la probabilité de survie (aucun 5★) sur les `pity` premiers tirages,
 * en utilisant le vrai taux soft/hard pity de la bannière concernée.
 * 1 (100%) = tu as eu un coup de chance extrême, 0 (0%) = pity dur (le pire cas possible).
 */
function luckPercentile(pity, bannerKey) {
  let survival = 1;
  for (let i = 0; i < pity; i++) {
    survival *= 1 - fiveStarRate(i, bannerKey);
  }
  return survival;
}

/**
 * Deux scores de luck 0-100 PAR BANNIÈRE (jamais mélangés — perso/arme/standard/
 * chroniques ont chacun leur propre pity et leur propre pool 50/50) :
 *  - pityScore : percentile moyen de chance sur les 5★ de CETTE bannière, basé sur
 *    son propre modèle soft/hard pity (différent entre perso et arme par exemple)
 *  - winScore  : taux de wins 50/50 de cette bannière (null si non applicable ou
 *    aucun 50/50 enregistré — uniquement character/chronicled)
 *
 * Retourne { character: {pityScore, winScore}, weapon: {...}, standard: {...}, chronicled: {...} }
 */
export function calculateLuckScores(banners) {
  const result = {};

  for (const [key, banner] of Object.entries(banners)) {
    let isGuaranteed = banner.pityBaseline?.isGuaranteed ?? false;
    let pity5 = banner.pityBaseline?.pity5 ?? 0;
    const percentiles = [];
    let wins = 0;
    let losses = 0;

    for (const wish of banner.history) {
      pity5 += 1;
      if (wish.rank === 5) {
        percentiles.push(luckPercentile(pity5, key));
        pity5 = 0;

        // Le 50/50 ne compte que sur character/chronicled, et pas quand
        // c'est une garantie forcée (issue d'une loss précédente).
        if (key === 'character' || key === 'chronicled') {
          if (isGuaranteed) {
            isGuaranteed = false; // garantie consommée, ne compte pas
          } else if (wish.featured) {
            wins += 1;
          } else {
            losses += 1;
            isGuaranteed = true;
          }
        }
      }
    }

    const pityScore = percentiles.length > 0
      ? Math.round((percentiles.reduce((a, b) => a + b, 0) / percentiles.length) * 100)
      : null;
    const total = wins + losses;
    const winScore = total > 0 ? Math.round((wins / total) * 100) : null;

    result[key] = { pityScore, winScore };
  }

  return result;
}

/**
 * Streak 50/50 actif PAR BANNIÈRE : combien de wins/losses consécutifs au plus récent.
 * Character et chronicled ont des pools 50/50 mécaniquement séparés en jeu — jamais
 * mélangés ici. Retourne { character: {type, count}, chronicled: {type, count} }.
 */
export function compute5050Streaks(banners) {
  const result = {};

  for (const key of ['character', 'chronicled']) {
    const banner = banners[key];
    let isGuaranteed = banner?.pityBaseline?.isGuaranteed ?? false;
    const wins = [];

    for (const wish of banner?.history ?? []) {
      if (wish.rank === 5) {
        if (isGuaranteed) {
          // garantie consommée, n'apparaît pas dans la séquence 50/50
          isGuaranteed = false;
          continue;
        }
        if (wish.featured) {
          wins.push(true);
        } else {
          wins.push(false);
          isGuaranteed = true;
        }
      }
    }

    if (wins.length === 0) {
      result[key] = { type: 'none', count: 0 };
      continue;
    }

    const last = wins[wins.length - 1];
    let streak = 1;
    for (let i = wins.length - 2; i >= 0; i--) {
      if (wins[i] === last) streak += 1;
      else break;
    }
    result[key] = { type: last ? 'wins' : 'losses', count: streak };
  }

  return result;
}

/**
 * Stats par bannière pour le panneau Stats.
 */
export function bannerStats(banner, bannerKey) {
  let pity5 = banner.pityBaseline?.pity5 ?? 0;
  const fiveStarPities = [];
  let wins = 0;
  let losses = 0;
  let isGuaranteed = banner.pityBaseline?.isGuaranteed ?? false;

  for (const wish of banner.history) {
    pity5 += 1;
    if (wish.rank === 5) {
      fiveStarPities.push(pity5);
      pity5 = 0;
      if (bannerKey === 'character' || bannerKey === 'chronicled') {
        if (isGuaranteed) {
          isGuaranteed = false;
        } else if (wish.featured) {
          wins += 1;
        } else {
          losses += 1;
          isGuaranteed = true;
        }
      }
    }
  }

  const total = banner.history.length;
  const avg = fiveStarPities.length > 0
    ? fiveStarPities.reduce((a, b) => a + b, 0) / fiveStarPities.length
    : null;
  const best = fiveStarPities.length > 0 ? Math.min(...fiveStarPities) : null;
  const worst = fiveStarPities.length > 0 ? Math.max(...fiveStarPities) : null;
  const total5050 = wins + losses;
  const winRate = total5050 > 0 ? (wins / total5050) * 100 : null;

  return {
    totalWishes: total,
    fiveStarCount: fiveStarPities.length,
    avgPity: avg,
    bestPity: best,
    worstPity: worst,
    winRate,
    wins,
    losses,
    fiveStarPities,
  };
}
