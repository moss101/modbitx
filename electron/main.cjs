const { app, BrowserWindow, ipcMain, dialog, shell, Menu, globalShortcut, nativeTheme, Tray, nativeImage, WebContentsView, screen, clipboard, powerSaveBlocker, Notification, session } = require("electron");
const path = require("path");
const fs = require("fs");
const { execFile, spawn } = require("child_process");
const { attachPlatform, readDocument, writeDocument } = require("./platform.cjs");
const { prepareHook } = require("./hook-guard.cjs");
const { prepareQuestions } = require("./plan-question.cjs");
const { prepareSession } = require("./session-question.cjs");

const isDev = !app.isPackaged;
let mainWindow = null;
let quickWindow = null;
let tray = null;
let wakeId = null;
const QUICK_SHORTCUT = "CommandOrControl+Shift+Space";
const DICTATION_SHORTCUT = "CommandOrControl+Shift+D";

function savedDesktopPrefs() {
  try {
    const raw = JSON.parse(fs.readFileSync(userDataFile(), "utf8"));
    return raw.settings || {};
  } catch {
    return {};
  }
}

function createTray() {
  const trayImage = nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGElEQVR4nGNgYGD4TyEeNWDUgFEDhocBAJvM/wGi6G+mAAAAAElFTkSuQmCC");
  trayImage.setTemplateImage(true);
  tray = new Tray(trayImage);
  tray.setToolTip("Modbitx");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "New chat", click: () => send("menu:new-chat") },
    { label: "Quick entry", click: () => createQuick() },
    { label: "Show Modbitx", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: "separator" },
    { label: "Quit", role: "quit" }
  ]));
}

function applyDesktop(prefs) {
  const next = prefs || {};
  let openAtLogin = false;
  let loginStatus = "not-registered";
  try {
    const want = next.runOnStartup === true;
    let login = app.getLoginItemSettings();
    if (want !== login.openAtLogin) {
      app.setLoginItemSettings({ openAtLogin: want });
      login = app.getLoginItemSettings();
    }
    openAtLogin = login.openAtLogin === true;
    loginStatus = login.status || loginStatus;
  } catch { /* unsigned dev builds can refuse a login item */ }
  if (next.menuBar === false) {
    if (tray && !tray.isDestroyed()) tray.destroy();
    tray = null;
  } else if (!tray || tray.isDestroyed()) {
    createTray();
  }
  if (next.keepAwake === true) {
    if (wakeId == null || !powerSaveBlocker.isStarted(wakeId)) wakeId = powerSaveBlocker.start("prevent-app-suspension");
  } else if (wakeId != null) {
    if (powerSaveBlocker.isStarted(wakeId)) powerSaveBlocker.stop(wakeId);
    wakeId = null;
  }
  const quick = next.quickEntry !== false;
  const registered = globalShortcut.isRegistered(QUICK_SHORTCUT);
  if (quick && !registered) globalShortcut.register(QUICK_SHORTCUT, () => createQuick());
  if (!quick && registered) globalShortcut.unregister(QUICK_SHORTCUT);
  // Dictation: the shortcut toggles push-to-talk in whichever Modbitx window is shown.
  const dictation = next.dictation !== false;
  const dictationRegistered = globalShortcut.isRegistered(DICTATION_SHORTCUT);
  if (dictation && !dictationRegistered) {
    globalShortcut.register(DICTATION_SHORTCUT, () => {
      const target = (quickWindow && quickWindow.isVisible() && !quickWindow.isDestroyed()) ? quickWindow : mainWindow;
      if (target && !target.isDestroyed()) target.webContents.send("dictation:toggle");
    });
  }
  if (!dictation && dictationRegistered) globalShortcut.unregister(DICTATION_SHORTCUT);
  return { ok: true, openAtLogin, status: loginStatus };
}

function folderBytes(dir) {
  let bytes = 0;
  let files = 0;
  const stack = [dir];
  while (stack.length && files < 20000) {
    const current = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else {
        files += 1;
        try { bytes += fs.statSync(full).size; } catch { /* skip unreadable files */ }
      }
    }
  }
  return { bytes, files };
}

function userDataFile() {
  return path.join(app.getPath("userData"), "modbitx-state.json");
}

function createMain() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: "Modbitx",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 16 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#1c1b19" : "#f6f4ee",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  if (isDev) mainWindow.loadURL("http://127.0.0.1:5173");
  else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  mainWindow.webContents.on("found-in-page", (_event, result) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("find:result", { active: result.activeMatchOrdinal, matches: result.matches });
    }
  });
}

