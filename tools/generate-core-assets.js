const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const ASSET_ROOT = path.join(ROOT, "assets");

function mirrorRows(rows) {
  return rows.map((row) => [...row].reverse().join(""));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function encodePng(width, height, rgbaBytes) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const scanlineStart = y * (1 + width * 4);
    scanlines[scanlineStart] = 0;
    rgbaBytes.copy(scanlines, scanlineStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idat = zlib.deflateSync(scanlines);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function makeImage(rows, palette) {
  if (rows.length !== 16) {
    throw new Error(`Expected 16 rows, got ${rows.length}`);
  }

  const rgba = Buffer.alloc(16 * 16 * 4);

  rows.forEach((row, y) => {
    if (row.length !== 16) {
      throw new Error(`Expected row length 16, got ${row.length} for "${row}"`);
    }

    [...row].forEach((symbol, x) => {
      const color = palette[symbol];
      if (!color) {
        throw new Error(`Missing palette color for symbol "${symbol}"`);
      }
      const index = (y * 16 + x) * 4;
      rgba[index] = color[0];
      rgba[index + 1] = color[1];
      rgba[index + 2] = color[2];
      rgba[index + 3] = color[3];
    });
  });

  return encodePng(16, 16, rgba);
}

function writeAsset(relativePath, rows, palette) {
  const target = path.join(ASSET_ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, makeImage(rows, palette));
  console.log(`wrote ${path.relative(ROOT, target)}`);
}

const transparent = [0, 0, 0, 0];
const markerPalette = {
  ".": transparent,
  a: [255, 253, 247, 255],
  b: [34, 29, 23, 255],
  c: [49, 94, 209, 255],
  d: [217, 109, 24, 255],
  e: [157, 36, 72, 255]
};
const playerPalette = {
  ".": transparent,
  a: [42, 47, 93, 255],
  b: [247, 230, 204, 255],
  c: [219, 196, 164, 255],
  d: [51, 96, 208, 255],
  e: [38, 73, 164, 255],
  f: [241, 166, 93, 255],
  g: [178, 123, 68, 255],
  h: [90, 66, 43, 255],
  i: [171, 137, 92, 255],
  j: [124, 95, 59, 255],
  k: [46, 40, 34, 255]
};
const curtisPalette = {
  ".": transparent,
  a: [84, 58, 35, 255],
  b: [245, 226, 198, 255],
  c: [214, 190, 156, 255],
  d: [110, 157, 83, 255],
  e: [79, 122, 58, 255],
  f: [201, 82, 62, 255],
  g: [232, 199, 91, 255],
  h: [58, 42, 28, 255],
  i: [164, 119, 65, 255]
};

writeAsset("base/grass-mowed.png", [
  "abbaabbaabbaabba",
  "baabbaabbaabbaab",
  "abbaabbaabbaabba",
  "baabbaacbaabbaab",
  "abbaabbaabbaabba",
  "baabbaabbaabbaab",
  "abbaacbaabbaabba",
  "baabbaabbaacbaab",
  "abbaabbaabbaabba",
  "baabbaabbaabbaab",
  "abbaabbaacbaabba",
  "baacbaabbaabbaab",
  "abbaabbaabbaabba",
  "baabbaabbaabbaab",
  "abbaabbaabbaacba",
  "baabbaabbaabbaab"
], {
  a: [121, 163, 87, 255],
  b: [109, 148, 77, 255],
  c: [143, 187, 95, 255]
});

writeAsset("base/grass-curtis.png", [
  "abbaabbaabbaabba",
  "baabbaabbaabbaab",
  "abbaabbaabbaabba",
  "baabbaacbaabbaab",
  "abbaabbaabbaabba",
  "baabbaabbaabbaab",
  "abbaacbaabbaabba",
  "baabbaabbaacbaab",
  "abbaabbaabbaabba",
  "baabbaabbaabbaab",
  "abbaabbaacbaabba",
  "baacbaabbaabbaab",
  "abbaabbaabbaabba",
  "baabbaabbaabbaab",
  "abbaabbaabbaacba",
  "baabbaabbaabbaab"
], {
  a: [165, 178, 73, 255],
  b: [148, 158, 62, 255],
  c: [187, 199, 92, 255]
});

writeAsset("base/road.png", [
  "aaaaaaaaaaaaaaaa",
  "abaaaaaaaaaaaaba",
  "aaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaa",
  "aaaaaaacccaaaaaa",
  "aaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaa",
  "abaaaaaaaaaaaaba",
  "abaaaaaaaaaaaaba",
  "aaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaa",
  "aaaaaaacccaaaaaa",
  "aaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaa",
  "abaaaaaaaaaaaaba",
  "aaaaaaaaaaaaaaaa"
], {
  a: [88, 91, 95, 255],
  b: [70, 73, 76, 255],
  c: [116, 119, 122, 255]
});

writeAsset("base/pavement.png", [
  "aaaaaaaaaaaaaaaa",
  "abbbbaaaabbbbaaa",
  "abbbbaaaabbbbaaa",
  "abbbbaaaabbbbaaa",
  "aaaaaaaaaaaaaaaa",
  "aaabbbbaaaabbbba",
  "aaabbbbaaaabbbba",
  "aaabbbbaaaabbbba",
  "aaaaaaaaaaaaaaaa",
  "abbbbaaaabbbbaaa",
  "abbbbaaaabbbbaaa",
  "abbbbaaaabbbbaaa",
  "aaaaaaaaaaaaaaaa",
  "aaabbbbaaaabbbba",
  "aaabbbbaaaabbbba",
  "aaabbbbaaaabbbba"
], {
  a: [221, 212, 197, 255],
  b: [205, 196, 182, 255]
});

writeAsset("items/house.png", [
  "................",
  ".aaaaabbbbbbbb..",
  ".accccbbbbbbbb..",
  ".acdddbbbbbbbb..",
  ".acdddbbbbbbbb..",
  ".acdddbbbbbbbb..",
  ".acdddbbeeeebb..",
  ".acdddbbefffeb..",
  ".acdddbbefffeb..",
  ".acdddbbeeeebb..",
  ".aggggbbbbbbbb..",
  ".ahhhhbiiiiibb..",
  ".ahhhhbiiiiibb..",
  ".aaaaabbbbbbbb..",
  "................",
  "................"
], {
  ".": transparent,
  a: [80, 54, 39, 255],
  b: [118, 78, 54, 255],
  c: [161, 120, 79, 255],
  d: [142, 96, 61, 255],
  e: [90, 166, 193, 255],
  f: [196, 232, 247, 255],
  g: [61, 43, 30, 255],
  h: [130, 86, 57, 255],
  i: [93, 63, 43, 255]
});

writeAsset("items/fence.png", [
  "................",
  "................",
  "................",
  ".a.a.a.a.a.a.a..",
  ".b.b.b.b.b.b.b..",
  ".c.c.c.c.c.c.c..",
  ".d.d.d.d.d.d.d..",
  ".eeeeeeeeeeeeee.",
  ".ffffffffffffff.",
  ".g.g.g.g.g.g.g..",
  ".g.g.g.g.g.g.g..",
  "................",
  "................",
  "................",
  "................",
  "................"
], {
  ".": transparent,
  a: [233, 212, 167, 255],
  b: [221, 194, 146, 255],
  c: [207, 175, 126, 255],
  d: [192, 156, 105, 255],
  e: [179, 144, 97, 255],
  f: [158, 125, 82, 255],
  g: [136, 106, 68, 255]
});

writeAsset("items/bush.png", [
  "................",
  "......abba......",
  "....abccccba....",
  "...abccccccba...",
  "..abccccccccba..",
  "..bccccccccccb..",
  ".acccccccccccca.",
  ".acccccccccccca.",
  ".acccccccccccca.",
  "..bccccccccccb..",
  "..abccccccccba..",
  "...abccccccba...",
  "....abbbbbba....",
  "......dd........",
  "................",
  "................"
], {
  ".": transparent,
  a: [37, 99, 54, 255],
  b: [58, 130, 71, 255],
  c: [73, 150, 82, 255],
  d: [88, 68, 43, 255]
});

writeAsset("items/tree.png", [
  ".......aa.......",
  ".....abbcba.....",
  "....abccccba....",
  "...abccccccba...",
  "..abccccccccba..",
  "..bccccccccccb..",
  ".acccccccccccca.",
  ".acccccccccccca.",
  "..bccccccccccb..",
  "..abccccccccba..",
  "...abccccccba...",
  "....abccccba....",
  "......bddb......",
  "......bddb......",
  ".......ee.......",
  "................"
], {
  ".": transparent,
  a: [35, 83, 53, 255],
  b: [48, 109, 64, 255],
  c: [66, 133, 77, 255],
  d: [103, 73, 45, 255],
  e: [73, 53, 35, 255]
});

writeAsset("items/tall-grass.png", [
  "................",
  "................",
  "................",
  "................",
  "..a..b..a..b....",
  "..a..b..a..b....",
  "..ab.bb.ab.bb...",
  "..ab.bb.ab.bb...",
  "..bc.cc.bc.cc...",
  "..bc.cc.bc.cc...",
  ".acdcdcacdcdc...",
  ".acdcdcacdcdc...",
  ".bcdcdcbbdcdc...",
  "..bcbcb..bcbc...",
  "................",
  "................"
], {
  ".": transparent,
  a: [171, 219, 93, 255],
  b: [134, 191, 79, 255],
  c: [113, 171, 65, 255],
  d: [89, 145, 54, 255]
});

writeAsset("items/bag.png", [
  "................",
  "................",
  "......aa........",
  ".....abca.......",
  "....abddca......",
  "...abddddca.....",
  "...bddddddc.....",
  "...bddddddc.....",
  "...bddddddc.....",
  "...bdeeeddc.....",
  "...bdeeeddc.....",
  "...abddddca.....",
  "....abbbca......",
  ".....aaaa.......",
  "................",
  "................"
], {
  ".": transparent,
  a: [152, 122, 79, 255],
  b: [178, 144, 97, 255],
  c: [123, 98, 66, 255],
  d: [194, 163, 116, 255],
  e: [214, 190, 149, 255]
});

writeAsset("markers/curtis-spawn.png", [
  "................",
  ".....aaaaaa.....",
  "....aabbbbaa....",
  "...aabbbbbbaa...",
  "...aabbbbbbaa...",
  "...aabbbbbbaa...",
  "...aabbbbbbaa...",
  "...aabbbbbbaa...",
  "...aabbbbbbaa...",
  "...aabbbbbbaa...",
  "...aabbbbbbaa...",
  "....aabbbbaa....",
  ".....aaaaaa.....",
  "................",
  "................",
  "................"
], markerPalette);

writeAsset("markers/player-spawn.png", [
  "................",
  ".....aaaaaa.....",
  "....aaccccaa....",
  "...aaccccccaa...",
  "...aaccccccaa...",
  "...aaccccccaa...",
  "...aaccccccaa...",
  "...aaccccccaa...",
  "...aaccccccaa...",
  "...aaccccccaa...",
  "...aaccccccaa...",
  "....aaccccaa....",
  ".....aaaaaa.....",
  "................",
  "................",
  "................"
], markerPalette);

writeAsset("markers/mower-spawn.png", [
  "................",
  ".....aaaaaa.....",
  "....aaddddaa....",
  "...aaddddddaa...",
  "...aaddddddaa...",
  "...aaddddddaa...",
  "...aaddddddaa...",
  "...aaddddddaa...",
  "...aaddddddaa...",
  "...aaddddddaa...",
  "...aaddddddaa...",
  "....aaddddaa....",
  ".....aaaaaa.....",
  "................",
  "................",
  "................"
], markerPalette);

writeAsset("markers/police-spawn.png", [
  "................",
  ".....aaaaaa.....",
  "....aaccccee....",
  "...aaccccceeea..",
  "...aaccccceeea..",
  "...aaccccceeea..",
  "...aaccccceeea..",
  "...aaccccceeea..",
  "...aaccccceeea..",
  "...aaccccceeea..",
  "...aaccccceeea..",
  "....aaccccee....",
  ".....aaaaaa.....",
  "................",
  "................",
  "................"
], markerPalette);

writeAsset("entities/player-idle-down-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  "......dd........",
  ".....ddee.......",
  ".....dffffd.....",
  "......ffff......",
  "......ffff......",
  "......gggg......",
  ".....hg..gh.....",
  ".....hg..gh.....",
  ".....ii..ii.....",
  "....ii....ii....",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-idle-up-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  "......dd........",
  ".....ddee.......",
  ".....dffffd.....",
  "......ffff......",
  "......ffff......",
  "......gggg......",
  ".....hhffhh.....",
  ".....hg..gh.....",
  ".....ii..ii.....",
  "....ii....ii....",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-idle-left-01.png", [
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  "......dd........",
  ".....ddee.......",
  "....dffffd......",
  "...dffffd.......",
  "...dffffd.......",
  "....dgggd.......",
  "...dhggdh.......",
  "...dhg.gh.......",
  "....ii.ii.......",
  "...ii...ii......",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-idle-right-01.png", mirrorRows([
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  "......dd........",
  ".....ddee.......",
  "....dffffd......",
  "...dffffd.......",
  "...dffffd.......",
  "....dgggd.......",
  "...dhggdh.......",
  "...dhg.gh.......",
  "....ii.ii.......",
  "...ii...ii......",
  "................",
  "................"
]), playerPalette);

