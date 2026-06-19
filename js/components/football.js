/**
 * components/football.js
 * Football Center powered by ESPN API (EPL, La Liga, Serie A, UCL, World Cup)
 * No API key limits. Fully detailed match stats, lineups, and timelines.
 */

// ── Constants ──────────────────────────────────────────────────────
const API = (params) => `/football?${new URLSearchParams(params)}`;
const VN_TZ = 'Asia/Ho_Chi_Minh';

const LEAGUES = {
  pl: { id: 'eng.1', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League', color: '#60a5fa' },
  laliga: { id: 'esp.1', label: '🇪🇸 La Liga', color: '#fbbf24' },
  seriea: { id: 'ita.1', label: '🇮🇹 Serie A', color: '#34d399' },
  ucl: { id: 'uefa.champs', label: '🏆 Champions League', color: '#a78bfa' },
  wc: { id: 'fifa.world', label: '🌎 World Cup 2026', color: '#fb923c' },
};

// ── State ──────────────────────────────────────────────────────────
let _league   = 'pl';
let _tab      = 'fixtures'; // fixtures | table
let _cache    = {};
let _timer    = null;
let _expanded = null;
let _teamPanelId = null;
let _dateOffset = 0; // days offset from today for fixtures (-7=past week, 0=current, 7=next week)

// ── Helpers ────────────────────────────────────────────────────────
function toVN(dateStr) {
  try {
    return new Date(dateStr).toLocaleString('vi-VN', {
      weekday:'short', day:'2-digit', month:'2-digit',
      hour:'2-digit', minute:'2-digit', timeZone: VN_TZ
    });
  } catch { return dateStr; }
}

function toVNTime(dateStr) {
  try { return new Date(dateStr).toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit', timeZone: VN_TZ }); }
  catch { return dateStr; }
}

function toVNDateKey(dateStr) {
  try { return new Date(dateStr).toLocaleDateString('sv-SE', { timeZone: VN_TZ }); }
  catch { return dateStr; }
}

function isToday(dateKey) {
  return dateKey === new Date().toLocaleDateString('sv-SE', { timeZone: VN_TZ });
}

function fmtDateHeader(dateKey) {
  return new Date(dateKey + 'T00:00:00+07:00').toLocaleDateString('vi-VN', {
    weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'
  });
}

function badge(url, size=22) {
  return url ? `<img src="${url}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;flex-shrink:0;" loading="lazy" onerror="this.style.display='none'">` : '';
}

// ── Main entry ─────────────────────────────────────────────────────
export function renderFootball(containerId = 'footballContent') {
  const el = document.getElementById(containerId);
  if (!el) return;
  _expanded = null; _teamPanelId = null; _dateOffset = 0;
  buildShell(el);
  loadLeagueData();

  if (_timer) clearInterval(_timer);
  _timer = setInterval(() => {
    if (document.getElementById('section-football')?.classList.contains('active')) loadLeagueData(true);
  }, 60_000);
}

// ── Shell UI ───────────────────────────────────────────────────────
function buildShell(el) {
  const lg = LEAGUES[_league];
  const leagueTabs = Object.entries(LEAGUES).map(([key, l]) =>
    `<button class="fb-league-tab ${key===_league?'active':''}" onclick="window._fbLeague('${key}')"
       style="${key===_league?`border-color:${l.color}50;background:${l.color}12;color:${l.color};`:''}">
       ${l.label}</button>`
  ).join('');

  const tabs = [
    { key:'fixtures', label:'📅 Trận Đấu' },
    { key:'table',    label:'📊 Bảng Xếp Hạng' },
  ].map(t =>
    `<button class="fb-tab ${t.key===_tab?'active':''}" onclick="window._fbTab('${t.key}')"
       style="${t.key===_tab?`border-color:${lg.color}40;color:${lg.color};background:${lg.color}0d;`:''}">${t.label}</button>`
  ).join('');

  // Date navigation for fixtures tab
  const dateNav = `
    <div class="fb-date-nav" id="fbDateNav" style="${_tab!=='fixtures'?'display:none;':''}">
      <button class="fb-date-btn" onclick="window._fbDateShift(-7)">◀ Tuần trước</button>
      <button class="fb-date-btn ${_dateOffset===0?'active':''}" onclick="window._fbDateShift(0,'reset')">Hiện tại</button>
      <button class="fb-date-btn" onclick="window._fbDateShift(7)">Tuần sau ▶</button>
    </div>`;

  el.innerHTML = `
    <div class="fb-league-tabs">${leagueTabs}</div>
    <div class="fb-tabs">${tabs}</div>
    ${dateNav}
    <div id="fbMain" class="fb-main"></div>
    <div class="fb-team-panel" id="fbTeamPanel">
      <div class="fb-team-panel-inner" id="fbTeamPanelInner"></div>
    </div>
    <div class="fb-team-overlay" id="fbTeamOverlay" onclick="window._fbCloseTeam()"></div>
    <div class="fb-footer">
      <span style="color:var(--text-muted);font-size:11px;">Dữ liệu: ESPN Live Soccer</span>
      <span class="fb-live-badge"><span class="dot-green"></span> Tự động làm mới 60s</span>
    </div>`;

  window._fbLeague = (key) => { _league=key; _tab='fixtures'; _expanded=null; _dateOffset=0; buildShell(el); loadLeagueData(); };
  window._fbTab    = (key) => { _tab=key; buildShell(el); loadLeagueData(); };
  window._fbExpand = (id)  => { _expanded=_expanded===id?null:id; renderMain(); };
  window._fbTeam   = openTeamPanel;
  window._fbCloseTeam = closeTeamPanel;
  window._fbDateShift = (delta, mode) => {
    if (mode === 'reset') _dateOffset = 0;
    else _dateOffset += delta;
    buildShell(el);
    loadLeagueData();
  };
}

// ── Data loading ───────────────────────────────────────────────────
async function loadLeagueData(silent = false) {
  const leagueId = LEAGUES[_league].id;
  const type = _tab === 'fixtures' ? 'scoreboard' : 'table';
  const cacheKey = `${_league}_${type}_${_dateOffset}`;
  const main = document.getElementById('fbMain');
  if (!main) return;

  if (!silent) main.innerHTML = `<div class="fb-loading">⚽ Đang tải dữ liệu bóng đá...</div>`;

  try {
    const params = { league: leagueId, type };
    if (type === 'scoreboard' && _dateOffset !== 0) {
      const base = new Date();
      base.setDate(base.getDate() + _dateOffset);
      // ESPN scoreboard supports dates param for range
      const fmt = (d) => d.toLocaleDateString('sv-SE').replace(/-/g,'');
      const rangeStart = new Date(base); rangeStart.setDate(rangeStart.getDate() - 3);
      const rangeEnd   = new Date(base); rangeEnd.setDate(rangeEnd.getDate() + 4);
      params.dates = `${fmt(rangeStart)}-${fmt(rangeEnd)}`;
    }
    const res  = await fetch(API(params));
    const data = await res.json();
    _cache[cacheKey] = data;
    renderMain();
  } catch (err) {
    if (!silent) main.innerHTML = `<div class="error-msg">⚠️ Lỗi tải dữ liệu: ${err.message}</div>`;
  }
}

function renderMain() {
  const main = document.getElementById('fbMain');
  if (!main) return;
  const type = _tab === 'fixtures' ? 'scoreboard' : 'table';
  const data = _cache[`${_league}_${type}_${_dateOffset}`];
  if (!data) { main.innerHTML = `<div class="fb-loading">⚽ Đang tải...</div>`; return; }

  if (_tab === 'table') renderTable(main, data);
  else renderFixtureList(main, data);
}

// ── Fixtures / Scoreboard ──────────────────────────────────────────
function renderFixtureList(el, data) {
  const events = data.events || [];

  if (!events.length) {
    el.innerHTML = `<div class="fb-empty">📅 Hiện chưa có trận đấu nào trong vòng này.</div>`;
    return;
  }

  // Group by VN date
  const byDate = new Map();
  for (const e of events) {
    const dk = toVNDateKey(e.date);
    if (!byDate.has(dk)) byDate.set(dk, []);
    byDate.get(dk).push(e);
  }

  const lg = LEAGUES[_league];
  let html = '';

  for (const [dateKey, evs] of byDate) {
    const today = isToday(dateKey);
    html += `
      <div class="fb-date-group">
        <div class="fb-date-header ${today ? 'fb-today' : ''}" style="${today ? `border-color:${lg.color};color:${lg.color};` : ''}">
          <span>${today ? '🔴 TRẬN ĐẤU HÔM NAY' : fmtDateHeader(dateKey)}</span>
          <span>${evs.length} trận</span>
        </div>`;

    for (const e of evs) {
      html += renderMatchCard(e, lg);
    }
    html += `</div>`;
  }

  el.innerHTML = html;
}

function renderMatchCard(e, lg) {
  const isExpanded = _expanded === e.id;
  const status = e.status?.type;
  
  // States: pre (scheduled), in (live), post (finished)
  const isLive = status?.state === 'in';
  const isPre = status?.state === 'pre';
  const isPost = status?.state === 'post';
  
  const competition = e.competitions?.[0];
  const competitors = competition?.competitors || [];
  
  const home = competitors.find(c => c.homeAway === 'home') || {};
  const away = competitors.find(c => c.homeAway === 'away') || {};
  
  const homeName = home.team?.displayName || 'Home Team';
  const homeBadge = home.team?.logos?.[0]?.href || home.team?.logo || '';
  const homeScore = home.score ?? 0;
  
  const awayName = away.team?.displayName || 'Away Team';
  const awayBadge = away.team?.logos?.[0]?.href || away.team?.logo || '';
  const awayScore = away.score ?? 0;
  
  const scoreStr = !isPre ? `${homeScore} – ${awayScore}` : 'vs';
  const vnTime = toVNTime(e.date);
  
  const statusText = status?.detail || vnTime;
  const venue = competition?.venue?.fullName || '';

  const detail = isExpanded ? `<div id="fbMatchDetail_${e.id}" class="fb-match-detail"><div class="fb-loading">⏳ Đang tải chi tiết trận đấu...</div></div>` : '';

  // Trigger lazy loading of detail when expanded
  if (isExpanded) {
    setTimeout(() => loadMatchDetail(e.id, lg), 50);
  }

  return `
    <div class="fb-match ${isLive ? 'fb-match--live' : ''} ${isExpanded ? 'fb-match--expanded' : ''}" id="fbMatch_${e.id}">
      <div class="fb-match-row" onclick="window._fbExpand('${e.id}')">
        <!-- Left: Home team -->
        <div class="fb-team-col fb-team-col--home">
          <button class="fb-team-btn" onclick="event.stopPropagation();window._fbTeam('${home.team?.id}','${homeName}','${homeBadge}')">
            ${badge(homeBadge, 24)}
            <span class="fb-match-team-name ${isPost && parseInt(homeScore) > parseInt(awayScore) ? 'fb-winner' : ''}">${homeName}</span>
          </button>
        </div>

        <!-- Center: Score / Time -->
        <div class="fb-score-col">
          ${isLive 
            ? `<div class="fb-score-box fb-score-live">${scoreStr}</div><div class="fb-live-pill">● ${statusText}</div>`
            : isPre 
              ? `<div class="fb-time-box" style="color: ${lg.color}">${vnTime}</div><div class="fb-result-note">Lịch thi đấu</div>`
              : `<div class="fb-score-box">${scoreStr}</div><div class="fb-result-note">Đã kết thúc</div>`}
        </div>

        <!-- Right: Away team -->
        <div class="fb-team-col fb-team-col--away">
          <button class="fb-team-btn fb-team-btn--away" onclick="event.stopPropagation();window._fbTeam('${away.team?.id}','${awayName}','${awayBadge}')">
            <span class="fb-match-team-name ${isPost && parseInt(awayScore) > parseInt(homeScore) ? 'fb-winner' : ''}">${awayName}</span>
            ${badge(awayBadge, 24)}
          </button>
        </div>

        <!-- Expand arrow -->
        <div class="fb-expand-icon">${isExpanded ? '▲' : '▼'}</div>
      </div>
      ${detail}
    </div>`;
}

// ── Match details loader ───────────────────────────────────────────
async function loadMatchDetail(eventId, lg) {
  const container = document.getElementById(`fbMatchDetail_${eventId}`);
  if (!container) return;

  const leagueId = LEAGUES[_league].id;
  try {
    const res = await fetch(API({ league: leagueId, type: 'summary', id: eventId }));
    const data = await res.json();
    renderMatchDetail(container, data, lg);
  } catch (err) {
    container.innerHTML = `<div class="error-msg" style="padding:10px 0;">⚠️ Lỗi tải chi tiết: ${err.message}</div>`;
  }
}

function renderMatchDetail(el, data, lg) {
  // 1. Boxscore Stats Comparison
  const teams = data.boxscore?.teams || [];
  let statsHtml = '';
  if (teams.length === 2) {
    const homeStats = teams[0].statistics || [];
    const awayStats = teams[1].statistics || [];
    
    // Core statistics mapping to match actual ESPN API keys
    const statKeys = [
      { name: 'possessionPct', label: 'Kiểm soát bóng (%)' },
      { name: 'totalShots', label: 'Tổng cú sút' },
      { name: 'shotsOnTarget', label: 'Sút trúng đích' },
      { name: 'foulsCommitted', label: 'Phạm lỗi' },
      { name: 'wonCorners', label: 'Phạt góc' },
      { name: 'yellowCards', label: 'Thẻ vàng' },
      { name: 'redCards', label: 'Thẻ đỏ' },
    ];

    const statsList = statKeys.map(k => {
      const hStat = homeStats.find(s => s.name === k.name);
      const aStat = awayStats.find(s => s.name === k.name);

      if (!hStat && !aStat) return '';

      const hVal = parseFloat(hStat?.displayValue || 0);
      const aVal = parseFloat(aStat?.displayValue || 0);
      const total = hVal + aVal;
      
      let hPct = 50;
      let aPct = 50;
      if (total > 0) {
        hPct = (hVal / total) * 100;
        aPct = (aVal / total) * 100;
      }

      return `
        <div class="fb-stats-row">
          <div class="fb-stats-label-row">
            <span>${hStat?.displayValue || '0'}</span>
            <span class="fb-detail-label">${k.label}</span>
            <span>${aStat?.displayValue || '0'}</span>
          </div>
          <div class="fb-stats-bar-container">
            <div class="fb-stats-bar-home" style="width: ${hPct}%; background-color: var(--accent-blue)"></div>
            <div class="fb-stats-bar-away" style="width: ${aPct}%; background-color: var(--accent-yellow)"></div>
          </div>
        </div>`;
    }).join('');

    statsHtml = statsList ? `
      <div class="fb-stats-container">
        <div class="fb-detail-sec-title">📊 Thống kê trận đấu</div>
        ${statsList}
      </div>` : '';
  }

  // 2. Key Events / Timeline
  const keyEvents = data.keyEvents || [];
  let timelineHtml = '';
  if (keyEvents.length > 0) {
    const list = keyEvents.map(ev => {
      const time = ev.clock?.displayValue || '';
      const text = ev.text || '';
      const type = ev.type?.text || 'Sự kiện';
      
      let icon = '⚽';
      if (type.includes('Yellow')) icon = '🟨';
      else if (type.includes('Red')) icon = '🟥';
      else if (type.includes('Substitution')) icon = '🔄';

      // Skip event descriptions that are blank
      if (!text && !time) return '';

      return `
        <div class="fb-timeline-item">
          <span class="fb-timeline-time">${time || '0\''}</span>
          <span class="fb-timeline-icon">${icon}</span>
          <span class="fb-timeline-text">${text || type}</span>
        </div>`;
    }).filter(Boolean).join('');

    timelineHtml = list ? `
      <div class="fb-stats-container" style="margin-top: 14px;">
        <div class="fb-detail-sec-title">⏱️ Diễn biến chính</div>
        <div class="fb-timeline-list">${list}</div>
      </div>` : '';
  }

  // 3. Lineups / Rosters
  const rostersList = Array.isArray(data.rosters) ? data.rosters : [];
  let rosterHtml = '';
  
  const getRoster = (side) => {
    const teamData = rostersList.find(r => r.homeAway === side) || {};
    const list = teamData.roster || [];
    const starters = list.filter(p => p.starter);
    if (!starters.length) return '';

    return `
      <div class="fb-roster-col">
        <h4>${side === 'home' ? '🏠 Chủ nhà' : '✈️ Khách'} (Sơ đồ: ${teamData.formation || 'N/A'})</h4>
        <div class="fb-roster-list">
          ${starters.map(p => `
            <div class="fb-player-item">
              <span>${p.jersey || ''}. <strong>${p.athlete?.displayName || ''}</strong></span>
              <span class="fb-player-pos">${p.position?.displayName || ''}</span>
            </div>`).join('')}
        </div>
      </div>`;
  };

  const homeRosterHtml = getRoster('home');
  const awayRosterHtml = getRoster('away');
  if (homeRosterHtml || awayRosterHtml) {
    rosterHtml = `
      <div class="fb-stats-container" style="margin-top: 14px;">
        <div class="fb-detail-sec-title">🏃 Đội hình xuất phát</div>
        <div class="fb-roster-grid">
          ${homeRosterHtml}
          ${awayRosterHtml}
        </div>
      </div>`;
  }

  // 4. Info Card
  const info = data.gameInfo || {};
  const ref = info.referee?.displayName ? ` · ⚖️ Trọng tài: ${info.referee.displayName}` : '';
  const venue = [info.venue?.fullName, info.venue?.address?.city].filter(Boolean).join(' - ');
  const venueStr = venue ? `📍 Sân: ${venue}` : '';

  el.innerHTML = `
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;padding:4px 0;">
      ${venueStr}${ref}
    </div>
    ${statsHtml}
    ${timelineHtml}
    ${rosterHtml}
  `;
}

// ── Standings table ────────────────────────────────────────────────
function renderTable(el, data) {
  const lg = LEAGUES[_league];
  
  // Standard leagues have 1 child in data.children
  // Cup group stages (World Cup) have multiple children (one for each group)
  const children = data.children || [];

  if (!children.length) {
    el.innerHTML = `<div class="fb-empty">📊 Hiện chưa có dữ liệu bảng xếp hạng.</div>`;
    return;
  }

  // Render group grids
  let html = '';

  children.forEach(group => {
    // Sort entries: points DESC → GD DESC → GF DESC
    const entries = [...(group.standings?.entries || [])].sort((a, b) => {
      const getStat = (e, name) => e.stats?.find(s => s.name === name)?.value ?? 0;
      const ptsDiff = getStat(b,'points') - getStat(a,'points');
      if (ptsDiff !== 0) return ptsDiff;
      const gdDiff = getStat(b,'pointDifferential') - getStat(a,'pointDifferential');
      if (gdDiff !== 0) return gdDiff;
      return getStat(b,'goalsFor') - getStat(a,'goalsFor');
    });
    const hasGroupName = children.length > 1;

    if (!entries.length) return;

    const groupTitle = hasGroupName ? `<div class="fb-detail-sec-title" style="margin: 18px 0 8px; color: ${lg.color}; font-size:13px; font-weight:700;">${group.name || 'Group'}</div>` : '';

    const thead = `
      <tr>
        <th class="fb-th-rank">#</th>
        <th class="fb-th-team">Đội bóng</th>
        <th class="fb-th-stat" title="Số trận">Tr</th>
        <th class="fb-th-stat" title="Thắng">T</th>
        <th class="fb-th-stat" title="Hòa">H</th>
        <th class="fb-th-stat" title="Thua">B</th>
        <th class="fb-th-stat" title="Bàn thắng/Bàn thua">BT-BB</th>
        <th class="fb-th-stat" title="Hiệu số">HS</th>
        <th class="fb-th-form">5 trận gần nhất</th>
        <th class="fb-th-pts">Điểm</th>
      </tr>`;

    const tbody = entries.map((entry, index) => {
      const teamName = entry.team?.displayName || 'Team';
      const teamBadge = entry.team?.logos?.[0]?.href || entry.team?.logo || '';
      
      const rank = entry.stats?.find(s => s.name === 'rank' || s.name === 'position')?.value ?? (index + 1);
      const played = entry.stats?.find(s => s.name === 'gamesPlayed')?.value ?? 0;
      const wins = entry.stats?.find(s => s.name === 'wins')?.value ?? 0;
      const draws = entry.stats?.find(s => s.name === 'ties')?.value ?? 0;
      const losses = entry.stats?.find(s => s.name === 'losses')?.value ?? 0;
      
      const goalsFor = entry.stats?.find(s => s.name === 'goalsFor')?.value ?? 0;
      const goalsAgainst = entry.stats?.find(s => s.name === 'goalsAgainst')?.value ?? 0;
      
      const gd = entry.stats?.find(s => s.name === 'pointDifferential')?.value ?? 0;
      const gdStr = gd > 0 ? `+${gd}` : String(gd);
      const gdClr = gd > 0 ? '#4ade80' : gd < 0 ? '#f87171' : '#94a3b8';

      const pts = entry.stats?.find(s => s.name === 'points')?.value ?? 0;
      
      // Form string like W-D-L-W-W
      const formStr = entry.stats?.find(s => s.name === 'summary')?.displayValue || '';
      const formHtml = formStr ? formStr.split('-').map(char => {
        const clr = char === 'W' ? '#4ade80' : char === 'L' ? '#f87171' : '#94a3b8';
        const displayChar = char === 'W' ? 'T' : char === 'L' ? 'B' : 'H';
        return `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;font-size:9px;font-weight:800;background:${clr}22;color:${clr};border:1px solid ${clr}44;margin:0 1px;">${displayChar}</span>`;
      }).join('') : '—';

      // Border highlight for Champions League / Relegation in PL
      let borderLeftStyle = '';
      if (_league === 'pl') {
        if (rank <= 4)  borderLeftStyle = 'border-left:3px solid #60a5fa;'; // UCL
        else if (rank === 5) borderLeftStyle = 'border-left:3px solid #fb923c;'; // UEL
        else if (rank >= 18) borderLeftStyle = 'border-left:3px solid #f87171;'; // Relegation
      }

      return `
        <tr class="fb-table-row" style="${borderLeftStyle}">
          <td class="fb-td-rank">${rank}</td>
          <td class="fb-td-team">
            <button class="fb-team-btn" onclick="window._fbTeam('${entry.team?.id}','${teamName}','${teamBadge}')">
              ${badge(teamBadge, 20)}
              <span class="fb-team-name-td">${teamName}</span>
            </button>
          </td>
          <td class="fb-td-stat">${played}</td>
          <td class="fb-td-stat">${wins}</td>
          <td class="fb-td-stat">${draws}</td>
          <td class="fb-td-stat">${losses}</td>
          <td class="fb-td-stat">${goalsFor}-${goalsAgainst}</td>
          <td class="fb-td-stat" style="color:${gdClr};font-weight:600;">${gdStr}</td>
          <td class="fb-td-form">${formHtml}</td>
          <td class="fb-td-pts" style="color:${lg.color};">${pts}</td>
        </tr>`;
    }).join('');

    html += `
      ${groupTitle}
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
        <table class="fb-table">
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>`;
  });

  el.innerHTML = html;
}

// ── Team panel ─────────────────────────────────────────────────────
async function openTeamPanel(teamId, teamName, teamBadgeUrl) {
  _teamPanelId = teamId;
  const panel   = document.getElementById('fbTeamPanel');
  const inner   = document.getElementById('fbTeamPanelInner');
  const overlay = document.getElementById('fbTeamOverlay');
  if (!panel || !inner) return;

  panel.classList.add('open');
  if (overlay) overlay.classList.add('visible');

  inner.innerHTML = `
    <div class="fb-tp-header">
      <button class="fb-tp-close" onclick="window._fbCloseTeam()">✕</button>
      <div class="fb-tp-hero">
        ${badge(teamBadgeUrl, 44)}
        <div>
          <div class="fb-tp-name">${teamName}</div>
          <div class="fb-tp-meta" id="fbTeamMeta">🌍 Đang tải thông tin CLB...</div>
        </div>
      </div>
    </div>
    <div class="fb-tp-desc" id="fbTeamDesc">Đang tải mô tả chi tiết...</div>
    <div class="fb-tp-section">
      <div class="fb-tp-section-title">📅 Trận đấu gần đây & sắp tới</div>
      <div id="fbTeamSchedule" class="fb-loading">⏳ Đang tải lịch đấu CLB...</div>
    </div>`;

  const leagueId = LEAGUES[_league].id;
  try {
    const [teamRes, schedRes] = await Promise.all([
      fetch(API({ league: leagueId, type: 'team', id: teamId })),
      fetch(API({ league: leagueId, type: 'team-schedule', id: teamId })),
    ]);

    const teamData = await teamRes.json();
    const schedData = await schedRes.json();

    if (_teamPanelId !== teamId) return;

    renderTeamDetails(teamData, schedData, teamName);
  } catch (err) {
    document.getElementById('fbTeamSchedule').innerHTML = `<div class="error-msg">⚠️ Lỗi tải: ${err.message}</div>`;
  }
}

function renderTeamDetails(teamData, schedData, teamName) {
  const team = teamData.team || {};
  const metaEl = document.getElementById('fbTeamMeta');
  const descEl = document.getElementById('fbTeamDesc');
  const schedEl = document.getElementById('fbTeamSchedule');

  if (metaEl) {
    const location = team.venue?.fullName ? `🏟️ ${team.venue.fullName}` : 'Sân vận động';
    metaEl.innerHTML = `${location}`;
  }

  if (descEl) {
    descEl.textContent = team.description || `Thông tin chính thức của câu lạc bộ ${teamName}. Hiện chưa có mô tả chi tiết bằng tiếng Việt.`;
  }

  if (schedEl) {
    const events = schedData.events || [];
    if (!events.length) {
      schedEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:12px 0;">Không có dữ liệu trận đấu sắp tới.</div>';
      return;
    }

    schedEl.innerHTML = events.slice(0, 8).map(e => {
      const status = e.status?.type;
      const isPost = status?.state === 'post';
      
      const competitor = e.competitions?.[0]?.competitors || [];
      const home = competitor.find(c => c.homeAway === 'home') || {};
      const away = competitor.find(c => c.homeAway === 'away') || {};
      
      const homeName = home.team?.displayName || '';
      const awayName = away.team?.displayName || '';

      const scored = isPost;
      const score = scored ? `${home.score} - ${away.score}` : 'vs';

      const isHome = home.team?.id === _teamPanelId;
      const opponent = isHome ? awayName : homeName;
      const oppBadge = isHome ? (away.team?.logos?.[0]?.href || away.team?.logo) : (home.team?.logos?.[0]?.href || home.team?.logo);
      const isWin = isPost && ((isHome && home.score > away.score) || (!isHome && away.score > home.score));
      const isLoss = isPost && ((isHome && home.score < away.score) || (!isHome && away.score < home.score));
      
      const resChar = isPost ? (isWin ? 'T' : isLoss ? 'B' : 'H') : '—';
      const resCls = isPost ? (isWin ? 'fb-tp-w' : isLoss ? 'fb-tp-l' : 'fb-tp-d') : 'fb-tp-d';

      return `
        <div class="fb-tp-match">
          <span class="fb-tp-res ${resCls}">${resChar}</span>
          <div class="fb-tp-match-info">
            <div class="fb-tp-opp">
              ${badge(oppBadge, 16)}
              <span>${isHome ? 'vs' : '@'} ${opponent}</span>
            </div>
            <div class="fb-tp-meta">${toVN(e.date)}</div>
          </div>
          <span class="fb-tp-score">${score}</span>
        </div>`;
    }).join('');
  }
}

function closeTeamPanel() {
  _teamPanelId = null;
  const panel   = document.getElementById('fbTeamPanel');
  const overlay = document.getElementById('fbTeamOverlay');
  if (panel)   panel.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
}
