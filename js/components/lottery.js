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
    currentLotteryMode = 'traditional';
    currentLotteryId = id;
    buildUI(el, containerId);
    fetchAndRender();
  };

  window.selectVietlott = (gameId) => {
    currentLotteryMode = 'vietlott';
    currentVietlottGame = gameId;
    buildUI(el, containerId);
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

// ── Vietlott History & Statistics tab ─────────────────────────────────────
// Thêm UI lịch sử + thống kê tần suất sau khi fetchVietlott render xong
let _vlHistoryCache = {};
let _vlStatsCache   = {};

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

// Extend buildUI to include history/stats tabs when in vietlott mode
const _origBuildUI = window._vlBuildUIHooked;
function buildVietlottTabs(containerId) {
  const dataDiv = document.getElementById('lotteryData');
  if (!dataDiv || currentLotteryMode !== 'vietlott') return;

  // Check if tabs already exist
  if (document.getElementById('vlTabBar')) return;

  const tabBar = document.createElement('div');
  tabBar.id = 'vlTabBar';
  tabBar.className = 'vl-tab-bar';
  tabBar.innerHTML = `
    <button class="vl-tab active" data-vltab="result">🎱 Kết quả mới nhất</button>
    <button class="vl-tab" data-vltab="history">📅 Lịch sử</button>
    <button class="vl-tab" data-vltab="stats">📊 Thống kê tần suất</button>`;

  dataDiv.parentNode.insertBefore(tabBar, dataDiv);

  tabBar.querySelectorAll('.vl-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabBar.querySelectorAll('.vl-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      switch (tab.dataset.vltab) {
        case 'result':  fetchVietlott(); break;
        case 'history': renderVietlottHistory(dataDiv); break;
        case 'stats':   renderVietlottStats(dataDiv); break;
      }
    });
  });
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
    // Try to get multiple pages for better stats
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

    // Count frequency for each number
    const freq = {};
    let maxNum = currentVietlottGame === 'power655' ? 55 : currentVietlottGame === 'mega645' ? 45 : currentVietlottGame === 'max4d' ? 9 : 80;

    all.forEach(h => {
      const nums = Array.isArray(h.numbers) ? h.numbers : [];
      // For power/mega, exclude last number (special ball)
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

// Patch selectVietlott to inject tab bar after fetch completes
const _origSelectVietlott = window.selectVietlott;
if (_origSelectVietlott) {
  window.selectVietlott = (gameId) => {
    _origSelectVietlott(gameId);
    setTimeout(() => buildVietlottTabs(), 100);
  };
}
