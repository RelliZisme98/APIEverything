/**
 * components/calendar.js
 * Lunar / Solar calendar widget renderer – redesigned layout.
 */

import {
  solarToLunar,
  canChiYear,
  canChiMonth,
  canChiDay,
  getMonthCalendar,
  HOLIDAYS_LUNAR,
  THANG_AM,
  THU,
  CAN, CHI,
} from '../utils/lunar-calendar.js';

// Tracked display month/year for navigation
let displayYear  = new Date().getFullYear();
let displayMonth = new Date().getMonth() + 1;

/**
 * Render the entire calendar card.
 * @param {string} containerId
 */
export function renderCalendar(containerId = 'calendarContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  const now    = new Date();
  const today  = solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear());
  const dayJd  = today.jd;

  const canchiYearStr  = canChiYear(today.year);
  const canchiMonthStr = canChiMonth(today.month, today.year);
  const canchiDayStr   = canChiDay(dayJd);

  const thuText = THU[now.getDay()];
  const DAYS_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const fullDay = DAYS_VI[now.getDay()];

  const monthNames = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                      'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

  el.innerHTML = `
    <!-- ══ Hero date display ══ -->
    <div class="cal-hero">
      <!-- Left: Dương lịch -->
      <div class="cal-hero-solar">
        <div class="cal-hero-label">DƯƠNG LỊCH</div>
        <div class="cal-hero-bigday">${now.getDate()}</div>
        <div class="cal-hero-weekday">${fullDay}</div>
        <div class="cal-hero-monyear">${monthNames[now.getMonth() + 1]} ${now.getFullYear()}</div>
      </div>

      <!-- Divider -->
      <div class="cal-hero-divider">
        <div class="cal-hero-divider-line"></div>
        <div class="cal-hero-divider-icon">🌙</div>
        <div class="cal-hero-divider-line"></div>
      </div>

      <!-- Right: Âm lịch -->
      <div class="cal-hero-lunar">
        <div class="cal-hero-label lunar-label">ÂM LỊCH</div>
        <div class="cal-hero-bigday lunar-day">${today.day}</div>
        <div class="cal-hero-weekday lunar-week">
          ${today.leap ? 'Tháng Nhuận ' : 'Tháng '}${THANG_AM[today.month]}
        </div>
        <div class="cal-hero-monyear">Năm ${canChiYear(today.year)}</div>
      </div>
    </div>

    <!-- ══ Can Chi row ══ -->
    <div class="cal-canchi-row">
      <div class="cal-canchi-card">
        <div class="cal-canchi-card-icon">🗓️</div>
        <div class="cal-canchi-card-body">
          <div class="cal-canchi-card-label">Ngày</div>
          <div class="cal-canchi-card-value">${canchiDayStr}</div>
        </div>
      </div>
      <div class="cal-canchi-card">
        <div class="cal-canchi-card-icon">📆</div>
        <div class="cal-canchi-card-body">
          <div class="cal-canchi-card-label">Tháng</div>
          <div class="cal-canchi-card-value">${canchiMonthStr}</div>
        </div>
      </div>
      <div class="cal-canchi-card">
        <div class="cal-canchi-card-icon">🎴</div>
        <div class="cal-canchi-card-body">
          <div class="cal-canchi-card-label">Năm</div>
          <div class="cal-canchi-card-value">${canchiYearStr}</div>
        </div>
      </div>
    </div>

    <!-- ══ Layout: Mini Cal + Upcoming Events ══ -->
    <div class="cal-bottom-row">
      <!-- Mini Calendar -->
      <div class="cal-mini-wrap">
        <div class="mini-cal" id="miniCal"></div>
      </div>
      <!-- Upcoming Events -->
      <div class="cal-events-wrap">
        <div class="cal-events" id="calEvents"></div>
      </div>
    </div>
  `;

  renderMiniCalendar();
  renderUpcomingEvents(today);
}

/**
 * Render the navigable mini calendar grid.
 */
