const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const core = require("../play/game-core.js");
const runtimeLevel01 = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "play", "levels", "level-01.json"), "utf8")
);

function makeLevel(overrides = {}) {
  return {
    id: "test-level",
    name: "Test Level",
    base: [
      "ggggg",
      "ggggg",
      "ggggg",
      "ggggg",
      "ggggg"
    ],
    zones: [
      "_____",
      "_____",
      "_____",
      "__CC_",
      "__CC_"
    ],
    items: [
      "_____",
      "_LL__",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "p____",
      "_____",
      "__m__",
      "___c_",
      "_____"
    ],
    ...overrides
  };
}

function createGame(levelOverrides, options) {
  return core.createGameState(makeLevel(levelOverrides), options);
}

function findAllMarkers(level, symbol) {
  const matches = [];
  for (let y = 0; y < level.markers.length; y += 1) {
    for (let x = 0; x < level.markers[y].length; x += 1) {
      if (level.markers[y][x] === symbol) {
        matches.push({ x, y });
      }
    }
  }
  return matches;
}

function isWalkableLevelCell(level, x, y) {
  const item = level.items[y][x];
  return item !== "H" && item !== "F" && item !== "B" && item !== "T" && item !== "K";
}

function floodReachable(level, starts) {
  const queue = [];
  const visited = new Set();

  for (const start of starts) {
    const key = `${start.x},${start.y}`;
    if (visited.has(key) || !isWalkableLevelCell(level, start.x, start.y)) {
      continue;
    }
    visited.add(key);
    queue.push(start);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = [
      { x: current.x, y: current.y - 1 },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x - 1, y: current.y }
    ];

    for (const neighbor of neighbors) {
      if (
        neighbor.x < 0
        || neighbor.y < 0
        || neighbor.y >= level.items.length
        || neighbor.x >= level.items[neighbor.y].length
        || !isWalkableLevelCell(level, neighbor.x, neighbor.y)
      ) {
        continue;
      }

      const key = `${neighbor.x},${neighbor.y}`;
      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      queue.push(neighbor);
    }
  }

  return visited;
}

test("validateLevel rejects cells that contain both an item and a marker", () => {
  const level = makeLevel({
    items: [
      "_____",
      "_L___",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "_p___",
      "_m___",
      "___c_",
      "_____"
    ]
  });

  assert.throws(() => core.validateLevel(level), /cannot contain both an item and a marker/);
});

test("level-01 loads as a valid runtime level", () => {
  assert.doesNotThrow(() => core.createGameState(runtimeLevel01, { rng: () => 0 }));
});

test("level-01 keeps all tall grass reachable from at least one player spawn", () => {
  const playerSpawns = findAllMarkers(runtimeLevel01, "p");
  const reachable = floodReachable(runtimeLevel01, playerSpawns);

  let tallGrassCount = 0;
  for (let y = 0; y < runtimeLevel01.items.length; y += 1) {
    for (let x = 0; x < runtimeLevel01.items[y].length; x += 1) {
      if (runtimeLevel01.items[y][x] !== "L") {
        continue;
      }
      tallGrassCount += 1;
      assert.equal(
        reachable.has(`${x},${y}`),
        true,
        `Tall grass at ${x},${y} should be reachable from a player spawn`
      );
    }
  }

  assert.ok(tallGrassCount > 0);
});

test("level-01 provides a walkable route from player spawns to Curtis territory", () => {
  const playerSpawns = findAllMarkers(runtimeLevel01, "p");
  const reachable = floodReachable(runtimeLevel01, playerSpawns);

  let reachableCurtisTiles = 0;
  for (let y = 0; y < runtimeLevel01.zones.length; y += 1) {
    for (let x = 0; x < runtimeLevel01.zones[y].length; x += 1) {
      if (runtimeLevel01.zones[y][x] !== "C") {
        continue;
      }
      if (reachable.has(`${x},${y}`)) {
        reachableCurtisTiles += 1;
      }
    }
  }

  assert.ok(reachableCurtisTiles > 0, "At least one Curtis-territory tile should be reachable from player spawns");
});