function createQuick() {
  if (quickWindow && !quickWindow.isDestroyed()) {
    quickWindow.show();
    quickWindow.focus();
    return;
  }
  quickWindow = new BrowserWindow({
    width: 680,
    height: 420,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    vibrancy: "sidebar",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  const url = isDev
    ? "http://127.0.0.1:5173/?quick=1"
    : `file://${path.join(__dirname, "../dist/index.html")}?quick=1`;
  quickWindow.loadURL(url);
  quickWindow.once("ready-to-show", () => quickWindow.show());
  quickWindow.on("blur", () => {
    if (quickWindow && !quickWindow.isDestroyed()) quickWindow.hide();
  });
}

/** Session popout windows, one per thread. They read the saved state and never write it back. */
const popoutWindows = new Map();

function createPopout(threadId) {
  const id = String(threadId || "");
  if (!id) return;
  const existing = popoutWindows.get(id);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return;
  }
  const win = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 360,
    minHeight: 320,
    title: "Session",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#151515" : "#fcfcfb",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  popoutWindows.set(id, win);
  win.on("closed", () => popoutWindows.delete(id));
  const query = `?popout=1&thread=${encodeURIComponent(id)}`;
  const url = isDev
    ? `http://127.0.0.1:5173/${query}`
    : `file://${path.join(__dirname, "../dist/index.html")}${query}`;
  win.loadURL(url);
}

function buildMenu() {
  const template = [
    {
      label: "Modbitx",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { label: "Settings", accelerator: "CommandOrControl+,", click: () => send("menu:settings") },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "File",
      submenu: [
        { label: "New chat", accelerator: "CommandOrControl+N", click: () => send("menu:new-chat") },
        { label: "New incognito chat", accelerator: "CommandOrControl+Shift+N", click: () => send("menu:incognito") },
        { label: "Quick entry", accelerator: "CommandOrControl+Shift+Space", click: () => createQuick() },
        { type: "separator" },
        { label: "Open folder for Cowork", click: () => send("menu:open-folder") },
        { type: "separator" },
        { role: "close" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" }, { role: "redo" }, { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
        { type: "separator" },
        { label: "Find in page", accelerator: "CommandOrControl+F", click: () => send("menu:find") },
        { label: "Find in chats", accelerator: "CommandOrControl+K", click: () => send("menu:palette") }
      ]
    },
    {
      label: "View",
      submenu: [
        { label: "Chat", accelerator: "CommandOrControl+1", click: () => send("menu:mode", "chat") },
        { label: "Cowork", accelerator: "CommandOrControl+2", click: () => send("menu:mode", "cowork") },
        { label: "Code", accelerator: "CommandOrControl+3", click: () => send("menu:mode", "code") },
        { type: "separator" },
        { role: "reload" }, { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    { role: "windowMenu" }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function scalePoint(x, y) {
  const display = screen.getPrimaryDisplay().size;
  const shotW = lastShot.width || display.width;
  const shotH = lastShot.height || display.height;
  return [Math.round(Number(x) / shotW * display.width), Math.round(Number(y) / shotH * display.height)];
}

function mouseBin() {
  return path.join(app.getPath("userData"), "modbitx-mouse");
}

function guardBin() {
  return path.join(app.getPath("userData"), "modbitx-guard");
}

function ensureGuardBin() {
  const bin = guardBin();
  if (fs.existsSync(bin)) return Promise.resolve(bin);
  const source = path.join(__dirname, "guard.swift");
  return new Promise((resolve, reject) => {
    execFile("swiftc", ["-O", source, "-o", bin], { timeout: 120000 }, (err, _stdout, stderr) => {
      if (err) reject(new Error(String(stderr || err.message).slice(0, 500)));
      else resolve(bin);
    });
  });
}

function ensureMouseBin() {
  const bin = mouseBin();
  if (fs.existsSync(bin)) return Promise.resolve(bin);
  const source = path.join(__dirname, "mouse.swift");
  return new Promise((resolve, reject) => {
    execFile("swiftc", ["-O", source, "-o", bin], { timeout: 120000 }, (err, _stdout, stderr) => {
      if (err) reject(new Error(String(stderr || err.message).slice(0, 500)));
      else resolve(bin);
    });
  });
}

function runMouse(args) {
  return ensureMouseBin().then((bin) => new Promise((resolve, reject) => {
    execFile(bin, args.map(String), { timeout: 8000 }, (err, _stdout, stderr) => {
      if (err) reject(new Error(String(stderr || err.message).slice(0, 300)));
      else resolve(true);
    });
  }));
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

app.whenReady().then(() => {
  buildMenu();
  createMain();
  ensureMouseBin().catch(() => { /* drag reports the compiler error when used */ });
  applyDesktop(savedDesktopPrefs());
  setInterval(() => {
    try { fs.writeFileSync(path.join(app.getPath("userData"), "heartbeat"), String(Date.now())); } catch { /* ignore */ }
  }, 4000);
  attachPlatform(ipcMain, {
    browser: () => browserView && !browserView.webContents.isDestroyed() ? browserView : null,
    armed: () => computerArmed,
    temp: () => app.getPath("temp"),
    userData: () => app.getPath("userData"),
    stateFile: () => userDataFile(),
    nodeBin: () => process.execPath,
    send: (channel, payload) => send(channel, payload),
    setVoice: (child) => { voiceChild = child; },
    killVoice: () => { voiceChild?.kill(); voiceChild = null; },
    noteShot: (width, height) => { lastShot = { width, height }; },
    dragScreen: (x, y, x2, y2) => runMouse(["drag", x, y, x2, y2])
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMain();
  });
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/** Generic JSON bridge for connector REST APIs (Slack, Linear, Jira, …). */
ipcMain.handle("http:json", async (_e, spec) => {
  const url = String(spec?.url || "");
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error("That is not a URL."); }
  if (!/^https:$/.test(parsed.protocol)) throw new Error("Connector calls are https only.");
  const method = String(spec?.method || "GET").toUpperCase();
  if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(method)) throw new Error(`Unsupported method ${method}.`);
  const headers = {};
  for (const [key, value] of Object.entries(spec?.headers || {})) {
    if (typeof key === "string" && typeof value === "string" && key.length < 80) headers[key] = value.slice(0, 2000);
  }
  let body = spec?.body;
  if (body !== undefined && typeof body !== "string") body = JSON.stringify(body);
  if (body !== undefined && String(body).length > 200_000) throw new Error("That connector body is larger than 200 KB.");
  const response = await fetch(parsed.toString(), { method, headers, body: method === "GET" ? undefined : body });
  const text = (await response.text().catch(() => "")).slice(0, 100_000);
  return { status: response.status, text };
});

/** The typing/Secure-Input guard, from the small Swift helper. */
ipcMain.handle("guard:check", async () => {
  try {
    const bin = await ensureGuardBin();
    const result = await new Promise((resolve, reject) => {
      execFile(bin, ["check"], { timeout: 5000 }, (err, stdout) => {
        if (err) reject(new Error(String(stderr2(err, stdout)).slice(0, 200)));
        else resolve(stdout);
      });
    });
    return JSON.parse(result.trim());
  } catch (error) {
    return { secureInput: false, sinceKey: 999, sinceMouse: 999, error: String(error?.message || error).slice(0, 160) };
  }
});

function stderr2(err, stdout) {
  return err?.message || stdout || "the guard helper failed";
}

/** Schedules one wake with admin rights; macOS asks for the password itself. */
ipcMain.handle("wake:schedule", async (_e, iso) => {
  const when = new Date(String(iso || ""));
  if (Number.isNaN(when.getTime())) throw new Error("Give a valid wake time.");
  if (when.getTime() < Date.now() + 60_000) throw new Error("Pick a wake at least a minute in the future.");
  // pmset reads MM/DD/YYYY HH:MM:SS in local time.
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${pad(when.getMonth() + 1)}/${pad(when.getDate())}/${when.getFullYear()} ${pad(when.getHours())}:${pad(when.getMinutes())}:${pad(when.getSeconds())}`;
  const result = await new Promise((resolve) => {
    execFile("osascript", ["-e", `do shell script "pmset schedule wake \\"${stamp}\\"" with administrator privileges`], { timeout: 120000 }, (err, stdout, stderr) => {
      resolve({ err, stdout, stderr });
    });
  });
  if (result.err) {
    const cause = `${result.stderr || result.stdout || ""}`.trim();
    if (/user canceled|canceled/i.test(cause)) throw new Error("You cancelled the admin prompt, so no wake was scheduled.");
    throw new Error(`pmset refused: ${cause.slice(0, 200)}`);
  }
  return { ok: true, wake: stamp };
});

ipcMain.handle("dialog:folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"] });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

ipcMain.handle("dialog:files", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Documents", extensions: ["txt", "md", "pdf", "json", "csv", "ts", "tsx", "js", "py", "html", "css", "png", "jpg", "jpeg", "gif", "webp", "docx", "xlsx", "pptx", "doc", "rtf"] }
    ]
  });
  if (result.canceled) return [];
  return Promise.all(result.filePaths.map(async (filePath) => {
    const stat = fs.statSync(filePath);
    let text = "";
    const ext = path.extname(filePath).toLowerCase();
    const textExt = [".txt", ".md", ".json", ".csv", ".ts", ".tsx", ".js", ".py", ".html", ".css", ".mjs", ".cjs", ".yml", ".yaml", ".xml", ".svg"];
    if (textExt.includes(ext) && stat.size < 400_000) text = fs.readFileSync(filePath, "utf8");
    else if ([".pdf", ".docx", ".doc", ".rtf", ".odt", ".xlsx", ".pptx"].includes(ext)) {
      try { text = String(await readDocument(filePath)).slice(0, 20000); } catch { text = ""; }
    }
    return { name: path.basename(filePath), path: filePath, size: stat.size, text };
  }));
});

ipcMain.handle("fs:list", async (_e, dir) => {
  if (!dir || !fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true }).slice(0, 200);
  return entries.map((entry) => ({
    name: entry.name,
    kind: entry.isDirectory() ? "dir" : "file"
  }));
});

ipcMain.handle("fs:read", async (_e, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return "";
  const stat = fs.statSync(filePath);
  if (stat.size > 200_000) return "";
  return fs.readFileSync(filePath, "utf8");
});

ipcMain.handle("shell:open", async (_e, target) => {
  await shell.openPath(target);
});

ipcMain.handle("shell:open-local", async (_e, target) => {
  const url = String(target || "");
  if (!/^http:\/\/127\.0\.0\.1:4737\/artifact\/[a-z0-9-]+$/i.test(url)) {
    throw new Error("That page is not a local Modbitx artifact.");
  }
  await shell.openExternal(url);
  return true;
});

ipcMain.handle("state:load", async () => {
  try {
    return fs.readFileSync(userDataFile(), "utf8");
  } catch {
    return null;
  }
});

ipcMain.handle("state:save", async (_e, json) => {
  fs.mkdirSync(path.dirname(userDataFile()), { recursive: true });
  fs.writeFileSync(userDataFile(), json);
  return true;
});

// Only the key variables the generated provider catalog names, so the renderer cannot read the whole environment.
const PROVIDER_ENV = require("./provider-env.cjs");
const KEY_ENV_ALLOW = [...PROVIDER_ENV, "TYPESAFE_API_KEY"];
ipcMain.handle("state:key-env", async (_e, name) => {
  const key = String(name || "");
  if (!KEY_ENV_ALLOW.includes(key)) return null;
  const value = process.env[key];
  return value ? String(value) : null;
});

/**
 * Model calls for providers the renderer cannot reach itself. Z.ai answers the POST
 * with CORS headers but not the preflight, so its requests run here instead.
 */
function modelRequest(payload) {
  const url = String(payload?.url || "");
  const key = String(payload?.key || "");
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { error: "That model endpoint is not a URL." };
  }
  if (parsed.protocol !== "https:") return { error: "Model endpoints must use https." };
  return {
    url,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload?.body || {})
    }
  };
}

ipcMain.handle("model:chat", async (_e, payload) => {
  const request = modelRequest(payload);
  if (request.error) return { ok: false, status: 0, text: request.error };
  try {
    const response = await fetch(request.url, request.init);
    const text = await response.text();
    return { ok: response.ok, status: response.status, text: text.slice(0, 20000) };
  } catch (error) {
    return { ok: false, status: 0, text: String(error?.message || error) };
  }
});

ipcMain.handle("model:stream", async (event, payload) => {
  const request = modelRequest(payload);
  const id = `m${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  if (request.error) return { id, ok: false, status: 0, text: request.error };
  let response;
  try {
    response = await fetch(request.url, request.init);
  } catch (error) {
    return { id, ok: false, status: 0, text: String(error?.message || error) };
  }
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    return { id, ok: false, status: response.status, text: text.slice(0, 4000) };
  }
  // Hold the body until the renderer confirms its listener: chunks sent before
  // a subscription exists are dropped, and a slow machine can dispatch the
  // whole response inside the invoke round-trip. The gate waits inside the
  // reader task — never blocking the reply, or the renderer could never send
  // the go signal and every stream would ride the 5s safety timer into a race.
  const goGate = new Promise((resolve) => {
    const onGo = (_e, goId) => {
      if (goId !== id) return;
      ipcMain.removeListener("model:stream-go", onGo);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      ipcMain.removeListener("model:stream-go", onGo);
      resolve();
    }, 5000);
    ipcMain.on("model:stream-go", onGo);
  });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  void (async () => {
    try {
      await goGate;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        event.sender.send("model:stream", { id, type: "chunk", text: decoder.decode(value, { stream: true }) });
      }
      event.sender.send("model:stream", { id, type: "end" });
    } catch (error) {
      event.sender.send("model:stream", { id, type: "error", message: String(error?.message || error) });
    }
  })();
  return { id, ok: true, status: response.status };
});

ipcMain.handle("find:start", (event, text, options) => {
  const query = String(text || "").trim();
  if (!query) return { started: false };
  event.sender.findInPage(query, { forward: options?.forward !== false, findNext: options?.findNext === true });
  return { started: true };
});

ipcMain.handle("find:stop", (event, action) => {
  const mode = action === "keep" ? "keepSelection" : action === "activate" ? "activateSelection" : "clearSelection";
  event.sender.stopFindInPage(mode);
  return true;
});

ipcMain.handle("session:popout", async (_e, threadId) => {
  createPopout(threadId);
  return true;
});

ipcMain.handle("quick:hide", async () => {  if (quickWindow && !quickWindow.isDestroyed()) quickWindow.hide();
});

ipcMain.handle("quick:submit", async (_e, text) => {
  if (quickWindow && !quickWindow.isDestroyed()) quickWindow.hide();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("quick:submit", text);
  }
});

function jevError(body, status) {
  if (typeof body?.error === "string") return body.error;
  if (body?.error?.message) return body.error.message;
  if (typeof body?.message === "string") return body.message;
  return `Jev returned ${status}`;
}

async function jevEvaluate(state, questions) {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) return { ok: false, reason: "TYPESAFE_API_KEY is not set in this process." };
  try {
    const response = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "jev-1.13.0", state, questions }),
      signal: AbortSignal.timeout(25000)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, reason: jevError(body, response.status) };
    return { ok: true, model: body.model, answers: body.answers || {} };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Jev request failed." };
  }
}

function choiceAnswer(answer) {
  if (!answer || answer.type !== "choice") return undefined;
  return { choice: answer.choice, confidence: answer.confidence };
}

function scoreAnswer(answer) {
  if (!answer || answer.type !== "score") return undefined;
  return { score: answer.score, confidence: answer.confidence, legend: answer.legend };
}

ipcMain.handle("jev:route", async (_e, text, mode) => {
  const judged = await jevEvaluate(
    { message: String(text || "").slice(0, 8000), current_mode: mode || "chat" },
    {
      surface: {
        type: "choice",
        instructions: "Which Modbitx surface should handle `message`? `current_mode` is where the user already is. Stay there unless the message clearly belongs on another surface.",
        criteria: {
          chat: "A conversation, explanation, or piece of writing that does not need the Mac, a repository, or a website.",
          cowork: "An errand on this computer or the web: browse, click a site, use other apps, or handle files that are not a coding task.",
          code: "Work inside a repository: read or edit code, git, a patch, or a terminal command."
        }
      },
      needs_browser: {
        type: "noul",
        instructions: "Does `message` require opening or acting on a website in the built-in browser, rather than a phone simulator?",
        criteria: { true: "A URL or a desktop web task is required.", false: "No desktop website is required." }
      },
      needs_computer: {
        type: "noul",
        instructions: "Does `message` require controlling other Mac apps or the screen outside the built-in browser and outside a simulator?",
        criteria: { true: "Other applications or the desktop must be driven.", false: "The desktop does not need to be driven." }
      },
      needs_folder: {
        type: "noul",
        instructions: "Does `message` require reading or changing local files?",
        criteria: { true: "Local files or a project folder are required.", false: "No local files are required." }
      },
      needs_simulator: {
        type: "noul",
        instructions: "Does `message` require an iOS Simulator or Android emulator, rather than the desktop browser?",
        criteria: {
          true: "It names a simulator, emulator, iPhone, iPad, or Android virtual device as the thing to operate.",
          false: "A normal desktop browser or no device is enough."
        }
      }
    }
  );
  if (!judged.ok) return judged;
  return {
    ok: true,
    model: judged.model,
    surface: choiceAnswer(judged.answers.surface),
    needsBrowser: judged.answers.needs_browser?.noul,
    needsComputer: judged.answers.needs_computer?.noul,
    needsFolder: judged.answers.needs_folder?.noul,
    needsSimulator: judged.answers.needs_simulator?.noul
  };
});

ipcMain.handle("jev:site", async (_e, host, url) => {
  const judged = await jevEvaluate(
    { host: String(host || "").slice(0, 200), url: String(url || "").slice(0, 500) },
    {
      high_risk: {
        type: "noul",
        instructions: "Is `host` a site where a mistaken click could move money, reveal credentials, or change an account?",
        criteria: {
          true: "Banking, payments, webmail, cloud administration, or a login wall for one of those.",
          false: "A public content page, documentation, or ordinary browsing with no account action in front."
        }
      }
    }
  );
  if (!judged.ok) return judged;
  return { ok: true, model: judged.model, risk: judged.answers.high_risk?.noul ?? 0 };
});

ipcMain.handle("jev:browser", async (_e, payload) => {
  const options = Array.isArray(payload?.options) ? payload.options.slice(0, 20) : [];
  const criteria = {};
  for (const option of options) {
    const key = String(option?.key || "");
    if (!/^(stop|scroll|press|click:c\d+|fill:c\d+:\d+)$/.test(key)) continue;
    criteria[key] = String(option?.description || key).slice(0, 200);
  }
  if (!criteria.stop) criteria.stop = "The goal is already done, or none of the listed controls should be used.";
  const controls = Array.isArray(payload?.controls) ? payload.controls.slice(0, 12).map((control) => ({
    id: String(control?.id || "").slice(0, 8),
    kind: String(control?.kind || "").slice(0, 16),
    label: String(control?.label || "").slice(0, 80)
  })) : [];
  const judged = await jevEvaluate(
    {
      goal: String(payload?.goal || "").slice(0, 2000),
      page: {
        url: String(payload?.url || "").slice(0, 500),
        title: String(payload?.title || "").slice(0, 200),
        headings: Array.isArray(payload?.headings) ? payload.headings.slice(0, 6).map((item) => String(item).slice(0, 120)) : []
      },
      controls
    },
    {
      done: {
        type: "noul",
        instructions: "Has `goal` already been achieved on `page`, using `page.headings` and `controls` as the visible evidence?",
        criteria: {
          true: "The page now shows the outcome the goal asked for.",
          false: "More navigation, input, or scrolling is still required, or the page is unrelated."
        }
      },
      commits: {
        type: "noul",
        instructions: "Would the single next useful action on this page submit a form, send a message, pay, or delete something?",
        criteria: {
          true: "The next meaningful action would commit a change the user cannot trivially undo.",
          false: "The next action only reads, navigates, scrolls, or fills a field."
        }
      },
      action: {
        type: "choice",
        instructions: "Which one next action should the harness take toward `goal`? Choose only a listed option. Prefer stop when the goal is met. Prefer scroll when none of the controls match.",
        criteria
      }
    }
  );
  if (!judged.ok) return judged;
  return {
    ok: true,
    model: judged.model,
    done: judged.answers.done?.noul,
    commits: judged.answers.commits?.noul,
    action: choiceAnswer(judged.answers.action)
  };
});

ipcMain.handle("jev:design", async (_e, payload) => {
  const tokens = payload?.tokens || {};
  const judged = await jevEvaluate(
    {
      brief: String(payload?.brief || "").slice(0, 500),
      html: String(payload?.html || "").slice(0, 6000),
      tokens: {
        name: String(tokens.name || "").slice(0, 40),
        ink: String(tokens.ink || "").slice(0, 16),
        paper: String(tokens.paper || "").slice(0, 16),
        accent: String(tokens.accent || "").slice(0, 16),
        font: String(tokens.font || "").slice(0, 16),
        radius: Number(tokens.radius) || 0,
        space: Number(tokens.space) || 0,
        components: String(tokens.components || "").slice(0, 400)
      }
    },
    {
      hierarchy: {
        type: "score",
        instructions: "How clear is the visual hierarchy of `html` for `brief`?",
        criteria: [
          "No visible heading or grouping. The page is a flat run of text.",
          "A title exists, but sections and actions are hard to tell apart.",
          "A title, sections, and a clear primary action are distinguishable.",
          "Title, sections, and one primary action are obvious at a glance, and secondary actions sit back."
        ]
      },
      density: {
        type: "score",
        instructions: "How packed is the layout of `html`?",
        criteria: [
          "Large empty regions. The content does not use the frame.",
          "Comfortable gaps between groups. Text and controls have room.",
          "Tight but still readable. Little unused space.",
          "Cramped. Controls or lines collide or sit on top of each other."
        ]
      },
      token_fit: {
        type: "score",
        instructions: "How closely does `html` follow the colors, type, spacing, and component note in `tokens`?",
        criteria: [
          "The page ignores the named colors, type, and spacing.",
          "A few colors match, but type or spacing fights the tokens.",
          "Most of the page uses the ink, paper, accent, and spacing.",
          "The page is consistently built from those tokens."
        ]
      },
      next: {
        type: "choice",
        instructions: "What should happen to this design next, given `brief` and `html`?",
        criteria: {
          ship: "Hierarchy is clear and the page is ready to keep.",
          revise: "A specific visual problem should be changed before keeping it.",
          ask: "The brief or the markup is too incomplete to judge."
        }
      }
    }
  );
  if (!judged.ok) return judged;
  return {
    ok: true,
    model: judged.model,
    hierarchy: scoreAnswer(judged.answers.hierarchy),
    density: scoreAnswer(judged.answers.density),
    tokenFit: scoreAnswer(judged.answers.token_fit),
    next: choiceAnswer(judged.answers.next)
  };
});

ipcMain.handle("jev:design-system", async (_e, payload) => {
  const systems = [];
  const criteria = {
    keep: "Use the workspace default. Choose this when the message is not a visual request, or when no listed system is a clearer fit."
  };
  for (const system of Array.isArray(payload?.systems) ? payload.systems.slice(0, 12) : []) {
    const id = String(system?.id || "").replace(/[^a-z0-9-]/gi, "").slice(0, 32);
    if (!id || id === "keep" || criteria[id]) continue;
    const name = String(system?.name || "Untitled").slice(0, 40);
    const components = String(system?.components || "").trim().slice(0, 160);
    criteria[id] = [
      name,
      `ink ${String(system?.ink || "").slice(0, 16)}`,
      `paper ${String(system?.paper || "").slice(0, 16)}`,
      `accent ${String(system?.accent || "").slice(0, 16)}`,
      `type ${String(system?.font || "").slice(0, 16)}`,
      components ? `components: ${components}` : ""
    ].filter(Boolean).join(", ");
    systems.push({
      id,
      name,
      ink: String(system?.ink || "").slice(0, 16),
      paper: String(system?.paper || "").slice(0, 16),
      accent: String(system?.accent || "").slice(0, 16),
      font: String(system?.font || "").slice(0, 16),
      components
    });
  }
  if (systems.length < 2) return { ok: true, model: "jev-1.13.0", needsDesign: 0, system: { choice: "keep", confidence: 1 } };
  const judged = await jevEvaluate(
    { message: String(payload?.message || "").slice(0, 4000), systems },
    {
      needs_design: {
        type: "noul",
        instructions: "Does `message` ask for a new or revised visual, such as a page, screen, component, slide, or prototype?",
        criteria: {
          true: "The message asks for a visual design, deck, or prototype.",
          false: "The message is a question, a code task, or an errand with no visual to design."
        }
      },
      system: {
        type: "choice",
        instructions: "Which listed design system should a visual for `message` use? Choose keep when the message is not asking for a visual, or when the workspace default is as good a fit as any listed system.",
        criteria
      }
    }
  );
  if (!judged.ok) return judged;
  return {
    ok: true,
    model: judged.model,
    needsDesign: judged.answers.needs_design?.noul,
    system: choiceAnswer(judged.answers.system)
  };
});

ipcMain.handle("jev:prepare", async (_e, payload) => {
  const prepared = prepareQuestions(payload);
  if (!Object.keys(prepared.questions).length) return { ok: true, model: "jev-1.13.0" };
  const judged = await jevEvaluate(prepared.state, prepared.questions);
  if (!judged.ok) return judged;
  return {
    ok: true,
    model: judged.model,
    needsPlan: judged.answers.needs_plan?.noul,
    skill: choiceAnswer(judged.answers.skill)
  };
});

ipcMain.handle("jev:session", async (_e, payload) => {
  const prepared = prepareSession(payload);
  const judged = await jevEvaluate(prepared.state, prepared.questions);
  if (!judged.ok) return judged;
  return { ok: true, model: judged.model, status: choiceAnswer(judged.answers.status) };
});

ipcMain.handle("jev:review", async (_e, payload) => {
  const judged = await jevEvaluate(
    {
      action: String(payload?.action || "").slice(0, 1500),
      folder: String(payload?.folder || "").slice(0, 300)
    },
    {
      harm: {
        type: "noul",
        instructions: "Would `action` delete broadly, publish, pay, change credentials, force-push, or write outside `folder`?",
        criteria: {
          true: "A destructive delete, sudo, a deploy, a payment, a credential change, or a path outside the granted folder.",
          false: "A read, a local file edit, a test, git status, or git diff inside the folder."
        }
      },
      decision: {
        type: "choice",
        instructions: "Should Modbitx run `action` without asking the person?",
        criteria: {
          allow: "A local edit, test, or inspection that stays inside the folder and is easy to undo.",
          ask: "A commit, push, install, network call, SSH command, or anything the person would want to see first.",
          deny: "A destructive command, a credential change, or an action outside the granted folder."
        }
      }
    }
  );
  if (!judged.ok) return judged;
  return {
    ok: true,
    model: judged.model,
    harm: judged.answers.harm?.noul,
    decision: choiceAnswer(judged.answers.decision)
  };
});

ipcMain.handle("app:info", async () => ({
  version: app.getVersion(),
  userData: app.getPath("userData"),
  platform: process.platform,
  packaged: app.isPackaged
}));

ipcMain.handle("desktop:apply", async (_e, prefs) => applyDesktop(prefs));

ipcMain.handle("desktop:notify", async (_e, title, body) => {
  if (!Notification.isSupported()) return false;
  const note = new Notification({ title: String(title || "Modbitx").slice(0, 80), body: String(body || "").slice(0, 180) });
  note.show();
  return true;
});

ipcMain.handle("desktop:bounce", async () => {
  if (process.platform === "darwin" && app.dock) {
    app.dock.bounce("informational");
    return true;
  }
  return false;
});

ipcMain.handle("desktop:storage", async () => folderBytes(app.getPath("userData")));

ipcMain.handle("desktop:clear-cache", async () => {
  await session.defaultSession.clearCache();
  return true;
});

ipcMain.handle("desktop:privacy", async (_e, pane) => {
  const url = pane === "screen"
    ? "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
    : "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
  await shell.openExternal(url);
  return true;
});

/** Machine facts for the This computer settings hub. */
ipcMain.handle("env:info", async () => ({
  app: app.getVersion(),
  electron: process.versions.electron || "",
  node: process.versions.node || "",
  chrome: process.versions.chrome || "",
  platform: `${process.platform} ${process.arch}`,
  osName: process.platform === "darwin" ? `macOS ${require("os").release()}` : process.platform,
  userData: app.getPath("userData"),
  stateFile: userDataFile()
}));

/** Fast pattern search over a granted folder with the bundled ripgrep. */
ipcMain.handle("search:repo", async (_e, folder, pattern, opts) => {
  const root = String(folder || "");
  const needle = String(pattern || "");
  if (!root || !needle) throw new Error("Name a folder and a pattern.");
  let rgPath;
  try { rgPath = require("@vscode/ripgrep").rgPath; } catch { throw new Error("The bundled ripgrep is not installed. Run npm install."); }
  const maxResults = Math.min(200, Math.max(1, Number(opts && opts.limit) || 60));
  const args = [
    "--max-count", String(Math.max(1, Math.min(20, Number(opts && opts.perFile) || 5))),
    "--max-results", String(maxResults),
    "--ignore-case",
    "--no-messages",
    "-n",
    "--", needle, root
  ];
  const result = await new Promise((resolve) => {
    const child = spawn(rgPath, args, { timeout: 10000 });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => { out += String(chunk); });
    child.stderr.on("data", (chunk) => { err += String(chunk); });
    child.on("error", (error) => resolve({ code: 1, stdout: "", stderr: String(error.message || error) }));
    child.on("close", (code) => resolve({ code: code ?? 0, stdout: out, stderr: err }));
  });
  return { code: result.code, matches: result.stdout.split("\n").filter(Boolean).slice(0, maxResults), note: result.stderr.trim().slice(0, 200) };
});

