/**
 * components/iq-eq.js
 * Chức năng Kiểm tra IQ và EQ (Tách riêng - Bảo mật Backend)
 * - Toàn bộ ngân hàng đề 100 câu và logic chấm điểm được lưu ở server (Cloudflare Worker).
 * - Client chỉ nhận câu hỏi ngẫu nhiên không kèm đáp án (Tránh F12 cheat).
 * - Nộp bài và chấm điểm hoàn toàn thông qua API POST /api/iqeq?action=submit.
 */

// ── TRẠNG THÁI KIỂM TRA TOÀN CỤC ────────────────────────────────────
let activeState = {
  type: 'IQ', // IQ hoặc EQ
  questions: [], // Nhận từ server
  currIdx: 0,
  selectedAnswers: [], // Chỉ lưu index của đáp án đã chọn (0,1,2,3) hoặc Likert score (0,1,2,3,4)
  timer: null,
  timeLeft: 0,
  limitQuestions: 25, // IQ: 25, EQ: 10
  userName: '',
  userAge: ''
};

// ── UTILS RENDER LOADING/ERROR ──────────────────────────────────────
function showLoading(container, text) {
  container.innerHTML = `
    <div class="iqeq-wrapper">
      <div class="iqeq-screen active">
        <div class="iqeq-loading-card" style="text-align: center; padding: 40px 20px;">
          <div class="iqeq-spinner" style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--accent); border-radius: 50%; animation: iqeq-spin 1s linear infinite; margin: 0 auto 20px;"></div>
          <div style="font-size: 16px; color: var(--text-primary); font-weight: 500;">${text}</div>
        </div>
      </div>
    </div>
  `;
}

function showError(container, text, retryFn) {
  container.innerHTML = `
    <div class="iqeq-wrapper">
      <div class="iqeq-screen active">
        <div class="iqeq-intro-card" style="text-align: center; border-color: rgba(239, 68, 68, 0.3);">
          <div style="font-size: 40px; margin-bottom: 15px;">❌</div>
          <div class="iqeq-intro-title" style="color: #ef4444;">Đã xảy ra lỗi</div>
          <div class="iqeq-intro-desc" style="margin-bottom: 20px;">${text}</div>
          <button class="btn-primary" id="iqeq-btn-retry" style="background:#ef4444; border-color:#ef4444;">Thử lại</button>
        </div>
      </div>
    </div>
  `;
  const btn = document.getElementById('iqeq-btn-retry');
  if (btn) btn.onclick = retryFn;
}

// Helper validation form trước khi bắt đầu test
function validateIntroInputs(nameId, ageId, agreeId) {
  const nameInput = document.getElementById(nameId);
  const ageInput = document.getElementById(ageId);
  const agreeCheck = document.getElementById(agreeId);

  let isValid = true;

  // Reset styles
  if (nameInput) {
    nameInput.style.borderColor = 'var(--border)';
    nameInput.style.boxShadow = 'none';
  }
  if (ageInput) {
    ageInput.style.borderColor = 'var(--border)';
    ageInput.style.boxShadow = 'none';
  }
  if (agreeCheck) {
    const labelRow = agreeCheck.closest('.iqeq-checkbox-row');
    if (labelRow) labelRow.style.color = 'var(--text-secondary)';
  }

  // Validate Name
  if (nameInput && !nameInput.value.trim()) {
    nameInput.style.borderColor = '#ef4444';
    nameInput.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
    isValid = false;
  }

  // Validate Age
  if (ageInput && !ageInput.value.trim()) {
    ageInput.style.borderColor = '#ef4444';
    ageInput.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
    isValid = false;
  }

  // Validate Agreement
  if (agreeCheck && !agreeCheck.checked) {
    const labelRow = agreeCheck.closest('.iqeq-checkbox-row');
    if (labelRow) {
      labelRow.style.color = '#ef4444';
    }
    isValid = false;
  }

  return isValid;
}

// Thêm keyframes cho spinner nếu chưa có
if (!document.getElementById('iqeq-keyframes')) {
  const style = document.createElement('style');
  style.id = 'iqeq-keyframes';
  style.textContent = `
    @keyframes iqeq-spin {
      to { transform: rotate(360deg); }
    }
    .iqeq-spinner {
      border: 4px solid rgba(255,255,255,0.1);
      border-top-color: #60a5fa !important;
      border-radius: 50%;
    }
    .eq .iqeq-spinner {
      border-top-color: #34d399 !important;
    }
  `;
  document.head.appendChild(style);
}

