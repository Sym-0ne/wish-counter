import { useState } from 'react';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';
import { IncomeConfig } from './IncomeConfig';
import { ExportImport } from './ExportImport';
import { CURRENT_VERSION } from '../store/initialState';

/**
 * Modal de paramètres : revenu, export/import, version courante, reset.
 */
export function Settings({
  open,
  onClose,
  state,
  onUpdateIncome,
  onSetVersion,
  onImport,
  onResetBanner,
  onResetAll,
}) {
  const [confirmReset, setConfirmReset] = useState(null); // null | bannerKey | 'all'

  if (!open) return null;

  const doReset = () => {
    if (confirmReset === 'all') {
      onResetAll();
    } else if (confirmReset) {
      onResetBanner(confirmReset);
    }
    setConfirmReset(null);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal__header">
          <h2 className="modal__title">Paramètres</h2>
          <button className="modal__close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="section-spacing">
          <section className="card">
            <h3 className="card__title">Version courante</h3>
            <p className="card__subtitle">
              Toutes les nouveaux tirages sont étiquetés avec cette version. Modifie-la
              quand tu changes de patch.
            </p>
            <div className="modal__field">
              <label>Version (ex: 6.5)</label>
              <input
                type="text"
                value={state.version}
                onChange={(e) => onSetVersion(e.target.value)}
                placeholder={CURRENT_VERSION}
              />
            </div>
          </section>

          <IncomeConfig
            income={state.income}
            onChange={onUpdateIncome}
          />

          <ExportImport state={state} onImport={onImport} />

          <section className="card">
            <h3 className="card__title" style={{ color: 'var(--danger)' }}>
              <AlertTriangle size={18} /> Zone dangereuse
            </h3>
            <p className="card__subtitle">
              Ces actions sont irréversibles. Pense à exporter avant.
            </p>
            <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn--danger" onClick={() => setConfirmReset('character')}>
                <RefreshCw size={14} /> Reset bannière personnage
              </button>
              <button className="btn btn--danger" onClick={() => setConfirmReset('weapon')}>
                <RefreshCw size={14} /> Reset bannière arme
              </button>
              <button className="btn btn--danger" onClick={() => setConfirmReset('standard')}>
                <RefreshCw size={14} /> Reset bannière standard
              </button>
              <button className="btn btn--danger" onClick={() => setConfirmReset('chronicled')}>
                <RefreshCw size={14} /> Reset chronicled
              </button>
              <button className="btn btn--danger" onClick={() => setConfirmReset('all')}>
                <RefreshCw size={14} /> Tout réinitialiser
              </button>
            </div>

            {confirmReset && (
              <div className="card" style={{ marginTop: '12px', borderColor: 'var(--danger)' }}>
                <div className="card__title" style={{ color: 'var(--danger)' }}>
                  <AlertTriangle size={16} /> Confirmer la suppression
                </div>
                <p className="card__subtitle">
                  {confirmReset === 'all'
                    ? 'Toutes les données seront effacées (les 4 bannières, les ressources, la collection dérivée).'
                    : `L'historique et les compteurs de la bannière "${confirmReset}" seront effacés.`}
                </p>
                <div className="flex gap-md">
                  <button className="btn btn--danger" onClick={doReset}>
                    Oui, supprimer
                  </button>
                  <button className="btn btn--ghost" onClick={() => setConfirmReset(null)}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
