(function () {
  const MAX_FRAMES = 4;

  const sections = [
    {
      title: "Base Tiles",
      description: "Current authored terrain tile contract.",
      groups: [
        {
          title: "Ground",
          assets: [
            staticAsset("Mowed Grass", "../assets/base/grass-mowed.png"),
            staticAsset("Road", "../assets/base/road.png"),
            staticAsset("Pavement", "../assets/base/pavement.png")
          ]
        }
      ]
    },
    {
      title: "Static Items",
      description: "Authored static item sprites. Numbered frame files such as `tree-01.png` and `tree-02.png` animate automatically if present.",
      groups: [
        {
          title: "Authored Items",
          assets: [
            animatedItem("House", "house"),
            animatedItem("Fence", "fence"),
            animatedItem("Roadblock", "roadblock"),
            animatedItem("Bush", "bush"),
            animatedItem("Tree", "tree"),
            animatedItem("Tall Grass", "tall-grass")
          ]
        }
      ]
    },
    {
      title: "Moveable Items",
      description: "Runtime moveable items share attachment and occupancy rules and are not authored in the static level items layer.",
      groups: [
        {
          title: "Free World State",
          assets: [
            staticAsset("Bag", "../assets/items/bag.png"),
            staticAsset("Mower Idle", "../assets/entities/mower-idle.png")
          ]
        }
      ]
    },
    {
      title: "Player",
      description: "Standing, walking, mowing, and bag-carrying states.",
      groups: [
        directionalGroup("Standing", "player", "idle"),
        directionalGroup("Walking", "player", "walk"),
        directionalGroup("Holding Lawn Bag", "player", "carry"),
        directionalGroup("Walking With Lawn Bag", "player", "carry"),
        directionalGroup("Using Mower", "player", "operate-mower"),
        directionalGroup("Mowing", "player", "operate-mower")
      ]
    },
    {
      title: "Curtis",
      description: "Idle, movement, and reaction states.",
      groups: [
        directionalGroup("Standing", "curtis", "idle"),
        directionalGroup("Walking", "curtis", "walk"),
        directionalGroup("Being Angry", "curtis", "angry"),
        directionalGroup("Being Confused", "curtis", "alert")
      ]
    },
    {
      title: "Mower",
      description: "Runtime mower entity states.",
      groups: [
        {
          title: "Standing Idle",
          assets: [
            staticAsset("Idle", "../assets/entities/mower-idle.png")
          ]
        }
      ]
    },
    {
      title: "Policeman",
      description: "Movement-focused police entity previews.",
      groups: [
        directionalGroup("Moving", "police", "walk")
      ]
    }
  ];

  const viewerRootEl = document.getElementById("viewer-root");
  const scaleRangeEl = document.getElementById("scale-range");
  const fpsRangeEl = document.getElementById("fps-range");
  const scaleValueEl = document.getElementById("scale-value");
  const fpsValueEl = document.getElementById("fps-value");
  const missingCountEl = document.getElementById("missing-count");

  const animatedSprites = [];
  let missingCount = 0;
  let frameTimer = null;

  function staticAsset(label, path) {
    return {
      label,
      paths: [path],
      kind: "static"
    };
  }

  function animatedItem(label, stem) {
    return {
      label,
      paths: [
        `../assets/items/${stem}.png`,
        `../assets/items/${stem}-01.png`,
        `../assets/items/${stem}-02.png`,
        `../assets/items/${stem}-03.png`,
        `../assets/items/${stem}-04.png`
      ],
      kind: "item"
    };
  }

  function directionalGroup(title, entityName, stateName) {
    return {
      title,
      assets: ["up", "down", "left", "right"].map((direction) => ({
        label: `${capitalize(direction)}`,
        paths: framePaths(entityName, stateName, direction),
        kind: "entity"
      }))
    };
  }

  function framePaths(entityName, stateName, direction) {
    return Array.from({ length: MAX_FRAMES }, (_, index) => {
      const frame = String(index + 1).padStart(2, "0");
      return `../assets/entities/${entityName}-${stateName}-${direction}-${frame}.png`;
    });
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function probeImage(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(src);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  async function resolveFrames(asset) {
    const candidates = await Promise.all(asset.paths.map((src) => probeImage(src)));
    const found = candidates.filter(Boolean);

    if (asset.kind === "item" && found.length > 1 && found[0] === asset.paths[0]) {
      return found.slice(1);
    }

    return found;
  }

  async function buildViewer() {
    for (const section of sections) {
      const sectionEl = document.createElement("section");
      sectionEl.className = "section";
      sectionEl.innerHTML = `<h2>${section.title}</h2><p class="section-copy">${section.description}</p>`;

      for (const group of section.groups) {
        const groupEl = document.createElement("div");
        groupEl.className = "group";
        groupEl.innerHTML = `<h3>${group.title}</h3>`;

        const gridEl = document.createElement("div");
        gridEl.className = "asset-grid";

        for (const asset of group.assets) {
          const cardEl = await buildAssetCard(asset);
          gridEl.appendChild(cardEl);
        }

        groupEl.appendChild(gridEl);
        sectionEl.appendChild(groupEl);
      }

      viewerRootEl.appendChild(sectionEl);
    }

    missingCountEl.textContent = String(missingCount);
    startAnimationLoop();
  }

  async function buildAssetCard(asset) {
    const frames = await resolveFrames(asset);
    const isMissing = frames.length === 0;

    if (isMissing) {
      missingCount += 1;
    }

    const cardEl = document.createElement("article");
    cardEl.className = "asset-card";

    const previewEl = document.createElement("div");
    previewEl.className = `preview${isMissing ? " is-missing" : ""}`;

    const imageEl = document.createElement("img");
    imageEl.alt = asset.label;
    imageEl.src = frames[0] || transparentDataUrl();
    previewEl.appendChild(imageEl);

    const metaEl = document.createElement("div");
    metaEl.className = "meta";

    const sourceText = isMissing
      ? "No matching file found"
      : frames.length > 1
        ? `${frames.length} frames`
        : frames[0];

    metaEl.innerHTML = `
      <span><strong>${asset.label}</strong></span>
      <code>${sourceText}</code>
      ${isMissing ? '<span class="missing-note">Transparent fallback</span>' : ""}
    `;

    cardEl.appendChild(previewEl);
    cardEl.appendChild(metaEl);

    if (frames.length > 1) {
      animatedSprites.push({ imageEl, frames, index: 0 });
    }

    return cardEl;
  }

  function transparentDataUrl() {
    return "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
  }

  function startAnimationLoop() {
    if (frameTimer) {
      window.clearInterval(frameTimer);
    }

    const fps = Number(fpsRangeEl.value);
    frameTimer = window.setInterval(() => {
      animatedSprites.forEach((sprite) => {
        sprite.index = (sprite.index + 1) % sprite.frames.length;
        sprite.imageEl.src = sprite.frames[sprite.index];
      });
    }, Math.max(80, Math.round(1000 / fps)));
  }

  function updateScale() {
    const scale = Number(scaleRangeEl.value);
    document.documentElement.style.setProperty("--preview-size", `${scale * 16}px`);
    scaleValueEl.textContent = `${scale}x`;
  }

  function updateFps() {
    fpsValueEl.textContent = fpsRangeEl.value;
    startAnimationLoop();
  }

  scaleRangeEl.addEventListener("input", updateScale);
  fpsRangeEl.addEventListener("input", updateFps);

  updateScale();
  updateFps();
  buildViewer();
}());
