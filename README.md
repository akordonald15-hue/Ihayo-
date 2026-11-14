# IHAYO · Growing together

A mobile-first Next.js App Router frontend for the crop-rotation API described in the supplied API_REFERENCE.md and FRONTEND_FLOW.md. IHAYO is a coined brand name joining I (Igbo), HA (Hausa), and YO (Yoruba); “Growing together” is its assigned brand meaning, not a dictionary translation.

## Run locally

Requires Node.js 20.9+ and npm. Tested here with Node 24.19.0.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. Edit `.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://YOUR-BACKEND-HOST/api/v1
NEXT_PUBLIC_ENABLE_FIXTURES=false
```

Include `/api/v1` exactly once. The default is same-origin `/api/v1`. The backend must permit the frontend's origin through `NASA_API_ORIGINS`. Use HTTPS for the deployed backend; an HTTPS frontend cannot call an HTTP backend. Public environment variables are compiled into the browser bundle: restart development or rebuild and redeploy after changing them. No secret belongs in these variables.

## Explicit demonstration mode

The backend developer has not provided a base URL yet. To inspect the complete interface now, set `NEXT_PUBLIC_ENABLE_FIXTURES=true`, start development, then click **Explore demonstration** when the unavailable-service screen appears. This is an explicit choice; network failures never silently switch to fixtures. A persistent banner and sample wording identify the mode, including print and downloads. Demonstration records, scores, chart values, area outlines and evidence are illustrative, not farming advice. Scenario sample outputs are fixed and clearly say no weather calculation was run.

```powershell
npm run build:demo
python -m http.server 3000 --bind 127.0.0.1 --directory out
```

Normal `npm run build` respects your environment. Do not ship fixture mode enabled as real farm advice. The private preview intentionally permits fixture exploration while the backend is under development.

## Checks and production build

```powershell
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

When the base URL arrives, set it, disable fixtures, rebuild, and run the checklist in `IMPLEMENTATION_REPORT.md` against the live service. Advice and profile calls allow 90 seconds. Answers remain in session storage for reload recovery; blocked storage degrades to in-memory state. Temporary advice IDs are never marketed as permanent links. A 410 on charts, scenarios or downloads reposts the complete saved request and retries the operation once. No farm-answer analytics, accounts, exact farm boundary storage, weather forecasts or translations are included.

## Design

See `DESIGN_SYSTEM.md` for tokens, typography, accessibility and motion. The field illustration is a small original SVG; no remote photos, font calls or map tile requests are required. See `IMPLEMENTATION_REPORT.md` for verification scope and remaining live checks.

Implementation references: [Next static exports](https://nextjs.org/docs/app/guides/static-exports), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react), and the two supplied project contracts in `reference/`.
