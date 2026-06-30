// ── Proxy URL builder ────────────────────────────────────────────────
const PROXY_BASE = (() => {
  if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.TRAFFIC_PROXY_URL) return APP_CONFIG.TRAFFIC_PROXY_URL;
  return window.location.origin;
})();

function proxyDownloadUrl(originalUrl, filename) {
  return `${PROXY_BASE}/api/download-proxy?url=${encodeURIComponent(originalUrl)}&filename=${encodeURIComponent(filename)}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}


async function blobDownload(downloadUrl, suggestedFilename) {
  const resultDiv = document.getElementById('dlResultContainer');
  const pid = 'dlP_' + Date.now();
  const bid = 'dlB_' + Date.now();
  const tid = 'dlT_' + Date.now();

  const card = resultDiv?.querySelector('.dl-result-card');
  if (card) {
    let statusArea = card.querySelector('.dl-status-area');
    if (!statusArea) {
      statusArea = document.createElement('div');
      statusArea.className = 'dl-status-area';
      statusArea.style.cssText = 'margin-top: 12px; width: 100%;';
      const info = card.querySelector('.dl-info');
      if (info) {
        info.appendChild(statusArea);
      } else {
        card.appendChild(statusArea);
      }
    }
    statusArea.style.display = 'block';
    statusArea.innerHTML = `
      <div id="${pid}" style="width:100%; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span class="status-dot dot-yellow" style="flex-shrink:0;"></span>
          <span id="${tid}" style="font-size:13px;color:var(--text-muted);">Đang chuẩn bị tải xuống...</span>
        </div>
        <div style="width:100%;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
          <div id="${bid}" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent-blue),var(--accent-purple));border-radius:3px;transition:width 0.15s;"></div>
        </div>
      </div>`;
  }

  const filename = suggestedFilename || 'download';
  // Always route through Worker proxy to avoid CORS/redirect issues
  const fetchUrl = proxyDownloadUrl(downloadUrl, filename);

  const txt = () => document.getElementById(tid);
  const bar = () => document.getElementById(bid);

  try {
    if (txt()) txt().textContent = '⏳ Đang kết nối qua proxy...';

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Proxy lỗi HTTP ${response.status} – thử link dự phòng bên dưới`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLen  = response.headers.get('content-length');
    const total       = contentLen ? parseInt(contentLen, 10) : 0;

    if (txt()) txt().textContent = total
      ? `Đang tải... 0% · ${formatBytes(0)} / ${formatBytes(total)}`
      : 'Đang tải...';

    const reader = response.body.getReader();
    const chunks = [];
    let received  = 0;
    const startMs = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;

      const elapsed = Math.max((Date.now() - startMs) / 1000, 0.01);
      const speed   = received / elapsed;
      const spdStr  = speed > 1048576 ? `${(speed/1048576).toFixed(1)} MB/s` : `${(speed/1024).toFixed(0)} KB/s`;

      if (total > 0) {
        const pct = Math.min(99, Math.round(received / total * 100));
        if (bar()) bar().style.width = pct + '%';
        if (txt()) txt().textContent = `Đang tải... ${pct}% · ${formatBytes(received)}/${formatBytes(total)} · ${spdStr}`;
      } else {
        if (txt()) txt().textContent = `Đang tải... ${formatBytes(received)} · ${spdStr}`;
      }
    }

    if (received === 0) throw new Error('File trả về 0 byte – proxy không thể tải URL này');

    const mimeType = contentType.split(';')[0].trim() || 'application/octet-stream';
    const blob     = new Blob(chunks, { type: mimeType });
    const blobUrl  = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);

    if (bar()) bar().style.width = '100%';
    const prog = document.getElementById(pid);
    if (prog) {
      prog.style.borderColor = 'rgba(74, 222, 128, 0.2)';
      prog.style.background = 'rgba(74, 222, 128, 0.04)';
      prog.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;color:#4ade80;font-size:13px;">
          <i class="fas fa-check-circle"></i> Tải xong! <strong>${filename}</strong> · ${formatBytes(received)}
        </div>`;
    }

  } catch (err) {
    console.error('[blobDownload]', err);
    const prog = document.getElementById(pid);
    if (prog) {
      prog.style.borderColor = 'rgba(239, 68, 68, 0.2)';
      prog.style.background = 'rgba(239, 68, 68, 0.04)';
      prog.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;align-items:center;gap:8px;color:#f87171;font-size:13px;font-weight:600;">
            <i class="fas fa-exclamation-circle"></i> Tải qua máy chủ thất bại
          </div>
          <div style="color:var(--text-muted);font-size:12px;line-height:1.5;">
            ${err.message}
          </div>
          <div style="margin-top:4px;">
            <a class="dl-btn dl-btn--fallback" href="${downloadUrl}" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;padding:6px 12px;font-size:12px;">
              Thử tải trực tiếp <i class="fas fa-external-link-alt"></i>
            </a>
          </div>
        </div>`;
    }
  }
}



