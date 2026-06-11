/**
 * components/football.js
 * Lịch thi đấu & Bảng xếp hạng: Premier League + FIFA World Cup 2026
 * Nguồn: TheSportsDB via /football worker proxy
 */

const LEAGUES = {
  wc: { label: '🏆 World Cup 2026', color: '#fbbf24', badge: 'LIVE', emoji: '🌍' },
  pl: { label: '⚽ Premier League', color: '#60a5fa', badge: 'PL',   emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
};

let currentLeague = 'wc';
let currentTab    = 'next';   // next | past | table
let refreshTimer  = null;
let lastData      = {};       // cache per key

function fmtDate(dateStr, timeStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T${timeStr || '00:00:00'}Z`);
  return d.toLocaleString('vi-VN', { weekday: 'short', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
}

function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toLocaleDateString('sv-SE');
  return dateStr === today;
}

function isLive(status) {
  return status && ['1H','2H','HT','ET','P','LIVE','In Progress'].some(s => status.includes(s));
}

export function renderFootball(containerId = 'footballContent') {
  const el = document.getElementById(containerId);
  if (!el) return;
  buildUI(el);
  loadData();

  // Auto-refresh every 60s for live updates
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    if (document.getElementById('section-football')?.classList.contains('active')) {
      loadData(true); // silent refresh
    }
  }, 60_000);
}

function buildUI(el) {
  const leagueTabs = Object.entries(LEAGUES).map(([key, lg]) =>
    `<button class="fb-league-tab ${key === currentLeague ? 'active' : ''}"
             data-key="${key}"
             onclick="window.fbSelectLeague('${key}')"
             style="${key === currentLeague ? `border-color:${lg.color}60;background:${lg.color}10;color:${lg.color};` : ''}">
       ${lg.label}
       <span class="fb-badge" style="${key === currentLeague ? `background:${lg.color}20;color:${lg.color};` : ''}">${lg.badge}</span>
     </button>`
  ).join('');

  const tabs = [
    { key: 'next',  label: '📅 Lịch thi đấu' },
    { key: 'past',  label: '✅ Kết quả' },
    { key: 'table', label: '📊 Bảng XH' },
  ].map(t =>
    `<button class="fb-tab ${t.key === currentTab ? 'active' : ''}"
             onclick="window.fbSelectTab('${t.key}')">${t.label}</button>`
  ).join('');

  el.innerHTML = `
    <div class="fb-league-tabs">${leagueTabs}</div>
    <div class="fb-tabs">${tabs}</div>
    <div id="fbContent" class="fb-content">
      <div class="fb-loading">⚽ Đang tải dữ liệu...</div>
    </div>
    <div class="fb-footer">
      <span class="fb-source">Nguồn: TheSportsDB</span>
      <span class="fb-live-badge"><span class="dot-green"></span> Tự động cập nhật mỗi 60s</span>
    </div>`;

  window.fbSelectLeague = (key) => {
    currentLeague = key;
    buildUI(el);
    loadData();
  };
  window.fbSelectTab = (key) => {
    currentTab = key;
    buildUI(el);
    loadData();
  };
}

async function loadData(silent = false) {
  const cacheKey = `${currentLeague}_${currentTab}`;
  const contentEl = document.getElementById('fbContent');
  if (!contentEl) return;

  if (!silent) {
    contentEl.innerHTML = `<div class="fb-loading">⚽ Đang tải...</div>`;
  }

  try {
    const res  = await fetch(`/football?league=${currentLeague}&type=${currentTab}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    lastData[cacheKey] = data;
    renderContent(contentEl, data);
  } catch (err) {
    if (!silent) {
      contentEl.innerHTML = `<div class="error-msg">⚠️ ${err.message}</div>`;
    }
  }
}

function renderContent(el, data) {
  if (currentTab === 'table') {
    renderTable(el, data);
  } else {
    renderFixtures(el, data);
  }
}