// ── RENDER CHỨC NĂNG KIỂM TRA IQ (25 CÂU - 30 PHÚT) ───────────────────
export function renderIQ(containerId = 'iqContent') {
  activeState.type = 'IQ';
  activeState.limitQuestions = 25;
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="iqeq-wrapper">
      <!-- Màn hình nhập thông tin & miễn trừ trách nhiệm -->
      <div class="iqeq-screen active" id="iq-scr-intro">
        <div class="iqeq-intro-card">
          <div class="iqeq-intro-icon">🧠</div>
          <div>
            <div class="iqeq-intro-title">Bài Kiểm Tra Trí Tuệ (IQ Test)</div>
            <div class="iqeq-intro-desc">
              Bài trắc nghiệm gồm <strong>25 câu hỏi tư duy & hình học</strong> đa dạng được chọn ngẫu nhiên từ ngân hàng 100 câu bảo mật trên máy chủ.<br>
              Tổng thời gian làm bài là <strong>30 phút</strong>. Đáp án được chấm độc quyền tại backend để đảm bảo bảo mật và chống cheat (F12).
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div>
            <label style="display:block; font-size:12px; margin-bottom:4px; color:var(--text-secondary);">Họ và tên của bạn</label>
            <input type="text" id="iq-user-name" placeholder="Ví dụ: Nguyễn Văn A" style="width:100%; padding:10px; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:6px; color:#fff;" />
          </div>
          <div>
            <label style="display:block; font-size:12px; margin-bottom:4px; color:var(--text-secondary);">Tuổi</label>
            <input type="number" id="iq-user-age" placeholder="Ví dụ: 20" min="1" max="120" style="width:100%; padding:10px; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:6px; color:#fff;" />
          </div>
        </div>

        <div class="iqeq-disclaimer-box">
          <div class="iqeq-disclaimer-title">⚠️ MIỄN TRỪ TRÁCH NHIỆM</div>
          <div class="iqeq-disclaimer-body">
            Bài kiểm tra này chỉ mang tính chất <strong>tham khảo và giải trí</strong>. Kết quả trắc nghiệm không có giá trị học thuật hay chẩn đoán chính thức được cấp phép bởi bất kỳ cơ sở y tế hay hiệp hội khoa học nào. Chúng tôi không chịu bất cứ trách nhiệm nào đối với những suy diễn hay hành vi phát sinh từ kết quả của bạn.
          </div>
        </div>

        <label class="iqeq-checkbox-row">
          <input type="checkbox" id="iq-agree" />
          <div class="iqeq-checkbox-label">Tôi đã hiểu rõ và đồng ý với điều khoản miễn trừ trách nhiệm ở trên.</div>
        </label>

        <button class="btn-primary" id="iq-btn-start" style="width: 100%;">Bắt đầu kiểm tra IQ</button>
      </div>

      <!-- Màn hình làm bài (Bố cục chuyên nghiệp) -->
      <div class="iqeq-screen" id="iq-scr-test">
        <div class="iqeq-test-header">
          <div class="iqeq-test-phase-badge iq">Kiểm tra IQ</div>
          <div class="iqeq-timer" id="iq-timer-lbl">30:00</div>
        </div>

        <div class="iqeq-test-layout">
          <!-- Cột bên trái: Câu hỏi và Lựa chọn -->
          <div>
            <div class="iqeq-progress-wrap" style="margin-bottom: 16px;">
              <div class="iqeq-progress-bar"><div class="iqeq-progress-fill" id="iq-bar-fill" style="width:0%;"></div></div>
              <div class="iqeq-progress-text" id="iq-progress-lbl">Câu hỏi 1/25</div>
            </div>
            
            <div class="iqeq-question-card">
              <div class="iqeq-q-category">LOGIC & HÌNH HỌC</div>
              <div class="iqeq-q-text" id="iq-q-txt">Đang tải câu hỏi...</div>
              
              <!-- Container cho sơ đồ hình học SVG -->
              <div id="iq-svg-container" style="margin: 15px 0; text-align: center;"></div>
              
              <div class="iqeq-options-grid" id="iq-options-wrap">
                <!-- options -->
              </div>
            </div>
            
            <div class="iqeq-nav-row" style="margin-top: 20px;">
              <button class="btn-secondary" id="iq-btn-prev">◀ Câu trước</button>
              <button class="btn-primary" id="iq-btn-next">Câu tiếp theo ▶</button>
            </div>
          </div>

          <!-- Cột bên phải: Lưới 25 câu chuyển nhanh -->
          <div class="iqeq-q-grid-panel">
            <div class="iqeq-q-grid-title">Bản đồ câu hỏi</div>
            <div class="iqeq-q-grid" id="iq-q-grid-container">
              <!-- grid items -->
            </div>
            <button class="btn-primary" id="iq-btn-submit" style="width:100%; margin-top:20px; background:var(--accent-green); border-color:var(--accent-green);">Nộp bài thi</button>
          </div>
        </div>
      </div>

      <!-- Màn hình kết quả -->
      <div class="iqeq-screen" id="iq-scr-result">
        <div class="iqeq-result-header">
          <div class="iqeq-result-header-title">Báo Cáo Trí Tuệ IQ</div>
          <div class="iqeq-result-header-sub" id="iq-res-sub-lbl">Hoàn thành bài kiểm tra</div>
        </div>

        <div class="iqeq-score-card iq-card" style="margin: 0 auto; max-width: 320px;">
          <div class="iqeq-score-ring-wrap">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle class="iqeq-score-ring-bg" cx="60" cy="60" r="50"></circle>
              <circle class="iqeq-score-ring-fill" cx="60" cy="60" r="50" stroke="#60a5fa" stroke-dasharray="314" stroke-dashoffset="314" id="iq-svg-ring"></circle>
            </svg>
            <div class="iqeq-score-ring-center">
              <div class="iqeq-score-value" id="iq-res-value">--</div>
              <div class="iqeq-score-unit">Điểm IQ</div>
            </div>
          </div>
          <div class="iqeq-score-label" id="iq-res-class">Đang tính...</div>
        </div>

        <div class="iqeq-analysis-box" style="margin-top: 20px;">
          <div class="iqeq-analysis-title">📋 NHẬN XÉT CHI TIẾT</div>
          <div class="iqeq-analysis-text" id="iq-res-desc">Đang phân tích dữ liệu...</div>
        </div>

        <div class="iqeq-analysis-box" style="margin-top: 20px;">
          <div class="iqeq-analysis-title" style="color: #60a5fa;">📊 THANG ĐIỂM IQ & PHÂN PHỐI DÂN SỐ</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px;">
            <div style="background: rgba(255,255,255,0.015); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); line-height: 1.5;">
              <strong style="color: #60a5fa;">🎯 Thang điểm IQ chuẩn:</strong>
              <div style="margin-top: 6px; color: var(--text-secondary);">
                • <strong>Trên 130</strong>: Xuất chúng (Top 2% dân số)<br>
                • <strong>115 - 129</strong>: Trí tuệ cao (Top 13.5% dân số)<br>
                • <strong>90 - 114</strong>: Trung bình (68% dân số)<br>
                • <strong>Dưới 90</strong>: Thấp / Cần rèn luyện thêm
              </div>
            </div>
            <div style="background: rgba(255,255,255,0.015); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); line-height: 1.5;">
              <strong style="color: #60a5fa;">💡 Ý nghĩa kết quả IQ:</strong>
              <div style="margin-top: 6px; color: var(--text-secondary);">
                Điểm số được tính toán dựa trên khả năng giải quyết 25 câu hỏi thuộc 3 mức độ khó tăng dần (Dễ, Trung bình, Khó) tương ứng với các kỹ năng logic, toán học và hình học không gian.
              </div>
            </div>
          </div>
        </div>

        <div class="iqeq-result-disclaimer">
          Kết quả lưu thành công trên hệ thống. Trí tuệ của bạn là độc nhất vô nhị và không thể quy chụp hoàn toàn bằng một con số đơn lẻ. Hãy luôn tự tin!
        </div>

        <button class="btn-secondary" id="iq-btn-restart" style="width:100%;">Làm lại bài kiểm tra IQ</button>
      </div>
    </div>
  `;

  // Attach events
  const agree = document.getElementById('iq-agree');
  const start = document.getElementById('iq-btn-start');
  const prev = document.getElementById('iq-btn-prev');
  const next = document.getElementById('iq-btn-next');
  const submit = document.getElementById('iq-btn-submit');
  const restart = document.getElementById('iq-btn-restart');

  if (start) {
    start.onclick = () => {
      if (validateIntroInputs('iq-user-name', 'iq-user-age', 'iq-agree')) {
        fetchAndStartIQ(containerId);
      }
    };
  }

  if (prev) prev.onclick = () => navigateIQ(-1);
  if (next) next.onclick = () => navigateIQ(1);
  if (submit) submit.onclick = finishIQTest;
  if (restart) restart.onclick = () => renderIQ(containerId);
}

async function fetchAndStartIQ(containerId) {
  const container = document.getElementById(containerId);
  const nameInput = document.getElementById('iq-user-name');
  const ageInput = document.getElementById('iq-user-age');

  activeState.userName = nameInput ? nameInput.value.trim() || 'Ẩn danh' : 'Ẩn danh';
  activeState.userAge = ageInput ? ageInput.value.trim() || 'Chưa rõ' : 'Chưa rõ';

  showLoading(container, "Đang thiết lập bộ đề kiểm tra IQ ngẫu nhiên bảo mật từ server...");

  try {
    const res = await fetch('/api/iqeq?action=questions&type=IQ');
    if (!res.ok) throw new Error("Không thể tải danh sách câu hỏi IQ.");
    const questions = await res.json();

    // Khởi tạo lại trạng thái
    activeState.questions = questions;
    activeState.currIdx = 0;
    activeState.selectedAnswers = Array(activeState.limitQuestions).fill(null);

    // Quay lại màn hình chính của IQ nhưng hiển thị chế độ làm bài
    renderIQ(containerId);
    
    // UI transition
    document.getElementById('iq-scr-intro').classList.remove('active');
    document.getElementById('iq-scr-test').classList.add('active');

    // Khởi tạo lưới bản đồ câu hỏi
    buildQuestionGrid();

    // Khởi động đồng hồ đếm ngược toàn cục (30 phút = 1800 giây)
    activeState.timeLeft = 1800;
    updateGlobalTimerUI();
    clearInterval(activeState.timer);
    activeState.timer = setInterval(() => {
      activeState.timeLeft--;
      updateGlobalTimerUI();
      if (activeState.timeLeft <= 0) {
        clearInterval(activeState.timer);
        alert("⏱ Đã hết 30 phút làm bài! Hệ thống tự động nộp bài.");
        finishIQTest();
      }
    }, 1000);

    loadIQQuestion();
  } catch (err) {
    showError(container, err.message, () => renderIQ(containerId));
  }
}

function buildQuestionGrid() {
  const container = document.getElementById('iq-q-grid-container');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < activeState.limitQuestions; i++) {
    const item = document.createElement('button');
    item.className = 'iqeq-q-grid-item';
    item.id = `q-grid-item-${i}`;
    item.textContent = i + 1;
    item.onclick = () => {
      activeState.currIdx = i;
      loadIQQuestion();
    };
    container.appendChild(item);
  }
}

function updateQuestionGridStatus() {
  for (let i = 0; i < activeState.limitQuestions; i++) {
    const el = document.getElementById(`q-grid-item-${i}`);
    if (!el) continue;

    el.classList.remove('active', 'answered');
    if (i === activeState.currIdx) {
      el.classList.add('active');
    } else if (activeState.selectedAnswers[i] !== null) {
      el.classList.add('answered');
    }
  }
}

function loadIQQuestion() {
  if (activeState.questions.length === 0) return;
  const q = activeState.questions[activeState.currIdx];
  
  // Cập nhật nhãn tiến trình & bản đồ câu hỏi
  document.getElementById('iq-progress-lbl').textContent = `Câu hỏi ${activeState.currIdx + 1}/${activeState.limitQuestions}`;
  document.getElementById('iq-bar-fill').style.width = `${((activeState.currIdx) / activeState.limitQuestions) * 100}%`;
  updateQuestionGridStatus();

  // Nội dung câu hỏi
  document.getElementById('iq-q-txt').textContent = q.q;

  // Render SVG hình học nếu có
  const svgBox = document.getElementById('iq-svg-container');
  if (svgBox) {
    if (q.svg) {
      svgBox.innerHTML = q.svg;
      svgBox.style.display = 'block';
    } else {
      svgBox.innerHTML = '';
      svgBox.style.display = 'none';
    }
  }

  // Khởi tạo các lựa chọn đáp án
  const wrap = document.getElementById('iq-options-wrap');
  wrap.innerHTML = '';

  // Ẩn/Hiện nút chuyển đổi phù hợp
  document.getElementById('iq-btn-prev').style.visibility = activeState.currIdx === 0 ? 'hidden' : 'visible';
  const nextBtn = document.getElementById('iq-btn-next');
  if (activeState.currIdx === activeState.limitQuestions - 1) {
    nextBtn.textContent = 'Nộp bài thi ➔';
  } else {
    nextBtn.textContent = 'Câu tiếp theo ▶';
  }

  q.options.forEach((optText, idx) => {
    const btn = document.createElement('button');
    btn.className = 'iqeq-option-btn';
    if (activeState.selectedAnswers[activeState.currIdx] === idx) {
      btn.classList.add('selected');
    }
    btn.innerHTML = `<span class="iqeq-option-key">${String.fromCharCode(65 + idx)}</span> <span>${optText}</span>`;
    btn.onclick = () => {
      // Lưu lại câu trả lời
      activeState.selectedAnswers[activeState.currIdx] = idx;
      
      // Cập nhật giao diện lựa chọn
      document.querySelectorAll('#iq-options-wrap .iqeq-option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      // Cập nhật trạng thái lưới bản đồ câu hỏi
      updateQuestionGridStatus();
    };
    wrap.appendChild(btn);
  });
}

function navigateIQ(dir) {
  const newIdx = activeState.currIdx + dir;
  if (newIdx >= 0 && newIdx < activeState.limitQuestions) {
    activeState.currIdx = newIdx;
    loadIQQuestion();
  } else if (newIdx === activeState.limitQuestions) {
    finishIQTest();
  }
}

function updateGlobalTimerUI() {
  const lbl = document.getElementById('iq-timer-lbl');
  if (!lbl) return;

  const m = Math.floor(activeState.timeLeft / 60).toString().padStart(2, '0');
  const s = (activeState.timeLeft % 60).toString().padStart(2, '0');
  lbl.textContent = `${m}:${s}`;

  if (activeState.timeLeft <= 60) {
    lbl.classList.add('warning');
  } else {
    lbl.classList.remove('warning');
  }
}

async function finishIQTest() {
  clearInterval(activeState.timer);

  // Kiểm tra câu chưa làm
  const unselectedCount = activeState.selectedAnswers.filter(a => a === null).length;
  if (unselectedCount > 0 && activeState.timeLeft > 0) {
    const confirmSubmit = confirm(`Bạn còn ${unselectedCount} câu hỏi chưa làm. Bạn có chắc chắn muốn nộp bài?`);
    if (!confirmSubmit) {
      // Tiếp tục đếm ngược
      activeState.timer = setInterval(() => {
        activeState.timeLeft--;
        updateGlobalTimerUI();
        if (activeState.timeLeft <= 0) {
          clearInterval(activeState.timer);
          finishIQTest();
        }
      }, 1000);
      return;
    }
  }

  const container = document.getElementById('iqContent');
  showLoading(container, "Đang gửi câu trả lời và chấm điểm bảo mật trên server...");

  try {
    const answersPayload = activeState.selectedAnswers.map((sel, idx) => ({
      qIdx: activeState.questions[idx].qIdx,
      selected: sel
    }));

    const res = await fetch('/api/iqeq?action=submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: activeState.userName,
        age: activeState.userAge,
        test_type: 'IQ',
        answers: answersPayload
      })
    });

    if (!res.ok) throw new Error("Chấm điểm thất bại. Vui lòng kiểm tra kết nối mạng.");
    const result = await res.json();

    // Hiển thị màn hình kết quả
    renderIQ('iqContent');
    document.getElementById('iq-scr-intro').classList.remove('active');
    document.getElementById('iq-scr-test').classList.remove('active');
    document.getElementById('iq-scr-result').classList.add('active');

    document.getElementById('iq-res-value').textContent = result.score;
    document.getElementById('iq-res-class').textContent = result.classification;
    document.getElementById('iq-res-desc').textContent = result.desc;

    // Chạy vòng tròn điểm số SVG
    const ring = document.getElementById('iq-svg-ring');
    if (ring) {
      const circum = 314;
      const pct = (result.raw_correct || 0) / activeState.limitQuestions;
      ring.style.strokeDashoffset = circum - (pct * circum);
    }
  } catch (err) {
    showError(container, err.message, () => renderIQ('iqContent'));
  }
}


// ── RENDER CHỨC NĂNG KIỂM TRA EQ (10 CÂU LIKERT) ──────────────────────
export function renderEQ(containerId = 'eqContent') {
  activeState.type = 'EQ';
  activeState.limitQuestions = 25;
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="iqeq-wrapper eq">
      <!-- Màn hình nhập thông tin & miễn trừ trách nhiệm -->
      <div class="iqeq-screen active" id="eq-scr-intro">
        <div class="iqeq-intro-card">
          <div class="iqeq-intro-icon">❤️</div>
          <div>
            <div class="iqeq-intro-title">Bài Kiểm Tra Trí Tuệ Cảm Xúc (EQ Test)</div>
            <div class="iqeq-intro-desc">
              Bài trắc nghiệm gồm <strong>25 câu hỏi tình huống cảm xúc</strong> được chọn ngẫu nhiên từ ngân hàng 100 câu bảo mật.<br>
              Bạn sẽ trả lời bằng cách tự đánh giá theo mức độ đồng tình của bản thân (Likert Scale). Đáp án chấm trực tiếp trên server để bảo mật.
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div>
            <label style="display:block; font-size:12px; margin-bottom:4px; color:var(--text-secondary);">Họ và tên của bạn</label>
            <input type="text" id="eq-user-name" placeholder="Ví dụ: Nguyễn Văn A" style="width:100%; padding:10px; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:6px; color:#fff;" />
          </div>
          <div>
            <label style="display:block; font-size:12px; margin-bottom:4px; color:var(--text-secondary);">Tuổi</label>
            <input type="number" id="eq-user-age" placeholder="Ví dụ: 20" min="1" max="120" style="width:100%; padding:10px; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:6px; color:#fff;" />
          </div>
        </div>

        <div class="iqeq-disclaimer-box">
          <div class="iqeq-disclaimer-title">⚠️ MIỄN TRỪ TRÁCH NHIỆM</div>
          <div class="iqeq-disclaimer-body">
            Bài kiểm tra này chỉ mang tính chất <strong>tham khảo và giải trí</strong>. Kết quả trắc nghiệm không có giá trị học thuật hay chẩn đoán chính thức được cấp phép bởi bất kỳ cơ sở y tế hay hiệp hội khoa học nào. Chúng tôi không chịu bất cứ trách nhiệm nào đối với những suy diễn hay hành vi phát sinh từ kết quả của bạn.
          </div>
        </div>

        <label class="iqeq-checkbox-row">
          <input type="checkbox" id="eq-agree" />
          <div class="iqeq-checkbox-label">Tôi đã hiểu rõ và đồng ý với điều khoản miễn trừ trách nhiệm ở trên.</div>
        </label>

        <button class="btn-primary" id="eq-btn-start" style="width: 100%;">Bắt đầu kiểm tra EQ</button>
      </div>

      <!-- Màn hình làm bài -->
      <div class="iqeq-screen" id="eq-scr-test">
        <div class="iqeq-test-header">
          <div class="iqeq-test-phase-badge eq">Kiểm tra EQ</div>
        </div>
        <div class="iqeq-progress-wrap" style="margin-bottom: 20px;">
          <div class="iqeq-progress-bar"><div class="iqeq-progress-fill" id="eq-bar-fill" style="width:0%;"></div></div>
          <div class="iqeq-progress-text" id="eq-progress-lbl">Câu hỏi 1/25</div>
        </div>
        
        <div class="iqeq-question-card">
          <div class="iqeq-q-category">TÌNH HUỐNG & THÁI ĐỘ CẢM XÚC</div>
          <div class="iqeq-q-text" id="eq-q-txt">...</div>
          
          <div class="iqeq-likert-options" id="eq-likert-wrap">
            <button class="iqeq-likert-btn" data-val="0">Rất không đồng ý</button>
            <button class="iqeq-likert-btn" data-val="1">Không đồng ý</button>
            <button class="iqeq-likert-btn" data-val="2">Bình thường</button>
            <button class="iqeq-likert-btn" data-val="3">Đồng ý</button>
            <button class="iqeq-likert-btn" data-val="4">Rất đồng ý</button>
          </div>
          <div class="iqeq-likert-labels">
            <span>◄ Không đồng ý</span>
            <span>Đồng ý ►</span>
          </div>
        </div>
      </div>

      <!-- Màn hình kết quả -->
      <div class="iqeq-screen" id="eq-scr-result">
        <div class="iqeq-result-header">
          <div class="iqeq-result-header-title">Báo Cáo Trí Tuệ EQ</div>
          <div class="iqeq-result-header-sub">Đánh giá 4 khía cạnh năng lực cảm xúc cá nhân</div>
        </div>

        <div class="iqeq-score-card eq-card" style="margin: 0 auto 20px; max-width: 320px;">
          <div class="iqeq-score-ring-wrap">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle class="iqeq-score-ring-bg" cx="60" cy="60" r="50"></circle>
              <circle class="iqeq-score-ring-fill" cx="60" cy="60" r="50" stroke="#34d399" stroke-dasharray="314" stroke-dashoffset="314" id="eq-svg-ring"></circle>
            </svg>
            <div class="iqeq-score-ring-center">
              <div class="iqeq-score-value" id="eq-res-value">--</div>
              <div class="iqeq-score-unit">Chỉ số EQ</div>
            </div>
          </div>
          <div class="iqeq-score-label" id="eq-res-class">Đang tính...</div>
        </div>

        <div class="iqeq-eq-breakdown">
          <div class="iqeq-eq-breakdown-title">Biểu đồ khía cạnh EQ</div>
          
          <div class="iqeq-dim-row">
            <div class="iqeq-dim-name">Thấu cảm</div>
            <div class="iqeq-dim-bar-wrap"><div class="iqeq-dim-bar-fill" id="eq-bar-empathy" style="width:0%; background:#818cf8;"></div></div>
            <div class="iqeq-dim-score" id="eq-lbl-empathy">0%</div>
          </div>
          <div class="iqeq-dim-row">
            <div class="iqeq-dim-name">Tự điều chỉnh</div>
            <div class="iqeq-dim-bar-wrap"><div class="iqeq-dim-bar-fill" id="eq-bar-selfReg" style="width:0%; background:#34d399;"></div></div>
            <div class="iqeq-dim-score" id="eq-lbl-selfReg">0%</div>
          </div>
          <div class="iqeq-dim-row">
            <div class="iqeq-dim-name">Kỹ năng xã hội</div>
            <div class="iqeq-dim-bar-wrap"><div class="iqeq-dim-bar-fill" id="eq-bar-social" style="width:0%; background:#f472b6;"></div></div>
            <div class="iqeq-dim-score" id="eq-lbl-social">0%</div>
          </div>
          <div class="iqeq-dim-row">
            <div class="iqeq-dim-name">Tự nhận thức</div>
            <div class="iqeq-dim-bar-wrap"><div class="iqeq-dim-bar-fill" id="eq-bar-selfAwa" style="width:0%; background:#fbbf24;"></div></div>
            <div class="iqeq-dim-score" id="eq-lbl-selfAwa">0%</div>
          </div>
        </div>

        <div class="iqeq-analysis-box" style="margin-top: 20px;">
          <div class="iqeq-analysis-title">📋 NHẬN XÉT CHI TIẾT</div>
          <div class="iqeq-analysis-text" id="eq-res-desc">Đang phân tích dữ liệu...</div>
        </div>

        <div class="iqeq-analysis-box" style="margin-top: 20px;">
          <div class="iqeq-analysis-title" style="color: #34d399;">📊 GIẢI THÍCH CHI TIẾT KHÍA CẠNH EQ</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px;">
            <div style="background: rgba(255,255,255,0.015); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
              <strong style="color: #818cf8;">🧠 Thấu cảm (Empathy):</strong>
              <p style="margin: 4px 0 0; color: var(--text-secondary); line-height: 1.5;">Khả năng cảm nhận và thấu hiểu cảm xúc, nhu cầu và quan điểm của người khác. Điểm cao thể hiện sự tinh tế và lắng nghe tốt.</p>
            </div>
            <div style="background: rgba(255,255,255,0.015); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
              <strong style="color: #34d399;">⚡ Tự điều chỉnh (Self-Regulation):</strong>
              <p style="margin: 4px 0 0; color: var(--text-secondary); line-height: 1.5;">Khả năng kiểm soát các cơn bốc đồng, làm chủ cảm xúc khi căng thẳng và thích ứng nhanh với môi trường thay đổi.</p>
            </div>
            <div style="background: rgba(255,255,255,0.015); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
              <strong style="color: #f472b6;">🤝 Kỹ năng xã hội (Social Skills):</strong>
              <p style="margin: 4px 0 0; color: var(--text-secondary); line-height: 1.5;">Khả năng xây dựng mối quan hệ xã hội tốt đẹp, làm việc nhóm, đàm phán thuyết phục và khéo léo xử lý xung đột.</p>
            </div>
            <div style="background: rgba(255,255,255,0.015); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
              <strong style="color: #fbbf24;">🔍 Tự nhận thức (Self-Awareness):</strong>
              <p style="margin: 4px 0 0; color: var(--text-secondary); line-height: 1.5;">Khả năng tự hiểu rõ ưu khuyết điểm, nhu cầu cảm xúc và động lực cá nhân để đưa ra các quyết định hành vi sáng suốt.</p>
            </div>
          </div>
          
          <div style="margin-top: 16px; padding: 12px; background: rgba(52, 211, 153, 0.05); border: 1px dashed rgba(52, 211, 153, 0.2); border-radius: 6px; font-size: 12.5px; color: var(--text-secondary); line-height: 1.5;">
            <strong>Mức độ đánh giá theo điểm số EQ tổng quát:</strong><br>
            • <span style="color: #34d399; font-weight:bold;">120 trở lên</span>: Cao (Cực kỳ nhạy bén cảm xúc)<br>
            • <span style="color: #60a5fa; font-weight:bold;">100 - 119</span>: Khá / Cân bằng tốt<br>
            • <span style="color: #fbbf24; font-weight:bold;">80 - 99</span>: Trung bình<br>
            • <span style="color: #ef4444; font-weight:bold;">Dưới 80</span>: Cần rèn luyện thêm
          </div>
        </div>

        <div class="iqeq-result-disclaimer" style="margin-top:20px;">
          Kết quả lưu thành công trên hệ thống. EQ là năng lực phát triển bền vững theo thời gian thông qua trải nghiệm đời sống.
        </div>

        <button class="btn-secondary" id="eq-btn-restart" style="width:100%;">Làm lại bài kiểm tra EQ</button>
      </div>
    </div>
  `;

  // Attach events
  const agree = document.getElementById('eq-agree');
  const start = document.getElementById('eq-btn-start');
  const restart = document.getElementById('eq-btn-restart');
  const likertBtns = document.querySelectorAll('.iqeq-likert-btn');

  if (start) {
    start.onclick = () => {
      if (validateIntroInputs('eq-user-name', 'eq-user-age', 'eq-agree')) {
        fetchAndStartEQ(containerId);
      }
    };
  }

  if (restart) restart.onclick = () => renderEQ(containerId);

  likertBtns.forEach(btn => {
    btn.onclick = (e) => {
      const clickedBtn = e.currentTarget || e.target;
      const val = parseInt(clickedBtn.dataset.val);
      submitEQAnswer(val, clickedBtn);
    };
  });
}

