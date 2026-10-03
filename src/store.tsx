import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from "react";
import { forkedThread } from "./agent";
import { mergeBgTask, patchBgTask, type BgTask } from "./bgtasks";
import { DEFAULT_SETTINGS, mergeSkills, SEED_CONNECTORS, SEED_SKILLS } from "./catalog";
import { settleDesign } from "./design";
import { rememberVersion } from "./artifacts";
import { settledModel, settleProviders } from "./providers";
import { archiveIdle } from "./local-jobs";
import type { AppState, Connector, DispatchItem, MemoryNote, Message, Mode, Project, ScheduledTask, Screen, Settings, Skill, Step, Thread } from "./types";

const STORAGE_KEY = "modbitx.state.v1";
/** Popout viewer windows hydrate from the saved state and never write it back. */
const POPOUT = new URLSearchParams(window.location.search).has("popout");

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function freshThread(partial: Partial<Thread> = {}): Thread {
  const now = Date.now();
  return {
    id: uid(),
    title: "New chat",
    mode: "chat",
    messages: [],
    pinned: false,
    archived: false,
    incognito: false,
    starred: false,
    model: DEFAULT_SETTINGS.model,
    effort: DEFAULT_SETTINGS.effort,
    createdAt: now,
    updatedAt: now,
    ...partial
  };
}

function seedState(): AppState {
  const welcome = freshThread({ title: "Welcome to Modbitx" });
  welcome.messages = [{
    id: uid(),
    role: "assistant",
    createdAt: Date.now(),
    content: "Modbitx is a local desktop workspace for chat, cowork, and code. Pick a mode on the left, or start typing. Set an xAI key in Settings to talk to Grok 4.7 at extra-high effort."
  }];
  return {
    threads: [welcome],
    projects: [{
      id: uid(),
      name: "Personal",
      description: "Notes and drafts that stay on this Mac.",
      instructions: "Be direct. Prefer short paragraphs. Ask before assuming a file was changed.",
      color: "#2f6f6a",
      knowledge: [],
      createdAt: Date.now()
    }],
    connectors: SEED_CONNECTORS,
    skills: SEED_SKILLS,
    memories: [],
    tasks: [],
    settings: DEFAULT_SETTINGS,
    runningThreadIds: [],
    dispatchQueue: [],
    activeThreadId: welcome.id,
    mode: "chat",
    screen: "thread",
    settingsSection: "preferences",
    sidebarCollapsed: false,
    artifactOpen: false,
    activeArtifactId: null,
    bgTasks: [],
    bgOpen: false
  };
}