/** Fetches a page as plain text for research. Host gating happens in the renderer. */
ipcMain.handle("fetch:page", async (_e, url) => {
  const target = String(url || "");
  let parsed;
  try { parsed = new URL(target); } catch { throw new Error("That is not a URL."); }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Research fetches http and https only.");
  const response = await session.defaultSession.fetch(parsed.toString(), {
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Modbitx/0.1" }
  });
  if (!response.ok) throw new Error(`The page answered ${response.status}.`);
  const html = (await response.text()).slice(0, 2_000_000);
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/\s+/g, " ").trim().slice(0, 160) || parsed.hostname;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, 16000);
  if (!text) throw new Error("That page had no readable text.");
  return { url: parsed.toString(), title, text };
});

/** Compiles LaTeX with a system tectonic or TeX toolchain. Refuses honestly when neither is installed. */
ipcMain.handle("latex:compile", async (_e, folder, rel) => {
  const root = String(folder || "");
  const file = String(rel || "");
  if (!root || !file) throw new Error("Name a folder and a .tex file.");
  if (!/^[\w .-]+\.tex$/i.test(file)) throw new Error("Name a single .tex file in the granted folder.");
  const candidates = [
    { bin: "/opt/homebrew/bin/tectonic", args: (dir) => [dir] },
    { bin: "/usr/local/bin/tectonic", args: (dir) => [dir] },
    { bin: "/Library/TeX/texbin/xelatex", args: (dir) => ["-interaction=nonstopmode", "-halt-on-error", dir] },
    { bin: "/Library/TeX/texbin/pdflatex", args: (dir) => ["-interaction=nonstopmode", "-halt-on-error", dir] }
  ];
  let tool = null;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate.bin)) { tool = candidate; break; }
  }
  if (!tool) {
    throw new Error("No LaTeX toolchain found. Install Tectonic (brew install tectonic) or MacTeX, then try again.");
  }
  const result = await new Promise((resolve) => {
    const child = spawn(tool.bin, tool.args(file), { cwd: root, timeout: 120000 });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => { out += String(chunk); });
    child.stderr.on("data", (chunk) => { err += String(chunk); });
    child.on("error", (error) => resolve({ code: 1, stdout: "", stderr: String(error.message || error) }));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout: out, stderr: err }));
  });
  const pdf = file.replace(/\.tex$/i, ".pdf");
  const made = fs.existsSync(path.join(root, pdf));
  if (result.code !== 0 || !made) {
    const tail = `${result.stderr}\n${result.stdout}`.trim().split("\n").slice(-12).join("\n");
    throw new Error(`LaTeX failed:\n${tail.slice(0, 1500)}`);
  }
  return { pdf, note: result.stdout.trim().slice(0, 400) };
});

