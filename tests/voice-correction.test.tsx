import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import VoiceExperience from '@/components/VoiceExperience';
import { VoicePlayback, CORRECTION_PREFIX } from '@/components/VoiceConversation';
import MicrophoneMeter from '@/components/MicrophoneMeter';
import type { VoiceClient } from '@/lib/voice/client';
import { parseVoiceResponse, type VoiceResponse } from '@/lib/voice/contract';
import { useConversation } from '@/lib/voice/useConversation';
import report from './fixtures/voice-live-report.json';

const originalWords = 'My farm is in Kajuru, Kaduna. I grew maize last season.';
const original = {
  ...parseVoiceResponse(report),
  seasons: [['maize']],
  transcript: originalWords,
  service_context: { preserve: 'all keys' },
};
const corrected = { ...parseVoiceResponse(report), transcript: 'I grew sorghum last season.' };
function client(): VoiceClient {
  return {
    health: vi.fn().mockResolvedValue(undefined),
    audio: vi.fn().mockResolvedValue(original),
    text: vi.fn().mockResolvedValue(corrected),
  };
}
const mediaDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
const stopTrack = vi.fn();
const stream = { getTracks: () => [{ stop: stopTrack, onended: null }] } as unknown as MediaStream;
class Recorder {
  static isTypeSupported = (mime: string) => mime === 'audio/webm';
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['test sound'], { type: this.mimeType }) });
    this.onstop?.();
  }
}
beforeEach(() => {
  vi.stubGlobal('MediaRecorder', Recorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  });
  let urls = 0;
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => `blob:note-${++urls}`),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const [target, key, descriptor] of [
    [navigator, 'mediaDevices', mediaDescriptor],
    [URL, 'createObjectURL', createDescriptor],
    [URL, 'revokeObjectURL', revokeDescriptor],
  ] as const) {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else Reflect.deleteProperty(target, key);
  }
});
async function sendRecording() {
  fireEvent.click(await screen.findByRole('button', { name: 'Start recording' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Stop recording' }));
  await screen.findByLabelText('Review your recording');
  fireEvent.click(screen.getByRole('button', { name: 'Send recording' }));
  await screen.findByRole('heading', { name: "Here's what Ihayo heard" });
}

it('retains audio and original transcript, invalidates stale advice, and sends edited words with full authoritative context', async () => {
  const service = client();
  let resolve!: (value: VoiceResponse) => void;
  vi.mocked(service.text).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  render(<VoiceExperience client={service} />);
  await sendRecording();
  expect(screen.getByLabelText('Play your sent voice note')).toBeVisible();
  expect(screen.getByText(originalWords)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Open my planting options' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Correct these words' }));
  expect(screen.getByRole('textbox', { name: 'Your corrected words' })).toHaveValue(originalWords);
  expect(screen.queryByRole('button', { name: 'Open my planting options' })).toBeNull();
  const words = originalWords.replace('maize', 'sorghum');
  fireEvent.change(screen.getByRole('textbox', { name: 'Your corrected words' }), {
    target: { value: words },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send correction' }));
  await waitFor(() => expect(service.text).toHaveBeenCalledTimes(1));
  expect(vi.mocked(service.text).mock.calls[0][0]).toBe(CORRECTION_PREFIX + words);
  expect(vi.mocked(service.text).mock.calls[0][1]).toBe(original);
  expect(screen.queryByRole('button', { name: 'Open my planting options' })).toBeNull();
  await act(async () => {
    resolve(corrected);
  });
  expect(await screen.findByRole('button', { name: 'Open my planting options' })).toBeEnabled();
  expect(screen.getByText(originalWords)).toBeVisible();
  expect(screen.getByText(CORRECTION_PREFIX + words)).toBeVisible();
  expect(screen.getByText(/Ihayo returned farm details for this correction/)).toBeVisible();
  expect(sessionStorage.getItem('ihayo-session-v1')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Clear conversation and start again' }));
  expect(screen.queryByText(originalWords)).toBeNull();
  expect(screen.queryByLabelText('Play your sent voice note')).toBeNull();
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});

it('keeps earlier advice on hold through a failed correction and partial response until a new complete report arrives', async () => {
  const service = client();
  vi.mocked(service.text)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ ...original, confidence: 'partial', missing: ['lga'], lga: null })
    .mockResolvedValueOnce(corrected);
  const { result } = renderHook(() => useConversation(service));
  await waitFor(() => expect(result.current.state.phase).toBe('ready'));
  await act(async () => {
    await result.current.submit({
      kind: 'audio',
      audio: new Blob(['sound'], { type: 'audio/webm' }),
    });
  });
  act(() => result.current.holdAdvice());
  await act(async () => {
    await result.current.submit({ kind: 'text', message: 'Correction: sorghum', correctionOf: 1 });
  });
  expect(result.current.state.advice).toBeNull();
  expect(result.current.state.response).toBe(original);
  expect(result.current.state.adviceStale).toBe(true);
  await act(async () => {
    await result.current.retry();
  });
  expect(result.current.state.advice).toBeNull();
  expect(result.current.state.adviceStale).toBe(true);
  await act(async () => {
    await result.current.submit({ kind: 'text', message: 'Kajuru' });
  });
  expect(result.current.state.advice?.page).toBe(report.advice_page);
  expect(result.current.state.adviceStale).toBe(false);
});

it('offers recovery without inventing words when an accepted audio response has no transcript', async () => {
  const service = client();
  vi.mocked(service.audio).mockResolvedValue({ ...original, transcript: '' });
  render(<VoiceExperience client={service} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Start recording' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Stop recording' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Send recording' }));
  await screen.findByRole('heading', { name: 'No transcript was returned' });
  expect(screen.queryByRole('button', { name: 'Correct these words' })).toBeNull();
  expect(screen.getByLabelText('Play your sent voice note')).toBeVisible();
});

it('bounds retained recordings without truncating API context and removes audio independently', async () => {
  const service = client();
  const { result } = renderHook(() => useConversation(service));
  await waitFor(() => expect(result.current.state.phase).toBe('ready'));
  for (let i = 0; i < 5; i++)
    await act(async () => {
      await result.current.submit({
        kind: 'audio',
        audio: new Blob([String(i)], { type: 'audio/webm' }),
      });
    });
  expect(result.current.state.turns.filter((t) => t.audio)).toHaveLength(3);
  expect(vi.mocked(service.audio).mock.calls[4][1]).toBe(original);
  const id = result.current.state.turns.at(-1)!.id;
  act(() => result.current.forgetAudio(id));
  expect(result.current.state.turns.find((t) => t.id === id)?.audio).toBeUndefined();
  expect(result.current.state.response).toBe(original);
});

it('pauses hidden playback and revokes the object URL on removal', async () => {
  const audio = new Blob(['sound'], { type: 'audio/webm' });
  const { rerender, unmount } = render(<VoicePlayback audio={audio} active label="Voice note" />);
  await screen.findByLabelText('Voice note');
  rerender(<VoicePlayback audio={audio} active={false} label="Voice note" />);
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  const revoke = URL.revokeObjectURL;
  unmount();
  expect(revoke).toHaveBeenCalled();
});

it('uses actual microphone samples and releases visualization resources without stopping recorder tracks', async () => {
  const disconnectSource = vi.fn(),
    disconnectAnalyser = vi.fn(),
    close = vi.fn().mockResolvedValue(undefined);
  let draw: FrameRequestCallback | undefined;
  const analyser = {
    fftSize: 256,
    getByteTimeDomainData: vi.fn((samples: Uint8Array) => samples.fill(192)),
    disconnect: disconnectAnalyser,
  };
  class Context {
    createMediaStreamSource() {
      return { connect: vi.fn(), disconnect: disconnectSource };
    }
    createAnalyser() {
      return analyser;
    }
    resume = vi.fn().mockResolvedValue(undefined);
    close = close;
  }
  vi.stubGlobal('AudioContext', Context);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((fn: FrameRequestCallback) => {
      draw = fn;
      return 42;
    }),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  stopTrack.mockClear();
  const { unmount } = render(<MicrophoneMeter stream={stream} />);
  await screen.findByRole('img', { name: 'Live microphone input' });
  act(() => draw?.(100));
  expect(analyser.getByteTimeDomainData).toHaveBeenCalled();
  unmount();
  expect(close).toHaveBeenCalled();
  expect(disconnectSource).toHaveBeenCalled();
  expect(disconnectAnalyser).toHaveBeenCalled();
  expect(stopTrack).not.toHaveBeenCalled();
});

it('rejects a malformed transcript rather than displaying fabricated or coerced words', () => {
  expect(() => parseVoiceResponse({ ...original, transcript: 123 })).toThrow();
});
