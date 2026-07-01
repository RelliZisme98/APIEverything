/**
 * components/mbti.js
 * Chức năng trắc nghiệm tính cách MBTI (Kiến trúc bảo mật Client-Server)
 * - Tương tác giao diện glassmorphic.
 * - Danh sách câu hỏi lấy từ server.
 * - Phân tích kết quả chi tiết cho 16 nhóm tính cách.
 */

// ── NGÂN HÀNG THÔNG TIN CHI TIẾT 16 NHÓM TÍNH CÁCH MBTI ───────────────────
const MBTI_PROFILES = {
  INTJ: {
    icon: "♟️",
    title: "Nhà Chiến Lược (Architect)",
    summary: "Sáng tạo, độc lập và có tư duy chiến lược cực kỳ sâu sắc. Họ thích lập kế hoạch và có ý chí mạnh mẽ để đạt được mục tiêu cá nhân.",
    strengths: ["Tư duy chiến lược", "Độc lập", "Quyết đoán", "Luôn tìm giải pháp sáng tạo"],
    weaknesses: ["Dễ tỏ ra kiêu ngạo", "Khô khan trong cảm xúc", "Quá cầu toàn và khắt khe"],
    careers: ["Kỹ sư phần mềm", "Nhà hoạch định chiến lược", "Nhà khoa học", "Kiến trúc sư hệ thống"],
    famous: [
      { name: "Elon Musk", role: "Doanh nhân công nghệ" },
      { name: "Friedrich Nietzsche", role: "Triết gia lỗi lạc" }
    ]
  },
  INTP: {
    icon: "🧪",
    title: "Nhà Tư Duy (Logician)",
    summary: "Tò mò, độc lập và yêu thích lý thuyết trừu tượng. Họ thích phân tích các mô hình và giải quyết các bài toán kỹ thuật hóc búa.",
    strengths: ["Tư duy phân tích sắc sảo", "Sáng tạo tự do", "Khách quan", "Tư tưởng cởi mở"],
    weaknesses: ["Dễ bị phân tâm bởi ý tưởng mới", "Hay nghi ngờ bản thân", "Khó biểu đạt cảm xúc ra ngoài"],
    careers: ["Nhà nghiên cứu khoa học", "Lập trình viên backend", "Nhà toán học", "Chuyên viên phân tích dữ liệu"],
    famous: [
      { name: "Albert Einstein", role: "Nhà vật lý thuyết" },
      { name: "Bill Gates", role: "Đồng sáng lập Microsoft" }
    ]
  },
  ENTJ: {
    icon: "👑",
    title: "Nhà Chỉ Huy (Commander)",
    summary: "Quyết đoán, tự tin và có tầm nhìn xa trông rộng. Họ có khả năng dẫn dắt xuất sắc và thích thiết lập hệ thống hiệu quả cho tập thể.",
    strengths: ["Khả năng lãnh đạo", "Quyết đoán nhanh chóng", "Làm việc hiệu suất", "Ý chí sắt đá"],
    weaknesses: ["Cứng đầu & độc đoán", "Thiếu kiên nhẫn với người chậm chạp", "Lạnh lùng dưới góc nhìn người khác"],
    careers: ["Giám đốc điều hành (CEO)", "Nhà tư vấn quản trị doanh nghiệp", "Luật sư thương mại", "Doanh nhân khởi nghiệp"],
    famous: [
      { name: "Steve Jobs", role: "Đồng sáng lập Apple" },
      { name: "Margaret Thatcher", role: "Cựu Thủ tướng Anh" }
    ]
  },
  ENTP: {
    icon: "💡",
    title: "Nhà Tranh Biện (Debater)",
    summary: "Thông minh, tò mò và thích thử thách các quan điểm truyền thống. Họ là bậc thầy động não ý tưởng mới và thích sự đổi mới liên tục.",
    strengths: ["Sáng tạo dồi dào", "Nhanh nhạy ứng biến", "Giàu năng lượng", "Thuyết trình thuyết phục"],
    weaknesses: ["Thích tranh cãi lý thuyết", "Dễ chán nản với chi tiết vận hành", "Thiếu kiên trì lâu dài"],
    careers: ["Nhà sáng lập khởi nghiệp", "Giám đốc sáng tạo", "Nhà báo tự do", "Nhà tư vấn phát triển sản phẩm"],
    famous: [
      { name: "Mark Twain", role: "Nhà văn vĩ đại" },
      { name: "Thomas Edison", role: "Nhà phát minh lỗi lạc" }
    ]
  },
  INFJ: {
    icon: "🔮",
    title: "Người Bảo Vệ / Lý Tưởng Hóa (Advocate)",
    summary: "Lý tưởng hóa, nhân từ và sâu sắc. Họ có mong muốn mạnh mẽ làm cho thế giới tốt đẹp hơn và kết nối tâm hồn sâu sắc với mọi người xung quanh.",
    strengths: ["Thấu cảm sâu sắc", "Ý tưởng độc đáo", "Nhân hậu & tận tụy", "Giàu tính nghệ thuật"],
    weaknesses: ["Nhạy cảm với chỉ trích", "Dễ bị kiệt sức vì lo lắng cho người khác", "Quá lý tưởng hóa thực tế"],
    careers: ["Nhà tâm lý học trị liệu", "Nhà văn / Biên kịch", "Giảng viên sư phạm", "Nhà hoạt động xã hội"],
    famous: [
      { name: "Martin Luther King Jr.", role: "Nhà hoạt động nhân quyền" },
      { name: "Nelson Mandela", role: "Cựu Tổng thống Nam Phi" }
    ]
  },
  INFP: {
    icon: "🌸",
    title: "Người Hòa Giải (Mediator)",
    summary: "Nhạy cảm, sáng tạo và luôn trung thành với các giá trị đạo đức cá nhân. Họ tìm kiếm sự hài hòa và mong muốn âm thầm giúp đỡ mọi người.",
    strengths: ["Giàu lòng trắc ẩn", "Sáng tạo nghệ thuật tốt", "Tư tưởng cởi mở", "Tận tụy vô điều kiện"],
    weaknesses: ["Quá lý tưởng hóa", "Dễ cảm thấy cô đơn cô độc", "Hay né tránh xung đột trực tiếp"],
    careers: ["Nhà văn / Nhà thơ", "Nhà trị liệu tâm lý nghệ thuật", "Họa sĩ tự do", "Cố vấn giáo dục tâm lý"],
    famous: [
      { name: "William Shakespeare", role: "Nhà soạn kịch vĩ đại" },
      { name: "J.R.R. Tolkien", role: "Tác giả Chúa Nhẫn" }
    ]
  },
  ENFJ: {
    icon: "🗣️",
    title: "Người Chỉ Đường / Dẫn Dắt (Protagonist)",
    summary: "Lôi cuốn, truyền cảm hứng và đầy thấu cảm. Họ biết cách gắn kết tập thể lại gần nhau và định hướng mọi người tiến bộ phát triển.",
    strengths: ["Khả năng truyền cảm hứng tốt", "Đầy lòng trắc ẩn", "Kỹ năng giao tiếp xuất chúng", "Làm việc có tổ chức"],
    weaknesses: ["Quá bao dung dẫn đến tự hại", "Dễ lo lắng thái quá cho người khác", "Nhạy cảm với đánh giá tiêu cực"],
    careers: ["Nhà đào tạo / Coach", "Chuyên viên truyền thông thương hiệu", "Nhà quản lý nhân sự", "Chính trị gia"],
    famous: [
      { name: "Barack Obama", role: "Cựu Tổng thống Mỹ" },
      { name: "Oprah Winfrey", role: "Bà hoàng truyền thông" }
    ]
  },
  ENFP: {
    icon: "✨",
    title: "Người Truyền Cảm Hứng (Campaigner)",
    summary: "Năng động, nhiệt huyết và giàu trí tưởng tượng. Họ nhìn thấy các khả năng ở khắp mọi nơi và thích kết nối mọi người lại với nhau.",
    strengths: ["Kỹ năng giao tiếp xuất sắc", "Sáng tạo dồi dào", "Nhiệt tình cởi mở", "Thích khám phá điều mới"],
    weaknesses: ["Khó tập trung chi tiết vụn vặt", "Nhanh chán việc lặp đi lặp lại", "Quá nhạy cảm cảm xúc"],
    careers: ["Chuyên viên marketing", "Nhà báo phóng viên", "Chuyên viên tổ chức sự kiện", "Sáng tạo nội dung (Creator)"],
    famous: [
      { name: "Robert Downey Jr.", role: "Diễn viên điện ảnh" },
      { name: "Robin Williams", role: "Diễn viên hài huyền thoại" }
    ]
  },
  ISTJ: {
    icon: "⚖️",
    title: "Người Thực Tế / Đáng Tin Cậy (Logistician)",
    summary: "Trách nhiệm, thực tế và tôn trọng truyền thống. Họ là những người đáng tin cậy nhất, thích làm việc dựa trên sự kiện và quy trình rõ ràng.",
    strengths: ["Đáng tin cậy bậc nhất", "Ngăn nắp khoa học", "Tập trung cao độ", "Thực tế sắc sảo"],
    weaknesses: ["Cứng nhắc bảo thủ", "Khó thích ứng thay đổi nhanh", "Dễ tự đổ lỗi cho bản thân"],
    careers: ["Kế toán / Kiểm toán viên", "Quản lý hành chính", "Sĩ quan quân đội", "Thẩm phán tòa án"],
    famous: [
      { name: "George Washington", role: "Cựu Tổng thống Mỹ" },
      { name: "Angela Merkel", role: "Cựu Thủ tướng Đức" }
    ]
  },
  ISFJ: {
    icon: "🛡️",
    title: "Người Bảo Vệ (Defender)",
    summary: "Tận tụy, trung thành và vô cùng chu đáo. Họ có trách nhiệm cao đối với gia đình và cộng đồng, luôn lặng lẽ chăm lo tỉ mỉ cho người khác.",
    strengths: ["Nhiệt tình giúp đỡ", "Chu đáo tỉ mỉ", "Đáng tin cậy", "Khéo léo trong hành động thực tế"],
    weaknesses: ["Quá e dè nhút nhát", "Dễ ôm đồm gánh vác quá nhiều", "Ngại thay đổi môi trường mới"],
    careers: ["Y tá / Bác sĩ", "Giáo viên mầm non / tiểu học", "Quản trị dịch vụ khách hàng", "Nhân viên công tác xã hội"],
    famous: [
      { name: "Beyoncé", role: "Ca sĩ nổi tiếng" },
      { name: "Nữ hoàng Elizabeth II", role: "Cựu Vương vương quốc Anh" }
    ]
  },
  ESTJ: {
    icon: "👔",
    title: "Người Điều Hành (Executive)",
    summary: "Có năng lực tổ chức xuất sắc, ngăn nắp và thẳng thắn. Họ thích dẫn dắt dự án và đảm bảo mọi thành viên tuân thủ đúng quy tắc.",
    strengths: ["Tổ chức vận hành xuất sắc", "Tận tụy tận tâm", "Trung thực thẳng thắn", "Đáng tin cậy"],
    weaknesses: ["Dễ độc đoán áp đặt", "Thiếu linh hoạt mềm dẻo", "Quá coi trọng địa vị và hiệu năng công việc"],
    careers: ["Quản lý nhà máy / vận hành", "Giám đốc tài chính", "Cảnh sát trưởng", "Trưởng phòng hành sự chính trị"],
    famous: [
      { name: "John D. Rockefeller", role: "Tỷ phú dầu mỏ đầu tiên" },
      { name: "Frank Sinatra", role: "Ca sĩ huyền thoại" }
    ]
  },
  ESFJ: {
    icon: "🤝",
    title: "Người Chăm Sóc (Consul)",
    summary: "Hòa đồng, ấm áp và luôn muốn làm hài lòng mọi người. Họ thích tham gia các hoạt động xã hội và có tinh thần tập thể cực kỳ cao.",
    strengths: ["Hòa đồng thân thiện", "Ý thức trách nhiệm cao", "Trung thành gắn bó", "Ấm áp chu đáo"],
    weaknesses: ["Nhạy cảm với sự từ chối hoặc cô lập", "Dễ lo âu về hình ảnh cá nhân", "Ngại đưa ra quyết định khó khăn"],
    careers: ["Quản lý sự kiện cộng đồng", "Giáo viên trung học", "Chuyên viên tư vấn học đường", "Đại diện bán hàng / CSKH"],
    famous: [
      { name: "Taylor Swift", role: "Ca sĩ / Nhạc sĩ toàn cầu" },
      { name: "Bill Clinton", role: "Cựu Tổng thống Mỹ" }
    ]
  },
  ISTP: {
    icon: "🛠️",
    title: "Nhà Kỹ Thuật (Virtuoso)",
    summary: "Thực tế, thích khám phá bằng hành động trực tiếp. Họ có tư duy kỹ thuật tốt, thích tự tay tháo lắp và giải quyết vấn đề bằng thực nghiệm.",
    strengths: ["Tháo vát linh hoạt", "Lý trí cực tốt dưới áp lực", "Thực tế", "Thích ứng siêu nhanh"],
    weaknesses: ["Kín tiếng khó tiếp cận", "Dễ chán nản công việc lý thuyết", "Thích mạo hiểm thiếu an toàn"],
    careers: ["Kỹ sư cơ khí / điện tử", "Phi công lái máy bay", "Lập trình viên hệ thống mạng", "Lính cứu hỏa chuyên nghiệp"],
    famous: [
      { name: "Michael Jordan", role: "Huyền thoại bóng rổ" },
      { name: "Tom Cruise", role: "Diễn viên hành động" }
    ]
  },
  ISFP: {
    icon: "🎨",
    title: "Người Nghệ Sĩ (Adventurer)",
    summary: "Nhạy cảm, có mắt thẩm mỹ và yêu thích tự do trải nghiệm cuộc sống. Họ sống trong hiện tại và thể hiện bản thân qua hành động sáng tạo.",
    strengths: ["Đầy tính nghệ thuật", "Tự do phóng khoáng", "Nhạy cảm tinh tế", "Thân thiện hòa đồng"],
    weaknesses: ["Khó lập kế hoạch dài hạn", "Dễ bị căng thẳng tâm lý", "Độc lập thái quá khó quản lý"],
    careers: ["Họa sĩ / Nhà thiết kế đồ họa", "Nhạc sĩ / Ca sĩ", "Nhiếp ảnh gia", "Bác sĩ thú y chăm sóc động vật"],
    famous: [
      { name: "Michael Jackson", role: "Ông hoàng nhạc Pop" },
      { name: "Frida Kahlo", role: "Họa sĩ huyền thoại" }
    ]
  },
  ESTP: {
    icon: "⚡",
    title: "Người Thách Thức (Entrepreneur)",
    summary: "Năng động, thực tế và thích hành động ngay lập tức. Họ thích trải nghiệm mạo hiểm và có khả năng thuyết phục đàm phán xuất sắc.",
    strengths: ["Tự tin đầy cuốn hút", "Hành động nhanh gọn", "Kỹ năng đàm phán thương thuyết tốt", "Nhạy bén quan sát"],
    weaknesses: ["Thiếu kiên nhẫn", "Ít nghĩ đến hậu quả dài hạn", "Ngại lý thuyết trừu tượng hàn lâm"],
    careers: ["Doanh nhân khởi nghiệp", "Môi giới chứng khoán / tài chính", "Chuyên viên bán hàng dự án", "Chuyên viên cứu hộ chuyên nghiệp"],
    famous: [
      { name: "Donald Trump", role: "Doanh nhân / Cựu Tổng thống Mỹ" },
      { name: "Madonna", role: "Nữ hoàng nhạc Pop" }
    ]
  },
  ESFP: {
    icon: "🎭",
    title: "Người Trình Diễn (Entertainer)",
    summary: "Vui vẻ, hòa đồng và tràn đầy năng lượng sống. Họ biến mọi nơi đi qua thành sân khấu nghệ thuật, yêu thích thời trang và kết nối tập thể vui vẻ.",
    strengths: ["Vui tươi hóm hỉnh", "Kỹ năng giao tiếp kết nối tuyệt vời", "Thực tế", "Thích trải nghiệm mới mẻ"],
    weaknesses: ["Khó tập trung học thuật lý thuyết", "Tránh né xung đột bất hòa", "Quá chú trọng vẻ bề ngoài"],
    careers: ["Diễn viên / MC sự kiện", "Hướng dẫn viên du lịch chuyên nghiệp", "Thiết kế thời trang", "Quản trị nhà hàng khách sạn cao cấp"],
    famous: [
      { name: "Marilyn Monroe", role: "Biểu tượng điện ảnh" },
      { name: "Elvis Presley", role: "Ông hoàng Rock 'n' Roll" }
    ]
  }
};

