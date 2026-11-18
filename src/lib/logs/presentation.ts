import type { Thing } from "../connections/types";
import type { Clue, Signature } from "./types";

/** Levels in the order a page lists them; others after. */
const LEVEL_ORDER = ["FATAL", "ERROR", "WARN", "UNKNOWN", "INFO"];

export function levelRank(level: string): number {
  const index = LEVEL_ORDER.indexOf(level);
  return index < 0 ? LEVEL_ORDER.length : index;
}

/** A frame's method as the connections tools name things: "Type.Method", the last two parts of "Namespace.Type.Method". */
export function searchName(method: string): string {
  const parts = method.split(".").filter((part) => part.length > 0);
  return parts.slice(-2).join(".");
}

/** The connections id a C# method of a stack frame would have. */
export function nodeId(method: string): string {
  return `cs:${method}`;
}

/**
 * The thing a frame names, among what a search found: the exact id, this repository's own code before an outside thing the
 * graph only knows by its calls. Null when none has the frame's exact name.
 */
export function matchFrame(method: string, found: Thing[]): Thing | null {
  const id = nodeId(method);
  const exact = found.filter((thing) => thing.id === id);
  return exact.find((thing) => !thing.external) ?? exact[0] ?? null;
}

/** The mods a signature points at, strongest clue first, each named once. */
export function pointsAt(signature: Signature, limit = 3): Clue[] {
  const seen = new Set<string>();
  const clues: Clue[] = [];
  for (const clue of signature.evidence) {
    const name = clue.mod || clue.value;
    if (seen.has(name)) continue;
    seen.add(name);
    clues.push(clue);
    if (clues.length === limit) break;
  }
  return clues;
}

/** Signatures of the chosen levels, in the tools' order (most severe and most frequent first). */
export function shownSignatures(
  groups: Signature[],
  levels: Set<string>,
): Signature[] {
  return groups.filter((group) => levels.has(group.level));
}
