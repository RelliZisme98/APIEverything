/**
 * components/world-clock.js
 * World clock, Stopwatch, Countdown timer — pure JS, no API needed
 */

const WORLD_ZONES = [
  { city: 'Hà Nội',      zone: 'Asia/Ho_Chi_Minh', flag: '🇻🇳' },
  { city: 'Tokyo',       zone: 'Asia/Tokyo',        flag: '🇯🇵' },
  { city: 'Singapore',   zone: 'Asia/Singapore',    flag: '🇸🇬' },
  { city: 'London',      zone: 'Europe/London',     flag: '🇬🇧' },
  { city: 'New York',    zone: 'America/New_York',  flag: '🇺🇸' },
  { city: 'Los Angeles', zone: 'America/Los_Angeles',flag: '🇺🇸' },
  { city: 'Paris',       zone: 'Europe/Paris',      flag: '🇫🇷' },
  { city: 'Dubai',       zone: 'Asia/Dubai',        flag: '🇦🇪' },
  { city: 'Sydney',      zone: 'Australia/Sydney',  flag: '🇦🇺' },
];

let _wc_interval    = null;
let _sw_running     = false;
let _sw_start       = 0;
let _sw_elapsed     = 0;
let _sw_interval    = null;
let _sw_laps        = [];
let _cd_target      = null;
let _cd_interval    = null;

export function renderWorldClock(containerId = 'worldClockContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <!-- World Clocks -->
    <div class="wc-section-label">🌍 Đồng Hồ Thế Giới</div>
    <div class="wc-grid" id="wcGrid"></div>

    <!-- Stopwatch + Countdown -->
    <div class="wc-tools-row">
      <!-- Stopwatch -->
      <div class="wc-tool-card">
        <div class="wc-tool-title">⏱️ Bấm Giờ</div>
        <div class="sw-display" id="swDisplay">00:00.000</div>
        <div class="sw-btns">
          <button class="sw-btn sw-btn--start" id="swStartBtn" onclick="window.swToggle()">▶ Bắt đầu</button>
          <button class="sw-btn sw-btn--lap"   id="swLapBtn"   onclick="window.swLap()"    disabled>⏺ Vòng</button>
          <button class="sw-btn sw-btn--reset"              onclick="window.swReset()">↺ Reset</button>
        </div>
        <div class="sw-laps" id="swLaps"></div>
      </div>

      <!-- Countdown -->
      <div class="wc-tool-card">
        <div class="wc-tool-title">⏳ Đếm Ngược</div>
        <div class="cd-display" id="cdDisplay">00:00:00</div>
        <div class="cd-form">
          <div class="cd-inputs">
            <div class="cd-inp-wrap">
              <input type="number" id="cdH" class="cd-input" value="0" min="0" max="99" placeholder="0">
              <label>Giờ</label>
            </div>
            <div class="cd-sep">:</div>
            <div class="cd-inp-wrap">
              <input type="number" id="cdM" class="cd-input" value="5" min="0" max="59" placeholder="0">
              <label>Phút</label>
            </div>
            <div class="cd-sep">:</div>
            <div class="cd-inp-wrap">
              <input type="number" id="cdS" class="cd-input" value="0" min="0" max="59" placeholder="0">
              <label>Giây</label>
            </div>
          </div>
          <div style="text-align:center;margin-bottom:8px;font-size:11px;color:var(--text-muted);">— hoặc chọn thời điểm mục tiêu —</div>
          <input type="datetime-local" id="cdDatetime" class="cd-input-date">
        </div>
        <div class="sw-btns">
          <button class="sw-btn sw-btn--start" id="cdStartBtn" onclick="window.cdToggle()">▶ Bắt đầu</button>
          <button class="sw-btn sw-btn--reset"               onclick="window.cdReset()">↺ Reset</button>
        </div>
        <div class="cd-done" id="cdDone" style="display:none;">🎉 Xong rồi!</div>
      </div>
    </div>`;

  startWorldClock();
  setupStopwatch();
  setupCountdown();
}

function startWorldClock() {
  if (_wc_interval) clearInterval(_wc_interval);
  const update = () => {
    const grid = document.getElementById('wcGrid');
    if (!grid) { clearInterval(_wc_interval); return; }
    const now = new Date();
    grid.innerHTML = WORLD_ZONES.map(z => {
      const t = now.toLocaleTimeString('vi-VN', { timeZone: z.zone, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const d = now.toLocaleDateString('vi-VN', { timeZone: z.zone, weekday: 'short', day: '2-digit', month: '2-digit' });
      const h = parseInt(now.toLocaleTimeString('en-US', { timeZone: z.zone, hour: '2-digit', hour12: false }));
      const isDay = h >= 6 && h < 20;
      return `
        <div class="wc-card">
          <div class="wc-flag">${z.flag}</div>
          <div class="wc-city">${z.city}</div>
          <div class="wc-time">${t}</div>
          <div class="wc-date">${d} ${isDay ? '☀️' : '🌙'}</div>
        </div>`;
    }).join('');
  };
  update();
  _wc_interval = setInterval(update, 1000);
}

function fmtSW(ms) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const msec = ms % 1000;
  return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}.${String(msec).padStart(3,'0')}`;
}

