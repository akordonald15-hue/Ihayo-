'use client';
import { ArrowDown, ArrowRight, BookOpen, CloudRain, MapPin, ShieldCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Health, Questions } from '@/lib/types';
import { ui } from '@/lib/copy';
import { Lines } from './shared';
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
        '.editorial-section-heading, .process-editorial article, .ground-copy, .closing-photo > div',
      )
      .forEach((element) => {
        element.classList.add('reveal-ready');
        observer.observe(element);
      });
    return () => observer.disconnect();
  }, []);
  return (
    <main ref={home} id="main" className="editorial-home">
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
          <p className="eyebrow">{ui.heroEyebrow}</p>
          <h1 id="hero-heading" tabIndex={-1}>
            {ui.heroLine1} {ui.heroLine2} <em>{ui.heroLine3}</em>
          </h1>
          <p className="hero-subtitle">{ui.heroSupport}</p>
          <p className="hero-description">{ui.heroDescription}</p>
          <div className="hero-actions">
            {ready ? (
              <button className="button gold-button" onClick={onStart}>
                {ui.exploreLand}
                <ArrowRight size={20} />
              </button>
            ) : error && allowDemo ? (
              <button className="button gold-button" onClick={onDemo}>
                {ui.fixtureStart}
                <ArrowRight size={20} />
              </button>
            ) : (
              <a className="button gold-button" href="#service-status">
                {ui.exploreLand}
                <ArrowRight size={20} />
              </a>
            )}
            <a className="hero-secondary" href="#how-it-works">
              {ui.howItWorks}
              <ArrowDown size={18} />
            </a>
          </div>
          <p className="hero-privacy">
            <ShieldCheck size={17} />
            {fixture ? ui.fixture : ui.privacy}
          </p>
        </div>
        <div className="hero-baseline">
          <p>{ui.footer}</p>
          <span>{ui.heroPlace}</span>
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
      {ready && questions && (
        <div className="server-introduction">
          <Lines values={questions.welcome.split('\n').filter(Boolean)} />
        </div>
      )}
      <section id="how-it-works" className="how-section">
        <div className="editorial-section-heading">
          <p className="eyebrow">{ui.howKicker}</p>
          <h2>
            {ui.howHeading} <em>{ui.howHeadingEnd}</em>
          </h2>
          <p>{ui.howDescription}</p>
        </div>
        <div className="process-editorial">
          {ui.welcomeFeatures.map(([n, title, body], i) => (
            <article key={n}>
              <div className="process-top">
                <span>{n}</span>
                {[<MapPin key="m" />, <CloudRain key="c" />, <BookOpen key="b" />][i]}
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="our-approach" className="ground-section">
        <div className="soil-photograph">
          <img
            src="/images/soil-960.webp"
            width="960"
            height="760"
            loading="lazy"
            alt={ui.soilAlt}
          />
          <span>{ui.photoCreditShort}</span>
        </div>
        <div className="ground-copy">
          <p className="eyebrow">{ui.approachKicker}</p>
          <h2>
            {ui.approachHeading} <em>{ui.approachHeadingEnd}</em>
          </h2>
          <p>{ui.approachBody}</p>
          <div className="principle-lines">
            {ui.principles.map(([title, body], i) => (
              <article key={title}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="agent-note">
            <BookOpen size={20} />
            {ui.welcomeSupport}
          </p>
        </div>
      </section>
      <section className="closing-photo">
        <img src="/images/farmer-close-1280.webp" width="1280" height="720" loading="lazy" alt="" />
        <div>
          <p className="eyebrow">{ui.closingKicker}</p>
          <h2>
            {ui.closingHeading} <em>{ui.tagline}</em>
          </h2>
          {ready && (
            <button className="button gold-button" onClick={onStart}>
              {ui.exploreLand}
              <ArrowRight size={20} />
            </button>
          )}
          <p>{ui.footer}</p>
        </div>
      </section>
      <section id="image-credits" className="image-credits">
        <p>{ui.imageCredits}</p>
        <p>{ui.privacy}</p>
      </section>
    </main>
  );
}
