import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const TYPE_FLOOR_PX = 12;
const CONTROL_MIN_PX = 44;

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

async function layoutHolds(page: Page) {
  const sizes = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3))
      .map((e) => parseFloat(getComputedStyle(e).fontSize)),
  );
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(TYPE_FLOOR_PX);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(name, () => {
    test.use({ viewport });

    test("browser preview: has all five bands and says what it is", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.locator(".command-bar")).toBeVisible();
      await expect(page.locator(".observation-bar")).toBeVisible();
      await expect(page.locator(".navigator")).toBeVisible();
      await expect(page.locator("main.canvas")).toBeVisible();
      await expect(page.locator(".inspector")).toBeVisible();
      await expect(page.locator(".inspector")).toContainText("browser preview");
      await audit(page);
    });

    test.describe("with games", () => {
      test.beforeEach(async ({ page }) => {
        await mockHost(page, {
          home_status: { result: sampleHome() },
          kit_status: healthyKit,
        });
        await page.goto("/");
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          "First Sample today",
        );
      });

      test("answers first, with the newest game chosen", async ({ page }) => {
        await expect(page.locator(".canvas")).toContainText(
          "The last thing you did: A sample change made today",
        );
        await expect(page.locator(".canvas")).toContainText(
          "4 files changed but not committed",
        );
        await expect(page.locator(".canvas")).toContainText(
          "Version 1.2.0, drafted 9 Nov 2026 and 2 earlier drafts",
        );
        await expect(page.locator(".inspector")).toContainText(
          "15 tools found.",
        );
        await page.screenshot({
          path: `artifacts/home-${name}.png`,
          fullPage: true,
        });
      });

      test("passes the accessibility audit", async ({ page }) => {
        await audit(page);
      });

      test("keeps text above the floor and inside the window", async ({
        page,
      }) => {
        await layoutHolds(page);
      });

      test("keeps every control big enough", async ({ page }) => {
        const heights = await page
          .getByRole("button")
          .evaluateAll((buttons) =>
            buttons.map((b) => b.getBoundingClientRect().height),
          );
        expect(Math.min(...heights)).toBeGreaterThanOrEqual(CONTROL_MIN_PX);
      });

      test("changes game from the keyboard", async ({ page }) => {
        await page.getByRole("button", { name: /Second Sample/ }).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          "You left Second Sample 40 days ago.",
        );
        await expect(
          page.getByRole("button", { name: /Second Sample/ }),
        ).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator(".canvas")).not.toContainText(
          "Left unfinished",
        );
      });

      test("says so when a game has no history", async ({ page }) => {
        await page.getByRole("button", { name: /Third Sample/ }).click();
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          "Nothing recorded for Third Sample yet.",
        );
      });

      test("looks again and says when", async ({ page }) => {
        await page.getByRole("button", { name: "Look again" }).click();
        await expect(page.locator(".observation-bar")).toContainText("Read at");
        await expect(
          page.getByRole("button", { name: "Look again" }),
        ).toBeEnabled();
      });
    });

    test("no list yet says what to do", async ({ page }) => {
      await mockHost(page, {
        home_status: { result: { list_found: false, games: [] } },
        kit_status: healthyKit,
      });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "No games are listed yet.",
      );
      await expect(page.locator(".canvas")).toContainText(".local/games.json");
      await audit(page);
    });

    test("a broken list says what happened, what stayed safe, what to do", async ({
      page,
    }) => {
      await mockHost(page, {
        home_status: {
          failure: { code: "list_unreadable", detail: "games.json: line 3" },
        },
        kit_status: {
          failure: { code: "python_missing", detail: "not found" },
        },
      });
      await page.goto("/");
      const canvas = page.locator(".canvas");
      await expect(canvas).toContainText("has a mistake in it");
      await expect(canvas).toContainText("Nothing was changed.");
      await expect(canvas).toContainText("config/games.example.json");
      await expect(page.locator(".inspector")).toContainText(
        "Python could not be started.",
      );
      await audit(page);
      await layoutHolds(page);
    });
  });
}
