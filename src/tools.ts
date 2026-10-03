import { parseTodos } from "./agent";
import { branchName } from "./branch";
import { interpretDesign, type DesignSystem } from "./design";
import { actionToCall, browserOptions, controlsFromDom, decideBrowserStep, markHighRisk, MAX_BROWSER_STEPS, siteGate, valuesInGoal } from "./harness";
import { formatAnswer, normalizeQuestion, type Question } from "./questions";
import { verdictFor } from "./approvals";
import { parseSubagentGoals } from "./bgtasks";
import { runSimulator } from "./simulator";

export interface ToolCall {
  tool: string;
  path?: string;
  url?: string;
  command?: string;
  content?: string;
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
  text?: string;
  key?: string;
  selector?: string;
  name?: string;
  app?: string;
  kind?: string;
  message?: string;
  target?: string;
  args?: Record<string, unknown>;
  /** ask_user: labels to pick from, sent instead of one-per-line content. */
  options?: string[];
  /** ask_user scale bounds. */
  min?: number;
  max?: number;
  step?: number;
  /** messages_recent: how many chats to list. */
  limit?: number;
  /** search_repo: the pattern to find. */
  pattern?: string;
}

export interface ToolResult {
  call: ToolCall;
  ok: boolean;
  output: string;
  image?: string;
}

const FENCE = /```tool\s*\n([\s\S]*?)```/g;

export function parseTools(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const re = new RegExp(FENCE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    try {
      const parsed = JSON.parse(match[1]) as ToolCall;
      if (parsed && typeof parsed.tool === "string") calls.push(parsed);
    } catch {
      calls.push({ tool: "invalid", text: match[1].slice(0, 200) });
    }
  }
  return calls;
}

export function toolGuide(mode: string): string {
  if (mode === "chat") return "Chat has no desktop tools. Answer in prose. Use an artifact fence for previews.";
  return [
    `You are driving Modbitx ${mode} on the user's Mac. Do the work with tools, then explain what changed.`,
    "Call the provided functions for each step. Wait for the tool result before the next step. When the task is finished, answer in prose and do not call another tool.",
    "On the desktop, call screenshot before the first click, type, hotkey, scroll, mouse_move, or drag. Use the image pixels. Set click text to right or double when needed. drag uses x,y and x2,y2. clipboard_read returns the current clipboard. paste writes text and presses Command-V. After a desktop action, an updated screenshot is attached for the next click.",
    "Tools:",
    '{"tool":"list_dir","path":"<absolute or folder-relative path>"}',
    '{"tool":"read_file","path":"<path>"}',
    '{"tool":"write_file","path":"<path relative to the granted folder>","content":"<text>"}',
    '{"tool":"run","command":"<shell command in the granted folder>"}',
    '{"tool":"browse","url":"https://..."}',
    '{"tool":"page_text"}',
    '{"tool":"page_dom"}',
    '{"tool":"page_click","selector":"button"}',
    '{"tool":"page_fill","selector":"input","text":"value"}',
    '{"tool":"page_press","key":"Enter"}',
    '{"tool":"page_scroll","y":700}',
    '{"tool":"page_choose","name":"Size","text":"Large"}',
    '{"tool":"page_upload","path":"notes.pdf","selector":"input[type=file]"}',
    '{"tool":"page_dialog","text":"accept"}',
    '{"tool":"page_shot"}',
    '{"tool":"browser_task","url":"https://example.com","text":"what to accomplish on the site"}',
    "For a multi-step site task, call browser_task once. Jev 1.13 chooses each click, fill, or scroll from the controls on the page. Use page_* when you already know the exact control. browser_task stops before a submit, payment, send, or delete until the user allows that step.",
    '{"tool":"design_review","content":"<!doctype html>","message":"what the screen is for"}',
    '{"tool":"sim_list"}',
    '{"tool":"sim_boot","target":"<udid or avd:Name>"}',
    '{"tool":"sim_shot","target":"<udid>"}',
    '{"tool":"sim_tap","target":"<udid>","x":120,"y":240}',
    '{"tool":"sim_swipe","target":"<udid>","x":120,"y":400,"x2":120,"y2":180}',
    '{"tool":"sim_text","target":"<udid>","text":"hello"}',
    '{"tool":"sim_button","target":"<udid>","text":"home"}',
    '{"tool":"sim_open","target":"<udid>","url":"https://example.com"}',
    '{"tool":"sim_install","target":"<udid>","path":"App.app"}',
    '{"tool":"sim_launch","target":"<udid>","name":"com.example.app"}',
    '{"tool":"sim_shutdown","target":"<udid>"}',
    "Simulator coordinates are pixels of the latest sim_shot, origin top-left. iOS taps use the Simulator window. Android taps use adb on an emulator. Physical phones are not used. The task asks before the first simulator action. sim_button text is home, back, enter, lock, light, or dark.",
    '{"tool":"screenshot"}',
    '{"tool":"apps"}',
    '{"tool":"focus_app","app":"Notes"}',
    '{"tool":"click","x":120,"y":240,"text":"left"}',
    '{"tool":"mouse_move","x":120,"y":240}',
    '{"tool":"drag","x":120,"y":240,"x2":300,"y2":360}',
    '{"tool":"clipboard_read"}',
    '{"tool":"paste","text":"hello"}',
    '{"tool":"wait","y":1}',
    '{"tool":"type","text":"hello"}',
    '{"tool":"key","key":"return"}',
    '{"tool":"hotkey","key":"c","text":"command"}',
    '{"tool":"scroll","text":"down","y":3}',
    '{"tool":"git","command":"status"}',
    '{"tool":"git","command":"branch","message":"fix-login"}',
    '{"tool":"git","command":"worktree","message":"fix-login"}',
    '{"tool":"apply_patch","content":"--- a/file\\n+++ b/file\\n@@ -1 +1 @@\\n-old\\n+new"}',
    '{"tool":"ssh","command":"uname -a"}',
    '{"tool":"doc_read","path":"file.pdf"}',
    '{"tool":"doc_write","kind":"docx","path":"notes.docx","content":"Hello"}',
    '{"tool":"doc_write","kind":"docx","path":"notes.docx","content":"APPEND\\nMore text"}',
    '{"tool":"doc_write","kind":"pdf","path":"notes.pdf","content":"One page"}',
    '{"tool":"rewind"}',
    '{"tool":"write_plan","content":"<markdown plan>"}',
    '{"tool":"exit_plan"}',
    '{"tool":"ask_user","text":"Which color?","options":["Red","Green","Blue"]}',
    '{"tool":"ask_user","text":"What should the note say?"}',
    '{"tool":"ask_user","text":"Ship it?","kind":"multi","options":["Docs","Tests","Changelog"]}',
    '{"tool":"ask_user","text":"Rate the draft","kind":"scale","min":1,"max":10}',
    '{"tool":"todo","content":"doing Read the router\\npending Add the route\\ndone Types"}',
    '{"tool":"memory_write","name":"coffee","content":"Oat milk latte"}',
    '{"tool":"memory_append","name":"coffee","content":"Extra shot when tired"}',
    '{"tool":"memory_delete","name":"coffee"}',
    '{"tool":"scratchpad_update","content":"- auth.ts owns the token refresh\\n- tests fail on timezone"}',
    "In plan mode, read first, then write_plan and exit_plan. Do not edit files until the user approves. ask_user stops for one answer: listed options make a single choice, kind multi lets the user tick several, kind scale shows a range, and no options is a free-text question. todo replaces the task list. A line may start with doing, pending, or done.",
    "Memory notes live on this Mac and join every request when memory is on. memory_write replaces the note with that name or adds it, memory_append adds a line to it, memory_delete removes it. Ask before deleting a note the user wrote themselves.",
    "The scratchpad is this session's own working notes, kept across turns and shown to nobody else. scratchpad_update replaces it with short lines worth remembering for the rest of the task; scratchpad_read fetches it back. It is cleared never — start every Code or Cowork turn by reading it.",
    "messages_recent lists this Mac's Messages chats with their latest line; messages_send needs target (a name or phone number) and content. Sending asks before it goes, every time. macOS asks once for permission to control Messages.",
    "search_repo runs the bundled ripgrep over the granted folder: give the pattern in selector. It respects .gitignore and is the fast way to find where something is defined.",
    "latex_compile compiles a .tex file in the granted folder with this Mac's Tectonic or TeX toolchain and reports the PDF. It names the install command when no toolchain exists.",
    "Recording never starts on its own. /record start and /record stop (or record_start and record_stop) frame the screen every 5 seconds with the frontmost app named, keeping the last 20 minutes in temp; computer_history reads that timeline. Starting a recording asks first.",
    "The task VM is a disposable Alpine machine under QEMU with hardware acceleration: vm_boot brings it up (asks once; the first boot downloads ~35MB of boot files), vm_exec runs commands inside it — isolated from this Mac, discarded on vm_stop — and vm_status reports state. Nothing on this Mac is mounted.",
    "Command rules persist in Settings → Privacy: an allow rule (word prefix, like npm or git commit) skips the approval prompt, a deny rule refuses outright, and the approval card offers Always allow for commands. No rule means the session permission mode decides.",
    "Dynamic workflows: spawn_subagents takes one goal per line (up to six) and runs them as subagents beside this chat — the user approves the first fan-out per session; read_subagents returns each status and answer. Subagents answer from the model without desktop tools; do machine work yourself.",
    "Computer use defers to the human: click, type, key, hotkey, paste, drag, move, scroll, and focus_app are refused while Secure Input holds the keyboard or while the user typed within the last two seconds. Wait a moment and retry; screenshot and clipboard_read stay available.",
    "Connector tools (Slack, Linear) need their connector switched on in Settings → Connectors and the credentials pasted there. slack_post and slack_read take a channel ID; posting asks first. linear_search takes the text to match against issue titles.",
    "Connector tools for Jira (jira_search takes JQL, jira_comment asks first), Notion (notion_search, notion_append asks first), Figma (figma_comments takes the file key from the URL), Sentry (sentry_issues for the organization), and Stripe (stripe_balance, stripe_charges, read-only) work the same way: switch the connector on and paste its credentials in Settings → Connectors.",
    "page_* acts inside the built-in browser. After a page action, a new picture of the page and its controls are attached. A file the page downloads is saved into the granted folder, or Downloads if no folder is granted. page_upload sets a file input from a path inside that folder. Alerts are dismissed. A confirm() is denied unless page_dialog accept was called first, and the dialog text is included in the result. screenshot, focus_app, click, type, and key are computer use. focus_app uses background mode unless the user asked to take over the screen. git, ssh, write_file, and run follow the session permission mode. Plan mode refuses edits. Auto lets Jev 1.13 allow a safe edit and asks otherwise. git branch uses the branch prefix from Settings. git worktree creates a folder under the worktree location in Settings → Code. doc_write content that starts with APPEND and a newline keeps the existing file and adds to it. kind pdf writes one page of text."
  ].join("\n");
}

