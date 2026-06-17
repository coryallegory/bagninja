const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const outputArg = process.argv[2] || ".deploy-pages";
const outputDir = path.resolve(repoRoot, outputArg);

function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyDir(sourceDir, targetDir, includeFile) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath, includeFile);
    } else if (entry.isFile() && (!includeFile || includeFile(sourcePath))) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function writeTextFile(targetPath, contents) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents, "utf8");
}

function copyPlayRootFile(fileName, rewriteAssets = false) {
  const sourcePath = path.join(repoRoot, "play", fileName);
  const targetPath = path.join(outputDir, fileName);
  let contents = fs.readFileSync(sourcePath, "utf8");
  if (rewriteAssets) {
    contents = contents.replaceAll("../assets/", "./assets/");
  }
  writeTextFile(targetPath, contents);
}

resetDir(outputDir);

copyPlayRootFile("index.html", true);
copyPlayRootFile("game.js", true);
copyPlayRootFile("game-core.js");
copyPlayRootFile("game.css");
copyPlayRootFile("shell.js");

copyDir(path.join(repoRoot, "play", "levels"), path.join(outputDir, "levels"), (filePath) => path.extname(filePath) === ".json");
copyDir(path.join(repoRoot, "assets"), path.join(outputDir, "assets"), (filePath) => path.extname(filePath) === ".png");

writeTextFile(path.join(outputDir, ".nojekyll"), "");
