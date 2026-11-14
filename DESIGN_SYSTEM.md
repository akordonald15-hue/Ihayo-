# IHAYO design system

## Direction

A field notebook: warm ivory paper, forest-green ink, a restrained seed-gold accent, open space and a custom planted-field illustration. Serif display headings give the welcome and results warmth; a system sans-serif keeps controls and advice legible without downloading fonts. IHAYO's task is helping a farmer examine choices with an extension agent.

## Tokens

| Token              | Value   | Use                                     |
| ------------------ | ------- | --------------------------------------- |
| Forest             | #245B45 | Actions, selected controls, links       |
| Deep green         | #163C30 | Display headings and strong emphasis    |
| Ivory              | #FAF8F2 | Page background                         |
| Sage               | #E6EFE7 | Selection and supportive panels         |
| Earth gold         | #D9AA59 | Decorative accent only                  |
| Ink                | #202923 | Main text                               |
| Muted              | #59665E | Secondary text, darkened for legibility |
| White              | #FFFFFF | Input and result surfaces               |
| Warning background | #F8EFD9 | Visible cautions and uncertainty        |

Gold is not used for small body text. Ready/not-ready areas have labels and hatching. Fit scores have numbers, not just coloured bars. Active choices have borders, checkmarks or numbered seeds as well as colour.

## Typography and spacing

Body: 16px minimum, 1.65 line height. Supporting introductory copy: 18–19px. Form heading: 32–44px. Editorial headings: Georgia, 39–74px depending on width. No downloaded font dependency. Core spacing: 8, 12, 16, 20, 24, 32, 48, 64px. Surfaces: 8–14px radius; fine borders rather than heavy shadows. Body paragraphs keep a readable measure.

## Components and interaction

Primary buttons use white on forest, secondary buttons use forest text and an outlined surface. Controls use at least 44px vertical targets; primary actions are at least 52px. Crop cards show an icon next to their server label. Season slots visually run oldest to newest, while the request remains newest first. Fallow is an explicit exclusive selection. Removing the final crop restores an unanswered slot.

Priority cards display numbered seeds in tap order. Field answers have no preselection and advance one question per selection. Review supports editing without clearing other answers. Result cards share the same borders, type and prominence. Warnings, uncertainty, confidence and reviewer requests remain visible.

Evidence uses a Radix dialog with a labelled heading, description, focus trap, Escape support and explicit focus restoration. All citation URLs allow only HTTP(S). Charts expose data tables. GeoJSON uses an SVG rather than a tile library to avoid network weight and tile failures; it shows only simplified administrative boundaries.

## Responsive layout

Desktop: two-column editorial welcome, a fixed-width journey sidebar beside the questions, and equal rotation columns when space allows. Tablet: smaller form sidebar, compact crop grid, stacked result choices. Mobile: one column, segmented progress, large cards, horizontally scrollable season slots, full-width evidence sheet and stacked downloads. Tested breakpoints include 360px, 768px and 1440px. No page-level horizontal scrolling is intended; tables and season strips scroll within their containers.

## Accessibility and motion

Semantic buttons, labels, visible 3px keyboard focus rings, skip link, focus on each new screen heading, polite loading announcements, errors as alerts, no fake percentages. Indeterminate loading and sheet entrance motion stop under reduced-motion preferences. Print hides navigation and interactive charts/sliders, retains the complete ordered advice, warnings, date, place, provenance and uncertainty. No hidden accordion contains a required main-result warning.
