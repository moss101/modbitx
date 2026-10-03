import type { DesignRecord, DesignSystem } from "./design";
import type { BgTask } from "./bgtasks";

export type Mode = "chat" | "cowork" | "code";
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
export type Theme = "light" | "dark" | "system";
export type Screen =
  | "thread"
  | "settings"
  | "customize"
  | "artifacts"
  | "projects"
  | "scheduled"
  | "dispatch";

export type PermissionMode = "ask" | "accept-edits" | "plan" | "auto" | "bypass";
export type ComputerMode = "background" | "takeover";
export type TranscriptWidth = "narrow" | "medium" | "wide";
export type InterfaceFont = "sans" | "serif" | "system";
export type OutputStyle = "default" | "concise" | "explanatory";
export type MotionPreference = "system" | "reduce";
/** Global density dial; compact retunes pads, gaps, control heights, and radii. */
export type Density = "comfortable" | "compact";
export type SessionLabel = "blocked" | "ready" | "done" | "working" | "unclassified";
export type TaskNotice = "finished" | "cant-run" | "needs-input";

export interface PublishedArtifact {
  id: string;
  title: string;
  versions: { at: number; content: string; language: string }[];
}

export interface ShareLink {
  id: string;
  threadId: string;
  /** The artifact this link serves, so the pane can list its own links. */
  artifactId?: string;
  title: string;
  createdAt: number;
}

export interface OrgMember {
  email: string;
  role: "admin" | "member";
}

export interface Invoice {
  id: string;
  at: number;
  amount: string;
  note: string;
}

export interface Attachment {
  id: string;
  name: string;
  path?: string;
  size: number;
  text: string;
}

export interface Artifact {
  id: string;
  title: string;
  language: string;
  content: string;
  messageId: string;
  updatedAt: number;
}

export interface Step {
  tool: string;
  ok: boolean;
  output: string;
}

export interface TodoItem {
  id: string;
  title: string;
  status: "pending" | "doing" | "done";
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  attachments?: Attachment[];
  thinking?: string;
  steps?: Step[];
}

export interface Thread {
  id: string;
  title: string;
  mode: Mode;
  projectId?: string;
  messages: Message[];
  pinned: boolean;
  archived: boolean;
  incognito: boolean;
  starred: boolean;
  model: string;
  effort: Effort;
  folder?: string;
  permissionMode?: PermissionMode;
  /** Permission to restore when a plan is approved. */
  planReturn?: PermissionMode;
  plan?: string;
  planStatus?: "draft" | "review" | "approved";
  todos?: TodoItem[];
  /** Session-scoped working notes the agent keeps across turns in this chat. */
  scratchpad?: string;
  sshTarget?: string;
  /** Design system used for this chat’s artifacts. Unset follows the workspace default. */
  designSystemId?: string;
  /** When true, a later message does not replace designSystemId. */
  designLocked?: boolean;
  /** Jev 1.13 label for a Code session. Unclassified when the Choice is flat. */
  sessionStatus?: SessionLabel;
  sessionConfidence?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  instructions: string;
  color: string;
  knowledge: Attachment[];
  /** When true, instructions and knowledge join every chat on this Mac, not only this project's chats. */
  shared?: boolean;
  createdAt: number;
}

export interface Connector {
  id: string;
  name: string;
  category: string;
  blurb: string;
  enabled: boolean;
  kind: "directory" | "custom" | "desktop-extension";
  command?: string;
  /** Version from a JSON file in the local connectors folder. */
  catalogVersion?: number;
}

export interface Skill {
  id: string;
  name: string;
  blurb: string;
  enabled: boolean;
  instructions: string;
  bundled: boolean;
}

export interface MemoryNote {
  id: string;
  /** Names the note so a memory verb can find it later. */
  name?: string;
  text: string;
  updatedAt: number;
}

export interface ScheduledTask {
  id: string;
  name: string;
  prompt: string;
  when: string;
  /** Weekdays it repeats on, Sunday 0. Empty or missing repeats every day. */
  days?: number[];
  enabled: boolean;
  cloud: boolean;
  lastRun?: number;
  lastNotice?: TaskNotice;
  lastNoticeAt?: number;
}

export interface DispatchItem {
  id: string;
  text: string;
  at: number;
  source: "phone" | "desktop" | "chrome";
  title?: string;
  status: "waiting" | "accepted" | "dismissed";
}

