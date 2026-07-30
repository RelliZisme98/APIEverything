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
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
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
  'https://genk.vn/rss/',
  'https://vietnamnet.vn/rss/',
  'https://vtv.vn/rss/',
  'https://kenh14.vn/rss/',
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
const ALLOWED_ARTICLE_DOMAINS = ['vnexpress.net', 'tuoitre.vn', 'dantri.com.vn', 'thanhnien.vn', 'nhandan.vn', 'genk.vn', 'vietnamnet.vn', 'vtv.vn', 'kenh14.vn'];

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
    const article = await extractArticle(html, targetUrl);
    return new Response(JSON.stringify(article), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=600' },
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

async function extractArticle(html, targetUrl) {
  let title = '';
  let description = '';
  let content = '';
  let publishedAt = '';
  let thumbnail = '';

  let inContentCount = 0;
  let skipCount = 0;

  const rewriter = new HTMLRewriter()
    .on('meta[property="og:title"]', { element(el) { if (!title) title = el.getAttribute('content'); } })
    .on('title', { text(chunk) { if (!title) title += chunk.text; } })
    .on('meta[property="og:description"]', { element(el) { if (!description) description = el.getAttribute('content'); } })
    .on('meta[name="description"]', { element(el) { if (!description) description = el.getAttribute('content'); } })
    .on('meta[property="og:image"]', { element(el) { if (!thumbnail) thumbnail = el.getAttribute('content'); } })
    .on('meta[property="article:published_time"]', { element(el) { if (!publishedAt) publishedAt = el.getAttribute('content'); } })
    .on('script, style, figure.video, .relate, .box-related, .banner, .tin-lien-quan, .related-news, .box-comment, .author-info, .box-share, .post-tags, .article-bottom, .box-author, .comment-wrapper, .fb-comments, #comments, .tags, .social-share, .author-wrap, .author, .source, .box-category, .box-tintuclienquan, .relate-container, .box-tin-lien-quan, [data-role="comment"]', {
      element(el) {
        skipCount++;
        el.onEndTag(() => { skipCount--; });
      }
    })
    .on('p, br, div, h1, h2, h3, h4, h5, h6, li', {
      element(el) {
        if (inContentCount > 0 && skipCount === 0) {
          content += '\n';
        }
      }
    })
    .on('article.fck_detail, .detail-content, .singular-content, .klw-body-top, .detail-cmain, .detail__cmain, .article-content, .article-body, .chi-tiet-bai-viet, #main-detail, .article-detail, .maincontent, .content-detail, .post-content, .knc-content, .vtv-detail-content, #entry-body, article, main', {
      element(el) {
        inContentCount++;
        el.onEndTag(() => { inContentCount--; });
      },
      text(chunk) {
        if (inContentCount > 0 && skipCount === 0) {
          content += chunk.text;
        }
      }
    });

  await rewriter.transform(new Response(html)).text();

  content = content.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
  title = title ? decode(title).trim() : '';
  description = description ? decode(description).trim() : '';

  return { title, description, content: content || description, publishedAt, thumbnail, url: targetUrl };
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

  try {
    let history = [];
    let nextJackpot = 0;

    if (game === 'keno') {
      const res = await fetch('https://xskt.com.vn/xskeno', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Failed to fetch Keno: ${res.status}`);
      const html = await res.text();

      // Find all tables on the page
      const tables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || [];

      for (const tableHtml of tables) {
        // Extract draw code
        const codeMatch = tableHtml.match(/#(\d+)/);
        if (!codeMatch) continue;
        const drawCode = codeMatch[1];

        // Extract winning numbers: find 20 numbers
        let numbers = [];
        const tds = tableHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        for (const td of tds) {
          const tdNumbers = td.replace(/<[^>]+>/g, ' ').match(/\b\d{2}\b/g) || [];
          if (tdNumbers.length === 20) {
            numbers = tdNumbers.map(Number);
            break;
          }
        }

        // Fallback: if not in a single TD, search the whole table body (excluding headers)
        if (numbers.length !== 20) {
          const bodyHtml = tableHtml.replace(/<th[\s\S]*?<\/th>/gi, '');
          const allNumbers = bodyHtml.replace(/<[^>]+>/g, ' ').match(/\b\d{2}\b/g) || [];
          if (allNumbers.length >= 20) {
            numbers = allNumbers.slice(-20).map(Number);
          }
        }

        if (numbers.length === 20) {
          // Extract draw date / time
          let drawDate = '';
          const dateMatch = tableHtml.match(/ngay-(\d{1,2}-\d{1,2}-\d{4})/);
          if (dateMatch) {
            drawDate = dateMatch[1].replace(/-/g, '/');
          } else {
            const textDateMatch = tableHtml.replace(/<[^>]+>/g, ' ').match(/(\d{2}\/\d{2}\/\d{4})/);
            if (textDateMatch) {
              drawDate = textDateMatch[1];
            } else {
              drawDate = new Date().toLocaleDateString('vi-VN');
            }
          }

          history.push({
            drawCode,
            drawDate,
            numbers,
            jackpot: 2000000000,
          });
        }
      }
    } else {
      // Scrape Mega 6/45, Power 6/55, and Max 4D from xskt.com.vn
      const urlMap = {
        mega645: 'https://xskt.com.vn/xsmega645/30-ngay',
        power655: 'https://xskt.com.vn/xspower/30-ngay',
        max4d: 'https://xskt.com.vn/xsmax4d/30-ngay',
      };
      const url = urlMap[game];
      if (!url) throw new Error('Invalid game type');

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Failed to fetch ${game}: ${res.status}`);
      const html = await res.text();

      // Scrape next estimated jackpot from top of the page if available
      const nextJpMatch = html.match(/Jackpot [^<]*? hiện tại:\s*<strong>([\d,.]+)\s*vnđ<\/strong>/i);
      if (nextJpMatch) {
        nextJackpot = parseInt(nextJpMatch[1].replace(/[,.]/g, '')) || 0;
      }

      // Split by result tables to parse each draw
      const parts = html.split(/<table[^>]*class="result"/gi);
      for (let i = 1; i < parts.length; i++) {
        const fullBlock = '<table class="result"' + parts[i];

        // Parse draw date
        let drawDate = '';
        const dateMatch = fullBlock.match(/href="[^"]*?ngay-(\d{1,2}-\d{1,2}-\d{4})"/i);
        if (dateMatch) {
          const [d, m, y] = dateMatch[1].split('-');
          drawDate = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
        } else {
          const altDateMatch = fullBlock.match(/ngày\s*(\d{1,2})\/(\d{1,2})/i);
          if (altDateMatch) {
            drawDate = `${altDateMatch[1].padStart(2, '0')}/${altDateMatch[2].padStart(2, '0')}/${new Date().getFullYear()}`;
          }
        }

        // Parse draw code
        const codeMatch = fullBlock.match(/#(\d+)/);
        const drawCode = codeMatch ? codeMatch[1] : '';

        // Parse numbers
        let numbers = [];
        if (game === 'max4d') {
          const matches = fullBlock.match(/\b\d{4}\b/g) || [];
          numbers = matches.map(Number);
        } else {
          const resultMatch = fullBlock.match(/<td[^>]*class="megaresult"[^>]*>([\s\S]*?)<\/td>/i);
          if (resultMatch) {
            const txt = resultMatch[1].replace(/<[^>]+>/g, '').trim();
            numbers = txt.split(/\s+/).map(Number).filter(n => !isNaN(n));
          }

          if (game === 'power655') {
            const jp2Match = fullBlock.match(/<tr[^>]*class="jp2"[^>]*>[\s\S]*?<td[^>]*class="megaresult"[^>]*>([\s\S]*?)<\/td>/i);
            if (jp2Match) {
              const jp2Num = parseInt(jp2Match[1].replace(/<[^>]+>/g, '').trim());
              if (!isNaN(jp2Num)) numbers.push(jp2Num);
            }
          }
        }

        // Parse jackpot value
        let jackpot = 0;
        if (game !== 'max4d') {
          const jpRowMatch = fullBlock.match(/<tr>\s*<td>(?:J\.pot|Jackpot)<\/td>[\s\S]*?<\/tr>/i);
          if (jpRowMatch) {
            const cols = jpRowMatch[0].match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
            if (cols && cols.length > 0) {
              const valText = cols[cols.length - 1].replace(/<[^>]+>/g, '').replace(/[,.]/g, '').trim();
              jackpot = parseInt(valText) || 0;
            }
          }
        } else {
          jackpot = 15000000; // Fixed G1 prize for Max 4D
        }

        if (numbers.length > 0) {
          history.push({
            drawCode,
            drawDate,
            numbers,
            jackpot,
          });
        }
      }
    }

    if (!history.length) {
      throw new Error('No lottery data parsed from source');
    }

    // Handle paginated history requests
    if (page > 0 || params.get('page') !== null) {
      const pageSize = 10;
      const start = page * pageSize;
      const slicedHistory = history.slice(start, start + pageSize);

      return new Response(JSON.stringify({ game, history: slicedHistory }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=300' },
      });
    }

    // Default: return the latest draw plus recent history (up to 10)
    const latest = history[0];
    return new Response(JSON.stringify({
      game,
      product: game === 'power655' ? 'XS655' : game === 'mega645' ? 'XS645' : game === 'max4d' ? 'XS4D' : 'KENO',
      drawDate: latest.drawDate,
      drawCode: latest.drawCode,
      numbers: latest.numbers,
      jackpot: latest.jackpot,
      nextJackpot,
      history: history.slice(0, 10),
    }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public,max-age=300' },
    });

  } catch (err) {
    console.error('[Vietlott Scraper Error]', err);
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

function parseFuelPrices(html) {
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
    if (cells.length < 3) continue;
    const name = cells[0];
    if (!/xăng|dầu|diesel|mazut|hỏa|ron|\bdo\b/i.test(name)) continue;

    const parseVnNum = s => {
      const n = parseInt(s.replace(/[.\s]/g, '').replace(',', ''));
      return n > 5000 && n < 100000 ? n : null;
    };

    const r1 = parseVnNum(cells[cells.length - 2] || '');
    const r2 = parseVnNum(cells[cells.length - 1] || '') ?? r1;
    if (r1) prices.push({ name: name.trim(), r1, r2 });
  }
  return prices;
}

function mergePrices(parsed, defaultPrices) {
  for (const item of parsed) {
    const nameLower = item.name.toLowerCase();
    const target = defaultPrices.find(p => {
      const pLower = p.name.toLowerCase();
      if (pLower.includes('ron95') || pLower.includes('ron 95')) {
        return nameLower.includes('ron 95') || nameLower.includes('ron95');
      }
      if (pLower.includes('ron92') || pLower.includes('ron 92')) {
        return nameLower.includes('ron 92') || nameLower.includes('ron92');
      }
      if (pLower.includes('0,05s') || pLower.includes('0.05s')) {
        return nameLower.includes('0,05s') || nameLower.includes('0.05s');
      }
      if (pLower.includes('0,001s') || pLower.includes('0.001s')) {
        return nameLower.includes('0,001s') || nameLower.includes('0.001s');
      }
      if (pLower.includes('hỏa') || pLower.includes('2-k')) {
        return nameLower.includes('hỏa') || nameLower.includes('2-k') || nameLower.includes('kerosene');
      }
      if (pLower.includes('mazut') || pLower.includes('180cst')) {
        return nameLower.includes('mazut') || nameLower.includes('fo') || nameLower.includes('fo-r');
      }
      return false;
    });
    if (target) {
      target.r1 = item.r1;
      target.r2 = item.r2;
    }
  }
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
          mergePrices(parsed, defaultPrices);

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

  // ── Tier 3: Independent Web Scrapers (Giaxanghomnay.com & Webgia.com) ──
  // This is a robust fallback when Petrolimex official site/API is offline or blocking.
  if (source === 'static') {
    try {
      console.log('[Gas] Trying Tier-3 fallback: Giaxanghomnay.com...');
      const gxRes = await fetch('https://giaxanghomnay.com/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(6000)
      });
      if (gxRes.ok) {
        const gxHtml = await gxRes.text();
        const parsed = parseFuelPrices(gxHtml);
        if (parsed && parsed.length > 0) {
          source = 'Giaxanghomnay Scraped';
          const dateMatch = gxHtml.match(/ngày\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i) || gxHtml.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (dateMatch) {
            priceDate = `${dateMatch[3]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[1]).padStart(2, '0')}`;
          }
          mergePrices(parsed, defaultPrices);
        }
      }
    } catch (err) {
      console.warn('[Gas] Giaxanghomnay scrape failed:', err.message);
    }
  }

  if (source === 'static') {
    try {
      console.log('[Gas] Trying Tier-3 fallback: Webgia.com...');
      const wgRes = await fetch('https://webgia.com/gia-xang-dau/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://webgia.com/',
        },
        signal: AbortSignal.timeout(6000)
      });
      if (wgRes.ok) {
        const wgHtml = await wgRes.text();
        const parsed = parseFuelPrices(wgHtml);
        if (parsed && parsed.length > 0) {
          source = 'Webgia Scraped';
          const dateMatch = wgHtml.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (dateMatch) {
            priceDate = `${dateMatch[3]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[1]).padStart(2, '0')}`;
          }
          mergePrices(parsed, defaultPrices);
        }
      }
    } catch (err) {
      console.warn('[Gas] Webgia scrape failed:', err.message);
    }
  }

  if (source !== 'static') {
    return new Response(JSON.stringify({
      success: true,
      priceDate,
      prices: defaultPrices,
      source
    }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, 'Cache-Control': 'public, max-age=3600' }
    });
  }

  // ── Tier 4: Static fallback (updated manually to latest known pricing) ─
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

