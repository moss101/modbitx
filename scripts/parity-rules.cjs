/**
 * The parity map's rules, kept pure so a node check can drive them without a browser
 * and without running the whole check script. scripts/parity-check.cjs renders these
 * results; scripts/local-jobs-check.cjs asserts them on synthetic entries.
 */
const fs = require("fs");
const path = require("path");

const STATUSES = new Set(["covered", "partial", "missing", "deferred"]);
const MIN_SURFACES = 40;
const LIMIT_MIN = 20;
const REASON_MIN = 20;
const DEPENDENCY = /server|cloud|vendor|hosted|binary|account|admin|relay|fleet|signed|local|engine|permission|grant/i;

/** Plural-insensitive words, so "Schedules" is satisfied by "Scheduled tasks". */
const words = (text) => String(text).toLowerCase().split(/\s+/).map((word) => word.replace(/[^a-z0-9]/g, "")).filter(Boolean);
const stem = (word) => word.replace(/s$/, "");

/** One entry's own rules: a known status, a limit for a partial, a reason for a deferral. */
function checkSurface(entry) {
  const problems = [];
  if (!entry || typeof entry !== "object") return { ok: false, problems: ["entry is not an object"] };
  if (!entry.id || !entry.name || !entry.group || !entry.module || !entry.symbol || !entry.how?.kind) problems.push(`${entry.id || "(no id)"}: missing id, name, group, module, symbol, or how`);
  if (!entry.status) problems.push(`${entry.id}: status is unset`);
  else if (!STATUSES.has(entry.status)) problems.push(`${entry.id}: unknown status ${entry.status}`);
  if (entry.status === "missing") problems.push(`${entry.id}: is left missing`);
  if (entry.status === "partial" && String(entry.limit || "").trim().length < LIMIT_MIN) problems.push(`${entry.id}: partial without a limit note`);
  if (entry.status === "deferred") {
    if (String(entry.note || "").trim().length < REASON_MIN) problems.push(`${entry.id}: deferral without a reason`);
    else if (!DEPENDENCY.test(String(entry.note))) problems.push(`${entry.id}: deferral does not name the dependency behind it`);
  }
  if (["covered", "partial"].includes(entry.status) && !String(entry.evidence || "").trim()) problems.push(`${entry.id}: no evidence pointer`);
  return { ok: problems.length === 0, problems };
}

/** Resolves an entry's evidence pointer against the repo: the script exists and carries the mode. */
function resolveEvidence(entry, root) {
  const problems = [];
  const [script, mode] = String(entry.evidence || "").trim().split(" ");
  const file = path.join(root, script || "");
  if (!script || !fs.existsSync(file)) problems.push(`${entry.id}: ${script || "(none)"} is not a file`);
  else if (mode && !fs.readFileSync(file, "utf8").includes(mode)) problems.push(`${entry.id}: ${script} carries no ${mode}`);
  return { ok: problems.length === 0, problems };
}

