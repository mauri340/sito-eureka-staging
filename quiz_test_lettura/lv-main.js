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
let endTime = null;
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
    endTime = Date.now();
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
      telefono: document.getElementById('telefono').value
    };

    // Paid ad attribution: leggi UTM da URL e cookies Meta
    const adParams = new URLSearchParams(window.location.search);
    function readCookie(name) {
      const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    }

    const quizPayload = {
      quiz_status: "lettura",
      nome: formData.nome,
      cognome: formData.cognome,
      email: formData.email,
      telefono: formData.telefono,
      pam: Math.round(results.pam),
      punteggio: results.score,
      hook_id: adParams.get('hook') || null,
      utm_source: adParams.get('utm_source') || null,
      utm_medium: adParams.get('utm_medium') || null,
      utm_campaign: adParams.get('utm_campaign') || null,
      utm_content: adParams.get('utm_content') || null,
      utm_term: adParams.get('utm_term') || null,
      fbc: readCookie('_fbc'),
      fbp: readCookie('_fbp')
    };

    // Pixel browser-side: evento Lead (rete di sicurezza, dato vero arriva via CAPI server)
    if (typeof fbq === 'function') {
      try { fbq('track', 'Lead', { content_name: 'quiz_lettura', value: 0, currency: 'EUR' }); } catch(_){}
    }

    try {
      const response = await fetch(
        'https://ai-chat-service-nls9.onrender.com/api/quiz/submit',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(quizPayload)
        }
      );
      const data = await response.json();
      if (data.token) {
        window.location.href = 
          `/chat-system/chat.html?token=${data.token}`;
      } else {
        throw new Error('Token non ricevuto');
      }
    } catch (error) {
      // Fallback con parametri URL
      window.location.href = 
        `/chat-system/chat.html?` +
        `quiz_status=lettura` +
        `&nome=${encodeURIComponent(formData.nome)}` +
        `&cognome=${encodeURIComponent(formData.cognome)}` +
        `&email=${encodeURIComponent(formData.email)}` +
        `&telefono=${encodeURIComponent(formData.telefono)}` +
        `&pam=${encodeURIComponent(Math.round(results.pam))}` +
        `&punteggio=${encodeURIComponent(results.score)}`;
    }
  });
}

// Esegui inizializzazione
document.addEventListener('DOMContentLoaded', init);