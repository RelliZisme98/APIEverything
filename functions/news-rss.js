/**
 * functions/news-rss.js
 * Cloudflare Pages Function — proxy RSS feeds to bypass CORS
 * URL: /news-rss?url=https://vnexpress.net/rss/tin-moi-nhat.rss
 */
export async function onRequest(context) {
  const { request } = context;
  const origin = request.headers.get('Origin') || '*';

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  const ALLOWED = [
    'https://vnexpress.net/rss/',
    'https://tuoitre.vn/rss/',
    'https://dantri.com.vn/rss/',
    'https://thanhnien.vn/rss/',
  ];

  if (!targetUrl || !ALLOWED.some(a => targetUrl.startsWith(a))) {
    return new Response(JSON.stringify({ error: 'URL not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
    });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RelliaBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    const xml = await res.text();

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': origin,
        'Cache-Control': 'public, max-age=300', // cache 5 minutes
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
    });
  }
}
