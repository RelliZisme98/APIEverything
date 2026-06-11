/**
 * components/lottery.js — Kết quả xổ số (XSMB / XSMN / XSMT)
 * Nguồn: minhngoc.net.vn — hỗ trợ xem theo ngày
 */

const LOTTERY_REGIONS = [
  {
    id: 'mien-bac', label: '🎰 Miền Bắc', shortLabel: 'MB',
    drawDays: [0,1,2,3,4,5,6], // hàng ngày
    color: '#f87171',
    scriptBase: 'https://www.minhngoc.net.vn/getkqxs/mien-bac',
  },
  {
    id: 'tp-hcm', label: '🏙️ TP. HCM', shortLabel: 'HCM',
    drawDays: [1,6], // thứ 2, thứ 7
    color: '#60a5fa',
    scriptBase: 'https://www.minhngoc.net.vn/getkqxs/tp-hcm',
  },
  {
    id: 'da-nang', label: '🌊 Đà Nẵng', shortLabel: 'ĐN',
    drawDays: [3,6], // thứ 4, thứ 7
    color: '#34d399',
    scriptBase: 'https://www.minhngoc.net.vn/getkqxs/da-nang',
  },
  {
    id: 'dong-nai', label: '🦋 Đồng Nai', shortLabel: 'ĐNai',
    drawDays: [3], // thứ 4
    color: '#fbbf24',
    scriptBase: 'https://www.minhngoc.net.vn/getkqxs/dong-nai',
  },
  {
    id: 'can-tho', label: '🌾 Cần Thơ', shortLabel: 'CT',
    drawDays: [4], // thứ 5
    color: '#a78bfa',
    scriptBase: 'https://www.minhngoc.net.vn/getkqxs/can-tho',
  },
];

let currentLotteryId   = 'mien-bac';
let currentLotteryDate = new Date(); // default = today

function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function toInputDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function isToday(d) {
  const now = new Date();
  return d.getDate() === now.getDate() &&
         d.getMonth() === now.getMonth() &&
         d.getFullYear() === now.getFullYear();
}

export function renderLottery(containerId = 'lotteryContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  currentLotteryDate = new Date(); // reset to today
  buildLotteryUI(el, containerId);
  loadLotteryData(currentLotteryId, currentLotteryDate);

  window.selectLottery = (id) => {
    currentLotteryId = id;
    buildLotteryUI(el, containerId);
    loadLotteryData(id, currentLotteryDate);
  };
}

function buildLotteryUI(el, containerId) {
  const chips = LOTTERY_REGIONS.map(r => `
    <button class="lot-chip ${r.id === currentLotteryId ? 'active' : ''}"
            onclick="window.selectLottery('${r.id}')"
            style="${r.id === currentLotteryId ? `border-color:${LOTTERY_REGIONS.find(x=>x.id===r.id)?.color}60;` : ''}">${r.label}</button>`).join('');

  const today = new Date();
  const todayStr = toInputDate(today);

  el.innerHTML = `
    <div class="lot-chips">${chips}</div>

    <!-- Date navigation -->
    <div class="lot-date-nav">
      <button class="lot-nav-btn" id="lotPrevBtn" onclick="window.lotNavDate(-1)">◀ Ngày trước</button>
      <div class="lot-date-center">
        <input type="date" id="lotDatePicker" class="lot-date-input"
               value="${todayStr}" max="${todayStr}"
               onchange="window.lotPickDate(this.value)">
        <div class="lot-date-label" id="lotDateLabel">${formatDateLabel(today)}</div>
      </div>
      <button class="lot-nav-btn" id="lotNextBtn" onclick="window.lotNavDate(1)"
              ${isToday(currentLotteryDate) ? 'disabled' : ''}>Ngày sau ▶</button>
    </div>

    <div id="lotteryData">
      <div class="lot-loading">🎱 Đang tải kết quả...</div>
    </div>`;

  // Navigation handlers
  window.lotNavDate = (delta) => {
    const d = new Date(currentLotteryDate);
    d.setDate(d.getDate() + delta);
    if (d > new Date()) return; // không cho chọn tương lai
    currentLotteryDate = d;
    updateDateUI();
    loadLotteryData(currentLotteryId, d);
  };

  window.lotPickDate = (val) => {
    const d = new Date(val + 'T00:00:00');
    if (d > new Date()) return;
    currentLotteryDate = d;
    updateDateUI();
    loadLotteryData(currentLotteryId, d);
  };
}

function updateDateUI() {
  const d = currentLotteryDate;
  const label = document.getElementById('lotDateLabel');
  const nextBtn = document.getElementById('lotNextBtn');
  const picker = document.getElementById('lotDatePicker');
  if (label) label.textContent = formatDateLabel(d);
  if (nextBtn) nextBtn.disabled = isToday(d);
  if (picker) picker.value = toInputDate(d);
}

