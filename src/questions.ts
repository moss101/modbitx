/**
 * Structured ask_user questions, kept pure so a node check can drive the schema,
 * the normalization, and the answer round trip without a browser.
 */

export type QuestionKind = "text" | "choice" | "multi" | "scale";

export interface Question {
  prompt: string;
  kind: QuestionKind;
  /** Labels the user picks from. Empty for a free-text question. */
  options: string[];
  multi: boolean;
  min: number;
  max: number;
  step: number;
}

export const QUESTION_PROMPT_LIMIT = 500;
export const QUESTION_OPTION_LIMIT = 120;
export const QUESTION_OPTION_COUNT = 8;
const SCALE_STEPS_MAX = 20;

export interface RawQuestion {
  text?: string;
  message?: string;
  content?: string;
  kind?: string;
  options?: unknown;
  multi?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export type Normalized = { ok: true; question: Question } | { ok: false; error: string };

/** Option labels from the dedicated field, else one per line or pipe in content. */
function optionsFrom(raw: RawQuestion): string[] {
  const listed = Array.isArray(raw.options) ? raw.options : [];
  const source = listed.length
    ? listed.map((item) => String(item ?? ""))
    : String(raw.content || "").split(/\n|\|/);
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const item of source) {
    const label = item.trim().slice(0, QUESTION_OPTION_LIMIT);
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    labels.push(label);
    if (labels.length >= QUESTION_OPTION_COUNT) break;
  }
  return labels;
}

function whole(value: number | undefined, fallback: number): number {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Validates and normalizes a raw ask_user call. The kind follows the fields the
 * model sent: listed options mean a choice, multi means a multi-select, a range
 * means a scale, and anything else is a free-text question.
 */
export function normalizeQuestion(raw: RawQuestion): Normalized {
  const prompt = String(raw.text || raw.message || "").trim();
  if (!prompt) return { ok: false, error: "ask_user needs the question in text." };
  const kind = String(raw.kind || "").toLowerCase();
  const options = optionsFrom(raw);
  const wantsScale = kind === "scale" || (kind !== "choice" && kind !== "multi" && (raw.min !== undefined || raw.max !== undefined));
  if (wantsScale) {
    const min = whole(raw.min, 1);
    const max = whole(raw.max, min < 10 ? 10 : min + 9);
    const step = Math.max(1, whole(raw.step, 1));
    if (min >= max) return { ok: false, error: "A scale question needs max above min." };
    if ((max - min) / step > SCALE_STEPS_MAX) return { ok: false, error: "A scale question allows at most 20 steps between min and max." };
    return { ok: true, question: { prompt: prompt.slice(0, QUESTION_PROMPT_LIMIT), kind: "scale", options: [], multi: false, min, max, step } };
  }
  if (kind === "multi") {
    if (options.length < 2) return { ok: false, error: "A multi-select question needs at least two options." };
    return { ok: true, question: { prompt: prompt.slice(0, QUESTION_PROMPT_LIMIT), kind: "multi", options, multi: true, min: 0, max: 0, step: 0 } };
  }
  if (kind === "choice" || options.length >= 2) {
    if (options.length < 2) return { ok: false, error: "A choice question needs at least two options." };
    return { ok: true, question: { prompt: prompt.slice(0, QUESTION_PROMPT_LIMIT), kind: "choice", options, multi: false, min: 0, max: 0, step: 0 } };
  }
  return { ok: true, question: { prompt: prompt.slice(0, QUESTION_PROMPT_LIMIT), kind: "text", options: [], multi: false, min: 0, max: 0, step: 0 } };
}

/** One short line naming the shape, for the step list and the tool guide. */
export function describeQuestion(question: Question): string {
  switch (question.kind) {
    case "choice":
      return `single choice of ${question.options.length}`;
    case "multi":
      return `multi-select of ${question.options.length}`;
    case "scale":
      return `scale ${question.min} to ${question.max}`;
    default:
      return "free text";
  }
}

/**
 * The tool result the model reads. The renderer resolves the card with the raw
 * answer — a picked label, labels joined with ", ", the chosen number, or typed
 * text — and this turns that into a sentence that stands on its own.
 */
export function formatAnswer(question: Question, raw: string): string {
  const answer = String(raw || "").trim();
  if (!answer) return "(no answer)";
  switch (question.kind) {
    case "choice": {
      const picked = question.options.find((option) => option.toLowerCase() === answer.toLowerCase());
      return `You chose ${picked || answer}.`;
    }
    case "multi": {
      const parts = answer.split(/\s*,\s*/).filter(Boolean);
      const known = parts.every((part) => question.options.some((option) => option.toLowerCase() === part.toLowerCase()));
      return `You chose${known ? "" : " (answer as sent)"}: ${parts.join(", ")}.`;
    }
    case "scale": {
      const value = Number(answer);
      if (Number.isFinite(value) && value >= question.min && value <= question.max) {
        return `You answered ${value} on the ${question.min}–${question.max} scale.`;
      }
      return `You answered: ${answer}.`;
    }
    default:
      return `Answer: ${answer.slice(0, 2000)}`;
  }
}
