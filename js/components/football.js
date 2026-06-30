/**
 * components/football.js
 * Football Center powered by ESPN API (EPL, La Liga, Serie A, UCL, World Cup)
 * No API key limits. Fully detailed match stats, lineups, and timelines.
 */

// ── Constants ──────────────────────────────────────────────────────
const API = (params) => `/football?${new URLSearchParams(params)}`;
const VN_TZ = 'Asia/Ho_Chi_Minh';

const LEAGUES = {
 wc: { id: 'fifa.world', label: 'World Cup 2026', color: '#fb923c' },
 pl: { id: 'eng.1', label: '󠁧󠁢󠁥󠁮󠁧󠁿 Premier League', color: '#60a5fa' },
 laliga: { id: 'esp.1', label: 'La Liga', color: '#fbbf24' },
 seriea: { id: 'ita.1', label: 'Serie A', color: '#34d399' },
 ucl: { id: 'uefa.champs', label: 'Champions League', color: '#a78bfa' },
};

// ── State ──────────────────────────────────────────────────────────
let _league   = 'wc';
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
 { key:'fixtures', label:'Trận Đấu' },
 { key:'table', label:'Bảng Xếp Hạng' },
 { key:'stats', label:'Thống Kê' },
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
  const type = _tab === 'fixtures' ? 'scoreboard' : _tab === 'table' ? 'table' : 'statistics';
  const cacheKey = `${_league}_${type}_${_dateOffset}`;
  const main = document.getElementById('fbMain');
  if (!main) return;

 if (!silent) main.innerHTML = `<div class="fb-loading">Đang tải dữ liệu bóng đá...</div>`;

  try {
    const params = { league: leagueId, type };
    if (type === 'statistics' || type === 'table') {
      params.season = _league === 'wc' ? '2026' : '2025';
    }
    if (type === 'scoreboard') {
      const base = new Date();
      base.setDate(base.getDate() + _dateOffset);
      // ESPN scoreboard supports dates param for range
      const fmt = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const rangeStart = new Date(base); rangeStart.setDate(rangeStart.getDate() - 3);
      const rangeEnd   = new Date(base); rangeEnd.setDate(rangeEnd.getDate() + 3);
      params.dates = `${fmt(rangeStart)}-${fmt(rangeEnd)}`;
    }
    const res  = await fetch(API(params));
    const data = await res.json();
    _cache[cacheKey] = data;
    renderMain();
  } catch (err) {
 if (!silent) main.innerHTML = `<div class="error-msg">️ Lỗi tải dữ liệu: ${err.message}</div>`;
  }
}

function renderMain() {
  const main = document.getElementById('fbMain');
  if (!main) return;
  const type = _tab === 'fixtures' ? 'scoreboard' : _tab === 'table' ? 'table' : 'statistics';
  const data = _cache[`${_league}_${type}_${_dateOffset}`];
 if (!data) { main.innerHTML = `<div class="fb-loading">Đang tải...</div>`; return; }

  if (_tab === 'table') renderTable(main, data);
  else if (_tab === 'stats') renderStats(main, data);
  else renderFixtureList(main, data);
}

