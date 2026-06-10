/**
 * utils/formatters.js
 * Pure number / string formatting helpers — no DOM or side-effects.
 */

/** Format large USD numbers with B/M suffix */
export function fmtCap(n) {
  if (!n) return '—';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M';
  return '$' + n.toFixed(0);
}

/** Format a crypto price with appropriate decimal places */
export function fmtPrice(n) {
  if (n == null) return '—';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (n >= 1)    return '$' + n.toFixed(4);
  if (n >= 0.01) return '$' + n.toFixed(6);
  return '$' + n.toFixed(8);
}

/** Format a VND amount */
export function fmtVnd(n) {
  if (n == null) return '—';
  return Math.round(n).toLocaleString('vi-VN') + ' ₫';
}

/**
 * Render a percentage change as a coloured HTML span.
 * @param {number|null} v
 * @returns {string} HTML string
 */
export function pctHtml(v) {
  if (v == null) return '<span style="color:var(--text-muted)">—</span>';
  const color = v >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  const sign  = v >= 0 ? '+' : '';
  return `<span style="color:${color}">${sign}${v.toFixed(2)}%</span>`;
}

/** Return a CSS class string for a positive/negative change */
export function changeClass(v) {
  return v >= 0 ? 'change-up' : 'change-dn';
}
