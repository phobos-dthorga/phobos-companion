import { describe, expect, it } from "vitest";
import type { ReportEntry } from "./types";
import {
  firstToOpen,
  reportFocus,
  totalWaiting,
  waitingFor,
  watchable,
  type Watched,
} from "./watching";

function entry(report: string, waits: string | null = null): ReportEntry {
  return {
    command: "game-save",
    report,
    question: `${report}?`,
    surface: null,
    waits,
  };
}

const checks = entry("checks", "waiting");
const rules = entry("rules", "waiting");
const summary = entry("summary");

describe("reports that count what waits on you", () => {
  it("are the ones the manifest marks", () => {
    expect(watchable([summary, checks, rules])).toEqual([checks, rules]);
  });

  it("add up, and say nothing when none was read", () => {
    const found: Watched[] = [
      { entry: checks, waiting: 2 },
      { entry: rules, waiting: 0 },
    ];
    expect(totalWaiting(found)).toBe(2);
    expect(totalWaiting([{ entry: checks, waiting: 0 }])).toBe(0);
    expect(totalWaiting([])).toBeNull();
    expect(totalWaiting(undefined)).toBeNull();
  });

  it("open the one with the most waiting, and none when nothing waits", () => {
    const found: Watched[] = [
      { entry: checks, waiting: 1 },
      { entry: rules, waiting: 3 },
    ];
    expect(firstToOpen(found)?.entry).toBe(rules);
    expect(firstToOpen([{ entry: checks, waiting: 0 }])).toBeNull();
    expect(firstToOpen(undefined)).toBeNull();
  });

  it("show a count beside a report only when something waits", () => {
    const found: Watched[] = [
      { entry: checks, waiting: 4 },
      { entry: rules, waiting: 0 },
    ];
    expect(waitingFor(found, entry("checks", "waiting"))).toBe(4);
    expect(waitingFor(found, rules)).toBeNull();
    expect(waitingFor(found, summary)).toBeNull();
  });

  it("open on the Reports page by their command and report", () => {
    expect(reportFocus(checks)).toEqual({
      command: "game-save",
      report: "checks",
    });
    expect(reportFocus({ ...checks, report: null })).toEqual({
      command: "game-save",
      report: "",
    });
  });
});
