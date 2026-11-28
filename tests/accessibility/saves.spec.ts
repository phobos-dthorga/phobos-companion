import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

/** An invented save, for the audit only. The program itself never shows sample data. */
const reading = (report: unknown, data: unknown = {}) => ({
  result: {
    available: true,
    report,
    data,
    command_line: "python -m phobos_modkit sample-save thing -- Human200",
  },
});

const parts = reading(
  { format: 1, title: "Element paths", lines: [], blocks: [], sections: [] },
  {
    under: "",
    paths: [
      { path: "savegame", count: 1 },
      { path: "savegame/game", count: 1 },
      { path: "savegame/meta", count: 1 },
    ],
  },
);

const found = reading({
  format: 1,
  title: "In this save: Annie",
  lines: ["Searched names, IDs and kinds."],
  blocks: [],
  sections: [
    {
      heading: "People and animals",
      level: 2,
      blocks: [
        {
          type: "table",
          headers: ["Name", "ID", "Race", "Faction", "Place"],
          rows: [["Annie", "Human200", "Human", "Sample Colony", "map"]],
          values: [[null, null, null, null, null]],
          total: 1,
          refs: [
            [
              { kind: "thing", id: "Human200", column: 0 },
              { kind: "thing", id: "Human200", column: 1 },
            ],
          ],
        },
      ],
    },
  ],
});

const thing = reading({
  format: 1,
  title: "Human200: what the save holds for it",
  facts: [
    { label: "Kind", value: "human" },
    { label: "Defined by", value: "Core" },
  ],
  lines: ["Human200: Human (Pawn), on map 0 at 10, 12."],
  blocks: [],
  sections: [
    {
      heading: "Values",
      level: 2,
      blocks: [
        {
          type: "table",
          headers: ["Path", "Value"],
          rows: [["health/hediffSet", "3 conditions"]],
          values: [[null, null]],
          total: 1,
        },
      ],
    },
  ],
});

async function open(page: Page, available = true) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    "save_explorer_read:parts": available
      ? parts
      : {
          result: {
            available: false,
            report: null,
            data: null,
            command_line: "",
          },
        },
    "save_explorer_read:search": found,
    "save_explorer_read:thing": thing,
  });
  await page.goto("/");
  await page.keyboard.press("Shift+V");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "What First Sample's saves hold",
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
        [...root.querySelectorAll("button, summary, input, select")]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height < min).length,
      CONTROL_MIN_PX,
    );
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`Save explorer, ${name}`, () => {
    test.use({ viewport });

    test("opens a part at a time, finds a person, and opens them in full", async ({
      page,
    }) => {
      await open(page);
      const parts = page.getByRole("region", { name: "What it holds" });
      await expect(parts).toContainText("savegame");
      await audit(page);
      await page.getByLabel(/Find anything/).fill("Annie");
      await page.getByRole("button", { name: "Find", exact: true }).click();
      const results = page.getByRole("region", { name: /What matches/ });
      await expect(results).toContainText("Human200");
      await results.getByRole("button", { name: "Annie" }).click();
      const one = page.getByRole("region", { name: "Human200, in full" });
      await expect(one).toContainText("Defined by");
      await expect(one).toContainText("health/hediffSet");
      await audit(page);
      expect(await smallControls(page)).toBe(0);
    });

    test("says so when the game's tools cannot read its saves", async ({
      page,
    }) => {
      await open(page, false);
      await expect(page.locator("main")).toContainText(
        "The tools cannot read First Sample's saves yet",
      );
      await audit(page);
    });
  });
}