type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "mode"; mode: Mode }
  | { type: "screen"; screen: Screen; section?: string }
  | { type: "sidebar" }
  | { type: "select"; id: string }
  | { type: "new-thread"; mode?: Mode; incognito?: boolean; projectId?: string; folder?: string }
  | { type: "fork"; threadId: string; folder?: string }
  | { type: "running"; id: string; on: boolean }
  | { type: "enqueue-dispatch"; item: DispatchItem }
  | { type: "patch-dispatch"; id: string; patch: Partial<DispatchItem> }
  | { type: "merge-connectors"; items: { id: string; name: string; command: string; version: number; blurb: string }[] }
  | { type: "merge-plugin-skills"; items: { id: string; name: string; blurb: string; instructions: string }[] }
  | { type: "patch-thread"; id: string; patch: Partial<Thread> }
  | { type: "server-note"; note: string }
  | { type: "delete-thread"; id: string }
  | { type: "add-message"; threadId: string; message: Message }
  | { type: "update-message"; threadId: string; messageId: string; content: string; steps?: Step[] }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "project"; project: Project }
  | { type: "patch-project"; id: string; patch: Partial<Project> }
  | { type: "delete-project"; id: string }
  | { type: "toggle-connector"; id: string }
  | { type: "set-connector-command"; id: string; command: string }
  | { type: "add-connector"; name: string; command: string }
  | { type: "toggle-skill"; id: string }
  | { type: "add-skill"; name: string; instructions: string }
  | { type: "patch-skill"; id: string; patch: Partial<Skill> }
  | { type: "delete-skill"; id: string }
  | { type: "memory"; note: MemoryNote }
  | { type: "replace-memories"; notes: MemoryNote[] }
  | { type: "delete-memory"; id: string }
  | { type: "task"; task: ScheduledTask }
  | { type: "patch-task"; id: string; patch: Partial<ScheduledTask> }
  | { type: "delete-task"; id: string }
  | { type: "artifact"; open: boolean; id?: string | null }
  | { type: "bg-start"; task: BgTask }
  | { type: "bg-patch"; id: string; patch: Partial<BgTask> }
  | { type: "bg-open"; open: boolean }
  | { type: "bg-clear-finished" }
  | { type: "remember-artifact"; id: string; title: string; language: string; content: string; at: number }
  | { type: "branch"; threadId: string; messageId: string }
  | { type: "archive-inactive"; before: number; running?: string[]; keep?: string[] }
  | { type: "delete-archived" }
  | { type: "import-bundle"; threads: Thread[]; memories: MemoryNote[]; tasks: ScheduledTask[]; projects: Project[] };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "mode":
      return { ...state, mode: action.mode, screen: "thread" };
    case "screen":
      return { ...state, screen: action.screen, settingsSection: action.section ?? state.settingsSection };
    case "sidebar":
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case "select": {
      const thread = state.threads.find((item) => item.id === action.id);
      if (!thread) return state;
      return { ...state, activeThreadId: thread.id, mode: thread.mode, screen: "thread" };
    }
    case "new-thread": {
      const thread = freshThread({
        mode: action.mode ?? state.mode,
        incognito: action.incognito ?? state.settings.incognitoDefault,
        projectId: action.projectId,
        folder: action.folder,
        model: settledModel(state.settings),
        effort: state.settings.effort,
        title: action.incognito ? "Incognito" : action.mode === "cowork" ? "New task" : action.mode === "code" ? "New session" : "New chat"
      });
      return { ...state, threads: [thread, ...state.threads], activeThreadId: thread.id, screen: "thread", mode: thread.mode };
    }
    case "server-note":
      return { ...state, serverNote: action.note };
    case "patch-thread":
      return {
        ...state,
        threads: state.threads.map((thread) => thread.id === action.id ? { ...thread, ...action.patch, updatedAt: Date.now() } : thread)
      };
    case "delete-thread": {
      const threads = state.threads.filter((thread) => thread.id !== action.id);
      const active = state.activeThreadId === action.id ? threads[0]?.id ?? null : state.activeThreadId;
      return { ...state, threads, activeThreadId: active };
    }
    case "add-message":
      return {
        ...state,
        threads: state.threads.map((thread) => {
          if (thread.id !== action.threadId) return thread;
          const title = thread.messages.length === 0 && action.message.role === "user"
            ? action.message.content.slice(0, 48) || thread.title
            : thread.title;
          return { ...thread, title, messages: [...thread.messages, action.message], updatedAt: Date.now() };
        })
      };
    case "update-message":
      return {
        ...state,
        threads: state.threads.map((thread) => thread.id !== action.threadId ? thread : {
          ...thread,
          messages: thread.messages.map((message) => message.id === action.messageId ? { ...message, content: action.content, steps: action.steps ?? message.steps } : message),
          updatedAt: Date.now()
        })
      };
    case "settings":
      return { ...state, settings: applySettingsPatch(state.settings, action.patch) };
    case "project":
      return { ...state, projects: [action.project, ...state.projects] };
    case "patch-project":
      return { ...state, projects: state.projects.map((project) => project.id === action.id ? { ...project, ...action.patch } : project) };
    case "delete-project":
      return { ...state, projects: state.projects.filter((project) => project.id !== action.id) };
    case "toggle-connector":
      return { ...state, connectors: state.connectors.map((c) => c.id === action.id ? { ...c, enabled: !c.enabled } : c) };
    case "set-connector-command":
      return { ...state, connectors: state.connectors.map((c) => c.id === action.id ? { ...c, command: action.command } : c) };
    case "add-connector":
      return {
        ...state,
        connectors: [...state.connectors, {
          id: uid(), name: action.name, category: "Developer", blurb: "Custom local MCP command.", enabled: true, kind: "custom", command: action.command
        }]
      };
    case "toggle-skill":
      return { ...state, skills: state.skills.map((s) => s.id === action.id ? { ...s, enabled: !s.enabled } : s) };
    case "add-skill":
      return {
        ...state,
        skills: [...state.skills, { id: uid(), name: action.name, blurb: "Custom skill", enabled: true, bundled: false, instructions: action.instructions }]
      };
    case "patch-skill":
      return { ...state, skills: state.skills.map((skill) => skill.id === action.id ? { ...skill, ...action.patch } : skill) };
    case "delete-skill":
      // A bundled skill returns on the next load, so deleting one is refused here too.
      return { ...state, skills: state.skills.filter((skill) => skill.id !== action.id || skill.bundled) };
    case "memory":
      return { ...state, memories: [action.note, ...state.memories.filter((m) => m.id !== action.note.id)] };
    case "replace-memories":
      return { ...state, memories: action.notes };
    case "delete-memory":
      return { ...state, memories: state.memories.filter((m) => m.id !== action.id) };
    case "task":
      return { ...state, tasks: [action.task, ...state.tasks] };
    case "patch-task":
      return { ...state, tasks: state.tasks.map((task) => task.id === action.id ? { ...task, ...action.patch } : task) };
    case "delete-task":
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.id) };
    case "artifact":
      return { ...state, artifactOpen: action.open, activeArtifactId: action.id === undefined ? state.activeArtifactId : action.id };
    case "bg-start":
      return { ...state, bgTasks: mergeBgTask(state.bgTasks || [], action.task), bgOpen: true };
    case "bg-patch":
      return { ...state, bgTasks: patchBgTask(state.bgTasks || [], action.id, action.patch) };
    case "bg-open":
      return { ...state, bgOpen: action.open };
    case "bg-clear-finished":
      return { ...state, bgTasks: (state.bgTasks || []).filter((task) => task.status === "running") };
    case "remember-artifact": {
      const published = rememberVersion(state.settings.published, action, action.at);
      if (!published) return state;
      return { ...state, settings: { ...state.settings, published } };
    }
    case "branch": {
      const source = state.threads.find((thread) => thread.id === action.threadId);
      if (!source) return state;
      const index = source.messages.findIndex((message) => message.id === action.messageId);
      const copy = freshThread({
        ...source,
        id: uid(),
        title: source.title + " (branch)",
        messages: source.messages.slice(0, index + 1),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      return { ...state, threads: [copy, ...state.threads], activeThreadId: copy.id, screen: "thread" };
    }
    case "fork": {
      const source = state.threads.find((thread) => thread.id === action.threadId);
      if (!source) return state;
      const copy = freshThread(forkedThread(source, uid(), Date.now()));
      if (action.folder) copy.folder = action.folder;
      return { ...state, threads: [copy, ...state.threads], activeThreadId: copy.id, mode: copy.mode, screen: "thread" };
    }
    case "running": {
      const ids = new Set(state.runningThreadIds || []);
      if (action.on) ids.add(action.id);
      else ids.delete(action.id);
      return { ...state, runningThreadIds: [...ids] };
    }
    case "enqueue-dispatch": {
      const text = action.item.text.trim();
      if (!text) return state;
      if ((state.dispatchQueue || []).some((item) => item.at === action.item.at && item.text === text)) return state;
      return { ...state, dispatchQueue: [{ ...action.item, text }, ...(state.dispatchQueue || [])].slice(0, 40) };
    }
    case "patch-dispatch":
      return {
        ...state,
        dispatchQueue: (state.dispatchQueue || []).map((item) => item.id === action.id ? { ...item, ...action.patch } : item)
      };
    case "merge-connectors":
      return { ...state, connectors: mergeConnectorCatalog(state.connectors, action.items) };
    case "merge-plugin-skills": {
      // Plugin folders own their text; a saved enable choice survives reloads.
      const current = new Map(state.skills.map((skill) => [skill.id, skill]));
      const merged = action.items.map((item) => ({
        id: item.id,
        name: item.name,
        blurb: item.blurb,
        enabled: current.get(item.id)?.enabled ?? true,
        instructions: item.instructions,
        bundled: false
      }));
      const kept = state.skills.filter((skill) => !skill.id.startsWith("plugin:") || merged.some((next) => next.id === skill.id));
      const ids = new Set(merged.map((skill) => skill.id));
      return { ...state, skills: [...kept.filter((skill) => !ids.has(skill.id)), ...merged] };
    }
    case "archive-inactive": {
      const threads = archiveIdle(state.threads, action.before, action.running || state.runningThreadIds || [], action.keep || []);
      if (threads.every((thread, index) => thread === state.threads[index])) return state;
      return { ...state, threads };
    }
    case "delete-archived": {
      const threads = state.threads.filter((thread) => !thread.archived);
      const active = threads.some((thread) => thread.id === state.activeThreadId) ? state.activeThreadId : threads[0]?.id ?? null;
      return { ...state, threads, activeThreadId: active };
    }
    case "import-bundle": {
      const threadIds = new Set(state.threads.map((thread) => thread.id));
      const memoryIds = new Set(state.memories.map((note) => note.id));
      const taskIds = new Set(state.tasks.map((task) => task.id));
      const projectIds = new Set(state.projects.map((project) => project.id));
      return {
        ...state,
        threads: [...action.threads.filter((thread) => thread.id && !threadIds.has(thread.id)), ...state.threads],
        memories: [...state.memories, ...action.memories.filter((note) => note.id && !memoryIds.has(note.id))],
        tasks: [...state.tasks, ...action.tasks.filter((task) => task.id && !taskIds.has(task.id))],
        projects: [...action.projects.filter((project) => project.id && !projectIds.has(project.id)), ...state.projects]
      };
    }
    default:
      return state;
  }
}

