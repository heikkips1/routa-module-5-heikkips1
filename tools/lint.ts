// Every change is shown before it is applied: a tool in mcp/src/tools that calls
// patchSettings must also call showChange. apply-change.ts applies a change that
// preview-change already showed, so it is exempt.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = "mcp/src/tools";
const exempt = new Set(["apply-change.ts", "index.ts"]);

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const failures: string[] = [];
for (const name of readdirSync(dir).filter((f) => f.endsWith(".ts") && !exempt.has(f)).sort()) {
  const code = stripComments(readFileSync(join(dir, name), "utf8"));
  if (/\bpatchSettings\s*\(/.test(code) && !/\bshowChange\s*\(/.test(code)) {
    failures.push(`${dir}/${name} calls patchSettings without calling showChange`);
  }
}

if (failures.length > 0) {
  for (const f of failures) console.error(`lint: ${f}`);
  process.exit(1);
}
console.log("lint: every tool shows a change before applying it");
