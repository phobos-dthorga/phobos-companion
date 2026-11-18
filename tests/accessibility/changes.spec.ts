import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

function entry(version: string, section: string, lead: string, rest: string) {
  return {
    version,
    section,
    text: `**${lead}** ${rest}`,
    lead,
    aboutSaves: section === "Save compatibility",
  };
}

/** Invented changelogs, for the audit only. The program itself never shows sample data. */
const sampleChanges = {
  result: [
    {
      repository: "first-mods",
      changelogs: [
        {
          changelog: "mods/Sample Mod/CHANGELOG.md",
          product: "Sample Mod",
          versionsInAll: 9,
          versions: [
            {
              version: "1.3.0",
              heading: "2026-11-18 - Draft",
              summary: "Boats",
              entries: [
                entry("1.3.0", "Added", "Sample boats float.", "On water."),
                entry("1.3.0", "Fixed", "Sample wheels turn.", "At last."),
              ],
            },
          ],
        },
        {
          changelog: "mods/OtherMod/CHANGELOG.md",
          product: "Other Sample",
          versionsInAll: 1,
          versions: [
            {
              version: "0.4.0",
              heading: "2026-11-01 - Released",
              summary: "",
              entries: [entry("0.4.0", "Added", "Sample lamps glow.", "")],
            },
          ],
        },
      ],
    },
  ],
};

const boat = {
  path: "src/Sample/Boat.cs",
  oldPath: null,
  change: "added",
  kind: "code",
  language: "csharp",
  binary: false,
  additions: 4,
  deletions: 0,
  truncated: false,
  hunks: [
    {
      header: "",
      lines: [
        { kind: "+", old: null, new: 1, text: "class Boat" },
        { kind: "+", old: null, new: 2, text: "{" },
        {
          kind: "+",
          old: null,
          new: 3,
          text: '    string name = "Audeamus"; // afloat',
        },
        { kind: "+", old: null, new: 4, text: "}" },
      ],
    },
  ],
};

const wheel = {
  path: "src/Sample/Wheel.cs",
  oldPath: null,
  change: "changed",
  kind: "code",
  language: "csharp",
  binary: false,
  additions: 1,
  deletions: 1,
  truncated: false,
  hunks: [
    {
      header: "class Wheel",
      lines: [
        { kind: " ", old: 7, new: 7, text: "class Wheel" },
        { kind: "-", old: 8, new: null, text: "    void Turn() { }" },
        { kind: "+", old: null, new: 8, text: "    void Turn() { Spin(); }" },
      ],
    },
  ],
};

const defs = {
  path: "mods/Sample Mod/Defs/Boats.xml",
  oldPath: null,
  change: "added",
  kind: "data",
  language: "xml",
  binary: false,
  additions: 3,
  deletions: 0,
  truncated: false,
  hunks: [
    {
      header: "",
      lines: [
        { kind: "+", old: null, new: 1, text: "<Defs>" },
        { kind: "+", old: null, new: 2, text: "  <defName>Boat</defName>" },
        { kind: "+", old: null, new: 3, text: "</Defs>" },
      ],
    },
  ],
};

const picture = {
  path: "mods/Sample Mod/Textures/Boat.png",
  oldPath: null,
  change: "added",
  kind: "other",
  language: "plain",
  binary: true,
  additions: 0,
  deletions: 0,
  truncated: false,
  hunks: [],
};

function sampleCode(pauseMs = 0) {
  return {
    pauseMs,
    progress: [
      { label: "Finding the commit that wrote this entry", step: 1, of: 2 },
      { label: "Reading what it changed", step: 2, of: 2 },
    ],
    result: {
      found: true,
      refusal: null,
      command_line: "python -m phobos_modkit changes entry   (on first-mods)",
      code: {
        repository: "first-mods",
        changelog: "mods/Sample Mod/CHANGELOG.md",
        commit: {
          hash: "4d332ddf0123456789",
          time: "2026-11-18T08:52:50+00:00",
          author: "Sample Author",
          subject: "Sample Mod 1.3.0: boats",
        },
        writtenWith: ["**Sample wheels turn.** At last."],
        files: [boat, wheel, defs, picture],
        filesLeftOut: 0,
        additions: 8,
        deletions: 1,
      },
    },
  };
}

