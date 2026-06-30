/**
 * components/qrcode.js
 * Artistic QR Code Styling Generator & URL Shortener component.
 * Integrates with qr-code-styling via CDN.
 */

import { state } from '../store/state.js';

let qrCodeInstance = null;
let currentLogoBase64 = '';

export function renderQRCodeSuite(containerId = 'qrcodeContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Check if qr-code-styling is loaded
  if (typeof window.QRCodeStyling === 'undefined') {
    // Load dynamically if not already loaded
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qr-code-styling@1.5.0/lib/qr-code-styling.js';
    script.onload = () => {
      buildUI(container);
    };
    script.onerror = () => {
 container.innerHTML = `<div class="error-msg">️ Lỗi: Không thể tải thư viện QR Code Styling từ CDN.</div>`;
    };
    document.head.appendChild(script);
  } else {
    buildUI(container);
  }
}

function buildUI(container) {
  container.innerHTML = `
    <div class="qr-suite-wrap">
      <!-- Tabs -->
      <div class="vl-tab-bar" style="margin-bottom: 20px;">
 <button class="vl-tab active" id="qrTab-generator" onclick="window.switchQRTab('generator')">Tạo QR Nghệ Thuật</button>
 <button class="vl-tab" id="qrTab-shortener" onclick="window.switchQRTab('shortener')">Rút Gọn Link</button>
      </div>

      <!-- TAB 1: GENERATOR -->
      <div id="qrSec-generator" class="qr-secactive">
        <div class="qr-grid">
          <!-- Control Panel -->
          <div class="qr-panel-controls">
            <div class="tax-row">
              <label class="tax-label">Nội dung QR (Link hoặc văn bản)</label>
              <input type="text" id="qrInputData" class="tax-input" placeholder="https://example.com" value="https://everything-staging.rellia.org" />
            </div>

            <!-- Styles & Gradients -->
            <div class="qr-custom-accordion">
              <div class="qr-accordion-sec">
 <div class="qr-accordion-title">Màu sắc & Gradient</div>
                <div class="qr-accordion-body">
                  <div class="tax-row-2">
                    <div>
                      <label class="tax-label">Màu sắc chấm QR (Dots)</label>
                      <input type="color" id="qrColorDots1" class="tax-input" style="padding: 2px 8px; height: 38px;" value="#3b82f6" />
                    </div>
                    <div>
                      <label class="tax-label">Màu nền QR</label>
                      <input type="color" id="qrColorBg" class="tax-input" style="padding: 2px 8px; height: 38px;" value="#ffffff" />
                    </div>
                  </div>

                  <div class="tax-row">
                    <label class="tax-label" style="display: flex; align-items: center; gap: 8px;">
                      <input type="checkbox" id="qrUseGradient" /> Bật Gradient cho chấm QR
                    </label>
                  </div>

                  <div class="tax-row-2" id="qrGradientColors" style="display: none;">
                    <div>
                      <label class="tax-label">Màu kết thúc Gradient</label>
                      <input type="color" id="qrColorDots2" class="tax-input" style="padding: 2px 8px; height: 38px;" value="#8b5cf6" />
                    </div>
                    <div>
                      <label class="tax-label">Góc xoay Gradient</label>
                      <select id="qrGradientRotation" class="tax-input">
                        <option value="0">0° (Trái -> Phải)</option>
                        <option value="45">45° (Chéo)</option>
                        <option value="90">90° (Trên -> Dưới)</option>
                        <option value="135">135° (Chéo ngược)</option>
                      </select>
                    </div>
                  </div>

                  <div class="tax-row">
                    <label class="tax-label" style="display: flex; align-items: center; gap: 8px;">
                      <input type="checkbox" id="qrBgTransparent" /> Nền trong suốt (Transparent)
                    </label>
                  </div>
                </div>
              </div>

              <div class="qr-accordion-sec">
 <div class="qr-accordion-title">Kiểu dáng các chấm (Shapes)</div>
                <div class="qr-accordion-body">
                  <div class="tax-row-2">
                    <div>
                      <label class="tax-label">Hình dáng chấm (Dots Type)</label>
                      <select id="qrStyleDots" class="tax-input">
                        <option value="rounded">Bo tròn mềm (Rounded)</option>
                        <option value="extra-rounded" selected>Cực tròn (Extra Rounded)</option>
                        <option value="dots">Dạng chấm tròn rời (Dots)</option>
                        <option value="classy">Nghệ thuật (Classy)</option>
                        <option value="classy-rounded">Nghệ thuật bo tròn (Classy Rounded)</option>
                        <option value="square">Hình vuông truyền thống (Square)</option>
                      </select>
                    </div>
                    <div>
                      <label class="tax-label">Hình dáng góc (Corner Squares)</label>
                      <select id="qrStyleCorners" class="tax-input">
                        <option value="extra-rounded" selected>Bo tròn góc (Extra Rounded)</option>
                        <option value="dot">Tròn đơn giản (Dot)</option>
                        <option value="square">Hình vuông (Square)</option>
                      </select>
                    </div>
                  </div>
                  <div class="tax-row-2">
                    <div>
                      <label class="tax-label">Hình dáng tâm góc (Corner Dots)</label>
                      <select id="qrStyleCornerDots" class="tax-input">
                        <option value="dot" selected>Chấm tròn (Dot)</option>
                        <option value="square">Chấm vuông (Square)</option>
                      </select>
                    </div>
                    <div>
                      <label class="tax-label">Màu riêng cho 3 góc lớn (Tùy chọn)</label>
                      <div style="display: flex; gap: 6px; align-items: center;">
                        <input type="checkbox" id="qrUseCornerColor" />
                        <input type="color" id="qrColorCorners" class="tax-input" style="padding: 2px 8px; height: 38px; flex: 1;" value="#1e3a8a" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="qr-accordion-sec">
 <div class="qr-accordion-title">️ Logo ở giữa (Center Brand)</div>
                <div class="qr-accordion-body">
                  <div class="tax-row">
                    <label class="tax-label">Tải lên Logo của bạn (PNG / JPG / SVG)</label>
                    <input type="file" id="qrLogoFile" class="tax-input" accept="image/*" />
                  </div>
                  <div class="tax-row">
                    <label class="tax-label">Hoặc chọn Logo phổ biến sẵn có</label>
                    <div class="qr-logo-presets">
                      <button class="qr-preset-btn" data-logo="none">Không có</button>
 <button class="qr-preset-btn" data-logo="facebook">FB</button>
 <button class="qr-preset-btn" data-logo="youtube">YT</button>
 <button class="qr-preset-btn" data-logo="instagram">IG</button>
 <button class="qr-preset-btn" data-logo="tiktok">TikTok</button>
 <button class="qr-preset-btn" data-logo="wifi">WiFi</button>
                    </div>
                  </div>
                  <div class="tax-row-2">
                    <div>
                      <label class="tax-label">Tỷ lệ kích thước logo (%)</label>
                      <input type="number" id="qrLogoSize" class="tax-input" value="20" min="10" max="40" />
                    </div>
                    <div>
                      <label class="tax-label">Khoảng đệm quanh logo</label>
                      <input type="number" id="qrLogoMargin" class="tax-input" value="4" min="0" max="15" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

 <button type="button" class="btn-primary" id="btnUpdateQR" style="width: 100%; margin-top: 14px;">Cập nhật QR Code</button>
          </div>

          <!-- Preview & Download Panel -->
          <div class="qr-panel-preview">
            <div id="qrCanvasContainer"></div>
            <div class="qr-download-actions" style="margin-top: 20px; display: flex; gap: 10px; width: 100%;">
 <button type="button" class="btn-primary" id="btnDownloadPNG" style="flex: 1; background: #2563eb;">Tải file PNG</button>
 <button type="button" class="btn-primary" id="btnDownloadSVG" style="flex: 1; background: #10b981;">Vector (SVG)</button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: SHORTENER -->
      <div id="qrSec-shortener" class="qr-secactive" style="display: none;">
        <div class="tax-form" style="max-width: 600px; margin: 0 auto;">
          <div class="tax-row">
            <label class="tax-label">Nhập link cần rút gọn (Long URL) <span class="tax-req">*</span></label>
            <input type="url" id="shortenInputUrl" class="tax-input" placeholder="https://example.com/some/very/long/path/name/here" required />
          </div>
          
 <button type="button" class="btn-primary" id="btnShortenLink" style="width: 100%; padding: 12px;">Rút Gọn Link</button>

          <!-- Result -->
          <div id="shortenResult" style="display: none; margin-top: 18px; padding: 14px; background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: 8px;">
            <label class="tax-label" style="color: #34d399;">Kết quả rút gọn thành công:</label>
            <div style="display: flex; gap: 8px; margin-top: 6px;">
              <input type="text" id="shortenOutputUrl" class="tax-input" style="flex: 1; background: rgba(0,0,0,0.2); font-weight: 700; color: #fff;" readonly />
              <button type="button" class="btn-primary" id="btnCopyShort" style="background: #10b981; padding: 8px 16px;">Copy</button>
            </div>
            <div style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 8px;">
 <button type="button" class="btn-primary" id="btnSendToQR" style="padding: 6px 12px; font-size: 11px; background: #3b82f6;">Tạo QR cho Link này</button>
            </div>
          </div>
        </div>

        <!-- History -->
        <div class="qr-history-section" style="margin-top: 24px;">
 <div class="hl-section-label">Lịch sử rút gọn link của bạn</div>
          <div style="overflow-x: auto;">
            <table class="br-table" id="shortHistoryTable" style="width: 100%; min-width: 500px;">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Link gốc</th>
                  <th>Link rút gọn</th>
                  <th style="text-align: right;">Hành động</th>
                </tr>
              </thead>
              <tbody id="shortHistoryBody">
                <!-- Filled dynamically -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers
  setupTabControls();
  setupQRGenerator();
  setupShortener();
}

function setupTabControls() {
  window.switchQRTab = function (tabName) {
    document.querySelectorAll('.qr-suite-wrap .vl-tab').forEach(btn => {
      btn.classList.toggle('active', btn.id === `qrTab-${tabName}`);
    });
    
    const secGenerator = document.getElementById('qrSec-generator');
    const secShortener = document.getElementById('qrSec-shortener');
    
    if (tabName === 'generator') {
      secGenerator.style.display = 'block';
      secShortener.style.display = 'none';
      updateQRCode();
    } else {
      secGenerator.style.display = 'none';
      secShortener.style.display = 'block';
      renderShortenHistory();
    }
  };
}

function setupQRGenerator() {
  const btnUpdate = document.getElementById('btnUpdateQR');
  const btnDownloadPNG = document.getElementById('btnDownloadPNG');
  const btnDownloadSVG = document.getElementById('btnDownloadSVG');
  const qrUseGradient = document.getElementById('qrUseGradient');
  const qrBgTransparent = document.getElementById('qrBgTransparent');
  const qrUseCornerColor = document.getElementById('qrUseCornerColor');
  const qrLogoFile = document.getElementById('qrLogoFile');

  // Gradient toggler
  qrUseGradient.addEventListener('change', () => {
    document.getElementById('qrGradientColors').style.display = qrUseGradient.checked ? 'grid' : 'none';
  });

  // Background transparency
  qrBgTransparent.addEventListener('change', () => {
    document.getElementById('qrColorBg').disabled = qrBgTransparent.checked;
  });

  // Logo file picker
  qrLogoFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        currentLogoBase64 = event.target.result;
        // deselect preset active class
        document.querySelectorAll('.qr-preset-btn').forEach(btn => btn.classList.remove('active'));
        updateQRCode();
      };
      reader.readAsDataURL(file);
    }
  });

  // Logo Presets
  const presets = {
    facebook: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg',
    youtube: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg',
    instagram: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg',
    tiktok: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Ionicons_logo-tiktok.svg',
    wifi: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232563eb"><path d="M12 21a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM4.8 13.8a10.1 10.1 0 0 1 14.4 0m-11.5-3a14.2 14.2 0 0 1 8.6 0m-14.4-3a18.3 18.3 0 0 1 20.2 0"/></svg>'
  };

  document.querySelectorAll('.qr-preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.qr-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const logoKey = btn.dataset.logo;
      if (logoKey === 'none') {
        currentLogoBase64 = '';
      } else if (presets[logoKey]) {
        currentLogoBase64 = presets[logoKey];
      }
      updateQRCode();
    });
  });

  btnUpdate.addEventListener('click', () => {
    updateQRCode();
  });

  btnDownloadPNG.addEventListener('click', () => {
    if (qrCodeInstance) {
      qrCodeInstance.download({ name: 'qr-code-artistic', extension: 'png' });
    }
  });

  btnDownloadSVG.addEventListener('click', () => {
    if (qrCodeInstance) {
      qrCodeInstance.download({ name: 'qr-code-artistic', extension: 'svg' });
    }
  });

  // Initial draw
  updateQRCode();
}

function updateQRCode() {
  const container = document.getElementById('qrCanvasContainer');
  if (!container) return;

  container.innerHTML = '';

  const dataStr = document.getElementById('qrInputData').value.trim() || 'https://everything-staging.rellia.org';
  const colorBg = document.getElementById('qrColorBg').value;
  const isBgTransparent = document.getElementById('qrBgTransparent').checked;
  const colorDots1 = document.getElementById('qrColorDots1').value;
  const useGradient = document.getElementById('qrUseGradient').checked;
  const colorDots2 = document.getElementById('qrColorDots2').value;
  const gradientRot = parseInt(document.getElementById('qrGradientRotation').value);

  const dotsType = document.getElementById('qrStyleDots').value;
  const cornersType = document.getElementById('qrStyleCorners').value;
  const cornerDotsType = document.getElementById('qrStyleCornerDots').value;

  const useCornerColor = document.getElementById('qrUseCornerColor').checked;
  const colorCorners = document.getElementById('qrColorCorners').value;

  const logoSize = parseFloat(document.getElementById('qrLogoSize').value) / 100;
  const logoMargin = parseInt(document.getElementById('qrLogoMargin').value);

  // Setup options
  const options = {
    width: 280,
    height: 280,
    type: 'svg',
    data: dataStr,
    margin: 8,
    qrOptions: {
      typeNumber: 0,
      mode: 'Byte',
      errorCorrectionLevel: 'Q'
    },
    backgroundOptions: {
      color: isBgTransparent ? 'transparent' : colorBg,
    },
    dotsOptions: {
      type: dotsType,
    },
    cornersSquareOptions: {
      type: cornersType,
    },
    cornersDotOptions: {
      type: cornerDotsType,
    }
  };

  // Set dots gradient or single color
  if (useGradient) {
    options.dotsOptions.gradient = {
      type: 'linear',
      rotation: (gradientRot * Math.PI) / 180,
      colorStops: [
        { offset: 0, color: colorDots1 },
        { offset: 1, color: colorDots2 }
      ]
    };
  } else {
    options.dotsOptions.color = colorDots1;
  }

  // Set individual corner color
  if (useCornerColor) {
    options.cornersSquareOptions.color = colorCorners;
    options.cornersDotOptions.color = colorCorners;
  } else {
    delete options.cornersSquareOptions.color;
    delete options.cornersDotOptions.color;
  }

  // Set Logo
  if (currentLogoBase64) {
    options.image = currentLogoBase64;
    options.imageOptions = {
      crossOrigin: 'anonymous',
      hideBackgroundDots: true,
      imageSize: logoSize,
      margin: logoMargin
    };
  }

  // Render
  qrCodeInstance = new window.QRCodeStyling(options);
  qrCodeInstance.append(container);
}

function setupShortener() {
  const btnShorten = document.getElementById('btnShortenLink');
  const btnCopy = document.getElementById('btnCopyShort');
  const btnSendToQR = document.getElementById('btnSendToQR');

  btnShorten.addEventListener('click', async () => {
    const inputUrl = document.getElementById('shortenInputUrl').value.trim();
    if (!inputUrl) return;

    btnShorten.disabled = true;
    btnShorten.textContent = '⏳ Đang rút gọn...';

    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl })
      });

      if (!res.ok) {
        throw new Error('Không rút gọn được, vui lòng thử lại.');
      }

      const data = await res.json();
      if (data && data.shorturl) {
        // Show result
        document.getElementById('shortenResult').style.display = 'block';
        document.getElementById('shortenOutputUrl').value = data.shorturl;

        // Save to History
        saveShortHistory(inputUrl, data.shorturl);
        renderShortenHistory();
      } else {
        throw new Error('Phản hồi không hợp lệ từ máy chủ.');
      }
    } catch (err) {
 alert(`️ Lỗi: ${err.message}`);
    } finally {
      btnShorten.disabled = false;
 btnShorten.textContent = 'Rút Gọn Link';
    }
  });

  btnCopy.addEventListener('click', () => {
    const copyText = document.getElementById('shortenOutputUrl');
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value);
    
    btnCopy.textContent = 'Đã Copy!';
    btnCopy.style.background = '#059669';
    setTimeout(() => {
      btnCopy.textContent = 'Copy';
      btnCopy.style.background = '#10b981';
    }, 2000);
  });

  btnSendToQR.addEventListener('click', () => {
    const shortUrl = document.getElementById('shortenOutputUrl').value;
    if (shortUrl) {
      document.getElementById('qrInputData').value = shortUrl;
      window.switchQRTab('generator');
    }
  });
}

function saveShortHistory(longUrl, shortUrl) {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('qr_short_history') || '[]');
  } catch (e) {
    history = [];
  }

  history.unshift({
    timestamp: new Date().toISOString(),
    longUrl,
    shortUrl
  });

  // Limit to 20 items
  if (history.length > 20) {
    history = history.slice(0, 20);
  }

  localStorage.setItem('qr_short_history', JSON.stringify(history));
}

function renderShortenHistory() {
  const tbody = document.getElementById('shortHistoryBody');
  if (!tbody) return;

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('qr_short_history') || '[]');
  } catch (e) {
    history = [];
  }

  if (history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Chưa có link nào được rút gọn.</td></tr>`;
    return;
  }

  window.deleteShortenHistory = function (index) {
    let hist = JSON.parse(localStorage.getItem('qr_short_history') || '[]');
    hist.splice(index, 1);
    localStorage.setItem('qr_short_history', JSON.stringify(hist));
    renderShortenHistory();
  };

  window.loadUrlToQR = function (url) {
    document.getElementById('qrInputData').value = url;
    window.switchQRTab('generator');
  };

  tbody.innerHTML = history.map((item, idx) => {
    const date = new Date(item.timestamp).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
    const domainLong = item.longUrl.replace(/https?:\/\/(www\.)?/, '').substring(0, 30) + (item.longUrl.length > 30 ? '...' : '');

    return `
      <tr>
        <td style="color: var(--text-muted);">${date}</td>
        <td>
          <a href="${item.longUrl}" target="_blank" rel="noopener" style="color: #94a3b8; text-decoration: none;" title="${item.longUrl}">
            ${domainLong}
          </a>
        </td>
        <td>
          <a href="${item.shortUrl}" target="_blank" rel="noopener" style="color: var(--accent-blue); font-weight: 700; font-family: 'JetBrains Mono', monospace;">
            ${item.shortUrl}
          </a>
        </td>
        <td style="text-align: right; white-space: nowrap;">
 <button type="button" class="btn-primary" onclick="window.loadUrlToQR('${item.shortUrl}')" style="padding: 4px 8px; font-size: 10px; background: #2563eb; margin-right: 6px;">QR</button>
 <button type="button" class="btn-primary" onclick="window.deleteShortenHistory(${idx})" style="padding: 4px 8px; font-size: 10px; background: #ef4444;"></button>
        </td>
      </tr>
    `;
  }).join('');
}
