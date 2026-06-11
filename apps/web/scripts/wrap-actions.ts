import fs from "node:fs";
import path from "node:path";

const actionsDir = path.join(import.meta.dir, "../lib/actions");
const skip = new Set(["create-action.ts"]);

type Wrapper = "defineAction" | "defineQueryWithInput";

function isQueryExport(name: string): boolean {
  return (
    name.startsWith("get") ||
    name === "getAllCategories" ||
    name === "getRoundsByPosition"
  );
}

function wrapAsyncConstExports(content: string): string {
  const marker = /export const (\w+) = async \(/g;
  if (!marker.test(content)) {
    return content;
  }

  let result = "";
  let index = 0;
  marker.lastIndex = 0;

  for (const match of content.matchAll(
    /export const (\w+) = async \(/g,
  )) {
    const name = match[1]!;
    const start = match.index!;
    result += content.slice(index, start);

    const wrapper: Wrapper = isQueryExport(name)
      ? "defineQueryWithInput"
      : "defineAction";

    let cursor = start + match[0].length;
    let depth = 1;
    let inString: "'" | '"' | "`" | null = null;
    let escaped = false;

    while (cursor < content.length && depth > 0) {
      const ch = content[cursor]!;

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === inString) {
          inString = null;
        }
        cursor++;
        continue;
      }

      if (ch === "'" || ch === '"' || ch === "`") {
        inString = ch;
        cursor++;
        continue;
      }

      if (ch === "(") depth++;
      if (ch === ")") depth--;

      cursor++;
    }

    const params = content.slice(start + match[0].length, cursor - 1);
    let bodyStart = cursor;
    while (bodyStart < content.length && /\s/.test(content[bodyStart]!)) {
      bodyStart++;
    }

    if (content[bodyStart] === ":") {
      let typeDepth = 0;
      bodyStart++;
      while (bodyStart < content.length) {
        const ch = content[bodyStart]!;
        if (ch === "<") typeDepth++;
        if (ch === ">") typeDepth--;
        if (ch === "(") typeDepth++;
        if (ch === ")") typeDepth--;
        bodyStart++;
        if (typeDepth <= 0 && content.slice(bodyStart).trimStart().startsWith("=>")) {
          break;
        }
      }
    }

    while (bodyStart < content.length && /\s/.test(content[bodyStart]!)) {
      bodyStart++;
    }

    if (content.slice(bodyStart, bodyStart + 2) !== "=>") {
      throw new Error(
        `Expected arrow function for export const ${name} in wrapped file`,
      );
    }

    bodyStart += 2;
    while (bodyStart < content.length && /\s/.test(content[bodyStart]!)) {
      bodyStart++;
    }

    if (content[bodyStart] !== "{") {
      throw new Error(`Expected block body for export const ${name}`);
    }

    let braceDepth = 0;
    let end = bodyStart;
    inString = null;
    escaped = false;

    while (end < content.length) {
      const ch = content[end]!;

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === inString) {
          inString = null;
        }
        end++;
        continue;
      }

      if (ch === "'" || ch === '"' || ch === "`") {
        inString = ch;
        end++;
        continue;
      }

      if (ch === "{") braceDepth++;
      if (ch === "}") {
        braceDepth--;
        if (braceDepth === 0) {
          end++;
          break;
        }
      }

      end++;
    }

    const body = content.slice(bodyStart, end);
    let tail = end;
    if (content[tail] === ";") tail++;

    result += `export const ${name} = ${wrapper}(async (${params}) => ${body});`;
    index = tail;
  }

  result += content.slice(index);
  return result;
}

for (const file of fs.readdirSync(actionsDir)) {
  if (!file.endsWith(".ts") || skip.has(file)) continue;
  const filePath = path.join(actionsDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  if (content.includes('from "./create-action"')) continue;

  try {
    const wrapped = wrapAsyncConstExports(content);
    if (wrapped === content) continue;

    const needsQuery = wrapped.includes("defineQueryWithInput");
    const needsAction = wrapped.includes("defineAction(");
    const imports: string[] = [];
    if (needsAction) imports.push("defineAction");
    if (needsQuery) imports.push("defineQueryWithInput");

    content = `import { ${imports.join(", ")} } from "./create-action";\n${wrapped}`;
    fs.writeFileSync(filePath, content);
    console.log("wrapped", file);
  } catch (error) {
    console.error("skip", file, error instanceof Error ? error.message : error);
  }
}
