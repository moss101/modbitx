import { completeTurn } from "./api";
import type { Connector, Message, Settings, Skill } from "./types";

/**
 * Background tasks: a side question runs as its own one-shot turn while the
 * open chat keeps working. No tools ride along — a background row can read its
 * own answer, be stopped, or be poured into the composer, but it never touches
 * the machine.
 */

export type BgTaskStatus = "running" | "done" | "stopped" | "error";

export interface BgTask {
  id: string;
  prompt: string;
  status: BgTaskStatus;
  answer: string;
  error?: string;
  createdAt: number;
  finishedAt?: number;
}

export function bgTaskTitle(prompt: string): string {
  const line = prompt.replace(/\s+/g, " ").trim();
  return line.length > 64 ? `${line.slice(0, 61)}…` : line || "Background task";
}

export interface BgRunContext {
  settings: Settings;
  skills: Skill[];
  connectors: Connector[];
  memories: string[];
  shouldStop: () => boolean;
  onDelta: (chunk: string) => void;
}

export interface BgRunResult {
  status: BgTaskStatus;
  answer: string;
  error?: string;
}

/** Runs one background turn to completion. Streaming text lands through onDelta. */
export async function runBgTask(task: BgTask, ctx: BgRunContext): Promise<BgRunResult> {
  const messages: Message[] = [{ id: task.id, role: "user", content: task.prompt, createdAt: task.createdAt }];
  try {
    const result = await completeTurn({
      settings: ctx.settings,
      messages,
      skills: ctx.skills,
      connectors: ctx.connectors,
      memories: ctx.memories,
      mode: "chat"
    }, ctx.onDelta, undefined, ctx.shouldStop);
    if (ctx.shouldStop()) return { status: "stopped", answer: result.content };
    const answer = result.content.trim();
    if (!answer) return { status: "error", answer: "", error: "The model returned nothing for this background task." };
    return { status: "done", answer };
  } catch (error) {
    return { status: "error", answer: "", error: error instanceof Error ? error.message.slice(0, 300) : "The background task failed." };
  }
}

/** Rows keep the newest first and cap the list so the panel stays readable. */
export function mergeBgTask(list: BgTask[], task: BgTask): BgTask[] {
  return [task, ...list.filter((item) => item.id !== task.id)].slice(0, 24);
}

export function patchBgTask(list: BgTask[], id: string, patch: Partial<BgTask>): BgTask[] {
  return list.map((item) => item.id === id ? { ...item, ...patch } : item);
}

export function finishedBgTasks(list: BgTask[]): BgTask[] {
  return list.filter((task) => task.status !== "running");
}

export function runningBgTasks(list: BgTask[]): BgTask[] {
  return list.filter((task) => task.status === "running");
}

/* ---- renderer-side runner ---- */

const stopped = new Set<string>();
type BgDispatch = (action: { type: "bg-patch"; id: string; patch: Partial<BgTask> }) => void;

/** Marks a running task as stopped; the in-flight turn ends at the next check. */
export function stopBgTask(id: string): void {
  stopped.add(id);
}

export function bgTaskStopRequested(id: string): boolean {
  return stopped.has(id);
}

/**
 * Runs one background task end to end, streaming its answer into the store as
 * it arrives. Lives outside React so closing the panel never kills the turn.
 */
export async function startBgTask(
  task: BgTask,
  ctx: Omit<BgRunContext, "shouldStop" | "onDelta">,
  dispatch: BgDispatch
): Promise<void> {
  stopped.delete(task.id);
  let latest = "";
  const result = await runBgTask(task, {
    ...ctx,
    shouldStop: () => stopped.has(task.id),
    onDelta: (chunk) => {
      latest += chunk;
      dispatch({ type: "bg-patch", id: task.id, patch: { answer: latest } });
    }
  });
  stopped.delete(task.id);
  dispatch({
    type: "bg-patch",
    id: task.id,
    patch: {
      status: result.status,
      answer: result.answer || latest,
      error: result.error,
      finishedAt: Date.now()
    }
  });
}
