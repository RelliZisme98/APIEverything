/**
 * components/world-clock.js
 * World clock với 100+ múi giờ, dropdown tùy chọn, hiển thị UTC offset
 */
import { renderTimezoneConverter } from './converter.js';

// ── Full timezone database ──────────────────────────────────────────
const ALL_TIMEZONES = [
  // ── Đông Nam Á ──
 { city: 'Hà Nội', zone: 'Asia/Ho_Chi_Minh', flag: '', utc: '+7', region: 'Đông Nam Á' },
 { city: 'TP. Hồ Chí Minh',zone: 'Asia/Ho_Chi_Minh', flag: '', utc: '+7', region: 'Đông Nam Á' },
 { city: 'Bangkok', zone: 'Asia/Bangkok', flag: '', utc: '+7', region: 'Đông Nam Á' },
 { city: 'Singapore', zone: 'Asia/Singapore', flag: '', utc: '+8', region: 'Đông Nam Á' },
 { city: 'Kuala Lumpur', zone: 'Asia/Kuala_Lumpur', flag: '', utc: '+8', region: 'Đông Nam Á' },
 { city: 'Jakarta', zone: 'Asia/Jakarta', flag: '', utc: '+7', region: 'Đông Nam Á' },
 { city: 'Manila', zone: 'Asia/Manila', flag: '', utc: '+8', region: 'Đông Nam Á' },
 { city: 'Phnom Penh', zone: 'Asia/Phnom_Penh', flag: '', utc: '+7', region: 'Đông Nam Á' },
 { city: 'Yangon', zone: 'Asia/Rangoon', flag: '', utc: '+6:30',region: 'Đông Nam Á' },
 { city: 'Vientiane', zone: 'Asia/Vientiane', flag: '', utc: '+7', region: 'Đông Nam Á' },

  // ── Đông Á ──
 { city: 'Tokyo', zone: 'Asia/Tokyo', flag: '', utc: '+9', region: 'Đông Á' },
 { city: 'Seoul', zone: 'Asia/Seoul', flag: '', utc: '+9', region: 'Đông Á' },
 { city: 'Bắc Kinh', zone: 'Asia/Shanghai', flag: '', utc: '+8', region: 'Đông Á' },
 { city: 'Thượng Hải', zone: 'Asia/Shanghai', flag: '', utc: '+8', region: 'Đông Á' },
 { city: 'Hồng Kông', zone: 'Asia/Hong_Kong', flag: '', utc: '+8', region: 'Đông Á' },
 { city: 'Đài Bắc', zone: 'Asia/Taipei', flag: '', utc: '+8', region: 'Đông Á' },
 { city: 'Ulaanbaatar', zone: 'Asia/Ulaanbaatar', flag: '', utc: '+8', region: 'Đông Á' },

  // ── Nam Á ──
 { city: 'New Delhi', zone: 'Asia/Kolkata', flag: '', utc: '+5:30',region: 'Nam Á' },
 { city: 'Mumbai', zone: 'Asia/Kolkata', flag: '', utc: '+5:30',region: 'Nam Á' },
 { city: 'Karachi', zone: 'Asia/Karachi', flag: '', utc: '+5', region: 'Nam Á' },
 { city: 'Dhaka', zone: 'Asia/Dhaka', flag: '', utc: '+6', region: 'Nam Á' },
 { city: 'Colombo', zone: 'Asia/Colombo', flag: '', utc: '+5:30',region: 'Nam Á' },
 { city: 'Kathmandu', zone: 'Asia/Kathmandu', flag: '', utc: '+5:45',region: 'Nam Á' },

  // ── Trung Đông ──
 { city: 'Dubai', zone: 'Asia/Dubai', flag: '', utc: '+4', region: 'Trung Đông' },
 { city: 'Riyadh', zone: 'Asia/Riyadh', flag: '', utc: '+3', region: 'Trung Đông' },
 { city: 'Tehran', zone: 'Asia/Tehran', flag: '', utc: '+3:30',region: 'Trung Đông' },
 { city: 'Istanbul', zone: 'Europe/Istanbul', flag: '', utc: '+3', region: 'Trung Đông' },
 { city: 'Tel Aviv', zone: 'Asia/Jerusalem', flag: '', utc: '+3', region: 'Trung Đông' },
 { city: 'Kuwait City', zone: 'Asia/Kuwait', flag: '', utc: '+3', region: 'Trung Đông' },

  // ── Châu Âu ──
 { city: 'London', zone: 'Europe/London', flag: '', utc: '+1', region: 'Châu Âu' },
 { city: 'Paris', zone: 'Europe/Paris', flag: '', utc: '+2', region: 'Châu Âu' },
 { city: 'Berlin', zone: 'Europe/Berlin', flag: '', utc: '+2', region: 'Châu Âu' },
 { city: 'Rome', zone: 'Europe/Rome', flag: '', utc: '+2', region: 'Châu Âu' },
 { city: 'Madrid', zone: 'Europe/Madrid', flag: '', utc: '+2', region: 'Châu Âu' },
 { city: 'Amsterdam', zone: 'Europe/Amsterdam', flag: '', utc: '+2', region: 'Châu Âu' },
 { city: 'Brussels', zone: 'Europe/Brussels', flag: '', utc: '+2', region: 'Châu Âu' },
 { city: 'Stockholm', zone: 'Europe/Stockholm', flag: '', utc: '+2', region: 'Châu Âu' },
 { city: 'Oslo', zone: 'Europe/Oslo', flag: '', utc: '+2', region: 'Châu Âu' },
 { city: 'Warsaw', zone: 'Europe/Warsaw', flag: '', utc: '+2', region: 'Châu Âu' },
 { city: 'Prague', zone: 'Europe/Prague', flag: '', utc: '+2', region: 'Châu Âu' },
 { city: 'Vienna', zone: 'Europe/Vienna', flag: '', utc: '+2', region: 'Châu Âu' },
 { city: 'Zurich', zone: 'Europe/Zurich', flag: '', utc: '+2', region: 'Châu Âu' },
 { city: 'Athens', zone: 'Europe/Athens', flag: '', utc: '+3', region: 'Châu Âu' },
 { city: 'Bucharest', zone: 'Europe/Bucharest', flag: '', utc: '+3', region: 'Châu Âu' },
 { city: 'Moscow', zone: 'Europe/Moscow', flag: '', utc: '+3', region: 'Châu Âu' },
 { city: 'Helsinki', zone: 'Europe/Helsinki', flag: '', utc: '+3', region: 'Châu Âu' },
 { city: 'Kyiv', zone: 'Europe/Kiev', flag: '', utc: '+3', region: 'Châu Âu' },
 { city: 'Lisbon', zone: 'Europe/Lisbon', flag: '', utc: '+1', region: 'Châu Âu' },
 { city: 'Dublin', zone: 'Europe/Dublin', flag: '', utc: '+1', region: 'Châu Âu' },

  // ── Châu Mỹ ──
 { city: 'New York', zone: 'America/New_York', flag: '', utc: '-4', region: 'Châu Mỹ' },
 { city: 'Los Angeles', zone: 'America/Los_Angeles',flag: '', utc: '-7', region: 'Châu Mỹ' },
 { city: 'Chicago', zone: 'America/Chicago', flag: '', utc: '-5', region: 'Châu Mỹ' },
 { city: 'Houston', zone: 'America/Chicago', flag: '', utc: '-5', region: 'Châu Mỹ' },
 { city: 'Phoenix', zone: 'America/Phoenix', flag: '', utc: '-7', region: 'Châu Mỹ' },
 { city: 'Toronto', zone: 'America/Toronto', flag: '', utc: '-4', region: 'Châu Mỹ' },
 { city: 'Vancouver', zone: 'America/Vancouver', flag: '', utc: '-7', region: 'Châu Mỹ' },
 { city: 'São Paulo', zone: 'America/Sao_Paulo', flag: '', utc: '-3', region: 'Châu Mỹ' },
 { city: 'Buenos Aires', zone: 'America/Argentina/Buenos_Aires', flag:'',utc:'-3',region:'Châu Mỹ'},
 { city: 'Mexico City', zone: 'America/Mexico_City',flag: '', utc: '-5', region: 'Châu Mỹ' },
 { city: 'Santiago', zone: 'America/Santiago', flag: '', utc: '-3', region: 'Châu Mỹ' },
 { city: 'Bogotá', zone: 'America/Bogota', flag: '', utc: '-5', region: 'Châu Mỹ' },
 { city: 'Lima', zone: 'America/Lima', flag: '', utc: '-5', region: 'Châu Mỹ' },

  // ── Châu Phi ──
 { city: 'Cairo', zone: 'Africa/Cairo', flag: '', utc: '+3', region: 'Châu Phi' },
 { city: 'Lagos', zone: 'Africa/Lagos', flag: '', utc: '+1', region: 'Châu Phi' },
 { city: 'Johannesburg', zone: 'Africa/Johannesburg',flag: '', utc: '+2', region: 'Châu Phi' },
 { city: 'Nairobi', zone: 'Africa/Nairobi', flag: '', utc: '+3', region: 'Châu Phi' },
 { city: 'Casablanca', zone: 'Africa/Casablanca', flag: '', utc: '+1', region: 'Châu Phi' },

  // ── Châu Đại Dương ──
 { city: 'Sydney', zone: 'Australia/Sydney', flag: '', utc: '+10', region: 'Châu Đại Dương' },
 { city: 'Melbourne', zone: 'Australia/Melbourne',flag: '', utc: '+10', region: 'Châu Đại Dương' },
 { city: 'Perth', zone: 'Australia/Perth', flag: '', utc: '+8', region: 'Châu Đại Dương' },
 { city: 'Auckland', zone: 'Pacific/Auckland', flag: '', utc: '+12', region: 'Châu Đại Dương' },
 { city: 'Honolulu', zone: 'Pacific/Honolulu', flag: '', utc: '-10', region: 'Châu Đại Dương' },
];

