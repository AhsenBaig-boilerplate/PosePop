// Publishes every release next to the latest build, so an event can pin a known-good version:
//   dist/                 latest (main), built by build.mjs, updates itself as usual
//   dist/v/<version>/     each signed v* tag, built from its own source and lockfile; never auto-updates
//   dist/releases.json    the list the app's Version picker reads
// Run after build.mjs (CI runs it on every deploy). Each tag is built in a temporary git worktree.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { notesFor, readChangelog } from "./changelog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const git = (...args) => execFileSync("git", args, { cwd: root }).toString().trim();
if (!existsSync(join(dist, "version.json"))) throw new Error("run build.mjs first");

const semver = (t) => t.slice(1).split(".").map(Number);
const tags = git("tag", "--list", "v*").split("\n").filter((t) => /^v\d+\.\d+\.\d+$/.test(t))
  .sort((a, b) => { const x = semver(a), y = semver(b); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]; });

// release notes come from the current CHANGELOG.md, so later corrections reach older releases too
const log = readChangelog(join(root, "CHANGELOG.md"));
const releases = [];
for (const tag of tags) {
  const version = tag.slice(1), commit = git("rev-list", "-n", "1", tag), date = git("log", "-1", "--format=%cs", tag);
  const tmp = mkdtempSync(join(tmpdir(), "posepop-release-"));
  try {
    git("worktree", "add", "--detach", tmp, commit);
    execFileSync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: tmp, stdio: "ignore" });
    execFileSync("node", ["scripts/build.mjs"], { cwd: tmp, stdio: "ignore", env: { ...process.env, GITHUB_SHA: commit } });
    const out = join(dist, "v", version);
    cpSync(join(tmp, "dist"), out, { recursive: true });
    const { build } = JSON.parse(readFileSync(join(out, "version.json"), "utf8"));
    const { headline, notes } = notesFor(log, version);
    releases.push({ version, date, commit, build, path: `v/${version}/`, headline, notes });
    console.log(`release ${version} (${date}) → dist/v/${version}/ build ${build}`);
  } finally {
    try { git("worktree", "remove", "--force", tmp); } catch {}
    rmSync(tmp, { recursive: true, force: true });
  }
}
const latest = JSON.parse(readFileSync(join(dist, "version.json"), "utf8"));
writeFileSync(join(dist, "releases.json"), JSON.stringify({ latest: { version: latest.version, build: latest.build, ...notesFor(log, latest.version) }, releases }, null, 2) + "\n");
console.log(`releases.json: latest ${latest.version} and ${releases.length} release(s)`);
