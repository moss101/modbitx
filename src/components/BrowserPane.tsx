import { useEffect } from "react";

export function BrowserPane({ url, busy, note, log, onClose }: { url: string; busy: boolean; note?: string; log?: string[]; onClose: () => void }) {
  useEffect(() => {
    const host = document.getElementById("modbitx-browser");
    if (!host || !window.modbitx) return;
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
  }, [url]);

  let host = url;
  try { host = new URL(url).hostname; } catch { /* keep raw */ }

  return (
    <aside className="browser-pane">
      <header>
        <div>
          <strong>Browser</strong>
          <div className="muted tiny">{note || (busy ? "Modbitx is using the built-in browser" : host)}</div>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={() => void window.modbitx?.browserNav("back")}>Back</button>
          <button className="ghost" onClick={() => void window.modbitx?.browserNav("reload")}>Reload</button>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>
      </header>
      {log && log.length > 0 && <ol className="browser-log">{log.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ol>}
      <div id="modbitx-browser" className="browser-host" />
    </aside>
  );
}
