# IHAYO Vercel deployment

The existing Next.js application is ready to import from https://github.com/akordonald15-hue/Ihayo-. This report describes hosting preparation; no production URL has been created or verified.

1. Import that repository into Vercel and select the `main` branch.
2. Root directory: repository root (`./`), containing package.json. Framework: Next.js. Node: 24.x (validated locally with 24.19.0).
3. Install command: `npm ci`. Build command: `npm run build`. Output: `out`. The checked-in vercel.json supplies these settings. The existing Next configuration uses output: export and unoptimized local images; no image-optimization server or frontend API routes are required.
4. Add the variables below for Production and Preview before building.
5. Deploy, then test the real HTTPS URL: health, complete farmer journey, scenario, evidence, map, downloads, mobile menu and print preview. Check browser CORS from that exact origin. Do not call a deployment verified until these checks succeed.

| Variable | Value |
| --- | --- |
| NEXT_PUBLIC_API_BASE_URL | https://nasa-api-miva-pulsars.duckdns.org/api/v1 |
| NEXT_PUBLIC_ENABLE_FIXTURES | false |

These values are public and compiled into the JavaScript bundle at build time. Rebuild after changing them. No frontend secret or backend key is needed. Real local environment files are ignored; safe examples are committed. The production bundle uses HTTPS and does not depend on a local API address. Fonts and photographic illustrations are self-hosted. CORS currently permits all origins and exposes download filenames; the backend owner may restrict it to approved preview/production origins while retaining GET/POST/OPTIONS, Content-Type, Content-Disposition and X-Request-ID support.

Run locally before release: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:live`. Live smoke tests send explicitly synthetic answers. Normal builds keep fixtures disabled. The local static production preview is http://127.0.0.1:3001/.

Backend limitation: only 569/774 areas were ready at the verification time. Missing-area consent and provenance are implemented; do not advertise complete nationwide prepared coverage. Print-preview pagination, physical-device checks and final public-origin verification remain release checks.

The legacy .openai/hosting.json is preserved for project history and is not used by Vercel. Only out is published.

Sources: [Vercel build settings](https://vercel.com/docs/builds/configure-a-build), [Next static exports](https://nextjs.org/docs/app/guides/static-exports), [Next build-time public variables](https://nextjs.org/docs/app/guides/environment-variables).
