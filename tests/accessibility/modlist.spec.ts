import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, SAMPLE_PNG, sampleHome } from "./host";

/** Invented mods, for the audit only. The program itself never shows sample data. */
function sampleMod(key: string, name: string, source = "workshop") {
  return {
    key,
    id: key,
    name,
    source,
    // Invented Workshop numbers, one per sample mod from the Workshop.
    workshop_id:
      source === "workshop" ? String(1000000000 + key.charCodeAt(0)) : "",
    authors: "Sample Author",
    versions: ["1.7"],
    needs: [],
  };
}

const ON = ["core", "alpha", "bravo", "charlie", "delta"];
const NAMES: Record<string, string> = {
  core: "Core",
  alpha: "Alpha Tools",
  bravo: "Bravo Beds",
  charlie: "Charlie Crops",
  delta: "Delta Doors",
  echo: "Echo Engines",
};

const listing = {
  game: "first",
  name: "First Sample",
  supported: true,
  version: "1.7",
  mods: Object.entries(NAMES).map(([key, name]) => ({
    ...sampleMod(
      key,
      name,
      key === "core" ? "game" : key === "delta" ? "local" : "workshop",
    ),
    // 0.53.0: one mod with its own picture, the rest without.
    preview: key === "delta" ? "C:/Mods/Delta/About/Preview.png" : null,
  })),
  lists: [
    {
      key: "active",
      label: "Your active mods",
      writable: true,
      count: ON.length,
      entries: ON.map((key) => ({ id: key, key, remembered: "" })),
    },
  ],
  running: [],
  notes: [],
  changes: { active: 0 },
};

const check = {
  game: "first",
  name: "First Sample",
  supported: true,
  version: "1.7",
  online: false,
  notes: [],
  installed: 6,
  running: [],
  lists: [
    {
      key: "active",
      label: "Your active mods",
      path: "/sample/ModsConfig.xml",
      count: 5,
      writable: true,
    },
  ],
  problems: [
    {
      kind: "replacement",
      severity: "note",
      list_key: "active",
      id: "bravo",
      name: "Bravo Beds",
      title:
        "Bravo Beds has a continued version for 1.7: Bravo Beds (Continued) by Someone.",
      why: "From the community's Use This Instead list.",
      clue: "",
      needed_by: [],
      fixes: [],
      workshop_id: "2000000002",
    },
  ],
  counts: { problem: 0, warning: 0, note: 1 },
  backups: [],
  since: {
    active: {
      verdict: "new-errors",
      change: {
        why: "re-sort the whole list: 178 moved",
        at: "20261122T161132Z",
        file: "b.list",
      },
      new: [
        {
          id: "e44346e9",
          level: "ERROR",
          count: 2,
          message:
            "Could not find type named IAmMother.Compat.VNPE.CompProperties_PipedPaste",
          mods: ["I Am Mother"],
        },
      ],
      new_errors: 1,
      run: "2026-11-22T16:37:52+00:00",
    },
  },
};

const changed = (ids: string[]) => ({
  result: {
    ok: true,
    title: "Mod list: a change",
    refusal: null,
    data: { change: "a change", ids, keys: ids },
  },
});

const sorted = {
  result: {
    ok: true,
    title: "Mod list: sort the list: 1 moved (preview)",
    refusal: null,
    data: {
      how: "fewest",
      ids: ["core", "delta", "alpha", "bravo", "charlie"],
      keys: ["core", "delta", "alpha", "bravo", "charlie"],
      moves: [
        {
          key: "delta",
          name: "Delta Doors",
          from: 5,
          to: 2,
          why: [
            "Alpha Tools loads after Delta Doors (Alpha Tools: its own files)",
          ],
          sources: ["own"],
        },
      ],
      set_aside: [],
      rules: { yours: 1, own: 4, needs: 2, community: 3 },
      placings: { top: 0, bottom: 0 },
      count: 5,
      applied: false,
      sets: [],
    },
  },
};

