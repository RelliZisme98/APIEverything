/**
 * components/iq-eq.js
 * Chức năng Kiểm tra IQ và EQ (Tách riêng)
 * - Câu hỏi ngẫu nhiên không lặp
 * - Bảng nhập Tên & Tuổi trước khi làm bài
 * - Ghi kết quả lặng lẽ vào DB (Supabase) qua /api/iqeq
 */

// ── NGÂN HÀNG ĐỀ THI IQ (30 CÂU HỎI) ──────────────────────────────
const IQ_POOL = [
  { q: "Số tiếp theo trong dãy: 2, 4, 8, 16, ...", options: ["24", "32", "30", "64"], ans: 1 },
  { q: "Chữ cái tiếp theo: A, C, E, G, ...", options: ["H", "I", "J", "K"], ans: 1 },
  { q: "Nếu tất cả A là B, tất cả B là C, thì tất cả A có phải là C không?", options: ["Chắc chắn đúng", "Chắc chắn sai", "Không xác định được", "Đôi khi đúng"], ans: 0 },
  { q: "Một chiếc áo giá 20$. Giảm giá 20%, giá mới là bao nhiêu?", options: ["15$", "16$", "18$", "10$"], ans: 1 },
  { q: "Số nào không thuộc nhóm số nguyên tố: 3, 5, 7, 9, 11, 13?", options: ["5", "7", "9", "11"], ans: 2 },
  { q: "Mary 16 tuổi, gấp 4 lần tuổi em trai. Hỏi khi Mary gấp 2 lần tuổi em trai thì Mary bao nhiêu tuổi?", options: ["20", "24", "26", "28"], ans: 1 },
  { q: "Từ nào khác loại nhất với các từ còn lại?", options: ["Táo", "Cam", "Cà rốt", "Lê"], ans: 2 },
  { q: "Số tiếp theo trong dãy Fibonacci: 1, 1, 2, 3, 5, 8, 13, ...", options: ["15", "21", "25", "34"], ans: 1 },
  { q: "Cái gì luôn đến vào ngày mai nhưng không bao giờ đến hôm nay?", options: ["Ngày mai", "Ngày hôm qua", "Tương lai", "Quá khứ"], ans: 0 },
  { q: "Có bao nhiêu chữ số 9 trong dãy số từ 1 đến 100?", options: ["10", "11", "19", "20"], ans: 3 },
  { q: "Một cây gậy và một quả bóng giá 1.10$. Cây gậy đắt hơn quả bóng 1.00$. Quả bóng giá bao nhiêu?", options: ["0.05$", "0.10$", "1.00$", "0.50$"], ans: 0 },
  { q: "5 máy tạo ra 5 sản phẩm trong 5 phút. Hỏi cần bao lâu để 100 máy tạo ra 100 sản phẩm?", options: ["5 phút", "20 phút", "100 phút", "50 phút"], ans: 0 },
  { q: "Mảng súng phủ kín hồ sau 48 ngày. Mỗi ngày mảng súng tăng gấp đôi diện tích. Cần mấy ngày để phủ nửa hồ?", options: ["24 ngày", "47 ngày", "36 ngày", "12 ngày"], ans: 1 },
  { q: "Từ nào trái nghĩa với từ 'Khởi đầu'?", options: ["Kết thúc", "Bắt đầu", "Tiếp tục", "Tạm dừng"], ans: 0 },
  { q: "Hình tam giác có 3 cạnh. Hình lục giác có mấy cạnh?", options: ["4", "5", "6", "8"], ans: 2 },
  { q: "Số tiếp theo trong dãy: 3, 5, 9, 17, ...", options: ["25", "33", "35", "41"], ans: 1 },
  { q: "Nếu quay ngược kim đồng hồ 135 độ từ vị trí 12 giờ, kim chỉ mấy giờ?", options: ["7h30", "4h30", "9h00", "10h30"], ans: 0 },
  { q: "Mặt trời mọc ở hướng Đông, lặn ở hướng Tây. Nếu bạn đi về hướng Đông rồi rẽ trái, bạn sẽ hướng về đâu?", options: ["Bắc", "Nam", "Tây", "Đông Bắc"], ans: 0 },
  { q: "Sách đối với Đọc giống như Nhạc đối với...", options: ["Hát", "Nghe", "Đàn", "Viết"], ans: 1 },
  { q: "Số nào thích hợp thay thế dấu chấm hỏi: 8 -> 64, 9 -> 81, 10 -> ?", options: ["90", "100", "110", "120"], ans: 1 },
  { q: "Con cua có 8 chân và 2 càng. Con nhện có mấy chân?", options: ["6", "8", "10", "12"], ans: 1 },
  { q: "Một năm có 365 ngày. Năm nhuận có bao nhiêu ngày?", options: ["364", "365", "366", "367"], ans: 2 },
  { q: "Nếu ngày hôm kia là thứ Hai, thì ngày mai là thứ mấy?", options: ["Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"], ans: 1 },
  { q: "Tìm số lớn nhất có 2 chữ số khác nhau?", options: ["99", "98", "97", "96"], ans: 1 },
  { q: "Từ nào viết đúng chính tả?", options: ["Sản xuất", "Sản suất", "Sản sất", "Xản xuất"], ans: 0 },
  { q: "Bố của Mary có 5 người con gái: Nana, Nene, Nini, Nono. Hỏi người con thứ 5 tên gì?", options: ["Nunu", "Nyny", "Mary", "Nene"], ans: 2 },
  { q: "Một nhóm người có 5 người bắt tay nhau đôi một. Hỏi có tổng cộng bao nhiêu cái bắt tay?", options: ["5", "10", "15", "20"], ans: 1 },
  { q: "Số tiếp theo trong dãy: 100, 90, 81, 73, ...", options: ["65", "66", "67", "68"], ans: 1 },
  { q: "Một cái bể nước mất 6 giờ để đầy nếu dùng vòi A, mất 12 giờ nếu dùng vòi B. Hỏi mở cả hai vòi mất bao lâu?", options: ["3 giờ", "4 giờ", "5 giờ", "6 giờ"], ans: 1 },
  { q: "Nếu đảo ngược các chữ cái trong từ 'ROMA', bạn sẽ được từ nào có nghĩa là tình yêu trong tiếng Latin/Ý?", options: ["AMOR", "MOAR", "RAMO", "ARMO"], ans: 0 }
];

