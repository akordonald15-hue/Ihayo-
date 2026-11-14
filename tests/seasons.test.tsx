import React, { useState } from 'react';
import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Seasons } from '@/components/FarmForm';
import { emptyDraft } from '@/lib/model';
import { questions } from '@/lib/fixtures';
function History() {
  const [d, set] = useState(emptyDraft);
  return (
    <>
      <Seasons q={questions} draft={d} update={(p) => set((x) => ({ ...x, ...p }))} />
      <output aria-label="Saved answers">{JSON.stringify(d.seasons)}</output>
    </>
  );
}
it('makes fallow exclusive, resets an empty selection to unanswered, and rejects duplicate custom crops', async () => {
  const u = userEvent.setup();
  render(<History />);
  await u.click(screen.getByRole('button', { name: 'Maize' }));
  await u.click(screen.getByRole('button', { name: 'Cowpea (beans)' }));
  await u.click(screen.getByRole('button', { name: questions.fallow.label }));
  expect(screen.getByLabelText('Saved answers')).toHaveTextContent('[[]]');
  await u.click(screen.getByRole('button', { name: 'Maize' }));
  await u.click(screen.getByRole('button', { name: 'Maize' }));
  expect(screen.getByLabelText('Saved answers')).toHaveTextContent('[null]');
  await u.click(screen.getByRole('button', { name: 'Maize' }));
  await u.click(screen.getByRole('button', { name: questions.other.label }));
  await u.type(screen.getByLabelText(questions.other.text), 'MAIZE');
  await u.click(screen.getByRole('button', { name: 'Add crop' }));
  expect(screen.getByRole('alert')).toBeVisible();
  await u.clear(screen.getByLabelText(questions.other.text));
  await u.type(screen.getByLabelText(questions.other.text), 'Local leaf');
  await u.click(screen.getByRole('button', { name: 'Add crop' }));
  expect(screen.getByLabelText('Saved answers')).toHaveTextContent('[["maize","Local leaf"]]');
  await u.click(screen.getByRole('button', { name: '4' }));
  expect(screen.getByLabelText('Saved answers')).toHaveTextContent(
    '[["maize","Local leaf"],null,null,null]',
  );
});