test("level-01 keeps Curtis spawns and police spawns on walkable cells", () => {
  for (const marker of ["c", "o"]) {
    for (const position of findAllMarkers(runtimeLevel01, marker)) {
      assert.equal(
        isWalkableLevelCell(runtimeLevel01, position.x, position.y),
        true,
        `${marker} spawn at ${position.x},${position.y} should be on a walkable cell`
      );
    }
  }
});

test("level-01 allows dropping a carried bag onto a Curtis-zone tile", () => {
  const game = core.createGameState(runtimeLevel01, { rng: () => 0 });
  const zonePosition = { x: 8, y: 12 };

  game.moveableItems.bags.push({
    id: "bag-drop-test",
    itemType: "bag",
    x: game.player.x,
    y: game.player.y,
    attachedTo: "player"
  });
  game.player.attachedItemType = "bag";
  game.player.x = zonePosition.x;
  game.player.y = zonePosition.y;

  assert.equal(core.isCurtisZoneAt(game.level, zonePosition.x, zonePosition.y), true);
  assert.equal(core.handleAction(game), true);
  assert.equal(game.player.attachedItemType, null);
  assert.equal(
    game.moveableItems.bags.some((bag) => !bag.attachedTo && bag.x === zonePosition.x && bag.y === zonePosition.y),
    true
  );
});

test("level-01 allows dropping a carried bag onto a Curtis-zone tile that also contains a mower", () => {
  const game = core.createGameState(runtimeLevel01, { rng: () => 0 });
  const zonePosition = { x: 8, y: 12 };
  const mower = core.getMower(game);

  game.moveableItems.bags.push({
    id: "bag-drop-mower-test",
    itemType: "bag",
    x: game.player.x,
    y: game.player.y,
    attachedTo: "player"
  });
  game.player.attachedItemType = "bag";
  game.player.x = zonePosition.x;
  game.player.y = zonePosition.y;
  mower.x = zonePosition.x;
  mower.y = zonePosition.y;
  mower.attachedTo = null;

  assert.equal(core.isCurtisZoneAt(game.level, zonePosition.x, zonePosition.y), true);
  assert.equal(core.handleAction(game), true);
  assert.equal(game.player.attachedItemType, null);
  assert.equal(
    game.moveableItems.bags.some((bag) => !bag.attachedTo && bag.x === zonePosition.x && bag.y === zonePosition.y),
    true
  );
  assert.equal(core.getFreeMowerAt(game, zonePosition.x, zonePosition.y) !== null, true);
});

test("variable base dimensions are preserved when optional layers normalize to base size", () => {
  const game = core.createGameState({
    id: "variable-dimensions",
    name: "Variable Dimensions",
    base: [
      "gggg",
      "gRgg",
      "gggg"
    ],
    items: [
      "____",
      "____",
      "____"
    ],
    markers: [
      "p___",
      "__m_",
      "___c"
    ],
    zones: [
      "____",
      "____",
      "___C"
    ]
  });

  assert.equal(game.level.width, 4);
  assert.equal(game.level.height, 3);
  assert.deepEqual(game.level.zones.map((row) => row.join("")), ["____", "____", "___C"]);
});

test("legacy Curtis base tiles are converted to zones during load normalization", () => {
  const game = core.createGameState({
    id: "legacy-curtis",
    name: "Legacy Curtis",
    base: [
      "ggCg",
      "ggCg",
      "gggg"
    ],
    items: [
      "____",
      "____",
      "____"
    ],
    markers: [
      "p___",
      "__cm",
      "____"
    ]
  });

  assert.deepEqual(game.level.base.map((row) => row.join("")), ["gggg", "gggg", "gggg"]);
  assert.deepEqual(game.level.zones.map((row) => row.join("")), ["__C_", "__C_", "____"]);
});

