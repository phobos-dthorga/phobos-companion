import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { healthyKit, mockHost, sampleHome } from "./host";

/** Themes (0.33.0): the Companion's own three, read from their files, as the host would offer them. */
const own = (file: string) =>
  JSON.parse(readFileSync(`themes/${file}.json`, "utf-8"));
const house = own("house-dthorga");
const phobos = own("phobos-dthorga");
const high = own("high-contrast");

const status = (active: typeof house) => ({
  chosen: active.id,
  active,
  themes: [house, phobos, high].map((theme) => ({ theme, built_in: true })),
  unreadable: [],
  fell_back: null,
});

async function open(page: Page, more: Record<string, unknown> = {}) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    settings_list: {
      result: {
        central_file: "C:\\Sample\\settings.json",
        central_exists: false,
        settings: [],
      },
    },
    records_status: {
      result: {
        folder: null,
        folderExists: false,
        records: [],
        copies: [],
        newest: null,
        ageDays: null,
        staleDays: 7,
        stale: true,
      },
    },
    records_automatic: { result: null },
    cleanup_list: {
      result: { groups: [], bytes: 0, daemons: 0, notes: [] },
    },
    theme_status: { result: status(house) },
    choose_theme: { result: status(phobos) },
    import_theme: { result: { status: status(house), file: null } },
    ...more,
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

const canvas = (page: Page) =>
  page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--colour-canvas"),
  );

test.describe("Appearance", () => {
  test("offers the three themes, and Use this changes the window at once", async ({
    page,
  }) => {
    await open(page);
    const panel = page.getByRole("region", { name: "Appearance" });
    const cards = panel.getByRole("list", { name: "Themes on offer" });
    await expect(cards.getByRole("listitem")).toHaveCount(3);
    await expect(
      panel.getByRole("button", { name: "Use House D'thorga" }),
    ).toHaveAttribute("aria-pressed", "true");
    await audit(page);
    await panel.getByRole("button", { name: "Use Phobos D'thorga" }).click();
    await expect(panel.getByRole("status")).toContainText(
      "Phobos D'thorga is in use now.",
    );
    expect((await canvas(page)).toUpperCase()).toBe("#100708");
    await audit(page);
  });

  test("a closed Open dialog changes nothing, and says so", async ({
    page,
  }) => {
    await open(page);
    const panel = page.getByRole("region", { name: "Appearance" });
    await panel.getByRole("button", { name: "Bring in a theme file…" }).click();
    await expect(panel.getByRole("status")).toContainText(
      "The dialog was closed without choosing a file",
    );
  });

  test("making a theme: each pair that cannot be read is named, and Keep waits until all can", async ({
    page,
  }) => {
    const mine = {
      ...house,
      id: "house-d-thorga-mine",
      name: "House D'thorga, mine",
      colours: { ...house.colours, accent: "#FFC266" },
    };
    await open(page, {
      keep_theme: {
        result: {
          ...status(mine),
          themes: [...status(house).themes, { theme: mine, built_in: false }],
        },
      },
    });
    const panel = page.getByRole("region", { name: "Appearance" });
    await panel
      .getByRole("button", { name: "Make your own theme from House D'thorga" })
      .click();
    const maker = panel.getByRole("region", {
      name: "Make your own theme, starting from House D'thorga",
    });
    await expect(maker.getByLabel("Its name")).toHaveValue(
      "House D'thorga, mine",
    );
    await expect(maker).toContainText("Every colour can be read.");
    await audit(page);

    const quieter = maker.getByLabel("Quieter words", { exact: true });
    await quieter.fill("#333333");
    await expect(maker).toContainText("cannot be read well enough");
    await expect(maker).toContainText("Quieter words on Background");
    await expect(
      maker.getByRole("button", { name: "Keep and use" }),
    ).toBeDisabled();
    await expect(
      maker.getByRole("button", { name: "Save as a file…" }),
    ).toBeEnabled();

    await quieter.fill("#C9BEC8");
    await maker.getByLabel("Accent and focus", { exact: true }).fill("FFC266");
    await expect(maker).toContainText("Every colour can be read.");
    await maker.getByRole("button", { name: "Keep and use" }).click();
    await expect(panel.getByRole("status")).toContainText(
      "House D'thorga, mine is kept and in use now.",
    );
    expect(
      await page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--colour-accent"),
      ),
    ).toBe("#FFC266");
    await expect(
      panel.getByRole("button", { name: "Remove House D'thorga, mine" }),
    ).toBeVisible();
  });
});
