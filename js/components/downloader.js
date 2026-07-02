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

        <div style="margin-top: 10px; font-size: 13px;">
          <a href="#" id="togglePrivateFb" style="color: var(--accent-cyan); text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">
            <i class="fab fa-facebook"></i> Tải video Facebook riêng tư (Private)?
          </a>
        </div>
        <div id="privateFbContainer" style="display: none; margin-top: 15px; padding: 15px; background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 8px;">
          <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-secondary);">Hướng dẫn tải video Facebook riêng tư:</div>
          <ol style="font-size: 12px; color: var(--text-muted); padding-left: 20px; line-height: 1.6; margin-bottom: 12px; margin-top: 0;">
            <li>Mở tab mới, truy cập vào link video Facebook riêng tư cần tải.</li>
            <li>Nhấn phím <strong>Ctrl + U</strong> (hoặc nhấn chuột phải và chọn <strong>Xem nguồn trang / View page source</strong>).</li>
            <li>Nhấn <strong>Ctrl + A</strong> để chọn tất cả, sau đó nhấn <strong>Ctrl + C</strong> để copy toàn bộ mã nguồn.</li>
            <li>Dán mã nguồn đã copy vào khung bên dưới và nhấn nút <strong>Trích xuất link tải</strong>.</li>
          </ol>
          <textarea id="fbSourceInput" class="field-input" placeholder="Dán toàn bộ mã nguồn HTML (Ctrl + V) vào đây..." style="width: 100%; height: 120px; font-family: monospace; font-size: 11px; resize: vertical; margin-bottom: 10px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 4px; padding: 8px; color: var(--text-primary); box-sizing: border-box;"></textarea>
          <button id="btnExtractPrivateFb" class="btn-primary" style="width: 100%;">Trích xuất link tải</button>
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

  const togglePrivate = document.getElementById('togglePrivateFb');
  const privateContainer = document.getElementById('privateFbContainer');
  if (togglePrivate && privateContainer) {
    togglePrivate.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = privateContainer.style.display === 'none';
      privateContainer.style.display = isHidden ? 'block' : 'none';
      if (isHidden) {
        document.getElementById('fbSourceInput').focus();
      }
    });
  }

  const btnExtract = document.getElementById('btnExtractPrivateFb');
  if (btnExtract) {
    btnExtract.addEventListener('click', () => {
      const source = document.getElementById('fbSourceInput').value;
      if (!source.trim()) {
        alert('Vui lòng dán mã nguồn HTML!');
        return;
      }
      
      let hdUrl = null;
      let sdUrl = null;

      const cleanFbUrl = (urlStr) => {
        if (!urlStr) return '';
        // 1. Decode Unicode escapes (e.g. \u0026 -> &, \u0025 -> %)
        let cleaned = urlStr.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
          return String.fromCharCode(parseInt(grp, 16));
        });
        // 2. Remove backslashes before slashes
        cleaned = cleaned.replace(/\\+\//g, '/');
        // 3. Remove any other remaining backslashes
        cleaned = cleaned.replace(/\\/g, '');
        // 4. Decode HTML entities
        try {
          const parser = new DOMParser();
          const dom = parser.parseFromString(cleaned, 'text/html');
          cleaned = dom.body.textContent || cleaned;
        } catch (e) {}
        return cleaned;
      };

      const extractUrlByKey = (src, key) => {
        const regex = new RegExp(`["\\\\]*${key}["\\\\]*\\s*:\\s*["\\\\]*(https?:[^"\\s]+)`, 'i');
        const match = src.match(regex);
        if (match) {
          let rawUrl = match[1];
          rawUrl = rawUrl.replace(/["\\\\]+$/, '');
          return cleanFbUrl(rawUrl);
        }
        return null;
      };

      const hdKeys = ['playable_url_quality_hd', 'browser_native_hd_url', 'hd_src'];
      const sdKeys = ['playable_url', 'browser_native_sd_url', 'sd_src', 'videoURL'];

      for (const key of hdKeys) {
        const found = extractUrlByKey(source, key);
        if (found) {
          hdUrl = found;
          break;
        }
      }

      for (const key of sdKeys) {
        const found = extractUrlByKey(source, key);
        if (found) {
          sdUrl = found;
          break;
        }
      }

      // If still not found, search for all fbcdn.net .mp4 URLs in the HTML source code
      if (!hdUrl && !sdUrl) {
        const mp4Regex = /https?:(?:\\\/\\\/|\/\/)[^\s"']+\.fbcdn\.net[^\s"']+\.mp4[^\s"']*/gi;
        const matches = source.match(mp4Regex) || [];
        const cleanedUrls = [];
        for (const m of matches) {
          let clean = m.replace(/["\\\\]+$/, '');
          clean = cleanFbUrl(clean);
          if (clean.includes('fbcdn.net') && !cleanedUrls.includes(clean)) {
            cleanedUrls.push(clean);
          }
        }
        if (cleanedUrls.length > 0) {
          sdUrl = cleanedUrls[0];
          if (cleanedUrls.length > 1) {
            hdUrl = cleanedUrls[1];
          }
        }
      }

      const resultDiv = document.getElementById('dlResultContainer');
      if (!resultDiv) return;

      if (hdUrl || sdUrl) {
        const videoFilename = `facebook_private_${Date.now()}.mp4`;
        resultDiv.innerHTML = `
          <div class="dl-result-card">
            <div style="font-size: 40px; padding: 20px; display:flex; align-items:center; justify-content:center; color: var(--accent-blue);">
              <i class="fab fa-facebook"></i>
            </div>
            <div class="dl-info">
              <div>
                <div class="dl-title" style="color:var(--text-primary); font-weight:700;">Tìm thấy video Facebook riêng tư</div>
                <div class="dl-author" style="font-size:12px; opacity:0.7;">Định dạng MP4</div>
              </div>
              <div class="dl-buttons" style="display:flex; gap:8px; flex-wrap:wrap; width:100%;">
                ${hdUrl ? `
                  <button class="dl-btn dl-btn--video" onclick="window._dlBlob('${hdUrl}','${videoFilename}')">
                    <i class="fas fa-download"></i> Tải chất lượng HD (Proxy)
                  </button>
                  <a class="dl-btn dl-btn--fallback" href="${hdUrl}" download="${videoFilename}" target="_blank" style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; padding:10px 14px; font-size:13px; white-space:nowrap;">
                    <i class="fas fa-external-link-alt"></i> Tải HD trực tiếp
                  </a>
                ` : ''}
                ${sdUrl ? `
                  <button class="dl-btn dl-btn--video" onclick="window._dlBlob('${sdUrl}','${videoFilename}')" style="${!hdUrl ? '' : 'background: rgba(255,255,255,0.05); border-color: var(--border);'}">
                    <i class="fas fa-download"></i> Tải chất lượng SD (Proxy)
                  </button>
                  <a class="dl-btn dl-btn--fallback" href="${sdUrl}" download="${videoFilename}" target="_blank" style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; padding:10px 14px; font-size:13px; white-space:nowrap;">
                    <i class="fas fa-external-link-alt"></i> Tải SD trực tiếp
                  </a>
                ` : ''}
              </div>
              <div class="dl-status-area" style="margin-top: 12px; width: 100%; display: none;"></div>
            </div>
          </div>
        `;
      } else {
        resultDiv.innerHTML = `
          <div class="dl-result-card" style="border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.03);">
            <div style="font-size: 32px; padding: 20px; color: var(--accent-red); display:flex; align-items:center; justify-content:center;">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="dl-info">
              <div>
                <div class="dl-title" style="color: var(--accent-red); font-weight:700;">Không tìm thấy liên kết video</div>
                <div class="dl-author" style="font-size:12px; opacity:0.8; margin-bottom:10px;">
                  Mã nguồn trang bạn dán không chứa liên kết video nào hoặc định dạng trang đã thay đổi. Hãy chắc chắn bạn đã copy đúng toàn bộ mã nguồn bằng Ctrl+A.
                </div>
              </div>
            </div>
          </div>
        `;
      }
    });
  }
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
    const isFb = url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.gg');
    const fbTip = isFb ? `
      <div style="margin-top: 10px; padding: 10px 12px; background: rgba(96, 165, 250, 0.08); border-left: 3px solid var(--accent-blue); border-radius: 4px; font-size: 12px; color: var(--text-secondary); line-height: 1.5; text-align: left; box-sizing: border-box; width: 100%;">
        <strong>💡 Mẹo:</strong> Nếu đây là video từ <strong>Nhóm riêng tư (Private Group)</strong> hoặc Trang cá nhân riêng tư, máy chủ bên ngoài không có quyền truy cập trực tiếp. Bạn vui lòng bấm dòng chữ <strong>"Tải video Facebook riêng tư (Private)?"</strong> ở phía trên để làm theo hướng dẫn dán mã nguồn trang.
      </div>
    ` : '';

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
          ${fbTip}
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
