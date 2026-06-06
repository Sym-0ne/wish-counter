import { useState } from 'react';
import { Layers, Star, Plus, Pencil, X, Check } from 'lucide-react';
import { useCollection } from '../hooks/useDerivedStats';

function ConstellationPips({ count, rank, isWeapon }) {
  const maxLevel = isWeapon ? 5 : 7;
  const level = Math.min(count, maxLevel);
  return (
    <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
      {Array.from({ length: maxLevel }).map((_, i) => (
        <span
          key={i}
          className={`constellation__pip ${
            i < level
              ? rank === 5
                ? 'constellation__pip--filled'
                : 'constellation__pip--filled-purple'
              : ''
          }`}
        />
      ))}
    </div>
  );
}

function ConstellationItem({ name, count, rank, isWeapon, wishCount, onAdjust }) {
  const [editing, setEditing] = useState(false);
  const maxLevel = isWeapon ? 5 : 7;
  const labelPrefix = isWeapon ? 'R' : 'C';
  const level = Math.min(count, maxLevel);
  const labelValue = isWeapon ? level : level - 1;

  function handleChange(delta) {
    const newCount = Math.max(isWeapon ? 1 : 1, count + delta);
    onAdjust(name, rank, isWeapon, newCount - wishCount);
  }

  function handleRemove() {
    onAdjust(name, rank, isWeapon, 0);
    setEditing(false);
  }

  const manualExtra = count - wishCount;

  return (
    <div className={`constellation__item constellation__item--${rank === 5 ? 'gold' : 'purple'}`}>
      <div className="constellation__name" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{name}</span>
        <button
          className="btn btn--ghost"
          onClick={() => setEditing(!editing)}
          style={{ padding: '2px 6px', fontSize: '11px' }}
          title="Modifier"
        >
          {editing ? <X size={12} /> : <Pencil size={12} />}
        </button>
      </div>
      <div className="constellation__level">
        {labelPrefix}{labelValue}
        {count > maxLevel && <span className="muted"> (+{count - maxLevel})</span>}
        {manualExtra !== 0 && (
          <span style={{ fontSize: '10px', color: 'var(--blue)', marginLeft: '4px' }}>
            ({manualExtra > 0 ? '+' : ''}{manualExtra} manuel)
          </span>
        )}
      </div>
      <ConstellationPips count={count} rank={rank} isWeapon={isWeapon} />
      {editing && (
        <div className="flex gap-sm" style={{ marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn--ghost"
            onClick={() => handleChange(-1)}
            disabled={count <= 1}
            style={{ padding: '2px 8px' }}
          >
            −
          </button>
          <span style={{ fontSize: '12px', minWidth: '60px', textAlign: 'center' }}>
            {count} {isWeapon ? 'ex.' : 'ex.'}
          </span>
          <button
            className="btn btn--ghost"
            onClick={() => handleChange(1)}
            style={{ padding: '2px 8px' }}
          >
            +
          </button>
          {manualExtra !== 0 && (
            <button
              className="btn btn--ghost"
              onClick={handleRemove}
              title="Retirer l'ajustement manuel"
              style={{ padding: '2px 8px', color: 'var(--danger)', fontSize: '11px' }}
            >
              Retirer manuel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddItemForm({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [isWeapon, setIsWeapon] = useState(false);
  const [rank, setRank] = useState(5);
  const [level, setLevel] = useState(0); // C0–C6 / R1–R5

  const maxLevel = isWeapon ? 4 : 6; // index maximal (R5=4, C6=6)
  const minLevel = isWeapon ? 0 : 0; // R1=0 (index), C0=0 (index)

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    // count = level + 1 pour personnages (C0=1, C6=7), level + 1 pour armes (R1=1, R5=5)
    const count = level + 1;
    onAdd(isWeapon ? 'weapon' : 'character', name.trim(), count, rank);
    onClose();
  }

  const labelPrefix = isWeapon ? 'R' : 'C';
  const labelValue = isWeapon ? level + 1 : level;

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <strong style={{ fontSize: '14px' }}>Ajouter hors vœux</strong>
        <button type="button" className="btn btn--ghost" onClick={onClose} style={{ padding: '2px 6px' }}>
          <X size={14} />
        </button>
      </div>
      <div className="modal__field">
        <label>Type</label>
        <div className="flex gap-md">
          <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
            <input type="radio" checked={!isWeapon} onChange={() => setIsWeapon(false)} />
            Personnage
          </label>
          <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
            <input type="radio" checked={isWeapon} onChange={() => setIsWeapon(true)} />
            Arme
          </label>
        </div>
      </div>
      <div className="modal__field">
        <label>Nom</label>
        <input
          type="text"
          placeholder={isWeapon ? "ex: Épée de Festering" : "ex: Amber"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex gap-md">
        <div className="modal__field" style={{ flex: 1 }}>
          <label>Rang</label>
          <select value={rank} onChange={(e) => setRank(Number(e.target.value))}>
            <option value={5}>5★</option>
            <option value={4}>4★</option>
          </select>
        </div>
        <div className="modal__field" style={{ flex: 1 }}>
          <label>{isWeapon ? 'Raffinement' : 'Constellation'} : {labelPrefix}{labelValue}</label>
          <input
            type="range"
            min={minLevel}
            max={maxLevel}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="flex gap-md" style={{ marginTop: '8px' }}>
        <button type="submit" className="btn btn--primary" disabled={!name.trim()}>
          <Check size={14} /> Ajouter
        </button>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function CollectionSection({ title, items, isWeapon, rank, wishCounts, onAdjust }) {
  const entries = Object.entries(items)
    .filter(([, d]) => d.rank === rank)
    .sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return a[0].localeCompare(b[0], 'fr');
    });

  if (entries.length === 0) {
    return (
      <section className="card">
        <h3 className="card__title">{title}</h3>
        <div className="empty-state">Aucun {isWeapon ? 'arme' : 'personnage'} {rank}★ obtenu pour l'instant.</div>
      </section>
    );
  }

  return (
    <section className="card">
      <h3 className="card__title">
        <Star size={18} /> {title} <span className="muted text-sm">({entries.length})</span>
      </h3>
      <div className="constellation__grid">
        {entries.map(([name, data]) => (
          <ConstellationItem
            key={name}
            name={name}
            count={data.count}
            rank={data.rank}
            isWeapon={isWeapon}
            wishCount={wishCounts[name] || 0}
            onAdjust={onAdjust}
          />
        ))}
      </div>
    </section>
  );
}

export function ConstellationTracker({ banners, manualCollection, onUpdateManual }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const { characters, weapons } = useCollection(banners, manualCollection);

  // wish-only counts (sans ajustements manuels) pour afficher l'offset
  const { characters: wishChars, weapons: wishWeps } = useCollection(banners, null);

  function handleAdd(itemType, name, count, rank) {
    onUpdateManual(itemType, name, count, rank);
  }

  function handleAdjust(name, rank, isWeapon, manualCount) {
    onUpdateManual(isWeapon ? 'weapon' : 'character', name, manualCount, rank);
  }

  return (
    <div className="section-spacing">
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="card__title">
              <Layers size={18} /> Collection
            </h3>
            <p className="card__subtitle">
              Dérivée automatiquement de l'historique et des entrées manuelles.
              Clique <Pencil size={12} style={{ verticalAlign: 'middle' }} /> pour ajuster un item.
            </p>
          </div>
          <button
            className="btn btn--primary"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ flexShrink: 0 }}
          >
            <Plus size={14} /> Ajouter hors vœux
          </button>
        </div>
        {showAddForm && (
          <AddItemForm onAdd={handleAdd} onClose={() => setShowAddForm(false)} />
        )}
      </section>

      <CollectionSection
        title="Personnages 5★"
        items={characters}
        isWeapon={false}
        rank={5}
        wishCounts={Object.fromEntries(Object.entries(wishChars).map(([k, v]) => [k, v.count]))}
        onAdjust={handleAdjust}
      />
      <CollectionSection
        title="Armes 5★"
        items={weapons}
        isWeapon={true}
        rank={5}
        wishCounts={Object.fromEntries(Object.entries(wishWeps).map(([k, v]) => [k, v.count]))}
        onAdjust={handleAdjust}
      />
      <CollectionSection
        title="Personnages 4★"
        items={characters}
        isWeapon={false}
        rank={4}
        wishCounts={Object.fromEntries(Object.entries(wishChars).map(([k, v]) => [k, v.count]))}
        onAdjust={handleAdjust}
      />
      <CollectionSection
        title="Armes 4★"
        items={weapons}
        isWeapon={true}
        rank={4}
        wishCounts={Object.fromEntries(Object.entries(wishWeps).map(([k, v]) => [k, v.count]))}
        onAdjust={handleAdjust}
      />
    </div>
  );
}
