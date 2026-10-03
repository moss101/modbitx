const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, execFile } = require("child_process");
const { desktopCapturer, screen, nativeImage } = require("electron");
const office = require("./office.cjs");
const plugins = require("./plugins.cjs");

const terms = new Map();
const mcpSessions = new Map();
const chromeQueue = [];
const simShots = new Map();
let syncServer = null;
let pairing = "";
/** Whether the local server owns its port, and why not when it does not. */
let syncStatus = { up: false, note: "" };
let connectorWatcher = null;
let pluginWatcher = null;
const recorder = { timer: null, frames: [], startedAt: 0 };

// The terminal runs on node-pty for a real TTY. A load failure is reported on the
// terminal itself and in the log rather than silently degrading.
let pty = null;
let ptyNote = "";
try {
  pty = require("node-pty");
} catch (error) {
  ptyNote = `node-pty unavailable: ${String(error?.message || error).slice(0, 200)}`;
}

function exec(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: opts.timeout ?? 20000, maxBuffer: 500_000, ...opts }, (err, stdout, stderr) => {
      resolve({
        code: err && typeof err.code === "number" ? err.code : err ? 1 : 0,
        stdout: String(stdout || ""),
        stderr: String(stderr || err?.message || "")
      });
    });
  });
}

function spawnToFile(cmd, args, dest, timeout = 20000) {
  return new Promise((resolve) => {
    const out = fs.createWriteStream(dest);
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
    const finish = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      out.end(() => resolve({ code, stderr }));
    };
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.stdout.pipe(out);
    child.on("error", (error) => {
      stderr += error.message;
      finish(1);
    });
    child.on("close", (code) => finish(code ?? 1));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sdkHome() {
  return process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(os.homedir(), "Library/Android/sdk");
}

function adbBin() {
  const bin = path.join(sdkHome(), "platform-tools", "adb");
  return fs.existsSync(bin) ? bin : "";
}

function emulatorBin() {
  const bin = path.join(sdkHome(), "emulator", "emulator");
  return fs.existsSync(bin) ? bin : "";
}

function settle(view, before) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const timer = setTimeout(finish, 2000);
    const onLoad = () => {
      clearTimeout(timer);
      setTimeout(finish, 300);
    };
    view.webContents.once("did-finish-load", onLoad);
    view.webContents.once("did-fail-load", onLoad);
    setTimeout(() => {
      if (!done && view.webContents.getURL() === before) {
        clearTimeout(timer);
        view.webContents.removeListener("did-finish-load", onLoad);
        view.webContents.removeListener("did-fail-load", onLoad);
        finish();
      }
    }, 700);
  });
}

function osa(script) {
  return exec("osascript", ["-e", script], { timeout: 8000 });
}

