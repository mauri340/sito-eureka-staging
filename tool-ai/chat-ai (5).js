// chat-ai.js — versione WebSocket moderna per backend streaming
//Inizializza una sola connessione WebSocket e la mantiene attiva (auto-reconnect base).
//Disabilita il bottone invio durante una richiesta, riabilita solo a risposta/stream_end (antispam).
//Gestisce diversi tipi di messaggio (text, audio, error, stream_end, status).
//Aggiunge tutti i messaggi ricevuti alla chat (testo/audio player).
//Aggiorna lo storico locale della conversazione (per invii successivi).
import { startSpeechRecognition } from './js/audio/speech-utils.js';
import { addMessage, typeAiMessage } from './js/ui/chat-ui.js';


// MODIFICA (22/08/2025 10:37): Aggiunto indicatore visivo "Sto pensando..." dopo invio utente, rimosso all'inizio audio
console.log('DEBUG: Importazione addMessage da chat-ui.js completata:', typeof addMessage === 'function');
console.log('DEBUG: Importazione typeAiMessage da chat-ui.js completata:', typeof typeAiMessage === 'function');


// Recupero dati utente dalla query string
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('userId');
let email = urlParams.get('email') || 'mauripossenti@gmail.com';
const nome = urlParams.get('nome') || 'Utente';
const cognome = urlParams.get('cognome') || 'Sconosciuto';
const telefono = urlParams.get('telefono') || '';
const pam = urlParams.get('pam') || 'non definito';
const punteggio = urlParams.get('punteggio') || 'non definito';
const quiz_status = urlParams.get('quiz_status') || 'not_found';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (email.includes('@gmailcom')) {
    email = email.replace('@gmailcom', '@gmail.com');
    console.log('DEBUG: Email sanitizzata:', email);
}
if (!emailRegex.test(email)) {
    console.error('Errore: Email non valida:', email);
    addMessage('error', 'Errore: Email non valida. Torna alla <a href="https://backend-quiz-ai.onrender.com/">home</a>.');
}

// Elementi DOM
let chatWindow, chatForm, chatInput, micButton, micStopButton, sendButton;
let recognition = null;
let isRecording = false;
let isSending = false;

const textQueue = [];
const audioQueue = [];
let audioContext = null;
let currentSource = null;
let audioStartTime = null;
let totalAudioDuration = 0;
let isInitialized = false;
const messageBuffer = [];
const processedMessages = new Set();

let conversationHistory = [];

function initializeAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('DEBUG: AudioContext initialized, state:', audioContext.state, 'at', new Date().toISOString());
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('DEBUG: AudioContext resumed at', new Date().toISOString());
            }).catch(err => {
                console.error('Resume audioContext failed:', err);
                addMessage('error', 'Errore inizializzazione audio');
            });
        }
    }
}

function base64ToBlob(base64, contentType = 'audio/mpeg') {
    try {
        console.log('DEBUG: Conversione base64 in blob at', new Date().toISOString());
        const byteCharacters = atob(base64);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    } catch (e) {
        console.error('Errore conversione base64:', e);
        addMessage('error', 'Errore elaborazione audio');
        return null;
    }
}

async function playNextAudioChunkWithOverlap() {
    initializeAudioContext(); // Inizializza sempre
    if (!audioQueue.length || !audioContext) {
        console.log('DEBUG: Nessun chunk audio o audioContext non inizializzato at', new Date().toISOString());
        return;
    }
    if (audioContext.state === 'suspended') {
        console.log('DEBUG: AudioContext suspended, resuming...');
        await audioContext.resume().catch(err => {
            console.error('Resume audioContext failed:', err);
            addMessage('error', 'Errore riproduzione audio');
        });
    }
    let isFirstChunk = true;
    while (audioQueue.length) {
        const blob = audioQueue.shift();
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            console.log('DEBUG: Audio decodificato, durata:', audioBuffer.duration, 'at', new Date().toISOString());
            totalAudioDuration += audioBuffer.duration;
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            if (!audioStartTime) {
                audioStartTime = audioContext.currentTime;
            }
            if (isFirstChunk) {
                const indicator = document.getElementById('processing-indicator');
                if (indicator) {
                    indicator.remove();
                    console.log('DEBUG: Indicatore visivo rimosso at', new Date().toISOString());
                }
            }
            source.start(audioContext.currentTime + 0.01);
            currentSource = source;
            console.log('DEBUG: Riproduzione chunk audio, durata:', audioBuffer.duration);
            if (isFirstChunk && textQueue.length && !processedMessages.has(textQueue[0].id)) {
                console.log('DEBUG: Avvio digitazione at', new Date().toISOString());
                startTypingAnimation();
                isFirstChunk = false;
            }
            await new Promise(resolve => {
                source.onended = () => {
                    console.log('DEBUG: Chunk audio completato at', new Date().toISOString());
                    resolve();
                };
            });
        } catch (e) {
            console.error('Errore riproduzione audio:', e);
            addMessage('error', 'Errore: Impossibile riprodurre audio');
            break;
        }
    }
    currentSource = null;
    console.log('DEBUG: Tutti i chunk audio riprodotti at', new Date().toISOString());
    isSending = false;
    if (sendButton) sendButton.disabled = false;
}

