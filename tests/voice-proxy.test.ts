// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { proxyVoice } from '@/lib/voice/proxy';

const env = { VOICE_AI_BASE_URL: 'https://voice.example.test/prefix', VOICE_AI_ENABLED: 'true' };
const reply = {
  confidence: 'partial',
  state: 'Kaduna',
  clarifying_question: 'Which LGA?',
  carry: { untouched: true },
};
const req = (body: unknown, origin = 'https://ihayo.test') =>
  new Request('https://ihayo.test/api/voice/text', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
it('stays disabled with missing configuration or a closed release gate, without a fallback request', async () => {
  const transport = vi.fn();
  for (const config of [
    {},
    { ...env, VOICE_AI_ENABLED: 'false' },
    { ...env, VOICE_AI_BASE_URL: 'http://temporary.example' },
  ]) {
    const response = await proxyVoice(
      new Request('https://ihayo.test/api/voice/health'),
      'health',
      transport,
      config,
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('temporary.example');
  }
  expect(transport).not.toHaveBeenCalled();
});
it('verifies health and forwards text/context only to the configured separate prefix', async () => {
  const transport = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ status: 'ok', meta_loaded: true }))
    .mockResolvedValueOnce(Response.json(reply));
  expect(
    (await proxyVoice(new Request('https://ihayo.test/api/voice/health'), 'health', transport, env))
      .status,
  ).toBe(200);
  expect(transport.mock.calls[0][0]).toBe('https://voice.example.test/prefix/health');
  const response = await proxyVoice(
    req({ message: 'Kajuru', context: reply }),
    'text',
    transport,
    env,
  );
  expect(response.status).toBe(200);
  expect(transport.mock.calls[1][0]).toBe('https://voice.example.test/prefix/extract/text');
  expect(JSON.parse(transport.mock.calls[1][1].body)).toEqual({
    message: 'Kajuru',
    context: reply,
  });
  expect(await response.json()).toEqual(reply);
  expect(transport.mock.calls[1][1].redirect).toBe('error');
});
it('checks multipart audio, correct extension and complete context without forwarding browser headers', async () => {
  const form = new FormData();
  form.append('audio', new Blob(['sound'], { type: 'audio/ogg' }), 'private-name.ogg');
  form.append('context', JSON.stringify(reply));
  const request = new Request('https://ihayo.test/api/voice/audio', {
    method: 'POST',
    headers: { Origin: 'https://ihayo.test', Authorization: 'do-not-forward', Cookie: 'private' },
    body: form,
  });
  const transport = vi.fn().mockResolvedValue(Response.json(reply));
  const response = await proxyVoice(request, 'audio', transport, env);
  expect(response.status).toBe(200);
  const [url, init] = transport.mock.calls[0];
  expect(url).toBe('https://voice.example.test/prefix/extract/voice');
  expect(init.body.get('audio').name).toBe('farm-recording.ogg');
  expect(JSON.parse(init.body.get('context'))).toEqual(reply);
  expect(init.headers).toEqual({ Accept: 'application/json' });
});
it('rejects cross-origin requests, extra fields, oversized bodies and bad context before calling upstream', async () => {
  const transport = vi.fn();
  expect(
    (await proxyVoice(req({ message: 'farm' }, 'https://other.test'), 'text', transport, env))
      .status,
  ).toBe(403);
  expect(
    (
      await proxyVoice(
        req({ message: 'farm', target_url: 'https://other.test' }),
        'text',
        transport,
        env,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await proxyVoice(
        req({ message: 'farm', context: { confidence: 'invented' } }),
        'text',
        transport,
        env,
      )
    ).status,
  ).toBe(400);
  const big = new Request('https://ihayo.test/api/voice/text', {
    method: 'POST',
    headers: {
      Origin: 'https://ihayo.test',
      'Content-Length': '5000000',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  expect((await proxyVoice(big, 'text', transport, env)).status).toBe(413);
  expect(transport).not.toHaveBeenCalled();
});
it.each([413, 415, 429, 500, 502])(
  'returns a safe recoverable error for upstream %s without internal details or retry',
  async (status) => {
    const transport = vi
      .fn()
      .mockResolvedValue(new Response('secret provider stack and credential', { status }));
    const response = await proxyVoice(req({ message: 'farm' }), 'text', transport, env);
    expect(response.ok).toBe(false);
    expect(await response.text()).not.toMatch(/credential|provider stack/);
    expect(transport).toHaveBeenCalledTimes(1);
  },
);
it('rejects malformed upstream responses and unhealthy metadata', async () => {
  const invalid = vi.fn().mockResolvedValue(Response.json({ confidence: 'yes', advice_page: {} }));
  expect((await proxyVoice(req({ message: 'farm' }), 'text', invalid, env)).status).toBe(502);
  const unhealthy = vi.fn().mockResolvedValue(Response.json({ status: 'ok', meta_loaded: false }));
  expect(
    (await proxyVoice(new Request('https://ihayo.test/api/voice/health'), 'health', unhealthy, env))
      .status,
  ).toBe(503);
});