writeAsset("entities/player-walk-down-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  "......dd........",
  ".....ddee.......",
  ".....dffffd.....",
  "......ffff......",
  "......ffff......",
  "......gggg......",
  ".....hg..gh.....",
  "......g..g......",
  "....ii....ii....",
  "...ii......ii...",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-walk-down-02.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  "......dd........",
  ".....ddee.......",
  ".....dffffd.....",
  "......ffff......",
  "......ffff......",
  "......gggg......",
  "......g..g......",
  ".....hg..gh.....",
  "...ii......ii...",
  "....ii....ii....",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-walk-up-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  "......dd........",
  ".....ddee.......",
  ".....dffffd.....",
  "......ffff......",
  "......ffff......",
  "......gggg......",
  ".....hhffhh.....",
  "......g..g......",
  "....ii....ii....",
  "...ii......ii...",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-walk-up-02.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  "......dd........",
  ".....ddee.......",
  ".....dffffd.....",
  "......ffff......",
  "......ffff......",
  "......gggg......",
  "......hhffhh....",
  ".....hg..gh.....",
  "...ii......ii...",
  "....ii....ii....",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-walk-left-01.png", [
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  "......dd........",
  ".....ddee.......",
  "....dffffd......",
  "...dffffd.......",
  "...dffffd.......",
  "....dgggd.......",
  "...dhggdh.......",
  "....hg.gh.......",
  "...ii..ii.......",
  ".ii....ii.......",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-walk-left-02.png", [
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  "......dd........",
  ".....ddee.......",
  "....dffffd......",
  "...dffffd.......",
  "...dffffd.......",
  "....dgggd.......",
  "...dhggdh.......",
  "....hg.gh.......",
  "....ii..ii......",
  "...ii....ii.....",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-walk-right-01.png", mirrorRows([
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  "......dd........",
  ".....ddee.......",
  "....dffffd......",
  "...dffffd.......",
  "...dffffd.......",
  "....dgggd.......",
  "...dhggdh.......",
  "....hg.gh.......",
  "...ii..ii.......",
  ".ii....ii.......",
  "................",
  "................"
]), playerPalette);

