// Types d'actions et action creators.

export const ActionTypes = {
  ADD_THREE_STARS_BULK: 'ADD_THREE_STARS_BULK',
  ADD_WISH: 'ADD_WISH',
  ADD_THREE_STAR: 'ADD_THREE_STAR',
  UNDO_LAST_WISH: 'UNDO_LAST_WISH',
  SET_ACTIVE_BANNER: 'SET_ACTIVE_BANNER',
  UPDATE_BANNER_METADATA: 'UPDATE_BANNER_METADATA',
  UPDATE_WISHLIST: 'UPDATE_WISHLIST',
  IMPORT_SYNCED_WISHES: 'IMPORT_SYNCED_WISHES',
  UPDATE_SYNC_CONFIG: 'UPDATE_SYNC_CONFIG',
  UPDATE_MANUAL_COLLECTION: 'UPDATE_MANUAL_COLLECTION',
  SET_VERSION: 'SET_VERSION',
  SET_VERSION_FILTER: 'SET_VERSION_FILTER',
  RESET_BANNER: 'RESET_BANNER',
  IMPORT_STATE: 'IMPORT_STATE',
  RESET_ALL: 'RESET_ALL',
};

export const addWish = (banner, wish) => ({
  type: ActionTypes.ADD_WISH,
  payload: { banner, wish },
});

export const addThreeStar = (banner) => ({
  type: ActionTypes.ADD_THREE_STAR,
  payload: { banner },
});

export const undoLastWish = (banner) => ({
  type: ActionTypes.UNDO_LAST_WISH,
  payload: { banner },
});

export const setActiveBanner = (banner) => ({
  type: ActionTypes.SET_ACTIVE_BANNER,
  payload: { banner },
});

export const updateBannerMetadata = (banner, metadata) => ({
  type: ActionTypes.UPDATE_BANNER_METADATA,
  payload: { banner, metadata },
});

export const updateWishlist = (banner, wishlist) => ({
  type: ActionTypes.UPDATE_WISHLIST,
  payload: { banner, wishlist },
});

export const updateManualCollection = (itemType, name, count, rank) => ({
  type: ActionTypes.UPDATE_MANUAL_COLLECTION,
  payload: { itemType, name, count, rank },
});

export const importSyncedWishes = (wishGroups) => ({
  type: ActionTypes.IMPORT_SYNCED_WISHES,
  payload: { wishGroups },
});

export const updateSyncConfig = (syncConfig) => ({
  type: ActionTypes.UPDATE_SYNC_CONFIG,
  payload: { syncConfig },
});

export const setVersion = (version) => ({
  type: ActionTypes.SET_VERSION,
  payload: { version },
});

export const setVersionFilter = (versionFilter) => ({
  type: ActionTypes.SET_VERSION_FILTER,
  payload: { versionFilter },
});

export const resetBanner = (banner) => ({
  type: ActionTypes.RESET_BANNER,
  payload: { banner },
});

export const importState = (state, mode = 'replace') => ({
  type: ActionTypes.IMPORT_STATE,
  payload: { state, mode },
});

export const resetAll = () => ({
  type: ActionTypes.RESET_ALL,
});

export const addThreeStarsBulk = (banner, count) => ({
  type: ActionTypes.ADD_THREE_STARS_BULK,
  payload: { banner, count },
});
