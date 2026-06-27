export interface CsvDownloadOptions<T extends Record<string, unknown>> {
  columns: (keyof T & string)[];
  rows: T[];
  filename: string;
}

function escapeCsvValue(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Trigger a CSV file download in the browser. */
export function downloadCsv<T extends Record<string, unknown>>(options: CsvDownloadOptions<T>): void {
  if (typeof document === "undefined") return;
  const { columns, rows, filename } = options;
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((col) => escapeCsvValue(row[col])).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Build a dated filename with prefix and `.csv` extension. */
export function csvFilename(prefix: string, date = new Date()): string {
  return `${prefix}-${date.toISOString().slice(0, 10)}.csv`;
}
