/**
 * Renders the parity map's rules. The rules themselves live in scripts/parity-rules.cjs
 * so a node check can drive them without this runner.
 *
 *   node scripts/parity-check.cjs            check parity/surfaces.json
 *   SURFACES_FILE=<path> node scripts/parity-check.cjs   check another copy (the negative proof uses this)
 */
const fs = require("fs");
const path = require("path");
const rules = require("./parity-rules.cjs");

const ROOT = path.join(__dirname, "..");
const MAP = process.env.SURFACES_FILE || path.join(ROOT, "parity", "surfaces.json");

const failures = [];
const shown = (name, ok, detail) => {
  if (!ok) failures.push(name);
  console.log(`${ok ? "pass" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const map = JSON.parse(fs.readFileSync(MAP, "utf8"));
const report = rules.validateMap(map, ROOT);
for (const rule of report.rules) shown(rule.name, rule.ok, rule.detail);
console.log(`counts: ${JSON.stringify(report.counts)}`);

console.log(failures.length ? `parity map has ${failures.length} problem(s):\n${failures.join("\n")}` : "parity map ok");
process.exit(failures.length ? 1 : 0);
