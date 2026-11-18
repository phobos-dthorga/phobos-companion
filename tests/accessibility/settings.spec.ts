import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

function setting(
  key: string,
  description: string,
  extra: Record<string, unknown> = {},
) {
  return {
    key,
    env: null,
    description,
    kind: "folder",
    game: null,
    declaredBy: "phobos-modkit",
    value: null,
    layer: "default",
    repository: null,
    central: null,
    default: null,
    exists: null,
    overridden: [],
    ...extra,
  };
}

/** Invented settings, for the audit only. */
const sampleSettings = {
  central_file: "C:\\Sample\\settings.json",
  central_exists: true,
  settings: [
    setting(
      "historyPath",
      "Where the record of what happened on this PC is kept",
      {
        value: "K:\\sample\\history",
        layer: "central",
        central: "K:\\sample\\history",
        default: "C:\\Sample\\history",
        exists: true,
      },
    ),
    setting("sampleGamePath", "The sample game's folder", {
      game: "first",
      value: "C:\\Games\\Sample",
      layer: "repository",
      repository: "first-mods",
      exists: false,
      overridden: [
        { repository: "first-mods", value: "C:\\Games\\Sample" },
        { repository: "second-mods", value: "D:\\Games\\Sample" },
      ],
    }),
  ],
};

async function open(
  page: Page,
  saved: unknown = {
    ok: true,
    refusal: null,
    central_file: "C:\\Sample\\settings.json",
  },
) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    settings_list: { result: sampleSettings },
    set_setting: { result: saved },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Where the tools keep and find things",
  );
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
  test.describe(`Settings page, ${name}`, () => {
    test.use({ viewport });

    test("lists every setting with where its value comes from, and passes the audit", async ({
      page,
    }) => {
      await open(page);
      await expect(
        page.getByRole("heading", { name: "Every game" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "First Sample" }),
      ).toBeVisible();
      await expect(page.locator("main")).toContainText(
        "the central settings file",
      );
      await expect(page.locator("main")).toContainText(
        "first-mods's own settings",
      );
      await expect(page.locator("main")).toContainText(
        "second-mods's own settings name D:\\Games\\Sample",
      );
      await audit(page);
      const small = await page
        .locator("main")
        .evaluate(
          (root, min) =>
            [...root.querySelectorAll("button, input")]
              .map((e) => e.getBoundingClientRect())
              .filter((r) => r.width > 0 && r.height < min).length,
          CONTROL_MIN_PX,
        );
      expect(small).toBe(0);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("changes a setting in the central file and says so", async ({
      page,
    }) => {
      await open(page);
      await page.getByRole("button", { name: "Change historyPath" }).click();
      const field = page.getByLabel("New value for historyPath (a full path)");
      await expect(field).toBeFocused();
      await field.fill("K:\\elsewhere\\history");
      await audit(page);
      await page
        .getByRole("button", { name: "Save to the central file" })
        .click();
      await expect(page.locator("main").getByRole("status")).toContainText(
        "Saved historyPath to the central settings file.",
      );
    });

    test("a refusal is shown in words and nothing is called saved", async ({
      page,
    }) => {
      await open(page, {
        ok: false,
        refusal: "A setting's value is a full path.",
        central_file: null,
      });
      await page
        .getByRole("button", { name: "Use the default for historyPath" })
        .click();
      await expect(page.locator("main").getByRole("status")).toContainText(
        "Not saved: A setting's value is a full path.",
      );
    });
  });
}
