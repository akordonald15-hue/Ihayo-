'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Mic, Send, Square, Trash2 } from 'lucide-react';
import { Client } from '@/lib/api';
import { HttpVoiceClient, type VoiceClient } from '@/lib/voice/client';
import { MAX_MESSAGE_LENGTH, type VoiceResponse } from '@/lib/voice/contract';
import { useConversation } from '@/lib/voice/useConversation';
import { useRecorder } from '@/lib/voice/useRecorder';
import { Brand, Busy } from './shared';
import Results from './Results';
import Ihayo from './Ihayo';

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
  const input = useRef<HTMLTextAreaElement>(null);
  const replyHeading = useRef<HTMLHeadingElement>(null);
  const state = conversation.state;
  useEffect(() => {
    if (!manual) replyHeading.current?.focus();
  }, [state.response, manual]);
  const busy = state.phase === 'sending';
  const unavailable = state.phase === 'checking' || state.phase === 'unavailable';
  const microphoneActive = recording.status === 'recording' || recording.status === 'requesting';
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
    const sent = await conversation.submit({ kind: 'audio', audio: recording.audio });
    if (sent && !sent.advice_error) recording.discard();
  }
  async function retry() {
    if (microphoneActive || busy || unavailable) return;
    const sent = await conversation.retry();
    if (sent && !sent.advice_error) {
      recording.discard();
      setMessage('');
    }
  }
  return (
    <QueryClientProvider client={queryClient}>
      <div className="voice-flow-pane" hidden={manual}>
        <a className="skip-link" href={state.phase === 'results' ? '#main' : '#voice-main'}>
          Skip to content
        </a>
        <header className="site-header is-product">
          <a href="/" className="brand-button" aria-label="Leave and clear the conversation">
            <Brand />
          </a>
          <span className="country">English · Nigeria</span>
        </header>
        {state.phase === 'results' && state.advice ? (
          <>
            <div className="voice-return-bar">
              <button className="text-button" onClick={conversation.review}>
                <ArrowLeft size={18} />
                Review or correct my details
              </button>
              <button className="text-button" onClick={reset}>
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
              <p className="eyebrow">Talk to Ihayo</p>
              <h1>Tell me about your farm.</h1>
              <p>
                You can speak or type. Start by telling us where your farm is and what you planted
                before.
              </p>
              <p className="voice-privacy">
                Messages go to the separate conversation service only when you press Send. Your
                conversation and recordings stay in this tab's memory; leaving or reloading clears
                them. Do not include personal contact details.
              </p>
            </div>
            {state.phase === 'checking' && <Busy text="Checking the conversation service…" />}
            {state.phase === 'unavailable' && (
              <section className="voice-unavailable" role="status">
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
                {conversation.question && (
                  <section className="voice-question" aria-labelledby="voice-question">
                    <p>From Ihayo</p>
                    <h2 id="voice-question" ref={replyHeading} tabIndex={-1}>
                      {conversation.question}
                    </h2>
                  </section>
                )}
                {state.response &&
                  !conversation.question &&
                  state.phase !== 'review' &&
                  !state.advice &&
                  !state.error && (
                    <p className="notice">
                      The service did not return a follow-up question. Your details are kept; you
                      can add more information or try again.
                    </p>
                  )}
                {state.response && !conversation.question && (
                  <h2 ref={replyHeading} tabIndex={-1}>
                    {state.advice ? 'Check your farm details' : 'Message received'}
                  </h2>
                )}
                {state.lastMessage && (
                  <details className="voice-last-message">
                    <summary>Your last message</summary>
                    <p>{state.lastMessage}</p>
                  </details>
                )}
                {state.response && <ExtractedDetails response={state.response} />}
                {state.phase === 'review' && state.advice && (
                  <div className="voice-ready">
                    <h2>Your report is ready to review.</h2>
                    <p>
                      Check the extracted details above, or send a correction below before opening
                      your planting options.
                    </p>
                    <button className="button primary" onClick={conversation.showResults}>
                      Open my planting options
                      <ArrowRight size={18} />
                    </button>
                  </div>
                )}
                <section
                  className="voice-input"
                  aria-label="Speak or type your reply"
                  aria-busy={busy}
                >
                  <div className="voice-recording-controls">
                    {recording.status === 'recording' ? (
                      <button className="button voice-stop" onClick={recording.stop}>
                        <Square size={20} />
                        Stop recording
                      </button>
                    ) : (
                      <button
                        className="button primary"
                        disabled={busy || recording.status === 'requesting'}
                        onClick={() => {
                          conversation.forgetRecording();
                          void recording.start();
                        }}
                      >
                        <Mic size={22} />
                        {recording.status === 'requesting'
                          ? 'Waiting for microphone permission…'
                          : recording.audio
                            ? 'Record again'
                            : 'Start recording'}
                      </button>
                    )}
                    {microphoneActive && (
                      <button className="text-button" onClick={recording.discard}>
                        Cancel recording
                      </button>
                    )}
                    <p role="status" aria-live="polite">
                      {recording.status === 'recording'
                        ? 'Recording is on.'
                        : recording.status === 'requesting'
                          ? 'Your browser will ask for microphone permission.'
                          : recording.status === 'review'
                            ? 'Recording stopped. Review before sending.'
                            : 'Microphone is off.'}
                    </p>
                    {recording.status === 'recording' && (
                      <output aria-label="Recording elapsed time" className="voice-timer">
                        {Math.floor(recording.seconds / 60)}:
                        {String(recording.seconds % 60).padStart(2, '0')}
                      </output>
                    )}
                  </div>
                  <p className="voice-recording-limit">
                    Keep each recording under 3 minutes and 3.5 MB. You can always type instead.
                  </p>
                  {recording.error && (
                    <p role="alert" className="notice">
                      {recording.error}
                    </p>
                  )}
                  {recording.audio && (
                    <div className="voice-audio-review">
                      {recording.url && (
                        <audio
                          aria-label="Review your recording"
                          controls
                          preload="metadata"
                          src={recording.url}
                        />
                      )}
                      <div className="button-row">
                        <button
                          className="button primary"
                          disabled={busy}
                          onClick={() => void sendAudio()}
                        >
                          <Send size={18} />
                          Send recording
                        </button>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => {
                            recording.discard();
                            conversation.forgetRecording();
                          }}
                        >
                          <Trash2 size={18} />
                          Delete recording
                        </button>
                      </div>
                    </div>
                  )}
                  <form onSubmit={(event) => void sendText(event)}>
                    <label htmlFor="voice-message">Or type your reply</label>
                    <textarea
                      ref={input}
                      id="voice-message"
                      rows={4}
                      maxLength={MAX_MESSAGE_LENGTH}
                      value={message}
                      disabled={busy || microphoneActive}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="My farm is in…"
                    />
                    <button
                      className="button primary"
                      type="submit"
                      disabled={busy || microphoneActive || !message.trim()}
                    >
                      <Send size={18} />
                      Send message
                    </button>
                  </form>
                  {busy && (
                    <div className="voice-processing">
                      <Busy text="Sending and processing your message…" />
                      <button className="text-button" onClick={conversation.cancel}>
                        Cancel request
                      </button>
                    </div>
                  )}
                </section>
                {state.error && (
                  <div className="voice-error" role="alert">
                    <p>{state.error}</p>
                    {conversation.canRetry && (
                      <button
                        className="button secondary"
                        disabled={busy || microphoneActive}
                        onClick={() => void retry()}
                      >
                        Retry this message
                      </button>
                    )}
                  </div>
                )}
                {state.response?.advice_text && !state.advice && (
                  <details>
                    <summary>Read the text report supplied by the service</summary>
                    <pre className="voice-text-report">{state.response.advice_text}</pre>
                  </details>
                )}
                <div className="voice-actions">
                  <button className="text-button" onClick={reset}>
                    Clear conversation and start again
                  </button>
                  <button className="text-button" onClick={showManual}>
                    Answer step by step
                    <ArrowRight size={18} />
                  </button>
                </div>
              </>
            )}
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
