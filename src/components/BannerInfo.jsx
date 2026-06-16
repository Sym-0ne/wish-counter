import { useState, useEffect, useRef } from 'react';
import { BANNER_CONFIG } from '../utils/banners';
import {
  getCharacterList,
  getWeaponList,
  findSlug,
  characterIconUrl,
  weaponIconUrl,
} from '../utils/genshinApi';
import { getCurrentBanners, isBannerStale } from '../utils/bannerFetch';

// Loads and caches the portrait URL for a character or weapon name.
function usePortrait(name, isWeapon) {
  const [iconUrl, setIconUrl] = useState(null);
  const lastFetched = useRef('');

  useEffect(() => {
    if (!name || name === lastFetched.current) return;
    lastFetched.current = name;
    setIconUrl(null);

    let cancelled = false;
    (async () => {
      try {
        const list = isWeapon ? await getWeaponList() : await getCharacterList();
        const slug = findSlug(list, name);
        if (!slug || cancelled) return;
        const url = isWeapon ? weaponIconUrl(slug) : characterIconUrl(slug);
        if (!cancelled) setIconUrl(url);
      } catch {
        // Portrait is decorative — fail silently
      }
    })();

    return () => { cancelled = true; };
  }, [name, isWeapon]);

  return iconUrl;
}

function FeaturedField({ label, value, placeholder, isWeapon, onChange }) {
  const portrait = usePortrait(value, isWeapon);
  const [imgError, setImgError] = useState(false);

  useEffect(() => setImgError(false), [portrait]);

  return (
    <div className="banner-info__field banner-info__field--featured">
      {portrait && !imgError && (
        <img
          src={portrait}
          alt={value}
          className="banner-info__portrait"
          onError={() => setImgError(true)}
        />
      )}
      {(!portrait || imgError) && (
        <div className="banner-info__portrait banner-info__portrait--placeholder">
          <span>?</span>
        </div>
      )}
      <div style={{ flex: 1 }}>
        <label>{label}</label>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export function BannerInfo({ bannerKey, banner, onChange, onOpenSync }) {
  const cfg = BANNER_CONFIG[bannerKey];
  const m = banner.metadata;
  const [autoFilled, setAutoFilled] = useState(false);

  // Auto-populate from banners-current.json when metadata is empty or stale.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const allBanners = await getCurrentBanners();
      if (cancelled || !allBanners) return;

      const remote = allBanners[bannerKey];
      if (!remote) return;

      if (!isBannerStale(m)) return;

      const patch = {};

      if (bannerKey === 'weapon') {
        if (remote.featuredWeapons?.length) {
          patch.featuredWeapons = remote.featuredWeapons;
        }
      } else if (remote.featured) {
        patch.featured = remote.featured;
      }

      if (remote.endDate)   patch.endDate   = remote.endDate;
      if (remote.startDate) patch.startDate  = remote.startDate;
      if (remote.version)   patch.version    = remote.version;
      if (remote.phase)     patch.phase      = remote.phase;

      if (Object.keys(patch).length && !cancelled) {
        onChange(patch);
        setAutoFilled(true);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerKey]);

  const update = (patch) => onChange(patch);

  const featuredName = bannerKey === 'weapon'
    ? (m.featuredWeapons?.[0] || '')
    : m.featured || '';

  const isStale = isBannerStale(m);
  const hasAnyData = featuredName || m.endDate;

  return (
    <div className="card">
      <div className="card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {cfg.longLabel}
        {autoFilled && !isStale && (
          <span
            className="badge badge--success"
            title="Données récupérées automatiquement"
            style={{ fontSize: '0.65rem', fontFamily: 'var(--font-body)' }}
          >
            ↻ auto
          </span>
        )}
        {isStale && hasAnyData && (
          <button
            className="badge"
            style={{
              fontSize: '0.65rem', fontFamily: 'var(--font-body)',
              background: 'color-mix(in srgb, var(--soft-pity) 20%, transparent)',
              color: 'var(--soft-pity)', border: '1px solid color-mix(in srgb, var(--soft-pity) 40%, transparent)',
              cursor: onOpenSync ? 'pointer' : 'default',
            }}
            title="Données expirées — syncronise pour mettre à jour"
            onClick={onOpenSync}
          >
            ↻ expiré
          </button>
        )}
      </div>

      <div className="banner-info__grid">
        {bannerKey !== 'standard' && (
          <FeaturedField
            label={bannerKey === 'weapon' ? 'Arme 1 featured' : 'Featured 5★'}
            value={featuredName}
            placeholder={bannerKey === 'weapon' ? 'Mistsplitter…' : 'Néfer…'}
            isWeapon={bannerKey === 'weapon'}
            onChange={(v) =>
              bannerKey === 'weapon'
                ? update({ featuredWeapons: [v, m.featuredWeapons?.[1] || ''] })
                : update({ featured: v })
            }
          />
        )}

        {bannerKey === 'weapon' && (
          <FeaturedField
            label="Arme 2 featured"
            value={m.featuredWeapons?.[1] || ''}
            placeholder="Skyward Atlas…"
            isWeapon={true}
            onChange={(v) =>
              update({ featuredWeapons: [m.featuredWeapons?.[0] || '', v] })
            }
          />
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
