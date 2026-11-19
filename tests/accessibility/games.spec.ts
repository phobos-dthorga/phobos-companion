import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

/** Add a game from Steam (0.31.0). Invented games and folders, for the audit only. */
const steam = {
  list_file: "C:\\Sample\\.local\\games.json",
  list_exists: true,
  repositories: ["sample-sub-mods", "sample-sub-tools"],
  games: [
    {
      appId: 228980,
      name: "Steamworks Common Redistributables",
      install: "C:\\Steam\\common\\Steamworks Shared",
      sizeOnDisk: 1,
      lastPlayed: null,
      dataGuesses: [],
      listedAs: null,
    },
    {
      appId: 4242,
      name: "First Sample",
      install: "C:\\Steam\\common\\First Sample",
      sizeOnDisk: 1,
      lastPlayed: null,
      dataGuesses: [],
      listedAs: "first-sample",
    },
    {
      appId: 602960,
      name: "Sample Submarine",
      install: "C:\\Steam\\common\\Sample Submarine",
      sizeOnDisk: 1,
      lastPlayed: 1,
      dataGuesses: [
        {
          path: "C:\\Users\\you\\AppData\\Local\\Sample Maker\\Sample Submarine",
          score: 95,
          reason: "named for the game, inside Sample Maker",
        },
        {
          path: "C:\\Users\\you\\Documents\\Sample Submarine (mods)",
          score: 40,
          reason: "named for the game's mods",
        },
      ],
      listedAs: null,
    },
  ],
};

async function open(page: Page, added: Record<string, unknown>) {
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
    steam_games: { result: steam },
    add_game: added,
    cleanup_list: {
      result: { groups: [], bytes: 0, daemons: 0, notes: [] },
    },
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

test.describe("Add a game from Steam", () => {
  test("offers Steam's games, guesses the folder, shows the entry, and adds it", async ({
    page,
  }) => {
    await open(page, {
      result: {
        id: "sample-submarine",
        list_file: steam.list_file,
        before: "C:\\Sample\\.local\\games.json.before-add",
      },
    });
    const panel = page.getByRole("region", { name: "Games on the list" });
    await panel.getByRole("button", { name: "Add a game from Steam" }).click();
    const offered = panel.getByRole("list", {
      name: "Games Steam has installed",
    });
    // Not on the list first; listed ones can't be chosen; Steam's own tools last.
    await expect(offered.getByRole("button").first()).toContainText(
      "Sample Submarine",
    );
    await expect(
      offered.getByRole("button", { name: /First Sample/ }),
    ).toBeDisabled();
    await expect(
      offered.getByRole("button", { name: /First Sample/ }),
    ).toContainText("Already on the list, as first-sample");
    await audit(page);

    await offered.getByRole("button", { name: /Sample Submarine/ }).click();
    await expect(
      panel.getByLabel("Its short name, used in addresses and settings"),
    ).toHaveValue("sample-submarine");
    await expect(
      panel.getByRole("radio", { name: /Sample Maker\\Sample Submarine/ }),
    ).toBeChecked();
    await panel.getByRole("checkbox", { name: "sample-sub-mods" }).check();
    const shown = panel.locator("pre.preview");
    await expect(shown).toContainText('"id": "sample-submarine"');
    await expect(shown).toContainText('"steam_app_id": 602960');
    await expect(shown).toContainText('"sample-sub-mods"');
    await expect(shown).toContainText("Sample Maker");
    await audit(page);

    await panel.getByRole("button", { name: "Add to the list" }).click();
    await expect(panel.getByRole("status")).toContainText(
      "Added Sample Submarine to the list: it is in the game menu now.",
    );
    await expect(panel.getByRole("status")).toContainText(
      "games.json.before-add",
    );
  });

  test("an id already taken waits, and a refusal says why", async ({
    page,
  }) => {
    await open(page, {
      failure: {
        code: "Refused",
        detail: "C:\\Gone is not a folder on this PC",
      },
    });
    const panel = page.getByRole("region", { name: "Games on the list" });
    await panel.getByRole("button", { name: "Add a game from Steam" }).click();
    await panel.getByRole("button", { name: /Sample Submarine/ }).click();
    const id = panel.getByLabel(
      "Its short name, used in addresses and settings",
    );
    await id.fill("first");
    await expect(panel).toContainText("first is already a game's");
    await expect(
      panel.getByRole("button", { name: "Add to the list" }),
    ).toBeDisabled();
    await id.fill("sample-submarine");
    await panel.getByRole("radio", { name: /None for now/ }).check();
    await expect(panel.locator("pre.preview")).not.toContainText("places");
    await panel.getByRole("button", { name: "Add to the list" }).click();
    await expect(panel.getByRole("status")).toContainText(
      "Nothing was added: C:\\Gone is not a folder on this PC",
    );
    await audit(page);
  });
});
