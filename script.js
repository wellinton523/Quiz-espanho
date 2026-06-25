let questoes = {};
let questionKeys = [];
let questionImages = {};
let currentQuestionIndex = 0;
let hintUsed = false;
let currentPlayer = 1;
let timerDuration = 15;
let timerRemaining = timerDuration;
let timerInterval = null;
let timerStartTime = 0;

// Perguntas reserva prontas caso o arquivo questoes.json falhe ou não exista localmente
const fallbackQuestoes = {
  "1": {
    "pergunta": "¿Cómo se dice 'Bom dia' en español?",
    "respostas": "3",
    "1": "Buenas noches",
    "2": "Buenos días",
    "3": "Buenas tardes",
    "respostaCorreta": "2",
    "acerto": "¡Excelente! Muy bien.",
    "erro": "Incorreto. Lo correcto es 'Buenos días'."
  },
  "2": {
    "pergunta": "Traduzca la palabra: 'Coche'",
    "texto": true,
    "respostaCorreta": "carro",
    "acerto": "¡Perfecto!",
    "erro": "Mal. 'Coche' significa carro/automóvel."
  }
};

let playerNames = { 1: "Player 1", 2: "Player 2" };
let playerScores = { 1: 0, 2: 0 };
let playerCorrects = { 1: 0, 2: 0 };
let playerHints = { 1: 3, 2: 3 };
let playerTotalTime = { 1: 0, 2: 0 };

// Seleção dos elementos do DOM
const screenSetup = document.getElementById('screen-setup');
const screenGame = document.getElementById('screen-game');
const screenVictory = document.getElementById('screen-victory');
const inputP1 = document.getElementById('input-p1');
const inputP2 = document.getElementById('input-p2');
const startGameBtn = document.getElementById('start-game-btn');
const restartGameBtn = document.getElementById('restart-game-btn');
const questionText = document.getElementById('question-text');
const answersContainer = document.getElementById('answers-container');
const feedbackText = document.getElementById('feedback-text');
const nextButton = document.getElementById('next-button');
const answerInputWrapper = document.getElementById('answer-input-wrapper');
const answerInput = document.getElementById('answer-input');
const answerSubmit = document.getElementById('answer-submit');
const progressBar = document.getElementById('progress-bar');
const hintButton = document.querySelector('.dicas-b');
const player1El = document.getElementById('display-p1');
const player2El = document.getElementById('display-p2');
const hintNameP1 = document.getElementById('hint-name-p1');
const hintNameP2 = document.getElementById('hint-name-p2');
const hintsCountP1 = document.getElementById('hints-count-p1');
const hintsCountP2 = document.getElementById('hints-count-p2');
const playerIndicator = document.getElementById('player-indicator');
const loadingIndicator = document.getElementById('loading-indicator');
const questionBackground = document.getElementById('question-background');
const timerDisplay = document.getElementById('timer-display');
const timerValue = document.getElementById('timer-value');

// Executa os eventos quando o script carrega completamente
function initEvents() {
  if (hintButton) hintButton.addEventListener('click', useHint);
  if (startGameBtn) startGameBtn.addEventListener('click', startGame);
  if (restartGameBtn) restartGameBtn.addEventListener('click', () => location.reload());
  if (answerSubmit) answerSubmit.addEventListener('click', () => handleAnswer());
  
  if (answerInput) {
    answerInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleAnswer();
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      stopTimer();
      currentQuestionIndex += 1;
      if (currentQuestionIndex >= questionKeys.length) {
        showVictoryScreen();
        return;
      }
      currentPlayer = 3 - currentPlayer;
      renderQuestion();
    });
  }
}

function startGame() {
  playerNames[1] = inputP1.value.trim() || "Player 1";
  playerNames[2] = inputP2.value.trim() || "Player 2";

  if(player1El) player1El.textContent = playerNames[1];
  if(player2El) player2El.textContent = playerNames[2];
  if(hintNameP1) hintNameP1.textContent = playerNames[1];
  if(hintNameP2) hintNameP2.textContent = playerNames[2];

  screenSetup.classList.add('d-none');
  screenGame.classList.remove('d-none');

  loadQuestoes();
}

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
    playerIndicator.style.transform = currentPlayer === 1 ? 'translateX(0%)' : 'translateX(110%)';
  }
  if(hintsCountP1) hintsCountP1.textContent = playerHints[1];
  if(hintsCountP2) hintsCountP2.textContent = playerHints[2];
}

