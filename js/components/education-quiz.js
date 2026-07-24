/* ── Education Quiz Component ── */
/* Câu hỏi trắc nghiệm các môn học theo từng lớp (1-12) */

const SUBJECTS = {
  toan: { name: 'Toán', icon: 'fas fa-square-root-alt', color: '#5e6ad2' },
  ly:   { name: 'Vật Lý', icon: 'fas fa-atom', color: '#4fc3f7' },
  hoa:  { name: 'Hóa Học', icon: 'fas fa-flask', color: '#ef5350' },
  sinh: { name: 'Sinh Học', icon: 'fas fa-leaf', color: '#27a644' },
  van:  { name: 'Ngữ Văn', icon: 'fas fa-feather-alt', color: '#ffca28' },
  anh:  { name: 'Tiếng Anh', icon: 'fas fa-globe-americas', color: '#828fff' },
  su:   { name: 'Lịch Sử', icon: 'fas fa-landmark', color: '#ff7043' },
  dia:  { name: 'Địa Lý', icon: 'fas fa-globe-asia', color: '#34d399' },
  gdcd: { name: 'GDCD', icon: 'fas fa-balance-scale', color: '#fbbf24' },
  tin:  { name: 'Tin Học', icon: 'fas fa-laptop-code', color: '#60a5fa' },
};

const GRADE_LABELS = {
  1: 'Lớp 1', 2: 'Lớp 2', 3: 'Lớp 3', 4: 'Lớp 4',
  5: 'Lớp 5', 6: 'Lớp 6', 7: 'Lớp 7', 8: 'Lớp 8',
  9: 'Lớp 9', 10: 'Lớp 10', 11: 'Lớp 11', 12: 'Lớp 12',
};

