/**
 * components/market-stats.js
 * Renders the global crypto market statistics panel.
 */

import { fmtCap } from '../utils/formatters.js';

/**
 * @param {Array}  coins       – CoinGecko market objects
 * @param {string} containerId – DOM id of the stats container
 */
export function renderMarketStats(coins, containerId = 'marketStats') {
  const el = document.getElementById(containerId);
  if (!el) return;

  const totalCap = coins.reduce((s, c) => s + (c.market_cap || 0), 0);
  const btc      = coins.find(c => c.id === 'bitcoin');
  const eth      = coins.find(c => c.id === 'ethereum');
  const btcDom   = btc ? ((btc.market_cap / totalCap) * 100).toFixed(1) : '—';
  const ethBtc   = btc && eth ? (eth.current_price / btc.current_price).toFixed(5) : '—';

  // Deterministic fear index based on average 24h change (not random)
  const avgChg   = coins.reduce((s, c) => s + (c.price_change_percentage_24h || 0), 0) / coins.length;
  const rawFear  = Math.round(50 + avgChg * 2);
  const fearVal  = Math.max(0, Math.min(100, rawFear));
  const fearLabel =
    fearVal < 25 ? '😨 Sợ hãi cực độ' :
    fearVal < 45 ? '😟 Sợ hãi' :
    fearVal < 55 ? '😐 Trung lập' :
    fearVal < 75 ? '😊 Tham lam' :
                   '🤑 Tham lam cực độ';

  const rows = [
    { label: '🌐 Tổng Vốn Hóa Crypto',       val: fmtCap(totalCap) },
    { label: '🟠 BTC Dominance',               val: btcDom + '%' },
    { label: '🔷 ETH / BTC',                   val: ethBtc },
    { label: '📊 Fear & Greed (ước tính)',      val: `${fearVal} · ${fearLabel}` },
    { label: '🏆 Đang theo dõi',               val: `${coins.length} coin` },
    { label: '⏱️ Cập nhật lúc',                val: new Date().toLocaleTimeString('vi-VN') },
  ];

  el.innerHTML = rows.map(r => `
    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
      <span style="font-size:12px;color:var(--text-secondary);">${r.label}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                   font-weight:500;color:var(--accent-cyan);">${r.val}</span>
    </div>
  `).join('');
}
