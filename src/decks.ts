import type { DesignSystem } from "./design";

/**
 * Slides and Mermaid artifact previews. Both render fully locally: the deck is
 * plain HTML with its own slide state, and the diagram renderer is the bundled
 * mermaid library injected by URL — no CDN, no network.
 */

export interface Slide {
  title: string;
  body: string[];
}

/** Splits a `## `-headed markdown deck into slides, matching the pptx writer. */
export function parseSlides(markdown: string): Slide[] {
  const raw = String(markdown || "").replace(/\r/g, "");
  const chunks = raw.split(/\n(?=##\s)/).map((chunk) => chunk.trim()).filter(Boolean);
  const slides: Slide[] = [];
  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    let title = "";
    const body: string[] = [];
    for (const line of lines) {
      const heading = /^#{1,3}\s+(.*)$/.exec(line);
      if (heading && !title) {
        title = heading[1].trim();
        continue;
      }
      if (line.trim()) body.push(line.trim());
    }
    if (title || body.length) slides.push({ title: title || `Slide ${slides.length + 1}`, body: body.slice(0, 8) });
  }
  return slides.slice(0, 40);
}

function deckStyle(design: DesignSystem): string {
  const ink = /^#[0-9a-fA-F]{6}$/.test(design.ink) ? design.ink : "#20201f";
  const paper = /^#[0-9a-fA-F]{6}$/.test(design.paper) ? design.paper : "#fcfcfb";
  const accent = /^#[0-9a-fA-F]{6}$/.test(design.accent) ? design.accent : "#c6613f";
  return `<style>
    :root { --ink:${ink}; --paper:${paper}; --accent:${accent}; }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: var(--paper); color: var(--ink);
      font-family: "Figtree", "Avenir Next", sans-serif; overflow: hidden; }
    .deck { display: flex; flex-direction: column; height: 100%; }
    .slide { flex: 1; display: none; flex-direction: column; gap: 14px; justify-content: center;
      padding: 48px 56px; }
    .slide.on { display: flex; }
    .slide h2 { font-size: 34px; line-height: 1.2; margin: 0; font-weight: 580; letter-spacing: -0.01em; }
    .slide h2::after { content: ""; display: block; width: 44px; height: 3px; background: var(--accent);
      border-radius: 2px; margin-top: 14px; }
    .slide li { font-size: 19px; line-height: 1.5; margin: 0 0 8px; }
    .slide ul { margin: 0; padding-left: 22px; }
    .bar { display: flex; align-items: center; gap: 10px; padding: 10px 16px;
      border-top: 1px solid color-mix(in srgb, var(--ink) 10%, transparent); }
    .bar button { border: 1px solid color-mix(in srgb, var(--ink) 18%, transparent); background: transparent;
      color: var(--ink); border-radius: 8px; padding: 6px 14px; font: inherit; font-size: 13px; cursor: pointer; }
    .bar .count { color: color-mix(in srgb, var(--ink) 55%, transparent); font-size: 12px; }
    .bar .spacer { flex: 1; }
  </style>`;
}

/** A self-contained slide deck: keyboard arrows, click buttons, progress count. */
export function slidesPreviewDocument(markdown: string, design: DesignSystem): string {
  const slides = parseSlides(markdown);
  const markup = (slides.length ? slides : [{ title: "Empty deck", body: ["Add `## Slide` headings to the artifact."] }])
    .map((slide) => `<section class="slide"><h2>${escapeHtml(slide.title)}</h2><ul>${
      slide.body.map((line) => `<li>${escapeHtml(line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""))}</li>`).join("")
    }</ul></section>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8">${deckStyle(design)}</head>
  <body><div class="deck">${markup}
    <div class="bar">
      <button data-dir="-1" onclick="move(-1)">‹ Prev</button>
      <button data-dir="1" onclick="move(1)">Next ›</button>
      <span class="spacer"></span>
      <span class="count" id="count"></span>
    </div>
  </div>
  <script>
    var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
    var at = 0;
    function show() {
      slides.forEach(function (s, i) { s.className = i === at ? "slide on" : "slide"; });
      document.getElementById("count").textContent = (at + 1) + " / " + slides.length;
    }
    function move(dir) {
      at = Math.max(0, Math.min(slides.length - 1, at + dir));
      show();
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); move(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
    });
    show();
  </script></body></html>`;
}

function escapeHtml(value: string): string {
  return String(value).replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[ch] as string));
}

/** A mermaid preview document; the renderer script arrives by URL, never from the network. */
export function mermaidPreviewDocument(source: string, mermaidUrl: string, design: DesignSystem): string {
  const ink = /^#[0-9a-fA-F]{6}$/.test(design.ink) ? design.ink : "#20201f";
  const paper = /^#[0-9a-fA-F]{6}$/.test(design.paper) ? design.paper : "#fcfcfb";
  const accent = /^#[0-9a-fA-F]{6}$/.test(design.accent) ? design.accent : "#c6613f";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; min-height: 100%; background: ${paper}; color: ${ink};
      font-family: "Figtree", "Avenir Next", sans-serif; }
    #diagram { display: flex; justify-content: center; padding: 24px; }
    #diagram svg { max-width: 100%; height: auto; }
    .error { color: #8d3b28; padding: 16px; white-space: pre-wrap; font-size: 13px; }
  </style></head>
  <body><div id="diagram"><pre class="error" hidden></pre></div>
  <script type="module">
    import mermaid from ${JSON.stringify(mermaidUrl)};
    var source = ${JSON.stringify(String(source || ""))};
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      themeVariables: { primaryColor: "${accent}22", primaryTextColor: "${ink}", primaryBorderColor: "${accent}", lineColor: "${ink}88", background: "${paper}", fontFamily: "Figtree, sans-serif" }
    });
    try {
      var render = await mermaid.render("m" + String(Date.now()), source);
      document.getElementById("diagram").innerHTML = render.svg;
    } catch (error) {
      var note = document.querySelector(".error");
      note.hidden = false;
      note.textContent = "This diagram could not be rendered.\\n" + String(error && error.message || error).slice(0, 400);
    }
  </script></body></html>`;
}

/** True when the language tag names a previewable deck or diagram. */
export function isDeckLanguage(language: string): language is "slides" | "mermaid" {
  return language === "slides" || language === "mermaid";
}
