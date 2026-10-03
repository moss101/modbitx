import type { Connector, MemoryNote, Project, ScheduledTask, Settings, Thread } from "./types";
import { unzipStore, zipStore } from "./zip-store";

export interface IdleThread {
  id: string;
  pinned: boolean;
  archived: boolean;
  incognito?: boolean;
  updatedAt: number;
}

/** Archive idle chats. Pinned, incognito, and running chats stay. */
export function archiveIdle<T extends IdleThread>(threads: T[], before: number, running: string[] = [], keep: string[] = []): T[] {
  const skip = new Set([...running, ...keep]);
  return threads.map((thread) => {
    if (thread.pinned || thread.archived || thread.incognito || thread.updatedAt > before || skip.has(thread.id)) return thread;
    return { ...thread, archived: true };
  });
}

export function blankSecrets(settings: Settings): Settings {
  return { ...settings, apiKey: "", githubToken: "", zcodeKey: "", providerKeys: {} };
}

/**
 * What the person has switched on, for the request. A connector the app cannot reach
 * on its own still tells the model what this Mac may use, which is what the switch means.
 */
export function connectorLines(connectors: Connector[]): string[] {
  return (connectors || [])
    .filter((connector) => connector.enabled)
    .map((connector) => `- ${connector.name}: ${connector.blurb}${connector.command ? ` Command: ${connector.command.slice(0, 120)}` : ""}`);
}

export interface SessionBundle {
  threads: Thread[];
  memories: MemoryNote[];
  tasks: ScheduledTask[];
  projects: Project[];
}

/** Cowork and Code sessions are files in the zip. Chat threads, projects, memory, and schedules sit in the manifest. */
export function sessionArchive(state: { threads: Thread[]; memories: MemoryNote[]; tasks: ScheduledTask[]; projects: Project[]; settings: Settings }): { name: string; text: string }[] {
  const threads = state.threads.filter((thread) => !thread.incognito);
  const sessions = threads.filter((thread) => thread.mode === "cowork" || thread.mode === "code");
  const manifest = {
    kind: "modbitx-export",
    threads: threads.filter((thread) => thread.mode === "chat"),
    memories: state.memories,
    tasks: state.tasks,
    projects: state.projects,
    settings: blankSecrets(state.settings)
  };
  return [
    { name: "manifest.json", text: JSON.stringify(manifest) },
    ...sessions.map((thread) => ({ name: `sessions/${thread.mode}/${thread.id}.json`, text: JSON.stringify(thread) }))
  ];
}

export function bundleZip(state: Parameters<typeof sessionArchive>[0]): Uint8Array {
  return zipStore(sessionArchive(state));
}

export function bundleFromArchive(files: { name: string; text: string }[]): SessionBundle {
  const manifestFile = files.find((file) => file.name === "manifest.json" || file.name.endsWith("/manifest.json"));
  const manifest = manifestFile ? JSON.parse(manifestFile.text) as Partial<SessionBundle> : {};
  const sessions = files
    .filter((file) => file.name.includes("sessions/") && file.name.endsWith(".json"))
    .map((file) => JSON.parse(file.text) as Thread);
  const threads = [...(manifest.threads || []), ...sessions].filter((thread) => thread && !thread.incognito);
  const seen = new Set<string>();
  return {
    threads: threads.filter((thread) => {
      if (!thread.id || seen.has(thread.id)) return false;
      seen.add(thread.id);
      return true;
    }),
    memories: Array.isArray(manifest.memories) ? manifest.memories : [],
    tasks: Array.isArray(manifest.tasks) ? manifest.tasks : [],
    projects: Array.isArray(manifest.projects) ? manifest.projects : []
  };
}

export function bundleFromZip(bytes: Uint8Array): SessionBundle {
  return bundleFromArchive(unzipStore(bytes));
}

export type TaskNotice = "finished" | "cant-run" | "needs-input";

export function taskNeedsPerson(prompt: string): boolean {
  return /\b(click|browse|screenshot|grant a folder|edit the file|open the (?:site|page|app))\b/i.test(prompt);
}

/** Sunday is 0, matching Date.getDay(). */
export const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Keeps only real weekdays, deduplicated and ordered Sunday first. */
export function taskDays(days: number[] | undefined): number[] {
  if (!Array.isArray(days)) return [];
  const seen = new Set<number>();
  for (const day of days) {
    const value = Math.trunc(Number(day));
    if (Number.isFinite(value) && value >= 0 && value <= 6) seen.add(value);
  }
  return [...seen].sort((a, b) => a - b);
}

/** How a schedule's repeat reads in the list and in the phone status. */
export function taskDaysLabel(days: number[] | undefined): string {
  const chosen = taskDays(days);
  if (!chosen.length || chosen.length === 7) return "Every day";
  if (chosen.join() === "1,2,3,4,5") return "Weekdays";
  if (chosen.join() === "0,6") return "Weekends";
  return chosen.map((day) => WEEKDAY_NAMES[day]).join(", ");
}

