import { settingsCatalog, type NavItem } from "./settings-nav";
import type { Screen } from "./types";

export type PaletteAction = "new-chat" | "new-task" | "new-session" | "new-incognito";

export interface PaletteEntry {
  id: string;
  label: string;
  /** Group shown beside the label. Empty for the plain actions. */
  group: string;
  hints: string;
  kind: "action" | "screen" | "settings" | "chat" | "project";
  /** Screen a `screen` entry opens. Typed so a bad target cannot ship. */
  nav?: Screen;
  target?: string;
  action?: PaletteAction;
  /** Message text for a chat, so a query can find it by what was said. */
  body?: string;
}

export interface PaletteInput {
  threads?: { id: string; title: string; incognito?: boolean; messages?: { content: string }[] }[];
  projects?: { id: string; name: string }[];
}

const ACTIONS: PaletteEntry[] = [
  { id: "action:new-chat", label: "New chat", group: "Action", hints: "start a conversation chat", kind: "action", action: "new-chat" },
  { id: "action:new-task", label: "New task", group: "Action", hints: "cowork start a task on this mac", kind: "action", action: "new-task" },
  { id: "action:new-session", label: "New code session", group: "Action", hints: "code repository session folder", kind: "action", action: "new-session" },
  { id: "action:new-incognito", label: "New incognito chat", group: "Action", hints: "private hidden chat", kind: "action", action: "new-incognito" }
];

const SCREENS: PaletteEntry[] = [
  { id: "screen:projects", label: "Projects", group: "Go to", hints: "shared instructions and knowledge", kind: "screen", nav: "projects" },
  { id: "screen:artifacts", label: "Artifacts", group: "Go to", hints: "published pages previews files", kind: "screen", nav: "artifacts" },
  { id: "screen:scheduled", label: "Scheduled", group: "Go to", hints: "routines tasks clock", kind: "screen", nav: "scheduled" },
  { id: "screen:dispatch", label: "Dispatch", group: "Go to", hints: "handoff queue phone chrome waiting", kind: "screen", nav: "dispatch" },
  { id: "screen:customize", label: "Customize", group: "Go to", hints: "connectors skills memory styles", kind: "screen", nav: "customize" }
];

/** Actions, screens, every settings section, then the open chats and projects. */
export function paletteEntries(input: PaletteInput): PaletteEntry[] {
  const settings: PaletteEntry[] = settingsCatalog().flatMap((group) => group.items.map((item: NavItem) => ({
    id: `settings:${item.id}`,
    label: item.label,
    group: group.title ? `Settings · ${group.title}` : "Settings",
    hints: item.hints,
    kind: "settings" as const,
    target: item.id
  })));
  const chats: PaletteEntry[] = (input.threads || [])
    .filter((thread) => !thread.incognito && thread.title.trim())
    .map((thread) => ({
      id: `chat:${thread.id}`,
      label: thread.title,
      group: "Chats",
      hints: "",
      kind: "chat" as const,
      target: thread.id,
      body: (thread.messages || []).map((message) => message.content).join("\n").slice(0, 20000)
    }));
  const projects: PaletteEntry[] = (input.projects || [])
    .filter((project) => project.name.trim())
    .map((project) => ({ id: `project:${project.id}`, label: project.name, group: "Projects", hints: "", kind: "project" as const, target: project.id }));
  return [...ACTIONS, ...SCREENS, ...settings, ...chats, ...projects];
}

function score(entry: PaletteEntry, q: string): number {
  const label = entry.label.toLowerCase();
  if (label === q) return 1000;
  if (label.startsWith(q)) return 800 - Math.min(200, label.length);
  const words = label.split(/[^a-z0-9]+/).filter(Boolean);
  if (words.some((word) => word.startsWith(q))) return 600 - Math.min(100, label.length);
  const at = label.indexOf(q);
  if (at >= 0) return 500 - Math.min(100, at);
  const hintAt = entry.hints.toLowerCase().indexOf(q);
  if (hintAt >= 0) return 300 - Math.min(100, hintAt);
  // A chat found by what was said ranks under every title and hint match.
  const bodyAt = entry.body ? entry.body.toLowerCase().indexOf(q) : -1;
  if (bodyAt >= 0) return 100 - Math.min(80, Math.floor(bodyAt / 200));
  return -1;
}

/**
 * Rank entries for a query. An exact label wins, then a label prefix, then a word
 * start, then a label substring, then a hint match, then chat message text. Ties keep
 * the catalog order.
 */
export function paletteMatches(query: string, entries: PaletteEntry[], limit = 24): PaletteEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries.slice(0, limit);
  return entries
    .map((entry, index) => ({ entry, index, rank: score(entry, q) }))
    .filter((item) => item.rank >= 0)
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.entry);
}

/** A short excerpt around a query that matched a chat's messages, empty otherwise. */
export function paletteSnippet(entry: PaletteEntry, query: string, width = 70): string {
  const q = query.trim().toLowerCase();
  if (!q || !entry.body) return "";
  const body = entry.body.replace(/\s+/g, " ");
  const at = body.toLowerCase().indexOf(q);
  if (at < 0) return "";
  const start = Math.max(0, at - 24);
  const end = Math.min(body.length, at + q.length + width);
  return `${start > 0 ? "…" : ""}${body.slice(start, end).trim()}${end < body.length ? "…" : ""}`;
}
