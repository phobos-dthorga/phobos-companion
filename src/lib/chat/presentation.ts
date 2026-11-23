import type { ChatEvent, ChatOption } from "./types";

/** One thing in the conversation as the page shows it (0.74.0). */
export type Entry =
  | { kind: "you"; text: string }
  | { kind: "agent"; text: string }
  | { kind: "thought"; text: string }
  | {
      kind: "tool";
      id: string;
      title: string;
      tool: string | null;
      status: string | null;
    }
  | { kind: "plan"; entries: { content: string; status: string }[] }
  | {
      kind: "permission";
      request: string;
      title: string;
      options: ChatOption[];
      /** The option's name the person chose, "" for none, or null while it waits. */
      answered: string | null;
    }
  | { kind: "read"; path: string; allowed: boolean; reason: string | null }
  | {
      kind: "write";
      request: string;
      path: string;
      before: string | null;
      after: string;
      /** The person's answer: true for yes, false for no, null while it waits. */
      answered: boolean | null;
    }
  | { kind: "written"; path: string; written: boolean; reason: string | null }
  | { kind: "refused"; what: string }
  | { kind: "ended"; reason: string }
  | { kind: "stopped"; reason: string };

/** The conversation with one event added: text joins the piece before it of the same kind, a step's update changes the step it
 *  names, a plan replaces the last plan. */
export function apply(entries: Entry[], event: ChatEvent): Entry[] {
  switch (event.kind) {
    case "text": {
      const last = entries.at(-1);
      if (last && last.kind === event.role)
        return [
          ...entries.slice(0, -1),
          { kind: event.role, text: last.text + event.text },
        ];
      return [...entries, { kind: event.role, text: event.text }];
    }
    case "tool": {
      const at = entries.findIndex(
        (e) => e.kind === "tool" && e.id === event.id,
      );
      if (at < 0)
        return [
          ...entries,
          {
            kind: "tool",
            id: event.id,
            title: event.title ?? event.id,
            tool: event.tool,
            status: event.status,
          },
        ];
      const was = entries[at] as Extract<Entry, { kind: "tool" }>;
      const now: Entry = {
        ...was,
        title: event.title ?? was.title,
        tool: event.tool ?? was.tool,
        status: event.status ?? was.status,
      };
      return entries.map((e, i) => (i === at ? now : e));
    }
    case "plan": {
      const kept = entries.filter((e) => e.kind !== "plan");
      return [...kept, { kind: "plan", entries: event.entries }];
    }
    case "permission":
      return [
        ...entries,
        {
          kind: "permission",
          request: event.request,
          title: event.title,
          options: event.options,
          answered: null,
        },
      ];
    case "read":
      return [
        ...entries,
        {
          kind: "read",
          path: event.path,
          allowed: event.allowed,
          reason: event.reason,
        },
      ];
    case "write":
      return [
        ...entries,
        {
          kind: "write",
          request: event.request,
          path: event.path,
          before: event.before,
          after: event.after,
          answered: null,
        },
      ];
    case "written":
      return [
        ...entries,
        {
          kind: "written",
          path: event.path,
          written: event.written,
          reason: event.reason,
        },
      ];
    case "refused":
      return [...entries, { kind: "refused", what: event.what }];
    case "ended":
      return [...entries, { kind: "ended", reason: event.reason }];
  }
}

/** Marks a permission answered, with the name of the option chosen ("" for none). */
export function answered(
  entries: Entry[],
  request: string,
  name: string,
): Entry[] {
  return entries.map((e) =>
    e.kind === "permission" && e.request === request
      ? { ...e, answered: name }
      : e,
  );
}

/** Marks a change the agent asked for answered: yes or no (0.75.0). */
export function answeredWrite(
  entries: Entry[],
  request: string,
  allow: boolean,
): Entry[] {
  return entries.map((e) =>
    e.kind === "write" && e.request === request ? { ...e, answered: allow } : e,
  );
}

/** The permissions and changes still waiting for the person. */
export function waitingPermissions(entries: Entry[]): number {
  return entries.filter(
    (e) =>
      (e.kind === "permission" || e.kind === "write") && e.answered === null,
  ).length;
}

/** One line of a change as the card shows it: added, removed, kept, or a run of kept lines folded away. */
export type DiffLine =
  { mark: "+" | "-" | " "; text: string } | { mark: "…"; count: number };

/** The most lines compared line by line; a larger change shows the old lines removed and the new added. */
const MOST_COMPARED = 2_000_000;

/**
 * What a change does, line by line (0.75.0): the longest run of lines the old and new share is kept, the rest removed or added.
 * Kept lines more than `context` away from a change fold into one "…" line. A new file is all added lines.
 */
export function lineDiff(
  before: string | null,
  after: string,
  context = 2,
): DiffLine[] {
  const split = (text: string) =>
    text === ""
      ? []
      : text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
  const old = before === null ? [] : split(before);
  const now = split(after);
  const lines: DiffLine[] = [];
  if (old.length * now.length > MOST_COMPARED) {
    lines.push(...old.map((text) => ({ mark: "-" as const, text })));
    lines.push(...now.map((text) => ({ mark: "+" as const, text })));
    return lines;
  }
  // The length of the longest shared run from each pair of places to the end.
  const width = now.length + 1;
  const shared = new Uint32Array((old.length + 1) * width);
  for (let i = old.length - 1; i >= 0; i--)
    for (let j = now.length - 1; j >= 0; j--)
      shared[i * width + j] =
        old[i] === now[j]
          ? shared[(i + 1) * width + j + 1] + 1
          : Math.max(shared[(i + 1) * width + j], shared[i * width + j + 1]);
  let i = 0;
  let j = 0;
  while (i < old.length || j < now.length) {
    if (i < old.length && j < now.length && old[i] === now[j]) {
      lines.push({ mark: " ", text: old[i] });
      i++;
      j++;
    } else if (
      i < old.length &&
      (j === now.length ||
        shared[(i + 1) * width + j] >= shared[i * width + j + 1])
    ) {
      // A removed line comes before the line that takes its place, as a reader expects.
      lines.push({ mark: "-", text: old[i] });
      i++;
    } else {
      lines.push({ mark: "+", text: now[j] });
      j++;
    }
  }
  return fold(lines, context);
}

function fold(lines: DiffLine[], context: number): DiffLine[] {
  const changed = lines.map((l) => l.mark === "+" || l.mark === "-");
  const near = (at: number) =>
    changed.some((c, k) => c && Math.abs(k - at) <= context);
  const folded: DiffLine[] = [];
  let run = 0;
  lines.forEach((line, at) => {
    if (line.mark === " " && !near(at)) {
      run++;
      return;
    }
    if (run > 0) folded.push({ mark: "…", count: run });
    run = 0;
    folded.push(line);
  });
  if (run > 0) folded.push({ mark: "…", count: run });
  return folded;
}

/** Whether a refused request was to change a file (rather than run a command). */
export function refusedWrite(what: string): boolean {
  return what.startsWith("fs/");
}
