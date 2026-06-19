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
import { fetchWeather, fetchForecast, fetchHourlyForecastFromOpenMeteo } from './api/weather.js';
import { fetchGoldPrice }     from './api/gold.js';
import { fetchGasPrice }      from './api/gas.js';

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
import { renderTaxCalc }     from './components/tax-calc.js';
import { renderLottery }     from './components/lottery.js';
import { renderWorldClock, destroyWorldClock } from './components/world-clock.js';
import { renderFootball }    from './components/football.js';
import { renderTravel }      from './components/travel.js';
import { renderTodo }        from './components/todo.js';
import { renderLookup }      from './components/lookup.js';
import { renderDownloader }  from './components/downloader.js';
import { renderMedia }       from './components/media.js';
import { renderFileTools, renderAudioTools } from './components/file-tools.js';

// ── Render Components ──
import { renderTicker }        from './components/ticker.js';
import { renderCryptoGrid }    from './components/crypto-grid.js';
import { renderCryptoTable }   from './components/crypto-table.js';
import { renderMarketStats }   from './components/market-stats.js';
import { selectCrypto }        from './components/crypto-detail.js';
import { renderExchangeTable } from './components/exchange.js';
import { renderGas }           from './components/gas.js';
import { renderGold, renderGoldFallback } from './components/gold.js';
import {
  renderWeather,
  renderForecast,
  renderHourly,
  renderWeatherLoading,
  renderWeatherError,
  setWeatherBadge,
  renderWindyMap,
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
    
    // Automatically select the active coin or default to the first coin (Bitcoin)
    const currentActiveId = window.activeCryptoId || (coins[0]?.id) || 'bitcoin';
    selectCrypto(currentActiveId);

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
    // Tải song song hoặc ngầm tỷ giá Vietcombank
    renderBankRates().catch(e => console.warn('[VCB Rates]', e));

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
    const data = await fetchGoldPrice();
    if (data && data.price) {
      renderGold(data.price, data.source);
    } else {
      renderGoldFallback();
    }
  } catch (err) {
    console.warn('[Gold]', err);
    renderGoldFallback();
  }
}

// ─── GAS ────────────────────────────────────────────────────
async function loadGas() {
  try {
    await fetchGasPrice();
    renderGas();
  } catch (err) {
    console.warn('[Gas]', err);
    renderGas();
  }
}

// ════════════════════════════════════════════════════════════
// WEATHER
// ════════════════════════════════════════════════════════════
async function loadWeather(cityOverride) {
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
    renderWeather(data, forecast?.todayMinMax);

    // Fetch and render true hourly weather forecast (1-hour interval) from Open-Meteo
    const lat = data.coord?.lat;
    const lon = data.coord?.lon;
    if (lat != null && lon != null) {
      const hourlyList = await fetchHourlyForecastFromOpenMeteo(lat, lon).catch(() => null);
      if (hourlyList && hourlyList.length) {
        renderHourly(hourlyList);
      } else if (forecast?.hourly?.length) {
        renderHourly(forecast.hourly);
      }
      renderWindyMap(lat, lon);
    } else {
      if (forecast?.hourly?.length) renderHourly(forecast.hourly);
    }

    if (forecast?.daily?.length) renderForecast(forecast.daily);
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
    loadGas(),
    loadWeather(),
    loadVNIndex(),
    loadNews(),
    loadAQI(),
  ]);

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
    if (id === 'tax-calc')    renderTaxCalc();
    if (id === 'lottery')     renderLottery();
    if (id === 'world-clock') renderWorldClock();
    if (id === 'football')    renderFootball();
    if (id === 'travel')      renderTravel();
    if (id === 'todo')        renderTodo();
    if (id === 'lookup')      renderLookup();
    if (id === 'downloader')  {
      renderDownloader();
      renderFileTools();
      renderAudioTools();
    }
    if (id === 'media')       renderMedia();
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
  renderTaxCalc();
  _rendered.add('tax-calc');
  refreshAll();

  // Auto-refresh every 60 seconds
  setInterval(() => {
    loadCrypto();
    loadExchange();
    loadGold();
    loadGas();
    loadWeather();
    loadAQI();
    loadVNIndex();
    loadNews();
  }, 60_000);
});

