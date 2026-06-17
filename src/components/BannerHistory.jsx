import { useMemo, useState, useEffect } from 'react';
import { History } from 'lucide-react';
import { BANNER_CONFIG, BANNER_KEYS } from '../utils/banners';
import {
  getCharacterList,
  getWeaponList,
  findItem,
} from '../utils/genshinApi';

// ── Portrait cache ──────────────────────────────────────────────────────────

const portraitCache = {}; // name → url | null

async function resolvePortrait(name, itemType) {
  if (name in portraitCache) return;
  try {
    const list = itemType === 'character' ? await getCharacterList() : await getWeaponList();
    const item = findItem(list, name);
    portraitCache[name] = item?.portraitUrl ?? null;
  } catch {
    portraitCache[name] = null;
  }
}

function usePortraits(events) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unique = [...new Map(events.map(e => [e.name, e.itemType])).entries()];
    const missing = unique.filter(([name]) => !(name in portraitCache));
    if (!missing.length) return;

    Promise.all(missing.map(([name, type]) => resolvePortrait(name, type))).then(() =>
      setTick((t) => t + 1)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  return (name) => portraitCache[name] ?? null;
}

// ── Data derivation ─────────────────────────────────────────────────────────

function usePullGroups(banners, filterKey) {
  return useMemo(() => {
    const targetKeys = filterKey === 'all' ? BANNER_KEYS : [filterKey];
    const byGroup = {}; // `${version}__${bannerKey}` → group

    for (const bannerKey of targetKeys) {
      const history = banners[bannerKey]?.history ?? [];

      for (const wish of history) {
        const ver = wish.version || 'sync';
        const gk = `${ver}__${bannerKey}`;
        if (!byGroup[gk]) {
          byGroup[gk] = { version: ver, bannerKey, totalWishes: 0, fiveStars: [], lastTs: 0 };
        }
        byGroup[gk].totalWishes++;
        if (wish.timestamp > byGroup[gk].lastTs) byGroup[gk].lastTs = wish.timestamp;

        if (wish.rank === 5) {
          byGroup[gk].fiveStars.push({
            name: wish.name || '?',
            pityAt: wish.pityAt ?? null,
            featured: wish.featured,
            itemType: wish.itemType ?? 'character',
            timestamp: wish.timestamp,
          });
        }
      }
    }

    return Object.values(byGroup)
      .filter((g) => g.fiveStars.length > 0)
      .sort((a, b) => b.lastTs - a.lastTs);
  }, [banners, filterKey]);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PullRow({ pull, getPortrait }) {
  const url = getPortrait(pull.name);
  const [imgErr, setImgErr] = useState(false);

  const featuredLabel =
    pull.featured === true ? { text: 'Win', cls: 'badge--win' }
    : pull.featured === false ? { text: 'Perte', cls: 'badge--loss' }
    : null;

  const date = pull.timestamp
    ? new Date(pull.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
    : null;

  return (
    <div className="bh-pull">
      {url && !imgErr ? (
        <img
          src={url}
          alt={pull.name}
          className="bh-pull__portrait"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="bh-pull__portrait bh-pull__portrait--placeholder">★</div>
      )}

      <div className="bh-pull__info">
        <span className="bh-pull__name">{pull.name}</span>
        {date && <span className="bh-pull__date">{date}</span>}
      </div>

      <div className="bh-pull__badges">
        {pull.pityAt != null && (
          <span
            className={`badge ${pull.pityAt >= 74 ? 'badge--soft' : ''}`}
            title="Pity"
          >
            {pull.pityAt}✦
          </span>
        )}
        {featuredLabel && (
          <span className={`badge ${featuredLabel.cls}`}>{featuredLabel.text}</span>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group, getPortrait }) {
  const cfg = BANNER_CONFIG[group.bannerKey];
  const [expanded, setExpanded] = useState(true);

  const versionLabel = group.version === 'sync' ? 'Sync' : `v${group.version}`;

  return (
    <div className="bh-card">
      <button className="bh-card__header" onClick={() => setExpanded((e) => !e)}>
        <span className="bh-card__version" style={{ color: cfg.color }}>
          {versionLabel}
        </span>
        <span className="bh-card__banner-name">{cfg.label}</span>
        <span className="bh-card__meta">
          {group.fiveStars.length} × 5★ · {group.totalWishes} tirages
        </span>
        <span className="bh-card__chevron">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="bh-card__pulls">
          {group.fiveStars.map((pull, i) => (
            <PullRow key={i} pull={pull} getPortrait={getPortrait} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'character', label: 'Personnage' },
  { key: 'weapon', label: 'Arme' },
  { key: 'standard', label: 'Standard' },
  { key: 'chronicled', label: 'Chroniques' },
];

export function BannerHistory({ banners }) {
  const [filter, setFilter] = useState('all');
  const groups = usePullGroups(banners, filter);

  const allEvents = useMemo(
    () => groups.flatMap((g) => g.fiveStars),
    [groups]
  );
  const getPortrait = usePortraits(allEvents);

  return (
    <div className="section-spacing">
      <section className="card">
        <h3 className="card__title">
          <History size={18} /> Historique des bannières
        </h3>
        <p className="card__subtitle">
          Tous tes 5★ obtenus, regroupés par version et bannière.
        </p>

        <div className="bh-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`btn btn--small ${filter === f.key ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {groups.length === 0 && (
        <div className="card">
          <div className="empty-state">
            Aucun 5★ enregistré{filter !== 'all' ? ' pour cette bannière' : ''}.
          </div>
        </div>
      )}

      {groups.map((g) => (
        <GroupCard
          key={`${g.version}__${g.bannerKey}`}
          group={g}
          getPortrait={getPortrait}
        />
      ))}
    </div>
  );
}
