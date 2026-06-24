/**
 * components/focus.js
 * Focus Mode: Pomodoro Timer + Ambient Sound Engine
 *
 * Features:
 * - Animated SVG ring countdown timer
 * - Work / Short Break / Long Break modes
 * - Customizable durations
 * - 4-session Pomodoro cycle tracking
 * - Ambient sounds: Lofi, Rain, Forest, Cafe, Ocean, White Noise
 * - Volume control, play/stop toggle
 * - Browser Notifications when session ends
 */

// ── Durations (in seconds) ──────────────────────────────
const DEFAULT_DURATIONS = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };

// ── Ambient sound sources (free, royalty-free streams) ──
const SOUNDS = [
  {
    id: 'lofi',
    name: 'Lofi Hip-Hop',
    emoji: '🎵',
    // lofi radio stream via YouTube embed audio proxy (fallback: generated tone)
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
  },
  {
    id: 'rain',
    name: 'Tiếng Mưa',
    emoji: '🌧️',
    url: 'https://www.soundjay.com/nature/sounds/rain-01.mp3',
  },
  {
    id: 'forest',
    name: 'Rừng Nhiệt Đới',
    emoji: '🌿',
    url: 'https://www.soundjay.com/nature/sounds/forest-1.mp3',
  },
  {
    id: 'cafe',
    name: 'Quán Cafe',
    emoji: '☕',
    url: 'https://stream.zeno.fm/yn65f92gzk8uv',
  },
  {
    id: 'ocean',
    name: 'Sóng Biển',
    emoji: '🌊',
    url: 'https://www.soundjay.com/nature/sounds/ocean-wave-1.mp3',
  },
  {
    id: 'white',
    name: 'White Noise',
    emoji: '📻',
    url: 'https://stream.zeno.fm/v06a2qmgzk8uv',
  },
];

// ── Lofi Playlist (Royalty-free) ───────────────────────
const LOFI_TRACKS = [
  { title: "Back Alley Daydream - Dave Crum", url: "https://archive.org/download/jamendo-605372/01-2258203-Dave%20Crum-Back%20Alley%20Daydream.mp3" },
  { title: "Clouds on Repeat - Dave Crum", url: "https://archive.org/download/jamendo-605372/02-2258205-Dave%20Crum-Clouds%20on%20Repeat.mp3" },
  { title: "Rain on the Skylight - Dave Crum", url: "https://archive.org/download/jamendo-605372/03-2258241-Dave%20Crum-Rain%20on%20the%20Skylight.mp3" },
  { title: "Raindrops on Pine Needles - Dave Crum", url: "https://archive.org/download/jamendo-605372/04-2258243-Dave%20Crum-Raindrops%20on%20Pine%20Needles.mp3" },
  { title: "Roots and Reflections - Dave Crum", url: "https://archive.org/download/jamendo-605372/05-2258244-Dave%20Crum-Roots%20and%20Reflections.mp3" },
  { title: "Whispers Between Trees - Dave Crum", url: "https://archive.org/download/jamendo-605372/06-2258248-Dave%20Crum-Whispers%20Between%20Trees.mp3" },
  { title: "Wind-Up Dreamscape - Dave Crum", url: "https://archive.org/download/jamendo-605372/07-2258249-Dave%20Crum-Wind-Up%20Dreamscape.mp3" },
  { title: "Waves on Cassette - Dave Crum", url: "https://archive.org/download/jamendo-605372/08-2258247-Dave%20Crum-Waves%20on%20Cassette.mp3" },
  { title: "Umbrellas and Echoes - Dave Crum", url: "https://archive.org/download/jamendo-605372/09-2258246-Dave%20Crum-Umbrellas%20and%20Echoes.mp3" },
  { title: "The Wind Knows My Name - Dave Crum", url: "https://archive.org/download/jamendo-605372/10-2258245-Dave%20Crum-The%20Wind%20Knows%20My%20Name.mp3" }
];

