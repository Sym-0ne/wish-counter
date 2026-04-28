import { Sparkles, BarChart3, Layers, Settings as SettingsIcon } from 'lucide-react';
import { BANNER_CONFIG, BANNER_KEYS } from '../utils/banners';

export function Header({ activeBanner, view, onBannerChange, onViewChange, onOpenSettings }) {
  return (
    <header className="header">
      <div className="header__inner">
        <h1 className="header__title">
          <Sparkles size={20} />
          Wish Tracker
        </h1>

        {view === 'banner' && (
          <div className="header__tabs">
            {BANNER_KEYS.map((key) => (
              <button
                key={key}
                className={`header__tab ${activeBanner === key ? 'active' : ''}`}
                onClick={() => onBannerChange(key)}
              >
                {BANNER_CONFIG[key].label}
              </button>
            ))}
          </div>
        )}

        {view !== 'banner' && <div style={{ flex: 1 }} />}

        <div className="header__view-toggle">
          <button className={view === 'banner' ? 'active' : ''} onClick={() => onViewChange('banner')}>
            <Sparkles size={14} style={{ marginRight: 4 }} />
            Bannière
          </button>
          <button className={view === 'stats' ? 'active' : ''} onClick={() => onViewChange('stats')}>
            <BarChart3 size={14} style={{ marginRight: 4 }} />
            Stats
          </button>
          <button
            className={view === 'collection' ? 'active' : ''}
            onClick={() => onViewChange('collection')}
          >
            <Layers size={14} style={{ marginRight: 4 }} />
            Collection
          </button>
        </div>

        <button className="btn btn--ghost btn--small" onClick={onOpenSettings} title="Réglages">
          <SettingsIcon size={16} />
        </button>
      </div>
    </header>
  );
}
