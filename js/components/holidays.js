/**
 * components/holidays.js
 * Lịch nghỉ lễ & ngày quan trọng Việt Nam (Dương lịch + Âm lịch tự động tính)
 * Tự động đồng bộ các ngày quan trọng của cá nhân từ lịch âm dương.
 */

import { solarToLunar } from '../utils/lunar-calendar.js';
import { state } from '../store/state.js';

// Standard Solar Holidays and Events
const STATIC_SOLAR_EVENTS = [
  { month: 1,  day: 1,  name: 'Tết Dương lịch',           type: 'holiday', icon: '🎌', note: 'Nghỉ 1 ngày' },
  { month: 2,  day: 3,  name: 'Ngày thành lập Đảng Cộng sản Việt Nam', type: 'event', icon: '🚩' },
  { month: 2,  day: 14, name: 'Lễ tình nhân (Valentine)',  type: 'event',   icon: '💝' },
  { month: 2,  day: 27, name: 'Ngày Thầy thuốc Việt Nam',  type: 'event',   icon: '🩺' },
  { month: 3,  day: 8,  name: 'Ngày Quốc tế Phụ nữ 8/3',   type: 'event',   icon: '🌹' },
  { month: 3,  day: 26, name: 'Ngày thành lập Đoàn TNCS Hồ Chí Minh', type: 'event', icon: '⚡' },
  { month: 4,  day: 30, name: 'Ngày Giải phóng Miền Nam 30/4', type: 'holiday', icon: '🎌', note: 'Nghỉ cùng 1/5' },
  { month: 5,  day: 1,  name: 'Ngày Quốc tế Lao động 1/5', type: 'holiday', icon: '🎌', note: 'Nghỉ 1 ngày' },
  { month: 5,  day: 19, name: 'Ngày sinh Chủ tịch Hồ Chí Minh', type: 'event', icon: '⭐' },
  { month: 6,  day: 1,  name: 'Ngày Quốc tế Thiếu nhi 1/6', type: 'event',   icon: '👶' },
  { month: 6,  day: 28, name: 'Ngày Gia đình Việt Nam',    type: 'event',   icon: '👨‍👩‍👧‍👦' },
  { month: 7,  day: 27, name: 'Ngày Thương binh Liệt sĩ',  type: 'event',   icon: '🕯️' },
  { month: 8,  day: 19, name: 'Ngày Cách mạng tháng Tám',   type: 'event',   icon: '✊' },
  { month: 9,  day: 2,  name: 'Ngày Quốc khánh 2/9',       type: 'holiday', icon: '🎌', note: 'Nghỉ 2 ngày (2/9–3/9)' },
  { month: 10, day: 10, name: 'Ngày Giải phóng Thủ đô',     type: 'event',   icon: '🏰' },
  { month: 10, day: 20, name: 'Ngày Phụ nữ Việt Nam 20/10', type: 'event',   icon: '🌸' },
  { month: 11, day: 20, name: 'Ngày Nhà giáo Việt Nam 20/11', type: 'event',  icon: '📚' },
  { month: 12, day: 22, name: 'Ngày thành lập Quân đội ND VN', type: 'event',  icon: '🛡️' },
  { month: 12, day: 25, name: 'Giáng sinh (Noel)',          type: 'event',   icon: '🎄' },
];

// Standard Traditional Lunar Holidays and Events (Month, Day)
const STATIC_LUNAR_EVENTS = [
  { lMonth: 1,  lDay: 1,  name: 'Tết Nguyên Đán (Mùng 1)',  type: 'holiday', icon: '🎆', note: 'Nghỉ Tết Nguyên Đán' },
  { lMonth: 1,  lDay: 2,  name: 'Tết Nguyên Đán (Mùng 2)',  type: 'holiday', icon: '🎆', note: 'Nghỉ Tết Nguyên Đán' },
  { lMonth: 1,  lDay: 3,  name: 'Tết Nguyên Đán (Mùng 3)',  type: 'holiday', icon: '🎆', note: 'Nghỉ Tết Nguyên Đán' },
  { lMonth: 1,  lDay: 15, name: 'Rằm tháng Giêng (Tết Nguyên Tiêu)', type: 'event', icon: '🌕' },
  { lMonth: 3,  lDay: 10, name: 'Giỗ Tổ Hùng Vương (10/3 âm)', type: 'holiday', icon: '🏔️', note: 'Nghỉ 1 ngày' },
  { lMonth: 4,  lDay: 15, name: 'Lễ Phật Đản (15/4 âm)',    type: 'event',   icon: '🕌' },
  { lMonth: 5,  lDay: 5,  name: 'Tết Đoan Ngọ (5/5 âm)',      type: 'event',   icon: '🍎' },
  { lMonth: 7,  lDay: 15, name: 'Lễ Vu Lan / Rằm tháng 7',  type: 'event',   icon: '👻' },
  { lMonth: 8,  lDay: 15, name: 'Tết Trung Thu (15/8 âm)',    type: 'event',   icon: '🥮' },
  { lMonth: 12, lDay: 23, name: 'Ngày tiễn Táo Quân về trời', type: 'event',   icon: '🐟' },
  { lMonth: 12, lDay: 30, name: 'Giao thừa / Tất niên',      type: 'event',   icon: '🎇' },
];

/**
 * Scan for the next occurrence of a lunar date starting today.
 * @returns {Date}
 */
function getNextLunarOccurrence(lMonth, lDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Scan up to 385 days ahead to find a matching lunar day
  for (let i = 0; i <= 385; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const lun = solarToLunar(d.getDate(), d.getMonth() + 1, d.getFullYear());
    if (lun.month === lMonth && lun.day === lDay) {
      return d;
    }
  }
  return null;
}

