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
import { fetchAQI }           from './api/aqi.js';

// ── Feature Components ──
// ── Feature Components ──
import { renderCalendar }                       from './components/calendar.js';
import { renderQuickCities }                    from './components/weather.js';
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
import { renderFinance, switchFinanceTab } from './components/finance.js';
import { renderFocus } from './components/focus.js';
import { renderQRCodeSuite } from './components/qrcode.js';
import { renderEmulatorSuite } from './components/emulator.js?v=1.1.0';
import { renderTypingTest } from './components/typing-test.js';
import { renderConverter, renderBMICalculator } from './components/converter.js';
import { renderIQ, renderEQ } from './components/iq-eq.js';

// ── Render Components ──
import { initAIAssistant }     from './components/ai-assistant.js?v=1.0.4';
import { renderTicker }        from './components/ticker.js';
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
    state.cryptoData = coins;
    renderFinance();
    renderTicker();
  } catch (err) {
    console.warn('[Crypto]', err);
    renderTicker();
  }
}

// ════════════════════════════════════════════════════════════
// EXCHANGE RATES
// ════════════════════════════════════════════════════════════
async function loadExchange() {
  try {
    renderBankRates().catch(e => console.warn('[VCB Rates]', e));

    const rows = await fetchExchangeRates();
    state.fxData = rows;
    renderFinance();
    renderTicker();
  } catch (err) {
    console.warn('[FX]', err);
  }
}

// ════════════════════════════════════════════════════════════
// GOLD
// ════════════════════════════════════════════════════════════
async function loadGold() {
  try {
    const data = await fetchGoldPrice();
    state.goldData = data;
    renderFinance();
    renderTicker();
  } catch (err) {
    console.warn('[Gold]', err);
    renderTicker();
  }
}

// ─── GAS ────────────────────────────────────────────────────
async function loadGas() {
  try {
    await fetchGasPrice();
    renderFinance();
    renderTicker();
  } catch (err) {
    console.warn('[Gas]', err);
    renderFinance();
    renderTicker();
  }
}

