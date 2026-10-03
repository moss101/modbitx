/** Thresholds for Jev 1.13 browser judgments. These are Modbitx policy, not model defaults. */
export const DONE_YES = 0.8;
export const COMMIT_HOLD = 0.7;
export const ACTION_CONFIDENCE = 0.42;
export const SITE_RISK = 0.72;
export const MAX_BROWSER_STEPS = 5;

export interface PageNode {
  tag: string;
  type?: string;
  name?: string;
  text?: string;
  href?: string;
}

export interface PageControl {
  id: string;
  kind: "field" | "button" | "link";
  label: string;
}

export interface BrowserOption {
  key: string;
  description: string;
}

export interface BrowserJudgment {
  ok: boolean;
  reason?: string;
  model?: string;
  done?: number;
  commits?: number;
  action?: { choice: string; confidence: number };
}

export type BrowserDecision =
  | { type: "done"; reason: string }
  | { type: "ask"; reason: string }
  | { type: "confirm"; choice: string; reason: string }
  | { type: "act"; choice: string };

export interface HarnessCall {
  tool: string;
  text?: string;
  selector?: string;
  key?: string;
  y?: number;
}

export function controlsFromDom(nodes: PageNode[]): PageControl[] {
  const controls: PageControl[] = [];
  for (const node of nodes) {
    const tag = node.tag.toLowerCase();
    const type = (node.type || "").toLowerCase();
    const label = (node.text || node.name || node.href || "").trim().slice(0, 80);
    if (!label) continue;
    if (tag === "textarea" || (tag === "input" && !["submit", "button", "hidden", "checkbox", "radio", "file", "image"].includes(type))) {
      controls.push({ id: `c${controls.length}`, kind: "field", label });
    } else if (tag === "a") {
      controls.push({ id: `c${controls.length}`, kind: "link", label });
    } else if (tag === "button" || (tag === "input" && ["submit", "button"].includes(type))) {
      controls.push({ id: `c${controls.length}`, kind: "button", label });
    }
    if (controls.length >= 12) break;
  }
  return controls;
}

export function valuesInGoal(goal: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const re = /"([^"]{1,80})"|'([^']{1,80})'|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(goal))) {
    const value = (match[1] || match[2] || match[3] || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    found.push(value);
    if (found.length >= 4) break;
  }
  return found;
}

export function browserOptions(controls: PageControl[], values: string[]): BrowserOption[] {
  const options: BrowserOption[] = [
    { key: "stop", description: "The goal is already done, or none of the listed controls should be used." },
    { key: "scroll", description: "The goal is probably farther down the page, and none of the listed controls is the right one." },
    { key: "press", description: "Press Enter in the focused field or form." }
  ];
  for (const control of controls) {
    if (control.kind === "field") {
      values.forEach((value, index) => {
        options.push({
          key: `fill:${control.id}:${index}`,
          description: `Type "${value}" into the field "${control.label}".`
        });
      });
    } else {
      options.push({
        key: `click:${control.id}`,
        description: `Activate the ${control.kind} labeled "${control.label}".`
      });
    }
  }
  return options;
}

export function decideBrowserStep(judgment: BrowserJudgment, options: string[]): BrowserDecision {
  if (!judgment.ok) return { type: "ask", reason: judgment.reason || "Jev could not judge this page." };
  if ((judgment.done ?? 0) >= DONE_YES) return { type: "done", reason: "The page matches the goal." };
  const choice = judgment.action?.choice || "stop";
  const confidence = judgment.action?.confidence ?? 0;
  if (!options.includes(choice)) return { type: "ask", reason: `Jev chose ${choice}, which is not on this page.` };
  if (choice === "stop") return { type: "done", reason: "No further page action." };
  if (choice !== "scroll" && confidence < ACTION_CONFIDENCE) {
    return { type: "ask", reason: `Uncertain which control to use (${Math.round(confidence * 100)}% confidence).` };
  }
  if ((judgment.commits ?? 0) >= COMMIT_HOLD && (choice === "press" || choice.startsWith("click:"))) {
    return { type: "confirm", choice, reason: "This action may submit, pay, send, or delete." };
  }
  return { type: "act", choice };
}

export function actionToCall(choice: string, controls: PageControl[], values: string[]): HarnessCall | null {
  if (choice === "scroll") return { tool: "page_scroll", y: 700 };
  if (choice === "press") return { tool: "page_press", key: "Enter" };
  const click = /^click:(c\d+)$/.exec(choice);
  if (click) {
    const control = controls.find((item) => item.id === click[1]);
    return control ? { tool: "page_click", text: control.label } : null;
  }
  const fill = /^fill:(c\d+):(\d+)$/.exec(choice);
  if (fill) {
    const control = controls.find((item) => item.id === fill[1]);
    const value = values[Number(fill[2])];
    return control && value ? { tool: "page_fill", selector: `label:${control.label}`, text: value } : null;
  }
  return null;
}

export function markHighRisk(risk: number): boolean {
  return risk >= SITE_RISK;
}

export function siteGate(input: {
  explicit: boolean;
  blocked: boolean;
  high: boolean;
  persisted: boolean;
  session: boolean;
  sameHost: boolean;
}): "block" | "allow" | "ask" {
  if (input.blocked) return "block";
  if (input.sameHost && !(input.high && input.explicit)) return "allow";
  if (!input.high && (input.session || input.persisted)) return "allow";
  return "ask";
}
