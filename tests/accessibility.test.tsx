import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';
import Results from '@/components/Results';
import { emptyDraft, toRequest } from '@/lib/model';
import { questions, makeAdvice } from '@/lib/fixtures';
import { Client } from '@/lib/api';
import Welcome from '@/components/Welcome';
it('keeps the cinematic welcome structurally accessible and the server welcome readable', async () => {
  const { container } = render(
    <Welcome
      ready
      questions={questions}
      health={{ status: 'ok', areas: 5, areas_ready: 3, fetching: false, languages: ['en'] }}
      error={null}
      fixture
      allowDemo
      onStart={vi.fn()}
      onDemo={vi.fn()}
      onRetry={vi.fn()}
    />,
  );
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Every season begins with a decision.',
  );
  expect(screen.getByText(questions.welcome.split('\n').filter(Boolean)[1])).toBeVisible();
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
it('has no detectable structural accessibility violations in results', async () => {
  const body = toRequest(
    {
      ...emptyDraft(),
      state: 'Kaduna',
      lga: 'Kajuru',
      seasons: [[]],
      priorities: ['water'],
      answers: {
        irrigated: false,
        striga: null,
        waterlogged: null,
        enough_workers: null,
        easy_seed: null,
        tenure: 'own',
      },
    },
    questions,
  );
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <Results
        client={new Client(true)}
        advice={makeAdvice(body)}
        request={body}
        onRefresh={vi.fn()}
        onRestart={vi.fn()}
        onEdit={vi.fn()}
      />
    </QueryClientProvider>,
  );
  await screen.findByText(/This is a what-if, not a forecast/);
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  expect(
    result.violations.map((v) => ({
      id: v.id,
      description: v.description,
      nodes: v.nodes.map((n) => n.html),
    })),
  ).toEqual([]);
});

it('leaves homepage content visible when reduced motion is requested', () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true })),
  );
  const observer = vi.fn();
  vi.stubGlobal('IntersectionObserver', observer);
  try {
    const { container } = render(
      <Welcome
        ready
        questions={questions}
        error={null}
        fixture={false}
        allowDemo={false}
        onStart={vi.fn()}
        onDemo={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(observer).not.toHaveBeenCalled();
    expect(container.querySelectorAll('.reveal-ready')).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
  } finally {
    vi.unstubAllGlobals();
  }
});
