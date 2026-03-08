// /js/audio/speech-utils.js

// MODIFICA: Importo addMessage da chat-ui.js
import { addMessage } from '../ui/chat-ui.js'; // MODIFICA: Percorso corretto


console.log('DEBUG: Importazione addMessage completata:', typeof addMessage === 'function');

// ───────────── Stato interno per evitare loop/doppie sessioni ─────────────
let __asrBusy = false;
let retryTimer = null;
function clearRetryTimer(){ if (retryTimer){ clearTimeout(retryTimer); retryTimer = null; } }

// ───────────────────────────────────────────────────────────────────────────
function isSafariIOS() {
  const ua = navigator.userAgent;
  const isIOS = /iP(hone|ad|od)/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isIOS || isSafari;
}
function supportsMediaRecorder() {
  return !!(window.MediaRecorder && MediaRecorder.isTypeSupported);
}

// ───────────────────────────────────────────────────────────────────────────
async function recordWebm({ seconds = 5 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  const chunks = [];
  return await new Promise((resolve, reject) => {
    rec.ondataavailable = e => e.data && chunks.push(e.data);
    rec.onerror = reject;
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      resolve(new Blob(chunks, { type: 'audio/webm' }));
    };
    rec.start();
    setTimeout(() => rec.state !== 'inactive' && rec.stop(), seconds * 1000);
  });
}

async function recordWav({ seconds = 5 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true }
  });
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC({ sampleRate: 16000 });
  const src = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const buffers = [];
  processor.onaudioprocess = (e) => {
    buffers.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };
  src.connect(processor); processor.connect(ctx.destination);

  await new Promise(r => setTimeout(r, seconds * 1000));
  processor.disconnect(); src.disconnect(); stream.getTracks().forEach(t => t.stop());

  const merged = mergeFloat32(buffers);
  return floatToWav16kMono(merged, 16000);
}

