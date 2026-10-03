import { useEffect, useState } from "react";
import { ArtifactsPage, CustomizePage, DispatchPage, Palette, ProjectsPage, ScheduledPage, SettingsPage } from "./components/Pages";
import { Markdown } from "./components/Markdown";
import { Sidebar } from "./components/Sidebar";
import { ThreadView } from "./components/ThreadView";
import { handoffDecision, noticeTitle, taskDueOn, taskOutcome } from "./local-jobs";
import { runningBgTasks } from "./bgtasks";
import { hasProviderKey, warmProviderKeys } from "./providers";
import { SHORTCUTS } from "./shortcuts";
import { useStore } from "./store";
import type { Mode } from "./types";

export function App() {
  const params = new URLSearchParams(window.location.search);
  const quick = params.has("quick");
  const popout = params.has("popout") ? params.get("thread") : null;
  if (quick) return <QuickEntry />;
  if (popout) return <PopoutView threadId={popout} />;
  return <Shell />;
}

/** A session in its own window: a read-only viewer beside whatever the main window is doing. */
function PopoutView({ threadId }: { threadId: string }) {
  const { state } = useStore();
  const thread = state.threads.find((item) => item.id === threadId);
  useEffect(() => {
    document.title = thread ? `${thread.title} — Modbitx` : "Session — Modbitx";
  }, [thread?.title]);
  if (!thread) {
    return <div className="popout"><p className="muted">This session is not in the saved state. It may be incognito or deleted.</p></div>;
  }
  return (
    <div className="popout">
      <header className="popout-head">
        <div>
          <div className="kicker">{thread.mode}{thread.incognito ? " · incognito" : ""}</div>
          <strong>{thread.title}</strong>
        </div>
      </header>
      <div className="popout-scroll">
        {thread.messages.map((message) => (
          <article key={message.id} className={`msg ${message.role}`}>
            <Markdown text={message.content} />
            <div className="msg-actions popout-actions">
              <button onClick={() => void navigator.clipboard.writeText(message.content)}>Copy</button>
              {message.role === "assistant" && (
                <button onClick={() => void window.modbitx?.speak(message.content.slice(0, 2000), { voice: state.settings.speakVoice, rate: state.settings.speakRate })}>Speak</button>
              )}
            </div>
          </article>
        ))}
        {thread.messages.length === 0 && <p className="muted">Nothing said yet in this session.</p>}
      </div>
      <footer className="popout-foot">This window is a viewer. Send messages from the main window.</footer>
    </div>
  );
}

