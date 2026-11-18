import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

function entry(version: string, section: string, lead: string, rest = "") {
  return {
    version,
    section,
    text: `**${lead}** ${rest}`.trim(),
    lead,
    aboutSaves: section === "Save compatibility",
  };
}

const saveNote = {
  version: "1.3.0",
  section: "Save compatibility",
  text: "Not safe to remove: saves hold the new sample things.",
  lead: "Not safe to remove: saves hold the new sample things.",
  aboutSaves: true,
};

const gains = [
  entry("1.3.0", "Added", "Sample boats float.", "On water, mostly."),
  saveNote,
  ...Array.from({ length: 9 }, (_, i) =>
    entry("1.2.1", "Fixed", `Sample fix ${i + 1}.`, "Now right."),
  ),
];

/** An invented repository, for the audit only. The program itself never shows sample data. */
function sampleInstalls(running: string[]) {
  const copy = (kind: string, version: string, extra = {}) => ({
    kind,
    name: "Sample Mod",
    version,
    record: null,
    backup: null,
    taken: null,
    size: null,
    hasChangelog: true,
    direction: null,
    ...extra,
  });
  return {
    result: [
      {
        repository: "first-mods",
        command_line: "python scripts/installs.py status   (in first-mods)",
        status: {
          repository: "first-mods",
          gameRunning: running,
          space: {
            backups: 52_000_000,
            backupsFree: 20_000_000_000,
            targetFree: 100_000_000_000,
            spare: 1_073_741_824,
          },
          mods: [
            {
              mod: "SampleMod",
              name: "Sample Mod",
              state: "behind",
              repository: copy("repository", "1.3.0"),
              installed: copy("installed", "1.2.0", {
                record: {
                  format: 1,
                  mod: "SampleMod",
                  version: "1.2.0",
                  commit: "4d332ddf0123",
                  uncommittedCount: 0,
                  installed: "2026-11-18T09:00:00+00:00",
                },
              }),
              update: {
                gain: gains,
                lose: [],
                reworded: [],
                saveNotes: [saveNote],
                summaries: { "1.3.0": "Boats" },
              },
              uncommittedCount: 2,
              commitsSince: 3,
              backups: [
                {
                  ...copy("backup", "1.1.0", {
                    backup: "SampleMod-20261117-120000",
                    taken: "2026-11-17T12:00:00",
                    size: 26_000_000,
                    direction: "older",
                  }),
                  delta: {
                    gain: [],
                    lose: [entry("1.2.0", "Added", "Sample lamps glow.")],
                    reworded: [],
                    saveNotes: [],
                    summaries: {},
                  },
                },
              ],
            },
            {
              mod: "OtherMod",
              name: "Other Sample",
              state: "up-to-date",
              repository: copy("repository", "0.4.0"),
              installed: copy("installed", "0.4.0"),
              update: {
                gain: [],
                lose: [],
                reworded: [],
                saveNotes: [],
                summaries: {},
              },
              uncommittedCount: 0,
              commitsSince: null,
              backups: [],
            },
          ],
        },
      },
    ],
  };
}

async function open(page: Page, running: string[] = []) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    mod_installs: sampleInstalls(running),
    move_install: {
      result: {
        ok: true,
        title: "Backed up SampleMod",
        refusal: null,
        data: { backup: "SampleMod-20261118-210000" },
      },
    },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Mods", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your installed mods in First Sample",
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
  test.describe(`Mods page, ${name}`, () => {
    test.use({ viewport });

    test("shows what installing would give, save notes first, and passes the audit", async ({
      page,
    }) => {
      await open(page);
      const card = page.getByRole("article", { name: "Sample Mod" });
      await expect(card).toContainText("The repository has more");
      await expect(card).toContainText("give you 11 entries");
      await expect(card.locator(".saves")).toContainText("Not safe to remove");
      await expect(card).toContainText("Show all 11");
      await expect(card).toContainText("3 commits have changed it since");
      await audit(page);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("asks before a move, and says what it did", async ({ page }) => {
      await open(page);
      const card = page.getByRole("article", { name: "Sample Mod" });
      await card
        .getByRole("button", { name: "Back up the installed copy" })
        .click();
      const confirm = card.getByRole("group", { name: "Confirm" });
      await expect(confirm).toContainText(
        "Copy the installed Sample Mod 1.2.0",
      );
      await audit(page);
      await confirm.getByRole("button", { name: "Yes, back it up" }).click();
      await expect(page.locator("main p.status")).toContainText(
        "Backed up SampleMod",
      );
    });

    test("going back shows what it takes away and waits for the game to close", async ({
      page,
    }) => {
      await open(page, ["rimworld.exe"]);
      await expect(page.locator(".running")).toContainText(
        "First Sample is running",
      );
      const card = page.getByRole("article", { name: "Sample Mod" });
      await card.locator("details.backups > summary").click();
      await card
        .getByRole("button", { name: "What going back changes" })
        .click();
      await expect(card.locator(".backup-delta")).toContainText(
        "Sample lamps glow.",
      );
      await expect(
        card.getByRole("button", { name: "Go back to this" }),
      ).toBeDisabled();
      await expect(
        card.getByRole("button", { name: "Install from the repository" }),
      ).toBeDisabled();
      await expect(
        card.getByRole("button", { name: "Back up the installed copy" }),
      ).toBeEnabled();
      const small = await page.evaluate(
        (min) =>
          [...document.querySelectorAll("main button, main summary")]
            .map((e) => e.getBoundingClientRect())
            .filter((r) => r.width > 0 && r.height < min).length,
        CONTROL_MIN_PX,
      );
      expect(small).toBe(0);
      await audit(page);
    });
  });
}
