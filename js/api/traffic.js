/**
 * api/traffic.js
 * Traffic violation lookup (phạt nguội) for Vietnam.
 *
 * Strategy:
 *   1. Try phatnguoi.vn API (no key, may have CORS)
 *   2. On failure → provide direct links to official sites
 */

/**
 * Lookup traffic violations by license plate.
 * @param {string} plate     – Biển số xe (e.g. "51F-123.45" or "51F12345")
 * @param {string} vehicleType – "car" | "motorbike"
 * @returns {Promise<{success, data, error, links}>}
 */
export async function lookupTrafficViolation(plate, vehicleType = 'car') {
  // Normalise plate (remove spaces, dots)
  const normalised = plate.replace(/[\s.-]/g, '').toUpperCase();

  // ── Attempt 1: phatnguoi.vn unofficial API ──
  try {
    const res = await fetch('https://api.phatnguoi.vn/phat-nguoi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bien_so: normalised }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const json = await res.json();
      // phatnguoi.vn returns { data: [...] } or { message: "..." }
      if (json && (json.data || json.result)) {
        const violations = json.data || json.result || [];
        return { success: true, data: violations, links: buildLinks(plate, vehicleType) };
      }
    }
  } catch (e) {
    // CORS or network error — fall through
    console.info('[Traffic] Primary API unavailable, using fallback links.');
  }

  // ── Attempt 2: csgt.vn public query (CORS likely blocked, catch silently) ──
  try {
    const url = `https://www.csgt.vn/tra-cuu-phuong-tien-vi-pham.html?bsx=${encodeURIComponent(normalised)}`;
    // We can't read the response due to CORS, but the URL is valid for opening
  } catch { /* ignore */ }

  // ── Fallback: return links only ──
  return {
    success: false,
    data: [],
    error: 'cors',
    links: buildLinks(plate, vehicleType),
  };
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
