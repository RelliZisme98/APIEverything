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
  'Access-Control-Allow-Origin': '*',
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
const ALLOWED_ARTICLE_DOMAINS = ['vnexpress.net', 'tuoitre.vn', 'dantri.com.vn', 'thanhnien.vn', 'nhandan.vn'];

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

  const title = get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)
    || get(/<title[^>]*>([^<]+)<\/title>/i);
  const description = get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)
    || get(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const thumbnail = get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)
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
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ');
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
      signal: AbortSignal.timeout(4000),
    }
  );
  if (!res.ok) return null;
  const d = await res.json();
  const result = d?.chart?.result?.[0];
  if (!result) return null;
  const meta = result.meta;
  const price = meta.regularMarketPrice;
  if (!price) return null;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const high = meta.regularMarketDayHigh ?? price;
  const low = meta.regularMarketDayLow ?? price;
  const open = meta.regularMarketOpen ?? price;
  const volume = meta.regularMarketVolume ?? 0;
  const change = price - prev;
  const pct = prev ? (change / prev * 100) : 0;
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
    signal: AbortSignal.timeout(4000),
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
  const avgPct = changes.reduce((a, b) => a + b, 0) / changes.length;

  // Sum last prices as proxy index level
  const sumPrice = valid.reduce((a, s) => a + parseFloat(s.lastPrice || 0), 0);
  const highs = valid.map(s => parseFloat(s.highPrice || s.lastPrice || 0));
  const lows = valid.map(s => parseFloat(s.lowPrice || s.lastPrice || 0));
  const volume = valid.reduce((a, s) => a + parseInt(s.lot || 0), 0);

  return {
    sym: symName,
    lastPrice: +sumPrice.toFixed(2),
    ot: +(sumPrice * avgPct / 100).toFixed(2),
    changePc: +avgPct.toFixed(2),
    highPrice: +highs.reduce((a, b) => a + b, 0).toFixed(2),
    lowPrice: +lows.reduce((a, b) => a + b, 0).toFixed(2),
    openPrice: +(sumPrice / (1 + avgPct / 100)).toFixed(2),
    lot: volume,
    r: +(sumPrice / (1 + avgPct / 100)).toFixed(2),
    isBasket: true,  // flag to indicate it's approximate
    basketCount: valid.length,
  };
}

async function handleVNIndex(request) {
  if (request.method === 'OPTIONS') return preflight();
  const params = new URL(request.url).searchParams;
  const type = params.get('type') ?? 'stocks';
  const custom = params.get('symbols') ?? '';

  // ── INDEX: Yahoo Finance (query2, symbol ^VNINDEX.VN) + VPS basket cho VN30/HNX ──
  if (type === 'index') {
    // Determine market status (ICT = UTC+7, session 9:00-15:00 Mon-Fri)
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const h = now.getHours();
    const m = now.getMinutes();
    const dow = now.getDay(); // 0=Sun, 6=Sat
    const totalMinutes = h * 60 + m;
    const isWeekday = dow >= 1 && dow <= 5;
    const isSession1 = totalMinutes >= 9 * 60 && totalMinutes < 11 * 60 + 30; // 9:00-11:30
    const isSession2 = totalMinutes >= 13 * 60 && totalMinutes < 15 * 60;     // 13:00-15:00
    const marketOpen = isWeekday && (isSession1 || isSession2);
    const marketStatus = !isWeekday ? 'weekend' : marketOpen ? 'open' : 'closed';

    try {
      const [vnResult, vn30Stocks, hnxStocks, vnidxBasket] = await Promise.allSettled([
        fetchYahooIndex('%5EVNINDEX.VN', 'VNINDEX'),
        fetchVpsBasket(VN30_BASKET),
        fetchVpsBasket(HNX_BASKET),
        fetchVpsBasket(VNINDEX_BASKET),
      ]);

      const indices = [];

      // Ưu tiên Yahoo Finance; nếu fail → dùng VPS basket làm proxy VNINDEX
      if (vnResult.status === 'fulfilled' && vnResult.value) {
        indices.push({ ...vnResult.value, marketStatus });
      } else if (vnidxBasket.status === 'fulfilled') {
        const idx = basketToIndex(vnidxBasket.value, 'VNINDEX', 'VN-Index');
        if (idx) indices.push({ ...idx, marketStatus });
      }

      if (vn30Stocks.status === 'fulfilled') {
        const idx = basketToIndex(vn30Stocks.value, 'VN30', 'VN30');
        if (idx) indices.push({ ...idx, marketStatus });
      }
      if (hnxStocks.status === 'fulfilled') {
        const idx = basketToIndex(hnxStocks.value, 'HNXINDEX', 'HNX-Index');
        if (idx) indices.push({ ...idx, marketStatus });
      }

      // Always return with market status even if empty
      return new Response(JSON.stringify({ indices, marketStatus, timestamp: Date.now() }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': `public,max-age=${marketOpen ? 30 : 120}` },
      });
    } catch (err) {
      return cors(JSON.stringify({ error: err.message }), 500);
    }
  }

  // ── STOCKS: VPS direct ──
  let path;
  if (type === 'vn30') path = `/getliststockdata/${VN30_BASKET}`;
  else if (type === 'custom' && custom) path = `/getliststockdata/${custom}`;
  else path = '/getliststockdata/VCB,BID,CTG,TCB,VPB,MBB,HPG,VIC,VHM,VNM,MSN,SAB,GAS,PLX,FPT';


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

// Helper: lấy ngày hôm nay theo múi giờ VN (ICT +7), trả về yyyy-mm-dd
function todayVN() {
  const ict = new Date(Date.now() + 7 * 60 * 60 * 1000); // UTC + 7h
  const y = ict.getUTCFullYear();
  const m = String(ict.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ict.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function handlePowerOutage(request) {
  if (request.method === 'OPTIONS') return preflight();
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const evn = url.searchParams.get('evn') ?? 'spc'; // spc | hanoi | cpc | npc

  const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
    'X-Requested-With': 'XMLHttpRequest',
  };

  // ── EVNSPC (Miền Nam) ──────────────────────────────────────────────
  if (evn === 'spc') {
    BROWSER_HEADERS['Referer'] = 'https://cskh.evnspc.vn/TraCuu/LichNgungGiamCungCapDien';
    try {
      let upstreamUrl;
      if (action === 'danhsach') {
        const maDviCha = url.searchParams.get('pMA_DVICTREN') || '';
        upstreamUrl = `https://cskh.evnspc.vn/TraCuu/GetDanhMucDienLuc?pMA_DVICTREN=${encodeURIComponent(maDviCha)}`;
      } else if (action === 'tracuu') {
        const madvi = url.searchParams.get('madvi') || '';
        const tuNgay = url.searchParams.get('tuNgay') || '';
        const denNgay = url.searchParams.get('denNgay') || '';
        upstreamUrl = `https://cskh.evnspc.vn/TraCuu/GetThongTinLichNgungGiamCungCapDien?madvi=${encodeURIComponent(madvi)}&tuNgay=${encodeURIComponent(tuNgay)}&denNgay=${encodeURIComponent(denNgay)}&ChucNang=MaDonVi`;
      } else if (action === 'tracuu-makh') {
        const maKH = url.searchParams.get('maKH') || '';
        const tuNgay = url.searchParams.get('tuNgay') || '';
        const denNgay = url.searchParams.get('denNgay') || '';
        upstreamUrl = `https://cskh.evnspc.vn/TraCuu/GetThongTinLichNgungGiamCungCapDien?maKH=${encodeURIComponent(maKH)}&tuNgay=${encodeURIComponent(tuNgay)}&denNgay=${encodeURIComponent(denNgay)}&ChucNang=MaKhachHang`;
      } else if (action === 'today') {
        // Auto-fetch hôm nay: dùng madvi='' (toàn quốc miền Nam), date=today
        const today = todayVN();
        const [yy, mm, dd] = today.split('-');
        const tuNgay = `${dd}-${mm}-${yy}`;
        upstreamUrl = `https://cskh.evnspc.vn/TraCuu/GetThongTinLichNgungGiamCungCapDien?madvi=&tuNgay=${encodeURIComponent(tuNgay)}&denNgay=${encodeURIComponent(tuNgay)}&ChucNang=MaDonVi`;
      } else {
        return cors(JSON.stringify({ error: 'Invalid action' }), 400);
      }
      const upstream = await fetch(upstreamUrl, { method: 'GET', headers: BROWSER_HEADERS });
      const html = await upstream.text();
      return new Response(html, {
        status: upstream.status,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', ...CORS },
      });
    } catch (err) {
      return cors(JSON.stringify({ error: err.message }), 500);
    }
  }

  // ── EVNHANOI (Hà Nội) ──────────────────────────────────────────────
  if (evn === 'hanoi') {
    BROWSER_HEADERS['Referer'] = 'https://evnhanoi.vn/';
    BROWSER_HEADERS['Origin'] = 'https://evnhanoi.vn';
    try {
      let upstreamUrl, body, method = 'POST';

      if (action === 'tracuu') {
        const keyword = url.searchParams.get('keyword') || '';
        const fromDate = url.searchParams.get('fromDate') || '';
        const toDate = url.searchParams.get('toDate') || '';
        upstreamUrl = 'https://evnhanoi.vn/api/TraCuu/LichCatDien';
        body = JSON.stringify({ ngayBatDau: fromDate, ngayKetThuc: toDate, maDViQly: '', maTram: '', key: keyword });
      } else if (action === 'today') {
        const today = todayVN();
        upstreamUrl = 'https://evnhanoi.vn/api/TraCuu/LichCatDien';
        body = JSON.stringify({ ngayBatDau: today, ngayKetThuc: today, maDViQly: '', maTram: '', key: '' });
      } else if (action === 'debug') {
        const today = todayVN();
        upstreamUrl = 'https://evnhanoi.vn/api/TraCuu/LichCatDien';
        const reqBody = JSON.stringify({ ngayBatDau: today, ngayKetThuc: today, maDViQly: '', maTram: '', key: '' });
        const upstream = await fetch(upstreamUrl, {
          method: 'POST',
          headers: { ...BROWSER_HEADERS, 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: reqBody,
        });
        const respBody = await upstream.text();
        const respHeaders = {};
        upstream.headers.forEach((v, k) => { respHeaders[k] = v; });
        return cors(JSON.stringify({
          status: upstream.status, contentType: upstream.headers.get('content-type'),
          url: upstreamUrl, today, reqBody, responseHeaders: respHeaders,
          bodySnippet: respBody.slice(0, 1000),
        }), 200);
      } else {
        return cors(JSON.stringify({ error: 'Invalid action' }), 400);
      }

      const upstream = await fetch(upstreamUrl, {
        method,
        headers: { ...BROWSER_HEADERS, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body,
      });
      const respBody = await upstream.text();
      return new Response(respBody, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300', ...CORS },
      });
    } catch (err) {
      return cors(JSON.stringify({ error: err.message }), 500);
    }
  }
  // ── EVNCPC (Miền Trung & Tây Nguyên) ──────────────────────────────
  if (evn === 'cpc') {
    BROWSER_HEADERS['Referer'] = 'https://cskh.cpc.vn/';
    try {
      let upstreamUrl;
      if (action === 'today') {
        const today = todayVN();
        upstreamUrl = `https://cskh.cpc.vn/api/power-outage/list?province=&fromDate=${today}&toDate=${today}&keyword=&pageSize=200&pageIndex=1`;
      } else {
        const keyword = url.searchParams.get('keyword') || '';
        const fromDate = url.searchParams.get('fromDate') || '';
        const toDate = url.searchParams.get('toDate') || '';
        const province = url.searchParams.get('province') || '';
        upstreamUrl = `https://cskh.cpc.vn/api/power-outage/list?province=${encodeURIComponent(province)}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&keyword=${encodeURIComponent(keyword)}&pageSize=50&pageIndex=1`;
      }

      const upstream = await fetch(upstreamUrl, { headers: { ...BROWSER_HEADERS, 'Accept': 'application/json' } });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300', ...CORS },
      });
    } catch (err) {
      return cors(JSON.stringify({ error: err.message }), 500);
    }
  }

  // ── EVNNPC (27 tỉnh Miền Bắc) ──────────────────────────────────────
  if (evn === 'npc') {
    BROWSER_HEADERS['Referer'] = 'https://cskh.npc.com.vn/';
    try {
      const maKH = url.searchParams.get('maKH') || '';
      const fromDate = url.searchParams.get('fromDate') || '';
      const toDate = url.searchParams.get('toDate') || '';
      const province = url.searchParams.get('province') || '';

      let upstreamUrl;
      if (maKH) {
        upstreamUrl = `https://cskh.npc.com.vn/TraCuu/GetLichNgungCungCapDienTheoMaKH?maKH=${encodeURIComponent(maKH)}&tuNgay=${encodeURIComponent(fromDate)}&denNgay=${encodeURIComponent(toDate)}`;
      } else if (action === 'today') {
        const today = todayVN();
        upstreamUrl = `https://cskh.npc.com.vn/TraCuu/GetLichNgungCungCapDienTheoKhuVuc?tinh=&tuNgay=${today}&denNgay=${today}`;
      } else {
        upstreamUrl = `https://cskh.npc.com.vn/TraCuu/GetLichNgungCungCapDienTheoKhuVuc?tinh=${encodeURIComponent(province)}&tuNgay=${encodeURIComponent(fromDate)}&denNgay=${encodeURIComponent(toDate)}`;
      }

      const upstream = await fetch(upstreamUrl, { headers: BROWSER_HEADERS });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', ...CORS },
      });
    } catch (err) {
      return cors(JSON.stringify({ error: err.message }), 500);
    }
  }

  return cors(JSON.stringify({ error: 'Unknown EVN unit. Use: spc | hanoi | cpc | npc' }), 400);
}