function startTypingAnimation() {
    if (!textQueue.length) {
        console.log('DEBUG: Nessun testo in coda at', new Date().toISOString());
        return;
    }
    const { id, text: fullText, isHTML } = textQueue.shift();
    if (processedMessages.has(id)) {
        console.log('DEBUG: Messaggio già processato, skip:', id);
        return;
    }
    try {
        if (typeof fullText !== 'string') {
            console.error('Errore: fullText non è una stringa:', fullText);
            addMessage('error', 'Errore: Messaggio non valido');
            return;
        }
        console.log('DEBUG: Avvio typeAiMessage per testo:', fullText, 'con ID:', id, 'isHTML:', isHTML);
        if (isHTML) {
            const messageDiv = document.getElementById(id);
            if (messageDiv) {
                messageDiv.innerHTML = fullText;
                console.log('DEBUG: HTML detectato, skip typing');
            } else {
                console.error('Errore: messageDiv non trovato per ID:', id);
            }
            processedMessages.add(id);
        } else if (typeof typeAiMessage === 'function') {
            typeAiMessage(id, fullText);
            processedMessages.add(id);
        } else {
            console.error('Errore: typeAiMessage non disponibile');
            processedMessages.add(id);
        }
    } catch (e) {
        console.error('Errore in startTypingAnimation:', e.message);
        processedMessages.add(id);
    }
}

const socket = new WebSocket('wss://backend-quiz-ai.onrender.com/ws');

socket.onopen = () => {
    console.log('DEBUG: Connessione WebSocket aperta at', new Date().toISOString());
    if (!emailRegex.test(email)) {
        console.error('Errore: Email non valida:', email);
        addMessage('error', 'Errore: Email non valida. Torna alla home');
        return;
    }
    socket.send(JSON.stringify({
        type: 'init',
        userId,
        userData: { email, nome, cognome, telefono, PAM: pam, PUNTEGGIO: punteggio, QUIZ_STATUS: quiz_status },
        chatId: userId
    }));
};

socket.onmessage = async (event) => {
    console.log('DEBUG: Messaggio WebSocket grezzo:', event.data);
    try {
        const message = JSON.parse(event.data);
        console.log('DEBUG: Messaggio WebSocket parsato:', JSON.stringify(message, null, 2));

        if (message.type === 'text') {
            console.log('DEBUG: Messaggio di testo ricevuto:', message.content);
            let fullText;
            if (typeof message.content === 'object' && message.content !== null) {
                fullText = message.content.display_text || message.content.speech || '';
            } else {
                fullText = message.content || '';
            }
            console.log('DEBUG: Estratto fullText:', fullText);
            const messageId = crypto.randomUUID();
            const isHTML = /<[a-z][\s\S]*>/i.test(fullText);
            //addMessage('bot', fullText, messageId);
addMessage('bot', '', messageId);
            textQueue.push({ id: messageId, text: fullText, isHTML });
            conversationHistory.push({ role: 'assistant', content: fullText, timestamp: new Date().toISOString() });
            console.log('DEBUG: Cronologia aggiornata:', JSON.stringify(conversationHistory, null, 2));
            if (!audioQueue.length && !isSending) {
                startTypingAnimation();
            }
        } else if (message.type === 'audio') {
            console.log('DEBUG: Audio ricevuto, lunghezza:', message.content.length);
            initializeAudioContext(); // Inizializza prima di aggiungere alla coda
            const blob = base64ToBlob(message.content, 'audio/mpeg');
            if (blob) {
                audioQueue.push(blob);
                if (!currentSource) {
                    await playNextAudioChunkWithOverlap();
                }
            } else {
                console.error('Errore: Blob audio non valido');
                addMessage('error', 'Errore: Audio non valido');
            }
        } else if (message.type === 'stream_end') {
            console.log('DEBUG: Stream end ricevuto');
            isInitialized = true;
            if (audioQueue.length) {
                await playNextAudioChunkWithOverlap();
            } else if (textQueue.length && isInitialized) {
                const nextMessage = textQueue[0];
                if (!processedMessages.has(nextMessage.id)) {
                    console.log('DEBUG: Avvio animazione testo per messageId:', nextMessage.id);
                    startTypingAnimation();
                }
            }
            isSending = false;
            if (sendButton) sendButton.disabled = false;
        } else if (message.type === 'error') {
            console.error('Errore dal server:', message.error);
            addMessage('error', `Errore: ${message.error}`);
            isSending = false;
            if (sendButton) sendButton.disabled = false;
        } else if (message.type === 'status' && message.status === 'init_ok') {
            console.log('DEBUG: Inizializzazione confermata per userId:', message.userId);
            // Ignora status init_ok
        } else {
            console.warn('DEBUG: Messaggio non gestito:', message);
        }
    } catch (err) {
        console.error('Errore parsing WebSocket:', err.message);
        addMessage('error', 'Errore: Impossibile elaborare la risposta del server');
        isSending = false;
        if (sendButton) sendButton.disabled = false;
    }
};

