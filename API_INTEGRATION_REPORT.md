# IHAYO live API integration

Verified 14 November 2026 with synthetic farm answers. API: https://nasa-api-miva-pulsars.duckdns.org/api/v1. No fixture advice was used for these checks.

## Availability and contract

Health, Swagger `/docs`, and `/openapi.json` returned HTTP 200. OpenAPI 3.1 paths and request fields agree with the supplied API_REFERENCE.md. Error envelopes also include a required `request_id`; it is retained in ApiError.details. The OpenAPI success schemas are largely generic, so actual responses were checked and rendered through the frontend rather than inferred from Swagger alone. Metadata includes Yam and longer question/priority wording than the earlier demonstration records. Server wording is displayed unchanged.

Health reports 569 of 774 areas ready, fetching false, English only. Incomplete geographic coverage remains a backend limitation, not a claim of nationwide prepared data. Brass, Bayelsa has no prepared records; nearest-ready returned Nembe, 23 km away. Browser testing confirmed explicit acceptance and the resulting source-area notice. No tested endpoint was unavailable or incompatible.

## Executed live requests

These timings are one smoke run, not a performance guarantee. Advice IDs below are temporary synthetic test sessions.

| Endpoint | HTTP | Duration |
| --- | --- | --- |
| `/health` | 200 | 917 ms |
| `/meta/questions?language=en` | 200 | 519 ms |
| `/places/states` | 200 | 212 ms |
| `/places/states/Kaduna/areas` | 200 | 195 ms |
| `/places/search?q=Kajuru` | 200 | 193 ms |
| `/places/locate?lat=10.52&lon=7.44` | 200 | 218 ms |
| `/places/profile?state=Kaduna&lga=Kajuru` | 200 | 225 ms |
| `/map/states/Kaduna` | 200 | 215 ms |
| `/advice` | 200 | 231 ms |
| `/advice/8ba72d5ff470d803` | 200 | 191 ms |
| `/advice/8ba72d5ff470d803/charts` | 200 | 247 ms |
| `/advice/8ba72d5ff470d803/scenario` | 200 | 379 ms |
| `/evidence/A` | 200 | 188 ms |
| `/evidence/B` | 200 | 191 ms |
| `/evidence/N2` | 200 | 200 ms |
| `/advice/8ba72d5ff470d803/text?download=true` | 200 | 190 ms |
| `/advice/8ba72d5ff470d803/agent-report?download=true` | 200 | 186 ms |
| `/places/search?q=x` | 422 | 179 ms |
| `/advice/ihayo-expired-smoke` | 410 | 195 ms |
| `/advice` | 422 | 195 ms |
| `/advice/8ba72d5ff470d803/scenario` | 422 | 201 ms |

Separately verified GET `/places/nearest-ready?state=Bayelsa&lga=Brass` (200), Swagger and OpenAPI (200), invalid priorities (422), and CORS preflight (200). Endpoint details and current data can change; rerun `npm run test:live` before a demonstration.

## Browser integration

A real browser completed Kajuru/Kaduna place search, crop history, ordered priorities, all six field questions, review, advice generation, full rotation results, evidence citations, charts and GeoJSON. A second mobile journey completed Brass/Bayelsa with Nembe source records. Real warnings, uncertainty, regional evidence gaps and provenance remained visible. The 95% rain scenario returned changed season lengths; both text and agent-report downloads completed with backend filenames. Browser health/metadata/place/advice/scenario/evidence/download calls establish working cross-origin requests from the local frontend.

CORS currently returns `Access-Control-Allow-Origin: *`, permits GET/POST/OPTIONS and exposes Content-Disposition and X-Request-ID. No credentials are sent. Verify again from the final Vercel URL; a localhost check cannot establish that future deployment.

Fixed a real browser incompatibility: the default fetch transport was called as a Client method. A wrapper now invokes the browser fetch with its correct receiver. Added a regression test. Scenario bars show one decimal day to avoid JavaScript integer rounding disagreeing with the backend's approximate whole-day prose.

## Verification and limits

Lint, TypeScript, 39 unit/component tests and the production export pass. Automated tests cover request serialization/invalid inputs, 65-second delayed advice, network failures, retry, single expiry regeneration, nullable chart data, debounced scenarios, fallback consent, keyboard navigation and structural axe checks. The live backend returned 410 for an expired ID and 422 for invalid requests; automatic recovery is tested with controlled transport, not a deliberately restarted live backend. No outage or arbitrary slow network was injected into the production service.

Homepage and actual results were checked at 360, 390, 768, 1024, 1440 and 1920 pixels: no document horizontal overflow or clipped heading/paragraph/button text was detected. Desktop/tablet/mobile captures are in the local outputs/ihayo_live folder. These are browser viewport checks, not physical-device or screen-reader certification. Axe checks exclude color-contrast; visual readability was reviewed separately. Reduced-motion behaviour has a dedicated component test and CSS disables animations/transitions and reveals all content. No scientific warning is placed in a reveal wrapper.

The print button invokes window.print and print CSS preserves advice/warnings while hiding controls. The in-app browser timed out at the native print handoff, so print-preview pagination and physical printing remain unverified. Both downloaded files were verified independently.

No production Vercel deployment was created or tested. See DEPLOYMENT_READINESS.md for the exact release configuration.
