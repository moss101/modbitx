/**
 * The visualization widget runtime, modeled on the Codex visualize contract:
 * small Shadow-DOM elements the model can drop into an HTML artifact —
 * `<viz-calendar>`, `<viz-bars>`, `<viz-stat>` — with a shared `.widget`
 * surface, environment palette, and no network. Injected into artifact
 * previews only; fragments stay under the artifact size caps.
 */

export function vizRuntime(): string {
  return `<script data-modbitx-viz>(function () {
  if (window.__modbitxViz) return;
  window.__modbitxViz = true;
  var palette = getComputedStyle(document.documentElement);
  var ink = palette.getPropertyValue("--ink").trim() || "#20201f";
  var paper = palette.getPropertyValue("--paper").trim() || "#fcfcfb";
  var accent = palette.getPropertyValue("--accent").trim() || "#c6613f";
  var line = "color-mix(in srgb, " + ink + " 12%, transparent)";

  function widgetStyle() {
    return ":host { all: initial; display: block; contain: content; }" +
      ".widget { background: " + paper + "; color: " + ink + "; border: 0.5px solid " + line + ";" +
      " border-radius: 12px; padding: 12px; font: 13px/1.45 'Figtree','Avenir Next',sans-serif; }" +
      ".widget h4 { margin: 0 0 10px; font-size: 12px; font-weight: 580; letter-spacing: 0.04em;" +
      " text-transform: uppercase; opacity: 0.7; }";
  }
  function sheet(extra) {
    var style = document.createElement("style");
    style.textContent = widgetStyle() + (extra || "");
    return style;
  }
  function parseEvents(raw) {
    try { return JSON.parse(raw || "[]") || []; } catch { return []; }
  }

  customElements.define("viz-stat", class extends HTMLElement {
    connectedCallback() {
      var root = this.attachShadow({ mode: "open" });
      var box = document.createElement("div");
      box.className = "widget";
      box.innerHTML = "<div style=\\"font-size:26px;font-weight:580;letter-spacing:-0.01em\\">" +
        String(this.getAttribute("value") || "—").replace(/[<>&]/g, function (c) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]; }) +
        "</div><div style=\\"font-size:12px;opacity:0.65\\">" +
        String(this.getAttribute("label") || "").replace(/[<>&]/g, function (c) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]; }) + "</div>";
      root.appendChild(sheet(""));
      root.appendChild(box);
    }
  });

  customElements.define("viz-bars", class extends HTMLElement {
    connectedCallback() {
      var root = this.attachShadow({ mode: "open" });
      var rows = parseEvents(this.getAttribute("data"));
      var max = rows.reduce(function (m, row) { return Math.max(m, Number(row.value) || 0); }, 0) || 1;
      var style = sheet(
        ".row { display: grid; grid-template-columns: 9em 1fr 4em; gap: 8px; align-items: center; margin: 6px 0; }" +
        ".track { height: 10px; border-radius: 99px; background: color-mix(in srgb, " + ink + " 7%, transparent); overflow: hidden; }" +
        ".fill { height: 100%; border-radius: 99px; background: " + accent + "; transition: width 450ms cubic-bezier(0.165,0.84,0.44,1); }" +
        ".num { text-align: right; font-variant-numeric: tabular-nums; opacity: 0.75; font-size: 12px; }"
      );
      var box = document.createElement("div");
      box.className = "widget";
      var title = this.getAttribute("label");
      if (title) {
        var head = document.createElement("h4");
        head.textContent = title;
        box.appendChild(head);
      }
      rows.slice(0, 14).forEach(function (row) {
        var value = Number(row.value) || 0;
        var line2 = document.createElement("div");
        line2.className = "row";
        var name = document.createElement("span");
        name.textContent = String(row.name != null ? row.name : "");
        var track = document.createElement("div");
        track.className = "track";
        var fill = document.createElement("div");
        fill.className = "fill";
        fill.style.width = "0%";
        track.appendChild(fill);
        var num = document.createElement("span");
        num.className = "num";
        num.textContent = String(Math.round(value * 100) / 100);
        line2.appendChild(name);
        line2.appendChild(track);
        line2.appendChild(num);
        box.appendChild(line2);
        requestAnimationFrame(function () { fill.style.width = Math.max(2, Math.round((value / max) * 100)) + "%"; });
      });
      if (!rows.length) {
        var hint = document.createElement("p");
        hint.style.cssText = "opacity:0.6;margin:0";
        hint.textContent = 'viz-bars needs data like [{"name":"A","value":3}]';
        box.appendChild(hint);
      }
      root.appendChild(style);
      root.appendChild(box);
    }
  });

  customElements.define("viz-calendar", class extends HTMLElement {
    connectedCallback() {
      var host = this;
      var root = host.attachShadow({ mode: "open" });
      var events = parseEvents(host.getAttribute("events"));
      var date = host.getAttribute("date") || new Date().toISOString().slice(0, 10);
      var startHour = Math.max(0, Math.min(12, Number(host.getAttribute("start")) || 8));
      var endHour = Math.max(startHour + 1, Math.min(23, Number(host.getAttribute("end")) || 19));
      var tones = { green: "#629987", blue: "#0485ff", orange: accent, gray: "#898781" };
      var style = sheet(
        ".grid { position: relative; margin-top: 4px; }" +
        ".hour { display: grid; grid-template-columns: 3.2em 1fr; border-top: 0.5px solid " + line + "; height: 34px; }" +
        ".hour span { font-size: 10px; opacity: 0.55; padding-top: 2px; text-align: right; padding-right: 6px; }" +
        ".lane { position: relative; }" +
        ".ev { position: absolute; left: 2px; right: 2px; border-radius: 6px; padding: 3px 7px; font-size: 12px;" +
        " background: color-mix(in srgb, var(--tone, " + accent + ") 16%, " + paper + ");" +
        " border: 0.5px solid color-mix(in srgb, var(--tone, " + accent + ") 45%, transparent); overflow: hidden; cursor: default; }"
      );
      var box = document.createElement("div");
      box.className = "widget";
      var head = document.createElement("h4");
      head.textContent = new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
      box.appendChild(head);
      var grid = document.createElement("div");
      grid.className = "grid";
      var span = endHour - startHour;
      for (var hour = startHour; hour <= endHour; hour++) {
        var row = document.createElement("div");
        row.className = "hour";
        var label = document.createElement("span");
        label.textContent = (hour % 12 || 12) + (hour < 12 ? "a" : "p");
        var lane = document.createElement("div");
        lane.className = "lane";
        row.appendChild(label);
        row.appendChild(lane);
        grid.appendChild(row);
      }
      events.slice(0, 24).forEach(function (event) {
        var toMin = function (text) {
          var parts = String(text || "0:00").split(":");
          return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
        };
        var from = Math.max(startHour * 60, toMin(event.start));
        var to = Math.min(endHour * 60, toMin(event.end || event.start));
        if (to <= from) to = from + 30;
        var node = document.createElement("div");
        node.className = "ev";
        node.style.setProperty("--tone", tones[event.tone] || accent);
        node.style.top = ((from - startHour * 60) / (span * 60)) * 100 + "%";
        node.style.height = Math.max(16, ((to - from) / (span * 60)) * 100) + "%";
        node.textContent = String(event.title || "Event") + (event.detail ? " · " + event.detail : "");
        node.title = node.textContent + " (" + event.start + (event.end ? "–" + event.end : "") + ")";
        grid.appendChild(node);
      });
      box.appendChild(grid);
      root.appendChild(style);
      root.appendChild(box);
    }
  });
})();</script>`;
}