writeAsset("entities/player-walk-right-02.png", mirrorRows([
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  "......dd........",
  ".....ddee.......",
  "....dffffd......",
  "...dffffd.......",
  "...dffffd.......",
  "....dgggd.......",
  "...dhggdh.......",
  "....hg.gh.......",
  "....ii..ii......",
  "...ii....ii.....",
  "................",
  "................"
]), playerPalette);

writeAsset("entities/player-carry-down-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  "....jjdddda.....",
  "...jiiddeedda...",
  "...jiidffffda...",
  "....jiiffffa....",
  ".....agggga.....",
  ".....agggga.....",
  "....ahg..gha....",
  "....ahg..gha....",
  ".....ii..ii.....",
  "....ii....ii....",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-carry-up-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  "....jjdddda.....",
  "...jiiddeedda...",
  "...jiidffffda...",
  "....jiiffffa....",
  ".....agggga.....",
  ".....agggga.....",
  "....ahhffhha....",
  "....ahg..gha....",
  ".....ii..ii.....",
  "....ii....ii....",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-carry-left-01.png", [
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  "....jjdddda.....",
  "...jiiddeedda...",
  "...jiidffffda...",
  "...jiiiffffa....",
  "....agggga......",
  "....agggga......",
  "...ahhggha......",
  "...ahg.gha......",
  "....ii.ii.......",
  "...ii...ii......",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-carry-right-01.png", mirrorRows([
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  "....jjdddda.....",
  "...jiiddeedda...",
  "...jiidffffda...",
  "...jiiiffffa....",
  "....agggga......",
  "....agggga......",
  "...ahhggha......",
  "...ahg.gha......",
  "....ii.ii.......",
  "...ii...ii......",
  "................",
  "................"
]), playerPalette);

