/**
 * components/holidays.js — Lịch nghỉ lễ & ngày quan trọng Việt Nam 2026-2027
 */

const HOLIDAYS_2026 = [
  { date: '2026-01-01', name: 'Tết Dương lịch',           type: 'holiday', note: '1 ngày nghỉ' },
  { date: '2026-01-27', name: 'Nghỉ Tết Nguyên Đán',       type: 'holiday', note: '5 ngày (27/1–31/1)', end: '2026-01-31' },
  { date: '2026-04-06', name: 'Giỗ Tổ Hùng Vương (10/3)',  type: 'holiday', note: '1 ngày nghỉ' },
  { date: '2026-04-30', name: 'Ngày Giải phóng 30/4',      type: 'holiday', note: '2 ngày (30/4–1/5)', end: '2026-05-01' },
  { date: '2026-05-01', name: 'Ngày Quốc tế Lao động',     type: 'holiday', note: 'Nghỉ cùng 30/4' },
  { date: '2026-09-02', name: 'Ngày Quốc khánh 2/9',       type: 'holiday', note: '2 ngày nghỉ', end: '2026-09-03' },
  { date: '2026-11-24', name: 'Ngày Văn hóa Việt Nam',       type: 'holiday', note: '1 ngày nghỉ', icon: '🎭' },
  // Important events
  { date: '2026-02-14', name: 'Valentine',                  type: 'event', icon: '💝' },
  { date: '2026-03-08', name: 'Quốc tế Phụ nữ 8/3',       type: 'event', icon: '🌹' },
  { date: '2026-06-01', name: 'Ngày Quốc tế Thiếu nhi',    type: 'event', icon: '👶' },
  { date: '2026-10-20', name: 'Ngày Phụ nữ Việt Nam',      type: 'event', icon: '🌸' },
  { date: '2026-11-20', name: 'Ngày Nhà giáo Việt Nam',    type: 'event', icon: '📚' },
  { date: '2026-12-25', name: 'Giáng sinh',                 type: 'event', icon: '🎄' },
  // 2027 Tet
  { date: '2027-01-01', name: 'Tết Dương lịch 2027',       type: 'holiday', note: '1 ngày' },
  { date: '2027-02-15', name: 'Nghỉ Tết Nguyên Đán 2027',  type: 'holiday', note: 'Dự kiến 5 ngày', end: '2027-02-21' },
  { date: '2027-11-24', name: 'Ngày Văn hóa Việt Nam 2027', type: 'holiday', note: '1 ngày nghỉ', icon: '🎭' },
];

export function renderHolidays(containerId = 'holidaysContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = HOLIDAYS_2026
    .map(h => ({ ...h, dateObj: new Date(h.date) }))
    .filter(h => h.dateObj >= today)
    .sort((a, b) => a.dateObj - b.dateObj)
    .slice(0, 12);

  const items = upcoming.map(h => {
    const diff = Math.ceil((h.dateObj - today) / 86400000);
    const isHoliday = h.type === 'holiday';
    const icon = h.icon ?? (isHoliday ? '🎌' : '📅');
    const clr  = isHoliday ? '#f87171' : '#60a5fa';
    const dateStr = h.dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    let countdownLabel;
    if (diff === 0)      countdownLabel = `<span style="color:#4ade80;font-weight:700;">Hôm nay! 🎉</span>`;
    else if (diff === 1) countdownLabel = `<span style="color:#fbbf24;">Ngày mai</span>`;
    else                 countdownLabel = `<span style="color:${clr};">Còn ${diff} ngày</span>`;

    return `
      <div class="hl-item ${isHoliday ? 'hl-item--holiday' : ''}">
        <div class="hl-icon">${icon}</div>
        <div class="hl-body">
          <div class="hl-name">${h.name}</div>
          <div class="hl-date">${dateStr}${h.note ? ' · ' + h.note : ''}</div>
        </div>
        <div class="hl-countdown">${countdownLabel}</div>
      </div>`;
  }).join('');

  // Next major holiday countdown
  const nextHoliday = upcoming.find(h => h.type === 'holiday');
  let heroHtml = '';
  if (nextHoliday) {
    const diff = Math.ceil((nextHoliday.dateObj - today) / 86400000);
    const d = Math.floor(diff);
    heroHtml = `
      <div class="hl-hero">
        <div class="hl-hero-label">🎌 Ngày nghỉ lễ tiếp theo</div>
        <div class="hl-hero-name">${nextHoliday.name}</div>
        <div class="hl-hero-date">${nextHoliday.dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
        <div class="hl-hero-countdown">
          <div class="hl-hero-num">${d}</div>
          <div class="hl-hero-unit">ngày nữa</div>
        </div>
      </div>`;
  }

  el.innerHTML = `
    ${heroHtml}
    <div class="hl-section-label">📅 Lịch ngày quan trọng sắp tới</div>
    <div class="hl-list">${items}</div>
    <div class="hl-note">* Dựa trên Nghị định Chính phủ VN 2026. Lịch nghỉ cụ thể có thể điều chỉnh.</div>`;
}
