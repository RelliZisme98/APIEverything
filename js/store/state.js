/**
 * store/state.js
 * Single source of truth for application state.
 *
 * API keys are read ONLY from config.js.
 * No localStorage, no UI input — configure in config.js and done.
 */

import APP_CONFIG from '../../config.js';

export const state = {
  owmKey:       APP_CONFIG.OWM_API_KEY?.trim()  || '',
  goldKey:      APP_CONFIG.GOLD_API_KEY?.trim() || localStorage.getItem('gold_api_key') || '',
  cryptoData:   [],
  fxData:       [],
  weatherData:  null,
  goldData:     null,
  lastUpdate:   null,
  usdToVndLive: null,   // set to live rate after exchange API responds
};

/** Configuration constants — all sourced from config.js */
export const CONFIG = {
  cryptoIds:    APP_CONFIG.CRYPTO_IDS,
  fxCurrencies: APP_CONFIG.FX_CURRENCIES,
  usdToVnd:     APP_CONFIG.USD_TO_VND,
};
