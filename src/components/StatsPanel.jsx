import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ComposedChart, Line, Legend, ReferenceLine,
} from 'recharts';
import { BANNER_CONFIG, BANNER_KEYS } from '../utils/banners';
import { useBannerStats } from '../hooks/useDerivedStats';
import { BarChart3, Sparkles, Target, TrendingUp, TrendingDown, Activity, GitBranch, Calendar } from 'lucide-react';

const BANNER_COLORS = {
  character:  'var(--gold)',
  weapon:     'var(--purple)',
  standard:   'var(--blue)',
  chronicled: 'var(--teal)',
};

/**
 * Construit un histogramme de distribution des pity 5★ (regroupé par tranches de 10).
 */
function buildHistogram(pities, hardPity) {
  const bins = [];
  for (let i = 0; i < hardPity; i += 10) {
    bins.push({ range: `${i + 1}-${i + 10}`, count: 0, mid: i + 5 });
  }
  for (const p of pities) {
    const idx = Math.min(Math.floor((p - 1) / 10), bins.length - 1);
    bins[idx].count += 1;
  }
  return bins;
}

function StatTile({ label, value, sub, icon: Icon }) {
  return (
    <div className="stats-tile">
      <div className="stats-tile__label">
        {Icon && <Icon size={14} />} {label}
      </div>
      <div className="stats-tile__value">{value}</div>
      {sub && <div className="stats-tile__sub">{sub}</div>}
    </div>
  );
}