test("multiple spawn markers of the same type are chosen randomly per spawn event", () => {
  const game = createGame({
    items: [
      "_____",
      "_____",
      "L____",
      "_____",
      "_____"
    ],
    markers: [
      "p___p",
      "_____",
      "_m_m_",
      "_c_c_",
      "o___o"
    ],
    zones: [
      "_____",
      "_____",
      "_____",
      "_C_C_",
      "_____"
    ]
  }, {
    rng: () => 0.99
  });

  assert.deepEqual({ x: game.player.x, y: game.player.y }, { x: 4, y: 0 });
  assert.deepEqual({ x: core.getMower(game).x, y: core.getMower(game).y }, { x: 3, y: 2 });
  assert.deepEqual({ x: game.curtis.x, y: game.curtis.y }, { x: 3, y: 3 });
  assert.deepEqual({ x: core.getPolice(game).spawnX, y: core.getPolice(game).spawnY }, { x: 4, y: 4 });
});

test("starting the mower on tall grass mows immediately and increases fullness", () => {
  const game = createGame({
    items: [
      "_____",
      "_____",
      "____L",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "_____",
      "__mp_",
      "___c_",
      "_____"
    ]
  });

  assert.equal(core.movePlayer(game, "left"), true);
  assert.equal(core.handleAction(game), true);
  assert.equal(game.player.attachedItemType, "mower");
  assert.equal(core.movePlayer(game, "right"), true);
  assert.equal(core.movePlayer(game, "right"), true);
  assert.equal(game.level.items[2][4], "_");
  assert.equal(core.getMower(game).fullness, 1);
});

test("full mower stays engaged, stops mowing additional tiles, and actions into a carried bag", () => {
  const game = createGame({
    items: [
      "_____",
      "_____",
      "___LL",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "_____",
      "p_m__",
      "___c_",
      "_____"
    ]
  });

  assert.equal(core.movePlayer(game, "right"), true);
  assert.equal(core.movePlayer(game, "right"), true);
  assert.equal(core.handleAction(game), true);

  const mower = core.getMower(game);
  mower.capacity = 1;
  mower.fullness = 0;
  game.level.items[2][3] = "L";
  game.level.items[2][4] = "L";

  core.movePlayer(game, "right");
  assert.equal(mower.fullness, 1);
  assert.equal(game.player.attachedItemType, "mower");
  assert.equal(game.level.items[2][3], "_");

  core.movePlayer(game, "right");
  assert.equal(mower.fullness, 1);
  assert.equal(game.player.attachedItemType, "mower");
  assert.equal(game.level.items[2][4], "L");

  assert.equal(core.handleAction(game), true);
  assert.equal(game.player.attachedItemType, "bag");
  assert.equal(mower.fullness, 0);
  assert.equal(mower.attachedTo, null);
  assert.equal(mower.x, game.player.x);
  assert.equal(mower.y, game.player.y);
  assert.equal(game.moveableItems.bags.some((bag) => bag.attachedTo === "player"), true);
});

test("attached mower cannot move onto a free bag tile", () => {
  const game = createGame({
    items: [
      "_____",
      "_____",
      "__A__",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "__p__",
      "_m___",
      "___c_",
      "_____"
    ]
  });

  assert.equal(core.movePlayer(game, "down"), true);
  assert.equal(core.movePlayer(game, "left"), true);
  assert.equal(core.handleAction(game), true);
  assert.equal(game.player.attachedItemType, "mower");
  assert.equal(core.movePlayer(game, "right"), false);
  assert.equal(game.player.x, 1);
  assert.equal(game.player.y, 2);
});

