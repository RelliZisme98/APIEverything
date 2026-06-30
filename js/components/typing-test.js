/**
 * components/typing-test.js
 * Minimalist, Monkeytype-inspired Typing Speed Test
 */

const WORD_BANKS = {
  vi: [
    "tôi", "học", "lập", "trình", "máy", "tính", "trang", "web", "phần", "mềm", 
    "giao", "diện", "người", "dùng", "dữ", "liệu", "công", "nghệ", "thông", "tin", 
    "phát", "triển", "hệ", "thống", "tốc", "độ", "chính", "xác", "thời", "gian", 
    "bàn", "phím", "ngón", "tay", "luyện", "tập", "hàng", "ngày", "tiến", "bộ", 
    "thành", "công", "sáng", "tạo", "tương", "lai", "việt", "nam", "chia", "sẻ", 
    "kết", "nối", "cộng", "đồng", "ứng", "dụng", "trực", "tuyến", "bảo", "mật",
    "thiết", "kế", "máy", "chủ", "cơ", "sở", "ngôn", "ngữ", "tối", "ưu", 
    "hiệu", "năng", "kiểm", "thử", "chất", "lượng", "mã", "nguồn", "mở", "khoa"
  ],
  en: [
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", 
    "not", "on", "with", "he", "as", "you", "do", "at", "this", "but", "his", "by", 
    "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", 
    "would", "there", "their", "what", "so", "up", "out", "if", "about", "who", "get", 
    "which", "go", "me", "when", "make", "can", "like", "time", "no", "just", "him", 
    "know", "take", "people", "into", "year", "your", "good", "some", "could", "them", 
    "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", 
    "think", "also", "back", "after", "use", "two", "how", "our", "work", "first", 
    "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", 
    "most", "us", "create", "design", "code", "programming", "software", "development"
  ]
};

let currentLang = 'vi';
let currentDuration = 30; // seconds
let timeLeft = 30;
let timerInterval = null;
let isPlaying = false;
let isFinished = false;
let playSound = false; // Sound toggle

let testWords = [];
let typedText = '';
let charIndex = 0;
let errorsCount = 0;
let totalTypedChars = 0;
let caretBlinkTimeout = null;

