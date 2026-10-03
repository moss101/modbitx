# Modbitx parity analysis — Claude Desktop 2.16120.0

Deep analysis and design analysis, 2026-10-02. Source: `/Users/mohsin/zee/Claude/Claude.app` (com.anthropic.claudefordesktop, version **2.16120.0** on disk — `Info.plist`, `app package.json`, and `parity/surfaces.json source.version` all agree; `README.md` and `RESEARCH.md` still say 2.7032.0 and are stale).

Four studies feed this report, archived in `research/2026-10-02-deep-analysis/`:

| Study | File | Method |
| --- | --- | --- |
| Main process + native helpers | `main-process.md` | `strings` over the compiled main chunk, full reads of the native-module loaders, helper binaries, skill manifest |
| Renderer surface | `renderer-surface.md` | value-search over the 32,243-string i18n bundle + structural greps over ~3.3k asset chunks, routes, media |
| Modbitx inventory | `modbitx-inventory.md` | code audit of all 72 parity surfaces, IPC channels, tools, settings, scripts |
| Design comparison | `design-analysis.md` | token extraction from the vendor CSS (CDS layer), side-by-side with `src/styles.css` |

Headline: Modbitx covers the shape of the product well, but the parent has moved. Roughly **40 user-facing surfaces in the bundle are absent from the parity map**, the settings shell has grown from the studied 192px nav to **38 sections**, and the parent's Cowork now runs agent tasks in a **sandboxed Linux VM** while Modbitx runs them on the host. On design, the vendor shipped a new token layer ("CDS") whose light page, dark palette, hairline borders, 14px composer, and motion language have all moved past Modbitx's classic-ramp tokens. Details and an actionable roadmap follow.

---

## 1. What the parent app actually is (architecture basis)

Parity decisions should rest on what the bundle really contains, because several things a surface list implies are impossible for any local clone:

- **A shell around a web renderer.** `ion-dist/` is the claude.ai web app (3.3k chunks, 32,243 i18n strings); `frame-shell.html` is the artifact popout window, `frame-connect.html` the connector OAuth card, `frame-manage.html` the share window.
- **A downloaded agent engine.** The Code/Cowork brain is not in the bundle: the main process fetches a checksum- and signature-verified `claude.zst` (~75 MB per platform) from `downloads.claude.ai/claude-code-releases/` (embedded manifest pins `2.1.284`) and launches it as the agent. The desktop app is a manager for that engine.
- **Cowork = a Linux VM.** `Resources/smol-bin.*.img` (24–25 MB MBR images) boot a minimal Linux guest (`coworkd` + `sdk-daemon`) with virtiofs/9p shares, a hide-filesystem filter, cgroup OOM detection, and an **egress proxy** that enforces a per-session network allowlist and installs an ephemeral CA into the guest trust store. Backends: macOS Virtualization.framework, Windows HCS/WSL2, Linux KVM, QEMU fallback ("Cowork requires QEMU…").
- **Computer use engine "chicago".** A Swift `computer_use.node` + Rust `app-cu-helper` JSON-RPC pair that screenshots, clicks, drags, and types with **per-app scoping** and hard refusals (secure-input active, screen occluded, foreign-pid target, user actively typing). Modbitx's osascript/System Events implementation is real but far cruder.
- **iOS simulator via FBSimulatorControl.** A bundled `Claude iOS Sim.app` streams **H264 video**, injects HID taps, and reads the accessibility tree; the simulator renders as a live native pane. An Android-emulator flag exists (`androidEmulator`). Modbitx uses `simctl` screenshots + pixel mapping — same idea, much lower fidelity.
- **SSH hosts with key gating.** System `ssh` transport that withholds secrets until the host key is verified, agent forwarding, PuTTY `.ppk` conversion, SFTP copy, jump hosts, rich reconnect diagnosis.
- **Bundled MCP connectors:** Microsoft 365 (25 Outlook + 5 Teams tools, MSAL broker auth, 20+ Graph scopes, send tools pinned to ask) and the official `github-mcp-server` binary.
- **Desktop extensions (DXT/MCPB):** install/preview/install-record/signature/allowlist/blocklist governance, unpacked dev installs, managed Python for UV runtime extensions.
- **Memory as a synced store:** global/account/space memory with migration, consolidation, and `__memory_*` tool verbs; `.auto-memory` directories.
- **Wake Scheduler:** the app schedules **macOS wakes** to run scheduled tasks (`scheduleWake`), plus while-working keep-awake with battery policy. Modbitx's LaunchAgent ticks every 60 s but cannot wake the Mac.
- **Org policy:** managed plist (`/Library/Managed Preferences/...`), remote bootstrap, relaunch-enforcement window, extension/computer-use/Cowork blocklists.
- **Oddities a clone would miss:** Quest (a consent-gated autonomous runner: 216 `quest*` strings in the main chunk, not yet a UI), Window Halo / tear-off overlays (`tearOffHalo`, Swift `sessionHalo`), Hardware Buddy (BLE maker devices with keychain tokens), a generated macOS Services Quick Action from a `.wflow` template, `disclaimer` (responsible-process wrapper) and `permission-fixer` (ownership repair for auto-updates).

