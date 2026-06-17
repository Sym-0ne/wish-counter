import { Sparkles, BarChart3, Layers, History, RefreshCw, Settings as SettingsIcon, Star } from 'lucide-react';
import { BANNER_CONFIG, BANNER_KEYS } from '../utils/banners';
import { ProfileBar } from './ProfileBar';

function SyncButton({ sync, syncing, onOpenSync }) {
  const hasConfig = sync?.workerUrl && sync?.authkeyUrl;
  const lastSync = sync?.lastSync;

  let label = 'Sync';
  let title = 'Synchroniser les vœux';

  if (syncing) {
    label = '…';
    title = 'Synchronisation en cours';
  } else if (lastSync) {
    const diff = Date.now() - new Date(lastSync).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    if (hours > 0) label = `${hours}h`;
    else if (mins > 0) label = `${mins}m`;
    else label = 'Sync ✓';
  }

  return (
    <button
      className={`btn btn--ghost btn--small sync-header-btn ${!hasConfig ? 'sync-header-btn--unconfigured' : ''}`}
      onClick={onOpenSync}
      title={title}
    >
      <RefreshCw size={13} className={syncing ? 'spin' : ''} />
      <span>{label}</span>
    </button>
  );
}

export function Header({ activeBanner, view, onBannerChange, onViewChange, onOpenSettings, onOpenSync, sync, syncing, profileProps }) {
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
          <button
            className={view === 'history' ? 'active' : ''}
            onClick={() => onViewChange('history')}
          >
            <History size={14} style={{ marginRight: 4 }} />
            Historique
          </button>
          <button
            className={view === 'wishlist' ? 'active' : ''}
            onClick={() => onViewChange('wishlist')}
          >
            <Star size={14} style={{ marginRight: 4 }} />
            Wishlist
          </button>
        </div>

        <SyncButton sync={sync} syncing={syncing} onOpenSync={onOpenSync} />

        {profileProps?.profiles && (
          <ProfileBar
            profiles={profileProps.profiles}
            activeProfileId={profileProps.activeProfileId}
            onSwitch={profileProps.onSwitch}
            onCreate={profileProps.onCreate}
            onRename={profileProps.onRename}
            onDelete={profileProps.onDelete}
          />
        )}
        <button className="btn btn--ghost btn--small" onClick={onOpenSettings} title="Réglages">
          <SettingsIcon size={16} />
        </button>
      </div>
    </header>
  );
}
