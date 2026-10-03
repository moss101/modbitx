# Modbitx Codebase Inventory

Read-only audit of `/Users/mohsin/zee/Claude/modbitx`, 2026-10-02. Every claim names a file and symbol. Parity reference: `parity/surfaces.json` (source declared as Claude.app; note the version mismatch — `surfaces.json` `source.version` says **2.16120.0**, `README.md` says **2.7032.0**).

Counts: **72 surfaces** = 53 covered · 9 partial · 10 deferred (rendered by `scripts/parity-check.cjs`, which prints `counts` from `scripts/parity-rules.cjs`).

---

## 1. The 9 `partial` surfaces — quoted, then what exists and what is missing in code

### 1.1 `voice` — src/components/Composer.tsx `Composer`
> `"limit": "Uses the web speech engine in the composer and the system voice for replies; the vendor's signed speech helper is deferred."`

**Implemented:** `startVoice()` (Composer.tsx:187) uses `window.webkitSpeechRecognition`; the transcript fills the draft and is echoed via `window.modbitx.speak` → IPC `voice:speak` (platform.cjs:252) which spawns macOS `say`. A refused mic (`error === "not-allowed"`) sets a visible note; the button toggles "Voice"/"Stop listening"; a per-message "Speak" button reads replies (ThreadView.tsx:788). Gated by `settings.voiceOn` (default true).
**Missing:** the vendor's signed speech helper / voice transport (see deferred `native-speech-helper`). Recognition quality is the browser engine's, per the limit.

### 1.2 `artifact-share` — electron/platform.cjs `artifact:share`
> `"limit": "Links are local to this Mac. Sharing to another account needs the vendor's servers, which is deferred."`

**Implemented:** `artifact:share` (platform.cjs:744) writes the HTML (≤1.5 MB) to `userData/shares/<id>.html` and returns `http://127.0.0.1:4737/share/<id>`; the local server serves it (platform.cjs:815–825) and a revoked link 404s with "This link was revoked." `ArtifactPane.shareArtifact` (ThreadView.tsx:1086) records the link in `settings.shares`, copies the URL, and `revokeShare` calls `artifact:unshare` which deletes the file.
**Missing:** any share that leaves this Mac — no upload, no other-account read.

### 1.3 `computer-use` — electron/main.cjs `computer:click`
> `"limit": "Needs the macOS Screen Recording and Accessibility grants; actions are refused until this Mac allows them."`

**Implemented (a full action set, not a stub):** `computer:click/move/drag/type/key/hotkey/scroll/clipboard-read/clipboard-write` (main.cjs:1116–1213) — clicks/typing/hotkeys/scroll via `osascript` System Events; pointer move/drag via `mouse.swift` compiled at runtime with `swiftc` into `userData/modbitx-mouse` (`ensureMouseBin`, main.cjs:218); screenshots via `desktopCapturer` (`computer:shot`, platform.cjs:237) with coordinates rescaled by `scalePoint`; app listing/focus (`computer:apps`, `computer:focus`); an always-on-top "Modbitx is using your computer" banner while armed (`setControlBanner`, main.cjs:1082); renderer-side gating in `tools.ts` (`ensureComputer` requires `settings.computerUse` plus a per-task approval, `focus_app` honors `deniedApps`, background vs takeover via `computerMode`), plus a deep link to the macOS privacy panes (`desktop:privacy`).
**Missing:** nothing structural — the macOS Screen Recording/Accessibility grants themselves; until granted, actions throw ("Screen Recording is off for Electron.", "The click needs Accessibility for Electron.").
**⚠ Doc drift:** `README.md` still says "Computer use is a preference flag only. Modbitx does not move the pointer or record the screen" and `RESEARCH.md` says "Documented. Not executed" — both predate the implemented handlers above.

### 1.4 `ios-simulator` — src/components/SimulatorPane.tsx `SimulatorPane`
> `"limit": "Needs Xcode's simulator tools and a booted device; the pane is empty without them."`

**Implemented:** `sim:list/boot/open/run` (platform.cjs:520–563, `runSim` at 388) cover boot/shutdown, screenshot (`xcrun simctl io` / `adb exec-out screencap`), open URL, install `.app`/`.apk`, launch bundle id, text (iOS: `simctl pbcopy` + paste via Accessibility; Android: `adb input text`, ASCII-only), buttons home/back/enter/lock/light/dark, tap/swipe mapped from screenshot pixels onto the Simulator window (28 px title bar, letterboxed — the same formula lives in both `src/simulator.ts mapSimPoint` and `platform.cjs mapSimPoint`). `SimulatorPane` shows the device name, note, and latest screenshot; Settings → Code lists, boots, and screenshots devices; `tools.ts` gates by `simIos`/`simAndroid` and a per-task approval.
**Missing:** only the environment (Xcode `simctl`, `ANDROID_HOME` adb/emulator, a booted device). Errors are explicit ("Install Xcode, or set ANDROID_HOME."), not faked.

### 1.5 `chrome-companion` — electron/platform.cjs `/v1/chrome/next`
> `"limit": "A page read needs a site grant accepted in the browser's own permission prompt before it can return text."`

