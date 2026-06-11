/**
 * main.js
 * Application entry point.
 * Orchestrates initialization, data fetching, and periodic refresh.
 *
 * API keys are read exclusively from config.js — no UI input.
 */

// ── Utils ──
import { startClock } from './utils/clock.js';

// ── Store ──
import { state } from './store/state.js';

// ── API ──
import { fetchCryptoMarkets } from './api/crypto.js';
import { fetchExchangeRates } from './api/exchange.js';
import { fetchWeather, fetchForecast } from './api/weather.js';
import { fetchGoldPrice }     from './api/gold.js';

// ── Feature Components ──
import { initTrafficCard }                      from './components/traffic.js';
import { renderCalendar }                       from './components/calendar.js';
import { renderPowerOutage, searchPowerOutage } from './components/power-outage.js';
import { switchGoldUnit }                       from './components/gold.js';
import { renderQuickCities }                    from './components/weather.js';
import { renderAQI }                            from './components/aqi.js';
import { renderVNIndex }                        from './components/vnindex.js';
import { renderNews }                           from './components/news.js';
// New feature components
import { renderBankRates }   from './components/bank-rates.js';
import { renderFuelPrice }   from './components/fuel-price.js';
import { renderHolidays }    from './components/holidays.js';
import { renderTaxCalc }     from './components/tax-calc.js';
import { renderLottery }     from './components/lottery.js';
import { renderWorldClock, destroyWorldClock } from './components/world-clock.js';

// ── Render Components ──
import { renderTicker }        from './components/ticker.js';
import { renderCryptoGrid }    from './components/crypto-grid.js';
import { renderCryptoTable }   from './components/crypto-table.js';
import { renderMarketStats }   from './components/market-stats.js';
import { renderExchangeTable } from './components/exchange.js';
import { renderGas }           from './components/gas.js';
import { renderGold, renderGoldFallback } from './components/gold.js';
import {
  renderWeather,
  renderForecast,
  renderWeatherLoading,
  renderWeatherError,
  setWeatherBadge,
} from './components/weather.js';

// ════════════════════════════════════════════════════════════
// CLOCK
// ════════════════════════════════════════════════════════════
startClock('clockDisplay');

// ════════════════════════════════════════════════════════════
// CRYPTO
// ════════════════════════════════════════════════════════════
async function loadCrypto() {
  try {
    const coins = await fetchCryptoMarkets();
    renderCryptoGrid(coins);
    renderCryptoTable(coins);
    renderMarketStats(coins);
    renderTicker();
  } catch (err) {
    console.warn('[Crypto]', err);
    const grid = document.getElementById('cryptoGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="error-msg" style="grid-column:1/-1;">
          ⚠️ Không tải được dữ liệu crypto. Có thể do giới hạn tốc độ API (30 req/min).
          Thử làm mới sau ít giây.
        </div>`;
    }
  }
}

// ════════════════════════════════════════════════════════════
// EXCHANGE RATES
// ════════════════════════════════════════════════════════════
async function loadExchange() {
  try {
    const rows = await fetchExchangeRates();
    renderExchangeTable(rows);
    renderTicker();

    // After live USD/VND is fetched, re-render gold if already loaded
    // so it shows VND values with the real-time rate, not the config.js fallback
    if (state.goldData?.price) {
      renderGold(state.goldData.price, state.goldData.source);
    }
  } catch (err) {
    console.warn('[FX]', err);
    const tbody = document.getElementById('fxBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="error-msg">⚠️ Không tải được tỷ giá.</div></td></tr>`;
    }
  }
}

// ════════════════════════════════════════════════════════════
// GOLD
// ════════════════════════════════════════════════════════════
async function loadGold() {
  try {
    const { price, source } = await fetchGoldPrice();
    if (price) {
      state.goldData = { price, source };
      renderGold(price, source);
    } else {
      renderGoldFallback();
    }
  } catch (err) {
    console.warn('[Gold]', err);
    renderGoldFallback();
  }
}

