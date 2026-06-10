/**
 * components/traffic.js
 * Traffic violation lookup UI renderer.
 */

import { lookupTrafficViolation } from '../api/traffic.js';

let isSearching = false;

/**
 * Bootstrap the traffic card — attach event listeners.
 */
export function initTrafficCard() {
  const btn   = document.getElementById('trafficSearchBtn');
  const input = document.getElementById('trafficPlateInput');
  if (!btn || !input) return;

  btn.addEventListener('click', handleTrafficSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') handleTrafficSearch(); });
}

async function handleTrafficSearch() {
  if (isSearching) return;
  const plate = document.getElementById('trafficPlateInput')?.value?.trim();
  const type  = document.getElementById('trafficTypeSelect')?.value || 'car';

  if (!plate) {
    renderTrafficError('⚠️ Vui lòng nhập biển số xe.');
    return;
  }

  if (!/^[A-Z0-9\-\.]+$/i.test(plate.replace(/\s/g, ''))) {
    renderTrafficError('⚠️ Biển số không hợp lệ. Ví dụ: 51F-123.45 hoặc 51F12345');
    return;
  }

  isSearching = true;
  renderTrafficLoading(plate);

  try {
    const result = await lookupTrafficViolation(plate, type);
    if (result.success && result.data.length > 0) {
      renderTrafficViolations(result.data, result.links);
    } else if (result.success && result.data.length === 0) {
      renderTrafficClean(plate, result.links);
    } else {
      // CORS fallback
      renderTrafficFallback(plate, result.links);
    }
  } catch (err) {
    renderTrafficError('⚠️ Có lỗi xảy ra: ' + err.message);
  } finally {
    isSearching = false;
  }
}

function renderTrafficLoading(plate) {
  const el = document.getElementById('trafficResult');
  if (!el) return;
  el.innerHTML = `
    <div class="traffic-loading">
      <div style="font-size:24px;margin-bottom:8px;">🔍</div>
      Đang tra cứu biển số <strong>${plate.toUpperCase()}</strong>...
    </div>
  `;
}

function renderTrafficClean(plate, links) {
  const el = document.getElementById('trafficResult');
  if (!el) return;
  el.innerHTML = `
    <div class="traffic-clean">
      <div class="traffic-clean-icon">✅</div>
      <div>
        <div class="traffic-clean-text">Không tìm thấy vi phạm</div>
        <div class="traffic-clean-sub">Biển số ${plate.toUpperCase()} hiện không có phạt nguội trong hệ thống.</div>
      </div>
    </div>
    ${renderLinksHtml(links, 'Kiểm tra lại tại trang chính thức:')}
  `;
}

function renderTrafficViolations(violations, links) {
  const el = document.getElementById('trafficResult');
  if (!el) return;

  const cards = violations.map(v => `
    <div class="violation-card">
      <div class="violation-header">
        <div class="violation-plate">${v.bien_so || v.plate || '—'}</div>
        <span class="violation-status ${v.paid ? 'status-paid' : 'status-unpaid'}">
          ${v.paid ? '✅ Đã nộp phạt' : '⚠️ Chưa nộp phạt'}
        </span>
      </div>
      <div class="violation-row">
        <span class="violation-label">📅 Ngày vi phạm</span>
        <span class="violation-value">${v.ngay_vi_pham || v.date || '—'}</span>
      </div>
      <div class="violation-row">
        <span class="violation-label">📍 Địa điểm</span>
        <span class="violation-value">${v.dia_diem || v.location || '—'}</span>
      </div>
      <div class="violation-row">
        <span class="violation-label">⚖️ Lỗi vi phạm</span>
        <span class="violation-value">${v.loi_vi_pham || v.violation || '—'}</span>
      </div>
      <div class="violation-row">
        <span class="violation-label">🏢 Đơn vị phạt</span>
        <span class="violation-value">${v.don_vi || v.unit || '—'}</span>
      </div>
      <div class="violation-fine">
        💰 ${v.muc_phat ? Number(v.muc_phat).toLocaleString('vi-VN') + ' ₫' : 'Xem chi tiết tại CSGT'}
      </div>
    </div>
  `).join('');

  el.innerHTML = `
    <div style="font-size:12px;color:var(--accent-red);margin-bottom:10px;">
      ⚠️ Tìm thấy <strong>${violations.length}</strong> vi phạm
    </div>
    ${cards}
    ${renderLinksHtml(links, 'Nộp phạt tại:')}
  `;
}

function renderTrafficFallback(plate, links) {
  const el = document.getElementById('trafficResult');
  if (!el) return;
  el.innerHTML = `
    <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);
                border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:12px;font-size:12px;
                color:var(--text-secondary);">
      ℹ️ Không thể kết nối trực tiếp (giới hạn CORS). Vui lòng tra cứu tại các trang chính thức bên dưới.
      Biển số đã được điền sẵn.
    </div>
    ${renderLinksHtml(links, `Tra cứu biển số ${plate.toUpperCase()} tại:`)}
    <div class="plate-tip">
      💡 <strong>Mẹo:</strong> Nhập biển số không dấu chấm/gạch, ví dụ: <code>51F12345</code> hoặc <code>51F-123.45</code>
    </div>
  `;
}

function renderTrafficError(msg) {
  const el = document.getElementById('trafficResult');
  if (el) el.innerHTML = `<div class="error-msg">${msg}</div>`;
}

function renderLinksHtml(links, label = 'Tra cứu tại:') {
  if (!links?.length) return '';
  return `
    <div class="traffic-links">
      <div class="traffic-links-label">${label}</div>
      ${links.map(l => `
        <a class="traffic-link-item" href="${l.url}" target="_blank" rel="noopener">
          <div>
            <div class="traffic-link-name">${l.name}</div>
            <div class="traffic-link-note">${l.note}</div>
          </div>
          <span class="badge-${l.badge}">${l.badge === 'official' ? 'Chính thức' : 'Bên thứ 3'}</span>
        </a>
      `).join('')}
    </div>
  `;
}