**Implemented:** the local server queues jobs (`chrome:enqueue`, `/v1/chrome/next` at platform.cjs:847); `extensions/chrome/background.js` polls with the pairing code, injects via `chrome.scripting.executeScript` to read url/title/text (≤8000 chars) or fill/click, and POSTs the page to `/v1/handoff`, which lands in Dispatch with `source: "chrome"` (`handoffDecision` in local-jobs.ts:190). Settings → Chrome has the switch, pairing link, and an "Ask Chrome" queue button.
**Missing:** the page read only returns text after a per-site grant accepted in Chrome's own permission prompt; until then it posts the read error (`chromePageText`, local-jobs.ts:179).

### 1.6 `usage` — src/components/SettingsView.tsx `Usage`
> `"limit": "Counts tokens seen by this app, not an account meter."`

**Implemented:** `settings.usageTokens` is incremented per send by `Math.ceil((text.length + 400)/4)` (ThreadView.tsx:438); the Usage section shows it against a plan cap (`planCap`: free 20 000 / pro 200 000 / team 1 000 000) with a meter and a reset button.
**Missing:** any provider or account usage — purely local arithmetic.

### 1.7 `billing` — src/components/SettingsView.tsx `Billing`
> `"limit": "A local ledger you record yourself; no real charge is made."`

**Implemented:** an invoice list in `settings.invoices`; "Record this month" writes $0/$20/$40 by plan with the token estimate as the note (role-gated: members cannot record).
**Missing:** any real charge or vendor billing integration.

### 1.8 `account` — src/components/SettingsView.tsx `Account`
> `"limit": "Local profile fields only; signing in to a vendor account is deferred."`

**Implemented:** profile (displayName, fullName ≤80, avatar as data URL ≤80 KB / 120 000 chars, email), organization (orgName, orgRole owner/admin/member with member lock-outs, plan, seats, members list), and a "This Mac" section showing `app:info` (platform · version · userData path). `fullName`/`email` travel into the request via `whoIsThis` (api.ts:68) and into `/v1/status` (platform.cjs:836).
**Missing:** hosted sign-in (see deferred `sign-in`); "This is the only session. There is no remote sign-out."

### 1.9 `voice-stop` — src/components/Composer.tsx `startVoice`
> `"limit": "Listening can be started and stopped in the composer, and a refused microphone is reported; the engine itself is the browser's, so recognition quality is not ours to test."`

**Implemented:** calling `startVoice` while listening calls `listening.stop()`; `onend`/`onerror` clear the state and report `not-allowed`.
**Missing:** the recognition engine itself (browser-provided), hence its quality is out of scope.

---

## 2. The 10 `deferred` surfaces — stated dependency, one line each

| id | Reason (from `surfaces.json` `note`) |
| --- | --- |
| `sign-in` | Requires the vendor's own identity backend and OAuth client, which only that vendor can issue; a local account is kept instead. |
| `team-admin` | Teams, seats, roles, and admin policy live on the vendor's servers; a local app has no fleet — local roles and local shares are the counterpart. |
| `cloud-routines` | Cloud routines run on the vendor's cloud while the machine is off; the local scheduler (`scripts/scheduler.cjs taskDueOn`) covers routines that run on this Mac. |
| `remote-control` | Remote control is relayed through the vendor's hosted broker; the local server already accepts phone handoff and the Chrome companion over 127.0.0.1 (`/v1/handoff`). |
| `monitoring-retention` | OTel monitoring and retention policies are server-side controls over a hosted fleet; a local app has no server fleet to monitor or retain (counterpart: `blankSecrets` in local-jobs.ts). |
| `native-speech-helper` | Shipped as a signed vendor binary we do not have or distribute; web speech + system `say` voice are used instead. |
| `canvas-board` | The source product hosts a canvas integration for shared boards; Modbitx artifacts are local documents with a sandboxed preview, so a hosted board has no local server to live on. |
| `diagram-generation` | Mermaid-style diagrams render through a hosted service in the source product; a local renderer would need a bundled graph engine (artifacts already carry self-contained HTML). |
| `inline-comments` | Artifact comments are shared across accounts on the vendor's server; a local comment store has no second reader — versions and the compare view cover local review. |
| `print` | Printing is reachable through the exported PDF or the local page opened in a browser; a native print dialog is not wired, "recorded rather than implied." |

---

## 3. Implemented feature set, grouped

