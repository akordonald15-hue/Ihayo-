export type NullableChoice = boolean | null;
export type Field =
  'irrigated' | 'striga' | 'waterlogged' | 'enough_workers' | 'easy_seed' | 'tenure';
export const fieldKeys: Field[] = [
  'irrigated',
  'striga',
  'waterlogged',
  'enough_workers',
  'easy_seed',
  'tenure',
];
export interface Place {
  state: string;
  lga: string;
}
export interface Area {
  lga: string;
  lat: number;
  lon: number;
  ready: boolean;
}
export interface SearchPlace extends Place {
  ready: boolean;
  zone: string;
}
export interface Nearest extends Place {
  zone: string;
  lat: number;
  lon: number;
  km: number;
}
export interface State {
  state: string;
  areas: number;
  areas_ready: number;
}
export interface Health {
  status: string;
  areas: number;
  areas_ready: number;
  fetching: boolean;
  languages: string[];
}
export interface Question {
  field: string;
  type: string;
  text: string;
  help?: string;
  season_texts?: string[];
  max?: number;
  options?: { key?: string; label: string; value?: boolean | string | null }[];
}
export interface Questions {
  language: string;
  language_written: boolean;
  welcome: string;
  limits: { seasons: number; priorities: number; crops_per_season: number };
  crops: { id: string; label: string }[];
  fallow: { label: string; note: string };
  other: { label: string; text: string };
  steps: Question[];
}
export interface AdviceRequest extends Place {
  seasons: string[][];
  priorities: string[];
  irrigated: boolean;
  striga: NullableChoice;
  waterlogged: NullableChoice;
  enough_workers: NullableChoice;
  easy_seed: NullableChoice;
  tenure: 'own' | 'rent' | 'borrowed' | null;
  use_data_from: Place | null;
  language: 'en';
}
export interface Draft extends Place {
  seasons: (string[] | null)[];
  priorities: string[];
  answers: Partial<Record<Field, boolean | string | null>>;
  use_data_from: Place | null;
}
export interface Lines {
  heading: string;
  lines: string[];
}
export interface Land extends Lines {
  facts: {
    ph: { value: number | null; low: number | null; high: number | null } | null;
    carbon: number | null;
    texture: string | null;
    deep_texture: string | null;
    fcc: string | null;
    cover: string | null;
    slope: number | null;
    ph_crops: {
      ok: string[];
      low?: string[];
      high?: string[];
      out_low?: string[];
      out_high?: string[];
    };
  } | null;
  elevation_m: number | null;
}
export interface Rain extends Lines {
  facts: {
    rain: number | null;
    start: string | null;
    end: string | null;
    days: number | null;
    short: number | null;
    second: number | null;
    suspect: number[];
  } | null;
}
export interface Choice {
  option_id: string;
  role: 'existing' | 'other';
  role_label: string;
  name: string;
  what: string | null;
  steps: {
    year: number;
    season: 'main' | 'early' | 'late';
    fallow: boolean;
    crop: string | null;
    also: string[];
    months: string;
    text: string;
  }[];
  two_seasons_note: string | null;
  fit: { crop: string; score: number | null }[];
  notices: string[];
  help: string[];
  watch: string[];
  issues: string[];
  priorities: { key: string; label: string; text: string }[];
  conditions: string[];
  confidence: { level: 'H' | 'M' | 'L' | 'G'; text: string; where: string };
  ask: string;
}
export interface AdvicePage {
  title: string;
  place: Place & {
    zone: string;
    data_from: (Place & { km: number }) | null;
    data_from_text: string | null;
  };
  made: string;
  weather_years: [number | string, number | string] | null;
  intro: string[];
  land: Land;
  rain: Rain;
  told: Lines & { name: string | null; option: string | null };
  choices: { heading: string; notices: string[]; items: Choice[] };
  crops: {
    heading: string;
    intro: string;
    items: { crop: string; score: number | null; reasons: string[]; all_fine: boolean }[];
    caution: string | null;
  };
  measures: { heading: string; intro: string; items: string[] };
  unknown: { heading: string; intro: string; items: string[] };
  print: Lines;
}
export interface Advice {
  advice_id: string;
  language: string;
  language_written: boolean;
  page: AdvicePage;
  text: string;
}
export interface Profile {
  place: Place & { zone: string; data_from: (Place & { km: number }) | null };
  land: Land;
  rain: Rain;
  elevation_m: number | null;
}
export interface Charts {
  suspect_years: number[];
  years_used: number;
  monthly_temperature_c: { month: number; mean: number | null; max: number | null }[] | null;
  monthly_water_mm:
    | {
        month: number;
        rain: number | null;
        reference_evapotranspiration: number | null;
        deficit: number | null;
      }[]
    | null;
  growing_season_by_year:
    { year: number; start: string | null; end: string | null; days: number | null }[] | null;
  units_note: string;
}
export interface ScenarioInput {
  rain_factor: number;
  delay_days: number;
  temp_shift: number;
}
export interface Scenario {
  advice_id: string;
  change: ScenarioInput;
  rain_mm_a_year: number | null;
  mean_temperature_c: number | null;
  growing_season: {
    usual_days: number | null;
    shorter_year_days: number | null;
    start_day: number | null;
    end_day: number | null;
    as_recorded: { usual_days: number | null; shorter_year_days: number | null };
  };
  crops: { crop: string; before: number | null; after: number | null; change: number | null }[];
  lines: string[];
}
export interface Evidence {
  option_id: string;
  card: {
    option_id: string;
    plain_name: string;
    what_it_is: string;
    may_help: string;
    watch_out: string;
    ask: string;
    where_tested: string;
    measured_with: string;
  };
  option: {
    name: string;
    why_suggested: string;
    benefits: string;
    risks_for_local_review: string;
    information_gaps: string;
    who_should_review: string;
    farmer_judgment_note: string;
    overall_confidence: string;
    readiness: string;
    class: string;
    context: string;
    applies_to_region: string;
    pattern: string;
    crops: string;
    earlier_id: string | null;
    carried_from: string | null;
  };
  evidence: {
    evidence_type: string;
    reference: string;
    statement_or_value: string;
    source_id: string;
    confidence: string;
    evidence_id: string;
    locator: string | null;
    quote: string | null;
    direction: string | null;
  }[];
  sources: {
    source_id: string;
    citation: string;
    url: string | null;
    licence_or_terms: string | null;
  }[];
  note: string;
}
export interface GeoFeature {
  type: 'Feature';
  properties: Area & { state: string };
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
}
export interface GeoCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}