test("roadblock blocks player movement and Curtis line of sight", () => {
  const game = createGame({
    base: [
      "ggggg",
      "ggggg",
      "ggggg",
      "ggggg",
      "ggggg"
    ],
    zones: [
      "_____",
      "_CCC_",
      "_CCC_",
      "_CCC_",
      "_____"
    ],
    items: [
      "_____",
      "__K__",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "_p___",
      "__m__",
      "___c_",
      "_____"
    ]
  });

  assert.equal(core.movePlayer(game, "right"), false);
  assert.equal(game.player.x, 1);
  assert.equal(game.player.y, 1);

  game.level.items[1][2] = "_";
  game.level.items[2][2] = "K";
  game.player.x = 1;
  game.player.y = 1;
  game.curtis.x = 3;
  game.curtis.y = 3;
  assert.equal(core.canCurtisSeePlayer(game), false);
});

test("player on foot can enter a tile with a free bag", () => {
  const game = createGame({
    items: [
      "_____",
      "_____",
      "__A__",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "__p__",
      "_____",
      "___c_",
      "m____"
    ]
  });

  assert.equal(core.movePlayer(game, "down"), true);
  assert.equal(game.player.x, 2);
  assert.equal(game.player.y, 2);
  assert.equal(core.getFreeBagAt(game, 2, 2) !== null, true);
});

test("standing on a full free mower actions into a carried bag and resets the mower", () => {
  const game = createGame({
    items: [
      "_____",
      "_____",
      "_____",
      "L____",
      "_____",
    ],
    markers: [
      "_____",
      "__p__",
      "__m__",
      "___c_",
      "_____"
    ]
  });

  assert.equal(core.movePlayer(game, "down"), true);
  const mower = core.getMower(game);
  mower.fullness = mower.capacity;

  assert.equal(core.handleAction(game), true);
  assert.equal(game.player.attachedItemType, "bag");
  assert.equal(mower.fullness, 0);
  assert.equal(game.moveableItems.bags.length, 1);
  assert.equal(game.moveableItems.bags[0].attachedTo, "player");
  assert.deepEqual({ x: mower.x, y: mower.y }, { x: game.player.x, y: game.player.y });
});

test("bags can only be dropped on Curtis property", () => {
  const game = createGame({
    items: [
      "_____",
      "_____",
      "__A__",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "__p__",
      "_____",
      "___c_",
      "m____"
    ]
  });

  assert.equal(core.movePlayer(game, "down"), true);
  assert.equal(core.handleAction(game), true);
  assert.equal(game.player.attachedItemType, "bag");

  assert.equal(core.handleAction(game), false);
  assert.match(game.lastStatus.message, /only be dropped on Curtis property/);
  assert.equal(game.player.attachedItemType, "bag");

  assert.equal(core.movePlayer(game, "down"), true);
  assert.equal(core.movePlayer(game, "right"), true);
  assert.equal(core.handleAction(game), true);
  assert.equal(game.player.attachedItemType, null);
  assert.equal(game.moveableItems.bags[0].x, 3);
  assert.equal(game.moveableItems.bags[0].y, 3);
});

test("player cannot start the mower while carrying a bag", () => {
  const game = createGame({
    items: [
      "_____",
      "_____",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "__p__",
      "___m_",
      "___c_",
      "_____"
    ]
  });

  game.moveableItems.bags.push({
    id: "bag-carry-test",
    itemType: "bag",
    x: game.player.x,
    y: game.player.y,
    attachedTo: "player"
  });
  game.player.attachedItemType = "bag";
  game.player.x = 3;
  game.player.y = 2;
  assert.equal(core.getFreeMowerAt(game, 3, 2) !== null, true);
  assert.equal(core.handleAction(game), false);
  assert.equal(game.player.attachedItemType, "bag");
  assert.equal(core.getMower(game).attachedTo, null);
});

test("attached bag cannot move onto a tile with a free mower", () => {
  const game = createGame({
    items: [
      "_____",
      "_____",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "__p__",
      "___m_",
      "___c_",
      "_____"
    ]
  });

  game.moveableItems.bags.push({
    id: "bag-carry-move-test",
    itemType: "bag",
    x: game.player.x,
    y: game.player.y,
    attachedTo: "player"
  });
  game.player.attachedItemType = "bag";
  game.player.x = 2;
  game.player.y = 2;

  assert.equal(core.movePlayer(game, "right"), false);
  assert.equal(game.player.x, 2);
  assert.equal(game.player.y, 2);
});