// Subject availability by grade level
const GRADE_SUBJECTS = {
  1: ['toan', 'van', 'anh'],
  2: ['toan', 'van', 'anh'],
  3: ['toan', 'van', 'anh'],
  4: ['toan', 'van', 'anh', 'su', 'dia'],
  5: ['toan', 'van', 'anh', 'su', 'dia'],
  6: ['toan', 'van', 'anh', 'su', 'dia', 'sinh', 'tin', 'gdcd'],
  7: ['toan', 'van', 'anh', 'su', 'dia', 'sinh', 'tin', 'gdcd'],
  8: ['toan', 'van', 'anh', 'su', 'dia', 'sinh', 'ly', 'hoa', 'tin', 'gdcd'],
  9: ['toan', 'van', 'anh', 'su', 'dia', 'sinh', 'ly', 'hoa', 'tin', 'gdcd'],
  10: ['toan', 'van', 'anh', 'su', 'dia', 'sinh', 'ly', 'hoa', 'tin', 'gdcd'],
  11: ['toan', 'van', 'anh', 'su', 'dia', 'sinh', 'ly', 'hoa', 'tin', 'gdcd'],
  12: ['toan', 'van', 'anh', 'su', 'dia', 'sinh', 'ly', 'hoa', 'tin', 'gdcd'],
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

let _state = {
  view: 'grades', // 'grades' | 'subjects' | 'quiz' | 'results'
  selectedGrade: null,
  selectedSubject: null,
  questions: [],
  currentIndex: 0,
  answers: [],   // user answers per question index
  answered: false, // whether current question has been answered
  history: JSON.parse(localStorage.getItem('edu_quiz_history') || '[]'),
};

function _el(id) { return document.getElementById(id); }

/* ═══════════════════════════════════════════
   RENDER ENTRY
   ═══════════════════════════════════════════ */
export function renderEducationQuiz() {
  const root = _el('educationQuizContent');
  if (!root) return;
  _renderView(root);
}

function _renderView(root) {
  switch (_state.view) {
    case 'grades':   _renderGrades(root); break;
    case 'subjects': _renderSubjects(root); break;
    case 'quiz':     _renderQuiz(root); break;
    case 'results':  _renderResults(root); break;
    default:         _renderGrades(root);
  }
}

/* ═══════════════════════════════════════════
   VIEW: GRADE SELECTOR
   ═══════════════════════════════════════════ */
function _renderGrades(root) {
  const historyHTML = _state.history.length > 0 ? `
    <div style="margin-top: 32px;">
      <div class="edu-section-header">
        <div class="edu-section-title"><i class="fas fa-history"></i> Lịch Sử Làm Bài</div>
        <button class="edu-btn edu-btn-secondary" onclick="window._eduClearHistory()" style="font-size:12px;padding:6px 14px;">
          <i class="fas fa-trash-alt"></i> Xóa
        </button>
      </div>
      <div style="overflow-x:auto;">
        <table class="edu-history-table">
          <thead><tr>
            <th>Thời gian</th>
            <th>Lớp</th>
            <th>Môn</th>
            <th>Điểm</th>
            <th>Kết quả</th>
          </tr></thead>
          <tbody>
            ${_state.history.slice(0, 10).map(h => `
              <tr>
                <td>${h.date}</td>
                <td>Lớp ${h.grade}</td>
                <td>${SUBJECTS[h.subject]?.name || h.subject}</td>
                <td><strong style="color:${h.correct/h.total >= 0.7 ? 'var(--accent-green)' : h.correct/h.total >= 0.4 ? 'var(--accent-yellow)' : 'var(--accent-red)'}">${h.correct}/${h.total}</strong></td>
                <td>${Math.round(h.correct / h.total * 100)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  ` : '';

  root.innerHTML = `
    <div class="edu-section-header">
      <div class="edu-section-title"><i class="fas fa-graduation-cap"></i> Chọn Lớp Học</div>
    </div>
    <p style="color:var(--text-muted);font-size:14px;margin-bottom:16px;">Chọn lớp để bắt đầu làm bài trắc nghiệm các môn học</p>

    <div class="edu-grade-grid">
      ${[1,2,3,4,5,6,7,8,9,10,11,12].map(g => `
        <div class="edu-grade-card" onclick="window._eduSelectGrade(${g})">
          <div class="edu-grade-number">${g}</div>
          <div class="edu-grade-label">Lớp ${g}</div>
        </div>
      `).join('')}
    </div>

    ${historyHTML}
  `;
}

/* ═══════════════════════════════════════════
   VIEW: SUBJECT SELECTOR
   ═══════════════════════════════════════════ */
function _renderSubjects(root) {
  const grade = _state.selectedGrade;
  const subjects = GRADE_SUBJECTS[grade] || [];

  root.innerHTML = `
    <div class="edu-breadcrumb">
      <button class="edu-breadcrumb-item" onclick="window._eduGoTo('grades')"><i class="fas fa-home"></i> Trang chủ</button>
      <span class="edu-breadcrumb-sep">›</span>
      <span class="edu-breadcrumb-current">Lớp ${grade} — Chọn Môn Học</span>
    </div>

    <div class="edu-section-header">
      <div class="edu-section-title"><i class="fas fa-book-open"></i> Môn Học — Lớp ${grade}</div>
    </div>

    <div class="edu-subject-grid">
      ${subjects.map(key => {
        const s = SUBJECTS[key];
        return `
          <div class="edu-subject-card" data-subject="${key}" onclick="window._eduSelectSubject('${key}')">
            <div class="subject-icon"><i class="${s.icon}"></i></div>
            <div class="subject-info">
              <div class="subject-name">${s.name}</div>
              <div class="subject-count">Trắc nghiệm</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    ${subjects.length === 0 ? `
      <div class="edu-empty-state">
        <i class="fas fa-book"></i>
        <p>Chưa có môn học nào cho lớp ${grade}</p>
      </div>
    ` : ''}
  `;
}

/* ═══════════════════════════════════════════
   VIEW: QUIZ
   ═══════════════════════════════════════════ */
function _renderQuiz(root) {
  const { questions, currentIndex, answers, answered } = _state;

  if (questions.length === 0) {
    root.innerHTML = `
      <div class="edu-breadcrumb">
        <button class="edu-breadcrumb-item" onclick="window._eduGoTo('grades')"><i class="fas fa-home"></i> Trang chủ</button>
        <span class="edu-breadcrumb-sep">›</span>
        <button class="edu-breadcrumb-item" onclick="window._eduGoTo('subjects')">Lớp ${_state.selectedGrade}</button>
        <span class="edu-breadcrumb-sep">›</span>
        <span class="edu-breadcrumb-current">${SUBJECTS[_state.selectedSubject]?.name}</span>
      </div>
      <div class="edu-loading">
        <div class="edu-spinner"></div>
        <p>Đang tải câu hỏi...</p>
      </div>
    `;
    return;
  }

  const q = questions[currentIndex];
  const total = questions.length;
  const progress = ((currentIndex + (answered ? 1 : 0)) / total * 100).toFixed(0);
  const userAnswer = answers[currentIndex];

  root.innerHTML = `
    <div class="edu-breadcrumb">
      <button class="edu-breadcrumb-item" onclick="window._eduGoTo('grades')"><i class="fas fa-home"></i> Trang chủ</button>
      <span class="edu-breadcrumb-sep">›</span>
      <button class="edu-breadcrumb-item" onclick="window._eduGoTo('subjects')">Lớp ${_state.selectedGrade}</button>
      <span class="edu-breadcrumb-sep">›</span>
      <span class="edu-breadcrumb-current">${SUBJECTS[_state.selectedSubject]?.name}</span>
    </div>

    <div class="edu-quiz-container">
      <div class="edu-progress-wrap">
        <div class="edu-progress-bar">
          <div class="edu-progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="edu-progress-text">${currentIndex + 1}/${total}</div>
      </div>

      <div class="edu-question-card">
        <div class="edu-question-header">
          <span class="edu-question-number">Câu ${currentIndex + 1}</span>
          <span class="edu-question-badge ${q.difficulty || 'medium'}">${q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</span>
        </div>

        <div class="edu-question-text">${_escHtml(q.question)}</div>

        <div class="edu-options">
          ${q.options.map((opt, i) => {
            let cls = 'edu-option';
            if (answered) {
              cls += ' disabled';
              if (i === q.answer) cls += ' correct';
              else if (i === userAnswer && i !== q.answer) cls += ' wrong';
            } else if (userAnswer === i) {
              cls += ' selected';
            }
            return `
              <div class="${cls}" onclick="window._eduSelectAnswer(${i})">
                <span class="edu-option-letter">${OPTION_LETTERS[i]}</span>
                <span>${_escHtml(opt)}</span>
              </div>
            `;
          }).join('')}
        </div>

        ${answered && q.explanation ? `
          <div class="edu-explanation">
            <i class="fas fa-lightbulb"></i> ${_escHtml(q.explanation)}
          </div>
        ` : ''}

        <div class="edu-actions">
          ${!answered ? `
            <button class="edu-btn edu-btn-primary" onclick="window._eduConfirmAnswer()" ${userAnswer == null ? 'disabled' : ''}>
              Xác nhận
            </button>
          ` : `
            <button class="edu-btn edu-btn-primary" onclick="window._eduNextQuestion()">
              ${currentIndex < total - 1 ? 'Câu tiếp theo →' : 'Xem kết quả'}
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════
   VIEW: RESULTS
   ═══════════════════════════════════════════ */
function _renderResults(root) {
  const { questions, answers } = _state;
  const total = questions.length;
  let correct = 0;
  questions.forEach((q, i) => { if (answers[i] === q.answer) correct++; });
  const pct = total > 0 ? Math.round(correct / total * 100) : 0;

  // SVG ring calculations
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';

  let gradeText = '';
  if (pct >= 90) gradeText = 'Xuất sắc! 🌟';
  else if (pct >= 80) gradeText = 'Giỏi! 🎉';
  else if (pct >= 65) gradeText = 'Khá 👍';
  else if (pct >= 50) gradeText = 'Trung bình 📝';
  else gradeText = 'Cần cố gắng hơn 💪';

  root.innerHTML = `
    <div class="edu-breadcrumb">
      <button class="edu-breadcrumb-item" onclick="window._eduGoTo('grades')"><i class="fas fa-home"></i> Trang chủ</button>
      <span class="edu-breadcrumb-sep">›</span>
      <span class="edu-breadcrumb-current">Kết quả</span>
    </div>

    <div class="edu-quiz-container">
      <div class="edu-results">
        <div class="edu-results-score">
          <svg class="edu-score-ring" width="180" height="180" viewBox="0 0 180 180">
            <circle class="edu-score-track" cx="90" cy="90" r="${radius}" />
            <circle class="edu-score-progress" cx="90" cy="90" r="${radius}"
              stroke="${color}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}" />
          </svg>
          <div class="edu-score-value">
            <div class="edu-score-number" style="color:${color}">${pct}%</div>
            <div class="edu-score-label">${correct}/${total} đúng</div>
          </div>
        </div>

        <div class="edu-results-grade" style="color:${color}">${gradeText}</div>
        <div class="edu-results-summary">
          Lớp ${_state.selectedGrade} — ${SUBJECTS[_state.selectedSubject]?.name}
        </div>

        <div class="edu-stats-grid">
          <div class="edu-stat-card">
            <div class="edu-stat-value correct">${correct}</div>
            <div class="edu-stat-label">Đúng</div>
          </div>
          <div class="edu-stat-card">
            <div class="edu-stat-value wrong">${total - correct}</div>
            <div class="edu-stat-label">Sai</div>
          </div>
          <div class="edu-stat-card">
            <div class="edu-stat-value total">${total}</div>
            <div class="edu-stat-label">Tổng</div>
          </div>
        </div>

        <div class="edu-review-list">
          ${questions.map((q, i) => {
            const isCorrect = answers[i] === q.answer;
            return `
              <div class="edu-review-item">
                <div class="edu-review-icon ${isCorrect ? 'correct' : 'wrong'}">
                  <i class="fas fa-${isCorrect ? 'check' : 'times'}"></i>
                </div>
                <span class="edu-review-text" title="${_escHtml(q.question)}">
                  <strong>Câu ${i+1}:</strong> ${_escHtml(q.question)}
                </span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="edu-actions" style="justify-content:center;">
          <button class="edu-btn edu-btn-secondary" onclick="window._eduGoTo('subjects')">
            <i class="fas fa-book-open"></i> Chọn Môn Khác
          </button>
          <button class="edu-btn edu-btn-primary" onclick="window._eduRetry()">
            <i class="fas fa-redo"></i> Làm Lại
          </button>
        </div>
      </div>
    </div>
  `;

  // Animate the ring
  requestAnimationFrame(() => {
    const circle = root.querySelector('.edu-score-progress');
    if (circle) {
      circle.style.strokeDashoffset = circumference;
      requestAnimationFrame(() => {
        circle.style.strokeDashoffset = offset;
      });
    }
  });
}

/* ═══════════════════════════════════════════
   API CALLS
   ═══════════════════════════════════════════ */
async function _fetchQuestions(grade, subject) {
  try {
    const res = await fetch(`/api/education-quiz?grade=${grade}&subject=${subject}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) {
    console.warn('[Education Quiz]', err);
    return [];
  }
}

/* ═══════════════════════════════════════════
   USER ACTIONS (exposed to window)
   ═══════════════════════════════════════════ */
window._eduSelectGrade = function(grade) {
  _state.selectedGrade = grade;
  _state.view = 'subjects';
  _renderView(_el('educationQuizContent'));
};

window._eduSelectSubject = async function(subject) {
  _state.selectedSubject = subject;
  _state.view = 'quiz';
  _state.questions = [];
  _state.currentIndex = 0;
  _state.answers = [];
  _state.answered = false;

  const root = _el('educationQuizContent');
  _renderView(root); // Show loading

  const questions = await _fetchQuestions(_state.selectedGrade, subject);
  if (questions.length === 0) {
    root.innerHTML = `
      <div class="edu-breadcrumb">
        <button class="edu-breadcrumb-item" onclick="window._eduGoTo('grades')"><i class="fas fa-home"></i> Trang chủ</button>
        <span class="edu-breadcrumb-sep">›</span>
        <button class="edu-breadcrumb-item" onclick="window._eduGoTo('subjects')">Lớp ${_state.selectedGrade}</button>
        <span class="edu-breadcrumb-sep">›</span>
        <span class="edu-breadcrumb-current">${SUBJECTS[subject]?.name}</span>
      </div>
      <div class="edu-empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Chưa có câu hỏi cho môn ${SUBJECTS[subject]?.name} — Lớp ${_state.selectedGrade}</p>
        <p style="font-size:13px;margin-top:8px;opacity:0.7;">Vui lòng thử lớp hoặc môn khác</p>
      </div>
      <div class="edu-actions" style="justify-content:center;margin-top:20px;">
        <button class="edu-btn edu-btn-secondary" onclick="window._eduGoTo('subjects')">← Quay lại</button>
      </div>
    `;
    return;
  }

  _state.questions = questions;
  _state.answers = new Array(questions.length).fill(null);
  _renderView(root);
};

window._eduSelectAnswer = function(idx) {
  if (_state.answered) return;
  _state.answers[_state.currentIndex] = idx;
  _renderView(_el('educationQuizContent'));
};

window._eduConfirmAnswer = function() {
  if (_state.answers[_state.currentIndex] == null) return;
  _state.answered = true;
  _renderView(_el('educationQuizContent'));
};

window._eduNextQuestion = function() {
  const { currentIndex, questions } = _state;
  if (currentIndex < questions.length - 1) {
    _state.currentIndex++;
    _state.answered = false;
    _renderView(_el('educationQuizContent'));
  } else {
    // Save history
    const total = questions.length;
    let correct = 0;
    questions.forEach((q, i) => { if (_state.answers[i] === q.answer) correct++; });

    _state.history.unshift({
      date: new Date().toLocaleDateString('vi-VN'),
      grade: _state.selectedGrade,
      subject: _state.selectedSubject,
      correct,
      total,
    });
    if (_state.history.length > 50) _state.history.length = 50;
    localStorage.setItem('edu_quiz_history', JSON.stringify(_state.history));

    _state.view = 'results';
    _renderView(_el('educationQuizContent'));
  }
};

window._eduGoTo = function(view) {
  _state.view = view;
  _state.answered = false;
  if (view === 'grades') {
    _state.selectedGrade = null;
    _state.selectedSubject = null;
  }
  _renderView(_el('educationQuizContent'));
};

window._eduRetry = async function() {
  const subject = _state.selectedSubject;
  _state.view = 'quiz';
  _state.questions = [];
  _state.currentIndex = 0;
  _state.answers = [];
  _state.answered = false;

  const root = _el('educationQuizContent');
  _renderView(root);

  const questions = await _fetchQuestions(_state.selectedGrade, subject);
  _state.questions = questions;
  _state.answers = new Array(questions.length).fill(null);
  _renderView(root);
};

window._eduClearHistory = function() {
  _state.history = [];
  localStorage.removeItem('edu_quiz_history');
  _renderView(_el('educationQuizContent'));
};

/* ═══════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════ */
function _escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
