import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

function thing(id: string, name: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    name,
    kind: "method",
    language: "csharp",
    file: "src/Sample/Boat.cs",
    line: 12,
    end: 20,
    owner: null,
    external: false,
    assembly: null,
    exact: true,
    connections: 3,
    ...extra,
  };
}

/** Invented connections, for the audit only. The program itself never shows sample data. */
const tick = thing("cs:Sample.Boat.Tick", "Boat.Tick", { connections: 6 });
const sampleAround = {
  ok: true,
  refusal: null,
  data: {
    centre: tick,
    groups: [
      {
        relation: "calls",
        kind: "calls",
        outward: true,
        count: 3,
        exact: true,
        nodes: [
          thing("cs:Sample.Harbour.Count", "Harbour.Count"),
          thing("cs:Sample.Harbour.Moor", "Harbour.Moor"),
          thing("cs:Verse.Thing.Destroy", "Thing.Destroy", {
            external: true,
            file: null,
            line: null,
            assembly: "SampleGame",
          }),
        ],
      },
      {
        relation: "called-by",
        kind: "calls",
        outward: false,
        count: 1,
        exact: true,
        nodes: [thing("cs:Sample.Fleet.TickAll", "Fleet.TickAll")],
      },
      {
        relation: "overrides",
        kind: "overrides",
        outward: true,
        count: 1,
        exact: false,
        nodes: [
          thing("cs:Sample.Vessel.Tick", "Vessel.Tick", { exact: false }),
        ],
      },
      {
        relation: "belongs-to",
        kind: "holds",
        outward: false,
        count: 1,
        exact: true,
        nodes: [thing("cs:Sample.Boat", "Boat", { kind: "class" })],
      },
    ],
  },
};
const sampleFlow = {
  ok: true,
  refusal: null,
  data: {
    centre: "cs:Sample.Boat.Tick",
    columns: [
      { step: -1, nodes: [thing("cs:Sample.Fleet.TickAll", "Fleet.TickAll")] },
      { step: 0, nodes: [tick] },
      {
        step: 1,
        nodes: [
          thing("cs:Sample.Harbour.Count", "Harbour.Count"),
          thing("cs:Sample.Harbour.Moor", "Harbour.Moor"),
        ],
      },
    ],
    edges: [
      {
        source: "cs:Sample.Fleet.TickAll",
        target: "cs:Sample.Boat.Tick",
        exact: true,
      },
      {
        source: "cs:Sample.Boat.Tick",
        target: "cs:Sample.Harbour.Count",
        exact: true,
      },
      {
        source: "cs:Sample.Boat.Tick",
        target: "cs:Sample.Harbour.Moor",
        exact: true,
      },
    ],
  },
};
const sampleSummary = {
  ok: true,
  refusal: null,
  data: {
    readers: [
      {
        language: "C#",
        how: "exact, from 1 built assembly",
        nodes: 120,
        edges: 400,
      },
      {
        language: "XML Defs",
        how: "exact parents; uses by defName and class name",
        nodes: 30,
        edges: 45,
      },
    ],
    seconds: 1.2,
  },
};
const sampleFound = {
  ok: true,
  refusal: null,
  data: { things: [tick, thing("cs:Sample.Raft.Tick", "Raft.Tick")] },
};

const sampleHistory = {
  ok: true,
  refusal: null,
  data: {
    node: "cs:Sample.Boat.Tick",
    file: "src/Sample/Boat.cs",
    lines: [20, 34],
    more: false,
    commits: [
      {
        hash: "401c6a93aa11bb22cc33dd44ee55ff6677889900",
        time: "2026-11-18T09:07:00+00:00",
        subject: "Boats 0.2.0: boats tick faster",
        entries: [
          {
            changelog: "CHANGELOG.md",
            product: "Boats",
            text: "**Faster ticks.** Boats tick twice as often.",
          },
        ],
      },
      {
        hash: "1234abcd99887766554433221100ffeeddccbbaa",
        time: "2026-11-01T02:00:00+00:00",
        subject: "First boats",
        entries: [],
      },
    ],
  },
};

const samplePatches = {
  available: true,
  data: {
    updates: true,
    updatesNote: null,
    targets: [
      {
        node: "cs:Verse.Thing.Destroy",
        target: "Verse.Thing.Destroy",
        name: "Thing.Destroy",
        assembly: "SampleGame",
        ours: ["cs:Sample.Boat.Tick"],
        mods: ["Sample Sails", "Sample Oars", "Sample Anchors"],
        skippers: 1,
        changed: [
          {
            mod: "Sample Game",
            file: "SampleGame.dll",
            versions: "1.0.1 to 1.0.2",
            change: "new body (+3 -1)",
          },
        ],
      },
    ],
  },
};

