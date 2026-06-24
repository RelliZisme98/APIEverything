/**
 * components/ai-assistant.js
 * Floating AI Assistant widget with voice recognition (Web Speech API)
 * and Cloudflare Workers AI integration.
 */

import { state } from '../store/state.js';
import { solarToLunar, canChiYear } from '../utils/lunar-calendar.js';

let isChatOpen = false;
let chatHistory = []; // Keep track of conversation history
let isMuted = localStorage.getItem('ai_muted') === 'true';

let voices = [];
let currentAudio = null;
let audioQueue = [];
let currentQueueIndex = 0;

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  audioQueue = [];
  currentQueueIndex = 0;
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function loadVoices() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    voices = window.speechSynthesis.getVoices();
  }
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

export function initAIAssistant() {
  // 1. Inject stylesheet dynamically
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/ai-assistant.css?v=1.0.4';
  document.head.appendChild(link);

  // 2. Create Chat elements
  const widget = document.createElement('div');
  widget.id = 'aiWidgetContainer';
  widget.innerHTML = `
    <!-- Floating Bubble -->
    <button type="button" id="aiBubble" class="ai-bubble show-tooltip" title="Trò chuyện với Robot Trợ lý AI">
      <div class="ai-bubble-inner">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ai-icon">
          <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
          <circle cx="8" cy="16" r="1.5"></circle>
          <circle cx="16" cy="16" r="1.5"></circle>
          <line x1="10" y1="19" x2="14" y2="19"></line>
          <path d="M12 6V11"></path>
          <circle cx="12" cy="4" r="2"></circle>
          <path d="M2 15h1"></path>
          <path d="M21 15h1"></path>
        </svg>
      </div>
      <span class="ai-bubble-pulse"></span>
    </button>
 
    <!-- Chat Box -->
    <div id="aiChatBox" class="ai-chatbox">
      <div class="ai-chatbox-header">
        <div class="ai-chatbox-title">
          <div class="ai-status-dot"></div>
          <strong>🤖 Robot Trợ Lý AI</strong>
        </div>
        <div class="ai-chatbox-actions">
          <button type="button" id="aiMuteBtn" class="ai-mute-btn" title="Bật/Tắt giọng nói Robot">${isMuted ? '🔇' : '🔊'}</button>
          <button type="button" id="aiChatClose" class="ai-chat-close">✕</button>
        </div>
      </div>
      
      <div id="aiChatBody" class="ai-chatbox-body">
        <div class="ai-msg ai-msg--system">
          Xin chào! Tôi là Robot trợ lý ảo của Dashboard. Hãy hỏi tôi bất kỳ thông tin gì về thời tiết, chất lượng không khí (AQI), giá xăng, giá vàng, chứng khoán hay tỉ số bóng đá trực tiếp hôm nay nhé! 🤖
        </div>
      </div>
 
      <div class="ai-chatbox-footer">
        <input type="text" id="aiInput" placeholder="Hỏi tôi bất cứ điều gì..." autocomplete="off" />
        <button type="button" id="aiMicBtn" class="ai-footer-btn ai-mic-btn" title="Nói để nhập liệu">
          <svg style="pointer-events: none;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mic-icon"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
        </button>
        <button type="button" id="aiSendBtn" class="ai-footer-btn ai-send-btn" title="Gửi">
          <svg style="pointer-events: none;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="send-icon"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  // 3. Register Event Listeners
  const bubble = document.getElementById('aiBubble');
  const closeBtn = document.getElementById('aiChatClose');
  const muteBtn = document.getElementById('aiMuteBtn');
  const sendBtn = document.getElementById('aiSendBtn');
  const micBtn = document.getElementById('aiMicBtn');
  const input = document.getElementById('aiInput');

  bubble.addEventListener('click', (e) => { e.preventDefault(); toggleChat(); });
  closeBtn.addEventListener('click', (e) => { e.preventDefault(); toggleChat(false); });
  muteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isMuted = !isMuted;
    localStorage.setItem('ai_muted', isMuted);
    muteBtn.innerHTML = isMuted ? '🔇' : '🔊';
    if (isMuted) {
      stopAudio();
    }
  });
  
  // Register click & pointerdown to bypass mouse/touch event interception on PCs
  const onSendTrigger = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    handleSend(e);
  };
  sendBtn.addEventListener('click', onSendTrigger);
  sendBtn.addEventListener('pointerdown', onSendTrigger);

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend(e);
    }
  });

  // 4. Voice typing using Web Speech API
  let recognition = null;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      stopAudio();
      micBtn.classList.add('recording');
      input.placeholder = 'Đang lắng nghe...';
    };

    recognition.onend = () => {
      micBtn.classList.remove('recording');
      input.placeholder = 'Hỏi tôi bất cứ điều gì...';
    };

    recognition.onerror = (event) => {
      console.error('[Speech Recognition Error]', event.error);
      micBtn.classList.remove('recording');
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      input.value = text;
      handleSend(); // Auto-send
    };

    micBtn.addEventListener('click', () => {
      if (micBtn.classList.contains('recording')) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  } else {
    // Disable mic button if speech recognition is not supported
    micBtn.style.display = 'none';
  }

  // Remove tooltip after 10 seconds
  setTimeout(() => {
    const bubble = document.getElementById('aiBubble');
    if (bubble) bubble.classList.remove('show-tooltip');
  }, 10000);

  // Auto-open chatbox after 500ms so the user is greeted by the robot directly
  setTimeout(() => {
    toggleChat(true);
  }, 500);
}

function toggleChat(forceState) {
  isChatOpen = typeof forceState === 'boolean' ? forceState : !isChatOpen;
  const chatBox = document.getElementById('aiChatBox');
  const bubble = document.getElementById('aiBubble');
  if (bubble) bubble.classList.remove('show-tooltip');
  if (isChatOpen) {
    chatBox.classList.add('open');
    bubble.classList.add('active');
    document.getElementById('aiInput').focus();
  } else {
    chatBox.classList.remove('open');
    bubble.classList.remove('active');
    stopAudio();
  }
}

let isSending = false;
async function handleSend(e) {
  stopAudio();
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  if (isSending) return;

  const input = document.getElementById('aiInput');
  const text = input.value.trim();
  if (!text) return;

  isSending = true;
  // Append user message
  appendMessage(text, 'user');
  input.value = '';

  // Append typing loading message
  const typingId = appendTypingIndicator();

  // Build Context for RAG
  let lunarText = null;
  try {
    const now = new Date();
    const lunar = solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear());
    const canchi = canChiYear(lunar.year);
    lunarText = `${lunar.day}/${lunar.month} âm lịch (${canchi})`;
  } catch (e) {
    console.warn('[AI Assistant] Lunar Calendar calculation error:', e);
  }

  const context = {
    weather: state.weatherData ? {
      city: state.weatherData.name,
      temp: state.weatherData.main?.temp,
      desc: state.weatherData.weather?.[0]?.description,
      forecast: state.weatherForecast?.daily ? state.weatherForecast.daily.map(d => ({
        date: d.date,
        tempMax: d.tempMax,
        tempMin: d.tempMin,
        desc: d.desc,
        pop: d.pop
      })) : null
    } : null,
    aqi: state.aqiData ? {
      city: state.aqiData.city,
      aqi: state.aqiData.aqi,
      label: state.aqiData.label
    } : null,
    gas: state.gasData ? {
      prices: state.gasData.prices?.slice(0, 3), // Petrolimex RON 95, E5, Diesel
      date: state.gasData.priceDate
    } : null,
    gold: state.goldData ? {
      price: state.goldData.price,
      sjc: state.goldData.vnPrices?.VNGSJC || state.goldData.vnPrices?.SJL1L10
    } : null,
    vnindex: state.vnindexData ? state.vnindexData.indices : null,
    liveFootball: state.liveFootballMatches ? state.liveFootballMatches : null,
    footballMatches: state.footballData || [],
    powerOutages: state.powerOutageData || [],
    lunarCalendar: lunarText,
    lottery: state.lotteryData ? state.lotteryData : null,
    vietlott: state.vietlottData ? state.vietlottData : null,
    crypto: state.cryptoData ? state.cryptoData.slice(0, 10).map(c => ({ name: c.name, symbol: c.symbol, price: c.current_price, change: c.price_change_percentage_24h })) : [],
    exchangeRates: state.fxData ? state.fxData.slice(0, 10) : [],
    vcbRates: state.vcbRatesData ? state.vcbRatesData : null,
    news: state.newsArticles ? state.newsArticles.slice(0, 5) : [],
    todos: state.todoTasks ? state.todoTasks : [],
    movies: state.moviesData ? state.moviesData : [],
    games: state.gamesData ? state.gamesData : [],
    upcomingEvents: state.upcomingEvents || [],
    flightSchedules: state.flightSchedules || null
  };

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: text,
        context,
        history: chatHistory
      })
    });

    removeTypingIndicator(typingId);

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Server error');
    }

    const data = await res.json();
    appendMessage(data.response, 'assistant');
    speakText(data.response);

    // Update history
    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'assistant', content: data.response });

    // Limit history length to save token budget
    if (chatHistory.length > 12) {
      chatHistory = chatHistory.slice(-12);
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    appendMessage(`⚠️ Lỗi: Không thể kết nối với Trợ lý AI (${err.message})`, 'system');
  } finally {
    isSending = false;
  }
}
window.handleSend = handleSend;

function speakText(text) {
  if (isMuted) return;

  stopAudio();

  // Clean markdown syntax and emojis to ensure smooth speech synthesis
  let cleanText = text
    .replace(/\*\*([\s\S]*?)\*\*/g, '$1') // remove bold asterisks
    .replace(/[-*#`_]/g, ' ')               // remove bullet dashes, headers, inline code, underscores
    .replace(/[🤖🌤️🌦️⛈️☀️❄️💨🌫️🎈📉📈⚽🎟️🇻🇳🏆⭐⚠️🔴😊😂🤣😍👍👋]/gu, '') // remove common emojis
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  // Split into manageable chunks for Google Translate API limits (~200 chars)
  const chunks = splitTextIntoChunks(cleanText, 180);
  playAudioChunks(chunks, cleanText);
}

