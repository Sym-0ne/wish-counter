import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { syncAllBanners, countNewWishes } from '../utils/wishSync';

// PowerShell one-liner that reads the game log and opens this app with the authkey URL
const PS_SCRIPT = `$url = Get-Content "$env:APPDATA\\..\\LocalLow\\miHoYo\\Genshin Impact\\output_log.txt" | Select-String "OnGetWebViewPageFinish:.*getGachaLog" | Select-Object -Last 1 | ForEach-Object { ($_ -split "OnGetWebViewPageFinish:")[1].Trim() }; if ($url) { Start-Process "https://sym-0ne.github.io/wish-counter/?authkey=$([uri]::EscapeDataString($url))" } else { Write-Host "Ouvre d'abord l'historique de voeux dans le jeu." }`;

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button className="btn btn--ghost btn--small" onClick={handleCopy} title="Copier">
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copié !' : 'Copier'}
    </button>
  );
}

function StepBadge({ n, active, done }) {
  return (
    <div
      style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: 700,
        background: done ? 'var(--success)' : active ? 'var(--gold)' : 'var(--surface-2)',
        color: done || active ? '#000' : 'var(--muted)',
        border: `1px solid ${done ? 'var(--success)' : active ? 'var(--gold)' : 'var(--border)'}`,
        transition: 'all 0.2s',
      }}
    >
      {done ? '✓' : n}
    </div>
  );
}

export function SyncModal({ open, onClose, sync, banners, onImportSynced, onUpdateSyncConfig, initialAuthkeyUrl }) {
  const [workerUrl, setWorkerUrl] = useState(sync.workerUrl || '');
  const [authkeyUrl, setAuthkeyUrl] = useState(initialAuthkeyUrl || sync.authkeyUrl || '');
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [showWorker, setShowWorker] = useState(false);
  const authkeyRef = useRef(null);

  // If a fresh authkey URL comes from URL param, fill it in
  useEffect(() => {
    if (initialAuthkeyUrl) {
      setAuthkeyUrl(initialAuthkeyUrl);
    }
  }, [initialAuthkeyUrl]);

  // Auto-focus the authkey field when modal opens without configured authkey
  useEffect(() => {
    if (open && !authkeyUrl && authkeyRef.current) {
      setTimeout(() => authkeyRef.current?.focus(), 150);
    }
  }, [open, authkeyUrl]);

  if (!open) return null;

  const workerOk = workerUrl.trim().startsWith('https://');
  const authkeyOk = authkeyUrl.trim().startsWith('https://');
  const canSync = workerOk && authkeyOk;

  const step1Done = workerOk;
  const step2Done = authkeyOk;

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
      setResult({ ok: true, count: total });
    } catch (err) {
      setResult({ ok: false, message: err.message });
    } finally {
      setSyncing(false);
      setProgress('');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal sync-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal__header">
          <h2 className="modal__title">
            <RefreshCw size={17} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Synchroniser les vœux
          </h2>
          <button className="modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* STEP 1 — Worker */}
          <div className="sync-step">
            <div className="sync-step__header">
              <StepBadge n={1} active={!step1Done} done={step1Done} />
              <span className="sync-step__title">Proxy Cloudflare Worker</span>
              {step1Done && (
                <button
                  className="btn btn--ghost btn--small"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => setShowWorker((v) => !v)}
                >
                  {showWorker ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {showWorker ? 'Masquer' : 'Modifier'}
                </button>
              )}
            </div>

            {(showWorker || !step1Done) && (
              <div className="sync-step__body">
                {!step1Done && (
                  <p className="sync-step__desc">
                    Déploie un Worker gratuit sur{' '}
                    <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>
                      dash.cloudflare.com
                    </a>{' '}
                    → Workers & Pages → Create Worker → colle le fichier{' '}
                    <code>cloudflare-worker/worker.js</code> du repo.
                  </p>
                )}
                <div className="modal__field">
                  <label>URL du Worker</label>
                  <input
                    type="url"
                    placeholder="https://genshin-sync.ton-compte.workers.dev"
                    value={workerUrl}
                    onChange={(e) => setWorkerUrl(e.target.value)}
                    disabled={syncing}
                  />
                </div>
              </div>
            )}

            {step1Done && !showWorker && (
              <p style={{ fontSize: '0.78rem', color: 'var(--success)', marginLeft: 32, marginTop: 4 }}>
                ✓ Configuré : <span style={{ color: 'var(--muted)' }}>{workerUrl.replace('https://', '').split('/')[0]}</span>
              </p>
            )}
          </div>

          {/* STEP 2 — Authkey */}
          <div className="sync-step">
            <div className="sync-step__header">
              <StepBadge n={2} active={step1Done && !step2Done} done={step2Done} />
              <span className="sync-step__title">URL authkey (expire toutes les 24h)</span>
            </div>

            <div className="sync-step__body">
              <p className="sync-step__desc">
                Lance Genshin Impact, ouvre l'<strong>historique de vœux</strong>, puis copie-colle cette commande dans <strong>PowerShell</strong> — elle lit le log du jeu et ouvre l'app automatiquement.
              </p>

              <div className="sync-code-block">
                <code>{PS_SCRIPT}</code>
                <CopyButton text={PS_SCRIPT} />
              </div>

              <p className="sync-step__desc" style={{ marginTop: 8 }}>
                Ou colle l'URL directement (commence par <code>https://</code>) :
              </p>
              <div className="modal__field">
                <input
                  ref={authkeyRef}
                  type="url"
                  placeholder="https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog?authkey_ver=1&…"
                  value={authkeyUrl}
                  onChange={(e) => setAuthkeyUrl(e.target.value)}
                  disabled={syncing}
                />
              </div>
            </div>
          </div>

          {/* Last sync info */}
          {sync.lastSync && (
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
              Dernière synchronisation : {new Date(sync.lastSync).toLocaleString('fr-FR')}
            </p>
          )}

          {/* Sync button + progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              <div
                className={`sync-result sync-result--${result.ok ? 'ok' : 'error'}`}
              >
                {result.ok
                  ? <><CheckCircle size={15} /> {result.count} nouveau(x) vœu(x) importé(s) avec succès !</>
                  : <><AlertCircle size={15} /> {result.message}</>
                }
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
