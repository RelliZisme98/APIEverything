/**
 * api/gold.js
 * Fetches live gold spot price (XAU/USD).
 *
 * Strategy (cascading fallback):
 *   1. metals.live  – free, no key needed
 *   2. GoldAPI.io   – free tier (100 req/day) — needs key from state.goldKey
 *   3. Static stub  – always works, returns last-known approximate price
 */

import { state, CONFIG } from '../store/state.js';

/**
 * Fetch the current XAU/USD spot price.
 * @returns {Promise<{price: number, source: string}>}
 */
export async function fetchGoldPrice() {
  // ── Strategy 1: metals.live (free, no key) ──
  try {
    const res  = await fetch('https://api.metals.live/v1/spot');
    if (res.ok) {
      const data = await res.json();
      const price = extractGoldPrice(data);
      if (price) {
        state.goldData = { price, source: 'metals.live' };
        return state.goldData;
      }
    }
  } catch { /* fall through */ }

  // ── Strategy 2: GoldAPI.io (needs key) ──
  if (state.goldKey) {
    try {
      const res = await fetch('https://www.goldapi.io/api/XAU/USD', {
        headers: { 'x-access-token': state.goldKey, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const d = await res.json();
        if (d.price) {
          state.goldData = { price: d.price, source: 'goldapi.io' };
          return state.goldData;
        }
      }
    } catch { /* fall through */ }
  }

  // ── Strategy 3: Static fallback ──
  const fallback = { price: null, source: 'fallback' };
  state.goldData = fallback;
  return fallback;
}

/**
 * Parse metals.live response (array or object format).
 * @param {any} data
 * @returns {number|null}
 */
function extractGoldPrice(data) {
  if (Array.isArray(data)) {
    for (const entry of data) {
      const price = entry?.gold ?? entry?.XAU;
      if (price) return parseFloat(price);
    }
  } else if (data && typeof data === 'object') {
    return parseFloat(data.gold || data.XAU) || null;
  }
  return null;
}

/**
 * Compute Vietnam-localised gold metrics from XAU/USD spot price.
 * @param {number} xauUsd
 * @returns {{ xauVnd, perChiVnd, sjcPerChiVnd }}
 */
export function computeGoldVnd(xauUsd) {
  const xauVnd = xauUsd * CONFIG.usdToVnd;
  // 1 troy oz = 31.1035 g | 1 chỉ = 3.75 g
  const gramsPerOz  = 31.1035;
  const gramsPerChi = 3.75;
  const perChiVnd   = Math.round((xauVnd / gramsPerOz) * gramsPerChi);
  // SJC trades at ~5 % premium over international spot
  const sjcPerChiVnd = Math.round(perChiVnd * 1.05);
  return { xauVnd: Math.round(xauVnd), perChiVnd, sjcPerChiVnd };
}
