import { useEffect, useState, type ReactNode } from "react";
import { permissionLabel } from "../agent";
import { EFFORTS } from "../catalog";
import { SHORTCUTS } from "../shortcuts";
import { activeProvider, providerKey, providerModels, providers, settledModel, switchProvider } from "../providers";
import { SEED_SKILLS } from "../catalog";
import { DEFAULT_DESIGN, designsForRole, scaleOf, textSizeOf, type DesignRecord, type TextSize } from "../design";
import { SKILL_INSTRUCTIONS_LIMIT, SKILL_NAME_LIMIT, canDeleteSkill, canResetSkill, enabledSkillCount, resetPatch, skillCharacters, skillEdit, skillPreview } from "../skills";
import { connectorLines } from "../local-jobs";
import { bundleFromZip, bundleZip } from "../local-jobs";
import { settingsGroups, settingsTitle } from "../settings-nav";
import { useStore } from "../store";
import { base64ToBytes, bytesToBase64 } from "../zip-store";
import type { Effort, InterfaceFont, MemoryNote, MotionPreference, OutputStyle, PermissionMode, Project, ScheduledTask, Settings, Skill, Thread, TranscriptWidth } from "../types";

function planCap(plan: Settings["plan"]): number {
  if (plan === "free") return 20_000;
  if (plan === "team") return 1_000_000;
  return 200_000;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function useSettings() {
  const store = useStore();
  const s = store.state.settings;
  const patch = (next: Partial<Settings>) => store.dispatch({ type: "settings", patch: next });
  return { ...store, s, patch };
}

function NavMark({ id }: { id: string }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, "aria-hidden": true as const };
  switch (id) {
    case "preferences":
      return <svg {...common}><path d="M2 4.5h12M2 8h12M2 11.5h12" /><circle cx="5" cy="4.5" r="1.3" fill="currentColor" stroke="none" /><circle cx="11" cy="8" r="1.3" fill="currentColor" stroke="none" /><circle cx="7" cy="11.5" r="1.3" fill="currentColor" stroke="none" /></svg>;
    case "privacy":
      return <svg {...common}><path d="M8 1.8 13 4v4.2c0 2.8-2 4.6-5 5.8-3-1.2-5-3-5-5.8V4z" /></svg>;
    case "billing":
      return <svg {...common}><rect x="1.8" y="3.5" width="12.4" height="9" rx="1.4" /><path d="M1.8 6.5h12.4" /></svg>;
    case "usage":
      return <svg {...common}><path d="M3 12.5V8M8 12.5V3.5M13 12.5V6" /></svg>;
    case "instructions":
      return <svg {...common}><path d="M3 3.5h10M3 8h10M3 12.5h6" /></svg>;
    case "capabilities":
      return <svg {...common}><path d="M8 1.8v12.4M1.8 8h12.4M3.6 3.6l8.8 8.8M12.4 3.6 3.6 12.4" /></svg>;
    case "design":
      return <svg {...common}><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>;
    case "connectors":
    case "customize-connectors":
      return <svg {...common}><circle cx="4" cy="8" r="2" /><circle cx="12" cy="8" r="2" /><path d="M6 8h4" /></svg>;
    case "code":
      return <svg {...common}><path d="M6 3.5 2.5 8 6 12.5M10 3.5 13.5 8 10 12.5" /></svg>;
    case "cowork":
      return <svg {...common}><rect x="2" y="2.5" width="8" height="8" rx="1.2" /><path d="M8 8.5 13.5 13.5M10.5 13.5H13.5V10.5" /></svg>;
    case "transfer":
      return <svg {...common}><path d="M3 6h8M8 3.5 11 6 8 8.5M13 10H5M8 7.5 5 10l3 2.5" /></svg>;
    case "chrome":
      return <svg {...common}><circle cx="8" cy="8" r="5.2" /><circle cx="8" cy="8" r="1.6" /><path d="M8 2.8 10.2 7M12.8 10.2 8.6 9.2M3.4 10.4 7.2 8.6" /></svg>;
    case "desktop":
      return <svg {...common}><rect x="2" y="2.5" width="12" height="8" rx="1.2" /><path d="M6 13.2h4M8 10.5v2.7" /></svg>;
    case "extensions":
      return <svg {...common}><rect x="2.2" y="2.2" width="11.6" height="11.6" rx="1.4" /><path d="M8 5v6M5 8h6" /></svg>;
    case "developer":
      return <svg {...common}><path d="M5 5.5 2.8 8 5 10.5M11 5.5 13.2 8 11 10.5M9 3.5 7 12.5" /></svg>;
    case "skills":
      return <svg {...common}><path d="M4 2.5h6.2L13 5.2V13.5H4z" /><path d="M10 2.6V5.4H13" /></svg>;
    case "plugins":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="6" y="6" width="7" height="7" rx="1" /></svg>;
    case "models":
      return <svg {...common}><rect x="2" y="4.5" width="5.4" height="7" rx="1.2" /><rect x="8.6" y="4.5" width="5.4" height="7" rx="1.2" /><path d="M7.4 8h1.2" /></svg>;
    case "voice":
      return <svg {...common}><rect x="6" y="1.8" width="4" height="7.4" rx="2" /><path d="M3.6 7.4a4.4 4.4 0 0 0 8.8 0M8 11.8v2.4" /></svg>;
    case "dictation":
      return <svg {...common}><path d="M2.5 6.5a5.5 5.5 0 0 1 11 0" /><path d="M2.5 6.5V9M13.5 6.5V9" /><rect x="5.8" y="6" width="4.4" height="5" rx="2.2" /><path d="M8 11v2.5" /></svg>;
    case "notifications":
      return <svg {...common}><path d="M8 2.2a4 4 0 0 1 4 4c0 3 .8 4.2 1.6 5H2.4C3.2 10.4 4 9.2 4 6.2a4 4 0 0 1 4-4z" /><path d="M6.6 13.4a1.5 1.5 0 0 0 2.8 0" /></svg>;
    case "language":
      return <svg {...common}><circle cx="8" cy="8" r="5.6" /><path d="M2.4 8h11.2M8 2.4c-3.2 3.4-3.2 7.8 0 11.2 3.2-3.4 3.2-7.8 0-11.2z" /></svg>;
    case "computer":
      return <svg {...common}><rect x="2.2" y="2.6" width="11.6" height="8" rx="1.2" /><path d="M5.5 13.4h5M8 10.6v2.8" /><circle cx="8" cy="6.6" r="1.4" /></svg>;
    default:
      return <svg {...common}><circle cx="8" cy="6" r="2.2" /><path d="M3.5 13.2c.8-2.2 2.4-3.2 4.5-3.2s3.7 1 4.5 3.2" /></svg>;
  }
}

function ThemeMark({ kind }: { kind: "system" | "light" | "dark" }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, "aria-hidden": true as const };
  if (kind === "light") {
    return <svg {...common}><circle cx="8" cy="8" r="2.2" /><path d="M8 2.2v1.6M8 12.2v1.6M2.2 8h1.6M12.2 8h1.6M4 4l1.1 1.1M10.9 10.9 12 12M12 4l-1.1 1.1M5.1 10.9 4 12" /></svg>;
  }
  if (kind === "dark") {
    return <svg {...common}><path d="M9.2 2.4a4.8 4.8 0 1 0 4.2 7.2A4.2 4.2 0 0 1 9.2 2.4z" fill="currentColor" stroke="none" /></svg>;
  }
  return <svg {...common}><rect x="2.2" y="3" width="11.6" height="8" rx="1.2" /><path d="M6 13.2h4M8 11v2.2" /></svg>;
}

function Row({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-copy">
        <div className="setting-name">{label}</div>
        {description ? <div className="setting-desc">{description}</div> : null}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="setting-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Switch({ checked, label, onChange, disabled }: { checked: boolean; label: string; onChange: (on: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" className={checked ? "switch on" : "switch"} role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => { if (!disabled) onChange(!checked); }}>
      <span />
    </button>
  );
}

function Segments({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string; icon?: "system" | "light" | "dark" }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="segments" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" role="radio" aria-checked={value === option.value} aria-label={option.label} title={option.label} className={value === option.value ? "on" : ""} onClick={() => onChange(option.value)}>
          {option.icon ? <ThemeMark kind={option.icon} /> : option.label}
        </button>
      ))}
    </div>
  );
}

function Removable({ items, empty, onRemove }: { items: string[]; empty: string; onRemove: (item: string) => void }) {
  if (!items.length) return <p className="muted settings-empty">{empty}</p>;
  return <>{items.map((item) => (
    <div key={item} className="setting-row">
      <div className="setting-name">{item}</div>
      <div className="setting-control"><button type="button" className="ghost" onClick={() => onRemove(item)}>Remove</button></div>
    </div>
  ))}</>;
}

