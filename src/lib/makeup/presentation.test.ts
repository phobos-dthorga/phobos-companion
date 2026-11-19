import { describe, expect, it } from "vitest";
import type { TestList, TestRow } from "../tests/types";
import {
  busiest,
  formatSize,
  growthOf,
  kindRole,
  kindsPresent,
  mixOf,
  sharedFolders,
  testedOf,
  treeOf,
} from "./presentation";
import type { GrowthPoint, MadeFile } from "./types";

function file(
  path: string,
  kind: MadeFile["kind"],
  lines: number,
  bytes: number,
  product: string | null = "Boats",
): MadeFile {
  return {
    path,
    product,
    group: product ? null : path.split("/")[0],
    kind,
    language: "",
    bytes,
    lines,
  };
}

const files = [
  file("mods/Boats/Defs/Things.xml", "data", 40, 900),
  file("mods/Boats/Textures/boat.png", "pictures", 0, 50000),
  file("src/Boats/Boat.cs", "code", 120, 3000),
  file("src/Boats/Hull.cs", "code", 60, 1500),
  file("docs/guide.md", "words", 30, 800, null),
];
const owner = (f: MadeFile) => f.product ?? `outside: ${f.group}`;

describe("what it's made of", () => {
  it("leaves out the folders every file of an owner shares", () => {
    expect(
      sharedFolders(["mods/Boats/Defs/a.xml", "mods/Boats/b.png"]),
    ).toEqual(["mods", "Boats"]);
    expect(sharedFolders(["mods/Boats/a.xml", "src/Boats/b.cs"])).toEqual([]);
  });

  it("builds owners, then folders, then files, biggest first, leaving out what the measure gives nothing", () => {
    const tree = treeOf(files, "lines", owner);
    expect(tree.map((n) => [n.name, n.value, n.kind])).toEqual([
      ["Boats", 220, "code"],
      ["outside: docs", 30, "words"],
    ]);
    const boats = tree[0];
    expect(boats.children?.map((c) => c.name)).toEqual(["src", "mods"]);
    const pictures = treeOf(files, "bytes", owner)[0];
    expect(JSON.stringify(pictures)).toContain("boat.png");
    expect(JSON.stringify(boats)).not.toContain("boat.png");
    const leaf = boats.children![0].children![0].children![0];
    expect([leaf.name, leaf.path, leaf.kind]).toEqual([
      "Boat.cs",
      "src/Boats/Boat.cs",
      "code",
    ]);
  });

  it("totals each owner's kinds, biggest owner first, in the fixed kind order", () => {
    const mix = mixOf(files, "files", owner);
    expect(mix.owners).toEqual(["Boats", "outside: docs"]);
    expect(mix.totals.get("Boats")?.get("code")).toBe(2);
    expect(kindsPresent(mix.totals.values())).toEqual([
      "code",
      "data",
      "words",
      "pictures",
    ]);
    expect(kindRole("code")).toBe("series-1");
    expect(kindRole("other")).toBe("series-8");
  });
});

describe("how it grew", () => {
  it("gives one series a kind with anything in it, lines or size", () => {
    const points: GrowthPoint[] = [
      {
        day: "2026-11-01",
        commit: "a",
        kinds: { code: [10, 100] },
        products: {},
      },
      {
        day: "2026-11-02",
        commit: "b",
        kinds: { code: [20, 200], pictures: [0, 900] },
        products: {},
      },
    ];
    expect(growthOf(points, "lines")).toEqual({
      days: ["2026-11-01", "2026-11-02"],
      series: [{ kind: "code", values: [10, 20] }],
    });
    expect(growthOf(points, "bytes").series.map((s) => s.kind)).toEqual([
      "code",
      "pictures",
    ]);
  });
});

describe("tested in game and where the work goes", () => {
  function row(id: string, extra: Partial<TestRow>): TestRow {
    return {
      id,
      section: "",
      title: id,
      status: "open",
      cells: {},
      seen: [],
      evidence_keys: [],
      verdict: null,
      pending: null,
      ...extra,
    };
  }

  it("counts each product's rows by state, a row naming none under its own heading", () => {
    const lists: TestList[] = [
      {
        repository: "boats",
        title: "",
        unrowed: [],
        order_problems: [],
        command_line: "",
        rows: [
          row("1", { versions: { Boats: "1.0.0" }, status: "passed" }),
          row("2", { versions: { Boats: "1.1.0", Sails: "0.2.0" } }),
          row("3", {
            versions: { Boats: "1.1.0" },
            verdict: { verdict: "failed", time: "", note: "" },
          }),
          row("4", {}),
        ],
      },
    ];
    const found = testedOf(lists, "none");
    expect(found.get("Boats")).toEqual({
      passed: 1,
      seen: 0,
      waiting: 1,
      failed: 1,
    });
    expect(found.get("Sails")?.waiting).toBe(1);
    expect(found.get("none")?.waiting).toBe(1);
  });

  it("lists the busiest files of a kind, most often changed first", () => {
    const churn = [
      {
        path: "a.cs",
        kind: "code" as const,
        commits: 3,
        added: 5,
        removed: 1,
        last: "",
      },
      {
        path: "b.md",
        kind: "words" as const,
        commits: 9,
        added: 5,
        removed: 1,
        last: "",
      },
      {
        path: "c.cs",
        kind: "code" as const,
        commits: 7,
        added: 1,
        removed: 1,
        last: "",
      },
    ];
    expect(busiest(churn, ["code"], 5).map((c) => c.path)).toEqual([
      "c.cs",
      "a.cs",
    ]);
  });

  it("says sizes in the units a person reads", () => {
    expect(formatSize(512, "en-AU")).toBe("512 B");
    expect(formatSize(2048, "en-AU")).toBe("2 KB");
    expect(formatSize(5 * 1024 * 1024, "en-AU")).toBe("5 MB");
  });
});
