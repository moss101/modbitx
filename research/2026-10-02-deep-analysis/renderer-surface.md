# Claude Desktop (macOS) Renderer — Complete User-Facing Surface Inventory
**Payload:** `/Users/mohsin/zee/Claude/Claude.app/Contents/Resources/ion-dist/` (index.html, frame-*.html, assets/ ~3.3k JS chunks, i18n/en-US.json + i18n/dynamic/en-US.json)
**Method:** value-search over i18n bundles via `research/2026-10-02-deep-analysis/i18n-grep.cjs` (prints `value<TAB>key`, dedupes across en-US.json/dynamic); structural greps over `assets/**/*.js` (routes, displayNames); audio/image/frame inspection. All evidence below is a quoted string from the payload (trailing hash = i18n key).
**Note:** `i18n/en-US.overrides.json` does not exist (other locales have `.overrides.json`). No en-US dynamic overrides beyond `i18n/dynamic/en-US.json`.

---

## 1. Navigation & Modes
Sidebar/nav labels (exact-match values): "Chat", "Cowork", "Code", "Research", "Voice", "Projects", "Artifacts", "Schedules", "Skills", "Memory", "Sessions", "Usage", "Settings", "Design", "Docs"
- New chat: "New chat" / "New chat in {projectName}" / "Start new chat"
- New task (Cowork): "New task in {projectName}" — "Start a task here and pick up an existing one from your desktop or phone. Switch back to the old view from the {menuIcon} menu."
- Incognito: "Incognito" — "Exit incognito" — "Incognito chats stay out of your history, memory, and search, and aren't used to train Claude."
- Sidebar customization: "Edit sidebar…" — "Choose which items appear in your sidebar." — "Sidebar pins and starred sessions survive sign-out"
- Activity sidebar: "Toggle activity sidebar"
- Popout sessions: "Open a session in its own window to work on sessions side by side — drag it out from the sidebar, or cmd+click it"
- Recents/projects: "Project rows in the Recents sidebar expand with a click, and a hover-revealed `View project` button opens the project page"
- Routines (schedules): "Create routine" — "Set up Routines to run a prompt on a schedule — find them in the sidebar" — "Managed by Routines in Capabilities." (Routines have API triggers: "Routine created, but the API token couldn't be generated. Edit the routine and re-add the API trigger")
- Research as first-class mode: "ResearchJEe7dVso7F"; "Research a question and write a report"
- Background tasks entry: "Show this session's background tasks" — "Background tasks appear here"

Routes found in JS: `/settings/*`, `/code/*`, `/cowork/{agent,projects,project}`, `/projects`, `/artifacts`, `/teachers`, `/sessions`, `/memory`, `/usage`, `/skills`, `/connectors`. **No `/quests`, `/notes`, `/imagine`, `/halo` routes.**

## 2. Settings — sections and rows
Sections (labels + JS routes): "Preferences", "General", "Appearance", "Accessibility", "Notifications", "Language", "Advanced", "Privacy", "Data controls", "Usage", "Billing", "Capabilities", "Connectors", "Design systems" ("Design systems give Claude your colors, type and components…"), "Claude Code", "Cowork", "Import & export", "Claude in Chrome" (`/settings/browser-extension`), Desktop: "Extensions" (`/settings/desktop/extensions` incl. `manage-directory`, `advanced`), "Developer", "This computer" ("This computerEeqYdGS5uw"), "Dictation", "Voice", "Models", "Memory", "Skills", "About", "System prompt" (`/settings/sys-prompt`), "Account", "Members", "Identity" (`/settings/identity`), "Insights", "Time limits" (`/settings/time-limits`), "Teachers" (`/settings/teachers`), "AI fluency", "Reflect" (`/settings/reflect`), "Data privacy controls" (`/settings/data-privacy-controls`), MCP (`/settings/mcp/*`), "Usage credits", "Claude Tag", "Security scan" ("Skill and plugin security scanning75uewxU3/x").

