/**
 * components/cv-reviewer.js
 * AI CV Reviewer Module
 * - Hỗ trợ kéo thả/tải tệp (.txt, .md, .pdf, .docx) hoặc dán trực tiếp CV.
 * - PDF scan được OCR tự động (Tesseract.js), .docx qua mammoth.js.
 * - Nhập vị trí ứng tuyển mục tiêu & Bản mô tả công việc (JD) để đánh giá chính xác.
 * - Chọn vai trò người đánh giá (CTO, Trưởng phòng Nhân sự - HR, Chuyên gia cao cấp).
 * - Kết nối Workers AI (Llama 3.1) để trả về phân tích chấm điểm cấu trúc JSON.
 * - Trực quan hóa điểm số bằng vòng đo tiến trình (Radial progress gauge).
 * - Phân tích chi tiết Điểm mạnh, Điểm yếu, Định dạng và từ khóa ATS.
 * - Gợi ý viết lại từng câu trong CV cụ thể theo phương thức hành động (Before vs After).
 * - In/Xuất báo cáo PDF, lưu trữ phiên làm việc trước đó qua localStorage.
 */

let lastReviewedData = null;
let isReviewing = false;
const CV_MAX_CHARS = 12000; // giới hạn token an toàn gửi AI
const CV_MIN_WORDS = 80;    // CV quá ngắn → cảnh báo

// Tải kết quả lưu trữ trước đó từ localStorage nếu có
function loadSavedReview() {
  const saved = localStorage.getItem('rellia_cv_last_review');
  if (saved) {
    try {
      lastReviewedData = JSON.parse(saved);
    } catch (e) {
      console.error('[CV Reviewer] Lỗi phục hồi phiên đánh giá cũ:', e);
    }
  }
}

export function renderCVReviewer(containerId = 'cvReviewerContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  loadSavedReview();

  container.innerHTML = `
    <div class="cv-reviewer-wrapper">
      <!-- Màn hình chính: Nhập dữ liệu CV & Cấu hình đánh giá -->
      <div class="cv-reviewer-card" id="cv-setup-panel">
        <div class="cv-result-header"><i class="fas fa-file-signature"></i> Cấu Hình Đánh Giá CV</div>
        
        <div class="cv-layout-grid" style="grid-template-columns: 1.2fr 1.8fr; margin-top: 14px;">
          
          <!-- Cột cấu hình và JD -->
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div class="cv-form-group">
              <label class="cv-form-label">Vị trí ứng tuyển mục tiêu</label>
              <select class="cv-select" id="cv-job-position">
                <option value="Node.js/Backend Developer">Node.js / Backend Developer</option>
                <option value="React/Frontend Developer">React / Frontend Developer</option>
                <option value="Mobile App Developer (React Native/Flutter)">Mobile App Developer</option>
                <option value="Python/AI/Data Engineer">Python / AI / Data Engineer</option>
                <option value="Fullstack Web Developer">Fullstack Web Developer</option>
                <option value="Product Manager (PM)">Product Manager (PM)</option>
                <option value="Business Analyst (BA)">Business Analyst (BA)</option>
                <option value="QA/QC - Software Tester">QA/QC / Software Tester</option>
                <option value="UI/UX Designer">UI/UX Designer</option>
                <option value="Khác">Vị trí khác (Nhập vào JD)</option>
              </select>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label">Đóng vai trò đánh giá</label>
              <select class="cv-select" id="cv-reviewer-tone">
                <option value="cto">Giám đốc Công nghệ (CTO) - Nghiêng về kỹ thuật</option>
                <option value="recruiter" selected>Trưởng phòng Nhân sự (HR Manager) - Nghiêng về kỹ năng & ATS</option>
                <option value="expert">Chuyên gia Đánh giá CV Cấp cao - Đánh giá toàn diện</option>
              </select>
            </div>

            <div class="cv-form-group">
              <label class="cv-form-label">Mô tả công việc (JD) & Yêu cầu (Không bắt buộc)</label>
              <textarea class="cv-input-text cv-jd-textarea" id="cv-job-description" placeholder="Dán yêu cầu công việc hoặc kỹ năng mong muốn để AI đối chiếu chính xác hơn..."></textarea>
            </div>
          </div>

          <!-- Cột tải lên & Nhập nội dung CV -->
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div class="cv-form-group">
              <label class="cv-form-label">Tải tệp CV (.pdf, .docx, .txt, .md)</label>
              <div class="cv-drop-zone" id="cv-drop-area">
                <i class="fas fa-cloud-upload-alt cv-drop-icon"></i>
                <div style="font-size:13.5px; font-weight:700; color:var(--text-primary);">Kéo thả file CV vào đây hoặc click để chọn</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Hỗ trợ .pdf (kể cả scan), .docx, .txt, .md — tự động đọc nội dung.</div>
                <input type="file" id="cv-file-input" accept=".pdf,.docx,.txt,.md" style="display:none;" />
              </div>
            </div>

            <div class="cv-form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label class="cv-form-label" style="margin-bottom:0;">Nội dung CV của bạn (Dán dạng văn bản)</label>
                <span id="cv-word-counter" style="font-size:11px; color:var(--text-muted); font-family:monospace;">0 từ</span>
              </div>
              <textarea class="cv-input-text cv-textarea" id="cv-text-content" placeholder="Dán toàn bộ nội dung chữ trong CV của bạn vào đây (Thông tin cá nhân, Kinh nghiệm, Dự án, Kỹ năng...)"></textarea>
              <div id="cv-text-warning" style="display:none; font-size:11.5px; margin-top:5px; padding:6px 10px; border-radius:5px;"></div>
            </div>
          </div>

        </div>

        <div style="text-align:right; margin-top:20px; border-top:1px solid rgba(255,255,255,0.06); padding-top:16px;">
          <button class="btn-primary" id="cv-start-review-btn" style="padding:12px 28px; background:linear-gradient(135deg, #8b5cf6, #3b82f6); border:none; font-size:14px; font-weight:700; display:inline-flex; align-items:center; gap:8px;">
            <i class="fas fa-magic"></i> Phân Tích CV Bằng AI
          </button>
        </div>
      </div>

      <!-- Màn hình chờ tải phân tích -->
      <div class="cv-reviewer-card" id="cv-loading-panel" style="display:none; text-align:center; padding:60px 20px;">
        <div style="display:inline-block; margin-bottom:20px;">
          <i class="fas fa-circle-notch fa-spin" style="font-size:48px; color:#8b5cf6;"></i>
        </div>
        <h3 style="font-size:18px; font-weight:700; color:#fff;" id="cv-loading-title">Đang kết nối AI...</h3>
        <p style="font-size:13px; color:var(--text-muted); max-width:380px; margin:8px auto 0;" id="cv-loading-subtitle">Quá trình phân tích chuyên sâu có thể mất khoảng 15-20 giây. Xin vui lòng không đóng tab này.</p>
      </div>

      <!-- Màn hình kết quả phân tích -->
      <div id="cv-result-panel" style="${lastReviewedData ? 'display:block;' : 'display:none;'}">
        ${lastReviewedData ? renderResultsHTML(lastReviewedData) : ''}
      </div>
    </div>
  `;

  // Thiết lập Drag and Drop file
  setupFileUploader();

  // Live word counter trên textarea
  setupWordCounter();

  // Nhấn nút phân tích
  document.getElementById('cv-start-review-btn').onclick = startReviewFlow;

  // Lắp sự kiện cho nút ở màn hình kết quả nếu đã có dữ liệu cũ
  if (lastReviewedData) {
    bindResultButtons();
  }
}

