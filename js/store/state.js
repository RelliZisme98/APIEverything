/**
 * store/state.js
 * Single source of truth for application state.
 *
 * API keys (OWM, GoldAPI, AQICN) đã được chuyển sang Cloudflare Secrets.
 * Không còn key nào ở phía frontend — tất cả gọi qua worker proxy.
 */

import APP_CONFIG from '../../config.js';

export const state = {
  cryptoData:   [],
  fxData:       [],
  weatherData:  null,
  goldData:     null,
  lastUpdate:   null,
  usdToVndLive: null,
};


/** Configuration constants — all sourced from config.js */
export const CONFIG = {
  cryptoIds:    APP_CONFIG.CRYPTO_IDS,
  fxCurrencies: APP_CONFIG.FX_CURRENCIES,
  usdToVnd:     APP_CONFIG.USD_TO_VND,
};
