/**
 * components/exchange.js
 * Renders the foreign exchange rate table.
 */

import { FX_META } from '../api/exchange.js';

/**
 * @param {Array<{cur, rateToVnd, source}>} rows
 * @param {string} tbodyId
 */
export function renderExchangeTable(rows, tbodyId = 'fxBody') {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = rows.map(r => {
    const meta = FX_META[r.cur] || {};
    const vnd  = r.rateToVnd
      ? Math.round(r.rateToVnd).toLocaleString('vi-VN')
      : '—';

    return `
      <tr>
        <td>
          <div class="fx-pair">
            <span class="fx-flag">${meta.flag || '🏳️'}</span>
            <div>
              <div class="fx-sym">${r.cur}</div>
              <div class="fx-name">${meta.name || r.cur}</div>
            </div>
          </div>
        </td>
        <td class="fx-rate">${vnd} ₫</td>
        <td class="fx-label">= 1 ${r.cur}</td>
      </tr>
    `;
  }).join('');

  // Update the source note with the actual API that responded
  const sourceEl = document.getElementById('fxSourceNote');
  if (sourceEl && rows[0]?.source) {
    sourceEl.textContent =
      `Nguồn: ${rows[0].source} · Tỷ giá có thể chênh lệch với ngân hàng thương mại · `
      + new Date().toLocaleTimeString('vi-VN');
  }
}
