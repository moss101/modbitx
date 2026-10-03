const fs = require("fs");
const os = require("os");
const path = require("path");
const Module = require("module");
const { execFileSync } = require("child_process");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const src = path.join(root, "src");
const failures = [];

function must(name, cond) {
  if (!cond) failures.push(name);
  return cond;
}

/** The permission request must run synchronously in the click, not in the tab-query callback. */
function permissionRequestIsOnTheClick(source) {
  const queryAt = source.indexOf("chrome.tabs.query");
  const clickAt = source.indexOf("allowButton.onclick");
  const sendAt = source.indexOf('getElementById("send")');
  if (queryAt < 0 || clickAt < 0 || sendAt <= clickAt || !(queryAt < clickAt)) return false;
  if (source.slice(queryAt, clickAt).includes("chrome.permissions.request")) return false;
  const clickBody = source.slice(clickAt, sendAt);
  const requestAt = clickBody.indexOf("chrome.permissions.request");
  if (requestAt < 0 || clickBody.includes("chrome.tabs.query")) return false;
  const beforeRequest = clickBody.slice(0, requestAt);
  if (/\bawait\b|\bsetTimeout\b|\bqueueMicrotask\b|\brequestIdleCallback\b|\.then\s*\(/.test(beforeRequest)) return false;
  if (!/\{\s*origins:\s*\[\s*allowedOrigin\s*\]/.test(clickBody)) return false;
  return source.includes('url.origin + "/*"') && !source.includes("<all_urls>") && !source.includes("*://*/*");
}

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (parent?.filename?.startsWith(src + path.sep) && request.startsWith(".")) {
    const candidate = path.resolve(path.dirname(parent.filename), request);
    for (const ext of [".ts", ".tsx"]) {
      if (fs.existsSync(candidate + ext)) return candidate + ext;
    }
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

Module._extensions[".ts"] = function (module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true
    },
    fileName: filename
  }).outputText;
  module._compile(output, filename);
};
Module._extensions[".tsx"] = Module._extensions[".ts"];

function load(rel) {
  return require(path.join(src, rel));
}

const jobs = load("local-jobs.ts");
const zip = load("zip-store.ts");
const session = load("session-status.ts");
const design = load("design.ts");
const api = load("api.ts");
const office = require(path.join(root, "electron", "office.cjs"));

const kept = { id: "pin", pinned: true, archived: false, updatedAt: 1 };
const running = { id: "run", pinned: false, archived: false, updatedAt: 1 };
const hidden = { id: "inc", pinned: false, archived: false, incognito: true, updatedAt: 1 };
const open = { id: "keep", pinned: false, archived: false, updatedAt: 1 };
const idle = { id: "old", pinned: false, archived: false, updatedAt: 1 };
const fresh = { id: "new", pinned: false, archived: false, updatedAt: 100 };
const archived = jobs.archiveIdle([kept, running, hidden, open, idle, fresh], 50, ["run"], ["keep"]);
must("archive keeps the same object when it skips", archived[0] === kept && archived[1] === running && archived[2] === hidden && archived[3] === open && archived[5] === fresh);
must("archive marks an idle chat", archived[4].archived === true && archived[4] !== idle);

const state = {
  threads: [
    { id: "c1", mode: "chat", incognito: false, title: "Chat", messages: [] },
    { id: "secret-chat", mode: "chat", incognito: true, title: "Hidden", messages: [] },
    { id: "w1", mode: "cowork", incognito: false, title: "Task", messages: [] },
    { id: "k1", mode: "code", incognito: true, title: "Secret code", messages: [] }
  ],
  memories: [{ id: "m1", text: "note", updatedAt: 1 }],
  tasks: [{ id: "t1", name: "Morning", prompt: "Summarize", when: "09:00", enabled: true, cloud: true }],
  projects: [{ id: "p1", name: "Alpha", description: "", instructions: "Do this", color: "#000", knowledge: [], createdAt: 1 }],
  settings: { apiKey: "secret-key", githubToken: "gh-token" }
};
const files = jobs.sessionArchive(state);
const manifest = JSON.parse(files.find((file) => file.name === "manifest.json").text);
must("export blanks keys", manifest.settings.apiKey === "" && manifest.settings.githubToken === "");
must("export omits incognito", manifest.threads.length === 1 && manifest.threads[0].id === "c1");
must("export writes cowork and skips secret code", files.some((file) => file.name === "sessions/cowork/w1.json") && !files.some((file) => file.name.includes("k1") || file.name.includes("secret-chat")));
const round = jobs.bundleFromZip(jobs.bundleZip(state));
must("import ignores settings", !("settings" in round) && round.threads.some((thread) => thread.id === "w1") && !round.threads.some((thread) => thread.incognito));
const packed = zip.zipStore([{ name: "a.txt", text: "hi" }]);
const flipped = packed.slice();
for (let i = 0; i < flipped.length - 4; i += 1) {
  if (flipped[i] === 0x50 && flipped[i + 1] === 0x4b && flipped[i + 2] === 0x01 && flipped[i + 3] === 0x02) {
    flipped[i + 10] = 8;
    break;
  }
}
let rejected = false;
try { zip.unzipStore(flipped); } catch (error) { rejected = /compression/.test(error.message); }
must("compressed zip is rejected", rejected);

must("flat session stays unclassified", session.applySessionStatus(true, { choice: "done", confidence: 0.54 }) === "unclassified");
must("concentrated session applies", session.applySessionStatus(true, { choice: "blocked", confidence: 0.55 }) === "blocked");
must("unknown choice stays unclassified", session.applySessionStatus(true, { choice: "later", confidence: 0.99 }) === "unclassified");
must("missing judgment stays unclassified", session.applySessionStatus(false, { choice: "done", confidence: 0.99 }) === "unclassified");

