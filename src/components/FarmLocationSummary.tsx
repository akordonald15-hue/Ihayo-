import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import type { Place } from '@/lib/types';

/** Same presentational card in the real selector and the labelled landing preview. */
export default function FarmLocationSummary({
  place,
  availability,
  onChange,
  focusOnMount = false,
  headingAs: Heading = 'h2',
}: {
  place: Place;
  availability: string;
  onChange?: () => void;
  focusOnMount?: boolean;
  headingAs?: 'h2' | 'h4';
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) heading.current?.focus();
  }, [focusOnMount]);
  return (
    <section className="farm-location-summary" aria-label="Your farm location">
      <div className="location-summary-heading">
        <MapPin size={22} aria-hidden="true" />
        <Heading ref={heading} tabIndex={-1}>
          Your farm location
        </Heading>
      </div>
      <dl>
        <div>
          <dt>State</dt>
          <dd>{place.state}</dd>
        </div>
        <div>
          <dt>LGA</dt>
          <dd>{place.lga}</dd>
        </div>
        <div>
          <dt>Data availability</dt>
          <dd>{availability}</dd>
        </div>
      </dl>
      {onChange && (
        <button className="text-button" onClick={onChange}>
          Change location
        </button>
      )}
    </section>
  );
}