test("win condition requires every free bag to end on Curtis property once mowing is complete", () => {
  const game = createGame({
    items: [
      "_____",
      "_____",
      "__A__",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "__p__",
      "_____",
      "___c_",
      "m____"
    ]
  });

  assert.equal(game.hasWon, false);
  assert.equal(core.movePlayer(game, "down"), true);
  assert.equal(core.handleAction(game), true);
  assert.equal(core.movePlayer(game, "down"), true);
  assert.equal(core.movePlayer(game, "right"), true);
  assert.equal(core.handleAction(game), true);

  assert.equal(game.hasWon, true);
  assert.match(game.lastStatus.message, /Level complete/);
});

test("Curtis can only occupy walkable Curtis-property tiles", () => {
  const game = createGame();

  assert.equal(core.canCurtisOccupy(game, 3, 3), true);
  assert.equal(core.canCurtisOccupy(game, 1, 3), false);
  assert.equal(core.canCurtisOccupy(game, 4, 3), false);
});

test("Curtis sees the player through any unobstructed angle on Curtis property", () => {
  const game = createGame({
    base: [
      "ggggg",
      "gSSSg",
      "gSSSg",
      "gSSSg",
      "ggggg"
    ],
    zones: [
      "_____",
      "_CCC_",
      "_CCC_",
      "_CCC_",
      "_____"
    ],
    items: [
      "_____",
      "_____",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "_p___",
      "__m__",
      "___c_",
      "_____"
    ]
  });

  game.player.y = 1;
  assert.equal(core.canCurtisSeePlayer(game), true);

  game.level.items[2][2] = "T";
  assert.equal(core.canCurtisSeePlayer(game), false);
});

test("Curtis sees the player off his property when the player is carrying a bag", () => {
  const game = createGame({
    base: [
      "ggggg",
      "ggggg",
      "ggggg",
      "ggggg",
      "ggggg"
    ],
    zones: [
      "_____",
      "_____",
      "_____",
      "__CC_",
      "_____"
    ],
    items: [
      "_____",
      "_____",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "_p___",
      "__m__",
      "___c_",
      "_____"
    ]
  });

  game.moveableItems.bags.push({
    id: "bag-los-test",
    itemType: "bag",
    x: game.player.x,
    y: game.player.y,
    attachedTo: "player"
  });
  game.player.attachedItemType = "bag";
  game.player.x = 1;
  game.player.y = 1;

  assert.equal(core.isCurtisZoneAt(game.level, game.player.x, game.player.y), false);
  assert.equal(core.canCurtisSeePlayer(game), true);

  game.level.items[2][2] = "T";
  assert.equal(core.canCurtisSeePlayer(game), false);
});

test("Curtis ignores the player off his property when the player is not carrying a bag", () => {
  const game = createGame({
    base: [
      "ggggg",
      "ggggg",
      "ggggg",
      "ggggg",
      "ggggg"
    ],
    zones: [
      "_____",
      "_____",
      "_____",
      "__CC_",
      "_____"
    ],
    items: [
      "_____",
      "_____",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "_p___",
      "__m__",
      "___c_",
      "_____"
    ]
  });

  game.player.x = 1;
  game.player.y = 1;

  assert.equal(core.isCurtisZoneAt(game.level, game.player.x, game.player.y), false);
  assert.equal(core.canCurtisSeePlayer(game), false);
});

