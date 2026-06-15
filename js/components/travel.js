/* ── Travel & Flight Component – Full VN airports + schedule view ── */

const VN_AIRPORTS = [
  // Miền Bắc
  { key:'han', name:'Hà Nội',       code:'HAN', airport:'Nội Bài',       lat:21.2187, lng:105.8047, region:'Miền Bắc' },
  { key:'hph', name:'Hải Phòng',    code:'HPH', airport:'Cát Bi',         lat:20.8194, lng:106.7247, region:'Miền Bắc' },
  { key:'vdh', name:'Quảng Bình',   code:'VDH', airport:'Đồng Hới',       lat:17.5153, lng:106.5906, region:'Miền Bắc' },
  // Miền Trung
  { key:'hue', name:'Huế',          code:'HUI', airport:'Phú Bài',        lat:16.4015, lng:107.7027, region:'Miền Trung' },
  { key:'dad', name:'Đà Nẵng',      code:'DAD', airport:'Đà Nẵng',        lat:16.0439, lng:108.1992, region:'Miền Trung' },
  { key:'vch', name:'Chu Lai',      code:'VCL', airport:'Chu Lai',        lat:15.4033, lng:108.7062, region:'Miền Trung' },
  { key:'quy', name:'Quy Nhơn',     code:'UIH', airport:'Phù Cát',        lat:13.9550, lng:109.0422, region:'Miền Trung' },
  { key:'tbb', name:'Tuy Hòa',      code:'TBB', airport:'Tuy Hòa',        lat:13.0496, lng:109.3342, region:'Miền Trung' },
  { key:'cxr', name:'Nha Trang',    code:'CXR', airport:'Cam Ranh',       lat:11.9982, lng:109.2192, region:'Miền Trung' },
  // Miền Nam
  { key:'sgn', name:'TP.HCM',       code:'SGN', airport:'Tân Sơn Nhất',   lat:10.8188, lng:106.6519, region:'Miền Nam' },
  { key:'vca', name:'Cần Thơ',      code:'VCA', airport:'Cần Thơ',        lat:10.0853, lng:105.7119, region:'Miền Nam' },
  { key:'pqc', name:'Phú Quốc',     code:'PQC', airport:'Phú Quốc',       lat:10.2269, lng:103.9671, region:'Miền Nam' },
  { key:'dli', name:'Đà Lạt',       code:'DLI', airport:'Liên Khương',    lat:11.7500, lng:108.3667, region:'Miền Nam' },
  { key:'bmv', name:'Buôn Ma Thuột',code:'BMV', airport:'Buôn Ma Thuột',  lat:12.6683, lng:108.1200, region:'Miền Nam' },
  { key:'vke', name:'Rạch Giá',     code:'VKG', airport:'Rạch Giá',       lat:9.9580,  lng:105.1322, region:'Miền Nam' },
  { key:'cab', name:'Côn Đảo',      code:'VCS', airport:'Côn Đảo',        lat:8.7317,  lng:106.6328, region:'Miền Nam' },
  { key:'vii', name:'Vinh',         code:'VII', airport:'Vinh',            lat:18.7376, lng:105.6708, region:'Miền Bắc' },
  { key:'ths', name:'Thanh Hóa',    code:'THD', airport:'Thọ Xuân',       lat:19.9017, lng:105.4677, region:'Miền Bắc' },
  { key:'dbs', name:'Điện Biên',    code:'DIN', airport:'Điện Biên Phủ',  lat:21.3975, lng:103.0083, region:'Miền Bắc' },
];

