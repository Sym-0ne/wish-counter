import { useState, useEffect } from 'react';
import { Cloud, CloudUpload, CloudDownload, Loader, Check, AlertTriangle } from 'lucide-react';
import { requestAccessToken, uploadBackup, listBackups, downloadBackup } from '../utils/googleDrive';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const LAST_BACKUP_KEY = 'genshin-tracker-drive-last-backup';
const AUTO_BACKUP_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Sauvegarde sur le Google Drive personnel de l'utilisateur (scope drive.file —
 * l'app ne voit que les fichiers qu'elle crée). Le token n'est jamais persisté :
 * une reconnexion est nécessaire à chaque session, mais une fois connectée la
 * sauvegarde se fait seule (au clic, et automatiquement 1x/24h pendant la session).
 */
export function CloudBackup({ state, onImport }) {
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [lastBackupAt, setLastBackupAt] = useState(() => localStorage.getItem(LAST_BACKUP_KEY));
  const [pendingRestore, setPendingRestore] = useState(null);

  async function backupNow(activeToken) {
    setBusy(true);
    setMessage(null);
    try {
      await uploadBackup(activeToken, state);
      const now = new Date().toISOString();
      localStorage.setItem(LAST_BACKUP_KEY, now);
      setLastBackupAt(now);
      setMessage({ ok: true, text: 'Sauvegarde envoyée sur Google Drive ✓' });
    } catch (err) {
      setMessage({ ok: false, text: `Échec de la sauvegarde : ${err.message}` });
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    setMessage(null);
    try {
      const t = await requestAccessToken(CLIENT_ID);
      setToken(t);
    } catch (err) {
      setMessage({ ok: false, text: `Connexion échouée : ${err.message}` });
      setBusy(false);
    }
  }

  async function restoreLatest() {
    setBusy(true);
    setMessage(null);
    try {
      const files = await listBackups(token);
      if (!files.length) {
        setMessage({ ok: false, text: 'Aucune sauvegarde trouvée sur Drive.' });
        return;
      }
      const data = await downloadBackup(token, files[0].id);
      setPendingRestore(data);
    } catch (err) {
      setMessage({ ok: false, text: `Échec de la restauration : ${err.message}` });
    } finally {
      setBusy(false);
    }
  }

  function confirmRestore(mode) {
    onImport(pendingRestore, mode);
    setPendingRestore(null);
  }

  // Auto-backup silencieux : 1x/24h tant que la session reste connectée.
  useEffect(() => {
    if (!token) return;
    const last = lastBackupAt ? new Date(lastBackupAt).getTime() : 0;
    if (Date.now() - last < AUTO_BACKUP_INTERVAL) return;
    backupNow(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!CLIENT_ID) {
    return (
      <section className="card">
        <h3 className="card__title"><Cloud size={18} /> Sauvegarde Google Drive</h3>
        <p className="card__subtitle">
          Non configuré sur ce déploiement — voir <code>GOOGLE_DRIVE_BACKUP_SETUP.md</code> pour l'activer.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h3 className="card__title"><Cloud size={18} /> Sauvegarde Google Drive</h3>
      <p className="card__subtitle">
        Sauvegarde vers ton propre Google Drive — l'app ne voit que les fichiers qu'elle crée,
        jamais le reste de ton Drive. Les 2 sauvegardes les plus récentes sont conservées.
      </p>

      {!token && (
        <button className="btn btn--primary" onClick={connect} disabled={busy}>
          {busy ? <Loader size={16} className="spin" /> : <Cloud size={16} />}
          Connecter Google Drive
        </button>
      )}

      {token && (
        <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => backupNow(token)} disabled={busy}>
            {busy ? <Loader size={16} className="spin" /> : <CloudUpload size={16} />}
            Sauvegarder maintenant
          </button>
          <button className="btn btn--ghost" onClick={restoreLatest} disabled={busy}>
            <CloudDownload size={16} /> Restaurer la dernière sauvegarde
          </button>
        </div>
      )}

      {lastBackupAt && (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 8 }}>
          Dernière sauvegarde : {new Date(lastBackupAt).toLocaleString('fr-FR')}
        </p>
      )}

      {message && (
        <div className={`sync-result sync-result--${message.ok ? 'ok' : 'error'}`} style={{ marginTop: 10 }}>
          {message.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {message.text}
        </div>
      )}

      {pendingRestore && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card__title"><AlertTriangle size={16} /> Confirmer la restauration</div>
          <p className="card__subtitle">
            <strong>Fusionner</strong> ajoute les vœux de la sauvegarde à ton historique actuel.
            <br />
            <strong>Remplacer</strong> écrase tes données actuelles par la sauvegarde.
          </p>
          <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={() => confirmRestore('merge')}>Fusionner</button>
            <button className="btn btn--danger" onClick={() => confirmRestore('replace')}>Remplacer</button>
            <button className="btn btn--ghost" onClick={() => setPendingRestore(null)}>Annuler</button>
          </div>
        </div>
      )}
    </section>
  );
}
