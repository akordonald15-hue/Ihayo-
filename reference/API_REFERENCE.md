# API reference: crop rotation advice for Nigerian farmers

Version 1. Base path `/api/v1`. All answers are JSON (UTF-8) except the two download calls. A live, testable description of every call is served at `/api/v1/docs` (and the machine-readable OpenAPI file at `/api/v1/openapi.json`). The screen-by-screen use of these calls is in `FRONTEND_FLOW.md`.

## 1. General

- **Read only.** The service reads prepared NASA weather, soil and crop data. It never downloads anything while answering, so a call never waits on an outside service. Data for an area is prepared in advance by the operator; today 62 of 774 areas are ready.
- **No accounts, no personal data.** Nothing identifies the farmer. Answers are not stored beyond a short in-memory cache (below).
- **Sentences come from the server.** Every sentence a farmer reads is produced by the server from a message catalogue. The frontend displays them and does not reword them.
- **Null.** Any value may be `null` when the data is not available. JSON never contains NaN or Infinity.
- **Language.** Only English (`"en"`) is written. A request for another `language` still returns English and says so with `language_written: false`.
- **CORS.** Browsers may call from any origin by default. The operator restricts this with the environment variable `NASA_API_ORIGINS` (comma separated list of origins).
- **Timing.** A new advice takes about 6 to 9 seconds (the same answers again: about 0.1 s). `profile` takes about 5 s the first time for an area. Everything else is under a second. Requests are worked through one at a time on the server. Set client time-outs of at least 60 seconds for `POST /advice` and `GET /places/profile`.
- **Kept advice.** `POST /advice` keeps the result in server memory under an `advice_id` (the last 32 are kept, and all are lost when the server restarts). Calls that use an `advice_id` can answer `410 advice_expired`; the client then sends the same `POST /advice` again.
- **Headings** in `page` sections are the printed headings and carry their number and capitals (for example `"1. YOUR LAND"`). Show as given, or strip a leading number and a dot, but do not reorder the sections.

### Error format

Every error, whatever the status, has this body:

```json
{"error": {"code": "no_data", "message": "We do not have weather and soil data for Zaria yet.", "nearest": { ... }}}
```

`code` is for the program to branch on, `message` is a plain sentence that can be shown to the farmer. Some errors carry extra fields (named below).

| status | code | meaning | extra fields |
|---|---|---|---|
| 404 | `unknown_place` | state or area not recognised | none |
| 404 | `unknown_state` | state not recognised (areas call) | none |
| 404 | `no_area_here` | `locate` point is outside every area | none |
| 404 | `unknown_option` | rotation option id not known | `known` (list of ids) |
| 404 | `not_found` / 405 `method_not_allowed` | unknown path or wrong method | none |
| 409 | `no_data` | the chosen area has no prepared data | `nearest` (see `nearest-ready`, or null) |
| 409 | `no_data_anywhere` | no area has data | none |
| 409 | `no_weather` | the what-if cannot run for this place | none |
| 410 | `advice_expired` | the `advice_id` is no longer kept | none |
| 422 | `validation_error` | a field is missing or not valid | `fields`: list of `{where, problem}` |
| 422 | `bad_priorities` | priority repeated or unknown | `allowed` (list of keys) |
| 422 | `data_from_not_ready` | the area chosen as data source has no data | none |
| 422 | `search_too_short` | search text under 2 letters | none |
| 422 | `point_needed` | nearest-ready needs a place or a point | none |
| 500 | `internal_error` | unexpected fault | none |

## 2. Reference calls

### GET `/health`
```json
{"status": "ok", "areas": 774, "areas_ready": 62, "fetching": false, "languages": ["en"]}
```
Use it on load to know the service is up. `fetching` is always `false`.

### GET `/meta/questions?language=en`
The questions, wording and option lists. Cache it for the session.