// ════════════════════════════════════════════════════════════
// WEATHER
// ════════════════════════════════════════════════════════════
async function loadWeather(cityOverride, isSilent = false) {
  const city = cityOverride
    ?? document.getElementById('cityInput')?.value?.trim()
    ?? 'Ho Chi Minh City';

  if (!isSilent) {
    renderWeatherLoading();
  }

  try {
    // Fetch current weather + 5-day forecast in parallel
    const [data, forecast] = await Promise.all([
      fetchWeather(city),
      fetchForecast(city),
    ]);
    state.weatherForecast = forecast;

    const lat = data.coord?.lat;
    const lon = data.coord?.lon;
    if (lat != null && lon != null) {
      await loadAQI(lat, lon);
    }

    renderWeather(data, forecast?.todayMinMax);

    // Fetch and render true hourly weather forecast (1-hour interval) from Open-Meteo
    if (lat != null && lon != null) {
      const hourlyList = await fetchHourlyForecastFromOpenMeteo(lat, lon).catch(() => null);
      if (hourlyList && hourlyList.length) {
        renderHourly(hourlyList);
      } else if (forecast?.hourly?.length) {
        renderHourly(forecast.hourly);
      }

      // Only load/reload Windy map if coordinates changed significantly or map container is empty
      const mapEl = document.getElementById('weatherWindyMap');
      const hasIframe = mapEl && mapEl.querySelector('iframe');
      const savedLat = mapEl ? parseFloat(mapEl.dataset.lat) : NaN;
      const savedLon = mapEl ? parseFloat(mapEl.dataset.lon) : NaN;
      const latChanged = isNaN(savedLat) || Math.abs(savedLat - lat) > 0.01;
      const lonChanged = isNaN(savedLon) || Math.abs(savedLon - lon) > 0.01;

      if (!hasIframe || latChanged || lonChanged) {
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
window.selectCity        = (city) => {
  const inp = document.getElementById('cityInput');
  if (inp) inp.value = city;
  loadWeather(city);
};

// ── AQI load ──
async function loadAQI(lat, lon) {
  let targetLat = lat;
  let targetLon = lon;
  if (targetLat == null || targetLon == null) {
    targetLat = state.weatherForecast?.lat ?? 10.823;
    targetLon = state.weatherForecast?.lon ?? 106.6296;
  }
  try {
    const aqiData = await fetchAQI(`geo:${targetLat};${targetLon}`);
    if (aqiData && aqiData.aqi != null && aqiData.aqi !== '-') {
      state.aqiData = {
        aqi: aqiData.aqi,
        iaqi: aqiData.iaqi || {},
        components: aqiData.components || {}
      };
      return;
    }

    // Fallback: OWM Air Pollution
    const res = await fetch(`/weather?endpoint=air_pollution&lat=${targetLat}&lon=${targetLon}`);
    if (res.ok) {
      const json = await res.json();
      const list = json.list?.[0];
      if (list) {
        const pm25 = list.components?.pm2_5 || 0;
        let aqi = 0;
        if (pm25 <= 12) aqi = (50/12)*pm25;
        else if (pm25 <= 35.4) aqi = 50 + (50/23.4)*(pm25-12);
        else if (pm25 <= 55.4) aqi = 100 + (50/20)*(pm25-35.4);
        else if (pm25 <= 150.4) aqi = 150 + (50/95)*(pm25-55.4);
        else if (pm25 <= 250.4) aqi = 200 + (100/100)*(pm25-150.4);
        else aqi = 300 + (200/250)*(pm25-250.4);

        state.aqiData = {
          aqi: Math.round(aqi),
          iaqi: {
            pm25: { v: pm25 },
            pm10: { v: list.components?.pm10 },
            o3: { v: list.components?.o3 }
          },
          components: list.components || {}
        };
      }
    }
  } catch (err) {
    console.warn('[AQI Load Error]', err);
  }
}

// ── VN-Index load ──
async function loadVNIndex(isSilent = false) {
  const container = document.getElementById('vnindexContent');
  if (container) {
    await renderVNIndex('vnindexContent', isSilent);
  } else {
    // Background fetch to populate global state for overview and AI assistant
    try {
      const res = await fetch('/vnindex?type=index');
      if (res.ok) {
        state.vnindexData = await res.json();
        const isOverviewActive = !document.querySelector('.finance-tab-btn') || 
                                 document.querySelector('.finance-tab-btn[data-tab="overview"]')?.classList.contains('active');
        if (isOverviewActive) {
          renderFinance();
        }
        renderTicker();
      }
    } catch (e) {
      console.warn('[VNIndex bg fetch failed]', e);
    }
  }
}

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

// ── Mappings for Dynamic Routing ──
const sectionToPathMap = {
  'finance': '/',
  'weather': '/weather',
  'news': '/news',
  'calendar': '/calendar',
  'travel': '/travel',
  'todo': '/todo',
  'lookup': '/lookup',
  'qrcode': '/qrcode',
  'emulator': '/games',
  'tax-calc': '/tax-calc',
  'typing-test': '/typing-test',
  'converter': '/converter',
  'bmi': '/bmi',
  'iq': '/iq',
  'eq': '/eq',
  'lottery': '/lottery',
  'world-clock': '/clock',
  'football': '/football',
  'downloader': '/downloader',
  'media': '/media',
  'focus': '/focus'
};

const pathToSectionMap = {
  '/': 'finance',
  '/finance': 'finance',
  '/weather': 'weather',
  '/news': 'news',
  '/calendar': 'calendar',
  '/travel': 'travel',
  '/todo': 'todo',
  '/lookup': 'lookup',
  '/qrcode': 'qrcode',
  '/games': 'emulator',
  '/emulator': 'emulator',
  '/tax-calc': 'tax-calc',
  '/typing-test': 'typing-test',
  '/converter': 'converter',
  '/bmi': 'bmi',
  '/iq': 'iq',
  '/eq': 'eq',
  '/lottery': 'lottery',
  '/clock': 'world-clock',
  '/world-clock': 'world-clock',
  '/football': 'football',
  '/downloader': 'downloader',
  '/media': 'media',
  '/focus': 'focus'
};

function getPathnameClean() {
  let p = window.location.pathname;
  if (p.endsWith('/') && p.length > 1) {
    p = p.slice(0, -1);
  }
  return p;
}

// ── Lazy-load new features on first visit ──
const _rendered = new Set();
const _originalSwitch = window.switchSection;
window.switchSection = (id, updateHistory = true) => {
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
    try {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      const toggleBtn = document.getElementById('sidebarToggle');
      const icon = toggleBtn ? toggleBtn.querySelector('i') : null;
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('visible');
      document.body.classList.remove('sidebar-open');
      if (icon) icon.className = 'fas fa-bars';
      if (toggleBtn) toggleBtn.setAttribute('title', 'Mở menu');
    } catch {}
  }
  if (!_rendered.has(id)) {
    _rendered.add(id);
    if (id === 'finance')     renderFinance();
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
    if (id === 'focus')       renderFocus();
    if (id === 'qrcode')      renderQRCodeSuite();
    if (id === 'emulator')    renderEmulatorSuite();
    if (id === 'typing-test') renderTypingTest();
    if (id === 'converter')   renderConverter();
    if (id === 'bmi')          renderBMICalculator();
    if (id === 'iq')           renderIQ();
    if (id === 'eq')           renderEQ();
  }

  // Push state to browser history if navigating via client click
  if (updateHistory) {
    const path = sectionToPathMap[id] || '/';
    if (window.location.pathname !== path) {
      window.history.pushState({ sectionId: id }, '', path);
    }
  }
};

// ── Handle back/forward navigation ──
window.addEventListener('popstate', (e) => {
  const cleanPath = getPathnameClean();
  const id = (e.state && e.state.sectionId) || pathToSectionMap[cleanPath] || 'finance';
  window.switchSection(id, false);
});

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  renderFinance();
  _rendered.add('finance');
  renderCalendar();
  renderQuickCities();
  initAIAssistant();
  // Pre-render static/no-API sections immediately
  renderTaxCalc();
  _rendered.add('tax-calc');

  // Handle initial page load section routing
  const cleanPath = getPathnameClean();
  const initialSection = pathToSectionMap[cleanPath] || 'finance';
  window.switchSection(initialSection, false);
  window.history.replaceState({ sectionId: initialSection }, '', window.location.pathname);

  refreshAll();

  // Auto-refresh every 60 seconds
  setInterval(() => {
    loadCrypto();
    loadExchange();
    loadGold();
    loadGas();
    loadWeather(null, true);
    loadVNIndex(true);
    loadNews(true);
    loadLiveFootball();
    loadPowerOutages();
    loadLotteryBackground();
    loadMediaBackground();
  }, 60_000);
});

