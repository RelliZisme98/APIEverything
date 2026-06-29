/**
 * components/calendar.js
 * Lunar / Solar calendar widget renderer – redesigned layout.
 * Supports interactive day click and custom event marking.
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
import { renderHolidays } from './holidays.js';

// Tracked display month/year for navigation
let displayYear  = new Date().getFullYear();
let displayMonth = new Date().getMonth() + 1;

let hasDbConnection = false;
let dbInitialized = false;

/**
 * Render the entire calendar card.
 * @param {string} containerId
 */
export function renderCalendar(containerId = 'calendarContent') {
  if (!dbInitialized) {
    dbInitialized = true;
    initProxyEvents();
  }

  const el = document.getElementById(containerId);
  if (!el) return;

  const now    = new Date();
  const today  = solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear());
  const dayJd  = today.jd;

  const canchiYearStr  = canChiYear(today.year);
  const canchiMonthStr = canChiMonth(today.month, today.year);
  const canchiDayStr   = canChiDay(dayJd);

  const fullDay = THU[now.getDay()];

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
 <div class="cal-hero-divider-icon"></div>
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
 <div class="cal-canchi-card-icon">️</div>
        <div class="cal-canchi-card-body">
          <div class="cal-canchi-card-label">Ngày</div>
          <div class="cal-canchi-card-value">${canchiDayStr}</div>
        </div>
      </div>
      <div class="cal-canchi-card">
        <div class="cal-canchi-card-icon"></div>
        <div class="cal-canchi-card-body">
          <div class="cal-canchi-card-label">Tháng</div>
          <div class="cal-canchi-card-value">${canchiMonthStr}</div>
        </div>
      </div>
      <div class="cal-canchi-card">
 <div class="cal-canchi-card-icon"></div>
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

    <!-- ══ Holidays Section inline ══ -->
    <div class="card" style="margin-top: 20px;">
      <div class="card-header" style="border-bottom: 1px solid var(--border); padding-bottom: 10px; padding-left: 0; background: transparent;">
        <div class="card-title" style="font-size: 14px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
 <span></span> Ngày lễ & sự kiện quan trọng VN 2026–2027
        </div>
      </div>
      <div id="holidaysContent" style="padding-top: 14px;"></div>
    </div>
  `;

  renderMiniCalendar();
  renderUpcomingEvents(today);
  renderHolidays('holidaysContent');

  // Bind click day helper globally
  window._calClickDay = openDayDetailModal;
  window._calSaveEvent = saveCustomEvent;
  window._calDeleteEvent = deleteCustomEvent;
  window._calOpenAddEventModal = openAddEventModal;
  window._calSaveNewEvent = saveNewEvent;
  window._calEditCustomEvent = editCustomEvent;
  window._calUpdateCustomEvent = updateCustomEvent;
}

/**
 * Get custom events from local storage
 * @returns {Array}
 */
function getCustomEvents() {
  return JSON.parse(localStorage.getItem('rellia_custom_events') || '[]');
}

/**
 * Render the navigable mini calendar grid.
 */
export function renderMiniCalendar() {
  const el = document.getElementById('miniCal');
  if (!el) return;

  const days  = getMonthCalendar(displayYear, displayMonth);
  const firstWeekday = new Date(displayYear, displayMonth - 1, 1).getDay();

  const monthNames = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                      'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const weekDays = ['CN','T2','T3','T4','T5','T6','T7'];

  // Empty cells before first day
  const empties = Array(firstWeekday).fill(null);

  const customEvents = getCustomEvents();

  const dayCells = [
    ...empties.map(() => `<div class="mini-cal-day empty"></div>`),
    ...days.map(d => {
      // Find matching custom events
      const hasCustom = customEvents.some(e => {
        if (e.dateType === 'solar') {
          return e.repeat
            ? (e.month === displayMonth && e.day === d.solarDay)
            : (e.year === displayYear && e.month === displayMonth && e.day === d.solarDay);
        } else {
          return e.repeat
            ? (e.month === d.lunarMonth && e.day === d.lunarDay)
            : (e.year === d.lunarYear && e.month === d.lunarMonth && e.day === d.lunarDay);
        }
      });

      const matchedCustoms = customEvents.filter(e => {
        if (e.dateType === 'solar') {
          return e.repeat
            ? (e.month === displayMonth && e.day === d.solarDay)
            : (e.year === displayYear && e.month === displayMonth && e.day === d.solarDay);
        } else {
          return e.repeat
            ? (e.month === d.lunarMonth && e.day === d.lunarDay)
            : (e.year === d.lunarYear && e.month === d.lunarMonth && e.day === d.lunarDay);
        }
      });

      const classes = [
        'mini-cal-day',
        d.isToday    ? 'is-today'    : '',
        d.isHoliday  ? 'is-holiday'  : '',
        hasCustom    ? 'has-custom-event' : '',
        d.weekday === 0 ? 'is-sunday'   : '',
        d.weekday === 6 ? 'is-saturday' : '',
      ].filter(Boolean).join(' ');

      const lunarDisplay = d.lunarDay === 1
        ? `<span class="mcd-lunar-m1">${THANG_AM[d.lunarMonth]}</span>`
        : `${d.lunarDay}`;

      const names = [d.eventName, ...matchedCustoms.map(e => e.name)].filter(Boolean).join(', ');
      const title = names ? `title="${names}"` : '';

      return `<div class="${classes}" ${title} onclick="window._calClickDay(${d.solarDay}, ${displayMonth}, ${displayYear})">
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
 * Render upcoming lunar and custom holiday events (next 90 days).
 */
