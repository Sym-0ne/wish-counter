import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { simulateBannerPulls, expectedPullsToFiveStar } from '../utils/probability';
import { BANNER_CONFIG } from '../utils/banners';

export function ProbabilityCalc({ banner, bannerKey }) {
  const cfg = BANNER_CONFIG[bannerKey];
  const [pullsInput, setPullsInput] = useState('80');
  const totalPulls = Math.max(0, parseInt(pullsInput, 10) || 0);

  const probability = useMemo(
    () =>
      totalPulls > 0
        ? simulateBannerPulls({
            bannerKey,
            pity5: banner.pity5,
            isGuaranteed: banner.isGuaranteed,
            fatePoints: banner.fatePoints,
            totalPulls,
          })
        : 0,
    [bannerKey, banner.pity5, banner.isGuaranteed, banner.fatePoints, totalPulls],
  );

  const expectedNext = useMemo(
    () => expectedPullsToFiveStar({ pity5: banner.pity5, bannerKey }),
    [bannerKey, banner.pity5],
  );

  const pct = Math.round(probability * 100);

  let assessment = '';
  if (totalPulls === 0) {
    assessment = 'Saisis le nombre de tirages prévus pour estimer ta chance.';
  } else if (pct >= 80) {
    assessment = 'Très probable. Sortie de bannière confortable.';
  } else if (pct >= 50) {
    assessment = 'Bonnes chances. La pity actuelle aide.';
  } else if (pct >= 25) {
    assessment = 'Risqué. Considère farmer plus de primos.';
  } else {
    assessment = 'Faible. Attends une réédition ou farme davantage.';
  }

  const targetLabel = cfg.has5050
    ? 'le 5★ featured'
    : cfg.hasFatePoints
    ? "l'arme ciblée"
    : 'un 5★';

  return (
    <div className="card">
      <div className="card__title">
        <Calculator size={16} />
        Calculateur de probabilité
      </div>

      <div className="modal__field">
        <label>Tirages prévus</label>
        <input
          type="number"
          min="0"
          value={pullsInput}
          onChange={(e) => setPullsInput(e.target.value)}
          placeholder="ex: 80"
        />
      </div>

      <div className="prob__big">
        <div className="prob__big-value">{pct}%</div>
        <div className="prob__big-label">
          de chance d'avoir {targetLabel} en {totalPulls} tirages
        </div>
      </div>

      <div className="prob__detail">
        Pity 5★ actuelle : <strong>{banner.pity5}</strong> ·
        {cfg.has5050 && ` 50/50 : ${banner.isGuaranteed ? 'garanti' : 'oui'} ·`}
        {cfg.hasFatePoints && ` Fate Points : ${banner.fatePoints}/2 ·`}
        {' '}Prochain 5★ attendu vers <strong>{expectedNext}</strong> pulls.
        <br />
        <em style={{ color: 'var(--accent)' }}>{assessment}</em>
      </div>
    </div>
  );
}