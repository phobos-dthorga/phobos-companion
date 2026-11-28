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
