import { useState, useCallback, useEffect } from 'react';
import { usePersistedReducer } from './hooks/usePersistedReducer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLuckScore, useStreak, useNameSuggestions } from './hooks/useDerivedStats';
import * as A from './store/actions';
import { fetchBannerInfoFromAuth } from './utils/gachaInfo';
import { isBannerStale } from './utils/bannerFetch';

import { Header } from './components/Header';
import { BannerInfo } from './components/BannerInfo';
import { PityCard } from './components/PityCard';
import { AddWishControls, AddWishModal } from './components/AddWishModal';
import { WishHistory } from './components/WishHistory';
import { ProbabilityCalc } from './components/ProbabilityCalc';
import { Wishlist } from './components/Wishlist';
import { StatsPanel } from './components/StatsPanel';
import { ConstellationTracker } from './components/ConstellationTracker';
import { Settings } from './components/Settings';
import { SyncModal } from './components/SyncModal';
import { BannerHistory } from './components/BannerHistory';

export default function App({ profileId = 'default', profileProps = {} }) {
  const [state, dispatch] = usePersistedReducer(profileId);
  const [view, setView] = useState('banner');
  const [wishModalOpen, setWishModalOpen] = useState(false);
  const [addRank, setAddRank] = useState(5);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Read ?authkey= URL param set by the PowerShell helper script.
  // Extract the value once on mount, then remove it from the URL to keep it clean.
  const [initialAuthkeyUrl, setInitialAuthkeyUrl] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('authkey');
      if (raw) {
        // URLSearchParams.get() already decodes once — do NOT call decodeURIComponent again.
        // A second decode would turn %2B → + in the authkey value (base64), corrupting it.
        const clean = window.location.pathname + window.location.hash;
        window.history.replaceState(null, '', clean);
        return raw;
      }
    } catch { /* ignore */ }
    return '';
  });

  const activeKey = state.activeBanner;
  const activeBanner = state.banners[activeKey];

  const luckScore = useLuckScore(state.banners);
  const streak = useStreak(state.banners);
  const nameSuggestions = useNameSuggestions(state.banners);

  // Auto-open the sync modal when the app was launched with ?authkey= URL param
  useEffect(() => {
    if (initialAuthkeyUrl) setSyncOpen(true);
  }, [initialAuthkeyUrl]);

  // Auto-fetch banner info (featured character, end date) via the same authkey used for
  // wish sync. Runs on mount and after every successful wish sync (lastSync update).
  useEffect(() => {
    const { workerUrl, authkeyUrl } = state.sync;
    if (!workerUrl || !authkeyUrl) return;

    fetchBannerInfoFromAuth(workerUrl, authkeyUrl)
      .then((bannerInfo) => {
        for (const [key, meta] of Object.entries(bannerInfo)) {
          if (meta && state.banners[key]) {
            dispatch(A.updateBannerMetadata(key, meta));
          }
        }
      })
      .catch(() => {}); // Best-effort — silent on expired authkey or network error
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sync.lastSync]);

  const handleAddWish = useCallback(
    (wish) => dispatch(A.addWish(activeKey, wish)),
    [dispatch, activeKey],
  );
  const handleAddThreeStar = useCallback(
    () => dispatch(A.addThreeStar(activeKey)),
    [dispatch, activeKey],
  );
  const handleAddFiveThreeStars = useCallback(
    () => dispatch(A.addThreeStarsBulk(activeKey, 5)),
    [dispatch, activeKey],
  );
  const handleUndo = useCallback(
    () => dispatch(A.undoLastWish(activeKey)),
    [dispatch, activeKey],
  );

  const openAddModal = useCallback((rank) => {
    setAddRank(rank);
    setWishModalOpen(true);
  }, []);

  // Raccourcis : Espace = +1 trois-étoile, Ctrl+Z = undo (vue bannière uniquement).
  useKeyboardShortcuts({
    onSpace: view === 'banner' ? handleAddThreeStar : null,
    onUndo: view === 'banner' ? handleUndo : null,
  });

  return (
    <div className="app">
      <Header
        activeBanner={activeKey}
        view={view}
        onBannerChange={(b) => dispatch(A.setActiveBanner(b))}
        onViewChange={setView}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSync={() => setSyncOpen(true)}
        sync={state.sync}
        syncing={syncing}
        profileProps={profileProps}
      />

      {view === 'banner' && (
        <main className="app__main">
          <div className="app__col">
            <BannerInfo
              bannerKey={activeKey}
              banner={activeBanner}
              onChange={(metadata) =>
                dispatch(A.updateBannerMetadata(activeKey, metadata))
              }
              onOpenSync={() => setSyncOpen(true)}
            />
            <PityCard
              banner={activeBanner}
              bannerKey={activeKey}
              luckScore={luckScore}
              streak={streak}
            />
            <AddWishControls
              onOpenModal={openAddModal}
              onAddThreeStar={handleAddThreeStar}
              onAddFiveThreeStars={handleAddFiveThreeStars}
              onUndo={handleUndo}
              canUndo={activeBanner.history.length > 0}
            />
            <WishHistory
              banner={activeBanner}
              bannerKey={activeKey}
              versionFilter={state.versionFilter}
              onUpdateWish={(wishId, patch) => dispatch(A.updateWish(activeKey, wishId, patch))}
            />
          </div>

          <div className="app__col">
            <ProbabilityCalc banner={activeBanner} bannerKey={activeKey} />
            <Wishlist
              bannerKey={activeKey}
              banner={activeBanner}
              onChange={(wishlist) => dispatch(A.updateWishlist(activeKey, wishlist))}
            />
          </div>
        </main>
      )}

      {view === 'stats' && (
        <main className="app__main app__main--full">
          <StatsPanel banners={state.banners} />
        </main>
      )}

      {view === 'history' && (
        <main className="app__main app__main--full">
          <BannerHistory banners={state.banners} />
        </main>
      )}

      {view === 'collection' && (
        <main className="app__main app__main--full">
          <ConstellationTracker
            banners={state.banners}
            manualCollection={state.manualCollection}
            onUpdateManual={(itemType, name, count, rank) =>
              dispatch(A.updateManualCollection(itemType, name, count, rank))
            }
          />
        </main>
      )}

      <AddWishModal
        open={wishModalOpen}
        onClose={() => setWishModalOpen(false)}
        onSubmit={handleAddWish}
        bannerKey={activeKey}
        banner={activeBanner}
        initialRank={addRank}
        nameSuggestions={nameSuggestions}
      />

      <SyncModal
        open={syncOpen}
        onClose={() => { setSyncOpen(false); setInitialAuthkeyUrl(''); }}
        sync={state.sync}
        banners={state.banners}
        initialAuthkeyUrl={initialAuthkeyUrl}
        onImportSynced={(groups) => {
          setSyncing(false);
          dispatch(A.importSyncedWishes(groups));
        }}
        onUpdateSyncConfig={(cfg) => dispatch(A.updateSyncConfig(cfg))}
        onBannerInfoFetched={(bannerInfo) => {
          for (const [key, meta] of Object.entries(bannerInfo)) {
            if (meta && state.banners[key]) {
              dispatch(A.updateBannerMetadata(key, meta));
            }
          }
        }}
      />

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        state={state}
        onSetVersion={(v) => dispatch(A.setVersion(v))}
        onImportSynced={(groups) => dispatch(A.importSyncedWishes(groups))}
        onUpdateSyncConfig={(cfg) => dispatch(A.updateSyncConfig(cfg))}
        onImport={(s, mode) => dispatch(A.importState(s, mode))}
        onResetBanner={(b) => dispatch(A.resetBanner(b))}
        onResetAll={() => dispatch(A.resetAll())}
      />
    </div>
  );
}