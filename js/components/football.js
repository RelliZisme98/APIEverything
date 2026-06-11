/**
 * components/football.js — v2
 * World Cup 2026 + Premier League
 * • WC: All fixtures grouped by date, VN time, click-to-expand detail, team panel
 * • PL: Full standings (5 available on free tier) + form + GF/GA, team panel
 * Source: TheSportsDB via /football worker proxy
 */

// ── Constants ──────────────────────────────────────────────────────
const API = (params) => `/football?${new URLSearchParams(params)}`;
const VN_TZ = 'Asia/Ho_Chi_Minh';

const LEAGUES = {
  wc: { label: '🏆 World Cup 2026', shortLabel: 'WC 2026',  color: '#fbbf24', season: '2026' },
  pl: { label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League', shortLabel: 'PL 25/26', color: '#60a5fa', season: '2025-2026' },
};

const WC_GROUPS = {
  A:['Mexico','South Africa'],
  B:['South Korea','Czech Republic'],
  C:['Canada','Bosnia-Herzegovina'],
  D:['USA','Paraguay'],
  E:['Brazil','Morocco'],
  F:['Qatar','Switzerland'],
  G:['Haiti','Scotland'],
  H:['Germany','Curaçao'],
  I:['Ivory Coast','Ecuador'],
  J:['Netherlands','Japan'],
  K:['Australia','Turkey'],
  L:['Belgium','Egypt'],
  M:['Saudi Arabia','Uruguay'],
  N:['Spain','Cape Verde'],
  O:['Sweden','Tunisia'],
};

// Build team→group map
const TEAM_GROUP = {};
for (const [grp, teams] of Object.entries(WC_GROUPS)) {
  for (const t of teams) TEAM_GROUP[t] = grp;
}

// ── State ──────────────────────────────────────────────────────────
let _league   = 'wc';
let _tab      = 'fixtures'; // fixtures | results | table
let _cache    = {};
let _timer    = null;
let _expanded = null;      // expanded match idEvent
let _teamPanelId = null;   // open team panel

// ── Helpers ────────────────────────────────────────────────────────
function toVN(dateStr, timeStr) {
  try {
    const dt = new Date(`${dateStr}T${timeStr || '00:00:00'}Z`);
    return dt.toLocaleString('vi-VN', {
      weekday: 'short', day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit', timeZone: VN_TZ
    });
  } catch { return dateStr; }
}

function toVNTime(dateStr, timeStr) {
  try {
    const dt = new Date(`${dateStr}T${timeStr || '00:00:00'}Z`);
    return dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: VN_TZ });
  } catch { return timeStr || ''; }
}

function toVNDateKey(dateStr, timeStr) {
  try {
    const dt = new Date(`${dateStr}T${timeStr || '00:00:00'}Z`);
    return dt.toLocaleDateString('sv-SE', { timeZone: VN_TZ }); // YYYY-MM-DD in VN
  } catch { return dateStr; }
}

function isToday(dateKey) {
  return dateKey === new Date().toLocaleDateString('sv-SE', { timeZone: VN_TZ });
}