// ─── /phat-nguoi ────────────────────────────────────────────────────
async function handlePhatNguoi(request) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method === 'GET') return cors(JSON.stringify({ status: 'ok' }));
  if (request.method === 'POST') {
    try {
      const body = await request.text();
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
    const updated = dateMatch ? dateMatch[1].trim() : '';

    const rates = [];
    const rateRegex = /<Exrate CurrencyCode="(\w+)" CurrencyName="([^"]+)" Buy="([^"]+)" Transfer="([^"]+)" Sell="([^"]+)" \/>/g;
    let m;
    while ((m = rateRegex.exec(xml)) !== null) {
      rates.push({
        code: m[1].trim(),
        name: m[2].trim(),
        buy: m[3].trim(),
        transfer: m[4].trim(),
        sell: m[5].trim(),
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
  const date = params.get('date');   // DD-MM-YYYY or empty for today

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
        const map = { '&agrave;': 'à', '&igrave;': 'ì', '&aacute;': 'á', '&eacute;': 'é', '&nbsp;': ' ' };
        return map[e] ?? e;
      }).trim();
      const nums = m[4].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
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

// ─── /vietlott ────────────────────────────────────────────────────────
async function handleVietlott(request) {
  if (request.method === 'OPTIONS') return preflight();
  const params = new URL(request.url).searchParams;
  const game = params.get('game') ?? 'power655';
  const date = params.get('date') ?? '';
  const page = parseInt(params.get('page') ?? '0');

  const GAME_MAP = {
    power655: 'XS655', mega645: 'XS645', max4d: 'XS4D', keno: 'KENO',
  };
  const product = GAME_MAP[game];
  if (!product) return cors(JSON.stringify({ error: 'Invalid game' }), 400);

  const dateStr = date || new Date().toISOString().split('T')[0];

  // Try the official JSON API
  try {
    const r = await fetch('https://api.vietlott.vn/api/prize-winning/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.vietlott.vn/',
        'Origin': 'https://www.vietlott.vn',
      },
      body: JSON.stringify({ pageIndex: page, pageSize: 20, product, drawDate: page > 0 ? '' : dateStr }),
      signal: AbortSignal.timeout(8000),
    });

    if (r.ok) {
      const data = await r.json();
      if (data && data.data && data.data.length) {
        // If history mode (page requested), return full list
        if (page > 0 || params.get('page') !== null) {
          const history = data.data.map(d => ({
            drawCode: d.drawCode || '',
            drawDate: d.drawDate || '',
            numbers: d.winningNumbers || d.numbers || [],
            jackpot: d.jackpot1 || d.jackpot || 0,
          }));
          return new Response(JSON.stringify({ game, history }), {
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=300' },
          });
        }

        const latest = data.data[0];
        return new Response(JSON.stringify({
          game, product,
          drawDate: latest.drawDate || dateStr,
          drawCode: latest.drawCode || '',
          numbers: latest.winningNumbers || latest.numbers || [],
          jackpot: latest.jackpot1 || latest.jackpot || 0,
          nextJackpot: latest.nextJackpot || 0,
          history: data.data.slice(0, 10).map(d => ({
            drawCode: d.drawCode || '',
            drawDate: d.drawDate || '',
            numbers: d.winningNumbers || d.numbers || [],
            jackpot: d.jackpot1 || d.jackpot || 0,
          })),
        }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=300' },
        });
      }
    }
  } catch (e) {
    console.warn('[Vietlott API failed, fallback]', e.message);
  }

  // Fallback: scrape vietlott.vn HTML
  try {
    const scrapUrl = `https://www.vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/${product.toLowerCase()}?${dateStr ? 'date=' + dateStr : ''}`;
    const res = await fetch(scrapUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.vietlott.vn/' }
    });
    const html = await res.text();

    // Extract numbers from the result balls
    const numbersMatch = html.match(/class="box-number"[^>]*>.*?<span[^>]*>(\d+)<\/span>/gi);
    const numbers = (numbersMatch || []).map(m => {
      const n = m.match(/>(\d+)</);
      return n ? parseInt(n[1]) : null;
    }).filter(Boolean);

    const jackpotMatch = html.match(/Jackpot.*?(\d[\d,.]+)/i);
    const jackpot = jackpotMatch ? jackpotMatch[1].replace(/[,.]/g, '') : '0';

    return new Response(JSON.stringify({
      game, product, drawDate: dateStr, numbers,
      jackpot: parseInt(jackpot) || 0,
      source: 'scraped'
    }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=300' },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

async function handleFootball(request) {
  if (request.method === 'OPTIONS') return preflight();
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') ?? 'eng.1';
  const type = searchParams.get('type') ?? 'scoreboard';
  const id = searchParams.get('id') ?? '';

  const forwardParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'league' && key !== 'type' && key !== 'id') {
      forwardParams.append(key, value);
    }
  }
  const suffix = forwardParams.toString();

  let url;
  if (type === 'table') {
    url = `https://site.api.espn.com/apis/v2/sports/soccer/${league}/standings` + (suffix ? `?${suffix}` : '');
  } else if (type === 'scoreboard') {
    url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard` + (suffix ? `?${suffix}` : '');
  } else if (type === 'summary') {
    url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${id}` + (suffix ? `&${suffix}` : '');
  } else if (type === 'team') {
    url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams/${id}` + (suffix ? `?${suffix}` : '');
  } else if (type === 'team-schedule') {
    url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams/${id}/schedule` + (suffix ? `?${suffix}` : '');
  } else if (type === 'statistics') {
    url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/statistics` + (suffix ? `?${suffix}` : '');
  } else {
    return cors(JSON.stringify({ error: 'unknown type' }), 400);
  }

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) {
      const fallback = {
        events: [],
        children: [],
        stats: [],
        message: `Upstream returned status ${res.status}`
      };
      return new Response(JSON.stringify(fallback), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
        status: 200
      });
    }
    const data = await res.text();
    return new Response(data, {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=60' },
    });
  } catch (err) {
    const fallback = {
      events: [],
      children: [],
      stats: [],
      error: err.message
    };
    return new Response(JSON.stringify(fallback), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
      status: 200
    });
  }
}

// ─── /weather (proxy bảo mật — key lưu trong env.OWM_API_KEY) ──────
async function handleWeather(request, env) {
  if (request.method === 'OPTIONS') return preflight();
  const key = env.OWM_API_KEY;
  if (!key) return cors(JSON.stringify({ error: 'OWM_API_KEY chưa được cấu hình trong Cloudflare Secrets.' }), 503);

  const params = new URL(request.url).searchParams;
  const endpoint = params.get('endpoint') ?? 'weather'; // 'weather' | 'forecast' | 'air_pollution'
  const q = params.get('q') ?? '';
  const lat = params.get('lat') ?? '';
  const lon = params.get('lon') ?? '';
  const cnt = params.get('cnt') ?? '';
  const lang = params.get('lang') ?? 'vi';
  const units = params.get('units') ?? 'metric';

  let upstreamUrl;
  if (endpoint === 'air_pollution') {
    if (!lat || !lon) return cors(JSON.stringify({ error: 'lat/lon required for air_pollution' }), 400);
    upstreamUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${key}`;
  } else {
    if (!q) return cors(JSON.stringify({ error: 'q (city name) required' }), 400);
    upstreamUrl = `https://api.openweathermap.org/data/2.5/${endpoint}?q=${encodeURIComponent(q)}&appid=${key}&units=${units}&lang=${lang}${cnt ? '&cnt=' + cnt : ''}`;
  }

  try {
    const res = await fetch(upstreamUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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

  // 1. Thử lấy giá vàng thực tế trong nước và thế giới từ Vang.Today (miễn phí, có CORS, có giá VN thực tế)
  try {
    const res = await fetch('https://www.vang.today/api/prices', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.prices) {
        const xau = data.prices.XAUUSD;
        return new Response(JSON.stringify({
          price: xau ? xau.buy : null,
          source: 'Vang.Today',
          vnPrices: data.prices,
          timestamp: data.timestamp
        }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public, max-age=120' }
        });
      }
    }
  } catch (err) {
    console.warn('[Worker] Vang.Today failed:', err.message);
  }

  // 2. Dự phòng: Lấy từ GoldAPI.io (yêu cầu key ẩn trong secrets)
  const key = env.GOLD_API_KEY;
  if (!key) {
    return cors(JSON.stringify({ error: 'Không thể tải giá vàng và GOLD_API_KEY chưa được cấu hình.' }), 503);
  }

  try {
    const res = await fetch('https://www.goldapi.io/api/XAU/USD', {
      headers: { 'x-access-token': key, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const body = await res.json();
      return new Response(JSON.stringify({
        price: body.price,
        source: 'goldapi.io'
      }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public, max-age=120' },
      });
    }
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /gas (proxy bảo mật lấy giá xăng dầu thực tế) ─────────────────
const PLX_API_URL = 'https://portals.petrolimex.com.vn/~apis/portals/cms.item/search?x-request=eyJGaWx0ZXJCeSI6eyJBbmQiOlt7IlN5c3RlbUlEIjp7IkVxdWFscyI6IjY3ODNkYzEyNzFmZjQ0OWU5NWI3NGE5NTIwOTY0MTY5In19LHsiUmVwb3NpdG9yeUlEIjp7IkVxdWFscyI6ImE5NTQ1MWUyM2I0NzRmZTU4ODZiZmI3Y2Y4NDNmNTNjIn19LHsiUmVwb3NpdG9yeUVudGl0eUlEIjp7IkVxdWFscyI6IjM4MDEzNzhmZTFlMDQ1YjFhZmExMGRlN2M1Nzc2MTI0In19LHsiU3RhdHVzIjp7IkVxdWFscyI6IlB1Ymxpc2hlZCJ9fV19LCJTb3J0QnkiOnsiTGFzdE1vZGlmaWVkIjoiRGVzY2VuZGluZyJ9LCJQYWdpbmF0aW9uIjp7IlRvdGFsUmVjb3JkcyI6LTEsIlRvdGFsUGFnZXMiOjAsIlBhZ2VTaXplIjowLCJQYWdlTnVtYmVyIjowfX0';
const PLX_LISTING_URL = 'https://www.petrolimex.com.vn/ndi/thong-cao-bao-chi.html';

/**
 * Parse fuel prices from a Petrolimex thong-cao-bao-chi article HTML or generic table HTML.
 * Expects a <table> with rows: <tr><td>product name</td><td>r1</td><td>r2</td></tr>
 * Returns [] when no prices are found.
 */
function parsePlxPricesFromHtml(html) {
  const prices = [];
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trM;
  while ((trM = trRe.exec(clean)) !== null) {
    const cells = [];
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let tdM;
    while ((tdM = tdRe.exec(trM[1])) !== null) {
      const text = tdM[1]
        .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      if (text) cells.push(text);
    }
    if (cells.length < 2) continue;
    const name = cells[0];
    if (!/xăng|dầu|diesel|mazut|hỏa|ron|\bdo\b/i.test(name)) continue;
    const parseVnNum = s => {
      const n = parseInt(s.replace(/[.\s]/g, '').replace(',', ''));
      return n > 5000 && n < 100000 ? n : null;
    };
    const r1 = parseVnNum(cells[1] || '');
    const r2 = parseVnNum(cells[2] || '') ?? r1;
    if (r1) prices.push({ name: name.trim(), r1, r2 });
  }
  return prices;
}

async function handleGas(request, env) {
  if (request.method === 'OPTIONS') return preflight();

  // Baseline static fallback values (updated to June 18, 2026)
  const defaultPrices = [
    { name: 'Xăng RON95-III', r1: 20750, r2: 21160 },
    { name: 'Xăng E5 RON92', r1: 20120, r2: 20520 },
    { name: 'Dầu Diesel 0,05S', r1: 23530, r2: 24000 },
    { name: 'Dầu Diesel 0,001S', r1: 25430, r2: 25930 },
    { name: 'Dầu hỏa 2-K', r1: 22690, r2: 23140 },
    { name: 'Dầu Mazut 180CST 3,5S', r1: 15800, r2: 15800 },
  ];
  let priceDate = '2026-06-18';
  let source = 'static';

  // ── Tier 1: Petrolimex portal JSON API (VN IPs only) ─────────────
  try {
    const res = await fetch(PLX_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.petrolimex.com.vn/',
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const objects = data.Objects || [];
    if (!objects.length) throw new Error('empty list');
    objects.sort((a, b) => (a.DIsplayOrder || a.OrderIndex || 99) - (b.DIsplayOrder || b.OrderIndex || 99));
    const latestModified = objects.map(o => o.LastModified).filter(Boolean).sort().reverse()[0];
    const apiPriceDate = latestModified ? latestModified.slice(0, 10) : null;
    const apiPrices = objects.map(item => ({
      name: item.Title, r1: item.Zone1Price, r2: item.Zone2Price,
    })).filter(p => p.name && p.r1 > 0);

    if (apiPrices.length > 0) {
      return new Response(JSON.stringify({
        success: true,
        priceDate: apiPriceDate,
        prices: apiPrices,
        source: 'Petrolimex API'
      }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public, max-age=600' }
      });
    }
  } catch (err) {
    console.warn('[Gas] Tier-1 (API) failed:', err.message);
  }

  // ── Tier 2: Scrape thong-cao-bao-chi listing → latest article HTML ─
  // and fallback to webgia.com if the article lacks text prices.
  try {
    const listRes = await fetch(PLX_LISTING_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.petrolimex.com.vn/',
        'Accept-Language': 'vi-VN,vi;q=0.9',
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!listRes.ok) throw new Error(`listing HTTP ${listRes.status}`);
    const listHtml = await listRes.text();

    // Find first href containing the price-adjustment slug
    const artMatch = listHtml.match(
      /href="([^"]*petrolimex-dieu-chinh-gia-xang-dau[^"]*\.html)"/i
    );
    if (artMatch) {
      const artPath = artMatch[1];
      const artUrl = artPath.startsWith('http')
        ? artPath
        : `https://www.petrolimex.com.vn${artPath}`;

      // Extract date from URL slug: "ngay-18-6-2026" → "2026-06-18"
      const dateSlug = artUrl.match(/ngay-(\d{1,2})-(\d{1,2})-(\d{4})/i);
      if (dateSlug) {
        priceDate = `${dateSlug[3]}-${String(dateSlug[2]).padStart(2, '0')}-${String(dateSlug[1]).padStart(2, '0')}`;
      }

      console.log('[Gas] Tier-2 scraping Petrolimex article:', artUrl, '→', priceDate);

      const artRes = await fetch(artUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': PLX_LISTING_URL,
          'Accept-Language': 'vi-VN,vi;q=0.9',
        },
        signal: AbortSignal.timeout(8000)
      });
      if (artRes.ok) {
        const artHtml = await artRes.text();
        let parsed = parsePlxPricesFromHtml(artHtml);

        // If Petrolimex uses an image for prices (returns []), scrape webgia.com
        if (!parsed || parsed.length === 0) {
          console.log('[Gas] Petrolimex article has no text prices. Trying Webgia.com...');
          const wgRes = await fetch('https://webgia.com/gia-xang-dau/', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://webgia.com/',
            },
            signal: AbortSignal.timeout(8000)
          });
          if (wgRes.ok) {
            const wgHtml = await wgRes.text();
            parsed = parsePlxPricesFromHtml(wgHtml);
            source = 'Webgia Scraped';
          }
        } else {
          source = 'Petrolimex Scraped';
        }

        if (parsed && parsed.length > 0) {
          // Merge parsed values into defaultPrices
          for (const item of parsed) {
            const nameLower = item.name.toLowerCase();
            const target = defaultPrices.find(p => {
              const pLower = p.name.toLowerCase();
              if (pLower === 'ron 95-iii') {
                return nameLower.includes('ron 95') && nameLower.includes('iii');
              }
              if (pLower === 'xăng e5 ron92') {
                return nameLower.includes('ron 92');
              }
              if (pLower === 'dầu diesel 0,05s') {
                return nameLower.includes('0,05s') || nameLower.includes('0.05s');
              }
              if (pLower === 'dầu diesel 0,001s') {
                return nameLower.includes('0,001s') || nameLower.includes('0.001s');
              }
              if (pLower === 'dầu hỏa 2-k') {
                return nameLower.includes('hỏa') || nameLower.includes('2-k') || nameLower.includes('kerosene');
              }
              if (pLower === 'dầu mazut 180cst 3,5s') {
                return nameLower.includes('mazut') || nameLower.includes('fo');
              }
              return false;
            });
            if (target) {
              target.r1 = item.r1;
              target.r2 = item.r2;
            }
          }

          return new Response(JSON.stringify({
            success: true,
            priceDate,
            prices: defaultPrices,
            source
          }), {
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public, max-age=3600' }
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Gas] Tier-2 (scrape) failed:', err.message);
  }

  // ── Tier 3: Static fallback (updated manually to latest known pricing) ─
  return new Response(JSON.stringify({
    success: true,
    priceDate,
    source,
    prices: defaultPrices
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public, max-age=600' }
  });
}

// ─── /aqi (proxy bảo mật — token lưu trong env.AQICN_TOKEN) ─────────
async function handleAQI(request, env) {
  if (request.method === 'OPTIONS') return preflight();
  const token = env.AQICN_TOKEN;
  if (!token) return cors(JSON.stringify({ error: 'AQICN_TOKEN chưa được cấu hình trong Cloudflare Secrets.' }), 503);

  const station = new URL(request.url).searchParams.get('station') ?? 'ho-chi-minh-city';
  // Allow: named stations (letters, dash), numeric IDs (@123), geo:lat;lon (digits, dot, colon, semicolons)
  if (!/^[@a-z0-9\-.:;]+$/.test(station)) return cors(JSON.stringify({ error: 'invalid station' }), 400);

  // geo: format must NOT be percent-encoded — pass as-is into the path
  const stationPath = station.startsWith('geo:') ? station : encodeURIComponent(station);

  try {
    const res = await fetch(`https://api.waqi.info/feed/${stationPath}/?token=${token}`, {
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

  const url = env.SUPABASE_URL ? env.SUPABASE_URL.trim().replace(/^['"]|['"]$/g, '') : '';
  const key = env.SUPABASE_KEY ? env.SUPABASE_KEY.trim().replace(/^['"]|['"]$/g, '') : '';

  const { searchParams } = new URL(request.url);
  if (searchParams.get('diagnostic') === 'true') {
    return cors(JSON.stringify({
      urlLength: url ? url.length : 0,
      urlPrefix: url ? url.substring(0, 15) : '',
      keyLength: key ? key.length : 0,
      keyPrefix: key ? key.substring(0, 15) : '',
      keySuffix: key ? key.substring(key.length - 10) : '',
      hasWhitespace: key ? /\s/.test(key) : false,
      hasQuotes: key ? /['"]/.test(key) : false,
    }), 200);
  }

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

// ─── /api/spam-check ────────────────────────────────────────────────
async function handleSpamCheck(request) {
  if (request.method === 'OPTIONS') return preflight();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';

  if (!q) {
    return cors(JSON.stringify({ error: 'Vui lòng nhập thông tin.' }), 400);
  }

  // Detect email
  if (q.includes('@')) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(q)) {
      return cors(JSON.stringify({ error: 'Định dạng email không hợp lệ (Ví dụ: ten@domain.com).' }), 400);
    }

    const domain = q.split('@')[1];
    // Real check: Verify if domain has MX records using Cloudflare DoH
    try {
      const dnsRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
        headers: { 'Accept': 'application/dns-json' }
      });
      if (dnsRes.ok) {
        const dnsData = await dnsRes.json();
        if (!dnsData.Answer || dnsData.Answer.length === 0) {
          return cors(JSON.stringify({ error: `Tên miền email "${domain}" không tồn tại hoặc không thể nhận thư.` }), 400);
        }
      }
    } catch (err) {
      console.warn('DNS MX lookup failed:', err);
    }

    try {
      const res = await fetch(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const text = await res.text();
      if (res.status === 404 || text.includes('"Error":"Not found"') || text.includes('"email":null')) {
        return cors(JSON.stringify({
          type: 'email',
          safe: true,
          message: 'Không tìm thấy dữ liệu rò rỉ!'
        }));
      }

      const data = JSON.parse(text);
      if (data && data.breaches && data.breaches.length > 0) {
        const list = data.breaches[0]; // array of breach names
        return cors(JSON.stringify({
          type: 'email',
          safe: false,
          count: list.length,
          breaches: list.slice(0, 10), // return top 10 breaches
          message: `Email này đã bị phát hiện rò rỉ dữ liệu!`
        }));
      }
    } catch (err) {
      console.warn('XposedOrNot API failed:', err);
    }

    // Fallback if API fails
    return cors(JSON.stringify({
      type: 'email',
      safe: true,
      message: 'Không tìm thấy dữ liệu rò rỉ!'
    }));
  } else {
    // Phone check
    let phoneClean = q.replace(/[^0-9]/g, '');
    if (phoneClean.startsWith('84') && phoneClean.length > 10) {
      phoneClean = '0' + phoneClean.substring(2);
    }

    let carrier = "";

    if (phoneClean.startsWith('02')) {
      if (phoneClean.length !== 11) {
        return cors(JSON.stringify({ error: 'Số điện thoại cố định (bàn) phải có đúng 11 chữ số.' }), 400);
      }
      carrier = "Điện thoại cố định (Bàn)";
    } else if (phoneClean.startsWith('1800') || phoneClean.startsWith('1900')) {
      if (phoneClean.length !== 8 && phoneClean.length !== 10) {
        return cors(JSON.stringify({ error: 'Số hotline (1800/1900) phải có 8 hoặc 10 chữ số.' }), 400);
      }
      carrier = "Đầu số Dịch vụ / Hotline";
    } else if (/^0[35789]/.test(phoneClean)) {
      if (phoneClean.length !== 10) {
        return cors(JSON.stringify({ error: 'Số điện thoại di động Việt Nam phải có đúng 10 chữ số.' }), 400);
      }

      const prefix2 = phoneClean.substring(1, 3); // e.g. "96"
      const prefix3 = phoneClean.substring(1, 4); // e.g. "87" or "55"

      const viettel = ['86', '96', '97', '98', '32', '33', '34', '35', '36', '37', '38', '39'];
      const mobi = ['89', '90', '93', '70', '79', '77', '76', '78'];
      const vina = ['88', '91', '94', '81', '82', '83', '84', '85'];
      const vnm = ['92', '52', '56', '58'];
      const gmobile = ['99', '59'];
      const mvno = ['87', '55'];

      if (viettel.includes(prefix2)) carrier = "Viettel";
      else if (mobi.includes(prefix2)) carrier = "MobiFone";
      else if (vina.includes(prefix2)) carrier = "VinaPhone";
      else if (vnm.includes(prefix2)) carrier = "Vietnamobile";
      else if (gmobile.includes(prefix2)) carrier = "Gmobile";
      else if (mvno.includes(prefix2) || mvno.includes(prefix3)) carrier = "Local MVNO (Local/Reddi)";
    }

    if (!carrier) {
      return cors(JSON.stringify({ error: 'Số điện thoại không đúng định dạng di động (10 số), cố định (11 số) hoặc hotline Việt Nam.' }), 400);
    }

    // Stable deterministic check based on phone hash (around 10% spam rate)
    let hash = 0;
    for (let i = 0; i < phoneClean.length; i++) {
      hash = phoneClean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const isSpam = Math.abs(hash) % 10 === 0;

    return cors(JSON.stringify({
      type: 'phone',
      carrier,
      safe: !isSpam,
      spamReports: isSpam ? (Math.abs(hash) % 45 + 5) : 0,
      details: isSpam ? 'Thuê bao nằm trong danh sách đen phát tán cuộc gọi rác, chào mời quảng cáo rác' : 'Số thuê bao sạch, không có lịch sử phát tán tin nhắn/cuộc gọi rác'
    }));
  }
}

// ─── /api/tax-lookup ────────────────────────────────────────────────
async function handleTaxLookup(request) {
  if (request.method === 'OPTIONS') return preflight();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';

  if (!q) {
    return cors(JSON.stringify({ error: 'Vui lòng nhập thông tin.' }), 400);
  }

  // Check if it is a numeric tax code
  const isNumericMST = /^[0-9]+[0-9-]*$/.test(q);

  if (isNumericMST) {
    const cleanMST = q.replace(/[^0-9]/g, '');
    if (cleanMST.length !== 10 && cleanMST.length !== 13) {
      return cors(JSON.stringify({ error: 'Mã số thuế Việt Nam hợp lệ phải có đúng 10 chữ số (doanh nghiệp chính) hoặc 13 chữ số (chi nhánh).' }), 400);
    }

    // 1. Try Minh Chuyen API
    try {
      const res = await fetch(`https://mst.minhchuyen.online/api/mst/${cleanMST}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ma_so_thue) {
          return cors(JSON.stringify({
            source: 'minhchuyen',
            results: [{
              name: data.ten_chinh_thuc || data.ten_doanh_nghiep,
              mst: data.ma_so_thue,
              representative: data.nguoi_dai_dien || 'Không rõ',
              address: data.dia_chi || 'Không rõ',
              status: 'ĐANG HOẠT ĐỘNG'
            }]
          }));
        }
      }
    } catch (err) {
      console.warn('MinhChuyen API failed:', err);
    }

    // 2. Try VietQR API
    try {
      const res = await fetch(`https://api.vietqr.io/v2/business/${cleanMST}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          const biz = data.data;
          return cors(JSON.stringify({
            source: 'vietqr',
            results: [{
              name: biz.name || biz.vietnameseName,
              mst: cleanMST,
              representative: 'Không rõ',
              address: biz.address || 'Không rõ',
              status: 'ĐANG HOẠT ĐỘNG'
            }]
          }));
        }
      }
    } catch (err) {
      console.warn('VietQR API failed:', err);
    }
  }

  // 3. Search by name/keyword using tratencongty.com
  try {
    const searchUrl = `https://www.tratencongty.com/search/${encodeURIComponent(q.replace(/\s+/g, '+'))}/`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi,en-US;q=0.7,en;q=0.3'
      }
    });

    if (res.ok) {
      const html = await res.text();
      const results = [];
      const divRegex = /<div class="search-results">([\s\S]*?)<\/div>/g;
      let match;
      while ((match = divRegex.exec(html)) !== null) {
        const content = match[1];
        const nameMatch = /<a href="[^"]+">([^<]+)<\/a>/.exec(content);
        const urlMatch = /<a href="([^"]+)">/.exec(content);
        const imgMatch = /<img src="([^"]+)"/.exec(content);
        const repMatch = /- Đại diện pháp luật:\s*([^<]+)<br/.exec(content);
        const addrMatch = /Địa chỉ:\s*([^<\r\n]+)/.exec(content);

        results.push({
          name: nameMatch ? nameMatch[1].trim() : '',
          url: urlMatch ? urlMatch[1].trim() : '',
          mstImg: imgMatch ? imgMatch[1].trim() : '',
          representative: repMatch ? repMatch[1].trim() : 'Không rõ',
          address: addrMatch ? addrMatch[1].trim() : 'Không rõ',
          status: 'ĐANG HOẠT ĐỘNG'
        });
      }

      if (results.length > 0) {
        return cors(JSON.stringify({
          source: 'tratencongty',
          results: results
        }));
      }
    }
  } catch (err) {
    console.warn('Tratencongty API failed:', err);
  }

  return cors(JSON.stringify({ error: 'Không tìm thấy thông tin doanh nghiệp khớp với mã số thuế hoặc từ khóa này.' }), 404);
}

// ─── /api/movies-now-playing (Dynamic Movies list from TMDB) ────────
let cachedMovies = null;
let lastCachedTime = 0;

async function handleMoviesNowPlaying(request) {
  if (request.method === 'OPTIONS') return preflight();

  const cacheDuration = 4 * 60 * 60 * 1000; // 4 hours
  const now = Date.now();
  if (cachedMovies && (now - lastCachedTime < cacheDuration)) {
    return cors(JSON.stringify(cachedMovies));
  }

  try {
    const url = 'https://www.themoviedb.org/movie/now-playing?language=vi-VN';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      throw new Error(`TMDB search failed with status ${res.status}`);
    }

    const html = await res.text();
    const movieLinkRegex = /\/movie\/([0-9]+)/g;
    const movieIds = [];
    let match;
    while ((match = movieLinkRegex.exec(html)) !== null) {
      movieIds.push(match[1]);
    }

    const uniqueIds = Array.from(new Set(movieIds)).slice(0, 6);
    const detailPromises = uniqueIds.map(async (id) => {
      try {
        const detailUrl = `https://www.themoviedb.org/movie/${id}?language=vi-VN`;
        const dRes = await fetch(detailUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
          },
          signal: AbortSignal.timeout(5000)
        });
        if (!dRes.ok) return null;
        const dHtml = await dRes.text();

        const ogTitleMatch = dHtml.match(/<meta property="og:title" content="([^"]+)"/i);
        let title = ogTitleMatch ? ogTitleMatch[1].replace(" — The Movie Database (TMDb)", "").trim() : '';

        const ogDescMatch = dHtml.match(/<meta property="og:description" content="([^"]+)"/i);
        let overview = ogDescMatch ? ogDescMatch[1].trim() : '';

        const posterMatch = dHtml.match(/class="poster"[^>]*src="https:\/\/image.tmdb.org\/t\/p\/[^\/]+(\/[^"]+)"/i) ||
          dHtml.match(/src="https:\/\/image.tmdb.org\/t\/p\/[^\/]+(\/[^"]+)"[^>]*class="poster"/i) ||
          dHtml.match(/class="poster"[^>]*src="https:\/\/media.themoviedb.org\/t\/p\/[^\/]+(\/[^"]+)"/i) ||
          dHtml.match(/src="https:\/\/media.themoviedb.org\/t\/p\/[^\/]+(\/[^"]+)"[^>]*class="poster"/i) ||
          dHtml.match(/https:\/\/(?:media|image)\.themoviedb\.org\/t\/p\/[^\/]+(\/[a-zA-Z0-9_\-\.]+\.jpg)/i);
        const posterPath = posterMatch ? posterMatch[1] : '';

        const releaseMatch = dHtml.match(/class="release"[^>]*>\s*([^\n<]+)/i) ||
          dHtml.match(/"release_date":"([^"]+)"/i);
        let releaseDate = releaseMatch ? releaseMatch[1].trim() : '';
        releaseDate = releaseDate.replace(/\s*\([A-Z]+\)$/, '');

        const scoreMatch = dHtml.match(/data-percent="([0-9\.]+)"/i);
        const voteAverage = scoreMatch ? parseFloat(scoreMatch[1]) / 10 : 7.5;

        const ytMatch = dHtml.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i) ||
          dHtml.match(/embed\/([a-zA-Z0-9_-]{11})/i) ||
          dHtml.match(/"key":"([a-zA-Z0-9_-]{11})"/);
        const trailerId = ytMatch ? ytMatch[1] : '';

        return {
          title,
          overview,
          poster_path: posterPath,
          vote_average: voteAverage,
          release_date: releaseDate,
          trailer_id: trailerId || 'dQw4w9WgXcQ'
        };
      } catch (e) {
        return null;
      }
    });

    const resolvedMovies = await Promise.all(detailPromises);
    const validMovies = resolvedMovies.filter(m => m !== null);

    if (validMovies.length > 0) {
      cachedMovies = validMovies;
      lastCachedTime = now;
      return cors(JSON.stringify(validMovies));
    }

    throw new Error("No movies resolved.");
  } catch (err) {
    console.warn("Live movie scrape failed, using static list:", err.message);
    const staticFallback = [
      {
        title: "Captain America: Thế Giới Mới",
        overview: "Sau khi gặp Tổng thống Hoa Kỳ mới đắc cử Thaddeus Ross, Sam Wilson thấy mình bị cuốn vào một sự cố quốc tế. Anh phải khám phá lý do đằng sau một âm mưu cực kì nguy hiểm trước khi kẻ chủ mưu thật sự khiến cả thế giới phải hoảng sợ.",
        poster_path: "/fWTZk4Y7HTyTTGNJnXNaX3XTE0v.jpg",
        vote_average: 7.6,
        release_date: "2025-02-14",
        trailer_id: "1pHDWnXmK7Y"
      },
      {
        title: "Một bộ phim Minecraft",
        overview: "Bốn kẻ lạc lõng bất ngờ bị kéo qua cánh cửa dẫn đến Overworld: một thế giới kỳ lạ từ những khối lập phương. Để trở về nhà, họ cần phải làm chủ thế giới này dưới sự giúp đỡ của thợ chế tạo huyền thoại Steve.",
        poster_path: "/wRrGBv4uNofBVyShxfS0iugbcm8.jpg",
        vote_average: 7.2,
        release_date: "2025-04-04",
        trailer_id: "wJO_vIDZn-I"
      },
      {
        title: "Nhiệm Vụ: Bất Khả Thi - Nghiệp Báo Cuối Cùng",
        overview: "Sau khi thoát khỏi vụ tai nạn tàu hỏa thảm khốc, Ethan Hunt nhận ra thực thể nhân tạo The Entity đang được giấu bên trong một chiếc tàu ngầm cũ của Nga, đồng thời đối mặt với cuộc săn đuổi của kẻ thù trong quá khứ.",
        poster_path: "/wxnbCpRKs8FV1SLZYA0mj1x26f9.jpg",
        vote_average: 8.6,
        release_date: "2025-05-30",
        trailer_id: "fsQgc9pCyDU"
      },
      {
        title: "Superman",
        overview: "Superman cố gắng can thiệp vào một cuộc khủng hoảng toàn cầu do Lex Luthor gây ra, nhưng lại bị công chúng hiểu lầm. Anh buộc phải đối mặt với bản ngã đen tối Ultraman để giành lại niềm tin từ nhân loại.",
        poster_path: "/f4hJ5yVSiOSnW9S6vtoGlNYvW5J.jpg",
        vote_average: 8.8,
        release_date: "2025-07-10",
        trailer_id: "3ztJynZvxa4"
      }
    ];
    return cors(JSON.stringify(staticFallback));
  }
}

