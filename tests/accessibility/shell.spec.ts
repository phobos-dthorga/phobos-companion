import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const TYPE_FLOOR_PX = 12;
const CONTROL_MIN_PX = 44;
/** The page list's rows: the owner's choice of 23 Nov 2026 (0.66.0), the one exception to the 44 px rule. */
const PAGE_ROW_MIN_PX = 40;

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

    // One bar on top since 0.66.0, where there were two, and the pages listed down the left.
    test("browser preview: has the bar, the page list, the page and its details, and says what it is", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.locator(".command-bar")).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Pages" }),
      ).toBeVisible();
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
        await page.getByRole("tab", { name: "Recent work" }).click();
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
          .locator("button:not(.rail .page)")
          .evaluateAll((buttons) =>
            buttons.map((b) => b.getBoundingClientRect().height),
          );
        expect(Math.min(...heights)).toBeGreaterThanOrEqual(CONTROL_MIN_PX);
        const rows = await page
          .getByRole("navigation", { name: "Pages" })
          .getByRole("button")
          .evaluateAll((buttons) =>
            buttons.map((b) => b.getBoundingClientRect().height),
          );
        expect(rows.length).toBeGreaterThan(10);
        expect(Math.min(...rows)).toBeGreaterThanOrEqual(PAGE_ROW_MIN_PX);
      });

      // The games are a picker in the top bar since 0.66.0: it opens on the game looked at, and the arrows move along the list.
      test("changes game from the keyboard", async ({ page }) => {
        const picker = page.getByRole("button", { name: /Looking at/ });
        await picker.focus();
        await page.keyboard.press("Enter");
        await expect(picker).toHaveAttribute("aria-expanded", "true");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          "You left Second Sample 40 days ago.",
        );
        await expect(picker).toContainText("Second Sample");
        await expect(picker).toHaveAttribute("aria-expanded", "false");
        await expect(page.locator(".canvas")).not.toContainText(
          "Left unfinished",
        );
      });

      test("lists your games on Home, each with when you last worked on it", async ({
        page,
      }) => {
        await page.getByRole("tab", { name: "Recent work" }).click();
        const panel = page.getByRole("region", { name: "Your games" });
        await expect(panel).toContainText("Second Sample");
        await panel
          .getByRole("button", { name: "Look at Second Sample" })
          .click();
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          "You left Second Sample 40 days ago.",
        );
      });

      test("Escape closes the games without changing game", async ({
        page,
      }) => {
        const picker = page.getByRole("button", { name: /Looking at/ });
        await picker.click();
        await expect(page.locator("#game-picker-list")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.locator("#game-picker-list")).toHaveCount(0);
        await expect(picker).toBeFocused();
        await expect(picker).toContainText("First Sample");
      });

      test("says so when a game has no history", async ({ page }) => {
        await page.getByRole("tab", { name: "Recent work" }).click();
        await page.getByRole("button", { name: /Third Sample/ }).click();
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          "Nothing recorded for Third Sample yet.",
        );
      });

      test("looks again and says when", async ({ page }) => {
        await page.getByRole("button", { name: "Look again" }).click();
        await expect(page.locator(".command-bar")).toContainText("Read at");
        await expect(
          page.getByRole("button", { name: "Look again" }),
        ).toBeEnabled();
      });
    });

    // 0.67.0: the page list's numbers come from scans made in the background, each a reading a page already makes.
    test("numbers the mod list's faults and sort moves, and the log's new errors", async ({
      page,
    }) => {
      await mockHost(page, {
        home_status: { result: sampleHome() },
        kit_status: healthyKit,
        mod_list_check: {
          result: {
            game: "first",
            name: "First Sample",
            supported: true,
            version: "1.0",
            online: false,
            notes: [],
            installed: 3,
            running: [],
            lists: [
              {
                key: "active",
                label: "Your active mods",
                path: "ModsConfig.xml",
                count: 3,
                writable: true,
              },
            ],
            problems: [],
            counts: { problem: 1, warning: 0, note: 5 },
            backups: [],
            since: { active: { verdict: "new-errors", new_errors: 2 } },
          },
        },
        mod_list_sort: {
          result: {
            ok: true,
            title: "sorted",
            refusal: null,
            data: { moves: [{}, {}, {}], applied: false },
          },
        },
      });
      await page.goto("/");
      const pages = page.getByRole("navigation", { name: "Pages" });
      // One fault and three mods a sort would move; notes are not counted.
      await expect(
        pages.getByRole("button", { name: "Mod list", exact: true }),
      ).toHaveAccessibleDescription("4 waiting on you");
      await expect(
        pages.getByRole("button", { name: "Logs", exact: true }),
      ).toHaveAccessibleDescription("2 waiting on you");
      // A page whose scan found nothing, or could not be read, has no number.
      await expect(
        pages.getByRole("button", { name: "Mods", exact: true }),
      ).toHaveAccessibleDescription("");
      await audit(page);
    });

    test("no list yet says what to do", async ({ page }) => {
      await mockHost(page, {
        home_status: { result: { list_found: false, games: [] } },
        kit_status: healthyKit,
      });
      await page.goto("/");
      // From 0.36.0 a PC with no list is welcomed with First steps, not told to write a file (first-steps.spec.ts).
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Welcome to D'thorga Companion",
      );
      await expect(page.locator(".canvas")).toContainText(
        "Where are your mod projects?",
      );
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
