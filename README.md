# Modbitx

Local-first desktop assistant. The layout covers the Claude Desktop surfaces — Chat, Cowork, Code, projects, artifacts, connectors, skills, memory, scheduled tasks, dispatch, and quick entry — and the model is whatever provider you configure.

Modbitx does not include Anthropic’s app, fonts, or accounts. Computer use clicks, types, and captures the screen only after this Mac grants Screen Recording and Accessibility, and a task asks before its first action. Custom MCP commands are stored so you can run them yourself.

## Design

The interface runs on the Claude Desktop **CDS token layer**, transcribed from the 2.16120.0 bundle study (`research/2026-10-02-deep-analysis/design-analysis.md`): two-tier light page (`#fcfcfb` / `#f9f9f7`), warm near-black dark (`#151515` page, `#20201f` panels), alpha hairline borders, the 17px-rem type scale, 8px control / 14px composer radii, layered shadows with inset composer ring, the clay accent, the motion language (60/120/200/300/450 ms with out/snap/overshoot easings), and a compact/comfortable **density** dial. Fonts stay Modbitx’s own (Newsreader / Figtree / IBM Plex Mono) and every asset is original.

## What’s in this build

Beyond the earlier surfaces (see `PARITY-ANALYSIS.md`), this build adds, all local:

- **Deep research** — `/research <topic>` now runs the Codex-style contract: each sub-question proposes URLs, fetches them through the same host approvals as the browser tools, answers against what the pages actually said with inline citations, keeps a source ledger, and writes a **DOCX report** beside the chat when a folder is granted (Export as Word otherwise).
- **Messages bridge** — the Messages connector reads recent iMessage chats (`messages_recent`) and sends (`messages_send`, approval before every send) through AppleScript; macOS asks once for Automation permission.
- **Ripgrep repo search** — `search_repo` runs the bundled ripgrep over the granted folder, gitignore-aware.
- **LaTeX compilation** — `latex_compile` builds a `.tex` file with this Mac's Tectonic or TeX toolchain and names the install command when neither exists.
- **Plugin packages** — Codex-style folders (`plugin.json` + `skills/*/SKILL.md` + `.mcp.json`) load live from the app's plugins directory: skills join the list, MCP servers appear as connectors started from Developer.
- **Visualization widgets** — `<viz-stat>`, `<viz-bars>`, and `<viz-calendar>` render inside HTML artifact previews with the design system palette, no network.
- **Record & replay** — `/record start` / `/record stop` frame the screen every 5 seconds with the frontmost app named (last 20 minutes in temp); `computer_history` reads the timeline.
- **Real terminal** — the CodeDock terminal renders in xterm.js over the node-pty TTY.
- **While-working keep-awake** — a running turn or background task holds the powerSaveBlocker even when the manual switch is off.
- **SSH host-key gating** — the first connect to an unknown host asks before any command runs; an approved key is recorded with `accept-new`, and a changed key still fails closed.
- **Simulator live view** — the pane can refresh about once a second through the same sim bridge the tools use.
- **Package install from .zip** — Extensions → Plugin packages accepts a zip with `plugin.json` at its root and unpacks it with this Mac's own expander.

One honest negative: a seatbelt write-clamp for commands (`sandbox-exec`) was prototyped and refused by this macOS (`sandbox_apply: Operation not permitted` — third-party sandboxing now needs the endpoint-security entitlement), so command sandboxing stays deferred with that evidence recorded in the parity map.

## Verification

CI runs both tiers on every push (`.github/workflows/checks.yml`): a fast static job (typecheck, build, parity/audit/local-jobs/plan-mode) and a macOS job that drives the real app over CDP — design tokens, surfaces, launch, no-stubs, p0 (scripted provider on its own instance), and the port-clash pair. The only mode CI cannot run is `no-stubs turn`, which needs a real model provider key.

The full check suite runs green here (Playwright is a devDependency; the app is driven over CDP): `no-stubs-check` send/share/document/mcp/browser/computer/cowork/handoff, `p0-check` find/questions, `surfaces-check` (94 assertions over every mapped surface), `launch-check`, `port-clash-check`, plus the static `parity-check`/`parity-negative`/`audit-check`/`local-jobs-check`/`plan-mode-check`. Two modes stay environment-blocked, not app-blocked: `no-stubs turn` needs a real provider key, and `p0 terminal` needs pty allocation this harness denies (`posix_spawnp failed`) — both pass on a normal machine.

The design tokens are asserted live too, not just written: a CDP probe reads computed styles against the CDS values — page `#fcfcfb`/`#151515`, sidebar 288px with a 0.5px hairline, body 13.2px, Newsreader hero at 400, 32px gutters, composer 14px radius with a 48px two-line minimum and 15px input, 8px segments at 30px, 20.7px titles, three theme previews, and compact density retuning (248px sidebar, 12px composer, 6px segments). That probe caught and fixed a real bug: the rem-based tier tokens compounded with the 13.2px root and shrank the composer to 10.9px/11.6px before the tiers became absolute px.
- **Background tasks** — side questions that run as their own turn in a Tasks panel while the open chat keeps working.
- **Slides + Mermaid artifacts** — `slides` artifacts preview as a navigable deck and export as .pptx; `mermaid` artifacts render through the bundled local renderer.
- **Dictation push-to-talk (⇧⌘D)**, **Read aloud speakers**, **popouts + Edit sidebar**, **session scratchpad**, **Code quick actions**, and the full set of settings sections (Models, Voice, Dictation, Notifications, Language, This computer).
- **Shortcuts overlay (`?`)**, **quote reply**, and original **sounds** (approval chime, notification ding).
- **Find in page, structured questions, memory verbs** — from the P0 pass.

The design keeps Claude's CDS tokens as the base and adds the ChatGPT/Codex **elevation language** (`--elevation-stroke/prominent/sidebar/composer`, including the dark composer's inside-white hairline) for chrome depth. A `scripting.sdef` ships at the repo root for packaged builds that want an AppleScript dictionary.

## Run

```bash
cd /Users/mohsin/zee/Claude/modbitx
npm install
npm run dev
```

In Settings → Model providers, paste a key for any of the cataloged providers (xAI is the default: `grok-4.7` at effort extra high). With no key, Send still walks the UI and returns a local preview, including an HTML artifact.

State is written to the Electron user-data file. Incognito chats are omitted from that save.

## Shortcuts

| Action | Shortcut |
| --- | --- |
| New chat | ⌘N |
| Incognito chat | ⇧⌘N |
| Search | ⌘K |
| Quick entry | ⇧⌘Space |
| Dictation | ⇧⌘D |
| Shortcut guide | ? |
| Find in page | ⌘F |
| Settings | ⌘, |
| Chat / Cowork / Code | ⌘1 / ⌘2 / ⌘3 |
| Pop a session into its own window | ⌘-click a recent |

## What was studied

See [RESEARCH.md](RESEARCH.md) for the Claude bundle study, [PARITY-ANALYSIS.md](PARITY-ANALYSIS.md) for the 2026-10-02 deep analysis, and `research/2026-10-03-devin-analysis/devin-features.md` for the Devin Desktop study (a Windsurf-lineage VS Code fork; its portable surfaces — session chips, scratchpad, quick actions, diff feedback — are the Devin ports above). The parent bundles are Claude Desktop 2.16120.0 at `../Claude.app` and Devin 1.126.0 at `~/zee/Devin.app`.
