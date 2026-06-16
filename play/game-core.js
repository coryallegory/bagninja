(function (globalScope) {
  const BLOCKING_ITEMS = new Set(["H", "F", "B", "T"]);
  const PLAYER_MARKER = "p";
  const MOWER_MARKER = "m";
  const CURTIS_MARKER = "c";
  const POLICE_MARKER = "o";
  const CURTIS_ZONE = "C";
  const BAG_ITEM_SYMBOL = "A";
  const MOWER_CAPACITY = 12;
  const CURTIS_DETECTION_STAGES = ["idle", "spot", "alert", "police"];
  const SEARCH_OFFSETS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];
  const MOVES = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const CURTIS_DIRECTIONS = ["up", "right", "down", "left"];

  function createGameState(levelData, options = {}) {
    const runtime = createLevelRuntime(levelData, options);
    return {
      levelTemplate: JSON.parse(JSON.stringify(levelData)),
      level: runtime.level,
      player: runtime.player,
      curtis: runtime.curtis,
      police: runtime.police,
      moveableItems: runtime.moveableItems,
      totalMowable: runtime.totalMowable,
      hasWon: false,
      loseState: "none",
      lastStatus: null
    };
  }

  function createLevelRuntime(levelData, options = {}) {
    const normalizedLevelData = normalizeLevelData(levelData);
    validateLevel(normalizedLevelData);
    const rng = typeof options.rng === "function" ? options.rng : Math.random;

    const width = normalizedLevelData.base[0].length;
    const height = normalizedLevelData.base.length;

    const level = {
      id: normalizedLevelData.id || "",
      name: normalizedLevelData.name || "",
      width,
      height,
      base: normalizedLevelData.base.map((row) => row.split("")),
      items: normalizedLevelData.items.map((row) => row.split("")),
      markers: normalizedLevelData.markers.map((row) => row.split("")),
      zones: normalizedLevelData.zones.map((row) => row.split(""))
    };

    const playerSpawn = chooseMarker(level, PLAYER_MARKER, rng);
    const mowerSpawn = chooseMarker(level, MOWER_MARKER, rng);
    const curtisSpawn = chooseMarker(level, CURTIS_MARKER, rng);
    const policeSpawn = chooseMarker(level, POLICE_MARKER, rng);

    const player = {
      x: playerSpawn.x,
      y: playerSpawn.y,
      attachedItemType: null,
      facing: "down"
    };

    const curtis = curtisSpawn ? {
      x: curtisSpawn.x,
      y: curtisSpawn.y,
      outdoors: true,
      detectionStage: "idle",
      visibleTicks: 0,
      facing: "left"
    } : null;

    const police = {
      x: policeSpawn ? policeSpawn.x : curtisSpawn.x,
      y: policeSpawn ? policeSpawn.y : curtisSpawn.y,
      spawnX: policeSpawn ? policeSpawn.x : curtisSpawn.x,
      spawnY: policeSpawn ? policeSpawn.y : curtisSpawn.y,
      active: false,
      facing: "left"
    };

    const mower = {
      id: "mower-1",
      itemType: "mower",
      x: mowerSpawn.x,
      y: mowerSpawn.y,
      attachedTo: null,
      active: false,
      fullness: 0,
      capacity: MOWER_CAPACITY
    };

    const bags = extractInitialBags(level);

    if (!isRuntimeWalkable(level, player.x, player.y)) {
      throw new Error("Selected player spawn is not on a walkable cell.");
    }

    if (!isRuntimeWalkable(level, mower.x, mower.y)) {
      throw new Error("Selected mower spawn is not on a walkable cell.");
    }

    if (curtis && !isCurtisWalkable(level, curtis.x, curtis.y)) {
      throw new Error("Selected Curtis spawn is not on a valid Curtis-property cell.");
    }

    return {
      level,
      player,
      curtis,
      police,
      moveableItems: {
        mower,
        bags,
        nextBagId: bags.length + 1
      },
      totalMowable: countTallGrass(level)
    };
  }

  function validateLevel(level) {
    if (!level || !Array.isArray(level.base) || !Array.isArray(level.items) || !Array.isArray(level.markers) || !Array.isArray(level.zones)) {
      throw new Error("Level must include base, items, markers, and zones arrays.");
    }

    const height = level.base.length;
    const width = level.base[0] ? level.base[0].length : 0;

    if (!height || !width) {
      throw new Error("Level dimensions must be greater than zero.");
    }

    if (level.items.length !== height || level.markers.length !== height || level.zones.length !== height) {
      throw new Error("All layers must have the same number of rows.");
    }

    level.base.forEach((row, index) => {
      if (row.length !== width || level.items[index].length !== width || level.markers[index].length !== width || level.zones[index].length !== width) {
        throw new Error(`Row ${index + 1} does not match the expected width of ${width}.`);
      }
    });

    let playerSpawns = 0;
    let mowerSpawns = 0;
    let curtisSpawns = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const item = level.items[y][x];
        const marker = level.markers[y][x];

        if (item !== "_" && marker !== "_") {
          throw new Error(`Cell ${x},${y} cannot contain both an item and a marker.`);
        }

        if (marker === PLAYER_MARKER) {
          playerSpawns += 1;
        } else if (marker === MOWER_MARKER) {
          mowerSpawns += 1;
        } else if (marker === CURTIS_MARKER) {
          curtisSpawns += 1;
        }
      }
    }

    if (playerSpawns === 0) {
      throw new Error("Level must contain at least one player spawn marker.");
    }

    if (mowerSpawns === 0) {
      throw new Error("Level must contain at least one mower spawn marker.");
    }

    if (curtisSpawns === 0) {
      throw new Error("Level must contain at least one Curtis spawn marker.");
    }
  }

  function countRemainingTallGrass(level) {
    return countTallGrass(level);
  }

  function movePlayer(state, direction) {
    if (!state.level || !MOVES[direction] || state.hasWon || isLoseStateBlockingInput(state)) {
      return false;
    }

    const nextX = state.player.x + MOVES[direction].x;
    const nextY = state.player.y + MOVES[direction].y;

    if (!canEnterTile(state, nextX, nextY)) {
      return false;
    }

    state.player.facing = direction;
    state.player.x = nextX;
    state.player.y = nextY;
    syncAttachedMoveableItems(state);

    if (state.player.attachedItemType === "mower") {
      mowCurrentTile(state);
    }

    checkWinCondition(state);
    return true;
  }

  function handleAction(state) {
    if (!state.level || !state.player || state.hasWon || isLoseStateBlockingInput(state)) {
      return false;
    }

    if (state.player.attachedItemType === "mower") {
      return stopMower(state, "Mower stopped.");
    }

    if (state.player.attachedItemType === "bag") {
      return dropBag(state);
    }

    const mower = getFreeMowerAt(state, state.player.x, state.player.y);
    if (mower) {
      if (mower.fullness >= mower.capacity) {
        return emptyMower(state);
      }
      return startMower(state);
    }

    if (getFreeBagAt(state, state.player.x, state.player.y)) {
      return pickUpBag(state);
    }

    return false;
  }

  function advanceSimulationTick(state) {
    if (!state || !state.level || state.hasWon || state.loseState === "game_over") {
      return false;
    }

    const previousCurtisStage = state.curtis ? state.curtis.detectionStage : null;
    const previousCurtisVisibleTicks = state.curtis ? state.curtis.visibleTicks : null;
    const previousLoseState = state.loseState;
    const previousPolicePosition = state.police
      ? `${state.police.x},${state.police.y},${state.police.active},${state.police.facing}`
      : null;

    const curtisMoved = stepCurtis(state);
    const curtisStage = evaluateCurtisDetection(state);
    const policeMoved = stepPolice(state);
    checkWinCondition(state);

    return curtisMoved
      || policeMoved
      || previousCurtisStage !== curtisStage
      || previousCurtisVisibleTicks !== (state.curtis ? state.curtis.visibleTicks : null)
      || previousLoseState !== state.loseState
      || previousPolicePosition !== (state.police
        ? `${state.police.x},${state.police.y},${state.police.active},${state.police.facing}`
        : null)
      || Boolean(state.lastStatus);
  }

  function getPlayerStateLabel(state) {
    if (!state.player) {
      return "-";
    }
    if (state.player.attachedItemType === "mower") {
      return "Operating Mower";
    }
    if (state.player.attachedItemType === "bag") {
      return "Carrying Bag";
    }
    if (getFreeMowerAt(state, state.player.x, state.player.y)) {
      const mower = getMower(state);
      return mower.fullness >= mower.capacity ? "On Full Mower" : "On Mower";
    }
    if (getFreeBagAt(state, state.player.x, state.player.y)) {
      return "On Bag";
    }
    return "On Foot";
  }

  function getActionLabel(state) {
    if (!state.player) {
      return "Action";
    }
    if (state.player.attachedItemType === "mower") {
      return "Stop";
    }
    if (state.player.attachedItemType === "bag") {
      return isCurtisZoneAt(state.level, state.player.x, state.player.y) ? "Drop" : "Carry";
    }

    const mower = getFreeMowerAt(state, state.player.x, state.player.y);
    if (mower) {
      return mower.fullness >= mower.capacity ? "Empty" : "Start";
    }

    if (getFreeBagAt(state, state.player.x, state.player.y)) {
      return "Pick Up";
    }

    return "Action";
  }

  function getCurtisStateLabel(state) {
    if (!state.curtis) {
      return "No Curtis";
    }
    return `${state.curtis.detectionStage} / ${state.curtis.facing}`;
  }

  function hasAvailableAction(state) {
    if (!state.player || state.hasWon || isLoseStateBlockingInput(state)) {
      return false;
    }
    if (state.player.attachedItemType === "mower") {
      return true;
    }
    if (state.player.attachedItemType === "bag") {
      return isCurtisZoneAt(state.level, state.player.x, state.player.y);
    }

    const mower = getFreeMowerAt(state, state.player.x, state.player.y);
    if (mower) {
      return mower.fullness < mower.capacity || Boolean(findNearestFreePlacement(state, mower.x, mower.y));
    }

    return Boolean(getFreeBagAt(state, state.player.x, state.player.y));
  }

  function getMower(state) {
    return state.moveableItems ? state.moveableItems.mower : null;
  }

  function getPolice(state) {
    return state.police || null;
  }

  function getFreeMowerAt(state, x, y) {
    const mower = getMower(state);
    if (!mower || mower.attachedTo) {
      return null;
    }
    return mower.x === x && mower.y === y ? mower : null;
  }

  function getFreeBagAt(state, x, y) {
    return state.moveableItems && state.moveableItems.bags.find((bag) => !bag.attachedTo && bag.x === x && bag.y === y) || null;
  }

  function getAttachedBag(state) {
    return state.moveableItems && state.moveableItems.bags.find((bag) => bag.attachedTo === "player") || null;
  }

  function isPlayerOnCurtisProperty(state) {
    return Boolean(state.level) && isCurtisZoneAt(state.level, state.player.x, state.player.y);
  }

  function isInsideLevel(state, x, y) {
    return Boolean(state.level) && x >= 0 && y >= 0 && x < state.level.width && y < state.level.height;
  }

  function isWalkableCell(state, x, y) {
    return isInsideLevel(state, x, y) && !BLOCKING_ITEMS.has(state.level.items[y][x]);
  }

  function canEnterTile(state, x, y) {
    if (!isWalkableCell(state, x, y)) {
      return false;
    }

    const attached = state.player.attachedItemType;
    const freeBag = getFreeBagAt(state, x, y);
    const freeMower = getFreeMowerAt(state, x, y);

    if (attached === "mower" && freeBag) {
      return false;
    }

    if (attached === "bag" && (freeBag || freeMower)) {
      return false;
    }

    return true;
  }

  function canPlaceFreeMoveableAt(state, x, y) {
    return isWalkableCell(state, x, y) && !getFreeBagAt(state, x, y) && !getFreeMowerAt(state, x, y);
  }

  function isCurtisWalkable(level, x, y) {
    return x >= 0
      && y >= 0
      && x < level.width
      && y < level.height
      && isCurtisZoneAt(level, x, y)
      && !BLOCKING_ITEMS.has(level.items[y][x]);
  }

  function canCurtisOccupy(state, x, y) {
    return Boolean(state.level) && isCurtisWalkable(state.level, x, y);
  }

  function canPoliceOccupy(state, x, y) {
    return isWalkableCell(state, x, y) && !getFreeBagAt(state, x, y) && !getFreeMowerAt(state, x, y);
  }

  function chooseCurtisStep(state) {
    if (!state.curtis || !state.curtis.outdoors) {
      return null;
    }

    const startIndex = Math.max(0, CURTIS_DIRECTIONS.indexOf(state.curtis.facing));
    for (let offsetIndex = 0; offsetIndex < CURTIS_DIRECTIONS.length; offsetIndex += 1) {
      const direction = CURTIS_DIRECTIONS[(startIndex + offsetIndex) % CURTIS_DIRECTIONS.length];
      const offset = MOVES[direction];
      const nextX = state.curtis.x + offset.x;
      const nextY = state.curtis.y + offset.y;
      if (canCurtisOccupy(state, nextX, nextY)) {
        return { direction, x: nextX, y: nextY };
      }
    }

    return null;
  }

  function stepCurtis(state) {
    if (!state.curtis || !state.curtis.outdoors || state.hasWon) {
      return false;
    }

    const step = chooseCurtisStep(state);
    if (!step) {
      return false;
    }

    state.curtis.x = step.x;
    state.curtis.y = step.y;
    state.curtis.facing = step.direction;
    return true;
  }

  function isLoseStateBlockingInput(state) {
    return state.loseState === "captured" || state.loseState === "game_over";
  }

  function choosePoliceStep(state) {
    if (!state.police || !state.police.active) {
      return null;
    }

    const deltaX = state.player.x - state.police.x;
    const deltaY = state.player.y - state.police.y;
    const options = [];

    if (deltaX !== 0) {
      options.push(deltaX < 0 ? "left" : "right");
    }
    if (deltaY !== 0) {
      options.push(deltaY < 0 ? "up" : "down");
    }
    for (const direction of CURTIS_DIRECTIONS) {
      if (!options.includes(direction)) {
        options.push(direction);
      }
    }

    for (const direction of options) {
      const offset = MOVES[direction];
      const nextX = state.police.x + offset.x;
      const nextY = state.police.y + offset.y;
      if ((nextX === state.player.x && nextY === state.player.y) || canPoliceOccupy(state, nextX, nextY)) {
        return { direction, x: nextX, y: nextY };
      }
    }

    return null;
  }

  function stepPolice(state) {
    if (state.hasWon || state.loseState === "captured" || state.loseState === "game_over") {
      return false;
    }

    if (state.loseState === "calling_police") {
      state.police.x = state.police.spawnX;
      state.police.y = state.police.spawnY;
      state.police.active = true;
      state.police.facing = "left";
      state.loseState = "police_arriving";
      setStatus(state, "Police dispatched.", "error");
      return true;
    }

    if (state.loseState !== "police_arriving") {
      return false;
    }

    const step = choosePoliceStep(state);
    if (!step) {
      return false;
    }

    state.police.x = step.x;
    state.police.y = step.y;
    state.police.facing = step.direction;

    if (state.police.x === state.player.x && state.police.y === state.player.y) {
      state.loseState = "captured";
      setStatus(state, "Busted.", "error");
    }

    return true;
  }

  function findNearestFreePlacement(state, originX, originY) {
    const queue = [{ x: originX, y: originY }];
    const visited = new Set([`${originX},${originY}`]);

    while (queue.length > 0) {
      const current = queue.shift();
      for (const offset of SEARCH_OFFSETS) {
        const x = current.x + offset.x;
        const y = current.y + offset.y;
        const key = `${x},${y}`;

        if (visited.has(key) || !isInsideLevel(state, x, y)) {
          continue;
        }

        visited.add(key);

        if (canPlaceFreeMoveableAt(state, x, y)) {
          return { x, y };
        }

        queue.push({ x, y });
      }
    }

    return null;
  }

  function syncAttachedMoveableItems(state) {
    const mower = getMower(state);
    if (mower && mower.attachedTo === "player") {
      mower.x = state.player.x;
      mower.y = state.player.y;
    }

    const bag = getAttachedBag(state);
    if (bag) {
      bag.x = state.player.x;
      bag.y = state.player.y;
    }
  }

  function mowCurrentTile(state) {
    const mower = getMower(state);
    if (!mower || !mower.active) {
      return;
    }

    const item = state.level.items[state.player.y][state.player.x];
    if (item === "L" && mower.fullness < mower.capacity) {
      state.level.items[state.player.y][state.player.x] = "_";
      mower.fullness += 1;
    }

    if (mower.fullness >= mower.capacity) {
      stopMower(state, "Mower is full.");
    }
  }

  function startMower(state) {
    const mower = getFreeMowerAt(state, state.player.x, state.player.y);
    if (!mower || state.player.attachedItemType) {
      return false;
    }

    if (mower.fullness >= mower.capacity) {
      setStatus(state, "Mower is full. Empty it first.", "error");
      return false;
    }

    mower.attachedTo = "player";
    mower.active = true;
    state.player.attachedItemType = "mower";
    syncAttachedMoveableItems(state);
    mowCurrentTile(state);
    setStatus(state, "Mower started.", "ok");
    return true;
  }

  function stopMower(state, message) {
    const mower = getMower(state);
    if (!mower || state.player.attachedItemType !== "mower") {
      return false;
    }

    mower.attachedTo = null;
    mower.active = false;
    mower.x = state.player.x;
    mower.y = state.player.y;
    state.player.attachedItemType = null;
    if (message) {
      setStatus(state, message, "ok");
    }
    return true;
  }

  function emptyMower(state) {
    const mower = getFreeMowerAt(state, state.player.x, state.player.y);
    if (!mower || mower.fullness < mower.capacity || state.player.attachedItemType) {
      return false;
    }

    const placement = findNearestFreePlacement(state, mower.x, mower.y);
    if (!placement) {
      setStatus(state, "No free tile available to place a bag.", "error");
      return false;
    }

    state.moveableItems.bags.push({
      id: `bag-${state.moveableItems.nextBagId}`,
      itemType: "bag",
      x: placement.x,
      y: placement.y,
      attachedTo: null
    });
    state.moveableItems.nextBagId += 1;
    mower.fullness = 0;
    setStatus(state, "Mower emptied.", "ok");
    checkWinCondition(state);
    return true;
  }

  function pickUpBag(state) {
    const bag = getFreeBagAt(state, state.player.x, state.player.y);
    if (!bag || state.player.attachedItemType) {
      return false;
    }

    bag.attachedTo = "player";
    state.player.attachedItemType = "bag";
    syncAttachedMoveableItems(state);
    setStatus(state, "Bag picked up.", "ok");
    checkWinCondition(state);
    return true;
  }

  function dropBag(state) {
    const bag = getAttachedBag(state);
    if (!bag || state.player.attachedItemType !== "bag") {
      return false;
    }

    if (!isCurtisZoneAt(state.level, state.player.x, state.player.y)) {
      setStatus(state, "Bags can only be dropped on Curtis property.", "error");
      return false;
    }

    if (getFreeBagAt(state, state.player.x, state.player.y) || getFreeMowerAt(state, state.player.x, state.player.y)) {
      setStatus(state, "Cannot drop a bag onto another moveable item.", "error");
      return false;
    }

    bag.attachedTo = null;
    bag.x = state.player.x;
    bag.y = state.player.y;
    state.player.attachedItemType = null;
    setStatus(state, "Bag dropped.", "ok");
    checkWinCondition(state);
    return true;
  }

  function areAllBagsOnCurtisProperty(state) {
    return state.moveableItems.bags.every((bag) => !bag.attachedTo && isCurtisZoneAt(state.level, bag.x, bag.y));
  }

  function isCurtisZoneAt(level, x, y) {
    return level.zones[y][x] === CURTIS_ZONE;
  }

  function normalizeLevelData(levelData) {
    if (!levelData) {
      return levelData;
    }

    if (Array.isArray(levelData.zones)) {
      return levelData;
    }

    const zones = (levelData.base || []).map((row) => [...row].map((symbol) => (symbol === CURTIS_ZONE ? CURTIS_ZONE : "_")).join(""));
    const base = (levelData.base || []).map((row) => [...row].map((symbol) => (symbol === CURTIS_ZONE ? "g" : symbol)).join(""));

    return {
      ...levelData,
      base,
      zones
    };
  }

  function hasOrthogonalLineOfSight(state, fromX, fromY, toX, toY) {
    if (fromX !== toX && fromY !== toY) {
      return false;
    }

    const stepX = Math.sign(toX - fromX);
    const stepY = Math.sign(toY - fromY);
    let x = fromX + stepX;
    let y = fromY + stepY;

    while (x !== toX || y !== toY) {
      if (BLOCKING_ITEMS.has(state.level.items[y][x])) {
        return false;
      }
      x += stepX;
      y += stepY;
    }

    return true;
  }

  function canCurtisSeePlayer(state) {
    if (!state.curtis || !state.curtis.outdoors || !isPlayerOnCurtisProperty(state)) {
      return false;
    }

    return hasOrthogonalLineOfSight(
      state,
      state.curtis.x,
      state.curtis.y,
      state.player.x,
      state.player.y
    );
  }

  function evaluateCurtisDetection(state) {
    if (!state.curtis || state.hasWon) {
      return "idle";
    }

    if (!canCurtisOccupy(state, state.curtis.x, state.curtis.y)) {
      throw new Error("Curtis is outside a valid Curtis-property tile.");
    }

    if (!canCurtisSeePlayer(state)) {
      state.curtis.visibleTicks = 0;
      state.curtis.detectionStage = "idle";
      return state.curtis.detectionStage;
    }

    state.curtis.visibleTicks += 1;
    if (state.curtis.visibleTicks >= 3) {
      state.curtis.detectionStage = "police";
      state.loseState = "calling_police";
      setStatus(state, "Curtis called the police.", "error");
    } else if (state.curtis.visibleTicks >= 2) {
      state.curtis.detectionStage = "alert";
      setStatus(state, "Curtis spotted you.", "error");
    } else {
      state.curtis.detectionStage = "spot";
      setStatus(state, "Curtis noticed something.", "error");
    }

    return state.curtis.detectionStage;
  }

  function checkWinCondition(state) {
    if (!state.level || state.hasWon) {
      return false;
    }

    const remaining = countRemainingTallGrass(state.level);
    if (remaining === 0 && areAllBagsOnCurtisProperty(state)) {
      state.hasWon = true;
      setStatus(state, "Level complete: all grass is mowed and every bag is on Curtis property.", "ok");
      return true;
    }
    return false;
  }

  function extractInitialBags(level) {
    const bags = [];
    let nextBagId = 1;

    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        if (level.items[y][x] === BAG_ITEM_SYMBOL) {
          bags.push({
            id: `bag-${nextBagId}`,
            itemType: "bag",
            x,
            y,
            attachedTo: null
          });
          nextBagId += 1;
          level.items[y][x] = "_";
        }
      }
    }

    return bags;
  }

  function countTallGrass(level) {
    let total = 0;
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        if (level.items[y][x] === "L") {
          total += 1;
        }
      }
    }
    return total;
  }

  function findMarkers(level, symbol) {
    const matches = [];
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        if (level.markers[y][x] === symbol) {
          matches.push({ x, y });
        }
      }
    }
    return matches;
  }

  function chooseMarker(level, symbol, rng) {
    const matches = findMarkers(level, symbol);
    if (matches.length === 0) {
      return null;
    }
    const index = Math.min(matches.length - 1, Math.floor(rng() * matches.length));
    return matches[index];
  }

  function isRuntimeWalkable(level, x, y) {
    return x >= 0 && y >= 0 && x < level.width && y < level.height && !BLOCKING_ITEMS.has(level.items[y][x]);
  }

  function setStatus(state, message, tone) {
    state.lastStatus = { message, tone };
  }

  const api = {
    createGameState,
    validateLevel,
    countRemainingTallGrass,
    movePlayer,
    handleAction,
    getPlayerStateLabel,
    getCurtisStateLabel,
    getActionLabel,
    hasAvailableAction,
    getMower,
    getPolice,
    getFreeBagAt,
    getFreeMowerAt,
    checkWinCondition,
    canCurtisOccupy,
    isCurtisZoneAt,
    stepCurtis,
    stepPolice,
    advanceSimulationTick,
    hasOrthogonalLineOfSight,
    canCurtisSeePlayer,
    evaluateCurtisDetection,
    CURTIS_DETECTION_STAGES
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.BagNinjaCore = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
