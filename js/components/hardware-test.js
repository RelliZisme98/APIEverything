/* js/components/hardware-test.js */

let activeTab = 'keyboard';
let pressedKeys = new Set();
let testedKeys = new Set();
let mouseCanvas, mouseCtx, isDrawing = false;
let lastMousePos = null;
let mousePointsCount = 0;
let mouseHzTimer = null;
let lastHzCalculationTime = 0;
let currentPollingRate = 0;

// Audio Context for headphones test
let audioCtx = null;
let oscillator = null;
let pannerNode = null;
let isAudioPlaying = false;
let micStream = null;
let micAnalyser = null;
let micAnimationId = null;

// Gamepad loop
let gamepadAnimId = null;
let currentGamepadSkin = 'xbox';
let currentKeyboardLayout = 'tkl';

// Screen & FPS variables
let fpsLastTime = performance.now();
let fpsFrames = 0;
let screenActive = false;
let fpsLoopId = null;

// Camera variables
let cameraStream = null;

const GAMEPAD_SKINS = {
  xbox: {
    name: 'Xbox (A/B/X/Y)',
    buttons: {
      0: 'A', 1: 'B', 2: 'X', 3: 'Y',
      4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
      8: 'Back', 9: 'Start',
      10: 'L3 / L-Stick', 11: 'R3 / R-Stick',
      12: 'D-Pad Lên', 13: 'D-Pad Xuống', 14: 'D-Pad Trái', 15: 'D-Pad Phải'
    }
  },
  ps: {
    name: 'PlayStation (✖/🔴/⬛/🔺)',
    buttons: {
      0: '✖ Cross', 1: '🔴 Circle', 2: '⬛ Square', 3: '🔺 Triangle',
      4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2',
      8: 'Share', 9: 'Options',
      10: 'L3 / L-Stick', 11: 'R3 / R-Stick',
      12: 'D-Pad Lên', 13: 'D-Pad Xuống', 14: 'D-Pad Trái', 15: 'D-Pad Phải'
    }
  },
  switch: {
    name: 'Nintendo Switch (B/A/Y/X)',
    buttons: {
      0: 'B', 1: 'A', 2: 'Y', 3: 'X',
      4: 'L', 5: 'R', 6: 'ZL', 7: 'ZR',
      8: 'Minus (-)', 9: 'Plus (+)',
      10: 'L-Stick', 11: 'R-Stick',
      12: 'D-Pad Lên', 13: 'D-Pad Xuống', 14: 'D-Pad Trái', 15: 'D-Pad Phải'
    }
  }
};

// ─── KEYBOARD LAYOUT DATA ──────────────────────────────────────────────────
const KEYBOARD_LAYOUT_MAIN = [
  // Row 0 (F-row)
  [
    { code: 'Escape', label: 'Esc' },
    { code: 'F1', label: 'F1' }, { code: 'F2', label: 'F2' }, { code: 'F3', label: 'F3' }, { code: 'F4', label: 'F4' },
    { code: 'Spacer1', label: '', class: 'spacer', style: 'width:15px;' },
    { code: 'F5', label: 'F5' }, { code: 'F6', label: 'F6' }, { code: 'F7', label: 'F7' }, { code: 'F8', label: 'F8' },
    { code: 'Spacer2', label: '', class: 'spacer', style: 'width:15px;' },
    { code: 'F9', label: 'F9' }, { code: 'F10', label: 'F10' }, { code: 'F11', label: 'F11' }, { code: 'F12', label: 'F12' }
  ],
  // Row 1
  [
    { code: 'Backquote', label: '~' },
    { code: 'Digit1', label: '1' }, { code: 'Digit2', label: '2' }, { code: 'Digit3', label: '3' }, { code: 'Digit4', label: '4' },
    { code: 'Digit5', label: '5' }, { code: 'Digit6', label: '6' }, { code: 'Digit7', label: '7' }, { code: 'Digit8', label: '8' },
    { code: 'Digit9', label: '9' }, { code: 'Digit0', label: '0' }, { code: 'Minus', label: '-' }, { code: 'Equal', label: '=' },
    { code: 'Backspace', label: 'Backspace', class: 'key-backspace' }
  ],
  // Row 2
  [
    { code: 'Tab', label: 'Tab', class: 'key-tab' },
    { code: 'KeyQ', label: 'Q' }, { code: 'KeyW', label: 'W' }, { code: 'KeyE', label: 'E' }, { code: 'KeyR', label: 'R' },
    { code: 'KeyT', label: 'T' }, { code: 'KeyY', label: 'Y' }, { code: 'KeyU', label: 'U' }, { code: 'KeyI', label: 'I' },
    { code: 'KeyO', label: 'O' }, { code: 'KeyP', label: 'P' }, { code: 'BracketLeft', label: '[' }, { code: 'BracketRight', label: ']' },
    { code: 'Backslash', label: '\\', class: 'key-backslash' }
  ],
  // Row 3
  [
    { code: 'CapsLock', label: 'Caps Lock', class: 'key-capslock' },
    { code: 'KeyA', label: 'A' }, { code: 'KeyS', label: 'S' }, { code: 'KeyD', label: 'D' }, { code: 'KeyF', label: 'F' },
    { code: 'KeyG', label: 'G' }, { code: 'KeyH', label: 'H' }, { code: 'KeyJ', label: 'J' }, { code: 'KeyK', label: 'K' },
    { code: 'KeyL', label: 'L' }, { code: 'Semicolon', label: ';' }, { code: 'Quote', label: '\'' },
    { code: 'Enter', label: 'Enter', class: 'key-enter' }
  ],
  // Row 4
  [
    { code: 'ShiftLeft', label: 'Shift', class: 'key-shift-l' },
    { code: 'KeyZ', label: 'Z' }, { code: 'KeyX', label: 'X' }, { code: 'KeyC', label: 'C' }, { code: 'KeyV', label: 'V' },
    { code: 'KeyB', label: 'B' }, { code: 'KeyN', label: 'N' }, { code: 'KeyM', label: 'M' }, { code: 'Comma', label: ',' },
    { code: 'Period', label: '.' }, { code: 'Slash', label: '/' },
    { code: 'ShiftRight', label: 'Shift', class: 'key-shift-r' }
  ],
  // Row 5
  [
    { code: 'ControlLeft', label: 'Ctrl', class: 'key-ctrl' },
    { code: 'MetaLeft', label: 'Win', class: 'key-win' },
    { code: 'AltLeft', label: 'Alt', class: 'key-alt' },
    { code: 'Space', label: 'Space', class: 'key-space' },
    { code: 'AltRight', label: 'Alt', class: 'key-alt' },
    { code: 'MetaRight', label: 'Win', class: 'key-win' },
    { code: 'ContextMenu', label: 'Menu', class: 'key-fn' },
    { code: 'ControlRight', label: 'Ctrl', class: 'key-ctrl' }
  ]
];

const KEYBOARD_LAYOUT_NAV = [
  // Row 0
  { code: 'PrintScreen', label: 'PrtSc' }, { code: 'ScrollLock', label: 'ScrLk' }, { code: 'Pause', label: 'Pause' },
  // Row 1
  { code: 'Insert', label: 'Ins' }, { code: 'Home', label: 'Home' }, { code: 'PageUp', label: 'PgUp' },
  // Row 2
  { code: 'Delete', label: 'Del' }, { code: 'End', label: 'End' }, { code: 'PageDown', label: 'PgDn' },
  // Row 3 (Spacers)
  { code: 'Spacer3', label: '', class: 'spacer' }, { code: 'Spacer4', label: '', class: 'spacer' }, { code: 'Spacer5', label: '', class: 'spacer' },
  // Row 4
  { code: 'Spacer6', label: '', class: 'spacer' }, { code: 'ArrowUp', label: '▲' }, { code: 'Spacer7', label: '', class: 'spacer' },
  // Row 5
  { code: 'ArrowLeft', label: '◀' }, { code: 'ArrowDown', label: '▼' }, { code: 'ArrowRight', label: '▶' }
];

const KEYBOARD_LAYOUT_NUMPAD = [
  // Row 0
  { code: 'Spacer8', label: '', class: 'spacer' }, { code: 'Spacer9', label: '', class: 'spacer' }, { code: 'Spacer10', label: '', class: 'spacer' }, { code: 'Spacer11', label: '', class: 'spacer' },
  // Row 1
  { code: 'NumLock', label: 'Num' }, { code: 'NumpadDivide', label: '/' }, { code: 'NumpadMultiply', label: '*' }, { code: 'NumpadSubtract', label: '-' },
  // Row 2
  { code: 'Numpad7', label: '7' }, { code: 'Numpad8', label: '8' }, { code: 'Numpad9', label: '9' }, { code: 'NumpadAdd', label: '+', class: 'key-numpad-add' },
  // Row 3
  { code: 'Numpad4', label: '4' }, { code: 'Numpad5', label: '5' }, { code: 'Numpad6', label: '6' },
  // Row 4
  { code: 'Numpad1', label: '1' }, { code: 'Numpad2', label: '2' }, { code: 'Numpad3', label: '3' }, { code: 'NumpadEnter', label: 'Enter', class: 'key-numpad-enter' },
  // Row 5
  { code: 'Numpad0', label: '0', class: 'key-numpad-zero' }, { code: 'NumpadDecimal', label: '.' }
];

