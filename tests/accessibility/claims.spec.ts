import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const BOARD = {
  board: "C:\\Sample\\claims.json",
  oldHours: 24,
  claims: [
    {
      what: "sample-kit 2.0.0",
      by: "sample-session-1",
      taken: "2026-11-17T22:00:00+00:00",
      hours: 36,
      old: true,
    },
    {
      what: "First Sample row 12",
      by: "sample-session-2",
      taken: "2026-11-19T09:40:00+00:00",
      note: "trying the new lamp",
      hours: 0.3,
      old: false,
    },
  ],
};

test.describe("Claims board", () => {
  test("Home shows who holds what, for how long, and which claims are old", async ({
    page,
  }) => {
    await mockHost(page, {
      home_status: { result: sampleHome() },
      kit_status: healthyKit,
      claims_list: { result: BOARD },
    });
    await page.goto("/");
    await page.getByRole("tab", { name: "Repositories" }).click();
    const panel = page.getByRole("region", { name: "Who is working on what" });
    await expect(panel).toContainText("sample-kit 2.0.0");
    await expect(panel).toContainText("sample-session-1, for 36 hours: old");
    await expect(panel).toContainText("sample-session-2, for 18 minutes");
    await expect(panel).toContainText("trying the new lamp");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test("An empty board says so", async ({ page }) => {
    await mockHost(page, {
      home_status: { result: sampleHome() },
      kit_status: healthyKit,
      claims_list: { result: { ...BOARD, claims: [] } },
    });
    await page.goto("/");
    await page.getByRole("tab", { name: "Repositories" }).click();
    await expect(
      page.getByRole("region", { name: "Who is working on what" }),
    ).toContainText("No agent session holds anything right now.");
  });
});
