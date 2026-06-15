/**
 * components/vnindex.js — Vietnam Stock Market widget
 * - VN-Index: Yahoo Finance (exact)
 * - VN30: VPS basket average (approximate)
 * - HNX: VPS HNX stocks basket (approximate)
 */
import { fetchVNIndex, fetchTopStocks } from '../api/vnindex.js';

const INDEX_META = {
  'VNINDEX':     { label: 'VN-Index',  color: '#60a5fa', exchange: 'HOSE' },
  '^VNINDEX.VN': { label: 'VN-Index',  color: '#60a5fa', exchange: 'HOSE' },
  'VN30':        { label: 'VN30',      color: '#34d399', exchange: 'HOSE' },
  'HNXINDEX':    { label: 'HNX-Index', color: '#fbbf24', exchange: 'HNX'  },
  'UPINDEX':     { label: 'UPCOM',     color: '#c084fc', exchange: 'UPCOM' },
};

const STOCK_SECTORS = {
  VCB: 'Ngân hàng', BID: 'Ngân hàng', CTG: 'Ngân hàng',
  TCB: 'Ngân hàng', VPB: 'Ngân hàng', MBB: 'Ngân hàng',
  HPG: 'Thép',      VIC: 'BĐS',       VHM: 'BĐS',
  VNM: 'Thực phẩm', MSN: 'Tập đoàn',  SAB: 'Đồ uống',
  GAS: 'Dầu khí',   PLX: 'Xăng dầu',  FPT: 'Công nghệ',
};

