export {};

declare global {
  interface Window {
    modbitx?: {
      chooseFolder: () => Promise<string | null>;
      chooseFiles: () => Promise<{ name: string; path: string; size: number; text: string }[]>;
      listDir: (dir: string) => Promise<{ name: string; kind: "dir" | "file" }[]>;
      readFile: (filePath: string) => Promise<string>;
      openPath: (target: string) => Promise<void>;
      loadState: () => Promise<string | null>;
      saveState: (json: string) => Promise<boolean>;
      /** Value of an allow-listed provider key variable in this Mac's environment, or null. */
      keyEnv: (name: string) => Promise<string | null>;
      /** One non-streaming chat completion, sent from the main process so CORS cannot block it. */
      modelChat: (payload: { url: string; key: string; body: Record<string, unknown> }) => Promise<{ ok: boolean; status: number; text: string }>;
      /** Starts a streaming completion in the main process. Chunks arrive on onModelStream under this id. */
      modelStream: (payload: { url: string; key: string; body: Record<string, unknown> }) => Promise<{ id: string; ok: boolean; status: number; text?: string }>;
      onModelStream: (handler: (event: { id: string; type: "chunk" | "end" | "error"; text?: string; message?: string }) => void) => () => void;
      hideQuick: () => Promise<void>;
      submitQuick: (text: string) => Promise<void>;
      onQuick: (handler: (text: string) => void) => () => void;
      info: () => Promise<{ version: string; userData: string; platform: string; packaged: boolean }>;
      applyDesktop: (prefs: { runOnStartup?: boolean; menuBar?: boolean; keepAwake?: boolean; quickEntry?: boolean; dictation?: boolean }) => Promise<{ ok: boolean; openAtLogin: boolean; status: string }>;
      notify: (title: string, body: string) => Promise<boolean>;
      bounceDock: () => Promise<boolean>;
      desktopStorage: () => Promise<{ bytes: number; files: number }>;
      clearCache: () => Promise<boolean>;
      openPrivacy: (pane: "accessibility" | "screen") => Promise<boolean>;
      saveText: (suggested: string, text: string) => Promise<string | null>;
      /** Writes an artifact through the document writer. Without a destination the app asks where to save. */
      exportArtifact: (kind: string, suggested: string, payload: string, dest?: string) => Promise<{ file: string; kind: string } | null>;
      openText: () => Promise<string | null>;
      saveBytes: (suggested: string, base64: string) => Promise<string | null>;
      openBytes: () => Promise<{ name: string; base64: string } | null>;
      clearBrowserStorage: () => Promise<boolean>;
      setBrowserPartition: (key: string) => Promise<string>;
      jevRoute: (text: string, mode: string) => Promise<{
        ok: boolean;
        reason?: string;
        model?: string;
        surface?: { choice: string; confidence: number };
        needsBrowser?: number;
        needsComputer?: number;
        needsFolder?: number;
        needsSimulator?: number;
      }>;
      jevSite: (host: string, url: string) => Promise<{ ok: boolean; reason?: string; model?: string; risk?: number }>;
      jevBrowser: (payload: {
        goal: string;
        url: string;
        title: string;
        headings: string[];
        controls: { id: string; kind: string; label: string }[];
        options: { key: string; description: string }[];
      }) => Promise<{
        ok: boolean;
        reason?: string;
        model?: string;
        done?: number;
        commits?: number;
        action?: { choice: string; confidence: number };
      }>;
      jevDesign: (payload: {
        brief: string;
        html: string;
        tokens: { name: string; ink: string; paper: string; accent: string; font: string; radius: number; space: number; components?: string };
      }) => Promise<{
        ok: boolean;
        reason?: string;
        model?: string;
        hierarchy?: { score: number; confidence: number; legend?: Record<string, string> };
        density?: { score: number; confidence: number; legend?: Record<string, string> };
        tokenFit?: { score: number; confidence: number; legend?: Record<string, string> };
        next?: { choice: string; confidence: number };
      }>;
      jevDesignSystem: (payload: {
        message: string;
        systems: { id: string; name: string; ink: string; paper: string; accent: string; font: string; components?: string }[];
      }) => Promise<{
        ok: boolean;
        reason?: string;
        model?: string;
        needsDesign?: number;
        system?: { choice: string; confidence: number };
      }>;
      jevPrepare: (payload: {
        message: string;
        mode: string;
        skills: { id: string; name: string; blurb: string }[];
      }) => Promise<{
        ok: boolean;
        reason?: string;
        model?: string;
        needsPlan?: number;
        skill?: { choice: string; confidence: number };
      }>;
      jevReview: (payload: { action: string; folder: string }) => Promise<{
        ok: boolean;
        reason?: string;
        model?: string;
        harm?: number;
        decision?: { choice: string; confidence: number };
      }>;
      jevSession: (payload: {
        title?: string;
        permission?: string;
        planStatus?: string;
        plan?: string;
        messages?: { role?: string; text?: string; content?: string; steps?: { tool?: string; ok?: boolean; output?: string }[] }[];
      }) => Promise<{
        ok: boolean;
        reason?: string;
        model?: string;
        status?: { choice: string; confidence: number };
      }>;
      hookExec: (folder: string, command: string, args: string[], payload: Record<string, unknown>, timeoutMs?: number) => Promise<{ code: number; stdout: string; stderr: string }>;
      browserBounds: (rect: { x: number; y: number; width: number; height: number }) => Promise<void>;
      browserHide: () => Promise<void>;
      browserLoad: (url: string) => Promise<string>;
      browserNav: (dir: "back" | "forward" | "reload") => Promise<string>;
      browserText: () => Promise<{ url: string; title: string; text: string }>;
      setDownloadDir: (dir: string) => Promise<string>;
      browserDownload: () => Promise<{ path: string; state: string; name: string } | null>;
      browserUpload: (selector: string, filePath: string) => Promise<{ ok: boolean; file: string }>;
      browserDialogs: () => Promise<{ type: string; message: string; accepted: boolean }[]>;
      acceptDialog: (accept: boolean) => Promise<boolean>;
      armComputer: (on: boolean) => Promise<boolean>;
      screenshot: () => Promise<{ dataUrl: string; file: string; width: number; height: number }>;
      clickAt: (x: number, y: number, button?: "left" | "right" | "double") => Promise<{ x: number; y: number; button?: string }>;
      movePointer: (x: number, y: number) => Promise<{ x: number; y: number }>;
      dragPointer: (x: number, y: number, x2: number, y2: number) => Promise<{ x: number; y: number; x2: number; y2: number }>;
      typeText: (text: string) => Promise<{ typed: number }>;
      pressKey: (key: string) => Promise<{ key: string }>;
      hotkey: (key: string, modifiers: string[]) => Promise<{ key: string; modifiers: string[] }>;
      scrollScreen: (direction: "up" | "down", amount: number) => Promise<{ direction: string; count: number }>;
      readClipboard: () => Promise<string>;
      writeClipboard: (text: string) => Promise<{ length: number }>;
      writeFile: (root: string, rel: string, content: string) => Promise<string>;
      runCommand: (root: string, command: string) => Promise<{ code: number; stdout: string; stderr: string }>;
      applyPatch: (root: string, diff: string) => Promise<{ code: number; stdout: string }>;
      browserClick: (target: { selector?: string; x?: number; y?: number; text?: string }) => Promise<{ ok: boolean; text?: string; error?: string; url?: string }>;
      browserFill: (selector: string, value: string) => Promise<{ ok: boolean; name?: string; error?: string }>;
      browserPress: (key: string) => Promise<{ ok: boolean; key?: string; url?: string; error?: string }>;
      browserScroll: (amount: number) => Promise<{ ok: boolean; y?: number }>;
      browserChoose: (label: string, value: string) => Promise<{ ok: boolean; name?: string; value?: string; error?: string }>;
      browserDom: () => Promise<{ url: string; title: string; nodes: { tag: string; type: string; name: string; text: string; href: string }[] }>;
      browserShot: () => Promise<{ file: string; dataUrl: string; width: number; height: number }>;
      listApps: () => Promise<string[]>;
      focusApp: (name: string, takeover: boolean) => Promise<{ ok: boolean; mode: string; detail: string }>;
      speak: (text: string, opts?: { voice?: string; rate?: number }) => Promise<boolean>;
      stopSpeech: () => Promise<boolean>;
      voices: () => Promise<{ name: string; lang: string; sample: string }[]>;
      onDictation: (handler: () => void) => () => void;
      simulators: () => Promise<{ ok: boolean; error?: string; devices: { platform?: string; name: string; udid: string; state: string; runtime: string }[] }>;
      bootSimulator: (udid: string) => Promise<{ ok: boolean; detail: string }>;
      openInSimulator: (udid: string, url: string) => Promise<{ ok: boolean; detail: string }>;
      simulator: (payload: {
        action: string;
        target?: string;
        x?: number;
        y?: number;
        x2?: number;
        y2?: number;
        text?: string;
        url?: string;
        path?: string;
        bundle?: string;
      }) => Promise<{ ok: boolean; detail?: string; error?: string; dataUrl?: string; width?: number; height?: number; udid?: string }>;
      git: (folder: string, action: string, message?: string, extra?: string) => Promise<{ code: number; stdout: string; stderr: string }>;
      ssh: (target: string, command: string, opts?: { acceptNew?: boolean }) => Promise<{ code: number; stdout: string; stderr: string }>;
      /** True when the host's key is already in this Mac's known_hosts. */
      sshKnown: (target: string) => Promise<{ known: boolean; error?: string }>;
      rewindSave: (folder: string, rel: string) => Promise<string | null>;
      rewindList: () => Promise<{ id: string; rel?: string; file?: string }[]>;
      rewindRestore: (id: string) => Promise<string>;
      readDocument: (filePath: string) => Promise<string>;
      writeDocument: (kind: string, dest: string, payload: string) => Promise<string>;
      github: (token: string, pathName?: string) => Promise<{ ok: boolean; status: number; body: string }>;
      calendarEvents: () => Promise<{ ok: boolean; text: string }>;
      mailInbox: () => Promise<{ ok: boolean; text: string }>;
      mcpStart: (id: string, command: string) => Promise<unknown>;
      mcpTools: (id: string) => Promise<unknown>;
      mcpCall: (id: string, name: string, args?: Record<string, unknown>) => Promise<unknown>;
      mcpStop: (id: string) => Promise<boolean>;
      termStart: (cwd?: string) => Promise<string>;
      termWrite: (id: string, data: string) => Promise<boolean>;
      termKill: (id: string) => Promise<boolean>;
      onTerm: (handler: (payload: { id: string; data: string }) => void) => () => void;
      /** Runs webContents.findInPage on this window. findNext continues the previous search. */
      findInPage: (text: string, options?: { forward?: boolean; findNext?: boolean }) => Promise<{ started: boolean }>;
      stopFindInPage: (action: "clear" | "keep" | "activate") => Promise<boolean>;
      onFindResult: (handler: (result: { active: number; matches: number }) => void) => () => void;
      envInfo: () => Promise<{
        app: string;
        electron: string;
        node: string;
        chrome: string;
        platform: string;
        osName: string;
        userData: string;
        stateFile: string;
      }>;
      popoutThread: (threadId: string) => Promise<boolean>;
      /** Reads recent Messages chats through AppleScript; macOS asks once for Automation permission. */
      messagesRead: (limit?: number) => Promise<string>;
      messagesSend: (target: string, text: string) => Promise<string>;
      /** Fast pattern search over a granted folder with the bundled ripgrep. */
      searchRepo: (folder: string, pattern: string, opts?: { limit?: number; perFile?: number }) => Promise<{ code: number; matches: string[]; note: string }>;
      /** Compiles a .tex file in the granted folder with a system tectonic or TeX toolchain. */
      latexCompile: (folder: string, rel: string) => Promise<{ pdf: string; note: string }>;
      /** Fetches a page as plain text. Host approval happens before this is called. */
      fetchPage: (url: string) => Promise<{ url: string; title: string; text: string }>;
      recordStart: () => Promise<{ ok: boolean; note: string }>;
      recordStop: () => Promise<{ ok: boolean; startedAt: number; frames: { at: number; app: string }[] }>;
      recordLatest: () => Promise<{ startedAt: number; frames: { at: number; app: string }[] }>;
      listPlugins: () => Promise<{ dir: string; items: { id: string; name: string; blurb: string; instructions: string }[]; servers: { id: string; name: string; command: string; version: number; blurb: string }[] }>;
      installPlugin: () => Promise<{ name: string; dir: string } | null>;
      watchPlugins: () => Promise<string>;
      onPlugins: (handler: (items: { id: string; name: string; blurb: string; instructions: string }[], servers: { id: string; name: string; command: string; version: number; blurb: string }[]) => void) => () => void;
      chromeEnqueue: (job: { type: string; selector?: string; text?: string }) => Promise<number>;
      syncInfo: () => Promise<{ port: number; pairing: string; url: string; serverUp: boolean; serverNote: string }>;
      syncPull: () => Promise<{ text?: string; at: number; taskId?: string; title?: string; source?: string; page?: { title?: string; url?: string; text?: string; error?: string } }[]>;
      pullNotices: () => Promise<{ taskId?: string; title?: string; status: "finished" | "cant-run" | "needs-input"; detail?: string; at?: number }[]>;
      publishArtifact: (id: string, html: string) => Promise<{ file: string; url: string }>;
      /** Saves a copy the local server serves at /share/<id>, so the link works until revoked. */
      shareArtifact: (id: string, html: string) => Promise<{ id: string; file: string; url: string }>;
      unshareArtifact: (id: string) => Promise<{ removed: boolean }>;
      openLocalPage: (url: string) => Promise<boolean>;
      listConnectors: () => Promise<{ dir: string; items: { id: string; name: string; command: string; version: number; blurb: string }[] }>;
      watchConnectors: () => Promise<string>;
      onConnectors: (handler: (items: { id: string; name: string; command: string; version: number; blurb: string }[]) => void) => () => void;
      installScheduler: () => Promise<string>;
      removeScheduler: () => Promise<boolean>;
      onMenu: (handler: (channel: string, payload?: string) => void) => () => void;
    };
  }
}
