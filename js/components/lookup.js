/* ── Public Lookups Component ── */

const POSTAL_CODES = {
  "han": { name: "Hà Nội", code: "10000" },
  "sgn": { name: "TP. Hồ Chí Minh", code: "70000" },
  "dad": { name: "Đà Nẵng", code: "50000" },
  "hph": { name: "Hải Phòng", code: "18000" },
  "vca": { name: "Cần Thơ", code: "90000" },
  "bdg": { name: "Bình Dương", code: "75000" },
  "dnh": { name: "Đồng Nai", code: "76000" },
  "qnh": { name: "Quảng Ninh", code: "20000" },
  "kha": { name: "Khánh Hòa (Nha Trang)", code: "65000" },
  "ldg": { name: "Lâm Đồng (Đà Lạt)", code: "66000" },
  "vtg": { name: "Bà Rịa - Vũng Tàu", code: "78000" },
  "lan": { name: "Long An", code: "82000" },
  "tgg": { name: "Tiền Giang", code: "84000" },
  "bte": { name: "Bến Tre", code: "86000" },
  "tvh": { name: "Trà Vinh", code: "87000" },
  "vlg": { name: "Vĩnh Long", code: "89000" },
  "dth": { name: "Đồng Tháp", code: "81000" },
  "agg": { name: "An Giang", code: "88000" },
  "kgg": { name: "Kiên Giang", code: "92000" },
  "cmu": { name: "Cà Mau", code: "97000" },
  "tnh": { name: "Tây Ninh", code: "73000" },
  "bpc": { name: "Bình Phước", code: "77000" },
  "nth": { name: "Ninh Thuận", code: "59000" },
  "bth": { name: "Bình Thuận", code: "80000" },
  "dlk": { name: "Đắk Lắk", code: "63000" },
  "dno": { name: "Đắk Nông", code: "64000" },
  "gla": { name: "Gia Lai", code: "60000" },
  "ktu": { name: "Kon Tum", code: "61000" },
  "pye": { name: "Phú Yên", code: "62000" },
  "bdh": { name: "Bình Định", code: "55000" },
  "qng": { name: "Quảng Ngãi", code: "57000" },
  "qna": { name: "Quảng Nam", code: "56000" },
  "tth": { name: "Thừa Thiên Huế", code: "53000" },
  "qtr": { name: "Quảng Trị", code: "52000" },
  "qbi": { name: "Quảng Bình", code: "51000" },
  "hti": { name: "Hà Tĩnh", code: "48000" },
  "nan": { name: "Nghệ An", code: "46000" },
  "tho": { name: "Thanh Hóa", code: "44000" },
  "nbi": { name: "Ninh Bình", code: "43000" },
  "ndi": { name: "Nam Định", code: "42000" },
  "hna": { name: "Hà Nam", code: "41000" },
  "tbi": { name: "Thái Bình", code: "40000" },
  "hdu": { name: "Hải Dương", code: "17000" },
  "hye": { name: "Hưng Yên", code: "16000" },
  "bni": { name: "Bắc Ninh", code: "22000" },
  "bgi": { name: "Bắc Giang", code: "23000" },
  "lso": { name: "Lạng Sơn", code: "24000" },
  "cba": { name: "Cao Bằng", code: "27000" },
  "hgi": { name: "Hà Giang", code: "31000" },
  "tqu": { name: "Tuyên Quang", code: "30000" },
  "tng": { name: "Thái Nguyên", code: "25000" },
  "pth": { name: "Phú Thọ", code: "29000" },
  "vph": { name: "Vĩnh Phúc", code: "26000" },
  "yba": { name: "Yên Bái", code: "32000" },
  "lca": { name: "Lào Cai", code: "33000" },
  "dbi": { name: "Điện Biên", code: "38000" },
  "lch": { name: "Lai Châu", code: "39000" },
  "sla": { name: "Sơn La", code: "36000" },
  "hbi": { name: "Hòa Bình", code: "35000" },
  "bli": { name: "Bạc Liêu", code: "96000" },
  "str": { name: "Sóc Trăng", code: "95000" },
  "hgg": { name: "Hậu Giang", code: "91000" },
  "bka": { name: "Bắc Kạn", code: "26000" }
};