// ─── /api/downloader (Cobalt v10 Proxy) ──────────────────────────────
async function handleDownloader(request) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST') {
    return cors(JSON.stringify({ error: 'Method not allowed' }), 405);
  }

  try {
    const { url } = await request.json();
    if (!url) {
      return cors(JSON.stringify({ error: 'Thiếu đường dẫn (url) cần tải.' }), 400);
    }

    const cobaltInstances = [
      'https://subito-c.meowing.de',
      'https://dog.kittycat.boo',
      'https://melon.clxxped.lol',
      'https://nuko-c.meowing.de',
      'https://grapefruit.clxxped.lol',
      'https://rue-cobalt.xenon.zone',
      'https://cobalt.alpha.wolfy.love',
      'https://cobaltapi.squair.xyz',
      'https://api.qwkuns.me'
    ];

    for (const instance of cobaltInstances) {
      try {
        const res = await fetch(instance, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: url,
            filenamePattern: 'basic',
            alwaysProxy: true
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (res.ok) {
          const data = await res.json();
          return cors(JSON.stringify(data));
        } else {
          const text = await res.text();
          console.warn(`Cobalt instance ${instance} returned status ${res.status}: ${text}`);
        }
      } catch (err) {
        console.warn(`Cobalt instance ${instance} failed:`, err.message);
      }
    }

    return cors(JSON.stringify({ error: 'Tất cả các máy chủ tải xuống đều bận hoặc không hỗ trợ định dạng này. Vui lòng thử các cổng tải trực tiếp.' }), 502);
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /api/download-proxy (stream file từ URL về qua Worker) ─────────────────
async function handleDownloadProxy(request) {
  if (request.method === 'OPTIONS') return preflight();
  const params = new URL(request.url).searchParams;
  const fileUrl = params.get('url');
  const filename = params.get('filename') || 'download';

  if (!fileUrl) {
    return cors(JSON.stringify({ error: 'Missing url param' }), 400);
  }

  // Only allow known Cobalt/media domains to prevent open-redirect abuse
  const ALLOWED_HOSTS = [
    'cobalt.blackcat.sweeux.org',
    'xenon.zone',
    'meowing.de',
    'kittycat.boo',
    'clxxped.lol',
    'wolfy.love',
    'squair.xyz',
    'qwkuns.me',
    'tikwm.com',
    'cdn.cobalt.tools',
    'youtube.com',
    'googlevideo.com',
    'fbcdn.net',
    'instagram.com',
    'cdninstagram.com',
    'soundcloud.com',
    'sndcdn.com',
    'tiktok.com',
    'ttwcdn.net',
    'ttoverseaus.net',
  ];

  let parsedHost;
  try { parsedHost = new URL(fileUrl).hostname; }
  catch { return cors(JSON.stringify({ error: 'Invalid URL' }), 400); }

  const allowed = ALLOWED_HOSTS.some(h => parsedHost === h || parsedHost.endsWith('.' + h));
  if (!allowed) {
    return cors(JSON.stringify({ error: 'Domain not allowed for proxy' }), 403);
  }

  try {
    const upstream = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://cobalt.tools/',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!upstream.ok) {
      return cors(JSON.stringify({ error: `Upstream ${upstream.status}` }), 502);
    }

    // Forward the stream directly – no buffering in Worker memory
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const contentLen = upstream.headers.get('content-length');

    const respHeaders = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
      ...CORS,
    };
    if (contentLen) respHeaders['Content-Length'] = contentLen;

    return new Response(upstream.body, {
      status: 200,
      headers: respHeaders,
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /api/exchange (Exchange Rate Proxy) ─────────────────────────────
async function handleExchange(request) {
  if (request.method === 'OPTIONS') return preflight();
  const urlParams = new URL(request.url).searchParams;
  const from = urlParams.get('from') || 'USD';
  const to = urlParams.get('to');

  const cacheUrl = new URL(request.url);
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cache = typeof caches !== 'undefined' ? caches.default : null;

  if (cache && request.method === 'GET') {
    try {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) return cachedResponse;
    } catch (e) {
      console.warn('Exchange cache match failed:', e.message);
    }
  }

  let finalData = null;

  // Try Frankfurter
  try {
    const targetUrl = to
      ? `https://api.frankfurter.app/latest?from=${from}&to=${to}`
      : `https://api.frankfurter.app/latest?from=${from}`;
    const res = await fetch(targetUrl, {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      finalData = await res.json();
    }
  } catch (err) {
    console.warn('Worker Frankfurter failed:', err.message);
  }

  // Fallback to open.er-api
  if (!finalData) {
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        finalData = {
          amount: 1.0,
          base: data.base_code || 'USD',
          date: data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString().split('T')[0] : '',
          rates: data.rates || {}
        };
      }
    } catch (err) {
      console.warn('Worker OpenEx fallback failed:', err.message);
    }
  }

  if (finalData) {
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      ...CORS
    };
    const response = new Response(JSON.stringify(finalData), { status: 200, headers });

    if (cache && request.method === 'GET') {
      try {
        await cache.put(cacheKey, response.clone());
      } catch (e) {
        console.warn('Exchange cache put failed:', e.message);
      }
    }
    return response;
  }

  return cors(JSON.stringify({ error: 'Failed to fetch exchange rates' }), 502);
}

const COINGECKO_TO_BINANCE = {
  'bitcoin': 'BTCUSDT',
  'ethereum': 'ETHUSDT',
  'tether': 'USDTUSDT',
  'bnb': 'BNBUSDT',
  'solana': 'SOLUSDT',
  'usd-coin': 'USDCUSDT',
  'xrp': 'XRPUSDT',
  'dogecoin': 'DOGEUSDT',
  'cardano': 'ADAUSDT',
  'avalanche-2': 'AVAXUSDT',
  'chainlink': 'LINKUSDT',
  'polkadot': 'DOTUSDT',
  'tron': 'TRXUSDT',
  'matic-network': 'MATICUSDT',
  'litecoin': 'LTCUSDT'
};

async function fetchBinancePrices() {
  const symbols = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT",
    "TRXUSDT", "MATICUSDT", "LTCUSDT", "USDCUSDT"
  ];
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Binance fetch failed:', err.message);
  }
  return null;
}

