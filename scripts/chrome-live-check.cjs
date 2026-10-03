/**
 * Loads the shipped Chrome extension into the Mac's real Google Chrome and runs the
 * queued page read through it, then checks that the result lands in Dispatch.
 *
 * Preconditions: the Modbitx app is running with its renderer on the Chrome DevTools
 * protocol at 127.0.0.1:9222, and Settings -> Chrome has the handoff switch on.
 * Playwright is not a project dependency, so run it with NODE_PATH pointed at a global
 * install, for example NODE_PATH=/opt/homebrew/lib/node_modules node scripts/chrome-live-check.cjs.
 *
 * Two Chrome facts this script has to work around: branded Chrome 142+ ignores
 * --load-extension, so the extension is installed with the CDP Extensions.loadUnpacked
 * call under --enable-unsafe-extension-debugging; and extension pages are served over
 * Chrome's own debugging port, so the popup is driven by raw CDP instead of Playwright.
 * Granting one site still needs a person to accept Chrome's permission prompt, so the
 * read reports Chrome's refusal until that grant exists.
 */
const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CHROME_APP = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Loaded lazily so the script states its precondition instead of failing on require. */
function playwright() {
  try {
    return require("playwright");
  } catch {
    console.error("This check needs Playwright on Node's path, for example NODE_PATH=/opt/homebrew/lib/node_modules.");
    process.exit(2);
  }
}
const chromium = playwright().chromium;

