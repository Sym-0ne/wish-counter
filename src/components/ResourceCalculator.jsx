import { useMemo } from 'react';
import { Coins } from 'lucide-react';
import { BANNER_CONFIG, PRIMO_PER_WISH } from '../utils/banners';
import { fiveStarRateNoSoftPity } from '../utils/pityRules';
import { simulateBannerPulls } from '../utils/probability';

/**
 * Calculateur de ressource unifié : primos + destins entrelacés → tirages disponibles,
 * statut hard/soft pity, et probabilité d'obtenir le 5★ ciblé (avec et sans soft pity).
 */
export function ResourceCalculator({ primoTracker = {}, banner, bannerKey, onChange }) {
  const cfg = BANNER_CONFIG[bannerKey];
  const primos = Number(primoTracker.primos) || 0;
  const fates  = Number(primoTracker.fates)  || 0;

  const totalPulls = Math.floor(primos / PRIMO_PER_WISH) + fates;
  const pity5       = banner?.pity5 ?? 0;
  const pullsToHard = cfg.hardPity5 - pity5;
  const canHitHard  = totalPulls >= pullsToHard;

  // Soft pity : "pullsUntilSoft <= 0" signifie que le tirage suivant est déjà dans le ramp.
  const pullsUntilSoft = cfg.softPity5 - 1 - pity5;
  const inSoftPity      = pullsUntilSoft <= 0;

  const { pctSoft, pctHard } = useMemo(() => {
    if (totalPulls <= 0) return { pctSoft: 0, pctHard: 0 };
    const base = {
      bannerKey,
      pity5,
      isGuaranteed: banner?.isGuaranteed,
      fatePoints: banner?.fatePoints,
      totalPulls,
    };
    return {
      pctSoft: simulateBannerPulls(base),
      pctHard: simulateBannerPulls({ ...base, rateFn: fiveStarRateNoSoftPity }),
    };
  }, [bannerKey, pity5, banner?.isGuaranteed, banner?.fatePoints, totalPulls]);

  function handleChange(field, raw) {
    const v = Math.max(0, parseInt(raw, 10) || 0);
    onChange({ ...primoTracker, [field]: v });
  }

  const targetLabel = cfg.has5050
    ? 'le 5★ featured'
    : cfg.hasFatePoints
    ? "l'arme ciblée"
    : 'un 5★';

  const pctSoftRounded = Math.round(pctSoft * 100);
  let assessment = '';
  if (totalPulls === 0) {
    assessment = 'Entre tes primos / destins pour estimer tes chances.';
  } else if (pctSoftRounded >= 80) {
    assessment = 'Très probable. Sortie de bannière confortable.';
  } else if (pctSoftRounded >= 50) {
    assessment = 'Bonnes chances. La pity actuelle aide.';
  } else if (pctSoftRounded >= 25) {
    assessment = 'Risqué. Considère farmer plus de primos.';
  } else {
    assessment = 'Faible. Attends une réédition ou farme davantage.';
  }

  return (
    <section className="card">
      <h3 className="card__title">
        <Coins size={18} /> Calculateur de ressources
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
            style={{ color: canHitHard ? 'var(--guaranteed)' : 'var(--soft-pity)' }}
          >
            {canHitHard ? '✓' : '✗'}
          </span>
          <span className="pt-summary__label">
            {canHitHard
              ? `Hard pity à ${cfg.hardPity5} · pity actuel ${pity5}`
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

      <div className="rc-pity-status">
        <span className={`rc-pity-badge ${inSoftPity ? 'rc-pity-badge--active' : ''}`}>
          {inSoftPity ? '🔥 En soft pity (taux boosté)' : `Soft pity dans ${pullsUntilSoft} tirage${pullsUntilSoft > 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="prob__detail" style={{ marginTop: '0.75rem' }}>
        Pity 5★ actuelle : <strong>{pity5}</strong> ·
        {cfg.has5050 && ` 50/50 : ${banner?.isGuaranteed ? 'garanti' : 'oui'} ·`}
        {cfg.hasFatePoints && ` Fate Points : ${banner?.fatePoints ?? 0}/2 ·`}
        {' '}avec tes ressources actuelles, proba d'obtenir {targetLabel} :
      </div>

      <table className="pce-table" style={{ marginTop: '0.4rem' }}>
        <tbody>
          <tr className="pce-row--highlight">
            <td className="pce-label">Avec soft pity (réaliste)</td>
            <td>{pctSoftRounded}%</td>
          </tr>
          <tr>
            <td className="pce-label">Sans soft pity (pire cas)</td>
            <td>{Math.round(pctHard * 100)}%</td>
          </tr>
        </tbody>
      </table>

      <p className="prob__detail" style={{ marginTop: '0.5rem' }}>
        <em style={{ color: 'var(--accent)' }}>{assessment}</em>
      </p>
    </section>
  );
}
