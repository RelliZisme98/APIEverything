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

/**
 * Maps WMO Weather Code to OpenWeatherMap icon code.
 */
function mapWmoToOwmIcon(code, isNight) {
  const suffix = isNight ? 'n' : 'd';
  if (code === 0) return '01' + suffix;
  if ([1, 2].includes(code)) return '02' + suffix;
  if (code === 3) return '03d';
  if ([45, 48].includes(code)) return '50d';
  if ([51, 53, 55, 56, 57].includes(code)) return '09d';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '10d';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '13d';
  if ([95, 96, 99].includes(code)) return '11d';
  return '03d';
}

/**
 * Fetch true hourly weather forecast from keyless Open-Meteo API.
 */
export async function fetchHourlyForecastFromOpenMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m&timezone=auto&forecast_days=2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không thể tải dữ liệu dự báo giờ từ Open-Meteo.');

  const data = await res.json();
  const hourly = data.hourly;
  if (!hourly || !hourly.time) return [];

  const times = hourly.time;
  const now = new Date();
  
  // Find index of the closest hour
  let startIndex = 0;
  let minDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    const diff = Math.abs(t.getTime() - now.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      startIndex = i;
    }
  }

  const hourlyList = [];
  // Slice next 24 hours
  for (let i = startIndex; i < startIndex + 24; i++) {
    if (i >= times.length) break;
    const time = new Date(times[i]);
    // Format as "HH:MM" (e.g., "08:00")
    const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const isNight = time.getHours() < 6 || time.getHours() > 18;
    const wmoCode = hourly.weather_code[i];
    const iconCode = mapWmoToOwmIcon(wmoCode, isNight);

    hourlyList.push({
      time: timeStr,
      temp: Math.round(hourly.temperature_2m[i]),
      icon: iconCode,
      pop: Math.round(hourly.precipitation_probability[i]),
      humidity: hourly.relative_humidity_2m[i],
      windKmh: Math.round(hourly.wind_speed_10m[i])
    });
  }

  return hourlyList;
}
