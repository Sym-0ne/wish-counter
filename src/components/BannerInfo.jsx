import { BANNER_CONFIG } from '../utils/banners';

export function BannerInfo({ bannerKey, banner, onChange }) {
  const cfg = BANNER_CONFIG[bannerKey];
  const m = banner.metadata;

  const update = (patch) => onChange(patch);

  return (
    <div className="card">
      <div className="card__title">{cfg.longLabel}</div>

      <div className="banner-info__grid">
        {bannerKey !== 'standard' && (
          <div className="banner-info__field">
            <label>{bannerKey === 'weapon' ? 'Arme 1 featured' : 'Featured 5★'}</label>
            <input
              type="text"
              value={bannerKey === 'weapon' ? (m.featuredWeapons?.[0] || '') : m.featured}
              placeholder={bannerKey === 'weapon' ? 'Mistsplitter…' : 'Néfer…'}
              onChange={(e) =>
                bannerKey === 'weapon'
                  ? update({
                      featuredWeapons: [e.target.value, m.featuredWeapons?.[1] || ''],
                    })
                  : update({ featured: e.target.value })
              }
            />
          </div>
        )}

        {bannerKey === 'weapon' && (
          <div className="banner-info__field">
            <label>Arme 2 featured</label>
            <input
              type="text"
              value={m.featuredWeapons?.[1] || ''}
              placeholder="Skyward Atlas…"
              onChange={(e) =>
                update({
                  featuredWeapons: [m.featuredWeapons?.[0] || '', e.target.value],
                })
              }
            />
          </div>
        )}

        <div className="banner-info__field">
          <label>Version</label>
          <input
            type="text"
            value={m.version || ''}
            placeholder="6.5"
            onChange={(e) => update({ version: e.target.value })}
          />
        </div>

        <div className="banner-info__field">
          <label>Phase</label>
          <select value={m.phase || 1} onChange={(e) => update({ phase: Number(e.target.value) })}>
            <option value={1}>Phase 1</option>
            <option value={2}>Phase 2</option>
          </select>
        </div>

        <div className="banner-info__field">
          <label>Date de fin</label>
          <input
            type="date"
            value={m.endDate || ''}
            onChange={(e) => update({ endDate: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
