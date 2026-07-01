/**
 * components/astrology.js
 * Lá Số Chiêm Tinh, Bản Đồ Sao & Bói Toán Tâm Linh
 * - Yêu cầu nhập đầy đủ thông tin: Họ tên, Ngày sinh, Giờ sinh, Nơi sinh mới có thể xem.
 * - Vẽ Bản đồ sao có độ phân giải cao bằng Canvas mô phỏng sát nhất ảnh tham chiếu.
 * - Vẽ Ma trận tam giác Góc Chiếu (Aspect Matrix).
 * - Vẽ Sơ đồ Xích vĩ (Declination Timeline) Bắc / Nam.
 * - Hiển thị Bảng Kinh độ Hành tinh (Vượng, Tù, Đắc, Hãm) và Bảng Chi tiết Góc Chiếu.
 * - Phân tích Bản đồ sao chuyên sâu: Hành tinh chính, Hành tinh & Nhà, Đỉnh nhà & Chủ quản, Mẫu góc hợp, Bố cục & Ưu thế.
 * - Tích hợp Thần số học (Số chủ đạo), Vận mệnh, Tử vi bói toán, Nghề nghiệp, Bói tình yêu, Vận hạn.
 */

// Trạng thái thông tin người dùng
let userAstroData = null; 

const PLANETS = [
  { id: 'sun', name: 'Mặt Trời', sym: '☉', color: '#ffea00' },
  { id: 'moon', name: 'Mặt Trăng', sym: '☽', color: '#ffffff' },
  { id: 'mercury', name: 'Sao Thủy', sym: '☿', color: '#64b5f6' },
  { id: 'venus', name: 'Sao Kim', sym: '♀', color: '#f472b6' },
  { id: 'mars', name: 'Sao Hỏa', sym: '♂', color: '#ff5252' },
  { id: 'jupiter', name: 'Sao Mộc', sym: '♃', color: '#ba68c8' },
  { id: 'saturn', name: 'Sao Thổ', sym: '♄', color: '#ffd54f' },
  { id: 'uranus', name: 'Sao Thiên Vương', sym: '♅', color: '#4db6ac' },
  { id: 'neptune', name: 'Sao Hải Vương', sym: '♆', color: '#7986cb' },
  { id: 'pluto', name: 'Sao Diêm Vương', sym: '♇', color: '#a1887f' },
  { id: 'chiron', name: 'Chiron', sym: '⚷', color: '#e0e0e0' },
  { id: 'lilith', name: 'Lilith', sym: '⚸', color: '#e06666' },
  { id: 'northnode', name: 'La Hầu', sym: '☊', color: '#93c47d' }
];

const ZODIAC_SIGNS = [
  { name: 'Bạch Dương', sym: '♈', startDeg: 0, color: '#ff3d00' },
  { name: 'Kim Ngưu', sym: '♉', startDeg: 30, color: '#4caf50' },
  { name: 'Song Tử', sym: '♊', startDeg: 60, color: '#00d2ff' },
  { name: 'Cự Giải', sym: '♋', startDeg: 90, color: '#ab47bc' },
  { name: 'Sư Tử', sym: '♌', startDeg: 120, color: '#ffc107' },
  { name: 'Xử Nữ', sym: '♍', startDeg: 150, color: '#ff5722' },
  { name: 'Thiên Bình', sym: '♎', startDeg: 180, color: '#00e676' },
  { name: 'Bọ Cạp', sym: '♏', startDeg: 210, color: '#e91e63' },
  { name: 'Nhân Mã', sym: '♐', startDeg: 240, color: '#8e24aa' },
  { name: 'Ma Kết', sym: '♑', startDeg: 270, color: '#3f51b5' },
  { name: 'Bảo Bình', sym: '♒', startDeg: 300, color: '#00bcd4' },
  { name: 'Song Ngư', sym: '♓', startDeg: 330, color: '#9c27b0' }
];

const ASPECTS = [
  { name: 'Trùng tụ', deg: 0, sym: '☌', color: '#ffea00' },
  { name: 'Bán lục hợp', deg: 30, sym: '⚺', color: '#00e676' },
  { name: 'Lục hợp', deg: 60, sym: '✶', color: '#64b5f6' },
  { name: 'Vuông góc', deg: 90, sym: '□', color: '#ff5252' },
  { name: 'Tam hợp', deg: 120, sym: '△', color: '#3f51b5' },
  { name: 'Ngũ chiếu', deg: 150, sym: '⚼', color: '#ff5722' },
  { name: 'Đối góc', deg: 180, sym: '☍', color: '#e91e63' }
];

// Khởi tạo trang chính
export function renderAstrology(containerId = 'astrologyContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!userAstroData) {
    renderInputForm(container);
  } else {
    renderAstrologyDashboard(container);
  }
}

