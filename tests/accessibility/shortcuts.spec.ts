import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

const sampleSettings = {
  central_file: "C:\\Sample\\settings.json",
  central_exists: false,
  settings: [
    {
      key: "historyPath",
      env: null,
      description: "Where the record of what happened on this PC is kept",
      kind: "folder",
      game: null,
      declaredBy: "phobos-modkit",
      value: "C:\\Sample\\history",
      layer: "default",
      repository: null,
      central: null,
      default: "C:\\Sample\\history",
      exists: true,
      overridden: [],
    },
  ],
};

async function open(page: Page, saved: unknown = null) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    settings_list: { result: sampleSettings },
    read_shortcuts: { result: saved },
    save_shortcuts: {
      result: { format: 1, enabled: true, keys: { "page.settings": "s" } },
    },
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

const settingsHeading = (page: Page) =>
  page.getByRole("heading", {
    level: 1,
    name: "Where the tools keep and find things",
  });

test.describe("Keyboard shortcuts", () => {
  test("a number goes to its page, and ? lists every shortcut", async ({
    page,
  }) => {
    await open(page);
    await page.keyboard.press("9");
    await expect(settingsHeading(page)).toBeVisible();
    await page.keyboard.press("?");
    const list = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(list).toContainText("Go to Timeline");
    await expect(list).toContainText("7");
    await audit(page);
    await page.keyboard.press("1");
    await expect(settingsHeading(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("never acts while typing in a box", async ({ page }) => {
    await open(page);
    await page.keyboard.press("9");
    await page
      .getByRole("button", { name: "Type a path for historyPath" })
      .click();
    await page
      .getByLabel("New value for historyPath (a full path)")
      .pressSequentially("D:\\7");
    await expect(settingsHeading(page)).toBeVisible();
  });

  test("changes a key in Settings, and refuses one already taken", async ({
    page,
  }) => {
    await open(page);
    await page.keyboard.press("9");
    await page
      .getByRole("button", { name: "Change keyboard shortcuts" })
      .click();
    const editor = page.getByRole("dialog", {
      name: "Change keyboard shortcuts",
    });
    await audit(page);
    const small = await editor.evaluate(
      (dialog, min) =>
        [...dialog.querySelectorAll("button")]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height < min).length,
      CONTROL_MIN_PX,
    );
    expect(small).toBe(0);
    await editor
      .getByRole("button", { name: "Change the key for: Go to Settings" })
      .click();
    await page.keyboard.press("1");
    await expect(editor.getByRole("status")).toContainText(
      "1 already does: Go to Home.",
    );
    await page.keyboard.press("s");
    await expect(editor.getByRole("status")).toContainText(
      "Go to Settings is now S.",
    );
    await editor.getByRole("button", { name: "Close" }).click();
    await page.keyboard.press("1");
    await page.keyboard.press("s");
    await expect(settingsHeading(page)).toBeVisible();
  });

  test("does nothing when the owner turned them off", async ({ page }) => {
    await open(page, { format: 1, enabled: false, keys: {} });
    await page.keyboard.press("9");
    await expect(settingsHeading(page)).toHaveCount(0);
  });
});