```json
{
  "language": "en", "language_written": true, "welcome": "CROP ROTATION ADVICE FOR YOUR FARM\n\n...",
  "limits": {"seasons": 4, "priorities": 3, "crops_per_season": 4},
  "crops": [{"id": "maize", "label": "Maize"}, {"id": "sorghum", "label": "Sorghum (guinea corn)"}, ...],
  "fallow": {"label": "Fallow (the land was rested, no crop)", "note": "send an empty list for a fallow season"},
  "other": {"label": "Another crop (you will type the name)", "text": "Type the name of the crop."},
  "steps": [
    {"field": "state", "type": "place", "text": "In which STATE is your farm?"},
    {"field": "lga", "type": "place", "text": "In which LOCAL GOVERNMENT AREA (LGA) of {state} is your farm?"},
    {"field": "seasons", "type": "seasons", "text": "...", "newest_first": true, "help": "...", "season_texts": ["What did you grow in your LAST season?", "..."]},
    {"field": "priorities", "type": "pick", "text": "...", "max": 3, "options": [{"key": "nitrogen", "label": "Build fertility and use less fertiliser"}, ...]},
    {"field": "irrigated", "type": "choice", "text": "...", "options": [{"value": true, "label": "Yes"}, {"value": false, "label": "No"}]},
    {"field": "striga", "type": "choice", "text": "...", "options": [{"value": true, "label": "Yes"}, {"value": false, "label": "No"}, {"value": null, "label": "Not sure"}]},
    {"field": "waterlogged", ...}, {"field": "enough_workers", ...}, {"field": "easy_seed", ...},
    {"field": "tenure", "type": "choice", "options": [{"value": "own", "label": "..."}, {"value": "rent", "label": "..."}, {"value": "borrowed", "label": "..."}]}
  ]
}
```
- The `lga` text contains the placeholder `{state}`: replace it with the chosen state's name.
- `season_texts` has one question per season, newest first (index 0 is the last season).
- Priority keys are: `nitrogen`, `pests`, `water`, `organic_matter`, `income`, `erosion`, `inputs`.
- In a choice step, `value: null` means "not sure" and is sent as JSON `null`.

### GET `/places/states`
List of `{"state": "Abia", "areas": 17, "areas_ready": 1}` for the 37 states and the Federal Capital Territory, sorted by name.

### GET `/places/states/{state}/areas`
`{"lga": "Birnin Gwari", "lat": 10.87757, "lon": 6.56031, "ready": false}` for each area of the state. `{state}` must be URL-encoded (for example `Federal%20Capital%20Territory`). 404 `unknown_state` if not found. `lat`/`lon` is the area's representative point, not its centre of population.

### GET `/places/search?q=zaria`
Up to 20 areas whose name, or whose state's name, contains the text (case-insensitive, at least 2 letters):
`[{"state": "Kaduna", "lga": "Zaria", "zone": "North West", "ready": true}]`

### GET `/places/locate?lat=10.52&lon=7.44`
Finds the area containing a point. `lat` must be 3 to 15, `lon` 2 to 16 (else 422 `validation_error`).
```json
{"state": "Lagos", "lga": "Ikorodu", "zone": "South West", "lat": 6.59969, "lon": 3.59369, "ready": false,
 "nearest_ready": {"state": "Lagos", "lga": "Eti Osa", "zone": "South West", "lat": 6.45726, "lon": 3.58173, "km": 16}}
```
`nearest_ready` is `null` when the area itself is ready. 404 `no_area_here` if the point is outside every area (for example at sea).

### GET `/places/nearest-ready`
Query either `state` and `lga`, or `lat` and `lon`. Returns the nearest area that has data:
`{"state": "Kaduna", "lga": "Zaria", "zone": "North West", "lat": 11.0242, "lon": 7.65282, "km": 0}`
`km` is the straight-line distance rounded to whole kilometres. Errors: 404 `unknown_place`, 422 `point_needed`, 409 `no_data_anywhere`.

