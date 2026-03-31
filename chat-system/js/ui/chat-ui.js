// /js/ui/chat-ui.js
// MODIFICA: Funzione addMessage per aggiungere messaggi alla chat
// chat-ui.js

// /js/ui/chat-ui.js
// MODIFICA (19/08/2025 13:50): Rimosso export duplicato per typeAiMessage, ottimizzato typeAiMessage per sfarfallio
// /js/ui/chat-ui.js
// MODIFICA (19/08/2025 17:39): Cambiato innerHTML in textContent in typeAiMessage per ridurre sfarfallio

// /js/ui/chat-ui.js
// MODIFICA (19/08/2025 17:39): Cambiato innerHTML in textContent in typeAiMessage per ridurre sfarfallio
// /js/ui/chat-ui.js
// MODIFICA (19/08/2025 13:30): Rimosso export duplicato per typeAiMessage

// Funzione per aggiungere messaggi alla chat

// /js/ui/chat-ui.js
// MODIFICA (20/08/2025): Aggiunto controllo per evitare creazione di div duplicati in addMessage

// MODIFICA (21/08/2025): Aggiunto supporto per tipo 'processing' in addMessage e rimozione indicatore in typeAiMessage

// Funzione per detect HTML in string
// MODIFICA (22/08/2025 10:37): Corretto selettore CSS per indicatore visivo

// Funzione per detect HTML in string
function hasHTML(str) {
  return /<[a-z][\s\S]*>/i.test(str);
}

export function addMessage(type, content, id = null) {
  console.log('DEBUG: addMessage chiamato con type:', type, 'content:', content, 'id:', id);
  const chatWindow = document.getElementById('chat-window');
  if (!chatWindow) {
    console.error('Errore: chat-window non trovato');
    return;
  }

  let messageDiv;
  if (id && document.getElementById(id)) {
    console.log('DEBUG: Div esistente trovato per id:', id);
    messageDiv = document.getElementById(id);
  } else {
    console.log('DEBUG: Creazione nuovo div per id:', id);
    messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`; // Supporta 'user', 'bot', 'error', 'processing'
    if (id) messageDiv.id = id;
    chatWindow.appendChild(messageDiv);
  }

  if (content) {
    if (hasHTML(content) || type === 'processing') {
      messageDiv.innerHTML = content; // Usa innerHTML per HTML o processing
      console.log('DEBUG: Messaggio renderizzato con innerHTML:', content);
    } else {
      messageDiv.textContent = content; // Usa textContent per plain text
      console.log('DEBUG: Messaggio renderizzato con textContent:', content);
    }
  }

  chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll
  return messageDiv;
}

export function typeAiMessage(messageId, fullText) {
  console.log('DEBUG: typeAiMessage chiamato con messageId:', messageId, 'fullText:', fullText);
  const messageDiv = document.getElementById(messageId);
  const chatWindow = document.getElementById('chat-window');
  if (!messageDiv) {
    console.error('Errore: messageDiv non trovato per ID:', messageId);
    return;
  }

  // Inizio modifica (22/08/2025 10:37): Corretto selettore CSS per indicatore visivo
  const indicator = document.getElementById('processing-indicator');
  if (indicator) {
    indicator.remove();
    console.log('DEBUG: Indicatore visivo rimosso in typeAiMessage');
  }
  // Fine modifica

  // Se messaggio già renderizzato, skip
  if (messageDiv.textContent === fullText || messageDiv.innerHTML === fullText) {
    console.log('DEBUG: Messaggio già renderizzato, skip:', messageId);
    chatWindow.scrollTop = chatWindow.scrollHeight; // Assicura auto-scroll
    return;
  }

  // Se fullText ha HTML, set full innerHTML senza typing
  if (hasHTML(fullText)) {
    messageDiv.innerHTML = fullText;
    console.log('DEBUG: HTML detectato, skip typing, set full innerHTML');
    chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll
    return;
  }

  let charsToShow = 0;
  const typingInterval = setInterval(() => {
    charsToShow++;
    messageDiv.textContent = fullText.slice(0, charsToShow); // Typing su plain

    chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll

    console.log('DEBUG: Typing AI message, chars:', charsToShow);

    if (charsToShow >= fullText.length) {
      clearInterval(typingInterval);
      console.log('DEBUG: Typing AI message completato');
    }
  }, 100); // Delay 100ms per carattere
}