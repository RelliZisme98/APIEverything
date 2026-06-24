/**
 * functions/news-article.js
 * Cloudflare Pages Function — proxy article content for inline reading
 * URL: /news-article?url=https://vnexpress.net/article-slug.html
 */
export async function onRequest(context) {
  const { request } = context;
  const origin = request.headers.get('Origin') || '*';

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const url       = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  const ALLOWED_DOMAINS = [
    'vnexpress.net',
    'tuoitre.vn',
    'dantri.com.vn',
    'thanhnien.vn',
    'baomoi.com',
    'nhandan.vn',
    'genk.vn',
    'vietnamnet.vn',
    'vtv.vn',
    'kenh14.vn',
  ];

  let targetHost;
  try {
    targetHost = new URL(targetUrl).hostname;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
    });
  }

  if (!ALLOWED_DOMAINS.some(d => targetHost === d || targetHost.endsWith('.' + d))) {
    return new Response(JSON.stringify({ error: 'Domain not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
    });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RelliaBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi-VN,vi;q=0.9',
      },
      redirect: 'follow',
    });

    const html = await res.text();

    // Extract article content using simple heuristics
    const article = await extractArticle(html, targetUrl);

    return new Response(JSON.stringify(article), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': origin,
        'Cache-Control': 'public, max-age=600', // cache 10 mins
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
    });
  }
}

async function extractArticle(html, targetUrl) {
  let title = '';
  let description = '';
  let content = '';
  let publishedAt = '';
  let thumbnail = '';

  let inContentCount = 0;
  let skipCount = 0;

  const rewriter = new HTMLRewriter()
    .on('meta[property="og:title"]', { element(el) { if (!title) title = el.getAttribute('content'); } })
    .on('title', { text(chunk) { if (!title) title += chunk.text; } })
    .on('meta[property="og:description"]', { element(el) { if (!description) description = el.getAttribute('content'); } })
    .on('meta[name="description"]', { element(el) { if (!description) description = el.getAttribute('content'); } })
    .on('meta[property="og:image"]', { element(el) { if (!thumbnail) thumbnail = el.getAttribute('content'); } })
    .on('meta[property="article:published_time"]', { element(el) { if (!publishedAt) publishedAt = el.getAttribute('content'); } })
    .on('script, style, figure.video, .relate, .box-related, .banner, .tin-lien-quan, .related-news, .box-comment, .author-info, .box-share, .post-tags, .article-bottom, .box-author, .comment-wrapper, .fb-comments, #comments, .tags, .social-share, .author-wrap, .author, .source, .box-category, .box-tintuclienquan, .relate-container, .box-tin-lien-quan, [data-role="comment"]', {
      element(el) {
        skipCount++;
        el.onEndTag(() => { skipCount--; });
      }
    })
    .on('p, br, div, h1, h2, h3, h4, h5, h6, li', {
      element(el) {
        if (inContentCount > 0 && skipCount === 0) {
          content += '\n';
        }
      }
    })
    .on('article.fck_detail, .detail-content, .singular-content, .klw-body-top, .detail-cmain, .detail__cmain, .article-content, .article-body, .chi-tiet-bai-viet, #main-detail, .article-detail, .maincontent, .content-detail, .post-content, .knc-content, .vtv-detail-content, #entry-body, article, main', {
      element(el) {
        inContentCount++;
        el.onEndTag(() => { inContentCount--; });
      },
      text(chunk) {
        if (inContentCount > 0 && skipCount === 0) {
          content += chunk.text;
        }
      }
    });

  await rewriter.transform(new Response(html)).text();

  content = content.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
  title = title ? decode(title).trim() : '';
  description = description ? decode(description).trim() : '';

  return { title, description, content: content || description, publishedAt, thumbnail, url: targetUrl };
}

function decode(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
