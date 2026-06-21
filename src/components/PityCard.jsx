import { useState } from 'react';
import { Shield, Flame, TrendingUp, TrendingDown, Sparkles, Target, AlertTriangle, Zap, Settings2, Check, X } from 'lucide-react';
import { BANNER_CONFIG, HARD_PITY_4 } from '../utils/banners';

const CRITICAL_PITY5_THRESHOLD = 80; // Pity critique commune à toutes bannières
const PITY4_WARN_THRESHOLD = 8;      // 4★ bientôt garanti

function PityBaselineForm({ cfg, baseline, onSave, onCancel }) {
  const [pity5, setPity5] = useState(baseline?.pity5 ?? 0);
  const [isGuaranteed, setIsGuaranteed] = useState(baseline?.isGuaranteed ?? false);
  const [fatePoints, setFatePoints] = useState(baseline?.fatePoints ?? 0);

  return (
    <div className="pity-baseline-form">
      <p className="pity-baseline-form__hint">
        À utiliser si ton historique synchronisé est incomplet (vœux manquants avant le
        début du log) : indique la pity réelle juste avant le premier vœu enregistré,
        pour ne pas fausser les scores de luck.
      </p>
      <div className="pity-baseline-form__row">
        <label>Pity 5★ de départ</label>
        <input
          type="number"
          min="0"
          max={cfg.hardPity5 - 1}
          value={pity5}
          onChange={(e) => setPity5(Math.max(0, parseInt(e.target.value, 10) || 0))}
        />
      </div>
      {cfg.has5050 && (
        <label className="pity-baseline-form__checkbox">
          <input type="checkbox" checked={isGuaranteed} onChange={(e) => setIsGuaranteed(e.target.checked)} />
          50/50 déjà garanti (perdu juste avant le début du log)
        </label>
      )}
      {cfg.hasFatePoints && (
        <div className="pity-baseline-form__row">
          <label>Fate Points de départ</label>
          <select value={fatePoints} onChange={(e) => setFatePoints(Number(e.target.value))}>
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </div>
      )}
      <div className="pity-baseline-form__actions">
        <button className="btn btn--primary btn--sm" onClick={() => onSave({ pity5, isGuaranteed, fatePoints })}>
          <Check size={13} /> Enregistrer
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onCancel}>
          <X size={13} /> Annuler
        </button>
      </div>
    </div>
  );
}

export function PityCard({ banner, bannerKey, luckScore, streak, onUpdateBaseline }) {
  const cfg = BANNER_CONFIG[bannerKey];
  const pity5 = banner.pity5;
  const pity4 = banner.pity4;
  const inSoftPity = pity5 + 1 >= cfg.softPity5;
  const inCritical = pity5 >= CRITICAL_PITY5_THRESHOLD;
  const four_imminent = pity4 >= PITY4_WARN_THRESHOLD;
  const fillPct5 = Math.min(100, (pity5 / cfg.hardPity5) * 100);
  const fillPct4 = Math.min(100, (pity4 / HARD_PITY_4) * 100);
  const [editingBaseline, setEditingBaseline] = useState(false);

  return (
    <div className="card">
      <div className="card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Shield size={16} />
        Pity actuelle
        <button
          className="btn btn--ghost btn--icon"
          style={{ marginLeft: 'auto' }}
          title="Corriger la pity de référence (historique synchronisé incomplet)"
          onClick={() => setEditingBaseline((v) => !v)}
        >
          <Settings2 size={13} />
        </button>
      </div>

      {editingBaseline && (
        <PityBaselineForm
          cfg={cfg}
          baseline={banner.pityBaseline}
          onSave={(baseline) => { onUpdateBaseline?.(baseline); setEditingBaseline(false); }}
          onCancel={() => setEditingBaseline(false)}
        />
      )}

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
            <span className={`badge ${banner.isGuaranteed ? 'badge--guaranteed badge--pulse' : 'badge--gold'}`}>
              {banner.isGuaranteed ? <Shield size={12} /> : <Sparkles size={12} />}
              {banner.isGuaranteed ? 'Garanti featured' : '50/50'}
            </span>
          )}

          {cfg.hasFatePoints && (
            <span
              className={`badge ${banner.fatePoints >= 2 ? 'badge--guaranteed badge--pulse' : 'badge--gold'}`}
            >
              <Target size={12} />
              Fate Points : {banner.fatePoints} / 2
              {banner.fatePoints >= 2 && ' · Garanti'}
            </span>
          )}

          {inCritical && (
            <span className="badge badge--critical badge--pulse">
              <AlertTriangle size={12} />
              Pity critique — {cfg.hardPity5 - pity5} restant{cfg.hardPity5 - pity5 > 1 ? 's' : ''}
            </span>
          )}

          {inSoftPity && !inCritical && (
            <span className="badge badge--soft">
              <Flame size={12} />
              Soft pity active
            </span>
          )}

          {four_imminent && (
            <span className="badge badge--4star">
              <Zap size={12} />
              4★ imminent — {HARD_PITY_4 - pity4} restant{HARD_PITY_4 - pity4 > 1 ? 's' : ''}
            </span>
          )}

          {streak && streak.count >= 2 && cfg.has5050 && (
            <span className={`badge ${streak.type === 'wins' ? 'badge--win' : 'badge--loss'}`}>
              {streak.type === 'wins' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {streak.count} {streak.type === 'wins' ? 'wins' : 'losses'} consécutifs
            </span>
          )}
        </div>

        {/* Luck scores — pity moyenne et 50/50, indépendants */}
        {(luckScore?.pityScore != null || luckScore?.winScore != null) && (
          <div className="luck-score-group">
            {luckScore.pityScore != null && (
              <LuckScore score={luckScore.pityScore} title="Pity" sub="basé sur la pity moyenne" />
            )}
            {luckScore.winScore != null && (
              <LuckScore score={luckScore.winScore} title="50/50" sub="basé sur le taux de wins" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LuckScore({ score, title, sub }) {
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
        <strong>{title} : {score}/100</strong>
        <span>{label} ({sub})</span>
      </div>
    </div>
  );
}
