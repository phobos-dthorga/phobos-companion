import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

/** A slow, invented reading of the Make-up page, for the audit only: three stages, a moment apart. */
const steps = [
  { label: "Listing the committed files" },
  { label: "Counting lines in 12 file versions", step: 1, of: 2 },
  { label: "Placing each file in its mod", step: 1, of: 3 },
  { label: "Placing each file in its mod", step: 2, of: 3 },
];

const now = {
  repository: "first-mods",
  commit: "4d332ddf0123",
  kinds: ["code"],
  products: ["Sample Boats"],
  files: [
    {
      path: "src/Boat.cs",
      product: "Sample Boats",
      group: null,
      kind: "code",
      language: "C#",
      bytes: 900,
      lines: 40,
    },
  ],
};

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    "makeup:now": { result: now, progress: steps, pauseMs: 450 },
    "makeup:growth": {
      result: { repository: "first-mods", kinds: ["code"], points: [] },
    },
    "makeup:churn": {
      result: { repository: "first-mods", days: 30, files: [] },
    },
    "makeup:census": { result: { repository: "first-mods", products: {} } },
    test_lists: { result: [] },
  });
  await page.goto("/");
}

test.describe("Progress you can follow", () => {
  test("a bar keeps a trail of finished steps, and the strip under the page bar follows slow work to its end", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Make-up", exact: true }).click();
    const trail = page.getByRole("list", { name: "Steps so far" });
    await expect(trail).toContainText("Listing the committed files");
    await expect(trail).toContainText("Counting lines in 12 file versions");
    await expect(trail.locator('[aria-current="step"]')).toContainText(
      "Placing each file in its mod",
    );
    const strip = page.locator(".strip [role=status]");
    await expect(strip).toContainText("Placing each file in its mod");
    await expect(strip).toContainText(/Done: .*, in \d+\.\d s/);
    await expect(page.locator("main")).toContainText("1 committed files");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
