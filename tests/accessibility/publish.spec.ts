import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

/**
 * The Publish page (0.69.0), against a stand-in host: nothing here reaches Steam, and the stand-in's upload only answers. Mods,
 * item numbers and words are made up.
 */
const row = (mod: string, more: Record<string, unknown> = {}) => ({
  mod,
  version: "1.1.0",
  itemId: null,
  operation: "create",
  package: "ready",
  blockers: [],
  requires: [],
  ...more,
});
const waiting = (mod: string, more: Record<string, unknown> = {}) => ({
  mod,
  version: "1.1.0",
  itemId: null,
  uploadedVersion: null,
  uploadedVisibility: null,
  needsUpload: false,
  ...more,
});

const reading = {
  uploads: true,
  steamBack: true,
  repositories: [
    {
      repository: "first-mods",
      status: {
        game: "Sample",
        appId: "100",
        mods: [
          row("SampleBase", { itemId: "3900000001", operation: "update" }),
          row("SampleExtra", { itemId: "3900000003", operation: "update" }),
          row("SampleContent", {
            requires: ["SampleBase"],
            blockers: ["Held: not yet released"],
          }),
        ],
      },
      pending: {
        mods: [
          waiting("SampleBase", {
            itemId: "3900000001",
            uploadedVersion: "1.0.0",
            uploadedVisibility: "private",
            needsUpload: true,
          }),
          waiting("SampleExtra", {
            itemId: "3900000003",
            uploadedVersion: "1.1.0",
            uploadedVisibility: "private",
          }),
          waiting("SampleContent"),
        ],
      },
    },
  ],
};

const card = {
  mod: "SampleBase",
  itemId: "3900000001",
  uploadedVersion: "1.0.0",
  uploadedVisibility: "private",
  hold: null,
  requires: [],
  itemUrl: "https://steamcommunity.com/sharedfiles/filedetails/?id=3900000001",
  receipts: [
    {
      folder: "20261123-090000-1.0.0-create",
      version: "1.0.0",
      operation: "create",
      visibility: "private",
      via: "steam",
      status: "created-unverified",
      itemId: "3900000001",
      startedAt: "2026-11-23T09:00:00+11:00",
      finishedAt: null,
      needsAgreement: false,
    },
  ],
  reminders: [],
  title: "Sample Base",
  version: "1.1.0",
  tags: ["Mod", "1.7"],
  operation: "update",
  blockers: [],
  requiredItems: [],
  changeNote: "[h1]Sample Base 1.1.0[/h1]\nSecond.\n",
  changeNoteVersions: ["1.1.0"],
  changeNoteOmitted: [],
  preview: "About/Preview.png",
  files: 4,
  due: true,
};

const pageText = {
  mod: "SampleBase",
  path: "workshop/SampleBase/page.bbcode",
  exists: true,
  text: "[h1]Sample Base[/h1]\n[b]Version:[/b] 1.1.0\n[b]Publication status:[/b] Private\n\nWhat it does.\n",
  title: "Sample Base",
  version: "1.1.0",
  bytes: 90,
  budget: 7500,
  problems: [],
};

const sent = {
  result: {
    ok: true,
    refusal: null,
    data: {
      ok: true,
      lines: ["Upload plan: update SampleBase 1.1.0 as private"],
      status: "submitted-unverified",
    },
  },
};

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    publish_waiting: { result: { waiting: 1, mods: ["SampleBase"] } },
    publish_read: { result: reading },
    publish_show: { result: card },
    publish_page_text: { result: pageText },
    publish_check_page: {
      result: {
        ...pageText,
        problems: [
          "the page must not contain ASCII double quotes or backslashes; use typographic quotes",
        ],
      },
    },
    publish_upload: sent,
    publish_prepare: sent,
  });
  await page.goto("/");
  await page.evaluate(() => {
    const scope = window as unknown as Record<string, unknown>;
    const internals = scope.__TAURI_INTERNALS__ as {
      invoke: (
        command: string,
        args?: Record<string, unknown>,
      ) => Promise<unknown>;
    };
    const asked: unknown[] = [];
    scope.__asked = asked;
    const invoke = internals.invoke;
    internals.invoke = (command, args) => {
      const plain = Object.fromEntries(
        Object.entries(args ?? {}).filter(([key]) => key !== "onProgress"),
      );
      asked.push({ command, ...plain });
      return invoke(command, args);
    };
  });
}

