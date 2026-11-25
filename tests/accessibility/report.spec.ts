import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { agentsHidden, healthyKit, mockHost, sampleHome } from "./host";

test.describe("Something's off without agent sessions (0.100.0)", () => {
  test("makes a GitHub report shown whole first, and opens it only on a press", async ({
    page,
  }) => {
    await mockHost(page, {
      agent_features: agentsHidden,
      home_status: { result: sampleHome() },
      kit_status: healthyKit,
      report_home: { result: "C:\Users\someone" },
      report_preview: {
        result: {
          title: "Something's off on Home: the bar is drawn twice",
          body: "**What looks wrong**\n\nthe bar is drawn twice\n\n**Where**\n\n- Page: Home\n",
        },
      },
      report_open: { result: "Something's off, Home.png" },
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Something's off" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("the Companion sends nothing");
    const open = dialog.getByRole("button", { name: "Open on GitHub" });
    await expect(open).toBeDisabled();
    await dialog
      .getByLabel("What looks wrong? (optional, but it helps)")
      .fill("the bar is drawn twice");
    await dialog.getByRole("button", { name: "Show the report" }).click();
    await expect(
      dialog.getByRole("region", {
        name: "The report as it would open on GitHub",
      }),
    ).toContainText("- Page: Home");
    await expect(open).toBeEnabled();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .include("dialog")
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
    await open.click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "GitHub is open in your browser" }),
    ).toBeVisible();
  });
});
