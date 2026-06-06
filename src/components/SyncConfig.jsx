import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { syncAllBanners, countNewWishes } from '../utils/wishSync';

/**
 * Panneau de configuration et déclenchement de la synchronisation
 * avec l'API historique HoYoverse via Cloudflare Worker.
 */
export function SyncConfig({ sync, banners, onImportSynced, onUpdateSyncConfig }) {
  const [workerUrl, setWorkerUrl] = useState(sync.workerUrl || '');
  const [authkeyUrl, setAuthkeyUrl] = useState(sync.authkeyUrl || '');
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null); // { ok: bool, message: string }

  const canSync = workerUrl.trim().startsWith('https://') && authkeyUrl.trim().startsWith('https://');

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    setProgress('Démarrage…');

    try {
      const groups = await syncAllBanners(
        workerUrl.trim(),
        authkeyUrl.trim(),
        banners,
        setProgress,
      );

      const total = countNewWishes(groups);
      onImportSynced(groups);
      onUpdateSyncConfig({
        workerUrl: workerUrl.trim(),
        authkeyUrl: authkeyUrl.trim(),
        lastSync: new Date().toISOString(),
      });
      setResult({ ok: true, message: `${total} nouveau(x) vœu(x) importé(s) avec succès.` });
    } catch (err) {
      setResult({ ok: false, message: err.message });
    } finally {
      setSyncing(false);
      setProgress('');
    }
  }

  function handleSave() {
    onUpdateSyncConfig({ workerUrl: workerUrl.trim(), authkeyUrl: authkeyUrl.trim() });
  }

  return (
    <section className="card">
      <h3 className="card__title">Synchronisation automatique</h3>
      <p className="card__subtitle">
        Importe ton historique de vœux directement depuis les serveurs HoYoverse via un
        proxy Cloudflare Worker. Les vœux manuels sont préservés — la fusion se fait par
        ID unique.
      </p>

      <details style={{ marginBottom: '12px' }}>
        <summary style={{ cursor: 'pointer', color: 'var(--gold)', fontSize: '13px' }}>
          <Info size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Comment obtenir l'URL authkey ?
        </summary>
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6' }}>
          <p><strong>Méthode 1 — Via l'historique in-game :</strong></p>
          <ol style={{ paddingLeft: '16px', margin: '4px 0' }}>
            <li>Lance Genshin Impact et ouvre l'historique de vœux.</li>
            <li>Sous Windows, cherche dans le dossier log du jeu le fichier <code>output_log.txt</code> (chemin : <code>%appdata%\..\LocalLow\miHoYo\Genshin Impact\</code>).</li>
            <li>Recherche une ligne contenant <code>hk4e-api</code> — c'est l'URL complète avec authkey.</li>
          </ol>
          <p style={{ marginTop: '6px' }}><strong>Méthode 2 — Via un outil tiers :</strong> des sites comme <em>paimon.moe</em> proposent des guides visuels pour extraire l'URL.</p>
          <p style={{ marginTop: '6px', color: 'var(--danger)', fontStyle: 'italic' }}>
            ⚠ L'authkey expire après ~24h. Tu devras la renouveler à chaque session.
          </p>
          <p style={{ marginTop: '6px' }}><strong>Worker Cloudflare :</strong> crée un Worker gratuit sur <code>dash.cloudflare.com</code>, colle le fichier <code>cloudflare-worker/worker.js</code> du repo, déploie et copie l'URL ici.</p>
        </div>
      </details>

      <div className="modal__field">
        <label>URL du Cloudflare Worker</label>
        <input
          type="url"
          placeholder="https://genshin-sync.ton-compte.workers.dev"
          value={workerUrl}
          onChange={(e) => setWorkerUrl(e.target.value)}
          disabled={syncing}
        />
      </div>

      <div className="modal__field">
        <label>URL authkey (depuis le jeu)</label>
        <input
          type="url"
          placeholder="https://hk4e-api-os.hoyoverse.com/gacha_info/api/getGachaLog?authkey=…"
          value={authkeyUrl}
          onChange={(e) => setAuthkeyUrl(e.target.value)}
          disabled={syncing}
        />
        <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
          L'authkey n'est pas transmise à des tiers — elle transite uniquement vers ton propre Worker.
        </small>
      </div>

      {sync.lastSync && (
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
          Dernière sync : {new Date(sync.lastSync).toLocaleString('fr-FR')}
        </p>
      )}

      <div className="flex gap-md" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          className="btn btn--primary"
          onClick={handleSync}
          disabled={!canSync || syncing}
        >
          <RefreshCw size={14} className={syncing ? 'spin' : ''} />
          {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
        </button>
        <button
          className="btn btn--ghost"
          onClick={handleSave}
          disabled={syncing}
        >
          Sauvegarder les URLs
        </button>
      </div>

      {syncing && progress && (
        <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>
          {progress}
        </p>
      )}

      {result && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
            background: result.ok ? 'rgba(80,200,80,0.1)' : 'rgba(200,60,60,0.1)',
            border: `1px solid ${result.ok ? 'var(--success, #4caf50)' : 'var(--danger)'}`,
            color: result.ok ? 'var(--success, #4caf50)' : 'var(--danger)',
          }}
        >
          {result.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{result.message}</span>
        </div>
      )}
    </section>
  );
}
