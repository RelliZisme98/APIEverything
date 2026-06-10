/**
 * components/gold.js
 * Renders the gold price card with international spot + Vietnamese brand comparison.
 */

import { fmtPrice }       from '../utils/formatters.js';
import { computeGoldVnd } from '../api/gold.js';
import { GOLD_BRANDS, computeBrandPrices } from '../data/gold-brands.js';
import { CONFIG } from '../store/state.js';

// Track active display unit
let activeUnit = 'chi'; // 'chi' | 'luong'

/**
 * Render live gold data with full brand comparison.
 * @param {number} xauUsd
 * @param {string} source
 * @param {string} containerId
 */
export function renderGold(xauUsd, source = '', containerId = 'goldContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  const { xauVnd, perChiVnd, sjcPerChiVnd } = computeGoldVnd(xauUsd);
  const perLuongVnd = Math.round(perChiVnd * 10);

  el.innerHTML = `
    <!-- ── Spot price header ── -->
    <div class="gold-spot-row animate-fade-in-up">
      <div>
        <div class="gold-price-big" style="color:var(--accent-yellow);">${fmtPrice(xauUsd)}</div>
        <div class="gold-spot-sub">XAU/USD · ${source || 'Thị trường quốc tế'}</div>
      </div>
      <div class="gold-vnd-box">
        <div class="gold-vnd-val">${perLuongVnd.toLocaleString('vi-VN')} ₫</div>
        <div class="gold-vnd-label">≈ 1 lượng (quốc tế)</div>
      </div>
    </div>

    <!-- ── Unit toggle ── -->
    <div class="gold-unit-toggle" id="goldUnitToggle">
      <button class="gold-unit-btn ${activeUnit === 'chi' ? 'active' : ''}" onclick="switchGoldUnit('chi')">/ chỉ</button>
      <button class="gold-unit-btn ${activeUnit === 'luong' ? 'active' : ''}" onclick="switchGoldUnit('luong')">/ lượng</button>
    </div>

    <!-- ── Brand comparison table ── -->
    <div class="gold-brands-label">
      🏪 Giá ước tính tại các thương hiệu VN
      <span class="gold-brands-note">(dựa trên giá quốc tế + phí)</span>
    </div>
    <div class="gold-brand-table" id="goldBrandTable">
      ${renderBrandRows(xauUsd, activeUnit)}
    </div>

    <!-- ── Disclaimer ── -->
    <div class="gold-disclaimer">
      ⚠️ Giá thương hiệu là <strong>ước tính</strong> dựa trên giá quốc tế + phụ phí thông thường.
      Giá thực tế có thể khác — nhấn tên thương hiệu để xem giá chính xác.
    </div>
    <div class="gold-updated">⏱️ Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}</div>
  `;
}

/**
 * Render brand comparison rows.
 */
function renderBrandRows(xauUsd, unit) {
  return GOLD_BRANDS.map(brand => {
    const prices = computeBrandPrices(brand, xauUsd, CONFIG.usdToVnd);
    const buy  = unit === 'chi' ? prices.buyPerChi  : prices.buyPerLuong;
    const sell = unit === 'chi' ? prices.sellPerChi : prices.sellPerLuong;

    return `
      <div class="gold-brand-row">
        <div class="gold-brand-left">
          <span class="gold-brand-icon" style="background:${brand.color}22;border:1px solid ${brand.color}44;">
            ${brand.icon}
          </span>
          <div>
            <a class="gold-brand-name" href="${brand.url}" target="_blank" rel="noopener"
               style="color:${brand.color};">${brand.name}</a>
            <div class="gold-brand-type">${brand.type}</div>
          </div>
        </div>
        <div class="gold-brand-prices">
          <div class="gold-brand-price">
            <span class="gold-price-label buy">Mua</span>
            <span class="gold-price-num">${buy.toLocaleString('vi-VN')}₫</span>
          </div>
          <div class="gold-brand-price">
            <span class="gold-price-label sell">Bán</span>
            <span class="gold-price-num sell-num">${sell.toLocaleString('vi-VN')}₫</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Switch display unit (chi / luong) — called from window.
 */
export function switchGoldUnit(unit) {
  activeUnit = unit;

  // Toggle button styles
  document.querySelectorAll('.gold-unit-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(unit === 'chi' ? 'chỉ' : 'lượng'));
  });

  // Re-render brand rows with stored xauUsd from state
  import('../store/state.js').then(({ state }) => {
    const xauUsd = state.goldData?.price;
    if (xauUsd) {
      const table = document.getElementById('goldBrandTable');
      if (table) table.innerHTML = renderBrandRows(xauUsd, unit);
    }
  });
}

/**
 * Render a static fallback when no live data is available.
 */
export function renderGoldFallback(containerId = 'goldContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="gold-spot-row">
      <div>
        <div class="gold-price-big" style="color:var(--accent-yellow);opacity:0.6;">~$3,280</div>
        <div class="gold-spot-sub">XAU/USD · Dữ liệu tham khảo</div>
      </div>
    </div>

    <div class="error-msg" style="margin-top:14px;">
      💡 Không tải được giá vàng trực tiếp. Để xem giá chính xác, thêm
      <strong>GOLD_API_KEY</strong> vào file <code style="background:rgba(255,255,255,0.07);padding:1px 5px;border-radius:3px;">config.js</code>.
      Key miễn phí 100 req/ngày tại
      <a href="https://www.goldapi.io" target="_blank" style="color:var(--accent-blue);">goldapi.io</a>
    </div>

    <div class="gold-brands-label" style="margin-top:14px;">
      🔗 Xem giá trực tiếp tại các thương hiệu
    </div>
    <div class="gold-brand-table">
      ${GOLD_BRANDS.map(b => `
        <a class="gold-brand-row" href="${b.url}" target="_blank" rel="noopener"
           style="text-decoration:none;color:inherit;">
          <div class="gold-brand-left">
            <span class="gold-brand-icon" style="background:${b.color}22;border:1px solid ${b.color}44;">
              ${b.icon}
            </span>
            <div>
              <div class="gold-brand-name" style="color:${b.color};">${b.name}</div>
              <div class="gold-brand-type">${b.note}</div>
            </div>
          </div>
          <span style="color:var(--text-muted);font-size:14px;">→</span>
        </a>
      `).join('')}
    </div>
  `;
}