// ─── Standings table ──────────────────────────────────────────────
function renderTable(el, data) {
  const rows = data.table || [];
  if (!rows.length) {
    el.innerHTML = `<div class="fb-empty">📊 Chưa có bảng xếp hạng cho mùa này</div>`;
    return;
  }

  const lg = LEAGUES[currentLeague];
  const rowHtml = rows.map(r => {
    const rank = parseInt(r.intRank);
    let rankStyle = '';
    let rankBadge = rank;
    if (currentLeague === 'pl') {
      if (rank <= 4)  { rankStyle = 'color:#60a5fa;font-weight:800;'; rankBadge = `<span style="color:#60a5fa;">${rank}</span>`; }
      if (rank === 5) { rankStyle = 'color:#fb923c;font-weight:700;'; rankBadge = `<span style="color:#fb923c;">${rank}</span>`; }
      if (rank >= 18) { rankStyle = 'color:#f87171;font-weight:700;'; rankBadge = `<span style="color:#f87171;">${rank}</span>`; }
    }

    const badge = r.strTeamBadge
      ? `<img src="${r.strTeamBadge}" alt="" class="fb-team-badge" loading="lazy">`
      : '⚽';

    const gd = parseInt(r.intGoalDifference || 0);
    const gdStr = gd > 0 ? `+${gd}` : String(gd);
    const gdClr = gd > 0 ? '#4ade80' : gd < 0 ? '#f87171' : '#94a3b8';

    return `
      <tr class="fb-table-row">
        <td class="fb-rank" style="${rankStyle}">${rankBadge}</td>
        <td class="fb-team-cell">
          <span class="fb-badge-wrap">${badge}</span>
          <span class="fb-team-name">${r.strTeam}</span>
        </td>
        <td class="fb-stat">${r.intPlayed ?? '—'}</td>
        <td class="fb-stat">${r.intWin ?? '—'}</td>
        <td class="fb-stat">${r.intDraw ?? '—'}</td>
        <td class="fb-stat">${r.intLoss ?? '—'}</td>
        <td class="fb-stat" style="color:${gdClr};">${gdStr}</td>
        <td class="fb-pts" style="color:${lg.color};">${r.intPoints ?? '—'}</td>
      </tr>`;
  }).join('');

  // Legend for PL
  let legend = '';
  if (currentLeague === 'pl') {
    legend = `<div class="fb-legend">
      <span style="color:#60a5fa;">■</span> Top 4 (Champions League)
      &nbsp; <span style="color:#fb923c;">■</span> Europa League
      &nbsp; <span style="color:#f87171;">■</span> Xuống hạng
    </div>`;
  }

  el.innerHTML = `
    ${legend}
    <div style="overflow-x:auto;">
      <table class="fb-table">
        <thead>
          <tr>
            <th class="fb-rank">#</th>
            <th style="text-align:left;padding-left:8px;">Đội</th>
            <th class="fb-stat" title="Số trận">T</th>
            <th class="fb-stat" title="Thắng">W</th>
            <th class="fb-stat" title="Hòa">D</th>
            <th class="fb-stat" title="Thua">L</th>
            <th class="fb-stat" title="Hiệu số">GD</th>
            <th class="fb-pts" title="Điểm">Pts</th>
          </tr>
        </thead>
        <tbody>${rowHtml}</tbody>
      </table>
    </div>`;
}

// ─── Fixtures / Results list ──────────────────────────────────────
function renderFixtures(el, data) {
  let events = data.events || [];

  // For WC season view, show all; for others show paginated
  if (currentLeague === 'wc' && currentTab === 'next') {
    // Also merge season data if available
  }

  // Sort by date
  events = events.sort((a, b) => {
    const da = new Date(`${a.dateEvent}T${a.strTime || '00:00:00'}`);
    const db = new Date(`${b.dateEvent}T${b.strTime || '00:00:00'}`);
    return currentTab === 'past' ? db - da : da - db;
  });

  if (!events.length) {
    const msg = currentTab === 'next'
      ? '📅 Không có lịch thi đấu sắp tới'
      : '✅ Chưa có kết quả nào';
    el.innerHTML = `<div class="fb-empty">${msg}</div>`;
    return;
  }

  // Group by date
  const byDate = {};
  events.forEach(e => {
    const dateKey = e.dateEvent || 'unknown';
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(e);
  });

  const lg = LEAGUES[currentLeague];
  let html = '';

  for (const [date, evs] of Object.entries(byDate)) {
    const today = isToday(date);
    html += `<div class="fb-date-group">
      <div class="fb-date-header ${today ? 'fb-today' : ''}">
        ${today ? '🔴 Hôm nay' : fmtDateShort(date)}
        <span>${evs.length} trận</span>
      </div>`;

    for (const e of evs) {
      const live  = isLive(e.strStatus);
      const ns    = e.strStatus === 'NS';
      const score = (e.intHomeScore != null && e.intAwayScore != null)
        ? `${e.intHomeScore} – ${e.intAwayScore}`
        : '–';

      const homeBadge = e.strHomeTeamBadge
        ? `<img src="${e.strHomeTeamBadge}" alt="" class="fb-match-badge" loading="lazy">`
        : '';
      const awayBadge = e.strAwayTeamBadge
        ? `<img src="${e.strAwayTeamBadge}" alt="" class="fb-match-badge" loading="lazy">`
        : '';

      // Time display
      let timeDisplay = '';
      if (ns && e.strTime) {
        // Convert UTC to VN time
        const d = new Date(`${e.dateEvent}T${e.strTime}Z`);
        timeDisplay = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
      }

      const group = e.strGroup ? `<span class="fb-group-tag">${e.strGroup}</span>` : '';

      html += `
        <div class="fb-match ${live ? 'fb-match--live' : ''}">
          <div class="fb-match-left">
            <div class="fb-team-row">
              ${homeBadge}
              <span class="fb-match-team ${!ns && parseInt(e.intHomeScore) > parseInt(e.intAwayScore) ? 'fb-winner' : ''}">${e.strHomeTeam}</span>
            </div>
            <div class="fb-team-row">
              ${awayBadge}
              <span class="fb-match-team ${!ns && parseInt(e.intAwayScore) > parseInt(e.intHomeScore) ? 'fb-winner' : ''}">${e.strAwayTeam}</span>
            </div>
          </div>
          <div class="fb-match-center">
            ${group}
            ${live
              ? `<div class="fb-score fb-score--live">${score}</div><div class="fb-live-tag">● LIVE</div>`
              : ns
                ? `<div class="fb-time">${timeDisplay || 'TBD'}</div>`
                : `<div class="fb-score">${score}</div>`
            }
            ${e.strResult ? `<div class="fb-result-tag">${e.strResult}</div>` : ''}
          </div>
          <div class="fb-match-right">
            ${e.strVenue ? `<div class="fb-venue">📍 ${e.strVenue.replace(/, .+/,'')}</div>` : ''}
          </div>
        </div>`;
    }

    html += `</div>`;
  }

  el.innerHTML = html;
}
