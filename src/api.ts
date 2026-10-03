import { localCompact } from "./agent";
import { effortGuide } from "./catalog";
import { designPrompt } from "./design";
import { toolGuide, type ToolCall, type ToolResult } from "./tools";
import { activeKey, activeProvider, providerBaseUrl, settledModel } from "./providers";
import { skillLines } from "./skills";
import { connectorLines } from "./local-jobs";
import type { Attachment, Connector, Message, Settings, Skill } from "./types";

export interface TurnInput {
  settings: Settings;
  messages: Message[];
  skills: Skill[];
  connectors: Connector[];
  memories: string[];
  projectInstructions?: string;
  projectRules?: string;
  focusSkill?: Skill;
  planMode?: boolean;
  approvedPlan?: string;
  folderListing?: string;
  mode: string;
  routeNote?: string;
}

export function systemPrompt(input: TurnInput): string {
  const skills = skillLines(input.skills).join("\n");
  const memory = input.settings.memoryOn && input.memories.length
    ? input.memories.map((m) => `- ${m}`).join("\n")
    : "(memory off or empty)";
  const orgNotes = (input.settings.orgMemories || []).map((note) => note.text).filter(Boolean);
  const orgMemory = input.settings.orgMemoryOn
    ? `Memory for people on this Mac’s workspace:\n${orgNotes.length ? orgNotes.map((text) => `- ${text}`).join("\n") : "(none)"}`
    : "";
  return [
    "You are Modbitx, a local desktop assistant with your own identity. Never claim to be, or speak for, another product or company.",
    `Model preference: ${input.settings.model}. Effort: ${input.settings.effort}. ${effortGuide(input.settings.effort)}`,
    `Surface: ${input.mode}.`,
    input.routeNote ? `Jev 1.13 routing judgment:\n${input.routeNote}` : "",
    input.projectInstructions ? `Project instructions:\n${input.projectInstructions}` : "",
    input.projectRules ? `Project rules. A deeper file wins when two rules conflict:\n${input.projectRules}` : "",
    input.focusSkill ? `Lead with the ${input.focusSkill.name} skill:\n${input.focusSkill.instructions}` : "",
    input.planMode
      ? "Plan mode is on. You may read, list, and search. Do not write_file, run, apply_patch, git commit, or otherwise change the machine. When you understand the task, call write_plan with the full plan in content, then call exit_plan and stop. The plan names why the change is needed, the approach, the files to edit, what to reuse, and how to verify it."
      : "",
    input.approvedPlan ? `The user approved this plan. Implement it. Do not rewrite it unless a file you read contradicts it.\n${input.approvedPlan}` : "",
    input.settings.launchNote ? `Instructions:\n${input.settings.launchNote.slice(0, 3000)}` : "",
    input.settings.language ? `Reply in the language for the tag ${input.settings.language}. The app menus stay in English.` : "",
    input.mode === "code" && input.settings.outputStyle === "concise" ? "In Code, keep the reply short and lead with the change." : "",
    input.mode === "code" && input.settings.outputStyle === "explanatory" ? "In Code, explain the approach before the edit." : "",
    input.settings.design ? designPrompt(input.settings.design) : "",
    input.folderListing ? `Folder the user granted:\n${input.folderListing}` : "",
    `Enabled skills:\n${skills || "(none)"}`,
    `Connectors the user switched on:\n${connectorLines(input.connectors).join("\n") || "(none)"}`,
    whoIsThis(input.settings),
    `Memory notes:\n${memory}`,
    orgMemory,
    "When the user wants a previewable UI, diagram, or document, also include a fenced block tagged artifact with an info string like ```html artifact title=\"Name\". For a slide deck use ```slides artifact title=\"Deck\": `## Slide title` headings with a few short bullet lines each. For a flowchart, sequence, or diagram use ```mermaid artifact title=\"Diagram\" with mermaid syntax. Inside an html artifact, three widgets are preinstalled and follow the design system: <viz-stat value=\"42\" label=\"Answered\">, <viz-bars data='[{\"name\":\"Mon\",\"value\":3}]'> for a bar list, and <viz-calendar date=\"2026-10-03\" start=\"8\" end=\"18\" events='[{\"title\":\"Standup\",\"start\":\"12:00\",\"end\":\"12:30\"}]'> for a day schedule. Prefer them over hand-rolled charts; use Mermaid for static structure and HTML for dynamics.",
    toolGuide(input.mode),
    "Only describe a click, command, file write, or page after a tool result is present in the conversation."
  ].filter(Boolean).join("\n\n");
}