let mbtiState = {
  questions: [],
  currIdx: 0,
  selectedAnswers: [], // lưu 0-4
  userName: '',
  userAge: ''
};

let isTransitioning = false;

// ── UTILS RENDER LOADING/ERROR ──────────────────────────────────────
function showMBTILoading(container, text) {
  container.innerHTML = `
    <div class="mbti-wrapper">
      <div class="mbti-screen active">
        <div class="mbti-card" style="text-align: center; padding: 50px 20px;">
          <div class="iqeq-spinner" style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #8b5cf6 !important; border-radius: 50%; animation: iqeq-spin 1s linear infinite; margin: 0 auto 20px;"></div>
          <div style="font-size: 16px; color: var(--text-primary); font-weight: 500;">${text}</div>
        </div>
      </div>
    </div>
  `;
}

function showMBTIError(container, text, retryFn) {
  container.innerHTML = `
    <div class="mbti-wrapper">
      <div class="mbti-screen active">
        <div class="mbti-card" style="text-align: center; border-color: rgba(239, 68, 68, 0.3);">
          <div style="font-size: 40px; margin-bottom: 15px;">⚠️</div>
          <div style="font-size: 18px; font-weight: 700; color: #ef4444; margin-bottom: 8px;">Đã xảy ra lỗi</div>
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 24px;">${text}</div>
          <button class="btn-primary" id="mbti-btn-retry" style="background:#ef4444; border-color:#ef4444;">Thử lại</button>
        </div>
      </div>
    </div>
  `;
  const btn = document.getElementById('mbti-btn-retry');
  if (btn) btn.onclick = retryFn;
}

