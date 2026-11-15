// Server route adapter only. Never import this module from a client component.
import {
  MAX_MESSAGE_LENGTH,
  MAX_RESPONSE_BYTES,
  VoiceError,
  isRecord,
  parseVoiceResponse,
  validateAudio,
  validateContext,
} from './contract';

const MAX_BODY_BYTES = 4_300_000;
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
type Environment = { VOICE_AI_BASE_URL?: string; VOICE_AI_ENABLED?: string };
export function voiceConfiguration(
  env: Environment = {
    VOICE_AI_BASE_URL: process.env.VOICE_AI_BASE_URL,
    VOICE_AI_ENABLED: process.env.VOICE_AI_ENABLED,
  },
) {
  if (env.VOICE_AI_ENABLED !== 'true' || !env.VOICE_AI_BASE_URL?.trim())
    throw new VoiceError(
      'not_configured',
      'Talk to Ihayo is not available yet. Please answer step by step.',
      503,
    );
  try {
    const url = new URL(env.VOICE_AI_BASE_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
      throw new Error();
    return url.href.replace(/\/+$/, '');
  } catch {
    throw new VoiceError(
      'configuration',
      'The conversation service is not available. Please answer step by step.',
      503,
    );
  }
}
async function boundedBody(body: ReadableStream<Uint8Array> | null, limit: number) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new VoiceError(
          'too_large',
          'This message is too large. Try a shorter recording or message.',
          413,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new VoiceError('invalid_json', 'The message could not be read. Please try again.', 400);
  }
}
function checkedContext(value: unknown) {
  try {
    validateContext(value);
  } catch (error) {
    const tooLarge = error instanceof VoiceError && error.code === 'context_too_large';
    throw new VoiceError(
      tooLarge ? 'context_too_large' : 'invalid_context',
      tooLarge
        ? 'This conversation is too large to send. Your details are kept.'
        : 'The conversation context could not be read. Your earlier details are kept.',
      tooLarge ? 413 : 400,
    );
  }
}
function serviceError(status: number) {
  if (status === 413)
    return new VoiceError('too_large', 'Recording is too long. Please try a shorter message.', 413);
  if (status === 415)
    return new VoiceError(
      'unsupported_audio',
      'Audio format not supported. Please type instead or use another supported browser.',
      415,
    );
  if (status === 429)
    return new VoiceError(
      'rate_limited',
      'The conversation service is busy. Please wait before trying again.',
      429,
    );
  if (status === 502)
    return new VoiceError(
      'processing',
      'Could not process the message. Your details are kept so you can try again.',
      502,
    );
  return new VoiceError(
    'service_unavailable',
    'The conversation service could not complete this request. Your collected details are kept.',
    503,
  );
}
export async function proxyVoice(
  request: Request,
  action: string,
  transport: typeof fetch = fetch,
  env: Environment = {
    VOICE_AI_BASE_URL: process.env.VOICE_AI_BASE_URL,
    VOICE_AI_ENABLED: process.env.VOICE_AI_ENABLED,
  },
) {
  const controller = new AbortController();
  let timeout = false;
  const abort = () => controller.abort();
  request.signal.addEventListener('abort', abort, { once: true });
  if (request.signal.aborted) controller.abort();
  const timer = setTimeout(
    () => {
      timeout = true;
      controller.abort();
    },
    action === 'health' ? 10000 : 55000,
  );
  try {
    if (!['health', 'text', 'audio'].includes(action))
      return Response.json(
        { error: { code: 'not_found', message: 'Unknown conversation operation.' } },
        { status: 404, headers },
      );
    if (request.method !== (action === 'health' ? 'GET' : 'POST'))
      return Response.json(
        { error: { code: 'method', message: 'Method not allowed.' } },
        { status: 405, headers },
      );
    const base = voiceConfiguration(env);
    let body: string | FormData | undefined;
    if (action !== 'health') {
      if (request.headers.get('origin') !== new URL(request.url).origin)
        throw new VoiceError('origin', 'This request is not allowed.', 403);
      if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES)
        throw new VoiceError(
          'too_large',
          'This message is too large. Please try a shorter recording.',
          413,
        );
      const contentType = request.headers.get('content-type') ?? '';
      const bytes = await boundedBody(request.body, MAX_BODY_BYTES);
      if (action === 'text') {
        if (!contentType.toLowerCase().startsWith('application/json'))
          throw new VoiceError('content_type', 'Please send a text message.', 415);
        const value = parseJSON(new TextDecoder().decode(bytes));
        if (
          !isRecord(value) ||
          Object.keys(value).some((k) => !['message', 'context'].includes(k)) ||
          typeof value.message !== 'string' ||
          !value.message.trim() ||
          value.message.length > MAX_MESSAGE_LENGTH
        )
          throw new VoiceError(
            'invalid_message',
            'Please enter a message of up to 3,000 characters.',
            400,
          );
        checkedContext(value.context);
        body = JSON.stringify({
          message: value.message.trim(),
          ...(value.context != null ? { context: value.context } : {}),
        });
      } else {
        if (!contentType.toLowerCase().startsWith('multipart/form-data;'))
          throw new VoiceError('content_type', 'Please send a supported audio recording.', 415);
        let form: FormData;
        try {
          form = await new Response(bytes, { headers: { 'Content-Type': contentType } }).formData();
        } catch {
          throw new VoiceError(
            'invalid_audio',
            'The recording could not be read. Please record again.',
            400,
          );
        }
        if (
          [...form.keys()].some((k) => !['audio', 'context', 'state', 'lga'].includes(k)) ||
          form.getAll('audio').length !== 1 ||
          form.getAll('context').length > 1
        )
          throw new VoiceError('invalid_audio', 'Please send one recording at a time.', 400);
        const audio = form.get('audio');
        if (!(audio instanceof Blob))
          throw new VoiceError('invalid_audio', 'Please record a message first.', 400);
        validateAudio(audio);
        const outgoing = new FormData();
        outgoing.append(
          'audio',
          audio,
          'farm-recording.' +
            (audio.type.includes('webm')
              ? 'webm'
              : audio.type.includes('ogg')
                ? 'ogg'
                : audio.type.includes('mp4') || audio.type.includes('m4a')
                  ? 'm4a'
                  : audio.type.includes('wav')
                    ? 'wav'
                    : 'mp3'),
        );
        const context = form.get('context');
        if (context != null) {
          if (typeof context !== 'string')
            throw new VoiceError('invalid_context', 'Conversation context could not be read.', 400);
          checkedContext(parseJSON(context));
          outgoing.append('context', context);
        }
        for (const key of ['state', 'lga']) {
          const value = form.get(key);
          if (value != null) {
            if (form.getAll(key).length !== 1 || typeof value !== 'string' || value.length > 120)
              throw new VoiceError('invalid_place', 'Please check the selected area.', 400);
            outgoing.append(key, value);
          }
        }
        body = outgoing;
      }
    }
    const response = await transport(
      `${base}/${action === 'audio' ? 'extract/voice' : action === 'text' ? 'extract/text' : 'health'}`,
      {
        method: request.method,
        headers:
          typeof body === 'string'
            ? { Accept: 'application/json', 'Content-Type': 'application/json' }
            : { Accept: 'application/json' },
        body,
        signal: controller.signal,
        cache: 'no-store',
        redirect: 'error',
      },
    );
    if (!response.ok) throw serviceError(response.status);
    const text = new TextDecoder().decode(await boundedBody(response.body, MAX_RESPONSE_BYTES));
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new VoiceError(
        'invalid_response',
        'The conversation service returned an unreadable response. Your earlier details are kept.',
        502,
      );
    }
    if (action === 'health') {
      if (!isRecord(data) || data.status !== 'ok' || data.meta_loaded !== true)
        throw serviceError(503);
      return Response.json({ status: 'ok', meta_loaded: true }, { headers });
    }
    parseVoiceResponse(data);
    return Response.json(data, { headers });
  } catch (error) {
    const safe =
      error instanceof VoiceError
        ? error
        : new VoiceError(
            timeout ? 'timeout' : request.signal.aborted ? 'cancelled' : 'network',
            timeout
              ? 'The conversation service took too long. Your details are kept so you can retry.'
              : request.signal.aborted
                ? 'Request cancelled.'
                : 'The conversation service is unavailable. Please try again or answer step by step.',
            timeout ? 504 : request.signal.aborted ? 499 : 503,
          );
    return Response.json(
      { error: { code: safe.code, message: safe.message } },
      { status: safe.status || (safe.code === 'invalid_response' ? 502 : 400), headers },
    );
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', abort);
  }
}