Rows (evidence per row):
- Appearance: "Theme", "Themes", "Appearance set to Light", "Toggle light or dark appearance", "Slow animationsBdgaRn+mmz" (motion), "Transcript text size" ("Size of the conversation transcript text."), interface font: "Font for the whole interface — menus, sidebars, and panels."; code appearance: "Pick your code font and theme in `Settings → Claude Code → Appearance`" (theme names in JS displayNames: Vesper, Nord, Monokai, Plastic, Poimandres, LaserWave, Houston, Horizon, Linear, Andromeeda, Red)
- This computer / General: "Run on startup5huDSewExH", "Show Claude in the menu bar.", "Keep Claude running in the system tray.", "System tray", "Menu bar", "Bounce the Dock icon when Claude needs your attention and the app isn't focused.", "Autocorrect" ("Turn on/off autocorrect"), "Spelling and grammar", updates: "Check for updates", "Auto-updates", "Block auto-updates", "Hours before a downloaded update force-installs…Blank = 72-hour default."
- Dictation: "Dictation shortcutSa5Vh4MotK", "Press once to start dictation, and press again when you're done speaking." (push-to-talk), "Toggle dictation", "Finishing dictation…", errors: "Dictation is having trouble connecting", "Dictation couldn't start"
- Voice: "Voice modeOnF9aqAuar", "Use voice mode", "To use {feature, select, voice {voice} other {dictation}}, allow the microphone…"
- Quick access: "Quick access shortcut7Orkcosvv2", "Quick Entry keyboard shortcutwl6vXYrxQW", "Alt+Space0QLubSrZ2p", "Set a global shortcutuPBNGtxydc"
- Privacy / Data controls: "Privacy controls0BdozBN0YB", "Allow the use of your chats and coding sessions to train and improve Anthropic AI models. Change anytime in privacy settings.", export: "Settings → Privacy → Export data"; Labs data: "Share data to improve LabslDPpr9EbX6" ("Allow Anthropic to use data from Labs features…")
- Usage: "Weekly/clOBU+3Bj", "{pct}% of 5-hour limit/iLyIw8b/L", "Usage limit reached7w3FHlVG2e", "Turn on usage credits to keep going · Limit resets {time}", "You've reached your weekly limit. Turn on usage credits to keep going.", spend limits: "{period, select, daily {Daily spend limit} weekly {Weekly spend limit} other {Monthly spend limit}}"
- Capabilities toggles: "Web search" ("Turn on web searchAp9JE0Ewye", "Web search is offSg9twkHvu0", "Isolate web search from connectorsUjduYyXUVH"), computer use ("Computer useRfG2KsHAez", "Enable computer useSuJjHnT9jE"), code execution: "Let Claude run code, create files like documents and spreadsheets, and access network resources in conversations.41SyDtecSo", "Cloud code execution and file creationFTkNS/sMbN", "Local sandboxXZuN8Fgklz" ("Allow Claude to run code in a local sandbox to analyze attached files it can't read natively — like Excel and PowerPoint. Off by default."), "Strict sandbox modemoEfZ8i+n2", "Require full VM sandboxwQRUBw9rk7", skills ("Skills are not enabled. Turn on code execution and file creation to use skills.JrLYNx6i5D")
- Models: "Default model3Qi71frRpd", "Default model and effort level0al9Tkxdsg", "Default effort levelEq3lBkf43x", effort slider: "Choose effort with a slider next to the model pickeruYLQ5lDLZu"; effort levels: "low, medium, high, xhigh or max"; org: "Choose which models your organization can use, and the highest effort level they can run at."
- Computer use modes: "Background computer useaU2O2pfa53" — "Claude can now control your applications in the background without taking over your screen… If you'd prefer Claude to default to full control… Settings → This computer → Computer use."
- Cowork settings: "Change location for Cowork files?+PMqUNutxd", "Enable additional VM-level isolation for the Cowork sandbox.SecureVmFeaturesHint", device simulator: "The device simulator is disabled because your organization requires the full VM sandbox."
- Dispatch (phone pairing): "Failed to enable Dispatch notifications.25UPQz06h5", "Let Claude work on tasks from your phone using this computer. When off, your phone won't be able to dispatch work here.Jhv/hIcUA~Jhv/hI6cUA"
- Desktop Extensions/Developer: "Extensions are disabled on this device. Please contact your IT administrator…T/dJ7tnrfn", "Developer MCP servers are disabled on this device.…GDoDijLG+q"
- Insights: "Enable Claude Insights to see what your team uses Claude Code for and how sessions conclude — derived from privacy-preserving analysis of session content.g9O1auoC0h"
- Notifications: "NotificationsNAidKbB0vi", "Notifications enabledSkJDT6Yg8Y", "Notifications won't reach your phone yet. Open Claude on your phone and allow notifications.6icKXTVb6J"
- Language: "Changing the language will reload the side panel and start a new chat.fLK6zyaDfD"
- Accessibility: "AccessibilityfgCBG8/Fm+", "Accessibility readerQh8GdSYhRb" / "Accessibility reader: {reader}", screen-reader flow: "Preview page — press Enter to move into it. Inside, press F6 or Ctrl+F6 to move back out."
- Bypass permissions (admin): "Allow your team to bypass all permission checks in Claude Code Desktop.…AvrvsYzH0a", "Auto mode is now Claude Code's default permission modeCYb29RdK59" — "Bypass permissions mode and auto mode controls…are moving to Managed settings on June 5, 2026"
- Code settings: "Couldn't update the setting. Change it in Settings → Claude Code.+PmP6Ez9Fl", worktrees/Git: "Git is required to use a worktree…", branch prefix: "Couldn't save the branch prefix. Try again.", "Open Claude Code sandbox settingshaKQrKfVRA", "Blocks commands that can't run inside the sandbox (ssh, for example)…IoqC8Soln9"