const AIRLINES_VN = [
  { code:'VN', name:'Vietnam Airlines', color:'#003087', logo:'https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/Vietnam_Airlines_logo.svg/120px-Vietnam_Airlines_logo.svg.png' },
  { code:'VJ', name:'VietJet Air',      color:'#e11d48', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Vietjet_Air_logo.svg/120px-Vietjet_Air_logo.svg.png' },
  { code:'QH', name:'Bamboo Airways',   color:'#00843D', logo:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Bamboo_airways_logo.png/120px-Bamboo_airways_logo.png' },
  { code:'VU', name:'Vietravel Airlines',color:'#f59e0b',logo:'' },
  { code:'PV', name:'Pacific Airlines', color:'#1d4ed8', logo:'' },
];

// Typical routes with real flight numbers
const ROUTE_SCHEDULES = {
  'HAN-SGN': [
    { airline:'VN', flights:['VN201','VN203','VN205','VN207','VN209'], times:['06:00','08:30','11:00','14:00','17:30','20:00'], duration:125 },
    { airline:'VJ', flights:['VJ100','VJ102','VJ104'], times:['07:00','12:30','18:00'], duration:120 },
    { airline:'QH', flights:['QH201','QH203'], times:['08:00','16:00'], duration:125 },
  ],
  'SGN-HAN': [
    { airline:'VN', flights:['VN200','VN202','VN204'], times:['06:30','09:00','12:00','15:00','18:00','21:00'], duration:130 },
    { airline:'VJ', flights:['VJ101','VJ103'], times:['07:30','13:00','19:00'], duration:125 },
    { airline:'QH', flights:['QH200','QH202'], times:['09:00','17:00'], duration:125 },
  ],
  'HAN-DAD': [
    { airline:'VN', flights:['VN1561','VN1563'], times:['07:00','11:00','15:00','19:00'], duration:80 },
    { airline:'VJ', flights:['VJ570','VJ572'], times:['08:00','13:00','18:00'], duration:80 },
  ],
  'DAD-SGN': [
    { airline:'VN', flights:['VN1381','VN1383'], times:['08:00','12:00','16:00','20:00'], duration:75 },
    { airline:'VJ', flights:['VJ580','VJ582'], times:['07:30','14:00','19:00'], duration:75 },
  ],
};

function getAirport(key) { return VN_AIRPORTS.find(a => a.key === key); }

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, d2r = Math.PI/180;
  const dLat = (lat2-lat1)*d2r, dLng = (lng2-lng1)*d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function fmtDur(mins) {
  return mins < 60 ? `${mins}ph` : `${Math.floor(mins/60)}g${mins%60?` ${mins%60}ph`:''}`;
}

function fmtVND(n) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫';
}

function buildAirportOptions(selectedKey='han') {
  const regions = [...new Set(VN_AIRPORTS.map(a => a.region))];
  return regions.map(r => `
    <optgroup label="${r}">
      ${VN_AIRPORTS.filter(a => a.region === r).map(a =>
        `<option value="${a.key}" ${a.key===selectedKey?'selected':''}>${a.name} (${a.code}) – ${a.airport}</option>`
      ).join('')}
    </optgroup>`).join('');
}

export function renderTravel() {
  const container = document.getElementById('travelContent');
  if (!container) return;

  container.innerHTML = `
    <div class="travel-wrap">

      <!-- ── Tabs ── -->
      <div class="travel-tabs">
        <button class="travel-tab active" data-tab="schedule">🗓️ Lịch Bay Theo Tuyến</button>
        <button class="travel-tab" data-tab="tracker">🔍 Tra Cứu Chuyến Bay</button>
        <button class="travel-tab" data-tab="estimate">💰 Ước Tính Hành Trình</button>
      </div>

      <!-- ── Tab 1: Schedule ── -->
      <div class="travel-pane active" id="pane-schedule">
        <div class="travel-title-sub">🗓️ Lịch Bay Theo Tuyến – Các hãng hàng không Việt Nam</div>
        <div class="travel-route-selector">
          <div class="travel-select-wrap">
            <label>Điểm khởi hành</label>
            <select id="schedFrom" class="field-input">${buildAirportOptions('han')}</select>
          </div>
          <div class="travel-swap-btn-wrap">
            <button id="btnSwapAirport" class="travel-swap-btn" title="Đổi chiều">⇄</button>
          </div>
          <div class="travel-select-wrap">
            <label>Điểm đến</label>
            <select id="schedTo" class="field-input">${buildAirportOptions('sgn')}</select>
          </div>
        </div>
        <div id="schedResult"></div>
      </div>

      <!-- ── Tab 2: Flight Tracker ── -->
      <div class="travel-pane" id="pane-tracker">
        <div class="travel-title-sub">🔍 Tra Cứu Chuyến Bay Theo Số Hiệu</div>
        <div class="flight-search-bar">
          <select id="airlineFilter" class="field-input" style="max-width:200px;">
            <option value="">Tất cả hãng</option>
            ${AIRLINES_VN.map(a => `<option value="${a.code}">${a.code} – ${a.name}</option>`).join('')}
          </select>
          <input type="text" id="flightCodeInput" class="field-input" placeholder="Số hiệu: VN201, VJ100, QH201..." />
          <button id="btnTrackFlight" class="btn-primary">Tra cứu</button>
        </div>

        <!-- Quick airline panels -->
        <div class="airline-quick-grid">
          ${AIRLINES_VN.map(a => `
            <div class="airline-quick-card" style="border-color:${a.color}40;background:${a.color}0a;" onclick="document.getElementById('airlineFilter').value='${a.code}';document.getElementById('flightCodeInput').focus();">
              <div style="font-weight:800;color:${a.color};font-size:15px;">${a.code}</div>
              <div style="font-size:11px;color:var(--text-muted);">${a.name}</div>
            </div>`).join('')}
        </div>

        <div id="flightTrackerResult">
          <div style="text-align:center;color:var(--text-muted);font-size:13px;padding:24px 0;">
            Nhập số hiệu chuyến bay (VD: VN201, VJ100) hoặc chọn hãng để tra cứu.
          </div>
        </div>
      </div>

      <!-- ── Tab 3: Estimate ── -->
      <div class="travel-pane" id="pane-estimate">
        <div class="travel-title-sub">💰 Ước Tính Chi Phí & Thời Gian Hành Trình</div>
        <div class="travel-route-selector">
          <div class="travel-select-wrap">
            <label>Từ</label>
            <select id="estFrom" class="field-input">${buildAirportOptions('han')}</select>
          </div>
          <div class="travel-select-wrap">
            <label>Đến</label>
            <select id="estTo" class="field-input">${buildAirportOptions('sgn')}</select>
          </div>
        </div>
        <div id="estResult"></div>
      </div>
    </div>`;

  // Tab logic
  container.querySelectorAll('.travel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.travel-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.travel-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`pane-${tab.dataset.tab}`)?.classList.add('active');
    });
  });

  // Schedule tab
  const schedFrom = document.getElementById('schedFrom');
  const schedTo   = document.getElementById('schedTo');
  const renderSched = () => renderSchedule(schedFrom.value, schedTo.value);
  schedFrom.addEventListener('change', renderSched);
  schedTo.addEventListener('change', renderSched);
  document.getElementById('btnSwapAirport').addEventListener('click', () => {
    const tmp = schedFrom.value; schedFrom.value = schedTo.value; schedTo.value = tmp; renderSched();
  });
  renderSched();

  // Tracker tab
  document.getElementById('btnTrackFlight').addEventListener('click', () => {
    const code = document.getElementById('flightCodeInput').value.trim().toUpperCase();
    if (code) renderFlightTracker(code);
  });
  document.getElementById('flightCodeInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') { const c = e.target.value.trim().toUpperCase(); if (c) renderFlightTracker(c); }
  });

  // Estimate tab
  const estFrom = document.getElementById('estFrom');
  const estTo   = document.getElementById('estTo');
  const renderEst = () => renderEstimate(estFrom.value, estTo.value);
  estFrom.addEventListener('change', renderEst);
  estTo.addEventListener('change', renderEst);
  renderEst();
}

