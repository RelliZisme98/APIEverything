/**
 * components/gas.js
 * Renders the Vietnam gas price list from static data.
 */

import { GAS_PRICES, GAS_UPDATED, GAS_SOURCE } from '../data/gas-prices.js';

/**
 * @param {string} gridId   – container for the gas items
 * @param {string} noteId   – element for the updated note
 */
export function renderGas(gridId = 'gasGrid', noteId = 'gasUpdated') {
  const grid = document.getElementById(gridId);
  const note = document.getElementById(noteId);

  if (grid) {
    grid.innerHTML = GAS_PRICES.map(g => `
      <div class="gas-item">
        <div class="gas-left">
          <div class="gas-dot" style="background:${g.color};box-shadow:0 0 8px ${g.color}44;"></div>
          <div>
            <div class="gas-name">${g.name}</div>
            <div class="gas-sub">${g.sub}</div>
          </div>
        </div>
        <div class="gas-right">
          <div class="gas-price-val" style="color:${g.color};">
            ${g.price.toLocaleString('vi-VN')}₫
          </div>
          <div class="gas-price-unit">/${g.unit}</div>
        </div>
      </div>
    `).join('');
  }

  if (note) {
    note.textContent = `📋 Theo ${GAS_SOURCE} – Kỳ điều hành ${GAS_UPDATED}`;
  }
}