const TIPS = [
  '💡 Tập trung vào một nhiệm vụ duy nhất trong mỗi Pomodoro.',
  '🧠 Sau 4 Pomodoro, hãy nghỉ dài 15-30 phút để não phục hồi tốt nhất.',
  '📵 Tắt thông báo điện thoại để không bị gián đoạn trong giờ tập trung.',
  '💧 Uống nước trong giờ nghỉ ngắn để duy trì năng lượng nhận thức.',
  '✍️ Viết ra nhiệm vụ cụ thể trước khi bắt đầu Pomodoro để tránh lan man.',
  '🎯 Một Pomodoro tốt = một nhiệm vụ hoàn thành, không phải nhiều việc làm dở.',
  '🌿 Nhìn ra cửa sổ hoặc nhắm mắt 20 giây trong giờ nghỉ để giảm mỏi mắt.',
  '🚫 Nếu bị xao nhãng, ghi nhanh ý tưởng vào notepad rồi quay lại ngay.',
];

// ── State ───────────────────────────────────────────────
let pomodoroInterval = null;
let timeLeft = DEFAULT_DURATIONS.work;
let totalTime = DEFAULT_DURATIONS.work;
let isRunning = false;
let currentMode = 'work';
let sessionCount = 0;
let completedSessions = 0;

let ambientAudio = null;
let currentSoundId = null;
let ambientVolume = 0.4;

// Web Audio & Playlist state
let webAudioCtx = null;
let masterGain = null;
let webAudioNodes = [];
let lofiAudio = null;
let lofiTrackIndex = 0;