## 3. Composer & Message Actions
- Placeholder: "Ask Claude a question or start a task…Dbb9UHJHaq"; files: "Ask for any file format: docs, spreadsheets, slides, PDFs, and more.58f1SIdpGu"
- Tools/toggles: "Turn on web search", research ("Deep research and extended thinking/TR+YnHpEs"), "Extended thinking" / "Toggle extended thinkingo8zr8LMPwV" / "Think longer for complex tasksaWuhH8qI9/", "Fast mode" ("Toggle Fast mode from the model picker on supported models for quicker responsesADD2IN+/Xo", "Fast mode was turned off. Add usage credits to turn it back on."), "Effort" / "Set the effort level for this session", model: "Switch to a different model from the model picker to continue.", "Default7Aqe2/LqFL" label
- Output style in composer: "Set the output style for this sessionwF1YXSRX2h", "New output styleAkJkxQULrm", "Created {name}. Pick it from the Output style menu."
- Connector search: "Search Google Drive1bbXc6Z3S1", "Drive1YAWJ379IQ"
- Incognito in composer: "Use incognitoI+U+pJa37R"
- Message actions: "Read aloudFiwV/oi580" (Read Aloud errors: "Read Aloud couldn't start.", limit: "You've reached a Read Aloud limit."), "Branch to new chat9904KlI+jU", "Fork with this prompt2PeMCX4Kdd" ("Forking…"), rewind (see §Code), "React with {emoji}3rv4IS9mI1" / "Add reactionGoLgxGTVAD", feedback: "What specifically about Claude's responses didn't meet your expectations?ntVX4VBU1b"
- Interactive questions (Claude-driven forms): "Claude asked a question that can't be displayed here.C4nXsiyK0v", "Matrix questionCAvZ9cXB+l", "Choose an option or skip this questionArJPHUks2W", "{count} questions — open to answer"
- Side question: "Ask a quick side question without adding to the session4Iu0xDY9v4"
- Prompt-library chips (examples): "Quiz me on python code", "Create a lesson plan", "Make flashcards as a printable document"
- Model-change dialogs: "Change thinking mode?x/xUEDhOyP", "Change effort level?3EaeMr9hCZ", "Your next response will be slower and use more tokens…EXYJeF+9+J"

## 4. Artifacts
- Nav "Artifacts"; publish: "Published artifact7uV1fZWnrM", "Published (Public)8pkqUNBShs", "Unpublished from the directory+FN/DNHm9C"; sharing: "Share with anyone who has the link?0+11JVz9er", "Share link reset.", "Shared as artifact3tbFSDqRRi", "Share as viewer6DFWiE5hDq"
- Variants: "Mermaid diagramxz/cIYRwG0", "SlidesAd9Gcynipw" ("How was making slides?Hgf36is61Y", "Slides didn't loadGzsTROaF98", "Slides as picturesIra41Zuf3c"), React/HTML preview ("Sends Claude a screenshot plus the element's HTML, styles, selector and any React component details.1ipj6D8DE2"), design canvas: "Draft a design on a canvas Artifact — editable where saving is enabled (Claude Design preview)IQ1FZYI8vS"
- Live artifacts: "I want to make a live artifact. Explain what live artifacts are in Cowork…DuKKwQJrUn"
- Device preview: "Tablet/bfzrIxiJT"
- Artifact↔task bridge: "Only people who can edit this artifact can start a task from it3+F0nC2chN"
- Claude "watch" bridge (CLI): "Claude can watch this artifact from the command line to handle comments", "Reaches Claude only if this artifact's Claude or your session is watching"
- Trust dialog: "This artifact tried to save changes, but you can't edit it…Only continue if you trust this artifact./EAGnQtd8W", "Artifacts are created by other users and aren't verified by Anthropic. Only download files you trust."
- Frame-shell.html = the **Artifact popout window** chrome: `<title>Artifact</title>`, `header#hdr aria-label="Artifact controls"`, degraded header with "Content is user-generated and unverified.", `#frame-slot` iframe host, loading/err slots; loads `frame-shell-chrome`, `frame-shell-broker` chunks.

## 5. Cowork
- VM: "The Cowork VM isn't connected. It may still be starting up.+bt9+eulkK", "The Cowork workspace (virtual machine) is counted under Runtime.Z3oXcH7Vy+", "{featureName} runs in a secure local virtual machine.lFR7PPKMGW", "Cowork requires hardware virtualization. This device does not support it…ku/nJbM87i", "Cowork's local virtual machine needs additional setup on this device.stZapqQ2d4"
- Cloud vs desktop: "Cowork sessions (cloud and desktop)0yrWabVUB8", "{count} cloud Cowork sessions", "Cloud routines aren't shown because this account can't run Cowork in the cloud.", "Continue in cloud" (cloud hand-off: "select Continue in cloud again")
- Task origin/linking: "{origin, select, web {…} phone {This task was started on your phone…} scheduled {…} desktop_unlinked {…}}0Hx5KencP/", "Link this task to this computer to add folders1+Kn44lB4F", "Couldn't move "{taskName}" back to this computer. It still runs in the cloud.2sGx7+aTrZ"
- Files: "Download filesBL7MbigAUk", "View and open files created during this task.p41Nenxyun", "{size} of the attachments are links to files elsewhere on this computer…"
- Dispatch (phone→desktop): "Dispatch from anywhereL88xAUksth", "Turn it on in Settings to dispatch work to Claude from your phone.AW1LeQqU3c", "Dispatch can use every connector you've authenticated.EWujAYJEKA", "Go back to dispatchLSlhFYapaW"
- Phone pairing: "From your phone, you can hand Claude tasks that use everything on your desktop.59MmbPH4yZ", "Claude will access your desktop (files, apps, and browser) to complete tasks you send from your phone. This may have security risks…5LrcsTyduj", "Pair workspace84KMoXddDK", "Mobile camera access+VEF35/UNH"
- Background agents: "Background tasksPO+0DdDIId", "See what each background agent was asked and what it returned by expanding its rowVyLfFYiwh1", "All background agents stoppedudwPpX5agR", "Open {name} in Background tasksfFubbBep+3"
- Session states: "Your computer went to sleep and paused this session.5JKvmJwH98", waiting-session triage: "Mark a waiting session as completed from the sidebar's right-click menu — clears the yellow dot…"
- Cowork onboarding: "Power through tasks with Cowork/GayWmqnb6", "Customize Cowork for me6vxCyHtxqT"; egress: "Cowork is generally available. Your network egress settings apply to all sessions.1gedvXbdcu"