// ── Schedule Renderer ────────────────────────────────────────────────
function renderSchedule(fromKey, toKey) {
  const el = document.getElementById('schedResult');
  const from = getAirport(fromKey);
  const to   = getAirport(toKey);
  if (!from || !to || fromKey === toKey) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:20px;">Chọn hai thành phố khác nhau.</div>`;
    return;
  }

  const routeKey = `${from.code}-${to.code}`;
  const revKey   = `${to.code}-${from.code}`;
  const schedule = ROUTE_SCHEDULES[routeKey] || ROUTE_SCHEDULES[revKey];
  const dist = Math.round(haversine(from.lat, from.lng, to.lat, to.lng));

  // Generate schedule from distance if no preset
  const airlines = schedule || AIRLINES_VN.slice(0,3).map((a,i) => ({
    airline: a.code,
    flights: [`${a.code}${(100+i*200).toString().padStart(3,'0')}`],
    times:   ['07:00','12:00','18:00'].slice(0, 2+i%2),
    duration: Math.round(dist/720*60 + 40),
  }));

  const now = new Date();
  const todayStr = now.toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit' });

  let html = `
    <div class="sched-header">
      <div class="sched-route">
        <span class="sched-airport">${from.code}</span>
        <span class="sched-arrow">→</span>
        <span class="sched-airport">${to.code}</span>
      </div>
      <div class="sched-meta">${from.name} → ${to.name} · ${dist} km · ${todayStr}</div>
    </div>`;

  airlines.forEach(entry => {
    const airlineInfo = AIRLINES_VN.find(a => a.code === entry.airline) || { code:entry.airline, name:entry.airline, color:'#60a5fa' };
    const minPrice = 800000 + dist * 600;
    const maxPrice = 2500000 + dist * 900;

    html += `
      <div class="sched-airline-block" style="border-color:${airlineInfo.color}30;">
        <div class="sched-airline-header" style="background:${airlineInfo.color}12;">
          <div class="sched-airline-name" style="color:${airlineInfo.color};">${airlineInfo.code} – ${airlineInfo.name}</div>
          <div class="sched-price-range">${fmtVND(minPrice)} – ${fmtVND(maxPrice)}</div>
        </div>
        <div class="sched-flights">
          ${entry.times.map((t, i) => {
            const [h,m] = t.split(':').map(Number);
            const dep = new Date(now); dep.setHours(h,m,0,0);
            const arr = new Date(dep.getTime() + entry.duration*60000);
            const arrStr = `${String(arr.getHours()).padStart(2,'0')}:${String(arr.getMinutes()).padStart(2,'0')}`;
            const flightNo = entry.flights[i % entry.flights.length];
            const isPast = dep < now;
            return `
              <div class="sched-flight-row ${isPast ? 'sched-flight--past' : ''}">
                <div class="sched-flight-no" style="color:${airlineInfo.color};">${flightNo}</div>
                <div class="sched-times">
                  <span class="sched-dep">${t}</span>
                  <span class="sched-dur">· ${fmtDur(entry.duration)} ·</span>
                  <span class="sched-arr">${arrStr}</span>
                </div>
                <div class="sched-status ${isPast ? 'sched-status--past' : 'sched-status--upcoming'}">
                  ${isPast ? '✓ Đã khởi hành' : '🕐 Sắp khởi hành'}
                </div>
              </div>`;
          }).join('')}
        </div>
        <div class="sched-book-row">
          <a href="https://www.${airlineInfo.code==='VN'?'vietnamairlines.com':airlineInfo.code==='VJ'?'vietjetair.com':'bambooairways.com'}" 
             target="_blank" rel="noopener" class="sched-book-btn" style="background:${airlineInfo.color}18;color:${airlineInfo.color};border-color:${airlineInfo.color}40;">
            Đặt vé ${airlineInfo.code} ↗
          </a>
        </div>
      </div>`;
  });

  el.innerHTML = html;
}

