import { useMemo, useState, useEffect } from 'react';
import { History, Pencil } from 'lucide-react';
import { BANNER_CONFIG, BANNER_KEYS } from '../utils/banners';
import { getCharacterList, getWeaponList, findItem } from '../utils/genshinApi';
import { getBannerHistory, findBannerForTimestamp, inferFeatured } from '../utils/bannerHistory';

// ── Portrait cache ──────────────────────────────────────────────────────────

const portraitCache = {};

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

// ── Grouping ────────────────────────────────────────────────────────────────

function usePullGroups(banners, filterKey, bannerHistory) {
  return useMemo(() => {
    const targetKeys = filterKey === 'all' ? BANNER_KEYS : [filterKey];
    const byGroup = {};

    for (const bannerKey of targetKeys) {
      const history = banners[bannerKey]?.history ?? [];

      for (const wish of history) {
        const bannerInfo = wish.timestamp
          ? findBannerForTimestamp(bannerHistory, bannerKey, wish.timestamp)
          : null;

        // Group key: prefer banner period, fall back to game version
        const gk = bannerInfo
          ? `${bannerKey}__${bannerInfo.startMs}`
          : `${bannerKey}__v${wish.version ?? 'unknown'}`;

        if (!byGroup[gk]) {
          byGroup[gk] = {
            key: gk,
            bannerKey,
            bannerInfo: bannerInfo ?? null,
            version: wish.version ?? null,
            totalWishes: 0,
            fiveStars: [],
            lastTs: 0,
          };
        }

        byGroup[gk].totalWishes++;
        if (wish.timestamp > byGroup[gk].lastTs) byGroup[gk].lastTs = wish.timestamp;

        if (wish.rank === 5) {
          byGroup[gk].fiveStars.push({
            id:        wish.id,
            name:      wish.name || '?',
            pityAt:    wish.pityAt ?? null,
            featured:  wish.featured,
            itemType:  wish.itemType ?? 'character',
            timestamp: wish.timestamp,
            bannerKey,
            bannerInfo,
          });
        }
      }
    }

    return Object.values(byGroup)
      .filter((g) => g.fiveStars.length > 0)
      .sort((a, b) => b.lastTs - a.lastTs);
  }, [banners, filterKey, bannerHistory]);
}

// ── PullRow ─────────────────────────────────────────────────────────────────