test("Curtis detection uses timed suspicion buildup and decay, and faces the player", () => {
  const game = createGame({
    base: [
      "ggggg",
      "gSSSg",
      "gSSSg",
      "gSSSg",
      "ggggg"
    ],
    zones: [
      "_____",
      "_CCC_",
      "_CCC_",
      "_CCC_",
      "_____"
    ],
    items: [
      "_____",
      "_____",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "_p___",
      "__m__",
      "___c_",
      "_____"
    ]
  }, {
    config: {
      simulationTickMs: 200,
      curtisNoticeDurationMs: 400,
      curtisAlertDurationMs: 400,
      curtisSuspicionDecayDurationMs: 800
    }
  });

  game.curtis.facing = "down";
  game.player.y = 1;

  assert.equal(core.evaluateCurtisDetection(game), "spot");
  assert.equal(core.getCurtisStateLabel(game), "spot / left");
  assert.equal(game.curtis.suspicionMs, 200);
  assert.equal(core.evaluateCurtisDetection(game), "alert");
  assert.equal(game.curtis.suspicionMs, 400);
  assert.equal(core.evaluateCurtisDetection(game), "alert");
  assert.equal(game.curtis.suspicionMs, 600);

  game.level.items[2][2] = "T";
  assert.equal(core.evaluateCurtisDetection(game), "alert");
  assert.equal(game.curtis.suspicionMs, 400);
  assert.equal(core.evaluateCurtisDetection(game), "spot");
  assert.equal(game.curtis.suspicionMs, 200);
  assert.equal(core.evaluateCurtisDetection(game), "idle");
  assert.equal(game.curtis.suspicionMs, 0);

  game.level.items[2][2] = "_";
  assert.equal(core.evaluateCurtisDetection(game), "spot");
  assert.equal(core.evaluateCurtisDetection(game), "alert");
  assert.equal(core.evaluateCurtisDetection(game), "alert");
  assert.equal(core.evaluateCurtisDetection(game), "police");
  assert.match(game.lastStatus.message, /police/);
});

test("Curtis patrol walks to yard points and pauses to look around", () => {
  const game = createGame({
    base: [
      "ggggg",
      "ggSSg",
      "ggSSg",
      "ggSSg",
      "ggggg"
    ],
    zones: [
      "_____",
      "_____",
      "__CC_",
      "__CC_",
      "_____"
    ],
    items: [
      "_____",
      "_____",
      "_F___",
      "_____",
      "_____"
    ],
    markers: [
      "p____",
      "_____",
      "__mc_",
      "_____",
      "_____"
    ]
  }, {
    rng: () => 0,
    config: {
      simulationTickMs: 400,
      curtisPauseAtPointMinMs: 800,
      curtisPauseAtPointMaxMs: 800
    }
  });

  assert.equal(game.curtis.x, 3);
  assert.equal(game.curtis.y, 2);
  assert.equal(game.curtis.mode, "patrol");

  assert.equal(core.stepCurtis(game), true);
  assert.deepEqual(
    { x: game.curtis.x, y: game.curtis.y, facing: game.curtis.facing, mode: game.curtis.mode, pauseTimerMs: game.curtis.pauseTimerMs },
    { x: 2, y: 2, facing: "left", mode: "pausing", pauseTimerMs: 800 }
  );

  assert.equal(core.stepCurtis(game), false);
  assert.deepEqual(
    { x: game.curtis.x, y: game.curtis.y, facing: game.curtis.facing, pauseTimerMs: game.curtis.pauseTimerMs },
    { x: 2, y: 2, facing: "left", pauseTimerMs: 400 }
  );

  assert.equal(core.stepCurtis(game), true);
  assert.deepEqual(
    { x: game.curtis.x, y: game.curtis.y, facing: game.curtis.facing, mode: game.curtis.mode, pauseTimerMs: game.curtis.pauseTimerMs },
    { x: 2, y: 3, facing: "down", mode: "pausing", pauseTimerMs: 800 }
  );
});

