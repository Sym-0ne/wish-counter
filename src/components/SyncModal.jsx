import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { syncAllBanners, countNewWishes } from '../utils/wishSync';
import { fetchBannerInfoFromAuth } from '../utils/gachaInfo';

// PowerShell one-liner — reads the game log (page URL), builds the API URL, opens the app
// Genshin v6.6+ logs the URL as: "web: N url: https://gs.hoyoverse.com/...?authkey=..."
// Older versions used "OnGetWebViewPageFinish:" — both patterns are searched.
const PS_SCRIPT = `$log="$env:APPDATA\\..\\LocalLow\\miHoYo\\Genshin Impact\\output_log.txt"; $m=Get-Content $log -EA 0|Select-String "web:.*url:.*authkey|OnGetWebViewPageFinish:.*authkey"|Select-Object -Last 1; if($m){$raw=if($m.Line -match "url: (https://\\S+)"){$matches[1]}else{($m.Line -split "OnGetWebViewPageFinish:",2)[1].Trim()}; $clean=($raw -split "#")[0]; $qs=($clean -split "\\?",2)[1]; $h=if($qs -match "region=cn_"){"public-operation-hk4e.hoyoverse.com"}else{"public-operation-hk4e-sg.hoyoverse.com"}; $api="https://$h/gacha_info/api/getGachaLog?$qs"; Set-Clipboard $api; Write-Host "URL authkey copiee ! Colle-la dans le champ de la fenetre de sync."}else{Write-Host "Ouvre l'historique de voeux dans le jeu et laisse la page se charger."}`;

function CopyButton({ text, label = 'Copier' }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button className="btn btn--ghost btn--small" onClick={handleCopy} title={label}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copié !' : label}
    </button>
  );
}

function StepBadge({ n, active, done }) {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.75rem', fontWeight: 700,
      background: done ? 'var(--success)' : active ? 'var(--gold)' : 'var(--surface-2)',
      color: done || active ? '#000' : 'var(--muted)',
      border: `1px solid ${done ? 'var(--success)' : active ? 'var(--gold)' : 'var(--border)'}`,
      transition: 'all 0.2s',
    }}>
      {done ? '✓' : n}
    </div>
  );
}

const DEFAULT_WORKER = import.meta.env.VITE_WORKER_URL || '';

