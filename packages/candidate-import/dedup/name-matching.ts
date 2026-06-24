/** Collapse to lowercase letters only (for ordered substring matching). */
export function collapseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

/** Strip parentheticals and middle initials for comparison keys. */
export function nameMatchKeys(name: string): string[] {
  const trimmed = name.trim();
  const keys = new Set<string>();

  keys.add(collapseName(trimmed));

  const withoutParen = trimmed.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (withoutParen) {
    keys.add(collapseName(withoutParen));
  }

  const parenMatch = trimmed.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const last = trimmed.split(/\s+/).pop() ?? "";
    const preferred = `${parenMatch[1]} ${last}`.trim();
    keys.add(collapseName(preferred));
  }

  const withoutMiddleInitials = trimmed
    .replace(/\b[A-Z]\.\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutMiddleInitials) {
    keys.add(collapseName(withoutMiddleInitials));
  }

  return [...keys].filter((key) => key.length >= 3);
}

export function namesMatch(a: string, b: string): boolean {
  const keysA = nameMatchKeys(a);
  const keysB = nameMatchKeys(b);
  return keysA.some((ka) => keysB.some((kb) => ka === kb));
}

/**
 * True when all significant name parts appear in order within text
 * (handles "Harry Fe lgran" vs "Harry Felgran").
 */
export function nameAppearsInText(name: string, text: string): boolean {
  const parts = name
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+/)
    .map((p) => p.replace(/[^a-zA-Z]/g, ""))
    .filter((p) => p.length > 1);

  if (parts.length === 0) {
    return false;
  }

  const collapsedText = text.toLowerCase().replace(/[^a-z]/g, "");
  let pos = 0;

  for (const part of parts) {
    const collapsedPart = part.toLowerCase();
    const idx = collapsedText.indexOf(collapsedPart, pos);
    if (idx === -1) {
      return false;
    }
    pos = idx + collapsedPart.length;
  }

  return true;
}
