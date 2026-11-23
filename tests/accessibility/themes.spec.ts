import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { healthyKit, mockHost, openTab, sampleHome } from "./host";

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
  await openTab(page, "Look and keys");
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

  test("code colours: VS Code's themes on this computer are listed, one is brought in, and the sample takes its colours (0.77.0)", async ({
    page,
  }) => {
    const modern = {
      id: "dark-modern",
      name: "Dark Modern",
      plain: "#CCCCCC",
      rules: [
        { scope: ["keyword.control"], foreground: "#C586C0" },
        { scope: ["entity.name.function"], foreground: "#DCDCAA" },
      ],
      replaced: 26,
      notes: [
        "It builds on dark_plus.json and dark_vs.json, read from the same folder.",
      ],
    };
    const kept = {
      chosen: "dark-modern",
      sets: [
        {
          id: "dark-modern",
          name: "Dark Modern",
          from: "dark_modern.json",
          kind: "dark",
          rules: 65,
        },
      ],
      active: modern,
      unreadable: [],
      fell_back: null,
    };
    await open(page, {
      vscode_themes: {
        result: [
          {
            label: "Dark Modern",
            extension: "Default Themes",
            kind: "dark",
            file: "C:\\Sample\\VS Code\\themes\\dark_modern.json",
          },
          {
            label: "Light Modern",
            extension: "Default Themes",
            kind: "light",
            file: "C:\\Sample\\VS Code\\themes\\light_modern.json",
          },
        ],
      },
      bring_in_vscode_theme: {
        result: {
          status: kept,
          file: "C:\\Sample\\VS Code\\themes\\dark_modern.json",
        },
      },
      choose_code_colours: {
        result: { ...kept, chosen: "theme", active: null },
      },
    });
    const panel = page.getByRole("region", {
      name: "Code colours",
      exact: true,
    });
    await expect(
      panel.getByRole("button", {
        name: "Use the code colours This theme's own",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await panel
      .getByRole("button", { name: "Find VS Code's themes on this computer" })
      .click();
    const found = panel.getByRole("list", {
      name: "VS Code's themes on this computer",
    });
    await expect(found).toContainText("Default Themes, a light theme");
    await audit(page);
    await found
      .getByRole("button", { name: "Bring in Dark Modern's code colours" })
      .click();
    await expect(panel.getByRole("status")).toContainText(
      "Dark Modern's code colours are kept and in use now.",
    );
    await expect(panel).toContainText(
      "26 of Dark Modern's colours can't be read on this theme",
    );
    await expect(panel).toContainText(
      "From dark_modern.json, a dark theme, 65 colour rules",
    );
    const sample = panel.getByRole("region", {
      name: "A few lines of code in the code colours in use",
    });
    await expect(
      sample.locator('span[style="color:#C586C0"]').first(),
    ).toHaveText("if");
    await audit(page);
    await panel
      .getByRole("button", { name: "Use the code colours This theme's own" })
      .click();
    await expect(sample.locator(".tok-flow").first()).toHaveText("if");
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
