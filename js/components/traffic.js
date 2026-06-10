/**
 * components/traffic.js
 * Traffic violation lookup UI renderer.
 * Directly embeds phatnguoi.vn in an iframe to solve CORS and CAPTCHA.
 */

/**
 * Bootstrap the traffic card — attach event listeners and embed initial iframe.
 */
export function initTrafficCard() {
  const btn   = document.getElementById('trafficSearchBtn');
  const input = document.getElementById('trafficPlateInput');
  if (!btn || !input) return;

  btn.addEventListener('click', handleTrafficSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') handleTrafficSearch(); });

  // Embed the default phatnguoi.vn homepage on load
  renderTrafficIframe('');
}

function handleTrafficSearch() {
  const plate = document.getElementById('trafficPlateInput')?.value?.trim();

  if (!plate) {
    // Reset to phatnguoi.vn homepage if empty
    renderTrafficIframe('');
    return;
  }

  // Basic check for plate format to assist user
  if (!/^[A-Z0-9\-\.]+$/i.test(plate.replace(/\s/g, ''))) {
    alert('⚠️ Biển số không hợp lệ. Ví dụ: 51F-123.45 hoặc 51F12345');
    return;
  }

  renderTrafficIframe(plate);
}

function renderTrafficIframe(plate) {
  const el = document.getElementById('trafficResult');
  if (!el) return;

  const encoded = encodeURIComponent(plate.replace(/[\s]/g, '').toUpperCase());
  const embedUrl = plate ? `https://phatnguoi.vn/?bsx=${encoded}` : 'https://phatnguoi.vn/';

  el.innerHTML = `
    <div class="traffic-embed-info">
      <div>
        🌐 Đang hiển thị trang nhúng <strong>PhatNguoi.vn</strong>. Bạn có thể tra cứu trực tiếp dưới đây.
      </div>
      <div class="traffic-embed-links">
        <a class="traffic-embed-link" href="${embedUrl}" target="_blank" rel="noopener">
          Mở trang web ↗️
        </a>
        <span style="color:var(--text-muted);">|</span>
        <a class="traffic-embed-link official" href="https://csgt.bocongan.gov.vn/tra-cuu-phat-nguoi" target="_blank" rel="noopener">
          Cổng CSGT (yêu cầu VNeID) ↗️
        </a>
      </div>
    </div>
    <div class="iframe-container">
      <iframe id="trafficIframe" src="${embedUrl}" style="width:100%;height:100%;border:none;" sandbox="allow-scripts allow-forms allow-same-origin allow-popups"></iframe>
    </div>
  `;
}
