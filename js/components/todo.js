import { state } from '../store/state.js';

let tasks = [];
let hasDbConnection = false;
let activeView = 'board'; // 'board' | 'all' | 'upcoming' | 'due-soon' | 'overdue'
let todoFilter = 'all'; // category filter

const LOCAL_TASKS_KEY = 'rellia_todo_tasks';

const DEFAULT_CATEGORIES = [
  { id: 'work',     label: 'Công việc 💼' },
  { id: 'personal', label: 'Cá nhân 🏡' },
  { id: 'urgent',   label: 'Khẩn cấp 🚨' }
];

function getCustomCategories() {
  try {
    const raw = localStorage.getItem('rellia_todo_custom_categories');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveCustomCategory(id, label) {
  const list = getCustomCategories();
  if (!list.some(c => c.id === id)) {
    list.push({ id, label });
    localStorage.setItem('rellia_todo_custom_categories', JSON.stringify(list));
  }
}

function getAllCategories() {
  const custom = getCustomCategories();
  const all = [...DEFAULT_CATEGORIES];
  custom.forEach(c => { if (!all.some(a => a.id === c.id)) all.push(c); });
  tasks.forEach(t => { if (t.category && !all.some(a => a.id === t.category)) all.push({ id: t.category, label: t.category }); });
  return all;
}

function getCategoryColor(catId) {
  let hash = 0;
  for (let i = 0; i < catId.length; i++) hash = catId.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return { bg: `hsla(${h},70%,50%,0.15)`, color: `hsl(${h},85%,70%)`, border: `hsla(${h},70%,50%,0.3)` };
}

function populateCategoryDropdown(selectedId = 'work') {
  const select = document.getElementById('todoCategorySelect');
  if (!select) return;
  const all = getAllCategories();
  select.innerHTML = all.map(c => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.label)}</option>`).join('');
  select.value = selectedId;
}

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>'"]/g,
    tag => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[tag] || tag));
}

// ── Date helpers ──
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  return dueDate < todayStr();
}

function isDueSoon(dueDate, days = 7) {
  if (!dueDate) return false;
  const t = todayStr();
  const future = new Date();
  future.setDate(future.getDate() + days);
  const futureStr = future.toISOString().split('T')[0];
  return dueDate >= t && dueDate <= futureStr;
}

function isUpcoming(dueDate) {
  if (!dueDate) return false;
  return dueDate >= todayStr();
}

function formatDueDate(dueDate) {
  if (!dueDate) return '';
  const today = todayStr();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  if (dueDate === today) return '📅 Hôm nay';
  if (dueDate === tomorrowStr) return '📅 Ngày mai';
  if (isOverdue(dueDate)) return `⚠️ Quá hạn: ${dueDate}`;
  return `📅 ${dueDate}`;
}

function getDueDateColor(dueDate, status) {
  if (!dueDate || status === 'done') return '';
  if (isOverdue(dueDate)) return 'color:#f87171;';
  if (isDueSoon(dueDate, 3)) return 'color:#fb923c;';
  if (isDueSoon(dueDate, 7)) return 'color:#facc15;';
  return 'color:var(--text-muted);';
}

export function renderTodo() {
  const container = document.getElementById('todoContent');
  if (!container) return;

  container.innerHTML = `
    <div class="todo-wrap">
      <!-- Sync Status -->
      <div class="todo-sync-panel">
        <div class="todo-sync-header" id="syncHeader" style="cursor:default;">
          <div class="todo-sync-title">
            ☁️ Đồng bộ đám mây
            <span id="syncIndicator" class="status-dot dot-yellow"></span>
            <span id="syncText" style="font-size:11px;color:var(--text-muted);">Đang kết nối...</span>
          </div>
        </div>
      </div>

      <!-- View Tabs + Stats -->
      <div class="todo-view-tabs" id="todoViewTabs">
        <button class="todo-view-tab active" data-view="board">📋 Kanban</button>
        <button class="todo-view-tab" data-view="all">📝 Tất cả</button>
        <button class="todo-view-tab" data-view="upcoming">📅 Sắp tới</button>
        <button class="todo-view-tab" data-view="due-soon">⏰ Sắp đến hạn</button>
        <button class="todo-view-tab" data-view="overdue">🔴 Quá hạn</button>
      </div>

      <!-- Stats bar -->
      <div class="todo-stats-bar" id="todoStatsBar"></div>

      <!-- Add Task Form -->
      <div class="todo-quick-add">
        <div class="travel-title-sub">➕ Thêm công việc mới</div>
        <div class="todo-form-grid">
          <div class="travel-select-wrap">
            <label>Tiêu đề <span class="tax-req">*</span></label>
            <input type="text" id="todoTitleInput" class="field-input" placeholder="Ví dụ: Họp báo cáo tuần..." />
          </div>
          <div class="travel-select-wrap">
            <label>Phân loại</label>
            <div style="display:flex;gap:6px;align-items:center;">
              <select id="todoCategorySelect" class="field-input" style="flex:1;min-width:100px;"></select>
              <button id="btnAddNewCategory" class="btn-primary" style="padding:0 10px;height:38px;min-width:38px;font-size:16px;margin:0;" title="Thêm phân loại mới">+</button>
            </div>
          </div>
          <div class="travel-select-wrap">
            <label>Hạn chót</label>
            <input type="date" id="todoDueDateInput" class="field-input" />
          </div>
          <div class="travel-select-wrap">
            <label>Mức ưu tiên</label>
            <select id="todoPrioritySelect" class="field-input">
              <option value="normal">⚪ Bình thường</option>
              <option value="high">🟡 Cao</option>
              <option value="critical">🔴 Khẩn cấp</option>
            </select>
          </div>
        </div>
        <div class="travel-select-wrap" style="margin-top:10px;">
          <label>Mô tả (tùy chọn)</label>
          <input type="text" id="todoDescInput" class="field-input" placeholder="Chi tiết công việc..." />
        </div>
        <div class="todo-form-actions">
          <button id="btnAddTodo" class="btn-primary">Thêm công việc</button>
        </div>
      </div>

      <!-- Main content area -->
      <div id="todoMainContent"></div>
    </div>
  `;

  // Bind tab events
  const tabs = container.querySelectorAll('.todo-view-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeView = tab.dataset.view;
      renderTaskView();
    });
  });

  // Bind add events
  document.getElementById('btnAddTodo').addEventListener('click', addNewTodo);
  document.getElementById('btnAddNewCategory').addEventListener('click', () => {
    const newCatName = prompt('Nhập tên phân loại mới (ví dụ: Học tập 📚):');
    if (newCatName?.trim()) {
      const cleanName = newCatName.trim();
      const catId = cleanName.toLowerCase().replace(/\s+/g, '_');
      saveCustomCategory(catId, cleanName);
      populateCategoryDropdown(catId);
    }
  });

  document.getElementById('todoTitleInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addNewTodo();
  });

  populateCategoryDropdown();
  initProxyTodos();
  window._todoInit = initProxyTodos;
}

async function initProxyTodos() {
  const indicator = document.getElementById('syncIndicator');
  const syncText  = document.getElementById('syncText');

  try {
    const res = await window.authFetch('/api/todos');
    if (res.ok) {
      const data = await res.json();
      hasDbConnection = true;
      if (indicator) indicator.className = 'status-dot dot-green';
      if (syncText)  syncText.textContent = 'Đã kết nối cơ sở dữ liệu';

      tasks = data.map(item => ({
        id:        item.id,
        title:     item.title,
        desc:      item.description || '',
        category:  item.category || 'work',
        status:    item.status || 'todo',
        dueDate:   item.due_date || '',
        priority:  item.priority || 'normal',
        createdAt: item.created_at,
      }));
      saveTasksLocally();
      populateCategoryDropdown(document.getElementById('todoCategorySelect')?.value || 'work');
      renderTaskView();
    } else throw new Error(`Status ${res.status}`);
  } catch (err) {
    console.warn('[Todo] Server unavailable, using local cache:', err.message);
    hasDbConnection = false;
    if (indicator) indicator.className = 'status-dot dot-yellow';
    if (syncText)  syncText.textContent = 'Ngoại tuyến (chỉ lưu trữ trình duyệt)';
    loadTasks();
    renderTaskView();
  }
}

function syncTodoState() {
  state.todoTasks = tasks.map(t => ({
    title: t.title,
    desc: t.desc,
    category: t.category,
    status: t.status,
    dueDate: t.dueDate,
    priority: t.priority
  }));
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY);
    tasks = raw ? JSON.parse(raw) : [];
    syncTodoState();
    populateCategoryDropdown(document.getElementById('todoCategorySelect')?.value || 'work');
  } catch (e) { tasks = []; }
}

function saveTasksLocally() {
  localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  syncTodoState();
}

// ── Render main view ──────────────────────────────────────────────────
function renderTaskView() {
  renderStatsBar();

  const main = document.getElementById('todoMainContent');
  if (!main) return;

  if (activeView === 'board') {
    renderKanban(main);
  } else {
    renderListView(main);
  }
}

function renderStatsBar() {
  const bar = document.getElementById('todoStatsBar');
  if (!bar) return;

  const today = todayStr();
  const total     = tasks.length;
  const done      = tasks.filter(t => t.status === 'done').length;
  const overdueN  = tasks.filter(t => t.status !== 'done' && isOverdue(t.dueDate)).length;
  const dueSoonN  = tasks.filter(t => t.status !== 'done' && isDueSoon(t.dueDate, 7) && !isOverdue(t.dueDate)).length;
  const pct = total ? Math.round(done / total * 100) : 0;

  bar.innerHTML = `
    <div class="todo-stats-row">
      <div class="todo-stat-item">
        <span class="todo-stat-num" style="color:var(--accent-blue);">${total}</span>
        <span class="todo-stat-label">Tổng</span>
      </div>
      <div class="todo-stat-item">
        <span class="todo-stat-num" style="color:var(--accent-green);">${done}</span>
        <span class="todo-stat-label">Hoàn thành</span>
      </div>
      <div class="todo-stat-item ${overdueN > 0 ? 'todo-stat--alert' : ''}">
        <span class="todo-stat-num" style="color:${overdueN > 0 ? '#f87171' : 'var(--text-muted)'};">${overdueN}</span>
        <span class="todo-stat-label">Quá hạn</span>
      </div>
      <div class="todo-stat-item">
        <span class="todo-stat-num" style="color:${dueSoonN > 0 ? '#facc15' : 'var(--text-muted)'};">${dueSoonN}</span>
        <span class="todo-stat-label">Sắp đến hạn</span>
      </div>
      <div class="todo-stat-progress">
        <div class="todo-stat-progress-bar">
          <div class="todo-stat-progress-fill" style="width:${pct}%;"></div>
        </div>
        <span class="todo-stat-pct">${pct}% hoàn thành</span>
      </div>
    </div>
  `;
}

function getFilteredTasks() {
  const today = todayStr();
  switch (activeView) {
    case 'upcoming': return tasks.filter(t => t.status !== 'done' && isUpcoming(t.dueDate));
    case 'due-soon': return tasks.filter(t => t.status !== 'done' && isDueSoon(t.dueDate, 7));
    case 'overdue':  return tasks.filter(t => t.status !== 'done' && isOverdue(t.dueDate));
    default:         return [...tasks];
  }
}

function renderListView(el) {
  const filtered = getFilteredTasks();

  const viewTitles = {
    all:       '📝 Tất cả công việc',
    upcoming:  '📅 Công việc sắp tới (có hạn chót)',
    'due-soon':'⏰ Sắp đến hạn (7 ngày)',
    overdue:   '🔴 Công việc quá hạn',
  };

  if (!filtered.length) {
    el.innerHTML = `<div class="todo-empty-view">
      <div style="font-size:36px;margin-bottom:10px;">${activeView === 'overdue' ? '🎉' : '📭'}</div>
      <div style="font-size:15px;font-weight:700;color:var(--text-primary);">${activeView === 'overdue' ? 'Không có task quá hạn!' : 'Không có công việc nào'}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
        ${activeView === 'overdue' ? 'Tuyệt vời! Bạn đang đúng deadline.' : 'Hãy thêm công việc mới ở form phía trên.'}
      </div>
    </div>`;
    return;
  }

  // Sort: overdue first, then by dueDate
  const sorted = [...filtered].sort((a, b) => {
    if (isOverdue(a.dueDate) && !isOverdue(b.dueDate)) return -1;
    if (!isOverdue(a.dueDate) && isOverdue(b.dueDate)) return 1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  el.innerHTML = `
    <div class="todo-list-header">${viewTitles[activeView] ?? '📝 Danh sách'} <span class="todo-count-badge">${sorted.length}</span></div>
    <div class="todo-list-view">
      ${sorted.map(task => renderTaskListItem(task)).join('')}
    </div>`;
}

function renderTaskListItem(task) {
  const allCats = getAllCategories();
  const matchedCat = allCats.find(c => c.id === task.category);
  const tagLabel = matchedCat ? matchedCat.label : task.category;

  let badgeStyle = '';
  let tagClass = '';
  if (task.category === 'work')     tagClass = 'todo-badge--work';
  else if (task.category === 'personal') tagClass = 'todo-badge--personal';
  else if (task.category === 'urgent')   tagClass = 'todo-badge--urgent';
  else {
    const colors = getCategoryColor(task.category);
    badgeStyle = `style="background:${colors.bg};color:${colors.color};border:1px solid ${colors.border};"`;
  }

  const dueDateHtml = task.dueDate
    ? `<span class="todo-due-date" style="${getDueDateColor(task.dueDate, task.status)}">${formatDueDate(task.dueDate)}</span>`
    : '';

  const priorityIcon = { critical: '🔴', high: '🟡', normal: '' }[task.priority] || '';

  const statusOptions = [
    { v: 'todo',  l: '📋 Cần làm' },
    { v: 'doing', l: '⚡ Đang làm' },
    { v: 'done',  l: '✅ Xong' },
  ];

  return `
    <div class="todo-list-item ${task.status === 'done' ? 'todo-list-item--done' : ''} ${isOverdue(task.dueDate) && task.status !== 'done' ? 'todo-list-item--overdue' : ''}">
      <div class="todo-list-left">
        <input type="checkbox" class="todo-check" ${task.status === 'done' ? 'checked' : ''}
          onchange="window.toggleTodoDone('${task.id}', this.checked)" />
      </div>
      <div class="todo-list-body">
        <div class="todo-list-title">${priorityIcon} ${escapeHTML(task.title)}</div>
        ${task.desc ? `<div class="todo-list-desc">${escapeHTML(task.desc)}</div>` : ''}
        <div class="todo-list-meta">
          <span class="todo-badge ${tagClass}" ${badgeStyle}>${tagLabel}</span>
          ${dueDateHtml}
          <select class="todo-status-sel" onchange="window.moveTodoTask('${task.id}', this.value)">
            ${statusOptions.map(o => `<option value="${o.v}" ${task.status === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="todo-card-btn delete todo-list-delete" onclick="window.deleteTodoTask('${task.id}')">✕</button>
    </div>`;
}

function renderKanban(el) {
  el.innerHTML = `
    <div class="todo-board">
      <div class="todo-column" id="col-todo">
        <div class="todo-col-header">
          <span class="todo-col-title">📋 Cần Làm</span>
          <span class="todo-col-count" id="count-todo">0</span>
        </div>
        <div class="todo-list-container" id="list-todo"></div>
      </div>
      <div class="todo-column" id="col-doing">
        <div class="todo-col-header">
          <span class="todo-col-title">⚡ Đang Làm</span>
          <span class="todo-col-count" id="count-doing">0</span>
        </div>
        <div class="todo-list-container" id="list-doing"></div>
      </div>
      <div class="todo-column" id="col-done">
        <div class="todo-col-header">
          <span class="todo-col-title">✅ Đã Xong</span>
          <span class="todo-col-count" id="count-done">0</span>
        </div>
        <div class="todo-list-container" id="list-done"></div>
      </div>
    </div>`;

  renderTasks();
}

function renderTasks() {
  const colTodo  = document.getElementById('list-todo');
  const colDoing = document.getElementById('list-doing');
  const colDone  = document.getElementById('list-done');
  if (!colTodo || !colDoing || !colDone) return;

  colTodo.innerHTML = colDoing.innerHTML = colDone.innerHTML = '';
  let countTodo = 0, countDoing = 0, countDone = 0;

  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = 'todo-card';
    card.id = `task-${task.id}`;

    const allCats = getAllCategories();
    const matchedCat = allCats.find(c => c.id === task.category);
    const tagLabel = matchedCat ? matchedCat.label : task.category;

    let badgeStyle = '', tagClass = '';
    if (task.category === 'work') tagClass = 'todo-badge--work';
    else if (task.category === 'personal') tagClass = 'todo-badge--personal';
    else if (task.category === 'urgent')   tagClass = 'todo-badge--urgent';
    else {
      const colors = getCategoryColor(task.category);
      badgeStyle = `style="background:${colors.bg};color:${colors.color};border:1px solid ${colors.border};"`;
    }

    const dueHTML = task.dueDate
      ? `<span class="todo-due-date" style="${getDueDateColor(task.dueDate, task.status)}">${formatDueDate(task.dueDate)}</span>`
      : '';

    const overdueClass = isOverdue(task.dueDate) && task.status !== 'done' ? ' todo-card--overdue' : '';
    const priorityIcon = { critical: '🔴 ', high: '🟡 ', normal: '' }[task.priority] || '';
    card.className += overdueClass;

    let moveButtonsHTML = '';
    if (task.status === 'todo') {
      moveButtonsHTML = `<button class="todo-card-btn" onclick="window.moveTodoTask('${task.id}','doing')">Bắt đầu ➔</button>`;
    } else if (task.status === 'doing') {
      moveButtonsHTML = `
        <button class="todo-card-btn" onclick="window.moveTodoTask('${task.id}','todo')">◀ Trả lại</button>
        <button class="todo-card-btn" onclick="window.moveTodoTask('${task.id}','done')">Hoàn thành ➔</button>`;
    } else {
      moveButtonsHTML = `<button class="todo-card-btn" onclick="window.moveTodoTask('${task.id}','doing')">◀ Làm lại</button>`;
    }

    card.innerHTML = `
      <div class="todo-card-title">${priorityIcon}${escapeHTML(task.title)}</div>
      ${task.desc ? `<div class="todo-card-desc">${escapeHTML(task.desc)}</div>` : ''}
      <div class="todo-card-meta">
        <span class="todo-badge ${tagClass}" ${badgeStyle}>${tagLabel}</span>
        ${dueHTML}
      </div>
      <div class="todo-card-actions">
        ${moveButtonsHTML}
        <button class="todo-card-btn delete" onclick="window.deleteTodoTask('${task.id}')">Xoá</button>
      </div>`;

    if (task.status === 'todo')  { colTodo.appendChild(card);  countTodo++; }
    else if (task.status === 'doing') { colDoing.appendChild(card); countDoing++; }
    else { colDone.appendChild(card); countDone++; }
  });

  document.getElementById('count-todo')?.setAttribute('textContent', countTodo);
  document.getElementById('count-doing')?.setAttribute('textContent', countDoing);
  document.getElementById('count-done')?.setAttribute('textContent', countDone);
  if (document.getElementById('count-todo')) document.getElementById('count-todo').textContent = countTodo;
  if (document.getElementById('count-doing')) document.getElementById('count-doing').textContent = countDoing;
  if (document.getElementById('count-done')) document.getElementById('count-done').textContent = countDone;
}

function addNewTodo() {
  const titleInp    = document.getElementById('todoTitleInput');
  const descInp     = document.getElementById('todoDescInput');
  const catSel      = document.getElementById('todoCategorySelect');
  const dueInp      = document.getElementById('todoDueDateInput');
  const prioritySel = document.getElementById('todoPrioritySelect');

  const title = titleInp.value.trim();
  if (!title) { alert('Vui lòng nhập tiêu đề công việc!'); return; }

  const newTask = {
    id:        'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    title,
    desc:      descInp.value.trim(),
    category:  catSel.value,
    status:    'todo',
    dueDate:   dueInp.value,
    priority:  prioritySel?.value ?? 'normal',
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(newTask);
  saveTasksLocally();
  renderTaskView();

  titleInp.value = '';
  descInp.value  = '';
  dueInp.value   = '';

  uploadTaskToProxy(newTask);
}

// ── API sync ──────────────────────────────────────────────────────────
async function uploadTaskToProxy(task) {
  if (!hasDbConnection) return;
  try {
    await window.authFetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: task.id, title: task.title, description: task.desc,
        category: task.category, status: task.status,
        due_date: task.dueDate || null, priority: task.priority,
        created_at: task.createdAt
      })
    });
  } catch (err) { console.warn('[Upload Task Failed]', err); }
}

async function deleteTaskFromProxy(taskId) {
  if (!hasDbConnection) return;
  try {
    await window.authFetch(`/api/todos?id=${encodeURIComponent(taskId)}`, { method: 'DELETE' });
  } catch (err) { console.warn('[Delete Task Failed]', err); }
}

// ── Global handlers ──
window.moveTodoTask = function(id, newStatus) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.status = newStatus;
    saveTasksLocally();
    renderTaskView();
    uploadTaskToProxy(task);
  }
};

window.deleteTodoTask = function(id) {
  if (confirm('Bạn có chắc chắn muốn xoá công việc này?')) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasksLocally();
    renderTaskView();
    deleteTaskFromProxy(id);
  }
};

window.toggleTodoDone = function(id, checked) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.status = checked ? 'done' : 'todo';
    saveTasksLocally();
    renderTaskView();
    uploadTaskToProxy(task);
  }
};

// ── Calendar integration: get tasks for a specific date ──
export function getTodosByDate(dateStr) {
  return tasks.filter(t => t.dueDate === dateStr);
}

// Expose for calendar component
window._getTodosByDate = getTodosByDate;
