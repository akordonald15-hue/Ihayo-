# Frontend flow: crop rotation advice for Nigerian farmers

For the frontend developer. This describes what to build and in what order. The field-by-field API reference is a separate document (to follow). Base URL for all calls: `/api/v1`. Interactive description of every call: `/api/v1/docs`.

## 1. What this product is

A phone-first website. A farmer answers a few plain questions and gets a one-page answer with up to three choices of crop rotation, each with a year-by-year plan, the evidence behind it, what is not known, and who to ask. The advice is to talk over with an extension agent. It is never an order and never a forecast. The server writes every sentence the farmer reads. The frontend does not write advice text, translate it, rank it or shorten it.

The first audience is competition judges, who should be treated exactly like farmers: no jargon on screen, large touch targets, one question per screen.

## 2. Ground rules for the interface

1. Show the server's sentences as they come. Do not reword, merge or drop lines. Anything in a `notices`, `unknown` or `confidence` field must be visible on screen without a tap on the main result (a collapsed section is fine for evidence detail, not for these).
2. The three choices are shown side by side or stacked with equal weight. Do not highlight one as "best". The first card is the farmer's own rotation (`role: "existing"`) and is the comparison point.
3. Scores (0 to 100) are "how well a crop fits your land and weather", not a yield or profit. Always show them with the words the server gives (`crops.intro`).
4. No yield, price, cost or profit figures anywhere. The tool has none and must not appear to.
5. Phone first: 360 px wide, text at least 16 px, tap targets at least 44 px, works on slow mobile data (the advice call can take up to 10 seconds, see 6).
6. English only for now. Keep every screen string you write yourself in one translations file, so Hausa, Yoruba, Igbo and Pidgin can be added once native speakers have written them. Questions and advice already come from the server and carry a `language` field.
7. Use plain words for yourself too. Say "area" or "local government area (LGA)", never "region", "endpoint" or "model".

## 3. Screen map

```
Welcome
  -> 1 Place (state, then area)
       -> (area has no data) Nearest-area offer
  -> 2 Past seasons (how many, then crops per season)
  -> 3 What matters most (pick up to 3, ordered)
  -> 4 Your field (5 short questions)
  -> 5 Check your answers
  -> Working... (waiting screen)
  -> Results (the one page)
       -> Choice detail / Evidence (panel per choice)
       -> Weather what-if (slider panel)
       -> Map
       -> Save or print
  -> Start again
```

A progress bar runs across steps 1 to 5. Every step has Back. Keep all answers in one state object so Back never loses anything. Allow "Change" next to each line on the check screen, which jumps to that step (the command line version cannot do this; the website should).

## 4. Screens in detail

All question texts, labels and option lists come from `GET /meta/questions` (called once at start; cache it). Use the `text` of each step as the screen heading. The `field` name is the key to send later.

### Welcome
Title and welcome text (`welcome` from the questions call). One button: Start. A small line stating the tool supports, and does not replace, the extension agent. Call `GET /health` once on load; if it fails show a plain "The advice service is not available now, please try again later" screen.

### Step 1: Place
Field `state`, then `lga`.
- State: searchable list of 37 states, from `GET /places/states`. Each item has `areas` and `areas_ready`.
- Area: list from `GET /places/states/{state}/areas`. Each item has `lga`, `ready`, `lat`, `lon`. Show a quiet "(no data yet)" tag when `ready` is false but still allow it to be picked.
- Also offer a search box (`GET /places/search?q=`, at least 2 letters) that jumps straight to a state and area.
- Optional: show the map here too (see Map below) so a farmer can tap their area on the state outline.
- Optional: "Use my location". Read the phone's position (ask permission, never store it) and call `GET /places/locate?lat=..&lon=..`. It returns `state`, `lga`, `zone`, `ready`, and `nearest_ready` (only when the area has no data). Pre-fill both lists and ask the farmer to confirm. A 404 `no_area_here` means the point is outside any Nigerian area; fall back to the lists.
- If the chosen area is not ready: show the Nearest-area offer. Call `GET /places/nearest-ready?state=..&lga=..`. It gives `lga`, `state`, `km`. Text on screen: "We do not have weather and soil data for {area} yet. The nearest area we have data for is {nearest}, {km} km away. Use it?" Yes sets `use_data_from: {state, lga}` for the final call; No returns to the area list. Today only 62 of 774 areas have data, so judges will meet this screen often: make it friendly, not an error. If the nearest call returns `no_data_anywhere`, say so and stop.