function fmtDateHeader(dateKey) {
  const d = new Date(dateKey + 'T00:00:00+07:00');
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isLive(status) {
  return status && ['1H','2H','HT','ET','P','LIVE','In Progress'].some(s => status.toUpperCase().includes(s.toUpperCase()));
}

function badge(url, size = 22) {
  return url ? `<img src="${url}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;flex-shrink:0;" loading="lazy" onerror="this.style.display='none'">` : '';
}

function formPill(char) {
  const clr = char === 'W' ? '#4ade80' : char === 'L' ? '#f87171' : '#94a3b8';
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;font-size:9px;font-weight:800;background:${clr}22;color:${clr};border:1px solid ${clr}44;">${char}</span>`;
}

// ── Main entry ─────────────────────────────────────────────────────
export function renderFootball(containerId = 'footballContent') {
  const el = document.getElementById(containerId);
  if (!el) return;
  _expanded = null;
  _teamPanelId = null;
  buildShell(el);
  loadLeagueData();

  if (_timer) clearInterval(_timer);
  _timer = setInterval(() => {
    if (document.getElementById('section-football')?.classList.contains('active')) {
      loadLeagueData(true);
    }
  }, 60_000);
}

// ── Shell UI ───────────────────────────────────────────────────────
function buildShell(el) {
  const lg = LEAGUES[_league];
  const leagueTabs = Object.entries(LEAGUES).map(([key, l]) =>
    `<button class="fb-league-tab ${key === _league ? 'active' : ''}"
             onclick="window._fbLeague('${key}')"
             style="${key === _league ? `border-color:${l.color}50;background:${l.color}12;color:${l.color};` : ''}">
       ${l.label}
     </button>`
  ).join('');

  const tabs = [
    { key: 'fixtures', label: '📅 Lịch thi đấu' },
    { key: 'results',  label: '✅ Kết quả' },
    { key: 'table',    label: '📊 Bảng XH' },
  ].map(t =>
    `<button class="fb-tab ${t.key === _tab ? 'active' : ''}"
             onclick="window._fbTab('${t.key}')"
             style="${t.key === _tab ? `border-color:${lg.color}40;color:${lg.color};background:${lg.color}0d;` : ''}">${t.label}</button>`
  ).join('');

  el.innerHTML = `
    <div class="fb-league-tabs">${leagueTabs}</div>
    <div class="fb-tabs">${tabs}</div>
    <div id="fbMain" class="fb-main"></div>
    <!-- Team side panel -->
    <div class="fb-team-panel" id="fbTeamPanel">
      <div class="fb-team-panel-inner" id="fbTeamPanelInner"></div>
    </div>
    <div class="fb-team-overlay" id="fbTeamOverlay" onclick="window._fbCloseTeam()"></div>
    <div class="fb-footer">
      <span style="color:var(--text-muted);font-size:11px;">Nguồn: TheSportsDB · WC 2026 đang diễn ra</span>
      <span class="fb-live-badge"><span class="dot-green"></span> Tự động cập nhật mỗi 60s</span>
    </div>`;

  window._fbLeague = (key) => { _league = key; _tab = 'fixtures'; _expanded = null; buildShell(el); loadLeagueData(); };
  window._fbTab    = (key) => { _tab = key; buildShell(el); loadLeagueData(); };
  window._fbExpand = (id) => { _expanded = _expanded === id ? null : id; renderMain(); };
  window._fbTeam   = openTeamPanel;
  window._fbCloseTeam = closeTeamPanel;
}

// ── Data loading ───────────────────────────────────────────────────
async function loadLeagueData(silent = false) {
  let type;
  if (_tab === 'fixtures') type = _league === 'wc' ? 'season' : 'next';
  else if (_tab === 'results') type = 'past';
  else type = 'table';

  const key = `${_league}_${type}`;
  const main = document.getElementById('fbMain');
  if (!main) return;

  if (!silent) main.innerHTML = `<div class="fb-loading">⚽ Đang tải dữ liệu...</div>`;

  try {
    const res  = await fetch(API({ league: _league, type }));
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    _cache[key] = data;
    renderMain();
  } catch (err) {
    if (!silent) main.innerHTML = `<div class="error-msg">⚠️ ${err.message}</div>`;
  }
}

function renderMain() {
  const main = document.getElementById('fbMain');
  if (!main) return;
  let type;
  if (_tab === 'fixtures') type = _league === 'wc' ? 'season' : 'next';
  else if (_tab === 'results') type = 'past';
  else type = 'table';

  const data = _cache[`${_league}_${type}`];
  if (!data) { main.innerHTML = `<div class="fb-loading">⚽ Đang tải...</div>`; return; }

  if (_tab === 'table') renderTable(main, data);
  else renderFixtureList(main, data);
}

// ── Fixtures / Results ─────────────────────────────────────────────
function renderFixtureList(el, data) {
  let events = (data.events || []).filter(Boolean);
  const isPast = _tab === 'results';

  // Sort
  events.sort((a, b) => {
    const da = new Date(`${a.dateEvent}T${a.strTime || '00:00:00'}Z`);
    const db = new Date(`${b.dateEvent}T${b.strTime || '00:00:00'}Z`);
    return isPast ? db - da : da - db;
  });

  if (!events.length) {
    el.innerHTML = `<div class="fb-empty">${isPast ? '✅ Chưa có kết quả nào' : '📅 Không có lịch thi đấu'}</div>`;
    return;
  }

  // Group by VN date
  const byDate = new Map();
  for (const e of events) {
    const dk = toVNDateKey(e.dateEvent, e.strTime);
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
          <span>${today ? '🔴 HÔM NAY' : fmtDateHeader(dateKey)}</span>
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
  const isExpanded = _expanded === e.idEvent;
  const live = isLive(e.strStatus);
  const ns   = e.strStatus === 'NS';
  const scored = (e.intHomeScore != null && e.intAwayScore != null);
  const score = scored ? `${e.intHomeScore} – ${e.intAwayScore}` : 'vs';
  const vnTime = toVNTime(e.dateEvent, e.strTime);
  const group = e.strGroup || TEAM_GROUP[e.strHomeTeam] || '';

  const homeWin = scored && parseInt(e.intHomeScore) > parseInt(e.intAwayScore);
  const awayWin = scored && parseInt(e.intAwayScore) > parseInt(e.intHomeScore);

  const detail = isExpanded ? renderMatchDetail(e, lg) : '';

  return `
    <div class="fb-match ${live ? 'fb-match--live' : ''} ${isExpanded ? 'fb-match--expanded' : ''}"
         id="fbMatch_${e.idEvent}">
      <div class="fb-match-row" onclick="window._fbExpand('${e.idEvent}')">
        <!-- Left: Home team -->
        <div class="fb-team-col fb-team-col--home">
          <button class="fb-team-btn" onclick="event.stopPropagation();window._fbTeam('${e.idHomeTeam}','${e.strHomeTeam}','${e.strHomeTeamBadge || ''}')">
            ${badge(e.strHomeTeamBadge, 24)}
            <span class="fb-match-team-name ${homeWin ? 'fb-winner' : ''}">${e.strHomeTeam}</span>
          </button>
        </div>

        <!-- Center: Score / Time -->
        <div class="fb-score-col">
          ${group ? `<div class="fb-group-label">Bảng ${group}</div>` : ''}
          ${live
            ? `<div class="fb-score-box fb-score-live">${score}</div><div class="fb-live-pill">● LIVE</div>`
            : ns
              ? `<div class="fb-time-box">${vnTime}</div>`
              : `<div class="fb-score-box">${score}</div>`}
          ${e.strResult ? `<div class="fb-result-note">${e.strResult}</div>` : ''}
        </div>

        <!-- Right: Away team -->
        <div class="fb-team-col fb-team-col--away">
          <button class="fb-team-btn fb-team-btn--away" onclick="event.stopPropagation();window._fbTeam('${e.idAwayTeam}','${e.strAwayTeam}','${e.strAwayTeamBadge || ''}')">
            <span class="fb-match-team-name ${awayWin ? 'fb-winner' : ''}">${e.strAwayTeam}</span>
            ${badge(e.strAwayTeamBadge, 24)}
          </button>
        </div>

        <!-- Expand arrow -->
        <div class="fb-expand-icon">${isExpanded ? '▲' : '▼'}</div>
      </div>
      ${detail}
    </div>`;
}

function renderMatchDetail(e, lg) {
  const vnTime = toVN(e.dateEvent, e.strTime);
  const venue  = [e.strVenue, e.strCity].filter(Boolean).join(' — ');

  return `
    <div class="fb-match-detail">
      <div class="fb-detail-grid">
        ${e.strThumb ? `<img src="${e.strThumb}" class="fb-detail-thumb" loading="lazy" onerror="this.remove()">` : ''}
        <div class="fb-detail-info">
          ${e.strGroup ? `<div class="fb-detail-row"><span class="fb-detail-label">Bảng</span><span style="color:${lg.color};font-weight:700;">${e.strGroup}</span></div>` : ''}
          <div class="fb-detail-row"><span class="fb-detail-label">⏰ Giờ VN</span><span style="color:${lg.color};font-weight:600;">${vnTime}</span></div>
          ${venue ? `<div class="fb-detail-row"><span class="fb-detail-label">📍 Sân</span><span>${venue}</span></div>` : ''}
          ${e.intRound ? `<div class="fb-detail-row"><span class="fb-detail-label">🔢 Lượt</span><span>Round ${e.intRound}</span></div>` : ''}
          ${e.strStatus && e.strStatus !== 'NS' ? `<div class="fb-detail-row"><span class="fb-detail-label">📊 TT</span><span>${e.strStatus}</span></div>` : ''}
        </div>
      </div>
      <div class="fb-detail-actions">
        <button class="fb-detail-btn" onclick="window._fbTeam('${e.idHomeTeam}','${e.strHomeTeam}','${e.strHomeTeamBadge||''}')">
          ${badge(e.strHomeTeamBadge, 16)} Thông tin ${e.strHomeTeam}
        </button>
        <button class="fb-detail-btn" onclick="window._fbTeam('${e.idAwayTeam}','${e.strAwayTeam}','${e.strAwayTeamBadge||''}')">
          ${badge(e.strAwayTeamBadge, 16)} Thông tin ${e.strAwayTeam}
        </button>
      </div>
    </div>`;
}

// ── Standings table ────────────────────────────────────────────────
function renderTable(el, data) {
  const rows = data.table || [];
  const lg   = LEAGUES[_league];

  if (!rows.length) {
    el.innerHTML = `<div class="fb-empty">📊 Chưa có bảng xếp hạng</div>`;
    return;
  }

  const header = _league === 'pl' ? `
    <div class="fb-table-note">
      ℹ️ TheSportsDB cung cấp top 5 trên gói miễn phí · Season 2025-2026
      &nbsp;|&nbsp; <span style="color:${lg.color};">Arsenal dẫn đầu 85pts</span>
    </div>` : '';

  const thead = `
    <tr>
      <th class="fb-th-rank">#</th>
      <th class="fb-th-team">Đội bóng</th>
      <th class="fb-th-stat" title="Số trận">Tr</th>
      <th class="fb-th-stat" title="Thắng">T</th>
      <th class="fb-th-stat" title="Hòa">H</th>
      <th class="fb-th-stat" title="Thua">B</th>
      <th class="fb-th-stat" title="Bàn thắng">BT</th>
      <th class="fb-th-stat" title="Bàn thua">Bthua</th>
      <th class="fb-th-stat" title="Hiệu số">HS</th>
      ${data.table?.[0]?.strForm ? '<th class="fb-th-form">5 trận</th>' : ''}
      <th class="fb-th-pts">Điểm</th>
    </tr>`;

  const tbody = rows.map(r => {
    const rank = parseInt(r.intRank);
    const gd   = parseInt(r.intGoalDifference || 0);
    const gdStr = gd > 0 ? `+${gd}` : String(gd);
    const gdClr = gd > 0 ? '#4ade80' : gd < 0 ? '#f87171' : '#94a3b8';

    let rankClr = '';
    if (_league === 'pl') {
      if (rank <= 4)  rankClr = '#60a5fa';
      if (rank === 5) rankClr = '#fb923c';
      if (rank >= 18) rankClr = '#f87171';
    }

    const formHtml = r.strForm
      ? (r.strForm || '').split('').slice(-5).map(formPill).join('')
      : '';

    const teamBadge = r.strBadge
      ? `<img src="${r.strBadge}" alt="" style="width:20px;height:20px;object-fit:contain;flex-shrink:0;" loading="lazy" onerror="this.remove()">`
      : '';

    return `
      <tr class="fb-table-row" style="${rankClr ? `border-left:3px solid ${rankClr};` : ''}">
        <td class="fb-td-rank" style="color:${rankClr || 'var(--text-secondary)'};">${rank}</td>
        <td class="fb-td-team">
          <button class="fb-team-btn" onclick="window._fbTeam('${r.idTeam}','${r.strTeam}','${r.strBadge || ''}')">
            ${teamBadge}
            <span class="fb-team-name-td">${r.strTeam}</span>
          </button>
        </td>
        <td class="fb-td-stat">${r.intPlayed ?? '—'}</td>
        <td class="fb-td-stat">${r.intWin ?? '—'}</td>
        <td class="fb-td-stat">${r.intDraw ?? '—'}</td>
        <td class="fb-td-stat">${r.intLoss ?? '—'}</td>
        <td class="fb-td-stat">${r.intGoalsFor ?? '—'}</td>
        <td class="fb-td-stat">${r.intGoalsAgainst ?? '—'}</td>
        <td class="fb-td-stat" style="color:${gdClr};font-weight:600;">${gdStr}</td>
        ${r.strForm ? `<td class="fb-td-form">${formHtml}</td>` : ''}
        <td class="fb-td-pts" style="color:${lg.color};">${r.intPoints ?? '—'}</td>
      </tr>`;
  }).join('');

  let legend = '';
  if (_league === 'pl') {
    legend = `<div class="fb-legend">
      <span style="color:#60a5fa;font-weight:700;">─</span> Champions League &nbsp;
      <span style="color:#fb923c;font-weight:700;">─</span> Europa League &nbsp;
      <span style="color:#f87171;font-weight:700;">─</span> Xuống hạng
    </div>`;
  }

  el.innerHTML = `
    ${header}
    ${legend}
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
      <table class="fb-table">
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>`;
}

// ── Team panel ─────────────────────────────────────────────────────
async function openTeamPanel(teamId, teamName, teamBadgeUrl) {
  _teamPanelId = teamId;
  const panel   = document.getElementById('fbTeamPanel');
  const inner   = document.getElementById('fbTeamPanelInner');
  const overlay = document.getElementById('fbTeamOverlay');
  if (!panel || !inner) return;

  // Show panel immediately with loading
  panel.classList.add('open');
  if (overlay) overlay.classList.add('visible');
  inner.innerHTML = `
    <div class="fb-tp-header">
      <button class="fb-tp-close" onclick="window._fbCloseTeam()">✕</button>
      <div class="fb-tp-title">
        ${badge(teamBadgeUrl, 32)}
        <span>${teamName}</span>
      </div>
    </div>
    <div class="fb-loading" style="padding:30px;">⏳ Đang tải thông tin...</div>`;

  // Fetch team info + last + next in parallel
  try {
    const [teamRes, lastRes, nextRes] = await Promise.all([
      fetch(API({ type: 'team', id: teamId })),
      fetch(API({ type: 'team-last', id: teamId })),
      fetch(API({ type: 'team-next', id: teamId })),
    ]);
    const [teamData, lastData, nextData] = await Promise.all([
      teamRes.json(), lastRes.json(), nextRes.json()
    ]);

    if (_teamPanelId !== teamId) return; // stale if user opened another team
    renderTeamPanel(inner, teamData, lastData, nextData, teamBadgeUrl);
  } catch (err) {
    inner.innerHTML += `<div class="error-msg" style="margin:16px;">⚠️ ${err.message}</div>`;
  }
}

function closeTeamPanel() {
  _teamPanelId = null;
  const panel   = document.getElementById('fbTeamPanel');
  const overlay = document.getElementById('fbTeamOverlay');
  if (panel)   panel.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
}

function renderTeamPanel(el, teamData, lastData, nextData, fallbackBadge) {
  const team  = (teamData.teams || [])[0] || {};
  const last  = (lastData.events  || []).slice(0, 5);
  const next  = (nextData.events  || []).slice(0, 5);
  const badgeUrl = team.strBadge || fallbackBadge;
  const group = TEAM_GROUP[team.strTeam] || '';

  const matchRow = (e) => {
    const home = e.strHomeTeam === team.strTeam;
    const scored = e.intHomeScore != null;
    const myScore = home ? e.intHomeScore : e.intAwayScore;
    const opScore = home ? e.intAwayScore : e.intHomeScore;
    const opponent = home ? e.strAwayTeam : e.strHomeTeam;
    const oppBadge = home ? e.strAwayTeamBadge : e.strHomeTeamBadge;
    const win = scored && parseInt(myScore) > parseInt(opScore);
    const lose= scored && parseInt(myScore) < parseInt(opScore);
    const resCls = win ? 'fb-tp-w' : lose ? 'fb-tp-l' : 'fb-tp-d';
    const resChar = win ? 'T' : lose ? 'B' : scored ? 'H' : '—';
    const vnTime = toVNTime(e.dateEvent, e.strTime);

    return `
      <div class="fb-tp-match">
        <span class="fb-tp-res ${resCls}">${resChar}</span>
        <div class="fb-tp-match-info">
          <div class="fb-tp-opp">
            ${badge(oppBadge, 16)}
            <span>${home ? 'vs' : '@'} ${opponent}</span>
          </div>
          <div class="fb-tp-meta">${e.strLeague} · ${e.dateEvent} ${vnTime || ''}</div>
        </div>
        ${scored ? `<span class="fb-tp-score">${myScore}–${opScore}</span>` : `<span class="fb-tp-time">${vnTime}</span>`}
      </div>`;
  };

  const desc = (team.strDescriptionEN || '').slice(0, 200);

  el.innerHTML = `
    <div class="fb-tp-header">
      <button class="fb-tp-close" onclick="window._fbCloseTeam()">✕</button>
      <div class="fb-tp-hero">
        ${badge(badgeUrl, 52)}
        <div>
          <div class="fb-tp-name">${team.strTeam || ''}</div>
          <div class="fb-tp-meta" style="margin-top:4px;">
            ${team.strCountry ? `🌍 ${team.strCountry}` : ''}
            ${team.strStadium ? ` · 🏟️ ${team.strStadium}` : ''}
            ${group ? ` · Bảng ${group}` : ''}
          </div>
        </div>
      </div>
    </div>

    ${desc ? `<div class="fb-tp-desc">${desc}...</div>` : ''}

    ${next.length ? `
      <div class="fb-tp-section">
        <div class="fb-tp-section-title">📅 Sắp thi đấu</div>
        ${next.map(matchRow).join('')}
      </div>` : ''}

    ${last.length ? `
      <div class="fb-tp-section">
        <div class="fb-tp-section-title">✅ Kết quả gần đây</div>
        ${last.map(matchRow).join('')}
      </div>` : ''}

    ${!next.length && !last.length ? `<div class="fb-empty" style="padding:24px;">Không có dữ liệu trận đấu</div>` : ''}`;
}
