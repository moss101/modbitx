/**
 * Proves the map check rejects a dishonest map. Each case edits a temporary copy of
 * parity/surfaces.json, runs scripts/parity-check.cjs against that copy, and expects a
 * non-zero exit. The repository's own map is never touched.
 *
 *   node scripts/parity-negative.cjs
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MAP = path.join(ROOT, "parity", "surfaces.json");
const original = JSON.parse(fs.readFileSync(MAP, "utf8"));

const failures = [];
const shown = (name, ok, detail) => {
  if (!ok) failures.push(name);
  console.log(`${ok ? "pass" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

function runWith(mutate) {
  const copy = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "parity-negative-")), "surfaces.json");
  const map = JSON.parse(JSON.stringify(original));
  mutate(map);
  fs.writeFileSync(copy, JSON.stringify(map, null, 2));
  try {
    execFileSync("node", [path.join(__dirname, "parity-check.cjs")], {
      encoding: "utf8",
      cwd: ROOT,
      env: { ...process.env, SURFACES_FILE: copy }
    });
    return { status: 0 };
  } catch (error) {
    return { status: error.status ?? 1, output: String(error.stdout || "") };
  } finally {
    fs.rmSync(path.dirname(copy), { recursive: true, force: true });
  }
}

const cases = [
  ["a partial with an empty limit is rejected", (map) => { map.surfaces.find((entry) => entry.status === "partial").limit = ""; }],
  ["a partial with no evidence pointer is rejected", (map) => { delete map.surfaces.find((entry) => entry.status === "partial").evidence; }],
  ["a covered surface pointing at a missing script is rejected", (map) => { map.surfaces.find((entry) => entry.status === "covered").evidence = "scripts/does-not-exist.cjs"; }],
  ["a covered surface pointing at a script without the mode is rejected", (map) => { map.surfaces.find((entry) => entry.status === "covered").evidence = "scripts/parity-check.cjs nosuchmode"; }],
  ["a surface left missing is rejected", (map) => { map.surfaces[0].status = "missing"; }],
  ["a deferral with no reason is rejected", (map) => { map.surfaces.find((entry) => entry.status === "deferred").note = ""; }],
  ["a surface the bundle names, dropped from the map, is rejected", (map) => { map.surfaces = map.surfaces.filter((entry) => !/billing|account/i.test(`${entry.id} ${entry.name}`)); }]
];

for (const [name, mutate] of cases) {
  const result = runWith(mutate);
  shown(name, result.status !== 0, `exit ${result.status}`);
}

const clean = runWith(() => {});
shown("the unedited map still passes", clean.status === 0, `exit ${clean.status}`);

console.log(failures.length ? `negative proof has ${failures.length} problem(s):\n${failures.join("\n")}` : "negative proof ok");
process.exit(failures.length ? 1 : 0);