// ══════════════════════════════════════════════════════
// MAIN RENDER
// ══════════════════════════════════════════════════════
export function renderFocus() {
  const el = document.getElementById('focusContent');
  if (!el) return;

  // Inject CSS
  if (!document.getElementById('focus-css')) {
    const link = document.createElement('link');
    link.id = 'focus-css';
    link.rel = 'stylesheet';
    link.href = 'css/focus.css';
    document.head.appendChild(link);
  }

  const circumference = 2 * Math.PI * 96; // radius=96

  el.innerHTML = `
    <!-- Notification overlay -->
    <div class="focus-notify" id="focusNotify">
      <span class="focus-notify-icon" id="focusNotifyIcon">🎉</span>
      <span id="focusNotifyText">Phiên làm việc hoàn thành!</span>
    </div>

    <div class="focus-layout">

      <!-- ══ POMODORO CARD ══ -->
      <div class="pomodoro-card">

        <!-- Mode tabs -->
        <div class="pomodoro-modes">
          <button class="pomodoro-mode-btn active" id="pomo-mode-work"    onclick="focusSwitchMode('work')">🎯 Làm Việc</button>
          <button class="pomodoro-mode-btn"        id="pomo-mode-short"   onclick="focusSwitchMode('short')">☕ Nghỉ Ngắn</button>
          <button class="pomodoro-mode-btn"        id="pomo-mode-long"    onclick="focusSwitchMode('long')">🌙 Nghỉ Dài</button>
        </div>

        <!-- SVG Ring Timer -->
        <div class="pomodoro-ring-container">
          <svg class="pomodoro-svg" viewBox="0 0 220 220">
            <defs>
              <linearGradient id="pomodoroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#818cf8"/>
                <stop offset="100%" style="stop-color:#6366f1"/>
              </linearGradient>
            </defs>
            <!-- Glow behind ring -->
            <circle class="pomodoro-ring-glow" id="pomoGlow"
              cx="110" cy="110" r="96"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${circumference * (1 - timeLeft / totalTime)}"
            />
            <!-- Track -->
            <circle class="pomodoro-ring-bg" cx="110" cy="110" r="96"/>
            <!-- Progress -->
            <circle class="pomodoro-ring-progress" id="pomoProgress"
              cx="110" cy="110" r="96"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${circumference * (1 - timeLeft / totalTime)}"
            />
          </svg>

          <div class="pomodoro-center">
            <div class="pomodoro-time" id="pomoTime">${formatTime(timeLeft)}</div>
            <div class="pomodoro-label" id="pomoLabel">LÀM VIỆC</div>
            <div class="pomodoro-session-count" id="pomoSessionInfo">Phiên ${completedSessions + 1}/4</div>
          </div>
        </div>

        <!-- Controls -->
        <div class="pomodoro-controls">
          <button class="pomodoro-btn pomodoro-btn-secondary" id="pomoResetBtn"
            onclick="focusReset()" title="Đặt lại">🔄</button>
          <button class="pomodoro-btn pomodoro-btn-main" id="pomoPlayBtn"
            onclick="focusToggle()" title="Bắt đầu / Dừng">▶</button>
          <button class="pomodoro-btn pomodoro-btn-secondary" id="pomoSkipBtn"
            onclick="focusSkip()" title="Bỏ qua phiên này">⏭</button>
        </div>

        <!-- Session dots -->
        <div class="pomodoro-dots" id="pomoDots">
          ${[0,1,2,3].map(i => `<div class="pomodoro-dot ${i < completedSessions ? 'filled' : ''}" data-dot="${i}"></div>`).join('')}
        </div>

        <!-- Custom durations -->
        <div class="pomodoro-custom">
          <div class="pomodoro-custom-group">
            <label>Làm việc (phút)</label>
            <input type="number" id="customWork" min="1" max="120" value="25"
              onchange="focusUpdateDuration('work', this.value)">
          </div>
          <div class="pomodoro-custom-group">
            <label>Nghỉ ngắn (phút)</label>
            <input type="number" id="customShort" min="1" max="30" value="5"
              onchange="focusUpdateDuration('short', this.value)">
          </div>
          <div class="pomodoro-custom-group">
            <label>Nghỉ dài (phút)</label>
            <input type="number" id="customLong" min="1" max="60" value="15"
              onchange="focusUpdateDuration('long', this.value)">
          </div>
        </div>
      </div>

      <!-- ══ AMBIENT SOUND CARD ══ -->
      <div class="ambient-card">
        <div class="ambient-title">🎧 Âm Thanh Xung Quanh</div>

        <div class="ambient-sounds">
          ${SOUNDS.map(s => `
            <button class="ambient-sound-btn" id="ambient-${s.id}" onclick="focusToggleSound('${s.id}')" title="${s.name}">
              <div class="ambient-sound-emoji">${s.emoji}</div>
              <div class="ambient-sound-name">${s.name}</div>
              <div class="ambient-sound-status">● ĐANG PHÁT</div>
            </button>
          `).join('')}
        </div>

        <!-- Lofi Music Player (Only visible when Lofi is playing) -->
        <div id="lofiPlayer" class="lofi-player" style="display: none; align-items: center; justify-content: space-between; margin-top: 15px; padding: 12px 16px; background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 12px; font-size: 13px;">
          <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 80%;">
            <span style="font-size: 16px; display: inline-block; animation: pomoSpin 4s linear infinite;">🎵</span>
            <span id="lofiTrackTitle" style="font-weight: 600; color: #a5b4fc; overflow: hidden; text-overflow: ellipsis;">Đang tải nhạc...</span>
          </div>
          <button onclick="focusLofiNext()" style="background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 18px; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s; outline: none;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.7)'" title="Bài tiếp theo">⏭️</button>
        </div>

        <!-- Volume -->
        <div class="ambient-volume">
          <span class="ambient-volume-icon">🔈</span>
          <input type="range" id="ambientVolume" min="0" max="100" value="40"
            oninput="focusSetVolume(this.value)" title="Âm lượng">
          <span class="ambient-volume-icon">🔊</span>
        </div>

        <!-- Daily tip -->
        <div class="focus-tip" id="focusTip">
          ${TIPS[Math.floor(Math.random() * TIPS.length)]}
        </div>
      </div>

    </div>
  `;

  updateRingDisplay();

  // Request notification permission silently
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ══════════════════════════════════════════════════════
// POMODORO LOGIC
// ══════════════════════════════════════════════════════
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateRingDisplay() {
  const timeEl     = document.getElementById('pomoTime');
  const progressEl = document.getElementById('pomoProgress');
  const glowEl     = document.getElementById('pomoGlow');
  if (!timeEl) return;

  const circumference = 2 * Math.PI * 96;
  const ratio = totalTime > 0 ? timeLeft / totalTime : 0;
  const offset = circumference * (1 - ratio);

  timeEl.textContent = formatTime(timeLeft);
  if (progressEl) progressEl.style.strokeDashoffset = offset;
  if (glowEl)     glowEl.style.strokeDashoffset = offset;

  // Update page title when running
  if (isRunning) {
    document.title = `⏱ ${formatTime(timeLeft)} — Tập Trung | Rellia Đại`;
  } else {
    document.title = 'Rellia Đại Dashboard';
  }
}

function updateDotsDisplay() {
  document.querySelectorAll('[data-dot]').forEach(dot => {
    const i = parseInt(dot.dataset.dot);
    dot.classList.toggle('filled', i < completedSessions);
  });
  const info = document.getElementById('pomoSessionInfo');
  if (info) info.textContent = `Phiên ${completedSessions + 1}/4`;
}

window.focusSwitchMode = function(mode) {
  if (isRunning) focusReset();
  currentMode = mode;

  const durations = {
    work:  parseInt(document.getElementById('customWork')?.value  || 25) * 60,
    short: parseInt(document.getElementById('customShort')?.value || 5)  * 60,
    long:  parseInt(document.getElementById('customLong')?.value  || 15) * 60,
  };
  timeLeft = durations[mode];
  totalTime = timeLeft;

  const labels = { work: 'LÀM VIỆC', short: 'NGHỈ NGẮN', long: 'NGHỈ DÀI' };
  const labelEl = document.getElementById('pomoLabel');
  if (labelEl) labelEl.textContent = labels[mode];

  document.querySelectorAll('.pomodoro-mode-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(`pomo-mode-${mode}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Rotate tip text
  const tipEl = document.getElementById('focusTip');
  if (tipEl) tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];

  updateRingDisplay();
};

window.focusToggle = function() {
  if (isRunning) {
    clearInterval(pomodoroInterval);
    isRunning = false;
    const btn = document.getElementById('pomoPlayBtn');
    if (btn) { btn.textContent = '▶'; btn.classList.remove('running'); }
  } else {
    isRunning = true;
    const btn = document.getElementById('pomoPlayBtn');
    if (btn) { btn.textContent = '⏸'; btn.classList.add('running'); }

    pomodoroInterval = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(pomodoroInterval);
        isRunning = false;
        onSessionEnd();
        return;
      }
      timeLeft--;
      updateRingDisplay();
    }, 1000);
  }
};

