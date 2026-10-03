import { useEffect, useState } from "react";
import type { Mode } from "../types";

export function Workspace({ mode, folder, onFolder }: { mode: Mode; folder?: string; onFolder: () => void }) {
  const [entries, setEntries] = useState<{ name: string; kind: string }[]>([]);
  const [url, setUrl] = useState("https://example.com");
  const [page, setPage] = useState("");
  const [shot, setShot] = useState("");
  const [log, setLog] = useState("Grant a folder, then send a task. Prefix a shell line with “run ”. Paste a URL to open the built-in browser.");
  const [showBrowser, setShowBrowser] = useState(mode === "cowork");
  const [showFiles, setShowFiles] = useState(mode === "code");

  useEffect(() => {
    if (!folder || !window.modbitx) { setEntries([]); return; }
    void window.modbitx.listDir(folder).then(setEntries);
  }, [folder]);

  useEffect(() => {
    const host = document.getElementById("modbitx-browser");
    if (!showBrowser || !host || !window.modbitx) {
      void window.modbitx?.browserHide();
      return;
    }
    const sync = () => {
      const rect = host.getBoundingClientRect();
      void window.modbitx?.browserBounds({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(host);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      void window.modbitx?.browserHide();
    };
  }, [showBrowser]);

  async function open(next?: string) {
    const target = next || url;
    setUrl(target);
    setShowBrowser(true);
    setLog(`Opening ${target}`);
    const loaded = await window.modbitx?.browserLoad(target);
    setLog(loaded || "Browser failed to load.");
  }

  return (
    <section className="workspace">
      <div className="workspace-bar">
        <button className="ghost" onClick={onFolder}>{folder ? folder : "Choose folder"}</button>
        <button className={showFiles ? "ghost on" : "ghost"} onClick={() => setShowFiles((v) => !v)}>Files</button>
        <button className={showBrowser ? "ghost on" : "ghost"} onClick={() => setShowBrowser((v) => !v)}>Browser</button>
        <button className="ghost" onClick={async () => {
          try {
            await window.modbitx?.armComputer(true);
            const image = await window.modbitx?.screenshot();
            if (image) { setShot(image.dataUrl); setLog(`Screenshot ${image.width}×${image.height}`); }
          } catch (error) {
            setLog(error instanceof Error ? error.message : "Screenshot failed");
          }
        }}>Screenshot</button>
        <form className="browser-form" onSubmit={(e) => { e.preventDefault(); void open(); }}>
          <button type="button" className="ghost" onClick={() => void window.modbitx?.browserNav("back")}>Back</button>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Open a URL in the built-in browser" />
          <button className="send" type="submit">Go</button>
          <button type="button" className="ghost" onClick={async () => {
            const text = await window.modbitx?.browserText();
            setPage(text ? `${text.title}\n${text.url}\n\n${text.text.slice(0, 2500)}` : "");
          }}>Read page</button>
        </form>
      </div>
      <div className="workspace-body">
        {showFiles && (
          <div className="filetree">
            <div className="section-label">{mode === "code" ? "Repository" : "Folder"}</div>
            {entries.map((entry) => <div key={entry.name} className="file-row">{entry.kind === "dir" ? "▸" : "·"} {entry.name}</div>)}
            {folder && entries.length === 0 && <div className="muted pad">Empty folder</div>}
          </div>
        )}
        {showBrowser && <div id="modbitx-browser" className="browser-host" />}
        <div className="term">
          <div className="section-label">Session</div>
          <pre>{log}{page ? `\n\n${page}` : ""}</pre>
          {shot && <img src={shot} alt="Screen capture" />}
        </div>
      </div>
    </section>
  );
}
