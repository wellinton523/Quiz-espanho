let questoes = {};
let questionKeys = [];
let currentQuestionIndex = 0;
let hintUsed = false;
let currentPlayer = 1; // 1 ou 2

// Sistema de nomes e pontuação
let playerNames = { 1: "Player 1", 2: "Player 2" };
let playerScores = { 1: 0, 2: 0 };
let playerHints = { 1: 3, 2: 3 }; // 3 dicas independentes para cada um

// Elementos das Telas
const screenSetup = document.getElementById('screen-setup');
const screenGame = document.getElementById('screen-game');
const screenVictory = document.getElementById('screen-victory');

// Inputs de nomes e botões de tela
const inputP1 = document.getElementById('input-p1');
const inputP2 = document.getElementById('input-p2');
const startGameBtn = document.getElementById('start-game-btn');
const restartGameBtn = document.getElementById('restart-game-btn');

// Elementos do Jogo
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

// Configurações Iniciais de Eventos
if (hintButton) hintButton.addEventListener('click', useHint);
startGameBtn.addEventListener('click', startGame);
restartGameBtn.addEventListener('click', () => location.reload()); // Reinicia o app do zero

function startGame() {
  // Coleta os nomes digitados (usa padrão se estiver vazio)
  playerNames[1] = inputP1.value.trim() || "Player 1";
  playerNames[2] = inputP2.value.trim() || "Player 2";

  // Atualiza os textos da interface do jogo com os nomes reais
  player1El.textContent = playerNames[1];
  player2El.textContent = playerNames[2];
  hintNameP1.textContent = playerNames[1];
  hintNameP2.textContent = playerNames[2];

  // Alterna as telas
  screenSetup.classList.add('d-none');
  screenGame.classList.remove('d-none');

  // Começa o Quiz carregando os dados externos
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

  // Atualiza exibição visual das dicas numéricas
  hintsCountP1.textContent = playerHints[1];
  hintsCountP2.textContent = playerHints[2];
}

function loadQuestoes() {
  fetch('questoes.json')
    .then((response) => {
      if (!response.ok) throw new Error('Não foi possível carregar questoes.json');
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
  questionKeys = Object.keys(questoes);
  
  // Algoritmo Fisher-Yates para misturar as perguntas sem repetir
  for (let i = questionKeys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questionKeys[i], questionKeys[j]] = [questionKeys[j], questionKeys[i]];
  }

  currentQuestionIndex = 0;
  playerScores[1] = 0;
  playerScores[2] = 0;

  if (questionKeys.length === 0) {
    questionText.textContent = 'Nenhuma pergunta disponível.';
    return;
  }

  renderQuestion();
}

function renderQuestion() {
  const key = questionKeys[currentQuestionIndex];
  const question = questoes[key];

  questionText.textContent = question.pergunta || 'Pergunta sem texto';
  feedbackText.textContent = 'Sua resposta aparecerá aqui.';
  feedbackText.className = 'card p-2 text-muted';

  const isTextQuestion = Boolean(question.texto);
  answerInputWrapper.classList.toggle('d-none', !isTextQuestion);
  answersContainer.classList.toggle('d-none', isTextQuestion);
  answersContainer.innerHTML = '';

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
      button.innerHTML = `<div class="alert alert-light option-box mb-0 text-start" role="alert">${String.fromCharCode(64 + i)}: ${optionText}</div>`;
      button.dataset.answerId = String(i);
      button.addEventListener('click', () => handleAnswer(String(i)));
      answersContainer.appendChild(button);
    }
  }

  nextButton.classList.add('d-none');
  updateProgress();
  
  // Reseta estado da dica da rodada baseada no estoque do jogador atual
  hintUsed = false;
  if (hintButton) {
    const currentTurnHints = playerHints[currentPlayer];
    hintButton.disabled = currentTurnHints <= 0;
    if (currentTurnHints <= 0) hintButton.classList.add('used-hint');
    else hintButton.classList.remove('used-hint');
  }
  
  updatePlayerUI();
}

function useHint() {
  // Verifica se o jogador da vez tem saldo de dicas
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

  // Deduz 1 dica apenas do estoque do jogador atual
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
    feedbackText.textContent = `[${playerNames[currentPlayer]}] ` + (question.acerto || 'Acertou!');
    feedbackText.className = 'alert alert-success';
    // Adiciona ponto para quem acertou
    playerScores[currentPlayer]++;
  } else {
    feedbackText.textContent = `[${playerNames[currentPlayer]}] ` + (question.erro || 'Resposta incorreta.');
    feedbackText.className = 'alert alert-danger';
  }

  nextButton.classList.remove('d-none');
}

function showVictoryScreen() {
  screenGame.classList.add('d-none');
  screenVictory.classList.remove('d-none');

  const scoreP1El = document.getElementById('score-p1');
  const scoreP2El = document.getElementById('score-p2');
  const victoryTitle = document.getElementById('victory-title');

  scoreP1El.textContent = `${playerNames[1]}: ${playerScores[1]} acerto(s)`;
  scoreP2El.textContent = `${playerNames[2]}: ${playerScores[2]} acerto(s)`;

  // Define o texto do vencedor
  if (playerScores[1] > playerScores[2]) {
    victoryTitle.innerHTML = `¡Vitória de <span class="text-success">${playerNames[1]}</span>! 🏆`;
  } else if (playerScores[2] > playerScores[1]) {
    victoryTitle.innerHTML = `¡Vitória de <span class="text-success">${playerNames[2]}</span>! 🏆`;
  } else {
    victoryTitle.textContent = "Empate Técnico! 🤝";
  }
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
  
  // Se as perguntas acabarem, finaliza o jogo mostrando a tela de vitória
  if (currentQuestionIndex >= questionKeys.length) {
    showVictoryScreen();
    return;
  }
  
  // Passa o controle para o outro player apenas na troca de pergunta
  currentPlayer = 3 - currentPlayer;
  renderQuestion();
});
