/**
 * components/news.js — RSS News reader
 */
import { fetchNews, relativeTime, FEEDS } from '../api/news.js';

let currentSource = 'vnexpress';

export async function renderNews(containerId = 'newsContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">📰 Đang tải tin tức...</div>`;

  // Source tabs
  const tabs = Object.entries(FEEDS).map(([key, feed]) => `
    <button class="news-tab ${key === currentSource ? 'active' : ''}"
            style="${key === currentSource ? `border-color:${feed.color}50;color:${feed.color};background:${feed.color}12;` : ''}"
            onclick="window.newsSelectSource('${key}')">
      ${feed.logo} ${feed.label}
    </button>
  `).join('');

  try {
    const articles = await fetchNews(currentSource, 12);
    const feed = FEEDS[currentSource];

    if (!articles.length) {
      el.innerHTML = `
        <div class="news-tabs">${tabs}</div>
        <div class="error-msg">⚠️ Không tải được tin tức. Thử lại sau.</div>`;
      return;
    }

    const cards = articles.map((a, i) => `
      <a class="news-card ${i === 0 ? 'news-card-featured' : ''}"
         href="${a.link}" target="_blank" rel="noopener">
        <div class="news-source-badge" style="background:${a.color}20;color:${a.color};">
          ${a.logo} ${a.source}
        </div>
        <div class="news-title">${a.title}</div>
        ${i === 0 && a.desc ? `<div class="news-desc">${a.desc}</div>` : ''}
        <div class="news-meta">🕒 ${relativeTime(a.pubDate)}</div>
      </a>
    `).join('');

    el.innerHTML = `
      <div class="news-tabs">${tabs}</div>
      <div class="news-grid">${cards}</div>
      <div class="news-footer">
        Nguồn: <a href="${feed.url.replace('/rss','').replace('.rss','')}" target="_blank" style="color:var(--accent-blue);">${feed.label}</a>
        · Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN')}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `
      <div class="news-tabs">${tabs}</div>
      <div class="error-msg">⚠️ ${err.message}</div>`;
  }
}

window.newsSelectSource = async (src) => {
  currentSource = src;
  await renderNews();
};
