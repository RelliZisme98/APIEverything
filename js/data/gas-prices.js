/**
 * data/gas-prices.js
 * Static gas price data for Vietnam (updated manually each pricing cycle).
 * Source: Bộ Công Thương / Petrolimex — kỳ điều hành 05/06/2026
 */

export const GAS_PRICES = [
  {
    name:  'RON 95-III',
    sub:   'Xăng thông thường',
    price: 21470,
    prev:  22080, // kỳ trước 26/05/2026
    unit:  'lít',
    color: '#60a5fa',
  },
  {
    name:  'E5 RON 92',
    sub:   'Xăng sinh học',
    price: 20920,
    prev:  21510,
    unit:  'lít',
    color: '#34d399',
  },
  {
    name:  'Dầu Diesel 0,05S',
    sub:   'Dầu phổ biến',
    price: 19940,
    prev:  20540,
    unit:  'lít',
    color: '#fbbf24',
  },
  {
    name:  'Dầu Diesel 0,001S',
    sub:   'Dầu công nghiệp cao',
    price: 21490,
    prev:  22090,
    unit:  'lít',
    color: '#f59e0b',
  },
  {
    name:  'Dầu hỏa',
    sub:   'Kerosene',
    price: 19590,
    prev:  20190,
    unit:  'lít',
    color: '#fb923c',
  },
  {
    name:  'Dầu mazut 180CST',
    sub:   'Dầu đốt lò',
    price: 15800,
    prev:  16200,
    unit:  'kg',
    color: '#a78bfa',
  },
];

export const GAS_UPDATED      = '05/06/2026';
export const GAS_NEXT_UPDATE  = '15/06/2026';
export const GAS_SOURCE       = 'Bộ Công Thương';
