/**
 * components/fuel-price.js — Giá xăng dầu Việt Nam (cập nhật định kỳ 10 ngày)
 * Nguồn: Quyết định Bộ Công Thương / Petrolimex
 */

// Official prices - updated June 2026 (kỳ điều chỉnh gần nhất)
// Update when government changes prices (every 10 days)
const FUEL_DATA = {
  lastUpdate: '05/06/2026',
  nextUpdate:  '15/06/2026',
  source: 'Bộ Công Thương',
  prices: [
 { code: 'RON95-III', name: 'Xăng RON95-III', price: 21470, unit: 'đồng/lít', icon: '', color: '#60a5fa', tag: 'Phổ biến' },
 { code: 'E5-RON92', name: 'Xăng E5 RON92', price: 20920, unit: 'đồng/lít', icon: '', color: '#34d399', tag: 'Sinh học' },
 { code: 'DO-0.05S', name: 'Dầu Diesel 0,05S', price: 19940, unit: 'đồng/lít', icon: '', color: '#fbbf24', tag: 'Diesel' },
 { code: 'DO-0.001S', name: 'Dầu Diesel 0,001S', price: 21490, unit: 'đồng/lít', icon: '', color: '#f59e0b', tag: 'Công nghiệp' },
 { code: 'MAZ', name: 'Dầu Mazut 180CST', price: 15800, unit: 'đồng/kg', icon: '️', color: '#94a3b8', tag: 'Công nghiệp' },
  ]
};

export function renderFuelPrice(containerId = 'fuelPriceContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  const d = FUEL_DATA;
  const today = new Date();
  const nextDate = new Date('2026-06-15');
  const daysLeft = Math.ceil((nextDate - today) / 86400000);

  const cards = d.prices.map(p => `
    <div class="fuel-card">
      <div class="fuel-icon" style="background:${p.color}18;border-color:${p.color}30;">${p.icon}</div>
      <div class="fuel-info">
        <div class="fuel-code" style="color:${p.color};">${p.code} <span class="fuel-tag">${p.tag}</span></div>
        <div class="fuel-name">${p.name}</div>
      </div>
      <div class="fuel-price-wrap">
        <div class="fuel-price">${p.price.toLocaleString('vi-VN')}</div>
        <div class="fuel-unit">${p.unit}</div>
      </div>
    </div>`).join('');

  el.innerHTML = `
    <div class="fuel-meta">
 Kỳ điều chỉnh: <strong>${d.lastUpdate}</strong> &nbsp;·&nbsp;
      Kỳ tiếp theo: <strong>${d.nextUpdate}</strong>
      <span style="margin-left:8px;padding:2px 8px;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:10px;font-size:10px;color:#fbbf24;">
        ⏳ Còn ${daysLeft > 0 ? daysLeft + ' ngày' : 'Hôm nay!'}
      </span>
    </div>
    <div class="fuel-grid">${cards}</div>
    <div class="fuel-note">
 Giá tối đa theo quy định Nhà nước · Nguồn: ${d.source}
      &nbsp;·&nbsp; <a href="https://moit.gov.vn" target="_blank" style="color:var(--accent-blue);">moit.gov.vn</a>
      &nbsp;|&nbsp; <a href="https://www.petrolimex.com.vn" target="_blank" style="color:var(--accent-blue);">Petrolimex</a>
    </div>`;
}