## 6. Code (Claude Code desktop)
- Pitch: "Get the full Claude Code experience in a native window. No terminal required.3bs/L1f60D", "Point Claude Code at any existing repo or start from scratch."
- Worktrees: "In a worktree+y7Ab8qjkW", "Leaving the worktree+DxCo2DtIH", "Git is required to use a worktree…2PQcEclarB"
- Diff/terminal: "DiffFm3StihZV6", "Diff layoutdUFzeVqhPP", "Hide terminal2H5K6Nbsaz", "Ran terminal3HqwPnSzes"
- Rewind: "Rewinding…DpIUuAgOGQ", "Redo rewindEy8/OuFrRh", "Rewind undone8l4p7Zweml", "Brings back the messages this rewind removed. Your files stay as they are."
- Remote/SSH hosts: "The diff panel and file previews work in SSH sessionsgC9+SjQopv", "SSH key", "SSH host (user@host)", jump hosts ("…or to a jump host on the way…0xhCrp9rYM"), "Turn on Remote Control" ("Update Claude Code on {host}, then start a new session there and turn on Remote Control.+7Y9llQqPE")
- Permission modes: "Auto mode is now Claude Code's default permission mode", plan mode ("Claude is in plan mode, so only you can approve this.31WIaU93U6"), "Accept and bypass permissions8Yyc5WLmCb", "Bypass permissions isn't allowed here, so this session switched to Accept edits.4uXDb2+dGF"
- Code Review: "Daily code review/ARbULDtth", "Code Review feedback6hwqmgdCGa", "Select which repositories you would like Claude to automatically review.…BzNXtMuCnz"
- Claude Security: "Run security scans on repositories with the Claude GitHub App installed.2Ek5EboYi1", "Access your Claude security scan results3y6EVd0Lvq", "Claude Security depends on cloud sessions.…1hh8JXe5x+", "Stopped at the time limitsecurity/stopped_at_time_limit"
- Ultrareview: "UltrareviewxMf+KNyazb", "Run ultrareviewd6ETb1pGUw", "Run ultrareview in the cloud?ichbO+Kskv", "Launch a remote Ultrareview session for this repositoryim+fV1gXT4", "Ultrareview needs a Git repository. Choose a folder inside one.IPlyzQXeo6"
- Agents/sessions routes: `/code/agents`, `/code/scheduled`, `/code/routines`, `/code/memory`, `/code/review`, `/code/security`, `/code/share`, `/code/onboarding`, `/code/family`, `/code/enroll`
- Sandbox: "Runs commands from Claude Code in an isolated sandbox. Applies to new sessions.0IQeTnXtHC", "Claude Code runs only in workspaces you trust.+Q/7SdmHh0", "Trust workspace0L2liwSugy"
- Enterprise: "Gateway-managed Claude Code+Mc2p855y7", "Claude Code fast mode8Ykuq3MsZg"

## 7. Quests / clawd
- **Quests: not found.** No i18n values/keys for a Quests feature; no `/quest*` route; only incidental words ("Transform my calendar into a fantasy quest journal").
- **Halo / session halo: not found** (no i18n, no JS hits beyond unrelated).
- clawd exists only as mascot/easter egg: "Clawd the crabSBSz+5lrDk", "Clawdmart8+c2ipPmHS" (JS: `tabTitle…"Clawdmart"…url:"clawdmart.com"`), mascot video `images/install-hub/clawd-laptop.mov|.webm`.

## 8. Voice
- Voice mode: "Voice mode disconnected. You can try again.19rKQUTASZ", "You're offline…try voice mode again.fmclVSermz", "Voice mode isn't available in this browser version.…Nt4lk6P3DL"
- Voice onboarding with 5 selectable personalities (audio files): `audio/voice/selection/{glassy,rounded,mellow,buttery,airy}.mp3` + per-voice onboarding clips (`intro`, `pre_voice`, `recommendations`, `final`)
- SFX: `audio/voice/sfx/{tool_approval_needed,enter_voice_mode,exit_voice_mode,disconnected}.mp3` (+ `audioSinkWorklet.js`)
- Dictation (push-to-talk): "Press once to start dictation, and press again when you're done speaking.", "Start or stop dictation in the chat you're typing in."
- Read Aloud (multi-speaker): "Read aloud", "{speaker}: {text}G90FUt47dj", "SpeakersQN7t90w3YS"

