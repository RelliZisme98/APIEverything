/**
 * components/devdocs.js
 * DevDocs Live & Offline Ebook Knowledge Hub
 * - Hỗ trợ cả sách offline tự biên soạn và tải tài liệu trực tiếp từ CDN chính thức của DevDocs.io.
 * - Tự động nạp danh sách 100+ bộ tài liệu lập trình thế giới từ DevDocs.io (docs.json).
 * - Tải chỉ mục nhanh (index.json) và tự động đồng bộ nền cơ sở dữ liệu nội dung (db.json).
 * - Sử dụng browser Cache Storage API để lưu ngoại tuyến và truy cập không cần internet.
 * - Tối ưu hóa UI/UX: Hiệu ứng loading mượt mà, phân trang, thanh tiến trình đọc, ghi chú học tập.
 */

// ── SÁCH OFFLINE MẪU TỰ BIÊN SOẠN (LOCAL EBOOKS) ─────────────
const LOCAL_EBOOKS = {
  'local-gitflow': {
    title: '[Nội bộ] Quy trình Git Flow & Branching',
    accent: '#a78bfa',
    chapters: [
      {
        name: 'Giới thiệu Git Flow',
        path: 'ch1',
        content: `
          <h3>Quy trình phân nhánh Git Flow</h3>
          <div class="ebook-callout note">
            <strong>💡 Khái niệm:</strong> Git Flow cô lập mã nguồn phát hành (main) khỏi nhánh phát triển (develop) để đảm bảo chất lượng phần mềm.
          </div>
          <p>Mô hình này giúp các nhóm phát triển lớn cộng tác trơn tru thông qua các nhánh tính năng ngắn hạn (feature/*), phát hành (release/*) và sửa lỗi khẩn cấp (hotfix/*).</p>
        `,
        code: `git checkout develop\ngit checkout -b feature/login-screen`
      }
    ]
  },
  'local-odoo': {
    title: '[Nội bộ] Phát Triển Odoo ERP',
    accent: '#a855f7',
    chapters: [
      {
        name: 'Odoo ORM & Decorators',
        path: 'ch1',
        content: `
          <h3>Các Decorators trong Odoo</h3>
          <p>Odoo sử dụng các decorator như <code>@api.depends</code>, <code>@api.onchange</code> và <code>@api.constrains</code> để quản lý luồng dữ liệu tự động giữa client và database.</p>
        `,
        code: `@api.depends('price_unit', 'tax_ids')\ndef _compute_amount(self):\n    for rec in self:\n        rec.amount = rec.price_unit * 1.1`
      }
    ]
  }
};

// Đăng ký danh sách tài liệu mặc định (sử dụng làm fallback trước khi tải docs.json)
const FALLBACK_REGISTRY = [
  { name: 'Git', slug: 'git', db_size: 1228800 },
  { name: 'JavaScript', slug: 'javascript', db_size: 14994636 },
  { name: 'CSS', slug: 'css', db_size: 5033164 },
  { name: 'HTML', slug: 'html', db_size: 2202009 },
  { name: 'Python', slug: 'python~3.10', db_size: 8808038 },
  { name: 'Go', slug: 'go', db_size: 2621440 },
  { name: 'Rust', slug: 'rust', db_size: 12373196 },
  { name: 'C++', slug: 'cpp', db_size: 4404019 },
  { name: 'C', slug: 'c', db_size: 1887436 },
  { name: 'Nginx', slug: 'nginx', db_size: 1153433 },
  { name: 'PostgreSQL 14', slug: 'postgresql~14', db_size: 7025459 },
  { name: 'Docker', slug: 'docker', db_size: 4089446 }
];

// Trạng thái hoạt động toàn cục của Module
let devdocsRegistry = []; // Chứa toàn bộ danh sách docs.json tải động từ CDN
let activeSource = 'local-gitflow';
let activeEntryIndex = 0;
let searchFilterQuery = '';
let showingSearchResults = false;

// Trạng thái dữ liệu tải từ CDN cho tài liệu đang chọn
let loadedIndexData = null;
let loadedDbData = null;
let isDownloading = false;
let downloadProgress = '';
let currentAbortController = null;

