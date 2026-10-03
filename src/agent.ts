import type { PermissionMode, Skill, Thread, TodoItem } from "./types";

/** Jev 1.13.0. On 2026-09-29 a new feature scored 0.86–0.95 and a named one-line fix scored 0.04–0.43. Safe allows had harm at or under 0.04; commit, push, install, SSH, and curl asked; rm -rf and writes outside the folder denied. */
export const PLAN_ENTER = 0.72;
export const SKILL_CONFIDENCE = 0.5;
export const REVIEW_CONFIDENCE = 0.55;
/** Allow only when the harm noul is at or below this and the choice is allow. */
export const REVIEW_HARM = 0.35;

export interface PrepareJudgment {
  ok: boolean;
  reason?: string;
  model?: string;
  needsPlan?: number;
  skill?: { choice: string; confidence: number };
}

export interface ReviewJudgment {
  ok: boolean;
  reason?: string;
  harm?: number;
  decision?: { choice: string; confidence: number };
}

export function applyPlanGate(
  permission: PermissionMode,
  mode: string,
  judgment: PrepareJudgment
): { enter: boolean; note: string } {
  if (mode !== "code" || !judgment.ok || judgment.needsPlan == null) return { enter: false, note: "" };
  if (permission === "plan" || permission === "bypass" || permission === "auto") return { enter: false, note: "" };
  if (judgment.needsPlan < PLAN_ENTER) return { enter: false, note: "" };
  const pct = Math.round(judgment.needsPlan * 100);
  return {
    enter: true,
    note: `Jev 1.13 opened plan mode (${pct}%). Files stay read-only until you approve the plan.`
  };
}

/** Same gate as a Code send. Only the approval turn, which passes usePlan, skips a new plan. */
export function enterPlanThisTurn(
  permission: PermissionMode,
  mode: string,
  judgment: PrepareJudgment,
  usePlan?: boolean
): { enter: boolean; note: string } {
  const gate = applyPlanGate(permission, mode, judgment);
  if (!gate.enter || usePlan) return { enter: false, note: "" };
  return gate;
}

/** Mode restored when the user approves a plan. Ask when nothing else was saved. */
export function permissionAfterApproval(planReturn?: PermissionMode): PermissionMode {
  return planReturn && planReturn !== "plan" ? planReturn : "ask";
}

/** Plan text given to the implementation turn. Absent while the session is still in plan. */
export function approvedPlanForTurn(
  permission: PermissionMode,
  plan: string | undefined,
  planStatus?: string,
  usePlan?: boolean
): string | undefined {
  if (permission === "plan" || !plan) return undefined;
  if (planStatus === "approved" || usePlan) return plan;
  return undefined;
}

export function applySkillFocus(skills: Skill[], judgment: PrepareJudgment): { skill?: Skill; note: string } {
  const pick = judgment.skill;
  if (!judgment.ok || !pick || pick.choice === "none" || pick.confidence < SKILL_CONFIDENCE) return { note: "" };
  const skill = skills.find((item) => item.enabled && item.id === pick.choice);
  if (!skill) return { note: "" };
  return { skill, note: `Skill in front: ${skill.name}.` };
}

export function decideReview(judgment: ReviewJudgment | undefined): "allow" | "ask" | "deny" {
  if (!judgment?.ok || !judgment.decision) return "ask";
  const { choice, confidence } = judgment.decision;
  if (choice === "deny" && confidence >= REVIEW_CONFIDENCE) return "deny";
  if (choice === "allow" && confidence >= REVIEW_CONFIDENCE && (judgment.harm ?? 1) <= REVIEW_HARM) return "allow";
  return "ask";
}

export function parseTodos(content: string): TodoItem[] {
  return content.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 12).map((line, index) => {
    let status: TodoItem["status"] = "pending";
    if (/^\[x\]/i.test(line) || /^(done|complete)\b/i.test(line)) status = "done";
    else if (/^\[~\]/.test(line) || /^(doing|active)\b/i.test(line)) status = "doing";
    const title = line.replace(/^(\[[ xX~]\]|done|complete|doing|active|pending|todo)\s*/i, "").trim() || line;
    return { id: `t${index + 1}`, title: title.slice(0, 140), status };
  });
}

