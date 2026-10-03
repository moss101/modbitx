# Deep gap investigation — what Modbitx missed

Date: 2026-10-03 (round 3 of the deferrals goal). Method: string- and manifest-mining both bundles
afresh, targeted at the surfaces the user named: ACP, eval harness, agent harness, agents panel,
and a full module re-sweep. Evidence cited per finding. This report names only gaps verified in
the bundles — no speculation.

## 1. Persistent approval rule engine — the biggest miss (all three lineages)

The reference apps don't rely on permission *modes* alone; they layer a persistent **rule engine**
over individual tools and commands:

- **ChatGPT/Codex**: the Rust agent harness (`codex-cli/bin/codex-code-mode-host`) embeds a
  Starlark interpreter running `execpolicy` — rules with `Allow / Prompt / Forbidden` verdicts,
  prefix patterns, `network_rule`, `host_executable`, and `justification` fields, with shell-syntax
  examples for pattern testing (`execpolicy/src/parser.rs`, `codex_execpolicy::parser`,
  `POLICY_BUILTINS`). Commands are matched against rules *before* any approval UI.
- **Claude Desktop**: "Always allow" persists per tool and per site ("Allow once applies to this
  page only. Always allow saves on this device (revoke in Settings)"), and stored secrets carry
  allow rules that follow the secret when it rotates ("existing allow rules switch to it
  automatically"). A settings switch toggles whether persistent Always-allow is even offered for
  MCP tools.
- **Devin** (Windsurf lineage, studied earlier): per-tool auto-approve rules at
  session/workspace/user scope, created from approval dialogs.

**Modbitx today**: permission modes (ask/accept-edits/plan/auto/bypass), a persisted *host*
allowlist for browser sites, and session-scoped computer-use remembers. There is **no persistent
rule store for commands or tools** — every `run` under ask mode re-prompts unless Jev auto-allows.

**Plan**: a `rules` store (pattern → verdict allow/prompt/deny, scope user/project) consulted by
`ensureEdit` before any prompt, an approval-card action "Always allow commands like this" that
writes a rule, and a Settings → Privacy/rules list to review and revoke.

## 2. Subagent orchestration — "dynamic workflows" (Claude + ChatGPT agree)

- **Claude**: "Dynamic workflows let Claude fan out to many subagents on a single task", gated by
  its own approval ("Allow Claude to run a dynamic workflow?") and org policy ("Let org members
  run dynamic workflows in Claude Code"). Subagent activity is surfaced: "Message from subagent",
  "Most usage on this machine in the last 24 hours came from subagent-heavy sessions."
- **ChatGPT**: the `codex-app-tools` MCP plugin exposes thread orchestration *to the model itself*:
  `create_thread`, `send_message_to_thread`, `fork_thread`, `handoff_thread`, `automation_update`
  — each with a per-tool approval mode in `.mcp.json` ("prompt"), i.e. the agent spawns and steers
  other agent threads as tools.

**Modbitx today**: background tasks are chat-only, tool-less one-shot Q&A rows. The model cannot
spawn a subagent with tools, and cannot fork/hand off a thread.

**Plan**: a `spawn_subagent` tool (runs a full cowork turn with its own tools under the session's
permission mode, capped count), `thread_fork`/`thread_handoff` tools mapped to existing store
actions, and a fan-out card in the transcript showing subagent status — Claude's approval gate
before the first fan-out.

## 3. Auto-compaction (Claude)

Claude compacts sessions automatically ("Auto-compacts soon", "This session can't be compacted
any further. Start a new session to continue.", density notes about compaction frequency).
**Modbitx** ships manual `/compact` only. **Plan**: when the context estimate crosses a threshold,
run the existing `summarizeHistory` path automatically before the next turn, with a banner note.

## 4. Agents panel / fleet inbox (Devin's strongest surface; Claude's lesser one)

Devin's Agents Window is a dedicated fleet dashboard (status chips, filters, sort, pin, archive,
terminate). Claude's is lighter ("Show this session's background tasks"). **Modbitx** has sidebar
filter chips for Code sessions and the Tasks panel for side questions, but no cross-mode dashboard
of running/finished/failed agents with stop controls in one place. **Plan**: extend the Tasks
panel into an Agents view listing running threads (already tracked in `runningThreadIds`),
background tasks, and VM state, each with open/stop.

## 5. ACP — Agent Client Protocol (Devin/ChatGPT-lineage only, not Claude)

`windsurfAcpService`, `acpSessionsQuickAccess`, remote agent hosts, `preferredAgent` — from the
Devin study; a re-grep of the ChatGPT webview finds **no ACP strings**, so ACP is Devin-side, not
in the two apps the user pointed at. **Modbitx**: none. Honest verdict: low priority here — the
two named apps don't ship it; external-agent hosting can ride MCP later.

## 6. Eval harness — verdict: no product gap

Neither bundle ships a user-facing eval/grading surface (Claude i18n has no eval/harness strings;
ChatGPT's "grading" hit is an upgrade-to-Plus string). The agent-runtime "eval" strings in the
codex host are the JS engine's `eval`, not a harness. Modbitx's own Playwright check suite
(no-stubs/p0/surfaces/design) **is** the eval harness, and it is stricter than either app's
internal-only tooling. The adjacent real gap is **observability**: Devin's chatDebug pane (raw
request/response + token counts per turn) has no Modbitx equivalent. **Plan**: a Developer toggle
showing the last turn's request/response sizes and per-step outputs (data already in state).

## 7. Agent-harness mechanics (Codex host, smaller items)

- Per-tool **approval modes and timeouts** in MCP config (`default_tools_approval_mode`,
  `tool_timeout_sec: 3600`, per-tool overrides) — Modbitx's MCP client has neither timeouts nor
  per-tool gates.
- **OTel tracing** of every harness event — vendor telemetry; a local turn log covers the need.
- **Sandbox**: `run_as_sandbox_security_poc`, execpolicy network rules — Modbitx now has the task
  VM; execpolicy-style network rules fold into the rules engine (item 1).

## Priority

1. Approval rule engine (tri-app consensus; unlocks honest auto modes)
2. Subagent fan-out + thread orchestration tools (both apps' headline agent feature)
3. Auto-compaction (small, self-contained)
4. Agents/fleet panel consolidating running threads + tasks + VM
5. Chat-debug observability pane; MCP per-tool timeouts
6. ACP — deferred with the evidence above
