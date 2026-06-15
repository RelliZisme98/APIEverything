/**
 * components/power-outage.js
 * In-page power outage lookup via Cloudflare proxy → EVNSPC API
 * Sub-unit dropdowns use static hardcoded data (no proxy needed).
 */

import APP_CONFIG from '../../config.js';
import { EVNSPC_COMPANIES, EVNSPC_SUB_UNITS } from '../data/evnspc-units.js';

const PROXY = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port)
  ? window.location.origin
  : (APP_CONFIG.TRAFFIC_PROXY_URL || window.location.origin);

// ── EVN regions cho tra cứu proxy ──────────────────────────────────────────
const OTHER_EVN = [
  {
    key: 'hanoi', label: 'EVNHANOI – Hà Nội', color: '#60a5fa', hotline: '1900 1288',
    provinces: ['Hà Nội'],
    fields: [
      { id: 'hn_keyword', label: 'Tên khu vực / Quận / Phường', placeholder: 'VD: Hoàn Kiếm, Đống Đa...' },
      { id: 'hn_from',    label: 'Từ ngày', type: 'date' },
      { id: 'hn_to',      label: 'Đến ngày', type: 'date' },
    ],
  },
  {
    key: 'npc', label: 'EVNNPC – Miền Bắc (27 tỉnh)', color: '#a78bfa', hotline: '1900 6769',
    provinces: ['Vĩnh Phúc','Bắc Ninh','Quảng Ninh','Hải Dương','Hải Phòng','Hưng Yên','Thái Bình','Hà Nam','Nam Định','Ninh Bình','Hà Giang','Cao Bằng','Bắc Kạn','Tuyên Quang','Lào Cai','Yên Bái','Thái Nguyên','Lạng Sơn','Bắc Giang','Phú Thọ','Điện Biên','Lai Châu','Sơn La','Hòa Bình','Thanh Hóa','Nghệ An','Hà Tĩnh'],
    fields: [
      { id: 'npc_province', label: 'Tỉnh thành', type: 'province' },
      { id: 'npc_from',     label: 'Từ ngày', type: 'date' },
      { id: 'npc_to',       label: 'Đến ngày', type: 'date' },
      { id: 'npc_makh',     label: 'Mã khách hàng (nếu có)', placeholder: 'VD: PB012345...' },
    ],
  },
  {
    key: 'cpc', label: 'EVNCPC – Miền Trung & Tây Nguyên', color: '#fbbf24', hotline: '1900 1909',
    provinces: ['Đà Nẵng','Quảng Nam','Quảng Ngãi','Bình Định','Phú Yên','Khánh Hòa','Ninh Thuận','Bình Thuận','Kon Tum','Gia Lai','Đắk Lắk','Đắk Nông','Lâm Đồng','Quảng Bình','Quảng Trị','Thừa Thiên Huế'],
    fields: [
      { id: 'cpc_province', label: 'Tỉnh thành', type: 'province' },
      { id: 'cpc_keyword',  label: 'Tên khu vực / Từ khóa', placeholder: 'VD: Ngũ Hành Sơn...' },
      { id: 'cpc_from',     label: 'Từ ngày', type: 'date' },
      { id: 'cpc_to',       label: 'Đến ngày', type: 'date' },
    ],
  },
];

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
      <div class="po-section-label">Tra cứu trực tiếp lịch cúp điện – các vùng khác</div>

      <!-- Sub-tabs for each EVN -->
      <div class="po-evn-tabs" id="poEvnTabs">
        ${OTHER_EVN.map((e, i) => `
          <button class="po-evn-tab ${i === 0 ? 'active' : ''}"
                  onclick="window.poSwitchEvn('${e.key}')"
                  style="--evn-color:${e.color};"
                  data-evn="${e.key}">
            🔌 ${e.label.split('–')[0].trim()}
          </button>`).join('')}
      </div>

      <!-- Forms for each EVN -->
      ${OTHER_EVN.map((evn, i) => `
        <div class="po-evn-form" id="poEvnForm_${evn.key}" style="${i !== 0 ? 'display:none;' : ''}">
          <div class="po-other-meta" style="border-color:${evn.color}30;">
            <span style="color:${evn.color};font-weight:700;">🔌 ${evn.label}</span>
            <span style="font-size:11px;color:var(--text-muted);">📞 Tổng đài: <strong>${evn.hotline}</strong></span>
          </div>
          <div class="po-form-grid">
            ${evn.fields.map(f => {
              if (f.type === 'province') {
                return `<div class="po-field">
                  <label class="po-label">${f.label}</label>
                  <select class="po-select" id="${f.id}">
                    <option value="">-- Chọn tỉnh thành --</option>
                    ${evn.provinces.map(p => `<option value="${p}">${p}</option>`).join('')}
                  </select>
                </div>`;
              } else if (f.type === 'date') {
                const defaultVal = f.id.includes('to')
                  ? new Date(Date.now() + 14*86400000).toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0];
                return `<div class="po-field">
                  <label class="po-label">${f.label}</label>
                  <input class="po-input" type="date" id="${f.id}" value="${defaultVal}" />
                </div>`;
              } else {
                return `<div class="po-field">
                  <label class="po-label">${f.label}</label>
                  <input class="po-input" type="text" id="${f.id}" placeholder="${f.placeholder || ''}" />
                </div>`;
              }
            }).join('')}
          </div>
          <button class="po-search-btn" onclick="window.poSearchOther('${evn.key}')">⚡ Tra cứu lịch cúp điện</button>
          <div id="poOtherResult_${evn.key}" class="po-other-result"></div>

          <!-- Fallback link -->
          <div class="po-other-fallback" style="border-color:${evn.color}20;">
            <span style="font-size:11px;color:var(--text-muted);">Nếu không tìm thấy kết quả, truy cập cổng chính thức:</span>
            <a href="${evn.key === 'hanoi' ? 'https://evnhanoi.vn/search/power-cut' : evn.key === 'npc' ? 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungGiamCungCapDien' : 'https://cskh.cpc.vn/tra-cuu/lich-tam-ngung-cung-cap-dien/khu-vuc'}"
               target="_blank" rel="noopener" class="lot-link" style="font-size:11px;padding:4px 12px;">Cổng tra cứu chính thức ↗</a>
          </div>
        </div>`).join('')}

      <div class="po-hotline" style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:12px;padding:14px;margin-top:16px;">
        <span style="font-size:20px;">📞</span>
        <div>
          <div class="po-hotline-num" style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;color:var(--accent-cyan);">1900 1006</div>
          <div class="po-hotline-sub" style="font-size:11px;color:var(--text-muted);">Tổng đài chăm sóc khách hàng EVN Toàn Quốc</div>
        </div>
      </div>
    </div>
  `;

  // Expose globals
  window.poSwitchTab    = poSwitchTab;
  window.poSwitchMode   = poSwitchMode;
  window.poLoadDienLuc  = poLoadDienLuc;
  window.poSearchByUnit = poSearchByUnit;
  window.poSearchByMakh = poSearchByMakh;
  window.poSwitchEvn    = poSwitchEvn;
  window.poSearchOther  = poSearchOther;
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

// ── Sub-tab switcher for Other EVN regions ────────────────────────────────
function poSwitchEvn(key) {
  OTHER_EVN.forEach(e => {
    const form = document.getElementById(`poEvnForm_${e.key}`);
    const tab  = document.querySelector(`[data-evn="${e.key}"]`);
    if (form) form.style.display = e.key === key ? '' : 'none';
    if (tab)  tab.classList.toggle('active', e.key === key);
  });
}

// ── Search other EVN regions via proxy ───────────────────────────────────
async function poSearchOther(evnKey) {
  const resultEl = document.getElementById(`poOtherResult_${evnKey}`);
  if (!resultEl) return;

  resultEl.innerHTML = `<div class="po-loading">⏳ Đang tra cứu qua proxy ${evnKey.toUpperCase()}...</div>`;

  let url = `${PROXY}/power-outage?evn=${evnKey}`;

  if (evnKey === 'hanoi') {
    const keyword  = document.getElementById('hn_keyword')?.value?.trim() || '';
    const fromDate = document.getElementById('hn_from')?.value || '';
    const toDate   = document.getElementById('hn_to')?.value   || '';
    if (!keyword && !fromDate) {
      resultEl.innerHTML = `<div class="po-error">⚠️ Vui lòng nhập tên khu vực hoặc chọn khoảng thời gian.</div>`;
      return;
    }
    url += `&action=tracuu&keyword=${encodeURIComponent(keyword)}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;

  } else if (evnKey === 'npc') {
    const province = document.getElementById('npc_province')?.value || '';
    const maKH     = document.getElementById('npc_makh')?.value?.trim() || '';
    const fromDate = document.getElementById('npc_from')?.value || '';
    const toDate   = document.getElementById('npc_to')?.value   || '';
    if (!province && !maKH) {
      resultEl.innerHTML = `<div class="po-error">⚠️ Vui lòng chọn tỉnh thành hoặc nhập mã khách hàng.</div>`;
      return;
    }
    url += `&action=tracuu&province=${encodeURIComponent(province)}&maKH=${encodeURIComponent(maKH)}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;

  } else if (evnKey === 'cpc') {
    const province = document.getElementById('cpc_province')?.value || '';
    const keyword  = document.getElementById('cpc_keyword')?.value?.trim() || '';
    const fromDate = document.getElementById('cpc_from')?.value || '';
    const toDate   = document.getElementById('cpc_to')?.value   || '';
    if (!province && !keyword) {
      resultEl.innerHTML = `<div class="po-error">⚠️ Vui lòng chọn tỉnh thành hoặc nhập từ khóa khu vực.</div>`;
      return;
    }
    url += `&action=tracuu&province=${encodeURIComponent(province)}&keyword=${encodeURIComponent(keyword)}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
  }

  try {
    const res  = await fetch(url);
    const body = await res.text();

    // Try JSON first (EVNHANOI, EVNCPC return JSON)
    try {
      const json = JSON.parse(body);
      if (json.error) throw new Error(json.error);

      // Normalise: EVNHANOI & CPC return an array or {data:[...]}
      const items = Array.isArray(json) ? json : (json.data || json.items || json.result || []);
      if (!items.length) {
        resultEl.innerHTML = `<div class="po-empty">📭 Không có lịch cúp điện trong khoảng thời gian này.</div>`;
        return;
      }

      const rows = items.map(it => `
        <tr>
          <td>${it.area || it.khuVuc || it.tenKhuVuc || '—'}</td>
          <td>${it.reason || it.lyDo || it.noiDung || '—'}</td>
          <td>${it.fromDate || it.tuNgay || it.startTime || '—'}</td>
          <td>${it.toDate   || it.denNgay || it.endTime   || '—'}</td>
        </tr>`).join('');

      resultEl.innerHTML = `
        <div class="po-result-wrap animate-fade-in-up">
          <div class="po-result-header">
            <span class="po-result-icon">⚡</span>
            <span class="po-result-title">Lịch cúp điện ${evnKey.toUpperCase()}</span>
            <span class="po-result-count">${items.length} lịch</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="po-table">
              <thead><tr><th>Khu vực</th><th>Lý do</th><th>Từ ngày</th><th>Đến ngày</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`;

    } catch (_) {
      // Fall back to HTML table parsing (EVNNPC)
      renderPoTable(resultEl, body);
    }
  } catch (err) {
    resultEl.innerHTML = `<div class="po-error">⚠️ Không thể kết nối proxy: ${err.message}</div>`;
  }
}
