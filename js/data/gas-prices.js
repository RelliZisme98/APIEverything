/**
 * data/gas-prices.js
 * Static gas price data for Vietnam (updated manually each pricing cycle).
 * Source: Petrolimex – kỳ điều hành 05/06/2025
 */

export const GAS_PRICES = [
  {
    name:  'RON 95-IV',
    sub:   'Xăng cao cấp',
    price: 21930,
    unit:  'lít',
    color: '#60a5fa',
  },
  {
    name:  'RON 95-III',
    sub:   'Xăng thông thường',
    price: 21470,
    unit:  'lít',
    color: '#22d3ee',
  },
  {
    name:  'E5 RON 92',
    sub:   'Xăng sinh học',
    price: 20920,
    unit:  'lít',
    color: '#34d399',
  },
  {
    name:  'Dầu Diesel 0.05S',
    sub:   'Dầu thông thường',
    price: 18620,
    unit:  'lít',
    color: '#fbbf24',
  },
  {
    name:  'Dầu hỏa',
    sub:   'Kerosene',
    price: 18340,
    unit:  'lít',
    color: '#fb923c',
  },
  {
    name:  'Dầu mazut',
    sub:   'Dầu đốt lò',
    price: 15810,
    unit:  'kg',
    color: '#a78bfa',
  },
];

export const GAS_UPDATED = '05/06/2025';
export const GAS_SOURCE  = 'Petrolimex';