const sampleKept = {
  available: true,
  ok: true,
  refusal: null,
  report: null,
  data: {
    files: [
      {
        owner: "sample.game",
        owner_name: "Sample Game",
        file: "SampleGame.dll",
        versions: 2,
        newest_version: "1.0.2",
        newest_seen: "2026-11-19 09:00 UTC",
        previous_seen: "2026-11-18 09:00 UTC",
      },
    ],
  },
};

const sampleCompare = {
  available: true,
  ok: true,
  refusal: null,
  data: {},
  report: {
    format: 1,
    title: "code compare",
    facts: [],
    lines: ["1 with a new body."],
    blocks: [],
    sections: [
      {
        heading: "New bodies, largest first (1)",
        level: 2,
        blocks: [
          {
            type: "table",
            headers: ["Kind", "Name", "Where"],
            rows: [["method", "Verse.Thing.Destroy", "Verse/Thing.cs:10"]],
            values: [],
            total: 1,
          },
        ],
      },
    ],
  },
};

const sampleTheirCode = {
  available: true,
  ok: true,
  refusal: null,
  report: null,
  data: {
    name: "Verse.Thing.Destroy",
    looked_in: 3,
    found: [
      {
        corpus: "SampleGame-src",
        source: "source",
        kind: "method",
        full: "Verse.Thing.Destroy",
        signature: "public virtual void Destroy()",
        file: "Source/Thing.cs",
        start: 10,
        end: 13,
        language: "cs",
        lines: ["public virtual void Destroy()", "{", "    // A sample.", "}"],
        numbers: [10, 11, 12, 13],
        more: false,
      },
    ],
  },
};

async function openCodeMap(page: Page, more: Record<string, unknown> = {}) {
  await mockHost(page, {
    updates: { result: { ...sampleKept, data: { files: [] } } },
    ...more,
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    "connections:summary": { result: sampleSummary },
    "connections:find": { result: sampleFound },
    "connections:around": { result: sampleAround },
    "connections:flow": { result: sampleFlow },
    "connections:history": { result: sampleHistory },
    patch_targets: { result: samplePatches },
  } as Parameters<typeof mockHost>[1]);
  await page.goto("/");
  await page.getByRole("button", { name: "Code map", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "How First Sample's code fits together",
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
        [...root.querySelectorAll("button, summary, input")]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height < min).length,
      CONTROL_MIN_PX,
    );
}

