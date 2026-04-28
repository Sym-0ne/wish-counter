import { Layers, Star } from 'lucide-react';
import { useCollection } from '../hooks/useDerivedStats';

/**
 * Affiche la collection dérivée des histories.
 * 5★ : C0 → C6 (7 pips dorés). 4★ : C0 → C6 également.
 * Armes : R1 → R5 (5 pips). Le rang correspond au nombre d'exemplaires obtenus - 1.
 */
function ConstellationItem({ name, count, rank, isWeapon }) {
  // Pour les personnages : C0 (1 exemplaire) → C6 (7 exemplaires).
  // Pour les armes : R1 (1) → R5 (5).
  const maxLevel = isWeapon ? 5 : 7;
  const level = Math.min(count, maxLevel);
  const labelPrefix = isWeapon ? 'R' : 'C';
  const labelValue = isWeapon ? level : level - 1;

  return (
    <div className={`constellation__item constellation__item--${rank === 5 ? 'gold' : 'purple'}`}>
      <div className="constellation__name">{name}</div>
      <div className="constellation__level">
        {labelPrefix}{labelValue}
        {count > maxLevel && <span className="muted"> (+{count - maxLevel})</span>}
      </div>
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
    </div>
  );
}

function CollectionSection({ title, items, isWeapon, rank }) {
  const entries = Object.entries(items).sort((a, b) => {
    // tri par nombre décroissant, puis par nom
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
          />
        ))}
      </div>
    </section>
  );
}

export function ConstellationTracker({ banners }) {
  const { characters, weapons } = useCollection(banners);

  // Sépare 5★ et 4★ selon le rank stocké
  const split = (collection) => {
    const five = {};
    const four = {};
    for (const [name, data] of Object.entries(collection)) {
      (data.rank === 5 ? five : four)[name] = data;
    }
    return { five, four };
  };

  const charsSplit = split(characters);
  const wepsSplit = split(weapons);

  return (
    <div className="section-spacing">
      <section className="card">
        <h3 className="card__title">
          <Layers size={18} /> Collection
        </h3>
        <p className="card__subtitle">
          Constellations et raffinements dérivés automatiquement de ton historique.
          Les pips dorés = 5★, violets = 4★.
        </p>
      </section>

      <CollectionSection
        title="Personnages 5★"
        items={charsSplit.five}
        isWeapon={false}
        rank={5}
      />
      <CollectionSection
        title="Armes 5★"
        items={wepsSplit.five}
        isWeapon={true}
        rank={5}
      />
      <CollectionSection
        title="Personnages 4★"
        items={charsSplit.four}
        isWeapon={false}
        rank={4}
      />
      <CollectionSection
        title="Armes 4★"
        items={wepsSplit.four}
        isWeapon={true}
        rank={4}
      />
    </div>
  );
}
