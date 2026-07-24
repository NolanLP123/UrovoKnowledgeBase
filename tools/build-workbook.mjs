import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(process.argv[2] || ".");
const data = JSON.parse(await fs.readFile(path.join(root, "public", "knowledge.json"), "utf8"));
const workbook = Workbook.create();
const knowledge = workbook.worksheets.add("Knowledge");
const categories = workbook.worksheets.add("Categories");
const readme = workbook.worksheets.add("Instructions");

const headers = [
  "id", "category", "module", "title", "summary", "signature", "parameters_json",
  "returns", "min_android", "models", "status", "keywords", "source", "version",
];
const rows = data.entries.map((entry) => [
  entry.id, entry.category, entry.module, entry.title, entry.summary, entry.signature,
  JSON.stringify(entry.parameters || []), entry.returns, entry.minAndroid || "",
  (entry.models || []).join("\n"), entry.status, entry.keywords, entry.source, entry.version,
]);
knowledge.getRangeByIndexes(0, 0, rows.length + 1, headers.length).values = [headers, ...rows];
knowledge.showGridLines = false;
knowledge.freezePanes.freezeRows(1);
knowledge.getRange("A1:N1").format = {
  fill: "#12372A",
  font: { bold: true, color: "#FFFFFF" },
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "outside", style: "thin", color: "#12372A" },
};
knowledge.getRange(`A2:N${rows.length + 1}`).format = {
  font: { color: "#1E293B", size: 10 },
  verticalAlignment: "top",
  wrapText: true,
  borders: { insideHorizontal: { style: "thin", color: "#E2E8F0" } },
};
const widths = [28, 18, 24, 28, 52, 48, 50, 38, 14, 22, 14, 36, 34, 14];
widths.forEach((width, index) => {
  knowledge.getRangeByIndexes(0, index, rows.length + 1, 1).format.columnWidth = width;
});
knowledge.getRange(`K2:K${rows.length + 1}`).dataValidation = {
  rule: { type: "list", values: ["Active", "Deprecated", "Draft"] },
};
knowledge.getRange(`B2:B${rows.length + 1}`).dataValidation = {
  rule: { type: "list", values: data.categories.map((item) => item.name) },
};
knowledge.tables.add(`A1:N${rows.length + 1}`, true, "KnowledgeTable").style = "TableStyleMedium2";

const categoryRows = data.categories.map((item) => [
  item.name,
  item.enabled ? "Yes" : "No",
  item.enabled ? "Included in the current site" : "Reserved for future content",
]);
categories.getRangeByIndexes(0, 0, categoryRows.length + 1, 3).values = [
  ["category", "enabled", "description"],
  ...categoryRows,
];
categories.showGridLines = false;
categories.freezePanes.freezeRows(1);
categories.getRange("A1:C1").format = { fill: "#12372A", font: { bold: true, color: "#FFFFFF" } };
categories.getRange(`A2:C${categoryRows.length + 1}`).format = {
  wrapText: true,
  borders: { insideHorizontal: { style: "thin", color: "#E2E8F0" } },
};
categories.getRange("A:A").format.columnWidth = 24;
categories.getRange("B:B").format.columnWidth = 14;
categories.getRange("C:C").format.columnWidth = 42;
categories.getRange(`B2:B${categoryRows.length + 1}`).dataValidation = {
  rule: { type: "list", values: ["Yes", "No"] },
};
categories.tables.add(`A1:C${categoryRows.length + 1}`, true, "CategoriesTable").style = "TableStyleMedium2";

readme.showGridLines = false;
readme.getRange("A1:H1").merge();
readme.getRange("A1").values = [["Urovo Knowledge Base — Maintenance Guide"]];
readme.getRange("A1:H1").format = {
  fill: "#12372A", font: { bold: true, color: "#FFFFFF", size: 18 }, rowHeight: 34,
};
const instructions = [
  ["Purpose", "Edit the Knowledge sheet, then regenerate public/knowledge.json."],
  ["Required fields", "id, category, module and title. Each id must be unique and URL-safe."],
  ["Parameters", "parameters_json must be valid JSON, for example [{\"name\":\"slotId\",\"description\":\"SIM slot index\"}]."],
  ["Models", "Separate multiple device models with commas or new lines."],
  ["Status", "Use Active, Deprecated or Draft."],
  ["Generate JSON", "python tools/xlsx-to-json.py knowledge-template.xlsx public/knowledge.json"],
  ["Preview", "Run a local web server. Opening HTML directly may block JSON loading in some browsers."],
  ["Deploy", "Upload the complete folder to GitHub Pages or an Nginx/Apache static directory."],
];
readme.getRangeByIndexes(2, 0, instructions.length, 2).values = instructions;
readme.getRange(`A3:A${instructions.length + 2}`).format = {
  font: { bold: true, color: "#12372A" }, fill: "#ECFDF5", verticalAlignment: "top",
};
readme.getRange(`B3:B${instructions.length + 2}`).format = { wrapText: true, verticalAlignment: "top" };
readme.getRange(`A3:B${instructions.length + 2}`).format.borders = {
  insideHorizontal: { style: "thin", color: "#D7E4DE" },
};
readme.getRange("A:A").format.columnWidth = 24;
readme.getRange("B:B").format.columnWidth = 92;
readme.getRange(`A3:B${instructions.length + 2}`).format.rowHeight = 34;

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(root, "knowledge-template.xlsx"));
const preview = await workbook.render({ sheetName: "Instructions", range: "A1:B10", scale: 1.5, format: "png" });
await fs.writeFile(path.join(root, "workbook-preview.png"), new Uint8Array(await preview.arrayBuffer()));
console.log((await workbook.inspect({
  kind: "table",
  range: "Knowledge!A1:N6",
  include: "values,formulas",
  tableMaxRows: 6,
  tableMaxCols: 14,
})).ndjson);
