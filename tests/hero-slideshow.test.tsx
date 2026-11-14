import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import HeroSlideshow, { HERO_SCENES } from '@/components/HeroSlideshow';

let motionChanged: () => void;
let media: {
  matches: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};
beforeEach(() => {
  vi.useFakeTimers();
  media = {
    matches: false,
    addEventListener: vi.fn((_event: string, listener: () => void) => {
      motionChanged = listener;
    }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  );
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'hidden');
});
const scene = (index: number) =>
  screen.getByRole('button', { name: `Show scene ${index + 1}: ${HERO_SCENES[index].name}` });
const loaded = (container: HTMLElement, index: number) => {
  const img = container.querySelector(`.scene-${HERO_SCENES[index].id} img`);
  expect(img).not.toBeNull();
  fireEvent.load(img!);
};
const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
it('requests only the first responsive image and waits for it before starting', async () => {
  const { container } = render(<HeroSlideshow />);
  expect(container.querySelectorAll('img')).toHaveLength(1);
  expect(container.querySelector('img')).toHaveAttribute('fetchpriority', 'high');
  expect(container.querySelector('source')).toHaveAttribute('media', '(max-width:600px)');
  await tick(12000);
  expect(scene(0)).toHaveAttribute('aria-pressed', 'true');
  expect(container.querySelectorAll('img')).toHaveLength(1);
  loaded(container, 0);
  await tick(750);
  expect(container.querySelectorAll('img')).toHaveLength(2);
  expect(container.querySelector('.scene-aerial img')).toHaveAttribute('fetchpriority', 'low');
});
it('crossfades through all four ready scenes every six seconds and loops', async () => {
  const { container } = render(<HeroSlideshow />);
  loaded(container, 0);
  for (let next = 1; next <= 3; next++) {
    await tick(750);
    loaded(container, next);
    await tick(5250);
    expect(scene(next)).toHaveAttribute('aria-pressed', 'true');
  }
  await tick(6000);
  expect(scene(0)).toHaveAttribute('aria-pressed', 'true');
  expect(container.querySelectorAll('img')).toHaveLength(4);
  expect(container.querySelector('[aria-hidden="true"]')).toContainElement(
    container.querySelector('img'),
  );
});
it('keeps the current photograph until a manual selection has loaded and restarts timing', async () => {
  const { container } = render(<HeroSlideshow />);
  loaded(container, 0);
  await tick(4000);
  fireEvent.click(scene(2));
  expect(scene(0)).toHaveAttribute('aria-pressed', 'true');
  loaded(container, 2);
  expect(scene(2)).toHaveAttribute('aria-pressed', 'true');
  await tick(750);
  loaded(container, 3);
  await tick(4249);
  expect(scene(2)).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(scene(2));
  await tick(5999);
  expect(scene(2)).toHaveAttribute('aria-pressed', 'true');
  await tick(1);
  expect(scene(3)).toHaveAttribute('aria-pressed', 'true');
});
it('pause and resume preserve the remaining display time', async () => {
  const { container } = render(<HeroSlideshow />);
  loaded(container, 0);
  await tick(750);
  loaded(container, 1);
  await tick(1250);
  fireEvent.click(screen.getByRole('button', { name: 'Pause slideshow' }));
  await tick(20000);
  expect(scene(0)).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('group')).toHaveAttribute('data-running', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Resume slideshow' }));
  await tick(3999);
  expect(scene(0)).toHaveAttribute('aria-pressed', 'true');
  await tick(1);
  expect(scene(1)).toHaveAttribute('aria-pressed', 'true');
});
it('pauses when the document is hidden and resumes without skipping scenes', async () => {
  const { container } = render(<HeroSlideshow />);
  loaded(container, 0);
  await tick(750);
  loaded(container, 1);
  await tick(1250);
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  fireEvent(document, new Event('visibilitychange'));
  await tick(20000);
  expect(scene(0)).toHaveAttribute('aria-pressed', 'true');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  fireEvent(document, new Event('visibilitychange'));
  await tick(4000);
  expect(scene(1)).toHaveAttribute('aria-pressed', 'true');
});
it('reduced motion disables autoplay and speculative loading but allows manual selection', async () => {
  media.matches = true;
  const { container } = render(<HeroSlideshow />);
  loaded(container, 0);
  await tick(30000);
  expect(container.querySelectorAll('img')).toHaveLength(1);
  expect(
    screen.getByRole('button', { name: 'Automatic slideshow disabled for reduced motion' }),
  ).toBeDisabled();
  fireEvent.click(scene(3));
  loaded(container, 3);
  await tick(30000);
  expect(scene(3)).toHaveAttribute('aria-pressed', 'true');
  expect(container.querySelectorAll('img')).toHaveLength(2);
});
it('responds to motion preference changes and releases timers/listeners on unmount', async () => {
  const { container, unmount } = render(<HeroSlideshow />);
  loaded(container, 0);
  await tick(750);
  loaded(container, 1);
  media.matches = true;
  act(() => motionChanged());
  await tick(30000);
  expect(scene(0)).toHaveAttribute('aria-pressed', 'true');
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(media.removeEventListener).toHaveBeenCalledWith('change', motionChanged);
});

it('holds even a manually requested photograph until a hidden tab becomes visible', async () => {
  const { container } = render(<HeroSlideshow />);
  loaded(container, 0);
  fireEvent.click(scene(2));
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  fireEvent(document, new Event('visibilitychange'));
  loaded(container, 2);
  expect(scene(0)).toHaveAttribute('aria-pressed', 'true');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  fireEvent(document, new Event('visibilitychange'));
  expect(scene(2)).toHaveAttribute('aria-pressed', 'true');
});