writeAsset("entities/player-operate-mower-down-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "...gggggggggg...",
  "..ghhhhhhhhhhg..",
  "..ghiiiiiiiihg..",
  "...ghhhhhhhhg...",
  "....j..kk..j....",
  "...jj..kk..jj...",
  "................",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-operate-mower-down-02.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "...gggggggggg...",
  "..ghhhhhhhhhhg..",
  "..ghiiiiiiiihg..",
  "...ghhhhhhhhg...",
  "....j.kk..j.....",
  ".....jkk.jj.....",
  "................",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-operate-mower-up-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "...gggggggggg...",
  "..ghhhhhhhhhhg..",
  "..ghiiiiiiiihg..",
  "...ghhhhhhhhg...",
  "....j.ff..j.....",
  "...jj.kk..jj....",
  "................",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-operate-mower-up-02.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "...gggggggggg...",
  "..ghhhhhhhhhhg..",
  "..ghiiiiiiiihg..",
  "...ghhhhhhhhg...",
  ".....jff.j......",
  "....jj..kk.jj...",
  "................",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-operate-mower-left-01.png", [
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "..ggggggggggg...",
  ".ghhhhhhhhhhhg..",
  ".ghiiiiiiiiihg..",
  "..ghhhhhhhhhg...",
  "...jkk.jjj......",
  "..jjkk..jj......",
  "................",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-operate-mower-left-02.png", [
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "..ggggggggggg...",
  ".ghhhhhhhhhhhg..",
  ".ghiiiiiiiiihg..",
  "..ghhhhhhhhhg...",
  "...jk.kkjj......",
  "..jj..kkjj......",
  "................",
  "................",
  "................"
], playerPalette);