function readState(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function attachPlatform(ipcMain, ctx) {
  const browser = () => ctx.browser();

  ipcMain.handle("browser:click", async (_e, target) => {
    const view = browser();
    if (!view) throw new Error("Open a page first.");
    const script = target.text
      ? `(() => { const want = ${JSON.stringify(String(target.text).toLowerCase())}; const el = [...document.querySelectorAll("a,button,[role=button],input[type=submit],input[type=button]")].find((node) => ((node.innerText || node.value || node.getAttribute("aria-label") || "").toLowerCase()).includes(want)); if (!el) return { ok: false, error: "No matching control" }; el.click(); return { ok: true, text: (el.innerText || el.value || "").slice(0, 300) }; })()`
      : target.selector
      ? `(() => { const el = document.querySelector(${JSON.stringify(target.selector)}); if (!el) return { ok: false, error: "No element" }; el.click(); return { ok: true, text: (el.innerText || el.value || "").slice(0, 300) }; })()`
      : `(() => { const el = document.elementFromPoint(${Number(target.x) || 0}, ${Number(target.y) || 0}); if (!el) return { ok: false, error: "Nothing at that point" }; el.click(); return { ok: true, text: (el.innerText || "").slice(0, 300) }; })()`;
    const before = view.webContents.getURL();
    const clicked = await view.webContents.executeJavaScript(script, true);
    if (clicked?.ok) await settle(view, before);
    return { ...clicked, url: view.webContents.getURL() };
  });

  ipcMain.handle("browser:fill", async (_e, selector, value) => {
    const view = browser();
    if (!view) throw new Error("Open a page first.");
    const raw = String(selector || "input, textarea");
    const label = raw.startsWith("label:") ? raw.slice(6) : "";
    const script = label
      ? `(() => {
          const want = ${JSON.stringify(label.toLowerCase())};
          const labeled = [...document.querySelectorAll("label")].find((node) => (node.innerText || "").toLowerCase().includes(want));
          const el = (labeled && (labeled.control || labeled.querySelector("input, textarea"))) || [...document.querySelectorAll("input, textarea")].find((node) => ((node.getAttribute("aria-label") || node.getAttribute("placeholder") || node.name || "").toLowerCase()).includes(want));
          if (!el) return { ok: false, error: "No field named " + want };
          el.focus();
          el.value = ${JSON.stringify(String(value ?? ""))};
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return { ok: true, name: el.name || el.id || el.tagName };
        })()`
      : `(() => {
          const el = document.querySelector(${JSON.stringify(raw)});
          if (!el) return { ok: false, error: "No field" };
          el.focus();
          el.value = ${JSON.stringify(String(value ?? ""))};
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return { ok: true, name: el.name || el.id || el.tagName };
        })()`;
    return view.webContents.executeJavaScript(script, true);
  });

  ipcMain.handle("browser:press", async (_e, key) => {
    const view = browser();
    if (!view) throw new Error("Open a page first.");
    const name = ["Enter", "Tab", "Escape"].includes(key) ? key : "Enter";
    const before = view.webContents.getURL();
    const result = await view.webContents.executeJavaScript(`(() => {
      const el = document.activeElement || document.querySelector("input, textarea");
      if (el && el.focus) el.focus();
      const event = new KeyboardEvent("keydown", { key: ${JSON.stringify(name)}, bubbles: true });
      (el || document.body).dispatchEvent(event);
      if (${JSON.stringify(name)} === "Enter") {
        const form = el && el.form;
        if (form && form.requestSubmit) form.requestSubmit();
      }
      return { ok: true, key: ${JSON.stringify(name)} };
    })()`, true);
    await settle(view, before);
    return { ...result, url: view.webContents.getURL() };
  });

  ipcMain.handle("browser:scroll", async (_e, amount) => {
    const view = browser();
    if (!view) throw new Error("Open a page first.");
    const dy = Number(amount) || 700;
    return view.webContents.executeJavaScript(`(() => { window.scrollBy(0, ${dy}); return { ok: true, y: window.scrollY }; })()`, true);
  });

  ipcMain.handle("browser:choose", async (_e, label, value) => {
    const view = browser();
    if (!view) throw new Error("Open a page first.");
    return view.webContents.executeJavaScript(`(() => {
      const want = ${JSON.stringify(String(label || "").toLowerCase())};
      const choice = ${JSON.stringify(String(value || "").toLowerCase())};
      const selects = [...document.querySelectorAll("select")];
      const select = selects.find((node) => ((node.name || node.id || node.getAttribute("aria-label") || "").toLowerCase()).includes(want)) || selects[0];
      if (!select) return { ok: false, error: "No menu" };
      const option = [...select.options].find((item) => (item.text || item.value).toLowerCase().includes(choice));
      if (!option) return { ok: false, error: "No option" };
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, name: select.name || select.id, value: option.text };
    })()`, true);
  });

  ipcMain.handle("browser:dom", async () => {
    const view = browser();
    if (!view) throw new Error("Open a page first.");
    return view.webContents.executeJavaScript(`(() => {
      const nodes = [...document.querySelectorAll("a,button,input,textarea,select,h1,h2,h3,label")].slice(0, 60);
      return {
        url: location.href,
        title: document.title,
        nodes: nodes.map((el) => ({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute("type") || "",
          name: el.getAttribute("name") || el.id || "",
          text: (el.innerText || el.getAttribute("placeholder") || el.getAttribute("aria-label") || "").trim().slice(0, 120),
          href: el.href || ""
        }))
      };
    })()`, true);
  });

  ipcMain.handle("browser:shot", async () => {
    const view = browser();
    if (!view) throw new Error("Open a page first.");
    const image = await view.webContents.capturePage();
    const file = path.join(ctx.temp(), `modbitx-page-${Date.now()}.png`);
    fs.writeFileSync(file, image.toPNG());
    return { file, dataUrl: image.toDataURL(), width: image.getSize().width, height: image.getSize().height };
  });

  ipcMain.handle("computer:apps", async () => {
    const result = await osa('tell application "System Events" to get name of every process whose background only is false');
    if (result.code !== 0) return [];
    return result.stdout.split(",").map((name) => name.trim()).filter(Boolean).slice(0, 40);
  });

  ipcMain.handle("computer:focus", async (_e, name, takeover) => {
    const safe = String(name || "").replace(/"/g, "");
    if (!safe) throw new Error("Name an app.");
    const result = await osa(`tell application "${safe}" to activate`);
    return { ok: result.code === 0, mode: takeover ? "takeover" : "background", detail: result.stderr || `Activated ${safe}` };
  });

  ipcMain.handle("computer:shot", async () => {
    if (!ctx.armed()) throw new Error("Turn on computer use and allow it for this task.");
    const display = screen.getPrimaryDisplay().size;
    const width = Math.min(display.width, 1600);
    const height = Math.max(1, Math.round(display.height * (width / display.width)));
    const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width, height } });
    const image = sources[0]?.thumbnail;
    if (!image || image.isEmpty()) throw new Error("Screen Recording is off for Electron.");
    const size = image.getSize();
    ctx.noteShot(size.width, size.height);
    const file = path.join(ctx.temp(), `modbitx-shot-${Date.now()}.png`);
    fs.writeFileSync(file, image.toPNG());
    return { dataUrl: image.toDataURL(), file, width: size.width, height: size.height };
  });

  // ---- Record & Replay: a user-started screen timeline for computer history ----
  // Frames stay in the temp directory, only the latest recording is kept, and
  // every capture needs the same Screen Recording grant computer use uses.

  async function recordFrame(dir) {
    const display = screen.getPrimaryDisplay().size;
    const width = Math.min(display.width, 1280);
    const height = Math.max(1, Math.round(display.height * (width / display.width)));
    const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width, height } });
    const image = sources[0]?.thumbnail;
    if (!image || image.isEmpty()) throw new Error("Screen Recording is off for Electron.");
    const at = Date.now();
    const file = path.join(dir, `frame-${at}.png`);
    fs.writeFileSync(file, image.toPNG());
    let app = "(unknown)";
    try {
      const front = await osa('tell application "System Events" to get name of first application process whose frontmost is true');
      if (front.code === 0) app = front.stdout.trim().slice(0, 80);
    } catch { /* System Events may be denied; frames still record */ }
    return { at, app, file };
  }

  ipcMain.handle("recording:start", async () => {
    if (!ctx.armed()) throw new Error("Turn on computer use first; recording uses the same Screen Recording grant.");
    if (recorder.timer) return { ok: true, note: "A recording is already running." };
    fs.rmSync(path.join(ctx.temp(), "modbitx-record"), { recursive: true, force: true });
    const dir = path.join(ctx.temp(), "modbitx-record");
    fs.mkdirSync(dir, { recursive: true });
    recorder.frames = [];
    recorder.startedAt = Date.now();
    const capture = async () => {
      try {
        const frame = await recordFrame(dir);
        recorder.frames.push(frame);
        if (recorder.frames.length > 240) recorder.frames.shift();
        ctx.send("recording:frame", { at: frame.at, app: frame.app, count: recorder.frames.length });
      } catch (error) {
        ctx.send("recording:frame", { error: String(error?.message || error).slice(0, 200) });
      }
    };
    void capture();
    recorder.timer = setInterval(capture, 5000);
    return { ok: true, note: "Recording a frame every 5 seconds. Stop it when done." };
  });

  ipcMain.handle("recording:stop", async () => {
    if (recorder.timer) {
      clearInterval(recorder.timer);
      recorder.timer = null;
    }
    return { ok: true, startedAt: recorder.startedAt, frames: recorder.frames.map(({ at, app }) => ({ at, app })) };
  });

  ipcMain.handle("recording:latest", async () => {
    return { startedAt: recorder.startedAt, frames: recorder.frames.map(({ at, app }) => ({ at, app })) };
  });

  ipcMain.handle("voice:speak", async (_e, text, opts) => {    const spoken = String(text || "").slice(0, 2000);
    const voice = String((opts && opts.voice) || "").replace(/[^A-Za-z0-9 ._-]/g, "").slice(0, 60);
    const rate = Math.min(400, Math.max(80, Number(opts && opts.rate) || 0));
    const args = [];
    if (voice) args.push("-v", voice);
    if (rate) args.push("-r", String(Math.round(rate)));
    args.push(spoken);
    const child = spawn("say", args);
    ctx.setVoice(child);
    return true;
  });

  // ---- Messages (iMessage) bridge ----
  // Both handlers ride AppleScript against the native Messages app. macOS asks
  // once for Automation permission; a refusal surfaces as an honest error.

  function asQuote(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').slice(0, 2000);
  }

  ipcMain.handle("messages:read", async (_e, limit) => {
    const max = Math.min(20, Math.max(1, Number(limit) || 8));
    const script = [
      "tell application \"Messages\"",
      "set output to \"\"",
      "set chatList to chats",
      `set max to ${max}`,
      "if (count of chatList) < max then set max to count of chatList",
      "repeat with i from 1 to max",
      "set c to item i of chatList",
      "set chatName to \"(unknown)\"",
      "try", "set chatName to name of c", "end try",
      "set msgText to \"\"",
      "try", "set msgText to text of (last message of c)", "end try",
      "set output to output & chatName & \" — \" & msgText & linefeed",
      "end repeat",
      "return output",
      "end tell"
    ].join("\n");
    const result = await exec("osascript", ["-e", script], { timeout: 15000 });
    if (result.code !== 0) {
      const cause = `${result.stderr || result.stdout || ""}`.trim();
      throw new Error(/not allowed|automat/i.test(cause)
        ? "This Mac did not allow Modbitx to control Messages. Allow it in System Settings → Privacy & Security → Automation."
        : `Messages could not be read: ${cause.slice(0, 200) || "the app may be closed"}`);
    }
    return result.stdout.trim();
  });

  ipcMain.handle("messages:send", async (_e, target, text) => {
    const who = asQuote(target);
    const body = asQuote(text);
    if (!who || !body) throw new Error("Name a recipient and a message.");
    const script = [
      "tell application \"Messages\"",
      "repeat with s in services",
      "try",
      `set b to first buddy of s whose handle is "${who}"`,
      `send "${body}" to b`,
      "return \"sent to \" & (name of b)",
      "end try",
      "end repeat",
      "repeat with s in services",
      "try",
      `set b to first buddy of s whose name is "${who}"`,
      `send "${body}" to b`,
      "return \"sent to \" & (name of b)",
      "end try",
      "end repeat",
      "return \"no buddy matched\"",
      "end tell"
    ].join("\n");
    const result = await exec("osascript", ["-e", script], { timeout: 15000 });
    if (result.code !== 0) {
      const cause = `${result.stderr || result.stdout || ""}`.trim();
      throw new Error(/not allowed|automat/i.test(cause)
        ? "This Mac did not allow Modbitx to control Messages. Allow it in System Settings → Privacy & Security → Automation."
        : `The message could not be sent: ${cause.slice(0, 200)}`);
    }
    return result.stdout.trim();
  });

  /** The Mac's installed speakers, for the Read aloud picker. */
  ipcMain.handle("voice:voices", async () => {    const result = await new Promise((resolve) => {
      const child = spawn("say", ["-v", "?"]);
      let out = "";
      child.stdout.on("data", (chunk) => { out += String(chunk); });
      child.on("error", () => resolve([]));
      child.on("close", () => resolve(out));
    });
    return String(result || "")
      .split("\n")
      .map((line) => {
        const match = /^(\S[\w .'-]*?)\s{2,}(\S+)\s{2,}(.+)$/.exec(line.trim());
        return match ? { name: match[1].trim(), lang: match[2], sample: match[3].trim().replace(/^#\s*/, "") } : null;
      })
      .filter(Boolean)
      .slice(0, 200);
  });

  ipcMain.handle("voice:stop", async () => {
    ctx.killVoice();
    return true;
  });

  function assertTarget(target) {
    const value = String(target || "booted");
    if (value.startsWith("avd:")) {
      if (!/^avd:[\w.-]{1,64}$/.test(value)) throw new Error("Bad emulator name.");
      return value;
    }
    if (!/^[\w.:-]{4,80}$/.test(value)) throw new Error("Bad simulator id.");
    return value;
  }

  function isAndroid(target) {
    return target.startsWith("avd:") || target.startsWith("emulator-");
  }

  function pngResult(file, udid) {
    const image = nativeImage.createFromBuffer(fs.readFileSync(file));
    const size = image.getSize();
    if (!size.width) return { ok: false, udid, detail: "The screenshot was empty.", error: "The screenshot was empty." };
    simShots.set(udid, { w: size.width, h: size.height });
    return {
      ok: true,
      udid,
      width: size.width,
      height: size.height,
      dataUrl: `data:image/png;base64,${image.toPNG().toString("base64")}`,
      detail: `Screenshot ${size.width}×${size.height}. Tap x,y are these pixels, origin top-left.`
    };
  }

  // Same formula as mapSimPoint in src/simulator.ts.
  function mapSimPoint(shot, win, x, y) {
    const title = 28;
    const availW = Math.max(1, win.w);
    const availH = Math.max(1, win.h - title);
    const scale = Math.min(availW / Math.max(1, shot.w), availH / Math.max(1, shot.h));
    const drawnW = shot.w * scale;
    const drawnH = shot.h * scale;
    const left = win.x + (availW - drawnW) / 2;
    const top = win.y + title + (availH - drawnH) / 2;
    const px = Math.round(left + (Number(x) / Math.max(1, shot.w)) * drawnW);
    const py = Math.round(top + (Number(y) / Math.max(1, shot.h)) * drawnH);
    return {
      x: Math.min(win.x + win.w - 2, Math.max(win.x + 1, px)),
      y: Math.min(win.y + win.h - 2, Math.max(win.y + title, py))
    };
  }

  async function simulatorWindow() {
    await exec("open", ["-a", "Simulator"]);
    await sleep(400);
    await osa('tell application "Simulator" to activate');
    const result = await osa('tell application "System Events" to tell process "Simulator" to get {position, size} of window 1');
    const nums = String(result.stdout || "").match(/-?\d+/g)?.map(Number) || [];
    if (result.code !== 0 || nums.length < 4) throw new Error("Simulator’s window is not open. macOS may also be asking for Accessibility.");
    return { x: nums[0], y: nums[1], w: nums[2], h: nums[3] };
  }

  async function clickScreen(x, y) {
    const result = await osa(`tell application "System Events" to click at {${Math.round(x)}, ${Math.round(y)}}`);
    if (result.code !== 0) throw new Error(result.stderr || "The click needs Accessibility for Electron.");
  }

  async function iosShot(udid) {
    const file = path.join(ctx.temp(), `modbitx-sim-${Date.now()}.png`);
    const result = await exec("xcrun", ["simctl", "io", udid, "screenshot", file], { timeout: 25000 });
    if (result.code !== 0 || !fs.existsSync(file)) {
      return { ok: false, udid, detail: result.stderr || "simctl screenshot failed. Boot a simulator in Xcode first.", error: result.stderr || "screenshot failed" };
    }
    return pngResult(file, udid);
  }

  async function androidSerial(target) {
    const adb = adbBin();
    if (!adb) throw new Error("Android platform-tools adb was not found. Set ANDROID_HOME.");
    if (target.startsWith("emulator-")) return target;
    if (!target.startsWith("avd:")) throw new Error("Boot the Android emulator first.");
    const name = target.slice(4);
    const devices = await exec(adb, ["devices"]);
    const serials = [...devices.stdout.matchAll(/emulator-\d+/g)].map((match) => match[0]);
    for (const serial of serials) {
      const info = await exec(adb, ["-s", serial, "emu", "avd", "name"]);
      if (`${info.stdout}${info.stderr}`.includes(name)) return serial;
    }
    throw new Error(`Boot ${name} first.`);
  }

  async function androidShot(serial) {
    const file = path.join(ctx.temp(), `modbitx-adb-${Date.now()}.png`);
    const result = await spawnToFile(adbBin(), ["-s", serial, "exec-out", "screencap", "-p"], file);
    if (result.code !== 0 || !fs.existsSync(file) || fs.statSync(file).size < 32) {
      return { ok: false, udid: serial, detail: result.stderr || "adb screencap failed.", error: result.stderr || "screencap failed" };
    }
    return pngResult(file, serial);
  }

  async function bootDevice(target) {
    const id = assertTarget(target);
    if (id.startsWith("avd:")) {
      const name = id.slice(4);
      const emu = emulatorBin();
      const adb = adbBin();
      if (!emu || !adb) return { ok: false, detail: "Android emulator or adb was not found under ANDROID_HOME.", error: "android sdk missing" };
      let already = "";
      try { already = await androidSerial(id); } catch { already = ""; }
      if (!already) {
        const child = spawn(emu, ["-avd", name], { detached: true, stdio: "ignore" });
        child.unref();
      }
      const deadline = Date.now() + (already ? 4000 : 18000);
      while (Date.now() < deadline) {
        try {
          const serial = await androidSerial(id);
          const boot = await exec(adb, ["-s", serial, "shell", "getprop", "sys.boot_completed"]);
          if (boot.stdout.trim() === "1") return { ok: true, udid: serial, detail: `${name} is booted as ${serial}` };
        } catch { /* still starting, or another emulator is the only one online */ }
        await sleep(1500);
      }
      return { ok: true, detail: `${name} is still booting. List simulators again in a few seconds.` };
    }
    const boot = await exec("xcrun", ["simctl", "boot", id], { timeout: 30000 });
    await exec("open", ["-a", "Simulator"]);
    const ok = boot.code === 0 || /current state: Booted/.test(`${boot.stderr}${boot.stdout}`);
    return { ok, udid: id, detail: boot.stderr || boot.stdout || (ok ? "Booted" : "Boot failed"), error: ok ? undefined : (boot.stderr || "Boot failed") };
  }

  async function runSim(payload) {
    const action = String(payload?.action || "");
    const target = assertTarget(payload?.target);
    if (action === "boot") return bootDevice(target);
    if (action === "shutdown") {
      if (isAndroid(target)) {
        const serial = await androidSerial(target);
        const result = await exec(adbBin(), ["-s", serial, "emu", "kill"]);
        return { ok: result.code === 0, udid: serial, detail: result.stderr || result.stdout || "Shut down" };
      }
      const result = await exec("xcrun", ["simctl", "shutdown", target]);
      return { ok: result.code === 0, udid: target, detail: result.stderr || result.stdout || "Shut down" };
    }
    if (action === "shot") {
      if (isAndroid(target)) return androidShot(await androidSerial(target));
      return iosShot(target);
    }
    if (action === "open") {
      const url = String(payload?.url || "");
      if (!/^https?:\/\//i.test(url)) throw new Error("URL must be http or https.");
      if (isAndroid(target)) {
        const serial = await androidSerial(target);
        const result = await exec(adbBin(), ["-s", serial, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", url]);
        return { ok: result.code === 0, udid: serial, detail: result.stderr || result.stdout || `Opened ${url}` };
      }
      const result = await exec("xcrun", ["simctl", "openurl", target, url]);
      return { ok: result.code === 0, udid: target, detail: result.stderr || result.stdout || `Opened ${url}` };
    }
    if (action === "install") {
      const file = path.resolve(String(payload?.path || ""));
      if (!fs.existsSync(file) || !/\.(app|apk)$/i.test(file)) throw new Error("Install an existing .app or .apk.");
      if (file.endsWith(".apk") || isAndroid(target)) {
        const serial = await androidSerial(target);
        const result = await exec(adbBin(), ["-s", serial, "install", "-r", file], { timeout: 120000 });
        return { ok: result.code === 0, udid: serial, detail: `${result.stdout}${result.stderr}`.slice(0, 500) || "Installed" };
      }
      const result = await exec("xcrun", ["simctl", "install", target, file], { timeout: 120000 });
      return { ok: result.code === 0, udid: target, detail: `${result.stdout}${result.stderr}`.slice(0, 500) || "Installed" };
    }
    if (action === "launch") {
      const bundle = String(payload?.bundle || "");
      if (!/^[A-Za-z0-9._]+$/.test(bundle)) throw new Error("Bad bundle or package id.");
      if (isAndroid(target)) {
        const serial = await androidSerial(target);
        const result = await exec(adbBin(), ["-s", serial, "shell", "monkey", "-p", bundle, "-c", "android.intent.category.LAUNCHER", "1"], { timeout: 20000 });
        return { ok: result.code === 0, udid: serial, detail: `${result.stdout}${result.stderr}`.slice(0, 500) || `Launched ${bundle}` };
      }
      const result = await exec("xcrun", ["simctl", "launch", target, bundle], { timeout: 20000 });
      return { ok: result.code === 0, udid: target, detail: `${result.stdout}${result.stderr}`.slice(0, 500) || `Launched ${bundle}` };
    }
    if (action === "text") {
      const text = String(payload?.text || "");
      if (isAndroid(target)) {
        const serial = await androidSerial(target);
        if (/[^\n\r\t\x20-\x7E]/.test(text)) return { ok: false, udid: serial, detail: "This Android path only types basic English characters.", error: "charset" };
        const encoded = text.slice(0, 200).replace(/%/g, "").replace(/ /g, "%s");
        const result = await exec(adbBin(), ["-s", serial, "shell", "input", "text", encoded || " "]);
        return { ok: result.code === 0, udid: serial, detail: result.stderr || `Typed ${text.length} characters` };
      }
      const copied = await exec("xcrun", ["simctl", "pbcopy", target], { input: text.slice(0, 2000) });
      if (copied.code !== 0) return { ok: false, udid: target, detail: copied.stderr || "Could not copy text into the simulator.", error: copied.stderr };
      await simulatorWindow();
      const pasted = await osa('tell application "System Events" to keystroke "v" using {command down}');
      if (pasted.code !== 0) return { ok: false, udid: target, detail: "Text is on the simulator clipboard. Paste needs Accessibility.", error: pasted.stderr };
      const shot = await iosShot(target);
      return { ...shot, detail: `Pasted ${Math.min(text.length, 2000)} characters. ${shot.detail || ""}` };
    }
    if (action === "button") {
      const name = String(payload?.text || "home").toLowerCase();
      if (isAndroid(target)) {
        const serial = await androidSerial(target);
        const keys = { home: "3", back: "4", enter: "66", lock: "26" };
        if (name === "dark" || name === "light") {
          const result = await exec(adbBin(), ["-s", serial, "shell", "cmd", "uimode", "night", name === "dark" ? "yes" : "no"]);
          return { ok: result.code === 0, udid: serial, detail: result.stderr || result.stdout || `Appearance ${name}` };
        }
        const key = keys[name];
        if (!key) throw new Error("Button must be home, back, enter, lock, light, or dark.");
        const result = await exec(adbBin(), ["-s", serial, "shell", "input", "keyevent", key]);
        return { ok: result.code === 0, udid: serial, detail: result.stderr || `Pressed ${name}` };
      }
      if (name === "dark" || name === "light") {
        const result = await exec("xcrun", ["simctl", "ui", target, "appearance", name]);
        return { ok: result.code === 0, udid: target, detail: result.stderr || result.stdout || `Appearance ${name}` };
      }
      if (name !== "home" && name !== "lock") throw new Error("iOS button must be home, lock, light, or dark.");
      await simulatorWindow();
      const script = name === "lock"
        ? 'tell application "System Events" to keystroke "l" using {command down}'
        : 'tell application "System Events" to keystroke "h" using {command down, shift down}';
      const pressed = await osa(script);
      if (pressed.code !== 0) return { ok: false, udid: target, detail: pressed.stderr || "Could not press the simulator button.", error: pressed.stderr };
      const shot = await iosShot(target);
      return { ...shot, detail: `Pressed ${name}. ${shot.detail || ""}` };
    }
    if (action === "tap" || action === "swipe") {
      const x = Number(payload?.x);
      const y = Number(payload?.y);
      const x2 = Number(payload?.x2);
      const y2 = Number(payload?.y2);
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("Tap needs x and y in screenshot pixels.");
      if (isAndroid(target)) {
        const serial = await androidSerial(target);
        const args = action === "tap"
          ? ["-s", serial, "shell", "input", "tap", String(Math.round(x)), String(Math.round(y))]
          : ["-s", serial, "shell", "input", "swipe", String(Math.round(x)), String(Math.round(y)), String(Math.round(x2)), String(Math.round(y2)), "280"];
        if (action === "swipe" && (!Number.isFinite(x2) || !Number.isFinite(y2))) throw new Error("Swipe needs x,y and x2,y2.");
        const result = await exec(adbBin(), args);
        if (result.code !== 0) return { ok: false, udid: serial, detail: result.stderr || "adb input failed.", error: result.stderr };
        const shot = await androidShot(serial);
        return { ...shot, detail: `${action} ${Math.round(x)},${Math.round(y)}. ${shot.detail || ""}` };
      }
      if (!simShots.has(target)) {
        const primed = await iosShot(target);
        if (!primed.ok) return primed;
      }
      const win = await simulatorWindow();
      const start = mapSimPoint(simShots.get(target), win, x, y);
      if (action === "swipe") {
        if (!Number.isFinite(x2) || !Number.isFinite(y2)) throw new Error("Swipe needs x,y and x2,y2.");
        const end = mapSimPoint(simShots.get(target), win, x2, y2);
        if (!ctx.dragScreen) return { ok: false, udid: target, detail: "Swipe needs the pointer helper.", error: "no drag" };
        await ctx.dragScreen(start.x, start.y, end.x, end.y);
      } else {
        await clickScreen(start.x, start.y);
      }
      const shot = await iosShot(target);
      return { ...shot, detail: `${action} screenshot ${Math.round(x)},${Math.round(y)} at window ${start.x},${start.y}. ${shot.detail || ""}` };
    }
    throw new Error("Unknown simulator action.");
  }

  ipcMain.handle("sim:list", async () => {
    const devices = [];
    let iosError = "";
    const result = await exec("xcrun", ["simctl", "list", "devices", "available", "-j"], { timeout: 15000 });
    if (result.code !== 0) iosError = result.stderr || "Xcode simctl is not available.";
    else {
      try {
        const json = JSON.parse(result.stdout || "{}");
        for (const runtime of Object.keys(json.devices || {})) {
          for (const device of json.devices[runtime]) {
            devices.push({ platform: "ios", name: device.name, udid: device.udid, state: device.state, runtime });
          }
        }
      } catch (error) {
        iosError = error instanceof Error ? error.message : "Could not read simctl output.";
      }
    }
    const adb = adbBin();
    const bootedAvds = new Set();
    if (adb) {
      const attached = await exec(adb, ["devices"]);
      for (const line of attached.stdout.split("\n").slice(1)) {
        const match = /^(emulator-\d+)\s+device/.exec(line.trim());
        if (!match) continue;
        devices.push({ platform: "android", name: match[1], udid: match[1], state: "Booted", runtime: "android" });
        const info = await exec(adb, ["-s", match[1], "emu", "avd", "name"]);
        const avdName = `${info.stdout}`.trim().split(/\n/).filter(Boolean).pop();
        if (avdName) bootedAvds.add(avdName);
      }
    }
    const emu = emulatorBin();
    if (emu) {
      const avds = await exec(emu, ["-list-avds"]);
      for (const name of avds.stdout.split(/\n/).map((item) => item.trim()).filter(Boolean)) {
        if (!/^[\w.-]+$/.test(name)) continue;
        devices.push({ platform: "android", name, udid: `avd:${name}`, state: bootedAvds.has(name) ? "Booted" : "Shutdown", runtime: "android" });
      }
    }
    if (!devices.length && iosError) return { ok: false, error: iosError, devices: [] };
    return { ok: true, devices: devices.slice(0, 40) };
  });

  ipcMain.handle("sim:boot", async (_e, udid) => bootDevice(udid));

  ipcMain.handle("sim:open", async (_e, udid, url) => runSim({ action: "open", target: udid, url }));

  ipcMain.handle("sim:run", async (_e, payload) => runSim(payload || {}));

  ipcMain.handle("git:run", async (_e, folder, action, message, extra) => {
    if (!folder) throw new Error("Open a repository folder.");
    const git = (args) => exec("git", args, { cwd: folder });
    if (action === "status") return git(["status", "--short", "--branch"]);
    if (action === "diff") {
      const result = await git(["diff", "HEAD"]);
      return { ...result, stdout: result.stdout.slice(0, 20_000) };
    }
    if (action === "log") return git(["log", "--oneline", "-n", "12"]);
    if (action === "commit") {
      const msg = String(message || "Modbitx checkpoint").slice(0, 200);
      await git(["add", "-A"]);
      return git(["commit", "-m", msg]);
    }
    if (action === "branch") {
      const name = String(message || "").trim();
      if (!/^[\w./-]{1,80}$/.test(name)) throw new Error("Branch names use letters, numbers, dots, slashes, and dashes.");
      return git(["checkout", "-b", name]);
    }
    if (action === "remote") return git(["remote", "get-url", "origin"]);
    if (action === "worktree") {
      const location = String(extra || "").trim();
      if (!location) throw new Error("Choose a worktree folder in Settings → Code.");
      if (!fs.existsSync(location) || !fs.statSync(location).isDirectory()) throw new Error("The worktree folder is missing.");
      const branch = String(message || "").trim();
      if (!/^[\w./-]{1,80}$/.test(branch)) throw new Error("Branch names use letters, numbers, dots, slashes, and dashes.");
      const leaf = branch.replace(/[\\/]+/g, "-");
      if (leaf.includes("..") || !/^[\w.-]{1,80}$/.test(leaf)) throw new Error("That branch name cannot be a folder.");
      const dest = path.join(location, leaf);
      if (fs.existsSync(dest)) throw new Error("A worktree folder with that name already exists.");
      const result = await git(["worktree", "add", "-b", branch, dest]);
      return { ...result, stdout: result.code === 0 ? `${dest}\n${result.stdout}` : result.stdout };
    }
    throw new Error("Unknown git action.");
  });

  ipcMain.handle("work:apply", async (_e, root, diff) => {
    if (!root || !fs.existsSync(root)) throw new Error("Open a folder before applying a patch.");
    const patch = String(diff || "");
    if (!patch.includes("+++") && !patch.includes("---")) throw new Error("That is not a unified diff.");
    const file = path.join(ctx.temp(), `modbitx-${Date.now()}.patch`);
    fs.writeFileSync(file, patch.endsWith("\n") ? patch : `${patch}\n`);
    let result = await exec("git", ["apply", "--unsafe-paths", "--whitespace=nowarn", file], { cwd: root, timeout: 15000 });
    if (result.code !== 0) result = await exec("patch", ["-p1", "-i", file], { cwd: root, timeout: 15000 });
    return { code: result.code, stdout: `${result.stdout}${result.stderr}`.slice(0, 6000) };
  });

  ipcMain.handle("ssh:known", async (_e, target) => {
    const spec = String(target || "").trim();
    const host = (spec.split("@")[1] || "").trim();
    if (!host) return { known: false, error: "Name the host." };
    const result = await exec("ssh-keygen", ["-F", host, "-f", path.join(os.homedir(), ".ssh", "known_hosts")], { timeout: 5000 });
    // ssh-keygen exits 1 when the host is unknown; any output listing the host means known.
    return { known: result.code === 0 && /found/.test(result.stdout) };
  });

  ipcMain.handle("ssh:run", async (_e, target, command, opts) => {
    const spec = String(target || "").trim();
    if (!/^[\w.-]+@[\w.-]+$/.test(spec)) throw new Error("SSH target must look like user@host.");
    const cmd = String(command || "uname -a").replace(/[\r\n]/g, " ").slice(0, 500);
    // accept-new records a first-seen host key after the user approved it; a
    // changed key still fails closed, exactly like their own ssh would.
    const strict = ["-o", "StrictHostKeyChecking=" + (opts && opts.acceptNew ? "accept-new" : "yes")];
    return exec("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=8", ...strict, spec, cmd], { timeout: 20000 });
  });

  ipcMain.handle("rewind:save", async (_e, folder, rel) => {
    const file = path.resolve(folder, rel || ".");
    if (!file.startsWith(path.resolve(folder))) throw new Error("Outside folder.");
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return null;
    const dest = path.join(ctx.userData(), "rewind", `${Date.now()}-${path.basename(file)}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
    fs.writeFileSync(`${dest}.meta`, JSON.stringify({ folder, rel, file }));
    return dest;
  });

  ipcMain.handle("rewind:list", async () => {
    const dir = path.join(ctx.userData(), "rewind");
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((name) => !name.endsWith(".meta")).slice(-20).reverse().map((name) => {
      let meta = {};
      try { meta = JSON.parse(fs.readFileSync(path.join(dir, `${name}.meta`), "utf8")); } catch { /* ignore */ }
      return { id: name, ...meta };
    });
  });

  ipcMain.handle("rewind:restore", async (_e, id) => {
    const dir = path.join(ctx.userData(), "rewind");
    const meta = JSON.parse(fs.readFileSync(path.join(dir, `${id}.meta`), "utf8"));
    fs.copyFileSync(path.join(dir, id), meta.file);
    return meta.file;
  });

  ipcMain.handle("doc:read", async (_e, filePath) => readDocument(filePath));
  ipcMain.handle("doc:write", async (_e, kind, dest, payload) => writeDocument(kind, dest, payload));

  ipcMain.handle("connect:github", async (_e, token, pathName) => {
    const response = await fetch(`https://api.github.com${pathName || "/user"}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "Modbitx" }
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, body: text.slice(0, 16_000) };
  });

  ipcMain.handle("connect:calendar", async () => {
    const result = await osa('tell application "Calendar" to get summary of every event of calendar 1');
    return { ok: result.code === 0, text: (result.stdout || result.stderr).slice(0, 4000) };
  });

  ipcMain.handle("connect:mail", async () => {
    const result = await osa('tell application "Mail" to get subject of messages 1 thru 8 of inbox');
    return { ok: result.code === 0, text: (result.stdout || result.stderr).slice(0, 4000) };
  });

  ipcMain.handle("mcp:start", async (_e, id, command) => startMcp(id, command));
  ipcMain.handle("mcp:tools", async (_e, id) => mcpRequest(id, "tools/list", {}));
  ipcMain.handle("mcp:call", async (_e, id, name, args) => mcpRequest(id, "tools/call", { name, arguments: args || {} }));
  ipcMain.handle("mcp:stop", async (_e, id) => {
    const session = mcpSessions.get(id);
    if (session) session.child.kill();
    mcpSessions.delete(id);
    return true;
  });

  ipcMain.handle("term:start", async (_e, cwd) => {
    const id = `t${Date.now()}`;
    if (pty) {
      const term = pty.spawn("bash", ["-l"], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: cwd || os.homedir(),
        env: process.env
      });
      terms.set(id, term);
      term.onData((data) => ctx.send("term:data", { id, data: String(data) }));
      term.onExit(({ exitCode }) => ctx.send("term:data", { id, data: `\r\n[exit ${exitCode}]\r\n` }));
      return id;
    }
    console.warn(`[modbitx] ${ptyNote}; the terminal runs without a TTY.`);
    const child = spawn("bash", ["-l"], { cwd: cwd || os.homedir(), env: process.env });
    terms.set(id, child);
    child.stdout.on("data", (buf) => ctx.send("term:data", { id, data: String(buf) }));
    child.stderr.on("data", (buf) => ctx.send("term:data", { id, data: String(buf) }));
    child.on("exit", (code) => ctx.send("term:data", { id, data: `\n[exit ${code}]\n[terminal without a TTY — ${ptyNote}]\n` }));
    return id;
  });
  ipcMain.handle("term:write", async (_e, id, data) => {
    const child = terms.get(id);
    if (!child) throw new Error("Terminal is not running.");
    // A node-pty IPty writes directly; the piped fallback writes through stdin.
    if (typeof child.write === "function") child.write(data);
    else child.stdin.write(data);
    return true;
  });
  ipcMain.handle("term:kill", async (_e, id) => {
    terms.get(id)?.kill();
    terms.delete(id);
    return true;
  });

  ipcMain.handle("chrome:enqueue", async (_e, job) => {
    chromeQueue.push({ ...job, id: `c${Date.now()}` });
    return chromeQueue.length;
  });

  ipcMain.handle("sync:info", async () => {
    const state = readState(ctx.stateFile()) || { settings: {} };
    const code = state.settings?.pairingCode || pairing;
    if (!state.settings.pairingCode) {
      state.settings.pairingCode = code;
      try { fs.writeFileSync(ctx.stateFile(), JSON.stringify(state)); } catch { /* renderer may write next */ }
    }
    pairing = code;
    return { port: 4737, pairing: code, url: `http://127.0.0.1:4737/phone?code=${encodeURIComponent(code)}`, serverUp: syncStatus.up, serverNote: syncStatus.note };
  });
  ipcMain.handle("sync:pull", async () => {
    const file = path.join(ctx.userData(), "handoff.json");
    if (!fs.existsSync(file)) return [];
    const items = JSON.parse(fs.readFileSync(file, "utf8"));
    fs.writeFileSync(file, "[]");
    return items;
  });

  ipcMain.handle("notices:pull", async () => {
    const file = path.join(ctx.userData(), "task-notices.json");
    if (!fs.existsSync(file)) return [];
    let items = [];
    try { items = JSON.parse(fs.readFileSync(file, "utf8")); } catch { items = []; }
    fs.writeFileSync(file, "[]");
    return Array.isArray(items) ? items : [];
  });

  ipcMain.handle("artifact:publish", async (_e, id, html) => {
    const safe = String(id || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
    if (!safe) throw new Error("That artifact cannot be published.");
    const dir = path.join(ctx.userData(), "artifacts");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${safe}.html`);
    fs.writeFileSync(file, String(html || "").slice(0, 1_500_000));
    return { file, url: `http://127.0.0.1:4737/artifact/${safe}` };
  });

  ipcMain.handle("artifact:share", async (_e, id, html) => {
    const safe = String(id || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
    if (!safe) throw new Error("That artifact cannot be shared.");
    const dir = path.join(ctx.userData(), "shares");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${safe}.html`);
    fs.writeFileSync(file, String(html || "").slice(0, 1_500_000));
    return { id: safe, file, url: `http://127.0.0.1:4737/share/${safe}` };
  });

  ipcMain.handle("artifact:unshare", async (_e, id) => {
    const safe = String(id || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
    const file = path.join(ctx.userData(), "shares", `${safe}.html`);
    if (!safe || !fs.existsSync(file)) return { removed: false };
    fs.rmSync(file);
    return { removed: true };
  });

  ipcMain.handle("connectors:list", async () => ({ dir: connectorDir(ctx), items: readConnectorCatalog(ctx) }));
  ipcMain.handle("plugins:list", async () => { const dir = plugins.pluginDir(ctx.userData()); return { dir, items: plugins.readPluginSkills(dir), servers: plugins.readPluginServers(dir) }; });
  ipcMain.handle("plugins:install", async () => {
    const { dialog } = require("electron");
    const picked = await dialog.showOpenDialog({
      title: "Install a plugin package",
      filters: [{ name: "Plugin package", extensions: ["zip"] }],
      properties: ["openFile"]
    });
    if (picked.canceled || !picked.filePaths[0]) return null;
    const zipFile = picked.filePaths[0];
    const staging = fs.mkdtempSync(path.join(os.tmpdir(), "modbitx-plugin-"));
    // ditto is the Mac's own zip expander; it reads deflated archives the
    // renderer's stored-only reader cannot.
    const extracted = await new Promise((resolve) => {
      execFile("ditto", ["-x", "-k", zipFile, staging], { timeout: 20000 }, (error) => {
        resolve({ ok: !error, error: error ? String(error.message || error).slice(0, 200) : "" });
      });
    });
    if (!extracted.ok) {
      fs.rmSync(staging, { recursive: true, force: true });
      throw new Error(`That zip did not unpack: ${extracted.error || "not a zip archive"}`);
    }
    // Accept either <root>/plugin.json or a single wrapper folder around it.
    const entries = fs.readdirSync(staging).filter((name) => !name.startsWith("."));
    let packageRoot = null;
    const hasManifest = (dir) => fs.existsSync(path.join(dir, "plugin.json"));
    if (hasManifest(staging)) packageRoot = staging;
    else if (entries.length === 1 && fs.statSync(path.join(staging, entries[0])).isDirectory() && hasManifest(path.join(staging, entries[0]))) {
      packageRoot = path.join(staging, entries[0]);
    }
    if (!packageRoot) {
      fs.rmSync(staging, { recursive: true, force: true });
      throw new Error("That zip is not a plugin package: it needs a plugin.json at its root or one folder deep.");
    }
    let name = path.basename(packageRoot);
    try {
      name = String(JSON.parse(fs.readFileSync(path.join(packageRoot, "plugin.json"), "utf8")).name || name).replace(/[^A-Za-z0-9-]/g, "").slice(0, 40) || name;
    } catch { /* folder name is fine */ }
    const dest = path.join(plugins.pluginDir(ctx.userData()), name);
    fs.mkdirSync(plugins.pluginDir(ctx.userData()), { recursive: true });
    fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(packageRoot, dest);
    fs.rmSync(staging, { recursive: true, force: true });
    return { name, dir: dest };
  });
  ipcMain.handle("plugins:watch", async () => {
    const dir = plugins.pluginDir(ctx.userData());
    fs.mkdirSync(dir, { recursive: true });
    if (!pluginWatcher) {
      let timer = null;
      pluginWatcher = fs.watch(dir, { recursive: true }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => ctx.send("plugins:changed", { items: plugins.readPluginSkills(dir), servers: plugins.readPluginServers(dir) }), 200);
      });
    }
    return dir;
  });
  ipcMain.handle("connectors:watch", async () => {
    const dir = connectorDir(ctx);
    fs.mkdirSync(dir, { recursive: true });
    if (!connectorWatcher) {
      let timer = null;
      connectorWatcher = fs.watch(dir, () => {
        clearTimeout(timer);
        timer = setTimeout(() => ctx.send("connectors:changed", readConnectorCatalog(ctx)), 200);
      });
    }
    return dir;
  });

  ipcMain.handle("scheduler:install", async () => installScheduler(ctx));
  ipcMain.handle("scheduler:remove", async () => {
    const plist = path.join(os.homedir(), "Library/LaunchAgents/com.modbitx.scheduler.plist");
    await exec("launchctl", ["bootout", `gui/${process.getuid()}`, plist]);
    if (fs.existsSync(plist)) fs.rmSync(plist);
    return true;
  });

  startSync(ctx);
}

function startSync(ctx) {
  if (syncServer) return;
  const state = readState(ctx.stateFile());
  pairing = state?.settings?.pairingCode || Math.random().toString(36).slice(2, 8);
  syncServer = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const stateNow = readState(ctx.stateFile());
    const code = stateNow?.settings?.pairingCode || pairing;
    const given = url.searchParams.get("code") || "";
    if (url.pathname === "/phone") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(phoneHtml());
      return;
    }
    const artifactId = /^\/artifact\/([a-z0-9-]+)$/i.exec(url.pathname);
    if (req.method === "GET" && artifactId) {
      const file = path.join(ctx.userData(), "artifacts", `${artifactId[1].toLowerCase()}.html`);
      if (!fs.existsSync(file)) {
        res.writeHead(404);
        res.end("missing");
        return;
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(fs.readFileSync(file));
      return;
    }
    // A shared link serves the saved copy, and revoking deletes it, so the link stops working.
    const shareId = /^\/share\/([a-z0-9-]+)$/i.exec(url.pathname);
    if (req.method === "GET" && shareId) {
      const file = path.join(ctx.userData(), "shares", `${shareId[1].toLowerCase()}.html`);
      if (!fs.existsSync(file)) {
        res.writeHead(404);
        res.end("This link was revoked.");
        return;
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(fs.readFileSync(file));
      return;
    }
    if (given !== code) {
      res.writeHead(401);
      res.end("bad code");
      return;
    }
    if (url.pathname === "/v1/status") {
      const beat = path.join(ctx.userData(), "heartbeat");
      const fresh = fs.existsSync(beat) && Date.now() - fs.statSync(beat).mtimeMs < 8000;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        desktop: fresh,
        org: stateNow?.settings?.orgName || "Personal",
        name: String(stateNow?.settings?.fullName || stateNow?.settings?.displayName || "").slice(0, 80),
        email: String(stateNow?.settings?.email || "").slice(0, 120),
        plan: stateNow?.settings?.plan || "pro",
        remote: Boolean(stateNow?.settings?.remoteControl),
        tasks: (stateNow?.tasks || []).map((task) => ({ name: task.name, when: task.when, enabled: task.enabled }))
      }));
      return;
    }
    if (url.pathname === "/v1/chrome/next") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(chromeQueue.shift() || null));
      return;
    }
    if (req.method === "POST" && url.pathname === "/v1/handoff") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        if (!stateNow?.settings?.remoteControl) {
          res.writeHead(403);
          res.end("Remote control is off");
          return;
        }
        const file = path.join(ctx.userData(), "handoff.json");
        const current = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
        const parsed = JSON.parse(body || "{}");
        const entry = { text: String(parsed.text || ""), at: Date.now() };
        if (parsed.taskId) entry.taskId = String(parsed.taskId).slice(0, 80);
        if (parsed.title) entry.title = String(parsed.title).slice(0, 120);
        if (parsed.source === "chrome" || parsed.source === "phone") entry.source = parsed.source;
        if (parsed.page && typeof parsed.page === "object") {
          entry.page = {
            title: String(parsed.page.title || "").slice(0, 200),
            url: String(parsed.page.url || "").slice(0, 500),
            text: String(parsed.page.text || "").slice(0, 8000),
            error: String(parsed.page.error || "").slice(0, 300)
          };
        }
        current.push(entry);
        fs.writeFileSync(file, JSON.stringify(current));
        res.end("ok");
      });
      return;
    }
    res.writeHead(404);
    res.end("missing");
  });
  // Another copy holding the port must not take this window down; retry until it frees up.
  const listen = (attempt) => {
    syncServer.once("error", (error) => {
      const taken = error.code === "EADDRINUSE";
      syncStatus = {
        up: false,
        note: taken
          ? "Another copy of Modbitx is already using the local server on 127.0.0.1:4737, so phone handoff, share links, and the Chrome companion are off in this window until it quits."
          : `The local server could not start on 127.0.0.1:4737: ${error.message}`
      };
      if (attempt < 120) setTimeout(() => listen(attempt + 1), taken ? 5000 : 10000);
    });
    syncServer.listen(4737, "127.0.0.1", () => {
      syncStatus = { up: true, note: "" };
    });
  };
  listen(0);
}

