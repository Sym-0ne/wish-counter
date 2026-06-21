import { useEffect, useState } from 'react';
import { getCurrentBanners } from '../utils/bannerFetch';
import { resolveBannerArtUrl } from '../utils/bannerArt';

/**
 * Fond plein écran fixe, basé sur l'illustration de la bannière personnage en cours.
 * N'affiche rien si aucune image ne résout — le fond uni (--bg) reste visible,
 * jamais d'état "cassé".
 */
export function DynamicBackground() {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentBanners().then((banners) => {
      const c = banners?.character;
      if (!c?.featured || cancelled) return;
      resolveBannerArtUrl(c.featured, c.featured2).then((resolved) => {
        if (!cancelled && resolved) setUrl(resolved);
      });
    });
    return () => { cancelled = true; };
  }, []);

  if (!url) return null;

  return (
    <div className="dynamic-bg" style={{ backgroundImage: `url(${url})` }} aria-hidden="true" />
  );
}