// ── RENDER MBTI INTERFACE ───────────────────────────────────────────
export function renderMBTI(containerId = 'mbtiContent') {
  isTransitioning = false;
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="mbti-wrapper">
      <!-- Screen 1: Intro Form -->
      <div class="mbti-screen active" id="mbti-scr-intro">
        <div class="mbti-card">
          <div style="display: flex; gap: 16px; align-items: flex-start; margin-bottom: 20px;">
            <div style="font-size: 36px;">🧠</div>
            <div>
              <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Trắc Nghiệm Tính Cách MBTI (Myers-Briggs)</div>
              <div style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.6;">
                Bài kiểm tra gồm <strong>40 câu hỏi lựa chọn năm cấp độ</strong> giúp xác định xu hướng tính cách của bạn trong 4 chiều kích cốt lõi. 
                Đáp án được gửi và chấm điểm an toàn trên máy chủ để bảo vệ tính chính xác của thuật toán.
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Họ và Tên</label>
              <input type="text" id="mbti-input-name" placeholder="Nhập tên của bạn..." style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); outline: none;">
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Tuổi</label>
              <input type="number" id="mbti-input-age" placeholder="Nhập tuổi..." style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); outline: none;">
            </div>
          </div>

          <div class="mbti-disclaimer">
            <div class="mbti-disclaimer-title">
              <i class="fas fa-exclamation-triangle"></i> Cam Kết Bảo Mật & Miễn Trừ Trách Nhiệm
            </div>
            <div class="mbti-disclaimer-desc">
              Chúng tôi cam kết không chia sẻ thông tin cá nhân hay kết quả trắc nghiệm của bạn cho bên thứ ba. 
              Kết quả trắc nghiệm chỉ mang tính chất tham khảo định hướng bản thân, không thay thế cho các đánh giá y khoa hoặc tư vấn tâm lý chuyên nghiệp.
            </div>
          </div>

          <div style="margin: 20px 0 24px;">
            <label class="iqeq-checkbox-row" style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
              <input type="checkbox" id="mbti-check-agree" style="width: 16px; height: 16px; accent-color: #8b5cf6; margin-top: 2px;">
              <span class="iqeq-checkbox-label" style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">Tôi đã đọc, hiểu và hoàn toàn đồng ý với các điều khoản miễn trừ trách nhiệm ở trên.</span>
            </label>
          </div>

          <button class="btn-primary" id="mbti-btn-start" style="width: 100%; background: linear-gradient(135deg, #8b5cf6, #3b82f6); border: none; font-weight: 700; padding: 14px 20px; border-radius: var(--radius-sm); color: #fff; cursor: pointer; transition: transform 0.2s ease;">
            Bắt đầu làm bài trắc nghiệm
          </button>
        </div>
      </div>

      <!-- Screen 2: Test Form -->
      <div class="mbti-screen" id="mbti-scr-test">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div style="font-size: 12px; font-weight: 700; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.1em; background: rgba(139,92,246,0.1); padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(139,92,246,0.2);">
            Trắc Nghiệm MBTI
          </div>
          <div id="mbti-progress-text" style="font-size: 13.5px; font-family: 'JetBrains Mono', monospace; color: var(--text-muted);">
            Câu 0 / 0
          </div>
        </div>

        <div class="mbti-progress-bar">
          <div class="mbti-progress-fill" id="mbti-progress-fill" style="width: 0%;"></div>
        </div>

        <div class="mbti-layout">
          <!-- Cột trái: Câu hỏi hiện tại -->
          <div>
            <div class="mbti-card" id="mbti-q-card">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.08em; margin-bottom: 8px;" id="mbti-q-dim">
                Kích Thước: ...
              </div>
              <div style="font-size: 16px; font-weight: 600; color: var(--text-primary); line-height: 1.6; margin-bottom: 28px;" id="mbti-q-text">
                Đang tải câu hỏi...
              </div>

              <!-- Likert Buttons -->
              <div class="mbti-likert-scale" id="mbti-likert-container">
                <button class="mbti-likert-btn" data-value="0">Rất không đồng ý</button>
                <button class="mbti-likert-btn" data-value="1">Không đồng ý</button>
                <button class="mbti-likert-btn" data-value="2">Bình thường</button>
                <button class="mbti-likert-btn" data-value="3">Đồng ý</button>
                <button class="mbti-likert-btn" data-value="4">Rất đồng ý</button>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
              <button class="btn-secondary" id="mbti-btn-prev" style="padding: 10px 18px;"><i class="fas fa-chevron-left"></i> Quay lại</button>
              <button class="btn-primary" id="mbti-btn-next" style="padding: 10px 18px; background: #8b5cf6; border-color: #8b5cf6;">Tiếp theo <i class="fas fa-chevron-right"></i></button>
            </div>
          </div>

          <!-- Cột phải: Grid phím tắt nhảy nhanh -->
          <div class="mbti-q-grid-panel">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; text-align: center; margin-bottom: 12px;">
              Danh sách câu hỏi
            </div>
            <div class="mbti-q-grid" id="mbti-grid-elements"></div>
          </div>
        </div>
      </div>

      <!-- Screen 3: Results -->
      <div class="mbti-screen" id="mbti-scr-result">
        <div class="mbti-card" style="text-align: center; padding: 40px 24px;">
          <div style="font-size: 14px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.08em; margin-bottom: 8px;">Kết Quả Trắc Nghiệm Tính Cách Của Bạn</div>
          <div class="mbti-result-badge" id="mbti-res-type">INTJ</div>
          <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;" id="mbti-res-title">Nhà Chiến Lược</div>
          <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.65; max-width: 600px; margin: 0 auto 24px;" id="mbti-res-summary">
            Đang tải dữ liệu tóm tắt...
          </p>

          <!-- 4 Dimension Progress Bars -->
          <div style="max-width: 650px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; text-align: left;" id="mbti-res-dimensions">
            <!-- Dimensions will be rendered dynamically -->
          </div>

          <div class="mbti-detailed-report" id="mbti-res-details">
            <!-- Detailed profile sections will be rendered dynamically -->
          </div>

          <div style="margin-top: 32px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="btn-primary" id="mbti-btn-restart" style="background: linear-gradient(135deg, #8b5cf6, #3b82f6); border: none; padding: 12px 24px; font-weight: 700; color:#fff;">Làm lại bài test</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach button triggers
  document.getElementById('mbti-btn-start').onclick = () => startMBTITest(containerId);
}