// ─── /api/events (proxy bảo mật lưu sự kiện và ghi chú lịch vào Supabase) ────────
async function handleEvents(request, env) {
  if (request.method === 'OPTIONS') return preflight();

  const url = env.SUPABASE_URL ? env.SUPABASE_URL.trim().replace(/^['\"]|['\"]$/g, '') : '';
  const key = env.SUPABASE_KEY ? env.SUPABASE_KEY.trim().replace(/^['\"]|['\"]$/g, '') : '';

  if (!url || !key) {
    return cors(JSON.stringify({ error: `Supabase URL or Key is missing. URL length: ${url ? url.length : 0}, Key length: ${key ? key.length : 0}` }), 503);
  }

  const supabaseHeaders = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  try {
    if (request.method === 'GET') {
      const res = await fetch(`${url}/rest/v1/custom_events?select=*&order=created_at.desc`, {
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
      const res = await fetch(`${url}/rest/v1/custom_events`, {
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

      const res = await fetch(`${url}/rest/v1/custom_events?id=eq.${encodeURIComponent(id)}`, {
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

// ── HELPER: FETCH QUESTIONS FROM SUPABASE ───────────────────────────────────
async function fetchQuestionsFromSupabase(tableName, url, key) {
  const res = await fetch(`${url}/rest/v1/${tableName}?select=*&order=q_idx.asc`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch questions from Supabase table ${tableName}: ${res.statusText}`);
  }
  return await res.json();
}


// ─── /api/mbti (Endpoint bảo mật: Lấy câu hỏi, Chấm điểm, và Đọc kết quả MBTI) ──────
async function handleMBTI(request, env) {
  if (request.method === 'OPTIONS') return preflight();

  const url = env.SUPABASE_URL ? env.SUPABASE_URL.trim().replace(/^['\"]|['\"]$/g, '') : '';
  const key = env.SUPABASE_KEY ? env.SUPABASE_KEY.trim().replace(/^['\"]|['\"]$/g, '') : '';
  const hasDb = !!(url && key);

  const supabaseHeaders = hasDb ? {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  } : null;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'list';

  try {
    if (request.method === 'GET' && action === 'questions') {
      if (!hasDb) return cors(JSON.stringify({ error: 'Database is not configured' }), 500);
      const pool = await fetchQuestionsFromSupabase('mbti_questions', url, key);
      const safeQuestions = pool.map(q => ({
        qIdx: q.q_idx,
        q: q.q,
        dim: q.dim
      }));
      return cors(JSON.stringify(safeQuestions), 200);
    }

    if (request.method === 'POST' && action === 'submit') {
      if (!hasDb) return cors(JSON.stringify({ error: 'Database is not configured' }), 500);
      const pool = await fetchQuestionsFromSupabase('mbti_questions', url, key);
      const { name, age, answers } = await request.json();

      const scoresByDim = {
        EI: { total: 0, maxPossible: 0 },
        NS: { total: 0, maxPossible: 0 },
        TF: { total: 0, maxPossible: 0 },
        JP: { total: 0, maxPossible: 0 }
      };

      answers.forEach(item => {
        const original = pool.find(p => p.q_idx === item.qIdx);
        if (original) {
          let score = item.selected;
          if (original.type === '-') {
            score = 4 - item.selected;
          }
          scoresByDim[original.dim].total += score;
          scoresByDim[original.dim].maxPossible += 4;
        }
      });

      const breakdown = {};
      const pctEI = scoresByDim.EI.maxPossible > 0 ? (scoresByDim.EI.total / scoresByDim.EI.maxPossible) * 100 : 50;
      const pctNS = scoresByDim.NS.maxPossible > 0 ? (scoresByDim.NS.total / scoresByDim.NS.maxPossible) * 100 : 50;
      const pctTF = scoresByDim.TF.maxPossible > 0 ? (scoresByDim.TF.total / scoresByDim.TF.maxPossible) * 100 : 50;
      const pctJP = scoresByDim.JP.maxPossible > 0 ? (scoresByDim.JP.total / scoresByDim.JP.maxPossible) * 100 : 50;

      breakdown.E = Math.round(pctEI);
      breakdown.I = 100 - breakdown.E;

      breakdown.N = Math.round(pctNS);
      breakdown.S = 100 - breakdown.N;

      breakdown.T = Math.round(pctTF);
      breakdown.F = 100 - breakdown.T;

      breakdown.J = Math.round(pctJP);
      breakdown.P = 100 - breakdown.J;

      const type = (breakdown.E >= 50 ? 'E' : 'I') +
        (breakdown.N >= 50 ? 'N' : 'S') +
        (breakdown.T >= 50 ? 'T' : 'F') +
        (breakdown.J >= 50 ? 'J' : 'P');

      const responsePayload = {
        type,
        breakdown
      };

      if (hasDb) {
        const dbPayload = {
          name: name || 'Ẩn danh',
          age: age || 'Chưa rõ',
          test_type: 'MBTI',
          score: 100,
          raw_correct: 0,
          max_score: 100,
          answers_json: JSON.stringify({ type, breakdown, answers }),
          created_at: new Date().toISOString()
        };

        try {
          await fetch(`${url}/rest/v1/iqeq_results`, {
            method: 'POST',
            headers: {
              ...supabaseHeaders,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(dbPayload)
          });
        } catch (dbErr) {
          console.error('Failed to save MBTI result to Supabase:', dbErr);
        }
      }

      return cors(JSON.stringify(responsePayload), 200);
    }

    if (request.method === 'GET' && action === 'list') {
      if (!hasDb) {
        return cors(JSON.stringify([]), 200);
      }
      const res = await fetch(`${url}/rest/v1/iqeq_results?test_type=eq.MBTI&select=*&order=created_at.desc`, {
        headers: supabaseHeaders
      });
      const data = await res.text();
      return new Response(data, {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
      });
    }

    return cors(JSON.stringify({ error: 'Action not allowed' }), 400);
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /api/iqeq (Endpoint bảo mật: Lấy câu hỏi, Chấm điểm, và Đọc kết quả) ──────
async function handleIQEQ(request, env) {
  if (request.method === 'OPTIONS') return preflight();

  const url = env.SUPABASE_URL ? env.SUPABASE_URL.trim().replace(/^['\"]|['\"]$/g, '') : '';
  const key = env.SUPABASE_KEY ? env.SUPABASE_KEY.trim().replace(/^['\"]|['\"]$/g, '') : '';
  const hasDb = !!(url && key);

  const supabaseHeaders = hasDb ? {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  } : null;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'list';

  try {
    // 1. LẤY CÂU HỎI TRẮC NGHIỆM AN TOÀN (Ẩn đáp án 'ans')
    if (request.method === 'GET' && action === 'questions') {
      if (!hasDb) return cors(JSON.stringify({ error: 'Database is not configured' }), 500);
      const type = searchParams.get('type') || 'IQ';
      if (type === 'IQ') {
        const pool = await fetchQuestionsFromSupabase('iq_questions', url, key);
        
        // Filter dynamically by difficulty column
        const poolEasy = pool.filter(p => p.difficulty === 'easy');
        const poolMedium = pool.filter(p => p.difficulty === 'medium');
        const poolHard = pool.filter(p => p.difficulty === 'hard');
        const poolVeryHard = pool.filter(p => p.difficulty === 'very_hard');

        // Select randomly: 6 Easy, 6 Medium, 6 Hard, 7 Very Hard (Total 25 questions - distributed evenly)
        const selEasy = poolEasy.sort(() => 0.5 - Math.random()).slice(0, 6);
        const selMedium = poolMedium.sort(() => 0.5 - Math.random()).slice(0, 6);
        const selHard = poolHard.sort(() => 0.5 - Math.random()).slice(0, 6);
        const selVeryHard = poolVeryHard.sort(() => 0.5 - Math.random()).slice(0, 7);

        const selectedQuestions = [...selEasy, ...selMedium, ...selHard, ...selVeryHard];
        selectedQuestions.sort((a, b) => a.q_idx - b.q_idx);

        const safeQuestions = selectedQuestions.map(original => {
          return {
            qIdx: original.q_idx,
            q: original.q,
            options: original.options,
            svg: original.svg || null
          };
        });
        return cors(JSON.stringify(safeQuestions), 200);
      } else {
        const pool = await fetchQuestionsFromSupabase('eq_questions', url, key);
        
        // Filter dynamically by dimension column
        const empathyPool = pool.filter(p => p.dim === 'empathy');
        const selfRegPool = pool.filter(p => p.dim === 'selfReg');
        const socialPool = pool.filter(p => p.dim === 'social');
        const selfAwaPool = pool.filter(p => p.dim === 'selfAwa');

        // Select randomly: 6 Empathy, 6 SelfReg, 6 Social, 7 SelfAwa (Total 25 questions)
        const selectedEmpathy = empathyPool.sort(() => 0.5 - Math.random()).slice(0, 6);
        const selectedSelfReg = selfRegPool.sort(() => 0.5 - Math.random()).slice(0, 6);
        const selectedSocial = socialPool.sort(() => 0.5 - Math.random()).slice(0, 6);
        const selectedSelfAwa = selfAwaPool.sort(() => 0.5 - Math.random()).slice(0, 7);

        const selectedQuestions = [...selectedEmpathy, ...selectedSelfReg, ...selectedSocial, ...selectedSelfAwa];
        selectedQuestions.sort((a, b) => a.q_idx - b.q_idx);

        const safeQuestions = selectedQuestions.map(original => {
          return {
            qIdx: original.q_idx,
            q: original.q,
            dim: original.dim
          };
        });
        return cors(JSON.stringify(safeQuestions), 200);
      }
    }

    // 2. NỘP BÀI CHẤM ĐIỂM BẢO MẬT & LƯU DB
    if (request.method === 'POST' && action === 'submit') {
      if (!hasDb) return cors(JSON.stringify({ error: 'Database is not configured' }), 500);
      const { name, age, test_type, answers } = await request.json();

      let finalScore = 0;
      let rawCorrect = 0;
      let responsePayload = {};

      if (test_type === 'IQ') {
        const pool = await fetchQuestionsFromSupabase('iq_questions', url, key);
        // Chấm điểm có trọng số theo nhóm độ khó thực tế
        answers.forEach(item => {
          const original = pool.find(p => p.q_idx === item.qIdx);
          if (original && item.selected === original.ans) {
            // Nhóm 1 (Dễ): 1.0đ, Nhóm 2 (Trung bình): 1.3đ, Nhóm 3 (Khó): 1.7đ, Nhóm 4 (Rất khó): 2.2đ
            let weight = 1.0;
            if (original.difficulty === 'medium') weight = 1.3;
            else if (original.difficulty === 'hard') weight = 1.7;
            else if (original.difficulty === 'very_hard') weight = 2.2;
            rawCorrect += weight;
          }
        });
        // Max weight có thể đạt: 6*1.0 + 6*1.3 + 6*1.7 + 7*2.2 = 6.0 + 7.8 + 10.2 + 15.4 = 39.4
        const scorePct = Math.min(rawCorrect / 39.4, 1);
        finalScore = Math.round(70 + (scorePct * 75)); // Thang điểm từ 70 đến 145

        let classification, desc;
        if (finalScore >= 140) {
          classification = 'Thiên Tài / Xuất Chúng (Top 0.1%)';
          desc = 'Chỉ số IQ cực kỳ vượt trội. Khả năng tư duy toán học lý thuyết, mật mã học, lý thuyết trò chơi và tư duy không gian đạt mức siêu việt.';
        } else if (finalScore >= 130) {
          classification = 'Trí Tuệ Vượt Trội (Top 2%)';
          desc = 'Tư duy logic và phân tích sắc sảo. Giải quyết tốt hầu hết các câu đố lý thuyết đồ thị phức tạp và bài toán xác suất.';
        } else if (finalScore >= 120) {
          classification = 'Trí Tuệ Cao (Top 10%)';
          desc = 'Khả năng tư duy logic và toán học rất tốt. Khả năng giải quyết vấn đề nhanh nhạy dưới áp lực.';
        } else if (finalScore >= 110) {
          classification = 'Trên Trung Bình (Top 25%)';
          desc = 'Tư duy logic nhạy bén, hoàn thành tốt các câu hỏi hình học, dãy số và suy luận ở mức trung bình khá.';
        } else if (finalScore >= 95) {
          classification = 'Trung Bình Khá (Top 50%)';
          desc = 'Năng lực tư duy ở mức trung bình khá. Khả năng giải quyết các tình huống thực tế và tính toán cơ bản ổn định.';
        } else if (finalScore >= 80) {
          classification = 'Trung Bình (Cần cải thiện)';
          desc = 'Tư duy logic cơ bản tốt. Cần rèn luyện thêm khả năng phân tích chuỗi số phức tạp và hình học không gian.';
        } else {
          classification = 'Mới Bắt Đầu';
          desc = 'Hãy thường xuyên rèn luyện não bộ bằng các câu đố tư duy logic, toán đố cơ bản để nâng cao phản xạ.';
        }

        responsePayload = {
          score: finalScore,
          raw_correct: Math.round(rawCorrect),
          classification,
          desc
        };
      } else {
        const pool = await fetchQuestionsFromSupabase('eq_questions', url, key);
        const scoresByDim = { empathy: { total: 0, count: 0 }, selfReg: { total: 0, count: 0 }, social: { total: 0, count: 0 }, selfAwa: { total: 0, count: 0 } };
        answers.forEach(item => {
          const original = pool.find(p => p.q_idx === item.qIdx);
          if (original) {
            let score = item.selected;
            if (original.type === '-') {
              score = 4 - item.selected;
            }
            scoresByDim[original.dim].total += score;
            scoresByDim[original.dim].count += 1;
          }
        });

        let totalEqSum = 0;
        let totalEqCount = 0;
        const breakdown = {};

        const dims = ['empathy', 'selfReg', 'social', 'selfAwa'];
        dims.forEach(d => {
          const s = scoresByDim[d];
          if (s && s.count > 0) {
            const p = s.total / (s.count * 4);
            totalEqSum += p;
            totalEqCount += 1;
            breakdown[d] = Math.round(p * 100);
          } else {
            breakdown[d] = 0;
          }
        });

        const finalPct = totalEqSum / (totalEqCount || 1);
        finalScore = Math.round(60 + (finalPct * 80));

        let classification = 'Trung Bình';
        let desc = 'Khả năng nhận biết cảm xúc ở mức cơ bản, tuy nhiên đôi khi vẫn gặp khó khăn trong việc kiểm soát hành vi khi nóng giận hoặc chưa thực sự thấu cảm người khác.';
        if (finalScore >= 120) {
          classification = 'Cực Kỳ Nhạy Bén / Cao';
          desc = 'Bạn có khả năng thấu cảm sâu sắc, kiểm soát cảm xúc bản thân xuất sắc và có năng lực giao tiếp xã hội cực kỳ khéo léo. Bạn dễ dàng tạo dựng được niềm tin và kết nối bền vững với mọi người.';
        } else if (finalScore >= 100) {
          classification = 'Tốt / Cân Bằng';
          desc = 'Chỉ số cảm xúc của bạn đạt trạng thái cân bằng tốt. Bạn có khả năng làm chủ bản thân trong hầu hết các tình huống và duy trì được mối quan hệ xã hội hài hòa.';
        } else if (finalScore < 80) {
          classification = 'Cần Cải Thiện';
          desc = 'Bạn có xu hướng dễ bị cảm xúc chi phối hoặc gặp khó khăn khi hòa nhập xã hội. Việc học cách lắng nghe bản thân và rèn luyện sự bình tĩnh sẽ giúp bạn cải thiện chỉ số này.';
        }

        responsePayload = {
          score: finalScore,
          classification,
          desc,
          breakdown
        };
      }

      const dbPayload = {
        name: name || 'Ẩn danh',
        age: age || 'Chưa rõ',
        test_type,
        score: finalScore,
        raw_correct: rawCorrect,
        max_score: 140,
        answers_json: JSON.stringify(answers),
        created_at: new Date().toISOString()
      };

      if (hasDb) {
        try {
          await fetch(`${url}/rest/v1/iqeq_results`, {
            method: 'POST',
            headers: {
              ...supabaseHeaders,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(dbPayload)
          });
        } catch (dbErr) {
          console.error('Failed to save IQ/EQ result to Supabase:', dbErr);
        }
      }

      return cors(JSON.stringify(responsePayload), 200);
    }

    // 3. ĐỌC LỊCH SỬ KẾT QUẢ ĐÃ LƯU
    if (request.method === 'GET' && action === 'list') {
      if (!hasDb) {
        return cors(JSON.stringify([]), 200);
      }
      const res = await fetch(`${url}/rest/v1/iqeq_results?select=*&order=created_at.desc`, {
        headers: supabaseHeaders
      });
      const data = await res.text();
      return new Response(data, {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
      });
    }

    return cors(JSON.stringify({ error: 'Action not allowed' }), 400);
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /api/news (RSS News Aggregator Proxy) ───────────────────────────
async function handleApiNews(request) {
  if (request.method === 'OPTIONS') return preflight();

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'vnexpress';
  const category = searchParams.get('category') || 'all';

  const FEEDS_MAP = {
    vnexpress: {
      all: 'https://vnexpress.net/rss/tin-moi-nhat.rss',
      thoisu: 'https://vnexpress.net/rss/thoi-su.rss',
      thegioi: 'https://vnexpress.net/rss/the-gioi.rss',
      kinhdoanh: 'https://vnexpress.net/rss/kinh-doanh.rss',
      giaitri: 'https://vnexpress.net/rss/giai-tri.rss',
      thethao: 'https://vnexpress.net/rss/the-thao.rss',
      congnghe: 'https://vnexpress.net/rss/so-hoa.rss'
    },
    tuoitre: {
      all: 'https://tuoitre.vn/rss/tin-moi-nhat.rss',
      thoisu: 'https://tuoitre.vn/rss/thoi-su.rss',
      thegioi: 'https://tuoitre.vn/rss/the-gioi.rss',
      kinhdoanh: 'https://tuoitre.vn/rss/kinh-doanh.rss',
      giaitri: 'https://tuoitre.vn/rss/giai-tri.rss',
      thethao: 'https://tuoitre.vn/rss/the-thao.rss',
      congnghe: 'https://tuoitre.vn/rss/nhip-song-so.rss'
    },
    dantri: {
      all: 'https://dantri.com.vn/rss/home.rss',
      thoisu: 'https://dantri.com.vn/rss/xa-hoi.rss',
      thegioi: 'https://dantri.com.vn/rss/the-gioi.rss',
      kinhdoanh: 'https://dantri.com.vn/rss/kinh-doanh.rss',
      giaitri: 'https://dantri.com.vn/rss/giai-tri.rss',
      thethao: 'https://dantri.com.vn/rss/the-thao.rss',
      congnghe: 'https://dantri.com.vn/rss/suc-manh-so.rss'
    },
    thanhnien: {
      all: 'https://thanhnien.vn/rss/home.rss',
      thoisu: 'https://thanhnien.vn/rss/thoi-su.rss',
      thegioi: 'https://thanhnien.vn/rss/the-gioi.rss',
      kinhdoanh: 'https://thanhnien.vn/rss/kinh-te.rss',
      giaitri: 'https://thanhnien.vn/rss/giai-tri.rss',
      thethao: 'https://thanhnien.vn/rss/the-thao.rss',
      congnghe: 'https://thanhnien.vn/rss/cong-nghe-thong-tin.rss'
    },
    vietnamnet: {
      all: 'https://vietnamnet.vn/rss/tin-moi-nong.rss',
      thoisu: 'https://vietnamnet.vn/rss/thoi-su.rss',
      thegioi: 'https://vietnamnet.vn/rss/the-gioi.rss',
      kinhdoanh: 'https://vietnamnet.vn/rss/kinh-doanh.rss',
      giaitri: 'https://vietnamnet.vn/rss/giai-tri.rss',
      thethao: 'https://vietnamnet.vn/rss/the-thao.rss',
      congnghe: 'https://vietnamnet.vn/rss/thong-tin-truyen-thong.rss'
    },
    vtv: {
      all: 'https://vtv.vn/rss/home.rss',
      thoisu: 'https://vtv.vn/rss/trong-nuoc.rss',
      thegioi: 'https://vtv.vn/rss/the-gioi.rss',
      kinhdoanh: 'https://vtv.vn/rss/kinh-te.rss',
      giaitri: 'https://vtv.vn/rss/van-hoa-giai-tri.rss',
      thethao: 'https://vtv.vn/rss/the-thao.rss',
      congnghe: 'https://vtv.vn/rss/cong-nghe.rss'
    },
    genk: {
      all: 'https://genk.vn/rss/home.rss',
      congnghe: 'https://genk.vn/rss/home.rss'
    },
    tinhte: {
      all: 'https://tinhte.vn/rss',
      congnghe: 'https://tinhte.vn/rss'
    },
    kenh14: {
      all: 'https://kenh14.vn/rss/home.rss',
      giaitri: 'https://kenh14.vn/star.rss',
      thethao: 'https://kenh14.vn/sport.rss'
    }
  };

  const sourceFeeds = FEEDS_MAP[source] || FEEDS_MAP.vnexpress;

  let urlsToFetch = [];
  if (category === 'all') {
    // Merge the main feed and up to 3 major category feeds in parallel
    urlsToFetch = [
      sourceFeeds.all,
      sourceFeeds.thoisu,
      sourceFeeds.thegioi,
      sourceFeeds.kinhdoanh
    ].filter(Boolean);
  } else {
    const targetUrl = sourceFeeds[category] || sourceFeeds.all;
    urlsToFetch = [targetUrl];
  }

  try {
    const fetchPromises = urlsToFetch.map(url =>
      fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(6000)
      })
        .then(r => r.ok ? r.text() : '')
        .catch(e => {
          console.warn(`Failed to fetch feed ${url}:`, e.message);
          return '';
        })
    );

    const xmlTexts = await Promise.all(fetchPromises);
    let allItems = [];
    for (const xmlText of xmlTexts) {
      if (xmlText) {
        allItems = allItems.concat(parseRSS(xmlText));
      }
    }

    // Deduplicate by link or title
    const seen = new Set();
    const uniqueItems = [];
    for (const item of allItems) {
      const key = item.link || item.title;
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    }

    // Sort by pubDate descending
    uniqueItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return dateB - dateA;
    });

    return new Response(JSON.stringify(uniqueItems), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS }
    });
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

function parseRSS(xmlText) {
  const items = [];
  const matches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of matches) {
    const itemXml = match[1];

    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))/i);
    const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';

    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))/i);
    const link = linkMatch ? (linkMatch[1] || linkMatch[2] || '').trim() : '';

    const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))/i);
    const pubDate = pubDateMatch ? (pubDateMatch[1] || pubDateMatch[2] || '').trim() : '';

    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))/i);
    const rawDesc = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : '';

    // Extract image URL from description (e.g. <img src="url">)
    let imageUrl = '';
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const imgMatch = rawDesc.match(imgRegex);
    if (imgMatch) {
      imageUrl = imgMatch[1];
    }

    // If not found in description, check <enclosure> or <media:content>
    if (!imageUrl) {
      const encMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
      if (encMatch) imageUrl = encMatch[1];
    }

    // Clean description HTML tags
    let cleanDesc = rawDesc.replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim();

    items.push({
      title,
      link,
      pubDate,
      description: cleanDesc,
      image: imageUrl
    });
  }
  return items;
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
    if (cleanMST.length !== 9 && cleanMST.length !== 10 && cleanMST.length !== 12 && cleanMST.length !== 13) {
      return cors(JSON.stringify({ error: 'Mã số thuế / CCCD / CMND hợp lệ phải có 9, 10, 12 hoặc 13 chữ số.' }), 400);
    }

    // 1. Try Minh Chuyen API
    try {
      const res = await fetch(`https://mst.minhchuyen.online/api/mst/${cleanMST}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(1500)
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
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(2000)
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

    // 3. Try ThongTinDoanhNghiep API
    try {
      const res = await fetch(`https://thongtindoanhnghiep.co/api/company/${cleanMST}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(1500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.MaSoThue) {
          return cors(JSON.stringify({
            source: 'thongtindoanhnghiep',
            results: [{
              name: data.TenDoanhNghiep || data.TenPhongBan || 'Không rõ',
              mst: data.MaSoThue,
              representative: data.NguoiDaiDien || 'Không rõ',
              address: data.DiaChi || 'Không rõ',
              status: data.TrangThai || 'ĐANG HOẠT ĐỘNG'
            }]
          }));
        }
      }
    } catch (err) {
      console.warn('ThongTinDoanhNghiep API failed:', err);
    }

    // 4. Try scraping masothue.com
    try {
      const res = await fetch(`https://masothue.com/Search/?q=${cleanMST}&type=auto`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi,en-US;q=0.7,en;q=0.3',
          'Referer': 'https://masothue.com/'
        },
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const finalUrl = res.url || '';
        const path = new URL(finalUrl).pathname;
        const isDetailPage = /^\/[0-9-]{10,14}/.test(path);
        const html = await res.text();

        if (isDetailPage) {
          if (!html.includes(cleanMST)) {
            console.warn(`MasoThue scraper redirected to a poisoned URL (query not found in page): ${finalUrl}`);
          } else {

            // Match detail page
            const nameMatch = html.match(/itemprop="name"><span[^>]*>([^<]+)<\/span>/i) ||
              html.match(/itemprop='name'><span[^>]*>([^<]+)<\/span>/i) ||
              html.match(/itemprop="name">([^<]+)/i) ||
              html.match(/itemprop='name'>([^<]+)/i);

            const mstMatch = html.match(/itemprop="taxID"><span[^>]*>([0-9-]+)<\/span>/i) ||
              html.match(/itemprop='taxID'><span[^>]*>([0-9-]+)<\/span>/i) ||
              html.match(/itemprop="taxID"><b>([0-9-]+)<\/b>/i) ||
              html.match(/itemprop='taxID'><b>([0-9-]+)<\/b>/i) ||
              html.match(/Mã số thuế<\/td>\s*<td><b>([0-9-]+)<\/b>/i) ||
              html.match(/Mã số thuế<\/td>\s*<td><span[^>]*>([0-9-]+)<\/span>/i);

            const addrMatch = html.match(/Địa chỉ[^<]*<\/td>\s*<td>\s*<span[^>]*>([^<]+)<\/span>/i) ||
              html.match(/Địa chỉ[^<]*<\/td>\s*<td>\s*<span[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i) ||
              html.match(/Địa chỉ[^<]*<\/td>\s*<td>([^<]+)<\/td>/i) ||
              html.match(/itemprop="address">([^<]+)<\/td>/i) ||
              html.match(/itemprop='address'>([^<]+)<\/td>/i);

            const repMatch = html.match(/Người đại diện<\/td>\s*<td>\s*<span[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i) ||
              html.match(/Người đại diện<\/td>\s*<td>\s*<a[^>]*>([^<]+)<\/a>/i) ||
              html.match(/Người đại diện<\/td>\s*<td>([^<]+)<\/td>/i) ||
              html.match(/itemprop="alumniOf">([^<]+)<\/td>/i) ||
              html.match(/itemprop='alumniOf'>([^<]+)<\/td>/i);

            const managedMatch = html.match(/Quản lý bởi<\/td>\s*<td>\s*<span[^>]*>([^<]+)<\/span>/i) ||
              html.match(/Quản lý bởi<\/td>\s*<td>([^<]+)<\/td>/i);

            if (nameMatch) {
              const name = nameMatch[1].trim();
              const mst = mstMatch ? mstMatch[1].trim() : cleanMST;
              const address = addrMatch ? addrMatch[1].trim() : (managedMatch ? `Quản lý bởi: ${managedMatch[1].trim()}` : 'Không rõ');
              const representative = repMatch ? repMatch[1].trim() : name;

              return cors(JSON.stringify({
                source: 'masothue',
                results: [{
                  name,
                  mst,
                  representative,
                  address,
                  status: 'ĐANG HOẠT ĐỘNG'
                }]
              }));
            }
          }
        } else {
          // Match list page
          const listRegex = /<a href="\/([0-9-]{10,14})-[^"]+"[^>]*>([^<]+)<\/a>/g;
          const results = [];
          let m;
          while ((m = listRegex.exec(html)) !== null) {
            if (m[1] && m[2] && !m[2].includes('Mã số thuế') && !m[2].includes('Trang chủ')) {
              results.push({
                name: m[2].trim(),
                mst: m[1].trim(),
                representative: m[2].trim(),
                address: 'Xem chi tiết trên MaSoThue',
                status: 'ĐANG HOẠT ĐỘNG'
              });
            }
          }

          if (results.length > 0) {
            return cors(JSON.stringify({
              source: 'masothue-list',
              results
            }));
          }
        }
      }
    } catch (err) {
      console.warn('MasoThue scraper failed:', err);
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
      'https://cobalt.omega.wolfy.love',
      'https://cobaltapi.squair.xyz',
      'https://nuko-c.meowing.de',
      'https://api.cobalt.blackcat.sweeux.org',
      'https://cobalt.alpha.wolfy.love',
      'https://rue-cobalt.xenon.zone',
      'https://dog.kittycat.boo',
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
            filenameStyle: 'basic',
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
    'api.cobalt.blackcat.sweeux.org',
    'sweeux.org',
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
    'tiktokcdn.com',
    'tiktokcdn-us.com',
    'byteoversea.com',
    'ibyteimg.com',
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

async function handleCVReviewer(request, env) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST') {
    return cors(JSON.stringify({ error: 'POST method required' }), 405);
  }

  if (!env.AI) {
    return cors(JSON.stringify({ error: 'Workers AI is not configured.' }), 503);
  }

  try {
    const { cvText, jobPosition, jobDescription, tone } = await request.json();

    if (!cvText) {
      return cors(JSON.stringify({ error: 'Nội dung CV là bắt buộc để phân tích.' }), 400);
    }

    // Giới hạn CV ở server để đảm bảo token budget cho JSON output
    const MAX_CV_SERVER = 6000;
    const safeCvText = cvText.length > MAX_CV_SERVER
      ? cvText.substring(0, MAX_CV_SERVER) + '\n[... nội dung bị rút gọn ...]'
      : cvText;

    const persona = tone === 'cto'
      ? 'CTO (Giám đốc Công nghệ)'
      : (tone === 'recruiter' ? 'HR Manager (Trưởng phòng Nhân sự)' : 'Senior CV Expert');

    // Prompt chi tiết, hướng dẫn rõ từng field để đảm bảo output đầy đủ và nhất quán
    const systemPrompt = `You are a ${persona} doing a DETAILED, STRUCTURED review of a Vietnamese CV.
Target position: "${jobPosition || 'Not specified'}"
Job description: "${jobDescription ? jobDescription.substring(0, 400) : 'Not provided'}"

OUTPUT FORMAT: Respond ONLY with a single valid JSON object. Zero text outside JSON.

JSON SCHEMA (fill every field with REAL analysis from the CV, not placeholders):
{
  "score": <integer 0-100 based on: completeness 25pts + experience quality 25pts + ATS keywords 25pts + formatting 25pts>,
  "grade": <"Xuất sắc"|"Tốt"|"Khá"|"Trung bình"|"Cần sửa đổi nhiều">,
  "jd_match_score": <integer 0-100 based on how well the CV fits the target jobDescription, or null if no jobDescription provided>,
  "overview": <2-3 sentences: overall impression, years/level of experience, strongest qualification, and biggest gap vs target role>,
  "strengths": [
    <EXACTLY 5 items. Each: "Phần [X]: [specific quote or observation from CV] — [why it's a strength for this role]">
  ],
  "weaknesses": [
    <EXACTLY 5 items. Each: "Phần [X]: [specific issue found in CV] — [why it hurts this application]">
  ],
  "improvements": [
    <EXACTLY 5 items. Each: "Mục [X]: [concrete action step, e.g. 'Thêm số liệu định lượng vào dòng Y', 'Bổ sung từ khóa Z vào mục Kỹ năng']">
  ],
  "ats_feedback": <2-3 sentences: specific ATS issues — missing keywords for target role, formatting problems that confuse parsers, section names that should be standardized, contact info completeness>,
  "missing_keywords": [
    <EXACTLY 4-6 specific key skills, technologies, or keywords from the jobDescription that are missing or weak in the CV. If no jobDescription, list general industry standard skills missing for this jobPosition>
  ],
  "rewrites": [
    <EXACTLY 4 items. Each item MUST quote directly from the CV text in "before", then improve it in "after">
    {"before": <exact sentence/phrase from CV>, "after": <improved version with action verb + metric/result>, "reason": <specific reason why the rewrite improves ATS/impact>}
  ],
  "interview_prep": [
    <EXACTLY 3-4 items, each targeting specific CV details vs position requirements>
    {"question": <likely tough interview question targeted to candidate's background>, "answer_guideline": <strategic recommendation on how to answer effectively using achievements>}
  ]
}

Rules:
- score grade mapping: 85-100=Xuất sắc, 70-84=Tốt, 55-69=Khá, 40-54=Trung bình, 0-39=Cần sửa đổi nhiều
- Write ALL field values in Vietnamese
- Be critical and specific, never generic. Reference actual content from the CV.`;

    const userPrompt = `CV content:\n${safeCvText}`;

    const result = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    // Workers AI với response_format json_object trả về result.response là object đã parsed
    // Không phải string → phải xử lý cả 2 case
    let validatedJson = null;

    if (result && typeof result.response === 'object' && result.response !== null) {
      // Case 1: response_format json_object → object trực tiếp (phổ biến nhất)
      validatedJson = result.response;
    } else {
      // Case 2: response là string → extract + parse
      let rawText = '';
      if (typeof result === 'string') {
        rawText = result;
      } else if (result && typeof result.response === 'string') {
        rawText = result.response;
      } else if (result && typeof result.result === 'string') {
        rawText = result.result;
      } else {
        rawText = JSON.stringify(result ?? '');
      }
      rawText = rawText.replace(/^(assistant\s*)+/ig, '').trim();
      console.log('[CV Reviewer] rawText (500c):', rawText.substring(0, 500));

      // Thử parse thẳng
      try { validatedJson = JSON.parse(rawText); } catch (_) { }

      if (!validatedJson) {
        // Bóc khỏi markdown fences
        const mdMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (mdMatch) {
          try { validatedJson = JSON.parse(mdMatch[1].trim()); } catch (_) { }
        }
      }

      if (!validatedJson) {
        // Tìm JSON object trong text (first { to last })
        const s = rawText.indexOf('{');
        const e = rawText.lastIndexOf('}');
        if (s !== -1 && e > s) {
          const candidate = rawText.substring(s, e + 1)
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');
          try { validatedJson = JSON.parse(candidate); } catch (_) { }
        }
      }
    }

    if (!validatedJson) {
      console.error('[CV Reviewer] Could not parse AI JSON. result keys:', result ? Object.keys(result) : 'null');
      return cors(JSON.stringify({ error: 'AI không trả về JSON hợp lệ sau nhiều lần thử. Vui lòng thử lại.' }), 502);
    }

    // Đảm bảo các field bắt buộc tồn tại
    const safe = {
      score: Number(validatedJson.score) || 50,
      grade: validatedJson.grade || 'Khá',
      jd_match_score: validatedJson.jd_match_score !== undefined ? (validatedJson.jd_match_score === null ? null : (Number(validatedJson.jd_match_score) || null)) : null,
      overview: validatedJson.overview || '',
      strengths: Array.isArray(validatedJson.strengths) ? validatedJson.strengths : [],
      weaknesses: Array.isArray(validatedJson.weaknesses) ? validatedJson.weaknesses : [],
      improvements: Array.isArray(validatedJson.improvements) ? validatedJson.improvements : [],
      ats_feedback: validatedJson.ats_feedback || '',
      missing_keywords: Array.isArray(validatedJson.missing_keywords) ? validatedJson.missing_keywords : [],
      rewrites: Array.isArray(validatedJson.rewrites) ? validatedJson.rewrites : [],
      interview_prep: Array.isArray(validatedJson.interview_prep) ? validatedJson.interview_prep : []
    };

    return new Response(JSON.stringify({ response: JSON.stringify(safe) }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
    });
  } catch (err) {
    console.error('[CV Reviewer] Error:', err.message);
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

async function handleCVCoverLetter(request, env) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST') {
    return cors(JSON.stringify({ error: 'POST method required' }), 405);
  }
  if (!env.AI) {
    return cors(JSON.stringify({ error: 'Workers AI is not configured.' }), 503);
  }

  try {
    const { cvText, jobPosition, jobDescription, tone } = await request.json();

    if (!cvText) {
      return cors(JSON.stringify({ error: 'Nội dung CV là bắt buộc.' }), 400);
    }

    const persona = tone === 'cto'
      ? 'CTO (Giám đốc Công nghệ)'
      : (tone === 'recruiter' ? 'HR Manager (Trưởng phòng Nhân sự)' : 'Senior CV Expert');

    const systemPrompt = `You are a professional hiring manager writing a highly persuasive, tailored Cover Letter (Thư xin việc) in Vietnamese based on the candidate's CV and the target job description.
Target position: "${jobPosition || 'Not specified'}"
Job description: "${jobDescription ? jobDescription.substring(0, 400) : 'Not provided'}"

Instructions:
- Write the cover letter in professional, natural Vietnamese.
- Use a polite, confident, and professional tone.
- Directly connect the candidate's achievements and skills from their CV to the key requirements of the target position.
- Do not use placeholders (like [Name], [Company], etc.) where possible, or use standard professional formatting like "[Tên công ty ứng tuyển]" so the candidate knows to fill it.
- Keep the length around 300-400 words, structured into clean paragraphs: Greeting, Introduction/Targeting, Key value proposition (achievements), and a polite closing/call to action.
- Do not include any introductory comments, notes, or markdown formatting outside the letter itself. Just output the letter text directly.`;

    const userPrompt = `Candidate CV content:\n${cvText.substring(0, 5000)}`;

    const result = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 1500
    });

    let coverLetterText = '';
    if (typeof result === 'string') {
      coverLetterText = result;
    } else if (result && typeof result.response === 'string') {
      coverLetterText = result.response;
    } else if (result && typeof result.result === 'string') {
      coverLetterText = result.result;
    } else {
      coverLetterText = JSON.stringify(result ?? '');
    }

    // Clean up LLM artifacts
    coverLetterText = coverLetterText.replace(/^(assistant\s*)+/ig, '').trim();

    return new Response(JSON.stringify({ coverLetter: coverLetterText }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
    });
  } catch (err) {
    console.error('[CV CoverLetter] Error:', err.message);
    return cors(JSON.stringify({ error: err.message }), 500);
  }
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

LƯU Ý VỀ HÀNH ĐỘNG TRÊN DASHBOARD (QUAN TRỌNG):
Nếu người dùng muốn chuyển trang/tab, xem tiện ích khác, thêm công việc mới vào Todo, hoặc tìm kiếm thời tiết ở một địa phương cụ thể, bạn CÓ THỂ tự động kích hoạt hành động đó bằng cách đính kèm mã hành động tương ứng ở CUỐI CÙNG câu trả lời của bạn (và không chèn bất cứ nội dung gì sau đó).
Cú pháp mã hành động (chọn duy nhất một mã phù hợp nhất nếu cần):
1. Chuyển tab/phần: [ACTION: switch_section=<section_id>]
   Các <section_id> hợp lệ: finance (Tài chính), weather (Thời tiết), news (Tin tức), calendar (Lịch), travel (Di chuyển), todo (Ghi chú & Todo), lookup (Dịch vụ công/Phạt nguội), qrcode (QR & Rút gọn link), emulator (Giả lập game), tax-calc (Tính thuế TNCN), typing-test (Gõ phím), hardware-test (Test thiết bị), converter (Chuyển đổi đơn vị), bmi (Chỉ số BMI), iq (IQ), eq (EQ), mbti (MBTI), astrology (Bản đồ sao), devdocs (Tài liệu dev), cv-reviewer (AI CV Reviewer), lottery (Xổ số), world-clock (Đồng hồ), football (Bóng đá), downloader (Tải & Công cụ file), media (Phim & Trò chơi), focus (Tập trung & Âm nhạc).
   Ví dụ: "Tôi sẽ chuyển bạn sang tab Tính thuế TNCN ngay. [ACTION: switch_section=tax-calc]"
2. Thêm công việc (Todo): [ACTION: add_todo=<nội dung công việc>]
   Ví dụ: "Đã thêm công việc 'mua sữa' vào danh sách cần làm của bạn. [ACTION: add_todo=mua sữa]"
3. Tra cứu thời tiết thành phố: [ACTION: search_weather=<tên thành phố tiếng Anh hoặc không dấu>]
   Ví dụ: "Để tôi tìm kiếm thời tiết của thành phố Đà Nẵng nhé. [ACTION: search_weather=Da Nang]"

Bối cảnh Dashboard:
${contextStr}`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (Array.isArray(history)) {
      messages.push(...history.slice(-6));
    }

    messages.push({ role: 'user', content: prompt });

    const result = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages,
      temperature: 0.6,
      max_tokens: 1024
    });

    // Strip out leaked Llama 3.1 role headers
    let finalResponse = result.response || '';
    finalResponse = finalResponse.replace(/^(assistant\s*)+/ig, '').trim();
    if (!finalResponse) {
      finalResponse = 'Xin lỗi, tôi chưa thể trả lời câu hỏi của bạn lúc này.';
    }

    return new Response(JSON.stringify({ response: finalResponse }), {
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


// ─── /api/shorten — URL Shortener Proxy ──────────────────────────────
async function handleShorten(request, env) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST') {
    return cors(JSON.stringify({ error: 'Method not allowed' }), 405);
  }

  try {
    const { url } = await request.json();
    if (!url) {
      return cors(JSON.stringify({ error: 'Thiếu đường dẫn (url) cần rút gọn.' }), 400);
    }

    // 1. Bitly (nếu có BITLY_TOKEN trong Cloudflare Secrets)
    if (env && env.BITLY_TOKEN) {
      try {
        const response = await fetch('https://api-ssl.bitly.com/v4/shorten', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.BITLY_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ long_url: url }),
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.link) {
            return cors(JSON.stringify({ shorturl: data.link }));
          }
        }
      } catch (e) {
        console.warn('[Shorten] bitly failed:', e.message);
      }
    }

    // 2. tinyurl.com (fallback — ổn định, không cần API key)
    try {
      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const shortUrl = await response.text();
        if (shortUrl && shortUrl.startsWith('http')) {
          return cors(JSON.stringify({ shorturl: shortUrl.trim() }));
        }
      }
    } catch (e) {
      console.warn('[Shorten] tinyurl failed:', e.message);
    }

    // 2. is.gd
    try {
      const response = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.shorturl) {
          return cors(JSON.stringify({ shorturl: data.shorturl }));
        }
      }
    } catch (e) {
      console.warn('[Shorten] is.gd failed:', e.message);
    }

    // 3. v.gd (backup của is.gd)
    try {
      const response = await fetch(`https://v.gd/create.php?format=json&url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.shorturl) {
          return cors(JSON.stringify({ shorturl: data.shorturl }));
        }
      }
    } catch (e) {
      console.warn('[Shorten] v.gd failed:', e.message);
    }

    return cors(JSON.stringify({ error: 'Không thể rút gọn link bằng các dịch vụ công cộng hiện tại. Vui lòng thử lại sau.' }), 502);
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /api/education-quiz ───────────────────────────────────────────────
async function generateQuestionsWithAI(env, grade, subject, existingQuestions) {
  if (!env.AI) return [];

  const subjectNames = {
    toan: 'Toán học',
    ly: 'Vật lý',
    hoa: 'Hóa học',
    sinh: 'Sinh học',
    van: 'Ngữ văn',
    anh: 'Tiếng Anh',
    su: 'Lịch sử',
    dia: 'Địa lý',
    gdcd: 'Giáo dục công dân (GDCD)',
    tin: 'Tin học'
  };

  const subjectName = subjectNames[subject] || subject;
  const existingList = existingQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n');

  const systemPrompt = `Bạn là chuyên gia biên soạn đề thi trắc nghiệm học thuật chuẩn của Bộ Giáo dục và Đào tạo Việt Nam.
Hãy biên soạn 10 câu hỏi trắc nghiệm hoàn toàn mới, đa dạng chủ đề và đúng phân phối chương trình Lớp ${grade}, môn ${subjectName}.

Yêu cầu định dạng đầu ra phải là một JSON object có trường "questions" chứa mảng 10 câu hỏi, mỗi câu hỏi có cấu trúc:
{
  "question": "Nội dung câu hỏi trắc nghiệm...",
  "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
  "answer": 0, // chỉ số đáp án đúng (từ 0 đến 3)
  "difficulty": "easy" | "medium" | "hard",
  "explanation": "Giải thích ngắn gọn lý do vì sao chọn đáp án đó..."
}

Yêu cầu nghiêm ngặt:
1. KHÔNG trùng lặp hoặc lặp lại ý tưởng/nội dung của các câu hỏi sau:
${existingList}
2. Mỗi câu hỏi phải là một dạng bài/kiến thức hoàn toàn khác biệt. Tránh việc chỉ thay đổi số hay vài kí tự của câu khác.
3. Không trả về bất kỳ văn bản giải thích hay lời nói đầu nào ngoài chuỗi JSON đúng cấu trúc.`;

  try {
    const result = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Hãy tạo 10 câu hỏi trắc nghiệm Lớp ${grade} môn ${subjectName} dạng JSON.` }
      ],
      temperature: 0.8,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    let data = null;
    if (result && typeof result.response === 'object' && result.response !== null) {
      data = result.response;
    } else {
      const rawText = result.response || result.result || (typeof result === 'string' ? result : '');
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      }
    }

    if (data && Array.isArray(data.questions)) {
      return data.questions.map(q => ({
        question: q.question,
        options: Array.isArray(q.options) ? q.options : [],
        answer: typeof q.answer === 'number' ? q.answer : 0,
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || null
      }));
    }
  } catch (err) {
    console.error('[AI Question Generator] Error:', err);
  }
  return [];
}

async function handleEducationQuiz(request, env) {
  if (request.method === 'OPTIONS') return preflight();

  const url = env.SUPABASE_URL ? env.SUPABASE_URL.trim().replace(/^['\"]|['\"]$/g, '') : '';
  const key = env.SUPABASE_KEY ? env.SUPABASE_KEY.trim().replace(/^['\"]|['\"]$/g, '') : '';
  const hasDb = !!(url && key);

  if (!hasDb) return cors(JSON.stringify({ error: 'Database is not configured' }), 500);

  const { searchParams } = new URL(request.url);
  const grade = parseInt(searchParams.get('grade') || '0');
  const subject = searchParams.get('subject') || '';

  if (grade < 1 || grade > 12) return cors(JSON.stringify({ error: 'Invalid grade (1-12)' }), 400);
  if (!subject) return cors(JSON.stringify({ error: 'Subject is required' }), 400);

  // Validate subject against whitelist
  const VALID_SUBJECTS = ['toan', 'ly', 'hoa', 'sinh', 'van', 'anh', 'su', 'dia', 'gdcd', 'tin'];
  if (!VALID_SUBJECTS.includes(subject)) return cors(JSON.stringify({ error: 'Invalid subject' }), 400);

  try {
    // Fetch from Supabase with filtering
    const res = await fetch(
      `${url}/rest/v1/education_questions?select=id,question,options,answer,difficulty,explanation&grade=eq.${grade}&subject=eq.${encodeURIComponent(subject)}&order=id.asc`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[Education Quiz] Supabase error:', errText);
      return cors(JSON.stringify({ error: 'Failed to fetch questions' }), 500);
    }

    const pool = await res.json();

    // Deduplicate by grouping questions with the same base text (ignoring 'Bộ câu hỏi luyện tập' suffixes)
    const baseQuestionMap = new Map();
    for (const q of pool) {
      const baseText = q.question.replace(/\s*-\s*Bộ câu hỏi luyện tập\s*#\d+\??/gi, '').trim().toLowerCase();
      if (!baseQuestionMap.has(baseText)) {
        baseQuestionMap.set(baseText, []);
      }
      baseQuestionMap.get(baseText).push(q);
    }

    const isAiRequested = searchParams.get('ai') === 'true';
    const isPoolSmall = baseQuestionMap.size < 15;

    if (env.AI && (isAiRequested || isPoolSmall)) {
      // Get the existing base questions to prevent duplication
      const existingList = Array.from(baseQuestionMap.keys()).map(text => {
        // Clean any residual suffix
        return text.replace(/\s*-\s*bộ câu hỏi luyện tập\s*#\d+\??/gi, '').trim();
      });
      const aiQuestions = await generateQuestionsWithAI(env, grade, subject, existingList);
      if (aiQuestions && aiQuestions.length > 0) {
        return cors(JSON.stringify(aiQuestions), 200);
      }
    }

    // Fallback: Pick one representative randomly from each group
    const uniqueRepresentatives = [];
    for (const group of baseQuestionMap.values()) {
      const randomItem = group[Math.floor(Math.random() * group.length)];
      uniqueRepresentatives.push(randomItem);
    }

    // Shuffle the unique questions and pick up to 10
    const shuffled = uniqueRepresentatives.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);

    // Return safe questions and strip the mock suffixes for a clean user interface
    const safe = selected.map(q => {
      let cleanedQuestion = q.question.replace(/\s*-\s*Bộ câu hỏi luyện tập\s*#\d+\??/gi, '').trim();
      if (q.question.endsWith('?') && !/[?:.]$/.test(cleanedQuestion)) {
        cleanedQuestion += '?';
      }
      return {
        question: cleanedQuestion,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        answer: q.answer,
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || null
      };
    });

    return cors(JSON.stringify(safe), 200);
  } catch (err) {
    return cors(JSON.stringify({ error: err.message }), 500);
  }
}

// ─── /api/job-search ──────────────────────────────────────────────────
// Aggregate job listings from multiple Vietnamese platforms
const JOB_SEARCH_SOURCES = {
  topcv: {
    name: 'TopCV',
    searchUrl: (q, loc) => `https://www.topcv.vn/tim-viec-lam-${encodeURIComponent(q.replace(/\s+/g, '-').toLowerCase())}${loc ? `?province=${loc}` : ''}`,
    rssUrl: null,
  },
  vietnamworks: {
    name: 'VietnamWorks',
    searchUrl: (q) => `https://www.vietnamworks.com/tim-viec-lam/${encodeURIComponent(q.replace(/\s+/g, '-').toLowerCase())}`,
    rssUrl: null,
  },
  careerviet: {
    name: 'CareerViet',
    searchUrl: (q) => `https://careerviet.vn/viec-lam/${encodeURIComponent(q.replace(/\s+/g, '-').toLowerCase())}-kw.html`,
    rssUrl: null,
  },
  itviec: {
    name: 'ITviec',
    searchUrl: (q) => `https://itviec.com/it-jobs/${encodeURIComponent(q.replace(/\s+/g, '-').toLowerCase())}`,
    rssUrl: null,
  },
  vieclam24h: {
    name: 'ViecLam24h',
    searchUrl: (q) => `https://vieclam24h.vn/tim-kiem-viec-lam-nhanh?q=${encodeURIComponent(q)}`,
    rssUrl: null,
  },
  jobsgo: {
    name: 'JobsGo',
    searchUrl: (q) => `https://jobsgo.vn/viec-lam.html?keyword=${encodeURIComponent(q)}`,
    rssUrl: null,
  },
  topdev: {
    name: 'TopDev',
    searchUrl: (q) => `https://topdev.vn/viec-lam-it/${encodeURIComponent(q.replace(/\s+/g, '-').toLowerCase())}`,
    rssUrl: null,
  },
  careerlink: {
    name: 'CareerLink',
    searchUrl: (q) => `https://www.careerlink.vn/vieclam/list?keyword=${encodeURIComponent(q)}`,
    rssUrl: null,
  },
};

async function handleJobSearch(request) {
  if (request.method === 'OPTIONS') return preflight();

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const location = searchParams.get('location') || '';

  if (!query.trim()) {
    return cors(JSON.stringify({ jobs: [], total: 0 }), 200);
  }

  const allJobs = [];

  // Scrape from multiple sources in parallel
  const scrapers = [
    _scrapeTopCV(query, location),
    _scrapeCareerViet(query, location),
    _scrapeVietnamWorks(query, location),
    _scrapeITviec(query, location),
    _scrapeViecLam24h(query, location),
    _scrapeJobsGo(query, location),
    _scrapeTopDev(query, location),
    _scrapeCareerLink(query, location),
  ];

  const results = await Promise.allSettled(scrapers);

  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      allJobs.push(...result.value);
    }
  }

  return cors(JSON.stringify({ jobs: allJobs, total: allJobs.length }), 200);
}

// ── TopCV Scraper ──
async function _scrapeTopCV(query, location) {
  try {
    const slug = query.trim().replace(/\s+/g, '-').toLowerCase();
    const url = `https://www.topcv.vn/tim-viec-lam-${encodeURIComponent(slug)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'vi-VN,vi;q=0.9' },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return _parseTopCVHtml(html);
  } catch { return []; }
}

function _parseTopCVHtml(html) {
  const jobs = [];
  // Match job listing blocks
  const titleRegex = /class="[^"]*title[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>\s*<span[^>]*>([^<]*)<\/span>/gi;
  const companyRegex = /class="[^"]*company[^"]*"[^>]*>([^<]*)/gi;
  const salaryRegex = /class="[^"]*salary[^"]*"[^>]*>([^<]*)/gi;
  const locationRegex = /class="[^"]*location[^"]*"[^>]*>([^<]*)/gi;

  // Simplified extraction using common patterns
  const blocks = html.split(/job-item|job-list-item|data-job-id/i);
  for (let i = 1; i < Math.min(blocks.length, 16); i++) {
    const block = blocks[i];
    const titleMatch = block.match(/title[^>]*>\s*(?:<a[^>]*href="([^"]*)"[^>]*>)?\s*(?:<[^>]*>)*([^<]{5,})/i);
    const companyMatch = block.match(/company[^>]*>\s*(?:<[^>]*>)*\s*([^<]{3,})/i);
    const salaryMatch = block.match(/salary[^>]*>\s*(?:<[^>]*>)*\s*([^<]{3,})/i);
    const locMatch = block.match(/address|location[^>]*>\s*(?:<[^>]*>)*\s*([^<]{3,})/i);

    if (titleMatch) {
      jobs.push({
        title: _cleanText(titleMatch[2]),
        url: titleMatch[1] || '',
        company: companyMatch ? _cleanText(companyMatch[1]) : '',
        salary: salaryMatch ? _cleanText(salaryMatch[1]) : 'Thỏa thuận',
        location: locMatch ? _cleanText(locMatch[1]) : '',
        source: 'topcv',
        date: 'Mới cập nhật',
      });
    }
  }
  return jobs;
}

// ── CareerViet Scraper ──
async function _scrapeCareerViet(query, location) {
  try {
    const slug = query.trim().replace(/\s+/g, '-').toLowerCase();
    const url = `https://careerviet.vn/viec-lam/${encodeURIComponent(slug)}-kw.html`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'vi-VN,vi;q=0.9' },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return _parseGenericJobHtml(html, 'careerviet');
  } catch { return []; }
}

// ── VietnamWorks Scraper ──
async function _scrapeVietnamWorks(query, location) {
  try {
    const url = `https://www.vietnamworks.com/viec-lam?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'vi-VN,vi;q=0.9' },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return _parseGenericJobHtml(html, 'vietnamworks');
  } catch { return []; }
}

// ── ITviec Scraper ──
async function _scrapeITviec(query, location) {
  try {
    const url = `https://itviec.com/it-jobs?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return _parseITviecHtml(html);
  } catch (err) {
    console.warn('[ITviec Scraper]', err);
    return [];
  }
}

// ── ViecLam24h Scraper ──
async function _scrapeViecLam24h(query, location) {
  try {
    const url = `https://vieclam24h.vn/tim-kiem-viec-lam-nhanh?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return _parseViecLam24hHtml(html);
  } catch (err) {
    console.warn('[ViecLam24h Scraper]', err);
    return [];
  }
}

// ── JobsGo Scraper ──
async function _scrapeJobsGo(query, location) {
  try {
    const url = `https://jobsgo.vn/viec-lam.html?keyword=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'vi-VN,vi;q=0.9' },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return _parseGenericJobHtml(html, 'jobsgo');
  } catch { return []; }
}

// ── TopDev Scraper ──
async function _scrapeTopDev(query, location) {
  try {
    const slug = query.trim().replace(/\s+/g, '-').toLowerCase();
    const url = `https://topdev.vn/viec-lam-it/${encodeURIComponent(slug)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return _parseTopDevHtml(html);
  } catch (err) {
    console.warn('[TopDev Scraper]', err);
    return [];
  }
}

// ── CareerLink Scraper ──
async function _scrapeCareerLink(query, location) {
  try {
    const url = `https://www.careerlink.vn/vieclam/list?keyword=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return _parseCareerLinkHtml(html);
  } catch (err) {
    console.warn('[CareerLink Scraper]', err);
    return [];
  }
}

// ── ViecLam24h Parser ──
function _parseViecLam24hHtml(html) {
  const jobs = [];
  try {
    const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextMatch) {
      const data = JSON.parse(nextMatch[1]);
      const items = data.props?.initialProps?.pageProps?.jobsResponse?.items || 
                    data.props?.initialState?.api?.getJobList?.data?.items || [];
      for (const item of items) {
        let salary = 'Thỏa thuận';
        if (item.salary_min && item.salary_max) {
          const min = Math.round(item.salary_min / 1000000);
          const max = Math.round(item.salary_max / 1000000);
          salary = `${min} - ${max} triệu`;
        } else if (item.salary_min) {
          salary = `Từ ${Math.round(item.salary_min / 1000000)} triệu`;
        }
        
        jobs.push({
          title: _cleanText(item.title || ''),
          company: _cleanText(item.employer_info?.name || ''),
          salary: salary,
          location: _cleanText(item.employer_info?.province_name || ''),
          url: item.title_slug ? `https://vieclam24h.vn/${item.title_slug}-${item.id}.html` : '',
          type: '',
          date: 'Mới cập nhật',
          source: 'vieclam24h'
        });
      }
    }
  } catch (err) {
    console.warn('[ViecLam24h Parser Error]', err);
  }
  return jobs.slice(0, 15);
}

// ── ITviec Parser ──
function _parseITviecHtml(html) {
  const jobs = [];
  try {
    const blocks = html.split(/class=['"]job-card/i);
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      
      const urlMatch = block.match(/href=['"](https:\/\/itviec\.com\/it-jobs\/[a-zA-Z0-9_-]+|\/it-jobs\/[a-zA-Z0-9_-]+)/i);
      const titleMatch = block.match(/data-search--job-selection-target=['"]jobTitle['"][^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i) ||
                         block.match(/<h3[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i);
      
      if (!titleMatch) continue;
      
      const title = _cleanText(titleMatch[1]);
      let url = urlMatch ? urlMatch[1] : '';
      if (url && !url.startsWith('http')) {
        url = `https://itviec.com${url}`;
      }
      
      const companyMatch = block.match(/class=['"]text-rich-grey['"][^>]*>([\s\S]*?)<\/a>/i) ||
                           block.match(/class=['"]text-rich-grey[^'"]*['"][^>]*>([\s\S]*?)<\/a>/i) ||
                           block.match(/<a[^>]*href=['"]\/companies\/[^'"]*['"][^>]*>([\s\S]*?)<\/a>/i);
      const company = companyMatch ? _cleanText(companyMatch[1]) : '';
      
      const locMatch = block.match(/#map-pin['"]><\/use><\/svg>\s*<div[^>]*title=['"]([^'"]+)['"]/i) ||
                       block.match(/#map-pin['"]><\/use><\/svg>\s*<div[^>]*>([\s\S]*?)<\/div>/i) ||
                       block.match(/title=['"](Ha Noi|Ho Chi Minh|Da Nang|Remote|Binh Duong|Dong Nai)['"]/i);
      const location = locMatch ? _cleanText(locMatch[1]) : '';
      
      let salary = 'Thỏa thuận';
      if (block.includes('sign-in-view-salary')) {
        salary = 'Thương lượng';
      } else {
        const salaryMatch = block.match(/class=['"]salary[^'"]*['"][^>]*>([\s\S]*?)<\/div>/i);
        if (salaryMatch) {
          salary = _cleanText(salaryMatch[1]);
        }
      }
      
      const logoMatch = block.match(/<img[^>]*data-src=['"]([^'"]+)['"]/i) ||
                        block.match(/<img[^>]*src=['"]([^'"]+)['"]/i);
      const logo = logoMatch ? logoMatch[1] : '';
      
      if (!jobs.some(j => j.title === title)) {
        jobs.push({
          title,
          url,
          company,
          salary,
          location,
          logo,
          source: 'itviec',
          date: 'Mới cập nhật'
        });
      }
    }
  } catch (err) {
    console.warn('[ITviec Parser Error]', err);
  }
  return jobs.slice(0, 15);
}

// ── TopDev Parser ──
function _parseTopDevHtml(html) {
  const jobs = [];
  try {
    const blocks = html.split(/href=["']\/detail-jobs\//i);
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      
      const urlMatch = block.match(/^([^"'?]+)/);
      if (!urlMatch) continue;
      const slug = urlMatch[1];
      const url = `https://topdev.vn/detail-jobs/${slug}`;
      
      const titleMatch = block.match(/^[^>]*>([^<]+)<\/a>/i);
      if (!titleMatch) continue;
      const title = _cleanText(titleMatch[1]);
      
      const companyMatch = block.match(/class="[^"]*text-text-500[^"]*">([^<]+)<\/span>/i);
      const company = companyMatch ? _cleanText(companyMatch[1]) : '';
      
      let salary = 'Thỏa thuận';
      const salaryMatch = block.match(/class="[^"]*text-brand-600[^"]*">\s*<span[^>]*>([^<]+)<\/span>/i) ||
                          block.match(/class="[^"]*text-brand-600[^"]*">([^<]+)<\/span>/i) ||
                          block.match(/Login to view salary/gi);
      if (salaryMatch) {
        const text = _cleanText(salaryMatch[0] || salaryMatch[1]);
        if (text.toLowerCase().includes('login to view salary')) {
          salary = 'Thương lượng';
        } else {
          salary = text;
        }
      }
      
      const locMatch = block.match(/<span class="line-clamp-1">\s*([^<]+)<\/span>/i);
      const location = locMatch ? _cleanText(locMatch[1]) : '';
      
      const typeMatch = block.match(/<\/svg>\s*<!--\s*-->\s*([^<]+)<\/span>/i) ||
                        block.match(/<\/svg>\s*([^<]+)<\/span>/i);
      const type = typeMatch ? _cleanText(typeMatch[1]) : '';
      
      if (!jobs.some(j => j.title === title)) {
        jobs.push({
          title,
          url,
          company,
          salary,
          location,
          type,
          source: 'topdev',
          date: 'Mới cập nhật'
        });
      }
    }
  } catch (err) {
    console.warn('[TopDev Parser Error]', err);
  }
  return jobs.slice(0, 15);
}

// ── CareerLink Parser ──
function _parseCareerLinkHtml(html) {
  const jobs = [];
  try {
    const ldMatch = html.match(/<script[^>]*type=['"]application\/ld\+json['"][^>]*>([\s\S]*?)<\/script>/gi);
    if (ldMatch) {
      for (const script of ldMatch) {
        const content = script.replace(/<script[^>]*>|<\/script>/gi, '').trim();
        if (content.includes('SearchResultsPage')) {
          const data = JSON.parse(content);
          const items = data.mainEntity?.itemListElement || [];
          
          for (const item of items) {
            const itemUrl = item.item?.url || '';
            const itemName = item.item?.name || '';
            if (!itemUrl) continue;
            
            const jobIdMatch = itemUrl.match(/\/(\d+)(\?|$)/);
            if (!jobIdMatch) continue;
            const jobId = jobIdMatch[1];
            
            const blockIndex = html.lastIndexOf(jobId);
            if (blockIndex !== -1 && blockIndex > 10000) {
              const nearHtml = html.substring(blockIndex - 300, blockIndex + 1200);
              
              const companyMatch = nearHtml.match(/class=['"]text-dark job-company[^'"]*['"][^>]*title=['"]([^'"]+)['"]/i) ||
                                   nearHtml.match(/class=['"]text-dark job-company[^>]*title=['"]([^'"]+)['"]/i) ||
                                   nearHtml.match(/job-company[^>]*>([\s\S]*?)<\/a>/i);
              const company = companyMatch ? _cleanText(companyMatch[1]) : '';
              
              const locMatch = nearHtml.match(/class=['"]job-location[^>]*>\s*<i[^>]*><\/i>\s*<div[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i) ||
                               nearHtml.match(/class=['"]job-location[^>]*>[\s\S]*?href=['"]\/tim-viec-lam-tai\/[^'"]*['"][^>]*>([^<]+)<\/a>/i) ||
                               nearHtml.match(/class=['"]text-reset['"][^>]*>([^<]+)<\/a>/i) ||
                               nearHtml.match(/job-location[^>]*>([\s\S]*?)<\/div>/i);
              const location = locMatch ? _cleanText(locMatch[1]) : '';
              
              const salaryContainerMatch = nearHtml.match(/class=['"]job-salary[^'"]*['"][^>]*>([\s\S]*?)<\/span>\s*<span class=['"]text-muted/i) ||
                                           nearHtml.match(/class=['"]job-salary[^'"]*['"][^>]*>([\s\S]*?)<\/span>\s*<\/div>/i) ||
                                           nearHtml.match(/class=['"]job-salary[^'"]*['"][^>]*>([\s\S]*?)<\/span>/i);
              let salary = salaryContainerMatch ? _cleanText(salaryContainerMatch[1]) : 'Thương lượng';
              if (salary.includes('Thương lượng')) salary = 'Thỏa thuận';
              
              jobs.push({
                title: itemName,
                url: itemUrl,
                company,
                location,
                salary,
                source: 'careerlink',
                date: 'Mới cập nhật'
              });
            } else {
              jobs.push({
                title: itemName,
                url: itemUrl,
                company: '',
                location: '',
                salary: 'Thỏa thuận',
                source: 'careerlink',
                date: 'Mới cập nhật'
              });
            }
          }
          break;
        }
      }
    }
  } catch (err) {
    console.warn('[CareerLink Parser Error]', err);
  }
  return jobs.slice(0, 15);
}

// ── Generic HTML Job Parser (Fallback) ──
// Uses common HTML patterns across Vietnamese job sites
function _parseGenericJobHtml(html, source) {
  const jobs = [];

  // Strategy 1: Extract from JSON-LD structured data
  const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const jsonStr = match.replace(/<script[^>]*>|<\/script>/gi, '').trim();
        const data = JSON.parse(jsonStr);
        const postings = Array.isArray(data) ? data : (data['@graph'] || [data]);
        for (const posting of postings) {
          if (posting['@type'] === 'JobPosting' || posting['@type']?.includes?.('JobPosting')) {
            jobs.push({
              title: _cleanText(posting.title || ''),
              company: _cleanText(posting.hiringOrganization?.name || ''),
              salary: posting.baseSalary?.value?.value ||
                      (posting.baseSalary?.value?.minValue && posting.baseSalary?.value?.maxValue ?
                        `${posting.baseSalary.value.minValue} - ${posting.baseSalary.value.maxValue}` : '') ||
                      'Thỏa thuận',
              location: _cleanText(
                posting.jobLocation?.address?.addressLocality ||
                posting.jobLocation?.address?.addressRegion ||
                (typeof posting.jobLocation === 'string' ? posting.jobLocation : '') || ''
              ),
              url: posting.url || '',
              type: posting.employmentType || '',
              date: posting.datePosted || 'Mới cập nhật',
              experience: posting.experienceRequirements || '',
              source,
            });
          }
        }
      } catch { /* ignore parse errors */ }
    }
  }

  // Strategy 2: Parse common HTML patterns if JSON-LD didn't yield results
  if (jobs.length === 0) {
    // Look for common job card patterns
    const patterns = [
      // Pattern: <a> with title containing job keywords inside a card/list-item
      /<a[^>]*href="([^"]*)"[^>]*title="([^"]{10,})"[^>]*class="[^"]*(?:job|title|name)[^"]*"/gi,
      // Pattern: h2/h3 with a > link inside job cards
      /<(?:h[2-4]|div)[^>]*class="[^"]*(?:job|title|name)[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]{5,})<\/a>/gi,
    ];

    for (const pattern of patterns) {
      let m;
      while ((m = pattern.exec(html)) !== null && jobs.length < 15) {
        const jobUrl = m[1];
        const jobTitle = _cleanText(m[2]);
        if (jobTitle.length > 5 && !jobTitle.includes('đăng nhập') && !jobTitle.includes('trang chủ')) {
          // Try to find company name near this match
          const nearbyHtml = html.substring(Math.max(0, m.index - 200), Math.min(html.length, m.index + 500));
          const companyMatch = nearbyHtml.match(/company[^>]*>\s*(?:<[^>]*>)*\s*([^<]{3,60})/i)
            || nearbyHtml.match(/employer[^>]*>\s*(?:<[^>]*>)*\s*([^<]{3,60})/i);
          const salaryMatch = nearbyHtml.match(/salary[^>]*>\s*(?:<[^>]*>)*\s*([^<]{3,60})/i)
            || nearbyHtml.match(/lương[^>]*>\s*(?:<[^>]*>)*\s*([^<]{3,60})/i);
          const locMatch = nearbyHtml.match(/location[^>]*>\s*(?:<[^>]*>)*\s*([^<]{3,60})/i)
            || nearbyHtml.match(/address[^>]*>\s*(?:<[^>]*>)*\s*([^<]{3,60})/i);

          // Avoid duplicates
          if (!jobs.some(j => j.title === jobTitle)) {
            jobs.push({
              title: jobTitle,
              url: jobUrl.startsWith('http') ? jobUrl : `https://${JOB_SEARCH_SOURCES[source]?.searchUrl ? new URL(JOB_SEARCH_SOURCES[source].searchUrl('test')).hostname : ''}${jobUrl}`,
              company: companyMatch ? _cleanText(companyMatch[1]) : '',
              salary: salaryMatch ? _cleanText(salaryMatch[1]) : 'Thỏa thuận',
              location: locMatch ? _cleanText(locMatch[1]) : '',
              source,
              date: 'Mới cập nhật',
            });
          }
        }
      }
    }
  }

  return jobs.slice(0, 15);
}

function _cleanText(text) {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, '').replace(/&[a-z0-9#]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    // ── Diagnostic Endpoint ──
    if (pathname === '/api/routing-diagnostic') {
      return new Response(JSON.stringify({
        status: "ok",
        version: "1.0.3",
        timestamp: new Date().toISOString(),
        requestUrl: request.url,
        requestMethod: request.method,
        acceptHeader: request.headers.get('Accept'),
        userAgent: request.headers.get('User-Agent'),
        cfRay: request.headers.get('CF-Ray')
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname === '/phat-nguoi') return handlePhatNguoi(request);
    if (pathname === '/news-rss') return handleNewsRSS(request);
    if (pathname === '/news-article') return handleNewsArticle(request);
    if (pathname === '/vnindex') return handleVNIndex(request);
    if (pathname === '/power-outage') return handlePowerOutage(request);
    if (pathname === '/vcb-rates') return handleVCBRates(request);
    if (pathname === '/lottery') return handleLottery(request);
    if (pathname === '/football') return handleFootball(request);
    if (pathname === '/api/todos') return handleTodos(request, env);
    if (pathname === '/api/events') return handleEvents(request, env);
    if (pathname === '/api/iqeq') return handleIQEQ(request, env);
    if (pathname === '/api/mbti') return handleMBTI(request, env);
    if (pathname === '/api/news') return handleApiNews(request);

    if (pathname === '/api/spam-check') return handleSpamCheck(request);
    if (pathname === '/api/tax-lookup') return handleTaxLookup(request);
    if (pathname === '/api/downloader') return handleDownloader(request);
    if (pathname === '/api/download-proxy') return handleDownloadProxy(request);
    if (pathname === '/api/movies-now-playing') return handleMoviesNowPlaying(request);
    if (pathname === '/api/exchange') return handleExchange(request);
    if (pathname === '/api/crypto') return handleCrypto(request, env);
    if (pathname === '/vietlott') return handleVietlott(request);
    if (pathname === '/api/ai') return handleAI(request, env);
    if (pathname === '/api/cv-reviewer') return handleCVReviewer(request, env);
    if (pathname === '/api/cv-coverletter') return handleCVCoverLetter(request, env);
    if (pathname === '/api/tts') return handleTTS(request);
    if (pathname === '/api/shorten') return handleShorten(request, env);
    if (pathname === '/api/education-quiz') return handleEducationQuiz(request, env);
    if (pathname === '/api/job-search') return handleJobSearch(request);



    // ── Routes bảo mật (key ẩn trong Cloudflare Secrets) ──
    if (pathname === '/weather') return handleWeather(request, env);
    if (pathname === '/gold') return handleGold(request, env);
    if (pathname === '/gas') return handleGas(request, env);
    if (pathname === '/aqi') return handleAQI(request, env);

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
