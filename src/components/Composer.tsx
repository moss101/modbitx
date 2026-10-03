import { useEffect, useRef, useState } from "react";
import { builtinCommands, fillCommand, matchSlash, type SlashCommand } from "../agent";
import { EFFORTS } from "../catalog";
import { providerModels, settledModel } from "../providers";
import { useStore } from "../store";
import type { Attachment, Effort } from "../types";

export function Composer({
  draft, setDraft, busy, commands, mentions, onSend, onSlash, onStop
}: {
  draft: string;
  setDraft: (value: string) => void;
  busy: boolean;
  commands: SlashCommand[];
  mentions: string[];
  onSend: (text: string, files: Attachment[]) => void;
  onSlash: (name: string, rest: string, files: Attachment[], command?: SlashCommand) => void;
  onStop: () => void;
}) {
  const { state, dispatch, activeThread } = useStore();
  const [files, setFiles] = useState<Attachment[]>([]);
  const [listeningNow, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const [picked, setPicked] = useState(0);
  const [caret, setCaret] = useState(0);
  const holdRef = useRef({ downAt: 0, holding: false });
  const model = activeThread?.model ?? settledModel(state.settings);
  const effort = activeThread?.effort ?? state.settings.effort;
  const menu = matchSlash(draft, [...builtinCommands(state.settings.allowBypass !== false), ...commands]);
  const mention = mentionQuery(draft, caret);
  const mentionHits = mention
    ? mentions.filter((path) => path.toLowerCase().includes(mention.token.toLowerCase())).slice(0, 8)
    : [];
  const slashOpen = Boolean(menu && menu.matches.length && !mention);
  const mentionOpen = mentionHits.length > 0;

  // The global ⇧⌘D dictation shortcut toggles push-to-talk wherever focus is.
  useEffect(() => {
    if (state.settings.dictation === false) return;
    const off = window.modbitx?.onDictation?.(() => {
      startDictation({
        initial: draft,
        onState: (active, note) => { setListening(active); setVoiceNote(note || ""); },
        onText: setDraft
      });
    });
    return () => off?.();
  }, [state.settings.dictation, draft]);

  function toggleVoice() {
    startDictation({
      initial: draft,
      onState: (active, note) => { setListening(active); setVoiceNote(note || ""); },
      onText: setDraft
    });
  }

  /** Hold-to-talk: press starts, a release after 250 ms stops and swallows the click. */
  function micDown() {
    holdRef.current = { downAt: Date.now(), holding: false };
    if (!listeningNow) toggleVoice();
  }
  function micUp() {
    if (Date.now() - holdRef.current.downAt >= 250) {
      holdRef.current.holding = true;
      if (listeningNow) toggleVoice();
    }
  }
  function micClick() {
    if (holdRef.current.holding) {
      holdRef.current.holding = false;
      return;
    }
    toggleVoice();
  }

  async function attach() {
    if (!window.modbitx) return;
    const chosen = await window.modbitx.chooseFiles();
    setFiles((current) => [
      ...current,
      ...chosen.map((file) => ({ id: file.path, name: file.name, path: file.path, size: file.size, text: file.text.slice(0, 20_000) }))
    ]);
  }

  function runSlash(command: SlashCommand, rest: string) {
    if (command.kind === "folder" && command.body) {
      onSend(fillCommand(command.body, rest), files);
      setDraft("");
      setFiles([]);
      return;
    }
    setDraft("");
    if (rest) setFiles([]);
    onSlash(command.name, rest, rest ? files : [], command);
  }

  function submit() {
    if (slashOpen && menu) {
      const exact = menu.matches.find((command) => command.name === menu.name) || menu.matches[picked] || menu.matches[0];
      if (exact && (menu.name === exact.name || menu.matches.length === 1 || draft.trim() === `/${exact.name}`)) {
        runSlash(exact, menu.rest);
        return;
      }
    }
    if (!draft.trim() && files.length === 0) return;
    onSend(draft, files);
    setDraft("");
    setFiles([]);
  }

  function insertMention(path: string) {
    if (!mention) return;
    const next = `${draft.slice(0, mention.start)}${path} ${draft.slice(caret)}`;
    setDraft(next);
    setCaret(mention.start + path.length + 1);
  }

  return (
    <div className="composer">
      {slashOpen && menu && (
        <div className="slash-menu" role="listbox" aria-label="Commands">
          {menu.matches.map((command, index) => (
            <button key={command.name} role="option" className={index === picked ? "on" : ""} onMouseDown={(event) => { event.preventDefault(); runSlash(command, menu.rest); }}>
              <strong>/{command.name}</strong>
              <span>{command.blurb}</span>
            </button>
          ))}
        </div>
      )}
      {mentionOpen && (
        <div className="slash-menu" role="listbox" aria-label="Files">
          {mentionHits.map((path) => (
            <button key={path} role="option" onMouseDown={(event) => { event.preventDefault(); insertMention(path); }}>
              <strong>{path.split("/").pop()}</strong>
              <span>{path}</span>
            </button>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="chips">
          {files.map((file) => (
            <button key={file.id} className="chip" onClick={() => setFiles(files.filter((item) => item.id !== file.id))}>{file.name} ×</button>
          ))}
        </div>
      )}
      <textarea
        value={draft}
        placeholder={
          activeThread?.incognito ? "Incognito message"
            : activeThread?.mode === "cowork" ? "Hand off a task, or type /"
            : activeThread?.mode === "code" ? "Describe a change, @ a file, or type /"
            : "How can I help you today?"
        }
        rows={3}
        onChange={(event) => { setDraft(event.target.value); setCaret(event.target.selectionStart); setPicked(0); }}
        onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
        onKeyDown={(event) => {
          if (slashOpen && menu && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setPicked((current) => {
              const count = menu.matches.length;
              return event.key === "ArrowDown" ? (current + 1) % count : (current - 1 + count) % count;
            });
            return;
          }
          if (mentionOpen && event.key === "Tab") {
            event.preventDefault();
            insertMention(mentionHits[0]);
            return;
          }
          if (state.settings.enterToSend && event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (slashOpen && menu) {
              runSlash(menu.matches[picked] || menu.matches[0], menu.rest);
              return;
            }
            submit();
          }
        }}
      />
      {voiceNote && <p className="muted tiny pad" data-voice-note>{voiceNote}</p>}
      <div className="composer-bar">
        <button className="ghost" onClick={attach}>Attach</button>
        {state.settings.voiceOn && (
          <button
            className={listeningNow ? "ghost on" : "ghost"}
            aria-pressed={listeningNow}
            title="Hold to talk, click to toggle (⇧⌘D)"
            onPointerDown={micDown}
            onPointerUp={micUp}
            onClick={micClick}
          >
            {listeningNow ? "Listening…" : "Voice"}
          </button>
        )}
        <select className="quiet" aria-label="Model" value={model} onChange={(e) => activeThread && dispatch({ type: "patch-thread", id: activeThread.id, patch: { model: e.target.value } })}>
          {providerModels(state.settings).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="quiet" aria-label="Effort" value={effort} onChange={(e) => activeThread && dispatch({ type: "patch-thread", id: activeThread.id, patch: { effort: e.target.value as Effort } })}>
          {EFFORTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <span className="spacer" />
        {busy ? (
          <button className="send icon" onClick={onStop} aria-label="Stop" title="Stop after this step (Esc)">■</button>
        ) : (
          <button className="send icon" onClick={submit} aria-label="Send">↑</button>
        )}
      </div>
      <div className="key-hints" aria-hidden="true">
        {state.settings.enterToSend !== false && <span className="key-hint"><kbd className="kbd">Enter</kbd> send</span>}
        <span className="key-hint"><kbd className="kbd">⇧Enter</kbd> newline</span>
        <span className="key-hint"><kbd className="kbd">Esc</kbd> stop a running turn</span>
      </div>
    </div>
  );
}

function mentionQuery(value: string, caret: number): { start: number; token: string } | null {
  const upto = value.slice(0, caret);
  const match = /(^|\s)@([^\s@]*)$/.exec(upto);
  if (!match) return null;
  return { start: caret - match[2].length - 1, token: match[2] };
}

interface Recognition {
  start: () => void;
  stop: () => void;
  continuous?: boolean;
  interimResults?: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

let dictation: { stop: () => void } | null = null;

/**
 * Push-to-talk dictation. Starts the recognizer and appends every final
 * phrase to the draft; a second call stops it. The global ⇧⌘D shortcut and a
 * held mic button both land here.
 */
function startDictation(opts: {
  initial: string;
  onState: (listening: boolean, note?: string) => void;
  onText: (draft: string) => void;
}): void {
  if (dictation) {
    dictation.stop();
    return;
  }
  const host = window as unknown as { webkitSpeechRecognition?: new () => Recognition };
  if (!host.webkitSpeechRecognition) {
    opts.onState(false, "Voice input is unavailable in this window. Modbitx can still read a reply aloud from a task.");
    return;
  }
  const recog = new host.webkitSpeechRecognition();
  recog.continuous = true;
  recog.interimResults = false;
  dictation = { stop: () => { try { recog.stop(); } catch { /* already stopped */ } } };
  opts.onState(true);
  const base = opts.initial;
  let heard = "";
  let consumed = 0;
  recog.onresult = (event) => {
    for (let index = consumed; index < event.results.length; index += 1) {
      heard += event.results[index][0].transcript;
    }
    consumed = event.results.length;
    const merged = `${base}${base && heard ? " " : ""}${heard}`.replace(/\s+/g, " ").trimStart();
    opts.onText(merged.slice(0, 20_000));
  };
  recog.onerror = (event) => {
    dictation = null;
    opts.onState(false, event?.error === "not-allowed" ? "This Mac did not allow the microphone. Grant it in System Settings, then try again." : "");
  };
  recog.onend = () => {
    dictation = null;
    opts.onState(false);
  };
  recog.start();
}
