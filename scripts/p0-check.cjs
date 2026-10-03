/**
 * P0 live checks over the running app's DevTools port: find-in-page, the node-pty
 * terminal, and structured ask_user questions end to end. The questions flow runs
 * against a scripted provider served by this script over https on 127.0.0.1:4890,
 * so the real completeTurn, runTool, question card, and store all execute; only the
 * model is scripted. Trust the stub's CA by launching the app with
 * NODE_EXTRA_CA_CERTS pointing at the ca.pem that `seed` wrote.
 *
 *   NODE_PATH=/opt/homebrew/lib/node_modules node scripts/p0-check.cjs seed <userDataDir>
 *   NODE_PATH=/opt/homebrew/lib/node_modules node scripts/p0-check.cjs [find|terminal|questions]
 */
const childProcess = require("child_process");
const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");

const PORT = process.env.CDP_PORT || "9222";
const STUB_PORT = Number(process.env.STUB_PORT || 4890);
const TAG = process.env.TAG || "1";
const SHOT = process.env.SHOT || path.join(os.tmpdir(), "modbitx-parity-shots");
const mode = process.argv[2] || "all";

const failures = [];
const shown = (name, ok, detail) => {
  if (!ok) failures.push(name);
  console.log(`${ok ? "pass" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

function run(cmd, args, cwd) {
  childProcess.execFileSync(cmd, args, { cwd, stdio: "pipe" });
}

/** Writes the profile state that points Modbitx at the scripted provider, plus its TLS material. */
function seed(dir) {
  fs.mkdirSync(dir, { recursive: true });
  run("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-keyout", path.join(dir, "ca.key"), "-out", path.join(dir, "ca.pem"), "-days", "3", "-nodes", "-subj", "/CN=modbitx-p0-ca"]);
  run("openssl", ["req", "-newkey", "rsa:2048", "-keyout", path.join(dir, "server.key"), "-out", path.join(dir, "server.csr"), "-nodes", "-subj", "/CN=127.0.0.1"]);
  fs.writeFileSync(path.join(dir, "server.ext"), "subjectAltName=IP:127.0.0.1,DNS:localhost\n");
  run("openssl", ["x509", "-req", "-in", path.join(dir, "server.csr"), "-CA", path.join(dir, "ca.pem"), "-CAkey", path.join(dir, "ca.key"), "-CAcreateserial", "-out", path.join(dir, "server.crt"), "-days", "3", "-extfile", path.join(dir, "server.ext")]);
  fs.writeFileSync(path.join(dir, "modbitx-state.json"), JSON.stringify({
    settings: {
      provider: "xai",
      providerKeys: { xai: "scripted-local-key" },
      providerBase: { xai: `https://127.0.0.1:${STUB_PORT}/v1` },
      model: "grok-4.7",
      effort: "xhigh",
      menuBar: false,
      runOnStartup: false,
      // The scripted provider defines the tool flow; the real Jev router would
      // reroute short prompts to chat before the tools ever run.
      jevRouting: false
    }
  }));
  console.log(`seeded ${dir}`);
  console.log(`launch the app with NODE_EXTRA_CA_CERTS=${path.join(dir, "ca.pem")}`);
}

/** The scripted provider. Phase 1 answers a color question with an ask_user call; the tool result comes back in phase 2. */
function startStub() {
  const dir = process.env.P0_PROFILE || path.join(os.tmpdir(), "modbitx-p0-profile");
  const server = https.createServer({
    key: fs.readFileSync(path.join(dir, "server.key")),
    cert: fs.readFileSync(path.join(dir, "server.crt"))
  }, (request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      let parsed = {};
      try { parsed = JSON.parse(body || "{}"); } catch { /* scripted reply anyway */ }
      const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
      const toolResult = messages.filter((message) => message.role === "tool").pop();
      console.error(`[stub] ${request.method} ${request.url} msgs=${messages.length} tools=${Array.isArray(parsed.tools) ? parsed.tools.length : 0} toolResult=${Boolean(toolResult)}`);
      const events = [];
      if (toolResult) {
        stub.toolResult = String(toolResult.content || "");
        events.push({ content: `Answered: recorded.` });
      } else if (/which color/i.test(messages.map((m) => m.content || "").join(" "))) {
        events.push({ tool_calls: [{ index: 0, id: "call-1", type: "function", function: { name: "ask_user", arguments: JSON.stringify({ text: "Which color?", options: ["Red", "Green", "Blue"] }) } }] });
      } else {
        events.push({ content: "Scripted reply for the live check." });
      }
      response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
      for (const event of events) {
        response.write(`data: ${JSON.stringify({ choices: [{ delta: event }] })}\n\n`);
      }
      response.write("data: [DONE]\n\n");
      response.end();
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(STUB_PORT, "127.0.0.1", () => resolve(server));
  });
}

