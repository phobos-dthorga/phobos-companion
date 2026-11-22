import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

function entry(
  version: string,
  section: string,
  lead: string,
  rest: string,
  commit: string | null = "aaaaaaaaaaaa",
) {
  return {
    version,
    section,
    text: `**${lead}** ${rest}`,
    lead,
    aboutSaves: section === "Save compatibility",
    commit,
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
                entry(
                  "1.3.0",
                  "Added",
                  "Sample boats float.",
                  "On **calm** water.",
                ),
                entry(
                  "1.3.0",
                  "Fixed",
                  "Sample wheels turn.",
                  "At last.",
                  "bbbbbbbbbbbb",
                ),
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

/** Two made-up pictures 8 x 4 pixels: before has a stray white line down its right edge, as the truck kits had; after has not. */
const BEFORE_PNG = Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAECAYAAACzzX7wAAAAIUlEQVR4nGNsaGj4z4AEGhoaGGHs/////2dClsQGKFcAAIUbCARc/+k8AAAAAElFTkSuQmCC",
    "base64",
  ),
);
const AFTER_PNG = Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAECAYAAACzzX7wAAAAHElEQVR4nGNsaGj4z4AEGhoaGJH5TMgcbIByBQDwkwQIPakIVQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

/** A made-up tone a quarter of a second long, as a 16-bit mono WAV at 8 kHz. */
function toneWav(hz: number, amplitude: number): number[] {
  const rate = 8000;
  const frames = 2000;
  const bytes = Buffer.alloc(44 + frames * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(36 + frames * 2, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++)
    bytes.writeInt16LE(
      Math.round(amplitude * 32767 * Math.sin((2 * Math.PI * hz * i) / rate)),
      44 + i * 2,
    );
  return Array.from(bytes);
}

const armour = {
  path: "mods/Sample Mod/Textures/Armour.png",
  oldPath: null,
  change: "changed",
  kind: "other",
  language: "plain",
  binary: true,
  additions: 0,
  deletions: 0,
  truncated: false,
  hunks: [],
  media: "picture",
  sizeBefore: 120,
  sizeAfter: 110,
};

const horn = {
  ...armour,
  path: "mods/Sample Mod/Sounds/Horn.wav",
  media: "sound",
  sizeBefore: 4044,
  sizeAfter: 4044,
};

function mediaCode(file: typeof armour) {
  const code = sampleCode();
  code.result.code.files = [file];
  return code;
}

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
        files: [boat, wheel, defs, picture] as Record<string, unknown>[],
        filesLeftOut: 0,
        additions: 8,
        deletions: 1,
      },
    },
  };
}

