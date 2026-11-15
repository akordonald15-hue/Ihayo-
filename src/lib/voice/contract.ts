import type { Advice, AdvicePage } from '@/lib/types';

export const MAX_AUDIO_BYTES = 3_500_000;
export const GUIDE_AUDIO_LIMIT = 25_000_000;
export const MAX_CONTEXT_BYTES = 512_000;
export const MAX_RESPONSE_BYTES = 512_000;
export const MAX_MESSAGE_LENGTH = 8000;
export const MAX_RECORDING_SECONDS = 180;
export const priorityKeys = [
  'nitrogen',
  'pests',
  'water',
  'organic_matter',
  'income',
  'erosion',
  'inputs',
] as const;
export interface VoiceResponse extends Record<string, unknown> {
  confidence: 'complete' | 'partial' | 'unclear';
  state?: string | null;
  lga?: string | null;
  seasons?: string[][] | null;
  priorities?: string[] | null;
  irrigated?: boolean | null;
  striga?: boolean | null;
  waterlogged?: boolean | null;
  enough_workers?: boolean | null;
  easy_seed?: boolean | null;
  tenure?: 'own' | 'rent' | 'borrowed' | null;
  missing?: string[] | null;
  clarifying_question?: string | null;
  advice_error?: string | null;
  advice_page?: unknown;
  advice_id?: string | null;
  advice_text?: string | null;
}
export class VoiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
type Check = (value: unknown) => boolean;
export const isRecord = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
const str: Check = (x) => typeof x === 'string';
const num: Check = (x) => typeof x === 'number' && Number.isFinite(x);
const bool: Check = (x) => typeof x === 'boolean';
const nil =
  (check: Check): Check =>
  (x) =>
    x === null || check(x);
const arr =
  (check: Check): Check =>
  (x) =>
    Array.isArray(x) && x.length <= 1000 && x.every(check);
const obj =
  (shape: Record<string, Check>): Check =>
  (x) =>
    isRecord(x) && Object.entries(shape).every(([key, check]) => check(x[key]));
const one =
  (...values: unknown[]): Check =>
  (x) =>
    values.includes(x);
const strings = arr(str);
const lines = { heading: str, lines: strings };
const phCrops = obj({
  ok: strings,
  low: strings,
  high: strings,
  out_low: strings,
  out_high: strings,
});
const land = obj({
  ...lines,
  elevation_m: nil(num),
  facts: nil(
    obj({
      ph: nil(obj({ value: nil(num), low: nil(num), high: nil(num) })),
      carbon: nil(num),
      texture: nil(str),
      deep_texture: nil(str),
      fcc: nil(str),
      cover: nil(str),
      slope: nil(num),
      ph_crops: phCrops,
    }),
  ),
});
const rain = obj({
  ...lines,
  facts: nil(
    obj({
      rain: nil(num),
      start: nil(str),
      end: nil(str),
      days: nil(num),
      short: nil(num),
      second: nil(num),
      suspect: arr(num),
    }),
  ),
});
const choice = obj({
  option_id: str,
  role: one('existing', 'other'),
  role_label: str,
  name: str,
  what: nil(str),
  steps: arr(
    obj({
      year: num,
      season: one('main', 'early', 'late'),
      fallow: bool,
      crop: nil(str),
      also: strings,
      months: str,
      text: str,
    }),
  ),
  two_seasons_note: nil(str),
  fit: arr(obj({ crop: str, score: nil(num) })),
  notices: strings,
  help: strings,
  watch: strings,
  issues: strings,
  priorities: arr(obj({ key: str, label: str, text: str })),
  conditions: strings,
  confidence: obj({ level: one('H', 'M', 'L', 'G'), text: str, where: str }),
  ask: str,
});
const page = obj({
  title: str,
  place: obj({
    state: str,
    lga: str,
    zone: str,
    data_from: nil(obj({ state: str, lga: str, km: num })),
    data_from_text: nil(str),
  }),
  made: str,
  weather_years: nil((x) => Array.isArray(x) && x.length === 2 && x.every(num)),
  intro: strings,
  land,
  rain,
  told: obj({ ...lines, name: nil(str), option: nil(str) }),
  choices: obj({ heading: str, notices: strings, items: arr(choice) }),
  crops: obj({
    heading: str,
    intro: str,
    items: arr(obj({ crop: str, score: nil(num), reasons: strings, all_fine: bool })),
    caution: nil(str),
  }),
  measures: obj({ heading: str, intro: str, items: strings }),
  unknown: obj({ heading: str, intro: str, items: strings }),
  print: obj(lines),
});
export const isAdvicePage = (value: unknown): value is AdvicePage => page(value);

