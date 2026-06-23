import { WEATHER_ICONS } from '../api/weather.js';
import { state } from '../store/state.js';

/** Popular Vietnamese cities for quick-select */
const QUICK_CITIES = [
  { label: 'TP.HCM',    query: 'Ho Chi Minh City,VN' },
  { label: 'Hà Nội',    query: 'Hanoi,VN' },
  { label: 'Đà Nẵng',   query: 'Da Nang,VN' },
  { label: 'Cần Thơ',   query: 'Can Tho,VN' },
  { label: 'Nha Trang', query: 'Nha Trang,VN' },
  { label: 'Hải Phòng', query: 'Haiphong,VN' },
  { label: 'Huế',       query: 'Hue,VN' },
  { label: 'Đà Lạt',    query: 'Da Lat,VN' },
];

/** Gradient theme per weather condition */
const WEATHER_THEMES = {
  clear:   { grad: 'linear-gradient(135deg,rgba(255,191,71,0.12),rgba(255,140,0,0.06))', border: 'rgba(255,191,71,0.25)' },
  clouds:  { grad: 'linear-gradient(135deg,rgba(148,163,184,0.1),rgba(100,116,139,0.06))', border: 'rgba(148,163,184,0.2)' },
  rain:    { grad: 'linear-gradient(135deg,rgba(56,189,248,0.1),rgba(14,165,233,0.06))', border: 'rgba(56,189,248,0.2)' },
  storm:   { grad: 'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(79,70,229,0.06))', border: 'rgba(139,92,246,0.25)' },
  snow:    { grad: 'linear-gradient(135deg,rgba(186,230,253,0.12),rgba(147,197,253,0.06))', border: 'rgba(186,230,253,0.2)' },
  mist:    { grad: 'linear-gradient(135deg,rgba(203,213,225,0.1),rgba(148,163,184,0.06))', border: 'rgba(203,213,225,0.15)' },
};

function getTheme(iconCode = '') {
  const id = iconCode.replace(/[dn]$/, '');
  if (['01','02'].includes(id)) return WEATHER_THEMES.clear;
  if (['03','04'].includes(id)) return WEATHER_THEMES.clouds;
  if (['09','10'].includes(id)) return WEATHER_THEMES.rain;
  if (['11'].includes(id))      return WEATHER_THEMES.storm;
  if (['13'].includes(id))      return WEATHER_THEMES.snow;
  return WEATHER_THEMES.mist;
}

/**
 * Render the quick-city chips.
 * Exposed so main.js can call window.selectCity().
 */
export function renderQuickCities(containerId = 'weatherQuickCities') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = QUICK_CITIES.map(c => `
    <button type="button" class="weather-city-chip" onclick="selectCity('${c.query}')">${c.label}</button>
  `).join('');
}

/**
 * Render successful weather data.
 * @param {Object} d – OWM weather response
 */
