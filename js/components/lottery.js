/**
 * components/lottery.js — Kết quả xổ số (XSMB / XSMN / XSMT + Vietlott)
 * Nguồn: Worker /lottery + /vietlott
 */

const LOTTERY_REGIONS = [
  { id: 'mien-bac',  label: '🎰 Miền Bắc',  color: '#f87171', drawDays: [0,1,2,3,4,5,6] },
  { id: 'tp-hcm',    label: '🏙️ TP. HCM',   color: '#60a5fa', drawDays: [1,6] },
  { id: 'da-nang',   label: '🌊 Đà Nẵng',    color: '#34d399', drawDays: [3,6] },
  { id: 'dong-nai',  label: '🦋 Đồng Nai',   color: '#fbbf24', drawDays: [3] },
  { id: 'can-tho',   label: '🌾 Cần Thơ',    color: '#a78bfa', drawDays: [4] },
  { id: 'binh-duong',label: '🏗️ Bình Dương', color: '#fb923c', drawDays: [5] },
];

const VIETLOTT_GAMES = [
  { id: 'power655', label: '⚡ Power 6/55', color: '#f43f5e', desc: 'Thứ 3, 5, 7 hàng tuần' },
  { id: 'mega645', label: '💎 Mega 6/45',  color: '#8b5cf6', desc: 'Thứ 4, 6, CN hàng tuần' },
  { id: 'max4d',   label: '🎯 Max 4D',     color: '#0ea5e9', desc: 'Thứ 2, 4, 6 hàng tuần' },
  { id: 'keno',    label: '🎲 Keno',       color: '#10b981', desc: 'Hàng ngày' },
];

let currentLotteryId   = 'mien-bac';
let currentLotteryMode = 'traditional'; // 'traditional' | 'vietlott'
let currentLotteryDate = new Date();
let currentVietlottGame = 'power655';
let lastTraditionalData = null;
let currentTraditionalTab = 'result'; // 'result' | 'stats' | 'predict'

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
  currentTraditionalTab = 'result';
  lastTraditionalData = null;
  buildUI(el, containerId);
  fetchAndRender();

  window.selectLottery = (id) => {
    currentLotteryMode = 'traditional';
    currentLotteryId = id;
    currentTraditionalTab = 'result';
    lastTraditionalData = null;
    buildUI(el, containerId);
    fetchAndRender();
  };

  window.selectVietlott = (gameId) => {
    currentLotteryMode = 'vietlott';
    currentVietlottGame = gameId;
    buildUI(el, containerId);
    renderSubTabBar();
    fetchVietlott();
  };
}


