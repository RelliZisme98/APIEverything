/**
 * components/bookmarks.js
 * Bookmark & Link Manager Module
 * - Cho phép thêm, sửa, xóa, tìm kiếm liên kết (Bookmark).
 * - Lưu trữ trong localStorage để hoạt động bền vững.
 * - Hỗ trợ NHẬP file bookmark xuất ra từ Chrome/Firefox/Safari (định dạng Netscape HTML).
 * - Hỗ trợ XUẤT file bookmark chuẩn Netscape HTML để bạn có thể import ngược lại vào trình duyệt.
 * - Nhận diện favicon tự động thông qua Google Favicon API.
 * - Đếm số lượt click để gợi ý các trang "Được ghé thăm nhiều nhất".
 */

// ── DANH SÁCH LIÊN KẾT MẪU BAN ĐẦU ───────────────────────────
const DEFAULT_BOOKMARKS = [
  { id: 'def_1', title: 'GitHub', url: 'https://github.com', category: 'Lập trình', clicks: 5, addedAt: new Date().toISOString() },
  { id: 'def_2', title: 'Stack Overflow', url: 'https://stackoverflow.com', category: 'Lập trình', clicks: 3, addedAt: new Date().toISOString() },
  { id: 'def_3', title: 'DevDocs.io', url: 'https://devdocs.io', category: 'Tài liệu', clicks: 4, addedAt: new Date().toISOString() },
  { id: 'def_4', title: 'ChatGPT', url: 'https://chatgpt.com', category: 'AI Tools', clicks: 8, addedAt: new Date().toISOString() },
  { id: 'def_5', title: 'Cloudflare', url: 'https://cloudflare.com', category: 'Hạ tầng', clicks: 2, addedAt: new Date().toISOString() },
  { id: 'def_6', title: 'YouTube', url: 'https://youtube.com', category: 'Giải trí', clicks: 1, addedAt: new Date().toISOString() }
];

let bookmarks = [];
let selectedCategory = 'Tất cả';
let searchQuery = '';
let currentEditId = null;

// Phục hồi dữ liệu từ localStorage
function loadBookmarks() {
  const saved = localStorage.getItem('rellia_bookmarks');
  if (saved) {
    try {
      bookmarks = JSON.parse(saved);
    } catch (e) {
      console.error('[Bookmarks] Lỗi nạp dữ liệu:', e);
      bookmarks = [...DEFAULT_BOOKMARKS];
    }
  } else {
    bookmarks = [...DEFAULT_BOOKMARKS];
    saveBookmarks();
  }
}

function saveBookmarks() {
  localStorage.setItem('rellia_bookmarks', JSON.stringify(bookmarks));
}