const SHOT = process.env.SHOT;
const steps = [];
const record = (name, ok, detail) => {
  steps.push({ name, ok });
  console.log(`${ok ? "pass" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGE_PORT = 8081;
function startPage() {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end("<!doctype html><title>Chrome Live Docs</title><h1>Chrome Live Docs</h1><p>Body typed into the live Chrome page</p>");
    });
    server.listen(PAGE_PORT, "127.0.0.1", () => resolve(server));
  });
}

/** Raw CDP over the port Chrome exposes, for targets Playwright will not attach to. */
async function cdpClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error(`cannot open ${webSocketDebuggerUrl}`)), { once: true });
  });
  let next = 1;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(`${message.error.message}`));
    else entry.resolve(message.result);
  });
  return {
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const id = next++;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    }),
    close: () => socket.close()
  };
}

const evaluate = async (client, expression) => {
  const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + " " + (result.exceptionDetails.exception?.description || ""));
  return result.result.value;
};

(async () => {
  const pageServer = await startPage();
  try {
    await fetch("http://127.0.0.1:9222/json/version");
  } catch {
    console.error("Start the app first: vite plus electron . --remote-debugging-port=9222.");
    pageServer.close();
    process.exit(2);
  }
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const ctx = browser.contexts()[0];
  // The main window: skip viewer popouts and probe pages.
  const app = ctx.pages().find((p) => p.url().includes("5173") && !p.url().includes("?")) || ctx.pages().find((p) => p.url().includes("5173")) || ctx.pages()[0];
  await app.waitForLoadState("domcontentloaded");
  await app.waitForTimeout(1500);

  const settingsTo = async (label) => {
    if (!(await app.evaluate(() => !!document.querySelector(".settings-nav")))) {
      await app.evaluate(() => {
        const chip = Array.from(document.querySelectorAll("button")).find((b) => /Personal/.test(b.textContent || ""));
        chip?.click();
      });
      await app.waitForSelector(".settings-nav");
    }
    await app.evaluate((name) => {
      const button = Array.from(document.querySelectorAll(".settings-nav button.nav")).find((b) => (b.textContent || "").trim() === name);
      button?.click();
    }, label);
    await app.waitForTimeout(400);
  };
  const dispatchCards = () => app.evaluate(() => Array.from(document.querySelectorAll(".card")).map((c) => c.innerText.replace(/\n/g, " | ")));

  await settingsTo("Chrome");
  const control = app.locator('button[role="switch"][aria-label="Allow the Chrome extension to hand work to this Mac"]');
  if ((await control.getAttribute("aria-checked")) !== "true") {
    await control.click();
    await app.waitForTimeout(400);
  }
  await app.getByRole("button", { name: "Show link", exact: true }).click();
  await app.waitForTimeout(500);
  const link = await app.evaluate(() => document.querySelector(".settings-note")?.textContent || "");
  const pairing = (link.match(/code=([^&]+)/) || [])[1] || "";
  record("the app exposes a pairing code", !!pairing, link);

  const extensionPath = path.join(ROOT, "extensions", "chrome");
  const profile = path.join(process.env.TMPDIR.replace(/\/$/, ""), "modbitx-chrome-live");
  fs.rmSync(profile, { recursive: true, force: true });
  const CHROME_PORT = 9333;
  if (!fs.existsSync(CHROME_APP)) {
    console.error(`Google Chrome is not at ${CHROME_APP}.`);
    process.exit(2);
  }
  const chromeApp = CHROME_APP;
  const child = spawn(chromeApp, [
    `--remote-debugging-port=${CHROME_PORT}`,
    `--user-data-dir=${profile}`,
    "--enable-unsafe-extension-debugging",
    "--no-first-run",
    "--no-default-browser-check"
  ], { stdio: "ignore", detached: false });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const version = await (await fetch(`http://127.0.0.1:${CHROME_PORT}/json/version`)).json();
      if (version.webSocketDebuggerUrl) break;
    } catch { /* not up yet */ }
    await wait(250);
  }
  const port = String(CHROME_PORT);
  const listTargets = async () => JSON.parse(await (await fetch(`http://127.0.0.1:${port}/json/list`)).text());
  const attachTo = async (match) => {
    const targets = await listTargets();
    const target = targets.find(match);
    if (!target) return null;
    return { client: await cdpClient(target.webSocketDebuggerUrl), target };
  };
  const browserClient = await cdpClient((await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl);
  const { id } = await browserClient.send("Extensions.loadUnpacked", { path: extensionPath });
  record("real Chrome loads the shipped extension", !!id, id);
  await wait(1500);

  await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`http://127.0.0.1:${PAGE_PORT}/guide`)}`, { method: "PUT" });
  await wait(1200);

  // The popup is a real extension context, so it can seed storage and raise an alarm.
  await fetch(`http://127.0.0.1:${port}/json/new?chrome-extension://${id}/popup.html`, { method: "PUT" });
  await wait(1500);
  const popup = await attachTo((t) => t.url === `chrome-extension://${id}/popup.html`);
  record("the extension popup opens in Chrome", !!popup, popup?.target.url);
  if (!popup) throw new Error("popup target missing");

  const seeded = await evaluate(popup.client, `chrome.storage.local.set({ code: ${JSON.stringify(pairing)} }).then(() => chrome.runtime.id)`);
  record("the pairing code is stored in Chrome storage", typeof seeded === "string", String(seeded));
  const stored = await evaluate(popup.client, `chrome.storage.local.get("code").then((v) => v.code)`);
  record("Chrome reads the code back", stored === pairing, String(stored));

  const popupTabs = await evaluate(popup.client, `chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => tabs.map((t) => (t.url || "").slice(0, 40)))`);
  console.log("popup sees active tab:", JSON.stringify(popupTabs));

  const reports = [];
  await app.getByRole("button", { name: "Ask Chrome", exact: true }).click();
  await app.waitForTimeout(400);
  const raised = await evaluate(popup.client, `chrome.alarms.create("modbitx-live-check", { when: Date.now() + 300 }).then(async () => (await chrome.alarms.getAll()).map((a) => a.name))`);
  record("an alarm is scheduled in real Chrome", Array.isArray(raised) && raised.includes("modbitx-live-check"), JSON.stringify(raised));

  await wait(3000);
  const worker = await attachTo((t) => t.type === "service_worker" && t.url.includes(id));
  record("the shipped worker starts on the alarm", !!worker, worker?.target.url);
  if (worker) {
    const info = await evaluate(worker.client, `({ hasAlarms: typeof chrome.alarms === "object", hasPoll: typeof poll === "function" })`);
    record("the worker exposes the shipped poll", info.hasPoll === true, JSON.stringify(info));

    // Make the real web page the active tab, then look at what the shipped query and
    // injection do from the worker itself.
    const pageTarget = (await listTargets()).find((t) => t.url === `http://127.0.0.1:${PAGE_PORT}/guide`);
    if (pageTarget) {
      await browserClient.send("Target.activateTarget", { targetId: pageTarget.id });
      await wait(800);
    }
    const probe = await evaluate(worker.client, `(async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      const seen = tab ? String(tab.url) : "no tab";
      let outcome = "no tab";
      if (tab) {
        try {
          const result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => ({ title: document.title, text: document.body.innerText }) });
          outcome = "injected " + JSON.stringify(result[0]?.result);
        } catch (error) {
          outcome = "refused: " + String(error.message).slice(0, 120);
        }
      }
      return { tabId: tab?.id, seen, outcome };
    })()`);
    console.log("worker probe:", JSON.stringify(probe));
    record("the worker finds a tab to read", typeof probe.tabId === "number", `tabId=${probe.tabId}`);
    record("tab.url stays hidden without the tabs permission", probe.seen === "undefined", `tab.url=${probe.seen}`);
    record("injection waits for the site grant", /refused:/.test(probe.outcome), probe.outcome);

    const direct = await evaluate(worker.client, `poll().then(() => "poll ran")`);
    console.log("direct poll:", String(direct));

    // Phase two: point the active tab at an origin the manifest already grants
    // (the local server), so the same shipped code should return real page text.
    const phoneUrl = `http://127.0.0.1:4737/phone?code=${encodeURIComponent(pairing)}`;
    await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(phoneUrl)}`, { method: "PUT" });
    await wait(1200);
    const phoneTarget = (await listTargets()).find((t) => t.url.startsWith("http://127.0.0.1:4737/phone"));
    record("a granted origin is open in Chrome", !!phoneTarget, phoneTarget?.url?.slice(0, 60));
    if (phoneTarget) {
      await browserClient.send("Target.activateTarget", { targetId: phoneTarget.id });
      await wait(700);
      await settingsTo("Chrome");
      await app.getByRole("button", { name: "Ask Chrome", exact: true }).click();
      await wait(400);
      const raisedAgain = await evaluate(worker.client, `chrome.alarms.create("modbitx-live-read", { when: Date.now() + 200 }).then(() => "raised")`);
      record("a second read is queued and alarmed", raisedAgain === "raised");
      await wait(3500);
      await app.evaluate(() => {
        const button = Array.from(document.querySelectorAll(".nav-list button")).find((b) => (b.textContent || "").trim() === "Dispatch");
        button?.click();
      });
      await app.waitForTimeout(800);
      const readCards = await dispatchCards();
      const readCard = readCards.find((card) => card.includes("Page from Chrome:")) || "";
      record("the granted origin returns real page text", /Page from Chrome: Modbitx/.test(readCard) && /Hand off a task/.test(readCard) && /127\.0\.0\.1:4737\/phone/.test(readCard), readCard.slice(0, 200));
      await app.screenshot({ path: `${SHOT}/93-chrome-real-text.png` });
    }
  }
  await app.waitForTimeout(4000);

  await app.evaluate(() => {
    const button = Array.from(document.querySelectorAll(".nav-list button")).find((b) => (b.textContent || "").trim() === "Dispatch");
    button?.click();
  });
  await app.waitForTimeout(800);
  const cards = await dispatchCards();
  console.log("dispatch:", JSON.stringify(cards.map((c) => c.slice(0, 150))));
  const chromeCard = cards.find((card) => card.includes("From Chrome")) || "";
  record("the real Chrome run lands in Dispatch as Chrome", !!chromeCard, chromeCard.slice(0, 180));
  await app.screenshot({ path: `${SHOT}/92-chrome-real-dispatch.png` });

  browserClient.close();
  child.kill();
  pageServer.close();
  const failed = steps.filter((s) => !s.ok).length;
  console.log("SUMMARY", JSON.stringify({ failed, total: steps.length, reports: reports.length }));
  process.exit(failed ? 1 : 0);
})().catch((error) => {
  console.error("SCRIPT FAILED:", error.message);
  process.exit(1);
});