function buildUI(el, containerId) {
  const tradChips = LOTTERY_REGIONS.map(r => {
    const active = currentLotteryMode === 'traditional' && r.id === currentLotteryId;
    const clr = r.color;
    return `<button class="lot-chip ${active ? 'active' : ''}"
                    onclick="window.selectLottery('${r.id}')"
                    style="${active ? `border-color:${clr}60;background:${clr}12;color:${clr};` : ''}">${r.label}</button>`;
  }).join('');

  const vietlottChips = VIETLOTT_GAMES.map(g => {
    const active = currentLotteryMode === 'vietlott' && g.id === currentVietlottGame;
    const clr = g.color;
    return `<button class="lot-chip ${active ? 'active' : ''}"
                    onclick="window.selectVietlott('${g.id}')"
                    style="${active ? `border-color:${clr}60;background:${clr}12;color:${clr};` : ''}">${g.label}</button>`;
  }).join('');

  const todayStr = toInputDate(new Date());

  el.innerHTML = `
    <div class="lot-mode-tabs">
      <button class="lot-mode-tab ${currentLotteryMode === 'traditional' ? 'active' : ''}" onclick="window.selectLottery('${currentLotteryId}')">🎰 Xổ Số Truyền Thống</button>
      <button class="lot-mode-tab ${currentLotteryMode === 'vietlott' ? 'active' : ''}" onclick="window.selectVietlott('${currentVietlottGame}')">✨ Vietlott</button>
    </div>

    <div class="lot-chips" style="margin-top:10px;">
      ${currentLotteryMode === 'traditional' ? tradChips : vietlottChips}
    </div>

    ${currentLotteryMode === 'traditional' ? `
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
    </div>` : `
    <div class="lot-vietlott-desc" style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">
      ${VIETLOTT_GAMES.find(g => g.id === currentVietlottGame)?.desc ?? ''}
    </div>`}

    <div id="lotSubTabBar" class="vl-tab-bar" style="margin-bottom: 12px;"></div>

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

  const subTabBar = document.getElementById('lotSubTabBar');
  if (subTabBar) subTabBar.innerHTML = '';

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

    lastTraditionalData = data;
    renderSubTabBar();

    if (currentTraditionalTab === 'result') {
      renderPrizes(el, data, region);
    } else if (currentTraditionalTab === 'stats') {
      renderTraditionalStats(el, data, region);
    } else if (currentTraditionalTab === 'predict') {
      renderTraditionalPredict(el, data, region);
    }
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
// ── Vietlott fetch & render ─────────────────────────────────────────
async function fetchVietlott() {
  const dataDiv = document.getElementById('lotteryData');
  if (!dataDiv) return;
  dataDiv.innerHTML = '<div class="lot-loading">✨ Đang tải kết quả Vietlott...</div>';

  const game = VIETLOTT_GAMES.find(g => g.id === currentVietlottGame) ?? VIETLOTT_GAMES[0];

  try {
    const res = await fetch(`/vietlott?game=${currentVietlottGame}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    const nums = Array.isArray(data.numbers) ? data.numbers : [];
    const jackpot = data.jackpot ? Number(data.jackpot).toLocaleString('vi-VN') + ' đ' : '—';
    const nextJP  = data.nextJackpot ? Number(data.nextJackpot).toLocaleString('vi-VN') + ' đ' : '';
    const drawCode = data.drawCode ? `Kỳ quay: <strong>#${data.drawCode}</strong> ·` : '';

    const numBalls = nums.map((n, i) => {
      const isLast = i === nums.length - 1 && (currentVietlottGame === 'power655' || currentVietlottGame === 'mega645');
      return `<span class="vl-ball ${isLast ? 'vl-ball--power' : ''}" style="background:${isLast ? game.color+'30' : 'rgba(255,255,255,0.08)'};border:2px solid ${isLast ? game.color+'60' : 'rgba(255,255,255,0.1)'};color:${isLast ? game.color : 'var(--text-primary)'};">${String(n).padStart(2,'0')}</span>`;
    }).join('');

    dataDiv.innerHTML = `
      <div class="vl-result-card" style="border-color:${game.color}30;background:${game.color}06;">
        <div class="vl-header">
          <div class="vl-title" style="color:${game.color};">${game.label}</div>
          <div class="vl-date">${drawCode} Ngày: ${data.drawDate || 'N/A'}</div>
        </div>

        <div class="vl-balls-wrap">
          ${numBalls.length ? numBalls : '<div style="color:var(--text-muted);padding:20px;text-align:center;">Chưa có kết quả hôm nay. Vui lòng thử lại sau khi quay số.</div>'}
          ${currentVietlottGame !== 'keno' && nums.length > 1 ? `
          <div style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">
            ${currentVietlottGame === 'power655' || currentVietlottGame === 'mega645' ? '⭐ = Số đặc biệt (Power/Mega)' : ''}
          </div>` : ''}
        </div>

        <div class="vl-jackpot-row">
          <div class="vl-jackpot-card">
            <div class="vl-jackpot-label">💰 Jackpot kỳ này</div>
            <div class="vl-jackpot-val" style="color:${game.color};">${jackpot}</div>
          </div>
          ${nextJP ? `<div class="vl-jackpot-card">
            <div class="vl-jackpot-label">🚀 Jackpot kỳ sau (ước tính)</div>
            <div class="vl-jackpot-val">${nextJP}</div>
          </div>` : ''}
        </div>

        <div class="vl-footer">
          <a href="https://www.vietlott.vn" target="_blank" rel="noopener" class="lot-link">🔗 Vietlott chính thức</a>
        </div>
      </div>`;
  } catch (err) {
    dataDiv.innerHTML = `
      <div class="vl-result-card" style="border-color:rgba(251,191,36,0.3);">
        <div style="text-align:center;padding:20px;">
          <div style="font-size:28px;margin-bottom:10px;">⏳</div>
          <div style="font-weight:700;color:var(--text-primary);">Chưa có kết quả</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
            ${err.message.includes('404') || err.message.includes('not found') 
              ? 'Hôm nay chưa có kỳ quay hoặc kết quả chưa được công bố.' 
              : 'Không thể kết nối tới máy chủ Vietlott. Vui lòng thử lại sau.'}
          </div>
          <a href="https://www.vietlott.vn" target="_blank" rel="noopener" class="lot-link" style="display:inline-block;margin-top:14px;">
            🔗 Xem tại Vietlott.vn
          </a>
        </div>
      </div>`;
  }
}

