import { describe, expect, it } from "vitest";
import {
  answered,
  apply,
  refusedWrite,
  waitingPermissions,
  type Entry,
} from "./presentation";
import type { ChatEvent } from "./types";

function all(events: ChatEvent[], start: Entry[] = []): Entry[] {
  return events.reduce(apply, start);
}

describe("the conversation", () => {
  it("joins text to the piece before it of the same kind", () => {
    const entries = all(
      [
        { kind: "text", role: "thought", text: "Look" },
        { kind: "text", role: "thought", text: "ing." },
        { kind: "text", role: "agent", text: "A mod " },
        { kind: "text", role: "agent", text: "failed." },
      ],
      [{ kind: "you", text: "Why?" }],
    );
    expect(entries).toEqual([
      { kind: "you", text: "Why?" },
      { kind: "thought", text: "Looking." },
      { kind: "agent", text: "A mod failed." },
    ]);
  });

  it("changes a step where it stands, keeping what an update leaves out", () => {
    const entries = all([
      {
        kind: "tool",
        id: "t1",
        title: "Read Player.log",
        tool: "read",
        status: "pending",
      },
      { kind: "text", role: "agent", text: "Reading." },
      { kind: "tool", id: "t1", title: null, tool: null, status: "completed" },
    ]);
    expect(entries[0]).toEqual({
      kind: "tool",
      id: "t1",
      title: "Read Player.log",
      tool: "read",
      status: "completed",
    });
    expect(entries).toHaveLength(2);
  });

  it("shows only the latest plan, at the end", () => {
    const step = (status: string) => ({ content: "Read the log", status });
    const entries = all([
      { kind: "plan", entries: [step("pending")] },
      { kind: "text", role: "agent", text: "On it." },
      { kind: "plan", entries: [step("completed")] },
    ]);
    expect(entries.map((e) => e.kind)).toEqual(["agent", "plan"]);
    expect(entries.at(-1)).toEqual({
      kind: "plan",
      entries: [step("completed")],
    });
  });

  it("keeps a permission waiting until it is answered", () => {
    const entries = all([
      {
        kind: "permission",
        request: "p1",
        title: "Edit Boat.cs",
        options: [{ id: "allow-once", name: "Allow once", kind: "allow_once" }],
      },
    ]);
    expect(waitingPermissions(entries)).toBe(1);
    const after = answered(entries, "p1", "Allow once");
    expect(waitingPermissions(after)).toBe(0);
    expect(after[0]).toMatchObject({ answered: "Allow once" });
  });

  it("tells a refused change from a refused command", () => {
    expect(refusedWrite("fs/write_text_file")).toBe(true);
    expect(refusedWrite("terminal/create")).toBe(false);
  });
});
