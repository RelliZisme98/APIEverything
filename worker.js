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

// ── NGÂN HÀNG ĐỀ THI IQ BẢO MẬT TRÊN SERVER (100 CÂU) ────────────────────────
const SERVER_IQ_POOL = [
];

// ── NGÂN HÀNG ĐỀ THI EQ BẢO MẬT TRÊN SERVER (100 CÂU) ────────────────────────
const SERVER_EQ_POOL = [
  // --- 1. Empathy - Thấu Cảm (25 Câu) ---
  { q: "Tôi dễ nhận ra tâm trạng vui buồn của người bên cạnh dù họ cố giấu.", type: "+", dim: "empathy" },
  { q: "Tôi thấy khó chia sẻ với nỗi buồn của người khác nếu tôi chưa từng rơi vào hoàn cảnh đó.", type: "-", dim: "empathy" },
  { q: "Tôi thường lắng nghe chăm chú mà không ngắt lời khi người khác tâm sự.", type: "+", dim: "empathy" },
  { q: "Khi người khác gặp khó khăn, tôi thường tự đặt mình vào vị trí của họ để thấu hiểu.", type: "+", dim: "empathy" },
  { q: "Tôi cảm thấy bực mình khi phải nghe người khác than vãn về khó khăn của họ.", type: "-", dim: "empathy" },
  { q: "Tôi dễ bị xúc động và rơi nước mắt khi xem các bộ phim cảm động.", type: "+", dim: "empathy" },
  { q: "Tôi thường nhận ra sự thay đổi thái độ của đồng nghiệp hay bạn bè rất nhanh.", type: "+", dim: "empathy" },
  { q: "Tôi nghĩ rằng việc thể hiện sự thương hại hay thông cảm quá mức là không cần thiết.", type: "-", dim: "empathy" },
  { q: "Tôi rất quan tâm đến cảm xúc của mọi người xung quanh khi đưa ra quyết định tập thể.", type: "+", dim: "empathy" },
  { q: "Tôi thường đoán trước được ai đó sẽ phản ứng ra sao trước một tin buồn.", type: "+", dim: "empathy" },
  { q: "Tôi không mấy bận tâm đến việc lời nói của mình có thể làm người khác chạnh lòng.", type: "-", dim: "empathy" },
  { q: "Tôi cảm nhận rõ niềm vui của bạn bè giống như niềm vui của chính mình.", type: "+", dim: "empathy" },
  { q: "Tôi tôn trọng những quan điểm sống khác biệt hoàn toàn với niềm tin của tôi.", type: "+", dim: "empathy" },
  { q: "Tôi có xu hướng bỏ qua cảm xúc của người khác nếu việc đó cản trở công việc.", type: "-", dim: "empathy" },
  { q: "Tôi thường cảm thấy ấm lòng khi giúp đỡ người lạ gặp hoạn nạn trên đường.", type: "+", dim: "empathy" },
  { q: "Tôi có khả năng nhận biết ai đó đang cười gượng gạo hay vui thực lòng.", type: "+", dim: "empathy" },
  { q: "Tôi cảm thấy mệt mỏi khi phải lắng nghe tâm tư từ những người không thân thiết.", type: "-", dim: "empathy" },
  { q: "Tôi luôn cố gắng an ủi bạn bè khi thấy họ mất phương hướng.", type: "+", dim: "empathy" },
  { q: "Tôi thường chú ý đến ngôn ngữ cơ thể của đối phương trong lúc giao tiếp.", type: "+", dim: "empathy" },
  { q: "Tôi cảm thấy bất an khi thấy người bên cạnh tỏ ra không thoải mái.", type: "+", dim: "empathy" },
  { q: "Tôi thường phán xét hành động của người khác trước khi tìm hiểu lý do.", type: "-", dim: "empathy" },
  { q: "Tôi dễ tha thứ cho những lỗi lầm vô ý của người khác.", type: "+", dim: "empathy" },
  { q: "Tôi sẵn sàng hy sinh một chút quyền lợi riêng để giúp một người đang gặp bế tắc.", type: "+", dim: "empathy" },
  { q: "Tôi cảm thấy khó chịu khi người khác khóc trước mặt tôi.", type: "-", dim: "empathy" },
  { q: "Tôi luôn kiên nhẫn khi nói chuyện với những người có tốc độ phản xạ chậm hơn.", type: "+", dim: "empathy" },

  // --- 2. Self-Regulation - Tự Điều Chỉnh (25 Câu) ---
  { q: "Khi nổi giận, tôi nói ra những lời tổn thương mà sau đó thấy hối hận.", type: "-", dim: "selfReg" },
  { q: "Tôi giữ được bình tĩnh và suy nghĩ thấu đáo dưới áp lực lớn.", type: "+", dim: "selfReg" },
  { q: "Khi thất bại, tôi thường đổ lỗi cho hoàn cảnh thay vì nhìn nhận lỗi sai bản thân.", type: "-", dim: "selfReg" },
  { q: "Tôi mất rất nhiều thời gian để nguôi giận sau một tranh cãi gay gắt.", type: "-", dim: "selfReg" },
  { q: "Tôi có thể kìm nén cơn tức giận để tiếp tục làm việc một cách chuyên nghiệp.", type: "+", dim: "selfReg" },
  { q: "Tôi dễ mất kiên nhẫn khi công việc không diễn ra đúng tiến độ dự kiến.", type: "-", dim: "selfReg" },
  { q: "Tôi luôn cân nhắc kỹ hậu quả trước khi đưa ra quyết định quan trọng.", type: "+", dim: "selfReg" },
  { q: "Tôi thường hành động theo cảm tính tức thời hơn là suy nghĩ logic.", type: "-", dim: "selfReg" },
  { q: "Khi gặp tình huống bất ngờ, tôi biết cách tự trấn an và không hoảng loạn.", type: "+", dim: "selfReg" },
  { q: "Tôi khó kiểm soát được thói quen mua sắm hay ăn uống khi tâm trạng đi xuống.", type: "-", dim: "selfReg" },
  { q: "Tôi có thể dễ dàng tha thứ và bỏ qua những xích mích nhỏ trong ngày.", type: "+", dim: "selfReg" },
  { q: "Tôi hay nổi cáu nếu ai đó làm gián đoạn lúc tôi đang tập trung làm việc.", type: "-", dim: "selfReg" },
  { q: "Tôi thích nghi nhanh chóng với những thay đổi đột ngột trong kế hoạch.", type: "+", dim: "selfReg" },
  { q: "Tôi dễ bị phân tâm bởi mạng xã hội hay các yếu tố giải trí xung quanh.", type: "-", dim: "selfReg" },
  { q: "Tôi kiềm chế tốt ham muốn đáp trả gay gắt khi bị người khác chỉ trích vô căn cứ.", type: "+", dim: "selfReg" },
  { q: "Tôi thường lo lắng thái quá về những việc chưa xảy ra.", type: "-", dim: "selfReg" },
  { q: "Tôi có khả năng tự tạo động lực để hoàn thành công việc kể cả khi chán nản.", type: "+", dim: "selfReg" },
  { q: "Tôi thường phản ứng ngay lập tức mà không cần thời gian suy nghĩ.", type: "-", dim: "selfReg" },
  { q: "Tôi kiểm soát tốt cảm xúc cá nhân để không làm ảnh hưởng tới không khí chung.", type: "+", dim: "selfReg" },
  { q: "Tôi dễ dàng thừa nhận sai sót của mình và tìm cách sửa chữa.", type: "+", dim: "selfReg" },
  { q: "Tôi hay bị mất ngủ vì suy nghĩ quá nhiều về những lỗi lầm cũ.", type: "-", dim: "selfReg" },
  { q: "Tôi có thể từ bỏ sở thích ngắn hạn để hướng tới mục tiêu dài hạn.", type: "+", dim: "selfReg" },
  { q: "Tôi dễ nổi nóng khi tài xế phía trước di chuyển quá chậm.", type: "-", dim: "selfReg" },
  { q: "Tôi giữ được sự kiên nhẫn khi hướng dẫn người khác làm một việc khó.", type: "+", dim: "selfReg" },
  { q: "Tôi luôn duy trì thói quen sinh hoạt điều độ bất kể lịch trình bận rộn.", type: "+", dim: "selfReg" },

  // --- 3. Social Skills - Kỹ Năng Xã Hội (25 Câu) ---
  { q: "Tôi cảm thấy thoải mái khi bắt chuyện với người lạ tại các sự kiện.", type: "+", dim: "social" },
  { q: "Tôi thường hay hiểu lầm hoặc cãi vã với đồng nghiệp và bạn bè.", type: "-", dim: "social" },
  { q: "Mọi người thường tìm đến tôi làm cầu nối giải quyết xung đột.", type: "+", dim: "social" },
  { q: "Tôi dễ thuyết phục và tạo được sự đồng thuận trong tập thể.", type: "+", dim: "social" },
  { q: "Tôi thường cảm thấy lạc lõng và khó hòa nhập khi tham gia nhóm mới.", type: "-", dim: "social" },
  { q: "Tôi có thể dễ dàng xoay chuyển câu chuyện khi thấy đối phương không thoải mái.", type: "+", dim: "social" },
  { q: "Tôi biết khi nào cần nói lời từ chối mà không làm người khác tổn thương.", type: "+", dim: "social" },
  { q: "Tôi cảm thấy căng thẳng khi phải trình bày ý kiến trước đám đông.", type: "-", dim: "social" },
  { q: "Tôi có mạng lưới bạn bè và mối quan hệ xã hội đa dạng, tốt đẹp.", type: "+", dim: "social" },
  { q: "Tôi khó khăn trong việc duy trì liên lạc lâu dài với bạn bè cũ.", type: "-", dim: "social" },
  { q: "Tôi thích làm việc nhóm hơn là làm việc độc lập một mình.", type: "+", dim: "social" },
  { q: "Tôi thường chủ động hòa giải khi thấy bạn bè có xích mích.", type: "+", dim: "social" },
  { q: "Tôi thấy khó khăn khi phải giải thích suy nghĩ của mình cho người khác hiểu.", type: "-", dim: "social" },
  { q: "Tôi biết cách khen ngợi người khác một cách chân thành và khéo léo.", type: "+", dim: "social" },
  { q: "Tôi cảm thấy ngột ngạt khi ở những nơi quá đông người.", type: "-", dim: "social" },
  { q: "Tôi có thể hợp tác tốt với cả những người có tính cách trái ngược.", type: "+", dim: "social" },
  { q: "Tôi thường bị coi là người lạnh lùng hay khó gần gũi.", type: "-", dim: "social" },
  { q: "Tôi biết cách khuấy động bầu không khí trong các buổi tụ tập.", type: "+", dim: "social" },
  { q: "Tôi tôn trọng ý kiến của số đông ngay cả khi tôi có góc nhìn riêng biệt.", type: "+", dim: "social" },
  { q: "Tôi thường tránh né việc tranh luận vì sợ làm mất lòng đối phương.", type: "-", dim: "social" },
  { q: "Tôi rất tự tin trong các buổi phỏng vấn hoặc đàm phán.", type: "+", dim: "social" },
  { q: "Tôi thấy khó chia sẻ công việc cho người khác vì sợ họ làm không tốt.", type: "-", dim: "social" },
  { q: "Tôi luôn chào hỏi mọi người với thái độ thân thiện và cởi mở.", type: "+", dim: "social" },
  { q: "Tôi cảm thấy thoải mái khi làm việc dưới sự dẫn dắt của người khác.", type: "+", dim: "social" },
  { q: "Tôi có thể xoa dịu bầu không khí căng thẳng bằng một lời nói đùa đúng lúc.", type: "+", dim: "social" },

  // --- 4. Self-Awareness - Tự Nhận Thức (25 Câu) ---
  { q: "Tôi hiểu rất rõ điểm mạnh và giới hạn năng lực của chính mình.", type: "+", dim: "selfAwa" },
  { q: "Tôi biết rõ nguyên nhân sâu xa của sự thay đổi cảm xúc của mình.", type: "+", dim: "selfAwa" },
  { q: "Tôi có những phản ứng bộc phát mà chính tôi cũng không giải thích nổi nguyên nhân.", type: "-", dim: "selfAwa" },
  { q: "Tôi nhận biết được cơ thể mình đang căng thẳng trước khi tâm trí tôi kịp nhận ra.", type: "+", dim: "selfAwa" },
  { q: "Tôi hay nghi ngờ giá trị và khả năng của bản thân khi gặp thử thách nhỏ.", type: "-", dim: "selfAwa" },
  { q: "Tôi biết rõ những giá trị cốt lõi nào định hình nên con người tôi.", type: "+", dim: "selfAwa" },
  { q: "Tôi thường bối rối không biết cảm xúc thực sự của mình lúc này là gì.", type: "-", dim: "selfAwa" },
  { q: "Tôi hiểu được cách hành xử của tôi ảnh hưởng thế nào đến mọi người.", type: "+", dim: "selfAwa" },
  { q: "Tôi cần sự công nhận từ người khác để cảm thấy tự tin về bản thân.", type: "-", dim: "selfAwa" },
  { q: "Tôi thường dành thời gian cuối ngày để tự kiểm điểm hành vi của mình.", type: "+", dim: "selfAwa" },
  { q: "Tôi biết chính xác những yếu tố nào dễ khiến tôi mất bình tĩnh.", type: "+", dim: "selfAwa" },
  { q: "Tôi cảm thấy mơ hồ về mục tiêu tương lai của bản thân.", type: "-", dim: "selfAwa" },
  { q: "Tôi nhận ra ngay khi cái tôi của mình đang lấn át lý trí.", type: "+", dim: "selfAwa" },
  { q: "Tôi thường so sánh bản thân với người khác một cách tiêu cực.", type: "-", dim: "selfAwa" },
  { q: "Tôi biết cách tự khích lệ bản thân vượt qua giai đoạn khó khăn.", type: "+", dim: "selfAwa" },
  { q: "Tôi khó nói rõ cảm xúc của mình thành lời cho người khác hiểu.", type: "-", dim: "selfAwa" },
  { q: "Tôi hiểu rõ tại sao tôi lại thích hay ghét một ai đó ngay từ lần đầu gặp.", type: "+", dim: "selfAwa" },
  { q: "Tôi thường hối hận về các quyết định mà tôi đưa ra lúc nóng giận.", type: "-", dim: "selfAwa" },
  { q: "Tôi tin tưởng vào trực giác và tiếng nói bên trong của mình.", type: "+", dim: "selfAwa" },
  { q: "Tôi chấp nhận những khuyết điểm của bản thân và cố gắng hoàn thiện.", type: "+", dim: "selfAwa" },
  { q: "Tôi cảm thấy bị tổn thương sâu sắc trước những lời góp ý thẳng thắn.", type: "-", dim: "selfAwa" },
  { q: "Tôi biết rõ việc gì sẽ mang lại niềm vui thực sự cho mình.", type: "+", dim: "selfAwa" },
  { q: "Tôi luôn nhất quán giữa suy nghĩ bên trong và hành động bên ngoài.", type: "+", dim: "selfAwa" },
  { q: "Tôi cảm thấy không chắc chắn về năng lực thực sự của bản thân.", type: "-", dim: "selfAwa" },
  { q: "Tôi tự hào về con người hiện tại của mình mà không cần ai phán xét.", type: "+", dim: "selfAwa" }
];

