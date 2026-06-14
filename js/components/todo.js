/* ── Todo & Notes Component with Supabase Sync ── */

let tasks = [];
let supabaseClient = null;

// Local storage keys
const LOCAL_TASKS_KEY = 'rellia_todo_tasks';
const SUPABASE_CONFIG_KEY = 'rellia_supabase_config';

export function renderTodo() {
  const container = document.getElementById('todoContent');
  if (!container) return;

  // Load config and tasks
  loadLocalConfig();
  loadTasks();

  container.innerHTML = `
    <div class="todo-wrap">
      <!-- Supabase Sync Panel -->
      <div class="todo-sync-panel">
        <div class="todo-sync-header" id="syncHeader">
          <div class="todo-sync-title">
            ☁️ Đồng bộ đám mây (Supabase)
            <span id="syncIndicator" class="status-dot dot-yellow"></span>
            <span id="syncText" style="font-size: 11px; color: var(--text-muted);">Ngoại tuyến (Chỉ lưu trình duyệt)</span>
          </div>
          <button class="todo-sync-toggle" id="btnToggleSyncConfig">Cấu hình ▾</button>
        </div>
        <div class="todo-sync-body" id="syncConfigBody">
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
            Nhập thông tin dự án Supabase của bạn để đồng bộ danh sách Todo giữa nhiều thiết bị.
            Bảng của bạn nên tên là <code>todos</code> với các cột: <code>id</code> (text, primary key), <code>title</code> (text), <code>description</code> (text), <code>category</code> (text), <code>status</code> (text), <code>due_date</code> (text).
          </div>
          <div class="todo-sync-fields">
            <div class="travel-select-wrap">
              <label>SUPABASE URL</label>
              <input type="text" id="sbUrl" class="field-input" placeholder="https://xxx.supabase.co" />
            </div>
            <div class="travel-select-wrap">
              <label>SUPABASE ANON KEY</label>
              <input type="password" id="sbKey" class="field-input" placeholder="eyJhbG..." />
            </div>
          </div>
          <div class="todo-form-actions" style="margin-top: 8px; gap: 10px;">
            <button id="btnDisconnectSb" class="btn-primary" style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #f87171;">Ngắt kết nối</button>
            <button id="btnConnectSb" class="btn-primary">Kết nối &amp; Đồng bộ</button>
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
  document.getElementById('btnToggleSyncConfig').addEventListener('click', toggleSyncBody);
  document.getElementById('syncHeader').addEventListener('click', (e) => {
    if (e.target.id !== 'btnToggleSyncConfig') toggleSyncBody();
  });
  document.getElementById('btnConnectSb').addEventListener('click', connectSupabase);
  document.getElementById('btnDisconnectSb').addEventListener('click', disconnectSupabase);
  document.getElementById('btnAddTodo').addEventListener('click', addNewTodo);

  // Load inputs if config exists
  const config = getLocalConfig();
  if (config) {
    document.getElementById('sbUrl').value = config.url || '';
    document.getElementById('sbKey').value = config.key || '';
    // Auto connect if configured
    if (config.url && config.key) {
      initSupabase(config.url, config.key);
    }
  }

  // Initial draw
  renderTasks();
}

function toggleSyncBody() {
  const body = document.getElementById('syncConfigBody');
  const btn = document.getElementById('btnToggleSyncConfig');
  if (body.classList.contains('open')) {
    body.classList.remove('open');
    btn.textContent = 'Cấu hình ▾';
  } else {
    body.classList.add('open');
    btn.textContent = 'Đóng ▴';
  }
}

function loadLocalConfig() {
  try {
    return JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY));
  } catch (e) {
    return null;
  }
}

function getLocalConfig() {
  return loadLocalConfig();
}

function saveLocalConfig(url, key) {
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({ url, key }));
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

// Supabase Logic
async function initSupabase(url, key) {
  const indicator = document.getElementById('syncIndicator');
  const syncText = document.getElementById('syncText');

  if (!window.supabase) {
    indicator.className = 'status-dot dot-yellow';
    syncText.textContent = 'Đang tải thư viện đồng bộ...';
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  try {
    supabaseClient = window.supabase.createClient(url, key);
    indicator.className = 'status-dot dot-green';
    syncText.textContent = 'Đã kết nối Supabase đám mây';
    
    // Sync down tasks
    await syncFromSupabase();
  } catch (err) {
    console.error('[Supabase Init]', err);
    indicator.className = 'status-dot dot-red';
    syncText.textContent = 'Lỗi kết nối Supabase!';
  }
}

async function connectSupabase() {
  const url = document.getElementById('sbUrl').value.trim();
  const key = document.getElementById('sbKey').value.trim();

  if (!url || !key) {
    alert('Vui lòng nhập đầy đủ Supabase URL và Anon Key!');
    return;
  }

  saveLocalConfig(url, key);
  await initSupabase(url, key);
  toggleSyncBody();
}

function disconnectSupabase() {
  localStorage.removeItem(SUPABASE_CONFIG_KEY);
  supabaseClient = null;
  document.getElementById('sbUrl').value = '';
  document.getElementById('sbKey').value = '';
  
  const indicator = document.getElementById('syncIndicator');
  const syncText = document.getElementById('syncText');
  indicator.className = 'status-dot dot-yellow';
  syncText.textContent = 'Ngoại tuyến (Chỉ lưu trình duyệt)';
  
  alert('Đã ngắt kết nối Supabase. Dữ liệu tiếp tục lưu tại trình duyệt.');
}

async function syncFromSupabase() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data) {
      // Map supabase schema to local tasks
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
    }
  } catch (err) {
    console.warn('[Supabase Sync Down Failed, using local]', err);
  }
}

async function uploadTaskToSupabase(task) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient
      .from('todos')
      .upsert({
        id: task.id,
        title: task.title,
        description: task.desc,
        category: task.category,
        status: task.status,
        due_date: task.dueDate || null,
        created_at: task.createdAt
      });
    if (error) throw error;
  } catch (err) {
    console.warn('[Supabase Upload Task Failed]', err);
  }
}

async function deleteTaskFromSupabase(taskId) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient
      .from('todos')
      .delete()
      .eq('id', taskId);
    if (error) throw error;
  } catch (err) {
    console.warn('[Supabase Delete Task Failed]', err);
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
  uploadTaskToSupabase(newTask);
}

// Global functions for card action click handlers
window.moveTodoTask = function(id, newStatus) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.status = newStatus;
    saveTasksLocally();
    renderTasks();
    uploadTaskToSupabase(task);
  }
};

window.deleteTodoTask = function(id) {
  if (confirm('Bạn có chắc chắn muốn xoá công việc này?')) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasksLocally();
    renderTasks();
    deleteTaskFromSupabase(id);
  }
};
