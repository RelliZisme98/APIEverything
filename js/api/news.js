/**
 * api/news.js — RSS feed reader via Cloudflare Function proxy
 * Proxy: /news-rss?url=... (deployed at everything.rellia.org)
 */
import APP_CONFIG from '../../config.js';

const PROXY_BASE = APP_CONFIG.TRAFFIC_PROXY_URL || 'https://everything.rellia.org';

const FEEDS = {
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

export { FEEDS };

/** Fetch and parse RSS for a given source key */
export async function fetchNews(sourceKey = 'vnexpress', limit = 10) {
  const feed = FEEDS[sourceKey];
  if (!feed) return [];

  try {
    const proxyUrl = `${PROXY_BASE}/news-rss?url=${encodeURIComponent(feed.url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item')).slice(0, limit);

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

function stripHTML(str) {
  return str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
}

/** Format pubDate to relative time in Vietnamese */
export function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}
