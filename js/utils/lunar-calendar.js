/**
 * utils/lunar-calendar.js
 * Vietnamese Lunar Calendar converter.
 * Based on the algorithm by Hồ Ngọc Đức (Ho Ngoc Duc).
 * Reference: https://www.informatik.uni-leipzig.de/~duc/amlich/
 *
 * Pure computation — no DOM, no side-effects.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const CAN  = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
export const CHI  = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
export const TIET = [
  'Tiểu Hàn','Đại Hàn','Lập Xuân','Vũ Thủy','Kinh Trập','Xuân Phân',
  'Thanh Minh','Cốc Vũ','Lập Hạ','Tiểu Mãn','Mang Chủng','Hạ Chí',
  'Tiểu Thử','Đại Thử','Lập Thu','Xử Thử','Bạch Lộ','Thu Phân',
  'Hàn Lộ','Sương Giáng','Lập Đông','Tiểu Tuyết','Đại Tuyết','Đông Chí',
];

export const THANG_AM = [
  '','Giêng','Hai','Ba','Tư','Năm','Sáu',
  'Bảy','Tám','Chín','Mười','Một','Chạp',
];

export const THU = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];

// ─── Core Julian Day Number helpers ──────────────────────────────────────────

/** Gregorian date → Julian Day Number */
function jdnFromDate(dd, mm, yy) {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y
         + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

/** Julian Day Number → Gregorian date object */
function dateFromJdn(jd) {
  let z, a, b, c, d, e, dd, mm, yy;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor(b * 146097 / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  d  = Math.floor((4 * c + 3) / 1461);
  e  = c - Math.floor(1461 * d / 4);
  mm = Math.floor((5 * e + 2) / 153);
  dd = e - Math.floor((153 * mm + 2) / 5) + 1;
  mm = mm + 3 - 12 * Math.floor(mm / 10);
  yy = b * 100 + d - 4800 + Math.floor(mm / 11);
  return { day: dd, month: mm, year: yy };
}

// ─── Sun longitude (degrees) for new-moon calculation ────────────────────────

function sunLongitude(jdn) {
  const T  = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M  = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;
  const DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
           + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M)
           + 0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L -= 360 * Math.floor(L / 360);
  L = Math.floor(L / 30);
  return L;
}

/** New moon JDN for the k-th lunation (0 = Jan 2000 new moon) */
function newMoon(k) {
  const T  = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let jd1  = 2415020.75933 + 29.53058868 * k
            + 0.0001178 * T2 - 0.000000155 * T3
            + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M  = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr= 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F  = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  const C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr)
           + 0.0021 * Math.sin(2 * dr * M)
           - 0.4068 * Math.sin(Mpr * dr)
           + 0.0161 * Math.sin(2 * dr * Mpr)
           - 0.0004 * Math.sin(3 * dr * Mpr)
           + 0.0104 * Math.sin(2 * dr * F)
           - 0.0051 * Math.sin((M + Mpr) * dr)
           - 0.0074 * Math.sin((M - Mpr) * dr)
           + 0.0004 * Math.sin((2 * F + M) * dr)
           - 0.0004 * Math.sin((2 * F - M) * dr)
           - 0.0006 * Math.sin((2 * F + Mpr) * dr)
           + 0.0010 * Math.sin((2 * F - Mpr) * dr)
           + 0.0005 * Math.sin((M + 2 * Mpr) * dr);
  const delta = T < -11
    ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + C1 - delta;
}

/** Get new-moon JDN for month containing JDN jd, timezone offset in hours */
function getNewMoonDay(k, timeZone) {
  return Math.floor(newMoon(k) + 0.5 + timeZone / 24);
}

/** Sun longitude sector (0-11) at midnight of JDN jd, timezone offset */
function getSunLongitude(dayNumber, timeZone) {
  return sunLongitude(dayNumber - 0.5 - timeZone / 24);
}

/** Lunar month index for the month containing lunarYear's 11th month */
function getLunarMonth11(yy, timeZone) {
  const off = jdnFromDate(31, 12, yy) - 2415021;
  const k   = Math.floor(off / 29.530588853);
  let nm    = getNewMoonDay(k, timeZone);
  const sunLng = getSunLongitude(nm, timeZone);
  if (sunLng >= 9) nm = getNewMoonDay(k - 1, timeZone);
  return nm;
}

