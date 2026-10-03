import { oneShot } from "./api";
import type { Settings } from "./types";

/**
 * Research mode: a multi-pass loop modeled on the Codex deep-research contract —
 * break the topic into sub-questions, gather sources for each, answer against
 * what the sources actually said, then compile a cited report. Pages arrive
 * through a caller-gated fetch hook, so host approvals stay with the session.
 */

export interface ResearchStep {
  question: string;
  status: "pending" | "doing" | "done" | "failed";
  answer: string;
  sources: ResearchSource[];
}

export interface ResearchSource {
  url: string;
  title: string;
}

export const RESEARCH_STEP_CAP = 5;
export const SOURCES_PER_STEP = 3;
export const PAGE_CONTEXT_CAP = 6000;

export function researchOutlinePrompt(topic: string): string {
  return [
    "Break this research topic into sub-questions.",
    `Topic: ${topic}`,
    "",
    `Return between 3 and ${RESEARCH_STEP_CAP} sub-questions as a JSON array of strings. No prose, no code fence.`,
    "Each sub-question must stand alone and cover a different part of the topic."
  ].join("\n");
}

/** Reads the outline reply into questions; tolerates a fenced or chatty answer. */
export function parseOutline(raw: string): string[] {
  const jsonMatch = /\[[\s\S]*\]/.exec(raw);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.replace(/\s+/g, " ").trim().slice(0, 220))
      .slice(0, RESEARCH_STEP_CAP);
  } catch {
    return [];
  }
}