function AddRow({ placeholder, label, onAdd }: { placeholder: string; label: string; onAdd: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="setting-row">
      <div className="setting-control setting-control-grow">
        <input className="setting-input" placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
        <button type="button" className="ghost" onClick={() => {
          const next = value.trim();
          if (!next) return;
          onAdd(next);
          setValue("");
        }}>{label}</button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const section = settingsTitle(state.settingsSection) ? state.settingsSection : "preferences";
  const groups = settingsGroups(q);
  useEffect(() => {
    if (!q) return;
    const matchesNow = settingsGroups(q).flatMap((group) => group.items);
    if (matchesNow.length && !matchesNow.some((item) => item.id === section)) {
      dispatch({ type: "screen", screen: "settings", section: matchesNow[0].id });
    }
  }, [q, section, dispatch]);
  return (
    <main className="main page settings-page">
      <div className="settings-shell">
        <nav className="settings-nav" aria-label="Settings">
          <div className="settings-search">
            <input aria-label="Search settings" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="settings-scroll">
            {groups.map((group) => (
              <div key={group.title || "main"}>
                {group.title ? <div className="settings-group">{group.title}</div> : null}
                {group.items.map((item) => (
                  <button key={item.id} type="button" className={section === item.id ? "nav on" : "nav"} onClick={() => dispatch({ type: "screen", screen: "settings", section: item.id })}>
                    <NavMark id={item.id} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
            {!groups.length && <p className="muted settings-empty">No matching settings.</p>}
          </div>
        </nav>
        <div className="settings-content">
          <h1>{settingsTitle(section) || "Preferences"}</h1>
          <SectionBody id={section} />
        </div>
      </div>
    </main>
  );
}

function SectionBody({ id }: { id: string }) {
  switch (id) {
    case "models": return <Models />;
    case "voice": return <Voice />;
    case "dictation": return <Dictation />;
    case "notifications": return <Notifications />;
    case "language": return <Language />;
    case "privacy": return <Privacy />;
    case "billing": return <Billing />;
    case "usage": return <Usage />;
    case "account": return <Account />;
    case "instructions": return <Instructions />;
    case "capabilities": return <Capabilities />;
    case "providers": return <ModelProviders />;
    case "design": return <DesignLibrary />;
    case "connectors": return <Connectors />;
    case "code": return <Code />;
    case "cowork": return <Cowork />;
    case "transfer": return <Transfer />;
    case "chrome": return <Chrome />;
    case "desktop": return <Desktop />;
    case "computer": return <ThisComputer />;
    case "shortcuts": return <Shortcuts />;
    case "extensions": return <Extensions />;
    case "developer": return <Developer />;
    case "skills": return <Skills />;
    case "customize-connectors": return <ConnectorLibrary />;
    case "plugins": return <Plugins />;
    default: return <Preferences />;
  }
}

/** Theme picker with CSS-drawn preview thumbnails — original art, CDS layout. */
function ThemePicker({ value, onChange }: { value: Settings["theme"]; onChange: (theme: Settings["theme"]) => void }) {
  const options: { value: Settings["theme"]; label: string }[] = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" }
  ];
  return (
    <div className="theme-previews" role="radiogroup" aria-label="Theme">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? "theme-preview on" : "theme-preview"}
          onClick={() => onChange(option.value)}
        >
          <span className={`mini ${option.value}`} aria-hidden><i /><i /><i /></span>
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function Preferences() {
  const { s, patch } = useSettings();
  const textSize = textSizeOf(s.textScale);
  return <>
    <Section title="Appearance">
      <Row label="Theme" description="System follows this Mac. Light and dark are fixed.">
        <ThemePicker value={s.theme} onChange={(theme) => patch({ theme })} />
      </Row>
      <Row label="Density" description="Comfortable keeps roomy controls; compact tightens pads, gaps, and text.">
        <Segments label="Density" value={s.density === "compact" ? "compact" : "comfortable"} onChange={(density) => patch({ density: density as Settings["density"] })} options={[
          { value: "comfortable", label: "Comfortable" },
          { value: "compact", label: "Compact" }
        ]} />
      </Row>
      <Row label="Chat font" description="Sans, serif, or the system font for the window.">
        <select className="setting-select" aria-label="Chat font" value={s.interfaceFont || "sans"} onChange={(e) => patch({ interfaceFont: e.target.value as InterfaceFont })}>
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
          <option value="system">System</option>
        </select>
      </Row>
      <Row label="Motion" description="Reduce animation in streaming responses and other interface elements.">
        <Segments label="Motion" value={s.motion === "reduce" ? "reduce" : "system"} onChange={(motion) => patch({ motion: motion as MotionPreference })} options={[
          { value: "system", label: "System" },
          { value: "reduce", label: "Reduced" }
        ]} />
      </Row>
      <Row label="Transcript text size" description="Size of text in the conversation.">
        <Segments label="Transcript text size" value={textSize} onChange={(size) => patch({ textScale: scaleOf(size as TextSize) })} options={[
          { value: "small", label: "Small" },
          { value: "medium", label: "Medium" },
          { value: "large", label: "Large" }
        ]} />
      </Row>
    </Section>
    <Section title="Chat">
      <Row label="Enter sends the message" description="Shift-Enter starts a new line.">
        <Switch label="Enter sends the message" checked={s.enterToSend} onChange={(enterToSend) => patch({ enterToSend })} />
      </Row>
      <Row label="Show the steps Modbitx took" description="When this is off, a running reply shows only a working indicator until text arrives.">
        <Switch label="Show the steps Modbitx took" checked={s.showThinking !== false} onChange={(showThinking) => patch({ showThinking })} />
      </Row>
      <Row label="Let Jev 1.13 choose Chat, Cowork, or Code">
        <Switch label="Let Jev 1.13 choose Chat, Cowork, or Code" checked={s.jevRouting !== false} onChange={(jevRouting) => patch({ jevRouting })} />
      </Row>
    </Section>
  </>;
}

/** Default model and effort for new chats; a chat's own pick overrides these. */
function Models() {
  const { s, patch } = useSettings();
  const options = providerModels(s);
  return <>
    <Section title="Default model">
      <Row label="Model" description="New chats start on this model. The composer can switch per chat.">
        <select className="setting-select" aria-label="Default model" value={settledModel(s)} onChange={(e) => patch({ model: e.target.value })}>
          {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Row>
      <Row label="Effort" description="How hard the model thinks before answering.">
        <select className="setting-select" aria-label="Effort" value={s.effort} onChange={(e) => patch({ effort: e.target.value as Settings["effort"] })}>
          {EFFORTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </Row>
    </Section>
    <Section title="Catalog">
      <p className="settings-note">Models come from the provider catalog in Settings → Model providers. {options.length} models available from {activeProvider(s).name}.</p>
    </Section>
  </>;
}

/** Read aloud: the Mac's speakers, rate, and stop control. */
function Voice() {
  const { s, patch } = useSettings();
  const [voices, setVoices] = useState<{ name: string; lang: string }[]>([]);
  useEffect(() => {
    void window.modbitx?.voices?.().then((list) => setVoices(list || []));
  }, []);
  return <>
    <Section title="Read aloud">
      <Row label="Read replies aloud" description="Speak a reply from its Copy · Speak row.">
        <Switch label="Read replies aloud" checked={s.voiceOn} onChange={(voiceOn) => patch({ voiceOn })} />
      </Row>
      <Row label="Speaker" description={voices.length ? `${voices.length} voices installed on this Mac.` : "Speakers come from this Mac."}>
        <select className="setting-select" aria-label="Speaker" value={s.speakVoice || ""} onChange={(e) => patch({ speakVoice: e.target.value })}>
          <option value="">System default</option>
          {voices.map((voice) => <option key={voice.name} value={voice.name}>{voice.name} · {voice.lang}</option>)}
        </select>
      </Row>
      <Row label="Rate" description="Words per minute. 0 keeps the system default.">
        <input
          className="setting-input"
          aria-label="Rate"
          type="number"
          min={80}
          max={400}
          step={10}
          value={s.speakRate || 0}
          onChange={(e) => patch({ speakRate: Math.min(400, Math.max(0, Number(e.target.value) || 0)) })}
        />
      </Row>
      <Row label="Stop speaking" description="Cuts off the current read aloud.">
        <button type="button" className="btn-quiet" onClick={() => void window.modbitx?.stopSpeech()}>Stop</button>
      </Row>
    </Section>
  </>;
}

/** Push-to-talk dictation with the global shortcut. */
function Dictation() {
  const { s, patch } = useSettings();
  return <>
    <Section title="Dictation">
      <Row label="Dictation shortcut" description="Press ⇧⌘D anywhere in Modbitx to start or stop dictation. Words land in the composer.">
        <Switch label="Dictation shortcut" checked={s.dictation !== false} onChange={(dictation) => patch({ dictation })} />
      </Row>
      <Row label="Hold the mic button" description="Press and hold Voice in the composer to talk; release to stop. A quick click toggles instead.">
        <span className="key-hint"><kbd className="kbd">Hold</kbd></span>
      </Row>
    </Section>
    <Section title="Microphone">
      <p className="settings-note">The first dictation asks macOS for microphone access. Audio is recognized by this Mac's speech engine; Modbitx does not send it anywhere.</p>
    </Section>
  </>;
}

function Notifications() {
  const { s, patch } = useSettings();
  return <>
    <Section title="Notifications">
      <Row label="Notify when a reply is ready" description="Posts a notification when the window is in the background.">
        <Switch label="Notify when a reply is ready" checked={s.notifyOnDone === true} onChange={(notifyOnDone) => patch({ notifyOnDone })} />
      </Row>
      <Row label="Bounce the dock for approvals" description="Asks for attention when a task needs permission.">
        <Switch label="Bounce the dock for approvals" checked={s.dockAttention === true} onChange={(dockAttention) => patch({ dockAttention })} />
      </Row>
      <Row label="Play the approval chime" description="A short original tone plays when an approval card appears.">
        <Switch label="Play the approval chime" checked={s.approvalChime === true} onChange={(approvalChime) => patch({ approvalChime })} />
      </Row>
      <Row label="Play a notification sound" description="A short original ding plays when a notice is posted.">
        <Switch label="Play a notification sound" checked={s.notifySound === true} onChange={(notifySound) => patch({ notifySound })} />
      </Row>
    </Section>
  </>;
}

function Language() {
  const { s, patch } = useSettings();
  return <>
    <Section title="Reply language">
      <Row label="Language" description="Replies use this language.">
        <select className="setting-select" aria-label="Reply language" value={s.language} onChange={(e) => patch({ language: e.target.value })}>
          {["en-US", "en-GB", "es-ES", "fr-FR", "de-DE", "ja-JP", "ko-KR", "pt-BR", "zh-CN"].map((lang) => <option key={lang}>{lang}</option>)}
        </select>
      </Row>
    </Section>
    <Section title="Interface language">
      <p className="settings-note">Menus and settings stay in English. Reply language covers chat text.</p>
    </Section>
  </>;
}

/** Machine facts for this install, in the shape of the parent's This computer hub. */
function ThisComputer() {
  const { s, patch } = useSettings();
  const [info, setInfo] = useState<Awaited<ReturnType<NonNullable<typeof window.modbitx>["envInfo"]>> | null>(null);
  useEffect(() => {
    void window.modbitx?.envInfo?.().then(setInfo);
  }, []);
  return <>
    <Section title="This computer">
      <Row label="System" description={info ? `${info.osName} · ${info.platform}` : "Open Modbitx as the desktop app to read machine facts."}>
        <span className="pill">{info ? info.platform : "web preview"}</span>
      </Row>
      {info && (
        <Row label="Versions" description={`Modbitx ${info.app} · Electron ${info.electron} · Node ${info.node} · Chromium ${info.chrome}`}>
          <span className="pill">local</span>
        </Row>
      )}
      {info && (
        <Row label="Storage" description={`State is saved at ${info.stateFile}`}>
          <span className="pill" />
        </Row>
      )}
    </Section>
    <Section title="On this machine">
      <Row label="Computer use mode" description="Background keeps Modbitx out of the way; takeover moves the pointer while a task runs.">
        <Segments
          label="Computer use mode"
          value={s.computerMode}
          onChange={(mode) => patch({ computerMode: mode as Settings["computerMode"] })}
          options={[{ value: "background", label: "Background" }, { value: "takeover", label: "Takeover" }]}
        />
      </Row>
      <Row label="Updates" description="Modbitx is built locally. Rebuild and relaunch to update; nothing downloads in the background.">
        <span className="pill">manual</span>
      </Row>
    </Section>
  </>;
}

function Privacy() {
  const { state, dispatch, s, patch } = useSettings();
  const [note, setNote] = useState("");
  const archived = state.threads.filter((thread) => thread.archived).length;
  return <>
    <Section title="Chats">
      <Row label="Use memory in replies" description="Notes you save are added to the system prompt.">
        <Switch label="Use memory in replies" checked={s.memoryOn} onChange={(memoryOn) => patch({ memoryOn })} />
      </Row>
      <Row label="New chats start incognito" description="Incognito chats are dropped when the app saves. They stay out of search after a reload.">
        <Switch label="New chats start incognito" checked={s.incognitoDefault} onChange={(incognitoDefault) => patch({ incognitoDefault })} />
      </Row>
      <Row label="Compact long conversations automatically" description="Past a rough context size, older messages fold into a summary so the turn fits without asking.">
        <Switch label="Compact long conversations automatically" checked={s.autoCompact !== false} onChange={(autoCompact) => patch({ autoCompact })} />
      </Row>
      <Row label="Memory notes" description="Saved notes are edited on the Customize screen.">
        <button type="button" className="ghost" onClick={() => dispatch({ type: "screen", screen: "customize" })}>Open</button>
      </Row>
      <Row label="Clear memory" description="Removes every memory note on this Mac.">
        <button type="button" className="ghost" onClick={() => state.memories.forEach((item) => dispatch({ type: "delete-memory", id: item.id }))}>Clear</button>
      </Row>
      <Row label="Delete archived chats" description={archived ? `${archived} archived chats on this Mac.` : "No archived chats."}>
        <button type="button" className="ghost" onClick={() => { dispatch({ type: "delete-archived" }); setNote(archived ? `Removed ${archived} archived chats.` : "No archived chats."); }}>Delete</button>
      </Row>
      <Row label="Export chats" description="Writes a file of chats. Incognito chats are left out.">
        <button type="button" className="ghost" onClick={() => void exportBundle(state, setNote, true)}>Export</button>
      </Row>
      {note && <p className="settings-note">{note}</p>}
    </Section>
    <Section title="Command rules">
      <p className="settings-note">An allow rule lets commands starting with those words run without the approval prompt; a deny rule refuses them outright. The approval card offers Always allow for commands. The last matching rule wins.</p>
      {(s.commandRules || []).length === 0 && <p className="muted settings-empty">No command rules saved.</p>}
      {(s.commandRules || []).map((rule) => (
        <div key={rule.id} className="setting-row">
          <div className="setting-copy">
            <div className="setting-name"><code>{rule.pattern}</code> → {rule.verdict === "allow" ? "allow" : "deny"}</div>
            <div className="setting-desc">Saved {new Date(rule.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="setting-control">
            <button type="button" className="ghost" onClick={() => patch({ commandRules: (s.commandRules || []).filter((item) => item.id !== rule.id) })}>Remove</button>
          </div>
        </div>
      ))}
    </Section>
  </>;
}

function Usage() {
  const { s, patch } = useSettings();
  const cap = planCap(s.plan);
  return <>
    <p className="settings-lead">This is a local estimate of tokens on this Mac, across Chat, Cowork, and Code. It is a count stored with the app.</p>
    <p className="setting-name">{s.usageTokens.toLocaleString()} of {cap.toLocaleString()} on the {s.plan} plan.</p>
    <div className="meter"><span style={{ width: `${Math.min(100, (s.usageTokens / cap) * 100)}%` }} /></div>
    <Section title="Estimate">
      <Row label="Reset this estimate" description="Sets the local token count back to zero.">
        <button type="button" className="ghost" onClick={() => patch({ usageTokens: 0 })}>Reset</button>
      </Row>
    </Section>
  </>;
}

function Account() {
  const { s, patch } = useSettings();
  const [memberEmail, setMemberEmail] = useState("");
  const [session, setSession] = useState("");
  const [pictureNote, setPictureNote] = useState("");
  const locked = s.orgRole === "member";
  useEffect(() => {
    void window.modbitx?.info().then((value) => setSession(`${value.platform} · ${value.version} · ${value.userData}`));
  }, []);
  return <>
    <p className="settings-lead">This workspace stays on this Mac. The model key is under Desktop app → Developer. {locked ? "Members can use the workspace. Owners and admins change the plan and seats." : "You can change the plan, seats, and members."}</p>
    <Section title="Profile">
      <Row label="What to call you" description="This is the greeting and the sidebar initial.">
        <input className="setting-input" aria-label="What to call you" value={s.displayName} onChange={(e) => patch({ displayName: e.target.value })} />
      </Row>
      <Row label="Full name">
        <input className="setting-input" aria-label="Full name" value={s.fullName || ""} onChange={(e) => patch({ fullName: e.target.value.slice(0, 80) })} />
      </Row>
      <Row label="Picture" description="PNG, JPEG, GIF, or WebP, up to 80 KB. Stored on this Mac.">
        <input aria-label="Picture" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > 80_000) { setPictureNote("That picture is larger than 80 KB."); return; }
          const reader = new FileReader();
          reader.onload = () => {
            const url = String(reader.result || "");
            if (!/^data:image\/(?:png|jpeg|gif|webp);/i.test(url) || url.length > 120_000) {
              setPictureNote("Use a PNG, JPEG, GIF, or WebP under 80 KB.");
              return;
            }
            patch({ avatar: url });
            setPictureNote("");
          };
          reader.readAsDataURL(file);
        }} />
      </Row>
      {s.avatar && <img className="avatar" src={s.avatar} alt="" />}
      {pictureNote && <p className="settings-note">{pictureNote}</p>}
      <Row label="Email">
        <input className="setting-input" aria-label="Email" value={s.email} onChange={(e) => patch({ email: e.target.value })} />
      </Row>
      <Row label="Organization">
        <input className="setting-input" aria-label="Organization" value={s.orgName} onChange={(e) => patch({ orgName: e.target.value })} />
      </Row>
      <Row label="Role">
        <select className="setting-select" aria-label="Role" value={s.orgRole} onChange={(e) => patch({ orgRole: e.target.value as Settings["orgRole"] })}>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </select>
      </Row>
    </Section>
    <Section title="Workspace">
      <Row label="Plan" description={locked ? "Members cannot change the plan." : "Free, Pro, or Team on this Mac."}>
        <select className="setting-select" aria-label="Plan" value={s.plan} disabled={locked} onChange={(e) => patch({ plan: e.target.value as Settings["plan"] })}>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="team">Team</option>
        </select>
      </Row>
      <Row label="Seats">
        <input className="setting-input" aria-label="Seats" type="number" min={1} value={s.seats} disabled={locked} onChange={(e) => patch({ seats: Number(e.target.value) || 1 })} />
      </Row>
    </Section>
    <Section title="People">
      <Removable items={(s.members ?? []).map((member) => `${member.email} · ${member.role}`)} empty="No other people on this workspace." onRemove={(label) => {
        if (locked) return;
        const email = label.split(" · ")[0];
        patch({ members: (s.members ?? []).filter((member) => member.email !== email) });
      }} />
      {!locked && (
        <div className="setting-row">
          <div className="setting-control setting-control-grow">
            <input className="setting-input" placeholder="member@company.com" aria-label="Member email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
            <button type="button" className="ghost" onClick={() => {
              const email = memberEmail.trim();
              if (!email.includes("@") || (s.members ?? []).some((member) => member.email === email)) return;
              patch({ members: [...(s.members ?? []), { email, role: "member" }] });
              setMemberEmail("");
            }}>Add</button>
          </div>
        </div>
      )}
    </Section>
    <Section title="This Mac">
      <p className="setting-desc">This Mac is the only session. There is no remote sign-out.</p>
      {session && <p className="settings-note">{session}</p>}
    </Section>
  </>;
}

function Billing() {
  const { s, patch } = useSettings();
  return <>
    <p className="settings-lead">Invoices recorded here stay on this Mac. They are written into the local app state.</p>
    <Section title="Invoices">
      {(s.invoices ?? []).length === 0 && <p className="muted settings-empty">No invoices yet.</p>}
      {(s.invoices ?? []).map((invoice) => <p key={invoice.id} className="setting-name">{new Date(invoice.at).toLocaleDateString()} · {invoice.amount} · {invoice.note}</p>)}
      {s.orgRole !== "member" && (
        <Row label="Record this month" description={s.plan === "team" ? "$40 for a team seat." : s.plan === "pro" ? "$20 for a pro seat." : "$0 on the free plan."}>
          <button type="button" className="ghost" onClick={() => patch({ invoices: [...(s.invoices ?? []), { id: String(Date.now()), at: Date.now(), amount: s.plan === "team" ? "$40" : s.plan === "pro" ? "$20" : "$0", note: `${s.plan} seat · ${s.usageTokens.toLocaleString()} tokens estimated` }] })}>Record</button>
        </Row>
      )}
    </Section>
  </>;
}

function Instructions() {
  const { s, patch } = useSettings();
  return <>
    <p className="settings-lead">Added to Chat, Cowork, and Code. The model is asked to follow it. Up to 3,000 characters. The same note is on Customize → styles.</p>
    <textarea rows={8} maxLength={3000} placeholder="Write like a careful editor." value={s.launchNote} onChange={(e) => patch({ launchNote: e.target.value.slice(0, 3000) })} />
    <p className="muted">{s.launchNote.length} / 3000</p>
  </>;
}

function Shortcuts() {
  return <>
    <p className="settings-lead">These are the keys Modbitx registers on this Mac. The list is generated from the same catalog the app uses, so it cannot drift from what the keyboard actually does.</p>
    <Section title="Keys">
      {SHORTCUTS.map((item) => (
        <Row key={item.keys} label={item.keys} description={`${item.what}. ${item.where}.`}><span /></Row>
      ))}
    </Section>
  </>;
}

function Capabilities() {
  const { s, patch, newId } = useSettings();
  const [draft, setDraft] = useState("");
  const locked = s.orgRole === "member";
  const notes = s.orgMemories || [];
  return (
    <>
      <Section title="Tools">
        <Row label="Open artifacts beside the chat">
          <Switch label="Open artifacts beside the chat" checked={s.artifactsOn} onChange={(artifactsOn) => patch({ artifactsOn })} />
        </Row>
        <Row label="Show the voice button in the composer">
          <Switch label="Show the voice button in the composer" checked={s.voiceOn} onChange={(voiceOn) => patch({ voiceOn })} />
        </Row>
        <Row label="Allow file writes and commands" description="Reading a granted folder still works when writes are off. Computer use, the browser, and simulators have their own switches.">
          <Switch label="Allow file writes and commands" checked={s.fileTools !== false} onChange={(fileTools) => patch({ fileTools })} />
        </Row>
        <Row label="Computer use defers to your typing" description="Clicks, keystrokes, and pastes are refused while you type or while Secure Input holds a password field.">
          <Switch label="Computer use defers to your typing" checked={s.computerGuard !== false} onChange={(computerGuard) => patch({ computerGuard })} />
        </Row>
        <Row label="Run commands in the task VM" description="vm_boot starts a disposable Alpine machine under QEMU; vm_exec runs inside it, isolated from this Mac, and vm_stop discards everything. First boot downloads the boot files.">
          <Switch label="Run commands in the task VM" checked={s.taskVm !== false} onChange={(taskVm) => patch({ taskVm })} />
        </Row>
        <Row label="Allow dynamic workflows" description="The model can fan out subagents on one task; you approve the first fan-out in a session. Subagents answer from the model without desktop tools.">
          <Switch label="Allow dynamic workflows" checked={s.dynamicWorkflows !== false} onChange={(dynamicWorkflows) => patch({ dynamicWorkflows })} />
        </Row>
      </Section>
      <Section title="Workspace memory">
        <Row label="Memory for people on this Mac’s workspace" description="These notes join Chat, Cowork, and Code when this is on. Owners and admins edit them. Members can read them.">
          <Switch label="Memory for people on this Mac’s workspace" checked={s.orgMemoryOn === true} disabled={locked} onChange={(orgMemoryOn) => patch({ orgMemoryOn })} />
        </Row>
        {notes.length === 0 && <p className="muted settings-empty">No workspace memory yet.</p>}
        {notes.map((note) => (
          <Row key={note.id} label={note.text}>
            {!locked && <button type="button" className="ghost" onClick={() => patch({ orgMemories: notes.filter((item) => item.id !== note.id) })}>Remove</button>}
          </Row>
        ))}
        {!locked && (
          <div className="setting-row">
            <div className="setting-control setting-control-grow">
              <input className="setting-input" aria-label="Workspace memory" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button type="button" className="ghost" onClick={() => {
                const text = draft.trim().slice(0, 500);
                if (!text) return;
                patch({ orgMemories: [...notes, { id: newId(), text, updatedAt: Date.now() }] });
                setDraft("");
              }}>Add</button>
            </div>
          </div>
        )}
      </Section>
    </>
  );
}

function DesignLibrary() {
  const { s, patch } = useSettings();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(s.defaultDesignId);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const systems = s.designSystems ?? [];
  const locked = s.orgRole === "member";
  const q = query.trim().toLowerCase();
  const shown = designsForRole(systems, s.orgRole).filter((system) => !q || (system.name || "Untitled").toLowerCase().includes(q));
  const makeDefault = (id: string) => {
    patch({
      defaultDesignId: id,
      designSystems: systems.map((item) => item.id === id ? { ...item, share: "organization" as const } : item)
    });
  };
  const update = (id: string, partial: Partial<DesignRecord>) => {
    patch({ designSystems: systems.map((item) => item.id === id ? { ...item, ...partial } : item) });
  };
  const create = () => {
    const id = `ds-${Date.now().toString(36)}`;
    patch({
      designSystems: [...systems, { ...DEFAULT_DESIGN, id, name: "Untitled", components: "", share: "only-you" }]
    });
    setQuery("");
    setOpenId(id);
    setRenaming(id);
  };
  const remove = (id: string) => {
    if (systems.length < 2) return;
    const next = systems.filter((item) => item.id !== id);
    patch({ designSystems: next, defaultDesignId: s.defaultDesignId === id ? next[0].id : s.defaultDesignId });
    setPendingDelete(null);
    if (openId === id) setOpenId(next[0]?.id ?? null);
  };
  return <>
    <p className="settings-lead">Design systems give Modbitx your colors, type, and components. New artifacts use the default. Setting a default shares that system with people on this Mac’s workspace. A system marked just for you is hidden from members. If none are shared, the whole library is used.</p>
    <div className="design-toolbar">
      <input aria-label="Search design systems" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      {!locked && <button type="button" className="ghost" onClick={create}>New</button>}
    </div>
    {shown.map((system) => (
      <article key={system.id} className={openId === system.id ? "design-card on" : "design-card"}>
        <div className="design-card-head">
          <div className="design-card-main">
            <button type="button" className="ghost" onClick={() => setOpenId(openId === system.id ? null : system.id)}>
              <span className="swatches" aria-hidden="true">
                <i style={{ background: system.ink }} />
                <i style={{ background: system.paper }} />
                <i style={{ background: system.accent }} />
              </span>
              {renaming === system.id ? null : <strong>{system.name || "Untitled"}</strong>}
            </button>
            {renaming === system.id && (
              <input aria-label="Name" className="setting-input" value={system.name} autoFocus onChange={(e) => update(system.id, { name: e.target.value })} onBlur={() => setRenaming(null)} onKeyDown={(e) => { if (e.key === "Enter") setRenaming(null); }} />
            )}
            {system.id === s.defaultDesignId && <span className="pill">Default</span>}
          </div>
          <div className="design-card-actions">
            {system.id === s.defaultDesignId ? (
              <span className="muted">Used for new artifacts</span>
            ) : !locked ? (
              <button type="button" className="ghost" onClick={() => makeDefault(system.id)}>Set as default</button>
            ) : null}
            {!locked && <button type="button" className="ghost" onClick={() => { setOpenId(system.id); setRenaming(system.id); }}>Rename</button>}
            {!locked && <button type="button" className="ghost" disabled={systems.length < 2} onClick={() => setPendingDelete(system.id)}>Delete</button>}
          </div>
        </div>
        {pendingDelete === system.id && (
          <div className="setting-confirm">
            <p>Delete {system.name || "Untitled"} from this Mac. This cannot be undone.</p>
            <button type="button" className="ghost" onClick={() => remove(system.id)}>Delete</button>
            <button type="button" className="ghost" onClick={() => setPendingDelete(null)}>Cancel</button>
          </div>
        )}
        {openId === system.id && (
          <div className="design-editor">
            <Row label="Ink">
              <input aria-label="Ink" className="setting-color" type="color" value={system.ink} disabled={locked} onChange={(e) => update(system.id, { ink: e.target.value })} />
            </Row>
            <Row label="Paper">
              <input aria-label="Paper" className="setting-color" type="color" value={system.paper} disabled={locked} onChange={(e) => update(system.id, { paper: e.target.value })} />
            </Row>
            <Row label="Accent">
              <input aria-label="Accent" className="setting-color" type="color" value={system.accent} disabled={locked} onChange={(e) => update(system.id, { accent: e.target.value })} />
            </Row>
            <Row label="Type">
              <select className="setting-select" aria-label="Type" value={system.font} disabled={locked} onChange={(e) => update(system.id, { font: e.target.value as DesignRecord["font"] })}>
                <option value="sans">Sans</option>
                <option value="serif">Serif</option>
                <option value="mono">Mono</option>
              </select>
            </Row>
            <Row label="Radius">
              <input className="setting-input" aria-label="Radius" type="number" min={0} max={32} value={system.radius} disabled={locked} onChange={(e) => update(system.id, { radius: Number(e.target.value) || 0 })} />
            </Row>
            <Row label="Space">
              <input className="setting-input" aria-label="Space" type="number" min={4} max={48} value={system.space} disabled={locked} onChange={(e) => update(system.id, { space: Number(e.target.value) || 16 })} />
            </Row>
            <Row label="Usable by" description="Just you is hidden from members. The default is shared with people on this Mac’s workspace.">
              <select className="setting-select" aria-label="Usable by" value={system.share} disabled={locked} onChange={(e) => update(system.id, { share: e.target.value as DesignRecord["share"] })}>
                <option value="only-you">Just you</option>
                <option value="organization">People on this Mac’s workspace</option>
              </select>
            </Row>
            <label className="setting-block">
              Components
              <textarea rows={3} maxLength={500} placeholder="Buttons, cards, and other parts artifacts should repeat." value={system.components} disabled={locked} onChange={(e) => update(system.id, { components: e.target.value.slice(0, 500) })} />
            </label>
          </div>
        )}
      </article>
    ))}
    {!shown.length && <p className="muted settings-empty">No design systems match that search.</p>}
  </>;
}

function Connectors() {
  const { state, s, patch } = useSettings();
  const [note, setNote] = useState("");
  const on = connectorLines(state.connectors);
  return <>
    <p className="settings-lead" data-connector-count={on.length}>
      {on.length
        ? `${on.length} of ${state.connectors.length} connectors are switched on, and each one is named in the request so the model knows what this Mac may use.`
        : `No connector is switched on, so the request says none are available. Turn one on to name it for the model.`}
    </p>
    <Section title="Accounts on this Mac">
      <Row label="GitHub token" description="Used for issues and pull requests. Export leaves this blank.">
        <input className="setting-input" aria-label="GitHub token" type="password" value={s.githubToken} onChange={(e) => patch({ githubToken: e.target.value })} />
      </Row>
      <Row label="Sign in to GitHub" description="Calls GitHub with the token stored here.">
        <button type="button" className="ghost" onClick={async () => setNote((await window.modbitx?.github(s.githubToken, "/user"))?.body || "No response")}>Sign in</button>
      </Row>
      <Row label="Slack bot token" description="xoxb-… from a Slack app you create, with chat:write and channels:history. Powers slack_post and slack_read. Export leaves this blank.">
        <input className="setting-input" aria-label="Slack bot token" type="password" value={s.slackToken || ""} onChange={(e) => patch({ slackToken: e.target.value })} />
      </Row>
      <Row label="Linear API key" description="Personal key from linear.app/settings/security. Powers linear_search and linear_update. Export leaves this blank.">
        <input className="setting-input" aria-label="Linear API key" type="password" value={s.linearKey || ""} onChange={(e) => patch({ linearKey: e.target.value })} />
      </Row>
      <Row label="Jira site, email, and API token" description="yourorg.atlassian.net, the account email, and a token from id.atlassian.com. Powers jira_search and jira_comment. Export leaves these blank.">
        <input className="setting-input" aria-label="Jira site" placeholder="yourorg.atlassian.net" value={s.jiraDomain || ""} onChange={(e) => patch({ jiraDomain: e.target.value })} />
        <input className="setting-input" aria-label="Jira email" value={s.jiraEmail || ""} onChange={(e) => patch({ jiraEmail: e.target.value })} />
        <input className="setting-input" aria-label="Jira API token" type="password" value={s.jiraToken || ""} onChange={(e) => patch({ jiraToken: e.target.value })} />
      </Row>
      <Row label="Notion integration token" description="ntn-… from an internal integration you create; share pages with it. Powers notion_search and notion_append. Export leaves this blank.">
        <input className="setting-input" aria-label="Notion integration token" type="password" value={s.notionToken || ""} onChange={(e) => patch({ notionToken: e.target.value })} />
      </Row>
      <Row label="Figma personal access token" description="From Figma account settings. Powers figma_comments. Export leaves this blank.">
        <input className="setting-input" aria-label="Figma token" type="password" value={s.figmaToken || ""} onChange={(e) => patch({ figmaToken: e.target.value })} />
      </Row>
      <Row label="Sentry auth token and organization" description="An auth token from Sentry settings and the organization slug. Powers sentry_issues. Export leaves these blank.">
        <input className="setting-input" aria-label="Sentry token" type="password" value={s.sentryToken || ""} onChange={(e) => patch({ sentryToken: e.target.value })} />
        <input className="setting-input" aria-label="Sentry organization" placeholder="org slug" value={s.sentryOrg || ""} onChange={(e) => patch({ sentryOrg: e.target.value })} />
      </Row>
      <Row label="Stripe secret key" description="sk_… — the tools only read balance and charges. Powers stripe_balance and stripe_charges. Export leaves this blank.">
        <input className="setting-input" aria-label="Stripe secret key" type="password" value={s.stripeKey || ""} onChange={(e) => patch({ stripeKey: e.target.value })} />
      </Row>
      <Row label="Calendar" description="Reads upcoming events through this Mac.">
        <button type="button" className="ghost" onClick={async () => setNote((await window.modbitx?.calendarEvents())?.text || "")}>Read Calendar</button>
      </Row>
      <Row label="Mail" description="Reads the inbox through this Mac.">
        <button type="button" className="ghost" onClick={async () => setNote((await window.modbitx?.mailInbox())?.text || "")}>Read Mail</button>
      </Row>
      {note && <pre className="settings-note">{note}</pre>}
    </Section>
  </>;
}

function Code() {
  const { s, patch } = useSettings();
  const [sims, setSims] = useState<{ platform?: string; name: string; udid: string; state: string }[]>([]);
  const [simNote, setSimNote] = useState("");
  const [simImage, setSimImage] = useState("");
  const modes: PermissionMode[] = s.allowBypass === false ? ["ask", "accept-edits", "plan", "auto"] : ["ask", "accept-edits", "plan", "auto", "bypass"];
  return <>
    <Section title="Permissions">
      <Row label="Default permission" description="Ask, Accept edits, Plan, or Auto. Auto uses Jev 1.13. Plan reads until you approve. A session can still change this in the dock or with /.">
        <select className="setting-select" aria-label="Default permission" value={modes.includes(s.permissionMode) ? s.permissionMode : "ask"} onChange={(e) => patch({ permissionMode: e.target.value as PermissionMode })}>
          {modes.map((mode) => <option key={mode} value={mode}>{permissionLabel(mode)}</option>)}
        </select>
      </Row>
      <Row label="Project rules" description="Code reads AGENTS.md, CLAUDE.md, AGENT.md, and Markdown in .grok/rules and .modbitx/rules from the granted folder. A deeper file is listed later.">
        <span className="muted">From the folder</span>
      </Row>
      <Row label="Slash commands" description="Type / in the composer. Markdown files in .modbitx/commands and .grok/commands are added. $ARGUMENTS is the text after the command name.">
        <span className="muted">/plan /new /resume /rewind</span>
      </Row>
      <Row label="Hooks" description="Optional .modbitx/hooks.json can run node or python3 on a script inside the granted folder, on SessionStart and PreToolUse. Exit code 2 denies the tool. A JSON permissionDecision of allow, ask, or deny is honored.">
        <span className="muted">.modbitx/hooks.json</span>
      </Row>
      <Row label="Allow bypass permissions mode" description="When this is off, Bypass is hidden and a stored bypass mode is treated as ask.">
        <Switch label="Allow bypass permissions mode" checked={s.allowBypass !== false} onChange={(allowBypass) => patch({ allowBypass, ...(allowBypass ? {} : s.permissionMode === "bypass" ? { permissionMode: "ask" as const } : {}) })} />
      </Row>
    </Section>
    <Section title="Appearance">
      <Row label="Interface font" description="The font for menus and the conversation.">
        <select className="setting-select" aria-label="Interface font" value={s.interfaceFont || "sans"} onChange={(e) => patch({ interfaceFont: e.target.value as InterfaceFont })}>
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
          <option value="system">System</option>
        </select>
      </Row>
      <Row label="Code font" description="Diffs, the terminal, and code blocks. Blank uses IBM Plex Mono.">
        <input className="setting-input" aria-label="Code font" placeholder="IBM Plex Mono" value={s.codeFont || ""} onChange={(e) => patch({ codeFont: e.target.value.replace(/[^A-Za-z0-9 ._-]/g, "").slice(0, 40) })} />
      </Row>
      <Row label="Transcript width" description="Width of the conversation and the composer.">
        <select className="setting-select" aria-label="Transcript width" value={s.transcriptWidth || "medium"} onChange={(e) => patch({ transcriptWidth: e.target.value as TranscriptWidth })}>
          <option value="narrow">Narrow</option>
          <option value="medium">Medium</option>
          <option value="wide">Wide</option>
        </select>
      </Row>
    </Section>
    <Section title="Work">
      <Row label="Output style" description="Applies to new Code replies.">
        <select className="setting-select" aria-label="Output style" value={s.outputStyle || "default"} onChange={(e) => patch({ outputStyle: e.target.value as OutputStyle })}>
          <option value="default">Default</option>
          <option value="concise">Concise</option>
          <option value="explanatory">Explain first</option>
        </select>
      </Row>
      <Row label="SSH target">
        <input className="setting-input" aria-label="SSH target" value={s.sshTarget} placeholder="user@host" onChange={(e) => patch({ sshTarget: e.target.value })} />
      </Row>
      <Row label="Branch prefix" description="Added when Code creates a branch from the dock or from a git branch tool call.">
        <input className="setting-input" aria-label="Branch prefix" value={s.branchPrefix || ""} placeholder="mbx/" onChange={(e) => patch({ branchPrefix: e.target.value.replace(/[^\w./-]/g, "").slice(0, 24) })} />
      </Row>
      <Row label="Worktree folder" description="A git worktree is created here from /fork --worktree or the Code dock.">
        <button type="button" className="ghost" onClick={async () => {
          const folder = await window.modbitx?.chooseFolder();
          if (folder) patch({ worktreeLocation: folder });
        }}>{s.worktreeLocation || "Choose folder"}</button>
      </Row>
      <Row label="Draw attention when a step needs approval" description="Bounces the Dock only while an approval is on screen.">
        <Switch label="Draw attention when a step needs approval" checked={s.dockAttention === true} onChange={(dockAttention) => patch({ dockAttention })} />
      </Row>
    </Section>
    <Section title="Browser">
      <Row label="Browser tools" description="Cowork and Code can open the built-in browser, read the page, and fill forms. A new site still asks before it opens.">
        <Switch label="Browser tools" checked={s.browserTools !== false} onChange={(browserTools) => patch({ browserTools })} />
      </Row>
      <Row label="Keep browser cookies after the turn" description="Turning this off clears cookies and local storage for the open browser view. It does not open a browser just to clear it.">
        <Switch label="Keep browser cookies after the turn" checked={s.keepBrowserCookies !== false} onChange={(keepBrowserCookies) => {
          patch({ keepBrowserCookies });
          if (!keepBrowserCookies) void window.modbitx?.clearBrowserStorage();
        }} />
      </Row>
      <Row label="Separate browser for each session" description="Off keeps one shared browser. On gives each chat its own cookies.">
        <Switch label="Separate browser for each session" checked={s.browserPerSession === true} onChange={(browserPerSession) => patch({ browserPerSession })} />
      </Row>
    </Section>
    <Section title="Mobile simulators">
      <Row label="iOS Simulator">
        <Switch label="iOS Simulator" checked={s.simIos !== false} onChange={(simIos) => patch({ simIos })} />
      </Row>
      <Row label="Android Emulator">
        <Switch label="Android Emulator" checked={s.simAndroid !== false} onChange={(simAndroid) => patch({ simAndroid })} />
      </Row>
      <p className="setting-desc">When a platform is off, Cowork and Code will not boot, tap, or screenshot it. Listing devices still works.</p>
      <Row label="Devices">
        <button type="button" className="ghost" onClick={async () => {
          const listed = await window.modbitx?.simulators();
          setSims(listed?.devices || []);
          setSimImage("");
          setSimNote(listed?.ok ? "" : (listed?.error || "No simulators."));
        }}>List simulators</button>
      </Row>
      {simNote && <p className="settings-note">{simNote}</p>}
      {simImage && <img className="shot" src={simImage} alt="Simulator screenshot" />}
      {sims.map((device) => {
        const android = device.platform === "android" || device.udid.startsWith("avd:") || device.udid.startsWith("emulator-");
        const enabled = android ? s.simAndroid !== false : s.simIos !== false;
        return (
          <div key={device.udid} className="setting-row">
            <div className="setting-name">{device.platform || "ios"} · {device.name} · {device.state}</div>
            <div className="setting-control">
              <button type="button" className="ghost" disabled={!enabled} onClick={async () => {
                try { setSimNote((await window.modbitx?.bootSimulator(device.udid))?.detail || ""); }
                catch (error) { setSimNote(error instanceof Error ? error.message : "Boot failed."); }
              }}>Boot</button>
              <button type="button" className="ghost" disabled={!enabled} onClick={async () => {
                try {
                  const shot = await window.modbitx?.simulator({ action: "shot", target: device.udid });
                  setSimNote(shot?.detail || shot?.error || "");
                  setSimImage(shot?.dataUrl || "");
                } catch (error) {
                  setSimNote(error instanceof Error ? error.message : "Screenshot failed.");
                }
              }}>Screenshot</button>
            </div>
          </div>
        );
      })}
    </Section>
  </>;
}

function Cowork() {
  const { dispatch, state, s, patch } = useSettings();
  const [syncUrl, setSyncUrl] = useState("");
  const hosts = (key: "allowedHosts" | "blockedHosts" | "highRiskHosts" | "trustedFolders") => s[key] || [];
  return <>
    <p className="settings-lead">Cowork can use a folder, the built-in browser, and computer use. Schedules marked to keep running are finished by the background helper after you quit. Phone handoff and Chrome share the pairing code.</p>
    <Section title="Tasks">
      <Row label="Let Jev choose each browser step">
        <Switch label="Let Jev choose each browser step" checked={s.browserHarness !== false} onChange={(browserHarness) => patch({ browserHarness })} />
      </Row>
      <Row label="Allow phone and Chrome handoff">
        <Switch label="Allow phone and Chrome handoff" checked={s.remoteControl} onChange={(remoteControl) => patch({ remoteControl })} />
      </Row>
      <Row label="Keep schedules running after quit">
        <Switch label="Keep schedules running after quit" checked={s.backgroundScheduler} onChange={async (on) => {
          patch({ backgroundScheduler: on });
          if (on) await window.modbitx?.installScheduler();
          else await window.modbitx?.removeScheduler();
        }} />
      </Row>
      <Row label="Phone handoff link">
        <button type="button" className="ghost" onClick={async () => setSyncUrl((await window.modbitx?.syncInfo())?.url || "")}>Show link</button>
      </Row>
      {syncUrl && <p className="settings-note">{syncUrl}</p>}
      {state.serverNote && <p className="settings-note" data-server-note>{state.serverNote}</p>}
    </Section>
    <Section title="Sites always allowed">
      <Removable items={hosts("allowedHosts")} empty="None yet. Choose Always on a browser prompt to keep a site across launches." onRemove={(host) => patch({ allowedHosts: hosts("allowedHosts").filter((item) => item !== host) })} />
    </Section>
    <Section title="Blocked sites">
      <Removable items={hosts("blockedHosts")} empty="None. A blocked host never opens in the built-in browser." onRemove={(host) => patch({ blockedHosts: hosts("blockedHosts").filter((item) => item !== host) })} />
      <AddRow placeholder="example.com" label="Block" onAdd={(value) => {
        const host = value.replace(/^https?:\/\//, "").split("/")[0];
        if (!host || hosts("blockedHosts").includes(host)) return;
        patch({ blockedHosts: [...hosts("blockedHosts"), host] });
      }} />
    </Section>
    <Section title="High-risk sites">
      <p className="setting-desc">These ask before every visit. Jev can add a host here the first time it looks like banking, mail, or account admin.</p>
      <Removable items={hosts("highRiskHosts")} empty="None yet." onRemove={(host) => patch({ highRiskHosts: hosts("highRiskHosts").filter((item) => item !== host) })} />
    </Section>
    <Section title="Remembered folders">
      <Removable items={hosts("trustedFolders")} empty="None yet. After you choose a folder in Cowork or Code, remember it for the next task." onRemove={(folder) => patch({ trustedFolders: hosts("trustedFolders").filter((item) => item !== folder) })} />
      <Row label="Start a task from a folder">
        <button type="button" className="primary-btn" onClick={async () => {
          const folder = await window.modbitx?.chooseFolder();
          if (folder) dispatch({ type: "new-thread", mode: "cowork", folder });
        }}>Choose a folder</button>
      </Row>
    </Section>
  </>;
}

function Transfer() {
  const { state, dispatch } = useStore();
  const [note, setNote] = useState("");
  return <>
    <p className="settings-lead">Export leaves the model key and the GitHub token out of the file. Import adds chats, projects, memory, and schedules that are not already on this Mac. Preferences stay as they are. Incognito chats are left out.</p>
    <Section title="File">
      <Row label="Export" description="Cowork and Code sessions are files in a zip. Chat threads, projects, memory, and schedules sit in the manifest. The model key and GitHub token are left blank.">
        <button type="button" className="ghost" onClick={() => void exportBundle(state, setNote, false)}>Export</button>
      </Row>
      <Row label="Import" description="Accepts a Modbitx zip or the older JSON export. Preferences and keys stay as they are.">
        <button type="button" className="ghost" onClick={() => void importBundle(dispatch, setNote)}>Import</button>
      </Row>
      {note && <p className="settings-note">{note}</p>}
    </Section>
  </>;
}

function Chrome() {
  const { state, s, patch } = useSettings();
  const [syncUrl, setSyncUrl] = useState("");
  const [note, setNote] = useState("");
  return <>
    <Section title="Extension">
      <Row label="Allow the Chrome extension to hand work to this Mac">
        <Switch label="Allow the Chrome extension to hand work to this Mac" checked={s.remoteControl} onChange={(remoteControl) => patch({ remoteControl })} />
      </Row>
      {state.serverNote && <p className="settings-note" data-server-note>{state.serverNote}</p>}
      <Row label="Pairing link" description="Load the unpacked extension in extensions/chrome and paste the pairing code from that link.">
        <button type="button" className="ghost" onClick={async () => setSyncUrl((await window.modbitx?.syncInfo())?.url || "")}>Show link</button>
      </Row>
      {syncUrl && <p className="settings-note">{syncUrl}</p>}
      <Row label="Current page" description="Queues a page read. Allow that site from the Modbitx extension first. The extension checks about once a minute and posts the text, or the read error, to Dispatch on this Mac. The switch above must be on, or the post is refused.">
        <button type="button" className="ghost" onClick={async () => {
          await window.modbitx?.chromeEnqueue({ type: "read" });
          setNote("Queued a page read for the Chrome extension.");
        }}>Ask Chrome</button>
      </Row>
      {note && <p className="settings-note">{note}</p>}
    </Section>
  </>;
}

function Desktop() {
  const { s, patch } = useSettings();
  const [info, setInfo] = useState("");
  const [packaged, setPackaged] = useState(true);
  const [storage, setStorage] = useState("");
  const [note, setNote] = useState("");
  const [appName, setAppName] = useState("");
  useEffect(() => {
    void window.modbitx?.info().then((value) => {
      setInfo(`${value.version} · ${value.platform} · ${value.userData}`);
      setPackaged(value.packaged);
    });
  }, []);
  const days = Math.min(365, Math.max(1, s.archiveAfterDays || 30));
  return <>
    <Section title="Startup">
      <Row label="Run when you log in" description={packaged ? "Logging in opens Modbitx." : "Logging in opens this development copy of Modbitx."}>
        <Switch label="Run when you log in" checked={s.runOnStartup === true} onChange={async (runOnStartup) => {
          patch({ runOnStartup });
          const applied = await window.modbitx?.applyDesktop({
            runOnStartup,
            menuBar: s.menuBar !== false,
            keepAwake: s.keepAwake === true,
            quickEntry: s.quickEntry !== false
          });
          if (runOnStartup && applied && !applied.openAtLogin) {
            setNote(applied.status === "requires-approval"
              ? "macOS still needs approval before this copy can open at login."
              : "macOS did not register this copy to open at login.");
          }
        }} />
      </Row>
      <Row label="Quick entry shortcut" description="Shift-Command-Space opens quick entry. The menu-bar Quick entry item still opens the panel.">
        <Switch label="Quick entry shortcut" checked={s.quickEntry !== false} onChange={(quickEntry) => patch({ quickEntry })} />
      </Row>
      <Row label="Show Modbitx in the menu bar" description="The tray lists New chat, Quick entry, Show Modbitx, and Quit.">
        <Switch label="Show Modbitx in the menu bar" checked={s.menuBar !== false} onChange={(menuBar) => patch({ menuBar })} />
      </Row>
      <Row label="Stay awake while Modbitx is open" description="The display can still sleep, and closing the lid still sleeps the Mac. This keeps scheduled work from pausing while the app is open.">
        <Switch label="Stay awake while Modbitx is open" checked={s.keepAwake === true} onChange={(keepAwake) => patch({ keepAwake })} />
      </Row>
    </Section>
    <Section title="Computer use">
      <Row label="Enable computer use">
        <Switch label="Enable computer use" checked={s.computerUse} onChange={(computerUse) => patch({ computerUse })} />
      </Row>
      <Row label="When a task needs the screen" description="Background clicks without bringing an app forward. Full control activates the named app first. Each task still asks before the first action.">
        <select className="setting-select" aria-label="When a task needs the screen" value={s.computerMode} onChange={(e) => patch({ computerMode: e.target.value as Settings["computerMode"] })}>
          <option value="background">Background</option>
          <option value="takeover">Full control</option>
        </select>
      </Row>
    </Section>
    <Section title="Denied apps">
      <p className="setting-desc">A request to focus one of these apps is refused. Clicks are not filtered by app.</p>
      <Removable items={s.deniedApps || []} empty="None." onRemove={(name) => patch({ deniedApps: (s.deniedApps || []).filter((item) => item !== name) })} />
      <AddRow placeholder="App name" label="Deny" onAdd={(name) => {
        if ((s.deniedApps || []).some((item) => item.toLowerCase() === name.toLowerCase())) return;
        patch({ deniedApps: [...(s.deniedApps || []), name] });
      }} />
      <div className="setting-row">
        <div className="setting-copy">
          <div className="setting-name">Check a running app</div>
        </div>
        <div className="setting-control">
          <input className="setting-input" aria-label="Check a running app" placeholder="App name" value={appName} onChange={(e) => setAppName(e.target.value)} />
          <button type="button" className="ghost" onClick={async () => {
            const apps = (await window.modbitx?.listApps()) || [];
            const query = appName.trim().toLowerCase();
            const matched = query ? apps.filter((name) => name.toLowerCase().includes(query)) : apps;
            setNote(matched.length ? matched.join("\n") : (query ? `No running app matches ${appName.trim()}.` : "No running apps."));
          }}>Look up</button>
        </div>
      </div>
      <Row label="Accessibility">
        <button type="button" className="ghost" onClick={() => void window.modbitx?.openPrivacy("accessibility")}>Open settings</button>
      </Row>
      <Row label="Screen Recording">
        <button type="button" className="ghost" onClick={() => void window.modbitx?.openPrivacy("screen")}>Open settings</button>
      </Row>
    </Section>
    <Section title="Storage">
      <Row label="Archive chats idle for at least">
        <input className="setting-input" aria-label="Archive chats idle for at least" type="number" min={1} max={365} value={days} onChange={(e) => patch({ archiveAfterDays: Math.min(365, Math.max(1, Number(e.target.value) || 30)) })} />
      </Row>
      <IdleArchive days={days} onNote={setNote} />
      <Row label="Disk use">
        <button type="button" className="ghost" onClick={async () => {
          const measured = await window.modbitx?.desktopStorage();
          setStorage(measured ? `${formatBytes(measured.bytes)} across ${measured.files.toLocaleString()} files` : "Could not measure storage.");
        }}>Measure</button>
      </Row>
      {storage && <p className="settings-note">{storage}</p>}
      <Row label="App cache">
        <button type="button" className="ghost" onClick={async () => {
          await window.modbitx?.clearCache();
          setNote("Cleared the app cache.");
        }}>Clear cache</button>
      </Row>
      {note && <p className="settings-note">{note}</p>}
      <p className="muted">{info || "Running in the browser shell."}</p>
    </Section>
  </>;
}

function IdleArchive({ days, onNote }: { days: number; onNote: (note: string) => void }) {
  const { state, dispatch } = useStore();
  return (
    <Row label="Archive idle chats" description="Idle chats are archived on their own, about once a minute. Pinned chats, incognito chats, and a chat that is still running stay. The open chat stays until you leave it. This button does the same pass.">
      <button type="button" className="ghost" onClick={() => {
        const before = Date.now() - days * 86_400_000;
        const running = state.runningThreadIds || [];
        const count = state.threads.filter((thread) => !thread.pinned && !thread.archived && !thread.incognito && thread.updatedAt <= before && !running.includes(thread.id)).length;
        dispatch({ type: "archive-inactive", before, running });
        onNote(count ? `Archived ${count} idle chats. Pinned, incognito, and running chats were left in place.` : "No idle chats to archive.");
      }}>Archive</button>
    </Row>
  );
}

function ConnectorFolder() {
  const [dir, setDir] = useState("");
  useEffect(() => {
    void window.modbitx?.listConnectors?.().then((listed) => setDir(listed?.dir || ""));
  }, []);
  if (!dir) return null;
  return <p className="settings-note">{dir}</p>;
}

function Extensions() {
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const listed = state.connectors.filter((connector) => connector.kind !== "custom" && (!q || `${connector.name} ${connector.blurb}`.toLowerCase().includes(q)));
  return (
    <Section title="Local connectors">
      <p className="setting-desc">These connectors live on this Mac. A new file in the folder is added turned off until you enable it. Changing the file updates its command.</p>
      <ConnectorFolder />
      <input aria-label="Search connectors" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      {listed.map((connector) => (
        <Row key={connector.id} label={connector.name} description={connector.blurb}>
          <Switch label={connector.name} checked={connector.enabled} onChange={() => dispatch({ type: "toggle-connector", id: connector.id })} />
        </Row>
      ))}
    </Section>
  );
}

function ModelProviders() {
  const { s, patch } = useSettings();
  const [query, setQuery] = useState("");
  const [envNote, setEnvNote] = useState("");
  const active = activeProvider(s);
  const q = query.trim().toLowerCase();
  const listed = providers().filter((provider) => !q
    || `${provider.name} ${provider.id} ${provider.env.join(" ")} ${provider.api}`.toLowerCase().includes(q));
  useEffect(() => {
    let alive = true;
    const name = active.env[0] || "";
    if (!name) {
      setEnvNote("");
      return () => { alive = false; };
    }
    void window.modbitx?.keyEnv(name).then((value) => {
      if (!alive) return;
      setEnvNote(value
        ? `${name} is set in this Mac’s environment and is used when no key is saved here.`
        : `${name} is not set in this Mac’s environment.`);
    });
    return () => { alive = false; };
  }, [active.env, active.id]);
  const saveKey = (id: string, value: string) => patch({ providerKeys: { ...(s.providerKeys || {}), [id]: value } });
  const saveBase = (id: string, value: string) => patch({ providerBase: { ...(s.providerBase || {}), [id]: value } });
  return <>
    <p className="settings-lead">{providers().length} providers from the models.dev catalog that opencode uses. Keys are saved on this Mac, one per provider, so switching never loses one. A provider with no catalog model list takes a model id you type.</p>
    <Section title="In use">
      <div data-third-party="provider">
      <Row label={active.name} description={`${active.api}${active.local ? " · runs on this Mac" : ""}${active.note ? ` · ${active.note}` : ""}. ${envNote}`}>
        <span className="muted">{providerKey(s) ? "Key saved here" : "No key saved here"}</span>
      </Row>
      <Row label="Key">
        <input
          className="setting-input"
          aria-label={`${active.name} key`}
          type="password"
          value={providerKey(s)}
          placeholder={active.env[0] || "api key"}
          onChange={(e) => saveKey(active.id, e.target.value)}
        />
      </Row>
      <Row label="Endpoint" description={`Empty uses ${active.api}.`}>
        <input
          className="setting-input"
          aria-label={`${active.name} endpoint`}
          value={(s.providerBase || {})[active.id] || ""}
          placeholder={active.api}
          onChange={(e) => saveBase(active.id, e.target.value)}
        />
      </Row>
      <Row label="Model" description={providerModels(s).length ? `${providerModels(s).length} models known for this provider.` : "This provider lists no models, so type one below."}>
        <select className="setting-select" aria-label="Model" value={settledModel(s)} onChange={(e) => patch({ model: e.target.value })}>
          {providerModels(s).map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
        </select>
      </Row>
      <Row label="Your own model id" description="Use this for a local server or a model the catalog does not list. It becomes the first choice.">
        <input
          className="setting-input"
          aria-label="Your own model id"
          value={(s.customModels || {})[active.id] || ""}
          placeholder="model-id"
          onChange={(e) => patch({ customModels: { ...(s.customModels || {}), [active.id]: e.target.value } })}
        />
      </Row>
      </div>
    </Section>
    <Section title="All providers">
      <div data-third-party="provider">
      <div className="setting-block">
        <input aria-label="Search providers" placeholder="Search providers" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {listed.map((provider) => (
        <div key={provider.id} className="provider-row">
          <Row label={provider.name} description={`${provider.id}${provider.local ? " · runs on this Mac" : ""} · ${provider.env.join(" or ")} · ${provider.models.length} models`}>
            {provider.id === active.id
              ? <span className="pill">Using</span>
              : <button type="button" className="ghost" onClick={() => patch(switchProvider(s, provider.id))}>Use</button>}
          </Row>
          <div className="setting-block">
            <input
              className="setting-input"
              aria-label={`${provider.name} key`}
              type="password"
              value={(s.providerKeys || {})[provider.id] || ""}
              placeholder={provider.env[0] || "api key"}
              onChange={(e) => saveKey(provider.id, e.target.value)}
            />
            <input
              className="setting-input"
              aria-label={`${provider.name} endpoint`}
              value={(s.providerBase || {})[provider.id] || ""}
              placeholder={provider.api}
              onChange={(e) => saveBase(provider.id, e.target.value)}
            />
          </div>
        </div>
      ))}
      {!listed.length && <p className="muted settings-empty">No provider matches that search.</p>}
      </div>
    </Section>
  </>;
}

function Developer() {
  const { state, dispatch, s, patch } = useSettings();
  const [note, setNote] = useState("");
  return <>
    <p className="settings-lead">The model providers, their keys, and the model list moved to Settings → Model providers.</p>
    <Section title="Model">
      <Row label="Default effort">
        <select className="setting-select" aria-label="Default effort" value={s.effort} onChange={(e) => patch({ effort: e.target.value as Effort })}>
          {EFFORTS.map((effort) => <option key={effort.id} value={effort.id}>{effort.label}</option>)}
        </select>
      </Row>
    </Section>
    <Section title="Local MCP servers">
      <p className="setting-desc">Modbitx speaks stdio JSON-RPC, lists tools, and can call one. Files in this folder are the local directory. There is no connector marketplace.</p>
      <ConnectorFolder />
      {state.connectors.filter((connector) => connector.kind === "custom").map((connector) => (
        <div key={connector.id} className="design-card">
          <Row label={connector.name}>
            <input className="setting-input" aria-label={`${connector.name} command`} value={connector.command ?? ""} onChange={(e) => dispatch({ type: "set-connector-command", id: connector.id, command: e.target.value })} />
          </Row>
          <div className="design-card-actions">
            <button type="button" className="ghost" onClick={async () => setNote(JSON.stringify(await window.modbitx?.mcpStart(connector.id, connector.command || ""), null, 2))}>Start</button>
            <button type="button" className="ghost" onClick={async () => setNote(JSON.stringify(await window.modbitx?.mcpTools(connector.id), null, 2))}>List tools</button>
          </div>
        </div>
      ))}
      {note && <pre className="settings-note">{note}</pre>}
    </Section>
  </>;
}

function Skills() {
  const { state, dispatch } = useStore();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const openEditor = (skill: Skill) => {
    setEditing(skill.id);
    setDraftName(skill.name);
    setDraftBody(skill.instructions);
    setPendingDelete(null);
  };
  const saveEditor = () => {
    if (!editing) return;
    dispatch({ type: "patch-skill", id: editing, patch: skillEdit({ name: draftName, instructions: draftBody }) });
    setEditing(null);
  };
  const reset = (skill: Skill) => {
    const patch = resetPatch(skill, SEED_SKILLS);
    if (!patch) return;
    dispatch({ type: "patch-skill", id: skill.id, patch });
    if (editing === skill.id) setEditing(null);
  };
  const shared = skillCharacters(state.skills);
  return <>
    <p className="settings-lead">Skills are local instruction packages. Enabled skills join the system prompt: {enabledSkillCount(state.skills)} enabled, adding {shared.toLocaleString()} characters to every request. A bundled skill can be reset instead of deleted, because Modbitx restores it on the next load.</p>
    <Section title="Installed">
      {state.skills.map((skill) => (
        <div key={skill.id} className="skill-row">
          <Row label={skill.name} description={[skill.bundled ? "Bundled" : "Yours", skill.blurb, editing === skill.id ? "" : skillPreview(skill.instructions)].filter(Boolean).join(" · ")}>
            <Switch label={skill.name} checked={skill.enabled} onChange={() => dispatch({ type: "toggle-skill", id: skill.id })} />
          </Row>
          {editing === skill.id ? (
            <div className="setting-block">
              <input aria-label={`${skill.name} name`} value={draftName} maxLength={SKILL_NAME_LIMIT} onChange={(e) => setDraftName(e.target.value)} />
              <textarea aria-label={`${skill.name} instructions`} rows={5} maxLength={SKILL_INSTRUCTIONS_LIMIT} value={draftBody} onChange={(e) => setDraftBody(e.target.value)} />
              <p className="muted">{draftBody.length} / {SKILL_INSTRUCTIONS_LIMIT}</p>
              <div className="top-actions">
                <button type="button" className="primary-btn" onClick={saveEditor}>Save skill</button>
                <button type="button" className="ghost" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="top-actions">
              <button type="button" className="ghost" onClick={() => openEditor(skill)}>Edit</button>
              {canResetSkill(skill) && <button type="button" className="ghost" onClick={() => reset(skill)}>Reset</button>}
              {canDeleteSkill(skill) && <button type="button" className="ghost" onClick={() => setPendingDelete(skill.id)}>Delete</button>}
            </div>
          )}
          {pendingDelete === skill.id && (
            <div className="setting-confirm">
              <p>Delete {skill.name} from this Mac. This cannot be undone.</p>
              <button type="button" className="ghost" onClick={() => { dispatch({ type: "delete-skill", id: skill.id }); setPendingDelete(null); }}>Delete</button>
              <button type="button" className="ghost" onClick={() => setPendingDelete(null)}>Cancel</button>
            </div>
          )}
        </div>
      ))}
    </Section>
    <Section title="Create a skill">
      <div className="setting-block">
        <input aria-label="Skill name" placeholder="Name" value={name} maxLength={SKILL_NAME_LIMIT} onChange={(e) => setName(e.target.value)} />
        <textarea aria-label="Skill instructions" rows={5} placeholder="Instructions" maxLength={SKILL_INSTRUCTIONS_LIMIT} value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="button" className="primary-btn" onClick={() => {
          const patch = skillEdit({ name, instructions: body });
          if (!patch.name) return;
          dispatch({ type: "add-skill", name: patch.name, instructions: patch.instructions || "" });
          setName(""); setBody("");
        }}>Save skill</button>
      </div>
    </Section>
  </>;
}

function ConnectorLibrary() {
  const { state, dispatch } = useStore();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const listed = state.connectors.filter((connector) => !q || `${connector.name} ${connector.blurb} ${connector.category}`.toLowerCase().includes(q));
  return <>
    <p className="settings-lead">Connectors on this Mac. Turning one on records that Modbitx may use it. A custom command is also listed under Plugins.</p>
    <ConnectorFolder />
    <input aria-label="Search connectors" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
    <Section title="Directory">
      {listed.map((connector) => (
        <Row key={connector.id} label={connector.name} description={`${connector.category}. ${connector.blurb}`}>
          <Switch label={connector.name} checked={connector.enabled} onChange={() => dispatch({ type: "toggle-connector", id: connector.id })} />
        </Row>
      ))}
    </Section>
    <Section title="Add a custom connector">
      <div className="setting-block">
        <input aria-label="Connector name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input aria-label="Connector command" placeholder="Command" value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="button" className="primary-btn" onClick={() => { if (name.trim()) { dispatch({ type: "add-connector", name, command: body }); setName(""); setBody(""); } }}>Add</button>
      </div>
    </Section>
  </>;
}

function Plugins() {
  const { state, dispatch } = useStore();
  const custom = state.connectors.filter((connector) => connector.kind === "custom");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [pluginDir, setPluginDir] = useState("");
  const [installNote, setInstallNote] = useState("");
  useEffect(() => {
    void window.modbitx?.listPlugins?.().then((listed) => setPluginDir(listed?.dir || ""));
  }, []);
  const packaged = state.skills.filter((skill) => skill.id.startsWith("plugin:"));
  return <>
    <p className="settings-lead">Plugins are local commands stored on this Mac. Add one and Modbitx can start it as a custom connector. Developer can start the same command and list its tools.</p>
    {pluginDir && (
      <Section title="Plugin packages">
        <p className="settings-note">{`Drop packages in ${pluginDir}: a folder with plugin.json (name, description) and skills/<skill>/SKILL.md files. Their skills appear below and in Customize → Skills, watched live.`}</p>
        <Row label="Install a package" description="A .zip with plugin.json at its root, or one folder deep. It unpacks with this Mac's own expander and the watcher loads it at once.">
          <button
            type="button"
            className="btn-quiet"
            onClick={() => {
              setInstallNote("");
              void window.modbitx?.installPlugin?.().then((installed) => {
                setInstallNote(installed ? `Installed ${installed.name}.` : "");
              }).catch((error: unknown) => {
                setInstallNote(error instanceof Error ? error.message : "That package did not install.");
              });
            }}
          >Choose a .zip…</button>
        </Row>
        {installNote && <p className="settings-note">{installNote}</p>}
        {packaged.length === 0 && <p className="muted settings-empty">No plugin packages installed yet.</p>}
        {packaged.map((skill) => (
          <Row key={skill.id} label={skill.name} description={skill.blurb}>
            <Switch label={skill.name} checked={skill.enabled} onChange={() => dispatch({ type: "toggle-skill", id: skill.id })} />
          </Row>
        ))}
      </Section>
    )}
    <Section title="On this Mac">
      {custom.length === 0 && <p className="muted settings-empty">No local plugins yet.</p>}
      {custom.map((connector) => (
        <div key={connector.id} className="design-card">
          <Row label={connector.name} description={connector.blurb}>
            <Switch label={connector.name} checked={connector.enabled} onChange={() => dispatch({ type: "toggle-connector", id: connector.id })} />
          </Row>
          <Row label="Command">
            <input className="setting-input" aria-label={`${connector.name} command`} value={connector.command ?? ""} onChange={(e) => dispatch({ type: "set-connector-command", id: connector.id, command: e.target.value })} />
          </Row>
        </div>
      ))}
    </Section>
    <Section title="Add a plugin">
      <div className="setting-block">
        <input aria-label="Plugin name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input aria-label="Plugin command" placeholder="Command" value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="button" className="primary-btn" onClick={() => { if (name.trim()) { dispatch({ type: "add-connector", name, command: body }); setName(""); setBody(""); } }}>Add</button>
      </div>
    </Section>
  </>;
}

function tidyThread(raw: Thread): Thread | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.title !== "string" || !Array.isArray(raw.messages)) return null;
  if (raw.incognito) return null;
  if (raw.mode !== "chat" && raw.mode !== "cowork" && raw.mode !== "code") return null;
  return {
    ...raw,
    pinned: !!raw.pinned,
    archived: !!raw.archived,
    incognito: false,
    starred: !!raw.starred,
    model: raw.model || "grok-4.7",
    effort: raw.effort || "xhigh",
    messages: raw.messages.filter((message) => message && typeof message.id === "string" && typeof message.content === "string"),
    createdAt: raw.createdAt || Date.now(),
    updatedAt: raw.updatedAt || Date.now()
  };
}

function takeBundle(dispatch: ReturnType<typeof useStore>["dispatch"], setNote: (note: string) => void, parsed: { threads?: Thread[]; memories?: MemoryNote[]; tasks?: ScheduledTask[]; projects?: Project[] }) {
  const threads = (parsed.threads || []).map(tidyThread).filter((thread): thread is Thread => !!thread);
  const memories = (parsed.memories || []).filter((note) => note && typeof note.id === "string" && typeof note.text === "string");
  const tasks = (parsed.tasks || []).filter((task) => task && typeof task.id === "string" && typeof task.prompt === "string" && typeof task.when === "string");
  const projects = (parsed.projects || []).filter((project) => project && typeof project.id === "string" && typeof project.name === "string" && Array.isArray(project.knowledge));
  dispatch({ type: "import-bundle", threads, memories, tasks, projects });
  setNote(`Added ${threads.length} chats, ${projects.length} projects, ${memories.length} memory notes, and ${tasks.length} schedules. Duplicates were skipped.`);
}

async function importBundle(dispatch: ReturnType<typeof useStore>["dispatch"], setNote: (note: string) => void) {
  try {
    if (window.modbitx?.openBytes) {
      const opened = await window.modbitx.openBytes();
      if (!opened) return;
      const bytes = base64ToBytes(opened.base64);
      const zip = opened.name.toLowerCase().endsWith(".zip") || (bytes[0] === 0x50 && bytes[1] === 0x4b);
      if (zip) {
        takeBundle(dispatch, setNote, bundleFromZip(bytes));
        return;
      }
      takeBundle(dispatch, setNote, JSON.parse(new TextDecoder().decode(bytes)) as { threads?: Thread[] });
      return;
    }
    const raw = await window.modbitx?.openText();
    if (!raw) return;
    takeBundle(dispatch, setNote, JSON.parse(raw) as { threads?: Thread[] });
  } catch (error) {
    setNote(error instanceof Error ? error.message : "Could not import that file.");
  }
}

async function exportBundle(state: ReturnType<typeof useStore>["state"], setNote: (note: string) => void, chatsOnly: boolean) {
  try {
    if (!chatsOnly && window.modbitx?.saveBytes) {
      const saved = await window.modbitx.saveBytes("modbitx-export.zip", bytesToBase64(bundleZip({
        threads: state.threads,
        memories: state.memories,
        tasks: state.tasks,
        projects: state.projects,
        settings: state.settings
      })));
      setNote(saved ? `Saved ${saved}` : "Export cancelled.");
      return;
    }
    const settings = { ...state.settings, apiKey: "", githubToken: "" };
    const payload = chatsOnly
      ? { threads: state.threads.filter((thread) => !thread.incognito) }
      : {
        threads: state.threads.filter((thread) => !thread.incognito),
        memories: state.memories,
        tasks: state.tasks,
        projects: state.projects,
        settings
      };
    const saved = await window.modbitx?.saveText(chatsOnly ? "modbitx-chats.json" : "modbitx-export.json", JSON.stringify(payload, null, 2));
    setNote(saved ? `Saved ${saved}` : "Export cancelled.");
  } catch (error) {
    setNote(error instanceof Error ? error.message : "Could not export.");
  }
}
