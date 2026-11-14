import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';
import { Seasons } from '@/components/FarmForm';
import Results from '@/components/Results';
import { emptyDraft, toRequest } from '@/lib/model';
import { questions, makeAdvice } from '@/lib/fixtures';
import { Client } from '@/lib/api';
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
