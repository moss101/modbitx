import type { Mode } from "./types";

/** Our policy on Jev 1.13 probabilities. These are not model defaults. */
export const SURFACE_CONFIDENCE = 0.6;
export const BROWSER_YES = 0.75;
export const COMPUTER_YES = 0.8;
export const FOLDER_YES = 0.7;
export const SIM_YES = 0.75;

export interface JevRoute {
  ok: boolean;
  reason?: string;
  model?: string;
  surface?: { choice: string; confidence: number };
  needsBrowser?: number;
  needsComputer?: number;
  needsFolder?: number;
  needsSimulator?: number;
}

export interface RouteDecision {
  mode: Mode;
  note: string;
  computerHint: boolean;
  folderHint: boolean;
  simulatorHint: boolean;
}

export function applyRoute(current: Mode, route: JevRoute): RouteDecision {
  let mode: Mode = current;
  if (route.surface && route.surface.confidence >= SURFACE_CONFIDENCE && isMode(route.surface.choice)) {
    mode = route.surface.choice;
  }
  const browser = route.needsBrowser ?? 0;
  const simulator = route.needsSimulator ?? 0;
  if ((browser >= BROWSER_YES || simulator >= SIM_YES) && mode === "chat") mode = "cowork";
  const computerHint = (route.needsComputer ?? 0) >= COMPUTER_YES;
  const folderHint = (route.needsFolder ?? 0) >= FOLDER_YES;
  const simulatorHint = simulator >= SIM_YES;
  const surface = route.surface ? `${route.surface.choice} ${Math.round(route.surface.confidence * 100)}%` : current;
  const note = `Jev ${route.model ?? "1.13"} · ${surface} · browser ${pct(browser)} · computer ${pct(route.needsComputer ?? 0)} · files ${pct(route.needsFolder ?? 0)} · simulator ${pct(simulator)}`;
  return { mode, note, computerHint, folderHint, simulatorHint };
}

function isMode(value: string): value is Mode {
  return value === "chat" || value === "cowork" || value === "code";
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
