/**
 * api/news.js — RSS feed reader via Cloudflare Function proxy
 * Proxy at: everything.rellia.org/news-rss  (deployed with the site)
 */
import APP_CONFIG from '../../config.js';

const PROXY = (APP_CONFIG.TRAFFIC_PROXY_URL || 'https://everything.rellia.org');

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

function stripHTML(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

export function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'Vừa xong';
  if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

/** Fetch RSS via Cloudflare proxy (deployed alongside the site) */
export async function fetchNews(sourceKey = 'vnexpress', limit = 12) {
  const feed = FEEDS[sourceKey];
  if (!feed) return [];

  try {
    const res = await fetch(
      `${PROXY}/news-rss?url=${encodeURIComponent(feed.url)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!xml.includes('<item')) throw new Error('Invalid RSS');

    const parser = new DOMParser();
    const doc    = parser.parseFromString(xml, 'text/xml');
    const items  = Array.from(doc.querySelectorAll('item')).slice(0, limit);

    return items.map(item => {
      // Try to extract image from enclosure or media:content
      const enclosure = item.querySelector('enclosure');
      const media     = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0];
      const img       = enclosure?.getAttribute('url') || media?.getAttribute('url') || '';

      return {
        title:   item.querySelector('title')?.textContent?.trim()       ?? '',
        link:    item.querySelector('link')?.textContent?.trim()         ?? '#',
        pubDate: item.querySelector('pubDate')?.textContent?.trim()      ?? '',
        desc:    stripHTML(item.querySelector('description')?.textContent ?? ''),
        img,
        source:  feed.label,
        color:   feed.color,
        logo:    feed.logo,
      };
    });
  } catch (err) {
    console.warn('[News]', sourceKey, err.message);
    return [];
  }
}

/** Fetch full article content via Cloudflare proxy */
export async function fetchArticle(articleUrl) {
  try {
    const res = await fetch(
      `${PROXY}/news-article?url=${encodeURIComponent(articleUrl)}`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Article]', err.message);
    return null;
  }
}