writeAsset("entities/player-operate-mower-right-01.png", mirrorRows([
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "..ggggggggggg...",
  ".ghhhhhhhhhhhg..",
  ".ghiiiiiiiiihg..",
  "..ghhhhhhhhhg...",
  "...jkk.jjj......",
  "..jjkk..jj......",
  "................",
  "................",
  "................"
]), playerPalette);

writeAsset("entities/player-operate-mower-right-02.png", mirrorRows([
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "..ggggggggggg...",
  ".ghhhhhhhhhhhg..",
  ".ghiiiiiiiiihg..",
  "..ghhhhhhhhhg...",
  "...jk.kkjj......",
  "..jj..kkjj......",
  "................",
  "................",
  "................"
]), playerPalette);

writeAsset("entities/curtis-idle-down-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  ".....affffa.....",
  ".....agggga.....",
  ".....agggga.....",
  "....ahg..gha....",
  "....ahg..gha....",
  ".....ii..ii.....",
  "....ii....ii....",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-idle-up-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  ".....affffa.....",
  ".....agggga.....",
  ".....agggga.....",
  "....ahhffhha....",
  "....ahg..gha....",
  ".....ii..ii.....",
  "....ii....ii....",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-idle-left-01.png", [
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "...aafffffa.....",
  "....agggga......",
  "....agggga......",
  "...ahhggha......",
  "...ahg.gha......",
  "....ii.ii.......",
  "...ii...ii......",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-idle-right-01.png", mirrorRows([
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "...aafffffa.....",
  "....agggga......",
  "....agggga......",
  "...ahhggha......",
  "...ahg.gha......",
  "....ii.ii.......",
  "...ii...ii......",
  "................",
  "................"
]), curtisPalette);

writeAsset("entities/curtis-walk-down-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  ".....affffa.....",
  ".....agggga.....",
  ".....agggga.....",
  "....ahg..gha....",
  ".....hg..gh.....",
  "....ii....ii....",
  "...ii......ii...",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-walk-down-02.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  ".....affffa.....",
  ".....agggga.....",
  ".....agggga.....",
  ".....hg..gh.....",
  "....ahg..gha....",
  "...ii......ii...",
  "....ii....ii....",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-walk-up-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  ".....affffa.....",
  ".....agggga.....",
  ".....agggga.....",
  "....ahhffhha....",
  ".....hg..gh.....",
  "....ii....ii....",
  "...ii......ii...",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-walk-up-02.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  ".....affffa.....",
  ".....agggga.....",
  ".....agggga.....",
  ".....hhffhh.....",
  "....ahg..gha....",
  "...ii......ii...",
  "....ii....ii....",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-walk-left-01.png", [
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "...aafffffa.....",
  "....agggga......",
  "....agggga......",
  "...ahhggha......",
  "...ahg.gha......",
  "..ii..ii........",
  ".ii....ii.......",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-walk-left-02.png", [
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "...aafffffa.....",
  "....agggga......",
  "....agggga......",
  "...ahhggha......",
  "...ahg.gha......",
  "....ii..ii......",
  "...ii....ii.....",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-walk-right-01.png", mirrorRows([
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "...aafffffa.....",
  "....agggga......",
  "....agggga......",
  "...ahhggha......",
  "...ahg.gha......",
  "..ii..ii........",
  ".ii....ii.......",
  "................",
  "................"
]), curtisPalette);