function phoneHtml() {
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Modbitx</title>
  <body style="margin:0;background:#faf9f5;color:#1f1e1b;font-family:Georgia,serif">
  <main style="padding:24px;max-width:520px;margin:auto">
  <p style="letter-spacing:.08em;text-transform:uppercase;font-family:sans-serif;font-size:12px">Modbitx</p>
  <h1 style="font-weight:500">Hand off a task</h1>
  <p id="status" style="font-family:sans-serif"></p>
  <textarea id="text" rows="5" style="width:100%;border-radius:16px;border:1px solid #e8e6dc;padding:12px;font:16px sans-serif" placeholder="Continue the desktop session"></textarea>
  <button id="send" style="margin-top:12px;border:0;border-radius:999px;padding:10px 16px;background:#1f1e1b;color:#faf9f5">Send to desktop</button>
  <script>
  const code = new URLSearchParams(location.search).get("code") || "";
  async function refresh(){
    const r = await fetch("/v1/status?code="+code);
    const status = document.getElementById("status");
    if (!r.ok) { status.textContent = "This link does not match the desktop pairing code. Open Settings → Cowork and copy the link again."; return; }
    const data = await r.json();
    const tasks = (data.tasks || []).map((task) => task.name + " at " + task.when).join(", ");
    status.textContent = (data.desktop ? "Desktop is open" : "Desktop is closed. The message waits here") + " · " + data.org + " · " + data.plan + (data.remote ? "" : ". Turn on phone handoff in Settings → Cowork before sending.") + (tasks ? ". Schedules: " + tasks : "");
  }
  refresh();
  document.getElementById("send").onclick = async () => {
    const response = await fetch("/v1/handoff?code="+code, { method:"POST", body: JSON.stringify({ text: document.getElementById("text").value })});
    document.getElementById("status").textContent = response.ok ? "Sent to the desktop session." : await response.text();
    if (response.ok) document.getElementById("text").value = "";
  };
  </script></main></body>`;
}

function installScheduler(ctx) {
  const plistPath = path.join(os.homedir(), "Library/LaunchAgents/com.modbitx.scheduler.plist");
  const script = path.join(__dirname, "..", "scripts", "scheduler.cjs");
  const node = ctx.nodeBin();
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.modbitx.scheduler</string>
<key>ProgramArguments</key><array><string>${node}</string><string>${script}</string><string>${ctx.stateFile()}</string></array>
<key>EnvironmentVariables</key><dict><key>ELECTRON_RUN_AS_NODE</key><string>1</string></dict>
<key>StartInterval</key><integer>60</integer>
<key>RunAtLoad</key><true/>
</dict></plist>`;
  fs.mkdirSync(path.dirname(plistPath), { recursive: true });
  fs.writeFileSync(plistPath, plist);
  return exec("launchctl", ["bootout", `gui/${process.getuid()}`, plistPath]).then(() => exec("launchctl", ["bootstrap", `gui/${process.getuid()}`, plistPath])).then(() => plistPath);
}

