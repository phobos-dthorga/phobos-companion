import { describe, expect, it } from "vitest";
import { fraction, heard, started, trail } from "./progress";

describe("progress", () => {
  it("moves without a count until the work names one", () => {
    const state = started("Reading…");
    expect(fraction(state)).toBeNull();
    expect(state.label).toBe("Reading…");
  });

  it("counts a step being worked on as not yet done", () => {
    const state = heard(started(), { label: "Building A", step: 3, of: 23 });
    expect(state).toMatchObject({ label: "Building A", step: 3, of: 23 });
    expect(fraction(state)).toBeCloseTo(2 / 23, 5);
    expect(
      fraction(heard(state, { label: "Building Z", step: 23, of: 23 })),
    ).toBeLessThan(1);
  });

  it("keeps the label and the count when only a detail arrives", () => {
    const counted = heard(started(), { label: "Building A", step: 1, of: 4 });
    const state = heard(counted, { detail: "copied 4 files" });
    expect(state).toEqual({
      label: "Building A",
      step: 1,
      of: 4,
      detail: "copied 4 files",
      done: [],
    });
  });

  it("starts afresh at a new label: the last one's count and detail go", () => {
    const before = heard(
      heard(started(), { label: "Building A", step: 4, of: 4 }),
      { detail: "done" },
    );
    expect(heard(before, { label: "Copying the mod" })).toEqual({
      label: "Copying the mod",
      step: null,
      of: null,
      detail: "",
      done: ["Building A"],
    });
  });

  it("never runs past the end", () => {
    const state = heard(started(), { label: "Odd", step: 9, of: 4 });
    expect(state.step).toBe(4);
    expect(fraction(state)).toBeLessThanOrEqual(1);
  });

  it("keeps a trail of finished stages, one stage for items of the same count", () => {
    let state = started("Starting");
    state = heard(state, { label: "Looking at what needs a build" });
    state = heard(state, { label: "Comparing Framework", step: 1, of: 3 });
    state = heard(state, { label: "Comparing Medical", step: 2, of: 3 });
    state = heard(state, { label: "Comparing Vehicles", step: 3, of: 3 });
    state = heard(state, { label: "Reading settings" });
    expect(state.done).toEqual([
      "Starting",
      "Looking at what needs a build",
      "Comparing Vehicles",
    ]);
    expect(trail(state, 2)).toEqual({
      stages: ["Looking at what needs a build", "Comparing Vehicles"],
      earlier: 1,
    });
  });
});
