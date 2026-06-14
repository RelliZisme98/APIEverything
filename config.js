
const APP_CONFIG = {

  // ── URL Worker (same-origin — tự động hoạt động trên Cloudflare Pages) ────────
  // Proxy URL để gọi đến các route trên worker (không có key nào phía frontend).
  TRAFFIC_PROXY_URL: 'https://everything.rellia.org',

  // ── Tỷ giá USD/VND dự phòng ──────────────────────────────────────────────────
  // ✅ Tỷ giá thực tế được tự động lấy từ open.er-api.com khi khởi động.
  // Giá trị này chỉ dùng làm DỰ PHÒNG nếu API không phản hồi được.
  USD_TO_VND: 25480,

  // ── Danh sách đồng tiền tỷ giá ───────────────────────────────────────────────
  // Thêm/bỏ mã tiền tệ theo nhu cầu (phải có trong Frankfurter/ECB)
  FX_CURRENCIES: ['USD', 'EUR', 'JPY', 'CNY', 'GBP', 'KRW', 'SGD', 'THB', 'AUD', 'HKD'],

  // ── Crypto IDs (CoinGecko) ────────────────────────────────────────────────────
  // Tham khảo: https://www.coingecko.com/en/api/documentation
  CRYPTO_IDS: [
    'bitcoin', 'ethereum', 'tether', 'bnb', 'solana',
    'usd-coin', 'xrp', 'dogecoin', 'cardano', 'avalanche-2',
    'chainlink', 'polkadot', 'tron', 'matic-network', 'litecoin',
  ],

  // ── Supabase Configuration (Tránh rò rỉ - Lưu trữ dưới dạng Secrets trên Worker) ──
  SUPABASE_URL: '',
  SUPABASE_KEY: '',

};

export default APP_CONFIG;