function BannerStats({ bannerKey, banner }) {
  const cfg = BANNER_CONFIG[bannerKey];
  const stats = useBannerStats(banner, bannerKey);
  const histogram = useMemo(
    () => buildHistogram(stats.fiveStarPities, cfg.hardPity5),
    [stats.fiveStarPities, cfg.hardPity5]
  );

  return (
    <section className="card">
      <h3 className="card__title">
        <BarChart3 size={18} /> {cfg.longLabel}
      </h3>

      <div className="stats-grid">
        <StatTile
          label="Total tirages"
          value={stats.totalWishes}
          icon={Activity}
        />
        <StatTile
          label="5★ obtenus"
          value={stats.fiveStarCount}
          icon={Sparkles}
        />
        <StatTile
          label="Pity moyen"
          value={stats.avgPity != null ? stats.avgPity.toFixed(1) : '—'}
          sub={stats.avgPity != null ? 'théorique : ~62.3' : null}
          icon={Target}
        />
        <StatTile
          label="Meilleur pity"
          value={stats.bestPity ?? '—'}
          icon={TrendingUp}
        />
        <StatTile
          label="Pire pity"
          value={stats.worstPity ?? '—'}
          icon={TrendingDown}
        />
        {cfg.has5050 && (
          <StatTile
            label="Win rate 50/50"
            value={stats.winRate != null ? `${stats.winRate.toFixed(0)}%` : '—'}
            sub={stats.winRate != null ? `${stats.wins}W / ${stats.losses}L` : null}
            icon={Target}
          />
        )}
      </div>

      {stats.fiveStarCount > 0 && (
        <>
          <div className="card__subtitle" style={{ marginTop: '16px' }}>
            Distribution des pity 5★
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={histogram} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <XAxis
                  dataKey="range"
                  stroke="var(--muted)"
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--muted)"
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                  }}
                  cursor={{ fill: 'rgba(192, 160, 96, 0.08)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {histogram.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.mid >= cfg.softPity5 ? 'var(--soft-pity)' : 'var(--gold)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {stats.fiveStarCount === 0 && (
        <div className="empty-state">Aucun 5★ enregistré sur cette bannière.</div>
      )}
    </section>
  );
}

/**
 * Vue agrégée : stats globales sur l'union des 4 bannières.
 */
function GlobalStats({ banners }) {
  const aggregate = useMemo(() => {
    let total = 0;
    let fiveStars = 0;
    let fourStars = 0;
    const allPities = [];
    let wins = 0;
    let losses = 0;
    const byBanner = {};

    for (const key of BANNER_KEYS) {
      const b = banners[key];
      if (!b) continue;
      byBanner[key] = b.history.length;
      total += b.history.length;
      let pity = b.pityBaseline?.pity5 ?? 0;
      let isGuaranteed = b.pityBaseline?.isGuaranteed ?? false;
      for (const wish of b.history) {
        pity += 1;
        if (wish.rank === 5) {
          fiveStars += 1;
          allPities.push(pity);
          pity = 0;
          if (key === 'character' || key === 'chronicled') {
            if (isGuaranteed) {
              isGuaranteed = false;
            } else if (wish.featured) {
              wins += 1;
            } else {
              losses += 1;
              isGuaranteed = true;
            }
          }
        } else if (wish.rank === 4) {
          fourStars += 1;
        }
      }
    }

    const avg = allPities.length > 0
      ? allPities.reduce((a, b) => a + b, 0) / allPities.length
      : null;
    const total5050 = wins + losses;
    const fiveStarRate = total > 0 ? (fiveStars / total) * 100 : null;
    const fourStarRate = total > 0 ? (fourStars / total) * 100 : null;

    // Bannière la plus jouée
    const topBanner = Object.entries(byBanner).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      fiveStars,
      fourStars,
      avg,
      fiveStarRate,
      fourStarRate,
      winRate: total5050 > 0 ? (wins / total5050) * 100 : null,
      wins,
      losses,
      primosSpent: total * 160,
      byBanner,
      topBanner,
    };
  }, [banners]);

  return (
    <section className="card">
      <h3 className="card__title">
        <Activity size={18} /> Vue d'ensemble
      </h3>
      <div className="stats-grid">
        <StatTile label="Total tirages" value={aggregate.total.toLocaleString('fr-FR')} icon={Activity} />
        <StatTile
          label="5★ obtenus"
          value={aggregate.fiveStars}
          sub={aggregate.fiveStarRate != null ? `${aggregate.fiveStarRate.toFixed(1)}% des tirages` : null}
          icon={Sparkles}
        />
        <StatTile
          label="4★ obtenus"
          value={aggregate.fourStars}
          sub={aggregate.fourStarRate != null ? `${aggregate.fourStarRate.toFixed(1)}% des tirages` : null}
          icon={TrendingUp}
        />
        <StatTile
          label="Primogemmes dépensées"
          value={aggregate.primosSpent.toLocaleString('fr-FR')}
          sub={`≈ ${Math.floor(aggregate.primosSpent / 160)} tirages`}
          icon={Target}
        />
        <StatTile
          label="Pity moyen 5★"
          value={aggregate.avg != null ? aggregate.avg.toFixed(1) : '—'}
          sub="théorique : ~62.3"
          icon={Target}
        />
        <StatTile
          label="Win rate 50/50 global"
          value={aggregate.winRate != null ? `${aggregate.winRate.toFixed(0)}%` : '—'}
          sub={aggregate.winRate != null ? `${aggregate.wins}W / ${aggregate.losses}L` : null}
          icon={Target}
        />
        {aggregate.topBanner && aggregate.total > 0 && (
          <StatTile
            label="Bannière la plus jouée"
            value={BANNER_CONFIG[aggregate.topBanner[0]]?.label ?? aggregate.topBanner[0]}
            sub={`${aggregate.topBanner[1]} tirages`}
            icon={TrendingUp}
          />
        )}
      </div>

      {/* Répartition par bannière */}
      {aggregate.total > 0 && (
        <div className="stats-breakdown">
          {BANNER_KEYS.map((key) => {
            const count = aggregate.byBanner[key] ?? 0;
            const pct = aggregate.total > 0 ? (count / aggregate.total) * 100 : 0;
            const cfg = BANNER_CONFIG[key];
            return (
              <div key={key} className="stats-breakdown__row">
                <span className="stats-breakdown__label" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <div className="stats-breakdown__bar-wrap">
                  <div
                    className="stats-breakdown__bar"
                    style={{ width: `${pct}%`, background: BANNER_COLORS[key] }}
                  />
                </div>
                <span className="stats-breakdown__count">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/**
 * Timeline mensuelle : nombre de tirages par mois, par bannière.
 */
function PullsTimeline({ banners }) {
  const data = useMemo(() => {
    const byMonth = {};

    for (const key of BANNER_KEYS) {
      const history = banners[key]?.history ?? [];
      for (const wish of history) {
        if (!wish.timestamp) continue;
        const month = new Date(wish.timestamp).toISOString().slice(0, 7); // "2025-01"
        if (!byMonth[month]) {
          byMonth[month] = { month, character: 0, weapon: 0, standard: 0, chronicled: 0, total: 0, fiveStars: 0 };
        }
        byMonth[month][key] = (byMonth[month][key] ?? 0) + 1;
        byMonth[month].total += 1;
        if (wish.rank === 5) byMonth[month].fiveStars += 1;
      }
    }

    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }, [banners]);

  const hasData = data.length > 0;

  const tooltipStyle = {
    contentStyle: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      color: 'var(--text)',
      fontSize: '12px',
    },
    cursor: { fill: 'rgba(192, 160, 96, 0.06)' },
  };

  // Format "2025-01" → "Jan 25"
  function fmtMonth(m) {
    const [y, mo] = m.split('-');
    const d = new Date(+y, +mo - 1, 1);
    return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  }

  return (
    <section className="card">
      <h3 className="card__title"><Calendar size={18} /> Timeline des tirages</h3>
      <p className="card__subtitle">
        Tirages par mois, répartis par bannière. Nécessite une synchronisation avec les données HoYoverse (timestamps).
      </p>
      {!hasData && (
        <div className="empty-state">
          Aucun tirage avec timestamp. Synchronise tes vœux via le bouton Sync.
        </div>
      )}
      {hasData && (
        <div style={{ width: '100%', height: 260, marginTop: 12 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <XAxis
                dataKey="month"
                tickFormatter={fmtMonth}
                stroke="var(--muted)"
                tick={{ fill: 'var(--muted)', fontSize: 10 }}
              />
              <YAxis
                stroke="var(--muted)"
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value, name) => [value, BANNER_CONFIG[name]?.label ?? name]}
                labelFormatter={fmtMonth}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }}
                formatter={(value) => BANNER_CONFIG[value]?.label ?? value}
              />
              {BANNER_KEYS.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={BANNER_COLORS[key]}
                  opacity={0.85}
                  radius={key === 'chronicled' ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

/**
 * Graphe de comparaison version par version :
 * pity moyen, nombre de 5★ et win rate 50/50 par patch.
 */
function VersionHistory({ banners }) {
  const data = useMemo(() => {
    const byVersion = {};

    for (const key of BANNER_KEYS) {
      const b = banners[key];
      if (!b) continue;
      const cfg = BANNER_CONFIG[key];
      let isGuaranteed = b.pityBaseline?.isGuaranteed ?? false;

      for (const wish of b.history) {
        const ver = wish.version || 'sync';
        if (!byVersion[ver]) {
          byVersion[ver] = { version: ver, fiveStars: 0, pitiesSum: 0, wins: 0, losses: 0, pulls: 0 };
        }
        byVersion[ver].pulls += 1;

        if (wish.rank === 5) {
          byVersion[ver].fiveStars += 1;
          if (wish.pityAt) byVersion[ver].pitiesSum += wish.pityAt;

          if (cfg.has5050) {
            if (isGuaranteed) {
              isGuaranteed = false;
            } else if (wish.featured === true) {
              byVersion[ver].wins += 1;
              isGuaranteed = false;
            } else if (wish.featured === false) {
              byVersion[ver].losses += 1;
              isGuaranteed = true;
            }
          }
        }
      }
    }

    return Object.values(byVersion)
      .sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }))
      .map(v => ({
        version: v.version,
        '5★': v.fiveStars,
        'Pity moyen': v.fiveStars > 0 ? +(v.pitiesSum / v.fiveStars).toFixed(1) : null,
        'Win rate %': (v.wins + v.losses) > 0
          ? +((v.wins / (v.wins + v.losses)) * 100).toFixed(0)
          : null,
        pulls: v.pulls,
      }));
  }, [banners]);

  if (data.length < 2) {
    return (
      <section className="card">
        <h3 className="card__title"><GitBranch size={18} /> Comparaison par version</h3>
        <div className="empty-state">Nécessite au moins 2 versions dans l'historique.</div>
      </section>
    );
  }

  const tooltipStyle = {
    contentStyle: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      color: 'var(--text)',
      fontSize: '12px',
    },
    cursor: { fill: 'rgba(192, 160, 96, 0.08)' },
  };

  return (
    <section className="card">
      <h3 className="card__title"><GitBranch size={18} /> Comparaison par version</h3>
      <p className="card__subtitle">Pity moyen (ligne), 5★ obtenus (barres), win rate 50/50 (ligne pointillée)</p>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 40, left: 0, bottom: 8 }}>
            <XAxis
              dataKey="version"
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
            />
            <YAxis
              yAxisId="left"
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              domain={[0, 90]}
              label={{ value: 'Pity / 5★', angle: -90, position: 'insideLeft', fill: 'var(--muted)', fontSize: 10, dy: 30 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              domain={[0, 100]}
              unit="%"
            />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
            <Bar yAxisId="left" dataKey="5★" fill="var(--gold)" radius={[4, 4, 0, 0]} opacity={0.7} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="Pity moyen"
              stroke="var(--soft-pity)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--soft-pity)' }}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Win rate %"
              stroke="var(--guaranteed)"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 3, fill: 'var(--guaranteed)' }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function StatsPanel({ banners }) {
  return (
    <div className="section-spacing">
      <GlobalStats banners={banners} />
      <PullsTimeline banners={banners} />
      <VersionHistory banners={banners} />
      {BANNER_KEYS.map((key) => (
        <BannerStats key={key} bannerKey={key} banner={banners[key]} />
      ))}
    </div>
  );
}