test("Curtis transitions indoors and outdoors using configurable timers", () => {
  const game = createGame({
    zones: [
      "_____",
      "_____",
      "__CC_",
      "__CC_",
      "_____"
    ],
    items: [
      "_____",
      "_____",
      "L____",
      "_____",
      "_____"
    ],
    markers: [
      "p____",
      "_____",
      "__mc_",
      "_____",
      "_____"
    ]
  }, {
    rng: () => 0,
    config: {
      simulationTickMs: 1000,
      curtisOutsideDurationMinMs: 1000,
      curtisOutsideDurationMaxMs: 1000,
      curtisInsideDurationMinMs: 1000,
      curtisInsideDurationMaxMs: 1000
    }
  });

  assert.equal(game.curtis.outdoors, true);
  assert.equal(game.curtis.presenceTimerMs, 1000);

  game.curtis.x = 2;
  game.curtis.y = 3;

  assert.equal(core.advanceSimulationTick(game), true);
  assert.equal(game.curtis.outdoors, true);
  assert.equal(game.curtis.wantsToGoInside, true);
  assert.equal(game.curtis.mode, "returning_home");
  assert.equal(game.curtis.x, 3);
  assert.equal(game.curtis.y, 3);

  assert.equal(core.advanceSimulationTick(game), true);
  assert.equal(game.curtis.outdoors, true);
  assert.equal(game.curtis.x, game.curtis.homeX);
  assert.equal(game.curtis.y, game.curtis.homeY);
  assert.equal(game.curtis.mode, "returning_home");

  assert.equal(core.advanceSimulationTick(game), true);
  assert.equal(game.curtis.outdoors, false);
  assert.equal(game.curtis.x, game.curtis.homeX);
  assert.equal(game.curtis.y, game.curtis.homeY);
  assert.equal(game.curtis.presenceTimerMs, 1000);
  assert.equal(game.curtis.detectionStage, "idle");
  assert.equal(game.curtis.suspicionMs, 0);

  assert.equal(core.advanceSimulationTick(game), true);
  assert.equal(game.curtis.outdoors, true);
  assert.equal(game.curtis.x, game.curtis.homeX);
  assert.equal(game.curtis.y, game.curtis.homeY);
  assert.equal(game.curtis.presenceTimerMs, 1000);
});

test("Curtis does not detect the player while indoors", () => {
  const game = createGame({
    base: [
      "ggggg",
      "gggSg",
      "gggSg",
      "gggSg",
      "gggSg"
    ],
    zones: [
      "_____",
      "___C_",
      "___C_",
      "___C_",
      "___C_"
    ],
    items: [
      "_____",
      "_____",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "_p___",
      "__m__",
      "___c_",
      "_____"
    ]
  });

  game.player.x = 3;
  game.player.y = 1;
  game.curtis.outdoors = false;
  game.curtis.presenceTimerMs = 5000;

  assert.equal(core.canCurtisSeePlayer(game), false);
  assert.equal(core.evaluateCurtisDetection(game), "idle");
  assert.equal(game.curtis.suspicionMs, 0);
});

test("player movement does not advance Curtis without a simulation tick", () => {
  const game = createGame({
    zones: [
      "_____",
      "_____",
      "__CC_",
      "__CC_",
      "_____"
    ],
    items: [
      "_____",
      "_____",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "p____",
      "_____",
      "__mc_",
      "_____",
      "_____"
    ]
  });

  assert.equal(core.movePlayer(game, "right"), true);
  assert.deepEqual(
    { x: game.curtis.x, y: game.curtis.y, facing: game.curtis.facing },
    { x: 3, y: 2, facing: "left" }
  );
});

test("simulation ticks advance Curtis independently of player input", () => {
  const game = createGame({
    base: [
      "ggggg",
      "ggSSg",
      "ggSSg",
      "ggSSg",
      "ggggg"
    ],
    zones: [
      "_____",
      "_____",
      "__CC_",
      "__CC_",
      "_____"
    ],
    items: [
      "_____",
      "_____",
      "_F___",
      "_____",
      "_____"
    ],
    markers: [
      "p____",
      "_____",
      "__mc_",
      "_____",
      "_____"
    ]
  }, {
    rng: () => 0
  });

  assert.equal(core.advanceSimulationTick(game), true);
  assert.deepEqual(
    { x: game.curtis.x, y: game.curtis.y, facing: game.curtis.facing },
    { x: 2, y: 2, facing: "left" }
  );
  assert.ok(["walking", "pausing"].includes(game.curtis.mode));
});