Not found in this build despite package declarations: `@ant/clawd-quest`, `@ant/imagine-server`, and `@ant/rfb-client` have zero strings — declared, not shipped. No VNC/RFB, no image-generation product, no Quests UI.

## 2. Surface-count parity at a glance

- Renderer study identifies **~90 distinct user-facing surfaces** and **38 settings sections**. Modbitx tracks **72 surfaces** (53 covered, 9 partial, 10 deferred) and ships **21 settings nav items**.
- The 40 genuinely new or renamed surfaces since the last study: Research (top-level mode), Claude Design (standalone product + usage line), Anthropic Labs, Claude Academy / Teachers / AI fluency / Canvas LMS, Notes & Notebooks tools, Slides + Mermaid artifact types, live artifacts, Read Aloud with speakers, Dictation (push-to-talk) with its own settings section, Fast mode, Fable/Fable 5 + Opus 4.8 + xhigh/max effort, usage credits, Ultrareview, Claude Security, Code Review (daily GitHub review), Claude Tag (Slack), Dispatch phone pairing + mobile camera, SSH hosts / Remote Control, cloud Cowork sessions with task linking/moving, background tasks/agents panel, strict sandbox / full-VM-sandbox requirement, inference providers/gateway (BYOK), age verification, Claude Insights, Time limits, Reflect, interactive questions (single/matrix/scale), accessibility reader, skill/plugin security scanning, Routines with API triggers, artifact watch/"Shared by agent", subscription pause & gifting, sidebar customization + popout windows + activity sidebar, onboarding arms, Clawdmart easter egg, "This computer" settings hub, auto permission mode as Code's default.

## 3. Feature parity gaps

### 3.1 New surfaces the parity map does not track yet

Grouped by local feasibility (a `surfaces.json` update should carry the same classification):

**Implementable locally (real work, no vendor server needed):**
1. **Research mode** — a multi-step deep-research loop with a written report. Modbitx has the pieces (tools, streaming, artifacts); it needs a research loop and a Reports surface.
2. **Slides artifact type** — Modbitx already writes pptx via `doc_write`; a Slides preview/export pair closes this.
3. **Mermaid/diagram artifacts** — the deferral (`diagram-generation`, "hosted service") is now wrong: bundling a local Mermaid renderer inside the sandboxed iframe is local work.
4. **Read Aloud with speakers** — Modbitx already speaks replies with `say`; multiple voices + a speakers UI is local.
5. **Dictation push-to-talk** — Modbitx has web-speech input; a global dictation shortcut with once-to-start/again-to-stop semantics plus its own settings section is local.
6. **Background tasks panel** — Modbitx runs one turn per thread; a panel of concurrent background agents with per-row "what it was asked / what it returned" is a real gap (the scheduler only covers closed-app runs).
7. **Sidebar customization + popout windows + activity sidebar** — "Edit sidebar…", cmd+click to open a session in its own window; all local Electron work.
8. **Language switching** for menus/UI (parent ships 40+ locales; Modbitx menus are English-only by choice — worth an explicit deferral note or a renderer-level language setting).
9. **Updates UX** — parent has check/auto/force-install windows; Modbitx has no update story at all (local builds) — an explicit deferral note is enough, but note it.
10. **Accessibility reader / focus traversal polish** and **interactive questions** (Claude-asked single-choice/matrix/scale forms — Modbitx has `ask_user` with free text only; structured questions are local).

