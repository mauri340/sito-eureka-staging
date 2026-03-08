// ui-utils.js
export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const toShow = document.getElementById(screenId);
  if (toShow) toShow.classList.add('active');
}

export function setupQuizPage(quizData) {
  document.getElementById('reading-title').textContent = quizData.titolo;
  document.getElementById('reading-text').innerHTML = quizData.testoHTML;
  // Render domande...
  const questionsForm = document.getElementById('questions-form');
  const submitButton = questionsForm.querySelector('button');
  const fragment = document.createDocumentFragment();
  quizData.domande.forEach((q, i) => {
    const block = document.createElement('div');
    block.className = 'question-block';
    let opts = q.opzioni.map((opt, j) =>
      `<label><input type="radio" name="q${i+1}" value="${String.fromCharCode(97+j)}"> ${opt}</label>`
    ).join('');
    block.innerHTML = `<p>${i+1}. ${q.domanda}</p>${opts}`;
    fragment.appendChild(block);
  });
  questionsForm.innerHTML = '';
  questionsForm.appendChild(fragment);
  if (submitButton) questionsForm.appendChild(submitButton);
}
