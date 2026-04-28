import { useRef, useState } from 'react';
import { Download, Upload, AlertTriangle } from 'lucide-react';

/**
 * Export et import de l'état complet en JSON.
 * - Export : déclenche un téléchargement (Blob + lien temporaire).
 * - Import : lit le fichier, valide la structure, demande confirmation merge/replace.
 */
export function ExportImport({ state, onImport }) {
  const fileInputRef = useRef(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [error, setError] = useState(null);

  const handleExport = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `genshin-tracker-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFile = async (event) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      // validation minimale : doit avoir un objet banners
      if (!parsed || typeof parsed !== 'object' || !parsed.banners) {
        throw new Error("Le fichier ne contient pas un état valide (clé 'banners' manquante).");
      }
      setPendingImport(parsed);
    } catch (err) {
      setError(err.message || 'Fichier JSON invalide.');
    } finally {
      // reset input pour permettre re-sélection du même fichier
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImport = (mode) => {
    onImport(pendingImport, mode);
    setPendingImport(null);
  };

  return (
    <section className="card">
      <h3 className="card__title">
        <Download size={18} /> Export / Import
      </h3>
      <p className="card__subtitle">
        Sauvegarde tes données en JSON ou restaure depuis un export précédent.
      </p>

      <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn--primary" onClick={handleExport}>
          <Download size={16} /> Exporter en JSON
        </button>
        <button className="btn" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} /> Importer un fichier
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>

      {error && (
        <div className="card" style={{ marginTop: '12px', borderColor: 'var(--danger)' }}>
          <div className="flex gap-sm" style={{ alignItems: 'center', color: 'var(--danger)' }}>
            <AlertTriangle size={16} /> {error}
          </div>
        </div>
      )}

      {pendingImport && (
        <div className="card" style={{ marginTop: '12px' }}>
          <div className="card__title">
            <AlertTriangle size={16} /> Confirmer l'import
          </div>
          <p className="card__subtitle">
            Choisis le mode :
            <br />
            <strong>Remplacer</strong> écrase tes données actuelles.
            <br />
            <strong>Fusionner</strong> ajoute les tirages importés à ton historique existant.
          </p>
          <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={() => confirmImport('merge')}>
              Fusionner
            </button>
            <button className="btn btn--danger" onClick={() => confirmImport('replace')}>
              Remplacer
            </button>
            <button className="btn btn--ghost" onClick={() => setPendingImport(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