### GET `/places/profile?state=&lga=` (optional `from_state`, `from_lga`, `language`)
What is already known about the land and rain of an area, before any farm question. Same sentence style as the advice page.
```json
{
  "place": {"state": "Kaduna", "lga": "Kaduna North", "zone": "North West", "data_from": null},
  "land": {"heading": "1. YOUR LAND", "lines": ["Soil acidity (pH): about 6.0. ..."], "facts": { ...see page.land.facts... }},
  "rain": {"heading": "2. RAIN AND THE GROWING SEASON", "lines": ["In a normal year about 1,370 mm of rain falls.", "..."], "facts": { ...see page.rain.facts... }},
  "elevation_m": 628.0
}
```
If the area has no data and `from_state`/`from_lga` are not given: 409 `no_data` with `nearest`. When they are given, `place.data_from` is `{state, lga, km}` and the facts are those of that area. If the data-source area is not ready: 422 `data_from_not_ready`.

### GET `/map/states/{state}`
GeoJSON FeatureCollection of the state's areas (outlines simplified to about 300 m, fine for display, not for measuring). Each feature:
```json
{"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[[lon, lat], ...]]},
 "properties": {"state": "Kaduna", "lga": "Birnin Gwari", "ready": false, "lat": 10.87757, "lon": 6.56031}}
```
Coordinates are longitude, latitude (WGS84). Geometry may also be `MultiPolygon`. Every state is under about 110 KB (largest checked: Kano, 44 areas).

## 3. Advice

### POST `/advice`
Request body (JSON):

| field | type | required | meaning |
|---|---|---|---|
| `state` | string | yes | state name as returned by `places/states` |
| `lga` | string | yes | area name as returned by the areas call |
| `seasons` | list of list of string | yes | 1 to 4 seasons, **newest first**. Each season is a list of crop ids (from `meta/questions`) or typed crop names (max 40 characters). `[]` is a fallow. 1 to 4 different crops per season. |
| `priorities` | list of string | yes | 1 to 3 different keys, most important first |
| `irrigated` | boolean | no, default `false` | can water crops in the dry season |
| `striga` | boolean or null | no | Striga on the field; `null` is not sure |
| `waterlogged` | boolean or null | no | water stands for days after heavy rain |
| `enough_workers` | boolean or null | no | `true` means workers are easy to find at planting and weeding |
| `easy_seed` | boolean or null | no | `true` means good legume seed is easy to get |
| `tenure` | `"own"`, `"rent"`, `"borrowed"` or null | no | land ownership |
| `use_data_from` | `{state, lga}` or null | no | an area with data to use when the farmer's own area has none |
| `language` | string | no, default `"en"` | |

```json
{"state": "Kaduna", "lga": "Kaduna North", "seasons": [["maize"], ["cowpea"], []], "priorities": ["water", "nitrogen"],
 "irrigated": false, "striga": null, "waterlogged": false, "enough_workers": true, "easy_seed": null, "tenure": "rent"}
```

Response 200:
```json
{"advice_id": "f658a2bfd786b522", "language": "en", "language_written": true, "page": { ... }, "text": "======...one page of fixed width text"}
```
`advice_id` is a fingerprint of the answers: the same answers give the same id. `text` is the whole advice as the printed page (78 character lines), identical in content to `page`.

Errors: 404 `unknown_place`; 409 `no_data` (with `nearest`) when the area has no data and `use_data_from` is absent; 422 `data_from_not_ready`, `bad_priorities`, `validation_error`.

#### The `page` object

All `lines`, `items`, `notices` are lists of ready sentences. Show them in the order given.

```
page
  title                 string
  place                 {lga, state, zone, data_from {lga,state,km} | null, data_from_text string | null}
  made                  "YYYY-MM-DD" date the advice was made
  weather_years         [first_year, last_year] of weather used, or null
  intro                 [2 sentences: advice not an order; do not buy fertiliser from this page]
  land                  {heading, lines[], facts, elevation_m}
  rain                  {heading, lines[], facts}
  told                  {heading, lines[], name, option}
  choices               {heading, notices[], items[]}
  crops                 {heading, intro, items[], caution | null}
  measures              {heading, intro, items[]}
  unknown               {heading, intro, items[]}
  print                 {heading, lines[]}
```

