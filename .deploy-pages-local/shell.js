(function () {
  const game = window.BagNinjaGame;
  if (!game) throw new Error("BagNinjaGame is required before loading shell.js.");

  // ── DOM refs ──────────────────────────────────────────────────

  const canvasEl            = document.getElementById("game-canvas");
  const titleScreenEl       = document.getElementById("title-screen");
  const titlePromptEl       = document.getElementById("title-prompt");
  const winScreenEl         = document.getElementById("win-screen");
  const winTimeEl           = document.getElementById("win-time");
  const winAlertTimeEl      = document.getElementById("win-alert-time");
  const winPlayAgainEl      = document.getElementById("win-play-again");
  const gameOverScreenEl    = document.getElementById("game-over-screen");
  const gameoverMowedEl     = document.getElementById("gameover-mowed");
  const gameoverPlayAgainEl = document.getElementById("gameover-play-again");
  const actionButtonEl      = document.getElementById("action-button");
  const pauseButtonEl       = document.getElementById("pause-button");
  const joystickEl          = document.getElementById("joystick");
  const joystickKnobEl      = document.getElementById("joystick-knob");
  const loadDefaultButtonEl  = document.getElementById("load-default");
  const restartLevelButtonEl = document.getElementById("restart-level");
  const levelFileInputEl     = document.getElementById("level-file-input");
  const pauseScreenEl  = document.getElementById("pause-screen");
  const pauseTitleEl   = document.getElementById("pause-title");
  const pauseMessageEl = document.getElementById("pause-message");
  const pauseOptEls    = [document.getElementById("pause-opt-0"), document.getElementById("pause-opt-1")];
  const pauseLblEls    = [document.getElementById("pause-lbl-0"), document.getElementById("pause-lbl-1")];
  const impactFlashEl  = document.getElementById("impact-flash");
  const fadeCurtainEl  = document.getElementById("fade-curtain");
  const WIN_STATS_REVEAL_DELAY_MS = 1700;

  // ── Shell state ───────────────────────────────────────────────

  let currentPhase  = "title";
  let activeHeldKey = null;
  let winStatsTimerId = null;

  const touchState = { pointerId: null, direction: null };

  const pauseState = { selection: 0, confirming: false };
  const PAUSE_MENUS = {
    normal:  { title: "PAUSED", message: null,            options: ["BACK", "RESET"]   },
    confirm: { title: "RESET",  message: "Are you sure?", options: ["YES",  "CANCEL"] }
  };

  // ── Game event reactions ──────────────────────────────────────

  game.on("phase", ({ phase }) => {
    const prev = currentPhase;
    currentPhase = phase;

    if (winStatsTimerId) {
      window.clearTimeout(winStatsTimerId);
      winStatsTimerId = null;
    }

    pauseButtonEl.disabled = (phase !== "playing" && phase !== "paused");

    if (phase === "paused") {
      resetJoystick();
      enterPauseMenu();
    }

    if (prev === "paused" && phase !== "paused") {
      exitPauseMenu();
    }

    if (phase === "title") {
      titlePromptEl.hidden = true;
      titlePromptEl.style.animation = "";
      titleScreenEl.style.transition = "none";
      titleScreenEl.classList.remove("is-dismissing");
      titleScreenEl.style.display = "";
      titleScreenEl.setAttribute("aria-hidden", "false");
      void titleScreenEl.offsetWidth; // flush so transition-none takes effect
      titleScreenEl.style.transition = "";
    }

    if (phase === "playing" && prev === "title") {
      titleScreenEl.classList.add("is-dismissing");
      window.setTimeout(() => {
        titleScreenEl.style.display = "none";
        titleScreenEl.setAttribute("aria-hidden", "true");
      }, 650);
    }

    if (phase === "winning") {
      winScreenEl.setAttribute("aria-hidden", "false");
      winScreenEl.classList.add("is-active");
      winScreenEl.classList.remove("is-stats-visible");
      winPlayAgainEl.hidden = true;
      winPlayAgainEl.style.animation = "";
      winStatsTimerId = window.setTimeout(() => {
        winScreenEl.classList.add("is-stats-visible");
        winStatsTimerId = null;
      }, WIN_STATS_REVEAL_DELAY_MS);
    }

    if (phase === "gameover") {
      gameOverScreenEl.setAttribute("aria-hidden", "false");
      gameOverScreenEl.classList.add("is-visible");
    }
  });

  game.on("win", ({ time, alertSeconds }) => {
    winTimeEl.textContent      = time;
    winAlertTimeEl.textContent = alertSeconds;
  });

  game.on("gameover", ({ mowed, total }) => {
    gameoverMowedEl.textContent = `${mowed} / ${total}`;
  });

  game.on("prompt", ({ visible }) => {
    if (currentPhase === "title") {
      if (visible) {
        titlePromptEl.style.animation = "prompt-appear 700ms ease-out forwards, prompt-pulse 1.4s ease-in-out 700ms infinite";
        titlePromptEl.hidden = false;
      } else {
        titlePromptEl.hidden = true;
        titlePromptEl.style.animation = "";
      }
    } else if (currentPhase === "winning") {
      if (visible) {
        winPlayAgainEl.style.animation = "prompt-appear 700ms ease-out forwards, prompt-pulse 1.4s ease-in-out 700ms infinite";
        winPlayAgainEl.hidden = false;
      } else {
        winPlayAgainEl.hidden = true;
        winPlayAgainEl.style.animation = "";
      }
    } else if (currentPhase === "gameover") {
      if (visible) {
        gameoverPlayAgainEl.style.animation = "prompt-appear 700ms ease-out forwards, prompt-pulse 1.4s ease-in-out 700ms infinite";
        gameoverPlayAgainEl.hidden = false;
      } else {
        gameoverPlayAgainEl.hidden = true;
        gameoverPlayAgainEl.style.animation = "";
      }
    }
  });

  game.on("impact", () => {
    impactFlashEl.classList.remove("is-active");
    void impactFlashEl.offsetWidth; // force reflow so animation restarts
    impactFlashEl.classList.add("is-active");
  });

  game.on("fade-to-black", () => {
    fadeCurtainEl.classList.add("is-active");
  });

  game.on("fade-from-black", () => {
    fadeCurtainEl.classList.remove("is-active");
  });

  game.on("reset", () => {
    // Suppress transitions — curtain is opaque, so instant-hide is invisible to the user.
    // Without this, the slide-up animation outlasts the curtain and reappears briefly.
    [winScreenEl, gameOverScreenEl].forEach(el => { el.style.transition = "none"; });

    winScreenEl.classList.remove("is-active", "is-hiding");
    winScreenEl.classList.remove("is-stats-visible");
    winScreenEl.setAttribute("aria-hidden", "true");
    winPlayAgainEl.hidden = true;
    winPlayAgainEl.style.animation = "";

    gameOverScreenEl.classList.remove("is-visible", "is-hiding");
    gameOverScreenEl.setAttribute("aria-hidden", "true");
    gameoverPlayAgainEl.hidden = true;
    gameoverPlayAgainEl.style.animation = "";

    // Flush the suppressed state, then re-enable transitions for future use.
    void winScreenEl.offsetWidth;
    [winScreenEl, gameOverScreenEl].forEach(el => { el.style.transition = ""; });
  });

  game.on("action-state", ({ enabled }) => {
    actionButtonEl.disabled = !enabled;
  });

  // ── Joystick / D-pad ──────────────────────────────────────────

  function setJoystickVisual(dx, dy, isActive) {
    joystickEl.classList.toggle("is-active", Boolean(isActive));
    joystickKnobEl.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function resetJoystick() {
    const wasActive = touchState.direction !== null;
    touchState.pointerId = null;
    touchState.direction = null;
    setJoystickVisual(0, 0, false);
    if (wasActive) game.command("move-stop");
  }

  // ── Pause menu ────────────────────────────────────────────────

  function renderPauseMenu() {
    const menu = pauseState.confirming ? PAUSE_MENUS.confirm : PAUSE_MENUS.normal;
    pauseTitleEl.textContent = menu.title;
    pauseMessageEl.textContent = menu.message || "";
    pauseMessageEl.hidden = !menu.message;
    pauseLblEls[0].textContent = menu.options[0];
    pauseLblEls[1].textContent = menu.options[1];
    pauseOptEls.forEach((el, i) => el.classList.toggle("is-selected", i === pauseState.selection));
  }

  function enterPauseMenu() {
    pauseState.selection = 0;
    pauseState.confirming = false;
    renderPauseMenu();
    pauseScreenEl.setAttribute("aria-hidden", "false");
    pauseScreenEl.classList.add("is-active");
  }

  function exitPauseMenu() {
    pauseScreenEl.classList.remove("is-active");
    pauseScreenEl.setAttribute("aria-hidden", "true");
  }

  function movePauseSelection(delta) {
    pauseState.selection = (pauseState.selection + delta + 2) % 2;
    renderPauseMenu();
  }

  function confirmPauseSelection() {
    if (pauseState.confirming) {
      if (pauseState.selection === 0) {
        game.command("reset-to-title");   // YES
      } else {
        pauseState.confirming = false;
        pauseState.selection  = 0;
        renderPauseMenu();         // CANCEL → back to pause menu
      }
    } else {
      if (pauseState.selection === 0) {
        game.command("resume");    // BACK
      } else {
        pauseState.confirming = true;
        pauseState.selection  = 0;
        renderPauseMenu();         // RESET → confirm dialog
      }
    }
  }

  function resolveJoystickDirection(event) {
    const rect    = joystickEl.getBoundingClientRect();
    const centerX = rect.left + rect.width  / 2;
    const centerY = rect.top  + rect.height / 2;
    const rawDx   = event.clientX - centerX;
    const rawDy   = event.clientY - centerY;
    const radius  = rect.width / 2;
    const distance = Math.min(Math.hypot(rawDx, rawDy), radius);
    const angle    = Math.atan2(rawDy, rawDx);
    const clampedDx = Math.cos(angle) * Math.min(distance, 30);
    const clampedDy = Math.sin(angle) * Math.min(distance, 30);

    let direction = null;
    if (distance >= 12) {
      direction = Math.abs(rawDx) > Math.abs(rawDy)
        ? (rawDx > 0 ? "right" : "left")
        : (rawDy > 0 ? "down"  : "up");
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
      const prev = touchState.direction;
      touchState.direction = next.direction;
      if (next.direction) {
        if (currentPhase === "paused") {
          if (next.direction === "up")   movePauseSelection(-1);
          if (next.direction === "down") movePauseSelection(1);
        } else {
          game.command("move-start", next.direction, prev === null);
        }
      } else if (currentPhase !== "paused") {
        game.command("move-stop");
      }
      return;
    }
    if (!next.direction && currentPhase !== "paused") game.command("move-stop");
  }

  // ── Keyboard ──────────────────────────────────────────────────

  function getDirectionFromKey(key) {
    if (key === "ArrowUp"    || key === "w" || key === "W") return "up";
    if (key === "ArrowDown"  || key === "s" || key === "S") return "down";
    if (key === "ArrowLeft"  || key === "a" || key === "A") return "left";
    if (key === "ArrowRight" || key === "d" || key === "D") return "right";
    return null;
  }

  function handleKeyDown(event) {
    if (event.repeat) return;

    if (event.key === "Escape") {
      event.preventDefault();
      if (currentPhase === "playing") game.command("pause");
      else if (currentPhase === "paused") game.command("resume");
      return;
    }

    if (currentPhase === "paused") {
      event.preventDefault();
      const k = event.key;
      if      (k === "ArrowUp"   || k === "w" || k === "W") movePauseSelection(-1);
      else if (k === "ArrowDown" || k === "s" || k === "S") movePauseSelection(1);
      else if (k === " " || k === "Enter" || k === "e" || k === "E") confirmPauseSelection();
      return;
    }

    if (currentPhase === "title" || currentPhase === "winning" || currentPhase === "gameover") {
      event.preventDefault();
      game.command("confirm");
      return;
    }

    if (currentPhase !== "playing") return;

    const direction = getDirectionFromKey(event.key);
    if (direction) {
      event.preventDefault();
      activeHeldKey = event.key;
      game.command("move-start", direction, true);
    } else if (event.key === " " || event.key === "Enter" || event.key === "e" || event.key === "E") {
      event.preventDefault();
      game.command("action");
    }
  }

  function handleKeyUp(event) {
    if (event.key === activeHeldKey) {
      activeHeldKey = null;
      game.command("move-stop");
    }
  }

  // ── Event listeners ───────────────────────────────────────────

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup",   handleKeyUp);
  window.addEventListener("blur", () => {
    activeHeldKey = null;
    game.command("move-stop");
    resetJoystick();
  });
  window.addEventListener("beforeunload", () => game.disconnect());

  joystickEl.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    joystickEl.setPointerCapture(e.pointerId);
    touchState.pointerId = e.pointerId;
    updateJoystickFromPointer(e);
  });
  joystickEl.addEventListener("pointermove", (e) => {
    if (e.pointerId !== touchState.pointerId) return;
    e.preventDefault();
    updateJoystickFromPointer(e);
  });
  joystickEl.addEventListener("pointerup", (e) => {
    if (e.pointerId !== touchState.pointerId) return;
    e.preventDefault();
    resetJoystick();
  });
  joystickEl.addEventListener("pointercancel", (e) => {
    if (e.pointerId !== touchState.pointerId) return;
    e.preventDefault();
    resetJoystick();
  });

  titleScreenEl.addEventListener("pointerdown",   () => game.command("confirm"));
  winScreenEl.addEventListener("pointerdown",      () => game.command("confirm"));
  gameOverScreenEl.addEventListener("pointerdown", () => game.command("confirm"));

  pauseButtonEl.addEventListener("click", () => {
    if (currentPhase === "playing") {
      game.command("pause");
    } else if (currentPhase === "paused") {
      game.command("resume");
    }
  });

  actionButtonEl.addEventListener("click", () => {
    if (currentPhase === "playing") {
      game.command("action");
    } else if (currentPhase === "paused") {
      confirmPauseSelection();
    } else {
      game.command("confirm");
    }
  });
  loadDefaultButtonEl.addEventListener("click",  () => game.command("load-default"));
  restartLevelButtonEl.addEventListener("click", () => game.command("restart"));

  levelFileInputEl.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    game.command("load-file", file, file.name);
    event.target.value = "";
  });

  document.querySelectorAll("[data-move]").forEach((btn) => {
    btn.addEventListener("click", () => game.command("move-start", btn.dataset.move, true));
  });

  // ── Startup ───────────────────────────────────────────────────

  game.connect(canvasEl);
}());
