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

export type Submission = { kind: 'text'; message: string } | { kind: 'audio'; audio: Blob };
type Phase = 'checking' | 'unavailable' | 'ready' | 'sending' | 'review' | 'results';
interface State {
  phase: Phase;
  response: VoiceResponse | null;
  advice: Advice | null;
  error: string;
  lastMessage: string;
}
type Action =
  | { type: 'phase'; phase: Phase; error?: string }
  | { type: 'received'; response: VoiceResponse; advice: Advice | null; lastMessage: string }
  | { type: 'reset' }
  | { type: 'refresh'; advice: Advice };
const initial: State = {
  phase: 'checking',
  response: null,
  advice: null,
  error: '',
  lastMessage: '',
};
export function conversationReducer(state: State, action: Action): State {
  if (action.type === 'reset') return { ...initial, phase: 'ready' };
  if (action.type === 'phase') return { ...state, phase: action.phase, error: action.error ?? '' };
  if (action.type === 'refresh') return { ...state, advice: action.advice };
  return {
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
    dispatch({ type: 'phase', phase: 'sending' });
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
        response: result,
        advice: completedVoiceAdvice(result),
        lastMessage: input.kind === 'text' ? input.message : 'Voice message',
      });
      if (!result.advice_error) last.current = null; // Accepted audio is not retained for later turns.
      return result;
    } catch (error) {
      if (version === generation.current)
        dispatch({
          type: 'phase',
          phase: 'ready',
          error:
            error instanceof VoiceError
              ? error.message
              : 'We could not send this message. Your earlier details are kept so you can retry.',
        });
      return null;
    } finally {
      if (version === generation.current) {
        busy.current = false;
        request.current = null;
      }
    }
  }
  function cancel() {
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
    refreshAdvice: (advice: Advice) => dispatch({ type: 'refresh', advice }),
    question: useMemo(() => state.response?.clarifying_question?.trim() || null, [state.response]),
  };
}
