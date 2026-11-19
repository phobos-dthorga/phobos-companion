import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const RECORDS = [
  {
    name: "test-verdicts",
    path: "C:\\Sample\\test-verdicts",
    files: 2,
    bytes: 2048,
  },
  { name: "history", path: "C:\\Sample\\history", files: 1, bytes: 19000 },
];

function status(extra: Record<string, unknown>) {
  return {
    folder: "N:\\Backups\\Companion",
    folderExists: true,
    records: RECORDS,
    copies: [],
    newest: null,
    ageDays: null,
    staleDays: 7,
    stale: true,
    ...extra,
  };
}

const settingsList = {
  central_file: "C:\\Sample\\settings.json",
  central_exists: true,
  settings: [
    {
      key: "recordsBackupPath",
      env: "PHOBOS_RECORDS_BACKUP",
      description: "Where copies of the Companion's own records go",
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
    },
  ],
};

async function open(page: Page, records: unknown) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    settings_list: { result: settingsList },
    records_status: { result: records },
    backup_records: {
      result: {
        ok: true,
        refusal: null,
        copy: {
          path: "N:\\Backups\\Companion\\20261119-101500",
          name: "20261119-101500",
          files: 3,
          bytes: 21048,
        },
      },
    },
  });
  await page.goto("/");
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

test.describe("Records backup", () => {
  test("Home says when the records were never copied, and leads to the backup", async ({
    page,
  }) => {
    await open(page, status({}));
    const note = page.getByRole("region", {
      name: "Your records want a copy",
    });
    await expect(note).toContainText("never been copied");
    await audit(page);
    await note.getByRole("button", { name: "Back them up" }).click();
    const panel = page.getByRole("region", { name: "Back up your records" });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Never copied yet.");
    await expect(panel).toContainText("2 records, 3 files");
    await expect(panel).toContainText("N:\\Backups\\Companion");
    await audit(page);
    await panel.getByRole("button", { name: "Back up now" }).click();
    await expect(panel.getByRole("status")).toContainText(
      "Copied 3 files (20.6 KB) to N:\\Backups\\Companion\\20261119-101500.",
    );
  });

  test("A recent copy shows no note on Home", async ({ page }) => {
    const newest = {
      name: "20261119-090000",
      time: "2026-11-18T22:00:00Z",
      files: 3,
      bytes: 21048,
    };
    await open(
      page,
      status({ newest, copies: [newest], ageDays: 0, stale: false }),
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Your records want a copy" }),
    ).toHaveCount(0);
  });

  test("With no folder chosen, Back up now waits and the setting is one press away", async ({
    page,
  }) => {
    await open(page, status({ folder: null, folderExists: false }));
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    const panel = page.getByRole("region", { name: "Back up your records" });
    await expect(panel).toContainText("No folder chosen yet");
    await expect(
      panel.getByRole("button", { name: "Back up now" }),
    ).toBeDisabled();
    await panel.getByRole("button", { name: "Choose the folder" }).click();
    await expect(
      page.locator("#setting-input-recordsBackupPath"),
    ).toBeFocused();
  });

  test("A folder pasted from Explorer, in quotes, is saved without them, and Back up now turns on at once (0.26.1)", async ({
    page,
  }) => {
    await open(page, status({ folder: null, folderExists: false }));
    // After a save, the host's records status names the folder; the value sent is kept to check.
    await page.addInitScript(
      (chosen) => {
        const scope = window as unknown as {
          __TAURI_INTERNALS__: {
            invoke: (c: string, a: unknown, o: unknown) => Promise<unknown>;
          };
          sentValues: string[];
        };
        scope.sentValues = [];
        const invoke = scope.__TAURI_INTERNALS__.invoke;
        scope.__TAURI_INTERNALS__.invoke = async (command, args, options) => {
          if (command === "set_setting") {
            scope.sentValues.push((args as { value: string }).value);
            return {
              ok: true,
              refusal: null,
              central_file: "C:\\Sample\\settings.json",
            };
          }
          if (command === "records_status" && scope.sentValues.length > 0)
            return chosen;
          return invoke(command, args, options);
        };
      },
      status({ folder: "N:\\Backups\\Companion", folderExists: false }),
    );
    await page.reload();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    const panel = page.getByRole("region", { name: "Back up your records" });
    await panel.getByRole("button", { name: "Choose the folder" }).click();
    const box = page.locator("#setting-input-recordsBackupPath");
    await box.fill('"N:\\Backups\\Companion"');
    await box.press("Enter");
    const sent = await page.evaluate(
      () => (window as unknown as { sentValues: string[] }).sentValues,
    );
    expect(sent).toEqual(["N:\\Backups\\Companion"]);
    await expect(
      panel.getByRole("button", { name: "Back up now" }),
    ).toBeEnabled();
    await panel.getByRole("button", { name: "Back up now" }).click();
    await expect(panel).toContainText(
      "N:\\Backups\\Companion\\20261119-101500",
    );
    await audit(page);
  });
});