**Vendor-dependent (defer with the dependency named):** cloud Cowork sessions, Ultrareview/Code Review/Claude Security (cloud review agents), Claude Insights, Claude Tag, age verification, Academy/Teachers/Canvas, subscription pause/gifting, usage credits (billing), managed policy enforcement.

**Modbitx is ahead here:** **inference providers/gateway (BYOK)**. The parent's enterprise "inference gateway" (BYOK endpoints, model catalogs) is a Modbitx core feature done more broadly — 201 providers / 1,233 models, per-provider keys and endpoints. Worth recording as an intentional difference, and the provider catalog UI could borrow the parent's wording patterns ("Model ID exactly as the provider expects it. The first entry is the default model.").

### 3.2 Depth gaps on surfaces Modbitx already tracks

| Surface | Parent | Modbitx today | Gap worth closing locally |
| --- | --- | --- | --- |
| Cowork sandbox | Linux VM, network allowlist + MITM egress proxy, filesystem hide filter | Runs on the host with approvals | A real sandbox is the single biggest architectural gap. A local approximation (macOS `sandbox-exec`/Seatbone profile or per-task deny-by-default file clamps, plus a host-level proxy with `coworkEgressAllowedHosts`) is feasible; a full VM is a large project |
| Computer use | Per-app scoping, secure-input/occlusion/foreign-pid refusals, region capture | Global osascript clicks, screenshot scaling | Per-app allowlists (`computerUseAppScoped`), a secure-input check (`kCGSSessionSecureInputPID` via a small Swift helper), and refusals while the user is actively typing |
| Simulator | FBSimulatorControl H264 stream + HID taps + accessibility tree, live native pane | `simctl` screenshots, pixel-mapped taps | Boot an `xcrun simctl io` video stream into SimulatorPane (QLPreview/`AVAssetWriter` or a `simctl io recordVideo` loop); read the accessibility tree via `xcrun simctl spawn ... accessibility` |
| iOS/Android breadth | Android emulator flag present | Android via adb implemented | Parity is fine; keep |
| SSH | known_hosts gating with withheld secrets, agent forwarding, SFTP, jump hosts | `ssh:run` with raw exec | Host-key verification prompt before first connect, `SSH_AUTH_SOCK` forwarding, SFTP copy for remote file preview |
| MCP | Bundled M365 (MSAL broker) + GitHub servers, DXT governance | stdio client + 6 seed connectors + watched folder | Bundle the official `github-mcp-server` binary is possible (OSS) — M365 broker auth is not (needs the vendor's Entra app). DXT-style local extension install (accept `.mcpb` folders, list, enable/disable) is local work |
| Memory | Global/account/space sync, consolidation, tool verbs | Local notes joined into the prompt | `__memory_write/append/delete` tool verbs so the model can update memory during a turn; a consolidation pass |
| Scheduled tasks | Wake Scheduler + keep-awake + cloud routines | LaunchAgent 60 s tick | `pmset schedule wake` via a privileged helper is possible; keep-awake while a task runs (`powerSaveBlocker` exists already — wire it to running tasks, currently only a manual toggle) |
| Quick entry | Global hotkey + native dictation with final-transcript wait | ⇧⌘Space window | Dictation inside quick entry (web speech works there too), once/twice hotkey semantics |
| Skills | Bundled + security scan + 30 MB files + M365 delivery | 6 bundled + user skills, prompt lines | A local "security scan" pass (static pattern check for curl|rm|eval in skill text) is feasible and honest |
| Connectors | Directory, community connectors, org governance | No marketplace (stated) | Keep the deferral; add an import/export of connector JSON to share between Macs |
| Artifact links | Hosted publish/share with directory and viewer roles | Local 127.0.0.1 share/publish | Correct as deferred |
| Permission modes | Auto mode now Code's default; bypass moving to managed | ask/accept-edits/plan/auto/bypass with `allowBypass` | Aligned; consider making auto the Code default to match |
| Terminal | node-pty + WebSocket, split view, Control+Shift+arrow pane moves | `bash -l` via `term:start/write/kill` | node-pty for real TTY (colors, apps like vim), plus split/move pane shortcuts |
| Find | Find in page + Find in files | None | `webContents.findInPage` is one IPC call — cheap win; find-in-files over the granted folder also cheap |
| Usage | Provider meters, 5-hour/weekly limits, credits | Local token arithmetic | A real **provider-side usage reader** where APIs expose it (xAI/OpenAI admin endpoints with the user's own key) would make Usage honest instead of estimated |

### 3.3 Where Modbitx is ahead (keep and say so)

- BYOK model catalog (201 providers) vs the parent's locked catalog.
- Local-first privacy: no telemetry, no account servers, secrets blanked on export — the parent's entire managed-config/org-policy layer exists to control what Modbitx simply never has.
- An honest verification culture: 15 scripts including `no-stubs-check` and `parity-negative` (the map must reject a dishonest map). The parent has nothing equivalent to audit against.
- Computer use, browser automation, simulator control, MCP, and document I/O all actually execute locally with refusals, per the inventory — the "partial" statuses are honest.

## 4. Design analysis

The vendor has shipped a new token layer ("CDS") on top of the classic ramp Modbitx was derived from. Modbitx's light palette is nearly hex-identical to the old one, so the overall feel still matches — but the reference now differs in page color, dark depth, borders, composer geometry, and above all motion and density.

Key extracted values (evidence in `design-analysis.md`):

| Token | Claude Desktop (CDS) | Modbitx | Verdict |
| --- | --- | --- | --- |
| Page (light) | `#fcfcfb` page, `#f9f9f7` alt surface, `#ffffff` panels | `#faf9f5` everywhere | warmer, less figure/ground |
| Page (dark) | `#151515` page, `#20201f` composer/popovers, text `#f0efec` | `#262624` page, `#30302e` panels | lighter page, heavier |
| Borders | ink-alpha hairlines (10%/20%), 0.5px sidebar edge | solid 1px `--line` | heavier in dark mode |
| Accent | clay `#d97757` (hover) / `#c6613f` (fill) | teal accent (intentional identity) | keep — identity choice |
| Composer | 14px radius, 1px inset ring + layered shadow, 2-line min-height, 15px input | 24px radius, solid border, 52px min, 16px input | rounder + flatter than reference |
| Transcript | 640px measure, 32px gutters | 740px, 8vw gutters | ~15% longer lines |
| Greeting | serif at variable weight 360, `clamp(30→38px)`, `text-wrap:balance`, centered | Newsreader 42px @500, fixed | heavier + larger than reference |
| Type tiers | caption 12 / footnote 13 / body 13.2 / heading 15 / title 20.7 px | base 16 everywhere, few tiers | UI runs larger, flatter |
| Density | global `data-density` compact/comfortable retunes everything | none | missing whole setting |
| Motion | 60/120/200/300/450ms durations, 3 easings + spring, ~90 named animations, scroll fades, hover-reveal with scale | global reduced-motion kill-switch, 1 pulse, opacity-only hover | no entrance choreography |
| Streaming | pulse-dot 1.5s + status caption | literal "…" | |
| Send button | spring scale-in, tap scale 0.9, Esc-to-stop | static circle | |
| Icons | 20px variable icon font across chrome | text-only sidebar/composer | highest-visibility gap |
| Sound | approval chime, voice enter/exit SFX | none | |
| Focus | 2-layer ring + glow tokens | outlines on 3 controls only | |
| Sidebar | 288px, hairline edge, rail mode | 268px, solid edge, collapse to 72px | close |
| Theme picker | segmented with preview thumbnails | segmented with glyphs | |

Top recommendations (all with Modbitx's own fonts and original assets — full list with CSS in `design-analysis.md` §5): two-tier light page (`#fcfcfb`/`#f9f9f7`, keep warmth for content surfaces), dark page `#151515` + panels `#20201f`, alpha hairline borders + 0.5px sidebar rule, composer 14px + inset ring + 2-line min-height, 640px measure, greeting weight 400 `clamp(30→38px)` balanced, add the 5-tier type scale, add `data-density`, define the motion language and apply it to message/chip/sheet entrances, send-button spring + Esc-to-stop, 16px original stroke icons for sidebar/composer rows, focus rings everywhere, pulse-dot + caption streaming indicator, approval bottom-sheet + short original chime, theme picker thumbnails.

Two Modbitx advantages to keep: the reduced-motion kill-switch is stronger than the reference; serif assistant body (18px) matches the reference's prose emphasis without copying it.

## 5. Settings coverage diff

Parent: 38 sections (Preferences, General, Appearance, Accessibility, Notifications, Language, Advanced, Privacy, Data controls, Usage, Billing, Capabilities, Connectors, MCP, Design systems, Claude Code, Cowork, Claude in Chrome, Desktop→Extensions, Desktop→Developer, This computer, Dictation, Voice, Models, Memory, Skills, About, System prompt, Account, Members, Identity, Insights, Time limits, Teachers, AI fluency, Reflect, Usage credits, Claude Tag).

Modbitx: 21 items (Preferences, Privacy, Billing, Usage, System prompt, Model providers, Capabilities, Design systems, Connectors, Code, Cowork, Import & export, Chrome, General, Keyboard shortcuts, Extensions, Developer, Skills, Connectors, Plugins, Account).

Genuinely missing function behind parent sections (beyond the vendor-dependent ones): **Appearance** (density, motion speed, theme previews), **Notifications** (per-event choices, sounds), **Language**, **This computer** hub (computer-use mode default, sandbox setting, updates), **Models** (default model + org-style restriction list — Modbitx keeps this per-provider instead, which is fine, but a default-model row exists only implicitly), **Memory/Skills as first-class sections** (Modbitx has them under Customize — acceptable), **Dictation/Voice** sections (Modbitx folds into Preferences toggles).

## 6. Prioritized roadmap

**P0 — close honest gaps in things Modbitx already claims (days, not weeks)**
1. Update `parity/surfaces.json`: add the ~15 locally implementable new surfaces from §3.1 with covered/partial/deferred statuses and real pointers; fix the `diagram-generation` deferral reason (a local Mermaid renderer removes the "hosted service" dependency); fix `README.md`/`RESEARCH.md` version to 2.16120.0 and delete the stale "does not move the pointer" computer-use copy.
2. Find in page (`webContents.findInPage`) + composer shortcut-caps row.
3. node-pty terminal (real TTY) behind the existing `term:*` channels.
4. Structured `ask_user` questions (single-choice, multi, scale) — maps to the parent's interactive questions.
5. Memory tool verbs (`memory_write/append/delete`) so turns can update memory.

**P1 — the visible product gaps (1–2 weeks each)**
6. Background tasks panel (concurrent agents, per-row ask/answer, stop all).
7. Research mode (multi-step loop → report artifact).
8. Slides + Mermaid artifact types (pptx write exists; bundle a Mermaid renderer in the iframe).
9. Dictation push-to-talk + Read Aloud speakers (both ride existing engines).
10. Sidebar customization, session popout windows, activity sidebar.
11. Design pass #1 (the P0 of §4): tokens — page tiers, dark depth, hairlines, composer, measure, greeting, type scale.

**P2 — architecture and depth (longer projects)**
12. Design pass #2: density setting, motion language, icons, sounds, focus rings, theme previews.
13. Cowork sandboxing: host-level seatbelt profile + egress allowlist proxy (`coworkEgressAllowedHosts` analog); evaluate a VM later.
14. Computer-use hardening: per-app scoping, secure-input/typing checks via a small Swift helper.
15. Simulator live view (simctl video stream) and SSH host-key gating + SFTP.
16. DXT-style local extension packages (`.mcpb` folder install/enable/disable) and bundling the OSS `github-mcp-server`.

**Stay deferred (vendor servers):** sign-in, teams/admin, cloud routines, hosted remote control, OTel/retention, vendor speech, cloud Cowork, review/security cloud agents, Insights, billing/credits, age verification, Academy/Teachers/Canvas, Claude Tag.

## 7. Housekeeping found during the audit

- `README.md:32` and `RESEARCH.md:3` say the parent is 2.7032.0; the bundle on disk is 2.16120.0 (matches `parity/surfaces.json`). 
- `README.md` still claims computer use "does not move the pointer or record the screen"; `electron/main.cjs` implements click/move/drag/type/shot behind grants. `RESEARCH.md`'s "Computer use… Documented. Not executed" mapping row is likewise stale.
- The settings-shell study in memory/RESEARCH describes the older 192px nav; the current build's shell is larger (38 sections) — the Modbitx shell remains intentionally its own, but section coverage should be re-derived from §5 rather than the old list.