export function renderHardwareTest() {
  const container = document.getElementById('hardwareTestContent');
  if (!container) return;

  container.innerHTML = `
    <div class="test-container">
      <!-- Left Navigation -->
      <div class="test-nav">
        <button class="test-nav-btn active" data-tab="keyboard">
          <i class="fas fa-keyboard"></i> Bàn Phím
        </button>
        <button class="test-nav-btn" data-tab="mouse">
          <i class="fas fa-mouse"></i> Chuột
        </button>
        <button class="test-nav-btn" data-tab="audio">
          <i class="fas fa-headphones"></i> Tai Nghe & Mic
        </button>
        <button class="test-nav-btn" data-tab="screen">
          <i class="fas fa-desktop"></i> Màn Hình & FPS
        </button>
        <button class="test-nav-btn" data-tab="camera">
          <i class="fas fa-camera"></i> Camera (Webcam)
        </button>
        <button class="test-nav-btn" data-tab="battery">
          <i class="fas fa-battery-three-quarters"></i> Pin & Sạc
        </button>
        <button class="test-nav-btn" data-tab="gamepad">
          <i class="fas fa-gamepad"></i> Tay Cầm (Gamepad)
        </button>
        <button class="test-nav-btn" data-tab="system">
          <i class="fas fa-info-circle"></i> Cấu Hình Hệ Thống
        </button>
      </div>

      <!-- Right Panel Area -->
      <div class="test-content-area">
        
        <!-- KEYBOARD PANEL -->
        <div class="test-panel active" id="panel-keyboard">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
            <div>
              <h3 style="margin:0; font-size:18px; color:var(--text-primary);">Kiểm Tra Bàn Phím</h3>
              <p style="margin:4px 0 0 0; font-size:12px; color:var(--text-muted);">
                Nhấn các phím trên bàn phím vật lý để kiểm tra. Các phím tắt trình duyệt đã được vô hiệu hóa tạm thời.
              </p>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <label style="font-size:12px; color:var(--text-muted);">Layout:</label>
              <select id="select-keyboard-layout" class="audio-btn" style="flex:none; padding:4px 8px; font-size:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text-primary); border-radius:8px;">
                <option value="tkl" ${currentKeyboardLayout === 'tkl' ? 'selected' : ''}>Tenkeyless (80%)</option>
                <option value="full" ${currentKeyboardLayout === 'full' ? 'selected' : ''}>Full Size (100%)</option>
                <option value="compact" ${currentKeyboardLayout === 'compact' ? 'selected' : ''}>Compact (60%)</option>
              </select>
              <button id="btn-reset-keyboard" class="audio-btn" style="flex:none; padding:6px 12px; font-size:12px;">
                <i class="fas fa-redo"></i> Reset Test
              </button>
            </div>
          </div>
          
          <div id="keyboard-layout-container">
            <!-- Rendered via JS -->
          </div>
          
          <div style="margin-top:15px; font-size:12px; color:var(--text-muted); display:flex; gap:15px;">
            <div>Phím đang nhấn: <span id="active-key-text" style="color:var(--accent-blue); font-weight:bold;">Không có</span></div>
            <div>Lịch sử phím: <span id="history-key-text" style="color:var(--text-secondary);">Trống</span></div>
          </div>

          <!-- Helpful troubleshooting notes -->
          <div style="margin-top:20px; padding:12px 16px; background:rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-radius:12px; font-size:12px; color:var(--text-muted); line-height:1.6;">
            <div style="font-weight:600; color:var(--text-secondary); margin-bottom:6px;"><i class="fas fa-info-circle"></i> Hướng dẫn khắc phục lỗi nhận diện phím:</div>
            <ul style="margin:0; padding-left:20px;">
              <li><b>Phím chức năng F1-F12:</b> Trên một số máy tính xách tay (Laptop), bạn cần nhấn giữ thêm phím <b>Fn</b> (ví dụ: <code>Fn + F12</code>) để kích hoạt đúng phím F12. Nếu không, phím sẽ hoạt động như nút tăng giảm âm lượng/độ sáng của hệ điều hành.</li>
              <li><b>Phím Chụp Màn Hình (PrtSc):</b> Do hệ điều hành (Windows/Linux) chiếm quyền ưu tiên cao nhất để chụp ảnh, trình duyệt có thể không nhận diện được sự kiện bấm phím này.</li>
              <li><b>Phím F12 mở Console:</b> Trình duyệt có mức ưu tiên cực cao cho phím F12. Để kiểm tra phím F12 mà không bị mở bảng điều khiển, hãy đảm bảo cửa sổ trình duyệt đang được chọn (focus) trước khi nhấn.</li>
            </ul>
          </div>
        </div>

        <!-- MOUSE PANEL -->
        <div class="test-panel" id="panel-mouse">
          <h3 style="margin:0 0 5px 0; font-size:18px; color:var(--text-primary);">Kiểm Tra Chuột</h3>
          <p style="margin:0 0 15px 0; font-size:12px; color:var(--text-muted);">
            Click chuột vào các khu vực chỉ định, cuộn bánh xe hoặc di chuyển trong bảng vẽ để đo độ nhạy và polling rate.
          </p>

          <div class="mouse-test-wrapper">
            <!-- Left: Click Indicator Grid -->
            <div class="mouse-buttons-grid">
              <div class="mouse-btn-indicator" id="mouse-left">Click Trái</div>
              <div class="mouse-btn-indicator" id="mouse-right">Click Phải</div>
              <div class="mouse-btn-indicator" id="mouse-middle">Click Giữa</div>
              <div class="mouse-btn-indicator" id="mouse-back">Back (M4)</div>
              <div class="mouse-btn-indicator" id="mouse-forward">Forward (M5)</div>
              
              <div class="mouse-wheel-box" id="mouse-wheel-area">
                <div style="text-align:center;">
                  <div class="mouse-wheel-arrow" id="wheel-up-arrow"><i class="fas fa-chevron-up"></i></div>
                  <div style="font-size:11px; font-weight:bold; margin:4px 0;">Cuộn Chuột</div>
                  <div class="mouse-wheel-arrow" id="wheel-down-arrow"><i class="fas fa-chevron-down"></i></div>
                </div>
              </div>
              
              <div style="grid-column: span 2; padding:10px; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.05); border-radius:10px; font-size:12px; color:var(--text-muted); line-height:1.5;">
                Double Click Speed: <span id="double-click-speed" style="color:var(--accent-green); font-weight:bold;">0 ms</span><br>
                Tốc độ phản hồi (Hz): <span id="mouse-polling-rate" style="color:var(--accent-blue); font-weight:bold;">0 Hz</span>
              </div>
            </div>

            <!-- Right: Drawing area for testing tracking -->
            <div class="mouse-canvas-area" id="mouse-canvas-container">
              <div class="mouse-canvas-info">
                Di chuột vẽ để kiểm tra độ trơn tru và Polling Rate. Nhấn giữ chuột để vẽ nét đậm hơn.
              </div>
              <canvas id="mouse-test-canvas" style="width:100%; height:100%; display:block;"></canvas>
            </div>
          </div>
        </div>

        <!-- AUDIO PANEL -->
        <div class="test-panel" id="panel-audio">
          <h3 style="margin:0 0 5px 0; font-size:18px; color:var(--text-primary);">Kiểm Tra Âm Thanh & Tai Nghe</h3>
          <p style="margin:0 0 15px 0; font-size:12px; color:var(--text-muted);">
            Kiểm tra kênh trái/phải của tai nghe, dải tần số âm thanh và ghi âm thử microphone của bạn.
          </p>

          <div class="audio-test-grid">
            <!-- Left: Headphones test -->
            <div class="audio-card">
              <h4 style="margin:0 0 10px 0; font-size:14px; color:var(--text-primary);">Kênh Tai Nghe (Stereo L/R)</h4>
              <div class="audio-channels">
                <button class="audio-btn" id="btn-audio-left"><i class="fas fa-volume-down"></i> Bên Trái (L)</button>
                <button class="audio-btn" id="btn-audio-right"><i class="fas fa-volume-up"></i> Bên Phải (R)</button>
              </div>
              <button class="audio-btn" id="btn-audio-both" style="background:rgba(255,255,255,0.04);"><i class="fas fa-volume-mute"></i> Phát Cả Hai</button>
              
              <div style="margin-top:10px;">
                <label style="font-size:12px; color:var(--text-muted); display:flex; justify-content:space-between; margin-bottom:5px;">
                  <span>Tần số âm thử: <b id="audio-freq-val">440 Hz</b></span>
                </label>
                <input type="range" id="audio-freq-slider" min="100" max="2000" value="440" style="width:100%;">
              </div>
            </div>

            <!-- Right: Microphone test -->
            <div class="audio-card">
              <h4 style="margin:0 0 10px 0; font-size:14px; color:var(--text-primary);">Kiểm Tra Microphone</h4>
              <button class="audio-btn" id="btn-mic-toggle" style="background:rgba(239, 68, 68, 0.1); border-color:rgba(239, 68, 68, 0.2); color:#f87171;">
                <i class="fas fa-microphone"></i> Bắt đầu thử Mic
              </button>
              
              <div style="margin-top:10px;">
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:5px;">Âm lượng microphone đầu vào:</div>
                <div class="audio-mic-visualizer">
                  <div class="mic-bar" id="mic-volume-bar"></div>
                </div>
              </div>
              <p style="margin:5px 0 0 0; font-size:11px; color:var(--text-muted); line-height:1.4;">
                Cần cấp quyền truy cập microphone cho trình duyệt để sử dụng tính năng này.
              </p>
            </div>
          </div>
        </div>

        <!-- SCREEN PANEL -->
        <div class="test-panel" id="panel-screen">
          <h3 style="margin:0 0 5px 0; font-size:18px; color:var(--text-primary);">Kiểm Tra Màn Hình & Tần Số Quét</h3>
          <p style="margin:0 0 15px 0; font-size:12px; color:var(--text-muted);">
            Xem thông số màn hình, đo tần số quét (FPS) thực tế và kiểm tra điểm chết (Dead Pixel).
          </p>

          <div class="audio-test-grid">
            <!-- Screen Specs and FPS -->
            <div class="audio-card">
              <h4 style="margin:0 0 10px 0; font-size:14px; color:var(--text-primary);">Thông Số & Tần Số Quét (FPS)</h4>
              <div class="battery-info-text" style="margin-bottom:15px;">
                <div class="battery-stat-row">
                  <span style="color:var(--text-muted);">Độ phân giải màn hình:</span>
                  <span id="screen-res-val" style="font-weight:700; color:var(--text-primary);">--</span>
                </div>
                <div class="battery-stat-row">
                  <span style="color:var(--text-muted);">Tỷ lệ pixel (DPR):</span>
                  <span id="screen-dpr-val" style="color:var(--text-secondary);">--</span>
                </div>
                <div class="battery-stat-row">
                  <span style="color:var(--text-muted);">Độ sâu màu sắc:</span>
                  <span id="screen-colors-val" style="color:var(--text-secondary);">--</span>
                </div>
              </div>

              <div style="text-align:center; padding:20px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:12px;">
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:5px;">Tần số quét màn hình (FPS):</div>
                <div id="screen-fps-val" style="font-size:36px; font-weight:800; color:var(--accent-blue);">-- Hz</div>
              </div>
            </div>

            <!-- Dead Pixel Test -->
            <div class="audio-card" style="display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <h4 style="margin:0 0 10px 0; font-size:14px; color:var(--text-primary);">Kiểm Tra Điểm Chết (Dead Pixel)</h4>
                <p style="margin:0 0 15px 0; font-size:12px; color:var(--text-muted); line-height:1.5;">
                  Màn hình sẽ hiển thị toàn bộ các màu đơn sắc (Trắng, Đen, Đỏ, Xanh lá, Xanh dương). Bạn hãy quan sát kỹ xem có điểm màu nào bất thường (bị tắt hoặc sai màu) không.
                </p>
              </div>
              <button class="audio-btn" id="btn-start-deadpixel" style="background:linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); border:none; color:white; font-weight:600; padding:12px;">
                <i class="fas fa-expand"></i> Bắt đầu Test Điểm Chết
              </button>
            </div>
          </div>
        </div>

        <!-- CAMERA PANEL -->
        <div class="test-panel" id="panel-camera">
          <h3 style="margin:0 0 5px 0; font-size:18px; color:var(--text-primary);">Kiểm Tra Camera (Webcam)</h3>
          <p style="margin:0 0 15px 0; font-size:12px; color:var(--text-muted);">
            Cấp quyền để kiểm tra hình ảnh và độ phân giải của camera thiết bị.
          </p>

          <div style="display:flex; flex-direction:column; gap:15px; align-items:center;">
            <div style="width:100%; max-width:480px; aspect-ratio:4/3; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:14px; overflow:hidden; position:relative; display:flex; justify-content:center; align-items:center;">
              <video id="webcam-preview" autoplay playsinline style="width:100%; height:100%; object-fit:cover; display:none;"></video>
              <div id="webcam-placeholder" style="text-align:center; padding:20px; color:var(--text-muted);">
                <i class="fas fa-camera" style="font-size:48px; color:rgba(255,255,255,0.15); margin-bottom:15px; display:block;"></i>
                <span>Chưa kích hoạt camera</span>
              </div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; width:100%;">
              <button class="audio-btn" id="btn-camera-toggle" style="background:rgba(96,165,250,0.1); border-color:rgba(96,165,250,0.2); color:var(--accent-blue);">
                <i class="fas fa-video"></i> Bật Camera
              </button>
              <div id="camera-info" style="font-size:12px; color:var(--text-muted); align-self:center; display:none;">
                Độ phân giải thực tế: <span id="camera-resolution-val" style="color:var(--text-secondary); font-weight:600;">--</span>
              </div>
            </div>
          </div>
        </div>

        <!-- BATTERY PANEL -->
        <div class="test-panel" id="panel-battery">
          <h3 style="margin:0 0 5px 0; font-size:18px; color:var(--text-primary);">Kiểm Tra Pin & Sạc</h3>
          <p style="margin:0 0 15px 0; font-size:12px; color:var(--text-muted);">
            Kiểm tra mức độ pin, trạng thái cắm sạc nguồn và thời gian hoạt động còn lại của thiết bị.
          </p>

          <div class="battery-status-wrap">
            <!-- Battery Icon Graphic -->
            <div class="battery-visual" id="battery-box">
              <div class="battery-level-fill" id="battery-fill" style="height: 100%;"></div>
            </div>

            <!-- Battery Information Details -->
            <div class="battery-info-text">
              <div class="battery-stat-row">
                <span style="color:var(--text-muted);">Mức Pin Hiện Tại:</span>
                <span id="battery-level-val" style="font-weight:700; color:var(--accent-green);">100%</span>
              </div>
              <div class="battery-stat-row">
                <span style="color:var(--text-muted);">Trạng Thái Sạc:</span>
                <span id="battery-charging-val" style="font-weight:700; color:var(--text-primary);">Đang dùng pin</span>
              </div>
              <div class="battery-stat-row">
                <span style="color:var(--text-muted);">Thời gian sạc đầy:</span>
                <span id="battery-charge-time" style="color:var(--text-secondary);">--</span>
              </div>
              <div class="battery-stat-row">
                <span style="color:var(--text-muted);">Thời gian sử dụng còn lại:</span>
                <span id="battery-discharge-time" style="color:var(--text-secondary);">--</span>
              </div>
            </div>
          </div>
        </div>

        <!-- GAMEPAD PANEL -->
        <div class="test-panel" id="panel-gamepad">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
            <div>
              <h3 style="margin:0; font-size:18px; color:var(--text-primary);">Kiểm Tra Tay Cầm (Gamepad)</h3>
              <p style="margin:4px 0 0 0; font-size:12px; color:var(--text-muted);">
                Kết nối tay cầm chơi game qua cổng USB hoặc Bluetooth, sau đó nhấn bất kỳ nút nào để bắt đầu kiểm tra.
              </p>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <label style="font-size:12px; color:var(--text-muted);">Giao diện nút:</label>
              <select id="select-gamepad-skin" class="audio-btn" style="flex:none; padding:4px 8px; font-size:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text-primary); border-radius:8px;">
                <option value="xbox" ${currentGamepadSkin === 'xbox' ? 'selected' : ''}>Xbox (A/B/X/Y)</option>
                <option value="ps" ${currentGamepadSkin === 'ps' ? 'selected' : ''}>PlayStation (✖/🔴/⬛/🔺)</option>
                <option value="switch" ${currentGamepadSkin === 'switch' ? 'selected' : ''}>Nintendo Switch (B/A/Y/X)</option>
              </select>
            </div>
          </div>

          <div id="gamepad-disconnected-msg" class="gamepad-connect-status">
            <i class="fas fa-gamepad" style="font-size:48px; color:rgba(255,255,255,0.15); margin-bottom:15px; display:block;"></i>
            <span style="font-weight:600; color:var(--text-secondary);">Chưa phát hiện tay cầm nào được kết nối</span><br>
            <span style="font-size:12px; color:var(--text-muted); margin-top:6px; display:inline-block;">
              Hãy cắm tay cầm hoặc kết nối Bluetooth và bấm một nút bất kỳ trên tay cầm để kích hoạt thiết bị.
            </span>
          </div>

          <div id="gamepad-connected-area" style="display:none;">
            <div style="padding:12px; background:rgba(96,165,250,0.1); border:1px solid rgba(96,165,250,0.2); border-radius:10px; margin-bottom:20px; font-size:13px; font-weight:600; color:var(--accent-blue);" id="gamepad-model-name">
              Thiết bị: Gamepad không xác định
            </div>

            <div class="gamepad-visualizer">
              <!-- Left Analog & D-pad -->
              <div class="gamepad-column">
                <h4 style="margin:0 0 10px 0; font-size:13px; text-align:center;">Cần Trái & D-Pad</h4>
                <div class="analog-stick-box">
                  <div class="analog-stick-dot" id="gamepad-stick-left"></div>
                </div>
                <div style="font-size:11px; text-align:center; color:var(--text-muted);" id="gamepad-axes-left">X: 0.00 | Y: 0.00</div>
                
                <div style="margin-top:15px; display:flex; flex-direction:column; gap:5px;">
                  <div class="gamepad-btn-indicator" id="gp-btn-12">D-Pad Lên</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-13">D-Pad Xuống</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-14">D-Pad Trái</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-15">D-Pad Phải</div>
                </div>
              </div>

              <!-- Main Buttons & Triggers -->
              <div class="gamepad-column" style="grid-column: span 1;">
                <h4 style="margin:0 0 10px 0; font-size:13px; text-align:center;">Phím Chức Năng</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                  <div class="gamepad-btn-indicator" id="gp-btn-0">A</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-1">B</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-2">X</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-3">Y</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-4">LB</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-5">RB</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-6">LT</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-7">RT</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-8">Back</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-9">Start</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-10">L3 / L-Stick</div>
                  <div class="gamepad-btn-indicator" id="gp-btn-11">R3 / R-Stick</div>
                </div>
                
                <button class="audio-btn" id="btn-gamepad-vibrate" style="margin-top:15px; background:rgba(168, 85, 247, 0.1); border-color:rgba(168, 85, 247, 0.2); color:#c084fc;">
                  <i class="fas fa-bullseye"></i> Rung thử Tay Cầm (Vibrate)
                </button>
              </div>

              <!-- Right Analog -->
              <div class="gamepad-column">
                <h4 style="margin:0 0 10px 0; font-size:13px; text-align:center;">Cần Phải</h4>
                <div class="analog-stick-box">
                  <div class="analog-stick-dot" id="gamepad-stick-right"></div>
                </div>
                <div style="font-size:11px; text-align:center; color:var(--text-muted);" id="gamepad-axes-right">X: 0.00 | Y: 0.00</div>
              </div>
            </div>
          </div>
        </div>

        <!-- SYSTEM PANEL -->
        <div class="test-panel" id="panel-system">
          <h3 style="margin:0 0 5px 0; font-size:18px; color:var(--text-primary);">Thông Tin Cấu Hinh Hệ Thống</h3>
          <p style="margin:0 0 15px 0; font-size:12px; color:var(--text-muted);">
            Thông tin chi tiết về cấu hình phần cứng, trình duyệt và kết nối mạng của thiết bị.
          </p>

          <div class="audio-test-grid">
            <!-- Hardware Specs -->
            <div class="audio-card">
              <h4 style="margin:0 0 10px 0; font-size:14px; color:var(--text-primary);"><i class="fas fa-microchip"></i> Phần Cứng & Đồ Họa</h4>
              <div class="battery-info-text">
                <div class="battery-stat-row">
                  <span style="color:var(--text-muted);">Số nhân CPU (Threads):</span>
                  <span id="sys-cpu-val" style="font-weight:700; color:var(--text-primary);">--</span>
                </div>
                <div class="battery-stat-row">
                  <span style="color:var(--text-muted);">Bộ nhớ RAM (Ước lượng):</span>
                  <span id="sys-ram-val" style="font-weight:700; color:var(--text-primary);">--</span>
                </div>
                <div class="battery-stat-row">
                  <span style="color:var(--text-muted);">Card đồ họa (GPU):</span>
                  <span id="sys-gpu-val" style="color:var(--text-secondary); word-break:break-all; text-align:right;">--</span>
                </div>
                <div class="battery-stat-row">
                  <span style="color:var(--text-muted);">Công nghệ WebGL:</span>
                  <span id="sys-webgl-val" style="color:var(--text-secondary);">--</span>
                </div>
              </div>
            </div>

            <!-- OS & Network Specs -->
            <div class="audio-card">
              <h4 style="margin:0 0 10px 0; font-size:14px; color:var(--text-primary);"><i class="fas fa-network-wired"></i> Phần Mềm & Mạng</h4>
              <div class="battery-info-text">
                <div class="battery-stat-row">
                  <span style="color:var(--text-muted);">Hệ điều hành:</span>
                  <span id="sys-os-val" style="font-weight:700; color:var(--text-primary);">--</span>
                </div>
                <div class="battery-stat-row">
                  <span style="color:var(--text-muted);">Trình duyệt:</span>
                  <span id="sys-browser-val" style="color:var(--text-secondary);">--</span>
                </div>
                <div class="battery-stat-row">
                  <span style="color:var(--text-muted);">Băng thông mạng:</span>
                  <span id="sys-net-downlink" style="color:var(--text-secondary);">--</span>
                </div>
                <div class="battery-stat-row">
                  <span style="color:var(--text-muted);">Độ trễ (RTT):</span>
                  <span id="sys-net-rtt" style="color:var(--text-secondary);">--</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  // Init sections
  initTabs();
  initKeyboardTest();
  initMouseTest();
  initAudioTest();
  initScreenTest();
  initCameraTest();
  initBatteryTest();
  initGamepadTest();
  initSystemTest();
}

function initTabs() {
  const tabs = document.querySelectorAll('.test-nav-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const targetTab = tab.dataset.tab;
      activeTab = targetTab;
      
      document.querySelectorAll('.test-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('panel-' + targetTab).classList.add('active');

      // Specific tab triggers/cleanups
      if (targetTab === 'mouse') {
        setTimeout(resizeMouseCanvas, 50);
      } else {
        stopMicrophone();
      }

      if (targetTab === 'gamepad') {
        startGamepadLoop();
      } else {
        stopGamepadLoop();
      }

      if (targetTab === 'keyboard') {
        setTimeout(scaleKeyboard, 50);
      }

      if (targetTab === 'screen') {
        initScreenStats();
        startFpsLoop();
      } else {
        stopFpsLoop();
      }

      if (targetTab === 'system') {
        initSystemTest();
      }

      if (targetTab !== 'camera') {
        if (cameraStream) {
          toggleCamera();
        }
      }
    });
  });
}

function scaleKeyboard() {
  const wrapper = document.querySelector('.keyboard-wrapper');
  const container = document.getElementById('keyboard-layout-container');
  if (!wrapper || !container) return;

  // Reset to measure natural size
  wrapper.style.transform = 'none';
  wrapper.style.transformOrigin = 'top left';
  container.style.height = 'auto';

  const containerWidth = container.clientWidth;
  const wrapperWidth = wrapper.scrollWidth;

  if (wrapperWidth > containerWidth && containerWidth > 0) {
    const scale = containerWidth / wrapperWidth;
    wrapper.style.transform = `scale(${scale})`;
    container.style.height = `${wrapper.offsetHeight * scale}px`;
  } else {
    container.style.height = 'auto';
  }
}

// ─── KEYBOARD TEST LOGIC ──────────────────────────────────────────────────────
function drawKeyboard() {
  const container = document.getElementById('keyboard-layout-container');
  if (!container) return;

  let html = `<div class="keyboard-wrapper">`;

  // 1. Main Block
  html += `<div class="keyboard-main-block">`;
  const startRow = (currentKeyboardLayout === 'compact') ? 1 : 0;
  
  for (let r = startRow; r < KEYBOARD_LAYOUT_MAIN.length; r++) {
    html += `<div class="keyboard-row">`;
    KEYBOARD_LAYOUT_MAIN[r].forEach((key, idx) => {
      let code = key.code;
      let label = key.label;
      let keyClass = key.class || '';

      // In 60%, the top-left key is Esc, and there is no F-row
      if (currentKeyboardLayout === 'compact' && r === 1 && idx === 0) {
        code = 'Escape';
        label = 'Esc';
      }

      // Restore tested/pressed states
      if (pressedKeys.has(code)) keyClass += ' pressed';
      if (testedKeys.has(code)) keyClass += ' tested';

      const styleAttr = key.style ? `style="${key.style}"` : '';
      html += `<div class="key-cap ${keyClass}" id="kb-${code}" ${styleAttr}>${label}</div>`;
    });
    html += `</div>`;
  }
  html += `</div>`; // end main-block

  // 2. Navigation Block (Only for TKL and Full Size)
  if (currentKeyboardLayout === 'tkl' || currentKeyboardLayout === 'full') {
    html += `<div class="keyboard-nav-block">`;
    KEYBOARD_LAYOUT_NAV.forEach(key => {
      let keyClass = key.class || '';
      if (pressedKeys.has(key.code)) keyClass += ' pressed';
      if (testedKeys.has(key.code)) keyClass += ' tested';

      html += `<div class="key-cap ${keyClass}" id="kb-${key.code}">${key.label}</div>`;
    });
    html += `</div>`;
  }

  // 3. Numpad Block (Only for Full Size)
  if (currentKeyboardLayout === 'full') {
    html += `<div class="keyboard-numpad-block">`;
    KEYBOARD_LAYOUT_NUMPAD.forEach(key => {
      let keyClass = key.class || '';
      if (pressedKeys.has(key.code)) keyClass += ' pressed';
      if (testedKeys.has(key.code)) keyClass += ' tested';

      html += `<div class="key-cap ${keyClass}" id="kb-${key.code}">${key.label}</div>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;
  
  // Trigger auto-scaling
  setTimeout(scaleKeyboard, 0);
}

