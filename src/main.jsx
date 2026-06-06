import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/theme.css';

const PROFILES_KEY = 'genshin-tracker-profiles';
const ACTIVE_KEY = 'genshin-tracker-active';

const DEFAULT_PROFILE = { id: 'default', name: 'Compte principal' };

function loadProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]');
    if (!Array.isArray(saved) || !saved.find(p => p.id === 'default')) {
      return [DEFAULT_PROFILE, ...saved.filter(p => p.id !== 'default')];
    }
    return saved;
  } catch {
    return [DEFAULT_PROFILE];
  }
}

function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function Root() {
  const [profiles, setProfiles] = useState(loadProfiles);
  const [activeProfileId, setActiveProfileId] = useState(
    () => localStorage.getItem(ACTIVE_KEY) || 'default'
  );

  const switchProfile = useCallback((id) => {
    setActiveProfileId(id);
    localStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const createProfile = useCallback((name) => {
    const id = `p${Date.now()}`;
    const updated = [...profiles, { id, name }];
    setProfiles(updated);
    saveProfiles(updated);
    switchProfile(id);
  }, [profiles, switchProfile]);

  const renameProfile = useCallback((id, name) => {
    const updated = profiles.map(p => p.id === id ? { ...p, name } : p);
    setProfiles(updated);
    saveProfiles(updated);
  }, [profiles]);

  const deleteProfile = useCallback((id) => {
    if (id === 'default') return;
    localStorage.removeItem(`genshin-tracker-v1-${id}`);
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    saveProfiles(updated);
    if (activeProfileId === id) switchProfile('default');
  }, [profiles, activeProfileId, switchProfile]);

  return (
      <App
        key={activeProfileId}
        profileId={activeProfileId}
        profileProps={{
          profiles,
          activeProfileId,
          onSwitch: switchProfile,
          onCreate: createProfile,
          onRename: renameProfile,
          onDelete: deleteProfile,
        }}
      />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
