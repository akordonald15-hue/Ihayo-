import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Ihayo from '@/components/Ihayo';
import Results from '@/components/Results';
import { ChartSet, WeatherScenario } from '@/components/Weather';
import { Client, ApiError } from '@/lib/api';
import { questions, makeAdvice } from '@/lib/fixtures';
import { emptyDraft, toRequest } from '@/lib/model';
const body = toRequest(
  {
    ...emptyDraft(),
    state: 'Kaduna',
    lga: 'Kajuru',
    seasons: [['maize']],
    priorities: ['water'],
    answers: {
      irrigated: false,
      striga: true,
      waterlogged: true,
      enough_workers: false,
      easy_seed: null,
      tenure: 'rent',
    },
  },
  questions,
);
const wrap = (node: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      {node}
    </QueryClientProvider>,
  );
describe('complete farmer flow', () => {
  it('keeps unavailable data explicit, rejects and accepts fallback, records fields and renders results', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('backend pending'));
    render(<Ihayo />);
    await user.click(await screen.findByRole('button', { name: 'Explore demonstration' }));
    await screen.findByRole('heading', { name: 'In which state is your farm?' });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Kaduna 2\/3/ }));
    await user.click(await screen.findByRole('button', { name: 'Birnin Gwari No data yet' }));
    await user.click(await screen.findByRole('button', { name: 'Choose another area' }));
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Birnin Gwari No data yet' }));
    await user.click(await screen.findByRole('button', { name: 'Use this area’s data' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Maize' }));
    await user.click(screen.getByRole('button', { name: 'Cowpea (beans)' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: /Make better use of the rain/ }));
    await user.click(screen.getByRole('button', { name: /Build fertility/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByRole('button', { name: 'Not sure' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Not sure' }));
    await user.click(screen.getByRole('button', { name: 'I rent it' }));
    expect(
      screen.getByRole('heading', { name: 'Does this look like your farm?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Get my advice' }));
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
    await screen.findByRole(
      'heading',
      { name: 'Your land. A few choices to talk through.' },
      { timeout: 5000 },
    );
    expect(screen.getByText(/data taken from Kajuru/)).toBeVisible();
    expect(screen.getByText(/Sample warning slot: you reported Striga/)).toBeVisible();
    expect(screen.getByText(/Sample warning slot: you reported waterlogging/)).toBeVisible();
    expect(screen.getByText(/Sample warning slot: you reported limited workers/)).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'See the evidence' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'See the evidence' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('No scientific claim is made by this fixture.');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'See the evidence' })).toHaveFocus(),
    );
  }, 20000);
  it('shows all required result sections in order and leaves warnings visible with one choice', () => {
    const a = makeAdvice(body);
    wrap(
      <Results
        client={new Client(true)}
        advice={a}
        request={body}
        onRefresh={vi.fn()}
        onRestart={vi.fn()}
        onEdit={vi.fn()}
      />,
    );
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings.slice(0, 8)).toEqual([
      'YOUR LAND',
      'RAIN AND THE GROWING SEASON',
      'WHAT YOU TOLD US',
      'YOUR CHOICES',
      'CROPS THAT SUIT THE LAND',
      'WHAT CAN HELP YOUR LAND AND WATER',
      'WHAT WE DO NOT KNOW',
      'SAVE AND PRINT',
    ]);
    expect(screen.getByText(a.page.intro[1])).toBeVisible();
    expect(screen.getByText(a.page.choices.items[0].confidence.text)).toBeVisible();
  });
  it('keeps null or empty chart data readable', () => {
    wrap(
      <ChartSet
        data={{
          suspect_years: [2021],
          years_used: 0,
          monthly_temperature_c: null,
          monthly_water_mm: [],
          growing_season_by_year: null,
          units_note: 'Units supplied by server.',
        }}
      />,
    );
    expect(screen.getAllByText('Not available for this place.')).toHaveLength(3);
    expect(screen.getByText(/These years were left out/)).toBeVisible();
  });
  it('only sends scenario changes after release and debounce; handles no_weather', async () => {
    const c = new Client(true);
    const spy = vi.spyOn(c, 'scenario');
    wrap(
      <WeatherScenario client={c} advice={makeAdvice(body)} request={body} onRefresh={vi.fn()} />,
    );
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const range = screen.getByRole('slider', { name: 'Rain compared with the record' });
    fireEvent.change(range, { target: { value: '0.85' } });
    expect(spy).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(range);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2), { timeout: 1500 });
    expect(spy.mock.calls[1][1].rain_factor).toBe(0.85);
    spy.mockRejectedValueOnce(new ApiError('no_weather', 'No weather record stored.', 409));
    fireEvent.change(range, { target: { value: '0.9' } });
    fireEvent.pointerUp(range);
    await screen.findByText('No weather record stored.');
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  }, 5000);
});