## 9. Memory & Styles
- Memory: "You're in control of what Claude knows about you. Turn on memory, and see or edit what it keeps.0Uw2YnlIJE", "{count} memories", "This will permanently delete all memories, including project memories…", off-state: "Claude keeps its existing memory but won't use memory or make new memories.08McIOFwlq", "Chat memory has moved to Settings. Head there to manage your memories.21MadHNsOf", Code-side: "/code/memory" route, "Memory is off in your settings. Any existing memory files are kept but won't be read or written in new sessions."
- Output styles: "Output style/jFmdFrLzq", "Output styles aren't available for this session.HnRAad9EB0", "Set the output style in settings. This session uses it when it starts.MSko6iYj3n", "{value}" isn't an available output style."

## 10. Connectors & MCP
- Directory: "Failed to search connector directory0uG4CcrREQ", "Community connectors have undergone automated reviews but aren't verified by Anthropic…./uNRZlm2Pe"
- Plugins/marketplaces: "Claude Code and Cowork plugins you've submitted to the directory. Reviewed plugins are available for anyone to install from the marketplace.14c/QurJSL", "Marketplace "{marketplaceName}" removed.+Wv1iGmUGR", "Add plugins to your workspace from .zip or .plugin archives.0E6W2p0GiB", manifest: "The archive must contain a .claude-plugin/plugin.json manifest, or a top-level SKILL.md…"
- Skills with scan: "Uploaded {count} of {total} skills — ready to use after a quick security scan (1–2 minutes).0C3KVyzDMI", "This plugin didn't pass the security scan.40UsKo+D++"
- Named connectors (icons + strings): Google Drive, Outlook/OneDrive/SharePoint ("Reads your Outlook calendar and mail, opens OneDrive and SharePoint files3+zvohXRyw", "Claude for Outlook1GAyt5I8uf"), Slack ("Claude for Slack22V/ZP0M0I"), Notion ("Export to Notion16Ev5aWXC9"), Jira/Confluence, GitHub, GitLab, Canva, Excel/PowerPoint/Word (icons), JetBrains/VS Code/CLI (code install targets), **Canvas LMS** ("Enable Canvas Integration5y5jlij80c", "To use Claude in Canvas, please click the button below to enable the integration. This is a one-time setup required by Safari.")
- MCP builtins/custom: "McpBuiltinServerWebSearchOpt", "Runs search from the desktop, for inference providers without native web search. Supply the provider's API key…McpBuiltinWebSearchProviderHint2"
- Inference providers/gateway (BYOK models): "Sorry, it's taking a while to connect to your inference provider...4JOYplhtrV", "Full URL of the inference gateway endpoint.6cmRKZgiFv", "Can't reach your inference provider ({host}) from Claude's workspace.AG9k4E3wh6", "Model ID exactly as the provider expects it. The first entry is the default model.1tZVf88rjp"
- Anthropic gateway (enterprise): "Your organization's gateway sent nothing for several minutes while Claude was working…", "Gateway-managed Claude Code"
- Connectors in Chrome: "Turn on the Claude in Chrome connector1iqOtGoaOJ"

## 11. Chrome / Browser
- "Claude in Chrome1XvgYxOFV4"; granular permission prompts: "Claude wants to right-click on the page in Chrome on your computerATOxXSHFO", "Claude wants to take a close-up screenshot in Chrome on your computer05bagvsLJ3", "Claude wants to fill in a form field…106TDKTGYt", "Claude wants to open a new tab…1IdaljVVTV", "Claude wants to read page network requests…1Geg1klryK", "Claude wants to run/list your saved browser shortcut…"
- Site policy: "Whether Claude may open sites in the built-in browser by default; the allowed or blocked list is the exception. Mirrors the Claude in Chrome site policy.+Xd6SuBz42", "Claude will browse and interact with any website in Chrome without asking. Applies to new sessions.…0Jh6jsTpeC"
- Cowork↔Chrome: "This routine will no longer be able to access files and Chrome on {name}./KXRX6u02f", "Can't move this task because it uses Claude in Chrome.+JntkchELp"
- Built-in browser exists as separate surface ("built-in browser"); Safari support note: "This is required for Safari and other browsers with strict privacy settings.5Ye0IppGpk"
- **Dedicated Safari/Chrome extension pages**: `/settings/browser-extension` route; extension upload: "Extension uploaded.0cS6L5E5DQ"