socket.onclose = () => {
    console.log('DEBUG: Connessione WebSocket chiusa at', new Date().toISOString());
    addMessage('error', 'Connessione chiusa. Riprova più tardi');
    if (micButton) {
        micButton.style.display = 'inline';
        micStopButton.style.display = 'none';
    }
    isSending = false;
    if (sendButton) sendButton.disabled = false;
    // Riprova connessione
    setTimeout(() => {
        console.log('DEBUG: Riprovo connessione WebSocket at', new Date().toISOString());
        initializeWebSocket();
    }, 3000);
};

function initializeWebSocket() {
    const newSocket = new WebSocket('wss://backend-quiz-ai.onrender.com/ws');
    newSocket.onopen = socket.onopen;
    newSocket.onmessage = socket.onmessage;
    newSocket.onclose = socket.onclose;
    newSocket.onerror = socket.onerror;
    socket = newSocket;
}

function setupChatForm() {
    if (!chatForm) {
        console.error('Elemento DOM chat-form non trovato');
        return;
    }
    sendButton = document.getElementById('send-button');
    if (!sendButton) {
        console.error('Elemento DOM send-button non trovato');
        return;
    }
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!chatInput.value.trim() || isSending) {
            console.log('DEBUG: Invio bloccato, isSending:', isSending);
            return;
        }
        isSending = true;
        sendButton.disabled = true;
        const message = chatInput.value.trim();
        console.log('DEBUG: Invio messaggio utente:', message);
        addMessage('user', message);
        conversationHistory.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
        console.log('DEBUG: Cronologia aggiornata:', JSON.stringify(conversationHistory, null, 2));
        const indicatorId = 'processing-indicator';
        const existingIndicator = document.getElementById(indicatorId);
        if (existingIndicator) existingIndicator.remove();
        addMessage('processing', 'Sto pensando...<span class="dots">...</span>', indicatorId);
        const payload = {
            prompt: message,
            userData: { email, nome, cognome, telefono, PAM: pam, PUNTEGGIO: punteggio, QUIZ_STATUS: quiz_status },
            chatId: userId,
            history: conversationHistory
        };
        console.log('DEBUG: Payload inviato:', JSON.stringify(payload, null, 2));
        socket.send(JSON.stringify(payload));
        chatInput.value = '';
    });
}

