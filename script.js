let questoes = {};
let questionKeys = [];
let currentQuestionIndex = 0;
let hintUsed = false;
let hintsLeft = 3;
let currentPlayer = 1; // 1 or 2

const questionText = document.getElementById('question-text');
const answersContainer = document.getElementById('answers-container');
const feedbackText = document.getElementById('feedback-text');
const nextButton = document.getElementById('next-button');
const answerInputWrapper = document.getElementById('answer-input-wrapper');
const answerInput = document.getElementById('answer-input');
const answerSubmit = document.getElementById('answer-submit');
const progressBar = document.getElementById('progress-bar');
const hintButton = document.querySelector('.dicas-b');
if (hintButton) hintButton.addEventListener('click', useHint);
const player1El = document.querySelector('.Player1');
const player2El = document.querySelector('.Player2');
const playerIndicator = document.getElementById('player-indicator');

function updatePlayerUI() {
  if (player1El) {
    player1El.classList.toggle('quiz', currentPlayer === 1);
    player1El.classList.toggle('inactive', currentPlayer !== 1);
  }
  if (player2El) {
    player2El.classList.toggle('quiz', currentPlayer === 2);
    player2El.classList.toggle('inactive', currentPlayer !== 2);
  }
  if (playerIndicator) {
    // move indicator under player 1 (0%) or player 2 (100%)
    playerIndicator.style.transform = currentPlayer === 1 ? 'translateX(0%)' : 'translateX(110%)';
  }
}

function loadQuestoes() {
  fetch('questoes.json')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Não foi possível carregar questoes.json');
      }
      return response.json();
    })
    .then((data) => initializeQuiz(data))
    .catch((error) => {
      console.warn('Falha ao carregar questoes.json, usando dados internos:', error);
      initializeQuiz(fallbackQuestoes);
    });
}

function initializeQuiz(data) {
  questoes = data;
  
  // Pega as chaves originais do JSON
  questionKeys = Object.keys(questoes);
  
  // Algoritmo de Fisher-Yates para embaralhar as perguntas e evitar repetições
  for (let i = questionKeys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questionKeys[i], questionKeys[j]] = [questionKeys[j], questionKeys[i]];
  }

  currentQuestionIndex = 0;

  if (questionKeys.length === 0) {
    questionText.textContent = 'Nenhuma pergunta disponível.';
    return;
  }

  renderQuestion();
  updateProgress();
}

function renderQuestion() {
  const key = questionKeys[currentQuestionIndex];
  const question = questoes[key];

  questionText.textContent = question.pergunta || 'Pergunta sem texto';
  feedbackText.textContent = '';
  feedbackText.className = '';

  const isTextQuestion = Boolean(question.texto);
  answerInputWrapper.classList.toggle('d-none', !isTextQuestion);
  answersContainer.classList.toggle('d-none', isTextQuestion);
  answersContainer.innerHTML = '';

  if (isTextQuestion) {
    answerInput.value = '';
    answerInput.setAttribute('placeholder', 'Digite sua resposta aqui');
    answerInput.disabled = false;
    if (answerSubmit) answerSubmit.disabled = false;
  } else {
    // ensure text input is disabled for choice questions
    if (answerInput) answerInput.disabled = true;
    if (answerSubmit) answerSubmit.disabled = true;
    const totalOptions = Number(question.respostas) || 0;
    for (let i = 1; i <= totalOptions; i++) {
      const optionText = question[String(i)] || '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option';
      button.innerHTML = `<div class="alert alert-light option-box" role="alert">${String.fromCharCode(64 + i)}: ${optionText}</div>`;
      button.dataset.answerId = String(i);
      button.addEventListener('click', () => handleAnswer(String(i)));
      answersContainer.appendChild(button);
    }
  }

  nextButton.classList.add('d-none');
  updateProgress();
  // reset hint state and show hint button
  hintUsed = false;
  if (hintButton) {
    // enable hint only if there are hints remaining
    hintButton.disabled = hintsLeft <= 0;
    if (hintsLeft <= 0) hintButton.classList.add('used-hint');
    else hintButton.classList.remove('used-hint');
  }
  // update which player is active for this question
  updatePlayerUI();
}

