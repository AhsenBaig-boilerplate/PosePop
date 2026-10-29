// The pure parts of src/detect.js, loaded on their own in a bare vm (tf.js and canvases are only touched when it runs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = vm.createContext({});
context.self = context;
vm.runInContext(readFileSync(new URL("../../src/detect.js", import.meta.url), "utf8"), context, { filename: "detect.js" });
const extendLegs = people => structuredClone(context.PosePopDetect.extendLegs(people));

// a person from a box: shoulders a third of the way across, legs found or not
const person = (x0, x1, y0, y1, legs) => {
  const kp = Array.from({ length: 17 }, () => ({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, s: .1 }));
  const w = x1 - x0;
  kp[5] = { x: x1 - w / 3, y: y0 + 40, s: .8 }; kp[6] = { x: x0 + w / 3, y: y0 + 40, s: .8 };
  if (legs) for (const i of [13, 14, 15, 16]) kp[i] = { x: (x0 + x1) / 2, y: y1 - 10, s: .7 };
  return { x0, x1, y0, y1, kp };
};

test("extendLegs: a person whose legs weren't found reaches the floor of the people beside them", () => {
  // group6.jpg: the middle person's box stopped at the waist, between two full-length neighbours
  const left = person(140, 730, 30, 1250, true), mid = person(630, 980, 120, 740, false), right = person(930, 1450, 150, 1240, true);
  const [l, m, r] = extendLegs([left, mid, right]);
  assert.equal(m.y1, 1250, "down to the lowest found floor");
  assert.equal(m.h0, 620, "and remembers the height that was found");
  assert.deepEqual([m.x0, m.x1, m.y0], [630, 980, 120], "nothing else changes");
  assert.deepEqual([l, r], structuredClone([left, right]), "people with legs are left alone");
});

test("extendLegs: no change when someone stands in front, when nobody's legs were found, or when everyone's were", () => {
  // back row behind a person in front (group7.jpg): their legs are hidden, not missing
  const back = person(400, 700, 20, 500, false), front = person(380, 720, 300, 1200, true);
  assert.equal(extendLegs([back, front])[0].y1, 500);
  // head-and-shoulders shots: nobody's legs, nothing to line up with
  const a = person(0, 300, 0, 400, false), b = person(320, 600, 10, 420, false);
  assert.deepEqual(extendLegs([a, b]), structuredClone([a, b]));
  // everyone full length
  const c = person(0, 300, 0, 900, true), d = person(320, 600, 10, 880, true);
  assert.deepEqual(extendLegs([c, d]), structuredClone([c, d]));
  // a single person
  assert.deepEqual(extendLegs([a]), structuredClone([a]));
});
