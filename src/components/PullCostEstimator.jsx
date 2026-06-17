import { useMemo, useState } from 'react';
import { Target } from 'lucide-react';
import { fiveStarRate } from '../utils/pityRules';
import { BANNER_CONFIG, PRIMO_PER_WISH } from '../utils/banners';

const SIMS = 15000;
const FIFTY_FIFTY_RATE = 0.55; // Capturing Radiance

const COPY_OPTIONS = [
  { copies: 1, label: 'C0 — 1 copie' },
  { copies: 2, label: 'C1 — 2 copies' },
  { copies: 3, label: 'C2 — 3 copies' },
  { copies: 4, label: 'C3 — 4 copies' },
  { copies: 5, label: 'C4 — 5 copies' },
  { copies: 6, label: 'C5 — 6 copies' },
  { copies: 7, label: 'C6 — 7 copies' },
];

function runSims(bannerKey, startPity, startGuaranteed, targetCopies) {
  const results = new Array(SIMS);

  for (let s = 0; s < SIMS; s++) {
    let pity = startPity;
    let guaranteed = startGuaranteed;
    let copies = 0;
    let pulls = 0;

    while (copies < targetCopies) {
      const rate = fiveStarRate(pity, bannerKey);
      pity++;
      pulls++;

      if (Math.random() < rate) {
        pity = 0;
        if (guaranteed || Math.random() < FIFTY_FIFTY_RATE) {
          copies++;
          guaranteed = false;
        } else {
          guaranteed = true;
        }
      }
    }

    results[s] = pulls;
  }

  results.sort((a, b) => a - b);
  let sum = 0;
  for (const v of results) sum += v;

  return {
    avg: Math.round(sum / SIMS),
    p80: results[Math.floor(SIMS * 0.8)],
    p95: results[Math.floor(SIMS * 0.95)],
  };
}

function fmt(n) {
  return n.toLocaleString('fr-FR');
}

export function PullCostEstimator({ banner, bannerKey }) {
  const cfg = BANNER_CONFIG[bannerKey];
  const [targetCopies, setTargetCopies] = useState(1);

  const supportsEstimator = cfg?.has5050;

  const result = useMemo(() => {
    if (!supportsEstimator) return null;
    return runSims(bannerKey, banner.pity5, banner.isGuaranteed, targetCopies);
  }, [bannerKey, banner.pity5, banner.isGuaranteed, targetCopies, supportsEstimator]);

  if (!supportsEstimator) return null;

  const characterName = banner.metadata?.featured;

  return (
    <div className="card">
      <div className="card__title">
        <Target size={16} />
        Coût en tirages
      </div>

      <div className="modal__field">
        <label>Objectif{characterName ? ` — ${characterName}` : ''}</label>
        <select
          value={targetCopies}
          onChange={(e) => setTargetCopies(Number(e.target.value))}
        >
          {COPY_OPTIONS.map(({ copies, label }) => (
            <option key={copies} value={copies}>{label}</option>
          ))}
        </select>
      </div>

      {result && (
        <table className="pce-table">
          <thead>
            <tr>
              <th></th>
              <th>Tirages</th>
              <th>Primos</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pce-label">Moyen</td>
              <td>{fmt(result.avg)}</td>
              <td>{fmt(result.avg * PRIMO_PER_WISH)}</td>
            </tr>
            <tr className="pce-row--highlight">
              <td className="pce-label">~80%</td>
              <td>{fmt(result.p80)}</td>
              <td>{fmt(result.p80 * PRIMO_PER_WISH)}</td>
            </tr>
            <tr>
              <td className="pce-label">~95%</td>
              <td>{fmt(result.p95)}</td>
              <td>{fmt(result.p95 * PRIMO_PER_WISH)}</td>
            </tr>
          </tbody>
        </table>
      )}

      <p className="prob__detail" style={{ marginTop: '0.75rem' }}>
        Pity actuelle&nbsp;: <strong>{banner.pity5}</strong>
        {' · '}50/50&nbsp;: <strong>{banner.isGuaranteed ? 'garanti ✓' : 'non garanti'}</strong>
      </p>
    </div>
  );
}
