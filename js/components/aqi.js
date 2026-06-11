/**
 * components/aqi.js — Air Quality Index widget
 */
import { fetchAQI, aqiLevel } from '../api/aqi.js';

const AQI_CITIES = [
  {
    label: 'TP.HCM',
    station: '@8767',           // US Consulate - often offline
    owmFallback: true,          // use OWM Air Pollution as fallback
    owmLat: 10.8231, owmLon: 106.6297,
    owmName: 'Hồ Chí Minh, Vietnam',
  },
  { label: 'Hà Nội',  station: '@1583'  },  // Hanoi verified
  { label: 'Đà Nẵng', station: '@1584'  },  // Da Nang verified
  { label: 'Cần Thơ', station: '@13687' },  // Cần Thơ/Ninh Kiều KTTV verified
  { label: 'Huế',     station: '@5505'  },  // Tp Huế verified
];

let currentStation = '@8767'; // TP.HCM default
let currentCity    = AQI_CITIES[0]; // full config object

export async function renderAQI(containerId = 'aqiContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `<div class="aqi-loading">🌍 Đang tải dữ liệu chất lượng không khí...</div>`;

  // Find current city config
  currentCity = AQI_CITIES.find(c => c.station === currentStation) ?? AQI_CITIES[0];

  // City chips
  const chips = AQI_CITIES.map(c => `
    <button class="aqi-chip ${c.station === currentStation ? 'active' : ''}"
            onclick="window.aqiSelectCity('${c.station}')">${c.label}</button>
  `).join('');

  try {
    let data = await fetchAQI(currentStation);

    // ── OWM Fallback for HCM when AQICN station offline ──
    if ((!data || data.aqi === '-' || data.aqi === null) && currentCity?.owmFallback) {
      const owmData = await fetchOWMAQI(currentCity);
      if (owmData) {
        return renderFromOWM(el, chips, owmData, currentCity);
      }
    }
    if (!data) {
      el.innerHTML = `<div class="aqi-chips">${chips}</div><div class="error-msg">⚠️ Không lấy được dữ liệu AQI. Vui lòng thử lại sau.</div>`;
      return;
    }

    const aqi = typeof data.aqi === 'number' ? data.aqi : null;
    if (aqi === null) {
      el.innerHTML = `
        <div class="aqi-chips">${chips}</div>
        <div class="error-msg">⚠️ Trạm đo không có dữ liệu (offline hoặc chưa có kết quả). Hãy thử thành phố khác.</div>`;
      return;
    }
    const level  = aqiLevel(aqi);
    const city   = data.city?.name ?? currentStation;
    const updated = data.time?.s ?? '';
    const iaqi   = data.iaqi ?? {};

    // Individual pollutants
    const pollutants = [
      { key: 'pm25',  label: 'PM2.5', unit: 'µg/m³' },
      { key: 'pm10',  label: 'PM10',  unit: 'µg/m³' },
      { key: 'o3',    label: 'O₃',    unit: 'ppb' },
      { key: 'no2',   label: 'NO₂',   unit: 'ppb' },
      { key: 'so2',   label: 'SO₂',   unit: 'ppb' },
      { key: 'co',    label: 'CO',    unit: 'ppm' },
    ].filter(p => iaqi[p.key]);

    const pollutantCards = pollutants.map(p => `
      <div class="aqi-poll-card">
        <div class="aqi-poll-name">${p.label}</div>
        <div class="aqi-poll-val">${iaqi[p.key]?.v?.toFixed(1) ?? '—'}</div>
        <div class="aqi-poll-unit">${p.unit}</div>
      </div>
    `).join('');

    el.innerHTML = `
      <!-- City chips -->
      <div class="aqi-chips">${chips}</div>

      <!-- Hero AQI -->
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
        &nbsp;·; Giá trị có thể khác với IQAir (dùng tiêu chuẩn CN AQI)
      </div>

      <!-- Pollutant breakdown -->
      ${pollutantCards.length ? `
        <div class="aqi-poll-label">Chỉ số ô nhiễm</div>
        <div class="aqi-poll-grid">${pollutantCards}</div>
      ` : ''}

      <!-- Health advice -->
      <div class="aqi-advice" style="border-color:${level.color}30;background:${level.bg};">
        ${aqiAdvice(aqi)}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="error-msg">⚠️ ${err.message}</div>`;
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

window.aqiSelectCity = async (station) => {
  currentStation = station;
  currentCity = AQI_CITIES.find(c => c.station === station) ?? AQI_CITIES[0];
  await renderAQI();
};

// ── OWM Air Pollution API helper (gọi qua /weather proxy) ──
async function fetchOWMAQI(cityConf) {
  try {
    const res = await fetch(
      `/weather?endpoint=air_pollution&lat=${cityConf.owmLat}&lon=${cityConf.owmLon}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// Convert OWM components (µg/m³) to US AQI using PM2.5 breakpoints
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

function renderFromOWM(el, chips, owmData, cityConf) {
  const comp   = owmData.list?.[0]?.components ?? {};
  const pm25   = comp.pm2_5 ?? 0;
  const aqi    = owmPm25ToAQI(pm25);
  const { aqiLevel } = window._aqiLevel || {}; // need direct import
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
    <div class="aqi-chips">${chips}</div>
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
      📡 Nguồn: <strong>OpenWeatherMap Air Pollution</strong> · Trạm AQICN tạm offline · Tiêu chuẩn US AQI (EPA)
    </div>
    <div class="aqi-poll-label">Chỉ số ô nhiễm</div>
    <div class="aqi-poll-grid">${pollCards}</div>
    <div class="aqi-advice" style="border-color:${level.color}30;background:${level.bg};">
      ${aqiAdviceFn(aqi)}
    </div>
  `;
}

// Local copies for use in OWM renderer (avoid circular deps)
function aqiLevelFn(aqi) {
  if (aqi <= 50)  return { label: 'Tốt',            emoji: '😊', color: '#4ade80', bg: 'rgba(74,222,128,0.08)'  };
  if (aqi <= 100) return { label: 'Chấp nhận',       emoji: '😐', color: '#facc15', bg: 'rgba(250,204,21,0.08)'  };
  if (aqi <= 150) return { label: 'Không tốt (nhạy)', emoji: '😷', color: '#fb923c', bg: 'rgba(251,146,60,0.08)' };
  if (aqi <= 200) return { label: 'Có hại',          emoji: '🤢', color: '#f87171', bg: 'rgba(248,113,113,0.08)'};
  if (aqi <= 300) return { label: 'Rất có hại',      emoji: '☠️', color: '#c084fc', bg: 'rgba(192,132,252,0.08)'};
  return               { label: 'Nguy hiểm',          emoji: '☣️', color: '#9f1239', bg: 'rgba(159,18,57,0.1)'   };
}

function aqiAdviceFn(aqi) {
  if (aqi <= 50)  return '✅ <strong>Chất lượng tốt.</strong> Thích hợp cho mọi hoạt động ngoài trời.';
  if (aqi <= 100) return '⚠️ <strong>Chấp nhận được.</strong> Người nhạy cảm nên hạn chế vận động mạnh ngoài trời.';
  if (aqi <= 150) return '😷 <strong>Không tốt cho nhóm nhạy cảm.</strong> Trẻ em, người già, người bệnh hô hấp nên ở trong nhà.';
  if (aqi <= 200) return '🚨 <strong>Có hại cho sức khỏe.</strong> Mọi người nên hạn chế ra ngoài, đeo khẩu trang N95.';
  if (aqi <= 300) return '☠️ <strong>Rất có hại.</strong> Tránh ra ngoài. Đóng kín cửa sổ, dùng máy lọc không khí.';
  return '☣️ <strong>Nguy hiểm khẩn cấp.</strong> Không ra ngoài, liên hệ cơ quan y tế nếu có triệu chứng.';
}
