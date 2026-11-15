'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Check, CornerDownRight, Pencil, Trash2, Volume2 } from 'lucide-react';
import type { ConversationTurn } from '@/lib/voice/useConversation';
import { MAX_MESSAGE_LENGTH, type VoiceResponse } from '@/lib/voice/contract';

export const CORRECTION_PREFIX = 'Correction to my earlier voice message: ';
export const CORRECTION_LIMIT = MAX_MESSAGE_LENGTH - CORRECTION_PREFIX.length;

export function VoicePlayback({
  audio,
  active,
  label,
}: {
  audio: Blob;
  active: boolean;
  label: string;
}) {
  const [url, setURL] = useState<string | null>(null);
  const player = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!URL.createObjectURL) return;
    let objectURL: string;
    try {
      objectURL = URL.createObjectURL(audio);
    } catch {
      return;
    }
    setURL(objectURL);
    const revoke = URL.revokeObjectURL;
    return () => {
      if (typeof revoke === 'function') revoke.call(URL, objectURL);
    };
  }, [audio]);
  useEffect(() => {
    if (!active) player.current?.pause();
  }, [active]);
  return url ? (
    <audio ref={player} controls preload="none" src={url} aria-label={label} />
  ) : (
    <p className="voice-caption">
      Playback is unavailable in this browser. You can still review the words below.
    </p>
  );
}

function VoiceNote({
  turn,
  active,
  disabled,
  onBegin,
  onCorrect,
  onRemove,
}: {
  turn: ConversationTurn;
  active: boolean;
  disabled: boolean;
  onBegin: () => void;
  onCorrect: (id: number, words: string) => Promise<VoiceResponse | null>;
  onRemove: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [words, setWords] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing) editor.current?.focus();
  }, [editing]);
  return (
    <>
      <div className="voice-note-label">
        <Volume2 size={17} />
        <strong>Your voice note</strong>
        {turn.seconds != null && (
          <span>
            {Math.floor(turn.seconds / 60)}:{String(turn.seconds % 60).padStart(2, '0')}
          </span>
        )}
      </div>
      {turn.audio ? (
        <div className="voice-note-player">
          <VoicePlayback audio={turn.audio} active={active} label="Play your sent voice note" />
          <button className="text-button" disabled={disabled} onClick={() => onRemove(turn.id)}>
            <Trash2 size={15} />
            Remove audio
          </button>
        </div>
      ) : (
        <p className="voice-caption">
          Audio is no longer held in this tab. Your conversation details are kept.
        </p>
      )}
      {turn.status === 'received' &&
        (turn.transcript ? (
          <div className="voice-transcript">
            <h3>Here&apos;s what Ihayo heard</h3>
            <p className="voice-original-words">{turn.transcript}</p>
            <span className="voice-caption">
              Original transcript from Ihayo. Your message has already been processed.
            </span>
            {!editing ? (
              <button
                className="text-button"
                disabled={disabled}
                onClick={() => {
                  setWords((previous) => previous || turn.transcript!);
                  setEditing(true);
                  onBegin();
                }}
              >
                <Pencil size={15} />
                Correct these words
              </button>
            ) : (
              <form
                className="voice-correction"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (disabled || !words.trim() || words.length > CORRECTION_LIMIT) return;
                  const response = await onCorrect(turn.id, words.trim());
                  if (response) setEditing(false);
                }}
              >
                <label htmlFor={`correct-words-${turn.id}`}>Your corrected words</label>
                <textarea
                  ref={editor}
                  id={`correct-words-${turn.id}`}
                  rows={4}
                  value={words}
                  maxLength={CORRECTION_LIMIT}
                  onChange={(event) => setWords(event.target.value)}
                  disabled={disabled}
                />
                <p className="voice-caption">
                  Earlier advice is on hold. Send your correction, then check the farm details
                  returned by Ihayo.
                </p>
                {words.length > CORRECTION_LIMIT && (
                  <p role="alert">
                    Please shorten your correction to {CORRECTION_LIMIT} characters. Your original
                    words have not been cut.
                  </p>
                )}
                <div className="button-row">
                  <button
                    className="button primary"
                    disabled={disabled || !words.trim() || words.length > CORRECTION_LIMIT}
                    type="submit"
                  >
                    Send correction
                    <CornerDownRight size={16} />
                  </button>
                  <button
                    className="text-button"
                    disabled={disabled}
                    type="button"
                    onClick={() => setEditing(false)}
                  >
                    Keep editing later
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="voice-transcript">
            <h3>No transcript was returned</h3>
            <p>
              We cannot show what Ihayo heard. Record again, or type the correct details below
              before using advice.
            </p>
          </div>
        ))}
    </>
  );
}

