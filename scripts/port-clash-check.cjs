/**
 * The local server port is a single resource, and a second copy of the app must not die
 * on it. This starts two instances, proves the second one stays up and says why, then
 * frees the port and proves the second one takes it over.
 *
 *   NODE_PATH=/opt/homebrew/lib/node_modules node scripts/port-clash-check.cjs
 *
 * Needs Playwright on NODE_PATH. Isolated profiles are used, so no user data is touched.
 */
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SHOT = process.env.SHOT || path.join(os.tmpdir(), "modbitx-port-clash");
fs.mkdirSync(SHOT, { recursive: true });

const failures = [];
const shown = (name, ok, detail) => {
  if (!ok) failures.push(name);
  console.log(`${ok ? "pass" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const listening = async (port) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/v1/status`, { signal: AbortSignal.timeout(1500) });
    return response.status > 0;
  } catch {
    return false;
  }
};
const cdpUp = async (port) => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
};

(async () => {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    console.error("This check needs Playwright on Node's path, for example NODE_PATH=/opt/homebrew/lib/node_modules.");
    process.exit(2);
  }

  for (const port of [4737, 5173, 9222]) {
    try {
      execFileSync("bash", ["-lc", `lsof -ti tcp:${port} | xargs -r kill`], { stdio: "ignore" });
    } catch { /* nothing to kill */ }
  }
  await wait(4000);

  const vite = spawn(path.join(ROOT, "node_modules", ".bin", "vite"), [], { cwd: ROOT, stdio: "ignore", detached: false });
  const profileA = path.join(SHOT, "profile-a");
  const profileB = path.join(SHOT, "profile-b");
  for (const dir of [profileA, profileB]) fs.rmSync(dir, { recursive: true, force: true });
  await wait(5000);

  const first = spawn(path.join(ROOT, "node_modules", ".bin", "electron"), [".", "--user-data-dir", profileA], { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 30 && !(await listening(4737)); i += 1) await wait(1000);
  shown("the first copy owns the local server port", await listening(4737), "127.0.0.1:4737 answers");

  const second = spawn(path.join(ROOT, "node_modules", ".bin", "electron"), [".", "--remote-debugging-port=9222", "--user-data-dir", profileB], { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 30 && !(await cdpUp(9222)); i += 1) await wait(1000);
  shown("the second copy starts and is reachable", await cdpUp(9222), "DevTools on 9222");

  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find((p) => p.url().includes("5173")) || ctx.pages()[0];
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(4000);

  const reported = await page.evaluate(async () => {
    const info = await window.modbitx?.syncInfo();
    return { up: info?.serverUp, note: info?.serverNote || "" };
  });
  shown("the second copy stays up instead of crashing", await cdpUp(9222), "still reachable after the clash");
  shown("the second copy reports the port is taken", reported.up === false && /4737/.test(reported.note), reported.note.slice(0, 90));

  await page.evaluate(() => { document.querySelector(".sidebar-foot button")?.click(); });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll(".settings-nav button.nav")).find((b) => (b.textContent || "").trim() === "Chrome");
    button?.click();
  });
  await page.waitForTimeout(800);
  const shownInUi = await page.evaluate(() => document.querySelector("[data-server-note]")?.textContent || "");
  shown("the settings screen shows the reason", /4737/.test(shownInUi), shownInUi.slice(0, 90));
  await page.screenshot({ path: path.join(SHOT, "port-clash.png") });

  first.kill();
  for (const port of [4737]) {
    try { execFileSync("bash", ["-lc", `lsof -ti tcp:${port} | xargs -r kill -9`], { stdio: "ignore" }); } catch { /* already gone */ }
  }
  let tookOver = false;
  for (let i = 0; i < 24 && !tookOver; i += 1) {
    await wait(2500);
    const info = await page.evaluate(async () => {
      const value = await window.modbitx?.syncInfo();
      return { up: value?.serverUp, note: value?.serverNote || "" };
    });
    tookOver = info.up === true;
  }
  shown("it takes the port over once the other copy quits", tookOver, tookOver ? "serverUp true" : "still waiting");

  // Kill only the children this script started: a port sweep here can signal this
  // process too, which would replace the real exit code with a signal.
  second.kill();
  vite.kill();
  first.kill();
  await wait(1500);
  fs.rmSync(profileA, { recursive: true, force: true });
  fs.rmSync(profileB, { recursive: true, force: true });

  console.log(failures.length ? `port clash has ${failures.length} problem(s):\n${failures.join("\n")}` : "port clash ok");
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error("CHECK FAILED:", error.message);
  process.exit(1);
});
