import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';
import RotationExplorer, { RotationTimeline, stepCrops } from '@/components/RotationExplorer';
import Results from '@/components/Results';
import { questions, makeAdvice } from '@/lib/fixtures';
import { emptyDraft, toRequest } from '@/lib/model';
import type { Choice } from '@/lib/types';
import { Client } from '@/lib/api';

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
      enough_workers: null,
      easy_seed: true,
      tenure: 'own',
    },
  },
  questions,
);
const advice = makeAdvice(request);
const base = advice.page.choices.items[0];
const choices: Choice[] = ['One', 'Two', 'Three'].map((name, index) => ({
  ...base,
  option_id: String(index),
  name,
  confidence: {
    level: index === 2 ? 'G' : 'M',
    text: index === 2 ? 'Evidence not supplied' : 'Some evidence',
    where: 'Source context unchanged',
  },
  notices: index === 2 ? ['No test measured this exact pattern.'] : [],
}));
const choiceBody = (c: Choice) => (
  <article aria-label={c.name}>
    <h4>{c.name}</h4>
    <p>Full server warnings for {c.name}</p>
    <RotationTimeline choice={c} />
  </article>
);

describe('rotation discovery', () => {
  it('shows every pattern without selecting a winner and counts opened patterns only once', async () => {
    const u = userEvent.setup();
    render(<RotationExplorer choices={choices} renderChoice={choiceBody} />);
    expect(screen.getByText('Opened 0 of 3 patterns')).toBeVisible();
    expect(screen.getByText('No test measured this exact pattern.')).toBeVisible();
    expect(screen.queryByText('Full server warnings for One')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Explore this pattern: One' }));
    expect(screen.getByText('Full server warnings for One')).toBeVisible();
    expect(screen.getByText('Opened 1 of 3 patterns')).toBeVisible();
    await u.click(screen.getByRole('button', { name: 'Back to all patterns' }));
    expect(screen.getByRole('button', { name: 'Explore this pattern: One' })).toHaveFocus();
    await u.click(screen.getByRole('button', { name: 'Explore this pattern: One' }));
    expect(screen.getByText('Opened 1 of 3 patterns')).toBeVisible();
    await u.click(screen.getByRole('button', { name: 'Next pattern' }));
    expect(screen.getByText('Opened 2 of 3 patterns')).toBeVisible();
    expect(screen.getByText('Full server warnings for Two')).toBeVisible();
  });

  it('limits comparison to two, supports replacement, and renders both complete warnings', async () => {
    const u = userEvent.setup();
    render(<RotationExplorer choices={choices} renderChoice={choiceBody} />);
    const compare = screen.getByRole('button', { name: 'Compare selected patterns' });
    expect(compare).toBeDisabled();
    await u.click(screen.getByRole('button', { name: /Compare One:/ }));
    await u.click(screen.getByRole('button', { name: /Compare Two:/ }));
    await u.click(screen.getByRole('button', { name: /Compare Three:/ }));
    expect(screen.getByText(/Two patterns selected. Remove one/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Compare Three:/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await u.click(screen.getByRole('button', { name: /Compare One:/ }));
    await u.click(screen.getByRole('button', { name: /Compare Three:/ }));
    await u.click(compare);
    expect(screen.getByText('Full server warnings for Two')).toBeVisible();
    expect(screen.getByText('Full server warnings for Three')).toBeVisible();
    expect(screen.queryByText('Full server warnings for One')).not.toBeInTheDocument();
    expect(screen.getByText('Opened 2 of 3 patterns')).toBeVisible();
    await u.click(screen.getByRole('button', { name: 'Back to all patterns' }));
    expect(screen.getByRole('button', { name: 'Compare selected patterns' })).toHaveFocus();
  });

  it('handles zero and one option without fabricating alternatives', () => {
    const { rerender } = render(<RotationExplorer choices={[]} renderChoice={choiceBody} />);
    expect(screen.getByText('No rotation options were supplied.')).toBeVisible();
    rerender(<RotationExplorer choices={[choices[0]]} renderChoice={choiceBody} />);
    expect(screen.queryByRole('button', { name: /Compare/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore this pattern: One' })).toBeVisible();
  });

  it('preserves mixed crops, fallow, years, early/late seasons and exact server text', async () => {
    const u = userEvent.setup();
    const c: Choice = {
      ...base,
      steps: [
        {
          year: 1,
          season: 'early',
          crop: 'Maize',
          also: ['Cowpea'],
          fallow: false,
          months: 'May to Aug',
          text: 'Original qualified step text.',
        },
        {
          year: 1,
          season: 'late',
          crop: null,
          also: [],
          fallow: true,
          months: '',
          text: 'Original rest-season text.',
        },
      ],
    };
    render(<RotationTimeline choice={c} />);
    expect(stepCrops(c.steps[0])).toBe('Maize + Cowpea');
    expect(screen.getByRole('status')).toHaveTextContent('Original qualified step text.');
    await u.click(screen.getByRole('button', { name: 'Next season' }));
    expect(screen.getByRole('status')).toHaveTextContent('Year 1 / late');
    expect(screen.getByRole('status')).toHaveTextContent('Original rest-season text.');
    expect(screen.getByRole('button', { name: 'Next season' })).toBeDisabled();
    await u.click(screen.getByRole('button', { name: 'Previous season' }));
    expect(screen.getByRole('status')).toHaveTextContent('Original qualified step text.');
  });

  it('only mounts the complete printable report for printing, then releases it', async () => {
    render(<RotationExplorer choices={choices} renderChoice={choiceBody} />);
    expect(screen.queryByText('Full server warnings for Three')).not.toBeInTheDocument();
    await act(async () => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    expect(screen.getByText('Full server warnings for Three')).toBeInTheDocument();
    await act(async () => {
      window.dispatchEvent(new Event('afterprint'));
    });
    expect(screen.queryByText('Full server warnings for Three')).not.toBeInTheDocument();
  });

  it('has structurally accessible controls and selected detail', async () => {
    const u = userEvent.setup();
    const { container } = render(<RotationExplorer choices={choices} renderChoice={choiceBody} />);
    await u.click(screen.getByRole('button', { name: 'Explore this pattern: One' }));
    const result = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
        'heading-order': { enabled: false },
      },
    });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});

it('defers weather, charts and map requests until opened, and preserves the weather panel on close', async () => {
  const client = new Client(true);
  const scenario = vi.spyOn(client, 'scenario');
  const charts = vi.spyOn(client, 'charts');
  const map = vi.spyOn(client, 'map');
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Results
        client={client}
        advice={advice}
        request={request}
        onRefresh={vi.fn()}
        onRestart={vi.fn()}
        onEdit={vi.fn()}
      />
    </QueryClientProvider>,
  );
  expect(scenario).not.toHaveBeenCalled();
  expect(charts).not.toHaveBeenCalled();
  expect(map).not.toHaveBeenCalled();
  const disclosure = screen.getByText('Try a weather what-if').closest('details')!;
  fireEvent.click(screen.getByText('Try a weather what-if'));
  await waitFor(() => expect(scenario).toHaveBeenCalledTimes(1));
  await within(disclosure).findByRole('slider', { name: 'Rain compared with the record' });
  fireEvent.click(screen.getByText('Try a weather what-if'));
  fireEvent.click(screen.getByText('Try a weather what-if'));
  expect(scenario).toHaveBeenCalledTimes(1);
  expect(charts).not.toHaveBeenCalled();
  expect(map).not.toHaveBeenCalled();
});

it('keeps the selected pattern when an expired advice ID is refreshed with the same options', async () => {
  const u = userEvent.setup();
  const client = new Client(true);
  const queryClient = new QueryClient();
  const view = (id: string) => (
    <QueryClientProvider client={queryClient}>
      <Results
        client={client}
        advice={{ ...advice, advice_id: id }}
        request={request}
        onRefresh={vi.fn()}
        onRestart={vi.fn()}
        onEdit={vi.fn()}
      />
    </QueryClientProvider>
  );
  const { rerender } = render(view('old-session'));
  await u.click(screen.getByRole('button', { name: `Explore this pattern: ${base.name}` }));
  expect(screen.getByText('Opened 1 of 1 pattern')).toBeVisible();
  rerender(view('refreshed-session'));
  expect(screen.getByRole('button', { name: 'Back to all patterns' })).toBeVisible();
  expect(screen.getByText('Opened 1 of 1 pattern')).toBeVisible();
});
