import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ComposedChart, Line, Legend,
} from 'recharts';
import { BANNER_CONFIG, BANNER_KEYS } from '../utils/banners';
import { useBannerStats } from '../hooks/useDerivedStats';
import { BarChart3, Sparkles, Target, TrendingUp, TrendingDown, Activity, GitBranch } from 'lucide-react';

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
    const allPities = [];
    let wins = 0;
    let losses = 0;
    for (const key of BANNER_KEYS) {
      const b = banners[key];
      if (!b) continue;
      total += b.history.length;
      let pity = 0;
      let isGuaranteed = false;
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
        }
      }
    }
    const avg = allPities.length > 0
      ? allPities.reduce((a, b) => a + b, 0) / allPities.length
      : null;
    const total5050 = wins + losses;
    return {
      total,
      fiveStars,
      avg,
      winRate: total5050 > 0 ? (wins / total5050) * 100 : null,
      wins,
      losses,
      primosSpent: total * 160,
    };
  }, [banners]);

  return (
    <section className="card">
      <h3 className="card__title">
        <Activity size={18} /> Vue d'ensemble
      </h3>
      <div className="stats-grid">
        <StatTile label="Total tirages" value={aggregate.total} icon={Activity} />
        <StatTile label="5★ obtenus" value={aggregate.fiveStars} icon={Sparkles} />
        <StatTile
          label="Primogemmes dépensées"
          value={aggregate.primosSpent.toLocaleString('fr-FR')}
          icon={Target}
        />
        <StatTile
          label="Pity moyen (toutes bannières)"
          value={aggregate.avg != null ? aggregate.avg.toFixed(1) : '—'}
          icon={Target}
        />
        <StatTile
          label="Win rate 50/50 global"
          value={aggregate.winRate != null ? `${aggregate.winRate.toFixed(0)}%` : '—'}
          sub={aggregate.winRate != null ? `${aggregate.wins}W / ${aggregate.losses}L` : null}
          icon={Target}
        />
      </div>
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
      let isGuaranteed = false;

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
      <VersionHistory banners={banners} />
      {BANNER_KEYS.map((key) => (
        <BannerStats key={key} bannerKey={key} banner={banners[key]} />
      ))}
    </div>
  );
}
