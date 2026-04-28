import { Coins } from 'lucide-react';
import { INCOME_SOURCES, computeDailyPrimos } from '../utils/primoCalc';

/**
 * Configuration des sources de primogemmes quotidiennes.
 * Chaque toggle ajoute/retire la valeur primosPerDay à l'estimation.
 */
export function IncomeConfig({ income, onChange }) {
  const daily = computeDailyPrimos(income);

  const toggle = (key) => {
    onChange({ [key]: !income[key] });
  };

  const setNumber = (key, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    onChange({ [key]: num });
  };

  return (
    <section className="card">
      <h3 className="card__title">
        <Coins size={18} /> Sources de primogemmes
      </h3>
      <p className="card__subtitle">
        Coche les sources actives pour estimer ton revenu quotidien.
      </p>

      {Object.entries(INCOME_SOURCES).map(([key, def]) => (
        <div key={key} className="income__row">
          <div className="income__label">
            {def.label}
            <span className="muted"> +{def.primosPerDay}/j</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={!!income[key]}
              onChange={() => toggle(key)}
            />
            <span className="switch__slider" />
          </label>
        </div>
      ))}

      <div className="income__row">
        <div className="income__label">
          Événements (estimation/j)
          <span className="muted"> primogemmes des events en cours</span>
        </div>
        <input
          type="number"
          min="0"
          value={income.events || 0}
          onChange={(e) => setNumber('events', e.target.value)}
        />
      </div>

      <div className="income__row">
        <div className="income__label">
          Custom (autre)
          <span className="muted"> ajout libre par jour</span>
        </div>
        <input
          type="number"
          min="0"
          value={income.custom || 0}
          onChange={(e) => setNumber('custom', e.target.value)}
        />
      </div>

      <div className="primo__total" style={{ marginTop: '12px' }}>
        <span>Total estimé</span>
        <strong>{daily} primogemmes/jour</strong>
      </div>
    </section>
  );
}
