/**
 * data/gas-prices.js
 * Static gas price data for Vietnam (updated manually each pricing cycle).
 * Source: Bộ Công Thương / Petrolimex — kỳ điều hành 11/06/2026
 */

export const GAS_PRICES = [
  {
    name:  'RON 95-III',
    sub:   'Xăng thông thường',
    price: 22060,
    prev:  22330,
    unit:  'lít',
    color: '#60a5fa',
  },
  {
    name:  'E5 RON 92',
    sub:   'Xăng sinh học',
    price: 21330,
    prev:  21780,
    unit:  'lít',
    color: '#34d399',
  },
  {
    name:  'Dầu Diesel 0,05S',
    sub:   'Dầu phổ biến',
    price: 25870,
    prev:  26860,
    unit:  'lít',
    color: '#fbbf24',
  },
  {
    name:  'Dầu Diesel 0,001S',
    sub:   'Dầu công nghiệp cao',
    price: 27130,
    prev:  28120,
    unit:  'lít',
    color: '#f59e0b',
  },
  {
    name:  'Dầu hỏa',
    sub:   'Kerosene',
    price: 25890,
    prev:  24960,
    unit:  'lít',
    color: '#fb923c',
  },
  {
    name:  'Dầu mazut 180CST',
    sub:   'Dầu đốt lò',
    price: 18608,
    prev:  19645,
    unit:  'kg',
    color: '#a78bfa',
  },
];

export const GAS_UPDATED      = '11/06/2026';
export const GAS_NEXT_UPDATE  = '18/06/2026';
export const GAS_SOURCE       = 'Bộ Công Thương / Petrolimex';
