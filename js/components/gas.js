/**
 * components/gas.js
 * Renders Vietnam gas prices with trend vs previous period.
 */

import { GAS_PRICES, GAS_UPDATED, GAS_NEXT_UPDATE, GAS_SOURCE } from '../data/gas-prices.js';
import { state } from '../store/state.js';

export function renderGas(gridId = 'gasGrid', noteId = 'gasUpdated') {
  const grid = document.getElementById(gridId);
  const note = document.getElementById(noteId);

  if (!grid) return;

  // Lấy khu vực được chọn (mặc định là vùng 1)
  const regionSelect = document.getElementById('gasRegionSelect');
  const region = regionSelect ? parseInt(regionSelect.value, 10) : 1;

  // Đăng ký event listener một lần duy nhất để cập nhật khi đổi khu vực
  if (regionSelect && !regionSelect.dataset.listenerBound) {
    regionSelect.dataset.listenerBound = 'true';
    regionSelect.addEventListener('change', () => {
      renderGas(gridId, noteId);
    });
  }

  // Bản sao của data tĩnh để cập nhật
  let displayPrices = GAS_PRICES.map(item => ({ ...item }));
  let updatedDate = GAS_UPDATED;
  let sourceName = GAS_SOURCE;
  let isLive = false;

  const liveGas = state.gasData;
  if (liveGas && liveGas.prices && liveGas.prices.length > 0) {
    isLive = true;
    updatedDate = liveGas.priceDate || updatedDate;
    sourceName = liveGas.source || sourceName;

    // Định dạng ngày hiển thị (YYYY-MM-DD -> DD/MM/YYYY)
    if (updatedDate && updatedDate.includes('-')) {
      const parts = updatedDate.split('-');
      if (parts.length === 3) {
        updatedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    // Cập nhật giá động vào displayPrices
    displayPrices.forEach(item => {
      const apiItem = liveGas.prices.find(p => {
        const title = p.name.toLowerCase();
        const label = item.name.toLowerCase();

        if (label === 'ron 95-iii') {
          return title.includes('ron 95') && title.includes('iii');
        }
        if (label === 'e5 ron 92') {
          return title.includes('ron 92');
        }
        if (label === 'dầu diesel 0,05s') {
          return title.includes('0,05s') || title.includes('0.05s');
        }
        if (label === 'dầu diesel 0,001s') {
          return title.includes('0,001s') || title.includes('0.001s');
        }
        if (label === 'dầu hỏa') {
          return title.includes('hỏa') || title.includes('2-k') || title.includes('kerosene');
        }
        if (label === 'dầu mazut 180cst') {
          return title.includes('mazut') || title.includes('fo');
        }
        return false;
      });

      if (apiItem) {
        const newPrice = region === 2 ? apiItem.r2 : apiItem.r1;
        if (newPrice) {
          if (region === 2 && apiItem.r1 && apiItem.r2 && item.prev) {
            item.prev = Math.round(item.prev * (apiItem.r2 / apiItem.r1));
          }
          item.price = newPrice;
        }
      }
    });
  }

  grid.innerHTML = displayPrices.map(g => {
    const diff    = g.price - (g.prev ?? g.price);
    const pct     = g.prev ? (diff / g.prev * 100) : 0;
    const isUp    = diff > 0;
    const isDown  = diff < 0;
    const arrow   = isUp ? '▲' : isDown ? '▼' : '—';
    const trendClr = isUp ? '#f87171' : isDown ? '#4ade80' : '#94a3b8';

    return `
      <div class="gas-item">
        <div class="gas-left">
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

  // Cập nhật live status badge trên card header
  const badge = document.getElementById('gasLiveBadge');
  if (badge) {
    if (isLive) {
      badge.className = 'card-badge badge-live';
      badge.innerHTML = `<span class="status-dot dot-green"></span>LIVE`;
    } else {
      badge.className = 'card-badge badge-manual';
      badge.innerHTML = `<span class="status-dot dot-yellow"></span>ƯỚC TÍNH`;
    }
  }

  if (note) {
    const today = new Date();
    // Tính kỳ tiếp theo dựa trên ngày điều hành
    let nextDateStr = GAS_NEXT_UPDATE;
    let daysLeft = 0;
    
    if (isLive && liveGas.priceDate) {
      const pDate = new Date(liveGas.priceDate);
      const nextDate = new Date(pDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Thường là sau 7 ngày (thứ Năm tuần sau)
      nextDateStr = `${String(nextDate.getDate()).padStart(2, '0')}/${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}`;
      daysLeft = Math.ceil((nextDate - today) / 86400000);
    } else {
      const nextDate = new Date('2026-06-18');
      daysLeft = Math.ceil((nextDate - today) / 86400000);
    }

    note.innerHTML = `
 Kỳ điều hành: <strong>${updatedDate}</strong> · Nguồn: ${sourceName}
      &nbsp;·&nbsp; Kỳ tiếp theo: <strong>${nextDateStr}</strong>
      <span style="margin-left:6px;padding:1px 7px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);border-radius:10px;font-size:10px;color:#fbbf24;">
        ${daysLeft > 0 ? 'Còn ' + daysLeft + ' ngày' : 'Hôm nay'}
      </span>`;
  }
}
