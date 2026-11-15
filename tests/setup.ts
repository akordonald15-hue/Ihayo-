import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
vi.stubEnv('NEXT_PUBLIC_ENABLE_FIXTURES', 'true');
if (typeof window !== 'undefined') window.scrollTo = vi.fn();
afterEach(() => {
  cleanup();
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  vi.restoreAllMocks();
});
