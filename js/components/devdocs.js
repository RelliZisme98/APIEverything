/**
 * components/devdocs.js
 * DevDocs Live & Offline Ebook Knowledge Hub
 * - Hỗ trợ cả sách offline tự biên soạn và tải tài liệu trực tiếp từ CDN chính thức của DevDocs.io.
 * - Sử dụng browser Cache Storage API để lưu trữ ngoại tuyến bộ tài liệu đầy đủ (index.json & db.json).
 * - Hỗ trợ thanh tiến trình, nút điều hướng trang, tìm kiếm toàn văn và ghi chú cá nhân lưu LocalStorage.
 */

// ── DANH SÁCH TÀI LIỆU DEVDOCS CHÍNH THỨC HỖ TRỢ ──────────────────────
const LIVE_DOCS_REGISTRY = {
  'git': { title: 'Git Version Control', size: '1.2 MB' },
  'javascript': { title: 'JavaScript (MDN)', size: '14.3 MB' },
  'css': { title: 'CSS Reference', size: '4.8 MB' },
  'html': { title: 'HTML Reference', size: '2.1 MB' },
  'python~3.10': { title: 'Python 3.10', size: '8.4 MB' },
  'go': { title: 'Go Programming', size: '2.5 MB' },
  'rust': { title: 'Rust Reference', size: '11.8 MB' },
  'cpp': { title: 'C++ Language', size: '4.2 MB' },
  'c': { title: 'C Standard Library', size: '1.8 MB' },
  'nginx': { title: 'Nginx Web Server', size: '1.1 MB' },
  'postgresql~14': { title: 'PostgreSQL 14', size: '6.7 MB' },
  'docker': { title: 'Docker Documentation', size: '3.9 MB' }
};

// ── SÁCH OFFLINE MẪU TỰ BIÊN SOẠN (FALLBACK LOCAL EBOOKS) ─────────────
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

// Trạng thái hoạt động
let activeSource = 'local-gitflow'; // Có thể là khóa của LOCAL_EBOOKS hoặc LIVE_DOCS_REGISTRY
let activeEntryIndex = 0;
let searchFilterQuery = '';
let showingSearchResults = false;

// Bộ nhớ đệm dữ liệu tải từ CDN
let loadedIndexData = null; // Mảng các entry từ index.json
let loadedDbData = null;    // Object nội dung từ db.json
let isDownloading = false;
let downloadProgress = '';

