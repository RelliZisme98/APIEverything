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

    // ── Index cards (may be null if proxy not deployed yet) ──
    let indexSection = '';
    if (indices?.length) {
      const indexCards = indices.map(idx => {
        const meta   = INDEX_META[idx.sym] ?? { label: idx.sym ?? '—', color: '#94a3b8', exchange: '' };
        const price  = parseFloat(idx.lastPrice ?? idx.c ?? 0);
        const change = parseFloat(idx.ot ?? 0);
        const pct    = parseFloat(idx.changePc ?? 0);
        const isFlat = change === 0;
        const isUp   = change >= 0;
        const arrow  = isFlat ? '—' : isUp ? '▲' : '▼';
        const clr    = isFlat ? '#fbbf24' : isUp ? 'var(--accent-green)' : 'var(--accent-red)';
        return `
          <div class="vni-index-card" style="border-color:${meta.color}30;background:${meta.color}08;">
            <div class="vni-index-label" style="color:${meta.color};">${meta.label}</div>
            <div class="vni-index-price">${price > 0 ? price.toLocaleString('vi-VN', {maximumFractionDigits: 2}) : '—'}</div>
            <div class="vni-index-change" style="color:${clr};">${arrow} ${Math.abs(change).toFixed(2)} (${Math.abs(pct).toFixed(2)}%)</div>
            <div class="vni-index-exch">${meta.exchange}</div>
          </div>`;
      }).join('');
      indexSection = `<div class="vni-index-grid">${indexCards}</div>`;
    } else {
      // Index proxy not deployed yet — show info note
      indexSection = `
        <div class="vni-disclaimer" style="border-color:rgba(251,191,36,0.3);background:rgba(251,191,36,0.06);">
          ⚠️ Dữ liệu chỉ số (VN-Index, HNX...) chưa có — cần deploy Cloudflare Function
          <code>functions/vnindex.js</code> lên <code>everything.rellia.org</code>.
          Hiện đang hiển thị cổ phiếu bluechip trực tiếp từ VPS.
        </div>`;
    }

    // ── Stock table ──
    if (!stocks?.length) {
      el.innerHTML = indexSection + `<div class="error-msg">⚠️ Không tải được dữ liệu cổ phiếu. Thử lại sau.</div>`;
      return;
    }

    const stockRows = stocks.map(s => {
      const sym    = s.sym ?? '—';
      const price  = parseFloat(s.lastPrice || s.c || 0);
      const ref    = parseFloat(s.r || 0) || price;
      const change = price - ref;
      const pct    = ref ? (change / ref * 100) : 0;
      const isEven = Math.abs(change) < 0.001;
      const isUp   = change > 0;
      const clr    = isEven ? '#fbbf24' : isUp ? 'var(--accent-green)' : 'var(--accent-red)';
      const arrow  = isEven ? '—' : isUp ? '▲' : '▼';
      const vol    = parseInt(s.totalVol || s.lot || 0);
      const sector = STOCK_SECTORS[sym] ?? '—';
      return `
        <tr class="vni-stock-row">
          <td><span class="vni-sym">${sym}</span></td>
          <td class="vni-sector">${sector}</td>
          <td class="vni-price" style="color:${clr};">${price > 0 ? price.toFixed(1) : '—'}</td>
          <td style="color:${clr};">${arrow} ${Math.abs(change).toFixed(1)}</td>
          <td style="color:${clr};">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</td>
          <td class="vni-vol">${vol > 0 ? (vol/1000).toFixed(0)+'K' : '—'}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      ${indexSection}
      <div class="vni-disclaimer">📡 Dữ liệu từ VPS · Đơn vị giá: nghìn đồng (VND) · Tự làm mới mỗi 60 giây</div>
      <div class="vni-section-label">📊 Cổ phiếu bluechip</div>
      <div style="overflow-x:auto;">
        <table class="vni-table">
          <thead>
            <tr><th>Mã</th><th>Ngành</th><th>Giá (K)</th><th>+/−</th><th>%</th><th>KL</th></tr>
          </thead>
          <tbody>${stockRows}</tbody>
        </table>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="error-msg">⚠️ ${err.message}</div>`;
  }
}