// ── LIVE WORD COUNTER ────────────────────────────────────────────────
function setupWordCounter() {
  const textarea = document.getElementById('cv-text-content');
  const counter = document.getElementById('cv-word-counter');
  const warning = document.getElementById('cv-text-warning');
  if (!textarea || !counter) return;

  const update = () => {
    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;

    counter.textContent = `${words.toLocaleString('vi-VN')} từ · ${chars.toLocaleString('vi-VN')} ký tự`;

    // Cảnh báo ngưỡng
    if (chars > CV_MAX_CHARS) {
      counter.style.color = '#f59e0b';
      warning.style.display = 'block';
      warning.style.background = 'rgba(245,158,11,0.08)';
      warning.style.color = '#f59e0b';
      warning.style.border = '1px solid rgba(245,158,11,0.2)';
      warning.innerHTML = `<i class="fas fa-exclamation-triangle" style="margin-right:5px;"></i>CV quá dài (${chars.toLocaleString('vi-VN')}/${CV_MAX_CHARS.toLocaleString('vi-VN')} ký tự) — AI sẽ tự động cắt bớt phần cuối để phân tích.`;
    } else if (words < CV_MIN_WORDS && words > 0) {
      counter.style.color = '#ef4444';
      warning.style.display = 'block';
      warning.style.background = 'rgba(239,68,68,0.08)';
      warning.style.color = '#ef4444';
      warning.style.border = '1px solid rgba(239,68,68,0.2)';
      warning.innerHTML = `<i class="fas fa-info-circle" style="margin-right:5px;"></i>CV có vẻ quá ngắn (${words} từ). Hãy đảm bảo dán đầy đủ nội dung để AI phân tích chính xác.`;
    } else {
      counter.style.color = words > 0 ? '#10b981' : 'var(--text-muted)';
      warning.style.display = 'none';
    }
  };

  textarea.addEventListener('input', update);
}