/**
 * Get next occurrence of a solar date
 * @returns {Date}
 */
function getNextSolarOccurrence(month, day) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const curYear = today.getFullYear();
  let target = new Date(curYear, month - 1, day);
  if (target < today) {
    target = new Date(curYear + 1, month - 1, day);
  }
  return target;
}

export function renderHolidays(containerId = 'holidaysContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingList = [];

  // 1. Process static solar holidays
  STATIC_SOLAR_EVENTS.forEach(e => {
    const nextDate = getNextSolarOccurrence(e.month, e.day);
    upcomingList.push({
      name: e.name,
      type: e.type,
      icon: e.icon,
      note: e.note,
      dateObj: nextDate,
    });
  });

  // 2. Process static lunar holidays
  STATIC_LUNAR_EVENTS.forEach(e => {
    const nextDate = getNextLunarOccurrence(e.lMonth, e.lDay);
    if (nextDate) {
      upcomingList.push({
        name: e.name,
        type: e.type,
        icon: e.icon,
        note: e.note,
        dateObj: nextDate,
        isLunar: true,
        lunarDesc: `${e.lDay}/${e.lMonth} âm`,
      });
    }
  });

  // 3. Process custom events from local storage
  const customEvents = JSON.parse(localStorage.getItem('rellia_custom_events') || '[]');
  customEvents.forEach(e => {
    let nextDate;
    if (e.dateType === 'solar') {
      nextDate = getNextSolarOccurrence(e.month, e.day);
    } else {
      nextDate = getNextLunarOccurrence(e.month, e.day);
    }

    if (nextDate) {
      upcomingList.push({
        name: `📌 [Cá nhân] ${e.name}`,
        type: 'custom',
        icon: '👤',
        note: e.dateType === 'lunar' ? `${e.day}/${e.month} âm` : `${e.day}/${e.month} dương`,
        dateObj: nextDate,
        customEventId: e.id,
      });
    }
  });

  // Sort by date ascending and filter out past dates (if any)
  const sortedUpcoming = upcomingList
    .filter(e => e.dateObj >= today)
    .sort((a, b) => a.dateObj - b.dateObj);

  // Update state for AI assistant
  state.upcomingEvents = sortedUpcoming.map(h => ({
    name: h.name,
    type: h.type,
    date: h.dateObj.toLocaleDateString('vi-VN'),
    daysLeft: Math.ceil((h.dateObj - today) / 86400000),
    note: h.note || ''
  }));

  // Render items
  const items = sortedUpcoming.slice(0, 15).map(h => {
    const diff = Math.ceil((h.dateObj - today) / 86400000);
    const isHoliday = h.type === 'holiday';
    const isCustom = h.type === 'custom';
    const icon = h.icon ?? (isHoliday ? '🎌' : '📅');
    
    let clr = '#60a5fa'; // event blue
    if (isHoliday) clr = '#f87171'; // holiday red
    else if (isCustom) clr = '#22d3ee'; // custom cyan

    const dateStr = h.dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    let countdownLabel;
    if (diff === 0)      countdownLabel = `<span style="color:#4ade80;font-weight:700;">Hôm nay! 🎉</span>`;
    else if (diff === 1) countdownLabel = `<span style="color:#fbbf24;">Ngày mai</span>`;
    else                 countdownLabel = `<span style="color:${clr};">Còn ${diff} ngày</span>`;

    const noteText = h.note ? ` · ${h.note}` : '';

    return `
      <div class="hl-item ${isHoliday ? 'hl-item--holiday' : ''} ${isCustom ? 'hl-item--custom' : ''}"
           ${isCustom ? `style="cursor: pointer;" onclick="window._calEditCustomEvent('${h.customEventId}')"` : ''}>
        <div class="hl-icon" style="background: ${clr}12; color: ${clr};">${icon}</div>
        <div class="hl-body">
          <div class="hl-name" style="${isCustom ? 'color: var(--accent-cyan); font-weight: 500;' : ''}">${h.name}</div>
          <div class="hl-date">${dateStr}${noteText}</div>
        </div>
        <div class="hl-countdown">${countdownLabel}</div>
      </div>`;
  }).join('');

  // Next major official holiday countdown
  const nextHoliday = sortedUpcoming.find(h => h.type === 'holiday');
  let heroHtml = '';
  if (nextHoliday) {
    const diff = Math.ceil((nextHoliday.dateObj - today) / 86400000);
    heroHtml = `
      <div class="hl-hero">
        <div class="hl-hero-label">🎌 Kỳ nghỉ tiếp theo</div>
        <div class="hl-hero-name">${nextHoliday.name}</div>
        <div class="hl-hero-date">${nextHoliday.dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
        <div class="hl-hero-countdown">
          <div class="hl-hero-num">${diff}</div>
          <div class="hl-hero-unit">ngày nữa</div>
        </div>
      </div>`;
  }

  el.innerHTML = `
    ${heroHtml}
    <div class="hl-section-header">
      <div class="hl-section-label" style="margin-bottom: 0;">📅 Lịch ngày lễ & sự kiện sắp tới</div>
      <button class="cal-btn-add" onclick="window._calOpenAddEventModal()">
        + Thêm sự kiện
      </button>
    </div>
    <div class="hl-list">${items}</div>
    <div class="hl-note">* Các ngày lễ âm lịch được tính toán động dựa trên thuật toán lịch Việt Nam. Các sự kiện cá nhân có thể được thêm từ nút "Thêm sự kiện" hoặc bằng cách chọn ngày trên mini calendar.</div>`;
}
