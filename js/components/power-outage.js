/**
 * components/power-outage.js
 * Power outage card with province-aware smart search
 * that auto-redirects to the correct EVN regional portal.
 */

// ─── Province → EVN unit mapping ───────────────────────────────────────────

/** All 63 provinces mapped to their EVN unit */
const PROVINCE_MAP = {
  // ── EVNHCMC ──
  'TP. Hồ Chí Minh':       { unit: 'EVNHCMC',  url: 'https://cskh.evnhcmc.vn/tracuu/tabid/96/Default.aspx' },
  'Hồ Chí Minh':            { unit: 'EVNHCMC',  url: 'https://cskh.evnhcmc.vn/tracuu/tabid/96/Default.aspx' },

  // ── EVNSPC (19 tỉnh miền Nam) ──
  'Đồng Nai':     { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Bình Dương':   { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Long An':      { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Tiền Giang':   { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Bến Tre':      { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Vĩnh Long':    { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Trà Vinh':     { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Hậu Giang':    { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Sóc Trăng':    { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Bạc Liêu':     { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Cà Mau':       { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Kiên Giang':   { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'An Giang':     { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Đồng Tháp':   { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Cần Thơ':      { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Tây Ninh':     { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Bình Phước':   { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Bà Rịa - Vũng Tàu': { unit: 'EVNSPC', url: 'https://cskh.evnspc.vn/TraCuu/TraCuuLichNgungCungCapDien' },

  // ── EVNHANOI ──
  'Hà Nội': { unit: 'EVNHANOI', url: 'https://cskh.evnhanoi.com.vn/TraCuu/LichNgungCungCapDien' },

  // ── EVNNPC (19 tỉnh miền Bắc) ──
  'Hà Giang':     { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Tuyên Quang':  { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Lào Cai':      { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Yên Bái':      { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Thái Nguyên':  { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Phú Thọ':      { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Bắc Kạn':      { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Cao Bằng':     { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Lạng Sơn':     { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Bắc Giang':    { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Bắc Ninh':     { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Quảng Ninh':   { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Hải Phòng':    { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Hải Dương':    { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Hưng Yên':     { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Thái Bình':    { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Nam Định':     { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Hà Nam':       { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Ninh Bình':    { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Vĩnh Phúc':    { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Hòa Bình':     { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Sơn La':       { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Điện Biên':    { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Lai Châu':     { unit: 'EVNNPC', url: 'https://cskh.npc.com.vn/TraCuu/TraCuuLichNgungCungCapDien' },

  // ── EVNCPC (miền Trung + Tây Nguyên) ──
  'Thanh Hóa':     { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Nghệ An':       { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Hà Tĩnh':       { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Quảng Bình':    { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Quảng Trị':     { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Thừa Thiên Huế': { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Đà Nẵng':       { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Quảng Nam':     { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Quảng Ngãi':    { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Bình Định':     { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Phú Yên':       { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Khánh Hòa':     { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Ninh Thuận':    { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Bình Thuận':    { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Kon Tum':       { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Gia Lai':       { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Đắk Lắk':      { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Đắk Nông':     { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
  'Lâm Đồng':     { unit: 'EVNCPC', url: 'https://cskh.cpc.vn/TraCuu/TraCuuLichNgungCungCapDien' },
};

const EVN_UNITS = {
  EVNHCMC:  { icon: '🏙️', label: 'EVNHCMC',  full: 'Điện lực TP. Hồ Chí Minh', color: '#34d399' },
  EVNSPC:   { icon: '🌴', label: 'EVNSPC',   full: 'Điện lực miền Nam',          color: '#fb923c' },
  EVNHANOI: { icon: '🏛️', label: 'EVNHANOI', full: 'Điện lực Hà Nội',           color: '#60a5fa' },
  EVNNPC:   { icon: '🏭', label: 'EVNNPC',   full: 'Điện lực miền Bắc',          color: '#a78bfa' },
  EVNCPC:   { icon: '⛰️', label: 'EVNCPC',   full: 'Điện lực miền Trung',        color: '#fbbf24' },
};

const ALL_PROVINCES = Object.keys(PROVINCE_MAP).filter((v, i, a) => a.indexOf(v) === i).sort();

/**
 * Render the full power outage card with search form.
 */
export function renderPowerOutage(containerId = 'powerContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <!-- ── Smart search ── -->
    <div class="power-search-box">
      <div class="power-search-title">🔍 Tra cứu theo khu vực của bạn</div>
      <div class="power-search-form">
        <div class="power-search-field">
          <label class="power-field-label">Tỉnh / Thành phố</label>
          <select class="power-province-select" id="powerProvinceSelect">
            <option value="">-- Chọn tỉnh/thành phố --</option>
            ${ALL_PROVINCES.map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
        </div>
        <div class="power-search-field">
          <label class="power-field-label">Địa chỉ / Khu vực (tuỳ chọn)</label>
          <input class="field-input" id="powerAddressInput"
                 type="text" placeholder="VD: Quận 1, Phường Bến Nghé..." />
        </div>
        <button class="btn-primary power-search-btn" id="powerSearchBtn" onclick="searchPowerOutage()">
          ⚡ Tra cứu lịch cúp điện
        </button>
      </div>
    </div>

    <!-- ── Search result ── -->
    <div id="powerSearchResult"></div>

    <!-- ── Quick links by region ── -->
    <div class="power-divider">Hoặc chọn trực tiếp theo đơn vị điện lực</div>

    <div class="power-unit-all">
      ${Object.entries(EVN_UNITS).map(([key, u]) => {
        // Find a sample URL for this unit
        const sample = Object.values(PROVINCE_MAP).find(v => v.unit === key);
        return `
          <a class="power-unit-card" href="${sample?.url || '#'}" target="_blank" rel="noopener"
             style="border-color:${u.color}22;">
            <div class="power-unit-card-icon">${u.icon}</div>
            <div class="power-unit-card-name" style="color:${u.color};">${u.label}</div>
            <div class="power-unit-card-full">${u.full}</div>
          </a>
        `;
      }).join('')}
    </div>

    <!-- ── Hotline & tips ── -->
    <div class="power-bottom-row">
      <div class="power-hotline">
        <span style="font-size:22px;">📞</span>
        <div>
          <div class="power-hotline-num">19001006</div>
          <div class="power-hotline-label">Hotline EVN 24/7 · Miễn phí</div>
        </div>
      </div>
      <div class="power-tip-box" style="flex:1;">
        <div class="power-tip-title">💡 Gợi ý</div>
        <ul class="power-tip-list">
          <li>📱 Tải app <strong>CSKH EVN</strong> để nhận thông báo tự động</li>
          <li>📧 Đăng ký SMS/email tại cổng CSKH của đơn vị điện lực khu vực</li>
          <li>🌐 Tra cứu theo mã khách hàng điện (in trên hóa đơn tiền điện)</li>
        </ul>
      </div>
    </div>
  `;

  document.getElementById('powerProvinceSelect')
    ?.addEventListener('change', () => searchPowerOutage(false));
}

/**
 * Search power outage by selected province (+ optional address).
 * @param {boolean} open – whether to open URL in new tab (true on btn click)
 */
export function searchPowerOutage(open = true) {
  const province = document.getElementById('powerProvinceSelect')?.value;
  const address  = document.getElementById('powerAddressInput')?.value?.trim();
  const result   = document.getElementById('powerSearchResult');
  if (!result) return;

  if (!province) {
    result.innerHTML = '';
    return;
  }

  const match = PROVINCE_MAP[province];
  if (!match) {
    result.innerHTML = `<div class="error-msg" style="margin:10px 0;">⚠️ Chưa có thông tin cho tỉnh/thành này.</div>`;
    return;
  }

  const unit = EVN_UNITS[match.unit];
  const fullUrl = match.url;

  result.innerHTML = `
    <div class="power-found-card animate-fade-in-up">
      <div class="power-found-header">
        <span class="power-found-icon">${unit.icon}</span>
        <div>
          <div class="power-found-unit" style="color:${unit.color};">${unit.label}</div>
          <div class="power-found-area">${unit.full} · phụ trách ${province}</div>
          ${address ? `<div class="power-found-addr">📍 ${address}</div>` : ''}
        </div>
      </div>
      <a class="power-found-btn" href="${fullUrl}" target="_blank" rel="noopener"
         style="border-color:${unit.color};color:${unit.color};">
        Xem lịch cúp điện ${province} →
      </a>
    </div>
  `;

  if (open) window.open(fullUrl, '_blank', 'noopener');
}

/** Legacy export for onclick compatibility */
export function selectPowerRegion() {} // no-op – replaced by smart search