// ── RENDER CHÍNH ─────────────────────────────────────────────────────
export function renderBookmarks(containerId = 'bookmarksContent') {
  const container = document.getElementById(containerId);
  if (!container) return;

  loadBookmarks();

  container.innerHTML = `
    <div class="bookmarks-wrapper">
      
      <!-- Bố cục 2 cột: Danh mục bên trái, Danh sách link bên phải -->
      <div class="bookmarks-layout-grid">
        
        <!-- Cột trái: Thư mục / Danh mục -->
        <div class="bookmarks-sidebar">
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; display:flex; justify-content:space-between; align-items:center;">
            <span>Thư Mục</span>
            <button id="bm-btn-add-cat" style="background:transparent; border:none; color:#a78bfa; cursor:pointer;" title="Thêm danh mục"><i class="fas fa-folder-plus"></i></button>
          </div>
          <div class="category-list" id="bm-category-ul"></div>

          <!-- Khu vực Import/Export file bookmark -->
          <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:16px; margin-top:8px; display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Đồng bộ trình duyệt</div>
            
            <button class="btn-secondary" id="bm-btn-import" style="font-size:11.5px; padding:6px 12px; display:flex; align-items:center; justify-content:center; gap:6px; background:rgba(255,255,255,0.02);">
              <i class="fas fa-file-import"></i> Nhập tệp Bookmarks
            </button>
            <input type="file" id="bm-import-file-input" style="display:none;" />
            
            <div style="font-size:10px; color:var(--text-muted); line-height:1.4; background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.03); padding:8px; border-radius:4px; margin-bottom:4px;">
              Chọn file <strong>Bookmarks</strong> (không đuôi) của Chrome tại:<br/>
              • <strong>Linux:</strong> <code style="font-family:monospace; font-size:9px; color:#c084fc; word-break:break-all;">~/.config/google-chrome/Default/Bookmarks</code><br/>
              • <strong>Windows:</strong> <code style="font-family:monospace; font-size:9px; color:#c084fc; word-break:break-all;">%localappdata%\\Google\\Chrome\\User Data\\Default\\Bookmarks</code><br/>
              • Hoặc chọn file <strong>.html</strong> xuất từ trình duyệt.
            </div>
            
            <button class="btn-secondary" id="bm-btn-export" style="font-size:11.5px; padding:6px 12px; display:flex; align-items:center; justify-content:center; gap:6px; background:rgba(255,255,255,0.02);">
              <i class="fas fa-file-export"></i> Xuất file HTML
            </button>
          </div>
        </div>

        <!-- Cột phải: Khung tìm kiếm, Nút thêm & Grid Cards -->
        <div class="bookmarks-main-panel">
          
          <div class="bookmarks-controls">
            <div class="bookmarks-search-bar">
              <i class="fas fa-search"></i>
              <input type="text" id="bm-search-input" placeholder="Tìm kiếm theo tiêu đề hoặc liên kết..." value="${searchQuery}" />
            </div>
            <button class="btn-primary" id="bm-btn-add-new" style="padding:10px 20px; font-size:13px; font-weight:700; background:linear-gradient(135deg, #8b5cf6, #3b82f6); border:none; display:flex; align-items:center; gap:6px;">
              <i class="fas fa-plus"></i> Thêm Liên Kết
            </button>
          </div>

          <!-- Kệ truy cập nhanh (Trang hay dùng nhất) -->
          <div id="bm-most-visited-section" style="display:none;">
            <div style="font-size:12px; font-weight:700; color:#ffd700; text-transform:uppercase; margin-bottom:10px; letter-spacing:0.05em;"><i class="fas fa-fire"></i> Ghé thăm nhiều nhất</div>
            <div class="bookmarks-grid" id="bm-most-visited-grid" style="margin-bottom:14px;"></div>
          </div>

          <!-- Danh sách chính -->
          <div>
            <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px; letter-spacing:0.05em;" id="bm-main-grid-title">Tất cả liên kết</div>
            <div class="bookmarks-grid" id="bm-links-grid"></div>
          </div>

        </div>

      </div>

    </div>

    <!-- ════════ MODAL: THÊM / SỬA LINK ════════ -->
    <div class="bookmark-modal-overlay" id="bm-modal-overlay">
      <div class="bookmark-modal">
        <h3 style="font-size:16px; font-weight:700; color:#ffd700; margin-bottom:16px;" id="bm-modal-title">Thêm Liên Kết Mới</h3>
        
        <div class="cv-form-group">
          <label class="cv-form-label">Tên liên kết (Tiêu đề)</label>
          <input type="text" class="cv-input-text" id="bm-modal-input-title" placeholder="Ví dụ: Google" />
        </div>

        <div class="cv-form-group">
          <label class="cv-form-label">Địa chỉ URL</label>
          <input type="text" class="cv-input-text" id="bm-modal-input-url" placeholder="https://google.com" />
        </div>

        <div class="cv-form-group">
          <label class="cv-form-label">Danh mục / Thư mục</label>
          <div style="display:flex; gap:10px;">
            <select class="cv-select" id="bm-modal-select-category" style="flex:1;"></select>
            <input type="text" class="cv-input-text" id="bm-modal-input-new-cat" placeholder="Thư mục mới..." style="flex:1; display:none;" />
            <button class="btn-secondary" id="bm-btn-toggle-new-cat" style="padding:0 12px;" title="Tự gõ thư mục mới"><i class="fas fa-plus"></i></button>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:24px; border-top:1px solid rgba(255,255,255,0.06); padding-top:16px;">
          <button class="btn-secondary" id="bm-modal-btn-cancel" style="padding:8px 16px;">Hủy bỏ</button>
          <button class="btn-primary" id="bm-modal-btn-save" style="padding:8px 20px; background:linear-gradient(135deg, #8b5cf6, #3b82f6); border:none;">Lưu lại</button>
        </div>
      </div>
    </div>
  `;

  // Gắn sự kiện điều khiển
  document.getElementById('bm-btn-add-new').onclick = () => openModal(null);
  document.getElementById('bm-modal-btn-cancel').onclick = closeModal;
  document.getElementById('bm-modal-btn-save').onclick = saveModalData;

  // Lắng nghe tìm kiếm
  const searchInput = document.getElementById('bm-search-input');
  searchInput.oninput = (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderGrids();
  };

  // Nút Thêm thư mục nhanh ở sidebar
  document.getElementById('bm-btn-add-cat').onclick = () => {
    const cat = prompt('Nhập tên thư mục mới muốn tạo:');
    if (cat && cat.trim()) {
      selectedCategory = cat.trim();
      renderSidebar();
      renderGrids();
    }
  };

  // Nút bấm Toggle tạo danh mục mới trong Modal
  const btnToggleNewCat = document.getElementById('bm-btn-toggle-new-cat');
  btnToggleNewCat.onclick = () => {
    const select = document.getElementById('bm-modal-select-category');
    const inputNew = document.getElementById('bm-modal-input-new-cat');
    if (inputNew.style.display === 'none') {
      inputNew.style.display = 'block';
      select.style.display = 'none';
      btnToggleNewCat.innerHTML = '<i class="fas fa-list"></i>';
      inputNew.focus();
    } else {
      inputNew.style.display = 'none';
      select.style.display = 'block';
      btnToggleNewCat.innerHTML = '<i class="fas fa-plus"></i>';
    }
  };

  // Thiết lập Import/Export
  setupImportExport();

  // Render danh sách thư mục & links
  renderSidebar();
  renderGrids();
}

