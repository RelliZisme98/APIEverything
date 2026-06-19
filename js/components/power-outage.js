/**
 * components/power-outage.js
 * Dashboard lịch cúp điện hôm nay — auto-load tất cả vùng EVN
 */

import APP_CONFIG from '../../config.js';

const PROXY = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port)
  ? window.location.origin
  : (APP_CONFIG.TRAFFIC_PROXY_URL || window.location.origin);

// ── Cấu hình các vùng EVN ──────────────────────────────────────────────────
const EVN_REGIONS = [
  { key: 'hanoi', label: 'EVNHANOI – Hà Nội',                   short: 'Hà Nội',     icon: '🏙️', color: '#60a5fa', hotline: '1900 1288', format: 'json' },
  { key: 'npc',   label: 'EVNNPC – Miền Bắc (27 tỉnh)',         short: 'Miền Bắc',   icon: '🏔️', color: '#a78bfa', hotline: '1900 6769', format: 'html' },
  { key: 'cpc',   label: 'EVNCPC – Miền Trung & Tây Nguyên',    short: 'Miền Trung', icon: '🌊', color: '#fbbf24', hotline: '1900 1909', format: 'json' },
  { key: 'spc',   label: 'EVNSPC – Miền Nam',                   short: 'Miền Nam',   icon: '🌴', color: '#34d399', hotline: '1900 1006', format: 'html' },
];

