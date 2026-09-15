/**
 * Fordítási lefedettség-ellenőrzés: minden forráskódbeli magyar szöveg (JSX-szöveg,
 * sztringliterál, sablon) átmegy a translate()-en; ami változatlan marad, az a jelentésbe kerül.
 * Futtatás: bun scripts/i18n-audit.ts [--json out.json]
 */
import ts from "typescript";
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { translate } from "../src/lib/i18n/language";

const ROOT = join(import.meta.dir, "..");
const SKIP = [
  /src\/lib\/i18n\//,
  /__tests__/,
  /src\/lib\/seed\.ts$/,
  /src\/lib\/asset-data\.ts$/,
  /src\/lib\/product-catalog/,
  /src\/lib\/inventory-data\.ts$/,
  /src\/lib\/demo-users\.ts$/,
  /src\/routes\/\[\.mcp\]/,
  /src\/routes\/\[\.well-known\]/,
  /src\/routes\/mcp\.ts$/,
  /src\/lib\/mcp\//,
  /routeTree\.gen\.ts$/,
  /src\/lib\/lovable-error-reporting\.ts$/,
  /src\/lib\/error-capture\.ts$/,
];
const HU = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/;
const HU_WORD =
  /\b(és|vagy|nem|igen|nincs|van|hogy|csak|még|már|minden|szerint|alatt|után|kérjük|adja|válasszon|igény|eszköz|beszerzés|tétel|lépés|felelős|jóváhagy\w*|átadás|átvétel|keret|határidő|napló|egység|kezelés|vissza|folyamat\w*|azonnali|magyar|keresés|mentés|törlés|szerkesztés|megjegyzés|indoklás|helyettes\w*|beküld\w*|elutasít\w*|lezár\w*|leltár\w*|selejt\w*|rendelés|szállító|raktár|tervsor|besorolás|ütemezés|kifogás|akadály|munkanap\w*|db|Ft|eFt|piszkozat\w*|visszavont)\b/i;
const isHu = (t: string) => HU.test(t) || HU_WORD.test(t);

function walkDir(dir: string, out: string[]) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walkDir(p, out);
    else if (/\.(tsx?|jsx?)$/.test(f)) out.push(p);
  }
}
const files: string[] = [];
walkDir(join(ROOT, "src"), files);

type Hit = { file: string; line: number; kind: string; text: string };
const hits: Hit[] = [];
for (const file of files) {
  const rel = relative(ROOT, file);
  if (SKIP.some((re) => re.test(rel))) continue;
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const add = (node: ts.Node, kind: string, text: string) => {
    const t = text.replace(/\s+/g, " ").trim();
    if (!t || t.length < 2 || !isHu(t)) return;
    // technikai sztringek kihagyása
    if (/^[a-z0-9_./-]+$/i.test(t) && !HU.test(t)) return;
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
    hits.push({ file: rel, line: line + 1, kind, text: t });
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) add(node, "jsx", node.getText());
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // import/argumentum kulcsok kihagyása: className, id, to, params, key, href
      const parent = node.parent;
      if (
        ts.isImportDeclaration(parent) ||
        (ts.isPropertyAssignment(parent) && parent.name === node) ||
        (ts.isJsxAttribute(parent) &&
          /^(className|id|to|href|key|value|name|htmlFor|data-.*|type|variant|size|align|accept|params|entity|status|kind|scope|role)$/.test(
            parent.name.getText(),
          ))
      )
        return;
      add(node, "str", node.text);
    } else if (ts.isTemplateExpression(node)) {
      let i = 0;
      let tpl = node.head.text;
      for (const span of node.templateSpans) tpl += `{${i++}}` + span.literal.text;
      add(node, "tpl", tpl);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// dedup by text
const byText = new Map<string, Hit[]>();
for (const h of hits) byText.set(h.text, [...(byText.get(h.text) ?? []), h]);

const untranslated: { text: string; kind: string; where: string }[] = [];
for (const [text, list] of byText) {
  const kind = list[0]!.kind;
  const sample = kind === "tpl" ? text.replace(/\{\d+\}/g, (m) => (m === "{0}" ? "7" : "x")) : text;
  const en = translate(sample, "en");
  const sampleNum = kind === "tpl" ? text.replace(/\{\d+\}/g, "7") : text;
  const enNum = translate(sampleNum, "en");
  // részleges fordítás (pl. csak egy beágyazott kifejezés cserélődött) is fordítatlannak számít
  const covered = (en !== sample || enNum !== sampleNum) && !isHu(en) && !isHu(enNum);
  if (!covered)
    untranslated.push({
      text: en !== sample ? `${text}  ⇒  ${en}` : text,
      kind,
      where: `${list[0]!.file}:${list[0]!.line}${list.length > 1 ? ` (+${list.length - 1})` : ""}`,
    });
}
untranslated.sort((a, b) => a.where.localeCompare(b.where));
const jsonIdx = process.argv.indexOf("--json");
if (jsonIdx > 0) writeFileSync(process.argv[jsonIdx + 1]!, JSON.stringify(untranslated, null, 2));
console.log(
  `Magyar szövegek a forrásban: ${byText.size} egyedi · fordítatlan: ${untranslated.length}`,
);
for (const u of untranslated) console.log(`${u.kind.padEnd(3)} ${u.where}\n    ${u.text}`);
