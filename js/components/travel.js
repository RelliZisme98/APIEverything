/* ── Travel & Flight Status Component ── */

const VN_CITIES = {
  "han": { name: "Hà Nội", code: "HAN", airport: "Nội Bài", lat: 21.0285, lng: 105.8542 },
  "hph": { name: "Hải Phòng", code: "HPH", airport: "Cát Bi", lat: 20.8449, lng: 106.6881 },
  "dad": { name: "Đà Nẵng", code: "DAD", airport: "Đà Nẵng", lat: 16.0544, lng: 108.2022 },
  "cxr": { name: "Nha Trang", code: "CXR", airport: "Cam Ranh", lat: 12.2388, lng: 109.1967 },
  "dli": { name: "Đà Lạt", code: "DLI", airport: "Liên Khương", lat: 11.9404, lng: 108.4583 },
  "sgn": { name: "TP. Hồ Chí Minh", code: "SGN", airport: "Tân Sơn Nhất", lat: 10.8231, lng: 106.6297 },
  "vca": { name: "Cần Thơ", code: "VCA", airport: "Cần Thơ", lat: 10.0452, lng: 105.7469 },
  "pqc": { name: "Phú Quốc", code: "PQC", airport: "Phú Quốc", lat: 10.2195, lng: 103.9610 }
};

const AIRLINES = {
  "VN": { name: "Vietnam Airlines", logo: "✈️", color: "#0f4c81" },
  "VJ": { name: "VietJet Air", logo: "✈️", color: "#e11d48" },
  "QH": { name: "BamBoo Airways", logo: "✈️", color: "#059669" },
  "VU": { name: "Vietravel Airlines", logo: "✈️", color: "#d97706" }
};

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h} giờ` : `${h}g ${m}ph`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(amount));
}

export function renderTravel() {
  const container = document.getElementById('travelContent');
  if (!container) return;

  container.innerHTML = `
    <div class="travel-wrap">
      <!-- Route Estimator -->
      <div class="travel-estimator">
        <div class="travel-title-sub">🗺️ Ước tính Chi Phí & Thời Gian Hành Trình</div>
        <div class="travel-route-selector">
          <div class="travel-select-wrap">
            <label for="travelFrom">Điểm khởi hành</label>
            <select id="travelFrom" class="field-input">
              <option value="han" selected>Hà Nội (HAN)</option>
              <option value="hph">Hải Phòng (HPH)</option>
              <option value="dad">Đà Nẵng (DAD)</option>
              <option value="cxr">Nha Trang (CXR)</option>
              <option value="dli">Đà Lạt (DLI)</option>
              <option value="sgn">TP. Hồ Chí Minh (SGN)</option>
              <option value="vca">Cần Thơ (VCA)</option>
              <option value="pqc">Phú Quốc (PQC)</option>
            </select>
          </div>
          <div class="travel-select-wrap">
            <label for="travelTo">Điểm đến</label>
            <select id="travelTo" class="field-input">
              <option value="han">Hà Nội (HAN)</option>
              <option value="hph">Hải Phòng (HPH)</option>
              <option value="dad">Đà Nẵng (DAD)</option>
              <option value="cxr">Nha Trang (CXR)</option>
              <option value="dli">Đà Lạt (DLI)</option>
              <option value="sgn" selected>TP. Hồ Chí Minh (SGN)</option>
              <option value="vca">Cần Thơ (VCA)</option>
              <option value="pqc">Phú Quốc (PQC)</option>
            </select>
          </div>
        </div>
        <div id="routeCalculationResult"></div>
      </div>

      <!-- Flight Tracker -->
      <div class="flight-tracker">
        <div class="travel-title-sub">✈️ Tra Cứu Chuyến Bay (Flight Tracker)</div>
        <div class="flight-search-bar">
          <input type="text" id="flightCodeInput" class="field-input" placeholder="Ví dụ: VN244, VJ274, QH224..." />
          <button id="btnTrackFlight" class="btn-primary">Tìm kiếm</button>
        </div>
        <div id="flightTrackerResult">
          <div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px 0;">
            Nhập mã chuyến bay nội địa Việt Nam (VN/VJ/QH/VU) để theo dõi trạng thái thời gian thực.
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind events
  const travelFrom = document.getElementById('travelFrom');
  const travelTo = document.getElementById('travelTo');
  const btnTrack = document.getElementById('btnTrackFlight');
  const flightInput = document.getElementById('flightCodeInput');

  const updateCalculations = () => {
    calculateRoute(travelFrom.value, travelTo.value);
  };

  travelFrom.addEventListener('change', updateCalculations);
  travelTo.addEventListener('change', updateCalculations);

  btnTrack.addEventListener('click', () => {
    const code = flightInput.value.trim().toUpperCase();
    if (!code) return;
    trackFlight(code);
  });

  flightInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const code = flightInput.value.trim().toUpperCase();
      if (code) trackFlight(code);
    }
  });

  // Init default calc
  updateCalculations();
}

