// The app's colour maths, clustering, dithering, screen detection and world sizing (src/app/007-pure-functions.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { pure } from "./pure.mjs";

const { rng, toLab, deltaE00, kmeans, keyColor, errorDiffuse, sceneBucket, SCENE_BUCKET, SCENE_ASPECT_STEP, pegboards, brickRuns } = pure;
const close = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} is not within ${tol} of ${b}`);

test("rng is seeded and repeatable, in [0, 1)", () => {
  const a = rng(42), b = rng(42), xs = Array.from({ length: 1000 }, a);
  assert.deepEqual(xs.slice(0, 5), Array.from({ length: 5 }, b));
  assert.ok(xs.every(x => x >= 0 && x < 1));
  assert.notEqual(rng(1)(), rng(2)());
});

test("toLab: sRGB to CIELAB (D65) on reference colours", () => {
  for (const [rgb, lab] of [
    [[255, 255, 255], [100, 0, 0]], [[0, 0, 0], [0, 0, 0]],
    [[255, 0, 0], [53.24, 80.09, 67.20]], [[0, 255, 0], [87.73, -86.18, 83.18]], [[0, 0, 255], [32.30, 79.19, -107.86]],
    [[128, 128, 128], [53.59, 0, 0]],
  ]) toLab(...rgb).forEach((v, i) => close(v, lab[i], 0.05, `toLab(${rgb})[${i}]`));
});

test("deltaE00 matches Sharma, Wu & Dalal's published test pairs", () => {
  for (const [x, y, e] of [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
    [[50, 2.8361, -74.0200], [50, 0, -82.7485], 3.4412],
    [[50, 0, 0], [50, -1, 2], 2.3669],
    [[50, 2.5, 0], [73, 25, -18], 27.1492],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[2.0776, 0.0795, -1.1350], [0.9033, -0.0636, -0.5514], 0.9082],
  ]) { close(deltaE00(x, y), e, 1e-4, `ΔE00 ${x} → ${y}`); close(deltaE00(y, x), e, 1e-4, "ΔE00 is symmetric"); }
  assert.equal(deltaE00([40, 10, -5], [40, 10, -5]), 0);
});

test("kmeans finds well-separated clusters, deterministically", () => {
  const centres = [[20, 0, 0], [60, 40, -20], [90, -30, 60]], r = rng(7), pts = [];
  for (const c of centres) for (let i = 0; i < 50; i++) pts.push(...c.map(v => v + (r() - .5) * 4));
  const C = kmeans(new Float64Array(pts), 3, 10);
  assert.equal(C.length, 3);
  for (const c of centres) assert.ok(C.some(k => Math.hypot(k[0] - c[0], k[1] - c[1], k[2] - c[2]) < 2), `a centre near ${c}`);
  assert.deepEqual(kmeans(new Float64Array(pts), 3, 10), C);
  assert.deepEqual(kmeans(new Float64Array(0), 3, 10), []);
  assert.equal(kmeans(new Float64Array([1, 2, 3, 1, 2, 3]), 5, 4).length, 1); // never more centres than distinct points
});

// RGBA pixels: `share` of them the screen colour, the rest a mid grey with a person-ish skin tone mixed in
const photo = (screen, share, n = 16 * 400) => {
  const d = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) d.set(i / n < share ? [...screen, 255] : i % 2 ? [128, 128, 128, 255] : [205, 150, 120, 255], i * 4);
  return d;
};

test("keyColor finds a green or blue screen, and nothing else", () => {
  const g = keyColor(photo([40, 200, 60], .5));
  assert.equal(g.main, 1);
  assert.deepEqual(g.rgb, [40, 200, 60]);
  assert.equal(keyColor(photo([30, 80, 220], .5)).main, 2);
  assert.equal(keyColor(photo([128, 128, 128], 1)), null, "grey is never a screen");
  assert.equal(keyColor(photo([220, 40, 40], .6)), null, "red would cut into people");
  assert.equal(keyColor(photo([40, 200, 60], pure.KEY_MIN_COVER / 2)), null, "too little of the photo to be a screen");
});

test("errorDiffuse: plain nearest colour without dither; dithering mixes colours to match the average", () => {
  const pal = [{ avg: [0, 0, 0] }, { avg: [255, 255, 255] }], near = (r, g, b) => (r + g + b) / 3 < 128 ? 0 : 1, w = 16, h = 16;
  const grey = new Uint8ClampedArray(w * h * 4).fill(100);
  const flat = errorDiffuse(grey, w, h, false, near, pal);
  assert.ok(flat.every(v => v === 0));
  const mixed = errorDiffuse(grey, w, h, true, near, pal), white = mixed.reduce((n, v) => n + v, 0) / (w * h);
  assert.ok(white > .1 && white < .5, `about 100/255 of cells white, got ${white.toFixed(2)}`);
  assert.deepEqual(errorDiffuse(grey, w, h, true, near, pal), mixed);
});

test("sceneBucket: coarse render sizes, bottom-aligned crops, never stretched", () => {
  for (const [W, H] of [[600, 900], [601, 899], [1095, 2304], [1200, 1800], [900, 900], [1800, 600], [3, 7], [4500, 1100]]) {
    const b = sceneBucket(W, H), long = Math.max(b.Wb, b.Hb);
    assert.equal(long % SCENE_BUCKET, 0, `${W}×${H}: long side ${long} is a bucket multiple`);
    assert.ok(long >= Math.max(W, H) && long - Math.max(W, H) < SCENE_BUCKET, `${W}×${H}: bucket ${long} covers the long side`);
    close(b.sw / b.sh, W / H, 1e-9, `${W}×${H}: crop keeps the aspect (no stretch)`);
    assert.ok(b.sw <= b.Wb + 1e-9 && b.sh <= b.Hb + 1e-9 && b.sx >= -1e-9, `${W}×${H}: crop inside the render`);
    close(b.sy + b.sh, b.Hb, 1e-9, `${W}×${H}: crop is bottom aligned`);
    close(b.sx, (b.Wb - b.sw) / 2, 1e-9, `${W}×${H}: crop is centred across`);
  }
  // nearby sizes share one render, so changing the detail or crop doesn't redraw the world
  const a = sceneBucket(1095, 2304), b = sceneBucket(1110, 2290);
  assert.deepEqual([a.Wb, a.Hb], [b.Wb, b.Hb]);
  assert.ok(SCENE_ASPECT_STEP > 0);
});

test("pegboards: boards tiled from the beads' corner, empty ones not counted", () => {
  const grid = (w, h, on) => { const c = new Array(w * h).fill(-1); for (const [x, y] of on) c[y * w + x] = 3; return c; };
  assert.deepEqual(pegboards(grid(10, 10, []), 10, 10, 4), { cols: 0, rows: 0, boards: 0 });
  // one bead anywhere: one board
  assert.deepEqual(pegboards(grid(10, 10, [[7, 2]]), 10, 10, 4), { cols: 1, rows: 1, boards: 1 });
  // 4 × 4 beads starting at (3, 5) fit one 4-peg board exactly; one more bead to the right needs a second
  const sq = []; for (let y = 5; y < 9; y++) for (let x = 3; x < 7; x++) sq.push([x, y]);
  assert.deepEqual(pegboards(grid(12, 12, sq), 12, 12, 4), { cols: 1, rows: 1, boards: 1 });
  assert.deepEqual(pegboards(grid(12, 12, [...sq, [7, 5]]), 12, 12, 4), { cols: 2, rows: 1, boards: 2 });
  // opposite corners of a 3 × 3 tiling: two boards used out of nine
  assert.deepEqual(pegboards(grid(9, 9, [[0, 0], [8, 8]]), 9, 9, 3), { cols: 3, rows: 3, boards: 2 });
  // a typical figure: 40 wide × 70 tall on 29-peg boards → 2 × 3
  const fig = []; for (let y = 0; y < 70; y++) for (let x = 0; x < 40; x++) fig.push([x + 5, y + 2]);
  assert.deepEqual(pegboards(grid(64, 80, fig), 64, 80, 29), { cols: 2, rows: 3, boards: 6 });
});

test("brickRuns: each row's runs of one colour as the fewest 1 × n bricks", () => {
  const S = [8, 6, 4, 3, 2, 1];
  // one row: 5 reds, an empty cell, 9 reds, then 2 blues; a run ends at the row's end and never wraps to the next row
  const row = [0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1];
  assert.deepEqual(brickRuns(row, 17, 1, S), { 0: [1, 0, 1, 0, 0, 2], 1: [0, 0, 0, 0, 1, 0] });
  assert.deepEqual(brickRuns([2, 2, 2, 2], 2, 2, S), { 2: [0, 0, 0, 0, 2, 0] });
  // the white border (-2) and empty cells (-1) take no bricks
  assert.deepEqual(brickRuns([-2, -1, -2], 3, 1, S), {});
  // longest first is the fewest bricks for every run length up to 64 (checked against a search over all cuts)
  const best = [0]; for (let n = 1; n <= 64; n++) best[n] = Math.min(...S.filter(s => s <= n).map(s => best[n - s] + 1));
  for (let n = 1; n <= 64; n++) {
    const k = brickRuns(new Array(n).fill(4), n, 1, S)[4];
    assert.equal(k.reduce((a, b, i) => a + b * S[i], 0), n, `a run of ${n} is covered exactly`);
    assert.equal(k.reduce((a, b) => a + b, 0), best[n], `a run of ${n} takes ${best[n]} bricks`);
  }
});