/**
 * Whether a schedule should run: the minute matches and today is one of its days.
 * An empty day list repeats every day.
 */
export function taskDueOn(when: string, days: number[] | undefined, hhmm: string, weekday: number): boolean {
  if (String(when || "") !== hhmm) return false;
  const chosen = taskDays(days);
  if (!chosen.length) return true;
  return chosen.includes(Math.trunc(Number(weekday)));
}

export function taskOutcome(prompt: string, opts: { hasKey: boolean; desktopOpen: boolean }): { status: TaskNotice; detail: string } {
  const text = prompt.trim();
  if (!text) return { status: "cant-run", detail: "This schedule has no prompt, so it did not run." };
  if (!opts.desktopOpen && taskNeedsPerson(text)) {
    return { status: "needs-input", detail: "This schedule needs you at the Mac. It is waiting in a Cowork chat." };
  }
  if (!opts.desktopOpen && !opts.hasKey) {
    return { status: "cant-run", detail: "No model key is stored, so this schedule could not write a reply." };
  }
  return {
    status: "finished",
    detail: opts.desktopOpen ? "The schedule opened a Cowork chat." : "The schedule wrote a reply while Modbitx was closed."
  };
}

export function noticeTitle(status: TaskNotice, name: string): string {
  const label = name || "Schedule";
  if (status === "cant-run") return `${label} could not run`;
  if (status === "needs-input") return `${label} needs you`;
  return `${label} finished`;
}

export const CHROME_LABEL = "From Chrome";
export const PHONE_LABEL = "From the pairing link";

export interface PageRead {
  title?: string;
  url?: string;
  text?: string;
  error?: string;
}

/** A record already stored in the local handoff queue. */
export interface HandoffRecord {
  text?: string;
  at?: number;
  taskId?: string;
  title?: string;
  source?: string;
  page?: PageRead;
}

export interface HandoffDecision {
  kind: "schedule" | "chrome" | "phone";
  text: string;
  label: string;
  taskId?: string;
  title?: string;
}

/** Page text, or the page-script error, as one handoff body. */
export function chromePageText(page: PageRead): string {
  const error = String(page.error || "").trim();
  if (error) return `Chrome could not read the page. ${error}`;
  const title = String(page.title || "").trim();
  const url = String(page.url || "").trim();
  const body = String(page.text || "").trim();
  return [`Page from Chrome: ${title}`, url, "", body].join("\n").trim();
}

/**
 * A task id stays schedule work. A Chrome page read stays Chrome.
 * Anything else with text is a phone handoff.
 */
export function handoffDecision(item: HandoffRecord): HandoffDecision | null {
  const taskId = String(item.taskId || "").trim();
  if (taskId) {
    return {
      kind: "schedule",
      taskId,
      text: String(item.text || ""),
      title: item.title,
      label: item.title || "Schedule"
    };
  }
  if (item.source === "chrome" || item.page != null) {
    const text = item.page ? chromePageText(item.page) : String(item.text || "").trim();
    if (!text) return null;
    return { kind: "chrome", text, label: CHROME_LABEL, title: CHROME_LABEL };
  }
  const text = String(item.text || "").trim();
  if (!text) return null;
  return { kind: "phone", text, label: PHONE_LABEL, title: item.title };
}

export function projectPrompt(projects: Project[], projectId?: string): string {
  const own = projects.find((project) => project.id === projectId);
  const shared = projects.filter((project) => project.shared && project.id !== own?.id);
  const blocks = [
    ...(own ? [projectBlock(own, "Project instructions")] : []),
    ...shared.map((project) => projectBlock(project, "Shared project"))
  ];
  return blocks.join("\n\n");
}

function projectBlock(project: Project, label: string): string {
  const knowledge = project.knowledge.map((file) => `\n[${file.name}]\n${file.text}`).join("");
  return `${label}: ${project.name}\n${project.instructions || ""}${knowledge}`;
}

export function githubRepo(url: string): string | null {
  const text = url.trim();
  const ssh = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(text);
  const https = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(text);
  const match = ssh || https;
  if (!match) return null;
  return `${match[1]}/${match[2]}`;
}

export interface PullRequestRow {
  number: number;
  title: string;
  draft: boolean;
  state: string;
}

export function parsePulls(body: string): PullRequestRow[] {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 10).map((item: { number?: number; title?: string; draft?: boolean; state?: string }) => ({
      number: Number(item.number) || 0,
      title: String(item.title || "").slice(0, 120),
      draft: item.draft === true,
      state: String(item.state || "open")
    })).filter((item) => item.number > 0);
  } catch {
    return [];
  }
}

export function worktreeLeaf(branch: string): string {
  const leaf = branch.replace(/[\\/]+/g, "-");
  if (leaf.includes("..") || !/^[\w.-]{1,80}$/.test(leaf)) return "";
  return leaf;
}

export function worktreePath(location: string, branch: string): string {
  const leaf = worktreeLeaf(branch);
  if (!leaf) return "";
  return `${location.replace(/\/+$/, "")}/${leaf}`;
}
