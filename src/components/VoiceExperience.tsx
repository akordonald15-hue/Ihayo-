'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Mic,
  Square,
  Trash2,
  Leaf,
  ShieldCheck,
  RotateCcw,
  LoaderCircle,
} from 'lucide-react';
import { Client } from '@/lib/api';
import { HttpVoiceClient, type VoiceClient } from '@/lib/voice/client';
import { MAX_MESSAGE_LENGTH, type VoiceResponse } from '@/lib/voice/contract';
import { useConversation } from '@/lib/voice/useConversation';
import { useRecorder } from '@/lib/voice/useRecorder';
import { Brand, Busy } from './shared';
import Results from './Results';
import Ihayo from './Ihayo';
import MicrophoneMeter from './MicrophoneMeter';
import { VoiceConversation, CORRECTION_PREFIX } from './VoiceConversation';

const fields = {
  irrigated: 'Dry-season watering',
  striga: 'Striga',
  waterlogged: 'Standing water',
  enough_workers: 'Enough workers',
  easy_seed: 'Seed access',
  tenure: 'Land ownership',
} as const;
function ExtractedDetails({ response }: { response: VoiceResponse }) {
  const value = (v: unknown) =>
    v === true
      ? 'Yes'
      : v === false
        ? 'No'
        : v === 'own'
          ? 'Owned'
          : v === 'rent'
            ? 'Rented'
            : v === 'borrowed'
              ? 'Borrowed or family land'
              : typeof v === 'string' && v
                ? v
                : 'Not supplied';
  return (
    <section className="voice-details" aria-labelledby="voice-details-heading">
      <h2 id="voice-details-heading">Your farm details</h2>
      <p>
        Check these before opening advice. To correct something, tell Ihayo in your next message.
        Corrections are only confirmed when the service returns updated details.
      </p>
      <dl>
        <div>
          <dt>State</dt>
          <dd>{value(response.state)}</dd>
        </div>
        <div>
          <dt>Local government area</dt>
          <dd>{value(response.lga)}</dd>
        </div>
        <div>
          <dt>Previous crops, newest season first</dt>
          <dd>
            {response.seasons?.length ? (
              <ol>
                {response.seasons.map((season, i) => (
                  <li key={i}>{season.length ? season.join(' + ') : 'Fallow (no crop)'}</li>
                ))}
              </ol>
            ) : (
              'Not supplied'
            )}
          </dd>
        </div>
        <div>
          <dt>Priorities, in order</dt>
          <dd>
            {response.priorities?.length ? (
              <ol>
                {response.priorities.map((p, i) => (
                  <li key={i}>{p.replaceAll('_', ' ')}</li>
                ))}
              </ol>
            ) : (
              'Not supplied'
            )}
          </dd>
        </div>
        {Object.entries(fields).map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{value(response[key])}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function VoiceExperience({ client: injected }: { client?: VoiceClient }) {
  const voice = useMemo(() => injected ?? new HttpVoiceClient(), [injected]);
  const conversation = useConversation(voice);
  const recording = useRecorder();
  const [agriculturalClient] = useState(() => new Client());
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
      }),
  );
  const [message, setMessage] = useState('');
  const [manual, setManual] = useState(false);
  const [manualStarted, setManualStarted] = useState(false);
  const replyHeading = useRef<HTMLHeadingElement>(null);
  const state = conversation.state;
  const busy = state.phase === 'sending';
  const unavailable = state.phase === 'checking' || state.phase === 'unavailable';
  const microphoneActive = recording.status === 'recording' || recording.status === 'requesting';
  useEffect(() => {
    if (!manual) replyHeading.current?.focus();
  }, [state.response, manual]);
  function reset() {
    conversation.startAgain();
    recording.discard();
    setMessage('');
  }
  function showManual() {
    if (busy) conversation.cancel();
    recording.discard();
    conversation.forgetRecording();
    setManualStarted(true);
    setManual(true);
  }
  async function sendText(event: React.FormEvent) {
    event.preventDefault();
    if (microphoneActive || busy || unavailable) return;
    const sent = await conversation.submit({ kind: 'text', message });
    if (sent) {
      setMessage('');
      recording.discard();
    }
  }
  async function sendAudio() {
    if (!recording.audio || busy || unavailable) return;
    const sent = await conversation.submit({
      kind: 'audio',
      audio: recording.audio,
      seconds: recording.seconds,
    });
    if (sent) recording.discard(); // Playback now belongs to the bounded, memory-only conversation.
  }
  async function retry() {
    if (microphoneActive || busy || unavailable) return;
    const sent = await conversation.retry();
    if (sent && !sent.advice_error) {
      recording.discard();
      setMessage('');
    }
  }
  async function correctWords(id: number, words: string) {
    if (microphoneActive || busy || unavailable) return null;
    return conversation.submit({
      kind: 'text',
      message: CORRECTION_PREFIX + words,
      correctionOf: id,
    });
  }
  const micLabel =
    recording.status === 'requesting'
      ? 'Waiting for microphone permission...'
      : recording.audio
        ? 'Record again'
        : 'Start recording';
  return (
    <QueryClientProvider client={queryClient}>
      <div
        className={`voice-flow-pane voice-shell ${state.phase === 'results' ? 'has-results' : ''}`}
        hidden={manual}
      >
        <a className="skip-link" href={state.phase === 'results' ? '#main' : '#voice-main'}>
          Skip to content
        </a>
        <header className="site-header is-product voice-header">
          <a href="/" className="brand-button" aria-label="Leave and clear the conversation">
            <Brand />
          </a>
          <div className="voice-header-links">
            <a href="/">
              Back to Ihayo
              <ArrowRight size={15} />
            </a>
            <span className="country">English · Nigeria</span>
          </div>
        </header>
        {state.phase === 'results' && state.advice ? (
          <>
            <div className="voice-return-bar">
              <button className="text-button" onClick={conversation.review}>
                <ArrowLeft size={18} />
                Review or correct my details
              </button>
              <button className="text-button" onClick={reset}>
                <RotateCcw size={15} />
                Start again
              </button>
            </div>
            <Results
              client={agriculturalClient}
              advice={state.advice}
              request={null}
              onRefresh={conversation.refreshAdvice}
              onRestart={reset}
              onEdit={conversation.review}
            />
          </>
        ) : (
          <main id="voice-main" className="voice-main">
            <div className="voice-heading">
              <p className="eyebrow">
                <span className="voice-dot" />A little perspective for your next season
              </p>
              <h1>
                Tell me about <em>your farm.</em>
              </h1>
              <p>Speak or type. Ihayo will help you explore what to plant next.</p>
            </div>
            <div className="voice-workspace">
              <aside className="voice-land-story" aria-label="Growing together">
                <div className="voice-story-top">
                  <Leaf size={22} />
                  <span>Rooted in your experience.</span>
                </div>
                <div>
                  <p>
                    Your land.
                    <br />
                    Your story.
                    <br />
                    <em>Your next season.</em>
                  </p>
                  <span>Local knowledge, with a wider view.</span>
                </div>
                <span className="voice-photo-note">Illustrative agricultural imagery</span>
              </aside>
              <div className="voice-center">
                {state.phase === 'checking' && (
                  <div className="voice-service-check">
                    <Busy text="Checking the conversation service..." />
                  </div>
                )}
                {state.phase === 'unavailable' && (
                  <section className="voice-unavailable" role="status">
                    <Leaf size={30} />
                    <h2>Talk to Ihayo is unavailable</h2>
                    <p>{state.error}</p>
                    <div className="button-row">
                      <button
                        className="button secondary"
                        onClick={() => void conversation.checkHealth()}
                      >
                        Check service again
                      </button>
                      <button className="button primary" onClick={showManual}>
                        Answer step by step
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </section>
                )}
                {!unavailable && (
                  <>
                    <div className="voice-recorder-heading voice-chat-heading">
                      <span>
                        <Leaf size={16} />A conversation about your farm
                      </span>
                      <span className="voice-live-label">
                        <span className="voice-dot" />
                        {busy
                          ? 'Processing'
                          : microphoneActive
                            ? 'Recording'
                            : 'Ready when you are'}
                      </span>
                    </div>
                    <VoiceConversation
                      turns={state.turns}
                      active={!manual}
                      disabled={busy || microphoneActive}
                      replyRef={replyHeading}
                      onBeginCorrection={conversation.holdAdvice}
                      onCorrect={correctWords}
                      onRemoveAudio={conversation.forgetAudio}
                    />
                    {recording.audio && !busy && (
                      <article
                        className="voice-bubble farmer voice-queued-note"
                        aria-label="Unsent voice note"
                      >
                        <div className="voice-note-label">
                          <Mic size={16} />
                          <strong>Your voice note</strong>
                          <span>Not sent</span>
                        </div>
                        {recording.url && (
                          <audio
                            aria-label="Review your recording"
                            controls
                            preload="metadata"
                            src={recording.url}
                          />
                        )}
                        <div className="voice-draft-footer">
                          <span>
                            {Math.floor(recording.seconds / 60)}:
                            {String(recording.seconds % 60).padStart(2, '0')} · Ready to send
                          </span>
                          <button
                            type="button"
                            className="text-button"
                            aria-label="Delete recording"
                            onClick={() => {
                              recording.discard();
                              conversation.forgetRecording();
                            }}
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      </article>
                    )}
                    <form
                      className="voice-composer voice-chat-composer"
                      aria-label="Speak or type your reply"
                      aria-busy={busy}
                      onSubmit={(event) => {
                        if (recording.audio) {
                          event.preventDefault();
                          void sendAudio();
                        } else {
                          void sendText(event);
                        }
                      }}
                    >
                      {recording.status === 'recording' && (
                        <div className="voice-inline-recording" role="status">
                          <span className="voice-dot" />
                          <span>Recording</span>
                          <MicrophoneMeter stream={recording.stream} />
                          <output aria-label="Recording elapsed time">
                            {Math.floor(recording.seconds / 60)}:
                            {String(recording.seconds % 60).padStart(2, '0')}
                          </output>
                        </div>
                      )}
                      {recording.status === 'requesting' && (
                        <p role="status" className="voice-caption">
                          Allow microphone access in your browser to record.
                        </p>
                      )}
                      <div className="voice-composer-field">
                        <label className="sr-only" htmlFor="voice-message">
                          Or type your reply
                        </label>
                        <textarea
                          id="voice-message"
                          rows={2}
                          maxLength={MAX_MESSAGE_LENGTH}
                          value={message}
                          disabled={busy || microphoneActive || !!recording.audio}
                          onChange={(event) => setMessage(event.target.value)}
                          placeholder={
                            recording.audio
                              ? 'Your voice note is ready to send.'
                              : 'Tell Ihayo about your farm...'
                          }
                        />
                        <div className="voice-composer-toolbar">
                          <span className="voice-composer-hint">
                            {recording.status === 'recording'
                              ? 'Tap stop when you are done'
                              : recording.audio
                                ? 'Review, then press send'
                                : 'Speak or type'}
                          </span>
                          {microphoneActive && (
                            <button
                              type="button"
                              className="text-button voice-cancel-recording"
                              onClick={recording.discard}
                            >
                              Cancel recording
                            </button>
                          )}
                          <button
                            type="button"
                            className={`voice-composer-mic ${recording.status === 'recording' ? 'is-recording' : ''}`}
                            aria-label={
                              recording.status === 'recording' ? 'Stop recording' : micLabel
                            }
                            title={recording.status === 'recording' ? 'Stop recording' : micLabel}
                            disabled={busy || recording.status === 'requesting'}
                            onClick={() => {
                              if (recording.status === 'recording') recording.stop();
                              else {
                                conversation.forgetRecording();
                                void recording.start();
                              }
                            }}
                          >
                            {recording.status === 'requesting' ? (
                              <LoaderCircle size={20} className="voice-spinner" />
                            ) : recording.status === 'recording' ? (
                              <Square size={17} fill="currentColor" />
                            ) : (
                              <Mic size={21} strokeWidth={1.7} />
                            )}
                          </button>
                          <button
                            className="voice-send"
                            type="submit"
                            aria-label={recording.audio ? 'Send recording' : 'Send message'}
                            title={recording.audio ? 'Send recording' : 'Send message'}
                            disabled={
                              busy || microphoneActive || (!recording.audio && !message.trim())
                            }
                          >
                            {busy ? (
                              <LoaderCircle size={20} className="voice-spinner" />
                            ) : (
                              <ArrowUp size={23} />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="voice-composer-disclosure">
                        Voice notes stay on this device until you press Send. Ihayo returns the
                        transcript after sending. Up to 3 minutes · 3.5 MB.
                      </p>
                      {recording.error && (
                        <p role="alert" className="notice">
                          {recording.error}
                        </p>
                      )}
                      {busy && (
                        <div className="voice-processing" role="status">
                          <span className="voice-processing-dots" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                          </span>
                          <span>
                            {recording.audio
                              ? 'Transcribing your voice note and preparing a response...'
                              : 'Preparing your response...'}
                          </span>
                          <button
                            type="button"
                            className="text-button"
                            onClick={conversation.cancel}
                          >
                            Cancel request
                          </button>
                        </div>
                      )}
                      {state.error && (
                        <div className="voice-error" role="alert">
                          <p>{state.error}</p>
                          {conversation.canRetry && (
                            <button
                              type="button"
                              className="button secondary"
                              disabled={busy || microphoneActive}
                              onClick={() => void retry()}
                            >
                              Retry this message
                            </button>
                          )}
                        </div>
                      )}
                    </form>
                  </>
                )}
                <details className="voice-privacy">
                  <summary>
                    <ShieldCheck size={15} />
                    Your privacy & how this works
                  </summary>
                  <p>
                    Only messages you choose to send go to Ihayo's separate conversation service.
                    Audio and messages are held in this tab's memory; leaving, reloading or starting
                    again clears them. Do not include personal contact details.
                  </p>
                  <p>
                    The service returns your transcript after processing the audio. You can then
                    correct the words and review the returned farm details. This is not a
                    transcription-only preview.
                  </p>
                </details>
              </div>
              <aside className="voice-farm-panel">
                <div className="voice-section-label">
                  <Leaf size={17} />
                  Your farm, in focus
                </div>
                {state.response ? (
                  <>
                    {!conversation.question && (
                      <h2 className="voice-summary-title" ref={replyHeading} tabIndex={-1}>
                        {state.advice ? 'Check your farm details' : 'Message received'}
                      </h2>
                    )}
                    <ExtractedDetails response={state.response} />
                  </>
                ) : (
                  <div className="voice-summary-empty">
                    <span className="voice-field-lines" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    <h2>
                      A clearer picture,
                      <br />
                      one detail at a time.
                    </h2>
                    <p>
                      Your location, crop history and priorities will appear here as you tell your
                      story.
                    </p>
                    <ul>
                      <li>Your place</li>
                      <li>Previous seasons</li>
                      <li>What matters to you</li>
                    </ul>
                  </div>
                )}
                {state.adviceStale && (
                  <p className="notice" role="status">
                    Earlier advice is on hold. Send the correct details and review Ihayo's new
                    response before opening planting options.
                  </p>
                )}
                {state.phase === 'review' && state.advice && (
                  <div className="voice-ready">
                    <span className="eyebrow">A little more perspective</span>
                    <h2>Your report is ready to review.</h2>
                    <p>
                      Check your farm details first. Explore the patterns, reasons and important
                      limits together.
                    </p>
                    <button className="button primary" onClick={conversation.showResults}>
                      Open my planting options
                      <ArrowRight size={18} />
                    </button>
                  </div>
                )}
                {state.response?.advice_text && !state.advice && !state.adviceStale && (
                  <details className="voice-text-fallback">
                    <summary>Read the text report supplied by the service</summary>
                    <pre className="voice-text-report">{state.response.advice_text}</pre>
                  </details>
                )}
                <div className="voice-summary-notice">
                  <ShieldCheck size={18} />
                  <p>
                    Perspective, not a prescription. Discuss planting choices with your extension
                    agent.
                  </p>
                </div>
              </aside>
            </div>
            {!unavailable && (
              <div className="voice-actions">
                <button className="text-button" onClick={reset}>
                  <RotateCcw size={15} />
                  Clear conversation and start again
                </button>
                <button className="text-button" onClick={showManual}>
                  Answer step by step
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
            <footer className="voice-footer">
              <span>IHAYO / Growing together.</span>
              <span>Rooted in evidence. Guided by you.</span>
            </footer>
          </main>
        )}
      </div>
      {manualStarted && (
        <div className="voice-flow-pane" hidden={!manual}>
          <div className="voice-return-bar">
            <button className="text-button" onClick={() => setManual(false)}>
              <ArrowLeft size={18} />
              Return to my conversation
            </button>
            <p>
              Your conversation is kept in this tab. Form answers are separate and are not copied
              automatically.
            </p>
          </div>
          <Ihayo isolatedManual voiceAvailable={!unavailable} />
        </div>
      )}
    </QueryClientProvider>
  );
}
