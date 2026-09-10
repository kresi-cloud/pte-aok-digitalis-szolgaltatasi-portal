import { describe, expect, it } from "bun:test";
import { detectDelimiter, parseCsv, toCsv } from "../csv";

describe("CSV", () => {
  it("pontosvesszős magyar Excel-export BOM-mal és CRLF-fel", () => {
    const rows = parseCsv("﻿Név;E-mail\r\nKis Anna;kis.anna@aok.pte.hu\r\n");
    expect(rows).toEqual([
      ["Név", "E-mail"],
      ["Kis Anna", "kis.anna@aok.pte.hu"],
    ]);
  });

  it("vesszős fájl idézőjeles mezőkkel, benne vesszővel és sortöréssel", () => {
    const rows = parseCsv('a,b\n"x, y","több\nsoros"\n"idéző ""jel"""," z"\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["x, y", "több\nsoros"],
      ['idéző "jel"', " z"],
    ]);
  });

  it("elválasztó felismerése és üres sorok kihagyása", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a,b\n1,2")).toBe(",");
    expect(detectDelimiter("a\tb")).toBe("\t");
    expect(parseCsv("a;b\n\n1;2\n;\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("toCsv → parseCsv körbeér", () => {
    const data = [
      ["Név", "Megjegyzés"],
      ['Dr. "X" Y', "egy; kettő\nhárom"],
    ];
    expect(parseCsv(toCsv(data))).toEqual(data);
  });
});
