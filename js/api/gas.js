/**
 * api/gas.js — Vietnam retail fuel prices via worker proxy
 */
import { state } from '../store/state.js';

export async function fetchGasPrice() {
  try {
    const res = await fetch('/gas');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && json.prices) {
      state.gasData = {
        prices: json.prices,
        priceDate: json.priceDate,
        source: json.source || 'Petrolimex API',
        lastUpdated: new Date().toISOString()
      };
      return state.gasData;
    }
    throw new Error('API returned unsuccessful response');
  } catch (err) {
    console.warn('[Gas API] Dynamic fetch failed, using fallback:', err.message);
    return null;
  }
}