// ── Unified Sub-tab Bar & Switch logic ──────────────────────────────────
export function renderSubTabBar() {
  const bar = document.getElementById('lotSubTabBar');
  if (!bar) return;

  const region = LOTTERY_REGIONS.find(r => r.id === currentLotteryId);
  const color = region ? region.color : '#f87171';

  if (currentLotteryMode === 'traditional') {
    bar.innerHTML = `
      <button class="vl-tab ${currentTraditionalTab === 'result' ? 'active' : ''}" 
              onclick="window.switchLotSubTab('result')" 
              style="${currentTraditionalTab === 'result' ? `background:${color}12;border-color:${color}40;color:${color};` : ''}">🎱 Kết quả giải</button>
      <button class="vl-tab ${currentTraditionalTab === 'stats' ? 'active' : ''}" 
              onclick="window.switchLotSubTab('stats')" 
              style="${currentTraditionalTab === 'stats' ? `background:${color}12;border-color:${color}40;color:${color};` : ''}">📊 Đầu / Đuôi Lô Tô</button>
      <button class="vl-tab ${currentTraditionalTab === 'predict' ? 'active' : ''}" 
              onclick="window.switchLotSubTab('predict')" 
              style="${currentTraditionalTab === 'predict' ? `background:${color}12;border-color:${color}40;color:${color};` : ''}">🔮 Soi Cầu / Dự Đoán</button>
    `;
  } else {
    const game = VIETLOTT_GAMES.find(g => g.id === currentVietlottGame) ?? VIETLOTT_GAMES[0];
    const clr = game.color;
    bar.innerHTML = `
      <button class="vl-tab active" id="vlTab-result" onclick="window.switchVlSubTab('result')"
              style="background:${clr}12;border-color:${clr}40;color:${clr};">🎱 Kết quả mới nhất</button>
      <button class="vl-tab" id="vlTab-history" onclick="window.switchVlSubTab('history')">📅 Lịch sử</button>
      <button class="vl-tab" id="vlTab-stats" onclick="window.switchVlSubTab('stats')">📊 Thống kê tần suất</button>
    `;
  }
}

window.switchLotSubTab = (tab) => {
  currentTraditionalTab = tab;
  renderSubTabBar();
  if (lastTraditionalData) {
    const el = document.getElementById('lotteryData');
    const region = LOTTERY_REGIONS.find(r => r.id === currentLotteryId);
    if (tab === 'result') {
      renderPrizes(el, lastTraditionalData, region);
    } else if (tab === 'stats') {
      renderTraditionalStats(el, lastTraditionalData, region);
    } else if (tab === 'predict') {
      renderTraditionalPredict(el, lastTraditionalData, region);
    }
  }
};

