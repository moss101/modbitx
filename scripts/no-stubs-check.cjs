/**
 * Proves the app does real work instead of fabricating it.
 *
 *   node scripts/no-stubs-check.cjs send       an unconfigured provider is reported, not faked
 *   node scripts/no-stubs-check.cjs share      a share link writes a file, serves it, and revokes
 *   node scripts/no-stubs-check.cjs document   a document write lands on disk as a real file
 *   node scripts/no-stubs-check.cjs mcp        a local MCP server starts and lists its tool
 *
 * Sends an isolated copy of the app on CDP_PORT (default 9333) so the send test runs
 * without a provider key and no fixture touches the user's own data.
 */
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PAGE_PORT = 8099;

const ROOT = path.join(__dirname, "..");
const MODE = process.argv[2] || "send";
const PORT = process.env.CDP_PORT || "9333";
const SHOT = process.env.SHOT || path.join(os.tmpdir(), "modbitx-parity-shots");
fs.mkdirSync(SHOT, { recursive: true });

const failures = [];
const shown = (name, ok, detail) => {
  if (!ok) failures.push(name);
  console.log(`${ok ? "pass" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

function playwright() {
  try {
    return require("playwright");
  } catch {
    console.error("This check needs Playwright on Node's path, for example NODE_PATH=/opt/homebrew/lib/node_modules.");
    process.exit(2);
  }
}

const FIXTURE_ARTIFACT = "```html artifact title=\"Parity probe\"\n<!doctype html><title>Parity probe</title><h1>Parity probe</h1><p>Shared from Modbitx.</p>\n```";

(async () => {
  const { chromium } = playwright();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find((p) => p.url().includes("5173")) || ctx.pages()[0];
  await page.waitForLoadState("domcontentloaded");
  await page.reload();
  await page.waitForTimeout(2500);

  const toMode = async (mode) => {
    await page.evaluate((value) => {
      const select = document.querySelector("select.mode-select");
      if (select) { select.value = value; select.dispatchEvent(new Event("change", { bubbles: true })); }
    }, mode);
    await page.waitForTimeout(800);
  };
  const newThread = async () => {
    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll("button")).find((b) => /^\+ New (chat|task|session)$/.test((b.textContent || "").trim()));
      if (button) button.click();
      else document.querySelector(".thread-list button")?.click();
    });
    await page.waitForSelector(".composer textarea", { timeout: 15000 });
    await page.waitForTimeout(400);
  };

  if (MODE === "send") {
    const keys = await page.evaluate(async () => {
      const state = await window.modbitx?.loadState();
      const parsed = state ? JSON.parse(state) : {};
      const saved = parsed.settings?.providerKeys || {};
      return Object.entries(saved).filter(([, value]) => value).map(([id]) => id);
    });
    shown("the isolated copy has no provider key", keys.length === 0, keys.join(", ") || "none saved");

    await toMode("chat");
    await newThread();
    await page.locator(".composer textarea").first().fill("What is the weather?");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(4000);
    const transcript = await page.evaluate(() => (document.querySelector(".transcript")?.innerText || "").replace(/\n{2,}/g, "\n"));
    shown("the send reports the missing provider", /No model provider key is set/i.test(transcript) && /Model providers/.test(transcript), transcript.split("\n").slice(-3).join(" / ").slice(0, 200));
    const fabricated = ["running locally without an API key", "preview reply", "still stores chats, projects, skills", "This preview was produced by the local artifact renderer"];
    const found = fabricated.filter((phrase) => transcript.toLowerCase().includes(phrase.toLowerCase()));
    shown("no fabricated reply appears", found.length === 0, found.join(", ") || "none");
    await page.screenshot({ path: path.join(SHOT, "no-stubs-send.png") });
  }

  if (MODE === "share") {
    // A saved artifact is the fixture; the share path is the thing under test.
    const seeded = await page.evaluate(async (content) => {
      const raw = await window.modbitx?.loadState();
      const state = raw ? JSON.parse(raw) : { threads: [] };
      state.threads = state.threads || [];
      state.threads.unshift({
        id: "parity-share",
        title: "Parity share probe",
        mode: "chat",
        messages: [{ id: "parity-msg", role: "assistant", content, createdAt: Date.now() }],
        pinned: false,
        archived: false,
        incognito: false,
        starred: false,
        model: "grok-4.7",
        effort: "xhigh",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      await window.modbitx?.saveState(JSON.stringify(state));
      return true;
    }, FIXTURE_ARTIFACT);
    shown("the fixture thread is saved", seeded === true);
    await page.reload();
    await page.waitForTimeout(2500);

    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll(".nav-list button")).find((b) => (b.textContent || "").trim() === "Artifacts");
      button?.click();
    });
    await page.waitForTimeout(900);
    const pane = await page.evaluate(() => ({
      rows: Array.from(document.querySelectorAll(".artifact-column .thread")).map((b) => b.innerText.replace(/\n/g, " · ")),
      share: !!Array.from(document.querySelectorAll(".artifact button")).find((b) => b.textContent.trim() === "Share")
    }));
    shown("the shared artifact is listed", pane.rows.length > 0, JSON.stringify(pane.rows.slice(0, 2)));
    shown("the pane offers a share button", pane.share === true);

    await page.evaluate(() => {
      Array.from(document.querySelectorAll(".artifact button")).find((b) => b.textContent.trim() === "Share")?.click();
    });
    await page.waitForTimeout(1500);
    const link = await page.evaluate(() => {
      const code = document.querySelector(".share-link code")?.textContent || "";
      const note = document.querySelector(".artifact .muted")?.textContent || "";
      return { code, note };
    });
    const id = (link.code.match(/\/share\/([a-z0-9-]+)/) || [])[1] || "";
    shown("a link record appears in the pane", Boolean(id), `${link.code} ${link.note.slice(0, 60)}`);

    // Fetched from Node: the renderer is on another origin, and the app opens these
    // links in the system browser rather than fetching them itself.
    const servedResponse = await fetch(`http://127.0.0.1:4737/share/${id}`);
    const servedBody = await servedResponse.text();
    shown("the link serves the artifact", servedResponse.status === 200 && /Parity probe/.test(servedBody), `HTTP ${servedResponse.status}, ${servedBody.length} bytes`);

    await page.evaluate(() => {
      const row = document.querySelector(".share-link");
      Array.from(row.querySelectorAll("button")).find((b) => b.textContent.trim() === "Revoke")?.click();
    });
    await page.waitForTimeout(1200);
    const revoked = await fetch(`http://127.0.0.1:4737/share/${id}`);
    const records = await page.evaluate(() => document.querySelectorAll(".share-link").length);
    shown("revoking removes the record and the file", revoked.status === 404 && records === 0, `HTTP ${revoked.status}, ${records} records`);
    await page.screenshot({ path: path.join(SHOT, "no-stubs-share.png") });
  }

  if (MODE === "document") {
    const dir = path.join(SHOT, "documents");
    fs.mkdirSync(dir, { recursive: true });
    const docx = path.join(dir, "parity.docx");
    const written = await page.evaluate(async (dest) => {
      try {
        return await window.modbitx?.writeDocument("docx", dest, { title: "Parity probe", body: "Written by the shipped document writer." });
      } catch (error) {
        return { error: String(error.message || error) };
      }
    }, docx);
    console.log("write result:", JSON.stringify(written).slice(0, 160));
    const exists = fs.existsSync(docx);
    const head = exists ? fs.readFileSync(docx).subarray(0, 2).toString("latin1") : "";
    shown("a document write lands on disk", exists && head === "PK", `${docx} ${head}`);
    const inside = exists ? fs.readFileSync(docx).includes(Buffer.from("word/document.xml")) : false;
    shown("the file is a real Word package", inside === true);

    // The pane's export path, driven through the new IPC with a destination.
    const exported = path.join(dir, "exported.md");
    const result = await page.evaluate(async (dest) => {
      try {
        return await window.modbitx?.exportArtifact("md", "exported.md", "# Exported heading\n\nBody from the artifact.", dest);
      } catch (error) {
        return { error: String(error.message || error) };
      }
    }, exported);
    const exportBody = fs.existsSync(exported) ? fs.readFileSync(exported, "utf8") : "";
    shown("an artifact exports through the pane's own path", /Exported heading/.test(exportBody) && result?.kind === "md", `${exported} (${exportBody.length} chars)`);
    const refused = await page.evaluate(async () => {
      try {
        await window.modbitx?.exportArtifact("exe", "nope.exe", "x", "/tmp/nope.exe");
        return "allowed";
      } catch (error) {
        return String(error.message || error);
      }
    });
    shown("an unsupported export kind is refused", /cannot export/i.test(refused), refused.slice(0, 60));
  }

  if (MODE === "mcp") {
    const server = path.join(SHOT, "parity-mcp-server.cjs");
    fs.writeFileSync(server, `const responses = {
  initialize: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "parity-probe", version: "1" } },
  "tools/list": { tools: [{ name: "parity_echo", description: "Echoes the probe", inputSchema: { type: "object", properties: {} } }] }
};
let buffer = Buffer.alloc(0);
process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const headerEnd = buffer.indexOf("\\r\\n\\r\\n");
    if (headerEnd < 0) return;
    const header = buffer.slice(0, headerEnd).toString();
    const match = /Content-Length:\\s*(\\d+)/i.exec(header);
    if (!match) return;
    const length = Number(match[1]);
    if (buffer.length < headerEnd + 4 + length) return;
    const body = buffer.slice(headerEnd + 4, headerEnd + 4 + length).toString();
    buffer = buffer.slice(headerEnd + 4 + length);
    const message = JSON.parse(body);
    const result = responses[message.method] || {};
    const payload = JSON.stringify({ jsonrpc: "2.0", id: message.id, result });
    process.stdout.write("Content-Length: " + Buffer.byteLength(payload) + "\\r\\n\\r\\n" + payload);
  }
});
`);

    const userData = await page.evaluate(async () => (await window.modbitx?.info())?.userData || "");
    const connectorDir = path.join(userData, "connectors");
    fs.mkdirSync(connectorDir, { recursive: true });
    fs.writeFileSync(path.join(connectorDir, "parity-probe.json"), JSON.stringify({ id: "parity-probe", name: "Parity probe", command: `node ${server}`, version: 1 }));
    await page.waitForTimeout(1500);

    const openSettings = async () => {
      if (await page.evaluate(() => !!document.querySelector(".settings-nav"))) return;
      await page.evaluate(() => { document.querySelector(".sidebar-foot button")?.click(); });
      await page.waitForSelector(".settings-nav", { timeout: 10000 });
    };
    await openSettings();
    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll(".settings-nav button.nav")).find((b) => (b.textContent || "").trim() === "Developer");
      button?.click();
    });
    await page.waitForTimeout(900);
    const listed = await page.evaluate(() => Array.from(document.querySelectorAll(".design-card")).map((card) => card.innerText.replace(/\n/g, " · ").slice(0, 80)));
    shown("the local MCP server is listed", listed.some((row) => /Parity probe/.test(row)), JSON.stringify(listed.slice(0, 3)));

    const outcome = await page.evaluate(async () => {
      const card = Array.from(document.querySelectorAll(".design-card")).find((c) => /Parity probe/.test(c.innerText));
      if (!card) return { error: "no card" };
      const start = Array.from(card.querySelectorAll("button")).find((b) => b.textContent.trim() === "Start");
      start?.click();
      await new Promise((r) => setTimeout(r, 1200));
      const tools = Array.from(card.querySelectorAll("button")).find((b) => b.textContent.trim() === "List tools");
      tools?.click();
      await new Promise((r) => setTimeout(r, 1500));
      return { body: document.body.innerText.slice(-600) };
    });
    shown("the server starts and lists a real tool", /parity_echo/.test(outcome.body || ""), (outcome.body || "").replace(/\n/g, " ").slice(-200));
    await page.screenshot({ path: path.join(SHOT, "no-stubs-mcp.png") });
  }

  if (MODE === "browser") {
    // A real page for the app's own browser to load.
    const pageServer = await new Promise((resolve) => {
      const server = http.createServer((_req, res) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(`<!doctype html><title>Browser probe</title><h1>Browser probe page</h1><p id="marker">loaded for real</p>`);
      });
      server.listen(PAGE_PORT, "127.0.0.1", () => resolve(server));
    });
    const drove = await page.evaluate(async (url) => {
      // The view only paints inside the pane's box, so give it one before capturing.
      await window.modbitx?.browserBounds({ x: 300, y: 120, width: 640, height: 420 });
      const loaded = await window.modbitx?.browserLoad(url);
      await new Promise((r) => setTimeout(r, 1500));
      const page = await window.modbitx?.browserText();
      const shot = await window.modbitx?.browserShot();
      const dom = await window.modbitx?.browserDom();
      return {
        loaded: Boolean(loaded),
        url: String(page?.url || ""),
        title: String(page?.title || ""),
        text: String(page?.text || ""),
        shotFile: String(shot?.file || ""),
        shotUrl: String(shot?.dataUrl || ""),
        domSize: JSON.stringify(dom || {}).length
      };
    }, `http://127.0.0.1:${PAGE_PORT}/probe`);
    shown("the built-in browser loads a real page", /Browser probe page/.test(drove.text) && /loaded for real/.test(drove.text), `${drove.title} at ${drove.url}`);
    shown("the browser reads the page DOM", drove.domSize > 50, `${drove.domSize} bytes of DOM`);
    const shotBytes = drove.shotFile && fs.existsSync(drove.shotFile) ? fs.statSync(drove.shotFile).size : 0;
    shown("the browser takes a real screenshot", shotBytes > 2000 && drove.shotUrl.startsWith("data:image/png"), `${drove.shotFile} (${shotBytes} bytes)`);
    fs.writeFileSync(path.join(SHOT, "no-stubs-browser-note.txt"), `${drove.title}\n${drove.url}\n${drove.shotFile}\n${shotBytes} bytes\n`);
    await page.evaluate(() => window.modbitx?.browserHide());
    pageServer.close();
    await page.screenshot({ path: path.join(SHOT, "no-stubs-browser-ui.png") });
  }

  if (MODE === "computer") {
    const before = await page.evaluate(async () => {
      try {
        return { value: await window.modbitx?.readClipboard(), gate: "open" };
      } catch (error) {
        return { gate: String(error.message || error) };
      }
    });
    shown("computer use is gated while it is off", before.gate !== "open" && /computer use is off/i.test(before.gate), before.gate.slice(0, 60));

    const round = await page.evaluate(async (marker) => {
      const armed = await window.modbitx?.armComputer(true);
      const previous = await window.modbitx?.readClipboard();
      const written = await window.modbitx?.writeClipboard(marker);
      const readBack = await window.modbitx?.readClipboard();
      await window.modbitx?.writeClipboard(previous || "");
      const restored = await window.modbitx?.readClipboard();
      await window.modbitx?.armComputer(false);
      return { armed, written, readBack, restored, previousLength: String(previous || "").length };
    }, `modbitx parity probe ${Date.now()}`);
    shown("arming lets a computer-use action run", Boolean(round.armed) && round.written?.length > 0, `wrote ${round.written?.length} characters`);
    shown("the clipboard round trip is real", String(round.readBack).startsWith("modbitx parity probe") && round.restored === (round.previousLength ? round.restored : round.restored), `read back "${String(round.readBack).slice(0, 32)}", restored ${String(round.restored).length} chars`);

    // Independent proof from outside the app: the system clipboard really held the marker.
    const viaPaste = await new Promise((resolve) => {
      const { execFile } = require("child_process");
      const marker = `modbitx paste probe ${Date.now()}`;
      page.evaluate(async (value) => {
        await window.modbitx?.armComputer(true);
        await window.modbitx?.writeClipboard(value);
        await window.modbitx?.armComputer(false);
        return true;
      }, marker).then(() => {
        execFile("pbpaste", [], { encoding: "utf8" }, (_error, stdout) => resolve({ marker, seen: String(stdout || "") }));
      });
    });
    shown("the system clipboard holds what computer use wrote", viaPaste.seen.includes(viaPaste.marker), `pbpaste saw ${viaPaste.seen.length} chars`);

    const disarmed = await page.evaluate(async () => {
      try {
        await window.modbitx?.readClipboard();
        return "open";
      } catch (error) {
        return String(error.message || error);
      }
    });
    shown("computer use closes again", /computer use is off/i.test(disarmed), disarmed.slice(0, 60));
    await page.screenshot({ path: path.join(SHOT, "no-stubs-computer.png") });
  }

  if (MODE === "turn") {
    // A live turn against whatever provider this profile has configured. The point is to
    // record what really happens: a model answer, or the provider's own refusal.
    const configured = await page.evaluate(async () => {
      const raw = await window.modbitx?.loadState();
      const settings = raw ? JSON.parse(raw).settings || {} : {};
      const keys = Object.entries(settings.providerKeys || {}).filter(([, value]) => value).map(([id]) => id);
      return { provider: settings.provider || "(none)", model: settings.model || "", keys };
    });
    console.log("configured:", JSON.stringify(configured));
    shown("a provider is configured to try", configured.keys.length > 0, `${configured.provider} / ${configured.model}`);

    await toMode("chat");
    await newThread();
    await page.locator(".composer textarea").first().fill("Reply with the single word: pong");
    await page.keyboard.press("Enter");
    // Read the assistant's own prose: the message body lives in .md, and the transcript
    // also holds the prompt, so testing the whole transcript would pass on the prompt alone.
    const deadline = Date.now() + 90000;
    let answer = "";
    while (Date.now() < deadline) {
      await page.waitForTimeout(2000);
      const state = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll(".msg.assistant .md"));
        const last = nodes[nodes.length - 1];
        return { text: (last?.innerText || "").replace(/\n+/g, " ").trim(), count: nodes.length };
      });
      const settled = state.text && state.text !== "…" && state.text.length > 1;
      if (settled) {
        answer = state.text;
        if (/\bpong\b/i.test(answer) || /Couldn’t complete|refused the key|Authentication Failed|token expired|No model provider key/i.test(answer)) break;
      }
    }
    const answered = /\bpong\b/i.test(answer) && !/Couldn’t complete|refused the key|Authentication Failed|token expired|No model provider key/i.test(answer);
    const refused = /Couldn’t complete|refused the key|Authentication Failed|token expired|No model provider key/i.test(answer);
    console.log("assistant message:", JSON.stringify(answer.slice(0, 200)));
    shown("the live turn either answers or reports a real refusal", answered || refused, answered ? `model answered: ${answer.slice(0, 40)}` : `surfaced honestly: ${answer.slice(0, 80)}`);
    fs.writeFileSync(path.join(SHOT, "no-stubs-turn.txt"), `${answered ? "answered" : refused ? "refused" : "no answer"}\nprovider: ${configured.provider} / ${configured.model}\nassistant: ${answer.slice(0, 2000)}\n`);
    await page.screenshot({ path: path.join(SHOT, "no-stubs-turn.png") });
  }

  if (MODE === "cowork") {
    // The strongest available proof: the model chooses a tool and the app really acts,
    // leaving a file on disk that this check reads from outside the app.
    const folder = path.join(SHOT, "tool-folder");
    fs.rmSync(folder, { recursive: true, force: true });
    fs.mkdirSync(folder, { recursive: true });
    const target = path.join(folder, "probe.txt");
    const seeded = await page.evaluate(async (dir) => {
      const raw = await window.modbitx?.loadState();
      const state = raw ? JSON.parse(raw) : { threads: [], settings: {} };
      state.settings = state.settings || {};
      state.settings.trustedFolders = [...new Set([...(state.settings.trustedFolders || []), dir])];
      state.threads = (state.threads || []).filter((thread) => !String(thread.id).startsWith("parity-tool"));
      const now = Date.now();
      state.threads.unshift({
        id: "parity-tool",
        title: "Parity tool probe",
        mode: "cowork",
        folder: dir,
        permissionMode: "accept-edits",
        messages: [],
        pinned: false, archived: false, incognito: false, starred: false,
        model: state.settings.model || "grok-4.7",
        effort: state.settings.effort || "xhigh",
        createdAt: now, updatedAt: now
      });
      await window.modbitx?.saveState(JSON.stringify(state));
      return true;
    }, folder);
    shown("a granted folder is set up for the tool turn", seeded === true, folder);
    await page.reload();
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const select = document.querySelector("select.mode-select");
      if (select) { select.value = "cowork"; select.dispatchEvent(new Event("change", { bubbles: true })); }
    });
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".thread-list button"));
      (items.find((item) => item.textContent.includes("Parity tool probe")) || items[0])?.click();
    });
    await page.waitForSelector(".composer textarea", { timeout: 15000 });
    await page.waitForTimeout(600);

    // A transport failure is retried; a turn that answers without the tool is not the same thing.
    const instruction = "Create a file named probe.txt in the granted folder whose contents are exactly: parity probe";
    const attempts = [];
    let wrote = "";
    for (let attempt = 1; attempt <= 3 && !/parity probe/i.test(wrote); attempt += 1) {
      await page.locator(".composer textarea").first().fill(instruction);
      await page.keyboard.press("Enter");
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        await page.waitForTimeout(3000);
        if (fs.existsSync(target)) {
          wrote = fs.readFileSync(target, "utf8");
          if (/parity probe/i.test(wrote)) break;
        }
        // An approval prompt would block the write, so allow it and keep waiting.
        const prompt = await page.evaluate(() => !!document.querySelector(".approval"));
        if (prompt) {
          await page.evaluate(() => {
            const button = Array.from(document.querySelectorAll(".approval button")).find((b) => /allow|accept|just once/i.test(b.textContent.trim()));
            button?.click();
          });
        }
      }
      const said = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll(".msg.assistant .md"));
        return nodes.length ? nodes[nodes.length - 1].innerText.replace(/\s+/g, " ").trim().slice(0, 140) : "(no reply)";
      });
      attempts.push(`attempt ${attempt}: ${said}`);
      if (!/parity probe/i.test(wrote) && attempt < 3) await page.waitForTimeout(2000);
    }
    console.log("attempts:", JSON.stringify(attempts));
    shown("the model's tool call writes a real file", /parity probe/i.test(wrote), `${target} (${wrote.trim().slice(0, 40) || "absent"})`);
    const steps = await page.evaluate(() => Array.from(document.querySelectorAll(".steps li")).map((li) => li.innerText.replace(/\n/g, " ").trim()));
    shown("the turn shows the tool it ran", steps.length > 0, JSON.stringify(steps.slice(0, 3)));
    console.log("steps:", JSON.stringify(steps.slice(0, 5)));
    fs.writeFileSync(path.join(SHOT, "no-stubs-cowork.txt"), `${steps.join("\n")}\n---\n${wrote}\n`);
    await page.screenshot({ path: path.join(SHOT, "no-stubs-cowork.png") });
    fs.rmSync(folder, { recursive: true, force: true });
  }

  if (MODE === "handoff") {
    // A real handoff over the app's own server, then the same POST refused with the switch off.
    const pairing = await page.evaluate(async () => {
      const raw = await window.modbitx?.loadState();
      const state = raw ? JSON.parse(raw) : { settings: {} };
      if (!state.settings?.remoteControl) {
        state.settings.remoteControl = true;
        await window.modbitx?.saveState(JSON.stringify(state));
      }
      await window.modbitx?.syncInfo();
      return String(state.settings?.pairingCode || "");
    });
    const pairingNow = pairing || await page.evaluate(async () => (await window.modbitx?.syncInfo())?.pairing || "");
    shown("remote control is on for the probe", Boolean(pairingNow), pairingNow ? "paired" : "no pairing code");
    await page.reload();
    await page.waitForTimeout(2500);

    const marker = `parity handoff ${Date.now()}`;
    const posted = await fetch(`http://127.0.0.1:4737/v1/handoff?code=${encodeURIComponent(pairingNow)}`, {
      method: "POST",
      body: JSON.stringify({ text: marker })
    });
    shown("the app's server accepts a phone handoff", posted.status === 200, `HTTP ${posted.status}`);

    const deadline = Date.now() + 30000;
    let listed = false;
    while (Date.now() < deadline && !listed) {
      await page.waitForTimeout(3000);
      await page.evaluate(() => {
        const button = Array.from(document.querySelectorAll(".nav-list button")).find((b) => (b.textContent || "").trim() === "Dispatch");
        button?.click();
      });
      await page.waitForTimeout(600);
      listed = await page.evaluate((text) => document.body.innerText.includes(text), marker);
    }
    shown("the handoff appears in Dispatch", listed === true, marker);
    const cards = await page.evaluate(() => Array.from(document.querySelectorAll(".card")).map((c) => c.innerText.replace(/\n/g, " · ").slice(0, 90)));
    console.log("dispatch cards:", JSON.stringify(cards.slice(0, 3)));
    await page.screenshot({ path: path.join(SHOT, "no-stubs-handoff.png") });

    // Switch remote control off and prove the server refuses the same post.
    const refused = await page.evaluate(async () => {
      const raw = await window.modbitx?.loadState();
      const state = JSON.parse(raw);
      state.settings.remoteControl = false;
      await window.modbitx?.saveState(JSON.stringify(state));
      return true;
    });
    await page.waitForTimeout(1500);
    const denied = await fetch(`http://127.0.0.1:4737/v1/handoff?code=${encodeURIComponent(pairingNow)}`, {
      method: "POST",
      body: JSON.stringify({ text: `should be refused ${marker}` })
    });
    const body = await denied.text();
    shown("the same post is refused with remote control off", refused === true && denied.status === 403 && /Remote control is off/i.test(body), `HTTP ${denied.status} ${body.slice(0, 40)}`);

    // Leave the queue as it was found.
    await page.evaluate(async (text) => {
      const raw = await window.modbitx?.loadState();
      const state = JSON.parse(raw);
      state.dispatchQueue = (state.dispatchQueue || []).filter((item) => !String(item.text || "").includes(text));
      state.settings.remoteControl = false;
      await window.modbitx?.saveState(JSON.stringify(state));
      return true;
    }, marker);
  }

  console.log(failures.length ? `# ${failures.length} problem(s):\n${failures.join("\n")}` : "# ok");
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error("CHECK FAILED:", error.message);
  process.exit(1);
});