### Place profile: show something early
As soon as the area is confirmed (and the nearest-area choice made), call `GET /places/profile?state=..&lga=..` (add `from_state` and `from_lga` when the farmer accepted another area's data). It returns `land` and `rain` (each `heading`, `lines`, `facts`), `elevation_m`, and `place` (with `data_from`). Show a short "What we already know about your land" card using those lines before asking the next question. The first call for an area takes about 5 seconds, later ones are instant; fetch it in the background while the farmer answers the season question, and show the card when it arrives. If it fails, skip it silently; it is a courtesy, not a required step. It returns the same errors as advice (`no_data` 409 with `nearest`).

### Step 2: Past seasons
Field `seasons`. This is the farmer's own recent history. Two parts:
1. "How many seasons can you remember?" 1, 2, 3 or 4 (limit from `limits.seasons`). Think of the main rainy-season planting of each year.
2. For each season, newest first (texts in `season_texts`): pick one or more crops from the menu (`crops`, each `id` and `label`), or Fallow, or Other.
   - Several crops in one season means they were grown together. Up to 4.
   - Fallow means nothing was grown. It cannot be combined with a crop.
   - Other opens a text box for a crop name typed by hand (max 40 characters). Typed crops are accepted, the server will say it has no tests for them.
   - The same crop twice in one season is refused by the server (422); prevent it in the UI.

Send `seasons` as a list of seasons, **newest first**, each a list of crop ids or typed names. Fallow is an empty list `[]`. Example: last season maize, the one before that cowpea, the one before that fallow:
`[["maize"], ["cowpea"], []]`

### Step 3: What matters most
Field `priorities`. Choose 1 to 3, in order of importance (first is most important). Options and wording come from the step's `options` (`key`, `label`). Show as tappable cards with numbers appearing in the order tapped; tapping a chosen card again removes it. Keys: nitrogen, pests, water, organic_matter, income, erosion, inputs.

### Step 4: Your field
Five short yes/no questions, one per screen or stacked. All have the options from the questions call.
| field | send | notes |
|---|---|---|
| `irrigated` | true / false | "Can you water crops in the dry season?" Only yes or no. |
| `striga` | true / false / null | null means not sure. Striga is a parasitic weed. Yes brings in a Striga-specific choice. |
| `waterlogged` | true / false / null | Water standing after heavy rain. |
| `enough_workers` | true / false / null | At planting and weeding. Note the direction: yes means workers are easy to find. |
| `easy_seed` | true / false / null | Good legume seed (cowpea, groundnut, soybean). Yes means easy. |
| `tenure` | "own" / "rent" / "borrowed" | Land ownership. A required choice with three options. |

"Not sure" must always be a real, equal option, never a hidden default. Do not pre-select anything.

### Step 5: Check your answers
Echo every answer in plain words (place, data-from area if any, each season newest first, priorities in order, each yes/no). A "Change" link beside each jumps back. Button: "Get my advice".

### Working screen
The advice call takes about 6 to 9 seconds the first time (a repeat of the same answers returns in about a tenth of a second). Show a calm waiting screen with an indeterminate progress bar and a sentence such as "We are reading 25 years of weather and the soil record for your area." Do not time out before 60 seconds. Do not let the farmer submit twice (disable the button).

### Results
One page, top to bottom, in this order (the order matches the printed advice):
1. Heading and place. `page.title`, `page.place` (area, state, zone). If `place.data_from_text` is not null show it prominently ("Data taken from ..."). Show `page.made` (date) and `page.weather_years` ([first, last] year of weather used).
2. Introduction. `page.intro` (two sentences, including the fertiliser warning). Always shown.
3. Your land. `page.land.heading` and `page.land.lines` (soil pH, texture and so on). `page.land.elevation_m` is the height above sea level in metres (a fact for the map or a small badge, there is no sentence for it, and it may be null).
4. Your rain. `page.rain.heading` and `page.rain.lines` (usual rain, season start, end, length, and the shorter-year length).
5. What you told us. `page.told.heading` and `lines`.
6. Your choices. `page.choices.heading`, then `page.choices.notices` (always visible, can be warnings such as "only 2 choices fit"), then one card per entry in `page.choices.items` (see below).
7. Crops that suit the land. `page.crops` (heading, intro, a list of crop with score and reasons, optional caution). A simple bar per crop is fine. Show `reasons` text under each score; if `all_fine` is true say "all checks fine".
8. What can help your land and water. `page.measures`.
9. What we do not know. `page.unknown` (heading, intro, items). Must not be collapsed by default.
10. Save and print. `page.print.lines` and the Save or print actions (see 8).

### Choice card (one per item of `page.choices.items`)
Show in this order:
- Badge: `role_label` ("Your own rotation" style text from the server) and `name`.
- `what` (what the choice is, in plain words).
- Year-by-year plan: list of `steps`. Each step has `text` (a ready sentence), plus `year`, `season`, `fallow`, `crop`, `also` (crops grown together), `months` (usual planting months). Draw as a timeline: Year 1, Year 2, ... with the crop name, or a fallow tile. If `two_seasons_note` is not null show it under the timeline. Steps with `season` of "early" or "late" are two plantings in one year.
- `fit`: small chips with crop and score for the crops in this plan.
- `help`: "May help" list. `watch`: "Watch out" list. Both always visible.
- `notices`: extra cautions (untested crops, drainage, seed, labour). Always visible, styled as caution.
- `issues`: known conflicts in the plan. Show if present.
- `priorities`: one line per priority the farmer chose (`label`, `text`). This is how each choice meets what matters to them; keep the farmer's order.
- `conditions`: things that must be true for the choice to make sense (e.g. season length). Show if present.
- Confidence: `confidence.text` ("how sure we are") and `confidence.where` (where it was tested). Always shown, small but not hidden. `confidence.level` is H, M, L or G if you want an icon, always with the text.
- `ask`: who to ask (extension agent, researcher...). Always shown.
- Button: "See the evidence" opens the Evidence panel for this `option_id`.

If there are fewer than three items the notices already say why; show the notice, do not pad with placeholders.

### Evidence panel
`GET /evidence/{option_id}` returns `card`, `option` (written-up reasons, benefits, risks, information gaps, who should review, farmer judgment note), `evidence` (rows: type, statement, reference, quote, locator, confidence, source id), `sources` (citation, URL, licence) and a `note`. Show it as a sheet or page: summary on top, then "What the evidence says" as a list (statement, small reference line, expand for the quote and source), then "What is missing" (information gaps) and "Risks to check locally". Link each source citation to its URL where there is one. Treat `confidence` the same way as above (letter plus words).

### Weather what-if (rain and temperature slider)
A panel on the results page. Three controls, sent together in one call:
- Rain: slider from 50% to 150% of normal, step 5, default 100% (send `rain_factor` 0.5 to 1.5).
- Rain starts later by: 0 to 60 days, step 7 (send `delay_days`).
- Warmer by: -2 to +5 degrees, step 0.5, default 0 (send `temp_shift`).

On release (not while dragging, and wait about 400 ms after the last change) call `POST /advice/{advice_id}/scenario`. Show the returned `lines` as sentences, the growing-season comparison (`growing_season.usual_days` and `shorter_year_days` against `as_recorded`) as two simple bars, and the `crops` list as before and after scores (`before`, `after`, `change`) with the crops that moved more than 5 points highlighted. The first line always says it is a what-if and not a forecast: keep it visible. Never present it as a prediction. A reset button returns the controls to normal. If the call returns 409 `no_weather`, show its message and hide the panel.

### Charts (optional but wanted)
`GET /advice/{advice_id}/charts`: monthly rain against crop water use (`monthly_water_mm`, millimetres per month, with deficit), monthly temperature (`monthly_temperature_c`), and the growing season per year (`growing_season_by_year` with start, end, days). Draw a month-by-month bar chart for rain with the water-use line, a temperature line, and a strip of bars (one per year) for the growing season. If `suspect_years` is not empty, state that those years were left out because the source data looked faulty. Each chart needs a one-line plain heading and units on the axis. Any list can be null or empty when no data is stored: show "not available for this place" instead of an empty chart.

### Map
`GET /map/states/{state}` returns GeoJSON (FeatureCollection) for the areas of one state, each feature with `properties`: `state`, `lga`, `ready` (true if we hold data), `lat`, `lon`. Use a light web map library on any free tile source and draw the outlines. Colour ready areas in the main colour and not-ready areas grey, with a legend. Highlight the farmer's area. Tapping an area selects it as the farmer's area (feeds step 1). On the results page show the same map centred on the farmer's area, with the data-from area marked if one was used. Use patterns or labels as well as colour (many users cannot tell colours apart). The outlines are simplified; do not use them for anything finer than area level.

### Save or print
- Save as text: `GET /advice/{id}/text?download=true` downloads `farm-advice-<place>-<date>.txt` (the one-page advice, fixed width, readable anywhere).
- Save the long report for the extension agent: `GET /advice/{id}/agent-report?download=true` downloads a `.md` file. It can take a few seconds the first time.
- Print: a print stylesheet of the results page (hide navigation and sliders, show all sections open, include notices and the "what we do not know" section, put the date and place in the header). Also provide a "Print" button using the browser print dialog.
- Share link: nothing to build. Advice is kept on the server only briefly (see 6), so do not offer a permanent link.
- Start again clears the state and returns to Welcome.

## 4b. Engagement: making the flow feel short

Goal: the farmer should feel they are setting up their field, not filling a form. These are suggestions for the interface only. They must never change what is asked, add advice text of your own, or hide a notice.

1. **Early reward.** The place profile card (above) shows soil and rain for their area right after they pick it.
2. **Build the rotation visually.** In step 2 show a row of season slots (newest on the right, oldest on the left). Tapping a crop picture drops it into the slot. A Fallow tile and an Other tile sit beside the crops. Put several crops in one slot to mean grown together. The farmer sees their rotation take shape.
3. **Seeds for priorities.** Give the farmer three seeds to place on the priority cards. The first seed placed means most important. Tapping a seeded card takes the seed back. Send the keys in seed order.
4. **One tap, one screen.** Yes, No and Not sure as large cards with a picture each. They move on at once. No separate Next button for these.
5. **A plant that grows.** Replace "Step 4 of 10" with a stalk that grows a leaf per answer. Do not show a count of questions.
6. **Echo only.** After each answer show a small acknowledgement of what was chosen ("Maize last season. Got it."). Do not add agronomy comments of your own (for example claims about nitrogen); any such claim must come from the server.
7. **Results as swipeable cards.** One card per choice (the plan drawn as a small timeline), then crops, then measures, then "What we do not know" as a normal card that cannot be skipped over (for example the last card needs a tap on "I have read this" before Save is enabled, or sits permanently below the cards).
8. **Live what-if.** Dragging the rain slider moves a growing-season bar, with the server's "not a forecast" line next to it.
9. **Read aloud.** Offer a speaker button on each section using the browser's speech feature, reading the server's sentences unchanged. Works for English only until native speakers write other languages; hide the button if the browser has no voice.
10. **Honest waiting.** While advice is prepared show what is happening ("reading 25 years of weather"), never a made-up percentage.

Keep warnings, notices and the "what we do not know" list at full size in every version of the layout.

## 5. The calls, in order

1. On load: `GET /health`, `GET /meta/questions`, `GET /places/states`.
2. As the farmer progresses: `GET /places/states/{state}/areas`, `GET /places/search`, `GET /places/locate`, `GET /places/nearest-ready`, `GET /places/profile`, `GET /map/states/{state}`.
3. When they confirm: `POST /advice` with all answers. Keep `advice_id` from the reply. It also returns `page` (structured, section by section) and `text` (the same advice as printed text; you can use it for print or save, or ignore it).
4. After results: `GET /advice/{id}/charts`, `GET /evidence/{option_id}` (on demand, per choice), `POST /advice/{id}/scenario` (on slider release), `GET /advice/{id}/text`, `GET /advice/{id}/agent-report`.

Request body of `POST /advice` (all answer fields as described in section 4):

```json
{
  "state": "Kaduna",
  "lga": "Zaria",
  "seasons": [["maize"], ["cowpea"], []],
  "priorities": ["water", "nitrogen"],
  "irrigated": false,
  "striga": null,
  "waterlogged": false,
  "enough_workers": true,
  "easy_seed": null,
  "tenure": "rent",
  "use_data_from": {"state": "Kaduna", "lga": "Kaduna North"},
  "language": "en"
}
```
`use_data_from` is only sent when the farmer accepted the nearest-area offer. Required: `state`, `lga`, `seasons`, `priorities`. Everything else has a default (false or null).

## 6. Waiting, errors and edge cases

- **Slow first answer.** A new advice call takes about 6 to 9 seconds, longer if many people are using it at once (the server does one at a time). Repeats of the same answers are instant because the `advice_id` is a fingerprint of the answers.
- **Errors are always JSON** of the form `{"error": {"code": "...", "message": "...", ...}}`. Show `message` to the farmer as it is, and branch on `code`:
  - `no_data` (409): the area has no data. The error carries `nearest` (area, state, km). Show the nearest-area offer. Do not treat as a failure.
  - `no_data_anywhere` (409): no area has data. Show the message.
  - `unknown_place`, `unknown_state` (404): a place name was not recognised. Send the user back to step 1.
  - `bad_priorities` (422): repeated or unknown priority. Carries `allowed`.
  - `data_from_not_ready` (422): the chosen fallback area has no data. Offer the nearest again.
  - `validation_error` (422): has a `fields` list of `{where, problem}`. Highlight the fields. Normally prevented by the UI.
  - `advice_expired` (410): the saved advice is gone (the server keeps only the latest 32, and forgets all on restart). Send the same `POST /advice` again with the stored answers; the farmer should not have to retype. So keep the full request body in browser state for the whole session.
  - `no_weather` (409): the what-if cannot be run for this place. Hide the what-if panel.
  - `internal_error` (500): show the message, offer "Try again".
  - Network failure or no response: "We cannot reach the advice service. Check your connection and try again", with a retry button that keeps the answers.
- **Fewer than three choices.** Normal. Show what comes back with its notice.
- **Data from another area.** Be clear and repeated: the header says it, the "what we do not know" list says it. Never imply local data.
- **Rain data gaps.** `page.rain.facts` can be null and `page.rain.lines` then says there is no weather record; show it.
- **Typed crops.** `page.told.lines` says which typed crops have no tests. Show it.
- **Nulls.** Any numeric field may be null. Never print "null", "NaN" or "undefined". Hide the item or write "not available".
- **Offline use.** Not supported in the first version. Keep answers in session storage so a reload does not lose them (wrap storage access in try/catch, it can be blocked).
- **Privacy.** The tool asks no name, phone number or exact location. Do not add any, and do not send analytics that include answers.

## 7. Look and feel

- One calm accent colour, a light background, large readable type, plenty of white space. No stock photos of satellites. Simple icons for crops are welcome, always beside the crop name.
- Warnings and "what we do not know" are part of the answer, not fine print: give them the same size of type as the rest.
- Colour is never the only signal (scores also shown as numbers, ready areas also labelled).
- Support light and dark mode if easy; always keep contrast high outdoors in sunlight.
- Wording on buttons: Start, Next, Back, Get my advice, Save as text, Save report for my agent, Print, Start again.
- Respect `prefers-reduced-motion` for the waiting screen and chart animations.

## 8. Accessibility and quality checklist

- Every control reachable by keyboard and labelled for screen readers; headings in order (one h1 per screen).
- Form errors announced and attached to the field.
- All text at least 16 px; contrast ratio at least 4.5 to 1.
- Charts have a text table alternative (the same numbers).
- Test on a low-end Android phone and a slow connection.
- Test with: the nearest-area offer, an area with no data anywhere, 1 season only, 4 seasons, all fallow except one, a typed crop, striga yes, waterlogged yes, workers short, a sluggish server.

## 9. What is not in the first version (do not build or promise)

Costs, prices, profit or yield forecasts; live weather alerts or forecasts; field-boundary drawing; user accounts; saving advice permanently; languages other than English; voice or WhatsApp (planned later through the same API); an AI chat box (planned later, would only quote the advice, never invent it).

## 10. Open questions for the owner

1. The "Working" screen sentence and the welcome text: the welcome comes from the server; the working text is yours to write for now (a server version can be added).
2. Where the site will be hosted and which origin addresses to allow (the server reads `NASA_API_ORIGINS`, default allows all).
3. Brand name, colours and logo.
