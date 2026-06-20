import { useState, useCallback, useEffect, useRef } from 'react';
import { usePersistedReducer } from './hooks/usePersistedReducer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLuckScore, useStreak, useNameSuggestions } from './hooks/useDerivedStats';
import * as A from './store/actions';
import { fetchBannerInfoFromAuth } from './utils/gachaInfo';
import { isBannerStale, getCurrentBanners } from './utils/bannerFetch';
import { syncAllBanners } from './utils/wishSync';

import { Header } from './components/Header';
import { BannerInfo } from './components/BannerInfo';
import { PityCard } from './components/PityCard';
import { AddWishControls, AddWishModal } from './components/AddWishModal';
import { WishHistory } from './components/WishHistory';
import { Wishlist } from './components/Wishlist';
import { StatsPanel } from './components/StatsPanel';
import { ConstellationTracker } from './components/ConstellationTracker';
import { Settings } from './components/Settings';
import { SyncModal } from './components/SyncModal';
import { BannerHistory } from './components/BannerHistory';
import { WishlistTab } from './components/WishlistTab';
import { ResourceCalculator } from './components/ResourceCalculator';
import { PullCostEstimator } from './components/PullCostEstimator';
import { UpcomingBanners } from './components/UpcomingBanners';
import { AllBannersTimeline } from './components/AllBannersTimeline';

const TWO_HOURS = 2 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export default function App({ profileId = 'default', profileProps = {} }) {
  const [state, dispatch] = usePersistedReducer(profileId);
  const [view, setView] = useState('banner');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
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

  // Ref toujours à jour — évite les closures obsolètes dans les intervals ci-dessous.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const activeKey = state.activeBanner;
  const activeBanner = state.banners[activeKey];

  const luckScore = useLuckScore(state.banners);
  const streak = useStreak(state.banners);
  const nameSuggestions = useNameSuggestions(state.banners);

  // Auto-open the sync modal when the app was launched with ?authkey= URL param
  useEffect(() => {
    if (initialAuthkeyUrl) setSyncOpen(true);
  }, [initialAuthkeyUrl]);

  // Auto-sync current game version from banners-current.json on mount
  useEffect(() => {
    getCurrentBanners().then((data) => {
      const version = data?.character?.version ?? data?.weapon?.version;
      if (version && version !== state.version) {
        dispatch(A.setVersion(version));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

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

  // Efface automatiquement l'authkey ~24h après sa collecte (durée de vie réelle côté HoYoverse).
  useEffect(() => {
    function checkExpiry() {
      const { authkeyUrl, authkeyObtainedAt } = stateRef.current.sync;
      if (!authkeyUrl || !authkeyObtainedAt) return;
      const age = Date.now() - new Date(authkeyObtainedAt).getTime();
      if (age > TWENTY_FOUR_HOURS) {
        dispatch(A.updateSyncConfig({ authkeyUrl: '', authkeyObtainedAt: null }));
      }
    }
    checkExpiry();
    const id = setInterval(checkExpiry, 60 * 1000);
    return () => clearInterval(id);
  }, [dispatch]);

  // Sync automatique toutes les 2h tant que l'authkey sauvegardée est encore valide (<24h).
  // Espacer les syncs réduit le risque de "too many requests" côté API HoYoverse,
  // surtout quand le Worker est partagé entre plusieurs utilisateurs.
  useEffect(() => {
    function tryAutoSync() {
      const { workerUrl, authkeyUrl, authkeyObtainedAt, lastSync } = stateRef.current.sync;
      if (!workerUrl || !authkeyUrl) return;
      if (authkeyObtainedAt && Date.now() - new Date(authkeyObtainedAt).getTime() > TWENTY_FOUR_HOURS) return;

      const sinceLast = lastSync ? Date.now() - new Date(lastSync).getTime() : Infinity;
      if (sinceLast < TWO_HOURS) return;

      setSyncing(true);
      syncAllBanners(workerUrl, authkeyUrl, stateRef.current.banners, () => {})
        .then((groups) => {
          dispatch(A.importSyncedWishes(groups));
          dispatch(A.updateSyncConfig({ lastSync: new Date().toISOString() }));
        })
        .catch(() => {}) // rate-limit / authkey expiré entre-temps — on retentera au prochain cycle
        .finally(() => setSyncing(false));
    }
    tryAutoSync();
    const id = setInterval(tryAutoSync, TWO_HOURS);
    return () => clearInterval(id);
  }, [dispatch]);

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
        <main className="app__main app__main--banner">
          <div className="app__col">
            <BannerInfo
              bannerKey={activeKey}
              banner={activeBanner}
              onChange={(metadata) =>
                dispatch(A.updateBannerMetadata(activeKey, metadata))
              }
              onOpenSync={() => setSyncOpen(true)}
              onOpenHistory={() => setHistoryModalOpen(true)}
            />
            <UpcomingBanners
              workerUrl={state.sync.workerUrl}
              upcomingUser={state.sync.upcomingUser}
              upcomingPassword={state.sync.upcomingPassword}
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
            <ResourceCalculator
              primoTracker={state.primoTracker}
              banner={activeBanner}
              bannerKey={activeKey}
              onChange={(patch) => dispatch(A.updatePrimoTracker(patch))}
            />
            <PullCostEstimator banner={activeBanner} bannerKey={activeKey} />
            <Wishlist
              bannerKey={activeKey}
              banner={activeBanner}
              onChange={(wishlist) => dispatch(A.updateWishlist(activeKey, wishlist))}
            />
          </div>
        </main>
      )}

      {historyModalOpen && (
        <div className="modal-backdrop" onClick={() => setHistoryModalOpen(false)}>
          <div
            className="modal modal--wide"
            onClick={(e) => e.stopPropagation()}
          >
            <AllBannersTimeline onClose={() => setHistoryModalOpen(false)} />
          </div>
        </div>
      )}

      {view === 'stats' && (
        <main className="app__main app__main--full">
          <StatsPanel banners={state.banners} />
        </main>
      )}

      {view === 'history' && (
        <main className="app__main app__main--full">
          <BannerHistory
            banners={state.banners}
            onUpdateWish={(bannerKey, wishId, patch) => dispatch(A.updateWish(bannerKey, wishId, patch))}
          />
        </main>
      )}

      {view === 'wishlist' && (
        <main className="app__main app__main--full">
          <WishlistTab
            wishlistItems={state.wishlistItems ?? []}
            onAdd={(item) => dispatch(A.addWishlistItem(item))}
            onRemove={(id) => dispatch(A.removeWishlistItem(id))}
            onUpdate={(id, patch) => dispatch(A.updateWishlistItem(id, patch))}
          />
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