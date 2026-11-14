# IHAYO / Cinematic field journal

## Visual source and composition

The IHAYO pitch deck is the visual reference. Pages 1 and 12 establish the fictional farmer and golden-hour maize landscape; pages 3 and 11 connect soil, hands and research; pages 4 and 7 use deep navy and warm gold with strong information hierarchy; page 5 sets an ivory product surface. All fourteen rendered PDF pages were inspected alongside the rejected frontend screenshot and both functional specifications.

The redesign uses a full-width sunrise hero, confident DM Sans headline and an italic DM Serif Display final line. The farmer remains visible to the right on desktop. Mobile has its own portrait crop and places the farmer above the headline, with a dark lower gradient and the main action before the longer description. The status ribbon sits below the photographic hero. The editorial process section uses fine rules and numbered columns rather than generic cards. A soil-and-evidence section and a closing farmer scene complete the narrative.

## Tokens

| Token      | Value   | Role                                         |
| ---------- | ------- | -------------------------------------------- |
| Deep navy  | #071D2D | Hero, journey margin, results masthead       |
| Forest     | #245A43 | Product actions, selection and chart accents |
| Warm ivory | #F7F4EC | Reading surfaces                             |
| Muted gold | #D5A34D | Hero action, markers and restrained emphasis |
| Charcoal   | #1E2925 | Body text                                    |
| Muted text | #59635E | Secondary text on light surfaces             |
| White      | #FFFFFF | Photography overlays, contrasting surfaces   |

Gold action labels use dark ink. Scientific cautions use dark brown on pale sand. White/gold type over imagery uses dark gradients, with an additional navy backing for the mobile eyebrow.

## Type, shape and rhythm

Self-hosted DM Sans Variable for UI and body. Self-hosted DM Serif Display for the headline accent, narrative headings, rotation crops and key results headings. Font licences ship in public/licenses. Body and UI text remain at least 16px. Desktop hero type scales to 92px; mobile uses 50–55px. Forms use 32–43px headings. Long advice retains generous line height.

Core spacing: 8, 12, 16, 20, 24, 32, 48, 64px. Fine rules and mostly square 2–3px corners create an editorial identity. Buttons are at least 56px high; other touch controls retain 44px minimum targets. Shadows are restrained and functional on the evidence sheet.

## Product journey

The navy journey margin carries progress, a small soil image and the brand statement. Mobile uses a segmented progress line. Location controls are clear lists with readiness labels. Season history is a contiguous oldest-to-newest timeline; requests remain newest first. Maize and cowpea use photographic illustrations from the deck, with fine botanical vectors for other known crops. Crop names always remain visible. Fallow and custom crops keep their existing validation and exclusive-selection behaviour.

Priorities are full-width editorial rows with numbered seeds in selection order. Field questions pair a photographic strip with large choice rows. Review is a single carefully ruled farm summary. Loading uses navy, quiet gold line marks and an indeterminate bar, without fake progress.

Results use a navy photo masthead, a land/rain pairing, equal-weight rotation cards, refined year timelines, visible confidence and notices, and a distinct uncertainty panel. Weather, tables, maps and evidence sheets use the same ivory/forest/gold system. No server advice is shortened, rewritten, hidden, ranked or moved out of the required section order.

## Responsive and accessibility principles

Desktop, tablet and 360px mobile are separately inspected. No page-level horizontal scrolling is intended. Timelines and data tables can scroll inside their containers. Keyboard focus, skip link, semantic labels, error announcements, source links and evidence focus restoration are preserved. Ready map areas also have labels and hatching. Charts retain their tables. Reduced-motion preferences remove reveal/slide animations. Print removes navigation, interactive weather controls and photographic backgrounds while retaining complete advice, provenance, warnings, confidence and uncertainty.

## Image honesty and delivery

All agricultural scenes are fictional generated illustrations reused from the pitch, not documentary evidence. Credits are visible on the landing page and linked from every screen. Responsive WebP assets range from about 26KB to 141KB; the mobile hero is about 96KB. Images include dimensions; only the hero is high-priority, with secondary images lazy-loaded. There are no external runtime font, photo or map-tile requests.

## Final identity refinement

The original contour/seed symbol and optically spaced outlined IHAYO wordmark now replace the leaf mark. Header alignment, readable live tagline, footer signature, waiting screen, favicon and app icons share that geometry. Phone navigation uses an accessible Radix dialog with Escape and destination-focus handling. The compact service strip is separate from the unchanged server welcome. Decorative hero/brand separators have been removed; structured form and scientific-warning boundaries remain. See BRAND_GUIDE.md and FINAL_POLISH_REPORT.md.


## November 14 responsive finishing pass

`src/app/refinement.css` is the final finishing layer after premium.css and brand.css. Shared content width is 1280px; responsive gutters are 24px mobile, 32px tablet and fluid up to 60px desktop. Full-width hero imagery remains cinematic. Control radius 12px, card 16px, feature panel 24-28px. Headings use clamp, balanced natural wrapping and no homepage manual line breaks. Long backend questions expand without clipping.

Motion uses lightweight CSS and IntersectionObserver, with 180-200ms controls and 450ms editorial reveals. Only UI-owned homepage editorial content is observed; server welcome, advice, warnings and uncertainty remain outside reveal wrappers. Reduced-motion CSS reveals content immediately and disables animation, transitions and smooth scrolling. No new animation dependency was added.
