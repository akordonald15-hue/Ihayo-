/** Explicit live integration smoke test. Sends synthetic farm answers, never fixtures. */
import assert from 'node:assert/strict';
const base =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://nasa-api-miva-pulsars.duckdns.org/api/v1';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3001';
const results = [];
async function call(path, body, expected = 200, raw = false) {
  const start = performance.now();
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Origin: origin,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(90000),
  });
  assert.equal(response.status, expected, path);
  assert.ok(
    ['*', origin].includes(response.headers.get('access-control-allow-origin')),
    `CORS: ${path}`,
  );
  results.push({ path, status: response.status, ms: Math.round(performance.now() - start) });
  return raw ? response : response.json();
}
const health = await call('/health');
assert.equal(health.status, 'ok');
const questions = await call('/meta/questions?language=en');
assert.ok(questions.crops.length);
assert.ok((await call('/places/states')).length);
assert.ok((await call('/places/states/Kaduna/areas')).some((a) => a.lga === 'Kajuru' && a.ready));
assert.ok((await call('/places/search?q=Kajuru')).length);
await call('/places/locate?lat=10.52&lon=7.44');
await call('/places/profile?state=Kaduna&lga=Kajuru');
assert.equal((await call('/map/states/Kaduna')).type, 'FeatureCollection');
const request = {
  state: 'Kaduna',
  lga: 'Kajuru',
  seasons: [['maize']],
  priorities: ['water'],
  irrigated: false,
  striga: null,
  waterlogged: false,
  enough_workers: true,
  easy_seed: null,
  tenure: 'own',
  use_data_from: null,
  language: 'en',
};
const advice = await call('/advice', request);
assert.ok(advice.advice_id && advice.page.choices.items.length);
const path = '/advice/' + encodeURIComponent(advice.advice_id);
assert.equal((await call(path)).advice_id, advice.advice_id);
await call(path + '/charts');
const scenario = await call(path + '/scenario', {
  rain_factor: 0.85,
  delay_days: 14,
  temp_shift: 1,
});
assert.ok(scenario.lines.length && scenario.crops.length);
for (const choice of advice.page.choices.items)
  await call('/evidence/' + encodeURIComponent(choice.option_id));
for (const kind of ['text', 'agent-report']) {
  const response = await call(path + '/' + kind + '?download=true', undefined, 200, true);
  assert.match(response.headers.get('content-disposition') || '', /attachment; filename=/);
  assert.ok((await response.text()).length > 100);
}
assert.equal((await call('/places/search?q=x', undefined, 422)).error.code, 'search_too_short');
assert.equal(
  (await call('/advice/ihayo-expired-smoke', undefined, 410)).error.code,
  'advice_expired',
);
assert.equal(
  (await call('/advice', { ...request, seasons: [], priorities: [] }, 422)).error.code,
  'validation_error',
);
await call(path + '/scenario', { rain_factor: 9 }, 422);
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      origin,
      coverage: health.areas_ready + '/' + health.areas,
      results,
    },
    null,
    2,
  ),
);