function formatDateLabel(d) {
  if (isToday(d)) return 'Hôm nay';
  const diff = Math.round((new Date().setHours(0,0,0,0) - d.setHours(0,0,0,0)) / 86400000);
  if (diff === 1) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Load lottery data from minhngoc ───────────────────────────────
function loadLotteryData(regionId, date) {
  const region = LOTTERY_REGIONS.find(r => r.id === regionId);
  if (!region) return;

  const targetEl = document.getElementById('lotteryData');
  if (!targetEl) return;
  targetEl.innerHTML = `<div class="lot-loading">🎱 Đang tải...</div>`;

  // Ensure capture div exists
  const captureId = 'box_kqxs_minhngoc';
  let captureDiv = document.getElementById(captureId);
  if (!captureDiv) {
    captureDiv = document.createElement('div');
    captureDiv.id = captureId;
    captureDiv.style.cssText = 'display:none;position:absolute;left:-9999px;';
    document.body.appendChild(captureDiv);
  }
  captureDiv.innerHTML = '';

  // Build URL — today uses /regionId.js, past uses /regionId/DD-MM-YYYY.js
  const dateStr = formatDate(date);
  const scriptUrl = isToday(date)
    ? `${region.scriptBase}.js?_t=${Date.now()}`
    : `${region.scriptBase}/${dateStr}.js?_t=${Date.now()}`;

  // Remove old script
  const old = document.getElementById('lotteryScript');
  if (old) old.remove();

  const script = document.createElement('script');
  script.id = 'lotteryScript';
  script.src = scriptUrl;
  script.onload = () => {
    setTimeout(() => parseMinhngocResult(captureDiv, targetEl, region, date), 400);
  };
  script.onerror = () => {
    targetEl.innerHTML = `
      <div class="lot-wrap">
        <div class="lot-header" style="border-color:${region.color}30;">
          <span>${region.label}</span>
          <span class="lot-date">${date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        </div>
        <div style="text-align:center;padding:30px;color:var(--text-muted);">
          📅 Không có kết quả cho ngày này${region.drawDays.indexOf(date.getDay()) === -1 ? ' (không có lịch quay)' : ''}
        </div>
        <div style="text-align:center;padding-bottom:14px;">
          <a href="https://www.minhngoc.net.vn/${regionId}/" target="_blank" class="lot-link">🔗 Xem tại minhngoc.net.vn</a>
        </div>
      </div>`;
  };
  document.head.appendChild(script);
}

function parseMinhngocResult(sourceEl, targetEl, region, date) {
  const tables = sourceEl.querySelectorAll('table');

  if (!tables.length || sourceEl.innerHTML.length < 100) {
    targetEl.innerHTML = `
      <div class="lot-wrap">
        <div class="lot-header" style="border-color:${region.color}30;">
          <span>${region.label}</span>
          <span class="lot-date">${date.toLocaleDateString('vi-VN')}</span>
        </div>
        <div style="text-align:center;padding:30px;color:var(--text-muted);">
          📅 Chưa có kết quả${isToday(date) ? ' (có thể chưa đến giờ quay)' : ''}
        </div>
        <div style="text-align:center;padding-bottom:14px;">
          <a href="https://www.minhngoc.net.vn/${region.id}/" target="_blank" class="lot-link">🔗 Xem đầy đủ</a>
        </div>
      </div>`;
    return;
  }

  // Extract prize rows
  const rows = [];
  tables[0]?.querySelectorAll('tr').forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 2) return;
    const label = tds[0].textContent.trim();
    const val   = tds[1].textContent.trim();
    if (label && val && (label.includes('Giải') || label.includes('DB') || label.includes('ĐB'))) {
      rows.push({ label, val });
    }
  });

  // If couldn't parse rows, show raw table with styling
  if (!rows.length) {
    targetEl.innerHTML = `
      <div class="lot-wrap">
        <div class="lot-header" style="border-color:${region.color}40;background:${region.color}08;">
          <span>${region.label}</span>
          <span class="lot-date">${date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        </div>
        <div class="lot-raw">${tables[0].outerHTML}</div>
        <div style="text-align:center;padding:12px;">
          <a href="https://www.minhngoc.net.vn/${region.id}/" target="_blank" class="lot-link">🔗 Xem đầy đủ</a>
        </div>
      </div>`;
    return;
  }

  const rowHtml = rows.map(r => {
    const isDB = /đặc|đb/i.test(r.label);
    const nums = r.val.split(/[-\s]+/).filter(Boolean);
    const numHtml = nums.map(n => `<span class="lot-num ${isDB ? 'lot-num--db' : ''}">${n}</span>`).join('');
    return `
      <tr class="lot-row ${isDB ? 'lot-row--db' : ''}">
        <td class="lot-prize-name" style="${isDB ? `color:${region.color};font-weight:800;` : ''}">${r.label}</td>
        <td class="lot-prize-nums">${numHtml}</td>
      </tr>`;
  }).join('');

  const dateStr = date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  targetEl.innerHTML = `
    <div class="lot-wrap">
      <div class="lot-header" style="border-color:${region.color}40;background:${region.color}08;">
        <span style="color:${region.color};">${region.label}</span>
        <span class="lot-date">${dateStr}</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="lot-table">
          <thead>
            <tr>
              <th style="width:120px;">Giải</th>
              <th>Kết quả</th>
            </tr>
          </thead>
          <tbody>${rowHtml}</tbody>
        </table>
      </div>
      <div class="lot-footer">
        <a href="https://www.minhngoc.net.vn/${region.id}/" target="_blank" class="lot-link">
          🔗 Xem đầy đủ tại minhngoc.net.vn
        </a>
      </div>
    </div>`;
}