export function renderDownloader() {
  const container = document.getElementById('downloaderContent');
  if (!container) return;

  container.innerHTML = `
    <div class="dl-wrap">
      <div class="dl-box">
 <div class="travel-title-sub">Dán link video hoặc nhạc cần tải</div>
        <div class="dl-input-group">
          <input type="text" id="dlUrlInput" class="field-input" placeholder="Dán link Tiktok, Youtube, Facebook, Instagram, Soundcloud..." />
          <button id="btnFetchDl" class="btn-primary">Trích xuất</button>
        </div>

        <div class="travel-title-sub" style="margin-top: 20px;">Nền tảng hỗ trợ</div>
        <div class="dl-platforms">
          <div class="dl-platform-card">
            <span class="dl-platform-icon"><i class="fab fa-tiktok"></i></span>
            <span>TikTok</span>
          </div>
          <div class="dl-platform-card">
            <span class="dl-platform-icon"><i class="fab fa-youtube" style="color:#ef4444;"></i></span>
            <span>YouTube</span>
          </div>
          <div class="dl-platform-card">
            <span class="dl-platform-icon"><i class="fab fa-facebook" style="color:#1877f2;"></i></span>
            <span>Facebook</span>
          </div>
          <div class="dl-platform-card">
            <span class="dl-platform-icon"><i class="fab fa-instagram" style="color:#e1306c;"></i></span>
            <span>Instagram</span>
          </div>
          <div class="dl-platform-card">
            <span class="dl-platform-icon"><i class="fab fa-soundcloud" style="color:#ff5500;"></i></span>
            <span>SoundCloud</span>
          </div>
        </div>
          <div class="dl-platform-card">
 <span class="dl-platform-icon"></span>
            <span>YouTube</span>
          </div>
          <div class="dl-platform-card">
 <span class="dl-platform-icon"></span>
            <span>Facebook</span>
          </div>
          <div class="dl-platform-card">
 <span class="dl-platform-icon"></span>
            <span>Instagram</span>
          </div>
          <div class="dl-platform-card">
 <span class="dl-platform-icon">️</span>
            <span>SoundCloud</span>
          </div>
        </div>
      </div>

      <div id="dlResultContainer"></div>
    </div>
  `;

  const input = document.getElementById('dlUrlInput');
  const btn = document.getElementById('btnFetchDl');

  btn.addEventListener('click', () => {
    const url = input.value.trim();
    if (url) fetchMediaDownload(url);
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const url = input.value.trim();
      if (url) fetchMediaDownload(url);
    }
  });
}