// ── NGÂN HÀNG ĐỀ THI EQ (25 CÂU HỎI) ──────────────────────────────
// type: '+' (càng đồng ý càng cao), '-' (càng đồng ý càng thấp)
// dim: empathy (thấu cảm), selfReg (tự kiểm soát), social (kỹ năng xã hội), selfAwa (tự nhận thức)
const EQ_POOL = [
  { q: "Tôi nhận ra ngay khi bạn bè buồn hay lo lắng dù họ cố giấu.", type: "+", dim: "empathy" },
  { q: "Khi nổi giận, tôi nói ra những lời tổn thương mà sau đó thấy hối hận.", type: "-", dim: "selfReg" },
  { q: "Tôi cảm thấy thoải mái khi bắt chuyện với người lạ tại các sự kiện.", type: "+", dim: "social" },
  { q: "Tôi hiểu rất rõ điểm mạnh và giới hạn năng lực của chính mình.", type: "+", dim: "selfAwa" },
  { q: "Tôi thấy khó chia sẻ hay cảm thông với những bất hạnh mà tôi chưa từng gặp.", type: "-", dim: "empathy" },
  { q: "Tôi giữ được bình tĩnh và suy nghĩ thấu đáo dưới áp lực lớn.", type: "+", dim: "selfReg" },
  { q: "Tôi thường hay hiểu lầm hoặc cãi vã với đồng nghiệp và bạn bè.", type: "-", dim: "social" },
  { q: "Tôi biết rõ nguyên nhân sâu xa của sự thay đổi cảm xúc của mình.", type: "+", dim: "selfAwa" },
  { q: "Tôi cố gắng đặt mình vào vị trí đối phương khi có tranh chấp bất đồng.", type: "+", dim: "empathy" },
  { q: "Khi thất bại, tôi thường đổ lỗi cho hoàn cảnh thay vì nhìn nhận lỗi sai bản thân.", type: "-", dim: "selfReg" },
  { q: "Mọi người thường tìm đến tôi làm cầu nối giải quyết xung đột.", type: "+", dim: "social" },
  { q: "Tôi có những phản ứng bộc phát mà chính tôi cũng không giải thích nổi nguyên nhân.", type: "-", dim: "selfAwa" },
  { q: "Tôi dễ thuyết phục và tạo được sự đồng thuận trong tập thể.", type: "+", dim: "social" },
  { q: "Tôi mất rất nhiều thời gian để nguôi giận sau một tranh cãi gay gắt.", type: "-", dim: "selfReg" },
  { q: "Tôi có khả năng phán đoán trạng thái tâm lý qua ánh mắt và cử chỉ người khác.", type: "+", dim: "empathy" },
  { q: "Tôi cảm thấy khó chấp nhận khi nhận được ý kiến đóng góp trái chiều.", type: "-", dim: "selfReg" },
  { q: "Tôi thích lắng nghe câu chuyện của người khác hơn là chỉ nói về bản thân.", type: "+", dim: "empathy" },
  { q: "Tôi nhận biết được cơ thể mình đang căng thẳng trước khi tâm trí tôi kịp nhận ra.", type: "+", dim: "selfAwa" },
  { q: "Tôi thường cảm thấy lạc lõng và khó hòa nhập khi tham gia nhóm mới.", type: "-", dim: "social" },
  { q: "Tôi có thể dễ dàng chuyển hướng cuộc trò chuyện khi thấy đối phương không thoải mái.", type: "+", dim: "social" },
  { q: "Tôi thường ra quyết định dựa trên cảm xúc nhất thời hơn là phân tích.", type: "-", dim: "selfReg" },
  { q: "Tôi biết khi nào cần nói lời từ chối mà không làm người khác tổn thương.", type: "+", dim: "social" },
  { q: "Tôi hay nghi ngờ giá trị và khả năng của bản thân khi gặp thử thách nhỏ.", type: "-", dim: "selfAwa" },
  { q: "Tôi dễ xúc động khi xem những bộ phim hay đọc những câu chuyện buồn.", type: "+", dim: "empathy" },
  { q: "Tôi luôn tự nhắc nhở bản thân về mục tiêu dài hạn khi đối mặt khó khăn trước mắt.", type: "+", dim: "selfReg" }
];