async function asked(
  page: Page,
  command: string,
): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    (name) =>
      (
        (window as unknown as Record<string, unknown>).__asked as {
          command: string;
        }[]
      ).filter((a) => a.command === name),
    command,
  ) as Promise<Record<string, unknown>[]>;
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
  test.describe(`Publish page, ${name}`, () => {
    test.use({ viewport });

    test("Home says an update waits, and the page shows each mod's card and the chosen one's page", async ({
      page,
    }) => {
      await open(page);
      await expect(
        page.getByText(
          "One of your Workshop items has a newer version than the one on Steam.",
        ),
      ).toBeVisible();
      await page.getByRole("button", { name: "Go to Publish" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Publish your mods",
      );
      const list = page.getByRole("navigation", {
        name: "Your mods, dependencies first",
      });
      await expect(
        list.getByRole("button", { name: /SampleBase.*A newer version waits/ }),
      ).toBeVisible();
      await expect(
        list.getByRole("button", {
          name: /SampleContent.*Not on Steam yet.*Held back/,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: "Sample Base" }),
      ).toBeVisible();
      const preview = page.getByRole("region", {
        name: "As Steam will show it",
      });
      await expect(preview.locator("strong").first()).toHaveText("Version:");
      await audit(page);
    });

    test("an update asks first, and nothing is sent until the yes", async ({
      page,
    }) => {
      await open(page);
      await page.keyboard.press("Shift+W");
      await page.getByRole("button", { name: "Send the update" }).click();
      await expect(
        page.getByText(
          /Send Sample Base 1\.1\.0 to item 3900000001 through The Steam client\?/,
        ),
      ).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      expect(await asked(page, "publish_upload")).toEqual([]);
      await page.keyboard.press("Shift+U");
      await page
        .getByRole("group", { name: "Are you sure?" })
        .getByRole("button", { name: "Send the update" })
        .click();
      await expect(
        page.getByText("SampleBase was sent to Steam.", { exact: false }),
      ).toBeVisible();
      expect(await asked(page, "publish_upload")).toEqual([
        {
          command: "publish_upload",
          game: "first",
          repository: "first-mods",
          modName: "SampleBase",
          kind: "update",
          via: "steam",
        },
      ]);
    });

    test("making an item public asks twice, the second naming everyone", async ({
      page,
    }) => {
      await open(page);
      await page.keyboard.press("Shift+W");
      await page.getByRole("button", { name: /SampleExtra/ }).click();
      await page.getByRole("button", { name: "Make public" }).click();
      await page.getByRole("button", { name: "Go on" }).click();
      expect(await asked(page, "publish_upload")).toEqual([]);
      await expect(
        page.getByText(/Everyone on Steam will be able to see/),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Make it public for everyone" })
        .click();
      expect((await asked(page, "publish_upload"))[0]).toMatchObject({
        modName: "SampleExtra",
        kind: "public",
      });
    });

    test("the page editor shows the problems the tools find and keeps Save off until they are fixed", async ({
      page,
    }) => {
      await open(page);
      await page.keyboard.press("Shift+W");
      const source = page.getByRole("textbox", {
        name: "The page, in Steam's BBCode",
      });
      await source.fill('[h1]Sample Base[/h1]\nA "quote"\n');
      await expect(
        page.getByText("1 problem to fix before saving:"),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Save the page" }),
      ).toBeDisabled();
      await audit(page);
    });
  });
}
