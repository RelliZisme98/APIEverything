/* ── Todo & Notes Component with Server-Proxied Database Sync ── */

let tasks = [];
let hasDbConnection = false;

const LOCAL_TASKS_KEY = 'rellia_todo_tasks';

export function renderTodo() {
  const container = document.getElementById('todoContent');
  if (!container) return;

  container.innerHTML = `
    <div class="todo-wrap">
      <!-- Supabase Sync Status Panel -->
      <div class="todo-sync-panel">
        <div class="todo-sync-header" id="syncHeader" style="cursor: default;">
          <div class="todo-sync-title">
            ☁️ Đồng bộ đám mây (Bảo mật qua Server)
            <span id="syncIndicator" class="status-dot dot-yellow"></span>
            <span id="syncText" style="font-size: 11px; color: var(--text-muted);">Đang kết nối...</span>
          </div>
        </div>
      </div>

      <!-- Quick Add Task -->
      <div class="todo-quick-add">
        <div class="travel-title-sub">➕ Thêm công việc mới</div>
        <div class="todo-form-grid">
          <div class="travel-select-wrap">
            <label>Tiêu đề công việc <span class="tax-req">*</span></label>
            <input type="text" id="todoTitleInput" class="field-input" placeholder="Ví dụ: Họp báo cáo tuần, mua sữa..." />
          </div>
          <div class="travel-select-wrap">
            <label>Phân loại</label>
            <select id="todoCategorySelect" class="field-input">
              <option value="work">Công việc 💼</option>
              <option value="personal">Cá nhân 🏡</option>
              <option value="urgent">Khẩn cấp 🚨</option>
            </select>
          </div>
          <div class="travel-select-wrap">
            <label>Hạn chót (tùy chọn)</label>
            <input type="date" id="todoDueDateInput" class="field-input" />
          </div>
        </div>
        <div class="travel-select-wrap" style="margin-top: 10px;">
          <label>Mô tả ngắn (tùy chọn)</label>
          <input type="text" id="todoDescInput" class="field-input" placeholder="Chi tiết công việc..." />
        </div>
        <div class="todo-form-actions">
          <button id="btnAddTodo" class="btn-primary">Thêm công việc</button>
        </div>
      </div>

      <!-- Kanban Board -->
      <div class="todo-board">
        <!-- Column 1: TODO -->
        <div class="todo-column" id="col-todo">
          <div class="todo-col-header">
            <span class="todo-col-title">📋 Cần Làm</span>
            <span class="todo-col-count" id="count-todo">0</span>
          </div>
          <div class="todo-list-container" id="list-todo"></div>
        </div>

        <!-- Column 2: DOING -->
        <div class="todo-column" id="col-doing">
          <div class="todo-col-header">
            <span class="todo-col-title">⚡ Đang Làm</span>
            <span class="todo-col-count" id="count-doing">0</span>
          </div>
          <div class="todo-list-container" id="list-doing"></div>
        </div>

        <!-- Column 3: DONE -->
        <div class="todo-column" id="col-done">
          <div class="todo-col-header">
            <span class="todo-col-title">✅ Đã Xong</span>
            <span class="todo-col-count" id="count-done">0</span>
          </div>
          <div class="todo-list-container" id="list-done"></div>
        </div>
      </div>
    </div>
  `;

  // Bind Events
  document.getElementById('btnAddTodo').addEventListener('click', addNewTodo);

  // Load and check DB connection
  initProxyTodos();
}

async function initProxyTodos() {
  const indicator = document.getElementById('syncIndicator');
  const syncText = document.getElementById('syncText');

  try {
    const res = await fetch('/api/todos');
    if (res.ok) {
      const data = await res.json();
      hasDbConnection = true;
      if (indicator) indicator.className = 'status-dot dot-green';
      if (syncText) syncText.textContent = 'Đã kết nối cơ sở dữ liệu (Bảo mật qua Server)';

      // Load tasks from DB
      tasks = data.map(item => ({
        id: item.id,
        title: item.title,
        desc: item.description || '',
        category: item.category || 'work',
        status: item.status || 'todo',
        dueDate: item.due_date || '',
        createdAt: item.created_at
      }));
      saveTasksLocally();
      renderTasks();
    } else {
      throw new Error(`Server returned status ${res.status}`);
    }
  } catch (err) {
    console.warn('[Todo Server Connect Failed, using local cache]', err);
    hasDbConnection = false;
    if (indicator) indicator.className = 'status-dot dot-yellow';
    if (syncText) syncText.textContent = 'Ngoại tuyến (Chỉ lưu trữ trình duyệt)';

    // Fallback to local cache
    loadTasks();
    renderTasks();
  }
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  } catch (e) {
    tasks = [];
  }
}