export interface ApprovalRequest {
  kind: "browser" | "computer" | "simulator" | "commit";
  detail: string;
  highRisk?: boolean;
  /** Ask even when this task already allowed computer actions. */
  fresh?: boolean;
}

export interface DesktopEnv {
  folder?: string;
  computerEnabled: boolean;
  computerMode: "background" | "takeover";
  permissionMode: "ask" | "accept-edits" | "plan" | "auto" | "bypass";
  hookAllow?: boolean;
  hookSettled?: boolean;
  hookContext?: string;
  sshTarget?: string;
  computerSession: { allowed: boolean };
  simSession: { allowed: boolean };
  allowedHosts: Set<string>;
  blockedHosts: Set<string>;
  highRiskHosts: Set<string>;
  persistedHosts: Set<string>;
  site: { host: string };
  harnessOn: boolean;
  design: DesignSystem;
  browserTools: boolean;
  simIos: boolean;
  simAndroid: boolean;
  allowBypass: boolean;
  fileTools: boolean;
  deniedApps: string[];
  branchPrefix: string;
  worktreeLocation?: string;
  approve: (request: ApprovalRequest) => Promise<"once" | "task" | "always" | "no">;
  onBrowse: (url: string) => void;
  onScreenshot: (dataUrl: string) => void;
  onNote?: (note: string) => void;
  onHighRisk?: (host: string) => void;
  judgeSite?: (host: string, url: string) => Promise<number>;
  judgeAction?: (detail: string) => Promise<"allow" | "ask" | "deny">;
  /** Resolves with the raw answer: a picked label, labels joined with ", ", a number, or typed text. */
  askUser?: (prompt: string, options: string[], question?: Question) => Promise<string>;
  /** Applies one memory verb on this Mac and returns the result line. */
  onMemory?: (verb: "write" | "append" | "delete", name: string, content: string) => Promise<string>;
  /** Scratchpad verbs: read the session notes, or replace them. */
  onScratchpad?: (action: "read" | "update", content: string) => string;
  /** The Messages connector is switched on in Settings → Connectors. */
  messagesOn?: boolean;
  /** Computer use defers while the human is typing or Secure Input holds the keyboard. */
  computerGuard?: boolean;
  /** Reads the typing/Secure-Input guard from the login session. */
  guardCheck?: () => Promise<{ secureInput: boolean; sinceKey: number; sinceMouse: number; error?: string }>;
  /** The Slack connector is switched on, with a bot token stored. */
  slackOn?: boolean;
  slackToken?: string;
  /** The Linear connector is switched on, with an API key stored. */
  linearOn?: boolean;
  linearKey?: string;
  jiraOn?: boolean;
  jiraDomain?: string;
  jiraEmail?: string;
  jiraToken?: string;
  notionOn?: boolean;
  notionToken?: string;
  figmaOn?: boolean;
  figmaToken?: string;
  sentryOn?: boolean;
  sentryToken?: string;
  sentryOrg?: string;
  stripeOn?: boolean;
  stripeKey?: string;
  /** The task VM (disposable Alpine under QEMU) is switched on. */
  taskVm?: boolean;
  /** Persistent command approval rules from Settings. */
  commandRules?: { id: string; pattern: string; verdict: "allow" | "deny"; createdAt: number }[];
  /** Dynamic workflows: the model may fan out subagents (session-gated). */
  dynamicWorkflows?: boolean;
  subagentsAllowed?: { allowed: boolean };
  onSubagents?: (goals: string[]) => string[];
  readSubagents?: () => { id: string; prompt: string; status: string; answer: string }[];
  onPlan?: (text: string) => void;
  onPlanStatus?: (status: "draft" | "review" | "approved") => void;
  onTodos?: (items: { id: string; title: string; status: "pending" | "doing" | "done" }[]) => void;
  runHook?: (call: ToolCall) => Promise<{ decision: "allow" | "deny" | "ask" | "none"; reason: string; context: string }>;
  onSimulator?: (view: { name: string; image?: string; note: string; udid?: string }) => void;
}

/**
 * Computer use defers to the human: a click, keystroke, or paste is refused
 * while Secure Input holds the keyboard (a password field has it) or while you
 * typed within the last two seconds. Reads are unaffected.
 */
async function guardComputer(env: DesktopEnv, action: string): Promise<void> {
  if (env.computerGuard === false || !env.guardCheck) return;
  const state = await env.guardCheck().catch(() => null);
  if (!state || state.error) return;
  if (state.secureInput) {
    throw new Error(`Secure Input is active, so ${action} is deferred. A password field holds the keyboard; finish it and ask again.`);
  }
  if (state.sinceKey < 2) {
    throw new Error(`You typed ${(Math.round(state.sinceKey * 10) / 10) || 0}s ago, so ${action} is deferred until the keyboard is free.`);
  }
}

async function ensureEdit(env: DesktopEnv, detail: string): Promise<void> {
  if (env.fileTools === false && /^(write|run|apply|git)/.test(detail)) {
    throw new Error("File and command tools are off. Turn them on in Settings → Capabilities.");
  }
  // Persistent command rules run before any mode logic: a deny refuses
  // outright, an allow skips the prompt, and no match falls through.
  const ruleCommand = /^run\s+(.+)$/i.exec(detail.trim())?.[1];
  if (ruleCommand && env.commandRules?.length) {
    const verdict = verdictFor(env.commandRules, ruleCommand);
    if (verdict === "deny") {
      throw new Error(`A command rule denies commands starting with "${ruleCommand.trim().split(/\s+/)[0]}". Review rules in Settings → Privacy.`);
    }
    if (verdict === "allow") return;
  }
  const mode = env.permissionMode === "bypass" && env.allowBypass === false ? "ask" : env.permissionMode;
  if (mode === "plan") throw new Error("Plan mode only reads. Approve the plan, or switch the session out of plan, before editing.");
  if (env.hookSettled) {
    env.hookSettled = false;
    return;
  }
  if (env.hookAllow) {
    env.hookAllow = false;
    return;
  }
  if (mode === "bypass") return;
  if (mode === "accept-edits" && detail.startsWith("write")) return;
  if (mode === "auto") {
    const decision = await env.judgeAction?.(detail).catch(() => "ask" as const) ?? "ask";
    if (decision === "deny") throw new Error("Jev 1.13 blocked this action. Switch to Ask if you want to approve it yourself.");
    if (decision === "allow") return;
  }
  const answer = await env.approve({ kind: "computer", detail });
  if (answer === "no") throw new Error("You denied this action.");
}