// ── BẮT ĐẦU TEST: VALIDATION & LOAD ──────────────────────────────────
async function startMBTITest(containerId) {
  const nameInput = document.getElementById('mbti-input-name');
  const ageInput = document.getElementById('mbti-input-age');
  const agreeCheck = document.getElementById('mbti-check-agree');
  const container = document.getElementById(containerId);

  // Validate form inputs
  let isValid = true;
  if (nameInput) {
    if (!nameInput.value.trim()) {
      nameInput.style.borderColor = '#ef4444';
      nameInput.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
      isValid = false;
    } else {
      nameInput.style.borderColor = 'var(--border)';
      nameInput.style.boxShadow = 'none';
    }
  }

  if (ageInput) {
    if (!ageInput.value.trim()) {
      ageInput.style.borderColor = '#ef4444';
      ageInput.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
      isValid = false;
    } else {
      ageInput.style.borderColor = 'var(--border)';
      ageInput.style.boxShadow = 'none';
    }
  }

  if (agreeCheck) {
    const checkLabel = agreeCheck.closest('label')?.querySelector('.iqeq-checkbox-label');
    if (!agreeCheck.checked) {
      agreeCheck.style.outline = '2px solid #ef4444';
      if (checkLabel) checkLabel.style.color = '#ef4444';
      isValid = false;
    } else {
      agreeCheck.style.outline = 'none';
      if (checkLabel) checkLabel.style.color = 'var(--text-secondary)';
    }
  }

  if (!isValid) return;

  mbtiState.userName = nameInput.value.trim();
  mbtiState.userAge = ageInput.value.trim();

  // Load questions
  showMBTILoading(container, "Đang tải câu hỏi trắc nghiệm tính cách MBTI từ máy chủ bảo mật...");

  try {
    const res = await fetch('/api/mbti?action=questions');
    if (!res.ok) throw new Error("Không thể kết nối đến máy chủ lấy đề.");
    const questions = await res.json();

    mbtiState.questions = questions;
    mbtiState.currIdx = 0;
    mbtiState.selectedAnswers = new Array(questions.length).fill(null);

    // Show test screen
    renderMBTI(containerId);
    document.getElementById('mbti-scr-intro').classList.remove('active');
    document.getElementById('mbti-scr-test').classList.add('active');

    // Render Question Grid Phím tắt
    const gridContainer = document.getElementById('mbti-grid-elements');
    if (gridContainer) {
      gridContainer.innerHTML = '';
      questions.forEach((_, idx) => {
        const item = document.createElement('div');
        item.className = 'mbti-grid-item';
        item.id = `mbti-grid-item-${idx}`;
        item.textContent = idx + 1;
        item.onclick = () => jumpToQuestion(idx);
        gridContainer.appendChild(item);
      });
    }

    displayQuestion();

    // Attach actions
    document.getElementById('mbti-btn-prev').onclick = prevQuestion;
    document.getElementById('mbti-btn-next').onclick = nextQuestion;

  } catch (err) {
    showMBTIError(container, err.message, () => renderMBTI(containerId));
  }
}

