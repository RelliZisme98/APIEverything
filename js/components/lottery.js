/**
 * components/lottery.js — Kết quả xổ số (XSMB / XSMN / XSMT)
 * Nguồn: minhngoc.net.vn (embed script injection)
 */

const LOTTERY_REGIONS = [
  {
    id: 'mien-bac', label: '🎰 Miền Bắc', shortLabel: 'MB',
    drawDays: 'Hàng ngày',
    color: '#f87171',
    // minhngoc script endpoint
    scriptBase: 'https://www.minhngoc.net.vn/getkqxs/mien-bac.js',
  },
  {
    id: 'tp-hcm', label: '🎰 TP. HCM', shortLabel: 'HCM',
    drawDays: 'Thứ 2, Thứ 7',
    color: '#60a5fa',
    scriptBase: 'https://www.minhngoc.net.vn/getkqxs/tp-hcm.js',
  },
  {
    id: 'da-nang', label: '🎰 Đà Nẵng', shortLabel: 'ĐN',
    drawDays: 'Thứ 4, Thứ 7',
    color: '#34d399',
    scriptBase: 'https://www.minhngoc.net.vn/getkqxs/da-nang.js',
  },
];

let currentLotteryId = 'mien-bac';

export function renderLottery(containerId = 'lotteryContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  const chips = LOTTERY_REGIONS.map(r => `
    <button class="lot-chip ${r.id === currentLotteryId ? 'active' : ''}"
            onclick="window.selectLottery('${r.id}')">${r.label}</button>`).join('');

  el.innerHTML = `
    <div class="lot-chips">${chips}</div>
    <div id="lotteryData"><div style="text-align:center;padding:20px;color:var(--text-muted);">🎱 Đang tải kết quả xổ số...</div></div>`;

  loadLotteryData(currentLotteryId);

  window.selectLottery = (id) => {
    currentLotteryId = id;
    renderLottery(containerId);
  };
}

function loadLotteryData(regionId) {
  const region = LOTTERY_REGIONS.find(r => r.id === regionId);
  if (!region) return;

  // Inject script from minhngoc and capture DOM output
  const targetEl = document.getElementById('lotteryData');
  if (!targetEl) return;

  // Create a hidden container to capture minhngoc output
  const captureId = 'box_kqxs_minhngoc';
  let captureDiv = document.getElementById(captureId);
  if (!captureDiv) {
    captureDiv = document.createElement('div');
    captureDiv.id = captureId;
    captureDiv.style.display = 'none';
    document.body.appendChild(captureDiv);
  }
  captureDiv.innerHTML = '';

  // Load script
  const existingScript = document.getElementById('lotteryScript');
  if (existingScript) existingScript.remove();

  const script = document.createElement('script');
  script.id = 'lotteryScript';
  script.src = region.scriptBase + '?_t=' + Date.now();
  script.onload = () => {
    setTimeout(() => {
      parseMinhngocResult(captureDiv, targetEl, region);
    }, 300);
  };
  script.onerror = () => {
    targetEl.innerHTML = `<div class="error-msg">⚠️ Không tải được kết quả. Vui lòng thử lại.</div>
      <div style="text-align:center;margin-top:10px;">
        <a href="https://www.minhngoc.net.vn/${regionId}/" target="_blank" class="lot-link">
          🔗 Xem trên minhngoc.net.vn
        </a>
      </div>`;
  };
  document.head.appendChild(script);
}

function parseMinhngocResult(sourceEl, targetEl, region) {
  // Parse tables from minhngoc injected HTML
  const tables = sourceEl.querySelectorAll('table.bkqtinhmienbac_mini, table');
  if (!tables.length) {
    targetEl.innerHTML = `
      <div style="text-align:center;padding:20px;color:var(--text-muted);">
        📅 Chưa có kết quả hôm nay (${new Date().toLocaleDateString('vi-VN')})
        <br><br>
        <a href="https://www.minhngoc.net.vn/${region.id}/" target="_blank" class="lot-link">
          🔗 Xem đầy đủ tại minhngoc.net.vn
        </a>
      </div>`;
    return;
  }

  // Extract rows from table
  const rows = [];
  tables[0]?.querySelectorAll('tr').forEach(tr => {
    const label = tr.querySelector('[class*="giai"]')?.textContent?.trim();
    const val   = tr.querySelector('[class*="db"], td:last-child')?.textContent?.trim();
    if (label && val) rows.push({ label, val });
  });

  if (!rows.length) {
    // Fallback: raw table display
    targetEl.innerHTML = `
      <div class="lot-wrap">
        <div class="lot-header" style="border-color:${region.color}30;">🎰 ${region.label}</div>
        ${sourceEl.innerHTML}
        <div style="text-align:center;margin-top:10px;">
          <a href="https://www.minhngoc.net.vn/${region.id}/" target="_blank" class="lot-link">🔗 Xem đầy đủ</a>
        </div>
      </div>`;
    return;
  }

  // Render nicely
  const rowHtml = rows.map(r => {
    const isDB = r.label.toLowerCase().includes('đặc') || r.label.toLowerCase().includes('db');
    return `
      <tr class="lot-row ${isDB ? 'lot-row--db' : ''}">
        <td class="lot-prize-name" ${isDB ? `style="color:${region.color};"` : ''}>${r.label}</td>
        <td class="lot-prize-nums" ${isDB ? `style="color:${region.color};font-size:22px;"` : ''}>${r.val}</td>
      </tr>`;
  }).join('');

  targetEl.innerHTML = `
    <div class="lot-wrap">
      <div class="lot-header" style="border-color:${region.color}40;background:${region.color}08;">
        <span>🎰 ${region.label}</span>
        <span class="lot-date">${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="lot-table">
          <thead><tr><th>Giải</th><th>Kết quả</th></tr></thead>
          <tbody>${rowHtml}</tbody>
        </table>
      </div>
      <div style="text-align:center;margin-top:12px;">
        <a href="https://www.minhngoc.net.vn/${region.id}/" target="_blank" class="lot-link">🔗 Xem đầy đủ tại minhngoc.net.vn</a>
      </div>
    </div>`;
}
