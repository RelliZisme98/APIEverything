/**
 * components/power-outage.js
 * Dashboard lịch cúp điện hôm nay — auto-load tất cả vùng EVN
 * Không cần người dùng tra cứu thủ công.
 */

import APP_CONFIG from '../../config.js';

const PROXY = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port)
  ? window.location.origin
  : (APP_CONFIG.TRAFFIC_PROXY_URL || window.location.origin);

// ── Cấu hình các vùng EVN ──────────────────────────────────────────────────
const EVN_REGIONS = [
  {
    key: 'hanoi',
    label: 'EVNHANOI – Hà Nội',
    short: 'Hà Nội',
    icon: '🏙️',
    color: '#60a5fa',
    hotline: '1900 1288',
    format: 'json',
  },
  {
    key: 'npc',
    label: 'EVNNPC – Miền Bắc',
    short: 'Miền Bắc',
    icon: '🏔️',
    color: '#a78bfa',
    hotline: '1900 6769',
    format: 'html',
  },
  {
    key: 'cpc',
    label: 'EVNCPC – Miền Trung & Tây Nguyên',
    short: 'Miền Trung',
    icon: '🌊',
    color: '#fbbf24',
    hotline: '1900 1909',
    format: 'json',
  },
  {
    key: 'spc',
    label: 'EVNSPC – Miền Nam',
    short: 'Miền Nam',
    icon: '🌴',
    color: '#34d399',
    hotline: '1900 1006',
    format: 'html',
  },
];

// ── Format ngày hiển thị ────────────────────────────────────────────────────
function todayLabel() {
  const d = new Date();
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Parse JSON response (EVNHANOI, CPC) ────────────────────────────────────
function parseJsonItems(body) {
  try {
    const json = JSON.parse(body);
    if (json.error) return null;
    return Array.isArray(json)
      ? json
      : (json.data || json.items || json.result || json.content || []);
  } catch { return null; }
}

// ── Parse HTML table response (EVNSPC, NPC) ────────────────────────────────
function parseHtmlItems(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows = doc.querySelectorAll('tr');
  if (rows.length <= 1) return [];

  const headers = [...rows[0].querySelectorAll('th, td')].map(c => c.textContent.trim());
  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = [...rows[i].querySelectorAll('td')];
    if (!cells.length) continue;
    const obj = {};
    cells.forEach((td, idx) => { obj[headers[idx] || `col${idx}`] = td.textContent.trim(); });
    obj._raw = cells.map(c => c.textContent.trim());
    items.push(obj);
  }
  return items;
}

// ── Render một card item (JSON) ─────────────────────────────────────────────
function renderJsonCard(it, color) {
  const area     = it.area || it.khuVuc || it.tenKhuVuc || it.dienLuc || it.addressDescription || '—';
  const reason   = it.reason || it.lyDo || it.noiDung || it.content || '—';
  const timeFrom = it.fromTime || it.tuGio || it.startTime || it.powerCutFrom || '';
  const timeTo   = it.toTime   || it.denGio || it.endTime   || it.powerCutTo   || '';
  const status   = it.status  || it.trangThai || '';
  const district = it.district || it.quan || it.huyen || '';

  const statusBadge = status
    ? `<span class="po-status-badge" style="background:${status.includes('thực hiện') || status.includes('Đang') ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};color:${status.includes('thực hiện') || status.includes('Đang') ? '#f87171' : '#4ade80'}">${status}</span>`
    : '';

  return `
    <div class="po-card" style="border-left-color:${color}">
      <div class="po-card-header">
        <span class="po-card-area">⚡ ${area}</span>
        ${statusBadge}
      </div>
      ${district ? `<div class="po-card-meta">📍 ${district}</div>` : ''}
      ${(timeFrom || timeTo) ? `<div class="po-card-time">🕐 ${timeFrom}${timeTo ? ' → ' + timeTo : ''}</div>` : ''}
      ${reason && reason !== '—' ? `<div class="po-card-reason">📋 ${reason}</div>` : ''}
    </div>`;
}

// ── Render một card item (HTML raw) ────────────────────────────────────────
function renderHtmlCard(item, color) {
  const raw = item._raw || [];
  if (!raw.length) return '';
  const [col0, col1, col2, col3, col4] = raw;
  return `
    <div class="po-card" style="border-left-color:${color}">
      <div class="po-card-header">
        <span class="po-card-area">⚡ ${col0 || '—'}</span>
      </div>
      ${col1 ? `<div class="po-card-time">🕐 ${col1}${col2 ? ' → ' + col2 : ''}</div>` : ''}
      ${col3 ? `<div class="po-card-meta">📍 ${col3}</div>` : ''}
      ${col4 ? `<div class="po-card-reason">📋 ${col4}</div>` : ''}
    </div>`;
}