export function parseVoiceResponse(value: unknown): VoiceResponse {
  const invalid = () =>
    new VoiceError(
      'invalid_response',
      'The conversation service returned information we could not read. Your earlier details are still here.',
    );
  if (!isRecord(value) || !one('complete', 'partial', 'unclear')(value.confidence)) throw invalid();
  for (const key of [
    'state',
    'lga',
    'clarifying_question',
    'advice_error',
    'advice_id',
    'advice_text',
  ])
    if (value[key] != null && !str(value[key])) throw invalid();
  for (const key of ['irrigated', 'striga', 'waterlogged', 'enough_workers', 'easy_seed'])
    if (value[key] != null && !bool(value[key])) throw invalid();
  if (value.seasons != null && !arr(strings)(value.seasons)) throw invalid();
  if (
    value.priorities != null &&
    !(
      Array.isArray(value.priorities) &&
      value.priorities.length <= 3 &&
      value.priorities.every((x) => priorityKeys.includes(x as (typeof priorityKeys)[number]))
    )
  )
    throw invalid();
  if (value.missing != null && !strings(value.missing)) throw invalid();
  if (value.tenure != null && !one('own', 'rent', 'borrowed')(value.tenure)) throw invalid();
  return value as VoiceResponse; // Validated fields; all additional context keys are retained.
}

export function completedVoiceAdvice(response: VoiceResponse): Advice | null {
  if (
    response.confidence !== 'complete' ||
    response.advice_error ||
    !response.state?.trim() ||
    !response.lga?.trim() ||
    !response.seasons?.length ||
    !response.priorities?.length ||
    response.missing?.length ||
    !isAdvicePage(response.advice_page)
  )
    return null;
  if (
    response.advice_page.place.state !== response.state ||
    response.advice_page.place.lga !== response.lga
  )
    return null;
  return {
    advice_id: response.advice_id ?? '',
    language: typeof response.language === 'string' ? response.language : 'en',
    language_written: response.language_written === true,
    page: response.advice_page,
    text: response.advice_text ?? '',
  };
}

export const audioExtension = (mime: string): string | null =>
  ({
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mpeg': 'mp3',
  })[mime.split(';')[0].trim().toLowerCase()] ?? null;
export function validateAudio(audio: Blob) {
  if (!audio.size)
    throw new VoiceError(
      'empty_audio',
      'This recording is empty. Please record again or type instead.',
    );
  if (audio.size > MAX_AUDIO_BYTES)
    throw new VoiceError(
      'too_large',
      'This recording is too large. Please record a shorter message (up to 3.5 MB).',
      413,
    );
  if (!audioExtension(audio.type))
    throw new VoiceError(
      'unsupported_audio',
      'This audio format is not supported. Please record again in a supported browser or type instead.',
      415,
    );
}
export function validateContext(context: unknown) {
  if (context == null) return;
  parseVoiceResponse(context);
  if (new TextEncoder().encode(JSON.stringify(context)).byteLength > MAX_CONTEXT_BYTES)
    throw new VoiceError(
      'context_too_large',
      'This conversation is too large to send. Your details are kept here; you can use the manual form or start a new conversation.',
    );
}
