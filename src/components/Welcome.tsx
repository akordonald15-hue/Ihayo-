'use client';
import { ArrowDown, ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Health, Questions } from '@/lib/types';
import { ui } from '@/lib/copy';
import { BrandMark, Lines } from './shared';
import FarmLocationSummary from './FarmLocationSummary';
import ServiceStatus from './ServiceStatus';
export default function Welcome({
  ready,
  questions,
  health,
  error,
  fixture,
  allowDemo,
  onStart,
  onDemo,
  onRetry,
}: {
  ready: boolean;
  questions?: Questions;
  health?: Health;
  error: Error | null;
  fixture: boolean;
  allowDemo: boolean;
  onStart: () => void;
  onDemo: () => void;
  onRetry: () => void;
}) {
  const home = useRef<HTMLElement>(null);
  useEffect(() => {
    if (
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    home.current
      ?.querySelectorAll(
        '.experience-copy, .journey-preview, .evidence-story-copy, .begin-section > div',
      )
      .forEach((element) => {
        element.classList.add('reveal-ready');
        observer.observe(element);
      });
    return () => observer.disconnect();
  }, []);
  const begin = (className = 'button gold-button') =>
    ready ? (
      <button className={className} onClick={onStart}>
        {ui.exploreLand}
        <ArrowRight size={20} />
      </button>
    ) : error && allowDemo ? (
      <button className={className} onClick={onDemo}>
        {ui.fixtureStart}
        <ArrowRight size={20} />
      </button>
    ) : (
      <a className={className} href="#service-status">
        {ui.exploreLand}
        <ArrowRight size={20} />
      </a>
    );
  return (
    <main ref={home} id="main" className="editorial-home landing-v2">
      <section className="cinema-hero" aria-labelledby="hero-heading">
        <picture className="hero-photograph">
          <source media="(max-width:600px)" srcSet="/images/farmer-mobile.webp" />
          <img
            src="/images/farmer-1680.webp"
            srcSet="/images/farmer-960.webp 960w, /images/farmer-1680.webp 1680w"
            sizes="100vw"
            width="1672"
            height="941"
            alt={ui.photoAlt}
            fetchPriority="high"
          />
        </picture>
        <div className="hero-shade" />
        <div className="cinema-content">
          <p className="eyebrow">Crop rotation, with perspective.</p>
          <h1 id="hero-heading" tabIndex={-1}>
            {ui.heroLine1} {ui.heroLine2} <em>{ui.heroLine3}</em>
          </h1>
          <p className="hero-description">
            Explore what to grow next, with your farm’s history and the evidence in view.
          </p>
          <div className="hero-actions">
            {begin()}
            <a className="hero-secondary" href="#how-it-works">
              See the experience
              <ArrowDown size={18} />
            </a>
          </div>
          <p className="hero-privacy">
            <ShieldCheck size={17} />
            {fixture ? ui.fixture : ui.privacy}
          </p>
        </div>
        <div className="hero-baseline">
          <span>For Nigerian farmers &amp; extension agents</span>
          <a href="#image-credits">
            {ui.photoCreditShort}
            <ArrowRight size={14} />
          </a>
        </div>
      </section>
      <ServiceStatus
        ready={ready}
        health={health}
        error={error}
        fixture={fixture}
        onRetry={onRetry}
      />
      <section id="how-it-works" className="experience-section">
        <div className="experience-copy">
          <p className="chapter">
            <span>01</span>Your experience
          </p>
          <h2>Your field is the starting point.</h2>
          <p>You know what grew, what changed, and what matters. Ihayo starts there.</p>
          <ol className="experience-steps">
            <li>
              <span>01</span>
              <div>
                <h3>Choose your area.</h3>
                <p>Select your state and LGA. See whether local records are available.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Look back at your seasons.</h3>
                <p>Add your crops, your priorities, and a few details about the field.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Consider what comes next.</h3>
                <p>
                  Compare rotation choices, open the evidence, and discuss the limits with your
                  agent.
                </p>
              </div>
            </li>
          </ol>
        </div>
        <figure className="journey-preview">
          <div className="preview-top">
            <BrandMark />
            <span>IHAYO / YOUR FARM</span>
            <span>01 of 05</span>
          </div>
          <div className="preview-body">
            <p className="preview-step-label">Your place</p>
            <h3>Where is your farm?</h3>
            <FarmLocationSummary
              headingAs="h4"
              place={{ state: 'Kaduna', lga: 'Kajuru' }}
              availability="Checked after area selection"
            />
            <div className="preview-next" aria-hidden="true">
              Continue
              <ArrowRight size={18} />
            </div>
          </div>
          <figcaption>Interface preview. Example location; no farm advice is shown.</figcaption>
        </figure>
      </section>
      {ready && questions && (
        <aside className="welcome-context">
          <Lines values={questions.welcome.split('\n').filter(Boolean)} />
        </aside>
      )}
      <section id="our-approach" className="evidence-story">
        <div className="evidence-photograph">
          <img
            src="/images/soil-960.webp"
            width="960"
            height="760"
            loading="lazy"
            alt={ui.soilAlt}
          />
          <span>{ui.photoCreditShort}</span>
        </div>
        <div className="evidence-story-copy">
          <p className="chapter">
            <span>02</span>A wider view
          </p>
          <h2>More context. A clearer conversation.</h2>
          <p>
            Environmental records describe the area. Agricultural studies explain possibilities and
            trade-offs. Your judgement connects them to your field.
          </p>
          <dl className="source-ledger">
            <div>
              <dt>Climate</dt>
              <dd>
                <strong>NASA POWER</strong>
                <span>Rainfall, temperature, and the growing season.</span>
              </dd>
            </div>
            <div>
              <dt>Ground</dt>
              <dd>
                <strong>iSDAsoil &amp; NASADEM</strong>
                <span>Modelled soil properties and terrain.</span>
              </dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>
                <strong>Published agricultural studies</strong>
                <span>Reasons, uncertainties, and sources you can open.</span>
              </dd>
            </div>
          </dl>
          <p className="evidence-limit">
            <BookOpen size={20} />
            These records are not measurements of your field. Discuss every choice with your
            extension agent.
          </p>
        </div>
      </section>
      <section className="begin-section">
        <div>
          <p className="chapter">
            <span>03</span>Your next season
          </p>
          <h2>Start with what you know.</h2>
          <p>A place, a crop history, and the questions that matter to you.</p>
        </div>
        <div className="begin-action">
          {begin()}
          <span>No account needed.</span>
        </div>
      </section>
      <section id="image-credits" className="image-credits">
        <p>{ui.imageCredits}</p>
      </section>
    </main>
  );
}
