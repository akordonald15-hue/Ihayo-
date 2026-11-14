'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CloudRain,
  Leaf,
  Plus,
  Sprout,
  Sun,
  Wheat,
} from 'lucide-react';
import { ApiError, Client, fixturesEnabled } from '@/lib/api';
import {
  canContinue,
  emptyDraft,
  readSession,
  toRequest,
  togglePriority,
  writeSession,
} from '@/lib/model';
import type { Advice, AdviceRequest, Draft, Nearest, Place } from '@/lib/types';
import { fieldKeys } from '@/lib/types';
import { ui } from '@/lib/copy';
import { Brand, BrandMark, Busy, ErrorBox } from './shared';
import SiteNavigation from './SiteNavigation';
import { PlaceForm, ProfileCard, Review, Seasons } from './FarmForm';
import Welcome from './Welcome';
import Results from './Results';
export default function Ihayo() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 600000 } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <Experience />
    </QueryClientProvider>
  );
}
function Experience() {
  const [fixture, setFixture] = useState(false);
  const client = useMemo(() => new Client(fixture), [fixture]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [screen, setScreen] = useState<'welcome' | 'form' | 'working' | 'results'>('welcome');
  const [step, setStep] = useState(0);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [request, setRequest] = useState<AdviceRequest | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ where: string; problem: string }[]>([]);
  const [nearest, setNearest] = useState<Nearest | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [locationConfirmation, setLocationConfirmation] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const submitting = useRef(false);
  const selectionVersion = useRef(0);
  const heading = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      selectionVersion.current++;
    },
    [],
  );
  const health = useQuery({
    queryKey: ['health', fixture],
    queryFn: () => client.health(),
    retry: false,
  });
  const questions = useQuery({
    queryKey: ['questions', fixture],
    queryFn: () => client.questions(),
    enabled: !!health.data,
    retry: false,
  });
  const states = useQuery({
    queryKey: ['states', fixture],
    queryFn: () => client.states(),
    enabled: !!health.data,
    retry: false,
  });
  const q = questions.data;
  useEffect(() => {
    const saved = readSession<{
      draft: Draft;
      fixture: boolean;
      step: number;
      screen: string;
      request: AdviceRequest | null;
      advice: Advice | null;
      locationReady: boolean;
    }>('ihayo-session-v1');
    if (
      saved?.draft &&
      (!saved.fixture || fixturesEnabled) &&
      Array.isArray(saved.draft.seasons) &&
      saved.draft.answers &&
      saved.draft.priorities
    ) {
      setDraft(saved.draft);
      if (fixturesEnabled) setFixture(!!saved.fixture);
      setStep(Math.min(4, Math.max(0, saved.step ?? 0)));
      setRequest(saved.request);
      setAdvice(saved.advice);
      setLocationReady(!!saved.locationReady);
      setScreen(
        saved.advice && saved.request ? 'results' : saved.screen === 'form' ? 'form' : 'welcome',
      );
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated)
      writeSession('ihayo-session-v1', {
        draft,
        fixture,
        step,
        screen: screen === 'working' ? 'form' : screen,
        request,
        advice,
        locationReady,
      });
  }, [draft, fixture, step, screen, request, advice, hydrated, locationReady]);
  useEffect(() => {
    heading.current?.querySelector<HTMLElement>('h1')?.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen, step, fieldIndex]);
  useEffect(() => {
    if (locationConfirmation === null || screen !== 'form' || step !== 0) return;
    const timer = window.setTimeout(() => {
      if (selectionVersion.current !== locationConfirmation) return;
      setLocationConfirmation(null);
      setStep(1);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [locationConfirmation, screen, step]);
  const cancelLocationAdvance = () => {
    selectionVersion.current++;
    setLocationConfirmation(null);
    setPending(false);
  };
  const update = (patch: Partial<Draft>) => {
    setError('');
    setFieldErrors([]);
    if ('state' in patch || 'lga' in patch) {
      setLocationReady(false);
      setNearest(null);
      setPending(false);
      cancelLocationAdvance();
    }
    setDraft((d) => ({ ...d, ...patch }));
  };
  async function chooseArea(place: Place) {
    cancelLocationAdvance();
    setError('');
    setNearest(null);
    setLocationReady(false);
    if (!place.state || !place.lga) return;
    setDraft((d) => ({ ...d, state: place.state, lga: place.lga, use_data_from: null }));
    const version = selectionVersion.current;
    setPending(true);
    try {
      // Recheck the API rather than advancing from a cached list or map flag.
      const areas = await client.areas(place.state);
      if (version !== selectionVersion.current) return;
      const area = areas.find((a) => a.lga === place.lga);
      if (!area)
        throw new Error('We could not confirm this area. Please choose your location again.');
      if (area.ready) {
        setLocationReady(true);
        setLocationConfirmation(version);
      } else {
        const nearby = await client.nearest(place);
        if (version === selectionVersion.current) setNearest(nearby);
      }
    } catch (e) {
      if (version === selectionVersion.current) setError((e as Error).message);
    } finally {
      if (version === selectionVersion.current) setPending(false);
    }
  }
  function changeStep(n: number) {
    cancelLocationAdvance();
    setStep(n);
    setFieldIndex(0);
    setScreen('form');
  }
  async function submit() {
    if (!q || submitting.current) return;
    setError('');
    setFieldErrors([]);
    try {
      const body = toRequest(draft, q);
      setRequest(body);
      submitting.current = true;
      setScreen('working');
      const result = await client.advice(body);
      setAdvice(result);
      setScreen('results');
    } catch (e) {
      setScreen('form');
      setStep(4);
      if (e instanceof ApiError) {
        if (e.code === 'no_data' && e.details.nearest) {
          setNearest(e.details.nearest as Nearest);
          setStep(0);
          setLocationReady(false);
        }
        if (['unknown_place', 'unknown_state', 'data_from_not_ready'].includes(e.code)) {
          setStep(0);
          setLocationReady(false);
        }
        if (e.code === 'bad_priorities') setStep(2);
        if (e.code === 'validation_error') {
          const fields = e.details.fields as { where: string; problem: string }[] | undefined;
          setError(e.message);
          setFieldErrors(fields ?? []);
          return;
        }
      }
      setError((e as Error).message);
    } finally {
      submitting.current = false;
    }
  }
  const reset = () => {
    cancelLocationAdvance();
    setDraft(emptyDraft());
    setAdvice(null);
    setRequest(null);
    setScreen('welcome');
    setStep(0);
    setFieldIndex(0);
    setNearest(null);
    setLocationReady(false);
  };
  const serviceError = health.error ?? questions.error ?? states.error;
  const ready = health.data && q && states.data;
  const question = (field: string) => q?.steps.find((x) => x.field === field);
  const retry = () => {
    void health.refetch();
    void questions.refetch();
    void states.refetch();
  };
  return (
    <>
      <a className="skip-link" href="#main">
        {ui.skip}
      </a>
      {fixture && (
        <div className="fixture-banner" role="status">
          {ui.fixture}
        </div>
      )}
      <header className={`site-header ${screen === 'welcome' ? 'is-welcome' : 'is-product'}`}>
        <button
          className="brand-button"
          onClick={() => {
            if (screen !== 'working') {
              cancelLocationAdvance();
              setScreen('welcome');
            }
          }}
          aria-label={ui.home}
        >
          <Brand />
        </button>
        {screen === 'welcome' && <SiteNavigation />}
        <div className="header-right">
          <span className="country">
            <span className="nigeria-flag" />
            {ui.footerNote}
          </span>
          {screen === 'results' && (
            <button className="text-button" onClick={reset}>
              {ui.restart}
            </button>
          )}
        </div>
      </header>
      <div ref={heading}>
        {screen === 'welcome' ? (
          <Welcome
            ready={!!ready}
            questions={q}
            health={health.data}
            error={serviceError}
            fixture={fixture}
            allowDemo={fixturesEnabled}
            onStart={() => {
              setScreen('form');
              setStep(0);
            }}
            onDemo={() => {
              setFixture(true);
              reset();
              setScreen('form');
            }}
            onRetry={retry}
          />
        ) : screen === 'working' ? (
          <main id="main" className="working">
            <div className="growing-mark">
              <BrandMark />
            </div>
            <p className="eyebrow">
              {draft.lga} / {draft.state}
            </p>
            <h1 tabIndex={-1}>{ui.workingTitle}</h1>
            <p>{ui.workingBody}</p>
            <div className="indeterminate" role="progressbar" aria-label={ui.workingBody}>
              <span />
            </div>
            <p className="muted">{ui.workingNote}</p>
          </main>
        ) : screen === 'results' && advice && request ? (
          <Results
            client={client}
            advice={advice}
            request={request}
            onRefresh={setAdvice}
            onRestart={reset}
            onEdit={() => changeStep(4)}
          />
        ) : !ready ? (
          <main id="main" className="form-main">
            {serviceError ? <ErrorBox message={ui.unavailable} retry={retry} /> : <Busy />}
          </main>
        ) : (
          <main id="main" className="form-shell">
            <aside className="journey">
              <p className="eyebrow">{ui.yourFarm}</p>
              <h2>{ui.journeyTitle}</h2>
              <ol>
                {ui.steps.map((label, i) => (
                  <li className={i === step ? 'current' : i < step ? 'done' : ''} key={label}>
                    <span>{i < step ? <Check size={16} /> : <Leaf size={15} />}</span>
                    <span>{label}</span>
                  </li>
                ))}
              </ol>
              <div className="journey-footer">
                <img src="/images/soil-480.webp" width="480" height="380" alt="" loading="lazy" />
                <p>{ui.footer}</p>
                <small>{ui.privacy}</small>
              </div>
            </aside>
            <div className="form-main">
              <div className="mobile-progress" aria-label={ui.progress}>
                {ui.steps.map((s, i) => (
                  <span
                    key={s}
                    className={i <= step ? 'active' : ''}
                    aria-current={i === step ? 'step' : undefined}
                  >
                    <span className="sr-only">{s}</span>
                  </span>
                ))}
              </div>
              <div className="form-top">
                <button
                  className="text-button"
                  onClick={() => {
                    cancelLocationAdvance();
                    if (step === 3 && fieldIndex > 0) setFieldIndex((i) => i - 1);
                    else if (step === 0) setScreen('welcome');
                    else setStep((s) => s - 1);
                  }}
                >
                  <ArrowLeft size={18} />
                  {ui.back}
                </button>
                <span className="eyebrow">
                  Step {step + 1} of {ui.steps.length} / {ui.steps[step]}
                </span>
              </div>
              {step === 0 ? (
                <>
                  <h1 tabIndex={-1}>Where is your farm?</h1>
                  <p className="form-description">{ui.locationIntro}</p>
                  <PlaceForm
                    stateQuestion={question('state')!.text}
                    locationReady={locationReady}
                    pending={pending}
                    areaQuestion={question('lga')!.text.replace('{state}', draft.state)}
                    client={client}
                    draft={draft}
                    states={states.data}
                    choose={chooseArea}
                    update={update}
                    onError={setError}
                  />
                  {pending && <Busy />}
                  {nearest && (
                    <div className="nearest-offer">
                      <span className="badge gold">{ui.notReady}</span>
                      <h2>{ui.nearestHeading}</h2>
                      <p>{ui.noDataFor(draft.lga, nearest.lga, nearest.state, nearest.km)}</p>
                      <p>{ui.fallbackIntro}</p>
                      <div className="button-row">
                        <button
                          className="button"
                          onClick={() => {
                            setDraft((d) => ({
                              ...d,
                              use_data_from: { state: nearest.state, lga: nearest.lga },
                            }));
                            setNearest(null);
                            setLocationReady(true);
                            setLocationConfirmation(++selectionVersion.current);
                          }}
                        >
                          {ui.nearestAccept}
                          <Check size={18} />
                        </button>
                        <button
                          className="button secondary"
                          onClick={() => {
                            setNearest(null);
                            update({ lga: '', use_data_from: null });
                            setLocationReady(false);
                          }}
                        >
                          {ui.nearestReject}
                        </button>
                      </div>
                    </div>
                  )}
                  {draft.use_data_from && (
                    <p className="notice">
                      {ui.dataFrom}: {draft.use_data_from.lga}, {draft.use_data_from.state}
                    </p>
                  )}
                  <div role="status" aria-live="polite" aria-atomic="true">
                    {locationConfirmation !== null && (
                      <p className="location-success">
                        <Check size={20} aria-hidden="true" />
                        {draft.lga}, {draft.state} confirmed. Next: what you grew before.
                      </p>
                    )}
                  </div>
                  {draft.lga && locationConfirmation === null && (
                    <button
                      className="button primary form-next"
                      disabled={!locationReady || !draft.lga || !!nearest || pending}
                      onClick={() => setStep(1)}
                    >
                      Continue
                      <ArrowRight size={18} />
                    </button>
                  )}
                </>
              ) : step === 1 ? (
                <>
                  <p className="eyebrow">
                    {draft.lga}, {draft.state}
                  </p>
                  <h1 tabIndex={-1}>{question('seasons')!.text}</h1>
                  <p className="form-description">{question('seasons')!.help}</p>
                  <Seasons q={q} draft={draft} update={update} />
                  <button
                    className="button primary form-next"
                    disabled={!canContinue(draft, 1)}
                    onClick={() => setStep(2)}
                  >
                    {ui.next}
                    <ArrowRight size={18} />
                  </button>
                  <ProfileCard client={client} draft={draft} />
                </>
              ) : step === 2 ? (
                <>
                  <h1 tabIndex={-1}>{question('priorities')!.text}</h1>
                  <p className="form-description">{ui.priorityHelp}</p>
                  <div className="priority-cards">
                    {question('priorities')!.options!.map((o, i) => {
                      const index = draft.priorities.indexOf(o.key!);
                      return (
                        <button
                          key={o.key}
                          className={`priority-card ${index >= 0 ? 'selected' : ''}`}
                          aria-pressed={index >= 0}
                          onClick={() =>
                            update({
                              priorities: togglePriority(
                                draft.priorities,
                                o.key!,
                                q.limits.priorities,
                              ),
                            })
                          }
                        >
                          <span className="priority-icon">
                            {
                              [
                                <Sprout key="s" />,
                                <Leaf key="l" />,
                                <CloudRain key="c" />,
                                <Wheat key="w" />,
                                <Sun key="sun" />,
                              ][i % 5]
                            }
                          </span>
                          <strong>{o.label}</strong>
                          <span className="seed">
                            {index >= 0 ? index + 1 : <Plus size={18} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {draft.priorities.length === q.limits.priorities && (
                    <p role="status">{ui.prioritiesLimit}</p>
                  )}
                  <ol className="ordered-priorities" aria-label={ui.priorityOrder}>
                    {draft.priorities.map((k) => (
                      <li key={k}>
                        {question('priorities')!.options!.find((o) => o.key === k)?.label}
                      </li>
                    ))}
                  </ol>
                  <button
                    className="button primary form-next"
                    disabled={!canContinue(draft, 2)}
                    onClick={() => {
                      setStep(3);
                      setFieldIndex(0);
                    }}
                  >
                    {ui.next}
                    <ArrowRight size={18} />
                  </button>
                </>
              ) : step === 3 ? (
                <>
                  <p className="question-count">
                    Farm question {fieldIndex + 1} of {fieldKeys.length}
                  </p>
                  <h1 tabIndex={-1}>{question(fieldKeys[fieldIndex])!.text}</h1>
                  {fieldIndex === 0 && (
                    <p className="form-description field-intro">{ui.fieldHelp}</p>
                  )}
                  <div className="field-symbol">
                    <img src="/images/soil-480.webp" width="480" height="380" alt="" />
                    <span>{ui.fieldPortrait}</span>
                  </div>
                  <div className="field-options">
                    {question(fieldKeys[fieldIndex])!.options!.map((o, i) => (
                      <button
                        className={`field-option ${fieldKeys[fieldIndex] in draft.answers && draft.answers[fieldKeys[fieldIndex]] === o.value ? 'selected' : ''}`}
                        key={i}
                        aria-pressed={
                          fieldKeys[fieldIndex] in draft.answers &&
                          draft.answers[fieldKeys[fieldIndex]] === o.value
                        }
                        onClick={() => {
                          update({
                            answers: { ...draft.answers, [fieldKeys[fieldIndex]]: o.value },
                          });
                          if (fieldIndex < fieldKeys.length - 1) setFieldIndex((i) => i + 1);
                          else setStep(4);
                        }}
                      >
                        <span>{o.label}</span>
                        <ArrowRight size={20} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h1 tabIndex={-1}>{ui.reviewTitle}</h1>
                  <p className="form-description">{ui.reviewHelp}</p>
                  <Review
                    draft={draft}
                    q={q}
                    change={(n, index) => {
                      changeStep(n);
                      setFieldIndex(index ?? 0);
                    }}
                  />
                  <button className="button primary form-next" onClick={() => void submit()}>
                    {ui.getAdvice}
                    <ArrowRight size={18} />
                  </button>
                </>
              )}
              {error && (
                <ErrorBox message={error} retry={step === 4 ? () => void submit() : undefined} />
              )}
              {!!fieldErrors.length && (
                <ul className="field-errors" aria-label={ui.validation}>
                  {fieldErrors.map((f, i) => (
                    <li key={i}>
                      <button
                        className="text-button"
                        onClick={() => {
                          const k = f.where.replace(/^body\./, '').split(/[.\[]/)[0];
                          const n = fieldKeys.indexOf(k as (typeof fieldKeys)[number]);
                          changeStep(n >= 0 ? 3 : k === 'seasons' ? 1 : k === 'priorities' ? 2 : 0);
                          if (n >= 0) setFieldIndex(n);
                        }}
                      >
                        {question(f.where)?.text ?? f.where}: {f.problem}
                        <ArrowRight size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </main>
        )}
      </div>
      <footer className="site-footer">
        <span className="footer-brand">
          <BrandMark />
          <span>
            {ui.brand}
            <span className="footer-tagline">{ui.tagline}</span>
          </span>
        </span>
        <span>{ui.footerNote}</span>
        <a href="/image-credits.txt" target="_blank" rel="noopener noreferrer">
          {ui.photoCreditShort}
        </a>
      </footer>
    </>
  );
}
