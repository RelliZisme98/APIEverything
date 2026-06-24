/**
 * components/iq-eq.js
 * Chức năng Kiểm tra IQ và EQ
 * - Các câu hỏi hiển thị ngẫu nhiên
 * - Có bộ đếm thời gian cho phần IQ
 * - Màn hình miễn trừ trách nhiệm trước và sau khi test
 */

// ── NGÂN HÀNG CÂU HỎI ──────────────────────────────────────────────

const IQ_QUESTIONS = [
  { q: "Số tiếp theo trong dãy: 2, 4, 8, 16, ...", options: ["24", "32", "30", "64"], ans: 1 },
  { q: "Chữ cái tiếp theo: A, C, E, G, ...", options: ["H", "I", "J", "K"], ans: 1 },
  { q: "Nếu tất cả Bloops đều là Razzies và tất cả Razzies đều là Lazzies, thì tất cả Bloops chắc chắn là Lazzies?", options: ["Đúng", "Sai", "Không thể xác định", "Đôi khi đúng"], ans: 0 },
  { q: "Một chiếc áo giá 20$. Giảm giá 20%, giá mới là bao nhiêu?", options: ["15$", "16$", "18$", "10$"], ans: 1 },
  { q: "Số nào không thuộc nhóm: 3, 5, 7, 9, 11, 13?", options: ["7", "9", "11", "13"], ans: 1 }, // 9 is not prime
  { q: "MARY, 16 tuổi, gấp 4 lần tuổi em trai. Hỏi khi MARY gấp 2 lần tuổi em trai thì Mary bao nhiêu tuổi?", options: ["20", "24", "26", "28"], ans: 1 }, // Brother is 4. Diff is 12. 24 and 12.
  { q: "Từ nào khác với các từ còn lại?", options: ["Táo", "Cam", "Cà rốt", "Lê"], ans: 2 },
  { q: "1, 1, 2, 3, 5, 8, 13, ...", options: ["15", "21", "25", "34"], ans: 1 },
  { q: "Cái gì luôn đến mà không bao giờ đến?", options: ["Ngày mai", "Ngày hôm qua", "Tương lai", "Hiện tại"], ans: 0 },
  { q: "Nếu bạn viết tất cả các số từ 1 đến 100, bạn sẽ viết bao nhiêu chữ số 9?", options: ["10", "11", "19", "20"], ans: 3 },
  { q: "Một cây gậy và một quả bóng giá 1.10$. Cây gậy đắt hơn quả bóng 1.00$. Quả bóng giá bao nhiêu?", options: ["0.05$", "0.10$", "1.00$", "0.50$"], ans: 0 },
  { q: "Nếu cần 5 máy để tạo ra 5 sản phẩm trong 5 phút, thì cần bao lâu để 100 máy tạo ra 100 sản phẩm?", options: ["5 phút", "20 phút", "100 phút", "50 phút"], ans: 0 },
  { q: "Trong một hồ nước có một mảng hoa súng. Mỗi ngày mảng hoa súng tăng gấp đôi. Nếu cần 48 ngày để hoa phủ kín hồ, cần bao lâu để phủ nửa hồ?", options: ["24 ngày", "47 ngày", "36 ngày", "12 ngày"], ans: 1 },
  { q: "Từ nào có nghĩa trái ngược với từ 'Khởi đầu'?", options: ["Kết thúc", "Bắt đầu", "Tiếp tục", "Tạm dừng"], ans: 0 },
  { q: "Tam giác có 3 cạnh. Hình lục giác có mấy cạnh?", options: ["4", "5", "6", "8"], ans: 2 }
];

