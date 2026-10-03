import { interpretHook } from "./agent";

interface HookConfig {
  events?: Record<string, HookGroup[]>;
  PreToolUse?: HookGroup[];
  SessionStart?: HookGroup[];
}

interface HookGroup {
  matcher?: string;
  hooks?: { type?: string; command?: string; args?: string[]; timeoutMs?: number }[];
}

export async function runProjectHooks(
  folder: string,
  eventName: "PreToolUse" | "SessionStart",
  payload: Record<string, unknown>
): Promise<{ decision: "allow" | "deny" | "ask" | "none"; reason: string; context: string }> {
  const empty = { decision: "none" as const, reason: "", context: "" };
  if (!window.modbitx?.hookExec) return empty;
  let config: HookConfig;
  try {
    const raw = await window.modbitx.readFile(`${folder}/.modbitx/hooks.json`);
    if (!raw.trim()) return empty;
    config = JSON.parse(raw) as HookConfig;
  } catch {
    return empty;
  }
  const groups = config.events?.[eventName] || config[eventName] || [];
  if (!Array.isArray(groups) || groups.length === 0) return empty;
  const subject = eventName === "PreToolUse" ? String(payload.tool || "") : String(payload.source || "");
  let context = "";
  let explicitAllow = false;
  for (const group of groups.slice(0, 8)) {
    if (group?.matcher) {
      try {
        if (!new RegExp(group.matcher).test(subject)) continue;
      } catch {
        continue;
      }
    }
    for (const hook of (group?.hooks || []).slice(0, 4)) {
      if (hook?.type && hook.type !== "process") continue;
      const command = String(hook?.command || "");
      if (!command) continue;
      const args = Array.isArray(hook?.args) ? hook.args.map(String).slice(0, 8) : [];
      const ran = await window.modbitx.hookExec(folder, command, args, payload, Number(hook?.timeoutMs) || 5000);
      const judged = interpretHook(ran.code, ran.stdout, ran.stderr);
      if (judged.context) context = `${context}\n${judged.context}`.trim();
      if (judged.decision === "allow") explicitAllow = true;
      if (judged.decision === "deny" || judged.decision === "ask") return { ...judged, context };
    }
  }
  return { decision: explicitAllow ? "allow" : "none", reason: "", context };
}
