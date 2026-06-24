/**
 * components/emulator.js
 * Retro Game NES Emulator using JSNES.
 * Supports loading homebrew games from URL and custom user ROM uploads.
 */

import { state } from '../store/state.js';

let nesBrowser = null;
let currentRomData = null;

// Helper to safely generate a base64 SVG data URI for thumbnails to prevent HTML quote/parsing bugs
function getSvgThumbnail(emoji) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#1e293b'/><text x='50' y='65' font-size='40' text-anchor='middle'>${emoji}</text></svg>`;
  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
}

const HOMEBREW_GAMES = [
  {
    id: 'flappy_bird',
    name: '🐦 Flappy Bird NES',
    desc: 'Bản clone Flappy Bird cực nhẹ cho hệ máy điện tử 4 nút.',
    url: 'https://raw.githubusercontent.com/retrobrews/nes-games/master/flappybird.nes',
    thumbnail: getSvgThumbnail('🐦'),
    instructions: 'Bấm nút START (Enter) để bắt đầu. Nhấn nút A (phím Z) để bay lên né cống.'
  },
  {
    id: 'invaders',
    name: '🛸 Invaders Must Die',
    desc: 'Trận chiến bắn phi thuyền bảo vệ Trái Đất phong cách Space Invaders.',
    url: 'https://raw.githubusercontent.com/retrobrews/nes-games/master/invaders.nes',
    thumbnail: getSvgThumbnail('🛸'),
    instructions: 'Bấm nút START (Enter) để bắt đầu. Dùng Trái/Phải để di chuyển, nút A (phím Z) để bắn quái vật.'
  },
  {
    id: 'lala',
    name: '🧚 Lala The Magical',
    desc: 'Game phiêu lưu cảnh nền đi tìm đá năng lượng của Mojon Twins.',
    url: 'https://raw.githubusercontent.com/retrobrews/nes-games/master/lala.nes',
    thumbnail: getSvgThumbnail('🧚'),
    instructions: 'Bấm nút START (Enter) để vào game. Trái/Phải để chạy, nút A (Z) để nhảy, nút B (X) để lấy đá.'
  },
  {
    id: 'driar',
    name: '🏃 Driar Platformer',
    desc: 'Tựa game đi cảnh 38 màn chơi thu thập sao cực kỳ hấp dẫn và thử thách.',
    url: 'https://raw.githubusercontent.com/retrobrews/nes-games/master/driar.nes',
    thumbnail: getSvgThumbnail('🏃'),
    instructions: 'Bấm nút START (Enter) để bắt đầu. Trái/Phải để di chuyển, nút A (Z) để nhảy qua chướng ngại vật.'
  },
  {
    id: 'supertilt',
    name: '🥊 Super Tilt Bro.',
    desc: 'Bản demake đấu võ đài kiểu Smash Bros có thể chơi hai người cạnh tranh.',
    url: 'https://raw.githubusercontent.com/retrobrews/nes-games/master/super-tilt-bro.nes',
    thumbnail: getSvgThumbnail('🥊'),
    instructions: 'Bấm nút START (Enter) để vào game. Trái/Phải để di chuyển, nút A (Z) để tấn công, nút B (X) để nhảy.'
  },
  {
    id: 'snailmaze',
    name: '🐌 Snail Maze',
    desc: 'Dẫn dắt chú ốc sên đi qua 12 mê cung phức tạp để giành chiến thắng.',
    url: 'https://raw.githubusercontent.com/retrobrews/nes-games/master/snailmaze.nes',
    thumbnail: getSvgThumbnail('🐌'),
    instructions: 'Dùng các nút di chuyển (phím Mũi Tên) để hướng dẫn ốc sên chạy thoát khỏi mê cung.'
  },
  {
    id: 'pong1k',
    name: '🏓 Pong 1K',
    desc: 'Trò chơi đánh bóng bàn cổ điển đơn giản nhưng lôi cuốn.',
    url: 'https://raw.githubusercontent.com/retrobrews/nes-games/master/pong1k.nes',
    thumbnail: getSvgThumbnail('🏓'),
    instructions: 'Dùng phím Mũi Tên Lên/Xuống để điều khiển thanh vợt đánh bóng lại đối thủ.'
  },
  {
    id: 'gsm',
    name: '🚀 Space Magellan',
    desc: 'Điều khiển tàu ngầm tránh chướng ngại vật cực kỳ kịch tính.',
    url: 'https://raw.githubusercontent.com/retrobrews/nes-games/master/gsm.nes',
    thumbnail: getSvgThumbnail('🚀'),
    instructions: 'Bấm nút START (Enter) để bắt đầu. Dùng các phím Mũi Tên để điều khiển phi thuyền tránh các bức tường.'
  }
];

