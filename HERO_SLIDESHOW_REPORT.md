# IHAYO four-scene photographic hero

Only the landing hero background and its controls/assets were changed. Headline, description, calls to action, logo, navigation, tagline, remaining landing sections, farmer journey, API client, location flow, advice, evidence, scenarios and downloads are preserved. The image-credit sentence now covers imagery made for IHAYO rather than attributing every image to the earlier pitch deck.

## Behaviour

Farmer → land from above → soil → shared decision. A six-second display timer begins after the first selected responsive image loads. Images crossfade with a 1.35-second opacity transition; no content remount, sliding banner, zoom or large carousel dependency is used. The next responsive picture is mounted 750ms after the current image is ready. Subsequent images use low fetch priority. If a selected photograph is still loading, the current image remains visible. All four full-resolution files are not requested at startup.

Five understated 44px controls provide four direct scene choices and pause/resume. Manual selection restarts timing. Pausing or hiding the document preserves the remaining display time and pauses CSS progress. Even an image requested manually before hiding waits until the tab is visible. Reduced-motion mode disables autoplay and speculative loading, removes crossfades and permits direct scene selection. Timers and media/visibility listeners are cleaned up on unmount. Background images are decorative, with no repeated screen-reader announcements; scene buttons have descriptive labels and visible keyboard focus.

## Images and provenance

Original fictional photographic illustrations were generated with OpenAI's built-in image-generation tool. No documentary or field-research claim is made. They use consistent diffuse morning light and Nigerian agricultural motifs; no scientific overlays, invented phone screens or third-party photos were added. The first source search did not supply a suitable matching four-scene set.

All final prompts and image provenance are in `public/images/hero/PROVENANCE.md`. Original PNGs are retained locally in `outputs/ihayo_hero/originals`; twelve optimized responsive WebP assets are committed in `public/images/hero`. Landscape sources are natively 1672 × 941 (the tool returned less than the preferred 1920+ source width); no artificial upscaling is claimed. Desktop variants are 1672 and 960px wide. Mobile assets are 706 × 941. Soil and shared-decision have dedicated portrait variants that place hands, seedlings, faces and the phone above the unchanged text area.

First image: approximately 139KB desktop / 91KB mobile. Soil/shared-decision mobile variants: approximately 50KB/59KB. The detailed aerial scene is larger, approximately 338KB desktop / 216KB mobile, and is requested after the first image is ready. Actual transfers depend on viewport, pixel density, caching and user selection. No field Core Web Vitals score is asserted.

## Verification

- Production build, lint and TypeScript pass.
- 51 automated tests pass across eight files, including eight slideshow regressions: initial loading, delayed readiness, sequential preloading, four-scene loop, manual timing reset, pause/resume, document visibility, reduced motion, runtime preference changes and cleanup.
- Desktop and mobile scene captures are saved locally in `outputs/ihayo_hero/review`.
- Tablet uses the complete wide photographic frame with a soft lower fade, keeping faces to the right of the unchanged text instead of magnifying them behind it. Mobile controls sit above the credit baseline.
- Inspected 360, 390, 768, 1440 and 1920px layouts. No horizontal overflow or clipped hero copy/buttons was detected. Every slideshow control is 44 × 44px. Portrait assets were visually refined after review found clipped faces and low soil details in the initial crops.
- Browser measurements confirmed identical headline page coordinates and dimensions across scenes, with a computed 1.35s fade. These checks demonstrate layout stability; they are not a field CLS or screen-reader certification.
- Reduced-motion and hidden-document cases use controlled media/visibility events in the automated tests; no user OS preference was changed. Real browser interaction checks and public deployment results are reported with the final commit.

The live public slideshow must be checked after Vercel finishes deploying the pushed commit. Build success alone is not treated as public-site verification.
