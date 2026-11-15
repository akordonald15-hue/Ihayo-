'use client';
import { useState } from 'react';
import { ArrowRight, BookOpen, Download, Printer, Sprout } from 'lucide-react';
import type { Advice, AdviceRequest, Choice } from '@/lib/types';
import { Client } from '@/lib/api';
import { ui } from '@/lib/copy';
import RotationExplorer, { RotationTimeline } from './RotationExplorer';
import { Busy, display, ErrorBox, Lines, Score, Section, Sentences } from './shared';
import EvidenceSheet from './EvidenceSheet';
import AreaMap from './AreaMap';
import { WeatherCharts, WeatherScenario } from './Weather';
function ChoiceCard({ choice: c, onEvidence }: { choice: Choice; onEvidence: () => void }) {
  return (
    <article className="choice-card">
      <div className="choice-top">
        <span className="badge">{c.role_label}</span>
        <Sprout size={23} />
      </div>
      <h3>{c.name}</h3>
      {c.what && <p>{c.what}</p>}
      <div className="choice-layout">
        <div className="choice-plan">
          <h4>{ui.plan}</h4>
          <RotationTimeline choice={c} />
          {c.two_seasons_note && <p>{c.two_seasons_note}</p>}
          <details className="rotation-fit-details">
            <summary>Land and weather fit</summary>
            <p>
              These scores describe environmental suitability, not harvests, income or the certainty
              of this rotation's evidence.
            </p>
            <div className="fit-chips">
              {c.fit.map((f, i) => (
                <span key={i}>
                  {f.crop}{' '}
                  <strong>{f.score == null ? ui.noNumber : `${display(f.score)}/100`}</strong>
                  <small>{ui.fit}</small>
                </span>
              ))}
            </div>
          </details>
        </div>
        <div className="choice-evaluation">
          <h4>{ui.mayHelp}</h4>
          <Sentences values={c.help} />
          <h4>{ui.watch}</h4>
          <Sentences values={c.watch} />
          {!!c.notices.length && (
            <div className="notice">
              <Lines values={c.notices} />
            </div>
          )}
          {!!c.issues.length && (
            <>
              <h4>{ui.issues}</h4>
              <Sentences values={c.issues} />
            </>
          )}
          {c.priorities.map((p) => (
            <div key={p.key} className="choice-priority">
              <h4>{p.label}</h4>
              <p>{p.text}</p>
            </div>
          ))}
          {!!c.conditions.length && (
            <>
              <h4>{ui.conditions}</h4>
              <Sentences values={c.conditions} />
            </>
          )}
          <div className="confidence">
            <BookOpen size={20} />
            <div>
              <h4>{ui.confidenceLabel}</h4>
              <Lines values={[c.confidence.text, c.confidence.where]} />
            </div>
          </div>
          <p className="ask">{c.ask}</p>
          <button className="button secondary no-print" onClick={onEvidence}>
            {ui.evidence}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
export default function Results({
  client,
  advice: a,
  request,
  onRefresh,
  onRestart,
  onEdit,
  idPrefix = '',
}: {
  client: Client;
  advice: Advice;
  request: AdviceRequest | null;
  onRefresh: (a: Advice) => void;
  onRestart: () => void;
  onEdit: () => void;
  idPrefix?: string;
}) {
  const p = a.page;
  const [evidence, setEvidence] = useState<string | null>(null);
  const [download, setDownload] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [weatherOpened, setWeatherOpened] = useState(false);
  const [chartsOpened, setChartsOpened] = useState(false);
  const [mapOpened, setMapOpened] = useState(false);
  async function save(kind: 'text' | 'agent-report') {
    setDownload(true);
    setError('');
    setSaved(false);
    try {
      const result = await client.withRecovery(
        a,
        request,
        (id) => client.download(id, kind, a),
        onRefresh,
      );
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownload(false);
    }
  }
  return (
    <main id={`${idPrefix}main`} className="results">
      <div className="results-heading">
        <p className="eyebrow">
          {p.place.lga} / {p.place.state}
        </p>
        <h1 tabIndex={-1}>{p.title}</h1>
        <p>{p.place.zone}</p>
        <div className="result-meta">
          <span>
            {ui.made}: {p.made}
          </span>
          {p.weather_years && (
            <span>
              {ui.dataYears}: {p.weather_years.join('–')}
            </span>
          )}
        </div>
        {p.place.data_from_text && <p className="notice prominent">{p.place.data_from_text}</p>}
        <button className="text-button no-print" onClick={onEdit}>
          {ui.reviewTitle}
          <ArrowRight size={18} />
        </button>
      </div>
      <nav className="results-shortcuts no-print" aria-label="Explore your results">
        <a href={`#${idPrefix}rotation-choices`}>Your patterns</a>
        <a href={`#${idPrefix}result-checks`}>Important checks</a>
        <a href={`#${idPrefix}weather-lab`}>Weather what-if</a>
        <a href={`#${idPrefix}result-records`}>Local records</a>
        <a href={`#${idPrefix}download-report`}>Save for my agent</a>
      </nav>
      <div className="intro-advice">
        <Lines values={p.intro} />
      </div>
      <Section
        title={p.choices.heading}
        id={`${idPrefix}rotation-choices`}
        className="choices-section"
      >
        <Lines values={p.choices.notices} className="notice" />
        <RotationExplorer
          key={`${request?.state ?? p.place.state}/${request?.lga ?? p.place.lga}/${p.choices.items.map((c) => c.option_id).join('/')}`}
          choices={p.choices.items}
          renderChoice={(c) => (
            <ChoiceCard choice={c} onEvidence={() => setEvidence(c.option_id)} />
          )}
        />
      </Section>
      <div id={`${idPrefix}result-checks`}>
        <Section title={p.unknown.heading} className="uncertainty">
          <p>{p.unknown.intro}</p>
          <Sentences values={p.unknown.items} />
        </Section>
      </div>
      <p className="results-next-step">
        Your next step: discuss the patterns and these checks with your extension agent. Opening a
        pattern does not mean it has been checked on your farm.
      </p>
      <div id={`${idPrefix}result-records`} />
      <div className="land-rain">
        <Section title={p.land.heading}>
          <Lines values={p.land.lines} />
          {p.land.elevation_m != null && (
            <span className="fact-pill">
              {display(p.land.elevation_m)} m {ui.elevation}
            </span>
          )}
        </Section>
        <Section title={p.rain.heading}>
          <Lines values={p.rain.lines} />
        </Section>
      </div>
      <Section title={p.told.heading}>
        <Lines values={p.told.lines} />
      </Section>
      <Section title={p.crops.heading}>
        <p>{p.crops.intro}</p>
        <div className="crop-fit-list">
          {p.crops.items.map((c, i) => (
            <article key={i}>
              <div className="crop-fit-header">
                <h3>{c.crop}</h3>
                <Score value={c.score} />
              </div>
              <Lines values={c.reasons} />
              {c.all_fine && <p>{ui.allFine}</p>}
            </article>
          ))}
        </div>
        {p.crops.caution && <p className="notice">{p.crops.caution}</p>}
      </Section>
      <Section title={p.measures.heading}>
        <p>{p.measures.intro}</p>
        <Sentences values={p.measures.items} />
      </Section>
      {!a.advice_id && (
        <p className="notice">
          A report identifier was not supplied. Downloads and weather tools are unavailable for this
          response. You can still read and print the report.
        </p>
      )}
      <div id={`${idPrefix}download-report`} />
      <Section title={p.print.heading}>
        <Lines values={p.print.lines} />
        <div className="download-actions no-print">
          <button
            className="button"
            disabled={download || !a.advice_id}
            onClick={() => void save('text')}
          >
            <Download size={18} />
            {ui.saveText}
          </button>
          <button
            className="button secondary"
            disabled={download || !a.advice_id}
            onClick={() => void save('agent-report')}
          >
            <BookOpen size={18} />
            {ui.saveReport}
          </button>
          <button className="button secondary" onClick={() => window.print()}>
            <Printer size={18} />
            {ui.print}
          </button>
        </div>
        {download && <Busy text={ui.downloadBusy} />}
        <div role="status">{saved && <p>{ui.saved}</p>}</div>
        {error && <ErrorBox message={error} />}
      </Section>
      {!!a.advice_id && (
        <>
          <details
            className="results-disclosure no-print"
            id={`${idPrefix}weather-lab`}
            onToggle={(event) => {
              if (event.currentTarget.open) setWeatherOpened(true);
            }}
          >
            <summary>
              <span>Try a weather what-if</span>
              <span>Live exploration of historical weather, not a forecast</span>
            </summary>
            {weatherOpened && (
              <WeatherScenario
                key={p.place.state + p.place.lga}
                client={client}
                advice={a}
                request={request}
                onRefresh={onRefresh}
              />
            )}
          </details>
          <details
            className="results-disclosure no-print"
            onToggle={(event) => {
              if (event.currentTarget.open) setChartsOpened(true);
            }}
          >
            <summary>
              <span>Explore the weather records</span>
              <span>Charts, numbers and source limitations</span>
            </summary>
            {chartsOpened && (
              <WeatherCharts client={client} advice={a} request={request} onRefresh={onRefresh} />
            )}
          </details>
        </>
      )}
      <details
        className="results-disclosure no-print"
        onToggle={(event) => {
          if (event.currentTarget.open) setMapOpened(true);
        }}
      >
        <summary>
          <span>{ui.map}</span>
          <span>Area coverage, not exact farm boundaries</span>
        </summary>
        {mapOpened && (
          <AreaMap
            client={client}
            place={p.place}
            from={request?.use_data_from ?? p.place.data_from}
          />
        )}
      </details>
      <div className="restart no-print">
        <p>{ui.footer}</p>
        <button className="button secondary" onClick={onRestart}>
          {ui.restart}
          <ArrowRight size={18} />
        </button>
      </div>
      {evidence && (
        <EvidenceSheet client={client} id={evidence} onClose={() => setEvidence(null)} />
      )}
    </main>
  );
}