// EQ uses Likert scale: 0: Rất không đồng ý -> 4: Rất đồng ý
// type: '+' means agreeing means higher EQ. '-' means agreeing means lower EQ.
// dim: empathy, selfReg (Self-Regulation), social (Social Skills), selfAwa (Self-Awareness)
const EQ_QUESTIONS = [
  { q: "Tôi thường nhận ra ngay khi một người bạn cảm thấy buồn, dù họ không nói ra.", type: "+", dim: "empathy" },
  { q: "Khi tức giận, tôi thường để cảm xúc lấn át và nói ra những điều khiến mình hối hận.", type: "-", dim: "selfReg" },
  { q: "Tôi cảm thấy thoải mái khi bắt chuyện với những người lạ trong một sự kiện.", type: "+", dim: "social" },
  { q: "Tôi luôn biết rõ điểm mạnh và điểm yếu của bản thân mình.", type: "+", dim: "selfAwa" },
  { q: "Tôi khó cảm nhận được nỗi đau của người khác nếu tôi chưa từng trải qua.", type: "-", dim: "empathy" },
  { q: "Tôi có thể giữ bình tĩnh và suy nghĩ logic ngay cả trong tình huống căng thẳng cao độ.", type: "+", dim: "selfReg" },
  { q: "Tôi thường xuyên xảy ra xung đột với đồng nghiệp hoặc bạn bè do hiểu lầm.", type: "-", dim: "social" },
  { q: "Tôi biết rõ nguyên nhân sâu xa khiến tâm trạng của mình thay đổi trong ngày.", type: "+", dim: "selfAwa" },
  { q: "Tôi sẵn sàng lắng nghe và cố gắng hiểu góc nhìn của người khác khi tranh luận.", type: "+", dim: "empathy" },
  { q: "Khi gặp thất bại, tôi thường đổ lỗi cho hoàn cảnh thay vì tự kiểm điểm.", type: "-", dim: "selfReg" },
  { q: "Mọi người thường tìm đến tôi để xin lời khuyên khi họ gặp rắc rối.", type: "+", dim: "social" },
  { q: "Tôi đôi khi không biết tại sao mình lại có phản ứng gay gắt với một số từ ngữ.", type: "-", dim: "selfAwa" },
  { q: "Tôi có thể thuyết phục người khác hợp tác với mình một cách dễ dàng.", type: "+", dim: "social" },
  { q: "Tôi cần nhiều thời gian để nguôi giận sau một cuộc cãi vã.", type: "-", dim: "selfReg" },
  { q: "Tôi có thể đọc được ngôn ngữ cơ thể của người khác để đoán ý họ.", type: "+", dim: "empathy" }
];

// ── TRẠNG THÁI ───────────────────────────────────────────────────

let state = {
  phase: 'intro', // intro, iq, eq, results
  iqQuestions: [],
  eqQuestions: [],
  currQ: 0,
  iqScoreRaw: 0,
  eqScores: { empathy: 0, selfReg: 0, social: 0, selfAwa: 0 },
  timer: null,
  timeLeft: 0,
  maxIqQuestions: 10,
  maxEqQuestions: 10,
  timePerIq: 30 // seconds per question
};

// ── UTILS ────────────────────────────────────────────────────────

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// ── RENDER CHÍNH ─────────────────────────────────────────────────