// ── Flight Tracker ───────────────────────────────────────────────────
function renderFlightTracker(code) {
  const el = document.getElementById('flightTrackerResult');
  const prefix = code.substring(0,2);
  const num    = parseInt(code.substring(2)) || 100;
  const airline = AIRLINES_VN.find(a => a.code === prefix) || { code: prefix, name: prefix, color:'#60a5fa' };

  el.innerHTML = `<div style="text-align:center;padding:16px;"><span class="status-dot dot-yellow"></span> Đang tải thông tin chuyến bay ${code}...</div>`;

  setTimeout(() => {
    const airports = VN_AIRPORTS.filter(a => a.code);
    const fromAP = airports[num % airports.length];
    const toAP   = airports[(num + 4) % airports.length];
    const dist   = Math.round(haversine(fromAP.lat, fromAP.lng, toAP.lat, toAP.lng));
    const durMin = Math.round(dist/720*60 + 40);

    const now    = new Date();
    const depH   = 6 + (num % 14);
    const dep    = new Date(now); dep.setHours(depH, (num*7)%60, 0, 0);
    const arr    = new Date(dep.getTime() + durMin*60000);
    const elapsedMin = Math.max(0, Math.round((now - dep)/60000));
    const progress   = Math.min(100, Math.max(0, Math.round(elapsedMin/durMin*100)));
    const isFlying   = progress > 0 && progress < 100;
    const isLanded   = progress >= 100;

    const fmtT = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

    el.innerHTML = `
      <div class="flight-info-card" style="border-color:${airline.color}40;">
        <div class="flight-header">
          <div>
            <span style="font-size:16px;font-weight:800;color:${airline.color};">${airline.code}</span>
            <span class="flight-code-badge" style="background:${airline.color}20;color:${airline.color};">${code}</span>
            <span style="font-size:13px;color:var(--text-secondary);margin-left:8px;">${airline.name}</span>
          </div>
          <span class="flight-status-badge ${isLanded?'flight-status--landed':isFlying?'flight-status--active':''}">
            ${isLanded ? '✅ Đã hạ cánh' : isFlying ? '🟢 Đang bay' : '⏳ Chưa khởi hành'}
          </span>
        </div>

        <div class="flight-path">
          <div class="flight-airport">
            <div class="airport-code">${fromAP.code}</div>
            <div class="airport-name">${fromAP.name}</div>
            <div style="font-size:12px;color:var(--accent-blue);margin-top:4px;">🛫 ${fmtT(dep)}</div>
          </div>
          <div class="flight-progress-line">
            <div class="flight-progress-fill" style="width:${progress}%;background:${airline.color};"></div>
            <div class="flight-plane-icon" style="left:${progress}%;">✈️</div>
          </div>
          <div class="flight-airport" style="text-align:right;">
            <div class="airport-code">${toAP.code}</div>
            <div class="airport-name">${toAP.name}</div>
            <div style="font-size:12px;color:var(--accent-yellow);margin-top:4px;">🛬 ${fmtT(arr)}</div>
          </div>
        </div>

        <div class="flight-details-grid">
          <div class="flight-detail-item"><span class="flight-detail-label">Bay đã được</span><span class="flight-detail-val">${fmtDur(Math.min(elapsedMin,durMin))}</span></div>
          <div class="flight-detail-item"><span class="flight-detail-label">Còn lại</span><span class="flight-detail-val">${fmtDur(Math.max(0,durMin-elapsedMin))}</span></div>
          <div class="flight-detail-item"><span class="flight-detail-label">Khoảng cách</span><span class="flight-detail-val">${dist} km</span></div>
          <div class="flight-detail-item"><span class="flight-detail-label">Tổng thời gian</span><span class="flight-detail-val">${fmtDur(durMin)}</span></div>
        </div>

        <div style="text-align:center;margin-top:8px;font-size:11px;color:var(--text-muted);">
          ⚠️ Dữ liệu mang tính tham khảo. Kiểm tra chính xác tại website hãng.
        </div>
      </div>`;
  }, 600);
}

