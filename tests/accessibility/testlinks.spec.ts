import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

/** Invented readings, for the audit only: one changelog, one test row its version brought, and the code that notes it. */
const changes = [
  {
    repository: "first-mods",
    changelogs: [
      {
        changelog: "mods/Boats/CHANGELOG.md",
        product: "Sample Boats",
        versionsInAll: 1,
        versions: [
          {
            version: "1.3.0",
            heading: "2026-11-18 - Draft",
            summary: "Boats",
            entries: [
              {
                version: "1.3.0",
                section: "Added",
                text: "**Sample sails.** Boats have sails.",
                lead: "Sample sails.",
                aboutSaves: false,
                commit: "4d332ddf0123",
              },
            ],
          },
        ],
      },
    ],
  },
];

function row(id: string, title: string, version: string) {
  return {
    id,
    section: "Boats",
    title,
    status: "open",
    cells: { "#": id, "What it proves": title },
    seen: [],
    evidence_keys: [`boats.${id}`],
    versions: { "Sample Boats": version },
    verdict: null,
    pending: null,
  };
}

const lists = [
  {
    repository: "first-mods",
    title: "In-game test pass",
    rows: [row("12", "Boats float", "1.3.0"), row("13", "Boats sink", "1.2.0")],
    unrowed: [],
    order_problems: [],
    command_line: "python -m phobos_modkit test-pass report",
  },
];

const tick = {
  id: "cs:Sample.Boat.Tick",
  name: "Boat.Tick",
  kind: "method",
  language: "csharp",
  file: "src/Boat.cs",
  line: 10,
  end: 20,
  owner: null,
  external: false,
  assembly: null,
  exact: true,
  connections: 1,
};

const places = {
  doc: "docs/tests.md",
  places: [
    {
      key: "boats.12",
      prefix: false,
      file: "src/Boat.cs",
      line: 12,
      thing: { id: tick.id, name: tick.name, kind: "method" },
      rows: ["12"],
    },
  ],
  unplaced: [],
};

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    changes_list: { result: changes },
    test_lists: { result: lists },
    test_code: { result: places },
    "connections:summary": {
      result: {
        ok: true,
        refusal: null,
        data: {
          readers: [{ language: "csharp", how: "exact", nodes: 10, edges: 20 }],
          seconds: 0.1,
        },
      },
    },
    "connections:around": {
      result: { ok: true, refusal: null, data: { centre: tick, groups: [] } },
    },
  });
  await page.goto("/");
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

test.describe("Test rows joined to code and changes", () => {
  test("a test row opens the code that notes it, and the Code map names the rows it watches", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Tests", exact: true }).click();
    await page.getByRole("button", { name: /^Waiting/ }).click();
    const button = page.getByRole("button", {
      name: "Boat.Tick (src/Boat.cs:12)",
    });
    await expect(button).toBeVisible();
    await audit(page);
    await button.click();
    await expect(heading(page)).toContainText(
      "How First Sample's code fits together",
    );
    const watching = page.getByRole("region", {
      name: "In-game tests watching Boat.Tick",
    });
    await expect(watching).toBeVisible();
    await audit(page);
    await watching.getByRole("button", { name: "Row 12: Boats float" }).click();
    await expect(page.locator("#row-first-mods\\/12")).toBeVisible();
  });

  test("a version names the test rows still waiting on it", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Changes", exact: true }).click();
    const version = page.getByRole("region", { name: "1.3.0" });
    await expect(version).toContainText(
      "In-game tests still waiting on this version:",
    );
    await expect(
      version.getByRole("button", { name: "Row 13: Boats sink" }),
    ).toHaveCount(0);
    await audit(page);
    await version.getByRole("button", { name: "Row 12: Boats float" }).click();
    await expect(page.locator("#row-first-mods\\/12")).toBeVisible();
  });
});