writeAsset("entities/curtis-walk-right-02.png", mirrorRows([
  "......aaaa......",
  ".....abbb.......",
  ".....abbbba.....",
  "......acca......",
  ".....adddda.....",
  "....addeedda....",
  "....adffffda....",
  "...aafffffa.....",
  "....agggga......",
  "....agggga......",
  "...ahhggha......",
  "...ahg.gha......",
  "....ii..ii......",
  "...ii....ii.....",
  "................",
  "................"
]), curtisPalette);

writeAsset("entities/curtis-alert-down-01.png", [
  "......ffff......",
  ".....fababf.....",
  ".....fababf.....",
  "......fbcf......",
  ".....fddddf.....",
  "....fdddeddf....",
  "....fddddddf....",
  ".....fddddf.....",
  ".....fggggf.....",
  ".....fggggf.....",
  "....fhg..ghf....",
  "....fhg..ghf....",
  ".....ii..ii.....",
  "....ii....ii....",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-alert-up-01.png", [
  "......ffff......",
  ".....fababf.....",
  ".....fababf.....",
  "......fbcf......",
  ".....fddddf.....",
  "....fdddeddf....",
  "....fddddddf....",
  ".....fddddf.....",
  ".....fggggf.....",
  ".....fggggf.....",
  "....fhhddhhf....",
  "....fhg..ghf....",
  ".....ii..ii.....",
  "....ii....ii....",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-alert-left-01.png", [
  "......ffff......",
  ".....faba.......",
  ".....fababf.....",
  "......fbcf......",
  ".....fddddf.....",
  "....fdddeddf....",
  "....fddddddf....",
  "...ffdddddf.....",
  "....fggggf......",
  "....fggggf......",
  "...fhhgghf......",
  "...fhg.ghf......",
  "....ii.ii.......",
  "...ii...ii......",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-alert-right-01.png", mirrorRows([
  "......ffff......",
  ".....faba.......",
  ".....fababf.....",
  "......fbcf......",
  ".....fddddf.....",
  "....fdddeddf....",
  "....fddddddf....",
  "...ffdddddf.....",
  "....fggggf......",
  "....fggggf......",
  "...fhhgghf......",
  "...fhg.ghf......",
  "....ii.ii.......",
  "...ii...ii......",
  "................",
  "................"
]), curtisPalette);

writeAsset("entities/curtis-angry-down-01.png", [
  "......ffff......",
  ".....ffbbff.....",
  ".....fababf.....",
  "......fbcf......",
  ".....fddddf.....",
  "....fdddeddf....",
  "....fddddddf....",
  ".....fddddf.....",
  ".....fggggf.....",
  ".....fggggf.....",
  "....fhg..ghf....",
  "....fhg..ghf....",
  ".....ii..ii.....",
  "....ii....ii....",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-angry-up-01.png", [
  "......ffff......",
  ".....ffbbff.....",
  ".....fababf.....",
  "......fbcf......",
  ".....fddddf.....",
  "....fdddeddf....",
  "....fddddddf....",
  ".....fddddf.....",
  ".....fggggf.....",
  ".....fggggf.....",
  "....fhhddhhf....",
  "....fhg..ghf....",
  ".....ii..ii.....",
  "....ii....ii....",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-angry-left-01.png", [
  "......ffff......",
  ".....ffbb.......",
  ".....fababf.....",
  "......fbcf......",
  ".....fddddf.....",
  "....fdddeddf....",
  "....fddddddf....",
  "...ffdddddf.....",
  "....fggggf......",
  "....fggggf......",
  "...fhhgghf......",
  "...fhg.ghf......",
  "....ii.ii.......",
  "...ii...ii......",
  "................",
  "................"
], curtisPalette);

writeAsset("entities/curtis-angry-right-01.png", mirrorRows([
  "......ffff......",
  ".....ffbb.......",
  ".....fababf.....",
  "......fbcf......",
  ".....fddddf.....",
  "....fdddeddf....",
  "....fddddddf....",
  "...ffdddddf.....",
  "....fggggf......",
  "....fggggf......",
  "...fhhgghf......",
  "...fhg.ghf......",
  "....ii.ii.......",
  "...ii...ii......",
  "................",
  "................"
]), curtisPalette);