### (a) Modes & thread features — store.tsx, types.ts, ThreadView, Composer, palette.ts
- **3 modes** `chat | cowork | code` (`types.ts Mode`), switched by sidebar select, `⌘1/⌘2/⌘3` menu items (main.cjs buildMenu), or Jev routing (`route.ts applyRoute`, surface confidence ≥0.6, browser/simulator ≥0.75 auto-bumps chat→cowork). Chat mode disables desktop tools (`tools.ts toolGuide`, `api.ts useTools = mode !== "chat"`).
- **7 screens** `thread | settings | customize | artifacts | projects | scheduled | dispatch` (`types.ts Screen`).
- **Thread model** (`types.ts Thread`): title (auto from first message, 48 chars), mode, projectId, messages, pinned/starred/archived/incognito flags, per-thread model + effort, folder grant, permissionMode + planReturn, plan + planStatus (draft/review/approved), todos, sshTarget, designSystemId + designLocked, sessionStatus + sessionConfidence, timestamps.
- **Message actions** (ThreadView): copy, speak, edit-and-resend (truncates after the edited message and re-runs), regenerate, branch at any message (store `branch` action → "(branch)" copy).
- **Slash commands** (`agent.ts builtinCommands`, 18 builtins): `/plan /view-plan /auto /ask /accept /compact /context /model /effort /new(/clear) /resume /fork /rewind(/undo) /copy /export /rename(/title)` + `/bypass` only when `allowBypass`. Folder commands load from `.modbitx/commands` and `.grok/commands` (Markdown, `$ARGUMENTS` substitution, front-matter description). Composer shows a ranked slash menu and `@file` mention completion (`rules.ts listMentionPaths`, ≤80 paths, depth 2).
- **Palette** (`⌘K`, palette.ts): actions (new chat/task/session/incognito), screens, every settings section, open chats (matched by title *and message body*, with snippet via `paletteSnippet`), projects. Incognito chats are excluded from the palette and from disk saves (store.tsx persist filter).
- **Thread lifecycle:** auto-archive idle threads after `archiveAfterDays` (default 30, 1–365) via a 60 s pass (store.tsx) honoring pinned/incognito/running/active; `delete-archived`; dispatch queue capped at 40.
- **Quick entry** (⇧⌘Space): frameless always-on-top window (`?quick=1`, main.cjs createQuick) that submits into a new main-window chat (`quick:submit`).
- **Composer:** attachments via native dialog (text inline ≤400 KB read, docs extracted ≤20 000 chars), chips to remove; model + effort selects per thread; Enter-to-send (setting); voice button.
- Approvals UI (browser/simulator/computer/commit kinds, Allow for this task / Always / Just once / Deny), ask_user question card, resume and rewind pickers, plan card with "Approve and build" / "Request changes", todos list, route/design notes banner, trusted-folder chips ("Files never leave this Mac."), notifications when backgrounded (`notifyOnDone`), dock bounce (`dockAttention`).

