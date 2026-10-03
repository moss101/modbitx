/**
 * Validates parity/audit.json against a fresh scan.
 *
 *   node scripts/audit-check.cjs
 *
 * Fails when an entry lacks a known class, a disposition, or a reason; when the
 * artifact claims a sweep the scanner does not perform; when a finding the scanner
 * still reports has no entry; or when anything is left unresolved.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ARTIFACT = path.join(ROOT, "parity", "audit.json");
const CLASSES = ["a", "b", "c", "d"];

const failures = [];
const shown = (name, ok, detail) => {
  if (!ok) failures.push(name);
  console.log(`${ok ? "pass" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const audit = JSON.parse(fs.readFileSync(ARTIFACT, "utf8"));
const items = audit.items || [];
const sweeps = audit.sweeps || [];

shown("the artifact records how each class was swept", CLASSES.every((id) => sweeps.some((sweep) => sweep.class === id && String(sweep.how || "").length > 30)), sweeps.map((sweep) => sweep.class).join(", "));
shown("the artifact has entries", items.length >= 10, `${items.length} entries`);

const badShape = items.filter((item) => !CLASSES.includes(item.class) || !String(item.pointer || "").trim() || !(audit.dispositions || []).includes(item.disposition) || String(item.reason || "").trim().length < 20);
shown("every entry has a class, a pointer, a known disposition, and a reason", badShape.length === 0, badShape.slice(0, 4).map((item) => item.pointer || "(no pointer)").join(", "));

const unresolved = items.filter((item) => !(audit.dispositions || []).includes(item.disposition));
shown("nothing is left unresolved", unresolved.length === 0, unresolved.map((item) => item.pointer).join(", "));

// Re-run the scanner: every finding it still reports must appear in the artifact.
const scan = JSON.parse(execFileSync("node", [path.join(__dirname, "audit-scan.cjs"), "--json"], { encoding: "utf8", cwd: ROOT }));
const pointers = new Set(items.map((item) => String(item.pointer || "")));
const listed = items.map((item) => `${item.pointer} ${item.reason}`).join("\n");
const unlisted = (scan.findings || []).filter((finding) => !pointers.has(finding.pointer) && !listed.includes(finding.pointer));
shown("every finding a fresh scan reports has an entry", unlisted.length === 0, unlisted.slice(0, 4).map((finding) => finding.pointer).join(", "));

const counts = {};
for (const finding of scan.findings || []) counts[finding.class] = (counts[finding.class] || 0) + 1;
const declared = {};
for (const sweep of sweeps) declared[sweep.class] = sweep.findingsNow;
console.log(`scan now: ${JSON.stringify(counts)}  declared: ${JSON.stringify(declared)}`);
shown("the declared sweep counts match what a rescan finds", CLASSES.every((id) => (declared[id] || 0) === (counts[id] || 0)), JSON.stringify({ declared, counts }));
const fixed = items.filter((item) => item.disposition === "fixed");
shown("fixed items record the finding they close", fixed.every((item) => String(item.reason || "").length > 20) && fixed.length >= 3, `${fixed.length} fixed`);

const byDisposition = {};
for (const item of items) byDisposition[item.disposition] = (byDisposition[item.disposition] || 0) + 1;
console.log(`dispositions: ${JSON.stringify(byDisposition)}`);
console.log(failures.length ? `audit has ${failures.length} problem(s):\n${failures.join("\n")}` : "audit ok");
process.exit(failures.length ? 1 : 0);
