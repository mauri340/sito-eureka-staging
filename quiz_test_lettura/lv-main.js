import { CONTENUTI } from './lv-config.js';

// Recupera ID articolo da query string
const urlParams = new URLSearchParams(window.location.search);
const articleId = urlParams.get('article') || 'sistemico';
// Recupera ID articolo da query string

// Elementi DOM
const readingScreen = document.getElementById('reading-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const readingTitle = document.getElementById('reading-title');
const readingText = document.getElementById('reading-text');
const quizQuestions = document.getElementById('quiz-questions');
const quizForm = document.getElementById('quiz-form');
const finishReadingBtn = document.getElementById('finish-reading-btn');
const submitQuizBtn = document.getElementById('submit-quiz-btn');
const userDataForm = document.getElementById('user-data-form');

// Stato
let startTime = null;
let answers = {};

// Carica articolo
function loadArticle() {
  if (!readingTitle || !readingText) {
    console.error('Elementi DOM mancanti: reading-title o reading-text non trovati');
    const container = document.getElementById('test-container');
    if (container) {
      container.innerHTML = '<p class="error-message">Errore: Impossibile caricare l\'articolo. Torna alla <a href="index.html">home</a>.</p>';
    }
    return;
  }
  const article = CONTENUTI[articleId];
  if (!article) {
    readingText.innerHTML = '<p class="error-message">Errore: Articolo non trovato. Torna alla <a href="index.html">home</a>.</p>';
    console.error(`Articolo "${articleId}" non trovato in CONTENUTI`);
    return;
  }
  readingTitle.innerText = article.titolo;
  readingText.innerHTML = article.testoHTML;
  startTime = Date.now();
}

// Mostra domande quiz
function showQuiz() {
  if (!quizQuestions) {
    console.error('Elemento DOM quiz-questions non trovato');
    return;
  }
  const article = CONTENUTI[articleId];
  if (!article) return;
  quizQuestions.innerHTML = '';
  article.domande.forEach((q, index) => {
    const div = document.createElement('div');
    div.className = 'form-group';
    div.innerHTML = `
      <p>${q.domanda}</p>
      ${q.opzioni.map((opt, i) => `
        <label><input type="radio" name="q${index}" value="${String.fromCharCode(97 + i)}" required> ${opt}</label><br>
      `).join('')}
    `;
    quizQuestions.appendChild(div);
  });
}

// Calcola risultati
function calculateResults() {
  const endTime = Date.now();
  const readingTimeInSeconds = (endTime - startTime) / 1000;
  const article = CONTENUTI[articleId];
  let score = 0;
  article.domande.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    if (selected && selected.value === q.rispostaCorretta) {
      score += q.punti;
    }
  });
  const pam = article.wordCount / (readingTimeInSeconds / 60);
  const weightedPam = (pam * score) / 100;
  console.log('DEBUG: Risultati calcolati:', { pam, weightedPam, score, readingTimeInSeconds });
  return { pam, weightedPam, score, readingTimeInSeconds };
}

// Cambia schermata
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
}

// Inizializza
function init() {
  if (!document.getElementById('test-container')) {
    console.error('Contesto errato: lv-main.js deve essere incluso in test-lettura.html');
    document.body.innerHTML = '<p class="error-message">Errore: Questa pagina non è valida. Torna alla <a href="lettura-home.html">home</a>.</p>';
    return;
  }

  if (!readingScreen || !quizScreen || !resultsScreen || !finishReadingBtn || !submitQuizBtn || !userDataForm || !quizForm) {
    console.error('Elementi DOM principali mancanti');
    const container = document.getElementById('test-container');
    if (container) {
      container.innerHTML = '<p class="error-message">Errore: Struttura pagina non valida. Torna alla <a href="lettura-home.html">home</a>.</p>';
    }
    return;
  }

  loadArticle();
  finishReadingBtn.addEventListener('click', () => {
    showScreen('quiz-screen');
    showQuiz();
  });

  quizForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (quizForm.checkValidity()) {
      showScreen('results-screen');
    } else {
      quizForm.reportValidity();
    }
  });

  userDataForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const results = calculateResults();
  const formData = {
    nome: document.getElementById('nome').value,
    cognome: document.getElementById('cognome').value,
    email: document.getElementById('email').value,
    telefono: document.getElementById('telefono').value,
    pam: Math.round(results.pam), // Arrotonda il PAM prima di inviarlo
    punteggio_comprensione: results.score,
    readingTimeInSeconds: Math.round(results.readingTimeInSeconds) // Arrotonda anche il tempo per coerenza
  };
    
   // Cattura parametri UTM (opzionali)
const utmParams = {
  utm_source: urlParams.get('utm_source') || '',
  utm_medium: urlParams.get('utm_medium') || '',
  utm_campaign: urlParams.get('utm_campaign') || '',
  utm_content: urlParams.get('utm_content') || '',
  utm_term: urlParams.get('utm_term') || ''
};

 // Prepara il payload completo per il backend (con la correzione per userId)
  const payload = {
    userId: formData.email, // <-- CORREZIONE APPLICATA QUI
    quizData: formData,
    utmParams: utmParams
  };


    console.log('DEBUG: Invio payload a /quiz/submit:', JSON.stringify(payload, null, 2));
    console.log('DEBUG: Dati utente:', formData);
    console.log('DEBUG: Parametri UTM:', utmParams);
    
 
  try {
    const response = await fetch('https://ai-chat-service-nls9.onrender.com/api/quiz/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('DEBUG: Risposta da /quiz/submit:', JSON.stringify(data, null, 2));
    
    // ✅ PUNTO CHIAVE: INSERISCI IL CODICE DI FACEBOOK QUI
    if (typeof fbq === 'function') {
      fbq('track', 'Lead');
      console.log('Evento "Lead" inviato al Pixel di Meta.');
    }
    
    const quizData = data.quizData || formData;
    const redirectUrl = `/chat-system/chat.html?userId=${encodeURIComponent(data.userId || formData.email)}&email=${encodeURIComponent(formData.email)}&nome=${encodeURIComponent(formData.nome)}&cognome=${encodeURIComponent(formData.cognome)}&telefono=${encodeURIComponent(formData.telefono)}&pam=${encodeURIComponent(quizData.pam)}&punteggio=${encodeURIComponent(quizData.punteggio_comprensione)}&quiz_status=lettura`;
    console.log('DEBUG: Redirect a:', redirectUrl);
    window.location.href = redirectUrl;
  } catch (error) {
    console.error('Errore invio quiz:', error.message);
    
    // Fallback: proceed to chat even if backend fails
    alert('Si è verificato un problema temporaneo con il server. Procediamo comunque alla conversazione con Mentor Eureka.');
    
    const fallbackRedirectUrl = `/chat-system/chat.html?userId=${encodeURIComponent(formData.email)}&email=${encodeURIComponent(formData.email)}&nome=${encodeURIComponent(formData.nome)}&cognome=${encodeURIComponent(formData.cognome)}&telefono=${encodeURIComponent(formData.telefono)}&pam=${encodeURIComponent(results.pam)}&punteggio=${encodeURIComponent(results.score)}&quiz_status=lettura&offline=true`;
    console.log('DEBUG: Fallback redirect a:', fallbackRedirectUrl);
    window.location.href = fallbackRedirectUrl;
  }
});
}

// Esegui inizializzazione
document.addEventListener('DOMContentLoaded', init);