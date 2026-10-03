/**
 * Drives the parity map against the running app.
 *
 *   node scripts/surfaces-check.cjs surfaces   every covered surface renders its content
 *   node scripts/surfaces-check.cjs design     computed styles and geometry of the design language
 *   node scripts/surfaces-check.cjs identity   our copy never names the source vendor; the provider
 *                                              catalog may, and only inside [data-third-party]
 *
 * Needs the app running with a DevTools port at 127.0.0.1:9222 (CDP_PORT overrides) and
 * Playwright on NODE_PATH, for example NODE_PATH=/opt/homebrew/lib/node_modules.
 */
const fs = require("fs");
const http = require("http");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MODE = process.argv[2] || "surfaces";
const PORT = process.env.CDP_PORT || "9222";
const SHOT = process.env.SHOT || path.join(ROOT, "parity", "shots");
const PAGE_PORT = 8099;
const PAGE_MARKER = "Parity probe page";
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

/** A page the built-in browser can really load. */
function startProbePage() {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(`<!doctype html><title>${PAGE_MARKER}</title><h1>${PAGE_MARKER}</h1><p>The probe page loaded.</p>`);
    });
    server.listen(PAGE_PORT, "127.0.0.1", () => resolve(server));
  });
}

const map = JSON.parse(fs.readFileSync(path.join(ROOT, "parity", "surfaces.json"), "utf8"));
const ARTIFACT = "```html artifact title=\"Parity probe\"\n<!doctype html><title>Parity probe</title><h1>Parity probe</h1><p>Shared from Modbitx.</p>\n```";

