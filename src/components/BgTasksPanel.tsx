import { useState } from "react";
import { bgTaskTitle, finishedBgTasks, runningBgTasks, startBgTask, stopBgTask } from "../bgtasks";
import { memoryPromptLines } from "../memory";
import { useStore } from "../store";

/**
 * Background tasks panel: side questions that run as their own one-shot turn
 * while the open chat keeps working. Each row keeps what it was asked and what
 * it returned, so an answer can be copied or poured into the composer.
 */
export function BgTasksPanel({ onInsert }: { onInsert: (text: string) => void }) {
  const { state, dispatch } = useStore();
  const [draft, setDraft] = useState("");
  const running = runningBgTasks(state.bgTasks || []).length;

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

  return (
    <aside className="bg-tasks" aria-label="Background tasks">
      <header>
        <strong>Tasks{running ? ` · ${running} running` : ""}</strong>
        <div className="top-actions">
          <button
            className="ghost"
            onClick={() => dispatch({ type: "bg-clear-finished" })}
            disabled={finishedBgTasks(state.bgTasks || []).length === 0}
          >Clear done</button>
          <button className="ghost" onClick={() => dispatch({ type: "bg-open", open: false })} aria-label="Close tasks">×</button>
        </div>
      </header>
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
      <div className="bg-task-list">
        {(state.bgTasks || []).map((task) => (
          <div key={task.id} className={task.status === "running" ? "bg-task-row running" : "bg-task-row"}>
            <div className="bt-title">
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
        ))}
        {!state.bgTasks?.length && (
          <p className="muted pad">No background tasks yet. Ask one above; this chat keeps working while it runs.</p>
        )}
      </div>
    </aside>
  );
}
