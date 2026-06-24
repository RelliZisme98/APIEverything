import APP_CONFIG from '../../config.js';

export const state = {
  cryptoData: [],
  fxData: [],
  weatherData: null,
  weatherForecast: null,
  goldData: null,
  gasData: null,
  vnindexData: null,
  aqiData: null,
  liveFootballMatches: [],
  footballData: [],
  lastUpdate: null,
  usdToVndLive: null,
  lotteryData: null,
  vietlottData: null,
  newsArticles: [],
  vcbRatesData: null,
  todoTasks: [],
  powerOutageData: [],
  moviesData: [],
  gamesData: [],
  upcomingEvents: [],
  flightSchedules: null,
};


/** Configuration constants — all sourced from config.js */
export const CONFIG = {
  cryptoIds: APP_CONFIG.CRYPTO_IDS,
  fxCurrencies: APP_CONFIG.FX_CURRENCIES,
  usdToVnd: APP_CONFIG.USD_TO_VND,
};
