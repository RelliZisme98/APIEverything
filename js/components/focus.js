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
window.focusToggleSound = function(id) {
  const sound = SOUNDS.find(s => s.id === id);
  if (!sound) return;

  if (currentSoundId === id) {
    // Stop current sound
    stopAmbient();
    return;
  }

  // Stop previous
  stopAmbient();

  // Play new
  currentSoundId = id;
  ambientAudio = new Audio(sound.url);
  ambientAudio.loop = true;
  ambientAudio.volume = ambientVolume;
  ambientAudio.play().catch(() => {
    // autoplay blocked or CORS issue – silently fail
    currentSoundId = null;
    document.querySelectorAll('.ambient-sound-btn').forEach(b => b.classList.remove('playing'));
  });

  document.querySelectorAll('.ambient-sound-btn').forEach(b => b.classList.remove('playing'));
  const btn = document.getElementById(`ambient-${id}`);
  if (btn) btn.classList.add('playing');
};

function stopAmbient() {
  if (ambientAudio) {
    ambientAudio.pause();
    ambientAudio.src = '';
    ambientAudio = null;
  }
  currentSoundId = null;
  document.querySelectorAll('.ambient-sound-btn').forEach(b => b.classList.remove('playing'));
}

window.focusSetVolume = function(val) {
  ambientVolume = parseInt(val) / 100;
  if (ambientAudio) ambientAudio.volume = ambientVolume;
};
