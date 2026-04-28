import { useState, useCallback } from 'react';
import { usePersistedReducer } from './hooks/usePersistedReducer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLuckScore, useStreak } from './hooks/useDerivedStats';
import * as A from './store/actions';
import { BANNER_CONFIG } from './utils/banners';

import { Header } from './components/Header';
import { BannerInfo } from './components/BannerInfo';
import { PityCard } from './components/PityCard';
import { AddWishControls, AddWishModal } from './components/AddWishModal';
import { WishHistory } from './components/WishHistory';
import { PrimoCounter } from './components/PrimoCounter';
import { ProbabilityCalc } from './components/ProbabilityCalc';
import { Wishlist } from './components/Wishlist';
import { StatsPanel } from './components/StatsPanel';
import { ConstellationTracker } from './components/ConstellationTracker';
import { Settings } from './components/Settings';

export default function App() {
  const [state, dispatch] = usePersistedReducer();
  const [view, setView] = useState('banner'); // 'banner' | 'stats' | 'collection'
  const [wishModalOpen, setWishModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeKey = state.activeBanner;
  const activeBanner = state.banners[activeKey];
  const cfg = BANNER_CONFIG[activeKey];

  // Indicateurs dérivés (recalculés à chaque mutation via useMemo dans les hooks).
  const luckScore = useLuckScore(state.banners);
  const streak = useStreak(state.banners);

  // --- Action helpers ---
  const handleAddWish = useCallback(
    (wish) => dispatch(A.addWish(activeKey, wish)),
    [dispatch, activeKey],
  );
  const handleAddThreeStar = useCallback(
    () => dispatch(A.addThreeStar(activeKey)),
    [dispatch, activeKey],
  );
  const handleUndo = useCallback(
    () => dispatch(A.undoLastWish(activeKey)),
    [dispatch, activeKey],
  );

  // Raccourcis : Espace = +1 trois-étoile, Ctrl+Z = undo (vue bannière uniquement).
  useKeyboardShortcuts({
    onSpace: view === 'banner' ? handleAddThreeStar : null,
    onUndo: view === 'banner' ? handleUndo : null,
  });

  // Détermine le type de fate à utiliser pour les calculs (standard = acquaint).
  const fateType = activeKey === 'standard' ? 'acquaint' : 'intertwined';

  return (
    <div className="app">
      <Header
        activeBanner={activeKey}
        view={view}
        onBannerChange={(b) => dispatch(A.setActiveBanner(b))}
        onViewChange={setView}
        onOpenSettings={() => setSettingsOpen(true)}
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
            />
            <PityCard
              banner={activeBanner}
              bannerKey={activeKey}
              luckScore={luckScore}
              streak={streak}
            />
            <AddWishControls
              onOpenModal={() => setWishModalOpen(true)}
              onAddThreeStar={handleAddThreeStar}
              onUndo={handleUndo}
              canUndo={activeBanner.history.length > 0}
            />
            <WishHistory
              banner={activeBanner}
              bannerKey={activeKey}
              versionFilter={state.versionFilter}
            />
          </div>

          <div className="app__col">
            <PrimoCounter
              resources={state.resources}
              income={state.income}
              banner={activeBanner}
              fateType={fateType}
              onChange={(resources) => dispatch(A.updateResources(resources))}
            />
            <ProbabilityCalc
              banner={activeBanner}
              bannerKey={activeKey}
              resources={state.resources}
              income={state.income}
            />
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

      {view === 'collection' && (
        <main className="app__main app__main--full">
          <ConstellationTracker banners={state.banners} />
        </main>
      )}

      <AddWishModal
        open={wishModalOpen}
        onClose={() => setWishModalOpen(false)}
        onSubmit={handleAddWish}
        bannerKey={activeKey}
        banner={activeBanner}
      />

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        state={state}
        onUpdateIncome={(income) => dispatch(A.updateIncome(income))}
        onSetVersion={(v) => dispatch(A.setVersion(v))}
        onImport={(s, mode) => dispatch(A.importState(s, mode))}
        onResetBanner={(b) => dispatch(A.resetBanner(b))}
        onResetAll={() => dispatch(A.resetAll())}
      />
    </div>
  );
}
