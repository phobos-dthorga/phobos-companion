import type { GameFiles, Since } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The moment to send for a choice of how far back; null means since the last launch, Steam's own record. */
export function sinceMoment(since: Since, now: Date): string | null {
  if (since === "launch") return null;
  const back = new Date(now.getTime() - (since === "day" ? 1 : 7) * DAY_MS);
  return `${back.toISOString().slice(0, 19)}+00:00`;
}

/** A save's or a picture's path: the saves folder joined to its file (a grouped save's group comes from its name). */
export function savePath(
  files: GameFiles,
  file: string,
  name: string,
): string | null {
  const folder = files.places.saves;
  if (!folder) return null;
  const separator = folder.includes("\\") ? "\\" : "/";
  const group = name.includes(" / ") ? name.split(" / ")[0] + separator : "";
  return `${folder}${separator}${group}${file}`;
}

/** The space rows, largest first: the install, the Workshop items and the data folder's own entries, each with its share. */
export function spaceRows(
  files: GameFiles,
  install: string,
  workshop: string,
  top: number,
): { name: string; bytes: number; share: number }[] {
  const rows = [
    ...(files.space.install
      ? [{ name: install, bytes: files.space.install }]
      : []),
    ...(files.space.workshop
      ? [{ name: workshop, bytes: files.space.workshop }]
      : []),
    ...files.space.data.map((d) => ({ name: d.name, bytes: d.bytes })),
  ]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, top);
  const largest = Math.max(1, ...rows.map((r) => r.bytes));
  return rows.map((r) => ({ ...r, share: r.bytes / largest }));
}