// A full re-sort's moves of each kind (phobos-modkit 1.86.0): a rule's, a group's and one only for the order of names.
const fullSorted = {
  result: {
    ok: true,
    title: "Mod list: re-sort the whole list: 3 moved (preview)",
    refusal: null,
    data: {
      how: "full",
      ids: ["core", "alpha", "delta", "bravo", "charlie"],
      keys: ["core", "alpha", "delta", "bravo", "charlie"],
      moves: [
        {
          key: "delta",
          name: "Delta Doors",
          from: 5,
          to: 3,
          why: [
            "Bravo Beds loads after Delta Doors (Bravo Beds: its own files)",
          ],
          sources: ["own"],
          kind: "rule",
        },
        {
          key: "alpha",
          name: "Alpha Tools",
          from: 3,
          to: 2,
          why: ["Alpha Tools: it is a framework or loads at the top."],
          sources: [],
          kind: "group",
        },
        {
          key: "bravo",
          name: "Bravo Beds",
          from: 2,
          to: 4,
          why: [
            "No rule places it: a full re-sort puts such mods in order of their names.",
          ],
          sources: [],
          kind: "order",
        },
      ],
      set_aside: [],
      rules: { yours: 1, own: 4, needs: 2, community: 3 },
      placings: { top: 0, bottom: 0 },
      count: 5,
      applied: false,
      sets: [],
    },
  },
};

/** The community lists (0.112.0), one the Companion's copy and one RimSort's, gone stale. */
const communityLists = {
  databases: [
    {
      name: "community-rules",
      label: "The community's load-order rules",
      repo: "Sample/Rules",
      licence: "CC0-1.0",
      ours: "2026-11-28T00:00:00+00:00",
      theirs: "",
      read: "ours",
      age_days: 0,
      stale: false,
      fetched: "2026-11-28T00:00:00+00:00",
    },
    {
      name: "use-this-instead",
      label: "Use This Instead",
      repo: "Sample/Instead",
      licence: "MIT",
      ours: "",
      theirs: "2026-11-01T00:00:00+00:00",
      read: "theirs",
      age_days: 27,
      stale: true,
      fetched: "",
    },
  ],
  fetched: [],
  manager: "RimSort",
  freshDays: 7,
};

const rules = {
  result: {
    rules: [
      {
        mod: "echo",
        kind: "bottom",
        other: "",
        number: 1,
        words: "echo loads at the bottom",
      },
    ],
    theirs: [
      {
        mod: "bravo",
        kind: "after",
        other: "alpha",
        note: "Beds need tools",
        words: "",
      },
    ],
    sets: [
      {
        source: "yours",
        label: "Your rules here",
        where: "/sample/rules.json",
        editable: true,
        count: 1,
      },
      {
        source: "community",
        label: "The community rules",
        where: "/sample/communityRules.json",
        editable: false,
        count: 631,
      },
    ],
  },
};

const savedLists = {
  result: {
    sources: {
      saved: [
        {
          source: "saved",
          ref: "Quiet",
          label: "Quiet",
          when: "2026-11-21T20:00:00+00:00",
          count: 4,
          version: "1.7",
          note: "",
        },
      ],
      kept: [
        {
          source: "kept",
          ref: "20261121T220105Z",
          label: "Game start, 22 Nov 2026 09:01",
          when: "2026-11-21T22:01:05+00:00",
          count: 5,
          version: "1.7",
          note: "",
          ran: {
            started: "2026-11-21T22:01:05+00:00",
            clean: true,
            new_errors: 0,
          },
        },
      ],
      save: [
        {
          source: "save",
          ref: "Colony.rws",
          label: "Colony",
          when: "2026-11-21T21:00:00+00:00",
          count: 6,
          version: "1.7",
          note: "",
        },
      ],
      manager: [],
    },
    files: true,
    suffix: ".rml",
  },
};

const compared = {
  result: {
    ok: true,
    title: "Mod list: loading Colony (preview)",
    refusal: null,
    data: {
      label: "Colony",
      same: false,
      on: [{ key: "echo", name: "Echo Engines" }],
      off: [{ key: "delta", name: "Delta Doors" }],
      moved: 1,
      missing: [
        {
          id: "gone.mod",
          key: "gone.mod",
          name: "Smart Medicine",
          workshop_id: "",
          why: "It is not on this PC, and this list did not record where it came from: look for it on the Workshop by its name.",
        },
      ],
      count: 5,
      now: 5,
      applied: false,
    },
  },
};

