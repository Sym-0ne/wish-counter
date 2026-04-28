import { useMemo } from 'react';
import { Calculator } from 'lucide-react';
import { simulateBannerPulls, expectedPullsToFiveStar } from '../utils/probability';
import { BANNER_CONFIG } from '../utils/banners';
import { totalAvailableWishes } from '../utils/primoCalc';

export function ProbabilityCalc({ banner, bannerKey, resources, income }) {
  const cfg = BANNER_CONFIG[bannerKey];
  const calc = totalAvailableWishes({
    resources,
    income,
    endDate: banner.metadata.endDate,
    fateType: bannerKey === 'standard' ? 'acquaint' : 'intertwined',
  });

  const totalPulls = calc.total;

  const probability = useMemo(
    () =>
      simulateBannerPulls({
        bannerKey,
        pity5: banner.pity5,
        isGuaranteed: banner.isGuaranteed,
        fatePoints: banner.fatePoints,
        totalPulls,
      }),
    [bannerKey, banner.pity5, banner.isGuaranteed, banner.fatePoints, totalPulls],
  );

  const expectedNext = useMemo(
    () => expectedPullsToFiveStar({ pity5: banner.pity5, bannerKey }),
    [bannerKey, banner.pity5],
  );

  const pct = Math.round(probability * 100);

  let assessment = '';
  if (totalPulls === 0) {
    assessment = 'Pas assez de ressources pour tirer.';
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
