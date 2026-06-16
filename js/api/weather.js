/**
 * api/weather.js
 * Fetches current weather + 5-day forecast via the secure /weather worker proxy.
 * API key is stored in Cloudflare Secrets — never exposed to the browser.
 */

import { state } from '../store/state.js';

const PROXY = ''; // same-origin (Cloudflare Pages + Worker)

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
export async function fetchWeather(city, _apiKey) {
  const url = `${PROXY}/weather?endpoint=weather&q=${encodeURIComponent(city)}&units=metric&lang=vi`;

  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 401) throw new Error('API key không hợp lệ hoặc chưa kích hoạt.');
    if (res.status === 404) throw new Error(`Không tìm thấy thành phố "${city}".`);
    if (res.status === 503) throw new Error('API key chưa được cấu hình trên server.');
    throw new Error(`Lỗi máy chủ thời tiết (HTTP ${res.status}).`);
  }

  const data = await res.json();
  state.weatherData = data;
  return data;
}

/**
 * Fetch 5-day / 3-hour forecast for a city (free OWM plan).
 * Returns list of daily summaries (1 entry per day, noon slot preferred).
 */
export async function fetchForecast(city, _apiKey) {
  const url = `${PROXY}/weather?endpoint=forecast&q=${encodeURIComponent(city)}&units=metric&lang=vi&cnt=40`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const list = data.list || [];

  // 1. Hourly Forecast: Next 8 slots (24 hours)
  const hourly = list.slice(0, 8).map(item => {
    const timeStr = item.dt_txt.split(' ')[1].slice(0, 5); // "HH:MM"
    const dateStr = item.dt_txt.split(' ')[0]; // "YYYY-MM-DD"
    return {
      time: timeStr,
      date: dateStr,
      dt: item.dt,
      temp: Math.round(item.main.temp),
      icon: item.weather[0]?.icon ?? '01d',
      desc: item.weather[0]?.description ?? '',
      pop: Math.round((item.pop ?? 0) * 100),
    };
  });

  // 2. Compute daily min/max from all slots
  const minMax = {};
  for (const item of list) {
    const date = item.dt_txt.split(' ')[0];
    if (!minMax[date]) {
      minMax[date] = { min: item.main.temp_min, max: item.main.temp_max };
    } else {
      minMax[date].min = Math.min(minMax[date].min, item.main.temp_min);
      minMax[date].max = Math.max(minMax[date].max, item.main.temp_max);
    }
  }

  // 3. Find today's actual min/max (using local date or closest forecast slots)
  // OWM dt_txt is UTC by default, but let's check first few slots.
  // We can just grab the min/max of the first 8 slots (next 24 hours) to be highly representative of "today" temp variations.
  const todayStr = list[0] ? list[0].dt_txt.split(' ')[0] : new Date().toISOString().split('T')[0];
  const todayMinMax = minMax[todayStr] || {
    min: Math.min(...list.slice(0, 8).map(i => i.main.temp_min)),
    max: Math.max(...list.slice(0, 8).map(i => i.main.temp_max)),
  };

  // 4. Group by date, pick noon slot (12:00) or midday-closest for future days
  const byDate = {};
  for (const item of list) {
    const date = item.dt_txt.split(' ')[0];
    const hour = parseInt(item.dt_txt.split(' ')[1]);
    if (date > todayStr) {
      if (!byDate[date]) {
        byDate[date] = item;
      } else {
        const curHour = parseInt(byDate[date].dt_txt.split(' ')[1]);
        if (Math.abs(hour - 12) < Math.abs(curHour - 12)) {
          byDate[date] = item;
        }
      }
    }
  }

  const daily = Object.entries(byDate)
    .slice(0, 5)
    .map(([date, item]) => ({
      date,
      dt: item.dt,
      icon: item.weather[0]?.icon ?? '01d',
      desc: item.weather[0]?.description ?? '',
      temp: Math.round(item.main.temp),
      tempMin: Math.round(minMax[date]?.min ?? item.main.temp_min),
      tempMax: Math.round(minMax[date]?.max ?? item.main.temp_max),
      humidity: item.main.humidity,
      windKmh: Math.round(item.wind.speed * 3.6),
      pop: Math.round((item.pop ?? 0) * 100),
    }));

  return {
    hourly,
    daily,
    todayMinMax
  };
}
