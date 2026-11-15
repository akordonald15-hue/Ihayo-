'use client';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Advice } from '@/lib/types';
import type { VoiceClient } from './client';
import {
  completedVoiceAdvice,
  parseVoiceResponse,
  VoiceError,
  type VoiceResponse,
} from './contract';

export type Submission =
  | { kind: 'text'; message: string; correctionOf?: number }
  | { kind: 'audio'; audio: Blob; seconds?: number };
type Phase = 'checking' | 'unavailable' | 'ready' | 'sending' | 'review' | 'results';
export interface ConversationTurn {
  id: number;
  kind: 'text' | 'audio';
  message: string;
  audio?: Blob;
  seconds?: number;
  correctionOf?: number;
  status: 'sending' | 'received' | 'failed' | 'cancelled';
  transcript?: string;
  question?: string;
}
// Keep the conversation lightweight without changing authoritative API context.
function boundTurns(turns: ConversationTurn[]) {
  let audioCount = 0;
  return turns
    .slice(-24)
    .reverse()
    .map((turn) => {
      if (!turn.audio || ++audioCount <= 3) return turn;
      return { ...turn, audio: undefined };
    })
    .reverse();
}
interface State {
  phase: Phase;
  response: VoiceResponse | null;
  advice: Advice | null;
  error: string;
  lastMessage: string;
  turns: ConversationTurn[];
  adviceStale: boolean;
}
type Action =
  | { type: 'phase'; phase: Phase; error?: string }
  | {
      type: 'received';
      id: number;
      response: VoiceResponse;
      advice: Advice | null;
      lastMessage: string;
    }
  | { type: 'sending'; turn: ConversationTurn }
  | { type: 'settled'; id: number; status: 'failed' | 'cancelled' }
  | { type: 'holdAdvice' }
  | { type: 'forgetAudio'; id: number }
  | { type: 'reset' }
  | { type: 'refresh'; advice: Advice };