function connectorDir(ctx) {
  return path.join(ctx.userData(), "connectors");
}

function readConnectorCatalog(ctx) {
  const dir = connectorDir(ctx);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith(".json")).map((name) => {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
      const id = String(parsed.id || path.basename(name, ".json")).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
      if (!id) return null;
      return {
        id,
        name: String(parsed.name || id).slice(0, 80),
        command: String(parsed.command || "").slice(0, 400),
        version: Number(parsed.version) || 1,
        blurb: String(parsed.blurb || "").slice(0, 240)
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function slideNames(listing) {
  return listing.split("\n").map((line) => {
    const match = /ppt\/slides\/slide\d+\.xml/.exec(line);
    return match ? match[0] : "";
  }).filter(Boolean).sort((a, b) => Number(/slide(\d+)/.exec(a)[1]) - Number(/slide(\d+)/.exec(b)[1]));
}

async function readDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if ([".txt", ".md", ".json", ".csv", ".html", ".ts", ".tsx", ".js", ".py"].includes(ext)) {
    return fs.readFileSync(filePath, "utf8").slice(0, 40_000);
  }
  if ([".doc", ".docx", ".rtf", ".odt"].includes(ext)) {
    const result = await exec("textutil", ["-convert", "txt", "-stdout", filePath]);
    if (result.stdout) return result.stdout.slice(0, 40_000);
  }
  if (ext === ".pdf") {
    const poppler = await exec("pdftotext", ["-layout", filePath, "-"]);
    if (poppler.code === 0 && poppler.stdout) return poppler.stdout.slice(0, 40_000);
    return "PDF text extractor (pdftotext) is not installed. The file is attached by name only.";
  }
  if (ext === ".xlsx") {
    const shared = await exec("unzip", ["-p", filePath, "xl/sharedStrings.xml"]);
    const sheet = await exec("unzip", ["-p", filePath, "xl/worksheets/sheet1.xml"]);
    const rows = office.cellsFromSheet(sheet.stdout, office.sharedStrings(shared.stdout));
    return rows.map((row) => row.join(", ")).join("\n").slice(0, 40_000);
  }
  if (ext === ".pptx") {
    const list = await exec("unzip", ["-l", filePath]);
    const parts = [];
    for (const name of slideNames(list.stdout)) {
      const xml = await exec("unzip", ["-p", filePath, name]);
      const lines = office.slideText(xml.stdout);
      if (lines.length) parts.push(lines.join("\n"));
    }
    return parts.join("\n## ").slice(0, 40_000);
  }
  return "";
}

async function zipTree(dir, dest) {
  if (fs.existsSync(dest)) fs.rmSync(dest);
  const zip = await exec("zip", ["-qr", dest, "."], { cwd: dir });
  if (zip.code !== 0) throw new Error(zip.stderr || "Could not write the file.");
  return dest;
}

async function writeDocument(kind, dest, payload) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const raw = String(payload || "");
  const append = raw.startsWith("APPEND\n");
  const body = append ? raw.slice("APPEND\n".length) : raw;
  if (kind === "md" || kind === "txt" || kind === "csv") {
    fs.writeFileSync(dest, append && fs.existsSync(dest) ? `${fs.readFileSync(dest, "utf8")}\n${body}` : raw);
    return dest;
  }
  if (kind === "pdf") {
    fs.writeFileSync(dest, office.simplePdf(body));
    return dest;
  }
  if (kind === "docx") {
    let text = body;
    if (append && fs.existsSync(dest)) {
      const existing = await exec("textutil", ["-convert", "txt", "-stdout", dest]);
      text = `${existing.stdout || ""}\n${body}`;
    }
    const html = path.join(os.tmpdir(), `modbitx-${Date.now()}.html`);
    fs.writeFileSync(html, `<html><body>${office.escapeXml(text).replace(/\n/g, "<br>")}</body></html>`);
    const result = await exec("textutil", ["-convert", "docx", html, "-output", dest]);
    if (result.code !== 0) throw new Error(result.stderr || "Could not write the Word file.");
    return dest;
  }
  if (kind === "xlsx") {
    let rows = office.rowsFromText(body);
    if (append && fs.existsSync(dest)) {
      const shared = await exec("unzip", ["-p", dest, "xl/sharedStrings.xml"]);
      const sheet = await exec("unzip", ["-p", dest, "xl/worksheets/sheet1.xml"]);
      rows = [...office.cellsFromSheet(sheet.stdout, office.sharedStrings(shared.stdout)), ...rows];
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "modbitx-xlsx-"));
    writeTree(dir, office.spreadsheetXml(rows));
    return zipTree(dir, dest);
  }
  if (kind === "pptx") {
    let slides = office.slidesFromPayload(body);
    if (append && fs.existsSync(dest)) {
      const list = await exec("unzip", ["-l", dest]);
      const existing = [];
      for (const name of slideNames(list.stdout)) {
        const xml = await exec("unzip", ["-p", dest, name]);
        const text = office.slideText(xml.stdout).join("\n");
        if (text) existing.push(text);
      }
      slides = [...existing, ...slides];
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "modbitx-pptx-"));
    writeTree(dir, office.presentationXml(slides));
    return zipTree(dir, dest);
  }
  throw new Error("Unsupported document.");
}

