// Builds dist/ for static hosting (GitHub Pages).
//  - Every asset gets a content hash in its file name, so it can be cached forever.
//  - index.html gets the hashed names, Subresource Integrity hashes and a build id.
//  - A strict Content-Security-Policy is generated from hashes of the inline script and style.
//  - version.json tells running pages which build is current, so they update themselves.
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  ...model("selfie"),
  ...model("people"),
  ["src/favicon.svg", "favicon.svg"],
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

let html = readFileSync(join(root, "src/index.html"), "utf8");
const lookup = (kind) => (_, logical) => {
  const entry = manifest[logical];
  if (!entry) throw new Error(`src/index.html references unknown asset "${logical}"`);
  return kind === "file" ? entry.file : entry.sri;
};
html = html.replace(/__ASSET:([A-Za-z0-9._/-]+)__/g, lookup("file")).replace(/__SRI:([A-Za-z0-9._/-]+)__/g, lookup("sri"));

let commit = process.env.GITHUB_SHA || "";
if (!commit) {
  try { commit = execSync("git rev-parse HEAD", { cwd: root }).toString().trim(); } catch { commit = "local"; }
}
// The build id changes whenever the shipped page or any asset changes, and not otherwise.
const contentHash = digest("sha256", html + JSON.stringify(manifest), "hex").slice(0, 12);
const build = `${commit.slice(0, 7)}-${contentHash}`;
html = html.replaceAll("__BUILD_ID__", build);

// CSP: no third-party origins, no eval, no inline code except the exact blocks we ship.
const inline = (re) => [...html.matchAll(re)].map((m) => `'sha256-${digest("sha256", m[1], "base64")}'`);
const scriptHashes = inline(/<script>([\s\S]*?)<\/script>/g);
const styleHashes = inline(/<style>([\s\S]*?)<\/style>/g);
const csp = [
  "default-src 'none'",
  `script-src 'self' ${scriptHashes.join(" ")}`,
  `style-src 'self' ${styleHashes.join(" ")}`,
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");
html = html.replace("__CSP__", csp);

writeFileSync(join(out, "index.html"), html);
writeFileSync(join(out, "version.json"), JSON.stringify({ build, commit, builtAt: new Date().toISOString() }, null, 2) + "\n");
writeFileSync(join(out, "asset-manifest.json"), JSON.stringify({ build, assets: manifest }, null, 2) + "\n");
writeFileSync(join(out, ".nojekyll"), "");
console.log(`Built ${build}: ${Object.keys(manifest).length} assets, ${scriptHashes.length} inline script, ${styleHashes.length} inline style`);