interface Store {
  state: AppState;
  dispatch: Dispatch<Action>;
  activeThread: Thread | undefined;
  newId: () => string;
}

const Ctx = createContext<Store | null>(null);

function applySettingsPatch(current: Settings, patch: Partial<Settings>): Settings {
  const next = { ...current, ...patch };
  return {
    ...next,
    ...settleDesign(current, patch),
    motion: next.motion === "reduce" ? "reduce" : "system",
    density: next.density === "compact" ? "compact" : "comfortable",
    blockedHosts: next.blockedHosts || [],
    highRiskHosts: next.highRiskHosts || [],
    deniedApps: next.deniedApps || [],
    members: Array.isArray(next.members) ? next.members : [],
    invoices: Array.isArray(next.invoices) ? next.invoices : [],
    orgMemories: Array.isArray(next.orgMemories) ? next.orgMemories : [],
    orgMemoryOn: next.orgMemoryOn === true,
    browserPerSession: next.browserPerSession === true,
    fullName: typeof next.fullName === "string" ? next.fullName.slice(0, 80) : "",
    avatar: typeof next.avatar === "string" && next.avatar.startsWith("data:image/") ? next.avatar.slice(0, 120_000) : "",
    worktreeLocation: typeof next.worktreeLocation === "string" ? next.worktreeLocation : ""
  };
}

