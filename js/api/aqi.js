/**
 * api/aqi.js — Air Quality Index via AQICN worker proxy
 * Token lưu trong Cloudflare Secrets — không bao giờ lộ ra browser.
 */
import { state } from '../store/state.js';

export async function fetchAQI(station = 'ho-chi-minh-city') {
  const res = await fetch(`/aqi?station=${encodeURIComponent(station)}`);
  if (!res.ok) return null;
  const json = await res.json();
  if (json.status !== 'ok') return null;
  return json.data;
}

/** AQI level descriptor */
export function aqiLevel(aqi) {
 if (aqi == null) return { label: '—', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', emoji: '' };
 if (aqi <= 50) return { label: 'Tốt', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', emoji: '' };
 if (aqi <= 100) return { label: 'Trung bình', color: '#facc15', bg: 'rgba(250,204,21,0.1)', emoji: '' };
 if (aqi <= 150) return { label: 'Không tốt', color: '#fb923c', bg: 'rgba(251,146,60,0.1)', emoji: '' };
 if (aqi <= 200) return { label: 'Có hại', color: '#f87171', bg: 'rgba(248,113,113,0.1)', emoji: '' };
 if (aqi <= 300) return { label: 'Rất có hại', color: '#c084fc', bg: 'rgba(192,132,252,0.1)', emoji: '️' };
 return { label: 'Nguy hiểm', color: '#9f1239', bg: 'rgba(159,18,57,0.15)', emoji: '️' };
}
