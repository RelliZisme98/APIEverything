/**
 * api/crypto.js
 * Fetches live cryptocurrency data from the CoinGecko public API.
 * No API key required. Rate limit: ~30 req/min on the free tier.
 */

import { CONFIG, state } from '../store/state.js';

const BASE_URL = '/api/crypto';

/**
 * Fetch market data for the configured coin list.
 * @returns {Promise<Array>} Array of coin market objects
 */
export async function fetchCryptoMarkets() {
  const ids = CONFIG.cryptoIds.join(',');
  const url =
    `${BASE_URL}` +
    `?path=coins/markets` +
    `&vs_currency=usd` +
    `&ids=${ids}` +
    `&order=market_cap_desc` +
    `&per_page=15&page=1` +
    `&sparkline=true` +
    `&price_change_percentage=24h,7d`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

  const data = await res.json();
  state.cryptoData = data;
  return data;
}

/**
 * Fetch global crypto market stats.
 * @returns {Promise<Object>}
 */
export async function fetchGlobalStats() {
  const res = await fetch(`${BASE_URL}?path=global`);
  if (!res.ok) throw new Error(`CoinGecko global HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}