function setupStopwatch() {
  window.swToggle = () => {
    _sw_running = !_sw_running;
    const btn = document.getElementById('swStartBtn');
    const lap = document.getElementById('swLapBtn');
    if (_sw_running) {
      _sw_start = Date.now() - _sw_elapsed;
      _sw_interval = setInterval(() => {
        _sw_elapsed = Date.now() - _sw_start;
        const d = document.getElementById('swDisplay');
        if (d) d.textContent = fmtSW(_sw_elapsed);
      }, 13);
      if (btn) { btn.textContent = '⏸ Dừng'; btn.classList.add('sw-btn--running'); }
      if (lap) lap.disabled = false;
    } else {
      clearInterval(_sw_interval);
      if (btn) { btn.textContent = '▶ Tiếp tục'; btn.classList.remove('sw-btn--running'); }
    }
  };

  window.swLap = () => {
    if (!_sw_running) return;
    _sw_laps.push(_sw_elapsed);
    const lapsEl = document.getElementById('swLaps');
    if (lapsEl) {
      lapsEl.innerHTML = _sw_laps.slice().reverse().map((t, i) =>
        `<div class="sw-lap">Vòng ${_sw_laps.length - i}: ${fmtSW(t)}</div>`
      ).join('');
    }
  };

  window.swReset = () => {
    clearInterval(_sw_interval);
    _sw_running = false; _sw_elapsed = 0; _sw_laps = [];
    const d = document.getElementById('swDisplay');
    const btn = document.getElementById('swStartBtn');
    const lap = document.getElementById('swLapBtn');
    const lapsEl = document.getElementById('swLaps');
    if (d) d.textContent = '00:00.000';
    if (btn) { btn.textContent = '▶ Bắt đầu'; btn.classList.remove('sw-btn--running'); }
    if (lap) lap.disabled = true;
    if (lapsEl) lapsEl.innerHTML = '';
  };
}

function fmtCD(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function setupCountdown() {
  window.cdToggle = () => {
    if (_cd_interval) {
      clearInterval(_cd_interval);
      _cd_interval = null;
      const btn = document.getElementById('cdStartBtn');
      if (btn) { btn.textContent = '▶ Bắt đầu'; btn.classList.remove('sw-btn--running'); }
      return;
    }

    const dts = document.getElementById('cdDatetime')?.value;
    let targetMs;
    if (dts) {
      targetMs = new Date(dts).getTime();
    } else {
      const h = parseInt(document.getElementById('cdH')?.value || 0);
      const m = parseInt(document.getElementById('cdM')?.value || 0);
      const s = parseInt(document.getElementById('cdS')?.value || 0);
      const totalSec = h * 3600 + m * 60 + s;
      if (!totalSec) return;
      targetMs = Date.now() + totalSec * 1000;
    }
    _cd_target = targetMs;

    const btn = document.getElementById('cdStartBtn');
    const done = document.getElementById('cdDone');
    if (btn) { btn.textContent = '⏸ Dừng'; btn.classList.add('sw-btn--running'); }
    if (done) done.style.display = 'none';

    _cd_interval = setInterval(() => {
      const rem = Math.max(0, Math.ceil((_cd_target - Date.now()) / 1000));
      const d = document.getElementById('cdDisplay');
      if (d) d.textContent = fmtCD(rem);
      if (rem === 0) {
        clearInterval(_cd_interval); _cd_interval = null;
        if (btn) { btn.textContent = '▶ Bắt đầu'; btn.classList.remove('sw-btn--running'); }
        if (done) done.style.display = 'block';
        if (d) d.style.color = '#4ade80';
        try { new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3').play().catch(() => {}); } catch {}
      }
    }, 1000);
  };

  window.cdReset = () => {
    clearInterval(_cd_interval); _cd_interval = null;
    const d = document.getElementById('cdDisplay');
    const btn = document.getElementById('cdStartBtn');
    const done = document.getElementById('cdDone');
    if (d) { d.textContent = '00:00:00'; d.style.color = ''; }
    if (btn) { btn.textContent = '▶ Bắt đầu'; btn.classList.remove('sw-btn--running'); }
    if (done) done.style.display = 'none';
  };
}

// Cleanup on section switch
export function destroyWorldClock() {
  clearInterval(_wc_interval);
  clearInterval(_sw_interval);
  clearInterval(_cd_interval);
  _wc_interval = _sw_interval = _cd_interval = null;
}
