import { useState, useRef, useEffect } from 'react';
import { User, Plus, Trash2, ChevronDown, Check, Pencil } from 'lucide-react';

/**
 * Sélecteur de profils / comptes. Affiché dans le Header.
 * Permet de créer, renommer, basculer et supprimer des comptes.
 */
export function ProfileBar({ profiles, activeProfileId, onSwitch, onCreate, onRename, onDelete }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(null); // profileId en cours de renommage
  const [renameName, setRenameName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const ref = useRef(null);

  const active = profiles.find(p => p.id === activeProfileId);

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
    setCreating(false);
    setOpen(false);
  }

  function handleRename(e, id) {
    e.preventDefault();
    if (!renameName.trim()) return;
    onRename(id, renameName.trim());
    setRenaming(null);
  }

  function handleDelete(id) {
    onDelete(id);
    setConfirmDelete(null);
    setOpen(false);
  }

  return (
    <div className="profile-bar" ref={ref}>
      <button
        className="profile-bar__trigger btn btn--ghost btn--small"
        onClick={() => setOpen(!open)}
        title="Changer de compte"
      >
        <User size={14} />
        <span className="profile-bar__name">{active?.name || 'Compte'}</span>
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div className="profile-bar__dropdown">
          <div className="profile-bar__label">Comptes</div>

          {profiles.map(p => (
            <div key={p.id} className={`profile-bar__item ${p.id === activeProfileId ? 'profile-bar__item--active' : ''}`}>
              {renaming === p.id ? (
                <form onSubmit={(e) => handleRename(e, p.id)} className="profile-bar__rename">
                  <input
                    autoFocus
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    placeholder="Nouveau nom…"
                    style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--gold)', borderRadius: 4, color: 'var(--text)', padding: '2px 6px', fontSize: '13px' }}
                  />
                  <button type="submit" className="btn btn--ghost" style={{ padding: '2px 6px' }}>
                    <Check size={12} />
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => setRenaming(null)} style={{ padding: '2px 6px' }}>
                    ✕
                  </button>
                </form>
              ) : (
                <>
                  <button
                    className="profile-bar__item-name"
                    onClick={() => { onSwitch(p.id); setOpen(false); }}
                  >
                    {p.id === activeProfileId && <Check size={12} />}
                    {p.name}
                  </button>
                  <div className="profile-bar__item-actions">
                    <button
                      className="btn btn--ghost"
                      title="Renommer"
                      onClick={() => { setRenaming(p.id); setRenameName(p.name); }}
                      style={{ padding: '2px 4px' }}
                    >
                      <Pencil size={11} />
                    </button>
                    {p.id !== 'default' && confirmDelete !== p.id && (
                      <button
                        className="btn btn--ghost"
                        title="Supprimer"
                        onClick={() => setConfirmDelete(p.id)}
                        style={{ padding: '2px 4px', color: 'var(--danger)' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    {confirmDelete === p.id && (
                      <button
                        className="btn btn--danger"
                        onClick={() => handleDelete(p.id)}
                        style={{ padding: '2px 6px', fontSize: '11px' }}
                      >
                        Confirmer
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="profile-bar__divider" />

          {creating ? (
            <form onSubmit={handleCreate} className="profile-bar__new">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du compte…"
                style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--gold)', borderRadius: 4, color: 'var(--text)', padding: '4px 8px', fontSize: '13px' }}
              />
              <button type="submit" className="btn btn--primary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                <Check size={12} /> Créer
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setCreating(false)} style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </form>
          ) : (
            <button className="profile-bar__add" onClick={() => setCreating(true)}>
              <Plus size={13} /> Nouveau compte
            </button>
          )}
        </div>
      )}
    </div>
  );
}
