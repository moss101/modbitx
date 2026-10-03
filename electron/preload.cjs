const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("modbitx", {
  chooseFolder: () => ipcRenderer.invoke("dialog:folder"),
  chooseFiles: () => ipcRenderer.invoke("dialog:files"),
  listDir: (dir) => ipcRenderer.invoke("fs:list", dir),
  readFile: (filePath) => ipcRenderer.invoke("fs:read", filePath),
  openPath: (target) => ipcRenderer.invoke("shell:open", target),
  loadState: () => ipcRenderer.invoke("state:load"),
  saveState: (json) => ipcRenderer.invoke("state:save", json),
  keyEnv: (name) => ipcRenderer.invoke("state:key-env", name),
  modelChat: (payload) => ipcRenderer.invoke("model:chat", payload),
  modelStream: (payload) => ipcRenderer.invoke("model:stream", payload),
  onModelStream: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on("model:stream", listener);
    return () => ipcRenderer.removeListener("model:stream", listener);
  },
  hideQuick: () => ipcRenderer.invoke("quick:hide"),
  submitQuick: (text) => ipcRenderer.invoke("quick:submit", text),
  onQuick: (handler) => {
    const wrapped = (_event, text) => handler(text);
    ipcRenderer.on("quick:submit", wrapped);
    return () => ipcRenderer.removeListener("quick:submit", wrapped);
  },
  info: () => ipcRenderer.invoke("app:info"),
  applyDesktop: (prefs) => ipcRenderer.invoke("desktop:apply", prefs),
  notify: (title, body) => ipcRenderer.invoke("desktop:notify", title, body),
  bounceDock: () => ipcRenderer.invoke("desktop:bounce"),
  desktopStorage: () => ipcRenderer.invoke("desktop:storage"),
  clearCache: () => ipcRenderer.invoke("desktop:clear-cache"),
  openPrivacy: (pane) => ipcRenderer.invoke("desktop:privacy", pane),
  saveText: (suggested, text) => ipcRenderer.invoke("dialog:save-text", suggested, text),
  /** Export an artifact as a document. A destination is optional; the UI lets the person choose. */
  exportArtifact: (kind, suggested, payload, dest) => ipcRenderer.invoke("artifact:export", kind, suggested, payload, dest),
  openText: () => ipcRenderer.invoke("dialog:open-text"),
  saveBytes: (suggested, base64) => ipcRenderer.invoke("dialog:save-bytes", suggested, base64),
  openBytes: () => ipcRenderer.invoke("dialog:open-bytes"),
  clearBrowserStorage: () => ipcRenderer.invoke("browser:clear-storage"),
  setBrowserPartition: (key) => ipcRenderer.invoke("browser:partition", key),
  jevRoute: (text, mode) => ipcRenderer.invoke("jev:route", text, mode),
  jevSite: (host, url) => ipcRenderer.invoke("jev:site", host, url),
  jevBrowser: (payload) => ipcRenderer.invoke("jev:browser", payload),
  jevDesign: (payload) => ipcRenderer.invoke("jev:design", payload),
  jevDesignSystem: (payload) => ipcRenderer.invoke("jev:design-system", payload),
  jevPrepare: (payload) => ipcRenderer.invoke("jev:prepare", payload),
  jevReview: (payload) => ipcRenderer.invoke("jev:review", payload),
  jevSession: (payload) => ipcRenderer.invoke("jev:session", payload),
  hookExec: (folder, command, args, payload, timeoutMs) => ipcRenderer.invoke("hook:exec", folder, command, args, payload, timeoutMs),
  browserBounds: (rect) => ipcRenderer.invoke("browser:bounds", rect),
  browserHide: () => ipcRenderer.invoke("browser:hide"),
  browserLoad: (url) => ipcRenderer.invoke("browser:load", url),
  browserNav: (dir) => ipcRenderer.invoke("browser:nav", dir),
  browserText: () => ipcRenderer.invoke("browser:text"),
  setDownloadDir: (dir) => ipcRenderer.invoke("browser:download-dir", dir),
  browserDownload: () => ipcRenderer.invoke("browser:last-download"),
  browserUpload: (selector, filePath) => ipcRenderer.invoke("browser:upload", selector, filePath),
  browserDialogs: () => ipcRenderer.invoke("browser:dialogs"),
  acceptDialog: (accept) => ipcRenderer.invoke("browser:accept-dialog", accept),
  armComputer: (on) => ipcRenderer.invoke("computer:arm", on),
  screenshot: () => ipcRenderer.invoke("computer:shot"),
  clickAt: (x, y, button) => ipcRenderer.invoke("computer:click", x, y, button),
  movePointer: (x, y) => ipcRenderer.invoke("computer:move", x, y),
  dragPointer: (x, y, x2, y2) => ipcRenderer.invoke("computer:drag", x, y, x2, y2),
  typeText: (text) => ipcRenderer.invoke("computer:type", text),
  pressKey: (key) => ipcRenderer.invoke("computer:key", key),
  hotkey: (key, modifiers) => ipcRenderer.invoke("computer:hotkey", key, modifiers),
  scrollScreen: (direction, amount) => ipcRenderer.invoke("computer:scroll", direction, amount),
  readClipboard: () => ipcRenderer.invoke("computer:clipboard-read"),
  writeClipboard: (text) => ipcRenderer.invoke("computer:clipboard-write", text),
  writeFile: (root, rel, content) => ipcRenderer.invoke("work:write", root, rel, content),
  runCommand: (root, command) => ipcRenderer.invoke("work:run", root, command),
  applyPatch: (root, diff) => ipcRenderer.invoke("work:apply", root, diff),
  browserClick: (target) => ipcRenderer.invoke("browser:click", target),
  browserFill: (selector, value) => ipcRenderer.invoke("browser:fill", selector, value),
  browserPress: (key) => ipcRenderer.invoke("browser:press", key),
  browserScroll: (amount) => ipcRenderer.invoke("browser:scroll", amount),
  browserChoose: (label, value) => ipcRenderer.invoke("browser:choose", label, value),
  browserDom: () => ipcRenderer.invoke("browser:dom"),
  browserShot: () => ipcRenderer.invoke("browser:shot"),
  listApps: () => ipcRenderer.invoke("computer:apps"),
  focusApp: (name, takeover) => ipcRenderer.invoke("computer:focus", name, takeover),
  speak: (text, opts) => ipcRenderer.invoke("voice:speak", text, opts),
  stopSpeech: () => ipcRenderer.invoke("voice:stop"),
  voices: () => ipcRenderer.invoke("voice:voices"),
  onDictation: (handler) => {
    const wrapped = () => handler();
    ipcRenderer.on("dictation:toggle", wrapped);
    return () => ipcRenderer.removeListener("dictation:toggle", wrapped);
  },
  simulators: () => ipcRenderer.invoke("sim:list"),
  bootSimulator: (udid) => ipcRenderer.invoke("sim:boot", udid),
  openInSimulator: (udid, url) => ipcRenderer.invoke("sim:open", udid, url),
  simulator: (payload) => ipcRenderer.invoke("sim:run", payload),
  git: (folder, action, message, extra) => ipcRenderer.invoke("git:run", folder, action, message, extra),
  ssh: (target, command, opts) => ipcRenderer.invoke("ssh:run", target, command, opts),
  sshKnown: (target) => ipcRenderer.invoke("ssh:known", target),
  rewindSave: (folder, rel) => ipcRenderer.invoke("rewind:save", folder, rel),
  rewindList: () => ipcRenderer.invoke("rewind:list"),
  rewindRestore: (id) => ipcRenderer.invoke("rewind:restore", id),
  readDocument: (filePath) => ipcRenderer.invoke("doc:read", filePath),
  writeDocument: (kind, dest, payload) => ipcRenderer.invoke("doc:write", kind, dest, payload),
  github: (token, pathName) => ipcRenderer.invoke("connect:github", token, pathName),
  calendarEvents: () => ipcRenderer.invoke("connect:calendar"),
  mailInbox: () => ipcRenderer.invoke("connect:mail"),
  mcpStart: (id, command) => ipcRenderer.invoke("mcp:start", id, command),
  mcpTools: (id) => ipcRenderer.invoke("mcp:tools", id),
  mcpCall: (id, name, args) => ipcRenderer.invoke("mcp:call", id, name, args),
  mcpStop: (id) => ipcRenderer.invoke("mcp:stop", id),
  termStart: (cwd) => ipcRenderer.invoke("term:start", cwd),
  termWrite: (id, data) => ipcRenderer.invoke("term:write", id, data),
  termKill: (id) => ipcRenderer.invoke("term:kill", id),
  findInPage: (text, options) => ipcRenderer.invoke("find:start", text, options),
  stopFindInPage: (action) => ipcRenderer.invoke("find:stop", action),
  envInfo: () => ipcRenderer.invoke("env:info"),
  popoutThread: (threadId) => ipcRenderer.invoke("session:popout", threadId),
  messagesRead: (limit) => ipcRenderer.invoke("messages:read", limit),
  messagesSend: (target, text) => ipcRenderer.invoke("messages:send", target, text),
  searchRepo: (folder, pattern, opts) => ipcRenderer.invoke("search:repo", folder, pattern, opts),
  latexCompile: (folder, rel) => ipcRenderer.invoke("latex:compile", folder, rel),
  fetchPage: (url) => ipcRenderer.invoke("fetch:page", url),
  recordStart: () => ipcRenderer.invoke("recording:start"),
  recordStop: () => ipcRenderer.invoke("recording:stop"),
  recordLatest: () => ipcRenderer.invoke("recording:latest"),
  onFindResult: (handler) => {
    const wrapped = (_event, payload) => handler(payload);
    ipcRenderer.on("find:result", wrapped);
    return () => ipcRenderer.removeListener("find:result", wrapped);
  },
  onTerm: (handler) => {
    const wrapped = (_event, payload) => handler(payload);
    ipcRenderer.on("term:data", wrapped);
    return () => ipcRenderer.removeListener("term:data", wrapped);
  },
  chromeEnqueue: (job) => ipcRenderer.invoke("chrome:enqueue", job),
  syncInfo: () => ipcRenderer.invoke("sync:info"),
  syncPull: () => ipcRenderer.invoke("sync:pull"),
  pullNotices: () => ipcRenderer.invoke("notices:pull"),
  publishArtifact: (id, html) => ipcRenderer.invoke("artifact:publish", id, html),
  shareArtifact: (id, html) => ipcRenderer.invoke("artifact:share", id, html),
  unshareArtifact: (id) => ipcRenderer.invoke("artifact:unshare", id),
  openLocalPage: (url) => ipcRenderer.invoke("shell:open-local", url),
  listConnectors: () => ipcRenderer.invoke("connectors:list"),
  watchConnectors: () => ipcRenderer.invoke("connectors:watch"),
  listPlugins: () => ipcRenderer.invoke("plugins:list"),
  watchPlugins: () => ipcRenderer.invoke("plugins:watch"),
  installPlugin: () => ipcRenderer.invoke("plugins:install"),
  onPlugins: (handler) => {
    const wrapped = (_event, payload) => handler(payload?.items || [], payload?.servers || []);
    ipcRenderer.on("plugins:changed", wrapped);
    return () => ipcRenderer.removeListener("plugins:changed", wrapped);
  },
  onConnectors: (handler) => {
    const wrapped = (_event, items) => handler(items || []);
    ipcRenderer.on("connectors:changed", wrapped);
    return () => ipcRenderer.removeListener("connectors:changed", wrapped);
  },
  installScheduler: () => ipcRenderer.invoke("scheduler:install"),
  removeScheduler: () => ipcRenderer.invoke("scheduler:remove"),
  onMenu: (handler) => {
    const channels = ["menu:settings", "menu:new-chat", "menu:incognito", "menu:open-folder", "menu:palette", "menu:mode", "menu:find"];
    const wrappers = channels.map((channel) => {
      const wrapped = (_event, payload) => handler(channel, payload);
      ipcRenderer.on(channel, wrapped);
      return [channel, wrapped];
    });
    return () => wrappers.forEach(([channel, wrapped]) => ipcRenderer.removeListener(channel, wrapped));
  }
});