/** Export an artifact through the same document writer the agent uses. */const EXPORT_KINDS = {
  docx: { name: "Word document", ext: "docx" },
  xlsx: { name: "Excel workbook", ext: "xlsx" },
  pptx: { name: "PowerPoint deck", ext: "pptx" },
  pdf: { name: "PDF", ext: "pdf" },
  md: { name: "Markdown", ext: "md" },
  html: { name: "HTML page", ext: "html" },
  csv: { name: "CSV", ext: "csv" },
  txt: { name: "Text", ext: "txt" }
};
ipcMain.handle("artifact:export", async (_e, kind, suggested, payload, dest) => {
  const chosen = EXPORT_KINDS[String(kind || "").toLowerCase()];
  if (!chosen) throw new Error(`Modbitx cannot export a ${kind} file.`);
  const body = String(payload || "");
  if (body.length > 20_000_000) throw new Error("That artifact is larger than 20 MB.");
  let file = String(dest || "");
  if (!file) {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: String(suggested || `modbitx-artifact.${chosen.ext}`),
      filters: [{ name: chosen.name, extensions: [chosen.ext] }]
    });
    if (result.canceled || !result.filePath) return null;
    file = result.filePath;
  }
  await writeDocument(chosen.ext === "html" ? "html" : chosen.ext, file, body);
  return { file, kind: chosen.ext };
});

