import { useEffect, useState } from 'react';
import { History, X, Sword, Users } from 'lucide-react';
import { getAllCharBanners, getAllWeaponBanners, bustAllBannersCache, bustWeaponBannersCache } from '../utils/allBannersFetch';

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

function MiniPortrait({ name, src, isWeapon }) {
  if (!src && !name) return null;
  const fallback = src || (name && !isWeapon
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

function BannerRow({ b, i, prev, onClose }) {
  const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.past;
  const chars = [
    b.featured  && { name: b.featured,  src: b.featuredPortrait,  isWeapon: b.type === 'weapon' },
    b.featured2 && { name: b.featured2, src: b.featured2Portrait, isWeapon: b.type === 'weapon' },
  ].filter(Boolean);

  const isFuture  = b.status === 'upcoming' || b.status === 'leak';
  const isCurrent = b.status === 'current';
  const isFirst   = i === 0 || prev?.version !== b.version;

  return (
    <div className={`abt-row ${isCurrent ? 'abt-row--current' : ''} ${isFuture ? 'abt-row--future' : ''}`}>
      <div className="abt-version">{isFirst && b.version ? `v${b.version}` : ''}</div>
      <div className="abt-phase">{b.phase ? `P${b.phase}` : '—'}</div>
      <div className="abt-portraits">
        {chars.map((c, ci) => (
          <MiniPortrait key={ci} name={c.name} src={c.src} isWeapon={c.isWeapon} />
        ))}
        {chars.length === 0 && <div className="abt-portrait abt-portrait--placeholder">?</div>}
      </div>
      <div className="abt-names">
        <span className="abt-name1">{b.featured ?? '?'}</span>
        {b.featured2 && <span className="abt-name2"> + {b.featured2}</span>}
      </div>
      <div className="abt-dates">
        {b.startMs || b.endMs
          ? `${fmtDate(b.startMs)} → ${fmtDate(b.endMs)}`
          : b.source ? `Source : ${b.source}` : ''}
      </div>
      <div className="abt-status">
        {cfg.cls && <span className={cfg.cls}>{cfg.label}</span>}
      </div>
    </div>
  );
}

export function AllBannersTimeline({ onClose }) {
  const [tab, setTab]           = useState('character');
  const [charEntries, setChar]  = useState(null);
  const [weapEntries, setWeap]  = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { getAllCharBanners().then(setChar); }, []);
  useEffect(() => { if (tab === 'weapon' && !weapEntries) getAllWeaponBanners().then(setWeap); }, [tab]);

  useEffect(() => {
    function handleUpdate() {
      bustAllBannersCache();
      bustWeaponBannersCache();
      getAllCharBanners().then(setChar);
      if (tab === 'weapon') getAllWeaponBanners().then(setWeap);
    }
    window.addEventListener('upcoming-banners-updated', handleUpdate);
    return () => window.removeEventListener('upcoming-banners-updated', handleUpdate);
  }, [tab]);

  const entries = tab === 'weapon' ? (weapEntries ?? []) : (charEntries ?? []);
  const loading = tab === 'weapon' ? weapEntries === null : charEntries === null;

  const future  = entries.filter((e) => e.status !== 'past');
  const past    = entries.filter((e) => e.status === 'past');
  const visible = expanded ? entries : [...future, ...past.slice(0, 8)];

  return (
    <section className={onClose ? undefined : 'card abt-section'}>
      <div className="modal__header" style={{ marginBottom: '8px' }}>
        <h3 className="modal__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} /> Historique des bannières
        </h3>
        {onClose && (
          <button className="modal__close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Tab toggle */}
      <div className="abt-tabs" style={{ padding: '0 1.5rem 0.75rem' }}>
        <button
          className={`btn btn--sm ${tab === 'character' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => { setTab('character'); setExpanded(false); }}
        >
          <Users size={13} /> Personnages
        </button>
        <button
          className={`btn btn--sm ${tab === 'weapon' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => { setTab('weapon'); setExpanded(false); }}
        >
          <Sword size={13} /> Armes
        </button>
      </div>

      {loading && (
        <p style={{ padding: '1rem 1.5rem', color: 'var(--muted)', fontSize: '0.82rem' }}>
          Chargement…
        </p>
      )}

      {!loading && entries.length === 0 && (
        <p style={{ padding: '1rem 1.5rem', color: 'var(--muted)', fontSize: '0.82rem' }}>
          Aucune donnée disponible.
        </p>
      )}

      {!loading && entries.length > 0 && (
        <>
          <div className="abt-list" style={onClose ? { padding: '0 1.5rem' } : undefined}>
            {visible.map((b, i) => (
              <BannerRow key={i} b={b} i={i} prev={visible[i - 1]} onClose={onClose} />
            ))}
          </div>

          {past.length > 8 && (
            <button
              className="btn btn--ghost btn--sm abt-expand"
              style={onClose ? { margin: '0.5rem 1.5rem 1.5rem' } : undefined}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? 'Réduire'
                : `Voir les ${past.length - 8} bannières plus anciennes…`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