// ════════════════════════════════════════════════════════════
// WEATHER
// ════════════════════════════════════════════════════════════
async function loadWeather(cityOverride) {
  if (!state.owmKey) {
    renderWeatherError(
      'Chưa cấu hình API key. Mở file <code>config.js</code> và điền vào <code>OWM_API_KEY</code>.'
    );
    setWeatherBadge(false);
    return;
  }

  const city = cityOverride
    ?? document.getElementById('cityInput')?.value?.trim()
    ?? 'Ho Chi Minh City';

  renderWeatherLoading();

  try {
    // Fetch current weather + 5-day forecast in parallel
    const [data, forecast] = await Promise.all([
      fetchWeather(city),
      fetchForecast(city),
    ]);
    renderWeather(data);
    if (forecast?.length) renderForecast(forecast);
    setWeatherBadge(true);
  } catch (err) {
    console.warn('[Weather]', err);
    renderWeatherError(err.message);
    setWeatherBadge(false);
  }
}

// ════════════════════════════════════════════════════════════
// REFRESH ALL
// ════════════════════════════════════════════════════════════
async function refreshAll() {
  const btn = document.getElementById('refreshBtn');
  btn?.classList.add('spinning');

  await Promise.all([
    loadCrypto(),
    loadExchange(),
    loadGold(),
    state.owmKey ? loadWeather() : Promise.resolve(),
    loadVNIndex(),
    loadNews(),
  ]);
  if (state.aqiToken) loadAQI();

  if (btn) btn.classList.remove('spinning');
  state.lastUpdate = new Date();
}

window.refreshAll        = refreshAll;
window.loadWeather       = loadWeather;
window.searchPowerOutage = searchPowerOutage;
window.switchGoldUnit    = switchGoldUnit;
window.selectCity        = (city) => {
  const inp = document.getElementById('cityInput');
  if (inp) inp.value = city;
  loadWeather(city);
};

// ── AQI load ──
async function loadAQI() { await renderAQI(); }

// ── VN-Index load ──
async function loadVNIndex() { await renderVNIndex(); }

// ── News load ──
async function loadNews() { await renderNews(); }

// ── Lazy-load new features on first visit ──
const _rendered = new Set();
const _originalSwitch = window.switchSection;
window.switchSection = (id) => {
  // Stop world clock if leaving that section
  if (!_rendered.has('world-clock') === false && id !== 'world-clock') {
    // don't destroy — let it keep ticking in background
  }
  if (_originalSwitch) _originalSwitch(id);
  else {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('section-' + id);
    if (target) target.classList.add('active');
    document.querySelectorAll('.sidebar-nav-item').forEach(item =>
      item.classList.toggle('active', item.dataset.section === id)
    );
    try { document.getElementById('sidebar').classList.remove('open'); } catch {}
    try { document.getElementById('sidebarOverlay').classList.remove('visible'); } catch {}
  }
  if (!_rendered.has(id)) {
    _rendered.add(id);
    if (id === 'bank-rates')  renderBankRates();
    if (id === 'fuel-price')  renderFuelPrice();
    if (id === 'holidays')    renderHolidays();
    if (id === 'tax-calc')    renderTaxCalc();
    if (id === 'lottery')     renderLottery();
    if (id === 'world-clock') renderWorldClock();
  }
};

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  renderGas();
  renderCalendar();
  renderPowerOutage();
  renderQuickCities();
  initTrafficCard();
  // Pre-render static/no-API sections immediately
  renderFuelPrice();
  renderHolidays();
  renderTaxCalc();
  _rendered.add('fuel-price');
  _rendered.add('holidays');
  _rendered.add('tax-calc');
  refreshAll();

  // Auto-refresh every 60 seconds
  setInterval(() => {
    loadCrypto();
    loadExchange();
    loadGold();
    if (state.owmKey)   loadWeather();
    if (state.aqiToken) loadAQI();
    loadVNIndex();
    loadNews();
    // Refresh bank rates if rendered
    if (_rendered.has('bank-rates')) renderBankRates();
  }, 60_000);
});

