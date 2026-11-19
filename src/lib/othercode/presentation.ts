import type { Report } from "../reports/types";
import type { Holder, KeptFile } from "./types";

/** Whether the holder is the game's own assembly, whose first decompile takes minutes rather than seconds. */
export function isGameItself(holder: Holder): boolean {
  return holder.mod === "the game";
}

/** A C# thing outside our code, by its connections id (`cs:Verse.Pawn.Tick`), as a name the tools can look up; null otherwise. */
export function theirName(nodeId: string): string | null {
  return nodeId.startsWith("cs:") ? nodeId.slice(3).replace(/^\./, "") : null;
}

/** The kept files that can be compared (two builds or more), most recently updated first. */
export function comparable(files: KeptFile[]): KeptFile[] {
  return files
    .filter((f) => f.versions >= 2)
    .sort((a, b) => (b.newest_seen ?? "").localeCompare(a.newest_seen ?? ""));
}

/**
 * The declarations a comparison names, by section ("Declarations added (8)" and so on), read from each table's Name column,
 * so each can be opened as a diff.
 */
export function changedNames(
  report: Report | null,
): { heading: string; names: string[] }[] {
  if (!report) return [];
  const found: { heading: string; names: string[] }[] = [];
  for (const section of report.sections) {
    for (const block of section.blocks) {
      if (block.type !== "table") continue;
      const column = block.headers.indexOf("Name");
      if (column < 0) continue;
      const names = block.rows
        .map((row) => String(row[column] ?? ""))
        .filter((name) => name.length > 0);
      if (names.length > 0) found.push({ heading: section.heading, names });
    }
  }
  return found;
}
