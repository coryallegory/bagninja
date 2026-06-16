# Bag Ninja Tools

## Level Editor

Open [level-editor.html](/abs/path/c:/dev/bagninja/tools/level-editor.html:1) in a browser to use the first standalone level editor.

Current behavior:

- four authored layers: `base`, `items`, `markers`, and `zones`
- new levels default to `13x24`, but imported/exported levels may use other rectangular dimensions
- single-cell authoring for each layer
- static authored items currently exclude runtime moveable items such as mower and bag
- marker-based spawn authoring for Curtis, player, mower, and police
- when multiple markers of the same type exist, the playable runtime chooses randomly among them at spawn time
- zone-based Curtis territory authoring independent of the visual base layer
- Curtis territory currently displays in the editor as a red cell border rather than a full-cell tint
- display toggle between symbolic placeholders and asset previews
- `Load Default Level` reads from [level-default.json](/abs/path/c:/dev/bagninja/tools/level-default.json:1)
- when opened as `file://`, browsers block automatic JSON fetches, so `Load Default Level` falls back to a local file picker
- `Tall Grass` over `Mowed Grass` represents unmowed lawn
- JSON import and download export using the current schema

The editor default level is intentionally separate from the playable runtime level. The game currently loads [play/levels/level-01.json](/abs/path/c:/dev/bagninja/play/levels/level-01.json:1), while the editor keeps using [tools/level-default.json](/abs/path/c:/dev/bagninja/tools/level-default.json:1) as its working default.

## Asset Viewer

Open [asset-viewer.html](/abs/path/c:/dev/bagninja/tools/asset-viewer.html:1) to preview the current asset contract and any detected animation frames.

This tool is intentionally independent of the game engine scaffold.
