/**
 * components/aqi.js — Air Quality Index widget
 * Hỗ trợ: AQICN station + OWM fallback + Dropdown chọn thành phố
 */
import { fetchAQI, aqiLevel } from '../api/aqi.js';

const AQI_CITIES = [
  // ── Miền Nam ──
  {
    label: 'TP.HCM', group: 'Miền Nam',
    station: 'ho-chi-minh-city',
    owmFallback: true, owmLat: 10.8231, owmLon: 106.6297,
    owmName: 'Hồ Chí Minh, Vietnam',
  },
  {
    label: 'Cần Thơ', group: 'Miền Nam',
    station: '@13687',
    owmFallback: true, owmLat: 10.0452, owmLon: 105.7469,
    owmName: 'Cần Thơ, Vietnam',
  },
  {
    label: 'Bình Dương', group: 'Miền Nam',
    station: null,
    owmFallback: true, owmLat: 11.1333, owmLon: 106.5497,
    owmName: 'Bình Dương, Vietnam',
  },
  {
    label: 'Biên Hòa', group: 'Miền Nam',
    station: null,
    owmFallback: true, owmLat: 10.9541, owmLon: 106.8345,
    owmName: 'Biên Hòa, Vietnam',
  },
  {
    label: 'Vũng Tàu', group: 'Miền Nam',
    station: null,
    owmFallback: true, owmLat: 10.4103, owmLon: 107.1364,
    owmName: 'Vũng Tàu, Vietnam',
  },

  // ── Miền Trung ──
  {
    label: 'Đà Nẵng', group: 'Miền Trung',
    station: null,   // AQICN @4629 trỏ sai → dùng OWM trực tiếp
    owmFallback: true, owmLat: 16.0544, owmLon: 108.2022,
    owmName: 'Đà Nẵng, Vietnam',
  },
  {
    label: 'Huế', group: 'Miền Trung',
    station: null,   // AQICN @5505 offline → dùng OWM
    owmFallback: true, owmLat: 16.4674, owmLon: 107.5905,
    owmName: 'Huế, Vietnam',
  },
  {
    label: 'Nha Trang', group: 'Miền Trung',
    station: null,
    owmFallback: true, owmLat: 12.2388, owmLon: 109.1967,
    owmName: 'Nha Trang, Vietnam',
  },
  {
    label: 'Quy Nhơn', group: 'Miền Trung',
    station: null,
    owmFallback: true, owmLat: 13.7829, owmLon: 109.2196,
    owmName: 'Quy Nhơn, Vietnam',
  },

  // ── Miền Bắc ──
  {
    label: 'Hà Nội', group: 'Miền Bắc',
    station: '@1583',  // Hanoi US Embassy - verified
    owmFallback: true, owmLat: 21.0285, owmLon: 105.8542,
    owmName: 'Hà Nội, Vietnam',
  },
  {
    label: 'Hải Phòng', group: 'Miền Bắc',
    station: null,
    owmFallback: true, owmLat: 20.8449, owmLon: 106.6881,
    owmName: 'Hải Phòng, Vietnam',
  },
  {
    label: 'Hạ Long', group: 'Miền Bắc',
    station: null,
    owmFallback: true, owmLat: 20.9557, owmLon: 107.0614,
    owmName: 'Hạ Long, Vietnam',
  },

  // ── Tây Nguyên ──
  {
    label: 'Đà Lạt', group: 'Tây Nguyên',
    station: null,
    owmFallback: true, owmLat: 11.9404, owmLon: 108.4583,
    owmName: 'Đà Lạt, Vietnam',
  },
  {
    label: 'Buôn Ma Thuột', group: 'Tây Nguyên',
    station: null,
    owmFallback: true, owmLat: 12.6670, owmLon: 108.0377,
    owmName: 'Buôn Ma Thuột, Vietnam',
  },
];

let currentStation = 'ho-chi-minh-city';
let currentCity    = AQI_CITIES[0];

