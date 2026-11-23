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

/** The permissions still waiting for the person. */
export function waitingPermissions(entries: Entry[]): number {
  return entries.filter((e) => e.kind === "permission" && e.answered === null)
    .length;
}

/** Whether a refused request was to change a file (rather than run a command). */
export function refusedWrite(what: string): boolean {
  return what.startsWith("fs/");
}
