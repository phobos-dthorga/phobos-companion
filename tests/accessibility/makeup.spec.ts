import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

function made(
  path: string,
  kind: string,
  lines: number,
  bytes: number,
  product: string | null = "Sample Boats",
) {
  return {
    path,
    product,
    group: product ? null : path.split("/")[0],
    kind,
    language: "",
    bytes,
    lines,
  };
}

/** An invented repository, for the audit only. The program itself never shows sample data. */
const sampleNow = {
  repository: "first-mods",
  commit: "4d332ddf0123",
  kinds: [
    "code",
    "tests",
    "data",
    "words",
    "pictures",
    "sounds",
    "build",
    "other",
  ],
  products: ["Sample Boats", "Sample Sails"],
  files: [
    made("src/Boats/Boat.cs", "code", 320, 9000),
    made("src/Boats/Hull.cs", "code", 120, 3000),
    made("mods/Boats/Defs/Things.xml", "data", 200, 7000),
    made("mods/Boats/Textures/boat.png", "pictures", 0, 90000),
    made("mods/Boats/Sounds/splash.ogg", "sounds", 0, 40000),
    made("mods/Sails/Defs/Sails.xml", "data", 80, 2500, "Sample Sails"),
    made("docs/guide.md", "words", 150, 5000, null),
    made("tests/test_boats.py", "tests", 60, 1800, null),
  ],
};

const sampleGrowth = {
  repository: "first-mods",
  kinds: sampleNow.kinds,
  points: [
    {
      day: "2026-11-01",
      commit: "a",
      kinds: { code: [100, 3000], data: [50, 1500] },
      products: {},
    },
    {
      day: "2026-11-05",
      commit: "b",
      kinds: { code: [300, 9000], data: [200, 7000], words: [100, 4000] },
      products: {},
    },
    {
      day: "2026-11-09",
      commit: "c",
      kinds: { code: [440, 12000], data: [280, 9500], words: [150, 5000] },
      products: {},
    },
  ],
};

const sampleChurn = {
  repository: "first-mods",
  days: 30,
  files: [
    {
      path: "src/Boats/Boat.cs",
      kind: "code",
      commits: 9,
      added: 120,
      removed: 30,
      last: "2026-11-09",
    },
    {
      path: "src/Boats/Hull.cs",
      kind: "code",
      commits: 2,
      added: 20,
      removed: 4,
      last: "2026-11-02",
    },
    {
      path: "docs/guide.md",
      kind: "words",
      commits: 12,
      added: 50,
      removed: 10,
      last: "2026-11-09",
    },
  ],
};

const sampleCensus = {
  repository: "first-mods",
  products: {
    "Sample Boats": {
      defs: { ThingDef: 12, RecipeDef: 4 },
      pictures: 1,
      sounds: 1,
      keys: 30,
    },
    "Sample Sails": { defs: { ThingDef: 3 }, pictures: 0, sounds: 0, keys: 6 },
  },
};

const boat = {
  id: "cs:Boats.Boat",
  name: "Boat",
  kind: "class",
  language: "csharp",
  file: "src/Boats/Boat.cs",
  line: 3,
  end: 40,
  owner: null,
  external: false,
  assembly: null,
  exact: true,
  connections: 2,
};

function row(id: string, versions: Record<string, string>, status = "open") {
  return {
    id,
    section: "",
    title: `Row ${id}`,
    status,
    cells: {},
    seen: [],
    evidence_keys: [],
    versions,
    verdict: null,
    pending: null,
  };
}

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    "makeup:now": { result: sampleNow },
    "makeup:growth": { result: sampleGrowth },
    "makeup:churn": { result: sampleChurn },
    "makeup:census": { result: sampleCensus },
    test_lists: {
      result: [
        {
          repository: "first-mods",
          title: "",
          rows: [
            row("1", { "Sample Boats": "1.0.0" }, "passed"),
            row("2", { "Sample Boats": "1.1.0" }),
            row("3", {}),
          ],
          unrowed: [],
          order_problems: [],
          command_line: "",
        },
      ],
    },
    "connections:summary": {
      result: {
        ok: true,
        refusal: null,
        data: {
          readers: [{ language: "csharp", how: "exact", nodes: 10, edges: 20 }],
          seconds: 0.1,
        },
      },
    },
    "connections:find": {
      result: { ok: true, refusal: null, data: { things: [boat] } },
    },
    "connections:around": {
      result: { ok: true, refusal: null, data: { centre: boat, groups: [] } },
    },
  });
  await page.goto("/");
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

async function smallControls(page: Page) {
  return page
    .locator("main")
    .evaluate(
      (root, min) =>
        [...root.querySelectorAll("button, summary, input")]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height < min).length,
      CONTROL_MIN_PX,
    );
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`Make-up page, ${name}`, () => {
    test.use({ viewport });

    test("draws what it's made of, each part's mix, its growth, tests and census, and passes the audit", async ({
      page,
    }) => {
      await open(page);
      await page.getByRole("button", { name: "Make-up", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "What First Sample is made of",
      );
      const main = page.locator("main");
      await expect(main).toContainText("8 committed files, 930 lines of text");
      await expect(
        page.getByRole("img", { name: /measured in Lines: each mod or part/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: /mix of kinds, measured in Lines/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", {
          name: "How it grew from 2026-11-01 to 2026-11-09, one stacked band a kind.",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: /tested in game, by state/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "What players get", exact: true }),
      ).toContainText("ThingDef 12, RecipeDef 4");
      await audit(page);
      expect(await smallControls(page)).toBe(0);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("switches the measure and the colouring, and shows the numbers", async ({
      page,
    }) => {
      await open(page);
      await page.getByRole("button", { name: "Make-up", exact: true }).click();
      await page.getByRole("button", { name: "Size on disk" }).click();
      await expect(
        page.getByRole("img", { name: /measured in Size on disk: each mod/ }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Changes in the last 30 days" })
        .click();
      await expect(page.locator("main")).toContainText("Fewer changes");
      await page
        .getByRole("button", { name: "Show the biggest files" })
        .click();
      await expect(page.locator("main table").first()).toContainText(
        "mods/Boats/Textures/boat.png",
      );
      const mix = page.getByRole("region", { name: "Each part's mix" });
      await mix.getByRole("button", { name: "Show the numbers" }).click();
      await expect(mix.locator("table")).toContainText("Outside any mod: docs");
      await audit(page);
    });

    test("the Code map lists the busiest code, and a file opens what it holds", async ({
      page,
    }) => {
      await open(page);
      await page.getByRole("button", { name: "Code map", exact: true }).click();
      const busiest = page.getByRole("region", {
        name: "Busiest code, last 30 days",
      });
      await expect(busiest).toContainText("src/Boats/Boat.cs: 9 commits");
      await expect(busiest).not.toContainText("docs/guide.md");
      await audit(page);
      await busiest
        .getByRole("button", { name: /^src\/Boats\/Boat\.cs/ })
        .click();
      await expect(
        page.getByRole("group", { name: "How Boat connects, drawn around it" }),
      ).toBeVisible();
    });
  });
}
