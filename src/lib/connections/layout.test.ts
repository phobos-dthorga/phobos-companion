import { describe, expect, it } from "vitest";
import {
  curve,
  FANNED,
  flowPicture,
  radial,
  shownGroups,
  zoomed,
} from "./layout";
import { kindMark, startingPoints, whereWords } from "./presentation";
import type { Around, Group, Thing } from "./types";

function thing(id: string, extra: Partial<Thing> = {}): Thing {
  return {
    id,
    name: id,
    kind: "method",
    language: "csharp",
    file: null,
    line: null,
    end: null,
    owner: null,
    external: false,
    assembly: null,
    exact: true,
    connections: 1,
    ...extra,
  };
}

function group(
  relation: Group["relation"],
  count: number,
  extra: Partial<Thing> = {},
): Group {
  return {
    relation,
    kind: relation,
    outward: true,
    count,
    exact: true,
    nodes: Array.from({ length: Math.min(count, 80) }, (_, i) =>
      thing(`${relation}${i}`, extra),
    ),
  };
}

const around = (groups: Group[]): Around => ({
  centre: thing("cs:Middle"),
  groups,
});

describe("the radial picture", () => {
  it("puts the thing in the middle, a hub for each group around it, and its members beyond", () => {
    const groups = [group("calls", 3), group("called-by", 1)];
    const picture = radial(around(groups), groups);
    const centre = picture.nodes.find((n) => n.role === "centre")!;
    const hubs = picture.nodes.filter((n) => n.role === "hub");
    const members = picture.nodes.filter((n) => n.role === "member");
    expect(centre.x).toBe(picture.width / 2);
    expect(centre.y).toBe(picture.height / 2);
    expect(hubs.map((h) => [h.relation, h.count])).toEqual([
      ["calls", 3],
      ["called-by", 1],
    ]);
    expect(members).toHaveLength(4);
    const distance = (n: { x: number; y: number }) =>
      Math.hypot(n.x - centre.x, n.y - centre.y);
    expect(members.every((m) => distance(m) > distance(hubs[0]))).toBe(true);
    expect(picture.lines).toHaveLength(2 + 4);
  });

  it("fans out at most a handful of members and counts the rest on a 'more' node", () => {
    const groups = [group("used-by", 40)];
    const picture = radial(around(groups), groups);
    expect(picture.nodes.filter((n) => n.role === "member")).toHaveLength(
      FANNED,
    );
    expect(picture.nodes.find((n) => n.role === "more")?.count).toBe(
      40 - FANNED,
    );
  });

  it("keeps every member inside the picture", () => {
    const groups = [
      group("calls", 30),
      group("uses", 30),
      group("called-by", 30),
    ];
    const picture = radial(around(groups), groups);
    for (const node of picture.nodes) {
      expect(node.x).toBeGreaterThan(0);
      expect(node.x).toBeLessThan(picture.width);
      expect(node.y).toBeGreaterThan(0);
      expect(node.y).toBeLessThan(picture.height);
    }
  });

  it("draws only the chosen relations, and outside things only when asked", () => {
    const groups = [group("calls", 2, { external: true }), group("uses", 2)];
    expect(
      shownGroups(groups, new Set(["uses"]), true).map((g) => g.relation),
    ).toEqual(["uses"]);
    expect(
      shownGroups(groups, new Set(["calls", "uses"]), false).map(
        (g) => g.relation,
      ),
    ).toEqual(["uses"]);
    expect(shownGroups(groups, new Set(["calls", "uses"]), true)).toHaveLength(
      2,
    );
  });
});

describe("the flow", () => {
  const flow = {
    centre: "cs:Middle",
    columns: [
      { step: -1, nodes: [thing("cs:Caller")] },
      { step: 0, nodes: [thing("cs:Middle")] },
      { step: 1, nodes: [thing("cs:A"), thing("cs:B", { external: true })] },
    ],
    edges: [
      { source: "cs:Caller", target: "cs:Middle", exact: true },
      { source: "cs:Middle", target: "cs:A", exact: true },
      { source: "cs:Middle", target: "cs:B", exact: false },
    ],
  };

  it("runs from callers on the left to callees on the right", () => {
    const picture = flowPicture(flow, true);
    const x = (id: string) => picture.nodes.find((n) => n.thing?.id === id)!.x;
    expect(x("cs:Caller")).toBeLessThan(x("cs:Middle"));
    expect(x("cs:Middle")).toBeLessThan(x("cs:A"));
    expect(picture.lines).toHaveLength(3);
    expect(curve(picture.lines[0])).toMatch(/^M [\d.]+ [\d.]+ C /);
  });

  it("leaves outside things out unless asked", () => {
    const picture = flowPicture(flow, false);
    expect(picture.nodes.map((n) => n.thing?.id)).not.toContain("cs:B");
    expect(picture.lines).toHaveLength(2);
  });
});

describe("words and steps", () => {
  it("zooms by steps between limits", () => {
    expect(zoomed(1, 1)).toBe(1.25);
    expect(zoomed(1, -1)).toBe(0.8);
    expect(zoomed(4, 1)).toBe(4);
    expect(zoomed(0.4, -1)).toBe(0.4);
  });

  it("marks a kind with a letter and says where a thing is", () => {
    expect(kindMark(thing("a", { kind: "property" }))).toBe("P");
    expect(kindMark(thing("a", { kind: "def" }))).toBe("D");
    expect(whereWords(thing("a", { file: "src/A.cs", line: 12 }))).toBe(
      "src/A.cs:12",
    );
    expect(whereWords(thing("a", { assembly: "Assembly-CSharp" }))).toBe(
      "Assembly-CSharp",
    );
  });

  it("starts from the most-changed thing still in the code", () => {
    const found = startingPoints([
      thing("a", { linesChanged: 2 }),
      thing("b", { linesChanged: 9, inGraph: false }),
      thing("c", { linesChanged: 5 }),
    ]);
    expect(found.map((t) => t.id)).toEqual(["c", "a"]);
  });
});
