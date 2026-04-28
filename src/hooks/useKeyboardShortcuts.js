import { useEffect } from 'react';

/**
 * Détecte si un input/textarea/contenteditable est actuellement focus.
 * Si oui, on n'intercepte pas les raccourcis (l'utilisateur tape).
 */
function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  );
}

export function useKeyboardShortcuts({ onSpace, onUndo }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (isInputFocused()) return;

      // Espace = +1 trois-étoile
      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        onSpace?.();
        return;
      }

      // Ctrl+Z (ou Cmd+Z) = undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSpace, onUndo]);
}
