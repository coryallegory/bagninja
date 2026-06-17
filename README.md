# bagninja
Get rid of as many lawn bags as you can without being noticed

Bag Ninja currently runs as a plain HTML/CSS/JavaScript browser prototype with a shared gameplay core, a standalone playable page, and separate authoring tools.

## Current Local Pages

- [play/index.html](/abs/path/c:/dev/bagninja/play/index.html:1) is the playable vertical-slice page
- [tools/level-editor.html](/abs/path/c:/dev/bagninja/tools/level-editor.html:1) is the standalone level editor
- [tools/asset-viewer.html](/abs/path/c:/dev/bagninja/tools/asset-viewer.html:1) previews the current asset contract and detected frames

## Default Content

- The playable game loads [play/levels/level-01.json](/abs/path/c:/dev/bagninja/play/levels/level-01.json:1) as its current runtime level.
- The level editor loads [tools/level-default.json](/abs/path/c:/dev/bagninja/tools/level-default.json:1) as its design-time default.

## Current Runtime Model

- The game is real-time rather than turn-based.
- The browser runtime advances simulation on a fixed `400ms` tick.
- Player movement and action input do not advance Curtis or police directly.
- Held keyboard and joystick movement repeat on the same `400ms` cadence as Curtis.
- Quick keyboard taps can still move the player faster than the held-repeat cadence.
- Curtis patrol, suspicion-based detection, and police pursuit all run through the shared core in [play/game-core.js](/abs/path/c:/dev/bagninja/play/game-core.js:1).
- The playable page now renders from `assets/` with code-drawn fallback visuals if a requested image is missing.
- On mobile widths, touch controls are overlaid inside the play area as faint thumb anchors: a left joystick and a right action circle.
- Carrying a bag swaps the player to the `player-carry-*` sprite set.
- Winning now triggers a 2-second celebration, then a sliding win overlay that reports completion time and Curtis alert seconds.

## Tests

- Run `npm test` to execute the current gameplay rule tests with Node's built-in test runner.
- The shared rules module lives in [play/game-core.js](/abs/path/c:/dev/bagninja/play/game-core.js:1) so browser behavior and tests use the same core logic.
