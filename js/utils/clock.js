/**
 * utils/clock.js
 * Renders a live HH:MM:SS clock and date into DOM elements.
 */

const DAYS_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/**
 * Start the live clock and update it every second.
 * @param {string} timeId    – id of the element to show time HH:MM:SS
 * @param {string} [dateId]  – optional id of the element to show date
 * @param {string} [timeZone] – IANA timezone, defaults to Asia/Ho_Chi_Minh
 */
export function startClock(timeId, dateId = 'clockDate', timeZone = 'Asia/Ho_Chi_Minh') {
  const timeEl = document.getElementById(timeId);
  const dateEl = document.getElementById(dateId);

  const tick = () => {
    const now = new Date();
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString('vi-VN', { hour12: false, timeZone });
    }
    if (dateEl) {
      const d   = now.getDate().toString().padStart(2, '0');
      const m   = (now.getMonth() + 1).toString().padStart(2, '0');
      const y   = now.getFullYear();
      const day = DAYS_VI[now.getDay()];
      dateEl.textContent = `${day}, ${d}/${m}/${y}`;
    }
  };

  tick();
  setInterval(tick, 1000);
}
