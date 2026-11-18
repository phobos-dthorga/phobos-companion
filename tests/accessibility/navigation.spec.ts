import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

/** Invented readings, for the audit only. */
const changes = [
  {
    repository: "first-mods",
    changelogs: [
      {
        changelog: "mods/Boats/CHANGELOG.md",
        product: "Sample Boats",
        versionsInAll: 1,
        versions: [
          {
            version: "1.3.0",
            heading: "2026-11-18 - Draft",
            summary: "Boats",
            entries: [
              {
                version: "1.3.0",
                section: "Added",
                text: "**Sample sails.** Boats have sails.",
                lead: "Sample sails.",
                aboutSaves: false,
                commit: "4d332ddf0123",
              },
            ],
          },
        ],
      },
      {
        changelog: "mods/Carts/CHANGELOG.md",
        product: "Sample Carts",
        versionsInAll: 1,
        versions: [
          {
            version: "0.2.0",
            heading: "2026-11-17 - Draft",
            summary: "Carts",
            entries: [],
          },
        ],
      },
    ],
  },
];

const settings = {
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

const code = {
  found: true,
  refusal: null,
  command_line: "",
  code: {
    repository: "first-mods",
    changelog: "mods/Boats/CHANGELOG.md",
    commit: {
      hash: "4d332ddf0123456789",
      time: "2026-11-18T08:52:50+00:00",
      author: "Sample Author",
      subject: "Sample Boats 1.3.0",
    },
    writtenWith: [],
    files: [],
    filesLeftOut: 0,
    additions: 0,
    deletions: 0,
  },
};

async function open(page: Page) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    read_shortcuts: { result: null },
    changes_list: { result: changes },
    entry_code: { result: code },
    test_lists: { result: [] },
    timeline: { result: { repositories: [], facts: [], log_exists: false } },
    settings_list: { result: settings },
    report_catalogue: { result: [] },
    "connections:find": {
      result: { ok: true, refusal: null, data: { things: [] } },
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

const settingsTitle = (page: Page) =>
  page.getByRole("heading", {
    level: 1,
    name: "Where the tools keep and find things",
  });
const changesTitle = (page: Page) =>
  page.getByRole("heading", { level: 1, name: "What changed in First Sample" });

test.describe("The way back, the search and addresses", () => {
  test("Back and Forward walk the pages, by button and by key", async ({
    page,
  }) => {
    await open(page);
    await expect(
      page.getByRole("button", { name: "Back", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(settingsTitle(page)).toBeVisible();
    await page.getByRole("button", { name: "Changes", exact: true }).click();
    await page.getByRole("button", { name: "Sample Carts" }).click();
    await page.keyboard.press(",");
    await expect(settingsTitle(page)).toBeVisible();
    await page.keyboard.press(".");
    await expect(changesTitle(page)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sample Carts" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(settingsTitle(page)).toBeVisible();
    await page.getByRole("button", { name: "Forward", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sample Carts" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("Go to anything finds a changelog entry and opens its code; Back closes it", async ({
    page,
  }) => {
    await open(page);
    await page.keyboard.press("/");
    const search = page.getByRole("dialog", { name: "Where to?" });
    await search
      .getByLabel("Search for anything, or paste an address")
      .fill("sails");
    await expect(
      search.getByRole("region", { name: "Changelog entries" }),
    ).toContainText("Sample sails.");
    await audit(page);
    await search.getByRole("button", { name: /Sample sails\./ }).click();
    const viewer = page.getByRole("dialog", { name: "Sample sails." });
    await expect(viewer).toContainText("Sample Boats 1.3.0");
    await page.keyboard.press(",");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(changesTitle(page)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sample Boats" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("an address is copied, and pasted back in it opens the same place", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Changes", exact: true }).click();
    await page.getByRole("button", { name: "Sample Carts" }).click();
    await page.getByRole("button", { name: "Copy address" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "address is copied" }),
    ).toBeVisible();
    const address = await page.evaluate(() => navigator.clipboard.readText());
    expect(address).toMatch(
      /^dthorga:\/\/changes\/first\?repository=first-mods&changelog=mods%2FCarts%2FCHANGELOG\.md$/,
    );
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Go to anything" }).click();
    await page
      .getByLabel("Search for anything, or paste an address")
      .fill(address);
    await page.getByRole("button", { name: /Open this address/ }).click();
    await expect(changesTitle(page)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sample Carts" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("Home's latest commit opens its code, and a mod not yet released opens its changelog", async ({
    page,
  }) => {
    await open(page);
    await page
      .getByRole("button", {
        name: "A sample change made today: open this commit's code",
      })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press(",");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page
      .getByRole("button", {
        name: "Sample Mod: open its changelog on the Changes page",
      })
      .click();
    await expect(changesTitle(page)).toBeVisible();
    await page.getByRole("button", { name: "Copy address" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      "product=Sample+Mod",
    );
    await audit(page);
  });
});
