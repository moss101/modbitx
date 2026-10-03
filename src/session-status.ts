/**
 * A label is shown only when the Choice is at least this concentrated.
 * This is the same display bar as design review. It does not change plan or review thresholds.
 * A flatter distribution stays unclassified.
 */
export const SESSION_STATUS_CONFIDENCE = 0.55;

export type SessionLabel = "blocked" | "ready" | "done" | "working" | "unclassified";

export function applySessionStatus(
  ok: boolean,
  answer?: { choice?: string; confidence?: number }
): SessionLabel {
  if (!ok || !answer) return "unclassified";
  const choice = answer.choice;
  if (choice !== "blocked" && choice !== "ready" && choice !== "done" && choice !== "working") return "unclassified";
  if ((answer.confidence ?? 0) < SESSION_STATUS_CONFIDENCE) return "unclassified";
  return choice;
}

export function statusLabel(status: SessionLabel | undefined): string {
  if (status === "blocked") return "Blocked";
  if (status === "ready") return "Ready for review";
  if (status === "done") return "Done";
  if (status === "working") return "Working";
  return "Unclassified";
}
