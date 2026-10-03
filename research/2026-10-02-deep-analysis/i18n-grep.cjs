#!/usr/bin/env node
// Value-search over Claude Desktop i18n bundles.
// Usage: node i18n-grep.cjs <regex> [flags]
//   flags: -f file   load a specific json file (repeatable; default en-US.json + overrides + dynamic)
//          -k        match on key instead of value
//          -n N      cap output lines (default 400)
// Prints: value<TAB>key
const fs = require('fs');
const path = require('path');

const I18N = '/Users/mohsin/zee/Claude/Claude.app/Contents/Resources/ion-dist/i18n';

function flat(obj, out, prefix) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object') flat(v, out, key);
    else out.push([key, String(v)]);
  }
  return out;
}

const args = process.argv.slice(2);
const files = [];
let matchKey = false, cap = 400;
const pats = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '-f') files.push(args[++i]);
  else if (a === '-k') matchKey = true;
  else if (a === '-n') cap = parseInt(args[++i], 10);
  else pats.push(a);
}
if (!pats.length) { console.error('usage: i18n-grep.cjs <regex> [-k] [-n N] [-f file.json]'); process.exit(2); }

const targets = files.length ? files : [
  path.join(I18N, 'en-US.json'),
  path.join(I18N, 'en-US.overrides.json'),
  path.join(I18N, 'dynamic', 'en-US.json'),
];
const re = new RegExp(pats.join('|'), 'i');
const byVal = new Map(); // dedupe by value: en-US.json and dynamic/en-US.json share values
for (const f of targets) {
  if (!fs.existsSync(f)) continue;
  let json;
  try { json = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error('BAD JSON ' + f + ': ' + e.message); continue; }
  for (const [key, val] of flat(json, [], '')) {
    const hay = matchKey ? key : val;
    if (re.test(hay) && !byVal.has(val)) byVal.set(val, key);
  }
}
const lines = [...byVal].map(([v, k]) => v + '\t' + k);
if (lines.length > cap) {
  console.error(`[truncated: ${lines.length} matches, showing ${cap} — raise -n]`);
  process.stdout.write(lines.slice(0, cap).join('\n') + '\n');
} else {
  process.stdout.write(lines.join('\n') + (lines.length ? '\n' : ''));
}
