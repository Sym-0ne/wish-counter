import { useEffect, useRef, useState } from 'react';
import { Plus, Undo2, X, Sparkles, Star } from 'lucide-react';
import { BANNER_CONFIG } from '../utils/banners';

export function AddWishControls({
  onOpenModal,
  onAddThreeStar,
  onAddFiveThreeStars,
  onUndo,
  canUndo,
}) {
  return (
    <div className="card">
      <div className="card__title">Ajouter un tirage</div>
      <div className="add-wish">
        <button className="btn btn--primary" onClick={() => onOpenModal(5)}>
          <Sparkles size={16} /> Ajouter 5★
        </button>
        <button className="btn" onClick={() => onOpenModal(4)}>
          <Star size={16} /> Ajouter 4★
        </button>
        <button className="btn" onClick={onAddThreeStar}>
          +1 trois-étoile
        </button>
        <button className="btn" onClick={onAddFiveThreeStars}>
          +5 trois-étoiles
        </button>
        <button className="btn btn--ghost btn--danger" onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={14} /> Annuler dernier
        </button>
      </div>
      <div className="add-wish__hint">
        <kbd>Espace</kbd> pour +1 trois-étoile · <kbd>Ctrl+Z</kbd> pour annuler
      </div>
    </div>
  );
}

export function AddWishModal({
  open,
  onClose,
  onSubmit,
  bannerKey,
  banner,
  initialRank = 5,
  nameSuggestions = { character: [], weapon: [] },
}) {
  const cfg = BANNER_CONFIG[bannerKey];
  const [rank, setRank] = useState(initialRank);
  const [name, setName] = useState('');
  const [itemType, setItemType] = useState(bannerKey === 'weapon' ? 'weapon' : 'character');
  const [featured, setFeatured] = useState(true);

  const nameRef = useRef(null);

  useEffect(() => {
    if (open) {
      setRank(initialRank);
      setName('');
      setItemType(bannerKey === 'weapon' ? 'weapon' : 'character');
      setFeatured(true);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, bannerKey, initialRank]);

  if (!open) return null;

  const showFeaturedToggle =
    rank >= 4 && (cfg.has5050 || cfg.hasFatePoints) && itemType !== '';

  const previewPity = rank === 5 ? banner.pity5 + 1 : rank === 4 ? banner.pity4 + 1 : null;

  // Suggestions filtrées par type sélectionné
  const currentSuggestions =
    (itemType === 'weapon' ? nameSuggestions.weapon : nameSuggestions.character) || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rank >= 4 && !name.trim()) {
      alert('Le nom est requis pour un 4★ ou 5★.');
      return;
    }
    onSubmit({
      rank,
      name: rank === 3 ? '' : name.trim(),
      itemType: rank === 3 ? 'weapon' : itemType,
      featured: rank >= 4 && showFeaturedToggle ? featured : false,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="modal__header">
          <h2 className="modal__title">Nouveau tirage · {cfg.label}</h2>
          <button type="button" className="modal__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal__field">
          <label>Rang obtenu</label>
          <div className="rank-selector">
            {[3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                data-rank={r}
                className={rank === r ? 'active' : ''}
                onClick={() => setRank(r)}
              >
                {r}★
              </button>
            ))}
          </div>
        </div>

        {rank >= 4 && (
          <>
            <div className="modal__field">
              <label>Nom</label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  rank === 5 ? 'Néfer, Mistsplitter…' : 'Bennett, Sacrificial Sword…'
                }
                list="wish-name-suggestions"
                autoComplete="off"
                required
              />
              <datalist id="wish-name-suggestions">
                {currentSuggestions.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {currentSuggestions.length > 0 && (
                <div className="text-xs muted" style={{ marginTop: 4 }}>
                  {currentSuggestions.length}{' '}
                  {itemType === 'weapon' ? 'arme(s)' : 'personnage(s)'} déjà enregistré(es)
                  — tape pour filtrer ou choisis dans la liste
                </div>
              )}
            </div>

            <div className="modal__field">
              <label>Type</label>
              <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
                <option value="character">Personnage</option>
                <option value="weapon">Arme</option>
              </select>
            </div>

            {showFeaturedToggle && (
              <div className="modal__field">
                <div className="checkbox-row">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                  />
                  <label htmlFor="featured" style={{ marginBottom: 0, cursor: 'pointer' }}>
                    {bannerKey === 'weapon'
                      ? "C'est l'arme ciblée (Epitomized Path)"
                      : "C'est le personnage / l'arme featured (50/50 gagné)"}
                  </label>
                </div>
                {!featured && rank === 5 && cfg.has5050 && (
                  <div className="text-xs muted" style={{ marginTop: 6 }}>
                    Le prochain 5★ sera garanti featured.
                  </div>
                )}
                {!featured && rank === 5 && cfg.hasFatePoints && (
                  <div className="text-xs muted" style={{ marginTop: 6 }}>
                    +1 Fate Point (2 = arme ciblée garantie).
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {previewPity !== null && (
          <div
            style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--surface-2)',
              borderRadius: 6,
              fontSize: '0.78rem',
              color: 'var(--muted)',
            }}
          >
            Sera enregistré à la pity {rank}★ :{' '}
            <strong style={{ color: 'var(--accent)' }}>{previewPity}</strong>
          </div>
        )}

        <div className="modal__footer">
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn--primary">
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}