export function renderMiniCalendar() {
  const el = document.getElementById('miniCal');
  if (!el) return;

  const now   = new Date();
  const days  = getMonthCalendar(displayYear, displayMonth);
  const firstWeekday = new Date(displayYear, displayMonth - 1, 1).getDay();

  const monthNames = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                      'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const weekDays = ['CN','T2','T3','T4','T5','T6','T7'];

  // Empty cells before first day
  const empties = Array(firstWeekday).fill(null);

  const dayCells = [
    ...empties.map(() => `<div class="mini-cal-day empty"></div>`),
    ...days.map(d => {
      const classes = [
        'mini-cal-day',
        d.isToday    ? 'is-today'    : '',
        d.isHoliday  ? 'is-holiday'  : '',
        d.weekday === 0 ? 'is-sunday'   : '',
        d.weekday === 6 ? 'is-saturday' : '',
      ].filter(Boolean).join(' ');

      const lunarDisplay = d.lunarDay === 1
        ? `<span class="mcd-lunar-m1">${THANG_AM[d.lunarMonth]}</span>`
        : `${d.lunarDay}`;

      const title = d.eventName ? `title="${d.eventName}"` : '';

      return `<div class="${classes}" ${title}>
        <div class="mcd-solar">${d.solarDay}</div>
        <div class="mcd-lunar">${lunarDisplay}</div>
      </div>`;
    }),
  ].join('');

  el.innerHTML = `
    <div class="mini-cal-nav">
      <button class="mini-cal-btn" id="calPrev" title="Tháng trước">‹</button>
      <div class="mini-cal-title">${monthNames[displayMonth]} ${displayYear}</div>
      <button class="mini-cal-btn" id="calNext" title="Tháng sau">›</button>
    </div>
    <div class="mini-cal-grid">
      ${weekDays.map(w => `<div class="mini-cal-weekday">${w}</div>`).join('')}
      ${dayCells}
    </div>
  `;

  document.getElementById('calPrev')?.addEventListener('click', () => {
    displayMonth--;
    if (displayMonth < 1) { displayMonth = 12; displayYear--; }
    renderMiniCalendar();
  });

  document.getElementById('calNext')?.addEventListener('click', () => {
    displayMonth++;
    if (displayMonth > 12) { displayMonth = 1; displayYear++; }
    renderMiniCalendar();
  });
}

/**
 * Render upcoming lunar holiday events (next 90 days).
 */
function renderUpcomingEvents(lunarToday) {
  const el = document.getElementById('calEvents');
  if (!el) return;

  const now    = new Date();
  const events = [];

  // Check next 90 days for holidays
  for (let i = 0; i <= 90; i++) {
    const d   = new Date(now);
    d.setDate(now.getDate() + i);
    const lun = solarToLunar(d.getDate(), d.getMonth() + 1, d.getFullYear());

    for (const h of HOLIDAYS_LUNAR) {
      if (h.month === lun.month && h.day === lun.day) {
        events.push({
          solarDate: `${d.getDate()}/${d.getMonth() + 1}`,
          lunarDate: `${lun.day}/${THANG_AM[lun.month]}`,
          name:      h.name,
          daysAway:  i,
        });
      }
    }

    // Rằm & mùng 1 (if not already covered)
    if (lun.day === 1 || lun.day === 15) {
      const label = lun.day === 1
        ? `🌑 Mùng Một tháng ${THANG_AM[lun.month]}`
        : `🌕 Rằm tháng ${THANG_AM[lun.month]}`;
      if (!events.find(e => e.solarDate === `${d.getDate()}/${d.getMonth() + 1}`)) {
        events.push({
          solarDate: `${d.getDate()}/${d.getMonth() + 1}`,
          lunarDate: `${lun.day}/${THANG_AM[lun.month]}`,
          name:      label,
          daysAway:  i,
        });
      }
    }

    if (events.length >= 8) break;
  }

  if (!events.length) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <div class="cal-events-header">
      <span class="cal-events-icon">📌</span>
      <span class="cal-events-title">Sự Kiện Sắp Tới</span>
    </div>
    <div class="cal-events-list">
      ${events.slice(0, 6).map(e => {
        let badge = '';
        if (e.daysAway === 0) {
          badge = `<span class="cal-event-badge today">Hôm nay</span>`;
        } else if (e.daysAway <= 3) {
          badge = `<span class="cal-event-badge soon">${e.daysAway} ngày nữa</span>`;
        } else {
          badge = `<span class="cal-event-badge far">${e.daysAway} ngày nữa</span>`;
        }
        return `
          <div class="cal-event-row">
            <div class="cal-event-dates">
              <div class="cal-event-solar">${e.solarDate}</div>
              <div class="cal-event-lunar">🌙 ${e.lunarDate} âm</div>
            </div>
            <div class="cal-event-info">
              <div class="cal-event-name">${e.name}</div>
              ${badge}
            </div>
          </div>`;
      }).join('')}
    </div>
  `;
}