export interface SlashCommand {
  name: string;
  blurb: string;
  kind: "builtin" | "folder";
  body?: string;
}

export function builtinCommands(allowBypass: boolean): SlashCommand[] {
  const commands: SlashCommand[] = [
    { name: "plan", blurb: "Read the repo and write a plan before editing", kind: "builtin" },
    { name: "view-plan", blurb: "Show the saved plan", kind: "builtin" },
    { name: "auto", blurb: "Let Jev allow a safe edit and ask on the rest", kind: "builtin" },
    { name: "ask", blurb: "Ask before each edit or command", kind: "builtin" },
    { name: "accept", blurb: "Accept file edits and ask before commands", kind: "builtin" },
    { name: "compact", blurb: "Summarize older messages and keep the last four", kind: "builtin" },
    { name: "context", blurb: "Show a rough size of this conversation", kind: "builtin" },
    { name: "scratchpad", blurb: "Show this session's working notes", kind: "builtin" },
    { name: "record", blurb: "Start or stop a screen recording (start, stop)", kind: "builtin" },
    { name: "research", blurb: "Break a topic into steps and write a report", kind: "builtin" },
    { name: "model", blurb: "Switch the model for this chat", kind: "builtin" },
    { name: "effort", blurb: "Set reasoning effort for this chat", kind: "builtin" },
    { name: "new", blurb: "Start a fresh chat in this mode", kind: "builtin" },
    { name: "clear", blurb: "Start a fresh chat in this mode", kind: "builtin" },
    { name: "resume", blurb: "Open a recent chat in this mode", kind: "builtin" },
    { name: "fork", blurb: "Copy this conversation into a new chat", kind: "builtin" },
    { name: "rewind", blurb: "Drop messages after an earlier prompt", kind: "builtin" },
    { name: "undo", blurb: "Drop messages after an earlier prompt", kind: "builtin" },
    { name: "copy", blurb: "Copy a reply, or save it in the granted folder", kind: "builtin" },
    { name: "export", blurb: "Copy this conversation, or save it as a file", kind: "builtin" },
    { name: "rename", blurb: "Set this chat's title", kind: "builtin" },
    { name: "title", blurb: "Set this chat's title", kind: "builtin" }
  ];
  if (allowBypass) commands.splice(5, 0, { name: "bypass", blurb: "Skip edit and command prompts", kind: "builtin" });
  return commands;
}

const SLASH_ALIASES: Record<string, string> = { clear: "new", undo: "rewind", title: "rename" };

export function canonicalSlash(name: string): string {
  return SLASH_ALIASES[name] || name;
}

export interface SessionRow {
  id: string;
  title: string;
  updatedAt: number;
  archived?: boolean;
}

/** Recent chats in the rows already limited to one mode. The open chat stays out of the picker. */
export function resumeList(rows: SessionRow[], query: string, currentId: string): SessionRow[] {
  const needle = query.trim().toLowerCase();
  return rows
    .filter((row) => !row.archived && row.id !== currentId)
    .filter((row) => !needle || row.title.toLowerCase().includes(needle) || row.id.toLowerCase().startsWith(needle))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 12);
}

/** A non-empty query with one other chat opens it. The open chat, several hits, or no query do not switch. */
export function resumeMatch(rows: SessionRow[], query: string, currentId: string): { id: string } | { status: "none" | "list" | "current" } {
  const needle = query.trim().toLowerCase();
  const pool = rows.filter((row) => !row.archived);
  if (!needle) return { status: "list" };
  const exact = pool.filter((row) => row.title.toLowerCase() === needle || row.id.toLowerCase() === needle);
  const hits = exact.length
    ? exact
    : pool.filter((row) => row.title.toLowerCase().includes(needle) || row.id.toLowerCase().startsWith(needle));
  if (hits.length === 1) return hits[0].id === currentId ? { status: "current" } : { id: hits[0].id };
  if (hits.length === 0) return { status: "none" };
  return { status: "list" };
}

