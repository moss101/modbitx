import { useEffect, useMemo, useState } from "react";
import { artifactsFromMessages, filterArtifacts, versionCount } from "../artifacts";
import { CHROME_LABEL, PHONE_LABEL, WEEKDAY_NAMES, nextDueOn, taskDaysLabel } from "../local-jobs";
import { paletteEntries, paletteMatches, paletteSnippet, type PaletteEntry } from "../palette";
import { useStore } from "../store";
import type { ScheduledTask } from "../types";
import { ArtifactPane } from "./ThreadView";

export { SettingsPage } from "./SettingsView";

export function CustomizePage() {
  const { state, dispatch, newId } = useStore();
  const [tab, setTab] = useState<"connectors" | "skills" | "memory" | "styles">("connectors");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  return (
    <main className="main page">
      <header className="topbar"><div><div className="kicker">Customize</div><h1>Connectors, skills, and memory</h1></div></header>
      <div className="mode-switch">
        {(["connectors", "skills", "memory", "styles"] as const).map((item) => (
          <button key={item} className={tab === item ? "on" : ""} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      {tab === "connectors" && (
        <div className="cards">
          {state.connectors.map((connector) => (
            <article key={connector.id} className="card">
              <header><strong>{connector.name}</strong><span className="muted">{connector.category}</span></header>
              <p>{connector.blurb}</p>
              <button className={connector.enabled ? "send" : "ghost"} onClick={() => dispatch({ type: "toggle-connector", id: connector.id })}>{connector.enabled ? "On" : "Off"}</button>
            </article>
          ))}
          <article className="card">
            <strong>Add a custom connector</strong>
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Command" value={body} onChange={(e) => setBody(e.target.value)} />
            <button className="primary-btn" onClick={() => { if (name.trim()) { dispatch({ type: "add-connector", name, command: body }); setName(""); setBody(""); } }}>Add</button>
          </article>
        </div>
      )}
      {tab === "skills" && (
        <div className="cards">
          {state.skills.map((skill) => (
            <article key={skill.id} className="card">
              <header><strong>{skill.name}</strong><span className="muted">{skill.bundled ? "Bundled" : "Yours"}</span></header>
              <p>{skill.blurb}</p>
              <p className="muted">{skill.instructions}</p>
              <button className={skill.enabled ? "send" : "ghost"} onClick={() => dispatch({ type: "toggle-skill", id: skill.id })}>{skill.enabled ? "Enabled" : "Disabled"}</button>
            </article>
          ))}
          <article className="card">
            <strong>Create a skill</strong>
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea placeholder="Instructions" value={body} onChange={(e) => setBody(e.target.value)} />
            <button className="primary-btn" onClick={() => { if (name.trim()) { dispatch({ type: "add-skill", name, instructions: body }); setName(""); setBody(""); } }}>Save skill</button>
          </article>
        </div>
      )}
      {tab === "memory" && (
        <div className="stack">
          <p className="muted">{state.settings.memoryOn ? "Memory is on. Notes are added to the system prompt." : "Memory is off. Notes are kept and not sent."}</p>
          <textarea placeholder="Remember that…" value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="primary-btn" onClick={() => { if (body.trim()) { dispatch({ type: "memory", note: { id: newId(), text: body.trim(), updatedAt: Date.now() } }); setBody(""); } }}>Save memory</button>
          {state.memories.map((note) => (
            <article key={note.id} className="card row">
              <span>{note.name ? `${note.name}: ${note.text}` : note.text}</span>
              <button className="ghost" onClick={() => dispatch({ type: "delete-memory", id: note.id })}>Delete</button>
            </article>
          ))}
        </div>
      )}
      {tab === "styles" && (
        <div className="stack">
          <p>Styles are extra instructions about tone. The same note is in Settings → System prompt, and it is capped at 3,000 characters.</p>
          <textarea placeholder="Write like a careful editor." maxLength={3000} value={state.settings.launchNote} onChange={(e) => dispatch({ type: "settings", patch: { launchNote: e.target.value.slice(0, 3000) } })} />
        </div>
      )}
    </main>
  );
}

export function ProjectsPage() {
  const { state, dispatch, newId } = useStore();
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  return (
    <main className="main page">
      <header className="topbar"><div><div className="kicker">Projects</div><h1>Shared instructions and knowledge</h1></div></header>
      <div className="cards">
        {state.projects.map((project) => (
          <article key={project.id} className="card">
            <header><strong style={{ color: project.color }}>{project.name}</strong></header>
            <p>{project.description}</p>
            <textarea aria-label={`${project.name} instructions`} value={project.instructions} onChange={(e) => dispatch({ type: "patch-project", id: project.id, patch: { instructions: e.target.value } })} />
            <label className="muted">
              <input type="checkbox" checked={project.shared === true} onChange={(e) => dispatch({ type: "patch-project", id: project.id, patch: { shared: e.target.checked } })} />
              {" "}Shared project
            </label>
            <p className="muted">{project.knowledge.length} knowledge files</p>
            {project.knowledge.length > 0 && (
              <ul className="knowledge-list">
                {project.knowledge.map((file) => (
                  <li key={file.id}>
                    <span className="knowledge-name" title={file.path || file.name}>{file.name}</span>
                    <span className="muted">{file.text.length} chars</span>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => dispatch({ type: "patch-project", id: project.id, patch: { knowledge: project.knowledge.filter((item) => item.id !== file.id) } })}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="top-actions">
              <button className="ghost" onClick={() => dispatch({ type: "new-thread", projectId: project.id, mode: "chat" })}>New chat</button>
              <button className="ghost" onClick={() => void addKnowledge(project.id)}>Add file</button>
              <button className="ghost" onClick={() => dispatch({ type: "delete-project", id: project.id })}>Delete</button>
            </div>
          </article>
        ))}
        <article className="card">
          <strong>New project</strong>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea placeholder="Custom instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          <button className="primary-btn" onClick={() => {
            if (!name.trim()) return;
            dispatch({ type: "project", project: { id: newId(), name, description: "Local project", instructions, color: "#3d4a8a", knowledge: [], shared: false, createdAt: Date.now() } });
            setName(""); setInstructions("");
          }}>Create</button>
        </article>
      </div>
    </main>
  );
}

async function addKnowledge(projectId: string) {
  const files = await window.modbitx?.chooseFiles();
  if (!files?.length) return;
  window.dispatchEvent(new CustomEvent("modbitx-knowledge", { detail: { projectId, files } }));
}

export function ArtifactsPage() {
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const all = state.threads.flatMap((thread) => artifactsFromMessages(thread.messages).map((artifact) => ({ ...artifact, thread: thread.title, threadId: thread.id })));
  const shown = filterArtifacts(all, query);
  const [active, setActive] = useState(all[0]?.id ?? "");
  const current = shown.find((item) => item.id === active) ?? shown[0];

  const copySource = async () => {
    if (!current) return;
    const text = current.content;
    // The app's clipboard bridge is gated behind computer use, so try the web API first.
    try {
      await navigator.clipboard.writeText(text);
      setNote(`Copied ${text.length} characters of ${current.language}.`);
      return;
    } catch { /* fall through to the app bridge */ }
    const written = await window.modbitx?.writeClipboard(text);
    setNote(written
      ? `Copied ${written.length} characters of ${current.language}.`
      : "The clipboard is unavailable here. Turn on computer use in Settings → Code, or select the source in the chat.");
  };

  return (
    <main className="main page">
      <header className="topbar"><div><div className="kicker">Artifacts</div><h1>Previews saved in your threads</h1></div></header>
      {all.length ? (
        <div className="split tall">
          <div className="artifact-column">
            <div className="artifact-tools">
              <input aria-label="Search artifacts" placeholder="Search artifacts" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button type="button" className="ghost" disabled={!current} onClick={() => void copySource()}>Copy source</button>
            </div>
            {note && <p className="muted artifact-note">{note}</p>}
            <div className="thread-list">
              {shown.map((item) => {
                const versions = versionCount(state.settings.published, item.id);
                return (
                  <button key={item.id} className={item.id === current?.id ? "thread on" : "thread"} onClick={() => setActive(item.id)}>
                    <span className="thread-title">
                      {item.title}
                      <br />
                      <span className="muted">{item.thread} · {item.language}{versions > 1 ? ` · ${versions} versions` : ""}</span>
                    </span>
                  </button>
                );
              })}
              {!shown.length && <p className="muted pad">No artifacts match that search.</p>}
            </div>
          </div>
          {current && <ArtifactPane threadId={current.threadId} title={current.title} language={current.language} content={current.content} choices={[]} activeId={current.id} onPick={() => {}} onClose={() => dispatch({ type: "select", id: current.threadId })} />}
        </div>
      ) : <p className="muted pad">Ask for an HTML artifact in a chat. It will show up here.</p>}
    </main>
  );
}

export function ScheduledPage() {
  const { state, dispatch, newId } = useStore();
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [when, setWhen] = useState("09:00");
  const [days, setDays] = useState<number[]>([]);
  const [wakeNote, setWakeNote] = useState<Record<string, string>>({});
  const toggleDay = (day: number) => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  const scheduleWake = (task: ScheduledTask) => {
    const due = nextDueOn(task.when, task.days, new Date());
    if (!due) {
      setWakeNote((n) => ({ ...n, [task.id]: "No next occurrence found." }));
      return;
    }
    void window.modbitx?.scheduleWake?.(due).then((result) => {
      setWakeNote((n) => ({ ...n, [task.id]: `Wake set for ${new Date(due).toLocaleString()}${result.wake ? ` (pmset ${result.wake})` : ""}.` }));
    }).catch((error: unknown) => {
      setWakeNote((n) => ({ ...n, [task.id]: error instanceof Error ? error.message : "The wake could not be scheduled." }));
    });
  };
  return (
    <main className="main page">
      <header className="topbar"><div><div className="kicker">Scheduled</div><h1>Routines on this Mac</h1></div></header>
      <p className="muted">Tasks run at the minute you set. Choose no days to run every day. Turn on “Keep schedules running after quit” in Settings → Cowork and the background scheduler keeps them when the window is closed. Cloud tasks with an API key get a reply written into the thread.</p>
      <div className="cards">
        {state.tasks.map((task) => (
          <article key={task.id} className="card">
            <header><strong>{task.name}</strong><span>{task.when} · {taskDaysLabel(task.days)}</span></header>
            <p>{task.prompt}</p>
            {task.lastNotice && <p className="muted">{task.lastNotice}{task.lastNoticeAt ? ` · ${new Date(task.lastNoticeAt).toLocaleString()}` : ""}</p>}
            {wakeNote[task.id] && <p className="muted">{wakeNote[task.id]}</p>}
            <div className="top-actions">
              <button className="ghost" onClick={() => dispatch({ type: "patch-task", id: task.id, patch: { enabled: !task.enabled } })}>{task.enabled ? "Pause" : "Resume"}</button>
              <button className="ghost" onClick={() => runTask(task.prompt, dispatch, task.id)}>Run now</button>
              <button className="ghost" title="Register a macOS wake for the next occurrence (asks for your admin password)" onClick={() => scheduleWake(task)}>Wake</button>
              <button className="ghost" onClick={() => dispatch({ type: "delete-task", id: task.id })}>Delete</button>
            </div>
          </article>
        ))}
        <article className="card">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea placeholder="Prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <input type="time" value={when} onChange={(e) => setWhen(e.target.value)} />
          <div className="day-picker" role="group" aria-label="Repeat days">
            {WEEKDAY_NAMES.map((label, day) => (
              <button
                key={label}
                type="button"
                className={days.includes(day) ? "day on" : "day"}
                aria-pressed={days.includes(day)}
                aria-label={label}
                onClick={() => toggleDay(day)}
              >
                {label.slice(0, 1)}
              </button>
            ))}
            <span className="muted">{taskDaysLabel(days)}</span>
          </div>
          <button className="primary-btn" onClick={() => {
            if (!name.trim() || !prompt.trim()) return;
            dispatch({ type: "task", task: { id: newId(), name, prompt, when, days, enabled: true, cloud: true } });
            setName(""); setPrompt(""); setDays([]);
          }}>Schedule</button>
        </article>
      </div>
    </main>
  );
}

function runTask(prompt: string, dispatch: ReturnType<typeof useStore>["dispatch"], id: string) {
  dispatch({ type: "patch-task", id, patch: { lastRun: Date.now() } });
  dispatch({ type: "new-thread", mode: "cowork" });
  window.dispatchEvent(new CustomEvent("modbitx-prefill", { detail: prompt }));
}

export function DispatchPage() {
  const { state, dispatch, newId } = useStore();
  const [text, setText] = useState("");
  const waiting = (state.dispatchQueue || []).filter((item) => item.status === "waiting");
  return (
    <main className="main page">
      <header className="topbar"><div><div className="kicker">Dispatch</div><h1>Send work and come back</h1></div></header>
      <p>Phone handoff waits here. Accept starts a Cowork chat. This Mac shows a notification. There is no phone push.</p>
      <div className="cards">
        {waiting.map((item) => (
          <article key={item.id} className="card">
            <header><strong>{item.title || (item.source === "chrome" ? CHROME_LABEL : item.source === "phone" ? PHONE_LABEL : "On this Mac")}</strong></header>
            <p>{item.text}</p>
            <div className="top-actions">
              <button className="ghost" onClick={() => {
                dispatch({ type: "patch-dispatch", id: item.id, patch: { status: "accepted" } });
                dispatch({ type: "new-thread", mode: "cowork" });
                window.dispatchEvent(new CustomEvent("modbitx-prefill", { detail: item.text }));
              }}>Accept</button>
              <button className="ghost" onClick={() => dispatch({ type: "patch-dispatch", id: item.id, patch: { status: "dismissed" } })}>Dismiss</button>
            </div>
          </article>
        ))}
        {waiting.length === 0 && <p className="muted">Nothing is waiting.</p>}
      </div>
      <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="What should be ready when you return?" />
      <button className="primary-btn" onClick={() => {
        const note = text.trim();
        if (!note) return;
        dispatch({
          type: "enqueue-dispatch",
          item: { id: newId(), text: note, at: Date.now(), source: "desktop", status: "waiting" }
        });
        setText("");
      }}>Dispatch</button>
    </main>
  );
}

export function Palette({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const entries = useMemo(() => paletteEntries({ threads: state.threads, projects: state.projects }), [state.threads, state.projects]);
  const shown = useMemo(() => paletteMatches(q, entries), [q, entries]);
  useEffect(() => { setCursor(0); }, [q]);

  const run = (entry: PaletteEntry) => {
    if (entry.kind === "action") {
      if (entry.action === "new-chat") dispatch({ type: "new-thread", mode: "chat" });
      else if (entry.action === "new-task") dispatch({ type: "new-thread", mode: "cowork" });
      else if (entry.action === "new-session") dispatch({ type: "new-thread", mode: "code" });
      else dispatch({ type: "new-thread", incognito: true });
    } else if (entry.kind === "screen") {
      if (entry.nav) dispatch({ type: "screen", screen: entry.nav });
    } else if (entry.kind === "settings") {
      dispatch({ type: "screen", screen: "settings", section: entry.target });
    } else if (entry.kind === "chat") {
      dispatch({ type: "select", id: String(entry.target) });
    } else {
      dispatch({ type: "screen", screen: "projects" });
    }
    onClose();
  };

  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((at) => (shown.length ? (at + 1) % shown.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((at) => (shown.length ? (at - 1 + shown.length) % shown.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = shown[cursor] || shown[0];
      if (pick) run(pick);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="palette" role="dialog" aria-label="Command palette" onKeyDown={onKey} onClick={(e) => e.stopPropagation()}>
        <input autoFocus aria-label="Search commands" placeholder="Search commands, chats, and projects" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="palette-list">
          {shown.map((entry, index) => {
            const snippet = paletteSnippet(entry, q);
            return (
              <button
                key={entry.id}
                type="button"
                className={index === cursor ? "on" : ""}
                onMouseMove={() => setCursor(index)}
                onClick={() => run(entry)}
              >
                <span className="palette-label">
                  <span>{entry.label}</span>
                  {snippet && <span className="palette-snippet">{snippet}</span>}
                </span>
                <span className="muted">{entry.group}</span>
              </button>
            );
          })}
          {!shown.length && <p className="muted pad">Nothing matches that.</p>}
        </div>
      </div>
    </div>
  );
}
