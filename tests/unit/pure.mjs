// Loads the app's pure functions (src/app/005-random-noise.js and 007-pure-functions.js) on their own in a bare
// vm context: no window, no document, no app state. Anything in them that reached for the page would throw here.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const FILES = ["005-random-noise.js", "007-pure-functions.js"];
const NAMES = ["rng", "hash", "fbm", "ramp", "lin", "toLab", "deltaE00", "kmeans", "ycc", "keyColor", "KEY_MIN_COVER", "errorDiffuse",
  "sceneBucket", "SCENE_BUCKET", "SCENE_ASPECT_STEP"];

const src = FILES.map(f => readFileSync(new URL(`../../src/app/${f}`, import.meta.url), "utf8")).join("\n");
const context = vm.createContext({});
vm.runInContext(`"use strict";\n${src}\nglobalThis.__pure = { ${NAMES.join(", ")} };`, context, { filename: "pure-functions.js" });
// results come back through structuredClone, so arrays have this realm's prototypes and compare normally
export const pure = Object.fromEntries(Object.entries(context.__pure).map(([k, v]) =>
  [k, typeof v === "function" && k !== "rng" ? (...a) => structuredClone(v(...a)) : v]));
