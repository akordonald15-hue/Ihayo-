'use client';
import { useEffect, useRef, useState } from 'react';

/** Actual microphone amplitude. No simulated waveform or audio output connection. */
export default function MicrophoneMeter({ stream }: { stream: MediaStream | null }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    setAvailable(false);
    if (
      !stream ||
      typeof AudioContext === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )
      return;
    let context: AudioContext | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    let analyser: AnalyserNode | undefined;
    let frame = 0;
    let stopped = false;
    try {
      context = new AudioContext();
      source = context.createMediaStreamSource(stream);
      analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      void context.resume().catch(() => {
        if (!stopped) setAvailable(false);
      });
      const samples = new Uint8Array(analyser.fftSize);
      let previous = 0;
      const draw = (time: number) => {
        if (stopped || !analyser) return;
        if (time - previous >= 50) {
          previous = time;
          analyser.getByteTimeDomainData(samples);
          bars.current.forEach((bar, i) => {
            const amplitude = Math.abs(samples[Math.floor((i * samples.length) / 17)] - 128) / 128;
            if (bar) bar.style.transform = `scaleY(${Math.max(0.07, amplitude)})`;
          });
        }
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
      setAvailable(true);
    } catch {
      /* Recording remains available without a visualizer. */
    }
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      source?.disconnect();
      analyser?.disconnect();
      if (context) void context.close().catch(() => undefined);
    };
  }, [stream]);
  return (
    <div
      className="voice-waveform"
      aria-label={available ? 'Live microphone input' : 'Recording indicator'}
      role="img"
    >
      {Array.from({ length: 17 }, (_, i) => (
        <span
          key={i}
          ref={(node) => {
            bars.current[i] = node;
          }}
        />
      ))}
      <span className="sr-only">
        {available
          ? 'Waveform responds to your microphone.'
          : 'Recording is on. Live waveform unavailable or reduced motion requested.'}
      </span>
    </div>
  );
}
