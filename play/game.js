(function () {
  const DEFAULT_LEVEL_URL = "./levels/level-01.json";
  const TILE_SIZE = 16;
  const DISPLAY_SCALE = 2;
  const VIEWPORT_W = 16;
  const VIEWPORT_H = 16;
  const SIMULATION_TICK_MS = 400;
  const MOVE_ANIMATION_MS = 220;
  const ASSET_PATHS = {
    base: {
      g: "../assets/base/grass-mowed.png",
      R: "../assets/base/road.png",
      S: "../assets/base/pavement.png"
    },
    items: {
      H: "../assets/items/house.png",
      F: "../assets/items/fence.png",
      B: "../assets/items/bush.png",
      T: "../assets/items/tree.png",
      K: "../assets/items/roadblock.png",
      L: "../assets/items/tall-grass.png"
    },
    markers: {
      c: "../assets/markers/curtis-spawn.png",
      p: "../assets/markers/player-spawn.png",
      m: "../assets/markers/mower-spawn.png",
      o: "../assets/markers/police-spawn.png"
    },
    moveable: {
      bag: "../assets/items/bag.png",
      mower: "../assets/entities/mower-idle.png"
    }
  };
  const core = window.BagNinjaCore;

  if (!core) {
    throw new Error("BagNinjaCore is required before loading game.js.");
  }

  const state = {
    levelSource: null,
    game: null,
    presentation: {
      phase: "title",       // "title" | "playing" | "winning" | "losing" | "gameover"
      startTimeMs: 0,
      greyscaleTimerId: null,
      playAgainTimerId: null,
      playAgainReady: false,
      playerWalkUntil: 0,
      curtisWalkUntil: 0,
      camX: 0,
      camY: 0
    },
    simulationTimerId: null
  };
  const imageCache = new Map();

  const canvasEl = document.getElementById("game-canvas");
  const canvasFrameEl = document.getElementById("canvas-frame");
  const context = canvasEl.getContext("2d");
  const playerStateEl = document.getElementById("player-state");
  const curtisStateEl = document.getElementById("curtis-state");
  const mowedCountEl = document.getElementById("mowed-count");
  const mowerFillStatEl = document.getElementById("mower-fill-stat");
  const mowerFillMeterEl = document.getElementById("mower-fill-meter");
  const mowerFillTextEl = document.getElementById("mower-fill-text");
  const mowerFillBarEl = document.getElementById("mower-fill-bar");
  const loadStatusEl = document.getElementById("load-status");
  const levelFileInputEl = document.getElementById("level-file-input");
  const loadDefaultButtonEl = document.getElementById("load-default");
  const restartLevelButtonEl = document.getElementById("restart-level");
  const joystickEl = document.getElementById("joystick");
  const joystickKnobEl = document.getElementById("joystick-knob");
  const actionButtonEl = document.getElementById("action-button");
  const titleScreenEl = document.getElementById("title-screen");
  const winScreenEl = document.getElementById("win-screen");
  const winTimeEl = document.getElementById("win-time");
  const winAlertTimeEl = document.getElementById("win-alert-time");
  const gameOverScreenEl = document.getElementById("game-over-screen");
  const gameoverMowedEl = document.getElementById("gameover-mowed");
  const winPlayAgainEl = document.getElementById("win-play-again");
  const gameoverPlayAgainEl = document.getElementById("gameover-play-again");
  const titlePromptEl = document.getElementById("title-prompt");

  const heldMoveState = {
    source: null,
    direction: null,
    key: null,
    timerId: null
  };
  const touchState = {
    pointerId: null,
    direction: null
  };

  // ── Helpers ────────────────────────────────────────────────

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  const CAM_MARGIN = 4;

  function initCamera() {
    if (!state.game || !state.game.player) {
      return;
    }
    const { player, level } = state.game;
    if (level.width >= VIEWPORT_W) {
      state.presentation.camX = Math.max(0, Math.min(player.x - Math.floor(VIEWPORT_W / 2), level.width - VIEWPORT_W));
    } else {
      state.presentation.camX = -Math.floor((VIEWPORT_W - level.width) / 2);
    }
    if (level.height >= VIEWPORT_H) {
      state.presentation.camY = Math.max(0, Math.min(player.y - Math.floor(VIEWPORT_H / 2), level.height - VIEWPORT_H));
    } else {
      state.presentation.camY = -Math.floor((VIEWPORT_H - level.height) / 2);
    }
  }

  function updateCamera() {
    if (!state.game || !state.game.player) {
      return;
    }
    const { player, level } = state.game;
    const relX = player.x - state.presentation.camX;
    const relY = player.y - state.presentation.camY;

    if (relX < CAM_MARGIN) {
      state.presentation.camX = Math.max(0, player.x - CAM_MARGIN);
    } else if (relX > VIEWPORT_W - CAM_MARGIN - 1) {
      state.presentation.camX = Math.min(level.width - VIEWPORT_W, player.x - (VIEWPORT_W - CAM_MARGIN - 1));
    }

    if (relY < CAM_MARGIN) {
      state.presentation.camY = Math.max(0, player.y - CAM_MARGIN);
    } else if (relY > VIEWPORT_H - CAM_MARGIN - 1) {
      state.presentation.camY = Math.min(level.height - VIEWPORT_H, player.y - (VIEWPORT_H - CAM_MARGIN - 1));
    }
  }

  function toPixelX(tileX) {
    return (tileX - state.presentation.camX) * TILE_SIZE;
  }

  function toPixelY(tileY) {
    return (tileY - state.presentation.camY) * TILE_SIZE;
  }

  function isInView(tileX, tileY) {
    return tileX >= state.presentation.camX && tileX < state.presentation.camX + VIEWPORT_W &&
           tileY >= state.presentation.camY && tileY < state.presentation.camY + VIEWPORT_H;
  }

  function setLoadStatus(message, tone) {
    loadStatusEl.textContent = message;
    loadStatusEl.classList.toggle("is-error", tone === "error");
    loadStatusEl.classList.toggle("is-ok", tone === "ok");
  }

  function flushGameStatus() {
    if (state.game && state.game.lastStatus) {
      setLoadStatus(state.game.lastStatus.message, state.game.lastStatus.tone);
      state.game.lastStatus = null;
    }
  }

  function getImage(path) {
    if (!path) {
      return null;
    }
    if (imageCache.has(path)) {
      return imageCache.get(path);
    }

    const image = new Image();
    image.onload = () => {
      if (state.game) {
        render();
      }
    };
    image.onerror = () => {
      image.dataset.failed = "true";
    };
    image.src = path;
    imageCache.set(path, image);
    return image;
  }

  function drawImageOrFallback(path, pixelX, pixelY, fallback) {
    const image = getImage(path);
    if (image && image.complete && image.naturalWidth > 0) {
      context.drawImage(image, pixelX, pixelY, TILE_SIZE, TILE_SIZE);
      return true;
    }
    fallback();
    return false;
  }

  function getTwoFramePaths(prefix) {
    return [`${prefix}-01.png`, `${prefix}-02.png`];
  }

  function getCurrentTwoFrame(prefix) {
    const frameIndex = Math.floor(Date.now() / 180) % 2;
    return getTwoFramePaths(prefix)[frameIndex];
  }

  // ── Screen flow ────────────────────────────────────────────

  function showTitleScreen() {
    titleScreenEl.classList.remove("is-dismissing");
    titleScreenEl.style.display = "";
    titleScreenEl.setAttribute("aria-hidden", "false");
    titlePromptEl.hidden = true;
    state.presentation.playAgainReady = false;
    if (state.presentation.playAgainTimerId) {
      window.clearTimeout(state.presentation.playAgainTimerId);
    }
    state.presentation.playAgainTimerId = window.setTimeout(() => {
      state.presentation.playAgainReady = true;
      titlePromptEl.hidden = false;
    }, 5000);
  }

  function dismissTitle() {
    if (state.presentation.phase !== "title" || !state.presentation.playAgainReady) {
      return;
    }
    state.presentation.phase = "playing";
    state.presentation.startTimeMs = Date.now();
    titleScreenEl.classList.add("is-dismissing");
    window.setTimeout(() => {
      titleScreenEl.style.display = "none";
      titleScreenEl.setAttribute("aria-hidden", "true");
    }, 520);
    startSimulationLoop();
  }

  function showWinScreen() {
    if (state.presentation.phase !== "playing") {
      return;
    }
    state.presentation.phase = "winning";
    const elapsed = Date.now() - state.presentation.startTimeMs;
    const alertMs = state.game ? (state.game.curtisAlertMs || 0) : 0;
    winTimeEl.textContent = formatTime(elapsed);
    winAlertTimeEl.textContent = formatTime(alertMs);
    winScreenEl.setAttribute("aria-hidden", "false");
    winScreenEl.classList.add("is-active");
    state.presentation.playAgainTimerId = window.setTimeout(() => {
      state.presentation.playAgainReady = true;
      winPlayAgainEl.hidden = false;
    }, 5000);
  }

  function setCanvasGreyscale(step) {
    canvasEl.classList.remove("greyscale-1", "greyscale-2", "greyscale-3", "greyscale-4");
    if (step > 0) {
      canvasEl.classList.add(`greyscale-${step}`);
    }
  }

  function showGameOver() {
    if (state.game) {
      state.game.loseState = "game_over";
      const remaining = core.countRemainingTallGrass(state.game.level);
      const mowed = state.game.totalMowable - remaining;
      gameoverMowedEl.textContent = `${mowed} / ${state.game.totalMowable}`;
    }
    state.presentation.phase = "gameover";
    gameOverScreenEl.setAttribute("aria-hidden", "false");
    gameOverScreenEl.classList.add("is-visible");
    state.presentation.playAgainTimerId = window.setTimeout(() => {
      state.presentation.playAgainReady = true;
      gameoverPlayAgainEl.hidden = false;
    }, 5000);
  }

  function beginLoseSequence() {
    function nextStep(n) {
      setCanvasGreyscale(n);
      if (n < 4) {
        state.presentation.greyscaleTimerId = window.setTimeout(() => nextStep(n + 1), 500);
      } else {
        state.presentation.greyscaleTimerId = window.setTimeout(showGameOver, 600);
      }
    }
    state.presentation.greyscaleTimerId = window.setTimeout(() => nextStep(1), 500);
  }

  function triggerPlayAgain() {
    // Block any further input immediately
    if (state.presentation.playAgainTimerId) {
      window.clearTimeout(state.presentation.playAgainTimerId);
      state.presentation.playAgainTimerId = null;
    }
    state.presentation.playAgainReady = false;
    const screenEl = state.presentation.phase === "winning" ? winScreenEl : gameOverScreenEl;
    screenEl.classList.add("is-hiding");
    // Restart the level after the fade completes; restartLevel → loadLevelFromObject
    // → resetPresentation cleans up all the screen classes and game state properly
    window.setTimeout(restartLevel, 650);
  }

  function checkForScreenTransitions() {
    if (!state.game) {
      return;
    }
    if (state.game.hasWon && state.presentation.phase === "playing") {
      showWinScreen();
    }
    if (state.game.loseState === "captured" && state.presentation.phase === "playing") {
      state.presentation.phase = "losing";
      beginLoseSequence();
    }
  }

  function resetPresentation() {
    if (state.presentation.greyscaleTimerId) {
      window.clearTimeout(state.presentation.greyscaleTimerId);
      state.presentation.greyscaleTimerId = null;
    }
    // Preserve the title delay timer when the level loads under the title screen
    if (state.presentation.phase !== "title") {
      if (state.presentation.playAgainTimerId) {
        window.clearTimeout(state.presentation.playAgainTimerId);
        state.presentation.playAgainTimerId = null;
      }
      state.presentation.playAgainReady = false;
    }
    state.presentation.playerWalkUntil = 0;
    state.presentation.curtisWalkUntil = 0;
    state.presentation.camX = 0;
    state.presentation.camY = 0;
    setCanvasGreyscale(0);

    winScreenEl.classList.remove("is-active", "is-hiding");
    winScreenEl.setAttribute("aria-hidden", "true");
    winPlayAgainEl.hidden = true;
    gameOverScreenEl.classList.remove("is-visible", "is-hiding");
    gameOverScreenEl.setAttribute("aria-hidden", "true");
    gameoverPlayAgainEl.hidden = true;

    if (state.presentation.phase !== "title") {
      state.presentation.phase = "playing";
      state.presentation.startTimeMs = Date.now();
    }
  }

  // ── Level loading ──────────────────────────────────────────

  function loadLevelFromObject(levelData, sourceLabel) {
    resetPresentation();
    state.levelSource = sourceLabel;
    state.game = core.createGameState(levelData);
    initCamera();
    setLoadStatus(`Loaded level from ${sourceLabel}.`, "ok");
    render();
  }

  function setCanvasSize(width, height) {
    canvasEl.width = width * TILE_SIZE;
    canvasEl.height = height * TILE_SIZE;
  }

  async function readLevelFile(file, label) {
    const parsed = JSON.parse(await file.text());
    loadLevelFromObject(parsed, label || file.name);
  }

  async function loadDefaultLevel() {
    try {
      const response = await fetch(DEFAULT_LEVEL_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const parsed = await response.json();
      loadLevelFromObject(parsed, DEFAULT_LEVEL_URL);
    } catch (error) {
      setLoadStatus(`Unable to load default level: ${error.message}`, "error");
    }
  }

  function restartLevel() {
    if (!state.game) {
      return;
    }
    loadLevelFromObject(JSON.parse(JSON.stringify(state.game.levelTemplate)), state.levelSource || "current level");
  }

  // ── Simulation loop ────────────────────────────────────────

  function startSimulationLoop() {
    stopSimulationLoop();
    state.simulationTimerId = window.setInterval(() => {
      if (!state.game) {
        return;
      }
      const previousCurtis = state.game.curtis ? { x: state.game.curtis.x, y: state.game.curtis.y } : null;
      const changed = core.advanceSimulationTick(state.game);
      if (state.game.curtis && previousCurtis && (previousCurtis.x !== state.game.curtis.x || previousCurtis.y !== state.game.curtis.y)) {
        state.presentation.curtisWalkUntil = Date.now() + MOVE_ANIMATION_MS;
      }
      if (changed) {
        flushGameStatus();
        render();
      }
      checkForScreenTransitions();
    }, SIMULATION_TICK_MS);
  }

  function stopSimulationLoop() {
    if (state.simulationTimerId) {
      window.clearInterval(state.simulationTimerId);
    }
    state.simulationTimerId = null;
  }

  // ── Player input ───────────────────────────────────────────

  function movePlayer(direction) {
    if (!state.game) {
      return;
    }
    if (core.movePlayer(state.game, direction)) {
      state.presentation.playerWalkUntil = Date.now() + MOVE_ANIMATION_MS;
      updateCamera();
      flushGameStatus();
      render();
      checkForScreenTransitions();
    }
  }

  function handleAction() {
    if (!state.game) {
      return;
    }
    if (core.handleAction(state.game)) {
      flushGameStatus();
      render();
      checkForScreenTransitions();
      return;
    }
    flushGameStatus();
    updateHud();
  }

  // ── Drawing ────────────────────────────────────────────────

  function drawBaseTileFallback(symbol, pixelX, pixelY) {
    switch (symbol) {
      case "R":
        context.fillStyle = "#56585b";
        break;
      case "S":
        context.fillStyle = "#ddd4c5";
        break;
      case "g":
      default:
        context.fillStyle = "#7ba357";
        break;
    }

    context.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);

    if (symbol === "R") {
      context.fillStyle = "#707377";
      context.fillRect(pixelX + 7, pixelY, 2, TILE_SIZE);
    }
  }

  function drawBaseTile(symbol, pixelX, pixelY) {
    drawImageOrFallback(ASSET_PATHS.base[symbol], pixelX, pixelY, () => {
      drawBaseTileFallback(symbol, pixelX, pixelY);
    });
  }

  function drawZoneOverlay(level, x, y) {
    void level;
    void x;
    void y;
  }

  function drawItemFallback(symbol, pixelX, pixelY) {
    if (symbol === "_" || !symbol) {
      return;
    }

    switch (symbol) {
      case "H":
        context.fillStyle = "#73492f";
        context.fillRect(pixelX + 1, pixelY + 1, 14, 14);
        break;
      case "F":
        context.fillStyle = "#d6b57d";
        context.fillRect(pixelX + 1, pixelY + 6, 14, 4);
        break;
      case "B":
        context.fillStyle = "#46824f";
        context.beginPath();
        context.arc(pixelX + 8, pixelY + 8, 5, 0, Math.PI * 2);
        context.fill();
        break;
      case "T":
        context.fillStyle = "#325f3d";
        context.beginPath();
        context.moveTo(pixelX + 8, pixelY + 2);
        context.lineTo(pixelX + 14, pixelY + 12);
        context.lineTo(pixelX + 2, pixelY + 12);
        context.closePath();
        context.fill();
        context.fillStyle = "#6e4d32";
        context.fillRect(pixelX + 7, pixelY + 12, 2, 3);
        break;
      case "K":
        context.fillStyle = "#f26922";
        context.fillRect(pixelX + 1, pixelY + 5, 14, 6);
        context.fillStyle = "#fff6df";
        context.fillRect(pixelX + 3, pixelY + 6, 3, 4);
        context.fillRect(pixelX + 7, pixelY + 6, 3, 4);
        context.fillRect(pixelX + 11, pixelY + 6, 2, 4);
        context.fillStyle = "#3c3b39";
        context.fillRect(pixelX + 2, pixelY + 11, 3, 2);
        context.fillRect(pixelX + 11, pixelY + 11, 3, 2);
        break;
      case "L":
        context.fillStyle = "#8fc159";
        for (let blade = 0; blade < 4; blade += 1) {
          context.fillRect(pixelX + 3 + (blade * 3), pixelY + 4, 1, 8);
        }
        break;
      default:
        break;
    }
  }

  function drawItem(symbol, pixelX, pixelY) {
    if (symbol === "_" || !symbol) {
      return;
    }
    drawImageOrFallback(ASSET_PATHS.items[symbol], pixelX, pixelY, () => {
      drawItemFallback(symbol, pixelX, pixelY);
    });
  }

  function drawBagFallback(bag) {
    const pixelX = toPixelX(bag.x);
    const pixelY = toPixelY(bag.y);

    context.fillStyle = "#ab8d63";
    context.fillRect(pixelX + 4, pixelY + 5, 8, 8);
    context.fillStyle = "#886f4d";
    context.fillRect(pixelX + 6, pixelY + 3, 4, 3);
  }

  function drawBag(bag) {
    drawImageOrFallback(ASSET_PATHS.moveable.bag, toPixelX(bag.x), toPixelY(bag.y), () => {
      drawBagFallback(bag);
    });
  }

  function drawOverlappingMoveableIndicators() {
    if (!state.game) {
      return;
    }

    const player = state.game.player;
    if (!player) {
      return;
    }

    const freeBag = core.getFreeBagAt(state.game, player.x, player.y);
    if (freeBag) {
      const pixelX = toPixelX(player.x);
      const pixelY = toPixelY(player.y);
      context.fillStyle = "rgba(248, 244, 234, 0.92)";
      context.fillRect(pixelX + 9, pixelY + 9, 6, 6);
      context.fillStyle = "#ab8d63";
      context.fillRect(pixelX + 10, pixelY + 10, 4, 4);
      context.fillStyle = "#886f4d";
      context.fillRect(pixelX + 11, pixelY + 9, 2, 2);
    }
  }

  function drawMowerFallback() {
    const mower = core.getMower(state.game);
    if (!mower || mower.attachedTo) {
      return;
    }

    const pixelX = toPixelX(mower.x);
    const pixelY = toPixelY(mower.y);

    context.fillStyle = "#c64435";
    context.fillRect(pixelX + 2, pixelY + 4, 12, 8);
    context.fillStyle = "#f7e6cc";
    context.fillRect(pixelX + 10, pixelY + 2, 3, 2);
    context.fillStyle = "#2a251f";
    context.fillRect(pixelX + 3, pixelY + 12, 3, 2);
    context.fillRect(pixelX + 10, pixelY + 12, 3, 2);
  }

  function drawMower() {
    const mower = core.getMower(state.game);
    if (!mower || mower.attachedTo || !isInView(mower.x, mower.y)) {
      return;
    }
    drawImageOrFallback(ASSET_PATHS.moveable.mower, toPixelX(mower.x), toPixelY(mower.y), () => {
      drawMowerFallback();
    });
  }

  function drawPoliceFallback() {
    if (!state.game) {
      return;
    }

    const police = core.getPolice(state.game);
    if (!police || !police.active) {
      return;
    }

    const pixelX = toPixelX(police.x);
    const pixelY = toPixelY(police.y);

    context.fillStyle = "#2e5fb8";
    context.fillRect(pixelX + 4, pixelY + 3, 8, 10);
    context.fillStyle = "#d74444";
    context.fillRect(pixelX + 4, pixelY + 3, 4, 3);
    context.fillStyle = "#e7e7e7";
    context.fillRect(pixelX + 8, pixelY + 3, 4, 3);
    context.fillStyle = "#f0ddbf";
    context.fillRect(pixelX + 5, pixelY + 1, 6, 3);
  }

  function drawPolice() {
    if (!state.game) {
      return;
    }

    const police = core.getPolice(state.game);
    if (!police || !police.active) {
      return;
    }

    if (!isInView(police.x, police.y)) {
      return;
    }
    const framePath = getCurrentTwoFrame(`../assets/entities/police-walk-${police.facing}`);
    drawImageOrFallback(framePath, toPixelX(police.x), toPixelY(police.y), () => {
      drawPoliceFallback();
    });
  }

  function getMowerFillRatio() {
    if (!state.game) {
      return 0;
    }

    const mower = core.getMower(state.game);
    if (!mower || !mower.capacity) {
      return 0;
    }

    return Math.max(0, Math.min(1, mower.fullness / mower.capacity));
  }

  function drawMowerFillIndicator() {
    if (!state.game) {
      return;
    }

    const mower = core.getMower(state.game);
    if (!mower || mower.attachedTo !== "player") {
      return;
    }

    const anchorX = state.game.player.x;
    const anchorY = state.game.player.y;
    const ratio = getMowerFillRatio();
    const pixelX = toPixelX(anchorX) + 1;
    const pixelY = toPixelY(anchorY) - 6;

    context.fillStyle = "rgba(28, 22, 18, 0.8)";
    context.fillRect(pixelX, pixelY, 14, 4);

    context.fillStyle = ratio >= 1
      ? "#c44a33"
      : ratio >= 0.66
        ? "#d0a83d"
        : "#74b850";
    context.fillRect(pixelX + 1, pixelY + 1, Math.round(12 * ratio), 2);
  }

  function drawPlayerFallback() {
    if (!state.game || !state.game.player) {
      return;
    }

    const player = state.game.player;
    const pixelX = toPixelX(player.x);
    const pixelY = toPixelY(player.y);

    if (player.attachedItemType === "mower") {
      context.fillStyle = "#f1a65d";
      context.fillRect(pixelX + 3, pixelY + 2, 10, 12);
      context.fillStyle = "#2d2a26";
      context.fillRect(pixelX + 6, pixelY + 1, 4, 3);
      return;
    }

    context.fillStyle = "#3360d0";
    context.fillRect(pixelX + 4, pixelY + 3, 8, 10);
    context.fillStyle = "#f7e6cc";
    context.fillRect(pixelX + 5, pixelY + 1, 6, 4);

    if (player.attachedItemType === "bag") {
      context.fillStyle = "#ab8d63";
      context.fillRect(pixelX + 10, pixelY + 5, 4, 6);
      context.fillStyle = "#886f4d";
      context.fillRect(pixelX + 11, pixelY + 4, 2, 2);
    }
  }

  function drawPlayer() {
    if (!state.game || !state.game.player) {
      return;
    }

    const player = state.game.player;
    const facing = player.facing || "down";
    const isWalking = Date.now() < state.presentation.playerWalkUntil;

    let path;
    if (player.attachedItemType === "mower") {
      path = isWalking
        ? getCurrentTwoFrame(`../assets/entities/player-operate-mower-${facing}`)
        : `../assets/entities/player-operate-mower-${facing}-01.png`;
    } else {
      path = isWalking
        ? getCurrentTwoFrame(`../assets/entities/player-walk-${facing}`)
        : `../assets/entities/player-idle-${facing}-01.png`;
    }

    drawImageOrFallback(path, toPixelX(player.x), toPixelY(player.y), () => {
      drawPlayerFallback();
    });
  }

  function drawCurtisFallback() {
    if (!state.game || !state.game.curtis || !state.game.curtis.outdoors) {
      return;
    }

    const curtis = state.game.curtis;
    const pixelX = toPixelX(curtis.x);
    const pixelY = toPixelY(curtis.y);

    context.fillStyle = curtis.detectionStage === "police"
      ? "#a63b30"
      : curtis.detectionStage === "alert"
        ? "#cf6d2d"
        : curtis.detectionStage === "spot"
          ? "#d2a23d"
          : "#5b4634";
    context.fillRect(pixelX + 4, pixelY + 3, 8, 10);
    context.fillStyle = "#f0ddbf";
    context.fillRect(pixelX + 5, pixelY + 1, 6, 4);

    context.fillStyle = "#211d17";
    if (curtis.facing === "up") {
      context.fillRect(pixelX + 7, pixelY + 0, 2, 2);
    } else if (curtis.facing === "down") {
      context.fillRect(pixelX + 7, pixelY + 13, 2, 2);
    } else if (curtis.facing === "left") {
      context.fillRect(pixelX + 2, pixelY + 7, 2, 2);
    } else {
      context.fillRect(pixelX + 12, pixelY + 7, 2, 2);
    }

    if (curtis.detectionStage === "police" && state.game.loseState === "calling_police") {
      context.fillStyle = "#fff7e5";
      context.fillRect(pixelX - 2, pixelY - 10, 20, 8);
      context.fillStyle = "#8d2a1d";
      context.font = "6px Georgia";
      context.fillText("POLICE!", pixelX - 1, pixelY - 4);
    }
  }

  function drawCurtis() {
    if (!state.game || !state.game.curtis || !state.game.curtis.outdoors || !isInView(state.game.curtis.x, state.game.curtis.y)) {
      return;
    }

    const curtis = state.game.curtis;
    const pixelX = toPixelX(curtis.x);
    const pixelY = toPixelY(curtis.y);
    const isWalking = Date.now() < state.presentation.curtisWalkUntil;
    const stateName = curtis.detectionStage === "police"
      ? "angry"
      : curtis.detectionStage === "alert" || curtis.detectionStage === "spot"
        ? "alert"
        : isWalking
          ? "walk"
          : "idle";
    const path = stateName === "walk"
      ? getCurrentTwoFrame(`../assets/entities/curtis-walk-${curtis.facing}`)
      : `../assets/entities/curtis-${stateName}-${curtis.facing}-01.png`;

    drawImageOrFallback(path, pixelX, pixelY, () => {
      drawCurtisFallback();
    });

    if (curtis.detectionStage === "police" && state.game.loseState === "calling_police") {
      context.fillStyle = "#fff7e5";
      context.fillRect(pixelX - 2, pixelY - 10, 20, 8);
      context.fillStyle = "#8d2a1d";
      context.font = "6px Georgia";
      context.fillText("POLICE!", pixelX - 1, pixelY - 4);
    }
  }

  // ── HUD ────────────────────────────────────────────────────

  function updateHud() {
    if (!state.game) {
      playerStateEl.textContent = "-";
      curtisStateEl.textContent = "-";
      mowedCountEl.textContent = "0 / 0";
      mowerFillTextEl.textContent = "0 / 0";
      mowerFillBarEl.style.width = "0%";
      mowerFillStatEl.hidden = true;
      mowerFillMeterEl.hidden = true;
      actionButtonEl.textContent = "Action";
      actionButtonEl.disabled = true;
      return;
    }

    playerStateEl.textContent = core.getPlayerStateLabel(state.game);
    curtisStateEl.textContent = core.getCurtisStateLabel(state.game);

    const remaining = core.countRemainingTallGrass(state.game.level);
    const mowed = state.game.totalMowable - remaining;
    const mower = core.getMower(state.game);
    const isOperatingMower = state.game.player.attachedItemType === "mower";
    const fillRatio = getMowerFillRatio();
    mowedCountEl.textContent = `${mowed} / ${state.game.totalMowable}`;
    mowerFillTextEl.textContent = mower ? `${mower.fullness} / ${mower.capacity}` : "0 / 0";
    mowerFillBarEl.style.width = `${Math.round(fillRatio * 100)}%`;
    mowerFillStatEl.hidden = !isOperatingMower;
    mowerFillMeterEl.hidden = !isOperatingMower;
    actionButtonEl.textContent = core.getActionLabel(state.game);
    actionButtonEl.disabled = !core.hasAvailableAction(state.game);
  }

  // ── Render ─────────────────────────────────────────────────

  function render() {
    if (!state.game || !state.game.level) {
      context.clearRect(0, 0, canvasEl.width, canvasEl.height);
      updateHud();
      return;
    }

    const level = state.game.level;
    const camX = state.presentation.camX;
    const camY = state.presentation.camY;

    // Void background for areas outside level bounds
    context.fillStyle = "#141008";
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);

    for (let vy = 0; vy < VIEWPORT_H; vy += 1) {
      for (let vx = 0; vx < VIEWPORT_W; vx += 1) {
        const x = vx + camX;
        const y = vy + camY;
        if (x >= 0 && x < level.width && y >= 0 && y < level.height) {
          const px = vx * TILE_SIZE;
          const py = vy * TILE_SIZE;
          drawBaseTile(level.base[y][x], px, py);
          drawZoneOverlay(level, x, y);
        }
      }
    }

    for (let vy = 0; vy < VIEWPORT_H; vy += 1) {
      for (let vx = 0; vx < VIEWPORT_W; vx += 1) {
        const x = vx + camX;
        const y = vy + camY;
        if (x >= 0 && x < level.width && y >= 0 && y < level.height) {
          drawItem(level.items[y][x], vx * TILE_SIZE, vy * TILE_SIZE);
        }
      }
    }

    state.game.moveableItems.bags
      .filter((bag) => !bag.attachedTo && isInView(bag.x, bag.y))
      .forEach((bag) => drawBag(bag));

    drawMower();
    drawCurtis();
    drawPolice();
    drawPlayer();
    drawOverlappingMoveableIndicators();
    drawMowerFillIndicator();
    updateHud();
  }

  // ── Keyboard input ─────────────────────────────────────────

  function handleKeyDown(event) {
    if (state.presentation.phase === "title") {
      event.preventDefault();
      if (!event.repeat) {
        dismissTitle();
      }
      return;
    }

    if (state.presentation.phase === "winning" || state.presentation.phase === "gameover") {
      if (!event.repeat && state.presentation.playAgainReady) {
        triggerPlayAgain();
      }
      return;
    }

    const direction = getDirectionFromKey(event.key);

    if (direction) {
      event.preventDefault();
      if (event.repeat) {
        return;
      }
      beginHeldMovement(direction, "keyboard", event.key);
    } else if (event.key === " " || event.key === "Enter" || event.key === "e" || event.key === "E") {
      event.preventDefault();
      if (event.repeat) {
        return;
      }
      handleAction();
    }
  }

  function handleKeyUp(event) {
    if (heldMoveState.source === "keyboard" && heldMoveState.key === event.key) {
      clearHeldMovement();
    }
  }

  function getDirectionFromKey(key) {
    if (key === "ArrowUp" || key === "w" || key === "W") {
      return "up";
    }
    if (key === "ArrowDown" || key === "s" || key === "S") {
      return "down";
    }
    if (key === "ArrowLeft" || key === "a" || key === "A") {
      return "left";
    }
    if (key === "ArrowRight" || key === "d" || key === "D") {
      return "right";
    }
    return null;
  }

  function stepDirection(direction) {
    if (!direction) {
      return;
    }
    movePlayer(direction);
  }

  function clearHeldMovement() {
    if (heldMoveState.timerId) {
      window.clearInterval(heldMoveState.timerId);
    }
    heldMoveState.source = null;
    heldMoveState.direction = null;
    heldMoveState.key = null;
    heldMoveState.timerId = null;
  }

  function beginHeldMovement(direction, source, key = null, immediate = true) {
    if (!direction) {
      clearHeldMovement();
      return;
    }

    if (heldMoveState.direction === direction && heldMoveState.source === source && heldMoveState.key === key) {
      return;
    }

    clearHeldMovement();
    heldMoveState.source = source;
    heldMoveState.direction = direction;
    heldMoveState.key = key;
    if (immediate) {
      stepDirection(direction);
    }
    heldMoveState.timerId = window.setInterval(() => {
      stepDirection(direction);
    }, SIMULATION_TICK_MS);
  }

  // ── Touch / joystick input ─────────────────────────────────

  function setJoystickVisual(dx, dy, isActive) {
    joystickEl.classList.toggle("is-active", Boolean(isActive));
    joystickKnobEl.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function resetJoystick() {
    touchState.pointerId = null;
    touchState.direction = null;
    if (heldMoveState.source === "joystick") {
      clearHeldMovement();
    }
    setJoystickVisual(0, 0, false);
  }

  function resolveJoystickDirection(event) {
    const rect = joystickEl.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    const rawDx = event.clientX - centerX;
    const rawDy = event.clientY - centerY;
    const radius = rect.width / 2;
    const maxOffset = 30;
    const distance = Math.min(Math.hypot(rawDx, rawDy), radius);
    const angle = Math.atan2(rawDy, rawDx);
    const clampedDx = Math.cos(angle) * Math.min(distance, maxOffset);
    const clampedDy = Math.sin(angle) * Math.min(distance, maxOffset);
    const threshold = 12;

    let direction = null;
    if (distance >= threshold) {
      if (Math.abs(rawDx) > Math.abs(rawDy)) {
        direction = rawDx > 0 ? "right" : "left";
      } else {
        direction = rawDy > 0 ? "down" : "up";
      }
    }

    return {
      direction,
      dx: Number.isFinite(clampedDx) ? clampedDx : 0,
      dy: Number.isFinite(clampedDy) ? clampedDy : 0
    };
  }

  function updateJoystickFromPointer(event) {
    const next = resolveJoystickDirection(event);
    setJoystickVisual(next.dx, next.dy, Boolean(next.direction));

    if (next.direction !== touchState.direction) {
      const previousDirection = touchState.direction;
      touchState.direction = next.direction;
      if (next.direction) {
        beginHeldMovement(next.direction, "joystick", null, previousDirection === null);
      } else if (heldMoveState.source === "joystick") {
        clearHeldMovement();
      }
      return;
    }

    if (!next.direction && heldMoveState.source === "joystick") {
      clearHeldMovement();
    }
  }

  // ── Event listeners ────────────────────────────────────────

  titleScreenEl.addEventListener("pointerdown", () => {
    if (state.presentation.playAgainReady) {
      dismissTitle();
    }
  });

  winScreenEl.addEventListener("pointerdown", () => {
    if (state.presentation.phase === "winning" && state.presentation.playAgainReady) {
      triggerPlayAgain();
    }
  });

  gameOverScreenEl.addEventListener("pointerdown", () => {
    if (state.presentation.phase === "gameover" && state.presentation.playAgainReady) {
      triggerPlayAgain();
    }
  });

  loadDefaultButtonEl.addEventListener("click", () => {
    loadDefaultLevel();
  });

  restartLevelButtonEl.addEventListener("click", () => {
    restartLevel();
  });

  actionButtonEl.addEventListener("click", () => {
    handleAction();
  });

  levelFileInputEl.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    try {
      await readLevelFile(file, file.name);
    } catch (error) {
      setLoadStatus(`Unable to import level: ${error.message}`, "error");
    }
    event.target.value = "";
  });

  document.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("click", () => {
      movePlayer(button.dataset.move);
    });
  });

  joystickEl.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    joystickEl.setPointerCapture(event.pointerId);
    touchState.pointerId = event.pointerId;
    updateJoystickFromPointer(event);
  });

  joystickEl.addEventListener("pointermove", (event) => {
    if (event.pointerId !== touchState.pointerId) {
      return;
    }
    event.preventDefault();
    updateJoystickFromPointer(event);
  });

  joystickEl.addEventListener("pointerup", (event) => {
    if (event.pointerId !== touchState.pointerId) {
      return;
    }
    event.preventDefault();
    resetJoystick();
  });

  joystickEl.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== touchState.pointerId) {
      return;
    }
    event.preventDefault();
    resetJoystick();
  });

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", () => {
    clearHeldMovement();
    resetJoystick();
  });
  window.addEventListener("beforeunload", stopSimulationLoop);

  // ── Startup ────────────────────────────────────────────────

  setCanvasSize(VIEWPORT_W, VIEWPORT_H);
  render();
  showTitleScreen();
  loadDefaultLevel();
}());