ipcMain.handle("dialog:save-text", async (_e, suggested, text) => {
  const body = String(text || "");
  if (body.length > 20_000_000) throw new Error("That export is larger than 20 MB.");
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: String(suggested || "modbitx-export.json"),
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (result.canceled || !result.filePath) return null;
  fs.writeFileSync(result.filePath, body);
  return result.filePath;
});

ipcMain.handle("dialog:open-text", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  const filePath = result.filePaths[0];
  if (result.canceled || !filePath) return null;
  const stat = fs.statSync(filePath);
  if (stat.size > 20_000_000) throw new Error("That file is larger than 20 MB.");
  return fs.readFileSync(filePath, "utf8");
});

ipcMain.handle("dialog:save-bytes", async (_e, suggested, base64) => {
  const body = Buffer.from(String(base64 || ""), "base64");
  if (body.length > 20_000_000) throw new Error("That export is larger than 20 MB.");
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: String(suggested || "modbitx-sessions.zip"),
    filters: [{ name: "Zip", extensions: ["zip"] }]
  });
  if (result.canceled || !result.filePath) return null;
  fs.writeFileSync(result.filePath, body);
  return result.filePath;
});

ipcMain.handle("dialog:open-bytes", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "Modbitx export", extensions: ["zip", "json"] }]
  });
  const filePath = result.filePaths[0];
  if (result.canceled || !filePath) return null;
  const stat = fs.statSync(filePath);
  if (stat.size > 20_000_000) throw new Error("That file is larger than 20 MB.");
  return { name: path.basename(filePath), base64: fs.readFileSync(filePath).toString("base64") };
});