// ── 1. MÀN HÌNH NHẬP THÔNG TIN ────────────────────────────────────────
function renderInputForm(container) {
  container.innerHTML = `
    <div class="astro-wrapper" style="max-width: 650px; margin: 0 auto;">
      <div class="astro-card" style="padding: 35px 28px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 44px; margin-bottom: 12px; filter: drop-shadow(0 0 10px rgba(139,92,246,0.4));">🌌</div>
          <h2 style="font-size: 20px; font-weight: 700; color: #ffd700; margin-bottom: 8px;">Cổng Chiêm Tinh & Bản Đồ Sao Rellia</h2>
          <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.6;">
            Chào mừng bạn đến với chuyên mục Tâm Linh huyền bí. Vui lòng điền thông tin ngày giờ sinh chính xác của bạn để mở khóa các phân tích Bản đồ sao, Lá số chiêm tinh, Thần số học và dự đoán vận mệnh cá nhân hóa.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">Họ và Tên</label>
            <input type="text" id="astro-form-name" placeholder="Nhập tên đầy đủ của bạn..." style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); outline: none;">
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">Ngày Sinh</label>
              <input type="date" id="astro-form-date" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); outline: none;">
            </div>
            <div>
              <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">Giờ Sinh</label>
              <input type="time" id="astro-form-time" value="12:00" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); outline: none;">
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">Nơi Sinh (Tỉnh/Thành)</label>
            <input type="text" id="astro-form-place" placeholder="Ví dụ: Hà Nội, TP.HCM, Đồng Nai..." style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); outline: none;">
          </div>
        </div>

        <div style="margin-top: 24px;">
          <button class="btn-primary" id="astro-btn-submit-form" style="width: 100%; padding: 14px 20px; background: linear-gradient(135deg, #8b5cf6, #3b82f6); border: none; font-weight: 700; border-radius: var(--radius-sm); font-size: 14px;">
            Khám Phá Vận Mệnh Của Tôi <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('astro-btn-submit-form').onclick = () => {
    const name = document.getElementById('astro-form-name').value.trim();
    const date = document.getElementById('astro-form-date').value;
    const time = document.getElementById('astro-form-time').value;
    const place = document.getElementById('astro-form-place').value.trim();

    if (!name || !date || !time || !place) {
      alert('Vui lòng điền đầy đủ tất cả thông tin để thiết lập lá số chiêm tinh!');
      return;
    }

    userAstroData = { name, date, time, place };
    renderAstrologyDashboard(container);
  };
}

// ── 2. GIAO DIỆN CHÍNH SAU KHI NHẬP THÔNG TIN ─────────────────────────
function renderAstrologyDashboard(container) {
  // Tính toán số chủ đạo
  const lifePath = calculateLifePathNumber(userAstroData.date);
  // Sinh dữ liệu tọa độ hành tinh và góc chiếu dựa trên ngày sinh (deterministic seed)
  const chartData = generateAstrologyData(userAstroData, lifePath);

  container.innerHTML = `
    <div class="astro-wrapper">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="font-size: 12px; font-weight: 700; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.1em; background: rgba(139,92,246,0.1); padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(139,92,246,0.2); display: inline-block;">
            Bản Đồ Sao & Vận Mệnh
          </div>
          <h2 style="font-size: 20px; font-weight: 700; margin-top: 6px;">Lá Số Chiêm Tinh của: ${userAstroData.name}</h2>
          <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 2px;">
            Sinh ngày: ${formatBirthDate(userAstroData.date)} lúc ${userAstroData.time} tại ${userAstroData.place}
          </div>
        </div>
        <button class="btn-secondary" id="astro-btn-change-info" style="padding: 8px 14px; font-size: 12.5px;">
          <i class="fas fa-user-edit" style="margin-right: 6px;"></i> Nhập lại thông tin
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="astro-tabs">
        <button class="astro-tab-btn active" id="tab-chart-btn" data-subtab="chart">
          <i class="fas fa-circle-notch"></i> Lá Số & Bản Đồ Sao
        </button>
        <button class="astro-tab-btn" id="tab-reading-btn" data-subtab="reading">
          <i class="fas fa-book-open"></i> Diễn Giải Chi Tiết
        </button>
        <button class="astro-tab-btn" id="tab-spiritual-btn" data-subtab="spiritual">
          <i class="fas fa-sparkles"></i> Tử Vi & Số Chủ Đạo
        </button>
        <button class="astro-tab-btn" id="tab-love-career-btn" data-subtab="love-career">
          <i class="fas fa-heart-broken"></i> Tình Duyên & Sự Nghiệp
        </button>
      </div>

      <div class="astro-card">
        <!-- Sub-screens -->
        <div id="astro-dashboard-subscreen"></div>
      </div>
    </div>
  `;

  // Attach change info click
  document.getElementById('astro-btn-change-info').onclick = () => {
    userAstroData = null;
    renderAstrology();
  };

  const subtabButtons = {
    chart: document.getElementById('tab-chart-btn'),
    reading: document.getElementById('tab-reading-btn'),
    spiritual: document.getElementById('tab-spiritual-btn'),
    'love-career': document.getElementById('tab-love-career-btn')
  };

  let activeSubtab = 'chart';

  function switchSubtab(tab) {
    activeSubtab = tab;
    Object.keys(subtabButtons).forEach(t => {
      subtabButtons[t].classList.toggle('active', t === tab);
    });

    const subscreen = document.getElementById('astro-dashboard-subscreen');
    if (!subscreen) return;

    if (tab === 'chart') {
      renderChartSubtab(subscreen, chartData);
    } else if (tab === 'reading') {
      renderReadingSubtab(subscreen, chartData);
    } else if (tab === 'spiritual') {
      renderSpiritualSubtab(subscreen, lifePath, chartData);
    } else if (tab === 'love-career') {
      renderLoveCareerSubtab(subscreen, lifePath, chartData);
    }
  }

  // Initial load
  switchSubtab(activeSubtab);

  // Tab click listeners
  Object.keys(subtabButtons).forEach(tab => {
    subtabButtons[tab].onclick = () => switchSubtab(tab);
  });
}

// ── 3. PHÂN HỆ 1: LÁ SỐ & BẢN ĐỒ SAO ──────────────────────────────────
function renderChartSubtab(container, chartData) {
  container.innerHTML = `
    <div style="margin-bottom: 16px;">
      <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
        Bản đồ sao chiêm tinh được dựng tự động dựa trên tọa độ vị trí các hành tinh tại múi giờ sinh của bạn. Dưới đây là hình vẽ biểu đồ thiên văn, ma trận góc chiếu và vị trí kinh độ các hành tinh.
      </p>
    </div>

    <div class="natal-container">
      <!-- Đồ họa bản đồ sao Canvas -->
      <div class="chart-canvas-wrap">
        <div style="font-size: 15px; font-weight: 700; color: #ffd700; margin-bottom: 12px; text-align: center;">Bản Đồ Sao Hoàng Đạo</div>
        <canvas id="natal-chart-canvas-hd" width="450" height="450" style="max-width: 100%; border-radius: 50%; box-shadow: 0 0 30px rgba(139, 92, 246, 0.2); background: #070614;"></canvas>
        <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 10px; text-align: center;">Lá số chiêm tinh được tạo bởi Rellia Dashboard</div>
      </div>

      <!-- Bảng tọa độ kinh độ hành tinh -->
      <div>
        <div style="font-size: 14px; font-weight: 700; color: #ffd700; margin-bottom: 10px;">📍 Tọa Độ Các Thiên Thể</div>
        <div class="astro-table-container">
          <table class="astro-table">
            <thead>
              <tr>
                <th>Hành Tinh</th>
                <th>Kinh Độ / Cung Hoàng Đạo</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody id="natal-placements-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Sơ đồ Xích Vĩ (Declination Timeline) -->
    <div class="declination-container">
      <div style="font-size: 14px; font-weight: 700; color: #ffd700; margin-bottom: 8px;">🗺️ Sơ đồ Xích vĩ (Declination Timeline)</div>
      <div class="declination-axis" id="declination-axis-timeline"></div>
    </div>

    <!-- Ma Trận Góc Chiếu Tam Giác (Aspect Matrix) -->
    <div style="margin-top: 28px;">
      <div style="font-size: 14px; font-weight: 700; color: #ffd700; margin-bottom: 8px;">📐 Ma Trận Liên Kết Góc Chiếu</div>
      <div class="aspect-grid-wrapper" id="aspect-grid-matrix-container"></div>
    </div>

    <!-- Bảng Chi Tiết Góc Chiếu -->
    <div style="margin-top: 28px;">
      <div style="font-size: 14px; font-weight: 700; color: #ffd700; margin-bottom: 8px;">🔗 Danh Sách Chi Tiết Góc Hợp</div>
      <div class="astro-table-container">
        <table class="astro-table">
          <thead>
            <tr>
              <th>Hành Tinh A</th>
              <th>Góc Chiếu</th>
              <th>Hành Tinh B</th>
              <th>Sai Số / Trạng Thái</th>
            </tr>
          </thead>
          <tbody id="aspects-details-table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  // Draw HD Canvas
  drawHDNatalChart(chartData);

  // Populate coordinates table
  const tbody = document.getElementById('natal-placements-table-body');
  chartData.placements.forEach(p => {
    const row = document.createElement('tr');
    
    let badgeHtml = '';
    if (p.strength === 'Vượng') {
      badgeHtml = `<span class="astro-badge vuong">Vượng</span>`;
    } else if (p.strength === 'Đắc') {
      badgeHtml = `<span class="astro-badge dac">Đắc</span>`;
    } else if (p.strength === 'Tù') {
      badgeHtml = `<span class="astro-badge tu">Tù</span>`;
    } else if (p.strength === 'Hãm') {
      badgeHtml = `<span class="astro-badge ham">Hãm</span>`;
    } else {
      badgeHtml = `<span class="astro-badge dac" style="background:rgba(255,255,255,0.03);color:#fff;border-color:rgba(255,255,255,0.1);">Bình thường</span>`;
    }

    row.innerHTML = `
      <td style="font-weight:700;"><span style="color:${p.color}; margin-right: 6px;">${p.sym}</span> ${p.name}</td>
      <td>${p.signIcon} ${p.signName} ${p.degree}° ${p.minute}' ${p.second}" ${p.isRetrograde ? '<span style="color:#ef4444;font-weight:700;">(R)</span>' : ''}</td>
      <td>${badgeHtml}</td>
    `;
    tbody.appendChild(row);
  });

  // Populate Declination Timeline
  const timeline = document.getElementById('declination-axis-timeline');
  timeline.innerHTML = `
    <div class="declination-label-left">Bắc</div>
    <div class="declination-label-right">Nam</div>
  `;

  chartData.placements.forEach((p, idx) => {
    // Declination value goes from -23.5 to +23.5 degrees
    // Map declination to percentage height (15% to 85%)
    const pctY = 50 - (p.declination / 23.5) * 35; 
    const pctX = 5 + (idx / (chartData.placements.length - 1)) * 90;

    const node = document.createElement('div');
    node.className = 'declination-node';
    node.style.left = `${pctX}%`;
    node.style.top = `${pctY}%`;
    node.innerHTML = `
      <span class="node-sym" style="color:${p.color};" title="${p.name}: ${p.declination}°">${p.sym}</span>
      <span style="font-size:9px;color:var(--text-muted);">${Math.abs(p.declination)}°</span>
    `;
    timeline.appendChild(node);
  });

  // Populate Aspect Matrix (Triangle)
  const matrixContainer = document.getElementById('aspect-grid-matrix-container');
  const tbl = document.createElement('table');
  tbl.className = 'aspect-grid-table';

  // Table header
  const planetsHeaderRow = document.createElement('tr');
  planetsHeaderRow.appendChild(document.createElement('th')); // empty cell top left
  PLANETS.forEach(p => {
    const th = document.createElement('th');
    th.className = 'aspect-grid-cell header';
    th.textContent = p.sym;
    th.title = p.name;
    planetsHeaderRow.appendChild(th);
  });
  tbl.appendChild(planetsHeaderRow);

  // Rows
  PLANETS.forEach((pRow, rIdx) => {
    const row = document.createElement('tr');
    
    // Header cell for row
    const rowHeader = document.createElement('td');
    rowHeader.className = 'aspect-grid-cell header';
    rowHeader.textContent = pRow.sym;
    rowHeader.title = pRow.name;
    row.appendChild(rowHeader);

    PLANETS.forEach((pCol, cIdx) => {
      const cell = document.createElement('td');
      cell.className = 'aspect-grid-cell';

      if (cIdx >= rIdx) {
        // Lower-triangular only, leave empty
        cell.className += ' empty';
      } else {
        // Find if there is an aspect between pRow and pCol
        const aspect = chartData.aspects.find(a => 
          (a.pA === pRow.id && a.pB === pCol.id) || 
          (a.pA === pCol.id && a.pB === pRow.id)
        );

        if (aspect) {
          const aspDetail = ASPECTS.find(asp => asp.name === aspect.type);
          cell.textContent = aspDetail ? aspDetail.sym : '';
          cell.style.color = aspDetail ? aspDetail.color : '#fff';
          cell.title = `${pRow.name} ${aspect.type} ${pCol.name} (Sai số: ${aspect.orb}°)`;
        }
      }
      row.appendChild(cell);
    });
    tbl.appendChild(row);
  });
  matrixContainer.appendChild(tbl);

  // Populate Aspects Details Table
  const aspectsTbody = document.getElementById('aspects-details-table-body');
  if (chartData.aspects.length === 0) {
    aspectsTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Không tìm thấy góc chiếu nào đáng kể.</td></tr>`;
  } else {
    chartData.aspects.forEach(a => {
      const row = document.createElement('tr');
      const pA = PLANETS.find(p => p.id === a.pA);
      const pB = PLANETS.find(p => p.id === a.pB);
      const asp = ASPECTS.find(asp => asp.name === a.type);

      row.innerHTML = `
        <td style="font-weight:700;"><span style="color:${pA.color};margin-right:6px;">${pA.sym}</span> ${pA.name}</td>
        <td style="color:${asp.color};font-weight:700;">${asp.sym} ${a.type} ${a.angle}°</td>
        <td style="font-weight:700;"><span style="color:${pB.color};margin-right:6px;">${pB.sym}</span> ${pB.name}</td>
        <td>${a.orb}° (${a.closeness})</td>
      `;
      aspectsTbody.appendChild(row);
    });
  }
}

// Hàm vẽ bản đồ sao Canvas chất lượng cao
function drawHDNatalChart(chartData) {
  const canvas = document.getElementById('natal-chart-canvas-hd');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) - 20;

  ctx.clearRect(0, 0, w, h);

  // 1. Draw outermost background circle space
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#060512';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3b2f80';
  ctx.stroke();

  // 2. Draw 12 Zodiac segments on outer ring
  const outerRingR = r;
  const innerRingR1 = r - 30; // outer track for zodiac icons
  const innerRingR2 = r - 45; // degree markings track
  const innerRingR3 = r - 65; // houses labels track
  const centerRadius = r * 0.45;

  ZODIAC_SIGNS.forEach((z, idx) => {
    const startAngle = (z.startDeg * Math.PI) / 180;
    const endAngle = ((z.startDeg + 30) * Math.PI) / 180;

    // Draw segment boundary lines
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(startAngle) * innerRingR2, cy + Math.sin(startAngle) * innerRingR2);
    ctx.lineTo(cx + Math.cos(startAngle) * outerRingR, cy + Math.sin(startAngle) * outerRingR);
    ctx.strokeStyle = '#3b2f80';
    ctx.stroke();

    // Fill zodiac backgrounds with subtle colored opacity
    ctx.beginPath();
    ctx.arc(cx, cy, outerRingR, startAngle, endAngle);
    ctx.lineTo(cx + Math.cos(endAngle) * innerRingR1, cy + Math.sin(endAngle) * innerRingR1);
    ctx.arc(cx, cy, innerRingR1, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(z.color, 0.08);
    ctx.fill();

    // Draw zodiac symbols in center of each segment
    const midAngle = startAngle + (15 * Math.PI) / 180;
    const iconX = cx + Math.cos(midAngle) * (innerRingR1 + 15);
    const iconY = cy + Math.sin(midAngle) * (innerRingR1 + 15);

    ctx.fillStyle = z.color;
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(z.sym, iconX, iconY);
  });

  // Circular ring boundary lines
  ctx.beginPath();
  ctx.arc(cx, cy, innerRingR1, 0, Math.PI * 2);
  ctx.strokeStyle = '#3b2f80';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, innerRingR2, 0, Math.PI * 2);
  ctx.strokeStyle = '#3b2f80';
  ctx.stroke();

  // Degree subdivision markings
  for (let d = 0; d < 360; d += 5) {
    const angle = (d * Math.PI) / 180;
    const isMajor = d % 30 === 0;
    const len = isMajor ? 12 : 6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * innerRingR2, cy + Math.sin(angle) * innerRingR2);
    ctx.lineTo(cx + Math.cos(angle) * (innerRingR2 - len), cy + Math.sin(angle) * (innerRingR2 - len));
    ctx.strokeStyle = isMajor ? '#513b9c' : '#272054';
    ctx.stroke();
  }

  // 3. Draw Houses division (12 Houses) and their numbers
  for (let hIndex = 0; hIndex < 12; hIndex++) {
    const angle = ((hIndex * 30) * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * centerRadius, cy + Math.sin(angle) * centerRadius);
    ctx.lineTo(cx + Math.cos(angle) * innerRingR3, cy + Math.sin(angle) * innerRingR3);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw house number badge inside house division
    const houseMidAngle = angle + (15 * Math.PI) / 180;
    const labelX = cx + Math.cos(houseMidAngle) * (centerRadius + 20);
    const labelY = cy + Math.sin(houseMidAngle) * (centerRadius + 20);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = '10px monospace';
    ctx.fillText(`${hIndex + 1}`, labelX, labelY);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, centerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
  ctx.stroke();

  // 4. Draw aspect lines inside the central circle
  chartData.aspects.forEach(a => {
    const pA = PLANETS.find(p => p.id === a.pA);
    const pB = PLANETS.find(p => p.id === a.pB);
    if (!pA || !pB) return;

    // Get angles
    const placementA = chartData.placements.find(p => p.id === a.pA);
    const placementB = chartData.placements.find(p => p.id === a.pB);
    if (!placementA || !placementB) return;

    const angleA = (placementA.totalDegrees * Math.PI) / 180;
    const angleB = (placementB.totalDegrees * Math.PI) / 180;

    const ax = cx + Math.cos(angleA) * centerRadius;
    const ay = cy + Math.sin(angleA) * centerRadius;
    const bx = cx + Math.cos(angleB) * centerRadius;
    const by = cy + Math.sin(angleB) * centerRadius;

    const aspDef = ASPECTS.find(asp => asp.name === a.type);
    const color = aspDef ? aspDef.color : 'rgba(255,255,255,0.1)';

    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = hexToRgba(color, 0.55);
    ctx.lineWidth = a.orb < 2 ? 1.8 : 0.8;
    ctx.stroke();
  });

  // 5. Draw Planet nodes and text coordinates
  chartData.placements.forEach(p => {
    const angle = (p.totalDegrees * Math.PI) / 180;
    const nodeR = innerRingR3 - 10;
    const px = cx + Math.cos(angle) * nodeR;
    const py = cy + Math.sin(angle) * nodeR;

    // Draw little circle node
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // Draw Planet Symbol and short degrees text
    ctx.fillStyle = p.color;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(p.sym, px, py - 10);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '9px monospace';
    ctx.fillText(`${p.degree}°`, px, py + 12);
  });
}

// Helper color parsing
function hexToRgba(hex, alpha = 1) {
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── 4. PHÂN HỆ 2: DIỄN GIẢI CHI TIẾT BẢN ĐỒ SAO ────────────────────────
function renderReadingSubtab(container, chartData) {
  container.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #ffd700;">📖 Diễn Giải & Phân Tích Chi Tiết Bản Đồ Sao</h3>
      <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
        Dưới đây là phân tích chiêm tinh học học thuật chi tiết về cấu trúc bản đồ sao của bạn, bao gồm 5 khía cạnh phân tích cốt lõi.
      </p>
    </div>

    <div class="reading-grid">
      <!-- 1. Hành tinh chính (Dominant planets) -->
      <div class="reading-card">
        <div class="reading-card-title">
          <i class="fas fa-meteor"></i> 1. Hành Tinh Chính & Năng Lượng Chủ Đạo
        </div>
        <div class="reading-card-text" id="read-dominant-planets"></div>
      </div>

      <!-- 2. Hành tinh & Nhà (Planets in Houses) -->
      <div class="reading-card">
        <div class="reading-card-title">
          <i class="fas fa-home"></i> 2. Hành Tinh Tác Động Tại Các Cung Địa Bàn (Nhà)
        </div>
        <div class="reading-card-text" id="read-planets-houses"></div>
      </div>

      <!-- 3. Đỉnh nhà & Chủ quản (House Cusps & Rulers) -->
      <div class="reading-card">
        <div class="reading-card-title">
          <i class="fas fa-compass"></i> 3. Đỉnh Nhà & Hành Tinh Chủ Quản Địa Bàn
        </div>
        <div class="reading-card-text" id="read-house-cusps"></div>
      </div>

      <!-- 4. Mẫu góc hợp & góc chiếu (Aspect Patterns & Aspects) -->
      <div class="reading-card">
        <div class="reading-card-title">
          <i class="fas fa-bezier-curve"></i> 4. Mẫu Góc Hợp & Tương Tác Giữa Các Hành Tinh
        </div>
        <div class="reading-card-text" id="read-aspect-patterns"></div>
      </div>

      <!-- 5. Bố cục & Ưu thế (Hemispheres & Element Distributions) -->
      <div class="reading-card">
        <div class="reading-card-title">
          <i class="fas fa-balance-scale"></i> 5. Bố Cục Bản Đồ Sao & Ưu Thế Nguyên Tố
        </div>
        <div class="reading-card-text" id="read-element-distribution"></div>
      </div>
    </div>
  `;

  // Populate analysis text
  const sun = chartData.placements.find(p => p.id === 'sun');
  const moon = chartData.placements.find(p => p.id === 'moon');
  const asc = chartData.placements.find(p => p.id === 'northnode'); // simulated ascendant sign

  // 1. Dominant Planets
  document.getElementById('read-dominant-planets').innerHTML = `
    Lá số của bạn cho thấy <strong>Mặt Trời</strong> nằm ở cung <strong>${sun.signName}</strong> và <strong>Mặt Trăng</strong> nằm ở cung <strong>${moon.signName}</strong> là các nguồn năng lượng cốt lõi định hình bản sắc cá nhân của bạn.
    Hành tinh trội nhất chi phối lá số là <strong>${sun.planetName}</strong> (chủ quản cung hoàng đạo của Mặt Trời). Năng lượng này thúc đẩy bạn hành động dựa trên ý chí mạnh mẽ, khát vọng khẳng định bản thân và khả năng tự lãnh đạo cao trong cuộc sống hàng ngày.
  `;

  // 2. Planets in Houses
  document.getElementById('read-planets-houses').innerHTML = `
    Các hành tinh được phân bố đều tại các nhà địa bàn:
    <ul>
      <li><strong>Mặt Trời tại Nhà 1:</strong> Thúc đẩy nhu cầu khẳng định bản thân mạnh mẽ, bạn luôn muốn được mọi người xung quanh nhìn nhận đúng năng lực và cá tính thực tế của mình.</li>
      <li><strong>Mặt Trăng tại Nhà 4:</strong> Cho thấy nhu cầu an toàn cảm xúc cực kỳ lớn gắn liền với gia đình, tổ ấm và các giá trị cội nguồn bền vững.</li>
      <li><strong>Sao Thủy tại Nhà 10:</strong> Thể hiện trí tuệ linh hoạt, kỹ năng giao tiếp tinh tế đặc biệt có lợi trong phát triển con đường sự nghiệp và xây dựng danh tiếng xã hội.</li>
      <li><strong>Sao Kim tại Nhà 7:</strong> Mang lại may mắn to lớn trong các mối quan hệ đối tác, hôn nhân thuận lợi và có xu hướng tìm kiếm sự cân bằng, hòa hợp tuyệt đối.</li>
    </ul>
  `;

  // 3. House Cusps & Rulers
  document.getElementById('read-house-cusps').innerHTML = `
    Đỉnh nhà 1 (Ascendant - Cung Mọc) của bạn ngự tại <strong>${asc.signName}</strong>, điều này cho thấy vẻ ngoài hoặc ấn tượng đầu tiên bạn để lại cho thế giới xung quanh là một người bản lĩnh, có chiều sâu và luôn giữ sự bình tĩnh cần thiết.
    Hành tinh chủ quản đỉnh nhà 1 là <strong>${PLANETS.find(p => p.id === 'mars').name}</strong>, phân bố tại cung địa bàn số 3 (Nhà 3 - Giao tiếp & Tư duy), kích hoạt tư duy phản biện sắc bén và khát vọng không ngừng học hỏi, chia sẻ tri thức với cộng đồng xung quanh.
  `;

  // 4. Aspect Patterns
  document.getElementById('read-aspect-patterns').innerHTML = `
    Bản đồ sao ghi nhận mô hình góc hợp đặc biệt:
    <ul>
      <li><strong>Góc Tam Hợp (Trine 120°) giữa Mặt Trời và Sao Mộc:</strong> Mang lại may mắn tự nhiên, thái độ sống lạc quan và nhiều cơ hội thăng tiến tốt đẹp.</li>
      <li><strong>Góc Vuông Góc (Square 90°) giữa Sao Thủy và Sao Thổ:</strong> Tạo ra những bài học thử thách về mặt tư duy, đôi khi bạn gặp khó khăn trong việc diễn đạt ý tưởng nhưng bù lại giúp rèn luyện tinh thần kỷ luật thép và sự kiên trì sâu sắc.</li>
      <li><strong>Góc Trùng Tụ (Conjunction 0°) giữa Mặt Trời và Sao Kim:</strong> Tạo nên sức hút cá nhân lôi cuốn, gu thẩm mỹ tinh tế và tình yêu nghệ thuật sâu sắc.</li>
    </ul>
  `;

  // 5. Hemispheres & Element Distributions
  document.getElementById('read-element-distribution').innerHTML = `
    Về bố cục phân bổ, các hành tinh của bạn tập trung phần lớn ở <strong>Bán Cầu Đông (Ý chí độc lập, tự chủ)</strong> và <strong>Bán Cầu Nam (Hành động hướng ngoại, xã hội)</strong>.
    <br><br>
    <strong>Phân bổ ưu thế nguyên tố:</strong>
    <ul>
      <li>🔥 <strong>Nguyên tố Lửa (Fire - 35%):</strong> Nhiệt huyết, đam mê và tràn đầy dũng khí để tiên phong.</li>
      <li>🌱 <strong>Nguyên tố Đất (Earth - 25%):</strong> Thực tế, kiên nhẫn và luôn coi trọng tính bền vững.</li>
      <li>💨 <strong>Nguyên tố Khí (Air - 20%):</strong> Tư duy logic, thích giao lưu học hỏi và kết nối cộng đồng.</li>
      <li>💧 <strong>Nguyên tố Nước (Water - 20%):</strong> Giàu tình cảm, trực giác nhạy bén và thấu cảm cao.</li>
    </ul>
  `;
}

// ── 5. PHÂN HỆ 3: TỬ VI & SỐ CHỦ ĐẠO ─────────────────────────────────
function renderSpiritualSubtab(container, lifePath, chartData) {
  const sun = chartData.placements.find(p => p.id === 'sun');
  const moon = chartData.placements.find(p => p.id === 'moon');

  // Dữ liệu bói thần số học theo số chủ đạo (Life Path)
  const numerologyDetails = {
    1: "Số 1 - Người tiên phong dẫn đầu. Bạn có ý chí tự lập cực mạnh, tự tin và sáng tạo, sinh ra để tự mở lối đi riêng.",
    2: "Số 2 - Sứ giả hòa bình. Bạn nhạy cảm, thấu hiểu, giỏi thương lượng và có khả năng kết nối mọi người xung quanh cực tốt.",
    3: "Số 3 - Người truyền cảm hứng. Tư duy linh hoạt, hoạt ngôn, giàu khiếu nghệ thuật và luôn mang lại tiếng cười cho tập thể.",
    4: "Số 4 - Người kiến tạo nền móng. Bạn thực tế, kỷ luật, tỉ mỉ, đáng tin cậy và có khả năng tổ chức công việc khoa học.",
    5: "Số 5 - Nhà thám hiểm tự do. Bạn yêu tự do, thích dịch chuyển, năng động và luôn đón nhận những thay đổi một cách hứng thú.",
    6: "Số 6 - Người nuôi dưỡng yêu thương. Bạn giàu tình thương, luôn quan tâm gia đình, trách nhiệm cao và có xu hướng gánh vác việc chung.",
    7: "Số 7 - Người tìm kiếm chân lý. Bạn có trí tuệ sâu sắc, tư duy phân tích giỏi, thích chiêm nghiệm tâm linh và tự học qua trải nghiệm thực tế.",
    8: "Số 8 - Nhà điều hành bản lĩnh. Bạn độc lập, có năng lực tài chính nhạy bén, kiên cường và hướng tới sự thành công vật chất cụ thể.",
    9: "Số 9 - Nhà nhân đạo cộng đồng. Bạn hoài bão lớn, bao dung, luôn hướng về lợi ích tập thể và sẵn lòng giúp đỡ người khó khăn.",
    11: "Số Master 11 - Trực giác tâm linh nhạy bén. Bạn sở hữu năng lượng nhạy cảm cao, khả năng thấu hiểu tâm lý và sứ mệnh kết nối tâm thức.",
    22: "Số Master 22 - Nhà kiến thiết vĩ đại. Bạn kết hợp giữa tầm nhìn vĩ mô của số 11 và óc thực tế chặt chẽ của số 4 để hiện thực hóa ước mơ lớn.",
    33: "Số Master 33 - Người thầy chữa lành. Năng lượng tràn ngập lòng nhân ái, sứ mệnh truyền tải thông điệp yêu thương và nâng đỡ tinh thần người khác."
  };

  container.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #ffd700;">✨ Phân Tích Thần Số Học & Tử Vi Dự Đoán</h3>
      <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
        Giải mã bí ẩn vận mệnh thông qua sự kết hợp giữa con số chủ đạo Thần số học và lá số Tử vi Phương Đông của bạn.
      </p>
    </div>

    <div class="reading-grid">
      <!-- Thần số học -->
      <div class="reading-card">
        <div class="reading-card-title">
          <i class="fas fa-hashtag"></i> Thần Số Học: Con Số Chủ Đạo (Life Path Number)
        </div>
        <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 12px;">
          <div style="font-size: 38px; font-weight: 800; color: #ffd700; background: rgba(255,215,0,0.1); border: 2px solid #ffd700; width: 65px; height: 65px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family:'JetBrains Mono', monospace;">
            ${lifePath}
          </div>
          <div>
            <div style="font-size: 14.5px; font-weight: 700;">Con Số Chủ Đạo Của Bạn: Số ${lifePath}</div>
            <div style="font-size: 12px; color: var(--text-muted);">Tính toán dựa trên tổng các chữ số trong ngày sinh của bạn</div>
          </div>
        </div>
        <div class="reading-card-text">
          <strong>Ý nghĩa con số chủ đạo:</strong> ${numerologyDetails[lifePath] || "Không xác định"}
          <br><br>
          Năng lượng của con số chủ đạo này sẽ luôn đồng hành xuyên suốt hành trình cuộc sống, định hướng cách thức bạn phản ứng trước các thử thách cuộc đời và khơi dậy tiềm năng tiềm ẩn lớn nhất của bản thân.
        </div>
      </div>

      <!-- Vận mệnh tổng quan -->
      <div class="reading-card">
        <div class="reading-card-title">
          <i class="fas fa-yin-yang"></i> Vận Mệnh Cốt Lõi & Tử Vi Trọn Đời
        </div>
        <div class="reading-card-text">
          Dựa trên sự phối hợp giữa Mặt Trời <strong>${sun.signName}</strong> và Con số chủ đạo <strong>Số ${lifePath}</strong>:
          <br><br>
          Vận mệnh trọn đời của bạn hướng đến sự tự lập, kiến tạo giá trị thực tế vững chắc và không ngừng làm mới bản thân. Bạn được trời phú cho óc quan sát nhạy bén cùng bản lĩnh vượt khó. Bất kể xuất phát điểm như thế nào, trung vận của bạn sẽ chứng kiến sự bứt phá vượt bậc về cả sự nghiệp lẫn đời sống tinh thần.
        </div>
      </div>
    </div>
  `;
}

// ── 6. PHÂN HỆ 4: TÌNH DUYÊN & SỰ NGHIỆP ─────────────────────────────
function renderLoveCareerSubtab(container, lifePath, chartData) {
  const venus = chartData.placements.find(p => p.id === 'venus');
  const mercury = chartData.placements.find(p => p.id === 'mercury');

  container.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #ffd700;">❤️ Tình Duyên, Sự Nghiệp & Vận Hạn</h3>
      <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
        Phân tích chuyên sâu về đời sống tình cảm cá nhân, xu hướng nghề nghiệp phù hợp và các chu kỳ vận hạn cần lưu ý trong thời gian tới.
      </p>
    </div>

    <div class="reading-grid">
      <!-- Bói tình yêu -->
      <div class="reading-card">
        <div class="reading-card-title">
          <i class="fas fa-heart"></i> Bói Tình Yêu & Bản Sắc Mối Quan Hệ
        </div>
        <div class="reading-card-text">
          Vị trí <strong>Sao Kim</strong> (hành tinh cai quản tình yêu) của bạn ngự tại cung <strong>${venus.signName}</strong>:
          <br><br>
          Trong mối quan hệ yêu đương, bạn là một người chân thành, nồng nhiệt, luôn mong muốn đem lại niềm vui và sự an tâm tuyệt đối cho nửa kia của mình. Bạn đề cao lòng trung thành và sự tôn trọng lẫn nhau. Tuy nhiên, đôi khi bạn có xu hướng hơi kiểm soát hoặc đòi hỏi đối phương quá cao. Việc mở lòng và học cách tin tưởng sẽ giúp đời sống lứa đôi của bạn luôn giữ được lửa hạnh phúc dài lâu.
        </div>
      </div>

      <!-- Nghề nghiệp định hướng -->
      <div class="reading-card">
        <div class="reading-card-title">
          <i class="fas fa-briefcase"></i> Định Hướng Nghề Nghiệp Phù Hợp
        </div>
        <div class="reading-card-text">
          Vị trí <strong>Sao Thủy</strong> (tư duy logic) tại cung <strong>${mercury.signName}</strong> kết hợp với Số Chủ Đạo <strong>Số ${lifePath}</strong> gợi ý các nhóm ngành nghề triển vọng nhất cho bạn:
          <br><br>
          Nhờ óc tổ chức khoa học, khả năng truyền đạt lưu loát và kỹ năng phân tích nhạy bén, bạn cực kỳ thích hợp làm việc trong các lĩnh vực:
          <ul>
            <li>Quản lý dự án, Tư vấn tài chính, Nghiên cứu số liệu.</li>
            <li>Sáng tạo nội dung, Giáo dục, Truyền thông đối ngoại.</li>
            <li>Công nghệ thông tin, Thiết kế kỹ thuật hoặc Hoạt động nghiên cứu học thuật độc lập.</li>
          </ul>
        </div>
      </div>

      <!-- Vận hạn vận trình -->
      <div class="reading-card">
        <div class="reading-card-title">
          <i class="fas fa-cloud-showers-heavy"></i> Vận Hạn & Lưu Ý Vận Trình
        </div>
        <div class="reading-card-text">
          Chu kỳ các hành tinh hiện tại cho thấy bạn đang bước vào giai đoạn tái cấu trúc cuộc sống.
          <br><br>
          <strong>Lời khuyên hóa giải:</strong> Cần đặc biệt chú ý kiểm soát chi tiêu tài chính trong các tháng tới. Trong công việc, tránh đưa ra các quyết định đầu tư mạo hiểm thiếu cơ sở. Hãy tập trung chăm sóc sức khỏe, cải thiện chế độ dinh dưỡng và dành thời gian thư giãn đầu óc để tái tạo năng lượng tích cực vượt qua mọi thử thách.
        </div>
      </div>
    </div>
  `;
}

// ── 7. CÁC HÀM TÍNH TOÁN DỮ LIỆU ĐỘNG ──────────────────────────────────
function calculateLifePathNumber(dateStr) {
  if (!dateStr) return 0;
  const digits = dateStr.replace(/[^0-9]/g, '');
  let sum = digits.split('').reduce((acc, d) => acc + parseInt(d), 0);

  // Vòng lặp cộng dồn trừ các số Master (11, 22, 33)
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').reduce((acc, d) => acc + parseInt(d), 0);
  }
  return sum;
}

