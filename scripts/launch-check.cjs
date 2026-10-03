/**
 * Asserts the app really launched: the shell renders with content, and a driven
 * interaction changes the DOM. Run against the launcher's window on CDP_PORT.
 *
 *   NODE_PATH=/opt/homebrew/lib/node_modules node scripts/launch-check.cjs
 */
const os = require("os");
const path = require("path");

const SHOT = process.env.SHOT || path.join(os.tmpdir(), "modbitx-parity-shots");
const PORT = process.env.CDP_PORT || "9222";
const TAG = process.env.TAG || "1";

const failures = [];
const shown = (name, ok, detail) => {
  if (!ok) failures.push(name);
  console.log(`${ok ? "pass" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

(async () => {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    console.error("This check needs Playwright on Node's path, for example NODE_PATH=/opt/homebrew/lib/node_modules.");
    process.exit(2);
  }
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find((p) => p.url().includes("5173")) || ctx.pages()[0];
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2500);

  // The app reopens on whatever screen it was left on, so open a thread first.
  await page.evaluate(() => {
    const create = Array.from(document.querySelectorAll("button")).find((b) => /^\+ New (chat|task|session)$/.test((b.textContent || "").trim()));
    if (create) create.click();
    else document.querySelector(".thread-list button")?.click();
  });
  await page.waitForSelector(".composer textarea", { timeout: 15000 });
  await page.waitForTimeout(600);

  const shell = await page.evaluate(() => ({
    title: document.title,
    sidebar: !!document.querySelector(".sidebar"),
    navItems: document.querySelectorAll(".nav-list button").length,
    modes: Array.from(document.querySelectorAll("select.mode-select option")).map((o) => o.value),
    transcript: (document.querySelector(".transcript")?.innerText || "").trim().length,
    composer: !!document.querySelector(".composer textarea"),
    body: document.body.innerText.trim().length
  }));
  shown("the window loads the app", shell.title.length > 0 && shell.body > 200, `${shell.title}, ${shell.body} chars`);
  shown("the sidebar renders its items", shell.sidebar && shell.navItems >= 6, `${shell.navItems} items`);
  shown("the thread surface renders", shell.transcript > 0 && shell.composer, `${shell.transcript} chars of transcript`);
  shown("the mode switch is present", shell.modes.join() === "chat,cowork,code", shell.modes.join());
  await page.screenshot({ path: path.join(SHOT, `launch-${TAG}.png`) });

  const before = await page.evaluate(() => document.querySelector(".kicker")?.textContent || "");
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll(".nav-list button")).find((b) => (b.textContent || "").trim() === "Projects");
    button?.click();
  });
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({
    kicker: document.querySelector(".kicker")?.textContent || "",
    h1: document.querySelector("h1")?.textContent || "",
    body: document.body.innerText.trim().length
  }));
  shown("a driven interaction changes the surface", after.kicker === "Projects" && after.kicker !== before, `${before || "(none)"} → ${after.kicker}`);
  await page.screenshot({ path: path.join(SHOT, `launch-${TAG}-after.png`) });

  console.log(failures.length ? `# ${failures.length} problem(s):\n${failures.join("\n")}` : "# ok");
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error("LAUNCH CHECK FAILED:", error.message);
  process.exit(1);
});
