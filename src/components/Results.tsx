'use client';
import { useState } from 'react';
import { ArrowRight, BookOpen, Download, Printer, Sprout } from 'lucide-react';
import type { Advice, AdviceRequest, Choice } from '@/lib/types';
import { Client } from '@/lib/api';
import { ui } from '@/lib/copy';
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
      <h4>{ui.plan}</h4>
      <ol className="rotation-plan">
        {c.steps.map((s, i) => (
          <li key={i}>
            <span className="year-dot">{s.year}</span>
            <div>
              <span className="overline">
                {ui.year} {s.year} · {s.season}
              </span>
              <strong>
                {s.fallow ? ui.fallowShort : [s.crop, ...s.also].filter(Boolean).join(' + ')}
              </strong>
              {s.months && <span className="muted">{s.months}</span>}
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      {c.two_seasons_note && <p>{c.two_seasons_note}</p>}
      <div className="fit-chips">
        {c.fit.map((f, i) => (
          <span key={i}>
            {f.crop} <strong>{display(f.score)}/100</strong>
            <small>{ui.fit}</small>
          </span>
        ))}
      </div>
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
}: {
  client: Client;
  advice: Advice;
  request: AdviceRequest;
  onRefresh: (a: Advice) => void;
  onRestart: () => void;
  onEdit: () => void;
}) {
  const p = a.page;
  const [evidence, setEvidence] = useState<string | null>(null);
  const [download, setDownload] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
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
    <main id="main" className="results">
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
      <div className="intro-advice">
        <Lines values={p.intro} />
      </div>
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
      <Section title={p.choices.heading} className="choices-section">
        <Lines values={p.choices.notices} className="notice" />
        <div
          className="choice-grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, p.choices.items.length)}, minmax(0, 1fr))`,
          }}
        >
          {p.choices.items.map((c, i) => (
            <ChoiceCard
              key={`${c.option_id}-${i}`}
              choice={c}
              onEvidence={() => setEvidence(c.option_id)}
            />
          ))}
        </div>
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
      <Section title={p.unknown.heading} className="uncertainty">
        <p>{p.unknown.intro}</p>
        <Sentences values={p.unknown.items} />
      </Section>
      <Section title={p.print.heading}>
        <Lines values={p.print.lines} />
        <div className="download-actions no-print">
          <button className="button" disabled={download} onClick={() => void save('text')}>
            <Download size={18} />
            {ui.saveText}
          </button>
          <button
            className="button secondary"
            disabled={download}
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
      <WeatherScenario
        key={request.state + request.lga}
        client={client}
        advice={a}
        request={request}
        onRefresh={onRefresh}
      />
      <WeatherCharts client={client} advice={a} request={request} onRefresh={onRefresh} />
      <section className="result-section no-print">
        <h2>{ui.map}</h2>
        <AreaMap client={client} place={p.place} from={request.use_data_from} />
      </section>
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