// ── TRẠNG THÁI KIỂM TRA ──────────────────────────────────────────
let activeState = {
  type: 'IQ', // IQ or EQ
  questions: [],
  currIdx: 0,
  iqScoreRaw: 0,
  eqScores: { empathy: 0, selfReg: 0, social: 0, selfAwa: 0 },
  timer: null,
  timeLeft: 0,
  limitQuestions: 10,
  timeLimitSec: 30, // 30s mỗi câu IQ
  userName: '',
  userAge: ''
};

// ── UTILS ────────────────────────────────────────────────────────
function getShuffledQuestions(pool, count) {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Gửi dữ liệu âm thầm lên database
async function saveToDatabaseQuietly(payload) {
  try {
    await fetch('/api/iqeq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('Silent database save omitted/failed: ', err.message);
  }
}

// ── RENDER CHỨC NĂNG KIỂM TRA IQ ───────────────────────────────────
export function renderIQ(containerId = 'iqContent') {
  activeState.type = 'IQ';
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
              Bài trắc nghiệm gồm <strong>10 câu hỏi logic</strong> được chọn ngẫu nhiên từ ngân hàng đề.<br>
              Mỗi câu hỏi có giới hạn thời gian trả lời là <strong>30 giây</strong>.
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
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

        <button class="btn-primary" id="iq-btn-start" disabled style="width: 100%;">Bắt đầu kiểm tra IQ</button>
      </div>

      <!-- Màn hình làm bài -->
      <div class="iqeq-screen" id="iq-scr-test">
        <div class="iqeq-test-header">
          <div class="iqeq-test-phase-badge iq">Kiểm tra IQ</div>
          <div class="iqeq-timer" id="iq-timer-lbl">00:30</div>
        </div>
        <div class="iqeq-progress-wrap">
          <div class="iqeq-progress-bar"><div class="iqeq-progress-fill" id="iq-bar-fill" style="width:0%;"></div></div>
          <div class="iqeq-progress-text" id="iq-progress-lbl">0/10</div>
        </div>
        
        <div class="iqeq-question-card">
          <div class="iqeq-q-category" id="iq-q-cat">TƯ DUY MẪU HÌNH & CHUỖI SỐ</div>
          <div class="iqeq-q-text" id="iq-q-txt">...</div>
          <div class="iqeq-options-grid" id="iq-options-wrap">
            <!-- options -->
          </div>
          <div class="iqeq-feedback-row" id="iq-feedback-lbl"></div>
        </div>
        
        <div class="iqeq-nav-row" style="justify-content: flex-end;">
          <button class="btn-primary" id="iq-btn-next" style="display:none;">Câu tiếp theo ➔</button>
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
          <div class="iqeq-score-sublabel" id="iq-res-desc">Đang tải biểu đồ dữ liệu...</div>
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
  const next = document.getElementById('iq-btn-next');
  const restart = document.getElementById('iq-btn-restart');

  if (agree && start) {
    agree.onchange = (e) => {
      start.disabled = !e.target.checked;
    };
    start.onclick = startIQTest;
  }

  if (next) next.onclick = nextIQQuestion;
  if (restart) restart.onclick = () => renderIQ(containerId);
}

function startIQTest() {
  const nameInput = document.getElementById('iq-user-name');
  const ageInput = document.getElementById('iq-user-age');

  activeState.userName = nameInput ? nameInput.value.trim() || 'Ẩn danh' : 'Ẩn danh';
  activeState.userAge = ageInput ? ageInput.value.trim() || 'Chưa rõ' : 'Chưa rõ';

  // Shuffle & pick 10
  activeState.questions = getShuffledQuestions(IQ_POOL, activeState.limitQuestions);
  activeState.currIdx = 0;
  activeState.iqScoreRaw = 0;

  // UI transition
  document.getElementById('iq-scr-intro').classList.remove('active');
  document.getElementById('iq-scr-test').classList.add('active');

  loadIQQuestion();
}

function loadIQQuestion() {
  const q = activeState.questions[activeState.currIdx];
  
  // Update progress
  document.getElementById('iq-progress-lbl').textContent = `${activeState.currIdx + 1}/${activeState.limitQuestions}`;
  document.getElementById('iq-bar-fill').style.width = `${(activeState.currIdx / activeState.limitQuestions) * 100}%`;

  document.getElementById('iq-q-txt').textContent = q.q;

  // Options
  const wrap = document.getElementById('iq-options-wrap');
  wrap.innerHTML = '';
  document.getElementById('iq-feedback-lbl').classList.remove('show');
  document.getElementById('iq-btn-next').style.display = 'none';

  q.options.forEach((optText, idx) => {
    const btn = document.createElement('button');
    btn.className = 'iqeq-option-btn';
    btn.innerHTML = `<span class="iqeq-option-key">${String.fromCharCode(65 + idx)}</span> <span>${optText}</span>`;
    btn.onclick = () => submitIQAnswer(idx, btn);
    wrap.appendChild(btn);
  });

  // Start timer
  activeState.timeLeft = activeState.timeLimitSec;
  updateIQTimerUI();
  clearInterval(activeState.timer);
  activeState.timer = setInterval(() => {
    activeState.timeLeft--;
    updateIQTimerUI();
    if (activeState.timeLeft <= 0) {
      clearInterval(activeState.timer);
      submitIQAnswer(-1, null); // Timeout
    }
  }, 1000);
}

function updateIQTimerUI() {
  const lbl = document.getElementById('iq-timer-lbl');
  if (!lbl) return;
  const s = activeState.timeLeft.toString().padStart(2, '0');
  lbl.textContent = `00:${s}`;
  if (activeState.timeLeft <= 5) lbl.classList.add('warning');
  else lbl.classList.remove('warning');
}

function submitIQAnswer(selectedIdx, btnEl) {
  clearInterval(activeState.timer);
  const q = activeState.questions[activeState.currIdx];
  const isCorrect = (selectedIdx === q.ans);

  if (isCorrect) activeState.iqScoreRaw++;

  // Visual options state
  const btns = document.querySelectorAll('#iq-options-wrap .iqeq-option-btn');
  btns.forEach((b, i) => {
    b.disabled = true;
    if (i === q.ans) b.classList.add('correct');
    else if (i === selectedIdx && !isCorrect) b.classList.add('incorrect');
  });

  const fb = document.getElementById('iq-feedback-lbl');
  if (selectedIdx === -1) {
    fb.textContent = '⏱ Hết thời gian câu hỏi này!';
    fb.className = 'iqeq-feedback-row incorrect show';
  } else if (isCorrect) {
    fb.textContent = '✔️ Câu trả lời hoàn toàn chính xác!';
    fb.className = 'iqeq-feedback-row correct show';
  } else {
    fb.textContent = '❌ Không đúng rồi!';
    fb.className = 'iqeq-feedback-row incorrect show';
  }

  document.getElementById('iq-btn-next').style.display = 'block';
}

function nextIQQuestion() {
  activeState.currIdx++;
  if (activeState.currIdx >= activeState.limitQuestions) {
    showIQResults();
  } else {
    loadIQQuestion();
  }
}

function showIQResults() {
  document.getElementById('iq-scr-test').classList.remove('active');
  document.getElementById('iq-scr-result').classList.add('active');

  const scorePct = activeState.iqScoreRaw / activeState.limitQuestions;
  const iqVal = Math.round(75 + (scorePct * 65)); // 75 - 140

  let classification = 'Bình Thường';
  let desc = 'Tư duy logic ổn định, phản xạ thông tin nhanh chóng.';
  if (iqVal >= 130) {
    classification = 'Thiên Tài / Xuất Chúng';
    desc = 'Sở hữu trí thông minh siêu phàm, phân tích xuất sắc mọi dữ kiện phức tạp.';
  } else if (iqVal >= 115) {
    classification = 'Trí Tuệ Cao';
    desc = 'Tư duy nhạy bén và khả năng xâu chuỗi thông tin rất tốt.';
  } else if (iqVal < 90) {
    classification = 'Cận Trung Bình';
    desc = 'Khả năng tư duy logic cần được mài giũa thêm qua luyện tập.';
  }

  document.getElementById('iq-res-value').textContent = iqVal;
  document.getElementById('iq-res-class').textContent = classification;
  document.getElementById('iq-res-desc').textContent = desc;

  // Set ring animation
  const ring = document.getElementById('iq-svg-ring');
  if (ring) {
    const circum = 314;
    ring.style.strokeDashoffset = circum - (scorePct * circum);
  }

  // Quiet DB post
  saveToDatabaseQuietly({
    name: activeState.userName,
    age: activeState.userAge,
    test_type: 'IQ',
    score: iqVal,
    raw_correct: activeState.iqScoreRaw,
    max_score: 140,
    answers_json: JSON.stringify(activeState.questions.map(q => q.q)),
    created_at: new Date().toISOString()
  });
}


// ── RENDER CHỨC NĂNG KIỂM TRA EQ ───────────────────────────────────
export function renderEQ(containerId = 'eqContent') {
  activeState.type = 'EQ';
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="iqeq-wrapper">
      <!-- Màn hình nhập thông tin & miễn trừ trách nhiệm -->
      <div class="iqeq-screen active" id="eq-scr-intro">
        <div class="iqeq-intro-card">
          <div class="iqeq-intro-icon">❤️</div>
          <div>
            <div class="iqeq-intro-title">Bài Kiểm Tra Trí Tuệ Cảm Xúc (EQ Test)</div>
            <div class="iqeq-intro-desc">
              Bài trắc nghiệm gồm <strong>10 câu hỏi tình huống cảm xúc</strong>.<br>
              Bạn sẽ trả lời bằng cách tự đánh giá theo mức độ đồng tình của bản thân (Likert Scale).
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
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

        <button class="btn-primary" id="eq-btn-start" disabled style="width: 100%;">Bắt đầu kiểm tra EQ</button>
      </div>

      <!-- Màn hình làm bài -->
      <div class="iqeq-screen" id="eq-scr-test">
        <div class="iqeq-test-header">
          <div class="iqeq-test-phase-badge eq">Kiểm tra EQ</div>
        </div>
        <div class="iqeq-progress-wrap">
          <div class="iqeq-progress-bar"><div class="iqeq-progress-fill" id="eq-bar-fill" style="width:0%;"></div></div>
          <div class="iqeq-progress-text" id="eq-progress-lbl">0/10</div>
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

  if (agree && start) {
    agree.onchange = (e) => {
      start.disabled = !e.target.checked;
    };
    start.onclick = startEQTest;
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

function startEQTest() {
  const nameInput = document.getElementById('eq-user-name');
  const ageInput = document.getElementById('eq-user-age');

  activeState.userName = nameInput ? nameInput.value.trim() || 'Ẩn danh' : 'Ẩn danh';
  activeState.userAge = ageInput ? ageInput.value.trim() || 'Chưa rõ' : 'Chưa rõ';

  // Shuffle & pick 10
  activeState.questions = getShuffledQuestions(EQ_POOL, activeState.limitQuestions);
  activeState.currIdx = 0;
  activeState.eqScores = { empathy: { total: 0, count: 0 }, selfReg: { total: 0, count: 0 }, social: { total: 0, count: 0 }, selfAwa: { total: 0, count: 0 } };

  // UI transition
  document.getElementById('eq-scr-intro').classList.remove('active');
  document.getElementById('eq-scr-test').classList.add('active');

  loadEQQuestion();
}

function loadEQQuestion() {
  const q = activeState.questions[activeState.currIdx];

  // Update progress
  document.getElementById('eq-progress-lbl').textContent = `${activeState.currIdx + 1}/${activeState.limitQuestions}`;
  document.getElementById('eq-bar-fill').style.width = `${(activeState.currIdx / activeState.limitQuestions) * 100}%`;

  document.getElementById('eq-q-txt').textContent = q.q;

  // Reset likert buttons
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

  const q = activeState.questions[activeState.currIdx];
  let score = val;
  if (q.type === '-') {
    score = 4 - val; // Đảo ngược điểm
  }

  // Update score
  activeState.eqScores[q.dim].total += score;
  activeState.eqScores[q.dim].count += 1;

  setTimeout(() => {
    activeState.currIdx++;
    if (activeState.currIdx >= activeState.limitQuestions) {
      showEQResults();
    } else {
      loadEQQuestion();
    }
  }, 350);
}

function showEQResults() {
  document.getElementById('eq-scr-test').classList.remove('active');
  document.getElementById('eq-scr-result').classList.add('active');

  // Calculate final score
  let totalEqSum = 0;
  let totalEqCount = 0;
  const dims = ['empathy', 'selfReg', 'social', 'selfAwa'];

  dims.forEach(d => {
    const s = activeState.eqScores[d];
    if (s && s.count > 0) {
      const p = s.total / (s.count * 4); // 0.0 to 1.0
      totalEqSum += p;
      totalEqCount += 1;

      const pctStr = Math.round(p * 100) + '%';
      document.getElementById(`eq-bar-${d}`).style.width = pctStr;
      document.getElementById(`eq-lbl-${d}`).textContent = pctStr;
    }
  });

  const finalPct = totalEqSum / (totalEqCount || 1);
  const eqValue = Math.round(60 + (finalPct * 80)); // 60 - 140

  let classification = 'Trung Bình';
  if (eqValue >= 120) classification = 'Cực Kỳ Nhạy Bén / Cao';
  else if (eqValue >= 100) classification = 'Tốt / Cân Bằng';
  else if (eqValue < 80) classification = 'Cần Cải Thiện';

  document.getElementById('eq-res-value').textContent = eqValue;
  document.getElementById('eq-res-class').textContent = classification;

  // Set ring animation
  const ring = document.getElementById('eq-svg-ring');
  if (ring) {
    const circum = 314;
    ring.style.strokeDashoffset = circum - (finalPct * circum);
  }

  // Quiet DB post
  saveToDatabaseQuietly({
    name: activeState.userName,
    age: activeState.userAge,
    test_type: 'EQ',
    score: eqValue,
    raw_correct: 0,
    max_score: 140,
    answers_json: JSON.stringify(activeState.questions.map(q => q.q)),
    created_at: new Date().toISOString()
  });
}