export function renderIQEQ(containerId = 'iqeqContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="iqeq-wrapper" id="iqeq-wrap">
      <!-- 1. Intro / Disclaimer -->
      <div class="iqeq-screen active" id="scr-intro">
        <div class="iqeq-intro-card">
          <div class="iqeq-intro-icon">🧠</div>
          <div>
            <div class="iqeq-intro-title">Đánh giá Trí tuệ & Cảm xúc (IQ & EQ)</div>
            <div class="iqeq-intro-desc">
              Bài kiểm tra này gồm 2 phần:<br>
              <strong>Phần 1: Trí thông minh (IQ)</strong> - Kiểm tra khả năng logic, toán học và tư duy (Có tính giờ).<br>
              <strong>Phần 2: Trí tuệ cảm xúc (EQ)</strong> - Đánh giá mức độ tự nhận thức và kỹ năng xã hội (Không tính giờ).
            </div>
          </div>
        </div>

        <div class="iqeq-disclaimer-box">
          <div class="iqeq-disclaimer-title">⚠️ MIỄN TRỪ TRÁCH NHIỆM</div>
          <div class="iqeq-disclaimer-body">
            Bài kiểm tra này chỉ mang tính chất <strong>tham khảo và giải trí</strong>. Kết quả được tính toán dựa trên một thuật toán mô phỏng nhỏ và <strong>KHÔNG</strong> thay thế cho các bài kiểm tra tâm lý học hoặc y khoa chuyên nghiệp do các chuyên gia cấp giấy phép thực hiện.<br><br>
            Chúng tôi không chịu trách nhiệm pháp lý cho bất kỳ quyết định, hành động hoặc cảm xúc nào của bạn dựa trên kết quả bài kiểm tra này.
          </div>
        </div>

        <label class="iqeq-checkbox-row">
          <input type="checkbox" id="iqeq-agree" />
          <div class="iqeq-checkbox-label">Tôi đã đọc, hiểu và đồng ý với điều khoản miễn trừ trách nhiệm ở trên.</div>
        </label>

        <button class="btn-primary" id="btn-start-test" disabled style="margin-top: 8px; width: 100%;">Bắt đầu kiểm tra</button>
      </div>

      <!-- 2. IQ Test -->
      <div class="iqeq-screen" id="scr-iq">
        <div class="iqeq-test-header">
          <div class="iqeq-test-phase-badge iq">Phần 1: Chỉ số IQ</div>
          <div class="iqeq-timer" id="iq-timer">00:00</div>
        </div>
        <div class="iqeq-progress-wrap">
          <div class="iqeq-progress-bar"><div class="iqeq-progress-fill" id="iq-prog-fill" style="width:0%;"></div></div>
          <div class="iqeq-progress-text" id="iq-prog-text">0/10</div>
        </div>
        
        <div class="iqeq-question-card">
          <div class="iqeq-q-category">TƯ DUY LOGIC</div>
          <div class="iqeq-q-text" id="iq-q-text">Câu hỏi hiển thị ở đây...</div>
          <div class="iqeq-options-grid" id="iq-options">
            <!-- Options injected here -->
          </div>
          <div class="iqeq-feedback-row" id="iq-feedback"></div>
        </div>
        
        <div class="iqeq-nav-row" style="justify-content: flex-end;">
          <button class="btn-primary" id="btn-next-iq" style="display:none;">Câu tiếp theo ➔</button>
        </div>
      </div>

      <!-- 3. EQ Test -->
      <div class="iqeq-screen" id="scr-eq">
        <div class="iqeq-test-header">
          <div class="iqeq-test-phase-badge eq">Phần 2: Chỉ số EQ</div>
        </div>
        <div class="iqeq-progress-wrap">
          <div class="iqeq-progress-bar"><div class="iqeq-progress-fill" id="eq-prog-fill" style="width:0%;"></div></div>
          <div class="iqeq-progress-text" id="eq-prog-text">0/10</div>
        </div>
        
        <div class="iqeq-question-card">
          <div class="iqeq-q-category">TÌNH HUỐNG CẢM XÚC</div>
          <div class="iqeq-q-text" id="eq-q-text">Câu hỏi hiển thị ở đây...</div>
          
          <div class="iqeq-likert-options" id="eq-options">
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

      <!-- 4. Results -->
      <div class="iqeq-screen" id="scr-results">
        <div class="iqeq-result-header">
          <div class="iqeq-result-header-title">Kết Quả Đánh Giá</div>
          <div class="iqeq-result-header-sub">Dưới đây là báo cáo chi tiết về năng lực của bạn</div>
        </div>
        
        <div class="iqeq-scores-row">
          <!-- IQ Score -->
          <div class="iqeq-score-card iq-card">
            <div class="iqeq-score-ring-wrap">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle class="iqeq-score-ring-bg" cx="60" cy="60" r="50"></circle>
                <circle class="iqeq-score-ring-fill" cx="60" cy="60" r="50" stroke="#60a5fa" stroke-dasharray="314" stroke-dashoffset="314" id="iq-ring"></circle>
              </svg>
              <div class="iqeq-score-ring-center">
                <div class="iqeq-score-value" id="iq-res-val">100</div>
                <div class="iqeq-score-unit">IQ</div>
              </div>
            </div>
            <div class="iqeq-score-label" id="iq-res-lbl">Mức Trung Bình</div>
            <div class="iqeq-score-sublabel" id="iq-res-sub">Tư duy logic ổn định</div>
          </div>
          
          <!-- EQ Score -->
          <div class="iqeq-score-card eq-card">
            <div class="iqeq-score-ring-wrap">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle class="iqeq-score-ring-bg" cx="60" cy="60" r="50"></circle>
                <circle class="iqeq-score-ring-fill" cx="60" cy="60" r="50" stroke="#34d399" stroke-dasharray="314" stroke-dashoffset="314" id="eq-ring"></circle>
              </svg>
              <div class="iqeq-score-ring-center">
                <div class="iqeq-score-value" id="eq-res-val">100</div>
                <div class="iqeq-score-unit">EQ</div>
              </div>
            </div>
            <div class="iqeq-score-label" id="eq-res-lbl">Cân Bằng</div>
            <div class="iqeq-score-sublabel" id="eq-res-sub">Quản lý cảm xúc tốt</div>
          </div>
        </div>

        <div class="iqeq-eq-breakdown">
          <div class="iqeq-eq-breakdown-title">Phân tích EQ chi tiết</div>
          
          <div class="iqeq-dim-row">
            <div class="iqeq-dim-name">Thấu cảm</div>
            <div class="iqeq-dim-bar-wrap"><div class="iqeq-dim-bar-fill" id="eq-bar-empathy" style="width:0%; background:#818cf8;"></div></div>
            <div class="iqeq-dim-score" id="eq-val-empathy">0%</div>
          </div>
          <div class="iqeq-dim-row">
            <div class="iqeq-dim-name">Tự điều chỉnh</div>
            <div class="iqeq-dim-bar-wrap"><div class="iqeq-dim-bar-fill" id="eq-bar-selfReg" style="width:0%; background:#34d399;"></div></div>
            <div class="iqeq-dim-score" id="eq-val-selfReg">0%</div>
          </div>
          <div class="iqeq-dim-row">
            <div class="iqeq-dim-name">Kỹ năng xã hội</div>
            <div class="iqeq-dim-bar-wrap"><div class="iqeq-dim-bar-fill" id="eq-bar-social" style="width:0%; background:#f472b6;"></div></div>
            <div class="iqeq-dim-score" id="eq-val-social">0%</div>
          </div>
          <div class="iqeq-dim-row">
            <div class="iqeq-dim-name">Tự nhận thức</div>
            <div class="iqeq-dim-bar-wrap"><div class="iqeq-dim-bar-fill" id="eq-bar-selfAwa" style="width:0%; background:#fbbf24;"></div></div>
            <div class="iqeq-dim-score" id="eq-val-selfAwa">0%</div>
          </div>
        </div>

        <div class="iqeq-result-disclaimer">
          Kết quả này được tính toán tự động và không có giá trị chẩn đoán y khoa. Điểm số có thể thay đổi tùy thuộc vào tâm trạng và điều kiện làm bài của bạn.
        </div>
        
        <button class="btn-secondary" id="btn-restart" style="width:100%;">Làm lại từ đầu</button>
      </div>
    </div>
  `;

  attachEvents();
}

function attachEvents() {
  const cbAgree = document.getElementById('iqeq-agree');
  const btnStart = document.getElementById('btn-start-test');
  const btnNextIq = document.getElementById('btn-next-iq');
  const btnRestart = document.getElementById('btn-restart');
  const eqBtns = document.querySelectorAll('.iqeq-likert-btn');

  if (cbAgree && btnStart) {
    cbAgree.addEventListener('change', (e) => {
      btnStart.disabled = !e.target.checked;
    });
    btnStart.addEventListener('click', startTest);
  }

  if (btnNextIq) {
    btnNextIq.addEventListener('click', nextIqQuestion);
  }

  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      renderIQEQ(); // Reset everything
    });
  }

  eqBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.currentTarget || e.target;
      const val = parseInt(targetBtn.dataset.val);
      handleEqAnswer(val, targetBtn);
    });
  });
}

function switchScreen(id) {
  document.querySelectorAll('.iqeq-screen').forEach(el => el.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

// ── LOGIC ────────────────────────────────────────────────────────

function startTest() {
  // Prep questions randomly
  state.iqQuestions = shuffle([...IQ_QUESTIONS]).slice(0, state.maxIqQuestions);
  state.eqQuestions = shuffle([...EQ_QUESTIONS]).slice(0, state.maxEqQuestions);
  
  state.currQ = 0;
  state.iqScoreRaw = 0;
  state.eqScores = { empathy: 0, selfReg: 0, social: 0, selfAwa: 0 };
  
  switchScreen('scr-iq');
  loadIqQuestion();
}

function loadIqQuestion() {
  const q = state.iqQuestions[state.currQ];
  document.getElementById('iq-prog-text').textContent = `${state.currQ + 1}/${state.maxIqQuestions}`;
  document.getElementById('iq-prog-fill').style.width = `${((state.currQ) / state.maxIqQuestions) * 100}%`;
  
  document.getElementById('iq-q-text').textContent = q.q;
  
  const optsGrid = document.getElementById('iq-options');
  optsGrid.innerHTML = '';
  document.getElementById('iq-feedback').classList.remove('show');
  document.getElementById('btn-next-iq').style.display = 'none';

  q.options.forEach((optText, idx) => {
    const btn = document.createElement('button');
    btn.className = 'iqeq-option-btn';
    btn.innerHTML = `<span class="iqeq-option-key">${String.fromCharCode(65 + idx)}</span> <span>${optText}</span>`;
    btn.onclick = () => handleIqAnswer(idx, btn);
    optsGrid.appendChild(btn);
  });

  // Start timer
  state.timeLeft = state.timePerIq;
  updateTimerUI();
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.timeLeft--;
    updateTimerUI();
    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      handleIqAnswer(-1, null); // timeout
    }
  }, 1000);
}

function updateTimerUI() {
  const tEl = document.getElementById('iq-timer');
  if(!tEl) return;
  const m = Math.floor(state.timeLeft / 60).toString().padStart(2, '0');
  const s = (state.timeLeft % 60).toString().padStart(2, '0');
  tEl.textContent = `${m}:${s}`;
  if (state.timeLeft <= 5) tEl.classList.add('warning');
  else tEl.classList.remove('warning');
}

function handleIqAnswer(selectedIdx, btnEl) {
  clearInterval(state.timer);
  const q = state.iqQuestions[state.currQ];
  const isCorrect = (selectedIdx === q.ans);
  
  if (isCorrect) state.iqScoreRaw++;

  // Disable all options and show correct answer
  const btns = document.querySelectorAll('#iq-options .iqeq-option-btn');
  btns.forEach((b, i) => {
    b.disabled = true;
    if (i === q.ans) b.classList.add('correct');
    else if (i === selectedIdx && !isCorrect) b.classList.add('incorrect');
  });

  const fb = document.getElementById('iq-feedback');
  if (selectedIdx === -1) {
    fb.textContent = '⏱ Hết thời gian!';
    fb.className = 'iqeq-feedback-row incorrect show';
  } else if (isCorrect) {
    fb.textContent = '✔️ Chính xác!';
    fb.className = 'iqeq-feedback-row correct show';
  } else {
    fb.textContent = '❌ Sai rồi.';
    fb.className = 'iqeq-feedback-row incorrect show';
  }

  document.getElementById('btn-next-iq').style.display = 'block';
}

function nextIqQuestion() {
  state.currQ++;
  if (state.currQ >= state.maxIqQuestions) {
    // move to EQ phase
    state.currQ = 0;
    switchScreen('scr-eq');
    loadEqQuestion();
  } else {
    loadIqQuestion();
  }
}

// ──────────────────────────────────────────
function loadEqQuestion() {
  const q = state.eqQuestions[state.currQ];
  document.getElementById('eq-prog-text').textContent = `${state.currQ + 1}/${state.maxEqQuestions}`;
  document.getElementById('eq-prog-fill').style.width = `${((state.currQ) / state.maxEqQuestions) * 100}%`;
  
  document.getElementById('eq-q-text').textContent = q.q;
  
  // reset likert
  const btns = document.querySelectorAll('.iqeq-likert-btn');
  btns.forEach(b => { b.classList.remove('selected'); b.disabled = false; });
}

function handleEqAnswer(val, clickedBtn) {
  const btns = document.querySelectorAll('.iqeq-likert-btn');
  btns.forEach(b => b.disabled = true);
  if (clickedBtn) clickedBtn.classList.add('selected');

  
  const q = state.eqQuestions[state.currQ];
  
  // Calculate score for this dimension. 0-4
  let score = val;
  if (q.type === '-') {
    score = 4 - val; // reverse
  }
  
  if (!state.eqScores[q.dim]) state.eqScores[q.dim] = { total: 0, count: 0 };
  state.eqScores[q.dim].total += score;
  state.eqScores[q.dim].count += 1;

  setTimeout(() => {
    state.currQ++;
    if (state.currQ >= state.maxEqQuestions) {
      calculateAndShowResults();
    } else {
      loadEqQuestion();
    }
  }, 400); // short delay to show selection
}

function calculateAndShowResults() {
  switchScreen('scr-results');
  
  // --- IQ Calc (Standardized: mean 100, SD 15) ---
  // Let's say getting 50% right is IQ 100. Max is IQ 135.
  const rawIq = state.iqScoreRaw;
  const iqPct = rawIq / state.maxIqQuestions;
  const calculatedIq = Math.round(70 + (iqPct * 65)); // range 70 -> 135
  
  let iqLbl = 'Bình Thường';
  if (calculatedIq > 120) iqLbl = 'Rất Cao';
  else if (calculatedIq > 110) iqLbl = 'Cao';
  else if (calculatedIq < 85) iqLbl = 'Thấp';
  
  document.getElementById('iq-res-val').textContent = calculatedIq;
  document.getElementById('iq-res-lbl').textContent = iqLbl;
  animateRing('iq-ring', iqPct);

  // --- EQ Calc ---
  let totalEqEq = 0;
  let totalEqCnt = 0;
  const dims = ['empathy', 'selfReg', 'social', 'selfAwa'];
  
  dims.forEach(d => {
    const s = state.eqScores[d];
    if(s && s.count > 0) {
      const p = s.total / (s.count * 4); // 0.0 to 1.0
      totalEqEq += p;
      totalEqCnt += 1;
      
      const pctStr = Math.round(p * 100) + '%';
      document.getElementById(`eq-bar-${d}`).style.width = pctStr;
      document.getElementById(`eq-val-${d}`).textContent = pctStr;
    }
  });
  
  const finalEqPct = totalEqEq / (totalEqCnt || 1);
  const calculatedEq = Math.round(50 + (finalEqPct * 100)); // range 50 -> 150
  
  let eqLbl = 'Cân Bằng';
  if (calculatedEq > 125) eqLbl = 'Rất Cao';
  else if (calculatedEq > 110) eqLbl = 'Cao';
  else if (calculatedEq < 85) eqLbl = 'Thấp';

  document.getElementById('eq-res-val').textContent = calculatedEq;
  document.getElementById('eq-res-lbl').textContent = eqLbl;
  animateRing('eq-ring', finalEqPct);
}

function animateRing(id, pct) {
  const ring = document.getElementById(id);
  if(!ring) return;
  const circumference = 314; // 2 * pi * r (r=50)
  const offset = circumference - (pct * circumference);
  
  // Need a small timeout to allow CSS transition to catch
  setTimeout(() => {
    ring.style.strokeDashoffset = offset;
  }, 100);
}