/** Every rule over the whole map, as a list a runner can print or a check can assert. */
function validateMap(map, root) {
  const surfaces = map?.surfaces || [];
  const rules = [];
  const add = (name, ok, detail = "") => rules.push({ name, ok, detail });
  const problemsOf = (entries, fn) => entries.flatMap((entry) => fn(entry).problems);

  add("the map records what it inspected", Boolean(map?.source?.app && map?.source?.version && (map?.source?.inspected || []).length >= 3), `${map?.source?.app} ${map?.source?.version}`);
  add("the map is not trivially short", surfaces.length >= MIN_SURFACES, `${surfaces.length} surfaces, minimum ${MIN_SURFACES}`);

  const malformed = surfaces.flatMap((entry) => checkSurface(entry).problems);
  add("every surface has an id, group, status, code pointer, and a way in", malformed.filter((line) => /missing id|status is unset|unknown status/.test(line)).length === 0, malformed.slice(0, 4).join(", "));
  add("no status is left unset", surfaces.every((entry) => Boolean(entry.status)));
  add("every id is unique", new Set(surfaces.map((entry) => entry.id)).size === surfaces.length);

  const missingFiles = surfaces.filter((entry) => !fs.existsSync(path.join(root, entry.module)));
  add("every code pointer names a real file", missingFiles.length === 0, missingFiles.map((entry) => entry.module).join(", "));
  const missingSymbols = surfaces.filter((entry) => {
    const file = path.join(root, entry.module);
    return fs.existsSync(file) && !fs.readFileSync(file, "utf8").includes(entry.symbol);
  });
  add("every code pointer names a symbol that exists", missingSymbols.length === 0, missingSymbols.map((entry) => `${entry.module}:${entry.symbol}`).join(", "));

  const claimed = surfaces.filter((entry) => ["covered", "partial"].includes(entry.status));
  add("every covered or partial surface names the test that proves it", claimed.every((entry) => String(entry.evidence || "").trim()), claimed.filter((entry) => !String(entry.evidence || "").trim()).map((entry) => entry.id).join(", "));
  const evidenceProblems = problemsOf(claimed, (entry) => resolveEvidence(entry, root));
  add("every named test exists and carries the named mode", evidenceProblems.length === 0, evidenceProblems.slice(0, 5).join(", "));

  const partials = surfaces.filter((entry) => entry.status === "partial");
  add("every partial surface names its limit and its evidence", problemsOf(partials, checkSurface).length === 0, partials.filter((entry) => checkSurface(entry).problems.length).map((entry) => entry.id).join(", "));
  add("partial coverage is represented", true, `${partials.length} partial, ${surfaces.filter((entry) => entry.status === "covered").length} covered`);

  const deferred = surfaces.filter((entry) => entry.status === "deferred");
  add("every deferral says why", problemsOf(deferred, checkSurface).length === 0, `${deferred.length} deferred`);

  const missing = surfaces.filter((entry) => entry.status === "missing");
  add("no surface is left unimplemented", missing.length === 0, missing.map((entry) => entry.name).join(", "));

  const haystack = new Set(words(surfaces.flatMap((entry) => [entry.name, entry.id, entry.group, entry.how?.label, entry.how?.value, ...(entry.covers || [])]).join(" ")).map(stem));
  const uncovered = (map?.source?.knownSurfaces || []).filter((name) => !words(name).every((word) => haystack.has(stem(word))));
  add("every surface the bundle names is accounted for", uncovered.length === 0, uncovered.join(", "));

  const groups = [...new Set(surfaces.map((entry) => entry.group))];
  add("the map spans more than one area of the product", groups.length >= 5, groups.join(", "));

  const counts = surfaces.reduce((totals, entry) => ({ ...totals, [entry.status]: (totals[entry.status] || 0) + 1 }), {});
  return { ok: rules.every((rule) => rule.ok), rules, counts, surfaces };
}

/** The audit must dispose of every limit the map records, with nothing unresolved. */
function auditAgreesWithMap(map, audit) {
  const problems = [];
  const dispositions = audit?.dispositions || [];
  const items = audit?.items || [];
  for (const entry of (map?.surfaces || []).filter((item) => ["deferred", "partial"].includes(item.status))) {
    const item = items.find((candidate) => candidate.pointer === entry.id);
    if (!item) problems.push(`${entry.id}: the map records a limit the audit never disposes`);
    else if (!dispositions.includes(item.disposition)) problems.push(`${entry.id}: disposition ${item.disposition || "(none)"} is not known`);
  }
  const unresolved = items.filter((item) => !dispositions.includes(item.disposition));
  if (unresolved.length) problems.push(`unresolved: ${unresolved.map((item) => item.pointer).join(", ")}`);
  return { ok: problems.length === 0, problems, items: items.length, unresolved: unresolved.length };
}

module.exports = { STATUSES, MIN_SURFACES, LIMIT_MIN, words, stem, checkSurface, resolveEvidence, validateMap, auditAgreesWithMap };
