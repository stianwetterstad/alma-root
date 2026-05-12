const MAX_LEVEL = 12;
const QUESTIONS_PER_LEVEL = 3;
const MAX_FALLS = 3;
const HIGHSCORE_LIMIT = 10;
const STORAGE_KEY = "delingsduellen_highscores_v1";

const state = {
  running: false,
  score: 0,
  level: 1,
  bestLevel: 1,
  streak: 0,
  levelMistakes: 0,
  falls: 0,
  questionIndex: 0,
  currentQuestion: null,
  questionStartAt: 0,
  timerRafId: null,
  highscores: [],
  scoreSaved: false,
  firebase: {
    enabled: false,
    db: null,
    addDoc: null,
    collection: null,
    getDocs: null,
    query: null,
    orderBy: null,
    limit: null,
    serverTimestamp: null
  }
};

const el = {
  scoreValue: document.getElementById("scoreValue"),
  levelValue: document.getElementById("levelValue"),
  streakValue: document.getElementById("streakValue"),
  timerValue: document.getElementById("timerValue"),
  levelMistakesValue: document.getElementById("levelMistakesValue"),
  fallsValue: document.getElementById("fallsValue"),
  bestLevelValue: document.getElementById("bestLevelValue"),
  progressLabel: document.getElementById("progressLabel"),
  progressFill: document.getElementById("progressFill"),
  modeLabel: document.getElementById("modeLabel"),
  questionLabel: document.getElementById("questionLabel"),
  statusLine: document.getElementById("statusLine"),
  answers: document.getElementById("answers"),
  questionCard: document.getElementById("questionCard"),
  tower: document.getElementById("tower"),
  startBtn: document.getElementById("startBtn"),
  restartBtn: document.getElementById("restartBtn"),
  gameOverOverlay: document.getElementById("gameOverOverlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlaySummary: document.getElementById("overlaySummary"),
  playAgainBtn: document.getElementById("playAgainBtn"),
  saveArea: document.getElementById("saveArea"),
  nameInput: document.getElementById("nameInput"),
  saveScoreBtn: document.getElementById("saveScoreBtn"),
  highscoreSource: document.getElementById("highscoreSource"),
  highscoreList: document.getElementById("highscoreList")
};

let audioContext = null;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeLevel(level) {
  return Math.max(1, Math.min(MAX_LEVEL, level));
}

function isBossLevel(level) {
  return level % 3 === 0;
}

function levelRange(level) {
  const isBoss = isBossLevel(level);
  const minDividend = Math.max(6, level * 4);
  // Boss levels have significantly larger range for harder questions
  const baseDividendRange = 20 + level * 2;
  const maxDividend = Math.min(12 * 12, minDividend + (isBoss ? baseDividendRange * 1.8 : baseDividendRange));
  return { minDividend, maxDividend };
}

function buildQuestion(level) {
  const divisors = [];
  for (let i = 2; i <= 12; i += 1) {
    divisors.push(i);
  }

  const { minDividend, maxDividend } = levelRange(level);
  const divisor = divisors[randomInt(0, divisors.length - 1)];
  const minQuotient = Math.max(1, Math.floor(minDividend / divisor));
  const maxQuotient = Math.max(minQuotient + 1, Math.floor(maxDividend / divisor));
  const quotient = randomInt(minQuotient, maxQuotient);
  const dividend = divisor * quotient;

  const options = new Set([quotient]);
  // Boss levels have much tougher wrong answer options
  const deltaMax = isBossLevel(level) ? 14 : 6;

  while (options.size < 4) {
    const delta = randomInt(1, deltaMax);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const candidate = Math.max(0, quotient + sign * delta);
    if (candidate !== quotient) {
      options.add(candidate);
    }
  }

  return {
    dividend,
    divisor,
    correct: quotient,
    options: shuffle([...options])
  };
}

function updateTimer() {
  if (!state.running || !state.currentQuestion) {
    return;
  }
  const elapsedMs = Date.now() - state.questionStartAt;
  el.timerValue.textContent = `${(elapsedMs / 1000).toFixed(1)}s`;
  state.timerRafId = requestAnimationFrame(updateTimer);
}

function setStatus(message, tone = "") {
  el.statusLine.className = "status-line";
  if (tone) {
    el.statusLine.classList.add(tone);
  }
  el.statusLine.textContent = message;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTower() {
  el.tower.innerHTML = "";
  for (let i = MAX_LEVEL; i >= 1; i -= 1) {
    const step = document.createElement("div");
    step.className = "tower-step";
    step.textContent = isBossLevel(i) ? `Boss ${i}` : `Niva ${i}`;

    if (i < state.level) {
      step.classList.add("done");
    }
    if (i === state.level && state.running) {
      step.classList.add("current");
    }
    if (i === state.level && isBossLevel(i) && state.running) {
      step.classList.add("boss");
    }

    el.tower.appendChild(step);
  }
}

function updateStatsUi() {
  el.scoreValue.textContent = String(state.score);
  el.levelValue.textContent = String(state.level);
  el.streakValue.textContent = String(state.streak);
  el.levelMistakesValue.textContent = String(state.levelMistakes);
  el.fallsValue.textContent = String(state.falls);
  el.bestLevelValue.textContent = String(state.bestLevel);
  el.progressLabel.textContent = `Oppgave ${Math.min(state.questionIndex + 1, QUESTIONS_PER_LEVEL)} av ${QUESTIONS_PER_LEVEL}`;
  el.progressFill.style.width = `${(state.questionIndex / QUESTIONS_PER_LEVEL) * 100}%`;
}

function lockAnswerButtons(locked) {
  const buttons = el.answers.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = locked;
  });
}