## 12. Account & Usage
- Plans: "Welcome to Max4AHIuatNiK", "Put your new Max plan to work+JP70imiy1", "Thanks for trying the Pro plan0MRQfTjMgD", "Enterprise plan0g7deXDj3b", "Team plans require a minimum of {n} seats0jit/T4dmU", Free: "You're on the Free plan. Here's what an upgrade unlocks.1cEno9CzmL"
- Models in UI: "Haiku/5QNPTXJM2", "Sonnet19jg7N7dJK", Opus ("Access to Claude Opus6897NXmDnD"), **"Fablea10yUyliJu" / "Fable 5 is the most capable model and draws down usage much faster than Opuspoa5n/jzGx"**, "Claude Opus 4.8 is now available in the model pickerBBdIiDX7hr", "Requires Claude 4.6 or newerOHwT1ZEDOL", "Default" alias, tier mapping: "Which Claude tier this model stands in for. Pins the bare alias (e.g. 'opus') and, for opus/fable, the refusal fallback.AJudB3RUvn"
- Limits: "Your Sonnet usage counts toward this limit, as well as your weekly and 5-hour session limits9xNm4jtXWJ", "Opus has its own limits because it consumes usage more quickly6FCwwFP6aI", "Weekly · Opus2+RstobnME"
- Usage credits: "Usage credits2q+3iFQ8FP", "Usage credits draw down as you go. Good for occasional busy days.7PQu3bgx83", "Get faster responses and automated code review when you buy usage credits.24lBjEianV", "Promotional creditVbIVGZrTHA", "/command promo: "usage credits added — thanks for trying the feature of the week"
- Billing extras: subscription pause ("Take a break without losing your setup. Billing stops on <b>{pauseStartDate}</b>…4CuxnMbvO7"), gifting ("Gift a week of Claude Design6VmHLzew7R"), "Mobile subscription active7DuyeaIfde", "Billing history6IVnvBB9Pl"
- Org admin: "Manage your organization: members, workspaces, API keys, and settingsA/14O6Lff2", roles/groups: "Which models this {principalType, select, account {member} other {group}} can use…JgwdfKRZCS", budgets: "This request exceeds your group's budget…0EvlqDfulB", "Usage credit requests turned on7/0pxcYQhw", SCIM/SSO/IdP strings, domain verification ("Refresh verification status of {domain}5l15LP9G4+"), IP allowlist ("The allowlist is on, so API requests and Console sign-ins…will be rejected within 15 minutes…"), audit/compliance API ("Enable enterprise compliance API access to audit your organization's data./79dwa2C+/"), HIPAA ("Self-serve HIPAA enrollment isn't available…0dv+77lh5q")
- Age verification: "We found signals that your account was used by someone under 18. Claude is for users 18 and over.gVJFzpb3d2", "Verify your age below to restore access — it takes about a minute.07wyFD4X5d", "How does age verification work?8EHxLoXmVO"
- Sign-in: "Login code2FuQjAui2U", "Enter your phone number to get a verification code3CEaWKoL+O", "Add a phone number to protect your account6531P6q5jv", "Trusted devices18gCDdEl3N"

## 13. Dialogs & Permissions
- Tool approvals: "Allow onceO2tb5KUxpc", "Always allow for this websiteIqIbyB46Wa", "Allow for this chat0PG1bWgzss", "Allow for this taskX2n9R87ZBD", "{count} connector tools always allowed · Forget", persistence note: ""Always allow" choices now persist after you quit the appIUPKlO6l3S", scope: "Allow once applies to this page only. Always allow saves on this device (revoke in Settings). Claude won't purchase, create accounts, or bypass captchas without asking.G2uuEyevXT", admin toggle: "Allow "Always allow" for connector toolsQsPpG/Wasa"
- Guardrails: "This is a financial site. Claude won't purchase, transfer funds, or enter payment details without your input.IVwjjSRxjO", "This site is on a private network…Vbzwu2zoa1"
- Computer use approval: "Computer use approvalWYU2QkA13l", "Turn on computer use?FL22V2dlmY", "Claude will see the apps you approve and click and type in them, working in the background while you keep using your computer or taking full control of your screen.…KilH6bk77T", two macOS permissions: "Computer use needs two macOS permissions. Click each one, grant it in System Settings, then come back here.fqS8ksg3Cb"
- Permission modes: "Permission modegOtSUIHPxN", "Permission mode: {mode}Z1ssd87d9Y", "Make auto mode your default permission mode?xBFnls3REC"
- Trust: "Trust workspace0L2liwSugy", "Folder isn't trusted, so the task wasn't started./K44c1drQF", "This trust request is out of date+sjwMSkjJ/"
- Skill/plugin scan: "The security scan found that this skill may {reason}. Only use this skill if you trust the source.3n3kmpcDyp"
- Error/limit dialogs (sample): "Usage limit reached", "Too many requests. Try again in a moment./5WTQ3Z15L", "This chat is too long to continue. Compact it…or start a new chat.j4gDC1/jbD", "Claude's workspace requires Virtual Machine Platform…MS31mUeCE6", "Paused while the preview is overloaded.…2BZ9HcZwLs", "Couldn't rewind to this message because … a rate limit … was hit."

