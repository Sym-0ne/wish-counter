import { Gem, Ticket } from 'lucide-react';
import { totalAvailableWishes } from '../utils/primoCalc';

export function PrimoCounter({ resources, income, banner, onChange, fateType = 'intertwined' }) {
  const calc = totalAvailableWishes({
    resources,
    income,
    endDate: banner.metadata.endDate,
    fateType,
  });

  const handleChange = (key, val) => {
    onChange({ [key]: Math.max(0, Number(val) || 0) });
  };

  return (
    <div className="card">
      <div className="card__title">
        <Gem size={16} />
        Ressources
      </div>

      <div className="primo__row">
        <label>Primogems</label>
        <input
          type="number"
          min="0"
          value={resources.primos}
          onChange={(e) => handleChange('primos', e.target.value)}
        />
      </div>
      <div className="primo__row">
        <label>Intertwined Fates</label>
        <input
          type="number"
          min="0"
          value={resources.intertwinedFates}
          onChange={(e) => handleChange('intertwinedFates', e.target.value)}
        />
      </div>
      <div className="primo__row">
        <label>Acquaint Fates</label>
        <input
          type="number"
          min="0"
          value={resources.acquaintFates}
          onChange={(e) => handleChange('acquaintFates', e.target.value)}
        />
      </div>

      <div className="primo__total">
        <div>
          <div className="text-xs muted">Tirages disponibles</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
            d'ici fin de bannière ({calc.days}j · +{calc.dailyPrimos} primos/jour)
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong>
            <Ticket size={16} style={{ verticalAlign: -2, marginRight: 4 }} />
            {calc.total}
          </strong>
          <div className="text-xs muted">
            {calc.fromPrimos} primos + {calc.fromFates} fates
          </div>
        </div>
      </div>
    </div>
  );
}
