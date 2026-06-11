/**
 * worker.js — Cloudflare Worker chính
 * Routes: /phat-nguoi, /news-rss, /news-article, /vnindex, /power-outage, /vcb-rates
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

// VN30 basket (official 30 stocks on HOSE)
const VN30_BASKET = 'ACB,BID,BCM,BVH,CTG,FPT,GAS,GVR,HDB,HPG,MBB,MSN,MWG,PLX,POW,SAB,SSI,STB,TCB,TPB,VCB,VHM,VIB,VIC,VJC,VNM,VPB,VRE,VSH,VGC';
// HNX top stocks (proxy for HNX-Index)
const HNX_BASKET = 'ACB,SHB,NVB,VIB,SHS,HUT,TNG,PVC,DXG,SCI,S55,IDJ,PGS,VGS,NHA';

async function fetchYahooIndex(yfSym, symName) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${yfSym}?interval=1d&range=1d`,
    { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
  );
  const d = await res.json();
  const result = d?.chart?.result?.[0];
  if (!result) return null;
  const meta   = result.meta;
  const price  = meta.regularMarketPrice;
  const prev   = meta.chartPreviousClose;
  const high   = meta.regularMarketDayHigh   ?? price;
  const low    = meta.regularMarketDayLow    ?? price;
  const open   = meta.regularMarketOpen      ?? price;
  const volume = meta.regularMarketVolume    ?? 0;
  const change = price - prev;
  const pct    = prev ? (change / prev * 100) : 0;
  return {
    sym: symName, lastPrice: price, ot: +change.toFixed(2),
    changePc: +pct.toFixed(2), highPrice: high, lowPrice: low,
    openPrice: open, lot: volume, r: prev,
  };
}

async function fetchVpsBasket(symbols) {
  const res = await fetch(`${VPS_BASE}/getliststockdata/${symbols}`,
    { headers: { 'Referer': 'https://banggia.vps.com.vn/' } });
  return await res.json(); // array of stocks
}

function basketToIndex(stocks, symName, label) {
  if (!stocks?.length) return null;
  const valid = stocks.filter(s => s.lastPrice > 0);
  if (!valid.length) return null;

  // Simple average of % changes (approximation)
  const changes = valid.map(s => parseFloat(s.changePc || 0));
  const avgPct   = changes.reduce((a, b) => a + b, 0) / changes.length;

  // Sum last prices as proxy index level
  const sumPrice = valid.reduce((a, s) => a + parseFloat(s.lastPrice || 0), 0);
  const highs    = valid.map(s => parseFloat(s.highPrice || s.lastPrice || 0));
  const lows     = valid.map(s => parseFloat(s.lowPrice  || s.lastPrice || 0));
  const volume   = valid.reduce((a, s) => a + parseInt(s.lot || 0), 0);

  return {
    sym:       symName,
    lastPrice: +sumPrice.toFixed(2),
    ot:        +(sumPrice * avgPct / 100).toFixed(2),
    changePc:  +avgPct.toFixed(2),
    highPrice: +highs.reduce((a,b)=>a+b,0).toFixed(2),
    lowPrice:  +lows.reduce((a,b)=>a+b,0).toFixed(2),
    openPrice: +(sumPrice / (1 + avgPct/100)).toFixed(2),
    lot:       volume,
    r:         +(sumPrice / (1 + avgPct/100)).toFixed(2),
    isBasket:  true,  // flag to indicate it's approximate
    basketCount: valid.length,
  };
}

async function handleVNIndex(request) {
  if (request.method === 'OPTIONS') return preflight();
  const params = new URL(request.url).searchParams;
  const type   = params.get('type') ?? 'stocks';
  const custom = params.get('symbols') ?? '';

  // ── INDEX: Yahoo Finance for VNINDEX + VPS basket for VN30/HNX ──
  if (type === 'index') {
    try {
      const [vnResult, vn30Stocks, hnxStocks] = await Promise.allSettled([
        fetchYahooIndex('%5EVNINDEX.VN', 'VNINDEX'),
        fetchVpsBasket(VN30_BASKET),
        fetchVpsBasket(HNX_BASKET),
      ]);

      const indices = [];

      if (vnResult.status === 'fulfilled' && vnResult.value) {
        indices.push(vnResult.value);
      }
      if (vn30Stocks.status === 'fulfilled') {
        const idx = basketToIndex(vn30Stocks.value, 'VN30', 'VN30');
        if (idx) indices.push(idx);
      }
      if (hnxStocks.status === 'fulfilled') {
        const idx = basketToIndex(hnxStocks.value, 'HNXINDEX', 'HNX-Index');
        if (idx) indices.push(idx);
      }

      return new Response(JSON.stringify(indices), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=60' },
      });
    } catch (err) {
      return cors(JSON.stringify({ error: err.message }), 500);
    }
  }

  // ── STOCKS: VPS direct ──
  let path;
  if (type === 'vn30')              path = `/getliststockdata/${VN30_BASKET}`;
  else if (type === 'custom' && custom) path = `/getliststockdata/${custom}`;
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

// ─── /vcb-rates ─────────────────────────────────────────────────────
async function handleVCBRates(request) {
  if (request.method === 'OPTIONS') return preflight();
  try {
    const res = await fetch(
      'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXml.aspx?b=10',
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.vietcombank.com.vn/' } }
    );
    const xml = await res.text();

    // Parse XML to JSON
    const dateMatch = xml.match(/<DateTime>([^<]+)<\/DateTime>/);
    const updated   = dateMatch ? dateMatch[1].trim() : '';

    const rates = [];
    const rateRegex = /<Exrate CurrencyCode="(\w+)" CurrencyName="([^"]+)" Buy="([^"]+)" Transfer="([^"]+)" Sell="([^"]+)" \/>/g;
    let m;
    while ((m = rateRegex.exec(xml)) !== null) {
      rates.push({
        code:     m[1].trim(),
        name:     m[2].trim(),
        buy:      m[3].trim(),
        transfer: m[4].trim(),
        sell:     m[5].trim(),
      });
    }

    return new Response(JSON.stringify({ updated, rates, source: 'Vietcombank' }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=300' },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /lottery ────────────────────────────────────────────────────────
// Proxy minhngoc.net.vn JS and parse prize data via regex (no jQuery)
async function handleLottery(request) {
  if (request.method === 'OPTIONS') return preflight();
  const params = new URL(request.url).searchParams;
  const region = params.get('region') ?? 'mien-bac';
  const date   = params.get('date');   // DD-MM-YYYY or empty for today

  // Validate region (allow alphanumeric + dash)
  if (!/^[a-z-]+$/.test(region)) return cors('{"error":"invalid region"}', 400);

  const baseUrl = `https://www.minhngoc.net.vn/getkqxs/${region}`;
  const scriptUrl = date ? `${baseUrl}/${date}.js` : `${baseUrl}.js`;

  try {
    const res = await fetch(scriptUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.minhngoc.net.vn/' }
    });
    if (!res.ok) return cors(JSON.stringify({ error: 'not_found', date, region }), 404);

    const js = await res.text();

    // minhngoc script calls: $('#box_kqxs_minhngoc').append('...HTML...')
    // Extract all appended HTML fragments
    const htmlFragments = [];
    const appendRe = /\.append\('([\s\S]+?)'\);/g;
    let m;
    while ((m = appendRe.exec(js)) !== null) {
      // unescape the string
      htmlFragments.push(m[1].replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\t/g, '\t'));
    }
    const html = htmlFragments.join('');

    // Extract date from the HTML
    const dateMatch = html.match(/Ng[àa]y:\s*(?:<[^>]+>)*([0-9\/]+)/i)
                   || js.match(/value="(\d{2}-\d{2}-\d{4})" selected/);
    const drawDate = dateMatch ? dateMatch[1] : (date ?? 'N/A');

    // Extract prizes using regex on the appended HTML
    const prizes = [];
    // Pattern: <td class="giaiXl">LABEL</td><td class="giaiX">NUMBERS</td>
    const prizeRe = /<td[^>]*class="([^"]*giai[^"]*l[^"]*)"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*class="([^"]*giai[^"]*)"[^>]*>([\s\S]*?)<\/td>/gi;
    while ((m = prizeRe.exec(html)) !== null) {
      const label = m[2].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, (e) => {
        const map = {'&agrave;':'à','&igrave;':'ì','&aacute;':'á','&eacute;':'é','&nbsp;':' '};
        return map[e] ?? e;
      }).trim();
      const nums  = m[4].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (label && nums) prizes.push({ label, numbers: nums });
    }

    // Fallback: simpler pattern
    if (!prizes.length) {
      const fallRe = /class="giai(?:db|1|2|3|4|5|6|7)"[^>]*>([\s\S]*?)<\/td>/gi;
      while ((m = fallRe.exec(html)) !== null) {
        const nums = m[1].replace(/<[^>]+>/g, '').trim();
        if (nums) prizes.push({ label: '—', numbers: nums });
      }
    }

    return new Response(JSON.stringify({ region, date: drawDate, prizes, raw: prizes.length ? undefined : html.slice(0, 2000) }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=120' },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /football ────────────────────────────────────────────────────────
// Proxy TheSportsDB for PL + World Cup 2026 data (no API key needed)
const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';
const FOOTBALL_LEAGUES = {
  wc: { id: '4429', name: 'FIFA World Cup 2026', season: '2026' },
  pl: { id: '4328', name: 'Premier League',      season: '2025-2026' },
};

async function handleFootball(request) {
  if (request.method === 'OPTIONS') return preflight();
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') ?? 'wc';
  const type   = searchParams.get('type')   ?? 'next';
  const id     = searchParams.get('id')     ?? '';

  const lg = FOOTBALL_LEAGUES[league];

  let url;
  // League-level endpoints
  if (type === 'next' && lg)      url = `${TSDB_BASE}/eventsnextleague.php?id=${lg.id}`;
  else if (type === 'past' && lg) url = `${TSDB_BASE}/eventspastleague.php?id=${lg.id}`;
  else if (type === 'table' && lg)url = `${TSDB_BASE}/lookuptable.php?l=${lg.id}&s=${lg.season}`;
  else if (type === 'season' && lg)url = `${TSDB_BASE}/eventsseason.php?id=${lg.id}&s=${lg.season}`;
  // Item-level endpoints (id required)
  else if (type === 'event-detail') url = `${TSDB_BASE}/lookupevent.php?id=${id}`;
  else if (type === 'team')         url = `${TSDB_BASE}/lookupteam.php?id=${id}`;
  else if (type === 'team-next')    url = `${TSDB_BASE}/eventsnext.php?id=${id}`;
  else if (type === 'team-last')    url = `${TSDB_BASE}/eventslast.php?id=${id}`;
  else return cors(JSON.stringify({ error: 'unknown type' }), 400);

  if (!url) return cors(JSON.stringify({ error: 'missing league or id' }), 400);

  try {
    const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    return new Response(JSON.stringify({ league, type, leagueName: lg?.name ?? '', ...data }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=60' },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
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
    if (pathname === '/vcb-rates')     return handleVCBRates(request);
    if (pathname === '/lottery')       return handleLottery(request);
    if (pathname === '/football')      return handleFootball(request);

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