function getLeapMonthOffset(a11, timeZone) {
  const k  = Math.round((a11 - 2415021.076998695) / 29.530588853);
  let last = 0;
  let i    = 1;
  let arc  = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

// ─── Main conversion function ─────────────────────────────────────────────────

/**
 * Convert a Gregorian date to Vietnamese Lunar date.
 * @param {number} dd   Solar day
 * @param {number} mm   Solar month (1–12)
 * @param {number} yy   Solar year
 * @param {number} [tz] Timezone offset hours (default 7 for Vietnam)
 * @returns {{ day, month, year, leap, jd }}
 */
export function solarToLunar(dd, mm, yy, tz = 7) {
  const dayNumber = jdnFromDate(dd, mm, yy);
  const k         = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart  = getNewMoonDay(k + 1, tz);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k, tz);

  let a11 = getLunarMonth11(yy, tz);
  let b11 = a11;
  let lunarYear;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, tz);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, tz);
  }

  const lunarDay    = dayNumber - monthStart + 1;
  const diff        = Math.round((monthStart - a11) / 29);
  let   lunarLeap   = false;
  let   lunarMonth  = diff + 11;

  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, tz);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) lunarLeap = true;
    }
  }

  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap, jd: dayNumber };
}

// ─── Can Chi helpers ──────────────────────────────────────────────────────────

/** Get Can Chi for a year */
export function canChiYear(year) {
  return CAN[(year + 6) % 10] + ' ' + CHI[(year + 8) % 12];
}

/** Get Can Chi for a lunar month (1–12, year) */
export function canChiMonth(month, year) {
  const c = (year * 12 + month + 3) % 10;
  const x = (month + 1) % 12;
  return CAN[c] + ' ' + CHI[x];
}

/** Get Can Chi for a Julian Day Number (day pillar) */
export function canChiDay(jd) {
  return CAN[(jd + 9) % 10] + ' ' + CHI[(jd + 1) % 12];
}

// ─── Vietnamese holidays (lunar dates) ───────────────────────────────────────

export const HOLIDAYS_LUNAR = [
 { month: 1, day: 1, name: 'Tết Nguyên Đán (Mùng 1)' },
 { month: 1, day: 2, name: 'Tết Nguyên Đán (Mùng 2)' },
 { month: 1, day: 3, name: 'Tết Nguyên Đán (Mùng 3)' },
 { month: 1, day: 15, name: 'Rằm tháng Giêng (Tết Nguyên Tiêu)' },
 { month: 3, day: 10, name: '️ Giỗ Tổ Hùng Vương' },
 { month: 4, day: 15, name: 'Lễ Phật Đản' },
 { month: 7, day: 15, name: 'Lễ Vu Lan (Rằm tháng 7)' },
 { month: 8, day: 15, name: 'Tết Trung Thu' },
 { month: 12, day: 23, name: 'Ông Táo về trời' },
 { month: 12, day: 30, name: 'Tất Niên' },
];

/** Recurring monthly events */
export function getMonthlyEvents(lunarDay) {
 if (lunarDay === 1) return 'Mùng Một';
 if (lunarDay === 15) return 'Rằm';
  return null;
}

/**
 * Get all lunar days for a given solar month (for mini-calendar display).
 * @returns {Array<{solarDay, lunarDay, lunarMonth, isToday, isHoliday, eventName}>}
 */
export function getMonthCalendar(solarYear, solarMonth) {
  const daysInMonth = new Date(solarYear, solarMonth, 0).getDate();
  const today       = new Date();
  const result      = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const lunar    = solarToLunar(d, solarMonth, solarYear);
    const isToday  = today.getFullYear() === solarYear
                  && today.getMonth() + 1 === solarMonth
                  && today.getDate() === d;

    const holiday = HOLIDAYS_LUNAR.find(h => h.month === lunar.month && h.day === lunar.day);
    const monthly = getMonthlyEvents(lunar.day);

    result.push({
      solarDay:    d,
      lunarDay:    lunar.day,
      lunarMonth:  lunar.month,
      lunarYear:   lunar.year,
      leap:        lunar.leap,
      isToday,
      isHoliday:   !!holiday,
      eventName:   holiday?.name ?? monthly ?? null,
      weekday:     new Date(solarYear, solarMonth - 1, d).getDay(),
    });
  }

  return result;
}
