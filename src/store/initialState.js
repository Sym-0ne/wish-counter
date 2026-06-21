export const CURRENT_VERSION = '6.6';
export const STORAGE_KEY = 'genshin-tracker-v1';

export function createBannerState(bannerKey) {
  return {
    pity4: 0,
    pity5: 0,
    isGuaranteed: false,
    fatePoints: 0, // utilisé uniquement pour weapon
    // Point de départ utilisé pour recalculer pity4/pity5/isGuaranteed/fatePoints depuis
    // l'historique. Sert à corriger un historique synchronisé en partie (vœux manquants
    // avant le début du log) sans fausser le pity réel ni les scores de luck.
    pityBaseline: { pity5: 0, isGuaranteed: false, fatePoints: 0 },
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
  manualCollection: {
    // { 'Name': { count: N, rank: R } } — count est additif (peut être négatif pour corriger)
    characters: {},
    weapons: {},
  },
  sync: {
    // VITE_WORKER_URL is injected at build time from the WORKER_URL GitHub secret.
    // Users don't need to configure this — the maintainer deploys one shared Worker.
    workerUrl: import.meta.env.VITE_WORKER_URL || '',
    authkeyUrl: '',      // URL complète avec authkey (expire ~24h)
    authkeyObtainedAt: null, // ISO string — moment où CETTE authkey a été collée (≠ lastSync)
    lastSync: null,      // ISO string de la dernière sync réussie
    // Auth pour l'édition des bannières à venir (via Cloudflare Worker)
    upcomingUser: '',
    upcomingPassword: '',
    adminSecret: '',     // Uniquement pour le propriétaire du site
  },
  versionFilter: null, // null = toutes versions, sinon string ex: "6.5"
  // Wishlist structurée globale (indépendante des bannières)
  // { id, name, itemType, priority: 'must'|'want'|'casual', targetCopies: N }
  wishlistItems: [],
  // Ressources actuelles pour calculer le nombre de tirages disponibles
  primoTracker: { primos: 0, fates: 0 },
};