function initKeyboardTest() {
  drawKeyboard();

  // Switch layout event
  const layoutSelect = document.getElementById('select-keyboard-layout');
  if (layoutSelect) {
    layoutSelect.addEventListener('change', (e) => {
      currentKeyboardLayout = e.target.value;
      drawKeyboard();
    });
  }

  // Event Listeners - USE CAPTURE PHASE (true) to intercept before browser/OS shortcuts
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keyup', handleKeyUp, true);
  
  // Scale on window resize
  window.addEventListener('resize', scaleKeyboard);

  document.getElementById('btn-reset-keyboard').addEventListener('click', () => {
    testedKeys.clear();
    pressedKeys.clear();
    document.querySelectorAll('.key-cap').forEach(el => {
      el.className = el.className.replace('tested', '').replace('pressed', '').trim();
    });
    document.getElementById('active-key-text').innerText = 'Không có';
    document.getElementById('history-key-text').innerText = 'Trống';
  });
}

function handleKeyDown(e) {
  // Only intercept keys when Keyboard Tab is active and hardware-test section is visible
  const section = document.getElementById('section-hardware-test');
  if (!section || !section.classList.contains('active')) return;
  if (activeTab !== 'keyboard') return;
  
  // Prevent browser shortcuts (like F5, F11, Ctrl+P, Backspace, Space, etc.)
  e.preventDefault();
  e.stopPropagation();

  const code = e.code;
  pressedKeys.add(code);
  testedKeys.add(code);

  const keyEl = document.getElementById(`kb-${code}`);
  if (keyEl) {
    keyEl.classList.add('pressed');
    keyEl.classList.add('tested');
  }

  document.getElementById('active-key-text').innerText = code;
  
  // Keep last 8 keys in history
  const historyList = Array.from(testedKeys).slice(-8).join(', ');
  document.getElementById('history-key-text').innerText = historyList || 'Trống';
}

