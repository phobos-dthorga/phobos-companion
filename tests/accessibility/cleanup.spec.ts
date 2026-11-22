import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, openTab, sampleHome } from "./host";

const GB = 1024 ** 3;

const listing = {
  groups: [
    {
      group: "Kit build folder",
      items: 1,
      bytes: 29 * GB,
      why: "the kit's development build",
    },
    {
      group: "Install backups",
      items: 40,
      bytes: 3 * GB,
      why: "older backups",
    },
    {
      group: "Cache: rimworld-saves",
      items: 4,
      bytes: 0.2 * GB,
      why: "the save changed since",
    },
  ],
  bytes: 32.2 * GB,
  daemons: 2,
  repositories: ["first-mods"],
  notes: [],
};

const after = {
  groups: [listing.groups[1]],
  bytes: 3 * GB,
  daemons: 0,
  repositories: ["first-mods"],
  notes: [],
};

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    cleanup_list: { result: listing },
    cleanup_apply: { result: after },
    settings_list: {
      result: {
        central_file: "C:\Sample\settings.json",
        central_exists: true,
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
        stale: false,
      },
    },
  });
  // Keeps the groups the window asks to clear, to check the install backups are not among them.
  await page.addInitScript(() => {
    const scope = window as unknown as {
      __TAURI_INTERNALS__: {
        invoke: (c: string, a: unknown, o: unknown) => Promise<unknown>;
      };
      cleared: string[][];
    };
    scope.cleared = [];
    const invoke = scope.__TAURI_INTERNALS__.invoke;
    scope.__TAURI_INTERNALS__.invoke = (command, args, options) => {
      if (command === "cleanup_apply")
        scope.cleared.push((args as { groups: string[] }).groups);
      return invoke(command, args, options);
    };
  });
  await page.goto("/");
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

test.describe("Clean up (0.27.0)", () => {
  test("Home says how much could go, and leads to Settings", async ({
    page,
  }) => {
    await open(page);
    const note = page.getByRole("region", { name: "Room to clear" });
    await expect(note).toContainText("left 32.2 GB behind");
    await note.getByRole("button", { name: "Look at it in Settings" }).click();
    await expect(
      page.getByRole("region", { name: "Clean up", exact: true }),
    ).toBeVisible();
    await audit(page);
  });

  test("Install backups start unchosen, and nothing goes before the owner confirms", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await openTab(page, "Backups and space");
    const panel = page.getByRole("region", { name: "Clean up", exact: true });
    await expect(
      panel.getByRole("button", { name: /^Install backups/ }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(
      panel.getByRole("button", { name: /^Kit build folder/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await panel.getByRole("button", { name: /^Clean up the chosen/ }).click();
    expect(
      await page.evaluate(
        () => (window as unknown as { cleared: string[][] }).cleared,
      ),
    ).toEqual([]);
    await audit(page);
    await panel.getByRole("button", { name: "Delete them" }).click();
    await expect(panel).toContainText("Cleared 29.2 GB.");
    const cleared = await page.evaluate(
      () => (window as unknown as { cleared: string[][] }).cleared,
    );
    expect(cleared).toEqual([
      ["Kit build folder", "Cache: rimworld-saves", "Git file-watcher daemons"],
    ]);
  });
});
