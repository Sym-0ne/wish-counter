import { useState, useMemo } from 'react';
import { BANNER_CONFIG } from '../utils/banners';

const PAGE_SIZE = 50;

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function WishHistory({ banner, bannerKey, versionFilter }) {
  const cfg = BANNER_CONFIG[bannerKey];
  const [page, setPage] = useState(1);

  // Filtre par version + tri reverse chrono
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
            <HistoryRow key={wish.id} wish={wish} bannerKey={bannerKey} cfg={cfg} />
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

function HistoryRow({ wish, bannerKey, cfg }) {
  const isSoftPity = wish.rank === 5 && wish.pityAt && wish.pityAt >= cfg.softPity5;
  const showFeaturedBadge = wish.rank === 5 && (cfg.has5050 || cfg.hasFatePoints);
  return (
    <div className={`history__item history__item--rank-${wish.rank}`}>
      <span className={`history__rank history__rank--${wish.rank}`}>{wish.rank}★</span>
      <span className="history__name">
        {wish.name || (wish.rank === 3 ? 'Arme 3★' : '—')}
        {showFeaturedBadge && (
          <span
            className={`history__featured ${
              wish.featured ? 'history__featured--won' : 'history__featured--lost'
            }`}
          >
            {bannerKey === 'weapon'
              ? wish.featured ? 'ciblée' : 'non-ciblée'
              : wish.featured ? 'win' : 'loss'}
          </span>
        )}
      </span>
      <span className={`history__pity ${isSoftPity ? 'history__pity--soft' : ''}`}>
        {wish.pityAt ? `pity ${wish.pityAt}` : '—'}
      </span>
      <span className="history__date">{formatDate(wish.timestamp)}</span>
      <span className="history__version">v{wish.version || '—'}</span>
    </div>
  );
}