function renderUpcomingEvents(lunarToday) {
  const el = document.getElementById('calEvents');
  if (!el) return;

  const now    = new Date();
  const events = [];
  const customEvents = getCustomEvents();

  // Check next 90 days for holidays & custom events
  for (let i = 0; i <= 90; i++) {
    const d   = new Date(now);
    d.setDate(now.getDate() + i);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const lun = solarToLunar(day, month, year);

    // 1. Check lunar holidays
    for (const h of HOLIDAYS_LUNAR) {
      if (h.month === lun.month && h.day === lun.day) {
        events.push({
          solarDate: `${day}/${month}`,
          lunarDate: `${lun.day}/${THANG_AM[lun.month]}`,
          name:      h.name,
          daysAway:  i,
          isCustom:  false,
        });
      }
    }

    // 2. Check custom events
    for (const ce of customEvents) {
      let isMatch = false;
      if (ce.dateType === 'solar') {
        isMatch = ce.repeat
          ? (ce.month === month && ce.day === day)
          : (ce.year === year && ce.month === month && ce.day === day);
      } else {
        isMatch = ce.repeat
          ? (ce.month === lun.month && ce.day === lun.day)
          : (ce.year === lun.year && ce.month === lun.month && ce.day === lun.day);
      }

      if (isMatch) {
        events.push({
          solarDate: `${day}/${month}`,
          lunarDate: `${lun.day}/${THANG_AM[lun.month]}`,
 name: `[Cá nhân] ${ce.name}`,
          daysAway:  i,
          isCustom:  true,
          eventId:   ce.id,
        });
      }
    }

    // 3. Rằm & mùng 1
    if (lun.day === 1 || lun.day === 15) {
      const label = lun.day === 1
 ? `Mùng Một tháng ${THANG_AM[lun.month]}`
 : `Rằm tháng ${THANG_AM[lun.month]}`;
      if (!events.some(e => e.solarDate === `${day}/${month}` && !e.isCustom)) {
        events.push({
          solarDate: `${day}/${month}`,
          lunarDate: `${lun.day}/${THANG_AM[lun.month]}`,
          name:      label,
          daysAway:  i,
          isCustom:  false,
        });
      }
    }

    if (events.length >= 10) break;
  }

  // Deduplicate and sort by daysAway
  events.sort((a, b) => a.daysAway - b.daysAway);

  if (!events.length) {
    el.innerHTML = '<div class="cal-events-list"><div style="color:var(--text-muted);font-size:12px;padding:12px 0;">Không có sự kiện nào sắp tới</div></div>';
    return;
  }

  el.innerHTML = `
    <div class="cal-events-header">
 <span class="cal-events-icon"></span>
      <span class="cal-events-title">Sự Kiện Sắp Tới</span>
    </div>
    <div class="cal-events-list">
      ${events.slice(0, 8).map(e => {
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
 <div class="cal-event-lunar">${e.lunarDate} âm</div>
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

/**
 * Open Day Detail Modal
 */
function openDayDetailModal(day, month, year) {
  const modal = document.getElementById('calModal');
  const body  = document.getElementById('calModalBody');
  if (!modal || !body) return;

  const lun = solarToLunar(day, month, year);
  const canchiYearStr  = canChiYear(lun.year);
  const canchiMonthStr = canChiMonth(lun.month, lun.year);
  const canchiDayStr   = canChiDay(lun.jd);

  // Search if there is already an event on this solar/lunar day in local storage
  const customEvents = getCustomEvents();
  const existingEvent = customEvents.find(e => {
    if (e.dateType === 'solar') {
      return e.repeat
        ? (e.month === month && e.day === day)
        : (e.year === year && e.month === month && e.day === day);
    } else {
      return e.repeat
        ? (e.month === lun.month && e.day === lun.day)
        : (e.year === lun.year && e.month === lun.month && e.day === lun.day);
    }
  });

  const titleStr = `Chi Tiết Ngày ${day}/${month}/${year}`;
  document.getElementById('calModalTitle').textContent = titleStr;

  const formattedSolarDate = `Thứ ${lun.weekday === 0 ? 'Nhật' : (lun.weekday + 1)}, ngày ${day} tháng ${month} năm ${year}`;
  const formattedLunarDate = `Ngày ${lun.day} tháng ${THANG_AM[lun.month]} âm lịch (năm ${canchiYearStr})`;

  body.innerHTML = `
    <!-- Detail Cards -->
    <div class="cal-detail-card">
      <div class="cal-detail-line">
 <span class="cal-detail-label">️ Dương lịch:</span>
        <span class="cal-detail-val">${formattedSolarDate}</span>
      </div>
      <div class="cal-detail-line">
 <span class="cal-detail-label">Âm lịch:</span>
        <span class="cal-detail-val lunar">${formattedLunarDate}</span>
      </div>
      <div class="cal-detail-line">
 <span class="cal-detail-label">Can chi ngày:</span>
        <span class="cal-detail-val" style="color:var(--accent-purple);">${canchiDayStr}</span>
      </div>
      <div class="cal-detail-line">
 <span class="cal-detail-label">Can chi tháng:</span>
        <span class="cal-detail-val" style="color:var(--accent-purple);">${canchiMonthStr}</span>
      </div>
    </div>

    <!-- Event Marking Form -->
    <div class="cal-event-form">
 <div class="cal-form-title">${existingEvent ? '️ Chỉnh sửa sự kiện cá nhân' : 'Đánh dấu ngày quan trọng'}</div>
      <div class="cal-form-row">
        <label class="conv-label">Tên sự kiện</label>
        <input type="text" id="calEventName" class="field-input" placeholder="Ví dụ: Sinh nhật mẹ, giỗ chạp..." value="${existingEvent ? existingEvent.name : ''}" />
      </div>
      <div class="cal-form-row">
        <label class="conv-label">Loại lịch</label>
        <select id="calEventDateType" class="field-input">
          <option value="solar" ${existingEvent?.dateType === 'solar' ? 'selected' : ''}>Dương lịch</option>
          <option value="lunar" ${existingEvent?.dateType === 'lunar' ? 'selected' : ''}>Âm lịch</option>
        </select>
      </div>
      <label class="cal-checkbox-row">
        <input type="checkbox" id="calEventRepeat" ${existingEvent ? (existingEvent.repeat ? 'checked' : '') : 'checked'} />
        Lặp lại hàng năm
      </label>

      <div class="cal-form-actions">
        ${existingEvent ? `<button class="cal-btn cal-btn-delete" onclick="window._calDeleteEvent('${existingEvent.id}')">Xóa sự kiện</button>` : ''}
        <button class="cal-btn cal-btn-save" onclick="window._calSaveEvent(${day}, ${month}, ${year}, '${existingEvent ? existingEvent.id : ''}')">
          ${existingEvent ? 'Cập nhật' : 'Lưu sự kiện'}
        </button>
      </div>
    </div>
  `;

  modal.classList.add('open');
}

/**
 * Save custom event
 */
function saveCustomEvent(day, month, year, eventId) {
  const name = document.getElementById('calEventName')?.value?.trim();
  const dateType = document.getElementById('calEventDateType')?.value;
  const repeat = document.getElementById('calEventRepeat')?.checked;

  if (!name) {
    alert('Vui lòng nhập tên sự kiện!');
    return;
  }

  const lun = solarToLunar(day, month, year);
  const customEvents = getCustomEvents();

  const newEvent = {
    id: eventId || 'evt_' + Math.random().toString(36).substr(2, 9),
    name,
    dateType,
    repeat,
    day: dateType === 'solar' ? day : lun.day,
    month: dateType === 'solar' ? month : lun.month,
    year: dateType === 'solar' ? year : lun.year,
  };

  if (eventId) {
    // Edit existing
    const idx = customEvents.findIndex(e => e.id === eventId);
    if (idx !== -1) customEvents[idx] = newEvent;
  } else {
    // Add new
    customEvents.push(newEvent);
  }

  localStorage.setItem('rellia_custom_events', JSON.stringify(customEvents));
  uploadEventToProxy(newEvent);

  // Close modal
  document.getElementById('calModal').classList.remove('open');

  // Re-render
  renderCalendar();
}

/**
 * Delete custom event
 */
function deleteCustomEvent(eventId) {
  if (!confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) return;

  const customEvents = getCustomEvents();
  const filtered = customEvents.filter(e => e.id !== eventId);
  localStorage.setItem('rellia_custom_events', JSON.stringify(filtered));
  deleteEventFromProxy(eventId);

  // Close modal
  document.getElementById('calModal').classList.remove('open');

  // Re-render
  renderCalendar();
}

/**
 * Open Add Event Modal (allows setting date manually)
 */
function openAddEventModal() {
  const modal = document.getElementById('calModal');
  const body  = document.getElementById('calModalBody');
  if (!modal || !body) return;

  const titleStr = 'Thêm Sự Kiện Cá Nhân Mới';
  document.getElementById('calModalTitle').textContent = titleStr;

  const today = new Date();
  const curDay = today.getDate();
  const curMonth = today.getMonth() + 1;
  const curYear = today.getFullYear();

  body.innerHTML = `
    <!-- Event Marking Form -->
    <div class="cal-event-form" style="border-top: none; padding-top: 0;">
 <div class="cal-form-title">Đánh dấu ngày quan trọng</div>
      <div class="cal-form-row">
        <label class="conv-label">Tên sự kiện</label>
        <input type="text" id="calEventName" class="field-input" placeholder="Ví dụ: Sinh nhật mẹ, giỗ chạp..." value="" />
      </div>
      <div class="cal-form-row" style="display: flex; gap: 8px;">
        <div style="flex: 1;">
          <label class="conv-label" style="font-size: 11px;">Ngày</label>
          <select id="calEventDay" class="field-input">
            ${Array.from({length: 31}, (_, i) => `<option value="${i+1}" ${i+1 === curDay ? 'selected' : ''}>${i+1}</option>`).join('')}
          </select>
        </div>
        <div style="flex: 1;">
          <label class="conv-label" style="font-size: 11px;">Tháng</label>
          <select id="calEventMonth" class="field-input">
            ${Array.from({length: 12}, (_, i) => `<option value="${i+1}" ${i+1 === curMonth ? 'selected' : ''}>Tháng ${i+1}</option>`).join('')}
          </select>
        </div>
        <div style="flex: 1;">
          <label class="conv-label" style="font-size: 11px;">Năm</label>
          <select id="calEventYear" class="field-input">
            ${Array.from({length: 5}, (_, i) => {
              const y = curYear - 2 + i;
              return `<option value="${y}" ${y === curYear ? 'selected' : ''}>${y}</option>`;
            }).join('')}
          </select>
        </div>
      </div>
      <div class="cal-form-row">
        <label class="conv-label">Loại lịch</label>
        <select id="calEventDateType" class="field-input">
          <option value="solar">Dương lịch</option>
          <option value="lunar">Âm lịch</option>
        </select>
      </div>
      <label class="cal-checkbox-row">
        <input type="checkbox" id="calEventRepeat" checked />
        Lặp lại hàng năm
      </label>

      <div class="cal-form-actions">
        <button class="cal-btn cal-btn-save" onclick="window._calSaveNewEvent()">
          Lưu sự kiện
        </button>
      </div>
    </div>
  `;

  modal.classList.add('open');
}

/**
 * Save new custom event from Add Event Modal
 */
function saveNewEvent() {
  const name = document.getElementById('calEventName')?.value?.trim();
  const dateType = document.getElementById('calEventDateType')?.value;
  const repeat = document.getElementById('calEventRepeat')?.checked;
  const day = parseInt(document.getElementById('calEventDay')?.value, 10);
  const month = parseInt(document.getElementById('calEventMonth')?.value, 10);
  const year = parseInt(document.getElementById('calEventYear')?.value, 10);

  if (!name) {
    alert('Vui lòng nhập tên sự kiện!');
    return;
  }

  const customEvents = getCustomEvents();

  const newEvent = {
    id: 'evt_' + Math.random().toString(36).substr(2, 9),
    name,
    dateType,
    repeat,
    day,
    month,
    year,
  };

  customEvents.push(newEvent);
  localStorage.setItem('rellia_custom_events', JSON.stringify(customEvents));
  uploadEventToProxy(newEvent);

  // Close modal
  document.getElementById('calModal').classList.remove('open');

  // Re-render
  renderCalendar();
}

/**
 * Open edit modal for custom event from list click
 */
function editCustomEvent(eventId) {
  const customEvents = getCustomEvents();
  const existingEvent = customEvents.find(e => e.id === eventId);
  if (!existingEvent) return;

  const modal = document.getElementById('calModal');
  const body  = document.getElementById('calModalBody');
  if (!modal || !body) return;

  const titleStr = 'Chỉnh Sửa Sự Kiện';
  document.getElementById('calModalTitle').textContent = titleStr;

  body.innerHTML = `
    <!-- Event Marking Form -->
    <div class="cal-event-form" style="border-top: none; padding-top: 0;">
 <div class="cal-form-title">️ Chỉnh sửa sự kiện cá nhân</div>
      <div class="cal-form-row">
        <label class="conv-label">Tên sự kiện</label>
        <input type="text" id="calEventName" class="field-input" placeholder="Ví dụ: Sinh nhật mẹ, giỗ chạp..." value="${existingEvent.name}" />
      </div>
      <div class="cal-form-row" style="display: flex; gap: 8px;">
        <div style="flex: 1;">
          <label class="conv-label" style="font-size: 11px;">Ngày</label>
          <select id="calEventDay" class="field-input">
            ${Array.from({length: 31}, (_, i) => `<option value="${i+1}" ${i+1 === existingEvent.day ? 'selected' : ''}>${i+1}</option>`).join('')}
          </select>
        </div>
        <div style="flex: 1;">
          <label class="conv-label" style="font-size: 11px;">Tháng</label>
          <select id="calEventMonth" class="field-input">
            ${Array.from({length: 12}, (_, i) => `<option value="${i+1}" ${i+1 === existingEvent.month ? 'selected' : ''}>Tháng ${i+1}</option>`).join('')}
          </select>
        </div>
        <div style="flex: 1;">
          <label class="conv-label" style="font-size: 11px;">Năm</label>
          <select id="calEventYear" class="field-input">
            ${Array.from({length: 5}, (_, i) => {
              const y = new Date().getFullYear() - 2 + i;
              return `<option value="${y}" ${y === existingEvent.year ? 'selected' : ''}>${y}</option>`;
            }).join('')}
          </select>
        </div>
      </div>
      <div class="cal-form-row">
        <label class="conv-label">Loại lịch</label>
        <select id="calEventDateType" class="field-input">
          <option value="solar" ${existingEvent.dateType === 'solar' ? 'selected' : ''}>Dương lịch</option>
          <option value="lunar" ${existingEvent.dateType === 'lunar' ? 'selected' : ''}>Âm lịch</option>
        </select>
      </div>
      <label class="cal-checkbox-row">
        <input type="checkbox" id="calEventRepeat" ${existingEvent.repeat ? 'checked' : ''} />
        Lặp lại hàng năm
      </label>

      <div class="cal-form-actions">
        <button class="cal-btn cal-btn-delete" onclick="window._calDeleteEvent('${existingEvent.id}')">Xóa sự kiện</button>
        <button class="cal-btn cal-btn-save" onclick="window._calUpdateCustomEvent('${existingEvent.id}')">
          Cập nhật
        </button>
      </div>
    </div>
  `;

  modal.classList.add('open');
}

/**
 * Update custom event
 */
function updateCustomEvent(eventId) {
  const name = document.getElementById('calEventName')?.value?.trim();
  const dateType = document.getElementById('calEventDateType')?.value;
  const repeat = document.getElementById('calEventRepeat')?.checked;
  const day = parseInt(document.getElementById('calEventDay')?.value, 10);
  const month = parseInt(document.getElementById('calEventMonth')?.value, 10);
  const year = parseInt(document.getElementById('calEventYear')?.value, 10);

  if (!name) {
    alert('Vui lòng nhập tên sự kiện!');
    return;
  }

  const customEvents = getCustomEvents();
  const idx = customEvents.findIndex(e => e.id === eventId);
  if (idx !== -1) {
    const updatedEvent = {
      id: eventId,
      name,
      dateType,
      repeat,
      day,
      month,
      year,
    };
    customEvents[idx] = updatedEvent;
    localStorage.setItem('rellia_custom_events', JSON.stringify(customEvents));
    uploadEventToProxy(updatedEvent);
  }

  // Close modal
  document.getElementById('calModal').classList.remove('open');

  // Re-render
  renderCalendar();
}

/**
 * Sync custom events from Supabase secure proxy
 */
async function initProxyEvents() {
  try {
    const res = await fetch('/api/events');
    if (res.ok) {
      const data = await res.json();
      hasDbConnection = true;
      const customEvents = data.map(item => ({
        id: item.id,
        name: item.name,
        dateType: item.date_type,
        repeat: item.repeat,
        day: item.day,
        month: item.month,
        year: item.year,
      }));
      localStorage.setItem('rellia_custom_events', JSON.stringify(customEvents));
      renderCalendar();
    } else {
      const text = await res.text();
      throw new Error(`Status ${res.status} - ${text}`);
    }
  } catch (err) {
    console.warn('[Calendar] Server DB unavailable, using local cache:', err.message);
    hasDbConnection = false;
  }
}

/**
 * Securely upload custom event details to Supabase
 */
async function uploadEventToProxy(event) {
  if (!hasDbConnection) return;
  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: event.id,
        name: event.name,
        date_type: event.dateType,
        repeat: event.repeat,
        day: event.day,
        month: event.month,
        year: event.year,
        created_at: new Date().toISOString()
      })
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[Upload Event Failed Server Error]', res.status, text);
    }
  } catch (err) {
    console.warn('[Upload Event Failed Network Error]', err);
  }
}

/**
 * Securely delete custom event from Supabase
 */
async function deleteEventFromProxy(eventId) {
  if (!hasDbConnection) return;
  try {
    const res = await fetch(`/api/events?id=${encodeURIComponent(eventId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[Delete Event Failed Server Error]', res.status, text);
    }
  } catch (err) {
    console.warn('[Delete Event Failed Network Error]', err);
  }
}
