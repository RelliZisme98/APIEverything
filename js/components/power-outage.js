/**
 * components/power-outage.js
 * In-page power outage lookup via Cloudflare proxy → EVNSPC API
 * Sub-unit dropdowns use static hardcoded data (no proxy needed).
 */

import APP_CONFIG from '../../config.js';
import { EVNSPC_COMPANIES, EVNSPC_SUB_UNITS } from '../data/evnspc-units.js';

const PROXY = APP_CONFIG.TRAFFIC_PROXY_URL || 'https://everything.rellia.org';

// ── EVN units cho các vùng khác ────────────────────────────────────────────
const OTHER_UNITS = {
  EVNHCMC:  { label: 'EVNHCMC – TP. Hồ Chí Minh',  url: 'https://cskh.evnhcmc.vn/tracuu/tabid/96/Default.aspx',            color: '#34d399' },
  EVNHANOI: { label: 'EVNHANOI – Hà Nội',            url: 'https://cskh.evnhanoi.com.vn/TraCuu/LichNgungCungCapDien',        color: '#60a5fa' },
  EVNNPC:   { label: 'EVNNPC – miền Bắc (19 tỉnh)', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien',       color: '#a78bfa' },
  EVNCPC:   { label: 'EVNCPC – miền Trung & Tây Nguyên', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien',     color: '#fbbf24' },
};

function fmtDate(d) {
  // dd-mm-yyyy
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function dateRange(days = 14) {
  const now = new Date();
  const end = new Date(now); end.setDate(end.getDate() + days);
  return { from: fmtDate(now), to: fmtDate(end) };
}

// ─────────────────────────────────────────────────────────────────────────────
export function renderPowerOutage(containerId = 'powerContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  const { from, to } = dateRange(14);

  el.innerHTML = `
    <!-- ── Tab switcher ── -->
    <div class="po-tabs">
      <button class="po-tab active" id="poTabEvnspc" onclick="poSwitchTab('evnspc')">🌴 EVNSPC (miền Nam)</button>
      <button class="po-tab" id="poTabOther" onclick="poSwitchTab('other')">🗺️ Vùng khác</button>
    </div>

    <!-- ══ EVNSPC Panel ══ -->
    <div id="poPanelEvnspc" class="po-panel">
      <div class="po-section-label">Tra cứu trực tiếp – dữ liệu từ EVNSPC</div>

      <!-- Mode tabs -->
      <div class="po-mode-tabs">
        <button class="po-mode-tab active" id="poModeUnit" onclick="poSwitchMode('unit')">Theo đơn vị quản lý</button>
        <button class="po-mode-tab" id="poModeMakh" onclick="poSwitchMode('makh')">Theo mã khách hàng</button>
      </div>

      <!-- Form: by unit -->
      <div id="poFormUnit">
        <div class="po-form-grid">
          <div class="po-field">
            <label class="po-label">Công ty Điện lực</label>
            <select class="po-select" id="poCompanySelect" onchange="poLoadDienLuc()">
              <option value="">-- Chọn Công ty Điện lực --</option>
              ${EVNSPC_COMPANIES.map(c => `<option value="${c.ma}">${c.ten}</option>`).join('')}
            </select>
          </div>
          <div class="po-field">
            <label class="po-label">Điện lực / Huyện</label>
            <select class="po-select" id="poDienLucSelect">
              <option value="">-- Chọn Công ty trước --</option>
            </select>
          </div>
          <div class="po-field">
            <label class="po-label">Từ ngày</label>
            <input class="po-input" type="date" id="poFromDate" value="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="po-field">
            <label class="po-label">Đến ngày</label>
            <input class="po-input" type="date" id="poToDate" value="${new Date(Date.now()+14*86400000).toISOString().split('T')[0]}" />
          </div>
        </div>
        <button class="po-search-btn" onclick="poSearchByUnit()">⚡ Tra cứu lịch cúp điện</button>
      </div>

      <!-- Form: by customer ID -->
      <div id="poFormMakh" style="display:none;">
        <div class="po-form-grid">
          <div class="po-field" style="grid-column:1/-1;">
            <label class="po-label">Mã khách hàng <span style="color:var(--text-muted);font-weight:400;">(in trên hóa đơn tiền điện)</span></label>
            <input class="po-input" type="text" id="poMaKHInput" placeholder="VD: PE0012345678" />
          </div>
          <div class="po-field">
            <label class="po-label">Từ ngày</label>
            <input class="po-input" type="date" id="poFromDateMakh" value="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="po-field">
            <label class="po-label">Đến ngày</label>
            <input class="po-input" type="date" id="poToDateMakh" value="${new Date(Date.now()+14*86400000).toISOString().split('T')[0]}" />
          </div>
        </div>
        <button class="po-search-btn" onclick="poSearchByMakh()">⚡ Tra cứu theo mã khách hàng</button>
      </div>

      <!-- Result area -->
      <div id="poResult"></div>
    </div>

    <!-- ══ Other regions panel ══ -->
    <div id="poPanelOther" class="po-panel" style="display:none;">
      <div class="po-section-label">Chọn đơn vị điện lực theo khu vực</div>
      <div class="po-other-grid">
        ${Object.entries(OTHER_UNITS).map(([key, u]) => `
          <a class="po-other-card" href="${u.url}" target="_blank" rel="noopener" style="border-color:${u.color}30;background:${u.color}08;">
            <div class="po-other-card-title" style="color:${u.color};">${u.label}</div>
            <div class="po-other-card-sub">Mở trang tra cứu chính thức ↗</div>
          </a>`).join('')}
      </div>
      <div class="po-hotline">
        <span>📞</span>
        <div><div class="po-hotline-num">19001006</div><div class="po-hotline-sub">Hotline EVN 24/7 · Miễn phí</div></div>
      </div>
    </div>
  `;

  // Expose globals
  window.poSwitchTab    = poSwitchTab;
  window.poSwitchMode   = poSwitchMode;
  window.poLoadDienLuc  = poLoadDienLuc;
  window.poSearchByUnit = poSearchByUnit;
  window.poSearchByMakh = poSearchByMakh;
}

// ── Tab switcher ──────────────────────────────────────────────────────────
function poSwitchTab(tab) {
  document.getElementById('poPanelEvnspc').style.display = tab === 'evnspc' ? '' : 'none';
  document.getElementById('poPanelOther').style.display  = tab === 'other'  ? '' : 'none';
  document.getElementById('poTabEvnspc').classList.toggle('active', tab === 'evnspc');
  document.getElementById('poTabOther').classList.toggle('active',  tab === 'other');
}

// ── Mode switcher ─────────────────────────────────────────────────────────
function poSwitchMode(mode) {
  document.getElementById('poFormUnit').style.display  = mode === 'unit' ? '' : 'none';
  document.getElementById('poFormMakh').style.display  = mode === 'makh' ? '' : 'none';
  document.getElementById('poModeUnit').classList.toggle('active', mode === 'unit');
  document.getElementById('poModeMakh').classList.toggle('active', mode === 'makh');
}

// ── Load sub-dropdown: Điện lực theo Công ty (từ dữ liệu tĩnh) ──────────
function poLoadDienLuc() {
  const maCty  = document.getElementById('poCompanySelect')?.value;
  const select = document.getElementById('poDienLucSelect');
  if (!select) return;

  if (!maCty) {
    select.innerHTML = '<option value="">-- Chọn Công ty trước --</option>';
    return;
  }

  const subs = EVNSPC_SUB_UNITS[maCty] || [];
  if (subs.length === 0) {
    select.innerHTML = `<option value="${maCty}">-- Toàn bộ khu vực --</option>`;
    return;
  }

  select.innerHTML = '<option value="">-- Chọn Điện lực / Huyện --</option>'
    + subs.map(s => `<option value="${s.ma}">${s.ten}</option>`).join('');
}

// ── Search by unit ────────────────────────────────────────────────────────
async function poSearchByUnit() {
  const madvi   = document.getElementById('poDienLucSelect')?.value
               || document.getElementById('poCompanySelect')?.value;
  const fromRaw = document.getElementById('poFromDate')?.value;
  const toRaw   = document.getElementById('poToDate')?.value;
  const result  = document.getElementById('poResult');

  if (!madvi) { showPoError(result, 'Vui lòng chọn Điện lực trước khi tra cứu.'); return; }
  if (!fromRaw || !toRaw) { showPoError(result, 'Vui lòng chọn khoảng thời gian.'); return; }

  const tuNgay  = fromRaw.split('-').reverse().join('-'); // yyyy-mm-dd → dd-mm-yyyy
  const denNgay = toRaw.split('-').reverse().join('-');

  await doSearch(result, `${PROXY}/power-outage?action=tracuu&madvi=${encodeURIComponent(madvi)}&tuNgay=${encodeURIComponent(tuNgay)}&denNgay=${encodeURIComponent(denNgay)}`);
}

// ── Search by customer ID ─────────────────────────────────────────────────
async function poSearchByMakh() {
  const maKH    = document.getElementById('poMaKHInput')?.value?.trim();
  const fromRaw = document.getElementById('poFromDateMakh')?.value;
  const toRaw   = document.getElementById('poToDateMakh')?.value;
  const result  = document.getElementById('poResult');

  if (!maKH) { showPoError(result, 'Vui lòng nhập mã khách hàng.'); return; }

  const tuNgay  = fromRaw.split('-').reverse().join('-');
  const denNgay = toRaw.split('-').reverse().join('-');

  await doSearch(result, `${PROXY}/power-outage?action=tracuu-makh&maKH=${encodeURIComponent(maKH)}&tuNgay=${encodeURIComponent(tuNgay)}&denNgay=${encodeURIComponent(denNgay)}`);
}

// ── Core search + render ──────────────────────────────────────────────────
async function doSearch(result, url) {
  result.innerHTML = `<div class="po-loading">⏳ Đang tra cứu dữ liệu từ EVNSPC...</div>`;

  try {
    const res  = await fetch(url);
    const html = await res.text();

    if (!html || html.trim() === '' || html.includes('"error"')) {
      result.innerHTML = `<div class="po-empty">📭 Không tìm thấy lịch cúp điện trong khoảng thời gian này.</div>`;
      return;
    }

    // Parse và render bảng từ HTML response
    renderPoTable(result, html);
  } catch (err) {
    showPoError(result, `Không thể kết nối proxy: ${err.message}. Đảm bảo Cloudflare Function đã deploy.`);
  }
}

// ── Parse HTML response → render table ───────────────────────────────────
function renderPoTable(el, html) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(html, 'text/html');

  // EVNSPC trả về bảng HTML hoặc JSON
  const rows = doc.querySelectorAll('tr');

  if (rows.length <= 1) {
    el.innerHTML = `<div class="po-empty">📭 Không có lịch cúp điện trong khoảng thời gian đã chọn.</div>`;
    return;
  }

  // Build clean table
  let tableHtml = `
    <div class="po-result-wrap animate-fade-in-up">
      <div class="po-result-header">
        <span class="po-result-icon">⚡</span>
        <span class="po-result-title">Kết quả lịch cúp điện</span>
        <span class="po-result-count">${rows.length - 1} lịch</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="po-table">
          <thead><tr>`;

  // Header row
  const headerCells = rows[0].querySelectorAll('th, td');
  headerCells.forEach(th => {
    tableHtml += `<th>${th.textContent.trim()}</th>`;
  });
  tableHtml += `</tr></thead><tbody>`;

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll('td');
    if (!cells.length) continue;
    tableHtml += `<tr>`;
    cells.forEach(td => {
      tableHtml += `<td>${td.textContent.trim()}</td>`;
    });
    tableHtml += `</tr>`;
  }

  tableHtml += `</tbody></table></div></div>`;
  el.innerHTML = tableHtml;
}

function showPoError(el, msg) {
  el.innerHTML = `<div class="po-error">⚠️ ${msg}</div>`;
}

/** Legacy compat */
export function searchPowerOutage() {}
