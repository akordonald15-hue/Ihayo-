> Historical design-stage report. The current live integration and release status supersede pending-backend or no-push statements below; see API_INTEGRATION_REPORT.md and DEPLOYMENT_READINESS.md.

# IHAYO frontend implementation report

Built 14 November 2026. Backend status: under development by the user's teammate; no base URL is available yet. The frontend integrates the supplied API contract, but **live API and CORS integration are not yet verified**. The private preview allows explicit, persistently labelled development fixtures. It does not imply real agricultural analysis.

## Current visual build

The complete interface uses the cinematic IHAYO identity with the final custom contour/seed logo and refined navigation: responsive sunrise farmer photography, deep navy, warm ivory and gold, self-hosted DM Sans/DM Serif Display, a photographic season timeline, refined selection controls, a farm review, an evidence journal and accessible source sheets. All API transport, request validation, response contracts and development advice fixtures remain unchanged. Agricultural images are generated fictional illustrations, visibly credited; no documentary or trial claim is made.

The redesigned build is available locally at http://127.0.0.1:3001/. The hosted preview was not republished because the current request is for local hosting. See REDESIGN_REPORT.md for visual audit details, screenshot filenames and the pitch-to-interface mapping.

## Implemented

| Area              | Behaviour                                                                                                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome           | Service health, server welcome, retry, dynamic coverage counts, explicit demonstration entry                                                                                                             |
| Place             | Searchable state and LGA lists, debounced area search, optional browser location with confirmation, readiness labels                                                                                     |
| Missing area data | Nearest-area request, explicit accept/reject, persistent provenance, stale-response protection                                                                                                           |
| Early profile     | Background soil/rain profile, failures skipped without blocking the farmer                                                                                                                               |
| Seasons           | One to four, up to four crops together, explicit exclusive fallow, 40-character custom crops, duplicate prevention, oldest-to-newest visual strip, newest-first request                                  |
| Priorities        | One to three ordered choices; removal and reselection update numbering and request order                                                                                                                 |
| Field             | Required irrigation and tenure, explicit true/false/null for the remaining questions, no defaults                                                                                                        |
| Review            | Every answer, data source and priority order; section-specific change actions preserve answers                                                                                                           |
| Advice            | 90-second timeout, indeterminate progress, duplicate-submit prevention, full retained request                                                                                                            |
| Results           | Required section order, equally styled choices without ranking, complete plans, notices, risks, conditions, priorities, confidence, reviewer request and unknowns                                        |
| Evidence          | Accessible Radix sheet, plain card, claims, reference, quote/locator where supplied, source links and licence terms, risks, gaps and reviewer details                                                    |
| What-if           | Rain/delay/temperature sliders, release or keyboard-commit plus 400ms debounce, reset, before/after scores, recorded/adjusted season lengths, always visible not-a-forecast wording, no-weather handling |
| Charts            | Rain/ET0/deficit, monthly mean/max temperature, growing-season days by year, units, source-data exclusion notices and readable tables; null/empty handling                                               |
| Map               | Polygon and MultiPolygon GeoJSON, ready hatching/labels, keyboard/click area selection, farmer and source-area distinction, simplified-boundary disclaimer                                               |
| Save/print        | Actual blob download actions for text/report, server filename when exposed, complete print advice with warnings and uncertainty                                                                          |
| Recovery/privacy  | Safe session storage, reload recovery, 410 refresh and retry from the full request, no accounts or farm-answer analytics                                                                                 |

## Verification completed

