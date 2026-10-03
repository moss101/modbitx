import { DEFAULT_DESIGN, paperDesign } from "./design";
import type { Connector, Effort, Settings, Skill } from "./types";

export function mergeSkills(saved: Skill[] | undefined): Skill[] {
  if (!saved?.length) return SEED_SKILLS;
  const seeds = new Map(SEED_SKILLS.map((skill) => [skill.id, skill]));
  const merged = saved.map((skill) => {
    const seed = seeds.get(skill.id);
    if (!seed || !skill.bundled) return skill;
    return { ...skill, name: seed.name, blurb: seed.blurb, instructions: seed.instructions };
  });
  for (const seed of SEED_SKILLS) {
    if (!merged.some((skill) => skill.id === seed.id)) merged.push(seed);
  }
  return merged;
}

export const EFFORTS: { id: Effort; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "xhigh", label: "Extra high" },
  { id: "max", label: "Max" }
];

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  textScale: 16,
  density: "comfortable",
  apiKey: "",
  baseUrl: "https://api.x.ai/v1",
  provider: "xai",
  providerKeys: {},
  providerBase: {},
  customModels: {},
  zcodeKey: "",
  zcodeBaseUrl: "",
  model: "grok-4.7",
  effort: "xhigh",
  memoryOn: true,
  orgMemoryOn: false,
  orgMemories: [],
  enterToSend: true,
  quickEntry: true,
  computerUse: true,
  artifactsOn: true,
  voiceOn: true,
  speakVoice: "",
  speakRate: 0,
  dictation: true,
  approvalChime: false,
  notifySound: false,
  incognitoDefault: false,
  showThinking: true,
  launchNote: "",
  language: "en-US",
  displayName: "You",
  fullName: "",
  avatar: "",
  email: "",
  orgName: "Personal",
  orgRole: "owner",
  plan: "pro",
  seats: 1,
  usageTokens: 0,
  permissionMode: "ask",
  computerMode: "background",
  githubToken: "",
  sshTarget: "",
  remoteControl: false,
  pairingCode: "",
  backgroundScheduler: false,
  published: [],
  shares: [],
  allowedHosts: [],
  blockedHosts: [],
  highRiskHosts: [],
  trustedFolders: [],
  jevRouting: true,
  browserHarness: true,
  design: DEFAULT_DESIGN,
  designSystems: [paperDesign()],
  defaultDesignId: "paper",
  motion: "system",
  runOnStartup: false,
  menuBar: true,
  keepAwake: false,
  notifyOnDone: false,
  dockAttention: false,
  transcriptWidth: "medium",
  interfaceFont: "sans",
  codeFont: "",
  sidebarOrder: ["projects", "artifacts", "design", "scheduled", "dispatch", "customize"],
  outputStyle: "default",
  simIos: true,
  simAndroid: true,
  browserTools: true,
  keepBrowserCookies: true,
  browserPerSession: false,
  fileTools: true,
  allowBypass: true,
  branchPrefix: "",
  worktreeLocation: "",
  deniedApps: [],
  archiveAfterDays: 30,
  members: [],
  invoices: []
};

export const SEED_CONNECTORS: Connector[] = [
  { id: "files", name: "Local files", category: "Desktop", blurb: "Read folders you grant for Cowork and Code.", enabled: true, kind: "directory" },
  { id: "github", name: "GitHub", category: "Developer", blurb: "Issues, pull requests, and repository context.", enabled: false, kind: "directory" },
  { id: "calendar", name: "Calendar", category: "Work", blurb: "Read upcoming events when you connect an account.", enabled: false, kind: "directory" },
  { id: "mail", name: "Mail", category: "Work", blurb: "Summarize threads you explicitly attach.", enabled: false, kind: "directory" },
  { id: "messages", name: "Messages", category: "Desktop", blurb: "Read recent iMessage chats and send messages, through this Mac's Messages app.", enabled: false, kind: "directory" },
  { id: "browser", name: "Built-in browser notes", category: "Cowork", blurb: "Keep a scratch log of pages you paste in.", enabled: false, kind: "directory" },
  { id: "custom-mcp", name: "Custom MCP server", category: "Developer", blurb: "stdio server command stored locally. Modbitx records it; you start it yourself.", enabled: false, kind: "custom", command: "" }
];

export const SEED_SKILLS: Skill[] = [
  { id: "docx", name: "Documents", blurb: "Create and revise Word files in the granted folder.", enabled: true, bundled: true, instructions: "Use doc_write with kind docx to write a .docx file in the granted folder. doc_read returns its text. To add to an existing file, start the content with APPEND and a newline. Keep headings and short paragraphs." },
  { id: "pdf", name: "PDF reading", blurb: "Read PDF text and write a one-page text PDF.", enabled: true, bundled: true, instructions: "doc_read uses pdftotext for a PDF in the granted folder. Cite only text that came back. doc_write with kind pdf writes a one-page text PDF. Do not invent pages that were not extracted." },
  { id: "slides", name: "Slides", blurb: "Write a PowerPoint file in the granted folder.", enabled: true, bundled: true, instructions: "Use doc_write with kind pptx. Separate slides with a line that starts with ##. The first line of a slide is the title. Start the content with APPEND and a newline to add slides to an existing deck." },
  { id: "sheets", name: "Spreadsheets", blurb: "Write a spreadsheet in the granted folder.", enabled: false, bundled: true, instructions: "Use doc_write with kind xlsx. One row per line and commas between cells, up to 26 columns. Start the content with APPEND and a newline to add rows to an existing sheet." },
  { id: "frontend", name: "Interface design", blurb: "Produce self-contained HTML artifacts.", enabled: true, bundled: true, instructions: "When asked for a UI, return one fenced html artifact that is self-contained. Use the design system CSS variables --ink, --paper, --accent, --radius, and --space. Say which device width the layout is for. The preview may call window.modbitxAsk(question) for a short plain-text answer. That call cannot browse or edit files." },
  { id: "code", name: "Repository work", blurb: "Explain diffs and propose patches without applying them silently.", enabled: true, bundled: true, instructions: "Show proposed edits as fenced patches and name the file path." }
];

export function effortGuide(effort: Effort): string {
  switch (effort) {
    case "low": return "Answer directly in a few sentences.";
    case "medium": return "Be concise, with the key reasoning visible.";
    case "high": return "Think carefully and cover edge cases that matter.";
    case "xhigh": return "Use extra-high effort. Check assumptions, structure the answer, and say what you did not verify.";
    case "max": return "Use maximum effort. Explore alternatives, then recommend one path with tradeoffs.";
  }
}
