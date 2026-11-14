'use client';
import { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, X } from 'lucide-react';
import { Client } from '@/lib/api';
import { ui } from '@/lib/copy';
import { safeURL } from '@/lib/model';
import { Busy, ErrorBox, Lines } from './shared';
export default function EvidenceSheet({
  client,
  id,
  onClose,
}: {
  client: Client;
  id: string;
  onClose: () => void;
}) {
  const trigger = useRef<HTMLElement | null>(
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement),
  );
  const {
    data: d,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['evidence', client.fixture, id],
    queryFn: () => client.evidence(id),
    staleTime: Infinity,
  });
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content
          className="sheet"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            trigger.current?.focus();
          }}
        >
          <div className="sheet-top">
            <p className="eyebrow">{ui.evidenceTitle}</p>
            <Dialog.Close className="icon-button" aria-label={ui.close}>
              <X />
            </Dialog.Close>
          </div>
          <Dialog.Title>{d?.card.plain_name ?? ui.evidenceTitle}</Dialog.Title>
          <Dialog.Description>{d?.note ?? ui.loading}</Dialog.Description>
          {isPending ? (
            <Busy />
          ) : error ? (
            <ErrorBox message={error.message} retry={() => void refetch()} />
          ) : (
            d && (
              <>
                <Lines
                  values={[
                    d.card.what_it_is,
                    d.card.may_help,
                    d.card.watch_out,
                    d.card.ask,
                    d.card.where_tested,
                    d.card.measured_with,
                  ]}
                />
                <h3>{ui.evidenceClaims}</h3>
                {!d.evidence.length && <p>{ui.noEvidence}</p>}
                {d.evidence.map((row, i) => (
                  <article className="evidence-row" key={row.evidence_id || i}>
                    <span className="badge">
                      {row.confidence} ·{' '}
                      {ui.confidence[row.confidence as keyof typeof ui.confidence] ??
                        row.confidence}
                    </span>
                    <h4>{row.evidence_type}</h4>
                    <p>{row.statement_or_value}</p>
                    <p className="muted">{row.reference}</p>
                    {(row.quote || row.locator || row.direction) && (
                      <details>
                        <summary>{ui.information}</summary>
                        {row.quote && <blockquote>{row.quote}</blockquote>}
                        <Lines values={[row.locator, row.direction]} />
                      </details>
                    )}
                    {d.sources
                      .filter((s) =>
                        row.source_id
                          .split(/[\/,;]/)
                          .map((x) => x.trim())
                          .includes(s.source_id),
                      )
                      .map((s) => (
                        <p key={s.source_id}>
                          {safeURL(s.url) ? (
                            <a href={safeURL(s.url)!} target="_blank" rel="noopener noreferrer">
                              {s.citation}
                              <ExternalLink size={15} />
                            </a>
                          ) : (
                            s.citation
                          )}
                        </p>
                      ))}
                  </article>
                ))}
                <h3>{ui.evidenceMissing}</h3>
                <p>{d.option.information_gaps}</p>
                <h3>{ui.evidenceRisks}</h3>
                <p>{d.option.risks_for_local_review}</p>
                <h3>{ui.evidenceReview}</h3>
                <Lines values={[d.option.who_should_review, d.option.farmer_judgment_note]} />
                <details>
                  <summary>{ui.information}</summary>
                  <Lines
                    values={[
                      d.option.why_suggested,
                      d.option.benefits,
                      d.option.context,
                      d.option.readiness,
                      d.option.applies_to_region,
                      d.option.pattern,
                      d.option.crops,
                    ]}
                  />
                </details>
                <h3>{ui.sources}</h3>
                {d.sources.map((s) => (
                  <article key={s.source_id}>
                    <p>
                      {safeURL(s.url) ? (
                        <a target="_blank" rel="noopener noreferrer" href={safeURL(s.url)!}>
                          {s.citation}
                          <ExternalLink size={16} />
                        </a>
                      ) : (
                        s.citation
                      )}
                    </p>
                    {s.licence_or_terms && <p>{s.licence_or_terms}</p>}
                  </article>
                ))}
              </>
            )
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
