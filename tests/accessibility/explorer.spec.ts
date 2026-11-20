import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

/** An invented snapshot, for the audit only. The program itself never shows sample data. */
const ready = {
  ready: true,
  pid: 4242,
  snapshotMs: 431,
  ageSeconds: 0.2,
  runtime: "10.0.15",
  runtimeFolder: "C:\\Sample\\Game",
  dac: "C:\\Sample\\Game\\mscordaccore.dll",
  modules: 510,
  threads: 60,
  segments: 12,
  objects: 2_835_023,
  limitSeconds: 600,
};

const answer = (data: unknown) => ({
  result: { ok: true, data, error: null, released: null },
});

const overview = {
  totalObjects: 2_835_023,
  totalBytes: 812_000_000,
  freeBytes: 71_000_000,
  untyped: 0,
  seconds: 12.1,
  owners: [
    { name: "Sample Boats", kind: "mod", bytes: 300_000_000, count: 900_000 },
    { name: "First Sample", kind: "game", bytes: 200_000_000, count: 700_000 },
    { name: ".NET", kind: "runtime", bytes: 100_000_000, count: 400_000 },
  ],
  types: [
    {
      type: "Boats.Hull",
      module: "Boats",
      bytes: 120_000_000,
      count: 3,
      owner: "Sample Boats",
      ownerKind: "mod",
      through: "",
    },
    {
      type: "System.Collections.Generic.List<Boats.Sail>",
      module: "System.Private.CoreLib",
      bytes: 60_000_000,
      count: 40,
      owner: "Sample Boats",
      ownerKind: "mod",
      through: "Boats.Sail",
    },
  ],
  typeCount: 34_812,
  kept: "20261121-101500-look",
  notes: [],
};

const kind = {
  type: "Boats.Hull",
  count: 3,
  totalBytes: 120_000_000,
  skip: 0,
  take: 50,
  more: false,
  match: "",
  items: [
    { address: "0x1629EFD6E98", size: 80_000_000, summary: "Harbour Queen" },
    { address: "0x1629EFD7000", size: 30_000_000, summary: "Sea Wren" },
    { address: "0x1629EFD7100", size: 10_000_000, summary: "" },
  ],
};

const object = {
  address: "0x1629EFD6E98",
  type: "Boats.Hull",
  module: "Boats",
  size: 96,
  summary: "Harbour Queen",
  static: null,
  kind: "object",
  fields: [
    { name: "length", type: "System.Int32", kind: "value", value: "42" },
    {
      name: "name",
      type: "System.String",
      kind: "text",
      value: "Harbour Queen",
    },
    { name: "owner", type: "Boats.Crew", kind: "null" },
    {
      name: "rig",
      type: "Boats.Rig",
      kind: "link",
      address: "0x1629EFD8000",
      valueType: "Boats.Rig",
      summary: "Sloop",
    },
    {
      name: "position",
      type: "Boats.Cell",
      kind: "struct",
      fields: [
        { name: "x", type: "System.Int32", kind: "value", value: "3" },
        { name: "z", type: "System.Int32", kind: "value", value: "7" },
      ],
    },
  ],
};

const path = {
  address: "0x1629EFD6E98",
  type: "Boats.Hull",
  path: {
    root: "StaticVar",
    static: "Boats.Harbour.moored",
    pinned: false,
    skipped: 0,
    links: [
      {
        address: "0x1629EFD5000",
        type: "System.Collections.Generic.List<Boats.Hull>",
        module: "System.Private.CoreLib",
        size: 32,
        summary: "",
      },
      {
        address: "0x1629EFD6E98",
        type: "Boats.Hull",
        module: "Boats",
        size: 96,
        summary: "Harbour Queen",
        field: "_items.[0]",
      },
    ],
  },
  unreachable: false,
  timedOut: false,
};

