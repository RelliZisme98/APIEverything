/**
 * config.js
 * ════════════════════════════════════════════
 * CẤU HÌNH API KEYS & THÔNG SỐ ỨNG DỤNG
 * ════════════════════════════════════════════
 *
 * ► Điền API key của bạn vào đây để không cần nhập lại mỗi lần.
 * ► Key sẽ được tự động ưu tiên hơn key lưu trong localStorage.
 * ► Để trống ("") nếu bạn không có key hoặc muốn nhập qua giao diện.
 *
 * ⚠️  KHÔNG chia sẻ file này nếu bạn đã điền key thật vào đây.
 */

const APP_CONFIG = {

  // ── OpenWeatherMap ─────────────────────────────────────────
  // Lấy key miễn phí tại: https://openweathermap.org/api
  // Gói Free: 60 req/phút, 1,000,000 req/tháng
  OWM_API_KEY: 'da9f770c8cb4fa4c253c1aa2523dfbf1',

  // ── GoldAPI.io ─────────────────────────────────────────────
  // Lấy key miễn phí tại: https://www.goldapi.io
  // Gói Free: 100 req/ngày
  GOLD_API_KEY: 'goldapi-e662baae3dbf2a06936d59d2e8559150-io',

  // ── Tra cứu phạt nguội (CORS Proxy) ──────────────────────
  // Dùng Cloudflare Pages Function (file: functions/phat-nguoi.js)
  // Tự động available tại: https://everything.rellia.org/phat-nguoi
  // Không cần Worker riêng — push code lên là tự deploy.
  TRAFFIC_PROXY_URL: 'https://everything.rellia.org',

  // ── Tỷ giá USD/VND dự phòng ──────────────────────────────
  // ✅ Tỷ giá thực tế được tự động lấy từ open.er-api.com khi khởi động.
  // Giá trị này chỉ dùng làm DỰ PHÒNG nếu API không phản hồi được.
  USD_TO_VND: 25480,

  // ── Danh sách đồng tiền tỷ giá ───────────────────────────
  // Thêm/bỏ mã tiền tệ theo nhu cầu (phải có trong Frankfurter/ECB)
  FX_CURRENCIES: ['USD', 'EUR', 'JPY', 'CNY', 'GBP', 'KRW', 'SGD', 'THB', 'AUD', 'HKD'],

  // ── Crypto IDs (CoinGecko) ────────────────────────────────
  // Tham khảo: https://www.coingecko.com/en/api/documentation
  CRYPTO_IDS: [
    'bitcoin', 'ethereum', 'tether', 'bnb', 'solana',
    'usd-coin', 'xrp', 'dogecoin', 'cardano', 'avalanche-2',
    'chainlink', 'polkadot', 'tron', 'matic-network', 'litecoin',
  ],

};

export default APP_CONFIG;
