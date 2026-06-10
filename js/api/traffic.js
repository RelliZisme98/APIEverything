/**
 * api/traffic.js
 * Traffic violation lookup (phạt nguội) for Vietnam.
 *
 * Strategy:
 *   1. Cloudflare Worker proxy (https://phatnguoi-proxy.*.workers.dev)
 *      → Bypasses CORS on production domains
 *   2. Direct phatnguoi.vn (works on localhost if CORS not enforced)
 *   3. Fallback → show links to official sites
 *
 * HOW TO CONFIGURE PROXY:
 *   Deploy cloudflare-worker/phatnguoi-proxy.js to Cloudflare Workers,
 *   then set your Worker URL in config.js:
 *     TRAFFIC_PROXY_URL: 'https://phatnguoi-proxy.YOUR_SUBDOMAIN.workers.dev'
 */

import APP_CONFIG from '../../config.js';

/**
 * Worker proxy URL — read from config.js.
 * Empty string means "try direct API then fallback to links".
 */
const PROXY_URL = APP_CONFIG.TRAFFIC_PROXY_URL?.trim() || '';
const DIRECT_URL = 'https://api.phatnguoi.vn/phat-nguoi';

/**
 * Lookup traffic violations by license plate.
 * @param {string} plate       – Biển số xe (e.g. "51F-123.45" or "51F12345")
 * @param {string} vehicleType – "car" | "motorbike"
 * @returns {Promise<{success, data, error, links, source}>}
 */
export async function lookupTrafficViolation(plate, vehicleType = 'car') {
  const normalised = plate.replace(/[\s.\-]/g, '').toUpperCase();
  const links = buildLinks(plate, vehicleType);

  // ── Attempt 1: Cloudflare Worker proxy (if configured) ──
  if (PROXY_URL) {
    try {
      const res = await fetch(`${PROXY_URL}/phat-nguoi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bien_so: normalised }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && (json.data || json.result)) {
          return {
            success: true,
            data: json.data || json.result || [],
            links,
            source: 'proxy',
          };
        }
        // API responded but no violations found
        if (json && json.data !== undefined) {
          return { success: true, data: [], links, source: 'proxy' };
        }
      }
    } catch (e) {
      console.warn('[Traffic] Proxy failed:', e.message);
    }
  }

  // ── Attempt 2: Direct API (may work on localhost) ──
  try {
    const res = await fetch(DIRECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bien_so: normalised }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const json = await res.json();
      if (json && (json.data !== undefined || json.result !== undefined)) {
        return {
          success: true,
          data: json.data || json.result || [],
          links,
          source: 'direct',
        };
      }
    }
  } catch (e) {
    console.info('[Traffic] Direct API unavailable (CORS expected on production).');
  }

  // ── Fallback: return links only ──
  return { success: false, data: [], error: 'cors', links, source: 'fallback' };
}

/**
 * Build direct lookup links for official and third-party sites.
 */
function buildLinks(plate, vehicleType) {
  const encoded = encodeURIComponent(plate.replace(/[\s]/g, ''));
  return [
    {
      name:  '🏛️ Cổng CSGT (Chính thức)',
      url:   `https://www.csgt.vn/tra-cuu-phuong-tien-vi-pham.html`,
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