// ── HIỂN THỊ CÂU HỎI ──────────────────────────────────────────────────
function displayQuestion() {
  const current = mbtiState.questions[mbtiState.currIdx];
  if (!current) return;

  // Cập nhật câu hỏi và chiều kích
  document.getElementById('mbti-q-text').textContent = current.q;
  
  const dimNames = {
    EI: 'Xu hướng Tương tác (Extraversion - Introversion)',
    NS: 'Thu thập Thông tin (Sensing - Intuition)',
    TF: 'Đưa ra Quyết định (Thinking - Feeling)',
    JP: 'Cách thức Hành động (Judging - Perceiving)'
  };
  document.getElementById('mbti-q-dim').textContent = `Kích thước: ${dimNames[current.dim] || current.dim}`;

  // Update progress text
  document.getElementById('mbti-progress-text').textContent = `Câu ${mbtiState.currIdx + 1} / ${mbtiState.questions.length}`;

  // Progress Bar fill
  const progressPct = ((mbtiState.currIdx + 1) / mbtiState.questions.length) * 100;
  document.getElementById('mbti-progress-fill').style.width = `${progressPct}%`;

  // Update Grid shortcuts class
  mbtiState.questions.forEach((_, idx) => {
    const gridItem = document.getElementById(`mbti-grid-item-${idx}`);
    if (gridItem) {
      gridItem.classList.remove('active', 'answered');
      if (idx === mbtiState.currIdx) {
        gridItem.classList.add('active');
      } else if (mbtiState.selectedAnswers[idx] !== null) {
        gridItem.classList.add('answered');
      }
    }
  });

  // Reset Likert selections
  const container = document.getElementById('mbti-likert-container');
  const buttons = container.querySelectorAll('.mbti-likert-btn');
  const chosenVal = mbtiState.selectedAnswers[mbtiState.currIdx];

  buttons.forEach(btn => {
    btn.classList.remove('selected');
    const val = parseInt(btn.getAttribute('data-value'));
    if (val === chosenVal) {
      btn.classList.add('selected');
    }
    btn.onclick = () => selectLikertValue(val);
  });

  // Điều chỉnh nút Next/Nộp bài
  const nextBtn = document.getElementById('mbti-btn-next');
  if (mbtiState.currIdx === mbtiState.questions.length - 1) {
    nextBtn.innerHTML = 'Nộp bài <i class="fas fa-check-circle"></i>';
    nextBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    nextBtn.style.borderColor = '#10b981';
  } else {
    nextBtn.innerHTML = 'Tiếp theo <i class="fas fa-chevron-right"></i>';
    nextBtn.style.background = '#8b5cf6';
    nextBtn.style.borderColor = '#8b5cf6';
  }
}

