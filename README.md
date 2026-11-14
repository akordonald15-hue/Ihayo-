# IHAYO · Growing together

A mobile-first Next.js App Router frontend for the crop-rotation API described in the supplied API_REFERENCE.md and FRONTEND_FLOW.md. IHAYO is a coined brand name joining I (Igbo), HA (Hausa), and YO (Yoruba); “Growing together” is its assigned brand meaning, not a dictionary translation.

## Run locally

Use Node.js 24 and npm for the validated toolchain (tested with Node 24.19.0). The package engine range also permits Node 20.19+ and 22.13+ for ESLint compatibility.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. Edit `.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://nasa-api-miva-pulsars.duckdns.org/api/v1
NEXT_PUBLIC_ENABLE_FIXTURES=false
```

Include `/api/v1` exactly once. The default is same-origin `/api/v1`. The backend must permit the frontend's origin through `NASA_API_ORIGINS`. Use HTTPS for the deployed backend; an HTTPS frontend cannot call an HTTP backend. Public environment variables are compiled into the browser bundle: restart development or rebuild and redeploy after changing them. No secret belongs in these variables.

## Explicit demonstration mode

Live integration was verified on 14 November 2026. For optional offline interface review, set `NEXT_PUBLIC_ENABLE_FIXTURES=true`, start development, then click **Explore demonstration** when the unavailable-service screen appears. This is an explicit choice; network failures never silently switch to fixtures. A persistent banner and sample wording identify the mode, including print and downloads. Demonstration records, scores, chart values, area outlines and evidence are illustrative, not farming advice. Scenario sample outputs are fixed and clearly say no weather calculation was run.

```powershell
npm run build:demo
python -m http.server 3001 --bind 127.0.0.1 --directory out
```

Normal `npm run build` respects your environment. Do not ship fixture mode enabled as real farm advice. The current local production preview uses live advice with fixtures disabled.

## Checks and production build

```powershell
npm run lint
npm test
npm run typecheck
npm run build
```

Next exports to `out/`; deploy it on any static HTTPS host. There are no server-side frontend API routes to host. All documented API calls are browser-to-backend requests. The Sites manifest records the private preview's project identity; remove that identity before independently registering a separate Site.

`package-lock.json` pins installed dependencies. Rollup is overridden with its official WASM implementation because Windows Application Control blocked the native test-runner module in this environment. This avoids weakening the system policy.

## Source map

- `src/lib/types.ts`: supplied request and response contracts.
- `src/lib/api.ts`: configured API client, 90-second timeouts, verbatim error messages, downloads, expiry recovery.
- `src/lib/model.ts`: answer validation, newest-first serialization, safe session storage and citation links.
- `src/lib/copy.ts`: UI-owned English copy. Server questions and advice remain unchanged.
- `src/lib/fixtures.ts`: explicitly opted-in development data, dynamically imported.
- `src/components/Ihayo.tsx`: service state and complete farmer journey.
- `src/components/FarmForm.tsx`: place, season and review components.
- `src/components/Results.tsx`: results in the required order, full warnings, print and downloads.
- `src/components/Weather.tsx`: charts with data tables and committed, debounced what-if controls.
- `src/components/AreaMap.tsx`: lightweight GeoJSON SVG display with accessible area controls, readiness patterns and selected/fallback labels. No external tiles or exact farm boundaries.
- `src/components/EvidenceSheet.tsx`: Radix modal with focus management, source links and evidence gaps.

## Backend handoff

The supplied backend is configured in `.env.example`. See `API_INTEGRATION_REPORT.md` for live results and `DEPLOYMENT_READINESS.md` for Vercel setup. Run `node scripts/verify-live-api.mjs` for an explicit synthetic-farm live smoke test. Advice and profile calls allow 90 seconds. Answers remain in session storage for reload recovery; blocked storage degrades to in-memory state. Temporary advice IDs are never marketed as permanent links. A 410 on charts, scenarios or downloads reposts the complete saved request and retries the operation once. No farm-answer analytics, accounts, exact farm boundary storage, weather forecasts or translations are included.

## Design

See `DESIGN_SYSTEM.md` for tokens, typography, accessibility and motion. The cinematic redesign reuses the pitch deck’s fictional photographic illustrations as responsive WebP assets, with self-hosted DM Sans and DM Serif Display. No external font, photo or map-tile calls are required. See `/image-credits.txt` and `public/licenses/` for credits. See `IMPLEMENTATION_REPORT.md` for verification scope and remaining live checks.

Implementation references: [Next static exports](https://nextjs.org/docs/app/guides/static-exports), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react), and the two supplied project contracts in `reference/`.

## Local redesign preview

The redesigned build is served locally at http://127.0.0.1:3001/. This uses the existing local server, so a browser refresh loads the new static output. The prior hosted preview has not been republished: the current work follows the request to host locally. If you restart your computer, run `npm run build:demo` and `python -m http.server 3001 --bind 127.0.0.1 --directory out` from this directory.

## Refined brand and review status

The custom contour/seed mark replaces the original leaf logo throughout the header, footer, loading view and browser/app icons. Outlined SVG horizontal, symbol and monochrome variants live in `public/brand/`; use the brand review board and `BRAND_GUIDE.md` for proportions and usage. `src/lib/brand.ts` contains the same original vector geometry used by the live UI.

The navigation includes a keyboard-accessible mobile dialog. The compact service-status row stays separate from the unchanged server welcome. See `FINAL_POLISH_REPORT.md` and `DEPLOYMENT_READINESS.md` for completed checks and the remaining backend handoff. No GitHub push or deployment has been performed for this refinement.

The two included environment examples contain no secrets. `.env.example` uses the safe same-origin `/api/v1` default; `.env.production.example` shows a clearly marked HTTPS placeholder and disables fixtures. Real environment files are ignored. Production public values are embedded at build time, so rebuild after supplying the actual base URL.
