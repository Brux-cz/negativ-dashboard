# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server
npm run build     # production build (outputs to dist/)
npm run preview   # preview production build locally
```

No test runner or linter is configured.

## Architecture

React 18 SPA built with Vite, styled with Tailwind CSS. The app is an internal dashboard for architectural visualization workflows — downloading satellite imagery, generating 3D terrain meshes, and managing rendering tools.

### Key Structure

- **`src/App.jsx`** — Main shell. Manages modal visibility state and renders the tool card grid with category filtering.
- **`src/components/`** — Modal-driven UI. Each tool opens a dedicated modal component. Barrel-exported via `index.js`.
- **`src/utils/`** — Pure utility functions. Barrel-exported via `index.js`. Split into tile math (`tileUtils`), geography (`geoUtils`), file generation (`fileUtils`), and app constants (`constants`).

### Major Components

- **OrthoMapModal** (~1700 lines) — The most complex component. Leaflet-based map for downloading satellite tile imagery (Google/Esri) stitched via Canvas API. Includes geocoding (Nominatim), keyboard shortcuts (+/- zoom, Enter download, Esc close), localStorage persistence, and a hidden Easter Egg game system (triggered by "hodkovice" search or Shift+open).
- **TerrainModal** — Downloads SRTM elevation data from AWS, generates OBJ meshes with Z-up orientation (Rhino/3ds Max compatible), optional orthographic texture overlay.
- **MapComponents** — Shared Leaflet utilities (center icon, click handler, dark overlay, dimension labels, view controller) used by both map modals.

### Data & State

- No backend or database. All tile/terrain downloads come from public APIs (Google Maps tiles, Esri/ArcGIS, AWS terrain tiles, Nominatim geocoding).
- State is local React hooks (useState/useEffect/useCallback/useMemo). No global state management.
- User preferences persisted to localStorage with keys defined in `utils/constants.js`.
- Static data (tool definitions, projects, users, atmosphere archetypes, map sources) lives in `utils/constants.js`.

## Deployment

GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`). Triggers on push to `main`. The Vite `base` is set to `/negativ-dashboard/` in `vite.config.js`.

The build accepts `VITE_EASTER_EGG_ENABLED` env var (set via GitHub repository variables) to toggle the Easter Egg feature.

## Language

The UI and README are in Czech.
