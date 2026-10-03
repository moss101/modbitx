import { useMemo, useState } from "react";
import { statusLabel } from "../session-status";
import { useStore } from "../store";
import type { Mode } from "../types";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "chat", label: "Chat", hint: "Conversations" },
  { id: "cowork", label: "Cowork", hint: "Tasks on this Mac" },
  { id: "code", label: "Code", hint: "Repository sessions" }
];

/** Original 16px stroke icons for the sidebar rows (same language as the settings NavMarks). */
function SideMark({ id }: { id: string }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, "aria-hidden": true as const };
  switch (id) {
    case "new":
      return <svg {...common}><path d="M8 3v10M3 8h10" /></svg>;
    case "search":
      return <svg {...common}><circle cx="7" cy="7" r="4.2" /><path d="m10.4 10.4 3 3" /></svg>;
    case "projects":
      return <svg {...common}><rect x="2" y="2.5" width="5" height="5" rx="1" /><rect x="9" y="2.5" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>;
    case "artifacts":
      return <svg {...common}><rect x="2.5" y="2" width="11" height="12" rx="1.4" /><path d="M5 5.5h6M5 8h6M5 10.5h3.5" /></svg>;
    case "design":
      return <svg {...common}><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="1.6" /><path d="M8 2.5v3.9M13.2 9.5l-3.7-1.1M4.4 12.2l2.3-3.2" /></svg>;
    case "scheduled":
      return <svg {...common}><rect x="2" y="3" width="12" height="11" rx="1.4" /><path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4" /></svg>;
    case "dispatch":
      return <svg {...common}><path d="M14 8a6 6 0 1 1-1.76-4.24" /><path d="M14 2.5V6h-3.5" /><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" /></svg>;
    case "customize":
      return <svg {...common}><path d="M2.5 5.5h7M12.5 5.5h1M2.5 10.5h1M6.5 10.5h7" /><circle cx="11" cy="5.5" r="1.6" /><circle cx="5" cy="10.5" r="1.6" /></svg>;
    default:
      return null;
  }
}

/** Every sidebar nav row, keyed for the Edit sidebar panel. */
export const SIDEBAR_ROWS: { id: string; label: string; blurb: string }[] = [
  { id: "projects", label: "Projects", blurb: "Grouped chats with instructions" },
  { id: "artifacts", label: "Artifacts", blurb: "Everything built across chats" },
  { id: "design", label: "Design", blurb: "Design systems for previews" },
  { id: "scheduled", label: "Scheduled", blurb: "Recurring tasks" },
  { id: "dispatch", label: "Dispatch", blurb: "Tasks sent from phone or Chrome" },
  { id: "customize", label: "Customize", blurb: "Skills, connectors, plugins" }
];

