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
import { renderFootball, fetchLiveScores }    from './components/football.js';
import { renderTravel }      from './components/travel.js';
import { renderTodo }        from './components/todo.js';
import { renderLookup }      from './components/lookup.js';
import { renderDownloader }  from './components/downloader.js';
import { renderMedia, loadMediaBackground }       from './components/media.js';
import { renderFileTools, renderAudioTools } from './components/file-tools.js';

// ── Render Components ──
import { initAIAssistant }     from './components/ai-assistant.js';
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
    renderTicker();
  } catch (err) {
    console.warn('[Gold]', err);
    renderGoldFallback();
    renderTicker();
  }
}

// ─── GAS ────────────────────────────────────────────────────
async function loadGas() {
  try {
    await fetchGasPrice();
    renderGas();
    renderTicker();
  } catch (err) {
    console.warn('[Gas]', err);
    renderGas();
    renderTicker();
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
    state.weatherForecast = forecast;

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

      // Only load/reload Windy map if coordinates changed or map container is empty
      const mapEl = document.getElementById('weatherWindyMap');
      const hasIframe = mapEl && mapEl.querySelector('iframe');
      if (!hasIframe || mapEl.dataset.lat != lat || mapEl.dataset.lon != lon) {
        renderWindyMap(lat, lon);
      }
    } else {
      if (forecast?.hourly?.length) renderHourly(forecast.hourly);
    }

    if (forecast?.daily?.length) renderForecast(forecast.daily);
    setWeatherBadge(true);
    renderTicker();
  } catch (err) {
    console.warn('[Weather]', err);
    renderWeatherError(err.message);
    setWeatherBadge(false);
    renderTicker();
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
    loadLiveFootball(),
    loadPowerOutages(),
    loadLotteryBackground(),
    loadMediaBackground(),
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
async function loadAQI(isSilent = false) { await renderAQI('aqiContent', isSilent); }

// ── VN-Index load ──
async function loadVNIndex(isSilent = false) { await renderVNIndex('vnindexContent', isSilent); }

// ── News load ──
async function loadNews(isSilent = false) { await renderNews('newsContent', isSilent); }

// ── Football Live load ──
async function loadLiveFootball() {
  try {
    const result = await fetchLiveScores();
    state.liveFootballMatches = result?.live || [];
    state.footballData = result?.all || [];
    renderTicker();
  } catch (err) {
    console.warn('[Live Football]', err);
  }
}

// ── Background Power Outages load for AI ──
async function loadPowerOutages() {
  state.powerOutageData = [];
  
  // 1. EVNSPC (Miền Nam)
  try {
    const res = await fetch('/power-outage?evn=spc&action=today');
    if (res.ok) {
      const text = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const rows = doc.querySelectorAll('tr');
      const items = [];
      if (rows.length > 1) {
        const headers = [...rows[0].querySelectorAll('th, td')].map(c => c.textContent.trim());
        for (let i = 1; i < rows.length; i++) {
          const cells = [...rows[i].querySelectorAll('td')];
          if (!cells.length) continue;
          const obj = { _raw: cells.map(c => c.textContent.trim()) };
          cells.forEach((td, idx) => {
            const header = headers[idx] || `col${idx}`;
            obj[header] = td.textContent.trim();
          });
          items.push(obj);
        }
      }
      const formatted = items.slice(0, 10).map(item => ({
        region: 'Miền Nam',
        area: item._raw?.[0] || Object.values(item)[0] || '',
        time: item._raw?.[1] || Object.values(item)[1] || '',
        district: item._raw?.[3] || Object.values(item)[3] || '',
        reason: item._raw?.[4] || Object.values(item)[4] || ''
      }));
      state.powerOutageData.push(...formatted);
    }
  } catch (err) {
    console.warn('[Power Outages SPC Background Load]', err);
  }

  // 2. EVNCPC (Miền Trung)
  try {
    const resCPC = await fetch('/power-outage?evn=cpc&action=today');
    if (resCPC.ok) {
      const json = await resCPC.json();
      const items = json.content || json.data || [];
      const formatted = items.slice(0, 10).map(it => ({
        region: 'Miền Trung',
        area: it.khuVuc || it.tenDonVi || '',
        time: it.khoangThoiGian || '',
        reason: it.reason || it.noiDung || ''
      }));
      state.powerOutageData.push(...formatted);
    }
  } catch (err) {
    console.warn('[Power Outages CPC Background Load]', err);
  }

  // 3. EVNHANOI (Hà Nội)
  try {
    const resHanoi = await fetch('/power-outage?evn=hanoi&action=today');
    if (resHanoi.ok) {
      const json = await resHanoi.json();
      const items = json.data?.listLichCatDienEvn || json.data || [];
      const formatted = items.slice(0, 10).map(it => ({
        region: 'Hà Nội',
        area: it.tenDonVi || it.tenKhuVuc || '',
        time: it.khoangThoiGian || (it.tuGio && it.denGio ? `${it.tuGio} - ${it.denGio}` : ''),
        reason: it.noidung || it.lyDo || ''
      }));
      state.powerOutageData.push(...formatted);
    }
  } catch (err) {
    console.warn('[Power Outages Hanoi Background Load]', err);
  }

  // 4. EVNNPC (Miền Bắc)
  try {
    const resNPC = await fetch('/power-outage?evn=npc&action=today');
    if (resNPC.ok) {
      const text = await resNPC.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const rows = doc.querySelectorAll('tr');
      const items = [];
      if (rows.length > 1) {
        const headers = [...rows[0].querySelectorAll('th, td')].map(c => c.textContent.trim());
        for (let i = 1; i < rows.length; i++) {
          const cells = [...rows[i].querySelectorAll('td')];
          if (!cells.length) continue;
          const obj = { _raw: cells.map(c => c.textContent.trim()) };
          cells.forEach((td, idx) => {
            const header = headers[idx] || `col${idx}`;
            obj[header] = td.textContent.trim();
          });
          items.push(obj);
        }
      }
      const formatted = items.slice(0, 10).map(item => ({
        region: 'Miền Bắc',
        area: item._raw?.[0] || Object.values(item)[0] || '',
        time: item._raw?.[1] || Object.values(item)[1] || '',
        district: item._raw?.[3] || Object.values(item)[3] || '',
        reason: item._raw?.[4] || Object.values(item)[4] || ''
      }));
      state.powerOutageData.push(...formatted);
    }
  } catch (err) {
    console.warn('[Power Outages NPC Background Load]', err);
  }
}

// ── Background Lottery load for AI ──
async function loadLotteryBackground() {
  try {
    const res = await fetch('/lottery?region=mien-bac');
    if (res.ok) {
      const data = await res.json();
      if (data && data.prizes) {
        state.lotteryData = {
          region: 'mien-bac',
          regionName: 'Miền Bắc',
          date: data.date || new Date().toLocaleDateString('vi-VN'),
          prizes: data.prizes.map(p => ({
            label: (p.label || '').replace(/&[a-z0-9#]+;/gi, '').replace(/<[^>]+>/g, '').trim(),
            numbers: p.numbers
          }))
        };
      }
    }
  } catch (err) {
    console.warn('[Lottery Background Load]', err);
  }

  try {
    const res = await fetch('/vietlott?game=power655');
    if (res.ok) {
      const data = await res.json();
      if (data && data.numbers) {
        state.vietlottData = {
          game: 'power655',
          gameName: 'Power 6/55',
          drawDate: data.drawDate,
          drawCode: data.drawCode,
          numbers: data.numbers,
          jackpot: data.jackpot
        };
      }
    }
  } catch (err) {
    console.warn('[Vietlott Background Load]', err);
  }
}

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
  initAIAssistant();
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
    loadWeather(null, true);
    loadAQI(true);
    loadVNIndex(true);
    loadNews(true);
    loadLiveFootball();
    loadPowerOutages();
    loadLotteryBackground();
    loadMediaBackground();
  }, 60_000);
});

