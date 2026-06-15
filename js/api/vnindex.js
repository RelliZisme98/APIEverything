/**
 * api/vnindex.js — Vietnam Stock Market
 * - Stocks (VCB, HPG...): VPS direct (CORS * confirmed) → works from browser
 * - Index (VNINDEX...): VPS doesn't expose index via getliststockdata → use Cloudflare proxy
 */
import APP_CONFIG from '../../config.js';

const VPS   = 'https://bgapidatafeed.vps.com.vn';
const PROXY = (APP_CONFIG.TRAFFIC_PROXY_URL || 'https://everything.rellia.org') + '/vnindex';

/** Fetch market indices. Requires Cloudflare proxy to be deployed. */
export async function fetchVNIndex() {
  try {
    const res = await fetch(`${PROXY}?type=index`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Handle new wrapper format { indices, marketStatus, timestamp }
    if (data && Array.isArray(data.indices)) {
      return { indices: data.indices, marketStatus: data.marketStatus ?? 'unknown' };
    }
    // Legacy: direct array
    if (Array.isArray(data) && data.length) {
      return { indices: data, marketStatus: 'unknown' };
    }
    return { indices: [], marketStatus: 'unknown' };
  } catch (err) {
    console.warn('[VNIndex] proxy unavailable:', err.message);
    return null;
  }
}

/** Fetch top bluechip stocks — calls VPS directly (CORS * allowed) */
export async function fetchTopStocks() {
  const symbols = 'VCB,BID,CTG,TCB,VPB,MBB,HPG,VIC,VHM,VNM,MSN,SAB,GAS,PLX,FPT';
  try {
    const res = await fetch(`${VPS}/getliststockdata/${symbols}`, {
      headers: { 'Referer': 'https://banggia.vps.com.vn/' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) && data.length ? data : null;
  } catch (err) {
    console.warn('[TopStocks]', err.message);
    return null;
  }
}
