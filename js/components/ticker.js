/**
 * components/ticker.js
 * Builds and updates the scrolling ticker tape.
 */

import { fmtPrice, changeClass } from '../utils/formatters.js';
import { state, CONFIG }        from '../store/state.js';

const GAS_ITEMS = [
  { label: '⛽ RON95-III', val: '21.470₫/lít' },
  { label: '⛽ E5 RON92',  val: '20.920₫/lít' },
];

/**
 * Rebuild the ticker track content from the latest crypto + FX state.
 */
export function renderTicker() {
  const items = [];

  // ── Crypto prices (first 8 coins) ──
  for (const c of state.cryptoData.slice(0, 8)) {
    const chg  = c.price_change_percentage_24h ?? 0;
    const sign = chg >= 0 ? '+' : '';
    const cls  = chg >= 0 ? 'up' : 'dn';
    items.push(
      `<span class="ticker-item">` +
        `<span class="symbol">${c.symbol.toUpperCase()}</span> ` +
        `<span class="val">${fmtPrice(c.current_price)}</span> ` +
        `<span class="${cls}">${sign}${chg.toFixed(2)}%</span>` +
      `</span>`
    );
  }

  // ── FX rates ──
  for (const { cur, rateToVnd } of state.fxData.slice(0, 4)) {
    if (!rateToVnd) continue;
    items.push(
      `<span class="ticker-item">` +
        `<span class="symbol">${cur}/VND</span> ` +
        `<span class="val">${Math.round(rateToVnd).toLocaleString('vi-VN')}₫</span>` +
      `</span>`
    );
  }

  // ── Static gas (always shown) ──
  for (const g of GAS_ITEMS) {
    items.push(
      `<span class="ticker-item">` +
        `<span class="symbol">${g.label}</span> ` +
        `<span class="val">${g.val}</span>` +
      `</span>`
    );
  }

  // ── Gold placeholder ──
  if (state.goldData?.price) {
    items.push(
      `<span class="ticker-item">` +
        `<span class="symbol">🏅 VÀNG</span> ` +
        `<span class="val">$${state.goldData.price.toLocaleString('en-US')}/oz</span>` +
      `</span>`
    );
  }

  const html = items.join('');
  // Duplicate for seamless infinite scroll
  const track = document.getElementById('tickerTrack');
  if (track) track.innerHTML = html + html;
}