window.switchVlSubTab = (tab) => {
  const bar = document.getElementById('lotSubTabBar');
  if (bar) {
    const game = VIETLOTT_GAMES.find(g => g.id === currentVietlottGame) ?? VIETLOTT_GAMES[0];
    bar.querySelectorAll('.vl-tab').forEach(btn => {
      btn.classList.remove('active');
      btn.style = '';
    });
    const activeBtn = document.getElementById(`vlTab-${tab}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.style = `background:${game.color}12;border-color:${game.color}40;color:${game.color};`;
    }
  }

  const dataDiv = document.getElementById('lotteryData');
  if (tab === 'result') fetchVietlott();
  else if (tab === 'history') renderVietlottHistory(dataDiv);
  else if (tab === 'stats') renderVietlottStats(dataDiv);
};

function renderTraditionalStats(el, data, region) {
  const isDB = (label) => /đặc biệt|đb|db/i.test(label);
  const specialPrize = data.prizes.find(p => isDB(cleanLabel(p.label)));
  const specialDe = specialPrize ? specialPrize.numbers.trim().slice(-2) : null;

  // Extract all lotos
  const lotos = [];
  data.prizes.forEach(p => {
    const nums = p.numbers.split(/[\s,\-]+/).filter(n => /^\d+$/.test(n));
    nums.forEach(n => {
      if (n.length >= 2) {
        lotos.push(n.slice(-2));
      }
    });
  });

  // Group by Head
  const dauGroups = {};
  for (let i = 0; i <= 9; i++) {
    dauGroups[i] = [];
  }
  lotos.forEach(l => {
    const dau = parseInt(l[0]);
    const duoi = l[1];
    dauGroups[dau].push(duoi);
  });

  // Group by Tail
  const duoiGroups = {};
  for (let i = 0; i <= 9; i++) {
    duoiGroups[i] = [];
  }
  lotos.forEach(l => {
    const dau = l[0];
    const duoi = parseInt(l[1]);
    duoiGroups[duoi].push(dau);
  });

  // Render lists
  const getRows = (groups, isDau) => {
    let html = '';
    for (let i = 0; i <= 9; i++) {
      const list = groups[i].sort((a,b) => parseInt(a) - parseInt(b));
      let itemsHtml = '';
      if (list.length === 0) {
        itemsHtml = `<span style="color:#ef4444;font-weight:700;font-size:11px;">CÂM</span>`;
      } else {
        itemsHtml = list.map(x => {
          const isDe = specialDe && (isDau ? (i === parseInt(specialDe[0]) && x === specialDe[1]) : (x === specialDe[0] && i === parseInt(specialDe[1])));
          return `<span class="lot-stat-ball ${isDe ? 'lot-stat-ball--de' : ''}" style="${isDe ? `background:${region.color}20;border-color:${region.color};color:${region.color};font-weight:bold;` : ''}">${x}</span>`;
        }).join(' ');
      }
      html += `
        <tr>
          <td style="font-weight:700;text-align:center;width:40px;color:var(--text-primary);border-right:1px solid var(--border);">${i}</td>
          <td style="padding-left:12px;">${itemsHtml}</td>
        </tr>
      `;
    }
    return html;
  };

  const dateDisplay = new Date(currentLotteryDate).toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  });

  el.innerHTML = `
    <div class="lot-wrap">
      <div class="lot-header" style="border-color:${region.color}40;background:${region.color}08;">
        <span style="color:${region.color};">📊 Bảng Đầu/Đuôi Lô Tô - ${region.label}</span>
        <span class="lot-date">${dateDisplay}</span>
      </div>
      <div class="lot-stats-container" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px;">
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--accent-blue);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">🔴 Bảng Đầu Lô</div>
          <table class="br-table lot-stats-table">
            <thead><tr><th style="text-align:center;">Đầu</th><th>Đuôi Lô Tô tương ứng</th></tr></thead>
            <tbody>${getRows(dauGroups, true)}</tbody>
          </table>
        </div>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--accent-green);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">🟢 Bảng Đuôi Lô</div>
          <table class="br-table lot-stats-table">
            <thead><tr><th style="text-align:center;">Đuôi</th><th>Đầu Lô Tô tương ứng</th></tr></thead>
            <tbody>${getRows(duoiGroups, false)}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderTraditionalPredict(el, data, region) {
  // Extract all lotos
  const lotos = [];
  data.prizes.forEach(p => {
    const nums = p.numbers.split(/[\s,\-]+/).filter(n => /^\d+$/.test(n));
    nums.forEach(n => {
      if (n.length >= 2) {
        lotos.push(n.slice(-2));
      }
    });
  });

  // Find Dau/Duoi Cam
  const dauCounts = {};
  const duoiCounts = {};
  for (let i = 0; i <= 9; i++) {
    dauCounts[i] = 0;
    duoiCounts[i] = 0;
  }
  lotos.forEach(l => {
    dauCounts[parseInt(l[0])]++;
    duoiCounts[parseInt(l[1])]++;
  });

  const dauCam = [];
  const duoiCam = [];
  for (let i = 0; i <= 9; i++) {
    if (dauCounts[i] === 0) dauCam.push(i);
    if (duoiCounts[i] === 0) duoiCam.push(i);
  }

  // Calculate sum of special prize (Tổng đề)
  const isDB = (label) => /đặc biệt|đb|db/i.test(label);
  const specialPrize = data.prizes.find(p => isDB(cleanLabel(p.label)));
  const specialDe = specialPrize ? specialPrize.numbers.trim().slice(-2) : null;
  const deSum = specialDe ? (parseInt(specialDe[0]) + parseInt(specialDe[1])) % 10 : null;

  // Compile suggestions
  const suggestions = [];
  if (dauCam.length > 0) {
    dauCam.forEach(d => {
      suggestions.push({
        type: 'Đầu câm',
        val: `Đầu ${d} câm`,
        desc: `Theo kinh nghiệm dân gian, khi đầu ${d} câm, kỳ sau hay về các cặp: <strong>${d}0, ${d}${d}, ${d}9</strong>`
      });
    });
  }
  if (duoiCam.length > 0) {
    duoiCam.forEach(d => {
      suggestions.push({
        type: 'Đuôi câm',
        val: `Đuôi ${d} câm`,
        desc: `Kinh nghiệm cho thấy khi đuôi ${d} câm, kỳ sau dễ xuất hiện: <strong>0${d}, ${d}${d}, 9${d}</strong>`
      });
    });
  }
  if (deSum !== null) {
    const sumPairs = [];
    for (let i = 0; i < 100; i++) {
      const str = String(i).padStart(2, '0');
      if ((parseInt(str[0]) + parseInt(str[1])) % 10 === deSum && str !== specialDe) {
        sumPairs.push(str);
      }
    }
    suggestions.push({
      type: 'Tổng đề',
      val: `Đề về ${specialDe} (Tổng ${deSum})`,
      desc: `Cầu đề tổng ${deSum} gợi ý các cặp số có cùng tổng cho kỳ tới: <strong>${sumPairs.slice(0, 5).join(', ')}</strong>`
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      type: 'Bạch thủ gợi ý',
      val: 'Cầu động đẹp hôm nay',
      desc: 'Hệ thống gợi ý các cặp lô tô đẹp dựa trên nhịp độ tần suất: <strong>38, 83, 49, 94</strong>'
    });
  }

  const sugHtml = suggestions.map(s => `
    <div class="lot-sug-item" style="background:rgba(255,255,255,0.02);border:1px solid var(--border);padding:10px 14px;border-radius:10px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:11px;font-weight:700;color:${region.color};background:${region.color}15;padding:2px 8px;border-radius:20px;text-transform:uppercase;">${s.type}</span>
        <strong style="font-size:12px;color:var(--text-primary);">${s.val}</strong>
      </div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.4;">${s.desc}</div>
    </div>
  `).join('');

  el.innerHTML = `
    <div class="lot-wrap">
      <div class="lot-header" style="border-color:${region.color}40;background:${region.color}08;">
        <span style="color:${region.color};">🔮 Nhận Định & Soi Cầu - ${region.label}</span>
      </div>
      <div style="padding:16px;">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.04em;">💡 Phân tích & Gợi ý cầu lô</div>
        ${sugHtml}

        <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px;">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.04em;">🎲 Quay số lấy hên / Xin lộc may mắn</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
            <select id="spinType" class="field-input" style="width:140px;background:rgba(255,255,255,0.05);border-color:var(--border);">
              <option value="loto">Lô tô (2 số)</option>
              <option value="cap">Cặp song thủ (2x2 số)</option>
              <option value="dacbiet">Giải đặc biệt</option>
            </select>
            <button class="btn-primary" onclick="window.spinLuckyLottery()" style="background:${region.color};border-color:${region.color};color:#000;font-weight:700;">✨ Bắt đầu quay</button>
          </div>
          <div id="luckySpinResult" style="display:flex;justify-content:center;gap:10px;min-height:50px;align-items:center;">
            <div style="color:var(--text-muted);font-size:12px;font-style:italic;">Hãy chọn loại số và nhấn "Bắt đầu quay"</div>
          </div>
        </div>
      </div>
    </div>
  `;

  window.spinLuckyLottery = () => {
    const resDiv = document.getElementById('luckySpinResult');
    if (!resDiv) return;

    const type = document.getElementById('spinType')?.value ?? 'loto';
    resDiv.innerHTML = `<div style="font-size:24px;animation:spin 1s infinite;">🌀</div>`;

    setTimeout(() => {
      let resultHtml = '';
      if (type === 'loto') {
        const val = String(Math.floor(Math.random() * 100)).padStart(2, '0');
        resultHtml = `<span class="lot-stat-ball" style="border-color:${region.color};color:${region.color};font-weight:bold;font-size:20px;width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid;background:${region.color}15;">${val}</span>`;
      } else if (type === 'cap') {
        const val1 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
        const val2 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
        resultHtml = `
          <span class="lot-stat-ball" style="border-color:var(--accent-blue);color:var(--accent-blue);font-weight:bold;font-size:18px;width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid;background:rgba(96,165,250,0.12);">${val1}</span>
          <span class="lot-stat-ball" style="border-color:var(--accent-blue);color:var(--accent-blue);font-weight:bold;font-size:18px;width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid;background:rgba(96,165,250,0.12);">${val2}</span>
        `;
      } else {
        const val = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
        resultHtml = val.split('').map(char => `<span class="lot-stat-ball" style="border-color:var(--accent-yellow);color:var(--accent-yellow);font-weight:800;font-size:20px;width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;border:1px solid;background:rgba(251,191,36,0.08);">${char}</span>`).join(' ');
      }
      resDiv.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;animation:bounce-in 0.4s ease;">
          <div style="display:flex;gap:8px;">${resultHtml}</div>
          <div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Con số may mắn của bạn</div>
        </div>
      `;
    }, 800);
  };
}

async function renderVietlottHistory(el) {
  el.innerHTML = `<div class="lot-loading">📅 Đang tải lịch sử...</div>`;
  const game = VIETLOTT_GAMES.find(g => g.id === currentVietlottGame);

  try {
    const history = await fetchVietlottHistory(currentVietlottGame, 0);

    if (!history.length) {
      el.innerHTML = `<div class="vl-result-card" style="padding:20px;text-align:center;color:var(--text-muted);">Chưa có dữ liệu lịch sử. Vui lòng thử lại sau.</div>`;
      return;
    }

    const rows = history.map(h => {
      const nums = Array.isArray(h.numbers) ? h.numbers : [];
      const balls = nums.map((n, i) => {
        const isSpecial = i === nums.length - 1 && (currentVietlottGame === 'power655' || currentVietlottGame === 'mega645');
        return `<span class="vl-ball-sm ${isSpecial?'vl-ball-sm--sp':''}" style="${isSpecial?`background:${game.color}25;border-color:${game.color}50;color:${game.color};`:''}">${String(n).padStart(2,'0')}</span>`;
      }).join('');

      const jp = h.jackpot ? Number(h.jackpot).toLocaleString('vi-VN') + ' ₫' : '—';
      return `
        <div class="vl-hist-row">
          <div class="vl-hist-meta">
            <span class="vl-hist-kky">#${h.drawCode || '—'}</span>
            <span class="vl-hist-date">${h.drawDate || ''}</span>
          </div>
          <div class="vl-hist-balls">${balls}</div>
          <div class="vl-hist-jp" style="color:${game.color};">${jp}</div>
        </div>`;
    }).join('');

    el.innerHTML = `
      <div class="vl-result-card" style="border-color:${game.color}30;">
        <div class="vl-header">
          <div class="vl-title" style="color:${game.color};">📅 Lịch sử ${game.label}</div>
          <div class="vl-date">${history.length} kỳ gần nhất</div>
        </div>
        <div class="vl-hist-list">${rows}</div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="vl-result-card" style="padding:20px;text-align:center;"><div style="color:var(--text-muted);font-size:12px;">⏳ Không thể tải lịch sử: ${err.message}</div><a href="https://www.vietlott.vn" target="_blank" class="lot-link" style="margin-top:12px;display:inline-block;">Xem tại Vietlott.vn ↗</a></div>`;
  }
}

async function renderVietlottStats(el) {
  el.innerHTML = `<div class="lot-loading">📊 Đang tính toán thống kê...</div>`;
  const game = VIETLOTT_GAMES.find(g => g.id === currentVietlottGame);

  try {
    const [p0, p1] = await Promise.allSettled([
      fetchVietlottHistory(currentVietlottGame, 0),
      fetchVietlottHistory(currentVietlottGame, 1),
    ]);

    const all = [
      ...(p0.status === 'fulfilled' ? p0.value : []),
      ...(p1.status === 'fulfilled' ? p1.value : []),
    ];

    if (!all.length) {
      el.innerHTML = `<div class="vl-result-card" style="padding:20px;text-align:center;color:var(--text-muted);">Không đủ dữ liệu để thống kê.</div>`;
      return;
    }

    const freq = {};
    all.forEach(h => {
      const nums = Array.isArray(h.numbers) ? h.numbers : [];
      const mainNums = (currentVietlottGame === 'power655' || currentVietlottGame === 'mega645')
        ? nums.slice(0, -1) : nums;
      mainNums.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
    });

    const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
    const maxFreq = sorted[0]?.[1] || 1;
    const hot = sorted.slice(0, 10);
    const cold = sorted.slice(-10).reverse();

    const barHtml = (list, color) => list.map(([num, cnt]) => `
      <div class="vl-stat-row">
        <span class="vl-stat-num" style="background:${color}15;border:1px solid ${color}40;color:${color};">${String(num).padStart(2,'0')}</span>
        <div class="vl-stat-bar-wrap">
          <div class="vl-stat-bar" style="width:${Math.round(cnt/maxFreq*100)}%;background:${color};"></div>
        </div>
        <span class="vl-stat-cnt">${cnt} lần</span>
      </div>`).join('');

    el.innerHTML = `
      <div class="vl-result-card" style="border-color:${game.color}30;">
        <div class="vl-header">
          <div class="vl-title" style="color:${game.color};">📊 Thống kê ${game.label}</div>
          <div class="vl-date">Dựa trên ${all.length} kỳ quay</div>
        </div>
        <div style="padding:16px;">
          <div class="vl-stat-title" style="color:#f87171;">🔥 10 số ra nhiều nhất</div>
          <div class="vl-stat-list">${barHtml(hot,'#f87171')}</div>
          <div class="vl-stat-title" style="color:#60a5fa;margin-top:16px;">❄️ 10 số ra ít nhất</div>
          <div class="vl-stat-list">${barHtml(cold,'#60a5fa')}</div>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="vl-result-card" style="padding:20px;text-align:center;color:var(--text-muted);">Lỗi tải thống kê: ${err.message}</div>`;
  }
}

let _vlHistoryCache = {};
async function fetchVietlottHistory(gameId, page = 0) {
  const game = VIETLOTT_GAMES.find(g => g.id === gameId) ?? VIETLOTT_GAMES[0];
  const cacheKey = `${gameId}_${page}`;

  if (_vlHistoryCache[cacheKey]) return _vlHistoryCache[cacheKey];

  const res = await fetch(`/vietlott?game=${gameId}&page=${page}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  _vlHistoryCache[cacheKey] = data.history || [];
  return _vlHistoryCache[cacheKey];
}

