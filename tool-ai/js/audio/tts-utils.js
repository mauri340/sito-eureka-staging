// MODIFICA: Aggiungo gestione errori robusta per richiesta audio
// MODIFICA: Aggiungo gestione errori robusta e timeout
export async function getAudioForText(text) {
  if (!text) throw new Error('Testo richiesto');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout 10s

  try {
    const res = await fetch('http://localhost:3002/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Errore richiesta audio: ${res.status} - ${errorText || res.statusText}`);
    }

    return await res.blob();
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// Supporta richiesta in parallelo di più frasi (stile karaoke)
export async function getAudioForSentences(sentences) {
  return Promise.all(sentences.map(getAudioForText));
}