function updateTimerDisplay() {
  if (!timerValue || !timerDisplay) return;
  timerValue.textContent = String(timerRemaining);
  timerDisplay.classList.toggle('active', timerRemaining <= 5);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function handleTimeExpired() {
  stopTimer();
  playerTotalTime[currentPlayer] += timerDuration;
  const key = questionKeys[currentQuestionIndex];
  const question = questoes[key];
  const isTextQuestion = Boolean(question && question.texto);

  if (answerInput) answerInput.disabled = true;
  if (answerSubmit) answerSubmit.disabled = true;
  Array.from(answersContainer.querySelectorAll('button')).forEach((b) => b.disabled = true);

  if (feedbackText) {
    feedbackText.textContent = `${playerNames[currentPlayer]} não respondeu a tempo!`;
    feedbackText.className = 'alert alert-danger';
  }

  if (!isTextQuestion) {
    const correctBtn = answersContainer.querySelector(`button[data-answer-id="${String(question.respostaCorreta)}"]`);
    if (correctBtn) {
      const inner = correctBtn.querySelector('.option-box') || correctBtn.querySelector('div');
      if (inner) inner.className = 'alert alert-success option-box text-start';
    }
  }

  nextButton.classList.remove('d-none');
  if (nextButton) nextButton.focus();
}

function startTimer() {
  stopTimer();
  timerRemaining = timerDuration;
  timerStartTime = Date.now();
  updateTimerDisplay();
  if (timerDisplay) timerDisplay.classList.remove('d-none');

  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
    timerRemaining = Math.max(0, timerDuration - elapsed);
    updateTimerDisplay();
    if (timerRemaining <= 0) {
      handleTimeExpired();
    }
  }, 250);
}

function setQuestionBackground(key) {
  if (!questionBackground || !Array.isArray(questionImages) || questionImages.length === 0) {
    questionBackground.style.backgroundImage = '';
    return;
  }

  const randomImage = questionImages[Math.floor(Math.random() * questionImages.length)];
  const imagePath = randomImage?.src || randomImage?.path || randomImage?.image;
  const correction = Number(randomImage?.sizeCorrection ?? randomImage?.scale ?? randomImage?.size ?? 1);
  let backgroundSize = '80%';

  if (!Number.isNaN(correction)) {
    if (correction > 5) {
      backgroundSize = `${Math.min(110, Math.max(30, correction))}%`;
    } else {
      backgroundSize = `${Math.min(110, Math.max(30, 80 * correction))}%`;
    }
  }

  if (imagePath) {
    questionBackground.style.backgroundImage = `url('${imagePath}')`;
    questionBackground.style.backgroundSize = backgroundSize;
    questionBackground.style.opacity = '1';
  } else {
    questionBackground.style.backgroundImage = '';
    questionBackground.style.opacity = '0';
  }
}

function loadQuestoes() {
  if (loadingIndicator) {
    loadingIndicator.classList.remove('d-none');
    loadingIndicator.setAttribute('aria-hidden', 'false');
  }
  if (startGameBtn) startGameBtn.disabled = true;

  const questionsPromise = fetch('questoes.json')
    .then((response) => {
      if (!response.ok) throw new Error('Não foi possível carregar o arquivo de perguntas.');
      return response.json();
    });

  const imageDataPromise = fetch('questoes-imagens.json')
    .then((response) => {
      if (!response.ok) throw new Error('Não foi possível carregar o arquivo de imagens.');
      return response.json();
    })
    .catch(() => ({}));

  Promise.all([questionsPromise, imageDataPromise])
    .then(([questions, imageData]) => initializeQuiz(questions, imageData))
    .catch((error) => {
      console.warn('Usando perguntas internas de segurança:', error.message);
      initializeQuiz(fallbackQuestoes, {});
    });
}

