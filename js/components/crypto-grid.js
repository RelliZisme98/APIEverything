/**
 * components/crypto-grid.js
 * Renders the top-10 crypto card grid.
 */

import { fmtPrice, fmtCap, changeClass } from '../utils/formatters.js';

/**
 * @param {Array}  coins     – CoinGecko market objects
 * @param {string} containerId – DOM id of the grid container
 */
export function renderCryptoGrid(coins, containerId = 'cryptoGrid') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = coins.slice(0, 10).map(c => {
    const chg   = c.price_change_percentage_24h ?? 0;
    const sign  = chg >= 0 ? '+' : '';
    const cls   = changeClass(chg);
    const isActive = window.activeCryptoId === c.id;
    const activeCls = isActive ? 'active' : '';

    return `
      <div class="crypto-item animate-fade-in-up ${activeCls}" onclick="window.selectCrypto('${c.id}')" style="cursor: pointer;">
        <div class="crypto-top">
          <div class="crypto-name">
            <img class="crypto-icon" src="${c.image}" alt="${c.symbol}" loading="lazy" />
            <div>
              <div class="crypto-sym">${c.symbol.toUpperCase()}</div>
              <div class="crypto-fullname">${c.name}</div>
            </div>
          </div>
          <span class="crypto-change ${cls}">${sign}${chg.toFixed(2)}%</span>
        </div>
        <div class="crypto-price">${fmtPrice(c.current_price)}</div>
        <div class="crypto-vol">Vol: ${fmtCap(c.total_volume)}</div>
      </div>
    `;
  }).join('');
}