async function fetchAndStartEQ(containerId) {
  const container = document.getElementById(containerId);
  const nameInput = document.getElementById('eq-user-name');
  const ageInput = document.getElementById('eq-user-age');

  activeState.userName = nameInput ? nameInput.value.trim() || 'Ẩn danh' : 'Ẩn danh';
  activeState.userAge = ageInput ? ageInput.value.trim() || 'Chưa rõ' : 'Chưa rõ';

  showLoading(container, "Đang thiết lập bộ đề kiểm tra EQ ngẫu nhiên bảo mật từ server...");

  try {
    const res = await fetch('/api/iqeq?action=questions&type=EQ');
    if (!res.ok) throw new Error("Không thể tải danh sách câu hỏi EQ.");
    const questions = await res.json();

    // Khởi tạo lại trạng thái
    activeState.questions = questions;
    activeState.currIdx = 0;
    activeState.selectedAnswers = Array(activeState.limitQuestions).fill(null);

    // Quay lại màn hình chính của EQ nhưng hiển thị chế độ làm bài
    renderEQ(containerId);

    // UI transition
    document.getElementById('eq-scr-intro').classList.remove('active');
    document.getElementById('eq-scr-test').classList.add('active');

    loadEQQuestion();
  } catch (err) {
    showError(container, err.message, () => renderEQ(containerId));
  }
}