// ── Fixtures / Scoreboard ──────────────────────────────────────────
function renderFixtureList(el, data) {
  const events = data.events || [];

  if (!events.length) {
 el.innerHTML = `<div class="fb-empty">Hiện chưa có trận đấu nào trong vòng này.</div>`;
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
 <span>${today ? 'TRẬN ĐẤU HÔM NAY' : fmtDateHeader(dateKey)}</span>
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
  
  const homeWinner = home.winner === true;
  const awayWinner = away.winner === true;
  
  let scoreStr = !isPre ? `${homeScore} – ${awayScore}` : 'vs';
  
  // Handle penalty shootout scores if they exist
  let homeShootout = home.shootoutScore;
  let awayShootout = away.shootoutScore;
  if ((homeShootout === undefined || homeShootout === null) && home.linescores && home.linescores.length > 2) {
    if (status?.name?.includes('PEN') || status?.name?.includes('SHOOTOUT') || status?.detail?.toLowerCase().includes('pen') || status?.detail?.toLowerCase().includes('shootout')) {
      homeShootout = home.linescores[home.linescores.length - 1]?.value ?? home.linescores[home.linescores.length - 1]?.displayValue;
      awayShootout = away.linescores[away.linescores.length - 1]?.value ?? away.linescores[away.linescores.length - 1]?.displayValue;
    }
  }
  if (homeShootout !== undefined && awayShootout !== undefined && homeShootout !== null && awayShootout !== null) {
    scoreStr = `${homeScore} – ${awayScore} (${homeShootout} - ${awayShootout} pen)`;
  }
  
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
            <span class="fb-match-team-name ${isPost && homeWinner ? 'fb-winner' : ''}">${homeName}</span>
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
            <span class="fb-match-team-name ${isPost && awayWinner ? 'fb-winner' : ''}">${awayName}</span>
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
 container.innerHTML = `<div class="error-msg" style="padding:10px 0;">️ Lỗi tải chi tiết: ${err.message}</div>`;
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
 <div class="fb-detail-sec-title">Thống kê trận đấu</div>
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
      
 let icon = '';
 if (type.includes('Yellow')) icon = '';
 else if (type.includes('Red')) icon = '';
 else if (type.includes('Substitution')) icon = '';

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

  const competitors = data.header?.competitions?.[0]?.competitors || [];
  const homeComp = competitors.find(c => c.homeAway === 'home') || {};
  const awayComp = competitors.find(c => c.homeAway === 'away') || {};

  const calculatePlayerRating = (player, teamWon, teamConceded) => {
    const stats = player.stats || [];
    const getVal = (name) => {
      const s = stats.find(x => x.name === name);
      return s ? parseInt(s.value) || 0 : 0;
    };

    const appearances = getVal('appearances');
    const subIns = getVal('subIns');
    const subbedIn = player.subbedIn;
    const starter = player.starter;
    
    // If did not play, return null
    if (!starter && !subbedIn && appearances === 0 && subIns === 0) {
      return null;
    }

    let rating = 6.0; // Baseline

    const isGK = player.position?.abbreviation === 'G' || player.position?.name?.toLowerCase().includes('goalkeeper');
    const posName = player.position?.name?.toLowerCase() || '';
    const posAbbr = player.position?.abbreviation?.toLowerCase() || '';
    const isDF = posAbbr.includes('d') || posName.includes('defender') || posName.includes('back');
    const isMF = posAbbr.includes('m') || posName.includes('midfielder');

    // Base adjustments based on team result
    if (teamWon) {
      rating += 0.4;
    } else if (teamConceded > 0 && !teamWon) {
      rating -= 0.2;
    }

    // Clean sheet or goals conceded impact
    if (teamConceded === 0) {
      if (isGK) rating += 0.8;
      else if (isDF) rating += 0.5;
      else if (isMF) rating += 0.1;
    } else {
      // Conceded goals
      if (isGK) {
        rating -= teamConceded * 0.45;
      } else if (isDF) {
        rating -= teamConceded * 0.15;
      }
    }

    // Baseline for playing full match (helps defenders in losing teams)
    if (starter && !player.subbedOut) {
      rating += 0.3;
    }

    const goals = getVal('totalGoals');
    const assists = getVal('goalAssists');
    const shotsOnTarget = getVal('shotsOnTarget');
    const totalShots = getVal('totalShots');
    const foulsSuffered = getVal('foulsSuffered');
    const foulsCommitted = getVal('foulsCommitted');
    const yellowCards = getVal('yellowCards');
    const redCards = getVal('redCards');
    const ownGoals = getVal('ownGoals');
    const saves = getVal('saves');

    // Offensive contribution
    if (goals > 0) rating += goals * 1.0;
    if (assists > 0) rating += assists * 0.7;

    // Shots and Saves
    if (shotsOnTarget > 0) {
      rating += shotsOnTarget * 0.25;
    } else if (totalShots > 0) {
      rating += totalShots * 0.05;
    }

    if (isGK && saves > 0) {
      rating += saves * 0.25;
    }

    // Micro stats
    rating += foulsSuffered * 0.05;
    rating -= foulsCommitted * 0.05;
    rating -= yellowCards * 0.5;
    rating -= redCards * 1.5;
    rating -= ownGoals * 2.0;

    // Subbed out penalty
    if (player.subbedOut) {
      rating -= 0.1;
    }

    rating = Math.max(3.0, Math.min(10.0, rating));
    return rating.toFixed(1);
  };

  // Find Player of the Match (POTM)
  let potmPlayer = null;
  let maxRating = 0;

  rostersList.forEach(teamRoster => {
    const side = teamRoster.homeAway;
    const teamId = teamRoster.team?.id;
    const comp = competitors.find(c => c.team?.id === teamId) || (side === 'home' ? homeComp : awayComp);
    const opponentComp = competitors.find(c => c.team?.id !== teamId) || (side === 'home' ? awayComp : homeComp);
    
    const teamWon = comp.winner === true;
    const teamConceded = parseInt(opponentComp.score) || 0;

    const list = teamRoster.roster || [];
    list.forEach(p => {
      const ratingStr = calculatePlayerRating(p, teamWon, teamConceded);
      if (ratingStr) {
        const ratingVal = parseFloat(ratingStr);
        if (ratingVal > maxRating) {
          maxRating = ratingVal;
          potmPlayer = {
            id: p.athlete?.id,
            name: p.athlete?.displayName,
            jersey: p.jersey,
            position: p.position?.displayName,
            teamName: teamRoster.team?.displayName,
            rating: ratingStr
          };
        }
      }
    });
  });

  const formatPlayerStats = (player) => {
    const stats = player.stats || [];
    const getVal = (name) => {
      const s = stats.find(x => x.name === name);
      return s ? parseInt(s.value) || 0 : 0;
    };
    const goals = getVal('totalGoals');
    const assists = getVal('goalAssists');
    const yc = getVal('yellowCards');
    const rc = getVal('redCards');
    const saves = getVal('saves');
    
    const badges = [];
 if (goals > 0) badges.push(`${goals > 1 ? `x${goals}` : ''}`);
 if (assists > 0) badges.push(`️${assists > 1 ? `x${assists}` : ''}`);
 if (rc > 0) badges.push('');
 else if (yc > 0) badges.push('');
 if (saves > 0 && player.position?.abbreviation === 'G') badges.push(`${saves}`);
    
    if (player.subbedIn) badges.push('⬆️');
    if (player.subbedOut) badges.push('⬇️');

    return badges.length ? `<span class="fb-player-badges">${badges.join(' ')}</span>` : '';
  };
  
  const getRoster = (side) => {
    const teamData = rostersList.find(r => r.homeAway === side) || {};
    const teamId = teamData.team?.id;
    const comp = competitors.find(c => c.team?.id === teamId) || (side === 'home' ? homeComp : awayComp);
    const opponentComp = competitors.find(c => c.team?.id !== teamId) || (side === 'home' ? awayComp : homeComp);
    
    const teamWon = comp.winner === true;
    const teamConceded = parseInt(opponentComp.score) || 0;

    const list = teamData.roster || [];
    const starters = list.filter(p => p.starter);
    const subs = list.filter(p => !p.starter);
    if (!starters.length && !subs.length) return '';

    const renderPlayer = (p) => {
      const statBadges = formatPlayerStats(p);
      const rating = calculatePlayerRating(p, teamWon, teamConceded);
      const ratingHtml = rating 
        ? `<span class="fb-player-rating" style="background:${parseFloat(rating) >= 7.0 ? 'rgba(74,222,128,0.15)' : parseFloat(rating) >= 6.0 ? 'rgba(251,146,60,0.15)' : 'rgba(248,113,113,0.15)'};color:${parseFloat(rating) >= 7.0 ? '#4ade80' : parseFloat(rating) >= 6.0 ? '#fb923c' : '#f87171'};border:1px solid ${parseFloat(rating) >= 7.0 ? 'rgba(74,222,128,0.3)' : parseFloat(rating) >= 6.0 ? 'rgba(251,146,60,0.3)' : 'rgba(248,113,113,0.3)'};">${rating}</span>`
        : '';

      const isPOTM = potmPlayer && p.athlete?.id === potmPlayer.id;
 const potmCrown = isPOTM ? '' : '';
      const potmStyle = isPOTM ? 'style="background: rgba(251, 191, 36, 0.06); border: 1px solid rgba(251, 191, 36, 0.2) !important;"' : '';
        
      return `
        <div class="fb-player-item ${p.starter ? '' : 'fb-player-item--sub'}" ${potmStyle}>
          <div class="fb-player-name-col">
            <span class="fb-player-jersey">${p.jersey || '-'}</span>
            <strong>${potmCrown}${p.athlete?.displayName || ''}</strong>
            ${statBadges}
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="fb-player-pos">${p.position?.displayName || ''}</span>
            ${ratingHtml}
          </div>
        </div>`;
    };

    return `
      <div class="fb-roster-col">
        <h4 style="border-bottom: 2px solid ${side === 'home' ? 'var(--accent-blue)' : 'var(--accent-yellow)'}; padding-bottom: 6px; margin-bottom: 10px;">
 ${side === 'home' ? 'Chủ nhà' : '️ Khách'} (Sơ đồ: ${teamData.formation || 'N/A'})
        </h4>
 <div class="fb-roster-sub-title">Đá chính</div>
        <div class="fb-roster-list">
          ${starters.map(renderPlayer).join('')}
        </div>
        ${subs.length ? `
 <div class="fb-roster-sub-title">️ Dự bị</div>
          <div class="fb-roster-list">
            ${subs.map(renderPlayer).join('')}
          </div>
        ` : ''}
      </div>`;
  };

  const homeRosterHtml = getRoster('home');
  const awayRosterHtml = getRoster('away');
  if (homeRosterHtml || awayRosterHtml) {
    rosterHtml = `
      <div class="fb-stats-container" style="margin-top: 14px;">
 <div class="fb-detail-sec-title">Đội hình & Cầu thủ</div>
        <div class="fb-roster-grid">
          ${homeRosterHtml}
          ${awayRosterHtml}
        </div>
      </div>`;
  }

  // 4. Extract scorers from keyEvents
  const homeTeamId = teams[0]?.team?.id;
  const awayTeamId = teams[1]?.team?.id;
  const homeGoals = [];
  const awayGoals = [];

  keyEvents.forEach(ev => {
    const type = ev.type?.type || '';
    if (type.startsWith('goal') || ev.scoringPlay === true) {
      const time = ev.clock?.displayValue || '';
      const rawName = ev.participants?.[0]?.athlete?.displayName || ev.shortText || '';
      
      let displayPlayer = rawName;
      if (rawName.includes(' Goal')) {
        displayPlayer = rawName.split(' Goal')[0];
      } else if (rawName.includes(' (')) {
        displayPlayer = rawName.split(' (')[0];
      }

      // Check if it's an Own Goal (OG) or penalty (PEN)
      const typeText = ev.type?.text || '';
      let suffix = '';
      if (typeText.toLowerCase().includes('own goal')) {
        suffix = ' (OG)';
      } else if (typeText.toLowerCase().includes('penalty')) {
        suffix = ' (P)';
      }

      const goalStr = `${displayPlayer}${suffix} (${time})`;

      if (ev.team?.id === homeTeamId) {
        homeGoals.push(goalStr);
      } else if (ev.team?.id === awayTeamId) {
        awayGoals.push(goalStr);
      }
    }
  });

  let headerAddonsHtml = '';
  let scorersHtml = '';
  if (homeGoals.length > 0 || awayGoals.length > 0) {
    scorersHtml = `
      <div class="fb-scorers-container">
        <div class="fb-scorers-col home-scorers">
 ${homeGoals.map(g => `<div class="fb-scorer-item">${g}</div>`).join('')}
        </div>
        <div class="fb-scorers-divider"></div>
        <div class="fb-scorers-col away-scorers">
 ${awayGoals.map(g => `<div class="fb-scorer-item">${g}</div>`).join('')}
        </div>
      </div>`;
  }

  let potmHtml = '';
  if (potmPlayer) {
    potmHtml = `
      <div class="fb-potm-container">
 <span class="fb-potm-badge">POTM</span>
        <span class="fb-potm-info">
          <strong>${potmPlayer.name}</strong> (${potmPlayer.teamName}) - 
          <span class="fb-potm-rating">${potmPlayer.rating}</span>
        </span>
      </div>`;
  }

  if (scorersHtml || potmHtml) {
    headerAddonsHtml = `
      <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
        ${scorersHtml}
        <div>${potmHtml}</div>
      </div>`;
  }

  // 5. Info Card
  const info = data.gameInfo || {};
 const ref = info.referee?.displayName ? ` · ️ Trọng tài: ${info.referee.displayName}` : '';
  const venue = [info.venue?.fullName, info.venue?.address?.city].filter(Boolean).join(' - ');
 const venueStr = venue ? `Sân: ${venue}` : '';

  el.innerHTML = `
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;padding:4px 0;">
      ${venueStr}${ref}
    </div>
    ${headerAddonsHtml}
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
 el.innerHTML = `<div class="fb-empty">Hiện chưa có dữ liệu bảng xếp hạng.</div>`;
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
 <button class="fb-tp-close" onclick="window._fbCloseTeam()"></button>
      <div class="fb-tp-hero">
        ${badge(teamBadgeUrl, 44)}
        <div>
          <div class="fb-tp-name">${teamName}</div>
 <div class="fb-tp-meta" id="fbTeamMeta">Đang tải thông tin CLB...</div>
        </div>
      </div>
    </div>
    <div class="fb-tp-desc" id="fbTeamDesc">Đang tải mô tả chi tiết...</div>
    <div class="fb-tp-section">
 <div class="fb-tp-section-title">Trận đấu gần đây & sắp tới</div>
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
 document.getElementById('fbTeamSchedule').innerHTML = `<div class="error-msg">️ Lỗi tải: ${err.message}</div>`;
  }
}

function renderTeamDetails(teamData, schedData, teamName) {
  const team = teamData.team || {};
  const metaEl = document.getElementById('fbTeamMeta');
  const descEl = document.getElementById('fbTeamDesc');
  const schedEl = document.getElementById('fbTeamSchedule');

  if (metaEl) {
 const location = team.venue?.fullName ? `️ ${team.venue.fullName}` : 'Sân vận động';
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

// ── League Stats Tab ───────────────────────────────────────────────
function renderStats(el, data) {
  const lg = LEAGUES[_league];
  const statsList = data.stats || [];

  if (!statsList.length) {
 el.innerHTML = `<div class="fb-empty">Hiện chưa có dữ liệu thống kê cá nhân.</div>`;
    return;
  }

  const goalsData = statsList.find(s => s.name === 'goalsLeaders') || statsList[0];
  const assistsData = statsList.find(s => s.name === 'assistsLeaders') || statsList[1];

  const renderLeaderRow = (ldr, index) => {
    const athlete = ldr.athlete || {};
    const team = athlete.team || {};
    const teamLogo = team.logos?.[0]?.href || '';
    
    // Find player image or default to jersey
    const athleteImg = athlete.jerseyImage?.[0]?.href || athlete.headshot || '';
    const imgHtml = athleteImg 
      ? `<img src="${athleteImg}" alt="" style="width:28px;height:28px;object-fit:contain;border-radius:50%;background:rgba(255,255,255,0.05);margin-right:8px;border:1px solid rgba(255,255,255,0.1)" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2228%22 height=%2228%22><rect width=%22100%%22 height=%22100%%22 fill=%22%232a2a2a%22/><text x=%2250%%22 y=%2260%%22 font-size=%2210%22 fill=%22%23666%22 font-family=%22sans-serif%22 font-weight=%22bold%22 text-anchor=%22middle%22>${athlete.jersey || '-'}</text></svg>'">`
      : `<div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--text-muted);margin-right:8px;">${athlete.jersey || '-'}</div>`;

    return `
      <div class="fb-leader-row">
        <div style="display:flex;align-items:center;">
          <span class="fb-leader-rank">${index + 1}</span>
          ${imgHtml}
          <div style="display:flex;flex-direction:column;">
            <span class="fb-leader-name"><strong>${athlete.displayName || 'Cầu thủ'}</strong></span>
            <span class="fb-leader-team" style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-muted);margin-top:2px;">
              ${badge(teamLogo, 12)} ${team.displayName || ''}
            </span>
          </div>
        </div>
        <span class="fb-leader-val">${ldr.value}</span>
      </div>`;
  };

  const renderCol = (title, icon, dataObj) => {
    const leaders = dataObj?.leaders || [];
    const listHtml = leaders.slice(0, 15).map((ldr, idx) => renderLeaderRow(ldr, idx)).join('');
    
    return `
      <div class="fb-leader-col">
        <h3 class="fb-leader-title">
          <span>${icon} ${title}</span>
        </h3>
        <div class="fb-leader-list">
          ${listHtml || '<div class="fb-empty">Chưa có dữ liệu</div>'}
        </div>
      </div>`;
  };

  el.innerHTML = `
    <div class="fb-stats-grid">
 ${renderCol('Vua phá lưới', '', goalsData)}
 ${renderCol('Vua kiến tạo', '️', assistsData)}
    </div>`;
}