async function ensureSite(env: DesktopEnv, target: string, explicit: boolean): Promise<string> {
  const url = /^https?:\/\//i.test(target) ? target : `https://${target}`;
  const host = new URL(url).hostname;
  const persisted = env.persistedHosts.has(host);
  const session = env.allowedHosts.has(host);
  if (!env.highRiskHosts.has(host) && !persisted && !session && env.judgeSite) {
    const risk = await env.judgeSite(host, url);
    if (markHighRisk(risk)) {
      env.highRiskHosts.add(host);
      env.onHighRisk?.(host);
    }
  }
  const gate = siteGate({
    explicit,
    blocked: env.blockedHosts.has(host),
    high: env.highRiskHosts.has(host),
    persisted,
    session,
    sameHost: env.site.host === host
  });
  if (gate === "block") throw new Error(`${host} is blocked. Remove it in Settings → Cowork to open it.`);
  if (gate === "allow") {
    env.site.host = host;
    return url;
  }
  const answer = await env.approve({ kind: "browser", detail: host, highRisk: env.highRiskHosts.has(host) });
  if (answer === "no") throw new Error(`Didn’t open ${host}.`);
  if (!env.highRiskHosts.has(host) && (answer === "task" || answer === "always")) env.allowedHosts.add(host);
  env.site.host = host;
  return url;
}

async function runBrowserTask(call: ToolCall, env: DesktopEnv): Promise<ToolResult> {
  if (!env.harnessOn) return { call, ok: false, output: "The browser harness is off. Use browse and page_* directly, or turn it on in Settings → Cowork." };
  const goal = (call.text || call.content || "").trim();
  if (!goal) return { call, ok: false, output: "browser_task needs the goal in text." };
  const api = window.modbitx;
  if (!api?.jevBrowser) return { call, ok: false, output: "Desktop bridge is unavailable." };
  const lines: string[] = [];
  let image: string | undefined;
  if (call.url) {
    const opened = await runTool({ tool: "browse", url: call.url }, env);
    lines.push(opened.output.split("\n")[0] || "Opened");
    image = opened.image;
    if (!opened.ok) return { call, ok: false, output: lines.join("\n"), image };
  }
  const values = valuesInGoal(goal);
  for (let step = 1; step <= MAX_BROWSER_STEPS; step += 1) {
    let dom: Awaited<ReturnType<NonNullable<typeof window.modbitx>["browserDom"]>>;
    try {
      dom = await api.browserDom();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Open a page first.";
      return { call, ok: false, output: `${lines.join("\n")}\n${message}`.trim(), image };
    }
    const controls = controlsFromDom(dom.nodes);
    const headings = dom.nodes.filter((node) => /^h[1-3]$/.test(node.tag)).map((node) => node.text).filter(Boolean).slice(0, 6);
    const options = browserOptions(controls, values);
    env.onNote?.(`Reading ${dom.title || dom.url}`);
    const judgment = await api.jevBrowser({
      goal,
      url: dom.url,
      title: dom.title,
      headings,
      controls: controls.map((control) => ({ id: control.id, kind: control.kind, label: control.label })),
      options
    });
    const decision = decideBrowserStep(judgment, options.map((option) => option.key));
    if (decision.type === "done" || decision.type === "ask") {
      lines.push(decision.reason);
      break;
    }
    if (decision.type === "confirm") {
      let host = dom.url;
      try { host = new URL(dom.url).hostname; } catch { /* keep the raw url */ }
      const answer = await env.approve({ kind: "commit", detail: `${decision.reason} on ${host}` });
      if (answer === "no") {
        lines.push("You denied the commit action.");
        break;
      }
    }
    const next = actionToCall(decision.choice, controls, values);
    if (!next) {
      lines.push("No matching control.");
      break;
    }
    env.onNote?.(`Browser harness · ${decision.choice}`);
    const result = await runTool(next, env);
    lines.push(`${decision.choice}: ${result.output.split("\n")[0]}`);
    if (result.image) image = result.image;
    if (!result.ok) break;
    if (step === MAX_BROWSER_STEPS) lines.push("Stopped after 5 browser steps.");
  }
  return { call, ok: true, output: lines.join("\n").slice(0, 4000), image };
}

