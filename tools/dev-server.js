const http = require("http");
const fs = require("fs");
const path = require("path");
const net = require("net");
const { exec } = require("child_process");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png"
};

const ROOT = path.resolve(__dirname, "..");
const arg = process.argv[2] || "play";
const PAGE = arg === "edit" ? "tools/level-editor.html" : "play/index.html";
const PORT_START = 3000;

function findFreePort(start, cb) {
  const probe = net.createServer();
  probe.once("error", () => findFreePort(start + 1, cb));
  probe.once("listening", () => probe.close(() => cb(start)));
  probe.listen(start, "127.0.0.1");
}

function openBrowser(url) {
  const cmd = process.platform === "win32"
    ? `start "" "${url}"`
    : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd);
}

findFreePort(PORT_START, (port) => {
  const server = http.createServer((req, res) => {
    let urlPath = req.url.split("?")[0];
    if (urlPath === "/" || urlPath === "") {
      urlPath = `/${PAGE}`;
    }

    const filePath = path.join(ROOT, urlPath);

    if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": mime });
      res.end(data);
    });
  });

  server.listen(port, "127.0.0.1", () => {
    const url = `http://localhost:${port}/${PAGE}`;
    console.log(`\n  Bag Ninja dev server running`);
    console.log(`  ${url}\n`);
    openBrowser(url);
  });
});
