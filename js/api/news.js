/**
 * api/news.js — RSS feed reader via Cloudflare Function proxy
 */
import APP_CONFIG from '../../config.js';

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
  genk: {
    label: 'GenK',
    url: 'https://genk.vn/rss/tin-cong-nghe.rss',
    color: '#10b981',
    logo: '💻',
  },
  thanhnien: {
    label: 'Thanh Niên',
    url: 'https://thanhnien.vn/rss/home.rss',
    color: '#2563eb',
    logo: '📰',
  },
  vietnamnet: {
    label: 'VietnamNet',
    url: 'https://vietnamnet.vn/rss/tin-moi-nhat.rss',
    color: '#059669',
    logo: '🌐',
  },
  vtv: {
    label: 'VTV News',
    url: 'https://vtv.vn/tin-moi-nhat.rss',
    color: '#dc2626',
    logo: '📺',
  },
  tinhte: {
    label: 'Tinh Tế',
    url: 'https://tinhte.vn/rss',
    color: '#06b6d4',
    logo: '💡',
  },
  kenh14: {
    label: 'Kênh 14',
    url: 'https://kenh14.vn/home.rss',
    color: '#db2777',
    logo: '🌸',
  },
};

export function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'Vừa xong';
  if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

/** Fetch RSS via Cloudflare proxy */
export async function fetchNews(sourceKey = 'vnexpress', limit = 12) {
  const feed = FEEDS[sourceKey];
  if (!feed) return [];

  try {
    const res = await fetch(
      `/api/news?source=${encodeURIComponent(sourceKey)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();

    return items.slice(0, limit).map(item => ({
      title:   item.title || '',
      link:    item.link || '#',
      pubDate: item.pubDate || '',
      desc:    item.description || '',
      img:     item.image || '',
      source:  feed.label,
      color:   feed.color,
      logo:    feed.logo,
    }));
  } catch (err) {
    console.warn('[News]', sourceKey, err.message);
    return [];
  }
}

/** Fetch full article content via Cloudflare proxy */
export async function fetchArticle(articleUrl) {
  try {
    const res = await fetch(
      `/news-article?url=${encodeURIComponent(articleUrl)}`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[Article]', err.message);
    return null;
  }
}
