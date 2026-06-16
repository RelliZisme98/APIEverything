/**
 * components/bank-rates.js — Tỷ giá ngân hàng VCB
 */

const PRIORITY_CURRENCIES = ['USD','EUR','GBP','JPY','CNY','AUD','SGD','KRW','THB','HKD'];
const FLAGS = { USD:'🇺🇸', EUR:'🇪🇺', GBP:'🇬🇧', JPY:'🇯🇵', CNY:'🇨🇳', AUD:'🇦🇺',
                SGD:'🇸🇬', KRW:'🇰🇷', THB:'🇹🇭', HKD:'🇭🇰', CHF:'🇨🇭', CAD:'🇨🇦' };

export async function renderBankRates(containerId = 'bankRatesContent') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);">🏦 Đang tải tỷ giá VCB...</div>`;
  try {
    const res = await fetch(`/vcb-rates`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.rates?.length) throw new Error('No data');

    const updated = data.updated ?? '';
    const rates   = data.rates;

    // Priority order first, then rest
    const sorted = [
      ...PRIORITY_CURRENCIES.map(c => rates.find(r => r.code === c)).filter(Boolean),
      ...rates.filter(r => !PRIORITY_CURRENCIES.includes(r.code))
    ];

    const rows = sorted.map(r => {
      const flag = FLAGS[r.code] ?? '🏳️';
      const buyNum = parseFloat(r.buy?.replace(/,/g, '') || 0);
      const sellNum = parseFloat(r.sell?.replace(/,/g, '') || 0);
      const tranNum = parseFloat(r.transfer?.replace(/,/g, '') || 0);
      const spread = sellNum && buyNum ? ((sellNum - buyNum) / buyNum * 100).toFixed(2) : null;
      return `
        <tr class="br-row">
          <td><span class="br-flag">${flag}</span> <span class="br-code">${r.code}</span></td>
          <td class="br-name">${r.name}</td>
          <td class="br-val ${buyNum ? '' : 'br-dash'}">${buyNum ? buyNum.toLocaleString('vi-VN') : '—'}</td>
          <td class="br-val">${tranNum ? tranNum.toLocaleString('vi-VN') : '—'}</td>
          <td class="br-val br-sell">${sellNum ? sellNum.toLocaleString('vi-VN') : '—'}</td>
          <td class="br-spread">${spread ? spread + '%' : '—'}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="br-meta">
        🏦 <strong>Vietcombank</strong> · Cập nhật: ${updated}
        <span style="margin-left:8px;font-size:10px;color:var(--text-muted);">(VNĐ / ngoại tệ)</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="br-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên tiền tệ</th>
              <th>Mua tiền mặt</th>
              <th>Mua chuyển khoản</th>
              <th>Bán ra</th>
              <th>Spread</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="error-msg">⚠️ Không tải được tỷ giá: ${err.message}</div>`;
  }
}
