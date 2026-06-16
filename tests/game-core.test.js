const test = require("node:test");
const assert = require("node:assert/strict");

const core = require("../play/game-core.js");

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
      "_____",
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

test("emptying a full mower creates one free bag on the nearest valid tile", () => {
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
  assert.equal(game.player.attachedItemType, null);
  assert.equal(mower.fullness, 0);
  assert.equal(game.moveableItems.bags.length, 1);
  assert.deepEqual(
    { x: game.moveableItems.bags[0].x, y: game.moveableItems.bags[0].y },
    { x: 2, y: 1 }
  );
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

test("Curtis sees the player only with orthogonal LOS on Curtis property", () => {
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

  assert.equal(core.canCurtisSeePlayer(game), false);

  game.player.x = 3;
  game.player.y = 1;
  assert.equal(core.canCurtisSeePlayer(game), true);

  game.level.items[2][3] = "T";
  assert.equal(core.canCurtisSeePlayer(game), false);
});

test("Curtis detection escalates from spot to alert to police and resets when LOS breaks", () => {
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

  assert.equal(core.evaluateCurtisDetection(game), "spot");
  assert.equal(core.getCurtisStateLabel(game), "spot / left");
  assert.equal(core.evaluateCurtisDetection(game), "alert");
  assert.equal(core.evaluateCurtisDetection(game), "police");
  assert.match(game.lastStatus.message, /police/);

  game.level.items[2][3] = "T";
  assert.equal(core.evaluateCurtisDetection(game), "idle");
  assert.equal(game.curtis.visibleTicks, 0);
});

test("Curtis patrol stays inside Curtis territory and updates facing deterministically", () => {
  const game = createGame({
    zones: [
      "_____",
      "_____",
      "__CC_",
      "__CC_",
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

  assert.equal(game.curtis.x, 3);
  assert.equal(game.curtis.y, 2);
  assert.equal(game.curtis.facing, "left");

  assert.equal(core.stepCurtis(game), true);
  assert.deepEqual(
    { x: game.curtis.x, y: game.curtis.y, facing: game.curtis.facing },
    { x: 2, y: 2, facing: "left" }
  );

  assert.equal(core.stepCurtis(game), true);
  assert.deepEqual(
    { x: game.curtis.x, y: game.curtis.y, facing: game.curtis.facing },
    { x: 3, y: 2, facing: "right" }
  );
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

  assert.equal(core.advanceSimulationTick(game), true);
  assert.deepEqual(
    { x: game.curtis.x, y: game.curtis.y, facing: game.curtis.facing },
    { x: 2, y: 2, facing: "left" }
  );
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
  });

  game.player.x = 3;
  game.player.y = 1;

  assert.equal(core.evaluateCurtisDetection(game), "spot");
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
