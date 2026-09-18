import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
import { askAstra } from '../server/assistant.js';

const origin = 'https://example.test';
const env = { ASSISTANT_ENABLED: 'true', OPENAI_API_KEY: 'test-key-never-real', ALLOWED_ORIGIN: origin };
const completed = { status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Please share the pickup and delivery locations.' }] }], usage: { input_tokens: 123, output_tokens: 45 } };
const mockFetch = async () => Response.json(completed);

async function fixture(t, options = {}) {
  const app = createApp({ env, fetchImpl: mockFetch, logger: () => {}, ...options });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }));
  const base = `http://127.0.0.1:${app.address().port}`;
  return {
    get: path => fetch(base + path),
    request: (body = { message: 'What is needed for freight?' }, headers = {}, method = 'POST') =>
      fetch(base + '/api/assist', { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
        body: ['POST', 'PUT'].includes(method) ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined })
  };
}

test('Astra request uses Responses, safe defaults and extracts assistant text', async () => {
  let request;
  const result = await askAstra('Help with freight', { apiKey: env.OPENAI_API_KEY, fetchImpl: async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    request = JSON.parse(init.body);
    assert.equal(init.headers.Authorization, `Bearer ${env.OPENAI_API_KEY}`);
    return Response.json(completed);
  } });
  assert.equal(request.model, 'gpt-6-astra');
  assert.deepEqual(request.reasoning, { effort: 'low' });
  assert.equal(request.store, false);
  assert.equal(request.max_output_tokens, 4096);
  for (const field of ['temperature', 'top_p', 'top_logprobs', 'tools']) assert.ok(!(field in request));
  assert.equal(request.input[0].role, 'user');
  assert.equal(result.answer, completed.output[0].content[0].text);
});

test('successful API response exposes only answer; logs omit visitor content and secrets', async t => {
  const logs = [];
  const app = await fixture(t, { logger: line => logs.push(line) });
  const response = await app.request({ message: 'private visitor question' });
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(await response.json()), ['answer']);
  assert.equal(JSON.parse(logs[0]).inputTokens, 123);
  assert.ok(!logs.join('').includes('private visitor'));
  assert.ok(!logs.join('').includes(env.OPENAI_API_KEY));
});

test('disabled or unconfigured assistant never calls upstream', async t => {
  for (const config of [{ ...env, ASSISTANT_ENABLED: 'false' }, { ...env, OPENAI_API_KEY: '' }]) {
    const app = await fixture(t, { env: config, fetchImpl: () => assert.fail('upstream called') });
    assert.equal((await app.request()).status, 503);
    assert.match(await (await app.get('/site-config.js')).text(), /"assistantEnabled":false/);
  }
});

test('origin, content-type, method and preflight handling', async t => {
  const app = await fixture(t);
  assert.equal((await app.request({}, { Origin: 'https://attacker.test' })).status, 403);
  assert.equal((await app.request({}, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await app.request({}, {}, 'GET')).status, 405);
  const preflight = await app.request({}, {}, 'OPTIONS');
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
});

test('malformed, blank, non-string and oversized messages are rejected before billing', async t => {
  const app = await fixture(t, { fetchImpl: () => assert.fail('upstream called') });
  for (const body of ['{', { message: ' ' }, { message: 123 }, { message: 'x'.repeat(2001) }]) {
    assert.equal((await app.request(body)).status, 400);
  }
  assert.equal((await app.request({ message: 'x'.repeat(11000) })).status, 413);
});

test('per-client quota rejects sixth request and resets after one minute', async t => {
  let clock = 0;
  const app = await fixture(t, { now: () => clock });
  for (let i = 0; i < 5; i++) assert.equal((await app.request()).status, 200);
  const limited = await app.request();
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('Retry-After'), '60');
  clock = 60001;
  assert.equal((await app.request()).status, 200);
});

test('global daily quota caps calls even after per-client windows reset', async t => {
  let clock = 0, calls = 0;
  const app = await fixture(t, { now: () => clock, fetchImpl: async () => { calls++; return Response.json(completed); } });
  for (let i = 0; i < 200; i++) {
    clock += 60001;
    assert.equal((await app.request()).status, 200);
  }
  clock += 60001;
  assert.equal((await app.request()).status, 429);
  assert.equal(calls, 200);
  clock = 86400000;
  assert.equal((await app.request()).status, 200);
});

test('upstream errors, incomplete responses and refusals produce safe fallback', async t => {
  for (const upstream of [new Response('private upstream error', { status: 401 }), Response.json({ status: 'incomplete', output: completed.output }), Response.json({ status: 'completed', output: [] })]) {
    const app = await fixture(t, { fetchImpl: async () => upstream });
    const response = await app.request();
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('private upstream'));
  }
});

test('timeout produces a retryable fallback', async t => {
  const app = await fixture(t, { fetchImpl: async () => { throw new DOMException('timeout', 'TimeoutError'); } });
  assert.equal((await app.request()).status, 504);
});

test('actual AbortSignal deadline cancels a hanging provider request', async () => {
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(askAstra('Hello', { apiKey: 'test', timeoutMs: 10,
      fetchImpl: (url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }) }), { name: 'TimeoutError' });
  } finally { clearTimeout(keepAlive); }
});

test('static allowlist blocks backend, env, git, and encoded traversal paths', async t => {
  const app = await fixture(t);
  for (const file of ['/server/assistant.js', '/server/business-info.json', '/.env', '/.git/config', '/package.json', '/%2e%2e%2f.env']) {
    assert.equal((await app.get(file)).status, 404, file);
  }
  assert.equal((await app.get('/')).status, 200);
  const config = await (await app.get('/site-config.js')).text();
  assert.ok(!config.includes(env.OPENAI_API_KEY));
});
