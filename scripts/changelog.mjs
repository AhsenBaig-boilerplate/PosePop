// Reads CHANGELOG.md into { "<version>" | "unreleased": { date, headline, notes: [text] } } for releases.json.
// Notes stay plain text with **bold** and `code` marks; the app draws them as text (never as HTML).
import { readFileSync } from "node:fs";
export function readChangelog(path) {
  const out = {}; let cur = null;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const h = line.match(/^## (Unreleased|\d+\.\d+\.\d+)(?: \(([^)]*)\))?\s*$/);
    if (h) { cur = out[h[1] === "Unreleased" ? "unreleased" : h[1]] = { date: h[2] || "", notes: [] }; continue; }
    if (/^## /.test(line)) { cur = null; continue; }
    if (cur && /^- /.test(line)) cur.notes.push(line.slice(2).trim());
    else if (cur && line.trim() && !/^\s/.test(line)) cur.notes.push(line.trim()); // a paragraph instead of a list
  }
  for (const v of Object.values(out)) {
    const first = v.notes[0] || "", bold = first.match(/^\*\*([^*]+?):?\*\*/);
    v.headline = bold ? bold[1].replace(/:$/, "") : first.replace(/[*`]/g, "").split(/[.:;(]/)[0].split(" ").slice(0, 7).join(" ").trim();
  }
  return out;
}
// notes for a build labelled "1.4.0" (a release) or "1.4.0+abc1234" (main between releases)
export function notesFor(log, version) {
  const base = version.split("+")[0];
  return version.includes("+") && log.unreleased?.notes.length ? { ...log.unreleased, date: "" } : log[base] || { date: "", headline: "", notes: [] };
}