function loadEQQuestion() {
  if (activeState.questions.length === 0) return;
  const q = activeState.questions[activeState.currIdx];

  // Cập nhật tiến trình
  document.getElementById('eq-progress-lbl').textContent = `Câu hỏi ${activeState.currIdx + 1}/${activeState.limitQuestions}`;
  document.getElementById('eq-bar-fill').style.width = `${(activeState.currIdx / activeState.limitQuestions) * 100}%`;

  document.getElementById('eq-q-txt').textContent = q.q;

  // Khởi tạo lại nút Likert
  const btns = document.querySelectorAll('.iqeq-likert-btn');
  btns.forEach(b => {
    b.classList.remove('selected');
    b.disabled = false;
  });
}

function submitEQAnswer(val, clickedBtn) {
  const btns = document.querySelectorAll('.iqeq-likert-btn');
  btns.forEach(b => b.disabled = true);
  if (clickedBtn) clickedBtn.classList.add('selected');

  // Lưu câu trả lời (Likert score 0 - 4)
  activeState.selectedAnswers[activeState.currIdx] = val;

  setTimeout(() => {
    activeState.currIdx++;
    if (activeState.currIdx >= activeState.limitQuestions) {
      finishEQTest();
    } else {
      loadEQQuestion();
    }
  }, 350);
}

