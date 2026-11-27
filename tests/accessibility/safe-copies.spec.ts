import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const WHEN = "2026-11-21T11:40:29+00:00";

/** One invented repository listing safe copies: a proven training of ours, one made from a game's files, and a note set. */
const COPIES = [
  {
    repository: "first-mods",
    list: false,
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

/** The daily run as the kit answers (kit 1.71.0): set or not, and how the last run went. */
function dailyAnswer(at: string | null, lastOk = true) {
  return {
    ok: true,
    title: at ? `Daily safe copies: every day at ${at}` : "not set",
    refusal: null,
    data: {
      ok: true,
      schedule: at
        ? { set: true, supported: true, enabled: true, at }
        : { set: false, supported: true },
      next: at ? "2026-11-23T03:00" : null,
      last: {
        time: WHEN,
        ok: lastOk,
        copied: 12,
        problems: lastOk ? [] : ["gone-repo: not on this PC"],
      },
    },
  };
}

/** The same repository, and the game's own list kept in the shared tools' repository (0.44.0): two saves that are folders. */
function withGameList() {
  return [
    ...structuredClone(COPIES),
    {
      repository: "shared-tools",
      list: true,
      title: "Safe copies: everything copied",
      command_line: "python -m phobos_modkit safe-copies status --game first",
      status: {
        game: "first",
        list: "shared-tools:first",
        notes: [],
        destinations: COPIES[0].status.destinations.slice(0, 1),
        sets: [
          {
            set: "saves",
            unit: "PG10",
            kind: "personal",
            why: "named so in the list; the newest 2",
            files: 3648,
            bytes: 341_000_000,
            neverCopied: false,
            destinations: {
              local: {
                state: "copied",
                lastCopied: WHEN,
                changed: 0,
                files: 3648,
              },
            },
          },
        ],
        keptOnly: [
          {
            key: "first/saves/PG9",
            set: "saves",
            why: "no longer among the newest 2",
            bytes: 340_000_000,
            files: 3640,
            earlier: 0,
            earlierBytes: 0,
          },
        ],
      },
    },
  ];
}

async function open(page: Page, copies: unknown, daily = dailyAnswer(null)) {
  await mockHost(page, {
    safe_copies_daily: { result: daily },
    safe_copies_set_daily: { result: dailyAnswer("03:00") },
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
  await page.keyboard.press("Shift+B");
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

test.describe("Safe copies, its own page since 0.95.0 (0.42.0)", () => {
  test("Home shows a line while something waits, and opens the page (0.95.0)", async ({
    page,
  }) => {
    await mockHost(page, {
      home_status: { result: sampleHome() },
      kit_status: healthyKit,
      safe_copies_daily: { result: dailyAnswer(null) },
      safe_copies_status: { result: COPIES },
    });
    await page.goto("/");
    await page.getByRole("tab", { name: "Repositories" }).click();
    const line = page.getByRole("region", { name: "Safe copies wait" });
    await expect(line).toContainText("One set has never been copied.");
    await line.getByRole("button", { name: "Open Safe copies" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: /What can't be made again/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Safe copies" }),
    ).toBeVisible();
    await noViolations(page);
  });

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

  test("the game's own saves and settings show beside its repository's list (0.44.0)", async ({
    page,
  }) => {
    await open(page, withGameList());
    const card = page.getByRole("region", { name: "Safe copies" });
    await expect(card).toContainText(
      "The game's own files: saves and settings (listed in shared-tools)",
    );
    await expect(card).toContainText("saves / PG10");
    await expect(card).toContainText("first/saves/PG9");
    await expect(card.getByRole("button", { name: "Copy now" })).toHaveCount(2);
    await card
      .getByRole("button", { name: "Let go of first/saves/PG9…" })
      .click();
    await expect(
      card.getByRole("group", { name: "Waiting for your yes" }),
    ).toHaveCount(1);
    await noViolations(page);
  });

  test("the daily run is set with a press and says when it runs (0.44.0)", async ({
    page,
  }) => {
    await open(page, COPIES);
    const daily = page.getByRole("group", { name: "Daily safe copies" });
    await expect(daily).toContainText("The daily run is off");
    await expect(daily).toContainText("Last run");
    await daily.getByRole("button", { name: "Every day at 03:00" }).click();
    await expect(daily).toContainText("Every day at 03:00, every list");
    await expect(
      daily.getByRole("button", { name: "Every day at 03:00" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(daily.getByRole("button", { name: "Turn off" })).toBeVisible();
    await noViolations(page);
  });

  test("a daily run with problems says the first (0.44.0)", async ({
    page,
  }) => {
    await open(page, COPIES, dailyAnswer("19:00", false));
    const daily = page.getByRole("group", { name: "Daily safe copies" });
    await expect(daily).toContainText("with problems, first: gone-repo");
  });

  test("a game that lists none says so in one line", async ({ page }) => {
    await open(page, []);
    await expect(
      page.getByRole("region", { name: "Safe copies" }),
    ).toContainText("No repository of this game lists safe copies yet.");
  });
});
