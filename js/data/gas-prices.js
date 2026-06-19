/**
 * data/gas-prices.js
 * Static gas price data for Vietnam (updated manually each pricing cycle).
 * Source: Bộ Công Thương / Petrolimex — kỳ điều hành 18/06/2026
 */

export const GAS_PRICES = [
  {
    name:  'RON 95-III',
    sub:   'Xăng thông thường',
    price: 20750,
    prev:  22060,
    unit:  'lít',
    color: '#60a5fa',
  },
  {
    name:  'E5 RON 92',
    sub:   'Xăng sinh học',
    price: 20120,
    prev:  21330,
    unit:  'lít',
    color: '#34d399',
  },
  {
    name:  'Dầu Diesel 0,05S',
    sub:   'Dầu phổ biến',
    price: 23530,
    prev:  25870,
    unit:  'lít',
    color: '#fbbf24',
  },
  {
    name:  'Dầu Diesel 0,001S',
    sub:   'Dầu công nghiệp cao',
    price: 25430,
    prev:  27130,
    unit:  'lít',
    color: '#f59e0b',
  },
  {
    name:  'Dầu hỏa',
    sub:   'Kerosene',
    price: 22690,
    prev:  25890,
    unit:  'lít',
    color: '#fb923c',
  },
  {
    name:  'Dầu mazut 180CST',
    sub:   'Dầu đốt lò',
    price: 15800,
    prev:  18608,
    unit:  'kg',
    color: '#a78bfa',
  },
];

export const GAS_UPDATED      = '18/06/2026';
export const GAS_NEXT_UPDATE  = '25/06/2026';
export const GAS_SOURCE       = 'Bộ Công Thương / Petrolimex';
