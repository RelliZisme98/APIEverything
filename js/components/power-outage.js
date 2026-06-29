/**
 * components/power-outage.js
 * Dashboard lịch cúp điện hôm nay
 */

import APP_CONFIG from '../../config.js';

const PROXY = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port)
  ? window.location.origin
  : (APP_CONFIG.TRAFFIC_PROXY_URL || window.location.origin);

// ── Ngày hôm nay (ISO yyyy-mm-dd) cho pre-fill link ────────────────────────
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function todayLabel() {
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ── Cấu hình các vùng EVN ──────────────────────────────────────────────────
// noAutoLoad: true  → API yêu cầu auth / không public → chỉ hiện link tra cứu
// noAutoLoad: false → thử auto-load qua proxy worker
const EVN_REGIONS = [
  {
    key: 'hanoi', short: 'Hà Nội', label: 'EVNHANOI – Hà Nội',
 icon: '️', color: '#60a5fa', hotline: '1900 1288', format: 'json',
    noAutoLoad: true,
    officialUrl: () => `https://evnhanoi.vn/search/power-cut`,
    note: 'API yêu cầu xác thực — tra cứu trực tiếp trên trang chính thức',
  },
  {
    key: 'npc', short: 'Miền Bắc', label: 'EVNNPC – Miền Bắc (27 tỉnh)',
 icon: '️', color: '#a78bfa', hotline: '1900 6769', format: 'html',
    noAutoLoad: true,
    officialUrl: () => `https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungGiamCungCapDien`,
    note: 'API không phản hồi ổn định — tra cứu trực tiếp trên trang chính thức',
  },
  {
    key: 'cpc', short: 'Miền Trung', label: 'EVNCPC – Miền Trung & Tây Nguyên',
 icon: '', color: '#fbbf24', hotline: '1900 1909', format: 'json',
    noAutoLoad: true,
    officialUrl: () => `https://cskh.cpc.vn/tra-cuu/lich-tam-ngung-cung-cap-dien/khu-vuc`,
    note: 'API không phản hồi ổn định — tra cứu trực tiếp trên trang chính thức',
  },
  {
    key: 'spc', short: 'Miền Nam', label: 'EVNSPC – Miền Nam (21 tỉnh)',
 icon: '', color: '#34d399', hotline: '1900 1006', format: 'html',
    noAutoLoad: false,
    officialUrl: () => `https://cskh.evnspc.vn/TraCuu/LichNgungGiamCungCapDien`,
    note: null,
  },
];

// ── Parse JSON ──────────────────────────────────────────────────────────────
function parseJsonItems(body) {
  try {
    const json = JSON.parse(body);
    if (!json) return [];
    if (json.data?.listLichCatDienEvn) return json.data.listLichCatDienEvn;
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.content)) return json.content;
    if (json.data) {
      if (Array.isArray(json.data)) return json.data;
      if (Array.isArray(json.data?.content)) return json.data.content;
    }
    if (json.error || json.isError) return [];
    for (const key of ['items', 'result', 'results', 'records', 'list']) {
      if (Array.isArray(json[key])) return json[key];
    }
    return [];
  } catch { return []; }
}

// ── Parse HTML table ────────────────────────────────────────────────────────
function parseHtmlItems(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = doc.querySelectorAll('tr');
  if (rows.length <= 1) return [];
  const headers = [...rows[0].querySelectorAll('th, td')].map(c => c.textContent.trim());
  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = [...rows[i].querySelectorAll('td')];
    if (!cells.length) continue;
    const obj = { _raw: cells.map(c => c.textContent.trim()) };
    cells.forEach((td, idx) => { obj[headers[idx] || `col${idx}`] = td.textContent.trim(); });
    items.push(obj);
  }
  return items;
}

