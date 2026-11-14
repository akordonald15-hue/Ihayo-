import { describe, it, expect, vi } from 'vitest';
import { ApiError, Client } from '@/lib/api';
import { makeAdvice, questions } from '@/lib/fixtures';
import { emptyDraft, toRequest } from '@/lib/model';
const request = toRequest(
  {
    ...emptyDraft(),
    state: 'Kaduna',
    lga: 'Kajuru',
    seasons: [['maize']],
    priorities: ['water'],
    answers: {
      irrigated: false,
      striga: null,
      waterlogged: false,
      enough_workers: true,
      easy_seed: null,
      tenure: 'own',
    },
  },
  questions,
);
const json = (x: unknown, status = 200) =>
  new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } });
describe('typed API and recovery', () => {
  it('only sends documented place query parameters, even when passed a full farm draft', async () => {
    const transport = vi.fn().mockImplementation(() => Promise.resolve(json({})));
    const c = new Client(false, transport);
    await c.profile({ ...request }, null);
    const url = new URL(transport.mock.calls[0][0], 'https://example.org');
    expect([...url.searchParams.keys()]).toEqual(['state', 'lga', 'language']);
  });
  it('uses documented paths, encoded state names and JSON null', async () => {
    const transport = vi.fn().mockImplementation(() => Promise.resolve(json([])));
    const c = new Client(false, transport);
    await c.areas('Federal Capital Territory');
    expect(transport.mock.calls[0][0]).toContain(
      '/places/states/Federal%20Capital%20Territory/areas',
    );
    await c.advice(request);
    expect(JSON.parse(transport.mock.calls[1][1].body).striga).toBeNull();
  });
  it.each([
    ['no_data', 409],
    ['no_data_anywhere', 409],
    ['no_weather', 409],
    ['unknown_place', 404],
    ['data_from_not_ready', 422],
    ['bad_priorities', 422],
    ['validation_error', 422],
    ['internal_error', 500],
  ])('preserves %s message and details', async (code, status) => {
    const c = new Client(
      false,
      vi.fn().mockResolvedValue(
        json(
          {
            error: {
              code,
              message: 'Server sentence unchanged.',
              nearest: null,
              fields: [{ where: 'seasons', problem: 'Check it' }],
            },
          },
          Number(status),
        ),
      ),
    );
    await expect(c.health()).rejects.toMatchObject({
      code,
      status,
      message: 'Server sentence unchanged.',
      details: { nearest: null },
    });
  });
  it('turns network failure into a retryable plain message', async () => {
    const c = new Client(false, vi.fn().mockRejectedValue(new TypeError('fetch')));
    await expect(c.health()).rejects.toMatchObject({ code: 'network_error', status: 0 });
  });
  it('allows advice to run beyond 60 seconds', async () => {
    vi.useFakeTimers();
    const transport = vi
      .fn()
      .mockImplementation(
        () => new Promise((r) => setTimeout(() => r(json(makeAdvice(request))), 65000)),
      );
    const promise = new Client(false, transport).advice(request);
    await vi.advanceTimersByTimeAsync(65000);
    await expect(promise).resolves.toHaveProperty('advice_id');
    vi.useRealTimers();
  });
  it('reposts the full saved request after expiry, retries the action once', async () => {
    const fresh = { ...makeAdvice(request), advice_id: 'fresh' };
    const c = new Client(false, vi.fn().mockResolvedValue(json(fresh)));
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('advice_expired', 'Expired.', 410))
      .mockResolvedValueOnce('charts');
    const refresh = vi.fn();
    expect(await c.withRecovery(makeAdvice(request), request, operation, refresh)).toBe('charts');
    expect(refresh).toHaveBeenCalledWith(fresh);
    expect(operation).toHaveBeenLastCalledWith('fresh');
  });
  it('does not loop forever if refreshed advice expires again', async () => {
    const c = new Client(false, vi.fn().mockResolvedValue(json(makeAdvice(request))));
    const operation = vi.fn().mockRejectedValue(new ApiError('advice_expired', 'Expired.', 410));
    await expect(
      c.withRecovery(makeAdvice(request), request, operation, vi.fn()),
    ).rejects.toHaveProperty('code', 'advice_expired');
    expect(operation).toHaveBeenCalledTimes(2);
  });
  it('downloads the server blob with its supplied filename', async () => {
    const c = new Client(
      false,
      vi.fn().mockResolvedValue(
        new Response('Exact report', {
          headers: {
            'Content-Disposition': 'attachment; filename="farm-agent-report-Kajuru.md"',
          },
        }),
      ),
    );
    const result = await c.download('abc', 'agent-report', makeAdvice(request));
    expect(result.filename).toBe('farm-agent-report-Kajuru.md');
    expect(result.blob.size).toBeGreaterThan(0);
  });
});
