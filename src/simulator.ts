export interface SimPoint {
  x: number;
  y: number;
}

export interface SimWindow {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SimShot {
  w: number;
  h: number;
}

/** Map screenshot pixels onto the Simulator window, under a 28px title bar, letterboxed. */
export function mapSimPoint(shot: SimShot, win: SimWindow, x: number, y: number): SimPoint {
  const title = 28;
  const availW = Math.max(1, win.w);
  const availH = Math.max(1, win.h - title);
  const scale = Math.min(availW / Math.max(1, shot.w), availH / Math.max(1, shot.h));
  const drawnW = shot.w * scale;
  const drawnH = shot.h * scale;
  const left = win.x + (availW - drawnW) / 2;
  const top = win.y + title + (availH - drawnH) / 2;
  const px = Math.round(left + (Number(x) / Math.max(1, shot.w)) * drawnW);
  const py = Math.round(top + (Number(y) / Math.max(1, shot.h)) * drawnH);
  return {
    x: Math.min(win.x + win.w - 2, Math.max(win.x + 1, px)),
    y: Math.min(win.y + win.h - 2, Math.max(win.y + title, py))
  };
}

export interface SimCall {
  tool: string;
  target?: string;
  text?: string;
  url?: string;
  path?: string;
  name?: string;
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
}

export interface SimView {
  name: string;
  image?: string;
  note: string;
  udid?: string;
}

function bridge() {
  const api = window.modbitx;
  if (!api?.simulator) return null;
  return api;
}

function devicePath(folder: string | undefined, input: string): string {
  if (!input) throw new Error("Name a .app or .apk.");
  if (input.startsWith("/")) return input;
  if (!folder) throw new Error("Grant a folder or pass an absolute .app or .apk path.");
  return `${folder.replace(/\/$/, "")}/${input}`;
}

export async function runSimulator(
  call: SimCall,
  env: { folder?: string; allow: () => Promise<void>; onView: (view: SimView) => void }
): Promise<{ ok: boolean; output: string; image?: string }> {
  const api = bridge();
  if (!api) return { ok: false, output: "Desktop bridge is unavailable." };
  const target = call.target || "booted";
  if (call.tool !== "sim_list") await env.allow();
  if (call.tool === "sim_list") {
    const listed = await window.modbitx!.simulators();
    if (!listed.ok) return { ok: false, output: listed.error || "No simulators." };
    const lines = listed.devices.map((device) => `${device.runtime?.includes("android") || device.udid.startsWith("avd:") || device.udid.startsWith("emulator-") ? "android" : "ios"}\t${device.state}\t${device.name}\t${device.udid}`);
    return { ok: true, output: lines.join("\n") || "No simulators found. Install Xcode, or set ANDROID_HOME." };
  }
  const action = call.tool.replace(/^sim_/, "");
  const result = await api.simulator({
    action,
    target,
    text: call.tool === "sim_button" ? (call.text || "home").toLowerCase() : call.text,
    url: call.url,
    path: call.tool === "sim_install" ? devicePath(env.folder, call.path || "") : call.path,
    bundle: call.name || (call.tool === "sim_launch" ? call.text : undefined),
    x: call.x,
    y: call.y,
    x2: call.x2,
    y2: call.y2
  });
  if (result.dataUrl) {
    env.onView({ name: result.udid || target, image: result.dataUrl, note: `${action} ${result.width || ""}×${result.height || ""}`.trim(), udid: result.udid || target });
  }
  return {
    ok: Boolean(result.ok),
    output: result.detail || result.error || (result.ok ? action : "Simulator action failed."),
    image: result.dataUrl
  };
}