function initializeQuiz(data, imageData = {}) {
  questoes = data;
  questionImages = imageData || {};
  questionKeys = Object.keys(questoes);
  
  for (let i = questionKeys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questionKeys[i], questionKeys[j]] = [questionKeys[j], questionKeys[i]];
  }

  currentQuestionIndex = 0;
  playerScores[1] = 0;
  playerScores[2] = 0;
  playerCorrects[1] = 0;
  playerCorrects[2] = 0;
  playerTotalTime[1] = 0;
  playerTotalTime[2] = 0;

  if (questionKeys.length === 0) {
    questionText.textContent = 'Nenhuma pergunta disponível.';
    if (loadingIndicator) {
      loadingIndicator.classList.add('d-none');
      loadingIndicator.setAttribute('aria-hidden', 'true');
    }
    if (startGameBtn) startGameBtn.disabled = false;
    return;
  }

  if (loadingIndicator) {
    loadingIndicator.classList.add('d-none');
    loadingIndicator.setAttribute('aria-hidden', 'true');
  }
  if (startGameBtn) startGameBtn.disabled = false;

  renderQuestion();
}

function renderQuestion() {
  const key = questionKeys[currentQuestionIndex];
  const question = questoes[key];

  setQuestionBackground(key);
  questionText.textContent = question.pergunta || 'Pergunta sem texto';
  feedbackText.textContent = 'Sua resposta aparecerá aqui.';
  feedbackText.className = 'card p-2 text-muted';

  const isTextQuestion = Boolean(question.texto);
  answerInputWrapper.classList.toggle('d-none', !isTextQuestion);
  answersContainer.classList.toggle('d-none', isTextQuestion);
  while (answersContainer.firstChild) answersContainer.removeChild(answersContainer.firstChild);

  if (isTextQuestion) {
    answerInput.value = '';
    answerInput.setAttribute('placeholder', `Digite aqui, ${playerNames[currentPlayer]}`);
    answerInput.disabled = false;
    if (answerSubmit) answerSubmit.disabled = false;
  } else {
    if (answerInput) answerInput.disabled = true;
    if (answerSubmit) answerSubmit.disabled = true;
    const totalOptions = Number(question.respostas) || 0;
    for (let i = 1; i <= totalOptions; i++) {
      const optionText = question[String(i)] || '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option w-100 mb-2 border-0 bg-transparent';
      button.dataset.answerId = String(i);

      const optionBox = document.createElement('div');
      optionBox.className = 'alert alert-light option-box mb-0 text-start';
      optionBox.setAttribute('role', 'alert');
      optionBox.textContent = `${String.fromCharCode(64 + i)}: ${optionText}`;

      button.appendChild(optionBox);
      button.addEventListener('click', () => handleAnswer(String(i)));
      answersContainer.appendChild(button);
    }
  }

  nextButton.classList.add('d-none');
  updateProgress();
  
  hintUsed = false;
  if (hintButton) {
    const currentTurnHints = playerHints[currentPlayer];
    hintButton.disabled = currentTurnHints <= 0;
    if (currentTurnHints <= 0) hintButton.classList.add('used-hint');
    else hintButton.classList.remove('used-hint');
  }
  
  updatePlayerUI();
  startTimer();

  // small entrance animations + focus
  if (questionText) {
    questionText.classList.add('fade-in');
    setTimeout(() => questionText.classList.remove('fade-in'), 400);
  }
  if (!isTextQuestion) {
    // focus first available answer
    const firstBtn = answersContainer.querySelector('button:not([disabled])');
    if (firstBtn) firstBtn.focus();
    answersContainer.classList.add('slide-up');
    setTimeout(() => answersContainer.classList.remove('slide-up'), 450);
  } else {
    if (answerInput) answerInput.focus();
  }
}

function useHint() {
  if (playerHints[currentPlayer] <= 0) return;

  const key = questionKeys[currentQuestionIndex];
  const question = questoes[key];
  if (!question || Boolean(question.texto)) return;

  const buttons = Array.from(answersContainer.querySelectorAll('button'));
  const incorrect = buttons.filter((b) => b.dataset.answerId !== String(question.respostaCorreta));
  if (incorrect.length === 0) return;

  for (let i = incorrect.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [incorrect[i], incorrect[j]] = [incorrect[j], incorrect[i]];
  }

  const toHide = Math.min(2, incorrect.length);
  for (let i = 0; i < toHide; i++) {
    const btn = incorrect[i];
    if (btn) {
      const inner = btn.querySelector('.option-box') || btn.querySelector('div');
      if (inner) inner.className = 'alert alert-dark option-box text-start text-decoration-line-through text-muted';
      btn.disabled = true;
    }
  }

  playerHints[currentPlayer] = Math.max(0, playerHints[currentPlayer] - 1);
  hintUsed = true;
  
  if (hintButton) {
    hintButton.disabled = true;
    hintButton.classList.add('used-hint');
  }
  
  updatePlayerUI();
}