// Global keyup handler
function handleKeyUp(e) {
  const section = document.getElementById('section-hardware-test');
  if (!section || !section.classList.contains('active')) return;
  if (activeTab !== 'keyboard') return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const code = e.code;
  pressedKeys.delete(code);

  const keyEl = document.getElementById(`kb-${code}`);
  if (keyEl) {
    keyEl.classList.remove('pressed');
  }

  if (pressedKeys.size === 0) {
    document.getElementById('active-key-text').innerText = 'Không có';
  } else {
    document.getElementById('active-key-text').innerText = Array.from(pressedKeys).join(' + ');
  }
}

// ─── MOUSE TEST LOGIC ─────────────────────────────────────────────────────────
let lastLeftClickTime = 0;

function initMouseTest() {
  const canvas = document.getElementById('mouse-test-canvas');
  if (!canvas) return;

  mouseCanvas = canvas;
  mouseCtx = canvas.getContext('2d');

  // Prevent right-click context menu on canvas & mouse testing area
  const mousePanel = document.getElementById('panel-mouse');
  mousePanel.addEventListener('contextmenu', e => e.preventDefault());

  // Click indicators - mousedown on panel, mouseup on window to prevent stuck states
  mousePanel.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  
  // Mouse Wheel Scroll Test
  mousePanel.addEventListener('wheel', handleMouseWheel, { passive: false });

  // Canvas Drawing
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left click
      isDrawing = true;
      lastMousePos = getMousePos(canvas, e);
      drawDot(lastMousePos.x, lastMousePos.y, 4);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const pos = getMousePos(canvas, e);
    
    // Polling rate tracking
    mousePointsCount++;
    const now = performance.now();
    if (now - lastHzCalculationTime >= 1000) {
      currentPollingRate = Math.round((mousePointsCount * 1000) / (now - lastHzCalculationTime));
      const rateEl = document.getElementById('mouse-polling-rate');
      if (rateEl) rateEl.innerText = `${currentPollingRate} Hz`;
      mousePointsCount = 0;
      lastHzCalculationTime = now;
    }

    // Reset polling rate to 0 Hz after inactivity
    clearTimeout(mouseHzTimer);
    mouseHzTimer = setTimeout(() => {
      const rateEl = document.getElementById('mouse-polling-rate');
      if (rateEl) rateEl.innerText = '0 Hz';
    }, 500);

    if (isDrawing) {
      if (lastMousePos) {
        mouseCtx.beginPath();
        mouseCtx.moveTo(lastMousePos.x, lastMousePos.y);
        mouseCtx.lineTo(pos.x, pos.y);
        mouseCtx.strokeStyle = 'rgba(96, 165, 250, 0.8)';
        mouseCtx.lineWidth = 3;
        mouseCtx.lineCap = 'round';
        mouseCtx.stroke();
      }
    } else {
      // Just draw tracking dots to visualize precision
      drawDot(pos.x, pos.y, 1.5, 'rgba(168, 85, 247, 0.4)');
    }
    lastMousePos = pos;
  });

  window.addEventListener('mouseup', () => {
    isDrawing = false;
  });

  // Handle window resizing for canvas
  window.addEventListener('resize', resizeMouseCanvas);
}

