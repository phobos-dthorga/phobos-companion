import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const TYPE_FLOOR_PX = 12;

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(name, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("has all five bands", async ({ page }) => {
      await expect(page.locator(".command-bar")).toBeVisible();
      await expect(page.locator(".observation-bar")).toBeVisible();
      await expect(page.locator(".navigator")).toBeVisible();
      await expect(page.locator("main.canvas")).toBeVisible();
      await expect(page.locator(".inspector")).toBeVisible();
      await page.screenshot({
        path: `artifacts/shell-${name}.png`,
        fullPage: true,
      });
    });

    test("says it is a preview when the host is not there", async ({
      page,
    }) => {
      await expect(page.locator(".inspector")).toContainText("browser preview");
    });

    test("passes the accessibility audit", async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });

    test("keeps text above the floor and inside the window", async ({
      page,
    }) => {
      const sizes = await page.evaluate(() =>
        [...document.querySelectorAll("body *")]
          .filter(
            (e) =>
              e.childNodes.length &&
              [...e.childNodes].some((n) => n.nodeType === 3),
          )
          .map((e) => parseFloat(getComputedStyle(e).fontSize)),
      );
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(TYPE_FLOOR_PX);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}
