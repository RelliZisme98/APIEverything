/**
 * components/news.js — RSS News reader with inline article viewer
 */
import { fetchNews, fetchArticle, relativeTime, FEEDS } from '../api/news.js';

let currentSource = 'vnexpress';
let currentArticles = [];

export async function renderNews(containerId = 'newsContent', isSilent = false) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!isSilent) {
    el.innerHTML = `<div class="news-loading">📰 Đang tải tin tức...</div>`;
  }

  // Source tabs
  const tabs = () => Object.entries(FEEDS).map(([key, feed]) => `
    <button class="news-tab ${key === currentSource ? 'active' : ''}"
            style="${key === currentSource ? `border-color:${feed.color}50;color:${feed.color};background:${feed.color}12;` : ''}"
            onclick="window.newsSelectSource('${key}')">
      ${feed.logo} ${feed.label}
    </button>
  `).join('');

  try {
    const articles = await fetchNews(currentSource, 12);
    currentArticles = articles;
    const feed = FEEDS[currentSource];

    if (!articles.length) {
      el.innerHTML = `
        <div class="news-tabs">${tabs()}</div>
        <div class="error-msg">⚠️ Không tải được tin tức. Cần deploy Cloudflare Functions lên <code>everything.rellia.org</code>. Xem file <code>functions/news-rss.js</code>.</div>`;
      return;
    }

    const cards = articles.map((a, i) => `
      <div class="news-card ${i === 0 ? 'news-card-featured' : ''}"
           role="button" tabindex="0"
           onclick="window.openNewsArticle(${i})"
           onkeydown="if(event.key==='Enter')window.openNewsArticle(${i})">
        ${a.img ? `<div class="news-thumb" style="background-image:url('${a.img}')"></div>` : ''}
        <div class="news-card-body">
          <div class="news-source-badge" style="background:${a.color}20;color:${a.color};">
            ${a.logo} ${a.source}
          </div>
          <div class="news-title">${a.title}</div>
          ${i === 0 && a.desc ? `<div class="news-desc">${a.desc}</div>` : ''}
          <div class="news-meta">🕒 ${relativeTime(a.pubDate)}</div>
        </div>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="news-tabs">${tabs()}</div>
      <div class="news-grid">${cards}</div>
      <div class="news-footer">
        Nguồn: <strong>${feed.label}</strong>
        &nbsp;·&nbsp; Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN')}
        &nbsp;·&nbsp; <span style="color:var(--text-muted)">Click bài để đọc ngay trên trang</span>
      </div>
    `;

    // Inject article reader overlay if not exists
    _ensureReaderDOM();

  } catch (err) {
    el.innerHTML = `<div class="news-tabs">${tabs()}</div><div class="error-msg">⚠️ ${err.message}</div>`;
  }
}

// ─── Inline Article Reader ──────────────────────────────────────────
function _ensureReaderDOM() {
  if (document.getElementById('newsReader')) return;
  const el = document.createElement('div');
  el.id = 'newsReader';
  el.innerHTML = `
    <div class="nr-backdrop" onclick="window.closeNewsReader()"></div>
    <div class="nr-panel" role="dialog" aria-modal="true">
      <div class="nr-header">
        <div class="nr-source" id="nrSource"></div>
        <div class="nr-header-actions">
          <a id="nrOpenLink" href="#" target="_blank" rel="noopener" class="nr-open-btn" title="Mở trang gốc">
            ↗ Trang gốc
          </a>
          <button class="nr-close-btn" onclick="window.closeNewsReader()" title="Đóng">✕</button>
        </div>
      </div>
      <div class="nr-body">
        <div id="nrThumb" class="nr-thumb"></div>
        <h1 id="nrTitle" class="nr-title"></h1>
        <div id="nrMeta" class="nr-meta"></div>
        <div id="nrContent" class="nr-content"></div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
}

window.openNewsArticle = async (idx) => {
  const article = currentArticles[idx];
  if (!article) return;

  _ensureReaderDOM();
  const reader = document.getElementById('newsReader');

  // Show with loading state
  document.getElementById('nrTitle').textContent   = article.title;
  document.getElementById('nrSource').innerHTML    = `<span style="color:${article.color}">${article.logo} ${article.source}</span>`;
  document.getElementById('nrMeta').textContent    = relativeTime(article.pubDate);
  document.getElementById('nrOpenLink').href       = article.link;
  document.getElementById('nrContent').innerHTML   =
    `<div class="nr-loading">⏳ Đang tải nội dung bài viết...</div>`;

  if (article.img) {
    document.getElementById('nrThumb').style.backgroundImage = `url('${article.img}')`;
    document.getElementById('nrThumb').style.display = 'block';
  } else {
    document.getElementById('nrThumb').style.display = 'none';
  }

  reader.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Fetch full article
  const data = await fetchArticle(article.link);

  if (data?.content && data.content.length > 100) {
    // Split into paragraphs
    const paragraphs = data.content
      .split(/(?<=[.!?।।])\s{2,}|(?<=\n)/)
      .filter(p => p.trim().length > 30)
      .map(p => `<p>${p.trim()}</p>`)
      .join('');
    document.getElementById('nrContent').innerHTML =
      paragraphs || `<p>${data.content}</p>`;
  } else {
    // Fallback: show desc + link
    document.getElementById('nrContent').innerHTML = `
      <p class="nr-excerpt">${article.desc || 'Không thể tải nội dung đầy đủ.'}</p>
      <div class="nr-fallback-note">
        Nội dung đầy đủ yêu cầu deploy Cloudflare Function.
        <a href="${article.link}" target="_blank" rel="noopener">Đọc trên trang gốc →</a>
      </div>`;
  }
};

window.closeNewsReader = () => {
  const reader = document.getElementById('newsReader');
  if (reader) reader.classList.remove('open');
  document.body.style.overflow = '';
};

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') window.closeNewsReader();
});

window.newsSelectSource = async (src) => {
  currentSource = src;
  await renderNews();
};
