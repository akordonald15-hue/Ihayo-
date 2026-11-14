'use client';
import { RefreshCw } from 'lucide-react';
import { ui } from '@/lib/copy';
import type { Health } from '@/lib/types';
export default function ServiceStatus({
  ready,
  health,
  error,
  fixture,
  onRetry,
}: {
  ready: boolean;
  health?: Health;
  error: Error | null;
  fixture: boolean;
  onRetry: () => void;
}) {
  const waiting = !ready && !error;
  return (
    <section
      id="service-status"
      className={`service-status-strip ${error ? 'is-unavailable' : ''}`}
      aria-label={ui.serviceStatus}
    >
      <div className="service-status-message" role="status">
        <span className={`service-dot ${error ? 'offline' : ''}`} aria-hidden="true" />
        <span>
          {fixture
            ? ui.demoStatus
            : error
              ? ui.unavailable
              : waiting
                ? ui.loading
                : ui.serviceReady}
        </span>
      </div>
      <div className="service-status-actions">
        {health && (
          <span className="service-coverage">
            {health.areas_ready} / {health.areas} {ui.serviceCoverage}
          </span>
        )}
        {error && (
          <button className="text-button" onClick={onRetry}>
            <RefreshCw size={16} />
            {ui.retry}
          </button>
        )}
      </div>
    </section>
  );
}