function renderQuestion() {
  if (!state.currentQuestion) {
    el.questionLabel.textContent = "Trykk start for a spille";
    el.answers.innerHTML = "";
    el.questionCard.classList.remove('boss-round');
    return;
  }

  const q = state.currentQuestion;
  el.modeLabel.textContent = isBossLevel(state.level) ? "Boss-runde" : "Vanlig runde";
  el.questionLabel.textContent = `${q.dividend} / ${q.divisor} = ?`;
  el.answers.innerHTML = "";
  
  // Add boss styling for boss rounds
  if (isBossLevel(state.level)) {
    el.questionCard.classList.add('boss-round');
  } else {
    el.questionCard.classList.remove('boss-round');
  }

  q.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-btn";
    button.textContent = String(option);
    button.addEventListener("click", () => handleAnswer(option, button));
    el.answers.appendChild(button);
  });
}

function nextQuestion() {
  state.currentQuestion = buildQuestion(state.level);
  state.questionStartAt = Date.now();
  el.timerValue.textContent = "0.0s";
  renderQuestion();
  if (state.timerRafId) {
    cancelAnimationFrame(state.timerRafId);
  }
  state.timerRafId = requestAnimationFrame(updateTimer);
}

function scoreForCorrect(elapsedMs) {
  const speedBonus = Math.max(20, 260 - Math.floor(elapsedMs / 18));
  const levelBonus = state.level * 20;
  const streakBonus = Math.min(220, state.streak * 16);
  const bossBonus = isBossLevel(state.level) ? 90 : 0;
  return 80 + speedBonus + levelBonus + streakBonus + bossBonus;
}

function penaltyForFirstMistake() {
  return 40 + state.level * 8;
}

function penaltyForSecondMistake() {
  return 75 + state.level * 12;
}

function flashButton(button, good) {
  button.classList.add(good ? "good" : "bad");
}

function beep(type) {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    const now = audioContext.currentTime;
    if (type === "good") {
      oscillator.frequency.setValueAtTime(620, now);
      oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    } else {
      oscillator.frequency.setValueAtTime(320, now);
      oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.18);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    }

    oscillator.type = type === "good" ? "triangle" : "sawtooth";
    oscillator.start(now);
    oscillator.stop(now + (type === "good" ? 0.16 : 0.24));
  } catch (_error) {
    // Audio can fail on restricted devices; gameplay should still continue.
  }
}

function finishLevelIfNeeded() {
  if (state.questionIndex < QUESTIONS_PER_LEVEL) {
    return false;
  }

  if (state.level >= MAX_LEVEL) {
    finishGame(true);
    return true;
  }

  state.level = normalizeLevel(state.level + 1);
  state.bestLevel = Math.max(state.bestLevel, state.level);
  state.levelMistakes = 0;
  state.questionIndex = 0;
  setStatus(`Bra! Du rykket opp til niva ${state.level}.`, "good");
  updateStatsUi();
  renderTower();
  nextQuestion();
  return true;
}

