/**
 * components/converter.js
 * Universal Unit Converter component
 * Supports: Data, Temperature, Length, Mass, Volume, Area, Speed.
 * Timezone Converter → world-clock.js
 * BMI Calculator     → standalone bmi section
 */

let activeCategory = 'data'; // 'data', 'temp', 'length', 'mass', 'volume', 'area', 'speed'

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
}

// ════════════════════════════════════════════════════════════
// STANDALONE: TIMEZONE CONVERTER (used in world-clock section)
// ════════════════════════════════════════════════════════════
export function renderTimezoneConverter(containerId = 'tzConverterContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const targetZones = [
    { name: '\ud83c\uddfb\ud83c\uddf3 Vi\u1ec7t Nam (ICT)', offset: 7, desc: 'Gi\u1edd \u0110\u00f4ng D\u01b0\u01a1ng (GMT+7)' },
    { name: '\ud83c\uddec\ud83c\udde7 V\u01b0\u01a1ng Qu\u1ed1c Anh (GMT/BST)', offset: 0, desc: 'London / Gi\u1edd chu\u1ea9n Greenwich (GMT+0)' },
    { name: '\ud83c\uddfa\ud83c\uddf8 M\u1ef9 - New York (EST/EDT)', offset: -5, desc: 'Gi\u1edd mi\u1ec1n \u0110\u00f4ng n\u01b0\u1edbc M\u1ef9 (GMT-5)' },
    { name: '\ud83c\uddfa\ud83c\uddf8 M\u1ef9 - San Francisco (PST/PDT)', offset: -8, desc: 'Gi\u1edd Th\u00e1i B\u00ecnh D\u01b0\u01a1ng (GMT-8)' },
    { name: '\ud83c\uddef\ud83c\uddf5 Nh\u1eadt B\u1ea3n & H\u00e0n Qu\u1ed1c (JST/KST)', offset: 9, desc: 'Gi\u1edd chu\u1ea9n Nh\u1eadt B\u1ea3n (GMT+9)' },
    { name: '\ud83c\uddf8\ud83c\uddec Singapore & Trung Qu\u1ed1c (SGT/CST)', offset: 8, desc: 'Gi\u1edd Singapore / B\u1eafc Kinh (GMT+8)' },
    { name: '\ud83c\uddea\ud83c\uddfa Ch\u00e2u \u00c2u - Paris/Berlin (CET/CEST)', offset: 1, desc: 'Gi\u1edd Trung \u00c2u (GMT+1)' },
    { name: '\ud83c\udde6\ud83c\uddea UAE - Dubai (GST)', offset: 4, desc: 'Gi\u1edd Vùng V\u1ecbnh (GMT+4)' },
    { name: '\ud83c\udde6\ud83c\uddfa \u00dac - Sydney (AEST)', offset: 10, desc: 'Gi\u1edd \u00dac ph\u00eda \u0110\u00f4ng (GMT+10)' },
  ];

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const localStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  container.innerHTML = `
    <div class="tz-section-wrap">
      <div class="tz-header">
        <div class="tz-input-wrap">
          <label class="conv-label">\u23f0 Ch\u1ecdn th\u1eddi gian g\u1ed1c \u0111\u1ec3 quy \u0111\u1ed5i:</label>
          <input type="datetime-local" class="conv-input tz-base-input" id="wc-tz-base" value="${localStr}" />
        </div>
        <button class="btn-primary tz-now-btn" id="wc-tz-now">\u23f1 Hi\u1ec7n T\u1ea1i</button>
      </div>
      <div class="tz-results-list" id="wc-tz-list"></div>
      <div class="conv-tip">\ud83d\udca1 Ch\u1ec9 t\u00ednh to\u00e1n d\u1ef1a tr\u00ean offset UTC c\u1ed1 \u0111\u1ecbnh, ch\u01b0a t\u00ednh Daylight Saving Time (DST) theo m\u00f9a.</div>
    </div>
  `;

  const tzBaseInput = document.getElementById('wc-tz-base');
  const tzNowBtn = document.getElementById('wc-tz-now');
  const tzListWrap = document.getElementById('wc-tz-list');

  function updateTimezones() {
    const baseVal = tzBaseInput.value;
    if (!baseVal) { tzListWrap.innerHTML = '<div class="tz-error">\u26a0\ufe0f Vui l\u00f2ng ch\u1ecdn m\u1ed9c th\u1eddi gian g\u1ed1c.</div>'; return; }
    const baseDate = new Date(baseVal);
    const systemOffsetHrs = -baseDate.getTimezoneOffset() / 60;
    tzListWrap.innerHTML = '';
    targetZones.forEach(zone => {
      const diffHrs = zone.offset - systemOffsetHrs;
      const destDate = new Date(baseDate.getTime() + diffHrs * 3600000);
      const timeStr = destDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const dateStr = destDate.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const baseDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
      const destDay = new Date(destDate.getFullYear(), destDate.getMonth(), destDate.getDate());
      const dayDiff = Math.round((destDay - baseDay) / 86400000);
      const dateClass = dayDiff > 0 ? 'tz-date-ahead' : dayDiff < 0 ? 'tz-date-behind' : 'tz-date-same';
      const dateLabel = dayDiff > 0 ? `+${dayDiff} ng\u00e0y` : dayDiff < 0 ? `${dayDiff} ng\u00e0y` : 'C\u00f9ng ng\u00e0y';
      const card = document.createElement('div');
      card.className = 'tz-card';
      card.innerHTML = `
        <div class="tz-card-info">
          <div class="tz-card-name">${zone.name}</div>
          <div class="tz-card-desc">${zone.desc}</div>
        </div>
        <div class="tz-card-time-wrap">
          <div class="tz-card-time">${timeStr}</div>
          <div class="tz-card-date-lbl ${dateClass}">${dateLabel} (${dateStr})</div>
        </div>
      `;
      tzListWrap.appendChild(card);
    });
  }

  tzBaseInput.oninput = updateTimezones;
  tzBaseInput.onchange = updateTimezones;
  tzNowBtn.onclick = () => {
    const cur = new Date();
    tzBaseInput.value = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}T${pad(cur.getHours())}:${pad(cur.getMinutes())}`;
    updateTimezones();
  };
  updateTimezones();
}

// ════════════════════════════════════════════════════════════
// STANDALONE: BMI CALCULATOR (used in its own sidebar section)
// ════════════════════════════════════════════════════════════
export function renderBMICalculator(containerId = 'bmiContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="bmi-container">
      <div class="bmi-card">
        <h3 style="margin:0;font-size:16px;color:var(--text-primary)">\ud83d\udcca Nh\u1eadp Ch\u1ec9 S\u1ed1 C\u01a1 Th\u1ec3</h3>
        <div class="conv-field">
          <label class="conv-label">Gi\u1edbi t\u00ednh</label>
          <div class="bmi-gender-toggle">
            <button class="bmi-gender-btn active" id="bmi-gen-male" data-gender="male">\ud83d\ude4b\u200d\u2642\ufe0f Nam</button>
            <button class="bmi-gender-btn" id="bmi-gen-female" data-gender="female">\ud83d\ude4b\u200d\u2640\ufe0f N\u1eef</button>
          </div>
        </div>
        <div class="conv-field">
          <label class="conv-label">Chi\u1ec1u cao (cm)</label>
          <input type="number" class="conv-input" id="bmi-height" placeholder="V\u00ed d\u1ee5: 170" min="50" max="300" />
        </div>
        <div class="conv-field">
          <label class="conv-label">C\u00e2n n\u1eb7ng (kg)</label>
          <input type="number" class="conv-input" id="bmi-weight" placeholder="V\u00ed d\u1ee5: 65" min="10" max="500" />
        </div>
      </div>
      <div class="bmi-card" style="align-items:center;justify-content:center;">
        <div class="bmi-results-wrap" id="bmi-results-placeholder">
          <span style="font-size:40px">\u2696\ufe0f</span>
          <p style="color:var(--text-muted);font-size:14px;margin:0;text-align:center">Vui l\u00f2ng nh\u1eadp chi\u1ec1u cao v\u00e0 c\u00e2n n\u1eb7ng \u0111\u1ec3 xem k\u1ebft qu\u1ea3 BMI.</p>
        </div>
        <div class="bmi-results-wrap" id="bmi-results-data" style="display:none;width:100%">
          <div class="bmi-circle-container">
            <div class="bmi-circle" id="bmi-circle-glow">
              <span class="bmi-circle-val" id="bmi-val-text">--</span>
              <span class="bmi-circle-lbl">Ch\u1ec9 s\u1ed1 BMI</span>
            </div>
          </div>
          <div class="bmi-status-text" id="bmi-status-lbl"></div>
          <div class="bmi-ideal-text" id="bmi-ideal-lbl"></div>
          <div style="width:100%;margin-top:10px">
            <div class="bmi-scale-bar">
              <div class="bmi-scale-indicator" id="bmi-indicator" style="left:50%"></div>
            </div>
            <div class="bmi-bracket-labels" style="margin-top:8px">
              <span>G\u1ea7y</span><span>Th\u01b0\u1eddng</span><span>Th\u1eeba c\u00e2n</span><span>B\u00e9o ph\u00ec</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="conv-tip" style="margin-top:16px">
      \ud83d\udca1 Ch\u1ec9 s\u1ed1 BMI \u00e1p d\u1ee5ng theo chu\u1ea9n WHO Western Pacific Region d\u00e0nh cho ng\u01b0\u1eddi Ch\u00e2u \u00c1.
    </div>
  `;

  const bmiHeight = document.getElementById('bmi-height');
  const bmiWeight = document.getElementById('bmi-weight');
  const bmiMaleBtn = document.getElementById('bmi-gen-male');
  const bmiFemaleBtn = document.getElementById('bmi-gen-female');
  const bmiPlaceholder = document.getElementById('bmi-results-placeholder');
  const bmiResultsData = document.getElementById('bmi-results-data');
  const bmiValText = document.getElementById('bmi-val-text');
  const bmiStatusLbl = document.getElementById('bmi-status-lbl');
  const bmiIdealLbl = document.getElementById('bmi-ideal-lbl');
  const bmiIndicator = document.getElementById('bmi-indicator');
  const bmiCircleGlow = document.getElementById('bmi-circle-glow');
  let currentGender = 'male';

  bmiMaleBtn.onclick = () => { currentGender = 'male'; bmiMaleBtn.classList.add('active'); bmiFemaleBtn.classList.remove('active'); calc(); };
  bmiFemaleBtn.onclick = () => { currentGender = 'female'; bmiFemaleBtn.classList.add('active'); bmiMaleBtn.classList.remove('active'); calc(); };
  bmiHeight.oninput = calc;
  bmiWeight.oninput = calc;

  function calc() {
    const h = parseFloat(bmiHeight.value);
    const w = parseFloat(bmiWeight.value);
    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) {
      bmiPlaceholder.style.display = 'flex';
      bmiResultsData.style.display = 'none';
      return;
    }
    bmiPlaceholder.style.display = 'none';
    bmiResultsData.style.display = 'flex';
    const hm = h / 100;
    const bmi = w / (hm * hm);
    bmiValText.textContent = bmi.toFixed(1);
    let status, color, pct;
    if (bmi < 18.5)       { status = 'Thi\u1ebfu c\u00e2n (G\u1ea7y) \ud83d\udd35'; color = '#60a5fa'; pct = Math.max(5, Math.min(24, ((bmi-10)/8.5)*20+5)); }
    else if (bmi < 23.0)  { status = 'B\u00ecnh th\u01b0\u1eddng (C\u00e2n \u0111\u1ed1i) \ud83d\udfe2'; color = '#34d399'; pct = ((bmi-18.5)/4.4)*30+25; }
    else if (bmi < 25.0)  { status = 'Th\u1eeba c\u00e2n (Ti\u1ec1n b\u00e9o ph\u00ec) \ud83d\udfe1'; color = '#fbbf24'; pct = ((bmi-23.0)/1.9)*15+55; }
    else if (bmi < 30.0)  { status = 'B\u00e9o ph\u00ec \u0111\u1ed9 I \ud83d�'; color = '#f97316'; pct = ((bmi-25.0)/4.9)*15+70; }
    else                  { status = 'B\u00e9o ph\u00ec \u0111\u1ed9 II \ud83d\udd34'; color = '#ef4444'; pct = Math.min(95, ((bmi-30.0)/10)*10+85); }
    bmiStatusLbl.textContent = status;
    bmiStatusLbl.style.color = color;
    bmiCircleGlow.style.borderColor = color;
    bmiCircleGlow.style.boxShadow = `0 0 15px ${color}`;
    bmiIndicator.style.left = `${pct}%`;
    const minI = (18.5 * hm * hm).toFixed(1);
    const maxI = (22.9 * hm * hm).toFixed(1);
    let tip = `C\u00e2n n\u1eb7ng l\u00fd t\u01b0\u1edfng: <strong>${minI} \u2013 ${maxI} kg</strong>.`;
    if (bmi >= 23)       tip += `<br><span style="font-size:11px;color:var(--text-muted)">N\u00ean gi\u1ea3m kho\u1ea3ng <strong>${(w - parseFloat(maxI)).toFixed(1)} kg</strong>.</span>`;
    else if (bmi < 18.5) tip += `<br><span style="font-size:11px;color:var(--text-muted)">N\u00ean t\u0103ng kho\u1ea3ng <strong>${(parseFloat(minI) - w).toFixed(1)} kg</strong>.</span>`;
    else                 tip += `<br><span style="font-size:11px;color:var(--accent-green)">Tuy\u1ec7t v\u1eddi, duy tr\u00ec c\u00e2n n\u1eb7ng n\u00e0y!</span>`;
    bmiIdealLbl.innerHTML = tip;
  }
}