// ── XỬ LÝ KÉO THẢ & NẠP FILE TÀI LIỆU ─────────────────────────────────
function setupFileUploader() {
  const dropArea = document.getElementById('cv-drop-area');
  const fileInput = document.getElementById('cv-file-input');
  const textarea = document.getElementById('cv-text-content');

  if (!dropArea || !fileInput) return;

  dropArea.onclick = () => fileInput.click();

  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUploadedFile(files[0]);
    }
  });

  fileInput.onchange = (e) => {
    if (e.target.files.length > 0) {
      handleUploadedFile(e.target.files[0]);
    }
  };

  function handleUploadedFile(file) {
    const name = file.name.toLowerCase();
    const isPDF = file.type === 'application/pdf' || name.endsWith('.pdf');
    const isDOCX = name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (isPDF) {
      // Hiển thị trạng thái đang xử lý
      dropArea.style.borderColor = '#8b5cf6';
      dropArea.style.background = 'rgba(139, 92, 246, 0.04)';
      const statusDiv = dropArea.querySelector('div');
      statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Đang đọc PDF...';

      const onProgress = (msg) => { statusDiv.innerHTML = `<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>${msg}`; };

      extractPDFText(file, onProgress).then(text => {
        textarea.value = text;
        updateDropZoneSuccess(dropArea, file.name, text);
      }).catch(err => {
        console.error('[CV Reviewer] Lỗi đọc PDF:', err);
        alert('Không thể đọc file PDF này. Vui lòng thử file khác hoặc sao chép nội dung thủ công.');
        dropArea.style.borderColor = '#ef4444';
        statusDiv.textContent = 'Lỗi đọc file — thử lại hoặc dán thủ công';
      });
    } else if (isDOCX) {
      // Đọc .docx bằng mammoth.js
      dropArea.style.borderColor = '#8b5cf6';
      dropArea.style.background = 'rgba(139, 92, 246, 0.04)';
      const statusDiv2 = dropArea.querySelector('div');
      statusDiv2.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Đang đọc file Word...';
      extractDOCXText(file).then(text => {
        textarea.value = text;
        updateDropZoneSuccess(dropArea, file.name, text);
        // Trigger word counter
        textarea.dispatchEvent(new Event('input'));
      }).catch(err => {
        console.error('[CV Reviewer] Lỗi đọc DOCX:', err);
        alert('Không thể đọc file .docx này. Vui lòng thử xuất sang PDF hoặc sao chép nội dung thủ công.');
        dropArea.style.borderColor = '#ef4444';
        statusDiv2.textContent = 'Lỗi đọc file Word — thử định dạng khác';
      });
    } else {
      // Đọc file text bình thường
      const reader = new FileReader();
      reader.onload = (event) => {
        textarea.value = event.target.result;
        updateDropZoneSuccess(dropArea, file.name, event.target.result);
        textarea.dispatchEvent(new Event('input'));
      };
      reader.readAsText(file);
    }
  }

  function updateDropZoneSuccess(zone, fileName, text) {
    const words = text.trim().split(/\s+/).length;
    zone.querySelector('div').textContent = `✓ Đã nạp: ${fileName} (~${words.toLocaleString('vi-VN')} từ)`;
    zone.style.borderColor = '#10b981';
    zone.style.background = 'rgba(16, 185, 129, 0.03)';
  }
}