async function finishEQTest() {
  const container = document.getElementById('eqContent');
  showLoading(container, "Đang gửi câu trả lời và phân tích chỉ số cảm xúc EQ trên server...");

  try {
    const answersPayload = activeState.selectedAnswers.map((sel, idx) => ({
      qIdx: activeState.questions[idx].qIdx,
      selected: sel
    }));

    const res = await fetch('/api/iqeq?action=submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: activeState.userName,
        age: activeState.userAge,
        test_type: 'EQ',
        answers: answersPayload
      })
    });

    if (!res.ok) throw new Error("Phân tích kết quả EQ thất bại.");
    const result = await res.json();

    // Quay lại màn hình chính của EQ nhưng ở màn hình kết quả
    renderEQ('eqContent');
    document.getElementById('eq-scr-intro').classList.remove('active');
    document.getElementById('eq-scr-test').classList.remove('active');
    document.getElementById('eq-scr-result').classList.add('active');

    document.getElementById('eq-res-value').textContent = result.score;
    document.getElementById('eq-res-class').textContent = result.classification;
    document.getElementById('eq-res-desc').textContent = result.desc;

    // Chạy vòng tròn điểm số SVG
    const ring = document.getElementById('eq-svg-ring');
    if (ring) {
      const circum = 314;
      // Quy đổi điểm số về phần trăm để hiển thị (thang điểm 60 - 140)
      const pct = (result.score - 60) / 80;
      ring.style.strokeDashoffset = circum - (pct * circum);
    }

    // Biểu đồ khía cạnh
    const dims = ['empathy', 'selfReg', 'social', 'selfAwa'];
    dims.forEach(d => {
      const val = result.breakdown[d] || 0;
      const bar = document.getElementById(`eq-bar-${d}`);
      const lbl = document.getElementById(`eq-lbl-${d}`);
      if (bar) bar.style.width = `${val}%`;
      if (lbl) {
        let level = 'Cần cải thiện';
        let levelColor = '#ef4444';
        if (val >= 75) {
          level = 'Cao';
          levelColor = '#10b981';
        } else if (val >= 50) {
          level = 'Khá';
          levelColor = '#60a5fa';
        }
        lbl.innerHTML = `${val}% <span style="font-size:11px; font-weight:normal; color:${levelColor}; margin-left:6px;">(${level})</span>`;
      }
    });
  } catch (err) {
    showError(container, err.message, () => renderEQ('eqContent'));
  }
}
