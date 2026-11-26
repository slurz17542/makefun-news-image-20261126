// news-image-20261126: draws Thursday 26 November 2026's world news as one
// 1024x1024 PNG, rendered entirely from code (Node 22 standard library only).
// Lead, verified against Reuters on 26 Nov 2026: the US plans to raise tariffs
// on China by 20 points on top of the 25% first-term levies, so second-term
// tariffs could reach 40%; the move follows the Supreme Court striking down
// the April 2025 'Liberation Day' tariffs. No network, no clock, no random
// input: two runs write byte-identical output.
//
// Output: $MAKEFUN_OUTPUT_DIR when set (the grader runs with a read-only
// repository and MAKEFUN_OUTPUT_DIR=/output), otherwise the working directory.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---- 5x7 bitmap glyphs ('#' = ink). Text is upper-cased before drawing. ----
type Glyph = string[];
const GLYPHS: Record<string, Glyph> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '...#.', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '.##..', '#....'],
  "'": ['..#..', '..#..', '..#..', '.....', '.....', '.....', '.....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '#....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...##', '..#..', '.#...', '.#...', '.#...', '..#..', '...##'],
  ')': ['##...', '..#..', '...#.', '...#.', '...#.', '..#..', '##...'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  '+': ['.....', '..#..', '..#..', '.###.', '..#..', '..#..', '.....'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '&': ['.###.', '#...#', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '=': ['.....', '.....', '.###.', '.....', '.###.', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.#.#.', '.....', '.....', '.....', '.....'],
  '*': ['.....', '.#.#.', '..#..', '.###.', '..#..', '.#.#.', '.....'],
  _: ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '<': ['....#', '...#.', '..#..', '.#...', '..#..', '...#.', '....#'],
  '>': ['#....', '.#...', '..#..', '...#.', '..#..', '.#...', '#....'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
};

const CW = 5; // glyph columns
const CH = 7; // glyph rows
const TRACK = 6; // glyph advance (5 + 1px tracking)

type RGB = [number, number, number];
const PAPER: RGB = [247, 242, 231];
const INK: RGB = [24, 24, 24];
const RED: RGB = [178, 34, 28];
const GREY: RGB = [110, 104, 94];
const PANEL: RGB = [222, 232, 239];
const BLUE: RGB = [42, 78, 120];

// ---- Minimal PNG writer (RGB, 8-bit, filter none, zlib level 9). ----
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const crcInput = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  out.writeUInt32BE(crc32(crcInput), 8 + data.length);
  return out;
}

function toPNG(rgb: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = truecolour RGB
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // no interlace
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter type: none
    rgb.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Drawing surface: an RGB framebuffer with small primitives. ----
class Sheet {
  data = Buffer.alloc(W * H * 3);

  constructor(bg: RGB) {
    for (let i = 0; i < W * H; i++) {
      this.data[i * 3] = bg[0];
      this.data[i * 3 + 1] = bg[1];
      this.data[i * 3 + 2] = bg[2];
    }
  }

  dot(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }

  fill(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.dot(xx, yy, c);
    }
  }

  rule(x: number, y: number, w: number, c: RGB, thick = 1): void {
    this.fill(x, y, w, thick, c);
  }

  frame(x: number, y: number, w: number, h: number, c: RGB, thick = 1): void {
    this.fill(x, y, w, thick, c);
    this.fill(x, y + h - thick, w, thick, c);
    this.fill(x, y, thick, h, c);
    this.fill(x + w - thick, y, thick, h, c);
  }

  // Bresenham line, for the chart baseline and accents.
  segment(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.dot(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  measure(s: string, scale: number): number {
    return s.length * TRACK * scale - scale;
  }

  drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
    const upper = s.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
      const glyph = GLYPHS[upper[i]] ?? GLYPHS[' '];
      const gx = x + i * TRACK * scale;
      for (let row = 0; row < CH; row++) {
        for (let col = 0; col < CW; col++) {
          if (glyph[row][col] === '#') {
            this.fill(gx + col * scale, y + row * scale, scale, scale, c);
          }
        }
      }
    }
  }

  drawCentred(s: string, cx: number, y: number, scale: number, c: RGB): void {
    this.drawText(s, cx - Math.floor(this.measure(s, scale) / 2), y, scale, c);
  }

  // Greedy word wrap on the upper-cased text.
  wrap(s: string, maxW: number, scale: number): string[] {
    const words = s.toUpperCase().split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const word of words) {
      const trial = cur === '' ? word : cur + ' ' + word;
      if (this.measure(trial, scale) <= maxW || cur === '') {
        cur = trial;
      } else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur !== '') lines.push(cur);
    return lines;
  }

  // Wrapped paragraph; returns the y just below its last line.
  paragraph(s: string, x: number, y: number, maxW: number, scale: number, c: RGB, gap = 2): number {
    const lines = this.wrap(s, maxW, scale);
    let yy = y;
    for (const line of lines) {
      this.drawText(line, x, yy, scale, c);
      yy += CH * scale + gap;
    }
    return yy;
  }
}

// ---- The front page: Thursday 26 November 2026 ----
interface Story {
  tag: string;
  head: string;
  deck: string;
}

function drawFrontPage(): Sheet {
  const cv = new Sheet(PAPER);

  // Outer frame.
  cv.frame(14, 14, 996, 996, INK, 4);

  // Masthead.
  cv.drawCentred('THE WORLD IN ONE PAGE', 512, 40, 5, INK);
  cv.rule(44, 92, 936, RED, 5);
  cv.drawCentred('THURSDAY 26 NOVEMBER 2026', 512, 106, 2, INK);
  cv.rule(44, 132, 936, INK, 3);

  // Lead kicker + headline.
  cv.drawText('TRADE - WASHINGTON', 48, 150, 2, RED);
  const headline = ['US TO RAISE', 'CHINA TARIFFS', 'BY 20% - TO 40%'];
  let hy = 178;
  for (const line of headline) {
    cv.drawText(line, 48, hy, 4, INK);
    hy += CH * 4 + 6;
  }

  // Lead deck, wrapped to the left column.
  const deckEnd = cv.paragraph(
    "Washington plans to raise tariffs on China by 20%, on top of the 25% levies from President Trump's first term. If the trade truce breaks, second-term tariffs could reach 40%. The move follows an eight-month USTR investigation and comes after the Supreme Court ruled the April 2025 'Liberation Day' tariffs illegal. Fourteen major trading partners face new tariff proposals.",
    48,
    296,
    540,
    2,
    INK,
    4,
  );

  // Tariff chart panel: three bars on a 0-40 scale.
  const px = 616;
  const py = 178;
  const pw = 360;
  const ph = 300;
  cv.fill(px, py, pw, ph, PANEL);
  cv.frame(px, py, pw, ph, INK, 3);
  cv.drawText('TARIFFS ON CHINA', px + 24, py + 18, 2, INK);
  const bars: Array<{ label: string; value: number; c: RGB }> = [
    { label: 'FIRST TERM - 25%', value: 25, c: BLUE },
    { label: 'NEW HIKE - +20%', value: 20, c: RED },
    { label: 'SECOND TERM - UP TO 40%', value: 40, c: INK },
  ];
  const barMax = 312;
  let by = py + 56;
  for (const bar of bars) {
    cv.drawText(bar.label, px + 24, by, 1, INK);
    const len = Math.round((bar.value / 40) * barMax);
    cv.fill(px + 24, by + 16, len, 30, bar.c);
    by += 64;
  }
  cv.drawText('SOURCE: USTR REPORT / REUTERS', px + 24, py + ph - 24, 1, GREY);

  // Divider under the lead block.
  const ruleY = Math.max(deckEnd, py + ph) + 18;
  cv.rule(48, ruleY, 928, INK, 3);
  cv.drawText('ALSO TODAY', 48, ruleY + 16, 2, RED);

  // Four more stories in a two-column grid.
  const stories: Story[] = [
    {
      tag: 'MARKETS',
      head: 'AI rout deepens on Wall Street',
      deck: 'The Nasdaq is down about 20% from its early-October record. Nvidia fell 3.9% to $149.30, some $2.3 trillion below its October peak, and the Philadelphia chip index is down 50% from its June record.',
    },
    {
      tag: 'ENERGY',
      head: 'Oil jumps as Gulf shipping hit',
      deck: "Houthi rebels claim a strike on Saudi Arabia's largest refinery and at least two ships were hit by Iranian mines in the Strait of Hormuz. Brent crude trades near $94.71 a barrel.",
    },
    {
      tag: 'ECONOMY',
      head: 'Bank of Korea lifts rates',
      deck: "South Korea's central bank raises its base rate by 25 basis points to 3.25% as chip exports boom.",
    },
    {
      tag: 'TECH',
      head: 'MiniMax user data exposed',
      deck: 'Data belonging to users of Chinese AI firm MiniMax was accessed by an unknown party, researcher Dragos HD Moore says.',
    },
  ];
  const colX = [48, 526];
  const colW = 448;
  const rowY = [ruleY + 48, ruleY + 168];
  stories.forEach((story, i) => {
    const x = colX[i % 2];
    const y = rowY[Math.floor(i / 2)];
    cv.drawText(story.tag, x, y, 1, RED);
    cv.paragraph(story.head, x, y + 14, colW, 2, INK, 3);
    cv.paragraph(story.deck, x, y + 58, colW, 1, INK, 2);
  });

  // Full-width strip: Thanksgiving.
  const stripY = ruleY + 288;
  cv.drawText('MARKETS', 48, stripY, 1, RED);
  cv.drawText('US MARKETS CLOSED FOR THANKSGIVING', 48, stripY + 14, 2, INK);
  cv.drawText(
    'US STOCK MARKETS ARE CLOSED ON THURSDAY FOR THE THANKSGIVING HOLIDAY.',
    48,
    stripY + 40,
    1,
    INK,
  );

  // By the numbers: four stat boxes.
  const numY = stripY + 72;
  cv.drawText('BY THE NUMBERS', 48, numY, 2, RED);
  const stats: Array<{ big: string; small: string }> = [
    { big: '40%', small: 'SECOND-TERM CAP' },
    { big: '25%', small: 'FIRST-TERM LEVIES' },
    { big: '$94.71', small: 'BRENT CRUDE' },
    { big: '3.25%', small: 'BANK OF KOREA RATE' },
  ];
  const boxW = 226;
  const boxH = 64;
  const boxY = numY + 26;
  stats.forEach((stat, i) => {
    const bx = 48 + i * (boxW + 8);
    cv.fill(bx, boxY, boxW, boxH, PANEL);
    cv.frame(bx, boxY, boxW, boxH, INK, 2);
    cv.drawCentred(stat.big, bx + boxW / 2, boxY + 10, 3, INK);
    cv.drawCentred(stat.small, bx + boxW / 2, boxY + 42, 1, GREY);
  });

  // Footer.
  const footY = boxY + boxH + 18;
  cv.rule(48, footY, 928, INK, 2);
  cv.drawCentred(
    'ALL STORIES FIRST REPORTED THURSDAY 26 NOVEMBER 2026 - SOURCES: REUTERS',
    512,
    footY + 14,
    1,
    GREY,
  );

  return cv;
}

function main(): void {
  // The grader runs with a read-only repo and MAKEFUN_OUTPUT_DIR=/output, so
  // write there when it is set; local runs keep the file next to the code.
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || process.cwd();
  mkdirSync(outDir, { recursive: true });
  const png = toPNG(drawFrontPage().data);
  const outPath = join(outDir, 'news-image-20261126.png');
  writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${png.length} bytes)`);
}

main();
