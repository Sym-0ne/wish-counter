import { PRIMO_PER_WISH } from './banners';

// Primos/jour estimés par source (valeurs moyennes).
export const INCOME_SOURCES = {
  commissions: { label: 'Commissions quotidiennes', primosPerDay: 60 },
  welkin: { label: 'Bénédiction de Welkin', primosPerDay: 90 },
  bp: { label: 'Battle Pass (Gnostic Hymn)', primosPerDay: 22 },
  abyss: { label: 'Abîme spiral', primosPerDay: 43 },
  theater: { label: 'Théâtre Imaginarium', primosPerDay: 43 },
};

export function computeDailyPrimos(income) {
  let total = 0;
  for (const [key, def] of Object.entries(INCOME_SOURCES)) {
    if (income[key]) total += def.primosPerDay;
  }
  total += income.events || 0;
  total += income.custom || 0;
  return total;
}

export function daysUntil(endDateStr) {
  if (!endDateStr) return 0;
  const end = new Date(endDateStr);
  if (isNaN(end.getTime())) return 0;
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Total wishes disponibles : (primos actuels + primos projetés d'ici endDate) / 160 + fates
 */
export function totalAvailableWishes({ resources, income, endDate, fateType = 'intertwined' }) {
  const days = daysUntil(endDate);
  const dailyPrimos = computeDailyPrimos(income);
  const projectedPrimos = (resources.primos || 0) + dailyPrimos * days;
  const fates = fateType === 'intertwined'
    ? (resources.intertwinedFates || 0)
    : (resources.acquaintFates || 0);
  return {
    days,
    dailyPrimos,
    projectedPrimos,
    fromPrimos: Math.floor(projectedPrimos / PRIMO_PER_WISH),
    fromFates: fates,
    total: Math.floor(projectedPrimos / PRIMO_PER_WISH) + fates,
  };
}