function handleAnswer(value, button) {
  if (!state.running || !state.currentQuestion) {
    return;
  }

  lockAnswerButtons(true);
  const elapsedMs = Date.now() - state.questionStartAt;

  if (value === state.currentQuestion.correct) {
    flashButton(button, true);
    beep("good");
    state.streak += 1;
    const points = scoreForCorrect(elapsedMs);
    state.score += points;
    state.questionIndex += 1;
    setStatus(`Riktig! +${points} poeng.`, "good");
    updateStatsUi();

    if (finishLevelIfNeeded()) {
      return;
    }

    setTimeout(() => {
      if (!state.running) {
        return;
      }
      nextQuestion();
      updateStatsUi();
    }, 220);
    return;
  }

  flashButton(button, false);
  beep("bad");
  state.streak = 0;
  state.levelMistakes += 1;

  if (state.levelMistakes === 1) {
    const penalty = penaltyForFirstMistake();
    state.score = Math.max(0, state.score - penalty);
    setStatus(`Feil! -${penalty} poeng. Ett forsok igjen pa dette nivaet.`, "warn");
    updateStatsUi();
    setTimeout(() => {
      if (!state.running) {
        return;
      }
      nextQuestion();
      updateStatsUi();
    }, 280);
    return;
  }

  const penalty = penaltyForSecondMistake();
  state.score = Math.max(0, state.score - penalty);
  state.falls += 1;
  state.level = normalizeLevel(state.level - 1);
  state.levelMistakes = 0;
  state.questionIndex = 0;

  if (state.falls >= MAX_FALLS) {
    setStatus(`Andre feil! -${penalty} poeng. Du falt for langt.`, "bad");
    updateStatsUi();
    finishGame(false);
    return;
  }

  setStatus(`Andre feil! -${penalty} poeng. Du falt ned til niva ${state.level}.`, "bad");
  updateStatsUi();
  renderTower();
  setTimeout(() => {
    if (!state.running) {
      return;
    }
    nextQuestion();
    updateStatsUi();
  }, 320);
}

function normalizeScoreEntry(entry) {
  return {
    name: String(entry.name || "Spiller").slice(0, 18),
    score: Math.max(0, Number(entry.score) || 0),
    level: normalizeLevel(Number(entry.level) || 1),
    streak: Math.max(0, Number(entry.streak) || 0),
    createdAt: Number(entry.createdAt) || Date.now()
  };
}

function sortScores(entries) {
  return [...entries]
    .map(normalizeScoreEntry)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.createdAt - b.createdAt;
    })
    .slice(0, HIGHSCORE_LIMIT);
}

function readLocalHighscores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeScoreEntry);
  } catch (_error) {
    return [];
  }
}

function writeLocalHighscores(scores) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores.slice(0, HIGHSCORE_LIMIT)));
}

function isHighscore(score) {
  if (score <= 0) {
    return false;
  }
  if (state.highscores.length < HIGHSCORE_LIMIT) {
    return true;
  }
  return score > state.highscores[state.highscores.length - 1].score;
}

