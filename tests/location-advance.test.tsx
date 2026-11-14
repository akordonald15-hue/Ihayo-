import React from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Ihayo from '@/components/Ihayo';
import { fixtureRequest } from '@/lib/fixtures';
import type { Area } from '@/lib/types';

const originalGeo = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
afterEach(() => {
  if (originalGeo) Object.defineProperty(navigator, 'geolocation', originalGeo);
  else Reflect.deleteProperty(navigator, 'geolocation');
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
async function start(validation?: Promise<Area[]>) {
  let areaCalls = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input).replace(/^.*\/api\/v1/, '');
    let data;
    if (path.includes('/states/Kaduna/areas') && ++areaCalls > 1 && validation)
      data = await validation;
    else data = await fixtureRequest(path);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  render(<Ihayo />);
  const u = userEvent.setup();
  await u.click((await screen.findAllByRole('button', { name: 'Explore your land' }))[0]);
  await screen.findByRole('button', { name: /Kaduna 2\/3/ });
  return u;
}
async function selectKajuru(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByRole('button', { name: /Kaduna 2\/3/ }));
  await u.click(await screen.findByRole('button', { name: 'Kajuru Data available' }));
}
it('waits for fresh validation, announces confirmation and advances once; Back stays editable', async () => {
  const validation = deferred<Area[]>();
  const u = await start(validation.promise);
  await selectKajuru(u);
  expect(screen.getByText('Checking records for your area…')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Maize' })).not.toBeInTheDocument();
  await act(async () => validation.resolve([{ lga: 'Kajuru', ready: true, lat: 10, lon: 7 }]));
  expect(await screen.findByText(/Kajuru, Kaduna confirmed/)).toBeVisible();
  await screen.findByRole('button', { name: 'Maize' }, { timeout: 3000 });
  await u.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  await act(async () => {
    await new Promise((r) => setTimeout(r, 1300));
  });
  expect(screen.getByRole('region', { name: 'Your farm location' })).toHaveTextContent('Kajuru');
  await u.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('button', { name: 'Maize' })).toBeVisible();
}, 10000);
it('ignores stale validation after changing location and requires a complete fresh selection', async () => {
  const validation = deferred<Area[]>();
  const u = await start(validation.promise);
  await selectKajuru(u);
  await u.click(screen.getByRole('button', { name: 'Change location' }));
  await act(async () => validation.resolve([{ lga: 'Kajuru', ready: true, lat: 10, lon: 7 }]));
  expect(screen.getByRole('button', { name: /Kaduna 2\/3/ })).toBeVisible();
  expect(screen.queryByText(/confirmed. Next/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
});
it('Back cancels a pending confirmation and duplicate clicks cannot skip crop history', async () => {
  const u = await start();
  await u.click(screen.getByRole('button', { name: /Kaduna 2\/3/ }));
  const area = await screen.findByRole('button', { name: 'Kajuru Data available' });
  fireEvent.click(area);
  fireEvent.click(area);
  await screen.findByText(/Kajuru, Kaduna confirmed/);
  await u.click(screen.getByRole('button', { name: 'Back' }));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 1300));
  });
  expect(screen.getByRole('heading', { name: /Every season begins/ })).toBeVisible();
  await u.click(screen.getAllByRole('button', { name: 'Explore your land' })[0]);
  expect(screen.getByRole('button', { name: 'Continue' })).toBeVisible();
}, 10000);
it('does not advance when the fresh API says previously available records are unavailable', async () => {
  const u = await start(Promise.resolve([{ lga: 'Kajuru', ready: false, lat: 10, lon: 7 }]));
  await selectKajuru(u);
  expect(await screen.findByRole('button', { name: 'Use this area’s data' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  expect(screen.queryByText(/confirmed. Next/)).not.toBeInTheDocument();
});
it('automatically validates and advances after device location resolves', async () => {
  const u = await start();
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((success: PositionCallback) =>
        success({ coords: { latitude: 10, longitude: 7 } } as GeolocationPosition),
      ),
    },
  });
  await u.click(screen.getByRole('button', { name: 'Use device location' }));
  await u.click(screen.getByRole('button', { name: 'Use my location' }));
  await screen.findByText(/Kajuru, Kaduna confirmed/);
  expect(screen.queryByRole('button', { name: 'Confirm this area' })).not.toBeInTheDocument();
  await screen.findByRole('button', { name: 'Maize' }, { timeout: 3000 });
}, 10000);
it.each([
  [1, /Location permission was not allowed/],
  [2, /We could not use your location/],
  [3, /Finding your location took too long/],
])('gives a recoverable message for geolocation error %s', async (code, message) => {
  const u = await start();
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((_success: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code } as GeolocationPositionError),
      ),
    },
  });
  await u.click(screen.getByRole('button', { name: 'Use device location' }));
  await u.click(screen.getByRole('button', { name: 'Use my location' }));
  expect(await screen.findByText(message)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Choose a state instead' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Maize' })).not.toBeInTheDocument();
});
it('does not navigate after validation fails and lets the farmer change location', async () => {
  const u = await start(Promise.resolve([]));
  await selectKajuru(u);
  expect(await screen.findByText(/We could not confirm this area/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await u.click(screen.getByRole('button', { name: 'Change location' }));
  await waitFor(() => expect(screen.getByRole('button', { name: /Kaduna 2\/3/ })).toBeVisible());
});

it('clears loading when Back cancels slow validation, without accepting its late response', async () => {
  const validation = deferred<Area[]>();
  const u = await start(validation.promise);
  await selectKajuru(u);
  await u.click(screen.getByRole('button', { name: 'Back' }));
  await u.click(screen.getAllByRole('button', { name: 'Explore your land' })[0]);
  expect(screen.queryByText(/Checking records for your area/)).not.toBeInTheDocument();
  expect(screen.getByText('Records not confirmed for this area')).toBeVisible();
  await act(async () => validation.resolve([{ lga: 'Kajuru', ready: true, lat: 10, lon: 7 }]));
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  expect(screen.queryByText(/confirmed. Next/)).not.toBeInTheDocument();
});