must("worktree leaf", jobs.worktreeLeaf("feat/login") === "feat-login" && jobs.worktreePath("/tmp/wt/", "feat/login") === "/tmp/wt/feat-login");
must("unsafe worktree leaf is empty", jobs.worktreeLeaf("../x") === "");
must("github ssh remote", jobs.githubRepo("git@github.com:owner/repo.git") === "owner/repo");
must("github https remote", jobs.githubRepo("https://github.com/owner/repo") === "owner/repo");
must("non github remote", jobs.githubRepo("https://gitlab.com/owner/repo") === null);
const pulls = jobs.parsePulls(JSON.stringify([{ number: 4, title: "Fix", draft: true, state: "open" }, { title: "skip" }]));
must("pull list", pulls.length === 1 && pulls[0].number === 4 && pulls[0].draft === true);

const paper = { id: "paper", name: "Paper", share: "organization", ink: "#111111", paper: "#ffffff", accent: "#3366aa", font: "sans", radius: 8, space: 16, components: "" };
const mine = { ...paper, id: "mine", name: "Mine", share: "only-you" };
must("member sees shared systems", design.designsForRole([paper, mine], "member").map((item) => item.id).join() === "paper");
must("owner sees every system", design.designsForRole([paper, mine], "owner").length === 2);
must("no shared system falls back to the library", design.organizationSystems([mine]).length === 1);
must("member ignores a pinned private system", design.activeDesign({ design: paper, designSystems: [paper, mine], defaultDesignId: "mine" }, { designSystemId: "mine" }, "member").name === "Paper");

const settled = design.settleDesign({ design: paper, designSystems: [paper, mine], defaultDesignId: "paper" }, { defaultDesignId: "mine" });
shown("the default system drives new artifacts", settled.design.accent === mine.accent && settled.design.name === "Mine" && settled.defaultDesignId === "mine");
const edited = design.settleDesign({ design: paper, designSystems: [paper, mine], defaultDesignId: "mine" }, { design: { ...paper, accent: "#ff7700" } });
shown("a token edit updates the default record only", edited.designSystems.find((item) => item.id === "mine").accent === "#ff7700" && edited.designSystems.find((item) => item.id === "paper").accent === paper.accent && edited.designSystems.length === 2);
const missing = design.settleDesign({ design: paper, designSystems: [paper, mine], defaultDesignId: "gone" }, {});
shown("a missing default falls back to the first system", missing.defaultDesignId === "paper" && missing.design.name === "Paper");
const empty = design.settleDesign({ design: paper, designSystems: [paper, mine], defaultDesignId: "paper" }, { designSystems: [] });
shown("an emptied library keeps one system", empty.designSystems.length === 1 && empty.defaultDesignId === empty.designSystems[0].id);
const duped = design.settleDesign({ design: paper, designSystems: [paper, mine] }, { designSystems: [mine, { ...mine, name: "Mine again" }] });
shown("duplicate ids are made unique", duped.designSystems.length === 2 && duped.designSystems[0].id !== duped.designSystems[1].id);

const skills = load("skills.ts");
shown("tool rounds keep their prose apart", (() => {
  const joined = api.joinProse(["I'll click the search box.", "Desktop clicks are off.", ""]);
  return joined === "I'll click the search box.\n\nDesktop clicks are off."
    && api.joinProse(["only one"]) === "only one"
    && api.joinProse(["", ""]) === "";
})());const seeds = load("catalog.ts").SEED_SKILLS;
const bundled = seeds[0];
const savedSkill = { id: "mine", name: "Mine", blurb: "Custom skill", enabled: true, bundled: false, instructions: "Do the thing." };
shown("a bundled skill can be reset but not deleted", skills.canDeleteSkill(bundled) === false && skills.canResetSkill(bundled) === true);
shown("a saved skill can be deleted but not reset", skills.canDeleteSkill(savedSkill) === true && skills.canResetSkill(savedSkill) === false);
shown("reset restores the bundled text", (() => {
  const patch = skills.resetPatch({ ...bundled, name: "Edited", instructions: "changed" }, seeds);
  return !!patch && patch.name === bundled.name && patch.instructions === bundled.instructions;
})());
shown("reset refuses a skill with no seed", skills.resetPatch({ ...bundled, id: "nope" }, seeds) === null);
const twoSkills = [savedSkill, { ...savedSkill, id: "off", name: "Off", enabled: false, instructions: "Do the other thing." }];
shown("only enabled skills count", skills.enabledSkillCount(twoSkills) === 1 && skills.enabledSkillCount([{ ...savedSkill, id: "on2" }]) === 1);
shown("the character count follows the enabled skills", skills.skillCharacters(twoSkills) === "- Mine: Do the thing.".length && skills.skillCharacters([]) === 0);
shown("the prompt sends exactly those lines", (() => {
  const prompt = api.systemPrompt({ settings: { model: "grok-4.7", effort: "xhigh" }, messages: [], skills: twoSkills, memories: [], mode: "chat" });
  return prompt.includes("- Mine: Do the thing.") && !prompt.includes("Do the other thing.");
})());
shown("an edit is trimmed and capped", (() => {
  const patch = skills.skillEdit({ name: "  Mine  ", instructions: "x".repeat(skills.SKILL_INSTRUCTIONS_LIMIT + 500) });
  return patch.name === "Mine" && patch.instructions.length === skills.SKILL_INSTRUCTIONS_LIMIT;
})());
// ---- the parity map's own rules, driven as shipped units -------------------------------
const parityRules = require(path.join(root, "scripts", "parity-rules.cjs"));
const parityMap = JSON.parse(fs.readFileSync(path.join(root, "parity", "surfaces.json"), "utf8"));
const parityAudit = JSON.parse(fs.readFileSync(path.join(root, "parity", "audit.json"), "utf8"));