`land.facts`: `{ph: {value, low, high} | null, carbon (g per kg) | null, texture | null, deep_texture | null, fcc | null, cover | null, slope (degrees) | null, ph_crops: {ok: [crop names], low: [...], high: [...], out_low: [...], out_high: [...]}}`. `ph.low`/`ph.high` are the 90 percent band. `elevation_m` is metres above sea level or null (a number only, no sentence). The `lines` already say everything the facts say.

`rain.facts` (null when no weather is stored, then `lines` says so): `{rain (mm in a normal year), start ("20 Jun"), end ("3 Nov"), days (usual season length), short (length in a shorter year, one year in four), second (share of years with a second rainy period, 0 to 1), suspect: [years left out because the source data looked faulty]}`.

`told`: `name` is the plain name of the rotation we think the farmer follows (or null), `option` its id.

`choices.items[]` (up to three; the farmer's own rotation first, `role: "existing"`, then others with `role: "other"`):
```
option_id         string, use it for GET /evidence/{option_id}
role              "existing" | "other"
role_label        string for the badge, capitals as printed (for example "KEEP WHAT YOU DO NOW")
name, what        plain name and description (what can be null)
steps[]           {year, season ("main" | "early" | "late"), fallow, crop | null, also [crop names grown together], months ("May to Aug" or ""), text (a full sentence)}
two_seasons_note  string | null (explains early and late plantings in one year)
fit[]             {crop, score 0-100} for the crops used in the plan
notices[]         cautions specific to this choice (untested crops, drainage, seed, labour)
help[], watch[]   "may help" and "watch out" sentences
issues[]          known conflicts in the plan, as sentences
priorities[]      {key, label, text}: how this choice meets each priority the farmer picked, in their order
conditions[]      sentences about conditions that must hold for the choice to fit (empty if none)
confidence        {level "H"|"M"|"L"|"G", text (how sure we are, in words), where (where it was tested)}
ask               who to ask about this choice
```
`crops.items[]`: `{crop, score 0-100, reasons: [sentences], all_fine: bool}`. The score is how well the crop fits the land and weather, not a yield. `crops.caution` is a sentence to show once when rain figures were used.

Fewer than three `choices.items` is normal; `choices.notices` explains why. Notices must be shown.

### GET `/advice/{advice_id}`
`{"advice_id", "language", "page", "text"}` as in the POST. 410 `advice_expired` when not kept.

### GET `/advice/{advice_id}/text?download=false`
The one-page advice as `text/plain; charset=utf-8`. With `download=true` the response carries `Content-Disposition: attachment; filename="farm-advice-<state>-<area>-<date>.txt"`.

### GET `/advice/{advice_id}/agent-report?download=false`
The long report for the extension agent, `text/markdown; charset=utf-8` (more than 25 sections: field condition, rain and temperature history, crop suitability, rotation comparison, evidence and confidence, glossary, review checklist). The first call for an advice takes a few seconds. `download=true` gives `farm-agent-report-...md`.

### GET `/advice/{advice_id}/charts`
Data for drawing. Any list can be `null` or empty when not stored.
```json
{
  "suspect_years": [2021, 2022], "years_used": 23,
  "monthly_temperature_c": [{"month": 1, "mean": 24.1, "max": 33.0}, ...],
  "monthly_water_mm": [{"month": 1, "rain": 1.2, "reference_evapotranspiration": 160.0, "deficit": 158.8}, ...],
  "growing_season_by_year": [{"year": 2001, "start": "2001-05-20", "end": "2001-10-30", "days": 163.0}, ...],
  "units_note": "rain, evapotranspiration and deficit in mm per month (average of the years used), temperature in degrees Celsius"
}
```
`month` is 1 to 12. Months are averages over `years_used`. `growing_season_by_year` has the longest growing period of each year. Years in `suspect_years` are left out of all averages (their source rain totals look wrong).

### POST `/advice/{advice_id}/scenario`
Body, all optional:

| field | type | range | default |
|---|---|---|---|
| `rain_factor` | number | 0.5 to 1.5 | 1.0 (1.0 is the weather as recorded, 0.85 is 15 percent less rain) |
| `delay_days` | integer | 0 to 60 | 0 (every rain day is moved later by this many days) |
| `temp_shift` | number | -2 to 5 | 0 (degrees Celsius added to all temperatures) |

```json
{
  "advice_id": "f658a2bfd786b522", "change": {"rain_factor": 0.85, "delay_days": 14, "temp_shift": 1.0},
  "rain_mm_a_year": 1164.7, "mean_temperature_c": 25.4,
  "growing_season": {"usual_days": 152.0, "shorter_year_days": 134.25, "start_day": 172.0, "end_day": 320.5,
                     "as_recorded": {"usual_days": 165.0, "shorter_year_days": 142.25}},
  "crops": [{"crop": "Maize", "before": 90, "after": 100, "change": 10}, ...],
  "lines": ["This shows what could happen ... not a forecast.", "Growing season: about 152 days ...", "Cowpea (beans) would fit better: score 90 to 100."]
}
```
`start_day`/`end_day` are day of the year. `lines[0]` is the not-a-forecast statement and must stay visible; then the season sentence; then one sentence per crop whose score moves by more than 5 points (or "No crop changes its score by more than 5 points."). `crops` lists every crop. It is a re-run of the stored weather record with the changes applied, never a forecast. Errors: 410 `advice_expired`, 422 `validation_error` (value outside range), 409 `no_weather` (no stored weather).

## 4. Evidence

### GET `/evidence/{option_id}`
Use the `option_id` of a choice card. The response (can be large, for example 100 evidence rows):
```
option_id
card       {option_id, plain_name, what_it_is, may_help, watch_out, ask, where_tested, measured_with}  (the farmer-card text; may_help/watch_out are " | " separated)
option     {name, why_suggested, benefits, risks_for_local_review, information_gaps, who_should_review, farmer_judgment_note, overall_confidence ("H","M","L","G"), readiness, class, context, applies_to_region, pattern, crops, earlier_id, carried_from}
evidence[] {evidence_type, reference, statement_or_value, source_id, confidence, evidence_id, locator, quote, direction}
sources[]  {source_id, citation, url, licence_or_terms}
note       string: where the evidence comes from and its limit
```
- `statement_or_value` is the claim in one sentence. `quote`, `locator` (page or section) and `direction` are filled only for newer rows and are null otherwise.
- `source_id` links to `sources[].source_id`. A cell can hold several ids separated by `/`, `,` or `;`.
- `confidence`: `H` Nigerian or West African primary source, `M` global or review or older source, `L` proxy or weak, `G` a known gap.
- `option` text is written for reviewers (some technical wording); `card` is the plain farmer wording. Use `card` for the main sheet and `option` for "What is missing" and "Risks to check locally".
- 404 `unknown_option` (with `known`).

## 5. Typical order of calls

1. `GET /health`, `GET /meta/questions`, `GET /places/states`.
2. While answering: `areas`, `search`, `locate`, `nearest-ready`, `profile`, `map/states/{state}`.
3. `POST /advice` with the full answers, then `charts`, `evidence/{option_id}`, `scenario`, `text`, `agent-report` as the farmer asks.
4. On 410, repeat `POST /advice` with the same body.

## 6. Running it (for whoever hosts it)

    uv run python -m nasa.api --host 0.0.0.0 --port 8000

Environment: `NASA_API_ORIGINS` (allowed browser origins, default all). The database and prepared data must already be in place (`python -m nasa.farm prepare` fills them; it is the only step that needs the internet). The API itself needs no internet and no keys. One process answers one advice at a time; for more people at once run several processes behind a proxy, or ask for a shared cache.

## 7. What the API does not give

Costs, prices, profit or yield forecasts; weather forecasts or alerts; languages other than English; permanent advice links; user accounts; images (the map and charts are data for the frontend to draw).