function writeTree(dir, files) {
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

function startMcp(id, command) {
  if (mcpSessions.has(id)) return { ok: true, reused: true };
  const child = spawn("bash", ["-lc", command], { stdio: ["pipe", "pipe", "pipe"] });
  const session = { child, buffer: Buffer.alloc(0), waiters: new Map(), next: 1 };
  child.stdout.on("data", (chunk) => {
    session.buffer = Buffer.concat([session.buffer, chunk]);
    while (session.buffer.length > 20) {
      const headerEnd = session.buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) return;
      const header = session.buffer.slice(0, headerEnd).toString();
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) { session.buffer = Buffer.alloc(0); return; }
      const length = Number(match[1]);
      const start = headerEnd + 4;
      if (session.buffer.length < start + length) return;
      const body = session.buffer.slice(start, start + length).toString();
      session.buffer = session.buffer.slice(start + length);
      const message = JSON.parse(body);
      const waiter = session.waiters.get(message.id);
      if (waiter) {
        session.waiters.delete(message.id);
        waiter(message);
      }
    }
  });
  mcpSessions.set(id, session);
  return mcpRequest(id, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "modbitx", version: "0.1.0" }
  }).then((init) => {
    session.child.stdin.write(frame({ jsonrpc: "2.0", method: "notifications/initialized" }));
    return { ok: true, init };
  });
}

function frame(message) {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

function mcpRequest(id, method, params) {
  const session = mcpSessions.get(id);
  if (!session) throw new Error("Start the MCP server first.");
  const msgId = session.next++;
  session.child.stdin.write(frame({ jsonrpc: "2.0", id: msgId, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("MCP server timed out")), 15000);
    session.waiters.set(msgId, (message) => {
      clearTimeout(timer);
      resolve(message.result || message.error || message);
    });
  });
}

module.exports = { attachPlatform, readDocument, writeDocument };
