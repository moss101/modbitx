# Claude Desktop study notes for Modbitx

Source inspected read-only: `Claude.app` version **2.16120.0**, bundle id `com.anthropic.claudefordesktop`, plus `EXTRACTION-MANIFEST.md` and the English UI strings in `Contents/Resources/ion-dist/i18n/en-US.json` (32,243 strings). Proprietary script, fonts, icons, and native helpers were not copied into this repo. The 2026-10-02 deep analysis of this bundle lives in [PARITY-ANALYSIS.md](PARITY-ANALYSIS.md) and `research/2026-10-02-deep-analysis/`. The 2026-10-03 study of Devin Desktop (the Windsurf-lineage VS Code fork at `~/zee/Devin.app`, v1.126.0) lives in `research/2026-10-03-devin-analysis/`.

## Shell

Electron app with helper processes (GPU, plugin, renderer), Squirrel updates, a `claude://` URL scheme, and an MSAL scheme for Microsoft sign-in. Document types include desktop extensions (`.dxt`, `.mcpb`), skill files, folders, text, PDF, Office, EPUB, and common images. Menu-bar tray icons ship for macOS, Windows, and Linux. A quick-entry shortcut and a separate quick window are part of the product language.

## Three modes in one window

Strings describe a single desktop home for **Chat**, **Cowork**, and **Code**:

- Chat is the thread surface: model switch, effort (`low`, `medium`, `high`, `xhigh`, `max`), edit, regenerate, branch, star, pin, archive, incognito, attachments, and search across chats and projects.
- Cowork hands a task to a session that can see granted folders, connectors, a built-in browser story, artifacts in a side panel, and background work that continues while the computer stays awake.
- Code is the Claude Code session list: point at a repo, continue a session, model switch, remote/SSH constraints, and published artifacts.

## Side surfaces

- **Projects** with custom instructions, knowledge files, icon/color, and project-scoped search. Local projects and cloud projects are distinguished in the parent; chats are not always allowed inside local projects.
- **Artifacts**: interactive previews in a side panel, a library, publish/share/versioning, and an org toggle. Code execution is required for some artifact types in the parent.
- **Customize**: connectors and skills moved here. Directory connectors, custom servers, desktop extensions, plugins, memory, and styles.
- **Connectors** (Google-style work tools, GitHub, mail, calendar, custom MCP, desktop extensions). Extensions run on that computer only. Developer MCP can be disabled by device management.
- **Skills**: bundled document, PDF, slides, spreadsheet, and frontend-design payloads exist under `app-unpacked/resources/bundled-skills/`. Skills can carry executable instructions; the parent warns about untrusted sources.
- **Memory** for chat and for Cowork, with an off switch that keeps files but stops reading them.
- **Scheduled tasks / routines**, including cloud routines and tasks that only run while the computer is awake.
- **Dispatch**: a short handoff into a longer background thread.
- **Computer use**: macOS permission gates (the parent ships `app-cu-helper` and a Swift addon). Modbitx implements it behind the same grants: clicks, typing, hotkeys, scroll, pointer moves, and screenshots, with a per-task approval before the first action.
- **Voice mode**, screenshot/attach, and quick entry.
- **Cowork remote control**, cloud cowork, OTel monitoring, retention, and org admin policies. Those are account-server features. Modbitx keeps the local counterparts (tasks, folders, schedules) and leaves org policy as copy in Settings.
- **Incognito** threads stay out of history and search.
- iOS simulator helper and Chrome companion MCP are present in the parent bundle. They are called out here and are not reimplemented.

## Design

Warm paper background, serif titles, compact sidebar, mode switch, pill composer, and a right-hand artifact pane. Anthropic’s proprietary font files and icon car were not reused. Modbitx uses Newsreader, Figtree, and IBM Plex Mono, with a teal accent instead of the parent mark.

## Modbitx mapping

| Parent surface | Modbitx |
| --- | --- |
| Chat thread, effort, model | Implemented. Default model `grok-4.7`, effort extra high, xAI chat completions |
| Cowork folder task | Folder grant via system dialog; names are listed into the prompt |
| Code session | Same thread type scoped to a folder |
| Projects, knowledge | Local projects; text files can be stored on the project |
| Artifacts | Fenced `artifact` blocks render in a sandboxed iframe or as text |
| Connectors, skills, memory, styles | Local toggles and notes included in the system prompt |
| Scheduled tasks, dispatch, quick entry | Local scheduler while the app is open; ⇧⌘Space window |
| Computer use | Implemented behind the macOS Screen Recording and Accessibility grants; every task asks first |
| MCP process spawn | Implemented (stdio JSON-RPC client) |
| Cloud sync, voice transport, org admin | Documented. Not executed |
