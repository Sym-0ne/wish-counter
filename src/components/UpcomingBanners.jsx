import { useEffect, useState, useCallback } from 'react';
import { CalendarClock, Plus, Pencil, Trash2, X, Check, Github, Loader } from 'lucide-react';
import { getUpcomingBanners, bustUpcomingCache } from '../utils/bannerFetch';
import { bustAllBannersCache } from '../utils/allBannersFetch';
import { writeViaWorker, nameToPortrait } from '../utils/githubUpcoming';

const BANNER_LABEL = {
  character:  'Perso',
  weapon:     'Arme',
  chronicled: 'Archivé',
  standard:   'Standard',
};
const CONFIDENCE_LABEL = {
  officiel: { text: 'Officiel', cls: 'badge badge--success' },
  leak:     { text: 'Leak',    cls: 'badge badge--soft badge--pulse' },
};
const BLANK_ENTRY = {
  bannerKey:  'character',
  version:    '',
  phase:      1,
  featured:   '',
  featured2:  '',
  startDate:  '',
  endDate:    '',
  confidence: 'leak',
  source:     '',
};

function formatDate(d) {
  if (!d) return '?';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Inline portrait display — tries the enka URL, hides on error. */
function Portrait({ name, portrait: overrideUrl }) {
  const src = overrideUrl || nameToPortrait(name);
  if (!src) return <div className="ub-card__portrait ub-card__portrait--placeholder">?</div>;
  return (
    <img
      src={src}
      alt={name}
      className="ub-card__portrait"
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  );
}

/** Form for adding or editing an entry. */
function EntryForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...BLANK_ENTRY, ...initial });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const canSave = form.featured.trim();

  return (
    <div className="ub-form">
      <div className="ub-form__row">
        <div className="ub-form__field">
          <label className="ub-form__label">Bannière</label>
          <select className="ub-form__select" value={form.bannerKey} onChange={(e) => set('bannerKey', e.target.value)}>
            <option value="character">Personnage</option>
            <option value="weapon">Arme</option>
            <option value="chronicled">Archivé</option>
          </select>
        </div>
        <div className="ub-form__field">
          <label className="ub-form__label">Version</label>
          <input className="ub-form__input" placeholder="6.7" value={form.version} onChange={(e) => set('version', e.target.value)} />
        </div>
        <div className="ub-form__field">
          <label className="ub-form__label">Phase</label>
          <select className="ub-form__select" value={form.phase} onChange={(e) => set('phase', Number(e.target.value))}>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </div>
      </div>

      <div className="ub-form__row">
        <div className="ub-form__field ub-form__field--grow">
          <label className="ub-form__label">5★ principal *</label>
          <input
            className="ub-form__input"
            placeholder="Sandrone"
            value={form.featured}
            onChange={(e) => set('featured', e.target.value)}
          />
        </div>
        <div className="ub-form__field ub-form__field--grow">
          <label className="ub-form__label">5★ secondaire</label>
          <input
            className="ub-form__input"
            placeholder="Cyno (re-run)"
            value={form.featured2}
            onChange={(e) => set('featured2', e.target.value)}
          />
        </div>
      </div>

      <div className="ub-form__row">
        <div className="ub-form__field">
          <label className="ub-form__label">Confiance</label>
          <select className="ub-form__select" value={form.confidence} onChange={(e) => set('confidence', e.target.value)}>
            <option value="leak">Leak</option>
            <option value="officiel">Officiel</option>
          </select>
        </div>
        <div className="ub-form__field ub-form__field--grow">
          <label className="ub-form__label">Source</label>
          <input className="ub-form__input" placeholder="WFP leaks" value={form.source} onChange={(e) => set('source', e.target.value)} />
        </div>
      </div>

      <div className="ub-form__row">
        <div className="ub-form__field">
          <label className="ub-form__label">Début</label>
          <input type="date" className="ub-form__input" value={form.startDate || ''} onChange={(e) => set('startDate', e.target.value)} />
        </div>
        <div className="ub-form__field">
          <label className="ub-form__label">Fin</label>
          <input type="date" className="ub-form__input" value={form.endDate || ''} onChange={(e) => set('endDate', e.target.value)} />
        </div>
      </div>

      <div className="ub-form__actions">
        <button className="btn btn--primary" disabled={!canSave} onClick={() => onSave(form)}>
          <Check size={14} /> Enregistrer
        </button>
        <button className="btn btn--ghost" onClick={onCancel}>
          <X size={14} /> Annuler
        </button>
      </div>
    </div>
  );
}