// ── BẮT ĐẦU LUỒNG PHÂN TÍCH VỚI AI ──────────────────────────────────
async function startReviewFlow() {
  const cvText = document.getElementById('cv-text-content').value.trim();
  const jobPosition = document.getElementById('cv-job-position').value;
  const jobDescription = document.getElementById('cv-job-description').value.trim();
  const tone = document.getElementById('cv-reviewer-tone').value;

  if (!cvText) {
    alert('Vui lòng dán nội dung chữ trong CV của bạn trước khi phân tích!');
    return;
  }

  // Cắt bớt CV nếu quá dài để không vượt giới hạn token AI
  const cvTextTrimmed = cvText.length > CV_MAX_CHARS
    ? cvText.substring(0, CV_MAX_CHARS) + '\n[... Nội dung CV bị cắt bớt do giới hạn token ...]'
    : cvText;

  // Chuyển sang màn hình loading
  const setupPanel = document.getElementById('cv-setup-panel');
  const loadingPanel = document.getElementById('cv-loading-panel');
  const resultPanel = document.getElementById('cv-result-panel');

  setupPanel.style.display = 'none';
  loadingPanel.style.display = 'block';
  resultPanel.style.display = 'none';

  isReviewing = true;

  // Chu kỳ chạy chữ loading cho sinh động
  const loadingSteps = [
    { t: 'Đang gửi dữ liệu đến AI...', s: 'Kiểm định cấu trúc tệp CV đầu vào.' },
    { t: 'Đang đối chiếu vị trí công việc...', s: 'Kiểm tra độ tương thích với ngành ' + jobPosition + '.' },
    { t: 'Đang chấm điểm tổng thể...', s: 'Xác định cấp bậc điểm số từ 0 - 100.' },
    { t: 'Đang đánh giá hệ thống ATS...', s: 'Phân tích mật độ từ khóa và lỗi định dạng chuẩn.' },
    { t: 'Đang tìm điểm yếu & điểm mạnh...', s: 'Biên soạn đề xuất tối ưu hóa nội dung chi tiết.' },
    { t: 'Đang xây dựng gợi ý viết lại...', s: 'Chuyển đổi các mô tả sơ sài thành từ khóa hành động.' }
  ];

  let stepIdx = 0;
  const titleEl = document.getElementById('cv-loading-title');
  const subEl = document.getElementById('cv-loading-subtitle');

  const interval = setInterval(() => {
    if (!isReviewing) {
      clearInterval(interval);
      return;
    }
    titleEl.textContent = loadingSteps[stepIdx].t;
    subEl.textContent = loadingSteps[stepIdx].s;
    stepIdx = (stepIdx + 1) % loadingSteps.length;
  }, 3000);

  const callAI = async () => {
    const res = await fetch('/api/cv-reviewer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cvText: cvTextTrimmed,
        jobPosition,
        jobDescription,
        tone
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `Server error ${res.status}`);
    }
    return res.json();
  };

  try {
    let data;
    try {
      data = await callAI();
    } catch (firstErr) {
      // Auto-retry 1 lần sau 3 giây
      console.warn('[CV Reviewer] Lần gọi đầu thất bại, thử lại...', firstErr.message);
      titleEl.textContent = 'Đang thử lại kết nối...';
      subEl.textContent = 'Lần gọi đầu thất bại. Tự động thử lại sau 3 giây...';
      await new Promise(r => setTimeout(r, 3000));
      data = await callAI();
    }

    // Parse chuỗi kết quả JSON trả về từ AI
    const parsedResult = parseAIJson(data.response);

    // Lưu vào bộ nhớ và localStorage
    lastReviewedData = parsedResult;
    localStorage.setItem('rellia_cv_last_review', JSON.stringify(parsedResult));

    // Hiển thị kết quả
    resultPanel.innerHTML = renderResultsHTML(parsedResult);
    resultPanel.style.display = 'block';

    // Bật hiệu ứng vẽ vòng tròn điểm
    setTimeout(() => {
      animateScoreRing(parsedResult.score);
    }, 100);

    bindResultButtons();

  } catch (err) {
    alert('Lỗi phân tích CV (đã thử lại 1 lần): ' + err.message);
    setupPanel.style.display = 'block';
  } finally {
    isReviewing = false;
    clearInterval(interval);
    loadingPanel.style.display = 'none';
  }
}

// ── DỌN DẸP VÀ PARSE CHUỖI JSON TỪ AI ────────────────────────────────
function parseAIJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('AI trả về phản hồi rỗng hoặc không hợp lệ.');
  }

  // Log để debug (chỉ 500 ký tự đầu)
  console.log('[CV Reviewer] Raw AI response (500c):', text.substring(0, 500));

  // Thử parse thẳng trước
  try { return JSON.parse(text); } catch (_) { /* tiếp tục */ }

  // Bóc tách khỏi markdown code block: ```json ... ``` hoặc ``` ... ```
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (mdMatch) {
    try { return JSON.parse(mdMatch[1].trim()); } catch (_) { /* tiếp tục */ }
  }

  // Tìm JSON object lớn nhất trong chuỗi (từ { đầu tiên đến } cuối cùng)
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    let jsonStr = text.substring(start, end + 1);

    // Sửa trailing comma phổ biến: ,} hoặc ,]
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

    // Sửa single-quotes thành double-quotes (model đôi khi dùng sai)
    // Chỉ áp dụng cho key không có dấu nháy đôi
    jsonStr = jsonStr.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');

    try { return JSON.parse(jsonStr); } catch (e) {
      console.warn('[CV Reviewer] JSON repair failed:', e.message);
    }

    // Last resort: thử parse từng đoạn ngắn hơn nếu JSON bị cắt đuôi
    // Tìm điểm kết thúc hợp lệ gần nhất
    for (let i = end; i > start; i--) {
      if (text[i] === '}') {
        try {
          const candidate = text.substring(start, i + 1).replace(/,\s*([}\]])/g, '$1');
          const parsed = JSON.parse(candidate);
          console.warn('[CV Reviewer] Used truncated JSON recovery at char', i);
          return parsed;
        } catch (_) { /* tiếp tục */ }
      }
    }
  }

  // Nếu model trả về text thuần không phải JSON → tạo fallback object
  // để UI vẫn có thể hiển thị gì đó thay vì crash
  console.error('[CV Reviewer] Không parse được JSON, dùng fallback. Raw:', text.substring(0, 800));
  throw new Error('AI trả về phản hồi không đúng định dạng JSON. Hãy thử gửi lại — model đôi khi không nhất quán với output format.');
}