function mergeFloat32(chunks) {
  let len = 0; for (const c of chunks) len += c.length;
  const out = new Float32Array(len);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

function floatToWav16kMono(float32, sampleRate) {
  const buffer = new ArrayBuffer(44 + float32.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + float32.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);    // PCM
  view.setUint16(22, 1, true);    // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (mono * 16-bit)
  view.setUint16(32, 2, true);              // block align
  view.setUint16(34, 16, true);             // bits
  writeString(view, 36, 'data');
  view.setUint32(40, float32.length * 2, true);
  let offset = 44;
  for (let i = 0; i < float32.length; i++) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  return new Blob([view], { type: 'audio/wav' });
}
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

// ───────────────────────────────────────────────────────────────────────────
async function sendToASR(fileOrBlob) {
  const fd = new FormData();
  const isWav = (fileOrBlob.type || '').includes('wav');
  fd.append('file', fileOrBlob, isWav ? 'input.wav' : 'input.webm');
  const r = await fetch('https://backend-quiz-ai.onrender.com/asr-upload', {
    method: 'POST',
    body: fd,
    credentials: 'include'
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'upload-failed');
  return data.transcript || '';
}

// ───────────────────────────────────────────────────────────────────────────
export async function captureAndTranscribe(seconds = 5) {
  try {
    // evita duplicati indicatore
    const old = document.getElementById('recording-indicator'); if (old) old.remove();
    addMessage('processing', 'Registrazione in corso...<span class="dots">...</span>', 'recording-indicator');

    let blob;
    if (!isSafariIOS() && supportsMediaRecorder() && MediaRecorder.isTypeSupported('audio/webm')) {
      blob = await recordWebm({ seconds });
    } else {
      blob = await recordWav({ seconds });
    }
    if (!blob || !blob.size) throw new Error('empty-audio');

    const ind = document.getElementById('recording-indicator'); if (ind) ind.remove();
    addMessage('processing', 'Trascrivo l’audio...<span class="dots">...</span>', 'asr-indicator');

    const text = await sendToASR(blob);
    const ind2 = document.getElementById('asr-indicator'); if (ind2) ind2.remove();
    return text || '';
  } catch (e) {
    const ind = document.getElementById('recording-indicator'); if (ind) ind.remove();
    const ind2 = document.getElementById('asr-indicator'); if (ind2) ind2.remove();
    console.error('ASR fallback error:', e.message);
    addMessage('error', `Errore registrazione/trascrizione: ${e.message}`);
    return '';
  }
}

// ───────────────────────────────────────────────────────────────────────────
export function startSpeechRecognition(onResult, onError, onEnd) {
  if (__asrBusy) { console.warn('ASR già attivo: ignoro nuova richiesta'); return null; }
  __asrBusy = true;

  localStorage.removeItem('lastTranscript');
  console.log('DEBUG: Reset localStorage per lastTranscript at', new Date().toISOString());

  const WS = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Se non c’è Web Speech → fallback immediato
  if (!WS) {
    console.warn('SpeechRecognition non disponibile, attivo fallback');
    (async () => {
      const text = await captureAndTranscribe(5);
      if (text) onResult(text);
      __asrBusy = false;
      onEnd();
    })().catch(err => {
      onError('fallback-failed');
      __asrBusy = false;
      onEnd();
    });
    return null;
  }

  const recognition = new WS();
  recognition.lang = 'it-IT';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  let lastTranscriptTime = 0;
  const debounceTime = 4000;
  const inactivityTimeout = 120000; // ridotto a 20s per evitare loop lunghi
  let isProcessing = false;
  let inactivityTimer = null;
  let accumulatedTranscript = '';
  let retryCount = 0;
  const maxRetries = 1; // un solo tentativo, poi fallback

  function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      console.log('DEBUG: Timeout inattività, fermo riconoscimento at', new Date().toISOString());
      try { recognition.stop(); } catch {}
    }, inactivityTimeout);
  }

  recognition.onstart = () => {
    console.log('DEBUG: Speech recognition started at', new Date().toISOString());
    retryCount = 0;
    const old = document.getElementById('recording-indicator'); if (old) old.remove();
    addMessage('processing', 'Registrazione in corso...<span class="dots">...</span>', 'recording-indicator');
    resetInactivityTimer();
  };

  recognition.onresult = (event) => {
    if (isProcessing) return;
    const res = event.results[event.results.length - 1];
    if (!res || !res.isFinal) return;
    isProcessing = true;
    const transcript = res[0]?.transcript?.trim() || '';
    const now = Date.now();
    const last = localStorage.getItem('lastTranscript') || '';
    if (transcript && !(transcript === last && now - lastTranscriptTime < debounceTime)) {
      accumulatedTranscript = transcript;
      localStorage.setItem('lastTranscript', transcript);
      lastTranscriptTime = now;
    }
    isProcessing = false;
    const ind = document.getElementById('recording-indicator'); if (ind) ind.remove();
    resetInactivityTimer();
    //setTimeout(() => { try { recognition.stop(); } catch {} }, 1200);
  };

  async function doFallback(reason) {
    console.warn('WEB SPEECH FALLBACK:', reason);
    clearRetryTimer();
    try {
      const ind = document.getElementById('recording-indicator'); if (ind) ind.remove();
      const text = await captureAndTranscribe(5);
      if (text) onResult(text);
    } catch (e) {
      onError(String(e.message || e));
    } finally {
      __asrBusy = false;
      onEnd();
    }
  }

  recognition.onerror = (event) => {
    isProcessing = false;
    const err = event.error || 'unknown';
    console.error('Errore riconoscimento vocale:', err, 'at', new Date().toISOString());
    const ind = document.getElementById('recording-indicator'); if (ind) ind.remove();
    if (inactivityTimer) clearTimeout(inactivityTimer);

    const transient = ['network', 'service-not-allowed', 'aborted', 'no-speech', 'audio-capture'];
    if (transient.includes(err) && retryCount < maxRetries && !retryTimer) {
      retryCount++;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        try {
          recognition.start();
          resetInactivityTimer();
        } catch {
          doFallback('start-failed');
        }
      }, 1200);
    } else {
      doFallback(err);
    }
  };

  recognition.onend = () => {
    isProcessing = false;
    const ind = document.getElementById('recording-indicator'); if (ind) ind.remove();
    if (inactivityTimer) clearTimeout(inactivityTimer);
    clearRetryTimer();

    if (accumulatedTranscript.trim()) {
      onResult(accumulatedTranscript.trim());
      addMessage('user', accumulatedTranscript.trim());
      accumulatedTranscript = '';
      __asrBusy = false;
      onEnd();
    } else if (retryCount === 0) {
      doFallback('ended-without-text');
    } else {
      __asrBusy = false;
      onEnd();
    }
  };

  try {
    if (!location.protocol.startsWith('https') && location.hostname !== 'localhost') {
      addMessage('error', 'Riconoscimento vocale richiede HTTPS');
      doFallback('no-https');
      return null;
    }
    navigator.permissions?.query?.({ name: 'microphone' })
      .then((ps) => {
        if (ps.state === 'denied') {
          addMessage('error', 'Accesso al microfono negato');
          doFallback('perm-denied');
        } else {
          try {
            recognition.start();
            resetInactivityTimer();
          } catch {
            doFallback('start-throw');
          }
        }
      })
      .catch(() => {
        try {
          recognition.start();
          resetInactivityTimer();
        } catch {
          doFallback('start-throw-noperms');
        }
      });
    return recognition;
  } catch (e) {
    doFallback('init-exception');
    return null;
  }
}
