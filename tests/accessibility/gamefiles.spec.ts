import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const FILES = {
  name: "First Sample",
  game: {
    appId: 4242,
    name: "First Sample",
    buildId: "77",
    lastUpdatedAt: "2026-11-18T12:00:00+00:00",
    lastPlayedAt: "2026-11-18T10:00:00+00:00",
    sizeOnDisk: 1200000000,
  },
  places: {
    data: "C:\\Sample\\Data",
    saves: "C:\\Sample\\Data\\Saves",
    screenshots: ["C:\\Sample\\Data\\Screenshots"],
  },
  changed: {
    since: "2026-11-18T10:00:00+00:00",
    sinceLastPlayed: true,
    gameUpdated: true,
    workshop: [
      {
        id: "111",
        title: "Better Lamps",
        bytes: 10,
        updated: 1795000000,
        updatedAt: "2026-11-18T15:00:00+00:00",
      },
    ],
    workshopCount: 1,
    workshopInstalled: 40,
  },
  saves: {
    list: [
      {
        name: "Colony One",
        file: "Colony One.rws",
        bytes: 400000000,
        modified: 1795070000,
        auto: false,
        folder: false,
      },
      {
        name: "Autosave-1",
        file: "Autosave-1.rws",
        bytes: 390000000,
        modified: 1795060000,
        auto: true,
        folder: false,
      },
    ],
    count: 2,
    bytes: 790000000,
    autosaves: 1,
  },
  screenshots: {
    list: [
      {
        path: "C:\\Sample\\Data\\Screenshots\\shot.png",
        name: "shot.png",
        bytes: 4000000,
        taken: 1795050000,
        source: "C:\\Sample\\Data\\Screenshots",
      },
    ],
    count: 1,
    bytes: 4000000,
  },
  space: {
    data: [
      { name: "Saves", files: 2, bytes: 790000000, folder: true },
      { name: "TextureCache", files: 500, bytes: 3500000000, folder: true },
    ],
    dataBytes: 4290000000,
    install: 1200000000,
    workshop: 3500000000,
  },
};

async function open(page: Page, files: unknown = FILES) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    game_files: { result: files },
    show_game_file: { result: null },
  });
  await page.goto("/");
  await page.keyboard.press("w");
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
  test.describe(`Game files, ${name}`, () => {
    test.use({ viewport });

    test("shows what changed, the saves, the screenshots and the space, and passes the audit", async ({
      page,
    }) => {
      await open(page);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "What First Sample writes, and what Steam records",
      );
      const changed = page.getByRole("region", { name: "What changed" });
      await expect(changed).toContainText("Steam updated the game after that");
      await expect(changed).toContainText(
        "One of your 40 Workshop items was updated since then",
      );
      await expect(changed).toContainText("Better Lamps");
      const saves = page.getByRole("region", { name: "Saves", exact: true });
      await expect(saves).toContainText("2 saves");
      await expect(saves).toContainText("one is an autosave.");
      await expect(
        saves.getByRole("button", { name: "Show Colony One in its folder" }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Where the space goes" }),
      ).toContainText("TextureCache");
      await audit(page);
    });
  });
}

test("a game Steam does not have says how to name it", async ({ page }) => {
  await open(page, {
    ...FILES,
    game: null,
    places: { data: null, saves: null, screenshots: [] },
    saves: { list: [], count: 0, bytes: 0, autosaves: 0 },
    screenshots: { list: [], count: 0, bytes: 0 },
    space: { data: [], dataBytes: 0, install: null, workshop: 0 },
  });
  await expect(
    page.getByRole("region", { name: "What changed" }),
  ).toContainText("steam_app_id");
  await expect(
    page.getByRole("region", { name: "Saves", exact: true }),
  ).toContainText("No saves folder was found");
  await audit(page);
});