export interface RewindPoint {
  messageId: string;
  label: string;
}

export function rewindPoints(messages: { id: string; role: string; content: string }[]): RewindPoint[] {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => ({
      messageId: message.id,
      label: message.content.replace(/\s+/g, " ").trim().slice(0, 80) || "Empty prompt"
    }))
    .reverse();
}

/** Keep the chosen user prompt and everything before it. A missing prompt returns null. */
export function rewindTo<T extends { id: string; role: string }>(messages: T[], messageId: string): T[] | null {
  const index = messages.findIndex((message) => message.id === messageId && message.role === "user");
  if (index < 0) return null;
  return messages.slice(0, index + 1);
}

export function parseCopyRequest(rest: string): { nth: number; file?: string } | { error: string } {
  const text = rest.trim();
  if (!text) return { nth: 1 };
  const numbered = /^(\d+)(?:\s+([\s\S]+))?$/.exec(text);
  if (numbered) {
    const nth = Number(numbered[1]);
    if (!Number.isInteger(nth) || nth < 1 || nth > 99) return { error: "Copy a reply by number, starting at 1 for the latest." };
    const file = numbered[2]?.trim();
    return file ? { nth, file } : { nth };
  }
  return { nth: 1, file: text };
}

export function assistantReply(messages: { role: string; content: string }[], nth: number): string | null {
  const replies = messages.filter((message) => message.role === "assistant" && message.content.trim());
  return replies[replies.length - nth]?.content ?? null;
}

/** A single file name. Paths stay out so a save cannot leave the granted folder. */
export function safeExportName(name: string): string | null {
  const text = name.trim();
  if (!text || text.includes("/") || text.includes("\\") || text.includes("..") || text.startsWith(".")) return null;
  if (!/^[\w .()-]{1,80}$/.test(text)) return null;
  return text;
}

export function sessionFileWriteAllowed(permission: string): boolean {
  return permission !== "plan";
}

export function exportTranscript(title: string, messages: { role: string; content: string }[]): string {
  const lines = [`# ${title.trim() || "Conversation"}`, ""];
  for (const message of messages) {
    const who = message.role === "user" ? "You" : message.role === "assistant" ? "Modbitx" : "Note";
    lines.push(`## ${who}`, "", message.content.trim(), "");
  }
  return lines.join("\n").slice(0, 200_000);
}

export function forkTitle(title: string): string {
  const base = title.replace(/\s+\(fork(?: \d+)?\)$/i, "").trim() || "Chat";
  return `${base} (fork)`.slice(0, 80);
}

export function forkedThread(source: Thread, id: string, now: number): Thread {
  return {
    ...source,
    id,
    title: forkTitle(source.title),
    messages: source.messages.map((message) => ({
      ...message,
      steps: message.steps?.map((step) => ({ ...step })),
      attachments: message.attachments?.map((file) => ({ ...file }))
    })),
    todos: source.todos?.map((todo) => ({ ...todo })),
    pinned: false,
    starred: false,
    archived: false,
    createdAt: now,
    updatedAt: now
  };
}

export function autoTitle(mode: string, messages: { role: string; content: string }[]): string {
  const first = messages.find((message) => message.role === "user")?.content.replace(/\s+/g, " ").trim();
  if (first) return first.slice(0, 48);
  if (mode === "cowork") return "New task";
  if (mode === "code") return "New session";
  return "New chat";
}

export function parseRename(rest: string): { title: string } | { auto: true } | { error: string } {
  const text = rest.trim();
  if (!text) return { error: "Name this chat, or use /rename --auto to take the title from the first message." };
  if (text === "--auto") return { auto: true };
  if (text.startsWith("--auto")) return { error: "--auto is the only argument. It cannot sit beside a title." };
  return { title: text.replace(/\s+/g, " ").slice(0, 80) };
}

