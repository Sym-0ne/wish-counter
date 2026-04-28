# Genshin Wish Tracker

Tracker de tirages Genshin Impact 100% local : aucune donnée envoyée nulle part, tout est stocké dans le `localStorage` de ton navigateur.

Couvre les 4 bannières (personnage, arme, standard, chronicled) avec les règles officielles de pity, le système 50/50, l'Epitomized Path, le calcul de primogemmes projetées, des stats détaillées et un score de chance.

## Fonctionnalités

- **4 bannières gérées** : personnage (90/74), arme (80/63 + Fate Points 0–2), standard (90/74), chronicled (90/74)
- **Pity 4★ et 5★ indépendants** — un 5★ ne reset jamais la pity 4★
- **Pity douce** détectée automatiquement (≥74 sur 90, ≥63 sur 80) avec barre orange
- **Système 50/50** avec garantie après une perte (personnage + chronicled)
- **Epitomized Path** sur la bannière arme (Fate Points : 2 = arme ciblée garantie)
- **Annulation infinie** : `Ctrl+Z` recompte les compteurs depuis l'historique brut, jamais de décrément naïf
- **Raccourci clavier** : `Espace` pour +1 trois-étoile (utile pour rattraper un bulk de tirages)
- **Score de chance** : 50% de la pity moyenne vs théorique (~62.3) + 50% du win rate 50/50
- **Streak 50/50** : combien de wins/losses d'affilée
- **Calculateur de primos** : revenu quotidien (commissions, Welkin, BP, Abîme, Théâtre, événements, custom) projeté jusqu'à la fin de la phase
- **Probabilité Monte Carlo** (2000 simulations) : chance d'obtenir le 5★ ciblé avec les wishes restants
- **Stats par bannière** : histogramme de distribution des pity, win rate, meilleur/pire pity
- **Collection dérivée** : constellations C0–C6 et raffinements R1–R5 calculés depuis l'historique
- **Export / Import JSON** avec mode fusion ou remplacement
- **Filtre par version** sur l'historique
- **Objectifs (wishlist)** texte libre par bannière

## Stack

- Vite + React 18
- Recharts pour les graphes
- lucide-react pour les icônes
- lodash (utilitaires)
- Pas de backend, pas d'API externe

## Installation locale

```bash
npm install
npm run dev
```

L'application est servie sur `http://localhost:5173`.

Pour un build de production :

```bash
npm run build
npm run preview
```

## Déploiement sur GitHub Pages

L'application inclut un workflow GitHub Actions qui déploie automatiquement à chaque push sur `main`.

### Étapes

1. **Crée un dépôt GitHub** (par exemple `genshin-wish-tracker`).
2. **Édite `vite.config.js`** et change la ligne `base` avec le nom de ton dépôt :
   ```js
   base: '/nom-de-ton-repo/',
   ```
   Si ton dépôt s'appelle `mon-tracker`, mets `/mon-tracker/`.
3. **Push le code sur la branche `main`**.
4. **Active GitHub Pages** dans les paramètres du dépôt :
   - `Settings` → `Pages`
   - Source : **GitHub Actions**
5. Le workflow se déclenche automatiquement. Une fois fini, l'app est disponible à :
   `https://<ton-user>.github.io/<nom-du-repo>/`

Si tu utilises un domaine custom, ajoute un fichier `public/CNAME` avec ton domaine et mets `base: '/'` dans `vite.config.js`.

## Architecture

```
src/
├── main.jsx                  # Entry React
├── App.jsx                   # Composition globale + routing 3 vues
├── store/
│   ├── initialState.js       # État initial + version courante (6.5)
│   ├── actions.js            # Action types + creators
│   └── reducer.js            # Reducer (rebuild from history après chaque mutation)
├── hooks/
│   ├── usePersistedReducer.js  # useReducer + localStorage
│   ├── useKeyboardShortcuts.js # Espace, Ctrl+Z (skip si input focus)
│   └── useDerivedStats.js      # useCollection, useLuckScore, useStreak…
├── utils/
│   ├── banners.js            # BANNER_CONFIG (4 bannières)
│   ├── pityRules.js          # processHistory : recompute compteurs depuis history
│   ├── luckScore.js          # Calcul score chance + stats par bannière
│   ├── primoCalc.js          # Revenu quotidien, totalAvailableWishes
│   └── probability.js        # Simulation Monte Carlo
├── components/
│   ├── Header.jsx
│   ├── BannerInfo.jsx        # Métadonnées éditables
│   ├── PityCard.jsx          # Barres pity + badges + score chance
│   ├── AddWishModal.jsx      # AddWishControls + modal complet
│   ├── WishHistory.jsx       # Liste paginée + filtre version
│   ├── PrimoCounter.jsx      # Saisie primos + total wishes
│   ├── ProbabilityCalc.jsx   # Monte Carlo
│   ├── Wishlist.jsx          # Objectif texte libre
│   ├── StatsPanel.jsx        # Histogrammes + tiles
│   ├── ConstellationTracker.jsx # Collection C0–C6 / R1–R5 dérivée
│   ├── IncomeConfig.jsx      # Toggles sources de primos
│   ├── ExportImport.jsx      # JSON download + upload
│   └── Settings.jsx          # Modal paramètres global
└── styles/
    └── theme.css             # Thème dark Genshin (Cinzel + Inter)
```

## Invariants importants du code

Quelques règles à respecter si tu modifies le code :

- **Pity 4 et pity 5 sont indépendants.** Un 5★ ne reset PAS la pity 4★. Le code fait ce choix volontaire (cohérent avec ce qu'on observe en jeu : un 4★ peut sortir au pity 10 juste après un 5★).
- **La pity hard 4★ est à 10**, pas 11.
- **Toutes les mutations de bannière passent par `rebuildBanner()`** qui appelle `processHistory()` pour reconstruire compteurs + tags `pityAt` depuis l'historique brut. C'est ce qui rend l'undo trivial : on supprime le dernier wish et on recompute, jamais de décrément.
- **La collection (constellations) est dérivée**, jamais stockée. Le hook `useCollection` la reconstruit depuis l'union des histories à chaque changement.
- **Les raccourcis clavier sont désactivés si un input est focus** (cf. `isInputFocused()` dans `useKeyboardShortcuts.js`).

## Licence

MIT — fais-en ce que tu veux.
