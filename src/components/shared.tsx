'use client';
import { ArrowRight, LoaderCircle, TriangleAlert } from 'lucide-react';
import { ui } from '@/lib/copy';
import { brandGeometry as geometry } from '@/lib/brand';
export function BrandMark() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="ihayo-mark">
      <path d={geometry.fields} fill="currentColor" />
      <path d={geometry.seed} className="brand-seed" />
    </svg>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <BrandMark />
      <span className="brand-type">
        <svg
          className="ihayo-wordmark"
          viewBox={`0 0 ${geometry.wordBounds[2]} ${geometry.wordBounds[3]}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d={geometry.wordmark}
            transform={`translate(${-geometry.wordBounds[0]} ${-geometry.wordBounds[1]})`}
          />
        </svg>
        <span className="sr-only">{ui.brand}</span>
        <small>{ui.tagline}</small>
      </span>
    </span>
  );
}
export function Busy({ text = ui.loading }: { text?: string }) {
  return (
    <div className="busy" role="status">
      <LoaderCircle size={22} className="spin" />
      <span>{text}</span>
    </div>
  );
}
export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <TriangleAlert size={22} />
      <div>
        <p>{message}</p>
        {retry && (
          <button className="text-button" onClick={retry}>
            {ui.retry}
            <ArrowRight size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
export function Lines({
  values,
  className = '',
}: {
  values: (string | null | undefined)[] | null | undefined;
  className?: string;
}) {
  return (
    <div className={`lines ${className}`}>
      {(values ?? []).filter(Boolean).map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}
export function Sentences({ values }: { values: string[] | null | undefined }) {
  return values?.length ? (
    <ul className="sentences">
      {values.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  ) : null;
}
export const display = (n: number | null | undefined, digits = 0) =>
  n == null || !Number.isFinite(n)
    ? ui.noNumber
    : n.toLocaleString('en-NG', { maximumFractionDigits: digits });
export function Score({ value }: { value: number | null }) {
  return (
    <div className="score">
      <div className="score-track" aria-hidden="true">
        <span style={{ width: `${value ?? 0}%` }} />
      </div>
      <strong>
        {display(value)}
        {value != null && <small>/100</small>}
      </strong>
    </div>
  );
}
export function Section({
  title,
  children,
  id,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`result-section ${className}`}>
      <h2>{title.replace(/^\d+\.\s*/, '')}</h2>
      {children}
    </section>
  );
}
