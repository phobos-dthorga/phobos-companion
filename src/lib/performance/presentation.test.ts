import { describe, expect, it } from "vitest";
import {
  chosenRecording,
  dayOf,
  figure,
  firstFinding,
  firstIsRisk,
  lookNeedsText,
  others,
} from "./presentation";
import type { Summary } from "./types";

function summary(
  recording: string,
  findings: Summary["findings"] = [],
): Summary {
  return {
    recording,
    label: "",
    recorded_at: "",
    seconds: 30,
    game: {},
    findings,
  };
}

describe("the Performance page's words and choices", () => {
  it("shows the chosen recording while it is kept, else the newest", () => {
    const kept = [
      summary("20261118-081449-after"),
      summary("20261117-190038-many"),
    ];
    expect(chosenRecording("20261117-190038-many", kept)).toBe(
      "20261117-190038-many",
    );
    expect(chosenRecording("20261101-000000-gone", kept)).toBe(
      "20261118-081449-after",
    );
    expect(chosenRecording(undefined, [])).toBeNull();
    expect(
      others(kept, "20261118-081449-after").map((r) => r.recording),
    ).toEqual(["20261117-190038-many"]);
  });

  it("reads a recording's day from its name, for the Timeline", () => {
    expect(dayOf("20261118-081449-after")).toBe("2026-11-18");
    expect(dayOf("not-a-recording")).toBeNull();
  });

  it("leads with the first finding, and says whether it is a risk", () => {
    const one = summary("20261117-190038-many", [
      {
        text: "A stall of 2,445 ms",
        role: "risk",
        value: 2445,
        unit: "ms",
        refs: [],
      },
    ]);
    expect(firstFinding(one)).toBe("A stall of 2,445 ms");
    expect(firstIsRisk(one)).toBe(true);
    expect(firstFinding(summary("20261117-190038-calm"))).toBeNull();
    expect(firstIsRisk(summary("20261117-190038-calm"))).toBe(false);
  });

  it("shows a missing figure as a dash", () => {
    expect(figure(null)).toBe("–");
    expect(figure(undefined)).toBe("–");
    expect(figure(Number.NaN)).toBe("–");
    expect(figure(1234.5)).toBe("1,235");
    expect(figure(1.1164, 2)).toBe("1.12");
  });

  it("asks for words for every look but the trend", () => {
    expect(lookNeedsText("callers")).toBe(true);
    expect(lookNeedsText("trend")).toBe(false);
  });
});

describe("a cost tag's words", () => {
  it("shows a share with one decimal under 10%, and a signed change", async () => {
    const { changeWords, shareWords } = await import("./presentation");
    expect(shareWords(1.14)).toBe("1.1%");
    expect(shareWords(57.14)).toBe("57%");
    expect(changeWords(0.5)).toBe("+0.5");
    expect(changeWords(-1.24)).toBe("−1.2");
    expect(changeWords(0.01)).toBe("±0");
  });
});

describe("costs, found by package first", () => {
  it("finds a mod by its package ID, a Workshop copy's too, then by its name, and a method by a code map's id", async () => {
    const { methodCost, modCost, isOurs } = await import("./costs.svelte");
    const data = {
      newest: "20261118-081449-after",
      recorded_at: "",
      label: "",
      first_finding: {},
      recordings: 2,
      own: { pattern: "D'thorga*", share: 2, earlier_middle: 1, note: "" },
      mods: [
        {
          name: "Sample Boats",
          package: "sample.boats",
          share: 12.5,
          earlier_middle: 10,
          change: 2.5,
          ours: false,
          flagged: true,
          version: "",
        },
        {
          name: "D'thorga Medical",
          package: "",
          share: 1.1,
          earlier_middle: 0.6,
          change: 0.5,
          ours: true,
          flagged: false,
          version: "0.36.0",
        },
      ],
      methods: [
        {
          name: "Boats.Hull.Float",
          share: 0.3,
          of: "Sample Boats",
          of_kind: "mod",
        },
      ],
      game: {},
    };
    expect(modCost(data, null, "Sample.Boats_steam")?.name).toBe(
      "Sample Boats",
    );
    expect(modCost(data, "D'thorga Medical")?.share).toBe(1.1);
    expect(modCost(data, "Nobody")).toBeNull();
    expect(modCost(null, "Sample Boats")).toBeNull();
    expect(methodCost(data, "cs:Boats.Hull.Float")?.share).toBe(0.3);
    expect(methodCost(data, "Boats.Hull.Sink")).toBeNull();
    expect(isOurs(data, "D'thorga Medical")).toBe(true);
    expect(isOurs(data, "Sample Boats")).toBe(false);
  });
});