// ── Render card JSON ────────────────────────────────────────────────────────
function renderJsonCard(it, color) {
  const area     = it.tenDonVi || it.area || it.khuVuc || it.tenKhuVuc || it.addressDescription || '—';
  const reason   = it.noidung  || it.reason || it.lyDo || it.noiDung || it.content || '';
  const timeInfo = it.khoangThoiGian || '';
  const timeFrom = it.fromTime || it.tuGio || it.startTime || it.powerCutFrom || '';
  const timeTo   = it.toTime   || it.denGio || it.endTime   || it.powerCutTo   || '';
  const status   = it.trangthai || it.status || it.trangThai || '';
  const district = it.khuVuc  || it.district || it.quan || it.huyen || '';
  const ngay     = it.ngayTHien || '';
  const isActive = status && (status.includes('thực hiện') || status.toLowerCase().includes('đang'));
  const badge    = status ? `<span class="po-status-badge" style="background:${isActive ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};color:${isActive ? '#f87171' : '#4ade80'}">${status}</span>` : '';
  const time     = timeInfo || (timeFrom ? `${timeFrom}${timeTo ? ' → ' + timeTo : ''}` : '');
  return `<div class="po-card" style="border-left-color:${color}">
 <div class="po-card-header"><span class="po-card-area">${area}</span>${badge}</div>
 ${ngay ? `<div class="po-card-meta">${ngay}</div>` : ''}
 ${district && district !== area ? `<div class="po-card-meta">${district}</div>` : ''}
 ${time ? `<div class="po-card-time">${time}</div>` : ''}
 ${reason ? `<div class="po-card-reason">${reason}</div>` : ''}
  </div>`;
}

// ── Render card HTML ────────────────────────────────────────────────────────
function renderHtmlCard(item, color) {
  const [col0, col1, col2, col3, col4] = item._raw || [];
  if (!col0) return '';
  return `<div class="po-card" style="border-left-color:${color}">
 <div class="po-card-header"><span class="po-card-area">${col0}</span></div>
 ${(col1 || col2) ? `<div class="po-card-time">${col1 || ''}${col2 ? ' → ' + col2 : ''}</div>` : ''}
 ${col3 ? `<div class="po-card-meta">${col3}</div>` : ''}
 ${col4 ? `<div class="po-card-reason">${col4}</div>` : ''}
  </div>`;
}

// ── Official link block ─────────────────────────────────────────────────────
function renderOfficialBlock(region) {
  return `
    <div class="po-official-block">
      <div class="po-official-info">
        <span class="po-official-note">ℹ️ ${region.note}</span>
      </div>
      <a href="${region.officialUrl()}" target="_blank" rel="noopener" class="po-official-btn" style="background:${region.color}22;border-color:${region.color}44;color:${region.color}">
 Tra cứu lịch cúp điện hôm nay ↗
      </a>
    </div>`;
}

// ── Auto-load một vùng ─────────────────────────────────────────────────────
async function loadRegionToday(region) {
  const bodyEl  = document.getElementById(`po-body-${region.key}`);
  const badgeEl = document.getElementById(`po-count-${region.key}`);
  if (!bodyEl) return;

  if (region.noAutoLoad) {
    if (badgeEl) { badgeEl.textContent = 'Tra cứu'; badgeEl.style.background = `${region.color}22`; badgeEl.style.color = region.color; }
    bodyEl.innerHTML = renderOfficialBlock(region);
    return;
  }

  try {
    const res  = await fetch(`${PROXY}/power-outage?evn=${region.key}&action=today`, { signal: AbortSignal.timeout(15000) });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const text  = await res.text();
    const items = region.format === 'json' ? parseJsonItems(text) : parseHtmlItems(text);

    if (badgeEl) {
      badgeEl.textContent  = items.length > 0 ? `${items.length} lịch` : 'Không có';
      badgeEl.style.color  = items.length > 0 ? region.color : 'var(--text-muted)';
      badgeEl.style.background = items.length > 0 ? `${region.color}22` : 'rgba(100,100,100,0.12)';
    }

    if (!items.length) {
      bodyEl.innerHTML = `
 <div class="po-empty">Không có lịch cúp điện hôm nay tại vùng này.</div>
        <div style="margin-top:8px;text-align:center">
          <a href="${region.officialUrl()}" target="_blank" rel="noopener" class="po-official-link">Xác nhận trên trang chính thức ↗</a>
        </div>`;
      return;
    }

    const cards = items.map(it => region.format === 'json' ? renderJsonCard(it, region.color) : renderHtmlCard(it, region.color)).join('');
    bodyEl.innerHTML = `<div class="po-cards-grid">${cards}</div>`;

  } catch (err) {
    if (badgeEl) { badgeEl.textContent = 'Lỗi'; badgeEl.style.color = '#f87171'; badgeEl.style.background = 'rgba(248,113,113,0.1)'; }
    bodyEl.innerHTML = `
 <div class="po-error">️ Không thể tải tự động: ${err.message}</div>
      ${renderOfficialBlock(region)}`;
  }
}

