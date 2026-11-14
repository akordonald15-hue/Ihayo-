import { AdviceRequest, Draft, fieldKeys, Questions } from './types';
export const emptyDraft = (): Draft => ({
  state: '',
  lga: '',
  seasons: [null],
  priorities: [],
  answers: {},
  use_data_from: null,
});
export const sameCrop = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
export function toggleCrop(current: string[] | null, crop: string, max = 4) {
  const values = current ?? [];
  return values.some((x) => sameCrop(x, crop))
    ? values.filter((x) => !sameCrop(x, crop))
    : values.length < max
      ? [...values, crop]
      : values;
}
export function togglePriority(current: string[], key: string, max = 3) {
  return current.includes(key)
    ? current.filter((x) => x !== key)
    : current.length < max
      ? [...current, key]
      : current;
}
export function canContinue(d: Draft, step: number) {
  if (step === 0) return !!(d.state && d.lga);
  if (step === 1) return d.seasons.length >= 1 && d.seasons.every((x) => x !== null);
  if (step === 2) return d.priorities.length > 0;
  return true;
}
export function toRequest(d: Draft, q: Questions): AdviceRequest {
  if (
    !canContinue(d, 0) ||
    !canContinue(d, 1) ||
    !canContinue(d, 2) ||
    d.seasons.length > q.limits.seasons ||
    d.priorities.length > q.limits.priorities ||
    fieldKeys.some((k) => !(k in d.answers))
  )
    throw new Error('Please complete every answer.');
  for (const season of d.seasons) {
    if (
      !season ||
      season.length > q.limits.crops_per_season ||
      season.some((x) => !x.trim() || x.length > 40) ||
      new Set(season.map((x) => x.toLowerCase())).size !== season.length
    )
      throw new Error('Please check your crops.');
  }
  if (
    typeof d.answers.irrigated !== 'boolean' ||
    !['own', 'rent', 'borrowed'].includes(String(d.answers.tenure))
  )
    throw new Error('Please check your field answers.');
  for (const k of ['striga', 'waterlogged', 'enough_workers', 'easy_seed'] as const) {
    if (d.answers[k] !== null && typeof d.answers[k] !== 'boolean')
      throw new Error('Please check your field answers.');
  }
  const allowed = q.steps.find((s) => s.field === 'priorities')?.options?.map((o) => o.key) ?? [];
  if (
    new Set(d.priorities).size !== d.priorities.length ||
    d.priorities.some((p) => !allowed.includes(p))
  )
    throw new Error('Please check your priorities.');
  return {
    state: d.state,
    lga: d.lga,
    seasons: d.seasons as string[][],
    priorities: d.priorities,
    irrigated: d.answers.irrigated,
    striga: d.answers.striga as boolean | null,
    waterlogged: d.answers.waterlogged as boolean | null,
    enough_workers: d.answers.enough_workers as boolean | null,
    easy_seed: d.answers.easy_seed as boolean | null,
    tenure: d.answers.tenure as AdviceRequest['tenure'],
    use_data_from: d.use_data_from,
    language: 'en',
  };
}
export function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function writeSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be blocked. State remains usable. */
  }
}
export const safeURL = (url: string | null | undefined) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
};
