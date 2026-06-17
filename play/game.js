(function () {
  const DEFAULT_LEVEL_URL = "./levels/level-01.json";
  const TILE_SIZE = 16;
  const DISPLAY_SCALE = 2;
  const VIEWPORT_W = 16;
  const VIEWPORT_H = 16;
  const SIMULATION_TICK_MS = 400;
  const HELD_MOVE_INTERVAL_MS = Math.round(SIMULATION_TICK_MS / 1.5); // ~267ms
  const MOVE_ANIMATION_MS = 220;
  const WIN_CELEBRATION_MS = 2000;
  const WIN_PLAY_AGAIN_DELAY_MS = 3200;
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

  // ── Private canvas refs (set by connect()) ──────────────────

  let canvasEl = null;
  let context  = null;

  // ── Event emitter ────────────────────────────────────────────

  const _handlers = {};

  function emit(event, payload) {
    const list = _handlers[event];
    if (list) list.slice().forEach(fn => fn(payload));
  }

  // ── State ─────────────────────────────────────────────────────

  const state = {
    levelSource: null,
    game: null,
    presentation: {
      phase: "title",
      startTimeMs: 0,
      greyscaleTimerId: null,
      playAgainTimerId: null,
      playAgainReady: false,
      celebrationRafId: null,
      playerWalkUntil: 0,
      curtisWalkUntil: 0,
      camX: 0,
      camY: 0
    },
    simulationTimerId: null
  };

  const imageCache = new Map();
  const silhouetteCache = new Map();

  const heldMoveState = {
    direction: null,
    timerId: null
  };

  // ── Helpers ────────────────────────────────────────────────

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function formatSeconds(ms) {
    return `${(ms / 1000).toFixed(1)}s`;
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

    if (level.width > VIEWPORT_W) {
      const relX = player.x - state.presentation.camX;
      if (relX < CAM_MARGIN) {
        state.presentation.camX = Math.max(0, player.x - CAM_MARGIN);
      } else if (relX > VIEWPORT_W - CAM_MARGIN - 1) {
        state.presentation.camX = Math.min(level.width - VIEWPORT_W, player.x - (VIEWPORT_W - CAM_MARGIN - 1));
      }
    }

    if (level.height > VIEWPORT_H) {
      const relY = player.y - state.presentation.camY;
      if (relY < CAM_MARGIN) {
        state.presentation.camY = Math.max(0, player.y - CAM_MARGIN);
      } else if (relY > VIEWPORT_H - CAM_MARGIN - 1) {
        state.presentation.camY = Math.min(level.height - VIEWPORT_H, player.y - (VIEWPORT_H - CAM_MARGIN - 1));
      }
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

  function flushGameStatus() {
    if (state.game && state.game.lastStatus) {
      emit("load-status", { message: state.game.lastStatus.message, tone: state.game.lastStatus.tone });
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

  function getTintedSilhouette(path, color) {
    const cacheKey = `${path}|${color}`;
    if (silhouetteCache.has(cacheKey)) {
      return silhouetteCache.get(cacheKey);
    }

    const image = getImage(path);
    if (!image || !image.complete || image.naturalWidth <= 0) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, TILE_SIZE, TILE_SIZE);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    silhouetteCache.set(cacheKey, canvas);
    return canvas;
  }

  function drawSpriteOutline(path, pixelX, pixelY, color, thickness) {
    const silhouette = getTintedSilhouette(path, color);
    if (!silhouette) {
      return false;
    }

    for (let dx = -thickness; dx <= thickness; dx += 1) {
      for (let dy = -thickness; dy <= thickness; dy += 1) {
        if ((dx === 0 && dy === 0) || Math.abs(dx) + Math.abs(dy) > thickness) {
          continue;
        }
        context.drawImage(silhouette, pixelX + dx, pixelY + dy, TILE_SIZE, TILE_SIZE);
      }
    }

    return true;
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
    state.presentation.playAgainReady = false;
    if (state.presentation.playAgainTimerId) {
      window.clearTimeout(state.presentation.playAgainTimerId);
    }
    emit("fade-from-black");
    emit("phase", { phase: "title" });
    emit("prompt", { visible: false });
    emit("action-state", { enabled: false });
    state.presentation.playAgainTimerId = window.setTimeout(() => {
      state.presentation.playAgainReady = true;
      emit("prompt", { visible: true });
      emit("action-state", { enabled: true });
    }, 1000);
  }

  function dismissTitle() {
    if (state.presentation.phase !== "title" || !state.presentation.playAgainReady) {
      return;
    }
    emit("action-state", { enabled: false });
    state.presentation.phase = "playing";
    state.presentation.startTimeMs = Date.now();
    emit("phase", { phase: "playing" });
    startSimulationLoop();
    render();
  }

  function showWinScreen() {
    if (state.presentation.phase !== "playing" && state.presentation.phase !== "celebrating") {
      return;
    }
    state.presentation.phase = "winning";
    const elapsed = Date.now() - state.presentation.startTimeMs;
    const alertMs = state.game ? (state.game.curtisAlertMs || 0) : 0;
    emit("phase", { phase: "winning" });
    emit("win", { time: formatTime(elapsed), alertSeconds: formatSeconds(alertMs) });
    emit("prompt", { visible: false });
    emit("action-state", { enabled: false });
    state.presentation.playAgainTimerId = window.setTimeout(() => {
      state.presentation.playAgainReady = true;
      emit("prompt", { visible: true });
      emit("action-state", { enabled: true });
    }, WIN_PLAY_AGAIN_DELAY_MS);
    render();
  }

  function setCanvasGreyscale(step) {
    if (!canvasEl) return;
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
      emit("gameover", { mowed, total: state.game.totalMowable });
    }
    state.presentation.phase = "gameover";
    emit("phase", { phase: "gameover" });
    emit("prompt", { visible: false });
    emit("action-state", { enabled: false });
    state.presentation.playAgainTimerId = window.setTimeout(() => {
      state.presentation.playAgainReady = true;
      emit("prompt", { visible: true });
      emit("action-state", { enabled: true });
    }, 5000);
    render();
  }

  function beginLoseSequence() {
    stopSimulationLoop();
    clearHeldMovement();
    emit("impact");
    if (canvasEl) canvasEl.classList.add("greyscale-smooth");
    setCanvasGreyscale(4);
    state.presentation.greyscaleTimerId = window.setTimeout(() => {
      if (canvasEl) canvasEl.classList.remove("greyscale-smooth");
      showGameOver();
    }, 1300);
  }

  function showCelebration() {
    if (state.presentation.phase !== "playing") return;
    stopSimulationLoop();
    clearHeldMovement();
    state.presentation.phase = "celebrating";
    emit("phase", { phase: "celebrating" });
    emit("action-state", { enabled: false });

    function animateCelebration() {
      render();
      state.presentation.celebrationRafId = window.requestAnimationFrame(animateCelebration);
    }
    state.presentation.celebrationRafId = window.requestAnimationFrame(animateCelebration);

    state.presentation.greyscaleTimerId = window.setTimeout(() => {
      if (state.presentation.celebrationRafId) {
        window.cancelAnimationFrame(state.presentation.celebrationRafId);
        state.presentation.celebrationRafId = null;
      }
      showWinScreen();
    }, WIN_CELEBRATION_MS);
  }

  function triggerPlayAgain() {
    if (state.presentation.playAgainTimerId) {
      window.clearTimeout(state.presentation.playAgainTimerId);
      state.presentation.playAgainTimerId = null;
    }
    state.presentation.playAgainReady = false;
    emit("fade-to-black");
    window.setTimeout(handleResetToTitle, 420);
  }

  function handleConfirm() {
    const phase = state.presentation.phase;
    if (phase === "title") {
      dismissTitle();
    } else if ((phase === "winning" || phase === "gameover") && state.presentation.playAgainReady) {
      triggerPlayAgain();
    }
  }

  function handlePause() {
    if (state.presentation.phase !== "playing") return;
    state.presentation.phase = "paused";
    stopSimulationLoop();
    clearHeldMovement();
    setCanvasGreyscale(4);
    emit("phase", { phase: "paused" });
    emit("action-state", { enabled: true });
  }

  function handleResume() {
    if (state.presentation.phase !== "paused") return;
    setCanvasGreyscale(0);
    state.presentation.phase = "playing";
    emit("phase", { phase: "playing" });
    startSimulationLoop();
    updateHud();
  }

  function handleResetToTitle() {
    stopSimulationLoop();
    if (state.presentation.celebrationRafId) {
      window.cancelAnimationFrame(state.presentation.celebrationRafId);
      state.presentation.celebrationRafId = null;
    }
    clearHeldMovement();
    setCanvasGreyscale(0);
    if (state.presentation.greyscaleTimerId) {
      window.clearTimeout(state.presentation.greyscaleTimerId);
      state.presentation.greyscaleTimerId = null;
    }
    state.presentation.phase = "title";
    emit("reset");
    showTitleScreen();
    loadDefaultLevel();
  }

  function checkForScreenTransitions() {
    if (!state.game) {
      return;
    }
    if (state.game.hasWon && state.presentation.phase === "playing") {
      showCelebration();
    }
    if (state.game.loseState === "captured" && state.presentation.phase === "playing") {
      state.presentation.phase = "losing";
      emit("phase", { phase: "losing" });
      beginLoseSequence();
    }
  }

  function resetPresentation() {
    if (state.presentation.greyscaleTimerId) {
      window.clearTimeout(state.presentation.greyscaleTimerId);
      state.presentation.greyscaleTimerId = null;
    }
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
    emit("reset");
    if (state.presentation.phase !== "title") {
      state.presentation.phase = "playing";
      state.presentation.startTimeMs = Date.now();
      emit("phase", { phase: "playing" });
      startSimulationLoop();
    }
  }

  // ── Level loading ──────────────────────────────────────────

  function loadLevelFromObject(levelData, sourceLabel) {
    resetPresentation();
    state.levelSource = sourceLabel;
    state.game = core.createGameState(levelData);
    initCamera();
    emit("load-status", { message: `Loaded level from ${sourceLabel}.`, tone: "ok" });
    render();
  }

  function setCanvasSize(width, height) {
    if (!canvasEl) return;
    canvasEl.width = width * TILE_SIZE;
    canvasEl.height = height * TILE_SIZE;
  }

  async function readLevelFile(file, label) {
    try {
      const parsed = JSON.parse(await file.text());
      loadLevelFromObject(parsed, label || file.name);
    } catch (error) {
      emit("load-status", { message: `Unable to import level: ${error.message}`, tone: "error" });
    }
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
      emit("load-status", { message: `Unable to load default level: ${error.message}`, tone: "error" });
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
    } else if (player.attachedItemType === "bag") {
      path = `../assets/entities/player-carry-${facing}-01.png`;
    } else {
      path = isWalking
        ? getCurrentTwoFrame(`../assets/entities/player-walk-${facing}`)
        : `../assets/entities/player-idle-${facing}-01.png`;
    }

    drawImageOrFallback(path, toPixelX(player.x), toPixelY(player.y), () => {
      drawPlayerFallback();
    });
  }

  function drawCelebrationSprite() {
    if (!state.game || !state.game.player) return;
    const { player } = state.game;
    const frameIdx = Math.floor(Date.now() / 140) % 4;
    const path = `../assets/entities/player-celebrate-0${frameIdx + 1}.png`;
    const img = getImage(path);
    if (img && img.complete && img.naturalWidth > 0) {
      context.drawImage(img, toPixelX(player.x), toPixelY(player.y), TILE_SIZE, TILE_SIZE);
    }
  }

  function drawCurtisFallback() {
    if (!state.game || !state.game.curtis || !state.game.curtis.outdoors) {
      return;
    }

    const curtis = state.game.curtis;
    const pixelX = toPixelX(curtis.x);
    const pixelY = toPixelY(curtis.y);
    const isAlerted = curtis.detectionStage === "spot" || curtis.detectionStage === "alert" || curtis.detectionStage === "police";

    if (isAlerted) {
      context.fillStyle = "rgba(220, 35, 35, 0.95)";
      context.fillRect(pixelX + 3, pixelY + 2, 10, 12);
      context.fillRect(pixelX + 4, pixelY + 1, 8, 14);
    }

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
    const isAlerted = curtis.detectionStage === "spot" || curtis.detectionStage === "alert" || curtis.detectionStage === "police";

    if (isAlerted) {
      drawSpriteOutline(path, pixelX, pixelY, "rgba(220, 35, 35, 0.95)", 2);
    }

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

  function drawPoliceOffscreenIndicator() {
    if (!state.game) return;
    const police = core.getPolice(state.game);
    if (!police || !police.active) return;
    if (isInView(police.x, police.y)) return;

    const camX = state.presentation.camX;
    const camY = state.presentation.camY;
    const relX = police.x - camX;
    const relY = police.y - camY;

    // Which axis is the police further out of bounds on?
    const excessX = Math.max(0, -relX) + Math.max(0, relX - (VIEWPORT_W - 1));
    const excessY = Math.max(0, -relY) + Math.max(0, relY - (VIEWPORT_H - 1));

    let edgeVX, edgeVY;
    if (excessX >= excessY) {
      edgeVX = relX < 0 ? 0 : VIEWPORT_W - 1;
      edgeVY = Math.max(0, Math.min(VIEWPORT_H - 1, relY));
    } else {
      edgeVY = relY < 0 ? 0 : VIEWPORT_H - 1;
      edgeVX = Math.max(0, Math.min(VIEWPORT_W - 1, relX));
    }

    const px = edgeVX * TILE_SIZE;
    const py = edgeVY * TILE_SIZE;
    const frame = Math.floor(Date.now() / 360) % 2;

    drawSirenSprite(px, py, frame, "rgba(220, 35, 35, 0.95)");
  }

  function drawSirenSprite(px, py, frame, ringColor) {
    const cx = px + 8;
    const cy = py + 7;

    // Bubble background
    context.save();
    context.beginPath();
    context.arc(cx, cy, 7, 0, Math.PI * 2);
    context.fillStyle = "rgba(4, 3, 2, 0.82)";
    context.fill();
    context.strokeStyle = ringColor;
    context.lineWidth = 1;
    context.stroke();
    context.restore();

    // Beacon housing (dark outer block)
    context.fillStyle = "#181412";
    context.fillRect(px + 4, py + 2, 8, 6);

    // Light window — left 3px / right 3px swap bright↔dim each frame
    const bright = "#ff6010";
    const dim    = "#5a1e00";
    if (frame === 0) {
      context.fillStyle = bright;
      context.fillRect(px + 5, py + 3, 3, 4);
      context.fillStyle = dim;
      context.fillRect(px + 8, py + 3, 3, 4);
    } else {
      context.fillStyle = dim;
      context.fillRect(px + 5, py + 3, 3, 4);
      context.fillStyle = bright;
      context.fillRect(px + 8, py + 3, 3, 4);
    }

    // Mount stem + base
    context.fillStyle = "#3c3c3c";
    context.fillRect(px + 7, py + 8, 2, 2);
    context.fillStyle = "#505050";
    context.fillRect(px + 5, py + 10, 6, 1);
  }

  // ── HUD ────────────────────────────────────────────────────

  function updateHud() {
    emit("action-state", {
      enabled: Boolean(state.game && core.hasAvailableAction(state.game))
    });
  }

  // ── Render ─────────────────────────────────────────────────

  function render() {
    if (!context) return;

    if (state.presentation.phase === "title") {
      context.fillStyle = "#080808";
      context.fillRect(0, 0, canvasEl.width, canvasEl.height);
      return;
    }

    const CUTSCENE = {
      gameover: "../assets/cutscenes/cutscene-lose.png",
    };
    if (CUTSCENE[state.presentation.phase]) {
      const img = getImage(CUTSCENE[state.presentation.phase]);
      if (img && img.complete && img.naturalWidth > 0) {
        context.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
      } else {
        context.fillStyle = "#080808";
        context.fillRect(0, 0, canvasEl.width, canvasEl.height);
      }
      return;
    }

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
    if (state.presentation.phase === "celebrating") drawCelebrationSprite();
    drawPoliceOffscreenIndicator();
    drawMowerFillIndicator();
    updateHud();
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
    heldMoveState.direction = null;
    heldMoveState.timerId = null;
  }

  function beginHeldMovement(direction, immediate = true) {
    if (!direction) {
      clearHeldMovement();
      return;
    }
    if (heldMoveState.direction === direction) {
      return;
    }
    clearHeldMovement();
    heldMoveState.direction = direction;
    if (immediate) {
      stepDirection(direction);
    }
    heldMoveState.timerId = window.setInterval(() => {
      stepDirection(direction);
    }, HELD_MOVE_INTERVAL_MS);
  }

  // ── Public API ─────────────────────────────────────────────

  window.BagNinjaGame = {
    connect(canvas) {
      canvasEl = canvas;
      context  = canvas.getContext("2d");
      setCanvasSize(VIEWPORT_W, VIEWPORT_H);
      render();
      showTitleScreen();
      loadDefaultLevel();
    },

    command(name, ...args) {
      switch (name) {
        case "move-start":   if (state.presentation.phase === "playing") beginHeldMovement(args[0], args[1] !== false); break;
        case "move-stop":    clearHeldMovement(); break;
        case "action":       handleAction(); break;
        case "confirm":      handleConfirm(); break;
        case "pause":          handlePause(); break;
        case "resume":         handleResume(); break;
        case "restart":        restartLevel(); break;
        case "reset-to-title": handleResetToTitle(); break;
        case "load-default": loadDefaultLevel(); break;
        case "load-file":    readLevelFile(args[0], args[1]); break;
        default: break;
      }
    },

    on(event, fn) {
      (_handlers[event] || (_handlers[event] = [])).push(fn);
    },

    off(event, fn) {
      const list = _handlers[event];
      if (list) _handlers[event] = list.filter(h => h !== fn);
    },

    disconnect() {
      stopSimulationLoop();
      clearHeldMovement();
      if (state.presentation.greyscaleTimerId) window.clearTimeout(state.presentation.greyscaleTimerId);
      if (state.presentation.playAgainTimerId)  window.clearTimeout(state.presentation.playAgainTimerId);
      canvasEl = null;
      context  = null;
    }
  };
}());
