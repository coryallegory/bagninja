(function () {
  const DEFAULT_GRID_WIDTH = 13;
  const DEFAULT_GRID_HEIGHT = 24;
  const DEFAULT_LEVEL_URL = "./level-default.json";
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
    }
  };

  const BASE_SYMBOLS = ["g", "R", "S"];
  const ITEM_SYMBOLS = ["_", "H", "F", "B", "T", "L"];
  const MARKER_SYMBOLS = ["_", "c", "p", "m", "o"];
  const ZONE_SYMBOLS = ["_", "C"];

  const TOOLS = {
    base: [
      { id: "g", label: "Mowed Grass", swatch: "grass-mown" },
      { id: "R", label: "Road", swatch: "road" },
      { id: "S", label: "Pavement", swatch: "pavement" }
    ],
    items: [
      { id: "H", label: "House", swatch: "house" },
      { id: "F", label: "Fence", swatch: "fence" },
      { id: "B", label: "Bush", swatch: "bush" },
      { id: "T", label: "Tree", swatch: "tree" },
      { id: "L", label: "Tall Grass", swatch: "tall-grass" },
      { id: "_", label: "Erase Item", swatch: "erase" }
    ],
    markers: [
      { id: "c", label: "Curtis Spawn", swatch: "marker-curtis" },
      { id: "p", label: "Player Spawn", swatch: "marker-player" },
      { id: "m", label: "Mower Spawn", swatch: "marker-mower" },
      { id: "o", label: "Police Spawn", swatch: "marker-police" },
      { id: "_", label: "Erase Marker", swatch: "erase" }
    ],
    zones: [
      { id: "C", label: "Curtis Territory", swatch: "zone-curtis" },
      { id: "_", label: "Erase Zone", swatch: "erase" }
    ]
  };

  const LAYER_HELP = {
    base: "Every cell needs one base tile: mowed grass, road, or pavement.",
    items: "One optional placed object per cell: house, fence, bush, tree, or tall grass.",
    markers: "One optional spawn marker per cell: Curtis, player, mower, or police.",
    zones: "Optional gameplay territory markup. Curtis can walk, detect, and receive dropped bags anywhere marked as Curtis territory."
  };

  const state = {
    activeLayer: "base",
    activeTool: "g",
    displayMode: "symbols",
    isPointerDown: false,
    level: createEmptyLevel()
  };

  const gridEl = document.getElementById("grid");
  const paletteEl = document.getElementById("tool-palette");
  const validationListEl = document.getElementById("validation-list");
  const jsonOutputEl = document.getElementById("json-output");
  const levelIdEl = document.getElementById("level-id");
  const levelNameEl = document.getElementById("level-name");
  const gridWidthEl = document.getElementById("grid-width");
  const gridHeightEl = document.getElementById("grid-height");
  const gridDimensionsEl = document.getElementById("grid-dimensions");
  const activeToolLabelEl = document.getElementById("active-tool-label");
  const mowableCountEl = document.getElementById("mowable-count");
  const layerHelpEl = document.getElementById("layer-help");
  const loadStatusEl = document.getElementById("load-status");
  const defaultFileInputEl = document.getElementById("default-file-input");

  document.querySelectorAll(".layer-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeLayer = button.dataset.layer;
      state.activeTool = TOOLS[state.activeLayer][0].id;
      document.querySelectorAll(".layer-button").forEach((node) => {
        node.classList.toggle("is-active", node === button);
      });
      render();
    });
  });

  document.getElementById("display-symbols").addEventListener("click", () => {
    state.displayMode = "symbols";
    updateDisplayButtons();
    render();
  });

  document.getElementById("display-images").addEventListener("click", () => {
    state.displayMode = "images";
    updateDisplayButtons();
    render();
  });

  document.getElementById("load-default").addEventListener("click", () => {
    loadDefaultLevel(true);
  });

  document.getElementById("import-text").addEventListener("click", () => {
    importLevel(jsonOutputEl.value);
  });

  document.getElementById("copy-json").addEventListener("click", async () => {
    syncInputsIntoState();
    await navigator.clipboard.writeText(JSON.stringify(exportLevel(state.level), null, 2));
  });

  document.getElementById("download-json").addEventListener("click", () => {
    syncInputsIntoState();
    const exported = JSON.stringify(exportLevel(state.level), null, 2);
    const blob = new Blob([exported], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.level.id || "level"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("file-input").addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) {
      return;
    }
    importLevel(await file.text(), file.name);
    event.target.value = "";
  });

  defaultFileInputEl.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) {
      return;
    }
    importLevel(await file.text(), file.name);
    setLoadStatus(`Loaded default level from ${file.name}.`, "ok");
    event.target.value = "";
  });

  levelIdEl.addEventListener("input", () => {
    state.level.id = levelIdEl.value;
    updateJson();
  });

  levelNameEl.addEventListener("input", () => {
    state.level.name = levelNameEl.value;
    updateJson();
  });

  document.getElementById("resize-grid").addEventListener("click", () => {
    resizeGridFromInputs();
  });

  document.addEventListener("mouseup", () => {
    state.isPointerDown = false;
  });

  function createEmptyLevel() {
    return createEditorState({
      id: "",
      name: "",
      base: Array.from({ length: DEFAULT_GRID_HEIGHT }, () => "g".repeat(DEFAULT_GRID_WIDTH)),
      items: Array.from({ length: DEFAULT_GRID_HEIGHT }, () => "_".repeat(DEFAULT_GRID_WIDTH)),
      markers: Array.from({ length: DEFAULT_GRID_HEIGHT }, () => "_".repeat(DEFAULT_GRID_WIDTH)),
      zones: Array.from({ length: DEFAULT_GRID_HEIGHT }, () => "_".repeat(DEFAULT_GRID_WIDTH))
    });
  }

  function createEditorState(level) {
    const normalized = normalizeLegacyLevel(level);
    const dimensions = getLevelDimensions(normalized);
    return {
      id: normalized.id || "",
      name: normalized.name || "",
      width: dimensions.width,
      height: dimensions.height,
      base: normalizeLayer(normalized.base, dimensions.height, dimensions.width, "g"),
      items: normalizeLayer(normalized.items, dimensions.height, dimensions.width, "_"),
      markers: normalizeLayer(normalized.markers, dimensions.height, dimensions.width, "_"),
      zones: normalizeLayer(normalized.zones, dimensions.height, dimensions.width, "_")
    };
  }

  function getLevelDimensions(level) {
    const baseRows = Array.isArray(level?.base) ? level.base : [];
    const height = Math.max(1, baseRows.length || DEFAULT_GRID_HEIGHT);
    const width = Math.max(
      1,
      baseRows.reduce((max, row) => Math.max(max, row.length), 0) || DEFAULT_GRID_WIDTH
    );
    return { width, height };
  }

  function normalizeLegacyLevel(level) {
    if (Array.isArray(level?.zones)) {
      return level;
    }

    const base = (level?.base || []).map((row) => [...row].map((symbol) => (symbol === "C" ? "g" : symbol)).join(""));
    const zones = (level?.base || []).map((row) => [...row].map((symbol) => (symbol === "C" ? "C" : "_")).join(""));

    return {
      ...level,
      base,
      zones
    };
  }

  function normalizeLayer(rows, height, width, fillSymbol) {
    const normalized = [];
    for (let y = 0; y < height; y += 1) {
      const row = rows?.[y] || fillSymbol.repeat(width);
      normalized.push(row.padEnd(width, fillSymbol).slice(0, width).split(""));
    }
    return normalized;
  }

  function exportLevel(level) {
    return {
      id: level.id,
      name: level.name,
      base: level.base.map((row) => row.join("")),
      items: level.items.map((row) => row.join("")),
      markers: level.markers.map((row) => row.join("")),
      zones: level.zones.map((row) => row.join(""))
    };
  }

  function importLevel(text, sourceLabel) {
    try {
      const parsed = JSON.parse(text);
      state.level = createEditorState(parsed);
      render();
      if (sourceLabel) {
        setLoadStatus(`Loaded level from ${sourceLabel}.`, "ok");
      }
    } catch (error) {
      window.alert(`Invalid JSON: ${error.message}`);
    }
  }

  function resizeGrid(level, width, height) {
    return {
      ...level,
      width,
      height,
      base: normalizeLayer(level.base.map((row) => row.join("")), height, width, "g"),
      items: normalizeLayer(level.items.map((row) => row.join("")), height, width, "_"),
      markers: normalizeLayer(level.markers.map((row) => row.join("")), height, width, "_"),
      zones: normalizeLayer(level.zones.map((row) => row.join("")), height, width, "_")
    };
  }

  function resizeGridFromInputs() {
    const width = Math.max(1, Number(gridWidthEl.value) || state.level.width || DEFAULT_GRID_WIDTH);
    const height = Math.max(1, Number(gridHeightEl.value) || state.level.height || DEFAULT_GRID_HEIGHT);
    state.level = resizeGrid(state.level, width, height);
    render();
  }

  async function loadDefaultLevel(showAlertOnFailure) {
    if (window.location.protocol === "file:") {
      setLoadStatus("Direct file mode cannot auto-load level-default.json. Click again and choose tools/level-default.json from the file picker.", "error");
      if (showAlertOnFailure) {
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
      state.level = createEditorState(parsed);
      setLoadStatus(`Loaded default level from ${DEFAULT_LEVEL_URL}.`, "ok");
      render();
    } catch (error) {
      setLoadStatus(`Unable to load default level from ${DEFAULT_LEVEL_URL}: ${error.message}`, "error");
      if (showAlertOnFailure) {
        window.alert(`Unable to load default level from ${DEFAULT_LEVEL_URL}: ${error.message}`);
      }
    }
  }

  function setLoadStatus(message, tone) {
    loadStatusEl.textContent = message || "";
    loadStatusEl.classList.toggle("is-error", tone === "error");
    loadStatusEl.classList.toggle("is-ok", tone === "ok");
  }

  function syncInputsIntoState() {
    state.level.id = levelIdEl.value;
    state.level.name = levelNameEl.value;
  }

  function updateDisplayButtons() {
    document.getElementById("display-symbols").classList.toggle("is-active", state.displayMode === "symbols");
    document.getElementById("display-images").classList.toggle("is-active", state.displayMode === "images");
  }

  function renderPalette() {
    paletteEl.innerHTML = "";
    TOOLS[state.activeLayer].forEach((tool) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "palette-button";
      button.innerHTML = `<span class="swatch ${tool.swatch}"></span><span>${tool.label}</span>`;
      button.classList.toggle("is-active", tool.id === state.activeTool);
      button.addEventListener("click", () => {
        state.activeTool = tool.id;
        render();
      });
      paletteEl.appendChild(button);
    });
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    gridEl.classList.toggle("render-symbols", state.displayMode === "symbols");
    gridEl.classList.toggle("render-images", state.displayMode === "images");
    gridEl.style.gridTemplateColumns = `repeat(${state.level.width}, 30px)`;
    gridEl.style.gridTemplateRows = `repeat(${state.level.height}, 30px)`;

    for (let y = 0; y < state.level.height; y += 1) {
      for (let x = 0; x < state.level.width; x += 1) {
        const cell = document.createElement("button");
        const baseSymbol = state.level.base[y][x];
        const itemSymbol = state.level.items[y][x];
        const markerSymbol = state.level.markers[y][x];
        const zoneSymbol = state.level.zones[y][x];
        cell.type = "button";
        cell.className = [
          "cell",
          baseClass(baseSymbol),
          itemClass(itemSymbol),
          markerClass(markerSymbol),
          zoneClass(zoneSymbol)
        ].filter(Boolean).join(" ");
        cell.style.setProperty("--base-image", assetUrl(ASSET_PATHS.base[baseSymbol]));
        cell.style.setProperty("--item-image", assetUrl(ASSET_PATHS.items[itemSymbol]));
        cell.style.setProperty("--marker-image", assetUrl(ASSET_PATHS.markers[markerSymbol]));

        cell.addEventListener("mousedown", (event) => {
          event.preventDefault();
          state.isPointerDown = true;
          paintCell(x, y);
        });

        cell.addEventListener("mouseenter", () => {
          if (state.isPointerDown) {
            paintCell(x, y);
          }
        });

        gridEl.appendChild(cell);
      }
    }
  }

  function assetUrl(path) {
    return path ? `url("${path}")` : "none";
  }

  function paintCell(x, y) {
    if (state.activeLayer === "base") {
      state.level.base[y][x] = state.activeTool;
    } else if (state.activeLayer === "items") {
      state.level.items[y][x] = state.activeTool;
      if (state.activeTool !== "_") {
        state.level.markers[y][x] = "_";
      }
    } else if (state.activeLayer === "markers") {
      state.level.markers[y][x] = state.activeTool;
      if (state.activeTool !== "_") {
        state.level.items[y][x] = "_";
      }
    } else if (state.activeLayer === "zones") {
      state.level.zones[y][x] = state.activeTool;
    }
    render();
  }

  function baseClass(symbol) {
    switch (symbol) {
      case "g":
        return "base-grass-mown";
      case "R":
        return "base-road";
      case "S":
        return "base-pavement";
      default:
        return "base-grass-mown";
    }
  }

  function itemClass(symbol) {
    switch (symbol) {
      case "H":
        return "item-house";
      case "F":
        return "item-fence";
      case "B":
        return "item-bush";
      case "T":
        return "item-tree";
      case "L":
        return "item-tall-grass";
      default:
        return "";
    }
  }

  function markerClass(symbol) {
    switch (symbol) {
      case "c":
        return "marker-curtis";
      case "p":
        return "marker-player";
      case "m":
        return "marker-mower";
      case "o":
        return "marker-police";
      default:
        return "";
    }
  }

  function zoneClass(symbol) {
    switch (symbol) {
      case "C":
        return "zone-curtis";
      default:
        return "";
    }
  }

  function runValidation(level) {
    const issues = [];
    const baseRows = level.base.map((row) => row.join(""));
    const itemRows = level.items.map((row) => row.join(""));
    const markerRows = level.markers.map((row) => row.join(""));
    const zoneRows = level.zones.map((row) => row.join(""));

    validateLayerRows(baseRows, "Base", BASE_SYMBOLS, issues, level.width, level.height);
    validateLayerRows(itemRows, "Items", ITEM_SYMBOLS, issues, level.width, level.height);
    validateLayerRows(markerRows, "Markers", MARKER_SYMBOLS, issues, level.width, level.height);
    validateLayerRows(zoneRows, "Zones", ZONE_SYMBOLS, issues, level.width, level.height);

    let playerMarkers = 0;
    let mowerMarkers = 0;
    let curtisMarkers = 0;

    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const item = level.items[y][x];
        const marker = level.markers[y][x];

        if (item !== "_" && marker !== "_") {
          issues.push({ type: "error", message: `Cell ${x},${y} cannot contain both an item and a marker.` });
        }

        if (marker === "p") {
          playerMarkers += 1;
        } else if (marker === "m") {
          mowerMarkers += 1;
        } else if (marker === "c") {
          curtisMarkers += 1;
        }

        if (marker !== "_" && !isMarkerWalkable(level, x, y)) {
          issues.push({ type: "error", message: `Marker at ${x},${y} must be on a walkable cell with no item.` });
        }

        if (marker === "c" && level.zones[y][x] !== "C") {
          issues.push({ type: "error", message: `Curtis spawn at ${x},${y} must be inside Curtis territory.` });
        }
      }
    }

    if (playerMarkers === 0) {
      issues.push({ type: "error", message: "At least one player spawn marker is required." });
    }
    if (mowerMarkers === 0) {
      issues.push({ type: "error", message: "At least one mower spawn marker is required." });
    }
    if (curtisMarkers === 0) {
      issues.push({ type: "error", message: "At least one Curtis spawn marker is required." });
    }

    if (!issues.length) {
      issues.push({ type: "ok", message: "No structural validation errors detected." });
    }

    return issues;
  }

  function validateLayerRows(rows, name, allowedSymbols, issues, width, height) {
    if (rows.length !== height) {
      issues.push({ type: "error", message: `${name} layer height must match base layer height.` });
    }

    rows.forEach((row, index) => {
      if (row.length !== width) {
        issues.push({ type: "error", message: `${name} row ${index + 1} must match the base layer width of ${width}.` });
      }
      [...row].forEach((symbol) => {
        if (!allowedSymbols.includes(symbol)) {
          issues.push({ type: "error", message: `Invalid ${name.toLowerCase()} symbol "${symbol}" detected.` });
        }
      });
    });
  }

  function isMarkerWalkable(level, x, y) {
      return level.items[y][x] === "_" && ["g", "R", "S"].includes(level.base[y][x]);
  }

  function updateValidation() {
    validationListEl.innerHTML = "";
    runValidation(state.level).forEach((issue) => {
      const item = document.createElement("li");
      item.className = issue.type;
      item.textContent = issue.message;
      validationListEl.appendChild(item);
    });
  }

  function countMowableCells(level) {
    let count = 0;
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        if (level.base[y][x] === "g" && level.items[y][x] === "L") {
          count += 1;
        }
      }
    }
    return count;
  }

  function updateJson() {
    syncInputsIntoState();
    jsonOutputEl.value = JSON.stringify(exportLevel(state.level), null, 2);
    mowableCountEl.textContent = String(countMowableCells(state.level));
  }

  function render() {
    levelIdEl.value = state.level.id;
    levelNameEl.value = state.level.name;
    gridWidthEl.value = String(state.level.width);
    gridHeightEl.value = String(state.level.height);
    gridDimensionsEl.textContent = `${state.level.width} x ${state.level.height}`;
    activeToolLabelEl.textContent = `Active: ${state.activeLayer} / ${state.activeTool} / ${state.displayMode}`;
    layerHelpEl.textContent = LAYER_HELP[state.activeLayer];
    updateDisplayButtons();
    renderPalette();
    renderGrid();
    updateJson();
    updateValidation();
  }

  render();
  if (window.location.protocol === "file:") {
    setLoadStatus("Open over http(s) for automatic default loading, or click Load Default Level and choose tools/level-default.json.", "error");
  } else {
    loadDefaultLevel(false);
  }
}());