function resizeMouseCanvas() {
  if (!mouseCanvas) return;
  const container = document.getElementById('mouse-canvas-container');
  if (!container) return;
  
  const newWidth = container.clientWidth;
  const newHeight = container.clientHeight;

  if (newWidth === 0 || newHeight === 0) return;

  // Only backup and restore if the current canvas has a valid size to prevent IndexSizeError
  if (mouseCanvas.width > 0 && mouseCanvas.height > 0) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = mouseCanvas.width;
    tempCanvas.height = mouseCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    try {
      tempCtx.drawImage(mouseCanvas, 0, 0);
      
      mouseCanvas.width = newWidth;
      mouseCanvas.height = newHeight;
      
      mouseCtx.drawImage(tempCanvas, 0, 0);
    } catch (e) {
      console.warn('Canvas backup failed during resize:', e);
      mouseCanvas.width = newWidth;
      mouseCanvas.height = newHeight;
    }
  } else {
    mouseCanvas.width = newWidth;
    mouseCanvas.height = newHeight;
  }
}

function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

function drawDot(x, y, radius, color = 'rgba(96, 165, 250, 0.8)') {
  mouseCtx.beginPath();
  mouseCtx.arc(x, y, radius, 0, 2 * Math.PI, false);
  mouseCtx.fillStyle = color;
  mouseCtx.fill();
}

function handleMouseDown(e) {
  if (activeTab !== 'mouse') return;
  e.preventDefault();

  // Highlight buttons
  if (e.button === 0) {
    document.getElementById('mouse-left').classList.add('active');
    
    // Double click speed calculation
    const now = performance.now();
    const diff = Math.round(now - lastLeftClickTime);
    if (diff < 500) {
      document.getElementById('double-click-speed').innerText = `${diff} ms`;
    }
    lastLeftClickTime = now;
  }
  if (e.button === 1) document.getElementById('mouse-middle').classList.add('active');
  if (e.button === 2) document.getElementById('mouse-right').classList.add('active');
  if (e.button === 3) document.getElementById('mouse-back').classList.add('active');
  if (e.button === 4) document.getElementById('mouse-forward').classList.add('active');
}

function handleMouseUp(e) {
  if (activeTab !== 'mouse') return;
  e.preventDefault();
  
  if (e.button === 0) {
    const el = document.getElementById('mouse-left');
    if (el) el.classList.remove('active');
  }
  if (e.button === 1) {
    const el = document.getElementById('mouse-middle');
    if (el) el.classList.remove('active');
  }
  if (e.button === 2) {
    const el = document.getElementById('mouse-right');
    if (el) el.classList.remove('active');
  }
  if (e.button === 3) {
    const el = document.getElementById('mouse-back');
    if (el) el.classList.remove('active');
  }
  if (e.button === 4) {
    const el = document.getElementById('mouse-forward');
    if (el) el.classList.remove('active');
  }
}

let wheelTimeout = null;
function handleMouseWheel(e) {
  if (activeTab !== 'mouse') return;
  e.preventDefault();

  if (e.deltaY < 0) {
    document.getElementById('wheel-up-arrow').classList.add('scrolling-up');
    document.getElementById('wheel-down-arrow').classList.remove('scrolling-down');
  } else {
    document.getElementById('wheel-down-arrow').classList.add('scrolling-down');
    document.getElementById('wheel-up-arrow').classList.remove('scrolling-up');
  }

  clearTimeout(wheelTimeout);
  wheelTimeout = setTimeout(() => {
    document.getElementById('wheel-up-arrow').classList.remove('scrolling-up');
    document.getElementById('wheel-down-arrow').classList.remove('scrolling-down');
  }, 150);
}