export async function renderAQI(containerId = 'aqiContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `<div class="aqi-loading">🌍 Đang tải dữ liệu chất lượng không khí...</div>`;

  // Find current city config
  currentCity = AQI_CITIES.find(c => (c.station && c.station === currentStation) || (!c.station && c.owmName === currentStation))
              ?? AQI_CITIES[0];

  // ── Build dropdown grouped by region ──
  const groups = [...new Set(AQI_CITIES.map(c => c.group))];
  const groupedOptions = groups.map(g => {
    const opts = AQI_CITIES.filter(c => c.group === g).map(c => {
      const key = c.station || c.owmName;
      const sel = key === currentStation || (!currentStation && c === currentCity) ? 'selected' : '';
      return `<option value="${key}" ${sel}>${c.label}</option>`;
    }).join('');
    return `<optgroup label="${g}">${opts}</optgroup>`;
  }).join('');

  const selectorHtml = `
    <div class="aqi-selector-row">
      <span class="aqi-selector-label">📍 Chọn thành phố:</span>
      <select class="aqi-city-dropdown" id="aqiCityDropdown" onchange="window.aqiSelectCity(this.value)">
        ${groupedOptions}
      </select>
    </div>`;

  try {
    let data = null;

    // If city has a valid station, try AQICN first
    if (currentCity.station) {
      data = await fetchAQI(currentCity.station);
    }

    // OWM Fallback: use when AQICN data is missing/invalid or station is null
    if ((!data || data.aqi === '-' || data.aqi == null) && currentCity.owmFallback) {
      const owmData = await fetchOWMAQI(currentCity);
      if (owmData) {
        return renderFromOWM(el, selectorHtml, owmData, currentCity);
      }
    }

    if (!data) {
      el.innerHTML = `${selectorHtml}<div class="error-msg">⚠️ Không lấy được dữ liệu AQI. Vui lòng thử lại sau.</div>`;
      return;
    }

    const aqi = typeof data.aqi === 'number' ? data.aqi : null;
    if (aqi === null) {
      // Try OWM fallback
      if (currentCity.owmFallback) {
        const owmData = await fetchOWMAQI(currentCity);
        if (owmData) return renderFromOWM(el, selectorHtml, owmData, currentCity);
      }
      el.innerHTML = `
        ${selectorHtml}
        <div class="error-msg">⚠️ Trạm đo không có dữ liệu (offline). Hãy thử thành phố khác.</div>`;
      return;
    }

    const level  = aqiLevel(aqi);
    const city   = data.city?.name ?? currentCity.label;
    const updated = data.time?.s ?? '';
    const iaqi   = data.iaqi ?? {};

    const pollutants = [
      { key: 'pm25', label: 'PM2.5', unit: 'µg/m³' },
      { key: 'pm10', label: 'PM10',  unit: 'µg/m³' },
      { key: 'o3',   label: 'O₃',    unit: 'ppb' },
      { key: 'no2',  label: 'NO₂',   unit: 'ppb' },
      { key: 'so2',  label: 'SO₂',   unit: 'ppb' },
      { key: 'co',   label: 'CO',    unit: 'ppm' },
    ].filter(p => iaqi[p.key]);

    const pollutantCards = pollutants.map(p => `
      <div class="aqi-poll-card">
        <div class="aqi-poll-name">${p.label}</div>
        <div class="aqi-poll-val">${iaqi[p.key]?.v?.toFixed(1) ?? '—'}</div>
        <div class="aqi-poll-unit">${p.unit}</div>
      </div>
    `).join('');

    el.innerHTML = `
      ${selectorHtml}
      <div class="aqi-hero" style="background:${level.bg};border-color:${level.color}40;">
        <div class="aqi-hero-left">
          <div class="aqi-emoji">${level.emoji}</div>
          <div>
            <div class="aqi-number" style="color:${level.color};">${aqi}</div>
            <div class="aqi-label" style="color:${level.color};">${level.label}</div>
          </div>
        </div>
        <div class="aqi-hero-right">
          <div class="aqi-city">📍 ${city}</div>
          <div class="aqi-scale">
            <div class="aqi-scale-bar">
              <div class="aqi-scale-fill" style="width:${Math.min(aqi/300*100,100)}%;background:${level.color};"></div>
            </div>
            <div class="aqi-scale-labels">
              <span style="color:#4ade80">Tốt</span>
              <span style="color:#fb923c">Có hại</span>
              <span style="color:#9f1239">Nguy hiểm</span>
            </div>
          </div>
          ${updated ? `<div class="aqi-updated">🕒 ${updated}</div>` : ''}
        </div>
      </div>
      <div class="aqi-standard-note">
        ℹ️ Tiêu chuẩn <strong>US AQI (EPA)</strong> · Trạm: ${city}
        &nbsp;· Giá trị có thể khác với IQAir (dùng tiêu chuẩn CN AQI)
      </div>
      ${pollutantCards.length ? `
        <div class="aqi-poll-label">Chỉ số ô nhiễm</div>
        <div class="aqi-poll-grid">${pollutantCards}</div>
      ` : ''}
      <div class="aqi-advice" style="border-color:${level.color}30;background:${level.bg};">
        ${aqiAdvice(aqi)}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `${selectorHtml}<div class="error-msg">⚠️ ${err.message}</div>`;
  }
}

function aqiAdvice(aqi) {
  if (aqi <= 50)  return '✅ <strong>Chất lượng tốt.</strong> Thích hợp cho mọi hoạt động ngoài trời.';
  if (aqi <= 100) return '⚠️ <strong>Chấp nhận được.</strong> Người nhạy cảm nên hạn chế vận động mạnh ngoài trời.';
  if (aqi <= 150) return '😷 <strong>Không tốt cho nhóm nhạy cảm.</strong> Trẻ em, người già, người bệnh hô hấp nên ở trong nhà.';
  if (aqi <= 200) return '🚨 <strong>Có hại cho sức khỏe.</strong> Mọi người nên hạn chế ra ngoài, đeo khẩu trang N95.';
  if (aqi <= 300) return '☠️ <strong>Rất có hại.</strong> Tránh ra ngoài. Đóng kín cửa sổ, dùng máy lọc không khí.';
  return '☣️ <strong>Nguy hiểm khẩn cấp.</strong> Không ra ngoài, liên hệ cơ quan y tế nếu có triệu chứng.';
}

window.aqiSelectCity = async (key) => {
  // Find by station first, else by owmName
  const city = AQI_CITIES.find(c => c.station === key || c.owmName === key);
  if (!city) return;
  currentStation = key;
  currentCity = city;
  await renderAQI();
};

// Initialize with proper currentStation
currentStation = AQI_CITIES[0].station || AQI_CITIES[0].owmName;

// ── OWM Air Pollution API helper ──
async function fetchOWMAQI(cityConf) {
  try {
    const res = await fetch(
      `/weather?endpoint=air_pollution&lat=${cityConf.owmLat}&lon=${cityConf.owmLon}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// Convert OWM PM2.5 (µg/m³) to US AQI
function owmPm25ToAQI(pm25) {
  const bp = [
    [0,    12,   0,   50],
    [12.1, 35.4, 51,  100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4,151, 200],
    [150.5,250.4,201, 300],
    [250.5,350.4,301, 400],
    [350.5,500.4,401, 500],
  ];
  for (const [cLo, cHi, iLo, iHi] of bp) {
    if (pm25 >= cLo && pm25 <= cHi) {
      return Math.round((iHi - iLo) / (cHi - cLo) * (pm25 - cLo) + iLo);
    }
  }
  return Math.round(pm25 * 2);
}

function aqiLevelFn(aqi) {
  if (aqi <= 50)  return { label: 'Tốt',               emoji: '😊', color: '#4ade80', bg: 'rgba(74,222,128,0.08)'  };
  if (aqi <= 100) return { label: 'Chấp nhận',          emoji: '😐', color: '#facc15', bg: 'rgba(250,204,21,0.08)'  };
  if (aqi <= 150) return { label: 'Không tốt (nhạy)',   emoji: '😷', color: '#fb923c', bg: 'rgba(251,146,60,0.08)' };
  if (aqi <= 200) return { label: 'Có hại',             emoji: '🤢', color: '#f87171', bg: 'rgba(248,113,113,0.08)'};
  if (aqi <= 300) return { label: 'Rất có hại',         emoji: '☠️', color: '#c084fc', bg: 'rgba(192,132,252,0.08)'};
  return               { label: 'Nguy hiểm',            emoji: '☣️', color: '#9f1239', bg: 'rgba(159,18,57,0.1)'   };
}

function renderFromOWM(el, selectorHtml, owmData, cityConf) {
  const comp   = owmData.list?.[0]?.components ?? {};
  const pm25   = comp.pm2_5 ?? 0;
  const aqi    = owmPm25ToAQI(pm25);
  const level  = aqiLevelFn(aqi);

  const pollCards = [
    { label: 'PM2.5', val: pm25?.toFixed(1),     unit: 'µg/m³' },
    { label: 'PM10',  val: comp.pm10?.toFixed(1), unit: 'µg/m³' },
    { label: 'O₃',   val: comp.o3?.toFixed(1),   unit: 'µg/m³' },
    { label: 'NO₂',  val: comp.no2?.toFixed(1),  unit: 'µg/m³' },
    { label: 'SO₂',  val: comp.so2?.toFixed(1),  unit: 'µg/m³' },
    { label: 'CO',   val: (comp.co/1000)?.toFixed(2), unit: 'ppm' },
  ].filter(p => p.val && p.val !== 'undefined').map(p => `
    <div class="aqi-poll-card">
      <div class="aqi-poll-name">${p.label}</div>
      <div class="aqi-poll-val">${p.val}</div>
      <div class="aqi-poll-unit">${p.unit}</div>
    </div>`).join('');

  el.innerHTML = `
    ${selectorHtml}
    <div class="aqi-hero" style="background:${level.bg};border-color:${level.color}40;">
      <div class="aqi-hero-left">
        <div class="aqi-emoji">${level.emoji}</div>
        <div>
          <div class="aqi-number" style="color:${level.color};">${aqi}</div>
          <div class="aqi-label" style="color:${level.color};">${level.label}</div>
        </div>
      </div>
      <div class="aqi-hero-right">
        <div class="aqi-city">📍 ${cityConf.owmName}</div>
        <div class="aqi-scale">
          <div class="aqi-scale-bar"><div class="aqi-scale-fill" style="width:${Math.min(aqi/300*100,100)}%;background:${level.color};"></div></div>
          <div class="aqi-scale-labels">
            <span style="color:#4ade80">Tốt</span><span style="color:#fb923c">Có hại</span><span style="color:#9f1239">Nguy hiểm</span>
          </div>
        </div>
      </div>
    </div>
    <div class="aqi-standard-note">
      📡 Nguồn: <strong>OpenWeatherMap Air Pollution</strong> · Tiêu chuẩn US AQI (EPA)
    </div>
    <div class="aqi-poll-label">Chỉ số ô nhiễm</div>
    <div class="aqi-poll-grid">${pollCards}</div>
    <div class="aqi-advice" style="border-color:${level.color}30;background:${level.bg};">
      ${aqiAdvice(aqi)}
    </div>
  `;
}
