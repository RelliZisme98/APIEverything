/**
 * data/gold-brands.js
 * Vietnamese gold brand data with buy/sell price computation.
 * Prices are estimated from international XAU/USD + brand-specific premiums.
 *
 * Note: SJC has government-regulated premiums that can be 10–30% above international.
 * Other brands (DOJI, PNJ, BTMC) track closer to international + ~5-8%.
 */

/**
 * @typedef {Object} GoldBrand
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {string} type         – purity label
 * @property {number} buyPremium   – "Mua vào": shop buys FROM customer  (lower price for customer selling)
 * @property {number} sellPremium  – "Bán ra":  shop sells TO customer   (higher price for customer buying)
 * @property {string} color        – accent color for the brand card
 * @property {string} url          – official live price page
 * @property {string} note         – short description
 */

/**
 * Premiums calibrated against actual market data — June 10, 2026
 * Reference (BTMC actual): mua 13,370K/chỉ, bán 13,870K/chỉ
 * International base at time of calibration: ~13,086K/chỉ ($4,140/oz × 26,217 VND/USD)
 *   → BTMC buy premium:  (13,370 – 13,086) / 13,086 ≈ 2.2%
 *   → BTMC sell premium: (13,870 – 13,086) / 13,086 ≈ 6.0%
 *
 * SJC trades at a slightly higher premium due to government regulation.
 * Non-SJC brands (DOJI, PNJ, BTMC, Bảo Tín Việt) track closer to international.
 *
 * ⚠️  These premiums drift daily — check brand websites for exact prices.
 */

/** @type {GoldBrand[]} */
export const GOLD_BRANDS = [
  {
    id: 'sjc',
    name: 'SJC',
    icon: '🏆',
    type: 'Vàng miếng 24K (999.9)',
    buyPremium: 0.030,  // mua vào ~3% above international
    sellPremium: 0.075,  // bán ra  ~7.5% above international
    color: '#fbbf24',
    url: 'https://sjc.com.vn/bieu-do-gia-vang',
    note: 'Vàng miếng quốc gia · Nhà nước bảo hộ',
  },
  {
    id: 'doji',
    name: 'DOJI',
    icon: '💎',
    type: 'Vàng nữ trang & miếng (999)',
    buyPremium: 0.022,  // ~2.2%
    sellPremium: 0.060,  // ~6.0%
    color: '#a78bfa',
    url: 'https://giavang.doji.vn/',
    note: 'Tập đoàn vàng bạc đá quý DOJI',
  },
  {
    id: 'pnj',
    name: 'PNJ',
    icon: '💍',
    type: 'Vàng nữ trang (610 – 750)',
    buyPremium: 0.020,  // ~2.0%
    sellPremium: 0.065,  // ~6.5%
    color: '#34d399',
    url: 'https://www.pnj.com.vn/blog/gia-vang/',
    note: 'Phú Nhuận Jewelry · Hơn 350 cửa hàng',
  },
  {
    id: 'btmc',
    name: 'Bảo Tín Minh Châu',
    icon: '⭐',
    type: 'Vàng miếng & nữ trang (999)',
    buyPremium: 0.022,  // calibrated: actual 13,370K vs intl 13,086K → 2.17%
    sellPremium: 0.060,  // calibrated: actual 13,870K vs intl 13,086K → 5.98%
    color: '#60a5fa',
    url: 'https://btmc.vn/gia-vang-theo-ngay.html',
    note: 'Bảo Tín Minh Châu · Uy tín hơn 30 năm',
  },
  {
    id: 'btmh',
    name: 'Bảo Tín Mạnh Hải',
    icon: '🥇',
    type: 'Vàng miếng & nhẫn (999.9)',
    buyPremium: 0.022,  // ~2.2%
    sellPremium: 0.065,  // ~6.5%
    color: '#fb923c',
    url: 'https://baotinmanhhai.vn/vi',
    note: 'Bảo Tín Mạnh Hải · Uy tín từ 1992',
  },
];

/** Units used for display */
export const GOLD_UNITS = {
  LUONG: { label: '1 lượng (37.5g)', grams: 37.5 },
  CHI: { label: '1 chỉ (3.75g)', grams: 3.75 },
  GRAM: { label: '1 gram', grams: 1 },
};

/**
 * Compute buy/sell prices for a brand given international XAU/USD spot.
 * @param {GoldBrand} brand
 * @param {number}    xauUsd   – international spot (USD per troy oz)
 * @param {number}    usdVnd   – USD/VND exchange rate
 * @returns {{ buyVnd, sellVnd, buyPerChi, sellPerChi }}
 */
export function computeBrandPrices(brand, xauUsd, usdVnd) {
  const gramsPerOz = 31.1035;
  const xauVndPerGram = (xauUsd / gramsPerOz) * usdVnd;

  const buyPerGram = xauVndPerGram * (1 + brand.buyPremium);
  const sellPerGram = xauVndPerGram * (1 + brand.sellPremium);

  const grams = GOLD_UNITS.CHI.grams;
  return {
    buyPerChi: Math.round(buyPerGram * grams),
    sellPerChi: Math.round(sellPerGram * grams),
    buyPerLuong: Math.round(buyPerGram * GOLD_UNITS.LUONG.grams),
    sellPerLuong: Math.round(sellPerGram * GOLD_UNITS.LUONG.grams),
  };
}