// ─── AUDIO TEST LOGIC ─────────────────────────────────────────────────────────
function initAudioTest() {
  // Channel triggers
  document.getElementById('btn-audio-left').addEventListener('click', () => toggleAudio('left'));
  document.getElementById('btn-audio-right').addEventListener('click', () => toggleAudio('right'));
  document.getElementById('btn-audio-both').addEventListener('click', () => toggleAudio('both'));

  // Frequency Slider
  const slider = document.getElementById('audio-freq-slider');
  slider.addEventListener('input', (e) => {
    const val = e.target.value;
    document.getElementById('audio-freq-val').innerText = `${val} Hz`;
    if (oscillator) {
      oscillator.frequency.setValueAtTime(val, audioCtx.currentTime);
    }
  });

  // Microphone toggle
  document.getElementById('btn-mic-toggle').addEventListener('click', toggleMicrophone);
}

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function toggleAudio(channel) {
  initAudioContext();

  if (isAudioPlaying) {
    stopAudio();
    return;
  }

  // Set up oscillator
  oscillator = audioCtx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(parseFloat(document.getElementById('audio-freq-slider').value), audioCtx.currentTime);

  // Set up panning
  pannerNode = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
  
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); // moderate volume

  if (pannerNode) {
    let panVal = 0;
    if (channel === 'left') panVal = -1;
    if (channel === 'right') panVal = 1;
    pannerNode.pan.setValueAtTime(panVal, audioCtx.currentTime);
    
    oscillator.connect(pannerNode);
    pannerNode.connect(gainNode);
  } else {
    // Fallback for browsers without StereoPanner
    oscillator.connect(gainNode);
  }

  gainNode.connect(audioCtx.destination);
  oscillator.start();
  isAudioPlaying = true;

  // Toggle buttons visual state
  document.querySelectorAll('.audio-btn').forEach(btn => btn.classList.remove('playing'));
  document.getElementById(`btn-audio-${channel}`).classList.add('playing');
}

function stopAudio() {
  if (oscillator) {
    try { oscillator.stop(); } catch {}
    oscillator.disconnect();
    oscillator = null;
  }
  isAudioPlaying = false;
  document.querySelectorAll('.audio-btn').forEach(btn => btn.classList.remove('playing'));
}

async function toggleMicrophone() {
  const btn = document.getElementById('btn-mic-toggle');
  
  // Remove old error if exists
  const oldErr = document.getElementById('mic-error-msg');
  if (oldErr) oldErr.remove();
  
  if (micStream) {
    stopMicrophone();
    btn.innerHTML = '<i class="fas fa-microphone"></i> Bắt đầu thử Mic';
    btn.style.background = 'rgba(239, 68, 68, 0.1)';
    btn.style.color = '#f87171';
    btn.style.borderColor = 'rgba(239, 68, 68, 0.2)';
    return;
  }

  const isHttps = window.location.protocol === 'https:' || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const errorText = document.createElement('div');
    errorText.id = 'mic-error-msg';
    errorText.style.cssText = 'color:#fbbf24; font-size:11px; margin-top:8px; text-align:left; line-height:1.4; border: 1px solid rgba(251,191,36,0.2); background: rgba(251,191,36,0.05); padding: 8px; border-radius: 8px;';
    if (!isHttps) {
      errorText.innerHTML = '<b>Lỗi bảo mật (HTTP):</b> Trình duyệt chỉ cho phép truy cập Microphone qua kết nối an toàn (HTTPS) hoặc localhost.';
    } else {
      errorText.innerHTML = '<b>Trình duyệt không hỗ trợ:</b> Trình duyệt hiện tại (như Zalo, Facebook, Telegram...) không hỗ trợ truy cập Microphone. Vui lòng bấm Menu chọn <b>"Mở bằng trình duyệt hệ thống"</b> (Chrome/Safari).';
    }
    btn.parentNode.appendChild(errorText);
    return;
  }

  try {
    initAudioContext();
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    
    const source = audioCtx.createMediaStreamSource(micStream);
    micAnalyser = audioCtx.createAnalyser();
    micAnalyser.fftSize = 256;
    source.connect(micAnalyser);

    btn.innerHTML = '<i class="fas fa-microphone-slash"></i> Tắt Microphone';
    btn.style.background = 'rgba(52, 211, 153, 0.1)';
    btn.style.color = '#34d399';
    btn.style.borderColor = 'rgba(52, 211, 153, 0.2)';

    visualizeMicVolume();
  } catch (err) {
    const errorText = document.createElement('div');
    errorText.id = 'mic-error-msg';
    errorText.style.cssText = 'color:#f87171; font-size:11px; margin-top:8px; text-align:left; line-height:1.4; border: 1px solid rgba(248,113,113,0.2); background: rgba(248,113,113,0.05); padding: 8px; border-radius: 8px;';
    
    let helpMsg = 'Lỗi: Không thể truy cập Microphone. Vui lòng kiểm tra kết nối thiết bị.';
    let isIframe = window.self !== window.top;

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
      if (isIframe) {
        helpMsg = '<b>Lỗi Iframe:</b> Trang web đang chạy trong khung nhúng (iframe) và không được trang cha cấp quyền sử dụng Microphone.';
      } else {
        helpMsg = `
          <div style="font-weight:600; margin-bottom:4px; color:#f87171;">Quyền truy cập bị chặn!</div>
          Trình duyệt hoặc hệ điều hành đang chặn Microphone. Để sửa đổi:
          <ul style="margin: 4px 0 0 0; padding-left: 15px; display: flex; flex-direction: column; gap: 4px;">
            <li><b>Chrome/Edge/Cốc Cốc:</b> Click biểu tượng Khóa <i class="fas fa-lock" style="font-size:9px;"></i> ở thanh địa chỉ &rarr; Đổi <b>Microphone</b> thành <b>Cho phép (Allow)</b> &rarr; Reload.</li>
            <li><b>Firefox:</b> Click biểu tượng Mic ở thanh địa chỉ &rarr; Xóa chặn &rarr; Reload.</li>
            <li><b>Safari:</b> Cài đặt &rarr; Trang web &rarr; Microphone &rarr; Chọn Cho phép.</li>
            <li><b>Quyền hệ điều hành:</b> Đảm bảo bạn đã cho phép trình duyệt truy cập mic trong cài đặt Quyền riêng tư của Windows hoặc macOS.</li>
          </ul>
        `;
      }
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      helpMsg = 'Không tìm thấy thiết bị Microphone trên máy của bạn.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      helpMsg = 'Microphone đang bị ứng dụng khác sử dụng.';
    }
    
    errorText.innerHTML = helpMsg;
    btn.parentNode.appendChild(errorText);
    console.error('[Mic Test Error]', err);
  }
}

function visualizeMicVolume() {
  if (!micAnalyser) return;
  const bufferLength = micAnalyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    if (!micStream) return;
    micAnimationId = requestAnimationFrame(draw);
    micAnalyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;
    const volumePercent = Math.min(100, Math.round((average / 128) * 100));
    
    const bar = document.getElementById('mic-volume-bar');
    if (bar) {
      bar.style.width = `${volumePercent}%`;
      // Change color based on volume
      if (volumePercent > 80) {
        bar.style.background = 'var(--accent-purple)';
      } else {
        bar.style.background = 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))';
      }
    }
  };
  draw();
}

// Stop microphone stream
function stopMicrophone() {
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }
  if (micAnimationId) {
    cancelAnimationFrame(micAnimationId);
    micAnimationId = null;
  }
  const bar = document.getElementById('mic-volume-bar');
  if (bar) bar.style.width = '0%';
}

// ─── SCREEN & FPS TEST LOGIC ──────────────────────────────────────────────────
function initScreenTest() {
  document.getElementById('btn-start-deadpixel').addEventListener('click', startDeadPixelTest);
}

function initScreenStats() {
  const resEl = document.getElementById('screen-res-val');
  const dprEl = document.getElementById('screen-dpr-val');
  const colorsEl = document.getElementById('screen-colors-val');

  if (resEl) resEl.innerText = `${window.screen.width} x ${window.screen.height}`;
  if (dprEl) dprEl.innerText = `${window.devicePixelRatio.toFixed(2)}x`;
  if (colorsEl) colorsEl.innerText = `${window.screen.colorDepth}-bit`;
}

function startFpsLoop() {
  const fpsValEl = document.getElementById('screen-fps-val');
  if (!fpsValEl) return;

  fpsLastTime = performance.now();
  fpsFrames = 0;
  screenActive = true;

  const loop = () => {
    if (!screenActive) return;
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLastTime >= 1000) {
      const fps = Math.round((fpsFrames * 1000) / (now - fpsLastTime));
      fpsValEl.innerText = `${fps} Hz`;
      fpsFrames = 0;
      fpsLastTime = now;
    }
    fpsLoopId = requestAnimationFrame(loop);
  };
  loop();
}

function stopFpsLoop() {
  screenActive = false;
  if (fpsLoopId) {
    cancelAnimationFrame(fpsLoopId);
    fpsLoopId = null;
  }
}

