import { describe, expect, it } from "vitest";
import { cardsOf, nextStep, waitingCount } from "./presentation";
import type { PendingRow, PublishingRepository, StatusRow } from "./types";

const row = (mod: string, more: Partial<StatusRow> = {}): StatusRow => ({
  mod,
  version: "1.0.0",
  itemId: null,
  operation: "create",
  package: "ready",
  blockers: [],
  requires: [],
  ...more,
});

const waiting = (mod: string, more: Partial<PendingRow> = {}): PendingRow => ({
  mod,
  version: "1.0.0",
  itemId: null,
  uploadedVersion: null,
  uploadedVisibility: null,
  needsUpload: false,
  ...more,
});

describe("each mod's next step", () => {
  it("is fixing first, then what blocks it", () => {
    expect(
      nextStep(
        row("A", { package: "not ready", error: "stale notes" }),
        undefined,
      ),
    ).toBe("fix");
    expect(nextStep(row("A", { blockers: ["Held"] }), waiting("A"))).toBe(
      "blocked",
    );
  });

  it("goes from a new item to an update to public to done", () => {
    expect(nextStep(row("A"), waiting("A"))).toBe("create");
    const onSteam = { itemId: "3900000001" };
    expect(
      nextStep(
        row("A", onSteam),
        waiting("A", {
          ...onSteam,
          needsUpload: true,
          uploadedVisibility: "private",
        }),
      ),
    ).toBe("update");
    expect(
      nextStep(
        row("A", onSteam),
        waiting("A", {
          ...onSteam,
          uploadedVersion: "1.0.0",
          uploadedVisibility: "private",
        }),
      ),
    ).toBe("public");
    expect(
      nextStep(
        row("A", onSteam),
        waiting("A", {
          ...onSteam,
          uploadedVersion: "1.0.0",
          uploadedVisibility: "public",
        }),
      ),
    ).toBe("done");
  });
});

describe("a repository's cards", () => {
  const repository: PublishingRepository = {
    repository: "mods",
    status: {
      game: "Sample",
      appId: "100",
      mods: [
        row("Base"),
        row("Content", {
          requires: ["Base"],
          blockers: ["Base has no published item ID yet"],
        }),
      ],
    },
    pending: { mods: [waiting("Base"), waiting("Content")] },
  };

  it("keeps the kit's order and joins what waits", () => {
    const cards = cardsOf(repository);
    expect(cards.map((c) => [c.mod, c.step])).toEqual([
      ["Base", "create"],
      ["Content", "blocked"],
    ]);
    expect(waitingCount(repository)).toBe(0);
  });

  it("shows nothing for a repository that could not be read", () => {
    expect(cardsOf({ repository: "x", failure: "broken" })).toEqual([]);
    expect(waitingCount({ repository: "x", failure: "broken" })).toBe(0);
  });
});
