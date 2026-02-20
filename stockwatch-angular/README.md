# ◈ StockWatch — Angular 19

Real-time stock watcher with RSI + Moving Average buy/sell signals, built with Angular 19 + Angular Material.

---

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   └── stock.model.ts          # Interfaces: StockQuote, StockSignal, AlertEntry
│   │   └── services/
│   │       ├── api-key.service.ts      # Manages Polygon API key (localStorage)
│   │       ├── polygon.service.ts      # HTTP calls to Polygon.io
│   │       ├── signal.service.ts       # RSI, SMA, signal scoring logic
│   │       └── watchlist.service.ts    # State: quotes map, alerts, load/refresh
│   ├── features/
│   │   └── watchlist/
│   │       ├── watchlist.module.ts     # Feature module (lazy-loaded)
│   │       ├── watchlist-page.*        # Main page component
│   │       └── stock-card.*            # Individual stock card component
│   └── shared/
│       └── components/
│           └── sparkline/
│               └── sparkline.component.ts  # Canvas sparkline
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
└── styles/
    ├── _variables.scss     # Design tokens
    ├── theme.scss          # Angular Material dark theme
    └── global.scss         # Global resets + Material overrides
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Run dev server
```bash
ng serve
# or
npm start
```
Open [http://localhost:4200](http://localhost:4200)

### 3. Add your Polygon.io API key
- Sign up free at [polygon.io](https://polygon.io)
- Dashboard → API Keys → copy your key
- Paste it into the yellow banner in the app
- Your key is saved to `localStorage` — never leaves your browser

---

## Signal Logic

| Indicator | Condition | Score |
|---|---|---|
| RSI | < 30 (oversold) | +2 |
| RSI | 30–40 (low) | +1 |
| RSI | 60–70 (elevated) | -1 |
| RSI | > 70 (overbought) | -2 |
| MA Cross | SMA9 > SMA20 & price above | +1 |
| MA Cross | SMA9 < SMA20 & price below | -1 |
| Momentum | Sharp 5-day drop | +1 |
| Momentum | Sharp 5-day rise | -1 |

**Score ≥ 2** → Buy Signal  
**Score ≤ -2** → Sell Signal  
**Score ±1** → Watch  
**Score 0** → Hold  

---

## Git Workflow

```bash
# Feature branches
git checkout -b feature/macd-indicator
git checkout -b feature/push-notifications
git checkout -b feature/portfolio-tracker

# Always PR into main
git push origin feature/<name>
# Open PR on GitHub → merge when ready
```

---

## Adding the Next Feature

Each feature is a new lazy-loaded module under `src/app/features/`:

```bash
ng generate module features/portfolio --route portfolio --module app-routing
ng generate component features/portfolio/portfolio-page
```

---

## Tech Stack

- Angular 19 (NgModules, Signals, lazy loading)
- Angular Material 19 (dark theme)
- RxJS 7 (forkJoin, catchError)
- Polygon.io REST API (free tier)
- Canvas API (sparklines)
