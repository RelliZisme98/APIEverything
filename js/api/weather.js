/**
 * api/weather.js
 * Fetches current weather data from OpenWeatherMap.
 * Requires a free API key: https://openweathermap.org/api
 */

import { state } from '../store/state.js';

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

/** Emoji weather icons keyed by OWM icon code */
export const WEATHER_ICONS = {
  '01d': '☀️',  '01n': '🌙',
  '02d': '⛅', '02n': '⛅',
  '03d': '☁️',  '03n': '☁️',
  '04d': '☁️',  '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌦️',
  '11d': '⛈️', '11n': '⛈️',
  '13d': '❄️',  '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
};

/**
 * Fetch current weather for a city.
 * @param {string} city     – City name (e.g. "Ho Chi Minh City")
 * @param {string} [apiKey] – OWM API key; falls back to state.owmKey
 * @returns {Promise<Object>} OWM weather response
 * @throws {Error} with a user-friendly Vietnamese message
 */
export async function fetchWeather(city, apiKey) {
  const key = apiKey || state.owmKey;
  if (!key) throw new Error('Chưa có API key. Vui lòng nhập trong ⚙️ Cài đặt.');

  const url =
    `${BASE_URL}/weather` +
    `?q=${encodeURIComponent(city)}` +
    `&appid=${key}` +
    `&units=metric` +
    `&lang=vi`;

  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 401) throw new Error('API key không hợp lệ hoặc chưa kích hoạt.');
    if (res.status === 404) throw new Error(`Không tìm thấy thành phố "${city}".`);
    throw new Error(`Lỗi máy chủ thời tiết (HTTP ${res.status}).`);
  }

  const data = await res.json();
  state.weatherData = data;
  return data;
}