export function renderEmulatorSuite(containerId = 'emulatorContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Check if JSNES is loaded
  if (typeof window.jsnes === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/jsnes@2/dist/jsnes.min.js';
    script.onload = () => {
      buildUI(container);
    };
    script.onerror = () => {
      container.innerHTML = `<div class="error-msg">⚠️ Lỗi: Không thể tải thư viện JSNES Emulator từ CDN.</div>`;
    };
    document.head.appendChild(script);
  } else {
    buildUI(container);
  }
}

function buildUI(container) {
  container.innerHTML = `
    <div class="emu-suite-wrap">
      <div class="emu-grid">
        <!-- Console Column -->
        <div class="emu-console-col">
          <!-- TV Cabinet Frame -->
          <div class="emu-tv-cabinet">
            <div class="emu-screen-bezel">
              <div class="emu-tv-header">
                <div class="emu-power-led" id="emuPowerLed"></div>
                <div class="emu-tv-brand">🕹️ RELLIA RETRO ENGINE</div>
                <div class="emu-tv-status" id="emuStatus">No Game Loaded</div>
              </div>
              <div class="emu-screen-wrapper">
                <div id="nes-screen-container"></div>
                
                <!-- CRT Standby Screen -->
                <div class="emu-screen-standby" id="emuScreenStandby">
                  <div class="emu-standby-inner">
                    <div class="emu-standby-logo">🕹️ RELLIA RETRO</div>
                    <div class="emu-standby-text">Chọn một game từ danh sách bên phải hoặc tải lên file .nes để bắt đầu chơi</div>
                  </div>
                </div>

                <!-- CRT Start Prompt Overlay -->
                <div class="emu-screen-start-prompt" id="emuScreenStartPrompt">
                  <div class="emu-prompt-inner">
                    <div class="emu-prompt-icon">🎮</div>
                    <div class="emu-prompt-title" id="emuPromptTitle">Game Ready!</div>
                    <div class="emu-prompt-desc" id="emuPromptDesc">Bấm vào đây để bắt đầu chơi.</div>
                    <button class="emu-prompt-btn">BẮT ĐẦU CHƠI</button>
                  </div>
                </div>

                <!-- Floating HUD overlay buttons -->
                <div class="emu-screen-hud" id="emuScreenHud">
                  <button class="emu-hud-btn" id="emuHudReset" title="Chơi lại từ đầu (Reset)">🔄 Chơi lại</button>
                  <button class="emu-hud-btn btn-danger-hud" id="emuHudPower" title="Tắt game (Power Off)">🔌 Tắt game</button>
                  <button class="emu-hud-btn" id="emuHudMute" title="Tắt/Bật tiếng">🔊 Mute</button>
                </div>
              </div>
            </div>
            
            <!-- TV Bottom Grill & Control Buttons -->
            <div class="emu-tv-controls">
              <button class="emu-btn-console" id="emuBtnPower" title="Power On/Off">🔌 POWER</button>
              <button class="emu-btn-console" id="emuBtnReset" title="Reset Game" disabled>🔄 RESET</button>
              <button class="emu-btn-console" id="emuBtnMute" title="Mute/Unmute Audio">🔊 MUTE</button>
            </div>
          </div>

          <!-- Virtual Gamepad (For touch & click) -->
          <div class="emu-gamepad" id="emuGamepad">
            <!-- Left D-Pad -->
            <div class="emu-dpad">
              <div class="emu-dpad-btn emu-dpad-up" data-button="UP">▲</div>
              <div class="emu-dpad-btn emu-dpad-left" data-button="LEFT">◀</div>
              <div class="emu-dpad-btn emu-dpad-center"></div>
              <div class="emu-dpad-btn emu-dpad-right" data-button="RIGHT">▶</div>
              <div class="emu-dpad-btn emu-dpad-down" data-button="DOWN">▼</div>
            </div>

            <!-- Center Select / Start -->
            <div class="emu-gamepad-center">
              <div class="emu-center-btn-wrap">
                <div class="emu-sys-btn emu-btn-select" data-button="SELECT"></div>
                <label>SELECT</label>
              </div>
              <div class="emu-center-btn-wrap">
                <div class="emu-sys-btn emu-btn-start" data-button="START"></div>
                <label>START</label>
              </div>
            </div>

            <!-- Right Buttons A/B -->
            <div class="emu-action-buttons">
              <div class="emu-action-btn-wrap">
                <div class="emu-action-btn emu-btn-b" data-button="B">B</div>
                <label>B (Phím Z)</label>
              </div>
              <div class="emu-action-btn-wrap">
                <div class="emu-action-btn emu-btn-a" data-button="A">A</div>
                <label>A (Phím X / Space)</label>
              </div>
            </div>
          </div>

          <!-- Keyboard Help -->
          <div class="emu-keyboard-help">
            <span class="emu-help-tag">⌨️ Phím điều khiển:</span>
            <span>Di chuyển: <b>Arrow Keys</b> | A: <b>X / Space</b> | B: <b>Z</b> | Select: <b>Shift</b> | Start: <b>Enter</b></span>
          </div>
        </div>

        <!-- Game Library Column -->
        <div class="emu-library-col">
          <div class="hl-section-label">🎮 Thư viện Trò chơi</div>
          
          <div class="emu-game-list">
            ${HOMEBREW_GAMES.map(game => `
              <div class="emu-game-card" data-url="${game.url}">
                <img class="emu-game-thumb" src="${game.thumbnail}" alt="${game.name}" />
                <div class="emu-game-info">
                  <div class="emu-game-name">${game.name}</div>
                  <div class="emu-game-desc">${game.desc}</div>
                </div>
                <button class="btn-primary emu-play-btn">CHƠI</button>
              </div>
            `).join('')}
          </div>

          <!-- Upload ROM -->
          <div class="emu-upload-box">
            <div class="emu-upload-title">💾 Chơi Game của riêng bạn</div>
            <p class="emu-upload-desc">Bạn có file ROM game NES riêng (.nes)? Hãy thả hoặc tải lên để chơi ngay lập tức!</p>
            <input type="file" id="emuFileLoader" accept=".nes" style="display: none;" />
            <button class="btn-primary" onclick="document.getElementById('emuFileLoader').click()" style="width: 100%;">📁 Chọn File Game (.nes)</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers
  setupEmulator();
}

function setupEmulator() {
  const containerScreen = document.getElementById('nes-screen-container');
  const led = document.getElementById('emuPowerLed');
  const statusEl = document.getElementById('emuStatus');
  const btnReset = document.getElementById('emuBtnReset');
  const btnMute = document.getElementById('emuBtnMute');
  const btnPower = document.getElementById('emuBtnPower');
  const fileLoader = document.getElementById('emuFileLoader');

  // New overlay HUD elements
  const standbyEl = document.getElementById('emuScreenStandby');
  const hudEl = document.getElementById('emuScreenHud');
  const hudReset = document.getElementById('emuHudReset');
  const hudPower = document.getElementById('emuHudPower');
  const hudMute = document.getElementById('emuHudMute');

  // Start Prompt elements
  const promptEl = document.getElementById('emuScreenStartPrompt');
  const promptTitle = document.getElementById('emuPromptTitle');
  const promptDesc = document.getElementById('emuPromptDesc');

  let isMuted = false;
  let isPoweredOn = false;

  function updateScreenUIState() {
    if (isPoweredOn) {
      if (standbyEl) {
        standbyEl.style.opacity = '0';
        setTimeout(() => {
          if (standbyEl && isPoweredOn) standbyEl.style.display = 'none';
        }, 300);
      }
      if (hudEl) hudEl.style.display = 'flex';
    } else {
      if (standbyEl) {
        standbyEl.style.display = 'flex';
        // Force reflow
        standbyEl.offsetHeight;
        standbyEl.style.opacity = '1';
      }
      if (hudEl) hudEl.style.display = 'none';
      if (promptEl) promptEl.style.display = 'none';
    }

    // Sync Mute status text on HUD
    if (hudMute) {
      hudMute.innerHTML = isMuted ? '🔇 Bật tiếng' : '🔊 Tắt tiếng';
      if (isMuted) {
        hudMute.style.background = '#f59e0b';
      } else {
        hudMute.style.background = '';
      }
    }
  }

  function showStartPrompt(name, instructions) {
    if (!promptEl) return;
    if (promptTitle) promptTitle.textContent = `${name} Sẵn Sàng!`;
    if (promptDesc) {
      promptDesc.innerHTML = `
        ${instructions || 'Sử dụng gamepad ảo hoặc các phím tương ứng trên bàn phím để chơi.'}
        <br><br>
        <span style="color:#60a5fa; font-weight:bold;">👉 Bấm vào đây hoặc nút BẮT ĐẦU CHƠI để vào game</span>
      `;
    }
    promptEl.style.display = 'flex';
  }

  // Click on the prompt to auto-start the game
  if (promptEl) {
    promptEl.addEventListener('click', () => {
      promptEl.style.display = 'none';
      // Simulate START key press (index 3) to start game play
      if (nesBrowser) {
        nesBrowser.nes.buttonDown(1, 3);
        setTimeout(() => {
          nesBrowser.nes.buttonUp(1, 3);
        }, 150);
      }
    });
  }

  // Initialize JSNES Browser wrapper
  function initNES() {
    if (nesBrowser) return;

    nesBrowser = new window.jsnes.Browser({
      container: containerScreen,
      onError: (err) => {
        console.error('[Emulator] JSNES Error:', err);
        statusEl.textContent = 'Error Running ROM';
      }
    });

    // Make canvas responsive
    const canvas = containerScreen.querySelector('canvas');
    if (canvas) {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.imageRendering = 'pixelated';
    }
  }

  function destroyNES() {
    if (nesBrowser) {
      try {
        nesBrowser.destroy();
      } catch (e) {}
      nesBrowser = null;
    }
    containerScreen.innerHTML = '';
    if (promptEl) promptEl.style.display = 'none';
  }

  async function loadRomFromUrl(url, name) {
    statusEl.textContent = '⏳ Loading ROM...';
    destroyNES();
    initNES();

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert ArrayBuffer to binary string as required by JSNES
      const bytes = new Uint8Array(arrayBuffer);
      let binaryStr = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binaryStr += String.fromCharCode(bytes[i]);
      }

      currentRomData = binaryStr;
      
      // Start emulation
      nesBrowser.loadROM(currentRomData);
      
      isPoweredOn = true;
      led.classList.add('active');
      statusEl.textContent = `🟢 Running: ${name}`;
      btnReset.disabled = false;
      updateScreenUIState();

      // Find instructions and show the prompt overlay
      const cleanName = name.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
      const gameObj = HOMEBREW_GAMES.find(g => g.name.includes(cleanName) || cleanName.includes(g.name));
      const instructions = gameObj ? gameObj.instructions : 'Nhấn nút START (phím Enter) để bắt đầu.';
      showStartPrompt(cleanName, instructions);
    } catch (e) {
      console.error(e);
      statusEl.textContent = '⚠️ Lỗi tải ROM';
    }
  }

  // Load custom local ROM
  fileLoader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    statusEl.textContent = '⏳ Loading Local ROM...';
    const reader = new FileReader();
    reader.onload = (event) => {
      destroyNES();
      initNES();

      const result = event.target.result;
      currentRomData = result;

      // Start Emulation
      nesBrowser.loadROM(currentRomData);

      isPoweredOn = true;
      led.classList.add('active');
      statusEl.textContent = `🟢 Running: ${file.name.replace('.nes', '')}`;
      btnReset.disabled = false;
      updateScreenUIState();

      showStartPrompt(file.name.replace('.nes', ''), 'Bấm nút START (Enter) hoặc nhấp vào đây để bắt đầu chơi.');
    };
    reader.readAsBinaryString(file);
  });

  // Library buttons click
  document.querySelectorAll('.emu-game-card').forEach(card => {
    const playBtn = card.querySelector('.emu-play-btn');
    const url = card.dataset.url;
    const name = card.querySelector('.emu-game-name').textContent;

    playBtn.addEventListener('click', () => {
      loadRomFromUrl(url, name);
    });
  });

  // Control Buttons
  btnPower.addEventListener('click', () => {
    if (isPoweredOn) {
      // Turn Off
      destroyNES();
      isPoweredOn = false;
      led.classList.remove('active');
      statusEl.textContent = 'Power Off';
      btnReset.disabled = true;
      updateScreenUIState();
    } else {
      // Turn On
      if (currentRomData) {
        initNES();
        nesBrowser.loadROM(currentRomData);
        isPoweredOn = true;
        led.classList.add('active');
        statusEl.textContent = '🟢 Resumed';
        btnReset.disabled = false;
        updateScreenUIState();
      } else {
        statusEl.textContent = '⚠️ Hãy chọn 1 game để chơi';
      }
    }
  });

  btnReset.addEventListener('click', () => {
    if (nesBrowser && isPoweredOn) {
      nesBrowser.nes.reloadROM();
      statusEl.textContent = '🟢 Resetted';
    }
  });

  btnMute.addEventListener('click', () => {
    if (!nesBrowser) return;

    if (isMuted) {
      // Unmute
      nesBrowser.nes.audio.writeSample = nesBrowser.nes.audio.originalWriteSample || nesBrowser.nes.audio.writeSample;
      btnMute.textContent = '🔊 MUTE';
      btnMute.style.background = '';
      isMuted = false;
      updateScreenUIState();
    } else {
      // Mute (Override samples writing with empty function)
      if (!nesBrowser.nes.audio.originalWriteSample) {
        nesBrowser.nes.audio.originalWriteSample = nesBrowser.nes.audio.writeSample;
      }
      nesBrowser.nes.audio.writeSample = () => {};
      btnMute.textContent = '🔇 UNMUTE';
      btnMute.style.background = '#f59e0b';
      isMuted = true;
      updateScreenUIState();
    }
  });

  // Connect screen HUD overlay buttons to console buttons
  if (hudReset) hudReset.addEventListener('click', () => btnReset.click());
  if (hudPower) hudPower.addEventListener('click', () => btnPower.click());
  if (hudMute) hudMute.addEventListener('click', () => btnMute.click());

  // Initial State Setup
  updateScreenUIState();

  // Setup Virtual Gamepad events
  setupGamepadInput();
}

function setupGamepadInput() {
  const buttons = {
    A: 0,
    B: 1,
    SELECT: 2,
    START: 3,
    UP: 4,
    DOWN: 5,
    LEFT: 6,
    RIGHT: 7
  };

  function handlePress(btnName) {
    if (!nesBrowser) return;

    // Dismiss overlay prompt on any gamepad interaction
    const promptEl = document.getElementById('emuScreenStartPrompt');
    if (promptEl && promptEl.style.display !== 'none') {
      promptEl.style.display = 'none';
    }

    const btnConst = buttons[btnName];
    if (btnConst !== undefined) {
      nesBrowser.nes.buttonDown(1, btnConst);
    }
  }

  function handleRelease(btnName) {
    if (!nesBrowser) return;
    const btnConst = buttons[btnName];
    if (btnConst !== undefined) {
      nesBrowser.nes.buttonUp(1, btnConst);
    }
  }

  // Bind mouse and touch events to virtual gamepad buttons
  const gp = document.getElementById('emuGamepad');
  if (!gp) return;

  const virtualButtons = gp.querySelectorAll('[data-button]');
  virtualButtons.forEach(btn => {
    const btnName = btn.dataset.button;

    // Mouse events
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handlePress(btnName);
    });
    btn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      handleRelease(btnName);
    });
    btn.addEventListener('mouseleave', (e) => {
      e.preventDefault();
      handleRelease(btnName);
    });

    // Touch events
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handlePress(btnName);
    });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleRelease(btnName);
    });
    btn.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      handleRelease(btnName);
    });
  });

  // Handle Keyboard bindings with capture-phase prevention to stop scrolling
  const keyMap = {
    'ArrowUp': 4,
    'ArrowDown': 5,
    'ArrowLeft': 6,
    'ArrowRight': 7,
    'z': 1, // B
    'Z': 1, // B
    'x': 0, // A
    'X': 0, // A
    ' ': 0, // Space -> A
    'Enter': 3,
    'Shift': 2
  };

  const onKeyDown = (e) => {
    if (!nesBrowser) return;
    const button = keyMap[e.key];
    if (button !== undefined) {
      e.preventDefault();
      e.stopPropagation();

      // Dismiss overlay prompt on any keyboard interaction
      const promptEl = document.getElementById('emuScreenStartPrompt');
      if (promptEl && promptEl.style.display !== 'none') {
        promptEl.style.display = 'none';
      }

      nesBrowser.nes.buttonDown(1, button);
    }
  };

  const onKeyUp = (e) => {
    if (!nesBrowser) return;
    const button = keyMap[e.key];
    if (button !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      nesBrowser.nes.buttonUp(1, button);
    }
  };

  // Clean up any old listeners on window
  window.removeEventListener('keydown', window._emuKeyDown, true);
  window.removeEventListener('keyup', window._emuKeyUp, true);

  // Store references on window for later cleanup
  window._emuKeyDown = onKeyDown;
  window._emuKeyUp = onKeyUp;

  // Register capture-phase listeners (third argument true)
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
}
