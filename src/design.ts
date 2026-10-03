import { vizRuntime } from "./viz";

export interface DesignSystem {
  name: string;
  ink: string;
  paper: string;
  accent: string;
  font: "sans" | "serif" | "mono";
  radius: number;
  space: number;
  /** Short note about parts artifacts should repeat. Local only. */
  components: string;
}

export type DesignShare = "only-you" | "organization";

export interface DesignRecord extends DesignSystem {
  id: string;
  share: DesignShare;
  components: string;
}

export const PAPER_ID = "paper";

export const DEFAULT_DESIGN: DesignSystem = {
  name: "Paper",
  ink: "#1f1e1b",
  paper: "#faf9f5",
  accent: "#8d3b28",
  font: "sans",
  radius: 12,
  space: 16,
  components: ""
};

export interface ScoreAnswer {
  score: number;
  confidence: number;
  legend?: Record<string, string>;
}

export interface DesignJudgment {
  ok: boolean;
  reason?: string;
  model?: string;
  hierarchy?: ScoreAnswer;
  density?: ScoreAnswer;
  tokenFit?: ScoreAnswer;
  next?: { choice: string; confidence: number };
}

/** Below this, the review asks instead of shipping or revising. Our threshold, not a model default. */
export const DESIGN_CONFIDENCE = 0.55;

export function designFont(font: DesignSystem["font"]): string {
  if (font === "serif") return '"Newsreader", Palatino, serif';
  if (font === "mono") return '"IBM Plex Mono", ui-monospace, monospace';
  return 'Figtree, "Avenir Next", sans-serif';
}

export function designPrompt(design: DesignSystem): string {
  const components = (design.components || "").trim();
  const note = components ? ` Components to repeat: ${components.slice(0, 400)}.` : "";
  return `Design system "${design.name || "Untitled"}": ink ${design.ink}, paper ${design.paper}, accent ${design.accent}, type ${design.font}, radius ${design.radius}px, space ${design.space}px.${note} HTML artifacts should set CSS variables --ink, --paper, --accent, --radius, and --space from these values. A preview may call window.modbitxAsk(question) for one short plain-text answer. The question is limited to 500 characters. The preview has no tools and cannot browse or edit files.`;
}

export type TextSize = "small" | "medium" | "large";

/** Map a saved pixel size onto Small / Medium / Large. 14, 16, and 20 are the segment values. */
export function textSizeOf(scale: number): TextSize {
  if (!Number.isFinite(scale) || scale <= 15) return "small";
  if (scale >= 18) return "large";
  return "medium";
}

export function scaleOf(size: TextSize): number {
  if (size === "small") return 14;
  if (size === "large") return 20;
  return 16;
}

function hexColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function fontOf(value: unknown): DesignSystem["font"] {
  return value === "serif" || value === "mono" ? value : "sans";
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function cleanId(value: unknown, fallback: string): string {
  const id = String(value ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 32);
  return id || fallback;
}

export function designTokens(partial: Partial<DesignSystem> | undefined): DesignSystem {
  return {
    name: String(partial?.name ?? "").slice(0, 80),
    ink: hexColor(partial?.ink, DEFAULT_DESIGN.ink),
    paper: hexColor(partial?.paper, DEFAULT_DESIGN.paper),
    accent: hexColor(partial?.accent, DEFAULT_DESIGN.accent),
    font: fontOf(partial?.font),
    radius: clamp(partial?.radius, 0, 32, DEFAULT_DESIGN.radius),
    space: clamp(partial?.space, 4, 48, DEFAULT_DESIGN.space),
    components: String(partial?.components ?? "").slice(0, 500)
  };
}

export function designRecord(partial: Partial<DesignRecord> | undefined, fallbackId: string): DesignRecord {
  return {
    ...designTokens(partial),
    id: cleanId(partial?.id, fallbackId),
    share: partial?.share === "organization" ? "organization" : "only-you"
  };
}

export function paperDesign(): DesignRecord {
  return designRecord({ ...DEFAULT_DESIGN, id: PAPER_ID, share: "organization", components: "" }, PAPER_ID);
}

/** Systems shared with the local workspace. When none are shared, the whole library stays usable. */
export function organizationSystems(systems: DesignRecord[]): DesignRecord[] {
  const shared = systems.filter((item) => item.share === "organization");
  return shared.length ? shared : systems;
}

/** Members see the workspace library. Owners and admins also see systems marked just for them. */
export function designsForRole(systems: DesignRecord[], role: string | undefined): DesignRecord[] {
  if (role === "member") return organizationSystems(systems);
  return systems;
}

function uniqueRecords(records: DesignRecord[]): DesignRecord[] {
  const seen = new Set<string>();
  return records.map((record, index) => {
    let id = record.id || `ds-${index + 1}`;
    let n = 2;
    while (seen.has(id)) {
      const suffix = `-${n}`;
      id = `${(record.id || "ds").slice(0, 32 - suffix.length)}${suffix}`;
      n += 1;
    }
    seen.add(id);
    return id === record.id ? record : { ...record, id };
  });
}

/**
 * Keep the library and settings.design on the same default.
 * A token edit that does not replace the library updates the default record.
 */
export function settleDesign(
  current: { design: DesignSystem; designSystems?: DesignRecord[]; defaultDesignId?: string },
  patch: { design?: DesignSystem; designSystems?: DesignRecord[]; defaultDesignId?: string }
): { design: DesignSystem; designSystems: DesignRecord[]; defaultDesignId: string } {
  const listed = patch.designSystems ?? current.designSystems;
  let systems = uniqueRecords((Array.isArray(listed) ? listed : []).map((item, index) => designRecord(item, `ds-${index + 1}`)));
  if (!systems.length) systems = [paperDesign()];
  const requested = patch.defaultDesignId ?? current.defaultDesignId;
  let defaultDesignId = systems.some((item) => item.id === requested) ? String(requested) : systems[0].id;
  if (patch.design && !patch.designSystems) {
    systems = systems.map((item) => item.id === defaultDesignId
      ? designRecord({
          ...item,
          ...patch.design,
          components: patch.design?.components ?? item.components,
          id: item.id,
          share: item.share
        }, item.id)
      : item);
    systems = uniqueRecords(systems);
    if (!systems.some((item) => item.id === defaultDesignId)) defaultDesignId = systems[0].id;
  }
  const active = systems.find((item) => item.id === defaultDesignId) || systems[0];
  return { designSystems: systems, defaultDesignId: active.id, design: designTokens(active) };
}

function hex(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function previewDocument(content: string, design: DesignSystem): string {
  const ink = hex(design.ink, DEFAULT_DESIGN.ink);
  const paper = hex(design.paper, DEFAULT_DESIGN.paper);
  const accent = hex(design.accent, DEFAULT_DESIGN.accent);
  const radius = Math.min(32, Math.max(0, Number(design.radius) || 0));
  const space = Math.min(48, Math.max(4, Number(design.space) || 16));
  const bridge = `<script>window.modbitxAsk=function(prompt){return new Promise(function(resolve){var id=String(Date.now())+Math.random().toString(36).slice(2);function onMessage(event){var data=event.data||{};if(data.type!=="modbitx-answer"||data.id!==id)return;window.removeEventListener("message",onMessage);resolve(String(data.text||""))}window.addEventListener("message",onMessage);parent.postMessage({type:"modbitx-ask",id:id,prompt:String(prompt||"").slice(0,500)},"*")})}</script>`;
  const viz = vizRuntime();
  const style = `<style id="modbitx-design">:root{--ink:${ink};--paper:${paper};--accent:${accent};--radius:${radius}px;--space:${space}px;--font:${designFont(design.font)}}body{background:var(--paper);color:var(--ink);font-family:var(--font)}</style>${bridge}${viz}`;
  if (/<\/head>/i.test(content)) return content.replace(/<\/head>/i, `${style}</head>`);
  return `<!doctype html><html><head><meta charset="utf-8">${style}</head><body>${content}</body></html>`;
}

function scoreLine(name: string, answer: ScoreAnswer | undefined): string {
  if (!answer || typeof answer.score !== "number") return `${name}: unavailable`;
  const nearest = String(Math.max(0, Math.min(3, Math.round(answer.score))));
  const label = answer.legend?.[nearest] || "";
  return `${name}: ${answer.score.toFixed(2)}${label ? ` · ${label}` : ""}`;
}

/** Ask before treating a message as a visual to design. Modbitx policy, not a model default. */
export const DESIGN_NEED = 0.66;
/** Apply a chosen system only when the Choice is at least this concentrated. */
export const DESIGN_PICK_CONFIDENCE = 0.5;

export interface DesignPick {
  ok: boolean;
  reason?: string;
  model?: string;
  needsDesign?: number;
  system?: { choice: string; confidence: number };
}

export function activeDesign(
  settings: { design: DesignSystem; designSystems?: DesignRecord[]; defaultDesignId?: string },
  thread?: { designSystemId?: string },
  role?: string
): DesignSystem {
  const systems = designsForRole(settings.designSystems || [], role);
  const pinned = thread?.designSystemId ? systems.find((item) => item.id === thread.designSystemId) : undefined;
  if (pinned) return designTokens(pinned);
  const shared = organizationSystems(systems);
  const fallback = shared.find((item) => item.id === settings.defaultDesignId) || shared[0] || systems[0];
  return designTokens(fallback || settings.design);
}

/**
 * A locked chat keeps its system. Otherwise a design request with a confident
 * Choice adopts that system; a low score or a "keep" answer leaves the chat alone.
 */
export function applyDesignPick(input: {
  systems: { id: string; name: string }[];
  locked: boolean;
  currentId?: string;
  judgment: DesignPick;
}): { id?: string; note: string; apply: boolean } {
  if (input.locked) return { id: input.currentId, note: "", apply: false };
  if (!input.judgment.ok) {
    const reason = input.judgment.reason || "";
    const quiet = /not set|unavailable/i.test(reason);
    return { id: input.currentId, note: quiet ? "" : reason, apply: false };
  }
  if ((input.judgment.needsDesign ?? 0) < DESIGN_NEED) return { id: input.currentId, note: "", apply: false };
  const choice = input.judgment.system;
  const known = !!choice && input.systems.some((item) => item.id === choice.choice);
  const model = input.judgment.model || "jev-1.13.0";
  const confidence = choice?.confidence;
  const confident = typeof confidence === "number" && confidence >= DESIGN_PICK_CONFIDENCE;
  if (!choice || choice.choice === "keep" || !known || !confident) {
    const pct = Math.round((choice?.confidence || 0) * 100);
    return { id: input.currentId, note: `Jev ${model} left this chat on its current design system (${pct}% on the pick).`, apply: false };
  }
  const name = input.systems.find((item) => item.id === choice.choice)?.name || choice.choice;
  return {
    id: choice.choice,
    note: `Jev ${model} chose ${name} for this chat (${Math.round(choice.confidence * 100)}%).`,
    apply: input.currentId !== choice.choice
  };
}

export function interpretDesign(raw: DesignJudgment): { verdict: "ship" | "revise" | "ask"; lines: string[] } {
  if (!raw.ok) return { verdict: "ask", lines: [raw.reason || "Design review is unavailable."] };
  const choice = raw.next?.choice;
  const verdict = raw.next && raw.next.confidence >= DESIGN_CONFIDENCE && (choice === "ship" || choice === "revise" || choice === "ask")
    ? choice
    : "ask";
  return {
    verdict,
    lines: [
      `Jev ${raw.model || "jev-1.13.0"} · ${verdict} · ${Math.round((raw.next?.confidence || 0) * 100)}% confidence`,
      scoreLine("Hierarchy", raw.hierarchy),
      scoreLine("Density", raw.density),
      scoreLine("Tokens", raw.tokenFit)
    ]
  };
}
