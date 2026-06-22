import { useEffect, useState, useLayoutEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

export const TUTORIAL_SEEN_KEY = 'genshin-tracker-tutorial-seen';

// Centré sur les catégories de navigation et la sync auto — pas sur chaque widget
// de la vue bannière, pour rester court et utile dès la première visite.
const STEPS = [
  {
    title: 'Bienvenue sur Wish Tracker !',
    text: "Petit tour rapide des catégories principales et de la synchronisation automatique. Tu peux passer à tout moment.",
  },
  {
    selector: '[data-tour="nav-banner"]',
    title: 'Vœux',
    text: 'Suis tes tirages bannière par bannière : primos, pity actuelle, historique détaillé.',
  },
  {
    selector: '[data-tour="nav-stats"]',
    title: 'Stats',
    text: 'Pity moyen, taux de 50/50, distribution par version — toutes tes statistiques en un coup d\'œil.',
  },
  {
    selector: '[data-tour="nav-collection"]',
    title: 'Collection',
    text: 'Constellations de personnages et raffinements d\'armes obtenus, toutes bannières confondues.',
  },
  {
    selector: '[data-tour="nav-history"]',
    title: 'Historique',
    text: 'L\'intégralité de tes vœux, sur toutes les bannières, avec recherche par version.',
  },
  {
    selector: '[data-tour="nav-wishlist"]',
    title: 'Wishlist',
    text: 'Note les personnages ou armes que tu vises, avec une priorité, pour t\'organiser.',
  },
  {
    selector: '[data-tour="sync-button"]',
    title: 'Synchronisation',
    text: 'Importe tes vœux depuis le jeu. Une fois configurée, elle se relance automatiquement toutes les 2h tant que ton lien reste valide (~24h) — plus besoin d\'y penser.',
  },
  {
    selector: '[data-tour="settings-button"]',
    title: 'Réglages',
    text: 'Configure la sync, exporte tes données régulièrement, et reviens ici relancer ce tutoriel quand tu veux.',
  },
];

function findVisibleTarget(selector) {
  for (const el of document.querySelectorAll(selector)) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
  }
  return null;
}

export function OnboardingTour({ onFinish }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const step = STEPS[index];

  useLayoutEffect(() => {
    setRect(step.selector ? findVisibleTarget(step.selector) : null);
  }, [step]);

  useEffect(() => {
    function recompute() {
      if (step.selector) setRect(findVisibleTarget(step.selector));
    }
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [step]);

  function finish() {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    onFinish();
  }

  function next() {
    if (index < STEPS.length - 1) setIndex(index + 1);
    else finish();
  }
  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  // Tooltip positioning : sous la cible si la place le permet, sinon au-dessus ;
  // recentré horizontalement et clampé pour rester dans le viewport.
  let tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  if (rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipWidth = 300;
    const below = rect.bottom + 16 + 160 < vh;
    const top = below ? rect.bottom + 12 : Math.max(12, rect.top - 12 - 160);
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - tooltipWidth / 2), vw - tooltipWidth - 12);
    tooltipStyle = { top, left, transform: 'none' };
  }

  return (
    <div className="tour-overlay">
      {rect && (
        <div
          className="tour-spotlight"
          style={{
            top: rect.top - 6, left: rect.left - 6,
            width: rect.width + 12, height: rect.height + 12,
          }}
        />
      )}

      <div className="tour-tooltip" style={tooltipStyle}>
        <button className="tour-tooltip__close" onClick={finish} title="Passer le tutoriel">
          <X size={14} />
        </button>
        <div className="tour-tooltip__title">
          {index === 0 && <Sparkles size={15} />} {step.title}
        </div>
        <p className="tour-tooltip__text">{step.text}</p>
        <div className="tour-tooltip__footer">
          <span className="tour-tooltip__progress">{index + 1} / {STEPS.length}</span>
          <div className="tour-tooltip__actions">
            {index > 0 && (
              <button className="btn btn--ghost btn--sm" onClick={prev}>
                <ChevronLeft size={13} /> Précédent
              </button>
            )}
            <button className="btn btn--primary btn--sm" onClick={next}>
              {index === STEPS.length - 1 ? 'Terminer' : 'Suivant'} <ChevronRight size={13} />
            </button>
          </div>
        </div>
        {index === 0 && (
          <button className="tour-tooltip__skip" onClick={finish}>Passer le tutoriel</button>
        )}
      </div>
    </div>
  );
}
