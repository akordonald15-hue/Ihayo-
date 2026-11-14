import React, { useState } from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlaceForm } from '@/components/FarmForm';
import { Client } from '@/lib/api';
import { emptyDraft } from '@/lib/model';
import type { Draft, Place } from '@/lib/types';
const states = [
  { state: 'Kaduna', areas: 2, areas_ready: 1 },
  { state: 'Lagos', areas: 1, areas_ready: 1 },
];
function setup(initial?: Partial<Draft>) {
  const client = new Client();
  vi.spyOn(client, 'areas').mockImplementation(async (state) =>
    state === 'Kaduna'
      ? [
          { lga: 'Kajuru', ready: true, lat: 10, lon: 7 },
          { lga: 'Birnin Gwari', ready: false, lat: 10, lon: 7 },
        ]
      : [{ lga: 'Ikeja', ready: true, lat: 6, lon: 3 }],
  );
  const selected = vi.fn();
  function Harness() {
    const [draft, setDraft] = useState({ ...emptyDraft(), ...initial });
    const [ready, setReady] = useState(!!initial?.lga);
    return (
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <PlaceForm
          client={client}
          states={states}
          draft={draft}
          locationReady={ready}
          pending={false}
          choose={async (place: Place, available) => {
            selected(place, available);
            setDraft((d) => ({ ...d, ...place, use_data_from: null }));
            setReady(available);
          }}
          update={(patch) => {
            setDraft((d) => ({ ...d, ...patch }));
            setReady(false);
          }}
          onError={vi.fn()}
          stateQuestion="Choose a state"
          areaQuestion={`Choose an LGA in ${draft.state}`}
        />
      </QueryClientProvider>
    );
  }
  const view = render(<Harness />);
  return { client, selected, ...view };
}
it('shows one selector at a time and preserves selection as a confirmation on return', async () => {
  const u = userEvent.setup();
  const view = setup();
  expect(screen.getAllByRole('textbox')).toHaveLength(1);
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  await u.click(screen.getByRole('button', { name: /Kaduna 1\/2/ }));
  expect(screen.queryByRole('button', { name: /Lagos 1\/1/ })).not.toBeInTheDocument();
  await u.click(await screen.findByRole('button', { name: 'Kajuru Data available' }));
  expect(screen.getByRole('region', { name: 'Your farm location' })).toHaveTextContent('Kaduna');
  expect(screen.getByRole('region', { name: 'Your farm location' })).toHaveTextContent('Kajuru');
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(view.selected).toHaveBeenCalledWith({ state: 'Kaduna', lga: 'Kajuru' }, true);
  view.unmount();
  setup({ state: 'Kaduna', lga: 'Kajuru' });
  expect(screen.getByRole('region', { name: 'Your farm location' })).toBeVisible();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
it('changing state clears the old LGA and loads only the new state areas', async () => {
  const u = userEvent.setup();
  setup({ state: 'Kaduna', lga: 'Kajuru' });
  await u.click(screen.getByRole('button', { name: 'Change location' }));
  await u.click(screen.getByRole('button', { name: /Lagos 1\/1/ }));
  expect(screen.queryByText('Kajuru')).not.toBeInTheDocument();
  await u.click(await screen.findByRole('button', { name: 'Ikeja Data available' }));
  expect(screen.getByRole('region', { name: 'Your farm location' })).toHaveTextContent('Lagos');
  expect(screen.getByRole('region', { name: 'Your farm location' })).toHaveTextContent('Ikeja');
});
it('keeps unavailable data unconfirmed and search isolated from the primary selector', async () => {
  const u = userEvent.setup();
  const { client } = setup();
  await u.click(screen.getByRole('button', { name: /Kaduna 1\/2/ }));
  await u.click(await screen.findByRole('button', { name: 'Birnin Gwari No data yet' }));
  expect(screen.getByText('Not available for this area')).toBeVisible();
  await u.click(screen.getByRole('button', { name: 'Change location' }));
  vi.spyOn(client, 'search').mockResolvedValue([
    { state: 'Kaduna', lga: 'Kajuru', ready: true, zone: 'North West' },
  ]);
  await u.click(screen.getByRole('button', { name: 'Search by area name' }));
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  await u.type(screen.getByRole('searchbox'), 'Kajuru');
  await u.click(await screen.findByRole('button', { name: 'Kajuru, Kaduna Data available' }));
  expect(screen.getByRole('region', { name: 'Your farm location' })).toHaveTextContent('Kajuru');
});
it('selects resolved geolocation automatically and ignores a late response after changing method', async () => {
  const u = userEvent.setup();
  const { client } = setup();
  const locate = vi.spyOn(client, 'locate').mockResolvedValue({
    state: 'Kaduna',
    lga: 'Kajuru',
    ready: true,
    zone: 'North West',
    lat: 10,
    lon: 7,
    nearest_ready: null,
  });
  const callbacks: PositionCallback[] = [];
  const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: vi.fn((success: PositionCallback) => callbacks.push(success)) },
  });
  try {
    await u.click(screen.getByRole('button', { name: 'Use device location' }));
    await u.click(screen.getByRole('button', { name: 'Use my location' }));
    await act(async () =>
      callbacks[0]({ coords: { latitude: 10, longitude: 7 } } as GeolocationPosition),
    );
    expect(screen.getByRole('region', { name: 'Your farm location' })).toHaveTextContent('Kajuru');
    await u.click(screen.getByRole('button', { name: 'Change location' }));
    await u.click(screen.getByRole('button', { name: 'Use device location' }));
    await u.click(screen.getByRole('button', { name: 'Use my location' }));
    await u.click(screen.getByRole('button', { name: 'Choose a state instead' }));
    await act(async () =>
      callbacks[1]({ coords: { latitude: 10, longitude: 7 } } as GeolocationPosition),
    );
    await waitFor(() => expect(locate).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: 'Confirm this area' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choose a state' })).toBeVisible();
  } finally {
    if (original) Object.defineProperty(navigator, 'geolocation', original);
    else Reflect.deleteProperty(navigator, 'geolocation');
  }
});