/** Names the person this Mac belongs to, so the model can address them and keep their context. */
function whoIsThis(settings: Settings): string {
  const name = String(settings.fullName || settings.displayName || "").trim();
  const email = String(settings.email || "").trim();
  if (!name && !email) return "";
  const parts = [name ? `This Mac belongs to ${name}.` : "", email ? `Their address here is ${email}.` : ""];
  return parts.filter(Boolean).join(" ");
}

function attachmentBlock(files: Attachment[] | undefined): string {
  if (!files?.length) return "";
  return files.map((file) => `\n\n[Attachment: ${file.name}]\n${file.text || "(binary or empty; name only)"}`).join("");
}

export interface TurnResult {
  content: string;
  nativeTools: boolean;
}

interface NativeCall {
  id: string;
  name: string;
  arguments: string;
}

const DESKTOP_TOOLS = [
  "list_dir", "read_file", "write_file", "run", "browse", "page_text", "page_dom", "page_click", "page_fill", "page_press", "page_scroll", "page_choose", "page_upload", "page_dialog", "page_shot",
  "screenshot", "apps", "focus_app", "click", "mouse_move", "drag", "type", "key", "hotkey", "scroll", "wait", "clipboard_read", "paste", "git", "apply_patch", "ssh", "doc_read", "doc_write", "rewind", "mcp",
  "browser_task", "design_review", "sim_list", "sim_boot", "sim_shot", "sim_tap", "sim_swipe", "sim_text", "sim_button", "sim_open", "sim_install", "sim_launch", "sim_shutdown",
  "write_plan", "exit_plan", "ask_user", "todo", "memory_write", "memory_append", "memory_delete", "scratchpad_read", "scratchpad_update", "messages_recent", "messages_send", "search_repo", "latex_compile", "record_start", "record_stop", "computer_history", "slack_post", "slack_read", "linear_search", "jira_search", "jira_comment", "notion_search", "notion_append", "figma_comments", "sentry_issues", "stripe_balance", "stripe_charges", "vm_status", "vm_boot", "vm_exec", "vm_stop", "spawn_subagents", "read_subagents"
].map((name) => ({
  type: "function",
  function: {
    name,
    description: `Modbitx desktop tool ${name}. Use the fields path, url, command, content, selector, text, x, y, key, app, kind, message, target, name, options, and args when they apply.`,
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" },
        url: { type: "string" },
        command: { type: "string" },
        content: { type: "string" },
        selector: { type: "string" },
        text: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        x2: { type: "number" },
        y2: { type: "number" },
        key: { type: "string" },
        app: { type: "string" },
        kind: { type: "string" },
        message: { type: "string" },
        target: { type: "string" },
        name: { type: "string" },
        options: { type: "array", items: { type: "string" } },
        min: { type: "number" },
        max: { type: "number" },
        step: { type: "number" },
        limit: { type: "number" },
        args: { type: "object" }
      }
    }
  }
}));

/** Prose from several tool rounds, kept apart so two sentences never run together. */
export function joinProse(parts: string[]): string {
  return parts.map((part) => String(part || "").trim()).filter(Boolean).join("\n\n");
}

