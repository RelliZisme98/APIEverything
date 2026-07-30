/* ── Job Search Component ── */
/* Tra cứu thông tin tuyển dụng từ nhiều nguồn */

const JOB_SOURCES = {
  all:          { name: 'Tất cả', icon: 'fas fa-globe' },
  topcv:        { name: 'TopCV', icon: 'fas fa-briefcase', domain: 'topcv.vn' },
  vietnamworks: { name: 'VietnamWorks', icon: 'fas fa-building', domain: 'vietnamworks.com' },
  careerviet:   { name: 'CareerViet', icon: 'fas fa-user-tie', domain: 'careerviet.vn' },
  itviec:       { name: 'ITviec', icon: 'fas fa-code', domain: 'itviec.com' },
  vieclam24h:   { name: 'ViecLam24h', icon: 'fas fa-clock', domain: 'vieclam24h.vn' },
  jobsgo:       { name: 'JobsGo', icon: 'fas fa-rocket', domain: 'jobsgo.vn' },
  topdev:       { name: 'TopDev', icon: 'fas fa-laptop-code', domain: 'topdev.vn' },
  careerlink:   { name: 'CareerLink', icon: 'fas fa-link', domain: 'careerlink.vn' },
};

const POPULAR_SEARCHES = [
  'Frontend Developer', 'Backend Developer', 'Kế toán', 'Marketing',
  'Data Analyst', 'DevOps', 'Nhân sự', 'Thiết kế đồ họa',
  'Sales', 'Content Writer', 'Project Manager', 'QA/QC',
];

const LOCATIONS = [
  { value: '', label: 'Tất cả địa điểm' },
  { value: 'ho-chi-minh', label: 'TP. Hồ Chí Minh' },
  { value: 'ha-noi', label: 'Hà Nội' },
  { value: 'da-nang', label: 'Đà Nẵng' },
  { value: 'hai-phong', label: 'Hải Phòng' },
  { value: 'can-tho', label: 'Cần Thơ' },
  { value: 'binh-duong', label: 'Bình Dương' },
  { value: 'dong-nai', label: 'Đồng Nai' },
  { value: 'remote', label: 'Remote' },
];

const SALARY_FILTERS = [
  { value: '', label: 'Mức lương' },
  { value: 'thoa-thuan', label: 'Thỏa thuận' },
  { value: 'duoi-10', label: 'Dưới 10 triệu' },
  { value: '10-15', label: '10 - 15 triệu' },
  { value: '15-20', label: '15 - 20 triệu' },
  { value: '20-30', label: '20 - 30 triệu' },
  { value: '30-50', label: '30 - 50 triệu' },
  { value: 'tren-50', label: 'Trên 50 triệu' },
];

let _jobState = {
  keyword: '',
  location: '',
  source: 'all',
  salary: '',
  results: [],
  allResults: [],
  loading: false,
  page: 1,
  perPage: 12,
  totalResults: 0,
  searched: false,
};

function _jel(id) { return document.getElementById(id); }

/* ═══════════════════════════════════════════
   RENDER ENTRY
   ═══════════════════════════════════════════ */
export function renderJobSearch() {
  const root = _jel('jobSearchContent');
  if (!root) return;
  _renderJobView(root);
}