// ── Fetch + render một vùng ────────────────────────────────────────────────
async function loadRegionToday(region) {
  const wrap = document.getElementById(`po-region-${region.key}`);
  if (!wrap) return;

  const body = wrap.querySelector('.po-region-body');
  body.innerHTML = `<div class="po-loading"><span class="po-spinner"></span> Đang tải dữ liệu hôm nay...</div>`;

  const url = `${PROXY}/power-outage?evn=${region.key}&action=today`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const text = await res.text();

    let items = [];
    if (region.format === 'json') {
      items = parseJsonItems(text) || [];
    } else {
      items = parseHtmlItems(text);
    }

    const badge = wrap.querySelector('.po-region-count');
    if (badge) badge.textContent = items.length > 0 ? `${items.length} lịch` : 'Không có';
    if (badge) badge.style.background = items.length > 0
      ? `rgba(${region.color === '#60a5fa' ? '96,165,250' : region.color === '#a78bfa' ? '167,139,250' : region.color === '#fbbf24' ? '251,191,36' : '52,211,153'}, 0.15)`
      : 'rgba(100,100,100,0.15)';

    if (!items.length) {
      body.innerHTML = `<div class="po-empty">✅ Không có lịch cúp điện hôm nay tại vùng này.</div>`;
      return;
    }

    const cards = items.map(it =>
      region.format === 'json' ? renderJsonCard(it, region.color) : renderHtmlCard(it, region.color)
    ).join('');

    body.innerHTML = `<div class="po-cards-grid">${cards}</div>`;

  } catch (err) {
    const badge = wrap.querySelector('.po-region-count');
    if (badge) badge.textContent = 'Lỗi';

    body.innerHTML = `
      <div class="po-error">
        ⚠️ Không thể tải dữ liệu: ${err.message}.
        <a href="${getOfficialUrl(region.key)}" target="_blank" rel="noopener" class="po-official-link">Tra cứu chính thức ↗</a>
      </div>`;
  }
}

function getOfficialUrl(key) {
  const map = {
    hanoi: 'https://evnhanoi.vn/search/power-cut',
    npc: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungGiamCungCapDien',
    cpc: 'https://cskh.cpc.vn/tra-cuu/lich-tam-ngung-cung-cap-dien/khu-vuc',
    spc: 'https://cskh.evnspc.vn/TraCuu/LichNgungGiamCungCapDien',
  };
  return map[key] || '#';
}

// ── Toggle collapse/expand region ──────────────────────────────────────────
function poToggleRegion(key) {
  const body = document.getElementById(`po-body-${key}`);
  const icon = document.getElementById(`po-chevron-${key}`);
  if (!body) return;
  const collapsed = body.style.display === 'none';
  body.style.display = collapsed ? '' : 'none';
  if (icon) icon.style.transform = collapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
}

