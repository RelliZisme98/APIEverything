/**
 * components/ai-assistant.js
 * Floating AI Assistant widget with voice recognition (Web Speech API)
 * and Cloudflare Workers AI integration.
 */

import { state } from '../store/state.js';
import { solarToLunar, canChiYear } from '../utils/lunar-calendar.js';

let isChatOpen = false;
let chatHistory = []; // Keep track of conversation history

export function initAIAssistant() {
  // 1. Inject stylesheet dynamically
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/ai-assistant.css';
  document.head.appendChild(link);

  // 2. Create Chat elements
  const widget = document.createElement('div');
  widget.id = 'aiWidgetContainer';
  widget.innerHTML = `
    <!-- Floating Bubble -->
    <button id="aiBubble" class="ai-bubble show-tooltip" title="Trò chuyện với Trợ lý AI">
      <div class="ai-bubble-inner">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ai-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </div>
      <span class="ai-bubble-pulse"></span>
    </button>

    <!-- Chat Box -->
    <div id="aiChatBox" class="ai-chatbox">
      <div class="ai-chatbox-header">
        <div class="ai-chatbox-title">
          <div class="ai-status-dot"></div>
          <strong>Trợ Lý AI</strong>
        </div>
        <button id="aiChatClose" class="ai-chat-close">✕</button>
      </div>
      
      <div id="aiChatBody" class="ai-chatbox-body">
        <div class="ai-msg ai-msg--system">
          Xin chào! Tôi là trợ lý ảo của Dashboard. Hãy hỏi tôi bất kỳ thông tin gì về thời tiết, chất lượng không khí (AQI), giá xăng, giá vàng, chứng khoán hay tỉ số bóng đá trực tiếp hôm nay nhé! 🤖
        </div>
      </div>

      <div class="ai-chatbox-footer">
        <input type="text" id="aiInput" placeholder="Hỏi tôi bất cứ điều gì..." autocomplete="off" />
        <button id="aiMicBtn" class="ai-footer-btn ai-mic-btn" title="Nói để nhập liệu">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mic-icon"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
        </button>
        <button id="aiSendBtn" class="ai-footer-btn ai-send-btn" title="Gửi">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="send-icon"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  // 3. Register Event Listeners
  const bubble = document.getElementById('aiBubble');
  const closeBtn = document.getElementById('aiChatClose');
  const sendBtn = document.getElementById('aiSendBtn');
  const micBtn = document.getElementById('aiMicBtn');
  const input = document.getElementById('aiInput');

  bubble.addEventListener('click', () => toggleChat());
  closeBtn.addEventListener('click', () => toggleChat(false));
  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
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
  }
}

async function handleSend() {
  const input = document.getElementById('aiInput');
  const text = input.value.trim();
  if (!text) return;

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
  }
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