export function renderWeather(d, todayMinMax = null, containerId = 'weatherContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  const iconCode = d.weather[0]?.icon ?? '01d';
  const icon     = WEATHER_ICONS[iconCode] ?? '🌡️';
  const theme    = getTheme(iconCode);
  const temp     = Math.round(d.main.temp);
  const feels    = Math.round(d.main.feels_like);
  const tempMin  = todayMinMax ? Math.round(todayMinMax.min) : Math.round(d.main.temp_min);
  const tempMax  = todayMinMax ? Math.round(todayMinMax.max) : Math.round(d.main.temp_max);
  const humidity = d.main.humidity;
  const pressure = d.main.pressure;
  const windKmh  = (d.wind.speed * 3.6).toFixed(0);
  const windDir  = degToCompass(d.wind.deg);
  const vis      = d.visibility ? (d.visibility / 1000).toFixed(1) + ' km' : '—';
  const desc     = d.weather[0]?.description ?? '';
  const sunrise  = new Date(d.sys.sunrise * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const sunset   = new Date(d.sys.sunset  * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // Heat index level
  const heatLevel = temp >= 38 ? '🔴 Nguy hiểm' : temp >= 35 ? '🟠 Rất nóng' : temp >= 32 ? '🟡 Nóng' : '';

  // Get AQI from state
  const aqi = state.aqiData?.aqi;
  const aqiLvl = getAqiLevel(aqi);
  const aqiAdv = getAqiAdvice(aqi);

  const iaqi = state.aqiData?.iaqi || {};
  const pm25Val = iaqi.pm25?.v ?? state.aqiData?.components?.pm2_5;
  const pm10Val = iaqi.pm10?.v ?? state.aqiData?.components?.pm10;
  const o3Val = iaqi.o3?.v ?? state.aqiData?.components?.o3;

  let pollutantsHtml = '';
  if (pm25Val != null || pm10Val != null) {
    pollutantsHtml = `
      <div style="display:flex;gap:12px;margin-top:8px;font-size:11px;color:var(--text-muted);">
        ${pm25Val != null ? `<span>PM2.5: <strong style="color:${aqiLvl.color};">${pm25Val.toFixed(1)}</strong> µg/m³</span>` : ''}
        ${pm10Val != null ? `<span>PM10: <strong style="color:${aqiLvl.color};">${pm10Val.toFixed(1)}</strong> µg/m³</span>` : ''}
        ${o3Val != null ? `<span>O₃: <strong style="color:${aqiLvl.color};">${o3Val.toFixed(1)}</strong> ppb</span>` : ''}
      </div>
    `;
  }

  // Create sub-containers if they don't exist
  let heroStatsEl = el.querySelector('#weatherHeroAndStats');
  if (!heroStatsEl) {
    el.innerHTML = `
      <div id="weatherHeroAndStats"></div>
      <div id="weatherHourly" style="margin-top:14px;"></div>
      <div id="weatherWindyMap" style="margin-top:14px;"></div>
      <div id="weatherForecast"></div>
    `;
    heroStatsEl = el.querySelector('#weatherHeroAndStats');
  }

  heroStatsEl.innerHTML = `
    <!-- ── Hero weather display ── -->
    <div class="weather-hero animate-fade-in-up"
         style="background:${theme.grad};border:1px solid ${theme.border};border-radius:var(--radius-sm);padding:16px;margin-bottom:14px;">
      <div class="weather-hero-top">
        <div class="weather-big-icon">${icon}</div>
        <div class="weather-temp-block">
          <div class="weather-temp-big">${temp}<span class="weather-deg">°C</span></div>
          <div class="weather-minmax">${tempMin}° / ${tempMax}°</div>
          ${heatLevel ? `<div class="weather-heat">${heatLevel}</div>` : ''}
        </div>
      </div>
      <div class="weather-location">
        📍 ${d.name}, ${d.sys.country}
        <span class="weather-desc-badge">${desc}</span>
      </div>
    </div>

    <!-- ── Stats grid ── -->
    <div class="weather-stats-grid">
      <div class="wstat2">
        <div class="wstat2-icon">🌡️</div>
        <div class="wstat2-label">Cảm giác như</div>
        <div class="wstat2-val">${feels}°C</div>
      </div>
      <div class="wstat2">
        <div class="wstat2-icon">💧</div>
        <div class="wstat2-label">Độ ẩm</div>
        <div class="wstat2-val">${humidity}%</div>
      </div>
      <div class="wstat2">
        <div class="wstat2-icon">💨</div>
        <div class="wstat2-label">Gió</div>
        <div class="wstat2-val">${windKmh} km/h</div>
        <div class="wstat2-sub">${windDir}</div>
      </div>
      <div class="wstat2">
        <div class="wstat2-icon">👁️</div>
        <div class="wstat2-label">Tầm nhìn</div>
        <div class="wstat2-val">${vis}</div>
      </div>
      <div class="wstat2">
        <div class="wstat2-icon">🌅</div>
        <div class="wstat2-label">Bình minh</div>
        <div class="wstat2-val">${sunrise}</div>
      </div>
      <div class="wstat2">
        <div class="wstat2-icon">🌇</div>
        <div class="wstat2-label">Hoàng hôn</div>
        <div class="wstat2-val">${sunset}</div>
      </div>
      <div class="wstat2">
        <div class="wstat2-icon">⏱️</div>
        <div class="wstat2-label">Áp suất</div>
        <div class="wstat2-val">${pressure} hPa</div>
      </div>
      <div class="wstat2">
        <div class="wstat2-icon">☁️</div>
        <div class="wstat2-label">Mây che phủ</div>
        <div class="wstat2-val">${d.clouds?.all ?? '—'}%</div>
      </div>
    </div>

    <!-- ── AQI Environmental block ── -->
    <div class="weather-aqi-block animate-fade-in-up" style="background:${aqiLvl.bg};border:1px solid ${aqiLvl.color}25;border-radius:12px;padding:16px;margin-top:16px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:32px;">${aqiLvl.emoji}</span>
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:700;color:var(--text-primary);">Chất lượng không khí (AQI)</span>
            <span style="font-size:11px;font-weight:700;color:${aqiLvl.color};background:rgba(255,255,255,0.03);padding:2px 8px;border-radius:12px;border:1px solid ${aqiLvl.color}30;">
              ${aqi != null ? aqi + ' · ' + aqiLvl.label : 'Chưa có dữ liệu'}
            </span>
          </div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;line-height:1.4;">
            ${aqiAdv}
          </div>
          ${pollutantsHtml}
        </div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--text-muted);margin-top:10px;text-align:right;">
      ⏱️ ${new Date().toLocaleTimeString('vi-VN')} · OpenWeatherMap
    </div>
  `;
}

/** Render Windy interactive weather map radar widget */
export function renderWindyMap(lat, lon, containerId = 'weatherWindyMap') {
  const el = document.getElementById(containerId);
  if (!el) return;

  // Store coordinates and default overlay in dataset
  el.dataset.lat = lat;
  el.dataset.lon = lon;
  el.dataset.overlay = 'rain';

  const getIframeUrl = (overlay) => {
    return `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=6&level=surface&overlay=${overlay}&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`;
  };

  el.innerHTML = `
    <div class="wf-section-label" style="margin-bottom: 8px;">🌀 Bản đồ thời tiết Windy</div>
    
    <div class="windy-controls" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
      <button class="windy-tab-btn active" data-overlay="rain" onclick="window.changeWindyOverlay('rain')">🌧️ Mưa & Sét</button>
      <button class="windy-tab-btn" data-overlay="wind" onclick="window.changeWindyOverlay('wind')">💨 Gió & Bão</button>
      <button class="windy-tab-btn" data-overlay="clouds" onclick="window.changeWindyOverlay('clouds')">☁️ Mây che phủ</button>
      <button class="windy-tab-btn" data-overlay="temp" onclick="window.changeWindyOverlay('temp')">🌡️ Nhiệt độ</button>
      <button class="windy-tab-btn" data-overlay="radar" onclick="window.changeWindyOverlay('radar')">📡 Radar thời tiết</button>
    </div>

    <div class="windy-map-wrap" style="position:relative;width:100%;height:380px;border-radius:var(--radius-sm);overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
      <iframe 
        id="windyIframe"
        src="${getIframeUrl('rain')}" 
        width="100%" 
        height="100%" 
        style="border:none;background:var(--bg-card);" 
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        frameborder="0">
      </iframe>
    </div>
  `;
}

// Global function to toggle Windy overlay
window.changeWindyOverlay = (overlay) => {
  const container = document.getElementById('weatherWindyMap');
  const iframe = document.getElementById('windyIframe');
  if (!container || !iframe) return;

  const lat = container.dataset.lat;
  const lon = container.dataset.lon;
  if (!lat || !lon) return;

  // Update active state of control buttons
  const buttons = container.querySelectorAll('.windy-tab-btn');
  buttons.forEach(btn => {
    if (btn.dataset.overlay === overlay) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update iframe URL
  iframe.src = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=6&level=surface&overlay=${overlay}&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`;
};

/** Render 5-day daily forecast strip */
export function renderForecast(days, containerId = 'weatherForecast') {
  const el = document.getElementById(containerId);
  if (!el || !days?.length) return;

  const DAY_VI = ['CN','T2','T3','T4','T5','T6','T7'];

  const cards = days.map(d => {
    const date   = new Date(d.dt * 1000);
    const dayStr = DAY_VI[date.getDay()];
    const ddmm   = `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;
    const icon   = WEATHER_ICONS[d.icon] ?? '🌡️';
    const popBar = d.pop > 0
      ? `<div class="wf-pop-bar"><div class="wf-pop-fill" style="width:${d.pop}%"></div></div>
         <div class="wf-pop-label">🌧 ${d.pop}%</div>`
      : '<div class="wf-pop-label" style="color:var(--text-muted)">☀️ Khô</div>';

    return `
      <div class="wf-card">
        <div class="wf-day">${dayStr}</div>
        <div class="wf-date">${ddmm}</div>
        <div class="wf-icon">${icon}</div>
        <div class="wf-desc">${d.desc}</div>
        <div class="wf-temps">
          <span class="wf-max">${d.tempMax}°</span>
          <span class="wf-min">${d.tempMin}°</span>
        </div>
        ${popBar}
        <div class="wf-wind">💨 ${d.windKmh} km/h</div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="wf-section-label">📅 Dự báo 5 ngày tới</div>
    <div class="wf-strip">${cards}</div>
  `;
}

/** Convert wind degrees to compass direction */
function degToCompass(deg) {
  if (deg == null) return '—';
  const dirs = ['Bắc','ĐB','Đông','ĐN','Nam','TN','Tây','TB'];
  return dirs[Math.round(deg / 45) % 8];
}

/** Show loading state */
export function renderWeatherLoading(containerId = 'weatherContent') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;padding:24px;gap:10px;">
      <div style="font-size:36px;animation:pulse-green 1.5s infinite;">🌍</div>
      <div style="font-size:13px;color:var(--text-muted);">Đang lấy dữ liệu thời tiết...</div>
    </div>
  `;
}

/** Show error */
export function renderWeatherError(msg, containerId = 'weatherContent') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="error-msg" style="margin-top:8px;">⚠️ ${msg}</div>`;
}

/** Toggle weather badge */
export function setWeatherBadge(isLive, badgeId = 'weatherBadge') {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  if (isLive) {
    badge.className = 'card-badge badge-live';
    badge.innerHTML = `<span class="status-dot dot-green"></span>LIVE`;
  } else {
    badge.className = 'card-badge badge-needkey';
    badge.innerHTML = `<span class="status-dot dot-red"></span>CẦN KEY`;
  }
}

/** Render 24h hourly forecast strip */
export function renderHourly(hours, containerId = 'weatherHourly') {
  const el = document.getElementById(containerId);
  if (!el || !hours?.length) return;

  const cards = hours.map(h => {
    const icon = WEATHER_ICONS[h.icon] ?? '🌡️';
    const popText = h.pop > 0 ? `🌧️ ${h.pop}%` : '☀️ Khô';
    return `
      <div class="wh-card">
        <div class="wh-time">${h.time}</div>
        <div class="wh-icon">${icon}</div>
        <div class="wh-temp">${h.temp}°</div>
        <div class="wh-pop">${popText}</div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="wf-section-label">🕒 Dự báo theo giờ (24h tới)</div>
    <div class="wh-strip">${cards}</div>
  `;
}

function getAqiLevel(aqi) {
  if (aqi == null) return { label: 'Chưa có dữ liệu', color: '#94a3b8', bg: 'rgba(148,163,184,0.05)', emoji: '❓' };
  if (aqi <= 50)  return { label: 'Tốt',         color: '#4ade80', bg: 'rgba(74,222,128,0.05)',  emoji: '😊' };
  if (aqi <= 100) return { label: 'Trung bình',   color: '#facc15', bg: 'rgba(250,204,21,0.05)',  emoji: '😐' };
  if (aqi <= 150) return { label: 'Không tốt',    color: '#fb923c', bg: 'rgba(251,146,60,0.05)',  emoji: '😷' };
  if (aqi <= 200) return { label: 'Có hại',       color: '#f87171', bg: 'rgba(248,113,113,0.05)', emoji: '🤢' };
  if (aqi <= 300) return { label: 'Rất có hại',   color: '#c084fc', bg: 'rgba(192,132,252,0.05)', emoji: '☠️' };
  return           { label: 'Nguy hiểm',          color: '#9f1239', bg: 'rgba(159,18,57,0.08)',  emoji: '☣️' };
}

function getAqiAdvice(aqi) {
  if (aqi == null) return 'Không tìm thấy dữ liệu chất lượng không khí cho khu vực này.';
  if (aqi <= 50)  return 'Chất lượng không khí sạch, thích hợp cho mọi hoạt động ngoài trời.';
  if (aqi <= 100) return 'Chấp nhận được. Nhóm nhạy cảm nên hạn chế vận động mạnh ngoài trời.';
  if (aqi <= 150) return 'Không tốt cho nhóm nhạy cảm. Trẻ em, người già nên hạn chế ra ngoài.';
  if (aqi <= 200) return 'Có hại cho sức khỏe. Khuyến nghị đeo khẩu trang khi ra đường.';
  if (aqi <= 300) return 'Rất có hại. Hạn chế ra ngoài, đóng cửa sổ, dùng máy lọc khí.';
  return 'Nguy hiểm khẩn cấp. Tránh ra ngoài, đóng kín cửa phòng.';
}