writeAsset("entities/mower-idle.png", [
  "................",
  "........aa......",
  ".......abba.....",
  "......abccba....",
  ".....abccccba...",
  "...dddddddddd...",
  "..deeeeeeeeeed..",
  "..deefffffeeed..",
  "..defffffffedd..",
  "...dfffffffd....",
  "....dgggggd.....",
  "...h..g..g..h...",
  "..hh..g..g..hh..",
  "................",
  "................",
  "................"
], {
  ".": transparent,
  a: [241, 232, 212, 255],
  b: [198, 179, 150, 255],
  c: [156, 136, 110, 255],
  d: [198, 68, 53, 255],
  e: [221, 86, 68, 255],
  f: [176, 53, 40, 255],
  g: [46, 40, 34, 255],
  h: [72, 64, 56, 255]
});

writeAsset("entities/police-walk-up-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....acccca.....",
  "......adde......",
  ".....affffa.....",
  "....afggggfa....",
  "....ahggggha....",
  ".....agggga.....",
  ".....agggga.....",
  "....aiiaaiia....",
  "...ajii..iija...",
  "...ajii..iija...",
  "....kk....kk....",
  "...k......k.....",
  "................",
  "................"
], {
  ".": transparent,
  a: [39, 45, 92, 255],
  b: [243, 226, 199, 255],
  c: [224, 206, 180, 255],
  d: [31, 34, 62, 255],
  e: [214, 194, 164, 255],
  f: [76, 108, 186, 255],
  g: [58, 86, 156, 255],
  h: [230, 197, 94, 255],
  i: [49, 57, 110, 255],
  j: [32, 37, 78, 255],
  k: [28, 31, 52, 255]
});

writeAsset("entities/police-walk-up-02.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....acccca.....",
  "......adde......",
  ".....affffa.....",
  "....afggggfa....",
  "....ahggggha....",
  ".....agggga.....",
  ".....agggga.....",
  "....aiiaaiia....",
  ".....jiiiij.....",
  "....jii..iij....",
  "...kk......kk...",
  "..k..........k..",
  "................",
  "................"
], {
  ".": transparent,
  a: [39, 45, 92, 255],
  b: [243, 226, 199, 255],
  c: [224, 206, 180, 255],
  d: [31, 34, 62, 255],
  e: [214, 194, 164, 255],
  f: [76, 108, 186, 255],
  g: [58, 86, 156, 255],
  h: [230, 197, 94, 255],
  i: [49, 57, 110, 255],
  j: [32, 37, 78, 255],
  k: [28, 31, 52, 255]
});

writeAsset("entities/police-walk-down-01.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....acccca.....",
  "......adde......",
  ".....affffa.....",
  "....afggggfa....",
  "....ahggggha....",
  ".....agggga.....",
  ".....agggga.....",
  "....aiiaaiia....",
  "...ajii..iija...",
  "...ajii..iija...",
  "....kk....kk....",
  "...k......k.....",
  "................",
  "................"
], {
  ".": transparent,
  a: [39, 45, 92, 255],
  b: [243, 226, 199, 255],
  c: [224, 206, 180, 255],
  d: [31, 34, 62, 255],
  e: [214, 194, 164, 255],
  f: [76, 108, 186, 255],
  g: [58, 86, 156, 255],
  h: [207, 67, 66, 255],
  i: [49, 57, 110, 255],
  j: [32, 37, 78, 255],
  k: [28, 31, 52, 255]
});

writeAsset("entities/police-walk-down-02.png", [
  "......aaaa......",
  ".....abbbba.....",
  ".....acccca.....",
  "......adde......",
  ".....affffa.....",
  "....afggggfa....",
  "....ahggggha....",
  ".....agggga.....",
  ".....agggga.....",
  "....aiiaaiia....",
  ".....jiiiij.....",
  "....jii..iij....",
  "...kk......kk...",
  "..k..........k..",
  "................",
  "................"
], {
  ".": transparent,
  a: [39, 45, 92, 255],
  b: [243, 226, 199, 255],
  c: [224, 206, 180, 255],
  d: [31, 34, 62, 255],
  e: [214, 194, 164, 255],
  f: [76, 108, 186, 255],
  g: [58, 86, 156, 255],
  h: [207, 67, 66, 255],
  i: [49, 57, 110, 255],
  j: [32, 37, 78, 255],
  k: [28, 31, 52, 255]
});