let browserView = null;
let browserPartition = "persist:modbitx-shared";
let computerArmed = false;
let lastShot = { width: 1440, height: 900 };
let downloadDir = "";
let lastDownload = null;

const DIALOG_HOOK = `(() => {
  if (window.__modbitxDialogs) return;
  window.__modbitxDialogs = [];
  window.alert = (message) => { window.__modbitxDialogs.push({ type: "alert", message: String(message), accepted: true }); };
  window.confirm = (message) => {
    const accepted = window.__modbitxAcceptDialog === true;
    window.__modbitxAcceptDialog = false;
    window.__modbitxDialogs.push({ type: "confirm", message: String(message), accepted });
    return accepted;
  };
  window.prompt = (message, value) => {
    window.__modbitxDialogs.push({ type: "prompt", message: String(message), accepted: false });
    return value == null ? "" : String(value);
  };
})()`;

function destroyBrowser() {
  if (!browserView) return;
  try {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.contentView.removeChildView(browserView);
  } catch { /* the view may already be gone */ }
  if (!browserView.webContents.isDestroyed()) browserView.webContents.close();
  browserView = null;
}

function ensureBrowser() {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  if (browserView && !browserView.webContents.isDestroyed()) return browserView;
  browserView = new WebContentsView({
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, partition: browserPartition }
  });
  mainWindow.contentView.addChildView(browserView);
  browserView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  browserView.webContents.setWindowOpenHandler(({ url }) => {
    browserView.webContents.loadURL(url);
    return { action: "deny" };
  });
  browserView.webContents.on("dom-ready", () => {
    browserView.webContents.executeJavaScript(DIALOG_HOOK).catch(() => {});
  });
  try {
    if (!browserView.webContents.debugger.isAttached()) browserView.webContents.debugger.attach("1.3");
    browserView.webContents.debugger.sendCommand("Page.addScriptToEvaluateOnNewDocument", { source: DIALOG_HOOK }).catch(() => {});
  } catch {
    /* the dom-ready hook still covers pages that load after the view exists */
  }
  const session = browserView.webContents.session;
  if (!session.__modbitxDownloads) {
    session.__modbitxDownloads = true;
    session.on("will-download", (_event, item) => {
      const name = path.basename(item.getFilename() || "").replace(/[\\/]/g, "") || `download-${Date.now()}`;
      const dir = downloadDir && fs.existsSync(downloadDir) ? downloadDir : app.getPath("downloads");
      const dest = path.join(dir, name);
      item.setSavePath(dest);
      lastDownload = { path: dest, state: "progressing", name };
      item.once("done", (_done, state) => {
        lastDownload = { path: dest, state, name };
        send("browser:download", lastDownload);
      });
    });
  }
  return browserView;
}