function startDeadPixelTest() {
  const overlay = document.createElement('div');
  overlay.id = 'dead-pixel-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.zIndex = '99999';
  overlay.style.cursor = 'pointer';
  
  const colors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff'];
  let colorIndex = 0;
  overlay.style.backgroundColor = colors[colorIndex];

  // Informative cursor helper
  overlay.title = 'Click chuột để đổi màu, nhấn ESC để thoát';

  overlay.addEventListener('click', () => {
    colorIndex++;
    if (colorIndex >= colors.length) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      overlay.remove();
    } else {
      overlay.style.backgroundColor = colors[colorIndex];
    }
  });

  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      overlay.remove();
      window.removeEventListener('keydown', handleEsc);
    }
  };
  window.addEventListener('keydown', handleEsc);

  document.body.appendChild(overlay);

  if (overlay.requestFullscreen) {
    overlay.requestFullscreen().catch(err => {
      console.warn('Could not enter fullscreen:', err);
    });
  }
}

// ─── CAMERA TEST LOGIC ────────────────────────────────────────────────────────
function initCameraTest() {
  const btn = document.getElementById('btn-camera-toggle');
  if (btn) {
    btn.addEventListener('click', toggleCamera);
  }
}

async function toggleCamera() {
  const btn = document.getElementById('btn-camera-toggle');
  const video = document.getElementById('webcam-preview');
  const placeholder = document.getElementById('webcam-placeholder');
  const info = document.getElementById('camera-info');
  const resVal = document.getElementById('camera-resolution-val');

  if (!btn || !video || !placeholder) return;

  if (cameraStream) {
    stopCamera();
    btn.innerHTML = '<i class="fas fa-video"></i> Bật Camera';
    btn.style.background = 'rgba(96,165,250,0.1)';
    btn.style.color = 'var(--accent-blue)';
    btn.style.borderColor = 'rgba(96,165,250,0.2)';
    video.style.display = 'none';
    placeholder.style.display = 'block';
    placeholder.innerHTML = `
      <i class="fas fa-camera" style="font-size:48px; color:rgba(255,255,255,0.15); margin-bottom:15px; display:block;"></i>
      <span>Chưa kích hoạt camera</span>
    `;
    if (info) info.style.display = 'none';
    return;
  }

  // Show loading state
  placeholder.style.display = 'block';
  video.style.display = 'none';
  placeholder.innerHTML = `
    <i class="fas fa-spinner fa-spin" style="font-size:48px; color:var(--accent-blue); margin-bottom:15px; display:block;"></i>
    <span>Đang kết nối với Camera...</span>
  `;

  const isHttps = window.location.protocol === 'https:' || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    placeholder.style.display = 'block';
    video.style.display = 'none';
    if (!isHttps) {
      placeholder.innerHTML = `
        <i class="fas fa-shield-alt" style="font-size:48px; color:#fbbf24; margin-bottom:15px; display:block;"></i>
        <span style="color:#fbbf24; font-weight:600;">Không có kết nối an toàn (HTTPS)</span><br>
        <span style="font-size:12px; color:var(--text-muted); margin-top:6px; display:inline-block; padding: 0 20px; line-height:1.5;">
          Trình duyệt chỉ cho phép truy cập Camera qua kết nối bảo mật (HTTPS) hoặc từ localhost.<br>
          Vui lòng kiểm tra lại địa chỉ trang web của bạn.
        </span>
      `;
    } else {
      placeholder.innerHTML = `
        <i class="fas fa-exclamation-circle" style="font-size:48px; color:#fbbf24; margin-bottom:15px; display:block;"></i>
        <span style="color:#fbbf24; font-weight:600;">Trình duyệt/Ứng dụng không hỗ trợ Camera</span><br>
        <span style="font-size:12px; color:var(--text-muted); margin-top:6px; display:inline-block; padding: 0 20px; line-height:1.5; text-align: left;">
          Bạn đang sử dụng HTTPS, nhưng trình duyệt hoặc ứng dụng hiện tại (ví dụ: trình duyệt nhúng của <b>Zalo, Facebook, Telegram</b>...) không hỗ trợ truy cập Camera.<br><br>
          <b>Cách khắc phục:</b> Hãy nhấn vào nút Menu (biểu tượng 3 dấu chấm ở góc trên) và chọn <b>"Mở bằng trình duyệt hệ thống"</b> (Chrome, Safari, Edge) để tiến hành kiểm tra.
        </span>
      `;
    }
    return;
  }

  try {
    initAudioContext();
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = cameraStream;
    video.style.display = 'block';
    placeholder.style.display = 'none';
    btn.innerHTML = '<i class="fas fa-video-slash"></i> Tắt Camera';
    btn.style.background = 'rgba(239, 68, 68, 0.1)';
    btn.style.color = '#f87171';
    btn.style.borderColor = 'rgba(239, 68, 68, 0.2)';

    video.onloadedmetadata = () => {
      if (info && resVal) {
        info.style.display = 'block';
        resVal.innerText = `${video.videoWidth} x ${video.videoHeight}`;
      }
    };
  } catch (err) {
    placeholder.style.display = 'block';
    video.style.display = 'none';
    
    let errorTitle = 'Không thể kết nối với Camera';
    let errorDesc = 'Vui lòng đảm bảo thiết bị của bạn có Camera và hoạt động bình thường.';
    let showPermissionGuide = false;
    let isIframe = window.self !== window.top;

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
      if (isIframe) {
        errorTitle = 'Lỗi bảo mật Iframe';
        errorDesc = 'Trang web đang chạy trong khung nhúng (iframe) và không được trang cha cấp quyền sử dụng camera.';
      } else {
        errorTitle = 'Quyền truy cập Camera bị chặn';
        errorDesc = 'Trình duyệt hoặc hệ điều hành đang chặn quyền truy cập camera cho trang web này.';
        showPermissionGuide = true;
      }
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      errorTitle = 'Không tìm thấy Camera';
      errorDesc = 'Không phát hiện thấy thiết bị camera nào được kết nối với máy tính.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      errorTitle = 'Camera đang bị chiếm dụng';
      errorDesc = 'Camera đang được sử dụng bởi một ứng dụng hoặc tab trình duyệt khác.';
    }

    let guideHtml = '';
    if (showPermissionGuide) {
      guideHtml = `
        <div style="text-align: left; padding: 15px; margin-top: 15px; background: rgba(248,113,113,0.05); border: 1px solid rgba(248,113,113,0.2); border-radius: 10px; font-size: 12px; color: var(--text-secondary); max-width: 90%; line-height: 1.6;">
          <div style="font-weight: 600; color: #f87171; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <i class="fas fa-lock-open"></i> Hướng dẫn cấp quyền truy cập Camera:
          </div>
          <ul style="margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px;">
            <li><b>Trên Chrome / Edge / Cốc Cốc:</b> Bấm vào biểu tượng <b>Khóa bảo mật</b> <i class="fas fa-lock" style="font-size:10px; margin: 0 2px;"></i> hoặc <b>Cài đặt trang web</b> ở bên trái thanh địa chỉ URL &rarr; Tìm mục <b>Camera</b> &rarr; Chọn <b>Cho phép (Allow)</b> &rarr; Tải lại trang.</li>
            <li><b>Trên Firefox:</b> Bấm vào biểu tượng <b>Camera / Khóa</b> ở thanh địa chỉ &rarr; Xóa quyền chặn hiện tại &rarr; Tải lại trang và bấm "Cho phép" khi được hỏi.</li>
            <li><b>Trên Safari:</b> Truy cập <b>Cài đặt (Preferences)</b> &rarr; <b>Trang web (Websites)</b> &rarr; <b>Camera</b> &rarr; Chọn <b>Cho phép (Allow)</b> cho trang web này.</li>
            <li><b>Quyền trên Hệ điều hành:</b> Đảm bảo bạn đã cho phép trình duyệt truy cập camera trong cài đặt Quyền riêng tư (Privacy Settings) của Windows hoặc macOS.</li>
          </ul>
        </div>
      `;
    }

    placeholder.innerHTML = `
      <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#f87171; margin-bottom:15px; display:block;"></i>
      <span style="color:#f87171; font-weight:600;">${errorTitle}</span><br>
      <span style="font-size:12px; color:var(--text-muted); margin-top:6px; display:inline-block; padding: 0 20px; line-height:1.5;">
        ${errorDesc}
      </span>
      ${guideHtml}
    `;
    console.error('[Camera Test Error]', err);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}

// ─── BATTERY TEST LOGIC ───────────────────────────────────────────────────────
function initBatteryTest() {
  if (!navigator.getBattery) {
    const charVal = document.getElementById('battery-charging-val');
    if (charVal) charVal.innerText = 'Không hỗ trợ trên thiết bị này';
    return;
  }

  navigator.getBattery().then(battery => {
    updateBatteryUI(battery);

    // Add listeners
    battery.addEventListener('chargingchange', () => updateBatteryUI(battery));
    battery.addEventListener('levelchange', () => updateBatteryUI(battery));
    battery.addEventListener('chargingtimechange', () => updateBatteryUI(battery));
    battery.addEventListener('dischargingtimechange', () => updateBatteryUI(battery));
  });
}

