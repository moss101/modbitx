import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { permissionLabel } from "../agent";
import { branchName } from "../branch";
import { githubRepo, parsePulls, type PullRequestRow } from "../local-jobs";
import { statusLabel, type SessionLabel } from "../session-status";
import type { PermissionMode } from "../types";

export function CodeDock({
  folder, permission, sshTarget, revision, branchPrefix, allowBypass, worktreeLocation, githubToken, sessionStatus, onPermission, onSsh, onFeedback
}: {
  folder?: string;
  permission: PermissionMode;
  sshTarget: string;
  revision?: number;
  branchPrefix?: string;
  allowBypass?: boolean;
  worktreeLocation?: string;
  githubToken?: string;
  sessionStatus?: SessionLabel;
  onPermission: (mode: PermissionMode) => void;
  onSsh: (target: string) => void;
  /** Review comment on the diff, handed to the composer for the next turn. */
  onFeedback?: (comment: string) => void;
}) {
  const [log, setLog] = useState("Terminal is idle.");
  const [patch, setPatch] = useState("");
  const [termId, setTermId] = useState<string | null>(null);
  const [cmd, setCmd] = useState("");
  const termHost = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const [comment, setComment] = useState("");
  const [snaps, setSnaps] = useState<{ id: string; rel?: string }[]>([]);
  const [branch, setBranch] = useState("");
  const [pulls, setPulls] = useState<PullRequestRow[]>([]);
  const [prNote, setPrNote] = useState("");
  const seenPulls = useRef<string | null>(null);
  const modes: PermissionMode[] = allowBypass === false ? ["ask", "accept-edits", "plan", "auto"] : ["ask", "accept-edits", "plan", "auto", "bypass"];
  const shown = modes.includes(permission) ? permission : "ask";

  useEffect(() => {
    const off = window.modbitx?.onTerm((payload) => {
      if (payload.id && termId && payload.id !== termId) {
        setLog((current) => (current + payload.data).slice(-8000));
        return;
      }
      termRef.current?.write(payload.data);
      setLog((current) => (current + payload.data).slice(-8000));
    });
    void window.modbitx?.rewindList().then(setSnaps);
    return () => off?.();
  }, [termId]);

  // A real TTY renders in xterm; keystrokes go back through term:write.
  useEffect(() => {
    if (!termId || !termHost.current) return;
    const term = new Terminal({
      fontSize: 12,
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      cursorBlink: true,
      theme: { background: "#211f1c", foreground: "#f4f0e7", cursor: "#f4f0e7", selectionBackground: "#89878155" }
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(termHost.current);
    try { fit.fit(); } catch { /* hidden containers cannot fit */ }
    term.onData((data) => void window.modbitx?.termWrite(termId, data));
    termRef.current = term;
    return () => {
      termRef.current = null;
      term.dispose();
    };
  }, [termId]);

  useEffect(() => {
    if (!folder) return;
    void window.modbitx?.git(folder, "diff").then((result) => {
      setPatch(`${result.stdout}${result.stderr}`.trim());
    });
  }, [folder, revision]);

  useEffect(() => {
    if (!folder) return;
    let cancel = false;
    seenPulls.current = null;
    const poll = async () => {
      if (!githubToken) {
        if (!cancel) { setPulls([]); setPrNote("Add a GitHub token in Settings → Connectors to list pull requests."); }
        return;
      }
      const remote = await window.modbitx?.git(folder, "remote");
      const repo = githubRepo(`${remote?.stdout || ""}`.trim());
      if (!repo) {
        if (!cancel) { setPulls([]); setPrNote("This folder has no GitHub remote."); }
        return;
      }
      const listed = await window.modbitx?.github(githubToken, `/repos/${repo}/pulls?state=open&per_page=10`);
      if (cancel) return;
      if (!listed?.ok) {
        setPrNote((listed?.body || "GitHub did not return pull requests.").slice(0, 180));
        return;
      }
      const rows = parsePulls(listed.body || "");
      const signature = rows.map((row) => `${row.number}:${row.state}:${row.draft}:${row.title}`).join("|");
      if (seenPulls.current !== null && seenPulls.current !== signature) {
        void window.modbitx?.notify("Pull requests", "Open pull requests changed.");
      }
      seenPulls.current = signature;
      setPulls(rows);
      setPrNote(rows.length ? "" : "No open pull requests.");
    };
    void poll();
    const id = window.setInterval(() => void poll(), 120_000);
    return () => { cancel = true; window.clearInterval(id); };
  }, [folder, githubToken]);

  async function git(action: string) {
    if (!folder || !window.modbitx) return;
    const result = await window.modbitx.git(folder, action, action === "commit" ? "Modbitx checkpoint" : undefined);
    setLog(`${result.stdout}${result.stderr}`);
  }

  return (
    <section className="code-dock">
      <div className="workspace-bar">
        {sessionStatus && <span className="pill">{statusLabel(sessionStatus)}</span>}
        <div className="dock-group">
          <span className="dock-caption">Permissions</span>
          <div className="dock-controls">
            <select aria-label="Permission mode" value={shown} onChange={(e) => onPermission(e.target.value as PermissionMode)}>
              {modes.map((mode) => <option key={mode} value={mode}>{permissionLabel(mode)}</option>)}
            </select>
          </div>
        </div>
        <div className="dock-group">
          <span className="dock-caption">Git</span>
          <div className="dock-controls">
            <button className="ghost" onClick={() => void git("status")}>Status</button>
            <button className="ghost" onClick={() => void git("diff")}>Diff</button>
            <button className="ghost" onClick={() => void git("log")}>Log</button>
            <button className="ghost" onClick={() => void git("commit")}>Commit</button>
            <input aria-label="Branch name" value={branch} placeholder={branchPrefix ? `${branchPrefix}name` : "branch name"} onChange={(e) => setBranch(e.target.value)} />
            <button className="ghost" onClick={async () => {
              if (!folder) return;
              const name = branchName(branchPrefix || "", branch);
              if (!name) { setLog("Name a branch with letters, numbers, dots, or dashes."); return; }
              const result = await window.modbitx?.git(folder, "branch", name);
              setLog(`${name}\n${result?.stdout || ""}${result?.stderr || ""}`.trim());
              setBranch("");
            }}>Branch</button>
            <button className="ghost" onClick={async () => {
              if (!folder) { setLog("Open a repository first."); return; }
              if (!worktreeLocation) { setLog("Choose a worktree folder in Settings → Code."); return; }
              const name = branchName(branchPrefix || "", branch || "work");
              if (!name) { setLog("Name a branch with letters, numbers, dots, or dashes."); return; }
              const result = await window.modbitx?.git(folder, "worktree", name, worktreeLocation);
              setLog(`${result?.stdout || ""}${result?.stderr || ""}`.trim());
            }}>Worktree</button>
            <button className="ghost" onClick={async () => {
              const latest = (await window.modbitx?.rewindList())?.[0];
              if (!latest) { setLog("Nothing to rewind."); return; }
              const file = await window.modbitx?.rewindRestore(latest.id);
              setLog(`Restored ${file}`);
              setSnaps(await window.modbitx?.rewindList() || []);
            }}>Rewind</button>
            {snaps.length > 0 && <span className="dock-note">{snaps.length} snapshots</span>}
          </div>
        </div>
        <div className="dock-group">
          <span className="dock-caption">Remote</span>
          <div className="dock-controls">
            <input aria-label="SSH target" value={sshTarget} placeholder="user@host" onChange={(e) => onSsh(e.target.value)} />
            <button className="ghost" onClick={async () => {
              if (!sshTarget) return;
              const result = await window.modbitx?.ssh(sshTarget, "uname -a");
              setLog(`${result?.stdout || ""}${result?.stderr || ""}`);
            }}>SSH</button>
          </div>
        </div>
        <div className="dock-group">
          <span className="dock-caption">Terminal</span>
          <div className="dock-controls">
            <button className="ghost" onClick={async () => {
              const id = await window.modbitx?.termStart(folder);
              if (id) { setTermId(id); setLog(""); }
            }}>{termId ? "Terminal on" : "Start terminal"}</button>
            {termId && (
              <>
                <form className="dock-shell" onSubmit={(e) => { e.preventDefault(); void window.modbitx?.termWrite(termId, `${cmd}\n`); setCmd(""); }}>
                  <input aria-label="Shell command" value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="Shell command" />
                </form>
                <button className="ghost" onClick={() => {
                  void window.modbitx?.termKill(termId);
                  setTermId(null);
                }}>Close</button>
              </>
            )}
          </div>
        </div>
      </div>
      {prNote && <p className="muted tiny pad">{prNote}</p>}
      {pulls.length > 0 && (
        <ul className="muted tiny pad">
          {pulls.map((pull) => <li key={pull.number}>#{pull.number} {pull.title} · {pull.state}{pull.draft ? " · draft" : ""}</li>)}
        </ul>
      )}
      {patch && (
        <div className="dock-panel">
          <span className="dock-caption">Working tree diff</span>
          <form className="dock-controls" onSubmit={(event) => {
            event.preventDefault();
            const text = comment.trim();
            if (!text || !onFeedback) return;
            onFeedback(text);
            setComment("");
          }}>
            <input
              aria-label="Comment on these changes"
              value={comment}
              placeholder={onFeedback ? "Comment on these changes for the next prompt" : "Comment on these changes"}
              onChange={(event) => setComment(event.target.value)}
            />
            <button className="ghost" type="submit" disabled={!comment.trim() || !onFeedback}>Send to chat</button>
          </form>
          <pre className="diff">{patch.split("\n").map((line, index) => (
            <div key={index} className={line.startsWith("+") && !line.startsWith("+++") ? "add" : line.startsWith("-") && !line.startsWith("---") ? "del" : ""}>{line || " "}</div>
          ))}</pre>
        </div>
      )}
      <div className="dock-panel">
        <span className="dock-caption">{termId ? "Terminal" : "Output"}</span>
        {termId && <div className="term-host" ref={termHost} aria-label="Terminal" />}
        <pre className="term-log" aria-label="Terminal scrollback">{log}</pre>
      </div>
    </section>
  );
}