## 14. Shortcuts
- "Use system shortcuts (⌘Q, ⌘Tab, and similar)PDHlS6OqUX"; "Quick access shortcut" / "Alt+Space"; "Quick Entry keyboard shortcut"; "Dictation shortcut"; "Set a global shortcut"; conflict errors: "This shortcut is already in use by another app…", "This shortcut combination isn't supported…", "This shortcut is reserved for common actions…"
- In-app: "cmd+click" sidebar to popout; "[[ctrl+]]] and [[ctrl+[]] cycle focus between split panes1pDTicCdea"; "Press Control+Shift+Left Arrow or Right Arrow to move the terminal6kB702IYbK" / "…to move the fileF/IKmdaRtF"; "press Shift+Delete or Shift+Backspace to remove from recent"; "Ctrl+D9mRD/6SHCw"; "press Enter to move into it. Inside, press F6 or Ctrl+F6 to move back out" (preview SR flow); "Picked up question {number}. Use the arrow keys to move it, space to drop it, escape to cancel."
- ⌘ glyph is rare in i18n (shortcuts mostly shown via key components); literal "⌘" appears once (system shortcuts row).

## 15. NEW vs previous study (not in known list)
1. **Research** — top-level mode/nav: "ResearchJEe7dVso7F"; "Deep research and extended thinking"
2. **Claude Design** — standalone product: "Claude Design [standalone]93hUHzRSTN", "Create and modify your Claude Design projects7syyPo6BcF", "Upgrade to design with Claude1jUeeST0DZ", own icon (`claude_design-icon`), usage line item ("Used Claude Design1aXXpPJFBF"), settings (`design settings`, "Allowing for this session also lets other Claude products, like Claude Code, access your Claude Design projects")
3. **Anthropic Labs** — "Anthropic LabsttyT7kLLym", "Help improve Anthropic Labs6MTaWKlRIw", "Share data to improve Labs" (+ "experimental features might influence Claude's behavior")
4. **Claude Academy / Anthropic Academy** — "Claude AcademyOUSKTW0lXW", "Claude in AcademyBFvWbbq0Td", "Anthropic AcademyL9aaTnFe5M", "View enrollment and completion reports for your Academy organization"
5. **Claude for Teachers** — `/teachers` settings + routes: "Settings → Teachers", "Teacher status verifiedA6uAxyEbGo", "Set up your classroom profile so Claude can tailor lesson plans…", "Your teaching skills are loaded, and educator-only connectors are available."
6. **AI fluency** — "AI fluencyN0WKE42jSu", "AI fluency for pK-12 educators7R1HlZCjd9" (settings section)
7. **Canvas (LMS) integration** — "Enable Canvas Integration", "Claude is managed by Anthropic…Canvas is managed by AnthropicIL25i48nyt", "return to Canvas" course-launch flow
8. **Notes & Notebooks tools** — "Notes7+DomhYCSv", "Editing notebook…Di4TuBkw8m", "Edited {count} notebooks"
9. **Slides** artifact type ("SlidesAd9Gcynipw") and **Mermaid diagram** artifact ("Mermaid diagramxz/cIYRwG0")
10. **Live artifacts** (Cowork) — "Explain what live artifacts are in Cowork"
11. **Read Aloud** with speakers — "Read aloud", "Speakers", "{speaker}: {text}"
12. **Dictation** (push-to-talk) + own settings section — "Dictation shortcut", "Press once to start dictation…"
13. **Fast mode** — "Toggle Fast mode from the model picker…", "Claude Code fast mode"
14. **Fable / Fable 5** model tier + **Opus 4.8** + **xhigh/max** effort levels ("low, medium, high, xhigh or max")
15. **Usage credits** (drawdown credits; weekly-limit overflow) — "Turn on usage credits to keep going", "feature of the week /command"
16. **Ultrareview** — remote repo review agent: "Run ultrareview", "Launch a remote Ultrareview session for this repository"
17. **Claude Security** — org security scans: "Access your Claude security scan results", "security/stopped_at_time_limit"
18. **Code Review** — automated GitHub review: "Daily code review", "Code Review costL8llNnDKU/"
19. **Claude Tag** — Slack identity product: "Restrict to roles with Claude Tag access", "Claude Tag in Slack"
20. **Dispatch** (phone→desktop task dispatch + pairing) — "Dispatch from anywhere", "Pair workspace", "Mobile camera access"
21. **SSH remote sessions / Remote Control / hosts** — "SSH host (user@host)", "turn on Remote Control", jump hosts
22. **Cloud Cowork sessions + task linking/moving** (cloud ↔ this computer, web/phone origins) — "This task was started on your phone…", "Continue in cloud"
23. **Background tasks/agents panel** — "Background tasksPO+0DdDIId", "All background agents stopped"
24. **Strict sandbox / VM isolation / device simulator** — "Require full VM sandbox", "Enable additional VM-level isolation for the Cowork sandbox.", "The device simulator is not enabled on this platform."
25. **Inference providers / gateway (BYOK models)** — "Full URL of the inference gateway endpoint.", "connect to your inference provider"
26. **Age verification / under-18 holds** — "Claude is for users 18 and over", "Verify your age below to restore access"
27. **Claude Insights** (admin analytics) — "Enable Claude Insights to see what your team uses Claude Code for…"
28. **Time limits** settings (`/settings/time-limits`) + scan time limits
29. **Interactive questions** (structured Claude asks: single/matrix/scale) — "Matrix question", "{question} Selected: {value} of {scale}, {label}."
30. **Accessibility reader** — "Accessibility reader: {reader}"
31. **Skill/plugin security scanning** — "Skill and plugin security scanning", "This plugin didn't pass the security scan."
32. **Routines** (API-triggered scheduled prompts, distinct from Schedules nav) — "Edit the routine and re-add the API trigger"
33. **Artifact watch / Shared by agent** — "Claude can watch this artifact from the command line", "Shared by agent+r24dBooXy"
34. **Subscription pause & gifting** — "Take a break without losing your setup…", "Gift a week of Claude Design"
35. **Sidebar customization + popout windows + activity sidebar** — "Edit sidebar…", "drag it out from the sidebar"
36. **Onboarding arms** (JS flags) — `gate_onboarding_enterprise_guided`, `gate_onboarding_prosumer_guided`
37. **Clawdmart / Clawd the crab** easter-egg link tab (clawdmart.com) + mascot video
38. **"This computer"** settings section naming (computer-use/sandbox/dispatch/SSH rows)
39. **Auto permission mode** as new Code default — "Auto mode is now Claude Code's default permission mode"
40. **Not found (explicit)**: Quests, Halo/session halo, Imagine/image generation product (no image-gen tool strings; only attachment image limits), VNC/RFB/"screen share" (no hits), learning-mode as a named feature, "screen capture window picker" as named UI (computer-use per-app approval exists instead: "You'll approve each app, but not confirm each step").

