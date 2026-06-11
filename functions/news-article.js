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
    const article = extractArticle(html, targetUrl);

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

function extractArticle(html, url) {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const title = titleMatch ? decode(titleMatch[1].trim()) : '';

  // Extract description/lead
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const description = descMatch ? decode(descMatch[1].trim()) : '';

  // Extract published time
  const dateMatch = html.match(/published_time["']\s*content=["']([^"']+)/i)
    || html.match(/datePublished["']\s*:\s*["']([^"']+)/i)
    || html.match(/<time[^>]+datetime=["']([^"']+)/i);
  const publishedAt = dateMatch ? dateMatch[1].trim() : '';

  // Extract main article text
  // Try common article containers
  let content = '';
  const selectors = [
    // VnExpress
    /<article[^>]*class="[^"]*fck_detail[^"]*"[^>]*>([\s\S]*?)<\/article>/i,
    // Tuổi Trẻ
    /<div[^>]*class="[^"]*detail-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*relate/i,
    // Dân Trí
    /<div[^>]*class="[^"]*singular-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*class="[^"]*relate|<section)/i,
    // Generic article tag
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    // Generic main
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  for (const re of selectors) {
    const m = html.match(re);
    if (m && m[1] && m[1].length > 200) {
      content = m[1];
      break;
    }
  }

  // Strip all HTML tags, scripts, styles
  content = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Fallback to description
  if (!content || content.length < 100) content = description;

  // Extract thumbnail image
  const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const thumbnail = imgMatch ? imgMatch[1].trim() : '';

  return { title, description, content, publishedAt, thumbnail, url };
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
