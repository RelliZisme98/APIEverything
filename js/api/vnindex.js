/**
 * api/vnindex.js — Vietnam Stock Market via Cloudflare Function proxy → VPS
 * Proxy deployed at: everything.rellia.org/vnindex
 */
import APP_CONFIG from '../../config.js';

const PROXY = (APP_CONFIG.TRAFFIC_PROXY_URL || 'https://everything.rellia.org') + '/vnindex';

/** Fetch index data: VNINDEX, VN30, HNXINDEX, UPCOM */
export async function fetchVNIndex() {
  try {
    const res = await fetch(`${PROXY}?type=index`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (err) {
    console.warn('[VNIndex]', err);
    return null;
  }
}

/** Fetch top Vietnamese stocks */
export async function fetchTopStocks() {
  try {
    const res = await fetch(`${PROXY}?type=stocks`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (err) {
    console.warn('[TopStocks]', err);
    return null;
  }
}