window.focusReset = function() {
  clearInterval(pomodoroInterval);
  isRunning = false;

  const durations = {
    work:  parseInt(document.getElementById('customWork')?.value  || 25) * 60,
    short: parseInt(document.getElementById('customShort')?.value || 5)  * 60,
    long:  parseInt(document.getElementById('customLong')?.value  || 15) * 60,
  };
  timeLeft = durations[currentMode];
  totalTime = timeLeft;

  const btn = document.getElementById('pomoPlayBtn');
  if (btn) { btn.textContent = '▶'; btn.classList.remove('running'); }
  document.title = 'Rellia Đại Dashboard';
  updateRingDisplay();
};

window.focusSkip = function() {
  clearInterval(pomodoroInterval);
  isRunning = false;
  onSessionEnd();
};

window.focusUpdateDuration = function(mode, val) {
  if (mode === currentMode && !isRunning) {
    timeLeft = parseInt(val) * 60;
    totalTime = timeLeft;
    updateRingDisplay();
  }
};

function onSessionEnd() {
  const btn = document.getElementById('pomoPlayBtn');
  if (btn) { btn.textContent = '▶'; btn.classList.remove('running'); }
  document.title = 'Rellia Đại Dashboard';

  let nextMode, notifyIcon, notifyText;
  if (currentMode === 'work') {
    completedSessions = (completedSessions + 1) % 4;
    updateDotsDisplay();
    if (completedSessions === 0) {
      nextMode = 'long';
      notifyIcon = '🌙';
      notifyText = '🎉 Hoàn thành 4 Pomodoro! Đã đến giờ nghỉ dài 15 phút.';
    } else {
      nextMode = 'short';
      notifyIcon = '☕';
      notifyText = `✅ Phiên làm việc hoàn thành! Hãy nghỉ ngắn 5 phút.`;
    }
  } else {
    nextMode = 'work';
    notifyIcon = '🎯';
    notifyText = '⏰ Hết giờ nghỉ! Sẵn sàng cho phiên tập trung tiếp theo?';
  }

  showNotification(notifyIcon, notifyText);
  playBeep();
  setTimeout(() => window.focusSwitchMode(nextMode), 1500);
}