function splitTextIntoChunks(text, maxLength) {
  const chunks = [];
  let currentChunk = '';
  
  // Split by words to avoid cutting words in half
  const words = text.split(' ');
  for (const word of words) {
    if ((currentChunk + ' ' + word).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = word;
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + word : word;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

function playAudioChunks(chunks, fullText) {
  audioQueue = chunks;
  currentQueueIndex = 0;
  
  // If no chunks, fallback
  if (chunks.length === 0) {
     speakTextNative(fullText);
     return;
  }
  playNextChunk(fullText);
}

function playNextChunk(fullText) {
  if (isMuted) return;
  if (currentQueueIndex >= audioQueue.length) {
    currentAudio = null;
    return;
  }

  const textToPlay = audioQueue[currentQueueIndex];

  // ╔═ CORE FIX: Route through /api/tts Cloudflare Worker proxy ═╗
  // The Worker fetches Google Translate TTS server-side (no CORS),
  // then streams back a real Vietnamese MP3 to the browser.
  // This guarantees a natural Vietnamese voice on every device/OS.
  const url = `/api/tts?text=${encodeURIComponent(textToPlay)}`;

  currentAudio = new Audio(url);
  currentAudio.onended = () => {
    currentQueueIndex++;
    playNextChunk(fullText);
  };
  currentAudio.onerror = (e) => {
    console.warn('[AI TTS] Proxy error, falling back to native TTS.', e);
    stopAudio();
    speakTextNative(fullText);
  };
  currentAudio.play().catch(err => {
    console.warn('[AI TTS] play() blocked (autoplay policy), falling back to native TTS.', err);
    stopAudio();
    speakTextNative(fullText);
  });
}

function speakTextNative(cleanText) {
  if (isMuted) return;
  if (!window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'vi-VN';

  // Load voices if not cached yet
  if (!voices || voices.length === 0) {
    loadVoices();
  }

  // Find a Vietnamese voice: starts with 'vi' (e.g. vi-VN, vi)
  let viVoice = voices.find(voice => {
    const l = voice.lang.toLowerCase();
    return l.startsWith('vi-') || l === 'vi';
  });

  // Fallback search: name contains "vietnamese" or "việt"
  if (!viVoice) {
    viVoice = voices.find(voice => {
      const n = voice.name.toLowerCase();
      return n.includes('vietnamese') || n.includes('việt');
    });
  }

  if (viVoice) {
    utterance.voice = viVoice;
    utterance.lang = viVoice.lang;
  }

  // Optimize speech speed/pitch for natural communication
  utterance.rate = 1.05; 
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}

function formatMarkdown(text) {
  if (!text) return '';
  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');

  // Convert line breaks and bullet list items
  const lines = html.split('\n');
  let inList = false;
  let result = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        result.push('<ul class="ai-list">');
        inList = true;
      }
      const itemContent = trimmed.substring(2);
      result.push(`<li>${itemContent}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (trimmed) {
        result.push(`<p>${line}</p>`);
      } else {
        result.push('<br/>');
      }
    }
  }
  if (inList) {
    result.push('</ul>');
  }

  return result.join('\n');
}

function appendMessage(text, role) {
  const body = document.getElementById('aiChatBody');
  const msg = document.createElement('div');
  msg.className = `ai-msg ai-msg--${role}`;
  if (role === 'user' || role === 'system') {
    msg.textContent = text;
  } else {
    msg.innerHTML = formatMarkdown(text);
  }
  body.appendChild(msg);
  body.scrollTop = body.scrollHeight;
}

function appendTypingIndicator() {
  const body = document.getElementById('aiChatBody');
  const indicator = document.createElement('div');
  const id = 'typing_' + Date.now();
  indicator.id = id;
  indicator.className = 'ai-msg ai-msg--assistant ai-typing-indicator';
  indicator.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;
  body.appendChild(indicator);
  body.scrollTop = body.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
