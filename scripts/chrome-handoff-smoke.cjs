/**
 * Drives the shipped Chrome extension poll against a real handoff server.
 *
 * Default: starts a stub server on 127.0.0.1:4737 and checks what the extension posts.
 * `--live <pairingCode>`: uses the running Modbitx server instead, so the queued job
 * comes from the app and the posted read lands in Dispatch.
 *
 * The `chrome` API is stubbed; page injection itself is Chrome's own behavior.
 */
const fs = require("fs");
const http = require("http");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const EXTENSION = path.join(ROOT, "extensions", "chrome", "background.js");
const PORT = 4737;

const liveAt = process.argv.indexOf("--live");
const PAIRING = liveAt >= 0 ? String(process.argv[liveAt + 1] || "") : "smoke-code";
const LIVE = liveAt >= 0;

const failures = [];
const shown = (name, ok, detail) => {
  if (!ok) failures.push(name);
  console.log(`${ok ? "pass" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

function chromeStub(options) {
  const calls = { posts: [] };
  return {
    calls,
    chrome: {
      storage: {
        local: {
          get: async () => (options.code === "" ? {} : { code: options.code }),
          set: async () => undefined
        }
      },
      tabs: { query: async () => [{ id: 7, url: "https://example.com/guide" }] },
      scripting: {
        executeScript: async ({ func }) => {
          if (options.failInjection) throw new Error("Cannot access contents of the page.");
          return [{ result: typeof func === "function" ? { title: "Live Docs", url: "https://example.com/guide", text: "Body from the live page" } : func }];
        }
      },
      alarms: { create: () => undefined, onAlarm: { addListener: () => undefined } },
      runtime: { onInstalled: { addListener: () => undefined }, onMessage: { addListener: () => undefined } }
    }
  };
}

/** Runs the shipped file in this realm so `instanceof Error` behaves as it does in Chrome. */
function loadExtension(chrome) {
  const previous = globalThis.chrome;
  globalThis.chrome = chrome;
  const source = fs.readFileSync(EXTENSION, "utf8");
  vm.runInThisContext(source, { filename: EXTENSION });
  return {
    poll: globalThis.poll,
    restore: () => { globalThis.chrome = previous; }
  };
}

function startStubServer(jobs, posts) {
  return new Promise((resolve) => {
    const queue = jobs.slice();
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (url.pathname === "/v1/chrome/next") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(queue.shift() || null));
        return;
      }
      if (req.method === "POST" && url.pathname === "/v1/handoff") {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          posts.push({ code: url.searchParams.get("code"), body });
          res.writeHead(200);
          res.end("ok");
        });
        return;
      }
      res.writeHead(404);
      res.end("no");
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function run() {
  let server = null;
  let posts = [];
  if (!LIVE) {
    server = await startStubServer(
      [
        { type: "read" },
        { type: "read" },
        { type: "read" }
      ],
      posts
    );
  } else {
    console.log(`live server on ${PORT}, pairing ${PAIRING}`);
  }

  const post = async (options, label) => {
    const before = posts.length;
    const stub = chromeStub(options);
    if (LIVE) {
      const device = loadExtension(stub.chrome);
      try {
        await device.poll();
      } finally {
        device.restore();
      }
      return { label, body: null, code: PAIRING };
    }
    const captured = [];
    const original = global.fetch;
    global.fetch = async (input, init) => {
      const url = String(input);
      if (init?.method === "POST" && url.includes("/v1/handoff")) {
        captured.push({ code: new URL(url).searchParams.get("code"), body: init.body });
        return { ok: true, json: async () => ({}) };
      }
      return original(input, init);
    };
    const device = loadExtension(stub.chrome);
    try {
      await device.poll();
    } finally {
      global.fetch = original;
      device.restore();
    }
    const last = captured[captured.length - 1];
    return { label, body: last ? last.body : null, code: last?.code, count: captured.length - before };
  };

  if (!LIVE) {
    const read = await post({ code: PAIRING, failInjection: false }, "read");
    const parsed = read.body ? JSON.parse(read.body) : null;
    shown("the queued read is posted, not discarded", !!parsed && parsed.source === "chrome", read.body || "no post");
    shown("the posted read keeps the page text", !!parsed?.page?.text?.includes("Body from the live page") && parsed.page.title === "Live Docs" && parsed.page.url === "https://example.com/guide");
    shown("the post carries the pairing code", read.code === PAIRING);

    const failed = await post({ code: PAIRING, failInjection: true }, "failed");
    const failedBody = failed.body ? JSON.parse(failed.body) : null;
    shown("a failed injection is still posted", !!failedBody && failedBody.source === "chrome" && /Cannot access/.test(failedBody.page?.error || ""), failed.body || "no post");

    const started = posts.length;
    await post({ code: "", failInjection: false }, "unpaired");
    shown("an unpaired extension posts nothing", posts.length === started);

    await post({ code: PAIRING, failInjection: false }, "drained");
    const drained = await post({ code: PAIRING, failInjection: false }, "empty");
    shown("an empty queue posts nothing", drained.body === null, String(drained.body));

    server.close();
    console.log(failures.length ? failures.join("\n") : "chrome handoff smoke ok");
    process.exit(failures.length ? 1 : 0);
  }

  // Live: the app queued a read, so the extension pulls it and posts the result back.
  // The queue cannot be inspected without consuming it, so the caller checks Dispatch.
  await post({ code: PAIRING, failInjection: false }, "live");
  console.log("live: the shipped poll ran once against the running app");
  console.log("chrome handoff smoke ok");
  process.exit(0);
}

run().catch((error) => {
  const taken = /EADDRINUSE/.test(error.message);
  console.error("SMOKE FAILED:", taken
    ? `port ${PORT} is already in use. Stop the Modbitx app, or run with --live <pairingCode> against it.`
    : error.message);
  process.exit(1);
});
