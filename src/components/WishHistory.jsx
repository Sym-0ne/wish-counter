import { useState, useMemo } from 'react';
import { BANNER_CONFIG, PRIMO_PER_WISH } from '../utils/banners';

const PAGE_SIZE = 50;

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function WishHistory({ banner, bannerKey, versionFilter, onUpdateWish }) {
  const cfg = BANNER_CONFIG[bannerKey];
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const list = banner.history;
    const arr = versionFilter ? list.filter(w => w.version === versionFilter) : list;
    return [...arr].reverse();
  }, [banner.history, versionFilter]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > visible.length;

  return (
    <div className="card">
      <div className="card__title">
        Historique
        <span className="muted text-xs" style={{ marginLeft: 8, fontWeight: 400 }}>
          ({filtered.length} tirage{filtered.length > 1 ? 's' : ''})
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="history__empty">
          Aucun tirage enregistré{versionFilter ? ` pour la version ${versionFilter}` : ''}.
        </div>
      ) : (
        <div className="history__list">
          {visible.map((wish) => (
            <HistoryRow
              key={wish.id}
              wish={wish}
              bannerKey={bannerKey}
              cfg={cfg}
              onUpdateWish={onUpdateWish}
            />
          ))}
          {hasMore && (
            <div className="history__more" onClick={() => setPage(page + 1)}>
              Voir plus ({filtered.length - visible.length} restants)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ wish, bannerKey, cfg, onUpdateWish }) {
  const isSoftPity = wish.rank === 5 && wish.pityAt && wish.pityAt >= cfg.softPity5;
  const showFeaturedBadge = wish.rank === 5 && (cfg.has5050 || cfg.hasFatePoints);

  function cycleFeatured() {
    if (!onUpdateWish) return;
    // Cycle: null/undefined → true → false → null
    const next = (wish.featured == null) ? true : wish.featured === true ? false : null;
    onUpdateWish(wish.id, { featured: next });
  }

  const featuredLabel = () => {
    if (bannerKey === 'weapon') {
      return wish.featured === true ? 'ciblée' : wish.featured === false ? 'non-ciblée' : '?';
    }
    return wish.featured === true ? 'win' : wish.featured === false ? 'loss' : '?';
  };

  const featuredClass = () => {
    if (wish.featured === true)  return 'history__featured--won';
    if (wish.featured === false) return 'history__featured--lost';
    return 'history__featured--unknown';
  };

  return (
    <div className={`history__item history__item--rank-${wish.rank}`}>
      <span className={`history__rank history__rank--${wish.rank}`}>{wish.rank}★</span>
      <span className="history__name">
        {wish.name || (wish.rank === 3 ? 'Arme 3★' : '—')}
        {showFeaturedBadge && (
          <button
            type="button"
            className={`history__featured history__featured--interactive ${featuredClass()}`}
            onClick={cycleFeatured}
            title="Cliquer pour modifier : ? → win → loss → ?"
          >
            {featuredLabel()}
          </button>
        )}
      </span>
      <span className={`history__pity ${isSoftPity ? 'history__pity--soft' : ''}`}>
        {wish.pityAt ? `pity ${wish.pityAt}` : '—'}
      </span>
      {wish.rank === 5 && wish.pityAt && (
        <span className="history__cost" title="Coût estimé en primogemmes">
          {(wish.pityAt * PRIMO_PER_WISH).toLocaleString('fr-FR')} ✦
        </span>
      )}
      <span className="history__date">{formatDate(wish.timestamp)}</span>
      <span className="history__version">v{wish.version || '—'}</span>
    </div>
  );
}
