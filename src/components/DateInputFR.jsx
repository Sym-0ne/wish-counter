import { useState, useEffect } from 'react';

// Champ de date au format JJ/MM/AAAA, indépendant de la locale OS/navigateur
// (un <input type="date"> affiche son format selon la locale système, pas la page —
// donc MM/DD/YYYY pour un Windows en anglais même si le site est en français).
// La valeur exposée via onChange reste au format ISO 'YYYY-MM-DD' pour rester
// compatible avec le reste du code (new Date(), tri, etc.).

function isoToDisplay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function digitsToDisplay(digits) {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export function DateInputFR({ value, onChange, className, placeholder = 'JJ/MM/AAAA' }) {
  const [text, setText] = useState(() => isoToDisplay(value));

  useEffect(() => { setText(isoToDisplay(value)); }, [value]);

  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    setText(digitsToDisplay(digits));
    if (digits.length === 8) {
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8);
      onChange(`${year}-${month}-${day}`);
    } else if (digits.length === 0) {
      onChange('');
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      placeholder={placeholder}
      value={text}
      maxLength={10}
      onChange={handleChange}
    />
  );
}