function PullRow({ pull, getPortrait, onUpdateWish }) {
  const cfg = BANNER_CONFIG[pull.bannerKey];
  const showWinLoss = cfg.has5050 || cfg.hasFatePoints;

  const url = getPortrait(pull.name);
  const [imgErr, setImgErr] = useState(false);

  const date = pull.timestamp
    ? new Date(pull.timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: '2-digit',
      })
    : null;

  // Win/loss : valeur stockée (peut être null) + valeur inférée
  const inferred  = showWinLoss ? inferFeatured(pull.bannerInfo, pull.name) : null;
  const effective = pull.featured !== null ? pull.featured : inferred;
  const isAuto    = pull.featured === null && inferred !== null;
  const hasInfo   = effective !== null;

  function cycleFeatured() {
    if (!onUpdateWish) return;
    const next = pull.featured === null ? true : pull.featured === true ? false : null;
    onUpdateWish(pull.bannerKey, pull.id, { featured: next });
  }

  const winLabel =
    pull.bannerKey === 'weapon'
      ? (effective === true ? 'ciblée' : effective === false ? 'non-ciblée' : '?')
      : (effective === true ? 'Win'    : effective === false ? 'Perte'      : '?');

  const badgeCls = [
    'badge bh-badge',
    effective === true  ? 'badge--win'  : '',
    effective === false ? 'badge--loss' : '',
    !hasInfo            ? 'badge--unknown' : '',
    isAuto              ? 'bh-badge--auto' : '',
    onUpdateWish        ? 'bh-badge--interactive' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="bh-pull">
      {url && !imgErr ? (
        <img src={url} alt={pull.name} className="bh-pull__portrait" onError={() => setImgErr(true)} />
      ) : (
        <div className="bh-pull__portrait bh-pull__portrait--placeholder">★</div>
      )}

      <div className="bh-pull__info">
        <span className="bh-pull__name">{pull.name}</span>
        {date && <span className="bh-pull__date">{date}</span>}
      </div>

      <div className="bh-pull__badges">
        {pull.pityAt != null && (
          <span className={`badge ${pull.pityAt >= 74 ? 'badge--soft' : ''}`} title="Pity">
            {pull.pityAt}✦
          </span>
        )}
        {showWinLoss && (
          <button
            type="button"
            className={badgeCls}
            onClick={onUpdateWish ? cycleFeatured : undefined}
            title={
              isAuto
                ? 'Auto-détecté depuis paimon.moe · Cliquer pour modifier'
                : 'Cliquer pour modifier : Win → Perte → Auto'
            }
          >
            {isAuto && <span className="bh-badge__auto-dot" title="auto" />}
            {winLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ── GroupCard ────────────────────────────────────────────────────────────────

function BannerHeaderPortrait({ src, name }) {
  const [err, setErr] = useState(false);
  if (!src || err) return null;
  return (
    <img
      src={src}
      alt={name}
      className="bh-card__feat-portrait"
      onError={() => setErr(true)}
    />
  );
}

function GroupCard({ group, getPortrait, onUpdateWish }) {
  const cfg = BANNER_CONFIG[group.bannerKey];
  const [expanded, setExpanded] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const bi = group.bannerInfo;
  const versionLabel = bi?.version
    ? `v${bi.version}`
    : group.version === 'sync' ? 'Sync' : group.version ? `v${group.version}` : '—';

  // Compute win stats for the group
  const wins   = group.fiveStars.filter(p => p.featured === true  || (p.featured === null && inferFeatured(bi, p.name) === true)).length;
  const losses = group.fiveStars.filter(p => p.featured === false || (p.featured === null && inferFeatured(bi, p.name) === false)).length;
  const unknown = group.fiveStars.length - wins - losses;

  return (
    <div className="bh-card">
      {/* Header */}
      <div className="bh-card__header-row">
        <button className="bh-card__header" onClick={() => setExpanded((e) => !e)}>
          <div className="bh-card__header-left">
            {bi && (
              <div className="bh-card__feat-portraits">
                <BannerHeaderPortrait src={bi.featuredPortrait}  name={bi.featured}  />
                <BannerHeaderPortrait src={bi.featured2Portrait} name={bi.featured2} />
              </div>
            )}
            <div className="bh-card__header-text">
              <span className="bh-card__version" style={{ color: cfg.color }}>{versionLabel}</span>
              <span className="bh-card__banner-name">{cfg.label}</span>
              {bi?.featured && (
                <span className="bh-card__featured-names">
                  {bi.featured}{bi.featured2 ? ` + ${bi.featured2}` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="bh-card__header-right">
            <span className="bh-card__meta">
              {group.fiveStars.length} × 5★ · {group.totalWishes} tirages
            </span>
            {(wins > 0 || losses > 0) && (
              <span className="bh-card__wl-summary">
                {wins > 0   && <span className="bh-card__wl--win">{wins}W</span>}
                {losses > 0 && <span className="bh-card__wl--loss">{losses}L</span>}
                {unknown > 0 && <span className="bh-card__wl--unk">{unknown}?</span>}
              </span>
            )}
            <span className="bh-card__chevron">{expanded ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* Manual override button */}
        <button
          className="btn btn--ghost btn--small bh-card__edit-btn"
          title="Modifier les infos de cette bannière manuellement"
          onClick={() => setEditOpen((v) => !v)}
        >
          <Pencil size={12} />
        </button>
      </div>

      {/* Manual edit panel */}
      {editOpen && (
        <ManualEditPanel group={group} onClose={() => setEditOpen(false)} onUpdateWish={onUpdateWish} />
      )}

      {/* Pull list */}
      {expanded && (
        <div className="bh-card__pulls">
          {group.fiveStars.map((pull, i) => (
            <PullRow
              key={`${pull.id ?? i}`}
              pull={pull}
              getPortrait={getPortrait}
              onUpdateWish={onUpdateWish}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Manual edit panel ────────────────────────────────────────────────────────

function ManualEditPanel({ group, onClose, onUpdateWish }) {
  return (
    <div className="bh-edit-panel">
      <p className="bh-edit-panel__title">
        Modifier manuellement les Win/Loss de ce groupe
      </p>
      <div className="bh-edit-panel__pulls">
        {group.fiveStars.map((pull, i) => {
          const cfg = BANNER_CONFIG[pull.bannerKey];
          const showWinLoss = cfg.has5050 || cfg.hasFatePoints;
          if (!showWinLoss) return null;

          const inferred  = inferFeatured(pull.bannerInfo, pull.name);
          const effective = pull.featured !== null ? pull.featured : inferred;

          function set(val) {
            if (!onUpdateWish) return;
            onUpdateWish(pull.bannerKey, pull.id, { featured: val });
          }

          const winLabel  = pull.bannerKey === 'weapon' ? 'Ciblée'     : 'Win';
          const lossLabel = pull.bannerKey === 'weapon' ? 'Non-ciblée' : 'Perte';

          return (
            <div key={`${pull.id ?? i}`} className="bh-edit-pull">
              <span className="bh-edit-pull__name">{pull.name}</span>
              <div className="bh-edit-pull__btns">
                <button
                  className={`btn btn--small ${effective === true  ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => set(true)}
                >{winLabel}</button>
                <button
                  className={`btn btn--small ${effective === false ? 'btn--danger'  : 'btn--ghost'}`}
                  onClick={() => set(false)}
                >{lossLabel}</button>
                <button
                  className={`btn btn--small ${pull.featured === null ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => set(null)}
                  title="Réinitialiser (auto-détection)"
                >Auto</button>
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn btn--ghost btn--small" style={{ marginTop: 8 }} onClick={onClose}>
        Fermer
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',        label: 'Tous' },
  { key: 'character',  label: 'Personnage' },
  { key: 'weapon',     label: 'Arme' },
  { key: 'standard',   label: 'Standard' },
  { key: 'chronicled', label: 'Chroniques' },
];

export function BannerHistory({ banners, onUpdateWish }) {
  const [filter,        setFilter]        = useState('all');
  const [bannerHistory, setBannerHistory] = useState(null);

  useEffect(() => {
    getBannerHistory().then(setBannerHistory);
  }, []);

  const groups    = usePullGroups(banners, filter, bannerHistory);
  const allEvents = useMemo(() => groups.flatMap((g) => g.fiveStars), [groups]);
  const getPortrait = usePortraits(allEvents);

  return (
    <div className="section-spacing">
      <section className="card">
        <h3 className="card__title">
          <History size={18} /> Historique des bannières
        </h3>
        <p className="card__subtitle">
          Tous tes 5★, regroupés par bannière.
          {bannerHistory && bannerHistory.character.length > 0
            ? ' Win/Loss auto-détecté depuis les données paimon.moe.'
            : ' Chargement des données de bannières…'}
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
          key={g.key}
          group={g}
          getPortrait={getPortrait}
          onUpdateWish={onUpdateWish}
        />
      ))}
    </div>
  );
}
