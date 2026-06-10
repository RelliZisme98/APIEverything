/**
 * api/traffic.js
 * Traffic violation lookup (phạt nguội) for Vietnam.
 */

import APP_CONFIG from '../../config.js';

const PROXY_URL  = APP_CONFIG.TRAFFIC_PROXY_URL?.trim().replace(/\/$/, '') || '';
const DIRECT_URL = 'https://api.phatnguoi.vn/phat-nguoi';

export async function lookupTrafficViolation(plate, vehicleType = 'car') {
  const normalised = plate.replace(/[\s.\-]/g, '').toUpperCase();
  const links      = buildLinks(plate, vehicleType);

  console.log('[Traffic] plate:', normalised, '| proxy:', PROXY_URL || 'none');

  // ── Attempt: via proxy ──
  const endpoint = PROXY_URL ? `${PROXY_URL}/phat-nguoi` : DIRECT_URL;

  let apiUnavailable = false;

  try {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bien_so: normalised }),
      signal:  AbortSignal.timeout(10000),
    });

    console.log('[Traffic] response status:', res.status, 'from', endpoint);

    if (res.ok) {
      let json;
      try { json = await res.json(); } catch { /* not JSON */ }

      console.log('[Traffic] response body:', JSON.stringify(json)?.slice(0, 200));

      if (json) {
        // Handle array response
        if (Array.isArray(json)) {
          return { success: true, data: json, links, source: 'api' };
        }
        // Handle { data: [...] } or { result: [...] } 
        const data = json.data ?? json.result ?? json.violations ?? json.items;
        if (data !== undefined) {
          return { success: true, data: Array.isArray(data) ? data : [], links, source: 'api' };
        }
        // Health check response or unknown format — treat as no violations
        if (json.status === 'ok' || json.message) {
          return { success: true, data: [], links, source: 'api' };
        }
      }
      // Got 200 but unparseable — treat as no violations
      return { success: true, data: [], links, source: 'api' };
    }

    console.warn('[Traffic] non-OK status from proxy:', res.status);
    if (PROXY_URL) {
      apiUnavailable = true;
    }
  } catch (e) {
    console.warn('[Traffic] fetch error:', e.message);
    if (PROXY_URL) {
      apiUnavailable = true;
    }
  }

  // ── If proxy was used but failed, try direct (may be CORS on prod) ──
  if (PROXY_URL) {
    try {
      const res = await fetch(DIRECT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bien_so: normalised }),
        signal:  AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json?.data ?? json?.result ?? [];
        return { success: true, data: Array.isArray(data) ? data : [], links, source: 'direct' };
      }
    } catch { /* CORS expected on production */ }
  }

  return { success: false, data: [], error: apiUnavailable ? 'api_unavailable' : 'cors', links, source: 'fallback' };
}

function buildLinks(plate, vehicleType) {
  const encoded = encodeURIComponent(plate.replace(/[\s]/g, ''));
  return [
    {
      name:  '🏛️ Cổng CSGT (Chính thức)',
      url:   'https://www.csgt.vn/tra-cuu-phuong-tien-vi-pham.html',
      note:  'Trang chính thức của Cảnh sát giao thông',
      badge: 'official',
    },
    {
      name:  '🔍 PhatNguoi.vn',
      url:   `https://phatnguoi.vn/?bsx=${encoded}`,
      note:  'Tổng hợp dữ liệu phạt nguội toàn quốc',
      badge: 'third-party',
    },
    {
      name:  '📱 iCSGT (App)',
      url:   'https://iCSGT.vn',
      note:  'Ứng dụng tra cứu chính thức của CSGT',
      badge: 'official',
    },
  ];
}
