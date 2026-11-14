import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
vi.stubEnv('NEXT_PUBLIC_ENABLE_FIXTURES', 'true');
window.scrollTo = vi.fn();
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});
