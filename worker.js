/**
 * worker.js — Cloudflare Worker chính
 * Routes: /phat-nguoi, /news-rss, /news-article, /vnindex, /power-outage, /vcb-rates
 *         /weather, /gold, /aqi  (proxy bảo mật — key lưu trong Cloudflare Secrets)
 *
 * Cách set secrets:
 *   wrangler secret put OWM_API_KEY
 *   wrangler secret put GOLD_API_KEY
 *   wrangler secret put AQICN_TOKEN
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
const HNX_BASKET = 'SHB,NVB,SHS,HUT,TNG,PVC,DXG,SCI,S55,IDJ,PGS,VGS,NHA,CEO,HND';
// VNINDEX representative basket (fallback khi Yahoo Finance bị block)
const VNINDEX_BASKET = 'VCB,BID,CTG,TCB,VPB,MBB,HPG,VIC,VHM,VNM,MSN,SAB,GAS,PLX,FPT,VJC,MWG,POW,GVR,SSI';

async function fetchYahooIndex(yfSym, symName) {
  // Symbol đúng: ^VNINDEX.VN (encoded: %5EVNINDEX.VN) — dùng query2 (query1 trả về Not Found)
  const res = await fetch(
    `https://query2.finance.yahoo.com/v8/finance/chart/${yfSym}?interval=1d&range=1d`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    }
  );
  if (!res.ok) return null;
  const d = await res.json();
  const result = d?.chart?.result?.[0];
  if (!result) return null;
  const meta   = result.meta;
  const price  = meta.regularMarketPrice;
  if (!price) return null;
  const prev   = meta.chartPreviousClose ?? meta.previousClose ?? price;
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
  const res = await fetch(`${VPS_BASE}/getliststockdata/${symbols}`, {
    headers: {
      'Referer': 'https://banggia.vps.com.vn/',
      'Origin': 'https://banggia.vps.com.vn',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`VPS HTTP ${res.status}`);
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

  // ── INDEX: Yahoo Finance (query2, symbol ^VNINDEX.VN) + VPS basket cho VN30/HNX ──
  if (type === 'index') {
    try {
      const [vnResult, vn30Stocks, hnxStocks, vnidxBasket] = await Promise.allSettled([
        fetchYahooIndex('%5EVNINDEX.VN', 'VNINDEX'),  // query2 + symbol ^VNINDEX.VN — đã xác nhận hoạt động
        fetchVpsBasket(VN30_BASKET),
        fetchVpsBasket(HNX_BASKET),
        fetchVpsBasket(VNINDEX_BASKET),             // fallback nếu Yahoo bị block
      ]);

      const indices = [];

      // Ưu tiên Yahoo Finance; nếu fail → dùng VPS basket làm proxy VNINDEX
      if (vnResult.status === 'fulfilled' && vnResult.value) {
        indices.push(vnResult.value);
      } else if (vnidxBasket.status === 'fulfilled') {
        const idx = basketToIndex(vnidxBasket.value, 'VNINDEX', 'VN-Index');
        if (idx) indices.push(idx);
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
  const url    = new URL(request.url);
  const action = url.searchParams.get('action');

  const BROWSER_HEADERS = {
    'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language':  'vi-VN,vi;q=0.9,en-US;q=0.8',
    'Referer':          'https://cskh.evnspc.vn/TraCuu/LichNgungGiamCungCapDien',
    'X-Requested-With': 'XMLHttpRequest',
  };

  try {
    let upstreamUrl;

    if (action === 'danhsach') {
      const maDviCha = url.searchParams.get('pMA_DVICTREN') || '';
      upstreamUrl = `https://cskh.evnspc.vn/TraCuu/GetDanhMucDienLuc?pMA_DVICTREN=${encodeURIComponent(maDviCha)}`;
    } else if (action === 'tracuu') {
      const madvi    = url.searchParams.get('madvi')    || '';
      const tuNgay   = url.searchParams.get('tuNgay')   || '';
      const denNgay  = url.searchParams.get('denNgay')  || '';
      upstreamUrl = `https://cskh.evnspc.vn/TraCuu/GetThongTinLichNgungGiamCungCapDien?madvi=${encodeURIComponent(madvi)}&tuNgay=${encodeURIComponent(tuNgay)}&denNgay=${encodeURIComponent(denNgay)}&ChucNang=MaDonVi`;
    } else if (action === 'tracuu-makh') {
      const maKH    = url.searchParams.get('maKH')    || '';
      const tuNgay  = url.searchParams.get('tuNgay')  || '';
      const denNgay = url.searchParams.get('denNgay') || '';
      upstreamUrl = `https://cskh.evnspc.vn/TraCuu/GetThongTinLichNgungGiamCungCapDien?maKH=${encodeURIComponent(maKH)}&tuNgay=${encodeURIComponent(tuNgay)}&denNgay=${encodeURIComponent(denNgay)}&ChucNang=MaKhachHang`;
    } else {
      return cors(JSON.stringify({ error: 'Invalid action. Use: danhsach | tracuu | tracuu-makh' }), 400);
    }

    const upstream = await fetch(upstreamUrl, {
      method:  'GET',
      headers: BROWSER_HEADERS,
    });

    const html = await upstream.text();
    return new Response(html, {
      status:  upstream.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        ...CORS,
      },
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
async function handleFootball(request) {
  if (request.method === 'OPTIONS') return preflight();
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') ?? 'eng.1';
  const type   = searchParams.get('type')   ?? 'scoreboard';
  const id     = searchParams.get('id')     ?? '';

  let url;
  if (type === 'table') {
    url = `https://site.api.espn.com/apis/v2/sports/soccer/${league}/standings`;
  } else if (type === 'scoreboard') {
    url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`;
  } else if (type === 'summary') {
    url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${id}`;
  } else if (type === 'team') {
    url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams/${id}`;
  } else if (type === 'team-schedule') {
    url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams/${id}/schedule`;
  } else {
    return cors(JSON.stringify({ error: 'unknown type' }), 400);
  }

  try {
    const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.text();
    return new Response(data, {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=60' },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /weather (proxy bảo mật — key lưu trong env.OWM_API_KEY) ──────
async function handleWeather(request, env) {
  if (request.method === 'OPTIONS') return preflight();
  const key = env.OWM_API_KEY;
  if (!key) return cors(JSON.stringify({ error: 'OWM_API_KEY chưa được cấu hình trong Cloudflare Secrets.' }), 503);

  const params   = new URL(request.url).searchParams;
  const endpoint = params.get('endpoint') ?? 'weather'; // 'weather' | 'forecast' | 'air_pollution'
  const q        = params.get('q')        ?? '';
  const lat      = params.get('lat')      ?? '';
  const lon      = params.get('lon')      ?? '';
  const cnt      = params.get('cnt')      ?? '';
  const lang     = params.get('lang')     ?? 'vi';
  const units    = params.get('units')    ?? 'metric';

  let upstreamUrl;
  if (endpoint === 'air_pollution') {
    if (!lat || !lon) return cors(JSON.stringify({ error: 'lat/lon required for air_pollution' }), 400);
    upstreamUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${key}`;
  } else {
    if (!q) return cors(JSON.stringify({ error: 'q (city name) required' }), 400);
    upstreamUrl = `https://api.openweathermap.org/data/2.5/${endpoint}?q=${encodeURIComponent(q)}&appid=${key}&units=${units}&lang=${lang}${cnt ? '&cnt=' + cnt : ''}`;
  }

  try {
    const res  = await fetch(upstreamUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=300' },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /gold (proxy bảo mật — key lưu trong env.GOLD_API_KEY) ─────────
async function handleGold(request, env) {
  if (request.method === 'OPTIONS') return preflight();
  const key = env.GOLD_API_KEY;
  if (!key) return cors(JSON.stringify({ error: 'GOLD_API_KEY chưa được cấu hình trong Cloudflare Secrets.' }), 503);

  try {
    const res  = await fetch('https://www.goldapi.io/api/XAU/USD', {
      headers: { 'x-access-token': key, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=120' },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /aqi (proxy bảo mật — token lưu trong env.AQICN_TOKEN) ─────────
async function handleAQI(request, env) {
  if (request.method === 'OPTIONS') return preflight();
  const token = env.AQICN_TOKEN;
  if (!token) return cors(JSON.stringify({ error: 'AQICN_TOKEN chưa được cấu hình trong Cloudflare Secrets.' }), 503);

  const station = new URL(request.url).searchParams.get('station') ?? 'ho-chi-minh-city';
  // Chỉ cho phép ký tự an toàn (@, chữ số, chữ thường, gạch ngang)
  if (!/^[@a-z0-9\-]+$/.test(station)) return cors(JSON.stringify({ error: 'invalid station' }), 400);

  try {
    const res  = await fetch(`https://api.waqi.info/feed/${encodeURIComponent(station)}/?token=${token}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=120' },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /api/todos (proxy bảo mật bảo vệ Supabase URL và Key) ────────
async function handleTodos(request, env) {
  if (request.method === 'OPTIONS') return preflight();
  
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_KEY;
  
  if (!url || !key) {
    return cors(JSON.stringify({ error: `Supabase URL or Key is missing. URL length: ${url ? url.length : 0}, Key length: ${key ? key.length : 0}` }), 503);
  }

  // Diagnostic format check
  if (!key.startsWith('eyJ')) {
    return cors(JSON.stringify({ 
      error: 'SUPABASE_KEY on Cloudflare is invalid. It must start with "eyJ" (the JWT anon public key), but it currently starts with: ' + key.substring(0, 15) + '... (Length: ' + key.length + ')'
    }), 400);
  }

  const supabaseHeaders = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  try {
    if (request.method === 'GET') {
      const res = await fetch(`${url}/rest/v1/todos?select=*&order=created_at.desc`, {
        headers: supabaseHeaders
      });
      const data = await res.text();
      return new Response(data, {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
      });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const res = await fetch(`${url}/rest/v1/todos`, {
        method: 'POST',
        headers: {
          ...supabaseHeaders,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(body)
      });
      const data = await res.text();
      return new Response(data, {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
      });
    }

    if (request.method === 'DELETE') {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return cors(JSON.stringify({ error: 'id required' }), 400);

      const res = await fetch(`${url}/rest/v1/todos?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: supabaseHeaders
      });
      const data = await res.text();
      return new Response(data, {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
      });
    }

    return cors(JSON.stringify({ error: 'method not allowed' }), 405);
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
    if (pathname === '/api/todos')     return handleTodos(request, env);

    // ── Routes bảo mật (key ẩn trong Cloudflare Secrets) ──
    if (pathname === '/weather')       return handleWeather(request, env);
    if (pathname === '/gold')          return handleGold(request, env);
    if (pathname === '/aqi')           return handleAQI(request, env);

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
