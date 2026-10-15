/**
 * Generates a deterministic 512×512 placeholder app icon (PNG, no external deps)
 * so electron-builder never fails on a missing icon asset.
 *
 * Run: node scripts/generate_icon.cjs
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 512;

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Pixel art: dark indigo background, blue rounded block, white "codgar" bar mark.
const pixels = Buffer.alloc(SIZE * SIZE * 4);
const pad = 40;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    const inside = x > pad && x < SIZE - pad && y > pad && y < SIZE - pad;
    let r = 11, g = 16, b = 32, a = 255; // #0b1020
    if (inside) {
      r = 37; g = 99; b = 235; // blue-600
      // white horizontal bar in the middle third (abstract "C" mark)
      const cx = SIZE / 2, cy = SIZE / 2;
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      if (dy < 34 && dx > 60 && dx < 150) { r = 255; g = 255; b = 255; }
      if (dx < 34 && dy > 60 && dy < 150 && x < cx) { r = 255; g = 255; b = 255; }
    }
    pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = a;
  }
}

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0; // filter: none
  pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.resolve(__dirname, '..', 'build', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log(`icon written: ${out} (${png.length} bytes, ${SIZE}x${SIZE})`);
