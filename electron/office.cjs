function escapeXml(value) {
  return String(value).replace(/[<>&]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[ch]));
}

function decodeXml(value) {
  return String(value).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function sharedStrings(xml) {
  return [...String(xml || "").matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1]));
}

function cellsFromSheet(xml, shared = []) {
  const rows = [];
  const rowRe = /<row\b[\s\S]*?<\/row>/g;
  let row;
  while ((row = rowRe.exec(String(xml || "")))) {
    const cells = [];
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cell;
    while ((cell = cellRe.exec(row[0]))) {
      const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(cell[2]);
      if (inline) {
        cells.push(decodeXml(inline[1]));
        continue;
      }
      const value = /<v>([\s\S]*?)<\/v>/.exec(cell[2]);
      if (!value) continue;
      const index = Number(value[1]);
      cells.push(/t="s"/.test(cell[1]) && shared[index] != null ? shared[index] : value[1]);
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function rowsFromText(payload) {
  return String(payload || "").split("\n").filter((line) => line.length > 0).map((line) => line.split(",").slice(0, 26));
}

function spreadsheetXml(rows) {
  const sheet = rows.map((row, i) => `<row r="${i + 1}">${row.map((cell, j) => `<c r="${String.fromCharCode(65 + j)}${i + 1}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`).join("")}</row>`).join("");
  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`
  };
}

function slideText(xml) {
  return [...String(xml || "").matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((match) => decodeXml(match[1]));
}

function presentationXml(slides) {
  const bodies = (slides.length ? slides : ["Slide"]).map((slide) => String(slide).trim()).filter(Boolean);
  const files = {};
  bodies.forEach((slide, index) => {
    const lines = slide.split("\n").slice(0, 8);
    const body = lines.map((line, i) => `<a:p><a:r><a:rPr lang="en-US" sz="${i === 0 ? 2800 : 1800}"/><a:t>${escapeXml(line)}</a:t></a:r></a:p>`).join("");
    files[`ppt/slides/slide${index + 1}.xml`] = `<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Text"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="400000" y="400000"/><a:ext cx="8000000" cy="4000000"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>${body}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
  });
  files["[Content_Types].xml"] = `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${bodies.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>`;
  files["_rels/.rels"] = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`;
  files["ppt/presentation.xml"] = `<?xml version="1.0"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst>${bodies.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join("")}</p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/></p:presentation>`;
  files["ppt/_rels/presentation.xml.rels"] = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${bodies.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("")}</Relationships>`;
  return files;
}

function slidesFromPayload(payload) {
  return String(payload || "Slide").split(/\n##\s*/).map((slide) => slide.trim()).filter(Boolean);
}

function pdfEscape(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** One-page text PDF. Characters outside WinAnsi are replaced. */
function simplePdf(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n").slice(0, 42).map((line) => {
    const clean = [...line.slice(0, 90)].map((ch) => (ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126 ? ch : "?")).join("");
    return pdfEscape(clean);
  });
  const commands = ["BT", "/F1 12 Tf", "50 760 Td"];
  lines.forEach((line, index) => {
    if (index === 0) commands.push(`(${line}) Tj`);
    else commands.push(`0 -16 Td (${line}) Tj`);
  });
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  const xref = Buffer.byteLength(body);
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) trailer += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  trailer += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body + trailer);
}

module.exports = {
  escapeXml,
  decodeXml,
  sharedStrings,
  cellsFromSheet,
  rowsFromText,
  spreadsheetXml,
  slideText,
  presentationXml,
  slidesFromPayload,
  simplePdf
};