function Shell() {
  const { state, dispatch } = useStore();
  const [palette, setPalette] = useState(false);
  const [guide, setGuide] = useState(false);
  const [clock, setClock] = useState("");

  // ? opens the shortcut guide anywhere the user is not typing.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "?" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase() || "";
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;
      event.preventDefault();
      setGuide((open) => !open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const theme = state.settings.theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : state.settings.theme;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.font = state.settings.interfaceFont || "sans";
    document.documentElement.dataset.motion = state.settings.motion === "reduce" ? "reduce" : "system";
    document.documentElement.dataset.density = state.settings.density === "compact" ? "compact" : "comfortable";
    document.documentElement.style.setProperty("--text", `${state.settings.textScale}px`);
    // CDS measures: 40rem default (640px), 850px overview variant.
    const transcript = state.settings.transcriptWidth === "narrow" ? "560px" : state.settings.transcriptWidth === "wide" ? "850px" : "640px";
    document.documentElement.style.setProperty("--transcript", transcript);
    const family = (state.settings.codeFont || "").replace(/[^A-Za-z0-9 ._-]/g, "").trim().slice(0, 40);
    document.documentElement.style.setProperty("--mono", family ? `"${family}", ui-monospace, monospace` : '"IBM Plex Mono", ui-monospace, monospace');
  }, [state.settings.theme, state.settings.textScale, state.settings.interfaceFont, state.settings.transcriptWidth, state.settings.codeFont, state.settings.motion, state.settings.density]);

  useEffect(() => {
    // While-working keep-awake: a running turn keeps this Mac awake even when
    // the manual switch is off, mirroring the parent's battery-aware policy.
    const working = (state.runningThreadIds || []).length > 0 || runningBgTasks(state.bgTasks || []).length > 0;
    void window.modbitx?.applyDesktop({
      runOnStartup: state.settings.runOnStartup === true,
      menuBar: state.settings.menuBar !== false,
      keepAwake: state.settings.keepAwake === true || working,
      quickEntry: state.settings.quickEntry !== false,
      dictation: state.settings.dictation !== false
    });
  }, [state.settings.runOnStartup, state.settings.menuBar, state.settings.keepAwake, state.settings.quickEntry, state.settings.dictation, state.runningThreadIds, state.bgTasks]);

  useEffect(() => {
    const off = window.modbitx?.onMenu((channel, payload) => {
      if (channel === "menu:settings") dispatch({ type: "screen", screen: "settings", section: "preferences" });
      if (channel === "menu:new-chat") dispatch({ type: "new-thread", mode: state.mode });
      if (channel === "menu:incognito") dispatch({ type: "new-thread", incognito: true });
      if (channel === "menu:palette") setPalette(true);
      if (channel === "menu:find") window.dispatchEvent(new Event("modbitx-find"));
      if (channel === "menu:mode") dispatch({ type: "mode", mode: payload as Mode });
      if (channel === "menu:open-folder") {
        void window.modbitx?.chooseFolder().then((folder) => {
          if (folder) dispatch({ type: "new-thread", mode: "cowork", folder });
        });
      }
    });
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    const offQuick = window.modbitx?.onQuick((text) => {
      dispatch({ type: "new-thread", mode: "chat" });
      window.setTimeout(() => window.dispatchEvent(new CustomEvent("modbitx-prefill", { detail: text })), 30);
    });
    return () => { off?.(); offQuick?.(); window.removeEventListener("keydown", onKey); };
  }, [dispatch, state.mode]);

  useEffect(() => {
    const key = state.settings.browserPerSession ? (state.activeThreadId || "") : "";
    void window.modbitx?.setBrowserPartition?.(key);
  }, [state.settings.browserPerSession, state.activeThreadId]);

  useEffect(() => {
    void window.modbitx?.listConnectors?.().then((listed) => {
      if (listed?.items?.length) dispatch({ type: "merge-connectors", items: listed.items });
    });
    const off = window.modbitx?.onConnectors?.((items) => dispatch({ type: "merge-connectors", items }));
    void window.modbitx?.watchConnectors?.();
    return () => off?.();
  }, [dispatch]);

  // Plugin packages: folders under the app's plugins directory, watched for changes.
  useEffect(() => {
    void window.modbitx?.listPlugins?.().then((listed) => {
      if (listed?.items?.length) dispatch({ type: "merge-plugin-skills", items: listed.items });
      if (listed?.servers?.length) dispatch({ type: "merge-connectors", items: listed.servers });
    });
    const off = window.modbitx?.onPlugins?.((items, servers) => {
      dispatch({ type: "merge-plugin-skills", items });
      if (servers.length) dispatch({ type: "merge-connectors", items: servers });
    });
    void window.modbitx?.watchPlugins?.();
    return () => off?.();
  }, [dispatch]);

  useEffect(() => {
    void warmProviderKeys();
    void window.modbitx?.syncInfo().then((info) => {
      if (info?.pairing && info.pairing !== state.settings.pairingCode) {
        dispatch({ type: "settings", patch: { pairingCode: info.pairing } });
      }
      dispatch({ type: "server-note", note: info?.serverNote || "" });
    });
    const pull = window.setInterval(() => {
      void window.modbitx?.syncPull().then((items) => {
        for (const item of items) {
          const decision = handoffDecision(item || {});
          if (!decision) continue;
          if (decision.kind === "schedule") {
            const outcome = taskOutcome(decision.text, { hasKey: hasProviderKey(state.settings), desktopOpen: true });
            dispatch({
              type: "patch-task",
              id: decision.taskId || "",
              patch: { lastRun: item.at, lastNotice: outcome.status, lastNoticeAt: Date.now() }
            });
            void window.modbitx?.notify(noticeTitle(outcome.status, decision.title || "Schedule"), outcome.detail);
            if (outcome.status === "cant-run" || !decision.text) continue;
            dispatch({ type: "new-thread", mode: "cowork" });
            window.setTimeout(() => window.dispatchEvent(new CustomEvent("modbitx-prefill", { detail: decision.text })), 30);
            continue;
          }
          dispatch({
            type: "enqueue-dispatch",
            item: {
              id: `${decision.kind}-${item.at}`,
              text: decision.text,
              at: item.at,
              source: decision.kind,
              title: decision.kind === "chrome" ? decision.label : item.title,
              status: "waiting"
            }
          });
          void window.modbitx?.notify("Dispatch", decision.kind === "chrome" ? "A page arrived from Chrome." : "A task arrived from the pairing link.");
        }
      });
    }, 4000);
    const notices = window.setInterval(() => {
      void window.modbitx?.pullNotices?.().then((items) => {
        for (const item of items || []) {
          void window.modbitx?.notify(noticeTitle(item.status, item.title || "Schedule"), item.detail || "");
          if (item.taskId) {
            dispatch({
              type: "patch-task",
              id: item.taskId,
              patch: { lastNotice: item.status, lastNoticeAt: item.at || Date.now() }
            });
          }
        }
      });
    }, 15_000);
    return () => {
      window.clearInterval(pull);
      window.clearInterval(notices);
    };
  }, [dispatch, state.settings.pairingCode, state.settings.apiKey, state.settings.provider, state.settings.zcodeKey]);

  useEffect(() => {
    const tick = () => {
      if (state.settings.backgroundScheduler) return;
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);
      setClock(hhmm);
      for (const task of state.tasks) {
        if (!task.enabled || !taskDueOn(task.when, task.days, hhmm, now.getDay())) continue;
        const last = task.lastRun ? new Date(task.lastRun) : null;
        if (last && last.toDateString() === now.toDateString() && last.toTimeString().slice(0, 5) === hhmm) continue;
        const outcome = taskOutcome(task.prompt || "", { hasKey: hasProviderKey(state.settings), desktopOpen: true });
        dispatch({ type: "patch-task", id: task.id, patch: { lastRun: Date.now(), lastNotice: outcome.status, lastNoticeAt: Date.now() } });
        void window.modbitx?.notify(noticeTitle(outcome.status, task.name), outcome.detail);
        if (outcome.status === "cant-run") continue;
        dispatch({ type: "new-thread", mode: "cowork" });
        window.dispatchEvent(new CustomEvent("modbitx-prefill", { detail: task.prompt }));
      }
    };
    const id = window.setInterval(tick, 20_000);
    tick();
    return () => window.clearInterval(id);
  }, [state.tasks, state.settings.backgroundScheduler, state.settings.apiKey, state.settings.provider, state.settings.zcodeKey, dispatch]);

  useEffect(() => {
    const onKnowledge = (event: Event) => {
      const detail = (event as CustomEvent).detail as { projectId: string; files: { name: string; path: string; size: number; text: string }[] };
      const project = state.projects.find((item) => item.id === detail.projectId);
      if (!project) return;
      dispatch({
        type: "patch-project",
        id: project.id,
        patch: {
          knowledge: [
            ...project.knowledge,
            ...detail.files.map((file) => ({ id: file.path, name: file.name, path: file.path, size: file.size, text: file.text.slice(0, 20_000) }))
          ]
        }
      });
    };
    window.addEventListener("modbitx-knowledge", onKnowledge);
    return () => window.removeEventListener("modbitx-knowledge", onKnowledge);
  }, [state.projects, dispatch]);

  return (
    <div className="app">
      <Sidebar onPalette={() => setPalette(true)} />
      {state.screen === "thread" && <ThreadView />}
      {state.screen === "settings" && <SettingsPage />}
      {state.screen === "customize" && <CustomizePage />}
      {state.screen === "projects" && <ProjectsPage />}
      {state.screen === "artifacts" && <ArtifactsPage />}
      {state.screen === "scheduled" && <ScheduledPage />}
      {state.screen === "dispatch" && <DispatchPage />}
      {palette && <Palette onClose={() => setPalette(false)} />}
      {guide && <ShortcutsGuide onClose={() => setGuide(false)} />}
      <div className="clock" aria-hidden>{clock}</div>
    </div>
  );
}

/** The ?-key shortcut guide, in the palette's shape. */
function ShortcutsGuide({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-label="Keyboard shortcuts">
      <div className="palette shortcuts-guide" onClick={(event) => event.stopPropagation()}>
        <strong className="sg-title">Keyboard shortcuts</strong>
        <div className="palette-list">
          {SHORTCUTS.map((item) => (
            <div key={item.keys} className="sg-row">
              <span className="sg-what">{item.what}</span>
              <span className="sg-where">{item.where}</span>
              <kbd className="kbd">{item.keys}</kbd>
            </div>
          ))}
        </div>
        <p className="muted tiny pad">Press ? again to close.</p>
      </div>
    </div>
  );
}

function QuickEntry() {
  const [text, setText] = useState("");
  return (
    <div className="quick">
      <div className="kicker">Quick entry</div>
      <textarea autoFocus value={text} placeholder="Ask Modbitx" onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void window.modbitx?.submitQuick(text);
          }
          if (e.key === "Escape") void window.modbitx?.hideQuick();
        }}
      />
      <p className="muted">Enter opens it in the main window. Esc hides this panel.</p>
    </div>
  );
}
