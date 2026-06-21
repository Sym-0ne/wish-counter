import { Sparkles, BarChart3, Layers, History, RefreshCw, Settings as SettingsIcon, Star, Download } from 'lucide-react';
import { BANNER_CONFIG, BANNER_KEYS } from '../utils/banners';
import { ProfileBar } from './ProfileBar';
import { useEffect, useState } from 'react';

function InstallButton() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstalled(true); setPrompt(null); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt || installed) return null;

  return (
    <button
      className="btn btn--ghost btn--small"
      title="Installer l'application"
      onClick={async () => {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') setInstalled(true);
        setPrompt(null);
      }}
    >
      <Download size={14} />
    </button>
  );
}

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

const VIEW_NAV = [
  { key: 'banner', label: 'Bannière', shortLabel: 'Vœux', Icon: Sparkles },
  { key: 'stats', label: 'Stats', shortLabel: 'Stats', Icon: BarChart3 },
  { key: 'collection', label: 'Collection', shortLabel: 'Collec.', Icon: Layers },
  { key: 'history', label: 'Historique', shortLabel: 'Histo', Icon: History },
  { key: 'wishlist', label: 'Wishlist', shortLabel: 'Wishlist', Icon: Star },
];

function MobileBottomNav({ view, onViewChange }) {
  return (
    <nav className="mobile-nav">
      {VIEW_NAV.map(({ key, shortLabel, Icon }) => (
        <button
          key={key}
          className={`mobile-nav__item ${view === key ? 'active' : ''}`}
          onClick={() => onViewChange(key)}
        >
          <Icon size={18} />
          <span>{shortLabel}</span>
        </button>
      ))}
    </nav>
  );
}

export function Header({ activeBanner, view, onBannerChange, onViewChange, onOpenSettings, onOpenSync, sync, syncing, profileProps }) {
  return (
    <>
      <header className="header">
        <div className="header__inner">
          <h1 className="header__title">
            <Sparkles size={20} />
            <span className="header__title-text">Wish Tracker</span>
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
            {VIEW_NAV.map(({ key, label, Icon }) => (
              <button key={key} className={view === key ? 'active' : ''} onClick={() => onViewChange(key)}>
                <Icon size={14} style={{ marginRight: 4 }} />
                {label}
              </button>
            ))}
          </div>

          <SyncButton sync={sync} syncing={syncing} onOpenSync={onOpenSync} />
          <InstallButton />

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

      <MobileBottomNav view={view} onViewChange={onViewChange} />
    </>
  );
}
