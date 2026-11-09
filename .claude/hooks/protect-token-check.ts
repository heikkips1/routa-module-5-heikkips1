// PreToolUse hook: refuses any change to mcp/src/token-check.ts.
// Exit 2 blocks the tool call and shows stderr to Claude. Exit 0 allows it.
import { resolve, basename } from "node:path";

const PROTECTED = "token-check.ts";
const PROTECTED_PATH = "mcp/src/token-check.ts";

// Commands that only read, or only record the file in git, are fine.
const READ_ONLY = new Set([
  "cat", "head", "tail", "less", "more", "wc", "grep", "rg", "ls", "stat", "file",
  "diff", "cmp", "sha256sum", "md5sum", "test", "[", "echo", "printf", "bat", "nl",
]);
const GIT_READ_ONLY = new Set([
  "add", "status", "diff", "log", "show", "blame", "ls-files", "commit", "check-ignore",
  "grep", "rev-parse", "cat-file", "shortlog", "whatchanged", "ls-tree",
]);

function block(reason: string): never {
  process.stderr.write(`Blocked: ${reason}. ${PROTECTED_PATH} is protected; ask the user to change it.\n`);
  process.exit(2);
}

function isProtectedPath(p: unknown): boolean {
  if (typeof p !== "string" || p === "") return false;
  const abs = resolve(process.cwd(), p);
  return abs.endsWith("/" + PROTECTED_PATH) || (basename(abs) === PROTECTED && abs.includes("/mcp/src/"));
}

// Split a shell command into simple commands, so that "git add x && sed -i y x" is judged per part.
function segments(command: string): string[] {
  return command.split(/&&|\|\||[;|&\n]/).map((s) => s.trim()).filter(Boolean);
}

function words(segment: string): string[] {
  const tokens = segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  // Skip leading VAR=value assignments and wrappers like sudo/env/command.
  let i = 0;
  while (i < tokens.length && (/^\w+=/.test(tokens[i]) || ["sudo", "env", "command", "time", "nice"].includes(tokens[i]))) i++;
  return tokens.slice(i);
}

function judgeSegment(segment: string): void {
  if (!segment.includes(PROTECTED)) return;
  // Output redirection onto the file: > file, >> file, >| file
  if (new RegExp(`>>?\\|?\\s*['"]?[^\\s;|&'"]*${PROTECTED.replace(".", "\\.")}`).test(segment)) {
    block("shell redirection writes to the file");
  }
  const w = words(segment);
  const cmd = w[0]?.replace(/^.*\//, "") ?? "";
  if (cmd === "git") {
    const sub = w.slice(1).find((x) => !x.startsWith("-"));
    if (sub && GIT_READ_ONLY.has(sub)) return;
    block(`git ${sub ?? ""} could change the file`);
  }
  if (cmd === "sed" && !w.some((x) => /^-[a-zA-Z]*i|^--in-place/.test(x))) return;
  if (READ_ONLY.has(cmd)) return;
  block(`"${cmd}" mentions the file and is not known to be read-only`);
}

let input = "";
for await (const chunk of process.stdin) input += chunk;
let event: { tool_name?: string; tool_input?: Record<string, unknown> };
try {
  event = JSON.parse(input);
} catch {
  process.exit(0);
}

const tool = event.tool_name ?? "";
const args = event.tool_input ?? {};

if (tool === "Bash") {
  for (const s of segments(String(args.command ?? ""))) judgeSegment(s);
} else if (isProtectedPath(args.file_path) || isProtectedPath(args.notebook_path) || isProtectedPath(args.path)) {
  block(`${tool} would change the file`);
}
process.exit(0);
