import type { Artifact, Message, PublishedArtifact } from "./types";

const FENCE = /```([a-zA-Z0-9_-]*)[^\n]*artifact[^\n]*\n([\s\S]*?)```/g;
const TITLE = /title="([^"]+)"/;

export function artifactsFromMessages(messages: Message[]): Artifact[] {  const found: Artifact[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const re = new RegExp(FENCE.source, "g");
    let match: RegExpExecArray | null;
    let index = 0;
    while ((match = re.exec(message.content))) {
      const info = match[0].split("\n")[0];
      const title = TITLE.exec(info)?.[1] || `Artifact ${index + 1}`;
      found.push({
        id: `${message.id}:${index}`,
        title,
        language: match[1] || "markdown",
        content: match[2].trim(),
        messageId: message.id,
        updatedAt: message.createdAt
      });
      index += 1;
    }
  }
  return found;
}

/** Twelve snapshots, each under 300,000 characters, so a chat cannot fill the local save. */export const VERSION_CAP = 12;
export const VERSION_LIMIT = 300_000;

export function artifactParts(id: string): { messageId: string; index: number } | null {
  const cut = id.lastIndexOf(":");
  if (cut <= 0) return null;
  const index = Number(id.slice(cut + 1));
  if (!Number.isInteger(index) || index < 0) return null;
  return { messageId: id.slice(0, cut), index };
}

/** Replace one artifact body. The fence header stays. Returns the original text when that body is missing. */
export function replaceArtifactBody(content: string, index: number, nextBody: string): string {
  let seen = 0;
  const re = new RegExp(FENCE.source, "g");
  return content.replace(re, (full) => {
    const current = seen;
    seen += 1;
    if (current !== index) return full;
    const headerEnd = full.indexOf("\n");
    if (headerEnd < 0) return full;
    return `${full.slice(0, headerEnd + 1)}${nextBody.replace(/\s+$/, "")}\n\`\`\``;
  });
}

export function restoreArtifact(content: string, artifactId: string, body: string): string | null {
  const parts = artifactParts(artifactId);
  if (!parts) return null;
  const next = replaceArtifactBody(content, parts.index, body);
  return next === content ? null : next;
}

/** Append a snapshot when the text changed. Returns null when nothing new should be stored. */
export function rememberVersion(
  published: PublishedArtifact[] | undefined,
  item: { id: string; title: string; language: string; content: string },
  at: number
): PublishedArtifact[] | null {
  const content = item.content.trim();
  if (!item.id || !content || content.length > VERSION_LIMIT) return null;
  const language = (item.language || "markdown").slice(0, 24);
  const title = item.title.slice(0, 80);
  const list = published || [];
  const current = list.find((entry) => entry.id === item.id);
  const last = current?.versions[current.versions.length - 1];
  if (last && last.content === content && last.language === language) return null;
  const versions = [...(current?.versions || []), { at, content, language }].slice(-VERSION_CAP);
  return [{ id: item.id, title, versions }, ...list.filter((entry) => entry.id !== item.id)].slice(0, 40);
}

/** Artifacts whose own title or the chat they came from matches. An empty query keeps all of them. */
export function filterArtifacts<T extends { title: string; thread?: string }>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => `${item.title} ${item.thread || ""}`.toLowerCase().includes(q));
}

/** How many saved snapshots an artifact has, which is zero until one is stored. */
export function versionCount(published: PublishedArtifact[] | undefined, id: string): number {
  return (published || []).find((entry) => entry.id === id)?.versions.length || 0;
}

/** Line-by-line compare of two saved versions, for the pane's side-by-side view. */
export interface VersionDiffRow {
  left: string;
  right: string;
  kind: "same" | "changed" | "added" | "removed";
}

export function compareVersions(before: string, after: string, maxRows = 400): VersionDiffRow[] {
  const left = String(before || "").split("\n");
  const right = String(after || "").split("\n");
  const rows: VersionDiffRow[] = [];
  const longest = Math.max(left.length, right.length);
  for (let index = 0; index < longest && rows.length < maxRows; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === b) rows.push({ left: a ?? "", right: b ?? "", kind: "same" });
    else if (a === undefined) rows.push({ left: "", right: b ?? "", kind: "added" });
    else if (b === undefined) rows.push({ left: a ?? "", right: "", kind: "removed" });
    else rows.push({ left: a, right: b, kind: "changed" });
  }
  return rows;
}

/** A summary line for the compare view: how many lines differ. */
export function diffSummary(rows: VersionDiffRow[]): string {
  const changed = rows.filter((row) => row.kind !== "same").length;
  if (!changed) return "These versions match line for line.";
  const added = rows.filter((row) => row.kind === "added").length;
  const removed = rows.filter((row) => row.kind === "removed").length;
  const edited = rows.filter((row) => row.kind === "changed").length;
  return `${changed} of ${rows.length} lines differ: ${edited} changed, ${added} added, ${removed} removed.`;
}
