import type { Clue, Frame, LogData, Signature } from "../logs/types";
import type { ReportPlace } from "./types";

/**
 * The words of a report to one of our own repositories (0.65.0; `docs/online.md`, O4), built from what the Logs page shows: the
 * fault, how often and when, the stack, the lines as written and the game's version. The person reads all of it in GitHub's form
 * before sending; nothing is sent from here. Written in the shape `rules/reports.md` asks for: the title on its own, code and
 * stack lines in fenced blocks.
 */
const FRAMES = 12;
const LINES = 40;

export function reportTitle(signature: Signature): string {
  const words = signature.signature.split(/\s+/).join(" ").trim();
  return words.length > 150 ? `${words.slice(0, 147)}…` : words;
}

function frameLine(frame: Frame): string {
  const where = frame.file
    ? ` (${frame.file}${frame.line ? `:${frame.line}` : ""})`
    : "";
  return `${frame.method}${where}`;
}

export function reportBody(
  signature: Signature,
  log: LogData["log"],
  companionVersion: string,
): string {
  const lines = [signature.example.headline, ...signature.example.body].slice(
    0,
    LINES,
  );
  const parts = [
    `**What happened:** ${signature.level}, ${signature.count} times in ${log.name}` +
      (signature.first.time ? `, first at ${signature.first.time}` : "") +
      (signature.last.time ? `, last at ${signature.last.time}` : "") +
      ".",
  ];
  if (log.header.version) parts.push(`**Game version:** ${log.header.version}`);
  const frames = signature.frames ?? [];
  if (frames.length > 0)
    parts.push(
      "**Stack, nearest the fault first:**",
      fenced(frames.slice(0, FRAMES).map(frameLine)),
    );
  parts.push("**As written in the log:**", fenced(lines));
  if (signature.example.bodyLines > signature.example.body.length)
    parts.push(
      `(${signature.example.bodyLines - signature.example.body.length} more lines in the log.)`,
    );
  parts.push(
    `Sent from D'thorga Companion ${companionVersion}. The full log is available on request.`,
  );
  return parts.join("\n\n");
}

/** Lines as one fenced block, so GitHub shows them as written. A fence inside the lines is broken up so it can't end the block. */
function fenced(lines: string[]): string {
  const safe = lines.map((line) => line.replace(/```/g, "` ` `"));
  return ["```text", ...safe, "```"].join("\n");
}

/** The places that belong to the mods a fault points at, each repository once, ours before theirs. */
export function placesFor(clues: Clue[], places: ReportPlace[]): ReportPlace[] {
  const named = new Set(clues.map((clue) => clue.mod).filter(Boolean));
  const seen = new Set<string>();
  const found = places.filter((place) => {
    if (!named.has(place.mod) || !place.repository || place.whose === "unknown")
      return false;
    const key = `${place.whose}|${place.repository}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return found.sort((a, b) =>
    a.whose === b.whose ? 0 : a.whose === "ours" ? -1 : 1,
  );
}

/** The words a fault is searched for among an author's issues: its signature's longest plain words. */
export function searchWords(signature: Signature): string {
  return signature.signature
    .split(/[^A-Za-z0-9_.]+/)
    .filter((word) => word.length >= 4 && !/^\d+$/.test(word))
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)
    .join(" ");
}
