import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, openTab, sampleHome } from "./host";

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
    everyHours: 6,
    due: true,
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

async function open(
  page: Page,
  records: unknown,
  more: Record<string, { result?: unknown }> = {},
) {
  await mockHost(page, {
    records_automatic: { result: null },
    ...more,
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
    await openTab(page, "Backups and space");
    const panel = page.getByRole("region", { name: "Back up your records" });
    await expect(panel).toContainText("No folder chosen yet");
    await expect(
      panel.getByRole("button", { name: "Back up now" }),
    ).toBeDisabled();
    await expect(panel).toContainText(
      "Once a folder is chosen, it copies them by itself every 6 hours",
    );
    await panel.getByRole("button", { name: "Type a folder instead" }).click();
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
    await openTab(page, "Backups and space");
    const panel = page.getByRole("region", { name: "Back up your records" });
    await panel.getByRole("button", { name: "Type a folder instead" }).click();
    const box = page.locator("#setting-input-recordsBackupPath");
    await box.fill('"N:\\Backups\\Companion"');
    await box.press("Enter");
    const sent = await page.evaluate(
      () => (window as unknown as { sentValues: string[] }).sentValues,
    );
    expect(sent).toEqual(["N:\\Backups\\Companion"]);
    // The box is on Folders and files (0.66.0); Back returns to the records panel.
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      panel.getByRole("button", { name: "Back up now" }),
    ).toBeEnabled();
    await panel.getByRole("button", { name: "Back up now" }).click();
    await expect(panel).toContainText(
      "N:\\Backups\\Companion\\20261119-101500",
    );
    await audit(page);
  });

  test("Choose the folder opens Windows' picker, saves what is chosen, and Back up now turns on (0.29.0)", async ({
    page,
  }) => {
    await open(page, status({ folder: null, folderExists: false }), {
      pick_path: { result: "\\\\NAS\\home\\Companion backups" },
    });
    await page.addInitScript(
      (chosen) => {
        const scope = window as unknown as {
          __TAURI_INTERNALS__: {
            invoke: (c: string, a: unknown, o: unknown) => Promise<unknown>;
          };
          sent: { command: string; args: unknown }[];
        };
        scope.sent = [];
        const invoke = scope.__TAURI_INTERNALS__.invoke;
        scope.__TAURI_INTERNALS__.invoke = async (command, args, options) => {
          if (command === "pick_path" || command === "set_setting")
            scope.sent.push({ command, args });
          if (command === "set_setting")
            return {
              ok: true,
              refusal: null,
              central_file: "C:\\Sample\\settings.json",
            };
          if (
            command === "records_status" &&
            scope.sent.some((s) => s.command === "set_setting")
          )
            return chosen;
          return invoke(command, args, options);
        };
      },
      status({ folder: "\\\\NAS\\home\\Companion backups" }),
    );
    await page.reload();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await openTab(page, "Backups and space");
    const panel = page.getByRole("region", { name: "Back up your records" });
    await panel.getByRole("button", { name: "Choose the folder" }).click();
    await expect(page.locator("main")).toContainText(
      "Saved recordsBackupPath to the central settings file.",
    );
    const sent = await page.evaluate(
      () =>
        (window as unknown as { sent: { command: string; args: unknown }[] })
          .sent,
    );
    expect(sent[0]).toEqual({
      command: "pick_path",
      args: {
        kind: "folder",
        title:
          "Choose a folder: Where copies of the Companion's own records go",
        current: null,
      },
    });
    expect(sent[1].command).toBe("set_setting");
    expect((sent[1].args as { value: string }).value).toBe(
      "\\\\NAS\\home\\Companion backups",
    );
    await expect(panel).toContainText(
      "It also copies them by itself every 6 hours",
    );
    await expect(
      panel.getByRole("button", { name: "Back up now" }),
    ).toBeEnabled();
    await audit(page);
  });

  test("Closing the picker without choosing changes nothing, and says so", async ({
    page,
  }) => {
    await open(page, status({ folder: null, folderExists: false }), {
      pick_path: { result: null },
    });
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await openTab(page, "Folders and files");
    await page.locator("#setting-recordsBackupPath .line").click();
    await page
      .getByRole("button", {
        name: "Choose recordsBackupPath with Windows' picker",
      })
      .click();
    await expect(page.locator("main")).toContainText(
      "The picker was closed without choosing anything, so recordsBackupPath is unchanged.",
    );
  });

  test("A failed automatic copy says why on Home and in the panel (0.29.0)", async ({
    page,
  }) => {
    const newest = {
      name: "20261119-090000",
      time: "2026-11-18T22:00:00Z",
      files: 3,
      bytes: 21048,
      automatic: true,
    };
    await open(
      page,
      status({ newest, copies: [newest], ageDays: 0, stale: false, due: true }),
      {
        records_automatic: {
          result: {
            time: "2026-11-19T10:00:00Z",
            ok: false,
            refusal:
              "the backup folder N:\\Backups\\Companion cannot be reached or written to (no such drive): check the drive or the NAS is connected and awake; nothing was copied",
            copy: null,
          },
        },
      },
    );
    const note = page.getByRole("region", {
      name: "Your records want a copy",
    });
    await expect(note).toContainText(
      "could not copy its own records by itself",
    );
    await expect(note).toContainText("connected and awake");
    await audit(page);
    await note.getByRole("button", { name: "Back them up" }).click();
    const panel = page.getByRole("region", { name: "Back up your records" });
    await expect(panel).toContainText("failed: the backup folder");
    await expect(panel).toContainText("It tries again within a few minutes.");
    await audit(page);
  });
});
