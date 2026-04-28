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

    case ActionTypes.UNDO_LAST_WISH: {
      const { banner: bannerKey } = action.payload;
      const banner = state.banners[bannerKey];
      if (!banner || banner.history.length === 0) return state;
      // Edge case : undo sur historique vide → no-op (déjà géré par condition ci-dessus).
      const newHistory = banner.history.slice(0, -1);
      const newBanner = rebuildBanner({ ...banner, history: newHistory }, bannerKey);
      return {
        ...state,
        banners: { ...state.banners, [bannerKey]: newBanner },
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

    case ActionTypes.UPDATE_RESOURCES: {
      return {
        ...state,
        resources: { ...state.resources, ...action.payload.resources },
      };
    }

    case ActionTypes.UPDATE_INCOME: {
      return {
        ...state,
        income: { ...state.income, ...action.payload.income },
      };
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
        return {
          ...initialState,
          ...merged,
          banners,
          version: merged.version || CURRENT_VERSION,
        };
      } catch (e) {
        // Edge case : JSON malformé → on retourne l'état actuel inchangé
        console.error('Import error:', e);
        return state;
      }
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
    resources: { ...current.resources, ...(incoming.resources || {}) },
    income: { ...current.income, ...(incoming.income || {}) },
  };
}
