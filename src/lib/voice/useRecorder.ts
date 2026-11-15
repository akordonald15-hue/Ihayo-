'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS, audioExtension, validateAudio } from './contract';

const formats = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
  'audio/wav',
  'audio/mpeg',
];
export function recordingMime(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function')
    return null;
  return (
    formats.find((mime) => {
      try {
        return MediaRecorder.isTypeSupported(mime);
      } catch {
        return false;
      }
    }) ?? null
  );
}
export function useRecorder() {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording' | 'review' | 'error'>(
    'idle',
  );
  const [audio, setAudio] = useState<Blob | null>(null);
  const [url, setURL] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const version = useRef(0);
  const pending = useRef(false);
  const chunksRef = useRef<Blob[]>([]);
  const intent = useRef<'review' | 'discard'>('review');
  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    stream.current = null;
  }, []);
  const dispose = useCallback(() => {
    chunksRef.current.length = 0;
    version.current++;
    pending.current = false;
    intent.current = 'discard';
    const active = recorder.current;
    recorder.current = null;
    if (active && active.state !== 'inactive') {
      try {
        active.stop();
      } catch {
        /* Tracks are released below. */
      }
    }
    release();
  }, [release]);
  const discard = useCallback(() => {
    dispose();
    setAudio(null);
    setSeconds(0);
    setError('');
    setStatus('idle');
  }, [dispose]);
  useEffect(() => dispose, [dispose]);
  useEffect(() => {
    if (!audio || !URL.createObjectURL) {
      setURL(null);
      return;
    }
    try {
      const next = URL.createObjectURL(audio);
      const revoke = URL.revokeObjectURL;
      setURL(next);
      return () => {
        if (typeof revoke === 'function') revoke.call(URL, next);
      };
    } catch {
      setURL(null);
    }
  }, [audio]);
  function stop() {
    const active = recorder.current;
    if (!active || active.state === 'inactive') return;
    intent.current = 'review';
    try {
      active.stop();
      release();
    } catch {
      dispose();
      setStatus('error');
      setError('The recording could not be finished. Please try again or type instead.');
    }
  }
  async function start() {
    if (pending.current || recorder.current?.state === 'recording') return;
    const mime = recordingMime();
    if (!mime || !navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setError('Recording is not supported in this browser. You can type your message instead.');
      return;
    }
    dispose();
    const token = version.current;
    pending.current = true;
    intent.current = 'review';
    setAudio(null);
    setError('');
    setSeconds(0);
    setStatus('requesting');
    try {
      const tracks = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== version.current) {
        tracks.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = tracks;
      const active = new MediaRecorder(tracks, { mimeType: mime });
      recorder.current = active;
      chunksRef.current = [];
      const chunks = chunksRef.current;
      let bytes = 0;
      active.ondataavailable = (event) => {
        if (token !== version.current || intent.current === 'discard' || !event.data.size) return;
        bytes += event.data.size;
        if (bytes > MAX_AUDIO_BYTES) {
          dispose();
          setStatus('error');
          setError(
            'This recording reached the 3.5 MB limit. Please record a shorter message or type instead.',
          );
          return;
        }
        chunks.push(event.data);
      };
      active.onstop = () => {
        if (token !== version.current || intent.current === 'discard') return;
        release();
        recorder.current = null;
        try {
          const actualMime = active.mimeType || chunks[0]?.type || mime;
          if (!audioExtension(actualMime)) throw new Error();
          const blob = new Blob(chunks, { type: actualMime });
          validateAudio(blob);
          chunks.length = 0;
          setAudio(blob);
          setStatus('review');
        } catch {
          setStatus('error');
          setError(
            'The recording was empty or used an unsupported format. Please try again or type instead.',
          );
        }
      };
      active.onpause = () => {
        if (token === version.current) {
          dispose();
          setStatus('error');
          setError(
            'Recording was paused by the device. Your conversation is kept; please record again or type instead.',
          );
        }
      };
      active.onerror = () => {
        if (token === version.current) {
          dispose();
          setStatus('error');
          setError(
            'Recording was interrupted. Your conversation is kept; please record again or type instead.',
          );
        }
      };
      tracks.getTracks().forEach((track) => {
        track.onended = () => {
          if (token === version.current && active.state === 'recording') {
            dispose();
            setStatus('error');
            setError(
              'The microphone disconnected. Your conversation is kept. Please try again or type instead.',
            );
          }
        };
      });
      active.start(1000);
      pending.current = false;
      setStatus('recording');
      const started = Date.now();
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSeconds(Math.min(elapsed, MAX_RECORDING_SECONDS));
        if (elapsed >= MAX_RECORDING_SECONDS) stop();
      }, 1000);
    } catch (cause) {
      if (token !== version.current) return;
      dispose();
      setStatus('error');
      setError(
        typeof cause === 'object' &&
          cause !== null &&
          'name' in cause &&
          (cause.name === 'NotAllowedError' || cause.name === 'SecurityError')
          ? 'Microphone permission was not allowed. You can type instead, or allow microphone access in your browser and try again.'
          : 'We could not start the microphone. Check that it is connected, or type your message instead.',
      );
    }
  }
  return { status, audio, url, seconds, error, start, stop, discard };
}