// ── DỰNG SIDEBAR THƯ MỤC ──────────────────────────────────────────────
function renderSidebar() {
  const ul = document.getElementById('bm-category-ul');
  if (!ul) return;

  // Tính số lượng bookmark trong mỗi category
  const counts = {};
  bookmarks.forEach(b => {
    counts[b.category] = (counts[b.category] || 0) + 1;
  });

  const categories = ['Tất cả', ...Object.keys(counts).sort((a, b) => a.localeCompare(b))];

  ul.innerHTML = categories.map(cat => {
    const total = cat === 'Tất cả' ? bookmarks.length : (counts[cat] || 0);
    return `
      <div class="category-item ${cat === selectedCategory ? 'active' : ''}" data-cat="${cat}">
        <span><i class="far ${cat === 'Tất cả' ? 'fa-bookmark' : 'fa-folder'}"></i> ${cat}</span>
        <span class="category-count">${total}</span>
      </div>
    `;
  }).join('');

  // Lắp click chọn danh mục
  ul.querySelectorAll('.category-item').forEach(item => {
    item.onclick = () => {
      selectedCategory = item.dataset.cat;
      renderSidebar();
      renderGrids();
    };
  });
}

// ── DỰNG DỰNG GRID BOOKMARK ──────────────────────────────────────────
function renderGrids() {
  const mainGrid = document.getElementById('bm-links-grid');
  const mainGridTitle = document.getElementById('bm-main-grid-title');
  const mostVisitedSection = document.getElementById('bm-most-visited-section');
  const mostVisitedGrid = document.getElementById('bm-most-visited-grid');

  if (!mainGrid) return;

  // 1. Lọc dữ liệu theo Danh mục & Từ khóa tìm kiếm
  let filtered = bookmarks;
  if (selectedCategory !== 'Tất cả') {
    filtered = bookmarks.filter(b => b.category === selectedCategory);
  }
  if (searchQuery) {
    filtered = filtered.filter(b => 
      b.title.toLowerCase().includes(searchQuery) || 
      b.url.toLowerCase().includes(searchQuery)
    );
  }

  mainGridTitle.textContent = selectedCategory === 'Tất cả' ? 'Tất cả liên kết' : `Liên kết trong thư mục "${selectedCategory}"`;

  // Render lưới liên kết chính
  if (filtered.length === 0) {
    mainGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted); font-size:13.5px;">Chưa có liên kết nào. Hãy nhấn nút "Thêm Liên Kết" ở trên.</div>`;
  } else {
    mainGrid.innerHTML = filtered.map(b => renderBookmarkCard(b)).join('');
  }

  // 2. Lọc các trang Yêu thích nhất (clicks > 0)
  const sortedByClicks = [...bookmarks]
    .filter(b => b.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 4);

  if (sortedByClicks.length > 0 && selectedCategory === 'Tất cả' && !searchQuery) {
    mostVisitedSection.style.display = 'block';
    mostVisitedGrid.innerHTML = sortedByClicks.map(b => renderBookmarkCard(b)).join('');
  } else {
    mostVisitedSection.style.display = 'none';
  }

  // Khởi chạy các sự kiện bấm nút trên các Card mới render
  bindCardEvents();
}

