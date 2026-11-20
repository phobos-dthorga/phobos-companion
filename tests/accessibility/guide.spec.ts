import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

/** The Guide (0.34.0): F1, search, links, Take me there and Back. Its entries are the real ones, built into the window. */
async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    decisions_list: { result: { repositories: [], answered: [] } },
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`Guide, ${name}`, () => {
    test.use({ viewport });

    test("F1 opens the entry for the page you are on", async ({ page }) => {
      await open(page);
      await page.keyboard.press("d");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Decisions waiting for you",
      );
      await page.keyboard.press("F1");
      const entry = page.getByRole("article");
      await expect(entry.getByRole("heading", { level: 2 })).toHaveText(
        "Decisions",
      );
      await expect(entry).toContainText(
        "taking the lean is one press of Decide",
      );
      await audit(page);
    });

    test("a search finds the answer; a link, Take me there and Back all work", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("group", { name: "Tools" })
        .getByRole("button", { name: "Guide", exact: true })
        .click();
      await page.getByLabel("Search the Guide").fill("go back");
      await expect(
        page
          .getByRole("navigation", { name: "The Guide's entries" })
          .getByRole("status"),
      ).toContainText("entries found");
      await page
        .getByRole("navigation", { name: "The Guide's entries" })
        .getByRole("button", { name: /Go back to an older version of a mod/ })
        .click();
      const entry = page.getByRole("article");
      await expect(entry.getByRole("heading", { level: 2 })).toHaveText(
        "Go back to an older version of a mod",
      );
      await expect(entry).toContainText("Close the game");
      await audit(page);

      await entry.getByRole("button", { name: "Backup", exact: true }).click();
      await expect(entry.getByRole("heading", { level: 2 })).toHaveText(
        "Backup",
      );
      await page.keyboard.press(",");
      await expect(entry.getByRole("heading", { level: 2 })).toHaveText(
        "Go back to an older version of a mod",
      );

      await page.getByLabel("Search the Guide").fill("");
      await page
        .getByRole("navigation", { name: "The Guide's entries" })
        .getByRole("button", { name: "Answer a question an agent asked you" })
        .click();
      await entry.getByRole("button", { name: "Take me there" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Decisions waiting for you",
      );
      await page.keyboard.press(",");
      await expect(page.getByRole("article")).toContainText(
        "Answer a question an agent asked you",
      );
    });

    test("Go to anything finds the Guide's entries too", async ({ page }) => {
      await open(page);
      await page.keyboard.press("/");
      const search = page.getByRole("dialog", { name: "Where to?" });
      await search
        .getByLabel("Search for anything, or paste an address")
        .fill("theme");
      await expect(search.getByRole("region", { name: "Guide" })).toBeVisible();
      await search
        .getByRole("button", {
          name: /Change how the Companion looks, or make a theme/,
        })
        .click();
      await expect(page.getByRole("article")).toContainText(
        "Make your own from this",
      );
    });
  });
}
