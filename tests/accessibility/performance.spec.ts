import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

/** An invented recording, for the audit only. The program itself never shows sample data. */
const finding = {
  text: "The main thread stalled for 2,445 ms in Boats.Hull.Float, 21.1 s in; caused by Sample Boats 99.5%.",
  role: "risk",
  value: 2445,
  unit: "ms",
  refs: [
    {
      kind: "method",
      id: "Boats.Hull.Float",
      of: "Sample Boats",
      of_kind: "mod",
    },
    { kind: "mod", id: "Sample Boats", package: "sample.boats" },
  ],
};

const summary = {
  recording: "20261118-081449-a-sample-raid",
  label: "a sample raid",
  recorded_at: "2026-11-18 08:14:49",
  seconds: 30,
  game: { ticks_a_second: 570, frames_a_second: 55 },
  findings: [finding],
};

const older = {
  ...summary,
  recording: "20261117-190038-calm",
  label: "calm",
  recorded_at: "2026-11-17 19:00:38",
  findings: [],
};

const report = {
  format: 1,
  title: "sample-perf: 20261118-081449-a-sample-raid",
  facts: [
    { label: "Recorded", value: "2026-11-18 08:14:49" },
    { label: "Ticks a second", value: "570" },
  ],
  lines: ["Recorded 30 s of the sample game."],
  blocks: [{ type: "findings", items: [finding] }],
  sections: [
    {
      heading: "Ticking: who caused the time",
      level: 2,
      blocks: [
        {
          type: "table",
          headers: ["Caused by", "Share"],
          rows: [
            ["Sample Boats", "57.1%"],
            ["First Sample", "30.0%"],
          ],
          values: [
            [null, 57.1],
            [null, 30],
          ],
          total: 2,
          refs: [
            [
              {
                kind: "mod",
                id: "Sample Boats",
                column: 0,
                package: "sample.boats",
              },
            ],
            [],
          ],
        },
      ],
    },
  ],
};

const reading = (data: unknown, shown: unknown = null) => ({
  result: {
    available: true,
    report: shown,
    data,
    command_line: "python -m phobos_modkit sample-perf report",
  },
});

async function open(page: Page, available = true) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    performance_list: available
      ? reading({ recordings: [summary, older] })
      : {
          result: {
            available: false,
            report: null,
            data: null,
            command_line: "",
          },
        },
    performance_report: reading({ recording: summary.recording }, report),
  });
  await page.goto("/");
  await page.keyboard.press("Shift+F");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Where First Sample spends its time",
  );
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

async function smallControls(page: Page) {
  return page
    .locator("main")
    .evaluate(
      (root, min) =>
        [...root.querySelectorAll("button, summary, input")]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height < min).length,
      CONTROL_MIN_PX,
    );
}

async function overflow(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`Performance page, ${name}`, () => {
    test.use({ viewport });

    test("leads with what matters, each finding and row linked to where to act", async ({
      page,
    }) => {
      await open(page);
      const main = page.locator("main");
      await expect(main).toContainText("Read this first");
      await expect(
        page.getByRole("list", {
          name: "What matters most, most important first",
        }),
      ).toContainText("stalled for 2,445 ms");
      await expect(
        page.getByRole("button", {
          name: "Read Boats.Hull.Float on the Code map",
        }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("button", { name: "Open Sample Boats in the Mod list" })
          .first(),
      ).toBeVisible();
      await expect(main).toContainText("Recordings kept, newest first");
      await expect(main).toContainText("570 ticks a second");
      await audit(page);
      expect(await smallControls(page)).toBe(0);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });

    test("asks first before recording, every time", async ({ page }) => {
      await open(page);
      await page
        .getByRole("button", { name: /^Record for 30 seconds/ })
        .click();
      const card = page.getByRole("group", {
        name: "Record the running game?",
      });
      await expect(card).toContainText("Is your game saved?");
      await expect(card).toContainText("Nothing in the game is changed");
      await audit(page);
      await card.getByRole("button", { name: "Not now" }).click();
      await expect(card).toHaveCount(0);
    });

    test("says so when the game's tools have no recordings", async ({
      page,
    }) => {
      await open(page, false);
      await expect(page.locator("main")).toContainText(
        "no performance recordings for First Sample",
      );
      await audit(page);
    });
  });
}
