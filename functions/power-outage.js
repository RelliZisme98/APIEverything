/**
 * Cloudflare Pages Function — CORS Proxy cho EVN Lịch Cúp Điện
 * Endpoint: GET /power-outage?evn=...&action=...
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
  'X-Requested-With': 'XMLHttpRequest',
};

function todayVN() {
  const ict = new Date(Date.now() + 7 * 60 * 60 * 1000); // UTC + 7h
  const y = ict.getUTCFullYear();
  const m = String(ict.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ict.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const evn = url.searchParams.get('evn') ?? 'spc'; // spc | hanoi | cpc | npc

  const headers = { ...BROWSER_HEADERS };

  try {
    // ── EVNSPC (Miền Nam) ──────────────────────────────────────────────
    if (evn === 'spc') {
      headers['Referer'] = 'https://cskh.evnspc.vn/TraCuu/LichNgungGiamCungCapDien';
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
        const today = todayVN();
        const [yy, mm, dd] = today.split('-');
        const tuNgay = `${dd}-${mm}-${yy}`;
        upstreamUrl = `https://cskh.evnspc.vn/TraCuu/GetThongTinLichNgungGiamCungCapDien?madvi=&tuNgay=${encodeURIComponent(tuNgay)}&denNgay=${encodeURIComponent(tuNgay)}&ChucNang=MaDonVi`;
      } else {
        return new Response(JSON.stringify({ error: 'Invalid action. Use: danhsach | tracuu | tracuu-makh | today' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      const upstream = await fetch(upstreamUrl, { method: 'GET', headers });
      const html = await upstream.text();
      return new Response(html, {
        status: upstream.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          ...CORS_HEADERS,
        },
      });
    }

    // ── EVNHANOI (Hà Nội) ──────────────────────────────────────────────
    if (evn === 'hanoi') {
      headers['Referer'] = 'https://evnhanoi.vn/';
      headers['Origin']  = 'https://evnhanoi.vn';
      let upstreamUrl, body, method = 'POST';

      if (action === 'tracuu') {
        const keyword  = url.searchParams.get('keyword')  || '';
        const fromDate = url.searchParams.get('fromDate') || '';
        const toDate   = url.searchParams.get('toDate')   || '';
        upstreamUrl = 'https://evnhanoi.vn/api/TraCuu/LichCatDien';
        body = JSON.stringify({ ngayBatDau: fromDate, ngayKetThuc: toDate, maDViQly: '', maTram: '', key: keyword });
      } else if (action === 'today') {
        const today = todayVN();
        upstreamUrl = 'https://evnhanoi.vn/api/TraCuu/LichCatDien';
        body = JSON.stringify({ ngayBatDau: today, ngayKetThuc: today, maDViQly: '', maTram: '', key: '' });
      } else {
        return new Response(JSON.stringify({ error: 'Invalid action. Use: tracuu | today' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      const upstream = await fetch(upstreamUrl, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body,
      });
      const respBody = await upstream.text();
      return new Response(respBody, {
        status: upstream.status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          ...CORS_HEADERS,
        },
      });
    }

    // ── EVNCPC (Miền Trung & Tây Nguyên) ──────────────────────────────
    if (evn === 'cpc') {
      headers['Referer'] = 'https://cskh.cpc.vn/';
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

      const upstream = await fetch(upstreamUrl, { headers: { ...headers, 'Accept': 'application/json' } });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          ...CORS_HEADERS,
        },
      });
    }

    // ── EVNNPC (27 tỉnh Miền Bắc) ──────────────────────────────────────
    if (evn === 'npc') {
      headers['Referer'] = 'https://cskh.npc.com.vn/';
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

      const upstream = await fetch(upstreamUrl, { headers });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          ...CORS_HEADERS,
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown EVN unit. Use: spc | hanoi | cpc | npc' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
