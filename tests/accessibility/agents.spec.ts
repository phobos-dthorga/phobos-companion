import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  agentsHidden,
  healthyKit,
  mockHost,
  openTab,
  sampleHome,
} from "./host";

/** Features for AI agent sessions (0.37.0): hidden unless switched on, or found in a repository. Invented data, for the audit only. */
async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    agent_features: agentsHidden,
    choose_agent_features: {
      result: { choice: "on", shown: true, signs: [] },
    },
    settings_list: {
      result: {
        central_file: "C:\\Sample\\settings.json",
        central_exists: false,
        settings: [],
      },
    },
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "First Sample today",
  );
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

test.describe("Features for agent sessions", () => {
  test("nothing found: no Something's off, no Decisions, no D key", async ({
    page,
  }) => {
    await open(page);
    await expect(
      page.getByRole("button", { name: "Something's off" }),
    ).toHaveCount(0);
    const bar = page.getByRole("navigation", { name: /pages/i });
    await expect(bar.getByRole("button", { name: "Decisions" })).toHaveCount(0);
    await page.locator("main").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("d");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "First Sample today",
    );
    await audit(page);
  });

  test("Settings shows them on a press, at once, and says so", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await openTab(page, "Agent sessions");
    const panel = page.locator("#settings-agents");
    await expect(panel).toContainText("Hidden now.");
    await expect(panel).toContainText("Nothing on this PC shows");
    await audit(page);
    await panel.getByRole("button", { name: "Always" }).click();
    await expect(panel.getByRole("status")).toContainText(
      "They are shown now.",
    );
    await expect(panel.getByRole("button", { name: "Always" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page.getByRole("button", { name: "Something's off" }),
    ).toBeVisible();
  });

  test("the Guide keeps their entries, marked, with the way to show them", async ({
    page,
  }) => {
    await open(page);
    await page.keyboard.press("F1");
    await page.getByRole("button", { name: "Claim", exact: true }).click();
    const article = page.getByRole("article");
    await expect(article).toContainText("It is hidden now");
    await article
      .getByRole("button", { name: "Show them, in Settings" })
      .click();
    await expect(page.locator("#settings-agents")).toBeVisible();
  });
});