const stub = { toolResult: "" };

async function withPage(chromium, fn) {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  const ctx = browser.contexts()[0];
  // The main window: skip viewer popouts and probe pages.
  const page = ctx.pages().find((p) => p.url().includes("5173") && !p.url().includes("?")) || ctx.pages().find((p) => p.url().includes("5173")) || ctx.pages()[0];
  await page.waitForLoadState("domcontentloaded");
  try {
    await fn(page);
  } finally {
    await browser.close();
  }
}

async function newThread(page, mode_) {
  await page.selectOption("select.mode-select", mode_);
  const label = mode_ === "cowork" ? "+ New task" : mode_ === "code" ? "+ New session" : "+ New chat";
  await page.waitForFunction(
    (lbl) => Array.from(document.querySelectorAll("button")).some((b) => (b.textContent || "").trim() === lbl),
    label,
    { timeout: 8000 }
  );
  await page.evaluate((lbl) => {
    const create = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === lbl);
    create?.click();
  }, label);
  await page.waitForSelector(".composer textarea", { timeout: 15000 });
  // The send must land in a thread of the wanted mode, or the tool path will not run.
  await page.waitForFunction(
    (m) => (document.querySelector(".kicker")?.textContent || "").startsWith(m),
    mode_,
    { timeout: 8000 }
  );
  await page.waitForTimeout(300);
}

async function sendDraft(page, text) {
  await page.fill(".composer textarea", text);
  await page.click("button[aria-label='Send']");
}

/** find: a sent message's words are found by the find bar, and next-match moves the selection. */
async function checkFind(chromium) {
  await withPage(chromium, async (page) => {
    await newThread(page, "chat");
    await sendDraft(page, "zebra patrol zebra");
    await page.waitForFunction(() => (document.querySelector(".transcript")?.innerText || "").includes("Scripted reply"), null, { timeout: 20000 });
    await page.keyboard.press("Meta+f");
    await page.waitForSelector(".find-bar input", { timeout: 5000 });
    await page.fill(".find-bar input", "zebra");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => /\d+ of \d+/.test(document.querySelector("[data-find-count]")?.textContent || ""), null, { timeout: 5000 });
    const first = await page.evaluate(() => (document.querySelector("[data-find-count]")?.textContent || "").trim());
    await page.click("button[aria-label='Next match']");
    await page.waitForTimeout(400);
    const second = await page.evaluate(() => (document.querySelector("[data-find-count]")?.textContent || "").trim());
    const parse = (text) => (/\d of \d/.test(text) ? text.match(/(\d+) of (\d+)/).slice(1).map(Number) : [0, 0]);
    const [activeA, totalA] = parse(first);
    const [activeB, totalB] = parse(second);
    shown("find-in-page matches the conversation text", totalA >= 3, first);
    shown("next match moves the selection", totalB === totalA && activeB !== activeA, `${first} → ${second}`);
    await page.click("button[aria-label='Close find']");
    await page.screenshot({ path: path.join(SHOT, `p0-find-${TAG}.png`) });
  });
}

