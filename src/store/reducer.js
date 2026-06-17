// Reducer principal. Toutes les mutations passent par ici.
// Règle invariante : après ADD_WISH ou UNDO, on RECALCULE TOUT depuis l'historique,
// jamais d'incrément/décrément naïf des compteurs.

import { ActionTypes } from './actions';
import { processHistory } from '../utils/pityRules';
import { initialState, createBannerState, CURRENT_VERSION } from './initialState';
import { BANNER_KEYS } from '../utils/banners';

let _idCounter = 0;
const newId = () => `${Date.now()}-${++_idCounter}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Recalcule l'état complet d'une bannière depuis son historique brut.
 * Met à jour history (avec pityAt taggé) + tous les compteurs.
 */
function rebuildBanner(banner, bannerKey) {
  const { taggedHistory, pity4, pity5, isGuaranteed, fatePoints } = processHistory(
    banner.history,
    bannerKey,
  );
  return {
    ...banner,
    history: taggedHistory,
    pity4,
    pity5,
    isGuaranteed,
    fatePoints,
  };
}

function applyWishToBanner(banner, bannerKey, wish, currentVersion) {
  const fullWish = {
    id: newId(),
    timestamp: Date.now(),
    version: currentVersion,
    bannerKey,
    rank: wish.rank,
    name: wish.name || '',
    itemType: wish.itemType || '',
    featured: !!wish.featured,
    pityAt: null, // sera taggé par processHistory
  };
  const newHistory = [...banner.history, fullWish];
  return rebuildBanner({ ...banner, history: newHistory }, bannerKey);
}

export function reducer(state, action) {
  switch (action.type) {
    case ActionTypes.ADD_WISH: {
      const { banner: bannerKey, wish } = action.payload;
      const banner = state.banners[bannerKey];
      if (!banner) return state;
      const newBanner = applyWishToBanner(banner, bannerKey, wish, state.version);
      return {
        ...state,
        banners: { ...state.banners, [bannerKey]: newBanner },
      };
    }

    case ActionTypes.ADD_THREE_STAR: {
      const { banner: bannerKey } = action.payload;
      // Un 3★ est toujours une arme dans Genshin, peu importe la bannière.
      return reducer(state, {
        type: ActionTypes.ADD_WISH,
        payload: {
          banner: bannerKey,
          wish: { rank: 3, name: '', itemType: 'weapon', featured: false },
        },
      });
    }
    case ActionTypes.ADD_THREE_STARS_BULK: {
      const { banner: bannerKey, count } = action.payload;
      const banner = state.banners[bannerKey];
      if (!banner || count <= 0) return state;
      // Append N wishes 3★ d'un coup puis rebuild une seule fois (perf).
      const newHistory = [...banner.history];
      const baseTs = Date.now();
      for (let i = 0; i < count; i++) {
        newHistory.push({
          id: newId(),
          timestamp: baseTs + i,
          version: state.version,
          bannerKey,
          rank: 3,
          name: '',
          itemType: 'weapon',
          featured: false,
          pityAt: null,
        });
      }
      const newBanner = rebuildBanner({ ...banner, history: newHistory }, bannerKey);
      return {
        ...state,
        banners: { ...state.banners, [bannerKey]: newBanner },
      };
    }

    case ActionTypes.UNDO_LAST_WISH: {
      const { banner: bannerKey } = action.payload;
      const banner = state.banners[bannerKey];
      if (!banner || banner.history.length === 0) return state;
      const newHistory = banner.history.slice(0, -1);
      const newBanner = rebuildBanner({ ...banner, history: newHistory }, bannerKey);
      return {
        ...state,
        banners: { ...state.banners, [bannerKey]: newBanner },
      };
    }

    case ActionTypes.UPDATE_WISH: {
      const { bannerKey, wishId, patch } = action.payload;
      const banner = state.banners[bannerKey];
      if (!banner) return state;
      const newHistory = banner.history.map((w) =>
        w.id === wishId ? { ...w, ...patch } : w
      );
      return {
        ...state,
        banners: {
          ...state.banners,
          [bannerKey]: rebuildBanner({ ...banner, history: newHistory }, bannerKey),
        },
      };
    }

    case ActionTypes.SET_ACTIVE_BANNER: {
      return { ...state, activeBanner: action.payload.banner };
    }

    case ActionTypes.UPDATE_BANNER_METADATA: {
      const { banner: bannerKey, metadata } = action.payload;
      const banner = state.banners[bannerKey];
      if (!banner) return state;
      return {
        ...state,
        banners: {
          ...state.banners,
          [bannerKey]: {
            ...banner,
            metadata: { ...banner.metadata, ...metadata },
          },
        },
      };
    }

    case ActionTypes.UPDATE_WISHLIST: {
      const { banner: bannerKey, wishlist } = action.payload;
      const banner = state.banners[bannerKey];
      if (!banner) return state;
      return {
        ...state,
        banners: {
          ...state.banners,
          [bannerKey]: { ...banner, wishlist },
        },
      };
    }

    case ActionTypes.UPDATE_MANUAL_COLLECTION: {
      const { itemType, name, count, rank } = action.payload;
      const section = itemType === 'weapon' ? 'weapons' : 'characters';
      const current = state.manualCollection?.[section] || {};
      let updated;
      if (count === 0) {
        // Supprimer l'entrée si count revient à 0
        const { [name]: _, ...rest } = current;
        updated = rest;
      } else {
        updated = { ...current, [name]: { count, rank } };
      }
      return {
        ...state,
        manualCollection: {
          ...state.manualCollection,
          [section]: updated,
        },
      };
    }

    case ActionTypes.IMPORT_SYNCED_WISHES: {
      const { wishGroups } = action.payload;
      const banners = { ...state.banners };
      for (const [key, newWishes] of Object.entries(wishGroups)) {
        if (!newWishes || !newWishes.length) continue;
        const existing = banners[key]?.history || [];
        const seen = new Set(existing.map(w => w.id));
        const fresh = newWishes.filter(w => !seen.has(w.id));
        if (!fresh.length) continue;
        const merged = [...existing, ...fresh].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        banners[key] = rebuildBanner({ ...banners[key], history: merged }, key);
      }
      return { ...state, banners };
    }

    case ActionTypes.UPDATE_SYNC_CONFIG: {
      return { ...state, sync: { ...state.sync, ...action.payload.syncConfig } };
    }

    case ActionTypes.SET_VERSION: {
      return { ...state, version: action.payload.version };
    }

    case ActionTypes.SET_VERSION_FILTER: {
      return { ...state, versionFilter: action.payload.versionFilter };
    }

    case ActionTypes.RESET_BANNER: {
      const { banner: bannerKey } = action.payload;
      return {
        ...state,
        banners: {
          ...state.banners,
          [bannerKey]: createBannerState(bannerKey),
        },
      };
    }

    case ActionTypes.IMPORT_STATE: {
      const { state: imported, mode } = action.payload;
      try {
        // Validation basique
        if (!imported || typeof imported !== 'object') return state;

        let merged;
        if (mode === 'merge') {
          merged = mergeStates(state, imported);
        } else {
          merged = { ...initialState, ...imported };
        }

        // Force la cohérence : reconstruire chaque bannière depuis son history
        const banners = {};
        for (const key of BANNER_KEYS) {
          const importedBanner = merged.banners?.[key] || createBannerState(key);
          banners[key] = rebuildBanner(
            { ...createBannerState(key), ...importedBanner },
            key,
          );
        }
        const importedSync = merged.sync || {};
        return {
          ...initialState,
          ...merged,
          banners,
          version: merged.version || CURRENT_VERSION,
          wishlistItems: Array.isArray(merged.wishlistItems) ? merged.wishlistItems : [],
          // Preserve built-in workerUrl when the imported save had an empty one
          // (same guard as usePersistedReducer for localStorage restores)
          sync: {
            ...importedSync,
            workerUrl: importedSync.workerUrl || initialState.sync.workerUrl,
          },
        };
      } catch (e) {
        // Edge case : JSON malformé → on retourne l'état actuel inchangé
        console.error('Import error:', e);
        return state;
      }
    }

    case ActionTypes.UPDATE_PRIMO_TRACKER: {
      return {
        ...state,
        primoTracker: { ...(state.primoTracker ?? { primos: 0, fates: 0 }), ...action.payload.patch },
      };
    }

    case ActionTypes.ADD_WISHLIST_ITEM: {
      const id = `wl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      return {
        ...state,
        wishlistItems: [...(state.wishlistItems ?? []), { ...action.payload.item, id }],
      };
    }

    case ActionTypes.REMOVE_WISHLIST_ITEM: {
      return {
        ...state,
        wishlistItems: (state.wishlistItems ?? []).filter((i) => i.id !== action.payload.id),
      };
    }

    case ActionTypes.UPDATE_WISHLIST_ITEM: {
      return {
        ...state,
        wishlistItems: (state.wishlistItems ?? []).map((i) =>
          i.id === action.payload.id ? { ...i, ...action.payload.patch } : i
        ),
      };
    }

    case ActionTypes.RESET_ALL: {
      return initialState;
    }

    default:
      return state;
  }
}

/**
 * Merge deux états : les histories sont concaténées et triées par timestamp,
 * puis les bannières sont reconstruites.
 */
function mergeStates(current, incoming) {
  const banners = {};
  for (const key of BANNER_KEYS) {
    const a = current.banners?.[key]?.history || [];
    const b = incoming.banners?.[key]?.history || [];
    const seen = new Set(a.map(w => w.id));
    const merged = [...a];
    for (const w of b) {
      if (!w.id || !seen.has(w.id)) merged.push(w);
    }
    merged.sort((x, y) => (x.timestamp || 0) - (y.timestamp || 0));
    banners[key] = {
      ...createBannerState(key),
      ...(incoming.banners?.[key] || current.banners?.[key] || {}),
      history: merged,
    };
  }
  return {
    ...current,
    ...incoming,
    banners,
    sync: { ...current.sync, ...(incoming.sync || {}) },
    manualCollection: {
      characters: { ...(current.manualCollection?.characters || {}), ...(incoming.manualCollection?.characters || {}) },
      weapons: { ...(current.manualCollection?.weapons || {}), ...(incoming.manualCollection?.weapons || {}) },
    },
  };
}