### (b) Model/provider system — providers.ts, provider-catalog.ts (summary)
- **201 providers, 1233 models**, generated from models.dev by `scripts/build-provider-catalog.cjs` into `src/provider-catalog.ts` (+ the key-variable allowlist `electron/provider-env.cjs`, so they cannot drift). Notable entries: OpenAI, Anthropic, Google Gemini, xAI (Grok, default: `grok-4.7`, 8 models), Groq, Mistral, Cerebras, Perplexity, Together (no models — hand-entered id), OpenRouter, 302.AI, Abacus, plus a long tail; **6 local providers** (`ollama`, `llamacpp`, `atomic-chat`, `lmstudio`, `lynkr`, `privatemode-ai`); **Anthropic and Google are noted "OpenAI-compatible endpoint."**
- Per-provider saved keys / endpoint overrides / hand-entered model ids (`providerKeys`, `providerBase`, `customModels`); env keys read through the allowlisted `state:key-env` IPC; resolution = saved key else env (`activeKey`). `settledModel` keeps a model that fits, `switchProvider` migrates.
- All model traffic goes through the main process (`model:chat`, `model:stream`; https enforced; Z.ai-style broken-preflight providers therefore work). SSE streaming with incremental `tool_calls` assembly (api.ts `streamCompletion`); effort→temperature (low 0.3, else 0.4); loop caps: 1 step without tools, 8 with, 12 in plan mode. Native function calling, with a ` ```tool ` fence fallback parsed by `tools.ts parseTools` when the provider doesn't call tools.
- `summarizeHistory` (model-based, falls back to `localCompact`) powers `/compact`; `askInsideArtifact` answers iframe questions (no tools, 500-char question, ≤8 per preview, 2000-char answer).
- Legacy migration: `apiKey` → `providerKeys.xai`, `zcodeKey` → `zai`/`zcode` (`settleProviders`).

### (c) Desktop tools — exact names
`api.ts DESKTOP_TOOLS` declares **52 tools** (sent as OpenAI function definitions):
`list_dir, read_file, write_file, run, browse, page_text, page_dom, page_click, page_fill, page_press, page_scroll, page_choose, page_upload, page_dialog, page_shot, screenshot, apps, focus_app, click, mouse_move, drag, type, key, hotkey, scroll, wait, clipboard_read, paste, git, apply_patch, ssh, doc_read, doc_write, rewind, mcp, browser_task, design_review, sim_list, sim_boot, sim_shot, sim_tap, sim_swipe, sim_text, sim_button, sim_open, sim_install, sim_launch, sim_shutdown, write_plan, exit_plan, ask_user, todo`

`tools.ts runTool` implements every one (plus internal `invalid` for unparseable fences). Safety wrappers: `gateHook` (project hooks) → `ensureEdit` (fileTools switch, plan refusal, accept-edits, Jev auto judgment `decideReview` with REVIEW_CONFIDENCE 0.55 / REVIEW_HARM 0.35, else approval) → rewind save before writes/patches. `run` blocks `sudo` and `rm -rf /`; `git` is limited to status/diff/log/commit/branch/worktree; long `type` uses clipboard+⌘V to preserve symbols and restores the clipboard.

### (d) Browser tools
`browse, page_text, page_dom, page_click, page_fill, page_press, page_scroll, page_choose, page_upload, page_dialog, page_shot, browser_task`. Built-in `WebContentsView` (main.cjs ensureBrowser) with: per-session partitions (`browser:partition`, `browserPerSession`), optional cookie clearing after a turn, downloads captured to the granted folder (else ~/Downloads) with name/state reported, alert/confirm/prompt interception (`DIALOG_HOOK`; confirm denied unless `page_dialog accept` was called once), CDP `DOM.setFileInputFiles` for uploads (path must stay inside the granted folder), after-action screenshots + 20-node control outline. Site gate (`harness.ts siteGate` + `tools.ts ensureSite`): blocked hosts refuse, persisted/session hosts pass, unknown hosts get a Jev risk score (`jev:site`) and ≥0.72 marks high-risk (persisted to `highRiskHosts`, ask-per-visit). `browser_task` is the Jev-driven loop below.

### (e) Simulator tools
`sim_list, sim_boot, sim_shot, sim_tap, sim_swipe, sim_text, sim_button, sim_open, sim_install, sim_launch, sim_shutdown` — see §1.4. Per-platform switches (`simIos`/`simAndroid`), per-task approval before the first action, screenshots pinned into the transcript and the SimulatorPane.

### (f) MCP / connector support
- **Real MCP client** (platform.cjs `startMcp`/`mcpRequest`): stdio JSON-RPC with `Content-Length` framing, `initialize` (protocolVersion 2024-11-05), `notifications/initialized`, `tools/list`, `tools/call`, stop; surfaced via the `mcp` tool and Developer settings (Start / List tools).
- **Connectors:** 6 seeds (Local files, GitHub, Calendar, Mail, Built-in browser notes, Custom MCP server — catalog.ts SEED_CONNECTORS); user-defined commands; plus a watched folder `userData/connectors/*.json` (`connectors:list/watch/changed`) merged by `mergeConnectorCatalog` with version tracking. `connectorLines` puts every enabled connector (name, blurb, command ≤120 chars) into the system prompt. GitHub REST via saved token (`connect:github`), Calendar/Mail via AppleScript (`connect:calendar`, `connect:mail`). **No marketplace** — stated in Developer settings copy.

### (g) Code features — CodeDock, plan mode, session status, hooks, worktree, rewind
- **CodeDock** (CodeDock.tsx): permission-mode select (ask/accept-edits/plan/auto/bypass; bypass hidden when `allowBypass=false`), Git status/diff/log/commit ("Modbitx checkpoint")/branch (prefix from settings)/worktree (folder from settings), Rewind latest snapshot + snapshot count, SSH target + `uname -a` probe, embedded terminal (`bash -l`, `term:start/write/kill`), open-PR polling every 120 s (GitHub token + `git remote` → `/pulls?state=open&per_page=10`, desktop notification when the set changes), colorized working-tree diff, session-status pill.
- **Plan mode:** Jev `jev:prepare` (`plan-question.cjs`) asks `needs_plan` in Code; ≥0.72 (`agent.ts PLAN_ENTER`) auto-enters plan and preserves the prior mode in `planReturn`; `write_plan`/`exit_plan`; plan card approve → `permissionAfterApproval` (back to prior mode else ask) and an implementation turn carrying `approvedPlanForTurn`; `ensureEdit` refuses all writes while in plan; `/plan [task]` and `/view-plan`.
- **Session status** (`session-status.ts` + `session-question.cjs`): Jev labels a Code session blocked/ready/done/working, displayed only at ≥0.55 confidence (else "Unclassified"); computed after each turn and once for restored sessions.
- **Hooks** (`hooks.ts`, `hook-guard.cjs`, `hook:exec`): `.modbitx/hooks.json` events `SessionStart`/`PreToolUse` (both flat and `events` shapes), regex matchers, ≤8 groups × ≤4 hooks, `type:"process"` only, node/python3 or a script inside the granted folder, eval flags refused, symlinks resolved, payload on stdin, 15 s cap. Exit 2 = deny; JSON `permissionDecision` allow/ask/deny; `continue:false` denies; `additionalContext` is appended to tool output.
- **Worktree:** `git worktree add -b <branch> <worktreeLocation>/<leaf>` via dock, `git` tool, or `/fork --worktree` (fork re-targets the new folder; `--no-worktree` stripped).
- **Rewind:** every `write_file`/`apply_patch` first copies the target to `userData/rewind/<ts>-<name>` + `.meta` (`rewind:save`); list 20, restore, `/rewind` drops messages after a chosen user prompt (files on disk stay).
- **Rules:** `AGENTS.md, Agents.md, CLAUDE.md, CLAUDE.local.md, AGENT.md` + up to 8 Markdown files in `.grok/rules` / `.modbitx/rules`; deeper files win, 8000-char cap (`capRules`).

### (h) Settings sections & every setting key with defaults
**Nav lists (verbatim from src/settings-nav.ts):**
```ts
export const SETTINGS_MAIN: NavItem[] = [
  { id: "preferences", label: "Preferences", ... },
  { id: "privacy", label: "Privacy", ... },
  { id: "billing", label: "Billing", ... },
  { id: "usage", label: "Usage", ... },
  { id: "instructions", label: "System prompt", ... },
  { id: "providers", label: "Model providers", ... },
  { id: "capabilities", label: "Capabilities", ... },
  { id: "design", label: "Design systems", ... },
  { id: "connectors", label: "Connectors", ... },
  { id: "code", label: "Code", ... },
  { id: "cowork", label: "Cowork", ... },
  { id: "transfer", label: "Import & export", ... },
  { id: "chrome", label: "Chrome", ... }
];
export const SETTINGS_DESKTOP: NavItem[] = [
  { id: "desktop", label: "General", ... },
  { id: "shortcuts", label: "Keyboard shortcuts", ... },
  { id: "extensions", label: "Extensions", ... },
  { id: "developer", label: "Developer", ... }
];
export const SETTINGS_CUSTOMIZE: NavItem[] = [
  { id: "skills", label: "Skills", ... },
  { id: "customize-connectors", label: "Connectors", ... },
  { id: "plugins", label: "Plugins", ... }
];
export const SETTINGS_ACCOUNT: NavItem = { id: "account", label: "Account", ... };
```
(each item also carries a `hints` string used by settings search; see settings-nav.ts:4–44.)

**Every setting key in `DEFAULT_SETTINGS` (src/catalog.ts:28–101), with defaults:**
`theme:"light"`, `textScale:16`, `apiKey:""`, `baseUrl:"https://api.x.ai/v1"`, `provider:"xai"`, `providerKeys:{}`, `providerBase:{}`, `customModels:{}`, `zcodeKey:""`, `zcodeBaseUrl:""`, `model:"grok-4.7"`, `effort:"xhigh"`, `memoryOn:true`, `orgMemoryOn:false`, `orgMemories:[]`, `enterToSend:true`, `quickEntry:true`, `computerUse:true`, `artifactsOn:true`, `voiceOn:true`, `incognitoDefault:false`, `showThinking:true`, `launchNote:""`, `language:"en-US"`, `displayName:"You"`, `fullName:""`, `avatar:""`, `email:""`, `orgName:"Personal"`, `orgRole:"owner"`, `plan:"pro"`, `seats:1`, `usageTokens:0`, `permissionMode:"ask"`, `computerMode:"background"`, `githubToken:""`, `sshTarget:""`, `remoteControl:false`, `pairingCode:""`, `backgroundScheduler:false`, `published:[]`, `shares:[]`, `allowedHosts:[]`, `blockedHosts:[]`, `highRiskHosts:[]`, `trustedFolders:[]`, `jevRouting:true`, `browserHarness:true`, `design:DEFAULT_DESIGN`, `designSystems:[paperDesign()]`, `defaultDesignId:"paper"`, `motion:"system"`, `runOnStartup:false`, `menuBar:true`, `keepAwake:false`, `notifyOnDone:false`, `dockAttention:false`, `transcriptWidth:"medium"`, `interfaceFont:"sans"`, `codeFont:""`, `outputStyle:"default"`, `simIos:true`, `simAndroid:true`, `browserTools:true`, `keepBrowserCookies:true`, `browserPerSession:false`, `fileTools:true`, `allowBypass:true`, `branchPrefix:""`, `worktreeLocation:""`, `deniedApps:[]`, `archiveAfterDays:30`, `members:[]`, `invoices:[]`. (Types-only extras: `provider`/`providerKeys`/`providerBase`/`customModels`/`zcode*` carry the migration notes in types.ts:188–199.) `applySettingsPatch` (store.tsx:298) hardens saves: motion can only be "reduce"|"system", avatar only a ≤120 kB `data:image/`, arrays coerced.

### (i) Artifacts — versions, share, publish
- Fenced ```lang artifact title=""``` blocks extracted by `artifacts.ts artifactsFromMessages`; first artifact auto-opens (`artifactsOn`).
- **ArtifactPane** (ThreadView.tsx:983): sandboxed iframe (`allow-scripts`) for html/svg with design-token injection + the `window.modbitxAsk` bridge (≤8 questions); phone 390 / tablet 768 / desk 1100 widths; plain `<pre>` otherwise.
- **Versions:** `rememberVersion` — 12 snapshots per artifact (`VERSION_CAP`), ≤300 000 chars each (`VERSION_LIMIT`), 40 artifacts kept; version picker + "Restore this version" rewrites the source message fence; count shown in the Artifacts library.
- **Compare:** `compareVersions` line diff (≤400 rows, same/changed/added/removed) with `diffSummary`.
- **Share:** local links on 127.0.0.1:4737 with copy + revoke (see §1.2). **Publish:** `artifact:publish` → `userData/artifacts/<id>.html` served at `/artifact/<id>`, opened via the allowlisted `shell:open-local` (only `http://127.0.0.1:4737/artifact/<id>` passes).
- **Export as:** docx/xlsx/pptx/pdf/md/html/csv/txt through the same document writer as the agent (20 MB cap).
- **Design bar:** ink/paper/accent color pickers, type select, per-thread design-system pin + lock ("Let Jev choose" to release), Jev design review (`jev:design`) rendering ship/revise/ask + hierarchy/density/token scores with legend.
- **Artifacts library page:** search across title+thread, copy source, opens the pane.

### (j) Handoff / sync
- **Local server** on `127.0.0.1:4737` (platform.cjs `startSync`): `/phone` status page, `GET /v1/status` (desktop-alive via 4 s heartbeat file, org, name, email, plan, remote flag, tasks), `GET /v1/chrome/next` (queue pop), `POST /v1/handoff` (refused 403 unless `remoteControl`; stores text/taskId/title/source/page into `handoff.json`), `/artifact/<id>`, `/share/<id>`. Everything except the two page routes requires the pairing code. Port is retried on clash (5 s/10 s, 120 attempts) and the reason surfaces via `serverNote`.
- **App side:** polls `sync:pull` every 4 s; `handoffDecision` (local-jobs.ts:190) routes taskId→schedule outcome, `source:"chrome"`/page→Dispatch "From Chrome", else "From the pairing link"; Dispatch page Accept → new cowork chat prefilled, or Dismiss. `taskOutcome` marks finished / cant-run / needs-input; notices via `desktop:notify`.
- **Background scheduler:** `scheduler:install` writes `~/Library/LaunchAgents/com.modbitx.scheduler.plist` (60 s interval, `ELECTRON_RUN_AS_NODE=1`) running `scripts/scheduler.cjs` against the state file: when the desktop is up it drops tasks into `handoff.json`; when closed it evaluates due tasks, writes a cowork thread, and (if a provider key exists) completes the reply with a real chat-completions call that explicitly may not claim to have clicked/browsed/edited; results land in `task-notices.json`, pulled every 15 s. In-app tick (App.tsx, 20 s) covers the non-launchd path. Weekday repeats (`taskDays`/`taskDueOn`, Sunday=0; "Every day"/"Weekdays"/"Weekends" labels).
- **Chrome extension** (`extensions/chrome/`): manifest + popup (pairing code entry) + background poller; reads the active tab or performs fill/click; posts to `/v1/handoff` with `source:"chrome"` (see §1.5).

### (k) Design systems — design.ts
`DesignSystem` = name/ink/paper/accent/font(sans|serif|mono)/radius(0–32)/space(4–48)/components(≤500); `DesignRecord` adds id + `share: "only-you" | "organization"`. Default "Paper" (`#1f1e1b/#faf9f5/#8d3b28`). `settleDesign` keeps the library, default id, and active tokens consistent (a token edit without a library patch updates the default record); `designsForRole` hides only-you systems from members and, when nothing is shared, exposes the whole library; `activeDesign` resolves per-thread pin else default. Auto-pick: `applyDesignPick` requires `needsDesign ≥ 0.66` (DESIGN_NEED) and pick confidence ≥ 0.5 (DESIGN_PICK_CONFIDENCE); locked chats keep their system. Review verdict needs `DESIGN_CONFIDENCE 0.55`. `previewDocument` injects `--ink/--paper/--accent/--radius/--space/--font` + the ask bridge; `designPrompt` injects the same tokens into the system prompt. Interface-level: textScale small/medium/large = 14/16/20 px, motion reduce, transcript width narrow/medium/wide = 560/740/980 px, interface font sans/serif/system, code font override (default IBM Plex Mono).

### (l) Harness — harness.ts thresholds
`DONE_YES 0.8` · `COMMIT_HOLD 0.7` · `ACTION_CONFIDENCE 0.42` · `SITE_RISK 0.72` · `MAX_BROWSER_STEPS 5`. The loop: `controlsFromDom` (≤12 fields/links/buttons from the DOM dump) → `valuesInGoal` (≤4 quoted strings/emails from the goal) → `browserOptions` (stop/scroll/press + fill:cN:i / click:cN) → Jev `jev:browser` answers done/commits/action → `decideBrowserStep` returns done | ask (unknown option, low confidence) | confirm (commit-class action at ≥0.7 → approval) | act → `actionToCall`. `markHighRisk`/`siteGate` are the host gate (see (d)). Comment: "Thresholds for Jev 1.13 browser judgments. These are Modbitx policy, not model defaults."

### (m) Memory / skills / rules
- **Memory:** per-user notes (`memories` + Customize tab, CRUD) and workspace notes (`orgMemories`, owner/admin-editable, member-readable); both join the system prompt only when `memoryOn`/`orgMemoryOn`; Privacy can clear all and delete archived chats.
- **Skills:** 6 bundled — Documents (docx), PDF reading, Slides (pptx), Spreadsheets (xlsx, off by default), Interface design (frontend), Repository work (code) — plus user skills. Edit caps name 60 / instructions 4000 (`skills.ts`); bundled skills reset to seed but cannot be deleted; enabled skills become prompt lines (`skillLines`) and their character cost is displayed. A focused skill (Jev `jev:prepare` skill choice ≥0.5) is led with in the prompt.
- **Rules/commands:** folder pack (see (g)); project instructions + knowledge files (≤20 000 chars/file) injected via `projectPrompt`, with "Shared project" instructions joining every chat on the Mac.

### (n) Import / export — zip-store.ts
Handwritten **stored (no-compression) ZIP** with CRC-32 table (`zipStore`/`unzipStore`, `bytesToBase64`/`base64ToBytes`); unzip rejects compressed entries. Export = zip with `manifest.json` (chat threads, memories, tasks, projects, settings with `blankSecrets` — apiKey/githubToken/zcodeKey/providerKeys blanked) + `sessions/{cowork|code}/{id}.json`; or JSON (chats-only or full, keys blanked). Import accepts the zip or legacy JSON, tidies threads (drops incognito, coerces flags, defaults model/effort), and merges without duplicates (store `import-bundle`). Privacy → Export uses the chats-only JSON.

---

## 4. Verification scripts in `scripts/` (each: what it proves)

| Script | Proves |
| --- | --- |
| `parity-check.cjs` | The parity map itself is valid: every covered/partial surface's evidence pointer resolves to a real repo script + mode string; prints counts. |
| `parity-rules.cjs` | The map rules as pure functions (reused by parity-check and local-jobs-check). |
| `parity-negative.cjs` | The map check rejects a dishonest map: each mutation of a temp copy of surfaces.json must exit non-zero; the repo map is untouched. |
| `surfaces-check.cjs` | Against the running app over CDP: `surfaces` (every covered surface renders its content, incl. real browser probe page), `design` (computed styles/geometry of the design language), `identity` (copy never names the source vendor except inside `[data-third-party]`). |
| `no-stubs-check.cjs` | The app does real work, not fabricated work, in 9 modes: `send` (no key → refused, not faked), `share` (file written, served, revoked), `document` (a real file lands on disk), `mcp` (server starts and lists a tool), `browser`, `computer`, `turn`, `cowork`, `handoff`. |
| `local-jobs-check.cjs` | The pure src modules behave as specified (archive/handoff/task-day math, parity rules on synthetic entries, etc.) via TypeScript-compiled units. |
| `plan-mode-check.cjs` | Plan-mode logic compiles and holds: gate thresholds, enter/approval flow, edit refusal in plan. |
| `audit-scan.cjs` | Mechanical pending-item scan by class: (a) broken evidence pointers, (b) inert state no module reads, (c) dead exports, (d) recorded incompleteness. |
| `audit-check.cjs` | parity/audit.json matches a fresh audit-scan (classes/dispositions/reasons; nothing unresolved). |
| `chrome-handoff-smoke.cjs` | The shipped extension poll posts a real handoff to a stub server on 4737 (`--live` uses the app's server). |
| `chrome-live-check.cjs` | The extension runs in real branded Chrome (CDP `Extensions.loadUnpacked`) and a queued page read lands in Dispatch (site grant still needs a human). |
| `launch-check.cjs` | The shell actually launches: content renders and a driven interaction changes the DOM. |
| `port-clash-check.cjs` | A second app copy survives a taken port with an explanatory note and takes the port once freed. |
| `build-provider-catalog.cjs` | (Generator, not a check) regenerates provider-catalog.ts + provider-env.cjs from models.dev in one pass so the key allowlist cannot drift. |
| `scheduler.cjs` | (Runtime, not a check) the launchd background scheduler; exports `taskDays/taskDueOn/providerFor` so its logic stays testable. |

---

## 5. Stated non-goals (README / RESEARCH / settings copy / deferred notes)

- "Modbitx does not include Anthropic's app, fonts, or accounts." (README)
- "Proprietary script, fonts, icons, and native helpers were not copied into this repo." Fonts are Newsreader/Figtree/IBM Plex Mono with a teal accent instead of the parent mark. (RESEARCH)
- README: "Computer use is a preference flag only. Modbitx does not move the pointer or record the screen." and "Custom MCP commands are stored so you can run them yourself." — the first now contradicts the implemented `computer:*` handlers (§1.3 doc-drift note); RESEARCH's mapping row "Computer use, MCP process spawn… Documented. Not executed" is likewise stale.
- The 10 deferred surfaces (§2) are the declared feature non-goals (vendor sign-in, team admin, cloud routines, hosted remote control, OTel/retention, vendor speech helper, hosted canvas, hosted diagrams, cross-account comments, native print).
- In-product copy: "There is no connector marketplace" (Developer); "There is no phone push" (Dispatch); "This is the only session. There is no remote sign-out" (Account); "Physical phones are not used" (tool guide); artifacts "Versions stay on this Mac."
- `surfaces-check.cjs identity` enforces: Modbitx copy never names the source vendor; vendor names may appear only inside `[data-third-party]` (provider catalog UI).

---

## 6. Engineering shape

### LOC (wc -l)
| File | LOC | | File | LOC |
| --- | --- | --- | --- | --- |
| src/provider-catalog.ts | 7372 | | src/skills.ts | 49 |
| src/components/SettingsView.tsx | 1368 | | src/components/BrowserPane.tsx | 42 |
| electron/main.cjs | 1258 | | electron/plan-question.cjs | 37 |
| src/components/ThreadView.tsx | 1250 | | extensions/chrome/popup.js | 32 |
| electron/platform.cjs | 1139 | | src/session-status.ts | 27 |
| scripts/surfaces-check.cjs | 591 | | scripts/parity-check.cjs | 27 |
| scripts/no-stubs-check.cjs | 545 | | src/shortcuts.ts | 24 |
| scripts/local-jobs-check.cjs | 479 | | src/components/SimulatorPane.tsx | 15 |
| scripts/plan-mode-check.cjs | 426 | | src/components/Markdown.tsx | 14 |
| src/store.tsx | 414 | | src/main.tsx | 13 |
| src/styles.css | 375 | | src/branch.ts | 8 |
| src/components/Pages.tsx | 372 | | extensions/chrome/background.js | 69 |
| src/agent.ts | 348 | | src/components/Sidebar.tsx | 65 |
| src/api.ts | 336 | | scripts/chrome-handoff-smoke.cjs | 179 |
| src/types.ts | 289 | | scripts/build-provider-catalog.cjs | 158 |
| src/design.ts | 279 | | src/harness.ts | 157 |
| scripts/chrome-live-check.cjs | 277 | | electron/preload.cjs | 137 |
| src/local-jobs.ts | 269 | | src/catalog.ts | 129 |
| src/App.tsx | 222 | | scripts/audit-scan.cjs | 129 |
| src/components/Composer.tsx | 214 | | src/providers.ts | 126 |
| src/global.d.ts | 203 | | scripts/port-clash-check.cjs | 126 |
| electron/provider-env.cjs | 197 | | electron/office.cjs | 123 |
| scripts/scheduler.cjs | 186 | | src/zip-store.ts | 122 |
| src/components/CodeDock.tsx | 183 | | src/artifacts.ts | 122 |
| src/palette.ts | 110 | | src/simulator.ts | 103 |
| scripts/parity-rules.cjs | 110 | | src/rules.ts | 97 |
| src/components/Workspace.tsx | 90 | | electron/hook-guard.cjs | 81 |
| scripts/launch-check.cjs | 77 | | src/hooks.ts | 55 |
| src/settings-nav.ts | 68 | | scripts/parity-negative.cjs | 61 |
| electron/session-question.cjs | 63 | | scripts/audit-check.cjs | 57 |
| **Total (src+electron+scripts+ext)** | **≈22 518** | | | |

Dependencies are minimal: react, react-dom, react-markdown, remark-gfm (runtime); electron, vite, typescript, concurrently, wait-on (dev). No test framework — all verification is CDP/scripts.

### State model — store.tsx
Single `useReducer` over `AppState` (threads, projects, connectors, skills, memories, tasks, settings, serverNote, runningThreadIds, dispatchQueue, activeThreadId, mode, screen, settingsSection, sidebarCollapsed, artifactOpen, activeArtifactId). **40 action types** (store.tsx:72–109): hydrate, mode, screen, sidebar, select, new-thread, fork, running, enqueue/patch-dispatch, merge-connectors, patch/delete-thread, server-note, add/update-message, settings, project CRUD, connector toggle/command/add, skill toggle/add/patch/delete, memory add/delete, task CRUD, artifact open, remember-artifact, branch, archive-inactive, delete-archived, import-bundle. Persistence: debounced 250 ms after every state change to `userData/modbitx-state.json` via `state:save` (localStorage fallback in a plain browser), **with incognito threads and runningThreadIds stripped**; hydration merges the save over seed state (`mergeSeed`) re-running `settleDesign` + `settleProviders`. A 60 s pass archives idle threads.

### IPC channels
**103 `ipcMain.handle` channels** — 58 in electron/main.cjs + 45 in electron/platform.cjs. Groups:
- Shell/window: `dialog:folder`, `dialog:files`, `dialog:save-text`, `dialog:open-text`, `dialog:save-bytes`, `dialog:open-bytes`, `shell:open`, `shell:open-local`, `app:info`, `desktop:apply`, `desktop:notify`, `desktop:bounce`, `desktop:storage`, `desktop:clear-cache`, `desktop:privacy`, `quick:hide`, `quick:submit`.
- State/keys: `state:load`, `state:save`, `state:key-env`.
- Model: `model:chat`, `model:stream`.
- Jev judgments: `jev:route`, `jev:site`, `jev:browser`, `jev:design`, `jev:design-system`, `jev:prepare`, `jev:session`, `jev:review`.
- Files/work: `fs:list`, `fs:read`, `work:write`, `work:run`, `work:apply`, `hook:exec`, `artifact:export`.
- Built-in browser: `browser:bounds`, `browser:partition`, `browser:clear-storage`, `browser:hide`, `browser:load`, `browser:nav`, `browser:download-dir`, `browser:last-download`, `browser:upload`, `browser:dialogs`, `browser:accept-dialog`, `browser:text`, `browser:click`, `browser:fill`, `browser:press`, `browser:scroll`, `browser:choose`, `browser:dom`, `browser:shot`.
- Computer use: `computer:arm`, `computer:clipboard-read`, `computer:clipboard-write`, `computer:click`, `computer:hotkey`, `computer:scroll`, `computer:move`, `computer:drag`, `computer:type`, `computer:key`, `computer:apps`, `computer:focus`, `computer:shot`.
- Voice: `voice:speak`, `voice:stop`. Simulator: `sim:list`, `sim:boot`, `sim:open`, `sim:run`.
- Code: `git:run`, `ssh:run`, `rewind:save`, `rewind:list`, `rewind:restore`, `doc:read`, `doc:write`, `term:start`, `term:write`, `term:kill`.
- Connectors/MCP: `connect:github`, `connect:calendar`, `connect:mail`, `mcp:start`, `mcp:tools`, `mcp:call`, `mcp:stop`, `connectors:list`, `connectors:watch`.
- Handoff/share: `chrome:enqueue`, `sync:info`, `sync:pull`, `notices:pull`, `artifact:publish`, `artifact:share`, `artifact:unshare`, `scheduler:install`, `scheduler:remove`.
Push channels (ipcRenderer.on): `model:stream`, `quick:submit`, `term:data`, `connectors:changed`, and 6 menu channels (`menu:settings`, `menu:new-chat`, `menu:incognito`, `menu:open-folder`, `menu:palette`, `menu:mode`).

### Jev 1.13 (the judgment layer)
All probabilistic decisions route through one hosted evaluator, `jevEvaluate` in main.cjs (POST `https://api.typesafe.ai/v1/systemone`, model `jev-1.13.0`, key `TYPESAFE_API_KEY`; missing key degrades to explicit `ok:false` reasons). Questions are declared per call (route/site/browser/design/design-system/prepare/session/review); renderer modules own the thresholds (route.ts, harness.ts, agent.ts, design.ts, session-status.ts) and every one carries the comment that thresholds are Modbitx policy, not model defaults.
