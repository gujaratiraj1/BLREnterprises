import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { askAstra } from './assistant.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const staticFiles = new Map([
  ['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']], ['/assistant.css', ['assistant.css', 'text/css']],
  ['/script.js', ['script.js', 'text/javascript']], ['/assistant.js', ['assistant.js', 'text/javascript']],
  ...['hero-bg.png', 'logistics-service.png', 'construction-service.png'].map(name =>
    [`/assets/${name}`, [`assets/${name}`, 'image/png']])
]);

export function createApp({ env = process.env, fetchImpl = fetch, now = Date.now, logger = console.log } = {}) {
  const enabled = env.ASSISTANT_ENABLED === 'true' && Boolean(env.OPENAI_API_KEY);
  const allowedOrigin = env.ALLOWED_ORIGIN || 'http://localhost:3000';
  const clients = new Map();
  let day = -1, dailyRequests = 0, active = 0;
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/assist') {
        // CORS is not authentication. Global quotas also bound non-browser abuse.
        if (req.headers.origin !== allowedOrigin) return send(403, { error: 'Origin not allowed.' });
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' });
          return res.end();
        }
        if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, { error: 'Use POST.' }); }
        if (!enabled) return send(503, { error: 'The assistant is unavailable. Please use the quote form or call us.' });
        if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return send(415, { error: 'Send JSON.' });
        const time = now();
        for (const [ip, entry] of clients) if (entry.until <= time) clients.delete(ip);
        const client = req.socket.remoteAddress; // Do not trust spoofable forwarding headers.
        const entry = clients.get(client) || { count: 0, until: time + 60000 };
        if (entry.count >= 5 || (!clients.has(client) && clients.size >= 10000)) {
          res.setHeader('Retry-After', '60'); return send(429, { error: 'Please wait a minute before asking again.' });
        }
        entry.count++; clients.set(client, entry);
        const chunks = [];
        let bytes = 0;
        req.setTimeout(10000, () => req.destroy());
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 10000) { send(413, { error: 'Message is too large.' }); req.resume(); return; }
          chunks.push(chunk);
        }
        req.setTimeout(0);
        let input;
        try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'Invalid JSON.' }); }
        if (!input || typeof input.message !== 'string' || !input.message.trim() || input.message.length > 2000) {
          return send(400, { error: 'Enter a question of 1–2,000 characters.' });
        }
        const currentDay = Math.floor(time / 86400000);
        if (day !== currentDay) { day = currentDay; dailyRequests = 0; }
        if (dailyRequests >= 200 || active >= 4) return send(429, { error: 'The assistant is busy. Please use the quote form or try later.' });
        dailyRequests++; active++;
        const started = now();
        try {
          const result = await askAstra(input.message.trim(), { apiKey: env.OPENAI_API_KEY, fetchImpl });
          logger(JSON.stringify({ event: 'assistant', status: 'ok', elapsedMs: now() - started,
            inputTokens: result.usage?.input_tokens, outputTokens: result.usage?.output_tokens }));
          send(200, { answer: result.answer });
        } catch (error) {
          const timeout = error.name === 'TimeoutError' || error.name === 'AbortError';
          logger(JSON.stringify({ event: 'assistant', status: timeout ? 'timeout' : 'error', elapsedMs: now() - started }));
          send(timeout ? 504 : 502, { error: 'The assistant could not answer. Please try later or use the quote form.' });
        } finally { active--; }
        return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) return send(405, { error: 'Method not allowed.' });
      if (url.pathname === '/site-config.js') {
        const formId = /^[a-zA-Z0-9]+$/.test(env.FORMSPREE_FORM_ID || '') ? env.FORMSPREE_FORM_ID : '';
        res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
        return res.end(req.method === 'HEAD' ? undefined : `window.BLR_CONFIG = Object.freeze(${JSON.stringify({
          assistantEnabled: enabled, assistantEndpoint: '/api/assist', formspreeFormId: formId
        })});`);
      }
      const file = staticFiles.get(url.pathname);
      if (!file) return send(404, { error: 'Not found.' });
      const content = await readFile(path.join(root, file[0]));
      res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch {
      if (!res.headersSent) send(500, { error: 'Request failed.' }); else res.end();
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const server = createApp();
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.listen(port, () => console.log(`BLR Enterprises listening on port ${port}`));
}
