import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, Client } from '@/lib/api';
import { questions, makeAdvice, fixtureRequest } from '@/lib/fixtures';
import { emptyDraft, toRequest } from '@/lib/model';
import {
  completedVoiceAdvice,
  parseVoiceResponse,
  VoiceError,
  validateAudio,
  type VoiceResponse,
} from '@/lib/voice/contract';
import { HttpVoiceClient, type VoiceClient } from '@/lib/voice/client';
import { useConversation } from '@/lib/voice/useConversation';
import VoiceExperience from '@/components/VoiceExperience';

const body = toRequest(
  {
    ...emptyDraft(),
    state: 'Kaduna',
    lga: 'Kajuru',
    seasons: [['maize']],
    priorities: ['water'],
    answers: {
      irrigated: false,
      striga: null,
      waterlogged: false,
      enough_workers: null,
      easy_seed: true,
      tenure: 'own',
    },
  },
  questions,
);
const report = makeAdvice(body);
const partial: VoiceResponse = {
  confidence: 'partial',
  state: 'Kaduna',
  lga: null,
  seasons: [['maize']],
  priorities: ['water'],
  clarifying_question: 'Which local government area is your farm in?',
  missing: ['lga'],
  service_context: { keep: ['every', 'key'] },
};
const complete: VoiceResponse = {
  ...body,
  confidence: 'complete',
  missing: [],
  advice_page: report.page,
  advice_text: report.text,
  advice_id: report.advice_id,
};
function fake(): VoiceClient {
  return {
    health: vi.fn().mockResolvedValue(undefined),
    text: vi.fn().mockResolvedValue(partial),
    audio: vi.fn().mockResolvedValue(partial),
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('voice contract and HTTP adapter', () => {
  it('retains unknown context keys and refuses malformed known fields', () => {
    expect(parseVoiceResponse(partial)).toBe(partial);
    expect(() => parseVoiceResponse({ confidence: 'probably' })).toThrow(VoiceError);
    expect(() => parseVoiceResponse({ ...partial, seasons: 'maize' })).toThrow(VoiceError);
    expect(() => parseVoiceResponse({ ...partial, irrigated: 'yes' })).toThrow(VoiceError);
    expect(() => parseVoiceResponse({ ...partial, priorities: ['invented-priority'] })).toThrow(
      VoiceError,
    );
  });
  it('only produces advice for compatible complete data, preserving every scientific statement', () => {
    expect(completedVoiceAdvice(complete)?.page).toBe(report.page);
    expect(completedVoiceAdvice({ ...complete, confidence: 'partial' })).toBeNull();
    expect(completedVoiceAdvice({ ...complete, advice_error: 'failure' })).toBeNull();
    expect(completedVoiceAdvice({ ...complete, state: null })).toBeNull();
    expect(
      completedVoiceAdvice({ ...complete, advice_page: { ...report.page, unknown: null } }),
    ).toBeNull();
    expect(completedVoiceAdvice({ ...complete, lga: 'Different area' })).toBeNull();
  });
  it('uses separate same-origin paths and sends the entire prior response as context', async () => {
    const transport = vi.fn().mockResolvedValue(Response.json(partial));
    const client = new HttpVoiceClient(transport);
    await client.text('Kajuru', partial, new AbortController().signal);
    expect(transport.mock.calls[0][0]).toBe('/api/voice/text');
    expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual({
      message: 'Kajuru',
      context: partial,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('uploads the real MIME/extension with multipart context, without a manually set boundary', async () => {
    const transport = vi.fn().mockResolvedValue(Response.json(partial));
    await new HttpVoiceClient(transport).audio(
      new Blob(['sound'], { type: 'audio/webm;codecs=opus' }),
      partial,
      new AbortController().signal,
    );
    const init = transport.mock.calls[0][1];
    expect(transport.mock.calls[0][0]).toBe('/api/voice/audio');
    expect(init.headers).toBeUndefined();
    expect(init.body.get('audio').name).toBe('farm-recording.webm');
    expect(JSON.parse(init.body.get('context'))).toEqual(partial);
  });
  it('rejects empty, oversized and unsupported audio before uploading', () => {
    expect(() => validateAudio(new Blob([], { type: 'audio/webm' }))).toThrow(VoiceError);
    expect(() =>
      validateAudio(new Blob([new Uint8Array(3_500_001)], { type: 'audio/webm' })),
    ).toThrow(VoiceError);
    expect(() => validateAudio(new Blob(['x'], { type: 'text/plain' }))).toThrow(VoiceError);
  });
  it('handles non-JSON errors and never silently retries a failed audio submission', async () => {
    const transport = vi.fn().mockRejectedValue(new TypeError('network'));
    await expect(
      new HttpVoiceClient(transport).audio(
        new Blob(['sound'], { type: 'audio/ogg' }),
        partial,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'network' });
    expect(transport).toHaveBeenCalledTimes(1);
    await expect(
      new HttpVoiceClient(
        vi.fn().mockResolvedValue(new Response('<html>error</html>', { status: 502 })),
      ).text('hello', null, new AbortController().signal),
    ).rejects.toMatchObject({ code: 'invalid_response' });
  });
  it('cancels the actual fetch and reports timeout distinctly', async () => {
    vi.useFakeTimers();
    try {
      const transport = vi.fn(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) =>
            init.signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            ),
          ),
      );
      const operation = new HttpVoiceClient(transport).text(
        'hello',
        null,
        new AbortController().signal,
      );
      const assertion = expect(operation).rejects.toMatchObject({ code: 'timeout' });
      await vi.advanceTimersByTimeAsync(65000);
      await assertion;
      expect(transport).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('conversation controller', () => {
  it('carries context across partial and unclear turns, then waits for review before displaying advice', async () => {
    const client = fake();
    vi.mocked(client.text)
      .mockResolvedValueOnce(partial)
      .mockResolvedValueOnce({
        ...partial,
        confidence: 'unclear',
        clarifying_question: 'Please confirm the area.',
      })
      .mockResolvedValueOnce(complete);
    const { result } = renderHook(() => useConversation(client));
    await waitFor(() => expect(result.current.state.phase).toBe('ready'));
    await act(async () => {
      await result.current.submit({ kind: 'text', message: 'My farm is in Kaduna' });
    });
    expect(result.current.question).toBe(partial.clarifying_question);
    await act(async () => {
      await result.current.submit({ kind: 'text', message: 'Kajuru' });
    });
    expect(vi.mocked(client.text).mock.calls[1][1]).toEqual(partial);
    const previous = result.current.state.response;
    await act(async () => {
      await result.current.submit({ kind: 'text', message: 'Yes, Kajuru' });
    });
    expect(vi.mocked(client.text).mock.calls[2][1]).toEqual(previous);
    expect(result.current.state.phase).toBe('review');
    act(() => result.current.showResults());
    expect(result.current.state.phase).toBe('results');
  });
  it('prevents duplicates and ignores late responses after start again or cancellation', async () => {
    const client = fake();
    const pending = deferred<VoiceResponse>();
    vi.mocked(client.text).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useConversation(client));
    await waitFor(() => expect(result.current.state.phase).toBe('ready'));
    let first: Promise<VoiceResponse | null>;
    act(() => {
      first = result.current.submit({ kind: 'text', message: 'farm' });
      void result.current.submit({ kind: 'text', message: 'duplicate' });
    });
    expect(client.text).toHaveBeenCalledTimes(1);
    const signal = vi.mocked(client.text).mock.calls[0][2];
    act(() => result.current.startAgain());
    expect(signal.aborted).toBe(true);
    await act(async () => {
      pending.resolve(complete);
      await first!;
    });
    expect(result.current.state.response).toBeNull();
    expect(result.current.state.phase).toBe('ready');
  });
  it('keeps valid context on upload failure and malformed replies, with an explicit retry', async () => {
    const client = fake();
    vi.mocked(client.text).mockResolvedValue(partial);
    vi.mocked(client.audio)
      .mockRejectedValueOnce(new VoiceError('network', 'Upload failed'))
      .mockResolvedValueOnce({ confidence: 'bad' } as unknown as VoiceResponse)
      .mockResolvedValueOnce(complete);
    const { result } = renderHook(() => useConversation(client));
    await waitFor(() => expect(result.current.state.phase).toBe('ready'));
    await act(async () => {
      await result.current.submit({ kind: 'text', message: 'Kaduna' });
    });
    await act(async () => {
      await result.current.submit({
        kind: 'audio',
        audio: new Blob(['sound'], { type: 'audio/webm' }),
      });
    });
    expect(result.current.state.response).toEqual(partial);
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.state.response).toEqual(partial);
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.state.phase).toBe('review');
    expect(vi.mocked(client.audio).mock.calls.every((call) => call[1] === partial)).toBe(true);
  });
  it('retains extracted data when advice fails and retries with the latest authoritative context', async () => {
    const client = fake();
    const failed = { ...complete, advice_error: 'internal provider failure' };
    vi.mocked(client.text).mockResolvedValueOnce(failed).mockResolvedValueOnce(complete);
    const { result } = renderHook(() => useConversation(client));
    await waitFor(() => expect(result.current.state.phase).toBe('ready'));
    await act(async () => {
      await result.current.submit({ kind: 'text', message: 'My farm details' });
    });
    expect(result.current.state.advice).toBeNull();
    expect(result.current.state.response).toEqual(failed);
    await act(async () => {
      await result.current.retry();
    });
    expect(vi.mocked(client.text).mock.calls[1][1]).toEqual(failed);
    expect(result.current.state.phase).toBe('review');
  });
});

describe('farmer conversation UI', () => {
  it('preserves authoritative conversation context across the independent manual fallback', async () => {
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = new URL(String(input), 'https://test.invalid').pathname;
      const start =
        path.indexOf('/health') >= 0
          ? '/health'
          : path.includes('/meta/questions')
            ? '/meta/questions?language=en'
            : '/places/states';
      return Response.json(await fixtureRequest(start));
    });
    const u = userEvent.setup();
    const client = fake();
    render(<VoiceExperience client={client} />);
    await screen.findByRole('button', { name: 'Start recording' });
    await u.type(screen.getByRole('textbox'), 'Kaduna maize');
    await u.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByRole('heading', { name: partial.clarifying_question! });
    await u.click(screen.getByRole('button', { name: 'Answer step by step' }));
    await screen.findByRole('heading', { name: 'Where is your farm?' });
    expect(screen.queryByRole('heading', { name: partial.clarifying_question! })).toBeNull();
    await u.click(screen.getByRole('button', { name: 'Return to my conversation' }));
    expect(screen.getByRole('heading', { name: partial.clarifying_question! })).toBeVisible();
    await u.type(screen.getByRole('textbox'), 'Kajuru');
    await u.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(client.text).toHaveBeenCalledTimes(2));
    expect(vi.mocked(client.text).mock.calls[1][1]).toEqual(partial);
    expect(sessionStorage.getItem('ihayo-session-v1')).toBeNull();
    expect(transport).toHaveBeenCalled();
  });
  it('shows unavailable service and preserves the working manual alternative', async () => {
    const client = fake();
    vi.mocked(client.health).mockRejectedValue(
      new VoiceError('not_configured', 'Talk to Ihayo is not available yet.'),
    );
    render(<VoiceExperience client={client} />);
    await screen.findByRole('heading', { name: 'Talk to Ihayo is unavailable' });
    expect(screen.queryByRole('button', { name: 'Start recording' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Answer step by step' })).toBeEnabled();
    expect(client.text).not.toHaveBeenCalled();
  });
  it('sends corrections to the service, shows updated review, reuses results and never persists the conversation', async () => {
    const u = userEvent.setup();
    const client = fake();
    vi.mocked(client.text).mockResolvedValueOnce(partial).mockResolvedValueOnce(complete);
    render(<VoiceExperience client={client} />);
    await screen.findByRole('button', { name: 'Start recording' });
    await u.type(screen.getByRole('textbox', { name: 'Or type your reply' }), 'Kaduna maize farm');
    await u.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByRole('heading', { name: partial.clarifying_question! });
    await u.type(screen.getByRole('textbox'), 'Correction: the LGA is Kajuru');
    await u.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByRole('button', { name: 'Open my planting options' });
    expect(vi.mocked(client.text).mock.calls[1][1]).toEqual(partial);
    expect(screen.getByText('Kajuru')).toBeVisible();
    expect(sessionStorage.getItem('ihayo-session-v1')).toBeNull();
    await u.click(screen.getByRole('button', { name: 'Open my planting options' }));
    expect(screen.getByRole('heading', { name: report.page.title })).toBeVisible();
    expect(screen.getByText(report.page.intro[1])).toBeVisible();
  });
  it('does not expose provider errors or pass incompatible pages into results', async () => {
    const client = fake();
    vi.mocked(client.text).mockResolvedValue({
      ...complete,
      advice_page: { title: 'Broken' },
      advice_text: 'Source text retained.',
    });
    render(<VoiceExperience client={client} />);
    await screen.findByRole('button', { name: 'Start recording' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'farm' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByText(/did not return a compatible, complete report/);
    expect(
      screen.queryByRole('button', { name: 'Open my planting options' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Read the text report supplied by the service')).toBeVisible();
  });
  it('does not invent a manual advice request to recover an expired voice session', async () => {
    const client = new Client();
    const manual = vi.spyOn(client, 'advice');
    await expect(
      client.withRecovery(
        report,
        null,
        async () => {
          throw new ApiError('advice_expired', 'Expired', 410);
        },
        vi.fn(),
      ),
    ).rejects.toMatchObject({ code: 'voice_advice_expired' });
    expect(manual).not.toHaveBeenCalled();
  });
});