export function Sidebar({ onPalette }: { onPalette: () => void }) {
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "working" | "done" | "blocked">("all");
  const threads = useMemo(() => {
    return state.threads
      .filter((thread) => thread.mode === state.mode && !thread.archived)
      .filter((thread) => !query || thread.title.toLowerCase().includes(query.toLowerCase()))
      .filter((thread) => statusFilter === "all" || thread.sessionStatus === statusFilter)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  }, [state.threads, state.mode, query, statusFilter]);

  const order = state.settings.sidebarOrder?.length
    ? SIDEBAR_ROWS.filter((row) => state.settings.sidebarOrder!.includes(row.id))
    : SIDEBAR_ROWS;

  function navTo(screen: "projects" | "artifacts" | "scheduled" | "dispatch" | "customize") {
    dispatch({ type: "screen", screen });
  }

  function moveRow(id: string, dir: -1 | 1) {
    const current = order.map((row) => row.id);
    const at = current.indexOf(id);
    const to = at + dir;
    if (at < 0 || to < 0 || to >= current.length) return;
    const next = [...current];
    next.splice(to, 0, next.splice(at, 1)[0]);
    dispatch({ type: "settings", patch: { sidebarOrder: next } });
  }

  function toggleRow(id: string) {
    const current = order.map((row) => row.id);
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    dispatch({ type: "settings", patch: { sidebarOrder: next } });
  }

  function navRow(row: (typeof SIDEBAR_ROWS)[number]) {
    const on = row.id === "design"
      ? state.screen === "settings" && state.settingsSection === "design"
      : state.screen === row.id;
    return (
      <button
        key={row.id}
        className={on ? "nav on" : "nav"}
        title={row.id === "design" ? "Design systems" : row.blurb}
        onClick={() => row.id === "design"
          ? dispatch({ type: "screen", screen: "settings", section: "design" })
          : navTo(row.id as "projects")}
      >
        <SideMark id={row.id} />
        <span>{row.label}</span>
      </button>
    );
  }

  return (
    <aside className={state.sidebarCollapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="traffic-spacer" />
      <div className="brand-row">
        <strong>Modbitx</strong>
        <select className="mode-select" value={state.mode} onChange={(e) => dispatch({ type: "mode", mode: e.target.value as Mode })}>
          {MODES.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
        </select>
      </div>
      <button className="primary-btn" onClick={() => dispatch({ type: "new-thread", mode: state.mode })}>
        <span>+ New {state.mode === "chat" ? "chat" : state.mode === "cowork" ? "task" : "session"}</span>
      </button>
      <button className="ghost search-btn" onClick={onPalette}><SideMark id="search" /><span>Search</span></button>
      <input className="search" placeholder="Filter recents" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="nav-list">
        {order.map(navRow)}
        {!state.sidebarCollapsed && (
          <button className="ghost" onClick={() => setEditing(!editing)}>{editing ? "Done" : "Edit sidebar…"}</button>
        )}
      </div>
      {editing && (
        <div className="sidebar-edit" role="dialog" aria-label="Edit sidebar">
          {SIDEBAR_ROWS.map((row) => {
            const shown = order.some((item) => item.id === row.id);
            return (
              <div key={row.id} className="sidebar-edit-row">
                <button className="ghost" role="switch" aria-checked={shown} aria-label={`Show ${row.label}`} onClick={() => toggleRow(row.id)}>
                  <span className={shown ? "dot on-dot" : "dot"} style={{ background: shown ? "var(--cds-clay)" : "transparent" }} />
                  {row.label}
                </button>
                <span className="sidebar-edit-actions">
                  <button className="ghost" aria-label={`Move ${row.label} up`} onClick={() => moveRow(row.id, -1)}>↑</button>
                  <button className="ghost" aria-label={`Move ${row.label} down`} onClick={() => moveRow(row.id, 1)}>↓</button>
                </span>
              </div>
            );
          })}
          <p className="cue-hint pad">Hidden rows keep their screens; ⌘-click a recent to open it in its own window.</p>
        </div>
      )}
      <div className="section-label">Recents</div>
      {state.mode === "code" && (
        <div className="chips" role="group" aria-label="Filter sessions by status">
          {([["all", "All"], ["working", "Working"], ["done", "Done"], ["blocked", "Blocked"]] as const).map(([value, label]) => (
            <button key={value} className={statusFilter === value ? "chip on" : "chip"} onClick={() => setStatusFilter(value)}>{label}</button>
          ))}
        </div>
      )}
      <div className="thread-list">
        {threads.map((thread) => (
          <button
            key={thread.id}
            className={thread.id === state.activeThreadId && state.screen === "thread" ? "thread on" : "thread"}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey) {
                void window.modbitx?.popoutThread(thread.id);
                return;
              }
              dispatch({ type: "select", id: thread.id });
            }}
          >
            <span className="dot" style={{ background: thread.incognito ? "#8a7a62" : thread.starred ? "#c4552a" : "transparent" }} />
            <span className="thread-title">{thread.pinned ? "Pinned · " : ""}{thread.title}{thread.mode === "code" && thread.sessionStatus ? ` · ${statusLabel(thread.sessionStatus)}` : ""}</span>
          </button>
        ))}
        {threads.length === 0 && <div className="muted pad">Nothing in this mode yet.</div>}
      </div>
      <div className="sidebar-foot">
        <button className="ghost user-chip" onClick={() => dispatch({ type: "screen", screen: "settings", section: "preferences" })}>
          {state.settings.avatar
            ? <img className="avatar" src={state.settings.avatar} alt="" />
            : <span className="avatar">{state.settings.displayName.slice(0, 1).toUpperCase()}</span>}
          <span>{state.settings.displayName}<br /><span className="muted tiny">{state.settings.orgName} · {state.settings.plan}</span></span>
        </button>
        <button className="ghost" onClick={() => dispatch({ type: "sidebar" })}>{state.sidebarCollapsed ? "Expand" : "Collapse"}</button>
      </div>
    </aside>
  );
}
