/**
 * 
 * components/ticker.js
 * Builds and updates the scrolling ticker tape.
 */

import { fmtPrice } from '../utils/formatters.js';
import { state } from '../store/state.js';
import { solarToLunar, canChiYear } from '../utils/lunar-calendar.js';
import { GAS_PRICES } from '../data/gas-prices.js';

/**
 * Rebuild the ticker track content from the latest live data.
 */
export function renderTicker() {
  const items = [];

  // ── 1. Lunar Calendar (Offline, always available) ──
  try {
    const now = new Date();
    const lunar = solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear());
    const canchi = canChiYear(lunar.year);
    items.push(
      `<span class="ticker-item">` +
      `<span class="symbol">Lịch Âm</span> ` +
      `<span class="val">${lunar.day}/${lunar.month} (${canchi})</span>` +
      `</span>`
    );
  } catch (err) {
    console.warn('[Ticker] Lunar Calendar error:', err);
  }

  // ── 2. Stock Indices (VN-Index, HNX, UPCOM) ──
  if (state.vnindexData?.indices?.length) {
    for (const idx of state.vnindexData.indices) {
      // Show major Vietnamese stock indices
      let label = idx.sym;
      if (idx.sym === 'HNXINDEX') label = 'HNX-Index';
      else if (idx.sym === 'UPINDEX') label = 'UPCOM';
      else if (idx.sym === '^VNINDEX.VN' || idx.sym === 'VNINDEX') label = 'VN-Index';
      else if (idx.sym === 'VN30') label = 'VN30';

      const price = parseFloat(idx.lastPrice ?? 0);
      const pct = parseFloat(idx.changePc ?? 0);
      if (price <= 0) continue;

      const sign = pct >= 0 ? '+' : '';
      const cls = pct >= 0 ? 'up' : 'dn';
      items.push(
        `<span class="ticker-item">` +
        `<span class="symbol">${label}</span> ` +
        `<span class="val">${price.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span> ` +
        `<span class="${cls}">${sign}${pct.toFixed(2)}%</span>` +
        `</span>`
      );
    }
  }

  // ── 2.5. Live Football Matches ──
  if (state.liveFootballMatches?.length) {
    for (const m of state.liveFootballMatches) {
      let scoreText = `${m.homeScore} - ${m.awayScore}`;
      if (m.homeShootout !== undefined && m.awayShootout !== undefined && m.homeShootout !== null && m.awayShootout !== null) {
        scoreText = `${m.homeScore} - ${m.awayScore} (${m.homeShootout}-${m.awayShootout} pen)`;
      }
      items.push(
        `<span class="ticker-item">` +
        `<span class="symbol" style="color:var(--accent-red);font-weight:700;">LIVE ${m.league}</span> ` +
        `<span class="val">${m.home} ${scoreText} ${m.away}</span> ` +
        `<span style="color:var(--accent-green);font-weight:600;margin-left:4px;">(${m.time})</span>` +
        `</span>`
      );
    }
  }

  // ── 3. Weather of Selected City ──
  if (state.weatherData) {
    try {
      const temp = Math.round(state.weatherData.main?.temp);
      let name = state.weatherData.name;
      if (name === 'Ho Chi Minh City' || name.includes('Hồ Chí Minh')) name = 'TP.HCM';
      else if (name === 'Hanoi' || name.includes('Hà Nội')) name = 'Hà Nội';
      const desc = state.weatherData.weather?.[0]?.description ?? '';
      items.push(
        `<span class="ticker-item">` +
        `<span class="symbol">Thời tiết ${name}</span> ` +
        `<span class="val">${temp}°C · ${desc}</span>` +
        `</span>`
      );
    } catch (err) {
      console.warn('[Ticker] Weather error:', err);
    }
  }

  // ── 4. AQI of Selected City ──
  if (state.aqiData) {
    const aqiVal = state.aqiData.aqi;
    let aqiLabel = 'Tốt';
    if (aqiVal > 300) aqiLabel = 'Nguy hiểm';
    else if (aqiVal > 200) aqiLabel = 'Rất có hại';
    else if (aqiVal > 150) aqiLabel = 'Có hại';
    else if (aqiVal > 100) aqiLabel = 'Không tốt';
    else if (aqiVal > 50) aqiLabel = 'Trung bình';

    let city = '';
    if (state.weatherData) {
      city = state.weatherData.name;
      if (city === 'Ho Chi Minh City' || city.includes('Hồ Chí Minh')) city = 'TP.HCM';
      else if (city === 'Hanoi' || city.includes('Hà Nội')) city = 'Hà Nội';
    }

    let color = 'var(--accent-green)';
    if (aqiVal > 150) color = 'var(--accent-red)';
    else if (aqiVal > 100) color = '#fb923c';
    else if (aqiVal > 50) color = '#facc15';

    items.push(
      `<span class="ticker-item">` +
      `<span class="symbol">️ AQI ${city}</span> ` +
      `<span class="val">${aqiVal}</span> ` +
      `<span style="color:${color};font-weight:600;">${aqiLabel}</span>` +
      `</span>`
    );
  }

  // ── 5. Gold Price (Spot + SJC) ──
  if (state.goldData?.price) {
    let goldText = `$${state.goldData.price.toLocaleString('en-US')}/oz`;
    if (state.goldData?.vnPrices) {
      const sjc = state.goldData.vnPrices.VNGSJC || state.goldData.vnPrices.BTSJC || state.goldData.vnPrices.SJL1L10;
      if (sjc?.sell) {
        goldText += ` · SJC: ${(sjc.sell / 1000000).toFixed(2)}M/lượng`;
      }
    }
    items.push(
      `<span class="ticker-item">` +
      `<span class="symbol">VÀNG</span> ` +
      `<span class="val">${goldText}</span>` +
      `</span>`
    );
  }

  // ── 6. Gas Prices (RON95-III, E5 RON92) ──
  let gasList = [...GAS_PRICES];
  if (state.gasData?.prices?.length) {
    gasList = GAS_PRICES.map(item => {
      const apiItem = state.gasData.prices.find(p => {
        const title = p.name.toLowerCase();
        const label = item.name.toLowerCase();
        if (label === 'ron 95-iii') return title.includes('ron 95') && title.includes('iii');
        if (label === 'e5 ron 92') return title.includes('ron 92');
        return false;
      });
      return {
        ...item,
        price: apiItem ? apiItem.r1 : item.price
      };
    });
  }
  for (const g of gasList.slice(0, 2)) {
    items.push(
      `<span class="ticker-item">` +
      `<span class="symbol">${g.name}</span> ` +
      `<span class="val">${g.price.toLocaleString('vi-VN')}₫/lít</span>` +
      `</span>`
    );
  }

  // ── 7. Crypto Prices (First 8 coins) ──
  if (state.cryptoData?.length) {
    for (const c of state.cryptoData.slice(0, 8)) {
      const chg = c.price_change_percentage_24h ?? 0;
      const sign = chg >= 0 ? '+' : '';
      const cls = chg >= 0 ? 'up' : 'dn';
      items.push(
        `<span class="ticker-item">` +
        `<span class="symbol">${c.symbol.toUpperCase()}</span> ` +
        `<span class="val">${fmtPrice(c.current_price)}</span> ` +
        `<span class="${cls}">${sign}${chg.toFixed(2)}%</span>` +
        `</span>`
      );
    }
  }

  // ── 8. FX rates (First 4 rates) ──
  if (state.fxData?.length) {
    for (const { cur, rateToVnd } of state.fxData.slice(0, 4)) {
      if (!rateToVnd) continue;
      items.push(
        `<span class="ticker-item">` +
        `<span class="symbol">${cur}/VND</span> ` +
        `<span class="val">${Math.round(rateToVnd).toLocaleString('vi-VN')}₫</span>` +
        `</span>`
      );
    }
  }

  const html = items.join('');
  // Duplicate for seamless infinite scroll
  const track = document.getElementById('tickerTrack');
  if (track) track.innerHTML = html + html;
}
