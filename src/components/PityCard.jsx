import { Shield, Flame, TrendingUp, TrendingDown, Sparkles, Target } from 'lucide-react';
import { BANNER_CONFIG, HARD_PITY_4 } from '../utils/banners';

export function PityCard({ banner, bannerKey, luckScore, streak }) {
  const cfg = BANNER_CONFIG[bannerKey];
  const pity5 = banner.pity5;
  const pity4 = banner.pity4;
  const inSoftPity = pity5 + 1 >= cfg.softPity5;
  const fillPct5 = Math.min(100, (pity5 / cfg.hardPity5) * 100);
  const fillPct4 = Math.min(100, (pity4 / HARD_PITY_4) * 100);

  return (
    <div className="card">
      <div className="card__title">
        <Shield size={16} />
        Pity actuelle
      </div>

      <div className="pity-card">
        {/* Barre 5★ */}
        <div className="pity-card__bar-wrap">
          <div className="pity-card__bar-label">
            <strong>Pity 5★</strong>
            <span className="muted">
              {pity5} / {cfg.hardPity5} {inSoftPity && '· Soft pity'}
            </span>
          </div>
          <div className="pity-card__bar">
            <div
              className={`pity-card__bar-fill ${inSoftPity ? 'pity-card__bar-fill--soft' : ''}`}
              style={{ width: `${fillPct5}%` }}
            />
          </div>
        </div>

        {/* Barre 4★ */}
        <div className="pity-card__bar-wrap">
          <div className="pity-card__bar-label">
            <strong>Pity 4★</strong>
            <span className="muted">
              {pity4} / {HARD_PITY_4}
            </span>
          </div>
          <div className="pity-card__bar">
            <div
              className="pity-card__bar-fill pity-card__bar-fill--purple"
              style={{ width: `${fillPct4}%` }}
            />
          </div>
        </div>

        {/* Badges */}
        <div className="pity-card__badges">
          {cfg.has5050 && (
            <span className={`badge ${banner.isGuaranteed ? 'badge--guaranteed' : 'badge--gold'}`}>
              {banner.isGuaranteed ? <Shield size={12} /> : <Sparkles size={12} />}
              {banner.isGuaranteed ? 'Garanti featured' : '50/50'}
            </span>
          )}

          {cfg.hasFatePoints && (
            <span
              className={`badge ${banner.fatePoints >= 2 ? 'badge--guaranteed' : 'badge--gold'}`}
            >
              <Target size={12} />
              Fate Points : {banner.fatePoints} / 2
              {banner.fatePoints >= 2 && ' · Garanti'}
            </span>
          )}

          {inSoftPity && (
            <span className="badge badge--soft">
              <Flame size={12} />
              Soft pity active
            </span>
          )}

          {streak && streak.count >= 2 && cfg.has5050 && (
            <span className={`badge ${streak.type === 'wins' ? 'badge--win' : 'badge--loss'}`}>
              {streak.type === 'wins' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {streak.count} {streak.type === 'wins' ? 'wins' : 'losses'} consécutifs
            </span>
          )}
        </div>

        {/* Luck score */}
        {luckScore !== null && <LuckScore score={luckScore} />}
      </div>
    </div>
  );
}

function LuckScore({ score }) {
  // Couleur selon le score : rouge < 40, orange 40-60, vert > 60
  let color = 'var(--soft-pity)';
  let label = 'Luck moyenne';
  if (score >= 65) {
    color = 'var(--guaranteed)';
    label = 'Très chanceux';
  } else if (score >= 50) {
    color = 'var(--gold)';
    label = 'Bonne luck';
  } else if (score < 35) {
    color = 'var(--danger)';
    label = 'Malchance';
  }

  return (
    <div className="luck-score">
      <div
        className="luck-score__circle"
        style={{
          background: `conic-gradient(${color} ${score * 3.6}deg, var(--bg) 0)`,
          color,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 4,
            background: 'var(--surface-2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {score}
        </div>
      </div>
      <div className="luck-score__label">
        <strong>Score de luck : {score}/100</strong>
        <span>{label} (basé sur pity moyenne et 50/50 wins)</span>
      </div>
    </div>
  );
}
