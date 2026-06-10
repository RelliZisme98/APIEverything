/**
 * Cloudflare Worker — CORS Proxy cho API phạt nguội
 * Upload thẳng file này qua giao diện Cloudflare Workers.
 * Không cần wrangler, không cần build step.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // ── CORS Preflight ──
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);

  // ── Route: POST /phat-nguoi ──
  if (url.pathname === '/phat-nguoi' && request.method === 'POST') {
    try {
      const body = await request.text();

      const upstream = await fetch('https://api.phatnguoi.vn/phat-nguoi', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    body,
      });

      const data = await upstream.text();

      return new Response(data, {
        status:  upstream.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status:  502,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  }

  // ── Health check: GET / ──
  if (url.pathname === '/' && request.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', service: 'phatnguoi-proxy' }), {
      status:  200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status:  404,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
