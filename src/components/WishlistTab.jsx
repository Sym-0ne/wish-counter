import { useState, useEffect, useRef } from 'react';
import { Target, Plus, X, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { getCharacterList, getWeaponList, findItem } from '../utils/genshinApi';

// ── Portrait cache ───────────────────────────────────────────────────────────

const portraitCache = {};

async function resolvePortrait(name, itemType) {
  const key = `${itemType}:${name}`;
  if (key in portraitCache) return portraitCache[key];
  try {
    const list = itemType === 'weapon' ? await getWeaponList() : await getCharacterList();
    const item = findItem(list, name);
    portraitCache[key] = item?.portraitUrl ?? null;
  } catch {
    portraitCache[key] = null;
  }
  return portraitCache[key];
}

function usePortrait(name, itemType) {
  const [url, setUrl] = useState(portraitCache[`${itemType}:${name}`] ?? null);
  useEffect(() => {
    if (!name) return;
    resolvePortrait(name, itemType).then(setUrl);
  }, [name, itemType]);
  return url;
}

// ── Autocomplete shared ──────────────────────────────────────────────────────

function WishlistAutocomplete({ value, onChange, onSelect, itemType }) {
  const [allItems, setAllItems] = useState([]);
  const [open, setOpen]         = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const getter = itemType === 'weapon' ? getWeaponList : getCharacterList;
    getter().then(setAllItems).catch(() => {});
  }, [itemType]);

  const suggestions = allItems
    .filter((i) => !value || i.name.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 8);

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={itemType === 'weapon' ? 'Mistsplitter, Calamity Queller…' : 'Hu Tao, Mavuika…'}
        autoComplete="off"
        style={{ width: '100%' }}
        className="wl-input"
      />
      {open && suggestions.length > 0 && (
        <div className="name-suggestions">
          {suggestions.map((item) => (
            <button
              key={item.slug}
              type="button"
              className="name-suggestion-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(item.name);
                onSelect(item);
                setOpen(false);
              }}
            >
              <img
                src={item.portraitUrl}
                alt=""
                className="name-suggestion-portrait"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span>{item.name}</span>
              {item.rarity && (
                <span className="name-suggestion-rarity">{'★'.repeat(item.rarity)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Priority config ──────────────────────────────────────────────────────────

const PRIORITIES = [
  { key: 'must',   label: 'Indispensable', color: 'var(--gold-light)',  bg: 'rgba(200,168,75,0.12)',  border: 'rgba(200,168,75,0.5)'  },
  { key: 'want',   label: 'Souhaité',      color: 'var(--teal)',        bg: 'rgba(79,209,197,0.10)',  border: 'rgba(79,209,197,0.4)'  },
  { key: 'casual', label: 'Casual',        color: 'var(--muted)',       bg: 'rgba(255,255,255,0.04)', border: 'rgba(180,148,64,0.2)'  },
];

function priorityStyle(key) {
  return PRIORITIES.find((p) => p.key === key) ?? PRIORITIES[2];
}

// ── Copies counter ───────────────────────────────────────────────────────────

function copiesLabel(n, itemType) {
  if (itemType === 'weapon') return `R${n}`;
  return `C${n - 1}`;
}

function CopiesCounter({ value, onChange, itemType }) {
  const max = itemType === 'weapon' ? 5 : 7;
  return (
    <div className="wl-copies">
      <button
        type="button"
        className="wl-copies__btn"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
      ><ChevronDown size={12} /></button>
      <span className="wl-copies__label">{copiesLabel(value, itemType)}</span>
      <button
        type="button"
        className="wl-copies__btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      ><ChevronUp size={12} /></button>
    </div>
  );
}

// ── Add form ─────────────────────────────────────────────────────────────────

function AddForm({ onAdd, onCancel }) {
  const [name,        setName]        = useState('');
  const [itemType,    setItemType]    = useState('character');
  const [priority,    setPriority]    = useState('must');
  const [targetCopies, setTargetCopies] = useState(1);

  function handleSelect(item) {
    setName(item.name);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), itemType, priority, targetCopies });
  }

  return (
    <form className="wl-add-form" onSubmit={handleSubmit}>
      {/* Type toggle */}
      <div className="wl-add-form__row">
        <div className="rank-selector" style={{ flex: 1 }}>
          {['character', 'weapon'].map((t) => (
            <button
              key={t}
              type="button"
              data-rank={t === 'character' ? 5 : 4}
              className={itemType === t ? 'active' : ''}
              onClick={() => { setItemType(t); setName(''); setTargetCopies(1); }}
            >
              {t === 'character' ? 'Personnage' : 'Arme'}
            </button>
          ))}
        </div>
        <CopiesCounter value={targetCopies} onChange={setTargetCopies} itemType={itemType} />
      </div>

      {/* Name */}
      <WishlistAutocomplete
        value={name}
        onChange={setName}
        onSelect={handleSelect}
        itemType={itemType}
      />

      {/* Priority */}
      <div className="wl-add-form__row">
        {PRIORITIES.map((p) => (
          <button
            key={p.key}
            type="button"
            className="btn btn--small"
            onClick={() => setPriority(p.key)}
            style={priority === p.key ? {
              color: p.color,
              borderColor: p.border,
              background: p.bg,
            } : {}}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="wl-add-form__actions">
        <button type="button" className="btn btn--ghost btn--small" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn btn--primary btn--small" disabled={!name.trim()}>
          <Plus size={13} /> Ajouter
        </button>
      </div>
    </form>
  );
}

// ── Wishlist item card ────────────────────────────────────────────────────────

function WishlistCard({ item, onRemove, onUpdate }) {
  const [imgErr, setImgErr] = useState(false);
  const portraitUrl = usePortrait(item.name, item.itemType);
  const [editCopies, setEditCopies] = useState(false);
  const p = priorityStyle(item.priority);
  const max = item.itemType === 'weapon' ? 5 : 7;

  return (
    <div className="wl-card">
      {/* Portrait */}
      {portraitUrl && !imgErr ? (
        <img
          src={portraitUrl}
          alt={item.name}
          className="wl-card__portrait"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="wl-card__portrait wl-card__portrait--placeholder">★</div>
      )}

      {/* Info */}
      <div className="wl-card__info">
        <span className="wl-card__name">{item.name}</span>
        <span className="wl-card__type muted text-xs">
          {item.itemType === 'weapon' ? 'Arme' : 'Personnage'}
        </span>
      </div>

      {/* Priority badge */}
      <span
        className="wl-card__priority"
        style={{ color: p.color, borderColor: p.border, background: p.bg }}
      >
        {p.label}
      </span>

      {/* Target copies — click to cycle */}
      <button
        type="button"
        className="wl-card__copies"
        title={`Objectif : ${copiesLabel(item.targetCopies, item.itemType)} — cliquer pour modifier`}
        onClick={() => {
          const next = item.targetCopies >= max ? 1 : item.targetCopies + 1;
          onUpdate({ targetCopies: next });
        }}
      >
        {copiesLabel(item.targetCopies, item.itemType)}
      </button>

      {/* Delete */}
      <button
        type="button"
        className="btn btn--ghost btn--small wl-card__delete"
        title="Supprimer"
        onClick={onRemove}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const PRIORITY_ORDER = { must: 0, want: 1, casual: 2 };

export function WishlistTab({ wishlistItems = [], onAdd, onRemove, onUpdate }) {
  const [adding, setAdding] = useState(false);

  const sorted = [...wishlistItems].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
  );

  function handleAdd(item) {
    onAdd(item);
    setAdding(false);
  }

  return (
    <div className="section-spacing" style={{ maxWidth: 720, margin: '0 auto' }}>
      <section className="card">
        <h3 className="card__title">
          <Target size={18} /> Wishlist
        </h3>
        <p className="card__subtitle">
          Les personnages et armes que tu vises. Clique sur le badge de copies pour changer l'objectif.
        </p>

        {!adding && (
          <button
            className="btn btn--primary btn--small"
            onClick={() => setAdding(true)}
            style={{ marginTop: 8 }}
          >
            <Plus size={14} /> Ajouter un objectif
          </button>
        )}

        {adding && (
          <AddForm onAdd={handleAdd} onCancel={() => setAdding(false)} />
        )}
      </section>

      {sorted.length === 0 && !adding && (
        <div className="card">
          <div className="empty-state">
            Ta wishlist est vide.<br />
            <span className="text-xs">Ajoute les personnages et armes que tu vises.</span>
          </div>
        </div>
      )}

      {/* Group by priority */}
      {PRIORITIES.map((p) => {
        const items = sorted.filter((i) => i.priority === p.key);
        if (!items.length) return null;
        return (
          <section key={p.key} className="card">
            <div className="wl-section-header">
              <span style={{ color: p.color, fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {p.label}
              </span>
              <span className="muted text-xs">{items.length} objectif{items.length > 1 ? 's' : ''}</span>
            </div>
            <div className="wl-list">
              {items.map((item) => (
                <WishlistCard
                  key={item.id}
                  item={item}
                  onRemove={() => onRemove(item.id)}
                  onUpdate={(patch) => onUpdate(item.id, patch)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
