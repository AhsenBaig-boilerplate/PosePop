// Builds dist/ for static hosting (GitHub Pages).
//  - Every asset gets a content hash in its file name, so it can be cached forever.
//  - index.html gets the hashed names, Subresource Integrity hashes and a build id.
//  - A strict Content-Security-Policy is generated from hashes of the inline script and style.
//  - version.json tells running pages which build is current, so they update themselves.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");
const font = (pkg, file) => [`node_modules/@fontsource/${pkg}/files/${file}`, `fonts/${file}`];

// TF.js graph models: the binary weights first, then the JSON rewritten to point at the weights'
// hashed names, so the JSON's own hash (and SRI) also covers which weights it loads.
const model = (name) => [
  [`src/models/${name}.bin`, `models/${name}.bin`],
  [`src/models/${name}.json`, `models/${name}.json`, (buf) => {
    const json = JSON.parse(buf);
    if (json.weightsManifest.length !== 1 || json.weightsManifest[0].paths.length !== 1)
      throw new Error(`src/models/${name}.json has several weight shards; give each shard its own ASSETS entry`);
    const bin = manifest[`models/${name}.bin`].file.split("/").pop();
    for (const group of json.weightsManifest) group.paths = [bin];
    return Buffer.from(JSON.stringify(json));
  }],
];

// [source path, logical path used in src/index.html, optional transform]
const ASSETS = [
  ["node_modules/three/build/three.min.js", "vendor/three.min.js"],
  ["node_modules/@tensorflow/tfjs/dist/tf.min.js", "vendor/tf.min.js"],
  // detection code; detect-worker.js must stay at the root, next to index.html (see the file)
  ["src/detect.js", "detect.js"],
  ["src/detect-worker.js", "detect-worker.js"],
  ...model("selfie"),
  ...model("people"),
  ["src/favicon.svg", "favicon.svg"],
  ["src/thumbs/plains.jpg", "thumbs/plains.jpg"],
  ["src/thumbs/village.jpg", "thumbs/village.jpg"],
  ["src/thumbs/mountains.jpg", "thumbs/mountains.jpg"],
  ["src/thumbs/taiga.jpg", "thumbs/taiga.jpg"],
  ["src/thumbs/desert.jpg", "thumbs/desert.jpg"],
  ["src/thumbs/beach.jpg", "thumbs/beach.jpg"],
  ["src/thumbs/nether.jpg", "thumbs/nether.jpg"],
  ["src/thumbs/end.jpg", "thumbs/end.jpg"],
  font("pixelify-sans", "pixelify-sans-latin-500-normal.woff2"),
  font("pixelify-sans", "pixelify-sans-latin-700-normal.woff2"),
  font("ibm-plex-sans", "ibm-plex-sans-latin-400-normal.woff2"),
  font("ibm-plex-sans", "ibm-plex-sans-latin-500-normal.woff2"),
  font("ibm-plex-sans", "ibm-plex-sans-latin-600-normal.woff2"),
  font("ibm-plex-mono", "ibm-plex-mono-latin-400-normal.woff2"),
  font("ibm-plex-mono", "ibm-plex-mono-latin-500-normal.woff2"),
];

const digest = (alg, data, enc) => createHash(alg).update(data).digest(enc);
const hashedName = (path, hash) => path.replace(/(\.[^./]+)$/, `.${hash}$1`);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const manifest = {};
for (const [src, logical, transform] of ASSETS) {
  const raw = readFileSync(join(root, src)), buf = transform ? transform(raw) : raw;
  const file = hashedName(logical, digest("sha256", buf, "hex").slice(0, 12));
  mkdirSync(dirname(join(out, file)), { recursive: true });
  writeFileSync(join(out, file), buf);
  manifest[logical] = { file, sri: `sha384-${digest("sha384", buf, "base64")}`, bytes: buf.length };
}

const lookup = (where, kind) => (_, logical) => {
  const entry = manifest[logical];
  if (!entry) throw new Error(`${where} references unknown asset "${logical}"`);
  return kind === "file" ? entry.file : entry.sri;
};
const fill = (text, where) => text.replace(/__ASSET:([A-Za-z0-9._/-]+)__/g, lookup(where, "file")).replace(/__SRI:([A-Za-z0-9._/-]+)__/g, lookup(where, "sri"));

