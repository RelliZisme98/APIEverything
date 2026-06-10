/**
 * components/crypto-table.js
 * Renders the detailed top-15 crypto data table.
 */

import { fmtPrice, fmtCap, pctHtml } from '../utils/formatters.js';

/**
 * @param {Array}  coins   – CoinGecko market objects
 * @param {string} tbodyId – DOM id of the <tbody>
 */
export function renderCryptoTable(coins, tbodyId = 'cryptoTableBody') {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = coins.map((c, i) => {
    const chg24 = c.price_change_percentage_24h;
    const chg7  = c.price_change_percentage_7d_in_currency;

    return `
      <tr>
        <td class="ct-rank">${i + 1}</td>
        <td>
          <div class="ct-coin">
            <img src="${c.image}" width="22" height="22" loading="lazy" />
            <div>
              <div class="ct-coin-name">${c.name}</div>
              <div class="ct-coin-sym">${c.symbol.toUpperCase()}</div>
            </div>
          </div>
        </td>
        <td class="ct-num">${fmtPrice(c.current_price)}</td>
        <td class="ct-num">${pctHtml(chg24)}</td>
        <td class="ct-num">${pctHtml(chg7)}</td>
        <td class="ct-num-sm">${fmtCap(c.market_cap)}</td>
        <td class="ct-num-sm">${fmtCap(c.total_volume)}</td>
      </tr>
    `;
  }).join('');
}
