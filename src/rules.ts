import { builtinCommands, parseCommandFile, type SlashCommand } from "./agent";

const RULE_FILES = ["AGENTS.md", "Agents.md", "CLAUDE.md", "CLAUDE.local.md", "AGENT.md"];
const RULE_DIRS = [".grok/rules", ".modbitx/rules"];
const COMMAND_DIRS = [".modbitx/commands", ".grok/commands"];

async function readText(file: string): Promise<string> {
  try {
    const text = await window.modbitx?.readFile(file);
    return typeof text === "string" ? text : "";
  } catch {
    return "";
  }
}

async function listSafe(dir: string): Promise<{ name: string; kind: "dir" | "file" }[]> {
  try {
    return (await window.modbitx?.listDir(dir)) || [];
  } catch {
    return [];
  }
}

export async function loadFolderPack(folder: string | undefined): Promise<{ rules: string; names: string[]; commands: SlashCommand[] }> {
  if (!folder || !window.modbitx) return { rules: "", names: [], commands: [] };
  const chunks: string[] = [];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const name of RULE_FILES) {
    const text = (await readText(`${folder}/${name}`)).trim();
    if (!text || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
    chunks.push(`# ${name}\n${text.slice(0, 4000)}`);
  }
  for (const dir of RULE_DIRS) {
    const entries = (await listSafe(`${folder}/${dir}`))
      .filter((entry) => entry.kind === "file" && entry.name.endsWith(".md"))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);
    for (const entry of entries) {
      const text = (await readText(`${folder}/${dir}/${entry.name}`)).trim();
      if (!text) continue;
      names.push(`${dir}/${entry.name}`);
      chunks.push(`# ${dir}/${entry.name}\n${text.slice(0, 2500)}`);
    }
  }
  const reserved = new Set(builtinCommands(true).map((command) => command.name));
  const commands: SlashCommand[] = [];
  for (const dir of COMMAND_DIRS) {
    const entries = (await listSafe(`${folder}/${dir}`))
      .filter((entry) => entry.kind === "file" && /\.md$/i.test(entry.name))
      .slice(0, 16);
    for (const entry of entries) {
      const name = entry.name.replace(/\.md$/i, "").toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (!name || reserved.has(name) || commands.some((command) => command.name === name)) continue;
      const text = await readText(`${folder}/${dir}/${entry.name}`);
      if (!text.trim()) continue;
      commands.push(parseCommandFile(name, text));
    }
  }
  return { rules: capRules(chunks), names, commands };
}

/** Keep the later rule files when the joined text is over the prompt cap. */
export function capRules(chunks: string[], limit = 8000): string {
  const kept: string[] = [];
  let used = 0;
  for (let index = chunks.length - 1; index >= 0; index -= 1) {
    const room = limit - used - (kept.length ? 2 : 0);
    if (room <= 0) break;
    const chunk = chunks[index];
    kept.unshift(chunk.length > room ? chunk.slice(chunk.length - room) : chunk);
    used += Math.min(chunk.length, room);
  }
  return kept.join("\n\n");
}

export async function listMentionPaths(folder: string | undefined): Promise<string[]> {
  if (!folder || !window.modbitx) return [];
  const root = folder;
  const out: string[] = [];
  const skip = new Set(["node_modules", "dist", ".git", "build", "coverage"]);
  async function walk(rel: string, depth: number) {
    if (out.length >= 80 || depth > 2) return;
    const entries = await listSafe(rel ? `${root}/${rel}` : root);
    for (const entry of entries) {
      if (entry.name.startsWith(".") || skip.has(entry.name)) continue;
      const next = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.kind === "dir") await walk(next, depth + 1);
      else out.push(next);
      if (out.length >= 80) return;
    }
  }
  await walk("", 0);
  return out;
}