test("Curtis stops moving while suspicious", () => {
  const game = createGame({
    base: [
      "ggggg",
      "gSSSg",
      "gSSSg",
      "gSSSg",
      "ggggg"
    ],
    zones: [
      "_____",
      "_CCC_",
      "_CCC_",
      "_CCC_",
      "_____"
    ],
    items: [
      "_____",
      "_____",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "_p___",
      "__m__",
      "___c_",
      "_____"
    ]
  }, {
    config: {
      simulationTickMs: 200,
      curtisNoticeDurationMs: 400,
      curtisAlertDurationMs: 400,
      curtisSuspicionDecayDurationMs: 800
    }
  });

  game.player.y = 1;

  assert.equal(core.evaluateCurtisDetection(game), "spot");
  const positionBeforeTick = { x: game.curtis.x, y: game.curtis.y, facing: game.curtis.facing };
  assert.equal(core.advanceSimulationTick(game), true);
  assert.deepEqual(
    { x: game.curtis.x, y: game.curtis.y, facing: game.curtis.facing },
    positionBeforeTick
  );
  assert.equal(game.curtis.detectionStage, "alert");
});

test("police spawn after Curtis reaches police state and begin pursuit", () => {
  const game = createGame({
    base: [
      "ggggg",
      "gggSg",
      "gggSg",
      "gggSg",
      "gggSg"
    ],
    zones: [
      "_____",
      "___C_",
      "___C_",
      "___C_",
      "___C_"
    ],
    items: [
      "_____",
      "_____",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "____o",
      "_p___",
      "__m__",
      "___c_",
      "_____"
    ]
  }, {
    config: {
      simulationTickMs: 200,
      curtisNoticeDurationMs: 400,
      curtisAlertDurationMs: 400,
      curtisSuspicionDecayDurationMs: 800
    }
  });

  game.player.x = 3;
  game.player.y = 1;

  assert.equal(core.evaluateCurtisDetection(game), "spot");
  assert.equal(core.evaluateCurtisDetection(game), "alert");
  assert.equal(core.evaluateCurtisDetection(game), "alert");
  assert.equal(core.evaluateCurtisDetection(game), "police");
  assert.equal(game.loseState, "calling_police");

  assert.equal(core.stepPolice(game), true);
  assert.equal(game.loseState, "police_arriving");
  assert.equal(core.getPolice(game).active, true);
  assert.deepEqual(
    { x: core.getPolice(game).x, y: core.getPolice(game).y },
    { x: 4, y: 0 }
  );

  assert.equal(core.stepPolice(game), true);
  assert.deepEqual(
    { x: core.getPolice(game).x, y: core.getPolice(game).y, facing: core.getPolice(game).facing },
    { x: 3, y: 0, facing: "left" }
  );
});

test("police capture sets the captured lose state on contact", () => {
  const game = createGame({
    items: [
      "_____",
      "_____",
      "_____",
      "_____",
      "_____"
    ],
    markers: [
      "_____",
      "_p___",
      "__m__",
      "___c_",
      "__o__"
    ]
  });

  game.loseState = "calling_police";
  assert.equal(core.stepPolice(game), true);
  assert.equal(game.loseState, "police_arriving");

  game.player.x = 2;
  game.player.y = 3;
  core.getPolice(game).x = 2;
  core.getPolice(game).y = 4;
  core.getPolice(game).active = true;

  assert.equal(core.stepPolice(game), true);
  assert.equal(game.loseState, "captured");
  assert.match(game.lastStatus.message, /Busted/);
  assert.equal(core.movePlayer(game, "left"), false);
});