// ── Main render ────────────────────────────────────────────────────────────
export function renderPowerOutage(containerId = 'powerContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="po-dashboard">
      <!-- Header -->
      <div class="po-dash-header">
        <div class="po-dash-title">
          <span class="po-dash-icon">⚡</span>
          <div>
            <div class="po-dash-heading">Lịch Cúp Điện Hôm Nay</div>
            <div class="po-dash-date">${todayLabel()}</div>
          </div>
        </div>
        <button class="po-refresh-btn" onclick="window.poRefreshAll()" title="Tải lại dữ liệu">
          <span id="poRefreshIcon">🔄</span> Làm mới
        </button>
      </div>

      <!-- Region panels -->
      <div class="po-regions">
        ${EVN_REGIONS.map(r => `
          <div class="po-region-wrap" id="po-region-${r.key}">
            <div class="po-region-header" onclick="window.poToggleRegion('${r.key}')" style="--region-color:${r.color}">
              <div class="po-region-left">
                <span class="po-region-icon">${r.icon}</span>
                <div>
                  <div class="po-region-name" style="color:${r.color}">${r.short}</div>
                  <div class="po-region-label">${r.label}</div>
                </div>
              </div>
              <div class="po-region-right">
                <span class="po-region-count" id="po-count-${r.key}" style="background:rgba(100,100,100,0.15)">Đang tải...</span>
                <span class="po-region-hotline">📞 ${r.hotline}</span>
                <span class="po-chevron" id="po-chevron-${r.key}">▼</span>
              </div>
            </div>
            <div class="po-region-body" id="po-body-${r.key}">
              <div class="po-loading"><span class="po-spinner"></span> Đang tải...</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Footer -->
      <div class="po-dash-footer">
        📞 <strong>1900 1006</strong> — Tổng đài chăm sóc khách hàng EVN Toàn Quốc
      </div>
    </div>
  `;

  // Map count badge ids correctly
  EVN_REGIONS.forEach(r => {
    const badge = document.getElementById(`po-count-${r.key}`);
    const body  = document.getElementById(`po-body-${r.key}`);
    // link region wrap to correct body
    const wrap = document.getElementById(`po-region-${r.key}`);
    if (wrap) wrap.querySelector = (sel) => {
      if (sel === '.po-region-body') return body;
      if (sel === '.po-region-count') return badge;
      return wrap.querySelector(sel);
    };
  });

  // Expose globals
  window.poToggleRegion = poToggleRegion;
  window.poRefreshAll   = poRefreshAll;

  // Auto-load all regions in parallel
  poRefreshAll();
}

async function poRefreshAll() {
  const icon = document.getElementById('poRefreshIcon');
  if (icon) { icon.style.animation = 'spin 1s linear infinite'; }

  // Reset count badges
  EVN_REGIONS.forEach(r => {
    const badge = document.getElementById(`po-count-${r.key}`);
    if (badge) { badge.textContent = 'Đang tải...'; badge.style.background = 'rgba(100,100,100,0.15)'; }
    const body = document.getElementById(`po-body-${r.key}`);
    if (body) body.innerHTML = `<div class="po-loading"><span class="po-spinner"></span> Đang tải dữ liệu hôm nay...</div>`;
  });

  // Load all regions in parallel
  await Promise.allSettled(
    EVN_REGIONS.map(r => loadRegionToday({
      ...r,
      querySelector: (sel) => {
        const wrap = document.getElementById(`po-region-${r.key}`);
        return wrap ? wrap.querySelector(sel) : null;
      }
    }))
  );

  if (icon) icon.style.animation = '';
}

// ── Override querySelector in loadRegionToday ─────────────────────────────
// Re-implement loadRegionToday to use direct getElementById
async function loadRegionToday(region) {
  const bodyEl  = document.getElementById(`po-body-${region.key}`);
  const badgeEl = document.getElementById(`po-count-${region.key}`);
  if (!bodyEl) return;

  bodyEl.innerHTML = `<div class="po-loading"><span class="po-spinner"></span> Đang tải dữ liệu hôm nay...</div>`;

  const url = `${PROXY}/power-outage?evn=${region.key}&action=today`;

  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const text = await res.text();

    let items = [];
    if (region.format === 'json') {
      items = parseJsonItems(text) || [];
    } else {
      items = parseHtmlItems(text);
    }

    if (badgeEl) {
      badgeEl.textContent = items.length > 0 ? `${items.length} lịch` : 'Không có';
      badgeEl.style.color = items.length > 0 ? region.color : 'var(--text-muted)';
      badgeEl.style.background = items.length > 0
        ? `${region.color}22`
        : 'rgba(100,100,100,0.12)';
    }

    if (!items.length) {
      bodyEl.innerHTML = `<div class="po-empty">✅ Không có lịch cúp điện hôm nay tại vùng này.</div>`;
      return;
    }

    const cards = items.map(it =>
      region.format === 'json'
        ? renderJsonCard(it, region.color)
        : renderHtmlCard(it, region.color)
    ).join('');

    bodyEl.innerHTML = `<div class="po-cards-grid">${cards}</div>`;

  } catch (err) {
    if (badgeEl) { badgeEl.textContent = 'Lỗi'; badgeEl.style.color = '#f87171'; }
    bodyEl.innerHTML = `
      <div class="po-error">
        ⚠️ Không thể tải dữ liệu: ${err.message}.
        <a href="${getOfficialUrl(region.key)}" target="_blank" rel="noopener" class="po-official-link">Tra cứu chính thức ↗</a>
      </div>`;
  }
}

/** Legacy compat */
export function searchPowerOutage() {}