// Default displayed clocks (5 zones)
const DEFAULT_ZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
];

let _displayedZones = [...DEFAULT_ZONES];
let _wc_interval    = null;
let _sw_running     = false;
let _sw_start       = 0;
let _sw_elapsed     = 0;
let _sw_interval    = null;
let _sw_laps        = [];
let _cd_target      = null;
let _cd_interval    = null;

// Load saved zones from localStorage
function loadSavedZones() {
  try {
    const saved = localStorage.getItem('rellia_world_clocks');
    if (saved) _displayedZones = JSON.parse(saved);
  } catch {}
}

function saveZones() {
  localStorage.setItem('rellia_world_clocks', JSON.stringify(_displayedZones));
}

export function renderWorldClock(containerId = 'worldClockContent') {
  const el = document.getElementById(containerId);
  if (!el) return;
  loadSavedZones();

  // Build add dropdown
  const regions = [...new Set(ALL_TIMEZONES.map(z => z.region))];
  const groupedOpts = regions.map(region => {
    const opts = ALL_TIMEZONES.filter(z => z.region === region).map(z =>
      `<option value="${z.zone}">${z.flag} ${z.city} (UTC${z.utc})</option>`
    ).join('');
    return `<optgroup label="${region}">${opts}</optgroup>`;
  }).join('');

  el.innerHTML = `
    <!-- World Clocks -->
 <div class="wc-section-label">Đồng Hồ Thế Giới</div>

    <!-- Add clock control -->
    <div class="wc-controls">
      <select class="wc-add-dropdown" id="wcAddDropdown">
        <option value="">+ Thêm múi giờ...</option>
        ${groupedOpts}
      </select>
      <button class="wc-btn wc-btn--reset" onclick="window._wcReset()">↺ Đặt lại</button>
    </div>

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
          <button class="sw-btn sw-btn--reset"               onclick="window.swReset()">↺ Reset</button>
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
              <input type="number" id="cdH" class="cd-input" value="0" min="0" max="99">
              <label>Giờ</label>
            </div>
            <div class="cd-sep">:</div>
            <div class="cd-inp-wrap">
              <input type="number" id="cdM" class="cd-input" value="5" min="0" max="59">
              <label>Phút</label>
            </div>
            <div class="cd-sep">:</div>
            <div class="cd-inp-wrap">
              <input type="number" id="cdS" class="cd-input" value="0" min="0" max="59">
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
 <div class="cd-done" id="cdDone" style="display:none;">Xong rồi!</div>
      </div>
    </div>

    <!-- Timezone Converter -->
 <div class="wc-section-label" style="margin-top:24px;">Quy Đổi Múi Giờ</div>
    <div id="tzConverterContent"></div>`;


  // Add dropdown event
  document.getElementById('wcAddDropdown')?.addEventListener('change', (e) => {
    const zone = e.target.value;
    if (!zone) return;
    if (!_displayedZones.includes(zone)) {
      _displayedZones.push(zone);
      saveZones();
    }
    e.target.value = '';
    updateClockGrid();
  });

  window._wcReset = () => {
    _displayedZones = [...DEFAULT_ZONES];
    saveZones();
    updateClockGrid();
  };

  startWorldClock();
  setupStopwatch();
  setupCountdown();
  renderTimezoneConverter('tzConverterContent');
}

