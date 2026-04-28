// État initial. Version courante : 6.5 'Luna VI' (sortie 8 avril 2026)

export const CURRENT_VERSION = '6.5';
export const STORAGE_KEY = 'genshin-tracker-v1';

export function createBannerState(bannerKey) {
  return {
    pity4: 0,
    pity5: 0,
    isGuaranteed: false,
    fatePoints: 0, // utilisé uniquement pour weapon
    history: [],
    metadata: {
      featured: '', // ex: "Néfer"
      featuredWeapons: ['', ''], // pour weapon banner uniquement (2 armes featured)
      endDate: '',
      phase: 1,
      version: CURRENT_VERSION,
    },
    wishlist: '', // objectif texte libre, ex: "Néfer C1"
  };
}

export const initialState = {
  version: CURRENT_VERSION,
  activeBanner: 'character',
  banners: {
    character: createBannerState('character'),
    weapon: createBannerState('weapon'),
    standard: createBannerState('standard'),
    chronicled: createBannerState('chronicled'),
  },
  resources: {
    primos: 0,
    intertwinedFates: 0,
    acquaintFates: 0,
  },
  income: {
    commissions: true,
    welkin: false,
    bp: false,
    abyss: false,
    theater: false,
    events: 30, // estimation event/day
    custom: 0,
  },
  versionFilter: null, // null = toutes versions, sinon string ex: "6.5"
};