function todayLabel() {
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function getOfficialUrl(key) {
  return { hanoi: 'https://evnhanoi.vn/search/power-cut', npc: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungGiamCungCapDien', cpc: 'https://cskh.cpc.vn/tra-cuu/lich-tam-ngung-cung-cap-dien/khu-vuc', spc: 'https://cskh.evnspc.vn/TraCuu/LichNgungGiamCungCapDien' }[key] || '#';
}

// ── Parse JSON response (EVNHANOI, CPC) ────────────────────────────────────
function parseJsonItems(body) {
  try {
    const json = JSON.parse(body);
    if (!json || json.error) return [];
    // Direct array
    if (Array.isArray(json)) return json;
    // Spring Boot Pageable: { content: [...], totalElements: N }
    if (Array.isArray(json.content)) return json.content;
    // Wrapped: { data: [...] } or { data: { content: [...] } }
    if (json.data) {
      if (Array.isArray(json.data)) return json.data;
      if (Array.isArray(json.data?.content)) return json.data.content;
    }
    // Other common wrappers
    for (const key of ['items', 'result', 'results', 'records', 'list']) {
      if (Array.isArray(json[key])) return json[key];
    }
    return [];
  } catch { return []; }
}

// ── Parse HTML table response (EVNSPC, NPC) ────────────────────────────────
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

// ── Render card (JSON) ──────────────────────────────────────────────────────
function renderJsonCard(it, color) {
  const area     = it.area || it.khuVuc || it.tenKhuVuc || it.dienLuc || it.addressDescription || '—';
  const reason   = it.reason || it.lyDo || it.noiDung || it.content || '';
  const timeFrom = it.fromTime || it.tuGio || it.startTime || it.powerCutFrom || '';
  const timeTo   = it.toTime   || it.denGio || it.endTime   || it.powerCutTo   || '';
  const status   = it.status  || it.trangThai || '';
  const district = it.district || it.quan || it.huyen || '';
  const isActive = status && (status.includes('thực hiện') || status.toLowerCase().includes('đang'));
  const statusBadge = status
    ? `<span class="po-status-badge" style="background:${isActive ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};color:${isActive ? '#f87171' : '#4ade80'}">${status}</span>`
    : '';
  return `<div class="po-card" style="border-left-color:${color}">
    <div class="po-card-header"><span class="po-card-area">⚡ ${area}</span>${statusBadge}</div>
    ${district ? `<div class="po-card-meta">📍 ${district}</div>` : ''}
    ${(timeFrom || timeTo) ? `<div class="po-card-time">🕐 ${timeFrom}${timeTo ? ' → ' + timeTo : ''}</div>` : ''}
    ${reason ? `<div class="po-card-reason">📋 ${reason}</div>` : ''}
  </div>`;
}

// ── Render card (HTML raw) ──────────────────────────────────────────────────
function renderHtmlCard(item, color) {
  const [col0, col1, col2, col3, col4] = item._raw || [];
  if (!col0) return '';
  return `<div class="po-card" style="border-left-color:${color}">
    <div class="po-card-header"><span class="po-card-area">⚡ ${col0}</span></div>
    ${(col1 || col2) ? `<div class="po-card-time">🕐 ${col1 || ''}${col2 ? ' → ' + col2 : ''}</div>` : ''}
    ${col3 ? `<div class="po-card-meta">📍 ${col3}</div>` : ''}
    ${col4 ? `<div class="po-card-reason">📋 ${col4}</div>` : ''}
  </div>`;
}

// ── Fetch & render một vùng ────────────────────────────────────────────────
async function loadRegionToday(region) {
  const bodyEl  = document.getElementById(`po-body-${region.key}`);
  const badgeEl = document.getElementById(`po-count-${region.key}`);
  if (!bodyEl) return;

  try {
    const res  = await fetch(`${PROXY}/power-outage?evn=${region.key}&action=today`, { signal: AbortSignal.timeout(12000) });
    const text = await res.text();
    const items = region.format === 'json' ? parseJsonItems(text) : parseHtmlItems(text);

    if (badgeEl) {
      badgeEl.textContent  = items.length > 0 ? `${items.length} lịch` : 'Không có';
      badgeEl.style.color  = items.length > 0 ? region.color : 'var(--text-muted)';
      badgeEl.style.background = items.length > 0 ? `${region.color}22` : 'rgba(100,100,100,0.12)';
    }

    if (!items.length) {
      bodyEl.innerHTML = `<div class="po-empty">✅ Không có lịch cúp điện hôm nay tại vùng này.</div>`;
      return;
    }

    const cards = items.map(it => region.format === 'json' ? renderJsonCard(it, region.color) : renderHtmlCard(it, region.color)).join('');
    bodyEl.innerHTML = `<div class="po-cards-grid">${cards}</div>`;

  } catch (err) {
    if (badgeEl) { badgeEl.textContent = 'Lỗi'; badgeEl.style.color = '#f87171'; }
    bodyEl.innerHTML = `<div class="po-error">⚠️ Không thể tải dữ liệu: ${err.message}. <a href="${getOfficialUrl(region.key)}" target="_blank" rel="noopener" class="po-official-link">Tra cứu chính thức ↗</a></div>`;
  }
}

// ── Toggle collapse/expand ─────────────────────────────────────────────────
function poToggleRegion(key) {
  const body   = document.getElementById(`po-body-${key}`);
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
    if (badge) { badge.textContent = 'Đang tải...'; badge.style.background = 'rgba(100,100,100,0.15)'; badge.style.color = 'var(--text-muted)'; }
    if (body)  body.innerHTML = `<div class="po-loading"><span class="po-spinner"></span> Đang tải dữ liệu hôm nay...</div>`;
  });

  await Promise.allSettled(EVN_REGIONS.map(r => loadRegionToday(r)));

  if (icon) icon.style.animation = '';
}

// ── Main render ────────────────────────────────────────────────────────────
export function renderPowerOutage(containerId = 'powerContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="po-dashboard">
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
                <span class="po-region-count" id="po-count-${r.key}" style="background:rgba(100,100,100,0.15);color:var(--text-muted)">Đang tải...</span>
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

      <div class="po-dash-footer">
        📞 <strong>1900 1006</strong> — Tổng đài chăm sóc khách hàng EVN Toàn Quốc
      </div>
    </div>
  `;

  window.poToggleRegion = poToggleRegion;
  window.poRefreshAll   = poRefreshAll;

  poRefreshAll();
}

/** Legacy compat */
export function searchPowerOutage() {}