function useHint() {
  const key = questionKeys[currentQuestionIndex];
  const question = questoes[key];
  if (!question || Boolean(question.texto)) return;

  const totalOptions = Number(question.respostas) || 0;
  // collect incorrect option buttons
  const buttons = Array.from(answersContainer.querySelectorAll('button'));
  const incorrect = buttons.filter((b) => b.dataset.answerId !== String(question.respostaCorreta));
  if (incorrect.length === 0) return;

  // shuffle incorrect and hide up to two
  for (let i = incorrect.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [incorrect[i], incorrect[j]] = [incorrect[j], incorrect[i]];
  }

  const toHide = Math.min(2, incorrect.length);
  for (let i = 0; i < toHide; i++) {
    const btn = incorrect[i];
    if (btn) {
      // mark visually as removed and disable the button
      const inner = btn.querySelector('.option-box') || btn.querySelector('div');
      if (inner) inner.className = 'alert alert-dark option-box';
      btn.disabled = true;
    }
  }

  // consume one hint for the whole quiz and disable for this question
  hintsLeft = Math.max(0, hintsLeft - 1);
  hintUsed = true;
  if (hintButton) {
    hintButton.disabled = true;
    hintButton.classList.add('used-hint');
  }
}

function updateProgress() {
  if (!progressBar) return;
  const total = questionKeys.length || 1;
  const percent = Math.round((currentQuestionIndex / total) * 100);
  progressBar.style.width = percent + '%';
  progressBar.setAttribute('aria-valuenow', String(percent));
}

function handleAnswer(answerValue) {
  const key = questionKeys[currentQuestionIndex];
  const question = questoes[key];
  const isTextQuestion = Boolean(question.texto);
  const correctAnswer = String(question.respostaCorreta || '').trim();

  let submittedAnswer = answerValue;
  if (isTextQuestion) {
    submittedAnswer = (answerInput.value || '').trim();
  }

  let isCorrect = isTextQuestion
    ? submittedAnswer.toLowerCase() === correctAnswer.toLowerCase()
    : submittedAnswer === correctAnswer;

  // If hint was used for this question and it's a choice question,
  // give 50% chance of success when selecting a wrong remaining option.
  if (!isTextQuestion && hintUsed && !isCorrect) {
    // Only apply if the selected button is still visible
    const btn = answersContainer.querySelector(`button[data-answer-id="${submittedAnswer}"]`);
    const visible = Boolean(btn && !btn.disabled);
    if (visible) {
      if (Math.random() < 0.5) {
        isCorrect = true;
      }
    }
  }

  // For choice questions: color the selected option and disable all options
  if (!isTextQuestion) {
    const selectedBtn = answersContainer.querySelector(`button[data-answer-id="${submittedAnswer}"]`);
    const allButtons = Array.from(answersContainer.querySelectorAll('button'));
    allButtons.forEach((b) => b.disabled = true);

    if (selectedBtn) {
      const inner = selectedBtn.querySelector('.option-box') || selectedBtn.querySelector('div');
      if (inner) {
        if (isCorrect) inner.className = 'alert alert-success option-box';
        else inner.className = 'alert alert-danger option-box';
      }
    }
  } else {
    // For text input questions, mark feedbackText already uses alert classes above
    answerInput.disabled = true;
  }

  if (isCorrect) {
    feedbackText.textContent = question.acerto || 'Acertou!';
    feedbackText.className = 'alert alert-success';
  } else {
    feedbackText.textContent = question.erro || 'Resposta incorreta.';
    feedbackText.className = 'alert alert-danger';
  }

  nextButton.classList.remove('d-none');
  // alternate player for next question
  currentPlayer = 3 - currentPlayer;
}

answerSubmit.addEventListener('click', () => handleAnswer());
answerInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleAnswer();
  }
});
nextButton.addEventListener('click', () => {
  currentQuestionIndex += 1;
  if (currentQuestionIndex >= questionKeys.length) {
    currentQuestionIndex = 0;
  }
  renderQuestion();
});

document.addEventListener('DOMContentLoaded', loadQuestoes);
