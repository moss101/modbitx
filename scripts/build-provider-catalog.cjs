/**
 * Builds Modbitx's provider catalog from models.dev, the catalog opencode uses.
 * Writes src/provider-catalog.ts and electron/provider-env.cjs from one pass so the
 * key-variable allow-list can never drift from the catalog.
 */
const fs = require("fs");
const path = require("path");

const ROOT = "/Users/mohsin/zee/Claude/modbitx";
const data = JSON.parse(fs.readFileSync("/tmp/models.json", "utf8"));

const OPENAIISH = /^@ai-sdk\/openai(-compatible)?$/;
const MAX_MODELS = 8;
/** Chat models only: text in, text out, and not an image, audio, or embedding model. */
const NOT_CHAT = /(image|video|audio|whisper|tts|speech|transcri|embed|rerank|moderation|realtime|sora|dall-e|flux|guard|ocr)/i;

function chatModels(models) {
  return Object.entries(models)
    .filter(([id, model]) => {
      if (NOT_CHAT.test(id)) return false;
      const input = model?.modalities?.input || [];
      const output = model?.modalities?.output || [];
      return input.includes("text") && output.includes("text");
    })
    .map(([id, model]) => ({
      id,
      name: model.name || id,
      toolCall: model.tool_call === true,
      reasoning: model.reasoning === true,
      released: model.release_date || ""
    }))
    .sort((a, b) => Number(b.toolCall) - Number(a.toolCall)
      || Number(b.reasoning) - Number(a.reasoning)
      || b.released.localeCompare(a.released)
      || a.id.localeCompare(b.id))
    .slice(0, MAX_MODELS)
    .map(({ id, name }) => ({ id, name }));
}

/** Providers whose catalog entry uses a native SDK, so the endpoint is added by hand. */
const CURATED = [
  { id: "openai", api: "https://api.openai.com/v1" },
  { id: "anthropic", api: "https://api.anthropic.com/v1", note: "OpenAI-compatible endpoint" },
  { id: "google", api: "https://generativelanguage.googleapis.com/v1beta/openai", note: "OpenAI-compatible endpoint" },
  { id: "xai", api: "https://api.x.ai/v1" },
  { id: "groq", api: "https://api.groq.com/openai/v1" },
  { id: "mistral", api: "https://api.mistral.ai/v1" },
  { id: "cerebras", api: "https://api.cerebras.ai/v1" },
  { id: "perplexity", api: "https://api.perplexity.ai" },
  { id: "together", api: "https://api.together.xyz/v1", env: ["TOGETHER_API_KEY"] },
  { id: "openrouter", api: "https://openrouter.ai/api/v1", env: ["OPENROUTER_API_KEY"] },
  { id: "ollama", api: "http://127.0.0.1:11434/v1", env: ["OLLAMA_API_KEY"], local: true },
  { id: "llamacpp", api: "http://127.0.0.1:8080/v1", env: ["LLAMACPP_API_KEY"], local: true }
];

/** Extra key variables the same service accepts, so an existing setup keeps working. */
const EXTRA_ENV = { zai: ["ZCODE_API_KEY"] };
/** Names shown in the UI, so the product is recognisable. */
const NAME_OVERRIDE = {
  zai: "Z.ai (ZCode)",
  xai: "xAI (Grok)",
  google: "Google Gemini",
  together: "Together AI",
  openrouter: "OpenRouter",
  ollama: "Ollama (local)",
  llamacpp: "llama.cpp (local)",
  opencode: "OpenCode Zen",
  "opencode-go": "OpenCode Go",
  "github-copilot": "GitHub Copilot"
};

const rows = [];
for (const [id, provider] of Object.entries(data)) {
  if (!provider || !provider.models) continue;
  const curated = CURATED.find((item) => item.id === id);
  const usable = curated || (provider.api && OPENAIISH.test(provider.npm || ""));
  if (!usable) continue;
  const env = [...(curated?.env || provider.env || []), ...(EXTRA_ENV[id] || [])].slice(0, 2);
  if (!env.length) continue;
  const api = curated?.api || provider.api;
  const models = chatModels(provider.models);
  rows.push({
    id,
    name: NAME_OVERRIDE[id] || provider.name || id,
    env,
    api,
    models,
    note: curated?.note || "",
    local: Boolean(curated?.local) || /127\.0\.0\.1|localhost/.test(api)
  });
}

rows.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

/** Curated providers the catalog does not carry, such as local servers with no fixed models. */
for (const curated of CURATED) {
  if (rows.some((row) => row.id === curated.id)) continue;
  if (!curated.env) continue;
  rows.push({
    id: curated.id,
    name: NAME_OVERRIDE[curated.id] || curated.id,
    env: curated.env,
    api: curated.api,
    models: [],
    note: curated.note || "",
    local: Boolean(curated.local)
  });
}

const curatedOrder = CURATED.map((item) => item.id);
rows.sort((a, b) => {
  const left = curatedOrder.indexOf(a.id);
  const right = curatedOrder.indexOf(b.id);
  if (left >= 0 && right >= 0) return left - right;
  if (left >= 0) return -1;
  if (right >= 0) return 1;
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
});

const catalog = `/**
 * Generated from the models.dev catalog that opencode uses, by scripts/build-provider-catalog.cjs.
 * Each entry speaks the OpenAI chat-completions API at \`api\`. Providers marked with a note
 * reach that surface through the vendor's OpenAI-compatible endpoint.
 */
export interface CatalogModel {
  id: string;
  name: string;
}

export interface CatalogProvider {
  id: string;
  name: string;
  /** Key variables this provider reads, the first one preferred. */
  env: string[];
  api: string;
  models: CatalogModel[];
  note: string;
  local: boolean;
}

export const PROVIDER_CATALOG: CatalogProvider[] = ${JSON.stringify(rows, null, 2)};
`;

fs.writeFileSync(path.join(ROOT, "src", "provider-catalog.ts"), catalog);

const envNames = [...new Set(rows.flatMap((row) => row.env))].sort();
const envFile = `/**
 * Generated by scripts/build-provider-catalog.cjs. The renderer may read only these
 * key variables from this Mac's environment, one per catalog provider.
 */
module.exports = ${JSON.stringify(envNames, null, 2)};
`;
fs.writeFileSync(path.join(ROOT, "electron", "provider-env.cjs"), envFile);

console.log("providers:", rows.length, "env names:", envNames.length);
console.log("catalog bytes:", Buffer.byteLength(catalog), "env bytes:", Buffer.byteLength(envFile));
console.log("local providers:", rows.filter((row) => row.local).map((row) => row.id).join(", "));
console.log("first ten:", rows.slice(0, 10).map((row) => `${row.id}(${row.env[0]})`).join(", "));
