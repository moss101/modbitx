/**
 * Asserts the live computed styles against the CDS design tokens.
 *
 *   env -u ELECTRON_RUN_AS_NODE npx electron . --remote-debugging-port=9222 --user-data-dir=/tmp/modbitx-cdp &
 *   CDP_PORT=9222 node scripts/design-check.cjs
 *
 * Reads computed styles over CDP in both themes and both densities and exits
 * nonzero when any token outcome drifts from the recorded value.
 */
const { chromium } = require("playwright");

const PORT = process.env.CDP_PORT || "9222";
const failures = [];
const expect = (name, cond, detail) => {
  if (!cond) failures.push(`${name}${detail ? ` (${detail})` : ""}`);
  console.log(`${cond ? "pass" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

(async () => {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  // The main window: skip viewer popouts and probe pages.
  const page = browser.contexts()[0].pages().find((p) => p.url().includes("5173") && !p.url().includes("?")) || browser.contexts()[0].pages().find((p) => p.url().includes("5173")) || browser.contexts()[0].pages()[0];
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);

  // Land on a fresh chat thread, wherever the saved state left the window.
  await page.evaluate(() => {
    const select = document.querySelector("select.mode-select");
    if (select) { select.value = "chat"; select.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const create = Array.from(document.querySelectorAll("button")).find((b) => /^\+ New chat$/.test((b.textContent || "").trim()));
    if (create) create.click();
    else document.querySelector(".thread-list button")?.click();
  });
  await page.waitForSelector(".composer textarea", { timeout: 15000 });
  await page.waitForTimeout(600);

  const root = await page.evaluate(() => ({
    light: getComputedStyle(document.documentElement).getPropertyValue("--cds-page-bg").trim(),
    gray10: getComputedStyle(document.documentElement).getPropertyValue("--cds-gray-10").trim(),
    elevation: getComputedStyle(document.documentElement).getPropertyValue("--elevation-composer").trim()
  }));
  expect("the light page is CDS gray-10 #fcfcfb", /fcfcfb|252,\s*252,\s*251/i.test(root.light), root.light);
  expect("gray-10 ships from the ramp", root.gray10.includes("fcfcfb"), root.gray10);
  expect("the composer elevation is layered", /rgba\(/.test(root.elevation), root.elevation.slice(0, 50));

  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.waitForTimeout(300);
  const darkRoot = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--cds-page-bg").trim());
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
  expect("the dark page is #151515", /151515|21,\s*21,\s*21/.test(darkRoot), darkRoot);

  const metrics = await page.evaluate(() => {
    const cs = (sel, prop) => { const el = document.querySelector(sel); return el ? String(getComputedStyle(el)[prop]) : ""; };
    return {
      sidebar: cs(".sidebar", "width"),
      hairline: cs(".sidebar", "border-right-width"),
      body: getComputedStyle(document.body).fontSize,
      heroWeight: cs(".hero h2", "fontWeight"),
      heroFamily: cs(".hero h2", "fontFamily"),
      gutter: cs(".transcript", "padding-left"),
      composerRadius: cs(".composer", "border-radius"),
      composerMin: cs(".composer textarea", "min-height"),
      composerFont: cs(".composer textarea", "fontSize")
    };
  });
  expect("sidebar is 288px", metrics.sidebar === "288px", metrics.sidebar);
  // The authored rule is 0.5px; a 1x (non-Retina) display rounds the computed
  // value up to 1px, so both renderings of the same hairline pass.
  expect("sidebar edge is a hairline", metrics.hairline === "0.5px" || metrics.hairline === "1px", metrics.hairline);
  const body = parseFloat(metrics.body);
  expect("UI body is ~13.2px", body >= 12.8 && body <= 13.6, metrics.body);
  expect("greeting weight is 400", metrics.heroWeight === "400", metrics.heroWeight);
  expect("greeting is the serif", /Newsreader|serif/i.test(metrics.heroFamily), metrics.heroFamily.slice(0, 24));
  expect("transcript gutters are 32px", metrics.gutter === "32px", metrics.gutter);
  expect("composer radius is 14px", metrics.composerRadius === "14px", metrics.composerRadius);
  expect("composer minimum is two lines", parseFloat(metrics.composerMin) >= 46, metrics.composerMin);
  const input = parseFloat(metrics.composerFont);
  expect("composer input is 15px", input >= 14.5 && input <= 15.5, metrics.composerFont);

  await page.evaluate(() => { document.documentElement.dataset.density = "compact"; });
  await page.waitForTimeout(300);
  const compact = await page.evaluate(() => {
    const cs = (sel, prop) => { const el = document.querySelector(sel); return el ? String(getComputedStyle(el)[prop]) : ""; };
    return { sidebar: cs(".sidebar", "width"), composer: cs(".composer", "border-radius") };
  });
  await page.evaluate(() => { document.documentElement.dataset.density = "comfortable"; });
  expect("compact narrows the sidebar to 248px", compact.sidebar === "248px", compact.sidebar);
  expect("compact softens the composer to 12px", compact.composer === "12px", compact.composer);

  await browser.close();
  if (failures.length) {
    console.log(`# ${failures.length} design drift(s):\n${failures.join("\n")}`);
    process.exit(1);
  }
  console.log("# ok");
})().catch((error) => {
  console.error("DESIGN CHECK FAILED:", error.message);
  process.exit(1);
});
