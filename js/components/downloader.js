import APP_CONFIG from '../../config.js';

/* ── Media Downloader Component ── */

export function renderDownloader() {
  const container = document.getElementById('downloaderContent');
  if (!container) return;

  container.innerHTML = `
    <div class="dl-wrap">
      <div class="dl-box">
        <div class="travel-title-sub">🔗 Dán link video hoặc nhạc cần tải</div>
        <div class="dl-input-group">
          <input type="text" id="dlUrlInput" class="field-input" placeholder="Dán link Tiktok, Youtube, Facebook, Instagram, Soundcloud..." />
          <button id="btnFetchDl" class="btn-primary">Trích xuất</button>
        </div>

        <div class="travel-title-sub" style="margin-top: 20px;">Nền tảng hỗ trợ</div>
        <div class="dl-platforms">
          <div class="dl-platform-card">
            <span class="dl-platform-icon">🎵</span>
            <span>TikTok</span>
          </div>
          <div class="dl-platform-card">
            <span class="dl-platform-icon">📺</span>
            <span>YouTube</span>
          </div>
          <div class="dl-platform-card">
            <span class="dl-platform-icon">📘</span>
            <span>Facebook</span>
          </div>
          <div class="dl-platform-card">
            <span class="dl-platform-icon">📸</span>
            <span>Instagram</span>
          </div>
          <div class="dl-platform-card">
            <span class="dl-platform-icon">☁️</span>
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
    if (!url) return;
    fetchMediaDownload(url);
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const url = input.value.trim();
      if (url) fetchMediaDownload(url);
    }
  });
}

/**
 * Programmatically download a URL as a Blob with progress tracking.
 * This avoids the "Cannot render the file" error when the OS tries to
 * play a streaming URL instead of saving it to disk.
 */
async function blobDownload(downloadUrl, suggestedFilename) {
  const resultDiv = document.getElementById('dlResultContainer');
  const pid = 'dlP_' + Date.now();
  const bid = 'dlB_' + Date.now();
  const tid = 'dlT_' + Date.now();

  const card = resultDiv.querySelector('.dl-result-card');
  if (card) {
    const btnArea = card.querySelector('.dl-buttons');
    if (btnArea) btnArea.innerHTML = `
      <div id="${pid}" style="width:100%;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span class="status-dot dot-yellow" style="flex-shrink:0;"></span>
          <span id="${tid}" style="font-size:13px;color:var(--text-muted);">Đang tải xuống... 0%</span>
        </div>
        <div style="width:100%;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
          <div id="${bid}" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent-blue),var(--accent-purple));border-radius:3px;transition:width 0.15s;"></div>
        </div>
      </div>`;
  }

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // ── Detect proper mime & extension from response ──
    const contentType = response.headers.get('content-type') || '';
    const mimeToExt = {
      'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov',
      'audio/mpeg':'mp3','audio/mp4':'m4a','audio/ogg':'ogg','audio/wav':'wav','audio/webm':'webm',
      'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif',
    };
    const detectedExt = mimeToExt[contentType.split(';')[0].trim()];

    // Fix filename extension to match actual content
    let filename = suggestedFilename || 'download';
    if (detectedExt) {
      const currentExt = filename.split('.').pop().toLowerCase();
      const videoExts = ['mp4','webm','mov','avi','mkv'];
      const audioExts = ['mp3','m4a','ogg','wav','flac'];
      if (!videoExts.includes(currentExt) && !audioExts.includes(currentExt)) {
        filename = filename.replace(/\.[^.]+$/, '') + '.' + detectedExt;
      } else if (detectedExt !== currentExt && detectedExt) {
        // Only rename if mime clearly differs (e.g., got audio/mpeg but named .mp4)
        const isMimeAudio = audioExts.includes(detectedExt);
        const isNameAudio = audioExts.includes(currentExt);
        if (isMimeAudio !== isNameAudio) filename = filename.replace(/\.[^.]+$/, '') + '.' + detectedExt;
      }
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    let startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;

      const elapsed = (Date.now() - startTime) / 1000 || 0.001;
      const speed = received / elapsed;
      const speedStr = speed > 1048576 ? `${(speed/1048576).toFixed(1)} MB/s` : `${(speed/1024).toFixed(0)} KB/s`;

      const bar = document.getElementById(bid);
      const txt = document.getElementById(tid);
      if (total > 0) {
        const pct = Math.min(99, Math.round(received/total*100));
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.textContent = `Đang tải... ${pct}% · ${formatBytes(received)}/${formatBytes(total)} · ${speedStr}`;
      } else {
        if (txt) txt.textContent = `Đang tải... ${formatBytes(received)} · ${speedStr}`;
      }
    }

    const mimeType = contentType.split(';')[0].trim() || 'application/octet-stream';
    const blob = new Blob(chunks, { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

    const prog = document.getElementById(pid);
    if (prog) prog.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:#4ade80;font-size:13px;">✅ Đã tải xong! Lưu vào thư mục tải về với tên: <strong>${filename}</strong></div>`;

  } catch (err) {
    const prog = document.getElementById(pid);
    if (prog) prog.innerHTML = `<div style="color:var(--accent-red);font-size:13px;">❌ Lỗi: ${err.message}. Thử dùng link dự phòng bên dưới.</div>`;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}