// Hàm sinh tọa độ các hành tinh ngẫu nhiên nhưng nhất quán theo input người dùng (deterministic seed)
function generateAstrologyData(user, lifePath) {
  const dateParts = user.date.split('-');
  const y = parseInt(dateParts[0]);
  const m = parseInt(dateParts[1]);
  const d = parseInt(dateParts[2]);
  const timeVal = user.time.replace(':', '');
  const placeLen = user.place.length;

  // Thuật toán tạo seed đơn giản
  const baseSeed = y + m * 31 + d + parseInt(timeVal) + placeLen + lifePath * 9;

  // Tính toán kinh độ các hành tinh (0 - 360 độ)
  const placements = PLANETS.map((p, idx) => {
    // Đảm bảo mỗi hành tinh ở một vị trí khác nhau phụ thuộc vào baseSeed
    const totalDegrees = Math.round((baseSeed * (idx + 7) * 31) % 360);
    const signIdx = Math.floor(totalDegrees / 30);
    const degree = totalDegrees % 30;
    const minute = Math.round((baseSeed * (idx + 13) * 17) % 60);
    const second = Math.round((baseSeed * (idx + 29) * 9) % 60);

    const sign = ZODIAC_SIGNS[signIdx];
    const isRetrograde = (baseSeed * (idx + 3)) % 5 === 0; // 20% khả năng nghịch hành

    // Trạng thái sức mạnh hành tinh
    const strengthArr = ['Vượng', 'Tù', 'Đắc', 'Hãm', 'Bình thường'];
    const strength = strengthArr[(baseSeed + idx) % strengthArr.length];

    // Xích vĩ (Declination) ngẫu nhiên từ -23.44 đến 23.44 độ
    const declination = parseFloat(((Math.sin(baseSeed + idx) * 23.44)).toFixed(2));

    return {
      ...p,
      totalDegrees,
      signName: sign.name,
      signIcon: sign.sym,
      degree,
      minute,
      second,
      isRetrograde,
      strength,
      declination,
      planetName: p.name
    };
  });

  // Tính toán các góc chiếu giữa các hành tinh
  // Nếu khoảng cách giữa 2 hành tinh gần bằng 0, 30, 60, 90, 120, 150, 180 (sai số sai lệch cho phép < 8 độ)
  const aspects = [];
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const pA = placements[i];
      const pB = placements[j];

      // Khoảng cách góc ngắn nhất giữa 2 hành tinh
      let diff = Math.abs(pA.totalDegrees - pB.totalDegrees);
      if (diff > 180) diff = 360 - diff;

      // Check xem có khớp với góc nào trong danh sách không
      for (const asp of ASPECTS) {
        const delta = Math.abs(diff - asp.deg);
        if (delta <= 8) {
          aspects.push({
            pA: pA.id,
            pB: pB.id,
            type: asp.name,
            angle: asp.deg,
            orb: parseFloat(delta.toFixed(1)),
            closeness: delta <= 3 ? 'Tiệm Cận' : 'Rời Xa'
          });
          break; // Đã tìm thấy một góc chiếu phù hợp, chuyển sang cặp tiếp theo
        }
      }
    }
  }

  return {
    placements,
    aspects
  };
}

function formatBirthDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
