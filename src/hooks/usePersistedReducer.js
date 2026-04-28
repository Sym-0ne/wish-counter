import { useEffect, useReducer, useRef } from 'react';
import { reducer } from '../store/reducer';
import { initialState, STORAGE_KEY } from '../store/initialState';

function init(initial) {
  // Initializer du useReducer : load depuis localStorage si présent.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validation minimale : doit avoir banners
      if (parsed && typeof parsed === 'object' && parsed.banners) {
        // Merge avec initialState pour gérer l'ajout de nouveaux champs entre versions
        return {
          ...initial,
          ...parsed,
          banners: { ...initial.banners, ...parsed.banners },
          resources: { ...initial.resources, ...(parsed.resources || {}) },
          income: { ...initial.income, ...(parsed.income || {}) },
        };
      }
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return initial;
}

export function usePersistedReducer() {
  const [state, dispatch] = useReducer(reducer, initialState, init);
  const firstRender = useRef(true);

  // Save à chaque mutation (skip premier render qui a déjà la valeur initiale).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [state]);

  return [state, dispatch];
}
