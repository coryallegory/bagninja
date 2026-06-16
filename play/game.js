(function () {
  const DEFAULT_LEVEL_URL = "./levels/level-01.json";
  const TILE_SIZE = 16;
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
      gameOverPhase: "none",
      gameOverTimerId: null,
      playerWalkUntil: 0,
      curtisWalkUntil: 0
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
  const loadStatusEl = document.getElementById("load-status");
  const defaultFileInputEl = document.getElementById("default-file-input");
  const levelFileInputEl = document.getElementById("level-file-input");
  const loadDefaultButtonEl = document.getElementById("load-default");
  const restartLevelButtonEl = document.getElementById("restart-level");
  const actionButtonEl = document.getElementById("action-button");
  const gameOverOverlayEl = document.getElementById("game-over-overlay");

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

  function loadLevelFromObject(levelData, sourceLabel) {
    resetPresentation();
    state.levelSource = sourceLabel;
    state.game = core.createGameState(levelData);
    setCanvasSize(state.game.level.width, state.game.level.height);
    setLoadStatus(`Loaded level from ${sourceLabel}.`, "ok");
    render();
  }

  function setCanvasSize(width, height) {
    canvasEl.width = width * TILE_SIZE;
    canvasEl.height = height * TILE_SIZE;
    canvasFrameEl.style.maxWidth = `${canvasEl.width + 32}px`;
  }

  async function readLevelFile(file, label) {
    const parsed = JSON.parse(await file.text());
    loadLevelFromObject(parsed, label || file.name);
  }

  async function loadDefaultLevel(showFilePicker) {
    if (window.location.protocol === "file:") {
      setLoadStatus("Direct file mode cannot auto-load the default level. Choose play/levels/level-01.json from the file picker.", "error");
      if (showFilePicker) {
        defaultFileInputEl.click();
      }
      return;
    }

    try {
      const response = await fetch(DEFAULT_LEVEL_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const parsed = await response.json();
      loadLevelFromObject(parsed, DEFAULT_LEVEL_URL);
    } catch (error) {
      setLoadStatus(`Unable to load default level: ${error.message}`, "error");
      if (showFilePicker) {
        window.alert(`Unable to load default level from ${DEFAULT_LEVEL_URL}: ${error.message}`);
      }
    }
  }

  function restartLevel() {
    if (!state.game) {
      return;
    }
    loadLevelFromObject(JSON.parse(JSON.stringify(state.game.levelTemplate)), state.levelSource || "current level");
  }

  function resetPresentation() {
    if (state.presentation.gameOverTimerId) {
      window.clearTimeout(state.presentation.gameOverTimerId);
    }
    state.presentation.gameOverTimerId = null;
    state.presentation.gameOverPhase = "none";
    state.presentation.playerWalkUntil = 0;
    state.presentation.curtisWalkUntil = 0;
    gameOverOverlayEl.classList.remove("is-fading");
    gameOverOverlayEl.classList.remove("is-visible");
    gameOverOverlayEl.setAttribute("aria-hidden", "true");
  }

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
    }, SIMULATION_TICK_MS);
  }

  function stopSimulationLoop() {
    if (state.simulationTimerId) {
      window.clearInterval(state.simulationTimerId);
    }
    state.simulationTimerId = null;
  }

  function movePlayer(direction) {
    if (!state.game) {
      return;
    }
    if (core.movePlayer(state.game, direction)) {
      state.presentation.playerWalkUntil = Date.now() + MOVE_ANIMATION_MS;
      flushGameStatus();
      render();
    }
  }

  function handleAction() {
    if (!state.game) {
      return;
    }
    if (core.handleAction(state.game)) {
      flushGameStatus();
      render();
      return;
    }
    flushGameStatus();
    updateHud();
  }

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
    if (!core.isCurtisZoneAt(level, x, y)) {
      return;
    }

    context.fillStyle = "rgba(170, 181, 74, 0.34)";
    context.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
    const pixelX = bag.x * TILE_SIZE;
    const pixelY = bag.y * TILE_SIZE;

    context.fillStyle = "#ab8d63";
    context.fillRect(pixelX + 4, pixelY + 5, 8, 8);
    context.fillStyle = "#886f4d";
    context.fillRect(pixelX + 6, pixelY + 3, 4, 3);
  }

  function drawBag(bag) {
    drawImageOrFallback(ASSET_PATHS.moveable.bag, bag.x * TILE_SIZE, bag.y * TILE_SIZE, () => {
      drawBagFallback(bag);
    });
  }

  function drawMowerFallback() {
    const mower = core.getMower(state.game);
    if (!mower || mower.attachedTo) {
      return;
    }

    const pixelX = mower.x * TILE_SIZE;
    const pixelY = mower.y * TILE_SIZE;

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
    if (!mower || mower.attachedTo) {
      return;
    }
    drawImageOrFallback(ASSET_PATHS.moveable.mower, mower.x * TILE_SIZE, mower.y * TILE_SIZE, () => {
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

    const pixelX = police.x * TILE_SIZE;
    const pixelY = police.y * TILE_SIZE;

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

    const framePath = getCurrentTwoFrame(`../assets/entities/police-walk-${police.facing}`);
    drawImageOrFallback(framePath, police.x * TILE_SIZE, police.y * TILE_SIZE, () => {
      drawPoliceFallback();
    });
  }

  function drawPlayerFallback() {
    if (!state.game || !state.game.player) {
      return;
    }

    const player = state.game.player;
    const pixelX = player.x * TILE_SIZE;
    const pixelY = player.y * TILE_SIZE;

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
    const pixelX = player.x * TILE_SIZE;
    const pixelY = player.y * TILE_SIZE;
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

    drawImageOrFallback(path, pixelX, pixelY, () => {
      drawPlayerFallback();
    });
  }

  function drawCurtisFallback() {
    if (!state.game || !state.game.curtis || !state.game.curtis.outdoors) {
      return;
    }

    const curtis = state.game.curtis;
    const pixelX = curtis.x * TILE_SIZE;
    const pixelY = curtis.y * TILE_SIZE;

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
    if (!state.game || !state.game.curtis || !state.game.curtis.outdoors) {
      return;
    }

    const curtis = state.game.curtis;
    const pixelX = curtis.x * TILE_SIZE;
    const pixelY = curtis.y * TILE_SIZE;
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

  function drawMarkers() {
    if (!state.game || !state.game.level) {
      return;
    }

    const level = state.game.level;
    const player = state.game.player;

    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const marker = level.markers[y][x];
        if (marker === "_" || (x === player.x && y === player.y) || core.getFreeMowerAt(state.game, x, y)) {
          continue;
        }

        const pixelX = x * TILE_SIZE;
        const pixelY = y * TILE_SIZE;

        const markerPath = ASSET_PATHS.markers[marker];
        const drewMarker = drawImageOrFallback(markerPath, pixelX, pixelY, () => {
          if (marker === "c") {
            context.fillStyle = "#1e1a14";
          } else if (marker === "o") {
            context.fillStyle = "#962348";
          } else if (marker === "p") {
            context.fillStyle = "rgba(49, 94, 209, 0.5)";
          } else if (marker === "m") {
            context.fillStyle = "rgba(217, 109, 24, 0.45)";
          } else {
            return;
          }

          context.fillRect(pixelX + 5, pixelY + 5, 6, 6);
        });
        if (!drewMarker && !markerPath) {
          continue;
        }
      }
    }
  }

  function updateHud() {
    if (!state.game) {
      playerStateEl.textContent = "-";
      curtisStateEl.textContent = "-";
      mowedCountEl.textContent = "0 / 0";
      actionButtonEl.textContent = "Action";
      actionButtonEl.disabled = true;
      return;
    }

    playerStateEl.textContent = core.getPlayerStateLabel(state.game);
    curtisStateEl.textContent = core.getCurtisStateLabel(state.game);

    const remaining = core.countRemainingTallGrass(state.game.level);
    const mowed = state.game.totalMowable - remaining;
    mowedCountEl.textContent = `${mowed} / ${state.game.totalMowable}`;
    actionButtonEl.textContent = core.getActionLabel(state.game);
    actionButtonEl.disabled = !core.hasAvailableAction(state.game);
    updateGameOverPresentation();
  }

  function updateGameOverPresentation() {
    if (!state.game) {
      return;
    }

    if (state.game.loseState === "captured" && state.presentation.gameOverPhase === "none") {
      state.presentation.gameOverPhase = "fading";
      gameOverOverlayEl.classList.add("is-fading");
      gameOverOverlayEl.setAttribute("aria-hidden", "false");
      state.presentation.gameOverTimerId = window.setTimeout(() => {
        state.presentation.gameOverPhase = "splash";
        state.game.loseState = "game_over";
        gameOverOverlayEl.classList.add("is-visible");
      }, 800);
      return;
    }

    if (state.game.loseState === "game_over" || state.presentation.gameOverPhase === "splash") {
      gameOverOverlayEl.classList.add("is-fading");
      gameOverOverlayEl.classList.add("is-visible");
      gameOverOverlayEl.setAttribute("aria-hidden", "false");
    }
  }

  function render() {
    if (!state.game || !state.game.level) {
      context.clearRect(0, 0, canvasEl.width, canvasEl.height);
      updateHud();
      return;
    }

    const level = state.game.level;

    context.clearRect(0, 0, canvasEl.width, canvasEl.height);

    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        drawBaseTile(level.base[y][x], x * TILE_SIZE, y * TILE_SIZE);
        drawZoneOverlay(level, x, y);
      }
    }

    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        drawItem(level.items[y][x], x * TILE_SIZE, y * TILE_SIZE);
      }
    }

    state.game.moveableItems.bags
      .filter((bag) => !bag.attachedTo)
      .forEach((bag) => {
        drawBag(bag);
      });

    drawMarkers();
    drawMower();
    drawCurtis();
    drawPolice();
    drawPlayer();
    updateHud();
  }

  function handleKeyDown(event) {
    if (event.repeat) {
      return;
    }

    if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
      event.preventDefault();
      movePlayer("up");
    } else if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
      event.preventDefault();
      movePlayer("down");
    } else if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      event.preventDefault();
      movePlayer("left");
    } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
      event.preventDefault();
      movePlayer("right");
    } else if (event.key === " " || event.key === "Enter" || event.key === "e" || event.key === "E") {
      event.preventDefault();
      handleAction();
    }
  }

  loadDefaultButtonEl.addEventListener("click", () => {
    loadDefaultLevel(true);
  });

  restartLevelButtonEl.addEventListener("click", () => {
    restartLevel();
  });

  actionButtonEl.addEventListener("click", () => {
    handleAction();
  });

  defaultFileInputEl.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    try {
      await readLevelFile(file, file.name);
    } catch (error) {
      setLoadStatus(`Unable to load selected default level: ${error.message}`, "error");
    }
    event.target.value = "";
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

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("beforeunload", stopSimulationLoop);

  setCanvasSize(13, 24);
  render();
  startSimulationLoop();

  if (window.location.protocol === "file:") {
    setLoadStatus("Open over http(s) for automatic default loading, or click Load Default Level and choose play/levels/level-01.json.", "error");
  } else {
    loadDefaultLevel(false);
  }
}());
