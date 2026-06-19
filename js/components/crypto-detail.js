/**
 * components/crypto-detail.js
 * Renders an interactive 7-day SVG sparkline chart and real-time conversion calculator.
 */

import { CONFIG, state } from '../store/state.js';
import { fmtPrice, changeClass } from '../utils/formatters.js';

let activeCoin = null;
let currentFiat = 'VND'; // 'VND' or 'USD'

/**
 * Renders the detail card for the selected coin.
 * @param {Object} coin - CoinGecko market object
 */
export function renderCryptoDetail(coin) {
  if (!coin) return;
  activeCoin = coin;
  window.activeCryptoId = coin.id;

  const container = document.getElementById('cryptoDetailContainer');
  const card = document.getElementById('cryptoDetailCard');
  if (!container || !card) return;

  // Make the card visible
  card.style.display = 'block';

  // Calculate prices
  const usdRate = CONFIG.usdToVnd;
  const currentPriceUsd = coin.current_price;
  const currentPriceVnd = currentPriceUsd * usdRate;

  const chg = coin.price_change_percentage_24h ?? 0;
  const sign = chg >= 0 ? '+' : '';
  const cls = changeClass(chg);

  // Price absolute changes
  const absChgUsd = (coin.price_change_24h) ?? (currentPriceUsd * chg / 100);
  const absChgVnd = absChgUsd * usdRate;

  const sparkline = coin.sparkline_in_7d?.price || [];

  // Generate SVG chart HTML
  const chartHtml = generateSvgChart(sparkline, chg >= 0);

  // Render HTML structure
  container.innerHTML = `
    <!-- Left Column: Trend Chart -->
    <div class="crypto-detail-left">
      <div class="crypto-detail-header">
        <div class="crypto-detail-coin">
          <img src="${coin.image}" alt="${coin.name}" />
          <div>
            <div class="crypto-detail-title-text" id="detailCoinName">${coin.name}</div>
            <div class="crypto-detail-subtitle-text">${coin.symbol.toUpperCase()} · 7 Ngày Qua</div>
          </div>
        </div>
        <div class="crypto-detail-price-section">
          <div class="crypto-detail-price-vnd" id="detailPriceVnd">${currentPriceVnd.toLocaleString('vi-VN')} ₫</div>
          <div class="crypto-detail-price-usd" id="detailPriceUsd">$${fmtPrice(currentPriceUsd)}</div>
          <div class="crypto-detail-change-row ${cls}" id="detailChangeRow">
            <span>${sign}${chg.toFixed(2)}%</span>
            <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">
              (${chg >= 0 ? '+' : ''}${currentFiat === 'VND' ? absChgVnd.toLocaleString('vi-VN') + ' ₫' : '$' + fmtPrice(absChgUsd)}) hôm nay
            </span>
          </div>
        </div>
      </div>

      <div class="crypto-chart-wrap">
        ${chartHtml}
      </div>
    </div>

    <!-- Right Column: Converter Calculator -->
    <div class="crypto-converter-card">
      <div class="crypto-converter-title">
        <span>🧮</span> Bộ Quy Đổi Tiền Điện Tử
      </div>
      
      <!-- Crypto input -->
      <div class="crypto-conv-row">
        <input type="number" id="cryptoConvInput" class="crypto-conv-input" value="1" step="any" min="0" />
        <div class="crypto-conv-label-wrap">
          <img class="crypto-conv-icon" src="${coin.image}" alt="${coin.symbol}" />
          <span class="crypto-conv-symbol">${coin.symbol.toUpperCase()}</span>
        </div>
      </div>

      <div class="crypto-conv-arrow">⇅</div>

      <!-- Fiat input -->
      <div class="crypto-conv-row">
        <input type="number" id="fiatConvInput" class="crypto-conv-input" value="" step="any" min="0" />
        <div class="crypto-conv-label-wrap">
          <select id="fiatConvSelect" class="crypto-conv-select">
            <option value="VND" ${currentFiat === 'VND' ? 'selected' : ''}>🇻🇳 VND</option>
            <option value="USD" ${currentFiat === 'USD' ? 'selected' : ''}>🇺🇸 USD</option>
          </select>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners to the converter
  initConverter();

  // Attach hover interactivity to the chart
  initChartHover(sparkline, chg >= 0);
}

/**
 * Highlight active card in grid
 */
function highlightActiveGridItem(coinId) {
  document.querySelectorAll('.crypto-item').forEach(el => {
    el.classList.remove('active');
  });
  const gridItem = document.querySelector(`.crypto-item[onclick*="${coinId}"]`);
  if (gridItem) {
    gridItem.classList.add('active');
  }
}

/**
 * Handle coin selection from external elements
 * @param {string} coinId - CoinGecko coin id
 */
export function selectCrypto(coinId) {
  if (!state.cryptoData || state.cryptoData.length === 0) return;
  const coin = state.cryptoData.find(c => c.id === coinId) || state.cryptoData[0];
  if (coin) {
    window.activeCryptoId = coin.id;
    highlightActiveGridItem(coin.id);
    renderCryptoDetail(coin);
  }
}

// Attach to window so onclick handlers in HTML can find it
window.selectCrypto = selectCrypto;

/**
 * Generates the SVG path and gradient representation of the sparkline
 */
function generateSvgChart(prices, isUp) {
  if (!prices || prices.length < 2) {
    return `<div style="text-align:center;padding:80px 0;color:var(--text-muted);">Không có dữ liệu biểu đồ.</div>`;
  }

  const width = 600;
  const height = 200;
  const padding = 15;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  // Generate path points
  const points = prices.map((price, idx) => {
    const x = (idx / (prices.length - 1)) * width;
    const y = padding + ((max - price) / range) * (height - 2 * padding);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  const colorClass = isUp ? 'up' : 'dn';
  const strokeColor = isUp ? 'var(--accent-green)' : 'var(--accent-red)';
  const gradId = `cryptoGrad-${Math.random().toString(36).substr(2, 9)}`;

  return `
    <svg viewBox="0 0 ${width} ${height}" class="crypto-chart-svg" id="cryptoDetailSvg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.25"></stop>
          <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.00"></stop>
        </linearGradient>
      </defs>
      
      <!-- Area Fill -->
      <path d="${areaPath}" fill="url(#${gradId})"></path>
      
      <!-- Trend Line -->
      <path d="${linePath}" class="crypto-chart-line ${colorClass}"></path>
      
      <!-- Interactive elements (initially hidden) -->
      <line x1="0" y1="0" x2="0" y2="${height}" class="chart-hover-line" id="chartHoverLine" style="display:none;"></line>
      <circle cx="0" cy="0" class="chart-hover-dot ${colorClass}" id="chartHoverDot" style="display:none;"></circle>
    </svg>
  `;
}

/**
 * Initializes chart mouse interaction
 */
function initChartHover(prices, isUp) {
  const svg = document.getElementById('cryptoDetailSvg');
  const hoverLine = document.getElementById('chartHoverLine');
  const hoverDot = document.getElementById('chartHoverDot');
  if (!svg || !prices.length) return;

  const detailPriceVnd = document.getElementById('detailPriceVnd');
  const detailPriceUsd = document.getElementById('detailPriceUsd');

  // Baseline prices
  const currentPriceUsd = activeCoin.current_price;
  const currentPriceVnd = currentPriceUsd * CONFIG.usdToVnd;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const height = 200;
  const padding = 15;

  svg.addEventListener('mousemove', (e) => {
    const rect = svg.getBoundingClientRect();
    const xClient = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, xClient / rect.width));
    const idx = Math.round(pct * (prices.length - 1));

    if (prices[idx] !== undefined) {
      const priceVal = prices[idx];
      const x = (idx / (prices.length - 1)) * 600; // viewBox width is 600
      const y = padding + ((max - priceVal) / range) * (height - 2 * padding);

      // Show and position interactive elements
      hoverLine.setAttribute('x1', x);
      hoverLine.setAttribute('x2', x);
      hoverLine.style.display = 'block';

      hoverDot.setAttribute('cx', x);
      hoverDot.setAttribute('cy', y);
      hoverDot.style.display = 'block';

      // Update displayed price based on hover
      const hoverVnd = priceVal * CONFIG.usdToVnd;
      detailPriceVnd.textContent = `${hoverVnd.toLocaleString('vi-VN')} ₫`;
      detailPriceUsd.textContent = `$${fmtPrice(priceVal)}`;
    }
  });

  svg.addEventListener('mouseleave', () => {
    // Hide interactive elements
    hoverLine.style.display = 'none';
    hoverDot.style.display = 'none';

    // Restore real-time prices
    detailPriceVnd.textContent = `${currentPriceVnd.toLocaleString('vi-VN')} ₫`;
    detailPriceUsd.textContent = `$${fmtPrice(currentPriceUsd)}`;
  });
}

/**
 * Initializes the conversion calculator
 */
function initConverter() {
  const cryptoInput = document.getElementById('cryptoConvInput');
  const fiatInput = document.getElementById('fiatConvInput');
  const fiatSelect = document.getElementById('fiatConvSelect');

  if (!cryptoInput || !fiatInput || !fiatSelect || !activeCoin) return;

  const usdPrice = activeCoin.current_price;

  // Set initial fiat value
  updateFiatValue();

  // Input listeners
  cryptoInput.addEventListener('input', () => {
    const cryptoAmount = parseFloat(cryptoInput.value);
    if (!isNaN(cryptoAmount)) {
      const rate = currentFiat === 'VND' ? CONFIG.usdToVnd : 1;
      fiatInput.value = (cryptoAmount * usdPrice * rate).toFixed(2);
    } else {
      fiatInput.value = '';
    }
  });

  fiatInput.addEventListener('input', () => {
    const fiatAmount = parseFloat(fiatInput.value);
    if (!isNaN(fiatAmount)) {
      const rate = currentFiat === 'VND' ? CONFIG.usdToVnd : 1;
      cryptoInput.value = (fiatAmount / (usdPrice * rate)).toFixed(6);
    } else {
      cryptoInput.value = '';
    }
  });

  fiatSelect.addEventListener('change', () => {
    currentFiat = fiatSelect.value;
    updateFiatValue();
    
    // Update change description details below price
    const absChgUsd = activeCoin.price_change_24h ?? (usdPrice * (activeCoin.price_change_percentage_24h ?? 0) / 100);
    const absChgVnd = absChgUsd * CONFIG.usdToVnd;
    const detailChangeRow = document.getElementById('detailChangeRow');
    if (detailChangeRow) {
      const chg = activeCoin.price_change_percentage_24h ?? 0;
      const sign = chg >= 0 ? '+' : '';
      detailChangeRow.innerHTML = `
        <span>${sign}${chg.toFixed(2)}%</span>
        <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">
          (${chg >= 0 ? '+' : ''}${currentFiat === 'VND' ? absChgVnd.toLocaleString('vi-VN') + ' ₫' : '$' + fmtPrice(absChgUsd)}) hôm nay
        </span>
      `;
    }
  });

  function updateFiatValue() {
    const cryptoAmount = parseFloat(cryptoInput.value);
    if (!isNaN(cryptoAmount)) {
      const rate = currentFiat === 'VND' ? CONFIG.usdToVnd : 1;
      fiatInput.value = (cryptoAmount * usdPrice * rate).toFixed(2);
    } else {
      fiatInput.value = '';
    }
  }
}