function mergeConnectorCatalog(current: Connector[], items: { id: string; name: string; command: string; version: number; blurb: string }[]): Connector[] {
  const connectors = current.map((connector) => {
    const next = items.find((item) => item.id === connector.id);
    if (!next) return connector;
    if (next.command === connector.command && next.version === connector.catalogVersion && next.name === connector.name && next.blurb === connector.blurb) return connector;
    return { ...connector, name: next.name, command: next.command, blurb: next.blurb, catalogVersion: next.version };
  });
  for (const item of items) {
    if (connectors.some((connector) => connector.id === item.id)) continue;
    connectors.push({
      id: item.id,
      name: item.name,
      category: "Local folder",
      blurb: item.blurb,
      enabled: false,
      kind: "custom",
      command: item.command,
      catalogVersion: item.version
    });
  }
  return connectors;
}

function mergeSeed(raw: AppState): AppState {
  return {
    ...seedState(),
    ...raw,
    settingsSection: raw.settingsSection || "preferences",
    runningThreadIds: [],
    // A restart cannot keep a turn alive, so rows that were running are marked stopped.
    bgTasks: (Array.isArray(raw.bgTasks) ? raw.bgTasks : [])
      .filter((task) => task && typeof task.id === "string" && typeof task.prompt === "string")
      .map((task) => task.status === "running"
        ? { ...task, status: "stopped" as const, finishedAt: task.finishedAt ?? Date.now() }
        : task)
      .slice(0, 24),
    bgOpen: false,
    dispatchQueue: Array.isArray(raw.dispatchQueue) ? raw.dispatchQueue.filter((item) => item && typeof item.id === "string" && typeof item.text === "string") : [],
    settings: { ...applySettingsPatch(DEFAULT_SETTINGS, raw.settings || {}), ...settleProviders(applySettingsPatch(DEFAULT_SETTINGS, raw.settings || {})) },
    connectors: raw.connectors?.length ? raw.connectors : SEED_CONNECTORS,
    skills: mergeSkills(raw.skills?.length ? raw.skills : SEED_SKILLS)
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, seedState);
  const hydrated = useRef(false);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<number | 0>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let raw: string | null = null;
      if (window.modbitx) raw = await window.modbitx.loadState();
      else raw = localStorage.getItem(STORAGE_KEY);
      if (cancelled) return;
      if (raw) {
        try { dispatch({ type: "hydrate", state: mergeSeed(JSON.parse(raw)) }); } catch { /* keep seed */ }
      }
      hydrated.current = true;
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated.current || POPOUT) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const persist: AppState = {
        ...state,
        threads: state.threads.filter((thread) => !thread.incognito),
        runningThreadIds: []
      };
      const json = JSON.stringify(persist);
      if (window.modbitx) void window.modbitx.saveState(json);
      else localStorage.setItem(STORAGE_KEY, json);
    }, 250);
  }, [state]);

  useEffect(() => {
    if (!ready) return;
    const pass = () => {
      const days = Math.min(365, Math.max(1, state.settings.archiveAfterDays || 30));
      dispatch({
        type: "archive-inactive",
        before: Date.now() - days * 86_400_000,
        running: state.runningThreadIds || [],
        keep: state.activeThreadId ? [state.activeThreadId] : []
      });
    };
    pass();
    const id = window.setInterval(pass, 60_000);
    return () => window.clearInterval(id);
  }, [ready, state.threads, state.settings.archiveAfterDays, state.runningThreadIds, state.activeThreadId]);

  const activeThread = state.threads.find((thread) => thread.id === state.activeThreadId);
  const value = useMemo(() => ({ state, dispatch, activeThread, newId: uid }), [state, activeThread]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("store");
  return ctx;
}

