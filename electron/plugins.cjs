/** Plugin package loader — no Electron dependency, so the checks can exercise it directly. */
const fs = require("fs");
const path = require("path");

function pluginDir(userData) {
  return path.join(userData, "plugins");
}

/** Parses SKILL.md frontmatter (name, description) plus the instruction body. */
function parseSkillMd(raw) {
  const text = String(raw || "");
  const wrapped = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  let name = "";
  let blurb = "";
  let body = text.trim();
  if (wrapped) {
    const nameMatch = /name:\s*(.+)/.exec(wrapped[1]);
    const descMatch = /description:\s*(.+)/.exec(wrapped[1]);
    name = nameMatch ? nameMatch[1].trim().slice(0, 80) : "";
    blurb = descMatch ? descMatch[1].trim().slice(0, 240) : "";
    body = wrapped[2].trim();
  }
  return { name, blurb, body: body.slice(0, 40_000) };
}

function readPluginSkills(dir) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  for (const pluginName of fs.readdirSync(dir)) {
    const pluginRoot = path.join(dir, pluginName);
    if (!fs.statSync(pluginRoot).isDirectory()) continue;
    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(path.join(pluginRoot, "plugin.json"), "utf8"));
    } catch { /* a folder without plugin.json is not a package */ continue; }
    const skillsRoot = path.join(pluginRoot, "skills");
    if (!fs.existsSync(skillsRoot)) continue;
    for (const skillName of fs.readdirSync(skillsRoot)) {
      const skillFile = path.join(skillsRoot, skillName, "SKILL.md");
      if (!fs.existsSync(skillFile)) continue;
      try {
        const parsed = parseSkillMd(fs.readFileSync(skillFile, "utf8"));
        const id = `plugin:${String(meta.name || pluginName).toLowerCase().replace(/[^a-z0-9-]/g, "")}:${skillName.toLowerCase().replace(/[^a-z0-9-]/g, "")}`.slice(0, 90);
        if (!parsed.body.trim()) continue;
        found.push({
          id,
          name: parsed.name || skillName,
          blurb: parsed.blurb || String(meta.description || "").slice(0, 240) || `Skill from the ${meta.name || pluginName} plugin.`,
          instructions: parsed.body
        });
      } catch { /* unreadable skill */ }
    }
  }
  return found.slice(0, 60);
}

/** MCP servers a package declares in .mcp.json ({"mcpServers": {"name": {"command", "args"}}}). */
function readPluginServers(dir) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  for (const pluginName of fs.readdirSync(dir)) {
    const pluginRoot = path.join(dir, pluginName);
    if (!fs.statSync(pluginRoot).isDirectory()) continue;
    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(path.join(pluginRoot, "plugin.json"), "utf8"));
    } catch { continue; }
    let config = null;
    try {
      config = JSON.parse(fs.readFileSync(path.join(pluginRoot, ".mcp.json"), "utf8"));
    } catch { continue; }
    const servers = config && typeof config === "object" ? config.mcpServers || config : null;
    if (!servers || typeof servers !== "object") continue;
    for (const [serverName, server] of Object.entries(servers)) {
      const spec = server || {};
      const command = [spec.command, ...(Array.isArray(spec.args) ? spec.args : [])]
        .filter((part) => typeof part === "string" && part)
        .join(" ")
        .slice(0, 400);
      if (!command) continue;
      const id = `plugin-${String(meta.name || pluginName).toLowerCase().replace(/[^a-z0-9-]/g, "")}-${String(serverName).toLowerCase().replace(/[^a-z0-9-]/g, "")}`.slice(0, 60);
      found.push({
        id,
        name: `${meta.name || pluginName} · ${serverName}`,
        command,
        version: 1,
        blurb: `MCP server from the ${meta.name || pluginName} plugin package. Start it from Developer.`
      });
    }
  }
  return found.slice(0, 30);
}

module.exports = { pluginDir, parseSkillMd, readPluginSkills, readPluginServers };
