import { useEffect, useState } from 'react';
import { History, X } from 'lucide-react';
import { getAllCharBanners, bustAllBannersCache } from '../utils/allBannersFetch';

const STATUS_CONFIG = {
  current:  { label: 'En cours',  cls: 'abt-badge abt-badge--current'  },
  upcoming: { label: 'À venir',   cls: 'abt-badge abt-badge--upcoming' },
  leak:     { label: 'Leak',      cls: 'abt-badge abt-badge--leak'     },
  past:     { label: null,        cls: null                             },
};

function fmtDate(ms) {
  if (!ms) return '?';
  return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function MiniPortrait({ name, src }) {
  if (!src && !name) return null;
  const fallback = src || (name
    ? `https://enka.network/ui/UI_AvatarIcon_${name.replace(/\s+(\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toUpperCase())}.png`
    : null);
  if (!fallback) return null;
  return (
    <img
      src={fallback}
      alt={name ?? ''}
      className="abt-portrait"
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  );
}

export function AllBannersTimeline({ onClose }) {
  const [entries, setEntries] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { getAllCharBanners().then(setEntries); }, []);

  // Recharge quand UpcomingBanners vient de syncer avec GitHub
  useEffect(() => {
    function handleUpdate() {
      bustAllBannersCache();
      getAllCharBanners().then(setEntries);
    }
    window.addEventListener('upcoming-banners-updated', handleUpdate);
    return () => window.removeEventListener('upcoming-banners-updated', handleUpdate);
  }, []);

  if (!entries) return null;
  if (entries.length === 0) return null;

  // Separate future/current from past for progressive disclosure
  const future = entries.filter((e) => e.status !== 'past');
  const past   = entries.filter((e) => e.status === 'past');
  const visible = expanded ? entries : [...future, ...past.slice(0, 8)];

  return (
    <section className={onClose ? undefined : 'card abt-section'}>
      <div className="modal__header" style={{ marginBottom: '8px' }}>
        <h3 className="modal__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} /> Historique des bannières perso
        </h3>
        {onClose && (
          <button className="modal__close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="abt-list" style={onClose ? { padding: '0 1.5rem' } : undefined}>
        {visible.map((b, i) => {
          const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.past;
          const chars = [
            b.featured  && { name: b.featured,  src: b.featuredPortrait },
            b.featured2 && { name: b.featured2, src: b.featured2Portrait },
          ].filter(Boolean);

          const isFuture = b.status === 'upcoming' || b.status === 'leak';
          const isFirst = i === 0 || visible[i - 1].version !== b.version;
          const isCurrent = b.status === 'current';

          return (
            <div key={i} className={`abt-row ${isCurrent ? 'abt-row--current' : ''} ${isFuture ? 'abt-row--future' : ''}`}>
              {/* Version label — shown once per version group */}
              <div className="abt-version">
                {isFirst && b.version ? `v${b.version}` : ''}
              </div>

              {/* Phase */}
              <div className="abt-phase">
                {b.phase ? `P${b.phase}` : '—'}
              </div>

              {/* Portraits */}
              <div className="abt-portraits">
                {chars.map((c, ci) => (
                  <MiniPortrait key={ci} name={c.name} src={c.src} />
                ))}
                {chars.length === 0 && (
                  <div className="abt-portrait abt-portrait--placeholder">?</div>
                )}
              </div>

              {/* Names */}
              <div className="abt-names">
                <span className="abt-name1">{b.featured ?? '?'}</span>
                {b.featured2 && (
                  <span className="abt-name2"> + {b.featured2}</span>
                )}
              </div>

              {/* Dates */}
              <div className="abt-dates">
                {b.startMs || b.endMs
                  ? `${fmtDate(b.startMs)} → ${fmtDate(b.endMs)}`
                  : b.source ? `Source : ${b.source}` : ''}
              </div>

              {/* Status badge (only for non-past) */}
              <div className="abt-status">
                {cfg.cls && (
                  <span className={cfg.cls}>{cfg.label}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {past.length > 8 && (
        <button
          className="btn btn--ghost btn--sm abt-expand"
          style={onClose ? { margin: '0.5rem 1.5rem 1.5rem' } : undefined}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? `Réduire`
            : `Voir les ${past.length - 8} bannières plus anciennes…`}
        </button>
      )}
    </section>
  );
}
