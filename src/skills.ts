import type { Skill } from "./types";

export const SKILL_NAME_LIMIT = 60;
export const SKILL_INSTRUCTIONS_LIMIT = 4000;

/** Trim and cap an edited skill so one skill cannot crowd out the prompt. */
export function skillEdit(patch: { name?: string; instructions?: string }): { name?: string; instructions?: string } {
  const next: { name?: string; instructions?: string } = {};
  if (patch.name !== undefined) next.name = patch.name.trim().slice(0, SKILL_NAME_LIMIT);
  if (patch.instructions !== undefined) next.instructions = patch.instructions.trim().slice(0, SKILL_INSTRUCTIONS_LIMIT);
  return next;
}

/** The lines enabled skills add to the system prompt. api.ts sends exactly this. */
export function skillLines(skills: Skill[]): string[] {
  return skills.filter((skill) => skill.enabled).map((skill) => `- ${skill.name}: ${skill.instructions}`);
}

/** Characters the enabled skills add to every request. */
export function skillCharacters(skills: Skill[]): number {
  return skillLines(skills).join("\n").length;
}

export function enabledSkillCount(skills: Skill[]): number {
  return skills.filter((skill) => skill.enabled).length;
}

/** A bundled skill comes back on the next load, so it can be reset but not deleted. */
export function canDeleteSkill(skill: Skill): boolean {
  return !skill.bundled;
}

export function canResetSkill(skill: Skill): boolean {
  return skill.bundled;
}

/** Name, blurb, and instructions a bundled skill goes back to when it is reset. */
export function resetPatch(skill: Skill, seeds: Skill[]): { name: string; blurb: string; instructions: string } | null {
  const seed = seeds.find((item) => item.id === skill.id);
  if (!seed) return null;
  return { name: seed.name, blurb: seed.blurb, instructions: seed.instructions };
}

/** A short one-line preview of a skill's instructions for the list. */
export function skillPreview(instructions: string, width = 90): string {
  const text = String(instructions || "").replace(/\s+/g, " ").trim();
  if (text.length <= width) return text;
  return `${text.slice(0, width).trimEnd()}…`;
}
