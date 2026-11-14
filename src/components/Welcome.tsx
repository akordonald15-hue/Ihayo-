'use client';
import { ArrowDown, ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Health, Questions } from '@/lib/types';
import { ui } from '@/lib/copy';
import { BrandMark, Lines } from './shared';
import FarmLocationSummary from './FarmLocationSummary';
import ServiceStatus from './ServiceStatus';
import HeroSlideshow from './HeroSlideshow';
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
        <HeroSlideshow />
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
      <section className="farming-context" aria-labelledby="farming-context-title">
        <div>
          <p className="chapter">The next planting decision</p>
          <h2 id="farming-context-title">
            What worked last season may not be enough for the next.
          </h2>
          <p>
            Rain changes. Soil needs care. Seed, workers and markets shape what is practical.
            Choosing what to grow means weighing all of these together.
          </p>
        </div>
        <div className="farming-context-details">
          <p className="context-solution">
            Ihayo connects your crop history and priorities with local environmental records and
            agricultural studies. Compare planting options, see the reasons and check what remains
            uncertain.
          </p>
          <dl className="people-ledger">
            <div>
              <dt>For farmers</dt>
              <dd>
                Start with the place you farm and the crops you remember. No account or technical
                knowledge needed.
              </dd>
            </div>
            <div>
              <dt>For extension workers</dt>
              <dd>
                Review the evidence, explore weather changes and save a report to discuss together.
              </dd>
            </div>
          </dl>
        </div>
      </section>
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
                <p>
                  Select your state and LGA. We check the available records and take you to your
                  crop history.
                </p>
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
            <p className="preview-confirmation">Area confirmed. Next: what you grew before.</p>
          </div>
          <figcaption>
            <strong>A maize field in Kajuru</strong>Example journey: choose Kajuru, add maize from
            last season, then compare rotation options and open their evidence with your agent. This
            preview shows the process, not a recommendation for a real farm.
          </figcaption>
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
