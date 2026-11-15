import {
  MAX_MESSAGE_LENGTH,
  MAX_RESPONSE_BYTES,
  VoiceError,
  audioExtension,
  isRecord,
  parseVoiceResponse,
  validateAudio,
  validateContext,
  type VoiceResponse,
} from './contract';

export interface VoiceClient {
  health(signal: AbortSignal): Promise<void>;
  text(message: string, context: VoiceResponse | null, signal: AbortSignal): Promise<VoiceResponse>;
  audio(audio: Blob, context: VoiceResponse | null, signal: AbortSignal): Promise<VoiceResponse>;
}
export class HttpVoiceClient implements VoiceClient {
  constructor(private transport: typeof fetch = (input, init) => fetch(input, init)) {}
  private async request(path: string, signal: AbortSignal, body?: string | FormData) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) controller.abort();
    let timedOut = false;
    const timer = setTimeout(
      () => {
        timedOut = true;
        controller.abort();
      },
      path === 'health' ? 12000 : 65000,
    );
    try {
      const response = await this.transport(`/api/voice/${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: typeof body === 'string' ? { 'Content-Type': 'application/json' } : undefined,
        body,
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const raw = await response.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_RESPONSE_BYTES)
        throw new VoiceError(
          'invalid_response',
          'The service response was too large. Your earlier details are kept.',
        );
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new VoiceError(
          'invalid_response',
          'The service returned an unreadable response. Your earlier details are kept.',
        );
      }
      if (!response.ok) {
        const error = isRecord(data) && isRecord(data.error) ? data.error : null;
        throw new VoiceError(
          typeof error?.code === 'string' ? error.code : 'service_unavailable',
          typeof error?.message === 'string'
            ? error.message
            : 'The conversation service is unavailable. Please try again or answer step by step.',
          response.status,
        );
      }
      return data;
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      if (signal.aborted)
        throw new VoiceError('cancelled', 'Request cancelled. Your collected details are kept.');
      if (timedOut)
        throw new VoiceError(
          'timeout',
          'The service took too long. Your details and recording are kept so you can retry.',
        );
      throw new VoiceError(
        'network',
        'We could not reach the conversation service. Check your connection and try again.',
      );
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  }
  async health(signal: AbortSignal) {
    const data = await this.request('health', signal);
    if (!isRecord(data) || data.status !== 'ok' || data.meta_loaded !== true)
      throw new VoiceError(
        'service_unavailable',
        'The conversation service is not ready. Please answer step by step or try again later.',
      );
  }
  async text(message: string, context: VoiceResponse | null, signal: AbortSignal) {
    if (!message.trim() || message.length > MAX_MESSAGE_LENGTH)
      throw new VoiceError('invalid_message', 'Please enter a message of up to 3,000 characters.');
    validateContext(context);
    return parseVoiceResponse(
      await this.request(
        'text',
        signal,
        JSON.stringify({ message: message.trim(), ...(context ? { context } : {}) }),
      ),
    );
  }
  async audio(audio: Blob, context: VoiceResponse | null, signal: AbortSignal) {
    validateAudio(audio);
    validateContext(context);
    const form = new FormData();
    form.append('audio', audio, `farm-recording.${audioExtension(audio.type)}`);
    if (context) form.append('context', JSON.stringify(context));
    return parseVoiceResponse(await this.request('audio', signal, form));
  }
}
