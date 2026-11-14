import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SiteNavigation from '@/components/SiteNavigation';
import ServiceStatus from '@/components/ServiceStatus';
describe('refined navigation and service status', () => {
  it('opens a labelled navigation dialog and returns focus on Escape', async () => {
    const u = userEvent.setup();
    render(<SiteNavigation />);
    const trigger = screen.getByRole('button', { name: 'Open navigation' });
    await u.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Explore Ihayo' });
    expect(within(dialog).getByRole('link', { name: 'Our approach' })).toBeVisible();
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it('closes after a section link and focuses that section without forcing a return to the header', async () => {
    const u = userEvent.setup();
    render(
      <>
        <SiteNavigation />
        <section id="our-approach">
          <h2>Our approach to evidence</h2>
        </section>
      </>,
    );
    await u.click(screen.getByRole('button', { name: 'Open navigation' }));
    await u.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Our approach' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Our approach to evidence' })).toHaveFocus(),
    );
  });
  it('keeps failure explicit and offers retry without labelling the service ready', async () => {
    const retry = vi.fn();
    const u = userEvent.setup();
    render(
      <ServiceStatus
        ready={false}
        error={new Error('Unavailable')}
        fixture={false}
        onRetry={retry}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Live advice is unavailable. Please try again.',
    );
    expect(screen.queryByText('Your next season starts here')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it('labels sample coverage as demonstration data', () => {
    render(
      <ServiceStatus
        ready
        health={{ status: 'ok', areas: 5, areas_ready: 3, fetching: false, languages: ['en'] }}
        error={null}
        fixture
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Demonstration mode. Sample data only.');
    expect(screen.getByText('3 / 5 areas have data')).toBeVisible();
  });
});