## Frames (window chrome summary)
- **frame-shell.html** — `<title>Artifact</title>`: popout **Artifact window** chrome. Header `aria-label="Artifact controls"` with skeleton home/title/avatar; `#hdr-degraded` fallback: "Content is user-generated and unverified."; `#frame-slot` hosts the sandboxed artifact iframe; loading/err slots; chunks `frame-shell-chrome`, `frame-shell-broker`, `frame-shell-deferred`.
- **frame-connect.html** — `<title>Connect</title>`: small 440px-card **connector OAuth/connect window** (`.window-card`), loaded via `frame-connect` chunk.
- **frame-manage.html** — `<title>Share</title>`: small-card **share/manage-access window** (share links/permissions), same window pattern.
All three share `shared-frame-boot`/`shared-frame` runtime, `Anthropicons-Variable` font, light/dark color-scheme CSS; `_frame-rt/` holds 9 woff2 fonts for these frames.

## Media surface hints
- `audio/voice/` — 5 voice personalities + voice onboarding + approval/mode SFX (see §8).
- `images/install-hub/` — install targets: Claude Desktop, Claude Code (Desktop & Terminal icons), **Claude Design**, Cowork, Chrome extension, VS Code, JetBrains, CLI, plus Office/Teams/Slack icons and `lydia-avatar.png` (onboarding persona).
- `images/appearance/{auto,dark,light}.png` — appearance picker art; `images/code/{CLI,IDE,Web,Web-v2}.png` + `code-review-promo.png`; `illustrations/session-{context,progress,artifacts}.svg` (session triage columns); `crochet/browser.png`; `nudges/claudecode.png`; `settings/data_privacy.svg`.
- Root workers: `completionGzipWorker` (completion streaming), `framebufferCanvasWorker` (artifact canvas/computer-use frames), `highlightWorker` (syntax highlighting), `wasm` (sandbox runtime), `rumEncoder.worker` (RUM telemetry).

## SURFACE COUNT
- **~90 distinct user-facing surfaces identified** across: 18 nav/mode surfaces; **38 settings sections** (Preferences, General, Appearance, Accessibility, Notifications, Language, Advanced, Privacy, Data controls / data-privacy-controls, Usage, Billing, Capabilities, Connectors, MCP, Design systems, Claude Code, Cowork, Chrome/browser-extension, Desktop→Extensions, Desktop→Developer, This computer, Dictation, Voice, Models, Memory, Skills, About, System prompt, Account, Members, Identity, Insights, Time limits, Teachers, AI fluency, Reflect, Usage credits, Claude Tag/admin + Skills/Plugins scan admin); ~30 composer/message actions; ~14 artifact actions/variants; 8 Cowork subsystems (VM, cloud/desktop linking, dispatch, phone pairing, files, background agents, projects, routines); 12 Code subsystems (worktree, diff, terminal, rewind, permission modes, Code Review, Claude Security, Ultrareview, SSH/hosts/Remote Control, sandbox, agents, scheduled/routines); Voice (mode+5 voices+dictation+Read Aloud); Memory & output styles; Connectors/MCP/plugins/marketplace (incl. ~20 named connectors); Chrome; Account & usage (plans, credits, limits, age verification, org admin); ~8 dialog/permission families; shortcuts; 40 NEW/renamed items listed in §15.
