'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Sprout } from 'lucide-react';
import type { Choice } from '@/lib/types';

export function stepCrops(step: Choice['steps'][number]) {
  return step.fallow
    ? 'Fallow'
    : [step.crop, ...step.also].filter(Boolean).join(' + ') || 'Crop not supplied';
}

function CropPortrait({ choice }: { choice: Choice }) {
  const crop = choice.steps[0]?.crop?.toLowerCase() ?? '';
  const photo = crop === 'maize' ? 'maize' : crop.startsWith('cowpea') ? 'cowpea' : null;
  return (
    <div className="rotation-portrait">
      {photo ? (
        <img src={`/images/${photo}-crop.webp`} width="480" height="320" loading="lazy" alt="" />
      ) : (
        <Sprout size={58} aria-hidden="true" />
      )}
      <span>Illustrative crop imagery</span>
    </div>
  );
}

export function RotationTimeline({ choice }: { choice: Choice }) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, Math.max(0, choice.steps.length - 1));
  const step = choice.steps[index];
  if (!step) return <p>No season sequence was supplied for this pattern.</p>;
  return (
    <div className="interactive-rotation">
      <ol className="rotation-season-strip" aria-label={`Season sequence: ${choice.name}`}>
        {choice.steps.map((s, i) => (
          <li key={i}>
            <button type="button" aria-pressed={i === index} onClick={() => setSelected(i)}>
              <span className="season-number">{s.year}</span>
              <span>
                Year {s.year} / {s.season}
              </span>
              <strong>{stepCrops(s)}</strong>
              {s.months && <span>{s.months}</span>}
            </button>
            <p className="rotation-print-text">{s.text}</p>
          </li>
        ))}
      </ol>
      <div className="season-inspector no-print">
        <p role="status" aria-live="polite" aria-atomic="true">
          <strong>
            Year {step.year} / {step.season}
          </strong>{' '}
          {step.text}
        </p>
        <div className="season-navigation">
          <button
            className="text-button"
            disabled={index === 0}
            onClick={() => setSelected(index - 1)}
            aria-label="Previous season"
          >
            <ArrowLeft size={18} />
            Previous
          </button>
          <span>
            {index + 1} of {choice.steps.length} seasons
          </span>
          <button
            className="text-button"
            disabled={index === choice.steps.length - 1}
            onClick={() => setSelected(index + 1)}
            aria-label="Next season"
          >
            Next
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RotationExplorer({
  choices,
  renderChoice,
}: {
  choices: Choice[];
  renderChoice: (choice: Choice) => ReactNode;
}) {
  const [view, setView] = useState<'overview' | 'detail' | 'compare'>('overview');
  const [active, setActive] = useState(0);
  const [opened, setOpened] = useState<number[]>([]);
  const [comparison, setComparison] = useState<number[]>([]);
  const [selectionMessage, setSelectionMessage] = useState('');
  const [printing, setPrinting] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const comparisonTrigger = useRef<HTMLButtonElement>(null);
  const returnToComparison = useRef(false);
  const navigated = useRef(false);
  const returnIndex = useRef(0);
  const validComparison = comparison.filter((i) => !!choices[i]);
  const current = choices[active];
  useEffect(() => {
    const beforePrint = () => flushSync(() => setPrinting(true));
    const afterPrint = () => setPrinting(false);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);
  useEffect(() => {
    if (!navigated.current) return;
    if (view === 'overview') {
      if (returnToComparison.current) comparisonTrigger.current?.focus();
      else triggers.current[returnIndex.current]?.focus();
    } else {
      title.current?.focus();
      title.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    }
  }, [view, active]);
  const markOpened = (indices: number[]) =>
    setOpened((previous) => [...new Set([...previous, ...indices])]);
  function explore(index: number) {
    navigated.current = true;
    returnToComparison.current = false;
    returnIndex.current = index;
    markOpened([index]);
    setActive(index);
    setView('detail');
  }
  function back() {
    navigated.current = true;
    setView('overview');
  }
  function toggle(index: number) {
    setSelectionMessage('');
    if (comparison.includes(index)) setComparison(comparison.filter((i) => i !== index));
    else if (comparison.length < 2) setComparison([...comparison, index]);
    else setSelectionMessage('Two patterns selected. Remove one before adding another.');
  }
  if (!choices.length)
    return (
      <div className="rotation-empty">
        <Sprout aria-hidden="true" />
        <h3>No rotation options were supplied.</h3>
        <p>
          Try reviewing your answers or asking your extension agent. We will not invent an
          alternative.
        </p>
      </div>
    );
  return (
    <>
      <div className="rotation-experience no-print">
        <div className="rotation-experience-intro">
          <p>Explore the possibilities. Keep the choice yours.</p>
          <p>
            {choices.length} rotation {choices.length === 1 ? 'pattern' : 'patterns'}. Order does
            not mean rank. These are choices to discuss, not instructions to plant.
          </p>
          <div className="exploration-progress">
            <BookOpen size={18} aria-hidden="true" />
            <span role="status" aria-live="polite">
              Opened {opened.length} of {choices.length}{' '}
              {choices.length === 1 ? 'pattern' : 'patterns'}
            </span>
            <div className="exploration-track" aria-hidden="true">
              <span style={{ transform: `scaleX(${opened.length / choices.length})` }} />
            </div>
          </div>
          {opened.length === choices.length && (
            <p className="exploration-complete">
              You have opened every pattern. Review the checks with your extension agent before
              deciding.
            </p>
          )}
        </div>

        {view === 'overview' ? (
          <>
            <div className="rotation-preview-grid">
              {choices.map((c, i) => (
                <article className="rotation-preview" key={`${c.option_id}-${i}`}>
                  <CropPortrait choice={c} />
                  <div className="rotation-preview-body">
                    <span className="rotation-role">{c.role_label}</span>
                    <h3>{c.steps[0] ? stepCrops(c.steps[0]) : 'Next crop not supplied'}</h3>
                    <p className="rotation-pattern-name">{c.name}</p>
                    <p className="rotation-preview-sequence" aria-label="Rotation at a glance">
                      {c.steps.map(stepCrops).join(' → ')}
                    </p>
                    <p className="rotation-evidence-label">
                      Evidence: {c.confidence.text || 'Not supplied'}
                    </p>
                    {c.notices.map((notice, n) => (
                      <p className="notice" key={n}>
                        {notice}
                      </p>
                    ))}
                    <button
                      className="button primary"
                      ref={(el) => {
                        triggers.current[i] = el;
                      }}
                      onClick={() => explore(i)}
                      aria-label={`Explore this pattern: ${c.name}`}
                    >
                      Explore this pattern
                      <ArrowRight size={18} />
                    </button>
                    {choices.length > 1 && (
                      <button
                        className="rotation-compare-toggle"
                        aria-pressed={comparison.includes(i)}
                        onClick={() => toggle(i)}
                        aria-label={`Compare ${c.name}: ${comparison.includes(i) ? 'Selected for comparison' : 'Add to comparison'}`}
                      >
                        <span aria-hidden="true">
                          {comparison.includes(i) ? <Check size={17} /> : '+'}
                        </span>
                        {comparison.includes(i) ? 'Selected for comparison' : 'Add to comparison'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {choices.length > 1 && (
              <div className="rotation-comparison-bar">
                <div>
                  <strong>See two patterns together</strong>
                  <p role="status">
                    {selectionMessage ||
                      `${validComparison.length} of 2 selected. Compare the sequence, evidence and checks.`}
                  </p>
                </div>
                <button
                  className="button secondary"
                  ref={comparisonTrigger}
                  disabled={validComparison.length !== 2}
                  onClick={() => {
                    navigated.current = true;
                    returnToComparison.current = true;
                    markOpened(validComparison);
                    setView('compare');
                  }}
                >
                  Compare selected patterns
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rotation-selected-view">
            <button className="text-button" onClick={back}>
              <ArrowLeft size={18} />
              Back to all patterns
            </button>
            <h3 ref={title} tabIndex={-1} className="rotation-view-heading">
              {view === 'compare' ? 'Compare your patterns' : current?.name}
            </h3>
            {view === 'detail' && current ? (
              <>
                <div className="rotation-detail-navigation">
                  <button
                    className="text-button"
                    disabled={active === 0}
                    onClick={() => explore(active - 1)}
                  >
                    <ArrowLeft size={18} />
                    Previous pattern
                  </button>
                  <span>
                    Pattern {active + 1} of {choices.length}
                  </span>
                  <button
                    className="text-button"
                    disabled={active === choices.length - 1}
                    onClick={() => explore(active + 1)}
                  >
                    Next pattern
                    <ArrowRight size={18} />
                  </button>
                </div>
                <div key={`${current.option_id}-${active}`}>{renderChoice(current)}</div>
              </>
            ) : (
              <>
                <p>
                  These are different patterns, not a ranking. Check both sets of limitations. A fit
                  score is not a harvest forecast.
                </p>
                <div className="rotation-comparison">
                  {validComparison.map((i) => (
                    <div key={i}>{renderChoice(choices[i])}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {printing && (
        <div className="rotation-print-report">
          {choices.map((c, i) => (
            <div key={i}>{renderChoice(c)}</div>
          ))}
        </div>
      )}
    </>
  );
}