export interface Settings {
  theme: Theme;
  textScale: number;
  apiKey: string;
  baseUrl: string;
  /** Active model provider id from the catalog. Older saves have none and read as xai. */
  provider?: string;
  /** Keys saved per provider id. */
  providerKeys?: Record<string, string>;
  /** Endpoint overrides per provider id. Empty uses the catalog endpoint. */
  providerBase?: Record<string, string>;
  /** Model ids typed in by hand per provider id, for servers with no catalog models. */
  customModels?: Record<string, string>;
  /** Kept so an older save's ZCode key still migrates into providerKeys. */
  zcodeKey?: string;
  zcodeBaseUrl?: string;
  model: string;
  effort: Effort;
  memoryOn: boolean;
  /** Workspace notes included for people on this Mac when the switch is on. */
  orgMemoryOn: boolean;
  orgMemories: MemoryNote[];
  enterToSend: boolean;
  quickEntry: boolean;
  computerUse: boolean;
  artifactsOn: boolean;
  voiceOn: boolean;
  /** Speaker for Read aloud, from the Mac's installed voices. Empty uses the system default. */
  speakVoice: string;
  /** Read aloud rate in words per minute. 0 keeps the system default. */
  speakRate: number;
  /** The global push-to-talk dictation shortcut is registered. */
  dictation: boolean;
  /** A short chime plays when an approval is requested. */
  approvalChime: boolean;
  /** A short ding plays with system notifications. */
  notifySound: boolean;
  incognitoDefault: boolean;
  showThinking: boolean;
  launchNote: string;
  language: string;
  displayName: string;
  fullName: string;
  /** Small data URL, capped when saved. */
  avatar: string;
  email: string;
  orgName: string;
  orgRole: "owner" | "admin" | "member";
  plan: "free" | "pro" | "team";
  seats: number;
  usageTokens: number;
  permissionMode: PermissionMode;
  computerMode: ComputerMode;
  /** Computer use defers while you are typing or Secure Input holds the keyboard. */
  computerGuard: boolean;
  /** Cowork commands can run in the disposable per-task VM. */
  taskVm: boolean;
  githubToken: string;
  /** Slack bot token (xoxb-…) for the Slack connector tools. */
  slackToken: string;
  /** Linear personal API key for the Linear connector tools. */
  linearKey: string;
  /** Jira site (yourorg.atlassian.net), account email, and API token. */
  jiraDomain: string;
  jiraEmail: string;
  jiraToken: string;
  /** Notion integration token (ntn-…). */
  notionToken: string;
  /** Figma personal access token. */
  figmaToken: string;
  /** Sentry auth token and organization slug. */
  sentryToken: string;
  sentryOrg: string;
  /** Stripe secret key (sk_…), read-only tools. */
  stripeKey: string;
  sshTarget: string;
  remoteControl: boolean;
  pairingCode: string;
  backgroundScheduler: boolean;
  published: PublishedArtifact[];
  shares: ShareLink[];
  allowedHosts: string[];
  blockedHosts: string[];
  highRiskHosts: string[];
  trustedFolders: string[];
  jevRouting: boolean;
  browserHarness: boolean;
  design: DesignSystem;
  designSystems: DesignRecord[];
  defaultDesignId: string;
  motion: MotionPreference;
  runOnStartup: boolean;
  menuBar: boolean;
  keepAwake: boolean;
  notifyOnDone: boolean;
  dockAttention: boolean;
  transcriptWidth: TranscriptWidth;
  interfaceFont: InterfaceFont;
  codeFont: string;
  density: Density;
  /** Sidebar nav row order. A row missing from this list is hidden. */
  sidebarOrder?: string[];
  outputStyle: OutputStyle;
  simIos: boolean;
  simAndroid: boolean;
  browserTools: boolean;
  keepBrowserCookies: boolean;
  /** Each Cowork or Code chat gets its own browser partition. */
  browserPerSession: boolean;
  fileTools: boolean;
  allowBypass: boolean;
  branchPrefix: string;
  /** Directory where git worktree add places a new checkout. */
  worktreeLocation: string;
  deniedApps: string[];
  archiveAfterDays: number;
  members: OrgMember[];
  invoices: Invoice[];
}

export interface AppState {
  threads: Thread[];
  projects: Project[];
  connectors: Connector[];
  skills: Skill[];
  memories: MemoryNote[];
  tasks: ScheduledTask[];
  settings: Settings;
  /** Set while the local server cannot own its port, cleared when it can. */
  serverNote?: string;
  /** Thread ids whose turn is still running. Not written to disk. */
  runningThreadIds: string[];
  dispatchQueue: DispatchItem[];
  activeThreadId: string | null;
  mode: Mode;
  screen: Screen;
  settingsSection: string;
  sidebarCollapsed: boolean;
  artifactOpen: boolean;
  activeArtifactId: string | null;
  /** Background tasks: side questions that run while the open chat keeps working. */
  bgTasks: BgTask[];
  /** The background-tasks side panel is open. */
  bgOpen: boolean;
}
