import { Target } from 'lucide-react';
import { BANNER_CONFIG } from '../utils/banners';

/**
 * Objectif texte libre pour la bannière courante.
 * ex: "Néfer C1 + R1 arme signature"
 */
export function Wishlist({ bannerKey, banner, onChange }) {
  const cfg = BANNER_CONFIG[bannerKey];

  return (
    <section className="card">
      <h3 className="card__title">
        <Target size={18} /> Objectif — {cfg.label}
      </h3>
      <p className="card__subtitle">
        Note ce que tu vises sur cette bannière (constellations, arme, refinements...).
      </p>
      <textarea
        value={banner.wishlist || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          bannerKey === 'character'
            ? 'ex: Néfer C0, puis Skirk C2 phase 2...'
            : bannerKey === 'weapon'
            ? 'ex: R1 arme signature de Néfer (Fate Points <2)'
            : 'ex: ne pas tirer ici, attendre les bannières limitées'
        }
        rows={4}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          color: 'var(--text)',
          fontFamily: 'inherit',
          fontSize: '14px',
          resize: 'vertical',
        }}
      />
    </section>
  );
}
