import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { getUpcomingBanners } from '../utils/bannerFetch';

const BANNER_LABEL = {
  character:  'Perso',
  weapon:     'Arme',
  chronicled: 'Archivé',
  standard:   'Standard',
};

const CONFIDENCE_LABEL = {
  officiel: { text: 'Officiel', cls: 'badge badge--success' },
  leak:     { text: 'Leak',    cls: 'badge badge--soft badge--pulse' },
};

function formatDate(dateStr) {
  if (!dateStr) return '?';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function UpcomingBanners() {
  const [banners, setBanners] = useState(null);

  useEffect(() => {
    getUpcomingBanners().then(setBanners);
  }, []);

  if (banners === null) return null;
  if (banners.length === 0) return null;

  return (
    <section className="card ub-section">
      <h3 className="card__title">
        <CalendarClock size={18} /> Prochaines bannières
      </h3>

      <div className="ub-list">
        {banners.map((b, i) => {
          const conf = CONFIDENCE_LABEL[b.confidence] ?? CONFIDENCE_LABEL.leak;
          const name = b.featured ?? '?';
          const name2 = b.featured2;
          const portrait = b.featuredPortrait;

          return (
            <div key={i} className="ub-card">
              <div className="ub-card__portrait-wrap">
                {portrait ? (
                  <img
                    src={portrait}
                    alt={name}
                    className="ub-card__portrait"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="ub-card__portrait ub-card__portrait--placeholder">?</div>
                )}
              </div>

              <div className="ub-card__body">
                <div className="ub-card__name">
                  {name}
                  {name2 && <span className="ub-card__name2"> + {name2}</span>}
                </div>

                <div className="ub-card__meta">
                  <span className="badge badge--ghost">{BANNER_LABEL[b.bannerKey] ?? b.bannerKey}</span>
                  {b.version && <span className="badge badge--ghost">v{b.version}</span>}
                  <span className={conf.cls}>{conf.text}</span>
                  {b.source && <span className="ub-card__source">{b.source}</span>}
                </div>

                {(b.startDate || b.endDate) && (
                  <div className="ub-card__dates">
                    {b.startDate ? formatDate(b.startDate) : '?'}
                    {' → '}
                    {b.endDate ? formatDate(b.endDate) : '?'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