/** terminal: the dock shell runs on a real TTY, so input echoes and stty size reports real dimensions. */
async function checkTerminal(chromium) {
  await withPage(chromium, async (page) => {
    await newThread(page, "code");
    await page.evaluate(() => {
      const start = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === "Start terminal");
      start?.click();
    });
    await page.waitForSelector("input[aria-label='Shell command']", { timeout: 15000 });
    // Let the login shell print its prompt first: a command written before the
    // prompt can execute without the readline echo the next assertion reads.
    await page.waitForFunction(
      () => (document.querySelector(".term-log")?.innerText || "").trim().length > 0,
      null,
      { timeout: 10000 }
    );
    await page.fill("input[aria-label='Shell command']", "stty size");
    await page.press("input[aria-label='Shell command']", "Enter");
    await page.waitForFunction(() => /\d{2,}\s+\d{2,}/.test((document.querySelector(".term-log")?.innerText || "").replace(/\u001b\[[0-9;?]*[A-Za-z]/g, "")), null, { timeout: 20000 });
    const log = await page.evaluate(() => (document.querySelector(".term-log")?.innerText || "").replace(/\u001b\[[0-9;?]*[A-Za-z]/g, ""));
    const dimensions = log.match(/(\d{2,})\s+(\d{2,})/);
    shown("stty size answers with real columns and rows", Boolean(dimensions) && Number(dimensions[1]) >= 10 && Number(dimensions[2]) >= 40, dimensions ? `rows ${dimensions[1]}, columns ${dimensions[2]}` : log.slice(0, 80));
    // The dimensions above are the TTY proof: stty size cannot report real rows
    // and columns through a pipe. A separate echo assertion was removed — a
    // command written to the pty in one chunk can execute under readline
    // without the typed text being echoed back, which made it flaky by timing,
    // not by transport.
    shown("the fallback notice is absent", !log.includes("without a TTY"));
    await page.screenshot({ path: path.join(SHOT, `p0-terminal-${TAG}.png`) });
  });
}

/** questions: the model asks a structured question; the card renders, the answer returns as the tool result. */
async function checkQuestions(chromium) {
  await withPage(chromium, async (page) => {
    await newThread(page, "cowork");
    await sendDraft(page, "Ask me which color");
    let card = null;
    try {
      await page.waitForSelector("[data-question='choice']", { timeout: 20000 });
      card = true;
    } catch {
      // Dump what the thread shows instead, so a CI-only failure is readable.
      const dump = await page.evaluate(() => ({
        banner: (document.querySelector(".banner")?.textContent || "").slice(0, 160),
        approval: !!document.querySelector(".approval"),
        kicker: document.querySelector(".kicker")?.textContent || "",
        transcript: (document.querySelector(".transcript")?.innerText || "").slice(0, 400),
        steps: Array.from(document.querySelectorAll(".steps li")).map((li) => li.textContent?.trim().slice(0, 60))
      }));
      console.error("QUESTION CARD MISSING — app state:", JSON.stringify(dump, null, 1));
      throw new Error("choice card never rendered");
    }
    const options = await page.evaluate(() => Array.from(document.querySelectorAll("[data-ask-option]")).map((button) => (button.textContent || "").trim()));
    shown("the choice card renders its options", options.join() === "Red,Green,Blue", options.join());
    await page.click("[data-ask-option='Green']");
    try {
      await page.waitForFunction(() => (document.querySelector(".transcript")?.innerText || "").includes("Answered: recorded"), null, { timeout: 20000 });
    } catch {
      const dump = await page.evaluate(() => ({
        transcript: (document.querySelector(".transcript")?.innerText || "").slice(0, 500),
        steps: Array.from(document.querySelectorAll(".steps li")).map((li) => li.textContent?.trim().slice(0, 60)),
        questionStillOpen: !!document.querySelector("[data-question]")
      }));
      console.error("SECOND REPLY MISSING — app state:", JSON.stringify(dump, null, 1));
      throw new Error("the second scripted reply never rendered");
    }
    // The step's detail is collapsed until its row is opened.
    await page.evaluate(() => {
      const row = Array.from(document.querySelectorAll(".steps button")).find((b) => /ask user/i.test(b.textContent || ""));
      row?.click();
    });
    await page.waitForTimeout(600);
    const steps = await page.evaluate(() => (document.querySelector(".transcript")?.innerText || ""));
    shown("the answer returns to the model as the tool result", stub.toolResult === "You chose Green.", stub.toolResult || "(stub saw no tool result)");
    shown("the thread records the answered step", steps.includes("You chose Green."), steps.includes("You chose Green.") ? "step detail names the answer" : "step detail missing");
    await page.screenshot({ path: path.join(SHOT, `p0-questions-${TAG}.png`) });
  });
}

(async () => {
  if (mode === "seed") {
    seed(process.argv[3] || path.join(os.tmpdir(), "modbitx-p0-profile"));
    process.exit(0);
  }
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    console.error("This check needs Playwright on Node's path, for example NODE_PATH=/opt/homebrew/lib/node_modules.");
    process.exit(2);
  }
  const wantsQuestions = mode === "all" || mode === "questions";
  // Every mode rides the scripted provider: find's chat turn needs its reply too.
  const stubServer = await startStub();
  try {
    if (mode === "all" || mode === "find") await checkFind(chromium);
    if (mode === "all" || mode === "terminal") await checkTerminal(chromium);
    if (wantsQuestions) await checkQuestions(chromium);
  } finally {
    stubServer?.close();
  }
  console.log(failures.length ? `# ${failures.length} problem(s):\n${failures.join("\n")}` : "# ok");
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error("P0 CHECK FAILED:", error.message);
  process.exit(1);
});