export async function renderVNIndex(containerId = 'vnindexContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">📈 Đang tải dữ liệu chứng khoán...</div>`;

  try {
    const [result, stocks] = await Promise.all([fetchVNIndex(), fetchTopStocks()]);

    // ── Market status banner ──
    const marketStatus = result?.marketStatus ?? 'unknown';
    let statusBanner = '';
    const now = new Date();
    const vnTime = now.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
    const vnDate = now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: '2-digit' });

    if (marketStatus === 'open') {
      statusBanner = `<div class="vni-status-bar vni-status--open">🟢 THỊ TRƯỜNG ĐANG MỞ CỬA · ${vnTime} (giờ VN)</div>`;
    } else if (marketStatus === 'closed') {
      statusBanner = `<div class="vni-status-bar vni-status--closed">🔴 ĐÃ ĐÓNG CỬA · ${vnTime} (giờ VN) · Phiên tiếp theo: Ngày làm việc 9:00–11:30 và 13:00–15:00</div>`;
    } else if (marketStatus === 'weekend') {
      statusBanner = `<div class="vni-status-bar vni-status--weekend">📅 CUỐI TUẦN · ${vnDate} · Thị trường nghỉ, hiển thị giá đóng cửa cuối tuần trước</div>`;
    }

    const indices = result?.indices ?? [];

    // ── Index cards ──
    let indexSection = '';
    if (indices?.length) {
      const indexCards = indices.map(idx => {
        const meta    = INDEX_META[idx.sym] ?? { label: idx.sym, color: '#94a3b8', exchange: '' };
        const price   = parseFloat(idx.lastPrice ?? 0);
        const change  = parseFloat(idx.ot ?? 0);
        const pct     = parseFloat(idx.changePc ?? 0);
        const high    = parseFloat(idx.highPrice ?? 0);
        const low     = parseFloat(idx.lowPrice  ?? 0);
        const open    = parseFloat(idx.openPrice ?? 0);
        const vol     = parseInt(idx.lot ?? 0);
        const isFlat  = Math.abs(pct) < 0.01;
        const isUp    = pct > 0;
        const arrow   = isFlat ? '—' : isUp ? '▲' : '▼';
        const clr     = isFlat ? '#fbbf24' : isUp ? 'var(--accent-green)' : 'var(--accent-red)';
        const approx  = idx.isBasket ? '<span style="font-size:9px;opacity:0.6;"> ˜ ước tính</span>' : '';

        const range   = high - low;
        const rangePct = range > 0 ? ((price - low) / range * 100).toFixed(0) : 50;

        return `
          <div class="vni-index-card" style="border-color:${meta.color}40;background:${meta.color}08;">
            <div class="vni-index-header">
              <div class="vni-index-label" style="color:${meta.color};">${meta.label}${approx}</div>
              <div class="vni-index-exch">${meta.exchange}</div>
            </div>
            <div class="vni-index-price">${price > 0 ? price.toLocaleString('vi-VN', {maximumFractionDigits: 2}) : '—'}</div>
            <div class="vni-index-change" style="color:${clr};">
              ${arrow} ${Math.abs(change).toLocaleString('vi-VN', {maximumFractionDigits:2})}
              <span style="font-size:10px;margin-left:4px;">(${Math.abs(pct).toFixed(2)}%)</span>
            </div>
            ${high > 0 ? `
            <div class="vni-index-details">
              <span title="Mở cửa">O: ${open.toFixed(2)}</span>
              <span title="Cao nhất" style="color:#4ade80;">H: ${high.toFixed(2)}</span>
              <span title="Thấp nhất" style="color:#f87171;">L: ${low.toFixed(2)}</span>
            </div>
            <div class="vni-range-bar" title="Vị trí giá trong phiên">
              <div class="vni-range-fill" style="left:${rangePct}%;border-color:${meta.color};"></div>
            </div>` : ''}
            ${vol > 0 ? `<div class="vni-index-vol">Vol: ${(vol/1000000).toFixed(2)}M</div>` : ''}
          </div>`;
      }).join('');
      indexSection = `${statusBanner}<div class="vni-index-grid">${indexCards}</div>`;
    } else {
      // No index data — show market status instead of error
      const msgs = {
        closed:  '🕐 Thị trường đã đóng cửa. Đang hiển thị dữ liệu phiên gần nhất.',
        weekend: '📅 Cuối tuần — thị trường nghỉ. Số liệu từ phiên đóng cửa thứ Sáu.',
        unknown: '⏳ Chưa lấy được dữ liệu chỉ số (nguồn dữ liệu tạm thời không khả dụng).',
      };
      indexSection = `
        ${statusBanner}
        <div class="vni-disclaimer" style="border-color:rgba(251,191,36,0.3);background:rgba(251,191,36,0.06);">
          ${msgs[marketStatus] ?? msgs.unknown}
        </div>`;
    }

    // ── Stock table ──
    if (!stocks?.length) {
      el.innerHTML = indexSection + `<div class="error-msg">⚠️ Không tải được dữ liệu cổ phiếu.</div>`;
      return;
    }

    const stockRows = stocks.map(s => {
      const sym     = s.sym ?? '—';
      const price   = parseFloat(s.lastPrice || s.c || 0);
      const ref     = parseFloat(s.r || 0) || price;
      const high    = parseFloat(s.highPrice || 0);
      const low     = parseFloat(s.lowPrice  || 0);
      const open    = parseFloat(s.openPrice || 0);
      const ceil    = parseFloat(s.c || 0);
      const floor   = parseFloat(s.f || 0);
      const change  = price - ref;
      const pct     = ref ? (change / ref * 100) : 0;
      const vol     = parseInt(s.lot || 0);
      const fBuy    = parseInt(s.fBVol  || 0); // foreign buy volume
      const fSell   = parseInt(s.fSVolume || 0); // foreign sell volume
      const isEven  = Math.abs(pct) < 0.01;
      const isCeil  = Math.abs(price - ceil) < 0.05;
      const isFloor = Math.abs(price - floor) < 0.05;
      const clr     = isCeil ? '#c084fc' : isFloor ? '#60a5fa'
                    : isEven ? '#fbbf24' : pct > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      const arrow   = isEven ? '—' : pct > 0 ? '▲' : '▼';
      const sector  = STOCK_SECTORS[sym] ?? '—';

      // Price range mini bar
      const range    = high - low;
      const barWidth = range > 0 ? ((price - low) / range * 100).toFixed(0) : 50;

      return `
        <tr class="vni-stock-row">
          <td><span class="vni-sym" style="${isCeil?'color:#c084fc':isFloor?'color:#60a5fa':''}">${sym}</span></td>
          <td class="vni-sector">${sector}</td>
          <td class="vni-price" style="color:${clr};">${price > 0 ? price.toFixed(1) : '—'}</td>
          <td style="color:${clr};white-space:nowrap;">${arrow} ${Math.abs(change).toFixed(1)}</td>
          <td style="color:${clr};">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</td>
          <td class="vni-hl-cell">
            ${high > 0 ? `<span class="vni-high">${high.toFixed(1)}</span>
            <div class="vni-stock-range"><div style="width:${barWidth}%;background:${clr};"></div></div>
            <span class="vni-low">${low.toFixed(1)}</span>` : '—'}
          </td>
          <td class="vni-vol">${vol > 0 ? (vol/1000).toFixed(0)+'K' : '—'}</td>
          <td class="vni-foreign">
            ${fBuy > 0 ? `<span style="color:var(--accent-green);">+${(fBuy/1000).toFixed(0)}K</span>` : ''}
            ${fSell > 0 ? `<span style="color:var(--accent-red);">-${(fSell/1000).toFixed(0)}K</span>` : ''}
          </td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      ${indexSection}
      <div class="vni-disclaimer">
        📡 VN-Index: Yahoo Finance · VN30/HNX: ước tính từ basket · Cổ phiếu: VPS
        &nbsp;·&nbsp; <span style="color:#c084fc">Tím = Trần</span> · <span style="color:#60a5fa">Xanh = Sàn</span>
      </div>
      <div class="vni-section-label">📊 Cổ phiếu bluechip</div>
      <div style="overflow-x:auto;">
        <table class="vni-table">
          <thead>
            <tr>
              <th>Mã</th><th>Ngành</th><th>Giá</th><th>+/−</th><th>%</th>
              <th>Cao/Thấp</th><th>KL</th><th>NĐTNN</th>
            </tr>
          </thead>
          <tbody>${stockRows}</tbody>
        </table>
      </div>`;

  } catch (err) {
    el.innerHTML = `<div class="error-msg">⚠️ ${err.message}</div>`;
  }
}