export function renderTypingTest(containerId = 'typingTestContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="tt-wrapper">
      <!-- Toolbar Controls -->
      <div class="tt-toolbar">
        <div class="tt-group">
          <span class="tt-label">Ngôn ngữ:</span>
          <button class="tt-btn ${currentLang === 'vi' ? 'active' : ''}" id="tt-lang-vi">Tiếng Việt</button>
          <button class="tt-btn ${currentLang === 'en' ? 'active' : ''}" id="tt-lang-en">English</button>
        </div>
        <div class="tt-group">
          <span class="tt-label">Thời gian:</span>
          <button class="tt-btn ${currentDuration === 15 ? 'active' : ''}" id="tt-time-15">15s</button>
          <button class="tt-btn ${currentDuration === 30 ? 'active' : ''}" id="tt-time-30">30s</button>
          <button class="tt-btn ${currentDuration === 60 ? 'active' : ''}" id="tt-time-60">60s</button>
        </div>
        <div class="tt-group">
          <span class="tt-label">Âm thanh:</span>
 <button class="tt-btn ${playSound ? 'active' : ''}" id="tt-btn-sound">Click: ${playSound ? 'Bật' : 'Tắt'}</button>
        </div>
      </div>

      <!-- Live Stats & Timer -->
      <div class="tt-stats-bar">
        <div class="tt-stat-item">
          <div class="tt-stat-val timer" id="tt-timer">${timeLeft}</div>
          <div class="tt-stat-lbl">giây còn lại</div>
        </div>
        <div class="tt-stat-item">
          <div class="tt-stat-val" id="tt-live-wpm">0</div>
          <div class="tt-stat-lbl">WPM thực tế</div>
        </div>
        <div class="tt-stat-item">
          <div class="tt-stat-val" id="tt-live-acc">100%</div>
          <div class="tt-stat-lbl">độ chính xác</div>
        </div>
      </div>

      <!-- Typing Container -->
      <div class="tt-typing-container" id="tt-typing-box" tabindex="0">
        <div class="tt-words-wrapper" id="tt-words-wrap">
          <!-- Rendered dynamically -->
        </div>
        <input type="text" id="tt-hidden-input" autocomplete="off" autofocus class="tt-hidden-input" />
        <div class="tt-focus-prompt" id="tt-focus-prompt">
          <span class="pulse-icon">⌨️</span>
          <span>Nhấp chuột vào đây để kích hoạt gõ phím</span>
          <span class="tt-focus-prompt-shortcut">Bấm ESC để chơi lại</span>
        </div>
      </div>

      <!-- Live Typing Preview Panel -->
      <div class="tt-input-panel" style="margin-top: 15px; display: flex; align-items: center; gap: 12px; background: rgba(13, 20, 36, 0.4); padding: 12px 18px; border-radius: var(--radius-sm); border: 1px solid var(--border); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
        <span style="font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0;">Nội dung gõ:</span>
        <div id="tt-input-preview" style="font-family: var(--font-mono); font-size: 15px; color: var(--accent-blue); min-height: 22px; flex-grow: 1; display: flex; align-items: center; overflow: hidden; white-space: nowrap; text-shadow: 0 0 8px rgba(96, 165, 250, 0.3);">
          <span style="color: rgba(255,255,255,0.25); font-style: italic;">Nhấp vào ô từ phía trên và bắt đầu gõ...</span>
        </div>
      </div>

      <!-- Footer action -->
      <div class="tt-actions">
        <button class="btn-primary tt-restart-btn" id="tt-btn-restart">
 Luyện Lại (Esc)
        </button>
      </div>

      <!-- Result Screen Overlay (Hidden by default) -->
      <div class="tt-result-screen" id="tt-result-screen" style="display: none;">
        <div class="tt-result-card">
 <div class="tt-result-header">Kết Quả Của Bạn</div>
          
          <div class="tt-result-grid">
            <div class="tt-r-item highlight">
              <div class="tt-r-val" id="tt-r-wpm">0</div>
              <div class="tt-r-lbl">WPM (Từ/Phút)</div>
            </div>
            <div class="tt-r-item">
              <div class="tt-r-val" id="tt-r-acc">0%</div>
              <div class="tt-r-lbl">Độ chính xác</div>
            </div>
            <div class="tt-r-item">
              <div class="tt-r-val" id="tt-r-raw">0</div>
              <div class="tt-r-lbl">Raw WPM</div>
            </div>
            <div class="tt-r-item">
              <div class="tt-r-val" id="tt-r-errors" style="color: #f87171;">0</div>
              <div class="tt-r-lbl">Số lỗi gõ</div>
            </div>
          </div>

          <div class="tt-result-details" id="tt-r-desc">
            Bạn đã gõ tổng cộng <strong id="tt-r-total-chars">0</strong> ký tự.
          </div>

 <button class="btn-primary" id="tt-r-close-btn" style="width: 100%; margin-top: 16px;">Thử Lại Lần Nữa</button>
        </div>
      </div>
    </div>
  `;

  // Attach controls listeners
  setupTypingTest();
}

function playClickSound() {
  if (!playSound) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Generate a realistic mechanical click sound using dynamic oscillator frequency sweeps
    osc.type = 'triangle';
    const pitch = 850 + Math.random() * 300;
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.045);
  } catch (e) {
    console.error('AudioContext error:', e);
  }
}

function setupTypingTest() {
  const wordsWrap = document.getElementById('tt-words-wrap');
  const hiddenInput = document.getElementById('tt-hidden-input');
  const typingBox = document.getElementById('tt-typing-box');
  const focusPrompt = document.getElementById('tt-focus-prompt');
  const timerEl = document.getElementById('tt-timer');
  const liveWpmEl = document.getElementById('tt-live-wpm');
  const liveAccEl = document.getElementById('tt-live-acc');
  const btnRestart = document.getElementById('tt-btn-restart');

  const langVi = document.getElementById('tt-lang-vi');
  const langEn = document.getElementById('tt-lang-en');
  const time15 = document.getElementById('tt-time-15');
  const time30 = document.getElementById('tt-time-30');
  const time60 = document.getElementById('tt-time-60');
  const soundToggle = document.getElementById('tt-btn-sound');

  const resultScreen = document.getElementById('tt-result-screen');
  const resultCloseBtn = document.getElementById('tt-r-close-btn');

  // Reset variables
  clearInterval(timerInterval);
  timerInterval = null;
  isPlaying = false;
  isFinished = false;
  timeLeft = currentDuration;
  timerEl.textContent = timeLeft;
  liveWpmEl.textContent = '0';
  liveAccEl.textContent = '100%';
  typedText = '';
  charIndex = 0;
  errorsCount = 0;
  totalTypedChars = 0;

  // Sound toggle handler
  soundToggle.onclick = () => {
    playSound = !playSound;
    soundToggle.classList.toggle('active', playSound);
 soundToggle.textContent = `Click: ${playSound ? 'Bật' : 'Tắt'}`;
    hiddenInput.focus();
  };

  // Language selectors
  langVi.onclick = () => { currentLang = 'vi'; updateActiveButtons(); initWords(); };
  langEn.onclick = () => { currentLang = 'en'; updateActiveButtons(); initWords(); };

  // Duration selectors
  time15.onclick = () => { currentDuration = 15; timeLeft = 15; updateActiveButtons(); resetTest(); };
  time30.onclick = () => { currentDuration = 30; timeLeft = 30; updateActiveButtons(); resetTest(); };
  time60.onclick = () => { currentDuration = 60; timeLeft = 60; updateActiveButtons(); resetTest(); };

  btnRestart.onclick = () => resetTest();
  resultCloseBtn.onclick = () => {
    resultScreen.style.display = 'none';
    resetTest();
  };

  // Keyboard shortcut Esc to restart
  const onKeyDownGlobal = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      resetTest();
    }
  };
  window.removeEventListener('keydown', window._ttEscRestart);
  window._ttEscRestart = onKeyDownGlobal;
  window.addEventListener('keydown', onKeyDownGlobal);

  function updateActiveButtons() {
    langVi.classList.toggle('active', currentLang === 'vi');
    langEn.classList.toggle('active', currentLang === 'en');
    time15.classList.toggle('active', currentDuration === 15);
    time30.classList.toggle('active', currentDuration === 30);
    time60.classList.toggle('active', currentDuration === 60);
  }

  // Handle focus behavior
  typingBox.onclick = () => {
    hiddenInput.focus();
  };
  hiddenInput.onfocus = () => {
    focusPrompt.style.opacity = '0';
    focusPrompt.style.pointerEvents = 'none';
    typingBox.classList.add('focused');
  };
  hiddenInput.onblur = () => {
    focusPrompt.style.opacity = '1';
    focusPrompt.style.pointerEvents = 'all';
    typingBox.classList.remove('focused');
  };

  // Gliding caret position updates
  function updateCaret() {
    const caretEl = document.getElementById('tt-caret');
    if (!caretEl) return;
    const chars = wordsWrap.querySelectorAll('.tt-char');
    const activeChar = chars[charIndex];
    
    if (activeChar) {
      const charRect = activeChar.getBoundingClientRect();
      const parentRect = wordsWrap.getBoundingClientRect();
      
      const leftVal = charRect.left - parentRect.left + wordsWrap.scrollLeft;
      const topVal = charRect.top - parentRect.top + wordsWrap.scrollTop;
      
      caretEl.style.left = `${leftVal}px`;
      caretEl.style.top = `${topVal}px`;
      caretEl.style.height = `${charRect.height}px`;
      caretEl.style.display = 'block';
    } else {
      // Caret at the end of the last character
      const lastChar = chars[chars.length - 1];
      if (lastChar) {
        const charRect = lastChar.getBoundingClientRect();
        const parentRect = wordsWrap.getBoundingClientRect();
        
        const leftVal = charRect.left - parentRect.left + wordsWrap.scrollLeft + charRect.width;
        const topVal = charRect.top - parentRect.top + wordsWrap.scrollTop;
        
        caretEl.style.left = `${leftVal}px`;
        caretEl.style.top = `${topVal}px`;
        caretEl.style.height = `${charRect.height}px`;
        caretEl.style.display = 'block';
      } else {
        caretEl.style.display = 'none';
      }
    }
  }

  // Blinking caret handling
  function resetCaretBlink() {
    const caretEl = document.getElementById('tt-caret');
    if (!caretEl) return;
    
    caretEl.classList.remove('blink');
    clearTimeout(caretBlinkTimeout);
    
    caretBlinkTimeout = setTimeout(() => {
      caretEl.classList.add('blink');
    }, 500);
  }

  // Populate words
  function initWords() {
    const list = WORD_BANKS[currentLang];
    // Shuffle and pick 100 words
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    testWords = shuffled.slice(0, 100);
    
    // Render words as span letters
    wordsWrap.innerHTML = '';
    
    // Add custom caret element
    const caret = document.createElement('div');
    caret.className = 'tt-caret blink';
    caret.id = 'tt-caret';
    wordsWrap.appendChild(caret);

    testWords.forEach((word, wordIdx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'tt-word';
      wordSpan.dataset.wordIndex = wordIdx;
      
      for (let i = 0; i < word.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.className = 'tt-char';
        charSpan.textContent = word[i];
        wordSpan.appendChild(charSpan);
      }
      
      // Add space character span unless it is the last word
      if (wordIdx < testWords.length - 1) {
        const spaceSpan = document.createElement('span');
        spaceSpan.className = 'tt-char tt-space';
        spaceSpan.innerHTML = '&nbsp;';
        wordSpan.appendChild(spaceSpan);
      }

      wordsWrap.appendChild(wordSpan);
    });

    // Positions caret at the start of first character
    setTimeout(updateCaret, 20);
  }

  // Run initial population
  initWords();

  // Handle caret updates on resize
  const onResize = () => updateCaret();
  window.removeEventListener('resize', window._ttOnResize);
  window._ttOnResize = onResize;
  window.addEventListener('resize', onResize);

  // Reset test state
  function resetTest() {
    clearInterval(timerInterval);
    timerInterval = null;
    isPlaying = false;
    isFinished = false;
    timeLeft = currentDuration;
    timerEl.textContent = timeLeft;
    liveWpmEl.textContent = '0';
    liveAccEl.textContent = '100%';
    typedText = '';
    charIndex = 0;
    errorsCount = 0;
    totalTypedChars = 0;
    hiddenInput.value = '';
    const previewEl = document.getElementById('tt-input-preview');
    if (previewEl) {
      previewEl.innerHTML = `<span style="color: rgba(255,255,255,0.25); font-style: italic;">Nhấp vào ô từ phía trên và bắt đầu gõ...</span>`;
    }
    resultScreen.style.display = 'none';
    initWords();
    hiddenInput.focus();
  }

  // Handle typing input
  hiddenInput.oninput = (e) => {
    if (isFinished) return;

    const val = hiddenInput.value;
    const chars = wordsWrap.querySelectorAll('.tt-char:not(.tt-caret)'); // exclude caret element

    // Play click sound effect
    playClickSound();

    // Start timer on first keystroke
    if (!isPlaying && val.length > 0) {
      startTimer();
    }

    // Update live text preview
    const previewEl = document.getElementById('tt-input-preview');
    if (previewEl) {
      if (val.length === 0) {
        previewEl.innerHTML = `<span style="color: rgba(255,255,255,0.25); font-style: italic;">Nhấp vào ô từ phía trên và bắt đầu gõ...</span>`;
      } else {
        const showVal = val.length > 50 ? '...' + val.slice(-50) : val;
        previewEl.textContent = showVal;
      }
    }

    const currentTypedLength = val.length;

    // 1. Stats Tracking: Track typed characters and errors when length increases
    if (currentTypedLength > typedText.length) {
      for (let i = typedText.length; i < currentTypedLength; i++) {
        totalTypedChars++;
        const charEl = chars[i];
        if (charEl) {
          const typedChar = val[i];
          const targetChar = charEl.classList.contains('tt-space') ? ' ' : charEl.textContent;
          if (typedChar !== targetChar) {
            errorsCount++;
          }
        }
      }
    }

    // 2. Visual rendering: Re-evaluate correct/incorrect states of all chars based on full current input string
    for (let i = 0; i < chars.length; i++) {
      const charEl = chars[i];
      if (i < currentTypedLength) {
        const typedChar = val[i];
        const targetChar = charEl.classList.contains('tt-space') ? ' ' : charEl.textContent;
        if (typedChar === targetChar) {
          charEl.classList.remove('incorrect');
          charEl.classList.add('correct');
        } else {
          charEl.classList.remove('correct');
          charEl.classList.add('incorrect');
        }
      } else {
        // Reset classes for characters beyond the current input length
        charEl.classList.remove('correct', 'incorrect');
      }
    }

    charIndex = currentTypedLength;

    // 3. Gliding Caret and Blinking state resets
    updateCaret();
    resetCaretBlink();

    // 4. Smooth scroll centering
    const activeChar = chars[charIndex];
    if (activeChar) {
      const wrapperHeight = wordsWrap.clientHeight;
      const charRect = activeChar.getBoundingClientRect();
      const parentRect = wordsWrap.getBoundingClientRect();
      const relativeCharTop = charRect.top - parentRect.top + wordsWrap.scrollTop;
      
      const targetScroll = relativeCharTop - wrapperHeight / 2 + charRect.height / 2;
      wordsWrap.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }

    typedText = val;

    // Calculate real-time stats
    calculateStats();

    // Check if user finished all words
    if (charIndex >= chars.length) {
      finishTest();
    }
  };

  function startTimer() {
    isPlaying = true;
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = timeLeft;

      calculateStats();

      if (timeLeft <= 0) {
        finishTest();
      }
    }, 1000);
  }

  function calculateStats() {
    const elapsedMinutes = (currentDuration - timeLeft) / 60 || 1/60; // prevent divide by zero
    
    // WPM = (correct chars / 5) / time
    const correctChars = wordsWrap.querySelectorAll('.tt-char.correct').length;
    const wpm = Math.round((correctChars / 5) / elapsedMinutes);
    
    // Raw WPM = (total typed chars / 5) / time
    const rawWpm = Math.round((totalTypedChars / 5) / elapsedMinutes);
    
    // Accuracy = (correct chars / total typed chars) * 100
    const accuracy = totalTypedChars > 0 
      ? Math.round((correctChars / totalTypedChars) * 100) 
      : 100;

    liveWpmEl.textContent = wpm;
    liveAccEl.textContent = `${accuracy}%`;

    return { wpm, rawWpm, accuracy };
  }

  function finishTest() {
    clearInterval(timerInterval);
    isFinished = true;
    isPlaying = false;
    hiddenInput.blur();

    const stats = calculateStats();
    
    // Show stats in result screen
    document.getElementById('tt-r-wpm').textContent = stats.wpm;
    document.getElementById('tt-r-acc').textContent = `${stats.accuracy}%`;
    document.getElementById('tt-r-raw').textContent = stats.rawWpm;
    document.getElementById('tt-r-errors').textContent = errorsCount;
    document.getElementById('tt-r-total-chars').textContent = totalTypedChars;

    const descEl = document.getElementById('tt-r-desc');
    let appraisal = '';
 if (stats.wpm > 80) appraisal = 'Tuyệt vời! Bạn gõ phím nhanh như một lập trình viên chuyên nghiệp!';
 else if (stats.wpm > 50) appraisal = 'Rất tốt! Tốc độ gõ phím của bạn ở mức khá cao.';
 else if (stats.wpm > 30) appraisal = 'Khá ổn! Hãy tiếp tục luyện tập để đạt tốc độ cao hơn nhé.';
 else appraisal = 'Cố lên! Chăm chỉ gõ phím hàng ngày sẽ giúp bạn tăng tốc độ nhanh chóng.';
    
    descEl.innerHTML = `
      ${appraisal}
      <br><br>
      Bạn đã hoàn thành bài thi với tổng số <strong style="color:var(--accent-yellow);">${totalTypedChars}</strong> ký tự trong <strong>${currentDuration}s</strong>, 
      gặp phải <strong style="color:#f87171;">${errorsCount}</strong> lỗi gõ sai.
    `;

    resultScreen.style.display = 'flex';
  }
}