function updateBatteryUI(battery) {
  const levelPercent = Math.round(battery.level * 100);
  
  // Fill graphic
  const fill = document.getElementById('battery-fill');
  const box = document.getElementById('battery-box');
  if (fill) {
    fill.style.height = `${levelPercent}%`;
  }
  
  if (box) {
    if (battery.charging) {
      box.classList.add('charging');
    } else {
      box.classList.remove('charging');
    }
  }

  // Values
  const lvlVal = document.getElementById('battery-level-val');
  const chgVal = document.getElementById('battery-charging-val');
  if (lvlVal) lvlVal.innerText = `${levelPercent}%`;
  if (chgVal) chgVal.innerText = battery.charging ? 'Đang sạc (Nguồn điện)' : 'Đang dùng pin';

  // Times
  const formatTime = (seconds) => {
    if (seconds === Infinity || isNaN(seconds)) return '--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} giờ ${minutes} phút`;
  };

  const chgTime = document.getElementById('battery-charge-time');
  const disTime = document.getElementById('battery-discharge-time');
  if (chgTime) chgTime.innerText = battery.charging ? formatTime(battery.chargingTime) : '--';
  if (disTime) disTime.innerText = !battery.charging ? formatTime(battery.dischargingTime) : '--';
}

// ─── GAMEPAD TEST LOGIC ───────────────────────────────────────────────────────
let gamepadConnected = false;

// Listen to global events
window.addEventListener('gamepadconnected', (e) => {
  gamepadConnected = true;
  const msg = document.getElementById('gamepad-disconnected-msg');
  const area = document.getElementById('gamepad-connected-area');
  const name = document.getElementById('gamepad-model-name');
  
  if (msg) msg.style.display = 'none';
  if (area) area.style.display = 'block';
  if (name) name.innerText = `Thiết bị: ${e.gamepad.id}`;
  
  updateGamepadButtonLabels();

  const btnVibrate = document.getElementById('btn-gamepad-vibrate');
  if (btnVibrate) {
    if (e.gamepad.vibrationActuator) {
      btnVibrate.style.display = 'inline-block';
    } else {
      btnVibrate.style.display = 'none';
    }
  }

  if (activeTab === 'gamepad') {
    startGamepadLoop();
  }
});

window.addEventListener('gamepaddisconnected', () => {
  const gamepads = navigator.getGamepads();
  let anyConnected = false;
  for (const gp of gamepads) {
    if (gp) {
      anyConnected = true;
      const name = document.getElementById('gamepad-model-name');
      if (name) name.innerText = `Thiết bị: ${gp.id}`;
      break;
    }
  }

  if (!anyConnected) {
    gamepadConnected = false;
    const msg = document.getElementById('gamepad-disconnected-msg');
    const area = document.getElementById('gamepad-connected-area');
    if (msg) msg.style.display = 'block';
    if (area) area.style.display = 'none';
    stopGamepadLoop();
  }
});

function initGamepadTest() {
  const skinSelect = document.getElementById('select-gamepad-skin');
  if (skinSelect) {
    skinSelect.addEventListener('change', (e) => {
      currentGamepadSkin = e.target.value;
      updateGamepadButtonLabels();
    });
  }

  const btnVibrate = document.getElementById('btn-gamepad-vibrate');
  if (btnVibrate) {
    btnVibrate.addEventListener('click', () => {
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (gp && gp.vibrationActuator) {
          gp.vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: 800,
            weakMagnitude: 1.0,
            strongMagnitude: 1.0
          });
        }
      }
    });
  }
}

function updateGamepadButtonLabels() {
  const skin = GAMEPAD_SKINS[currentGamepadSkin];
  for (let i = 0; i < 16; i++) {
    const btnEl = document.getElementById(`gp-btn-${i}`);
    if (btnEl) {
      btnEl.innerText = skin.buttons[i] || `Nút ${i}`;
    }
  }
}

function startGamepadLoop() {
  if (!gamepadConnected) return;
  stopGamepadLoop(); // prevent duplicates
  
  const loop = () => {
    const gamepads = navigator.getGamepads();
    let activeGamepad = null;
    for (const gp of gamepads) {
      if (gp) {
        activeGamepad = gp;
        break;
      }
    }

    if (activeGamepad) {
      const skin = GAMEPAD_SKINS[currentGamepadSkin];
      // 1. Buttons
      activeGamepad.buttons.forEach((btn, index) => {
        const btnEl = document.getElementById(`gp-btn-${index}`);
        if (btnEl) {
          const baseLabel = skin.buttons[index] || `Nút ${index}`;
          if (btn.pressed || btn.value > 0.1) {
            btnEl.classList.add('active');
            if (btn.value > 0.1) {
              btnEl.innerText = `${baseLabel} (${btn.value.toFixed(2)})`;
            } else {
              btnEl.innerText = baseLabel;
            }
          } else {
            btnEl.classList.remove('active');
            btnEl.innerText = baseLabel;
          }
        }
      });

      // 2. Analog Axes
      // Left Stick (Axes 0 & 1)
      const leftX = activeGamepad.axes[0] || 0;
      const leftY = activeGamepad.axes[1] || 0;
      const dotLeft = document.getElementById('gamepad-stick-left');
      if (dotLeft) {
        dotLeft.style.transform = `translate(calc(-50% + ${leftX * 40}px), calc(-50% + ${leftY * 40}px))`;
      }
      const axesLeftText = document.getElementById('gamepad-axes-left');
      if (axesLeftText) {
        axesLeftText.innerText = `X: ${leftX.toFixed(2)} | Y: ${leftY.toFixed(2)}`;
      }

      // Right Stick (Axes 2 & 3)
      const rightX = activeGamepad.axes[2] || 0;
      const rightY = activeGamepad.axes[3] || 0;
      const dotRight = document.getElementById('gamepad-stick-right');
      if (dotRight) {
        dotRight.style.transform = `translate(calc(-50% + ${rightX * 40}px), calc(-50% + ${rightY * 40}px))`;
      }
      const axesRightText = document.getElementById('gamepad-axes-right');
      if (axesRightText) {
        axesRightText.innerText = `X: ${rightX.toFixed(2)} | Y: ${rightY.toFixed(2)}`;
      }
    }

    gamepadAnimId = requestAnimationFrame(loop);
  };
  loop();
}

function stopGamepadLoop() {
  if (gamepadAnimId) {
    cancelAnimationFrame(gamepadAnimId);
    gamepadAnimId = null;
  }
}

// ─── SYSTEM CONFIG DIAGNOSTIC LOGIC ──────────────────────────────────────────
function initSystemTest() {
  // 1. CPU Cores
  const cpuVal = document.getElementById('sys-cpu-val');
  if (cpuVal) {
    cpuVal.innerText = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} nhân (luồng)` : 'Không rõ';
  }

  // 2. RAM
  const ramVal = document.getElementById('sys-ram-val');
  if (ramVal) {
    ramVal.innerText = navigator.deviceMemory ? `Khoảng ${navigator.deviceMemory} GB` : 'Không rõ';
  }

  // 3. GPU & WebGL
  const gpuVal = document.getElementById('sys-gpu-val');
  const webglVal = document.getElementById('sys-webgl-val');
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      if (webglVal) webglVal.innerHTML = '<span style="color:var(--accent-green); font-weight:bold;">Hỗ trợ (WebGL 1.0)</span>';
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo && gpuVal) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        gpuVal.innerText = renderer || 'Không rõ model';
      } else if (gpuVal) {
        gpuVal.innerText = 'Không lấy được thông tin chi tiết';
      }
    } else {
      if (webglVal) webglVal.innerHTML = '<span style="color:#ef4444; font-weight:bold;">Không hỗ trợ</span>';
      if (gpuVal) gpuVal.innerText = 'N/A';
    }
  } catch (e) {
    if (gpuVal) gpuVal.innerText = 'Lỗi truy cập WebGL';
  }

  // 4. OS & Browser Simple Detection
  const osVal = document.getElementById('sys-os-val');
  const browserVal = document.getElementById('sys-browser-val');
  const ua = navigator.userAgent;
  
  let os = 'Không rõ';
  if (ua.indexOf('Win') !== -1) os = 'Windows';
  else if (ua.indexOf('Mac') !== -1) os = 'macOS';
  else if (ua.indexOf('Linux') !== -1) os = 'Linux';
  else if (ua.indexOf('Android') !== -1) os = 'Android';
  else if (ua.indexOf('like Mac') !== -1) os = 'iOS';
  if (osVal) osVal.innerText = os;

  let browser = 'Không rõ';
  if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
  else if (ua.indexOf('Chrome') !== -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') !== -1) browser = 'Safari';
  else if (ua.indexOf('Edge') !== -1) browser = 'Edge';
  else if (ua.indexOf('Opera') !== -1) browser = 'Opera';
  if (browserVal) browserVal.innerText = browser;

  // 5. Network Information
  const netDownlink = document.getElementById('sys-net-downlink');
  const netRtt = document.getElementById('sys-net-rtt');
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    if (netDownlink) netDownlink.innerText = conn.downlink ? `${conn.downlink} Mbps` : 'Không rõ';
    if (netRtt) netRtt.innerText = conn.rtt ? `${conn.rtt} ms` : 'Không rõ';
  } else {
    if (netDownlink) netDownlink.innerText = 'Không hỗ trợ trên trình duyệt này';
    if (netRtt) netRtt.innerText = 'Không hỗ trợ trên trình duyệt này';
  }
}
