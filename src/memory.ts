/**
 * Memory tool verbs, kept pure so a node check can drive them and the store can
 * apply their result directly. A verb names a note by name and the store keeps
 * the list on this Mac.
 */
import type { MemoryNote } from "./types";

export type MemoryVerb = "write" | "append" | "delete";

export const MEMORY_NAME_LIMIT = 60;
export const MEMORY_TEXT_LIMIT = 4000;

export interface MemoryChange {
  notes: MemoryNote[];
  output: string;
  ok: boolean;
}

function findNamed(notes: MemoryNote[], name: string): MemoryNote | undefined {
  const needle = name.toLowerCase();
  return notes.find((note) => (note.name || "").toLowerCase() === needle);
}

/**
 * Applies one verb to a copy of the list. write replaces the named note or adds
 * it, append adds a line to the named note and creates it when missing, delete
 * removes the named note.
 */
export function applyMemoryVerb(
  notes: MemoryNote[],
  verb: MemoryVerb,
  rawName: string,
  rawContent: string,
  newId: () => string,
  now: number
): MemoryChange {
  const name = String(rawName || "").trim().slice(0, MEMORY_NAME_LIMIT);
  const content = String(rawContent || "").trim().slice(0, MEMORY_TEXT_LIMIT);
  if (!name) return { notes, ok: false, output: "A memory verb needs the note name in name." };
  if (verb !== "delete" && !content) return { notes, ok: false, output: `memory_${verb} needs the note text in content.` };
  const existing = findNamed(notes, name);
  if (verb === "delete") {
    if (!existing) return { notes, ok: true, output: `No memory named ${name}.` };
    return { ok: true, notes: notes.filter((note) => note.id !== existing.id), output: `Deleted memory ${name}.` };
  }
  if (verb === "append") {
    if (existing) {
      const joined = `${existing.text}\n${content}`.slice(0, MEMORY_TEXT_LIMIT);
      const updated = { ...existing, text: joined, updatedAt: now };
      return { ok: true, notes: notes.map((note) => (note.id === existing.id ? updated : note)), output: `Added to memory ${name}.` };
    }
    return { ok: true, notes: [{ id: newId(), name, text: content, updatedAt: now }, ...notes], output: `Saved memory ${name}.` };
  }
  const replacement: MemoryNote = { id: existing ? existing.id : newId(), name, text: content, updatedAt: now };
  const next = existing
    ? notes.map((note) => (note.id === existing.id ? replacement : note))
    : [replacement, ...notes];
  return { ok: true, notes: next, output: `Saved memory ${name}.` };
}

/** The lines the request sends, named so the model can update them later. */
export function memoryPromptLines(notes: MemoryNote[]): string[] {
  return notes.map((note) => `- ${note.name ? `${note.name}: ${note.text}` : note.text}`);
}