function _renderJobView(root) {
  const { results, loading, searched, page, perPage, totalResults, source, allResults } = _jobState;

  // Count results per source for tabs
  const sourceCounts = {};
  for (const key of Object.keys(JOB_SOURCES)) {
    if (key === 'all') {
      sourceCounts.all = allResults.length;
    } else {
      sourceCounts[key] = allResults.filter(j => j.source === key).length;
    }
  }

  const start = (page - 1) * perPage;
  const paginatedResults = results.slice(start, start + perPage);
  const totalPages = Math.ceil(results.length / perPage);

  root.innerHTML = `
    <!-- Search Form -->
    <div class="job-search-form">
      <div class="job-search-input-wrap">
        <i class="fas fa-search"></i>
        <input type="text" class="job-search-input" id="jobKeywordInput"
          placeholder="Nhập từ khóa, chức danh, kỹ năng..."
          value="${_escJobHtml(_jobState.keyword)}"
          onkeydown="if(event.key==='Enter'){event.preventDefault();window._jobSearch()}" />
      </div>
      <select class="job-location-select" id="jobLocationSelect" onchange="window._jobSetLocation(this.value)">
        ${LOCATIONS.map(l => `<option value="${l.value}" ${l.value === _jobState.location ? 'selected' : ''}>${l.label}</option>`).join('')}
      </select>
      <button class="job-search-btn" onclick="window._jobSearch()" ${loading ? 'disabled' : ''}>
        ${loading ? '<i class="fas fa-spinner fa-spin"></i>' : '<i class="fas fa-search"></i>'} Tìm kiếm
      </button>
    </div>

    <!-- Popular Searches -->
    ${!searched ? `
      <div class="job-popular-searches">
        <div class="job-popular-label">Tìm kiếm phổ biến</div>
        <div class="job-popular-tags">
          ${POPULAR_SEARCHES.map(s => `
            <button class="job-popular-tag" onclick="window._jobQuickSearch('${_escJobHtml(s)}')">${s}</button>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Source Tabs -->
    ${searched ? `
      <div class="job-source-tabs">
        ${Object.entries(JOB_SOURCES).map(([key, src]) => `
          <button class="job-source-tab ${source === key ? 'active' : ''}" onclick="window._jobFilterSource('${key}')">
            <i class="${src.icon}"></i> ${src.name}
            ${sourceCounts[key] ? `<span class="source-count">${sourceCounts[key]}</span>` : ''}
          </button>
        `).join('')}
      </div>
    ` : ''}

    <!-- Salary Filters -->
    ${searched ? `
      <div class="job-filters">
        ${SALARY_FILTERS.map(f => `
          <button class="job-filter-pill ${_jobState.salary === f.value ? 'active' : ''}" onclick="window._jobFilterSalary('${f.value}')">
            ${f.value ? `<i class="fas fa-money-bill-wave"></i>` : '<i class="fas fa-filter"></i>'} ${f.label}
          </button>
        `).join('')}
      </div>
    ` : ''}

    <!-- Loading State -->
    ${loading ? `
      <div class="job-loading">
        <div class="job-spinner"></div>
        <p>Đang tìm kiếm việc làm từ nhiều nguồn...</p>
      </div>
    ` : ''}

    <!-- Results -->
    ${!loading && searched ? `
      <div class="job-results-info">
        <div class="job-results-count">
          Tìm thấy <span>${results.length}</span> việc làm
          ${_jobState.keyword ? ` cho "${_escJobHtml(_jobState.keyword)}"` : ''}
        </div>
      </div>

      ${paginatedResults.length > 0 ? `
        <div class="job-cards-grid">
          ${paginatedResults.map(job => _renderJobCard(job)).join('')}
        </div>

        ${totalPages > 1 ? `
          <div class="job-pagination">
            <button class="job-page-btn" onclick="window._jobPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>
              <i class="fas fa-chevron-left"></i>
            </button>
            ${_renderPagination(page, totalPages)}
            <button class="job-page-btn" onclick="window._jobPage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        ` : ''}
      ` : `
        <div class="job-empty-state">
          <i class="fas fa-search"></i>
          <p>Không tìm thấy kết quả phù hợp</p>
          <p class="sub">Thử thay đổi từ khóa hoặc bộ lọc</p>
        </div>
      `}
    ` : ''}

    <!-- Default State -->
    ${!loading && !searched ? `
      <div class="job-stats-bar">
        <div class="job-stat-item">
          <i class="fas fa-briefcase"></i>
          <span class="stat-num">10+</span>
          <span class="stat-label">Nguồn tuyển dụng</span>
        </div>
        <div class="job-stat-item">
          <i class="fas fa-map-marker-alt"></i>
          <span class="stat-num">63</span>
          <span class="stat-label">Tỉnh/Thành phố</span>
        </div>
        <div class="job-stat-item">
          <i class="fas fa-sync-alt"></i>
          <span class="stat-num">24/7</span>
          <span class="stat-label">Cập nhật liên tục</span>
        </div>
      </div>

      <div class="job-empty-state">
        <i class="fas fa-briefcase"></i>
        <p>Tìm kiếm việc làm từ tất cả các trang tuyển dụng hàng đầu Việt Nam</p>
        <p class="sub">TopCV, VietnamWorks, CareerViet, ITviec, ViecLam24h, JobsGo, TopDev, CareerLink và nhiều nguồn khác</p>
      </div>
    ` : ''}
  `;

  // Restore focus to keyword input
  const kwInput = _jel('jobKeywordInput');
  if (kwInput && !loading) {
    kwInput.value = _jobState.keyword;
  }
}

/* ═══════════════════════════════════════════
   RENDER HELPERS
   ═══════════════════════════════════════════ */
function _renderJobCard(job) {
  const initials = (job.company || '?').charAt(0).toUpperCase();
  const sourceClass = JOB_SOURCES[job.source] ? job.source : 'default';

  return `
    <div class="job-card" onclick="window._jobOpenDetail(${job._idx})">
      <div class="job-card-header">
        <div class="job-company-logo">
          ${job.logo ? `<img src="${_escJobHtml(job.logo)}" alt="" onerror="this.parentElement.textContent='${initials}'" />` : initials}
        </div>
        <div class="job-card-info">
          <div class="job-title">${_escJobHtml(job.title)}</div>
          <div class="job-company">${_escJobHtml(job.company)}</div>
        </div>
      </div>

      <div class="job-card-tags">
        ${job.salary ? `<span class="job-tag salary"><i class="fas fa-money-bill-wave"></i> ${_escJobHtml(job.salary)}</span>` : ''}
        ${job.location ? `<span class="job-tag location"><i class="fas fa-map-marker-alt"></i> ${_escJobHtml(job.location)}</span>` : ''}
        ${job.type ? `<span class="job-tag type">${_escJobHtml(job.type)}</span>` : ''}
        ${job.experience ? `<span class="job-tag exp">${_escJobHtml(job.experience)}</span>` : ''}
      </div>

      <div class="job-card-footer">
        <span class="job-source-badge ${sourceClass}">${JOB_SOURCES[job.source]?.name || job.source}</span>
        <span class="job-date"><i class="far fa-clock"></i> ${_escJobHtml(job.date || 'Mới cập nhật')}</span>
      </div>
    </div>
  `;
}

function _renderPagination(current, total) {
  let pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }

  return pages.map(p => {
    if (p === '...') return '<span style="color:var(--text-muted);padding:0 4px;">...</span>';
    return `<button class="job-page-btn ${p === current ? 'active' : ''}" onclick="window._jobPage(${p})">${p}</button>`;
  }).join('');
}

/* ═══════════════════════════════════════════
   API CALL
   ═══════════════════════════════════════════ */
async function _searchJobs(keyword, location) {
  try {
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (location) params.set('location', location);

    const res = await fetch(`/api/job-search?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.jobs || [];
  } catch (err) {
    console.warn('[Job Search]', err);
    return [];
  }
}

/* ═══════════════════════════════════════════
   FILTERING LOGIC
   ═══════════════════════════════════════════ */
function _applyFilters() {
  let filtered = [..._jobState.allResults];

  // Source filter
  if (_jobState.source !== 'all') {
    filtered = filtered.filter(j => j.source === _jobState.source);
  }

  // Salary filter
  if (_jobState.salary) {
    filtered = filtered.filter(j => {
      if (!j.salary) return _jobState.salary === 'thoa-thuan';
      const salaryLower = j.salary.toLowerCase();
      if (_jobState.salary === 'thoa-thuan') return salaryLower.includes('thỏa thuận') || salaryLower.includes('thương lượng') || salaryLower.includes('negotiable');
      // Extract numbers from salary for range filtering
      const nums = salaryLower.match(/\d+/g);
      if (!nums || nums.length === 0) return false;
      const maxSalary = Math.max(...nums.map(Number));
      switch (_jobState.salary) {
        case 'duoi-10': return maxSalary < 10;
        case '10-15': return maxSalary >= 10 && maxSalary <= 15;
        case '15-20': return maxSalary >= 15 && maxSalary <= 20;
        case '20-30': return maxSalary >= 20 && maxSalary <= 30;
        case '30-50': return maxSalary >= 30 && maxSalary <= 50;
        case 'tren-50': return maxSalary > 50;
        default: return true;
      }
    });
  }

  _jobState.results = filtered;
  _jobState.page = 1;
}

/* ═══════════════════════════════════════════
   USER ACTIONS
   ═══════════════════════════════════════════ */
window._jobSearch = async function() {
  const input = _jel('jobKeywordInput');
  const keyword = input ? input.value.trim() : '';
  _jobState.keyword = keyword;
  _jobState.loading = true;
  _jobState.searched = true;
  _jobState.source = 'all';
  _jobState.salary = '';
  _jobState.page = 1;

  const root = _jel('jobSearchContent');
  _renderJobView(root);

  const jobs = await _searchJobs(keyword, _jobState.location);

  // Add index for detail view
  jobs.forEach((j, i) => j._idx = i);

  _jobState.allResults = jobs;
  _jobState.results = jobs;
  _jobState.loading = false;
  _renderJobView(root);
};

window._jobQuickSearch = function(keyword) {
  _jobState.keyword = keyword;
  const input = _jel('jobKeywordInput');
  if (input) input.value = keyword;
  window._jobSearch();
};

window._jobSetLocation = function(value) {
  _jobState.location = value;
};

window._jobFilterSource = function(source) {
  _jobState.source = source;
  _applyFilters();
  _renderJobView(_jel('jobSearchContent'));
};

window._jobFilterSalary = function(salary) {
  _jobState.salary = _jobState.salary === salary ? '' : salary;
  _applyFilters();
  _renderJobView(_jel('jobSearchContent'));
};

window._jobPage = function(page) {
  const totalPages = Math.ceil(_jobState.results.length / _jobState.perPage);
  if (page < 1 || page > totalPages) return;
  _jobState.page = page;
  _renderJobView(_jel('jobSearchContent'));
  // Scroll to top of results
  _jel('jobSearchContent')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window._jobOpenDetail = function(idx) {
  const job = _jobState.allResults[idx];
  if (!job) return;

  // If job has a URL, open in new tab
  if (job.url) {
    window.open(job.url, '_blank', 'noopener,noreferrer');
  }
};

/* ═══════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════ */
function _escJobHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