function renderBookmarkCard(b) {
  // Lấy favicon sạch qua Google Service
  const domain = new URL(b.url).hostname;
  const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

  return `
    <div class="bookmark-card" data-id="${b.id}">
      <div class="bookmark-card-top">
        <div class="bookmark-favicon">
          <img src="${faviconUrl}" onerror="this.src=''" style="width:100%; height:100%; border-radius:4px; object-fit:contain;" alt="" />
        </div>
        <div class="bookmark-info">
          <a href="${b.url}" target="_blank" class="bookmark-title bm-click-link" data-id="${b.id}" title="${b.title}">${b.title}</a>
          <span class="bookmark-url">${domain}</span>
        </div>
      </div>
      <div class="bookmark-card-bottom">
        <span class="bookmark-clicks"><i class="far fa-eye" style="margin-right:4px;"></i>${b.clicks} lần ghé</span>
        <div class="bookmark-actions">
          <button class="bookmark-action-btn edit" data-id="${b.id}" title="Sửa"><i class="fas fa-edit"></i></button>
          <button class="bookmark-action-btn delete" data-id="${b.id}" title="Xóa"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
    </div>
  `;
}

// ── BẮT CÁC SỰ KIỆN TƯƠNG TÁC CARD ──────────────────────────────────
function bindCardEvents() {
  // Bấm vào tiêu đề liên kết => Cộng dồn lượt click
  document.querySelectorAll('.bm-click-link').forEach(link => {
    link.onclick = (e) => {
      const id = link.dataset.id;
      const b = bookmarks.find(x => x.id === id);
      if (b) {
        b.clicks = (b.clicks || 0) + 1;
        saveBookmarks();
        // Cập nhật ngầm mà không làm phiền trải nghiệm mở tab của người dùng
        setTimeout(() => {
          renderGrids();
        }, 1000);
      }
    };
  });

  // Nút Sửa
  document.querySelectorAll('.bookmark-action-btn.edit').forEach(btn => {
    btn.onclick = () => {
      openModal(btn.dataset.id);
    };
  });

  // Nút Xóa
  document.querySelectorAll('.bookmark-action-btn.delete').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const b = bookmarks.find(x => x.id === id);
      if (b && confirm(`Bạn có chắc chắn muốn xóa liên kết "${b.title}"?`)) {
        bookmarks = bookmarks.filter(x => x.id !== id);
        saveBookmarks();
        renderSidebar();
        renderGrids();
      }
    };
  });
}