// ── ĐỒNG BỘ HIỆU ỨNG VẼ VÒNG TRÒN ĐIỂM SỐ ───────────────────────────
function animateScoreRing(score) {
  const fill = document.getElementById('cv-score-ring-fill');
  if (!fill) return;
  // Chu vi SVG circle (radius = 70) => 2 * PI * r = ~440
  const offset = 440 - (440 * score) / 100;
  fill.style.strokeDashoffset = offset;
}

// ── HIỂN THỊ GIAO DIỆN KẾT QUẢ PHÂN TÍCH ──────────────────────────────
function renderResultsHTML(data) {
  const score = data.score || 0;
  const grade = data.grade || 'Khá';
  const overview = data.overview || '';
  const strengths = data.strengths || [];
  const weaknesses = data.weaknesses || [];
  const improvements = data.improvements || [];
  const atsFeedback = data.ats_feedback || '';
  const rewrites = data.rewrites || [];

  // Tạo class màu sắc theo điểm
  let badgeStyle = 'background:rgba(16, 185, 129, 0.12); color:#10b981; border:1px solid rgba(16, 185, 129, 0.25);';
  if (score < 50) {
    badgeStyle = 'background:rgba(239, 68, 68, 0.12); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.25);';
  } else if (score < 70) {
    badgeStyle = 'background:rgba(245, 158, 11, 0.12); color:#f59e0b; border:1px solid rgba(245, 158, 11, 0.25);';
  }

  return `
    <div style="display:flex; flex-direction:column; gap:20px;">
      
      <!-- Bảng báo cáo đầu ra chính -->
      <div class="cv-layout-grid" style="grid-template-columns: 1.2fr 2fr;">
        
        <!-- Cột trái: Điểm số & Đánh giá chung -->
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="cv-reviewer-card cv-score-container">
            <h3 style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:14px; letter-spacing:0.1em;">Điểm Số CV Đạt Được</h3>
            
            <div class="cv-score-circle">
              <svg class="cv-score-svg" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="cv-score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#a78bfa" />
                    <stop offset="100%" stop-color="#3b82f6" />
                  </linearGradient>
                </defs>
                <circle class="cv-score-bg" cx="80" cy="80" r="70" />
                <circle class="cv-score-fill" id="cv-score-ring-fill" cx="80" cy="80" r="70" />
              </svg>
              <div class="cv-score-number">
                ${score}
                <span class="cv-score-label">/ 100</span>
              </div>
            </div>

            <div class="cv-grade-badge" style="${badgeStyle}">
              Xếp loại: ${grade}
            </div>
          </div>

          <!-- Card Đánh Giá Chung -->
          <div class="cv-reviewer-card" style="flex:1;">
            <div class="cv-result-header"><i class="fas fa-poll-h"></i> Nhận Xét Tổng Quan</div>
            <p style="font-size:13.5px; color:var(--text-secondary); line-height:1.7; margin-top:8px;">
              ${overview}
            </p>
          </div>
        </div>

        <!-- Cột phải: Các Tab Đánh Giá Chi Tiết -->
        <div class="cv-reviewer-card">
          <!-- Thanh Tab Navigation -->
          <div style="display:flex; gap:12px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:14px; margin-bottom:20px;">
            <button class="btn-secondary active cv-tab-btn" data-tab="tab-overview" style="padding:8px 16px; font-size:12.5px;">Tổng Quan & ATS</button>
            <button class="btn-secondary cv-tab-btn" data-tab="tab-improvements" style="padding:8px 16px; font-size:12.5px;">Điểm Cần Cải Thiện</button>
            <button class="btn-secondary cv-tab-btn" data-tab="tab-rewrites" style="padding:8px 16px; font-size:12.5px;">Mẫu Câu Sửa Đổi (${rewrites.length})</button>
          </div>

          <!-- Tab 1: Tổng Quan & ATS -->
          <div class="cv-tab-content active" id="tab-overview">
            <div style="margin-bottom:20px;">
              <div class="cv-result-header" style="font-size:14px;"><i class="fas fa-thumbs-up"></i> Điểm Mạnh CV</div>
              <ul class="cv-bullet-list" style="margin-top:8px;">
                ${strengths.map(s => `
                  <li class="cv-bullet-item">
                    <i class="fas fa-check-circle cv-bullet-icon success"></i>
                    <span>${s}</span>
                  </li>
                `).join('')}
                ${strengths.length === 0 ? '<li style="font-size:13px; color:var(--text-muted);">Không tìm thấy điểm mạnh rõ rệt.</li>' : ''}
              </ul>
            </div>

            <div style="margin-bottom:20px;">
              <div class="cv-result-header" style="font-size:14px;"><i class="fas fa-exclamation-triangle"></i> Điểm Yếu CV</div>
              <ul class="cv-bullet-list" style="margin-top:8px;">
                ${weaknesses.map(w => `
                  <li class="cv-bullet-item">
                    <i class="fas fa-minus-circle cv-bullet-icon warning"></i>
                    <span>${w}</span>
                  </li>
                `).join('')}
                ${weaknesses.length === 0 ? '<li style="font-size:13px; color:var(--text-muted);">Không có điểm yếu lớn cần khắc phục.</li>' : ''}
              </ul>
            </div>

            <div>
              <div class="cv-result-header" style="font-size:14px;"><i class="fas fa-robot"></i> Đánh Giá Bộ Lọc ATS</div>
              <p style="font-size:13.5px; color:var(--text-secondary); line-height:1.7; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.03); border-radius:6px; padding:12px; margin-top:8px;">
                ${atsFeedback}
              </p>
            </div>
          </div>

          <!-- Tab 2: Điểm Cần Cải Thiện -->
          <div class="cv-tab-content" id="tab-improvements" style="display:none;">
            <div class="cv-result-header" style="font-size:14px; margin-bottom:12px;"><i class="fas fa-tools"></i> Các Bước Tối Ưu Hóa Từng Mục</div>
            <ul class="cv-bullet-list">
              ${improvements.map((imp, idx) => `
                <li class="cv-bullet-item" style="background:rgba(255,255,255,0.015); border:1px solid rgba(255,255,255,0.03); padding:12px; border-radius:6px;">
                  <span style="font-size:14px; font-weight:700; color:#ffd700; margin-right:8px; font-family:monospace;">0${idx + 1}.</span>
                  <span>${imp}</span>
                </li>
              `).join('')}
              ${improvements.length === 0 ? '<li style="font-size:13px; color:var(--text-muted);">Không có đề xuất cải thiện cụ thể nào.</li>' : ''}
            </ul>
          </div>

          <!-- Tab 3: Mẫu Câu Sửa Đổi -->
          <div class="cv-tab-content" id="tab-rewrites" style="display:none;">
            <div class="cv-result-header" style="font-size:14px; margin-bottom:14px;"><i class="fas fa-pen-fancy"></i> Gợi Ý Biên Soạn Lại Câu Chữ Trong CV</div>
            
            <div class="cv-rewrite-card-grid">
              ${rewrites.map(rw => `
                <div class="cv-rewrite-box">
                  <div class="cv-rewrite-compare">
                    <div class="cv-compare-pane before">
                      <span class="cv-compare-title"><i class="fas fa-times-circle"></i> Trước (Dễ bị loại)</span>
                      ${rw.before}
                    </div>
                    <div class="cv-compare-pane after">
                      <span class="cv-compare-title"><i class="fas fa-check-circle"></i> Đề xuất mới (Ấn tượng hơn)</span>
                      ${rw.after}
                    </div>
                  </div>
                  <div style="font-size:12px; color:var(--text-muted); line-height:1.5; border-top:1px solid rgba(255,255,255,0.03); padding-top:8px;">
                    <strong>💡 Lý do sửa:</strong> ${rw.reason}
                  </div>
                </div>
              `).join('')}
              ${rewrites.length === 0 ? '<p style="font-size:13px; color:var(--text-muted); text-align:center;">Không có đề xuất viết lại nào.</p>' : ''}
            </div>
          </div>

        </div>

      </div>

      <!-- Footer điều khiển dưới kết quả -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:16px;">
        <button class="btn-secondary" id="cv-btn-back-setup" style="padding:10px 18px; font-size:13px;"><i class="fas fa-arrow-left"></i> Quay lại / Đánh giá CV khác</button>
        <button class="btn-primary" id="cv-btn-print" style="padding:10px 20px; font-size:13px; background:#10b981; border:none;"><i class="fas fa-print"></i> In / Xuất Báo Cáo</button>
      </div>

    </div>
  `;
}