async function open(page: Page, code: unknown = sampleCode()) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    changes_list: sampleChanges,
    entry_code: code as never,
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Changes", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "What changed in First Sample",
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
  test.describe(`Changes page, ${name}`, () => {
    test.use({ viewport });

    test("lists each changelog's newest entries and passes the audit", async ({
      page,
    }) => {
      await open(page);
      await expect(page.getByRole("region", { name: "1.3.0" })).toContainText(
        "Sample boats float.",
      );
      await expect(page.locator("main")).toContainText(
        "8 older versions are in mods/Sample Mod/CHANGELOG.md",
      );
      await page.getByRole("button", { name: "Other Sample" }).click();
      await expect(page.getByRole("region", { name: "0.4.0" })).toContainText(
        "Sample lamps glow.",
      );
      await audit(page);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("shows the code behind an entry, coloured, code first", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      const viewer = page.getByRole("dialog");
      await expect(
        viewer.getByRole("heading", { name: "Sample boats float." }),
      ).toBeVisible();
      await expect(viewer).toContainText("Written by commit 4d332ddf");
      await expect(viewer).toContainText("Sample Mod 1.3.0: boats");
      await expect(viewer).toContainText(
        "The same commit wrote one other entry",
      );
      const files = viewer.getByRole("navigation", { name: "Files" });
      await expect(files.getByRole("button").first()).toContainText("Boat.cs");
      await expect(files).toContainText("Data and definitions");
      const pane = viewer.getByRole("region", {
        name: "The code of src/Sample/Boat.cs",
      });
      await expect(pane.locator(".hljs-keyword").first()).toHaveText("class");
      await expect(pane.locator(".hljs-string")).toHaveText('"Audeamus"');
      await audit(page);
      const small = await viewer.evaluate(
        (dialog, min) =>
          [...dialog.querySelectorAll("button, summary")]
            .map((e) => e.getBoundingClientRect())
            .filter((r) => r.width > 0 && r.height < min).length,
        CONTROL_MIN_PX,
      );
      expect(small).toBe(0);
    });

    test("can show only the code as it now stands, and closes", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      const viewer = page.getByRole("dialog");
      await viewer.getByRole("button", { name: /Wheel\.cs/ }).click();
      const pane = viewer.getByRole("region", {
        name: "The code of src/Sample/Wheel.cs",
      });
      await expect(pane).toContainText("void Turn() { }");
      await expect(pane.locator(".line.removed .mark")).toHaveText("−");
      await viewer
        .getByRole("button", { name: "The code as it now stands" })
        .click();
      await expect(pane.locator(".line.removed")).toHaveCount(0);
      await expect(pane).toContainText("void Turn() { Spin(); }");
      await viewer.getByRole("button", { name: /Boat\.png/ }).click();
      await expect(viewer).toContainText("isn't text");
      await viewer.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("says how far along it is while it looks", async ({ page }) => {
      await open(page, sampleCode(600));
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      const bar = page.getByRole("dialog").getByRole("progressbar");
      await expect(bar).toHaveAttribute("aria-valuemax", "2");
      await expect(page.getByRole("dialog")).toContainText("1 of 2");
      await audit(page);
      await expect(page.getByRole("dialog")).toContainText("Written by commit");
    });

    test("an entry whose code can't be found says why", async ({ page }) => {
      await open(page, {
        result: {
          found: false,
          refusal: "That entry is not in this changelog as it stands now.",
          command_line: "",
          code: {},
        },
      });
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      await expect(page.getByRole("dialog")).toContainText(
        "could not be found. That entry is not in this changelog",
      );
    });
  });
}
