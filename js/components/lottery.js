/**
 * components/lottery.js — Kết quả xổ số (XSMB / XSMN / XSMT)
 * Nguồn: Worker /lottery → minhngoc.net.vn (parse server-side, no jQuery)
 */

const LOTTERY_REGIONS = [
  { id: 'mien-bac',  label: '🎰 Miền Bắc',  color: '#f87171', drawDays: [0,1,2,3,4,5,6] },
  { id: 'tp-hcm',    label: '🏙️ TP. HCM',   color: '#60a5fa', drawDays: [1,6] },
  { id: 'da-nang',   label: '🌊 Đà Nẵng',    color: '#34d399', drawDays: [3,6] },
  { id: 'dong-nai',  label: '🦋 Đồng Nai',   color: '#fbbf24', drawDays: [3] },
  { id: 'can-tho',   label: '🌾 Cần Thơ',    color: '#a78bfa', drawDays: [4] },
  { id: 'binh-duong',label: '🏗️ Bình Dương', color: '#fb923c', drawDays: [5] },
];

// Special prize label mappings (minhngoc HTML entity cleanup)
const PRIZE_MAP = {
  'gi&#7843;i&#273;b': 'Giải ĐB',
  'gi&#7843;idb': 'Giải ĐB',
  'gi&#7843;i&#273;&#7863;c bi&#7879;t': 'Giải ĐB',
};

let currentLotteryId   = 'mien-bac';
let currentLotteryDate = new Date();

