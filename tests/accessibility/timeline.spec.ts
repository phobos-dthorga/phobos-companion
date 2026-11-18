import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

/** Noon UTC, the same day in every time zone the audit may run in. */
const noon = (day: string) => `${day}T12:00:00+00:00`;

/** Invented history, for the audit only. The program itself never shows sample data. */
const sampleTimeline = {
  repositories: ["first-mods"],
  log_exists: true,
  facts: [
    {
      kind: "installed",
      time: noon("2026-11-18"),
      source: "log",
      product: "Sample Mod",
      mod: "SampleMod",
      repository: "first-mods",
      changelog: "mods/Sample Mod/CHANGELOG.md",
      version: "1.3.0",
      commit: "4d332ddf0123",
    },
    {
      kind: "installed",
      time: noon("2026-11-18"),
      source: "log",
      product: "Other Sample",
      mod: "OtherSample",
      repository: "first-mods",
      changelog: "mods/Other Sample/CHANGELOG.md",
      version: "0.4.0",
      commit: "4d332ddf0123",
    },
    {
      kind: "version-written",
      time: "2026-11-18T11:00:00+00:00",
      source: "git",
      product: "Sample Mod",
      repository: "first-mods",
      changelog: "mods/Sample Mod/CHANGELOG.md",
      commit: "4d332ddf0123456789",
      subject: "Sample Mod 1.3.0: boats",
      version: "1.3.0",
      count: 2,
      entries: [
        { lead: "Sample boats float.", section: "Added" },
        { lead: "Sample sails.", section: "Added" },
      ],
      summary: "Boats",
    },
    {
      kind: "entries-reworded",
      time: noon("2026-11-10"),
      source: "git",
      product: "Sample Mod",
      repository: "first-mods",
      changelog: "mods/Sample Mod/CHANGELOG.md",
      commit: "bbbbbbbb0123",
      subject: "Sample Mod: clearer wheels",
      version: "1.2.0",
      count: 1,
      entries: [
        {
          lead: "Sample wheels turn.",
          section: "Fixed",
          was: "**Sample wheels turn.** As they should.",
          now: "**Sample wheels turn.** As they should, on ice too.",
        },
      ],
    },
    {
      kind: "product-ended",
      time: noon("2026-11-02"),
      source: "git",
      product: "Old Sample",
      repository: "first-mods",
      changelog: "mods/Old Sample/CHANGELOG.md",
      commit: "cccccccc0123",
      subject: "Old Sample merged into Sample Mod",
      mergedInto: "Sample Mod",
    },
    {
      kind: "product-started",
      time: noon("2026-10-20"),
      source: "git",
      product: "Old Sample",
      repository: "first-mods",
      changelog: "mods/Old Sample/CHANGELOG.md",
      commit: "dddddddd0123",
      subject: "Old Sample 0.1.0",
      count: 3,
    },
  ],
};

const sampleStood = {
  found: true,
  refusal: null,
  stood: {
    product: "Sample Mod",
    changelog: "mods/Sample Mod/CHANGELOG.md",
    commit: {
      hash: "bbbbbbbb0123456789",
      time: noon("2026-11-10"),
      author: "Sample Author",
      subject: "Sample Mod: clearer wheels",
    },
    stillThere: true,
    since: { added: 2, reworded: 1, removed: 1 },
    versions: [
      {
        version: "1.2.0",
        heading: "2026-11-10 - Draft",
        summary: "Wheels",
        entries: [
          {
            section: "Fixed",
            text: "**Sample wheels turn.** As they should.",
            lead: "Sample wheels turn.",
            since: "reworded",
            now: "**Sample wheels turn.** As they should, on ice too.",
            commit: "bbbbbbbb0123",
          },
          {
            section: "Added",
            text: "**Sample lamps.** Lamps glow.",
            lead: "Sample lamps.",
            since: "removed",
            now: null,
            commit: "bbbbbbbb0123",
          },
          {
            section: "Added",
            text: "**Sample oars.** Boats row.",
            lead: "Sample oars.",
            since: "kept",
            now: null,
            commit: "eeeeeeee0123",
          },
        ],
      },
    ],
  },
};

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    timeline: { result: sampleTimeline },
    as_it_stood: { result: sampleStood },
    entry_code: {
      result: {
        found: true,
        refusal: null,
        command_line: "python -m phobos_modkit changes entry   (on first-mods)",
        code: {
          repository: "first-mods",
          changelog: "mods/Sample Mod/CHANGELOG.md",
          commit: {
            hash: "bbbbbbbb0123456789",
            time: "2026-11-10T12:00:00+00:00",
            author: "Sample Author",
            subject: "Sample Mod: clearer wheels",
          },
          writtenWith: ["**Sample lamps.** Lamps glow."],
          files: [],
          filesLeftOut: 0,
          additions: 0,
          deletions: 0,
        },
      },
    },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "What happened to First Sample's mods",
  );
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