// ── Toggle collapse ────────────────────────────────────────────────────────
function poToggleRegion(key) {
  const body    = document.getElementById(`po-body-${key}`);
  const chevron = document.getElementById(`po-chevron-${key}`);
  if (!body) return;
  const collapsed = body.style.display === 'none';
  body.style.display = collapsed ? '' : 'none';
  if (chevron) chevron.style.transform = collapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
}

// ── Refresh all ────────────────────────────────────────────────────────────
async function poRefreshAll() {
  const icon = document.getElementById('poRefreshIcon');
  if (icon) icon.style.animation = 'spin 1s linear infinite';

  EVN_REGIONS.forEach(r => {
    const badge = document.getElementById(`po-count-${r.key}`);
    const body  = document.getElementById(`po-body-${r.key}`);
    if (!r.noAutoLoad) {
      if (badge) { badge.textContent = 'Đang tải...'; badge.style.background = 'rgba(100,100,100,0.15)'; badge.style.color = 'var(--text-muted)'; }
      if (body)  body.innerHTML = `<div class="po-loading"><span class="po-spinner"></span> Đang tải...</div>`;
    }
  });

  await Promise.allSettled(EVN_REGIONS.map(r => loadRegionToday(r)));

  if (icon) icon.style.animation = '';
}

// ── Main render ────────────────────────────────────────────────────────────
export function renderPowerOutage(containerId = 'powerContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  // Cập nhật badge của card trên giao diện chính
  const card = el.closest('.card');
  if (card) {
    const badge = card.querySelector('.card-badge');
    if (badge) {
      badge.textContent = 'BẢN ĐỒ TOÀN QUỐC';
      badge.className = 'card-badge badge-live';
      badge.style.background = 'rgba(96, 165, 250, 0.15)';
      badge.style.color = '#60a5fa';
    }
  }

  el.innerHTML = `
    <div style="position: relative; width: 100%; height: 780px; overflow: hidden; border-radius: 8px; background: #ffffff;">
      <!-- Loader giao diện tối (Dark Mode) khớp với dashboard -->
      <div id="po-iframe-loader" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #121214; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; color: #a0a0ab; font-size: 14px;">
        <div style="width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.08); border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px;"></div>
        <span>Đang kết nối tới máy chủ bản đồ toàn quốc...</span>
      </div>
      
      <iframe id="po-iframe" src="https://lichcupdien.app" style="width: 100%; height: 100%; border: none; opacity: 0; transition: opacity 0.3s;" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" allowfullscreen></iframe>
    </div>
  `;

  // Thêm CSS hiệu ứng xoay cho spinner nếu chưa có
  if (!document.getElementById('po-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'po-spinner-style';
    style.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  const iframe = document.getElementById('po-iframe');
  const loader = document.getElementById('po-iframe-loader');
  if (iframe && loader) {
    iframe.addEventListener('load', () => {
      loader.style.display = 'none';
      iframe.style.opacity = '1';
    });
  }
}

export function searchPowerOutage() {}