async function fetchMediaDownload(url) {
  const resultDiv = document.getElementById('dlResultContainer');
  if (!resultDiv) return;

  const cleanUrl = encodeURIComponent(url);
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

  // Display loading screen with IMMEDIATE fallback links
  resultDiv.innerHTML = `
    <div style="text-align: center; padding: 24px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.01);">
      <div style="margin-bottom:12px;">
        <span class="status-dot dot-yellow" style="display:inline-block;animation: pulse 1s infinite alternate;"></span>
        <span style="font-weight:700;color:var(--text-secondary);">Đang phân tích liên kết &amp; lấy link tải...</span>
      </div>
      <div style="font-size:11px; color:var(--text-muted); line-height:1.4;">
        Hệ thống đang gọi server giải mã (khoảng 3-6s).<br>
        Nếu đợi lâu, bạn có thể click tải trực tiếp qua các cổng phụ nhanh dưới đây:
      </div>
      <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-top:12px;">
 <a class="dl-btn dl-btn--fallback" href="https://y2mate.is/analyze?url=${cleanUrl}" target="_blank" style="padding:6px 12px;font-size:11px;text-decoration:none;">Y2Mate</a>
 <a class="dl-btn dl-btn--fallback" href="https://9xbuddy.xyz/process?url=${cleanUrl}" target="_blank" style="padding:6px 12px;font-size:11px;text-decoration:none;">9XBuddy</a>
 <a class="dl-btn dl-btn--fallback" href="https://savefrom.net/?url=${cleanUrl}" target="_blank" style="padding:6px 12px;font-size:11px;text-decoration:none;">SaveFrom</a>
      </div>
    </div>
  `;

  // Detect platform
  const isTikTok = url.includes('tiktok.com');

  if (isTikTok) {
    try {
      // TikWM has a free public API with CORS enabled
      const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const resData = await response.json();

      if (resData.code === 0 && resData.data) {
        const d = resData.data;
        const videoFilename = `tiktok_${d.author?.unique_id || 'video'}.mp4`;
        const audioFilename = `tiktok_${d.author?.unique_id || 'audio'}.mp3`;

        resultDiv.innerHTML = `
          <div class="dl-result-card">
            <img class="dl-thumbnail" src="${d.cover}" alt="Thumbnail" />
            <div class="dl-info">
              <div>
                <div class="dl-title">${d.title || 'Video TikTok'}</div>
                <div class="dl-author">Kênh: @${d.author?.unique_id} (${d.author?.nickname})</div>
              </div>
              <div class="dl-buttons" style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="dl-btn dl-btn--video" onclick="window._dlBlob('${d.play}','${videoFilename}')">
                  <i class="fas fa-download"></i> Tải Video (Proxy)
                </button>
                <a class="dl-btn dl-btn--fallback" href="${d.play}" download="${videoFilename}" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center;padding:10px 14px;font-size:13px;white-space:nowrap;">
                  <i class="fas fa-external-link-alt"></i> Tải trực tiếp
                </a>
                ${d.music ? `
                  <button class="dl-btn dl-btn--audio" onclick="window._dlBlob('${d.music}','${audioFilename}')">
                    <i class="fas fa-music"></i> Tải Nhạc (Proxy)
                  </button>
                  <a class="dl-btn dl-btn--fallback" href="${d.music}" download="${audioFilename}" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center;padding:10px 14px;font-size:13px;white-space:nowrap;">
                    <i class="fas fa-external-link-alt"></i> Nhạc trực tiếp
                  </a>
                ` : ''}
              </div>
              <div class="dl-status-area" style="margin-top: 12px; width: 100%; display: none;"></div>
            </div>
          </div>
        `;
        return;
      } else {
        throw new Error(resData.msg || 'Không thể lấy thông tin video');
      }
    } catch (err) {
      console.warn('[TikTok API failed, fallback]', err);
    }
  }

  // Call our own CF Worker proxy to process Cobalt request (handles Turnstile/CORS securely)
  try {
    const response = await fetch('/api/downloader', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    if (response.ok) {
      const data = await response.json();
      // Support Cobalt v10 Picker/Slideshow (e.g., Instagram carousels)
      if (data.status === 'picker' && Array.isArray(data.picker)) {
        let pickerHtml = '';
        data.picker.forEach((item, idx) => {
          const ext = item.type === 'photo' ? 'jpg' : item.type === 'audio' ? 'mp3' : 'mp4';
          const typeLabel = item.type === 'photo' ? 'Ảnh' : item.type === 'audio' ? 'Âm thanh' : 'Video';
          const btnClass = item.type === 'audio' ? 'dl-btn dl-btn--audio' : 'dl-btn dl-btn--video';
          const filename = `media_${idx + 1}.${ext}`;
          pickerHtml += `
            <div style="display:flex;gap:6px;align-items:center;margin-top:5px;width:100%;flex-wrap:wrap;">
              <button class="${btnClass}" onclick="window._dlBlob('${item.url}','${filename}')" style="font-size:11px;padding:6px 12px;white-space:nowrap;">
 Tải ${typeLabel} ${idx + 1} (Proxy)
              </button>
              <a class="dl-btn dl-btn--fallback" href="${item.url}" download="${filename}" target="_blank" style="font-size:11px;padding:6px 12px;text-decoration:none;display:inline-flex;align-items:center;white-space:nowrap;">
 Tải trực tiếp
              </a>
            </div>
          `;
        });

        resultDiv.innerHTML = `
          <div class="dl-result-card">
            <img class="dl-thumbnail" src="${d.cover}" alt="Thumbnail" />
            <div class="dl-info">
              <div>
                <div class="dl-title">${d.title || 'Video TikTok'}</div>
                <div class="dl-author">Kênh: @${d.author?.unique_id} (${d.author?.nickname})</div>
              </div>
              <div class="dl-buttons" style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="dl-btn dl-btn--video" onclick="window._dlBlob('${d.play}','${videoFilename}')">
                  <i class="fas fa-download"></i> Tải Video (Proxy)
                </button>
                <a class="dl-btn dl-btn--fallback" href="${d.play}" download="${videoFilename}" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center;padding:10px 14px;font-size:13px;white-space:nowrap;">
                  <i class="fas fa-external-link-alt"></i> Tải trực tiếp
                </a>
                ${d.music ? `
                  <button class="dl-btn dl-btn--audio" onclick="window._dlBlob('${d.music}','${audioFilename}')">
                    <i class="fas fa-music"></i> Tải Nhạc (Proxy)
                  </button>
                  <a class="dl-btn dl-btn--fallback" href="${d.music}" download="${audioFilename}" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center;padding:10px 14px;font-size:13px;white-space:nowrap;">
                    <i class="fas fa-external-link-alt"></i> Nhạc trực tiếp
                  </a>
                ` : ''}
              </div>
              <div class="dl-status-area" style="margin-top: 12px; width: 100%; display: none;"></div>
            </div>
          </div>
        `;
        return;
      }

      if (data.status === 'stream' || data.status === 'redirect' || data.status === 'tunnel' || data.url) {
        const downloadUrl = data.url;
        // Use filename from Cobalt if provided, otherwise guess from URL
        const filename = data.filename || (isYouTube ? 'youtube_video.mp4' : 'media_download.mp4');
        const title = data.filename ? data.filename.replace(/\s*\(.*?\)\s*/g, ' ').trim() : (isYouTube ? 'YouTube Video' : 'Video Phương Tiện');

        resultDiv.innerHTML = `
          <div class="dl-result-card">
 <div style="font-size: 32px; padding: 20px;"></div>
            <div class="dl-info">
              <div>
                <div class="dl-title">${title}</div>
 <div class="dl-author" style="font-size:12px;opacity:0.7;">${filename}</div>
              </div>
              <div class="dl-buttons" style="display:flex;gap:8px;flex-wrap:wrap;width:100%;">
                <button class="dl-btn dl-btn--video" id="btnStartDownload" style="white-space:nowrap;">
 Tải qua Máy chủ (Proxy)
                </button>
                <a class="dl-btn dl-btn--fallback" href="${downloadUrl}" download="${filename}" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;font-size:13px;white-space:nowrap;">
 Tải trực tiếp (Trình duyệt)
                </a>
              </div>
            </div>
          </div>
        `;

        // Store data for button
        document.getElementById('btnStartDownload').addEventListener('click', () => {
          blobDownload(downloadUrl, filename);
        });

        // Register global helper for picker buttons
        window._dlBlob = blobDownload;
        return;
      }
      throw new Error('Định dạng phản hồi không hợp lệ hoặc không có dữ liệu tải.');
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Lỗi từ máy chủ tải xuống (${response.status})`);
    }
  } catch (err) {
    console.warn('[Worker Downloader API failed]', err);
    resultDiv.innerHTML = `
      <div class="dl-result-card" style="border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.03);">
 <div style="font-size: 32px; padding: 20px;"></div>
        <div class="dl-info">
          <div>
            <div class="dl-title" style="color: var(--accent-red); font-weight:700;">Không thể tự động giải mã liên kết</div>
            <div class="dl-author" style="font-size:12px; opacity:0.8; margin-bottom:10px;">${err.message || 'Tất cả các máy chủ tải xuống đều bận.'}</div>
          </div>
          <div class="dl-buttons" style="display:flex; gap:8px; flex-wrap:wrap; width:100%;">
            <a class="dl-btn dl-btn--fallback" href="https://y2mate.is/analyze?url=${cleanUrl}" target="_blank" style="text-decoration:none; padding:10px 14px; font-size:13px;">
 Tải qua Y2Mate
            </a>
            <a class="dl-btn dl-btn--fallback" href="https://9xbuddy.xyz/process?url=${cleanUrl}" target="_blank" style="text-decoration:none; padding:10px 14px; font-size:13px;">
 Tải qua 9XBuddy
            </a>
            <a class="dl-btn dl-btn--fallback" href="https://savefrom.net/?url=${cleanUrl}" target="_blank" style="text-decoration:none; padding:10px 14px; font-size:13px;">
 Tải qua SaveFrom
            </a>
          </div>
        </div>
      </div>
    `;
  }
}

// Register global helper so inline onclick handlers in picker work
window._dlBlob = blobDownload;

window.switchDownloaderTab = (tab) => {
  const tabMedia = document.getElementById('dlTab-media');
  const tabFiles = document.getElementById('dlTab-files');
  const contentMedia = document.getElementById('downloaderContent');
  const contentFiles = document.getElementById('fileToolsContent');
  const cardHeader = document.getElementById('dlCardHeader');
  const cardTitle = document.getElementById('dlCardTitle');

  if (!tabMedia || !tabFiles || !contentMedia || !contentFiles) return;

  // Remove existing badge if any
  const existingBadge = cardHeader?.querySelector('.card-badge');
  if (existingBadge) existingBadge.remove();

  if (tab === 'media') {
    tabMedia.classList.add('active');
    tabMedia.style.background = 'rgba(96,165,250,0.12)';
    tabMedia.style.borderColor = 'rgba(96,165,250,0.4)';
    tabMedia.style.color = '#60a5fa';

    tabFiles.classList.remove('active');
    tabFiles.style.background = '';
    tabFiles.style.borderColor = '';
    tabFiles.style.color = '';

 if (cardTitle) cardTitle.innerHTML = `<span class="icon"></span> Trích Xuất Link Tải Phương Tiện`;

    contentMedia.style.display = 'block';
    contentFiles.style.display = 'none';
  } else {
    tabMedia.classList.remove('active');
    tabMedia.style.background = '';
    tabMedia.style.borderColor = '';
    tabMedia.style.color = '';

    tabFiles.classList.add('active');
    tabFiles.style.background = 'rgba(52,211,153,0.12)';
    tabFiles.style.borderColor = 'rgba(52,211,153,0.4)';
    tabFiles.style.color = '#34d399';

 if (cardTitle) cardTitle.innerHTML = `<span class="icon">️</span> Chuyển Đổi, Nén Ảnh &amp; ZIP`;
    
    // Add client-only badge
    if (cardHeader) {
      const badge = document.createElement('span');
      badge.className = 'card-badge badge-manual';
      badge.textContent = 'CLIENT-ONLY';
      cardHeader.appendChild(badge);
    }

    contentMedia.style.display = 'none';
    contentFiles.style.display = 'block';
  }
};