writeAsset("entities/police-walk-left-01.png", [
  "................",
  "......aaaa......",
  ".....abbb.......",
  "....acccca......",
  "....addeffa.....",
  "...aggggggfa....",
  "...ahgggggfa....",
  "..aiggggggha....",
  "..aigggggga.....",
  "...ajjjjja......",
  "..akkllmm.......",
  "..akkllmm.......",
  "...nn..oo.......",
  "..nn...oo.......",
  "................",
  "................"
], {
  ".": transparent,
  a: [39, 45, 92, 255],
  b: [243, 226, 199, 255],
  c: [224, 206, 180, 255],
  d: [31, 34, 62, 255],
  e: [214, 194, 164, 255],
  f: [76, 108, 186, 255],
  g: [58, 86, 156, 255],
  h: [230, 197, 94, 255],
  i: [207, 67, 66, 255],
  j: [49, 57, 110, 255],
  k: [32, 37, 78, 255],
  l: [44, 50, 98, 255],
  m: [28, 31, 52, 255],
  n: [34, 39, 68, 255],
  o: [26, 29, 47, 255]
});

writeAsset("entities/police-walk-left-02.png", [
  "................",
  "......aaaa......",
  ".....abbb.......",
  "....acccca......",
  "....addeffa.....",
  "...aggggggfa....",
  "...ahgggggfa....",
  "..aiggggggha....",
  "..aigggggga.....",
  "...ajjjjja......",
  "....kkllmm......",
  "...kkllmm.......",
  "..nn...oo.......",
  ".nn.....oo......",
  "................",
  "................"
], {
  ".": transparent,
  a: [39, 45, 92, 255],
  b: [243, 226, 199, 255],
  c: [224, 206, 180, 255],
  d: [31, 34, 62, 255],
  e: [214, 194, 164, 255],
  f: [76, 108, 186, 255],
  g: [58, 86, 156, 255],
  h: [230, 197, 94, 255],
  i: [207, 67, 66, 255],
  j: [49, 57, 110, 255],
  k: [32, 37, 78, 255],
  l: [44, 50, 98, 255],
  m: [28, 31, 52, 255],
  n: [34, 39, 68, 255],
  o: [26, 29, 47, 255]
});

writeAsset("entities/police-walk-right-01.png", [
  "................",
  "......aaaa......",
  ".......bbba.....",
  "......acccca....",
  ".....affeadda...",
  "....afgggggga...",
  "....afgggggha...",
  "...ahggggggia...",
  ".....aggggggia..",
  "......ajjjjja...",
  ".......mmllkka..",
  ".......mmllkka..",
  ".......oo..nn...",
  ".......oo...nn..",
  "................",
  "................"
], {
  ".": transparent,
  a: [39, 45, 92, 255],
  b: [243, 226, 199, 255],
  c: [224, 206, 180, 255],
  d: [31, 34, 62, 255],
  e: [214, 194, 164, 255],
  f: [76, 108, 186, 255],
  g: [58, 86, 156, 255],
  h: [230, 197, 94, 255],
  i: [207, 67, 66, 255],
  j: [49, 57, 110, 255],
  k: [32, 37, 78, 255],
  l: [44, 50, 98, 255],
  m: [28, 31, 52, 255],
  n: [34, 39, 68, 255],
  o: [26, 29, 47, 255]
});

writeAsset("entities/police-walk-right-02.png", [
  "................",
  "......aaaa......",
  ".......bbba.....",
  "......acccca....",
  ".....affeadda...",
  "....afgggggga...",
  "....afgggggha...",
  "...ahggggggia...",
  ".....aggggggia..",
  "......ajjjjja...",
  "......mmllkk....",
  ".......mmllkk...",
  ".......oo...nn..",
  "......oo.....nn.",
  "................",
  "................"
], {
  ".": transparent,
  a: [39, 45, 92, 255],
  b: [243, 226, 199, 255],
  c: [224, 206, 180, 255],
  d: [31, 34, 62, 255],
  e: [214, 194, 164, 255],
  f: [76, 108, 186, 255],
  g: [58, 86, 156, 255],
  h: [230, 197, 94, 255],
  i: [207, 67, 66, 255],
  j: [49, 57, 110, 255],
  k: [32, 37, 78, 255],
  l: [44, 50, 98, 255],
  m: [28, 31, 52, 255],
  n: [34, 39, 68, 255],
  o: [26, 29, 47, 255]
});