// ── XỬ LÝ CLICK LIKERT ──────────────────────────────────────────────
function selectLikertValue(val) {
  if (isTransitioning) return;

  mbtiState.selectedAnswers[mbtiState.currIdx] = val;

  // Visual feedback: disable all buttons and select current
  const container = document.getElementById('mbti-likert-container');
  if (container) {
    const buttons = container.querySelectorAll('.mbti-likert-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      const btnVal = parseInt(btn.getAttribute('data-value'));
      if (btnVal === val) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  // Highlight answered question in grid shortcut
  const gridItem = document.getElementById(`mbti-grid-item-${mbtiState.currIdx}`);
  if (gridItem) {
    gridItem.classList.add('answered');
  }

  // Auto next if not on the last question
  if (mbtiState.currIdx < mbtiState.questions.length - 1) {
    isTransitioning = true;
    setTimeout(() => {
      mbtiState.currIdx++;
      displayQuestion();
      isTransitioning = false;
    }, 200);
  } else {
    displayQuestion();
  }
}

// ── ĐIỀU HƯỚNG ────────────────────────────────────────────────────────
function prevQuestion() {
  if (isTransitioning) return;
  if (mbtiState.currIdx > 0) {
    mbtiState.currIdx--;
    displayQuestion();
  }
}

function nextQuestion() {
  if (isTransitioning) return;
  if (mbtiState.currIdx < mbtiState.questions.length - 1) {
    mbtiState.currIdx++;
    displayQuestion();
  } else {
    // Nộp bài
    finishMBTITest();
  }
}

function jumpToQuestion(idx) {
  if (isTransitioning) return;
  mbtiState.currIdx = idx;
  displayQuestion();
}

// ── NỘP BÀI VÀ NHẬN KẾT QUẢ MBTI ──────────────────────────────────────
async function finishMBTITest() {
  // Validate all questions are answered
  const unansweredIndices = [];
  mbtiState.selectedAnswers.forEach((ans, idx) => {
    if (ans === null) unansweredIndices.push(idx + 1);
  });

  if (unansweredIndices.length > 0) {
    alert(`Vui lòng hoàn thành tất cả câu hỏi trước khi nộp bài. Câu chưa trả lời: ${unansweredIndices.join(', ')}`);
    // Nhảy tới câu chưa trả lời đầu tiên
    mbtiState.currIdx = mbtiState.selectedAnswers.findIndex(ans => ans === null);
    displayQuestion();
    return;
  }

  const container = document.getElementById('mbtiContent');
  showMBTILoading(container, "Đang gửi bài và tính toán chỉ số tính cách MBTI của bạn...");

  try {
    const answersPayload = mbtiState.selectedAnswers.map((sel, idx) => ({
      qIdx: mbtiState.questions[idx].qIdx,
      selected: sel
    }));

    const res = await fetch('/api/mbti?action=submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: mbtiState.userName,
        age: mbtiState.userAge,
        answers: answersPayload
      })
    });

    if (!res.ok) throw new Error("Chấm điểm MBTI thất bại.");
    const result = await res.json(); // returns { type: 'INTJ', breakdown: { E: 30, I: 70, N: 75, S: 25, ... } }

    renderMBTI('mbtiContent');
    document.getElementById('mbti-scr-intro').classList.remove('active');
    document.getElementById('mbti-scr-test').classList.remove('active');
    document.getElementById('mbti-scr-result').classList.add('active');

    // Render text kết quả
    const typeKey = result.type;
    const profile = MBTI_PROFILES[typeKey] || {
      icon: "❓",
      title: "Chưa xác định",
      summary: "Có lỗi khi xác định tính cách của bạn.",
      strengths: [],
      weaknesses: [],
      careers: [],
      famous: []
    };

    document.getElementById('mbti-res-type').textContent = typeKey;
    document.getElementById('mbti-res-title').innerHTML = `${profile.icon} ${profile.title}`;
    document.getElementById('mbti-res-summary').textContent = profile.summary;

    // Render Dimension Progress bars
    const dimContainer = document.getElementById('mbti-res-dimensions');
    if (dimContainer) {
      dimContainer.innerHTML = '';
      
      const dims = [
        { key: 'EI', left: 'E', right: 'I', leftLabel: 'Hướng ngoại (Extraversion)', rightLabel: 'Hướng nội (Introversion)', colorLeft: '#f59e0b', colorRight: '#3b82f6' },
        { key: 'NS', left: 'N', right: 'S', leftLabel: 'Trực giác (Intuition)', rightLabel: 'Cảm giác (Sensing)', colorLeft: '#8b5cf6', colorRight: '#10b981' },
        { key: 'TF', left: 'T', right: 'F', leftLabel: 'Lý trí (Thinking)', rightLabel: 'Cảm xúc (Feeling)', colorLeft: '#06b6d4', colorRight: '#ec4899' },
        { key: 'JP', left: 'J', right: 'P', leftLabel: 'Nguyên tắc (Judging)', rightLabel: 'Linh hoạt (Perceiving)', colorLeft: '#f97316', colorRight: '#84cc16' }
      ];

      dims.forEach(d => {
        const valLeft = result.breakdown[d.left] || 50;
        const valRight = 100 - valLeft;

        dimContainer.innerHTML += `
          <div class="mbti-dimension-card">
            <div class="mbti-dim-header">
              <span style="color: ${d.colorLeft}">${d.leftLabel}</span>
              <span style="color: ${d.colorRight}">${d.rightLabel}</span>
            </div>
            <div class="mbti-dim-bar-container">
              <div class="mbti-dim-bar-left" style="width: ${valLeft}%; --left-color: ${d.colorLeft}"></div>
              <div class="mbti-dim-bar-right" style="width: ${valRight}%; --right-color: ${d.colorRight}"></div>
            </div>
            <div class="mbti-dim-labels">
              <span><strong>${valLeft}%</strong></span>
              <span><strong>${valRight}%</strong></span>
            </div>
          </div>
        `;
      });
    }

    // Render Detailed Report Sections
    const detailsContainer = document.getElementById('mbti-res-details');
    if (detailsContainer && profile.strengths.length > 0) {
      let strengthsHtml = profile.strengths.map(s => `<li>${s}</li>`).join('');
      let weaknessesHtml = profile.weaknesses.map(w => `<li>${w}</li>`).join('');
      let careersHtml = profile.careers.map(c => `<li>${c}</li>`).join('');
      let famousHtml = profile.famous.map(f => `
        <div class="mbti-famous-item">
          <div class="mbti-famous-name">${f.name}</div>
          <div class="mbti-famous-role">${f.role}</div>
        </div>
      `).join('');

      detailsContainer.innerHTML = `
        <div class="mbti-report-section">
          <div class="mbti-section-title"><i class="fas fa-thumbs-up"></i> Điểm Mạnh Vượt Trội</div>
          <div class="mbti-section-content">
            <ul style="margin: 0; padding-left: 20px;">${strengthsHtml}</ul>
          </div>
        </div>

        <div class="mbti-report-section">
          <div class="mbti-section-title"><i class="fas fa-exclamation-triangle"></i> Điểm Cần Cải Thiện</div>
          <div class="mbti-section-content">
            <ul style="margin: 0; padding-left: 20px;">${weaknessesHtml}</ul>
          </div>
        </div>

        <div class="mbti-report-section">
          <div class="mbti-section-title"><i class="fas fa-briefcase"></i> Định Hướng Nghề Nghiệp Phù Hợp</div>
          <div class="mbti-section-content">
            <ul style="margin: 0; padding-left: 20px;">${careersHtml}</ul>
          </div>
        </div>

        <div class="mbti-report-section">
          <div class="mbti-section-title"><i class="fas fa-star"></i> Những Người Nổi Tiếng Cùng Nhóm</div>
          <div class="mbti-famous-grid">${famousHtml}</div>
        </div>
      `;
    }

    // Attach restart
    document.getElementById('mbti-btn-restart').onclick = () => renderMBTI('mbtiContent');

  } catch (err) {
    showMBTIError(container, err.message, () => renderMBTI('mbtiContent'));
  }
}
