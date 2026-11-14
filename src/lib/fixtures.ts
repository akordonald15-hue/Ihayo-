// Explicit interface fixtures only. These are not observed agricultural data or advice.
import type {
  Advice,
  AdviceRequest,
  Charts,
  Evidence,
  GeoCollection,
  Questions,
  Scenario,
  ScenarioInput,
  State,
} from './types';
export const questions: Questions = {
  language: 'en',
  language_written: true,
  welcome:
    'CROP ROTATION ADVICE FOR YOUR FARM\n\nDemonstration only. Explore how IHAYO presents your answers, rotation choices and evidence. These sample records are not farm advice.',
  limits: { seasons: 4, priorities: 3, crops_per_season: 4 },
  crops: [
    { id: 'maize', label: 'Maize' },
    { id: 'cowpea', label: 'Cowpea (beans)' },
    { id: 'sorghum', label: 'Sorghum (guinea corn)' },
    { id: 'groundnut', label: 'Groundnut' },
    { id: 'soybean', label: 'Soybean' },
    { id: 'millet', label: 'Millet' },
    { id: 'cassava', label: 'Cassava' },
    { id: 'rice', label: 'Rice' },
  ],
  fallow: {
    label: 'Fallow (the land was rested, no crop)',
    note: 'No crop was grown in this season.',
  },
  other: { label: 'Another crop (you will type the name)', text: 'Type the name of the crop.' },
  steps: [
    { field: 'state', type: 'place', text: 'In which state is your farm?' },
    {
      field: 'lga',
      type: 'place',
      text: 'In which local government area of {state} is your farm?',
    },
    {
      field: 'seasons',
      type: 'seasons',
      text: 'What grew on your land?',
      help: 'Think of your main rainy-season planting each year.',
      season_texts: [
        'What did you grow in your last season?',
        'What did you grow in the season before that?',
        'What did you grow three seasons ago?',
        'What did you grow four seasons ago?',
      ],
    },
    {
      field: 'priorities',
      type: 'pick',
      text: 'What matters most to you?',
      max: 3,
      options: [
        { key: 'nitrogen', label: 'Build fertility and use less fertiliser' },
        { key: 'pests', label: 'Manage pests and weeds' },
        { key: 'water', label: 'Make better use of the rain' },
        { key: 'organic_matter', label: 'Build soil organic matter' },
        { key: 'income', label: 'Keep options for income' },
        { key: 'erosion', label: 'Protect soil from erosion' },
        { key: 'inputs', label: 'Use fewer purchased inputs' },
      ],
    },
    ...(['irrigated', 'striga', 'waterlogged', 'enough_workers', 'easy_seed'] as const).map(
      (field, i) => ({
        field,
        type: 'choice',
        text: [
          'Can you water crops in the dry season?',
          'Have you seen Striga on your field?',
          'Does water stand for days after heavy rain?',
          'Are workers easy to find at planting and weeding?',
          'Is good legume seed easy to get?',
        ][i],
        options: [
          { value: true, label: 'Yes' },
          { value: false, label: 'No' },
          ...(field === 'irrigated' ? [] : [{ value: null, label: 'Not sure' }]),
        ],
      }),
    ),
    {
      field: 'tenure',
      type: 'choice',
      text: 'How do you hold this land?',
      options: [
        { value: 'own', label: 'I own it' },
        { value: 'rent', label: 'I rent it' },
        { value: 'borrowed', label: 'I borrow it' },
      ],
    },
  ],
};
export const states: State[] = [
  { state: 'Kaduna', areas: 3, areas_ready: 2 },
  { state: 'Lagos', areas: 2, areas_ready: 1 },
];
export const areas: Record<string, { lga: string; ready: boolean; lat: number; lon: number }[]> = {
  Kaduna: [
    { lga: 'Kajuru', ready: true, lat: 10.4, lon: 7.8 },
    { lga: 'Kaduna North', ready: true, lat: 10.6, lon: 7.4 },
    { lga: 'Birnin Gwari', ready: false, lat: 10.9, lon: 6.6 },
  ],
  Lagos: [
    { lga: 'Eti Osa', ready: true, lat: 6.45, lon: 3.58 },
    { lga: 'Ikorodu', ready: false, lat: 6.6, lon: 3.59 },
  ],
};
const sample = 'Demonstration record only; not verified local data.';
export function makeAdvice(r: AdviceRequest): Advice {
  const names = (s: string[]) =>
    s.length
      ? s.map((c) => questions.crops.find((x) => x.id === c)?.label ?? c).join(' + ')
      : 'Fallow';
  return {
    advice_id: 'fixture-advice',
    language: 'en',
    language_written: true,
    text:
      'IHAYO DEMONSTRATION\nThese interface fixtures are not farm advice.\n' +
      JSON.stringify(r, null, 2),
    page: {
      title: 'Your land. A few choices to talk through.',
      place: {
        state: r.state,
        lga: r.lga,
        zone: 'Demonstration area',
        data_from: r.use_data_from ? { ...r.use_data_from, km: 35 } : null,
        data_from_text: r.use_data_from
          ? `Demonstration: data taken from ${r.use_data_from.lga}, ${r.use_data_from.state}, 35 km away. These records may differ from your farm.`
          : null,
      },
      made: '2026-11-14',
      weather_years: [2001, 2025],
      intro: [
        'This is a demonstration, not an instruction for your farm. Talk real advice over with your extension agent.',
        'Do not buy fertiliser from this page. Soil tests and local review are needed.',
      ],
      land: {
        heading: '1. YOUR LAND',
        lines: [sample, 'Sample soil acidity (pH): about 6.0.'],
        facts: {
          ph: { value: 6, low: 5.5, high: 6.5 },
          carbon: 9,
          texture: 'Sample sandy loam',
          deep_texture: null,
          fcc: null,
          cover: null,
          slope: 2,
          ph_crops: { ok: [], low: [], high: [], out_low: [], out_high: [] },
        },
        elevation_m: 628,
      },
      rain: {
        heading: '2. RAIN AND THE GROWING SEASON',
        lines: [sample, 'Sample yearly rain: 1,370 mm. Sample usual growing season: 165 days.'],
        facts: {
          rain: 1370,
          start: '20 Jun',
          end: '3 Nov',
          days: 165,
          short: 142,
          second: 0,
          suspect: [2021, 2022],
        },
      },
      told: {
        heading: '3. WHAT YOU TOLD US',
        name: null,
        option: null,
        lines: [
          `${r.lga}, ${r.state}.`,
          ...r.seasons.map((s, i) => `Season ${i + 1}, newest first: ${names(s)}.`),
          `Your priorities: ${r.priorities.map((k) => questions.steps.find((x) => x.field === 'priorities')?.options?.find((x) => x.key === k)?.label ?? k).join('; ')}.`,
          ...(
            ['irrigated', 'striga', 'waterlogged', 'enough_workers', 'easy_seed', 'tenure'] as const
          ).map(
            (k) =>
              `${questions.steps.find((x) => x.field === k)?.text} ${questions.steps.find((x) => x.field === k)?.options?.find((x) => x.value === r[k])?.label ?? 'Not sure'}.`,
          ),
        ],
      },
      choices: {
        heading: '4. YOUR CHOICES',
        notices: [
          'Only one illustrative choice is shown. The live service will return the choices supported by its evidence.',
        ],
        items: [
          {
            option_id: 'fixture-existing',
            role: 'existing',
            role_label: 'YOUR OWN ROTATION · SAMPLE',
            name: 'The seasons you described',
            what: 'This card demonstrates the presentation of a rotation. It does not recommend a crop.',
            steps: [...r.seasons].reverse().map((s, i) => ({
              year: i + 1,
              season: 'main',
              fallow: s.length === 0,
              crop: s[0] ? names([s[0]]) : null,
              also: s.slice(1).map((c) => names([c])),
              months: '',
              text: `Sample timeline, year ${i + 1}: ${names(s)}.`,
            })),
            two_seasons_note: null,
            fit: [{ crop: 'Maize · sample', score: 80 }],
            help: ['Potential benefits must come from the live evidence service.'],
            watch: ['This fixture has no tested agronomic recommendation.'],
            notices: [
              ...(r.striga ? ['Sample warning slot: you reported Striga.'] : []),
              ...(r.waterlogged ? ['Sample warning slot: you reported waterlogging.'] : []),
              ...(r.enough_workers === false
                ? ['Sample warning slot: you reported limited workers.']
                : []),
              'Do not act on these demonstration records.',
            ],
            issues: [],
            priorities: r.priorities.map((key) => ({
              key,
              label:
                questions.steps
                  .find((x) => x.field === 'priorities')
                  ?.options?.find((x) => x.key === key)?.label ?? key,
              text: 'The live service will explain how this choice relates to this priority.',
            })),
            conditions: ['Local conditions need review with an extension agent.'],
            confidence: {
              level: 'G',
              text: 'G · Known evidence gap: demonstration only.',
              where: 'Not tested. This is an interface fixture.',
            },
            ask: 'Ask your extension agent to review real advice when the service is connected.',
          },
        ],
      },
      crops: {
        heading: '5. CROPS THAT SUIT THE LAND',
        intro:
          'These sample scores illustrate how crop fit is displayed. They are not yield or profit forecasts.',
        items: [
          {
            crop: 'Maize · sample',
            score: 80,
            reasons: ['Demonstration only. No crop suitability assessment was run.'],
            all_fine: false,
          },
        ],
        caution: 'Real scores depend on the available land and weather records.',
      },
      measures: {
        heading: '6. WHAT CAN HELP YOUR LAND AND WATER',
        intro: 'The live service supplies this section.',
        items: ['No agricultural measures are recommended by this demonstration.'],
      },
      unknown: {
        heading: '7. WHAT WE DO NOT KNOW',
        intro: 'Uncertainty belongs beside every choice.',
        items: [
          'The backend is not connected in this demonstration.',
          'Sample values are not measurements for your farm.',
          ...(r.use_data_from ? ['These demonstration records come from a different area.'] : []),
        ],
      },
      print: {
        heading: '8. SAVE AND PRINT',
        lines: ['Save this demonstration to inspect the interface. Do not use it as farm advice.'],
      },
    },
  };
}
export const charts: Charts = {
  suspect_years: [2021, 2022],
  years_used: 23,
  monthly_water_mm: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    rain: [2, 4, 18, 56, 125, 180, 235, 265, 210, 115, 30, 4][i],
    reference_evapotranspiration: [130, 140, 165, 170, 155, 125, 110, 105, 115, 135, 140, 130][i],
    deficit: [128, 136, 147, 114, 30, 0, 0, 0, 0, 20, 110, 126][i],
  })),
  monthly_temperature_c: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    mean: [24, 26, 29, 30, 28, 26, 25, 24, 25, 26, 25, 24][i],
    max: [33, 35, 37, 38, 35, 32, 30, 29, 31, 33, 34, 33][i],
  })),
  growing_season_by_year: [
    { year: 2020, start: '2020-05-20', end: '2020-10-30', days: 163 },
    { year: 2023, start: '2023-06-02', end: '2023-10-25', days: 145 },
    { year: 2024, start: '2024-05-28', end: '2024-11-02', days: 158 },
    { year: 2025, start: '2025-05-25', end: '2025-11-04', days: 163 },
  ],
  units_note:
    'Demonstration numbers: water in mm/month, temperature in °C, growing season in days. Not observed local records.',
};
export function makeScenario(change: ScenarioInput): Scenario {
  return {
    advice_id: 'fixture-advice',
    change,
    rain_mm_a_year: 1370 * change.rain_factor,
    mean_temperature_c: 26 + change.temp_shift,
    growing_season: {
      usual_days: 152,
      shorter_year_days: 134,
      start_day: 172,
      end_day: 320,
      as_recorded: { usual_days: 165, shorter_year_days: 142 },
    },
    crops: [{ crop: 'Maize · sample', before: 80, after: 80, change: 0 }],
    lines: [
      'This is a what-if, not a forecast. Demonstration only: no weather calculation has been run.',
      'The sample comparison is fixed and does not calculate a response to these controls.',
    ],
  };
}
export const evidence: Evidence = {
  option_id: 'fixture-existing',
  card: {
    option_id: 'fixture-existing',
    plain_name: 'Demonstration evidence card',
    what_it_is: 'No scientific claim is made by this fixture.',
    may_help: 'Inspect the evidence interface.',
    watch_out: 'Not a tested recommendation.',
    ask: 'Review real evidence with your extension agent.',
    where_tested: 'Not tested.',
    measured_with: 'No measurements.',
  },
  option: {
    name: 'Sample',
    why_suggested: 'Interface demonstration only.',
    benefits: 'No measured benefits.',
    risks_for_local_review: 'No local review has occurred.',
    information_gaps: 'A live backend and verified evidence are required.',
    who_should_review: 'An extension agent and the data provider.',
    farmer_judgment_note: 'Farmers make their own decisions with local advice.',
    overall_confidence: 'G',
    readiness: 'Demonstration only',
    class: '',
    context: '',
    applies_to_region: '',
    pattern: '',
    crops: '',
    earlier_id: null,
    carried_from: null,
  },
  evidence: [
    {
      evidence_type: 'Known gap',
      reference: 'Supplied API contract',
      statement_or_value: 'This fixture has no supporting scientific study.',
      source_id: 'contract',
      confidence: 'G',
      evidence_id: 'fixture-gap',
      locator: null,
      quote: null,
      direction: null,
    },
  ],
  sources: [
    {
      source_id: 'contract',
      citation: 'API_REFERENCE.md · supplied project contract',
      url: null,
      licence_or_terms: 'No scientific evidence supplied in this fixture.',
    },
  ],
  note: 'All content in this panel is explicitly illustrative.',
};
export function mapFor(state: string): GeoCollection {
  return {
    type: 'FeatureCollection',
    features: (areas[state] ?? []).map((a, i) => ({
      type: 'Feature',
      properties: { ...a, state },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [i, 0],
            [i + 0.9, 0.1],
            [i + 0.8, 1.1],
            [i + 0.2, 1.3],
            [i, 0],
          ],
        ],
      },
    })),
  };
}
export async function fixtureRequest(path: string, body?: unknown): Promise<unknown> {
  await new Promise((r) => setTimeout(r, path === '/advice' ? 1000 : 150));
  const [url, query] = path.split('?');
  const p = new URLSearchParams(query);
  if (url === '/health')
    return { status: 'ok', areas: 5, areas_ready: 3, fetching: false, languages: ['en'] };
  if (url === '/meta/questions') return questions;
  if (url === '/places/states') return states;
  if (url.match(/^\/places\/states\/.*\/areas$/))
    return areas[decodeURIComponent(url.split('/')[3])] ?? [];
  if (url === '/places/search')
    return Object.entries(areas)
      .flatMap(([state, items]) => items.map((x) => ({ ...x, state, zone: 'Demonstration area' })))
      .filter((x) =>
        (x.lga + ' ' + x.state).toLowerCase().includes((p.get('q') ?? '').toLowerCase()),
      );
  if (url === '/places/nearest-ready')
    return {
      state: p.get('state') ?? 'Kaduna',
      lga: p.get('state') === 'Lagos' ? 'Eti Osa' : 'Kajuru',
      zone: 'Demonstration area',
      lat: 10.4,
      lon: 7.8,
      km: 35,
    };
  if (url === '/places/locate')
    return { state: 'Kaduna', ...areas.Kaduna[0], zone: 'Demonstration area', nearest_ready: null };
  if (url === '/places/profile') {
    const a = makeAdvice({
      state: p.get('state') ?? '',
      lga: p.get('lga') ?? '',
      seasons: [[]],
      priorities: ['water'],
      irrigated: false,
      striga: null,
      waterlogged: null,
      enough_workers: null,
      easy_seed: null,
      tenure: 'own',
      use_data_from: null,
      language: 'en',
    });
    return {
      place: a.page.place,
      land: a.page.land,
      rain: a.page.rain,
      elevation_m: a.page.land.elevation_m,
    };
  }
  if (url.startsWith('/map/states/')) return mapFor(decodeURIComponent(url.split('/')[3]));
  if (url === '/advice') return makeAdvice(body as AdviceRequest);
  if (url.endsWith('/charts')) return charts;
  if (url.endsWith('/scenario')) return makeScenario(body as ScenarioInput);
  if (url.startsWith('/evidence/')) return evidence;
  throw new Error('Unsupported fixture route: ' + path);
}
