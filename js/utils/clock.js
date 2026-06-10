/**
 * utils/clock.js
 * Renders a live HH:MM:SS clock into a DOM element.
 */

/**
 * Start the live clock and update it every second.
 * @param {string} elementId  – id of the <span> to update
 * @param {string} [timeZone] – IANA timezone, defaults to Asia/Ho_Chi_Minh
 */
export function startClock(elementId, timeZone = 'Asia/Ho_Chi_Minh') {
  const el = document.getElementById(elementId);
  if (!el) return;

  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('vi-VN', {
      hour12: false,
      timeZone,
    });
  };

  tick();
  setInterval(tick, 1000);
}