export function VoiceConversation({
  turns,
  active,
  disabled,
  replyRef,
  onBeginCorrection,
  onCorrect,
  onRemoveAudio,
}: {
  turns: ConversationTurn[];
  active: boolean;
  disabled: boolean;
  replyRef: RefObject<HTMLHeadingElement | null>;
  onBeginCorrection: () => void;
  onCorrect: (id: number, words: string) => Promise<VoiceResponse | null>;
  onRemoveAudio: (id: number) => void;
}) {
  return (
    <section className="voice-conversation" aria-label="Your conversation">
      <h2 className="voice-section-label">
        <span className="voice-dot" />
        Your conversation<span>One step at a time</span>
      </h2>
      {!turns.length && (
        <div className="voice-welcome-message">
          <span className="voice-avatar">I</span>
          <div>
            <p>
              You know your land.
              <br />
              Let&apos;s start there.
            </p>
            <span>Tell us where you farm and what you grew before.</span>
          </div>
        </div>
      )}
      <div className="voice-thread" aria-live="polite" aria-relevant="additions text">
        {turns.map((turn, index) => (
          <div className="voice-turn" key={turn.id}>
            <article
              className={`voice-bubble farmer ${turn.kind === 'audio' ? 'has-audio' : ''}`}
              aria-label={turn.correctionOf != null ? 'Submitted correction' : 'Your message'}
            >
              <p className="voice-message-author">
                {turn.correctionOf != null ? 'Your submitted correction' : 'You'}
              </p>
              {turn.kind === 'audio' ? (
                <VoiceNote
                  turn={turn}
                  active={active}
                  disabled={disabled}
                  onBegin={onBeginCorrection}
                  onCorrect={onCorrect}
                  onRemove={onRemoveAudio}
                />
              ) : (
                <p>{turn.message}</p>
              )}
              <span className="voice-message-state">
                {turn.status === 'sending' ? (
                  'Sending...'
                ) : turn.status === 'failed' ? (
                  'Not confirmed. Use retry below.'
                ) : turn.status === 'cancelled' ? (
                  'Request cancelled. Receipt is not confirmed.'
                ) : (
                  <>
                    <Check size={12} />
                    Service response received
                  </>
                )}
              </span>
            </article>
            {turn.question && (
              <article className="voice-bubble assistant">
                <p className="voice-message-author">Ihayo</p>
                <h2 tabIndex={-1} ref={index === turns.length - 1 ? replyRef : undefined}>
                  {turn.question}
                </h2>
              </article>
            )}
            {turn.correctionOf != null && turn.status === 'received' && (
              <p className="voice-correction-receipt">
                <Check size={15} />
                Ihayo returned farm details for this correction. Check them before opening advice.
              </p>
            )}
          </div>
        ))}
      </div>
      {turns.length >= 24 && (
        <p className="voice-caption">
          Showing the latest 24 messages. Ihayo still receives your full latest context.
        </p>
      )}
      {turns.some((t) => t.kind === 'audio') && (
        <p className="voice-caption">
          Up to 3 voice notes stay in this tab for playback. Remove audio whenever you wish; leaving
          or starting again clears it.
        </p>
      )}
    </section>
  );
}