// ── GẮN CÁC SỰ KIỆN TƯƠNG TÁC SAU KHI RENDER KẾT QUẢ ──────────────────
function bindResultButtons() {
  // Nút quay lại màn hình nhập cấu hình
  const btnBack = document.getElementById('cv-btn-back-setup');
  if (btnBack) {
    btnBack.onclick = () => {
      document.getElementById('cv-setup-panel').style.display = 'block';
      document.getElementById('cv-result-panel').style.display = 'none';

      // Reset dropzone UI
      const dropArea = document.getElementById('cv-drop-area');
      if (dropArea) {
        dropArea.style.borderColor = '';
        dropArea.style.background = '';
        dropArea.querySelector('div').textContent = 'Kéo thả file CV vào đây hoặc click để chọn';
      }
    };
  }

  // Hiệu ứng chuyển Tab kết quả
  const tabs = document.querySelectorAll('.cv-tab-btn');
  tabs.forEach(tab => {
    tab.onclick = (e) => {
      // Bỏ kích hoạt các tab cũ
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.cv-tab-content').forEach(c => c.style.display = 'none');

      // Kích hoạt tab mới
      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      document.getElementById(targetId).style.display = 'block';
    };
  });

  // Kích hoạt animation vòng tròn điểm lần đầu (đối với dữ liệu phục hồi từ localStorage)
  if (lastReviewedData) {
    setTimeout(() => {
      animateScoreRing(lastReviewedData.score);
    }, 150);
  }

  // Sự kiện in báo cáo
  const btnPrint = document.getElementById('cv-btn-print');
  if (btnPrint) {
    btnPrint.onclick = exportCVReport;
  }
}

