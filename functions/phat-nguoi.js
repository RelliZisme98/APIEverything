/**
 * Cloudflare Pages Function — CORS Proxy cho phatnguoi.vn
 * File này tự động trở thành endpoint: POST /phat-nguoi
 *
 * Không cần cấu hình thêm gì — Cloudflare Pages tự detect thư mục /functions
 * và deploy serverless function khi bạn push code lên.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** Handle CORS preflight */
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Handle POST /phat-nguoi */
export async function onRequestPost({ request }) {
  try {
    const body = await request.text();

    const upstream = await fetch('https://api.phatnguoi.vn/phat-nguoi', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
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