export function UpcomingBanners({ workerUrl, upcomingUser, upcomingPassword }) {
  const [entries, setEntries] = useState(null);   // null = loading
  const [adding, setAdding]   = useState(false);
  const [editIdx, setEditIdx] = useState(null);   // index being edited
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);   // { ok, text }

  const load = useCallback(() => {
    getUpcomingBanners().then(setEntries);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function pushToGitHub(updatedEntries) {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const manual = updatedEntries.filter((e) => !(e.source === 'paimon.moe' && e.confidence === 'officiel'));
      await writeViaWorker(workerUrl, upcomingUser, upcomingPassword, manual);
      setSyncMsg({ ok: true, text: 'Synchronisé avec GitHub ✓' });
      // Bust les deux caches module pour forcer un re-fetch propre
      bustUpcomingCache();
      bustAllBannersCache();
      // Notifie AllBannersTimeline de se recharger
      window.dispatchEvent(new CustomEvent('upcoming-banners-updated'));
      // Recharge les entrées locales avec les données fraîches
      getUpcomingBanners().then(setEntries);
    } catch (err) {
      setSyncMsg({ ok: false, text: `Erreur : ${err.message}` });
    } finally {
      setSyncing(false);
    }
  }

  function handleAdd(form) {
    const entry = buildEntry(form);
    const updated = [...(entries ?? []), entry];
    setEntries(updated);
    setAdding(false);
    pushToGitHub(updated);
  }

  function handleEdit(idx, form) {
    const updated = entries.map((e, i) => i === idx ? buildEntry(form) : e);
    setEntries(updated);
    setEditIdx(null);
    pushToGitHub(updated);
  }

  function handleDelete(idx) {
    const updated = entries.filter((_, i) => i !== idx);
    setEntries(updated);
    pushToGitHub(updated);
  }

  function buildEntry(form) {
    return {
      bannerKey:          form.bannerKey,
      version:            form.version || null,
      phase:              form.phase || 1,
      featured:           form.featured.trim() || null,
      featuredSlug:       null,
      featuredPortrait:   null,
      featured2:          form.featured2.trim() || null,
      featured2Slug:      null,
      featured2Portrait:  null,
      startDate:          form.startDate || null,
      endDate:            form.endDate   || null,
      confidence:         form.confidence,
      source:             form.source.trim() || null,
    };
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (entries === null) return null;

  const hasToken = !!(workerUrl && upcomingUser && upcomingPassword);

  return (
    <section className="card ub-section">
      <div className="ub-header">
        <h3 className="card__title" style={{ marginBottom: 0 }}>
          <CalendarClock size={18} /> Prochaines bannières
        </h3>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => { setAdding(true); setEditIdx(null); }}
          title="Ajouter une bannière"
        >
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {!hasToken && entries.length > 0 && (
        <p className="ub-token-hint">
          Configure ton identifiant dans Paramètres → Synchronisation pour éditer.
        </p>
      )}

      {syncMsg && (
        <div className={`ub-sync-msg ub-sync-msg--${syncMsg.ok ? 'ok' : 'err'}`}>
          {syncMsg.ok ? <Check size={13} /> : <X size={13} />}
          {syncMsg.text}
        </div>
      )}

      {adding && (
        <EntryForm
          initial={BLANK_ENTRY}
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}

      {entries.length === 0 && !adding && (
        <p className="ub-empty">Aucune bannière future connue. Clique "Ajouter" pour en saisir une.</p>
      )}

      <div className="ub-list">
        {entries.map((b, i) => {
          const conf  = CONFIDENCE_LABEL[b.confidence] ?? CONFIDENCE_LABEL.leak;
          const chars = [
            b.featured  && { name: b.featured,  portrait: b.featuredPortrait },
            b.featured2 && { name: b.featured2, portrait: b.featured2Portrait },
          ].filter(Boolean);

          if (editIdx === i) {
            return (
              <div key={i} className="ub-card ub-card--editing">
                <EntryForm
                  initial={{
                    ...b,
                    startDate: b.startDate || '',
                    endDate:   b.endDate   || '',
                    featured:  b.featured  || '',
                    featured2: b.featured2 || '',
                    source:    b.source    || '',
                    version:   b.version   || '',
                  }}
                  onSave={(form) => handleEdit(i, form)}
                  onCancel={() => setEditIdx(null)}
                />
              </div>
            );
          }

          return (
            <div key={i} className="ub-card">
              <div className="ub-card__portraits">
                {chars.length > 0
                  ? chars.map((c, ci) => <Portrait key={ci} name={c.name} portrait={c.portrait} />)
                  : <div className="ub-card__portrait ub-card__portrait--placeholder">?</div>
                }
              </div>

              <div className="ub-card__body">
                <div className="ub-card__name">
                  {chars.map((c, ci) => (
                    <span key={ci}>
                      {ci > 0 && <span className="ub-card__name-sep"> + </span>}
                      {c.name}
                    </span>
                  ))}
                  {chars.length === 0 && '?'}
                </div>

                <div className="ub-card__meta">
                  <span className="badge badge--ghost">{BANNER_LABEL[b.bannerKey] ?? b.bannerKey}</span>
                  {b.version && <span className="badge badge--ghost">v{b.version}{b.phase > 1 ? ` P${b.phase}` : ''}</span>}
                  <span className={conf.cls}>{conf.text}</span>
                  {b.source && <span className="ub-card__source">{b.source}</span>}
                </div>

                {(b.startDate || b.endDate) && (
                  <div className="ub-card__dates">
                    {formatDate(b.startDate)} → {formatDate(b.endDate)}
                  </div>
                )}
              </div>

              {hasToken && (
                <div className="ub-card__actions">
                  <button
                    className="btn btn--ghost btn--icon"
                    title="Modifier"
                    onClick={() => { setEditIdx(i); setAdding(false); }}
                  >
                    <Pencil size={13} />
                  </button>
                  {b.confidence !== 'officiel' && (
                    <button
                      className="btn btn--ghost btn--icon"
                      title="Supprimer"
                      onClick={() => handleDelete(i)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}

              {syncing && <Loader size={14} className="spin ub-card__spin" />}
            </div>
          );
        })}
      </div>

      {hasToken && entries.length > 0 && (
        <button
          className="btn btn--ghost btn--sm ub-sync-btn"
          onClick={() => pushToGitHub(entries)}
          disabled={syncing}
        >
          <Github size={13} /> {syncing ? 'Synchronisation…' : 'Sync GitHub'}
        </button>
      )}
    </section>
  );
}
