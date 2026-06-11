/**
 * functions/vnindex.js
 * Cloudflare Pages Function — proxy VPS stock data to bypass CORS
 * URL: /vnindex?type=index   → index data (VNINDEX, VN30, HNX...)
 * URL: /vnindex?type=stocks  → top bluechip stocks
 * URL: /vnindex?type=custom&symbols=VCB,HPG,FPT
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

  const url    = new URL(request.url);
  const type   = url.searchParams.get('type') ?? 'index';
  const custom = url.searchParams.get('symbols') ?? '';

  const VPS_BASE = 'https://bgapidatafeed.vps.com.vn';

  let targetUrl;
  if (type === 'stocks') {
    targetUrl = `${VPS_BASE}/getliststockdata/VCB,BID,CTG,TCB,VPB,MBB,HPG,VIC,VHM,VNM,MSN,SAB,GAS,PLX,FPT`;
  } else if (type === 'custom' && custom) {
    targetUrl = `${VPS_BASE}/getliststockdata/${encodeURIComponent(custom)}`;
  } else {
    // Index: VNINDEX lives at a special endpoint on VPS
    targetUrl = `${VPS_BASE}/getliststockdata/VNINDEX,VN30,HNXINDEX,UPINDEX`;
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://banggia.vps.com.vn/',
        'Origin': 'https://banggia.vps.com.vn',
      },
    });

    const text = await res.text();

    return new Response(text, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': origin,
        'Cache-Control': 'public, max-age=30', // cache 30s for stock data
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
    });
  }
}
