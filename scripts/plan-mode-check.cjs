const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const src = path.join(root, "src");
const section = process.argv[2] || "all";
const failures = [];

function must(name, cond) {
  if (!cond) failures.push(name);
  return cond;
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

function finish(label) {
  if (failures.length) {
    console.log(failures.map((item) => `FAIL ${item}`).join("\n"));
    console.log(`${label}_FAIL`);
    process.exit(1);
  }
  console.log(`${label}_OK`);
}

function gate() {
  const agent = load("agent.ts");
  const api = load("api.ts");
  const { DEFAULT_SETTINGS } = load("catalog.ts");
  const { PLAN_ENTER, applyPlanGate, enterPlanThisTurn, permissionAfterApproval, approvedPlanForTurn, builtinCommands } = agent;
  must("threshold is 0.72", PLAN_ENTER === 0.72);
  const judge = (needsPlan, ok = true) => ({ ok, needsPlan });
  const row = (permission, mode, needsPlan, ok = true) => {
    const result = applyPlanGate(permission, mode, needsPlan == null ? { ok } : judge(needsPlan, ok));
    const label = needsPlan == null ? "missing" : ok ? String(needsPlan) : `failed:${needsPlan}`;
    console.log(`${permission} ${mode} ${label} enter=${result.enter}`);
    return result.enter;
  };
  must("0.72 ask enters", row("ask", "code", 0.72) === true);
  must("0.95 ask enters", row("ask", "code", 0.95) === true);
  must("0.72 accept-edits enters", row("accept-edits", "code", 0.72) === true);
  must("0.95 accept-edits enters", row("accept-edits", "code", 0.95) === true);
  must("0.71 does not enter", row("ask", "code", 0.71) === false);
  must("missing score does not enter", row("ask", "code", null, true) === false);
  must("plan does not enter", row("plan", "code", 0.99) === false);
  must("auto does not enter", row("auto", "code", 0.99) === false);
  must("bypass does not enter", row("bypass", "code", 0.99) === false);
  must("chat does not enter", row("ask", "chat", 0.99) === false);
  must("cowork does not enter", row("ask", "cowork", 0.99) === false);
  must("failed judgment does not enter", row("ask", "code", 0.99, false) === false);

  const high = judge(0.95);
  const approval = enterPlanThisTurn("ask", "code", high, true);
  const later = enterPlanThisTurn("ask", "code", high, false);
  console.log(`approval usePlan enter=${approval.enter}`);
  console.log(`later send after approved plan enter=${later.enter}`);
  must("approval turn does not enter", approval.enter === false);
  must("a later send after an approved plan still enters", later.enter === true);
  must("a fresh high score still enters", enterPlanThisTurn("ask", "code", high, false).enter === true);

  console.log(`restore accept-edits=${permissionAfterApproval("accept-edits")}`);
  console.log(`restore missing=${permissionAfterApproval(undefined)}`);
  console.log(`restore plan=${permissionAfterApproval("plan")}`);
  must("approval restores accept-edits", permissionAfterApproval("accept-edits") === "accept-edits");
  must("approval restores ask when unset", permissionAfterApproval(undefined) === "ask");
  must("approval restores ask when the saved mode is plan", permissionAfterApproval("plan") === "ask");

  const planText = "Ship the login form by editing src/login.ts";
  const given = approvedPlanForTurn("ask", planText, "review", true);
  const hidden = approvedPlanForTurn("plan", planText, "approved", true);
  must("implementation turn receives the plan", given === planText);
  must("plan mode does not receive the implement text", hidden === undefined);
  const prompt = api.systemPrompt({
    settings: DEFAULT_SETTINGS,
    messages: [],
    skills: [],
    memories: [],
    mode: "code",
    planMode: false,
    approvedPlan: given
  });
  console.log(`system prompt contains the approved plan=${prompt.includes(planText)}`);
  must("system prompt carries the approved plan", prompt.includes(planText) && prompt.includes("Implement it"));

  const names = builtinCommands(true).map((command) => command.name);
  console.log(`commands=${names.join(",")}`);
  must("composer lists plan and view-plan", names.includes("plan") && names.includes("view-plan"));
  finish("GATE");
}

function desktopEnv(permissionMode, bridge, approvals, savedPlans) {
  return {
    folder: path.join(root, "fixtures-plan"),
    computerEnabled: false,
    computerMode: "background",
    permissionMode,
    computerSession: { allowed: false },
    simSession: { allowed: false },
    allowedHosts: new Set(),
    blockedHosts: new Set(),
    highRiskHosts: new Set(),
    persistedHosts: new Set(),
    site: { host: "" },
    harnessOn: false,
    design: { name: "Paper", ink: "#111", paper: "#fff", accent: "#800", font: "sans", radius: 8, space: 8, components: "" },
    browserTools: false,
    simIos: false,
    simAndroid: false,
    allowBypass: true,
    fileTools: true,
    deniedApps: [],
    branchPrefix: "",
    approve: async (request) => {
      approvals.push(request.detail);
      return "task";
    },
    onBrowse: () => {},
    onScreenshot: () => {},
    onPlan: (text) => savedPlans.push(text),
    onPlanStatus: () => {}
  };
}

async function tools() {
  const calls = [];
  const bridge = {
    listDir: async () => [{ name: "readme.md", kind: "file" }],
    readFile: async () => "hello",
    writeFile: async () => {
      calls.push("writeFile");
      return "note.md";
    },
    rewindSave: async () => { calls.push("rewindSave"); },
    runCommand: async () => {
      calls.push("runCommand");
      return { code: 0, stdout: "ok", stderr: "" };
    },
    applyPatch: async () => {
      calls.push("applyPatch");
      return { code: 0, stdout: "Applied." };
    },
    git: async () => {
      calls.push("git");
      return { code: 0, stdout: "", stderr: "" };
    },
    rewindList: async () => [{ id: "snap-1" }],
    rewindRestore: async () => {
      calls.push("rewindRestore");
      return "note.md";
    },
    mcpStart: async () => { calls.push("mcpStart"); },
    mcpCall: async () => {
      calls.push("mcpCall");
      return { ok: true };
    },
    mcpTools: async () => []
  };
  global.window = { modbitx: bridge };
  const { runTool } = load("tools.ts");
  const approvals = [];
  const savedPlans = [];
  const env = desktopEnv("plan", bridge, approvals, savedPlans);
  const refused = "Plan mode only reads";

  async function one(call, expectRefuse) {
    const before = calls.length;
    const approvalBefore = approvals.length;
    const result = await runTool(call, env);
    const grew = calls.length > before;
    const asked = approvals.length > approvalBefore;
    const isRefused = result.ok === false && result.output.includes(refused);
    console.log(`${call.tool} ${call.command || ""} plan refused=${isRefused} ok=${result.ok} sideEffect=${grew} approval=${asked} output=${result.output.split("\n")[0]}`);
    if (expectRefuse) {
      must(`${call.tool} ${call.command || ""} refused in plan`, isRefused && !grew && !asked);
    }
    return result;
  }

  await one({ tool: "write_file", path: "note.md", content: "x" }, true);
  await one({ tool: "run", command: "echo hi" }, true);
  await one({ tool: "apply_patch", content: "--- a/file\n+++ b/file\n@@ -1 +1 @@\n-old\n+new" }, true);
  await one({ tool: "git", command: "commit", message: "save" }, true);
  await one({ tool: "git", command: "branch", message: "feature-login" }, true);
  await one({ tool: "rewind" }, true);
  await one({ tool: "mcp", command: "node server.js" }, true);
  await one({ tool: "mcp", name: "echo" }, true);

  const listed = await runTool({ tool: "list_dir", path: "." }, env);
  const read = await runTool({ tool: "read_file", path: "readme.md" }, env);
  console.log(`list_dir plan refused=${listed.output.includes(refused)} ok=${listed.ok} output=${listed.output.split("\n")[0]}`);
  console.log(`read_file plan refused=${read.output.includes(refused)} ok=${read.ok} output=${read.output.split("\n")[0]}`);
  must("list_dir is allowed in plan", listed.ok === true && !listed.output.includes(refused));
  must("read_file is allowed in plan", read.ok === true && read.output.includes("hello") && !read.output.includes(refused));

  const approvalBefore = approvals.length;
  const writesBefore = calls.filter((item) => item === "writeFile").length;
  const planned = await runTool({ tool: "write_plan", content: "Edit src/login.ts and verify the form." }, env);
  console.log(`write_plan ok=${planned.ok} approval=${approvals.length > approvalBefore} fileWrite=${calls.filter((item) => item === "writeFile").length > writesBefore} saved=${savedPlans[0] || ""}`);
  must("write_plan succeeds without an edit approval", planned.ok === true && approvals.length === approvalBefore && calls.filter((item) => item === "writeFile").length === writesBefore && savedPlans[0]?.includes("src/login.ts"));

  env.permissionMode = "ask";
  const after = await runTool({ tool: "write_file", path: "note.md", content: "after" }, env);
  console.log(`write_file ask refused=${after.output.includes(refused)} ok=${after.ok} output=${after.output.split("\n")[0]}`);
  must("write after leaving plan is not a plan refusal", after.ok === true && !after.output.includes(refused) && calls.includes("writeFile"));
  finish("TOOLS");
}

function ui() {
  const { builtinCommands } = load("agent.ts");
  const names = builtinCommands(true).map((command) => command.name);
  must("plan command", names.includes("plan"));
  must("view-plan command", names.includes("view-plan"));
  const thread = fs.readFileSync(path.join(src, "components/ThreadView.tsx"), "utf8");
  const composer = fs.readFileSync(path.join(src, "components/Composer.tsx"), "utf8");
  const dock = fs.readFileSync(path.join(src, "components/CodeDock.tsx"), "utf8");
  const settings = fs.readFileSync(path.join(src, "components/SettingsView.tsx"), "utf8");
  const approveAt = thread.indexOf("function approvePlan");
  const approve = thread.slice(approveAt, approveAt + 700);
  console.log(`composer uses builtin commands=${composer.includes("builtinCommands(")}`);
  console.log(`view-plan handler=${thread.includes('name === "view-plan"')}`);
  console.log(`plan slash=${thread.includes('plan: "plan"')}`);
  console.log(`approve continues=${approve.includes("permissionAfterApproval") && approve.includes("usePlan: true") && approve.includes('send(')}`);
  console.log(`approve label=${thread.includes("Approve and build")}`);
  const codeAt = settings.indexOf("function Code()");
  const code = settings.slice(codeAt, settings.indexOf("function Cowork()"));
  console.log(`dock plan option=${dock.includes('"ask", "accept-edits", "plan", "auto"')}`);
  console.log(`settings plan option=${code.includes('"ask", "accept-edits", "plan", "auto"') && code.includes("permissionLabel(mode)")}`);
  must("composer shows the command list", composer.includes("builtinCommands("));
  must("view-plan is handled", thread.includes('name === "view-plan"'));
  must("slash plan switches mode", thread.includes('plan: "plan"'));
  must("approval continues into implementation", approve.includes("permissionAfterApproval") && approve.includes("usePlan: true") && thread.includes("Approve and build"));
  must("code dock offers plan", dock.includes('"ask", "accept-edits", "plan", "auto"') && dock.includes("permissionLabel(mode)"));
  must("code settings offer plan", code.includes("aria-label=\"Default permission\"") && code.includes('"plan"') && code.includes("permissionLabel(mode)"));
  finish("UI");
}

async function jev() {
  const { prepareQuestions } = require(path.join(root, "electron/plan-question.cjs"));
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) {
    console.log(JSON.stringify({ ok: false, reason: "TYPESAFE_API_KEY is not set" }, null, 2));
    return;
  }
  async function sample(message) {
    const prepared = prepareQuestions({ mode: "code", message, skills: [] });
    const response = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "jev-1.13.0", state: prepared.state, questions: prepared.questions })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(body).slice(0, 300)}`);
    return {
      message,
      model: body.model,
      needsPlan: body.answers?.needs_plan?.noul,
      question: prepared.questions.needs_plan
    };
  }
  const [feature, typo] = await Promise.all([
    sample("Add user authentication"),
    sample("Fix the typo in README")
  ]);
  const report = {
    ok: feature.needsPlan >= 0.72 && typo.needsPlan < 0.72,
    feature,
    typo
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

function sessions() {
  const agent = load("agent.ts");
  const {
    assistantReply, autoTitle, builtinCommands, canonicalSlash, exportTranscript, forkedThread,
    parseCopyRequest, parseRename, resumeList, resumeMatch, rewindPoints, rewindTo,
    safeExportName, sessionFileWriteAllowed, stripWorktreeFlag
  } = agent;
  const names = builtinCommands(true).map((command) => command.name);
  for (const name of ["new", "clear", "resume", "fork", "rewind", "undo", "copy", "export", "rename", "title"]) {
    must(`command ${name}`, names.includes(name));
  }
  must("clear aliases new", canonicalSlash("clear") === "new" && canonicalSlash("undo") === "rewind" && canonicalSlash("title") === "rename");
  must("plan still aliases to itself", canonicalSlash("plan") === "plan");

  const rows = [
    { id: "current", title: "Login", updatedAt: 3 },
    { id: "older", title: "Readme typo", updatedAt: 1 },
    { id: "newer", title: "Add user authentication", updatedAt: 4 },
    { id: "hidden", title: "Old draft", updatedAt: 9, archived: true },
    { id: "same", title: "Login", updatedAt: 2 }
  ];
  const listed = resumeList(rows, "", "current").map((row) => row.id);
  console.log(`resume list=${listed.join(",")}`);
  must("resume list skips the open chat and archived", listed.join(",") === "newer,same,older");
  must("resume query with no text opens the picker", resumeMatch(rows, "", "current").status === "list");
  must("unique title resumes", resumeMatch(rows, "readme typo", "current").id === "older");
  must("id prefix resumes", resumeMatch(rows, "new", "current").id === "newer");
  must("two titles named Login open the picker", resumeMatch(rows, "login", "current").status === "list");
  must("unknown title misses", resumeMatch(rows, "missing chat", "current").status === "none");
  must("the open chat is not switched", resumeMatch([{ id: "current", title: "Login", updatedAt: 1 }], "login", "current").status === "current");

  const messages = [
    { id: "u1", role: "user", content: "Add user authentication" },
    { id: "a1", role: "assistant", content: "First reply" },
    { id: "u2", role: "user", content: "Fix the typo in README" },
    { id: "a2", role: "assistant", content: "Second reply" }
  ];
  const points = rewindPoints(messages);
  console.log(`rewind points=${points.map((point) => point.messageId).join(",")}`);
  must("rewind points are newest first", points.map((point) => point.messageId).join(",") === "u2,u1");
  const kept = rewindTo(messages, "u1");
  must("rewind keeps the chosen prompt", kept && kept.map((message) => message.id).join(",") === "u1");
  const later = rewindTo(messages, "u2");
  must("rewind to the last prompt drops the reply after it", later && later.map((message) => message.id).join(",") === "u1,a1,u2");
  const trailing = [...messages, { id: "u3", role: "user", content: "Last prompt" }];
  must("rewind to a trailing prompt drops nothing", rewindTo(trailing, "u3").length === trailing.length);
  must("rewind ignores an assistant id", rewindTo(messages, "a2") === null);
  must("latest reply is 1", assistantReply(messages, 1) === "Second reply");
  must("earlier reply is 2", assistantReply(messages, 2) === "First reply");
  must("missing reply is null", assistantReply(messages, 3) === null);

  must("copy latest", parseCopyRequest("").nth === 1 && !parseCopyRequest("").file);
  must("copy second to a file", parseCopyRequest("2 reply.md").nth === 2 && parseCopyRequest("2 reply.md").file === "reply.md");
  must("copy a named file", parseCopyRequest("notes.md").file === "notes.md");
  must("copy rejects 0", Boolean(parseCopyRequest("0").error));
  must("safe name", safeExportName("reply.md") === "reply.md");
  must("path is rejected", safeExportName("../reply.md") === null && safeExportName("/tmp/reply.md") === null);
  must("plan cannot write a session file", sessionFileWriteAllowed("plan") === false && sessionFileWriteAllowed("ask") === true);
  const transcript = exportTranscript("Login", messages);
  must("transcript names the speakers", transcript.startsWith("# Login") && transcript.includes("## You") && transcript.includes("## Modbitx") && transcript.includes("Second reply"));

  const source = {
    id: "src",
    title: "Login (fork)",
    mode: "code",
    messages: [{ id: "u1", role: "user", content: "keep", createdAt: 1 }],
    pinned: true,
    archived: false,
    incognito: false,
    starred: true,
    model: "grok-4.7",
    effort: "xhigh",
    folder: "/repo",
    plan: "Edit src/login.ts",
    createdAt: 1,
    updatedAt: 2
  };
  const copy = forkedThread(source, "copy", 5);
  copy.messages[0].content = "changed";
  console.log(`fork title=${copy.title} pinned=${copy.pinned} sameFolder=${copy.folder === source.folder}`);
  must("fork title does not stack", copy.title === "Login (fork)");
  must("fork copies messages", source.messages[0].content === "keep" && copy.messages[0].content === "changed");
  must("fork drops pin and star", copy.pinned === false && copy.starred === false);
  must("fork keeps the folder and plan", copy.folder === "/repo" && copy.plan === "Edit src/login.ts");
  must("fork is a new id", copy.id === "copy" && copy.createdAt === 5);

  const worktree = stripWorktreeFlag("--worktree add a login form");
  const plain = stripWorktreeFlag("--no-worktree add a login form");
  must("worktree flag is requested and removed", worktree.worktree === true && worktree.rest === "add a login form");
  must("no-worktree is only removed", plain.worktree === false && plain.rest === "add a login form");
  must("auto title uses the first prompt", autoTitle("code", messages) === "Add user authentication");
  must("empty code title", autoTitle("code", []) === "New session");
  must("rename stores the title", parseRename("  Night  shift ").title === "Night shift");
  must("rename auto", parseRename("--auto").auto === true);
  must("rename auto rejects extra text", Boolean(parseRename("--auto Night").error));
  must("rename requires a title", Boolean(parseRename("").error));

  const thread = fs.readFileSync(path.join(src, "components/ThreadView.tsx"), "utf8");
  const store = fs.readFileSync(path.join(src, "store.tsx"), "utf8");
  const composer = fs.readFileSync(path.join(src, "components/Composer.tsx"), "utf8");
  const runSlash = composer.slice(composer.indexOf("function runSlash"), composer.indexOf("function submit"));
  must("a slash command can put text back in the composer", runSlash.indexOf('setDraft("")') >= 0 && runSlash.indexOf("onSlash(") > runSlash.indexOf('setDraft("")'));
  must("resume opens the picker", thread.includes('kind: "resume"') && thread.includes("resumeMatch("));
  must("rewind tells the user files stay", thread.includes("Rewound the conversation. Files already written stay on disk."));
  must("fork creates a worktree when asked", thread.includes("flags.worktree") && thread.includes("Choose a worktree folder in Settings"));
  must("plan mode blocks the session file write", thread.includes("sessionFileWriteAllowed"));
  must("store forks through forkedThread", store.includes("forkedThread(source"));
  must("select follows the chat mode", store.includes("mode: thread.mode"));
  finish("SESSIONS");
}

const runners = { gate, tools, ui, jev, sessions };
(async () => {
  const names = section === "all" ? ["gate", "tools", "ui", "sessions"] : [section];
  for (const name of names) {
    if (!runners[name]) {
      console.log(`Unknown section ${name}`);
      process.exit(1);
    }
    await runners[name]();
  }
})().catch((error) => {
  console.log(`FAIL ${error instanceof Error ? error.stack || error.message : error}`);
  process.exit(1);
});
