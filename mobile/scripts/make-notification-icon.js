// Draws assets/images/notification-icon.png: a white bold "A" (Anwarz) on transparent, 96×96.
// Android shows notification icons (status bar, Galaxy Watch) as a white silhouette tinted with the
// app colour, so the icon must be white on transparent. Run: node scripts/make-notification-icon.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 96;
const SS = 4; // supersampling for smooth edges

// Distance from point p to segment ab.
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// The "A": two legs meeting at a flat top, and a crossbar. Units are pixels in the 96 grid.
const STROKE = 7.5;
const shapes = [
  [48, 14, 18, 82], // left leg
  [48, 14, 78, 82], // right leg
  [31, 56, 65, 56], // crossbar
];
function inside(x, y) {
  return shapes.some(([ax, ay, bx, by]) => segDist(x, y, ax, ay, bx, by) <= STROKE);
}

const rows = [];
for (let y = 0; y < SIZE; y++) {
  const row = Buffer.alloc(1 + SIZE * 4);
  row[0] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    let hits = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) if (inside(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS)) hits++;
    const a = Math.round((hits / (SS * SS)) * 255);
    row.writeUInt32BE((0xffffff00 | a) >>> 0, 1 + x * 4); // white, alpha = coverage
  }
  rows.push(row);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
  chunk('IEND', Buffer.alloc(0)),
]);
const file = path.join(__dirname, '..', 'assets', 'images', 'notification-icon.png');
fs.writeFileSync(file, png);
console.log(`notification-icon.png: ${png.length} bytes`);
