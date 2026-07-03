/**
 * components/tax-calc.js — Tính thuế Thu nhập cá nhân (TNCN) & Bảo hiểm xã hội Việt Nam mới
 * Hỗ trợ Biểu thuế lũy tiến 5 bậc 2026 (Luật số 109/2025/QH15) hiệu lực từ 01/07/2026
 * Hỗ trợ phân tách lương (đóng bảo hiểm trên mức cơ bản/tùy chỉnh), phụ cấp ăn ca & giảm trừ Y tế/Giáo dục mới.
 */

// Helper to parse localized currency strings (e.g. "14,960,000" -> 14960000)
function parseMoney(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, '')) || 0;
}

// Helper to format numbers (e.g. 14960000 -> "14,960,000")
function formatMoney(num) {
  if (num == null || isNaN(num)) return '';
  return Math.round(num).toLocaleString('en-US');
}

export function renderTaxCalc(containerId = 'taxCalcContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="tax-hero">
      <div class="tax-hero-icon">🏦</div>
      <div>
        <div class="tax-hero-title">Tính Thuế TNCN & BHXH (Cập nhật 01/07/2026)</div>
        <div class="tax-hero-sub">Theo Luật thuế TNCN mới (5 bậc) & Lương cơ sở mới 2.53M/tháng</div>
      </div>
    </div>

    <!-- Method Selection Tabs -->
    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
      <button id="btnMethodGross" class="tax-toggle active" style="flex: 1; padding: 10px; font-weight: 600;" onclick="window.taxSetMethod('gross')">Tính Gross ➔ Net</button>
      <button id="btnMethodNet" class="tax-toggle" style="flex: 1; padding: 10px; font-weight: 600;" onclick="window.taxSetMethod('net')">Tính Net ➔ Gross</button>
    </div>

    <div class="tax-form">
      <!-- Main Income Input -->
      <div class="tax-row">
        <label id="lblIncomeInput" class="tax-label">Lương Gross hàng tháng (VND) <span class="tax-req">*</span></label>
        <input type="text" id="taxIncome" class="tax-input" placeholder="Nhập số tiền (ví dụ: 14,960,000)" value="14,960,000"
               oninput="window.taxFormatAndCalc(this)">
      </div>

      <!-- Insurance Basis selector -->
      <div class="tax-row">
        <label class="tax-label">Phương thức đóng Bảo hiểm (BHXH, BHYT, BHTN)</label>
        <select id="taxInsOption" class="tax-input" onchange="window.taxOnInsOptionChange()" style="cursor: pointer; background: var(--surface-3); color: var(--ink);">
          <option value="gross">Đóng trên lương thực tế (Gross trừ phụ cấp)</option>
          <option value="max">Đóng trên mức trần tối đa (50,600,000đ)</option>
          <option value="custom" selected>Đóng trên mức lương tự định nghĩa (Tách lương)</option>
        </select>
      </div>

      <!-- Custom Insurance Input -->
      <div class="tax-row" id="rowCustomIns" style="display: block;">
        <label class="tax-label">Lương đóng BHXH/BHYT/BHTN tự nhập (VND)</label>
        <input type="text" id="taxCustomIns" class="tax-input" placeholder="Nhập lương cơ bản đóng bảo hiểm (ví dụ: 5,810,000)" value="5,810,000"
               oninput="window.taxFormatAndCalc(this)">
        <span style="font-size: 10px; color: var(--text-muted); margin-top: 4px; display: block;">
          💡 Nhiều công ty tách nhỏ lương (lương cơ bản + thưởng KPI) để chỉ đóng bảo hiểm trên phần lương cơ bản này.
        </span>
      </div>

      <!-- Allowances & Exemptions -->
      <div class="tax-row-2">
        <div>
          <label class="tax-label">Phụ cấp ăn trưa / ăn ca (VND)</label>
          <input type="text" id="taxMeal" class="tax-input" placeholder="Nhập tiền ăn ca (vd: 960,000)"
                 value="960,000" oninput="window.taxFormatAndCalc(this)">
          <span style="font-size: 9px; color: var(--text-muted); display: block; margin-top: 3px;">
            Miễn thuế TNCN tối đa 730,000đ/tháng, miễn BHXH
          </span>
        </div>
        <div>
          <label class="tax-label">Phụ cấp miễn thuế khác (VND)</label>
          <input type="text" id="taxOtherExempt" class="tax-input" placeholder="Điện thoại, trang phục..."
                 oninput="window.taxFormatAndCalc(this)">
          <span style="font-size: 9px; color: var(--text-muted); display: block; margin-top: 3px;">
            Điện thoại, đồng phục, làm thêm giờ...
          </span>
        </div>
      </div>

      <!-- Dependents & Education/Medical -->
      <div class="tax-row-2">
        <div>
          <label class="tax-label">Số người phụ thuộc (NPT)</label>
          <input type="number" id="taxDep" class="tax-input" value="0" min="0" max="20"
                 oninput="window.taxCalcRun()">
        </div>
        <div>
          <label class="tax-label">Giảm trừ Y tế & Giáo dục (VND/tháng)</label>
          <input type="text" id="taxEdMed" class="tax-input" placeholder="Tối đa 3,916,667đ (47M/năm)"
                 oninput="window.taxFormatAndCalc(this)">
          <span style="font-size: 9px; color: var(--text-muted); display: block; margin-top: 3px;">
            Khoản giảm trừ mới có hóa đơn từ 01/07/2026
          </span>
        </div>
      </div>
    </div>

    <div class="tax-threshold-banner" style="margin-bottom:15px; display:flex; flex-direction:column; align-items:flex-start; gap:6px; line-height:1.5;">
      <div>ℹ️ <strong>Chính sách 2026:</strong> Giảm trừ gia cảnh bản thân tăng lên <strong>15.5 triệu/tháng</strong>, người phụ thuộc <strong>6.2 triệu/tháng</strong>. Biểu lũy tiến rút gọn từ 7 bậc còn <strong>5 bậc</strong>.</div>
      <div style="font-size:11px; color:var(--text-secondary); border-top:1px solid rgba(255,255,255,0.06); padding-top:4px; width:100%;">
        💡 <strong>Giải thích con số 28.6 triệu:</strong> Các báo đưa tin <i>"Thu nhập trên 28.6 triệu mới phải nộp thuế"</i> là tính cho trường hợp có <strong>1 người phụ thuộc</strong> (6.2M) và áp dụng tối đa khoản giảm trừ **Y tế & Giáo dục mới** (~3.9M/tháng) kèm theo đóng bảo hiểm đầy đủ.
      </div>
    </div>

    <div id="taxResult" style="margin-top:16px;"></div>

    <div class="tax-brackets">
      <div class="tax-brackets-title">Biểu thuế lũy tiến từng phần mới (Từ 01/07/2026)</div>
      <table class="tax-table">
        <thead>
          <tr>
            <th>Bậc</th>
            <th>Phần thu nhập tính thuế/tháng</th>
            <th>Thuế suất</th>
            <th>Cách tính nhanh</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>Đến 10 triệu đồng</td><td style="color:#4ade80; font-weight:700;">5%</td><td>5% x TNTT</td></tr>
          <tr><td>2</td><td>Trên 10 đến 30 triệu đồng</td><td style="color:#a3e635; font-weight:700;">10%</td><td>10% x TNTT - 500k</td></tr>
          <tr><td>3</td><td>Trên 30 đến 60 triệu đồng</td><td style="color:#fbbf24; font-weight:700;">20%</td><td>20% x TNTT - 3.5 triệu</td></tr>
          <tr><td>4</td><td>Trên 60 đến 100 triệu đồng</td><td style="color:#fb923c; font-weight:700;">30%</td><td>30% x TNTT - 9.5 triệu</td></tr>
          <tr><td>5</td><td>Trên 100 triệu đồng</td><td style="color:#c084fc; font-weight:700;">35%</td><td>35% x TNTT - 14.5 triệu</td></tr>
        </tbody>
      </table>
      <div class="tax-note" style="line-height: 1.6; margin-top: 12px;">
        • Giảm trừ bản thân: <strong>15,500,000đ/tháng</strong><br/>
        • Giảm trừ mỗi người phụ thuộc: <strong>6,200,000đ/tháng</strong><br/>
        • Lương cơ sở đóng BHXH/BHYT: <strong>2,530,000đ</strong> (Trần đóng 20 lần = <strong>50,600,000đ</strong>)<br/>
        • Lương tối thiểu đóng BHTN (Vùng I): <strong>5,310,000đ</strong> (Trần đóng 20 lần = <strong>106,200,000đ</strong>)
      </div>
    </div>`;

  window._taxMethod = 'gross';

  window.taxSetMethod = (method) => {
    window._taxMethod = method;
    document.getElementById('btnMethodGross').classList.toggle('active', method === 'gross');
    document.getElementById('btnMethodNet').classList.toggle('active', method === 'net');

    const label = document.getElementById('lblIncomeInput');
    if (label) {
      label.innerHTML = method === 'gross'
        ? `Lương Gross hàng tháng (VND) <span class="tax-req">*</span>`
        : `Lương Net thực nhận hàng tháng (VND) <span class="tax-req">*</span>`;
    }
    window.taxCalcRun();
  };

  window.taxOnInsOptionChange = () => {
    const opt = document.getElementById('taxInsOption').value;
    const row = document.getElementById('rowCustomIns');
    if (row) {
      row.style.display = opt === 'custom' ? 'block' : 'none';
    }
    window.taxCalcRun();
  };

  window.taxFormatAndCalc = (input) => {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const origLen = input.value.length;

    const rawVal = input.value.replace(/[^0-9]/g, '');
    const numVal = parseFloat(rawVal) || 0;

    if (rawVal === '') {
      input.value = '';
    } else {
      input.value = numVal.toLocaleString('en-US');
    }

    const newLen = input.value.length;
    const diff = newLen - origLen;
    input.setSelectionRange(start + diff, end + diff);

    window.taxCalcRun();
  };

  // Main runner
  window.taxCalcRun = () => {
    const method = window._taxMethod || 'gross';
    const incomeStr = document.getElementById('taxIncome').value;
    const insOption = document.getElementById('taxInsOption').value;
    const customInsStr = document.getElementById('taxCustomIns').value;
    const mealStr = document.getElementById('taxMeal').value;
    const otherExemptStr = document.getElementById('taxOtherExempt').value;
    const dep = parseInt(document.getElementById('taxDep').value) || 0;
    const edMedStr = document.getElementById('taxEdMed').value;
    const resDiv = document.getElementById('taxResult');

    const income = parseMoney(incomeStr);
    if (income <= 0) {
      resDiv.innerHTML = '';
      return;
    }

    const customIns = parseMoney(customInsStr);
    const meal = parseMoney(mealStr);
    const otherExempt = parseMoney(otherExemptStr);
    const edMed = parseMoney(edMedStr);

    let r = null;
    if (method === 'gross') {
      r = calculateGrossToNet(income, insOption, customIns, meal, otherExempt, dep, edMed);
    } else {
      r = calculateNetToGross(income, insOption, customIns, meal, otherExempt, dep, edMed);
    }

    renderResult(r, method);
  };

  // Core calculations
  function calculateGrossToNet(gross, insOption, customIns, meal, otherExempt, dep, edMed) {
    // 1. Determine Insurance Basis
    let bhxhBase = gross;
    if (insOption === 'max') {
      bhxhBase = 50600000; // 20 * 2.53M
    } else if (insOption === 'custom') {
      bhxhBase = customIns;
    } else {
      // 'gross' option: exclude meal allowance and other tax-free allowances
      bhxhBase = Math.max(0, gross - meal - otherExempt);
    }

    const bhxhMaxCap = 50600000;
    const bhtnMaxCap = 106200000; // Vùng I: 5.31M * 20

    const bhxhBasis = Math.min(bhxhBase, bhxhMaxCap);
    const bhytBasis = Math.min(bhxhBase, bhxhMaxCap);
    const bhtnBasis = Math.min(bhxhBase, bhtnMaxCap);

    // Employee shares
    const bhxh = Math.round(bhxhBasis * 0.08);
    const bhyt = Math.round(bhytBasis * 0.015);
    const bhtn = Math.round(bhtnBasis * 0.01);
    const totalIns = bhxh + bhyt + bhtn;

    // Employer shares
    const employerBhxh = Math.round(bhxhBasis * 0.175);
    const employerBhyt = Math.round(bhytBasis * 0.03);
    const employerBhtn = Math.round(bhtnBasis * 0.01);
    const employerTotalIns = employerBhxh + employerBhyt + employerBhtn;

    // 2. Personal Income Tax (PIT)
    const exemptMeal = Math.min(meal, 730000);
    const taxableIncomeBeforeDeductions = Math.max(0, gross - exemptMeal - otherExempt);

    // Deductions
    const personalDeduction = 15500000;
    const dependentDeduction = dep * 6200000;
    const edMedDeduction = Math.min(edMed, 3916667); // Capped at 47M/year = 3.91M/month
    const totalDeductions = personalDeduction + dependentDeduction + edMedDeduction + totalIns;

    // Taxable income after deductions
    const taxableIncome = Math.max(0, taxableIncomeBeforeDeductions - totalDeductions);

    // 5 progressive brackets
    const brackets = [
      { limit: 10000000, rate: 0.05 },
      { limit: 20000000, rate: 0.10 }, // Next 20M (10M - 30M)
      { limit: 30000000, rate: 0.20 }, // Next 30M (30M - 60M)
      { limit: 40000000, rate: 0.30 }, // Next 40M (60M - 100M)
      { limit: Infinity, rate: 0.35 }  // Above 100M
    ];

    let tax = 0;
    let remaining = taxableIncome;
    const taxBreakdown = [];

    for (const b of brackets) {
      if (remaining <= 0) break;
      const chunk = Math.min(remaining, b.limit);
      const chunkTax = Math.round(chunk * b.rate);
      taxBreakdown.push({
        rate: b.rate * 100,
        amount: chunk,
        tax: chunkTax
      });
      tax += chunkTax;
      remaining -= chunk;
    }

    const net = gross - totalIns - tax;

    return {
      gross,
      bhxh,
      bhyt,
      bhtn,
      totalIns,
      employerBhxh,
      employerBhyt,
      employerBhtn,
      employerTotalIns,
      exemptMeal,
      taxableIncomeBeforeDeductions,
      personalDeduction,
      dependentDeduction,
      edMedDeduction,
      totalDeductions,
      taxableIncome,
      tax,
      taxBreakdown,
      net
    };
  }

  // Reverse calculation using bisection search method
  function calculateNetToGross(targetNet, insOption, customIns, meal, otherExempt, dep, edMed) {
    let low = targetNet;
    let high = targetNet * 3;
    let tolerance = 0.5;
    let maxIterations = 100;
    let iterations = 0;
    let mid = 0;
    let result = null;

    while (iterations < maxIterations && (high - low) > tolerance) {
      mid = (low + high) / 2;
      result = calculateGrossToNet(mid, insOption, customIns, meal, otherExempt, dep, edMed);
      if (result.net < targetNet) {
        low = mid;
      } else {
        high = mid;
      }
      iterations++;
    }

    return calculateGrossToNet(mid, insOption, customIns, meal, otherExempt, dep, edMed);
  }

  function renderResult(r, method) {
    const resDiv = document.getElementById('taxResult');
    if (!resDiv) return;

    const fmt = n => Math.round(n).toLocaleString('vi-VN') + ' đ';
    const effectiveRate = r.gross > 0 ? (r.tax / r.gross * 100).toFixed(1) : 0;

    const bdRows = r.taxBreakdown.map((b, idx) =>
      `<tr><td>Bậc ${idx + 1} (${b.rate}%)</td><td>${fmt(b.amount)}</td><td>${fmt(b.tax)}</td></tr>`
    ).join('');

    resDiv.innerHTML = `
      <div class="tax-result-grid" style="margin-bottom: 16px;">
        <div class="tax-result-card" style="border-color:rgba(96,165,250,0.3);">
          <div class="tax-result-label">Lương GROSS (Doanh nghiệp chi trả)</div>
          <div class="tax-result-val" style="color:#60a5fa;">${fmt(r.gross)}</div>
        </div>
        <div class="tax-result-card" style="border-color:rgba(52,211,153,0.4); background:rgba(52,211,153,0.05);">
          <div class="tax-result-label">Lương NET thực nhận</div>
          <div class="tax-result-val" style="color:#34d399; font-size:24px;">${fmt(r.net)}</div>
        </div>
        <div class="tax-result-card" style="border-color:rgba(248,113,113,0.3);">
          <div class="tax-result-label">Bảo hiểm cá nhân đóng (9.5%)</div>
          <div class="tax-result-val" style="color:#f87171;">${fmt(r.totalIns)}</div>
          <div style="font-size:10px; color:var(--text-muted); margin-top:4px; line-height:1.4;">
            BHXH (8%): ${fmt(r.bhxh)}<br/>
            BHYT (1.5%): ${fmt(r.bhyt)}<br/>
            BHTN (1%): ${fmt(r.bhtn)}
          </div>
        </div>
        <div class="tax-result-card" style="border-color:rgba(251,146,60,0.3);">
          <div class="tax-result-label">Thuế TNCN phải nộp (Biểu 2026)</div>
          <div class="tax-result-val" style="color:#fb923c;">${fmt(r.tax)}</div>
          <div style="font-size:10px; color:var(--text-muted); margin-top:4px; line-height:1.4;">
            Thu nhập tính thuế: ${fmt(r.taxableIncome)}<br/>
            Thuế suất thực tế: ${effectiveRate}%
          </div>
        </div>
      </div>

      <!-- Detail Explanations -->
      <details open style="margin-top:12px; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 12px;">
        <summary style="cursor:pointer; font-size:13px; font-weight:600; color:var(--text-secondary); outline:none;">
          Bảng diễn giải chi tiết cách tính
        </summary>
        <table class="tax-table" style="margin-top:10px; width:100%;">
          <tbody>
            <tr><td>Lương Gross tổng cộng</td><td style="text-align:right; font-weight:700;">${fmt(r.gross)}</td></tr>
            <tr><td>- Phụ cấp ăn trưa miễn thuế (tối đa 730k)</td><td style="text-align:right; color:#4ade80;">-${fmt(r.exemptMeal)}</td></tr>
            <tr><td>- Các khoản phụ cấp miễn thuế khác</td><td style="text-align:right; color:#4ade80;">-${fmt(r.gross - r.taxableIncomeBeforeDeductions - r.exemptMeal)}</td></tr>
            <tr style="background:rgba(255,255,255,0.02); font-weight:600;"><td>= Thu nhập chịu thuế TNCN</td><td style="text-align:right; color:var(--text-primary);">${fmt(r.taxableIncomeBeforeDeductions)}</td></tr>
            <tr><td>- Bảo hiểm xã hội cá nhân trích nộp</td><td style="text-align:right; color:#f87171;">-${fmt(r.totalIns)}</td></tr>
            <tr><td>- Giảm trừ bản thân (Luật mới 2026)</td><td style="text-align:right; color:#60a5fa;">-${fmt(r.personalDeduction)}</td></tr>
            <tr><td>- Giảm trừ người phụ thuộc</td><td style="text-align:right; color:#60a5fa;">-${fmt(r.dependentDeduction)}</td></tr>
            <tr><td>- Giảm trừ Y tế & Giáo dục mới (tối đa 3.91M)</td><td style="text-align:right; color:#60a5fa;">-${fmt(r.edMedDeduction)}</td></tr>
            <tr style="background:rgba(255,255,255,0.02); font-weight:700;"><td>= Thu nhập tính thuế TNCN (TNTT)</td><td style="text-align:right; color:var(--accent-yellow);">${fmt(r.taxableIncome)}</td></tr>
            <tr style="border-top:1px solid rgba(255,255,255,0.1);"><td><strong>Tổng Thuế TNCN phát sinh</strong></td><td style="text-align:right; font-weight:700; color:#fb923c;">${fmt(r.tax)}</td></tr>
            <tr style="background:rgba(52,211,153,0.06); font-weight:800; font-size:15px; border-top:2px solid rgba(52,211,153,0.2);">
              <td>Lương thực nhận (NET)</td>
              <td style="text-align:right; color:#34d399;">${fmt(r.net)}</td>
            </tr>
          </tbody>
        </table>

        ${r.taxBreakdown.length ? `
        <div style="margin-top:16px; font-size:12px; font-weight:600; color:var(--text-secondary);">Chi tiết các bậc thuế lũy tiến:</div>
        <table class="tax-table" style="margin-top:8px;">
          <thead><tr><th>Bậc thuế (Mức thuế)</th><th>Thu nhập tính thuế bậc</th><th>Thuế phải nộp bậc</th></tr></thead>
          <tbody>${bdRows}</tbody>
        </table>
        ` : ''}
      </details>

      <!-- Employer cost breakdown -->
      <details style="margin-top:12px; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 12px;">
        <summary style="cursor:pointer; font-size:13px; font-weight:600; color:var(--text-secondary); outline:none;">
          Bảng chi phí do Doanh nghiệp đóng (Thêm 21.5%)
        </summary>
        <div style="font-size:11px; color:var(--text-muted); margin-top:6px; margin-bottom:10px;">
          Ngoài phần trích của NLĐ, Doanh nghiệp đóng thêm 21.5% bảo hiểm (BHXH 17.5%, BHYT 3%, BHTN 1%) tính trên mức lương đóng bảo hiểm.
        </div>
        <table class="tax-table" style="width:100%;">
          <tbody>
            <tr><td>BHXH do Công ty nộp (17.5%)</td><td style="text-align:right;">${fmt(r.employerBhxh)}</td></tr>
            <tr><td>BHYT do Công ty nộp (3%)</td><td style="text-align:right;">${fmt(r.employerBhyt)}</td></tr>
            <tr><td>BHTN do Công ty nộp (1%)</td><td style="text-align:right;">${fmt(r.employerBhtn)}</td></tr>
            <tr style="background:rgba(255,255,255,0.02); font-weight:600;"><td>Tổng bảo hiểm doanh nghiệp nộp</td><td style="text-align:right; color:#f87171;">${fmt(r.employerTotalIns)}</td></tr>
            <tr style="background:rgba(96,165,250,0.06); font-weight:800; font-size:14px; border-top:2px solid rgba(96,165,250,0.2);">
              <td>Tổng chi phí thực tế của Doanh nghiệp</td>
              <td style="text-align:right; color:#60a5fa;">${fmt(r.gross + r.employerTotalIns)}</td>
            </tr>
          </tbody>
        </table>
      </details>
    `;
  }

  // Initial calculation run
  window.taxCalcRun();
}
