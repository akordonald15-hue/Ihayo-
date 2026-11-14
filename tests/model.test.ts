import { describe, it, expect, vi } from 'vitest';
import {
  emptyDraft,
  toRequest,
  toggleCrop,
  togglePriority,
  canContinue,
  readSession,
  writeSession,
  safeURL,
} from '@/lib/model';
import { questions } from '@/lib/fixtures';
import type { Draft } from '@/lib/types';
const draft = (): Draft => ({
  ...emptyDraft(),
  state: 'Kaduna',
  lga: 'Kajuru',
  seasons: [['maize'], ['cowpea'], []],
  priorities: ['water', 'nitrogen'],
  answers: {
    irrigated: false,
    striga: null,
    waterlogged: true,
    enough_workers: false,
    easy_seed: null,
    tenure: 'borrowed',
  },
});
describe('farmer answer contract', () => {
  it('preserves newest-first seasons, fallow, ordered priorities, false and real null', () => {
    const r = toRequest(draft(), questions);
    expect(r.seasons).toEqual([['maize'], ['cowpea'], []]);
    expect(r.priorities).toEqual(['water', 'nitrogen']);
    expect(r.striga).toBeNull();
    expect(r.enough_workers).toBe(false);
    expect(r.tenure).toBe('borrowed');
    expect(r.use_data_from).toBeNull();
  });
  it.each([1, 4])('accepts %i seasons with mixed crops and typed names', (n) => {
    const d = draft();
    d.seasons = Array.from({ length: n }, (_, i) =>
      i === 0 ? ['maize', 'cowpea', 'Local crop'] : [],
    );
    expect(toRequest(d, questions).seasons).toHaveLength(n);
  });
  it('does not treat an unanswered season as fallow', () => {
    const d = draft();
    d.seasons = [null];
    expect(canContinue(d, 1)).toBe(false);
    expect(() => toRequest(d, questions)).toThrow();
  });
  it('prevents duplicates and respects the four-crop limit', () => {
    expect(toggleCrop(['maize'], 'MAIZE')).toEqual([]);
    expect(toggleCrop(['a', 'b', 'c', 'd'], 'e')).toHaveLength(4);
    const d = draft();
    d.seasons = [['maize', 'MAIZE']];
    expect(() => toRequest(d, questions)).toThrow();
  });
  it('rejects overlong custom crops and missing field answers', () => {
    const d = draft();
    d.seasons = [['x'.repeat(41)]];
    expect(() => toRequest(d, questions)).toThrow();
    d.seasons = [[]];
    delete d.answers.striga;
    expect(() => toRequest(d, questions)).toThrow();
  });
  it('never silently defaults irrigation or tenure', () => {
    const d = draft();
    d.answers.irrigated = null;
    expect(() => toRequest(d, questions)).toThrow();
    d.answers.irrigated = false;
    d.answers.tenure = null;
    expect(() => toRequest(d, questions)).toThrow();
  });
  it('removes and reselects priorities in tap order', () => {
    let a = togglePriority(['water', 'nitrogen'], 'water');
    a = togglePriority(a, 'water');
    expect(a).toEqual(['nitrogen', 'water']);
    expect(togglePriority(['water', 'nitrogen', 'pests'], 'income')).toEqual([
      'water',
      'nitrogen',
      'pests',
    ]);
  });
  it('includes a data source only after explicit acceptance in state', () => {
    const d = draft();
    expect(toRequest(d, questions).use_data_from).toBeNull();
    d.use_data_from = { state: 'Kaduna', lga: 'Kaduna North' };
    expect(toRequest(d, questions).use_data_from).toEqual(d.use_data_from);
  });
  it('survives blocked or invalid session storage', () => {
    sessionStorage.setItem('broken', '{');
    expect(readSession('broken')).toBeNull();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => writeSession('a', draft())).not.toThrow();
  });
  it('only links safe source URL protocols', () => {
    expect(safeURL('javascript:alert(1)')).toBeNull();
    expect(safeURL('https://example.org/study')).toBe('https://example.org/study');
  });
});