export function renderLookup() {
  const container = document.getElementById('lookupContent');
  if (!container) return;

  container.innerHTML = `
    <div class="lk-wrap">
      <!-- Tabs -->
      <div class="lk-tabs">
        <button class="lk-tab-btn active" data-pane="spam">🛡️ Kiểm tra SĐT &amp; Email</button>
        <button class="lk-tab-btn" data-pane="tax">🏢 Tra cứu Mã số thuế</button>
        <button class="lk-tab-btn" data-pane="postal">📮 Mã bưu điện (ZIP)</button>
        <button class="lk-tab-btn" data-pane="gov">🏛️ Dịch vụ công Việt Nam</button>
      </div>

      <!-- PANE 1: SPAM CHECK -->
      <div class="lk-pane active" id="pane-spam">
        <div class="travel-title-sub">🛡️ Kiểm tra độ an toàn của Số điện thoại &amp; Email</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
          Phát hiện số điện thoại quảng cáo rác, lừa đảo, nhà mạng hoặc email bị lộ trong các vụ rò rỉ dữ liệu lớn.
        </div>
        <div class="lk-search-box">
          <input type="text" id="spamInput" class="field-input" placeholder="Nhập SĐT (09x...) hoặc Email của bạn..." />
          <button id="btnCheckSpam" class="btn-primary">Kiểm tra</button>
        </div>
        <div id="spamResult"></div>
      </div>

      <!-- PANE 2: TAX ID -->
      <div class="lk-pane" id="pane-tax">
        <div class="travel-title-sub">🏢 Tra cứu Mã số thuế doanh nghiệp &amp; cá nhân</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
          Tra cứu nhanh thông tin đại diện pháp luật, tên đăng ký, địa chỉ và trạng thái của doanh nghiệp bằng Mã số thuế hoặc Tên doanh nghiệp/Từ khóa.
        </div>
        <div class="lk-search-box">
          <input type="text" id="taxInput" class="field-input" placeholder="Nhập mã số thuế hoặc tên doanh nghiệp cần tra cứu..." />
          <button id="btnCheckTax" class="btn-primary">Tra cứu</button>
        </div>
        <div id="taxLookupResult"></div>
      </div>

      <!-- PANE 3: POSTAL CODE -->
      <div class="lk-pane" id="pane-postal">
        <div class="travel-title-sub">📮 Tra cứu Mã bưu chính 63 Tỉnh thành Việt Nam</div>
        <div class="postal-select-wrap">
          <label for="postalSelect">Chọn Tỉnh / Thành phố</label>
          <select id="postalSelect" class="field-input">
            <option value="" disabled selected>-- Chọn Tỉnh/Thành --</option>
            ${Object.entries(POSTAL_CODES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}
          </select>
        </div>
        <div id="postalResult"></div>
      </div>

      <!-- PANE 4: GOV SERVICES -->
      <div class="lk-pane" id="pane-gov">
        <div class="travel-title-sub">🏛️ Tra Cứu Dịch Vụ Công Trực Tuyến</div>

        <!-- Gov sub-tabs -->
        <div class="lk-gov-tabs">
          <button class="lk-gov-tab active" data-gov="gplx">🚗 GPLX</button>
          <button class="lk-gov-tab" data-gov="bhxh">🏥 BHXH / BHYT</button>
          <button class="lk-gov-tab" data-gov="tax">💰 Thuế TNCN</button>
          <button class="lk-gov-tab" data-gov="cccd">💳 CCCD / Cư trú</button>
        </div>

        <!-- GPLX -->
        <div class="lk-gov-pane active" id="gov-gplx">
          <div class="lk-gov-info-bar" style="border-color:rgba(96,165,250,0.3);background:rgba(96,165,250,0.06);">
            <span>🚗</span>
            <div>
              <div style="font-weight:700;color:var(--accent-blue);">Kiểm tra Giấy Phép Lái Xe</div>
              <div style="font-size:11px;color:var(--text-muted);">Tra cứu hạng lái xe, ngày cấp, ngày hết hạn và vi phạm GPLX qua Cổng thông tin chính thức.</div>
            </div>
          </div>
          <div class="lk-search-box" style="margin-top:12px;">
            <input type="text" id="gplxInput" class="field-input" placeholder="Nhập số CCCD/CMND hoặc số GPLX..." maxlength="20"/>
            <button id="btnCheckGPLX" class="btn-primary">Tra cứu</button>
          </div>
          <div id="gplxResult" style="margin-top:10px;"></div>
          <div class="lk-gov-direct" style="margin-top:14px;">
            <span style="font-size:11px;color:var(--text-muted);">Hoặc tra cứu trực tiếp tại cổng chính thức:</span>
            <a href="https://gplx.gov.vn/" target="_blank" rel="noopener" class="lot-link" style="font-size:11px;padding:4px 12px;">gplx.gov.vn ↗</a>
          </div>
        </div>

        <!-- BHXH -->
        <div class="lk-gov-pane" id="gov-bhxh">
          <div class="lk-gov-info-bar" style="border-color:rgba(52,211,153,0.3);background:rgba(52,211,153,0.06);">
            <span>🏥</span>
            <div>
              <div style="font-weight:700;color:var(--accent-green);">Bảo Hiểm Xã Hội & Y Tế</div>
              <div style="font-size:11px;color:var(--text-muted);">Tra cứu quá trình đóng BHXH, thẻ BHYT và mức hưởng.</div>
            </div>
          </div>
          <div class="lk-search-box" style="margin-top:12px;">
            <input type="text" id="bhxhInput" class="field-input" placeholder="Nhập số CCCD/CMND hoặc mã số BHXH..." maxlength="16"/>
            <button id="btnCheckBHXH" class="btn-primary">Tra cứu</button>
          </div>
          <div id="bhxhResult" style="margin-top:10px;"></div>
          <div class="lk-gov-links-grid" style="margin-top:14px;">
            <a href="https://baohiemxahoi.gov.vn/tracuu/Pages/tra-cuu-thong-tin-dong-bao-hiem.aspx" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(52,211,153,0.3);background:rgba(52,211,153,0.06);">
              <span>📋</span><div><div style="font-weight:700;font-size:12px;">Quá trình đóng BHXH</div><div style="font-size:10px;color:var(--text-muted);">baohiemxahoi.gov.vn</div></div>
            </a>
            <a href="https://baohiemxahoi.gov.vn/tracuu/Pages/tra-cuu-thong-tin-the-bhyt.aspx" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(52,211,153,0.3);background:rgba(52,211,153,0.06);">
              <span>💊</span><div><div style="font-weight:700;font-size:12px;">Thẻ BHYT</div><div style="font-size:10px;color:var(--text-muted);">Hạn sử dụng, nơi đăng ký KCB</div></div>
            </a>
            <a href="https://ssid.baohiemxahoi.gov.vn/" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(52,211,153,0.3);background:rgba(52,211,153,0.06);">
              <span>📱</span><div><div style="font-weight:700;font-size:12px;">VssID – App BHXH</div><div style="font-size:10px;color:var(--text-muted);">Ứng dụng BHXH Việt Nam</div></div>
            </a>
          </div>
        </div>

        <!-- Thuế TNCN -->
        <div class="lk-gov-pane" id="gov-tax">
          <div class="lk-gov-info-bar" style="border-color:rgba(251,191,36,0.3);background:rgba(251,191,36,0.06);">
            <span>💰</span>
            <div>
              <div style="font-weight:700;color:var(--accent-yellow);">Thuế Thu Nhập Cá Nhân</div>
              <div style="font-size:11px;color:var(--text-muted);">Tra cứu MST cá nhân, khai báo thuế và hoàn thuế TNCN.</div>
            </div>
          </div>
          <div class="lk-search-box" style="margin-top:12px;">
            <input type="text" id="taxPersonInput" class="field-input" placeholder="Nhập số CCCD/CMND để tra MST cá nhân..." maxlength="16"/>
            <button id="btnCheckTaxPerson" class="btn-primary">Tra cứu MST</button>
          </div>
          <div id="taxPersonResult" style="margin-top:10px;"></div>
          <div class="lk-gov-links-grid" style="margin-top:14px;">
            <a href="https://canhan.gdt.gov.vn/" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(251,191,36,0.3);background:rgba(251,191,36,0.06);">
              <span>🧾</span><div><div style="font-weight:700;font-size:12px;">Khai Báo Thuế TNCN</div><div style="font-size:10px;color:var(--text-muted);">canhan.gdt.gov.vn</div></div>
            </a>
            <a href="https://tracuunnt.gdt.gov.vn/tcnnt/mstcn.jsp" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(251,191,36,0.3);background:rgba(251,191,36,0.06);">
              <span>🔍</span><div><div style="font-weight:700;font-size:12px;">Tra Cứu MST Cá Nhân</div><div style="font-size:10px;color:var(--text-muted);">Tổng Cục Thuế</div></div>
            </a>
            <a href="https://thuedientu.gdt.gov.vn/" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(251,191,36,0.3);background:rgba(251,191,36,0.06);">
              <span>💳</span><div><div style="font-weight:700;font-size:12px;">Hoàn Thuế Online</div><div style="font-size:10px;color:var(--text-muted);">thuedientu.gdt.gov.vn</div></div>
            </a>
          </div>
        </div>

        <!-- CCCD / Cư trú -->
        <div class="lk-gov-pane" id="gov-cccd">
          <div class="lk-gov-info-bar" style="border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.06);">
            <span>💳</span>
            <div>
              <div style="font-weight:700;color:var(--accent-purple);">CCCD & Đăng Ký Cư Trú</div>
              <div style="font-size:11px;color:var(--text-muted);">Tra cứu thông tin CCCD, tạm trú/tạm vắng và thủ tục hộ chiếu.</div>
            </div>
          </div>
          <div class="lk-gov-links-grid" style="margin-top:12px;">
            <a href="https://dichvucong.bocongan.gov.vn/dctt/index.html#/home" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.06);">
              <span>💳</span><div><div style="font-weight:700;font-size:12px;">Cổng DVC Bộ Công An</div><div style="font-size:10px;color:var(--text-muted);">Đăng ký CCCD, hộ chiếu</div></div>
            </a>
            <a href="https://dichvucong.bocongan.gov.vn/dctt/index.html#/dich-vu-cong/tam-tru" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.06);">
              <span>🏠</span><div><div style="font-weight:700;font-size:12px;">Đăng Ký Tạm Trú</div><div style="font-size:10px;color:var(--text-muted);">Online – không cần đến phường</div></div>
            </a>
            <a href="https://tracuudancu.bocongan.gov.vn/" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.06);">
              <span>🔍</span><div><div style="font-weight:700;font-size:12px;">Tra Cứu Dân Cư</div><div style="font-size:10px;color:var(--text-muted);">tracuudancu.bocongan.gov.vn</div></div>
            </a>
            <a href="https://www.vneid.vn/" target="_blank" rel="noopener" class="lk-gov-link-card" style="border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.06);">
              <span>📱</span><div><div style="font-weight:700;font-size:12px;">VNeID – Ứng dụng</div><div style="font-size:10px;color:var(--text-muted);">Định danh điện tử quốc gia</div></div>
            </a>
          </div>
          <div style="margin-top:14px;padding:12px;background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:10px;font-size:11px;color:var(--text-muted);line-height:1.6;">
            💡 <strong style="color:var(--text-secondary);">Lưu ý:</strong> Tra cứu CCCD yêu cầu đăng nhập tài khoản VNeID hoặc VnConnect. Tính năng tra cứu trực tiếp không khả dụng do chính sách bảo mật dữ liệu cá nhân của Bộ Công An.
          </div>
        </div>
      </div>
    </div>
  `;

  // Tabs toggle logic
  const tabs = container.querySelectorAll('.lk-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.lk-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const paneId = `pane-${tab.dataset.pane}`;
      document.getElementById(paneId).classList.add('active');
    });
  });

  // Gov sub-tabs
  container.querySelectorAll('.lk-gov-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.lk-gov-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.lk-gov-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`gov-${tab.dataset.gov}`)?.classList.add('active');
    });
  });

  // Bind lookup actions
  document.getElementById('btnCheckSpam').addEventListener('click', handleSpamCheck);
  document.getElementById('btnCheckTax').addEventListener('click', handleTaxCheck);
  document.getElementById('postalSelect').addEventListener('change', handlePostalChange);

  // GPLX lookup
  document.getElementById('btnCheckGPLX')?.addEventListener('click', () => {
    const q = document.getElementById('gplxInput').value.trim();
    const el = document.getElementById('gplxResult');
    if (!q) { el.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Vui lòng nhập số CCCD hoặc số GPLX.</div>`; return; }
    el.innerHTML = `<div class="lk-result-box" style="padding:14px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">🚗 Tra cứu GPLX: <span style="color:var(--accent-blue);">${q}</span></div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Cổng GPLX chính thức yêu cầu xác thực OTP qua điện thoại. Vui lòng truy cập trực tiếp:</div>
      <a href="https://gplx.gov.vn/tracuu?cccd=${encodeURIComponent(q)}" target="_blank" rel="noopener" class="btn-primary" style="display:inline-block;text-decoration:none;padding:8px 18px;border-radius:8px;">
        🔗 Tra cứu tại gplx.gov.vn ↗
      </a>
    </div>`;
  });

  // BHXH lookup
  document.getElementById('btnCheckBHXH')?.addEventListener('click', () => {
    const q = document.getElementById('bhxhInput').value.trim();
    const el = document.getElementById('bhxhResult');
    if (!q) { el.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Vui lòng nhập số CCCD hoặc mã BHXH.</div>`; return; }
    el.innerHTML = `<div class="lk-result-box" style="padding:14px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">🏥 Tra cứu BHXH: <span style="color:var(--accent-green);">${q}</span></div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Tra cứu BHXH yêu cầu xác thực OTP. Nhấn nút để truy cập cổng BHXH chính thức:</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="https://baohiemxahoi.gov.vn/tracuu/Pages/tra-cuu-thong-tin-dong-bao-hiem.aspx" target="_blank" rel="noopener" class="btn-primary" style="display:inline-block;text-decoration:none;padding:6px 14px;border-radius:8px;font-size:12px;">
          📋 Quá trình đóng BHXH ↗
        </a>
        <a href="https://baohiemxahoi.gov.vn/tracuu/Pages/tra-cuu-thong-tin-the-bhyt.aspx" target="_blank" rel="noopener" class="btn-primary" style="display:inline-block;text-decoration:none;padding:6px 14px;border-radius:8px;font-size:12px;">
          💊 Thẻ BHYT ↗
        </a>
      </div>
    </div>`;
  });

  // Tax person lookup → forward to GDT
  document.getElementById('btnCheckTaxPerson')?.addEventListener('click', () => {
    const q = document.getElementById('taxPersonInput').value.trim();
    const el = document.getElementById('taxPersonResult');
    if (!q) { el.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Vui lòng nhập số CCCD/CMND.</div>`; return; }
    el.innerHTML = `<div class="lk-result-box" style="padding:14px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">💰 Tra MST cá nhân: <span style="color:var(--accent-yellow);">${q}</span></div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Hệ thống GDT yêu cầu đăng nhập. Nhấn nút để truy cập trực tiếp trang tra cứu MST:</div>
      <a href="https://tracuunnt.gdt.gov.vn/tcnnt/mstcn.jsp" target="_blank" rel="noopener" class="btn-primary" style="display:inline-block;text-decoration:none;padding:8px 18px;border-radius:8px;">
        🔍 Tra cứu MST tại GDT ↗
      </a>
    </div>`;
  });

  // Allow enter key
  document.getElementById('spamInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSpamCheck();
  });
  document.getElementById('taxInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleTaxCheck();
  });
  document.getElementById('gplxInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btnCheckGPLX').click();
  });
}

function handleSpamCheck() {
  const input = document.getElementById('spamInput').value.trim();
  const resDiv = document.getElementById('spamResult');
  if (!resDiv) return;

  if (!input) {
    resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Vui lòng nhập số điện thoại hoặc email.</div>`;
    return;
  }

  resDiv.innerHTML = `<span class="status-dot dot-yellow"></span> Đang truy vấn cơ sở dữ liệu bảo mật...`;

  try {
    fetch(`/api/spam-check?q=${encodeURIComponent(input)}`)
      .then(response => {
        if (!response.ok) {
          return response.json().then(errData => {
            resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Lỗi: ${errData.error || 'Yêu cầu không hợp lệ.'}</div>`;
          });
        }
        return response.json().then(data => {
          if (data.type === 'email') {
            if (data.safe) {
              resDiv.innerHTML = `
                <div class="lk-result-box">
                  <span class="lk-status-tag lk-status--safe">✅ AN TOÀN</span>
                  <div style="font-weight:700;">Không tìm thấy dữ liệu rò rỉ!</div>
                  <div style="color: var(--text-muted); margin-top: 4px;">Địa chỉ email của bạn hiện không nằm trong cơ sở dữ liệu các vụ xâm nhập bảo mật được công bố công khai.</div>
                </div>
              `;
            } else {
              resDiv.innerHTML = `
                <div class="lk-result-box">
                  <span class="lk-status-tag lk-status--danger">⚠️ CẢNH BÁO RÒ RỈ</span>
                  <div style="font-weight: 700; font-size:14px; margin-bottom: 6px;">Email này đã bị phát hiện trong ${data.count} vụ lộ lọt dữ liệu công cộng!</div>
                  <div style="color: var(--text-muted); line-height: 1.4;">
                    - Nguồn rò rỉ tiêu biểu: <strong>${data.breaches.join(', ')}</strong><br/>
                    - Lời khuyên: Hãy thay đổi mật khẩu tài khoản liên kết với email này ngay lập tức để bảo vệ tài sản số.
                  </div>
                </div>
              `;
            }
          } else if (data.type === 'phone') {
            if (data.safe) {
              resDiv.innerHTML = `
                <div class="lk-result-box">
                  <span class="lk-status-tag lk-status--safe">✅ AN TOÀN</span>
                  <table class="lk-details-table">
                    <tr><td>Nhà mạng</td><td>${data.carrier}</td></tr>
                    <tr><td>Đánh giá</td><td style="color:#34d399;">Số thuê bao sạch</td></tr>
                    <tr><td>Số lượt báo cáo</td><td>0 báo cáo rác</td></tr>
                    <tr><td>Chi tiết</td><td>${data.details}</td></tr>
                  </table>
                </div>
              `;
            } else {
              resDiv.innerHTML = `
                <div class="lk-result-box">
                  <span class="lk-status-tag lk-status--danger">🚨 BÁO CÁO SPAM</span>
                  <table class="lk-details-table">
                    <tr><td>Nhà mạng</td><td>${data.carrier}</td></tr>
                    <tr><td>Đánh giá</td><td style="color:#f87171;">Số điện thoại quảng cáo / cuộc gọi rác</td></tr>
                    <tr><td>Số lượt báo cáo</td><td>${data.spamReports} lượt báo cáo từ cộng đồng</td></tr>
                    <tr><td>Đặc điểm cuộc gọi</td><td>${data.details}</td></tr>
                  </table>
                </div>
              `;
            }
          }
        });
      })
      .catch(err => {
        resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Lỗi kết nối dịch vụ kiểm tra bảo mật: ${err.message}</div>`;
      });
  } catch (err) {
    resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Lỗi kết nối: ${err.message}</div>`;
  }
}

async function handleTaxCheck() {
  const input = document.getElementById('taxInput').value.trim();
  const resDiv = document.getElementById('taxLookupResult');
  if (!resDiv) return;

  if (!input) {
    resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Vui lòng nhập mã số thuế hoặc tên doanh nghiệp cần tra cứu.</div>`;
    return;
  }

  resDiv.innerHTML = `<span class="status-dot dot-yellow"></span> Đang truy vấn Cổng thông tin Doanh nghiệp...`;

  try {
    const response = await fetch(`/api/tax-lookup?q=${encodeURIComponent(input)}`);
    if (!response.ok) {
      const errData = await response.json();
      resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Lỗi: ${errData.error || 'Không tìm thấy kết quả phù hợp.'}</div>`;
      return;
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      resDiv.innerHTML = `<div class="lk-result-box" style="color:#fbbf24;">⚠️ Không tìm thấy thông tin doanh nghiệp khớp với từ khóa của bạn.</div>`;
      return;
    }

    let html = `<div style="display:flex; flex-direction:column; gap:12px; max-height:450px; overflow-y:auto; padding-right:4px;">`;
    data.results.forEach(company => {
      // Display mstImg if present, else plaintext mst
      const mstHTML = company.mstImg 
        ? `<img src="${company.mstImg}" style="max-height: 18px; vertical-align: middle;" alt="MST" />`
        : company.mst;

      const detailLink = company.url 
        ? `<div style="margin-top: 10px; text-align: right;">
            <a href="${company.url}" target="_blank" class="lot-link" style="padding: 4px 12px; font-size:11px;">
              Xem chi tiết đối tác ➔
            </a>
           </div>`
        : `<div style="margin-top: 10px; text-align: right;">
            <a href="https://masothue.com/Search/?q=${encodeURIComponent(company.mst || company.name)}" target="_blank" class="lot-link" style="padding: 4px 12px; font-size:11px;">
              Xem đầy đủ trên MaSoThue.com ➔
            </a>
           </div>`;

      html += `
        <div class="lk-result-box" style="margin-bottom:0;">
          <span class="lk-status-tag lk-status--safe" style="background:rgba(96,165,250,0.15);color:var(--accent-blue);">${company.status || 'ĐANG HOẠT ĐỘNG'}</span>
          <table class="lk-details-table">
            <tr><td>Tên Doanh Nghiệp</td><td style="font-weight:700; color:var(--text-primary);">${company.name}</td></tr>
            <tr><td>Mã Số Thuế</td><td>${mstHTML}</td></tr>
            <tr><td>Đại Diện Pháp Luật</td><td>${company.representative}</td></tr>
            <tr><td>Địa Chỉ Trụ Sở</td><td>${company.address}</td></tr>
          </table>
          ${detailLink}
        </div>
      `;
    });
    html += `</div>`;
    resDiv.innerHTML = html;

  } catch (err) {
    resDiv.innerHTML = `<div class="lk-result-box" style="color:#f87171;">⚠️ Lỗi kết nối Cổng thông tin Doanh nghiệp: ${err.message}</div>`;
  }
}

function handlePostalChange() {
  const val = document.getElementById('postalSelect').value;
  const resDiv = document.getElementById('postalResult');
  if (!val || !resDiv) return;

  const data = POSTAL_CODES[val];
  resDiv.innerHTML = `
    <div class="postal-result-card">
      <div>
        <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${data.name}</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Mã bưu chính của Tỉnh / Thành phố</div>
      </div>
      <div class="postal-code-val">${data.code}</div>
    </div>
  `;
}
