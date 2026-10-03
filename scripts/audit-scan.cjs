/**
 * Mechanical scan for pending items, one class at a time. Prints findings; the
 * dispositions live in parity/audit.json and are checked by scripts/audit-check.cjs.
 *
 *   node scripts/audit-scan.cjs            report findings
 *   node scripts/audit-scan.cjs --counts   print one line per class, for cross-checking
 *
 * Classes:
 *   a  a surface the parity map claims, whose evidence pointer is absent or does not exist
 *   b  a control or slice of state no shipped module reads (inert)
 *   c  an exported unit no shipped module imports (dead)
 *   d  an item recorded elsewhere as known-incomplete (the map's deferred and partial limits)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const COUNTS_ONLY = process.argv.includes("--counts");
const findings = { a: [], b: [], c: [], d: [] };

// ---- a: claims without a working evidence pointer -------------------------------------
const map = JSON.parse(fs.readFileSync(path.join(ROOT, "parity", "surfaces.json"), "utf8"));
for (const entry of map.surfaces) {
  if (!["covered", "partial"].includes(entry.status)) continue;
  const evidence = String(entry.evidence || "").trim();
  const [script, mode] = evidence.split(" ");
  const file = path.join(ROOT, script || "");
  if (!script || !fs.existsSync(file)) findings.a.push(`${entry.id}: evidence "${evidence || "(none)"}" does not name a file`);
  else if (mode && !fs.readFileSync(file, "utf8").includes(mode)) findings.a.push(`${entry.id}: ${script} does not carry mode ${mode}`);
}

// ---- b: state nothing reads -----------------------------------------------------------
const sources = [];
const walk = (dir, filter) => {
  for (const name of fs.readdirSync(dir)) {
    if (["node_modules", "dist", ".git"].includes(name)) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) { walk(full, filter); continue; }
    if (filter(full)) sources.push(full);
  }
};
walk(path.join(ROOT, "src"), (full) => /\.tsx?$/.test(full));
walk(path.join(ROOT, "electron"), (full) => /\.cjs$/.test(full));

const settingsView = fs.readFileSync(path.join(ROOT, "src/components/SettingsView.tsx"), "utf8");
// Only real settings keys count: a control patches a property that exists in the defaults.
const defaults = fs.readFileSync(path.join(ROOT, "src/catalog.ts"), "utf8");
const realKeys = new Set([...defaults.matchAll(/^\s{2}([a-zA-Z]+):/gm)].map((match) => match[1]));
const patched = new Set();
for (const match of settingsView.matchAll(/patch\(\{\s*([a-zA-Z]+)\s*[:,}]/g)) {
  if (realKeys.has(match[1])) patched.add(match[1]);
}
// The store is shipped behaviour (a reducer that acts on a setting), so it counts as a reader;
// only the settings screens are excluded, and optional chaining is matched too.
const readerFiles = sources.filter((file) => {
  const relative = path.relative(ROOT, file);
  if (relative === "src/components/SettingsView.tsx") return false;
  return !/\/(types|catalog|global\.d)\.ts$/.test(relative);
});
for (const key of patched) {
  const readers = readerFiles.filter((file) => new RegExp(`settings\\??\\.${key}\\b|\\bs\\??\\.${key}\\b|settings\\?\\.${key}\\b`).test(fs.readFileSync(file, "utf8")));
  if (!readers.length) findings.b.push(`settings.${key}: no module outside the settings UI reads it`);
}
const types = fs.readFileSync(path.join(ROOT, "src/types.ts"), "utf8");
const stateBlock = types.slice(types.indexOf("export interface AppState"), types.indexOf("export interface AppState") + 2000);
// For state, the settings screens count as readers: a note or profile field can exist
// to be displayed there, which is a real effect. Only a control reading its own value
// is self-referential, and that rule applies to the settings keys above.
for (const match of stateBlock.matchAll(/^\s{2}([a-zA-Z]+)\??:/gm)) {
  const key = match[1];
  const readers = sources.filter((file) => new RegExp(`state\\.${key}\\b|\\.${key}\\b\\s*(&&|\\?|\\.|\\[|\\s*\\})`).test(fs.readFileSync(file, "utf8")));
  if (!readers.length) findings.b.push(`state.${key}: no shipped module reads it`);
}

// ---- c: exports nothing imports --------------------------------------------------------
const allFiles = [];
walk(path.join(ROOT, "src"), (full) => /\.tsx?$/.test(full) || allFiles.push(full));
walk(path.join(ROOT, "electron"), (full) => /\.cjs$/.test(full) || allFiles.push(full));
walk(path.join(ROOT, "scripts"), (full) => /\.cjs$/.test(full) || allFiles.push(full));
walk(path.join(ROOT, "extensions"), (full) => /\.js$/.test(full) || allFiles.push(full));
const bodies = new Map();
for (const file of new Set(allFiles)) bodies.set(file, fs.readFileSync(file, "utf8"));
const homes = new Map();
for (const [file, text] of bodies) {
  for (const match of text.matchAll(/export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
    if (!homes.has(match[1])) homes.set(match[1], []);
    homes.get(match[1]).push(file);
  }
}
for (const [name, files] of homes) {
  const importedElsewhere = [...bodies.entries()].some(([file, text]) => !files.includes(file) && new RegExp(`\\b${name}\\b`).test(text));
  if (importedElsewhere) continue;
  const selfMentions = [...(bodies.get(files[0]) || "").matchAll(new RegExp(`\\b${name}\\b`, "g"))].length;
  if (selfMentions <= 1) findings.c.push(`${path.relative(ROOT, files[0])}: ${name} is exported and never imported`);
}

// ---- d: recorded limits ----------------------------------------------------------------
for (const entry of map.surfaces) {
  if (entry.status === "deferred") findings.d.push(`${entry.id}: deferred — ${String(entry.note || "").slice(0, 80)}`);
  if (entry.status === "partial") findings.d.push(`${entry.id}: partial — ${String(entry.limit || "").slice(0, 80)}`);
}

if (process.argv.includes("--json")) {
  // Machine-readable findings. scripts/audit-check.cjs matches these pointers to dispositions.
  const rows = [];
  for (const id of ["a", "b", "c"]) {
    for (const line of findings[id]) {
      const at = line.indexOf(": ");
      rows.push({ class: id, pointer: at > 0 ? line.slice(0, at) : line, detail: at > 0 ? line.slice(at + 2) : "" });
    }
  }
  for (const entry of map.surfaces) {
    if (entry.status === "deferred") rows.push({ class: "d", pointer: entry.id, detail: `deferred: ${entry.note}` });
    if (entry.status === "partial") rows.push({ class: "d", pointer: entry.id, detail: `partial: ${entry.limit}` });
  }
  console.log(JSON.stringify({ findings: rows }, null, 2));
  process.exit(0);
}

if (COUNTS_ONLY) {
  console.log(JSON.stringify({ a: findings.a.length, b: findings.b.length, c: findings.c.length, d: findings.d.length }));
} else {
  for (const id of ["a", "b", "c", "d"]) {
    console.log(`class ${id}: ${findings[id].length} finding(s)`);
    for (const line of findings[id]) console.log(`  ${line}`);
  }
  console.log(`total: ${Object.values(findings).flat().length}`);
}
process.exit(0);