/**
 * Fetch live football matches for the ticker tape.
 */
export async function fetchLiveScores() {
  const liveMatches = [];
  const allMatches = [];
  const leagueShortNames = {
    pl: 'Ngoại hạng Anh',
    laliga: 'La Liga',
    seriea: 'Serie A',
    ucl: 'UCL',
    wc: 'World Cup 2026'
  };

  try {
    const promises = Object.entries(LEAGUES).map(async ([key, l]) => {
      try {
        const res = await fetch(API({ league: l.id, type: 'scoreboard' }), { signal: AbortSignal.timeout(6000) });
        if (!res.ok) return;
        const data = await res.json();
        const events = data.events || [];
        for (const e of events) {
          const status = e.status?.type;
          const competition = e.competitions?.[0];
          const competitors = competition?.competitors || [];
          const home = competitors.find(c => c.homeAway === 'home') || {};
          const away = competitors.find(c => c.homeAway === 'away') || {};

          let homeShootout = home.shootoutScore;
          let awayShootout = away.shootoutScore;
          if ((homeShootout === undefined || homeShootout === null) && home.linescores && home.linescores.length > 2) {
            if (status?.name?.includes('PEN') || status?.name?.includes('SHOOTOUT') || status?.detail?.toLowerCase().includes('pen') || status?.detail?.toLowerCase().includes('shootout')) {
              homeShootout = home.linescores[home.linescores.length - 1]?.value ?? home.linescores[home.linescores.length - 1]?.displayValue;
              awayShootout = away.linescores[away.linescores.length - 1]?.value ?? away.linescores[away.linescores.length - 1]?.displayValue;
            }
          }

          allMatches.push({
            league: leagueShortNames[key] || key.toUpperCase(),
            home: home.team?.displayName || 'HOME',
            away: away.team?.displayName || 'AWAY',
            homeScore: home.score ?? 0,
            awayScore: away.score ?? 0,
            homeShootout: homeShootout !== undefined && homeShootout !== null ? homeShootout : null,
            awayShootout: awayShootout !== undefined && awayShootout !== null ? awayShootout : null,
            status: status?.state || 'pre', // 'pre' | 'in' | 'post'
            statusDetail: status?.detail || 'Chưa diễn ra',
            date: e.date ? new Date(e.date).toLocaleString('vi-VN', { timeZone: VN_TZ }) : ''
          });

          if (status?.state === 'in') { // live match
            liveMatches.push({
              league: leagueShortNames[key] || key.toUpperCase(),
              home: home.team?.abbreviation || home.team?.shortDisplayName || home.team?.displayName || 'HOME',
              away: away.team?.abbreviation || away.team?.shortDisplayName || away.team?.displayName || 'AWAY',
              homeScore: home.score ?? 0,
              awayScore: away.score ?? 0,
              homeShootout: homeShootout !== undefined && homeShootout !== null ? homeShootout : null,
              awayShootout: awayShootout !== undefined && awayShootout !== null ? awayShootout : null,
              time: status.detail || 'LIVE'
            });
          }
        }
      } catch (err) {
        console.warn(`[Football Live] failed to fetch league ${key}:`, err.message);
      }
    });
    await Promise.all(promises);

    // Sort matches: World Cup 2026 first, then others
    const leagueOrder = ['World Cup 2026', 'Ngoại hạng Anh', 'La Liga', 'Serie A', 'UCL'];
    allMatches.sort((a, b) => {
      const idxA = leagueOrder.indexOf(a.league);
      const idxB = leagueOrder.indexOf(b.league);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });
    liveMatches.sort((a, b) => {
      const idxA = leagueOrder.indexOf(a.league);
      const idxB = leagueOrder.indexOf(b.league);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });
  } catch (err) {
    console.warn('[Football Live] error:', err.message);
  }
  return { live: liveMatches, all: allMatches };
}