function getZoneInfo(zone) {
 return ALL_TIMEZONES.find(z => z.zone === zone) ?? { city: zone, flag: '', utc: '?' };
}

function getUtcOffset(zone) {
  try {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const zoneDate = new Date(now.toLocaleString('en-US', { timeZone: zone }));
    const diff = Math.round((zoneDate - new Date(now.toLocaleString('en-US'))) / 60000);
    const h = Math.floor(Math.abs(diff) / 60);
    const m = Math.abs(diff) % 60;
    return `UTC${diff >= 0 ? '+' : '-'}${String(h).padStart(2,'0')}${m ? ':'+String(m).padStart(2,'0') : ''}`;
  } catch { return 'UTC+?'; }
}

function updateClockGrid() {
  const grid = document.getElementById('wcGrid');
  if (!grid) return;
  const now = new Date();
  grid.innerHTML = _displayedZones.map(zone => {
    const info = getZoneInfo(zone);
    const t = now.toLocaleTimeString('vi-VN', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const d = now.toLocaleDateString('vi-VN', { timeZone: zone, weekday: 'short', day: '2-digit', month: '2-digit' });
    const h = parseInt(now.toLocaleTimeString('en-US', { timeZone: zone, hour: '2-digit', hour12: false }));
    const isDay = h >= 6 && h < 20;
    const utcStr = info.utc ? `UTC${info.utc}` : getUtcOffset(zone);
    return `
      <div class="wc-card" title="${zone}">
        <div class="wc-card-top">
          <div class="wc-flag">${info.flag}</div>
 <button class="wc-remove-btn" onclick="window._wcRemove('${zone}')" title="Xóa"></button>
        </div>
        <div class="wc-city">${info.city}</div>
        <div class="wc-utc">${utcStr}</div>
        <div class="wc-time">${t}</div>
 <div class="wc-date">${d} ${isDay ? '️' : ''}</div>
      </div>`;
  }).join('');
}

function startWorldClock() {
  if (_wc_interval) clearInterval(_wc_interval);
  updateClockGrid();
  _wc_interval = setInterval(() => {
    if (!document.getElementById('wcGrid')) { clearInterval(_wc_interval); return; }
    updateClockGrid();
  }, 1000);

  window._wcRemove = (zone) => {
    _displayedZones = _displayedZones.filter(z => z !== zone);
    saveZones();
    updateClockGrid();
  };
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
      clearInterval(_cd_interval); _cd_interval = null;
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

    const btn  = document.getElementById('cdStartBtn');
    const done = document.getElementById('cdDone');
    if (btn)  { btn.textContent = '⏸ Dừng'; btn.classList.add('sw-btn--running'); }
    if (done) done.style.display = 'none';

    _cd_interval = setInterval(() => {
      const rem = Math.max(0, Math.ceil((_cd_target - Date.now()) / 1000));
      const d   = document.getElementById('cdDisplay');
      if (d) d.textContent = fmtCD(rem);
      if (rem === 0) {
        clearInterval(_cd_interval); _cd_interval = null;
        if (btn)  { btn.textContent = '▶ Bắt đầu'; btn.classList.remove('sw-btn--running'); }
        if (done) done.style.display = 'block';
        if (d)    d.style.color = '#4ade80';
        try { new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3').play().catch(() => {}); } catch {}
      }
    }, 1000);
  };

  window.cdReset = () => {
    clearInterval(_cd_interval); _cd_interval = null;
    const d   = document.getElementById('cdDisplay');
    const btn = document.getElementById('cdStartBtn');
    const done = document.getElementById('cdDone');
    if (d)    { d.textContent = '00:00:00'; d.style.color = ''; }
    if (btn)  { btn.textContent = '▶ Bắt đầu'; btn.classList.remove('sw-btn--running'); }
    if (done) done.style.display = 'none';
  };
}

export function destroyWorldClock() {
  clearInterval(_wc_interval);
  clearInterval(_sw_interval);
  clearInterval(_cd_interval);
  _wc_interval = _sw_interval = _cd_interval = null;
}