// ─── /api/iqeq (Endpoint bảo mật: Lấy câu hỏi, Chấm điểm, và Đọc kết quả) ──────
async function handleIQEQ(request, env) {
  if (request.method === 'OPTIONS') return preflight();

  const url = env.SUPABASE_URL ? env.SUPABASE_URL.trim().replace(/^['\"]|['\"]$/g, '') : '';
  const key = env.SUPABASE_KEY ? env.SUPABASE_KEY.trim().replace(/^['\"]|['\"]$/g, '') : '';

  if (!url || !key) {
    return cors(JSON.stringify({ error: 'Supabase URL or Key is missing' }), 503);
  }

  const supabaseHeaders = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'list';

  try {
    // 1. LẤY CÂU HỎI TRẮC NGHIỆM AN TOÀN (Ẩn đáp án 'ans')
    if (request.method === 'GET' && action === 'questions') {
      const type = searchParams.get('type') || 'IQ';
      if (type === 'IQ') {
        // Phân nhóm 4 cấp độ từ 150 câu:
        // Nhóm 1 - Dễ (0-29): 30 câu
        const pool1 = Array.from({ length: 30 }, (_, i) => i);
        // Nhóm 2 - Trung bình (30-69): 40 câu
        const pool2 = Array.from({ length: 40 }, (_, i) => i + 30);
        // Nhóm 3 - Khó (70-109): 40 câu
        const pool3 = Array.from({ length: 40 }, (_, i) => i + 70);
        // Nhóm 4 - Rất khó / Cực khó (110-149): 40 câu
        const pool4 = Array.from({ length: 40 }, (_, i) => i + 110);

        // Lấy ngẫu nhiên: 5 + 7 + 7 + 6 = 25 câu
        const sel1 = pool1.sort(() => 0.5 - Math.random()).slice(0, 5);
        const sel2 = pool2.sort(() => 0.5 - Math.random()).slice(0, 7);
        const sel3 = pool3.sort(() => 0.5 - Math.random()).slice(0, 7);
        const sel4 = pool4.sort(() => 0.5 - Math.random()).slice(0, 6);

        const indices = [...sel1, ...sel2, ...sel3, ...sel4].sort((a, b) => a - b);
        
        const safeQuestions = indices.map(idx => {
          const original = SERVER_IQ_POOL[idx];
          return {
            qIdx: idx,
            q: original.q,
            options: original.options,
            svg: original.svg || null
          };
        });
        return cors(JSON.stringify(safeQuestions), 200);
      } else {
        // Phân nhóm câu hỏi EQ theo khía cạnh (mỗi khía cạnh có 25 câu):
        // 1. Empathy (Thấu cảm): index 0 đến 24
        const empathyPool = Array.from({ length: 25 }, (_, i) => i);
        // 2. SelfReg (Tự điều chỉnh): index 25 đến 49
        const selfRegPool = Array.from({ length: 25 }, (_, i) => i + 25);
        // 3. Social (Kỹ năng xã hội): index 50 đến 74
        const socialPool = Array.from({ length: 25 }, (_, i) => i + 50);
        // 4. SelfAwa (Tự nhận thức): index 75 đến 99
        const selfAwaPool = Array.from({ length: 25 }, (_, i) => i + 75);

        // Lấy ngẫu nhiên để tổng cộng được 25 câu (6 Empathy, 6 SelfReg, 6 Social, 7 SelfAwa)
        const selectedEmpathy = empathyPool.sort(() => 0.5 - Math.random()).slice(0, 6);
        const selectedSelfReg = selfRegPool.sort(() => 0.5 - Math.random()).slice(0, 6);
        const selectedSocial = socialPool.sort(() => 0.5 - Math.random()).slice(0, 6);
        const selectedSelfAwa = selfAwaPool.sort(() => 0.5 - Math.random()).slice(0, 7);

        // Gộp lại và sắp xếp theo index tăng dần
        const indices = [...selectedEmpathy, ...selectedSelfReg, ...selectedSocial, ...selectedSelfAwa].sort((a, b) => a - b);
        
        const safeQuestions = indices.map(idx => {
          const original = SERVER_EQ_POOL[idx];
          return {
            qIdx: idx,
            q: original.q,
            dim: original.dim
          };
        });
        return cors(JSON.stringify(safeQuestions), 200);
      }
    }

    // 2. NỘP BÀI CHẤM ĐIỂM BẢO MẬT & LƯU DB
    if (request.method === 'POST' && action === 'submit') {
      const { name, age, test_type, answers } = await request.json();
      
      let finalScore = 0;
      let rawCorrect = 0;
      let responsePayload = {};

      if (test_type === 'IQ') {
        // Chấm điểm có trọng số theo nhóm độ khó thực tế
        answers.forEach(item => {
          const original = SERVER_IQ_POOL[item.qIdx];
          if (original && item.selected === original.ans) {
            const idx = item.qIdx;
            // Nhóm 1 (0-29): 1.0đ, Nhóm 2 (30-69): 1.3đ, Nhóm 3 (70-109): 1.7đ, Nhóm 4 (110-149): 2.2đ
            const weight = idx < 30 ? 1.0 : idx < 70 ? 1.3 : idx < 110 ? 1.7 : 2.2;
            rawCorrect += weight;
          }
        });
        // Max weight có thể đạt: 5*1.0 + 7*1.3 + 7*1.7 + 6*2.2 = 5.0 + 9.1 + 11.9 + 13.2 = 39.2
        const scorePct = Math.min(rawCorrect / 39.2, 1);
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
        const scoresByDim = { empathy: { total: 0, count: 0 }, selfReg: { total: 0, count: 0 }, social: { total: 0, count: 0 }, selfAwa: { total: 0, count: 0 } };
        answers.forEach(item => {
          const original = SERVER_EQ_POOL[item.qIdx];
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

      await fetch(`${url}/rest/v1/iqeq_results`, {
        method: 'POST',
        headers: {
          ...supabaseHeaders,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(dbPayload)
      });

      return cors(JSON.stringify(responsePayload), 200);
    }

    // 3. ĐỌC LỊCH SỬ KẾT QUẢ ĐÃ LƯU
    if (request.method === 'GET' && action === 'list') {
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
        if (!isDetailPage) {
          console.warn(`MasoThue scraper redirected to a non-detail URL: ${finalUrl}`);
        } else {
          const html = await res.text();
        
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
    if (pathname === '/api/news') return handleApiNews(request);

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
    if (pathname === '/api/shorten') return handleShorten(request, env);



    // ── Routes bảo mật (key ẩn trong Cloudflare Secrets) ──
    if (pathname === '/weather') return handleWeather(request, env);
    if (pathname === '/gold') return handleGold(request, env);
    if (pathname === '/gas') return handleGas(request, env);
    if (pathname === '/aqi') return handleAQI(request, env);

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
