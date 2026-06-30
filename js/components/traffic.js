/**
 * components/traffic.js
 * Traffic violation lookup UI renderer.
 * Directly embeds phatnguoi.vn in an iframe to solve CORS and CAPTCHA.
 */

/**
 * Bootstrap the traffic card — embed phatnguoi.vn homepage.
 */
export function initTrafficCard() {
  renderTrafficIframe('');
}

function renderTrafficIframe(plate) {
  const el = document.getElementById('trafficResult');
  if (!el) return;

  const encoded = encodeURIComponent(plate.replace(/[\s]/g, '').toUpperCase());
  const embedUrl = plate ? `https://phatnguoi.vn/?bsx=${encoded}` : 'https://phatnguoi.vn/';

  el.innerHTML = `
    <div class="traffic-embed-info">
      <div>
 Đang hiển thị trang nhúng <strong>PhatNguoi.vn</strong>. Bạn có thể tra cứu trực tiếp dưới đây.
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
