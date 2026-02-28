# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SimpleVisor Pro** — a financial analysis platform with a React frontend and Python Flask backend.

## Commands

### Frontend (`frontend-react/`)

```bash
npm run dev       # Dev server on port 4200
npm run build     # TypeScript check + Vite build
npm run preview   # Preview production build
npm run lint      # ESLint
```

### Backend (`backend/`)

```bash
# Development
python index.py   # or: flask run (port 5000)

# Production
gunicorn index:app
```

No test suite is currently configured for either frontend or backend.

## Architecture

### Full Stack Overview

- **Frontend:** React 19 + TypeScript + Vite, served on port 4200 in dev
- **Backend:** Python Flask, served on port 5000 in dev
- **Dev proxy:** Vite proxies `/api/*` → `http://localhost:5000/*` (strips `/api` prefix)
- **Production:** Frontend build served statically; backend via gunicorn; nginx handles `/api` routing

### Frontend Structure (`frontend-react/src/`)

The app wraps everything in `ThemeProvider` → `AuthProvider` → `RouterProvider` (see [App.tsx](frontend-react/src/App.tsx)).

**Contexts:**
- `AuthContext` — JWT auth state, login/logout. Token stored in `localStorage` as `currentUser.auth_token`. A `"sv-auth-expired"` custom event triggers auto-logout on 401.
- `ThemeContext` — Dark/Dim/Light theme via `data-theme` attribute on `<html>`. All theme colors are CSS variables in [themes.css](frontend-react/src/styles/themes.css).

**Routing ([router.tsx](frontend-react/src/router.tsx)):**
- Public routes: `/`, `/login`, `/signup`
- Protected routes (wrapped in `ProtectedRoute`): `/overview`, `/majormarkets`, etc.
- Many routes are TODO stubs that render `DashboardPage` as placeholder.

**API calls ([services/api.ts](frontend-react/src/services/api.ts)):**
- Axios instance with base URL `/api`, 30s timeout
- Request interceptor auto-attaches `Authorization: Bearer <token>`
- Response interceptor fires `"sv-auth-expired"` on 401

**Path alias:** `@` maps to `./src/` in both TypeScript and Vite.

### Backend Structure (`backend/`)

`index.py` is the Flask entry point — it imports and registers ~25 Blueprint modules, each responsible for a domain (e.g., `api_portfolio`, `api_strategy`, `api_ai_agents`). Key modules:

- `login.py` / `login_api.py` — user auth and JWT issuance
- `dao/mongodb.py` — MongoDB data access layer
- `strategy/` — trading strategies and technical indicators
- `MyConfig.py` — environment config management (reads `.env.dev` / `.env.prod`)

**Data sources integrated:** yfinance, Polygon.io, RapidAPI, EOD Historical Data, Federal Reserve (FRED), TradingView

**ML stack:** TensorFlow/Keras, XGBoost, scikit-learn for market regime detection and analysis

### Key Conventions

- PrimeReact is the component library — use `primereact/*` imports for UI components, `primeflex` for layout utilities
- Highcharts (via `highcharts-react-official`) for all charts
- Theme colors must use CSS variables defined in `themes.css`, not hardcoded values
- Backend environment configs are split: `.env.dev` for dev, `.env.prod` for production
