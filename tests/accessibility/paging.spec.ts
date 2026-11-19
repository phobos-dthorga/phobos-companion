import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

/** An invented changelog with fourteen versions and a timeline of twenty-five days, for the audit only. */
const versions = Array.from({ length: 14 }, (_, i) => {
  const minor = 14 - i;
  return {
    version: `0.${minor}.0`,
    heading: `2026-11-${String(minor).padStart(2, "0")} - Draft`,
    summary: `Sample release ${minor}`,
    entries: [
      {
        version: `0.${minor}.0`,
        section: "Added",
        text: `**Boats ${minor}.** Sample change.`,
        lead: `Boats ${minor}.`,
        aboutSaves: false,
        commit: "4d332ddf0123",
      },
    ],
  };
});

const changes = [
  {
    repository: "first-mods",
    changelogs: [
      {
        changelog: "mods/Boats/CHANGELOG.md",
        product: "Sample Boats",
        versionsInAll: 14,
        versions,
      },
    ],
  },
];

const facts = Array.from({ length: 25 }, (_, i) => ({
  kind: "version-written",
  time: `2026-10-${String(i + 1).padStart(2, "0")}T02:00:00+00:00`,
  source: "git",
  product: "Sample Boats",
  repository: "first-mods",
  changelog: "mods/Boats/CHANGELOG.md",
  commit: "aaaaaaaa0123",
  subject: `Day ${i + 1}`,
  version: `0.${i + 1}.0`,
  count: 1,
  entries: [],
}));

async function open(page: Page) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    changes_list: { result: changes },
    test_lists: { result: [] },
    timeline: {
      result: { repositories: ["first-mods"], facts, log_exists: false },
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

test.describe("Paging further back", () => {
  test("Changes shows six versions a page, the page is part of the address, and Back returns", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Changes", exact: true }).click();
    const pager = page
      .getByRole("navigation", { name: "Pages of versions of Sample Boats" })
      .first();
    await expect(pager).toContainText("Page 1 of 3 · 1 to 6 of 14");
    await expect(page.getByRole("region", { name: "0.14.0" })).toBeVisible();
    await audit(page);
    await pager.getByRole("button", { name: "Older" }).click();
    await expect(pager).toContainText("Page 2 of 3 · 7 to 12 of 14");
    await expect(page.getByRole("region", { name: "0.8.0" })).toBeVisible();
    await expect(page.getByRole("region", { name: "0.14.0" })).toHaveCount(0);
    await page.getByRole("button", { name: "Copy address" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      "page=2",
    );
    await pager.getByRole("button", { name: "Oldest" }).click();
    await expect(page.getByRole("region", { name: "0.1.0" })).toBeVisible();
    await page.keyboard.press(",");
    await expect(pager).toContainText("Page 2 of 3");
  });

  test("the Timeline shows ten days a page, newest first", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    const pager = page
      .getByRole("navigation", { name: "Pages of days" })
      .first();
    await expect(pager).toContainText("Page 1 of 3 · 1 to 10 of 25");
    await pager.getByRole("button", { name: "Oldest" }).click();
    await expect(pager).toContainText("Page 3 of 3 · 21 to 25 of 25");
    await audit(page);
  });
});