async function smallControls(page: Page, scope: string) {
  return page
    .locator(scope)
    .evaluate(
      (root, min) =>
        [...root.querySelectorAll("button, summary")]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height < min).length,
      CONTROL_MIN_PX,
    );
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`Timeline page, ${name}`, () => {
    test.use({ viewport });

    test("shows each mod's lane and every fact day by day, and passes the audit", async ({
      page,
    }) => {
      await open(page);
      const overview = page.getByRole("group", {
        name: "What happened to each mod, day by day",
      });
      await expect(
        overview.getByRole("button", {
          name: /^Sample Mod, .*: Installed, and one more thing$/,
        }),
      ).toBeVisible();
      await expect(
        overview.getByRole("button", {
          name: /^Old Sample, .*: Ended: merged into Sample Mod$/,
        }),
      ).toBeVisible();
      await expect(page.locator("main")).toContainText(
        "Version written, with 2 entries",
      );
      await expect(page.locator("main")).toContainText(
        "2 mods installed together",
      );
      await expect(
        page.getByRole("button", {
          name: /^Read Other Sample's changelog as it stood on .*18 Nov/,
        }),
      ).toBeVisible();
      await expect(page.locator("main")).not.toContainText("first-mods");
      await audit(page);
      expect(await smallControls(page, "main")).toBe(0);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("a mark takes the keyboard to its day, and a mod's name shows only that mod", async ({
      page,
    }) => {
      await open(page);
      const overview = page.getByRole("group", {
        name: "What happened to each mod, day by day",
      });
      await overview
        .getByRole("button", { name: /^Old Sample, .*: Changelog began/ })
        .click();
      await expect(page.locator("h3:focus")).toBeVisible();
      await overview
        .getByRole("button", { name: /^Old Sample/ })
        .first()
        .click();
      await expect(page.locator("main")).not.toContainText(
        "Version written, with 2 entries",
      );
      await page
        .getByRole("button", {
          name: "Showing only Old Sample: show every mod",
        })
        .click();
      await expect(page.locator("main")).toContainText(
        "Version written, with 2 entries",
      );
      await page
        .getByRole("button", { name: "What was done on this PC" })
        .click();
      await expect(page.locator("main")).not.toContainText(
        "Version written, with 2 entries",
      );
      await expect(page.locator("main")).toContainText("Installed");
    });

    test("reads a changelog as it stood, marking what changed since", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", {
          name: /^Read Sample Mod's changelog as it stood on .*10 Nov/,
        })
        .click();
      const stood = page.getByRole("dialog");
      await expect(stood).toContainText(
        "Since then: 2 added, 1 reworded, 1 taken out.",
      );
      await expect(stood).toContainText("Reworded since. It now reads:");
      await expect(stood).toContainText("Taken out since.");
      await expect(stood).toContainText("Sample oars.");
      await audit(page);
      expect(await smallControls(page, "dialog")).toBe(0);
      await stood
        .getByRole("button", { name: "Only what changed since" })
        .click();
      await expect(stood).not.toContainText("Sample oars.");
      await stood.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("shows the code behind entries as they stood, a button a commit", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", {
          name: /^Read Sample Mod's changelog as it stood on .*10 Nov/,
        })
        .click();
      const stood = page.getByRole("dialog");
      await expect(stood).toContainText(
        "This version was written in 2 commits",
      );
      await stood
        .getByRole("button", {
          name: "Show the code behind: Sample wheels turn., and one more entry the same commit wrote",
        })
        .click();
      const viewer = page.getByRole("dialog", { name: "Sample wheels turn." });
      await expect(viewer).toContainText("Sample Mod: clearer wheels");
      await audit(page);
      await viewer.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(1);
      await stood.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });
  });
}