function showNotification(icon, text) {
  const el = document.getElementById('focusNotify');
  const iconEl = document.getElementById('focusNotifyIcon');
  const textEl = document.getElementById('focusNotifyText');
  if (!el) return;
  if (iconEl) iconEl.textContent = icon;
  if (textEl) textEl.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);

  // Native browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Rellia Đại – Pomodoro', {
      body: text.replace(/[🎉✅⏰🎯☕🌙]/g, '').trim(),
      icon: '/favicon.ico',
    });
  }
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 200, 400].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay / 1000);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.3);
      osc.start(ctx.currentTime + delay / 1000);
      osc.stop(ctx.currentTime + delay / 1000 + 0.35);
    });
  } catch(e) { /* AudioContext not available */ }
}

// ══════════════════════════════════════════════════════
// AMBIENT SOUND ENGINE
// ══════════════════════════════════════════════════════
// AMBIENT SOUND ENGINE
// ══════════════════════════════════════════════════════

function getAudioCtx() {
  if (!webAudioCtx || webAudioCtx.state === 'closed') {
    webAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = webAudioCtx.createGain();
    masterGain.gain.value = ambientVolume;
    masterGain.connect(webAudioCtx.destination);
  }
  if (webAudioCtx.state === 'suspended') webAudioCtx.resume();
  return webAudioCtx;
}

// ── Create a noise buffer (reusable) ──
function makeNoiseBuffer(ctx) {
  const size = 2 * ctx.sampleRate;
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// ── Generators (return array of started nodes) ──
function genRain(ctx) {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx);
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 500;
  const lp2 = ctx.createBiquadFilter();
  lp2.type = 'lowpass'; lp2.frequency.value = 2000;
  src.connect(lp); lp.connect(lp2); lp2.connect(masterGain);
  src.start();
  return [src];
}

function genWhiteNoise(ctx) {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx);
  src.loop = true;
  src.connect(masterGain);
  src.start();
  return [src];
}

function genOcean(ctx) {
  const nodes = [];
  // Background noise base
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx);
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 700;
  const waveGain = ctx.createGain();
  waveGain.gain.value = 0.6;
  src.connect(lp); lp.connect(waveGain); waveGain.connect(masterGain);
  src.start();
  nodes.push(src);
  // LFO to simulate waves crashing (0.1 Hz)
  const lfo = ctx.createOscillator();
  lfo.type = 'sine'; lfo.frequency.value = 0.12;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.4;
  lfo.connect(lfoGain); lfoGain.connect(waveGain.gain);
  lfo.start(); nodes.push(lfo);
  return nodes;
}

function genForest(ctx) {
  const nodes = [];
  // Wind: low-pass filtered noise
  const wind = ctx.createBufferSource();
  wind.buffer = makeNoiseBuffer(ctx); wind.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'bandpass'; lp.frequency.value = 300; lp.Q.value = 0.5;
  const windGain = ctx.createGain(); windGain.gain.value = 0.3;
  wind.connect(lp); lp.connect(windGain); windGain.connect(masterGain);
  wind.start(); nodes.push(wind);
  // Random bird chirps
  function scheduleChirp() {
    if (currentSoundId !== 'forest') return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 2200 + Math.random() * 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(g); g.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    setTimeout(scheduleChirp, 1200 + Math.random() * 3000);
  }
  setTimeout(scheduleChirp, 500);
  return nodes;
}

