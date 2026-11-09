import { describe, expect, it } from "vitest";
import {
  daysSince,
  formatIsoDate,
  headlineWords,
  pendingWords,
  problemKey,
  whenWords,
} from "./presentation";
import type { GameHome, PendingRelease } from "./types";

const NOW = new Date(2026, 10, 9, 15, 30);
const unixOf = (date: Date) => Math.floor(date.getTime() / 1000);

function game(lastWorked: number | null): GameHome {
  return {
    id: "g",
    name: "Game",
    last_worked: lastWorked,
    latest: [],
    unfinished: [],
    pending: [],
    open_work: [],
    problems: [],
  };
}

function pending(changes: Partial<PendingRelease>): PendingRelease {
  return {
    product: "P",
    repository: "r",
    unreleased: 0,
    draft_version: null,
    draft_date: null,
    earlier_drafts: 0,
    ...changes,
  };
}

describe("days since", () => {
  it("counts calendar days, not periods of 24 hours", () => {
    expect(daysSince(unixOf(new Date(2026, 10, 8, 23, 59)), NOW)).toBe(1);
    expect(daysSince(unixOf(new Date(2026, 10, 9, 0, 1)), NOW)).toBe(0);
  });

  it("is never negative, even if a clock was ahead", () => {
    expect(daysSince(unixOf(new Date(2026, 10, 12)), NOW)).toBe(0);
  });

  it("stays whole across a daylight-saving change", () => {
    expect(daysSince(unixOf(new Date(2026, 3, 1, 12)), NOW)).toBe(222);
  });
});

describe("when words", () => {
  it("says today, yesterday, or how many days", () => {
    expect(whenWords(unixOf(new Date(2026, 10, 9, 1)), NOW).key).toBe(
      "when-today",
    );
    expect(whenWords(unixOf(new Date(2026, 10, 8, 1)), NOW).key).toBe(
      "when-yesterday",
    );
    expect(whenWords(unixOf(new Date(2026, 9, 8, 1)), NOW)).toEqual({
      key: "when-days",
      args: { count: 32 },
    });
  });

  it("says so when there is no history", () => {
    expect(whenWords(null, NOW).key).toBe("when-never");
  });
});

describe("the headline", () => {
  it("names the game and how long ago", () => {
    expect(headlineWords(game(unixOf(new Date(2026, 9, 8))), NOW)).toEqual({
      key: "headline-days",
      args: { game: "Game", count: 32 },
    });
  });

  it("has its own words for today, yesterday and never", () => {
    expect(headlineWords(game(unixOf(NOW)), NOW).key).toBe("headline-today");
    expect(headlineWords(game(unixOf(new Date(2026, 10, 8))), NOW).key).toBe(
      "headline-yesterday",
    );
    expect(headlineWords(game(null), NOW).key).toBe("headline-never");
  });
});

describe("pending releases", () => {
  it("prefers a draft version", () => {
    expect(
      pendingWords(
        pending({
          draft_version: "1.2.0",
          draft_date: "2026-11-09",
          unreleased: 3,
        }),
      ),
    ).toEqual({
      key: "pending-draft",
      args: { version: "1.2.0", date: "9 Nov 2026" },
    });
  });

  it("copes with a draft that has no date", () => {
    expect(pendingWords(pending({ draft_version: "1.2.0" })).key).toBe(
      "pending-draft-undated",
    );
  });

  it("counts entries waiting for a version", () => {
    expect(pendingWords(pending({ unreleased: 2 }))).toEqual({
      key: "pending-unreleased",
      args: { count: 2 },
    });
  });
});

describe("dates and problems", () => {
  it("leaves text that is not a date as written", () => {
    expect(formatIsoDate("soon")).toBe("soon");
  });

  it("treats an unknown problem as git failing", () => {
    expect(problemKey("something_new")).toBe("repo-problem-git-failed");
  });
});
