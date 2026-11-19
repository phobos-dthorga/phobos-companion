import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { healthyKit, mockHost, sampleHome } from "./host";

const { version } = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
) as { version: string };

const INSTALLER = "C:\\Builds\\D’thorga Companion_9.1.0_x64-setup.exe";

function about(newer: boolean) {
  return {
    version,
    built_commit: "abc1234",
    built_unix: 1_795_000_000,
    built_from: "D:\\Repositories\\first-tools",
    repository_name: "first-tools",
    program: "C:\\Programs\\Companion\\companion.exe",
    data_folder: "C:\\Data\\companion",
    source: "https://example.com/someone/first-tools",
    repository_version: newer ? "9.1.0" : version,
    commits_since: newer ? 4 : 0,
    this_version: {
      version,
      date: "2026-11-19",
      summary: "A sample opening paragraph for this version.",
    },
    newer: newer
      ? [
          {
            version: "9.1.0",
            date: "2026-11-20",
            summary: "A sample newer version.",
          },
        ]
      : [],
    installer: newer ? INSTALLER : null,
    libraries: [
      { name: "Tauri", licence: "MIT OR Apache-2.0" },
      { name: "Svelte", licence: "MIT" },
    ],
  };
}

async function open(page: Page, newer: boolean) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    about: { result: about(newer) },
  });
  await page.goto("/");
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

test.describe("About", () => {
  test("the version is in the status bar on every page, and opens About", async ({
    page,
  }) => {
    await open(page, false);
    const button = page.getByRole("button", {
      name: `D'thorga Companion ${version}: open About`,
    });
    await expect(button).toBeVisible();
    await button.click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      `D'thorga Companion ${version}`,
    );
    await expect(page.getByRole("main")).toContainText("Up to date");
    await expect(page.getByRole("main")).toContainText("abc1234");
    await expect(page.getByRole("main")).toContainText("Tauri");
    await audit(page);
  });

  test("says a newer version is waiting and where its installer is", async ({
    page,
  }) => {
    await open(page, true);
    await page.keyboard.press("i");
    await expect(
      page.getByRole("heading", {
        name: "Version 9.1.0 is waiting in the repository",
      }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText(INSTALLER);
    await expect(page.getByRole("main")).toContainText(
      "A sample newer version.",
    );
    await audit(page);
    await page.screenshot({
      path: "artifacts/about-newer.png",
      fullPage: true,
    });
  });
});
