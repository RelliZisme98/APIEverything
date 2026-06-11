/**
 * components/tax-calc.js — Tính thuế Thu nhập cá nhân (TNCN) Việt Nam
 * Theo Luật thuế TNCN 2024 (áp dụng từ 2024–nay)
 */

export function renderTaxCalc(containerId = 'taxCalcContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="tax-hero">
      <div class="tax-hero-icon">🧮</div>
      <div>
        <div class="tax-hero-title">Tính Thuế TNCN (Cá nhân cư trú)</div>
        <div class="tax-hero-sub">Theo Luật thuế TNCN Việt Nam · Biểu thuế lũy tiến từng phần</div>
      </div>
    </div>

    <div class="tax-form">
      <div class="tax-row">
        <label class="tax-label">Lương gross (nghìn đồng/tháng) <span class="tax-req">*</span></label>
        <input type="number" id="taxGross" class="tax-input" placeholder="vd: 25000" min="0" step="100"
               oninput="window.calcTax()">
      </div>
      <div class="tax-row-2">
        <div>
          <label class="tax-label">Số người phụ thuộc</label>
          <input type="number" id="taxDep" class="tax-input" value="0" min="0" max="10"
                 oninput="window.calcTax()">
        </div>
        <div>
          <label class="tax-label">Thu nhập khác (nghìn đ/tháng)</label>
          <input type="number" id="taxExtra" class="tax-input" value="0" min="0" step="100"
                 oninput="window.calcTax()">
        </div>
      </div>
      <div class="tax-row">
        <label class="tax-label">Đóng BHXH, BHYT, BHTN</label>
        <div class="tax-toggle-group">
          <button class="tax-toggle active" id="taxBhxhYes" onclick="window.taxSetBhxh(true)">✅ Có (8%+1.5%+1% lương)</button>
          <button class="tax-toggle" id="taxBhxhNo"  onclick="window.taxSetBhxh(false)">❌ Không</button>
        </div>
      </div>
    </div>

    <div id="taxResult" style="margin-top:16px;"></div>

    <div class="tax-brackets">
      <div class="tax-brackets-title">📊 Biểu thuế lũy tiến từng phần (thu nhập tính thuế/tháng)</div>
      <table class="tax-table">
        <thead><tr><th>Phần thu nhập</th><th>Thuế suất</th><th>Thuế tối đa bậc</th></tr></thead>
        <tbody>
          <tr><td>≤ 5 triệu</td><td style="color:#4ade80;">5%</td><td>250.000đ</td></tr>
          <tr><td>5 – 10 triệu</td><td style="color:#a3e635;">10%</td><td>500.000đ</td></tr>
          <tr><td>10 – 18 triệu</td><td style="color:#fbbf24;">15%</td><td>1.200.000đ</td></tr>
          <tr><td>18 – 32 triệu</td><td style="color:#fb923c;">20%</td><td>2.800.000đ</td></tr>
          <tr><td>32 – 52 triệu</td><td style="color:#f87171;">25%</td><td>5.000.000đ</td></tr>
          <tr><td>52 – 80 triệu</td><td style="color:#e879f9;">30%</td><td>8.400.000đ</td></tr>
          <tr><td>> 80 triệu</td><td style="color:#c084fc;">35%</td><td>—</td></tr>
        </tbody>
      </table>
      <div class="tax-note">
        📌 Giảm trừ bản thân: <strong>11 triệu/tháng</strong> &nbsp;·&nbsp;
        Giảm trừ người phụ thuộc: <strong>4,4 triệu/người/tháng</strong>
      </div>
    </div>`;

  window._taxBhxh = true;
  window.taxSetBhxh = (on) => {
    window._taxBhxh = on;
    document.getElementById('taxBhxhYes').classList.toggle('active', on);
    document.getElementById('taxBhxhNo').classList.toggle('active', !on);
    window.calcTax();
  };

  window.calcTax = () => {
    const grossK  = parseFloat(document.getElementById('taxGross').value) || 0;
    const dep     = parseInt(document.getElementById('taxDep').value) || 0;
    const extraK  = parseFloat(document.getElementById('taxExtra').value) || 0;
    const hasBhxh = window._taxBhxh;
    const res     = document.getElementById('taxResult');

    if (grossK <= 0) { res.innerHTML = ''; return; }

    const gross = grossK * 1000;
    const extra = extraK * 1000;
    const total = gross + extra;

    // Insurance (BHXH 8%, BHYT 1.5%, BHTN 1% of gross, capped at 36.4M for BHXH)
    const bhxhBase = Math.min(gross, 36400000);
    const bhxh  = hasBhxh ? Math.round(bhxhBase * 0.08) : 0;
    const bhyt  = hasBhxh ? Math.round(Math.min(gross, 36400000) * 0.015) : 0;
    const bhtn  = hasBhxh ? Math.round(Math.min(gross, 20000000) * 0.01) : 0;
    const totalIns = bhxh + bhyt + bhtn;

    // Deductions
    const personal  = 11000000;
    const dependent = dep * 4400000;
    const totalDeduct = personal + dependent + totalIns;

    // Taxable income
    const taxable = Math.max(0, total - totalDeduct);

    // Tax brackets (on taxable monthly income)
    const brackets = [
      [5000000,  0.05],
      [5000000,  0.10],
      [8000000,  0.15],
      [14000000, 0.20],
      [20000000, 0.25],
      [28000000, 0.30],
      [Infinity, 0.35],
    ];
    let tax = 0, remaining = taxable;
    const breakdown = [];
    for (const [limit, rate] of brackets) {
      if (remaining <= 0) break;
      const chunk = Math.min(remaining, limit);
      const t = Math.round(chunk * rate);
      if (chunk > 0) breakdown.push({ rate: rate*100, amount: chunk, tax: t });
      tax += t;
      remaining -= chunk;
    }

    const net = total - totalIns - tax;
    const effectiveRate = total > 0 ? (tax / total * 100).toFixed(1) : 0;

    const fmt = n => n.toLocaleString('vi-VN') + 'đ';

    const bdRows = breakdown.map(b =>
      `<tr><td>${b.rate}%</td><td>${fmt(b.amount)}</td><td>${fmt(b.tax)}</td></tr>`
    ).join('');

    res.innerHTML = `
      <div class="tax-result-grid">
        <div class="tax-result-card" style="border-color:rgba(251,191,36,0.3);">
          <div class="tax-result-label">Thu nhập gross</div>
          <div class="tax-result-val">${fmt(total)}</div>
        </div>
        <div class="tax-result-card" style="border-color:rgba(248,113,113,0.3);">
          <div class="tax-result-label">Bảo hiểm (BHXH+BHYT+BHTN)</div>
          <div class="tax-result-val" style="color:#f87171;">${fmt(totalIns)}</div>
          ${hasBhxh ? `<div style="font-size:10px;color:var(--text-muted);">BHXH ${fmt(bhxh)} · BHYT ${fmt(bhyt)} · BHTN ${fmt(bhtn)}</div>` : ''}
        </div>
        <div class="tax-result-card" style="border-color:rgba(96,165,250,0.3);">
          <div class="tax-result-label">Giảm trừ cá nhân & phụ thuộc</div>
          <div class="tax-result-val" style="color:#60a5fa;">${fmt(totalDeduct)}</div>
          <div style="font-size:10px;color:var(--text-muted);">Bản thân: ${fmt(personal)} · PT: ${fmt(dependent)}</div>
        </div>
        <div class="tax-result-card" style="border-color:rgba(251,146,60,0.3);">
          <div class="tax-result-label">Thuế TNCN phải nộp (Biểu lũy tiến)</div>
          <div class="tax-result-val" style="color:#fb923c;">${fmt(tax)}</div>
          <div style="font-size:10px;color:var(--text-muted);">Thu nhập tính thuế: ${fmt(taxable)} · Thuế suất hiệu quả: ${effectiveRate}%</div>
        </div>
        <div class="tax-result-card tax-result-net" style="border-color:rgba(52,211,153,0.4);">
          <div class="tax-result-label">💰 Lương NET thực nhận</div>
          <div class="tax-result-val" style="color:#34d399;font-size:28px;">${fmt(net)}</div>
        </div>
      </div>
      ${breakdown.length ? `
      <details style="margin-top:12px;">
        <summary style="cursor:pointer;font-size:12px;color:var(--text-muted);">📊 Chi tiết tính thuế lũy tiến</summary>
        <table class="tax-table" style="margin-top:8px;">
          <thead><tr><th>Bậc</th><th>Thu nhập tính thuế</th><th>Thuế</th></tr></thead>
          <tbody>${bdRows}</tbody>
          <tfoot><tr style="font-weight:700;"><td>Tổng</td><td>${fmt(taxable)}</td><td>${fmt(tax)}</td></tr></tfoot>
        </table>
      </details>` : ''}`;
  };
}
