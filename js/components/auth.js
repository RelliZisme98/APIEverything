/**
 * components/auth.js
 * Handles authentication client logic, modals, API calls to proxy endpoints,
 * and updates the sidebar account state.
 */

let authMode = 'login'; // 'login' | 'register'

// Inject blocking overlay & blur CSS
const authStyle = document.createElement('style');
authStyle.textContent = `
  body.auth-required .app-shell {
    filter: blur(15px);
    pointer-events: none;
    user-select: none;
    opacity: 0.5;
    transition: filter 0.4s ease, opacity 0.4s ease;
  }
  body.auth-required #tickerWrap {
    display: none;
  }
  /* Prevent closing the auth modal when RLS/auth is required */
  body.auth-required #authModal {
    pointer-events: auto !important;
  }
`;
document.head.appendChild(authStyle);

export function isLoggedIn() {
  return !!localStorage.getItem('rellia_auth_token');
}

export function getAuthToken() {
  return localStorage.getItem('rellia_auth_token');
}

export function getAuthUser() {
  try {
    const raw = localStorage.getItem('rellia_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ── Auth Fetch Helper ──
window.authFetch = async function(url, options = {}) {
  const token = getAuthToken();
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return fetch(url, options);
};

export function initAuth() {
  renderSidebarAuth();

  // Expose methods globally for HTML bindings
  window.openAuthModal = openAuthModal;
  window.switchAuthTab = switchAuthTab;
  window.handleAuthSubmit = handleAuthSubmit;
  window.handleLogout = handleLogout;

  // Enforce authentication check immediately on page load
  checkRequiredAuth();
}

function checkRequiredAuth() {
  const closeBtn = document.getElementById('authModalCloseBtn');
  const modal = document.getElementById('authModal');
  
  if (isLoggedIn()) {
    document.body.classList.remove('auth-required');
    if (closeBtn) closeBtn.style.display = 'block';
  } else {
    document.body.classList.add('auth-required');
    if (closeBtn) closeBtn.style.display = 'none';
    
    // Automatically trigger login modal opening
    if (modal && !modal.classList.contains('open')) {
      openAuthModal();
    }
  }
}

function renderSidebarAuth() {
  const container = document.getElementById('sidebarAuthSection');
  if (!container) return;

  const user = getAuthUser();
  if (isLoggedIn() && user) {
    container.innerHTML = `
      <div style="padding: 10px; background: rgba(96, 165, 250, 0.08); border: 1px solid rgba(96, 165, 250, 0.15); border-radius: 10px; text-align: center;">
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(user.email)}">
          📧 ${escapeHTML(user.email)}
        </div>
        <button onclick="window.handleLogout()" class="sidebar-refresh-btn" style="padding: 5px 10px; font-size: 11px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: #f87171; height: auto; margin: 0; min-height: 0; width: 100%;">
          🔓 Đăng xuất
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <button onclick="window.openAuthModal()" class="sidebar-nav-item" style="border: 1px solid rgba(255, 255, 255, 0.07); background: rgba(255,255,255,0.03); text-align: center; justify-content: center;">
        🔑 Đăng nhập / Đăng ký
      </button>
    `;
  }
}

function openAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  authMode = 'login';
  switchAuthTab('login');
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  document.getElementById('authErrorMsg').style.display = 'none';
  modal.classList.add('open');
}

function switchAuthTab(mode) {
  authMode = mode;
  const loginBtn = document.getElementById('authTabLogin');
  const regBtn = document.getElementById('authTabRegister');
  const title = document.getElementById('authModalTitle');
  const submitBtn = document.getElementById('authSubmitBtn');
  const errorMsg = document.getElementById('authErrorMsg');

  if (!loginBtn || !regBtn || !title || !submitBtn) return;

  errorMsg.style.display = 'none';

  if (mode === 'login') {
    loginBtn.classList.add('active');
    loginBtn.style.color = 'var(--text-primary)';
    loginBtn.style.fontWeight = '700';
    loginBtn.style.background = 'rgba(255,255,255,0.05)';

    regBtn.classList.remove('active');
    regBtn.style.color = 'var(--text-muted)';
    regBtn.style.fontWeight = '500';
    regBtn.style.background = 'none';

    title.textContent = '🔑 Đăng Nhập Tài Khoản';
    submitBtn.textContent = 'Đăng Nhập';
  } else {
    regBtn.classList.add('active');
    regBtn.style.color = 'var(--text-primary)';
    regBtn.style.fontWeight = '700';
    regBtn.style.background = 'rgba(255,255,255,0.05)';

    loginBtn.classList.remove('active');
    loginBtn.style.color = 'var(--text-muted)';
    loginBtn.style.fontWeight = '500';
    loginBtn.style.background = 'none';

    title.textContent = '📝 Đăng Ký Tài Khoản';
    submitBtn.textContent = 'Đăng Ký Ngay';
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail')?.value?.trim();
  const password = document.getElementById('authPassword')?.value;
  const errorMsg = document.getElementById('authErrorMsg');
  const submitBtn = document.getElementById('authSubmitBtn');

  if (!email || !password) return;

  errorMsg.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = authMode === 'login' ? 'Đang đăng nhập...' : 'Đang đăng ký...';

  const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    let data = {};
    try {
      data = await res.json();
    } catch (err) {
      console.warn('[Auth] Response is not JSON:', err);
    }

    if (!res.ok) {
      console.error('[Auth Error Response]', data);
      const errMsg = data.msg || data.message || data.error_description || data.error || `Lỗi máy chủ (Mã: ${res.status})`;
      throw new Error(errMsg);
    }

    if (authMode === 'signup') {
      alert('Đăng ký tài khoản thành công! Vui lòng chuyển qua Đăng nhập.');
      switchAuthTab('login');
    } else {
      // Login success
      if (data.access_token && data.user) {
        localStorage.setItem('rellia_auth_token', data.access_token);
        localStorage.setItem('rellia_auth_user', JSON.stringify(data.user));

        document.getElementById('authModal').classList.remove('open');
        renderSidebarAuth();

        // Remove blurs & check auth restriction
        checkRequiredAuth();

        // Refresh Todo & Calendar components with new auth context
        triggerComponentsRefresh();
      } else {
        throw new Error('Token hoặc thông tin user bị thiếu từ server');
      }
    }
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = authMode === 'login' ? 'Đăng Nhập' : 'Đăng Ký Ngay';
  }
}

function handleLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
    localStorage.removeItem('rellia_auth_token');
    localStorage.removeItem('rellia_auth_user');
    renderSidebarAuth();
    
    // Clear local storage copies of events and todos if we want strict privacy
    localStorage.removeItem('rellia_todo_tasks');
    localStorage.removeItem('rellia_custom_events');

    // Enable block blurs
    checkRequiredAuth();

    triggerComponentsRefresh();
  }
}

function triggerComponentsRefresh() {
  // Re-initialize Calendar component with the new auth context
  if (typeof window._calInit === 'function') {
    window._calInit();
  } else if (typeof window.renderCalendar === 'function') {
    window.renderCalendar();
  }

  // Re-initialize Todo component
  const todoContainer = document.getElementById('todoContent');
  if (todoContainer && typeof window._todoInit === 'function') {
    window._todoInit();
  }
}

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>'"]/g,
    tag => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[tag] || tag));
}