const initial: State = {
  phase: 'checking',
  response: null,
  advice: null,
  error: '',
  lastMessage: '',
  turns: [],
  adviceStale: false,
};
export function conversationReducer(state: State, action: Action): State {
  if (action.type === 'holdAdvice')
    return { ...state, advice: null, adviceStale: true, phase: 'ready' };
  if (action.type === 'forgetAudio')
    return {
      ...state,
      turns: state.turns.map((t) => (t.id === action.id ? { ...t, audio: undefined } : t)),
    };
  if (action.type === 'settled')
    return {
      ...state,
      turns: state.turns.map((t) => (t.id === action.id ? { ...t, status: action.status } : t)),
    };
  if (action.type === 'sending')
    return {
      ...state,
      phase: 'sending',
      advice: null,
      adviceStale: state.adviceStale || !!state.advice,
      error: '',
      turns: boundTurns([...state.turns, action.turn]),
    };
  if (action.type === 'reset') return { ...initial, phase: 'ready' };
  if (action.type === 'phase') return { ...state, phase: action.phase, error: action.error ?? '' };
  if (action.type === 'refresh') return { ...state, advice: action.advice };
  return {
    turns: state.turns.map((t) =>
      t.id === action.id
        ? {
            ...t,
            status: 'received',
            transcript: action.response.transcript?.trim() || undefined,
            question: action.response.clarifying_question?.trim() || undefined,
          }
        : t,
    ),
    adviceStale: state.adviceStale && !action.advice,
    phase: action.advice ? 'review' : 'ready',
    response: action.response,
    advice: action.advice,
    lastMessage: action.lastMessage,
    error: action.response.advice_error
      ? 'Your details were received, but the service could not prepare advice. You can retry this message or send a correction.'
      : action.response.confidence === 'complete' && !action.advice
        ? 'The service did not return a compatible, complete report. Your details are kept. You can continue the conversation or read the supplied text report.'
        : '',
  };
}
export function useConversation(client: VoiceClient) {
  const [state, dispatch] = useReducer(conversationReducer, initial);
  const current = useRef<VoiceResponse | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const available = useRef(false);
  const last = useRef<Submission | null>(null);
  const invalidate = useCallback(() => {
    generation.current++;
    request.current?.abort();
    request.current = null;
    busy.current = false;
  }, []);
  const checkHealth = useCallback(async () => {
    invalidate();
    available.current = false;
    dispatch({ type: 'phase', phase: 'checking' });
    const version = generation.current;
    const controller = new AbortController();
    request.current = controller;
    try {
      await client.health(controller.signal);
      if (version === generation.current) {
        available.current = true;
        dispatch({ type: 'phase', phase: 'ready' });
      }
    } catch (error) {
      if (version === generation.current)
        dispatch({
          type: 'phase',
          phase: 'unavailable',
          error:
            error instanceof VoiceError
              ? error.message
              : 'The conversation service is unavailable. Please answer step by step.',
        });
    }
  }, [client, invalidate]);
  useEffect(() => {
    void checkHealth();
    return () => {
      invalidate();
      current.current = null;
      last.current = null;
    };
  }, [checkHealth, invalidate]);
  async function submit(input: Submission) {
    if (busy.current || !available.current) return null;
    busy.current = true;
    last.current = input;
    const version = ++generation.current;
    const controller = new AbortController();
    request.current = controller;
    dispatch({
      type: 'sending',
      turn: {
        id: version,
        kind: input.kind,
        message: input.kind === 'text' ? input.message : 'Voice message',
        ...(input.kind === 'audio'
          ? { audio: input.audio, seconds: input.seconds }
          : { correctionOf: input.correctionOf }),
        status: 'sending',
      },
    });
    try {
      const result = parseVoiceResponse(
        await (input.kind === 'text'
          ? client.text(input.message, current.current, controller.signal)
          : client.audio(input.audio, current.current, controller.signal)),
      );
      if (version !== generation.current) return null;
      current.current = result;
      dispatch({
        type: 'received',
        id: version,
        response: result,
        advice: completedVoiceAdvice(result),
        lastMessage: input.kind === 'text' ? input.message : 'Voice message',
      });
      if (!result.advice_error) last.current = null; // Accepted audio is not retained for later turns.
      return result;
    } catch (error) {
      if (version === generation.current) {
        dispatch({ type: 'settled', id: version, status: 'failed' });
        dispatch({
          type: 'phase',
          phase: 'ready',
          error:
            error instanceof VoiceError
              ? error.message
              : 'We could not send this message. Your earlier details are kept so you can retry.',
        });
      }
      return null;
    } finally {
      if (version === generation.current) {
        busy.current = false;
        request.current = null;
      }
    }
  }
  function cancel() {
    dispatch({ type: 'settled', id: generation.current, status: 'cancelled' });
    invalidate();
    dispatch({
      type: 'phase',
      phase: available.current ? 'ready' : 'unavailable',
      error:
        'Request cancelled. Your collected details are kept. The service may already have processed the message; retry only when you want to send it again.',
    });
  }
  function startAgain() {
    invalidate();
    current.current = null;
    last.current = null;
    dispatch({ type: 'reset' });
    if (!available.current) void checkHealth();
  }
  return {
    state,
    submit,
    checkHealth,
    cancel,
    startAgain,
    canRetry: !!last.current,
    retry: () => (last.current ? submit(last.current) : Promise.resolve(null)),
    forgetRecording: () => {
      if (last.current?.kind === 'audio') last.current = null;
    },
    showResults: () => {
      if (state.advice) dispatch({ type: 'phase', phase: 'results' });
    },
    review: () => dispatch({ type: 'phase', phase: state.advice ? 'review' : 'ready' }),
    holdAdvice: () => dispatch({ type: 'holdAdvice' }),
    forgetAudio: (id: number) => {
      if (
        last.current?.kind === 'audio' &&
        state.turns.find((t) => t.id === id)?.audio === last.current.audio
      )
        last.current = null;
      dispatch({ type: 'forgetAudio', id });
    },
    refreshAdvice: (advice: Advice) => dispatch({ type: 'refresh', advice }),
    question: useMemo(() => state.response?.clarifying_question?.trim() || null, [state.response]),
  };
}
