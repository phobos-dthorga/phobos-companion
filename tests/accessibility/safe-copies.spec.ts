import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const WHEN = "2026-11-21T11:40:29+00:00";

/** One invented repository listing safe copies: a proven training of ours, one made from a game's files, and a note set. */
const COPIES = [
  {
    repository: "first-mods",
    title: "Safe copies: 1 never copied",
    command_line: "python -m phobos_modkit safe-copies status",
    status: {
      game: "first",
      notes: [],
      destinations: [
        {
          name: "local",
          folder: "S:\\Sample\\safe-copies",
          problem: null,
          privateLocal: true,
          shared: [],
          lastRun: { name: "x.json", time: WHEN },
        },
        {
          name: "repository",
          folder: "S:\\Sample\\sample-safe-copies",
          problem: null,
          privateLocal: false,
          shared: [],
          lastRun: null,
        },
      ],
      sets: [
        {
          set: "trainings",
          unit: "sample-ours",
          kind: "own",
          why: "all 12 pictures in manifest.json by hash",
          files: 30,
          bytes: 60_000_000,
          neverCopied: false,
          destinations: {
            local: { state: "copied", lastCopied: WHEN, changed: 0, files: 30 },
            repository: {
              state: "copied",
              lastCopied: WHEN,
              changed: 0,
              files: 26,
            },
          },
        },
        {
          set: "trainings",
          unit: "sample-game",
          kind: "game-derived",
          why: "no dataset/own-art.json",
          files: 40,
          bytes: 300_000_000,
          neverCopied: false,
          destinations: {
            local: {
              state: "changed since",
              lastCopied: WHEN,
              changed: 2,
              files: 40,
            },
            repository: {
              state: "refused",
              why: "made from a game's or another's files",
            },
          },
        },
        {
          set: "notes",
          unit: null,
          kind: "own",
          why: "named so in the list",
          files: 3,
          bytes: 9000,
          neverCopied: true,
          destinations: {
            local: {
              state: "never copied",
              lastCopied: null,
              changed: 3,
              files: 3,
            },
            repository: {
              state: "never copied",
              lastCopied: null,
              changed: 3,
              files: 3,
            },
          },
        },
      ],
    },
  },
];

async function open(page: Page, copies: unknown) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    safe_copies_status: { result: copies },
    safe_copies_copy: {
      progress: [
        {
          label: "Copying to local",
          step: 1,
          of: 3,
          detail: "first/notes/a.json",
        },
      ],
      pauseMs: 50,
      result: {
        ok: true,
        title: "Safe copies: 5 files copied",
        refusal: null,
        data: {
          results: [
            {
              destination: "local",
              copied: [{ path: "a", bytes: 2048 }],
              same: 70,
              failed: [],
              warnings: [],
              git: null,
            },
            {
              destination: "repository",
              copied: [{ path: "a", bytes: 2048 }],
              same: 26,
              failed: [],
              warnings: [],
              git: { committed: true, pushed: true, error: null },
            },
          ],
        },
      },
    },
    safe_copies_check: {
      result: {
        ok: true,
        title: "Safe copies: 99 checked, all whole",
        refusal: null,
        data: {
          destinations: [{ destination: "local", checked: 99, problems: [] }],
        },
      },
    },
    pick_path: { result: "R:\\Sample\\Restored" },
    safe_copies_restore: {
      result: {
        ok: true,
        title: "Restored 30 files",
        refusal: null,
        data: { restored: 30, same: 0, replaced: 0 },
      },
    },
    safe_copies_let_go: {
      result: {
        ok: true,
        title: "Let go of 1 copies",
        refusal: null,
        data: { applied: true, letGo: ["first/saves/S1.rws"] },
      },
    },
  });
  await page.goto("/");
}

/** The same repository, with a commit not sent yet and a save that left the newest pair (kit 1.69.0). */
function waiting() {
  const copies = structuredClone(COPIES);
  const status = copies[0].status as unknown as {
    destinations: Record<string, unknown>[];
    keptOnly?: unknown[];
  };
  status.destinations[1] = { ...status.destinations[1], unsent: 2 };
  status.keptOnly = [
    {
      key: "first/saves/S1.rws",
      set: "saves",
      why: "no longer among the newest 2",
      bytes: 400_000_000,
      earlier: 3,
      earlierBytes: 1_200_000_000,
    },
  ];
  return copies;
}

async function noViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

test.describe("Safe copies on Home (0.42.0)", () => {
  test("each set says its kind and its state at each place, and what waits", async ({
    page,
  }) => {
    await open(page, COPIES);
    const card = page.getByRole("region", { name: "Safe copies" });
    await expect(card).toContainText("trainings / sample-ours");
    await expect(card).toContainText("Made from a game's files");
    await expect(card).toContainText("Not kept here");
    await expect(card).toContainText("2 files changed since");
    await expect(card).toContainText("One set has never been copied.");
    await expect(card).toContainText("S:\\Sample\\safe-copies");
    await noViolations(page);
  });

  test("Copy now says what it copied and that the repository's copy was sent", async ({
    page,
  }) => {
    await open(page, COPIES);
    const card = page.getByRole("region", { name: "Safe copies" });
    await card.getByRole("button", { name: "Copy now" }).click();
    await expect(card.getByRole("status")).toContainText("Copied 2 files");
    await expect(card.getByRole("status")).toContainText(
      "The repository's copy was sent.",
    );
    await card.getByRole("button", { name: "Check the copies" }).click();
    await expect(card.getByRole("status")).toContainText(
      "All 99 copies are whole.",
    );
    await noViolations(page);
  });

  test("a copy not sent yet stays said until it is sent (0.43.0)", async ({
    page,
  }) => {
    await open(page, waiting());
    const card = page.getByRole("region", { name: "Safe copies" });
    await expect(card).toContainText(
      "2 copies are committed but not sent yet; Copy now tries again.",
    );
    await noViolations(page);
  });

  test("Restore asks for a folder, then for a yes, before copying back (0.43.0)", async ({
    page,
  }) => {
    await open(page, COPIES);
    const card = page.getByRole("region", { name: "Safe copies" });
    await card
      .getByRole("button", { name: "Restore trainings / sample-ours…" })
      .click();
    const ask = card.getByRole("group", { name: "Waiting for your yes" });
    await expect(ask).toContainText("R:\\Sample\\Restored");
    await noViolations(page);
    await ask.getByRole("button", { name: "Copy it there" }).click();
    await expect(card.getByRole("status")).toContainText(
      "Restored 30 files into R:\\Sample\\Restored",
    );
  });

  test("a kept save is listed, and Let go asks before removing it (0.43.0)", async ({
    page,
  }) => {
    await open(page, waiting());
    const card = page.getByRole("region", { name: "Safe copies" });
    await expect(card).toContainText("Kept, no longer copied");
    await expect(card).toContainText("no longer among the newest 2");
    await card
      .getByRole("button", { name: "Let go of first/saves/S1.rws…" })
      .click();
    const ask = card.getByRole("group", { name: "Waiting for your yes" });
    await expect(ask).toContainText("its 3 older copies");
    await expect(ask).toContainText("is not touched");
    await ask.getByRole("button", { name: "Remove the copy" }).click();
    await expect(card.getByRole("status")).toContainText(
      "Let go of first/saves/S1.rws.",
    );
  });

  test("a game that lists none says so in one line", async ({ page }) => {
    await open(page, []);
    await expect(
      page.getByRole("region", { name: "Safe copies" }),
    ).toContainText("No repository of this game lists safe copies yet.");
  });
});
