'use client';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CloudRain, RotateCcw } from 'lucide-react';
import { ApiError, Client } from '@/lib/api';
import type { Advice, AdviceRequest, ScenarioInput, Charts } from '@/lib/types';
import { ui } from '@/lib/copy';
import { Busy, display, ErrorBox, Lines } from './shared';
const defaults: ScenarioInput = { rain_factor: 1, delay_days: 0, temp_shift: 0 };
export function WeatherScenario({
  client,
  advice,
  request,
  onRefresh,
}: {
  client: Client;
  advice: Advice;
  request: AdviceRequest;
  onRefresh: (a: Advice) => void;
}) {
  const [values, setValues] = useState(defaults);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = useRef(0);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: ScenarioInput) =>
      client.withRecovery(advice, request, (id) => client.scenario(id, input), onRefresh),
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'no_weather') setUnavailable(e.message);
    },
  });
  const commit = (input = values) => {
    if (timer.current) clearTimeout(timer.current);
    const v = ++version.current;
    timer.current = setTimeout(() => {
      if (v === version.current) mutation.mutate(input);
    }, 400);
  };
  useEffect(() => {
    mutation.mutate(defaults);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []); // One initial request; later requests only after committed controls.
  if (unavailable) return <p className="notice">{unavailable}</p>;
  const data = mutation.data;
  const max = Math.max(
    1,
    data?.growing_season.as_recorded.usual_days ?? 0,
    data?.growing_season.usual_days ?? 0,
  );
  return (
    <div className="weather-scenario no-print">
      <div className="section-kicker">
        <CloudRain size={21} />
        <span>{ui.scenario}</span>
      </div>
      <h2>{ui.scenario}</h2>
      <p>{ui.scenarioHelp}</p>
      {data?.lines[0] && <p className="notice">{data.lines[0]}</p>}
      <div className="scenario-layout">
        <div className="sliders">
          {(
            [
              {
                key: 'rain_factor',
                label: ui.rain,
                min: 0.5,
                max: 1.5,
                step: 0.05,
                value: Math.round(values.rain_factor * 100) + '%',
              },
              {
                key: 'delay_days',
                label: ui.delay,
                min: 0,
                max: 60,
                step: 7,
                value: values.delay_days + ' ' + ui.days,
              },
              {
                key: 'temp_shift',
                label: ui.temperature,
                min: -2,
                max: 5,
                step: 0.5,
                value: values.temp_shift + ' °C',
              },
            ] as const
          ).map((c) => (
            <label key={c.key} className="slider-label">
              <span>
                {c.label}
                <strong>{c.value}</strong>
              </span>
              <input
                type="range"
                min={c.min}
                max={c.max}
                step={c.step}
                value={values[c.key]}
                aria-label={c.label}
                aria-valuetext={c.value}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [c.key]: Number(e.target.value) }));
                  if (timer.current) clearTimeout(timer.current);
                }}
                onPointerUp={() => commit()}
                onKeyUp={(e) => {
                  if (
                    [
                      'ArrowLeft',
                      'ArrowRight',
                      'ArrowUp',
                      'ArrowDown',
                      'Home',
                      'End',
                      'PageUp',
                      'PageDown',
                    ].includes(e.key)
                  )
                    commit();
                }}
                onBlur={() => commit()}
              />
            </label>
          ))}
          <button
            className="text-button"
            onClick={() => {
              setValues(defaults);
              commit(defaults);
            }}
          >
            <RotateCcw size={17} />
            {ui.reset}
          </button>
        </div>
        <div className="scenario-comparison" aria-live="polite">
          {mutation.isPending && <Busy />}
          {mutation.error && (
            <ErrorBox message={mutation.error.message} retry={() => commit()} />
          )}{' '}
          {data && (
            <>
              <Lines values={data.lines.slice(1)} />
              {(['usual_days', 'shorter_year_days'] as const).map((k, i) => (
                <div className="comparison" key={k}>
                  <h3>{i ? ui.shorter : ui.usual}</h3>
                  {[
                    { label: ui.recorded, n: data.growing_season.as_recorded[k] },
                    { label: ui.adjusted, n: data.growing_season[k] },
                  ].map((v, j) => (
                    <div key={j}>
                      <span>
                        {v.label}{' '}
                        <strong>
                          {display(v.n)} {ui.days}
                        </strong>
                      </span>
                      <div className={`comparison-track tone-${j}`}>
                        <i style={{ width: `${((v.n ?? 0) / max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <table>
                <caption>{ui.fit}</caption>
                <thead>
                  <tr>
                    <th scope="col">{ui.customCrop}</th>
                    <th scope="col">{ui.before}</th>
                    <th scope="col">{ui.after}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.crops.map((c) => (
                    <tr key={c.crop} className={Math.abs(c.change ?? 0) > 5 ? 'changed' : ''}>
                      <th scope="row">{c.crop}</th>
                      <td>{display(c.before)}</td>
                      <td>
                        {display(c.after)}
                        {c.change != null && ` (${c.change > 0 ? '+' : ''}${c.change})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
type Row = { label: string; values: (number | null)[]; extras?: string[] };
function Chart({
  title,
  rows,
  series,
  unit,
  kind = 'line',
}: {
  title: string;
  rows: Row[];
  series: string[];
  unit: string;
  kind?: 'water' | 'line' | 'bar';
}) {
  const max = Math.max(1, ...rows.flatMap((x) => x.values.map((n) => n ?? 0)));
  const x = (i: number) => 48 + (i * 500) / Math.max(1, rows.length - 1);
  const y = (n: number) => 200 - (n / max) * 165;
  return (
    <article className="chart-card">
      <h3>{title}</h3>
      {!rows.length ? (
        <p>{ui.chartUnavailable}</p>
      ) : (
        <>
          <svg viewBox="0 0 600 250" role="img" aria-label={`${title} (${unit}). ${ui.table}.`}>
            <text x="8" y="18" className="axis-title">
              {unit}
            </text>
            {[0, 0.5, 1].map((t) => (
              <g key={t}>
                <path d={`M45 ${y(t * max)}H565`} stroke="#dce3db" />
                <text x="36" y={y(t * max) + 5} textAnchor="end">
                  {Math.round(t * max)}
                </text>
              </g>
            ))}
            {kind === 'water' &&
              rows.map(
                (r, i) =>
                  r.values[0] != null && (
                    <rect
                      key={i}
                      x={x(i) - 9}
                      y={y(r.values[0])}
                      width={18}
                      height={200 - y(r.values[0])}
                      rx={3}
                      fill="#608c74"
                    />
                  ),
              )}
            {kind === 'bar'
              ? rows.map(
                  (r, i) =>
                    r.values[0] != null && (
                      <rect
                        key={i}
                        x={x(i) - Math.min(20, 180 / rows.length)}
                        y={y(r.values[0])}
                        width={Math.min(40, 360 / rows.length)}
                        height={200 - y(r.values[0])}
                        rx={3}
                        fill="#608c74"
                      />
                    ),
                )
              : series.map((s, j) =>
                  kind === 'water' && j === 0 ? null : (
                    <path
                      key={s}
                      d={rows
                        .map((r, i) =>
                          r.values[j] == null
                            ? ''
                            : `${i === 0 || rows[i - 1].values[j] == null ? 'M' : 'L'}${x(i)} ${y(r.values[j]!)}`,
                        )
                        .join(' ')}
                      fill="none"
                      stroke={j === 0 ? '#245b45' : j === 1 ? '#94651c' : '#65737b'}
                      strokeDasharray={j === 2 ? '4 4' : undefined}
                      strokeWidth="3"
                    />
                  ),
                )}
            {rows.map(
              (r, i) =>
                (rows.length <= 12 || i % Math.ceil(rows.length / 8) === 0) && (
                  <text key={i} x={x(i)} y="226" textAnchor="middle">
                    {r.label}
                  </text>
                ),
            )}
          </svg>
          <div className="chart-key">
            {series.map((s, i) => (
              <span key={s}>
                <i className={`series-${i}`} />
                {s}
              </span>
            ))}
          </div>
          <details>
            <summary>{ui.table}</summary>
            <div className="table-wrap">
              <table>
                <caption>
                  {title} ({unit})
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{kind === 'bar' ? ui.year : ui.chartLabels.month}</th>
                    {series.map((s) => (
                      <th key={s} scope="col">
                        {s}
                      </th>
                    ))}
                    {rows.some((r) => r.extras) && (
                      <>
                        <th scope="col">{ui.chartLabels.start}</th>
                        <th scope="col">{ui.chartLabels.end}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <th scope="row">{r.label}</th>
                      {r.values.map((n, j) => (
                        <td key={j}>{display(n, 1)}</td>
                      ))}
                      {r.extras?.map((t, j) => (
                        <td key={j}>{t}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </article>
  );
}
export function WeatherCharts({
  client,
  advice,
  request,
  onRefresh,
}: {
  client: Client;
  advice: Advice;
  request: AdviceRequest;
  onRefresh: (a: Advice) => void;
}) {
  const {
    data: d,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['charts', client.fixture, advice.advice_id],
    queryFn: () => client.withRecovery(advice, request, (id) => client.charts(id), onRefresh),
    staleTime: Infinity,
  });
  if (isPending) return <Busy />;
  if (error) return <ErrorBox message={error.message} retry={() => void refetch()} />;
  return <ChartSet data={d} />;
}
export function ChartSet({ data: d }: { data: Charts }) {
  const months = ui.months;
  return (
    <section className="weather-charts no-print">
      <h2>{ui.weatherCharts}</h2>
      <p>{d.units_note}</p>
      {!!d.suspect_years.length && (
        <p className="notice">
          {ui.omittedYears} {d.suspect_years.join(', ')}.
        </p>
      )}
      <Chart
        title={ui.waterChart}
        kind="water"
        unit="mm/month"
        series={[ui.chartLabels.rain, ui.chartLabels.et0, ui.chartLabels.deficit]}
        rows={(d.monthly_water_mm ?? []).map((r) => ({
          label: months[r.month - 1],
          values: [r.rain, r.reference_evapotranspiration, r.deficit],
        }))}
      />
      <div className="chart-grid">
        <Chart
          title={ui.temperatureChart}
          unit="°C"
          series={[ui.chartLabels.mean, ui.chartLabels.maximum]}
          rows={(d.monthly_temperature_c ?? []).map((r) => ({
            label: months[r.month - 1],
            values: [r.mean, r.max],
          }))}
        />
        <Chart
          title={ui.growingChart}
          unit="days"
          kind="bar"
          series={[ui.chartLabels.growing]}
          rows={(d.growing_season_by_year ?? []).map((r) => ({
            label: String(r.year),
            values: [r.days],
            extras: [r.start ?? ui.noNumber, r.end ?? ui.noNumber],
          }))}
        />
      </div>
    </section>
  );
}