describe("our own mods' trend", () => {
  it("rises only when the kit marks it up", async () => {
    const { ownRose } = await import("./presentation");
    expect(ownRose("**up 3.0 points** on the earlier middle (2.0%)")).toBe(
      true,
    );
    expect(ownRose("down 2.5 points on the earlier middle (4.5%)")).toBe(false);
    expect(ownRose("")).toBe(false);
  });
});

describe("recordings made for a test row", () => {
  it("finds those whose label names the row, and no other", async () => {
    const { recordingsForRow } = await import("./presentation");
    const kept = [
      summary("20261129-100000-row-785"),
      summary("20261129-110000-row-7850"),
      summary("20261129-120000-calm"),
    ];
    kept[0].label = "row 785";
    kept[1].label = "Row 7850 again";
    kept[2].label = "calm";
    expect(recordingsForRow(kept, "785").map((r) => r.label)).toEqual([
      "row 785",
    ]);
    expect(recordingsForRow(kept, "7850").map((r) => r.label)).toEqual([
      "Row 7850 again",
    ]);
    expect(recordingsForRow(kept, "")).toEqual([]);
  });
});

describe("the mods a recording's findings name", () => {
  it("lists each mod once, and finds it on this PC by package, a Workshop copy first", async () => {
    const { findingMods, rowOf } = await import("./presentation");
    const mod = (id: string, pkg = "") => ({ kind: "mod", id, package: pkg });
    const report = {
      format: 1,
      title: "t",
      lines: [],
      sections: [],
      blocks: [
        {
          type: "findings" as const,
          items: [
            {
              text: "a",
              role: "risk" as const,
              value: null,
              unit: "",
              refs: [
                mod("Sample Boats", "sample.boats"),
                { kind: "method", id: "A.B" },
              ],
            },
            {
              text: "b",
              role: "observed" as const,
              value: null,
              unit: "",
              refs: [mod("Sample Boats", "sample.boats"), mod("Other")],
            },
          ],
        },
      ],
    };
    expect(findingMods(report).map((r) => r.id)).toEqual([
      "Sample Boats",
      "Other",
    ]);
    expect(findingMods(null)).toEqual([]);
    const rows = [
      { key: "sample.boats", name: "Sample Boats", source: "local" },
      { key: "sample.boats_steam", name: "Sample Boats", source: "workshop" },
      { key: "other.mod", name: "Other", source: "workshop" },
    ];
    expect(rowOf(rows, mod("Sample Boats", "sample.boats"))?.source).toBe(
      "workshop",
    );
    expect(rowOf(rows, mod("Other"))?.key).toBe("other.mod");
    expect(rowOf(rows, mod("Nobody", "no.body"))).toBeNull();
  });
});

describe("the active mods, costliest first", () => {
  it("ranks only active mods a recording named, by package then name, and never reorders the list itself", async () => {
    const { costliest } = await import("./presentation");
    const cost = (name: string, pkg: string, share: number) => ({
      name,
      package: pkg,
      share,
      earlier_middle: null,
      change: null,
      ours: false,
      flagged: false,
      version: "",
    });
    const data = {
      newest: "n",
      recorded_at: "",
      label: "",
      first_finding: {},
      recordings: 1,
      own: { pattern: "", share: 0, earlier_middle: null, note: "" },
      mods: [
        cost("Boats", "sample.boats", 12),
        cost("Doors", "", 30),
        cost("Off", "off.mod", 50),
        cost("Idle", "idle.mod", 0),
      ],
      methods: [],
      game: {},
    };
    const names: Record<string, string> = {
      "sample.boats_steam": "Boats",
      "doors.mod": "Doors",
      "idle.mod": "Idle",
      "plain.mod": "Plain",
    };
    const active = ["sample.boats_steam", "doors.mod", "idle.mod", "plain.mod"];
    expect(
      costliest(data, active, (k) => names[k]).map((r) => [r.key, r.share]),
    ).toEqual([
      ["doors.mod", 30],
      ["sample.boats_steam", 12],
    ]);
    expect(active).toEqual([
      "sample.boats_steam",
      "doors.mod",
      "idle.mod",
      "plain.mod",
    ]);
    expect(costliest(null, active, (k) => k)).toEqual([]);
  });
});

describe("costs as the kit gives them", () => {
  it("are no costs when the kit refused (no recordings yet) or answered anything else", async () => {
    const { validCosts } = await import("./costs.svelte");
    expect(
      validCosts({ ok: false, refusal: "No recordings in K:/cache." }),
    ).toBe(false);
    expect(validCosts(null)).toBe(false);
    expect(validCosts({ newest: "n", mods: [], methods: [], own: {} })).toBe(
      true,
    );
  });
});
