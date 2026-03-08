(function () {
  'use strict';

  var PRODUCTION_API = 'https://ai-chat-service-nls9.onrender.com';
  var CALL_API = 'https://ai-chat-service-nls9.onrender.com';

  var scriptEl = document.currentScript;
  var dataApi = scriptEl ? scriptEl.getAttribute('data-api') : null;
  var API_BASE = dataApi !== null ? dataApi : PRODUCTION_API;

  var sessionId = null;
  var chatOpened = false;
  var inputDisabled = false;
  var widgetReady = false;

  // ── Voice state ─────────────────────────────────────
  var isRecording = false;
  var recognition = null;
  var ttsEnabled = true;
  var currentAudio = null;

  // ── CSS ──────────────────────────────────────────────
  var css = `
  #ew-chat-toggle{
    position:fixed;bottom:24px;right:24px;z-index:10001;
    width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;
    background:linear-gradient(135deg,#00A988 0%,#007a63 100%);
    box-shadow:0 4px 20px rgba(0,169,136,.35);
    display:flex;align-items:center;justify-content:center;
    transition:transform .25s ease,box-shadow .25s ease;
  }
  #ew-chat-toggle:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,169,136,.45);}
  #ew-chat-toggle svg{width:28px;height:28px;fill:#fff;transition:transform .3s ease;}
  #ew-chat-toggle.ew-open svg.ew-ico-chat{display:none;}
  #ew-chat-toggle.ew-open svg.ew-ico-close{display:block;}
  #ew-chat-toggle:not(.ew-open) svg.ew-ico-close{display:none;}

  #ew-chat-badge{
    position:absolute;top:-2px;right:-2px;
    width:18px;height:18px;border-radius:50%;
    background:#B8973E;border:2px solid #fff;
    display:none;
  }
  #ew-chat-toggle.ew-has-badge #ew-chat-badge{display:block;}

  #ew-chat-box{
    position:fixed;bottom:96px;right:24px;z-index:10000;
    width:380px;max-width:calc(100vw - 32px);
    height:520px;max-height:calc(100vh - 130px);
    border-radius:20px;overflow:hidden;
    background:#fff;
    box-shadow:0 12px 48px rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.04);
    display:flex;flex-direction:column;
    transform:scale(.92) translateY(20px);opacity:0;pointer-events:none;
    transition:transform .3s cubic-bezier(.4,0,.2,1),opacity .3s ease;
  }
  #ew-chat-box.ew-visible{
    transform:scale(1) translateY(0);opacity:1;pointer-events:auto;
  }

  .ew-header{
    background:linear-gradient(135deg,#0D1B2A 0%,#1C2B3A 100%);
    padding:16px 20px;color:#fff;flex-shrink:0;
    display:flex;align-items:center;gap:12px;
  }
  .ew-header-avatar{
    width:42px;height:42px;border-radius:50%;flex-shrink:0;
    overflow:hidden;background:#1C2B3A;
    border:2px solid rgba(0,169,136,.4);
  }
  .ew-header-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
  .ew-header-info{flex:1;min-width:0;}
  .ew-header-name{font-family:'Montserrat',sans-serif;font-weight:700;font-size:15px;}
  .ew-header-status{font-size:11px;color:rgba(255,255,255,.6);margin-top:1px;}
  .ew-header-actions{display:flex;gap:6px;}
  .ew-header-btn{
    background:rgba(255,255,255,.12);border:none;border-radius:8px;
    width:32px;height:32px;cursor:pointer;display:flex;
    align-items:center;justify-content:center;transition:background .2s;
  }
  .ew-header-btn:hover{background:rgba(255,255,255,.22);}
  .ew-header-btn svg{width:16px;height:16px;fill:#fff;}
  .ew-header-btn.ew-muted svg{fill:rgba(255,255,255,.4);}

  .ew-messages{
    flex:1;overflow-y:auto;padding:20px 16px;
    display:flex;flex-direction:column;gap:12px;
    background:#F8F7F4;
    -webkit-overflow-scrolling:touch;
  }
  .ew-messages::-webkit-scrollbar{width:5px;}
  .ew-messages::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px;}

  .ew-msg{max-width:82%;animation:ew-fadeIn .3s ease both;}
  .ew-msg-bot{align-self:flex-start;}
  .ew-msg-user{align-self:flex-end;}
  .ew-msg-form{align-self:flex-start;max-width:94%;}
  .ew-msg-call{align-self:flex-start;max-width:94%;}

  .ew-msg-bot .ew-bubble{
    background:#fff;color:#1a1a2e;
    border-radius:2px 16px 16px 16px;
    padding:12px 16px;font-size:14px;line-height:1.65;
    box-shadow:0 1px 4px rgba(0,0,0,.06);
    font-family:'Montserrat',sans-serif;font-weight:400;
  }
  .ew-msg-user .ew-bubble{
    background:linear-gradient(135deg,#00A988 0%,#007a63 100%);
    color:#fff;
    border-radius:16px 2px 16px 16px;
    padding:12px 16px;font-size:14px;line-height:1.65;
    font-family:'Montserrat',sans-serif;font-weight:400;
  }

  .ew-msg-bot .ew-bubble.ew-success{
    border-left:3px solid #00A988;
    background:#e6f7f4;
  }
  .ew-msg-bot .ew-bubble.ew-error{
    border-left:3px solid #e74c3c;
    background:#fdf0ef;
  }

  .ew-typing{align-self:flex-start;display:none;}
  .ew-typing .ew-bubble{display:flex;gap:5px;padding:14px 20px;}
  .ew-typing .ew-dot{
    width:7px;height:7px;border-radius:50%;background:#aaa;
    animation:ew-bounce 1.2s infinite ease-in-out;
  }
  .ew-typing .ew-dot:nth-child(2){animation-delay:.15s;}
  .ew-typing .ew-dot:nth-child(3){animation-delay:.3s;}

  .ew-input-bar{
    padding:10px 12px;background:#fff;
    border-top:1px solid #F0EDE8;flex-shrink:0;
    display:flex;gap:6px;align-items:center;
  }
  .ew-input-bar input{
    flex:1;min-width:0;border:1.5px solid #F0EDE8;border-radius:12px;
    padding:10px 14px;font-size:16px;font-family:'Montserrat',sans-serif;
    outline:none;transition:border-color .2s;color:#1a1a2e;
    background:#F8F7F4;-webkit-text-size-adjust:100%;
  }
  .ew-input-bar input:focus{border-color:#00A988;}
  .ew-input-bar input:disabled{opacity:.5;cursor:not-allowed;}

  .ew-input-bar button{
    width:42px;height:42px;border-radius:12px;border:none;cursor:pointer;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
    transition:opacity .2s,background .2s;
  }
  .ew-input-bar button:disabled{opacity:.4;cursor:not-allowed;}
  .ew-input-bar button svg{width:18px;height:18px;fill:#fff;}

  #ew-send{background:linear-gradient(135deg,#00A988 0%,#007a63 100%);}
  #ew-mic{background:linear-gradient(135deg,#0D1B2A 0%,#1C2B3A 100%);}
  #ew-mic.ew-recording{
    background:linear-gradient(135deg,#e74c3c 0%,#c0392b 100%);
    animation:ew-pulse 1.5s infinite;
  }
  #ew-mic.ew-recording svg{fill:#fff;}

  .ew-powered{
    text-align:center;padding:6px 0;font-size:10px;
    color:#aaa;background:#fff;flex-shrink:0;
    font-family:'Montserrat',sans-serif;
  }

  /* ── Inline Form ── */
  .ew-form-card{
    background:#fff;border-radius:2px 16px 16px 16px;
    box-shadow:0 1px 4px rgba(0,0,0,.06);
    overflow:hidden;font-family:'Montserrat',sans-serif;
    animation:ew-fadeIn .3s ease both;
  }
  .ew-form-title{
    background:linear-gradient(135deg,#0D1B2A 0%,#1C2B3A 100%);
    color:#fff;padding:14px 16px;font-size:14px;font-weight:700;
  }
  .ew-form-body{padding:16px;}
  .ew-form-group{margin-bottom:12px;}
  .ew-form-group label{
    display:block;font-size:12px;font-weight:600;
    color:#1a1a2e;margin-bottom:4px;
  }
  .ew-form-group input[type="text"],
  .ew-form-group input[type="email"],
  .ew-form-group input[type="tel"]{
    width:100%;padding:9px 12px;border:1.5px solid #F0EDE8;
    border-radius:8px;font-size:13px;font-family:'Montserrat',sans-serif;
    outline:none;transition:border-color .2s;background:#F8F7F4;color:#1a1a2e;
    box-sizing:border-box;
  }
  .ew-form-group input:focus{border-color:#00A988;}

  .ew-form-privacy{
    display:flex;align-items:flex-start;gap:8px;
    margin:14px 0 16px;font-size:12px;color:#6B7280;line-height:1.5;
  }
  .ew-form-privacy input[type="checkbox"]{
    margin-top:2px;width:16px;height:16px;flex-shrink:0;
    accent-color:#00A988;cursor:pointer;
  }

  .ew-form-submit{
    width:100%;padding:11px;border:none;border-radius:10px;
    background:linear-gradient(135deg,#00A988 0%,#007a63 100%);
    color:#fff;font-size:14px;font-weight:600;cursor:pointer;
    font-family:'Montserrat',sans-serif;transition:opacity .2s;
  }
  .ew-form-submit:hover{opacity:.9;}
  .ew-form-submit:disabled{opacity:.5;cursor:not-allowed;}

  .ew-form-error{
    margin-top:10px;padding:8px 12px;border-radius:8px;
    background:#fdf0ef;border:1px solid #f5c6cb;
    color:#c0392b;font-size:12px;line-height:1.5;
    display:none;
  }
  .ew-form-error.ew-visible{display:block;}

  .ew-form-done{
    text-align:center;padding:20px 16px;color:#6B7280;font-size:13px;
  }
  .ew-form-done svg{
    width:40px;height:40px;fill:#00A988;display:block;margin:0 auto 10px;
  }

  /* ── Call Card ── */
  .ew-call-card{
    background:#fff;border-radius:2px 16px 16px 16px;
    box-shadow:0 1px 4px rgba(0,0,0,.06);
    overflow:hidden;font-family:'Montserrat',sans-serif;
    animation:ew-fadeIn .3s ease both;
  }
  .ew-call-title{
    background:linear-gradient(135deg,#B8973E 0%,#8a6d2b 100%);
    color:#fff;padding:14px 16px;font-size:14px;font-weight:700;
    display:flex;align-items:center;gap:8px;
  }
  .ew-call-title svg{width:18px;height:18px;fill:#fff;flex-shrink:0;}

  @keyframes ew-fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
  @keyframes ew-bounce{0%,80%,100%{transform:scale(0);}40%{transform:scale(1);}}
  @keyframes ew-pulse{
    0%{box-shadow:0 0 0 0 rgba(231,76,60,.4);}
    70%{box-shadow:0 0 0 10px rgba(231,76,60,0);}
    100%{box-shadow:0 0 0 0 rgba(231,76,60,0);}
  }

  @media(max-width:480px){
    #ew-chat-box{
      bottom:0;right:0;left:0;
      width:100%;max-width:100%;
      height:100dvh;max-height:100dvh;
      border-radius:0;
    }
    #ew-chat-toggle{bottom:16px;right:16px;width:54px;height:54px;}
    .ew-input-bar{
      padding:10px clamp(8px,3vw,12px) max(10px,env(safe-area-inset-bottom));
    }
    .ew-input-bar button{width:44px;height:44px;}
    .ew-msg{max-width:88%;}
    .ew-msg-form,.ew-msg-call{max-width:96%;}
  }
  `;

  // ── HTML ─────────────────────────────────────────────
  var LOGO_URL = (function () {
    var s = document.currentScript;
    if (!s) return 'images/logo_mentor_eureka.png';
    var src = s.getAttribute('src') || '';
    var base = src.substring(0, src.lastIndexOf('/') + 1);
    return base + 'images/logo_mentor_eureka.png';
  })();

  var html = `
  <button id="ew-chat-toggle" aria-label="Apri chat">
    <svg class="ew-ico-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>
    <svg class="ew-ico-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    <span id="ew-chat-badge"></span>
  </button>
  <div id="ew-chat-box">
    <div class="ew-header">
      <div class="ew-header-avatar">
        <img src="${LOGO_URL}" alt="Mentor Eureka" onerror="this.style.display='none'"/>
      </div>
      <div class="ew-header-info">
        <div class="ew-header-name">Mentor Eureka</div>
        <div class="ew-header-status">Assistente AI</div>
      </div>
      <div class="ew-header-actions">
        <button id="ew-tts-toggle" class="ew-header-btn" aria-label="Audio on/off" title="Audio on/off">
          <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        </button>
      </div>
    </div>
    <div class="ew-messages" id="ew-messages">
      <div class="ew-typing ew-msg ew-msg-bot" id="ew-typing">
        <div class="ew-bubble"><span class="ew-dot"></span><span class="ew-dot"></span><span class="ew-dot"></span></div>
      </div>
    </div>
    <div class="ew-input-bar">
      <input id="ew-input" type="text" placeholder="Scrivi un messaggio..." autocomplete="off" />
      <button id="ew-mic" aria-label="Microfono"><svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></button>
      <button id="ew-send" aria-label="Invia"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
    </div>
    <div class="ew-powered">Metodo Eureka &middot; AI Assistente</div>
  </div>
  `;

  // ── Inject ───────────────────────────────────────────
  function inject() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'ew-chat-widget';
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    widgetReady = true;
    bindEvents();
    startAutoOpen();
  }

  function $(id) { return document.getElementById(id); }

  // ── Events ───────────────────────────────────────────
  function bindEvents() {
    $('ew-chat-toggle').addEventListener('click', function () {
      if (chatOpened) { closeChat(); } else { openChat(); }
    });
    $('ew-send').addEventListener('click', sendMessage);
    $('ew-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    $('ew-mic').addEventListener('click', toggleMic);
    $('ew-tts-toggle').addEventListener('click', toggleTts);
  }

  // ── Open / Close ────────────────────────────────────
  function openChat() {
    chatOpened = true;
    $('ew-chat-box').classList.add('ew-visible');
    $('ew-chat-toggle').classList.add('ew-open');
    $('ew-chat-toggle').classList.remove('ew-has-badge');
    if (!sessionId) { startSession(); } else { focusInput(); }
  }

  function closeChat() {
    chatOpened = false;
    $('ew-chat-box').classList.remove('ew-visible');
    $('ew-chat-toggle').classList.remove('ew-open');
  }

  function focusInput() {
    if (!inputDisabled) {
      setTimeout(function () { $('ew-input').focus(); }, 100);
    }
  }

  function getPageContext() {
    return {
      url: window.location.pathname,
      title: document.title,
      description: (document.querySelector('meta[name="description"]') || {}).content || '',
      section: window.location.pathname.split('/').filter(Boolean)[0] || ''
    };
  }

  // ── Session Start ───────────────────────────────────
  function startSession() {
    showTyping();
    fetch(API_BASE + '/api/chat/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_context: getPageContext() })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        hideTyping();
        sessionId = data.session_id;
        if (data.speech) { typeBotMessage(data.speech); }
        focusInput();
      })
      .catch(function () {
        hideTyping();
        typeBotMessage('Ciao! Sono Mentor Eureka. Come posso aiutarti?');
        focusInput();
      });
  }

  // ── Send Message ────────────────────────────────────
  function sendMessage() {
    if (inputDisabled) return;
    var inp = $('ew-input');
    var text = inp.value.trim();
    if (!text) return;

    inp.value = '';
    appendUser(text);
    showTyping();
    disableInput(true);

    var startPromise = sessionId
      ? Promise.resolve()
      : fetch(API_BASE + '/api/chat/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page_context: getPageContext() })
        })
          .then(function (r) { return r.json(); })
          .then(function (d) { sessionId = d.session_id; });

    startPromise
      .then(function () {
        return fetch(API_BASE + '/api/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, message: text, voice: ttsEnabled })
        });
      })
      .then(function (r) {
        if (r.status === 410) {
          hideTyping(); disableInput(true); inputDisabled = true;
          appendBot('Sessione chiusa. Apri una nuova chat.', false, true);
          return null;
        }
        return r.json();
      })
      .then(function (data) {
        if (!data) return;
        hideTyping();
        disableInput(false);
        handleBotResponse(data);
      })
      .catch(function () {
        hideTyping(); disableInput(false);
        appendBot('Mi dispiace, c\'è stato un errore. Riprova tra poco.');
      });
  }

  // ── Handle bot response ─────────────────────────────
  function handleBotResponse(data) {
    var action = data.action || 'reply';

    switch (action) {
      case 'show_form':
        if (data.speech) { typeBotMessage(data.speech); }
        if (data.form) { appendForm(data.form); }
        break;
      case 'show_call':
        if (data.speech) { typeBotMessage(data.speech); }
        appendCallCard();
        break;
      case 'action_completed':
        typeBotMessage(data.speech || '', true);
        break;
      case 'action_failed':
        appendBot(data.speech || '', false, true);
        break;
      case 'end_session':
        if (data.speech) { typeBotMessage(data.speech); }
        disableInput(true); inputDisabled = true;
        break;
      default:
        if (data.speech) {
          var isSuccess = data.business_result && data.business_result.success === true;
          typeBotMessage(data.speech, isSuccess);
        }
        break;
    }

    if (ttsEnabled && data.audio_base64) {
      playBase64Audio(data.audio_base64);
    }
  }

  // ── Typing effect ───────────────────────────────────
  function typeBotMessage(text, success, isError) {
    var msgs = $('ew-messages');
    var div = document.createElement('div');
    div.className = 'ew-msg ew-msg-bot';
    var bubble = document.createElement('div');
    var cls = 'ew-bubble';
    if (success) cls += ' ew-success';
    if (isError) cls += ' ew-error';
    bubble.className = cls;
    bubble.textContent = '';
    div.appendChild(bubble);
    msgs.insertBefore(div, $('ew-typing'));

    var i = 0;
    var speed = 18;
    function typeNext() {
      if (i < text.length) {
        bubble.textContent = text.slice(0, ++i);
        scrollDown();
        setTimeout(typeNext, speed);
      }
    }
    typeNext();
  }

  function appendBot(text, success, isError) {
    var msgs = $('ew-messages');
    var div = document.createElement('div');
    div.className = 'ew-msg ew-msg-bot';
    var bubble = document.createElement('div');
    var cls = 'ew-bubble';
    if (success) cls += ' ew-success';
    if (isError) cls += ' ew-error';
    bubble.className = cls;
    bubble.textContent = text;
    div.appendChild(bubble);
    msgs.insertBefore(div, $('ew-typing'));
    scrollDown();
  }

  function appendUser(text) {
    var msgs = $('ew-messages');
    var div = document.createElement('div');
    div.className = 'ew-msg ew-msg-user';
    var bubble = document.createElement('div');
    bubble.className = 'ew-bubble';
    bubble.textContent = text;
    div.appendChild(bubble);
    msgs.insertBefore(div, $('ew-typing'));
    scrollDown();
  }

  // ── Microphone (Speech Recognition) ─────────────────
  function toggleMic() {
    if (isRecording) {
      stopMic();
    } else {
      startMic();
    }
  }

  function startMic() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      appendBot('Il riconoscimento vocale non è supportato dal tuo browser.', false, true);
      return;
    }

    isRecording = true;
    $('ew-mic').classList.add('ew-recording');

    recognition = new SR();
    recognition.lang = 'it-IT';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    var inactivityTimer = setTimeout(function () {
      try { recognition.stop(); } catch (e) {}
    }, 20000);

    recognition.onresult = function (event) {
      var result = event.results[event.results.length - 1];
      if (result && result.isFinal) {
        var transcript = (result[0].transcript || '').trim();
        if (transcript) {
          $('ew-input').value = transcript;
          sendMessage();
        }
      }
    };

    recognition.onerror = function (event) {
      console.warn('Speech recognition error:', event.error);
    };

    recognition.onend = function () {
      clearTimeout(inactivityTimer);
      isRecording = false;
      $('ew-mic').classList.remove('ew-recording');
      recognition = null;
    };

    try {
      recognition.start();
    } catch (e) {
      isRecording = false;
      $('ew-mic').classList.remove('ew-recording');
      recognition = null;
    }
  }

  function stopMic() {
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
    isRecording = false;
    $('ew-mic').classList.remove('ew-recording');
  }

  // ── TTS Toggle ──────────────────────────────────────
  function toggleTts() {
    ttsEnabled = !ttsEnabled;
    var btn = $('ew-tts-toggle');
    if (ttsEnabled) {
      btn.classList.remove('ew-muted');
      btn.title = 'Audio attivo';
    } else {
      btn.classList.add('ew-muted');
      btn.title = 'Audio disattivato';
      stopAudio();
    }
  }

  // ── Audio Playback ──────────────────────────────────
  function playBase64Audio(base64) {
    try {
      stopAudio();
      var binary = atob(base64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      var blob = new Blob([bytes], { type: 'audio/mp3' });
      var url = URL.createObjectURL(blob);
      currentAudio = new Audio(url);
      currentAudio.onended = function () {
        URL.revokeObjectURL(url); currentAudio = null;
      };
      currentAudio.onerror = function () {
        URL.revokeObjectURL(url); currentAudio = null;
      };
      currentAudio.play().catch(function () {});
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  function stopAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }
  }

  // ── Call Card (Livello 3) ───────────────────────────
  function appendCallCard() {
    var msgs = $('ew-messages');
    var wrapper = document.createElement('div');
    wrapper.className = 'ew-msg ew-msg-call';

    var card = document.createElement('div');
    card.className = 'ew-call-card';

    var titleDiv = document.createElement('div');
    titleDiv.className = 'ew-call-title';
    titleDiv.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg> Preferisci parlare con Piero?';
    card.appendChild(titleDiv);

    var body = document.createElement('div');
    body.className = 'ew-form-body';

    var fields = [
      { name: 'call_nome', label: 'Nome', type: 'text', placeholder: 'Il tuo nome' },
      { name: 'call_telefono', label: 'Telefono', type: 'tel', placeholder: '+39 333 1234567' }
    ];

    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var group = document.createElement('div');
      group.className = 'ew-form-group';
      var label = document.createElement('label');
      label.textContent = f.label;
      group.appendChild(label);
      var input = document.createElement('input');
      input.type = f.type;
      input.name = f.name;
      input.placeholder = f.placeholder;
      group.appendChild(input);
      body.appendChild(group);
    }

    var privDiv = document.createElement('div');
    privDiv.className = 'ew-form-privacy';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.name = 'call_privacy';
    var privLabel = document.createElement('label');
    privLabel.textContent = 'Acconsento al trattamento dei dati personali ai sensi del GDPR.';
    privDiv.appendChild(cb);
    privDiv.appendChild(privLabel);
    body.appendChild(privDiv);

    var callBtn = document.createElement('button');
    callBtn.type = 'button';
    callBtn.className = 'ew-form-submit';
    callBtn.style.background = 'linear-gradient(135deg,#B8973E 0%,#8a6d2b 100%)';
    callBtn.textContent = 'Chiamami ora';
    body.appendChild(callBtn);

    var errorDiv = document.createElement('div');
    errorDiv.className = 'ew-form-error';
    body.appendChild(errorDiv);

    card.appendChild(body);
    wrapper.appendChild(card);
    msgs.insertBefore(wrapper, $('ew-typing'));
    scrollDown();

    callBtn.addEventListener('click', function () {
      submitCallRequest(card, errorDiv, callBtn);
    });
  }

  function submitCallRequest(card, errorDiv, callBtn) {
    errorDiv.classList.remove('ew-visible');

    var nome = card.querySelector('input[name="call_nome"]');
    var telefono = card.querySelector('input[name="call_telefono"]');
    var privacy = card.querySelector('input[name="call_privacy"]');

    if (!nome.value.trim() || !telefono.value.trim()) {
      errorDiv.textContent = 'Inserisci nome e numero di telefono.';
      errorDiv.classList.add('ew-visible');
      return;
    }
    if (!privacy.checked) {
      errorDiv.textContent = 'Devi accettare il trattamento dei dati personali.';
      errorDiv.classList.add('ew-visible');
      return;
    }

    callBtn.disabled = true;
    callBtn.textContent = 'Avvio chiamata...';

    fetch(API_BASE + '/api/chat/submit-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        form_id: 'call_request',
        data: {
          nome: nome.value.trim(),
          telefono: telefono.value.trim()
        },
        privacy_accepted: true
      })
    })
      .then(function (r) {
        if (r.status === 422 || r.status === 400) {
          return r.json().then(function (err) {
            callBtn.disabled = false;
            callBtn.textContent = 'Chiamami ora';
            errorDiv.textContent = err.detail || 'Errore di validazione.';
            errorDiv.classList.add('ew-visible');
            return null;
          });
        }
        return r.json();
      })
      .then(function (result) {
        if (!result) return;
        var bodyEl = card.querySelector('.ew-form-body');
        bodyEl.innerHTML = '';
        var done = document.createElement('div');
        done.className = 'ew-form-done';
        done.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>' +
          '<span>Piero ti chiamera\' a breve!</span>';
        bodyEl.appendChild(done);
        if (result.speech) { typeBotMessage(result.speech, true); }
        scrollDown();
      })
      .catch(function () {
        callBtn.disabled = false;
        callBtn.textContent = 'Chiamami ora';
        errorDiv.textContent = 'Errore di connessione. Riprova.';
        errorDiv.classList.add('ew-visible');
      });
  }

  // ── Inline Form Rendering ──────────────────────────
  function appendForm(formConfig) {
    var msgs = $('ew-messages');
    var wrapper = document.createElement('div');
    wrapper.className = 'ew-msg ew-msg-form';
    var card = document.createElement('div');
    card.className = 'ew-form-card';

    var title = document.createElement('div');
    title.className = 'ew-form-title';
    title.textContent = formConfig.title || 'Compila il modulo';
    card.appendChild(title);

    var body = document.createElement('div');
    body.className = 'ew-form-body';

    var fields = formConfig.fields || [];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var group = document.createElement('div');
      group.className = 'ew-form-group';
      var label = document.createElement('label');
      label.textContent = f.label || f.name;
      group.appendChild(label);
      var input = document.createElement('input');
      input.type = f.type || 'text';
      input.name = f.name;
      input.placeholder = f.placeholder || '';
      if (f.required) input.required = true;
      group.appendChild(input);
      body.appendChild(group);
    }

    if (formConfig.privacy_checkbox) {
      var privDiv = document.createElement('div');
      privDiv.className = 'ew-form-privacy';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.name = 'ew_privacy';
      var privLabel = document.createElement('label');
      privLabel.textContent = formConfig.privacy_text || 'Acconsento al trattamento dei dati personali ai sensi del GDPR.';
      privDiv.appendChild(cb);
      privDiv.appendChild(privLabel);
      body.appendChild(privDiv);
    }

    var submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'ew-form-submit';
    submitBtn.textContent = formConfig.submit_label || 'Invia';
    body.appendChild(submitBtn);

    var errorDiv = document.createElement('div');
    errorDiv.className = 'ew-form-error';
    body.appendChild(errorDiv);

    card.appendChild(body);
    wrapper.appendChild(card);
    msgs.insertBefore(wrapper, $('ew-typing'));
    scrollDown();

    submitBtn.addEventListener('click', function () {
      submitForm(formConfig, card, fields, errorDiv, submitBtn);
    });
  }

  function submitForm(formConfig, card, fields, errorDiv, submitBtn) {
    errorDiv.classList.remove('ew-visible');

    if (formConfig.privacy_checkbox) {
      var privCb = card.querySelector('input[name="ew_privacy"]');
      if (!privCb || !privCb.checked) {
        errorDiv.textContent = 'Devi accettare il trattamento dei dati personali per continuare.';
        errorDiv.classList.add('ew-visible');
        return;
      }
    }

    var data = {};
    var missing = [];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var input = card.querySelector('input[name="' + f.name + '"]');
      var val = input ? input.value.trim() : '';
      if (f.required && !val) { missing.push(f.label || f.name); }
      data[f.name] = val;
    }

    if (missing.length > 0) {
      errorDiv.textContent = 'Compila i campi obbligatori: ' + missing.join(', ');
      errorDiv.classList.add('ew-visible');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Invio in corso...';

    var privAccepted = formConfig.privacy_checkbox
      ? card.querySelector('input[name="ew_privacy"]').checked : true;

    fetch(API_BASE + '/api/chat/submit-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        form_id: formConfig.form_id,
        data: data,
        privacy_accepted: privAccepted
      })
    })
      .then(function (r) {
        if (r.status === 422 || r.status === 400) {
          return r.json().then(function (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = formConfig.submit_label || 'Invia';
            errorDiv.textContent = err.detail || err.message || 'Errore di validazione.';
            errorDiv.classList.add('ew-visible');
            return null;
          });
        }
        if (r.status === 410) {
          disableInput(true); inputDisabled = true;
          appendBot('Sessione chiusa. Apri una nuova chat.', false, true);
          return null;
        }
        return r.json();
      })
      .then(function (result) {
        if (!result) return;
        var bodyEl = card.querySelector('.ew-form-body');
        bodyEl.innerHTML = '';
        var done = document.createElement('div');
        done.className = 'ew-form-done';
        done.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' +
          '<span>Inviato con successo!</span>';
        bodyEl.appendChild(done);
        handleBotResponse(result);
        scrollDown();
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = formConfig.submit_label || 'Invia';
        errorDiv.textContent = 'Errore di connessione. Riprova.';
        errorDiv.classList.add('ew-visible');
      });
  }

  function showTyping() { $('ew-typing').style.display = 'block'; scrollDown(); }
  function hideTyping() { $('ew-typing').style.display = 'none'; }
  function scrollDown() {
    var m = $('ew-messages');
    setTimeout(function () { m.scrollTop = m.scrollHeight; }, 50);
  }
  function disableInput(flag) {
    $('ew-input').disabled = flag;
    $('ew-send').disabled = flag;
  }

  // ── Auto-open after 40s ─────────────────────────────
  function startAutoOpen() {
    setTimeout(function () {
      if (chatOpened) return;
      fetch(API_BASE + '/api/chat/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_context: getPageContext() })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (chatOpened) return;
          sessionId = data.session_id;
          if (data.proactive) {
            openChat();
            if (data.speech) { typeBotMessage(data.speech); }
          } else {
            $('ew-chat-toggle').classList.add('ew-has-badge');
          }
        })
        .catch(function () {});
    }, 40000);
  }

  // ── End session on page unload ──────────────────────
  window.addEventListener('beforeunload', function () {
    if (!sessionId) return;
    var url = API_BASE + '/api/chat/session/end';
    var body = JSON.stringify({ session_id: sessionId });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(body);
    }
  });

  // ── Boot ────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
