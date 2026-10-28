import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PartnerPortal.tsx is marked `// @ts-nocheck`, so the type checker never reports
 * a component that is rendered but never imported. At runtime that throws
 * `ReferenceError: X is not defined` and tears down the whole partner portal tree.
 * This guard fails if any JSX component tag in the file has no matching import
 * or local declaration.
 */
const SRC = join(__dirname, "components");

function identifiersInImports(code: string): Set<string> {
  const names = new Set<string>();
  const re = /import\s+(?:type\s+)?([^;'"]*?)\s*from\s*["'][^"']+["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const clause = m[1];
    // named imports: { A, B as C } -> keep the local alias (C)
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const part of braces[1].split(",")) {
        const seg = part.trim();
        if (!seg) continue;
        const as = seg.split(/\s+as\s+/);
        names.add((as[1] ?? as[0]).trim());
      }
    }
    // default / namespace imports outside the braces
    const outside = clause.replace(/\{[^}]*\}/g, "").replace(/\*\s+as\s+\w+/g, "");
    for (const part of outside.split(",")) {
      const seg = part.trim().replace(/^type\s+/, "");
      if (seg && /^[A-Za-z_$][\w$]*$/.test(seg)) names.add(seg);
    }
  }
  return names;
}

function locallyDeclared(code: string): Set<string> {
  const names = new Set<string>();
  const re = /(?:^|\n)\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Z][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) names.add(m[1]);
  // destructured locals: const { A, B } = ...
  const d = /(?:const|let|var)\s*\{([^}]*)\}\s*=/g;
  while ((m = d.exec(code))) {
    for (const part of m[1].split(",")) {
      const seg = part.trim();
      if (!seg) continue;
      const as = seg.split(":");
      const local = (as[1] ?? as[0]).trim();
      if (/^[A-Z][A-Za-z0-9_]*$/.test(local)) names.add(local);
    }
  }
  return names;
}

function usedComponentTags(code: string): Set<string> {
  const tags = new Set<string>();
  // Opening JSX tags only: `<` must not follow an identifier char (that would be
  // a generic like useState<LeadData>) and must be followed by an uppercase name.
  const re = /(^|[^A-Za-z0-9_$.<])<([A-Z][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) tags.add(m[2]);
  return tags;
}

describe("PartnerPortal imports every component it renders", () => {
  const code = readFileSync(join(SRC, "PartnerPortal.tsx"), "utf8");
  const imported = identifiersInImports(code);
  const declared = locallyDeclared(code);
  const used = usedComponentTags(code);

  it("renders at least one attachment button (regression anchor)", () => {
    expect(code).toMatch(/<AnexoChamadoBotao/);
  });

  it("has an import or local declaration for every JSX component tag", () => {
    const missing = [...used]
      .filter((t) => !imported.has(t) && !declared.has(t))
      .sort();
    expect(missing).toEqual([]);
  });
});