export function renderDevDocs(containerId = 'devdocsContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <!-- Stylesheets nội bộ cho module DevDocs -->
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
        max-height: 350px;
        overflow-y: auto;
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
      /* Căn chỉnh lại HTML thô từ DevDocs CDN */
      .ebook-body h1, .ebook-body h2, .ebook-body h3 {
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
            <optgroup label="Tài liệu mẫu nội bộ">
              ${Object.keys(LOCAL_EBOOKS).map(key => `
                <option value="${key}" ${key === activeSource ? 'selected' : ''}>
                  📓 ${LOCAL_EBOOKS[key].title}
                </option>
              `).join('')}
            </optgroup>
            <optgroup label="Thư viện DevDocs.io (Tải Live/Offline)">
              ${Object.keys(LIVE_DOCS_REGISTRY).map(key => `
                <option value="${key}" ${key === activeSource ? 'selected' : ''}>
                  🌐 ${LIVE_DOCS_REGISTRY[key].title} (${LIVE_DOCS_REGISTRY[key].size})
                </option>
              `).join('')}
            </optgroup>
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

  // Tải nguồn hiện tại
  checkAndLoadSource();
}

// ── KIỂM TRA VÀ TẢI TÀI LIỆU (CACHE HOẶC ONLINE) ─────────────────────
async function checkAndLoadSource() {
  const banner = document.getElementById('ebook-offline-status-banner');
  if (!banner) return;

  // Nếu là tài liệu mẫu local
  if (LOCAL_EBOOKS[activeSource]) {
    banner.innerHTML = `<span style="font-size:11px; color:#34d399; font-weight:700;"><i class="fas fa-check-circle"></i> Sẵn sàng ngoại tuyến (Tích hợp sẵn)</span>`;
    loadedIndexData = LOCAL_EBOOKS[activeSource].chapters;
    renderSidebarAndReader();
    return;
  }

  // Nếu là tài liệu từ DevDocs CDN
  const slug = activeSource;
  const isCached = await checkCacheStatus(slug);

  if (isCached) {
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

    // Load data from Cache API
    await loadFromCache(slug);
  } else {
    // Chưa tải offline
    banner.innerHTML = `
      <div class="download-banner">
        <div style="font-weight:700; color:#ffd700;">Tài liệu chưa được lưu ngoại tuyến.</div>
        <div style="font-size:11px; color:var(--text-muted);">Bạn có thể đọc trực tiếp online hoặc tải xuống toàn bộ (${LIVE_DOCS_REGISTRY[slug].size}) để đọc khi không có mạng.</div>
        <button class="download-btn" id="ebook-download-btn">${isDownloading ? downloadProgress : '⚡ Tải Ngoại Tuyến'}</button>
      </div>
    `;
    const btn = document.getElementById('ebook-download-btn');
    if (isDownloading) btn.disabled = true;
    btn.onclick = () => downloadLiveDoc(slug);

    // Thử load trực tiếp từ internet (Online mode)
    await loadFromInternet(slug);
  }

  renderSidebarAndReader();
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

async function loadFromInternet(slug) {
  try {
    // Lấy index trực tiếp
    const res = await fetch(`https://documents.devdocs.io/${slug}/index.json`);
    if (res.ok) {
      const data = await res.json();
      loadedIndexData = data.entries;
    }
  } catch (e) {
    loadedIndexData = null;
    console.warn('Không có kết nối mạng để đọc online');
  }
}

async function downloadLiveDoc(slug) {
  if (isDownloading) return;
  isDownloading = true;
  downloadProgress = 'Đang kết nối...';
  checkAndLoadSource();

  try {
    const cache = await caches.open('rellia-devdocs-cdn');
    
    // 1. Tải index.json
    downloadProgress = 'Tải Index (10%)...';
    checkAndLoadSource();
    const indexUrl = `https://documents.devdocs.io/${slug}/index.json`;
    const indexRes = await fetch(indexUrl);
    if (!indexRes.ok) throw new Error('Không thể tải index.json');
    await cache.put(indexUrl, indexRes.clone());

    // 2. Tải db.json
    downloadProgress = 'Tải Database (50%)...';
    checkAndLoadSource();
    const dbUrl = `https://documents.devdocs.io/${slug}/db.json`;
    const dbRes = await fetch(dbUrl);
    if (!dbRes.ok) throw new Error('Không thể tải db.json');
    await cache.put(dbUrl, dbRes.clone());

    downloadProgress = 'Hoàn tất!';
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

  // Load Note cho Book hiện tại
  if (notepad) {
    notepad.value = localStorage.getItem(`rellia_devdocs_note_${activeSource}`) || '';
  }

  // Nếu chưa tải xong index
  if (!loadedIndexData) {
    sidebarList.innerHTML = `<div style="font-size:12.5px; color:var(--text-muted); text-align:center; padding:20px 0;"><i class="fas fa-exclamation-triangle"></i> Yêu cầu kết nối mạng hoặc nhấn Tải ngoại tuyến để xem mục lục.</div>`;
    renderReaderPaneContent();
    return;
  }

  // Lọc tìm kiếm
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
    // Tìm index gốc tương ứng trong loadedIndexData
    const origIdx = loadedIndexData.findIndex(e => e.path === entry.path);

    const item = document.createElement('div');
    item.className = `ebook-toc-item ${origIdx === activeEntryIndex ? 'active' : ''}`;
    item.innerHTML = `
      <i class="far fa-file-alt"></i>
      <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${entry.name}</span>
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
    more.textContent = `...và ${filteredEntries.length - 150} tài liệu khác (hãy gõ tìm kiếm để lọc)`;
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
        <i class="fas fa-wifi" style="font-size:40px; color:rgba(255,255,255,0.2);"></i>
        <div style="font-size:16px; font-weight:700; color:var(--text-muted);">Không có dữ liệu hiển thị</div>
      </div>
    `;
    return;
  }

  const currentEntry = loadedIndexData[activeEntryIndex];
  if (!currentEntry) {
    readerPane.innerHTML = `<div style="font-size:14px; color:var(--text-muted); text-align:center; margin-top:100px;">Không có tài liệu nào phù hợp.</div>`;
    return;
  }

  // Tính tiến trình
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
      htmlContent = loadedDbData[currentEntry.path] || `<h3>${currentEntry.name}</h3><p>Không tìm thấy nội dung của tài nguyên này trong cơ sở dữ liệu.</p>`;
    } else {
      // Đang đọc online không có db.json cached
      htmlContent = `
        <h3>${currentEntry.name}</h3>
        <div class="ebook-callout note">
          <strong>💡 Chế độ trực tuyến:</strong> Đang lấy nội dung từ internet... Hãy nhấn nút "Tải Ngoại Tuyến" để lưu toàn bộ tài liệu về máy.
        </div>
      `;
      // Fetch nội dung trực tiếp nếu online
      fetchDocContentOnline(currentEntry.path).then(html => {
        const bodyPane = document.getElementById('ebook-live-body-area');
        if (bodyPane) bodyPane.innerHTML = html;
      });
    }
  }

  const titleString = currentEntry.name || currentEntry.title;

  readerPane.innerHTML = `
    <!-- Thanh tiến trình đọc -->
    <div class="ebook-progress-container">
      <div class="ebook-progress-bar" style="width: ${progressPct}%;"></div>
    </div>

    <!-- Nội dung chính -->
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span style="font-size:12px; font-weight:700; color:#8b5cf6; text-transform:uppercase; letter-spacing:0.1em;">
          ${LIVE_DOCS_REGISTRY[activeSource]?.title || LOCAL_EBOOKS[activeSource]?.title}
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

// Lấy nội dung HTML đơn lẻ trực tuyến nếu chưa tải db.json
async function fetchDocContentOnline(path) {
  try {
    const res = await fetch(`https://documents.devdocs.io/${activeSource}/db.json`);
    if (res.ok) {
      const db = await res.json();
      return db[path] || `<p>Không tìm thấy nội dung của trang: ${path}</p>`;
    }
  } catch (e) {
    return `<p style="color:#ef4444;">Không thể tải nội dung do mất kết nối mạng.</p>`;
  }
}
