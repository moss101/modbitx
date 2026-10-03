import { useEffect, useRef, useState } from "react";

/**
 * The simulator pane. Live view polls a fresh screenshot about once a second
 * through the same sim bridge the tools use, so the pane tracks the device
 * without a video stream.
 */
export function SimulatorPane({ name, note, image, udid, onClose }: {
  name: string;
  note: string;
  image?: string;
  udid?: string;
  onClose: () => void;
}) {
  const [live, setLive] = useState(false);
  const [frame, setFrame] = useState<string | undefined>(image);
  const liveRef = useRef(false);
  useEffect(() => { setFrame(image); }, [image]);

  useEffect(() => {
    liveRef.current = live;
    if (!live || !udid) return;
    let cancelled = false;
    let timer = 0;
    const tick = async () => {
      if (!liveRef.current || cancelled) return;
      try {
        const shot = await window.modbitx?.simulator({ action: "shot", target: udid });
        if (shot?.ok && shot.dataUrl && !cancelled) setFrame(shot.dataUrl);
      } catch { /* device asleep or bridge gone; the next tick retries */ }
      if (!cancelled) timer = window.setTimeout(tick, 1000);
    };
    timer = window.setTimeout(tick, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [live, udid]);

  return (
    <aside className="sim-pane">
      <header>
        <div>
          <strong>Simulator</strong>
          <div className="muted tiny">{note || "Modbitx is using this simulator"}</div>
        </div>
        <div className="top-actions">
          {udid && (
            <button
              className={live ? "ghost on" : "ghost"}
              aria-pressed={live}
              title="Refresh the screenshot about once a second"
              onClick={() => setLive((on) => !on)}
            >
              {live ? "Live" : "Live view"}
            </button>
          )}
          <button className="ghost" onClick={onClose}>Close</button>
        </div>
      </header>
      <p className="muted tiny pad">{name}</p>
      {live && <div className="stream-indicator pad" style={{ marginTop: -6 }}><span className="stream-dot" aria-hidden />Live · about one frame a second</div>}
      {frame ? <img src={frame} alt="Simulator screenshot" /> : <p className="muted pad">The next screenshot will show the device.</p>}
    </aside>
  );
}
