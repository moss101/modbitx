const fs = require("fs");
const path = require("path");

/** Sunday is 0, matching Date.getDay(). Keeps real weekdays only, deduplicated. */
function taskDays(days) {
  if (!Array.isArray(days)) return [];
  const seen = new Set();
  for (const day of days) {
    const value = Math.trunc(Number(day));
    if (Number.isFinite(value) && value >= 0 && value <= 6) seen.add(value);
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * Whether a schedule should run: the minute matches and today is one of its days.
 * An empty day list repeats every day. This mirrors taskDueOn in src/local-jobs.ts.
 */
function taskDueOn(when, days, hhmm, weekday) {
  if (String(when || "") !== hhmm) return false;
  const chosen = taskDays(days);
  if (!chosen.length) return true;
  return chosen.includes(Math.trunc(Number(weekday)));
}

/**
 * The provider rules, mirroring src/providers.ts. A closed-window run uses whichever
 * provider the settings name, with that provider's own key and endpoint.
 */
function providerFor(settings) {
  const known = {
    xai: { api: "https://api.x.ai/v1", env: "XAI_API_KEY", models: ["grok-4.7", "grok-4", "grok-4-fast", "grok-3"] },
    zai: { api: "https://api.z.ai/api/paas/v4", env: "ZCODE_API_KEY", models: ["glm-5.3", "glm-5.3-flash"] },
    openai: { api: "https://api.openai.com/v1", env: "OPENAI_API_KEY", models: [] },
    anthropic: { api: "https://api.anthropic.com/v1", env: "ANTHROPIC_API_KEY", models: [] },
    google: { api: "https://generativelanguage.googleapis.com/v1beta/openai", env: "GOOGLE_API_KEY", models: [] },
    groq: { api: "https://api.groq.com/openai/v1", env: "GROQ_API_KEY", models: [] },
    openrouter: { api: "https://openrouter.ai/api/v1", env: "OPENROUTER_API_KEY", models: [] },
    deepseek: { api: "https://api.deepseek.com", env: "DEEPSEEK_API_KEY", models: [] }
  };
  const keys = settings.providerKeys || {};
  const bases = settings.providerBase || {};
  const custom = settings.customModels || {};
  // An older save stored the ZCode key and endpoint on their own fields.
  const id = settings.provider === "zcode" ? "zai" : (settings.provider && settings.provider) || "xai";
  const provider = known[id] || { api: bases[id] || "", env: "", models: [] };
  if (!provider.api && !bases[id]) return { id, base: "", key: "", model: settings.model || "" };
  const stored = String(bases[id] || "").trim();
  const base = stored || provider.api;
  const storedKey = String(keys[id] || (id === "xai" ? settings.apiKey : "") || (id === "zai" ? settings.zcodeKey : "") || "").trim();
  const env = String(process.env[provider.env] || "").trim();
  const key = storedKey || env;
  const listed = provider.models;
  const picked = String(custom[id] || "").trim();
  const model = listed.includes(settings.model) ? settings.model : (picked || listed[0] || settings.model || "");
  return { id, base, key, model };
}

function main(file) {
  if (!file || !fs.existsSync(file)) return;

  const state = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!state.settings?.backgroundScheduler) return;
  const provider = providerFor(state.settings || {});

  const dir = path.dirname(file);
  const runsFile = path.join(dir, "task-runs.json");
  const runs = fs.existsSync(runsFile) ? JSON.parse(fs.readFileSync(runsFile, "utf8")) : {};
  const beat = path.join(dir, "heartbeat");
  const desktopUp = fs.existsSync(beat) && Date.now() - fs.statSync(beat).mtimeMs < 15000;
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  const due = [];

  for (const task of state.tasks || []) {
    if (!task.enabled || !taskDueOn(task.when, task.days, hhmm, now.getDay())) continue;
    const stamp = runs[task.id] || task.lastRun;
    const last = stamp ? new Date(stamp) : null;
    if (last && last.toDateString() === now.toDateString()) continue;
    runs[task.id] = Date.now();
    task.lastRun = Date.now();
    due.push(task);
  }

  if (!due.length) return;
  fs.writeFileSync(runsFile, JSON.stringify(runs));

  function taskNeedsPerson(prompt) {
    return /\b(click|browse|screenshot|grant a folder|edit the file|open the (?:site|page|app))\b/i.test(prompt);
  }

  function taskOutcome(prompt, opts) {
    const text = String(prompt || "").trim();
    if (!text) return { status: "cant-run", detail: "This schedule has no prompt, so it did not run." };
    if (!opts.desktopOpen && taskNeedsPerson(text)) {
      return { status: "needs-input", detail: "This schedule needs you at the Mac. It is waiting in a Cowork chat." };
    }
    if (!opts.desktopOpen && !opts.hasKey) {
      return { status: "cant-run", detail: "No model key is stored, so this schedule could not write a reply." };
    }
    return {
      status: "finished",
      detail: opts.desktopOpen ? "The schedule opened a Cowork chat." : "The schedule wrote a reply while Modbitx was closed."
    };
  }

  if (desktopUp) {
    const inbox = path.join(dir, "handoff.json");
    const current = fs.existsSync(inbox) ? JSON.parse(fs.readFileSync(inbox, "utf8")) : [];
    for (const task of due) current.push({ text: task.prompt, at: Date.now(), taskId: task.id, title: task.name });
    fs.writeFileSync(inbox, JSON.stringify(current));
    return;
  }

  const notices = [];
  const fresh = [];
  for (const task of due) {
    const outcome = taskOutcome(task.prompt || "", { hasKey: Boolean(provider.key), desktopOpen: false });
    task.lastNotice = outcome.status;
    task.lastNoticeAt = Date.now();
    notices.push({ taskId: task.id, title: task.name, status: outcome.status, detail: outcome.detail, at: Date.now() });
    if (outcome.status === "cant-run") continue;
    const callModel = outcome.status === "finished" && provider.key && task.cloud !== false;
    fresh.push({
      id: `sched-${task.id}-${Date.now()}`,
      title: task.name || "Scheduled task",
      mode: "cowork",
      messages: [
        { id: `u-${task.id}`, role: "user", content: task.prompt, createdAt: Date.now() },
        {
          id: `a-${task.id}`,
          role: "assistant",
          content: callModel ? "Running in the background scheduler…" : outcome.detail,
          createdAt: Date.now()
        }
      ],
      pinned: false,
      archived: false,
      incognito: false,
      starred: false,
      model: provider.model,
      effort: state.settings.effort || "xhigh",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  if (fresh.length) state.threads = [...fresh, ...(state.threads || [])];
  const noticesFile = path.join(dir, "task-notices.json");
  const priorNotices = fs.existsSync(noticesFile) ? JSON.parse(fs.readFileSync(noticesFile, "utf8")) : [];
  fs.writeFileSync(noticesFile, JSON.stringify([...(Array.isArray(priorNotices) ? priorNotices : []), ...notices]));

  async function complete() {
    if (!provider.key) return;
    for (const thread of fresh) {
      const pending = thread.messages.find((message) => message.content === "Running in the background scheduler…");
      if (!pending) continue;
      const response = await fetch(`${provider.base.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.key}` },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "system", content: "You are Modbitx running a scheduled Cowork task while the desktop window is closed. Do not claim you clicked, browsed, or edited files. Answer the task and list what to review when the user returns." },
            { role: "user", content: thread.messages[0].content }
          ]
        })
      });
      const json = await response.json();
      pending.content = json.choices?.[0]?.message?.content || `Scheduler could not complete the model call (${response.status}).`;
    }
  }

  complete().catch((error) => {
    for (const thread of fresh) {
      const pending = thread.messages.find((message) => message.content === "Running in the background scheduler…");
      if (pending) pending.content = `Scheduler failed: ${error.message}`;
    }
  }).finally(() => {
    const next = `${file}.tmp`;
    fs.writeFileSync(next, JSON.stringify(state));
    fs.renameSync(next, file);
  });
}

if (require.main === module) main(process.argv[2]);
module.exports = { taskDays, taskDueOn, providerFor };