async function open(
  page: Page,
  code: unknown = sampleCode(),
  more: Record<string, { result: unknown }> = {},
) {
  await mockHost(page, {
    ...more,
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    changes_list: sampleChanges,
    entry_code: code as never,
    "connections:changed": {
      result: {
        ok: true,
        refusal: null,
        data: {
          commit: {
            hash: "4d332ddf0123456789",
            subject: "Sample Mod 1.3.0: boats",
          },
          files: [{ file: "src/Sample/Boat.cs", lines: 8, placed: 8 }],
          things: [
            {
              id: "cs:Sample.Boat.Float",
              name: "Boat.Float",
              kind: "method",
              language: "csharp",
              file: "src/Sample/Boat.cs",
              line: 4,
              end: 9,
              owner: null,
              external: false,
              assembly: null,
              linesChanged: 6,
              inGraph: true,
            },
            {
              id: "cs:Sample.Boat.Sink",
              name: "Boat.Sink",
              kind: "method",
              language: "csharp",
              file: "src/Sample/Boat.cs",
              line: 12,
              end: 14,
              owner: null,
              external: false,
              assembly: null,
              linesChanged: 2,
              inGraph: false,
            },
          ],
        },
      },
    },
    "connections:around": {
      result: {
        ok: true,
        refusal: null,
        data: {
          centre: {
            id: "cs:Sample.Boat.Float",
            name: "Boat.Float",
            kind: "method",
            language: "csharp",
            file: "src/Sample/Boat.cs",
            line: 4,
            end: 9,
            owner: null,
            external: false,
            assembly: null,
            connections: 1,
          },
          groups: [
            {
              relation: "called-by",
              kind: "calls",
              outward: false,
              count: 1,
              exact: true,
              nodes: [
                {
                  id: "cs:Sample.Harbour.Launch",
                  name: "Harbour.Launch",
                  kind: "method",
                  language: "csharp",
                  file: "src/Sample/Harbour.cs",
                  line: 3,
                  end: 8,
                  owner: null,
                  external: false,
                  assembly: null,
                  exact: true,
                  connections: 2,
                },
              ],
            },
          ],
        },
      },
    },
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

    test("shows how the code a commit changed connects", async ({ page }) => {
      await open(page);
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      const viewer = page.getByRole("dialog");
      await viewer.getByRole("button", { name: "How it connects" }).click();
      await expect(
        viewer.getByRole("button", { name: /Boat\.Float\s*6 lines/ }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(viewer).toContainText(
        "One thing it changed is no longer in the code.",
      );
      const picture = viewer.getByRole("group", {
        name: "How Boat.Float connects, drawn around it",
      });
      await expect(
        picture.getByRole("button", { name: /^Harbour\.Launch, method/ }),
      ).toBeVisible();
      await audit(page);
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
      await expect(pane.locator(".line.diff-removed .mark")).toHaveText("−");
      await viewer
        .getByRole("button", { name: "The code as it now stands" })
        .click();
      await expect(pane.locator(".line.diff-removed")).toHaveCount(0);
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

    test("a version from several commits shows each group's code; one commit, one button", async ({
      page,
    }) => {
      await open(page);
      const several = page.getByRole("region", { name: "1.3.0" });
      await expect(several).toContainText("written in 2 commits");
      await expect(
        several.getByRole("button", { name: /Show the code/ }),
      ).toHaveCount(2);
      await expect(
        several.locator("strong", { hasText: "calm" }),
      ).toBeVisible();
      await expect(several).not.toContainText("**");
      await page.getByRole("button", { name: "Other Sample" }).click();
      const single = page.getByRole("region", { name: "0.4.0" });
      await expect(
        single.getByRole("button", {
          name: "Show the code behind: Sample lamps glow.",
        }),
      ).toHaveText("Show the code for this version");
    });

    test("draws a changed picture, flicks it and marks what changed", async ({
      page,
    }) => {
      await open(page, mediaCode(armour), {
        "changed_file:before": { result: BEFORE_PNG },
        "changed_file:after": { result: AFTER_PNG },
      });
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      const viewer = page.getByRole("dialog");
      await expect(viewer).toContainText("A picture");
      await expect(viewer).toContainText("120 B before, 110 B after");
      const fitted = viewer.getByRole("img", { name: "The picture, After" });
      await expect(fitted).toBeVisible();
      // Fit shows the whole picture (0.52.0): no taller than half the window, and a whole number of times its 8 x 4 pixels.
      const drawn = await fitted
        .locator("canvas")
        .evaluate((canvas) => [
          canvas.getBoundingClientRect().width,
          canvas.getBoundingClientRect().height,
          window.innerHeight,
        ]);
      expect(drawn[1]).toBeLessThanOrEqual(drawn[2] * 0.5 + 1);
      expect(drawn[0] % 8).toBe(0);
      expect(drawn[0]).toBe(drawn[1] * 2);
      await viewer.getByRole("button", { name: "Show what changed" }).click();
      await expect(viewer).toContainText("4 pixels changed (12.5 %");
      await expect(viewer).toContainText(
        "All within 1 × 4 pixels, from 7 across and 0 down.",
      );
      await audit(page);
      await page.keyboard.press("z");
      await expect(viewer).toContainText("Showing: Before");
      await page.keyboard.press("=");
      await expect(viewer.getByRole("button", { name: "1×" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(
        viewer.getByRole("button", { name: "Open after with its own program" }),
      ).toBeVisible();
    });

    test("plays and measures a changed sound", async ({ page }) => {
      await open(page, mediaCode(horn), {
        "changed_file:before": { result: toneWav(440, 0.5) },
        "changed_file:after": { result: toneWav(440, 0.25) },
      });
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      const viewer = page.getByRole("dialog");
      await expect(viewer).toContainText("A sound");
      await expect(
        viewer.getByRole("region", { name: "Before" }),
      ).toContainText("LUFS");
      await expect(
        viewer.getByRole("img", { name: /The spectrogram, After/ }),
      ).toBeVisible();
      await expect(viewer).toContainText(
        "Nothing above 4 kHz loud enough to hold one.",
      );
      await audit(page);
    });
  });
}
