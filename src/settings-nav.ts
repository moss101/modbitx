export interface NavItem {
  id: string;
  label: string;
  hints: string;
}

export const SETTINGS_MAIN: NavItem[] = [
  { id: "preferences", label: "Preferences", hints: "appearance theme light dark system density compact comfortable chat font motion reduced text size small medium large enter notify steps jev" },
  { id: "models", label: "Models", hints: "default model effort reasoning pick chat" },
  { id: "voice", label: "Voice", hints: "read aloud speaker voice rate speak listen" },
  { id: "dictation", label: "Dictation", hints: "dictation push to talk microphone shortcut shift command d speech" },
  { id: "notifications", label: "Notifications", hints: "notify done dock bounce chime sound approval alert" },
  { id: "language", label: "Language", hints: "language reply locale english japanese german french spanish" },
  { id: "privacy", label: "Privacy", hints: "memory incognito export delete archived" },
  { id: "billing", label: "Billing", hints: "invoice receipt plan" },
  { id: "usage", label: "Usage", hints: "tokens plan meter estimate" },
  { id: "instructions", label: "System prompt", hints: "instructions prompt style tone launch note" },
  { id: "providers", label: "Model providers", hints: "provider api key endpoint base url model openai anthropic google groq mistral deepseek openrouter ollama local azure bedrock key save" },
  { id: "capabilities", label: "Capabilities", hints: "artifacts voice files commands" },
  { id: "design", label: "Design systems", hints: "color ink paper accent radius type components default rename delete share" },
  { id: "connectors", label: "Connectors", hints: "github calendar mail token" },
  { id: "code", label: "Code", hints: "permission bypass plan auto simulator browser cookies branch ssh font transcript width output interface rules hooks commands" },
  { id: "cowork", label: "Cowork", hints: "folder site block harness schedule handoff" },
  { id: "transfer", label: "Import & export", hints: "backup chats import export" },
  { id: "chrome", label: "Chrome", hints: "extension pairing handoff" }
];

export const SETTINGS_DESKTOP: NavItem[] = [
  { id: "desktop", label: "General", hints: "startup menu bar awake computer shortcut storage accessibility login tray quick entry" },
  { id: "computer", label: "This computer", hints: "this computer versions electron macos state file storage machine info about" },
  { id: "shortcuts", label: "Keyboard shortcuts", hints: "keys keybindings hotkeys palette quick entry reference" },
  { id: "extensions", label: "Extensions", hints: "connector enable desktop" },
  { id: "developer", label: "Developer", hints: "api key model effort mcp grok" }
];

export const SETTINGS_CUSTOMIZE: NavItem[] = [
  { id: "skills", label: "Skills", hints: "skill instructions bundled" },
  { id: "customize-connectors", label: "Connectors", hints: "connector enable custom directory" },
  { id: "plugins", label: "Plugins", hints: "plugin mcp local command" }
];

export const SETTINGS_ACCOUNT: NavItem = {
  id: "account",
  label: "Account",
  hints: "account name email organization seats people role plan what to call you avatar"
};

/** Every section, in nav order, with the group each one belongs to. */
export function settingsCatalog(): { title: string; items: NavItem[] }[] {
  return [
    { title: "", items: SETTINGS_MAIN },
    { title: "Desktop app", items: SETTINGS_DESKTOP },
    { title: "Customize", items: SETTINGS_CUSTOMIZE }
  ];
}

export function matchesSetting(item: NavItem, q: string): boolean {
  return `${item.label} ${item.hints}`.toLowerCase().includes(q);
}

/** Groups filtered by the settings search. Account joins as its own group when it matches. */
export function settingsGroups(q: string): { title: string; items: NavItem[] }[] {
  const groups = settingsCatalog()
    .map((group) => ({ ...group, items: group.items.filter((item) => !q || matchesSetting(item, q)) }))
    .filter((group) => group.items.length);
  if (q && matchesSetting(SETTINGS_ACCOUNT, q)) groups.push({ title: "Account", items: [SETTINGS_ACCOUNT] });
  return groups;
}

const TITLES = new Map([...SETTINGS_MAIN, ...SETTINGS_DESKTOP, ...SETTINGS_CUSTOMIZE, SETTINGS_ACCOUNT].map((item) => [item.id, item.label]));

export function settingsTitle(id: string): string | undefined {
  return TITLES.get(id);
}
