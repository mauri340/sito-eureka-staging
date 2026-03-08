// ai-integration.js
export async function callAiAndRenderResponse(userInput, userData, appState) {
  // Chiamata a backend AI/chat, logica di rendering risposta
  // Esempio fetch:
  const response = await fetch('https://backend-quiz-ai.onrender.com/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput, userData, history: appState.chat.history })
  });
  const aiResponse = await response.json();
  // Mostra risposta su chat-history o altro elemento
  // ...render logic
  return aiResponse;
}
