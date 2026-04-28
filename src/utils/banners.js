// Configuration des 4 bannières Genshin.
// `has5050` = la bannière a un système 50/50 (perte vs win sur featured)
// `hasFatePoints` = système Epitomized Path (bannière arme uniquement)

export const BANNER_KEYS = ['character', 'weapon', 'standard', 'chronicled'];

export const BANNER_CONFIG = {
  character: {
    key: 'character',
    label: 'Personnage',
    longLabel: 'Bannière personnage limitée',
    hardPity5: 90,
    softPity5: 74,
    has5050: true,
    hasFatePoints: false,
    color: 'var(--gold)',
  },
  weapon: {
    key: 'weapon',
    label: 'Arme',
    longLabel: 'Bannière arme limitée',
    hardPity5: 80,
    softPity5: 63,
    has5050: false,
    hasFatePoints: true,
    color: 'var(--blue)',
  },
  standard: {
    key: 'standard',
    label: 'Standard',
    longLabel: 'Bannière standard',
    hardPity5: 90,
    softPity5: 74,
    has5050: false,
    hasFatePoints: false,
    color: 'var(--purple)',
  },
  chronicled: {
    key: 'chronicled',
    label: 'Chroniques',
    longLabel: 'Bannière des chroniques',
    hardPity5: 90,
    softPity5: 74,
    has5050: true,
    hasFatePoints: false,
    color: 'var(--accent)',
  },
};

// Hard pity universel pour les 4★ : 10e tirage sans 4★/5★ garantit un 4★
export const HARD_PITY_4 = 10;

// Coût en primos par tirage
export const PRIMO_PER_WISH = 160;
