/**
 * components/finance.js
 * Consolidated Financial Markets component combining Stocks, Crypto, Gold, Exchange Rates, and Fuel.
 */

import { state, CONFIG } from '../store/state.js';
import { renderVNIndex } from './vnindex.js';
import { renderCryptoGrid } from './crypto-grid.js';
import { renderCryptoTable } from './crypto-table.js';
import { renderMarketStats } from './market-stats.js';
import { selectCrypto } from './crypto-detail.js';
import { renderGold, renderGoldFallback } from './gold.js';
import { renderGas } from './gas.js';
import { renderExchangeTable } from './exchange.js';

let activeTab = 'overview';

export function renderFinance(containerId = 'financeContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="finance-tabs">
      <button class="finance-tab-btn ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview" onclick="switchFinanceTab('overview')">Tổng quan</button>
      <button class="finance-tab-btn ${activeTab === 'vnindex' ? 'active' : ''}" data-tab="vnindex" onclick="switchFinanceTab('vnindex')">Chứng khoán</button>
      <button class="finance-tab-btn ${activeTab === 'crypto' ? 'active' : ''}" data-tab="crypto" onclick="switchFinanceTab('crypto')">Tiền điện tử</button>
      <button class="finance-tab-btn ${activeTab === 'gold' ? 'active' : ''}" data-tab="gold" onclick="switchFinanceTab('gold')">Giá vàng</button>
      <button class="finance-tab-btn ${activeTab === 'exchange' ? 'active' : ''}" data-tab="exchange" onclick="switchFinanceTab('exchange')">Ngoại tệ</button>
      <button class="finance-tab-btn ${activeTab === 'gas' ? 'active' : ''}" data-tab="gas" onclick="switchFinanceTab('gas')">Xăng dầu</button>
    </div>
    <div id="financeSubContent" class="finance-sub-content" style="margin-top:16px;"></div>
  `;

  const subContainer = document.getElementById('financeSubContent');
  if (subContainer) {
    renderTabContent(subContainer);
  }
}

export function switchFinanceTab(tabId) {
  activeTab = tabId;
  
  // Update active tab button styles
  document.querySelectorAll('.finance-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  const subContainer = document.getElementById('financeSubContent');
  if (subContainer) {
    renderTabContent(subContainer);
  } else {
    renderFinance();
  }
}

// Bind to window for HTML inline event handlers
window.switchFinanceTab = switchFinanceTab;

function renderTabContent(container) {
  if (activeTab === 'overview') {
    renderOverview(container);
  } else if (activeTab === 'vnindex') {
    container.innerHTML = `<div id="vnindexContent"></div>`;
    renderVNIndex('vnindexContent');
  } else if (activeTab === 'crypto') {
    container.innerHTML = `
      <div class="crypto-wrap">
        <div class="crypto-left-pane">
          <div id="marketStats" class="market-stats-box"></div>
          <div id="cryptoGrid" class="crypto-grid"></div>
        </div>
        <div class="crypto-right-pane">
          <div class="card" id="cryptoDetailCard" style="display:none;margin-bottom:0;">
            <div class="card-header">
              <div class="card-title">Chi tiết thị trường</div>
            </div>
            <div id="cryptoDetailContainer" class="crypto-detail-container" style="padding:16px;"></div>
          </div>
        </div>
      </div>
      <div style="margin-top:20px;">
        <table class="crypto-table" style="width:100%;">
          <thead>
            <tr>
              <th>#</th><th>Tên Coin</th><th>Giá USD</th><th>24h %</th><th>7d %</th><th>Vốn Hóa</th><th>KL Giao Dịch</th>
            </tr>
          </thead>
          <tbody id="cryptoTableBody"></tbody>
        </table>
      </div>
    `;
    if (state.cryptoData && state.cryptoData.length) {
      renderCryptoGrid(state.cryptoData);
      renderCryptoTable(state.cryptoData);
      renderMarketStats(state.cryptoData);
      selectCrypto(window.activeCryptoId || state.cryptoData[0]?.id || 'bitcoin');
    } else {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Đang tải dữ liệu Tiền điện tử...</div>`;
    }
  } else if (activeTab === 'gold') {
    container.innerHTML = `<div id="goldContent"></div>`;
    if (state.goldData?.price) {
      renderGold(state.goldData.price, state.goldData.source, 'goldContent');
    } else {
      renderGoldFallback('goldContent');
    }
  } else if (activeTab === 'exchange') {
    container.innerHTML = `
      <div class="exchange-wrap" style="display:flex;gap:20px;flex-wrap:wrap;">
        <div style="flex:1.2;min-width:300px;">
          <table class="fx-table" style="width:100%;">
            <thead>
              <tr><th>Ngoại tệ</th><th>Giá mua chuyển khoản</th><th>Quy đổi</th></tr>
            </thead>
            <tbody id="fxBody"></tbody>
          </table>
          <div id="fxSourceNote" style="font-size:11px;color:var(--text-muted);margin-top:8px;"></div>
        </div>
        <div style="flex:0.8;min-width:300px;">
          <div class="card" style="margin-bottom:0;background:rgba(255,255,255,0.01);border:1px solid var(--border);">
            <div class="card-header"><div class="card-title">Công cụ quy đổi ngoại tệ</div></div>
            <div style="padding:16px;">
              <div style="display:flex;gap:10px;margin-bottom:12px;">
                <input type="number" id="convAmount" class="field-input" value="1" min="0" style="flex:1;" />
                <select id="convFrom" class="field-input" style="flex:1;"></select>
              </div>
              <div style="text-align:center;margin-bottom:12px;font-size:18px;cursor:pointer;user-select:none;" id="convSwap">⇅</div>
              <div style="margin-bottom:16px;">
                <select id="convTo" class="field-input" style="width:100%;"></select>
              </div>
              <div style="padding:12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:8px;text-align:center;">
                <div id="convResult" style="font-size:24px;font-weight:700;color:var(--accent-blue);">—</div>
                <div id="convRateDetail" style="font-size:11px;color:var(--text-muted);margin-top:4px;">—</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    if (state.fxData && state.fxData.length) {
      renderExchangeTable(state.fxData, 'fxBody');
    } else {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Đang tải tỷ giá ngoại tệ...</div>`;
    }
  } else if (activeTab === 'gas') {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-size:13px;color:var(--text-muted);">Chọn khu vực Petrolimex:</div>
        <select id="gasRegionSelect" class="field-input" style="width:150px;padding:4px 8px;">
          <option value="1" selected>Vùng 1</option>
          <option value="2">Vùng 2</option>
        </select>
      </div>
      <div id="gasGrid" class="gas-grid"></div>
      <div id="gasUpdated" style="font-size:11px;color:var(--text-muted);margin-top:14px;line-height:1.6;"></div>
    `;
    renderGas('gasGrid', 'gasUpdated');
  }
}

function renderOverview(container) {
  // Extract indicator values
  const vni = state.vnindexData?.indices?.find(idx => idx.sym === 'VNINDEX' || idx.sym === '^VNINDEX.VN') || state.vnindexData?.indices?.[0];
  const vniPrice = vni ? parseFloat(vni.lastPrice ?? 0).toLocaleString('vi-VN', {maximumFractionDigits: 2}) : '—';
  const vniPct = vni ? parseFloat(vni.changePc ?? 0) : 0;
  const vniClr = vniPct === 0 ? '#fbbf24' : vniPct > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  const vniArrow = vniPct === 0 ? '—' : vniPct > 0 ? '▲' : '▼';
  const vniChange = vni ? parseFloat(vni.ot ?? 0) : 0;

  const btc = state.cryptoData?.find(c => c.id === 'bitcoin');
  const btcPrice = btc ? btc.current_price.toLocaleString('en-US', {style: 'currency', currency: 'USD'}) : '—';
  const btcPct = btc ? btc.price_change_percentage_24h : 0;
  const btcClr = btcPct === 0 ? '#fbbf24' : btcPct > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  const btcArrow = btcPct === 0 ? '—' : btcPct > 0 ? '▲' : '▼';

  const goldUsd = state.goldData?.price || 2300;
  const goldVnd = state.goldData?.vnPrices?.VNGSJC?.buy || (goldUsd * 10 * CONFIG.usdToVnd / 31.1035);
  const goldPrice = goldVnd ? Math.round(goldVnd / 10).toLocaleString('vi-VN') + ' ₫' : '—'; // per Chi
  const goldSource = state.goldData?.vnPrices ? 'SJC Việt Nam' : 'Spot Quốc tế';

  const ron95 = state.gasData?.prices?.find(p => p.name.toLowerCase().includes('ron 95')) || { r1: 22000 };
  const gasPrice = ron95.r1 ? ron95.r1.toLocaleString('vi-VN') + ' ₫' : '—';

  const usd = state.fxData?.find(r => r.cur === 'USD');
  const usdRate = usd ? Math.round(usd.rateToVnd).toLocaleString('vi-VN') + ' ₫' : '—';

  container.innerHTML = `
    <!-- Top KPI Grid -->
    <div class="finance-overview-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px;">
      
      <!-- VN-INDEX Card -->
      <div class="finance-kpi-card" onclick="switchFinanceTab('vnindex')" style="cursor:pointer;background:rgba(96,165,250,0.03);border:1px solid rgba(96,165,250,0.15);border-radius:12px;padding:16px;transition:all 0.2s;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:12px;font-weight:700;color:#60a5fa;">CHỨNG KHOÁN VN</span>
          <span style="font-size:10px;background:rgba(96,165,250,0.1);color:#60a5fa;padding:2px 6px;border-radius:4px;">HOSE</span>
        </div>
        <div style="font-size:24px;font-weight:800;color:var(--text-primary);margin-bottom:4px;">${vniPrice}</div>
        <div style="font-size:13px;font-weight:700;color:${vniClr};">
          ${vniArrow} ${Math.abs(vniChange).toFixed(2)} (${vniPct >= 0 ? '+' : ''}${vniPct.toFixed(2)}%)
        </div>
      </div>

      <!-- BITCOIN Card -->
      <div class="finance-kpi-card" onclick="switchFinanceTab('crypto')" style="cursor:pointer;background:rgba(251,191,36,0.03);border:1px solid rgba(251,191,36,0.15);border-radius:12px;padding:16px;transition:all 0.2s;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:12px;font-weight:700;color:#fbbf24;">TIỀN ĐIỆN TỬ</span>
          <span style="font-size:10px;background:rgba(251,191,36,0.1);color:#fbbf24;padding:2px 6px;border-radius:4px;">BTC/USD</span>
        </div>
        <div style="font-size:24px;font-weight:800;color:var(--text-primary);margin-bottom:4px;">${btcPrice}</div>
        <div style="font-size:13px;font-weight:700;color:${btcClr};">
          ${btcArrow} ${btcPct >= 0 ? '+' : ''}${btcPct.toFixed(2)}%
        </div>
      </div>

      <!-- GOLD Card -->
      <div class="finance-kpi-card" onclick="switchFinanceTab('gold')" style="cursor:pointer;background:rgba(167,139,250,0.03);border:1px solid rgba(167,139,250,0.15);border-radius:12px;padding:16px;transition:all 0.2s;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:12px;font-weight:700;color:#a78bfa;">GIÁ VÀNG</span>
          <span style="font-size:10px;background:rgba(167,139,250,0.1);color:#a78bfa;padding:2px 6px;border-radius:4px;">${goldSource}</span>
        </div>
        <div style="font-size:24px;font-weight:800;color:var(--text-primary);margin-bottom:4px;">${goldPrice}</div>
        <div style="font-size:12px;color:var(--text-muted);">Đơn vị: 1 chỉ vàng</div>
      </div>

      <!-- FUEL Card -->
      <div class="finance-kpi-card" onclick="switchFinanceTab('gas')" style="cursor:pointer;background:rgba(52,211,153,0.03);border:1px solid rgba(52,211,153,0.15);border-radius:12px;padding:16px;transition:all 0.2s;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:12px;font-weight:700;color:#34d399;">XĂNG DẦU</span>
          <span style="font-size:10px;background:rgba(52,211,153,0.1);color:#34d399;padding:2px 6px;border-radius:4px;">Petrolimex</span>
        </div>
        <div style="font-size:24px;font-weight:800;color:var(--text-primary);margin-bottom:4px;">${gasPrice}</div>
        <div style="font-size:12px;color:var(--text-muted);">RON 95-III (Vùng 1)</div>
      </div>

    </div>

    <!-- Secondary info table -->
    <div style="display:flex;gap:20px;flex-wrap:wrap;">
      <div style="flex:1.2;min-width:300px;">
        <div class="vni-section-label" style="margin-top:0;">Tóm Tắt Tỷ Giá & Chỉ Số Khác</div>
        <table class="fx-table" style="width:100%;font-size:13px;">
          <tbody>
            <tr>
 <td>USD / VND</td>
              <td style="text-align:right;font-weight:700;color:var(--accent-blue);">${usdRate}</td>
              <td style="text-align:right;font-size:11px;color:var(--text-muted);">Tỷ giá VCB</td>
            </tr>
            <tr>
 <td>EUR / VND</td>
              <td style="text-align:right;font-weight:700;color:var(--accent-blue);">
                ${state.fxData?.find(r => r.cur === 'EUR') ? Math.round(state.fxData.find(r => r.cur === 'EUR').rateToVnd).toLocaleString('vi-VN') + ' ₫' : '—'}
              </td>
              <td style="text-align:right;font-size:11px;color:var(--text-muted);">Tỷ giá VCB</td>
            </tr>
            <tr>
 <td>JPY / VND</td>
              <td style="text-align:right;font-weight:700;color:var(--accent-blue);">
                ${state.fxData?.find(r => r.cur === 'JPY') ? state.fxData.find(r => r.cur === 'JPY').rateToVnd.toFixed(2) + ' ₫' : '—'}
              </td>
              <td style="text-align:right;font-size:11px;color:var(--text-muted);">Tỷ giá VCB</td>
            </tr>
            <tr>
 <td>SJC Gold (Bán)</td>
              <td style="text-align:right;font-weight:700;color:var(--accent-yellow);">
                ${state.goldData?.vnPrices?.VNGSJC?.sell ? Math.round(state.goldData.vnPrices.VNGSJC.sell / 10).toLocaleString('vi-VN') + ' ₫' : '—'}
              </td>
              <td style="text-align:right;font-size:11px;color:var(--text-muted);">Thương hiệu SJC</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="flex:0.8;min-width:250px;">
        <div class="vni-section-label" style="margin-top:0;">Khuyến Nghị Đầu Tư</div>
        <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:10px;padding:16px;font-size:12px;line-height:1.6;color:var(--text-secondary);">
          Dữ liệu thị trường tài chính được tổng hợp từ Yahoo Finance, VPS, CoinGecko, Vietcombank và Petrolimex.<br/><br/>
          Mọi thông tin chỉ mang tính chất tham khảo, không phải lời khuyên đầu tư tài chính chính thức.
        </div>
      </div>
    </div>
  `;
}
