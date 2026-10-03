# Modbitx vs Claude Desktop — Design-Gap Analysis

Date: 2026-10-02 · Scope: visual + interaction design of the renderer UI. Read-only comparison; all evidence quoted from the bundles on disk. Modbitx must keep its own fonts (Newsreader / Figtree / IBM Plex Mono) and original assets — recommendations below never propose copying Anthropic fonts, icons, logo, or copy.

---

## 1. Method

**Modbitx (read):** `src/styles.css` (all tokens/components), `index.html` (Google-font loads), components `Workspace.tsx`, `Sidebar.tsx`, `Composer.tsx`, `ThreadView.tsx`, `Pages.tsx`, `SettingsView.tsx`, `CodeDock.tsx`, `BrowserPane.tsx`, `src/shortcuts.ts`, theme wiring in `App.tsx` (`--text`, `--transcript`, `--mono` set at runtime).

**Claude Desktop (read):** `/Users/mohsin/zee/Claude/Claude.app/Contents/Resources/ion-dist/`
- `index.html` (45KB, read fully — contains large inline `<style>` blocks: boot styles, `#static-composer` composer styles, sidebar skeleton, greeting sizing).
- `frame-shell.html` (artifact iframe shell: own `mode light|dark|system`, `platform desktop`, `font anthropic|system`).
- CSS: real stylesheet chunks exist under `assets/v1/`. Main file `c6a992d55-C7KEixqs.css` (1.44MB, Tailwind v4 `@layer theme` + a "CDS" (Claude Design System) token layer). Extracted with perl one-liners (`:root{...}`, `[data-theme=claude]...`, `[data-density=...]`, `--cds-*`, `.animate-*`, `@keyframes`).
- Fonts: `_frame-rt/_runtime/AnthropicSans-…woff2`, `AnthropicSerif-Roman-Variable…woff2`, `AnthropicMono-Roman…woff2`, plus `anthropicons-variable-1-13-0.woff2` (icon **font**).
- i18n: `i18n/en-US.json` (2.3MB flat hash→string) sampled for structure words.
- Media: `images/appearance/{auto,dark,light}.png`, `images/settings/data_privacy.svg`, `audio/voice/sfx/{tool_approval_needed,enter_voice_mode,exit_voice_mode,disconnected}.mp3`.
- JS behavior samples: send-button spring in `c04e7453f-BIk_78sL.js`, sidebar grid `--df-sidebar-width,288px` and shortcut-hint rows in `cf400e6a4-CtCiyCEj.js` / `shared-24-Bdy5JIXG.js`.

---

## 2. Claude Desktop design tokens (evidence)

### 2.1 Theme architecture
- `<html data-theme="claude" data-mode="system" data-density="comfortable" class="cds-root h-screen antialiased scroll-smooth">` (index.html). Three system dials: **theme mode** (`data-mode=system|light|dark`), **density** (`compact|comfortable`), plus sidebar chrome (`data-sidebar-chrome=classic|rail|none`, preference `data-sidebar-chrome-preference`).
- Dark strategy: token swap via `[data-mode=dark]` attribute selectors **plus** `@media (prefers-color-scheme:dark)` for `data-mode=system` (262 occurrences of the media query in the main CSS). No `.dark` class.
- `theme-color` meta: light `#fcfcfb`, dark `#151515` (index.html).
- `--cds-rem-scale: calc(16 / 17)` — tokens are authored on a 17px root then multiplied back; ≈6% smaller than raw rem.

