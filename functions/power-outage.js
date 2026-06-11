/**
 * Cloudflare Pages Function — CORS Proxy cho EVNSPC Lịch Cúp Điện
 * Endpoint: GET /power-outage?action=...&params...
 *
 * Vì EVNSPC dùng Incapsula WAF, ta cần proxy qua Cloudflare để:
 * 1. Không bị CORS block
 * 2. Gửi headers giả lập browser hợp lệ
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const BROWSER_HEADERS = {
  'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language':  'vi-VN,vi;q=0.9,en-US;q=0.8',
  'Referer':          'https://cskh.evnspc.vn/TraCuu/LichNgungGiamCungCapDien',
  'X-Requested-With': 'XMLHttpRequest',
};

/** CORS preflight */
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /power-outage?action=danhsach&pMA_DVICTREN=PB01
 * GET /power-outage?action=tracuu&madvi=PB0101&tuNgay=01-06-2026&denNgay=30-06-2026
 */
export async function onRequestGet({ request }) {
  const url    = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    let upstreamUrl;

    if (action === 'danhsach') {
      // Lấy danh sách điện lực con theo mã đơn vị cha
      const maDviCha = url.searchParams.get('pMA_DVICTREN') || '';
      upstreamUrl = `https://cskh.evnspc.vn/TraCuu/GetDanhMucDienLuc?pMA_DVICTREN=${encodeURIComponent(maDviCha)}`;

    } else if (action === 'tracuu') {
      // Tra cứu lịch cúp điện theo mã đơn vị
      const madvi    = url.searchParams.get('madvi')    || '';
      const tuNgay   = url.searchParams.get('tuNgay')   || '';
      const denNgay  = url.searchParams.get('denNgay')  || '';
      upstreamUrl = `https://cskh.evnspc.vn/TraCuu/GetThongTinLichNgungGiamCungCapDien?madvi=${encodeURIComponent(madvi)}&tuNgay=${encodeURIComponent(tuNgay)}&denNgay=${encodeURIComponent(denNgay)}&ChucNang=MaDonVi`;

    } else if (action === 'tracuu-makh') {
      // Tra cứu theo mã khách hàng
      const maKH    = url.searchParams.get('maKH')    || '';
      const tuNgay  = url.searchParams.get('tuNgay')  || '';
      const denNgay = url.searchParams.get('denNgay') || '';
      upstreamUrl = `https://cskh.evnspc.vn/TraCuu/GetThongTinLichNgungGiamCungCapDien?maKH=${encodeURIComponent(maKH)}&tuNgay=${encodeURIComponent(tuNgay)}&denNgay=${encodeURIComponent(denNgay)}&ChucNang=MaKhachHang`;

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use: danhsach | tracuu | tracuu-makh' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
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
        'Cache-Control': 'public, max-age=300', // cache 5 phút
        ...CORS_HEADERS,
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status:  502,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

/** Health check */
export async function onRequestPost() {
  return new Response(JSON.stringify({ status: 'ok', service: 'power-outage-proxy' }), {
    status:  200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