async function open(page: Page, replies: Record<string, unknown> = {}) {
  await mockHost(page, {
    mod_list_undo: {
      result: {
        ok: true,
        title: "went back",
        refusal: null,
        data: { undoes: "re-sort the whole list: 178 moved" },
      },
    },
    mod_list_lists: savedLists,
    mod_list_compare: compared,
    mod_list_save: {
      result: { ok: true, title: "kept", refusal: null, data: {} },
    },
    mod_list_find_on_workshop: { result: null },
    mod_list_subscribe: {
      result: {
        ok: true,
        title: "Mod list: subscribed to 1 of 1",
        refusal: null,
        data: {
          applied: true,
          results: [
            {
              workshop_id: "3820401180",
              subscribed: true,
              installed: true,
              state: "installed",
              id: "echo",
              name: "Echo Engines",
            },
          ],
        },
      },
    },
    mod_list_unsubscribe: {
      result: {
        ok: true,
        title: "Mod list: unsubscribed from 1 of 1",
        refusal: null,
        data: {
          switched_off: ["alpha"],
          backup: "b.list",
          results: [
            {
              workshop_id: "1000000097",
              unsubscribed: true,
              name: "Alpha Tools",
            },
          ],
        },
      },
    },
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    mod_list_check: { result: check },
    mod_list_mods: { result: listing },
    viewable_file: { result: SAMPLE_PNG },
    mod_list_write: changed(ON),
    mod_list_sort: sorted,
    mod_list_rules: rules,
    mod_list_databases: { result: communityLists },
    mod_list_import_rules: {
      result: {
        ok: true,
        title: "kept",
        refusal: null,
        data: { imported: [{}] },
      },
    },
    mod_list_add_rule: {
      result: { ok: true, title: "kept", refusal: null, data: {} },
    },
    ...replies,
  });
  await page.goto("/");
  // What the page asks the host, as plain data, for the checks below.
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
  await page.getByRole("button", { name: "Mod list", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "First Sample",
  );
}

/** One request the page sent the host, without its progress channel. */
type Asked = { command: string; [field: string]: unknown };

async function asked(page: Page, command: string): Promise<Asked[]> {
  return page.evaluate(
    (wanted) =>
      ((window as unknown as { __asked: Asked[] }).__asked ?? []).filter(
        (a) => a.command === wanted,
      ),
    command,
  );
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

async function shot(page: Page, name: string) {
  // Pictures for a person to look at, only when asked for (MODLIST_SHOTS names a folder outside the repository).
  if (process.env.MODLIST_SHOTS)
    await page.screenshot({
      path: `${process.env.MODLIST_SHOTS}/${name}.png`,
      fullPage: true,
    });
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`Mod list, ${name}`, () => {
    test.use({ viewport });

    test("chosen mods move with Alt + arrow keys, held until Save writes the whole list once (0.108.0)", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", { name: "Edit the list", exact: true })
        .click();
      const on = page.getByRole("listbox", {
        name: "Mods switched on, in load order",
      });
      await on.getByRole("option", { name: /Bravo Beds/ }).click();
      await on
        .getByRole("option", { name: /Charlie Crops/ })
        .click({ modifiers: ["Control"] });
      await page.keyboard.press("Alt+ArrowUp");
      await expect(
        page.getByText(
          "Not saved yet: 0 switched on, 0 switched off, 3 moved.",
          { exact: false },
        ),
      ).toBeVisible();
      expect(await asked(page, "mod_list_write")).toEqual([]);
      await shot(page, `${name}-board`);
      await audit(page);
      await page.keyboard.press("Control+s");
      await expect
        .poll(() => asked(page, "mod_list_write"))
        .toEqual([
          {
            command: "mod_list_write",
            game: "first",
            list: "active",
            ids: ["core", "bravo", "charlie", "alpha", "delta"],
            was: ON,
          },
        ]);
    });

    test("Enter switches a mod on, Undo takes it back, a double-click switches one off, Throw away returns to the list as read", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", { name: "Edit the list", exact: true })
        .click();
      const on = page.getByRole("listbox", {
        name: "Mods switched on, in load order",
      });
      const off = page.getByRole("listbox", { name: "Mods switched off" });
      const bar = page.getByRole("group", { name: "Changes not saved yet" });
      await off.getByRole("option", { name: /Echo Engines/ }).click();
      await page.keyboard.press("Enter");
      await expect(
        on.getByRole("option", { name: /Echo Engines/ }),
      ).toBeVisible();
      await expect(bar).toContainText("1 switched on");
      await bar.getByRole("button", { name: "Undo" }).click();
      await expect(
        off.getByRole("option", { name: /Echo Engines/ }),
      ).toBeVisible();
      await on.getByRole("option", { name: /Delta Doors/ }).dblclick();
      await expect(bar).toContainText("1 switched off");
      await bar.getByRole("button", { name: "Throw away changes" }).click();
      await expect(bar).toContainText("No changes waiting");
      await audit(page);
    });

    test("a row says what its own files warn of, as the list being edited stands", async ({
      page,
    }) => {
      await open(page, {
        mod_list_mods: {
          result: {
            ...listing,
            mods: listing.mods.map((m) =>
              m.key === "alpha" ? { ...m, load_after: ["charlie"] } : m,
            ),
          },
        },
      });
      await page
        .getByRole("button", { name: "Edit the list", exact: true })
        .click();
      const on = page.getByRole("listbox", {
        name: "Mods switched on, in load order",
      });
      await expect(
        on.getByRole("option", { name: /Alpha Tools/ }),
      ).toContainText("should load after Charlie Crops, which is below it");
      await on.getByRole("option", { name: /Alpha Tools/ }).click();
      await page.keyboard.press("Alt+End");
      await expect(
        on.getByRole("option", { name: /Alpha Tools/ }),
      ).not.toContainText("should load after");
      await audit(page);
    });

    test("the sort shows each move and whose rule, and writes only on Use this order", async ({
      page,
    }) => {
      await open(page);
      await page.getByRole("button", { name: "Sort", exact: true }).click();
      await page.getByRole("button", { name: "Sort: fewest moves" }).click();
      await expect(page.getByText("1 mod of 5 moves.")).toBeVisible();
      await expect(
        page.getByText(
          "Alpha Tools loads after Delta Doors (Alpha Tools: its own files)",
        ),
      ).toBeVisible();
      await expect(
        page.getByText("Echo Engines loads at the bottom"),
      ).toBeVisible();
      await expect(
        page.getByText("Bravo Beds loads after Alpha Tools"),
      ).toBeVisible();
      await shot(page, `${name}-sort`);
      await audit(page);
      expect((await asked(page, "mod_list_sort")).map((a) => a.apply)).toEqual([
        false,
      ]);
      await page.getByRole("button", { name: "Use this order" }).click();
      await expect
        .poll(async () =>
          (await asked(page, "mod_list_sort")).map((a) => a.apply),
        )
        .toEqual([false, true]);
    });

    test("a full re-sort lists the rule moves and folds those only a group or the names place", async ({
      page,
    }) => {
      await open(page, { mod_list_sort: fullSorted });
      await page.getByRole("button", { name: "Sort", exact: true }).click();
      await page.getByRole("button", { name: "Full re-sort" }).click();
      await expect(
        page.getByRole("heading", { name: "Moved because a rule asks (1)" }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Bravo Beds loads after Delta Doors (Bravo Beds: its own files)",
        ),
      ).toBeVisible();
      const grouped = page.getByText(/^1 more moved into its group/);
      const ordered = page.getByText(
        "1 more moved only because others moved around it",
      );
      await expect(grouped).toBeVisible();
      await expect(ordered).toBeVisible();
      await expect(page.getByText("3 → 2")).toBeHidden();
      await grouped.click();
      await ordered.click();
      await expect(page.getByText("3 → 2")).toBeVisible();
      await expect(page.getByText("2 → 4")).toBeVisible();
      await shot(page, `${name}-sort-full`);
      await audit(page);
    });

    test("a full re-sort with no rule move says nothing is gained, and gives each group move its reason", async ({
      page,
    }) => {
      const cosmetic = structuredClone(fullSorted);
      cosmetic.result.data.moves = cosmetic.result.data.moves.filter(
        (move) => move.kind !== "rule",
      );
      await open(page, { mod_list_sort: cosmetic });
      await page.getByRole("button", { name: "Sort", exact: true }).click();
      await page.getByRole("button", { name: "Full re-sort" }).click();
      await expect(
        page.getByText(/^No rule needs any of these moves/),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /Moved because a rule asks/ }),
      ).toHaveCount(0);
      await page.getByText(/^1 more moved into its group/).click();
      await expect(
        page.getByText("Alpha Tools: it is a framework or loads at the top."),
      ).toBeVisible();
      // Nothing to gain: Not now comes first, and the order is used only "anyway".
      const anyway = page.getByRole("button", {
        name: "Use this order anyway",
      });
      await expect(anyway).toBeVisible();
      await expect(
        anyway.locator("xpath=..").getByRole("button").first(),
      ).toHaveText("Not now");
      await audit(page);
    });

    test("a rule of your own is made by finding the mods by name", async ({
      page,
    }) => {
      await open(page);
      await page.getByRole("button", { name: "Sort", exact: true }).click();
      await page
        .getByLabel("Make a rule for which mod? Type part of a name.")
        .fill("bravo");
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Before a mod" }).click();
      await page
        .getByLabel("Bravo Beds loads before which mod? Type part of a name.")
        .fill("charl");
      await page
        .getByRole("button", { name: "Keep: Bravo Beds before Charlie Crops" })
        .click();
      await expect
        .poll(() => asked(page, "mod_list_add_rule"))
        .toEqual([
          {
            command: "mod_list_add_rule",
            game: "first",
            id: "bravo",
            kind: "before",
            other: "charlie",
          },
        ]);
    });

    test("a save's list is compared first, names what is missing, and loads only on Use this list", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", { name: "Saved lists", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "From your saves (1)" }),
      ).toBeVisible();
      await page
        .getByRole("listitem")
        .filter({ hasText: "Colony" })
        .getByRole("button", { name: "Compare" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Loading Colony" }),
      ).toBeVisible();
      await expect(page.getByText("1 not on this PC")).toBeVisible();
      await shot(page, `${name}-saved`);
      await audit(page);
      await page.getByRole("button", { name: "Find on the Workshop" }).click();
      await expect
        .poll(() => asked(page, "mod_list_find_on_workshop"))
        .toEqual([
          {
            command: "mod_list_find_on_workshop",
            game: "first",
            name: "Smart Medicine",
          },
        ]);
      await page.getByRole("button", { name: "Use this list" }).click();
      await expect
        .poll(async () =>
          (await asked(page, "mod_list_compare")).map((a) => [
            a.source,
            a.reference,
            a.apply,
          ]),
        )
        .toEqual([
          ["save", "Colony.rws", false],
          ["save", "Colony.rws", true],
        ]);
    });

    test("the list is kept by the name typed", async ({ page }) => {
      await open(page);
      await page
        .getByRole("button", { name: "Saved lists", exact: true })
        .click();
      await page.getByLabel("Name", { exact: true }).fill("Before the war");
      await page.keyboard.press("Enter");
      await expect
        .poll(() => asked(page, "mod_list_save"))
        .toEqual([
          {
            command: "mod_list_save",
            game: "first",
            list: "active",
            name: "Before the war",
            replace: false,
          },
        ]);
    });

    test("unsubscribing asks first, says the files go, then switches off and unsubscribes", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", { name: "Edit the list", exact: true })
        .click();
      await page.getByRole("option", { name: /Alpha Tools/ }).click();
      await page.getByRole("button", { name: "Unsubscribe…" }).first().click();
      await expect(
        page.getByText(
          /Unsubscribe from Alpha Tools\? It is switched off first/,
        ),
      ).toBeVisible();
      await shot(page, `${name}-unsubscribe`);
      await audit(page);
      expect(await asked(page, "mod_list_unsubscribe")).toEqual([]);
      await page.getByRole("button", { name: "Yes, unsubscribe" }).click();
      await expect
        .poll(() => asked(page, "mod_list_unsubscribe"))
        .toEqual([
          {
            command: "mod_list_unsubscribe",
            game: "first",
            list: "active",
            numbers: ["1000000097"],
          },
        ]);
    });

    test("a pasted Workshop link subscribes, waits for the download, then the mod is chosen to switch on", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", { name: "Edit the list", exact: true })
        .click();
      await page.getByText("Add a mod from the Workshop").click();
      await page
        .getByLabel("Subscribe by Workshop link or number")
        .fill(
          "https://steamcommunity.com/sharedfiles/filedetails/?id=3820401180",
        );
      await page
        .getByRole("button", { name: "Subscribe", exact: true })
        .click();
      await expect
        .poll(() => asked(page, "mod_list_subscribe"))
        .toEqual([
          {
            command: "mod_list_subscribe",
            game: "first",
            numbers: ["3820401180"],
            wait: true,
          },
        ]);
      await expect(
        page.getByText("Echo Engines is on this PC now, chosen on the left"),
      ).toBeVisible();
      await shot(page, `${name}-subscribed`);
      await page.getByRole("button", { name: "Switch on →" }).click();
      await page.keyboard.press("Control+s");
      await expect
        .poll(() => asked(page, "mod_list_write"))
        .toEqual([
          {
            command: "mod_list_write",
            game: "first",
            list: "active",
            ids: [...ON, "echo"],
            was: ON,
          },
        ]);
    });
    test("shows the picture of the mod in focus (0.53.0)", async ({ page }) => {
      await open(page);
      await page
        .getByRole("button", { name: "Edit the list", exact: true })
        .click();
      const panel = page.getByRole("region", {
        name: "The mod in focus",
        exact: true,
      });
      await expect(panel).toContainText("Choose a mod in either list");
      await page.getByRole("option", { name: /Delta Doors/ }).click();
      await expect(
        panel.getByRole("img", { name: "Delta Doors's own picture" }),
      ).toBeVisible();
      await page.getByRole("option", { name: /Alpha Tools/ }).click();
      await expect(panel).toContainText("This mod has no picture of its own.");
      await audit(page);
    });

    test("What players say reads a Workshop mod's page into a dialog, and a local mod has none (0.107.0)", async ({
      page,
    }) => {
      await open(page, {
        players_say: {
          result: {
            available: true,
            ok: true,
            refusal: null,
            report: {
              format: 1,
              title: "Workshop research",
              lines: ["Steam: 1 items' details fetched now."],
              blocks: [],
              sections: [
                {
                  heading: "The uploader's latest replies",
                  level: 2,
                  blocks: [{ type: "text", text: "Fixed in the update." }],
                },
              ],
            },
            data: {},
          },
        },
      });
      await page
        .getByRole("button", { name: "Edit the list", exact: true })
        .click();
      const panel = page.getByRole("region", {
        name: "The mod in focus",
        exact: true,
      });
      await page.getByRole("option", { name: /Delta Doors/ }).click();
      await expect(
        panel.getByRole("button", { name: "What players say" }),
      ).toHaveCount(0);
      await page.getByRole("option", { name: /Alpha Tools/ }).click();
      await panel.getByRole("button", { name: "What players say" }).click();
      const dialog = page.getByRole("dialog", {
        name: "What players say about Alpha Tools",
      });
      await expect(dialog).toContainText("The uploader's latest replies");
      await audit(page);
      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(dialog).toHaveCount(0);
    });

    test("What players say about the game itself reads its Steam reviews into a dialog (0.111.0)", async ({
      page,
    }) => {
      await open(page, {
        game_reviews: {
          result: {
            available: true,
            ok: true,
            refusal: null,
            report: {
              format: 1,
              title: "What players say about First Sample",
              lines: [
                "All time: 97% of 1,000 reviews recommend it.",
                "The last 30 days: 98% of 50 recommend it.",
              ],
              blocks: [],
              sections: [
                {
                  heading: "The newest that do not recommend it",
                  level: 2,
                  blocks: [{ type: "text", text: "Too many hours lost." }],
                },
              ],
            },
            data: {},
          },
        },
      });
      await page
        .getByRole("button", { name: "Edit the list", exact: true })
        .click();
      const panel = page.getByRole("region", {
        name: "The mod in focus",
        exact: true,
      });
      await page.getByRole("option", { name: /Core The game/ }).click();
      await panel.getByRole("button", { name: "What players say" }).click();
      const dialog = page.getByRole("dialog", {
        name: "What players say about Core",
      });
      await expect(dialog).toContainText("In Steam's reviews");
      await expect(dialog).toContainText("All time: 97% of 1,000");
      expect(await asked(page, "game_reviews")).toEqual([
        expect.objectContaining({ game: "first", name: "Core" }),
      ]);
      await audit(page);
      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(dialog).toHaveCount(0);
    });

    test("the community lists say whose copy is read and how old, fetch on a press, and RimSort's rules come over (0.112.0)", async ({
      page,
    }) => {
      await open(page);
      await page.getByRole("button", { name: "Sort", exact: true }).click();
      const lists = page.getByRole("region", { name: "Community lists" });
      await expect(lists).toContainText("RimSort's copy");
      await expect(lists).toContainText("older than 7 days");
      await audit(page);
      await lists.getByRole("button", { name: "Fetch them now" }).click();
      await expect(lists.getByRole("status")).toContainText("Fetched");
      const fetches = (await asked(page, "mod_list_databases")) as unknown as {
        fetch: boolean;
        stale: boolean;
      }[];
      // Once by itself when the page opened (only the stale), once on the press (all of them).
      expect(fetches.filter((f) => f.fetch && f.stale)).toHaveLength(1);
      expect(fetches.filter((f) => f.fetch && !f.stale)).toHaveLength(1);
      await page.getByRole("button", { name: "Bring them over" }).click();
      await expect(
        page.getByText("Brought over 1 of your rules"),
      ).toBeVisible();
      expect(await asked(page, "mod_list_import_rules")).toHaveLength(1);
    });

    test("new errors after a change are named, with Undo asked first and a way to a list that ran clean", async ({
      page,
    }) => {
      await open(page);
      await expect(
        page.getByRole("heading", {
          name: "Your next game after your change showed 1 new error",
        }),
      ).toBeVisible();
      await expect(page.getByText(/IAmMother\.Compat\.VNPE/)).toBeVisible();
      await shot(page, `${name}-since`);
      await audit(page);
      await page
        .getByRole("button", { name: "Undo the last change" })
        .first()
        .click();
      expect(await asked(page, "mod_list_undo")).toEqual([]);
      await page.getByRole("button", { name: "Yes, put it back" }).click();
      await expect
        .poll(async () => (await asked(page, "mod_list_undo")).length)
        .toBe(1);
    });

    test("a continued version can be subscribed to from What's wrong", async ({
      page,
    }) => {
      await open(page);
      await expect(
        page.getByText(/has a continued version for 1\.7/),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Subscribe", exact: true })
        .click();
      await expect
        .poll(async () =>
          (await asked(page, "mod_list_subscribe")).map((a) => a.numbers),
        )
        .toEqual([["2000000002"]]);
    });

    test("the last list that ran clean is marked and loaded after a look", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", { name: "Saved lists", exact: true })
        .click();
      await expect(page.getByText("Ran clean", { exact: true })).toBeVisible();
      await page
        .getByRole("button", {
          name: "Go back to the last list that ran clean",
        })
        .click();
      await expect
        .poll(async () =>
          (await asked(page, "mod_list_compare")).map((a) => [
            a.source,
            a.reference,
            a.apply,
          ]),
        )
        .toEqual([["kept", "20261121T220105Z", false]]);
    });
  });
}
