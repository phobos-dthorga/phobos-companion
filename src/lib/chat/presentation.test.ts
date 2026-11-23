import { describe, expect, it } from "vitest";
import {
  answered,
  answeredWrite,
  apply,
  lineDiff,
  refusedWrite,
  waitingPermissions,
  type Entry,
} from "./presentation";
import type { ChatEvent } from "./types";

describe("a change the agent asks for (0.75.0)", () => {
  it("shows what is removed and added, and keeps the lines around them", () => {
    expect(lineDiff("one\ntwo\nthree\n", "one\nTWO\nthree\n")).toEqual([
      { mark: " ", text: "one" },
      { mark: "-", text: "two" },
      { mark: "+", text: "TWO" },
      { mark: " ", text: "three" },
    ]);
  });

  it("folds kept lines far from any change", () => {
    const before = Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n");
    const after = before.replace("line 10", "line ten");
    const diff = lineDiff(before, after, 1);
    expect(diff[0]).toEqual({ mark: "…", count: 9 });
    expect(diff.filter((l) => l.mark === "-" || l.mark === "+")).toEqual([
      { mark: "-", text: "line 10" },
      { mark: "+", text: "line ten" },
    ]);
    expect(diff.at(-1)).toEqual({ mark: "…", count: 8 });
  });

  it("shows a new file as all added, and reads Windows line endings", () => {
    expect(lineDiff(null, "a\r\nb\r\n")).toEqual([
      { mark: "+", text: "a" },
      { mark: "+", text: "b" },
    ]);
    expect(lineDiff("same", "same")).toEqual([{ mark: "…", count: 1 }]);
  });

  it("waits for the person's answer, then keeps it", () => {
    const entries = apply([], {
      kind: "write",
      request: "w1",
      path: "src/Boat.cs",
      before: null,
      after: "x",
    });
    expect(waitingPermissions(entries)).toBe(1);
    const after = answeredWrite(entries, "w1", false);
    expect(after[0]).toMatchObject({ answered: false });
    expect(waitingPermissions(after)).toBe(0);
  });
});

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