async function pageAfter(env: DesktopEnv, result: ToolResult): Promise<ToolResult> {
  if (!result.ok || !window.modbitx) return result;
  try {
    const [dom, shot] = await Promise.all([window.modbitx.browserDom(), window.modbitx.browserShot()]);
    env.onScreenshot(shot.dataUrl);
    if (dom.url) {
      try {
        await ensureSite(env, dom.url, false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "The landed site was not allowed.";
        return { ...result, ok: false, output: `${result.output}\n${message}` };
      }
      env.onBrowse(dom.url);
    }
    const outline = dom.nodes.slice(0, 20).map((node) => `${node.tag} ${node.name} ${node.text}`).join("\n");
    const download = await window.modbitx.browserDownload();
    const dialogs = await window.modbitx.browserDialogs();
    const saved = download?.state === "completed" ? `\nSaved download ${download.name} to ${download.path}` : "";
    const notices = dialogs.map((dialog) => `${dialog.type}${dialog.accepted ? " accepted" : " dismissed"}: ${dialog.message}`).join("\n");
    return { ...result, image: shot.dataUrl, output: `${result.output}\n${dom.title} ${dom.url}\n${outline}${saved}${notices ? `\n${notices}` : ""}` };
  } catch {
    return result;
  }
}

async function shotAfter(env: DesktopEnv, result: ToolResult): Promise<ToolResult> {
  if (!result.ok || !window.modbitx) return result;
  try {
    const shot = await window.modbitx.screenshot();
    env.onScreenshot(shot.dataUrl);
    return { ...result, image: shot.dataUrl, output: `${result.output}\nUpdated screenshot ${shot.width}×${shot.height}. Use these pixels for the next click.` };
  } catch {
    return result;
  }
}

async function ensureComputer(env: DesktopEnv): Promise<void> {
  if (!env.computerEnabled) throw new Error("Turn on computer use in Settings, then try again.");
  if (env.computerSession.allowed) {
    await window.modbitx?.armComputer(true);
    return;
  }
  const answer = await env.approve({ kind: "computer", detail: "use your computer" });
  if (answer === "no") throw new Error("You denied computer use.");
  env.computerSession.allowed = true;
  await window.modbitx?.armComputer(true);
}

async function gateHook(call: ToolCall, env: DesktopEnv): Promise<ToolResult | null> {
  env.hookAllow = false;
  env.hookSettled = false;
  env.hookContext = "";
  if (!env.runHook || !env.folder) return null;
  const hook = await env.runHook(call);
  env.hookContext = hook.context || "";
  if (hook.decision === "deny") return { call, ok: false, output: hook.reason || "A project hook denied this tool." };
  if (hook.decision === "ask") {
    const answer = await env.approve({ kind: "computer", detail: hook.reason || call.tool, fresh: true });
    if (answer === "no") return { call, ok: false, output: "You denied this action." };
    env.hookSettled = true;
    return null;
  }
  if (hook.decision === "allow") env.hookAllow = true;
  return null;
}

export async function runTool(call: ToolCall, env: DesktopEnv): Promise<ToolResult> {
  const blocked = await gateHook(call, env);
  if (blocked) return blocked;
  const result = await runToolInner(call, env);
  if (env.hookContext) return { ...result, output: `${result.output}\n${env.hookContext}`.slice(0, 12_000) };
  return result;
}

async function runToolInner(call: ToolCall, env: DesktopEnv): Promise<ToolResult> {
  const api = window.modbitx;
  const folder = env.folder;
  if (!api) return { call, ok: false, output: "Desktop bridge is unavailable." };
  const browserTools = new Set(["browse", "browser_task", "page_text", "page_dom", "page_click", "page_fill", "page_press", "page_scroll", "page_choose", "page_shot", "page_upload", "page_dialog"]);
  if (env.browserTools === false && browserTools.has(call.tool)) {
    return { call, ok: false, output: "Browser tools are off. Turn them on in Settings → Code." };
  }
  try {
    switch (call.tool) {
      case "search_repo": {
        if (!folder) return { call, ok: false, output: "Grant a folder before searching." };
        if (!api?.searchRepo) return { call, ok: false, output: "The search bridge is unavailable in this window." };
        const pattern = String(call.selector || call.text || call.command || "");
        if (!pattern) return { call, ok: false, output: "search_repo needs the pattern in selector." };
        try {
          const result = await api.searchRepo(folder, pattern, { limit: Number(call.limit) || 60 });
          if (!result.matches.length) return { call, ok: true, output: `No matches for ${pattern}.` };
          return { call, ok: true, output: result.matches.join("\n").slice(0, 6000) };
        } catch (error) {
          return { call, ok: false, output: error instanceof Error ? error.message : "The search failed." };
        }
      }
      case "latex_compile": {
        if (!folder) return { call, ok: false, output: "Grant a folder before compiling LaTeX." };
        if (!api?.latexCompile) return { call, ok: false, output: "The LaTeX bridge is unavailable in this window." };
        const tex = String(call.path || call.name || "main.tex");
        await ensureEdit(env, `compile ${tex}`);
        try {
          const built = await api.latexCompile(folder, tex);
          return { call, ok: true, output: `Compiled ${tex} to ${built.pdf} in the granted folder.${built.note ? `\n${built.note}` : ""}` };
        } catch (error) {
          return { call, ok: false, output: error instanceof Error ? error.message : "The compile failed." };
        }
      }
      case "list_dir": {
        const dir = resolvePath(folder, call.path || ".");
        const entries = await api.listDir(dir);
        return { call, ok: true, output: entries.map((entry) => `${entry.kind}\t${entry.name}`).join("\n") || "(empty)" };
      }
      case "read_file": {
        const file = resolvePath(folder, call.path || "");
        const text = await api.readFile(file);
        return { call, ok: true, output: text.slice(0, 12_000) || "(empty or binary)" };
      }
      case "write_plan": {
        const text = (call.content || call.text || "").trim();
        if (!text) return { call, ok: false, output: "write_plan needs the plan in content." };
        env.onPlan?.(text.slice(0, 12_000));
        return { call, ok: true, output: "Saved the plan. Call exit_plan and stop so the user can approve it." };
      }
      case "exit_plan": {
        env.onPlanStatus?.("review");
        return { call, ok: true, output: "The plan is waiting for approval. Stop. Do not edit files." };
      }
      case "ask_user": {
        const normalized = normalizeQuestion(call);
        if (!normalized.ok) return { call, ok: false, output: normalized.error };
        const question = normalized.question;
        if (!env.askUser) return { call, ok: false, output: "Asking the user is unavailable in this window." };
        const raw = (await env.askUser(question.prompt, question.options, question)).trim();
        return { call, ok: true, output: formatAnswer(question, raw) };
      }
      case "memory_write":
      case "memory_append":
      case "memory_delete": {
        if (!env.onMemory) return { call, ok: false, output: "Memory is unavailable in this window." };
        const verb = call.tool === "memory_write" ? "write" : call.tool === "memory_append" ? "append" : "delete";
        const output = await env.onMemory(verb, call.name || call.target || "", call.content || call.text || "");
        return { call, ok: true, output };
      }
      case "scratchpad_read": {
        if (!env.onScratchpad) return { call, ok: false, output: "The scratchpad is unavailable in this window." };
        return { call, ok: true, output: env.onScratchpad("read", "") || "(scratchpad is empty)" };
      }
      case "scratchpad_update": {
        if (!env.onScratchpad) return { call, ok: false, output: "The scratchpad is unavailable in this window." };
        const notes = env.onScratchpad("update", String(call.content || call.text || "").slice(0, 12_000));
        return { call, ok: true, output: notes ? `Scratchpad now:\n${notes.slice(0, 2000)}` : "Scratchpad cleared." };
      }
      case "todo": {
        const items = parseTodos(call.content || call.text || "");
        env.onTodos?.(items);
        return { call, ok: true, output: items.length ? items.map((item) => `${item.status} ${item.title}`).join("\n") : "Cleared the task list." };
      }
      case "write_file": {
        if (!folder) throw new Error("Grant a folder before writing.");
        await ensureEdit(env, `write ${call.path || "note.md"}`);
        await api.rewindSave(folder, call.path || "note.md");
        const written = await api.writeFile(folder, call.path || "note.md", call.content || "");
        const preview = String(call.content || "").split("\n").slice(0, 40).map((line) => `+ ${line}`).join("\n");
        return { call, ok: true, output: `Wrote ${written}${preview ? `\n${preview}` : ""}` };
      }
      case "run": {
        if (!folder) throw new Error("Grant a folder before running a command.");
        await ensureEdit(env, `run ${call.command || ""}`);
        const result = await api.runCommand(folder, call.command || "");
        return { call, ok: result.code === 0, output: `$ ${call.command}\nexit ${result.code}\n${result.stdout}${result.stderr ? `\n${result.stderr}` : ""}` };
      }
      case "spawn_subagents": {
        if (env.dynamicWorkflows === false) return { call, ok: false, output: "Dynamic workflows are off. Turn them on in Settings → Capabilities." };
        if (!env.onSubagents) return { call, ok: false, output: "Subagents are unavailable in this window." };
        const goals = parseSubagentGoals(String(call.content || call.text || ""));
        if (!goals.length) return { call, ok: false, output: "spawn_subagents needs one goal per line in content (up to six)." };
        if (!env.subagentsAllowed?.allowed) {
          const answer = await env.approve({ kind: "computer", detail: `run a dynamic workflow with ${goals.length} subagent${goals.length === 1 ? "" : "s"}` });
          if (answer === "no") return { call, ok: false, output: "The user declined the dynamic workflow. Do the work yourself instead." };
          if (answer !== "once") env.subagentsAllowed = { allowed: true };
        }
        const ids = env.onSubagents(goals);
        return { call, ok: true, output: `Spawned ${ids.length} subagent${ids.length === 1 ? "" : "s"}: ${ids.join(", ")}. They run beside this chat; read_subagents brings back what they found.` };
      }
      case "read_subagents": {
        if (!env.readSubagents) return { call, ok: false, output: "Subagents are unavailable in this window." };
        const rows = env.readSubagents();
        if (!rows.length) return { call, ok: true, output: "No subagents have been spawned in this session." };
        return { call, ok: true, output: rows.map((row) => `[${row.status}] ${row.prompt.slice(0, 80)}\n${row.answer ? row.answer.slice(0, 1500) : "(still working)"}`).join("\n\n").slice(0, 9000) };
      }
      case "vm_status": {
        if (env.taskVm === false) return { call, ok: false, output: "The task VM is off. Turn it on in Settings → Capabilities." };
        if (!api?.vmStatus) return { call, ok: false, output: "The VM bridge is unavailable in this window." };
        const state = await api.vmStatus();
        if (!state.supported) return { call, ok: false, output: "The VM needs QEMU (brew install qemu). It is not installed." };
        return { call, ok: true, output: `${state.running ? `Running on port ${state.port}` : state.prepared ? "Prepared and stopped" : "Not prepared — boot will download the boot files first"}.` };
      }
      case "vm_boot": {
        if (env.taskVm === false) return { call, ok: false, output: "The task VM is off. Turn it on in Settings → Capabilities." };
        if (!api?.vmBoot) return { call, ok: false, output: "The VM bridge is unavailable in this window." };
        await ensureEdit(env, "boot the disposable task VM");
        const boot = await api.vmBoot();
        return { call, ok: boot.ok, output: boot.ok ? `The VM is up on port ${boot.port}. Commands run with vm_exec inside a disposable Alpine machine — nothing touches this Mac.` : boot.error || "The boot failed." };
      }
      case "vm_exec": {
        if (env.taskVm === false) return { call, ok: false, output: "The task VM is off. Turn it on in Settings → Capabilities." };
        if (!api?.vmExec) return { call, ok: false, output: "The VM bridge is unavailable in this window." };
        const command = String(call.command || call.content || "");
        if (!command) return { call, ok: false, output: "vm_exec needs the command." };
        const out = await api.vmExec(command);
        return { call, ok: true, output: `$ ${command}\n${out.slice(0, 8000) || "(no output)"}` };
      }
      case "vm_stop": {
        if (!api?.vmStop) return { call, ok: false, output: "The VM bridge is unavailable in this window." };
        const stopped = await api.vmStop();
        return { call, ok: true, output: stopped.note };
      }
      case "slack_post": {
        if (env.slackOn !== true) return { call, ok: false, output: "The Slack connector is off. Turn it on in Settings → Connectors and paste a bot token." };
        if (!env.slackToken) return { call, ok: false, output: "No Slack bot token is stored. Paste one in Settings → Connectors." };
        const channel = String(call.target || "");
        const text = String(call.content || call.text || "");
        if (!channel || !text) return { call, ok: false, output: "slack_post needs a channel ID in target and the message in content." };
        await ensureEdit(env, `post to Slack channel ${channel}`);
        const sent = await api.httpJson({
          url: "https://slack.com/api/chat.postMessage",
          method: "POST",
          headers: { Authorization: `Bearer ${env.slackToken}`, "Content-Type": "application/json; charset=utf-8" },
          body: { channel, text: text.slice(0, 3000) }
        });
        let ok = false;
        let detail = "";
        try {
          const parsed = JSON.parse(sent.text) as { ok?: boolean; error?: string; ts?: string };
          ok = parsed.ok === true;
          detail = parsed.error ? `Slack said: ${parsed.error}` : `posted at ${parsed.ts}`;
        } catch { detail = `Slack answered ${sent.status}.`; }
        return { call, ok, output: ok ? `Posted to ${channel}: ${detail}` : `${detail}` };
      }
      case "slack_read": {
        if (env.slackOn !== true) return { call, ok: false, output: "The Slack connector is off. Turn it on in Settings → Connectors and paste a bot token." };
        if (!env.slackToken) return { call, ok: false, output: "No Slack bot token is stored. Paste one in Settings → Connectors." };
        const channel = String(call.target || "");
        if (!channel) return { call, ok: false, output: "slack_read needs a channel ID in target." };
        const history = await api.httpJson({
          url: "https://slack.com/api/conversations.history",
          method: "POST",
          headers: { Authorization: `Bearer ${env.slackToken}`, "Content-Type": "application/json; charset=utf-8" },
          body: { channel, limit: Math.min(20, Math.max(1, Number(call.limit) || 10)) }
        });
        try {
          const parsed = JSON.parse(history.text) as { ok?: boolean; error?: string; messages?: { text?: string; user?: string }[] };
          if (parsed.ok !== true) return { call, ok: false, output: `Slack said: ${parsed.error || history.status}` };
          const lines = (parsed.messages || []).map((message) => `${message.user || "?"}: ${(message.text || "").slice(0, 300)}`);
          return { call, ok: true, output: lines.length ? lines.join("\n").slice(0, 6000) : "No recent messages in that channel." };
        } catch {
          return { call, ok: false, output: `Slack answered ${history.status} with an unreadable body.` };
        }
      }
      case "linear_search": {
        if (env.linearOn !== true) return { call, ok: false, output: "The Linear connector is off. Turn it on in Settings → Connectors and paste an API key." };
        if (!env.linearKey) return { call, ok: false, output: "No Linear API key is stored. Paste one in Settings → Connectors." };
        const query = String(call.text || call.selector || "");
        if (!query) return { call, ok: false, output: "linear_search needs the search text in text." };
        const gql = `query($term: String!) { issueSearch(first: 10, filter: { title: { containsIgnoreCaseAndDiacritics: $term } }) { nodes { identifier title state { name } assignee { name } } } }`;
        const found = await api.httpJson({
          url: "https://api.linear.app/graphql",
          method: "POST",
          headers: { Authorization: env.linearKey, "Content-Type": "application/json" },
          body: { query: gql, variables: { term: query.slice(0, 120) } }
        });
        try {
          const parsed = JSON.parse(found.text) as { data?: { issueSearch?: { nodes?: { identifier: string; title: string; state?: { name?: string }; assignee?: { name?: string } }[] } }; errors?: { message: string }[] };
          if (parsed.errors?.length) return { call, ok: false, output: `Linear said: ${parsed.errors[0].message.slice(0, 200)}` };
          const rows = parsed.data?.issueSearch?.nodes || [];
          if (!rows.length) return { call, ok: true, output: `No Linear issues match "${query}".` };
          return { call, ok: true, output: rows.map((row) => `${row.identifier} ${row.title} — ${row.state?.name || "?"}${row.assignee ? ` · ${row.assignee.name}` : ""}`).join("\n").slice(0, 6000) };
        } catch {
          return { call, ok: false, output: `Linear answered ${found.status} with an unreadable body.` };
        }
      }
      case "jira_search": {
        if (env.jiraOn !== true) return { call, ok: false, output: "The Jira connector is off. Fill your site, email, and API token in Settings → Connectors." };
        if (!env.jiraDomain || !env.jiraEmail || !env.jiraToken) return { call, ok: false, output: "Jira needs the site, email, and API token in Settings → Connectors." };
        const jql = String(call.text || call.selector || "order by updated DESC");
        const auth = btoa(`${env.jiraEmail}:${env.jiraToken}`);
        const search = await api.httpJson({
          url: `https://${env.jiraDomain}/rest/api/3/search?jql=${encodeURIComponent(jql.slice(0, 400))}&maxResults=10&fields=key,summary,status`,
          method: "GET",
          headers: { Authorization: `Basic ${auth}`, Accept: "application/json" }
        });
        try {
          const parsed = JSON.parse(search.text) as { issues?: { key: string; fields?: { summary?: string; status?: { name?: string } } }[]; errorMessages?: string[] };
          if (parsed.errorMessages?.length) return { call, ok: false, output: `Jira said: ${parsed.errorMessages[0].slice(0, 200)}` };
          const rows = parsed.issues || [];
          if (!rows.length) return { call, ok: true, output: "No Jira issues match that query." };
          return { call, ok: true, output: rows.map((row) => `${row.key} ${row.fields?.summary || ""} — ${row.fields?.status?.name || "?"}`).join("\n").slice(0, 6000) };
        } catch {
          return { call, ok: false, output: `Jira answered ${search.status} with an unreadable body.` };
        }
      }
      case "jira_comment": {
        if (env.jiraOn !== true) return { call, ok: false, output: "The Jira connector is off. Fill your site, email, and API token in Settings → Connectors." };
        const issueKey = String(call.target || "");
        const text = String(call.content || call.text || "");
        if (!issueKey || !text) return { call, ok: false, output: "jira_comment needs the issue key in target and the comment in content." };
        await ensureEdit(env, `comment on Jira issue ${issueKey}`);
        const auth = btoa(`${env.jiraEmail}:${env.jiraToken}`);
        const sent = await api.httpJson({
          url: `https://${env.jiraDomain}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`,
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", Accept: "application/json" },
          body: { body: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: text.slice(0, 3000) }] }] } }
        });
        return { call, ok: sent.status >= 200 && sent.status < 300, output: sent.status < 300 ? `Commented on ${issueKey}.` : `Jira answered ${sent.status}: ${sent.text.slice(0, 200)}` };
      }
      case "notion_search": {
        if (env.notionOn !== true) return { call, ok: false, output: "The Notion connector is off. Paste an integration token in Settings → Connectors and share pages with it." };
        if (!env.notionToken) return { call, ok: false, output: "No Notion integration token is stored. Paste one in Settings → Connectors." };
        const term = String(call.text || call.selector || "");
        const search = await api.httpJson({
          url: "https://api.notion.com/v1/search",
          method: "POST",
          headers: { Authorization: `Bearer ${env.notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
          body: { query: term.slice(0, 120), page_size: 10 }
        });
        try {
          const parsed = JSON.parse(search.text) as { results?: { id: string; url?: string; properties?: Record<string, { title?: { plain_text?: string }[] }> }[] };
          const rows = (parsed.results || []).map((row) => {
            const titleProp = Object.values(row.properties || {}).find((prop) => Array.isArray(prop.title));
            const title = titleProp?.title?.[0]?.plain_text || row.id;
            return `${title} — ${row.url || row.id}`;
          });
          return { call, ok: true, output: rows.length ? rows.join("\n").slice(0, 6000) : "No Notion pages matched." };
        } catch {
          return { call, ok: false, output: `Notion answered ${search.status} with an unreadable body.` };
        }
      }
      case "notion_append": {
        if (env.notionOn !== true) return { call, ok: false, output: "The Notion connector is off. Paste an integration token in Settings → Connectors and share pages with it." };
        const pageId = String(call.target || "");
        const text = String(call.content || call.text || "");
        if (!pageId || !text) return { call, ok: false, output: "notion_append needs a page ID in target and the text in content." };
        await ensureEdit(env, "append to a Notion page");
        const sent = await api.httpJson({
          url: `https://api.notion.com/v1/blocks/${encodeURIComponent(pageId)}/children`,
          method: "PATCH",
          headers: { Authorization: `Bearer ${env.notionToken}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
          body: { children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: text.slice(0, 2000) } }] } }] }
        });
        return { call, ok: sent.status >= 200 && sent.status < 300, output: sent.status < 300 ? "Appended to the Notion page." : `Notion answered ${sent.status}: ${sent.text.slice(0, 200)}` };
      }
      case "figma_comments": {
        if (env.figmaOn !== true) return { call, ok: false, output: "The Figma connector is off. Paste a personal access token in Settings → Connectors." };
        const fileKey = String(call.target || "");
        if (!fileKey) return { call, ok: false, output: "figma_comments needs the file key from the Figma URL in target." };
        const read = await api.httpJson({
          url: `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/comments`,
          method: "GET",
          headers: { "X-Figma-Token": env.figmaToken || "" }
        });
        try {
          const parsed = JSON.parse(read.text) as { comments?: { message?: string; user?: { handle?: string } }[] };
          const rows = (parsed.comments || []).map((comment) => `${comment.user?.handle || "?"}: ${(comment.message || "").slice(0, 200)}`);
          return { call, ok: true, output: rows.length ? rows.join("\n").slice(0, 6000) : "No comments on that file." };
        } catch {
          return { call, ok: false, output: `Figma answered ${read.status} with an unreadable body.` };
        }
      }
      case "sentry_issues": {
        if (env.sentryOn !== true) return { call, ok: false, output: "The Sentry connector is off. Paste an auth token and organization slug in Settings → Connectors." };
        if (!env.sentryToken || !env.sentryOrg) return { call, ok: false, output: "Sentry needs an auth token and organization slug in Settings → Connectors." };
        const read = await api.httpJson({
          url: `https://sentry.io/api/0/organizations/${encodeURIComponent(env.sentryOrg)}/issues/?limit=10&sort=frequency`,
          method: "GET",
          headers: { Authorization: `Bearer ${env.sentryToken}` }
        });
        try {
          const parsed = JSON.parse(read.text) as { shortId?: string; title?: string; count?: string | number; level?: string; project?: { slug?: string } }[];
          const rows = (Array.isArray(parsed) ? parsed : []).map((issue) => `${issue.shortId || "?"} ${issue.title || ""} — ${issue.level || "?"} ×${issue.count ?? "?"}`);
          return { call, ok: true, output: rows.length ? rows.join("\n").slice(0, 6000) : "No open Sentry issues." };
        } catch {
          return { call, ok: false, output: `Sentry answered ${read.status} with an unreadable body.` };
        }
      }
      case "stripe_balance": {
        if (env.stripeOn !== true) return { call, ok: false, output: "The Stripe connector is off. Paste a secret key in Settings → Connectors." };
        const read = await api.httpJson({
          url: "https://api.stripe.com/v1/balance",
          method: "GET",
          headers: { Authorization: `Bearer ${env.stripeKey}` }
        });
        try {
          const parsed = JSON.parse(read.text) as { available?: { amount?: number; currency?: string }[]; pending?: { amount?: number; currency?: string }[] };
          const money = (rows: { amount?: number; currency?: string }[] = []) => rows.map((row) => `${((row.amount || 0) / 100).toFixed(2)} ${String(row.currency || "").toUpperCase()}`).join(", ") || "0";
          return { call, ok: true, output: `Available: ${money(parsed.available)}. Pending: ${money(parsed.pending)}.` };
        } catch {
          return { call, ok: false, output: `Stripe answered ${read.status} with an unreadable body.` };
        }
      }
      case "stripe_charges": {
        if (env.stripeOn !== true) return { call, ok: false, output: "The Stripe connector is off. Paste a secret key in Settings → Connectors." };
        const read = await api.httpJson({
          url: `https://api.stripe.com/v1/charges?limit=${Math.min(10, Math.max(1, Number(call.limit) || 5))}`,
          method: "GET",
          headers: { Authorization: `Bearer ${env.stripeKey}` }
        });
        try {
          const parsed = JSON.parse(read.text) as { data?: { id: string; description?: string; amount?: number; currency?: string; paid?: boolean }[] };
          const rows = (parsed.data || []).map((charge) => `${charge.id} ${charge.description || "(no description)"} — ${((charge.amount || 0) / 100).toFixed(2)} ${String(charge.currency || "").toUpperCase()}${charge.paid ? " paid" : " unpaid"}`);
          return { call, ok: true, output: rows.length ? rows.join("\n").slice(0, 6000) : "No charges recorded." };
        } catch {
          return { call, ok: false, output: `Stripe answered ${read.status} with an unreadable body.` };
        }
      }
      case "messages_recent": {
        if (env.messagesOn === false) return { call, ok: false, output: "The Messages connector is off. Turn it on in Settings → Connectors." };
        if (!api?.messagesRead) return { call, ok: false, output: "The Messages bridge is unavailable in this window." };
        try {
          const limit = Math.min(20, Math.max(1, Number(call.limit) || 8));
          const text = await api.messagesRead(limit);
          return { call, ok: true, output: text || "No chats came back. Open the Messages app once, then try again." };
        } catch (error) {
          return { call, ok: false, output: error instanceof Error ? error.message : "Messages could not be read." };
        }
      }
      case "messages_send": {
        if (env.messagesOn === false) return { call, ok: false, output: "The Messages connector is off. Turn it on in Settings → Connectors." };
        if (!api?.messagesSend) return { call, ok: false, output: "The Messages bridge is unavailable in this window." };
        const to = String(call.target || call.name || call.app || "");
        const body = String(call.content || call.message || "");
        if (!to || !body) return { call, ok: false, output: "messages_send needs a recipient in target and the text in content." };
        await ensureEdit(env, `send a message to ${to}`);
        try {
          const outcome = await api.messagesSend(to, body);
          return { call, ok: !/^no buddy/.test(outcome), output: outcome };
        } catch (error) {
          return { call, ok: false, output: error instanceof Error ? error.message : "The message could not be sent." };
        }
      }
      case "record_start": {
        if (!api?.recordStart) return { call, ok: false, output: "The recorder is unavailable in this window." };
        await ensureEdit(env, "record the screen");
        try {
          const started = await api.recordStart();
          return { call, ok: true, output: started.note };
        } catch (error) {
          return { call, ok: false, output: error instanceof Error ? error.message : "Recording could not start." };
        }
      }
      case "record_stop": {
        if (!api?.recordStop) return { call, ok: false, output: "The recorder is unavailable in this window." };
        const stopped = await api.recordStop();
        return { call, ok: true, output: `Recorded ${stopped.frames.length} frames from ${new Date(stopped.startedAt).toLocaleTimeString()}. computer_history can read the timeline.` };
      }
      case "computer_history": {
        if (!api?.recordLatest) return { call, ok: false, output: "The recorder is unavailable in this window." };
        const latest = await api.recordLatest();
        if (!latest.frames.length) return { call, ok: true, output: "No recording yet. The user starts one with /record start; nothing is captured on its own." };
        const timeline = latest.frames
          .map((frame) => `${new Date(frame.at).toLocaleTimeString()} ${frame.app}`)
          .join("\n");
        return { call, ok: true, output: `Timeline of the latest recording (a frame every 5 seconds):\n${timeline.slice(0, 6000)}` };
      }
      case "browse": {
        const target = await ensureSite(env, call.url || "", true);
        const host = new URL(target).hostname;
        env.onBrowse(target);
        env.onNote?.(`Opening ${host}`);
        const url = await api.browserLoad(target);
        env.onNote?.(`Opened ${url}`);
        return pageAfter(env, { call, ok: true, output: `Opened ${url}` });
      }
      case "browser_task":
        return runBrowserTask(call, env);
      case "design_review": {
        const content = call.content || "";
        if (!content.trim()) return { call, ok: false, output: "design_review needs the HTML in content." };
        const reviewed = await api.jevDesign({
          brief: call.message || call.text || "Review this interface.",
          html: content.slice(0, 6000),
          tokens: env.design
        });
        return { call, ok: reviewed.ok, output: interpretDesign(reviewed).lines.join("\n") };
      }
      case "sim_list":
      case "sim_boot":
      case "sim_shot":
      case "sim_tap":
      case "sim_swipe":
      case "sim_text":
      case "sim_button":
      case "sim_open":
      case "sim_install":
      case "sim_launch":
      case "sim_shutdown": {
        if (call.tool !== "sim_list") {
          const target = call.target || "booted";
          const android = /^avd:|^emulator-/i.test(target);
          if (android && env.simAndroid === false) return { call, ok: false, output: "Android emulator control is off. Turn it on in Settings → Code." };
          if (!android && env.simIos === false) return { call, ok: false, output: "iOS Simulator control is off. Turn it on in Settings → Code." };
        }
        const sim = await runSimulator({
          tool: call.tool,
          target: call.target,
          text: call.text,
          url: call.url,
          path: call.path,
          name: call.name,
          x: call.x,
          y: call.y,
          x2: call.x2,
          y2: call.y2
        }, {
          folder: env.folder,
          allow: async () => {
            if (env.simSession.allowed) return;
            const answer = await env.approve({ kind: "simulator", detail: "control the simulator and take screenshots of its screen" });
            if (answer === "no") throw new Error("You denied simulator control.");
            env.simSession.allowed = true;
          },
          onView: (view) => env.onSimulator?.(view)
        });
        if (sim.image) env.onScreenshot(sim.image);
        return { call, ok: sim.ok, output: sim.output, image: sim.image };
      }
      case "page_text": {
        const page = await api.browserText();
        return { call, ok: true, output: `${page.title}\n${page.url}\n\n${page.text.slice(0, 10_000)}` };
      }
      case "page_dom": {
        const dom = await api.browserDom();
        return { call, ok: true, output: dom.nodes.map((node) => `${node.tag} ${node.name} ${node.text} ${node.href}`).join("\n").slice(0, 8000) };
      }
      case "page_click": {
        const clicked = await api.browserClick({ selector: call.selector, x: call.x, y: call.y, text: call.text });
        if (clicked.url) env.onBrowse(clicked.url);
        env.onNote?.(clicked.ok ? `Clicked ${clicked.text || call.text || "control"}` : (clicked.error || "Click failed"));
        const clickResult = { call, ok: Boolean(clicked.ok), output: clicked.text || clicked.error || "Clicked" };
        return clicked.ok ? pageAfter(env, clickResult) : clickResult;
      }
      case "page_fill": {
        const selector = call.selector || (call.name ? `label:${call.name}` : "input, textarea");
        const filled = await api.browserFill(selector, call.text || call.content || "");
        env.onNote?.(filled.ok ? `Filled ${filled.name}` : (filled.error || "Fill failed"));
        const fillResult = { call, ok: Boolean(filled.ok), output: filled.name || filled.error || "Filled" };
        return filled.ok ? pageAfter(env, fillResult) : fillResult;
      }
      case "page_press": {
        const pressed = await api.browserPress(call.key === "return" ? "Enter" : (call.key || "Enter"));
        if (pressed.url) env.onBrowse(pressed.url);
        env.onNote?.(`Pressed ${pressed.key || "Enter"}`);
        const pressResult = { call, ok: Boolean(pressed.ok), output: `Pressed ${pressed.key || "Enter"}` };
        return pressed.ok ? pageAfter(env, pressResult) : pressResult;
      }
      case "page_scroll": {
        const moved = await api.browserScroll(Number(call.y) || (String(call.text).toLowerCase() === "up" ? -700 : 700));
        env.onNote?.("Scrolled the page");
        const scrollResult = { call, ok: Boolean(moved.ok), output: `Scrolled to ${moved.y}` };
        return moved.ok ? pageAfter(env, scrollResult) : scrollResult;
      }
      case "page_choose": {
        const chosen = await api.browserChoose(call.name || call.selector || "", call.text || "");
        env.onNote?.(chosen.ok ? `Chose ${chosen.value}` : (chosen.error || "Could not choose"));
        const chooseResult = { call, ok: Boolean(chosen.ok), output: chosen.value || chosen.error || "Chose" };
        return chosen.ok ? pageAfter(env, chooseResult) : chooseResult;
      }
      case "page_upload": {
        if (!folder) throw new Error("Grant a folder before uploading a file.");
        const file = resolvePath(folder, call.path || "");
        const root = folder.replace(/\/$/, "");
        if (file !== root && !file.startsWith(`${root}/`)) throw new Error("That file is outside the granted folder.");
        const uploaded = await api.browserUpload(call.selector || "input[type=file]", file);
        env.onNote?.(`Uploaded ${uploaded.file}`);
        return pageAfter(env, { call, ok: true, output: `Uploaded ${uploaded.file}` });
      }
      case "page_dialog": {
        const accept = /accept|yes|ok|allow/i.test(call.text || "");
        await api.acceptDialog(accept);
        env.onNote?.(accept ? "The next confirmation will be accepted" : "The next confirmation will be dismissed");
        return { call, ok: true, output: accept ? "The next confirm() will be accepted once." : "The next confirm() will be dismissed." };
      }
      case "page_shot": {
        const shot = await api.browserShot();
        env.onScreenshot(shot.dataUrl);
        return { call, ok: true, output: `Page screenshot ${shot.width}×${shot.height}`, image: shot.dataUrl };
      }
      case "apps": {
        await ensureComputer(env);
        const apps = await api.listApps();
        return { call, ok: true, output: apps.join("\n") };
      }
      case "focus_app": {
        await ensureComputer(env);
        await guardComputer(env, "act on the screen");
        const name = (call.app || call.name || "").trim();
        if (name && (env.deniedApps || []).some((app) => app.trim().toLowerCase() === name.toLowerCase())) {
          return { call, ok: false, output: `${name} is on the denied list. Remove it in Settings → Desktop → General.` };
        }
        const focused = await api.focusApp(name, env.computerMode === "takeover");
        return { call, ok: focused.ok, output: `${focused.mode}: ${focused.detail}` };
      }
      case "apply_patch": {
        if (!folder) throw new Error("Open a folder before applying a patch.");
        const diff = call.content || call.text || "";
        await ensureEdit(env, "apply patch");
        const paths = [...diff.matchAll(/^\+\+\+ (?:[ab]\/)?(.+)$/gm)].map((match) => match[1].trim()).filter((item) => item !== "/dev/null");
        for (const rel of paths) await api.rewindSave(folder, rel);
        const applied = await api.applyPatch(folder, diff);
        return { call, ok: applied.code === 0, output: applied.stdout || (applied.code === 0 ? "Applied." : "Patch failed.") };
      }
      case "git": {
        if (!folder) throw new Error("Open a repository first.");
        const action = (call.command || "status").split(/\s+/)[0];
        if (!["status", "diff", "log", "commit", "branch", "worktree"].includes(action)) throw new Error("Git action must be status, diff, log, commit, branch, or worktree.");
        if (action === "worktree" && !(env.worktreeLocation || "").trim()) {
          throw new Error("Choose a worktree folder in Settings → Code.");
        }
        if (action === "commit") await ensureEdit(env, "git commit");
        let gitMessage = call.message || call.text;
        if (action === "branch" || action === "worktree") {
          const name = branchName(env.branchPrefix || "", gitMessage || "");
          if (!name) throw new Error("Name a branch. Settings → Code can put a prefix in front of it.");
          await ensureEdit(env, `git ${action} ${name}`);
          gitMessage = name;
        }
        const result = await api.git(folder, action, gitMessage, action === "worktree" ? env.worktreeLocation : undefined);
        return { call, ok: result.code === 0, output: `${result.stdout}${result.stderr}` };
      }
      case "ssh": {
        if (!env.sshTarget) throw new Error("Set an SSH target (user@host) in the Code session.");
        await ensureEdit(env, `ssh ${call.command || ""}`);
        // First connect: the host key gate runs before any command does.
        let acceptNew = false;
        if (api?.sshKnown) {
          const known = await api.sshKnown(env.sshTarget).catch(() => ({ known: true, error: "check failed" }));
          if (!known.known && !known.error) {
            const host = env.sshTarget.split("@")[1] || env.sshTarget;
            const answer = await env.approve({ kind: "computer", detail: `trust the host key of ${host}` });
            if (answer === "no") return { call, ok: false, output: `${host} is not in known_hosts and you declined to trust it. Connect once yourself, or approve it next time.` };
            acceptNew = true;
          }
        }
        const result = await api.ssh(env.sshTarget, call.command || "uname -a", { acceptNew });
        return { call, ok: result.code === 0, output: `${result.stdout}${result.stderr}` };
      }
      case "doc_read": {
        const file = resolvePath(folder, call.path || "");
        const text = await api.readDocument(file);
        return { call, ok: true, output: text.slice(0, 12_000) || "(no text)" };
      }
      case "doc_write": {
        if (!folder) throw new Error("Grant a folder before writing a document.");
        await ensureEdit(env, `write ${call.path || "notes.docx"}`);
        const dest = resolvePath(folder, call.path || `notes.${call.kind || "docx"}`);
        const written = await api.writeDocument(call.kind || "docx", dest, call.content || call.text || "");
        return { call, ok: true, output: `Wrote ${written}` };
      }
      case "rewind": {
        const snaps = await api.rewindList();
        const latest = snaps[0];
        if (!latest) return { call, ok: false, output: "Nothing to rewind." };
        await ensureEdit(env, "rewind the latest file");
        const restored = await api.rewindRestore(latest.id);
        return { call, ok: true, output: `Restored ${restored}` };
      }
      case "mcp": {
        const id = "custom-mcp";
        if (call.command || call.name) await ensureEdit(env, call.command ? `mcp ${call.command}` : `mcp ${call.name}`);
        if (call.command) await api.mcpStart(id, call.command);
        if (call.name) {
          const result = await api.mcpCall(id, call.name, call.args);
          return { call, ok: true, output: JSON.stringify(result).slice(0, 8000) };
        }
        const tools = await api.mcpTools(id);
        return { call, ok: true, output: JSON.stringify(tools).slice(0, 8000) };
      }
      case "screenshot": {
        await ensureComputer(env);
        const shot = await api.screenshot();
        env.onScreenshot(shot.dataUrl);
        return { call, ok: true, output: `Screenshot ${shot.width}×${shot.height}. The image follows this result. Click x,y in these pixels; Modbitx maps them onto the screen.`, image: shot.dataUrl };
      }
      case "click": {
        await ensureComputer(env);
        await guardComputer(env, "act on the screen");
        const label = `${call.text || ""} ${call.key || ""}`.toLowerCase();
        const button = label.includes("right") ? "right" : label.includes("double") ? "double" : "left";
        const point = await api.clickAt(Number(call.x), Number(call.y), button);
        return shotAfter(env, { call, ok: true, output: `${button} click at screen ${point.x}, ${point.y}.` });
      }
      case "mouse_move": {
        await ensureComputer(env);
        await guardComputer(env, "move the pointer");
        const point = await api.movePointer(Number(call.x), Number(call.y));
        return { call, ok: true, output: `Moved the pointer to ${point.x}, ${point.y}` };
      }
      case "drag": {
        await ensureComputer(env);
        await guardComputer(env, "drag");
        const dragged = await api.dragPointer(Number(call.x), Number(call.y), Number(call.x2), Number(call.y2));
        return shotAfter(env, { call, ok: true, output: `Dragged from ${dragged.x}, ${dragged.y} to ${dragged.x2}, ${dragged.y2}.` });
      }
      case "wait": {
        const seconds = Math.min(3, Math.max(0.2, Number(call.y) || 1));
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        return { call, ok: true, output: `Waited ${seconds}s` };
      }
      case "type": {
        await ensureComputer(env);
        await guardComputer(env, "act on the screen");
        const text = call.text || "";
        if (text.length > 80 || /[^\n\r\t\x20-\x7E]/.test(text)) {
          const previous = await api.readClipboard();
          await api.writeClipboard(text);
          await api.hotkey("v", ["command"]);
          await new Promise((resolve) => setTimeout(resolve, 150));
          await api.writeClipboard(previous);
          return shotAfter(env, { call, ok: true, output: `Pasted ${text.length} characters so symbols survived. The previous clipboard was restored.` });
        }
        const typed = await api.typeText(text);
        return shotAfter(env, { call, ok: true, output: `Typed ${typed.typed} characters` });
      }
      case "key": {
        await ensureComputer(env);
        await guardComputer(env, "press a key");
        const pressed = await api.pressKey(call.key || "return");
        return shotAfter(env, { call, ok: true, output: `Pressed ${pressed.key}` });
      }
      case "hotkey": {
        await ensureComputer(env);
        await guardComputer(env, "act on the screen");
        const modifiers = String(call.text || "command").split(/[\s,+]+/).filter(Boolean);
        const pressed = await api.hotkey(call.key || "c", modifiers);
        return shotAfter(env, { call, ok: true, output: `Pressed ${modifiers.join("+")}+${pressed.key}` });
      }
      case "clipboard_read": {
        await ensureComputer(env);
        const text = await api.readClipboard();
        return { call, ok: true, output: text || "(clipboard is empty)" };
      }
      case "paste": {
        await ensureComputer(env);
        await guardComputer(env, "paste");
        const written = await api.writeClipboard(call.text || call.content || "");
        await api.hotkey("v", ["command"]);
        return shotAfter(env, { call, ok: true, output: `Pasted ${written.length} characters into the front app.` });
      }
      case "scroll": {
        await ensureComputer(env);
        await guardComputer(env, "act on the screen");
        const direction = /up/.test(String(call.text || "")) ? "up" : "down";
        const moved = await api.scrollScreen(direction, Number(call.y) || 3);
        return shotAfter(env, { call, ok: true, output: `Scrolled ${moved.direction} ${moved.count} notches.` });
      }
      default:
        return { call, ok: false, output: "Unknown tool." };
    }
  } catch (error) {
    return { call, ok: false, output: error instanceof Error ? error.message : "Tool failed" };
  }
}