/** Pulls http(s) URLs out of a model reply, de-duplicated, capped. */
export function parseUrls(raw: string): string[] {
  const seen: string[] = [];
  for (const match of raw.matchAll(/https?:\/\/[^\s"'<>)\]}]+/g)) {
    const url = match[0].replace(/[.,;:]+$/, "");
    if (!seen.some((item) => item === url)) seen.push(url);
    if (seen.length >= SOURCES_PER_STEP) break;
  }
  return seen;
}

export function researchSourcesPrompt(topic: string, question: string): string {
  return [
    `Research topic: ${topic}`,
    "",
    `Name up to ${SOURCES_PER_STEP} specific web pages (full https URLs) that would best answer this sub-question: ${question}`,
    "",
    "Return a JSON array of URL strings only. Prefer official documentation, standards, regulators, and primary sources. No prose."
  ].join("\n");
}

export function researchStepPrompt(topic: string, question: string, pages: { url: string; title: string; text: string }[]): string {
  const context = pages.length
    ? pages.map((page, index) => `[${index + 1}] ${page.title} — ${page.url}\n${page.text.slice(0, PAGE_CONTEXT_CAP)}`).join("\n\n")
    : "(no pages could be fetched; answer from what you know and say so)";
  return [
    `Research topic: ${topic}`,
    "",
    `Answer this sub-question concretely: ${question}`,
    "",
    "Fetched pages:",
    context,
    "",
    "Write 120–220 words. Ground every claim in the fetched pages where they speak, citing them as [1], [2] inline. State uncertainty plainly instead of guessing. Never invent a URL, number, or quotation."
  ].join("\n");
}

export function researchReportPrompt(topic: string, answers: { question: string; answer: string }[], ledger: ResearchSource[]): string {
  const material = answers
    .map((item) => `## ${item.question}\n${item.answer}`)
    .join("\n\n");
  const sources = ledger.map((source, index) => `${index + 1}. ${source.title} — ${source.url}`).join("\n");
  return [
    `Write the final research report for the topic: ${topic}`,
    "",
    "Material gathered so far:",
    material,
    "",
    [
      "Write the report in Markdown with this exact shape:",
      "A `# ` title naming the topic,",
      "a short **Summary** paragraph answering the topic directly,",
      "`## Findings` with the sub-questions as `### ` sections written as flowing prose (never copy the material verbatim),",
      "a `## What could not be verified` list naming claims a reader should double-check,",
      "a `## Sources` list of the numbered URLs below, and nothing else as sources.",
      "Keep the [n] citations inline where a claim rests on a source."
    ].join(" "),
    "",
    sources || "(no sources were fetched)"
  ].join("\n\n");
}

export interface ResearchEvents {
  onSteps: (steps: ResearchStep[]) => void;
  onReport: (partial: string) => void;
  shouldStop: () => boolean;
  /** Fetch a page after the caller has approved its host. Null means refused or failed. */
  fetchPage?: (url: string) => Promise<{ url: string; title: string; text: string } | null>;
}

export interface ResearchResult {
  ok: boolean;
  reason?: string;
  report?: string;
  steps?: ResearchStep[];
  ledger?: ResearchSource[];
}

async function gatherSources(topic: string, question: string, settings: Settings, events: ResearchEvents): Promise<{ url: string; title: string; text: string }[]> {
  if (!events.fetchPage) return [];
  let urls: string[] = [];
  try {
    const raw = await oneShot(settings, "You pick research sources. Reply with JSON only.", researchSourcesPrompt(topic, question), 300);
    urls = parseUrls(raw);
  } catch {
    return [];
  }
  const pages: { url: string; title: string; text: string }[] = [];
  for (const url of urls) {
    if (events.shouldStop()) break;
    const page = await events.fetchPage(url).catch(() => null);
    if (page?.text) pages.push(page);
    if (pages.length >= 2) break;
  }
  return pages;
}

/** Runs the whole loop. Streaming report text lands through onReport. */
export async function runResearch(topic: string, settings: Settings, events: ResearchEvents): Promise<ResearchResult> {
  const clean = topic.replace(/\s+/g, " ").trim().slice(0, 400);
  if (!clean) return { ok: false, reason: "Name a topic after /research." };

  let outline: string[] = [];
  try {
    const raw = await oneShot(settings, "You plan research. Reply with JSON only.", researchOutlinePrompt(clean), 400);
    outline = parseOutline(raw);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "The research outline failed." };
  }
  if (events.shouldStop()) return { ok: false, reason: "Research stopped before the first step." };
  if (!outline.length) return { ok: false, reason: "The model did not return a usable outline. Try again or reword the topic." };

  const steps: ResearchStep[] = outline.map((question) => ({ question, status: "pending", answer: "", sources: [] }));
  events.onSteps([...steps]);
  const ledger: ResearchSource[] = [];

  for (let index = 0; index < steps.length; index += 1) {
    if (events.shouldStop()) return { ok: false, reason: "Research stopped partway. The report was not written.", steps, ledger };
    steps[index] = { ...steps[index], status: "doing" };
    events.onSteps([...steps]);
    try {
      const pages = await gatherSources(clean, steps[index].question, settings, events);
      for (const page of pages) {
        if (!ledger.some((item) => item.url === page.url)) ledger.push({ url: page.url, title: page.title });
      }
      if (events.shouldStop()) return { ok: false, reason: "Research stopped partway. The report was not written.", steps, ledger };
      const answer = await oneShot(
        settings,
        "You are a careful researcher. Cite fetched pages inline and flag uncertainty.",
        researchStepPrompt(clean, steps[index].question, pages),
        900
      );
      steps[index] = { question: steps[index].question, status: "done", answer, sources: pages.map((page) => ({ url: page.url, title: page.title })) };
    } catch {
      steps[index] = { question: steps[index].question, status: "failed", answer: "", sources: [] };
    }
    events.onSteps([...steps]);
  }

  const done = steps.filter((step) => step.status === "done");
  if (!done.length) return { ok: false, reason: "Every research step failed. Check the provider key and try again.", steps, ledger };

  const report = await oneShot(
    settings,
    "You write tight, honest research reports in Markdown. Never invent sources.",
    researchReportPrompt(clean, done.map((step) => ({ question: step.question, answer: step.answer })), ledger),
    2400
  );
  if (events.shouldStop()) return { ok: false, reason: "Research stopped as the report finished.", steps, ledger };
  events.onReport(report);
  return { ok: true, report, steps, ledger };
}

/** The assistant message that carries the report into the thread as an artifact. */
export function researchMessage(report: string, stepCount: number, sourceCount: number): string {
  return [
    `Research finished — ${stepCount} step${stepCount === 1 ? "" : "s"}, ${sourceCount} source${sourceCount === 1 ? "" : "s"}, compiled into a report.`,
    "",
    "```markdown artifact title=\"Research report\"",
    report,
    "```"
  ].join("\n");
}
