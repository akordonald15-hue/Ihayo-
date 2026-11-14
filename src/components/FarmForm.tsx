'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Leaf,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { Client } from '@/lib/api';
import { sameCrop, toggleCrop } from '@/lib/model';
import type { Draft, Place, Questions, SearchPlace, State } from '@/lib/types';
import { fieldKeys } from '@/lib/types';
import { ui } from '@/lib/copy';
import { Busy, ErrorBox, Lines } from './shared';
import AreaMap from './AreaMap';
import FarmLocationSummary from './FarmLocationSummary';
import CropBotanical from './CropBotanical';
export function PlaceForm({
  client,
  draft,
  states,
  choose,
  update,
  onError,
  stateQuestion,
  areaQuestion,
  locationReady,
  pending,
}: {
  client: Client;
  draft: Draft;
  states: State[];
  choose: (p: Place, ready: boolean) => Promise<void>;
  update: (d: Partial<Draft>) => void;
  onError: (s: string) => void;
  stateQuestion?: string;
  areaQuestion?: string;
  locationReady: boolean;
  pending: boolean;
}) {
  const [mode, setMode] = useState<'browse' | 'search' | 'geo'>('browse');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [locating, setLocating] = useState(false);
  const [map, setMap] = useState(false);
  const attempt = useRef(0);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const list = useQuery({
    queryKey: ['areas', client.fixture, draft.state],
    queryFn: () => client.areas(draft.state),
    enabled: mode === 'browse' && !!draft.state && !draft.lga,
    staleTime: Infinity,
  });
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(
    () => () => {
      attempt.current++;
    },
    [],
  );
  useEffect(() => {
    stageHeading.current?.focus();
  }, [draft.state, draft.lga, mode]);
  const results = useQuery({
    queryKey: ['search', client.fixture, debounced],
    queryFn: () => client.search(debounced),
    enabled: mode === 'search' && debounced.length >= 2 && !draft.lga,
  });
  function switchMode(next: typeof mode) {
    attempt.current++;
    setMode(next);
    setFilter('');
    setSearch('');
    setDebounced('');
    setLocating(false);
    setMap(false);
    onError('');
  }
  function select(place: SearchPlace | (Place & { ready: boolean })) {
    attempt.current++;
    setSearch('');
    setDebounced('');
    setFilter('');
    setMap(false);
    setMode('browse');
    setLocating(false);
    void choose({ state: place.state, lga: place.lga }, place.ready);
  }
  function changeState() {
    switchMode('browse');
    update({ state: '', lga: '', use_data_from: null });
  }
  function locate() {
    onError('');
    if (!navigator.geolocation) {
      onError(ui.noGeo);
      return;
    }
    const version = ++attempt.current;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          if (version !== attempt.current) return;
          if (!Number.isFinite(p.coords.latitude) || !Number.isFinite(p.coords.longitude)) {
            throw new Error(ui.geoError);
          }
          const place = await client.locate(p.coords.latitude, p.coords.longitude);
          if (version === attempt.current) select(place);
        } catch (e) {
          if (version === attempt.current) onError((e as Error).message);
        } finally {
          if (version === attempt.current) setLocating(false);
        }
      },
      (error) => {
        if (version === attempt.current) {
          setLocating(false);
          onError(error.code === 1 ? ui.geoDenied : error.code === 3 ? ui.geoTimeout : ui.geoError);
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 },
    );
  }
  if (draft.lga)
    return (
      <FarmLocationSummary
        place={draft}
        availability={
          pending
            ? 'Checking records for your area…'
            : locationReady
              ? draft.use_data_from
                ? 'Nearby records selected'
                : 'Available'
              : 'Not available for this area'
        }
        onChange={changeState}
        focusOnMount
      />
    );
  return (
    <div className="progressive-location">
      {mode !== 'browse' && (
        <button className="text-button" onClick={() => switchMode('browse')}>
          {draft.state ? 'Back to LGA selection' : 'Choose a state instead'}
        </button>
      )}
      {mode === 'browse' ? (
        <>
          {draft.state && (
            <div className="selected-state">
              <span>
                State <strong>{draft.state}</strong>
              </span>
              <button className="text-button" onClick={changeState}>
                Change state
              </button>
            </div>
          )}
          <h2 ref={stageHeading} tabIndex={-1}>
            {draft.state ? (areaQuestion ?? ui.areaSearch) : (stateQuestion ?? ui.stateSearch)}
          </h2>
          <label className="location-filter" htmlFor="location-filter">
            {draft.state ? ui.areaSearch : ui.stateSearch}
          </label>
          <input
            id="location-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={ui.searchPlaceholder}
          />
          <div
            className="selection-list"
            role="group"
            aria-label={draft.state ? ui.areaSearch : ui.stateSearch}
          >
            {!draft.state ? (
              states
                .filter((s) => s.state.toLowerCase().includes(filter.toLowerCase()))
                .map((s) => (
                  <button
                    key={s.state}
                    onClick={() => {
                      update({ state: s.state, lga: '', use_data_from: null });
                      setFilter('');
                    }}
                  >
                    <span>
                      {s.state}
                      <small>
                        {s.areas_ready}/{s.areas} {ui.serviceCoverage}
                      </small>
                    </span>
                    <ArrowRight size={17} />
                  </button>
                ))
            ) : list.isPending ? (
              <Busy />
            ) : list.error ? (
              <ErrorBox message={list.error.message} retry={() => void list.refetch()} />
            ) : (
              <>
                {list.data
                  ?.filter((a) => a.lga.toLowerCase().includes(filter.toLowerCase()))
                  .map((a) => (
                    <button
                      key={a.lga}
                      onClick={() => select({ state: draft.state, lga: a.lga, ready: a.ready })}
                    >
                      <span>
                        {a.lga}
                        <small className={a.ready ? 'available' : ''}>
                          {a.ready ? ui.ready : ui.notReady}
                        </small>
                      </span>
                      <ArrowRight size={17} />
                    </button>
                  ))}
                {!list.data?.some((a) => a.lga.toLowerCase().includes(filter.toLowerCase())) && (
                  <p>{ui.empty}</p>
                )}
              </>
            )}
          </div>
          {!draft.state &&
            !states.some((s) => s.state.toLowerCase().includes(filter.toLowerCase())) && (
              <p>{ui.empty}</p>
            )}
          {draft.state && (
            <>
              <button
                className="text-button map-toggle"
                aria-expanded={map}
                onClick={() => setMap((v) => !v)}
              >
                <MapPin size={18} />
                {ui.map}
                <ChevronDown size={16} />
              </button>
              {map && (
                <AreaMap
                  client={client}
                  place={draft}
                  from={draft.use_data_from}
                  onSelect={(p, ready) => select({ ...p, ready })}
                />
              )}
            </>
          )}
        </>
      ) : mode === 'search' ? (
        <>
          <h2 ref={stageHeading} tabIndex={-1}>
            Search for your LGA
          </h2>
          <p>Search by area name, then confirm the matching state and LGA.</p>
          <label className="search-box">
            <Search size={19} />
            <input
              type="search"
              placeholder={ui.placeSearch}
              aria-label={ui.placeSearch}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {search.length > 0 && search.trim().length < 2 && <p>{ui.searchHint}</p>}
          {debounced.length >= 2 && search && (
            <div className="search-results">
              {results.isPending ? (
                <Busy />
              ) : results.error ? (
                <ErrorBox message={results.error.message} retry={() => void results.refetch()} />
              ) : !results.data?.length ? (
                <p>{ui.empty}</p>
              ) : (
                results.data.map((p) => (
                  <button key={p.state + p.lga} onClick={() => select(p)}>
                    <span>
                      {p.lga}, {p.state}
                    </span>
                    <small>{p.ready ? ui.ready : ui.notReady}</small>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <h2 ref={stageHeading} tabIndex={-1}>
            Find your area using this device
          </h2>
          <p>
            Your browser will ask to share this device's location with the advice service to find
            your LGA. Use this only while you are near your farm. You can change the area
            afterwards.
          </p>
          <button className="button secondary" onClick={locate} disabled={locating}>
            <LocateFixed size={19} />
            {ui.useLocation}
          </button>
          {locating && <Busy />}
        </>
      )}
      <div className="location-alternatives">
        <span>Another way to find your farm</span>
        {mode !== 'search' && (
          <button className="text-button" onClick={() => switchMode('search')}>
            <Search size={17} />
            Search by area name
          </button>
        )}
        {mode !== 'geo' && (
          <button className="text-button" onClick={() => switchMode('geo')}>
            <LocateFixed size={17} />
            Use device location
          </button>
        )}
      </div>
    </div>
  );
}
export function ProfileCard({ client, draft }: { client: Client; draft: Draft }) {
  const { data } = useQuery({
    queryKey: ['profile', client.fixture, draft.state, draft.lga, draft.use_data_from],
    queryFn: () => client.profile(draft, draft.use_data_from),
    retry: false,
    staleTime: Infinity,
  });
  if (!data) return null;
  return (
    <aside className="profile-card">
      <Leaf size={22} />
      <div>
        <h2>{ui.profile}</h2>
        {draft.use_data_from && (
          <p>
            {ui.dataFrom}: {draft.use_data_from.lga}, {draft.use_data_from.state}
          </p>
        )}
        <Lines values={[...data.land.lines, ...data.rain.lines]} />
      </div>
    </aside>
  );
}
export function Seasons({
  q,
  draft,
  update,
}: {
  q: Questions;
  draft: Draft;
  update: (d: Partial<Draft>) => void;
}) {
  const [active, setActive] = useState(0);
  const slots = useRef<HTMLDivElement>(null);
  useEffect(() => {
    slots.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }, [active, draft.seasons.length]);
  const [custom, setCustom] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [error, setError] = useState('');
  const current = draft.seasons[active] ?? null;
  const setCurrent = (value: string[] | null) =>
    update({ seasons: draft.seasons.map((s, i) => (i === active ? value : s)) });
  const atLimit = (current?.length ?? 0) >= q.limits.crops_per_season;
  return (
    <>
      <fieldset className="season-count">
        <legend>{ui.seasonCount}</legend>
        {Array.from({ length: q.limits.seasons }, (_, i) => i + 1).map((n) => (
          <button
            type="button"
            key={n}
            aria-pressed={draft.seasons.length === n}
            className={draft.seasons.length === n ? 'selected' : ''}
            onClick={() => {
              update({ seasons: Array.from({ length: n }, (_, i) => draft.seasons[i] ?? null) });
              setActive((i) => Math.min(i, n - 1));
            }}
          >
            {n}
          </button>
        ))}
      </fieldset>
      <div className="season-slots" ref={slots}>
        {draft.seasons
          .map((crops, i) => ({ crops, i }))
          .reverse()
          .map(({ crops, i }) => (
            <button
              key={i}
              aria-pressed={i === active}
              className={i === active ? 'active' : ''}
              onClick={() => {
                setActive(i);
                setCustom('');
                setError('');
              }}
            >
              <span>{i === 0 ? ui.newest : `${ui.season} ${i + 1}`}</span>
              <span className="season-mini" aria-hidden="true">
                {crops?.[0] === 'maize' || crops?.[0] === 'cowpea' ? (
                  <img src={`/images/${crops[0]}-crop.webp`} width="240" height="80" alt="" />
                ) : crops === null ? (
                  <Plus size={22} strokeWidth={1.2} />
                ) : crops.length === 0 ? (
                  <Sun size={22} strokeWidth={1.2} />
                ) : (
                  <CropBotanical crop={crops[0]} />
                )}
              </span>
              <strong>
                {crops === null
                  ? ui.chooseCrops
                  : crops.length
                    ? crops.map((c) => q.crops.find((x) => x.id === c)?.label ?? c).join(' + ')
                    : q.fallow.label}
              </strong>
            </button>
          ))}
      </div>
      <p className="muted">{ui.seasonsHelp}</p>
      <h2 className="season-heading">
        {q.steps.find((x) => x.field === 'seasons')?.season_texts?.[active]}
      </h2>
      <p>{ui.together}</p>
      <div className="crop-grid">
        {q.crops.map((c) => {
          const selected = current?.some((x) => sameCrop(x, c.id)) ?? false;
          return (
            <button
              className={`crop-tile ${selected ? 'selected' : ''}`}
              aria-pressed={selected}
              key={c.id}
              disabled={atLimit && !selected}
              onClick={() => {
                const next = toggleCrop(current, c.id, q.limits.crops_per_season);
                setCurrent(next.length ? next : null);
              }}
            >
              <span className={`crop-portrait crop-${c.id}`}>
                {c.id === 'maize' || c.id === 'cowpea' ? (
                  <img
                    src={`/images/${c.id}-crop.webp`}
                    width="280"
                    height="220"
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <CropBotanical crop={c.id} />
                )}
              </span>
              <span>{c.label}</span>
              {selected && <Check size={18} />}
            </button>
          );
        })}
        <button
          className={`crop-tile ${current?.length === 0 ? 'selected' : ''}`}
          aria-pressed={current?.length === 0}
          onClick={() => setCurrent([])}
        >
          <span className="crop-icon fallow">
            <Sun />
          </span>
          <span>{q.fallow.label}</span>
        </button>
        <button
          className="crop-tile"
          aria-expanded={customOpen}
          onClick={() => setCustomOpen((v) => !v)}
          disabled={atLimit}
        >
          <Plus size={24} />
          <span>{q.other.label}</span>
        </button>
      </div>
      {atLimit && <p role="status">{ui.cropLimit}</p>}
      {current
        ?.filter((c) => !q.crops.some((x) => sameCrop(x.id, c)))
        .map((c) => (
          <span className="custom-chip" key={c}>
            {c}
            <button
              aria-label={`${ui.remove} ${c}`}
              onClick={() => {
                const next = current.filter((x) => x !== c);
                setCurrent(next.length ? next : null);
              }}
            >
              <X size={16} />
            </button>
          </span>
        ))}
      {customOpen && (
        <form
          className="custom-crop"
          onSubmit={(e) => {
            e.preventDefault();
            const value = custom.trim();
            const known = q.crops.find((c) => sameCrop(c.label, value) || sameCrop(c.id, value));
            if (
              !value ||
              value.length > 40 ||
              current?.some((x) => sameCrop(x, known?.id ?? value))
            ) {
              setError(ui.customError);
              return;
            }
            if (atLimit) return;
            setCurrent([...(current ?? []), known?.id ?? value]);
            setCustom('');
            setCustomOpen(false);
            setError('');
          }}
        >
          <label htmlFor="custom-crop">{q.other.text}</label>
          <div className="input-row">
            <input
              id="custom-crop"
              maxLength={40}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'crop-error' : undefined}
            />
            <button className="button secondary" type="submit">
              {ui.addCrop}
            </button>
          </div>
          {error && (
            <p id="crop-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </>
  );
}
export function Review({
  draft,
  q,
  change,
}: {
  draft: Draft;
  q: Questions;
  change: (n: number, index?: number) => void;
}) {
  const label = (field: string, v: unknown) =>
    q.steps.find((s) => s.field === field)?.options?.find((o) => o.value === v)?.label;
  return (
    <div className="review">
      <ReviewRow title={ui.selectedArea} change={() => change(0)}>
        <p>
          {draft.lga}, {draft.state}
        </p>
        {draft.use_data_from && (
          <p className="notice">
            {ui.dataFrom}: {draft.use_data_from.lga}, {draft.use_data_from.state}
          </p>
        )}
      </ReviewRow>
      <ReviewRow title={ui.history} change={() => change(1)}>
        {draft.seasons.map((c, i) => (
          <p key={i}>
            {i === 0 ? ui.newest : `${ui.season} ${i + 1}`}:{' '}
            {c === null
              ? ui.validation
              : c.length
                ? c.map((x) => q.crops.find((c) => c.id === x)?.label ?? x).join(' + ')
                : q.fallow.label}
          </p>
        ))}
      </ReviewRow>
      <ReviewRow title={ui.priorities} change={() => change(2)}>
        <ol>
          {draft.priorities.map((k) => (
            <li key={k}>
              {
                q.steps.find((s) => s.field === 'priorities')?.options?.find((o) => o.key === k)
                  ?.label
              }
            </li>
          ))}
        </ol>
      </ReviewRow>
      {fieldKeys.map((field, i) => (
        <ReviewRow
          key={field}
          title={q.steps.find((s) => s.field === field)!.text}
          change={() => change(3, i)}
        >
          <p>{field in draft.answers ? label(field, draft.answers[field]) : ui.validation}</p>
        </ReviewRow>
      ))}
    </div>
  );
}
function ReviewRow({
  title,
  change,
  children,
}: {
  title: string;
  change: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="review-row">
      <div>
        <h2>{title}</h2>
        {children}
      </div>
      <button className="text-button" onClick={change}>
        {ui.change}
        <ArrowRight size={16} />
      </button>
    </section>
  );
}