(async () => {
  const { chromium } = playwright();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find((p) => p.url().includes("5173")) || ctx.pages()[0];
  await page.waitForLoadState("domcontentloaded");
  await page.reload();
  await page.waitForTimeout(2500);

  const text = (selector, limit = 240) => page.evaluate(([sel, cap]) => {
    const el = document.querySelector(sel);
    return el ? (el.innerText || "").replace(/\n{2,}/g, "\n").trim().slice(0, cap) : "";
  }, [selector, limit]);

  const openSettings = async () => {
    if (await page.evaluate(() => !!document.querySelector(".settings-nav"))) return;
    await page.evaluate(() => { document.querySelector(".sidebar-foot button")?.click(); });
    await page.waitForSelector(".settings-nav", { timeout: 10000 });
    await page.waitForTimeout(400);
  };
  const settingsTo = async (label) => {
    await openSettings();
    await page.evaluate((name) => {
      const button = Array.from(document.querySelectorAll(".settings-nav button.nav")).find((b) => (b.textContent || "").trim() === name);
      button?.click();
    }, label);
    await page.waitForTimeout(700);
  };
  const toMode = async (mode) => {
    await page.evaluate((value) => {
      const select = document.querySelector("select.mode-select");
      if (select) { select.value = value; select.dispatchEvent(new Event("change", { bubbles: true })); }
    }, mode);
    await page.waitForTimeout(900);
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
  /** A thread of a given mode: waits for the mode's New button and for the thread to be active. */
  const newThreadIn = async (mode) => {
    await toMode(mode);
    const label = mode === "cowork" ? "+ New task" : mode === "code" ? "+ New session" : "+ New chat";
    await page.waitForFunction(
      (lbl) => Array.from(document.querySelectorAll("button")).some((b) => (b.textContent || "").trim() === lbl),
      label,
      { timeout: 8000 }
    );
    await page.evaluate((lbl) => {
      Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === lbl)?.click();
    }, label);
    await page.waitForSelector(".composer textarea", { timeout: 15000 });
    await page.waitForFunction(
      (m) => (document.querySelector(".kicker")?.textContent || "").startsWith(m),
      mode,
      { timeout: 8000 }
    );
    await page.waitForTimeout(300);
  };

  /** Fixtures the pane, approval, and browser surfaces need, written as real app state. */
  const seedFixtures = async () => {
    const probeFolder = path.join(SHOT, "probe-folder");
    fs.mkdirSync(probeFolder, { recursive: true });
    await page.evaluate(async ([content, folder]) => {
      const raw = await window.modbitx?.loadState();
      const state = raw ? JSON.parse(raw) : { threads: [] };
      state.threads = (state.threads || []).filter((thread) => !String(thread.id).startsWith("parity-"));
      const now = Date.now();
      state.settings = state.settings || {};
      // The checks drive surfaces directly; the live Jev router would reroute short
      // prompts to chat before the tool path ever runs.
      state.settings.jevRouting = false;
      state.settings.published = [
        { id: "parity-msg0", versions: [
          { at: now - 60000, content: "<h1>Earlier heading</h1>", language: "html" },
          { at: now, content: "<h1>Later heading</h1>\n<p>Added a line.</p>", language: "html" }
        ] }
      ];
      state.threads.unshift({
        id: "parity-artifact",
        title: "Parity artifact probe",
        mode: "chat",
        messages: [{ id: "parity-msg", role: "assistant", content, createdAt: now }],
        pinned: false, archived: false, incognito: false, starred: false,
        model: "grok-4.7", effort: "xhigh", createdAt: now, updatedAt: now
      });
      state.threads.unshift({
        id: "parity-browse",
        title: "Parity browse probe",
        mode: "cowork",
        folder,
        permissionMode: "ask",
        messages: [],
        pinned: false, archived: false, incognito: false, starred: false,
        model: "grok-4.7", effort: "xhigh", createdAt: now + 1, updatedAt: now + 1
      });
      await window.modbitx?.saveState(JSON.stringify(state));
      return true;
    }, [ARTIFACT, probeFolder]);
    await page.reload();
    await page.waitForTimeout(2500);
  };

  if (MODE === "surfaces") {
    const probe = await startProbePage();
    await seedFixtures();
    const openThread = async (titleFragment) => {
      await page.evaluate((fragment) => {
        const items = Array.from(document.querySelectorAll(".thread-list button"));
        const hit = items.find((item) => item.textContent.includes(fragment));
        hit?.click();
      }, titleFragment);
      await page.waitForTimeout(1000);
    };

    const reach = {
      mode: async (how, entry) => {
        await toMode(how.value);
        await newThread();
        const body = await text(".main", 400);
        return { ok: body.length > 20 && (await page.evaluate(() => !!document.querySelector(".composer"))), detail: `${entry.id}: ${body.split("\n")[0] || ""}` };
      },
      nav: async (how) => {
        await page.evaluate((label) => {
          const button = Array.from(document.querySelectorAll(".nav-list button")).find((b) => (b.textContent || "").trim() === label);
          button?.click();
        }, how.label);
        await page.waitForTimeout(700);
        const body = await text(".main", 240);
        return { ok: body.length > 10, detail: `${how.label}: ${body.split("\n").slice(0, 2).join(" / ")}` };
      },
      settings: async (how, entry) => {
        await settingsTo(how.label);
        const body = await text(".settings-content", 240);
        if (entry.id === "connectors") {
          // The count line is rendered from the shipped connectorLines, so it must match state.
          const line = await page.evaluate(async () => {
            const element = document.querySelector("[data-connector-count]");
            const raw = await window.modbitx?.loadState();
            const state = raw ? JSON.parse(raw) : {};
            return {
              shown: Number(element?.getAttribute("data-connector-count") ?? -1),
              real: (state.connectors || []).filter((item) => item.enabled).length,
              total: (state.connectors || []).length
            };
          });
          return { ok: line.shown === line.real && line.shown >= 0, detail: `${line.shown} of ${line.total} switched on, matching state` };
        }
        if (entry.id === "documents") {
          const rows = await page.evaluate(() => Array.from(document.querySelectorAll(".skill-row .setting-name")).map((n) => n.textContent.trim()));
          const bundled = ["Documents", "PDF reading", "Slides", "Spreadsheets"].filter((name) => rows.includes(name));
          return { ok: bundled.length >= 4, detail: `bundled skills listed: ${rows.slice(0, 8).join(", ")}` };
        }
        return { ok: body.length > 10, detail: `${how.label}: ${body.split("\n").slice(0, 2).join(" / ")}` };
      },
      palette: async (how) => {
        await page.keyboard.press("Meta+k");
        await page.waitForSelector(".palette", { timeout: 6000 });
        await page.locator(".palette input").fill(how.query);
        await page.waitForTimeout(500);
        const rows = await page.evaluate(() => Array.from(document.querySelectorAll(".palette-list button")).map((b) => b.innerText.replace(/\n/g, " · ")));
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
        return { ok: rows.length > 0, detail: `${how.query} → ${rows[0] || "nothing"}` };
      },
      "customize-tab": async (how) => {
        await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll(".nav-list button")).find((b) => (b.textContent || "").trim() === "Customize");
          button?.click();
        });
        await page.waitForTimeout(700);
        const body = await text(".main", 120);
        return { ok: body.length > 10, detail: `${how.label}: ${body.split("\n")[0] || ""}` };
      },
      composer: async (how) => {
        await toMode("chat");
        await newThread();
        const labels = await page.evaluate(() => Array.from(document.querySelectorAll(".composer-bar button, .composer-bar select"))
          .map((c) => (c.getAttribute("aria-label") || c.textContent || "").trim()));
        return { ok: labels.includes(how.label), detail: `${how.label} among ${labels.filter(Boolean).join(", ")}` };
      },
      "thread-action": async (how) => {
        await toMode("chat");
        await newThread();
        await page.waitForTimeout(400);
        let labels = await page.evaluate(() => Array.from(document.querySelectorAll(".topbar button, .thread-actions button, .top-actions button, .msg-actions button")).map((b) => b.textContent.trim()));
        if (!labels.includes(how.label)) {
          await openThread("Parity artifact probe");
          labels = await page.evaluate(() => Array.from(document.querySelectorAll(".topbar button, .thread-actions button, .top-actions button, .msg-actions button")).map((b) => b.textContent.trim()));
        }
        return { ok: labels.includes(how.label), detail: `${how.label} among ${labels.slice(0, 10).join(", ")}` };
      },
      dock: async (how) => {
        await toMode("code");
        await newThread();
        const labels = await page.evaluate(() => Array.from(document.querySelectorAll(".code-dock button, .code-dock input, .code-dock select"))
          .map((c) => (c.getAttribute("aria-label") || c.textContent || "").trim()));
        return { ok: labels.includes(how.label), detail: `${how.label} among ${labels.filter(Boolean).slice(0, 10).join(", ")}` };
      },
      // A thread-topbar control: the button is clicked and something visible must answer.
      topbar: async (how) => {
        await toMode("code");
        await newThread();
        await page.waitForTimeout(400);
        const before = await text(".main", 400);
        const clicked = await page.evaluate((label) => {
          const button = Array.from(document.querySelectorAll(".topbar .top-actions button")).find((b) => (b.textContent || "").trim() === label);
          if (!button) return false;
          button.click();
          return true;
        }, how.label);
        await page.waitForTimeout(900);
        const after = await text(".main", 400);
        const panel = await page.evaluate(() => ({
          tasks: !!document.querySelector(".bg-tasks"),
          banner: (document.querySelector(".banner")?.textContent || "").trim()
        }));
        return { ok: clicked && (after !== before || panel.tasks || panel.banner.length > 0), detail: `${how.label}: clicked=${clicked}, tasks panel=${panel.tasks}, banner="${panel.banner.slice(0, 60)}"` };
      },
      // A keypress surface: the shortcut guide opens on ? and closes on Escape.
      key: async (how) => {
        await toMode("chat");
        await newThread();
        await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" })));
        await page.waitForTimeout(400);
        const opened = await page.evaluate(() => !!document.querySelector(".shortcuts-guide"));
        const rows = await page.evaluate(() => document.querySelectorAll(".shortcuts-guide .sg-row").length);
        await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
        await page.waitForTimeout(300);
        const closed = await page.evaluate(() => !document.querySelector(".shortcuts-guide"));
        return { ok: opened && rows >= 5 && closed, detail: `${how.label}: ${rows} rows, closed=${closed}` };
      },
      // A slash command whose proof is the route banner it posts.
      "slash-note": async (how) => {
        await toMode("chat");
        await newThread();
        await page.locator(".composer textarea").first().fill(how.command);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(1600);
        const banner = await text(".banner", 200);
        return { ok: banner.length > 0, detail: `${how.command} → ${banner.slice(0, 90)}` };
      },
      "artifact-pane": async (how, entry) => {
        await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll(".nav-list button")).find((b) => (b.textContent || "").trim() === "Artifacts");
          button?.click();
        });
        await page.waitForTimeout(900);
        await openThread("Parity artifact probe");
        await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll(".nav-list button")).find((b) => (b.textContent || "").trim() === "Artifacts");
          button?.click();
        });
        await page.waitForTimeout(900);
        const pane = await page.evaluate((bridge) => ({
          there: !!document.querySelector(".artifact"),
          labels: Array.from(document.querySelectorAll(".artifact button, .artifact select"))
            .map((c) => (c.getAttribute("aria-label") || c.textContent || "").trim()),
          bridge: bridge ? typeof window.modbitx?.[bridge] === "function" : true
        }), how.bridge || "");
        return { ok: pane.there && pane.labels.includes(how.label) && pane.bridge, detail: `${entry.id}: ${pane.labels.filter(Boolean).slice(0, 8).join(", ")}${how.bridge ? ` bridge=${pane.bridge}` : ""}` };
      },
      sidebar: async () => {
        const items = await page.evaluate(() => Array.from(document.querySelectorAll(".nav-list button")).map((b) => b.textContent.trim()));
        return { ok: items.length >= 6, detail: items.slice(0, 7).join(", ") };
      },
      slash: async (how) => {
        await toMode("chat");
        await openThread("Parity artifact probe");
        await page.locator(".composer textarea").first().fill(how.command);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(1500);
        const banner = await text(".banner", 120);
        return { ok: banner.length > 0 && /conversation|clipboard|export/i.test(banner), detail: `${how.command} → ${banner}` };
      },
      "bridge-call": async (how) => {
        const answer = await page.evaluate(async (call) => {
          const fn = window.modbitx?.[call];
          if (typeof fn !== "function") return { missing: true };
          const value = await fn();
          return { value };
        }, how.call);
        if (answer.missing) return { ok: false, detail: `${how.call} is not exposed` };
        const list = Array.isArray(answer.value) ? answer.value : null;
        const detail = list ? `${list.length} devices` : String(answer.value).slice(0, 90);
        return { ok: list ? true : String(answer.value || "").length > 3, detail: `${how.call}: ${detail}` };
      },
      "browser-drive": async () => {
        const drove = await page.evaluate(async (url) => {
          // The view paints inside the pane's box, so give it one before reading or capturing.
          await window.modbitx?.browserBounds({ x: 300, y: 120, width: 640, height: 420 });
          const loaded = await window.modbitx?.browserLoad(url);
          await new Promise((r) => setTimeout(r, 1500));
          const read = await window.modbitx?.browserText();
          const shot = await window.modbitx?.browserShot();
          await window.modbitx?.browserHide();
          return {
            loaded: Boolean(loaded),
            title: String(read?.title || ""),
            text: String(read?.text || ""),
            shotFile: String(shot?.file || ""),
            shotUrl: String(shot?.dataUrl || "")
          };
        }, `http://127.0.0.1:${PAGE_PORT}/probe`);
        const shotBytes = drove.shotFile && fs.existsSync(drove.shotFile) ? fs.statSync(drove.shotFile).size : 0;
        return {
          ok: /Parity probe page/.test(drove.text) && shotBytes > 2000 && drove.shotUrl.startsWith("data:image/png"),
          detail: `${drove.title} loaded, ${drove.text.length} chars read, screenshot ${shotBytes} bytes`
        };
      },
      "approval-browse": async () => {
        await page.evaluate(() => {
          const select = document.querySelector("select.mode-select");
          if (select) { select.value = "cowork"; select.dispatchEvent(new Event("change", { bubbles: true })); }
        });
        await page.waitForTimeout(900);
        await openThread("Parity browse probe");
        await page.locator(".composer textarea").first().fill(`browse http://127.0.0.1:${PAGE_PORT}/probe`);
        await page.keyboard.press("Enter");
        await page.waitForSelector(".approval", { timeout: 20000 });
        const prompt = await text(".approval", 160);
        const buttons = await page.evaluate(() => Array.from(document.querySelectorAll(".approval button")).map((b) => b.textContent.trim()));
        shown("the approval prompt offers a decision", buttons.some((label) => /allow|just once/i.test(label)) && buttons.includes("Deny"), buttons.join(", "));
        await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll(".approval button")).find((b) => /just once|^allow$/i.test(b.textContent.trim()));
          button?.click();
        });
        await page.waitForTimeout(2500);
        const pane = await page.evaluate(() => ({
          browser: !!document.querySelector(".browser-pane"),
          host: document.querySelector(".browser-pane .muted")?.textContent || ""
        }));
        shown("the built-in browser pane opens after approval", pane.browser === true, pane.host.slice(0, 60));
        return { ok: pane.browser && /allow|browser|site|computer/i.test(prompt), detail: prompt.replace(/\n/g, " ").slice(0, 90) };
      },
      "artifact-compare": async () => {
        await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll(".nav-list button")).find((b) => (b.textContent || "").trim() === "Artifacts");
          button?.click();
        });
        await page.waitForTimeout(900);
        await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll(".artifact-column .thread"));
          (items.find((item) => item.textContent.includes("Parity probe")) || items[0])?.click();
        });
        await page.waitForTimeout(900);
        const picked = await page.evaluate(() => {
          const select = document.querySelector('.artifact select[aria-label="Compare with a version"]');
          if (!select) return false;
          const option = Array.from(select.options).find((item) => item.value !== "");
          if (!option) return false;
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        });
        await page.waitForTimeout(800);
        const view = await page.evaluate(() => ({
          rows: document.querySelectorAll(".compare .compare-row").length,
          summary: document.querySelector(".compare .dock-caption")?.textContent || ""
        }));
        return { ok: picked && view.rows > 0 && /differ|match/.test(view.summary), detail: `${view.rows} rows — ${view.summary}` };
      },
      "slash-picker": async (how) => {
        await toMode("chat");
        await newThread();
        await page.locator(".composer textarea").first().fill(how.command);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(1400);
        const picker = await page.evaluate(() => {
          const dialog = document.querySelector('.approval[role="dialog"]');
          return {
            open: !!dialog,
            label: dialog?.getAttribute("aria-label") || "",
            rows: dialog ? Array.from(dialog.querySelectorAll("button")).map((b) => b.textContent.trim()).filter(Boolean).slice(0, 6) : []
          };
        });
        return { ok: picker.open && /resume/i.test(picker.label), detail: `${how.command} → ${picker.label || "no picker"} (${picker.rows.length} rows)` };
      },
      "quick-entry": async () => {
        await toMode("chat");
        await page.evaluate(async () => {
          await window.modbitx?.submitQuick("parity quick entry");
        });
        await page.waitForTimeout(1200);
        const draft = await page.evaluate(() => document.querySelector(".composer textarea")?.value || "");
        return { ok: draft.includes("parity quick entry"), detail: `new chat draft: "${draft.slice(0, 40)}"` };
      },
      "notify-bridge": async () => {
        const posted = await page.evaluate(async () => window.modbitx?.notify("Parity", "Notification probe"));
        await settingsTo("Notifications");
        const hasToggle = await page.evaluate(() => !!document.querySelector('button[role="switch"][aria-label="Notify when a reply is ready"]'));
        return { ok: posted === true && hasToggle, detail: `posted=${posted}, toggle present=${hasToggle}` };
      },
      research: async () => {
        await newThreadIn("chat");
        const before = await text(".transcript", 400);
        await page.locator(".composer textarea").first().fill("Research: what changes when the question runs as one turn?");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(2500);
        const after = await text(".transcript", 400);
        return { ok: after.length > before.length && after.length > 10, detail: `transcript ${before.length} → ${after.length} chars` };
      },
      find: async () => {
        await newThreadIn("chat");
        await page.keyboard.press("Meta+f");
        await page.waitForSelector(".find-bar input", { timeout: 6000 });
        await page.locator(".find-bar input").fill("Modbitx");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(900);
        const count = await page.evaluate(() => (document.querySelector("[data-find-count]")?.textContent || "").trim());
        await page.evaluate(() => document.querySelector("button[aria-label='Close find']")?.click());
        await page.waitForTimeout(300);
        const closed = await page.evaluate(() => !document.querySelector(".find-bar"));
        return { ok: /\d+ of \d+/.test(count) && Number((count.match(/of (\d+)/) || [])[1]) >= 1 && closed, detail: `${count || "no count"}; closed=${closed}` };
      },
      questions: async () => {
        await newThreadIn("cowork");
        await page.locator(".composer textarea").first().fill("Ask me: Red or Green or Blue");
        await page.keyboard.press("Enter");
        await page.waitForSelector("[data-question='choice']", { timeout: 15000 });
        const options = await page.evaluate(() => Array.from(document.querySelectorAll("[data-ask-option]")).map((b) => (b.textContent || "").trim()));
        await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll("[data-ask-option]")).find((b) => (b.textContent || "").trim() === "Green");
          button?.click();
        });
        await page.waitForTimeout(1500);
        // The step's detail is collapsed until its row is opened.
        await page.evaluate(() => {
          Array.from(document.querySelectorAll(".steps button")).find((b) => /ask user/i.test(b.textContent || ""))?.click();
        });
        await page.waitForTimeout(600);
        const body = await text(".transcript", 600);
        return { ok: options.join() === "Red,Green,Blue" && body.includes("You chose Green."), detail: `options ${options.join(", ")} → step recorded` };
      },
      "memory-verbs": async () => {
        await newThreadIn("cowork");
        await page.locator(".composer textarea").first().fill("Remember: parity likes tea");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(2000);
        // The step's detail is collapsed until its row is opened.
        await page.evaluate(() => {
          Array.from(document.querySelectorAll(".steps button")).find((b) => /memory write/i.test(b.textContent || ""))?.click();
        });
        await page.waitForTimeout(600);
        const step = await text(".transcript", 600);
        await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll(".nav-list button")).find((b) => (b.textContent || "").trim() === "Customize");
          button?.click();
        });
        await page.waitForTimeout(700);
        await page.evaluate(() => {
          const tab = Array.from(document.querySelectorAll(".main button")).find((b) => (b.textContent || "").trim() === "memory");
          tab?.click();
        });
        await page.waitForTimeout(500);
        const listed = await page.evaluate(() => (document.querySelector(".main")?.innerText || "").includes("parity likes tea"));
        return { ok: step.includes("Saved memory note.") && listed, detail: `step saved=${step.includes("Saved memory note.")}, customize lists=${listed}` };
      },
      none: async (how, entry) => ({ ok: false, detail: `${entry.id} has no driven reach; give it a how kind` })
    };

    // Partial surfaces are driven too, so the working part of a partial claim is proven here
    // and the limit is recorded in the map rather than quietly dropped.
    const covered = map.surfaces.filter((entry) => ["covered", "partial"].includes(entry.status));
    console.log(`# ${covered.length - map.surfaces.filter((entry) => entry.status === "partial").length} covered, ${map.surfaces.filter((entry) => entry.status === "partial").length} partial`);
    for (const entry of covered) {
      const handler = reach[entry.how.kind];
      if (!handler) {
        shown(`${entry.name} is reachable`, false, `unknown how kind ${entry.how.kind}`);
        continue;
      }
      let outcome;
      try {
        outcome = await handler(entry.how, entry);
      } catch (error) {
        outcome = { ok: false, detail: String(error.message || error).slice(0, 120) };
      }
      await page.screenshot({ path: path.join(SHOT, `surface-${entry.id}.png`) });
      shown(`${entry.name} is reachable`, outcome.ok, outcome.detail);
    }
    await page.screenshot({ path: path.join(SHOT, "surfaces-end.png") });
    probe.close();
  }

  if (MODE === "design") {
    await seedFixtures();
    await toMode("chat");
    await openThreadForDesign();
    await page.waitForTimeout(600);
    const design = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const aside = document.querySelector(".sidebar");
      const heading = document.querySelector(".hero h2, .topbar h1, h1");
      const composer = document.querySelector(".composer");
      const mode = document.querySelector("select.mode-select");
      const rect = (el) => (el ? el.getBoundingClientRect() : null);
      return {
        paper: root.getPropertyValue("--bg").trim(),
        accent: root.getPropertyValue("--accent").trim(),
        accentInk: root.getPropertyValue("--ink").trim(),
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        headingFont: heading ? getComputedStyle(heading).fontFamily : "",
        headingSize: heading ? getComputedStyle(heading).fontSize : "",
        sidebarWidth: rect(aside)?.width || 0,
        sidebarItems: document.querySelectorAll(".nav-list button").length,
        modeOptions: mode ? Array.from(mode.options).map((o) => o.value) : [],
        composerRadius: composer ? getComputedStyle(composer).borderRadius : "",
        composerWidth: rect(composer)?.width || 0,
        barControls: document.querySelectorAll(".composer-bar button, .composer-bar select").length,
        paperish: /^rgb\(2[0-9]{2}, 2[0-9]{2}, 2[0-4][0-9]\)$/.test(getComputedStyle(document.body).backgroundColor)
      };
    });
    console.log(JSON.stringify(design, null, 1));
    shown("the paper background is warm and light", design.paperish === true, design.bodyBackground);
    shown("the accent and ink tokens are real colors", /^#[0-9a-f]{6}$/i.test(design.accent) && /^#[0-9a-f]{6}$/i.test(design.accentInk), `${design.accent} / ${design.accentInk}`);
    shown("display headings use a serif face", /serif|newsreader|georgia/i.test(design.headingFont), `${design.headingFont} at ${design.headingSize}`);
    shown("the sidebar is compact", design.sidebarWidth > 180 && design.sidebarWidth <= 280 && design.sidebarItems >= 6, `${design.sidebarWidth}px with ${design.sidebarItems} items`);
    shown("the mode switch offers three modes", design.modeOptions.join() === "chat,cowork,code", design.modeOptions.join());
    shown("the composer is a wide pill", design.composerRadius !== "0px" && design.composerWidth > 400, `${design.composerRadius} at ${design.composerWidth}px`);
    shown("the composer carries its controls", design.barControls >= 3, `${design.barControls} controls`);

    // The artifact pane: open one and read its geometry from the live page.
    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll(".nav-list button")).find((b) => (b.textContent || "").trim() === "Artifacts");
      button?.click();
    });
    await page.waitForTimeout(900);
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".artifact-column .thread"));
      (items.find((item) => item.textContent.includes("Parity probe")) || items[0])?.click();
    });
    await page.waitForTimeout(900);
    const pane = await page.evaluate(() => {
      const el = document.querySelector(".artifact");
      if (!el) return { there: false };
      const box = el.getBoundingClientRect();
      const split = el.parentElement?.getBoundingClientRect();
      return {
        there: true,
        width: box.width,
        height: box.height,
        rightEdge: box.right,
        viewport: window.innerWidth,
        rightHalf: split ? box.left > split.left + split.width / 2 : false,
        visible: getComputedStyle(el).display !== "none" && box.width > 120 && box.height > 200,
        radius: getComputedStyle(el).borderRadius
      };
    });
    console.log("artifact pane:", JSON.stringify(pane));
    shown("the artifact pane is visible on the right", pane.there === true && pane.visible === true && pane.rightHalf === true, `width ${pane.width}, right half ${pane.rightHalf}, visible ${pane.visible}`);

    // The accent lives in the artifact's design system rather than the chrome, so read it there.
    const palette = await page.evaluate(() => {
      const value = (label) => document.querySelector(`.artifact input[type=color][aria-label="${label}"]`)?.value || "";
      const frame = document.querySelector(".artifact iframe");
      let injected = "";
      try {
        injected = frame?.contentDocument?.getElementById("modbitx-design")?.textContent || "";
      } catch {
        injected = "";
      }
      return { ink: value("Ink"), paper: value("Paper"), accent: value("Accent"), injectedAccent: (injected.match(/--accent:(#[0-9a-f]{6})/i) || [])[1] || "" };
    });
    console.log("design palette:", JSON.stringify(palette));
    shown("the design system carries its own accent", /^#[0-9a-f]{6}$/i.test(palette.accent) && palette.accent.toLowerCase() !== palette.ink.toLowerCase(), `accent ${palette.accent} against ink ${palette.ink}`);
    // The preview document itself is sandboxed, so the tokens it injects are asserted
    // against the shipped builder in scripts/local-jobs-check.cjs instead.
    shown("the artifact pane exposes the palette swatches", /^#[0-9a-f]{6}$/i.test(palette.paper) && /^#[0-9a-f]{6}$/i.test(palette.ink), `${palette.ink} on ${palette.paper}`);
    await page.screenshot({ path: path.join(SHOT, "design-artifact.png") });

    await toMode("code");
    await newThread();
    await page.screenshot({ path: path.join(SHOT, "design-code.png") });
    const dock = await page.evaluate(() => ({
      present: !!document.querySelector(".code-dock"),
      groups: document.querySelectorAll(".code-dock .dock-group").length
    }));
    shown("the code dock groups its controls", dock.present && dock.groups >= 4, `${dock.groups} groups`);
    await page.screenshot({ path: path.join(SHOT, "design-chat.png") });
  }

  if (MODE === "identity") {
    const vendor = ["Claude", "Anthropic"];
    const files = [];
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir)) {
        if (["node_modules", "dist", ".git", "parity"].includes(name)) continue;
        // provider-catalog.ts is generated data about third-party providers: it names the
        // makers of the models it lists, the way a store lists brands. It is not our copy.
        if (dir.endsWith("src") && name === "provider-catalog.ts") continue;
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) { walk(full); continue; }
        if (!/\.(tsx?|jsx?|cjs|css|html|json)$/.test(name)) continue;
        if (full.includes(path.join("scripts"))) continue;
        files.push(full);
      }
    };
    walk(path.join(ROOT, "src"));
    walk(path.join(ROOT, "electron"));
    files.push(path.join(ROOT, "index.html"), path.join(ROOT, "package.json"));
    const hits = [];
    for (const file of files) {
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (vendor.some((name) => line.includes(name))) hits.push(`${path.relative(ROOT, file)}:${index + 1}: ${line.trim().slice(0, 80)}`);
      });
    }
    shown("our own copy never names the source vendor", hits.length === 0, hits.slice(0, 6).join(" | ") || "clean");

    // Walk every screen and settings section the app offers, and require any vendor name
    // in the DOM to sit inside an element marked as third-party provider data.
    const sections = (await page.evaluate(() => {
      document.querySelector(".sidebar-foot button")?.click();
      return true;
    })) && await page.evaluate(() => {
      return new Promise((resolve) => setTimeout(() => resolve(Array.from(document.querySelectorAll(".settings-nav button.nav")).map((b) => b.textContent.trim())), 600));
    });
    const places = [{ id: "thread", open: async () => { await toMode("chat"); await newThread(); } }];
    for (const label of sections) places.push({ id: `settings:${label}`, open: async () => settingsTo(label) });
    const leaks = [];
    const seen = [];
    for (const place of places) {
      await place.open();
      await page.waitForTimeout(400);
      const found = await page.evaluate((names) => {
        const out = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const value = node.nodeValue || "";
          if (!names.some((name) => value.includes(name))) continue;
          const holder = node.parentElement;
          out.push({
            text: value.trim().slice(0, 60),
            marked: Boolean(holder?.closest("[data-third-party]")),
            where: holder?.closest("[data-third-party]")?.getAttribute("data-third-party") || ""
          });
        }
        return out;
      }, vendor);
      if (found.length) seen.push({ place: place.id, count: found.length });
      for (const item of found) {
        if (!item.marked) leaks.push(`${place.id}: "${item.text}"`);
      }
    }
    console.log("vendor text seen:", JSON.stringify(seen));
    shown("every vendor name in the UI is marked third-party provider data", leaks.length === 0, leaks.slice(0, 6).join(" | ") || "clean, and only inside [data-third-party]");
  }

  async function openThreadForDesign() {
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".thread-list button"));
      (items.find((item) => item.textContent.includes("New chat")) || items[0])?.click();
    });
    await page.waitForSelector(".composer textarea", { timeout: 15000 });
    await page.waitForTimeout(500);
  }

  console.log(failures.length ? `# ${failures.length} problem(s):\n${failures.join("\n")}` : "# ok");
  process.exit(failures.length ? 1 : 0);
})().catch((error) => {
  console.error("CHECK FAILED:", error.message);
  process.exit(1);
});