// Khởi động danh mục tài liệu từ CDN
async function initRegistry() {
  if (devdocsRegistry.length > 0) return;
  try {
    const res = await fetch('https://documents.devdocs.io/docs.json');
    if (res.ok) {
      const data = await res.json();
      devdocsRegistry = data.filter(d => d.slug && d.name);
      devdocsRegistry.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      devdocsRegistry = FALLBACK_REGISTRY;
    }
  } catch (e) {
    console.warn('[DevDocs] Lỗi nạp danh mục CDN, sử dụng dữ liệu mặc định.');
    devdocsRegistry = FALLBACK_REGISTRY;
  }
}

export function renderDevDocs(containerId = 'devdocsContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <style>
      .ebook-container {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 24px;
        align-items: start;
        margin-top: 12px;
      }
      @media (max-width: 950px) {
        .ebook-container {
          grid-template-columns: 1fr;
        }
      }

      /* Book Sidebar */
      .ebook-sidebar {
        background: rgba(18, 16, 38, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: var(--radius);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        backdrop-filter: blur(16px);
        max-height: 850px;
        overflow-y: auto;
      }

      .ebook-book-selector {
        width: 100%;
        padding: 11px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
        font-weight: 700;
        outline: none;
        cursor: pointer;
        transition: all 0.25s ease;
      }
      .ebook-book-selector:focus {
        border-color: #8b5cf6;
      }

      /* Navigation Table of Contents */
      .ebook-toc-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 8px;
        max-height: 380px;
        overflow-y: auto;
        padding-right: 4px;
      }
      
      /* Webkit Scrollbar Styling cho mục lục */
      .ebook-toc-list::-webkit-scrollbar {
        width: 5px;
      }
      .ebook-toc-list::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.01);
        border-radius: 3px;
      }
      .ebook-toc-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
      }
      .ebook-toc-list::-webkit-scrollbar-thumb:hover {
        background: rgba(139, 92, 246, 0.3);
      }

      .ebook-toc-item {
        padding: 10px 14px;
        border-radius: var(--radius-sm);
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ebook-toc-item:hover {
        background: rgba(255, 255, 255, 0.03);
        color: var(--text-primary);
      }
      .ebook-toc-item.active {
        background: rgba(139, 92, 246, 0.15);
        color: #c084fc;
        border-left: 3px solid #8b5cf6;
      }

      /* Reader Area */
      .ebook-reader-card {
        background: rgba(18, 16, 38, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: var(--radius);
        padding: 32px;
        backdrop-filter: blur(16px);
        position: relative;
        min-height: 600px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      /* Reading Progress Bar */
      .ebook-progress-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: rgba(255, 255, 255, 0.05);
      }
      .ebook-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #8b5cf6, #3b82f6);
        width: 0%;
        transition: width 0.3s ease;
      }

      .ebook-body {
        font-size: 14.5px;
        line-height: 1.8;
        color: var(--text-secondary);
        margin: 20px 0;
      }
      /* Định dạng lại HTML kết xuất từ CDN DevDocs */
      .ebook-body h1, .ebook-body h2, .ebook-body h3, .ebook-body h4 {
        color: #ffd700;
        margin: 24px 0 12px;
        font-weight: 700;
      }
      .ebook-body p {
        margin-bottom: 14px;
      }
      .ebook-body pre {
        background: #090812;
        padding: 16px;
        border-radius: 6px;
        overflow-x: auto;
        font-family: monospace;
        margin: 16px 0;
      }
      .ebook-body code {
        color: #f43f5e;
        background: rgba(244, 63, 94, 0.08);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 13.5px;
      }
      .ebook-body pre code {
        color: #e2e8f0;
        background: transparent;
        padding: 0;
      }

      .ebook-callout {
        padding: 16px;
        border-radius: var(--radius-sm);
        font-size: 13.5px;
        margin: 16px 0;
        border-left: 4px solid;
      }
      .ebook-callout.note {
        background: rgba(139, 92, 246, 0.06);
        border-left-color: #8b5cf6;
        color: var(--text-secondary);
      }

      /* Pagination Footer */
      .ebook-pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 18px;
        margin-top: 30px;
      }

      /* Notepad sidebar */
      .ebook-notepad-title {
        font-size: 12px;
        font-weight: 700;
        color: #ffd700;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .ebook-notepad-textarea {
        width: 100%;
        height: 100px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
        font-size: 12px;
        padding: 10px;
        resize: none;
        outline: none;
      }
      .ebook-notepad-textarea:focus {
        border-color: #8b5cf6;
      }

      /* Download banner */
      .download-banner {
        background: rgba(139, 92, 246, 0.08);
        border: 1px solid rgba(139, 92, 246, 0.25);
        border-radius: var(--radius-sm);
        padding: 12px;
        font-size: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .download-btn {
        background: #8b5cf6;
        color: #fff;
        border: none;
        padding: 6px 12px;
        font-weight: bold;
        border-radius: 4px;
        cursor: pointer;
        text-align: center;
      }
      .download-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    </style>

    <div class="ebook-container">
      <!-- Cột trái: Kệ sách, Tìm kiếm & Mục lục -->
      <div class="ebook-sidebar">
        <!-- Lựa chọn cuốn sách -->
        <div>
          <label style="display:block; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px; letter-spacing:0.05em;">Chọn Tài Liệu / Sách</label>
          <select class="ebook-book-selector" id="ebook-select-book-dropdown">
            <option value="local-gitflow">📓 [Nội bộ] Quy trình Git Flow & Branching</option>
            <option value="local-odoo">📓 [Nội bộ] Phát Triển Odoo ERP</option>
            <option disabled>─ Tải danh sách DevDocs.io... ─</option>
          </select>
        </div>

        <!-- Trạng thái lưu trữ ngoại tuyến của tài liệu Live -->
        <div id="ebook-offline-status-banner"></div>

        <!-- Tìm kiếm sách -->
        <div>
          <input type="text" class="devdocs-search-input" id="ebook-search-bar" placeholder="Tìm nhanh tiêu đề..." value="${searchFilterQuery}">
        </div>

        <!-- Danh sách chương sách / Kết quả tìm kiếm -->
        <div id="ebook-sidebar-dynamic-list"></div>

        <!-- Notepad Cá Nhân -->
        <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:14px; margin-top:8px;">
          <div class="ebook-notepad-title"><i class="fas fa-sticky-note" style="margin-right:6px;"></i> Sổ tay học tập</div>
          <textarea class="ebook-notepad-textarea" id="ebook-notepad-box" placeholder="Viết ghi chú nhanh cho tài liệu này..."></textarea>
          <div style="text-align:right; margin-top:4px;">
            <span style="font-size:10px; color:#34d399;" id="ebook-note-status">Đã lưu tự động</span>
          </div>
        </div>
      </div>

      <!-- Cột phải: Trình đọc ebook -->
      <div class="ebook-reader-card" id="ebook-reader-card-pane"></div>
    </div>
  `;

  // Gắn sự kiện chuyển tài liệu
  const dropdown = document.getElementById('ebook-select-book-dropdown');
  dropdown.onchange = async (e) => {
    activeSource = e.target.value;
    activeEntryIndex = 0;
    showingSearchResults = false;
    loadedIndexData = null;
    loadedDbData = null;
    await checkAndLoadSource();
  };

  // Tìm kiếm
  const searchBar = document.getElementById('ebook-search-bar');
  searchBar.oninput = (e) => {
    searchFilterQuery = e.target.value.toLowerCase().trim();
    showingSearchResults = searchFilterQuery.length > 0;
    renderSidebarAndReader();
  };

  // Notepad
  const notepad = document.getElementById('ebook-notepad-box');
  notepad.oninput = (e) => {
    const status = document.getElementById('ebook-note-status');
    status.textContent = 'Đang lưu...';
    localStorage.setItem(`rellia_devdocs_note_${activeSource}`, e.target.value);
    setTimeout(() => {
      status.textContent = 'Đã lưu tự động';
    }, 500);
  };

  // Nạp danh mục đầy đủ từ DevDocs CDN và cập nhật dropdown
  initRegistry().then(() => {
    populateBookSelector();
    checkAndLoadSource();
  });
}

// ── CẬP NHẬT DANH SÁCH DROPDOWN TÀI LIỆU DYNAMIC ──────────────────────
function populateBookSelector() {
  const dropdown = document.getElementById('ebook-select-book-dropdown');
  if (!dropdown) return;

  const popularSlugs = ['git', 'javascript', 'css', 'html', 'python~3.10', 'go', 'rust', 'cpp', 'c', 'postgresql~14', 'nginx', 'docker'];
  const popularDocs = devdocsRegistry.filter(d => popularSlugs.includes(d.slug));
  const otherDocs = devdocsRegistry.filter(d => !popularSlugs.includes(d.slug));

  let html = '';

  // Nhóm 1: Sách local
  html += `<optgroup label="Tài liệu mẫu nội bộ">`;
  Object.keys(LOCAL_EBOOKS).forEach(key => {
    html += `<option value="${key}" ${key === activeSource ? 'selected' : ''}>${LOCAL_EBOOKS[key].title}</option>`;
  });
  html += `</optgroup>`;

  // Nhóm 2: Các tài liệu phổ biến
  if (popularDocs.length > 0) {
    html += `<optgroup label="Tài liệu phổ biến (DevDocs.io)">`;
    popularDocs.forEach(d => {
      const sizeMB = d.db_size ? ` (${(d.db_size / 1024 / 1024).toFixed(1)} MB)` : '';
      html += `<option value="${d.slug}" ${d.slug === activeSource ? 'selected' : ''}>${d.name}${sizeMB}</option>`;
    });
    html += `</optgroup>`;
  }

  // Nhóm 3: Các tài liệu khác
  if (otherDocs.length > 0) {
    html += `<optgroup label="Tất cả tài liệu khác (Hơn 100+ thư viện)">`;
    otherDocs.forEach(d => {
      const sizeMB = d.db_size ? ` (${(d.db_size / 1024 / 1024).toFixed(1)} MB)` : '';
      html += `<option value="${d.slug}" ${d.slug === activeSource ? 'selected' : ''}>${d.name}${sizeMB}</option>`;
    });
    html += `</optgroup>`;
  }

  dropdown.innerHTML = html;
}

// ── KIỂM TRA VÀ TẢI TÀI LIỆU (CACHE HOẶC ONLINE) ─────────────────────
async function checkAndLoadSource() {
  const banner = document.getElementById('ebook-offline-status-banner');
  const sidebarList = document.getElementById('ebook-sidebar-dynamic-list');

  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;

  // Hiển thị trạng thái loading mượt mà
  if (sidebarList) {
    sidebarList.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; padding:40px 0; flex-direction:column; gap:12px;">
        <i class="fas fa-circle-notch fa-spin" style="font-size:24px; color:#8b5cf6;"></i>
        <span style="font-size:12.5px; color:var(--text-muted);">Đang nạp chỉ mục...</span>
      </div>
    `;
  }

  // Nếu là tài liệu mẫu local
  if (LOCAL_EBOOKS[activeSource]) {
    if (banner) {
      banner.innerHTML = `<span style="font-size:11px; color:#34d399; font-weight:700;"><i class="fas fa-check-circle"></i> Sẵn sàng ngoại tuyến (Tích hợp sẵn)</span>`;
    }
    loadedIndexData = LOCAL_EBOOKS[activeSource].chapters;
    loadedDbData = {};
    renderSidebarAndReader();
    return;
  }

  const slug = activeSource;
  const isCached = await checkCacheStatus(slug);

  if (isCached) {
    if (banner) {
      banner.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; color:#34d399; font-weight:700;"><i class="fas fa-check-circle"></i> Đã tải ngoại tuyến</span>
          <button class="download-btn" style="background:#ef4444; padding:2px 8px; font-size:10px;" id="ebook-clear-cache-btn">Xóa</button>
        </div>
      `;
      document.getElementById('ebook-clear-cache-btn').onclick = async () => {
        await deleteCache(slug);
        checkAndLoadSource();
      };
    }

    // Nạp dữ liệu nhanh từ Cache Storage
    await loadFromCache(slug);
    renderSidebarAndReader();
  } else {
    // Chưa tải offline
    const docMeta = devdocsRegistry.find(d => d.slug === slug) || { name: slug, db_size: 5000000 };
    const sizeStr = docMeta.db_size ? `(${(docMeta.db_size / 1024 / 1024).toFixed(1)} MB)` : '';

    if (banner) {
      banner.innerHTML = `
        <div class="download-banner">
          <div style="font-weight:700; color:#ffd700; display:flex; justify-content:space-between; align-items:center;">
            <span>Chưa lưu ngoại tuyến</span>
            <button class="download-btn" style="font-size:11px; padding:3px 8px;" id="ebook-download-btn">${isDownloading ? downloadProgress : 'Tải Ngoại Tuyến'}</button>
          </div>
          <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">Tải về ${sizeStr} để đọc mượt mà và offline.</div>
        </div>
      `;
      const btn = document.getElementById('ebook-download-btn');
      if (isDownloading) btn.disabled = true;
      btn.onclick = () => downloadLiveDoc(slug);
    }

    // Nạp trước index.json online để hiển thị ngay mục lục cho người dùng đọc
    try {
      const res = await fetch(`https://documents.devdocs.io/${slug}/index.json`, { signal });
      if (res.ok) {
        const indexJson = await res.json();
        loadedIndexData = indexJson.entries;
        renderSidebarAndReader();
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      loadedIndexData = null;
      renderSidebarAndReader();
      return;
    }

    // Tự động nạp db.json nền để tối ưu hóa tốc độ chuyển trang
    try {
      const dbRes = await fetch(`https://documents.devdocs.io/${slug}/db.json`, { signal });
      if (dbRes.ok) {
        loadedDbData = await dbRes.json();
        // Cập nhật khi tải xong
        renderSidebarAndReader();
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      loadedDbData = null;
    }
  }
}

async function checkCacheStatus(slug) {
  try {
    const cache = await caches.open('rellia-devdocs-cdn');
    const indexRes = await cache.match(`https://documents.devdocs.io/${slug}/index.json`);
    const dbRes = await cache.match(`https://documents.devdocs.io/${slug}/db.json`);
    return !!(indexRes && dbRes);
  } catch (e) {
    return false;
  }
}

async function deleteCache(slug) {
  try {
    const cache = await caches.open('rellia-devdocs-cdn');
    await cache.delete(`https://documents.devdocs.io/${slug}/index.json`);
    await cache.delete(`https://documents.devdocs.io/${slug}/db.json`);
  } catch (e) {
    console.error(e);
  }
}

async function loadFromCache(slug) {
  try {
    const cache = await caches.open('rellia-devdocs-cdn');
    const indexRes = await cache.match(`https://documents.devdocs.io/${slug}/index.json`);
    const dbRes = await cache.match(`https://documents.devdocs.io/${slug}/db.json`);
    if (indexRes && dbRes) {
      const indexJson = await indexRes.json();
      loadedIndexData = indexJson.entries;
      loadedDbData = await dbRes.json();
    }
  } catch (e) {
    console.error('Lỗi khi đọc Cache:', e);
  }
}

async function downloadLiveDoc(slug) {
  if (isDownloading) return;
  isDownloading = true;
  downloadProgress = 'Đang nạp...';
  checkAndLoadSource();

  try {
    const cache = await caches.open('rellia-devdocs-cdn');

    // 1. Tải index.json
    downloadProgress = 'Index (15%)...';
    checkAndLoadSource();
    const indexUrl = `https://documents.devdocs.io/${slug}/index.json`;
    const indexRes = await fetch(indexUrl);
    if (!indexRes.ok) throw new Error('Không thể tải index.json');
    await cache.put(indexUrl, indexRes.clone());

    // 2. Tải db.json
    downloadProgress = 'Data (55%)...';
    checkAndLoadSource();
    const dbUrl = `https://documents.devdocs.io/${slug}/db.json`;
    const dbRes = await fetch(dbUrl);
    if (!dbRes.ok) throw new Error('Không thể tải db.json');
    await cache.put(dbUrl, dbRes.clone());

    downloadProgress = 'Đã lưu!';
    checkAndLoadSource();
  } catch (e) {
    alert('Lỗi tải dữ liệu ngoại tuyến: ' + e.message);
  } finally {
    isDownloading = false;
    await checkAndLoadSource();
  }
}

// ── RENDER SIDEBAR VÀ READER ─────────────────────────────────────────
function renderSidebarAndReader() {
  const sidebarList = document.getElementById('ebook-sidebar-dynamic-list');
  const notepad = document.getElementById('ebook-notepad-box');
  if (!sidebarList) return;

  // Đồng bộ Note
  if (notepad) {
    notepad.value = localStorage.getItem(`rellia_devdocs_note_${activeSource}`) || '';
  }

  // Nếu chỉ mục index chưa nạp xong
  if (!loadedIndexData) {
    sidebarList.innerHTML = `
      <div style="font-size:12.5px; color:var(--text-muted); text-align:center; padding:20px 0; line-height:1.5;">
        <i class="fas fa-wifi" style="font-size:20px; margin-bottom:8px; display:block;"></i>
        Yêu cầu kết nối mạng để tải chỉ mục hoặc nhấn Tải ngoại tuyến.
      </div>
    `;
    renderReaderPaneContent();
    return;
  }

  // Tìm kiếm cục bộ
  let filteredEntries = loadedIndexData;
  if (showingSearchResults && searchFilterQuery) {
    filteredEntries = loadedIndexData.filter(entry =>
      entry.name.toLowerCase().includes(searchFilterQuery)
    );
  }

  // 1. Render Sidebar list
  sidebarList.innerHTML = `
    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin: 4px 0 8px; letter-spacing: 0.05em;">
      Mục Lục (${filteredEntries.length} mục)
    </div>
    <div class="ebook-toc-list" id="ebook-chapters-ul"></div>
  `;

  const ul = document.getElementById('ebook-chapters-ul');
  filteredEntries.slice(0, 150).forEach((entry, fIdx) => {
    const origIdx = loadedIndexData.findIndex(e => e.path === entry.path);

    const item = document.createElement('div');
    item.className = `ebook-toc-item ${origIdx === activeEntryIndex ? 'active' : ''}`;
    item.innerHTML = `
      <i class="far fa-file-alt"></i>
      <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display:block; width:100%;">${entry.name}</span>
    `;
    item.onclick = () => {
      activeEntryIndex = origIdx;
      renderSidebarAndReader();
    };
    ul.appendChild(item);
  });

  if (filteredEntries.length > 150) {
    const more = document.createElement('div');
    more.style.cssText = 'font-size:11px; color:var(--text-muted); text-align:center; padding:6px;';
    more.textContent = `...và ${filteredEntries.length - 150} tài liệu khác (gõ tìm kiếm để lọc)`;
    ul.appendChild(more);
  }

  // 2. Render nội dung trang đọc
  renderReaderPaneContent();
}

async function renderReaderPaneContent() {
  const readerPane = document.getElementById('ebook-reader-card-pane');
  if (!readerPane) return;

  if (!loadedIndexData) {
    readerPane.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:400px; gap:16px;">
        <i class="fas fa-book-open" style="font-size:40px; color:rgba(255,255,255,0.15);"></i>
        <div style="font-size:15px; font-weight:700; color:var(--text-muted);">Hãy chọn một tài liệu để bắt đầu đọc</div>
      </div>
    `;
    return;
  }

  const currentEntry = loadedIndexData[activeEntryIndex];
  if (!currentEntry) {
    readerPane.innerHTML = `<div style="font-size:14px; color:var(--text-muted); text-align:center; margin-top:100px;">Không tìm thấy trang tài liệu này.</div>`;
    return;
  }

  // Tiến trình đọc sách
  const progressPct = ((activeEntryIndex + 1) / loadedIndexData.length) * 100;

  // Lấy nội dung HTML
  let htmlContent = '';
  let codeSample = '';

  if (LOCAL_EBOOKS[activeSource]) {
    // Tài liệu local
    htmlContent = currentEntry.content;
    codeSample = currentEntry.code;
  } else {
    // Tài liệu live từ CDN
    if (loadedDbData) {
      htmlContent = loadedDbData[currentEntry.path] || `<h3>${currentEntry.name}</h3><p>Không tìm thấy nội dung của trang này.</p>`;
    } else {
      // Đang đồng bộ hóa nền
      htmlContent = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 0; gap:16px;">
          <i class="fas fa-spinner fa-spin" style="font-size:32px; color:#8b5cf6;"></i>
          <div style="font-size:14.5px; font-weight:700; color:var(--text-primary);">Đang đồng bộ hóa nội dung chương...</div>
          <div style="font-size:11.5px; color:var(--text-muted); text-align:center; max-width:320px;">Chúng tôi đang nạp cơ sở dữ liệu lớn ở nền để tối ưu hóa trải nghiệm lật trang mượt mà của bạn.</div>
        </div>
      `;
    }
  }

  const titleString = currentEntry.name || currentEntry.title;
  const currentTitleLabel = devdocsRegistry.find(d => d.slug === activeSource)?.name || LOCAL_EBOOKS[activeSource]?.title || activeSource;

  readerPane.innerHTML = `
    <!-- Thanh tiến trình đọc -->
    <div class="ebook-progress-container">
      <div class="ebook-progress-bar" style="width: ${progressPct}%;"></div>
    </div>

    <!-- Nội dung chính -->
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span style="font-size:12px; font-weight:700; color:#8b5cf6; text-transform:uppercase; letter-spacing:0.1em;">
          ${currentTitleLabel}
        </span>
        <span style="font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:4px;">
          <i class="far fa-clock"></i> Khớp nối Live API
        </span>
      </div>

      <h2 style="font-size:22px; font-weight:800; color:#ffd700; margin-top:12px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:14px; line-height:1.4;">
        ${titleString}
      </h2>

      <div class="ebook-body" id="ebook-live-body-area">
        ${htmlContent}
      </div>

      ${codeSample ? `
        <div style="font-size: 13px; font-weight:700; color:#a78bfa; margin-top: 16px;"><i class="fas fa-code"></i> Ví dụ minh họa:</div>
        <pre class="ebook-body pre"><code>${codeSample.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
      ` : ''}
    </div>

    <!-- Phân trang footer -->
    <div class="ebook-pagination">
      <button class="btn-secondary" id="ebook-btn-prev" style="padding: 8px 14px; font-size:13px; display:flex; align-items:center; gap:6px;" ${activeEntryIndex === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>
        <i class="fas fa-arrow-left"></i> Trang trước
      </button>
      
      <span style="font-size:12.5px; color:var(--text-muted); font-family: monospace;">
        Mục ${activeEntryIndex + 1} / ${loadedIndexData.length}
      </span>

      <button class="btn-primary" id="ebook-btn-next" style="padding: 8px 16px; font-size:13px; background:linear-gradient(135deg, #8b5cf6, #3b82f6); border:none; display:flex; align-items:center; gap:6px;" ${activeEntryIndex === loadedIndexData.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>
        Trang sau <i class="fas fa-arrow-right"></i>
      </button>
    </div>
  `;

  // Gắn sự kiện phân trang
  const btnPrev = document.getElementById('ebook-btn-prev');
  const btnNext = document.getElementById('ebook-btn-next');

  if (btnPrev && activeEntryIndex > 0) {
    btnPrev.onclick = () => {
      activeEntryIndex--;
      renderSidebarAndReader();
    };
  }

  if (btnNext && activeEntryIndex < loadedIndexData.length - 1) {
    btnNext.onclick = () => {
      activeEntryIndex++;
      renderSidebarAndReader();
    };
  }
}