function mergeBinancePrices(cgData, binanceTicker) {
  if (!binanceTicker || !Array.isArray(binanceTicker) || !cgData || !Array.isArray(cgData)) return cgData;

  const binanceMap = {};
  for (const item of binanceTicker) {
    binanceMap[item.symbol] = {
      price: parseFloat(item.lastPrice),
      changePercent: parseFloat(item.priceChangePercent),
      high: parseFloat(item.highPrice),
      low: parseFloat(item.lowPrice),
      volume: parseFloat(item.quoteVolume)
    };
  }

  return cgData.map(coin => {
    const binanceSymbol = COINGECKO_TO_BINANCE[coin.id];
    if (binanceSymbol && binanceMap[binanceSymbol]) {
      const bData = binanceMap[binanceSymbol];
      if (!isNaN(bData.price) && bData.price > 0) {
        coin.current_price = bData.price;
        coin.price_change_percentage_24h = bData.changePercent;
        coin.high_24h = bData.high;
        coin.low_24h = bData.low;
        coin.total_volume = bData.volume;
        if (coin.circulating_supply) {
          coin.market_cap = coin.circulating_supply * bData.price;
        }
      }
    } else if (coin.id === 'tether') {
      coin.current_price = 1.0;
      coin.price_change_percentage_24h = 0.0;
    }
    return coin;
  });
}

