import { parseCsv } from "./bankParser";

export const isSpreadsheet = (f: File) => /\.(csv|tsv|txt|xlsx|xlsm)$/i.test(f.name);
export const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
export const isImage = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|bmp|gif|tiff?)$/i.test(f.name);

/** Reads CSV or XLSX into a grid of cell values (first worksheet with data). */
export async function readGrid(file: File): Promise<unknown[][]> {
  if (/\.(csv|tsv|txt)$/i.test(file.name)) {
    const buf = await file.arrayBuffer();
    let text = new TextDecoder("utf-8").decode(buf);
    // Many GCC bank exports are Windows-1256 (Arabic) encoded.
    if (text.includes("�")) text = new TextDecoder("windows-1256").decode(buf);
    return parseCsv(text);
  }
  if (/\.xls$/i.test(file.name)) throw new Error("legacyXls");
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  for (const ws of wb.worksheets) {
    const grid: unknown[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, r) => {
      const vals: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell, c) => {
        let v: unknown = cell.value;
        if (v && typeof v === "object" && !(v instanceof Date)) {
          const o = v as { result?: unknown; text?: string; richText?: { text: string }[] };
          v = o.result ?? o.text ?? (o.richText ? o.richText.map((t) => t.text).join("") : String(v));
        }
        vals[c - 1] = v;
      });
      grid[r - 1] = vals;
    });
    if (grid.length > 1) return Array.from(grid, (r) => r ?? []);
  }
  return [];
}

export async function fileToBase64(file: Blob): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
