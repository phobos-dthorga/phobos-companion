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
          canBuild: true,
          needsBuild: true,
          space: {
            backups: 52_000_000,
            backupsFree: 20_000_000_000,
            targetFree: 100_000_000_000,
            spare: 1_073_741_824,
            duplicates: 1,
            duplicatesSize: 26_000_000,
          },
          mods: [
            {
              mod: "SampleMod",
              name: "Sample Mod",
              changelog: "mods/SampleMod/CHANGELOG.md",
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
              installedCommit: { commit: "4d332ddf0123", exact: true },
              files: {
                total: 3,
                counts: { code: 1, defs: 2 },
                paths: [
                  {
                    path: "1.7/Assemblies/Sample.dll",
                    change: "changed",
                    category: "code",
                  },
                  {
                    path: "Common/Defs/Boats.xml",
                    change: "added",
                    category: "defs",
                  },
                  {
                    path: "Common/Defs/Old.xml",
                    change: "removed",
                    category: "defs",
                  },
                ],
              },
              build: {
                needsBuild: true,
                projects: [
                  {
                    project: "Sample",
                    needsBuild: true,
                    built: null,
                    newest: null,
                    newestFile: "src/Sample/Boat.cs",
                  },
                ],
              },
              settings: [
                {
                  mod: "SampleMod",
                  class: "Sample.Settings",
                  key: "Sample_Sails",
                  label: "Boats have sails",
                  what: "added",
                  before: null,
                  after: "True",
                },
              ],
              settingsNote: null,
              lookOut: [{ id: "12", title: "Boats float", version: "1.3.0" }],
              backups: [
                {
                  ...copy("backup", "1.1.0", {
                    backup: "SampleMod-20261117-130000",
                    taken: "2026-11-17T13:00:00",
                    size: 26_000_000,
                    direction: "older",
                    sameAs: "SampleMod-20261117-120000",
                    sameKind: "rebuilt",
                  }),
                  delta: {
                    gain: [],
                    lose: [entry("1.2.0", "Added", "Sample lamps glow.")],
                    reworded: [],
                    saveNotes: [],
                    summaries: {},
                  },
                },
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
              changelog: "mods/OtherMod/CHANGELOG.md",
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
              installedCommit: null,
              files: { total: 0, counts: {}, paths: [] },
              build: { needsBuild: false, projects: [] },
              settings: null,
              settingsNote: null,
              lookOut: [],
              backups: [],
            },
          ],
        },
      },
    ],
  };
}

/** Invented texture findings, for the audit only. */
function sampleTextures(running: string[]) {
  const found = (name: string, stale: number, missing: number) => ({
    name,
    packageId: name.toLowerCase().replace(/ /g, "."),
    folderName: name.replace(/ /g, ""),
    source: "Workshop",
    pictures: 40,
    stale,
    missing,
    leftOver: 0,
    stalePaths: [],
    missingPaths: [],
  });
  return {
    result: {
      checkedAt: "2026-11-18T10:00:00+00:00",
      gameRunning: running,
      todds: "todds.exe",
      totals: {
        mods: 50,
        pictures: 4000,
        staleMods: 1,
        missingMods: 1,
        stale: 4,
        missing: 30,
        leftOver: 0,
      },
      mods: [found("Old Pictures", 4, 0), found("New Pictures", 0, 30)],
    },
  };
}

const sampleLedger = [
  {
    repository: "first-mods",
    seen: ["SampleBoats_Old|added|aaaaaaaa0123456789"],
    settings: [
      {
        time: "2026-11-19T07:00:00+11:00",
        commit: "4d332ddf0123456789",
        subject: "Sample Mod 1.3.0: boats",
        mod: "SampleMod",
        product: "Sample Mod",
        key: "SampleBoats_Float",
        label: "Boats float",
        what: "added",
        before: null,
        after: "True",
      },
      {
        time: "2026-11-18T07:00:00+11:00",
        commit: "bbbbbbbb0123456789",
        subject: "Sample Mod 1.2.0: sails",
        mod: "SampleMod",
        product: "Sample Mod",
        key: "SampleBoats_SailSize",
        label: null,
        what: "default",
        before: "3",
        after: "5",
      },
      {
        time: "2026-11-01T07:00:00+11:00",
        commit: "aaaaaaaa0123456789",
        subject: "Sample Mod 1.0.0",
        mod: "SampleMod",
        product: "Sample Mod",
        key: "SampleBoats_Old",
        label: "Old boats",
        what: "added",
        before: null,
        after: "False",
      },
    ],
  },
];

