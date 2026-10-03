/** The keys Modbitx actually registers, so the reference cannot drift from the app. */
export interface Shortcut {
  keys: string;
  what: string;
  where: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: "⌘K", what: "Open the command palette", where: "Anywhere" },
  { keys: "⌘N", what: "New chat in the current mode", where: "Anywhere" },
  { keys: "⇧⌘N", what: "New incognito chat", where: "Anywhere" },
  { keys: "⌘1 / ⌘2 / ⌘3", what: "Switch between Chat, Cowork, and Code", where: "Anywhere" },
  { keys: "⇧⌘Space", what: "Quick entry panel", where: "Anywhere, when it is switched on" },
  { keys: "⇧⌘D", what: "Start or stop dictation", where: "Anywhere, when it is switched on" },
  { keys: "?", what: "Show this shortcut guide", where: "Outside the composer and inputs" },
  { keys: "⌘,", what: "Open Settings", where: "Anywhere" },
  { keys: "⌘F", what: "Find in the page", where: "Thread" },
  { keys: "Enter", what: "Send the message", where: "Composer, when Enter sends is on" },
  { keys: "⇧Enter", what: "New line without sending", where: "Composer" },
  { keys: "Escape", what: "Close the palette, a picker, or a compare view; stop a running turn", where: "Overlays and a running thread" },
  { keys: "↑ / ↓ then Enter", what: "Move through the palette and open the row", where: "Command palette" }
];

/** Every key string the app registers, for a check that the list is not invented. */
export function shortcutKeys(): string[] {
  return SHORTCUTS.map((item) => item.keys);
}
