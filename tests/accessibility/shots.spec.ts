import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

/** Screenshots on the Timeline (0.32.0). Invented facts and pictures, for the audit only. */
const PNG = Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEElEQVR4nGM4YaMBRwzIHAB++glhzkZgJwAAAABJRU5ErkJggg==",
    "base64",
  ),
);

/** Noon, local time, on a day: the Timeline names days by the local calendar. */
const at = (day: string) =>
  Math.floor(new Date(`${day}T12:00:00`).getTime() / 1000);

const shot = (name: string, day: string) => ({
  path: `C:\\Steam\\userdata\\9\\760\\remote\\4242\\screenshots\\${name}`,
  name,
  bytes: 70,
  taken: at(day),
  source: "C:\\Steam\\userdata\\9\\760\\remote\\4242\\screenshots",
});

const timeline = {
  repositories: ["first-mods"],
  log_exists: true,
  facts: [
    {
      kind: "installed",
      time: new Date(at("2026-11-18") * 1000).toISOString(),
      source: "log",
      product: "Sample Mod",
      mod: "SampleMod",
      repository: "first-mods",
      version: "1.2.0",
    },
  ],
};

const screenshots = {
  name: "First Sample",
  folders: ["C:\\Steam\\userdata\\9\\760\\remote\\4242\\screenshots"],
  list: [
    shot("evening-raid.png", "2026-11-20"),
    shot("morning-harvest.png", "2026-11-20"),
    shot("new-base.png", "2026-11-18"),
  ],
  count: 3,
  bytes: 210,
};

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    timeline: { result: timeline },
    game_screenshots: { result: screenshots },
    screenshot: { result: PNG },
    show_game_file: { result: null },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

test.describe("Screenshots on the Timeline", () => {
  test("each picture sits on its day, a day of only pictures included, and opens whole", async ({
    page,
  }) => {
    await open(page);
    await expect(page.getByText("Screenshots", { exact: true })).toBeVisible();
    const cell = page.getByRole("button", { name: /^2 screenshots on / });
    await expect(cell).toBeVisible();

    await cell.click();
    const day = page
      .getByRole("group", { name: /^Screenshots taken on / })
      .first();
    await expect(day).toBeVisible();
    await expect(
      page.getByText("Nothing else happened this day"),
    ).toBeVisible();
    const thumbs = day.getByRole("button", { name: /^Open / });
    await expect(thumbs).toHaveCount(2);
    await expect(thumbs.first().locator("img")).toBeVisible({
      timeout: 10_000,
    });
    await audit(page);

    await thumbs.first().click();
    const viewer = page.getByRole("dialog");
    await expect(viewer).toContainText("evening-raid.png");
    await expect(viewer.getByRole("img")).toBeVisible();
    await viewer.getByRole("button", { name: "Show in folder" }).click();
    await expect(viewer.getByRole("status")).toContainText(
      "evening-raid.png is selected in the file manager.",
    );
    await audit(page);
    await viewer.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("a picture that cannot be read says so in words", async ({ page }) => {
    await mockHost(page, {
      home_status: { result: sampleHome() },
      kit_status: healthyKit,
      timeline: { result: timeline },
      game_screenshots: { result: screenshots },
      screenshot: {
        failure: {
          code: "Refused",
          detail: "only a screenshot a list named can be shown",
        },
      },
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await page.getByRole("button", { name: /^One screenshot on / }).click();
    await expect(page.getByText("Could not be read").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