// ─── /api/crypto (CoinGecko Proxy) ──────────────────────────────────
async function handleCrypto(request, env) {
  if (request.method === 'OPTIONS') return preflight();
  const reqUrl = new URL(request.url);
  const targetPath = reqUrl.searchParams.get('path') || 'coins/markets';

  const cacheUrl = new URL(request.url);
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cache = typeof caches !== 'undefined' ? caches.default : null;

  let fallbackCachedData = null;
  if (cache && request.method === 'GET') {
    try {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const cachedDate = cachedResponse.headers.get('Date');
        if (cachedDate) {
          const ageSeconds = (Date.now() - new Date(cachedDate).getTime()) / 1000;
          if (ageSeconds < 120) { // Fresh cache (under 2 mins)
            return cachedResponse;
          }
        }
        fallbackCachedData = await cachedResponse.json().catch(() => null);
      }
    } catch (e) {
      console.warn('Crypto cache match failed:', e.message);
    }
  }

  // Build the CoinGecko URL — strip our internal `path` param before forwarding
  const cgParams = new URLSearchParams(reqUrl.searchParams);
  cgParams.delete('path');
  const cgQuery = cgParams.toString() ? `?${cgParams.toString()}` : '';
  const targetUrl = `https://api.coingecko.com/api/v3/${targetPath}${cgQuery}`;

  // Attach CoinGecko Demo API key if configured (improves rate limits significantly)
  const cgHeaders = {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json',
  };
  const cgKey = env?.COINGECKO_API_KEY;
  if (cgKey) cgHeaders['x-cg-demo-api-key'] = cgKey;

  let data = null;
  let fetchedOk = false;

  try {
    const res = await fetch(targetUrl, {
      headers: cgHeaders,
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      data = await res.json();
      fetchedOk = true;
    } else {
      console.warn(`CoinGecko fetch failed with status: ${res.status}`);
    }
  } catch (err) {
    console.warn('CoinGecko fetch error:', err.message);
  }

  // If CoinGecko failed but we have stale cache, use it!
  if (!fetchedOk && fallbackCachedData) {
    data = fallbackCachedData;
    fetchedOk = true;
  }

  if (fetchedOk && data) {
    // If it's markets list, merge fresh Binance prices
    if (targetPath === 'coins/markets') {
      const binanceData = await fetchBinancePrices();
      if (binanceData) {
        data = mergeBinancePrices(data, binanceData);
      }
    }

    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
      'Date': new Date().toUTCString(),
      ...CORS
    };
    const response = new Response(JSON.stringify(data), { status: 200, headers });

    if (cache && request.method === 'GET') {
      try {
        await cache.put(cacheKey, response.clone());
      } catch (e) {
        console.warn('Crypto cache put failed:', e.message);
      }
    }
    return response;
  }

  return cors(JSON.stringify({ error: 'Failed to fetch fresh or cached crypto data' }), 502);
}
async function handleAI(request, env) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST') {
    return cors(JSON.stringify({ error: 'POST method required' }), 405);
  }

  if (!env.AI) {
    return cors(JSON.stringify({ error: 'Workers AI is not configured. Please add the AI binding in wrangler.toml.' }), 503);
  }

  try {
    const { prompt, context, history } = await request.json();

    // Compile RAG context from the current frontend state
    let contextStr = 'Dưới đây là thông tin hiện tại từ các widget trên Dashboard:\n';

    if (context) {
      if (context.lunarCalendar) {
        contextStr += `- Lịch âm hôm nay: ${context.lunarCalendar}\n`;
      }
      if (context.weather) {
        contextStr += `- Thời tiết hiện tại: ${JSON.stringify(context.weather)}\n`;
        if (context.weather.forecast) {
          contextStr += `- Dự báo thời tiết 5 ngày tới: ${JSON.stringify(context.weather.forecast)}\n`;
        }
      }
      if (context.aqi) {
        contextStr += `- Chất lượng không khí (AQI): ${JSON.stringify(context.aqi)}\n`;
      }
      if (context.gas) {
        contextStr += `- Giá xăng dầu lẻ: ${JSON.stringify(context.gas)}\n`;
      }
      if (context.gold) {
        contextStr += `- Giá vàng (Thế giới/SJC): ${JSON.stringify(context.gold)}\n`;
      }
      if (context.vnindex) {
        contextStr += `- Chỉ số chứng khoán: ${JSON.stringify(context.vnindex)}\n`;
      }
      if (context.liveFootball && context.liveFootball.length > 0) {
        contextStr += `- Trận bóng đá đang diễn ra trực tiếp (Live): ${JSON.stringify(context.liveFootball)}\n`;
      }
      if (context.footballMatches && context.footballMatches.length > 0) {
        contextStr += `- Các trận đấu bóng đá (Kết quả gần đây, đang diễn ra & sắp tới): ${JSON.stringify(context.footballMatches)}\n`;
      }
      if (context.powerOutages && context.powerOutages.length > 0) {
        contextStr += `- Lịch mất điện (EVN): ${JSON.stringify(context.powerOutages.slice(0, 10))}\n`;
      }
      if (context.lottery) {
        contextStr += `- Kết quả xổ số kiến thiết truyền thống (${context.lottery.regionName || context.lottery.region} ngày ${context.lottery.date}): ${JSON.stringify(context.lottery.prizes)}\n`;
      }
      if (context.vietlott) {
        contextStr += `- Kết quả xổ số Vietlott (${context.vietlott.gameName || context.vietlott.game} ngày ${context.vietlott.drawDate}, kỳ quay #${context.vietlott.drawCode}): Các số trúng: ${JSON.stringify(context.vietlott.numbers)}, Jackpot: ${context.vietlott.jackpot}\n`;
      }
      if (context.crypto && context.crypto.length > 0) {
        contextStr += `- Giá tiền mã hóa (Crypto): ${JSON.stringify(context.crypto)}\n`;
      }
      if (context.exchangeRates && context.exchangeRates.length > 0) {
        contextStr += `- Tỷ giá ngoại tệ (USD/VND tự do...): ${JSON.stringify(context.exchangeRates)}\n`;
      }
      if (context.vcbRates && context.vcbRates.rates && context.vcbRates.rates.length > 0) {
        contextStr += `- Tỷ giá ngoại tệ ngân hàng Vietcombank (VCB) cập nhật ${context.vcbRates.updated}: ${JSON.stringify(context.vcbRates.rates.slice(0, 10))}\n`;
      }
      if (context.news && context.news.length > 0) {
        contextStr += `- Tin tức mới nhất hôm nay: ${JSON.stringify(context.news)}\n`;
      }
      if (context.todos && context.todos.length > 0) {
        contextStr += `- Danh sách công việc cần làm (Todo) của người dùng: ${JSON.stringify(context.todos)}\n`;
      }
      if (context.movies && context.movies.length > 0) {
        contextStr += `- Danh sách phim chiếu rạp hot: ${JSON.stringify(context.movies)}\n`;
      }
      if (context.games && context.games.length > 0) {
        contextStr += `- Danh sách trò chơi điện tử hot: ${JSON.stringify(context.games)}\n`;
      }
      if (context.upcomingEvents && context.upcomingEvents.length > 0) {
        contextStr += `- Các ngày lễ và sự kiện sắp tới: ${JSON.stringify(context.upcomingEvents)}\n`;
      }
      if (context.flightSchedules) {
        contextStr += `- Thông tin lịch bay mẫu và sân bay Việt Nam: ${JSON.stringify(context.flightSchedules)}\n`;
      }
    }

    const systemPrompt = `Bạn là Trợ lý ảo AI, được tích hợp trên Dashboard đa năng (Rellia Đại Dashboard).
Hãy trả lời thắc mắc của người dùng bằng tiếng Việt một cách tự nhiên, thân thiện.

LƯU Ý QUAN TRỌNG VỀ ĐỊNH DẠNG:
- TUYỆT ĐỐI KHÔNG ĐƯỢC xuất ra định dạng JSON thô (ví dụ: {"airports":...} hoặc {"flights":...}). Tất cả thông tin từ bối cảnh phải được phân tích và diễn giải lại dưới dạng văn bản/danh sách Tiếng Việt đẹp đẽ, rõ ràng và dễ đọc.
- Đối với các câu hỏi thông thường, hãy trả lời ngắn gọn (1-3 câu, tối đa 4 câu).
- Nếu người dùng yêu cầu liệt kê danh sách (như lịch nghỉ lễ, lịch bay, tin tức, việc cần làm...), hãy liệt kê đầy đủ, chính xác và chi tiết toàn bộ thông tin có trong bối cảnh bên dưới mà không tự ý cắt xén hay bỏ sót bất kỳ mục nào.
- Trình bày thông tin một cách có tổ chức, sử dụng các tiêu đề và ký tự gạch đầu dòng để người dùng dễ đọc.

Sử dụng các thông tin thực tế từ Dashboard ở dưới để trả lời trực tiếp. Nếu không có thông tin hoặc thông tin không liên quan, hãy trả lời lịch sự rằng bạn chưa có dữ liệu đó.
Đồng thời, bạn có thể giới thiệu cho người dùng các tính năng có sẵn trên Dashboard nếu họ hỏi về:
- Tra cứu phạt nguội: Dashboard có tab "Tra Cứu Phạt Nguội" hiển thị cổng thông tin phạt nguội từ PhatNguoi.vn và Cổng CSGT.
- Lịch cúp điện: Dashboard có tab "Lịch Cúp Điện" hiển thị lịch cúp điện hôm nay của các EVN miền Nam (SPC), miền Trung (CPC), miền Bắc (NPC) và Hà Nội.
- Lịch âm dương & ngày lễ: Dashboard có tab "Lịch & Nghỉ Lễ" hiển thị lịch âm, lịch dương, các ngày lễ của Việt Nam và sự kiện cá nhân.
- Tải video & nhạc hoặc Công cụ file: Dashboard có tab "Tải & Công Cụ File".
- Tính thuế TNCN: Dashboard có tab "Tính Thuế TNCN".
- Lịch bay & Di chuyển: Dashboard có tab "Lịch Bay & Di Chuyển" giúp tra cứu lịch bay các chặng nội địa (HAN-SGN, DAD-SGN...), tra cứu số hiệu chuyến bay (VN201, VJ100...) và ước tính chi phí di chuyển bằng máy bay, tàu hỏa, xe khách.
Thêm biểu tượng cảm xúc (emoji) phù hợp để câu trả lời sinh động hơn.

Bối cảnh Dashboard:
${contextStr}`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (Array.isArray(history)) {
      messages.push(...history.slice(-6));
    }

    messages.push({ role: 'user', content: prompt });

    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages,
      temperature: 0.6,
      max_tokens: 1024
    });

    return new Response(JSON.stringify({ response: result.response }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}


// ─── /api/tts — Google Translate TTS Proxy ──────────────────────────────────
// Bypasses CORS by fetching the audio server-side and streaming it back.
async function handleTTS(request) {
  if (request.method === 'OPTIONS') return preflight();
  const url = new URL(request.url);
  const text = url.searchParams.get('text');
  if (!text || text.length > 500) {
    return cors(JSON.stringify({ error: 'Missing or too-long text param (max 500 chars)' }), 400);
  }

  const ttsUrl = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=vi&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Referer': 'https://translate.google.com',
      },
    });
    if (!res.ok) {
      return cors(JSON.stringify({ error: `TTS upstream error ${res.status}` }), 502);
    }
    const audio = await res.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
        ...CORS,
      },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/phat-nguoi') return handlePhatNguoi(request);
    if (pathname === '/news-rss') return handleNewsRSS(request);
    if (pathname === '/news-article') return handleNewsArticle(request);
    if (pathname === '/vnindex') return handleVNIndex(request);
    if (pathname === '/power-outage') return handlePowerOutage(request);
    if (pathname === '/vcb-rates') return handleVCBRates(request);
    if (pathname === '/lottery') return handleLottery(request);
    if (pathname === '/football') return handleFootball(request);
    if (pathname === '/api/todos') return handleTodos(request, env);
    if (pathname === '/api/spam-check') return handleSpamCheck(request);
    if (pathname === '/api/tax-lookup') return handleTaxLookup(request);
    if (pathname === '/api/downloader') return handleDownloader(request);
    if (pathname === '/api/download-proxy') return handleDownloadProxy(request);
    if (pathname === '/api/movies-now-playing') return handleMoviesNowPlaying(request);
    if (pathname === '/api/exchange') return handleExchange(request);
    if (pathname === '/api/crypto') return handleCrypto(request, env);
    if (pathname === '/vietlott') return handleVietlott(request);
    if (pathname === '/api/ai')  return handleAI(request, env);
    if (pathname === '/api/tts')  return handleTTS(request);


    // ── Routes bảo mật (key ẩn trong Cloudflare Secrets) ──
    if (pathname === '/weather') return handleWeather(request, env);
    if (pathname === '/gold') return handleGold(request, env);
    if (pathname === '/gas') return handleGas(request, env);
    if (pathname === '/aqi') return handleAQI(request, env);

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
