/**
 * api/news.js — RSS feed reader
 * Primary: allorigins.win/raw (free, no key, returns XML directly, works from browser)
 * Fallback: Cloudflare Function proxy at everything.rellia.org/news-rss
 */
import APP_CONFIG from '../../config.js';

const ALLORIGINS = 'https://api.allorigins.win/raw?url=';
const PROXY_BASE = APP_CONFIG.TRAFFIC_PROXY_URL || 'https://everything.rellia.org';

export const FEEDS = {
  vnexpress: {
    label: 'VnExpress',
    url: 'https://vnexpress.net/rss/tin-moi-nhat.rss',
    color: '#3b82f6',
    logo: '🔵',
  },
  tuoitre: {
    label: 'Tuổi Trẻ',
    url: 'https://tuoitre.vn/rss/tin-moi-nhat.rss',
    color: '#ef4444',
    logo: '🔴',
  },
  dantri: {
    label: 'Dân Trí',
    url: 'https://dantri.com.vn/rss/home.rss',
    color: '#f59e0b',
    logo: '🟡',
  },
};

async function fetchRSS(rssUrl) {
  // 1. allorigins /raw — returns raw XML directly (no JSON wrapper)
  try {
    const res = await fetch(`${ALLORIGINS}${encodeURIComponent(rssUrl)}`);
    if (res.ok) {
      const text = await res.text();
      if (text.includes('<item>') || text.includes('<item ')) return text;
    }
  } catch (_) { /* fall through to proxy */ }

  // 2. Fallback: Cloudflare Function proxy
  try {
    const res = await fetch(`${PROXY_BASE}/news-rss?url=${encodeURIComponent(rssUrl)}`);
    if (res.ok) return await res.text();
  } catch (_) { /* give up */ }

  return null;
}

function stripHTML(str) {
  return str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
}

/** Format pubDate to relative time in Vietnamese */
export function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'Vừa xong';
  if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

/** Fetch and parse RSS for a given source key */
export async function fetchNews(sourceKey = 'vnexpress', limit = 12) {
  const feed = FEEDS[sourceKey];
  if (!feed) return [];

  try {
    const xml = await fetchRSS(feed.url);
    if (!xml) return [];

    const parser = new DOMParser();
    const doc    = parser.parseFromString(xml, 'text/xml');
    const items  = Array.from(doc.querySelectorAll('item')).slice(0, limit);

    return items.map(item => ({
      title:   item.querySelector('title')?.textContent?.trim() ?? '',
      link:    item.querySelector('link')?.textContent?.trim() ?? '#',
      pubDate: item.querySelector('pubDate')?.textContent?.trim() ?? '',
      desc:    stripHTML(item.querySelector('description')?.textContent ?? ''),
      source:  feed.label,
      color:   feed.color,
      logo:    feed.logo,
    }));
  } catch (err) {
    console.warn('[News]', sourceKey, err);
    return [];
  }
}
