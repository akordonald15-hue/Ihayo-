# IHAYO / Contours and seed

## The mark

Three precisely nested field contours share a 15-unit rhythm and a 7-unit stroke-equivalent width. Their open paths suggest cultivated plots and connection; an offset seed completes the lower corner. The design contains no stock leaf, brain, satellite or icon-library symbol. It was drawn as original vector geometry for this project.

The IHAYO wordmark uses outlined DM Sans at weight 600 with measured letter spacing and optical adjustments between H/A, A/Y and Y/O. The mark and wordmark share a clean geometric character. The website keeps “Growing together.” as readable live text below the outlined wordmark.

## Assets

| File in `public/brand/`                | Use                                         |
| -------------------------------------- | ------------------------------------------- |
| `ihayo-horizontal-light.svg`           | Primary horizontal lockup on ivory/white    |
| `ihayo-horizontal-dark.svg`            | Reversed lockup on navy                     |
| `ihayo-horizontal-mono.svg`            | Single-colour navy lockup                   |
| `ihayo-horizontal-mono-white.svg`      | Single-colour white lockup                  |
| `ihayo-symbol-light.svg`               | Standalone forest/gold mark                 |
| `ihayo-symbol-dark.svg`                | Standalone ivory/gold mark                  |
| `ihayo-symbol-mono.svg`                | Single-colour navy mark                     |
| `ihayo-symbol-mono-white.svg`          | Single-colour white mark                    |
| `ihayo-wordmark.svg`                   | Outlined wordmark without symbol or tagline |
| `ihayo-app-icon.svg`                   | Navy app tile with the symbol               |
| `brand-review.svg`, `brand-review.png` | Variant and small-size review board         |

SVG wordmarks contain paths, so another machine does not need the font installed. The source font's SIL Open Font License is included in `public/licenses/DM-Sans-OFL.txt`.

Raster/browser assets are in `public/`: 16px and 32px PNG favicons, a 180px Apple touch icon, 192px and 512px app icons, and a separate 512px maskable icon. `src/app/favicon.ico` contains 16, 32 and 48px representations. `src/app/icon.svg` supplies the vector browser icon. The web manifest declares the app icons; it does not add offline advice or a service worker.

## Colour and use

- Forest `#245A43` on ivory `#F7F4EC` for light surfaces.
- Ivory on navy `#071D2D` for dark surfaces.
- Gold `#D5A34D` for the seed on dark backgrounds; a darker gold `#A87728` is used on light backgrounds.
- Use the supplied monochrome variants for single-colour reproduction.

Keep at least one internal contour gap (8 units in a 64-unit symbol) clear around the whole identity. Do not alter the internal spacing, stretch, rotate, add gradients, add shadows or place the mark inside a generic leaf badge. Use the standalone symbol at small sizes; the 16/24/32px review is included on the board. For small website headers, use the live lockup component so the tagline stays at 16px.

## Source and regeneration

`src/lib/brand.ts` is the shared geometry used by the live header, footer and waiting screen. `scripts/generate-brand.py` regenerates outlined SVG assets and that geometry from the installed DM Sans file (optional Python dependency: `fonttools[woff]`). `scripts/generate-brand-icons.mjs` renders the icon sizes and review board using Sharp, available with the installed Next.js dependencies. The ICO was exported from the 512px icon with Pillow.

The generated assets are included, so these optional asset-generation tools are not required to run or build the frontend.