function setupMicButton() {
    if (!micButton || !micStopButton) {
        console.error('Elemento DOM mic-button o mic-stop-button non trovato:', { micButton, micStopButton });
        return;
    }
    micButton.addEventListener('click', () => {
        if (isRecording) {
            console.log('DEBUG: Microfono già in registrazione, ignoro click');
            return;
        }
        console.log('DEBUG: Microfono attivato at', new Date().toISOString());
        micButton.style.display = 'none';
        micStopButton.style.display = 'inline';
        navigator.permissions.query({ name: 'microphone' })
            .then(permissionStatus => {
                console.log('DEBUG: Microphone permission status:', permissionStatus.state);
                if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
                    recognition = startSpeechRecognition(
                        (transcript) => {
                            console.log('DEBUG: Trascrizione:', transcript);
                            chatInput.value = transcript;
                            if (isSending) {
                                console.log('DEBUG: Invio bloccato durante riconoscimento');
                                return;
                            }
                            isSending = true;
                            sendButton.disabled = true;
                            const indicatorId = 'processing-indicator';
                            const existingIndicator = document.getElementById(indicatorId);
                            if (existingIndicator) existingIndicator.remove();
                            addMessage('processing', 'Sto pensando...<span class="dots">...</span>', indicatorId);
                            socket.send(JSON.stringify({
                                prompt: transcript,
                                userData: { email, nome, cognome, telefono, PAM: pam, PUNTEGGIO: punteggio, QUIZ_STATUS: quiz_status },
                                chatId: userId,
                                history: conversationHistory
                            }));
                            console.log('DEBUG: Messaggio microfono inviato');
                            chatInput.value = '';
                            conversationHistory.push({ role: 'user', content: transcript, timestamp: new Date().toISOString() });
                        },
                        (error) => {
                            console.error('Errore riconoscimento vocale:', error);
                            addMessage('error', `Errore riconoscimento vocale: ${error}`);
                            micButton.style.display = 'inline';
                            micStopButton.style.display = 'none';
                            isRecording = false;
                            isSending = false;
                            sendButton.disabled = false;
                        },
                        () => {
                            console.log('DEBUG: Riconoscimento terminato da onend at', new Date().toISOString());
                            micButton.style.display = 'inline';
                            micStopButton.style.display = 'none';
                            isRecording = false;
                        }
                    );
                    isRecording = true;
                } else {
                    console.error('Microphone permission denied');
                    addMessage('error', 'Accesso al microfono negato');
                    micButton.style.display = 'inline';
                    micStopButton.style.display = 'none';
                    isRecording = false;
                }
            })
            .catch(err => {
                console.error('Permission query failed:', err);
                addMessage('error', 'Errore verifica permessi');
                micButton.style.display = 'inline';
                micStopButton.style.display = 'none';
                isRecording = false;
            });
    });

    micStopButton.addEventListener('click', () => {
        if (!isRecording) {
            console.log('DEBUG: Microfono non in registrazione, ignoro click');
            return;
        }
        console.log('DEBUG: Fermo riconoscimento at', new Date().toISOString());
        if (recognition) {
            recognition.stop();
        }
        micButton.style.display = 'inline';
        micStopButton.style.display = 'none';
        isRecording = false;
    });
}

function initializeChat() {
    chatWindow = document.getElementById('chat-window');
    chatForm = document.getElementById('chat-form');
    chatInput = document.getElementById('chat-input');
    micButton = document.getElementById('mic-button');
    micStopButton = document.getElementById('mic-stop-button');
    sendButton = document.getElementById('send-button');

    const missingElements = [];
    if (!chatWindow) missingElements.push('chat-window');
    if (!chatForm) missingElements.push('chat-form');
    if (!chatInput) missingElements.push('chat-input');
    if (!micButton) missingElements.push('mic-button');
    if (!micStopButton) missingElements.push('mic-stop-button');
    if (!sendButton) missingElements.push('send-button');

    if (missingElements.length > 0) {
        console.error('Elementi DOM mancanti:', missingElements);
        addMessage('error', `Errore: Elementi DOM mancanti (${missingElements.join(', ')}). Torna alla <a href="https://backend-quiz-ai.onrender.com/">home</a>.`);
        return false;
    }

    console.log('DEBUG: Tutti gli elementi DOM trovati:', { chatWindow, chatForm, chatInput, micButton, micStopButton, sendButton });
    setupChatForm();
    setupMicButton();
    console.log('DEBUG: Inizializzazione chat completata at', new Date().toISOString());
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    let retries = 0;
    const maxRetries = 5;
    const retryInterval = 500;

    function tryInitialize() {
        if (initializeChat()) {
            return;
        }
        if (retries < maxRetries) {
            retries++;
            console.log(`DEBUG: Riprova inizializzazione (${retries}/${maxRetries})`);
            setTimeout(tryInitialize, retryInterval);
        } else {
            console.error('Errore: Impossibile inizializzare dopo', maxRetries, 'tentativi');
        }
    }

    tryInitialize();
});