export async function completeTurn(
  input: TurnInput,
  onDelta: (chunk: string) => void,
  execute?: (call: ToolCall) => Promise<ToolResult>,
  shouldStop?: () => boolean
): Promise<TurnResult> {
  if (!activeKey(input.settings)) {
    // No provider key: say so. Never answer with text the model did not produce.
    throw new Error("No model provider key is set. Add one in Settings \u2192 Model providers.");
  }

  const useTools = Boolean(execute) && input.mode !== "chat";
  const apiMessages: Record<string, unknown>[] = [
    { role: "system", content: systemPrompt(input) },
    ...input.messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role,
      content: m.content + attachmentBlock(m.attachments)
    }))
  ];
  let prose = "";
  let nativeTools = false;
  const stepCap = !useTools ? 1 : input.planMode ? 12 : 8;
  for (let step = 0; step < stepCap; step += 1) {
    if (shouldStop?.()) break;
    const streamed = await streamCompletion(input, apiMessages, useTools, onDelta);
    prose = joinProse([prose, streamed.content]);
    if (!useTools || !execute || streamed.tools.length === 0) break;
    nativeTools = true;
    if (shouldStop?.()) break;
    apiMessages.push({
      role: "assistant",
      content: streamed.content,
      tool_calls: streamed.tools.map((tool) => ({
        id: tool.id,
        type: "function",
        function: { name: tool.name, arguments: tool.arguments || "{}" }
      }))
    });
    const images: string[] = [];
    for (const tool of streamed.tools) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tool.arguments || "{}") as Record<string, unknown>; } catch { args = {}; }
      const result = await execute({ tool: tool.name, ...args } as ToolCall);
      apiMessages.push({ role: "tool", tool_call_id: tool.id, content: result.output.slice(0, 12_000) });
      if (result.image) images.push(result.image);
    }
    if (images.length) {
      apiMessages.push({
        role: "user",
        content: [
          { type: "text", text: "Screenshot from the tool above. Click x and y in this image’s pixels. Take a new screenshot after the screen changes." },
          ...images.slice(-1).map((url) => ({ type: "image_url", image_url: { url } }))
        ]
      });
    }
  }
  return { content: prose, nativeTools };
}

async function streamCompletion(
  input: TurnInput,
  messages: Record<string, unknown>[],
  useTools: boolean,
  onDelta: (chunk: string) => void
): Promise<{ content: string; tools: NativeCall[] }> {
  const body = {
    model: settledModel(input.settings),
    stream: true,
    temperature: input.settings.effort === "low" ? 0.3 : 0.4,
    messages,
    ...(useTools ? { tools: DESKTOP_TOOLS, tool_choice: "auto" } : {})
  };
  let content = "";
  let buffer = "";
  const tools = new Map<number, NativeCall>();
  for await (const chunk of responseChunks(input.settings, body)) {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta ?? {};
        if (delta.content) {
          content += delta.content;
          onDelta(delta.content);
        }
        for (const part of delta.tool_calls ?? []) {
          const index = part.index ?? 0;
          const current = tools.get(index) ?? { id: part.id || `tool-${index}`, name: "", arguments: "" };
          if (part.id) current.id = part.id;
          if (part.function?.name) current.name += part.function.name;
          if (part.function?.arguments) current.arguments += part.function.arguments;
          tools.set(index, current);
        }
      } catch {
        /* ignore keepalives */
      }
    }
  }
  return { content, tools: [...tools.values()].filter((tool) => tool.name) };
}

function modelUrl(settings: Settings): string {
  return `${providerBaseUrl(settings).replace(/\/$/, "")}/chat/completions`;
}

/** A refused key should say so, rather than showing a raw provider body. */
function providerFailure(status: number, text: string, providerName: string): string {
  const body = String(text || "").slice(0, 300);
  const refused = status === 401 || status === 403
    || /authentication failed|token expired|incorrect|invalid api key|unauthor/i.test(body);
  if (!refused) return body || `Request failed (${status})`;
  return `${providerName} refused the key${status ? ` (${status})` : ""}. Check the key in Settings \u2192 Model providers. ${body}`.trim();
}

/**
 * Decoded response text one chunk at a time. Every provider goes through the main
 * process, so no provider depends on the renderer passing a CORS preflight.
 * The listener attaches before the request, and the main process holds the
 * response body until the renderer's go signal — on a slow machine the first
 * chunk (even the end) can otherwise be dispatched before a subscription
 * exists, and events sent before a subscription are dropped.
 */
