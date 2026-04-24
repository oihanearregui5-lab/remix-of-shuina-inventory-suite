import * as XLSX from "xlsx";

export type Cell = string | number | boolean | null | undefined;
export type Row = Record<string, Cell>;

export interface SheetData {
  name: string;
  rows: Row[];
}

const sanitizeFilename = (name: string) =>
  name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_");

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const escapeCsvCell = (value: Cell): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[";\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

/**
 * CSV con BOM UTF-8 y separador `;` para compatibilidad con Excel español.
 */
export const exportToCSV = (rows: Row[], filename: string) => {
  if (rows.length === 0) {
    triggerDownload(new Blob(["\uFEFF"], { type: "text/csv;charset=utf-8" }), `${sanitizeFilename(filename)}.csv`);
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(";"));
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvCell(row[h])).join(";"));
  }
  const csv = "\uFEFF" + lines.join("\r\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${sanitizeFilename(filename)}.csv`);
};

/**
 * XLSX con una hoja por SheetData. Auto-anchos básicos por columna.
 */
export const exportToXLSX = (sheets: SheetData[], filename: string) => {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ "(sin datos)": "" }];
    const ws = XLSX.utils.json_to_sheet(rows);
    const headers = Object.keys(rows[0]);
    ws["!cols"] = headers.map((h) => {
      const maxLen = Math.max(
        h.length,
        ...rows.slice(0, 200).map((r) => String(r[h] ?? "").length),
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 48) };
    });
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(wb, `${sanitizeFilename(filename)}.xlsx`);
};