async function open(
  page: Page,
  running: string[] = [],
  slowRead = false,
  // Changes the sample before the page reads it, for a case one test needs.
  edit: (installs: ReturnType<typeof sampleInstalls>) => void = () => {},
) {
  const installs = sampleInstalls(running);
  edit(installs);
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    // A slow read, for the bars a read again shows: the tools speak three progress lines, a moment apart.
    mod_installs: slowRead
      ? {
          ...installs,
          pauseMs: 500,
          progress: [1, 2, 3].map((step) => ({
            label: "Reading the installed mods",
            step,
            of: 3,
            detail: `mod ${step} of 3`,
          })),
        }
      : installs,
    texture_status: sampleTextures(running),
    move_install: {
      pauseMs: 400,
      progress: [
        {
          label: "Building Sample",
          step: 1,
          of: 3,
          detail: "building src/Sample/Sample.csproj",
        },
      ],
      result: {
        ok: true,
        title: "Backed up SampleMod",
        refusal: null,
        data: { backup: "SampleMod-20261118-210000" },
      },
    },
    mod_settings: { result: sampleLedger },
    mark_settings: { result: "2026-11-19T08:00:00Z" },
    entry_code: {
      result: {
        found: true,
        refusal: null,
        command_line: "",
        code: {
          repository: "first-mods",
          changelog: "mods/SampleMod/CHANGELOG.md",
          commit: {
            hash: "4d332ddf0123456789",
            time: "2026-11-18T08:52:50+00:00",
            author: "Sample Author",
            subject: "Sample Mod 1.3.0: boats",
          },
          writtenWith: [],
          files: [],
          filesLeftOut: 0,
          additions: 0,
          deletions: 0,
        },
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

    test("a read again shows a bar while it works, and the button says so", async ({
      page,
    }) => {
      await open(page, [], true);
      const card = page.getByRole("article", { name: "Sample Mod" });
      await expect(card).toBeVisible({ timeout: 10_000 });
      await page
        .getByRole("button", { name: "Read again", exact: true })
        .click();
      await expect(page.getByRole("progressbar").first()).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Reading…", exact: true }),
      ).toBeDisabled();
      await expect(card).toBeVisible();
      await audit(page);
      await expect(
        page.getByRole("button", { name: "Read again", exact: true }),
      ).toBeEnabled({ timeout: 10_000 });
      await expect(page.getByRole("progressbar")).toHaveCount(0);
    });

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
      await expect(card).toContainText("Needs a build");
      await expect(card).toContainText(
        "New: Boats have sails (starts as True)",
      );
      await expect(card).toContainText("One thing to look out for in play");
      await card.getByRole("button", { name: "Show the files" }).click();
      await expect(card).toContainText("Common/Defs/Boats.xml");
      await audit(page);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("entries the repository's changelog does not hold now are not called a loss, and say why", async ({
      page,
    }) => {
      // The owner's screen note of 20 Nov 2026: an install of uncommitted work, later renumbered, read as "take away 9 entries".
      await open(page, [], false, (installs) => {
        const other = installs.result[0].status.mods[1];
        other.state = "unlisted";
        other.installed = { ...other.installed, version: "0.5.0" };
        Object.assign(other.update, {
          unlisted: [
            entry("0.5.0", "Changed", "Sample engines cut."),
            entry("0.5.0", "Added", "Sample logbook."),
          ],
          unlistedWhy: { "0.5.0": "uncommitted" },
        });
      });
      const card = page.getByRole("article", { name: "Other Sample" });
      await expect(card).toContainText(
        "Installed copy has entries the repository's changelog does not hold now",
      );
      await expect(card).toContainText(
        "2 entries not in the repository's changelog now",
      );
      await expect(card).toContainText(
        "0.5.0 was installed from changes not committed then",
      );
      await expect(card).toContainText("Sample engines cut.");
      await expect(card).not.toContainText("take away");
      await audit(page);
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
      await expect(
        page.getByRole("region", { name: "Before you play" }),
      ).toContainText("First Sample is running");
      const card = page.getByRole("article", { name: "Sample Mod" });
      await card.locator("details.backups > summary").click();
      await card
        .getByRole("button", { name: "What going back changes" })
        .first()
        .click();
      await expect(card.locator(".backup-delta")).toContainText(
        "Sample lamps glow.",
      );
      await expect(
        card.getByRole("button", { name: "Go back to this" }).first(),
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

    test("before you play names what to do, and asks before encoding", async ({
      page,
    }) => {
      await open(page);
      const strip = page.getByRole("region", { name: "Before you play" });
      await expect(strip).toContainText("One mod needs a build");
      await expect(strip).toContainText("One mod would show old pictures");
      await strip
        .getByRole("button", { name: "Encode their textures" })
        .click();
      const confirm = strip.getByRole("group", { name: "Confirm" });
      await expect(confirm).toContainText("Old Pictures, New Pictures");
      await audit(page);
      await confirm.getByRole("button", { name: "Cancel" }).click();
      await expect(confirm).toHaveCount(0);
    });

    test("installing and encoding wait while the game runs; building doesn't", async ({
      page,
    }) => {
      await open(page, ["rimworld.exe"]);
      const strip = page.getByRole("region", { name: "Before you play" });
      await expect(strip).toContainText("First Sample is running");
      await expect(
        strip.getByRole("button", { name: "Install everything that changed" }),
      ).toBeDisabled();
      await expect(
        strip.getByRole("button", { name: "Encode their textures" }),
      ).toBeDisabled();
      await expect(
        strip.getByRole("button", { name: "Build now" }),
      ).toBeEnabled();
    });

    test("a move shows how far along it is, with its latest line", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("region", { name: "Before you play" })
        .getByRole("button", { name: "Build now" })
        .click();
      const bar = page.locator("main").getByRole("progressbar").first();
      await expect(bar).toHaveAttribute("aria-valuemax", "3");
      await expect(page.locator("main")).toContainText("Building Sample");
      await expect(page.locator("main")).toContainText("1 of 3");
      await expect(page.locator("main")).toContainText(
        "building src/Sample/Sample.csproj",
      );
      await audit(page);
      await expect(page.locator("main p.status")).toContainText(
        "Backed up SampleMod",
      );
    });

    test("an address naming a changelog and a moment marks the newest backup from before it", async ({
      page,
    }) => {
      await open(page);
      const visit = async (before: string) => {
        await page.getByRole("button", { name: "Go to anything" }).click();
        await page
          .getByLabel("Search for anything, or paste an address")
          .fill(
            `dthorga://mods/first?repository=first-mods&changelog=${encodeURIComponent(
              "mods/SampleMod/CHANGELOG.md",
            )}&before=${encodeURIComponent(before)}`,
          );
        await page.getByRole("button", { name: /Open this address/ }).click();
      };
      await visit("2026-11-18T09:00:00+00:00");
      const card = page.getByRole("article", { name: "Sample Mod" });
      await expect(card).toContainText(
        "The newest backup from before the change you came from",
      );
      await expect(card.locator("li.backup.before")).toContainText("1.1.0");
      await audit(page);
      await visit("2026-11-01T09:00:00+00:00");
      await expect(card).toContainText(
        "No backup of this mod is older than the change you came from",
      );
    });

    test("settings to look at list the new ones, and a mark moves one to those looked at", async ({
      page,
    }) => {
      await open(page);
      const panel = page.getByRole("region", { name: /^Settings to look at/ });
      await expect(panel).toContainText("Boats float");
      await expect(panel).toContainText("Now starts at 5 (was 3)");
      await expect(panel).not.toContainText("Old boats");
      await audit(page);
      await panel
        .getByRole("button", { name: "Mark Boats float as looked at" })
        .click();
      await expect(panel.getByRole("status")).toContainText(
        "Marked one setting as looked at.",
      );
      await panel.getByRole("button", { name: "Show the 2 looked at" }).click();
      await expect(
        panel.getByRole("list", { name: "Settings looked at" }),
      ).toContainText("Old boats");
      await panel.getByRole("button", { name: "Mark it as looked at" }).click();
      await expect(panel).toContainText(
        "Nothing new: every setting has been looked at.",
      );
      await audit(page);
    });

    test("a repeated backup says what it repeats, and removing them asks first", async ({
      page,
    }) => {
      await open(page);
      const repeats = page.locator(".repeats");
      await expect(repeats).toContainText(
        "One backup repeats the one before it",
      );
      await repeats
        .getByRole("button", { name: "Remove repeated backups" })
        .click();
      const question = page.getByRole("group", { name: /Confirm/ });
      await expect(question).toContainText(
        "Remove the one repeated backup (25 MB)?",
      );
      await audit(page);
      await question.getByRole("button", { name: "Yes, remove them" }).click();
      await expect(page.locator("main p.status").first()).not.toBeEmpty();
      const card = page.getByRole("article", { name: "Sample Mod" });
      await card.locator("details.backups > summary").click();
      await expect(card).toContainText(
        "only rebuilt, from source code that had not changed",
      );
    });

    test("an entry opens the code behind it", async ({ page }) => {
      await open(page);
      await page
        .getByRole("article", { name: "Sample Mod" })
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      const viewer = page.getByRole("dialog");
      await expect(viewer).toContainText("Sample Mod 1.3.0: boats");
      await expect(viewer).toContainText(
        "This commit changed nothing but the changelog itself.",
      );
    });
  });
}

test.describe("Settings to look at, shown at once (0.27.0)", () => {
  test("shows the list kept from last time while the read checks it, then the read's", async ({
    page,
  }) => {
    await mockHost(page, {
      home_status: { result: sampleHome() },
      kit_status: healthyKit,
      mod_installs: sampleInstalls([]),
      texture_status: sampleTextures([]),
      // The read speaks once, then takes three seconds to answer.
      mod_settings: {
        result: sampleLedger,
        pauseMs: 3000,
        progress: [{ label: "Reading the history of the mods' settings" }],
      },
    });
    // Last time's list held one setting the read no longer has.
    await page.addInitScript(
      (kept) => {
        localStorage.setItem("companion.ledger.first", JSON.stringify(kept));
      },
      [
        {
          repository: "first-mods",
          seen: [],
          settings: [
            {
              time: "2026-11-10T07:00:00+11:00",
              commit: "cccccccc0123456789",
              subject: "Sample Mod 0.9.0",
              mod: "SampleMod",
              product: "Sample Mod",
              key: "SampleBoats_Kept",
              label: "Kept from last time",
              what: "added",
              before: null,
              after: "True",
            },
          ],
        },
      ],
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Mods", exact: true }).click();
    const panel = page.locator("#settings-to-look");
    await expect(panel).toContainText("Kept from last time");
    await expect(panel).toContainText("checking for changes");
    await expect(panel).toContainText("Boats float", { timeout: 10_000 });
    await expect(panel).not.toContainText("checking for changes");
  });
});

test.describe("Since you last played (0.28.0)", () => {
  const since = "2026-11-19T00:00:00+00:00";
  const gameFiles = {
    name: "First Sample",
    game: null,
    places: { data: null, saves: null, screenshots: [] },
    changed: {
      since,
      sinceLastPlayed: false,
      sincePrevious: true,
      previousLaunchAt: since,
      launchesSeen: 2,
      gameUpdated: false,
      workshop: [
        {
          id: "1",
          title: "Sample Factory",
          bytes: 1,
          updated: 1,
          updatedAt: since,
        },
        {
          id: "2",
          title: "Sample Sails",
          bytes: 1,
          updated: 1,
          updatedAt: since,
        },
        {
          id: "3",
          title: "A Style Pack",
          bytes: 1,
          updated: 1,
          updatedAt: since,
        },
      ],
      workshopCount: 3,
      workshopInstalled: 40,
    },
    saves: { list: [], count: 0, bytes: 0, autosaves: 0 },
    screenshots: { list: [], count: 0, bytes: 0 },
    space: { data: [], dataBytes: 0, install: null, workshop: 0 },
  };
  const kept = {
    available: true,
    ok: true,
    refusal: null,
    report: null,
    data: {
      files: [
        {
          owner: "sample.factory",
          owner_name: "Sample Factory",
          file: "SampleFactory.dll",
          versions: 2,
          newest_version: null,
          newest_seen: "2026-11-19 09:08 UTC",
          previous_seen: "2026-11-18 03:13 UTC",
        },
        {
          owner: "sample.sails",
          owner_name: "Sample Sails",
          file: "SampleSails.dll",
          versions: 2,
          newest_version: null,
          newest_seen: "2026-11-18 03:13 UTC",
          previous_seen: "2026-11-10 03:13 UTC",
        },
      ],
    },
  };
  const targets = {
    available: true,
    data: {
      updates: true,
      updatesNote: null,
      targets: [
        {
          node: "cs:Sample.Conveyor.Tick",
          target: "Sample.Conveyor.Tick",
          name: "Conveyor.Tick",
          assembly: null,
          ours: ["cs:Ours.TickPatch.Prefix"],
          mods: [],
          skippers: 0,
          changed: [
            {
              mod: "Sample Factory",
              file: "SampleFactory.dll",
              versions: "a to b",
              change: "new body (code, +5 -1)",
              newestKept: "2026-11-19T09:08:00+00:00",
            },
          ],
        },
      ],
    },
  };

  test("names the update that changed what our mods patch, leads to it, and offers to keep the builds not kept yet", async ({
    page,
  }) => {
    await mockHost(page, {
      home_status: { result: sampleHome() },
      kit_status: healthyKit,
      mod_installs: sampleInstalls(["RimWorld"]),
      texture_status: sampleTextures(["RimWorld"]),
      mod_settings: { result: sampleLedger },
      game_files: { result: gameFiles },
      updates: { result: kept },
      patch_targets: { result: targets },
      keep_builds: {
        result: {
          available: true,
          ok: true,
          refusal: null,
          report: null,
          data: {},
        },
      },
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Mods", exact: true }).click();
    const since = page.getByRole("group", { name: "Since you last played" });
    await expect(since).toContainText("3 mods updated.");
    await expect(since).toContainText(
      "Sample Factory changed a method our mods patch: Conveyor.Tick.",
    );
    await expect(since).toContainText("could not be checked: Sample Sails.");
    await audit(page);
    await since.getByRole("button", { name: "Keep the new builds" }).click();
    await expect(since).toContainText("The new builds are kept");
    await since.getByRole("button", { name: "See what changed" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "code fits together",
    );
  });
});
