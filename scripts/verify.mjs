// Release gate for dist/: fails the build if the page could break or loosen its security.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const errors = [];
const fail = (msg) => errors.push(msg);
const digest = (alg, data) => createHash(alg).update(data).digest("base64");

const html = readFileSync(join(dist, "index.html"), "utf8");
const version = JSON.parse(readFileSync(join(dist, "version.json"), "utf8"));
const { assets } = JSON.parse(readFileSync(join(dist, "asset-manifest.json"), "utf8"));

// 1. No placeholders left behind.
for (const token of ["__ASSET:", "__SRI:", "__BUILD_ID__", "__CSP__"]) if (html.includes(token)) fail(`placeholder ${token} left in index.html`);

// 2. Build ids agree.
const meta = html.match(/<meta name="build" content="([^"]+)">/)?.[1];
if (meta !== version.build) fail(`index.html build ${meta} != version.json build ${version.build}`);
if (!html.includes(`const BUILD="${version.build}"`)) fail("inline BUILD constant does not match version.json");

// 3. Every asset exists and still matches its integrity hash.
for (const [logical, { file, sri }] of Object.entries(assets)) {
  const path = join(dist, file);
  if (!existsSync(path)) { fail(`missing ${file} (${logical})`); continue; }
  if (`sha384-${digest("sha384", readFileSync(path))}` !== sri) fail(`integrity mismatch for ${file}`);
  if (!html.includes(file)) fail(`${file} is built but never referenced`);
}

// 4. Every <script src> carries SRI, and nothing loads from another origin.
for (const [tag] of html.matchAll(/<script\b[^>]*\bsrc=[^>]*>/g)) if (!/\bintegrity="sha384-/.test(tag)) fail(`script without integrity: ${tag}`);
for (const m of html.matchAll(/\b(?:src|href)="(https?:)?\/\//g)) fail(`external resource reference: ${m[0]}`);
if (/@import|fonts\.googleapis|cdnjs|jsdelivr|unpkg/.test(html)) fail("third-party CDN reference found");

// 5. CSP is present, strict, and its hashes match the inline blocks.
const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] || "";
if (!csp) fail("Content-Security-Policy meta tag missing");
for (const bad of ["'unsafe-inline'", "'unsafe-eval'", "*", "http:", "https:"]) if (csp.split(/[\s;]+/).includes(bad)) fail(`CSP allows ${bad}`);
for (const [re, kind] of [[/<script>([\s\S]*?)<\/script>/g, "script"], [/<style>([\s\S]*?)<\/style>/g, "style"]])
  for (const m of html.matchAll(re)) if (!csp.includes(`'sha256-${digest("sha256", m[1])}'`)) fail(`inline ${kind} hash not in CSP`);
if (/\sstyle="/.test(html)) fail("inline style attribute found (blocked by CSP)");
if (/\son[a-z]+="/.test(html)) fail("inline event handler attribute found (blocked by CSP)");

if (errors.length) { console.error(`dist/ failed verification:\n - ${errors.join("\n - ")}`); process.exit(1); }
console.log(`dist/ verified: build ${version.build}, ${Object.keys(assets).length} assets, CSP and SRI intact`);