async function* responseChunks(settings: Settings, body: Record<string, unknown>): AsyncGenerator<string> {
  const queue: string[] = [];
  let finished = false;
  let failure = "";
  let wake: (() => void) | null = null;
  const off = window.modbitx?.onModelStream((event) => {
    if (event.id !== streamId) return;
    if (event.type === "chunk" && event.text) queue.push(event.text);
    if (event.type === "end") finished = true;
    if (event.type === "error") failure = event.message || "The stream failed.";
    wake?.();
  });
  let streamId = "";
  try {
    const started = await window.modbitx?.modelStream({ url: modelUrl(settings), key: activeKey(settings), body });
    if (!started) throw new Error("This copy of Modbitx cannot reach a model provider.");
    if (!started.ok) throw new Error(providerFailure(started.status, String(started.text || ""), activeProvider(settings).name));
    streamId = started.id;
    window.modbitx?.modelStreamGo?.(started.id);
    while (!finished || queue.length) {
      if (queue.length) {
        yield queue.shift() as string;
        continue;
      }
      if (failure) throw new Error(failure.slice(0, 400));
      if (finished) break;
      await new Promise<void>((resolve) => { wake = resolve; });
      wake = null;
    }
    if (failure) throw new Error(failure.slice(0, 400));
  } finally {
    off?.();
  }
}

/** One non-streaming completion, sent from the main process. */
async function completeText(settings: Settings, body: Record<string, unknown>): Promise<{ ok: boolean; text: string }> {
  const result = await window.modbitx?.modelChat({ url: modelUrl(settings), key: activeKey(settings), body });
  if (!result) return { ok: false, text: "" };
  return { ok: result.ok, text: result.text };
}

/**
 * One short answer with its own system line. Used by multi-step local loops
 * (research, recaps) that should not stream into the chat or touch tools.
 */
export async function oneShot(settings: Settings, system: string, user: string, maxTokens = 900): Promise<string> {
  if (!activeKey(settings)) throw new Error("No model provider key is set. Add one in Settings → Model providers.");
  const response = await completeText(settings, {
    model: settledModel(settings),
    stream: false,
    temperature: 0.3,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });
  if (!response.ok) throw new Error(providerFailure(0, response.text, activeProvider(settings).name));
  const json = JSON.parse(response.text) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("The model returned nothing for this step.");
  return text.trim();
}

export async function summarizeHistory(settings: Settings, messages: Message[]): Promise<string> {
  const key = activeKey(settings);
  if (!key) return localCompact(messages);
  const source = messages.map((message) => `${message.role}: ${message.content.slice(0, 800)}`).join("\n").slice(0, 12_000);
  try {
    const response = await completeText(settings, {
      model: settledModel(settings),
      stream: false,
      temperature: 0.2,
      messages: [
        { role: "system", content: "Summarize this conversation for a later turn. Keep file paths, decisions, and unfinished work in short paragraphs." },
        { role: "user", content: source }
      ]
    });
    if (!response.ok) return localCompact(messages);
    const json = JSON.parse(response.text) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim().slice(0, 4000) : localCompact(messages);
  } catch {
    return localCompact(messages);
  }
}

/** One short answer for an HTML preview. No tools, and no browsing. */
export async function askInsideArtifact(settings: Settings, prompt: string): Promise<string> {
  const question = String(prompt || "").slice(0, 500);
  const key = activeKey(settings);
  if (!key) return "Set a model provider key in Settings → Model providers.";
  try {
    const response = await completeText(settings, {
      model: settledModel(settings),
      stream: false,
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        { role: "system", content: "Answer in short plain text. You have no tools. You cannot browse or edit files." },
        { role: "user", content: question }
      ]
    });
    if (!response.ok) return "The preview could not get an answer.";
    const json = JSON.parse(response.text) as { choices?: { message?: { content?: string } }[] };
    return String(json.choices?.[0]?.message?.content || "").slice(0, 2000);
  } catch {
    return "The preview could not get an answer.";
  }
}


