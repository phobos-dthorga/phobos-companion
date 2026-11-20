import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost } from "./host";

/** First steps (0.36.0): a PC where no games list is kept yet. Invented paths, for the audit only. */
const LIST =
  "C:\\Users\\you\\AppData\\Local\\org.phobosdthorga.companion\\games.json";
const empty = (listFound: boolean, gitFound = true) => ({
  list_found: listFound,
  games: [],
  git_found: gitFound,
  list_file: LIST,
});

async function open(
  page: Page,
  gitFound = true,
  more: Record<string, unknown> = {},
) {
  await mockHost(page, {
    home_status: { result: empty(false, gitFound) },
    kit_status: healthyKit,
    start_games_list: { result: LIST },
    pick_path: { result: null },
    ...more,
  });
  // Once the list is started, Home reads it as started and empty.
  await page.addInitScript(
    (started) => {
      const scope = window as unknown as {
        __TAURI_INTERNALS__: {
          invoke: (c: string, a: unknown, o: unknown) => Promise<unknown>;
        };
        began: boolean;
      };
      scope.began = false;
      const invoke = scope.__TAURI_INTERNALS__.invoke;
      scope.__TAURI_INTERNALS__.invoke = async (command, args, options) => {
        if (command === "start_games_list") scope.began = true;
        if (command === "home_status" && scope.began) return started;
        return invoke(command, args, options);
      };
    },
    empty(true, gitFound),
  );
  await page.goto("/");
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

test.describe("First steps", () => {
  test("a new PC is welcomed, starts its list, then adds a first game", async ({
    page,
  }) => {
    await open(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Welcome to D'thorga Companion",
    );
    await expect(page.locator("main")).toContainText(LIST);
    await audit(page);
    await page
      .getByRole("button", { name: "They're not in one folder" })
      .click();
    await expect(
      page.getByRole("heading", { name: "2. Add your first game" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add a game from Steam" }),
    ).toBeVisible();
    await audit(page);
  });

  test("a closed folder picker changes nothing, and says so", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Choose the folder…" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText(
      "closed without choosing a folder",
    );
    await expect(
      page.getByRole("heading", { name: "1. Where are your mod projects?" }),
    ).toBeVisible();
  });

  test("without git, every page says so, and where to get it", async ({
    page,
  }) => {
    await open(page, false);
    await expect(page.locator(".no-git")).toContainText("git isn't installed");
    await expect(page.locator(".no-git")).toContainText("git-scm.com");
    await audit(page);
  });

  test("First steps leads to its entry in the Guide", async ({ page }) => {
    await open(page);
    await page
      .getByRole("button", { name: "Read First steps in the Guide" })
      .click();
    await expect(page.getByRole("article")).toContainText(
      "First steps: start using the Companion",
    );
  });
});
