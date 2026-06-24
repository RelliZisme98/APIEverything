/**
 * components/converter.js
 * Universal Unit Converter component
 * Supports: Data, Temperature, Length, Mass, Volume, Area, Speed, and Timezones.
 */

let activeCategory = 'data'; // 'data', 'temp', 'length', 'mass', 'volume', 'area', 'speed', 'timezone'

export function renderConverter(containerId = 'converterContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="conv-wrapper">
      <!-- Category Tabs -->
      <div class="conv-tabs">
        <button class="conv-tab-btn active" id="conv-tab-data" data-cat="data">💾 Dữ Liệu</button>
        <button class="conv-tab-btn" id="conv-tab-temp" data-cat="temp">🌡️ Nhiệt Độ</button>
        <button class="conv-tab-btn" id="conv-tab-length" data-cat="length">📏 Độ Dài</button>
        <button class="conv-tab-btn" id="conv-tab-mass" data-cat="mass">⚖️ Khối Lượng</button>
        <button class="conv-tab-btn" id="conv-tab-volume" data-cat="volume">🧪 Thể Tích</button>
        <button class="conv-tab-btn" id="conv-tab-area" data-cat="area">📐 Diện Tích</button>
        <button class="conv-tab-btn" id="conv-tab-speed" data-cat="speed">⚡ Tốc Độ</button>
        <button class="conv-tab-btn" id="conv-tab-timezone" data-cat="timezone">🕐 Múi Giờ</button>
      </div>

      <!-- Main Converter Box -->
      <div class="conv-body">
        <!-- 1. DATA CONVERTER -->
        <div class="conv-panel active" id="conv-panel-data">
          <div class="conv-grid">
            <div class="conv-field">
              <label class="conv-label">Bytes (B)</label>
              <input type="number" class="conv-input" id="conv-data-b" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Kilobytes (KB)</label>
              <input type="number" class="conv-input" id="conv-data-kb" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Megabytes (MB)</label>
              <input type="number" class="conv-input" id="conv-data-mb" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Gigabytes (GB)</label>
              <input type="number" class="conv-input" id="conv-data-gb" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Terabytes (TB)</label>
              <input type="number" class="conv-input" id="conv-data-tb" placeholder="Nhập số..." />
            </div>
          </div>
          <div class="conv-tip">💡 Gợi ý: 1 GB = 1024 MB = 1,048,576 KB.</div>
        </div>

        <!-- 2. TEMPERATURE CONVERTER -->
        <div class="conv-panel" id="conv-panel-temp">
          <div class="conv-grid">
            <div class="conv-field">
              <label class="conv-label">Celsius (°C)</label>
              <input type="number" class="conv-input" id="conv-temp-c" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Fahrenheit (°F)</label>
              <input type="number" class="conv-input" id="conv-temp-f" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Kelvin (K)</label>
              <input type="number" class="conv-input" id="conv-temp-k" placeholder="Nhập số..." />
            </div>
          </div>
          <div class="conv-tip">💡 Công thức: °F = (°C × 9/5) + 32 | K = °C + 273.15.</div>
        </div>

        <!-- 3. LENGTH CONVERTER -->
        <div class="conv-panel" id="conv-panel-length">
          <div class="conv-grid">
            <div class="conv-field">
              <label class="conv-label">Kilomét (km)</label>
              <input type="number" class="conv-input" id="conv-len-km" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Mét (m)</label>
              <input type="number" class="conv-input" id="conv-len-m" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Đềximét (dm)</label>
              <input type="number" class="conv-input" id="conv-len-dm" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Centimét (cm)</label>
              <input type="number" class="conv-input" id="conv-len-cm" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Milimét (mm)</label>
              <input type="number" class="conv-input" id="conv-len-mm" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Inches (in)</label>
              <input type="number" class="conv-input" id="conv-len-inch" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Feet (ft)</label>
              <input type="number" class="conv-input" id="conv-len-ft" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Yards (yd)</label>
              <input type="number" class="conv-input" id="conv-len-yd" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Dặm (miles)</label>
              <input type="number" class="conv-input" id="conv-len-mi" placeholder="Nhập số..." />
            </div>
          </div>

          <div class="conv-ref-container">
            <!-- Table 1: Monitor Sizes -->
            <div class="conv-ref-card">
              <div class="conv-ref-title">🖥️ Kích Thước Màn Hình (Tỷ lệ 16:9)</div>
              <table class="conv-ref-table">
                <thead>
                  <tr>
                    <th>Kích thước</th>
                    <th>Rộng (W)</th>
                    <th>Cao (H)</th>
                    <th>Chéo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>24 inch</td>
                    <td>53.1 cm</td>
                    <td>29.9 cm</td>
                    <td>61.0 cm</td>
                  </tr>
                  <tr>
                    <td>27 inch</td>
                    <td>59.8 cm</td>
                    <td>33.6 cm</td>
                    <td>68.6 cm</td>
                  </tr>
                  <tr>
                    <td>32 inch</td>
                    <td>70.8 cm</td>
                    <td>39.8 cm</td>
                    <td>81.3 cm</td>
                  </tr>
                  <tr>
                    <td>43 inch</td>
                    <td>95.2 cm</td>
                    <td>53.5 cm</td>
                    <td>109.2 cm</td>
                  </tr>
                  <tr>
                    <td>55 inch</td>
                    <td>121.8 cm</td>
                    <td>68.5 cm</td>
                    <td>139.7 cm</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Table 2: Length/Metric Cheat Sheet -->
            <div class="conv-ref-card">
              <div class="conv-ref-title">📏 Quy Đổi Hệ Mét &amp; Anh Mỹ Thông Dụng</div>
              <table class="conv-ref-table">
                <thead>
                  <tr>
                    <th>Gốc</th>
                    <th>Hệ mét quy đổi</th>
                    <th>Anh Mỹ quy đổi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1 m (Mét)</td>
                    <td>10 dm = 100 cm = 1,000 mm</td>
                    <td>39.37 in = 3.28 ft</td>
                  </tr>
                  <tr>
                    <td>1 inch (in)</td>
                    <td>2.54 cm = 25.4 mm</td>
                    <td>1/12 ft = 1/36 yd</td>
                  </tr>
                  <tr>
                    <td>1 foot (ft)</td>
                    <td>30.48 cm = 0.3048 m</td>
                    <td>12 in = 1/3 yd</td>
                  </tr>
                  <tr>
                    <td>1 yard (yd)</td>
                    <td>91.44 cm = 0.9144 m</td>
                    <td>3 ft = 36 in</td>
                  </tr>
                  <tr>
                    <td>1 dặm (mile)</td>
                    <td>1.609 km = 1,609.34 m</td>
                    <td>5,280 ft = 1,760 yd</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 4. MASS CONVERTER -->
        <div class="conv-panel" id="conv-panel-mass">
          <div class="conv-grid">
            <div class="conv-field">
              <label class="conv-label">Tấn (t)</label>
              <input type="number" class="conv-input" id="conv-mass-ton" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Kilôgam (kg)</label>
              <input type="number" class="conv-input" id="conv-mass-kg" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Gam (g)</label>
              <input type="number" class="conv-input" id="conv-mass-g" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Miligam (mg)</label>
              <input type="number" class="conv-input" id="conv-mass-mili" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Pounds (lb)</label>
              <input type="number" class="conv-input" id="conv-mass-lb" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Ounces (oz)</label>
              <input type="number" class="conv-input" id="conv-mass-oz" placeholder="Nhập số..." />
            </div>
          </div>
        </div>

        <!-- 5. VOLUME CONVERTER -->
        <div class="conv-panel" id="conv-panel-volume">
          <div class="conv-grid">
            <div class="conv-field">
              <label class="conv-label">Lít (L)</label>
              <input type="number" class="conv-input" id="conv-vol-l" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Mililít (mL)</label>
              <input type="number" class="conv-input" id="conv-vol-ml" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Mét khối (m³)</label>
              <input type="number" class="conv-input" id="conv-vol-m3" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Gallons (gal - US)</label>
              <input type="number" class="conv-input" id="conv-vol-gallon" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Fluid Ounces (fl oz - US)</label>
              <input type="number" class="conv-input" id="conv-vol-floz" placeholder="Nhập số..." />
            </div>
          </div>
        </div>

        <!-- 6. AREA CONVERTER -->
        <div class="conv-panel" id="conv-panel-area">
          <div class="conv-grid">
            <div class="conv-field">
              <label class="conv-label">Kilômét vuông (km²)</label>
              <input type="number" class="conv-input" id="conv-area-km2" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Hecta (ha)</label>
              <input type="number" class="conv-input" id="conv-area-ha" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Mét vuông (m²)</label>
              <input type="number" class="conv-input" id="conv-area-m2" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Mẫu Anh (Acre)</label>
              <input type="number" class="conv-input" id="conv-area-acre" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Feet vuông (ft²)</label>
              <input type="number" class="conv-input" id="conv-area-ft2" placeholder="Nhập số..." />
            </div>
          </div>
        </div>

        <!-- 7. SPEED CONVERTER -->
        <div class="conv-panel" id="conv-panel-speed">
          <div class="conv-grid">
            <div class="conv-field">
              <label class="conv-label">Mét trên giây (m/s)</label>
              <input type="number" class="conv-input" id="conv-speed-ms" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Kilômét trên giờ (km/h)</label>
              <input type="number" class="conv-input" id="conv-speed-kmh" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Dặm trên giờ (mph)</label>
              <input type="number" class="conv-input" id="conv-speed-mph" placeholder="Nhập số..." />
            </div>
            <div class="conv-field">
              <label class="conv-label">Hải lý (Knot)</label>
              <input type="number" class="conv-input" id="conv-speed-knot" placeholder="Nhập số..." />
            </div>
          </div>
        </div>

        <!-- 8. TIMEZONE CONVERTER -->
        <div class="conv-panel" id="conv-panel-timezone">
          <div class="tz-header">
            <div class="tz-input-wrap">
              <label class="conv-label">Chọn thời gian gốc (Máy của bạn):</label>
              <input type="datetime-local" class="conv-input tz-base-input" id="conv-tz-base" />
            </div>
            <button class="btn-primary tz-now-btn" id="conv-tz-now">Đặt Hiện Tại</button>
          </div>
          
          <div class="tz-results-list" id="conv-tz-list">
            <!-- Timezones populated here -->
          </div>
        </div>
      </div>
    </div>
  `;

  setupConverter();
}

function setupConverter() {
  const tabs = document.querySelectorAll('.conv-tab-btn');
  const panels = document.querySelectorAll('.conv-panel');

  // Handle Tab Switch
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      activeCategory = tab.dataset.cat;
      const targetPanel = document.getElementById(`conv-panel-${activeCategory}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    };
  });

  // ════════════════════════════════════════════════════════════
  // 1. DATA CONVERTER LOGIC
  // ════════════════════════════════════════════════════════════
  const dataB = document.getElementById('conv-data-b');
  const dataKb = document.getElementById('conv-data-kb');
  const dataMb = document.getElementById('conv-data-mb');
  const dataGb = document.getElementById('conv-data-gb');
  const dataTb = document.getElementById('conv-data-tb');

  const dataUnits = [
    { el: dataB, mult: 1 },
    { el: dataKb, mult: 1024 },
    { el: dataMb, mult: 1024 * 1024 },
    { el: dataGb, mult: 1024 * 1024 * 1024 },
    { el: dataTb, mult: 1024 * 1024 * 1024 * 1024 }
  ];

  dataUnits.forEach(unit => {
    if (!unit.el) return;
    unit.el.oninput = () => {
      const val = parseFloat(unit.el.value);
      if (isNaN(val)) {
        dataUnits.forEach(u => { if (u.el && u.el !== unit.el) u.el.value = ''; });
        return;
      }
      const baseBytes = val * unit.mult;
      dataUnits.forEach(u => {
        if (u.el && u.el !== unit.el) {
          const res = baseBytes / u.mult;
          u.el.value = parseFloat(res.toFixed(8));
        }
      });
    };
  });

  // ════════════════════════════════════════════════════════════
  // 2. TEMPERATURE CONVERTER LOGIC
  // ════════════════════════════════════════════════════════════
  const tempC = document.getElementById('conv-temp-c');
  const tempF = document.getElementById('conv-temp-f');
  const tempK = document.getElementById('conv-temp-k');

  if (tempC && tempF && tempK) {
    tempC.oninput = () => {
      const c = parseFloat(tempC.value);
      if (isNaN(c)) { tempF.value = ''; tempK.value = ''; return; }
      tempF.value = parseFloat(((c * 9/5) + 32).toFixed(4));
      tempK.value = parseFloat((c + 273.15).toFixed(4));
    };

    tempF.oninput = () => {
      const f = parseFloat(tempF.value);
      if (isNaN(f)) { tempC.value = ''; tempK.value = ''; return; }
      const c = (f - 32) * 5/9;
      tempC.value = parseFloat(c.toFixed(4));
      tempK.value = parseFloat((c + 273.15).toFixed(4));
    };

    tempK.oninput = () => {
      const k = parseFloat(tempK.value);
      if (isNaN(k)) { tempC.value = ''; tempF.value = ''; return; }
      const c = k - 273.15;
      tempC.value = parseFloat(c.toFixed(4));
      tempF.value = parseFloat(((c * 9/5) + 32).toFixed(4));
    };
  }

  // ════════════════════════════════════════════════════════════
  // 3. LENGTH CONVERTER LOGIC
  // ════════════════════════════════════════════════════════════
  const lenKm = document.getElementById('conv-len-km');
  const lenM = document.getElementById('conv-len-m');
  const lenDm = document.getElementById('conv-len-dm');
  const lenCm = document.getElementById('conv-len-cm');
  const lenMm = document.getElementById('conv-len-mm');
  const lenInch = document.getElementById('conv-len-inch');
  const lenFt = document.getElementById('conv-len-ft');
  const lenYd = document.getElementById('conv-len-yd');
  const lenMi = document.getElementById('conv-len-mi');

  const lenUnits = [
    { el: lenKm, toMeter: 1000 },
    { el: lenM, toMeter: 1 },
    { el: lenDm, toMeter: 0.1 },
    { el: lenCm, toMeter: 0.01 },
    { el: lenMm, toMeter: 0.001 },
    { el: lenInch, toMeter: 0.0254 },
    { el: lenFt, toMeter: 0.3048 },
    { el: lenYd, toMeter: 0.9144 },
    { el: lenMi, toMeter: 1609.344 }
  ];

  lenUnits.forEach(unit => {
    if (!unit.el) return;
    unit.el.oninput = () => {
      const val = parseFloat(unit.el.value);
      if (isNaN(val)) {
        lenUnits.forEach(u => { if (u.el && u.el !== unit.el) u.el.value = ''; });
        return;
      }
      const meters = val * unit.toMeter;
      lenUnits.forEach(u => {
        if (u.el && u.el !== unit.el) {
          const res = meters / u.toMeter;
          u.el.value = parseFloat(res.toFixed(8));
        }
      });
    };
  });

  // ════════════════════════════════════════════════════════════
  // 4. MASS CONVERTER LOGIC
  // ════════════════════════════════════════════════════════════
  const massTon = document.getElementById('conv-mass-ton');
  const massKg = document.getElementById('conv-mass-kg');
  const massG = document.getElementById('conv-mass-g');
  const massMg = document.getElementById('conv-mass-mili');
  const massLb = document.getElementById('conv-mass-lb');
  const massOz = document.getElementById('conv-mass-oz');

  const massUnits = [
    { el: massTon, toKg: 1000 },
    { el: massKg, toKg: 1 },
    { el: massG, toKg: 0.001 },
    { el: massMg, toKg: 0.000001 },
    { el: massLb, toKg: 0.45359237 },
    { el: massOz, toKg: 0.028349523125 }
  ];

  massUnits.forEach(unit => {
    if (!unit.el) return;
    unit.el.oninput = () => {
      const val = parseFloat(unit.el.value);
      if (isNaN(val)) {
        massUnits.forEach(u => { if (u.el && u.el !== unit.el) u.el.value = ''; });
        return;
      }
      const kgs = val * unit.toKg;
      massUnits.forEach(u => {
        if (u.el && u.el !== unit.el) {
          const res = kgs / u.toKg;
          u.el.value = parseFloat(res.toFixed(8));
        }
      });
    };
  });

  // ════════════════════════════════════════════════════════════
  // 5. VOLUME CONVERTER LOGIC
  // ════════════════════════════════════════════════════════════
  const volL = document.getElementById('conv-vol-l');
  const volMl = document.getElementById('conv-vol-ml');
  const volM3 = document.getElementById('conv-vol-m3');
  const volGal = document.getElementById('conv-vol-gallon');
  const volFloz = document.getElementById('conv-vol-floz');

  const volUnits = [
    { el: volL, toLitre: 1 },
    { el: volMl, toLitre: 0.001 },
    { el: volM3, toLitre: 1000 },
    { el: volGal, toLitre: 3.785411784 },
    { el: volFloz, toLitre: 0.0295735295625 }
  ];

  volUnits.forEach(unit => {
    if (!unit.el) return;
    unit.el.oninput = () => {
      const val = parseFloat(unit.el.value);
      if (isNaN(val)) {
        volUnits.forEach(u => { if (u.el && u.el !== unit.el) u.el.value = ''; });
        return;
      }
      const litres = val * unit.toLitre;
      volUnits.forEach(u => {
        if (u.el && u.el !== unit.el) {
          const res = litres / u.toLitre;
          u.el.value = parseFloat(res.toFixed(8));
        }
      });
    };
  });

  // ════════════════════════════════════════════════════════════
  // 6. AREA CONVERTER LOGIC
  // ════════════════════════════════════════════════════════════
  const areaKm2 = document.getElementById('conv-area-km2');
  const areaHa = document.getElementById('conv-area-ha');
  const areaM2 = document.getElementById('conv-area-m2');
  const areaAcre = document.getElementById('conv-area-acre');
  const areaFt2 = document.getElementById('conv-area-ft2');

  const areaUnits = [
    { el: areaKm2, toM2: 1000000 },
    { el: areaHa, toM2: 10000 },
    { el: areaM2, toM2: 1 },
    { el: areaAcre, toM2: 4046.8564224 },
    { el: areaFt2, toM2: 0.09290304 }
  ];

  areaUnits.forEach(unit => {
    if (!unit.el) return;
    unit.el.oninput = () => {
      const val = parseFloat(unit.el.value);
      if (isNaN(val)) {
        areaUnits.forEach(u => { if (u.el && u.el !== unit.el) u.el.value = ''; });
        return;
      }
      const sqMeters = val * unit.toM2;
      areaUnits.forEach(u => {
        if (u.el && u.el !== unit.el) {
          const res = sqMeters / u.toM2;
          u.el.value = parseFloat(res.toFixed(8));
        }
      });
    };
  });

  // ════════════════════════════════════════════════════════════
  // 7. SPEED CONVERTER LOGIC
  // ════════════════════════════════════════════════════════════
  const speedMs = document.getElementById('conv-speed-ms');
  const speedKmh = document.getElementById('conv-speed-kmh');
  const speedMph = document.getElementById('conv-speed-mph');
  const speedKnot = document.getElementById('conv-speed-knot');

  const speedUnits = [
    { el: speedMs, toMs: 1 },
    { el: speedKmh, toMs: 0.277777778 },
    { el: speedMph, toMs: 0.44704 },
    { el: speedKnot, toMs: 0.514444444 }
  ];

  speedUnits.forEach(unit => {
    if (!unit.el) return;
    unit.el.oninput = () => {
      const val = parseFloat(unit.el.value);
      if (isNaN(val)) {
        speedUnits.forEach(u => { if (u.el && u.el !== unit.el) u.el.value = ''; });
        return;
      }
      const ms = val * unit.toMs;
      speedUnits.forEach(u => {
        if (u.el && u.el !== unit.el) {
          const res = ms / u.toMs;
          u.el.value = parseFloat(res.toFixed(6));
        }
      });
    };
  });

  // ════════════════════════════════════════════════════════════
  // 8. TIMEZONE CONVERTER LOGIC
  // ════════════════════════════════════════════════════════════
  const tzBaseInput = document.getElementById('conv-tz-base');
  const tzNowBtn = document.getElementById('conv-tz-now');
  const tzListWrap = document.getElementById('conv-tz-list');

  const targetZones = [
    { name: '🇻🇳 Việt Nam (ICT)', offset: 7, desc: 'Giờ Đông Dương (GMT+7)' },
    { name: '🇬🇧 Vương Quốc Anh (GMT/BST)', offset: 0, desc: 'London / Giờ chuẩn Greenwich (GMT+0)' },
    { name: '🇺🇸 Mỹ - New York (EST/EDT)', offset: -5, desc: 'Giờ miền Đông nước Mỹ (GMT-5)' },
    { name: '🇺🇸 Mỹ - San Francisco (PST/PDT)', offset: -8, desc: 'Giờ Thái Bình Dương (GMT-8)' },
    { name: '🇯🇵 Nhật Bản & Hàn Quốc (JST/KST)', offset: 9, desc: 'Giờ chuẩn Nhật Bản (GMT+9)' },
    { name: '🇸🇬 Singapore & Trung Quốc (SGT/CST)', offset: 8, desc: 'Giờ Singapore / Bắc Kinh (GMT+8)' },
    { name: '🇪🇺 Châu Âu - Paris/Berlin (CET/CEST)', offset: 1, desc: 'Giờ Trung Âu (GMT+1)' }
  ];

  if (tzBaseInput && tzNowBtn && tzListWrap) {
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const localDatetimeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    tzBaseInput.value = localDatetimeStr;

    function updateTimezones() {
      const baseVal = tzBaseInput.value;
      if (!baseVal) {
        tzListWrap.innerHTML = '<div class="tz-error">⚠️ Vui lòng chọn một mốc thời gian gốc.</div>';
        return;
      }

      const baseDate = new Date(baseVal);
      const systemOffsetHrs = -baseDate.getTimezoneOffset() / 60;

      tzListWrap.innerHTML = '';
      targetZones.forEach(zone => {
        const diffHrs = zone.offset - systemOffsetHrs;
        const destDate = new Date(baseDate.getTime() + diffHrs * 60 * 60 * 1000);

        const timeStr = destDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const dateStr = destDate.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        let dateClass = 'tz-date-same';
        let dateLabel = 'Cùng ngày';
        
        const baseDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
        const destDay = new Date(destDate.getFullYear(), destDate.getMonth(), destDate.getDate());
        const dayDiff = (destDay - baseDay) / (24 * 60 * 60 * 1000);

        if (dayDiff > 0) {
          dateClass = 'tz-date-ahead';
          dateLabel = `+${Math.round(dayDiff)} ngày`;
        } else if (dayDiff < 0) {
          dateClass = 'tz-date-behind';
          dateLabel = `${Math.round(dayDiff)} ngày`;
        }

        const zoneCard = document.createElement('div');
        zoneCard.className = 'tz-card';
        zoneCard.innerHTML = `
          <div class="tz-card-info">
            <div class="tz-card-name">${zone.name}</div>
            <div class="tz-card-desc">${zone.desc}</div>
          </div>
          <div class="tz-card-time-wrap">
            <div class="tz-card-time">${timeStr}</div>
            <div class="tz-card-date-lbl ${dateClass}">${dateLabel} (${dateStr})</div>
          </div>
        `;
        tzListWrap.appendChild(zoneCard);
      });
    }

    tzBaseInput.onchange = updateTimezones;
    tzBaseInput.oninput = updateTimezones;

    tzNowBtn.onclick = () => {
      const cur = new Date();
      tzBaseInput.value = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${cur.getDate()}T${pad(cur.getHours())}:${pad(cur.getMinutes())}`;
      updateTimezones();
    };

    updateTimezones();
  }
}
