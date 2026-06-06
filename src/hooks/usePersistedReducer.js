import { useEffect, useReducer, useRef } from 'react';
import { reducer } from '../store/reducer';
import { initialState, STORAGE_KEY } from '../store/initialState';

function makeInit(storageKey) {
  return function init(initial) {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.banners) {
          return {
            ...initial,
            ...parsed,
            banners: { ...initial.banners, ...parsed.banners },
            sync: { ...initial.sync, ...(parsed.sync || {}) },
            manualCollection: {
              characters: { ...(parsed.manualCollection?.characters || {}) },
              weapons: { ...(parsed.manualCollection?.weapons || {}) },
            },
          };
        }
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
    return initial;
  };
}

/**
 * @param {string} [profileId] - ID du profil actif. 'default' → clé legacy pour rétrocompat.
 */
export function usePersistedReducer(profileId = 'default') {
  const storageKey = profileId === 'default' ? STORAGE_KEY : `${STORAGE_KEY}-${profileId}`;
  const [state, dispatch] = useReducer(reducer, initialState, makeInit(storageKey));
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [state, storageKey]);

  return [state, dispatch];
}
