# Copilot Instructions — SimpleVisor Pro

## Project Overview

Full-stack financial analysis platform: **React 19 + TypeScript + Vite** frontend, **Python Flask** backend. No test suite is configured for either side.

## Architecture

### Frontend (`frontend-react/`)

- **Stack:** React 19, TypeScript, Vite (port 4200), PrimeReact components, PrimeFlex layout utilities, Highcharts for all charts
- **Entry:** `App.tsx` wraps `ThemeProvider` → `AuthProvider` → `RouterProvider`
- **Routing (`router.tsx`):** All routes nest under `<Layout />`. Pages are lazy-loaded via `withSuspense()`. Authenticated routes use `withProtection()` which wraps in `<ProtectedRoute>`. Many routes are TODO stubs rendering placeholder pages.
- **API layer (`services/api.ts`):** Single axios instance, base URL `/api`. Request interceptor auto-attaches JWT from `localStorage` key `currentUser`. Response interceptor dispatches `"sv-auth-expired"` CustomEvent on 401, which `AuthContext` listens to for auto-logout.
- **Path alias:** `@` maps to `./src/` (configured in both `tsconfig.json` and `vite.config.ts`)

### Backend (`backend/`)

- **Entry:** `index.py` — registers ~25 Flask Blueprints, each in a separate `*_api.py` file (e.g., `portfolio_api.py` exports `api_portfolio`)
- **Databases:** Dual-database — MySQL (via `dbutil.py`, uses `mysql.connector`) and MongoDB (via `dao/mongodb.py`, uses `pymongo`, database name `chartlab`)
- **Auth:** JWT tokens issued in `login.py` using `PyJWT`. Global `@app.before_request` in `index.py` validates tokens on all routes except those listed in `PUBLIC_ROUTES`. Also supports API key auth via `X-API-Key` header for routes in `API_KEY_ROUTES`.
- **Config (`MyConfig.py`):** Reads all secrets/config from environment variables via `dotenv`. Includes DB credentials, API keys (Polygon, RapidAPI, EOD, Stripe, Plaid), JWT secret.

### Dev Proxy

Vite proxies `/api/*` → `http://localhost:5000` and strips the `/api` prefix. The backend routes have no `/api` prefix — e.g., frontend calls `/api/login`, backend handles `/login`.

## Commands

```bash
# Frontend (from frontend-react/)
npm run dev       # Dev server on port 4200
npm run build     # TypeScript check + Vite build
npm run lint      # ESLint

# Backend (from backend/)
python index.py   # Dev server on port 5000
```

## Key Conventions

### Frontend Styling

- **Never hardcode colors.** Use CSS variables from `styles/themes.css` with `--sv-*` prefix.
- Three themes: `dark`, `dim`, `light` — applied via `data-theme` attribute on `<html>`. All theme-aware colors are defined as CSS variables under `[data-theme="..."]` selectors.
- Use `var(--sv-gain)` / `var(--sv-loss)` for positive/negative financial values.
- Use `var(--sv-text-primary)`, `var(--sv-text-secondary)`, `var(--sv-text-muted)` for text hierarchy.
- PrimeReact variables are bridged automatically (e.g., `--primary-color` → `--sv-accent`).
- Layout uses PrimeFlex classes: `grid`, `col-12 md:col-6 lg:col-3`, `flex`, `gap-*`, `p-*`, `mb-*`.

## Angular Reference (`reference-angular/`) — Migration Guide

The original Angular frontend lives in `reference-angular/`. Use this as the source of truth when migrating pages to React.

### Menu Structure (sidebar categories)

1. **Home** → `/overview`
2. **Insights** (6) — Latest Insights, Newsletters, Commentaries, RIA Blogs, Videos, Trade Alerts
3. **Markets** (5) — Major Markets, Asset Classes, Holdings Map, Sentiment, Leaders & Laggers
4. **Portfolios** (4) — Portfolios, Watchlists, Alerts, Super Investor
5. **DIY Research** (7) — Performance Analysis, Factor Analysis, Risk Range, Credit Spreads, Screener, Stock Summary, Strategy Builder
6. **Charts** → `/tvcharts`
7. **Admin** (4) — Dashboard, Users, Settings, Data View
8. **Simple AI** (2) — Agents Dashboard, Agents Symbol