function resolvePath(folder: string | undefined, input: string): string {
  if (!input || input === ".") return folder || "";
  if (input.startsWith("/")) return input;
  if (!folder) return input;
  return `${folder.replace(/\/$/, "")}/${input}`;
}

export async function localSteps(prompt: string, env: DesktopEnv): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  if (env.folder) results.push(await runTool({ tool: "list_dir", path: "." }, env));
  // The no-key path can still ask a structured question or save a memory note; both run locally.
  const askMatch = prompt.match(/\bask me\b[:\s]+([^\n]+)/i);
  if (askMatch) {
    const parts = askMatch[1].replace(/[.?]$/, "").split(/\s+or\s+/i).map((part) => part.trim()).filter(Boolean);
    results.push(parts.length >= 2
      ? await runTool({ tool: "ask_user", text: "Which one?", options: parts }, env)
      : await runTool({ tool: "ask_user", text: askMatch[1].trim() }, env));
  }
  const rememberMatch = prompt.match(/\bremember\b[:\s]+([^\n]+)/i);
  if (rememberMatch) {
    results.push(await runTool({ tool: "memory_write", name: "note", content: rememberMatch[1].trim() }, env));
  }
  const url = prompt.match(/https?:\/\/[^\s)]+/);
  if (url) {
    results.push(await runTool({ tool: "browse", url: url?.[0] }, env));
    if (results.at(-1)?.ok) {
      await new Promise((r) => setTimeout(r, 1400));
      results.push(await runTool({ tool: "page_dom" }, env));
      results.push(await runTool({ tool: "page_text" }, env));
      const labeled = prompt.match(/\bfill(?:\s+the)?\s+(?:["']([^"']+)["']|([A-Za-z][\w ]{0,40}?))\s+with\s+(.+)/i);
      const plain = prompt.match(/\bfill(?:\s+\w+){0,4}\s+with\s+(.+)/i);
      if (labeled?.[3]) results.push(await runTool({ tool: "page_fill", selector: `label:${(labeled[1] || labeled[2] || "").trim()}`, text: labeled[3].trim() }, env));
      else if (plain) results.push(await runTool({ tool: "page_fill", selector: "input, textarea", text: plain[1].trim() }, env));
      const click = prompt.match(/\bclick(?:\s+on)?(?:\s+the)?\s+["']([^"']+)["']|\bclick(?:\s+on)?(?:\s+the)?\s+([A-Za-z][\w ]{1,40}?)\s+button/i);
      const clickText = click?.[1] || click?.[2];
      if (clickText) results.push(await runTool({ tool: "page_click", text: clickText.trim() }, env));
      if (/\b(press enter|submit)\b/i.test(prompt)) results.push(await runTool({ tool: "page_press", key: "Enter" }, env));
      if (/\bscroll\b/i.test(prompt)) results.push(await runTool({ tool: "page_scroll", y: /up/.test(prompt) ? -700 : 700 }, env));
    }
  }
  const command = prompt.match(/(?:^|\n)(?:run|\$)\s+(.+)/i)?.[1];
  if (command && env.folder) results.push(await runTool({ tool: "run", command }, env));
  // The no-key path can still create a named file: the instruction names the
  // file and its contents, and the write is a real one in the granted folder.
  const create = prompt.match(/\bcreate (?:a )?file (?:named|called) ([\w .-]+?)(?:\s+(?:in|under|inside)\b.*?|\s*)(?:whose|with|containing)\s+contents?\s+(?:are\s+)?(?:exactly:?\s*)?(.+)/is);
  if (create && env.folder) {
    results.push(await runTool({ tool: "write_file", path: create[1].trim().replace(/^["']|["']$/g, ""), content: create[2].trim() }, env));
  }
  if (/screenshot|on (?:my )?screen/i.test(prompt)) {
    results.push(await runTool({ tool: "screenshot" }, env));
  }
  if (/\b(simulator|emulator|iphone|ipad)\b/i.test(prompt)) {
    results.push(await runTool({ tool: "sim_list" }, env));
  }
  return results;
}
