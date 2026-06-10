/**
 * worker.js — Cloudflare Worker chính
 * Phục vụ static assets VÀ xử lý CORS proxy cho phatnguoi.vn
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── API Route: POST /phat-nguoi (CORS proxy) ──
    if (url.pathname === '/phat-nguoi') {
      // Preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      // Health check
      if (request.method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok', service: 'phatnguoi-proxy' }), {
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      // Proxy POST to phatnguoi.vn
      if (request.method === 'POST') {
        try {
          const body = await request.text();
          const upstream = await fetch('https://api.phatnguoi.vn/phat-nguoi', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
            body,
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
    }

    // ── Tất cả request còn lại → serve static assets ──
    return env.ASSETS.fetch(request);
  },
};
