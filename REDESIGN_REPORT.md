> Historical design-stage report. The current live integration and release status supersede pending-backend or no-push statements below; see API_INTEGRATION_REPORT.md and DEPLOYMENT_READINESS.md.

# IHAYO / Premium visual redesign

Delivered 14 November 2026. Local preview: http://127.0.0.1:3001/.

## What changed

- Full-width cinematic sunrise hero with the exact requested headline and supporting copy. The deck's fictional farmer remains visible. A portrait crop, mobile-specific gradient and reordered action placement adapt the composition at 360px.
- Deep navy, forest, ivory and muted gold throughout the welcome, journey sidebar, questions, review, loading, results, maps, charts and evidence sheet.
- Self-hosted DM Sans and DM Serif Display, strong editorial hierarchy, fine rules and restrained corners. No external font service is required.
- The flat farmland illustration was removed from the application and its component deleted. Maize/cowpea photographic illustrations and fine botanical silhouettes support crop recognition; names remain visible. The season strip now uses compact photographic slots rather than a large empty tile.
- Ordered priority rows, large field choices and a ruled farm-profile review share the same system. The first field question carries the general instruction; subsequent questions lead directly with their server heading and equal choices.
- A navy photographic results masthead, distinct land/rain surfaces and refined rotation timelines. A single returned choice uses a plan/evidence reading layout on desktop; multiple choices retain equal styling and weight. Notices, local risks, confidence, review requests and unknowns remain visible.
- Source sheets retain their accessible dialog, Escape behaviour and focus restoration. Charts retain tables, maps retain labels/hatching and selected/source-area distinctions, and print retains the complete advice without photographic backgrounds.

## Pitch-to-interface mapping

| Deck reference | Translation into the real frontend                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Page 1         | Same fictional farmer and sunrise setting, wide photographic hero, left-aligned headline and calm dark gradient |
| Page 3         | Soil photograph paired with editorial context and explanatory reading space                                     |
| Page 4         | Deep navy structural surfaces, restrained gold and confident hierarchy                                          |
| Page 5         | Warm ivory product surfaces, refined typography, visible evidence and local review                              |
| Page 7         | Clear field context, numbered priorities and equal comparison treatment                                         |
| Page 11        | Atmospheric soil-image treatment in the field-question strip and results masthead                               |
| Page 12        | Same landscape/character narrative in the closing section                                                       |

All fourteen deck pages, the rejected frontend screenshot and both supplied API/flow references were inspected. No backend, endpoint, payload or advice sentence was redesigned.

## Deliberate visual audit

The first pass was reviewed in the browser, then refined. Mobile now gives the farmer an unobstructed upper portrait, provides an additional dark backing for the eyebrow, places the primary action before the longer description, and avoids repeating a tracked instruction above every field question. Crop-history slots were made compact and photographic. The one-choice result received a two-column reading layout rather than a full-width paragraph stack. Custom crop text wraps and remove controls have 44px targets.

Final browser checks covered 360 × 800, 768 × 1024 and 1440 × 1000. The tested views had no page-level horizontal overflow. The complete fixture journey was exercised: prepared location, mixed crops, ordered priorities, false/true/null field answers, tenure, review, waiting and results. Existing automated coverage also exercises accepted/rejected fallback, custom crops, fallow, one/four seasons, warnings, missing data and advice expiry. Keyboard rain adjustment updated the control to 95%; the chart data table remained readable. The evidence sheet closed with Escape and returned focus to its opening button. Results survived reload.

## Validation

- 33 automated tests pass across five files, including structural axe checks for both the cinematic welcome and results.
- TypeScript passes.
- The optimized Next.js static build succeeds.
- src/lib/api.ts, src/lib/model.ts, src/lib/types.ts and src/lib/fixtures.ts are unchanged by this redesign.
- Responsive WebP agricultural assets: approximately 26–141KB each. The mobile hero is approximately 96KB. Secondary images are lazy-loaded; hero images use responsive sources and high fetch priority.
- Font licence copies and image credits ship with the frontend. Illustrative imagery is visibly credited, including a footer link on product screens.

Structural axe checks do not certify every aspect of accessibility; colour-contrast/region rules were excluded from jsdom. Text/image contrast, reading order, control size, viewport bounds and keyboard focus were reviewed manually. A physical Android phone, physical printer and real backend were not available. Live base URL, CORS, real advice/evidence, real chart data and calculated scenarios still require the backend handoff checks in IMPLEMENTATION_REPORT.md. Demonstration scenarios remain explicitly labelled fixed fixtures rather than forecasts.

## Screenshots delivered

The accompanying screenshots show the desktop hero, mobile hero, crop history, priorities, farm review, results, rotation/evidence composition, mobile evidence and tablet chart table. Intermediate pass screenshots are marked as such. These are actual browser captures of the frontend, not design mockups.

## Run and connect

The current local server serves the rebuilt out/ directory at http://127.0.0.1:3001/. Refresh an existing browser tab to load the redesign. Choose Explore demonstration while the backend is pending. The prior hosted preview remains the earlier version; this delivery follows the local-hosting request.

When the backend developer supplies the HTTPS URL, set NEXT_PUBLIC_API_BASE_URL (including /api/v1), disable NEXT_PUBLIC_ENABLE_FIXTURES, rebuild, and complete the live checklist. No mock data silently substitutes for failed live API calls.
