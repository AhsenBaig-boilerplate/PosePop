// CHANGELOG.md feeds the in-app release notes and the version picker's headlines (via releases.json).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readChangelog, notesFor } from "../../scripts/changelog.mjs";

const root = new URL("../../", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const log = readChangelog(new URL("CHANGELOG.md", root));

const fromText = text => {
  const f = join(mkdtempSync(join(tmpdir(), "posepop-")), "CHANGELOG.md");
  writeFileSync(f, text);
  return readChangelog(f);
};

test("the package version has a dated changelog entry with a headline", () => {
  const e = log[pkg.version];
  assert.ok(e, `CHANGELOG.md has no "## ${pkg.version} (…)" section`);
  assert.match(e.date, /^\d{1,2} [A-Z][a-z]+ \d{4}$/); // "26 October 2026"
  assert.match(e.notes[0] || "", /^\*\*[^*]+\*\*/, "the first note should start with **Headline:**");
});

test("every release entry has a short headline and no HTML", () => {
  for (const [v, e] of Object.entries(log)) {
    if (v === "unreleased" && !e.notes.length) continue;
    assert.ok(e.headline.length > 0 && e.headline.length <= 40, `${v}: headline "${e.headline}" should be short`);
    for (const n of e.notes) assert.doesNotMatch(n.replace(/`[^`]*`/g, ""), /<[a-z/!]/i, `${v}: notes are drawn as text, so HTML outside \`code\` would show as-is`);
  }
});

test("parses versions, dates, bullets and the bold headline", () => {
  const l = fromText("# Changelog\n\n## Unreleased\n\n## 2.0.0 (2 January 2026)\n\n- **Big thing:** it works.\n- Second `note`.\n\n## 1.0.0 (1 December 2025)\n\nFirst release, by paragraph.\n");
  assert.deepEqual(l["2.0.0"], { date: "2 January 2026", notes: ["**Big thing:** it works.", "Second `note`."], headline: "Big thing" });
  assert.equal(l["1.0.0"].headline, "First release, by paragraph");
  assert.deepEqual(l.unreleased.notes, []);
});

test("notesFor: a release gets its own notes; main between releases gets Unreleased", () => {
  const l = fromText("## Unreleased\n\n- **Next:** soon.\n\n## 1.0.0 (1 December 2025)\n\n- **One:** done.\n");
  assert.equal(notesFor(l, "1.0.0").headline, "One");
  assert.deepEqual(notesFor(l, "1.0.0+abc1234"), { date: "", notes: ["**Next:** soon."], headline: "Next" });
  assert.equal(notesFor(fromText("## 1.0.0 (1 December 2025)\n\n- **One:** done.\n"), "1.0.0+abc1234").headline, "One");
  assert.deepEqual(notesFor(l, "9.9.9"), { date: "", headline: "", notes: [] });
});