function insideRoot(root, target) {
  const base = path.resolve(root);
  const next = path.resolve(base, target);
  if (next !== base && !next.startsWith(base + path.sep)) {
    throw new Error("That path is outside the folder you granted.");
  }
  return next;
}

ipcMain.handle("browser:bounds", async (_e, rect) => {
  const view = ensureBrowser();
  if (!view || !rect) return;
  const width = Math.max(0, Math.round(rect.width));
  const height = Math.max(0, Math.round(rect.height));
  view.setBounds({
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width,
    height
  });
});

ipcMain.handle("browser:partition", async (_e, key) => {
  const safe = String(key || "").replace(/[^a-z0-9-]/gi, "").slice(0, 40);
  const next = safe ? `persist:modbitx-${safe}` : "persist:modbitx-shared";
  if (next !== browserPartition) {
    browserPartition = next;
    destroyBrowser();
  }
  return next;
});

ipcMain.handle("browser:clear-storage", async () => {
  if (!browserView || browserView.webContents.isDestroyed()) return true;
  await browserView.webContents.session.clearStorageData({ storages: ["cookies", "localstorage"] });
  return true;
});

ipcMain.handle("browser:hide", async () => {
  if (browserView && !browserView.webContents.isDestroyed()) {
    browserView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }
});

ipcMain.handle("browser:load", async (_e, url) => {
  const view = ensureBrowser();
  if (!view) throw new Error("Window is not ready.");
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  await view.webContents.loadURL(target);
  return view.webContents.getURL();
});

ipcMain.handle("browser:nav", async (_e, dir) => {
  const view = ensureBrowser();
  if (!view) return "";
  if (dir === "back" && view.webContents.canGoBack()) view.webContents.goBack();
  if (dir === "forward" && view.webContents.canGoForward()) view.webContents.goForward();
  if (dir === "reload") view.webContents.reload();
  return view.webContents.getURL();
});

ipcMain.handle("browser:download-dir", async (_e, dir) => {
  downloadDir = typeof dir === "string" ? dir : "";
  return downloadDir;
});

ipcMain.handle("browser:last-download", async () => {
  const start = Date.now();
  while (lastDownload?.state === "progressing" && Date.now() - start < 4000) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const found = lastDownload;
  if (found?.state === "completed") lastDownload = null;
  return found;
});

ipcMain.handle("browser:upload", async (_e, selector, filePath) => {
  const view = ensureBrowser();
  if (!view) throw new Error("Open a page first.");
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error("That file is not available.");
  const contents = view.webContents;
  if (!contents.debugger.isAttached()) contents.debugger.attach("1.3");
  const document = await contents.debugger.sendCommand("DOM.getDocument", { depth: 0 });
  const found = await contents.debugger.sendCommand("DOM.querySelector", {
    nodeId: document.root.nodeId,
    selector: selector || "input[type=file]"
  });
  if (!found.nodeId) throw new Error("No file field matches that selector.");
  await contents.debugger.sendCommand("DOM.setFileInputFiles", { nodeId: found.nodeId, files: [filePath] });
  return { ok: true, file: path.basename(filePath) };
});

ipcMain.handle("browser:dialogs", async () => {
  const view = ensureBrowser();
  if (!view) return [];
  await view.webContents.executeJavaScript(DIALOG_HOOK).catch(() => {});
  return view.webContents.executeJavaScript("(() => { const items = window.__modbitxDialogs || []; window.__modbitxDialogs = []; return items; })()", true);
});

ipcMain.handle("browser:accept-dialog", async (_e, accept) => {
  const view = ensureBrowser();
  if (!view) return false;
  await view.webContents.executeJavaScript(DIALOG_HOOK).catch(() => {});
  await view.webContents.executeJavaScript(`window.__modbitxAcceptDialog = ${accept ? "true" : "false"}; true`, true);
  return true;
});

ipcMain.handle("browser:text", async () => {
  const view = ensureBrowser();
  if (!view) return "";
  const text = await view.webContents.executeJavaScript(
    "document.body ? document.body.innerText.slice(0, 14000) : ''",
    true
  );
  return { url: view.webContents.getURL(), title: view.webContents.getTitle(), text };
});

let controlBanner = null;

