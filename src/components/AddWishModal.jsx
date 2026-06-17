import { useEffect, useRef, useState } from 'react';
import { Plus, Undo2, X, Sparkles, Star } from 'lucide-react';
import { BANNER_CONFIG } from '../utils/banners';
import { getCharacterList, getWeaponList } from '../utils/genshinApi';

// ── Character / weapon autocomplete ────────────────────────────────────────

function NameAutocomplete({ value, onChange, onSelect, rank, bannerKey, inputRef, required }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const isWeaponBanner = bannerKey === 'weapon';

  useEffect(() => {
    if (rank < 4) return;
    const getter = isWeaponBanner ? getWeaponList : getCharacterList;
    getter()
      .then((list) => {
        const filtered = list.filter((i) => !i.rarity || i.rarity === rank);
        setItems(filtered);
      })
      .catch(() => {});
  }, [rank, isWeaponBanner]);

  const suggestions = items
    .filter((i) => !value || i.name.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 10);

  function handleSelect(item) {
    onChange(item.name);
    onSelect(isWeaponBanner ? 'weapon' : 'character');
    setOpen(false);
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={rank === 5 ? 'Lohen, Mavuika, Mistsplitter…' : 'Bennett, Fischl, Sacrificial…'}
        autoComplete="off"
        required={required}
      />
      {open && suggestions.length > 0 && (
        <div className="name-suggestions">
          {suggestions.map((item) => (
            <button
              key={item.slug}
              type="button"
              className="name-suggestion-item"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
            >
              <img
                src={item.portraitUrl}
                alt=""
                className="name-suggestion-portrait"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span>{item.name}</span>
              {item.rarity && (
                <span className="name-suggestion-rarity">
                  {'★'.repeat(item.rarity)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AddWishControls ─────────────────────────────────────────────────────────

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

// ── AddWishModal ────────────────────────────────────────────────────────────

export function AddWishModal({
  open,
  onClose,
  onSubmit,
  bannerKey,
  banner,
  initialRank = 5,
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

        <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                <NameAutocomplete
                  value={name}
                  onChange={setName}
                  onSelect={(type) => setItemType(type)}
                  rank={rank}
                  bannerKey={bannerKey}
                  inputRef={nameRef}
                  required
                />
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

          <div className="modal__footer" style={{ padding: 0, marginTop: 0 }}>
            <button type="button" className="btn" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn--primary">
              Enregistrer
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