// ── HÀM IN / XUẤT BÁO CÁO REVIEW CV SẠCH SẼ ──────────────────────────
function exportCVReport() {
  if (!lastReviewedData) return;

  const data = lastReviewedData;
  const printWindow = window.open('', '_blank');

  const strengthsLi = (data.strengths || []).map(s => `<li>${s}</li>`).join('');
  const weaknessesLi = (data.weaknesses || []).map(w => `<li>${w}</li>`).join('');
  const improvementsLi = (data.improvements || []).map(imp => `<li>${imp}</li>`).join('');
  const rewritesTr = (data.rewrites || []).map(rw => `
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:10px; color:#ef4444; width:35%; font-size:12.5px;">${rw.before}</td>
      <td style="padding:10px; color:#10b981; width:40%; font-size:12.5px;">${rw.after}</td>
      <td style="padding:10px; color:#4a5568; font-size:12px;">${rw.reason}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>Báo Cáo Review CV - AI CV Reviewer</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d3748; padding: 40px; background:#fff; }
          .header { border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center; }
          .title { font-size: 24px; font-weight: bold; color: #8b5cf6; }
          .score-badge { font-size: 22px; font-weight: 800; color: #fff; background: #8b5cf6; padding: 6px 14px; border-radius: 8px; }
          .section { margin-bottom: 26px; }
          .section-title { font-size: 16px; font-weight: bold; color: #2d3748; border-left: 4px solid #8b5cf6; padding-left: 8px; margin-bottom: 12px; text-transform: uppercase; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f7fafc; padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size:13px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">BÁO CÁO PHÂN TÍCH VÀ REVIEW CV CHUYÊN SÂU</div>
            <div style="font-size:12px; color:#718096; margin-top:4px;">Hệ thống AI CV Reviewer - Rellia Đại Dashboard</div>
          </div>
          <div class="score-badge">Điểm số: ${data.score}/100</div>
        </div>

        <div class="section">
          <div class="section-title">Nhận Xét Tổng Quan</div>
          <p>${data.overview}</p>
        </div>

        <div class="section">
          <div class="section-title">Độ Tương Thích Bộ Lọc Tuyển Dụng ATS</div>
          <p style="background:#f7fafc; padding:12px; border-radius:6px; border:1px solid #edf2f7; font-size:13.5px;">${data.ats_feedback}</p>
        </div>

        <div class="section">
          <div class="section-title">Điểm Mạnh</div>
          <ul>${strengthsLi}</ul>
        </div>

        <div class="section">
          <div class="section-title">Điểm Yếu</div>
          <ul>${weaknessesLi}</ul>
        </div>

        <div class="section">
          <div class="section-title">Khuyến Nghị Cải Thiện</div>
          <ul>${improvementsLi}</ul>
        </div>

        <div class="section">
          <div class="section-title">Bảng Mẫu Câu Đề Xuất Viết Lại</div>
          <table>
            <thead>
              <tr>
                <th>Nội Dung Cũ (Cần Sửa)</th>
                <th>Nội Dung Đề Xuất (Tối Ưu)</th>
                <th>Nguyên Nhân/Lợi Ích</th>
              </tr>
            </thead>
            <tbody>
              ${rewritesTr}
            </tbody>
          </table>
        </div>

        <div style="text-align:center; font-size:11px; color:#a0aec0; margin-top:40px; border-top:1px solid #edf2f7; padding-top:20px;">
          Báo cáo tự động được biên soạn bởi Rellia Dashboard AI. Bản quyền thuộc về người dùng.
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// ── ĐỌC NỘI DUNG VĂN BẢN TỪ FILE PDF (PDF.js + OCR Tesseract.js) ─────
const _pdfCache = { lib: null };

async function getPDFLib() {
  if (_pdfCache.lib) return _pdfCache.lib;
  const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
  _pdfCache.lib = pdfjsLib;
  return pdfjsLib;
}

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.Tesseract;
}

// Tăng độ tương phản canvas trước OCR để nhận dạng chữ scan chính xác hơn
function preprocessCanvasForOCR(canvas, ctx) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Greyscale
    const grey = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Tăng contrast: đẩy màu sáng lên trắng, màu tối xuống đen
    const contrast = 1.5;
    const val = Math.min(255, Math.max(0, contrast * (grey - 128) + 160));
    data[i] = data[i + 1] = data[i + 2] = val;
  }
  ctx.putImageData(imageData, 0, 0);
}

async function ocrPageCanvas(page, worker) {
  const viewport = page.getViewport({ scale: 2.0 }); // scale 2x → ảnh rõ hơn
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;

  // Tiền xử lý ảnh để OCR chính xác hơn
  preprocessCanvasForOCR(canvas, ctx);

  const { data: { text } } = await worker.recognize(canvas);
  return text.trim();
}

// Chuyển đổi items từ PDF.js getTextContent thành text sạch
// Dùng vị trí thực (transform) để tránh thêm space thừa giữa các ký tự
function pdfItemsToText(items) {
  if (!items || items.length === 0) return '';

  let result = '';
  let prevX = null;
  let prevWidth = 0;
  let prevFontSize = 12;

  for (const item of items) {
    if (!item.str) continue;

    // transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
    const x = item.transform ? item.transform[4] : null;
    const fontSize = item.transform ? Math.abs(item.transform[3]) : 12;

    if (prevX !== null && x !== null) {
      const gap = x - (prevX + prevWidth);
      // Ngưỡng: nếu gap > 0.3 * fontSize thì coi là có space
      const spaceThreshold = 0.3 * (prevFontSize || 12);
      if (gap > spaceThreshold) {
        result += ' ';
      }
      // Nếu gap âm lớn → sang dòng mới (item ở hàng tiếp theo)
      if (gap < -prevWidth * 0.5) {
        result += '\n';
      }
    }

    result += item.str;

    // item.hasEOL = true nếu item kết thúc dòng
    if (item.hasEOL) {
      result += '\n';
      prevX = null;
    } else {
      prevX = x;
      prevWidth = item.width || item.str.length * (fontSize * 0.5);
      prevFontSize = fontSize;
    }
  }

  // Cleanup: nhiều space → 1 space, nhiều newline → 2 newline tối đa
  return result
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractPDFText(file, onProgress) {
  const notify = onProgress || (() => {});
  notify('Đang tải PDF...');

  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await getPDFLib();

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPages = pdf.numPages;
  const pageTexts = [];
  let usedOCR = false;
  let tesseractWorker = null; // Worker dùng chung cho tất cả pages

  // Kiểm tra trước xem có page nào cần OCR không
  const needsOCR = [];
  for (let p = 1; p <= totalPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent({ includeMarkedContent: false });
    const layerText = pdfItemsToText(content.items);
    if (layerText.length >= 50) {
      pageTexts[p - 1] = { type: 'text', value: layerText, page };
    } else {
      pageTexts[p - 1] = { type: 'ocr', value: null, page };
      needsOCR.push(p - 1);
    }
  }

  // Nếu có page cần OCR → tạo 1 worker dùng chung
  if (needsOCR.length > 0) {
    usedOCR = true;
    notify('Đang khởi động OCR engine...');
    const Tesseract = await loadTesseract();
    tesseractWorker = await Tesseract.createWorker('vie+eng', 1, {
      logger: () => {} // tắt log verbose
    });

    for (const idx of needsOCR) {
      const pageNum = idx + 1;
      notify(`OCR trang ${pageNum}/${totalPages}... (${needsOCR.indexOf(idx) + 1}/${needsOCR.length})`);
      try {
        const ocrText = await ocrPageCanvas(pageTexts[idx].page, tesseractWorker);
        pageTexts[idx].value = ocrText || '';
      } catch (ocrErr) {
        console.warn(`[CV Reviewer] OCR trang ${pageNum} thất bại:`, ocrErr);
        pageTexts[idx].value = '';
      }
    }

    // Giải phóng worker sau khi dùng xong
    await tesseractWorker.terminate();
  }

  const result = pageTexts
    .map(p => p.value || '')
    .filter(t => t.trim().length > 0)
    .join('\n\n');

  if (result.trim().length === 0) {
    throw new Error('Không trích xuất được văn bản từ PDF (kể cả sau OCR).');
  }

  notify(usedOCR
    ? `✓ Hoàn tất! (${totalPages} trang — ${needsOCR.length} trang dùng OCR)`
    : `✓ Hoàn tất! (${totalPages} trang — text layer)`);

  return result;
}

// ── ĐỌC NỘI DUNG VĂN BẢN TỪ FILE .DOCX (mammoth.js) ─────────────────
async function extractDOCXText(file) {
  if (!window.mammoth) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });

  if (result.messages && result.messages.length > 0) {
    console.info('[CV Reviewer] mammoth warnings:', result.messages);
  }

  const text = result.value.trim();
  if (!text) throw new Error('File .docx không có nội dung văn bản.');
  return text;
}