async function fetchMediaDownload(url) {
  const resultDiv = document.getElementById('dlResultContainer');
  if (!resultDiv) return;

  resultDiv.innerHTML = `
    <div style="text-align: center; padding: 30px;">
      <span class="status-dot dot-yellow"></span> Đang phân tích liên kết &amp; lấy link tải...
    </div>
  `;

  // Detect platform
  const isTikTok = url.includes('tiktok.com');
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

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
                <div class="dl-author">👤 Kênh: @${d.author?.unique_id} (${d.author?.nickname})</div>
              </div>
              <div class="dl-buttons">
                <button class="dl-btn dl-btn--video" onclick="window._dlBlob('${d.play}','${videoFilename}')">
                  📥 Tải Video (Không Logo)
                </button>
                ${d.music ? `
                  <button class="dl-btn dl-btn--audio" onclick="window._dlBlob('${d.music}','${audioFilename}')">
                    🎵 Tải Nhạc Nền (MP3)
                  </button>
                ` : ''}
              </div>
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

  // Generic/YouTube/Fallback Downloader using Cobalt API directly from browser
  // (bypasses CF Worker datacenter IP block — uses user's home/4G IP)
  const cobaltInstances = [
    'https://api.cobalt.blackcat.sweeux.org',
    'https://rue-cobalt.xenon.zone'
  ];

  for (const instance of cobaltInstances) {
    try {
      const response = await fetch(instance, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
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
              <button class="${btnClass}" onclick="window._dlBlob('${item.url}','${filename}')" style="margin-top:5px;font-size:12px;padding:6px 12px;">
                📥 Tải ${typeLabel} ${idx + 1}
              </button>
            `;
          });

          resultDiv.innerHTML = `
            <div class="dl-result-card">
              <div style="font-size: 32px; padding: 20px;">📦</div>
              <div class="dl-info">
                <div>
                  <div class="dl-title">${isYouTube ? 'YouTube Playlist / Album' : 'Danh sách tệp phương tiện'}</div>
                  <div class="dl-author">Đã trích xuất danh sách liên kết thành công.</div>
                </div>
                <div class="dl-buttons" style="flex-wrap: wrap; gap: 8px;">
                  ${pickerHtml}
                </div>
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
              <div style="font-size: 32px; padding: 20px;">📦</div>
              <div class="dl-info">
                <div>
                  <div class="dl-title">${title}</div>
                  <div class="dl-author" style="font-size:12px;opacity:0.7;">📄 ${filename}</div>
                </div>
                <div class="dl-buttons">
                  <button class="dl-btn dl-btn--video" id="btnStartDownload">
                    📥 Bắt đầu tải xuống
                  </button>
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
      }
    } catch (err) {
      console.warn(`[Cobalt instance ${instance} failed]`, err);
    }
  }

  // Fallback helper links if both APIs fail
  const cleanUrl = encodeURIComponent(url);
  resultDiv.innerHTML = `
    <div class="dl-result-card" style="border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.03);">
      <div style="font-size: 32px; padding: 20px;">⚠️</div>
      <div class="dl-info">
        <div>
          <div class="dl-title" style="color: var(--accent-yellow);">Máy chủ bận / Định dạng cần chuyển hướng</div>
          <div class="dl-author">Không thể tự động giải mã link trực tiếp. Bạn có thể sử dụng các cổng tải chất lượng cao miễn phí sau:</div>
        </div>
        <div class="dl-buttons">
          <a class="dl-btn dl-btn--fallback" href="https://9xbuddy.xyz/process?url=${cleanUrl}" target="_blank">
            🚀 Tải qua 9XBuddy
          </a>
          <a class="dl-btn dl-btn--fallback" href="https://savefrom.net/?url=${cleanUrl}" target="_blank">
            🌐 Tải qua SaveFrom
          </a>
          ${isYouTube ? `
            <a class="dl-btn dl-btn--fallback" href="https://y2mate.is/analyze?url=${cleanUrl}" target="_blank">
              📺 Tải qua Y2Mate
            </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Register global helper so inline onclick handlers in picker work
window._dlBlob = blobDownload;
