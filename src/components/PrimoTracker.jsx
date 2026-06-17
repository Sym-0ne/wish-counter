import { Coins } from 'lucide-react';
import { PRIMO_PER_WISH } from '../utils/banners';

/**
 * Calcule les tirages disponibles depuis les primos + destins entrelacés,
 * et affiche combien il en manque pour garantir le prochain 5★ sur la bannière active.
 */
export function PrimoTracker({ primoTracker = {}, banner, bannerKey, onChange }) {
  const primos = Number(primoTracker.primos) || 0;
  const fates  = Number(primoTracker.fates)  || 0;

  const totalPulls  = Math.floor(primos / PRIMO_PER_WISH) + fates;
  const pity5       = banner?.pity5 ?? 0;
  const hardPity    = bannerKey === 'weapon' ? 80 : 90;
  const pullsToHard = hardPity - pity5;           // tirages pour hard pity
  const canHit      = totalPulls >= pullsToHard;

  function handleChange(field, raw) {
    const v = Math.max(0, parseInt(raw, 10) || 0);
    onChange({ ...primoTracker, [field]: v });
  }

  return (
    <section className="card">
      <h3 className="card__title">
        <Coins size={18} /> Ressources
      </h3>

      <div className="pt-grid">
        <div className="pt-field">
          <label className="pt-label">Primogemmes</label>
          <input
            type="number"
            min="0"
            value={primos || ''}
            placeholder="0"
            className="pt-input"
            onChange={(e) => handleChange('primos', e.target.value)}
          />
        </div>
        <div className="pt-field">
          <label className="pt-label">Destins entrelacés</label>
          <input
            type="number"
            min="0"
            value={fates || ''}
            placeholder="0"
            className="pt-input"
            onChange={(e) => handleChange('fates', e.target.value)}
          />
        </div>
      </div>

      <div className="pt-summary">
        <div className="pt-summary__pulls">
          <span className="pt-summary__value">{totalPulls}</span>
          <span className="pt-summary__label">tirages disponibles</span>
        </div>
        <div className="pt-summary__divider" />
        <div className="pt-summary__target">
          <span
            className="pt-summary__status"
            style={{ color: canHit ? 'var(--guaranteed)' : 'var(--soft-pity)' }}
          >
            {canHit ? '✓' : '✗'}
          </span>
          <span className="pt-summary__label">
            {canHit
              ? `Hard pity à ${hardPity} · pity actuel ${pity5}`
              : `${pullsToHard - totalPulls} de plus pour hard pity`}
          </span>
        </div>
      </div>

      {primos > 0 && (
        <div className="pt-hint">
          {primos.toLocaleString('fr-FR')} primo = {Math.floor(primos / PRIMO_PER_WISH)} tirages
          {primos % PRIMO_PER_WISH > 0 && ` + ${primos % PRIMO_PER_WISH} resto`}
        </div>
      )}
    </section>
  );
}
