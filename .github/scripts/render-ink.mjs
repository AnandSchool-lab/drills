/* Turn a saved pen-strokes file into a PNG, so the overnight review can
 * read their handwriting.
 *
 *   node .github/scripts/render-ink.mjs <strokes.json> <out.png>
 *
 * The strokes file is what ink.js saves: { w, h, s:[{ t, p:[x,y,x,y,...] }] }.
 * The picture is cropped to the ink, drawn black on white at 2x.
 * No dependencies - only Node's own zlib - so it runs anywhere Node does.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const [, , src, out] = process.argv;
if (!src || !out) {
  console.error("usage: node render-ink.mjs <strokes.json> <out.png>");
  process.exit(1);
}

const ink = JSON.parse(readFileSync(src, "utf8"));
const strokes = (ink.s || []).map((s) => s.p || []).filter((p) => p.length >= 2);
if (!strokes.length) { console.error("no strokes in " + src); process.exit(2); }

let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
for (const p of strokes) for (let i = 0; i < p.length; i += 2) {
  x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]);
  y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]);
}

const SCALE = 2, PAD = 12, R = 1.6 * SCALE;
const W = Math.ceil((x1 - x0) * SCALE + PAD * 2);
const H = Math.ceil((y1 - y0) * SCALE + PAD * 2);
const px = new Uint8Array(W * H).fill(255);

function dot(cx, cy) {
  const r2 = R * R;
  for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(H - 1, Math.ceil(cy + R)); y++)
    for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(W - 1, Math.ceil(cx + R)); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) px[y * W + x] = 0;
}
const at = (v, o) => (v - o) * SCALE + PAD;

for (const p of strokes) {
  let px0 = at(p[0], x0), py0 = at(p[1], y0);
  dot(px0, py0);
  for (let i = 2; i < p.length; i += 2) {
    const px1 = at(p[i], x0), py1 = at(p[i + 1], y0);
    const n = Math.max(1, Math.ceil(Math.hypot(px1 - px0, py1 - py0) / 0.75));
    for (let k = 1; k <= n; k++) dot(px0 + (px1 - px0) * k / n, py0 + (py1 - py0) * k / n);
    px0 = px1; py0 = py1;
  }
}

/* minimal PNG: 8-bit greyscale, one IDAT */
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const raw = Buffer.alloc((W + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W + 1)] = 0;
  raw.set(px.subarray(y * W, (y + 1) * W), y * (W + 1) + 1);
}
writeFileSync(out, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0))
]));
console.log(`${out}  ${W}x${H}, ${strokes.length} strokes`);
