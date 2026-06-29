/* ── File Tools Component ── */

let activeImageFile = null;
let activeZipFiles = [];
let jszipLoaded = false;

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function renderFileTools() {
  const container = document.getElementById('fileToolsContent');
  if (!container) return;

  container.innerHTML = `
    <div class="ft-wrap">
      <div class="ft-row-grid">
        <!-- Image Converter & Compressor -->
        <div class="ft-box">
 <div class="travel-title-sub">Nén &amp; Chuyển Đổi Ảnh</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
            Chuyển đổi giữa PNG, JPG, WebP và giảm dung lượng trực quan (Canvas client-side).
          </div>
          
          <input type="file" id="imageFileInput" accept="image/*" style="display:none;" />
          <div class="ft-dropzone" id="imageDropzone">
 <span class="ft-dropzone-icon">️</span>
            <span class="ft-dropzone-text" id="imageDropzoneText">Chọn hoặc Kéo thả ảnh vào đây</span>
            <span class="ft-dropzone-sub">Hỗ trợ PNG, JPG, WebP, SVG</span>
          </div>

          <div class="ft-settings" style="display:none;" id="imageSettingsBox">
            <div class="travel-select-wrap">
              <label>Định dạng đích</label>
              <select id="imageFormatSelect" class="field-input">
                <option value="image/jpeg">JPEG (.jpg)</option>
                <option value="image/png">PNG (.png)</option>
                <option value="image/webp" selected>WebP (.webp)</option>
              </select>
            </div>
            <div class="travel-select-wrap" id="qualityWrapper">
              <label>Chất lượng nén</label>
              <div class="ft-slider-wrap">
                <input type="range" id="imageQualitySlider" class="ft-slider" min="10" max="100" value="80" />
                <span class="ft-slider-val" id="imageQualityVal">80%</span>
              </div>
            </div>
            
            <div class="ft-compare-box" id="imageCompareBox" style="display:none;">
              <div class="ft-compare-row">
                <span>Dung lượng gốc:</span>
                <span class="ft-compare-val" id="imgSizeOriginal">0 KB</span>
              </div>
              <div class="ft-compare-row" style="color: #34d399;">
                <span>Dung lượng ước tính:</span>
                <span class="ft-compare-val" id="imgSizeCompressed">0 KB</span>
              </div>
              <div class="ft-compare-row" id="imgReductionRow" style="font-weight:700; color:#34d399;">
                <span>Tiết kiệm:</span>
                <span class="ft-compare-val" id="imgReductionVal">0%</span>
              </div>
            </div>

            <button id="btnConvertImage" class="btn-primary" style="margin-top: 6px;">
 Nén &amp; Tải ảnh về
            </button>
          </div>
        </div>

        <!-- ZIP Archiver -->
        <div class="ft-box">
 <div class="travel-title-sub">Nén nhiều File thành ZIP</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
            Gom nhiều tệp tin bất kỳ thành một file nén .zip duy nhất (chạy hoàn toàn cục bộ).
          </div>

          <input type="file" id="zipFileInput" multiple style="display:none;" />
          <div class="ft-dropzone" id="zipDropzone">
 <span class="ft-dropzone-icon"></span>
            <span class="ft-dropzone-text">Chọn hoặc Kéo thả nhiều tệp vào đây</span>
            <span class="ft-dropzone-sub">Thêm nhiều tệp tin bất kỳ</span>
          </div>

          <div class="ft-settings" id="zipFilesBox" style="display:none; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="travel-title-sub" style="font-size:11px; color:var(--text-muted); margin-bottom: 8px;">Tệp đã chọn:</div>
              <div class="ft-file-list" id="zipFileList"></div>
            </div>
            <button id="btnCreateZip" class="btn-primary" style="margin-top: 14px;">
 Gom &amp; Tải file ZIP
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // IMAGE EVENTS
  const imgFileInput = document.getElementById('imageFileInput');
  const imgDropzone = document.getElementById('imageDropzone');
  const imgFormat = document.getElementById('imageFormatSelect');
  const imgSlider = document.getElementById('imageQualitySlider');
  const imgSliderVal = document.getElementById('imageQualityVal');
  const btnConvert = document.getElementById('btnConvertImage');
  const imgQualityWrapper = document.getElementById('qualityWrapper');

  imgDropzone.addEventListener('click', () => imgFileInput.click());
  imgFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleImageSelect(e.target.files[0]);
  });

  // Drag and drop image
  imgDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imgDropzone.style.borderColor = 'var(--accent-blue)';
  });
  imgDropzone.addEventListener('dragleave', () => {
    imgDropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
  });
  imgDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    imgDropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    if (e.dataTransfer.files.length) handleImageSelect(e.dataTransfer.files[0]);
  });

  imgSlider.addEventListener('input', () => {
    imgSliderVal.textContent = imgSlider.value + '%';
    if (activeImageFile) calculateEstimateSize();
  });

  imgFormat.addEventListener('change', () => {
    // PNG doesn't support quality compression in Canvas.toDataURL, so hide slider
    if (imgFormat.value === 'image/png') {
      imgQualityWrapper.style.display = 'none';
    } else {
      imgQualityWrapper.style.display = 'block';
    }
    if (activeImageFile) calculateEstimateSize();
  });

  btnConvert.addEventListener('click', processAndDownloadImage);

  // ZIP EVENTS
  const zipFileInput = document.getElementById('zipFileInput');
  const zipDropzone = document.getElementById('zipDropzone');
  const btnZip = document.getElementById('btnCreateZip');

  zipDropzone.addEventListener('click', () => zipFileInput.click());
  zipFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleZipAdd(e.target.files);
  });

  zipDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zipDropzone.style.borderColor = 'var(--accent-blue)';
  });
  zipDropzone.addEventListener('dragleave', () => {
    zipDropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
  });
  zipDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    zipDropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    if (e.dataTransfer.files.length) handleZipAdd(e.dataTransfer.files);
  });

  btnZip.addEventListener('click', createAndDownloadZip);
}

// Image processing logic
function handleImageSelect(file) {
  if (!file.type.startsWith('image/')) {
    alert('Vui lòng chọn tệp tin hình ảnh!');
    return;
  }

  activeImageFile = file;
  document.getElementById('imageDropzoneText').textContent = file.name;
  document.getElementById('imageSettingsBox').style.display = 'flex';
  document.getElementById('imageCompareBox').style.display = 'block';
  document.getElementById('imgSizeOriginal').textContent = formatBytes(file.size);

  calculateEstimateSize();
}

function calculateEstimateSize() {
  const imgFormat = document.getElementById('imageFormatSelect').value;
  const imgSlider = document.getElementById('imageQualitySlider');
  const compSizeText = document.getElementById('imgSizeCompressed');
  const reductionVal = document.getElementById('imgReductionVal');
  const reductionRow = document.getElementById('imgReductionRow');

  // Load image to Canvas to calculate preview compressed size
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const quality = parseInt(imgSlider.value) / 100;
      const dataUrl = canvas.toDataURL(imgFormat, quality);
      
      // Calculate length of base64 string
      const head = `data:${imgFormat};base64,`.length;
      const approxBytes = Math.round((dataUrl.length - head) * 3 / 4);

      compSizeText.textContent = formatBytes(approxBytes);
      
      const diff = activeImageFile.size - approxBytes;
      if (diff > 0) {
        const percent = Math.round((diff / activeImageFile.size) * 100);
        reductionRow.style.display = 'flex';
        reductionVal.textContent = `${percent}% (Giảm ${formatBytes(diff)})`;
      } else {
        reductionRow.style.display = 'none';
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(activeImageFile);
}

function processAndDownloadImage() {
  if (!activeImageFile) return;

  const imgFormat = document.getElementById('imageFormatSelect').value;
  const imgSlider = document.getElementById('imageQualitySlider');
  const quality = parseInt(imgSlider.value) / 100;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const finalQuality = imgFormat === 'image/png' ? undefined : quality;
      const dataUrl = canvas.toDataURL(imgFormat, finalQuality);

      // Trigger download
      const link = document.createElement('a');
      const ext = imgFormat.split('/')[1] === 'jpeg' ? 'jpg' : imgFormat.split('/')[1];
      const baseName = activeImageFile.name.substring(0, activeImageFile.name.lastIndexOf('.')) || activeImageFile.name;
      
      link.download = `${baseName}_compressed.${ext}`;
      link.href = dataUrl;
      link.click();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(activeImageFile);
}

// ZIP processing logic
function handleZipAdd(files) {
  for (const file of files) {
    // Avoid duplicate names in active files list
    if (!activeZipFiles.some(f => f.name === file.name)) {
      activeZipFiles.push(file);
    }
  }

  renderZipFileList();
}

function renderZipFileList() {
  const box = document.getElementById('zipFilesBox');
  const list = document.getElementById('zipFileList');
  if (!list) return;

  if (activeZipFiles.length === 0) {
    box.style.display = 'none';
    return;
  }

  box.style.display = 'flex';
  list.innerHTML = activeZipFiles.map((file, idx) => `
    <div class="ft-file-item">
      <span class="ft-file-name" title="${file.name}">${file.name}</span>
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="ft-file-size">${formatBytes(file.size)}</span>
 <button class="todo-card-btn delete" style="padding: 2px;" onclick="window.removeZipFile(${idx})"></button>
      </div>
    </div>
  `).join('');
}

window.removeZipFile = function(idx) {
  activeZipFiles.splice(idx, 1);
  renderZipFileList();
};

async function createAndDownloadZip() {
  if (activeZipFiles.length === 0) return;

  const btn = document.getElementById('btnCreateZip');
  btn.disabled = true;
 btn.textContent = 'Đang nén file...';

  // Load JSZip dynamically
  if (!jszipLoaded) {
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js';
      script.onload = () => {
        jszipLoaded = true;
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  try {
    const zip = new window.JSZip();
    
    // Add all files
    activeZipFiles.forEach(file => {
      zip.file(file.name, file);
    });

    // Generate zip blob
    const content = await zip.generateAsync({ type: 'blob' });

    // Download zip
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `archive_${Date.now()}.zip`;
    link.click();

    // Clear list
    activeZipFiles = [];
    renderZipFileList();
  } catch (err) {
    console.error('[ZIP error]', err);
    alert('Không thể tạo file nén ZIP!');
  } finally {
    btn.disabled = false;
 btn.textContent = 'Gom & Tải file ZIP';
  }
}

// ── Audio Converter (client-side via Web Audio API + MediaRecorder) ──────
export function renderAudioTools() {
  const container = document.getElementById('fileToolsContent');
  if (!container) return;

  // Find or create audio section
  let audioBox = document.getElementById('ftAudioBox');
  if (audioBox) return;

  const wrap = container.querySelector('.ft-wrap') || container;
  const box = document.createElement('div');
  box.id = 'ftAudioBox';
  box.className = 'ft-box';
  box.innerHTML = `
 <div class="travel-title-sub">Chuyển Đổi Âm Thanh</div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">
      Chuyển đổi MP3/WAV/OGG/M4A → định dạng khác. Xử lý hoàn toàn trên trình duyệt, không upload lên server.
    </div>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.2);border-radius:8px;padding:8px 12px;font-size:11px;color:var(--accent-yellow);">
 ️ Hỗ trợ: Trình duyệt phải hỗ trợ MediaRecorder & Web Audio API (Chrome/Edge khuyến nghị).
    </div>

    <input type="file" id="audioFileInput" accept="audio/*" style="display:none;" />
    <div class="ft-dropzone" id="audioDropzone">
 <span class="ft-dropzone-icon"></span>
      <span class="ft-dropzone-text" id="audioDropzoneText">Chọn hoặc kéo thả file âm thanh vào đây</span>
      <span class="ft-dropzone-sub">MP3, WAV, OGG, M4A, FLAC, AAC...</span>
    </div>

    <div id="audioSettingsBox" style="display:none;margin-top:12px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
        <div class="travel-select-wrap" style="flex:1;min-width:130px;">
          <label>Định dạng xuất</label>
          <select id="audioFormatSelect" class="field-input">
            <option value="audio/webm;codecs=opus">WebM / Opus (.webm)</option>
            <option value="audio/ogg;codecs=opus">OGG / Opus (.ogg)</option>
            <option value="audio/mp4">MP4 Audio (.m4a)</option>
            <option value="audio/wav">WAV (.wav)</option>
          </select>
        </div>
 <button id="btnConvertAudio" class="btn-primary" style="height:38px;">Chuyển đổi</button>
      </div>
      <div id="audioConvertResult" style="margin-top:10px;"></div>
      <div style="margin-top:8px;font-size:11px;color:var(--text-muted);">
 Để chuyển sang MP3 chính xác hơn, dùng công cụ ngoài: 
        <a href="https://convertio.co/vi/audio-converter/" target="_blank" rel="noopener" style="color:var(--accent-blue);">convertio.co ↗</a> hoặc
        <a href="https://cloudconvert.com/audio-converter" target="_blank" rel="noopener" style="color:var(--accent-blue);">cloudconvert.com ↗</a>
      </div>
    </div>

    <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);">
 <div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:10px;">Công cụ chuyển đổi file nhanh (ngoài)</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
        <a href="https://convertio.co/vi/" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid rgba(96,165,250,0.2);border-radius:8px;text-decoration:none;background:rgba(96,165,250,0.05);font-size:11px;color:var(--text-primary);transition:all .2s;" class="ft-ext-link">
 <span style="font-size:18px;"></span><div><div style="font-weight:700;font-size:11px;">Convertio</div><div style="color:var(--text-muted);font-size:10px;">300+ định dạng file</div></div>
        </a>
        <a href="https://cloudconvert.com/" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid rgba(167,139,250,0.2);border-radius:8px;text-decoration:none;background:rgba(167,139,250,0.05);font-size:11px;color:var(--text-primary);transition:all .2s;" class="ft-ext-link">
 <span style="font-size:18px;">️</span><div><div style="font-weight:700;font-size:11px;">CloudConvert</div><div style="color:var(--text-muted);font-size:10px;">Video, Audio, Docs</div></div>
        </a>
        <a href="https://www.ilovepdf.com/vi" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid rgba(248,113,113,0.2);border-radius:8px;text-decoration:none;background:rgba(248,113,113,0.05);font-size:11px;color:var(--text-primary);transition:all .2s;" class="ft-ext-link">
 <span style="font-size:18px;"></span><div><div style="font-weight:700;font-size:11px;">iLovePDF</div><div style="color:var(--text-muted);font-size:10px;">PDF, Word, PPT, Excel</div></div>
        </a>
        <a href="https://smallpdf.com/vi" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid rgba(52,211,153,0.2);border-radius:8px;text-decoration:none;background:rgba(52,211,153,0.05);font-size:11px;color:var(--text-primary);transition:all .2s;" class="ft-ext-link">
 <span style="font-size:18px;"></span><div><div style="font-weight:700;font-size:11px;">SmallPDF</div><div style="color:var(--text-muted);font-size:10px;">Nén & chuyển PDF</div></div>
        </a>
        <a href="https://online-audio-converter.com/" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid rgba(251,191,36,0.2);border-radius:8px;text-decoration:none;background:rgba(251,191,36,0.05);font-size:11px;color:var(--text-primary);transition:all .2s;" class="ft-ext-link">
 <span style="font-size:18px;"></span><div><div style="font-weight:700;font-size:11px;">Audio Converter</div><div style="color:var(--text-muted);font-size:10px;">MP3, WAV, OGG, FLAC...</div></div>
        </a>
        <a href="https://handbrake.fr/" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid rgba(251,146,60,0.2);border-radius:8px;text-decoration:none;background:rgba(251,146,60,0.05);font-size:11px;color:var(--text-primary);transition:all .2s;" class="ft-ext-link">
 <span style="font-size:18px;"></span><div><div style="font-weight:700;font-size:11px;">HandBrake</div><div style="color:var(--text-muted);font-size:10px;">Video encoder miễn phí</div></div>
        </a>
      </div>
    </div>`;

  const grid = wrap.querySelector('.ft-row-grid');
  if (grid) grid.appendChild(box);
  else wrap.appendChild(box);

  // Dropzone logic
  const audioInput = document.getElementById('audioFileInput');
  const audioDropzone = document.getElementById('audioDropzone');
  let activeAudioFile = null;

  audioDropzone.addEventListener('click', () => audioInput.click());
  audioDropzone.addEventListener('dragover', e => { e.preventDefault(); audioDropzone.classList.add('ft-dropzone--active'); });
  audioDropzone.addEventListener('dragleave', () => audioDropzone.classList.remove('ft-dropzone--active'));
  audioDropzone.addEventListener('drop', e => {
    e.preventDefault(); audioDropzone.classList.remove('ft-dropzone--active');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) loadAudioFile(file);
  });
  audioInput.addEventListener('change', () => {
    if (audioInput.files[0]) loadAudioFile(audioInput.files[0]);
  });

  function loadAudioFile(file) {
    activeAudioFile = file;
 document.getElementById('audioDropzoneText').textContent = `${file.name} (${(file.size/1048576).toFixed(2)} MB)`;
    document.getElementById('audioSettingsBox').style.display = '';
    document.getElementById('audioConvertResult').innerHTML = '';
  }

  document.getElementById('btnConvertAudio').addEventListener('click', async () => {
    if (!activeAudioFile) return;
    const resultEl = document.getElementById('audioConvertResult');
    const mimeType = document.getElementById('audioFormatSelect').value;
    const extMap = { 'audio/webm;codecs=opus':'webm','audio/ogg;codecs=opus':'ogg','audio/mp4':'m4a','audio/wav':'wav' };
    const ext = extMap[mimeType] || 'webm';
    const outName = activeAudioFile.name.replace(/\.[^.]+$/, '') + '_converted.' + ext;

    resultEl.innerHTML = `<div style="color:var(--text-muted);font-size:12px;">⏳ Đang xử lý âm thanh...</div>`;

    try {
      // Use Web Audio API to decode then re-encode via MediaRecorder
      const arrayBuf = await activeAudioFile.arrayBuffer();
      const ctx = new AudioContext();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);

      const stream = ctx.createMediaStreamDestination();
      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.connect(stream);

      const chunks = [];
      const supported = MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'audio/webm';
      const recorder = new MediaRecorder(stream.stream, { mimeType: supported });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: supported });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = outName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        ctx.close();
 resultEl.innerHTML = `<div style="color:#4ade80;font-size:12px;">Đã xuất: <strong>${outName}</strong> (${(blob.size/1048576).toFixed(2)} MB)</div>`;
      };

      recorder.start();
      source.start(0);
      source.onended = () => recorder.stop();
    } catch (err) {
 resultEl.innerHTML = `<div style="color:#f87171;font-size:12px;">Lỗi: ${err.message}. Thử dùng CloudConvert bên dưới.</div>`;
    }
  });
}
