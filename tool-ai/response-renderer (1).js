// response-renderer.js

//1. renderAiResponse(responseObj, messageElementId)
//Funzione principale:
//Orchestrazione del rendering sincronizzato tra testo e audio.
//Mostra la risposta AI frase per frase.
//Scarica in parallelo i file audio per ogni frase tramite la utility TTS.
//Fa partire l’audio in sequenza, mostrando ogni frase appena viene letta.
//Garantisce che l’audio sia riprodotto uno alla volta, senza sovrapposizioni.
//Gestisce eventuali errori mostrando tutto il testo come fallback.


import { getAudioForText } from './js/audio/tts-utils.js';
import { playAudioBlob } from './js/audio/audio-player.js';
import { addMessage, typeAiMessage } from './js/ui/chat-ui.js';

// MODIFICA: Debug importazioni
console.log('DEBUG: Importazione addMessage da chat-ui.js completata:', typeof addMessage === 'function');
console.log('DEBUG: Importazione typeAiMessage da chat-ui.js completata:', typeof typeAiMessage === 'function');

// MODIFICA: Funzione per convertire base64 in Blob (aggiunta per compatibilità)
function base64ToBlob(base64, contentType = 'audio/mpeg') {
  try {
    console.log('DEBUG: Conversione base64 in blob');
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
    return null;
  }
}

// MODIFICA: Aggiungo supporto per audio base64 e typing effect
export async function renderAiResponse(responseObj, messageElementId, audioBase64 = null) {
  try {
    const messageDiv = document.getElementById(messageElementId);
    if (!messageDiv) {
      console.error('Elemento non trovato:', messageElementId);
      return;
    }

    const displayText = responseObj.display_text || responseObj.speech || '';
    const speechText = responseObj.speech || responseObj.text || '';

    // MODIFICA: Uso addMessage per aggiungere messaggio bot vuoto
    addMessage('bot', '', messageElementId);

    // Aggiungi messaggio con effetto typing
    await typeAiMessage(messageElementId, displayText);

    // Riproduci audio
    let audioBlob;
    if (audioBase64) {
      audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');
    } else {
      audioBlob = await getAudioForText(speechText);
    }
    if (audioBlob) {
      await playAudioBlob(audioBlob);
    } else {
      console.error('Audio blob non valido');
    }
  } catch (e) {
    console.error('ERRORE DURANTE RENDERING AUDIO:', e);
    throw e;
  }
}