const mapReport = parityRules.validateMap(parityMap, root);
// The local server port is single-occupancy; a second copy must survive it.
const platformSource = fs.readFileSync(path.join(root, "electron", "platform.cjs"), "utf8");
// Exporting an artifact reaches the same document writer the agent uses.
const mainSource = fs.readFileSync(path.join(root, "electron", "main.cjs"), "utf8");
const preloadSource = fs.readFileSync(path.join(root, "electron", "preload.cjs"), "utf8");
const platformSource2 = fs.readFileSync(path.join(root, "electron", "platform.cjs"), "utf8");
// The shortcut reference must match what the app really registers.
const shortcuts = load("shortcuts.ts");
const mainForKeys = fs.readFileSync(path.join(root, "electron", "main.cjs"), "utf8");
const display = (accelerator) => accelerator
  .replace("CommandOrControl+Shift+", "⇧⌘")
  .replace("CommandOrControl+", "⌘");
const accelerators = [...new Set([...mainForKeys.matchAll(/accelerator: "([^"]+)"/g)].map((match) => match[1]))];
const catalogKeys = shortcuts.shortcutKeys();
const covered = accelerators.filter((accelerator) => {
  const key = display(accelerator);
  return catalogKeys.some((entry) => entry === key || entry.includes(key));
});
shown("the shortcut reference covers every registered accelerator", covered.length === accelerators.length, `${covered.length} of ${accelerators.length}: ${accelerators.map(display).join(", ")}`);
const composerSource = fs.readFileSync(path.join(root, "src", "components", "Composer.tsx"), "utf8");
const appSource = fs.readFileSync(path.join(root, "src", "App.tsx"), "utf8");
shown("the reference names the in-app keys too", catalogKeys.includes("Enter") && catalogKeys.includes("⇧Enter") && catalogKeys.includes("Escape") && catalogKeys.some((key) => key.includes("↑")) && /metaKey.*"k"/.test(appSource) && /event\.key === "Enter"/.test(composerSource));

shown("an artifact can be exported as a document", /artifact:export/.test(mainSource) && /exportArtifact:/.test(preloadSource) && /writeDocument/.test(mainSource) && /module\.exports = \{ attachPlatform, readDocument, writeDocument \}/.test(platformSource2));
shown("the export offers the document kinds the writer supports", ["docx", "xlsx", "pptx", "pdf", "md", "csv", "txt"].every((kind) => new RegExp(`${kind}: \\{ name:`).test(mainSource)));

shown("the local server survives a taken port", /EADDRINUSE/.test(platformSource) && /syncServer\.once\("error"/.test(platformSource) && /setTimeout\(\(\) => listen\(attempt \+ 1\)/.test(platformSource));
shown("the server state is reported to the renderer", /serverUp: syncStatus\.up, serverNote: syncStatus\.note/.test(platformSource));

shown("the committed map passes its own rules", mapReport.ok === true, JSON.stringify(mapReport.counts));
shown("no surface in the map is missing", !mapReport.counts.missing, JSON.stringify(mapReport.counts));
shown("the map marks the partly provided surfaces", (mapReport.counts.partial || 0) >= 8, `${mapReport.counts.partial} partial`);
shown("every partial in the map carries a limit", parityMap.surfaces.filter((entry) => entry.status === "partial").every((entry) => String(entry.limit || "").length >= parityRules.LIMIT_MIN));

const honest = parityMap.surfaces.find((entry) => entry.status === "partial");
const noLimit = parityRules.checkSurface({ ...honest, limit: "" });
const bare = parityRules.checkSurface({ ...honest, limit: undefined });
const missingStatus = parityRules.checkSurface({ ...honest, status: "missing" });
const unknownStatus = parityRules.checkSurface({ ...honest, status: "nearly" });
shown("the rules reject a partial without its limit", noLimit.ok === false && bare.ok === false, noLimit.problems[0]);
shown("the rules reject a surface left missing or an unknown status", missingStatus.ok === false && unknownStatus.ok === false, missingStatus.problems[0]);

const realEvidence = parityRules.resolveEvidence(honest, root);
const missingScript = parityRules.resolveEvidence({ id: "x", evidence: "scripts/nope.cjs" }, root);
const wrongMode = parityRules.resolveEvidence({ id: "x", evidence: "scripts/parity-check.cjs nosuchmode" }, root);
shown("evidence resolves only to a real script and mode", realEvidence.ok === true && missingScript.ok === false && wrongMode.ok === false, `${honest.evidence} ok, synthetic pointers rejected`);

const mapAuditAgreement = parityRules.auditAgreesWithMap(parityMap, parityAudit);
const dropped = parityRules.auditAgreesWithMap(parityMap, { ...parityAudit, items: parityAudit.items.filter((item) => item.pointer !== honest.id) });
shown("the audit disposes of every limit the map records", mapAuditAgreement.ok === true && mapAuditAgreement.unresolved === 0, `${mapAuditAgreement.items} entries`);
shown("the audit rules reject a dropped disposition", dropped.ok === false, dropped.problems[0]);

shown("the request knows who this Mac belongs to", (() => {
  const settings = { model: "grok-4.7", effort: "xhigh", displayName: "Sam", fullName: "Sam Rivera", email: "sam@example.com" };
  const prompt = api.systemPrompt({ settings, messages: [], skills: [], connectors: [], memories: [], mode: "chat" });
  const anonymous = api.systemPrompt({ settings: { model: "grok-4.7", effort: "xhigh" }, messages: [], skills: [], connectors: [], memories: [], mode: "chat" });
  return prompt.includes("This Mac belongs to Sam Rivera.") && prompt.includes("Their address here is sam@example.com.") && !anonymous.includes("belongs to");
})());

shown("a switched-on connector reaches the request", (() => {
  const on = { id: "github", name: "GitHub", category: "Developer", blurb: "Issues, pull requests, and repository context.", enabled: true, kind: "directory" };
  const off = { id: "mail", name: "Mail", category: "Work", blurb: "Summarize threads you explicitly attach.", enabled: false, kind: "directory" };
  const prompt = api.systemPrompt({ settings: { model: "grok-4.7", effort: "xhigh" }, messages: [], skills: [], connectors: [on, off], memories: [], mode: "chat" });
  return prompt.includes("- GitHub: Issues, pull requests, and repository context.") && !prompt.includes("Mail:");
})());
shown("a switched-off connector stays out of the request", (() => {
  const off = { id: "github", name: "GitHub", category: "Developer", blurb: "Issues, pull requests, and repository context.", enabled: false, kind: "directory" };
  const prompt = api.systemPrompt({ settings: { model: "grok-4.7", effort: "xhigh" }, messages: [], skills: [], connectors: [off], memories: [], mode: "chat" });
  return prompt.includes("Connectors the user switched on:\n(none)") && !prompt.includes("- GitHub:");
})());

shown("the preview document carries the design tokens", (() => {
  const system = design.designTokens({ ink: "#1f1e1b", paper: "#faf9f5", accent: "#8d3b28", radius: 12, space: 16 });
  const document = design.previewDocument("<h1>Hello</h1>", system);
  return document.includes("--accent:#8d3b28") && document.includes("--ink:#1f1e1b") && document.includes("--paper:#faf9f5") && document.includes("<h1>Hello</h1>");
})());
shown("a design keeps a distinct accent", (() => {
  const system = design.designTokens({ accent: "#8d3b28" });
  return system.accent.toLowerCase() !== system.ink.toLowerCase();
})());

shown("a preview stays one short line", (() => {
  const preview = skills.skillPreview("First line\nsecond   line with   space", 20);
  return !/\n/.test(preview) && preview.length <= 21 && preview.endsWith("…");
})());

const providers = load("providers.ts");
const catalog = load("provider-catalog.ts").PROVIDER_CATALOG;
const base = { provider: "xai", providerKeys: {}, providerBase: {}, customModels: {}, model: "grok-4.7" };
shown("the catalog carries the major providers", ["openai", "anthropic", "google", "xai", "groq", "mistral", "deepseek", "openrouter", "zai", "ollama"].every((id) => catalog.some((p) => p.id === id)), `${catalog.length} providers`);
shown("every catalog provider has a key variable and an endpoint", catalog.every((p) => p.env.length && p.api));
shown("no provider reads a key variable it should not", catalog.every((p) => p.env.every((name) => /^[A-Z0-9_]{3,40}$/.test(name))));
shown("an unknown provider id falls back to xAI", providers.providerById("nope").id === "xai" && providers.activeProvider(base).id === "xai");
shown("a missing provider choice reads as xAI", providers.settleProviders({ apiKey: "", provider: undefined }).provider === "xai");
shown("the catalog endpoint is the default", providers.providerBaseUrl({ provider: "groq", providerBase: {} }) === "https://api.groq.com/openai/v1");
shown("a saved endpoint beats the catalog", providers.providerBaseUrl({ provider: "groq", providerBase: { groq: "https://proxy.test/v1" } }) === "https://proxy.test/v1");
shown("each provider keeps its own key", providers.activeKey({ provider: "groq", providerKeys: { groq: "g", openai: "o" } }) === "g" && providers.activeKey({ provider: "openai", providerKeys: { groq: "g", openai: "o" } }) === "o");
shown("an older save migrates its keys", (() => {
  const settled = providers.settleProviders({ apiKey: "old-xai", zcodeKey: "old-z", zcodeBaseUrl: "https://z.test/v1" });
  return settled.providerKeys.xai === "old-xai" && settled.providerKeys.zai === "old-z" && settled.providerBase.zai === "https://z.test/v1";
})());
shown("an older zcode choice becomes zai", providers.settleProviders({ provider: "zcode" }).provider === "zai");
shown("a model from another provider is replaced", providers.settledModel({ provider: "groq", model: "grok-4.7" }) !== "grok-4.7" && providers.settledModel({ provider: "xai", model: "grok-4.7" }) === "grok-4.7");
shown("a typed model id leads the list", (() => {
  const settings = { provider: "ollama", model: "llama3", customModels: { ollama: "llama3" } };
  return providers.providerModels(settings)[0].id === "llama3" && providers.settledModel(settings) === "llama3";
})());
shown("switching keeps a model that fits and replaces one that does not", (() => {
  const same = providers.switchProvider({ provider: "xai", model: "glm-5.3", customModels: {} }, "zai");
  const moves = providers.switchProvider({ provider: "xai", model: "grok-4.7", customModels: {} }, "zai");
  return same.model === undefined && moves.model === catalog.find((p) => p.id === "zai").models[0].id;
})());
shown("the app and the background scheduler agree on the provider", (() => {
  const agentRules = require(path.join(root, "scripts", "scheduler.cjs"));
  const cases = [
    [{ provider: "xai", providerKeys: { xai: "k" }, model: "grok-4.7" }, "k", "https://api.x.ai/v1", "grok-4.7"],
    [{ provider: "zai", providerKeys: { zai: "z" }, model: "glm-5.3-flash" }, "z", "https://api.z.ai/api/paas/v4", "glm-5.3-flash"],
    [{ provider: "groq", providerKeys: { groq: "g" }, model: "grok-4" }, "g", "https://api.groq.com/openai/v1", "grok-4"],
    [{ provider: "zai", zcodeKey: "legacy", model: "glm-5.3" }, "legacy", "https://api.z.ai/api/paas/v4", "glm-5.3"]
  ];
  return cases.every(([settings, key, url, model]) => {
    const agent = agentRules.providerFor(settings);
    return agent.key === key && agent.base === url && agent.model === model;
  });
})());

must("empty schedule cannot run", jobs.taskOutcome("  ", { hasKey: true, desktopOpen: true }).status === "cant-run");
must("open desktop finishes", jobs.taskOutcome("click the button", { hasKey: false, desktopOpen: true }).status === "finished");
must("closed desktop asks for a click", jobs.taskOutcome("click the button", { hasKey: true, desktopOpen: false }).status === "needs-input");
must("closed desktop without a key cannot run", jobs.taskOutcome("Summarize the notes", { hasKey: false, desktopOpen: false }).status === "cant-run");
must("closed desktop with a key finishes text", jobs.taskOutcome("Summarize the notes", { hasKey: true, desktopOpen: false }).status === "finished");
must("notice titles", jobs.noticeTitle("cant-run", "Morning").includes("could not run") && jobs.noticeTitle("needs-input", "Morning").includes("needs you"));

const scheduler = require(path.join(root, "scripts", "scheduler.cjs"));
shown("a schedule with no days runs every day", jobs.taskDueOn("09:00", undefined, "09:00", 3) === true && jobs.taskDueOn("09:00", [], "09:00", 0) === true);
shown("a schedule only runs on its days", jobs.taskDueOn("09:00", [1, 2, 3, 4, 5], "09:00", 6) === false && jobs.taskDueOn("09:00", [1, 2, 3, 4, 5], "09:00", 5) === true);
shown("the minute still has to match", jobs.taskDueOn("09:00", [4], "09:01", 4) === false);
shown("only real weekdays count", jobs.taskDays([1, 1, 9, -1, "2", 6]).join() === "1,2,6" && jobs.taskDays([1, 2, 3, 4, 5, 6, 0]).length === 7);
shown("the repeat label reads plainly", jobs.taskDaysLabel(undefined) === "Every day" && jobs.taskDaysLabel([1, 2, 3, 4, 5]) === "Weekdays" && jobs.taskDaysLabel([0, 6]) === "Weekends" && jobs.taskDaysLabel([1, 3]) === "Mon, Wed", `${jobs.taskDaysLabel(undefined)} / ${jobs.taskDaysLabel([1, 2, 3, 4, 5])} / ${jobs.taskDaysLabel([0, 6])} / ${jobs.taskDaysLabel([1, 3])}`);
const agreement = [];
for (const when of ["09:00", "09:01"]) {
  for (const days of [undefined, [], [0], [1, 2, 3, 4, 5], [0, 6], [6]]) {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const app = jobs.taskDueOn(when, days, "09:00", weekday);
      const agent = scheduler.taskDueOn(when, days, "09:00", weekday);
      if (app !== agent) agreement.push(`${when}/${JSON.stringify(days)}/${weekday}`);
    }
  }
}
shown("the app and the background scheduler agree on due times", agreement.length === 0, agreement.join(" "));

const projects = [
  { id: "p", name: "Alpha", instructions: "Do this", knowledge: [{ name: "k.txt", text: "know" }], shared: false },
  { id: "s", name: "Beta", instructions: "Share this", knowledge: [], shared: true }
];
const block = jobs.projectPrompt(projects, "p");
must("project prompt labels", block.includes("Project instructions: Alpha") && block.includes("[k.txt]") && block.includes("Shared project: Beta") && !block.includes("STYLE NOTE"));
const settings = {
  model: "grok-4.7",
  effort: "low",
  memoryOn: true,
  orgMemoryOn: true,
  orgMemories: [{ id: "o", text: "org fact", updatedAt: 1 }],
  launchNote: "STYLE NOTE",
  language: "",
  outputStyle: "default"
};
const prompt = api.systemPrompt({
  settings,
  messages: [],
  skills: [],
  memories: ["personal fact"],
  projectInstructions: block,
  mode: "chat"
});
must("prompt keeps the style note separate", prompt.includes("Instructions:\nSTYLE NOTE") && prompt.includes("Project instructions: Alpha") && prompt.includes("personal fact"));
must("org memory is its own heading", prompt.includes("Memory for people") && prompt.includes("org fact"));
const quiet = api.systemPrompt({
  settings: { ...settings, orgMemoryOn: false },
  messages: [],
  skills: [],
  memories: ["personal fact"],
  projectInstructions: block,
  mode: "chat"
});
must("org memory stays out when off", !quiet.includes("Memory for people") && !quiet.includes("org fact"));

const pdf = office.simplePdf("Hello Café");
must("pdf is one page of winansi", pdf.toString("latin1").startsWith("%PDF-1.4") && pdf.toString("latin1").includes("Caf?"));
const sheetXml = office.spreadsheetXml([["A", "B"], ["1", "2"]])["xl/worksheets/sheet1.xml"];
const cells = office.cellsFromSheet(sheetXml);
must("sheet cells", cells[0][0] === "A" && cells[1][1] === "2");
must("sheet caps columns", office.rowsFromText(Array.from({ length: 30 }, (_, i) => `c${i}`).join(","))[0].length === 26);
const deck = office.presentationXml(["Title\nBody", "Next"]);
must("deck has every slide", Boolean(deck["ppt/slides/slide2.xml"]) && office.slideText(deck["ppt/slides/slide1.xml"])[0] === "Title");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "modbitx-office-"));
const book = office.spreadsheetXml([["Keep"], ["Next"]]);
for (const [name, content] of Object.entries(book)) {
  const file = path.join(dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
const dest = path.join(os.tmpdir(), `modbitx-book-${Date.now()}.xlsx`);
execFileSync("zip", ["-qr", dest, "."], { cwd: dir });
const zipped = execFileSync("unzip", ["-p", dest, "xl/worksheets/sheet1.xml"]).toString();
const readBack = office.cellsFromSheet(zipped);
must("xlsx zip roundtrip", readBack[0][0] === "Keep" && readBack[1][0] === "Next");
fs.rmSync(dir, { recursive: true, force: true });
fs.rmSync(dest, { force: true });

const artifacts = load("artifacts.ts");

shown("a version compare pairs the lines", (() => {
  const rows = artifacts.compareVersions("<h1>A</h1>\n<p>keep</p>", "<h1>B</h1>\n<p>keep</p>\n<p>new</p>");
  return rows.length === 3 && rows[0].kind === "changed" && rows[1].kind === "same" && rows[2].kind === "added" && rows[2].left === "";
})());
shown("the compare summary counts what differs", (() => {
  const rows = artifacts.compareVersions("a\nb", "a\nc\nd");
  const summary = artifacts.diffSummary(rows);
  const same = artifacts.diffSummary(artifacts.compareVersions("a", "a"));
  return /2 of 3 lines differ/.test(summary) && /1 changed, 1 added, 0 removed/.test(summary) && /match line for line/.test(same);
})());
const fenced = "```html artifact title=\"One\"\n<h1>A</h1>\n```\n```html artifact title=\"Two\"\n<h1>B</h1>\n```";
const parsed = artifacts.artifactsFromMessages([{ id: "m1", role: "assistant", content: fenced, createdAt: 1 }]);
must("two artifacts", parsed.length === 2 && parsed[0].id === "m1:0" && parsed[1].content === "<h1>B</h1>");
const rewritten = artifacts.replaceArtifactBody(fenced, 1, "<h1>C</h1>");
const reread = artifacts.artifactsFromMessages([{ id: "m1", role: "assistant", content: rewritten, createdAt: 1 }]);
must("restore leaves the other artifact", reread[0].content === "<h1>A</h1>" && reread[1].content === "<h1>C</h1>");
must("missing artifact is unchanged", artifacts.restoreArtifact(fenced, "m1:4", "<h1>Z</h1>") === null);
let versions = artifacts.rememberVersion([], { id: "m1:0", title: "One", language: "html", content: "<h1>A</h1>" }, 1);
must("first version kept", versions[0].versions.length === 1);
must("same text is not a new version", artifacts.rememberVersion(versions, { id: "m1:0", title: "One", language: "html", content: "<h1>A</h1>" }, 2) === null);
versions = artifacts.rememberVersion(versions, { id: "m1:0", title: "One", language: "html", content: "<h1>D</h1>" }, 3);
must("next version appended", versions[0].versions[1].content === "<h1>D</h1>");
for (let i = 0; i < 14; i += 1) versions = artifacts.rememberVersion(versions, { id: "m1:0", title: "One", language: "html", content: `<p>${i}</p>` }, 10 + i);
must("versions keep the latest twelve", versions[0].versions.length === 12 && versions[0].versions[0].content === "<p>2</p>" && versions[0].versions[11].content === "<p>13</p>");
must("oversized snapshot is skipped", artifacts.rememberVersion([], { id: "m", title: "T", language: "html", content: "x".repeat(300001) }, 1) === null);

const shelf = [
  { id: "one:0", title: "One", thread: "Weekly notes", language: "html" },
  { id: "two:0", title: "Two", thread: "Zebra plan", language: "html" }
];
shown("an empty search keeps every artifact", artifacts.filterArtifacts(shelf, "  ").length === 2);
shown("an artifact is found by its title", artifacts.filterArtifacts(shelf, "one").map((item) => item.id).join() === "one:0");
shown("an artifact is found by its chat", artifacts.filterArtifacts(shelf, "zebra").map((item) => item.id).join() === "two:0");
shown("an unmatched search returns nothing", artifacts.filterArtifacts(shelf, "zzz").length === 0);
const keptOnce = artifacts.rememberVersion([], { id: "one:0", title: "One", language: "html", content: "<h1>A</h1>" }, 1);
const keptTwice = artifacts.rememberVersion(keptOnce, { id: "one:0", title: "One", language: "html", content: "<h1>B</h1>" }, 2);
shown("the version count follows the saved snapshots", artifacts.versionCount(undefined, "one:0") === 0 && artifacts.versionCount(keptTwice, "one:0") === 2 && artifacts.versionCount(keptTwice, "nope") === 0);

function shown(name, cond) {
  must(name, cond);
  if (cond) console.log(`pass: ${name}`);
}

const chromeRead = jobs.handoffDecision({
  source: "chrome",
  page: { title: "Docs", url: "https://example.com/guide", text: "Hello from the page body" }
});
shown("chrome read keeps the page text and label", chromeRead.kind === "chrome" && chromeRead.label === "From Chrome" && chromeRead.text.includes("Hello from the page body") && chromeRead.text.includes("Docs") && chromeRead.text.includes("https://example.com/guide"));
const chromeError = jobs.handoffDecision({ source: "chrome", page: { error: "No element" } });
shown("chrome script error stays a chrome handoff", chromeError.kind === "chrome" && chromeError.label === "From Chrome" && chromeError.text.includes("No element"));
const phoneHandoff = jobs.handoffDecision({ text: "Pick up milk" });
shown("phone handoff is not chrome", phoneHandoff.kind === "phone" && phoneHandoff.label !== "From Chrome" && !phoneHandoff.text.includes("From Chrome"));
const scheduled = jobs.handoffDecision({ text: "Summarize the inbox", taskId: "t1", title: "Morning", source: "chrome", page: { title: "Ignored", url: "https://example.com", text: "not a page read" } });
shown("task id stays schedule work", scheduled.kind === "schedule" && scheduled.taskId === "t1" && scheduled.label !== "From Chrome" && scheduled.text === "Summarize the inbox");

const extensionDir = path.join(root, "extensions", "chrome");
const extensionManifest = JSON.parse(fs.readFileSync(path.join(extensionDir, "manifest.json"), "utf8"));
const hosts = extensionManifest.host_permissions || [];
const optionalHosts = extensionManifest.optional_host_permissions || [];
const background = fs.readFileSync(path.join(extensionDir, "background.js"), "utf8");
const popup = fs.readFileSync(path.join(extensionDir, "popup.js"), "utf8");
const pollStart = background.indexOf("async function poll");
const pollEnd = background.indexOf("if (chrome.alarms)");
const pollSource = background.slice(pollStart, pollEnd);
shown("alarms permission is declared", Array.isArray(extensionManifest.permissions) && extensionManifest.permissions.includes("alarms"));
shown("install grant is only the local handoff host", hosts.length === 1 && hosts[0] === "http://127.0.0.1:4737/*");
shown("page access is requested per site", optionalHosts.includes("http://*/*") && optionalHosts.includes("https://*/*") && !hosts.some((host) => host.includes("all_urls") || host.includes("*://")));
shown("alarm stays at one minute", background.includes("periodInMinutes: 1") && background.includes("chrome.alarms.onAlarm.addListener"));
shown("a failed injection is still posted", pollSource.indexOf("catch") > 0 && pollSource.indexOf("/v1/handoff") > pollSource.indexOf("catch") && pollSource.includes('source: "chrome"'));
const requestInsideQuery = [
  "chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {",
  "  const url = new URL(tabs[0].url);",
  "  chrome.permissions.request({ origins: [url.origin + \"/*\"] }, () => {});",
  "});",
  "allowButton.onclick = () => {};",
  "document.getElementById(\"send\");"
].join("\n");
const requestAfterTimeout = [
  "let allowedOrigin = \"\";",
  "chrome.tabs.query({ active: true, currentWindow: true }, () => { allowedOrigin = url.origin + \"/*\"; });",
  "allowButton.onclick = () => { setTimeout(() => chrome.permissions.request({ origins: [allowedOrigin] }), 0); };",
  "document.getElementById(\"send\");"
].join("\n");
shown("a query-callback permission request is rejected", permissionRequestIsOnTheClick(requestInsideQuery) === false);
shown("a deferred permission request is rejected", permissionRequestIsOnTheClick(requestAfterTimeout) === false);
shown("popup asks for the open site only", permissionRequestIsOnTheClick(popup));

// ---- wake scheduling: the next occurrence finder feeds pmset ----
{
  const saturday = new Date(2026, 9, 3, 10, 0);
  must("a daily task's next run is the same morning", jobs.nextDueOn("09:00", [], new Date(2026, 9, 3, 8, 0))?.startsWith("2026-10-03T09:00") === true);
  must("a past slot rolls to the next morning", jobs.nextDueOn("09:00", [], new Date(2026, 9, 3, 10, 0))?.startsWith("2026-10-04T09:00") === true);
  must("a weekly task finds Monday from Saturday", jobs.nextDueOn("09:00", [1], saturday)?.startsWith("2026-10-05T09:00") === true);
  must("an empty time never resolves", jobs.nextDueOn("", [], saturday) === null);
}

// ---- questions: structured ask_user through the shipped normalize/format/runTool path ----
// ---- memory-verbs: applyMemoryVerb through the real executor and prompt builder ----
const questions = load("questions.ts");
const memoryVerbs = load("memory.ts");
const tools = load("tools.ts");

async function shippedToolChecks() {
  // The executor runs in the renderer, where window.modbitx exists.
  globalThis.window = { modbitx: {} };

  const choice = questions.normalizeQuestion({ tool: "ask_user", text: "Which color?", options: ["Red", "Green", "Blue"] });
  must("a listed options call is a choice", choice.ok && choice.question.kind === "choice" && choice.question.options.length === 3 && choice.question.prompt === "Which color?");
  const fromContent = questions.normalizeQuestion({ text: "Ship it?", content: "yes | no" });
  must("content lines become options", fromContent.ok && fromContent.question.kind === "choice" && fromContent.question.options.join() === "yes,no");
  const free = questions.normalizeQuestion({ text: "What should the note say?" });
  must("no options is a free-text question", free.ok && free.question.kind === "text");
  const multi = questions.normalizeQuestion({ text: "Ship it?", kind: "multi", options: ["Docs", "Tests"] });
  must("multi keeps its kind", multi.ok && multi.question.kind === "multi" && multi.question.multi === true);
  must("multi without options is refused", questions.normalizeQuestion({ text: "q", kind: "multi" }).ok === false);
  const scale = questions.normalizeQuestion({ text: "Rate the draft", kind: "scale", min: 1, max: 10 });
  must("a scale keeps its range", scale.ok && scale.question.kind === "scale" && scale.question.min === 1 && scale.question.max === 10 && scale.question.step === 1);
  must("an inverted scale is refused", questions.normalizeQuestion({ text: "q", kind: "scale", min: 10, max: 1 }).ok === false);
  must("a question with no text is refused", questions.normalizeQuestion({ options: ["a", "b"] }).ok === false);

  shown("answers read back as sentences", questions.formatAnswer(choice.question, "Green") === "You chose Green."
    && questions.formatAnswer(multi.question, "Docs, Tests") === "You chose: Docs, Tests."
    && questions.formatAnswer(scale.question, "7") === "You answered 7 on the 1–10 scale."
    && questions.formatAnswer(free.question, "hello") === "Answer: hello"
    && questions.formatAnswer(choice.question, "") === "(no answer)");

  let asked = null;
  const answerEnv = { askUser: async (prompt, options, question) => { asked = { prompt, options, question }; return "Blue"; } };
  const answered = await tools.runTool({ tool: "ask_user", text: "Which color?", options: ["Red", "Green", "Blue"] }, answerEnv);
  shown("the shipped ask_user round trip holds", answered.ok && answered.output === "You chose Blue."
    && asked.question.kind === "choice" && asked.options.join() === "Red,Green,Blue" && asked.prompt === "Which color?");

  const refused = await tools.runTool({ tool: "ask_user", text: "Ship it?", kind: "multi" }, { askUser: async () => "x" });
  must("the executor reports a malformed question", refused.ok === false && /multi-select/.test(refused.output));
  const noText = await tools.runTool({ tool: "ask_user", options: ["a", "b"] }, { askUser: async () => "x" });
  must("the executor reports a question with no text", noText.ok === false && /needs the question in text/.test(noText.output));

  let memoryNow = [];
  const memoryEnv = {
    onMemory: async (verb, name, content) => {
      const applied = memoryVerbs.applyMemoryVerb(memoryNow, verb, name, content, () => `id-${memoryNow.length + 1}`, 5);
      memoryNow = applied.notes;
      return applied.output;
    }
  };
  const written = await tools.runTool({ tool: "memory_write", name: "coffee", content: "Oat milk latte" }, memoryEnv);
  must("a written memory lands in the list", written.ok && written.output === "Saved memory coffee." && memoryNow.length === 1 && memoryNow[0].name === "coffee" && memoryNow[0].text === "Oat milk latte");
  const appended = await tools.runTool({ tool: "memory_append", name: "coffee", content: "Extra shot when tired" }, memoryEnv);
  must("an appended memory joins the note", appended.ok && memoryNow[0].text === "Oat milk latte\nExtra shot when tired");
  await tools.runTool({ tool: "memory_write", name: "tea", content: "Green in the morning" }, memoryEnv);
  const deleted = await tools.runTool({ tool: "memory_delete", name: "tea" }, memoryEnv);
  must("a deleted memory leaves the list", deleted.ok && deleted.output === "Deleted memory tea." && memoryNow.length === 1 && memoryNow[0].name === "coffee");

  shown("the prompt builder sends the written memory", (() => {
    const prompt = api.systemPrompt({ settings: { model: "grok-4.7", effort: "xhigh", memoryOn: true }, messages: [], skills: [], connectors: [], memories: memoryVerbs.memoryPromptLines(memoryNow), mode: "chat" });
    return prompt.includes("coffee: Oat milk latte") && prompt.includes("Extra shot when tired");
  })());
  shown("memory off keeps notes out of the request", (() => {
    const prompt = api.systemPrompt({ settings: { model: "grok-4.7", effort: "xhigh", memoryOn: false }, messages: [], skills: [], connectors: [], memories: memoryVerbs.memoryPromptLines(memoryNow), mode: "chat" });
    return prompt.includes("(memory off or empty)") && !prompt.includes("Oat milk latte");
  })());

  const capped = memoryVerbs.applyMemoryVerb([], "write", "n".repeat(80), "c".repeat(5000), () => "id1", 1);
  must("names and text are capped", capped.ok && capped.notes[0].name.length === memoryVerbs.MEMORY_NAME_LIMIT && capped.notes[0].text.length === memoryVerbs.MEMORY_TEXT_LIMIT);
  const unnamed = memoryVerbs.applyMemoryVerb([], "write", "", "content", () => "id1", 1);
  must("a verb without a name is refused", unnamed.ok === false && /name/.test(unnamed.output));
  const appendNew = memoryVerbs.applyMemoryVerb([], "append", "fresh", "line", () => "id-new", 2);
  must("append creates a missing note", appendNew.ok && appendNew.notes[0].name === "fresh" && appendNew.output === "Saved memory fresh.");
  const missingDelete = memoryVerbs.applyMemoryVerb([], "delete", "ghost", "", () => "id1", 1);
  must("deleting a missing note says so", missingDelete.ok && missingDelete.output === "No memory named ghost." && missingDelete.notes.length === 0);
  const rewrite = memoryVerbs.applyMemoryVerb([{ id: "keep", name: "Coffee", text: "old", updatedAt: 1 }], "write", "coffee", "new text", () => "id2", 2);
  must("write replaces the same note by name, case-insensitively", rewrite.notes.length === 1 && rewrite.notes[0].id === "keep" && rewrite.notes[0].text === "new text" && rewrite.notes[0].updatedAt === 2);
}

if (failures.length) {
  console.log(failures.join("\n"));
  process.exit(1);
}

// Plugin packages: the loader parses real folders — skills with frontmatter and
// .mcp.json servers — and skips folders without a plugin.json.
{
  const plugins = require(path.join(root, "electron", "plugins.cjs"));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "modbitx-plugins-"));
  fs.mkdirSync(path.join(tmp, "plugins", "demo", "skills", "greet"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "plugins", "demo", "plugin.json"), JSON.stringify({ name: "demo", description: "A test package" }));
  fs.writeFileSync(path.join(tmp, "plugins", "demo", ".mcp.json"), JSON.stringify({ mcpServers: { helper: { command: "node", args: ["server.js"] } } }));
  fs.writeFileSync(path.join(tmp, "plugins", "demo", "skills", "greet", "SKILL.md"), "---\nname: Greet\ndescription: Greets a person.\n---\nOpen with the name.\n");
  fs.mkdirSync(path.join(tmp, "plugins", "loose"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "plugins", "loose", "readme.txt"), "not a package");
  const dir = path.join(tmp, "plugins");
  const skills = plugins.readPluginSkills(dir);
  const servers = plugins.readPluginServers(dir);
  must("a plugin package loads its skills", skills.length === 1 && skills[0].name === "Greet" && skills[0].id === "plugin:demo:greet" && skills[0].instructions === "Open with the name.");
  must("a plugin package exposes its mcp servers", servers.length === 1 && servers[0].id === "plugin-demo-helper" && servers[0].command === "node server.js");
  must("a folder without plugin.json is skipped", plugins.readPluginSkills(dir).every((skill) => !skill.id.includes("loose")));
  must("frontmatter parsing keeps bare markdown whole", plugins.parseSkillMd("Just body").name === "" && plugins.parseSkillMd("Just body").body === "Just body");
  fs.rmSync(tmp, { recursive: true, force: true });
}

shippedToolChecks().then(() => {
  if (failures.length) {
    console.log(failures.join("\n"));
    process.exit(1);
  }
  console.log("local jobs ok");
}, (error) => {
  failures.push(`shipped tool checks threw: ${error?.message || error}`);
  console.log(failures.join("\n"));
  process.exit(1);
});