export function SyncModal({ open, onClose, sync, banners, onImportSynced, onUpdateSyncConfig, onBannerInfoFetched, initialAuthkeyUrl }) {
  const workerUrl  = sync.workerUrl || DEFAULT_WORKER;
  const [authkeyUrl, setAuthkeyUrl] = useState(initialAuthkeyUrl || sync.authkeyUrl || '');
  const [syncing,  setSyncing]  = useState(false);
  const [progress, setProgress] = useState('');
  const [result,   setResult]   = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customWorker, setCustomWorker] = useState(sync.workerUrl || '');
  const authkeyRef = useRef(null);

  const hasBuiltinWorker = !!DEFAULT_WORKER;

  useEffect(() => {
    if (initialAuthkeyUrl) setAuthkeyUrl(initialAuthkeyUrl);
  }, [initialAuthkeyUrl]);

  useEffect(() => {
    if (open && !authkeyUrl && authkeyRef.current) {
      setTimeout(() => authkeyRef.current?.focus(), 150);
    }
  }, [open, authkeyUrl]);

  // L'authkey sauvegardée expire ~24h après sa collecte (effacée automatiquement par App.jsx).
  // Si ce clear externe survient pendant que cette modale est ouverte, on vide aussi le champ local.
  const prevSyncAuthkey = useRef(sync.authkeyUrl);
  useEffect(() => {
    if (prevSyncAuthkey.current && !sync.authkeyUrl && authkeyUrl === prevSyncAuthkey.current) {
      setAuthkeyUrl('');
    }
    prevSyncAuthkey.current = sync.authkeyUrl;
  }, [sync.authkeyUrl, authkeyUrl]);

  if (!open) return null;

  const effectiveWorker = (customWorker.trim().startsWith('https://') ? customWorker.trim() : null) || workerUrl;
  const workerOk  = effectiveWorker.startsWith('https://');
  const authkeyOk = authkeyUrl.trim().startsWith('https://');
  const canSync   = workerOk && authkeyOk;

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    setProgress('Démarrage…');

    try {
      const groups = await syncAllBanners(
        effectiveWorker,
        authkeyUrl.trim(),
        banners,
        setProgress,
      );
      const total = countNewWishes(groups);

      setProgress('Mise à jour des infos de bannière…');
      let bannerNames = {};
      try {
        bannerNames = await fetchBannerInfoFromAuth(effectiveWorker, authkeyUrl.trim());
        if (onBannerInfoFetched) onBannerInfoFetched(bannerNames);
      } catch { /* best-effort */ }

      onImportSynced(groups);
      const trimmed = authkeyUrl.trim();
      const isNewKey = trimmed !== sync.authkeyUrl;
      onUpdateSyncConfig({
        workerUrl: effectiveWorker,
        authkeyUrl: trimmed,
        authkeyObtainedAt: isNewKey ? new Date().toISOString() : sync.authkeyObtainedAt,
        lastSync: new Date().toISOString(),
      });
      setResult({ ok: true, count: total, bannerNames });
    } catch (err) {
      setResult({ ok: false, message: err.message });
    } finally {
      setSyncing(false);
      setProgress('');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal sync-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal__header">
          <h2 className="modal__title">
            <RefreshCw size={17} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Synchroniser les vœux
          </h2>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* STEP 1 — Open wish history */}
          <div className="sync-step">
            <div className="sync-step__header">
              <StepBadge n={1} active={!authkeyOk} done={authkeyOk} />
              <span className="sync-step__title">Ouvrir l'historique de vœux dans le jeu</span>
            </div>
            <div className="sync-step__body">
              <p className="sync-step__desc">
                Lance <strong>Genshin Impact</strong>, puis ouvre l'<strong>historique de vœux</strong> depuis le menu Portail des vœux → Détails.
                Attends que la page se charge complètement.
              </p>
            </div>
          </div>

          {/* STEP 2 — Get authkey */}
          <div className="sync-step">
            <div className="sync-step__header">
              <StepBadge n={2} active={!authkeyOk} done={authkeyOk} />
              <span className="sync-step__title">Extraire l'URL authkey</span>
            </div>
            <div className="sync-step__body">
              <p className="sync-step__desc">
                Colle cette commande dans <strong>PowerShell</strong> — elle lit le log du jeu et copie l'URL authkey dans ton presse-papiers :
              </p>
              <div className="sync-code-block">
                <code>{PS_SCRIPT}</code>
                <CopyButton text={PS_SCRIPT} />
              </div>
              <p className="sync-step__desc" style={{ marginTop: 8 }}>
                Puis colle l'URL dans le champ ci-dessous (<kbd>Ctrl+V</kbd>) — elle commence par <code>https://public-operation-hk4e</code> :
              </p>
              <div className="modal__field">
                <input
                  ref={authkeyRef}
                  type="url"
                  placeholder="https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog?authkey_ver=1&…"
                  value={authkeyUrl}
                  onChange={(e) => { setAuthkeyUrl(e.target.value); setResult(null); }}
                  disabled={syncing}
                />
              </div>
            </div>
          </div>

          {/* Advanced — custom Worker URL */}
          <div>
            <button
              className="btn btn--ghost btn--small"
              style={{ fontSize: '0.75rem', color: 'var(--muted)' }}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Paramètres avancés
            </button>

            {showAdvanced && (
              <div style={{ marginTop: 10, padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div className="modal__field">
                  <label>Worker URL (optionnel — laisse vide pour utiliser le serveur partagé)</label>
                  <input
                    type="url"
                    placeholder={DEFAULT_WORKER || 'https://ton-worker.workers.dev'}
                    value={customWorker}
                    onChange={(e) => setCustomWorker(e.target.value)}
                    disabled={syncing}
                  />
                </div>
                {hasBuiltinWorker && (
                  <p style={{ fontSize: '0.73rem', color: 'var(--muted)', marginTop: 6 }}>
                    Serveur partagé actif : <span style={{ color: 'var(--success)' }}>{DEFAULT_WORKER.replace('https://', '').split('/')[0]}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Last sync info */}
          {sync.lastSync && (
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
              Dernière synchronisation : {new Date(sync.lastSync).toLocaleString('fr-FR')}
            </p>
          )}

          {/* Sync button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!workerOk && !hasBuiltinWorker && (
              <p style={{ fontSize: '0.8rem', color: 'var(--soft-pity)', margin: 0 }}>
                ⚠ Aucun serveur proxy configuré — déploie un Worker Cloudflare ou demande à l'admin d'en configurer un.
              </p>
            )}

            <button
              className="btn btn--primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '1rem' }}
              onClick={handleSync}
              disabled={!canSync || syncing}
            >
              <RefreshCw size={16} className={syncing ? 'spin' : ''} />
              {syncing ? 'Synchronisation en cours…' : 'Synchroniser maintenant'}
            </button>

            {syncing && progress && (
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>
                {progress}
              </p>
            )}

            {result && (
              <div className={`sync-result sync-result--${result.ok ? 'ok' : 'error'}`}>
                {result.ok ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span>
                      <CheckCircle size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      {result.count} nouveau(x) vœu(x) importé(s)
                    </span>
                    {result.bannerNames?.character?.featured && (
                      <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>
                        ★ Bannière personnage : <strong>{result.bannerNames.character.featured}</strong>
                        {result.bannerNames.character.endDate ? ` (jusqu'au ${result.bannerNames.character.endDate})` : ''}
                      </span>
                    )}
                  </div>
                ) : (
                  <><AlertCircle size={15} /> {result.message}</>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