// ── QUẢN LÝ MODAL ────────────────────────────────────────────────────
function openModal(id = null) {
  currentEditId = id;
  const overlay = document.getElementById('bm-modal-overlay');
  const titleEl = document.getElementById('bm-modal-title');
  const inputTitle = document.getElementById('bm-modal-input-title');
  const inputUrl = document.getElementById('bm-modal-input-url');
  const selectCat = document.getElementById('bm-modal-select-category');
  const inputNewCat = document.getElementById('bm-modal-input-new-cat');
  const btnToggleNewCat = document.getElementById('bm-btn-toggle-new-cat');

  if (!overlay) return;

  // Lấy các danh mục hiện tại để hiển thị lựa chọn
  const categories = [...new Set(bookmarks.map(b => b.category))];
  selectCat.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');

  // Reset inputs
  inputNewCat.style.display = 'none';
  selectCat.style.display = 'block';
  btnToggleNewCat.innerHTML = '<i class="fas fa-plus"></i>';
  inputNewCat.value = '';

  if (id) {
    // Chế độ chỉnh sửa
    const b = bookmarks.find(x => x.id === id);
    if (b) {
      titleEl.textContent = 'Chỉnh Sửa Liên Kết';
      inputTitle.value = b.title;
      inputUrl.value = b.url;
      selectCat.value = b.category;
    }
  } else {
    // Chế độ thêm mới
    titleEl.textContent = 'Thêm Liên Kết Mới';
    inputTitle.value = '';
    inputUrl.value = '';
    if (selectedCategory !== 'Tất cả') {
      selectCat.value = selectedCategory;
    }
  }

  overlay.classList.add('open');
}

function closeModal() {
  const overlay = document.getElementById('bm-modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

function saveModalData() {
  const inputTitle = document.getElementById('bm-modal-input-title');
  const inputUrl = document.getElementById('bm-modal-input-url');
  const selectCat = document.getElementById('bm-modal-select-category');
  const inputNewCat = document.getElementById('bm-modal-input-new-cat');

  let title = inputTitle.value.trim();
  let url = inputUrl.value.trim();
  let category = 'Khác';

  if (inputNewCat.style.display === 'block') {
    category = inputNewCat.value.trim() || 'Khác';
  } else {
    category = selectCat.value || 'Khác';
  }

  if (!url) {
    alert('URL không được để trống!');
    return;
  }

  // Tự bổ sung giao thức http nếu thiếu
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  if (!title) {
    try {
      title = new URL(url).hostname;
    } catch (e) {
      title = url;
    }
  }

  if (currentEditId) {
    // Update
    const b = bookmarks.find(x => x.id === currentEditId);
    if (b) {
      b.title = title;
      b.url = url;
      b.category = category;
    }
  } else {
    // Add new
    bookmarks.push({
      id: 'bm_' + Math.random().toString(36).substr(2, 9),
      title: title,
      url: url,
      category: category,
      clicks: 0,
      addedAt: new Date().toISOString()
    });
  }

  saveBookmarks();
  closeModal();
  renderSidebar();
  renderGrids();
}

// ── IMPORT / EXPORT DỮ LIỆU BOOKMARK HTML ─────────────────────────────
function setupImportExport() {
  const btnImport = document.getElementById('bm-btn-import');
  const fileInput = document.getElementById('bm-import-file-input');
  const btnExport = document.getElementById('bm-btn-export');

  if (!btnImport || !fileInput || !btnExport) return;

  btnImport.onclick = () => fileInput.click();

  fileInput.onchange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        let imported = [];

        // Kiểm tra xem có phải file JSON của Chrome hay không
        if (text.trim().startsWith('{')) {
          try {
            const jsonObj = JSON.parse(text);
            imported = parseChromeJSONBookmarks(jsonObj);
          } catch (err) {
            console.error('Lỗi phân tích file Chrome JSON Bookmarks:', err);
            alert('Tệp tin JSON không hợp lệ.');
            return;
          }
        } else {
          imported = parseHTMLBookmarks(text);
        }
        
        if (imported.length === 0) {
          alert('Không tìm thấy liên kết nào hợp lệ hoặc cấu trúc file không được hỗ trợ.');
          return;
        }

        if (confirm(`Tìm thấy ${imported.length} liên kết từ file. Bạn có muốn nhập thêm vào Dashboard không?`)) {
          bookmarks.push(...imported);
          saveBookmarks();
          renderSidebar();
          renderGrids();
        }
      };
      reader.readAsText(file);
    }
  };

  btnExport.onclick = exportHTMLBookmarks;
}