function saveTasksLocally() {
  localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
}

async function uploadTaskToProxy(task) {
  if (!hasDbConnection) return;
  try {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: task.id,
        title: task.title,
        description: task.desc,
        category: task.category,
        status: task.status,
        due_date: task.dueDate || null,
        created_at: task.createdAt
      })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  } catch (err) {
    console.warn('[Upload Task Failed]', err);
  }
}

async function deleteTaskFromProxy(taskId) {
  if (!hasDbConnection) return;
  try {
    const res = await fetch(`/api/todos?id=${encodeURIComponent(taskId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  } catch (err) {
    console.warn('[Delete Task Failed]', err);
  }
}

// Kanban Task Management
function renderTasks() {
  const colTodo = document.getElementById('list-todo');
  const colDoing = document.getElementById('list-doing');
  const colDone = document.getElementById('list-done');

  if (!colTodo || !colDoing || !colDone) return;

  colTodo.innerHTML = '';
  colDoing.innerHTML = '';
  colDone.innerHTML = '';

  let countTodo = 0, countDoing = 0, countDone = 0;

  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = 'todo-card';
    card.id = `task-${task.id}`;

    // Tag Badge
    let tagLabel = 'Công việc';
    let tagClass = 'todo-badge--work';
    if (task.category === 'personal') {
      tagLabel = 'Cá nhân';
      tagClass = 'todo-badge--personal';
    } else if (task.category === 'urgent') {
      tagLabel = 'Khẩn cấp';
      tagClass = 'todo-badge--urgent';
    }

    // Due Date
    const dueHTML = task.dueDate 
      ? `<span class="todo-due-date">📅 ${task.dueDate}</span>`
      : '';

    // Action buttons based on current status
    let moveButtonsHTML = '';
    if (task.status === 'todo') {
      moveButtonsHTML = `<button class="todo-card-btn" onclick="window.moveTodoTask('${task.id}', 'doing')">Bắt đầu ➔</button>`;
    } else if (task.status === 'doing') {
      moveButtonsHTML = `
        <button class="todo-card-btn" onclick="window.moveTodoTask('${task.id}', 'todo')">◀ Trả lại</button>
        <button class="todo-card-btn" onclick="window.moveTodoTask('${task.id}', 'done')">Hoàn thành ➔</button>
      `;
    } else if (task.status === 'done') {
      moveButtonsHTML = `<button class="todo-card-btn" onclick="window.moveTodoTask('${task.id}', 'doing')">◀ Làm lại</button>`;
    }

    card.innerHTML = `
      <div class="todo-card-title">${task.title}</div>
      ${task.desc ? `<div class="todo-card-desc">${task.desc}</div>` : ''}
      <div class="todo-card-meta">
        <span class="todo-badge ${tagClass}">${tagLabel}</span>
        ${dueHTML}
      </div>
      <div class="todo-card-actions">
        ${moveButtonsHTML}
        <button class="todo-card-btn delete" onclick="window.deleteTodoTask('${task.id}')">Xoá</button>
      </div>
    `;

    if (task.status === 'todo') {
      colTodo.appendChild(card);
      countTodo++;
    } else if (task.status === 'doing') {
      colDoing.appendChild(card);
      countDoing++;
    } else {
      colDone.appendChild(card);
      countDone++;
    }
  });

  // Update counters
  document.getElementById('count-todo').textContent = countTodo;
  document.getElementById('count-doing').textContent = countDoing;
  document.getElementById('count-done').textContent = countDone;
}

function addNewTodo() {
  const titleInp = document.getElementById('todoTitleInput');
  const descInp = document.getElementById('todoDescInput');
  const catSel = document.getElementById('todoCategorySelect');
  const dueInp = document.getElementById('todoDueDateInput');

  const title = titleInp.value.trim();
  if (!title) {
    alert('Vui lòng nhập tiêu đề công việc!');
    return;
  }

  const newTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    title,
    desc: descInp.value.trim(),
    category: catSel.value,
    status: 'todo',
    dueDate: dueInp.value,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  saveTasksLocally();
  renderTasks();

  // Reset inputs
  titleInp.value = '';
  descInp.value = '';
  dueInp.value = '';

  // Sync upload
  uploadTaskToProxy(newTask);
}

// Global functions for card action click handlers
window.moveTodoTask = function(id, newStatus) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.status = newStatus;
    saveTasksLocally();
    renderTasks();
    uploadTaskToProxy(task);
  }
};

window.deleteTodoTask = function(id) {
  if (confirm('Bạn có chắc chắn muốn xoá công việc này?')) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasksLocally();
    renderTasks();
    deleteTaskFromProxy(id);
  }
};
