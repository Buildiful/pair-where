/* Pair Where? by Buildiful® — game engine. MIT licensed; character assets are licensed separately. */
(() => {
  'use strict';

  const SIZE = 6;
  const TOTAL = SIZE * SIZE;
  const PAIRS = TOTAL / 2;
  const BEST_KEY = 'pair-where.best.v1';
  const MUTED_KEY = 'pair-where.muted.v1';
  const $ = id => document.getElementById(id);
  const board = $('board');
  const stageTag = $('stageTag');
  const stageTitle = $('stageTitle');
  const stageHint = $('stageHint');
  const timer = $('timer');
  const bestTime = $('bestTime');
  const progressLabel = $('progressLabel');
  const progressTrack = $('progressTrack');
  const progressFill = $('progressFill');
  const progressRow = document.querySelector('.progress-row');
  const mainAction = $('mainAction');
  const soundAction = $('soundAction');
  const soundLabel = $('soundLabel');
  const feedback = $('feedback');
  const restartDialog = $('restartDialog');
  const completedDialog = $('completedDialog');

  let deck = [];
  let phase = 'ready';
  let picked = [];
  let matchedPairs = 0;
  let mismatchLocked = false;
  let mismatchTimer = null;
  let selected = null;
  let swaps = 0;
  let startedAt = 0;
  let finishedAt = 0;
  let clockFrame = null;
  let best = readBest();
  let muted = readBoolean(MUTED_KEY, false);
  let audioContext = null;

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* Optional storage. */ }
  }
  function readBest() {
    const n = Number(safeGet(BEST_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function readBoolean(key, fallback) {
    const value = safeGet(key);
    return value === null ? fallback : value === 'true';
  }
  function formatTime(ms) {
    // Stopwatch display: minutes:seconds.hundredths (hours when needed).
    const centiseconds = Math.floor(Math.max(0, ms) / 10);
    const wholeSeconds = Math.floor(centiseconds / 100);
    const seconds = String(wholeSeconds % 60).padStart(2, '0');
    const minutes = String(Math.floor(wholeSeconds / 60) % 60).padStart(2, '0');
    const hours = Math.floor(wholeSeconds / 3600);
    const hundredths = String(centiseconds % 100).padStart(2, '0');
    return (hours ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`) + `.${hundredths}`;
  }
  function shuffle() {
    const result = Array.from({length:TOTAL}, (_, i) => ({number:i + 1, matched:false, faceUp:false}));
    // Fisher–Yates: each number appears exactly once; adjacent numbers share an illustration.
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function artPath(number) {
    return `./assets/characters/${String(Math.ceil(number / 2)).padStart(2,'0')}.png`;
  }
  function cardLabel(card, i) {
    const location = `row ${Math.floor(i / SIZE) + 1}, column ${i % SIZE + 1}`;
    if (phase === 'sorting' || phase === 'complete') {
      return `Card ${card.number}, ${location}${selected === i ? ', selected' : ''}`;
    }
    if (card.faceUp || card.matched) {
      return `Card ${card.number}, character ${Math.ceil(card.number / 2)}, ${location}${card.matched ? ', matched' : ''}`;
    }
    return `Face-down card, ${location}`;
  }
  function renderBoard(focusIndex = null) {
    const fragment = document.createDocumentFragment();
    deck.forEach((card, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'card';
      if (card.faceUp) button.classList.add('revealed');
      if (card.matched) button.classList.add('matched');
      if (phase === 'sorting' && selected === i) button.classList.add('selected');
      button.disabled = phase === 'ready' || phase === 'complete' || (phase === 'memory' && card.matched);
      button.setAttribute('aria-label', cardLabel(card, i));
      if (phase === 'sorting') button.setAttribute('aria-pressed', String(selected === i));
      button.innerHTML = `<span class="card-inner"><span class="card-face card-back" aria-hidden="true"><span class="card-back-mark">?</span></span><span class="card-face card-front" aria-hidden="true"><img class="card-art" src="${artPath(card.number)}" alt="" draggable="false"><span class="card-number">${card.number}</span></span></span>`;
      button.addEventListener('click', () => onCard(i));
      fragment.appendChild(button);
    });
    board.replaceChildren(fragment);
    board.classList.toggle('sorting', phase === 'sorting' || phase === 'complete');
    if (Number.isInteger(focusIndex) && board.children[focusIndex]) board.children[focusIndex].focus({preventScroll:true});
  }
  function refreshCard(i) {
    const button = board.children[i];
    if (!button) return;
    const card = deck[i];
    button.classList.toggle('revealed', card.faceUp);
    button.classList.toggle('matched', card.matched);
    button.classList.toggle('selected', phase === 'sorting' && selected === i);
    button.disabled = phase === 'ready' || phase === 'complete' || (phase === 'memory' && card.matched);
    button.setAttribute('aria-label', cardLabel(card, i));
    if (phase === 'sorting') button.setAttribute('aria-pressed', String(selected === i));
    else button.removeAttribute('aria-pressed');
  }
  function setFeedback(text) { feedback.textContent = text; }
  function track(name) { window.BuildifulAnalytics?.track(name); }
  function updateHUD() {
    const sorting = phase === 'sorting' || phase === 'complete';
    stageTag.innerHTML = sorting ? '02 <span aria-hidden="true">/</span> 02' : '01 <span aria-hidden="true">/</span> 02';
    stageTitle.textContent = sorting ? 'Sort them in numerical order.' : 'Find the pairs.';
    stageHint.textContent = sorting ? 'Swap two neighboring cards.' : phase === 'ready' ? 'Match pairs. Then sort by number.' : 'Flip two cards at a time.';
    progressLabel.textContent = sorting ? `${swaps} ${swaps === 1 ? 'swap' : 'swaps'}` : `${matchedPairs} / ${PAIRS} pairs`;
    progressRow.classList.toggle('sorting', sorting);
    progressTrack.setAttribute('aria-valuenow', String(matchedPairs));
    progressFill.style.width = `${matchedPairs / PAIRS * 100}%`;
    bestTime.textContent = best === null ? '—' : formatTime(best);
    if (phase === 'ready') {
      mainAction.classList.remove('secondary-mode');
      mainAction.innerHTML = 'Start game <span aria-hidden="true">→</span>';
    } else if (phase === 'complete') {
      mainAction.classList.remove('secondary-mode');
      mainAction.innerHTML = 'Play again <span aria-hidden="true">→</span>';
    } else {
      mainAction.classList.add('secondary-mode');
      mainAction.textContent = 'New game';
    }
  }
  function updateSoundButton() {
    soundAction.classList.toggle('muted', muted);
    soundAction.setAttribute('aria-pressed', String(!muted));
    soundAction.setAttribute('aria-label', muted ? 'Turn sound on' : 'Mute sound');
    soundLabel.textContent = muted ? 'Sound off' : 'Sound on';
  }
  function audio() {
    if (muted) return null;
    try {
      if (!audioContext) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return null;
        audioContext = new Context();
      }
      if (audioContext.state === 'suspended') void audioContext.resume();
      return audioContext;
    } catch (_) { return null; }
  }
  function note(frequency, delay, duration, volume = 0.045, waveform = 'sine') {
    const ctx = audio();
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const when = ctx.currentTime + delay;
      o.type = waveform;
      o.frequency.setValueAtTime(frequency, when);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(volume, when + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      o.connect(g).connect(ctx.destination);
      o.start(when);
      o.stop(when + duration + 0.015);
    } catch (_) { /* Sound is non-essential. */ }
  }
  function sfx(which) {
    if (muted) return;
    if (which === 'flip') note(450, 0, .065, .024, 'triangle');
    if (which === 'miss') { note(270, 0, .085, .026); note(220, .085, .11, .023); }
    if (which === 'match') { note(540, 0, .085); note(810, .09, .15, .044); }
    if (which === 'swap') note(490, 0, .09, .027, 'triangle');
    if (which === 'stage') { note(490, 0, .14); note(660, .11, .14); note(880, .23, .22); }
    if (which === 'win') { note(520, 0, .16); note(650, .13, .16); note(780, .25, .19); note(1040, .39, .34); }
  }
  function tick() {
    if (phase !== 'memory' && phase !== 'sorting') { clockFrame = null; return; }
    // Update every animation frame so the hundredths display moves smoothly.
    // Elapsed time is derived from the actual clock rather than accumulated frames.
    timer.textContent = formatTime(Date.now() - startedAt);
    clockFrame = requestAnimationFrame(tick);
  }
  function stopClock() {
    if (clockFrame !== null) cancelAnimationFrame(clockFrame);
    clockFrame = null;
  }
  function startClock() {
    stopClock();
    startedAt = Date.now();
    clockFrame = requestAnimationFrame(tick);
  }
  function clearPendingMismatch() {
    if (mismatchTimer !== null) clearTimeout(mismatchTimer);
    mismatchTimer = null;
    mismatchLocked = false;
  }
  function reset(startNow = false) {
    clearPendingMismatch();
    stopClock();
    if (restartDialog.open) restartDialog.close();
    if (completedDialog.open) completedDialog.close();
    deck = shuffle();
    phase = 'ready';
    picked = [];
    matchedPairs = 0;
    selected = null;
    swaps = 0;
    startedAt = 0;
    finishedAt = 0;
    timer.textContent = '00:00.00';
    setFeedback('');
    renderBoard();
    updateHUD();
    if (startNow) start();
  }
  function start() {
    if (phase !== 'ready') return;
    phase = 'memory';
    startClock();
    renderBoard();
    updateHUD();
    setFeedback('');
    sfx('flip');
    track('game_started');
  }
  function onCard(i) {
    if (phase === 'memory') memoryTap(i);
    if (phase === 'sorting') sortingTap(i);
  }
  function memoryTap(i) {
    const card = deck[i];
    if (mismatchLocked || card.matched || card.faceUp) return;
    card.faceUp = true;
    picked.push(i);
    refreshCard(i);
    sfx('flip');
    if (picked.length < 2) return;
    const [a, b] = picked;
    picked = [];
    if (Math.ceil(deck[a].number / 2) === Math.ceil(deck[b].number / 2)) {
      deck[a].matched = true;
      deck[b].matched = true;
      refreshCard(a);
      refreshCard(b);
      matchedPairs++;
      updateHUD();
      sfx('match');
      if (matchedPairs === PAIRS) {
        enterSorting();
      }
    } else {
      mismatchLocked = true;
      sfx('miss');
      mismatchTimer = setTimeout(() => {
        deck[a].faceUp = false;
        deck[b].faceUp = false;
        refreshCard(a);
        refreshCard(b);
        mismatchLocked = false;
        mismatchTimer = null;
      }, 860);
    }
  }
  function enterSorting() {
    phase = 'sorting';
    selected = null;
    renderBoard();
    updateHUD();
    setFeedback('All pairs found. Now sort the numbers!');
    sfx('stage');
    track('tier_two_reached');
  }
  function adjacent(a, b) {
    return Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) + Math.abs(a % SIZE - b % SIZE) === 1;
  }
  function isSorted() {
    return deck.every((card, i) => card.number === i + 1);
  }
  function sortingTap(i) {
    if (selected === null) {
      selected = i;
      refreshCard(i);
      setFeedback('');
      return;
    }
    if (selected === i) {
      selected = null;
      refreshCard(i);
      return;
    }
    if (!adjacent(selected, i)) {
      const previous = selected;
      selected = i;
      refreshCard(previous);
      refreshCard(i);
      setFeedback('Choose a neighboring card.');
      return;
    }
    const old = selected;
    [deck[old], deck[i]] = [deck[i], deck[old]];
    selected = null;
    swaps++;
    sfx('swap');
    setFeedback('');
    updateHUD();
    if (isSorted()) {
      finish();
    } else {
      renderBoard(i);
    }
  }
  function finish() {
    finishedAt = Date.now() - startedAt;
    stopClock();
    phase = 'complete';
    timer.textContent = formatTime(finishedAt);
    const newBest = best === null || finishedAt < best;
    if (newBest) {
      best = finishedAt;
      safeSet(BEST_KEY, String(best));
    }
    updateHUD();
    renderBoard();
    setFeedback('');
    $('finalTime').textContent = formatTime(finishedAt);
    $('finalSwaps').textContent = String(swaps);
    $('newRecord').hidden = !newBest;
    sfx('win');
    track('game_completed');
    if (typeof completedDialog.showModal === 'function') completedDialog.showModal();
  }

  mainAction.addEventListener('click', () => {
    if (phase === 'ready') start();
    else if (phase === 'complete') reset(true);
    else if (typeof restartDialog.showModal === 'function') restartDialog.showModal();
    else if (window.confirm('Start a new game?')) reset(true);
  });
  $('cancelRestart').addEventListener('click', () => restartDialog.close());
  $('confirmRestart').addEventListener('click', () => reset(true));
  $('playAgain').addEventListener('click', () => reset(true));
  $('closeFinish').addEventListener('click', () => completedDialog.close());
  soundAction.addEventListener('click', () => {
    muted = !muted;
    safeSet(MUTED_KEY, String(muted));
    updateSoundButton();
    if (!muted) sfx('flip');
  });
  function refreshClockOnReturn() {
    if (phase === 'memory' || phase === 'sorting') {
      timer.textContent = formatTime(Date.now() - startedAt);
    }
  }
  window.addEventListener('pageshow', refreshClockOnReturn);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshClockOnReturn();
  });

  updateSoundButton();
  reset();
})();
