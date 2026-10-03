/** Combine the Code settings prefix with a branch leaf. Empty when the result is not a git branch name. */
export function branchName(prefix: string, leaf: string): string {
  const head = prefix.replace(/[^\w./-]/g, "").slice(0, 24);
  const tail = leaf.trim().replace(/[^\w./-]/g, "-").replace(/^-+/, "").slice(0, 60);
  const name = `${head}${tail}`.replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "");
  if (!/^[\w./-]{1,80}$/.test(name)) return "";
  return name;
}
