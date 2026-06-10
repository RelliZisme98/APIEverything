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
import { fetchWeather }       from './api/weather.js';
import { fetchGoldPrice }     from './api/gold.js';

// ── Feature Components ──
import { initTrafficCard }                      from './components/traffic.js';
import { renderCalendar }                       from './components/calendar.js';
import { renderPowerOutage, searchPowerOutage } from './components/power-outage.js';
import { switchGoldUnit }                       from './components/gold.js';
import { renderQuickCities }                    from './components/weather.js';

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
    const data = await fetchWeather(city);
    renderWeather(data);
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

  await Promise.allSettled([
    loadCrypto(),
    loadExchange(),
    loadGold(),
    state.owmKey ? loadWeather() : Promise.resolve(),
  ]);

  if (btn) btn.classList.remove('spinning');
  state.lastUpdate = new Date();
}

function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;

  const goldInput = document.getElementById('modalGoldKey');
  if (goldInput) {
    goldInput.value = state.goldKey;
  }

  modal.classList.add('open');
}

function saveAllKeys() {
  const goldInput = document.getElementById('modalGoldKey');
  if (goldInput) {
    const goldKey = goldInput.value.trim();
    state.goldKey = goldKey;
    localStorage.setItem('gold_api_key', goldKey);
  }

  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('open');
  }

  refreshAll();
}

window.refreshAll        = refreshAll;
window.loadWeather       = loadWeather;
window.searchPowerOutage = searchPowerOutage;
window.switchGoldUnit    = switchGoldUnit;
window.openSettingsModal = openSettingsModal;
window.saveAllKeys       = saveAllKeys;
window.selectCity        = (city) => {
  const inp = document.getElementById('cityInput');
  if (inp) inp.value = city;
  loadWeather(city);
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
  refreshAll();

  // Auto-refresh every 60 seconds
  setInterval(() => {
    loadCrypto();
    loadExchange();
    loadGold();
    if (state.owmKey) loadWeather();
  }, 60_000);
});
