/**
 * components/gas.js
 * Renders Vietnam gas prices with trend vs previous period.
 */

import { GAS_PRICES, GAS_UPDATED, GAS_NEXT_UPDATE, GAS_SOURCE } from '../data/gas-prices.js';

export function renderGas(gridId = 'gasGrid', noteId = 'gasUpdated') {
  const grid = document.getElementById(gridId);
  const note = document.getElementById(noteId);

  if (grid) {
    grid.innerHTML = GAS_PRICES.map(g => {
      const diff    = g.price - (g.prev ?? g.price);
      const pct     = g.prev ? (diff / g.prev * 100) : 0;
      const isUp    = diff > 0;
      const isDown  = diff < 0;
      const arrow   = isUp ? '▲' : isDown ? '▼' : '—';
      const trendClr = isUp ? '#f87171' : isDown ? '#4ade80' : '#94a3b8';

      return `
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
            ${g.prev ? `
            <div class="gas-trend" style="color:${trendClr};">
              ${arrow} ${Math.abs(diff).toLocaleString('vi-VN')}₫
              <span style="opacity:.7;">(${Math.abs(pct).toFixed(1)}%)</span>
            </div>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  if (note) {
    const today = new Date();
    const nextDate = new Date('2026-06-15');
    const daysLeft = Math.ceil((nextDate - today) / 86400000);
    note.innerHTML = `
      📋 Kỳ điều hành: <strong>${GAS_UPDATED}</strong> · Nguồn: ${GAS_SOURCE}
      &nbsp;·&nbsp; Kỳ tiếp theo: <strong>${GAS_NEXT_UPDATE}</strong>
      <span style="margin-left:6px;padding:1px 7px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);border-radius:10px;font-size:10px;color:#fbbf24;">
        ⏳ ${daysLeft > 0 ? 'Còn ' + daysLeft + ' ngày' : 'Hôm nay'}
      </span>`;
  }
}
