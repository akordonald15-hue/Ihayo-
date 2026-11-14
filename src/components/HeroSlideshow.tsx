'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

export const HERO_SCENES = [
  { id: 'farmer', name: "The farmer's story" },
  { id: 'aerial', name: 'The land from above' },
  { id: 'soil', name: 'The decision begins in the soil' },
  { id: 'shared-decision', name: 'Farming meets technology' },
] as const;
const DISPLAY_MS = 6000;

/** Only the background changes. Timers never touch the hero's content or layout. */
export default function HeroSlideshow() {
  const [active, setActive] = useState(0);
  const [requested, setRequested] = useState([true, false, false, false]);
  const [ready, setReady] = useState([false, false, false, false]);
  const [failed, setFailed] = useState([false, false, false, false]);
  const [target, setTarget] = useState<{ index: number; manual: boolean } | null>(null);
  const [paused, setPaused] = useState(false);
  // Conservative server/first render: no automatic motion before preferences are known.
  const [reduced, setReduced] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [cycle, setCycle] = useState(0);
  const remaining = useRef(DISPLAY_MS);
  const timingVersion = useRef(0);
  const images = useRef<(HTMLImageElement | null)[]>([]);
  const running = !paused && !reduced && !hidden;

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReduced(media?.matches ?? true);
    const syncVisibility = () => setHidden(document.hidden);
    syncMotion();
    syncVisibility();
    media?.addEventListener?.('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      media?.removeEventListener?.('change', syncMotion);
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, []);

  function request(index: number) {
    setRequested((current) =>
      current[index] ? current : current.map((value, i) => i === index || value),
    );
  }
  function loaded(index: number) {
    setReady((current) =>
      current[index] ? current : current.map((value, i) => i === index || value),
    );
  }
  // Cached first images may finish before React attaches load handlers.
  useEffect(() => {
    images.current.forEach((img, i) => {
      if (img?.complete && img.naturalWidth > 0) loaded(i);
    });
  }, [requested]);

  useEffect(() => {
    if (!target || !ready[target.index] || hidden || (!target.manual && !running)) return;
    timingVersion.current++;
    remaining.current = DISPLAY_MS;
    setActive(target.index);
    setTarget(null);
    setCycle((value) => value + 1);
  }, [target, ready, running, hidden]);

  // Mount only the next responsive picture after the current one is ready.
  // Reduced-motion/manual mode does not speculatively fetch the other scenes.
  useEffect(() => {
    if (!running || !ready[active]) return;
    const next = (active + 1) % HERO_SCENES.length;
    if (requested[next] || failed[next]) return;
    const timer = window.setTimeout(() => request(next), 750);
    return () => window.clearTimeout(timer);
  }, [active, ready, requested, running, failed]);

  useEffect(() => {
    if (!running || !ready[active] || target) return;
    const started = performance.now();
    const budget = remaining.current;
    const version = timingVersion.current;
    const timer = window.setTimeout(() => {
      let next = (active + 1) % HERO_SCENES.length;
      while (failed[next] && next !== active) next = (next + 1) % HERO_SCENES.length;
      if (next === active) {
        setPaused(true);
        return;
      }
      request(next);
      setTarget({ index: next, manual: false });
    }, budget);
    return () => {
      window.clearTimeout(timer);
      if (version === timingVersion.current)
        remaining.current = Math.max(0, budget - (performance.now() - started));
    };
  }, [active, ready, running, target, cycle, failed]);

  function select(index: number) {
    timingVersion.current++;
    remaining.current = DISPLAY_MS;
    setCycle((value) => value + 1);
    request(index);
    setTarget(index === active ? null : { index, manual: true });
  }
  function imageFailed(index: number) {
    setFailed((current) => current.map((value, i) => i === index || value));
    setTarget((current) => (current?.index === index ? null : current));
  }
  return (
    <>
      <div className="hero-photograph hero-slideshow" aria-hidden="true">
        {HERO_SCENES.map(
          (scene, index) =>
            requested[index] && (
              <picture
                key={scene.id}
                className={`hero-scene scene-${scene.id}${active === index ? ' is-active' : ''}`}
              >
                <source media="(max-width:600px)" srcSet={`/images/hero/${scene.id}-mobile.webp`} />
                <img
                  ref={(element) => {
                    images.current[index] = element;
                  }}
                  src={`/images/hero/${scene.id}-1672.webp`}
                  srcSet={`/images/hero/${scene.id}-960.webp 960w, /images/hero/${scene.id}-1672.webp 1672w`}
                  sizes="100vw"
                  width="1672"
                  height="941"
                  alt=""
                  fetchPriority={index === 0 ? 'high' : 'low'}
                  loading="eager"
                  decoding="async"
                  onLoad={() => loaded(index)}
                  onError={() => imageFailed(index)}
                />
              </picture>
            ),
        )}
      </div>
      <div
        className="hero-slideshow-controls"
        role="group"
        aria-label="Hero photographic scenes"
        data-running={running && ready[active] && !target}
      >
        {HERO_SCENES.map((scene, index) => (
          <button
            key={scene.id}
            type="button"
            className="hero-scene-button"
            aria-label={`Show scene ${index + 1}: ${scene.name}`}
            aria-pressed={active === index}
            disabled={failed[index]}
            onClick={() => select(index)}
          >
            <span className="hero-progress-track">
              <span
                key={`${index}-${cycle}`}
                className={
                  active === index ? 'hero-progress-fill is-current' : 'hero-progress-fill'
                }
              />
            </span>
          </button>
        ))}
        <button
          type="button"
          className="hero-pause-button"
          disabled={reduced}
          aria-label={
            reduced
              ? 'Automatic slideshow disabled for reduced motion'
              : paused
                ? 'Resume slideshow'
                : 'Pause slideshow'
          }
          onClick={() => setPaused((value) => !value)}
        >
          {paused || reduced ? <Play size={16} /> : <Pause size={16} />}
        </button>
        {failed.some(Boolean) && (
          <span className="sr-only" role="status">
            A photograph is unavailable. Other scenes and the application remain available.
          </span>
        )}
      </div>
    </>
  );
}
