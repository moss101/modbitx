/**
 * Persistent command approval rules, modeled on the execpolicy layer both
 * reference apps run (Codex's Starlark Allow/Prompt/Forbidden prefix rules;
 * Claude's saved "Always allow" choices). A rule is a word-prefix pattern over
 * the command with a verdict: allow runs it without a prompt, deny refuses it
 * outright, and no matching rule falls through to the session's permission
 * mode. The last matching rule wins, so later entries can carve exceptions.
 */

export interface CommandRule {
  id: string;
  pattern: string;
  verdict: "allow" | "deny";
  createdAt: number;
}

/** True when the command's leading words start with the rule's words. */
export function ruleMatches(pattern: string, command: string): boolean {
  const words = pattern.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const parts = command.trim().toLowerCase().split(/\s+/);
  if (parts.length < words.length) return false;
  return words.every((word, index) => parts[index] === word);
}

/** The verdict of the last matching rule, or null when nothing matches. */
export function verdictFor(rules: CommandRule[], command: string): "allow" | "deny" | null {
  let verdict: "allow" | "deny" | null = null;
  for (const rule of rules) {
    if (ruleMatches(rule.pattern, command)) verdict = rule.verdict;
  }
  return verdict;
}

/**
 * Derives a rule from an approval detail like "run npm install" — the
 * command's first word becomes the pattern, mirroring how Codex's prefix
 * rules are suggested from an approval.
 */
export function ruleFromAction(detail: string): CommandRule | null {
  const match = /^run\s+(.+)/i.exec(String(detail || "").trim());
  const command = match?.[1]?.trim();
  if (!command) return null;
  const first = command.split(/\s+/)[0].toLowerCase();
  if (!first || first.length > 24 || !/^[a-z0-9._/-]+$/.test(first)) return null;
  return { id: `rule-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`, pattern: first, verdict: "allow", createdAt: Date.now() };
}

/** Rules are capped so a runaway session cannot fill the save. */
export function addRule(rules: CommandRule[], rule: CommandRule): CommandRule[] {
  if (rules.some((existing) => existing.pattern === rule.pattern && existing.verdict === rule.verdict)) return rules;
  return [...rules, rule].slice(-64);
}