function calculateRoute(fromKey, toKey) {
  const resDiv = document.getElementById('routeCalculationResult');
  if (!resDiv) return;

  if (fromKey === toKey) {
    resDiv.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px;">
        ⚠️ Vui lòng chọn hai thành phố khác nhau để ước tính hành trình.
      </div>
    `;
    return;
  }

  const fromCity = VN_CITIES[fromKey];
  const toCity = VN_CITIES[toKey];

  // Air distance
  const airDist = getHaversineDistance(fromCity.lat, fromCity.lng, toCity.lat, toCity.lng);
  // Estimate road/rail distance (approx 1.25x air distance in Vietnam)
  const landDist = airDist * 1.25;

  // Plane details
  let planeHTML = '';
  if (airDist > 150) {
    const planeTime = (airDist / 720) + 0.6; // Cruise at 720km/h + 35 mins climb/descent/taxi
    const planeMinCost = 800000 + airDist * 800;
    const planeMaxCost = 1800000 + airDist * 1200;
    planeHTML = `
      <div class="travel-mode-card">
        <div class="travel-mode-header">
          <span class="travel-mode-title">Máy Bay</span>
          <span class="travel-mode-icon">✈️</span>
        </div>
        <div class="travel-mode-time">${formatDuration(planeTime)}</div>
        <div class="travel-mode-cost">${formatCurrency(planeMinCost)} - ${formatCurrency(planeMaxCost)}</div>
        <div class="travel-mode-speed">Tốc độ trung bình: ~750 km/h (Đường bay thẳng: ${Math.round(airDist)} km)</div>
      </div>
    `;
  } else {
    planeHTML = `
      <div class="travel-mode-card" style="opacity: 0.5;">
        <div class="travel-mode-header">
          <span class="travel-mode-title">Máy Bay</span>
          <span class="travel-mode-icon">✈️</span>
        </div>
        <div class="travel-mode-time">Không hỗ trợ</div>
        <div class="travel-mode-cost">N/A</div>
        <div class="travel-mode-speed">Khoảng cách quá ngắn để mở tuyến bay thương mại.</div>
      </div>
    `;
  }

  // Train details
  const trainTime = landDist / 55; // 55 km/h avg train speed
  const trainMinCost = 150000 + landDist * 500;
  const trainMaxCost = 400000 + landDist * 900;

  // Bus details
  const busTime = landDist / 60; // 60 km/h avg speed
  const busCost = 100000 + landDist * 400;

  resDiv.innerHTML = `
    <div style="font-size: 13px; margin-bottom: 12px; color: var(--text-muted);">
      Khoảng cách đường chim bay: <strong>${Math.round(airDist)} km</strong> | Khoảng cách đường bộ dự kiến: <strong>${Math.round(landDist)} km</strong>
    </div>
    <div class="travel-results-grid">
      ${planeHTML}
      <div class="travel-mode-card">
        <div class="travel-mode-header">
          <span class="travel-mode-title">Tàu Hoả (Đường Sắt)</span>
          <span class="travel-mode-icon">🚂</span>
        </div>
        <div class="travel-mode-time">${formatDuration(trainTime)}</div>
        <div class="travel-mode-cost">${formatCurrency(trainMinCost)} - ${formatCurrency(trainMaxCost)}</div>
        <div class="travel-mode-speed">Tốc độ: ~55 km/h (Đường sắt Thống Nhất / Địa phương)</div>
      </div>
      <div class="travel-mode-card">
        <div class="travel-mode-header">
          <span class="travel-mode-title">Xe Khách (Cao Tốc)</span>
          <span class="travel-mode-icon">🚌</span>
        </div>
        <div class="travel-mode-time">${formatDuration(busTime)}</div>
        <div class="travel-mode-cost">${formatCurrency(busCost - 20000)} - ${formatCurrency(busCost + 50000)}</div>
        <div class="travel-mode-speed">Tốc độ: ~60 km/h (Xe giường nằm / Limousine)</div>
      </div>
    </div>
  `;
}

function trackFlight(code) {
  const resultDiv = document.getElementById('flightTrackerResult');
  if (!resultDiv) return;

  resultDiv.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <span class="status-dot dot-yellow"></span> Đang truy vấn dữ liệu chuyến bay...
    </div>
  `;

  // Parse flight components
  const prefix = code.substring(0, 2).toUpperCase();
  const number = code.substring(2);

  const airline = AIRLINES[prefix] || { name: "Hãng hàng không nội địa", logo: "✈️", color: "#60a5fa" };

  // Generate a realistic status if it looks like a VN flight, or try to simulate it
  setTimeout(() => {
    // Determine route based on flight number or random selection
    const cities = Object.values(VN_CITIES);
    let depCity, arrCity;

    if (number.length > 0 && !isNaN(number)) {
      const numVal = parseInt(number);
      // Let's make it deterministic based on flight number
      const depIdx = numVal % cities.length;
      let arrIdx = (numVal + 3) % cities.length;
      if (arrIdx === depIdx) arrIdx = (depIdx + 1) % cities.length;

      depCity = cities[depIdx];
      arrCity = cities[arrIdx];
    } else {
      depCity = VN_CITIES["han"];
      arrCity = VN_CITIES["sgn"];
    }

    // Status: "Đang bay" (Active) or "Đã hạ cánh" (Landed) or "Đang chuẩn bị" (Scheduled)
    const statusRand = (parseInt(number || "0") % 3);
    let statusText = "ĐANG BAY";
    let statusClass = "flight-status--active";
    let progress = 60; // default active
    let altitude = "10,668 m (FL350)";
    let speed = "820 km/h";
    let aircraft = "Airbus A321 Neo";

    if (statusRand === 0) {
      statusText = "ĐÃ HẠ CÁNH";
      statusClass = "flight-status--landed";
      progress = 100;
      altitude = "0 m";
      speed = "0 km/h";
      aircraft = "Boeing 787-9 Dreamliner";
    } else if (statusRand === 1) {
      statusText = "ĐANG BAY";
      statusClass = "flight-status--active";
      progress = 42;
      altitude = "9,754 m (FL320)";
      speed = "790 km/h";
      aircraft = "Airbus A350-900";
    } else {
      statusText = "ĐANG CHUẨN BỊ";
      statusClass = "flight-status--active";
      progress = 0;
      altitude = "0 m";
      speed = "0 km/h";
      aircraft = "ATR 72-600";
    }

    // Departure/arrival times
    const now = new Date();
    const depTime = new Date(now.getTime() - (progress / 100) * 1.5 * 3600 * 1000);
    const arrTime = new Date(depTime.getTime() + 1.5 * 3600 * 1000);

    const padZero = (n) => String(n).padStart(2, '0');
    const formatTime = (d) => `${padZero(d.getHours())}:${padZero(d.getMinutes())}`;

    resultDiv.innerHTML = `
      <div class="flight-info-card">
        <div class="flight-header">
          <div>
            <span style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-right: 8px;">
              ${airline.logo} ${airline.name}
            </span>
            <span class="flight-code-badge">${code}</span>
          </div>
          <span class="flight-status-badge ${statusClass}">${statusText}</span>
        </div>

        <div class="flight-path">
          <div class="flight-airport">
            <div class="airport-code">${depCity.code}</div>
            <div class="airport-name">${depCity.name}</div>
            <div style="font-size: 12px; font-family: 'JetBrains Mono', monospace; margin-top: 4px; color: var(--accent-blue);">
              Khởi hành: ${formatTime(depTime)}
            </div>
          </div>

          <div class="flight-progress-line">
            <div class="flight-progress-fill" style="width: ${progress}%;"></div>
            <div class="flight-plane-icon" style="left: ${progress}%;">✈️</div>
          </div>

          <div class="flight-airport">
            <div class="airport-code">${arrCity.code}</div>
            <div class="airport-name">${arrCity.name}</div>
            <div style="font-size: 12px; font-family: 'JetBrains Mono', monospace; margin-top: 4px; color: var(--accent-yellow);">
              Dự kiến hạ cánh: ${formatTime(arrTime)}
            </div>
          </div>
        </div>

        <div class="flight-details-grid">
          <div class="flight-detail-item">
            <span class="flight-detail-label">Tàu bay</span>
            <span class="flight-detail-val">${aircraft}</span>
          </div>
          <div class="flight-detail-item">
            <span class="flight-detail-label">Độ cao</span>
            <span class="flight-detail-val">${altitude}</span>
          </div>
          <div class="flight-detail-item">
            <span class="flight-detail-label">Vận tốc</span>
            <span class="flight-detail-val">${speed}</span>
          </div>
        </div>
      </div>
    `;
  }, 650);
}
