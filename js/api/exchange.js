/**
 * api/exchange.js
 * Fetches foreign exchange rates from Frankfurter (ECB) with open.er-api.com fallback.
 * Both are completely free, no API key required.
 *
 * Key feature: USD/VND is fetched LIVE and overwrites the config.js fallback.
 * This means gold prices and all VND conversions use the real-time rate.
 */

import { CONFIG, state } from '../store/state.js';

const FRANKFURTER_URL = '/api/exchange';
const OPENEX_URL      = '/api/exchange?from=USD'; // proxied to open.er-api.com

/** Metadata for each currency: flag emoji + full name */
export const FX_META = {
 USD: { flag: '', name: 'Đô la Mỹ' },
 EUR: { flag: '', name: 'Euro' },
 JPY: { flag: '', name: 'Yên Nhật' },
 CNY: { flag: '', name: 'Nhân dân tệ' },
 GBP: { flag: '', name: 'Bảng Anh' },
 KRW: { flag: '', name: 'Won Hàn Quốc' },
 SGD: { flag: '', name: 'Đô Singapore' },
 THB: { flag: '', name: 'Baht Thái' },
 AUD: { flag: '', name: 'Đô Úc' },
 HKD: { flag: '', name: 'Đô Hong Kong' },
 VND: { flag: '', name: 'Đồng Việt Nam' }, // used internally for live rate
};

/**
 * Fetch latest rates from USD base and compute → VND cross rates.
 *
 * Strategy:
 *   1. Frankfurter (ECB) + separate VND fetch from open.er-api
 *      (Frankfurter may not carry VND, so we always get VND from open.er-api)
 *   2. open.er-api.com as full fallback — carries VND natively
 *
 * Side-effect: CONFIG.usdToVnd is updated with the live USD/VND rate.
 *
 * @returns {Promise<Array<{cur, rateToVnd, source, liveVnd}>>}
 */
export async function fetchExchangeRates() {
  // ── Always fetch live USD/VND first (open.er-api has it, Frankfurter may not) ──
  // We do this in parallel with the main FX fetch
  const [fxResult, vndRate] = await Promise.allSettled([
    _fetchFxRates(),
    _fetchLiveVnd(),
  ]);

  // Update CONFIG.usdToVnd with live rate if we got one
  if (vndRate.status === 'fulfilled' && vndRate.value) {
    CONFIG.usdToVnd = vndRate.value;
    state.usdToVndLive = vndRate.value;
    console.info(`[FX] Live USD/VND: ${vndRate.value.toLocaleString('vi-VN')} ₫`);
  }

  // Return FX rows (they'll now use the updated CONFIG.usdToVnd)
  if (fxResult.status === 'fulfilled') {
    return fxResult.value;
  }
  throw fxResult.reason;
}

/**
 * Fetch the main FX rates table.
 * @private
 */
async function _fetchFxRates() {
  // Filter out USD (can't be in both from= and to=) and VND (shown separately)
  const nonUsdCurrencies = CONFIG.fxCurrencies.filter(c => c !== 'USD' && c !== 'VND');
  const symbols = nonUsdCurrencies.join(',');

  // ── Strategy 1: Frankfurter (ECB) ──
  try {
    const res = await fetch(
      `${FRANKFURTER_URL}?from=USD&to=${symbols}`,
      { signal: AbortSignal.timeout(7000) }
    );

    if (res.ok) {
      const json  = await res.json();
      const rates = json.rates;
      if (rates && Object.keys(rates).length > 0) {
        return buildRows(rates, 'Frankfurter (ECB)');
      }
    }
    console.warn('[FX] Frankfurter non-OK, trying fallback...');
  } catch (e) {
    console.warn('[FX] Frankfurter failed:', e.message, '— trying fallback...');
  }

  // ── Strategy 2: open.er-api.com ──
  const res = await fetch(OPENEX_URL, { signal: AbortSignal.timeout(7000) });
  if (res.ok) {
    const json  = await res.json();
    const rates = json.rates;
    if (rates && Object.keys(rates).length > 0) {
      return buildRows(rates, 'ExchangeRate API');
    }
  }
  throw new Error('Both exchange rate APIs failed');
}

/**
 * Fetch live USD/VND rate from open.er-api.
 * open.er-api carries VND reliably; Frankfurter (ECB) may not.
 * Returns null on failure — CONFIG.usdToVnd keeps its config.js fallback.
 * @private
 * @returns {Promise<number|null>}
 */
async function _fetchLiveVnd() {
  try {
    const res = await fetch(OPENEX_URL, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;
    const json = await res.json();
    const vnd  = json?.rates?.VND;
    return vnd ? Math.round(vnd) : null;
  } catch {
    return null;
  }
}

/**
 * Build display rows from a rates map (all relative to 1 USD).
 * Uses CONFIG.usdToVnd — which by the time this runs has been updated live.
 * @param {Object} rates  – { EUR: 0.92, JPY: 149.3, ... }
 * @param {string} source – label for the data source
 */
function buildRows(rates, source) {
  const rows = CONFIG.fxCurrencies
    .filter(cur => cur !== 'USD' && cur !== 'VND')
    .map(cur => {
      // 1 USD = rates[cur] units of cur  →  1 cur = (1/rates[cur]) USD = ... VND
      const rateToVnd = rates[cur]
        ? (1 / rates[cur]) * CONFIG.usdToVnd
        : null;
      return { cur, rateToVnd, source };
    });

  // Prepend USD (always exact — the base rate)
  rows.unshift({ cur: 'USD', rateToVnd: CONFIG.usdToVnd, source });

  state.fxData = rows;
  return rows;
}
