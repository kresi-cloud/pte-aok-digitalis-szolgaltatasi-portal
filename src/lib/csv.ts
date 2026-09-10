/**
 * Kis, függőségmentes CSV-kezelő. Kezeli a BOM-ot, a CRLF sorvégeket, az
 * idézőjeles mezőket (benne elválasztóval és sortöréssel, "" escape-pel), és
 * felismeri az elválasztót (pontosvessző – magyar Excel –, vessző, tabulátor).
 */
export type Delimiter = ";" | "," | "\t";

export function detectDelimiter(text: string): Delimiter {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: [Delimiter, number][] = [
    [";", (firstLine.match(/;/g) ?? []).length],
    [",", (firstLine.match(/,/g) ?? []).length],
    ["\t", (firstLine.match(/\t/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : ";";
}

export function parseCsv(input: string, delimiter?: Delimiter): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const sep = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // üres sorok (pl. záró sortörés) kihagyása
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function toCsv(
  rows: (string | number | null | undefined)[][],
  sep: Delimiter = ";",
): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /["\r\n]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM, hogy az Excel UTF-8-ként nyissa meg (ékezetek)
  return "\uFEFF" + rows.map((r) => r.map(esc).join(sep)).join("\r\n") + "\r\n";
}