### 2.2 Color — two shipped layers
**(a) Current CDS layer** (what `body.bg-surface-1` actually renders), from `.cds-root` block:
- Literal grays: `--cds-gray-0:#fff`, `-10:#fcfcfb`, `-20:#f9f9f7`, `-50:#f0efec`, `-100:#e1e0d9`, `-200:#c3c2b7`, `-250:#b4b3a8`, `-300:#a5a49a`, `-400:#898781`, `-450:#7b7974`, `-500:#6d6b67`, `-550:#5f5e5a`, `-600:#52514e`, `-650:#454442`, `-700:#383835`, `-750:#2c2c2a`, `-800:#20201f`, `-830:#1a1a19`, `-850:#151515`, `-900:#0b0b0b`.
- Light surfaces: `--cds-surface-0:gray-20 (#f9f9f7)`, `surface-1:gray-10 (#fcfcfb)`, `surface-2/3:gray-0 (#fff)`, `--cds-page-bg:surface-1` (overridden inline in index.html) → **page #fcfcfb, panels/popovers #fff**.
- Dark surfaces: `--cds-surface-3:gray-800 (#20201f)`, `surface-2:gray-830 (#1a1a19)`, `surface-1:gray-850 (#151515)`, `surface-0:gray-900 (#0b0b0b)` → **page #151515, composer/popovers #20201f — a warm near-black, never pure black**.
- Text: light `text-primary gray-900 #0b0b0b`, `secondary gray-600 #52514e`, `muted gray-400 #898781`; dark `primary gray-50 #f0efec`, `secondary gray-200 #c3c2b7`, `muted gray-400 #898781`. Disabled opacity `.4`.
- Accent: `--cds-clay:#d97757`, `--cds-clay-emphasized:#c6613f`; `--cds-fill-brand:clay-emphasized`, hover `clay`. Supporting pictogram hues `--cds-heather:#cbcadb`, `--cds-plum:#827dbd`, `--cds-cactus:#bcd1ca`, `--cds-mineral:#629987`.
- Borders are **alpha hairlines**, not solid colors: `--cds-border:hsl(from neutral-900 / 10%)` (alpha-2), `--cds-border-strong:20%`; sidebar edge is `border-right:.5px solid var(--cds-border)`.
**(b) Legacy `data-theme=claude` ramp** (still in the CSS, HSL triplets): light `--bg-100:48 33.3% 97.1%` (#faf9f5), `--bg-200:53 28.6% 94.5%` (#f5f4ed), `--bg-300:48 25% 92.2%` (#f0eee6), `--bg-400:50 20.7% 88.6%` (#e8e6dc), text `60 2.6% 7.6%` (#141413) / `23.3%` (#3c3c3b) / `43.7%` (#70706f); dark `--bg-000:60 2.1% 18.4%` (#31312d), `--bg-100:60 2.7% 14.5%` (#272723), `--bg-200:30 3.3% 11.8%` (#211e1b), text `#faf9f5`. (Modbitx's palette is derived from this classic ramp — see §4.)

### 2.3 Typography
- Families (`:root` block): `--font-anthropic-sans:"anthropic-sans", system-ui…`; `--font-anthropic-serif:"anthropic-serif", Georgia…`; `--font-anthropic-mono:"anthropic-mono", ui-monospace`; accessibility alternates `OpenDyslexic`, `Atkinson Hyperlegible Next`; CJK stacks. Files on disk: `AnthropicSans-Roman-Variable-26-179-2.woff2` (variable weight), `AnthropicSerif-Roman-Variable…`, `AnthropicMono-Roman…`.
- Roles: sans = whole UI (`body.font-sans`); serif = display/greeting/voice (`--cds-font-voice:var(--font-anthropic-serif,ui-serif)`; greeting uses `font-display` / `font-ui-serif font-[360]` — **variable weight 360, dark mode 320**, i.e. a *light* display serif); mono = code/terminal (`--cds-font-mono-ui`).
- Size scale (comfortable density): `caption .75rem`, `footnote .8125rem`, `code .8125rem`, `body .875rem` (≈13.2px after rem-scale), `prose 1rem` (chat text), `heading .9375rem` (controls, composer input), `title 1.375rem` (≈20.7px). `--cds-font-size-text-entry-floor:16px` — inputs never render below 16px. Compact density: body .8125rem, heading .875rem.
- Leadings: body `1.25rem`, heading `1.25rem`, title `1.75rem`, prose `1.5rem`. Weights: `regular 400 / medium 500 / semibold 580 / bold 600`; variable-font axis values `"wght" 360/400/460/530/560` used for serif display.
- Greeting size (index.html inline): `--new-page-greeting-font-size:clamp(1.875rem, 1.2rem + 2vw, 2.375rem)` (30–38px), home variant `clamp(1.5rem,…,2rem)` (24–32px), `line-height 1.25/1.2`, `text-balance text-center`.

### 2.4 Space, density, radii, hairlines
- Tailwind base `--spacing:.25rem`; semantic scale (comfortable): `pad-xs/sm/md/lg/xl = .375/.5/.75/1/1.5rem` (×rem-scale ≈ 6/8/11/15/23px), `gap-xs/sm/md/lg/xl = .5/.75/1/1.75/2.5rem` (≈8/11/15/26/38px). Compact shifts each down one notch.
- Control metrics (comfortable): `--cds-h-control:2rem×scale ≈ 30px`, `--cds-icon:1.25rem×scale ≈ 20px`, avatar `md 2rem`, switch `h 1.25rem`.
- Radii: Tailwind scale `xs .125 → 3xl 1.5rem`; `--cds-radius:.5rem×scale ≈ 8px` (comfortable) / `.375rem` (compact); **`--cds-radius-composer:.875rem×scale ≈ 14px`** (comfortable) / `.75rem` (compact); the legacy static composer box uses `border-radius:20px`.
- Shadows: `--cds-shadow-sm:0 1px 2px 0 …6%, 0 2px 8px …8%`, `shadow-md/lg` step up; `--cds-shadow-popover:0 8px 24px #0000001f, 0 2px 6px #00000014`; composer shadow `0 .25rem 1.25rem color-mix(black 3.5%)` + **inset 1px ring** (`--cds-ring-inner:1px`), focus-within raises shadow to 7.5% and ring color to `--cds-border-strong`. Focus ring system: `--cds-focus-shadow:inset 0 0 0 1px page-bg, 0 0 0 1px fill-accent, 0 0 6px 1px bg-accent`.

### 2.5 Layout skeleton
- **Sidebar:** `--df-sidebar-width,288px` (JS grid `md:grid-cols-[var(--df-sidebar-width,288px)_minmax(0,1fr)]`); static skeleton `width:18rem` with `.5px` right border and bg `color-mix(surface-0 50%, surface-1)`. Modes: classic (288px), **rail** (narrow strip, `--static-sidebar-width`), none. i18n: "Open sidebar"/"Close sidebar", "Pin to sidebar", "Pinned {name} to the sidebar", sections "Recents", "Projects", "Pinned", "Starred".
- **Chat column:** `--chat-column-measure:40rem` (640px) default, 850px overview variant; gutters `--chat-column-gutter-start/end` (default 32px); composer column `max-w-2xl (42rem/672px)`, marlin arm `max-w-[40rem]`.
- **Composer:** surface-3 card, `rounded-composer` (14px), pad `.875rem`/`--cmp-pad-x .5rem`, `--cmp-gap-y .375–.5rem`, input text `--cds-font-size-heading` (15px) `leading 1.4`, `min-height:calc(2lh + 6px)` (two lines), `max-h-96`, textarea `field-sizing:content`, placeholder `var(--cds-text-muted)`, placeholder "How can I help you today?"; attachment tiles `7.5rem` squares `rounded-lg border-0.5 border-strong bg-surface-1`. New-page composer floats at `top:calc(18vh + greeting)`; in-thread it docks sticky bottom (`dock:sticky dock:bottom-0 dock:bg-surface-1 dock:pb-10`).
- **Artifact pane:** dedicated iframe shell (`frame-shell.html`, title "Artifact") with own mode/font dials; host caps include `chat-beside`, `artifact-nav`, `header`, `export`, `chrome-readonly` → artifact opens **beside** chat as a resizable panel with its own toolbar and nav, not an inline card. i18n: "Artifact panel{title}", "Switch artifact".
- **Density setting:** `data-density` swaps the entire CDS metric block (§2.4). i18n confirms "Maximum width of the transcript and composer columns." (transcript width setting) and "Transcript text size".

### 2.6 Motion
- Base: `--default-transition-duration:.15s`, easing `cubic-bezier(.4,0,.2,1)`; CDS durations `--cds-dur-fast:60ms`, `dur-snap:.12s`, `dur-base:.2s`, `dur-sheet:.3s`, `dur-slow:.45s`; easings `--cds-ease-out:cubic-bezier(.165,.84,.44,1)`, `ease-snap:cubic-bezier(.32,.72,0,1)` (iOS-sheet feel), `ease-overshoot:cubic-bezier(.34,1.3,.64,1)`, plus a real spring `--cds-btn-spring:linear(0,.2459,…,1)`.
- ~90 named keyframes/animations, incl. `animate-transcript-in{animation:.3s ease-out fade-in-to-current}` (new messages), `composer-control-in` (75ms fade of composer controls), `chip-in` (.3s overshoot), `sent-chip-tick` (.16s), `pulse-dot` (1.5s infinite — streaming indicator), `byline-sent-pulse` (.9s), `sidebar-group-expand`, `search-menu-expand`, `question-in-next/prev`, `screen-drop-in`, `palette-card-morph`, scroll-edge fades (`--cds-scroll-fade-top/bottom…`), skeleton sheen for boot.
- Message actions: hidden until hover via `--cds-message-actions-opacity:0` + `scale`, revealed with dedicated in-duration/ease vars (opacity+scale transition), and a `@property` so the opacity itself animates.
- Send button (JS, framer-motion): `initial:{scale:.6,opacity:0} → {scale:1}`, `whileTap:{scale:.9}`, `exit:{scale:.6,duration:.12}`.
- `prefers-reduced-motion`: honored (1 CSS block + JS-side checks); motion setting string "Reduce animation in streaming responses and other interface elements."

### 2.7 Iconography, sound, imagery
- Icons: **Anthropicons variable icon font** (`@font-face` family `Anthropicons-Variable`, rendered `width/height:1em` at `--cds-icon` 20px comfortable / 16px compact; `font-feature-settings:"liga" 0`). Plus hashed SVGs for one-off art and `images/appearance/{auto,dark,light}.png` as **theme-picker preview thumbnails**, `images/settings/data_privacy.svg`.
- Sound: `audio/voice/sfx/tool_approval_needed.mp3` (approval chime), `enter_voice_mode.mp3`, `exit_voice_mode.mp3`, `disconnected.mp3`.
- Shortcut hints are first-class UI: `--cds-shortcut-cap-ink/fill/line` tokens render keyboard "caps"; composer help popover rows: `shortcut:"enter" → "Send message"`, `"shift+enter" → "New line in message"`, `"cmd+enter"`; stop exposes `stopShortcut:"Esc"`; i18n "Keyboard shortcuts", "Quick access shortcut", "Shortcuts you type with a slash."
- Approval UX: buttons "Allow for this task", "Allow for all tasks", "Always allow for this website", "Don't allow"/"Deny"; sound cue; "Claude is in plan mode, so only you can approve this."

### 2.8 Settings surface
- Settings nav strings: "Settings", "Preferences", "Appearance", "Display", "Motion", "Chat font", "Interface font" (options "Anthropic Sans"/"Anthropic Serif"), "Transcript text size", "Transcript width", "Accessibility", "Keyboard shortcuts". Theme picker uses image previews; custom code font string "Set a custom monospace font for code and terminal."; "Light code theme"/"Dark code theme".

---

## 3. Modbitx design tokens

From `src/styles.css` (light `:root`, dark `[data-theme="dark"]`), `index.html`, `App.tsx`:

| Token | Light | Dark |
|---|---|---|
| `--bg` (page) | `#faf9f5` | `#262624` |
| `--sidebar` | `#f5f4ed` | `#1f1e1c` |
| `--panel` | `#ffffff` | `#30302e` |
| `--ink` (text/accent) | `#1f1e1b` | `#f3f1ea` |
| `--muted` | `#8a867c` | `#b7b2a6` |
| `--line` | `#e8e6dc` | `#3c3b36` |
| `--soft` (hover fill) | `#f0eee6` | `#2a2926` |
| `--user` (user bubble) | `#f0eee6` | `#3a3833` |
| `--warn` | `#8d3b28` | `#f0b7a4` |

- Note: light tokens are the **classic claude ramp** almost verbatim — `#faf9f5 = hsl(48 33% 97.1%)`, `#f5f4ed = bg-200`, `#f0eee6 = bg-300`, `#e8e6dc = bg-400` — but the current desktop ships the CDS gray layer (`#fcfcfb` page / `#f9f9f7` alt surface), which is cleaner/cooler and reserves `#faf9f5` warmth for content surfaces.
- Fonts: `--serif:"Newsreader",…` (brand/display, weight 500), `--sans:"Figtree",…` (UI), `--mono:"IBM Plex Mono"` (runtime-overridable), plus `data-font=serif|system` interface-font modes (parity with "Interface font"). Loaded weights: Figtree 400/560/650, Newsreader 400/560 opsz, Plex Mono 400/500.
- Base text `--text:16px` (settings "Transcript text size" rewrites it), transcript measure `--transcript:740px` (width setting exists), assistant body = **serif 18px/1.45**, user bubble = soft pill `radius 18px`, code blocks `#211f1c/#f4f0e7` radius 12px mono 12.5px.
- Layout: sidebar 268px (collapsed 72px), settings nav 192px, filetree 220px, artifact 420px, browser `min(520px,46vw)`, composer radius **24px** with `0 8px 28px rgba(40,36,24,.06)`, send = 32px circle `↑`, approval card radius 16px, palette overlay radius 16px, switches 36×22, segments radius 8px.
- Motion: global reduced-motion kill-switch (`data-motion=system|reduce`, `animation/transition-duration:.01ms`) — stronger than reference; only 3 named animations total (`pulse` 1.2s step-dot, `switch` 160ms transform, hover-reveal `.msg-actions` opacity only).
- Accessibility: `:focus-visible` outlines on segments/switch/settings-nav only; inputs `outline:none` (border-color change); no density control; no sound cues; no theme preview thumbnails; keyboard shortcuts surfaced in Settings → Shortcuts (⌘K, ⌘N, ⇧⌘N, ⌘1-3, ⇧⌘Space, ⌘,, Enter, ⇧Enter, Esc).

---

## 4. Gap table

| # | Area | Claude Desktop | Modbitx | Gap severity |
|---|---|---|---|---|
| 1 | Page background (light) | CDS `#fcfcfb` page / `#f9f9f7` alt surface; warm `#faf9f5` reserved for content | page = `#faf9f5`, hover fills same family | Medium — Modbitx reads slightly creamier everywhere; less figure/ground separation for panels |
| 2 | Dark palette | warm grays `#151515` page, `#20201f` panels, text `#f0efec`, borders = 10% alpha hairlines | `#262624` page, `#30302e` panels, solid `#3c3b36` borders | Low-Medium — close warmth; borders heavier, page lighter than reference |
| 3 | Sidebar width/states | 288px classic, hairline `.5px` border, bg `mix(surface-0 50%, surface-1)`; rail mode | 268px, 1px solid border color from `--line`, collapsed 72px | Low — width fine; border + fill treatment differs |
| 4 | Transcript measure | chat column 640px (40rem); composer 672px; 32px gutters | 740px transcript, composer +20px, `8vw` gutters | Medium — Modbitx line length ~15% longer |
| 5 | Composer shape | radius 14px (composer token)/20px classic; **1px inset ring + soft drop shadow**; 2-line min-height; 15px input text | radius 24px; 1px solid border + drop shadow; min-height 52px; 16px text | Medium — Modbitx noticeably rounder & flatter hierarchy |
| 6 | Greeting | serif display, variable weight **360 (light)**, `clamp(30→38px)`, `text-balance`, centered, spark glyph | Newsreader 42px weight 500, fixed | Medium — Modbitx greeting heavier and larger than reference scale |
| 7 | UI text scale | body 13.2px / heading 14.1px / title 20.7px (comfortable), caption/footnote/code tiers | base 16px everywhere; titles 22px; captions 12px; steps 13px | Medium — Modbitx UI text runs larger; fewer tiers (no footnote vs caption distinction) |
| 8 | Density setting | global `data-density` compact/comfortable retunes radius/heights/pads/gaps/fonts | none | High — missing whole settings dimension |
| 9 | Radii rhythm | 8px controls (6 compact), 10-12px cards, 14px composer, pill buttons | 8-10px small, 12px cards, 16px approval, 18px bubbles, **24px composer** | Low — mostly fine; composer is the outlier |
| 10 | Borders/hairlines | alpha-of-ink hairlines (10%/20%), 0.5px sidebar edge, inset rings on cards | solid `--line` 1px everywhere | Medium — solid borders look heavier, especially dark mode |
| 11 | Motion system | 5 named durations (60/120/200/300/450ms), 3 named easings + spring, ~90 named entrance animations, scroll fades, hover-reveal w/ scale | global 0.01ms kill-switch, 1 pulse animation, actions fade only (no scale/translate) | High — no entrance choreography, no easing language |
| 12 | Streaming indicator | `pulse-dot` 1.5s, byline pulse, shimmer/weight animation, "Claude · thinking…" | step-dot pulse only; assistant text shows literal "…" | Medium |
| 13 | Send button | spring scale-in (.6→1), tap scale .9, morphs to Stop w/ Esc hint | static 32px circle "↑" / "…", no press feedback | Medium |
| 14 | Keyboard hints in UI | shortcut "caps" tokens; enter/shift+enter/cmd+enter rows; Esc-to-stop caps | shortcuts listed only in Settings → Shortcuts | Medium |
| 15 | Iconography | 20px icon font across nav/buttons/controls | text-only buttons in sidebar/composer; inline 16px SVGs only in Settings nav | High — sidebar/nav/composer lack icons entirely |
| 16 | Sounds | approval-needed sfx, voice mode enter/exit, disconnected | none (TTS `speak` only; dock bounce on approval) | Low-Medium |
| 17 | Theme picker | segmented control **with auto/dark/light preview thumbnails** | segmented control, 16px stroke glyphs | Low |
| 18 | Approval dialog | modal/sheet: "Allow for this task / Allow for all tasks / Don't allow", sfx, spring | inline card `.approval` w/ Allow/Always/Just once/Deny | Low — labels already aligned; missing sound + sheet motion |
| 19 | Artifact pane | separate resizable panel beside chat w/ own toolbar, mode dials, nav, export | fixed 420px right column, iframe radius 12px | Medium |
| 20 | Focus states | 2-layer focus shadow w/ accent glow (`--cds-focus-shadow`) | 2px ink outline on 3 controls only; text inputs lose outline | Medium |
| 21 | Reduced motion | respected per animation | global 0.01ms kill-switch (stronger) | Modbitx ahead — keep |
| 22 | Empty states | greeting + suggestion prompts w/ entrance animation, scroll fade | serif h2 only (28px `.empty` / 42px `.hero`) | Low-Medium |

---

## 5. Prioritized recommendations (top 15, exact CSS-level suggestions)

All suggestions use Modbitx's own fonts and original assets. Values cite the evidence above.

1. **Adopt a two-tier warm neutral page (light).** Keep `--panel:#fff`; change `--bg:#fcfcfb` and add `--bg-alt:#f9f9f7` (CDS gray-10/20). Use `--bg` for the main field and `--bg-alt` for the workspace strip/banners (`background:var(--bg-alt)` on `.banner`, `.filetree`, `.code-dock`). Keep `#faf9f5` family for content surfaces (composer, cards) so warmth lives where attention is. Dark unchanged except #2.
2. **Dark page → `#151515`, panel → `#20201f`.** Replace `--bg:#262624→#151515`, `--panel:#30302e→#20201f`, `--sidebar:#1f1e1c→#111110` (between CDS gray-850/900, keeping your mix), `--soft:#2a2926→#1f1f1d`, hover on dark = `rgba(255,255,255,.06)`. Evidence: CDS surface tokens §2.2.
3. **Alpha hairline borders.** `--line: rgba(31,30,27,.10)` light / `rgba(240,239,236,.10)` dark (`--line-strong: 20%` for inputs/focus). Add `border-right:.5px solid var(--line)` on `.sidebar` instead of tone change. This immediately lightens every card in dark mode (evidence: `--cds-border` alpha-2, `.5px` sidebar rule).
4. **Composer: 14px radius + ring shadow.** `.composer{border-radius:14px; border:0; box-shadow: inset 0 0 0 1px var(--line-strong), 0 4px 20px rgba(0,0,0,.05)} .composer:focus-within{box-shadow: inset 0 0 0 1px var(--ink-30), 0 4px 20px rgba(0,0,0,.08)}`. Set textarea `min-height:calc(2*1.4em + 6px)` and `font-size:15px` (heading tier), keep 16px only if IME floors demand (`--cds-font-size-text-entry-floor:16px` does — so keep 16px on iOS-touch, 15px desktop).
5. **Transcript measure 640px + 32px gutters.** `--transcript:640px`; `.transcript{padding:12px 32px 28px}` (replace `8vw`). Long-code threads get a wider mode later if needed (reference ships exactly this as "Transcript width").
6. **Greeting: lighter, slightly smaller, balanced.** `.hero h2{font-family:var(--serif); font-weight:400; font-size:clamp(30px, 1.2rem + 2vw, 38px); line-height:1.25; text-wrap:balance;}` — Newsreader at 400 opsz-auto reads like the reference's 360-weight display serif without copying it. Add one original inline mark (e.g., a small asterisk-flake SVG at `0.72em`) only if desired; keep original artwork.
7. **Type-scale tiers.** Add `--caption:12px; --footnote:13px; --body:13.5px; --heading:15px; --title:21px` and map: `.dock-caption,.kicker{font-size:var(--caption)}`, `.thread-title,.setting-name{font-size:var(--body)}` (14px acceptable), `.topbar h1{font-size:var(--title)}`, settings `h1` 21px, base UI text 13.5px, keep assistant serif 18px (matches reference prose-plus emphasis).
8. **Density setting.** Add `data-density="comfortable|compact"` on `:root`; compact overrides: `--cds`-style `.sidebar{width:248px}`, control heights 24px (`.mode-switch button{padding:4px}`), `--gap` tokens ×0.75, composer radius 12px, base font 13px. Wire into Settings → Appearance as a segmented control (already have `Segments`).
9. **Motion language.** Define `--dur-fast:60ms; --dur-base:200ms; --dur-sheet:300ms; --ease-out:cubic-bezier(.165,.84,.44,1); --ease-overshoot:cubic-bezier(.34,1.3,.64,1)`. Apply: new assistant messages `@keyframes rise-in{from{opacity:0;transform:translateY(6px)}} .msg{animation:.3s var(--ease-out) rise-in}`; sidebar/settings-nav sections `.2s var(--ease-out)` expand; slash-menu/palette `pop 200ms var(--ease-overshoot)`; keep the reduced-motion kill-switch overriding all of it.
10. **Send button spring + stop morph.** `.send{transition:transform .12s var(--ease-out)} .send:active{transform:scale(.9)}`; on busy, swap the ↑ glyph to an original square/stop glyph with `animation:.12s ease-out scale(.6→1)`; add `Esc` (or click) to stop, and show a tiny key-cap `<kbd>` hint in the composer tooltip. (Reference: framer-motion scale .6→1, whileTap .9, exit .12s; `stopShortcut:"Esc"`.)
11. **Sidebar icons + hover/selected polish.** Give the six `.nav` rows and `+ New` row 16px original stroke SVGs (match your SettingsView `NavMark` style: 1.4px stroke, currentColor). Thread rows: default `color:var(--ink)` (currently `#3d3b36` hard-coded — move to token), hover `--soft`, selected `--soft` + `font-weight:560` (Figtree variable), and a 24ms opacity fade on the row dot. Keep 268px width but switch the section labels to `--caption` with `letter-spacing:.06em` (already used in dock captions — reuse).
12. **Focus rings everywhere.** `.ghost:focus-visible,.nav:focus-visible,.thread:focus-visible,.send:focus-visible,.chip-button:focus-visible{outline:2px solid var(--ink); outline-offset:1px; border-radius:8px}` and for text inputs replace `outline:none` with `box-shadow:0 0 0 3px rgba(31,30,27,.12)` on `:focus` (reference uses a 1px ring + 6px glow). This closes the keyboard-a11y gap on the main surfaces.
13. **Streaming/thinking indicator.** While `busy` and steps exist, show a caption row above the reply: small 6px pulsing dot (`animation:pulse 1.5s ease-in-out infinite` — retune your existing keyframe to 1.5s) + `--footnote` muted text "Working…" / "Thinking…" per mode, and keep the reply body empty until first token (no literal "…" character). On completion, run a one-shot 200ms fade-in on the finished body (pairs with #9).
14. **Approval dialog as a bottom sheet + sound.** Keep the inline card for chat, but for computer-use/browser approvals render `.approval` anchored above the composer with `animation:.3s cubic-bezier(.32,.72,0,1) translateY(12px→0)`, button order `Allow for this task · Allow always · Don't allow`, and play a short original chime (`new Audio('/sfx/approval.mp3')` — generate your own asset, ≤60ms) gated by a Settings toggle. Reference ships `tool_approval_needed.mp3` for exactly this moment.
15. **Theme picker previews + dark code parity.** In Settings → Appearance, render the existing `Segments` with 44×30 rounded thumbnails of your own light/dark/system mockups (tiny CSS-drawn preview: 3 gray bars on `--bg`), matching the reference's `images/appearance/*.png` pattern without copying their art. Also apply the thread's code theme to the artifact iframe (you already pass `design` into artifacts — extend to code font size 12.5px→13px and `#211f1c` stays, it matches CDS gray-900-family dark code).

*Honorable mentions:* keyboard-shortcut `<kbd>` caps in composer tooltip (⌘↩ / ⇧↩ rows); "Start task" label for cowork composer send; scroll-edge fade (`mask-image:linear-gradient(transparent, black 24px)`) on `.transcript`; hover-reveal message actions with `transform:scale(.96→1)` not just opacity.

---

## 6. Evidence index (key files)

- Claude: `index.html` (composer/greeting/sidebar-skeleton inline CSS, `data-density`, theme-color), `assets/v1/c6a992d55-C7KEixqs.css` (CDS + Tailwind tokens, animations), `assets/v1/_frame-rt/_runtime/*.woff2` (font files), `assets/v1/anthropicons-variable-1-13-0.woff2`, `i18n/en-US.json` (labels), `audio/voice/sfx/*`, `images/appearance/*`, `frame-shell.html` (artifact shell), `c04e7453f-BIk_78sL.js` (send spring), `cf400e6a4-CtCiyCEj.js` (`--df-sidebar-width,288px`), `shared-24-Bdy5JIXG.js` (shortcut caps).
- Modbitx: `src/styles.css`, `index.html`, `src/App.tsx` (token application), `src/shortcuts.ts`, components listed in §1.
