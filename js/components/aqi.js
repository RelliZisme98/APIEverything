/**
 * components/aqi.js — Air Quality Index widget
 */
import { fetchAQI, aqiLevel } from '../api/aqi.js';
import { state } from '../store/state.js';

const AQI_CITIES = [
  { label: 'TP.HCM',  station: 'geo:10.7769;106.7009' },  // HCM center — geo fallback (US Consulate offline)
  { label: 'Hà Nội',  station: '@1437' },                   // Hanoi – Kim Liên station (verified)
  { label: 'Đà Nẵng', station: '@1584' },                   // Da Nang city (verified, AQI=13)
  { label: 'Cần Thơ', station: '@13687' },                  // Cần Thơ/Ninh Kiều – KTTV (verified, AQI=26)
  { label: 'Huế',     station: '@5505' },                   // Tp Huế (verified)
];

let currentStation = 'geo:10.7769;106.7009'; // TP.HCM default

export async function renderAQI(containerId = 'aqiContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!state.aqiToken) {
    el.innerHTML = `
      <div class="aqi-no-key">
        <div style="font-size:36px;margin-bottom:10px;">🌫️</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:6px;">Cần AQICN API Token</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
          Đăng ký miễn phí tại <a href="https://aqicn.org/api/" target="_blank" style="color:var(--accent-blue);">aqicn.org/api</a>
          rồi điền vào <code>config.js</code> → <code>AQICN_TOKEN</code>
        </div>
      </div>`;
    return;
  }

  el.innerHTML = `<div class="aqi-loading">🌍 Đang tải dữ liệu chất lượng không khí...</div>`;

  // City chips
  const chips = AQI_CITIES.map(c => `
    <button class="aqi-chip ${c.station === currentStation ? 'active' : ''}"
            onclick="window.aqiSelectCity('${c.station}')">${c.label}</button>
  `).join('');

  try {
    const data = await fetchAQI(currentStation);
    if (!data) {
      el.innerHTML = `<div class="aqi-chips">${chips}</div><div class="error-msg">⚠️ Không lấy được dữ liệu AQI. Kiểm tra lại token.</div>`;
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
  await renderAQI();
};
