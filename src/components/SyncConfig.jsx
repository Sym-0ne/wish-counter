import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Info, UserPlus, Trash2, ScrollText } from 'lucide-react';
import { syncAllBanners, countNewWishes } from '../utils/wishSync';
import { adminAddUser, adminDeleteUser, adminListUsers, adminGetLogs } from '../utils/githubUpcoming';

export function SyncConfig({ sync, banners, onImportSynced, onUpdateSyncConfig }) {
  const [workerUrl,        setWorkerUrl]        = useState(sync.workerUrl        || '');
  const [authkeyUrl,       setAuthkeyUrl]        = useState(sync.authkeyUrl       || '');
  const [upcomingUser,     setUpcomingUser]      = useState(sync.upcomingUser     || '');
  const [upcomingPassword, setUpcomingPassword]  = useState(sync.upcomingPassword || '');
  const [adminSecret,      setAdminSecret]       = useState(sync.adminSecret      || '');

  const [syncing,  setSyncing]  = useState(false);
  const [progress, setProgress] = useState('');
  const [result,   setResult]   = useState(null);

  // Admin panel state
  const [adminBusy,    setAdminBusy]    = useState(false);
  const [adminMsg,     setAdminMsg]     = useState(null);
  const [users,        setUsers]        = useState(null);  // null = not loaded
  const [logs,         setLogs]         = useState(null);
  const [newUsername,  setNewUsername]  = useState('');
  const [newPassword,  setNewPassword]  = useState('');
  const [newRole,      setNewRole]      = useState('user');

  const canSync = workerUrl.trim().startsWith('https://') && authkeyUrl.trim().startsWith('https://');

  // ── Wish sync ─────────────────────────────────────────────────────────────

  async function handleSync() {
    setSyncing(true); setResult(null); setProgress('Démarrage…');
    try {
      const groups = await syncAllBanners(workerUrl.trim(), authkeyUrl.trim(), banners, setProgress);
      const total = countNewWishes(groups);
      onImportSynced(groups);
      onUpdateSyncConfig({ workerUrl: workerUrl.trim(), authkeyUrl: authkeyUrl.trim(), lastSync: new Date().toISOString() });
      setResult({ ok: true, message: `${total} nouveau(x) vœu(x) importé(s).` });
    } catch (err) {
      setResult({ ok: false, message: err.message });
    } finally { setSyncing(false); setProgress(''); }
  }

  function handleSave() {
    onUpdateSyncConfig({
      workerUrl:        workerUrl.trim(),
      authkeyUrl:       authkeyUrl.trim(),
      upcomingUser:     upcomingUser.trim(),
      upcomingPassword: upcomingPassword,
      adminSecret:      adminSecret,
    });
  }

  // ── Admin helpers ─────────────────────────────────────────────────────────

  async function adminDo(fn) {
    setAdminBusy(true); setAdminMsg(null);
    try { await fn(); }
    catch (err) { setAdminMsg({ ok: false, text: err.message }); }
    finally { setAdminBusy(false); }
  }

  async function loadUsers() {
    adminDo(async () => {
      const list = await adminListUsers(workerUrl.trim(), adminSecret);
      setUsers(list);
    });
  }

  async function loadLogs() {
    adminDo(async () => {
      const list = await adminGetLogs(workerUrl.trim(), adminSecret, 50);
      setLogs(list);
    });
  }

  async function addUser() {
    if (!newUsername.trim() || !newPassword.trim()) return;
    adminDo(async () => {
      await adminAddUser(workerUrl.trim(), adminSecret, newUsername.trim(), newPassword, newRole);
      setAdminMsg({ ok: true, text: `Utilisateur "${newUsername.trim()}" créé.` });
      setNewUsername(''); setNewPassword('');
      await adminListUsers(workerUrl.trim(), adminSecret).then(setUsers);
    });
  }

  async function deleteUser(username) {
    adminDo(async () => {
      await adminDeleteUser(workerUrl.trim(), adminSecret, username);
      setAdminMsg({ ok: true, text: `"${username}" supprimé.` });
      setUsers((prev) => prev?.filter((u) => u.username !== username));
    });
  }

  const hasAdmin = !!adminSecret.trim();

  return (
    <>
      {/* ── Wish sync ──────────────────────────────────────────────────────── */}
      <section className="card">
        <h3 className="card__title">Synchronisation des vœux</h3>
        <p className="card__subtitle">
          Importe ton historique depuis HoYoverse via le Cloudflare Worker.
        </p>

        <details style={{ marginBottom: '12px' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--gold)', fontSize: '13px' }}>
            <Info size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Comment obtenir l'URL authkey ?
          </summary>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6' }}>
            <p><strong>Via l'historique in-game :</strong> ouvre l'historique de vœux dans Genshin,
            puis cherche dans <code>%appdata%\..\LocalLow\miHoYo\Genshin Impact\output_log.txt</code>
            une ligne contenant <code>hk4e-api</code>.</p>
            <p style={{ marginTop: '6px', color: 'var(--danger)', fontStyle: 'italic' }}>
              ⚠ L'authkey expire après ~24h.
            </p>
            <p style={{ marginTop: '6px' }}><strong>Worker Cloudflare :</strong> crée un Worker sur
            <code> dash.cloudflare.com</code>, colle <code>cloudflare-worker/worker.js</code> du repo.
            Ajoute un KV "UPCOMING_KV" et les variables GITHUB_TOKEN + ADMIN_SECRET.</p>
          </div>
        </details>

        <div className="modal__field">
          <label>URL du Cloudflare Worker</label>
          <input type="url" placeholder="https://genshin-sync.ton-compte.workers.dev"
            value={workerUrl} onChange={(e) => setWorkerUrl(e.target.value)} disabled={syncing} />
        </div>

        <div className="modal__field">
          <label>URL authkey (depuis le jeu)</label>
          <input type="url" placeholder="https://hk4e-api-os.hoyoverse.com/gacha_info/api/getGachaLog?authkey=…"
            value={authkeyUrl} onChange={(e) => setAuthkeyUrl(e.target.value)} disabled={syncing} />
        </div>

        {sync.lastSync && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
            Dernière sync : {new Date(sync.lastSync).toLocaleString('fr-FR')}
          </p>
        )}

        <div className="flex gap-md" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--primary" onClick={handleSync} disabled={!canSync || syncing}>
            <RefreshCw size={14} className={syncing ? 'spin' : ''} />
            {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
          </button>
          <button className="btn btn--ghost" onClick={handleSave} disabled={syncing}>
            Sauvegarder
          </button>
        </div>

        {syncing && progress && (
          <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>{progress}</p>
        )}
        {result && <StatusMsg ok={result.ok} text={result.message} />}
      </section>

      {/* ── Bannières à venir — identifiants ──────────────────────────────── */}
      <section className="card">
        <h3 className="card__title">Bannières à venir — accès écriture</h3>
        <p className="card__subtitle">
          Identifiant fourni par l'admin du site. Permet d'ajouter et modifier
          les bannières à venir. Le mot de passe ne quitte jamais ton navigateur
          en clair — il est envoyé en HTTPS directement au Worker.
        </p>

        <div className="modal__field">
          <label>Nom d'utilisateur</label>
          <input type="text" placeholder="alice" autoComplete="username"
            value={upcomingUser} onChange={(e) => setUpcomingUser(e.target.value)} />
        </div>
        <div className="modal__field">
          <label>Mot de passe</label>
          <input type="password" placeholder="••••••••" autoComplete="current-password"
            value={upcomingPassword} onChange={(e) => setUpcomingPassword(e.target.value)} />
        </div>

        <button className="btn btn--ghost" onClick={handleSave}>
          Sauvegarder
        </button>
      </section>

      {/* ── Panel admin ───────────────────────────────────────────────────── */}
      <section className="card">
        <h3 className="card__title">Gestion des utilisateurs (admin)</h3>
        <p className="card__subtitle">
          Réservé au propriétaire du site. Nécessite l'ADMIN_SECRET configuré dans le Worker.
        </p>

        <div className="modal__field">
          <label>Admin secret</label>
          <input type="password" placeholder="••••••••" autoComplete="off"
            value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} />
        </div>

        <div className="flex gap-md" style={{ flexWrap: 'wrap', marginBottom: '12px' }}>
          <button className="btn btn--ghost" onClick={handleSave}>Sauvegarder</button>
          <button className="btn btn--ghost" onClick={loadUsers} disabled={!hasAdmin || adminBusy}>
            <UserPlus size={14} /> Charger les utilisateurs
          </button>
          <button className="btn btn--ghost" onClick={loadLogs} disabled={!hasAdmin || adminBusy}>
            <ScrollText size={14} /> Voir les logs
          </button>
        </div>

        {adminMsg && <StatusMsg ok={adminMsg.ok} text={adminMsg.text} />}

        {/* Ajouter un utilisateur */}
        {hasAdmin && (
          <div className="sync-admin-form">
            <div className="modal__field" style={{ margin: 0 }}>
              <label>Nouveau nom d'utilisateur</label>
              <input type="text" placeholder="bob" value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)} />
            </div>
            <div className="modal__field" style={{ margin: 0 }}>
              <label>Mot de passe</label>
              <input type="password" placeholder="••••••••" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="modal__field" style={{ margin: 0 }}>
              <label>Rôle</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', padding: '6px 8px' }}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <button className="btn btn--primary" onClick={addUser}
              disabled={!newUsername.trim() || !newPassword.trim() || adminBusy}>
              <UserPlus size={14} /> Créer
            </button>
          </div>
        )}

        {/* Liste des utilisateurs */}
        {users && (
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '6px' }}>
              {users.length} utilisateur(s)
            </p>
            {users.map((u) => (
              <div key={u.username} className="sync-user-row">
                <span className="sync-user-name">{u.username}</span>
                <span className="badge badge--ghost">{u.role}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : ''}
                </span>
                <button className="btn btn--ghost btn--icon" title="Supprimer"
                  onClick={() => deleteUser(u.username)} disabled={adminBusy}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Logs */}
        {logs && (
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '6px' }}>
              Dernières actions
            </p>
            <div className="sync-logs">
              {logs.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Aucun log.</p>}
              {logs.map((l, i) => (
                <div key={i} className="sync-log-row">
                  <span className="sync-log-ts">
                    {l.timestamp ? new Date(l.timestamp).toLocaleString('fr-FR') : '?'}
                  </span>
                  <span className="sync-log-user">{l.username}</span>
                  <span className={`sync-log-action ${l.action?.includes('error') || l.action?.includes('failed') ? 'sync-log-action--err' : ''}`}>
                    {l.action}
                  </span>
                  {l.count != null && <span style={{ color: 'var(--muted)', fontSize: '0.68rem' }}>{l.count} entrées</span>}
                  <span style={{ color: 'var(--muted)', fontSize: '0.65rem', marginLeft: 'auto' }}>{l.ip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function StatusMsg({ ok, text }) {
  return (
    <div style={{
      marginTop: '10px', padding: '8px 12px', borderRadius: '6px',
      fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start',
      background: ok ? 'rgba(80,200,80,0.1)' : 'rgba(200,60,60,0.1)',
      border: `1px solid ${ok ? 'var(--success, #4caf50)' : 'var(--danger)'}`,
      color: ok ? 'var(--success, #4caf50)' : 'var(--danger)',
    }}>
      {ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      <span>{text}</span>
    </div>
  );
}