// Phân tích file HTML xuất từ trình duyệt (Netscape HTML format)
function parseHTMLBookmarks(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const links = doc.querySelectorAll('a');
  const parsed = [];

  links.forEach(a => {
    const url = a.getAttribute('href');
    const title = a.textContent.trim();
    
    // Thu thập thư mục cha bằng cách duyệt ngược DOM tìm tiêu đề H3
    let category = 'Imported';
    let parent = a.parentElement;
    while (parent) {
      const h3 = parent.querySelector('h3');
      if (h3) {
        category = h3.textContent.trim();
        break;
      }
      parent = parent.parentElement;
    }

    if (url && /^https?:\/\//i.test(url)) {
      parsed.push({
        id: 'bm_' + Math.random().toString(36).substr(2, 9),
        title: title || url,
        url: url,
        category: category,
        clicks: 0,
        addedAt: new Date().toISOString()
      });
    }
  });

  return parsed;
}

// Phân tích tệp cấu hình JSON Bookmarks gốc của Chrome
function parseChromeJSONBookmarks(jsonObj) {
  const parsed = [];

  function traverse(node, currentFolder = 'Chrome Bookmarks') {
    if (!node) return;

    if (node.type === 'url') {
      parsed.push({
        id: 'bm_' + Math.random().toString(36).substr(2, 9),
        title: node.name || node.url,
        url: node.url,
        category: currentFolder,
        clicks: 0,
        addedAt: new Date().toISOString()
      });
    } else if (node.type === 'folder' || node.children) {
      const folderName = node.name || currentFolder;
      if (Array.isArray(node.children)) {
        node.children.forEach(child => traverse(child, folderName));
      }
    }
  }

  if (jsonObj && jsonObj.roots) {
    Object.keys(jsonObj.roots).forEach(key => {
      const rootNode = jsonObj.roots[key];
      if (rootNode) {
        if (Array.isArray(rootNode.children)) {
          rootNode.children.forEach(child => traverse(child, key === 'bookmark_bar' ? 'Thanh dấu trang' : 'Khác'));
        } else if (rootNode.type === 'folder') {
          traverse(rootNode, key === 'bookmark_bar' ? 'Thanh dấu trang' : 'Khác');
        }
      }
    });
  }

  return parsed;
}

// Sinh tệp tin Netscape HTML Bookmarks tiêu chuẩn để tải về
function exportHTMLBookmarks() {
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and written by browser bookmark managers. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  // Phân nhóm theo thư mục
  const groups = {};
  bookmarks.forEach(b => {
    if (!groups[b.category]) groups[b.category] = [];
    groups[b.category].push(b);
  });

  Object.keys(groups).forEach(cat => {
    html += `    <DT><H3>${cat}</H3>\n    <DL><p>\n`;
    groups[cat].forEach(b => {
      html += `        <DT><A HREF="${b.url}">${b.title}</A>\n`;
    });
    html += `    </DL><p>\n`;
  });

  html += `</DL><p>\n`;

  // Tạo blob tải xuống
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rellia_Bookmarks_${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
