import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  healthyKit,
  mockHost,
  sampleAiStatus,
  sampleHome,
  toneWav,
} from "./host";

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

/** A C# file that names the game's data (0.83.0): a translation key it asks for, a Def through a DefOf class, and a key of the game's own. */
const lamp = {
  path: "src/Sample/Lamp.cs",
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
        { kind: "+", old: null, new: 1, text: "class Lamp" },
        {
          kind: "+",
          old: null,
          new: 2,
          text: '    string Words() => "Lamps_Lit".Translate();',
        },
        {
          kind: "+",
          old: null,
          new: 3,
          text: "    Def Sound => LampDefOf.Lamps_Hum;",
        },
        {
          kind: "+",
          old: null,
          new: 4,
          text: '    string Other() => "Game_Key".Translate();',
        },
      ],
    },
  ],
};

function lampCode() {
  const code = sampleCode();
  code.result.code.files = [lamp];
  return code;
}

/** Lamp.cs as the kit reads it with the game named (kit 1.117.0): the names its rules read, and what a field also stands for. */
const lampNames = {
  result: {
    ok: true,
    refusal: null,
    data: {
      file: "src/Sample/Lamp.cs",
      project: "Sample",
      projects: ["Sample"],
      game: "rimworld",
      names: [
        {
          line: 2,
          column: 23,
          length: 9,
          text: "Lamps_Lit",
          kind: "translation key",
          display: "Lamps_Lit",
          id: null,
          node: "data:key/Lamps_Lit",
          exact: false,
          rule: "translate-call",
          ruleWords: "a translation key the code asks for",
          outside: false,
          their: null,
          here: false,
          declared: {
            file: "Languages/English/Keyed/Lamps.xml",
            line: 3,
            end: 3,
          },
          candidates: [
            {
              id: "data:key/Lamps_Lit",
              name: "Lamps_Lit",
              kind: "translation key",
              file: "Languages/English/Keyed/Lamps.xml",
              line: 3,
              end: 3,
            },
          ],
          more: 0,
        },
        {
          line: 3,
          column: 27,
          length: 9,
          text: "Lamps_Hum",
          kind: "field",
          display: "LampDefOf.Lamps_Hum",
          id: "F:Sample.LampDefOf.Lamps_Hum",
          here: false,
          declared: { file: "src/Sample/LampDefOf.cs", line: 5, end: 5 },
          also: {
            rule: "defof-field",
            ruleWords: "a Def a DefOf class holds",
            candidates: [
              {
                id: "def:SoundDef/Lamps_Hum",
                name: "Lamps_Hum",
                kind: "def",
                file: "Defs/Sounds.xml",
                line: 4,
                end: 6,
              },
            ],
            more: 0,
          },
        },
        {
          line: 4,
          column: 23,
          length: 8,
          text: "Game_Key",
          kind: "translation key",
          display: "Game_Key",
          id: null,
          node: null,
          exact: false,
          rule: "translate-call",
          ruleWords: "a translation key the code asks for",
          outside: true,
          their: null,
          here: false,
          declared: {},
          candidates: [],
          more: 0,
        },
      ],
      snippets: {
        "Languages/English/Keyed/Lamps.xml:3": {
          file: "Languages/English/Keyed/Lamps.xml",
          start: 3,
          end: 3,
          lines: ["  <Lamps_Lit>The lamp is lit.</Lamps_Lit>"],
          cut: false,
        },
        "Defs/Sounds.xml:4": {
          file: "Defs/Sounds.xml",
          start: 4,
          end: 6,
          lines: [
            "  <SoundDef>",
            "    <defName>Lamps_Hum</defName>",
            "  </SoundDef>",
          ],
          cut: false,
        },
      },
      errors: 0,
      missingReferences: 0,
      seconds: 2.4,
      commit: "4d332ddf0123456789",
      limits: [
        "Names between data files and code are read by the rules for rimworld, from the text: each says which rule read it, and one may be wrong.",
      ],
    },
  },
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
              // Where it stood at the commit (kit 1.112.0): the class Boat's first four lines in the sample.
              at: { file: "src/Sample/Boat.cs", line: 1, end: 3 },
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
              at: { file: "src/Sample/Boat.cs", line: 4, end: 4 },
            },
          ],
        },
      },
    },
    // The names in Boats.xml, found by name (0.81.0): "Boat" may be the Def or the C# class.
    "connections:names:mods/Sample Mod/Defs/Boats.xml": {
      result: {
        ok: true,
        refusal: null,
        data: {
          file: "mods/Sample Mod/Defs/Boats.xml",
          project: null,
          projects: [],
          exact: false,
          names: [
            {
              // "  <defName>Boat</defName>": Boat starts at column 11.
              line: 2,
              column: 11,
              length: 4,
              text: "Boat",
              kind: "def",
              display: "Boat",
              id: null,
              node: "def:ThingDef/Boat",
              exact: false,
              here: false,
              declared: {
                file: "mods/Sample Mod/Defs/Boats.xml",
                line: 2,
                end: 2,
              },
              candidates: [
                {
                  id: "def:ThingDef/Boat",
                  name: "Boat",
                  kind: "def",
                  file: "mods/Sample Mod/Defs/Boats.xml",
                  line: 2,
                  end: 2,
                },
                {
                  id: "cs:Sample.Boat",
                  name: "Boat",
                  kind: "class",
                  file: "src/Sample/Boat.cs",
                  line: 1,
                  end: 4,
                },
              ],
              more: 0,
            },
          ],
          snippets: {},
          errors: 0,
          missingReferences: 0,
          seconds: 0,
          commit: "4d332ddf0123456789",
          limits: [],
        },
      },
    },
    // The names in Boat.cs, as the kit's names reader would give them (0.79.0): the class, and its field.
    "connections:names": {
      result: {
        ok: true,
        refusal: null,
        data: {
          file: "src/Sample/Boat.cs",
          project: "Sample",
          projects: ["Sample"],
          names: [
            {
              line: 1,
              column: 6,
              length: 4,
              text: "Boat",
              kind: "class",
              display: "Boat",
              id: "T:Sample.Boat",
              here: true,
              declared: { file: "src/Sample/Boat.cs", line: 1, end: 4 },
            },
            {
              line: 3,
              column: 11,
              length: 4,
              text: "name",
              kind: "field",
              display: "Boat.name",
              id: "F:Sample.Boat.name",
              here: true,
              declared: { file: "src/Sample/Boat.cs", line: 3, end: 3 },
            },
          ],
          snippets: {},
          errors: 0,
          missingReferences: 0,
          seconds: 3.1,
          commit: "4d332ddf0123456789",
          limits: [],
        },
      },
    },
    // What the commit did to its calls (0.82.0; kit 1.116.0): Float's call to Sink moved into Moor, and a ring through the
    // game's Thing.Tick, back into Float, is cut.
    "connections:calls": {
      result: {
        ok: true,
        refusal: null,
        data: {
          commit: {
            hash: "4d332ddf0123456789",
            subject: "Sample Mod 1.3.0: boats",
          },
          files: [
            { before: "src/Sample/Boat.cs", after: "src/Sample/Boat.cs" },
          ],
          methods: [
            {
              key: "M:Sample.Boat.Float",
              id: "M:Sample.Boat.Float",
              node: "cs:Sample.Boat.Float",
              display: "Boat.Float()",
              file: "src/Sample/Boat.cs",
              line: 4,
              end: 9,
              status: "changed",
              gone: [
                {
                  key: "M:Sample.Boat.Sink",
                  display: "Boat.Sink()",
                  viaBase: false,
                  file: "src/Sample/Boat.cs",
                  line: 12,
                  node: "cs:Sample.Boat.Sink",
                },
                {
                  key: "M:Verse.Thing.Tick",
                  display: "Thing.Tick()",
                  viaBase: true,
                  assembly: "Assembly-CSharp",
                },
              ],
              new: [
                {
                  key: "M:Sample.Boat.Moor",
                  display: "Boat.Moor()",
                  viaBase: false,
                  file: "src/Sample/Boat.cs",
                  line: 16,
                  node: "cs:Sample.Boat.Moor",
                },
              ],
              kept: [],
              movedTo: [
                {
                  key: "M:Sample.Boat.Moor",
                  display: "Boat.Moor()",
                  calls: ["M:Sample.Boat.Sink"],
                },
              ],
            },
            {
              key: "M:Sample.Boat.Moor",
              id: "M:Sample.Boat.Moor",
              node: "cs:Sample.Boat.Moor",
              display: "Boat.Moor()",
              file: "src/Sample/Boat.cs",
              line: 16,
              end: 18,
              status: "added",
              gone: [],
              new: [
                {
                  key: "M:Sample.Boat.Sink",
                  display: "Boat.Sink()",
                  viaBase: false,
                  file: "src/Sample/Boat.cs",
                  line: 12,
                  node: "cs:Sample.Boat.Sink",
                },
              ],
              kept: [],
              movedFrom: [
                {
                  key: "M:Sample.Boat.Float",
                  display: "Boat.Float()",
                  calls: ["M:Sample.Boat.Sink"],
                },
              ],
            },
          ],
          rings: {
            made: [],
            cut: [
              [
                {
                  key: "M:Sample.Boat.Float",
                  display: "Boat.Float()",
                  outside: false,
                },
                {
                  key: "M:Verse.Thing.Tick",
                  display: "Thing.Tick()",
                  outside: true,
                },
              ],
            ],
            standing: [],
          },
          game: "first",
          gameRead: ["Assembly-CSharp"],
          seconds: 6.8,
          limits: [
            "Every file the commit did not change is read as it stands now.",
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
    // Last, so a test's own answer stands in for the sample's (0.53.0).
    ...more,
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

    test("Summarise this version shows what goes first, and only once an AI is ready (0.72.0)", async ({
      page,
    }) => {
      await open(page, sampleCode(), {
        ai_status: { result: sampleAiStatus },
        ai_prepare_version: {
          result: {
            id: 3,
            what: "summarise-version",
            service: "Ollama",
            model: "sample-model:8b",
            local: true,
            instruction: "You help a person who makes or plays game mods.",
            text: "Product: Sample Mod\nVersion: 1.3.0\n\nAdded:\n- Sample boats float.",
            characters: 60,
          },
        },
        ai_send: {
          result: {
            step: "answered",
            answer: {
              text: "Boats float now.",
              stop: "cut",
              problem: null,
              inputTokens: null,
              outputTokens: null,
            },
            calls: [],
            toolsUnavailable: true,
          },
        },
      });
      const version = page.getByRole("region", { name: "1.3.0" });
      await version
        .getByRole("button", { name: "Summarise this version" })
        .click();
      await expect(version).toContainText(
        "What is sent, from the page as last read (60 characters):",
      );
      await expect(version).toContainText("- Sample boats float.");
      await audit(page);
      await version.getByRole("button", { name: "Send", exact: true }).click();
      await expect(version).toContainText("Boats float now.");
      await expect(version).toContainText("was cut off");
      await expect(version).toContainText(
        "The service did not count the tokens.",
      );
      await expect(version).toContainText(
        "This model can't use the tool kit's reports",
      );
      await audit(page);
    });

    test("no AI ready means no Summarise this version", async ({ page }) => {
      await open(page, sampleCode(), {
        ai_status: { result: { ...sampleAiStatus, ready: false } },
      });
      await expect(page.getByRole("region", { name: "1.3.0" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Summarise this version" }),
      ).toHaveCount(0);
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
      // Coloured by VS Code's grammars, read in a worker (0.76.0).
      await expect(pane.locator(".tok-keyword").first()).toHaveText("class");
      await expect(pane.locator(".tok-string")).toHaveText('"Audeamus"');
      await expect(pane.locator(".tok-comment")).toHaveText("// afloat");
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

    test("shows the calls a commit took away and added, and the ring it cut (0.82.0)", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      const viewer = page.getByRole("dialog");
      await viewer.getByRole("button", { name: "How it connects" }).click();
      const calls = viewer.getByRole("region", {
        name: "What this commit did to its calls",
      });
      await expect(
        calls.getByRole("img", {
          name: /^Ring cut: Boat\.Float\(\) → Thing\.Tick\(\) \(the game's\) → Boat\.Float\(\)/,
        }),
      ).toBeVisible();
      const float = calls.getByRole("group", {
        name: "The calls Boat.Float() makes",
      });
      await expect(float).toContainText("gone");
      await expect(float).toContainText("through base");
      await expect(float).toContainText("moved to Boat.Moor()");
      await expect(float.locator(".call.new")).toHaveCount(1);
      await expect(calls).toContainText(
        "The game's own code was read from Assembly-CSharp, as files.",
      );
      // Drawn at the page's own size, never stretched to fill the viewer, and every word inside its picture (0.83.1): a wide
      // viewer once drew the calls nearly twice as large, a long name spilling out of its box and off the picture's edge.
      for (const svg of await calls.locator("figure svg").all()) {
        const fits = await svg.evaluate((element) => {
          const drawn = element.getBoundingClientRect();
          const scale = drawn.width / Number(element.getAttribute("width"));
          const outside = [...element.querySelectorAll("text")].filter(
            (text) => {
              const box = text.getBoundingClientRect();
              return box.left < drawn.left - 1 || box.right > drawn.right + 1;
            },
          );
          return { scale, outside: outside.map((text) => text.textContent) };
        });
        expect(fits.scale).toBeLessThanOrEqual(1.01);
        expect(fits.outside).toEqual([]);
      }
      await audit(page);
      // Before the commit: no new calls; after it: none gone.
      await calls.getByRole("button", { name: "Before", exact: true }).click();
      await expect(float.locator(".call.new")).toHaveCount(0);
      await expect(float.locator(".call.gone")).toHaveCount(2);
      await calls.getByRole("button", { name: "After", exact: true }).click();
      await expect(float.locator(".call.gone")).toHaveCount(0);
      // A call of ours, pressed, goes in the middle of the picture.
      await calls.getByRole("button", { name: "The change" }).click();
      await float
        .getByRole("button", { name: "Put Boat.Moor() in the middle" })
        .click();
      await expect(
        calls.getByRole("group", { name: "The calls Boat.Moor() makes" }),
      ).toContainText("moved from Boat.Float()");
      await audit(page);
    });

    test("lights the lines of one thing the commit changed, and goes to how it connects with its lines beneath (0.78.0)", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      const viewer = page.getByRole("dialog");
      const pane = viewer.getByRole("region", {
        name: "The code of src/Sample/Boat.cs",
      });
      const things = pane.getByRole("group", {
        name: "What this commit changed in this file: press one to light its lines",
      });
      await things.getByRole("button", { name: /Boat\.Float/ }).click();
      await expect(
        things.getByRole("button", { name: /Boat\.Float/ }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(pane.locator(".line.lit")).toHaveCount(3);
      await expect(pane.locator(".line.lit").first()).toContainText(
        "class Boat",
      );
      await audit(page);
      await pane
        .getByRole("button", { name: "How Boat.Float connects" })
        .click();
      await expect(
        viewer.getByRole("button", { name: "How it connects" }),
      ).toHaveAttribute("aria-pressed", "true");
      const lines = viewer.getByRole("region", {
        name: "Boat.Float in this commit: src/Sample/Boat.cs, lines 1 to 3",
      });
      await expect(lines.locator(".line")).toHaveCount(3);
      await expect(lines).toContainText('"Audeamus"');
      await audit(page);
      // A second press puts the lines out again.
      await viewer.getByRole("button", { name: "What changed" }).click();
      await things.getByRole("button", { name: /Boat\.Float/ }).click();
      await expect(pane.locator(".line.lit")).toHaveCount(0);
    });

    test("a name in C# is pressed to see what it is, stepped through with the keys, and let go (0.79.0)", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      const viewer = page.getByRole("dialog");
      const pane = viewer.getByRole("region", {
        name: "The code of src/Sample/Boat.cs",
      });
      await expect(pane.locator(".nm")).toHaveCount(2);
      await pane.locator(".nm", { hasText: "Boat" }).click();
      const card = pane.getByRole("region", { name: "What Boat is" });
      await expect(card).toContainText("class");
      await expect(card).toContainText(
        "Declared in this repository: src/Sample/Boat.cs, line 1",
      );
      await expect(
        card.getByRole("button", { name: "How Boat connects" }),
      ).toBeVisible();
      await expect(pane.locator(".nm-chosen")).toHaveText("Boat");
      await audit(page);
      await pane.press("ArrowDown");
      await expect(pane.locator(".nm-chosen")).toHaveText("name");
      await expect(
        pane.getByRole("region", { name: "What name is" }),
      ).toContainText("Boat.name");
      await pane.press("Escape");
      await expect(pane.locator(".nm-chosen")).toHaveCount(0);
      await expect(viewer).toBeVisible();
      // From the keyboard alone: Step through the names starts on the first.
      await pane
        .getByRole("button", { name: "Step through the names" })
        .click();
      await expect(pane.locator(".nm-chosen")).toHaveText("Boat");
      await card.getByRole("button", { name: "How Boat connects" }).click();
      await expect(
        viewer.getByRole("button", { name: "How it connects" }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    test("a name in a Def file is found by name, and one of the things it may stand for is chosen (0.81.0)", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      const viewer = page.getByRole("dialog");
      await viewer.getByRole("button", { name: /Boats\.xml/ }).click();
      const pane = viewer.getByRole("region", {
        name: "The code of mods/Sample Mod/Defs/Boats.xml",
      });
      await pane.locator(".nm", { hasText: "Boat" }).click();
      const card = pane.getByRole("region", { name: "What Boat is" });
      await expect(card).toContainText(
        "Found by name: it may be any of 2 things",
      );
      const choices = card.getByRole("group", {
        name: "The things Boat may stand for",
      });
      await expect(choices.getByRole("button").first()).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await audit(page);
      await choices
        .getByRole("button", { name: /src\/Sample\/Boat\.cs/ })
        .click();
      await expect(card).toContainText(
        "Declared in this repository: src/Sample/Boat.cs, line 1",
      );
      await expect(card).toContainText("class");
    });

    test("a translation key in code opens its English line, a DefOf field its Def, and a name of nothing here says so (0.83.0)", async ({
      page,
    }) => {
      await open(page, lampCode(), {
        "connections:names:src/Sample/Lamp.cs": lampNames,
      });
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample boats float.",
        })
        .click();
      const viewer = page.getByRole("dialog");
      const pane = viewer.getByRole("region", {
        name: "The code of src/Sample/Lamp.cs",
      });
      await expect(pane.locator(".nm")).toHaveCount(3);
      // A translation key the code asks for: what it is, which rule read it, and its English words.
      await pane.locator(".nm", { hasText: "Lamps_Lit" }).click();
      const key = pane.getByRole("region", { name: "What Lamps_Lit is" });
      await expect(key).toContainText("translation key");
      await expect(key).toContainText(
        "Found by a rule, from the text: a translation key the code asks for.",
      );
      await expect(key).toContainText(
        "Declared in this repository: Languages/English/Keyed/Lamps.xml, line 3",
      );
      await key.getByRole("button", { name: "Go to its declaration" }).click();
      await expect(key).toContainText("The lamp is lit.");
      await expect(
        key.getByRole("button", { name: "How Lamps_Lit connects" }),
      ).toBeVisible();
      await audit(page);
      // Its lines put away again, so the card (which stays in view) leaves the code beneath it to press.
      await key.getByRole("button", { name: "Hide its declaration" }).click();
      // A DefOf field keeps its exact reading, and says the Def it stands for, with the Def's own lines.
      await pane.locator(".nm", { hasText: "Lamps_Hum" }).click();
      const field = pane.getByRole("region", { name: "What Lamps_Hum is" });
      await expect(field).toContainText("LampDefOf.Lamps_Hum");
      await expect(field).toContainText(
        "It stands for the def Lamps_Hum, declared at Defs/Sounds.xml, line 4.",
      );
      await expect(field).toContainText("a Def a DefOf class holds");
      await field.getByRole("button", { name: "Show the def" }).click();
      await expect(field).toContainText("<defName>Lamps_Hum</defName>");
      await expect(
        field.getByRole("button", { name: "How the def Lamps_Hum connects" }),
      ).toBeVisible();
      await audit(page);
      await field.getByRole("button", { name: "Hide the def" }).click();
      // A key no English line of this repository declares: said in words, with nowhere to go.
      await pane.locator(".nm", { hasText: "Game_Key" }).click();
      const other = pane.getByRole("region", { name: "What Game_Key is" });
      await expect(other).toContainText(
        "Nothing in this repository has this name",
      );
      await expect(
        other.getByRole("button", { name: "Go to its declaration" }),
      ).toHaveCount(0);
      await expect(other.getByRole("button", { name: /connects/ })).toHaveCount(
        0,
      );
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
      // The code as it was (0.78.0), and its key, Shift with N.
      await viewer.getByRole("button", { name: "The code as it was" }).click();
      await expect(pane.locator(".line.diff-added")).toHaveCount(0);
      await expect(pane).toContainText("void Turn() { }");
      await viewer
        .getByRole("button", { name: "The code as it now stands" })
        .click();
      await page.keyboard.press("Shift+N");
      await expect(
        viewer.getByRole("button", { name: "The code as it was" }),
      ).toHaveAttribute("aria-pressed", "true");
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
    test("lists the commits of a repository with no changelog, and shows one's code (0.53.0)", async ({
      page,
    }) => {
      await open(page, sampleCode(), {
        changes_list: {
          result: [
            ...(sampleChanges.result as unknown[]),
            { repository: "first-buildings", changelogs: [] },
          ],
        },
        repository_commits: {
          result: {
            repository: "first-buildings",
            total: 45,
            skip: 0,
            commits: [
              {
                hash: "e24199d28bb563783bd36b99c56fc8257314196c",
                time: "2026-09-12T15:45:36+00:00",
                author: "Sample Author",
                subject: "Sample heating works with eight outlets",
                files: 26,
                binary: 5,
              },
            ],
          },
        },
      });
      await page
        .getByRole("button", { name: "first-buildings: commits" })
        .click();
      await expect(page.locator("main")).toContainText(
        "first-buildings keeps no changelog",
      );
      await expect(page.locator("main")).toContainText(
        "26 files changed, 5 not text",
      );
      await audit(page);
      await page
        .getByRole("button", {
          name: "Show the code behind: Sample heating works with eight outlets",
        })
        .click();
      await expect(page.getByRole("dialog")).toContainText("Written by commit");
    });
  });
}