// The app: src/app/*.js joined in file-name order into one scope (one file per section of the app), then hashed
// like any asset. Build facts (id, time, version) are <meta> tags in the page, not in here, so this file's hash
// only changes when the code does.
const parts = readdirSync(join(root, "src/app")).filter((f) => /^\d{3}-[a-z0-9-]+\.js$/.test(f)).sort();
const app = Buffer.from(fill(`(() => {\n"use strict";\n${parts.map((f) => readFileSync(join(root, "src/app", f), "utf8")).join("")}})();\n`, "src/app"));
{
  const file = hashedName("app.js", digest("sha256", app, "hex").slice(0, 12));
  writeFileSync(join(out, file), app);
  manifest["app.js"] = { file, sri: `sha384-${digest("sha384", app, "base64")}`, bytes: app.length, parts };
}

let html = fill(readFileSync(join(root, "src/index.html"), "utf8"), "src/index.html");

let commit = process.env.GITHUB_SHA || "";
if (!commit) {
  try { commit = execSync("git rev-parse HEAD", { cwd: root }).toString().trim(); } catch { commit = "local"; }
}
// Build id: the commit, then a hash that changes only when the shipped page or an asset changes.
// The build time is filled in after hashing, so it never changes the id.
const contentHash = digest("sha256", html + JSON.stringify(manifest), "hex").slice(0, 12);
const build = `${commit.slice(0, 7)}-${contentHash}`;
const builtAt = new Date().toISOString();
// Version label: package.json's version when this commit carries its signed tag (v1.2.0), otherwise
// "1.2.0+abc1234" for a build of main between releases. Filled in after hashing, like the build time.
const pkgVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
let tagged = false;
try { tagged = execSync(`git tag --points-at ${commit}`, { cwd: root }).toString().split("\n").includes(`v${pkgVersion}`); } catch {}
const version = tagged ? pkgVersion : `${pkgVersion}+${commit.slice(0, 7)}`;
html = html.replaceAll("__BUILD_ID__", build).replaceAll("__BUILT_AT__", builtAt).replaceAll("__VERSION__", version);

// CSP: no third-party origins, no eval, no inline code except the exact blocks we ship.
const inline = (re) => [...html.matchAll(re)].map((m) => `'sha256-${digest("sha256", m[1], "base64")}'`);
const scriptHashes = inline(/<script>([\s\S]*?)<\/script>/g);
const styleHashes = inline(/<style>([\s\S]*?)<\/style>/g);
const csp = [
  "default-src 'none'",
  ["script-src 'self'", ...scriptHashes].join(" "), // no inline scripts any more, so normally just 'self'
  `style-src 'self' ${styleHashes.join(" ")}`,
  "img-src 'self' blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");
html = html.replace("__CSP__", csp);

writeFileSync(join(out, "index.html"), html);
// The service worker keeps a fixed name (browsers check it for changes); its build id changes it every deploy.
const precache = Object.values(manifest).map(({ file, sri }) => ({ url: file, integrity: sri }));
writeFileSync(join(out, "sw.js"), readFileSync(join(root, "src/sw.js"), "utf8")
  .replace("__BUILD_ID__", build).replace("__PRECACHE__", JSON.stringify(precache)));
writeFileSync(join(out, "version.json"), JSON.stringify({ version, build, commit, builtAt }, null, 2) + "\n");
// Latest only; scripts/releases.mjs replaces it with the full list on deploys.
writeFileSync(join(out, "releases.json"), JSON.stringify({ latest: { version, build }, releases: [] }, null, 2) + "\n");
writeFileSync(join(out, "asset-manifest.json"), JSON.stringify({ build, assets: manifest }, null, 2) + "\n");
writeFileSync(join(out, ".nojekyll"), "");
console.log(`Built ${build}: ${Object.keys(manifest).length} assets, ${scriptHashes.length} inline script, ${styleHashes.length} inline style`);