async function search(page: Page) {
  await page
    .getByLabel("Search for a name (use * for any letters)")
    .fill("*Tick*");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("button", { name: /Boat\.Tick/ })
    .first()
    .click();
  await expect(
    page.getByRole("group", {
      name: "How Boat.Tick connects, drawn around it",
    }),
  ).toBeVisible();
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`Code map, ${name}`, () => {
    test.use({ viewport });

    test("searches, then draws how a method connects, and passes the audit", async ({
      page,
    }) => {
      await openCodeMap(page);
      await expect(page.locator("main")).toContainText(
        "exact, from 1 built assembly",
      );
      await expect(
        page.getByRole("button", { name: "first-tools" }),
      ).toBeVisible();
      await search(page);
      const picture = page.getByRole("group", {
        name: "How Boat.Tick connects, drawn around it",
      });
      await expect(
        picture.getByRole("button", {
          name: /^Harbour\.Count, method, src\/Sample\/Boat\.cs:12: Calls\. Press/,
        }),
      ).toBeVisible();
      await expect(
        picture.getByRole("button", {
          name: /^Vessel\.Tick, method, .*: Overrides \(read by name\)\. Press/,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Calls\s*3/ }),
      ).toHaveAttribute("aria-pressed", "true");
      await audit(page);
      expect(await smallControls(page, "main")).toBe(0);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("filters a kind of connection, hides outside code, and switches to the flow and the list", async ({
      page,
    }) => {
      await openCodeMap(page);
      await search(page);
      const picture = page.getByRole("group", {
        name: "How Boat.Tick connects, drawn around it",
      });
      await page.getByRole("button", { name: /Outside code/ }).click();
      await expect(
        picture.getByRole("button", { name: /^Thing\.Destroy/ }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: /Overrides\s*1/ }).click();
      await expect(
        picture.getByRole("button", { name: /^Vessel\.Tick/ }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Flow of calls" }).click();
      const flow = page.getByRole("group", {
        name: /^Calls to and from Boat\.Tick/,
      });
      await expect(
        flow.getByRole("button", { name: /^Fleet\.TickAll/ }),
      ).toBeVisible();
      await audit(page);
      await page.getByRole("button", { name: "As a list" }).click();
      await expect(
        page.getByRole("region", { name: "Called by" }),
      ).toContainText("Fleet.TickAll");
      await audit(page);
    });

    test("puts a pressed thing in the middle as a step, and Back returns", async ({
      page,
    }) => {
      await page
        .context()
        .grantPermissions(["clipboard-read", "clipboard-write"]);
      await openCodeMap(page);
      await search(page);
      const address = async () => {
        await page.getByRole("button", { name: "Copy address" }).click();
        return page.evaluate(() => navigator.clipboard.readText());
      };
      expect(await address()).toContain("node=cs%3ASample.Boat.Tick");
      const picture = page.getByRole("group", {
        name: "How Boat.Tick connects, drawn around it",
      });
      await picture.getByRole("button", { name: /^Harbour\.Moor/ }).focus();
      await page.keyboard.press("Enter");
      expect(await address()).toContain("node=cs%3ASample.Harbour.Moor");
      await page.keyboard.press(",");
      expect(await address()).toContain("node=cs%3ASample.Boat.Tick");
    });

    test("reads a thing's history only when asked, and an entry opens its commit's code as a step", async ({
      page,
    }) => {
      await page
        .context()
        .grantPermissions(["clipboard-read", "clipboard-write"]);
      await openCodeMap(page);
      await search(page);
      const history = page.getByRole("region", {
        name: "The history of Boat.Tick",
      });
      await history.getByRole("button", { name: "Show its history" }).click();
      await expect(history).toContainText("Boats 0.2.0: boats tick faster");
      await expect(history).toContainText(
        "lines 20 to 34 of src/Sample/Boat.cs",
      );
      await expect(
        history.getByRole("button", { name: "See this commit's code" }),
      ).toBeVisible();
      await expect(
        history.getByRole("button", {
          name: "Boats: backups from before this",
        }),
      ).toBeVisible();
      await audit(page);
      expect(await smallControls(page, "main")).toBe(0);
      await history
        .getByRole("button", { name: /Faster ticks\. Boats tick twice/ })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("dialog").press("Escape");
      await page.getByRole("button", { name: "Copy address" }).click();
      expect(
        await page.evaluate(() => navigator.clipboard.readText()),
      ).not.toContain("dialog=code");
    });

    test("a method's patches say who else patches the same method and what the last update changed", async ({
      page,
    }) => {
      await openCodeMap(page);
      await search(page);
      const badges = page.getByRole("region", {
        name: "Patches on Boat.Tick, and who else is there",
      });
      await expect(badges).toContainText("Verse.Thing.Destroy");
      await expect(badges).toContainText(
        "3 other mods patch it too: Sample Sails, Sample Oars, Sample Anchors.",
      );
      await expect(badges).toContainText(
        "One of their patches may skip the original.",
      );
      await expect(badges).toContainText(
        "Changed by the last update of Sample Game (1.0.1 to 1.0.2): new body (+3 -1).",
      );
      const picture = page.getByRole("group", {
        name: "How Boat.Tick connects, drawn around it",
      });
      await expect(
        picture.getByRole("button", {
          name: /^Thing\.Destroy, .*Other mods patch the same method/,
        }),
      ).toBeVisible();
      await audit(page);
    });
  });
}

test.describe("Other authors' code on the Code map", () => {
  test("a patch's target opens their code, from their public source, and Back closes it", async ({
    page,
  }) => {
    await openCodeMap(page, {
      "their_code:show": { result: sampleTheirCode },
    });
    await search(page);
    await page
      .getByRole("region", {
        name: "Patches on Boat.Tick, and who else is there",
      })
      .getByRole("button", { name: "Read their code" })
      .click();
    const their = page.getByRole("region", {
      name: "Verse.Thing.Destroy",
      exact: true,
    });
    await expect(their).toContainText("From their public source");
    await expect(
      their.getByRole("region", { name: "The code of Verse.Thing.Destroy" }),
    ).toContainText("// A sample.");
    await audit(page);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(their).toHaveCount(0);
  });

  test("what an update changed: a kept file, then one declaration's change", async ({
    page,
  }) => {
    // One answer serves both questions: the kept files as data, the comparison as a report.
    await openCodeMap(page, {
      updates: { result: { ...sampleCompare, data: sampleKept.data } },
    });
    await page.getByRole("button", { name: /^SampleGame\.dll/ }).click();
    await expect(
      page.getByRole("heading", {
        name: "What the last update changed in SampleGame.dll",
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Verse.Thing.Destroy", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "How Verse.Thing.Destroy changed in SampleGame.dll",
      }),
    ).toBeVisible();
    await audit(page);
  });
});