function renderHighscores() {
  el.highscoreList.innerHTML = "";
  if (state.highscores.length === 0) {
    const empty = document.createElement("li");
    empty.innerHTML = "<span>-</span><div><strong>Ingen highscores enda</strong><p>Bli den forste!</p></div><b>0</b>";
    el.highscoreList.appendChild(empty);
    return;
  }

  state.highscores.forEach((entry, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${index + 1}</span><div><strong>${escapeHtml(entry.name)}</strong><p>Niva ${entry.level} | Streak ${entry.streak}</p></div><b>${entry.score}</b>`;
    el.highscoreList.appendChild(li);
  });
}

async function initFirebaseIfConfigured() {
  const config = window.ALMA_FIREBASE_CONFIG;
  if (!config || !config.apiKey || !config.projectId) {
    el.highscoreSource.textContent = "Lokal highscore (Firebase ikke satt opp enda).";
    return;
  }

  try {
    const [appModule, firestoreModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js")
    ]);

    const app = appModule.initializeApp(config);
    const db = firestoreModule.getFirestore(app);

    state.firebase.enabled = true;
    state.firebase.db = db;
    state.firebase.addDoc = firestoreModule.addDoc;
    state.firebase.collection = firestoreModule.collection;
    state.firebase.getDocs = firestoreModule.getDocs;
    state.firebase.query = firestoreModule.query;
    state.firebase.orderBy = firestoreModule.orderBy;
    state.firebase.limit = firestoreModule.limit;
    state.firebase.serverTimestamp = firestoreModule.serverTimestamp;

    el.highscoreSource.textContent = "Firebase highscore aktiv.";
  } catch (error) {
    console.error("Firebase init feilet:", error);
    el.highscoreSource.textContent = "Lokal highscore (Firebase utilgjengelig akkurat na).";
  }
}

async function loadHighscores() {
  const local = readLocalHighscores();

  if (!state.firebase.enabled) {
    state.highscores = sortScores(local);
    renderHighscores();
    return;
  }

  try {
    const highscoreQuery = state.firebase.query(
      state.firebase.collection(state.firebase.db, "delingsduellen_highscores"),
      state.firebase.orderBy("score", "desc"),
      state.firebase.limit(HIGHSCORE_LIMIT)
    );
    const snap = await state.firebase.getDocs(highscoreQuery);
    const remote = snap.docs.map((doc) => {
      const data = doc.data();
      return normalizeScoreEntry({
        name: data.name,
        score: data.score,
        level: data.level,
        streak: data.streak,
        createdAt: data.createdAt?.toMillis?.() || Date.now()
      });
    });

    state.highscores = sortScores([...remote, ...local]);
    renderHighscores();
  } catch (error) {
    console.error("Kunne ikke hente Firebase-highscores:", error);
    state.highscores = sortScores(local);
    renderHighscores();
  }
}

async function saveHighscore(name) {
  const entry = normalizeScoreEntry({
    name,
    score: state.score,
    level: state.bestLevel,
    streak: state.streak,
    createdAt: Date.now()
  });

  const mergedLocal = sortScores([...readLocalHighscores(), entry]);
  writeLocalHighscores(mergedLocal);

  if (state.firebase.enabled) {
    try {
      await state.firebase.addDoc(
        state.firebase.collection(state.firebase.db, "delingsduellen_highscores"),
        {
          name: entry.name,
          score: entry.score,
          level: entry.level,
          streak: entry.streak,
          createdAt: state.firebase.serverTimestamp()
        }
      );
    } catch (error) {
      console.error("Firebase save feilet:", error);
    }
  }

  state.scoreSaved = true;
  el.saveArea.classList.add("hidden");
  await loadHighscores();
  setStatus("Highscore lagret!", "good");
}

function showOverlay(show) {
  el.gameOverOverlay.classList.toggle("hidden", !show);
}

function resetRound() {
  state.running = false;
  state.score = 0;
  state.level = 1;
  state.bestLevel = 1;
  state.streak = 0;
  state.levelMistakes = 0;
  state.falls = 0;
  state.questionIndex = 0;
  state.currentQuestion = null;
  state.scoreSaved = false;
  if (state.timerRafId) {
    cancelAnimationFrame(state.timerRafId);
    state.timerRafId = null;
  }

  el.startBtn.hidden = false;
  el.saveArea.classList.add("hidden");
  el.nameInput.value = "";
  el.saveScoreBtn.disabled = false;
  showOverlay(false);
  renderTower();
  renderQuestion();
  updateStatsUi();
  el.timerValue.textContent = "0.0s";
  setStatus("Trykk start for a begynne duellen.");
}

function startGame() {
  state.running = true;
  state.score = 0;
  state.level = 1;
  state.bestLevel = 1;
  state.streak = 0;
  state.levelMistakes = 0;
  state.falls = 0;
  state.questionIndex = 0;
  state.scoreSaved = false;

  el.startBtn.hidden = true;
  showOverlay(false);
  renderTower();
  updateStatsUi();
  setStatus("Duellen er i gang. Svar raskt!", "good");
  nextQuestion();
}

function finishGame(won) {
  state.running = false;
  if (state.timerRafId) {
    cancelAnimationFrame(state.timerRafId);
    state.timerRafId = null;
  }
  lockAnswerButtons(true);

  el.overlayTitle.textContent = won ? "Du vant Delingsduellen!" : "Game over";
  el.overlaySummary.textContent = won
    ? `Du klarte alle ${MAX_LEVEL} nivaer! Sluttscore: ${state.score}.`
    : `Du falt ${state.falls} ganger. Sluttscore: ${state.score}.`;

  el.saveArea.classList.add("hidden");
  el.nameInput.value = "";
  el.saveScoreBtn.disabled = false;
  state.scoreSaved = false;

  if (isHighscore(state.score)) {
    el.saveArea.classList.remove("hidden");
  }

  renderTower();
  showOverlay(true);
}

function wireEvents() {
  el.startBtn.addEventListener("click", startGame);
  el.restartBtn.addEventListener("click", resetRound);
  el.playAgainBtn.addEventListener("click", startGame);

  el.saveScoreBtn.addEventListener("click", async () => {
    if (state.scoreSaved) {
      return;
    }
    const candidate = el.nameInput.value.trim();
    const safeName = candidate.length ? candidate : "Spiller";
    el.saveScoreBtn.disabled = true;
    await saveHighscore(safeName);
  });

  el.nameInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (state.scoreSaved) {
      return;
    }
    const candidate = el.nameInput.value.trim();
    const safeName = candidate.length ? candidate : "Spiller";
    el.saveScoreBtn.disabled = true;
    await saveHighscore(safeName);
  });
}

async function bootstrap() {
  wireEvents();
  resetRound();
  await initFirebaseIfConfigured();
  await loadHighscores();
}

bootstrap();