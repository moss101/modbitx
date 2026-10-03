const path = require("path");
const fs = require("fs");

const HOOK_BINS = new Set(["node", "python3"]);
const EVAL_FLAGS = new Set([
  "-e", "-c", "--eval", "-p", "-r", "--require", "--loader", "--import", "--experimental-loader"
]);

function rootReal(root) {
  if (!root || !fs.existsSync(root)) return "";
  try {
    return fs.realpathSync(path.resolve(String(root)));
  } catch {
    return "";
  }
}

function realInside(root, candidate) {
  const resolved = path.resolve(root, String(candidate));
  let real = "";
  try {
    real = fs.realpathSync(resolved);
  } catch {
    return "";
  }
  if (real !== root && !real.startsWith(root + path.sep)) return "";
  return real;
}

function prepareHook(root, command, args) {
  const base = rootReal(root);
  if (!base) return { ok: false, code: 2, stderr: "Choose a folder before running a hook." };
  const binName = String(command || "");
  let bin = binName;
  if (!HOOK_BINS.has(binName)) {
    const lexical = path.resolve(base, binName);
    const inside = lexical === base || lexical.startsWith(base + path.sep);
    if (!inside) return { ok: false, code: 2, stderr: "Hook command is outside the granted folder." };
    const resolved = realInside(base, binName);
    if (!resolved) {
      return {
        ok: false,
        code: fs.existsSync(lexical) ? 2 : 1,
        stderr: fs.existsSync(lexical) ? "Hook command is outside the granted folder." : "Hook command was not found."
      };
    }
    if (!fs.statSync(resolved).isFile()) return { ok: false, code: 2, stderr: "Hook command is not a file inside the granted folder." };
    bin = resolved;
  }
  const argv = [];
  let script = false;
  for (const arg of (Array.isArray(args) ? args : []).slice(0, 8)) {
    const text = String(arg);
    const flag = text.split("=")[0];
    if (text === "-" || EVAL_FLAGS.has(flag) || flag.startsWith("--eval")) {
      return { ok: false, code: 2, stderr: "Hook eval flags are not run." };
    }
    if (text.startsWith("-")) {
      if (text.includes("=") || /[/\\]|\.\./.test(text)) {
        return { ok: false, code: 2, stderr: "Hook flags cannot name a path or a payload." };
      }
      argv.push(text.slice(0, 80));
      continue;
    }
    const lexical = path.resolve(base, text);
    const inside = lexical === base || lexical.startsWith(base + path.sep);
    if (!inside) return { ok: false, code: 2, stderr: "Hook arguments must be files inside the granted folder." };
    const file = realInside(base, text);
    if (!file || !fs.statSync(file).isFile()) {
      return { ok: false, code: 2, stderr: "Hook arguments must be files inside the granted folder." };
    }
    argv.push(file);
    script = true;
  }
  if (HOOK_BINS.has(binName) && !script) {
    return { ok: false, code: 2, stderr: "A node or python3 hook needs a script inside the granted folder." };
  }
  return { ok: true, bin, argv, cwd: base };
}

module.exports = { prepareHook };