- `npm test`: **37 passing tests in six files**. Model, transport, full farmer journey, season edge cases and structural accessibility.
- `npm run typecheck`: passed.
- `npm run build:demo`: passed; Next.js 16.4.6 static export. The complete `out/` directory is about 1.54 MB uncompressed, including HTML and framework assets. This is disk size, not a measured network-transfer performance claim.
- API tests preserve all documented server error messages, test network failure, allow a simulated 65-second advice response, retry an expired operation once, preserve filename/blob downloads, and ensure profile query parameters never include farm answers.
- Full interaction test covers unavailable service, explicit fixture opt-in, rejected and accepted fallback, mixed crops, priority order, no default “Not sure”, Striga/waterlogging/labour notices, fewer than three choices, evidence Escape handling and focus return.
- Season tests cover explicit fallow, removing the final crop, duplicate custom names, custom crops, one/four seasons and crop limits.
- What-if test verifies no per-drag request, committed debounce, correct payload and no-weather hiding. Chart test covers null/empty arrays and excluded years.
- axe-core structural results check passes. Colour contrast and region checks were excluded from this jsdom test; this is not a blanket WCAG certification.
- Manual in-app-browser checks at **360 × 800**, **768 × 1024**, and **1440 × 1000**. Checked welcome, location/fallback, four-season entry, priorities, six field answers, review, results, evidence, chart table and controls. No page-level horizontal overflow at the checked mobile and tablet views. Saved results survived reload.
- Mobile evidence sheet Escape returned focus to its opening button. Browser console had no errors or warnings after fixture results loaded.
- Actual browser text and Markdown demonstration downloads succeeded. Keyboard rain adjustment updated the control from 100% to 95%.
- Screenshots are delivered alongside the source package. The print stylesheet retains date/place/provenance, intro and fertiliser warning, all choice warnings/confidence, and the expanded unknown section. A physical printer and mobile Android hardware were not available for verification.

## Deliberate implementation choices

- The map uses small native SVG GeoJSON rendering, without a third-party tile library, external map tiles or a boundary-drawing tool. This reduces network requests and preserves a clearly administrative level of detail. Full geographic accuracy still requires the backend's actual polygons; demo boundaries are synthetic.
- Native SVG charts avoid a large charting dependency. Data tables offer the same numbers when charts are too compact or unsuitable for assistive technology.
- TanStack Query caches server state. The short state machine uses typed React state and explicit validation rather than an additional form library. Tailwind is installed and available; semantic CSS tokens and component classes hold the custom design system.
- Advice and questions are never translated, ranked, paraphrased or inferred by the frontend. Only UI labels are owned here. No language selector, voice, chatbot, permanent share links or forecast promises were added.
- The optional demonstration's single rotation card echoes history to exercise the interface. It is not a suggested future rotation. Sample scenario comparisons are fixed and explicitly labelled as uncalculated fixtures.

## Live integration checklist for the backend developer

1. Supply the HTTPS base URL ending in `/api/v1`; set `NEXT_PUBLIC_API_BASE_URL`, set `NEXT_PUBLIC_ENABLE_FIXTURES=false`, rebuild and redeploy.
2. Allow the exact frontend origin through `NASA_API_ORIGINS`. Verify preflight POST requests, JSON error responses and downloads. Expose `Content-Disposition` through CORS if server download names must be preserved across origins; a safe frontend filename remains available otherwise.
3. Exercise health/questions/states/areas/search/locate/profile/map using prepared areas and an unprepared area. Confirm the real state and LGA lists, coordinates, readiness and nearest distance.
4. Check real advice for one and four seasons, multi-crops, fallow, a custom crop, ordered priorities, nulls, Striga, waterlogging, worker shortages, and fewer than three choices. Confirm every returned server sentence remains visible unchanged.
5. Validate full evidence rows and source links from the real catalogue, including null quote/locator values and multiple source IDs.
6. Check real scenario calculations and all slider boundary values; test missing weather, missing charts, null numbers and excluded source years.
7. Restart the backend or evict advice to verify 410 recovery on charts, scenarios and each download. No answer re-entry should be required.
8. Inspect print preview with real long multi-choice advice, including page breaks, confidence, provenance and unknowns. Test real report generation delay and filename headers.
9. Run on a physical low-end Android phone, with a slow/mobile network and a screen reader. Emulated viewport and jsdom checks do not establish those hardware outcomes.

These checks require the live backend. They have not been silently replaced with fixture results.

## Final brand refinement

The current review build includes the custom identity, mobile menu, compact service-status component, browser/app icon suite and clearer frontend-owned labels. Lint and TypeScript pass, all 37 tests pass, and both production and demonstration builds succeed. The production build was browser-checked with fixtures disabled before the local demo build was restored. No GitHub push or deployment was performed. See FINAL_POLISH_REPORT.md and DEPLOYMENT_READINESS.md for the current review scope.
