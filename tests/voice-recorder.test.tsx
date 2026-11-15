import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useRecorder } from '@/lib/voice/useRecorder';

const originalMedia = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
const originalCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
const stopTrack = vi.fn();
const track = { stop: stopTrack, onended: null as (() => void) | null };
const stream = { getTracks: () => [track] } as unknown as MediaStream;
let getUserMedia: ReturnType<typeof vi.fn>;
class Recorder {
  static isTypeSupported = vi.fn((mime: string) => mime === 'audio/webm;codecs=opus');
  static instances: Recorder[] = [];
  state = 'inactive';
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onpause: (() => void) | null = null;
  constructor(_stream: MediaStream, options: MediaRecorderOptions) {
    this.mimeType = options.mimeType!;
    Recorder.instances.push(this);
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['sound'], { type: this.mimeType }) });
    this.onstop?.();
  }
}
beforeEach(() => {
  Recorder.instances = [];
  Recorder.isTypeSupported.mockImplementation((mime) => mime === 'audio/webm;codecs=opus');
  stopTrack.mockClear();
  track.onended = null;
  getUserMedia = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:recording'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.stubGlobal('MediaRecorder', Recorder);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (originalMedia) Object.defineProperty(navigator, 'mediaDevices', originalMedia);
  else Reflect.deleteProperty(navigator, 'mediaDevices');
  if (originalCreate) Object.defineProperty(URL, 'createObjectURL', originalCreate);
  else Reflect.deleteProperty(URL, 'createObjectURL');
  if (originalRevoke) Object.defineProperty(URL, 'revokeObjectURL', originalRevoke);
  else Reflect.deleteProperty(URL, 'revokeObjectURL');
});
it('records only after explicit start, stops tracks, previews actual MIME and revokes discarded URLs', async () => {
  const { result } = renderHook(useRecorder);
  expect(getUserMedia).not.toHaveBeenCalled();
  await act(async () => {
    await result.current.start();
  });
  expect(result.current.status).toBe('recording');
  act(() => result.current.stop());
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(result.current.audio?.type).toBe('audio/webm;codecs=opus');
  expect(result.current.status).toBe('review');
  expect(result.current.url).toBe('blob:recording');
  act(() => result.current.discard());
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:recording');
  expect(result.current.audio).toBeNull();
});
it('rejects unsupported formats before requesting permission', async () => {
  Recorder.isTypeSupported.mockReturnValue(false);
  const { result } = renderHook(useRecorder);
  await act(async () => {
    await result.current.start();
  });
  expect(getUserMedia).not.toHaveBeenCalled();
  expect(result.current.error).toMatch(/type your message/);
});
it('releases the microphone and discards audio when the device pauses recording', async () => {
  const { result } = renderHook(useRecorder);
  await act(async () => {
    await result.current.start();
  });
  act(() => Recorder.instances[0].onpause?.());
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe('error');
  expect(result.current.error).toMatch(/paused by the device/);
  expect(result.current.audio).toBeNull();
});
it('handles microphone denial without discarding the rest of the application', async () => {
  getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
  const { result } = renderHook(useRecorder);
  await act(async () => {
    await result.current.start();
  });
  expect(result.current.status).toBe('error');
  expect(result.current.error).toMatch(/permission was not allowed/);
});
it('stops a late microphone grant after cancellation or unmount', async () => {
  let grant!: (stream: MediaStream) => void;
  getUserMedia.mockReturnValue(
    new Promise<MediaStream>((resolve) => {
      grant = resolve;
    }),
  );
  const { result, unmount } = renderHook(useRecorder);
  let opening: Promise<void>;
  act(() => {
    opening = result.current.start();
  });
  unmount();
  await act(async () => {
    grant(stream);
    await opening!;
  });
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(Recorder.instances).toHaveLength(0);
});
it('prevents repeated permission requests and handles microphone interruption', async () => {
  const { result } = renderHook(useRecorder);
  await act(async () => {
    await Promise.all([result.current.start(), result.current.start()]);
  });
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  act(() => track.onended?.());
  expect(result.current.status).toBe('error');
  expect(result.current.audio).toBeNull();
  expect(stopTrack).toHaveBeenCalled();
});
it('shows elapsed time and stops automatically after the disclosed duration limit', async () => {
  vi.useFakeTimers();
  const { result } = renderHook(useRecorder);
  await act(async () => {
    await result.current.start();
  });
  act(() => vi.advanceTimersByTime(2000));
  expect(result.current.seconds).toBe(2);
  act(() => vi.advanceTimersByTime(178000));
  expect(result.current.status).toBe('review');
  expect(stopTrack).toHaveBeenCalledTimes(1);
});
it('discards oversized recording chunks and releases resources on unmount', async () => {
  const { result, unmount } = renderHook(useRecorder);
  await act(async () => {
    await result.current.start();
  });
  act(() =>
    Recorder.instances[0].ondataavailable?.({
      data: new Blob([new Uint8Array(3_500_001)], { type: 'audio/webm' }),
    }),
  );
  expect(result.current.status).toBe('error');
  expect(result.current.error).toMatch(/3.5 MB/);
  expect(result.current.audio).toBeNull();
  unmount();
  expect(stopTrack).toHaveBeenCalled();
});