async function open(page: Page, available = true) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    explorer_offer: { result: { available, refusal: null } },
    explorer_start: {
      result: {
        available: true,
        snapshot: 1,
        ready,
        refusal: null,
        command_line: "python -m phobos_modkit sample-perf look-serve",
      },
      progress: [{ label: "Taking a snapshot of the game" }],
    },
    "explorer_ask:overview": answer(overview),
    "explorer_ask:kind": answer(kind),
    "explorer_ask:object": answer(object),
    "explorer_ask:path": answer(path),
    "explorer_ask:holders": answer({
      address: "0x1629EFD6E98",
      holders: [],
      more: false,
      roots: [],
      static: null,
    }),
    explorer_release: { result: true },
  });
  await page.goto("/");
  await page.keyboard.press("v");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Look inside First Sample",
  );
}

async function takeSnapshot(page: Page) {
  await page
    .getByRole("button", { name: /^Look inside the running game/ })
    .click();
  const card = page.getByRole("group", { name: "Take a snapshot?" });
  await expect(card).toContainText("about half a second");
  await expect(card).toContainText("Nothing in the game is changed");
  await card.getByRole("button", { name: "Take the snapshot" }).click();
  await expect(
    page.getByRole("heading", { name: "What is in memory" }),
  ).toBeVisible();
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

async function overflow(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`Explorer page, ${name}`, () => {
    test.use({ viewport });

    test("asks first, then shows what is in memory and who it belongs to", async ({
      page,
    }) => {
      await open(page);
      const main = page.locator("main");
      await expect(main).toContainText("The running game");
      await expect(main).toContainText("comes with the save explorer");
      await audit(page);
      await takeSnapshot(page);
      await expect(main).toContainText("Snapshot held");
      await expect(main).toContainText("The game paused for 431 ms");
      await expect(main).toContainText("left of 10 minutes");
      await expect(main).toContainText("2,835,023");
      await expect(main).toContainText("garbage not yet collected");
      await expect(
        page.getByRole("table", { name: "Who it belongs to" }),
      ).toContainText("Sample Boats");
      await expect(
        page.getByRole("table", { name: "The largest kinds" }),
      ).toContainText("(a collection of Boats.Sail)");
      await audit(page);
      expect(await smallControls(page)).toBe(0);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });

    test("opens a kind, one thing in full and why it is still in memory; a step back after Let it go says it is gone", async ({
      page,
    }) => {
      await open(page);
      await takeSnapshot(page);
      await page
        .getByRole("button", { name: "Boats.Hull", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { level: 2, name: "Boats.Hull" }),
      ).toBeVisible();
      await expect(page.locator("main")).toContainText("3 objects");
      await page.getByRole("button", { name: /Harbour Queen/ }).click();
      const values = page.getByRole("list", { name: "Every value it holds" });
      await expect(values).toContainText("42");
      await expect(values).toContainText("nothing");
      await expect(
        values.getByRole("button", { name: /Boats\.Rig/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("list", { name: "The values inside position" }),
      ).toContainText("7");
      await page
        .getByRole("button", { name: "Why is it still in memory?" })
        .click();
      const chain = page.getByRole("list", { name: /^Path 1/ });
      await expect(chain).toContainText(
        "Kept in the static field Boats.Harbour.moored",
      );
      await expect(chain).toContainText("held through _items.[0]");
      await audit(page);
      expect(await smallControls(page)).toBe(0);
      expect(await overflow(page)).toBeLessThanOrEqual(0);

      await page.getByRole("button", { name: "Let it go" }).click();
      await expect(page.locator("main")).toContainText(
        "You let the snapshot go.",
      );
      await expect(page.locator("main")).toContainText(
        "belonged to a snapshot that has been let go",
      );
      await expect(
        page.getByRole("button", { name: /^Look inside the running game/ }),
      ).toBeVisible();
    });

    test("a game whose tools cannot look inside is told so in words", async ({
      page,
    }) => {
      await open(page, false);
      await expect(page.locator("main")).toContainText(
        "The tools cannot look inside First Sample yet",
      );
      await audit(page);
    });
  });
}
