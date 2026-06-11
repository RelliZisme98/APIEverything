/**
 * worker.js — Cloudflare Worker chính
 * Phục vụ static assets VÀ xử lý CORS proxy cho:
 *   - /phat-nguoi  → proxy phatnguoi.vn
 *   - /news-rss    → proxy RSS feeds (VnExpress, Tuổi Trẻ, Dân Trí)
 *   - /news-article → proxy + extract article content
 *   - /vnindex     → proxy VPS stock data
 *   - /power-outage → proxy EVNSPC data
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function cors(body, status = 200, contentType = 'application/json') {
  return new Response(body, {
    status,
    headers: { 'Content-Type': contentType + '; charset=utf-8', ...CORS },
  });
}

function preflight() {
  return new Response(null, { status: 204, headers: CORS });
}

// ─── /news-rss ─────────────────────────────────────────────────────
const ALLOWED_RSS = [
  'https://vnexpress.net/rss/',
  'https://tuoitre.vn/rss/',
  'https://dantri.com.vn/rss/',
  'https://thanhnien.vn/rss/',
  'https://nhandan.vn/rss/',
];

async function handleNewsRSS(request) {
  if (request.method === 'OPTIONS') return preflight();
  const targetUrl = new URL(request.url).searchParams.get('url');
  if (!targetUrl || !ALLOWED_RSS.some(a => targetUrl.startsWith(a))) {
    return cors(JSON.stringify({ error: 'URL not allowed' }), 403);
  }
  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml,application/xml,text/xml' },
    });
    const xml = await res.text();
    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=300' },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /news-article ──────────────────────────────────────────────────
const ALLOWED_ARTICLE_DOMAINS = ['vnexpress.net','tuoitre.vn','dantri.com.vn','thanhnien.vn','nhandan.vn'];

async function handleNewsArticle(request) {
  if (request.method === 'OPTIONS') return preflight();
  const targetUrl = new URL(request.url).searchParams.get('url');
  let host;
  try { host = new URL(targetUrl).hostname; } catch { return cors(JSON.stringify({ error: 'Invalid URL' }), 400); }
  if (!ALLOWED_ARTICLE_DOMAINS.some(d => host === d || host.endsWith('.' + d))) {
    return cors(JSON.stringify({ error: 'Domain not allowed' }), 403);
  }
  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html', 'Accept-Language': 'vi-VN,vi;q=0.9' },
      redirect: 'follow',
    });
    const html = await res.text();
    const article = extractArticle(html, targetUrl);
    return new Response(JSON.stringify(article), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=600' },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

function extractArticle(html, url) {
  const get = (re) => { const m = html.match(re); return m ? decode(m[1].trim()) : ''; };

  const title       = get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)
                   || get(/<title[^>]*>([^<]+)<\/title>/i);
  const description = get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)
                   || get(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const thumbnail   = get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)
                   || get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const publishedAt = get(/published_time["']\s*content=["']([^"']+)/i)
                   || get(/datePublished["']\s*:\s*["']([^"']+)/i);

  // Extract main text from common containers
  const containers = [
    /<article[^>]*class="[^"]*fck_detail[^"]*"[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*detail-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*class="[^"]*relate|<section)/i,
    /<div[^>]*class="[^"]*singular-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*class="[^"]*relate|<section)/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  let raw = '';
  for (const re of containers) {
    const m = html.match(re);
    if (m?.[1]?.length > 300) { raw = m[1]; break; }
  }

  const content = raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ').trim();

  return { title, description, content: content || description, publishedAt, thumbnail, url };
}

function decode(s) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&nbsp;/g,' ');
}

// ─── /vnindex ────────────────────────────────────────────────────────
const VPS_BASE = 'https://bgapidatafeed.vps.com.vn';

// Yahoo Finance symbols for Vietnam market indices
const YF_INDICES = [
  { sym: 'VNINDEX', yf: '%5EVNINDEX.VN', label: 'VN-Index',  exchange: 'HOSE' },
  // VN30 and HNX not available on Yahoo Finance — use VPS ETF as proxy
];

async function fetchYahooQuote(yfSym) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${yfSym}?interval=1d&range=1d`,
    { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
  );
  const d = await res.json();
  const result = d?.chart?.result?.[0];
  if (!result) return null;
  const meta  = result.meta;
  const price = meta.regularMarketPrice;
  const prev  = meta.chartPreviousClose;
  const change = price - prev;
  const changePc = prev ? ((change / prev) * 100) : 0;
  return { sym: meta.symbol, lastPrice: price, ot: change.toFixed(2), changePc: changePc.toFixed(2) };
}

async function handleVNIndex(request) {
  if (request.method === 'OPTIONS') return preflight();
  const params = new URL(request.url).searchParams;
  const type   = params.get('type') ?? 'stocks';
  const custom = params.get('symbols') ?? '';

  // Index data: use Yahoo Finance (VPS doesn't expose index via REST)
  if (type === 'index') {
    try {
      const results = await Promise.all(
        YF_INDICES.map(idx => fetchYahooQuote(idx.yf)
          .then(d => d ? { ...d, sym: idx.sym, exchange: idx.exchange } : null)
          .catch(() => null))
      );
      const valid = results.filter(Boolean);
      return new Response(JSON.stringify(valid), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=60' },
      });
    } catch (err) {
      return cors(JSON.stringify({ error: err.message }), 500);
    }
  }

  // Stock data: VPS direct (has CORS * but send via proxy for Referer header)
  let path;
  if (type === 'custom' && custom) path = `/getliststockdata/${custom}`;
  else                              path = '/getliststockdata/VCB,BID,CTG,TCB,VPB,MBB,HPG,VIC,VHM,VNM,MSN,SAB,GAS,PLX,FPT';

  try {
    const res = await fetch(VPS_BASE + path, {
      headers: { 'Referer': 'https://banggia.vps.com.vn/', 'User-Agent': 'Mozilla/5.0' },
    });
    const data = await res.text();
    return new Response(data, {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=30' },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /power-outage ───────────────────────────────────────────────────
async function handlePowerOutage(request) {
  if (request.method === 'OPTIONS') return preflight();
  const params = new URL(request.url).searchParams;
  const maDVQLLD = params.get('maDVQLLD') ?? '';
  const maDV     = params.get('maDV')     ?? '';
  const tuNgay   = params.get('tuNgay')   ?? '';
  const denNgay  = params.get('denNgay')  ?? '';

  const TARGET = `https://cskh.evnspc.vn/TraCuu/GetThongTinLichCupDien?maDVQLLD=${maDVQLLD}&maDV=${maDV}&tuNgay=${tuNgay}&denNgay=${denNgay}`;
  try {
    const res = await fetch(TARGET, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://cskh.evnspc.vn/' },
    });
    const data = await res.text();
    return new Response(data, {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /phat-nguoi ────────────────────────────────────────────────────
async function handlePhatNguoi(request) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method === 'GET') return cors(JSON.stringify({ status: 'ok' }));
  if (request.method === 'POST') {
    try {
      const body     = await request.text();
      const upstream = await fetch('https://api.phatnguoi.vn/phat-nguoi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body,
      });
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    } catch (err) {
      return cors(JSON.stringify({ error: err.message }), 502);
    }
  }
}

// ─── Router ─────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/phat-nguoi')    return handlePhatNguoi(request);
    if (pathname === '/news-rss')      return handleNewsRSS(request);
    if (pathname === '/news-article')  return handleNewsArticle(request);
    if (pathname === '/vnindex')       return handleVNIndex(request);
    if (pathname === '/power-outage')  return handlePowerOutage(request);

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