function genCafe(ctx) {
  const nodes = [];
  // Ambient chatter: band-passed noise
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx); src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.8;
  const g = ctx.createGain(); g.gain.value = 0.25;
  src.connect(bp); bp.connect(g); g.connect(masterGain);
  src.start(); nodes.push(src);
  // Coffee machine hiss
  const src2 = ctx.createBufferSource();
  src2.buffer = makeNoiseBuffer(ctx); src2.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 3000;
  const g2 = ctx.createGain(); g2.gain.value = 0.08;
  src2.connect(hp); hp.connect(g2); g2.connect(masterGain);
  src2.start(); nodes.push(src2);
  return nodes;
}

const WEB_AUDIO_GENS = { rain: genRain, white: genWhiteNoise, ocean: genOcean, forest: genForest, cafe: genCafe };

// ── Toggle sound ──
window.focusToggleSound = function(id) {
  if (currentSoundId === id) { stopAmbient(); return; }
  stopAmbient();
  currentSoundId = id;

  if (id === 'lofi') {
    playLofiTrack(lofiTrackIndex);
  } else if (WEB_AUDIO_GENS[id]) {
    try {
      const ctx = getAudioCtx();
      webAudioNodes = WEB_AUDIO_GENS[id](ctx);
    } catch(e) {
      console.warn('[Focus] Web Audio error:', e);
      currentSoundId = null; return;
    }
  }

  document.querySelectorAll('.ambient-sound-btn').forEach(b => b.classList.remove('playing'));
  const btn = document.getElementById(`ambient-${id}`);
  if (btn) btn.classList.add('playing');
  const lofiBar = document.getElementById('lofiPlayer');
  if (lofiBar) lofiBar.style.display = id === 'lofi' ? 'flex' : 'none';
};

function playLofiTrack(index) {
  if (lofiAudio) { lofiAudio.pause(); lofiAudio = null; }
  lofiTrackIndex = ((index % LOFI_TRACKS.length) + LOFI_TRACKS.length) % LOFI_TRACKS.length;
  const track = LOFI_TRACKS[lofiTrackIndex];
  lofiAudio = new Audio(track.url);
  lofiAudio.volume = ambientVolume;
  lofiAudio.onended = () => { if (currentSoundId === 'lofi') playLofiTrack(lofiTrackIndex + 1); };
  lofiAudio.onerror = () => { if (currentSoundId === 'lofi') playLofiTrack(lofiTrackIndex + 1); };
  lofiAudio.play().catch(() => { if (currentSoundId === 'lofi') playLofiTrack(lofiTrackIndex + 1); });
  const titleEl = document.getElementById('lofiTrackTitle');
  if (titleEl) titleEl.textContent = track.title;
}

window.focusLofiNext = function() {
  if (currentSoundId !== 'lofi') return;
  playLofiTrack(lofiTrackIndex + 1);
};

function stopAmbient() {
  // Stop lofi
  if (lofiAudio) { lofiAudio.pause(); lofiAudio.src = ''; lofiAudio = null; }
  // Stop Web Audio
  webAudioNodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch(e){} });
  webAudioNodes = [];

  currentSoundId = null;
  document.querySelectorAll('.ambient-sound-btn').forEach(b => b.classList.remove('playing'));
  const lofiBar = document.getElementById('lofiPlayer');
  if (lofiBar) lofiBar.style.display = 'none';
}

window.focusSetVolume = function(val) {
  ambientVolume = parseInt(val) / 100;
  if (lofiAudio) lofiAudio.volume = ambientVolume;
  if (masterGain) masterGain.gain.value = ambientVolume;
};

