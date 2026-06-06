import { useState, useEffect, useRef } from 'react';
import { BANNER_CONFIG } from '../utils/banners';
import {
  getCharacterList,
  getWeaponList,
  findSlug,
  characterIconUrl,
  weaponIconUrl,
} from '../utils/genshinApi';

/**
 * Charge et cache le portrait associé à un nom de personnage/arme.
 * Retourne l'URL de l'image ou null si non trouvé.
 */
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
        // Silencieux — le portrait est décoratif
      }
    })();

    return () => { cancelled = true; };
  }, [name, isWeapon]);

  return iconUrl;
}

function FeaturedField({ label, value, placeholder, isWeapon, onChange }) {
  const portrait = usePortrait(value, isWeapon);
  const [imgError, setImgError] = useState(false);

  // Reset l'erreur si l'URL change
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

export function BannerInfo({ bannerKey, banner, onChange }) {
  const cfg = BANNER_CONFIG[bannerKey];
  const m = banner.metadata;

  const update = (patch) => onChange(patch);

  // Nom principal featured (personnage ou arme 1)
  const featuredName = bannerKey === 'weapon'
    ? (m.featuredWeapons?.[0] || '')
    : m.featured || '';

  return (
    <div className="card">
      <div className="card__title">{cfg.longLabel}</div>

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