/** --worktree asks for a git worktree. --no-worktree is dropped. The folder comes from Settings. */
export function stripWorktreeFlag(rest: string): { rest: string; worktree: boolean } {
  const worktree = /(^|\s)--worktree(?=\s|$)/.test(rest);
  return {
    worktree,
    rest: rest.replace(/(^|\s)--(?:no-)?worktree(?=\s|$)/g, " ").replace(/\s+/g, " ").trim()
  };
}

export function matchSlash(draft: string, commands: SlashCommand[]): { name: string; rest: string; matches: SlashCommand[] } | null {
  if (!draft.startsWith("/") || draft.includes("\n")) return null;
  const match = /^\/([a-z0-9-]*)(?:\s+([\s\S]*))?$/i.exec(draft);
  if (!match) return null;
  const name = match[1].toLowerCase();
  const rest = (match[2] || "").trim();
  const matches = commands.filter((command) => command.name.startsWith(name)).slice(0, 8);
  return { name, rest, matches };
}

export function parseCommandFile(name: string, raw: string): SlashCommand {
  const wrapped = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  let blurb = "Folder command";
  let body = raw.trim();
  if (wrapped) {
    const desc = wrapped[1].match(/description:\s*(.+)/);
    if (desc) blurb = desc[1].trim().slice(0, 140);
    body = wrapped[2].trim();
  }
  const first = body.split("\n").map((line) => line.trim()).find(Boolean);
  if (blurb === "Folder command" && first) blurb = first.replace(/^#+\s*/, "").slice(0, 140);
  return { name, blurb, kind: "folder", body };
}

export function fillCommand(body: string, args: string): string {
  if (body.includes("$ARGUMENTS")) return body.replaceAll("$ARGUMENTS", args).trim();
  return args ? `${body}\n\n${args}` : body;
}

export function interpretHook(code: number, stdout: string, stderr: string): { decision: "allow" | "deny" | "ask" | "none"; reason: string; context: string } {
  if (code === 2) return { decision: "deny", reason: (stderr || stdout || "Hook denied this tool.").trim().slice(0, 400), context: "" };
  const text = stdout.trim();
  if (!text) return { decision: "none", reason: "", context: "" };
  try {
    const json = JSON.parse(text) as {
      continue?: boolean;
      reason?: string;
      hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string; additionalContext?: string };
    };
    const specific = json.hookSpecificOutput || {};
    const context = String(specific.additionalContext || "").slice(0, 1500);
    if (json.continue === false) {
      return { decision: "deny", reason: String(json.reason || specific.permissionDecisionReason || "Hook stopped this tool.").slice(0, 400), context };
    }
    if (specific.permissionDecision === "deny") {
      return { decision: "deny", reason: String(specific.permissionDecisionReason || "Hook denied this tool.").slice(0, 400), context };
    }
    if (specific.permissionDecision === "ask") {
      return { decision: "ask", reason: String(specific.permissionDecisionReason || "A project hook wants approval.").slice(0, 400), context };
    }
    if (specific.permissionDecision === "allow") return { decision: "allow", reason: "", context };
    return { decision: "none", reason: "", context };
  } catch {
    return { decision: "none", reason: "", context: text.slice(0, 1500) };
  }
}

export function localCompact(messages: { role: string; content: string }[]): string {
  return messages.map((message) => `${message.role}: ${message.content.replace(/\s+/g, " ").slice(0, 240)}`).join("\n").slice(0, 4000);
}

export function contextEstimate(parts: { content: string }[], extra = ""): string {
  const chars = parts.reduce((sum, part) => sum + part.content.length, 0) + extra.length;
  const tokens = Math.ceil(chars / 4);
  return `About ${tokens.toLocaleString()} tokens in this conversation (${chars.toLocaleString()} characters). This is a local estimate, not the provider count.`;
}

export function permissionLabel(mode: PermissionMode): string {
  if (mode === "accept-edits") return "Accept edits";
  if (mode === "plan") return "Plan";
  if (mode === "auto") return "Auto";
  if (mode === "bypass") return "Bypass";
  return "Ask";
}