function updateProgress() {
  if (!progressBar) return;
  const total = questionKeys.length || 1;
  const percent = Math.round((currentQuestionIndex / total) * 100);
  progressBar.style.width = percent + '%';
  progressBar.setAttribute('aria-valuenow', String(percent));
}

function handleAnswer(answerValue) {
  stopTimer();
  const timeUsed = timerDuration - timerRemaining;
  playerTotalTime[currentPlayer] += timeUsed;
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

  if (!isTextQuestion && hintUsed && !isCorrect) {
    const btn = answersContainer.querySelector(`button[data-answer-id="${submittedAnswer}"]`);
    if (btn && !btn.disabled) {
      if (Math.random() < 0.5) isCorrect = true;
    }
  }

  if (!isTextQuestion) {
    const selectedBtn = answersContainer.querySelector(`button[data-answer-id="${submittedAnswer}"]`);
    Array.from(answersContainer.querySelectorAll('button')).forEach((b) => b.disabled = true);

    if (selectedBtn) {
      const inner = selectedBtn.querySelector('.option-box') || selectedBtn.querySelector('div');
      if (inner) {
        if (isCorrect) inner.className = 'alert alert-success option-box text-start';
        else inner.className = 'alert alert-danger option-box text-start';
      }
    }
  } else {
    answerInput.disabled = true;
    if (answerSubmit) answerSubmit.disabled = true;
  }

  if (isCorrect) {
    const timeBonus = Math.max(1, timerRemaining);
    const pointsEarned = 1 + timeBonus;
    playerCorrects[currentPlayer]++;
    playerScores[currentPlayer] += pointsEarned;

    feedbackText.textContent = `${playerNames[currentPlayer]} acertou! +${pointsEarned} pontos (${timeBonus} por tempo)`;
    feedbackText.className = 'alert alert-success';
    feedbackText.classList.add('pulse');
    setTimeout(() => feedbackText.classList.remove('pulse'), 700);
  } else {
    feedbackText.textContent = `${playerNames[currentPlayer]} ` + (question.erro || 'Resposta incorreta.');
    feedbackText.className = 'alert alert-danger';
    feedbackText.classList.add('pulse');
    setTimeout(() => feedbackText.classList.remove('pulse'), 700);
  }

  nextButton.classList.remove('d-none');
  if (nextButton) nextButton.focus();
}

function showVictoryScreen() {
  screenGame.classList.add('d-none');
  screenVictory.classList.remove('d-none');

  const scoreP1El = document.getElementById('score-p1');
  const scoreP2El = document.getElementById('score-p2');
  const victoryTitle = document.getElementById('victory-title');

  scoreP1El.textContent = `${playerNames[1]}: ${playerScores[1]} pontos (${playerCorrects[1]} acertos)`;
  scoreP2El.textContent = `${playerNames[2]}: ${playerScores[2]} pontos (${playerCorrects[2]} acertos)`;

  if (playerScores[1] > playerScores[2]) {
    victoryTitle.textContent = `¡Vitória de ${playerNames[1]}! 🏆`;
  } else if (playerScores[2] > playerScores[1]) {
    victoryTitle.textContent = `¡Vitória de ${playerNames[2]}! 🏆`;
  } else {
    if (playerCorrects[1] > playerCorrects[2]) {
      victoryTitle.textContent = `¡Vitória de ${playerNames[1]} por acertos! 🏆`;
    } else if (playerCorrects[2] > playerCorrects[1]) {
      victoryTitle.textContent = `¡Vitória de ${playerNames[2]} por acertos! 🏆`;
    } else if (playerTotalTime[1] < playerTotalTime[2]) {
      victoryTitle.textContent = `¡Vitória de ${playerNames[1]} por tempo! 🏆`;
    } else if (playerTotalTime[2] < playerTotalTime[1]) {
      victoryTitle.textContent = `¡Vitória de ${playerNames[2]} por tempo! 🏆`;
    } else {
      victoryTitle.textContent = "Empate Técnico! 🤝";
    }
  }
}

// Inicializa os escutadores de eventos assim que o script carregar
initEvents();
