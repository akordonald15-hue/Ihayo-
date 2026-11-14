'use client';
import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { MapPin } from 'lucide-react';
import { Client } from '@/lib/api';
import type { GeoFeature, Place } from '@/lib/types';
import { ui } from '@/lib/copy';
import { Busy, ErrorBox } from './shared';
export default function AreaMap({
  client,
  place,
  from,
  onSelect,
}: {
  client: Client;
  place: Place;
  from: Place | null;
  onSelect?: (p: Place, ready: boolean) => void;
}) {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['map', client.fixture, place.state],
    queryFn: () => client.map(place.state),
    enabled: !!place.state,
    staleTime: Infinity,
  });
  const pattern = useId().replace(/:/g, '');
  if (isPending) return <Busy />;
  if (error) return <ErrorBox message={error.message} retry={() => void refetch()} />;
  const polygons = (f: GeoFeature) =>
    f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const coords = data.features.flatMap((f) => polygons(f).flat(2));
  const xs = coords.map((p) => p[0]),
    ys = coords.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const scale = Math.min(500 / (maxX - minX || 1), 280 / (maxY - minY || 1));
  const px = (x: number) => 30 + (x - minX) * scale,
    py = (y: number) => 310 - (y - minY) * scale;
  const shapes = data.features.map((f) => ({
    f,
    d: polygons(f)
      .map((rings) =>
        rings
          .map((r) => r.map((p, i) => `${i ? 'L' : 'M'}${px(p[0])},${py(p[1])}`).join(' ') + ' Z')
          .join(' '),
      )
      .join(' '),
  }));
  return (
    <div className="area-map">
      <div className="map-caption">
        <MapPin size={19} />
        <strong>{place.state}</strong>
      </div>
      {client.fixture && <p className="fixture-note">{ui.fixture}</p>}
      <svg viewBox="0 0 560 350" role="group" aria-label={`${ui.map}: ${place.state}`}>
        <defs>
          <pattern id={pattern} width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#e9ece8" />
            <path d="M0 8L8 0" stroke="#9aa79f" strokeWidth="1" />
          </pattern>
        </defs>
        {shapes.map(({ f, d }) => {
          const selected = f.properties.lga === place.lga;
          const fallback = from?.state === place.state && from.lga === f.properties.lga;
          return (
            <path
              key={f.properties.lga}
              d={d}
              role={onSelect ? 'button' : 'img'}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={`${f.properties.lga} · ${f.properties.ready ? ui.ready : ui.notReady}`}
              onClick={() =>
                onSelect?.({ state: f.properties.state, lga: f.properties.lga }, f.properties.ready)
              }
              onKeyDown={(e) => {
                if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelect(
                    { state: f.properties.state, lga: f.properties.lga },
                    f.properties.ready,
                  );
                }
              }}
              fill={f.properties.ready ? '#c1d7c4' : `url(#${pattern})`}
              stroke={selected ? '#163c30' : fallback ? '#936318' : '#ffffff'}
              strokeWidth={selected || fallback ? 4 : 2}
              fillRule="evenodd"
            >
              <title>
                {f.properties.lga} · {f.properties.ready ? ui.ready : ui.notReady}
                {selected ? ` · ${ui.selectedArea}` : ''}
                {fallback ? ` · ${ui.fallbackArea}` : ''}
              </title>
            </path>
          );
        })}
      </svg>
      <div className="map-legend">
        <span>
          <i />
          {ui.ready}
        </span>
        <span>
          <i className="hatched" />
          {ui.notReady}
        </span>
      </div>
      <p>{ui.mapNote}</p>
      <div className="map-areas">
        {data.features.map(({ properties: p }) => (
          <button
            key={p.lga}
            className={`map-area ${p.lga === place.lga ? 'selected' : ''}`}
            aria-pressed={p.lga === place.lga}
            disabled={!onSelect}
            onClick={() => onSelect?.({ state: p.state, lga: p.lga }, p.ready)}
          >
            <span>
              {p.lga}
              <small>{p.ready ? ui.ready : ui.notReady}</small>
            </span>
            {p.lga === place.lga && <span className="badge">{ui.selectedArea}</span>}
            {from?.state === p.state && from.lga === p.lga && (
              <span className="badge gold">{ui.fallbackArea}</span>
            )}
          </button>
        ))}
      </div>
      {from && from.state !== place.state && (
        <p className="notice">
          {ui.fallbackArea}: {from.lga}, {from.state}
        </p>
      )}
    </div>
  );
}
