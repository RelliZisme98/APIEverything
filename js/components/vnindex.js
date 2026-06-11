/**
 * components/vnindex.js — Vietnam Stock Market widget
 */
import { fetchVNIndex, fetchTopStocks } from '../api/vnindex.js';

const INDEX_META = {
  VNINDEX: { label: 'VN-Index',  color: '#60a5fa', exchange: 'HOSE' },
  VN30:    { label: 'VN30',      color: '#34d399', exchange: 'HOSE' },
  HNXINDEX:{ label: 'HNX-Index', color: '#fbbf24', exchange: 'HNX'  },
  UPINDEX: { label: 'UPCOM',     color: '#c084fc', exchange: 'UPCOM' },
};

const STOCK_SECTORS = {
  VCB: 'Ngân hàng', BID: 'Ngân hàng', CTG: 'Ngân hàng',
  TCB: 'Ngân hàng', VPB: 'Ngân hàng', MBB: 'Ngân hàng',
  HPG: 'Thép', VIC: 'Bất động sản', VHM: 'Bất động sản',
  VNM: 'Thực phẩm', MSN: 'Tập đoàn', SAB: 'Đồ uống',
  GAS: 'Dầu khí', PLX: 'Xăng dầu', FPT: 'Công nghệ',
};

export async function renderVNIndex(containerId = 'vnindexContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">📈 Đang tải dữ liệu chứng khoán...</div>`;

  try {
    const [indices, stocks] = await Promise.all([fetchVNIndex(), fetchTopStocks()]);

    if (!indices) {
      el.innerHTML = `<div class="error-msg">⚠️ Không tải được dữ liệu chứng khoán. Thử lại sau.</div>`;
      return;
    }

    // ── Index cards ──
    const indexCards = (indices || []).map(idx => {
      const meta    = INDEX_META[idx.sym] ?? { label: idx.sym ?? '—', color: '#94a3b8', exchange: '' };
      const price   = parseFloat(idx.lastPrice ?? idx.c ?? 0);
      const change  = parseFloat(idx.ot ?? 0);           // ot = change value
      const pct     = parseFloat(idx.changePc ?? 0);     // changePc = % change
      const isUp    = change >= 0;
      const isFlat  = change === 0;
      const arrow   = isFlat ? '—' : isUp ? '▲' : '▼';
      const clr     = isFlat ? '#fbbf24' : isUp ? 'var(--accent-green)' : 'var(--accent-red)';

      return `
        <div class="vni-index-card" style="border-color:${meta.color}30;background:${meta.color}08;">
          <div class="vni-index-label" style="color:${meta.color};">${meta.label}</div>
          <div class="vni-index-price">${price > 0 ? price.toLocaleString('vi-VN', {maximumFractionDigits: 2}) : '—'}</div>
          <div class="vni-index-change" style="color:${clr};">
            ${arrow} ${Math.abs(change).toFixed(2)} (${Math.abs(pct).toFixed(2)}%)
          </div>
          <div class="vni-index-exch">${meta.exchange}</div>
        </div>`;
    }).join('');

    // ── Stock table ──
    let stockRows = '';
    if (stocks?.length) {
      stockRows = stocks.map(s => {
        const sym    = s.sym ?? s.cd ?? '—';
        const price  = parseFloat(s.lastPrice || s.c || s.mp) || 0;
        const ref    = parseFloat(s.r || s.rf) || price;
        const change = price - ref;
        const pct    = ref ? (change / ref * 100) : 0;
        const isUp   = change > 0;
        const isEven = change === 0;
        const clr    = isEven ? '#fbbf24' : isUp ? 'var(--accent-green)' : 'var(--accent-red)';
        const arrow  = isEven ? '—' : isUp ? '▲' : '▼';
        const vol    = parseInt(s.totalVol || s.vol || 0);
        const sector = STOCK_SECTORS[sym] ?? '—';

        return `
          <tr class="vni-stock-row">
            <td><span class="vni-sym">${sym}</span></td>
            <td class="vni-sector">${sector}</td>
            <td class="vni-price" style="color:${clr};">${(price/1000).toFixed(1)}</td>
            <td style="color:${clr};">${arrow} ${Math.abs(change/1000).toFixed(1)}</td>
            <td style="color:${clr};">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</td>
            <td class="vni-vol">${vol > 0 ? (vol/1000).toFixed(0) + 'K' : '—'}</td>
          </tr>`;
      }).join('');
    }

    el.innerHTML = `
      <!-- Index overview -->
      <div class="vni-index-grid">${indexCards}</div>

      <!-- Market breadth note -->
      <div class="vni-disclaimer">
        📡 Dữ liệu từ VPS · Đơn vị giá: nghìn đồng (K VND) · Làm mới cùng dashboard
      </div>

      <!-- Top stocks table -->
      ${stockRows ? `
        <div class="vni-section-label">📊 Cổ phiếu bluechip</div>
        <div style="overflow-x:auto;">
          <table class="vni-table">
            <thead>
              <tr>
                <th>Mã</th><th>Ngành</th><th>Giá (K)</th>
                <th>+/−</th><th>%</th><th>KL</th>
              </tr>
            </thead>
            <tbody>${stockRows}</tbody>
          </table>
        </div>
      ` : ''}
    `;
  } catch (err) {
    el.innerHTML = `<div class="error-msg">⚠️ ${err.message}</div>`;
  }
}
