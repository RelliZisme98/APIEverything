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
        resultDiv.innerHTML = `
          <div class="dl-result-card">
            <img class="dl-thumbnail" src="${d.cover}" alt="Thumbnail" />
            <div class="dl-info">
              <div>
                <div class="dl-title">${d.title || 'Video TikTok'}</div>
                <div class="dl-author">👤 Kênh: @${d.author.unique_id} (${d.author.nickname})</div>
              </div>
              <div class="dl-buttons">
                <a class="dl-btn dl-btn--video" href="${d.play}" target="_blank" download="tiktok_video.mp4">
                  📥 Tải Video (Không Logo)
                </a>
                ${d.music ? `
                  <a class="dl-btn dl-btn--audio" href="${d.music}" target="_blank" download="tiktok_audio.mp3">
                    🎵 Tải Nhạc Nền (MP3)
                  </a>
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

  // Generic/YouTube/Fallback Downloader using Cobalt API directly from the browser (bypasses CF Worker datacenter IP block)
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
        body: JSON.stringify({
          url: url
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Support Cobalt v10 Picker/Slideshow
        if (data.status === 'picker' && Array.isArray(data.picker)) {
          let pickerHtml = '';
          data.picker.forEach((item, idx) => {
            const typeLabel = item.type === 'photo' ? 'Ảnh' : item.type === 'audio' ? 'Âm thanh' : 'Video';
            const btnClass = item.type === 'audio' ? 'dl-btn dl-btn--audio' : 'dl-btn dl-btn--video';
            pickerHtml += `
              <a class="${btnClass}" href="${item.url}" target="_blank" style="margin-top: 5px; font-size: 12px; padding: 6px 12px; display: inline-flex; align-items: center; justify-content: center;">
                📥 Tải ${typeLabel} ${idx + 1}
              </a>
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
          const text = isYouTube ? 'YouTube Video' : 'Video Phương Tiện';

          resultDiv.innerHTML = `
            <div class="dl-result-card">
              <div style="font-size: 32px; padding: 20px;">📦</div>
              <div class="dl-info">
                <div>
                  <div class="dl-title">${text}</div>
                  <div class="dl-author">Liên kết trích xuất thành công qua máy chủ tải xuống.</div>
                </div>
                <div class="dl-buttons">
                  <a class="dl-btn dl-btn--video" href="${downloadUrl}" target="_blank">
                    📥 Click Tải Xuống Ngay (MP4/MP3)
                  </a>
                </div>
              </div>
            </div>
          `;
          return;
        }
      }
    } catch (err) {
      console.warn(`[Cobalt instance ${instance} failed]`, err);
    }
  }

  // Fallback Helper Links if both APIs fail or for other unsupported formats
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
