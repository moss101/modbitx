import { useEffect, useState } from "react";
import { bgTaskTitle, finishedBgTasks, runningBgTasks, startBgTask, stopBgTask } from "../bgtasks";
import { memoryPromptLines } from "../memory";
import { useStore } from "../store";

/**
 * The agents panel: everything working beside the open chat in one place —
 * running threads, background tasks and dynamic-workflow subagents (with
 * per-row ask/answer and stop), and the task VM.
 */
export function BgTasksPanel({ onInsert }: { onInsert: (text: string) => void }) {
  const { state, dispatch } = useStore();
  const [draft, setDraft] = useState("");
  const [vm, setVm] = useState<{ running: boolean; supported: boolean; prepared: boolean } | null>(null);
  const running = runningBgTasks(state.bgTasks || []).length;
  const runningThreads = (state.runningThreadIds || []).filter((id) => id !== state.activeThreadId);
  const subagents = (state.bgTasks || []).filter((task) => task.origin === "subagent");
  const plain = (state.bgTasks || []).filter((task) => task.origin !== "subagent");

  useEffect(() => {
    void window.modbitx?.vmStatus?.().then(setVm);
  }, [state.bgTasks]);

  function ask() {
    const prompt = draft.trim();
    if (!prompt) return;
    const task = {
      id: `bg-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`,
      prompt,
      status: "running" as const,
      answer: "",
      createdAt: Date.now()
    };
    dispatch({ type: "bg-start", task });
    setDraft("");
    void startBgTask(task, {
      settings: state.settings,
      skills: state.skills.filter((skill) => skill.enabled),
      connectors: state.connectors,
      memories: memoryPromptLines(state.memories)
    }, dispatch);
  }

  const row = (task: { id: string; prompt: string; status: string; answer: string; error?: string; origin?: string }) => (
    <div key={task.id} className={task.status === "running" ? "bg-task-row running" : "bg-task-row"}>
      <div className="bt-title">
        {task.origin === "subagent" && <span className="pill" style={{ marginRight: 6 }}>subagent</span>}
        <span className="dot" aria-hidden style={{ background: task.status === "running" ? "var(--cds-clay)" : task.status === "error" ? "var(--warn)" : "var(--ok)" }} />
        <span>{bgTaskTitle(task.prompt)}</span>
      </div>
      {task.status === "running" && <div className="stream-indicator"><span className="stream-dot" aria-hidden />Working</div>}
      {task.status === "error" && <p className="bt-ask" style={{ color: "var(--warn)" }}>{task.error || "This task failed."}</p>}
      {!task.answer && task.status === "running" ? null : <pre className="bt-ask">{task.prompt}</pre>}
      {task.answer && <pre className="bt-answer">{task.answer}</pre>}
      <div className="bt-actions">
        {task.status === "running" && (
          <button className="ghost" onClick={() => stopBgTask(task.id)}>Stop</button>
        )}
        {task.answer && (
          <>
            <button className="ghost" onClick={() => void navigator.clipboard.writeText(task.answer)}>Copy</button>
            <button className="ghost" onClick={() => onInsert(task.answer)}>Use in chat</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <aside className="bg-tasks" aria-label="Agents">
      <header>
        <strong>Agents{running || runningThreads.length ? ` · ${running + runningThreads.length} working` : ""}</strong>
        <div className="top-actions">
          <button
            className="ghost"
            onClick={() => dispatch({ type: "bg-clear-finished" })}
            disabled={finishedBgTasks(state.bgTasks || []).length === 0}
          >Clear done</button>
          <button className="ghost" onClick={() => dispatch({ type: "bg-open", open: false })} aria-label="Close agents">×</button>
        </div>
      </header>
      {runningThreads.length > 0 && (
        <div className="bt-threads">
          <span className="dock-caption">Running threads</span>
          {runningThreads.map((id) => {
            const thread = state.threads.find((item) => item.id === id);
            return (
              <button key={id} className="ghost" onClick={() => dispatch({ type: "select", id })}>
                <span className="dot" aria-hidden style={{ background: "var(--cds-clay)" }} />
                {thread?.title || "Working thread"}
              </button>
            );
          })}
        </div>
      )}
      {vm?.supported && (
        <div className="bt-threads">
          <span className="dock-caption">Task VM</span>
          <div className="inline">
            <span>{vm.running ? "Running" : vm.prepared ? "Prepared, stopped" : "Not prepared"}</span>
            <span className="spacer" />
            {vm.running
              ? <button className="ghost" onClick={() => { void window.modbitx?.vmStop?.().then(() => void window.modbitx?.vmStatus?.().then(setVm)); }}>Stop VM</button>
              : <button className="ghost" onClick={() => { void window.modbitx?.vmBoot?.().then(() => void window.modbitx?.vmStatus?.().then(setVm)); }}>Boot VM</button>}
          </div>
        </div>
      )}
      <div className="bg-task-compose">
        <textarea
          aria-label="Ask a background task"
          placeholder="Ask a side question. It runs while this chat keeps working."
          value={draft}
          rows={2}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(); }
          }}
        />
        <button className="send" onClick={ask} disabled={!draft.trim()}>Run</button>
      </div>
      {subagents.length > 0 && <span className="dock-caption" style={{ padding: "4px 8px 0" }}>Subagents</span>}
      <div className="bg-task-list">
        {subagents.map(row)}
        {plain.length > 0 && <span className="dock-caption" style={{ padding: "4px 8px 0" }}>Tasks</span>}
        {plain.map(row)}
        {!state.bgTasks?.length && (
          <p className="muted pad">No agents yet. Ask a side question above, or let the model fan out subagents — this chat keeps working while they run.</p>
        )}
      </div>
    </aside>
  );
}
