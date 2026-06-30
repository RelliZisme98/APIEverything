/**
 * components/exchange.js
 * Renders the foreign exchange rate table.
 */

import { FX_META } from '../api/exchange.js';

let _converterInitialized = false;

/**
 * @param {Array<{cur, rateToVnd, source}>} rows
 * @param {string} tbodyId
 */
export function renderExchangeTable(rows, tbodyId = 'fxBody') {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = rows.map(r => {
    const meta = FX_META[r.cur] || {};
    const vnd  = r.rateToVnd
      ? Math.round(r.rateToVnd).toLocaleString('vi-VN')
      : '—';

    return `
      <tr>
        <td>
          <div class="fx-pair">
 <span class="fx-flag">${meta.flag || '️'}</span>
            <div>
              <div class="fx-sym">${r.cur}</div>
              <div class="fx-name">${meta.name || r.cur}</div>
            </div>
          </div>
        </td>
        <td class="fx-rate">${vnd} ₫</td>
        <td class="fx-label">= 1 ${r.cur}</td>
      </tr>
    `;
  }).join('');

  // Update the source note with the actual API that responded
  const sourceEl = document.getElementById('fxSourceNote');
  if (sourceEl && rows[0]?.source) {
    sourceEl.textContent =
      `Nguồn: ${rows[0].source} · Tỷ giá có thể chênh lệch với ngân hàng thương mại · `
      + new Date().toLocaleTimeString('vi-VN');
  }

  // Initialize or update the converter tool
  initConverter(rows);
}

/**
 * Initialize Currency Converter
 * @param {Array<{cur, rateToVnd, source}>} rows
 */
function initConverter(rows) {
  const fromSelect = document.getElementById('convFrom');
  const toSelect   = document.getElementById('convTo');
  const amountInp  = document.getElementById('convAmount');
  const swapBtn    = document.getElementById('convSwap');
  const resultDiv  = document.getElementById('convResult');
  const detailDiv  = document.getElementById('convRateDetail');

  if (!fromSelect || !toSelect || !amountInp || !resultDiv || !detailDiv) return;

  // Build options
  const currencies = Object.keys(FX_META); // Includes VND

  if (!_converterInitialized) {
    _converterInitialized = true;

    const buildOptions = (selectedVal) => {
      return currencies.map(cur => {
        const meta = FX_META[cur] || {};
        const isSel = cur === selectedVal ? 'selected' : '';
 return `<option value="${cur}" ${isSel}>${meta.flag || '️'} ${cur} - ${meta.name || cur}</option>`;
      }).join('');
    };

    fromSelect.innerHTML = buildOptions('USD');
    toSelect.innerHTML   = buildOptions('VND');

    // Attach listeners
    const triggerCalc = () => calculate(rows, fromSelect, toSelect, amountInp, resultDiv, detailDiv);
    amountInp.addEventListener('input', triggerCalc);
    fromSelect.addEventListener('change', triggerCalc);
    toSelect.addEventListener('change', triggerCalc);

    swapBtn?.addEventListener('click', () => {
      const temp = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = temp;
      triggerCalc();
    });
  }

  // Calculate immediately
  calculate(rows, fromSelect, toSelect, amountInp, resultDiv, detailDiv);
}

/**
 * Perform conversion calculation
 */
function calculate(rows, fromSelect, toSelect, amountInp, resultDiv, detailDiv) {
  const amount = parseFloat(amountInp.value);
  if (isNaN(amount) || amount < 0) {
    resultDiv.textContent = '—';
    detailDiv.textContent = 'Nhập số tiền hợp lệ';
    return;
  }

  const fromCur = fromSelect.value;
  const toCur   = toSelect.value;

  // Find rate relative to VND
  // VND rate is 1
  const getRateToVnd = (cur) => {
    if (cur === 'VND') return 1;
    const found = rows.find(r => r.cur === cur);
    return found ? found.rateToVnd : null;
  };

  const rateFrom = getRateToVnd(fromCur);
  const rateTo   = getRateToVnd(toCur);

  if (!rateFrom || !rateTo) {
    resultDiv.textContent = '—';
    detailDiv.textContent = 'Không có dữ liệu tỷ giá';
    return;
  }

  // rateFrom/rateTo gives the exchange rate from -> to
  // e.g. from USD (25480) to EUR (27000) => 25480 / 27000 = 0.9437
  const crossRate = rateFrom / rateTo;
  const converted = amount * crossRate;

  // Formatting
  let formattedResult;
  if (toCur === 'VND') {
    formattedResult = Math.round(converted).toLocaleString('vi-VN') + ' ₫';
  } else {
    formattedResult = converted.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + ' ' + toCur;
  }

  const formattedRate = `1 ${fromCur} = ${crossRate.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${toCur}`;

  resultDiv.textContent = formattedResult;
  detailDiv.textContent = formattedRate;
}