function setControlBanner(on) {
  if (!on) {
    if (controlBanner && !controlBanner.isDestroyed()) controlBanner.hide();
    return;
  }
  const display = screen.getPrimaryDisplay().workArea;
  if (!controlBanner || controlBanner.isDestroyed()) {
    controlBanner = new BrowserWindow({
      width: 360,
      height: 36,
      x: Math.round(display.x + (display.width - 360) / 2),
      y: display.y + 12,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      hasShadow: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
    });
    controlBanner.setIgnoreMouseEvents(true);
    controlBanner.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(
      "<html style=\"background:transparent\"><body style=\"margin:0;font:13px -apple-system,sans-serif;background:rgba(28,27,25,.9);color:#f6f4ee;border-radius:18px;display:flex;align-items:center;justify-content:center;height:36px\">Modbitx is using your computer</body></html>"
    ));
  }
  controlBanner.showInactive();
}

ipcMain.handle("computer:arm", async (_e, on) => {
  computerArmed = Boolean(on);
  setControlBanner(computerArmed);
  return computerArmed;
});

ipcMain.handle("computer:clipboard-read", async () => {
  if (!computerArmed) throw new Error("Computer use is off.");
  return clipboard.readText().slice(0, 8000);
});

ipcMain.handle("computer:clipboard-write", async (_e, text) => {
  if (!computerArmed) throw new Error("Computer use is off.");
  const value = String(text ?? "").slice(0, 8000);
  clipboard.writeText(value);
  return { length: value.length };
});

let voiceChild = null;

function osa(script) {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-e", script], { timeout: 8000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(String(stdout || "").trim());
    });
  });
}

ipcMain.handle("computer:click", async (_e, x, y, button) => {
  if (!computerArmed) throw new Error("Computer use is off.");
  const [px, py] = scalePoint(x, y);
  const kind = button === "right" || button === "double" ? button : "left";
  if (kind === "right") {
    await osa(`tell application "System Events"
      key down control
      click at {${px}, ${py}}
      key up control
    end tell`);
  } else if (kind === "double") {
    await osa(`tell application "System Events" to click at {${px}, ${py}}`);
    await new Promise((resolve) => setTimeout(resolve, 80));
    await osa(`tell application "System Events" to click at {${px}, ${py}}`);
  } else {
    await osa(`tell application "System Events" to click at {${px}, ${py}}`);
  }
  return { x: px, y: py, button: kind, imageX: Math.round(Number(x)), imageY: Math.round(Number(y)) };
});

ipcMain.handle("computer:hotkey", async (_e, key, modifiers) => {
  if (!computerArmed) throw new Error("Computer use is off.");
  const keyName = String(key || "c").slice(0, 1);
  if (!/^[a-z0-9]$/i.test(keyName)) throw new Error("Hotkey must be one letter or digit.");
  const mods = (Array.isArray(modifiers) ? modifiers : []).flatMap((name) => {
    if (name === "command" || name === "cmd") return ["command down"];
    if (name === "shift") return ["shift down"];
    if (name === "option" || name === "alt") return ["option down"];
    if (name === "control" || name === "ctrl") return ["control down"];
    return [];
  });
  const using = mods.length ? ` using {${mods.join(", ")}}` : "";
  await osa(`tell application "System Events" to keystroke "${keyName.toLowerCase()}"${using}`);
  return { key: keyName.toLowerCase(), modifiers: mods };
});

ipcMain.handle("computer:scroll", async (_e, direction, amount) => {
  if (!computerArmed) throw new Error("Computer use is off.");
  const down = direction !== "up";
  const count = Math.min(12, Math.max(1, Number(amount) || 3));
  const code = down ? 125 : 126;
  for (let i = 0; i < count; i += 1) await osa(`tell application "System Events" to key code ${code}`);
  return { direction: down ? "down" : "up", count };
});

ipcMain.handle("computer:move", async (_e, x, y) => {
  if (!computerArmed) throw new Error("Computer use is off.");
  const [px, py] = scalePoint(x, y);
  await runMouse(["move", px, py]);
  return { x: px, y: py };
});

ipcMain.handle("computer:drag", async (_e, x, y, x2, y2) => {
  if (!computerArmed) throw new Error("Computer use is off.");
  const [px, py] = scalePoint(x, y);
  const [qx, qy] = scalePoint(x2, y2);
  await runMouse(["drag", px, py, qx, qy]);
  return { x: px, y: py, x2: qx, y2: qy };
});

ipcMain.handle("computer:type", async (_e, text) => {
  if (!computerArmed) throw new Error("Computer use is off.");
  const safe = String(text ?? "").slice(0, 2000).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  await osa(`tell application "System Events" to keystroke "${safe}"`);
  return { typed: String(text ?? "").length };
});

ipcMain.handle("computer:key", async (_e, key) => {
  if (!computerArmed) throw new Error("Computer use is off.");
  const allowed = ["return", "tab", "escape", "space", "delete"];
  const name = allowed.includes(key) ? key : "return";
  await osa(`tell application "System Events" to key code ${name === "return" ? 36 : name === "tab" ? 48 : name === "escape" ? 53 : name === "space" ? 49 : 51}`);
  return { key: name };
});

ipcMain.handle("work:write", async (_e, root, rel, content) => {
  const file = insideRoot(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, String(content ?? ""));
  return file;
});

ipcMain.handle("hook:exec", async (_e, root, command, args, payload, timeoutMs) => {
  const prepared = prepareHook(root, command, args);
  if (!prepared.ok) return { code: prepared.code, stdout: "", stderr: prepared.stderr };
  const timeout = Math.min(15_000, Math.max(200, Number(timeoutMs) || 5000));
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.PYTHONSTARTUP;
  delete env.PYTHONPATH;
  delete env.PYTHONHOME;
  return await new Promise((resolve) => {
    const child = execFile(prepared.bin, prepared.argv, { cwd: prepared.cwd, env, timeout, maxBuffer: 32_000 }, (err, stdout, stderr) => {
      resolve({
        code: err && typeof err.code === "number" ? err.code : err ? 1 : 0,
        stdout: String(stdout || "").slice(0, 8000),
        stderr: String(stderr || err?.message || "").slice(0, 2000)
      });
    });
    child.stdin?.end(JSON.stringify(payload || {}).slice(0, 8000));
  });
});

ipcMain.handle("work:run", async (_e, root, command) => {
  if (!root || !fs.existsSync(root)) throw new Error("Choose a folder before running a command.");
  const cmd = String(command || "").trim();
  if (!cmd) throw new Error("Empty command.");
  if (/^\s*sudo\b/.test(cmd) || /\brm\s+-rf\s+\/(\s|$)/.test(cmd)) {
    throw new Error("That command is blocked.");
  }
  return await new Promise((resolve) => {
    execFile("bash", ["-lc", cmd], { cwd: path.resolve(root), timeout: 30000, maxBuffer: 400_000 }, (err, stdout, stderr) => {
      resolve({
        code: err && typeof err.code === "number" ? err.code : err ? 1 : 0,
        stdout: String(stdout || "").slice(0, 20_000),
        stderr: String(stderr || err?.message || "").slice(0, 8_000)
      });
    });
  });
});