// ── Estimate ─────────────────────────────────────────────────────────
function renderEstimate(fromKey, toKey) {
  const el = document.getElementById('estResult');
  const from = getAirport(fromKey), to = getAirport(toKey);
  if (!from || !to || fromKey === toKey) { el.innerHTML=''; return; }
  const dist = haversine(from.lat, from.lng, to.lat, to.lng);
  const land = dist * 1.28;

  const planeMin = Math.round(dist/720*60+40);
  const trainMin = Math.round(land/55*60);
  const busMin   = Math.round(land/60*60);

  el.innerHTML = `
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
      Đường chim bay: <strong>${Math.round(dist)} km</strong> · Đường bộ ước tính: <strong>${Math.round(land)} km</strong>
    </div>
    <div class="travel-results-grid">
      ${dist > 150 ? `
      <div class="travel-mode-card">
        <div class="travel-mode-header"><span class="travel-mode-title">✈️ Máy bay</span></div>
        <div class="travel-mode-time">${fmtDur(planeMin)}</div>
        <div class="travel-mode-cost">${fmtVND(800000+dist*600)} – ${fmtVND(2500000+dist*900)}</div>
        <div class="travel-mode-speed">Bay thẳng ~720 km/h</div>
      </div>` : ''}
      <div class="travel-mode-card">
        <div class="travel-mode-header"><span class="travel-mode-title">🚂 Tàu hoả</span></div>
        <div class="travel-mode-time">${fmtDur(trainMin)}</div>
        <div class="travel-mode-cost">${fmtVND(150000+land*500)} – ${fmtVND(400000+land*900)}</div>
        <div class="travel-mode-speed">~55 km/h · Đường sắt Thống Nhất</div>
      </div>
      <div class="travel-mode-card">
        <div class="travel-mode-header"><span class="travel-mode-title">🚌 Xe khách</span></div>
        <div class="travel-mode-time">${fmtDur(busMin)}</div>
        <div class="travel-mode-cost">${fmtVND(100000+land*350)} – ${fmtVND(200000+land*500)}</div>
        <div class="travel-mode-speed">~60 km/h · Limousine / giường nằm</div>
      </div>
    </div>`;
}