function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function toInputDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isToday(d) {
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function formatDateLabel(d) {
  const copy = new Date(d);
  if (isToday(copy)) return 'Hôm nay';
  const diff = Math.round((new Date().setHours(0,0,0,0) - copy.setHours(0,0,0,0)) / 86400000);
  if (diff === 1) return 'Hôm qua';
  return new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function renderLottery(containerId = 'lotteryContent') {
  const el = document.getElementById(containerId);
  if (!el) return;
  currentLotteryDate = new Date();
  buildUI(el, containerId);
  fetchAndRender();

  window.selectLottery = (id) => {
    currentLotteryId = id;
    buildUI(el, containerId);
    fetchAndRender();
  };
}

function buildUI(el, containerId) {
  const chips = LOTTERY_REGIONS.map(r => {
    const active = r.id === currentLotteryId;
    const clr = r.color;
    return `<button class="lot-chip ${active ? 'active' : ''}"
                    onclick="window.selectLottery('${r.id}')"
                    style="${active ? `border-color:${clr}60;background:${clr}12;color:${clr};` : ''}">${r.label}</button>`;
  }).join('');

  const todayStr = toInputDate(new Date());

  el.innerHTML = `
    <div class="lot-chips">${chips}</div>
    <div class="lot-date-nav">
      <button class="lot-nav-btn" onclick="window.lotNavDate(-1)">◀ Ngày trước</button>
      <div class="lot-date-center">
        <input type="date" id="lotDatePicker" class="lot-date-input"
               value="${toInputDate(currentLotteryDate)}" max="${todayStr}"
               onchange="window.lotPickDate(this.value)">
        <div class="lot-date-label" id="lotDateLabel">${formatDateLabel(currentLotteryDate)}</div>
      </div>
      <button class="lot-nav-btn" id="lotNextBtn" onclick="window.lotNavDate(1)"
              ${isToday(currentLotteryDate) ? 'disabled' : ''}>Ngày sau ▶</button>
    </div>
    <div id="lotteryData"><div class="lot-loading">🎱 Đang tải kết quả...</div></div>`;

  window.lotNavDate = (delta) => {
    const d = new Date(currentLotteryDate);
    d.setDate(d.getDate() + delta);
    if (d > new Date()) return;
    currentLotteryDate = d;
    syncDateUI();
    fetchAndRender();
  };

  window.lotPickDate = (val) => {
    const d = new Date(val + 'T00:00:00');
    if (d > new Date()) return;
    currentLotteryDate = d;
    syncDateUI();
    fetchAndRender();
  };
}

function syncDateUI() {
  const d = currentLotteryDate;
  const lbl = document.getElementById('lotDateLabel');
  const btn = document.getElementById('lotNextBtn');
  const picker = document.getElementById('lotDatePicker');
  if (lbl) lbl.textContent = formatDateLabel(d);
  if (btn) btn.disabled = isToday(d);
  if (picker) picker.value = toInputDate(d);
}

// Draw times by region (ICT = UTC+7)
const DRAW_TIMES = {
  'mien-bac':   '18:10',
  'tp-hcm':     '16:10',
  'da-nang':    '17:10',
  'dong-nai':   '16:00',
  'can-tho':    '16:10',
  'binh-duong': '16:10',
};

async function fetchAndRender() {
  const region = LOTTERY_REGIONS.find(r => r.id === currentLotteryId);
  if (!region) return;
  const el = document.getElementById('lotteryData');
  if (!el) return;

  el.innerHTML = `<div class="lot-loading">🎱 Đang tải kết quả ${region.label}...</div>`;

  const todayRequested = isToday(currentLotteryDate);
  const dateStr = todayRequested ? '' : formatDate(currentLotteryDate);
  const url = `/lottery?region=${region.id}${dateStr ? '&date=' + dateStr : ''}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    // ── Date mismatch: minhngoc returned previous day because today not drawn yet ──
    if (todayRequested && data.prizes?.length) {
      const returnedDate = (data.date ?? '').replace(/\//g, '-'); // normalize to DD-MM-YYYY
      const todayFormatted = formatDate(new Date());              // DD-MM-YYYY
      // minhngoc returns date as DD/MM/YYYY or value="DD-MM-YYYY"
      const normalizeD = (s) => s.replace(/\//g,'-');
      if (normalizeD(returnedDate) !== normalizeD(todayFormatted)) {
        // Results belong to another day — today not drawn yet
        const drawTime = DRAW_TIMES[currentLotteryId] ?? '18:10';
        el.innerHTML = `
          <div class="lot-wrap">
            <div class="lot-header" style="border-color:${region.color}30;background:${region.color}06;">
              <span style="color:${region.color};">${region.label}</span>
              <span class="lot-date">${new Date().toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' })}</span>
            </div>
            <div style="text-align:center;padding:30px;">
              <div style="font-size:36px;margin-bottom:10px;">⏳</div>
              <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">Chưa có kết quả hôm nay</div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;">
                Dự kiến quay lúc <strong style="color:${region.color};">${drawTime}</strong> (giờ Việt Nam)
              </div>
              <button class="lot-nav-btn" onclick="window.lotNavDate(-1)" style="background:${region.color}12;border-color:${region.color}40;color:${region.color};">
                ◀ Xem kết quả hôm qua
              </button>
            </div>
          </div>`;
        return;
      }
    }

    if (data.error || !data.prizes?.length) {
      const drawDay = region.drawDays.indexOf(currentLotteryDate.getDay()) === -1;
      el.innerHTML = `
        <div class="lot-wrap">
          <div class="lot-header" style="border-color:${region.color}30;">
            <span>${region.label}</span>
            <span class="lot-date">${new Date(currentLotteryDate).toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' })}</span>
          </div>
          <div style="text-align:center;padding:30px;color:var(--text-muted);">
            ${drawDay ? '📅 Ngày này không có lịch quay xổ số' : `⏳ Chưa có kết quả (quay lúc ${DRAW_TIMES[currentLotteryId] ?? '18:10'})`}
          </div>
          <div style="text-align:center;padding-bottom:14px;">
            <a href="https://www.minhngoc.net.vn/${region.id}/" target="_blank" class="lot-link">🔗 Xem tại minhngoc.net.vn</a>
          </div>
        </div>`;
      return;
    }

    renderPrizes(el, data, region);
  } catch (err) {
    el.innerHTML = `<div class="error-msg">⚠️ Lỗi tải dữ liệu: ${err.message}</div>`;
  }
}

function cleanLabel(raw) {
  return raw
    .replace(/&agrave;/gi,'à').replace(/&igrave;/gi,'ì').replace(/&aacute;/gi,'á')
    .replace(/&eacute;/gi,'é').replace(/&ocirc;/gi,'ô').replace(/&ucirc;/gi,'û')
    .replace(/&#273;/gi,'đ').replace(/&#7843;/gi,'ả').replace(/&#7863;/gi,'ặ')
    .replace(/&#7879;/gi,'ệ').replace(/&nbsp;/gi,' ').replace(/<[^>]+>/g,'').trim();
}

function renderPrizes(el, data, region) {
  const isDB = (label) => /đặc biệt|đb|db/i.test(label);

  const rows = data.prizes.map(p => {
    const label  = cleanLabel(p.label);
    const db     = isDB(label);
    const nums   = p.numbers.split(/[\s,\-]+/).filter(n => /^\d+$/.test(n));
    const numHtml = nums.map(n =>
      `<span class="lot-num ${db ? 'lot-num--db' : ''}" style="${db ? `border-color:${region.color}40;background:${region.color}15;color:${region.color};` : ''}">${n}</span>`
    ).join('');
    return `
      <tr class="lot-row ${db ? 'lot-row--db' : ''}">
        <td class="lot-prize-name" style="${db ? `color:${region.color};font-weight:800;` : ''}">${label}</td>
        <td class="lot-prize-nums">${numHtml || p.numbers}</td>
      </tr>`;
  }).join('');

  const dateDisplay = new Date(currentLotteryDate).toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  });

  el.innerHTML = `
    <div class="lot-wrap">
      <div class="lot-header" style="border-color:${region.color}40;background:${region.color}08;">
        <span style="color:${region.color};">${region.label}</span>
        <span class="lot-date">${dateDisplay}</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="lot-table">
          <thead><tr><th style="width:120px;">Giải</th><th>Kết quả</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="lot-footer">
        <a href="https://www.minhngoc.net.vn/${region.id}/" target="_blank" class="lot-link">
          🔗 Xem đầy đủ tại minhngoc.net.vn
        </a>
      </div>
    </div>`;
}
